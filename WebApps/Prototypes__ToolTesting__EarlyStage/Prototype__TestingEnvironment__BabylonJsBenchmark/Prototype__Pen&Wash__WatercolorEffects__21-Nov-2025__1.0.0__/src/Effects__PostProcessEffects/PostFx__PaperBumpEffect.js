// =============================================================================
// PAPER BUMP DISPLACEMENT EFFECT
// =============================================================================
//
// FILE       : PostFx__PaperBumpEffect.js
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Paper texture bump/displacement post-processing effect
// CREATED    : 2025
//
// DESCRIPTION:
// - Creates physical displacement effect using paper texture as bump map
// - Distorts the image based on paper texture height variations
// - Stronger effect on saturated (colored) areas, minimal on white areas
// - Distance-based bump strength increases as camera approaches objects
// - Prevents effect from disappearing at close range
// - Stacks with PaperOverlayEffect for layered paper texture simulation
// - Implements parallax offset for depth-based paper movement
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Paper Bump Effect Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Default Effect Settings
    // ------------------------------------------------------------
    const BUMP_EFFECT_ENABLED           = true;                              // <-- Enable bump effect
    const DEFAULT_BUMP_STRENGTH         = 0.008;                              // <-- Overall displacement strength
    const DEFAULT_BUMP_STRENGTH_MIN     = 0.0;                               // <-- Minimum bump on white areas
    const DEFAULT_BUMP_STRENGTH_MAX     = 1.0;                               // <-- Maximum bump on colored areas
    const DEFAULT_PAPER_SCALE           = 0.8;                               // <-- Paper texture tiling scale
    const DEFAULT_SATURATION_MULTIPLIER = 3.0;                               // <-- Saturation sensitivity
    const DEFAULT_PARALLAX_STRENGTH     = 0.0001;                            // <-- Parallax offset strength
    const DEFAULT_DISTANCE_STRENGTH_MIN = 0.5;                               // <-- Minimum bump at far distance (50% effect)
    const DEFAULT_DISTANCE_STRENGTH_MAX = 4.0;                               // <-- Maximum bump at near distance (300% effect)
    const DEFAULT_DISTANCE_FALLOFF      = 3.0;                               // <-- Distance falloff curve power (higher = sharper falloff)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Paper Bump Effect Class
