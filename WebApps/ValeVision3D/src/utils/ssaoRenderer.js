// =============================================================================
// VALEVISION3D - SSAO AMBIENT OCCLUSION RENDERER UTILITY
// =============================================================================
//
// FILE       : ssaoRenderer.js
// NAMESPACE  : ValeVision3D.Utils
// MODULE     : SSAO Ambient Occlusion Renderer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Screen Space Ambient Occlusion effect for photogrammetry visualization
// CREATED    : 2025
//
// DESCRIPTION:
// - Implements both modern SSAO2 (WebGL2) and legacy SSAO (WebGL1) rendering pipelines
// - Automatically detects and uses the best available method with graceful fallback
// - Provides configurable quality settings optimized for large-scale scenes
// - Handles pipeline disposal and cleanup
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | SSAO Ambient Occlusion Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize SSAO Pipeline for Scene
    // ------------------------------------------------------------
    window.ValeVision3D = window.ValeVision3D || {};
    window.ValeVision3D.SSAORenderer = {
        
        // MODULE VARIABLES | SSAO State Management
        // ---------------------------------------------------------------
        currentPipeline: null,                                               // <-- Current SSAO pipeline reference
        isLegacyMode: false,                                                 // <-- Track if using legacy pipeline
        pipelineName: 'valevision3d_ssao',                                  // <-- Pipeline identifier name
        // ---------------------------------------------------------------
        
        
        // MODULE CONSTANTS | SSAO Quality Presets
        // ---------------------------------------------------------------
        QUALITY_PRESETS: {
            HIGH: {
                ssaoRatio              : 1.0,                               // <-- Full resolution SSAO computation
                blurRatio              : 1.0,                               // <-- Full resolution blur pass
                combineRatio           : 1.0,                               // <-- Full resolution combine pass
                samples                : 32,                                // <-- High sample count for smooth AO
                radius                 : 0.3,                               // <-- Moderate radius for large scenes
                totalStrength          : 1.5,                               // <-- Strong but not overwhelming effect
                base                   : 0.1,                               // <-- Slight base to prevent pure black
                expensiveBlur          : true,                              // <-- High quality bilateral blur
                maxZ                   : 10000.0,                           // <-- Far clipping for large scenes
                minZAspect             : 0.2                               // <-- Standard depth scaling
            },
            MEDIUM: {
                ssaoRatio              : 0.75,                              // <-- 75% resolution for balance
                blurRatio              : 0.75,                              // <-- Matching blur resolution
                combineRatio           : 1.0,                               // <-- Full resolution output
                samples                : 16,                                // <-- Moderate sample count
                radius                 : 0.25,                              // <-- Slightly tighter radius
                totalStrength          : 1.2,                               // <-- Standard intensity
                base                   : 0.15,                              // <-- More base for softer shadows
                expensiveBlur          : true,                              // <-- Keep quality blur
                maxZ                   : 10000.0,                           // <-- Standard far plane
                minZAspect             : 0.2                               // <-- Standard depth scaling
            },
            LOW: {
                ssaoRatio              : 0.5,                              // <-- Half resolution for performance
                blurRatio              : 0.5,                              // <-- Half resolution blur
                combineRatio           : 1.0,                               // <-- Full resolution output
                samples                : 8,                                 // <-- Minimal samples for speed
                radius                 : 0.2,                               // <-- Tight radius for performance
                totalStrength          : 0.8,                               // <-- Reduced intensity
                base                   : 0.2,                               // <-- Higher base for lighter effect
                expensiveBlur          : false,                             // <-- Fast blur for mobile
                maxZ                   : 10000.0,                           // <-- Standard far plane
                minZAspect             : 0.2                               // <-- Standard depth scaling
            }
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Initialize SSAO Pipeline Based on Configuration
        // ---------------------------------------------------------------
        initialize(scene, camera, enabled, quality = 'MEDIUM') {
            if (!scene) {                                                    // <-- Validate scene exists
                console.error('SSAORenderer: Scene is required');
                return false;
            }
            
            if (!camera) {                                                   // <-- Validate camera exists
                console.error('SSAORenderer: Camera is required');
                return false;
            }
            
            if (enabled !== true) {                                          // <-- Check if SSAO enabled (strict equality)
                console.log('SSAORenderer: SSAO disabled in configuration');
                return false;
            }
            
            // DISPOSE EXISTING PIPELINE IF EXISTS
            this.dispose(scene);                                             // <-- Clean up previous pipeline
            
            // GET QUALITY PRESET
            const preset = this.QUALITY_PRESETS[quality] || this.QUALITY_PRESETS.MEDIUM; // <-- Use preset or default
            
            try {
                // ATTEMPT MODERN SSAO2 PIPELINE FIRST
                if (BABYLON.SSAO2RenderingPipeline.IsSupported) {            // <-- Check WebGL2 support
                    this.createSSAO2Pipeline(scene, camera, preset);          // <-- Create modern pipeline
                    this.isLegacyMode = false;                               // <-- Mark as modern mode
                    console.log('SSAORenderer: Using modern SSAO2 pipeline');
                } else {
                    // FALLBACK TO LEGACY SSAO PIPELINE
                    this.createLegacySSAOPipeline(scene, camera, preset);    // <-- Create legacy pipeline
                    this.isLegacyMode = true;                                // <-- Mark as legacy mode
                    console.log('SSAORenderer: Using legacy SSAO pipeline (WebGL1)');
                }
                
                console.log('SSAORenderer: SSAO pipeline initialized successfully');
                return true;                                                 // <-- Return success
                
            } catch (error) {
                console.error('SSAORenderer: Failed to initialize SSAO pipeline:', error); // <-- Log error
                return false;                                                // <-- Return failure
            }
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Create Modern SSAO2 Pipeline (WebGL2)
        // ---------------------------------------------------------------
        createSSAO2Pipeline(scene, camera, preset) {
            // CONFIGURE RESOLUTION RATIOS
            const ssaoRatio = {
                ssaoRatio: preset.ssaoRatio,                                 // <-- SSAO computation resolution
                blurRatio: preset.blurRatio,                                 // <-- Blur pass resolution
                combineRatio: preset.combineRatio                            // <-- Final combine resolution
            };
            
            // CREATE SSAO2 PIPELINE
            this.currentPipeline = new BABYLON.SSAO2RenderingPipeline(
                this.pipelineName,                                           // <-- Pipeline name
                scene,                                                       // <-- Scene reference
                ssaoRatio                                                    // <-- Resolution configuration
            );
            
            // ATTACH TO CAMERA
            scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(
                this.pipelineName,                                           // <-- Pipeline name
                camera                                                       // <-- Camera to attach
            );
            
            // CONFIGURE SSAO2 PARAMETERS
            this.currentPipeline.radius = preset.radius;                    // <-- Sample radius
            this.currentPipeline.totalStrength = preset.totalStrength;      // <-- Effect intensity
            this.currentPipeline.base = preset.base;                         // <-- Base ambient light
            this.currentPipeline.samples = preset.samples;                   // <-- Sample count
            this.currentPipeline.maxZ = preset.maxZ;                         // <-- Far clipping distance
            this.currentPipeline.minZAspect = preset.minZAspect;             // <-- Depth scaling factor
            this.currentPipeline.expensiveBlur = preset.expensiveBlur;       // <-- Blur quality setting
            
            // EPSILON FOR LOW SAMPLE ARTIFACT REDUCTION
            if (preset.samples < 16) {                                       // <-- Low sample count detected
                this.currentPipeline.epsilon = 0.02;                         // <-- Apply epsilon correction
            }
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Create Legacy SSAO Pipeline (WebGL1)
        // ---------------------------------------------------------------
        createLegacySSAOPipeline(scene, camera, preset) {
            // CONFIGURE RESOLUTION RATIOS
            const ssaoRatio = {
                ssaoRatio: preset.ssaoRatio,                                 // <-- SSAO computation resolution
                blurRatio: preset.blurRatio,                                 // <-- Blur pass resolution
                combineRatio: preset.combineRatio                            // <-- Final combine resolution
            };
            
            // CREATE LEGACY SSAO PIPELINE
            this.currentPipeline = new BABYLON.SSAORenderingPipeline(
                this.pipelineName,                                           // <-- Pipeline name
                scene,                                                       // <-- Scene reference
                ssaoRatio.ssaoRatio,                                         // <-- SSAO computation resolution
                [camera]                                                     // <-- Camera array
            );
            
            // CONFIGURE LEGACY SSAO PARAMETERS
            this.currentPipeline.radius = preset.radius;                     // <-- Sample radius
            this.currentPipeline.totalStrength = preset.totalStrength;      // <-- Effect intensity
            this.currentPipeline.base = preset.base;                         // <-- Base ambient light
            this.currentPipeline.samples = preset.samples;                   // <-- Sample count
            this.currentPipeline.maxZ = preset.maxZ;                         // <-- Far clipping distance
            this.currentPipeline.minZAspect = preset.minZAspect;             // <-- Depth scaling factor
            this.currentPipeline.expensiveBlur = preset.expensiveBlur;       // <-- Blur quality setting
            
            // EPSILON FOR LOW SAMPLE ARTIFACT REDUCTION
            if (preset.samples < 16) {                                       // <-- Low sample count detected
                this.currentPipeline.epsilon = 0.02;                         // <-- Apply epsilon correction
            }
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Dispose SSAO Pipeline and Free Memory
        // ---------------------------------------------------------------
        dispose(scene) {
            if (!scene) {                                                    // <-- Validate scene exists
                return;
            }
            
            // DETACH PIPELINE FROM ALL CAMERAS
            if (this.currentPipeline) {                                      // <-- Check if pipeline exists
                try {
                    scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(
                        this.pipelineName,                                   // <-- Pipeline name
                        scene.cameras                                        // <-- All cameras
                    );
                    
                    this.currentPipeline.dispose();                          // <-- Dispose pipeline
                    console.log('SSAORenderer: SSAO pipeline disposed');
                } catch (error) {
                    console.error('SSAORenderer: Error disposing SSAO pipeline:', error);
                }
                
                this.currentPipeline = null;                                // <-- Clear pipeline reference
            }
            
            this.isLegacyMode = false;                                       // <-- Reset legacy mode flag
            console.log('SSAORenderer: Cleanup complete');
        }
        // ---------------------------------------------------------------
    };

// endregion -------------------------------------------------------------------

