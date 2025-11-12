// --------------------------------------------------------
// MODEL LOADER | Load GLB model from CDN
// --------------------------------------------------------


// #Region ------------------------------------------------
// MODEL LOADER | Load GLB model from CDN
// --------------------------------------------------------
// const glbModelUrl = 'https://cdn.noble-architecture.com/VaApps/3dAssets/Test__SketchUpExport__UsingOwnGlbExporter__4.5.0__.glb';
// const glbModelUrl = 'https://cdn.noble-architecture.com/VaApps/3dAssets/Test__SketchUpExport__UsingOwnGlbExporter__BallJob__1.5.0__.glb';
const glbModelUrl = 'https://cdn.noble-architecture.com/VaApps/3dAssets/HexBigConservatory__SketchUpExport__1.2.0__.glb';
// const glbModelUrl = 'https://cdn.noble-architecture.com/VaApps/3dAssets/PlumblyClegg__WebLiveModel__.1.0.0__.glb';
let loadedMeshes = [];
let loadedModelRoot = null;


// FUNCTION | LoadGLBModel - Asynchronously loads GLB model from CDN
// --------------------------------------------------------
async function loadGLBModel() {
    try {
        // Store environment state before loading (to detect automatic creation)    
        // ------------------------------------
        const environmentBeforeLoad = scene.environmentTexture;
        const environmentIntensityBeforeLoad = scene.environmentIntensity;


        // Load all meshes from the GLB file
        // ------------------------------------
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            '',                    // Import all meshes (empty string = all)
            '',                    // Base URL (empty since using full URL)
            glbModelUrl,           // Full URL to GLB file
            scene                  // Target scene
        );


        // Check if GLB loader created automatic environment lighting
        // ------------------------------------
        const environmentAfterLoad = scene.environmentTexture;
        if (environmentAfterLoad !== environmentBeforeLoad) {
            console.warn('=== GLB Loader Created Automatic Environment Lighting ===');
            console.warn('Automatic environment lighting detected after model load');
            console.warn('This may conflict with manual lighting setup');
            
            // Disable automatic environment if configured
            // ------------------------------------
            if (typeof LIGHT_DISABLE_AUTO_ENVIRONMENT !== 'undefined' && LIGHT_DISABLE_AUTO_ENVIRONMENT === true) {
                console.log('Removing automatic environment lighting...');
                scene.environmentTexture = environmentBeforeLoad;
                scene.environmentIntensity = environmentIntensityBeforeLoad || 1.0;
                console.log('Automatic environment lighting removed');
            }
            console.warn('===========================================================');
        }


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


        // Enable collision detection on loaded meshes (front and back faces)
        // ------------------------------------
        loadedMeshes.forEach(mesh => {
            if (mesh) {
                mesh.checkCollisions = true;                          // <-- Enable collision detection
                
                // Enable two-sided collision by ensuring geometry considers both faces
                // ------------------------------------
                if (mesh.geometry) {
                    // Force mesh to use double-sided collision
                    mesh.sideOrientation = BABYLON.Mesh.DOUBLESIDE;
                }
            }
        });
        console.log('Collision detection enabled (two-sided) on', loadedMeshes.length, 'meshes');


        // Check lighting state after model load
        // ------------------------------------
        if (typeof checkLightingAfterModelLoad === 'function') {
            checkLightingAfterModelLoad(scene);
        }


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