// -----------------------------------------------------------------------------

    // CLASS | PaperBumpEffect - Main effect controller
    // ------------------------------------------------------------
    class PaperBumpEffect {
        constructor(scene, camera, paperTexturePath) {
            this.scene = scene;                                              // <-- Babylon.js scene reference
            this.camera = camera;                                            // <-- Camera reference for parallax
            this.paperTexturePath = paperTexturePath;                        // <-- Path to paper texture
            this.postProcess = null;                                         // <-- Post-process instance
            this.paperTexture = null;                                        // <-- Paper texture object
            this.shaderLoaded = false;                                       // <-- Shader loading state
            
            // Effect parameters (can be adjusted in real-time)
            // ------------------------------------
            this.bumpStrength = DEFAULT_BUMP_STRENGTH;                       // <-- Overall displacement strength
            this.bumpStrengthMin = DEFAULT_BUMP_STRENGTH_MIN;                // <-- Minimum bump strength
            this.bumpStrengthMax = DEFAULT_BUMP_STRENGTH_MAX;                // <-- Maximum bump strength
            this.paperScale = DEFAULT_PAPER_SCALE;                           // <-- Paper tiling scale
            this.saturationMultiplier = DEFAULT_SATURATION_MULTIPLIER;       // <-- Saturation sensitivity
            this.parallaxStrength = DEFAULT_PARALLAX_STRENGTH;               // <-- Camera parallax strength
            this.distanceStrengthMin = DEFAULT_DISTANCE_STRENGTH_MIN;        // <-- Minimum bump at far distance
            this.distanceStrengthMax = DEFAULT_DISTANCE_STRENGTH_MAX;        // <-- Maximum bump at near distance
            this.distanceFalloffPower = DEFAULT_DISTANCE_FALLOFF;            // <-- Distance falloff curve power
            
            // Parallax tracking
            // ------------------------------------
            this.lastCameraPosition = this.camera.position.clone();          // <-- Track camera movement
            this.cameraOffset = { x: 0, y: 0 };                              // <-- Accumulated offset
        }
        
        // FUNCTION | Initialize Effect
        // ---------------------------------------------------------------
        async initialize() {
            try {
                await this.loadPaperTexture();                               // <-- Load paper texture
                await this.loadShader();                                     // <-- Load GLSL shader
                this.createPostProcess();                                    // <-- Create post-process effect
                console.log('✓ Paper Bump Effect initialized successfully');
                return true;
            } catch (error) {
                console.error('✗ Failed to initialize Paper Bump Effect:', error);
                return false;
            }
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Load Paper Texture
        // ---------------------------------------------------------------
        async loadPaperTexture() {
            return new Promise((resolve, reject) => {
                this.paperTexture = new BABYLON.Texture(
                    this.paperTexturePath,
                    this.scene,
                    false,                                                   // <-- No mipmaps
                    false,                                                   // <-- Don't invert Y
                    BABYLON.Texture.TRILINEAR_SAMPLINGMODE,                  // <-- Trilinear filtering
                    () => {
                        console.log('✓ Paper texture loaded for bump effect');
                        
                        // Set texture wrapping mode
                        // ------------------------------------
                        this.paperTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;  // <-- Wrap U
                        this.paperTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;  // <-- Wrap V
                        
                        resolve();
                    },
                    (message, exception) => {
                        console.error('✗ Failed to load paper texture:', message);
                        reject(exception || message);
                    }
                );
            });
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Load GLSL Shader
        // ---------------------------------------------------------------
        async loadShader() {
            return new Promise((resolve, reject) => {
                const shaderPath = './src/Effects__PostProcessEffects/PostFx__PaperBumpEffect.glsl';
                
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
                        BABYLON.Effect.ShadersStore['paperBumpFragmentShader'] = shaderCode;
                        this.shaderLoaded = true;
                        console.log('✓ Paper Bump shader loaded');
                        resolve();
                    })
                    .catch(error => {
                        console.error('✗ Failed to load Paper Bump shader:', error);
                        reject(error);
                    });
            });
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Create Post-Process Effect
        // ---------------------------------------------------------------
        createPostProcess() {
            if (!this.shaderLoaded || !this.paperTexture) {
                console.error('✗ Cannot create post-process: shader or texture not loaded');
                return;
            }
            
            // Enable depth texture rendering
            // ------------------------------------
            const depthRenderer = this.scene.enableDepthRenderer(this.camera);  // <-- Enable depth rendering for camera
            
            // Create post-process with custom shader
            // ------------------------------------
            this.postProcess = new BABYLON.PostProcess(
                'paperBump',                                                 // <-- Effect name
                'paperBump',                                                 // <-- Shader name
                [                                                            // <-- Uniforms
                    'screenSize',
                    'bumpStrength',
                    'cameraOffset',
                    'paperScale',
                    'saturationMultiplier',
                    'bumpStrengthMin',
                    'bumpStrengthMax',
                    'cameraNear',
                    'cameraFar',
                    'distanceStrengthMin',
                    'distanceStrengthMax',
                    'distanceFalloffPower'
                ],
                ['paperSampler', 'depthSampler'],                            // <-- Samplers (including depth)
                1.0,                                                         // <-- Sampling ratio
                this.camera                                                  // <-- Attach to camera
            );
            
            // Set uniform values on each frame
            // ------------------------------------
            this.postProcess.onApply = (effect) => {
                this.updateParallaxOffset();                                 // <-- Update camera offset
                
                const depthRenderer = this.scene.enableDepthRenderer(this.camera);  // <-- Get depth renderer
                
                effect.setVector2('screenSize', new BABYLON.Vector2(
                    this.scene.getEngine().getRenderWidth(),
                    this.scene.getEngine().getRenderHeight()
                ));
                effect.setFloat('bumpStrength', this.bumpStrength);
                effect.setFloat('bumpStrengthMin', this.bumpStrengthMin);
                effect.setFloat('bumpStrengthMax', this.bumpStrengthMax);
                effect.setVector2('cameraOffset', new BABYLON.Vector2(
                    this.cameraOffset.x,
                    this.cameraOffset.y
                ));
                effect.setFloat('paperScale', this.paperScale);
                effect.setFloat('saturationMultiplier', this.saturationMultiplier);
                effect.setFloat('cameraNear', this.camera.minZ);
                effect.setFloat('cameraFar', this.camera.maxZ);
                effect.setFloat('distanceStrengthMin', this.distanceStrengthMin);
                effect.setFloat('distanceStrengthMax', this.distanceStrengthMax);
                effect.setFloat('distanceFalloffPower', this.distanceFalloffPower);
                effect.setTexture('paperSampler', this.paperTexture);
                effect.setTexture('depthSampler', depthRenderer.getDepthMap());  // <-- Set depth texture
            };
            
            console.log('✓ Paper Bump post-process created');
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Update Parallax Offset Based on Camera Movement
        // ---------------------------------------------------------------
        updateParallaxOffset() {
            const currentPosition = this.camera.position;
            const deltaX = currentPosition.x - this.lastCameraPosition.x;   // <-- Calculate X movement
            const deltaZ = currentPosition.z - this.lastCameraPosition.z;   // <-- Calculate Z movement
            
            // Accumulate offset (Y uses Z for depth parallax)
            // ------------------------------------
            this.cameraOffset.x += deltaX * this.parallaxStrength;           // <-- Horizontal parallax
            this.cameraOffset.y += deltaZ * this.parallaxStrength;           // <-- Depth parallax
            
            this.lastCameraPosition = currentPosition.clone();               // <-- Update last position
        }
        // ---------------------------------------------------------------
        
        // FUNCTION | Dispose Effect and Free Resources
        // ---------------------------------------------------------------
        dispose() {
            if (this.postProcess) {
                this.postProcess.dispose();                                  // <-- Dispose post-process
                this.postProcess = null;
            }
            
            if (this.paperTexture) {
                this.paperTexture.dispose();                                 // <-- Dispose texture
                this.paperTexture = null;
            }
            
            console.log('✓ Paper Bump Effect disposed');
        }
        // ---------------------------------------------------------------
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Create and Initialize Paper Bump Effect
    // ------------------------------------------------------------
    async function createPaperBumpEffect(scene, camera, paperTexturePath) {
        if (!BUMP_EFFECT_ENABLED) {                                          // <-- Check if effect is enabled
            console.log('⊘ Paper Bump Effect disabled by configuration');
            return null;                                                     // <-- Return null if disabled
        }
        
        const effect = new PaperBumpEffect(scene, camera, paperTexturePath);  // <-- Create effect instance
        const success = await effect.initialize();                           // <-- Initialize effect
        return success ? effect : null;                                      // <-- Return effect or null
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

