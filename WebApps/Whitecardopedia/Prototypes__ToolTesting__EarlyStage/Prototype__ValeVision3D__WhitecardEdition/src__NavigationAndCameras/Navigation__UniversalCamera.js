// --------------------------------------------------------
// NAVIGATION SYSTEM | UniversalCamera FPS-style navigation
// --------------------------------------------------------


// #Region ------------------------------------------------
// CONFIGURATION | Navigation settings and constants
// --------------------------------------------------------

// Movement Speed Settings
// ------------------------------------
const NAV_SPEED_MPH                = 2.0;                                        // <-- Movement speed in miles per hour
const NAV_SPEED_MULTIPLIER         = 3.0;                                        // <-- Speed multiplier when Shift is held


// Camera Control Settings
// ------------------------------------
const NAV_ANGULAR_SENSITIVITY      = 1000;                                       // <-- Mouse rotation sensitivity (higher = less sensitive)
const NAV_INERTIA                  = 0.5;                                        // <-- Movement smoothing (0 = no smoothing, 1 = maximum smoothing)


// Mouse Navigation Settings
// ------------------------------------
const NAV_MOUSE_ROTATION_SENSITIVITY       = 0.002;                               // <-- Left-click rotation sensitivity (radians per pixel)
const NAV_MOUSE_PAN_SPEED                  = 0.01;                                // <-- Right-click panning speed multiplier
const NAV_MOUSE_AGGRESSIVE_PAN_MULTIPLIER  = 2.5;                                // <-- Pan speed multiplier when both buttons held
const NAV_MOUSE_ZOOM_SPEED                 = 0.5;                                // <-- Middle mouse scroll zoom speed (units per scroll step)


// Physics and Collision Settings
// ------------------------------------
const NAV_ENABLE_COLLISION         = false;                                       // <-- Enable collision detection
const NAV_COLLISION_ELLIPSOID      = new BABYLON.Vector3(1.5, 0.7, 1.5);         // <-- Collision bubble size (X=width, Y=height, Z=depth) - Default: (0.5, 1, 0.5)
const NAV_ENABLE_GRAVITY           = false;                                      // <-- Enable gravity


// Initial Camera Transform
// ------------------------------------3
    // Hex Manor Model
    // const NAV_INITIAL_POSITION         = new BABYLON.Vector3(65.09, 1.67, 49.55);    // <-- Initial camera position
    // const NAV_INITIAL_ROTATION         = new BABYLON.Vector3(0.0268, -0.7724, 0);    // <-- Initial camera rotation (Vector3 in radians: pitch, yaw, roll)

const NAV_INITIAL_POSITION         = new BABYLON.Vector3(5.06, 1.87, -1.57);     // <-- Initial camera position
const NAV_INITIAL_ROTATION         = new BABYLON.Vector3(0.0194, 0.6157, 0.0000); // <-- Initial camera rotation (Vector3 in radians: pitch, yaw, roll)
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

    // Configure camera keyboard controls (WASD movement)
    // ------------------------------------
    // Note: attachControl enables keyboard input, but we'll replace mouse input with custom handlers
    camera.attachControl(canvas, true);                         // <-- Enable keyboard control (mouse will be replaced)


    // Setup custom Polycam-style mouse controls
    // ------------------------------------
    setupCustomMouseControls(camera, canvas);                    // <-- Replace default mouse input with custom handlers


    // Ensure rotation is applied after controls attached (in case it resets)
    // ------------------------------------
    setTimeout(() => {
        camera.rotation = NAV_INITIAL_ROTATION.clone();         // <-- Re-apply rotation after controls attached
    }, 0);


    // Configure WASD keyboard controls
    // ------------------------------------
    camera.keysUp      = [87, 38];                             // <-- W key and Arrow Up for forward
    camera.keysDown    = [83, 40];                             // <-- S key and Arrow Down for backward
    camera.keysLeft    = [65, 37];                             // <-- A key and Arrow Left for left
    camera.keysRight   = [68, 39];                             // <-- D key and Arrow Right for right


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
    camera.ellipsoid = NAV_COLLISION_ELLIPSOID;                   // <-- Set collision bubble size
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




    return camera;                                              // <-- Return camera reference
}
// --------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// ARROW KEY NAVIGATION | Alternative keyboard controls for arrow key users
// --------------------------------------------------------

    // FUNCTION | Configure Arrow Key Controls - Add arrow keys as alternative to WASD
    // ------------------------------------------------------------
    function configureArrowKeyControls(camera) {
        // Arrow keys duplicate WASD functionality for users who prefer arrow key navigation
        // ------------------------------------
        // Note: Arrow keys are already added to WASD arrays in setupUniversalCamera
        // This region documents the arrow key support and provides configuration reference
        // Arrow Up (38)    = Forward (same as W)
        // Arrow Down (40)  = Backward (same as S)
        // Arrow Left (37)  = Left (same as A)
        // Arrow Right (39) = Right (same as D)
    }
    // ------------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// MOUSE NAVIGATION | Custom Polycam-style mouse controls
