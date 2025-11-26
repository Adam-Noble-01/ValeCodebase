// =============================================================================
// PEN & WASH WATERCOLOR EFFECTS - TOON SHADER POST-PROCESS
// =============================================================================
//
// FILE       : PostFx__ToonShaderEffect.js
// NAMESPACE  : PenWashWatercolorEffects
// MODULE     : Toon Shader Post-Process Effect
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Cel-shaded toon rendering effect with color quantization and edge detection
// CREATED    : 2025
//
// DESCRIPTION:
// - Custom post-process effect that creates cel-shaded/cartoon rendering style
// - Quantizes colors into discrete bands for posterization effect
// - Implements edge detection using Sobel operator for darkening object boundaries
// - Adjustable quantization levels for different artistic styles (2-16 bands)
// - Edge detection threshold controls line thickness and visibility
// - Smooth gradient preservation option for softer transitions between bands
// - Applied as post-process for consistent toon rendering across entire scene
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Configuration Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Toon Shader Effect Configuration
    // ------------------------------------------------------------
    const TOON_SHADER_EFFECT_ENABLED              = false;                                         // <-- Enable/disable toon shader effect
    const TOON_SHADER_POSTPROCESS_RESOLUTION      = 1.0;                                          // <-- Post-process resolution ratio (1.0 = full resolution)
    const TOON_SHADER_DEFAULT_QUANTIZATION_LEVELS = 8.0;                                          // <-- Default quantization levels (2.0 to 16.0)
    const TOON_SHADER_DEFAULT_EDGE_THRESHOLD      = 0.02;                                         // <-- Default edge detection threshold (0.0 to 1.0)
    const TOON_SHADER_DEFAULT_EDGE_INTENSITY      = 0.11;                                          // <-- Default edge darkening intensity (0.0 to 1.0)
    const TOON_SHADER_DEFAULT_SMOOTH_GRADIENT     = 0.95;                                         // <-- Default smooth gradient preservation (0.0 = hard bands, 1.0 = smooth)
    // ------------------------------------------------------------
    
    // MODULE CONSTANTS | Parameter Limits
    // ------------------------------------------------------------
    const TOON_SHADER_QUANTIZATION_LEVELS_MIN      = 2.0;                                          // <-- Minimum quantization levels
    const TOON_SHADER_QUANTIZATION_LEVELS_MAX      = 16.0;                                         // <-- Maximum quantization levels
    const TOON_SHADER_EDGE_THRESHOLD_MIN           = 0.0;                                         // <-- Minimum edge threshold
    const TOON_SHADER_EDGE_THRESHOLD_MAX           = 1.0;                                         // <-- Maximum edge threshold
    const TOON_SHADER_EDGE_INTENSITY_MIN           = 0.0;                                         // <-- Minimum edge intensity
    const TOON_SHADER_EDGE_INTENSITY_MAX           = 1.0;                                         // <-- Maximum edge intensity
    const TOON_SHADER_SMOOTH_GRADIENT_MIN          = 0.0;                                         // <-- Minimum smooth gradient
    const TOON_SHADER_SMOOTH_GRADIENT_MAX          = 1.0;                                         // <-- Maximum smooth gradient
    // ------------------------------------------------------------
    
    // MODULE CONSTANTS | Shader File Path
    // ------------------------------------------------------------
    const TOON_SHADER_SHADER_PATH                  = 'src/Effects__PostProcessEffects/PostFx__ToonShaderEffect.glsl';  // <-- Path to GLSL shader file
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shader Loading and Registration
// -----------------------------------------------------------------------------

    // FUNCTION | Load Shader from GLSL File
    // ------------------------------------------------------------
    async function loadToonShaderShader() {
        try {
            const response = await fetch(TOON_SHADER_SHADER_PATH);                                 // <-- Fetch shader file
            
            if (!response.ok) {
                throw new Error(`Failed to load shader: ${response.statusText}`);                 // <-- Handle fetch error
            }
            
            const shaderText = await response.text();                                              // <-- Get shader text content
            return shaderText;                                                                     // <-- Return shader text
            
        } catch (error) {
            console.error('Error loading toon shader shader:', error);                            // <-- Log error
            throw error;                                                                           // <-- Re-throw error
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Register Shader with Babylon.js Shader Store
    // ------------------------------------------------------------
    function registerToonShaderShader(shaderText) {
        BABYLON.Effect.ShadersStore['toonShaderFragmentShader'] = shaderText;                    // <-- Register fragment shader with shader store
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Post-Process Creation
// -----------------------------------------------------------------------------

    // FUNCTION | Create Toon Shader Post-Process - Creates custom post-process with toon shading effect
    // ------------------------------------------------------------
    function createToonShaderPostProcess(scene, camera, engine) {
        // Create custom post-process
        // ------------------------------------
        const postProcess = new BABYLON.PostProcess(                                              // <-- Create custom post-process
            'toonShaderEffect',                                                                    // <-- Post-process name
            'toonShader',                                                                          // <-- Shader name (Babylon appends 'FragmentShader')
            ['screenSize', 'quantizationLevels', 'edgeThreshold', 'edgeIntensity', 'smoothGradient'],  // <-- Uniform names (textureSampler is automatic)
            [],                                                                                    // <-- Texture samplers (none needed)
            TOON_SHADER_POSTPROCESS_RESOLUTION,                                                   // <-- Resolution ratio
            camera,                                                                                // <-- Target camera
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,                                                // <-- Sampling mode for filtering
            engine,                                                                                // <-- Engine reference
            false                                                                                  // <-- Reusable flag
        );
        
        // Set uniforms on each frame
        // ------------------------------------
        postProcess.onApply = (effect) => {                                                        // <-- Set up effect uniforms
            const screenWidth = engine.getRenderWidth();                                           // <-- Get screen width
            const screenHeight = engine.getRenderHeight();                                         // <-- Get screen height
            effect.setFloat2('screenSize', screenWidth, screenHeight);                            // <-- Set screen size uniform
            
            effect.setFloat('quantizationLevels', TOON_SHADER_DEFAULT_QUANTIZATION_LEVELS);        // <-- Set quantization levels
            effect.setFloat('edgeThreshold', TOON_SHADER_DEFAULT_EDGE_THRESHOLD);                 // <-- Set edge detection threshold
            effect.setFloat('edgeIntensity', TOON_SHADER_DEFAULT_EDGE_INTENSITY);                 // <-- Set edge darkening intensity
            effect.setFloat('smoothGradient', TOON_SHADER_DEFAULT_SMOOTH_GRADIENT);               // <-- Set smooth gradient preservation
        };
        
        return postProcess;                                                                       // <-- Return post-process instance
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Integration Function
// -----------------------------------------------------------------------------

    // FUNCTION | Setup Toon Shader Effect - Main function to setup toon shader post-process
    // ------------------------------------------------------------
    async function setupToonShaderEffect(scene, camera, engine, enabled = null) {
        // #Region ------------------------------------------------
        // Effect Enabled Control
        // --------------------------------------------------------
        // Constant is master control - if false, effect is disabled regardless of passed parameter
        const effectEnabled = TOON_SHADER_EFFECT_ENABLED && (enabled !== null ? enabled : true);  // <-- Check constant first, then use passed flag or default to true
        // #endregion ---------------------------------------------
        
        if (!effectEnabled) {                                                                    // <-- Check if effect is enabled
            console.log('⊘ Toon Shader Effect disabled by configuration');
            return null;                                                                           // <-- Return null if disabled
        }
        
        try {
            // Load shader from GLSL file
            // ------------------------------------
            const shaderText = await loadToonShaderShader();                                      // <-- Load shader from .glsl file
            
            // Register shader with Babylon.js shader store
            // ------------------------------------
            registerToonShaderShader(shaderText);                                                 // <-- Register fragment shader
            
            // Create post-process
            // ------------------------------------
            const postProcess = createToonShaderPostProcess(                                      // <-- Create post-process
                scene,                                                                            // <-- Parent scene
                camera,                                                                           // <-- Target camera
                engine                                                                            // <-- Babylon engine
            );
            
            return {                                                                              // <-- Return post-process and related objects
                postProcess: postProcess                                                           // <-- Post-process instance
            };
            
        } catch (error) {
            console.error('Failed to setup toon shader post-process effect:', error);             // <-- Log error
            throw error;                                                                          // <-- Re-throw error
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Export
// -----------------------------------------------------------------------------

    // Export setupToonShaderEffect to global scope for HTML access
    // ------------------------------------------------------------
    window.setupToonShaderEffect = setupToonShaderEffect;                                       // <-- Export main function to global scope
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

