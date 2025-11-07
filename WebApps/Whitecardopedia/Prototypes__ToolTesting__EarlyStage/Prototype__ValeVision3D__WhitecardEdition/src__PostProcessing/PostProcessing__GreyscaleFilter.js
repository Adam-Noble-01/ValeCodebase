// --------------------------------------------------------
// POST-PROCESSING SYSTEM | Greyscale filter effects
// --------------------------------------------------------


// #Region ------------------------------------------------
// CONFIGURATION | Post-processing settings and constants
// --------------------------------------------------------
const POSTPROCESS_GREYSCALE_ENABLED     = true;                                  // <-- Enable/disable greyscale filter
const POSTPROCESS_GREYSCALE_DEGREE     = 1.0;                                   // <-- Greyscale intensity (0.0 = color, 1.0 = full greyscale)
const POSTPROCESS_GREYSCALE_RATIO      = 1.0;                                   // <-- Post-process resolution ratio (1.0 = full resolution)
const POSTPROCESS_MSAA_SAMPLES         = 4;                                     // <-- MSAA samples for antialiasing (2, 4, or 8 - higher = better quality but more performance cost)
const POSTPROCESS_CHECK_HARDWARE_LIMIT = true;                                  // <-- Check hardware MSAA limit before applying samples
// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// HELPER FUNCTIONS | Utility functions for post-processing
// --------------------------------------------------------

// FUNCTION | GetOptimalMSAASamples - Gets optimal MSAA sample count based on hardware limits
// --------------------------------------------------------
function getOptimalMSAASamples(engine, requestedSamples) {
    if (!POSTPROCESS_CHECK_HARDWARE_LIMIT) {
        return requestedSamples;
    }


    // Get hardware maximum MSAA samples
    // ------------------------------------
    const maxSamples = engine.getCaps().maxMSAASamples;
    const optimalSamples = Math.min(requestedSamples, maxSamples);


    return optimalSamples;
}
// --------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// POST-PROCESSING SETUP | Greyscale filter creation and configuration
// --------------------------------------------------------

// FUNCTION | SetupGreyscaleFilter - Creates and configures BlackAndWhitePostProcess with MSAA
// --------------------------------------------------------
function setupGreyscaleFilter(camera, engine) {
    if (!POSTPROCESS_GREYSCALE_ENABLED) {
        return null;
    }


    // Validate camera reference
    // ------------------------------------
    if (!camera) {
        return null;
    }


    // Create BlackAndWhitePostProcess
    // ------------------------------------
    const blackAndWhite = new BABYLON.BlackAndWhitePostProcess(
        "bw",                                                                    // <-- Post-process name
        POSTPROCESS_GREYSCALE_RATIO,                                            // <-- Resolution ratio (1.0 = full resolution)
        camera                                                                   // <-- Camera to apply post-process to
    );


    // Set greyscale intensity
    // ------------------------------------
    blackAndWhite.degree = POSTPROCESS_GREYSCALE_DEGREE;                        // <-- 0 to 1, controls intensity


    // Enable MSAA to prevent detail loss and antialiasing issues
    // ------------------------------------
    const optimalSamples = engine ? getOptimalMSAASamples(engine, POSTPROCESS_MSAA_SAMPLES) : POSTPROCESS_MSAA_SAMPLES;
    blackAndWhite.samples = optimalSamples;                                      // <-- Enable MSAA to preserve detail


    return blackAndWhite;
}
// --------------------------------------------------------

// #endregion ---------------------------------------------

