// =============================================================================
// VALEVISION3D - IMAGE EXPORT - STATIC TILED EXPORT RENDERER
// =============================================================================
//
// FILE       : Na__ImageExport__StaticExport__TiledRenderer.js
// NAMESPACE  : Na__StaticExport
// MODULE     : Static Tiled Export Renderer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Dedicated high-resolution static export path, isolated from the
//              realtime viewport engine. Renders the export image as a grid of
//              viewport-sized tiles via camera.setViewOffset so GPU framebuffer
//              memory stays flat regardless of the requested output resolution.
// CREATED    : 08-Jul-2026
//
// DESCRIPTION:
// - The old export path resized the live renderer + composer to the FULL export
//   resolution. At 4K (30MP) with the PureEngine 4x-MSAA HalfFloat ping-pong
//   buffers this demanded 3GB+ of GPU framebuffer memory, losing the WebGL
//   context and silently delivering a blank PNG. iPads died even earlier.
// - This module never allocates a WebGL framebuffer larger than roughly one
//   viewport. Each tile renders through the SAME live composer (identical
//   image quality, zero changes to the realtime engine) using an exact
//   sub-frustum, then is copied into one large 2D output canvas.
// - Tiles are rendered with a gutter (overscan) that is cropped on composite,
//   so screen-space effects (FXAA, profile lines, SSAO) cannot produce seams.
// - Vertical perspective correction is re-applied per tile; the shear maths
//   (proj[9] += tan(pitch) * proj[5]) operates on the tile's own sub-projection
//   and therefore produces the exact crop of the corrected full frame.
// - An optional view window (1.4.0) draws part of the camera's frame - or more
//   than all of it - as the output: the full frame is sized so the window is
//   exactly the output, and each tile's sub-frustum is offset into it.
// - Composer pixel ratio is explicitly forced to 1 for the export and restored
//   after. (EffectComposer captures its own _pixelRatio at construction; the
//   old path only reset the renderer's ratio, silently inflating every export
//   render target by devicePixelRatio^2 - up to 2.25x extra GPU memory.)
// - Output dimensions are clamped to per-platform 2D canvas limits (iOS Safari
//   caps canvas area at ~16.7MP) and validated with a 1px paint probe so an
//   oversized canvas fails loudly instead of encoding an empty PNG.
// - WebGL context loss is detected between tiles and surfaces as a thrown
//   error instead of a blank download.
// - All mutated renderer / composer / camera state is restored in finally.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 08-Jul-2026 - Version 1.0.0
// - Initial release. Replaces full-resolution renderer resize for custom exports.
//
// 09-Jul-2026 - Version 1.1.0
// - WYSIWYG line width compensation: pixel-based line widths (profile lines,
//   fat linework, silly waves) are scaled to the export resolution so exported
//   line weights match the live viewport exactly at 1.00x slider settings.
//   Profile scale = outputH / physical viewport height; linework scale =
//   outputH / tile framebuffer height (LineMaterial resolves widths against
//   its load-time resolution uniform, which cancels between live and tile
//   renders). Elevation-mode u_edgeWidth and silly wave px are snapshot-scaled
//   directly (nothing recomputes them during ortho exports) and restored.
//
// 19-Aug-2026 - Version 1.2.0
// - Tile-layout mathematics extracted verbatim into the shared tile planner
//   Na__ImageExport__StaticExport__TilePlan__.js. Behaviour and public exports
//   are unchanged; the Export Render Layers system consumes the same planner so
//   Beauty and every structural pass share one sub-frustum, gutter and pixel
//   registration.
//
// 12-Sep-2026 - Version 1.3.0
// - SUPERSAMPLED ANTI-ALIASING, per tile. `antiAliasSamples` renders each tile
//   2, 4, 8 or 16 times with sub-pixel projection jitter and averages the
//   results, so a near-horizontal eaves or a sub-pixel glazing bar records how
//   much of each pixel it really covers instead of winning or losing the pixel
//   outright. Same module the video studio uses, now shared.
// - Resolution was never going to fix this and FXAA could not reach it: a
//   bigger export gets SMALLER steps, not fewer, and a step on a two-degree
//   line is longer than FXAA can search along. Whitecard is the worst case,
//   because aliasing severity scales with the contrast across the edge.
// - The accumulation buffer is one TILE, so an 8000 px export gains a few tens
//   of megabytes whatever its size - the technique costs essentially nothing
//   against the memory ceiling this exporter was built around. It costs time
//   instead, linearly, which for a single still is seconds.
// - Ported back from TrueVision3D, which took the video studio's supersampler
//   and generalised it for the still exporter.
//
// 14-Sep-2026 - Version 1.4.0
// - viewWindow: an optional { u0, v0, u1, v1 } that renders a window of the
//   camera's frame instead of all of it - cropped into it, or reaching past it.
//   The aspect is the full frame's, every tile's sub-frustum and its Silly
//   Lines phase are offset into the window, and the vertical correction shear
//   still applies per tile. A Layout Editor 3D viewport draws what its frame
//   shows of a zoomed or slid picture at the frame's own resolution. 3D only;
//   without the option every call renders exactly as before.
// - Ported from TrueVision3D 2.1.0 (v2.50.0).
//
// =============================================================================


    // MODULE IMPORTS | Three.js Utilities
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Vertical Perspective Correction
    // ------------------------------------------------------------
    import { Na__VerticalCorrection__ApplyFrame } from '../11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Hidden-Tab-Safe Async Yield
    // ------------------------------------------------------------
    import { Na__ExportYield__NextPaint } from './Na__ImageExport__AsyncYield__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fog Plane System (Per-Tile Camera Uniform Refresh)
    // ------------------------------------------------------------
    import { Na__FogPlaneSystem__GetFogPass } from '../29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js';
    import { Na__FogPlane__UpdateFogPassPerFrame } from '../29__System__FogPlaneSystem/Na__FogPlaneSystem__FogShaderEffect.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Linework Settings (Export Line Width Compensation)
    // ------------------------------------------------------------
    import { Na__LineworkSettings__SetExportScales } from '../05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Cross Section Overlay (Per-Tile After-Composer Pass)
    // ------------------------------------------------------------
    import {
        Na__SectionClipping__GetOverlayRenderer,
        Na__SectionClipping__GetExportModeHandler
    } from '../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Shared Tile Plan (Beauty and Render Layers Agree Pixel-For-Pixel)
    // @delegate: ./Na__ImageExport__StaticExport__TilePlan__.js
    // ------------------------------------------------------------
    import {
        Na__TilePlan__Build,
        Na__TilePlan__ClampToDeviceLimits,
        Na__TilePlan__ProbeCanvas,
        Na__TilePlan__IsIosDevice
    } from './Na__ImageExport__StaticExport__TilePlan__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Supersampled Anti-Aliasing (Shared With the Video Studio)
    // @delegate: ../05__RenderPipeline/Na__RenderEffect__Supersampler__.js
    // ------------------------------------------------------------
    import {
        Na__Supersampler__Create,
        Na__Supersampler__ResolveSampleCount
    } from '../05__RenderPipeline/Na__RenderEffect__Supersampler__.js';
    // ------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Device Capability Detection and Limits
