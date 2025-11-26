// =============================================================================
// COLOR GRADING POST-PROCESS EFFECT
// =============================================================================
//
// FILE       : PostFx__ColorGradingEffect.js
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Comprehensive color grading post-processing effect
// CREATED    : 2025
//
// DESCRIPTION:
// - Final color grading layer applied on top of all other effects
// - Brightness control: Linear intensity adjustment (-1.0 to 1.0)
// - Contrast control: S-curve contrast enhancement (0.0 to 2.0)
// - Saturation control: Global color intensity (0.0 to 2.0)
// - Vibrance control: Smart saturation that protects skin tones (0.0 to 2.0)
// - Color Temperature: Warm/cool color shift (2000K to 10000K)
// - Real-time parameter adjustment for interactive color grading
// - Applied as topmost layer for final image polish
//
// =============================================================================

console.log('>>> PostFx__ColorGradingEffect.js script loading...');

// -----------------------------------------------------------------------------
// REGION | Color Grading Effect Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Default Effect Settings
    // ------------------------------------------------------------
    const COLOR_GRADING_EFFECT_ENABLED         = true;                       // <-- Enable color grading effect
    const COLOR_GRADING_DEFAULT_BRIGHTNESS     = 0.16;                        // <-- Default brightness (-1.0 to 1.0, 0.0 = neutral)
    const COLOR_GRADING_DEFAULT_CONTRAST       = 1.1;                        // <-- Default contrast (0.0 to 2.0, 1.0 = neutral)
    const COLOR_GRADING_DEFAULT_SATURATION     = 0.9;                        // <-- Default saturation (0.0 to 2.0, 1.0 = neutral)
    const COLOR_GRADING_DEFAULT_VIBRANCE       = 1.0;                        // <-- Default vibrance (0.0 to 2.0, 1.0 = neutral)
    const COLOR_GRADING_DEFAULT_TEMPERATURE    = 6200.0;                     // <-- Default color temperature in Kelvin (6500K = neutral)
    const COLOR_GRADING_POSTPROCESS_RESOLUTION = 1.0;                        // <-- Post-process resolution ratio (1.0 = full resolution)
    
    // Parameter Limits
    // ------------------------------------------------------------
    const COLOR_GRADING_BRIGHTNESS_MIN         = -1.0;                       // <-- Minimum brightness
    const COLOR_GRADING_BRIGHTNESS_MAX         = 1.0;                        // <-- Maximum brightness
    const COLOR_GRADING_CONTRAST_MIN           = 0.0;                        // <-- Minimum contrast
    const COLOR_GRADING_CONTRAST_MAX           = 2.0;                        // <-- Maximum contrast
    const COLOR_GRADING_SATURATION_MIN         = 0.0;                        // <-- Minimum saturation
    const COLOR_GRADING_SATURATION_MAX         = 2.0;                        // <-- Maximum saturation
    const COLOR_GRADING_VIBRANCE_MIN           = 0.0;                        // <-- Minimum vibrance
    const COLOR_GRADING_VIBRANCE_MAX           = 2.0;                        // <-- Maximum vibrance
    const COLOR_GRADING_TEMPERATURE_MIN        = 2000.0;                     // <-- Minimum temperature (warm)
    const COLOR_GRADING_TEMPERATURE_MAX        = 10000.0;                    // <-- Maximum temperature (cool)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Color Grading Effect Class
