// --------------------------------------------------------
// LIGHTING SYSTEM | Scene lighting configuration
// --------------------------------------------------------


// #Region ------------------------------------------------
// CONFIGURATION | Lighting settings and constants
// --------------------------------------------------------
const LIGHT_HEMISPHERIC_INTENSITY     = 2.0;                                  // <-- Hemispheric light intensity
const LIGHT_DIRECTIONAL_INTENSITY     = 0.5;                                  // <-- Directional light intensity
const LIGHT_HEMISPHERIC_DIRECTION     = new BABYLON.Vector3(0, 1, 0);         // <-- Hemispheric light direction (upward)
const LIGHT_DIRECTIONAL_DIRECTION     = new BABYLON.Vector3(-1, -2, -1);      // <-- Directional light direction
const LIGHT_SCENE_AMBIENT_COLOR       = new BABYLON.Color3(1.0, 1.0, 1.0);    // <-- Scene ambient color (prevents pure black shadows)
const LIGHT_ENABLE_ENVIRONMENT        = true;                                 // <-- Enable/disable environment lighting
const LIGHT_ENVIRONMENT_INTENSITY     = 1.0;                                  // <-- Environment lighting intensity (if enabled)
const LIGHT_DISABLE_AUTO_ENVIRONMENT  = true;                                // <-- Disable automatic environment lighting from GLB loader
// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// HELPER FUNCTIONS | Utility functions for lighting
// --------------------------------------------------------

// FUNCTION | DisableAutomaticEnvironmentLighting - Prevents GLB loader from creating automatic environment lighting
// --------------------------------------------------------
function disableAutomaticEnvironmentLighting(scene) {
    if (!LIGHT_DISABLE_AUTO_ENVIRONMENT) return;


    // Store original environment state before model loading
    // ------------------------------------
    const originalEnvironment = scene.environmentTexture;
    const originalEnvironmentIntensity = scene.environmentIntensity;


    // Monitor for automatic environment creation
    // ------------------------------------
    const checkEnvironment = () => {
        if (scene.environmentTexture !== originalEnvironment) {
            // Remove automatic environment lighting
            // ------------------------------------
            scene.environmentTexture = null;
            scene.environmentIntensity = originalEnvironmentIntensity || 1.0;
        }
    };


    // Check immediately and after a short delay
    // ------------------------------------
    setTimeout(checkEnvironment, 100);
    setTimeout(checkEnvironment, 500);
    setTimeout(checkEnvironment, 1000);
}
// --------------------------------------------------------


// FUNCTION | SetupEnvironmentLighting - Configures environment lighting if enabled
// --------------------------------------------------------
function setupEnvironmentLighting(scene) {
    if (!LIGHT_ENABLE_ENVIRONMENT) {
        return null;
    }


    // Load neutral environment texture from Babylon.js CDN
    // ------------------------------------
    try {
        const envTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
            "https://assets.babylonjs.com/environments/environmentSpecular.env",
            scene
        );
        envTexture.name = "environmentTexture";
        envTexture.gammaSpace = false;
        scene.environmentTexture = envTexture;
        scene.environmentIntensity = LIGHT_ENVIRONMENT_INTENSITY;

        return scene.environmentTexture;
    } catch (error) {
        return null;
    }
}
// --------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// LIGHTING SETUP | Scene lighting creation and configuration
// --------------------------------------------------------

// FUNCTION | SetupSceneLighting - Creates and configures scene lighting
// --------------------------------------------------------
function setupSceneLighting(scene) {
    // Set scene ambient color (prevents pure black shadows)
    // ------------------------------------
    scene.ambientColor = LIGHT_SCENE_AMBIENT_COLOR;


    // Setup environment lighting (if enabled)
    // ------------------------------------
    setupEnvironmentLighting(scene);


    // Create HemisphericLight for ambient lighting
    // ------------------------------------
    const hemisphericLight = new BABYLON.HemisphericLight(
        'hemisphericLight',
        LIGHT_HEMISPHERIC_DIRECTION,
        scene
    );
    hemisphericLight.intensity = LIGHT_HEMISPHERIC_INTENSITY;


    // Create DirectionalLight for directional lighting
    // ------------------------------------
    const directionalLight = new BABYLON.DirectionalLight(
        'directionalLight',
        LIGHT_DIRECTIONAL_DIRECTION,
        scene
    );
    directionalLight.intensity = LIGHT_DIRECTIONAL_INTENSITY;


    return {
        hemisphericLight: hemisphericLight,
        directionalLight: directionalLight,
        environmentTexture: scene.environmentTexture
    };
}
// --------------------------------------------------------


// FUNCTION | CheckLightingAfterModelLoad - Verifies lighting state after model loading
// --------------------------------------------------------
function checkLightingAfterModelLoad(scene) {
    // Wait a moment for model to fully load
    // ------------------------------------
    setTimeout(() => {
        // Check and disable automatic environment if needed
        // ------------------------------------
        if (LIGHT_DISABLE_AUTO_ENVIRONMENT) {
            disableAutomaticEnvironmentLighting(scene);
        }
    }, 100);
}
// --------------------------------------------------------

// #endregion ---------------------------------------------

