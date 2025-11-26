// =============================================================================
// PEN & WASH WATERCOLOR EFFECTS - PAPER OVERLAY POST-PROCESS
// =============================================================================
//
// FILE       : PostFx__PaperOverlayEffect.js
// NAMESPACE  : PenWashWatercolorEffects
// MODULE     : Paper Overlay Post-Process Effect
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Screen-space paper texture overlay using multiply blend mode
// CREATED    : 2025
//
// DESCRIPTION:
// - Custom post-process effect that applies paper texture overlay to rendered scene
// - Uses screen-space texturing (not UV-mapped) to maintain static paper grain
// - Implements multiply blend mode for realistic paper substrate interaction
// - Handles aspect ratio correction to prevent texture stretching
// - Parallax effect creates subtle depth by shifting paper based on camera movement
// - Luminance-based masking: stronger effect on dark/colored areas (3D models), weaker on bright backgrounds
// - Loads paper texture from assets/Test__PaperOverlay__.jpg
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Configuration Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Paper Texture Configuration
    // ------------------------------------------------------------
    const OVERLAY_EFFECT_ENABLED           = true;                                               // <-- Enable/disable paper overlay effect
    const PAPER_TEXTURE_PATH               = 'assets/Test__PaperOverlay__.jpg';                  // <-- Path to paper texture image
    const POSTPROCESS_RESOLUTION_RATIO     = 1.0;                                                // <-- Post-process resolution ratio (1.0 = full resolution)
    const PAPER_INTENSITY                  = 1.0;                                                // <-- Paper overlay intensity (0.0 to 1.0)
    const ASPECT_RATIO_CORRECTION_ENABLED  = true;                                               // <-- Enable aspect ratio correction
    // ------------------------------------------------------------
    
    // MODULE CONSTANTS | Luminance-Based Masking Configuration
    // ------------------------------------------------------------
    const PAPER_INTENSITY_MIN              = 0.25;                                               // <-- Paper intensity on bright areas (white background)
    const PAPER_INTENSITY_MAX              = 1.0;                                                // <-- Paper intensity on dark areas (3D models)
    const LUMINANCE_THRESHOLD              = 0.85;                                               // <-- Brightness threshold (0.0-1.0, higher = more selective)
    const LUMINANCE_CONTRAST               = 2.5;                                                // <-- Mask contrast (higher = sharper transition)
    // ------------------------------------------------------------
    
    // MODULE CONSTANTS | Parallax Effect Configuration
    // ------------------------------------------------------------
    const PARALLAX_EFFECT_ENABLED          = true;                                               // <-- Enable parallax effect for depth perception
    const PARALLAX_SCALE_X                 = 0.02;                                               // <-- Horizontal parallax scale (controls side-to-side shift)
    const PARALLAX_SCALE_Y                 = 0.01;                                               // <-- Vertical parallax scale (controls up-down shift)
    const PAPER_TEXTURE_SCALE              = 1.5;                                                // <-- Paper texture tiling scale (higher = more detail/smaller grain)
    // ------------------------------------------------------------
    
    // MODULE CONSTANTS | Shader File Path
    // ------------------------------------------------------------
    const SHADER_FILE_PATH                 = 'src/Effects__PostProcessEffects/PostFx__PaperOverlayEffect.glsl';  // <-- Path to GLSL shader file
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shader Loading and Registration
// -----------------------------------------------------------------------------

    // FUNCTION | Load Shader from GLSL File
    // ------------------------------------------------------------
    async function loadPaperOverlayShader() {
        try {
            const response = await fetch(SHADER_FILE_PATH);                                      // <-- Fetch shader file
            
            if (!response.ok) {
                throw new Error(`Failed to load shader: ${response.statusText}`);               // <-- Handle fetch error
            }
            
            const shaderText = await response.text();                                            // <-- Get shader text content
            return shaderText;                                                                   // <-- Return shader text
            
        } catch (error) {
            console.error('Error loading paper overlay shader:', error);                         // <-- Log error
            throw error;                                                                         // <-- Re-throw error
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Register Shader with Babylon.js Shader Store
    // ------------------------------------------------------------
    function registerPaperOverlayShader(shaderText) {
        BABYLON.Effect.ShadersStore['paperOverlayFragmentShader'] = shaderText;                 // <-- Register fragment shader with shader store
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Texture Loading
// -----------------------------------------------------------------------------

    // FUNCTION | Load Paper Texture - Loads paper texture from file path
    // ------------------------------------------------------------
    function loadPaperTexture(scene, texturePath) {
        return new Promise((resolve, reject) => {
            const texture = new BABYLON.Texture(                                                  // <-- Create Babylon.js texture
                texturePath,                                                                       // <-- Texture file path
                scene,                                                                            // <-- Parent scene
                false,                                                                            // <-- noMipmap (false = use mipmaps)
                false,                                                                            // <-- invertY (false = don't invert)
                undefined,                                                                        // <-- samplingMode (undefined = default)
                () => resolve(texture),                                                           // <-- onLoad callback
                (message) => reject(new Error(message || 'Failed to load paper texture'))         // <-- onError callback
            );
            
            // Configure texture wrapping for screen-space tiling
            // ------------------------------------
            texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;                                     // <-- Wrap texture horizontally (repeat)
            texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;                                     // <-- Wrap texture vertically (repeat)
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Post-Process Creation
// -----------------------------------------------------------------------------

    // FUNCTION | Create Paper Overlay Post-Process - Creates custom post-process with paper overlay effect
    // ------------------------------------------------------------
    function createPaperOverlayPostProcess(scene, camera, engine, paperTexture) {
        // Create custom post-process
        // ------------------------------------
        const postProcess = new BABYLON.PostProcess(                                              // <-- Create custom post-process
            'paperOverlayEffect',                                                                 // <-- Post-process name
            'paperOverlay',                                                                       // <-- Shader name (Babylon appends 'FragmentShader')
            ['screenSize', 'paperIntensity', 'cameraOffset', 'paperScale', 'paperIntensityMin', 'paperIntensityMax', 'luminanceThreshold', 'luminanceContrast'],  // <-- Uniform names (textureSampler is automatic)
            ['paperSampler'],                                                                     // <-- Texture samplers
            POSTPROCESS_RESOLUTION_RATIO,                                                         // <-- Resolution ratio
            camera,                                                                               // <-- Target camera
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,                                                // <-- Sampling mode for filtering
            engine,                                                                               // <-- Engine reference
            false                                                                                 // <-- Reusable flag
        );
        
        // Store camera offset for parallax (shared between onApply and update function)
        // ------------------------------------
        const cameraOffset = { x: 0.0, y: 0.0 };                                                 // <-- Store camera offset values
        
        // Set uniforms on each frame
        // ------------------------------------
        postProcess.onApply = (effect) => {                                                        // <-- Set up effect uniforms
            effect.setTexture('paperSampler', paperTexture);                                       // <-- Set paper texture sampler
            
            const screenWidth = engine.getRenderWidth();                                           // <-- Get screen width
            const screenHeight = engine.getRenderHeight();                                        // <-- Get screen height
            effect.setFloat2('screenSize', screenWidth, screenHeight);                            // <-- Set screen size uniform
            
            effect.setFloat('paperIntensity', PAPER_INTENSITY);                                    // <-- Set paper intensity
            effect.setFloat('paperScale', PAPER_TEXTURE_SCALE);                                    // <-- Set paper texture scale
            
            effect.setFloat('paperIntensityMin', PAPER_INTENSITY_MIN);                             // <-- Set minimum intensity (bright areas)
            effect.setFloat('paperIntensityMax', PAPER_INTENSITY_MAX);                              // <-- Set maximum intensity (dark areas)
            effect.setFloat('luminanceThreshold', LUMINANCE_THRESHOLD);                            // <-- Set luminance threshold
            effect.setFloat('luminanceContrast', LUMINANCE_CONTRAST);                               // <-- Set luminance contrast
            
            effect.setFloat2('cameraOffset', cameraOffset.x, cameraOffset.y);                     // <-- Set camera offset from stored values
        };
        
        // Store camera offset reference for parallax updates
        // ------------------------------------
        postProcess._cameraOffset = cameraOffset;                                                 // <-- Store offset reference for parallax updates
        
        return postProcess;                                                                       // <-- Return post-process instance
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Parallax Effect Support
// -----------------------------------------------------------------------------

    // FUNCTION | Setup Parallax Tracking - Tracks camera movement for parallax effect
    // ------------------------------------------------------------
    function setupParallaxTracking(camera, postProcess) {
        if (!PARALLAX_EFFECT_ENABLED) {                                                           // <-- Check if parallax is enabled
            return null;                                                                          // <-- Return null if disabled
        }
        
        if (!postProcess._cameraOffset) {                                                          // <-- Check if camera offset reference exists
            return null;                                                                          // <-- Return null if missing
        }
        
        // Store initial camera position for offset calculation
        // ------------------------------------
        const initialCameraPosition = camera.position.clone();                                     // <-- Store initial camera position
        
        // Update parallax offset on each frame
        // ------------------------------------
        const updateParallax = () => {                                                            // <-- Create update function
            const currentPosition = camera.position;                                               // <-- Get current camera position
            
            // Calculate total offset from initial position
            // ------------------------------------
            const totalOffsetX = (currentPosition.x - initialCameraPosition.x) * PARALLAX_SCALE_X;  // <-- Calculate X offset with scale
            const totalOffsetY = (currentPosition.y - initialCameraPosition.y) * PARALLAX_SCALE_Y;  // <-- Calculate Y offset with scale
            
            // Update camera offset values (will be used in onApply callback)
            // ------------------------------------
            postProcess._cameraOffset.x = totalOffsetX;                                           // <-- Update X offset
            postProcess._cameraOffset.y = totalOffsetY;                                           // <-- Update Y offset (using Y for vertical movement)
        };
        
        return updateParallax;                                                                    // <-- Return update function
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Integration Function
// -----------------------------------------------------------------------------

    // FUNCTION | Setup Paper Overlay Effect - Main function to setup paper overlay post-process
    // ------------------------------------------------------------
    async function setupPaperOverlayEffect(scene, camera, engine) {
        if (!OVERLAY_EFFECT_ENABLED) {                                                           // <-- Check if effect is enabled
            console.log('⊘ Paper Overlay Effect disabled by configuration');
            return null;                                                                         // <-- Return null if disabled
        }
        
        try {
            // Load shader from GLSL file
            // ------------------------------------
            const shaderText = await loadPaperOverlayShader();                                    // <-- Load shader from .glsl file
            
            // Register shader with Babylon.js shader store
            // ------------------------------------
            registerPaperOverlayShader(shaderText);                                               // <-- Register fragment shader
            
            // Load paper texture
            // ------------------------------------
            const paperTexture = await loadPaperTexture(scene, PAPER_TEXTURE_PATH);               // <-- Load paper texture
            
            // Create post-process
            // ------------------------------------
            const postProcess = createPaperOverlayPostProcess(                                    // <-- Create post-process
                scene,                                                                            // <-- Parent scene
                camera,                                                                           // <-- Target camera
                engine,                                                                           // <-- Babylon engine
                paperTexture                                                                      // <-- Paper texture
            );
            
            // Setup parallax tracking if enabled
            // ------------------------------------
            let parallaxUpdate = null;                                                            // <-- Initialize parallax update function
            if (PARALLAX_EFFECT_ENABLED) {
                parallaxUpdate = setupParallaxTracking(camera, postProcess);                      // <-- Setup parallax tracking
                
                // Register parallax update to scene's beforeRender
                // ------------------------------------
                if (parallaxUpdate) {
                    scene.registerBeforeRender(() => {                                             // <-- Register before render callback
                        parallaxUpdate();                                                         // <-- Update parallax offset
                    });
                }
            }
            
            return {                                                                              // <-- Return post-process and related objects
                postProcess: postProcess,                                                          // <-- Post-process instance
                paperTexture: paperTexture,                                                       // <-- Paper texture reference
                parallaxUpdate: parallaxUpdate                                                    // <-- Parallax update function
            };
            
        } catch (error) {
            console.error('Failed to setup paper overlay post-process effect:', error);            // <-- Log error
            throw error;                                                                          // <-- Re-throw error
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Export
// -----------------------------------------------------------------------------

    // Export setupPaperOverlayEffect to global scope for HTML access
    // ------------------------------------------------------------
    window.setupPaperOverlayEffect = setupPaperOverlayEffect;                                   // <-- Export main function to global scope
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
