// =============================================================================
// VALEVISION3D - MODEL LOADER UTILITY
// =============================================================================
//
// FILE       : modelLoader.js
// NAMESPACE  : ValeVision3D.Utils
// MODULE     : GLB Model Loader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Load and manage GLB photogrammetry models from Cloudflare CDN
// CREATED    : 2025
//
// DESCRIPTION:
// - Loads GLB models using Babylon.js SceneLoader
// - Provides progress tracking for large file downloads
// - Handles model loading errors and retries
// - Manages model disposal and memory cleanup
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Model Loading Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Load GLB Model into Babylon.js Scene
    // ------------------------------------------------------------
    window.ValeVision3D = window.ValeVision3D || {};
    window.ValeVision3D.ModelLoader = {
        
        // MODULE VARIABLES | Loading State Management
        // ---------------------------------------------------------------
        currentModel: null,                                              // <-- Currently loaded model
        loadingProgress: 0,                                              // <-- Current loading progress
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Load GLB Model from URL with Progress Tracking
        // ---------------------------------------------------------------
        async loadModel(scene, modelConfig, onProgress) {
            
            // CHECK IF MODEL SHOULD USE CDN LOADER
            if (modelConfig.useCdnLoader === true) {                     // <-- Use specialized CDN loader
                return window.ValeVision3D.GLBCdnLoader.loadGLBBundle(
                    scene,
                    modelConfig,
                    onProgress
                );
            }
            
            // FALLBACK TO STANDARD SINGLE-FILE LOADER
            const modelUrl = modelConfig.glbUrl || modelConfig;          // <-- Get URL from config or direct URL
            
            return new Promise((resolve, reject) => {
                
                if (!scene) {                                            // <-- Validate scene exists
                    reject(new Error('Scene is required'));
                    return;
                }
                
                if (!modelUrl) {                                         // <-- Validate model URL
                    reject(new Error('Model URL is required'));
                    return;
                }
                
                // DISPOSE PREVIOUS MODEL IF EXISTS
                if (this.currentModel) {                                 // <-- Clean up previous model
                    this.disposeModel(scene);
                }
                
                // SETUP PROGRESS CALLBACK
                BABYLON.SceneLoader.OnPluginActivatedObservable.addOnce((plugin) => {
                    if (plugin.name === 'gltf') {                        // <-- Check if GLTF plugin
                        plugin.onProgress = (event) => {                 // <-- Setup progress callback
                            if (event.lengthComputable) {
                                const progress = (event.loaded / event.total) * 100;
                                this.loadingProgress = progress;         // <-- Update progress
                                
                                if (onProgress) {                        // <-- Call progress callback
                                    onProgress(progress, event.loaded, event.total);
                                }
                            }
                        };
                    }
                });
                
                // LOAD MODEL FROM URL
                BABYLON.SceneLoader.ImportMesh(
                    '',                                                  // <-- Load all meshes
                    '',                                                  // <-- No base path
                    modelUrl,                                            // <-- Full URL to model
                    scene,                                               // <-- Target scene
                    (meshes, particleSystems, skeletons, animationGroups) => {
                        
                        this.currentModel = {                            // <-- Store model reference
                            meshes: meshes,
                            particleSystems: particleSystems,
                            skeletons: skeletons,
                            animationGroups: animationGroups
                        };
                        
                        // APPLY ROTATION FROM CONFIG
                        if (modelConfig.rotation) {                      // <-- Check if rotation is defined
                            this.applyModelRotation(meshes, modelConfig.rotation);
                        }
                        
                        console.log(`Model loaded: ${meshes.length} meshes`); // <-- Log success
                        resolve(this.currentModel);                      // <-- Resolve with model data
                    },
                    (event) => {
                        // PROGRESS HANDLER (fallback)
                        if (event.lengthComputable) {
                            const progress = (event.loaded / event.total) * 100;
                            this.loadingProgress = progress;
                            
                            if (onProgress) {
                                onProgress(progress, event.loaded, event.total);
                            }
                        }
                    },
                    (scene, message, exception) => {
                        // ERROR HANDLER
                        console.error('Error loading model:', message, exception);
                        reject(new Error(`Failed to load model: ${message}`));
                    }
                );
                
            });
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Dispose Current Model and Free Memory
        // ---------------------------------------------------------------
        disposeModel(scene) {
            if (!this.currentModel) {                                    // <-- Check if model exists
                return;
            }
            
            try {
                // DISPOSE MESHES
                if (this.currentModel.meshes) {                          // <-- Dispose all meshes
                    this.currentModel.meshes.forEach(mesh => {
                        if (mesh && mesh.dispose) {
                            mesh.dispose();
                        }
                    });
                }
                
                // DISPOSE PARTICLE SYSTEMS
                if (this.currentModel.particleSystems) {                 // <-- Dispose particle systems
                    this.currentModel.particleSystems.forEach(ps => {
                        if (ps && ps.dispose) {
                            ps.dispose();
                        }
                    });
                }
                
                // DISPOSE SKELETONS
                if (this.currentModel.skeletons) {                       // <-- Dispose skeletons
                    this.currentModel.skeletons.forEach(skeleton => {
                        if (skeleton && skeleton.dispose) {
                            skeleton.dispose();
                        }
                    });
                }
                
                // STOP ANIMATIONS
                if (this.currentModel.animationGroups) {                 // <-- Stop animations
                    this.currentModel.animationGroups.forEach(ag => {
                        if (ag && ag.dispose) {
                            ag.dispose();
                        }
                    });
                }
                
                this.currentModel = null;                                // <-- Clear model reference
                this.loadingProgress = 0;                                // <-- Reset progress
                
                console.log('Model disposed successfully');              // <-- Log disposal
                
            } catch (error) {
                console.error('Error disposing model:', error);          // <-- Log error
            }
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Apply Rotation to Model from Configuration
        // ---------------------------------------------------------------
        applyModelRotation(meshes, rotation) {
            if (!meshes || meshes.length === 0) {                        // <-- Validate meshes
                return;
            }
            
            // CONVERT DEGREES TO RADIANS
            const degreesToRadians = (degrees) => degrees * (Math.PI / 180);
            
            const rotateX = rotation.rotateX ? degreesToRadians(rotation.rotateX) : 0;  // <-- X rotation in radians
            const rotateY = rotation.rotateY ? degreesToRadians(rotation.rotateY) : 0;  // <-- Y rotation in radians
            const rotateZ = rotation.rotateZ ? degreesToRadians(rotation.rotateZ) : 0;  // <-- Z rotation in radians
            
            // APPLY ROTATION TO ALL MESHES
            meshes.forEach(mesh => {
                if (mesh && mesh.rotation) {                             // <-- Check if mesh has rotation
                    mesh.rotation.x += rotateX;                          // <-- Apply X rotation
                    mesh.rotation.y += rotateY;                          // <-- Apply Y rotation
                    mesh.rotation.z += rotateZ;                          // <-- Apply Z rotation
                }
            });
            
            console.log(`Model rotation applied: X=${rotation.rotateX}°, Y=${rotation.rotateY}°, Z=${rotation.rotateZ}°`);
        },
        // ---------------------------------------------------------------
        
        
        // HELPER FUNCTION | Calculate File Size from Loaded Bytes
        // ---------------------------------------------------------------
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';                           // <-- Handle zero bytes
            
            const k = 1024;                                              // <-- Kilobyte constant
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];                   // <-- Size units
            const i = Math.floor(Math.log(bytes) / Math.log(k));        // <-- Calculate unit index
            
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]; // <-- Format size
        },
        // ---------------------------------------------------------------
        
        
        // FUNCTION | Auto-Frame Camera to Model Bounds
        // ---------------------------------------------------------------
        autoFrameModel(scene, camera) {
            if (!this.currentModel || !this.currentModel.meshes) {      // <-- Validate model exists
                return;
            }
            
            const meshes = this.currentModel.meshes.filter(m => m.getTotalVertices() > 0);
            
            if (meshes.length === 0) {                                   // <-- Check if meshes exist
                return;
            }
            
            // CALCULATE BOUNDING BOX
            const boundingInfo = meshes[0].getBoundingInfo();            // <-- Get first mesh bounds
            let min = boundingInfo.boundingBox.minimumWorld.clone();
            let max = boundingInfo.boundingBox.maximumWorld.clone();
            
            meshes.forEach(mesh => {                                     // <-- Expand bounds for all meshes
                const meshBounds = mesh.getBoundingInfo().boundingBox;
                min = BABYLON.Vector3.Minimize(min, meshBounds.minimumWorld);
                max = BABYLON.Vector3.Maximize(max, meshBounds.maximumWorld);
            });
            
            const center = BABYLON.Vector3.Center(min, max);             // <-- Calculate center
            const radius = BABYLON.Vector3.Distance(min, max) / 2;       // <-- Calculate radius
            
            // SET CAMERA TARGET AND RADIUS
            camera.target = center;                                      // <-- Focus on model center
            camera.radius = radius * 2;                                  // <-- Set appropriate zoom distance
            
            console.log('Camera framed to model bounds');                // <-- Log framing
        }
        // ---------------------------------------------------------------
    };

// endregion -------------------------------------------------------------------

