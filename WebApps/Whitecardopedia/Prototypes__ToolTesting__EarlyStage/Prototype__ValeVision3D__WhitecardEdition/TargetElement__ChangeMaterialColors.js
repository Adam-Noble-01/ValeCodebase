// #Region ------------------------------------------------
// MATERIAL COLOR CHANGER | Changes specific material colors to white
// --------------------------------------------------------

// FUNCTION | TargetElement__ChangeMaterialColors - Changes material colors to white (RGB 255,255,255)
// --------------------------------------------------------
function TargetElement__ChangeMaterialColors(ValeVision__MainModel__ModelRoot) {
    // Define target material names and white color
    // ------------------------------------
    const targetMaterialNames = ["85__WhiteCard__Glass", "85__GroundPlane"];
    const whiteColor = new BABYLON.Color3(0, 0, 0); // RGB 255,255,255
    let changedCount = 0;


    // Change each target material
    // ------------------------------------
    targetMaterialNames.forEach(materialName => {
        const material = scene.getMaterialByName(materialName);
        if (material) {
            // PBRMaterial (GLB/GLTF files use this)
            // ------------------------------------
            if (material instanceof BABYLON.PBRMaterial) {
                material.albedoTexture = null;
                material.albedoColor = whiteColor;
                material.metallic = 0.0;
                material.roughness = 1.0;
                changedCount++;
            }
            // StandardMaterial
            // ------------------------------------
            else if (material instanceof BABYLON.StandardMaterial) {
                material.diffuseTexture = null;
                material.diffuseColor = whiteColor;
                changedCount++;
            }
        }
    });


    return changedCount;
}
// --------------------------------------------------------

// #endregion ---------------------------------------------