// -----------------------------------------------------------------------------

    // NOTE | Tile geometry, platform canvas limits, dimension clamping and the
    // canvas paint probe now live in the shared tile planner so this beauty
    // renderer and the Export Render Layers structural renderer produce
    // identical sub-frustums, gutters and pixel registration.
    // @delegate: ./Na__ImageExport__StaticExport__TilePlan__.js
    // ------------------------------------------------------------


    // FUNCTION | Clamp Requested Export Dimensions to Device Limits
    // ------------------------------------------------------------
    // Preserved as a public export for existing consumers; the maths
    // itself lives in the shared tile planner.
    // ------------------------------------------------------------
    function Na__StaticExport__ClampToDeviceLimits(targetWidth, targetHeight) {
        return Na__TilePlan__ClampToDeviceLimits(targetWidth, targetHeight);
    }
    // ------------------------------------------------------------


    // FUNCTION | Detect iOS / iPadOS Devices
    // ------------------------------------------------------------
    // Preserved as a public export for existing consumers; the detection
    // itself lives in the shared tile planner.
    // ------------------------------------------------------------
    function Na__StaticExport__IsIosDevice() {
        return Na__TilePlan__IsIosDevice();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Static Tiled Export Renderer - Core
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Render Pipeline State Surface
    // ------------------------------------------------------------
    // Mirrors the resolver used by the export controls, but also surfaces
    // the MaxEngine extras (depth pre-pass, SSAO) so tiles render through
    // the exact same per-frame sequence as the realtime loop.
    // ------------------------------------------------------------
    function Na__StaticExport__ResolvePipeline(getRenderPipelineState) {
        const noop  = () => {};
        const state = (typeof getRenderPipelineState === 'function') ? getRenderPipelineState() : null;

        if (!state) {
            return { composer: null, profileLinesPass: null, fxaaPass: null, renderProfileNormals: noop, setProfileLinesSize: noop, setFxaaSize: noop,
                     setDepthPrePassSize: noop, setAoSize: noop, updateAoUniforms: noop, renderDepthPrePass: noop };
        }

        // BACKWARD COMPAT | Legacy getter may return the composer directly
        if (typeof state.render === 'function' && !state.composer) {
            return { composer: state, profileLinesPass: null, fxaaPass: null, renderProfileNormals: noop, setProfileLinesSize: noop, setFxaaSize: noop,
                     setDepthPrePassSize: noop, setAoSize: noop, updateAoUniforms: noop, renderDepthPrePass: noop };
        }

        const fn = (candidate) => (typeof candidate === 'function') ? candidate : noop;   // <-- Optional-key guard

        return {
            composer            : state.composer || null,
            profileLinesPass    : state.profileLinesPassRef || null, // <-- For per-tile Silly Lines wave offset (seam-free waves)
            fxaaPass            : state.fxaaPassRef || null,         // <-- Stood aside while supersampling; see the tile loop
            renderProfileNormals: fn(state.renderProfileNormals),
            setProfileLinesSize : fn(state.setProfileLinesSize),
            setFxaaSize         : fn(state.setFxaaSize),
            setDepthPrePassSize : fn(state.setDepthPrePassSize),     // <-- MaxEngine extra (no-op under PureEngine)
            setAoSize           : fn(state.setAoSize),               // <-- MaxEngine extra (no-op under PureEngine)
            updateAoUniforms    : fn(state.updateAoUniforms),        // <-- MaxEngine extra (no-op under PureEngine)
            renderDepthPrePass  : fn(state.renderDepthPrePass)       // <-- MaxEngine extra (no-op under PureEngine)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Usable View Window, or Null for the Whole Frame
    // ------------------------------------------------------------
    // { u0, v0, u1, v1 }: the part of the camera's frame the output shows, as
    // fractions of that frame - left, top, right, bottom. Any of them may run
    // past 0..1, so a window can reach beyond the camera's own frame as well as
    // crop into it. Anything malformed, and the whole frame itself, is null:
    // the ordinary path, exactly as before the option existed.
    // ------------------------------------------------------------
    function Na__StaticExport__ResolveViewWindow(viewWindow) {
        if (!viewWindow || typeof viewWindow !== 'object') return null;
        const { u0, v0, u1, v1 } = viewWindow;
        if (![ u0, v0, u1, v1 ].every((value) => typeof value === 'number' && Number.isFinite(value))) return null;
        if (!(u1 > u0) || !(v1 > v0)) return null;
        if (u0 === 0 && v0 === 0 && u1 === 1 && v1 === 1) return null;
        return { u0 : u0, v0 : v0, u1 : u1, v1 : v1 };
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Scene to a Large 2D Canvas via Tiled Rendering
    // ------------------------------------------------------------
    // options:
    //   renderer               {THREE.WebGLRenderer}  Live renderer (borrowed, fully restored after)
    //   scene                  {THREE.Scene}
    //   camera                 {THREE.PerspectiveCamera}  Main 3D camera
    //   getRenderPipelineState {Function}  Pipeline state getter (composer + resize/pre-pass helpers)
    //   elevationOverrides     {object|null}  2D ortho export overrides, or null for 3D mode
    //   targetWidth            {number}  Requested output width in pixels
    //   targetHeight           {number}  Requested output height in pixels
    //   antiAliasSamples       {number}  1 (off), 2, 4, 8 or 16 - see the tile loop
    //   viewWindow             {object|null}  { u0, v0, u1, v1 } - the part of the camera's frame to draw,
    //                          as fractions that may run past 0..1; the target size is the window's (3D only)
    //   onProgress             {Function|null}  Receives human-readable status strings
    //
    // Returns: Promise<{ canvas, width, height, wasClamped }>
    // Throws : Error with a user-presentable message on context loss or
    //          canvas allocation failure. All live-engine state is restored
    //          even on failure.
    // ------------------------------------------------------------
    async function Na__StaticExport__RenderToCanvas(options) {
        const {
            renderer, scene, camera, getRenderPipelineState,
            elevationOverrides = null,
            targetWidth, targetHeight,
            antiAliasSamples = 1,
            viewWindow = null,
            onProgress = null
        } = options;

        const progress = (typeof onProgress === 'function') ? onProgress : () => {};

        // CLAMP | Fit requested dimensions to platform canvas limits
        // ------------------------------------------------------------
        const fit  = Na__TilePlan__ClampToDeviceLimits(targetWidth, targetHeight);
        const outW = fit.width;
        const outH = fit.height;

        // OUTPUT CANVAS | Allocate and probe the large 2D composite canvas
        // ------------------------------------------------------------
        const outCanvas  = document.createElement('canvas');
        outCanvas.width  = outW;
        outCanvas.height = outH;
        const outCtx     = outCanvas.getContext('2d');

        if (!outCtx || !Na__TilePlan__ProbeCanvas(outCanvas, outCtx)) {
            throw new Error(`This device cannot create a ${outW}x${outH} image canvas. Try a lower export resolution.`);
        }

        // TILE GRID | Derive the shared tile plan (identical for every export path)
        // @delegate: ./Na__ImageExport__StaticExport__TilePlan__.js
        // ------------------------------------------------------------
        const tilePlan = Na__TilePlan__Build({ outWidth: outW, outHeight: outH });
        const gutter   = tilePlan.gutter;
        const fbW      = tilePlan.fbW;                               // <-- WebGL framebuffer width (tile + overscan)
        const fbH      = tilePlan.fbH;                               // <-- WebGL framebuffer height (tile + overscan)

        // PIPELINE + MODE | Resolve composer surface and active camera
        // ------------------------------------------------------------
        const pipeline        = Na__StaticExport__ResolvePipeline(getRenderPipelineState);
        const composer        = pipeline.composer;
        const isElevationMode = elevationOverrides !== null;
        const activeCamera    = isElevationMode ? elevationOverrides.camera : camera;

        // VIEW WINDOW | The output is this part of the camera's full frame (3D
        // only; a 2D ortho export frames its own window). The full frame is sized
        // so the window's share of it is exactly the output, and every tile below
        // is offset into the window. With no window the full frame IS the output
        // and nothing moves.
        // ------------------------------------------------------------
        const view     = isElevationMode ? null : Na__StaticExport__ResolveViewWindow(viewWindow);
        const fullW    = view ? outW / (view.u1 - view.u0) : outW;
        const fullH    = view ? outH / (view.v1 - view.v0) : outH;
        const viewLeft = view ? view.u0 * fullW : 0;
        const viewTop  = view ? view.v0 * fullH : 0;

        // SUPERSAMPLING | Null at one sample, which every branch below treats as
        // "render the tile once, the way it always was".
        // @delegate: ../05__RenderPipeline/Na__RenderEffect__Supersampler__.js
        // ------------------------------------------------------------
        // THE MEMORY PICTURE IS WHY THIS BELONGS IN THE TILED RENDERER rather
        // than anywhere else: the accumulation buffer is ONE TILE, not one
        // image. An 8000 px export gains about one 2112 px square half-float
        // buffer - a few tens of megabytes - whatever the output size. The
        // technique adds essentially nothing to the peak framebuffer memory,
        // which is the exact constraint that shaped this exporter.
        // ------------------------------------------------------------
        const supersampler = composer
            ? Na__Supersampler__Create({
                renderer,
                width   : fbW,                                       // <-- One tile's framebuffer, not the output image
                height  : fbH,
                samples : Na__Supersampler__ResolveSampleCount(antiAliasSamples)
            })
            : null;

        // SAVED STATE | Everything mutated below is restored in finally
        // ------------------------------------------------------------
        const savedSize       = renderer.getSize(new THREE.Vector2());
        const savedPixelRatio = renderer.getPixelRatio();
        const savedAspect     = camera.aspect;
        const shadowMap       = renderer.shadowMap;
        const savedShadowAuto = shadowMap.autoUpdate;

        // SUPERSAMPLING STATE | Restored in finally alongside everything else
        // ------------------------------------------------------------
        const fxaaPass            = pipeline.fxaaPass;
        const savedFxaaEnabled    = fxaaPass ? fxaaPass.enabled : null;
        const savedRenderToScreen = composer ? composer.renderToScreen : null;

        // LINE WIDTH COMPENSATION | Pixel-based line widths at export resolution
        // ------------------------------------------------------------
        // WYSIWYG scaling so exported line weights match what the viewport
        // shows (the distance-based dynamic width still applies on top).
        // Two scales because the systems resolve pixels differently:
        // - Profile lines: viewport widths are physical-viewport px, tiles map
        //   1:1 to output px  ->  scale = outputH / physical viewport height.
        // - Fat linework: LineMaterial widths resolve against each material's
        //   load-time resolution uniform (identical live and in-tile, so it
        //   cancels)  ->  scale = outputH / tile framebuffer height.
        // ------------------------------------------------------------
        const savedPhysicalHeight = savedSize.y * savedPixelRatio;                                    // <-- Viewport drawing buffer height
        const profileExportScale  = (savedPhysicalHeight > 0) ? (outH / savedPhysicalHeight) : 1.0;   // <-- Profile line px compensation
        const lineworkExportScale = outH / fbH;                                                        // <-- Fat linework px compensation

        // PROFILE PASS UNIFORM SNAPSHOTS | Values nothing recomputes during export
        // ------------------------------------------------------------
        const profileUniforms = (pipeline.profileLinesPass && pipeline.profileLinesPass.material)
            ? pipeline.profileLinesPass.material.uniforms
            : null;
        let savedElevEdgeWidth   = null;   // <-- 2D elevation exports: u_edgeWidth is never recomputed by the 2D renderer
        let savedSillyAmplitude  = null;   // <-- Silly Lines amplitude px (scaled so waves keep their relative size)
        let savedSillyWavelength = null;   // <-- Silly Lines wavelength px (scaled with amplitude)

        // CONTEXT LOSS GUARD | Surface GPU death as a real error
        // ------------------------------------------------------------
        let contextLost = false;
        const onContextLost = () => { contextLost = true; };
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);
        const gl = renderer.getContext();

        // CROSS SECTION OVERLAY | Section caps + profile lines render into
        // every tile after the composer (fog/SSAO/Sobel never touch them);
        // the plane gizmo widgets are always hidden in exports.
        // ------------------------------------------------------------
        const sectionOverlayRenderer  = Na__SectionClipping__GetOverlayRenderer();       // <-- Null until a section exists
        const sectionExportModeHandler = Na__SectionClipping__GetExportModeHandler();    // <-- Null until the system initializes

        try {
            // EXPORT SETUP | Renderer, composer, and camera to tile dimensions
            // ------------------------------------------------------------
            renderer.setPixelRatio(1);                               // <-- Exact 1:1 pixel mapping for tiles
            renderer.setSize(fbW, fbH, false);                       // <-- Resize drawing buffer only; leave canvas CSS untouched

            if (composer) {
                if (typeof composer.setPixelRatio === 'function') {
                    composer.setPixelRatio(1);                       // <-- CRITICAL FIX: composer holds its own ratio captured at construction
                }
                composer.setSize(fbW, fbH);                          // <-- Ping-pong buffers at tile size (was full export size x dpr^2)
                pipeline.setProfileLinesSize(fbW, fbH);              // <-- Profile line targets at tile size
                pipeline.setFxaaSize(fbW, fbH);                      // <-- FXAA resolution uniform at tile size
                pipeline.setDepthPrePassSize(fbW, fbH);              // <-- MaxEngine: depth pre-pass RT at tile size
                pipeline.setAoSize(fbW, fbH);                        // <-- MaxEngine: SSAO resolution uniforms at tile size
            }

            if (isElevationMode) {
                elevationOverrides.resizeFrustum(outW, outH);        // <-- Ortho frustum for the FULL export aspect (tiles sub-divide it)
            } else {
                camera.aspect = fullW / fullH;                       // <-- Full frame aspect (the export's own without a view window); setViewOffset handles per-tile sub-frusta
                camera.updateProjectionMatrix();
            }

            // LINE WIDTH COMPENSATION | Apply export scales (reset in finally)
            // ------------------------------------------------------------
            Na__LineworkSettings__SetExportScales(profileExportScale, lineworkExportScale); // <-- Linework widths now; profile widths read per tile

            // CROSS SECTION EXPORT MODE | Hide gizmo widgets + scale outline widths
            if (sectionExportModeHandler) {
                sectionExportModeHandler(true, lineworkExportScale);         // <-- Same fat-line compensation as model linework
            }

            if (profileUniforms) {
                if (isElevationMode && profileUniforms.u_edgeWidth) {
                    savedElevEdgeWidth = profileUniforms.u_edgeWidth.value;                 // <-- 2D renderer never recomputes this uniform
                    profileUniforms.u_edgeWidth.value = savedElevEdgeWidth * profileExportScale;
                }
                if (profileUniforms.u_sillyAmplitudePx && profileUniforms.u_sillyAmplitudePx.value > 0) {
                    savedSillyAmplitude  = profileUniforms.u_sillyAmplitudePx.value;        // <-- Scale wave px so silly lines keep their relative size
                    savedSillyWavelength = profileUniforms.u_sillyWavelengthPx.value;
                    profileUniforms.u_sillyAmplitudePx.value  = savedSillyAmplitude  * profileExportScale;
                    profileUniforms.u_sillyWavelengthPx.value = savedSillyWavelength * profileExportScale;
                }
            }

            // SUPERSAMPLING SETUP | The composer stops drawing to the canvas so
            // each sample lands in its read buffer, and FXAA stands aside.
            // ------------------------------------------------------------
            // FXAA WOULD SOFTEN EVERY SAMPLE BEFORE THE AVERAGE, so the result
            // would be sixteen slightly blurred pictures averaged into one
            // blurred picture - all of the cost and none of the sharpness.
            // Taking it out is why a supersampled tile comes back sharper AND
            // smoother at once; those only feel like opposites when blur is the
            // only tool on offer.
            // ------------------------------------------------------------
            if (supersampler) {
                composer.renderToScreen = false;
                if (fxaaPass) fxaaPass.enabled = false;
            }

            // HELPER FUNCTION | Run the Effect Chain Once Through the Projection
            // ------------------------------------------------------------
            // Every line here reads the camera projection, so all of it repeats
            // for every supersample: the planar fog pass and SSAO rebuild world
            // positions from the inverse projection, and each pre-pass renders
            // through it. Syncing them once per tile and jittering underneath
            // would land the fog in sixteen different places and average them.
            // ------------------------------------------------------------
            function renderEffectChain() {
                Na__FogPlane__UpdateFogPassPerFrame(Na__FogPlaneSystem__GetFogPass(), activeCamera);
                pipeline.updateAoUniforms(activeCamera);             // <-- MaxEngine: sync SSAO camera matrices for this sub-frustum
                pipeline.renderDepthPrePass();                       // <-- MaxEngine: depth capture (no-op when profile lines share depth)
                if (isElevationMode) {
                    elevationOverrides.renderProfileNormals(activeCamera);  // <-- 2D profile normals with ortho tile camera
                } else {
                    pipeline.renderProfileNormals();                 // <-- 3D profile normals with persp tile camera
                }
                composer.render();
            }
            // ------------------------------------------------------------

            // HELPER FUNCTION | Render, Jitter and Average Every Sample of a Tile
            // ------------------------------------------------------------
            // The base projection is captured AFTER the tile's view offset and
            // the vertical correction shear have both settled, so the jitter
            // shifts the corrected sub-frustum rather than replacing it. The
            // shear is never re-applied inside the loop: it starts by rebuilding
            // the projection from the camera, which would wipe the jitter.
            //
            // Shadow maps are drawn with the first sample and reused by the
            // rest - the lights and the geometry are frozen for the tile and
            // only the view camera is nudged, so every later shadow pass would
            // redraw identical maps at full cost.
            // ------------------------------------------------------------
            function renderSupersampledTile() {
                supersampler.captureBaseProjection(activeCamera);

                try {
                    for (let i = 0; i < supersampler.sampleCount; i++) {
                        if (i === 1) shadowMap.autoUpdate = false;   // <-- Keep the maps the first sample drew

                        supersampler.applyJitter(activeCamera, i);
                        renderEffectChain();
                        supersampler.accumulate(composer.readBuffer.texture, i);
                    }
                } finally {
                    shadowMap.autoUpdate = savedShadowAuto;
                    supersampler.restoreProjection(activeCamera);    // <-- Unjittered for the section overlay and the next tile
                }

                supersampler.present();                              // <-- The averaged tile onto the canvas
            }
            // ------------------------------------------------------------

            // TILE LOOP | Render each sub-frustum and composite into output
            // ------------------------------------------------------------
            const totalTiles = tilePlan.totalTiles;

            {
                for (const tile of tilePlan.tiles) {
                    const tileIndex = tile.index + 1;
                    progress(totalTiles > 1
                        ? `Rendering Your Image... (part ${tileIndex} of ${totalTiles})`
                        : 'Rendering Your Image...');
                    await Na__ExportYield__NextPaint();              // <-- Paint overlay status + let the GPU drain (hidden-tab safe)

                    const x = tile.x;                                // <-- Tile interior origin in output pixels
                    const y = tile.y;

                    // SUB-FRUSTUM | Exact crop of the full frame incl. gutter overscan
                    activeCamera.setViewOffset(fullW, fullH, viewLeft + x - gutter, viewTop + y - gutter, fbW, fbH);
                    if (!isElevationMode) {
                        Na__VerticalCorrection__ApplyFrame();        // <-- Shear applies per-tile exactly (operates on the sub-projection)
                    }

                    // SILLY LINES SYNC | Wave phase runs in full-image px space so the
                    // sine is continuous across tile boundaries. Per TILE, not per
                    // sample: a sub-pixel jitter does not move the tile.
                    if (pipeline.profileLinesPass && pipeline.profileLinesPass.material.uniforms.u_sillyPxOffset) {
                        pipeline.profileLinesPass.material.uniforms.u_sillyPxOffset.value.set(
                            viewLeft + x - gutter,                   // <-- Tile framebuffer left edge in full-image px
                            fullH - viewTop - y + gutter - fbH       // <-- Tile framebuffer bottom edge (GL bottom-left origin)
                        );
                    }

                    // RENDER | Same per-frame sequence as the realtime loop, run once
                    // per supersample because every line of it reads the camera
                    // projection - which the jitter has just moved.
                    if (composer) {
                        if (supersampler) {
                            renderSupersampledTile();
                        } else {
                            renderEffectChain();                     // <-- One pass; FXAA draws it to the canvas
                        }
                    } else {
                        renderer.render(scene, activeCamera);        // <-- Direct render fallback (no pipeline)
                    }

                    // CROSS SECTION OVERLAY | Caps + profile lines on this tile's
                    // sub-frustum, drawn onto the composited buffer before readback.
                    // AFTER the average, never inside it: these are drawn with the
                    // canvas's own anti-aliasing, exactly as the realtime loop draws
                    // them after the composer.
                    if (sectionOverlayRenderer) {
                        sectionOverlayRenderer(activeCamera);
                    }

                    // GUARD | Abort with a real error instead of a blank PNG
                    if (contextLost || (gl && gl.isContextLost && gl.isContextLost())) {
                        throw new Error('Graphics memory was exhausted during export. Try a lower export resolution.');
                    }

                    // COMPOSITE | Crop the gutter and copy the tile interior
                    const cw = tile.copyWidth;                       // <-- Right-edge tiles may be narrower
                    const ch = tile.copyHeight;                      // <-- Bottom-edge tiles may be shorter
                    outCtx.drawImage(renderer.domElement, gutter, gutter, cw, ch, x, y, cw, ch);
                }
            }

            return {
                canvas           : outCanvas,
                width            : outW,
                height           : outH,
                wasClamped       : fit.wasClamped,
                antiAliasSamples : supersampler ? supersampler.sampleCount : 1
            };

        } finally {
            // RESTORE | Camera, renderer, and composer back to live viewport state
            // ------------------------------------------------------------
            renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

            // SUPERSAMPLING | Hand the composer and FXAA back before anything
            // else touches them, and free the tile-sized accumulation buffer
            shadowMap.autoUpdate = savedShadowAuto;
            if (supersampler) {
                if (composer && savedRenderToScreen !== null) composer.renderToScreen = savedRenderToScreen;
                if (fxaaPass && savedFxaaEnabled !== null)    fxaaPass.enabled = savedFxaaEnabled;
                supersampler.dispose();
            }

            activeCamera.clearViewOffset();                          // <-- Safe when no offset is set (three guards internally)

            // LINE WIDTH COMPENSATION | Restore live-viewport line scales
            // ------------------------------------------------------------
            Na__LineworkSettings__SetExportScales(1.0, 1.0);         // <-- Linework widths back to user factor only; profile scale back to 1

            // CROSS SECTION EXPORT MODE | Restore gizmo visibility + live outline widths
            if (sectionExportModeHandler) {
                sectionExportModeHandler(false, 1.0);
            }

            if (profileUniforms) {
                if (savedElevEdgeWidth !== null && profileUniforms.u_edgeWidth) {
                    profileUniforms.u_edgeWidth.value = savedElevEdgeWidth;                 // <-- Restore elevation edge width (3D mode self-heals per frame)
                }
                if (savedSillyAmplitude !== null) {
                    profileUniforms.u_sillyAmplitudePx.value  = savedSillyAmplitude;        // <-- Restore viewport wave amplitude
                    profileUniforms.u_sillyWavelengthPx.value = savedSillyWavelength;       // <-- Restore viewport wave wavelength
                }
                if (profileUniforms.u_sillyPxOffset) {
                    profileUniforms.u_sillyPxOffset.value.set(0, 0);                        // <-- Viewport waves use local px space
                }
            }

            if (isElevationMode) {
                elevationOverrides.restoreFrustum();                 // <-- Ortho frustum back to viewport dimensions
            } else {
                camera.aspect = savedAspect;
                camera.updateProjectionMatrix();
                Na__VerticalCorrection__ApplyFrame();                // <-- Re-apply shear so the live viewport stays corrected
            }

            renderer.setPixelRatio(savedPixelRatio);
            renderer.setSize(savedSize.x, savedSize.y);

            if (composer) {
                if (typeof composer.setPixelRatio === 'function') {
                    composer.setPixelRatio(savedPixelRatio);         // <-- Restore composer ratio in lockstep with the renderer
                }
                composer.setSize(savedSize.x, savedSize.y);
                pipeline.setProfileLinesSize(savedSize.x, savedSize.y);
                pipeline.setFxaaSize(savedSize.x, savedSize.y);
                pipeline.setDepthPrePassSize(savedSize.x, savedSize.y);
                pipeline.setAoSize(savedSize.x, savedSize.y);
                if (isElevationMode) {
                    elevationOverrides.renderProfileNormals(elevationOverrides.camera);  // <-- Refresh 2D normals for live viewport
                } else {
                    pipeline.renderProfileNormals();                 // <-- Refresh 3D normals for live viewport
                }
            }

            Na__RenderLoop__RequestRender();                         // <-- Redraw the viewport with restored state
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Static Export Renderer API
    // ------------------------------------------------------------
    export {
        Na__StaticExport__RenderToCanvas,
        Na__StaticExport__ClampToDeviceLimits,
        Na__StaticExport__IsIosDevice
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
