// --------------------------------------------------------
// MODEL LOADER | Load GLB model from CDN
// --------------------------------------------------------


// #Region ------------------------------------------------
// MODEL LOADER | Load GLB model from CDN
// --------------------------------------------------------
const glbModelUrl = 'https://cdn.noble-architecture.com/VaApps/3dAssets/Test__SketchUpExport__UsingOwnGlbExporter__4.3.0__.glb';
let loadedMeshes = [];
let loadedModelRoot = null;


// FUNCTION | LoadGLBModel - Asynchronously loads GLB model from CDN
// --------------------------------------------------------
async function loadGLBModel() {
    try {
        // Load all meshes from the GLB file
        // ------------------------------------
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            '',                    // Import all meshes (empty string = all)
            '',                    // Base URL (empty since using full URL)
            glbModelUrl,           // Full URL to GLB file
            scene                  // Target scene
        );


        // Store loaded meshes and root node
        // ------------------------------------
        loadedMeshes = result.meshes;
        loadedModelRoot = result.meshes[0]; // First mesh is typically the root


        // CUSTOM NAME | Rename root node
        // ------------------------------------
        if (loadedModelRoot) {
            loadedModelRoot.name = 'ValeVision__MainModel__ModelRoot';      // <--Change from default "__root__" to custom name
        }


        // Correct SketchUp handedness (right-handed to left-handed conversion)
        // ------------------------------------
        // SketchUp uses right-handed coordinate system, Babylon.js uses left-handed
        // Flip Z-axis on root node to mirror the model and fix inverted appearance
        // ALTERNATIVE METHOD: Set scene.useRightHandedSystem = true; when creating scene
        if (loadedModelRoot) {
            loadedModelRoot.position = new BABYLON.Vector3(0, 0, 0);
            loadedModelRoot.scaling  = new BABYLON.Vector3(1, 1, -1);  // Negative Z flips the model
            loadedModelRoot.rotation = new BABYLON.Vector3(0, 0, 0);
        }


        // Log success
        // ------------------------------------
        console.log('GLB model loaded successfully:', loadedMeshes.length, 'meshes');


        // Change material colors after model loads
        // ------------------------------------
        if (typeof TargetElement__ChangeMaterialColors === 'function') {
            setTimeout(() => {
                const count = TargetElement__ChangeMaterialColors(scene);
                console.log(`Changed ${count} material(s) to white`);
            }, 100);
        }


        return result;

        
    // Error handling
    // ------------------------------------
    } catch (error) {
        console.error('Error loading GLB model:', error);
        throw error;
    }
}
// --------------------------------------------------------
// #endregion ---------------------------------------------

// #Region ------------------------------------------------
// Initialize model loading
// ------------------------------------
loadGLBModel();

// #endregion ---------------------------------------------
