// =============================================================================
// VALEVISION3D - SHADOW RENDERER UTILITY
// =============================================================================
//
// FILE       : shadowRenderer.js
// NAMESPACE  : ValeVision3D.Utils
// MODULE     : Shadow Renderer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Shadow generation and management for Babylon.js scenes
// CREATED    : 2025
//
// DESCRIPTION:
// - Creates and configures shadow generators for directional lights
// - Automatically creates directional light if none provided
// - Manages shadow map size and quality settings
// - Provides mesh attachment helpers for shadow casting/receiving
// - Handles shadow generator disposal and cleanup
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shadow Generation Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Shadow Generator for Scene
    // ------------------------------------------------------------
    window.ValeVision3D = window.ValeVision3D || {};
    window.ValeVision3D.ShadowRenderer = {
        
        // MODULE VARIABLES | Shadow State Management
        // ---------------------------------------------------------------
        currentShadowGenerator: null,                                       // <-- Current shadow generator reference
        shadowLight: null,                                                   // <-- Light used for shadows
        shadowMapSize: 2048,                                                // <-- Default shadow map size
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Initialize Shadow Generator Based on Configuration
        // ---------------------------------------------------------------
        initialize(scene, light, enabled) {
            if (!scene) {                                                    // <-- Validate scene exists
                console.error('ShadowRenderer: Scene is required');
                return false;
            }
            
            if (enabled !== true) {                                          // <-- Check if shadows enabled (strict equality)
                console.log('ShadowRenderer: Shadows disabled in configuration');
                return false;
            }
            
            // DISPOSE EXISTING SHADOW GENERATOR IF EXISTS
            this.dispose(scene);                                             // <-- Clean up previous shadow generator
            
            // VALIDATE LIGHT TYPE OR CREATE DIRECTIONAL LIGHT FOR SHADOWS
            let shadowLight = light;                                          // <-- Start with provided light
            
            // CHECK IF LIGHT IS VALID DIRECTIONAL LIGHT TYPE
            if (shadowLight && !(shadowLight instanceof BABYLON.DirectionalLight)) { // <-- Validate light type
                console.warn('ShadowRenderer: Provided light is not a DirectionalLight, creating new directional light');
                shadowLight = null;                                           // <-- Reset to null to create new light
            }
            
            // CREATE DIRECTIONAL LIGHT IF NONE PROVIDED OR INVALID
            if (!shadowLight) {                                               // <-- No valid light provided
                shadowLight = this.createShadowLight(scene);                  // <-- Create directional light
            }
            
            this.shadowLight = shadowLight;                                   // <-- Store light reference
            
            // CREATE SHADOW GENERATOR
            this.createShadowGenerator(scene, shadowLight);                  // <-- Create and configure shadow generator
            
            // STORE REFERENCE ON SCENE FOR EASY ACCESS
            scene.shadowGenerator = this.currentShadowGenerator;             // <-- Store reference on scene
            
            console.log('ShadowRenderer: Shadow generator initialized successfully');
            return true;                                                     // <-- Return success
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Create and Configure Shadow Generator
        // ---------------------------------------------------------------
        createShadowGenerator(scene, light) {
            if (!scene || !light) {                                          // <-- Validate inputs
                console.error('ShadowRenderer: Scene and light required');
                return null;
            }
            
            // CREATE SHADOW GENERATOR
            const shadowGenerator = new BABYLON.ShadowGenerator(
                this.shadowMapSize,                                          // <-- Shadow map size
                light                                                         // <-- Directional light for shadows
            );
            
            // CONFIGURE SHADOW GENERATOR SETTINGS
            shadowGenerator.useExponentialShadowMap = true;                  // <-- Use exponential shadow mapping
            shadowGenerator.useBlurExponentialShadowMap = true;               // <-- Enable blur for soft shadows
            shadowGenerator.blurScale = 2;                                   // <-- Blur scale factor
            shadowGenerator.blurBoxOffset = 1;                                // <-- Blur box offset
            shadowGenerator.setDarkness(0.2);                                 // <-- Shadow darkness level
            shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_HIGH; // <-- High quality filtering
            shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;         // <-- Contact hardening ratio
            
            this.currentShadowGenerator = shadowGenerator;                    // <-- Store generator reference
            
            console.log('ShadowRenderer: Shadow generator created with map size', this.shadowMapSize);
            return shadowGenerator;                                           // <-- Return generator reference
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Create Directional Light for Shadow Casting
        // ---------------------------------------------------------------
        createShadowLight(scene) {
            if (!scene) {                                                    // <-- Validate scene exists
                console.error('ShadowRenderer: Scene required to create light');
                return null;
            }
            
            // CREATE DIRECTIONAL LIGHT
            const directionalLight = new BABYLON.DirectionalLight(
                'shadowLight',                                               // <-- Light name
                new BABYLON.Vector3(-1, -1, -1),                            // <-- Light direction
                scene                                                        // <-- Target scene
            );
            
            // CONFIGURE LIGHT PROPERTIES
            directionalLight.intensity = 1.0;                                // <-- Light intensity
            directionalLight.position = new BABYLON.Vector3(50, 50, 50);     // <-- Light position
            
            console.log('ShadowRenderer: Directional light created for shadows');
            return directionalLight;                                          // <-- Return light reference
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Add Mesh to Shadow Generator (Cast Shadows)
        // ---------------------------------------------------------------
        addMeshToShadowGenerator(mesh) {
            if (!this.currentShadowGenerator) {                              // <-- Check if generator exists
                console.warn('ShadowRenderer: No shadow generator available');
                return;
            }
            
            if (!mesh) {                                                     // <-- Validate mesh exists
                console.warn('ShadowRenderer: Mesh is required');
                return;
            }
            
            this.currentShadowGenerator.addShadowCaster(mesh);                // <-- Add mesh as shadow caster
            console.log('ShadowRenderer: Mesh added to shadow generator');
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Set Mesh to Receive Shadows
        // ---------------------------------------------------------------
        setMeshReceiveShadows(mesh, receiveShadows = true) {
            if (!mesh) {                                                     // <-- Validate mesh exists
                console.warn('ShadowRenderer: Mesh is required');
                return;
            }
            
            mesh.receiveShadows = receiveShadows;                            // <-- Set shadow receiving property
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Set Shadow Map Size
        // ---------------------------------------------------------------
        setShadowMapSize(size) {
            if (size < 256 || size > 4096) {                                 // <-- Validate size range
                console.warn('ShadowRenderer: Shadow map size should be between 256 and 4096');
                return;
            }
            
            // RECALCULATE SIZE TO POWER OF 2
            const powerOfTwo = Math.pow(2, Math.round(Math.log2(size)));     // <-- Round to nearest power of 2
            this.shadowMapSize = powerOfTwo;                                 // <-- Store shadow map size
            
            console.log('ShadowRenderer: Shadow map size set to', this.shadowMapSize);
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Dispose Shadow Generator and Free Memory
        // ---------------------------------------------------------------
        dispose(scene) {
            if (this.currentShadowGenerator) {                               // <-- Check if generator exists
                try {
                    this.currentShadowGenerator.dispose();                   // <-- Dispose shadow generator
                    console.log('ShadowRenderer: Shadow generator disposed');
                } catch (error) {
                    console.error('ShadowRenderer: Error disposing shadow generator:', error);
                }
                
                this.currentShadowGenerator = null;                          // <-- Clear generator reference
            }
            
            if (scene && scene.shadowGenerator) {                             // <-- Clear scene reference
                scene.shadowGenerator = null;
            }
            
            // NOTE: Do not dispose light as it may be used by other systems
            // Only clear reference if we created it
            if (this.shadowLight) {                                          // <-- Check if we created the light
                // Only dispose if we created it and it's not used elsewhere
                // For now, keep the light reference but don't dispose
                // This allows HDRI lighting to manage lights independently
            }
            
            console.log('ShadowRenderer: Cleanup complete');
        }
        // ---------------------------------------------------------------
    };

// endregion -------------------------------------------------------------------

