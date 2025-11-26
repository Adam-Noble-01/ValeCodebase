// #Region ------------------------------------------------
// Post-Processing Effects Layer Stack
// --------------------------------------------------------

    // FUNCTION | Setup Post-Process Effects Layer Stack
    // --------------------------------------------------------
    async function setupPostProcessEffectsLayerStack(scene, camera, engine) {
        try {

            const effects = [
                {
                    Layer : `05`,
                    Apply : true,
                    name  : 'toon shader effect',
                    func  : (enabled) => setupToonShaderEffect(scene, camera, engine, enabled)
                },
                {
                    Layer : `01 - Base Layer (Color Grading)`,
                    Apply : true,
                    name  : 'color grading effect (brightness, contrast, saturation, vibrance, temperature)',
                    func  : (enabled) => createColorGradingEffect(scene, camera, enabled)
                },
                {
                    Layer : `02`,
                    Apply : true,
                    name  : 'Kuwahara painterly abstraction effect',
                    func  : (enabled) => createKuwaharaEffect(scene, camera, enabled)
                },
                {
                    Layer : `03`,
                    Apply : true,
                    name  : 'paper overlay effect',
                    func  : (enabled) => setupPaperOverlayEffect(scene, camera, engine, enabled)
                },
                {
                    Layer : `04 - Top Most Layer (Mesh BasedPaper Bump Displacement)`,
                    Apply : true,
                    name  : 'paper bump displacement effect',
                    func  : (enabled) => createPaperBumpEffect(scene, camera, 'assets/Test__PaperOverlay__.jpg', enabled)
                }
            ];

            for (const effect of effects) {
                // #Region ------------------------------------------------
                // Effect Application Control
                // --------------------------------------------------------
                if (!effect.Apply) {
                    console.log(`⊘ Skipping ${effect.name} (Apply: false)`);     // <-- Skip if not enabled
                    continue;
                }
                // #endregion ---------------------------------------------

                try {
                    await effect.func(effect.Apply);                            // <-- Pass Apply flag to function
                } catch (effectError) {
                    console.error(`Failed to apply ${effect.name}:`, effectError);
                }
            }

        } catch (error) {
            console.error('Failed to setup paper effects:', error);               // <-- Log error but continue
        }
    }
    // --------------------------------------------------------

// #endregion ------------------------------------------------