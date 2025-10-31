// =============================================================================
// VALEVISION3D - CONFIGURATION LOADER UTILITY
// =============================================================================
//
// FILE       : configLoader.js
// NAMESPACE  : ValeVision3D.Utils
// MODULE     : Configuration Loader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Load and parse masterConfig.json configuration file
// CREATED    : 2025
//
// DESCRIPTION:
// - Loads masterConfig.json from data directory
// - Validates configuration structure
// - Provides configuration data to application components
// - Handles configuration loading errors gracefully
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Configuration Loading Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Load Master Configuration from JSON File
    // ------------------------------------------------------------
    window.ValeVision3D = window.ValeVision3D || {};
    window.ValeVision3D.ConfigLoader = {
        
        // MODULE VARIABLE | Cached Configuration Data
        // ---------------------------------------------------------------
        cachedConfig: null,                                              // <-- Store loaded config
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Load Configuration from masterConfig.json
        // ---------------------------------------------------------------
        async loadConfig() {
            if (this.cachedConfig) {                                     // <-- Return cached if available
                return this.cachedConfig;
            }
            
            try {
                const response = await fetch('src/data/masterConfig.json'); // <-- Fetch config file
                
                if (!response.ok) {                                      // <-- Check response status
                    throw new Error(`Failed to load config: ${response.status}`);
                }
                
                const config = await response.json();                    // <-- Parse JSON data
                
                this.cachedConfig = config;                              // <-- Cache configuration
                return config;                                           // <-- Return configuration
                
            } catch (error) {
                console.error('Error loading configuration:', error);    // <-- Log error
                throw error;                                             // <-- Rethrow error
            }
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Get Enabled Models from Configuration
        // ---------------------------------------------------------------
        getEnabledModels(config) {
            if (!config || !config.models) {                             // <-- Validate config structure
                return [];
            }
            
            return config.models.filter(model => model.enabled);         // <-- Filter enabled models
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Get Enabled HDRI Environments from Configuration
        // ---------------------------------------------------------------
        getEnabledEnvironments(config) {
            if (!config || !config.environments) {                       // <-- Validate config structure
                return [];
            }
            
            return config.environments.filter(env => env.enabled);       // <-- Filter enabled environments
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Get Model by ID
        // ---------------------------------------------------------------
        getModelById(config, modelId) {
            if (!config || !config.models) {                             // <-- Validate config structure
                return null;
            }
            
            return config.models.find(model => model.id === modelId);    // <-- Find model by ID
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Get Environment by ID
        // ---------------------------------------------------------------
        getEnvironmentById(config, envId) {
            if (!config || !config.environments) {                       // <-- Validate config structure
                return null;
            }
            
            return config.environments.find(env => env.id === envId);    // <-- Find environment by ID
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Get Camera Settings from Configuration
        // ---------------------------------------------------------------
        getCameraSettings(config) {
            if (!config || !config.cameraSettings) {                     // <-- Validate config structure
                return this.getDefaultCameraSettings();                  // <-- Return defaults
            }
            
            return config.cameraSettings;                                // <-- Return camera settings
        },
        // ---------------------------------------------------------------
        
        
        // HELPER FUNCTION | Get Default Camera Settings
        // ---------------------------------------------------------------
        getDefaultCameraSettings() {
            return {
                touchSensitivity: 0.8,                                   // <-- Default touch sensitivity
                wheelPrecision: 0.5,                                     // <-- Default wheel precision
                inertia: 0.9,                                            // <-- Default inertia
                pinchPrecision: 12.0,                                    // <-- Default pinch precision
                panningSensibility: 50,                                  // <-- Default panning sensitivity
                minZ: 0.1,                                               // <-- Default near plane
                maxZ: 10000,                                             // <-- Default far plane
                lowerRadiusLimit: 5,                                     // <-- Default min zoom
                upperRadiusLimit: 500,                                   // <-- Default max zoom
                lowerBetaLimit: 0.1,                                     // <-- Default min vertical angle
                upperBetaLimit: 1.5,                                     // <-- Default max vertical angle
                allowUpsideDown: false                                   // <-- Default upside down prevention
            };
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Get Render Settings from Configuration
        // ---------------------------------------------------------------
        getRenderSettings(config) {
            if (!config || !config.renderSettings) {                      // <-- Validate config structure
                return this.getDefaultRenderSettings();                    // <-- Return defaults
            }
            
            return config.renderSettings;                                  // <-- Return render settings
        },
        // ---------------------------------------------------------------
        
        
        // HELPER FUNCTION | Get Default Render Settings
        // ---------------------------------------------------------------
        getDefaultRenderSettings() {
            return {
                enableAntialiasing: true,                                  // <-- Default antialiasing enabled
                enableShadows: true,                                       // <-- Default shadows enabled
                enableGlow: false,                                         // <-- Default glow disabled
                enableAmbientOcclusion: true,                              // <-- Default ambient occlusion enabled
                targetFPS: 60                                              // <-- Default target FPS
            };
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Get Shadow Enabled Setting from Configuration
        // ---------------------------------------------------------------
        getShadowEnabled(config) {
            const renderSettings = this.getRenderSettings(config);         // <-- Get render settings
            return renderSettings.enableShadows === true;                 // <-- Return shadow enabled (strict equality)
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Get Ambient Occlusion Enabled Setting from Configuration
        // ---------------------------------------------------------------
        getAmbientOcclusionEnabled(config) {
            const renderSettings = this.getRenderSettings(config);         // <-- Get render settings
            return renderSettings.enableAmbientOcclusion === true;        // <-- Return AO enabled (strict equality)
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Get Antialiasing Enabled Setting from Configuration
        // ---------------------------------------------------------------
        getAntialiasingEnabled(config) {
            const renderSettings = this.getRenderSettings(config);         // <-- Get render settings
            return renderSettings.enableAntialiasing === true;             // <-- Return antialiasing enabled (strict equality)
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Validate Configuration Structure
        // ---------------------------------------------------------------
        validateConfig(config) {
            const requiredFields = [                                     // <-- Define required fields
                'applicationName',
                'version',
                'models',
                'environments',
                'cameraSettings'
            ];
            
            for (const field of requiredFields) {
                if (!config.hasOwnProperty(field)) {                     // <-- Check field exists
                    console.error(`Missing required field: ${field}`);
                    return false;
                }
            }
            
            return true;                                                 // <-- Configuration valid
        }
        // ---------------------------------------------------------------
    };

// endregion -------------------------------------------------------------------

