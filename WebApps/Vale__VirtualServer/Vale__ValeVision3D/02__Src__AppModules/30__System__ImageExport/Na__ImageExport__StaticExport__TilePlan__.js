// =============================================================================
// VALEVISION3D - IMAGE EXPORT - SHARED TILE PLAN
// =============================================================================
//
// FILE       : Na__ImageExport__StaticExport__TilePlan__.js
// NAMESPACE  : Na__TilePlan
// MODULE     : Static Export Shared Tile Plan
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Pure tile-layout mathematics shared by every high-resolution
//              export path so all outputs land on identical sub-frustums,
//              gutters and pixel registration.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - Extracted verbatim from Na__ImageExport__StaticExport__TiledRenderer.js so
//   the beauty exporter and the Export Render Layers structural exporter can
//   never drift apart. Beauty and Depth must agree to the pixel; the only way
//   to guarantee that is one planner.
// - This module is intentionally pure: no Three.js, no DOM rendering, no
//   renderer state. It answers three questions only:
//     1. What are this platform's 2D canvas limits?
//     2. What output size actually fits?
//     3. How is that output divided into gutter-overscanned tiles?
// - The gutter (overscan) exists so screen-space effects - FXAA, profile
//   lines, SSAO, and the structural Sobel neighbourhood used by the render
//   layer edge passes - cannot produce visible seams at tile boundaries.
// - Tile interiors are split evenly across the grid (ceil), so the right and
//   bottom edge tiles may be narrower; every tile entry carries its own
//   clipped copy width and height for that reason.
// - The default interior and gutter constants are exported so a consumer that
//   allows them to be overridden can detect the divergence. The beauty
//   exporter always uses the defaults, so any other path that overrides them
//   stops sharing Beauty's pixel registration - which is the one thing this
//   module exists to guarantee.
//
// INTEGRATION:
// - Na__ImageExport__StaticExport__TiledRenderer.js (beauty / whitecard)
// - 71__System__ExportRenderLayers/01__SystemModules/Na__ExportRenderLayers__TiledPassRenderer__.js
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Initial extraction from the static tiled beauty renderer. Behaviour is
//   unchanged; the beauty renderer now consumes this planner.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Default Tile Geometry
    // ------------------------------------------------------------
    const Na__TilePlan__TILE_INTERIOR_DESKTOP = 2048;   // <-- Max tile interior edge on desktop (framebuffer stays viewport-scale)
    const Na__TilePlan__TILE_INTERIOR_IOS     = 1536;   // <-- Smaller tiles on iOS to respect tighter GPU memory budgets
    const Na__TilePlan__TILE_GUTTER           = 32;     // <-- Overscan cropped on composite; hides FXAA/profile-line/SSAO seams
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Device Capability Detection and Limits
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Detect iOS / iPadOS Devices
    // ------------------------------------------------------------
    // iPadOS 13+ masquerades as MacIntel; the touch-point check catches it.
    // ------------------------------------------------------------
    function Na__TilePlan__IsIosDevice() {
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
    function Na__TilePlan__GetCanvasLimits() {
        if (Na__TilePlan__IsIosDevice()) {
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
    function Na__TilePlan__ClampToDeviceLimits(targetWidth, targetHeight) {
        const limits = Na__TilePlan__GetCanvasLimits();
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
        console.warn(`[TilePlan] Requested ${targetWidth}x${targetHeight} exceeds device canvas limits; clamped to ${width}x${height}.`);
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
    function Na__TilePlan__ProbeCanvas(canvas, ctx) {
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
// REGION | Tile Plan Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Tile Plan for One Output Image
    // ------------------------------------------------------------
    // options:
    //   outWidth       {number}  Final output width in pixels (already clamped)
    //   outHeight      {number}  Final output height in pixels (already clamped)
    //   tileInterior   {number|null}  Override interior edge; null uses the
    //                                 platform default (desktop / iOS)
    //   gutter         {number|null}  Override overscan; null uses the default
    //
    // Returns:
    //   {
    //     outWidth, outHeight,
    //     cols, rows, totalTiles,
    //     tileW, tileH,        <-- Nominal interior tile size
    //     fbW, fbH,            <-- WebGL framebuffer size (interior + 2 x gutter)
    //     gutter,
    //     tiles: [ { index, col, row, x, y, copyWidth, copyHeight } ]
    //   }
    //
    // Every tile's sub-frustum is camera.setViewOffset(outWidth, outHeight,
    // x - gutter, y - gutter, fbW, fbH). copyWidth / copyHeight are the
    // clipped interior dimensions for edge tiles.
    // ------------------------------------------------------------
    function Na__TilePlan__Build(options) {
        const {
            outWidth,
            outHeight,
            tileInterior = null,
            gutter       = null
        } = options;

        const planGutter = Number.isFinite(gutter) && gutter >= 0
            ? Math.floor(gutter)
            : Na__TilePlan__TILE_GUTTER;

        const planInterior = Number.isFinite(tileInterior) && tileInterior > 0
            ? Math.floor(tileInterior)
            : (Na__TilePlan__IsIosDevice()
                ? Na__TilePlan__TILE_INTERIOR_IOS
                : Na__TilePlan__TILE_INTERIOR_DESKTOP);


        // GRID | Derive column and row counts, then the even-ish interior split
        // ------------------------------------------------------------
        const cols  = Math.max(1, Math.ceil(outWidth  / planInterior));
        const rows  = Math.max(1, Math.ceil(outHeight / planInterior));
        const tileW = Math.ceil(outWidth  / cols);                   // <-- Even-ish interior split across columns
        const tileH = Math.ceil(outHeight / rows);                   // <-- Even-ish interior split across rows
        const fbW   = tileW + planGutter * 2;                        // <-- WebGL framebuffer width (tile + overscan)
        const fbH   = tileH + planGutter * 2;                        // <-- WebGL framebuffer height (tile + overscan)


        // TILE LIST | One entry per tile, in row-major render order
        // ------------------------------------------------------------
        const tiles = [];
        let tileIndex = 0;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * tileW;                               // <-- Tile interior origin in output pixels
                const y = row * tileH;

                tiles.push({
                    index      : tileIndex++,
                    col,
                    row,
                    x,
                    y,
                    copyWidth  : Math.min(tileW, outWidth  - x),     // <-- Right-edge tiles may be narrower
                    copyHeight : Math.min(tileH, outHeight - y)      // <-- Bottom-edge tiles may be shorter
                });
            }
        }


        return {
            outWidth,
            outHeight,
            cols,
            rows,
            totalTiles : tiles.length,
            tileW,
            tileH,
            fbW,
            fbH,
            gutter     : planGutter,
            tiles
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Shared Tile Plan API
    // ------------------------------------------------------------
    export {
        Na__TilePlan__Build,
        Na__TilePlan__ClampToDeviceLimits,
        Na__TilePlan__ProbeCanvas,
        Na__TilePlan__IsIosDevice,
        Na__TilePlan__TILE_INTERIOR_DESKTOP,
        Na__TilePlan__TILE_INTERIOR_IOS,
        Na__TilePlan__TILE_GUTTER
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
