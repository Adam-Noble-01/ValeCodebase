// =============================================================================
// PEN & WASH WATERCOLOR EFFECTS - PENCIL LINE POST-PROCESS
// =============================================================================
//
// FILE       : PostFx__PencilLineEffect.js
// NAMESPACE  : PenWashWatercolorEffects
// MODULE     : Pencil Line Post-Process Effect
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Wavy hand-drawn pencil line effect with organic edge detection
// CREATED    : 2025
//
// DESCRIPTION:
// - Custom post-process effect that creates wavy pencil-like line rendering
// - Implements edge detection with organic wave distortion for hand-drawn appearance
// - Uses multi-octave noise for natural pencil wobble and texture variation
// - Adjustable wave frequency and amplitude for different artistic styles
// - Variable line thickness based on edge strength for expressive linework
// - Time-based animation for subtle organic movement (optional)
// - Multiple edge sampling passes for richer pencil texture
//
// TUNING GUIDE:
// - WAVE_FREQUENCY (10-200): Controls how many waves/wobbles per screen
//   Low (10-50): Gentle curves | High (100-200): Tight sketchy wobbles
// - WAVE_AMPLITUDE (0.5-5.0): Controls strength of wave distortion
//   Low (0.5-1.5): Subtle wobble | High (2.0-5.0): Strong hand-drawn effect
// - NOISE_SCALE (20-150): Controls detail level of organic texture
//   Low (20-50): Smooth variation | High (80-150): Fine pencil texture
// - ANIMATION_SPEED (0.0-1.0): Controls line movement speed
//   0.0: Static lines | 0.5: Medium animation | 1.0: Fast jittery
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Configuration Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Pencil Line Effect Configuration
    // ------------------------------------------------------------
    const PENCIL_LINE_EFFECT_ENABLED              = true;                                         // <-- Enable/disable pencil line effect
    const PENCIL_LINE_POSTPROCESS_RESOLUTION      = 5.0;                                          // <-- Post-process resolution ratio (1.0 = full resolution)
    // ------------------------------------------------------------
    
    // MODULE CONSTANTS | Wave Distortion Settings
    // ------------------------------------------------------------
    const PENCIL_LINE_WAVE_FREQUENCY              = 10.0;                                        // <-- Wave frequency (higher = more waves, range: 10-200)
    const PENCIL_LINE_WAVE_AMPLITUDE              = 0.25;                                          // <-- Wave amplitude (higher = more wobble, range: 0.5-5.0)
    const PENCIL_LINE_NOISE_SCALE                 = 0.3;                                         // <-- Noise texture scale (higher = finer detail, range: 20-150)
    const PENCIL_LINE_ANIMATION_SPEED             = 0;                                         // <-- Animation speed multiplier (0.0 = static, range: 0.0-1.0)
    // ------------------------------------------------------------
    
    // MODULE CONSTANTS | Edge Detection Settings
    // ------------------------------------------------------------
    const PENCIL_LINE_EDGE_THRESHOLD              = 0.010;                                        // <-- Edge detection threshold (0.01-0.1: lower = more edges)
    const PENCIL_LINE_EDGE_INTENSITY              = 0.25;                                         // <-- Edge line darkness (0.3-1.0: higher = darker lines)
    const PENCIL_LINE_EDGE_THICKNESS_MIN          = 0.1;                                          // <-- Minimum edge thickness in pixels (0.5-2.0)
    const PENCIL_LINE_EDGE_THICKNESS_MAX          = 0.7;                                          // <-- Maximum edge thickness in pixels (1.0-4.0)
    // ------------------------------------------------------------
    
    // MODULE CONSTANTS | Multi-Pass Edge Enhancement
    // ------------------------------------------------------------
    const PENCIL_LINE_MULTI_PASS_ENABLED          = true;                                         // <-- Enable multiple edge detection passes
    const PENCIL_LINE_SECOND_PASS_OFFSET          = 1.5;                                          // <-- Second pass offset multiplier
    const PENCIL_LINE_SECOND_PASS_INTENSITY       = 0.10;                                          // <-- Second pass intensity
    const PENCIL_LINE_SECOND_PASS_PHASE_OFFSET    = 2.356;                                        // <-- Second pass phase angle offset in radians (2.356 ≈ 135°)
    const PENCIL_LINE_SECOND_PASS_TIME_OFFSET     = 3.14;                                         // <-- Second pass time offset for animation variation
    // ------------------------------------------------------------
    
    // MODULE CONSTANTS | Shader File Path
    // ------------------------------------------------------------
    const PENCIL_LINE_SHADER_PATH                 = 'src/Effects__PostProcessEffects/PostFx__PencilLineEffect.glsl';  // <-- Path to GLSL shader file
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shader Loading and Registration
// -----------------------------------------------------------------------------

    // FUNCTION | Load Shader from GLSL File
    // ------------------------------------------------------------
    async function loadPencilLineShader() {
        try {
            const response = await fetch(PENCIL_LINE_SHADER_PATH);                                 // <-- Fetch shader file
            
            if (!response.ok) {
                throw new Error(`Failed to load shader: ${response.statusText}`);                 // <-- Handle fetch error
            }
            
            const shaderText = await response.text();                                              // <-- Get shader text content
            return shaderText;                                                                     // <-- Return shader text
            
        } catch (error) {
            console.error('Error loading pencil line shader:', error);                            // <-- Log error
            throw error;                                                                           // <-- Re-throw error
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Register Shader with Babylon.js Shader Store
    // ------------------------------------------------------------
    function registerPencilLineShader(shaderText) {
        BABYLON.Effect.ShadersStore['pencilLineFragmentShader'] = shaderText;                    // <-- Register fragment shader with shader store
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Post-Process Creation
// -----------------------------------------------------------------------------

    // FUNCTION | Create Pencil Line Post-Process - Creates custom post-process with wavy pencil line effect
    // ------------------------------------------------------------
    function createPencilLinePostProcess(scene, camera, engine) {
        // Create custom post-process
        // ------------------------------------
        const postProcess = new BABYLON.PostProcess(                                              // <-- Create custom post-process
            'pencilLineEffect',                                                                    // <-- Post-process name
            'pencilLine',                                                                          // <-- Shader name (Babylon appends 'FragmentShader')
            ['screenSize', 'time', 'waveFrequency', 'waveAmplitude', 'noiseScale', 'edgeThreshold', 'edgeIntensity', 'edgeThicknessMin', 'edgeThicknessMax', 'multiPassEnabled', 'secondPassOffset', 'secondPassIntensity', 'secondPassPhaseOffset', 'secondPassTimeOffset'],  // <-- Uniform names
            [],                                                                                    // <-- Texture samplers (none needed)
            PENCIL_LINE_POSTPROCESS_RESOLUTION,                                                   // <-- Resolution ratio
            camera,                                                                                // <-- Target camera
            BABYLON.Texture.BILINEAR_SAMPLINGMODE,                                                // <-- Sampling mode for filtering
            engine,                                                                                // <-- Engine reference
            false                                                                                  // <-- Reusable flag
        );
        
        // Initialize time counter for animation
        // ------------------------------------
        let currentTime = 0.0;                                                                     // <-- Time counter for wave animation
        
        // Set uniforms on each frame
        // ------------------------------------
        postProcess.onApply = (effect) => {                                                        // <-- Set up effect uniforms
            const screenWidth = engine.getRenderWidth();                                           // <-- Get screen width
            const screenHeight = engine.getRenderHeight();                                         // <-- Get screen height
            effect.setFloat2('screenSize', screenWidth, screenHeight);                            // <-- Set screen size uniform
            
            // Update time for animation
            // ------------------------------------
            currentTime += engine.getDeltaTime() * 0.001 * PENCIL_LINE_ANIMATION_SPEED;          // <-- Increment time (convert ms to seconds)
            effect.setFloat('time', currentTime);                                                  // <-- Set time uniform for animation
            
            // Wave distortion parameters
            // ------------------------------------
            effect.setFloat('waveFrequency', PENCIL_LINE_WAVE_FREQUENCY);                         // <-- Set wave frequency
            effect.setFloat('waveAmplitude', PENCIL_LINE_WAVE_AMPLITUDE);                         // <-- Set wave amplitude
            effect.setFloat('noiseScale', PENCIL_LINE_NOISE_SCALE);                               // <-- Set noise scale
            
            // Edge detection parameters
            // ------------------------------------
            effect.setFloat('edgeThreshold', PENCIL_LINE_EDGE_THRESHOLD);                         // <-- Set edge detection threshold
            effect.setFloat('edgeIntensity', PENCIL_LINE_EDGE_INTENSITY);                         // <-- Set edge line darkness
            effect.setFloat('edgeThicknessMin', PENCIL_LINE_EDGE_THICKNESS_MIN);                  // <-- Set minimum edge thickness
            effect.setFloat('edgeThicknessMax', PENCIL_LINE_EDGE_THICKNESS_MAX);                  // <-- Set maximum edge thickness
            
            // Multi-pass parameters
            // ------------------------------------
            effect.setFloat('multiPassEnabled', PENCIL_LINE_MULTI_PASS_ENABLED ? 1.0 : 0.0);     // <-- Enable/disable multi-pass
            effect.setFloat('secondPassOffset', PENCIL_LINE_SECOND_PASS_OFFSET);                  // <-- Second pass offset
            effect.setFloat('secondPassIntensity', PENCIL_LINE_SECOND_PASS_INTENSITY);            // <-- Second pass intensity
            effect.setFloat('secondPassPhaseOffset', PENCIL_LINE_SECOND_PASS_PHASE_OFFSET);       // <-- Second pass phase angle offset
            effect.setFloat('secondPassTimeOffset', PENCIL_LINE_SECOND_PASS_TIME_OFFSET);         // <-- Second pass time offset
        };
        
        return postProcess;                                                                       // <-- Return post-process instance
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Integration Function
// -----------------------------------------------------------------------------

    // FUNCTION | Setup Pencil Line Effect - Main function to setup pencil line post-process
    // ------------------------------------------------------------
    async function setupPencilLineEffect(scene, camera, engine, enabled = null) {
        // Effect Enabled Control
        // ------------------------------------
        const effectEnabled = PENCIL_LINE_EFFECT_ENABLED && (enabled !== null ? enabled : true);  // <-- Check constant first, then use passed flag or default to true
        
        if (!effectEnabled) {                                                                    // <-- Check if effect is enabled
            console.log('⊘ Pencil Line Effect disabled by configuration');
            return null;                                                                           // <-- Return null if disabled
        }
        
        try {
            // Load shader from GLSL file
            // ------------------------------------
            const shaderText = await loadPencilLineShader();                                      // <-- Load shader from .glsl file
            
            // Register shader with Babylon.js shader store
            // ------------------------------------
            registerPencilLineShader(shaderText);                                                 // <-- Register fragment shader
            
            // Create post-process
            // ------------------------------------
            const postProcess = createPencilLinePostProcess(                                      // <-- Create post-process
                scene,                                                                            // <-- Parent scene
                camera,                                                                           // <-- Target camera
                engine                                                                            // <-- Babylon engine
            );
            
            console.log('✓ Pencil Line Effect initialized successfully');                        // <-- Log success
            
            return {                                                                              // <-- Return post-process and related objects
                postProcess: postProcess                                                           // <-- Post-process instance
            };
            
        } catch (error) {
            console.error('Failed to setup pencil line post-process effect:', error);             // <-- Log error
            throw error;                                                                          // <-- Re-throw error
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Export
// -----------------------------------------------------------------------------

    // Export setupPencilLineEffect to global scope for HTML access
    // ------------------------------------------------------------
    window.setupPencilLineEffect = setupPencilLineEffect;                                       // <-- Export main function to global scope
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

