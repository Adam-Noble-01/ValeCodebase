// --------------------------------------------------------
// WHITECARD RENDERING PIPELINE | Unified post-processing and rendering effects
// --------------------------------------------------------


// #Region ------------------------------------------------
// CONFIGURATION | Rendering pipeline settings and constants
// --------------------------------------------------------

// SSAO (Screen Space Ambient Occlusion) Settings
// ------------------------------------
const PIPELINE_SSAO_ENABLED              = true;                                  // <-- Enable/disable SSAO effect
const PIPELINE_SSAO_SSAO_RATIO           = 1.0;                                   // <-- SSAO post-process resolution ratio (0.5 = half resolution for performance)
const PIPELINE_SSAO_BLUR_RATIO           = 1.0;                                   // <-- Blur post-process resolution ratio (0.5 = half resolution for performance)
const PIPELINE_SSAO_TOTAL_STRENGTH       = 50.0;                                   // <-- Overall strength of SSAO effect (0.0 to 2.0, higher = more pronounced shadows)
const PIPELINE_SSAO_RADIUS               = 0.035;                                  // <-- Radius around each pixel to sample for occlusion (smaller = tighter shadows, camera-distance independent)
const PIPELINE_SSAO_SAMPLES              = 32;                                    // <-- Number of samples per pixel (higher = better quality but more performance cost)
const PIPELINE_SSAO_EXPENSIVE_BLUR       = true;                                  // <-- Use high-quality blur (true = better quality, false = better performance)
const PIPELINE_SSAO_MAX_Z                = 200.0;                                 // <-- Maximum depth value to consider for occlusion calculations
const PIPELINE_SSAO_MIN_Z_ASPECT         = 0.2;                                   // <-- Minimum Z aspect ratio for depth calculations

// Greyscale Filter Settings
// ------------------------------------
const PIPELINE_GREYSCALE_ENABLED         = true;                                  // <-- Enable/disable greyscale filter
const PIPELINE_GREYSCALE_DEGREE          = 1.0;                                   // <-- Greyscale intensity (0.0 = color, 1.0 = full greyscale)
const PIPELINE_GREYSCALE_RATIO           = 1.0;                                   // <-- Post-process resolution ratio (1.0 = full resolution)
const PIPELINE_MSAA_SAMPLES              = 4;                                     // <-- MSAA samples for antialiasing (2, 4, or 8 - higher = better quality but more performance cost)
const PIPELINE_CHECK_HARDWARE_LIMIT      = true;                                  // <-- Check hardware MSAA limit before applying samples

// Pipeline Performance Settings
// ------------------------------------
const PIPELINE_HDR_ENABLED               = false;                                 // <-- Enable HDR rendering (requires HDR textures)
const PIPELINE_BLOOM_ENABLED             = false;                                 // <-- Enable bloom effect
const PIPELINE_BLOOM_THRESHOLD           = 0.9;                                   // <-- Bloom threshold (brightness level to trigger bloom)
const PIPELINE_BLOOM_SCALE               = 0.5;                                   // <-- Bloom scale/intensity
const PIPELINE_BLOOM_KERNEL              = 64;                                    // <-- Bloom kernel size (higher = larger bloom area)
// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// HELPER FUNCTIONS | Utility functions for rendering pipeline
// --------------------------------------------------------

// FUNCTION | GetOptimalMSAASamples - Gets optimal MSAA sample count based on hardware limits
// --------------------------------------------------------
function getOptimalMSAASamples(engine, requestedSamples) {
    if (!PIPELINE_CHECK_HARDWARE_LIMIT) {
        return requestedSamples;
    }


    // Get hardware maximum MSAA samples
    // ------------------------------------
    const maxSamples = engine.getCaps().maxMSAASamples;
    const optimalSamples = Math.min(requestedSamples, maxSamples);


    return optimalSamples;
}
// --------------------------------------------------------


// FUNCTION | EnablePrePassRenderer - Ensures pre-pass renderer is enabled for SSAO
// --------------------------------------------------------
function enablePrePassRenderer(scene) {
    if (!scene) {
        return null;
    }


    // Enable pre-pass renderer (required for SSAO2)
    // ------------------------------------
    const prePassRenderer = scene.enablePrePassRenderer();                          // <-- Enable or get existing pre-pass renderer


    // Configure pre-pass renderer MSAA for anti-aliasing
    // ------------------------------------
    if (prePassRenderer) {
        prePassRenderer.samples = PIPELINE_MSAA_SAMPLES;                            // <-- Enable MSAA on pre-pass renderer to prevent aliasing
    }


    return prePassRenderer;
}
// --------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// RENDERING PIPELINE SETUP | Unified pipeline creation and configuration
// --------------------------------------------------------

