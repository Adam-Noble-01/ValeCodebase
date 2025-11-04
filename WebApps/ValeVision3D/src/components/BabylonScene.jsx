// =============================================================================
// VALEVISION3D - BABYLON.JS SCENE COMPONENT
// =============================================================================
//
// FILE       : BabylonScene.jsx
// NAMESPACE  : ValeVision3D.Components
// MODULE     : Babylon.js Scene Manager Component
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Core 3D scene management with Babylon.js integration
// CREATED    : 2025
//
// DESCRIPTION:
// - Core Babylon.js scene initialization and management
// - GLB model loading with progress tracking
// - HDRI environment lighting setup
// - Tablet-optimized camera controls with touch gestures
// - Scene rendering and animation loop
// - Memory management and cleanup on unmount
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Babylon Scene Component
// -----------------------------------------------------------------------------

    // COMPONENT | Babylon.js 3D Scene Manager
    // ------------------------------------------------------------
    const BabylonScene = React.forwardRef(({ 
        config, 
        currentModelId, 
        onLoadingProgress,
        onSceneReady
    }, ref) => {
        
        const canvasRef = React.useRef(null);                            // <-- Canvas element reference
        const sceneRef = React.useRef(null);                             // <-- Scene reference
        const engineRef = React.useRef(null);                            // <-- Engine reference
        const cameraRef = React.useRef(null);                            // <-- Camera reference
        const defaultLightRef = React.useRef(null);                      // <-- Default light reference
        
        
        // EFFECT | Initialize Babylon.js Scene
        // ---------------------------------------------------------------
        React.useEffect(() => {
            if (!canvasRef.current) return;                              // <-- Wait for canvas ref
            
            initializeBabylonScene();                                    // <-- Initialize scene
            
            return () => {
                cleanup();                                               // <-- Cleanup on unmount
            };
        }, []);
        // ---------------------------------------------------------------
        
        
        // EFFECT | Load Model When Model ID Changes
        // ---------------------------------------------------------------
        React.useEffect(() => {
            if (!sceneRef.current || !currentModelId || !config) return; // <-- Wait for scene and config
            
            loadCurrentModel();                                          // <-- Load new model
        }, [currentModelId, config]);
        // ---------------------------------------------------------------
        
        
        // EFFECT | Reload Environment When Config Changes
        // ---------------------------------------------------------------
        React.useEffect(() => {
            if (!sceneRef.current || !config) return;                   // <-- Wait for scene and config
            
            loadEnvironment();                                           // <-- Reload environment with updated lighting settings
        }, [config]);
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Initialize Babylon.js Engine and Scene
        // ---------------------------------------------------------------
        const initializeBabylonScene = () => {
            const canvas = canvasRef.current;                            // <-- Get canvas element
            
            // GET RENDER SETTINGS FROM CONFIGURATION (USE DEFAULTS IF CONFIG NOT LOADED)
            const enableAntialiasing = config ? window.ValeVision3D.ConfigLoader.getAntialiasingEnabled(config) : true;
            const enableShadows = config ? window.ValeVision3D.ConfigLoader.getShadowEnabled(config) : true;
            const enableAmbientOcclusion = config ? window.ValeVision3D.ConfigLoader.getAmbientOcclusionEnabled(config) : true;
            
            // CREATE BABYLON ENGINE
            const engine = new BABYLON.Engine(
                canvas,                                                  // <-- Canvas element
                enableAntialiasing,                                      // <-- Antialiasing from config
                { 
                    preserveDrawingBuffer: true,                         // <-- Enable screenshots
                    stencil: true,                                       // <-- Enable stencil
                    disableWebGL2Support: false                          // <-- Use WebGL2 if available
                }
            );
            
            engineRef.current = engine;                                  // <-- Store engine reference
            
            // CREATE SCENE
            const scene = new BABYLON.Scene(engine);                     // <-- Create new scene
            scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 1);     // <-- Dark background color
            sceneRef.current = scene;                                    // <-- Store scene reference
            
            // CREATE CAMERA
            const cameraSettings = window.ValeVision3D.ConfigLoader.getCameraSettings(config);
            const camera = window.ValeVision3D.CameraManager.createCamera(
                scene, 
                canvas, 
                cameraSettings
            );
            cameraRef.current = camera;                                  // <-- Store camera reference
            
            // SETUP DEFAULT LIGHTING (WILL BE DISABLED WHEN HDRI LOADS)
            const defaultLight = window.ValeVision3D.HDRILoader.createDefaultLighting(scene);
            defaultLightRef.current = defaultLight;                       // <-- Store default light reference
            
            // INITIALIZE SHADOW GENERATOR (IF ENABLED)
            // NOTE: Pass null to let shadow renderer create its own directional light
            // Hemispheric lights cannot cast shadows, so shadow renderer will create appropriate light
            if (enableShadows) {                                         // <-- Check if shadows enabled
                window.ValeVision3D.ShadowRenderer.initialize(scene, null, enableShadows);
            }
            
            // INITIALIZE SSAO PIPELINE (IF ENABLED)
            if (enableAmbientOcclusion) {                               // <-- Check if SSAO enabled
                window.ValeVision3D.SSAORenderer.initialize(scene, camera, enableAmbientOcclusion);
            }
            
            // LOAD HDRI ENVIRONMENT
            loadEnvironment();                                           // <-- Load HDRI environment
            
            // START RENDER LOOP
            engine.runRenderLoop(() => {
                scene.render();                                          // <-- Render scene each frame
            });
            
            // HANDLE WINDOW RESIZE
            window.addEventListener('resize', () => {
                engine.resize();                                         // <-- Resize engine on window resize
            });
            
            // NOTIFY SCENE READY
            if (onSceneReady) {
                onSceneReady(scene, camera);                             // <-- Call ready callback
            }
            
            console.log('Babylon.js scene initialized');                 // <-- Log initialization
        };
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Load HDRI Environment from Configuration
        // ---------------------------------------------------------------
        const loadEnvironment = async () => {
            if (!config || !sceneRef.current) return;                    // <-- Validate scene exists
            
            const environments = window.ValeVision3D.ConfigLoader.getEnabledEnvironments(config);
            
            if (environments.length === 0) {                             // <-- No environments available
                console.log('No HDRI environments configured');
                return;
            }
            
            const primaryEnv = environments[0];                          // <-- Use first enabled environment
            
            // GET LIGHTING SETTINGS FROM CONFIG
            const lightingSettings = window.ValeVision3D.ConfigLoader.getLightingSettings(config);  // <-- Get lighting settings
            
            try {
                await window.ValeVision3D.HDRILoader.loadEnvironment(
                    sceneRef.current,
                    primaryEnv.hdrUrl,
                    primaryEnv.intensity,
                    primaryEnv.rotation,
                    lightingSettings                                     // <-- Pass lighting settings
                );
                
                // DISABLE DEFAULT LIGHTING WHEN HDRI IS LOADED
                if (defaultLightRef.current) {                            // <-- Check if default light exists
                    defaultLightRef.current.setEnabled(false);            // <-- Disable default light
                    console.log('Default lighting disabled (HDRI active)'); // <-- Log disable
                }
                
                // APPLY TONE MAPPING EXPOSURE IF AVAILABLE
                if (!sceneRef.current.imageProcessingConfiguration) {   // <-- Create if doesn't exist
                    sceneRef.current.imageProcessingConfiguration = new BABYLON.ImageProcessingConfiguration();
                }
                sceneRef.current.imageProcessingConfiguration.exposure = lightingSettings.toneMappingExposure;  // <-- Apply exposure
                
                // APPLY CONTRAST ADJUSTMENT
                sceneRef.current.imageProcessingConfiguration.contrast = lightingSettings.contrast;  // <-- Apply contrast
                
                // APPLY COLOR TEMPERATURE AND TINT TO NEUTRALIZE BLUE CAST
                const colorTemp = lightingSettings.colorTemperature ?? 5500;  // <-- Get color temperature (default neutral)
                const tint = lightingSettings.tint ?? 0.0;                    // <-- Get tint value (default neutral)
                const blueReduction = lightingSettings.blueReduction ?? 0.0;   // <-- Get blue reduction amount
                
                // CALCULATE COLOR TEMPERATURE TINT (warm to cool)
                // Lower values = warmer (orange), higher values = cooler (blue)
                // We want to neutralize blue, so we'll add warmth
                const tempNormalized = (colorTemp - 5500) / 2000;            // <-- Normalize to -1 to +1 range
                const warmth = Math.max(-0.4, Math.min(0.4, -tempNormalized * 0.3));  // <-- Add warmth to counteract blue
                
                // CALCULATE TINT ADJUSTMENT (green to magenta)
                // Positive = magenta (warmer), negative = green (cooler)
                const tintAdjustment = tint * 0.15;                          // <-- Scale tint adjustment
                
                // APPLY COLOR GRADING TO NEUTRALIZE BLUE
                sceneRef.current.imageProcessingConfiguration.colorGradingEnabled = true;  // <-- Enable color grading
                
                // ADJUST TONE MAPPING TO NEUTRALIZE BLUE CAST
                sceneRef.current.imageProcessingConfiguration.toneMappingEnabled = true;  // <-- Enable tone mapping
                
                // CREATE COLOR CORRECTION TO COUNTERACT BLUE
                // Adjust RGB channels to reduce blue dominance
                if (!sceneRef.current.imageProcessingConfiguration.colorCurves) {
                    sceneRef.current.imageProcessingConfiguration.colorCurves = new BABYLON.ColorCurves();
                }
                
                // REDUCE BLUE CHANNEL AND BOOST RED/GREEN TO COUNTERACT BLUE CAST
                // Negative values reduce the channel, positive values boost it
                sceneRef.current.imageProcessingConfiguration.colorCurves.globalBlue = -(warmth + blueReduction);  // <-- Reduce blue channel significantly
                sceneRef.current.imageProcessingConfiguration.colorCurves.globalRed = warmth * 0.6 + tintAdjustment;  // <-- Boost red to add warmth
                sceneRef.current.imageProcessingConfiguration.colorCurves.globalGreen = warmth * 0.4;  // <-- Boost green slightly
                
                // APPLY SATURATION ADJUSTMENT TO REDUCE OVERALL BLUE CAST
                sceneRef.current.imageProcessingConfiguration.saturation = 1.0 - (blueReduction * 0.3);  // <-- Slightly reduce saturation to tone down blue
                
                console.log('HDRI environment loaded');                  // <-- Log success
                
            } catch (error) {
                console.error('Failed to load HDRI environment:', error); // <-- Log error
            }
        };
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Load Current Model from Configuration
        // ---------------------------------------------------------------
        const loadCurrentModel = async () => {
            if (!currentModelId || !config || !sceneRef.current) return; // <-- Validate inputs
            
            const model = window.ValeVision3D.ConfigLoader.getModelById(config, currentModelId);
            
            if (!model) {                                                // <-- Model not found
                console.error(`Model not found: ${currentModelId}`);
                return;
            }
            
            try {
                // NOTIFY LOADING START
                if (onLoadingProgress) {
                    onLoadingProgress(0, 0, 0, `Loading ${model.name}...`);
                }
                
                // LOAD MODEL WITH PROGRESS TRACKING
                await window.ValeVision3D.ModelLoader.loadModel(
                    sceneRef.current,
                    model,
                    (progress, loaded, total, message) => {              // <-- Progress callback with message
                        if (onLoadingProgress) {
                            onLoadingProgress(
                                progress, 
                                loaded, 
                                total, 
                                message || `Loading ${model.name}...`
                            );
                        }
                    }
                );
                
                // AUTO-FRAME CAMERA TO MODEL
                if (cameraRef.current) {
                    window.ValeVision3D.ModelLoader.autoFrameModel(
                        sceneRef.current,
                        cameraRef.current
                    );
                    
                    // APPLY DEFAULT CAMERA POSITION IF CONFIGURED
                    if (model.defaultCamera) {                           // <-- Use model-specific camera
                        cameraRef.current.alpha = model.defaultCamera.alpha || 0;
                        cameraRef.current.beta = model.defaultCamera.beta || 1.2;
                        cameraRef.current.radius = model.defaultCamera.radius || 50;
                    }
                }
                
                console.log('Model loaded successfully');                // <-- Log success
                
                // DELAY LOADING COMPLETE NOTIFICATION
                // Give the scene time to render textures and prepare meshes
                setTimeout(() => {
                    if (onLoadingProgress) {                             // <-- Notify after render delay
                        onLoadingProgress(100, 0, 0, 'Loading complete');
                    }
                }, 1500);                                                // <-- 1.5 second delay for rendering
                
            } catch (error) {
                console.error('Failed to load model:', error);           // <-- Log error
                
                if (onLoadingProgress) {
                    onLoadingProgress(0, 0, 0, `Error: ${error.message}`);
                }
            }
        };
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Reset Camera to Default Position
        // ---------------------------------------------------------------
        const resetCamera = () => {
            if (!cameraRef.current || !config || !currentModelId) return;
            
            const model = window.ValeVision3D.ConfigLoader.getModelById(config, currentModelId);
            
            if (model && model.defaultCamera) {                          // <-- Use model default camera
                window.ValeVision3D.CameraManager.resetCamera(model.defaultCamera);
            } else {                                                     // <-- Use global defaults
                window.ValeVision3D.CameraManager.resetCamera();
            }
        };
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Cleanup Babylon.js Resources
        // ---------------------------------------------------------------
        const cleanup = () => {
            console.log('Cleaning up Babylon.js resources...');          // <-- Log cleanup
            
            // DISPOSE RENDER EFFECTS
            if (sceneRef.current) {
                window.ValeVision3D.ShadowRenderer.dispose(sceneRef.current); // <-- Dispose shadow generator
                window.ValeVision3D.SSAORenderer.dispose(sceneRef.current);   // <-- Dispose SSAO pipeline
            }
            
            // DISPOSE MODEL
            if (sceneRef.current) {
                window.ValeVision3D.ModelLoader.disposeModel(sceneRef.current);
            }
            
            // DISPOSE ENVIRONMENT
            if (sceneRef.current) {
                window.ValeVision3D.HDRILoader.disposeEnvironment(sceneRef.current);
            }
            
            // DISPOSE SCENE
            if (sceneRef.current) {
                sceneRef.current.dispose();                              // <-- Dispose scene
                sceneRef.current = null;
            }
            
            // DISPOSE ENGINE
            if (engineRef.current) {
                engineRef.current.dispose();                             // <-- Dispose engine
                engineRef.current = null;
            }
            
            console.log('Babylon.js cleanup complete');                  // <-- Log completion
        };
        // ---------------------------------------------------------------
        
        
        // EXPOSE RESET CAMERA FUNCTION
        React.useImperativeHandle(ref, () => ({
            resetCamera: resetCamera
        }));
        
        
        return (
            <div className="vale-babylon-container">
                <canvas 
                    ref={canvasRef} 
                    className="vale-babylon-canvas"
                    touch-action="none"
                />
            </div>
        );
    });
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

