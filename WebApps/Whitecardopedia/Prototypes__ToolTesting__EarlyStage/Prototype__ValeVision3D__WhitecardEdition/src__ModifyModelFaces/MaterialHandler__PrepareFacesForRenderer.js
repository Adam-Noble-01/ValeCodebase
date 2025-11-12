// -----------------------------------------------------------------------------
// MATERIAL HANDLER | Prepare Faces for Renderer - Material Configuration
// -----------------------------------------------------------------------------
//
// FILE       : MaterialHandler__PrepareFacesForRenderer.js
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Configure materials for proper rendering with rear face support
//              and selective transparency control based on material naming
// CREATED    : 2025
//
// DESCRIPTION:
// - Disables back face culling on all materials for two-sided rendering
// - Applies white color and removes textures from all materials
// - Recognizes materials with "__TRANSPARENT" suffix and preserves their opacity
// - Forces all other materials to be fully opaque (alpha = 1.0)
// - Configures proper transparency modes for correct rendering
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Rear Face Rendering Configuration
// -----------------------------------------------------------------------------

    // FUNCTION | Configure Rear Face Rendering for Material
    // ------------------------------------------------------------
    function configureRearFaceRendering(material) {
        if (!material) return false;                                      // <-- Validate material exists
        
        material.backFaceCulling = false;                                 // <-- Disable culling for two-sided rendering
        return true;                                                      // <-- Return success
    }
    // ---------------------------------------------------------------


    // FUNCTION | Apply White Material Properties
    // ------------------------------------------------------------
    function applyWhiteMaterialProperties(material) {
        if (!material) return false;                                      // <-- Validate material exists
        
        const whiteColor = new BABYLON.Color3(1, 1, 1);                  // <-- RGB 255,255,255
        
        // Handle PBRMaterial (GLB/GLTF files use this)
        // ------------------------------------------------------------
        if (material instanceof BABYLON.PBRMaterial) {
            material.albedoTexture = null;                                // <-- Remove texture
            material.albedoColor = whiteColor;                            // <-- Apply white color
            material.metallic = 0.0;                                      // <-- Non-metallic
            material.roughness = 1.0;                                     // <-- Fully rough (matte)
            return true;                                                  // <-- Return success
        }
        
        // Handle StandardMaterial
        // ------------------------------------------------------------
        else if (material instanceof BABYLON.StandardMaterial) {
            material.diffuseTexture = null;                               // <-- Remove texture
            material.diffuseColor = whiteColor;                           // <-- Apply white color
            return true;                                                  // <-- Return success
        }
        
        return false;                                                     // <-- Unsupported material type
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Opacity and Transparency Handler
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Check if Material Name Indicates Transparency
    // ------------------------------------------------------------
    function isTransparentMaterial(material) {
        if (!material || !material.name) return false;                   // <-- Validate material and name exist
        return material.name.endsWith('__TRANSPARENT');                   // <-- Check for transparency suffix
    }
    // ---------------------------------------------------------------


    // FUNCTION | Configure Material Opacity and Transparency Mode
    // ------------------------------------------------------------
    function configureMaterialOpacity(material) {
        if (!material) return false;                                      // <-- Validate material exists
        
        // Only handle PBRMaterial (GLB/GLTF materials)
        // ------------------------------------------------------------
        if (!(material instanceof BABYLON.PBRMaterial)) {
            return false;                                                 // <-- Skip non-PBR materials
        }
        
        const isTransparent = isTransparentMaterial(material);            // <-- Check for transparency suffix
        const originalAlpha = material.alpha || 1.0;                      // <-- Store original alpha value
        
        if (isTransparent) {
            // PRESERVE TRANSPARENCY FOR MATERIALS WITH __TRANSPARENT SUFFIX
            // ------------------------------------------------------------
            material.alpha = originalAlpha;                              // <-- Preserve GLB alpha value
            material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;  // <-- Enable alpha blending
            material.separateCullingPass = true;                          // <-- Separate culling pass for correct render order
            
            // Disable depth write for highly transparent materials
            // ------------------------------------------------------------
            if (originalAlpha < 0.9) {
                material.disableDepthWrite = true;                       // <-- Prevent depth artifacts on very transparent materials
            }
            
            console.log(`Preserved transparency for material: ${material.name} (alpha: ${originalAlpha})`);
            return true;                                                  // <-- Return success
        }
        else {
            // FORCE FULLY OPAQUE FOR STANDARD MATERIALS
            // ------------------------------------------------------------
            material.alpha = 1.0;                                         // <-- Force fully opaque
            material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;  // <-- Set opaque mode
            return true;                                                  // <-- Return success
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Material Preparation Function
// -----------------------------------------------------------------------------

    // FUNCTION | PrepareFacesForRenderer - Main function to configure all materials
    // ------------------------------------------------------------
    function PrepareFacesForRenderer(targetScene) {
        // Validate scene parameter
        // ------------------------------------------------------------
        if (!targetScene) {
            console.warn('PrepareFacesForRenderer: No scene provided');
            return 0;
        }
        
        let modifiedCount = 0;                                            // <-- Counter for modified materials
        
        // Process all meshes in the scene
        // ------------------------------------------------------------
        targetScene.meshes.forEach(mesh => {
            if (mesh.material) {
                // Configure rear face rendering
                // ------------------------------------------------------------
                configureRearFaceRendering(mesh.material);                // <-- Disable back face culling
                
                // Apply white material properties
                // ------------------------------------------------------------
                if (applyWhiteMaterialProperties(mesh.material)) {        // <-- Apply white color and remove textures
                    modifiedCount++;                                      // <-- Increment counter
                }
                
                // Configure opacity and transparency
                // ------------------------------------------------------------
                configureMaterialOpacity(mesh.material);                  // <-- Set opacity based on material name
            }
        });
        
        console.log(`PrepareFacesForRenderer: Configured ${modifiedCount} material(s)`);
        return modifiedCount;                                              // <-- Return count of modified materials
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Auto-Initialization
// -----------------------------------------------------------------------------

    // AUTO-INITIALIZATION | Automatically apply to scene when loaded
    // ------------------------------------------------------------
    setTimeout(() => {
        if (typeof scene !== 'undefined') {
            PrepareFacesForRenderer(scene);                                // <-- Apply material configuration
        }
    }, 200);                                                              // <-- Wait 200ms for scene to be ready

// endregion -------------------------------------------------------------------

