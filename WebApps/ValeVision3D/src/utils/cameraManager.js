// =============================================================================
// VALEVISION3D - CAMERA MANAGER UTILITY
// =============================================================================
//
// FILE       : cameraManager.js
// NAMESPACE  : ValeVision3D.Utils
// MODULE     : Camera Control Manager
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Manage camera controls and tablet-optimized navigation
// CREATED    : 2025
//
// DESCRIPTION:
// - Configures ArcRotateCamera for tablet-first navigation
// - Implements touch gestures: pinch zoom, two-finger pan, single-finger rotate
// - Provides camera presets and view management
// - Handles double-tap to focus functionality
// - Manages camera bounds and constraints
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Camera Configuration and Management
// -----------------------------------------------------------------------------

    // FUNCTION | Create and Configure ArcRotateCamera
    // ------------------------------------------------------------
    window.ValeVision3D = window.ValeVision3D || {};
    window.ValeVision3D.CameraManager = {
        
        // MODULE VARIABLES | Camera State Management
        // ---------------------------------------------------------------
        currentCamera: null,                                             // <-- Current camera reference
        cameraPresets: {},                                               // <-- Stored camera presets
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Create ArcRotateCamera with Tablet-Optimized Settings
        // ---------------------------------------------------------------
        createCamera(scene, canvas, cameraSettings) {
            if (!scene || !canvas) {                                     // <-- Validate inputs
                console.error('Scene and canvas required');
                return null;
            }
            
            // CREATE ARC ROTATE CAMERA
            const camera = new BABYLON.ArcRotateCamera(
                'mainCamera',                                            // <-- Camera name
                0,                                                       // <-- Alpha (horizontal rotation)
                1.2,                                                     // <-- Beta (vertical rotation)
                50,                                                      // <-- Radius (distance from target)
                new BABYLON.Vector3(0, 0, 0),                            // <-- Target position
                scene                                                    // <-- Target scene
            );
            
            // ATTACH CAMERA TO CANVAS
            camera.attachControl(canvas, false);                         // <-- Enable input controls without default browser behavior
            canvas.focus();                                              // <-- Ensure canvas has focus for immediate interaction
            
            // APPLY CAMERA SETTINGS FROM CONFIG
            this.applyCameraSettings(camera, cameraSettings);            // <-- Configure camera
            
            // SETUP TOUCH CONTROLS
            this.setupTouchControls(camera, canvas);                     // <-- Enable tablet gestures
            
            this.currentCamera = camera;                                 // <-- Store camera reference
            
            console.log('ArcRotateCamera created with tablet-optimized controls');
            
            return camera;                                               // <-- Return camera
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Apply Camera Settings from Configuration
        // ---------------------------------------------------------------
        applyCameraSettings(camera, settings) {
            if (!settings) {                                             // <-- Use defaults if no settings
                settings = {};
            }
            
            // TOUCH AND INTERACTION SETTINGS
            camera.panningSensibility = settings.panningSensibility || 50;
            camera.pinchPrecision = settings.pinchPrecision || 12.0;
            camera.wheelPrecision = settings.wheelPrecision || 0.5;
            camera.inertia = settings.inertia || 0.9;
            
            // CAMERA BOUNDS AND LIMITS
            camera.lowerRadiusLimit = settings.lowerRadiusLimit || 5;    // <-- Min zoom distance
            camera.upperRadiusLimit = settings.upperRadiusLimit || 500;  // <-- Max zoom distance
            camera.lowerBetaLimit = settings.lowerBetaLimit || 0.1;      // <-- Min vertical angle
            camera.upperBetaLimit = settings.upperBetaLimit || 1.5;      // <-- Max vertical angle
            camera.allowUpsideDown = settings.allowUpsideDown || false;  // <-- Prevent upside down
            
            // RENDERING SETTINGS
            camera.minZ = settings.minZ || 0.1;                          // <-- Near clipping plane
            camera.maxZ = settings.maxZ || 10000;                        // <-- Far clipping plane
            
            console.log('Camera settings applied');                      // <-- Log application
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Setup Tablet-Optimized Touch Controls
        // ---------------------------------------------------------------
        setupTouchControls(camera, canvas) {
            // NOTE: Touch inputs are automatically enabled by camera.attachControl()
            // The camera.inputs.addTouch() method is deprecated in Babylon.js 8.x
            
            // CONFIGURE TOUCH BEHAVIOR
            camera.angularSensibilityX = 1000;                           // <-- Horizontal sensitivity
            camera.angularSensibilityY = 1000;                           // <-- Vertical sensitivity
            
            // SETUP DOUBLE-TAP TO FOCUS
            this.setupDoubleTapFocus(camera, canvas);                    // <-- Enable double-tap
            
            console.log('Touch controls configured');                    // <-- Log setup
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Setup Double-Tap to Focus Functionality
        // ---------------------------------------------------------------
        setupDoubleTapFocus(camera, canvas) {
            let lastTapTime = 0;                                         // <-- Track last tap time
            const doubleTapDelay = 300;                                  // <-- Max delay between taps
            
            canvas.addEventListener('pointerdown', (event) => {
                const currentTime = Date.now();                          // <-- Get current time
                const timeSinceLastTap = currentTime - lastTapTime;      // <-- Calculate delay
                
                if (timeSinceLastTap < doubleTapDelay && timeSinceLastTap > 0) {
                    // DOUBLE TAP DETECTED
                    this.focusOnPoint(camera, event);                    // <-- Focus on tap point
                }
                
                lastTapTime = currentTime;                               // <-- Update last tap time
            });
            
            console.log('Double-tap focus enabled');                     // <-- Log setup
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Focus Camera on Tapped Point
        // ---------------------------------------------------------------
        focusOnPoint(camera, event) {
            const scene = camera.getScene();                             // <-- Get scene reference
            const pickResult = scene.pick(event.clientX, event.clientY); // <-- Pick at tap location
            
            if (pickResult.hit && pickResult.pickedPoint) {              // <-- Check if point hit
                const targetPoint = pickResult.pickedPoint;              // <-- Get hit point
                
                // ANIMATE CAMERA TO TARGET
                BABYLON.Animation.CreateAndStartAnimation(
                    'cameraTarget',                                      // <-- Animation name
                    camera,                                              // <-- Target object
                    'target',                                            // <-- Property to animate
                    60,                                                  // <-- Frame rate
                    30,                                                  // <-- Total frames
                    camera.target,                                       // <-- Start value
                    targetPoint,                                         // <-- End value
                    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT         // <-- Loop mode
                );
                
                console.log('Camera focused on point');                  // <-- Log focus
            }
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Save Current Camera Position as Preset
        // ---------------------------------------------------------------
        saveCameraPreset(name) {
            if (!this.currentCamera) {                                   // <-- Check if camera exists
                console.warn('No camera to save');
                return;
            }
            
            this.cameraPresets[name] = {                                 // <-- Store camera state
                alpha: this.currentCamera.alpha,
                beta: this.currentCamera.beta,
                radius: this.currentCamera.radius,
                target: this.currentCamera.target.clone()
            };
            
            console.log(`Camera preset '${name}' saved`);                // <-- Log save
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Load Camera Preset by Name
        // ---------------------------------------------------------------
        loadCameraPreset(name, animated = true) {
            if (!this.currentCamera) {                                   // <-- Check if camera exists
                console.warn('No camera available');
                return;
            }
            
            const preset = this.cameraPresets[name];                     // <-- Get preset
            
            if (!preset) {                                               // <-- Check if preset exists
                console.warn(`Preset '${name}' not found`);
                return;
            }
            
            if (animated) {                                              // <-- Animate to preset
                this.animateCameraToPreset(preset);
            } else {                                                     // <-- Jump to preset
                this.currentCamera.alpha = preset.alpha;
                this.currentCamera.beta = preset.beta;
                this.currentCamera.radius = preset.radius;
                this.currentCamera.target = preset.target.clone();
            }
            
            console.log(`Camera preset '${name}' loaded`);               // <-- Log load
        },
        // ---------------------------------------------------------------
        
        
        // HELPER FUNCTION | Animate Camera to Preset Position
        // ---------------------------------------------------------------
        animateCameraToPreset(preset) {
            const camera = this.currentCamera;                           // <-- Get camera reference
            
            // ANIMATE ALPHA
            BABYLON.Animation.CreateAndStartAnimation(
                'cameraAlpha', camera, 'alpha', 60, 30,
                camera.alpha, preset.alpha,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            // ANIMATE BETA
            BABYLON.Animation.CreateAndStartAnimation(
                'cameraBeta', camera, 'beta', 60, 30,
                camera.beta, preset.beta,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            // ANIMATE RADIUS
            BABYLON.Animation.CreateAndStartAnimation(
                'cameraRadius', camera, 'radius', 60, 30,
                camera.radius, preset.radius,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            // ANIMATE TARGET
            BABYLON.Animation.CreateAndStartAnimation(
                'cameraTarget', camera, 'target', 60, 30,
                camera.target, preset.target,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Reset Camera to Default Position
        // ---------------------------------------------------------------
        resetCamera(defaultCamera) {
            if (!this.currentCamera) {                                   // <-- Check if camera exists
                return;
            }
            
            const defaults = defaultCamera || {                          // <-- Use provided or default values
                alpha: 0,
                beta: 1.2,
                radius: 50
            };
            
            this.animateCameraToPreset(defaults);                        // <-- Animate to defaults
            
            console.log('Camera reset to default position');             // <-- Log reset
        }
        // ---------------------------------------------------------------
    };

// endregion -------------------------------------------------------------------

