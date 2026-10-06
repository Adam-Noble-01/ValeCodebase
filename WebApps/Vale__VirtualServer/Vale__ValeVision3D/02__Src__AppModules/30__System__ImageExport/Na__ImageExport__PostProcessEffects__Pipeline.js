// -----------------------------------------------------------------------------
// REGION | Image Export Post Process - Pipeline Orchestrator
// -----------------------------------------------------------------------------
//
// MEMORY SAFETY NOTE (08-Jul-2026):
// - The pipeline previously cloned the source canvas into a working copy. At
//   4K/8K export sizes that duplicated a 100-480MB canvas for no benefit -
//   both call sites pass a freshly captured, throwaway canvas.
// - The pipeline now processes IN PLACE and returns the same canvas it was
//   given. Callers must pass a canvas they own exclusively.
// - Effects are async (strip-based internally) so the whole pipeline is
//   awaited and reports progress via the optional onProgress callback.
//
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Post Process Effects
    // ------------------------------------------------------------
    import { Na__PostProcess__ApplyLevels } from './Na__ImageExport__PostProcessEffects__Levels.js';
    import { Na__PostProcess__ApplyHighPassSharpen } from './Na__ImageExport__PostProcessEffects__HighPassSharpen.js';
    // ------------------------------------------------------------


    // FUNCTION | Run Post Process Pipeline on Canvas (In Place)
    // ------------------------------------------------------------
    async function Na__PostProcess__RunPipeline(sourceCanvas, postProcessConfig, onProgress = null) {
        if (!sourceCanvas) {
            return sourceCanvas; // <-- Return original if no canvas provided
        }

        // Check if post-processing is enabled
        // ------------------------------------------------------------
        if (!postProcessConfig || !postProcessConfig.ImageExport__PostProcessEffects__Enabled) {
            return sourceCanvas; // <-- Return original canvas if disabled
        }

        const configArray = postProcessConfig.ImageExport__PostProcessEffects__Config; // <-- Get effects config array
        if (!Array.isArray(configArray) || configArray.length === 0) {
            return sourceCanvas; // <-- Return original if no effects configured
        }

        const progress = (typeof onProgress === 'function') ? onProgress : () => {};   // <-- Optional status reporter

        // Sort effects by Order field (ascending: 1, 2, 3, ...)
        // ------------------------------------------------------------
        const sortedEffects = [...configArray].sort((a, b) => {
            let orderA = null; // <-- Order for effect A
            let orderB = null; // <-- Order for effect B

            // Extract order from Levels effect
            // ------------------------------------------------------------
            if (a.ImageExport__PostProcessEffects__Levels) {
                orderA = a.ImageExport__PostProcessEffects__Levels.ImageExport__PostProcessEffects__Levels__Order || 999; // <-- Default to end if missing
            }
            if (b.ImageExport__PostProcessEffects__Levels) {
                orderB = b.ImageExport__PostProcessEffects__Levels.ImageExport__PostProcessEffects__Levels__Order || 999; // <-- Default to end if missing
            }

            // Extract order from High Pass Sharpen effect
            // ------------------------------------------------------------
            if (a.ImageExport__PostProcessEffects__HighPassSharpen) {
                orderA = a.ImageExport__PostProcessEffects__HighPassSharpen.ImageExport__PostProcessEffects__HighPassSharpen__Order || 999; // <-- Default to end if missing
            }
            if (b.ImageExport__PostProcessEffects__HighPassSharpen) {
                orderB = b.ImageExport__PostProcessEffects__HighPassSharpen.ImageExport__PostProcessEffects__HighPassSharpen__Order || 999; // <-- Default to end if missing
            }

            return (orderA || 999) - (orderB || 999); // <-- Sort ascending by order
        });

        // Apply each enabled effect in order (in place on the source canvas)
        // ------------------------------------------------------------
        for (const effectConfig of sortedEffects) {
            // Apply Levels effect if enabled
            // ------------------------------------------------------------
            if (effectConfig.ImageExport__PostProcessEffects__Levels) {
                const levelsConfig = effectConfig.ImageExport__PostProcessEffects__Levels; // <-- Get Levels config
                if (levelsConfig.ImageExport__PostProcessEffects__Levels__Enabled) {
                    progress('Enhancing Image... (Levels)');                               // <-- Report active effect
                    const params = levelsConfig.ImageExport__PostProcessEffects__Levels__Parameters; // <-- Get parameters
                    await Na__PostProcess__ApplyLevels(sourceCanvas, params);              // <-- Apply Levels effect (strip-based)
                }
            }

            // Apply High Pass Sharpen effect if enabled
            // ------------------------------------------------------------
            if (effectConfig.ImageExport__PostProcessEffects__HighPassSharpen) {
                const highPassConfig = effectConfig.ImageExport__PostProcessEffects__HighPassSharpen; // <-- Get High Pass config
                if (highPassConfig.ImageExport__PostProcessEffects__HighPassSharpen__Enabled) {
                    progress('Enhancing Image... (Sharpen)');                              // <-- Report active effect
                    const params = highPassConfig.ImageExport__PostProcessEffects__HighPassSharpen__Parameters; // <-- Get parameters
                    await Na__PostProcess__ApplyHighPassSharpen(sourceCanvas, params);     // <-- Apply High Pass Sharpen effect (strip-based)
                }
            }
        }

        return sourceCanvas; // <-- Return processed canvas (same object, mutated in place)
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Pipeline API
    // ------------------------------------------------------------
    export {
        Na__PostProcess__RunPipeline
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
