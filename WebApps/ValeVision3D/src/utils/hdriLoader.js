// =============================================================================
// VALEVISION3D - HDRI ENVIRONMENT LOADER UTILITY
// =============================================================================
//
// FILE       : hdriLoader.js
// NAMESPACE  : ValeVision3D.Utils
// MODULE     : HDRI Environment Loader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Load and apply HDRI environments from Cloudflare CDN
// CREATED    : 2025
//
// DESCRIPTION:
// - Loads HDRI .hdr files for scene lighting
// - Applies HDR environment to Babylon.js scene
// - Manages environment texture disposal
// - Provides intensity and rotation controls
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | HDRI Environment Loading Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Load and Apply HDRI Environment to Scene
    // ------------------------------------------------------------
    window.ValeVision3D = window.ValeVision3D || {};
    window.ValeVision3D.HDRILoader = {
        
        // MODULE VARIABLES | Environment State Management
        // ---------------------------------------------------------------
        currentEnvironment: null,                                        // <-- Currently loaded environment
        currentTexture: null,                                            // <-- Current environment texture
        currentScene: null,                                              // <-- Current scene reference
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Load HDRI Environment from URL
        // ---------------------------------------------------------------
        async loadEnvironment(scene, hdrUrl, intensity = 1.0, rotation = 0, lightingSettings = null) {
            return new Promise((resolve, reject) => {
                
                if (!scene) {                                            // <-- Validate scene exists
                    reject(new Error('Scene is required'));
                    return;
                }
                
                if (!hdrUrl) {                                           // <-- Validate HDR URL
                    reject(new Error('HDR URL is required'));
                    return;
                }
                
                // GET LIGHTING SETTINGS FROM CONFIG OR USE DEFAULTS
                const skyboxExposure = lightingSettings?.skyboxExposure ?? 0.2;  // <-- Get skybox exposure from config
                const sceneEnvIntensity = lightingSettings?.sceneEnvironmentIntensity ?? 0.7;  // <-- Get scene intensity from config
                
                // CALCULATE HDRI TEXTURE LEVEL (REDUCE BASED ON LIGHTING SETTINGS)
                // Scale the base intensity by scene environment intensity to reduce overall brightness
                const hdriTextureLevel = intensity * sceneEnvIntensity;      // <-- Scale texture level by scene intensity
                
                try {
                    // DISPOSE PREVIOUS ENVIRONMENT IF EXISTS
                    this.disposeEnvironment(scene);                      // <-- Clean up previous environment
                    
                    // CREATE HDR TEXTURE
                    const hdrTexture = new BABYLON.HDRCubeTexture(
                        hdrUrl,                                          // <-- URL to HDR file
                        scene,                                           // <-- Target scene
                        512,                                             // <-- Texture size
                        false,                                           // <-- No mipmaps
                        true,                                            // <-- Generate harmonics
                        false,                                           // <-- Not prefiltered
                        true                                             // <-- Use RGBD
                    );
                    
                    // SETUP ENVIRONMENT TEXTURE PROPERTIES
                    hdrTexture.rotationY = rotation;                     // <-- Apply rotation
                    hdrTexture.level = hdriTextureLevel;                 // <-- Apply scaled intensity
                    
                    // WAIT FOR TEXTURE TO LOAD
                    hdrTexture.onLoadObservable.addOnce(() => {
                        
                        // APPLY ENVIRONMENT TO SCENE
                        scene.environmentTexture = hdrTexture;           // <-- Set scene environment
                        scene.createDefaultSkybox(hdrTexture, true, 1000, skyboxExposure); // <-- Create skybox with config exposure
                        
                        // APPLY SCENE-LEVEL ENVIRONMENT INTENSITY
                        if (scene.hasOwnProperty('environmentIntensity')) {  // <-- Check if property exists
                            scene.environmentIntensity = sceneEnvIntensity;   // <-- Set scene environment intensity
                        }
                        
                        this.currentTexture = hdrTexture;                // <-- Store texture reference
                        this.currentScene = scene;                       // <-- Store scene reference
                        this.currentEnvironment = {                      // <-- Store environment data
                            url: hdrUrl,
                            intensity: intensity,
                            rotation: rotation,
                            texture: hdrTexture,
                            lightingSettings: lightingSettings           // <-- Store lighting settings
                        };
                        
                        console.log('HDRI environment loaded successfully'); // <-- Log success
                        resolve(this.currentEnvironment);                // <-- Resolve with environment
                    });
                    
                } catch (error) {
                    console.error('Error loading HDRI environment:', error); // <-- Log error
                    reject(error);                                       // <-- Reject with error
                }
            });
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Update Environment Intensity
        // ---------------------------------------------------------------
        updateIntensity(intensity, lightingSettings = null) {
            if (!this.currentTexture) {                                  // <-- Check if texture exists
                console.warn('No environment texture loaded');
                return;
            }
            
            this.currentTexture.level = intensity;                       // <-- Update intensity
            
            // UPDATE SCENE-LEVEL ENVIRONMENT INTENSITY IF AVAILABLE
            if (this.currentScene && this.currentScene.hasOwnProperty('environmentIntensity')) {  // <-- Check scene available
                const sceneEnvIntensity = lightingSettings?.sceneEnvironmentIntensity ?? 0.7;  // <-- Get from config
                this.currentScene.environmentIntensity = sceneEnvIntensity;  // <-- Update scene intensity
            }
            
            if (this.currentEnvironment) {                               // <-- Update stored value
                this.currentEnvironment.intensity = intensity;
            }
            
            console.log(`Environment intensity updated to ${intensity}`); // <-- Log update
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Update Environment Rotation
        // ---------------------------------------------------------------
        updateRotation(rotation) {
            if (!this.currentTexture) {                                  // <-- Check if texture exists
                console.warn('No environment texture loaded');
                return;
            }
            
            this.currentTexture.rotationY = rotation;                    // <-- Update rotation
            
            if (this.currentEnvironment) {                               // <-- Update stored value
                this.currentEnvironment.rotation = rotation;
            }
            
            console.log(`Environment rotation updated to ${rotation}`);  // <-- Log update
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Dispose Current Environment and Free Memory
        // ---------------------------------------------------------------
        disposeEnvironment(scene) {
            if (this.currentTexture) {                                   // <-- Check if texture exists
                try {
                    this.currentTexture.dispose();                       // <-- Dispose texture
                    console.log('Environment texture disposed');         // <-- Log disposal
                } catch (error) {
                    console.error('Error disposing environment texture:', error);
                }
                
                this.currentTexture = null;                              // <-- Clear texture reference
            }
            
            if (scene && scene.environmentTexture) {                     // <-- Clear scene environment
                scene.environmentTexture = null;
            }
            
            this.currentScene = null;                                    // <-- Clear scene reference
            this.currentEnvironment = null;                              // <-- Clear environment data
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Create Default Lighting if HDRI Not Available
        // ---------------------------------------------------------------
        createDefaultLighting(scene) {
            // CREATE HEMISPHERIC LIGHT
            const light = new BABYLON.HemisphericLight(
                'defaultLight',                                          // <-- Light name
                new BABYLON.Vector3(0, 1, 0),                            // <-- Light direction
                scene                                                    // <-- Target scene
            );
            
            light.intensity = 0.7;                                       // <-- Light intensity
            light.groundColor = new BABYLON.Color3(0.3, 0.3, 0.3);       // <-- Ground reflection color
            
            console.log('Default hemispheric lighting created');         // <-- Log creation
            
            return light;                                                // <-- Return light reference
        }
        // ---------------------------------------------------------------
    };

// endregion -------------------------------------------------------------------

