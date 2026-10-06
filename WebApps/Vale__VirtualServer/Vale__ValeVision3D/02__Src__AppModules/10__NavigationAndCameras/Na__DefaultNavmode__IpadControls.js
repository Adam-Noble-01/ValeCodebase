// =============================================================================
// VALEVISION3D - DEFAULT NAVMODE TOUCH CONTROLS (IPAD / MOBILE)
// =============================================================================
//
// FILE       : Na__DefaultNavmode__IpadControls.js
// NAMESPACE  : Na__DefaultNavmode
// MODULE     : Default Navmode - Touch Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Touch-first orbit navigation with optional keyboard movement
// CREATED    : 10-Jun-2026
//
// DESCRIPTION:
// - Default navigation bundle for touch devices (iPad / mobile).
// - Wraps Three.js OrbitControls with rotate + dolly/pan touch mappings.
// - Converts AppConfig millimeter values to Three.js units on initialisation.
// - Supports optional WASD, arrow keys, and Q/E elevation for keyboard cases.
// - Applies orbit damping via Na__Navmode__OrbitControls__Damping.js delegation.
// - Enforces a configurable camera floor guard and runtime max-distance mutation.
// - Returns a controls bundle: controls, updateNavigation, dispose, setMaxDistanceMm.
//
// INTEGRATION:
// - Selected by index.html when Na__Device__UseTouchControls is true.
// - Call Na__DefaultNavmode__InitializeIpadControls(camera, domElement, config).
// - Call updateNavigation() every frame; it returns whether the scene changed.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Jun-2026 - Version 1.0.0
// - Aligned module structure with ValeVision3D navigation conventions.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Controls and Math
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';
    import { Na__Navmode__ApplyOrbitControlsDamping } from './Na__Navmode__OrbitControls__Damping.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | WASD and Arrow Keyboard State
    // ------------------------------------------------------------
    const Na__DefaultNavmode__KeyState = {
        w         : false,                                             // <-- Forward
        a         : false,                                             // <-- Strafe left
        s         : false,                                             // <-- Backward
        d         : false,                                             // <-- Strafe right
        q         : false,                                             // <-- Descend
        e         : false,                                             // <-- Ascend
        arrowup   : false,                                             // <-- Forward (arrow)
        arrowleft : false,                                             // <-- Strafe left (arrow)
        arrowdown : false,                                             // <-- Backward (arrow)
        arrowright: false                                              // <-- Strafe right (arrow)
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Merge Navigation Config with Caller Payload
    // ------------------------------------------------------------
    function Na__DefaultNavmode__MergeConfig(customConfig) {
        return { ...(customConfig || {}) };                            // <-- Caller supplies full AppConfig slice
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bind WASD and Arrow Keyboard Listeners
    // ------------------------------------------------------------
    function Na__DefaultNavmode__BindWASDListeners() {
        const Na__DefaultNavmode__OnKeyDown = (event) => {
            const key = event.key.toLowerCase();                       // <-- Normalise key name
            if (Na__DefaultNavmode__KeyState.hasOwnProperty(key)) {
                Na__DefaultNavmode__KeyState[key] = true;
            }
        };

        const Na__DefaultNavmode__OnKeyUp = (event) => {
            const key = event.key.toLowerCase();                       // <-- Normalise key name
            if (Na__DefaultNavmode__KeyState.hasOwnProperty(key)) {
                Na__DefaultNavmode__KeyState[key] = false;
            }
        };

        window.addEventListener('keydown', Na__DefaultNavmode__OnKeyDown);
        window.addEventListener('keyup', Na__DefaultNavmode__OnKeyUp);

        return () => {
            window.removeEventListener('keydown', Na__DefaultNavmode__OnKeyDown);
            window.removeEventListener('keyup', Na__DefaultNavmode__OnKeyUp);
        };
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Resolve Touch Navigation Units from Config
    // ---------------------------------------------------------------
    function Na__DefaultNavmode__ResolveNavigationUnits(config) {
        const maxDistanceMultiplier = Number.isFinite(config.maxDistanceMultiplier) && config.maxDistanceMultiplier > 0
            ? config.maxDistanceMultiplier
            : 1;                                                       // <-- Tablet bonus multiplier (default 1.0 = no bonus)

        const effectiveMaxDistanceMm = Number.isFinite(config.maxDistanceMm)
            ? config.maxDistanceMm * maxDistanceMultiplier
            : null;                                                    // <-- Effective max with bonus applied

        return {
            movementSpeedUnits : Na__Math__ConvertMmToUnits(config.movementSpeedMm),
            elevationSpeedUnits: Na__Math__ConvertMmToUnits(config.elevationSpeedMm),
            minDistanceUnits   : Number.isFinite(config.minDistanceMm)
                ? Na__Math__ConvertMmToUnits(config.minDistanceMm)
                : null,
            maxDistanceUnits   : Number.isFinite(effectiveMaxDistanceMm)
                ? Na__Math__ConvertMmToUnits(effectiveMaxDistanceMm)
                : null,
            minCameraYUnits    : Number.isFinite(config.minCameraYMm)
                ? Na__Math__ConvertMmToUnits(config.minCameraYMm)
                : null
        };
    }
    // ---------------------------------------------------------------


    // SUB HELPER FUNCTION | Apply WASD and Arrow Key Camera Movement
    // ---------------------------------------------------------------
    function Na__DefaultNavmode__ApplyWASDMovement(camera, movementSpeedUnits, elevationSpeedUnits) {
        if (!Na__DefaultNavmode__KeyState.w && !Na__DefaultNavmode__KeyState.a && !Na__DefaultNavmode__KeyState.s &&
            !Na__DefaultNavmode__KeyState.d && !Na__DefaultNavmode__KeyState.q && !Na__DefaultNavmode__KeyState.e &&
            !Na__DefaultNavmode__KeyState.arrowup && !Na__DefaultNavmode__KeyState.arrowleft &&
            !Na__DefaultNavmode__KeyState.arrowdown && !Na__DefaultNavmode__KeyState.arrowright) {
            return false;                                              // <-- No movement keys held
        }

        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;                                                 // <-- Keep movement horizontal
        forward.normalize();

        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

        if (Na__DefaultNavmode__KeyState.w || Na__DefaultNavmode__KeyState.arrowup) {
            camera.position.add(forward.clone().multiplyScalar(movementSpeedUnits));
        }
        if (Na__DefaultNavmode__KeyState.s || Na__DefaultNavmode__KeyState.arrowdown) {
            camera.position.sub(forward.clone().multiplyScalar(movementSpeedUnits));
        }
        if (Na__DefaultNavmode__KeyState.d || Na__DefaultNavmode__KeyState.arrowright) {
            camera.position.add(right.clone().multiplyScalar(movementSpeedUnits));
        }
        if (Na__DefaultNavmode__KeyState.a || Na__DefaultNavmode__KeyState.arrowleft) {
            camera.position.sub(right.clone().multiplyScalar(movementSpeedUnits));
        }
        if (Na__DefaultNavmode__KeyState.e) {
            camera.position.y += elevationSpeedUnits;
        }
        if (Na__DefaultNavmode__KeyState.q) {
            camera.position.y -= elevationSpeedUnits;
        }

        return true;
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Touch Controls Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Default Touch Controls
    // ------------------------------------------------------------
    function Na__DefaultNavmode__InitializeIpadControls(camera, domElement, customConfig) {
        const config = Na__DefaultNavmode__MergeConfig(customConfig);
        const units  = Na__DefaultNavmode__ResolveNavigationUnits(config);

        const controls = new OrbitControls(camera, domElement);
        // @delegate: ./Na__Navmode__OrbitControls__Damping.js
        Na__Navmode__ApplyOrbitControlsDamping(controls, config.damping);
        controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

        if (Number.isFinite(units.minDistanceUnits)) {
            controls.minDistance = units.minDistanceUnits;             // <-- Clamp orbit zoom in
        }

        if (Number.isFinite(units.maxDistanceUnits)) {
            controls.maxDistance = units.maxDistanceUnits;             // <-- Clamp orbit zoom out
        }

        let removeListeners = () => {};
        let updateMovement  = () => false;

        if (config.enableWASD) {
            removeListeners = Na__DefaultNavmode__BindWASDListeners();

            updateMovement = () => {
                return Na__DefaultNavmode__ApplyWASDMovement(
                    camera,
                    units.movementSpeedUnits,
                    units.elevationSpeedUnits
                );
            };
        }

        const updateNavigation = () => {
            const moved        = updateMovement();
            const orbitChanged = controls.update();
            let clamped        = false;

            if (Number.isFinite(units.minCameraYUnits) && camera.position.y < units.minCameraYUnits) {
                camera.position.y = units.minCameraYUnits;             // <-- Enforce camera floor guard
                controls.update();
                clamped = true;
            }

            return moved || orbitChanged || clamped;
        };

        const dispose = () => {
            removeListeners();
            controls.dispose();
        };

        const setMaxDistanceMm = (mm) => {
            if (!Number.isFinite(mm) || mm <= 0) return;               // <-- Guard against invalid values
            controls.maxDistance = Na__Math__ConvertMmToUnits(mm);   // <-- Runtime max distance mutation
        };

        return {
            controls,
            updateNavigation,
            dispose,
            setMaxDistanceMm
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Default Touch Controls API
    // ------------------------------------------------------------
    export {
        Na__DefaultNavmode__InitializeIpadControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