// --------------------------------------------------------

    // HELPER FUNCTION | Handle Pointer Down Event - Track mouse button states
    // ------------------------------------------------------------
    function handlePointerDown(event, buttonState) {
        if (event.button === 0) {                                 // <-- Left mouse button
            buttonState.isLeftPressed = true;
        } else if (event.button === 2) {                          // <-- Right mouse button
            buttonState.isRightPressed = true;
        }
        buttonState.previousPosition = {                          // <-- Store initial mouse position
            x: event.clientX,
            y: event.clientY
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Pointer Up Event - Clear button states
    // ------------------------------------------------------------
    function handlePointerUp(event, buttonState) {
        if (event.button === 0) {                                 // <-- Left mouse button released
            buttonState.isLeftPressed = false;
        } else if (event.button === 2) {                          // <-- Right mouse button released
            buttonState.isRightPressed = false;
        }
        if (!buttonState.isLeftPressed && !buttonState.isRightPressed) {
            buttonState.previousPosition = null;                  // <-- Clear position tracking when no buttons pressed
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Pointer Move Event - Apply rotation or panning based on button state
    // ------------------------------------------------------------
    function handlePointerMove(event, camera, buttonState) {
        if (!buttonState.previousPosition) return;                // <-- Exit if no initial position tracked

        const deltaX = event.clientX - buttonState.previousPosition.x;  // <-- Calculate horizontal mouse movement
        const deltaY = event.clientY - buttonState.previousPosition.y;  // <-- Calculate vertical mouse movement

        const isLeftOnly      = buttonState.isLeftPressed && !buttonState.isRightPressed;   // <-- Left button only
        const isRightOnly     = buttonState.isRightPressed && !buttonState.isLeftPressed;  // <-- Right button only
        const isBothButtons   = buttonState.isLeftPressed && buttonState.isRightPressed;   // <-- Both buttons held

        if (isLeftOnly) {
            // LEFT CLICK: Rotate camera (head rotation)
            // ------------------------------------
            camera.rotation.y += deltaX * NAV_MOUSE_ROTATION_SENSITIVITY;  // <-- Rotate yaw (horizontal)
            camera.rotation.x += deltaY * NAV_MOUSE_ROTATION_SENSITIVITY;  // <-- Rotate pitch (vertical)
        } else if (isRightOnly || isBothButtons) {
            // RIGHT CLICK OR BOTH BUTTONS: Pan camera
            // ------------------------------------
            const panSpeed = isBothButtons 
                ? NAV_MOUSE_PAN_SPEED * NAV_MOUSE_AGGRESSIVE_PAN_MULTIPLIER  // <-- Aggressive panning speed
                : NAV_MOUSE_PAN_SPEED;                                        // <-- Normal panning speed

            const rightVector = camera.getDirection(BABYLON.Vector3.Right());  // <-- Get camera right direction
            const upVector = camera.getDirection(BABYLON.Vector3.Up());        // <-- Get camera up direction

            camera.position.addInPlace(rightVector.scale(deltaX * panSpeed)); // <-- Pan horizontally
            camera.position.addInPlace(upVector.scale(-deltaY * panSpeed));    // <-- Pan vertically (inverted)
        }

        buttonState.previousPosition = {                          // <-- Update position for next frame
            x: event.clientX,
            y: event.clientY
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Mouse Wheel Event - Zoom camera in/out
    // ------------------------------------------------------------
    function handleMouseWheel(event, camera) {
        const delta = event.deltaY > 0 ? -1 : 1;                  // <-- Determine zoom direction (negative = zoom out, positive = zoom in)
        const forwardVector = camera.getDirection(BABYLON.Vector3.Forward());  // <-- Get camera forward direction
        camera.position.addInPlace(forwardVector.scale(delta * NAV_MOUSE_ZOOM_SPEED));  // <-- Move camera along forward vector
    }
    // ------------------------------------------------------------


    // FUNCTION | Setup Custom Mouse Controls - Remove default input and attach custom handlers
    // ------------------------------------------------------------
    function setupCustomMouseControls(camera, canvas) {
        // Remove default mouse input to prevent conflicts
        // ------------------------------------
        camera.inputs.removeByType("FreeCameraMouseInput");       // <-- Remove default mouse input handler

        // Initialize button state tracking
        // ------------------------------------
        const buttonState = {                                     // <-- Track mouse button states and position
            isLeftPressed: false,
            isRightPressed: false,
            previousPosition: null
        };

        // Create bound event handlers with camera and buttonState context
        // ------------------------------------
        const boundHandlePointerDown = (event) => {
            event.preventDefault();                                // <-- Prevent default browser behavior
            handlePointerDown(event, buttonState);
        };

        const boundHandlePointerUp = (event) => {
            event.preventDefault();                                // <-- Prevent default browser behavior
            handlePointerUp(event, buttonState);
        };

        const boundHandlePointerMove = (event) => {
            if (buttonState.isLeftPressed || buttonState.isRightPressed) {
                event.preventDefault();                            // <-- Prevent default only when buttons pressed
                handlePointerMove(event, camera, buttonState);
            }
        };

        const boundHandleMouseWheel = (event) => {
            event.preventDefault();                                // <-- Prevent default scroll behavior
            handleMouseWheel(event, camera);
        };

        // Attach event listeners to canvas
        // ------------------------------------
        canvas.addEventListener('pointerdown', boundHandlePointerDown);   // <-- Track mouse button presses
        canvas.addEventListener('pointerup', boundHandlePointerUp);       // <-- Track mouse button releases
        canvas.addEventListener('pointermove', boundHandlePointerMove);   // <-- Handle mouse movement
        canvas.addEventListener('wheel', boundHandleMouseWheel);         // <-- Handle mouse wheel zoom

        // Prevent context menu on right-click
        // ------------------------------------
        canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();                                // <-- Prevent right-click context menu
        });
    }
    // ------------------------------------------------------------

// #endregion ---------------------------------------------
