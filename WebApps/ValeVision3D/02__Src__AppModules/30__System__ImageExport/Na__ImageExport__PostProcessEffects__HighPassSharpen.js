// -----------------------------------------------------------------------------
// REGION | Image Export Post Process - High Pass Sharpen Effect
// -----------------------------------------------------------------------------
//
// MEMORY SAFETY NOTE (08-Jul-2026):
// - Previously this effect allocated THREE full-resolution canvases plus THREE
//   full-frame ImageData buffers. At 4K/8K export sizes that is a transient
//   ~0.7-1.5GB spike which crashed iPad tabs and janked desktops for seconds.
// - Now processes the canvas in horizontal strips with a small padding zone so
//   the Gaussian blur has full kernel support across strip boundaries. Because
//   strips are composited in place top-down, the ORIGINAL pixels of the rows
//   just above each strip are preserved in a small "carry" canvas before they
//   are overwritten, guaranteeing the blur never reads already-sharpened rows.
//   Output is pixel-identical to the old full-frame implementation.
// - ctx.filter support is feature-detected; on browsers without it the effect
//   is skipped with a console warning (previously it silently produced a
//   near-no-op grey overlay).
// - The function is async and yields to the event loop between strips.
//
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Hidden-Tab-Safe Async Yield
    // ------------------------------------------------------------
    import { Na__ExportYield__NextTick } from './Na__ImageExport__AsyncYield__.js';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Strip Processing Budget
    // ------------------------------------------------------------
    const Na__HighPass__MAX_STRIP_PIXELS = 4194304;  // <-- ~4MP per strip (~16MB per ImageData) keeps memory flat
    // ------------------------------------------------------------


    // HELPER FUNCTION | Detect Canvas 2D Filter Support
    // ------------------------------------------------------------
    function Na__HighPass__IsFilterSupported() {
        const testCtx = document.createElement('canvas').getContext('2d');
        if (!testCtx || typeof testCtx.filter !== 'string') return false;
        testCtx.filter = 'blur(2px)';
        return testCtx.filter === 'blur(2px)';                       // <-- Unsupported engines leave the property as 'none'
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create Offscreen Canvas of Given Size
    // ------------------------------------------------------------
    function Na__HighPass__CreateCanvas(width, height) {
        const canvas  = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        return canvas;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply High Pass Sharpen to Canvas (Strip-Based)
    // ------------------------------------------------------------
    async function Na__PostProcess__ApplyHighPassSharpen(canvas, params) {
        if (!canvas || !params || !Array.isArray(params) || params.length === 0) {
            return canvas; // <-- Return original canvas if invalid params
        }

        const param     = params[0]; // <-- Get first parameter set
        const radius    = param.ImageExport__PostProcessEffects__HighPassSharpen__Parameter__Radius || 2.0;       // <-- Blur radius in pixels
        const blendMode = param.ImageExport__PostProcessEffects__HighPassSharpen__Parameter__BlendMode || 'overlay'; // <-- Blend mode (overlay, soft-light, etc.)
        const opacity   = param.ImageExport__PostProcessEffects__HighPassSharpen__Parameter__Opacity || 1.0;      // <-- Opacity (0.0-1.0)

        const ctx = canvas.getContext('2d'); // <-- Get 2D rendering context
        if (!ctx) return canvas;             // <-- Guard against missing context

        if (!Na__HighPass__IsFilterSupported()) {
            console.warn('[HighPassSharpen] Canvas 2D filters unsupported on this browser - sharpen skipped.');
            return canvas;                   // <-- Explicit skip instead of a silent near-no-op
        }

        const width  = canvas.width;  // <-- Canvas width
        const height = canvas.height; // <-- Canvas height

        // STRIP GEOMETRY | Rows per strip and blur kernel padding
        // ------------------------------------------------------------
        const pad         = Math.max(8, Math.ceil(radius * 4));     // <-- Gaussian support (~3 sigma) with safety margin
        const stripHeight = Math.max(pad, Math.floor(Na__HighPass__MAX_STRIP_PIXELS / width)); // <-- Rows per strip within pixel budget

        // REUSABLE BUFFERS | Allocated once at strip size, reused per strip
        // ------------------------------------------------------------
        const maxAssembledH = stripHeight + pad * 2;
        const sourceCanvas  = Na__HighPass__CreateCanvas(width, maxAssembledH); // <-- Assembled ORIGINAL pixels (carry + body + below)
        const sourceCtx     = sourceCanvas.getContext('2d');
        const blurCanvas    = Na__HighPass__CreateCanvas(width, maxAssembledH); // <-- Blurred copy of the assembled pixels
        const blurCtx       = blurCanvas.getContext('2d');
        const highPassCanvas = Na__HighPass__CreateCanvas(width, stripHeight);  // <-- High-pass result for one strip
        const highPassCtx    = highPassCanvas.getContext('2d');
        const carryCanvas   = Na__HighPass__CreateCanvas(width, pad);           // <-- ORIGINAL bottom pad rows of the previous strip
        const carryCtx      = carryCanvas.getContext('2d');

        // STRIP LOOP | Top-down, compositing in place
        // ------------------------------------------------------------
        for (let y0 = 0; y0 < height; y0 += stripHeight) {
            const rowCount = Math.min(stripHeight, height - y0);     // <-- Rows in this strip (final strip may be shorter)
            const y1       = y0 + rowCount;                          // <-- Exclusive strip end row
            const padTop   = Math.min(pad, y0);                      // <-- Rows available above (0 at the image top)
            const padBot   = Math.min(pad, height - y1);             // <-- Rows available below (0 at the image bottom)
            const assembledH = padTop + rowCount + padBot;           // <-- Total assembled source height

            // ASSEMBLE SOURCE | Original pixels only: carry rows + untouched rows
            // ------------------------------------------------------------
            sourceCtx.clearRect(0, 0, width, maxAssembledH);
            if (padTop > 0) {
                sourceCtx.drawImage(carryCanvas, 0, pad - padTop, width, padTop, 0, 0, width, padTop); // <-- Original rows [y0-padTop, y0) saved before previous composite
            }
            sourceCtx.drawImage(canvas, 0, y0, width, rowCount + padBot, 0, padTop, width, rowCount + padBot); // <-- Rows [y0, y1+padBot) are still original

            // BLUR | GPU-accelerated Gaussian on the assembled original pixels
            // ------------------------------------------------------------
            blurCtx.clearRect(0, 0, width, maxAssembledH);
            blurCtx.drawImage(sourceCanvas, 0, 0);                   // <-- Unblurred base copy (matches legacy edge behaviour)
            blurCtx.filter = `blur(${radius}px)`;                    // <-- Set CSS blur filter
            blurCtx.drawImage(sourceCanvas, 0, 0);                   // <-- Apply blur by redrawing over the base
            blurCtx.filter = 'none';                                 // <-- Clear filter for subsequent operations

            // HIGH-PASS | (original - blurred) / 2 + 128 for the strip interior
            // ------------------------------------------------------------
            const originalData   = sourceCtx.getImageData(0, padTop, width, rowCount); // <-- Original strip pixels
            const blurredData    = blurCtx.getImageData(0, padTop, width, rowCount);   // <-- Blurred strip pixels
            const originalPixels = originalData.data;
            const blurredPixels  = blurredData.data;
            const highPassData   = highPassCtx.createImageData(width, rowCount);
            const highPassPixels = highPassData.data;

            for (let i = 0; i < originalPixels.length; i += 4) {
                for (let channel = 0; channel < 3; channel++) {
                    const idx      = i + channel;
                    const highPass = ((originalPixels[idx] - blurredPixels[idx]) / 2) + 128; // <-- Centre difference around grey (Photoshop High Pass)
                    highPassPixels[idx] = highPass < 0 ? 0 : (highPass > 255 ? 255 : highPass); // <-- Clamp (Uint8ClampedArray rounds on store)
                }
                highPassPixels[i + 3] = originalPixels[i + 3];       // <-- Preserve alpha channel
            }

            highPassCtx.putImageData(highPassData, 0, 0);            // <-- Draw high-pass layer for this strip

            // CARRY | Save the ORIGINAL bottom pad rows before overwriting them
            // ------------------------------------------------------------
            const carryRows = Math.min(pad, rowCount);
            carryCtx.clearRect(0, 0, width, pad);
            carryCtx.drawImage(canvas, 0, y1 - carryRows, width, carryRows, pad - carryRows, 0, width, carryRows); // <-- Bottom-aligned original rows [y1-carryRows, y1)

            // COMPOSITE | Blend the high-pass strip onto the main canvas
            // ------------------------------------------------------------
            ctx.save();
            ctx.globalCompositeOperation = blendMode.toLowerCase();  // <-- Set blend mode (overlay, soft-light, etc.)
            ctx.globalAlpha = opacity;                               // <-- Set opacity
            ctx.drawImage(highPassCanvas, 0, 0, width, rowCount, 0, y0, width, rowCount); // <-- Composite strip region only
            ctx.restore();

            await Na__ExportYield__NextTick();                       // <-- Keep the page responsive between strips (hidden-tab safe)
        }

        return canvas; // <-- Return modified canvas
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | High Pass Sharpen Effect API
    // ------------------------------------------------------------
    export {
        Na__PostProcess__ApplyHighPassSharpen
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
