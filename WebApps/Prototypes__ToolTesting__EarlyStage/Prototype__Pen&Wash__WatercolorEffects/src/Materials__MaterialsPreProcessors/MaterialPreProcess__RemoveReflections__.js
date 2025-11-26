// =============================================================================
// PEN & WASH WATERCOLOR EFFECTS - MATERIAL REFLECTION REMOVAL
// =============================================================================
//
// FILE       : MaterialPreProcess__RemoveReflections__.js
// NAMESPACE  : PenWashWatercolorEffects
// MODULE     : Material Preprocessing - Remove Reflections
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Remove all reflective attributes from GLB materials for flat rendering
// CREATED    : 2025
//
// DESCRIPTION:
// - Traverses all meshes in loaded GLB model and removes reflective properties
// - Sets materials to 100% flat/matte by removing roughness, metallic, and reflection
// - Handles both PBRMaterial (GLB standard) and StandardMaterial (fallback)
// - Ensures materials are completely non-reflective for watercolor rendering
// - Processes materials after model loading but before render loop
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Configuration Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Material Processing Configuration
    // ------------------------------------------------------------
    const REMOVE_REFLECTIVE_MATERIALS_ENABLED = true;                           // <-- Enable/disable reflection removal
    const FLAT_ROUGHNESS_VALUE                = 1.0;                            // <-- Fully rough = completely matte
    const FLAT_METALLIC_VALUE                 = 0.0;                            // <-- Non-metallic
    const FLAT_SPECULAR_POWER                 = 0;                              // <-- No specular highlights
    const FLAT_REFLECTIVITY_COLOR             = new BABYLON.Color3(0, 0, 0);    // <-- Black = no reflectivity
    const FLAT_SPECULAR_COLOR                 = new BABYLON.Color3(0, 0, 0);    // <-- Black = no specular
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Processing Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Process PBRMaterial - Removes all reflective properties
    // ------------------------------------------------------------
    function processPBRMaterial(material) {
        if (!material || !(material instanceof BABYLON.PBRMaterial)) {            // <-- Validate PBRMaterial
            return false;                                                         // <-- Return false if invalid
        }
        
        // Set roughness to maximum (fully rough = completely matte)
        // ------------------------------------
        material.roughness = FLAT_ROUGHNESS_VALUE;                                // <-- Set roughness to 1.0 (fully matte)
        
        // Set metallic to zero (non-metallic)
        // ------------------------------------
        material.metallic = FLAT_METALLIC_VALUE;                                   // <-- Set metallic to 0.0 (non-metallic)
        
        // Remove metallic texture
        // ------------------------------------
        if (material.metallicTexture) {                                            // <-- Check if metallic texture exists
            material.metallicTexture = null;                                       // <-- Remove metallic texture
        }
        
        // Remove roughness texture
        // ------------------------------------
        if (material.roughnessTexture) {                                            // <-- Check if roughness texture exists
            material.roughnessTexture = null;                                       // <-- Remove roughness texture
        }
        
        // Remove environment texture (environment reflections)
        // ------------------------------------
        if (material.environmentTexture) {                                         // <-- Check if environment texture exists
            material.environmentTexture = null;                                     // <-- Remove environment texture
        }
        
        // Remove reflection texture
        // ------------------------------------
        if (material.reflectionTexture) {                                          // <-- Check if reflection texture exists
            material.reflectionTexture = null;                                      // <-- Remove reflection texture
        }
        
        // Set reflectivity color to black (no reflectivity)
        // ------------------------------------
        material.reflectivityColor = FLAT_REFLECTIVITY_COLOR.clone();              // <-- Set reflectivity to black
        
        // Set microSurface (legacy roughness property) to maximum
        // ------------------------------------
        material.microSurface = FLAT_ROUGHNESS_VALUE;                              // <-- Set microSurface to 1.0 (fully matte)
        
        return true;                                                               // <-- Return success
    }
    // ------------------------------------------------------------
    
    // HELPER FUNCTION | Process StandardMaterial - Removes all reflective properties
    // ------------------------------------------------------------
    function processStandardMaterial(material) {
        if (!material || !(material instanceof BABYLON.StandardMaterial)) {        // <-- Validate StandardMaterial
            return false;                                                          // <-- Return false if invalid
        }
        
        // Set specular color to black (no specular highlights)
        // ------------------------------------
        material.specularColor = FLAT_SPECULAR_COLOR.clone();                     // <-- Set specular color to black
        
        // Set specular power to zero (no specular highlights)
        // ------------------------------------
        material.specularPower = FLAT_SPECULAR_POWER;                               // <-- Set specular power to 0
        
        // Remove reflection texture
        // ------------------------------------
        if (material.reflectionTexture) {                                          // <-- Check if reflection texture exists
            material.reflectionTexture = null;                                      // <-- Remove reflection texture
        }
        
        return true;                                                               // <-- Return success
    }
    // ------------------------------------------------------------
    
    // HELPER FUNCTION | Process Single Material - Routes to appropriate processor
    // ------------------------------------------------------------
    function processMaterial(material) {
        if (!material) {                                                           // <-- Check if material exists
            return false;                                                          // <-- Return false if no material
        }
        
        // Process PBRMaterial (GLB standard)
        // ------------------------------------
        if (material instanceof BABYLON.PBRMaterial) {                            // <-- Check if PBRMaterial
            return processPBRMaterial(material);                                    // <-- Process as PBRMaterial
        }
        
        // Process StandardMaterial (fallback)
        // ------------------------------------
        if (material instanceof BABYLON.StandardMaterial) {                        // <-- Check if StandardMaterial
            return processStandardMaterial(material);                               // <-- Process as StandardMaterial
        }
        
        // Unsupported material type
        // ------------------------------------
        console.warn(`Unsupported material type: ${material.constructor.name}`);    // <-- Warn about unsupported type
        return false;                                                              // <-- Return false for unsupported
    }
    // ------------------------------------------------------------
    
    // FUNCTION | Remove Reflections From Materials - Main processing function
    // ------------------------------------------------------------
    function removeReflectionsFromMaterials(scene) {
        if (!REMOVE_REFLECTIVE_MATERIALS_ENABLED) {                                         // <-- Check if processing is enabled
            console.log('⊘ Material reflection removal disabled by configuration');
            return 0;                                                              // <-- Return 0 if disabled
        }
        
        if (!scene) {                                                               // <-- Validate scene exists
            console.error('Cannot remove reflections: Scene is null or undefined');  // <-- Error if scene missing
            return 0;                                                               // <-- Return 0 on error
        }
        
        let processedCount = 0;                                                     // <-- Counter for processed materials
        let skippedCount = 0;                                                       // <-- Counter for skipped materials
        const processedMaterialNames = [];                                          // <-- Track processed material names
        
        // Traverse all meshes in scene
        // ------------------------------------
        const meshes = scene.meshes;                                                // <-- Get all meshes from scene
        
        meshes.forEach((mesh) => {                                                  // <-- Iterate through all meshes
            if (!mesh || !mesh.material) {                                          // <-- Check if mesh has material
                skippedCount++;                                                      // <-- Increment skipped count
                return;                                                             // <-- Skip meshes without materials
            }
            
            // Process material
            // ------------------------------------
            const material = mesh.material;                                         // <-- Get material from mesh
            const success = processMaterial(material);                              // <-- Process material
            
            if (success) {                                                          // <-- Check if processing succeeded
                processedCount++;                                                   // <-- Increment processed count
                const materialName = material.name || 'Unnamed';                   // <-- Get material name or default
                if (!processedMaterialNames.includes(materialName)) {              // <-- Check if name already tracked
                    processedMaterialNames.push(materialName);                      // <-- Add material name to list
                }
            } else {                                                                // <-- Processing failed
                skippedCount++;                                                      // <-- Increment skipped count
            }
        });
        
        // Log processing results
        // ------------------------------------
        console.log(`✓ Material reflection removal complete:`);                     // <-- Log completion message
        console.log(`  - Processed materials: ${processedCount}`);                 // <-- Log processed count
        console.log(`  - Skipped meshes: ${skippedCount}`);                        // <-- Log skipped count
        if (processedMaterialNames.length > 0) {                                    // <-- Check if materials were processed
            console.log(`  - Material names: ${processedMaterialNames.join(', ')}`); // <-- Log material names
        }
        
        return processedCount;                                                      // <-- Return count of processed materials
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Export
// -----------------------------------------------------------------------------

    // Export removeReflectionsFromMaterials to global scope for HTML access
    // ------------------------------------------------------------
    window.removeReflectionsFromMaterials = removeReflectionsFromMaterials;         // <-- Export main function to global scope
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