// -----------------------------------------------------------------------------

    // CLASS | ColorGradingEffect - Main effect controller
    // ------------------------------------------------------------
    class ColorGradingEffect {
        constructor(scene, camera) {
            this.scene = scene;                                              // <-- Babylon.js scene reference
            this.camera = camera;                                            // <-- Camera reference
            this.postProcess = null;                                         // <-- Post-process instance
            this.shaderLoaded = false;                                       // <-- Shader loading state
            
            // Effect parameters (can be adjusted in real-time)
            // ------------------------------------
            this.brightness = COLOR_GRADING_DEFAULT_BRIGHTNESS;              // <-- Brightness adjustment
            this.contrast = COLOR_GRADING_DEFAULT_CONTRAST;                  // <-- Contrast adjustment
            this.saturation = COLOR_GRADING_DEFAULT_SATURATION;              // <-- Saturation adjustment
            this.vibrance = COLOR_GRADING_DEFAULT_VIBRANCE;                  // <-- Vibrance adjustment
            this.colorTemperature = COLOR_GRADING_DEFAULT_TEMPERATURE;       // <-- Color temperature
        }
        
        // FUNCTION | Initialize Effect
        // ---------------------------------------------------------------
        async initialize() {
            try {
                await this.loadShader();                                     // <-- Load GLSL shader
                this.createPostProcess();                                    // <-- Create post-process effect
                console.log('✓ Color Grading Effect initialized successfully');
                return true;
            } catch (error) {
                console.error('✗ Failed to initialize Color Grading Effect:', error);
                return false;
            }
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Load GLSL Shader
        // ---------------------------------------------------------------
        async loadShader() {
            return new Promise((resolve, reject) => {
                const shaderPath = './src/Effects__PostProcessEffects/PostFx__ColorGradingEffect.glsl';
                
                fetch(shaderPath)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        return response.text();
                    })
                    .then(shaderCode => {
                        // Register shader with Babylon.js
                        // ------------------------------------
                        BABYLON.Effect.ShadersStore['colorGradingFragmentShader'] = shaderCode;
                        this.shaderLoaded = true;
                        console.log('✓ Color Grading shader loaded');
                        resolve();
                    })
                    .catch(error => {
                        console.error('✗ Failed to load Color Grading shader:', error);
                        reject(error);
                    });
            });
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Create Post-Process Effect
        // ---------------------------------------------------------------
        createPostProcess() {
            if (!this.shaderLoaded) {
                console.error('✗ Cannot create post-process: shader not loaded');
                return;
            }
            
            // Create post-process with custom shader
            // ------------------------------------
            this.postProcess = new BABYLON.PostProcess(
                'colorGrading',                                              // <-- Effect name
                'colorGrading',                                              // <-- Shader name
                [                                                            // <-- Uniforms
                    'brightness',
                    'contrast',
                    'saturation',
                    'vibrance',
                    'colorTemperature'
                ],
                [],                                                          // <-- No additional samplers (only textureSampler)
                COLOR_GRADING_POSTPROCESS_RESOLUTION,                        // <-- Sampling ratio
                this.camera,                                                 // <-- Attach to camera
                BABYLON.Texture.BILINEAR_SAMPLINGMODE,                       // <-- Sampling mode for filtering
                this.scene.getEngine(),                                      // <-- Engine reference
                false                                                        // <-- Reusable flag
            );
            
            // Set uniform values on each frame
            // ------------------------------------
            this.postProcess.onApply = (effect) => {
                effect.setFloat('brightness', this.brightness);              // <-- Set brightness
                effect.setFloat('contrast', this.contrast);                  // <-- Set contrast
                effect.setFloat('saturation', this.saturation);              // <-- Set saturation
                effect.setFloat('vibrance', this.vibrance);                  // <-- Set vibrance
                effect.setFloat('colorTemperature', this.colorTemperature);  // <-- Set color temperature
            };
            
            console.log('✓ Color Grading post-process created');
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Update Effect Parameters
        // ---------------------------------------------------------------
        updateParameters(params) {
            if (params.brightness !== undefined) {
                this.brightness = Math.max(COLOR_GRADING_BRIGHTNESS_MIN, 
                                          Math.min(params.brightness, COLOR_GRADING_BRIGHTNESS_MAX));  // <-- Clamp brightness
            }
            
            if (params.contrast !== undefined) {
                this.contrast = Math.max(COLOR_GRADING_CONTRAST_MIN, 
                                        Math.min(params.contrast, COLOR_GRADING_CONTRAST_MAX));  // <-- Clamp contrast
            }
            
            if (params.saturation !== undefined) {
                this.saturation = Math.max(COLOR_GRADING_SATURATION_MIN, 
                                          Math.min(params.saturation, COLOR_GRADING_SATURATION_MAX));  // <-- Clamp saturation
            }
            
            if (params.vibrance !== undefined) {
                this.vibrance = Math.max(COLOR_GRADING_VIBRANCE_MIN, 
                                        Math.min(params.vibrance, COLOR_GRADING_VIBRANCE_MAX));  // <-- Clamp vibrance
            }
            
            if (params.colorTemperature !== undefined) {
                this.colorTemperature = Math.max(COLOR_GRADING_TEMPERATURE_MIN, 
                                                Math.min(params.colorTemperature, COLOR_GRADING_TEMPERATURE_MAX));  // <-- Clamp temperature
            }
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Reset Parameters to Defaults
        // ---------------------------------------------------------------
        resetParameters() {
            this.brightness = COLOR_GRADING_DEFAULT_BRIGHTNESS;              // <-- Reset brightness
            this.contrast = COLOR_GRADING_DEFAULT_CONTRAST;                  // <-- Reset contrast
            this.saturation = COLOR_GRADING_DEFAULT_SATURATION;              // <-- Reset saturation
            this.vibrance = COLOR_GRADING_DEFAULT_VIBRANCE;                  // <-- Reset vibrance
            this.colorTemperature = COLOR_GRADING_DEFAULT_TEMPERATURE;       // <-- Reset temperature
            
            console.log('✓ Color Grading parameters reset to defaults');
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Get Current Parameters
        // ---------------------------------------------------------------
        getParameters() {
            return {
                brightness       : this.brightness,                          // <-- Current brightness
                contrast         : this.contrast,                            // <-- Current contrast
                saturation       : this.saturation,                          // <-- Current saturation
                vibrance         : this.vibrance,                            // <-- Current vibrance
                colorTemperature : this.colorTemperature                     // <-- Current temperature
            };
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Dispose Effect and Free Resources
        // ---------------------------------------------------------------
        dispose() {
            if (this.postProcess) {
                this.postProcess.dispose();                                  // <-- Dispose post-process
                this.postProcess = null;
            }
            
            console.log('✓ Color Grading Effect disposed');
        }
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Create and Initialize Color Grading Effect
    // ------------------------------------------------------------
    async function createColorGradingEffect(scene, camera, enabled = null) {
        console.log('>>> createColorGradingEffect CALLED with scene:', scene, 'camera:', camera);
        
        // #Region ------------------------------------------------
        // Effect Enabled Control
        // --------------------------------------------------------
        const effectEnabled = enabled !== null ? enabled : COLOR_GRADING_EFFECT_ENABLED;  // <-- Use passed enabled flag or default constant
        // #endregion ---------------------------------------------
        
        if (!effectEnabled) {                                                // <-- Check if effect is enabled
            console.log('⊘ Color Grading Effect disabled by configuration');
            return null;                                                     // <-- Return null if disabled
        }
        
        console.log('>>> Creating ColorGradingEffect instance...');
        const effect = new ColorGradingEffect(scene, camera);                // <-- Create effect instance
        
        console.log('>>> Initializing ColorGradingEffect...');
        const success = await effect.initialize();                           // <-- Initialize effect
        
        console.log('>>> ColorGradingEffect initialization result:', success);
        return success ? effect : null;                                      // <-- Return effect or null
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Export
// -----------------------------------------------------------------------------

    // Export createColorGradingEffect to global scope for HTML access
    // ------------------------------------------------------------
    window.createColorGradingEffect = createColorGradingEffect;             // <-- Export main function to global scope
    console.log('>>> window.createColorGradingEffect exported:', typeof window.createColorGradingEffect);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

console.log('>>> PostFx__ColorGradingEffect.js script loaded successfully');

