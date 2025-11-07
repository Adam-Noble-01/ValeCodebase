// --------------------------------------------------------
// REAR FACE MATERIAL MODIFIER | Disables culling and applies white material
// --------------------------------------------------------


// #Region ------------------------------------------------
// REAR FACE MATERIAL MODIFIER | Targets all models and replaces rear face rendering
// --------------------------------------------------------

// FUNCTION | ModifyRearFaceMaterial - Disables back face culling and applies white material to all meshes
// --------------------------------------------------------
function ModifyRearFaceMaterial(targetScene) {
    // Validate scene parameter
    // ------------------------------------
    if (!targetScene) return 0;


    // Define white color for materials
    // ------------------------------------
    const whiteColor = new BABYLON.Color3(1, 1, 1);                    // <-- RGB 255,255,255
    let modifiedCount = 0;


    // Process all meshes in the scene
    // ------------------------------------
    targetScene.meshes.forEach(mesh => {
        if (mesh.material) {
            // Disable back face culling (shows both sides)
            // ------------------------------------
            mesh.material.backFaceCulling = false;                     // <-- Critical: Renders both front and back faces


            // Handle PBRMaterial (GLB/GLTF files use this)
            // ------------------------------------
            if (mesh.material instanceof BABYLON.PBRMaterial) {
                mesh.material.albedoTexture = null;                    // <-- Remove texture
                mesh.material.albedoColor = whiteColor;                // <-- Apply white color
                mesh.material.metallic = 0.0;                          // <-- Non-metallic
                mesh.material.roughness = 1.0;                         // <-- Fully rough (matte)
                modifiedCount++;
            }


            // Handle StandardMaterial
            // ------------------------------------
            else if (mesh.material instanceof BABYLON.StandardMaterial) {
                mesh.material.diffuseTexture = null;                   // <-- Remove texture
                mesh.material.diffuseColor = whiteColor;               // <-- Apply white color
                modifiedCount++;
            }
        }
    });


    return modifiedCount;
}
// --------------------------------------------------------

// #endregion ---------------------------------------------




// #Region ------------------------------------------------
// AUTO-INITIALIZATION | Automatically apply to scene when loaded
// --------------------------------------------------------

// Wait for scene to be available
// ------------------------------------
setTimeout(() => {
    if (typeof scene !== 'undefined') {
        ModifyRearFaceMaterial(scene);
    }
}, 200);

// #endregion ---------------------------------------------

