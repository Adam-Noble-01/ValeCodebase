// -----------------------------------------------------------------------------
// REGION | Image Export Post Process - Levels Effect
// -----------------------------------------------------------------------------
//
// MEMORY SAFETY NOTE (08-Jul-2026):
// - Previously this effect called getImageData on the ENTIRE canvas - at 4K/8K
//   export sizes that is a 120-480MB single allocation which killed iPad tabs.
// - Now processes the canvas in horizontal strips (bounded allocation) and maps
//   pixels through a precomputed 256-entry lookup table instead of running the
//   full normalize/remap/gamma math 90+ million times.
// - The function is async and yields to the event loop between strips so the
//   export overlay keeps animating.
//
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Hidden-Tab-Safe Async Yield
    // ------------------------------------------------------------
    import { Na__ExportYield__NextTick } from './Na__ImageExport__AsyncYield__.js';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Strip Processing Budget
    // ------------------------------------------------------------
    const Na__Levels__MAX_STRIP_PIXELS = 4194304;   // <-- ~4MP per getImageData call (~16MB ImageData) keeps memory flat
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build 256-Entry Levels Lookup Table
    // ------------------------------------------------------------
    // Levels is a pure per-channel-value mapping, so the whole effect
    // collapses to one table lookup per channel.
    // ------------------------------------------------------------
    function Na__Levels__BuildLookupTable(black, white, gamma) {
        const lut       = new Uint8ClampedArray(256);
        const blackNorm = black / 255.0;                             // <-- Normalized black point
        const whiteNorm = white / 255.0;                             // <-- Normalized white point

        for (let v = 0; v < 256; v++) {
            let value = v / 255.0;

            if (whiteNorm <= blackNorm) {
                value = value < blackNorm ? 0 : 1;                   // <-- Guard against invalid range (white <= black)
            } else {
                value = (value - blackNorm) / (whiteNorm - blackNorm); // <-- Remap from [black, white] to [0, 1]
                value = Math.max(0, Math.min(1, value));             // <-- Clamp to valid range
            }

            if (gamma !== 1.0 && gamma > 0) {
                value = Math.pow(value, 1.0 / gamma);                // <-- Gamma curve adjustment
            }

            lut[v] = Math.round(value * 255);                        // <-- Store adjusted value
        }
        return lut;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply Levels Adjustment to Canvas (Strip-Based)
    // ------------------------------------------------------------
    async function Na__PostProcess__ApplyLevels(canvas, params) {
        if (!canvas || !params || !Array.isArray(params) || params.length === 0) {
            return canvas; // <-- Return original canvas if invalid params
        }

        const param = params[0]; // <-- Get first parameter set
        const black = param.ImageExport__PostProcessEffects__Levels__Parameter__Black || 0;   // <-- Black point (0-255)
        const white = param.ImageExport__PostProcessEffects__Levels__Parameter__White || 255; // <-- White point (0-255)
        const gamma = param.ImageExport__PostProcessEffects__Levels__Parameter__Gamma || 1.0; // <-- Gamma correction (typically 1.0)

        const ctx = canvas.getContext('2d'); // <-- Get 2D rendering context
        if (!ctx) return canvas;             // <-- Guard against missing context

        const width  = canvas.width;
        const height = canvas.height;
        const lut    = Na__Levels__BuildLookupTable(black, white, gamma); // <-- One table, applied to every channel

        // STRIP LOOP | Bounded-memory row bands instead of one full-frame read
        // ------------------------------------------------------------
        const stripHeight = Math.max(1, Math.floor(Na__Levels__MAX_STRIP_PIXELS / width)); // <-- Rows per strip within pixel budget

        for (let y = 0; y < height; y += stripHeight) {
            const rowCount  = Math.min(stripHeight, height - y);         // <-- Final strip may be shorter
            const imageData = ctx.getImageData(0, y, width, rowCount);   // <-- Read only this strip
            const data      = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                data[i]     = lut[data[i]];                              // <-- Red via lookup
                data[i + 1] = lut[data[i + 1]];                          // <-- Green via lookup
                data[i + 2] = lut[data[i + 2]];                          // <-- Blue via lookup
                // Alpha channel (i + 3) is left unchanged
            }

            ctx.putImageData(imageData, 0, y);                           // <-- Write strip back in place
            await Na__ExportYield__NextTick();                           // <-- Keep the page responsive between strips (hidden-tab safe)
        }

        return canvas; // <-- Return modified canvas
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Levels Effect API
    // ------------------------------------------------------------
    export {
        Na__PostProcess__ApplyLevels
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
