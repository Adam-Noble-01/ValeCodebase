// =============================================================================
// KUWAHARA PAINTERLY ABSTRACTION EFFECT
// =============================================================================
//
// FILE       : PostFx__KuwaharaEffect.js
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Kuwahara filter post-processing effect for painterly abstraction
// CREATED    : 2025
//
// DESCRIPTION:
// - Implements edge-preserving Kuwahara filter for watercolor-like abstraction
// - Analyzes four quadrants around each pixel to find most uniform region
// - Selects mean color from quadrant with lowest variance
// - Creates flat-color regions that simulate broad brush strokes
// - Configurable kernel radius (1-8 pixels) and blend intensity (0.0-1.0)
// - Radius controls abstraction level: higher = broader brush strokes
// - Intensity controls effect blend: 0.0 = original, 1.0 = full effect
// - Designed to be applied on top of paper overlay and bump effects
// - Uses dynamic GLSL loops for radius flexibility
//
// =============================================================================

console.error('!!! KUWAHARA SCRIPT IS LOADING !!!');
console.log('>>> PostFx__KuwaharaEffect.js script loading...');

// -----------------------------------------------------------------------------
// REGION | Kuwahara Effect Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Default Effect Settings
    // ------------------------------------------------------------
    const KUWAHARA_EFFECT_ENABLED              = true;                       // <-- Enable kuwahara effect
    const KUWAHARA_DEFAULT_RADIUS              = 8.0;                        // <-- Kernel radius in pixels (adjustable 1-8)
    const KUWAHARA_DEFAULT_INTENSITY           = 1.0;                       // <-- Effect blend intensity (0.0 to 1.0)
    const KUWAHARA_POSTPROCESS_RESOLUTION      = 1.0;                        // <-- Post-process resolution ratio (1.0 = full resolution)
    const KUWAHARA_MAX_RADIUS                  = 8.0;                        // <-- Maximum kernel radius (performance limit)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Kuwahara Effect Class
// -----------------------------------------------------------------------------

    // CLASS | KuwaharaEffect - Main effect controller
    // ------------------------------------------------------------
    class KuwaharaEffect {
        constructor(scene, camera) {
            this.scene = scene;                                              // <-- Babylon.js scene reference
            this.camera = camera;                                            // <-- Camera reference
            this.postProcess = null;                                         // <-- Post-process instance
            this.shaderLoaded = false;                                       // <-- Shader loading state
            
            // Effect parameters (can be adjusted in real-time)
            // ------------------------------------
            this.kuwaharaRadius = KUWAHARA_DEFAULT_RADIUS;                   // <-- Kernel radius in pixels
            this.kuwaharaIntensity = KUWAHARA_DEFAULT_INTENSITY;             // <-- Effect blend intensity
        }
        
        // FUNCTION | Initialize Effect
        // ---------------------------------------------------------------
        async initialize() {
            try {
                await this.loadShader();                                     // <-- Load GLSL shader
                this.createPostProcess();                                    // <-- Create post-process effect
                console.log('✓ Kuwahara Effect initialized successfully');
                return true;
            } catch (error) {
                console.error('✗ Failed to initialize Kuwahara Effect:', error);
                return false;
            }
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Load GLSL Shader
        // ---------------------------------------------------------------
        async loadShader() {
            return new Promise((resolve, reject) => {
                const shaderPath = './src/Effects__PostProcessEffects/PostFx__KuwaharaEffect.glsl';
                
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
                        BABYLON.Effect.ShadersStore['kuwaharaFragmentShader'] = shaderCode;
                        this.shaderLoaded = true;
                        console.log('✓ Kuwahara shader loaded');
                        resolve();
                    })
                    .catch(error => {
                        console.error('✗ Failed to load Kuwahara shader:', error);
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
                'kuwahara',                                                  // <-- Effect name
                'kuwahara',                                                  // <-- Shader name
                [                                                            // <-- Uniforms
                    'screenSize',
                    'kuwaharaRadius',
                    'kuwaharaIntensity'
                ],
                [],                                                          // <-- No additional samplers (only textureSampler)
                KUWAHARA_POSTPROCESS_RESOLUTION,                             // <-- Sampling ratio
                this.camera,                                                 // <-- Attach to camera
                BABYLON.Texture.BILINEAR_SAMPLINGMODE,                       // <-- Sampling mode for filtering
                this.scene.getEngine(),                                      // <-- Engine reference
                false                                                        // <-- Reusable flag
            );
            
            // Set uniform values on each frame
            // ------------------------------------
            this.postProcess.onApply = (effect) => {
                const engine = this.scene.getEngine();                       // <-- Get engine reference
                
                effect.setFloat2('screenSize',                               // <-- Set screen size as two floats
                    engine.getRenderWidth(),                                 // <-- Screen width
                    engine.getRenderHeight()                                 // <-- Screen height
                );
                effect.setFloat('kuwaharaRadius', this.kuwaharaRadius);      // <-- Set kernel radius
                effect.setFloat('kuwaharaIntensity', this.kuwaharaIntensity); // <-- Set effect intensity
            };
            
            console.log('✓ Kuwahara post-process created');
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Update Effect Parameters
        // ---------------------------------------------------------------
        updateParameters(radius, intensity) {
            if (radius !== undefined) {
                this.kuwaharaRadius = Math.max(1.0, Math.min(radius, KUWAHARA_MAX_RADIUS));  // <-- Clamp radius between 1-8 pixels
            }
            
            if (intensity !== undefined) {
                this.kuwaharaIntensity = Math.max(0.0, Math.min(intensity, 1.0));  // <-- Clamp intensity between 0-1
            }
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Dispose Effect and Free Resources
        // ---------------------------------------------------------------
        dispose() {
            if (this.postProcess) {
                this.postProcess.dispose();                                  // <-- Dispose post-process
                this.postProcess = null;
            }
            
            console.log('✓ Kuwahara Effect disposed');
        }
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Create and Initialize Kuwahara Effect
    // ------------------------------------------------------------
    async function createKuwaharaEffect(scene, camera, enabled = null) {
        console.log('>>> createKuwaharaEffect CALLED with scene:', scene, 'camera:', camera);
        
        // #Region ------------------------------------------------
        // Effect Enabled Control
        // --------------------------------------------------------
        const effectEnabled = enabled !== null ? enabled : KUWAHARA_EFFECT_ENABLED;  // <-- Use passed enabled flag or default constant
        // #endregion ---------------------------------------------
        
        if (!effectEnabled) {                                                // <-- Check if effect is enabled
            console.log('⊘ Kuwahara Effect disabled by configuration');
            return null;                                                     // <-- Return null if disabled
        }
        
        console.log('>>> Creating KuwaharaEffect instance...');
        const effect = new KuwaharaEffect(scene, camera);                    // <-- Create effect instance
        
        console.log('>>> Initializing KuwaharaEffect...');
        const success = await effect.initialize();                           // <-- Initialize effect
        
        console.log('>>> KuwaharaEffect initialization result:', success);
        return success ? effect : null;                                      // <-- Return effect or null
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Export
// -----------------------------------------------------------------------------

    // Export createKuwaharaEffect to global scope for HTML access
    // ------------------------------------------------------------
    window.createKuwaharaEffect = createKuwaharaEffect;                     // <-- Export main function to global scope
    console.log('>>> window.createKuwaharaEffect exported:', typeof window.createKuwaharaEffect);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

console.log('>>> PostFx__KuwaharaEffect.js script loaded successfully');