// FUNCTION | SetupWhitecardRenderingPipeline - Creates and configures unified rendering pipeline with SSAO and greyscale effects
// --------------------------------------------------------
function setupWhitecardRenderingPipeline(camera, scene, engine) {
    if (!camera || !scene || !engine) {
        console.warn('Whitecard rendering pipeline setup skipped: camera, scene, or engine reference missing'); // <-- Log warning if references invalid
        return null;
    }


    // Initialize pipeline result object
    // ------------------------------------
    const pipelineResult = {
        ssaoPipeline: null,
        greyscalePostProcess: null,
        prePassRenderer: null
    };


    // Enable pre-pass renderer (required for SSAO2)
    // ------------------------------------
    if (PIPELINE_SSAO_ENABLED) {
        const prePassRenderer = enablePrePassRenderer(scene);                      // <-- Enable pre-pass renderer
        if (!prePassRenderer) {
            console.warn('SSAO setup failed: pre-pass renderer could not be enabled'); // <-- Log warning if pre-pass renderer fails
        } else {
            pipelineResult.prePassRenderer = prePassRenderer;                      // <-- Store pre-pass renderer reference
        }
    }


    // Setup SSAO2 Rendering Pipeline
    // ------------------------------------
    if (PIPELINE_SSAO_ENABLED && pipelineResult.prePassRenderer) {
        // Configure SSAO ratios for performance optimization
        // ------------------------------------
        const ssaoRatio = {
            ssaoRatio: PIPELINE_SSAO_SSAO_RATIO,                                    // <-- SSAO post-process resolution ratio
            blurRatio: PIPELINE_SSAO_BLUR_RATIO                                     // <-- Blur post-process resolution ratio
        };


        // Create SSAO2 rendering pipeline
        // ------------------------------------
        const ssao2Pipeline = new BABYLON.SSAO2RenderingPipeline(
            'whitecardSSAO2Pipeline',                                              // <-- Pipeline name identifier
            scene,                                                                  // <-- Scene to apply pipeline to
            ssaoRatio,                                                              // <-- Resolution ratios for SSAO and blur
            [camera]                                                                // <-- Array of cameras to attach pipeline to
        );


        // Configure SSAO2 pipeline parameters
        // ------------------------------------
        ssao2Pipeline.totalStrength = PIPELINE_SSAO_TOTAL_STRENGTH;                 // <-- Overall SSAO effect strength
        ssao2Pipeline.radius = PIPELINE_SSAO_RADIUS;                                // <-- Sampling radius around each pixel
        ssao2Pipeline.samples = PIPELINE_SSAO_SAMPLES;                               // <-- Number of samples per pixel
        ssao2Pipeline.expensiveBlur = PIPELINE_SSAO_EXPENSIVE_BLUR;                 // <-- Use high-quality blur algorithm
        ssao2Pipeline.maxZ = PIPELINE_SSAO_MAX_Z;                                   // <-- Maximum depth value for occlusion
        ssao2Pipeline.minZAspect = PIPELINE_SSAO_MIN_Z_ASPECT;                      // <-- Minimum Z aspect ratio
        ssao2Pipeline.base = 0.4;                                                   // <-- Base intensity for SSAO effect (increased for better visibility)


        // Attach pipeline to camera via post-process render pipeline manager
        // ------------------------------------
        scene.postProcessRenderPipelineManager.addPipeline(ssao2Pipeline);         // <-- Register pipeline with manager
        scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(      // <-- Attach pipeline to camera
            'whitecardSSAO2Pipeline',
            camera
        );


        // Enable SSAO combine render effect
        // ------------------------------------
        scene.postProcessRenderPipelineManager.enableEffectInPipeline(             // <-- Enable the combine effect that merges SSAO with scene
            'whitecardSSAO2Pipeline',
            ssao2Pipeline.SSAOCombineRenderEffect,
            camera
        );


        pipelineResult.ssaoPipeline = ssao2Pipeline;                               // <-- Store SSAO pipeline reference
        console.log('SSAO2 pipeline created and attached successfully');            // <-- Log successful setup
    }


    // Setup Greyscale Post-Process Filter
    // ------------------------------------
    if (PIPELINE_GREYSCALE_ENABLED) {
        // Create BlackAndWhitePostProcess
        // ------------------------------------
        const blackAndWhite = new BABYLON.BlackAndWhitePostProcess(
            "whitecardGreyscale",                                                   // <-- Post-process name
            PIPELINE_GREYSCALE_RATIO,                                              // <-- Resolution ratio (1.0 = full resolution)
            camera                                                                  // <-- Camera to apply post-process to
        );


        // Set greyscale intensity
        // ------------------------------------
        blackAndWhite.degree = PIPELINE_GREYSCALE_DEGREE;                          // <-- 0 to 1, controls intensity


        // Enable MSAA to prevent detail loss and antialiasing issues
        // ------------------------------------
        const optimalSamples = getOptimalMSAASamples(engine, PIPELINE_MSAA_SAMPLES); // <-- Get optimal MSAA samples
        blackAndWhite.samples = optimalSamples;                                      // <-- Enable MSAA to preserve detail


        pipelineResult.greyscalePostProcess = blackAndWhite;                       // <-- Store greyscale post-process reference
        console.log('Greyscale post-process created and attached successfully');     // <-- Log successful setup
    }


    console.log('Whitecard rendering pipeline setup completed');                     // <-- Log overall pipeline completion


    return pipelineResult;
}
// --------------------------------------------------------

// #endregion ---------------------------------------------

