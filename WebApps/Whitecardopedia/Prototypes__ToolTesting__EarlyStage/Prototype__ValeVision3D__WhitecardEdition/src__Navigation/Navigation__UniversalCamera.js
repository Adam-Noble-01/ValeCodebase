// --------------------------------------------------------
// NAVIGATION SYSTEM | UniversalCamera FPS-style navigation
// --------------------------------------------------------


// #Region ------------------------------------------------
// CONFIGURATION | Navigation settings and constants
// --------------------------------------------------------
const NAV_SPEED_MPH                = 2.0;                                        // <-- Movement speed in miles per hour
const NAV_SPEED_MULTIPLIER         = 3.0;                                        // <-- Speed multiplier when Shift is held
const NAV_ANGULAR_SENSITIVITY      = 1000;                                       // <-- Mouse rotation sensitivity (higher = less sensitive)
const NAV_INERTIA                  = 0.5;                                        // <-- Movement smoothing (0 = no smoothing, 1 = maximum smoothing)
const NAV_ENABLE_COLLISION         = false;                                      // <-- Enable collision detection
const NAV_ENABLE_GRAVITY           = false;                                      // <-- Enable gravity
const NAV_INITIAL_POSITION         = new BABYLON.Vector3(37.25, 2.09, -2.39);    // <-- Initial camera position
const NAV_INITIAL_ROTATION         = new BABYLON.Vector3(0.0045, -0.7470, 0);    // <-- Initial camera rotation (Vector3 in radians: pitch, yaw, roll)
const NAV_INITIAL_TARGET           = new BABYLON.Vector3(0, 0, 0);               // <-- Initial camera target
// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// HELPER FUNCTIONS | Utility functions for navigation
// --------------------------------------------------------

// FUNCTION | ConvertMPHtoBabylonSpeed - Converts MPH to Babylon.js units per second
// --------------------------------------------------------
function convertMPHtoBabylonSpeed(mph) {
    // Babylon.js uses units per second
    // 1 mph = 0.44704 meters/second
    // Assuming 1 Babylon unit = 1 meter
    const metersPerSecond = mph * 0.44704;                    // <-- Convert MPH to m/s
    return metersPerSecond;                                    // <-- Return Babylon speed
}
// --------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// CAMERA SETUP | UniversalCamera creation and configuration
// --------------------------------------------------------

