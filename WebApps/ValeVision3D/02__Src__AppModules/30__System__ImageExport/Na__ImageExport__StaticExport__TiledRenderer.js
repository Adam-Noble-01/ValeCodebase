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


// -----------------------------------------------------------------------------
// REGION | Device Capability Detection and Limits
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Tile Geometry
    // ------------------------------------------------------------
    const Na__StaticExport__TILE_INTERIOR_DESKTOP = 2048;   // <-- Max tile interior edge on desktop (framebuffer stays viewport-scale)
    const Na__StaticExport__TILE_INTERIOR_IOS     = 1536;   // <-- Smaller tiles on iOS to respect tighter GPU memory budgets
    const Na__StaticExport__TILE_GUTTER           = 32;     // <-- Overscan cropped on composite; hides FXAA/profile-line/SSAO seams
    // ------------------------------------------------------------


    // HELPER FUNCTION | Detect iOS / iPadOS Devices
    // ------------------------------------------------------------
    // iPadOS 13+ masquerades as MacIntel; the touch-point check catches it.
    // ------------------------------------------------------------
    function Na__StaticExport__IsIosDevice() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve 2D Canvas Limits for Current Platform
    // ------------------------------------------------------------
    // WebGL is never asked for more than one tile, so only the final 2D
    // output canvas is platform-constrained. Values follow the well-known
    // canvas-size test results per browser engine.
    // ------------------------------------------------------------
    function Na__StaticExport__GetCanvasLimits() {
        if (Na__StaticExport__IsIosDevice()) {
            return { maxSide: 8192,  maxArea: 16777216 };   // <-- iOS Safari: 16.7MP canvas area cap (4096x4096 equivalent)
        }
        if (/firefox/i.test(navigator.userAgent)) {
            return { maxSide: 16384, maxArea: 124992400 };  // <-- Firefox: ~124.9MP area cap (11180x11180 equivalent)
        }
        return { maxSide: 16384, maxArea: 268435456 };      // <-- Chrome / Edge / desktop Safari: 268MP area cap
    }
    // ------------------------------------------------------------


    // FUNCTION | Clamp Requested Export Dimensions to Device Limits
    // ------------------------------------------------------------
    // Preserves aspect ratio; scales down uniformly when the request
    // exceeds the platform's max canvas side or total pixel area.
    // Returns: { width, height, wasClamped }
    // ------------------------------------------------------------
    function Na__StaticExport__ClampToDeviceLimits(targetWidth, targetHeight) {
        const limits = Na__StaticExport__GetCanvasLimits();
        let scale = 1;

        const sideScale = limits.maxSide / Math.max(targetWidth, targetHeight);    // <-- Scale needed to fit longest edge
        if (sideScale < scale) scale = sideScale;

        const areaScale = Math.sqrt(limits.maxArea / (targetWidth * targetHeight)); // <-- Scale needed to fit pixel area
        if (areaScale < scale) scale = areaScale;

        if (scale >= 1) {
            return { width: targetWidth, height: targetHeight, wasClamped: false };
        }

        const width  = Math.max(1, Math.floor(targetWidth  * scale));
        const height = Math.max(1, Math.floor(targetHeight * scale));
        console.warn(`[StaticExport] Requested ${targetWidth}x${targetHeight} exceeds device canvas limits; clamped to ${width}x${height}.`);
        return { width, height, wasClamped: true };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Validate Output Canvas with a 1px Paint Probe
    // ------------------------------------------------------------
    // Browsers that cannot back a canvas of the requested size fail
    // SILENTLY - draws no-op and toBlob returns an empty image. A single
    // pixel write/read-back catches this up front so the export can fail
    // with a meaningful error instead of a blank PNG.
    // ------------------------------------------------------------
    function Na__StaticExport__ProbeCanvas(canvas, ctx) {
        if (canvas.width < 1 || canvas.height < 1) return false;
        try {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 0, 1, 1);                                   // <-- Write one pixel
            const probe = ctx.getImageData(0, 0, 1, 1).data;            // <-- Read it back
            ctx.clearRect(0, 0, 1, 1);                                  // <-- Leave canvas clean
            return probe[0] === 255 && probe[3] === 255;                // <-- Red + opaque means the backing store is real
        } catch (probeError) {
            return false;                                               // <-- getImageData throw means canvas is unusable
        }
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
            return { composer: null, renderProfileNormals: noop, setProfileLinesSize: noop, setFxaaSize: noop,
                     setDepthPrePassSize: noop, setAoSize: noop, updateAoUniforms: noop, renderDepthPrePass: noop };
        }

        // BACKWARD COMPAT | Legacy getter may return the composer directly
        if (typeof state.render === 'function' && !state.composer) {
            return { composer: state, renderProfileNormals: noop, setProfileLinesSize: noop, setFxaaSize: noop,
                     setDepthPrePassSize: noop, setAoSize: noop, updateAoUniforms: noop, renderDepthPrePass: noop };
        }

        const fn = (candidate) => (typeof candidate === 'function') ? candidate : noop;   // <-- Optional-key guard

        return {
            composer            : state.composer || null,
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
        const fit  = Na__StaticExport__ClampToDeviceLimits(targetWidth, targetHeight);
        const outW = fit.width;
        const outH = fit.height;

        // OUTPUT CANVAS | Allocate and probe the large 2D composite canvas
        // ------------------------------------------------------------
        const outCanvas  = document.createElement('canvas');
        outCanvas.width  = outW;
        outCanvas.height = outH;
        const outCtx     = outCanvas.getContext('2d');

        if (!outCtx || !Na__StaticExport__ProbeCanvas(outCanvas, outCtx)) {
            throw new Error(`This device cannot create a ${outW}x${outH} image canvas. Try a lower export resolution.`);
        }

        // TILE GRID | Derive tile interior size and grid dimensions
        // ------------------------------------------------------------
        const gutter   = Na__StaticExport__TILE_GUTTER;
        const interior = Na__StaticExport__IsIosDevice()
            ? Na__StaticExport__TILE_INTERIOR_IOS
            : Na__StaticExport__TILE_INTERIOR_DESKTOP;

        const cols  = Math.max(1, Math.ceil(outW / interior));
        const rows  = Math.max(1, Math.ceil(outH / interior));
        const tileW = Math.ceil(outW / cols);                        // <-- Even-ish interior split across columns
        const tileH = Math.ceil(outH / rows);                        // <-- Even-ish interior split across rows
        const fbW   = tileW + gutter * 2;                            // <-- WebGL framebuffer width (tile + overscan)
        const fbH   = tileH + gutter * 2;                            // <-- WebGL framebuffer height (tile + overscan)

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

        // CONTEXT LOSS GUARD | Surface GPU death as a real error
        // ------------------------------------------------------------
        let contextLost = false;
        const onContextLost = () => { contextLost = true; };
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);
        const gl = renderer.getContext();

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

            // TILE LOOP | Render each sub-frustum and composite into output
            // ------------------------------------------------------------
            const totalTiles = cols * rows;
            let tileIndex = 0;

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    tileIndex++;
                    progress(totalTiles > 1
                        ? `Rendering Your Image... (part ${tileIndex} of ${totalTiles})`
                        : 'Rendering Your Image...');
                    await Na__ExportYield__NextPaint();              // <-- Paint overlay status + let the GPU drain (hidden-tab safe)

                    const x = col * tileW;                           // <-- Tile interior origin in output pixels
                    const y = row * tileH;

                    // SUB-FRUSTUM | Exact crop of the full frame incl. gutter overscan
                    activeCamera.setViewOffset(outW, outH, x - gutter, y - gutter, fbW, fbH);
                    if (!isElevationMode) {
                        Na__VerticalCorrection__ApplyFrame();        // <-- Shear applies per-tile exactly (operates on the sub-projection)
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

                    // GUARD | Abort with a real error instead of a blank PNG
                    if (contextLost || (gl && gl.isContextLost && gl.isContextLost())) {
                        throw new Error('Graphics memory was exhausted during export. Try a lower export resolution.');
                    }

                    // COMPOSITE | Crop the gutter and copy the tile interior
                    const cw = Math.min(tileW, outW - x);            // <-- Right-edge tiles may be narrower
                    const ch = Math.min(tileH, outH - y);            // <-- Bottom-edge tiles may be shorter
                    outCtx.drawImage(renderer.domElement, gutter, gutter, cw, ch, x, y, cw, ch);
                }
            }

            return { canvas: outCanvas, width: outW, height: outH, wasClamped: fit.wasClamped };

        } finally {
            // RESTORE | Camera, renderer, and composer back to live viewport state
            // ------------------------------------------------------------
            renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

            activeCamera.clearViewOffset();                          // <-- Safe when no offset is set (three guards internally)

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
