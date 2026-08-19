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
            return { composer: null, profileLinesPass: null, renderProfileNormals: noop, setProfileLinesSize: noop, setFxaaSize: noop,
                     setDepthPrePassSize: noop, setAoSize: noop, updateAoUniforms: noop, renderDepthPrePass: noop };
        }

        // BACKWARD COMPAT | Legacy getter may return the composer directly
        if (typeof state.render === 'function' && !state.composer) {
            return { composer: state, profileLinesPass: null, renderProfileNormals: noop, setProfileLinesSize: noop, setFxaaSize: noop,
                     setDepthPrePassSize: noop, setAoSize: noop, updateAoUniforms: noop, renderDepthPrePass: noop };
        }

        const fn = (candidate) => (typeof candidate === 'function') ? candidate : noop;   // <-- Optional-key guard

        return {
            composer            : state.composer || null,
            profileLinesPass    : state.profileLinesPassRef || null, // <-- For per-tile Silly Lines wave offset (seam-free waves)
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

        // SAVED STATE | Everything mutated below is restored in finally
        // ------------------------------------------------------------
        const savedSize       = renderer.getSize(new THREE.Vector2());
        const savedPixelRatio = renderer.getPixelRatio();
        const savedAspect     = camera.aspect;

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
                camera.aspect = outW / outH;                         // <-- Full export aspect; setViewOffset handles per-tile sub-frusta
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
                    activeCamera.setViewOffset(outW, outH, x - gutter, y - gutter, fbW, fbH);
                    if (!isElevationMode) {
                        Na__VerticalCorrection__ApplyFrame();        // <-- Shear applies per-tile exactly (operates on the sub-projection)
                    }

                    // FOG SYNC | The planar fog pass reconstructs world positions from
                    // the camera projection; its uniforms are per-frame synced by the
                    // live loop but MUST be refreshed for each tile's sub-frustum or
                    // the fog planes land in a different place on every tile (banding).
                    Na__FogPlane__UpdateFogPassPerFrame(Na__FogPlaneSystem__GetFogPass(), activeCamera);

                    // SILLY LINES SYNC | Wave phase runs in full-image px space so the
                    // sine is continuous across tile boundaries.
                    if (pipeline.profileLinesPass && pipeline.profileLinesPass.material.uniforms.u_sillyPxOffset) {
                        pipeline.profileLinesPass.material.uniforms.u_sillyPxOffset.value.set(
                            x - gutter,                              // <-- Tile framebuffer left edge in full-image px
                            outH - y + gutter - fbH                  // <-- Tile framebuffer bottom edge (GL bottom-left origin)
                        );
                    }

                    // RENDER | Same per-frame sequence as the realtime loop
                    if (composer) {
                        pipeline.updateAoUniforms(activeCamera);     // <-- MaxEngine: sync SSAO camera matrices for this sub-frustum
                        pipeline.renderDepthPrePass();               // <-- MaxEngine: depth capture (no-op when profile lines share depth)
                        if (isElevationMode) {
                            elevationOverrides.renderProfileNormals(activeCamera);  // <-- 2D profile normals with ortho tile camera
                        } else {
                            pipeline.renderProfileNormals();         // <-- 3D profile normals with persp tile camera
                        }
                        composer.render();
                    } else {
                        renderer.render(scene, activeCamera);        // <-- Direct render fallback (no pipeline)
                    }

                    // CROSS SECTION OVERLAY | Caps + profile lines on this tile's
                    // sub-frustum, drawn onto the composited buffer before readback
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

            return { canvas: outCanvas, width: outW, height: outH, wasClamped: fit.wasClamped };

        } finally {
            // RESTORE | Camera, renderer, and composer back to live viewport state
            // ------------------------------------------------------------
            renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

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
