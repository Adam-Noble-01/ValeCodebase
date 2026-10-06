// =============================================================================
// VALEVISION3D - ORBIT MODE NAVIGATION SYSTEM LOGIC
// =============================================================================
//
// FILE       : Na__Navmode__OrbitMode__SystemLogic.js
// NAMESPACE  : Na__Navmode
// MODULE     : Orbit Mode Navigation - System Logic
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Orbit mode controls with optional WASD keyboard movement
// CREATED    : 10-Jun-2026
//
// DESCRIPTION:
// - Provides the default orbit navigation mode for architectural model viewing.
// - Wraps Three.js OrbitControls with configurable damping and zoom distance clamps.
// - Optionally enables WASD + Q/E keyboard movement for desktop exploration.
// - Returns a controls bundle: controls, updateNavigation, and dispose.
// - Completely separate from walk and fly mode systems.
//
// INTEGRATION:
// - Call Na__Navmode__InitializeControls(camera, domElement, customConfig) after
//   the renderer canvas is ready.
// - Call updateNavigation() every frame in the render loop.
// - Call dispose() when tearing down the navigation bundle.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Jun-2026 - Version 1.0.0
// - Initial implementation of orbit mode navigation system logic.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Controls and Math
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Default Navigation Configuration
    // ------------------------------------------------------------
    const Na__Navmode__DefaultConfig = {
        enableDamping  : false,                                        // <-- Orbit control damping
        enableWASD     : false,                                        // <-- Optional WASD fly movement
        movementSpeed  : 0.5,                                          // <-- Horizontal speed (units per tick)
        elevationSpeed : 0.5,                                          // <-- Vertical speed (units per tick)
        minDistance    : null,                                         // <-- Orbit min distance (units)
        maxDistance    : null                                          // <-- Orbit max distance (units)
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | WASD Keyboard State
    // ------------------------------------------------------------
    const Na__Navmode__KeyState = {
        w : false,                                                     // <-- Forward
        a : false,                                                     // <-- Strafe left
        s : false,                                                     // <-- Backward
        d : false,                                                     // <-- Strafe right
        q : false,                                                     // <-- Descend
        e : false                                                      // <-- Ascend
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Merge Navigation Config with Defaults
    // ------------------------------------------------------------
    function Na__Navmode__MergeConfig(customConfig) {
        return { ...Na__Navmode__DefaultConfig, ...(customConfig || {}) }; // <-- Caller overrides win
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bind WASD Keyboard Listeners
    // ------------------------------------------------------------
    function Na__Navmode__BindWASDListeners() {
        const Na__Navmode__OnKeyDown = (event) => {
            const key = event.key.toLowerCase();                       // <-- Normalise key name
            if (Na__Navmode__KeyState.hasOwnProperty(key)) {
                Na__Navmode__KeyState[key] = true;
            }
        };

        const Na__Navmode__OnKeyUp = (event) => {
            const key = event.key.toLowerCase();                       // <-- Normalise key name
            if (Na__Navmode__KeyState.hasOwnProperty(key)) {
                Na__Navmode__KeyState[key] = false;
            }
        };

        window.addEventListener('keydown', Na__Navmode__OnKeyDown);
        window.addEventListener('keyup', Na__Navmode__OnKeyUp);

        return () => {
            window.removeEventListener('keydown', Na__Navmode__OnKeyDown);
            window.removeEventListener('keyup', Na__Navmode__OnKeyUp);
        };
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Apply WASD Camera Movement for Current Frame
    // ---------------------------------------------------------------
    function Na__Navmode__ApplyWASDMovement(camera, config) {
        if (!Na__Navmode__KeyState.w && !Na__Navmode__KeyState.a && !Na__Navmode__KeyState.s &&
            !Na__Navmode__KeyState.d && !Na__Navmode__KeyState.q && !Na__Navmode__KeyState.e) {
            return;                                                    // <-- No movement keys held
        }

        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;                                                 // <-- Keep movement horizontal
        forward.normalize();

        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

        if (Na__Navmode__KeyState.w) {
            camera.position.add(forward.clone().multiplyScalar(config.movementSpeed));
        }
        if (Na__Navmode__KeyState.s) {
            camera.position.sub(forward.clone().multiplyScalar(config.movementSpeed));
        }
        if (Na__Navmode__KeyState.d) {
            camera.position.add(right.clone().multiplyScalar(config.movementSpeed));
        }
        if (Na__Navmode__KeyState.a) {
            camera.position.sub(right.clone().multiplyScalar(config.movementSpeed));
        }
        if (Na__Navmode__KeyState.e) {
            camera.position.y += config.elevationSpeed;
        }
        if (Na__Navmode__KeyState.q) {
            camera.position.y -= config.elevationSpeed;
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Orbit Controls Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Orbit Navigation Controls
    // ------------------------------------------------------------
    function Na__Navmode__InitializeControls(camera, domElement, customConfig) {
        const config = Na__Navmode__MergeConfig(customConfig);

        const controls = new OrbitControls(camera, domElement);
        controls.enableDamping = config.enableDamping;

        if (Number.isFinite(config.minDistance)) {
            controls.minDistance = config.minDistance;                 // <-- Clamp orbit zoom in
        }

        if (Number.isFinite(config.maxDistance)) {
            controls.maxDistance = config.maxDistance;                 // <-- Clamp orbit zoom out
        }

        let removeListeners = () => {};
        let updateMovement = () => {};

        if (config.enableWASD) {
            removeListeners = Na__Navmode__BindWASDListeners();

            updateMovement = () => {
                Na__Navmode__ApplyWASDMovement(camera, config);          // <-- Optional keyboard fly
            };
        }

        const updateNavigation = () => {
            updateMovement();
            controls.update();                                         // <-- Apply orbit damping / constraints
        };

        const dispose = () => {
            removeListeners();
            controls.dispose();
        };

        return {
            controls,
            updateNavigation,
            dispose
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Orbit Navigation Controls API
    // ------------------------------------------------------------
    export {
        Na__Navmode__InitializeControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