// FUNCTION | SetupUniversalCamera - Creates and configures UniversalCamera with FPS controls
// --------------------------------------------------------
function setupUniversalCamera(scene, canvas) {

    // --------------------------------------------------------
    // CAMERA CREATION | Initialize UniversalCamera instance
    // --------------------------------------------------------
    const camera = new BABYLON.UniversalCamera(
        "fpsCamera",                                            // <-- Camera name
        NAV_INITIAL_POSITION,                                   // <-- Initial position
        scene                                                   // <-- Parent scene
    );


    // Set initial camera rotation (before attaching controls)
    // ------------------------------------
    camera.rotation = NAV_INITIAL_ROTATION.clone();             // <-- Set initial rotation (Vector3 in radians)


    // --------------------------------------------------------
    // CAMERA CONTROLS | Mouse and keyboard input configuration
    // --------------------------------------------------------

    // Configure camera mouse controls
    // ------------------------------------
    // Note: setTarget() is not used when setting specific rotation
    camera.attachControl(canvas, true);                         // <-- Enable mouse control


    // Ensure rotation is applied after attachControl (in case it resets)
    // ------------------------------------
    setTimeout(() => {
        camera.rotation = NAV_INITIAL_ROTATION.clone();         // <-- Re-apply rotation after controls attached
    }, 0);


    // Configure WASD keyboard controls
    // ------------------------------------
    camera.keysUp      = [87];                                 // <-- W key for forward
    camera.keysDown    = [83];                                 // <-- S key for backward
    camera.keysLeft    = [65];                                 // <-- A key for left
    camera.keysRight   = [68];                                 // <-- D key for right


    // Configure Q/E vertical navigation controls
    // ------------------------------------
    camera.keysUpward     = [69];                              // <-- E key for up
    camera.keysDownward   = [81];                              // <-- Q key for down


    // --------------------------------------------------------
    // CAMERA PHYSICS | Movement speed, rotation, collision, and gravity
    // --------------------------------------------------------

    // Configure movement and rotation speeds
    // ------------------------------------
    const baseSpeed = convertMPHtoBabylonSpeed(NAV_SPEED_MPH);  // <-- Base speed in Babylon units
    camera.speed = baseSpeed;                                     // <-- Set initial speed
    camera.angularSensibility = NAV_ANGULAR_SENSITIVITY;          // <-- Set mouse sensitivity
    camera.inertia = NAV_INERTIA;                                 // <-- Set movement smoothing


    // Configure collision and gravity
    // ------------------------------------
    camera.checkCollisions = NAV_ENABLE_COLLISION;                // <-- Enable/disable collision detection
    camera.applyGravity = NAV_ENABLE_GRAVITY;                    // <-- Enable/disable gravity


    // --------------------------------------------------------
    // SPEED BOOST SYSTEM | Shift key speed multiplier handling
    // --------------------------------------------------------

    // FUNCTION | UpdateCameraSpeed - Updates camera speed based on Shift key state
    // --------------------------------------------------------
    function updateCameraSpeed(isShiftPressed) {
        if (isShiftPressed) {
            camera.speed = baseSpeed * NAV_SPEED_MULTIPLIER;      // <-- Apply speed multiplier when Shift held
        } else {
            camera.speed = baseSpeed;                              // <-- Reset to base speed when Shift released
        }
    }
    // --------------------------------------------------------


    // Track Shift key state for speed boost
    // ------------------------------------
    let isShiftPressed = false;


    // Add keyboard event listeners for Shift key
    // ------------------------------------
    const handleKeyDown = (event) => {
        if (event.key === 'Shift' || event.keyCode === 16) {
            if (!isShiftPressed) {
                isShiftPressed = true;
                updateCameraSpeed(true);
            }
        }
    };


    const handleKeyUp = (event) => {
        if (event.key === 'Shift' || event.keyCode === 16) {
            if (isShiftPressed) {
                isShiftPressed = false;
                updateCameraSpeed(false);
            }
        }
    };


    // Attach keyboard event listeners
    // ------------------------------------
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);


    // --------------------------------------------------------
    // LOGGING | Camera configuration debug output
    // --------------------------------------------------------
    console.log('=== UniversalCamera Navigation Setup ===');
    console.log(`Initial Position: (${NAV_INITIAL_POSITION.x.toFixed(2)}, ${NAV_INITIAL_POSITION.y.toFixed(2)}, ${NAV_INITIAL_POSITION.z.toFixed(2)})`);
    console.log(`Initial Rotation: (${NAV_INITIAL_ROTATION.x.toFixed(4)}, ${NAV_INITIAL_ROTATION.y.toFixed(4)}, ${NAV_INITIAL_ROTATION.z.toFixed(4)}) radians`);
    console.log(`Current Rotation: (${camera.rotation.x.toFixed(4)}, ${camera.rotation.y.toFixed(4)}, ${camera.rotation.z.toFixed(4)}) radians`);
    console.log(`Speed: ${NAV_SPEED_MPH} MPH (${camera.speed.toFixed(3)} units/sec)`);
    console.log(`Angular Sensitivity: ${camera.angularSensibility}`);
    console.log(`Inertia: ${camera.inertia}`);
    console.log(`Collision: ${camera.checkCollisions}`);
    console.log(`Gravity: ${camera.applyGravity}`);
    console.log(`Controls: WASD = Move | Q = Down | E = Up | Mouse = Look | Shift = Speed Boost (${NAV_SPEED_MULTIPLIER}x)`);
    console.log('========================================');


    return camera;                                              // <-- Return camera reference
}
// --------------------------------------------------------

// #endregion ---------------------------------------------
