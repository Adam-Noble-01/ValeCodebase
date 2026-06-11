// =============================================================================
// VALEVISION3D - DEFAULT NAVMODE MOUSE CONTROLS
// =============================================================================
//
// FILE       : Na__DefaultNavmode__MouseControls.js
// NAMESPACE  : Na__DefaultNavmode
// MODULE     : Default Navmode - Mouse Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Desktop orbit navigation with normalized wheel zoom and optional WASD
// CREATED    : 10-Jun-2026
//
// DESCRIPTION:
// - Default navigation bundle for desktop / mouse devices.
// - Wraps Three.js OrbitControls with configurable orbit damping.
// - Disables native wheel zoom and applies fixed mm-based zoom steps instead.
// - Accelerates consecutive wheel ticks for faster zoom after sustained scrolling.
// - Converts AppConfig millimeter values to Three.js units on initialisation.
// - Supports optional WASD, arrow keys, and Q/E elevation movement.
// - Enforces a configurable camera floor guard and runtime max-distance mutation.
// - Returns a controls bundle: controls, updateNavigation, dispose, setMaxDistanceMm.
//
// INTEGRATION:
// - Selected by index.html when Na__Device__UseTouchControls is false.
// - Call Na__DefaultNavmode__InitializeMouseControls(camera, domElement, config).
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


    // HELPER FUNCTION | Normalize Wheel Delta Direction
    // ------------------------------------------------------------
    function Na__DefaultNavmode__NormalizeWheelDeltaDirection(event) {
        let delta = Number.isFinite(event.deltaY) ? event.deltaY : 0;

        if (event.deltaMode === 1) {
            delta *= 16;                                               // <-- Normalise line-based delta
        } else if (event.deltaMode === 2) {
            delta *= 100;                                              // <-- Normalise page-based delta
        }

        if (!Number.isFinite(delta) || delta === 0) return 0;
        return delta > 0 ? -1 : 1;                                     // <-- Invert direction for wheel zoom
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp Zoom Distance
    // ------------------------------------------------------------
    function Na__DefaultNavmode__ClampDistance(distanceUnits, minDistanceUnits, maxDistanceUnits) {
        let clampedDistance = distanceUnits;

        if (Number.isFinite(minDistanceUnits) && clampedDistance < minDistanceUnits) {
            clampedDistance = minDistanceUnits;
        }

        if (Number.isFinite(maxDistanceUnits) && clampedDistance > maxDistanceUnits) {
            clampedDistance = maxDistanceUnits;
        }

        return clampedDistance;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Normalized Zoom Step
    // ------------------------------------------------------------
    function Na__DefaultNavmode__ApplyZoomStep(camera, controls, zoomDirection, zoomStepUnits, minDistanceUnits, maxDistanceUnits) {
        if (!zoomDirection || !Number.isFinite(zoomStepUnits) || zoomStepUnits <= 0) return;

        const target = controls.target.clone();
        const cameraOffset = new THREE.Vector3().subVectors(camera.position, target);
        const currentDistance = cameraOffset.length();

        if (!Number.isFinite(currentDistance) || currentDistance === 0) return;

        const desiredDistance = Na__DefaultNavmode__ClampDistance(
            currentDistance + (zoomDirection < 0 ? zoomStepUnits : -zoomStepUnits),
            minDistanceUnits,
            maxDistanceUnits
        );

        if (!Number.isFinite(desiredDistance)) return;

        const direction = cameraOffset.normalize();
        camera.position.copy(target.clone().add(direction.multiplyScalar(desiredDistance)));
        controls.update();
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


    // SUB HELPER FUNCTION | Resolve Mouse Navigation Units from Config
    // ---------------------------------------------------------------
    function Na__DefaultNavmode__ResolveNavigationUnits(config) {
        return {
            movementSpeedUnits : Na__Math__ConvertMmToUnits(config.movementSpeedMm),
            elevationSpeedUnits: Na__Math__ConvertMmToUnits(config.elevationSpeedMm),
            minDistanceUnits   : Number.isFinite(config.minDistanceMm)
                ? Na__Math__ConvertMmToUnits(config.minDistanceMm)
                : null,
            maxDistanceUnits   : Number.isFinite(config.maxDistanceMm)
                ? Na__Math__ConvertMmToUnits(config.maxDistanceMm)
                : null,
            minCameraYUnits    : Number.isFinite(config.minCameraYMm)
                ? Na__Math__ConvertMmToUnits(config.minCameraYMm)
                : null,
            zoomStepUnits      : Na__Math__ConvertMmToUnits(config.zoomStepMm)
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


    // SUB HELPER FUNCTION | Create Accelerated Wheel Zoom Handler
    // ---------------------------------------------------------------
    function Na__DefaultNavmode__CreateWheelZoomHandler(camera, controls, units) {
        let wheelTickCount     = 0;                                    // <-- Consecutive wheel ticks
        let lastWheelTimestamp = 0;                                    // <-- Last wheel time (ms)

        return (event) => {
            event.preventDefault();

            const zoomDirection = Na__DefaultNavmode__NormalizeWheelDeltaDirection(event);
            const now           = performance.now();

            if ((now - lastWheelTimestamp) > 250) {
                wheelTickCount = 0;                                    // <-- Reset streak after idle
            }

            lastWheelTimestamp = now;
            wheelTickCount    += 1;

            const extraTicks           = Math.max(0, wheelTickCount - 3);
            const accelerationFactor   = extraTicks > 0 ? Math.pow(1.05, extraTicks) : 1;
            const acceleratedZoomStep  = units.zoomStepUnits * accelerationFactor;
            const liveMaxDistanceUnits = Number.isFinite(controls.maxDistance)
                ? controls.maxDistance
                : units.maxDistanceUnits;                              // <-- Read live so runtime overrides apply

            Na__DefaultNavmode__ApplyZoomStep(
                camera,
                controls,
                zoomDirection,
                acceleratedZoomStep,
                units.minDistanceUnits,
                liveMaxDistanceUnits
            );
        };
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mouse Controls Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Default Mouse Controls
    // ------------------------------------------------------------
    function Na__DefaultNavmode__InitializeMouseControls(camera, domElement, customConfig) {
        const config = Na__DefaultNavmode__MergeConfig(customConfig);
        const units  = Na__DefaultNavmode__ResolveNavigationUnits(config);

        const controls = new OrbitControls(camera, domElement);
        // @delegate: ./Na__Navmode__OrbitControls__Damping.js
        Na__Navmode__ApplyOrbitControlsDamping(controls, config.damping);
        controls.enableZoom = false;                                   // <-- Disable native wheel zoom

        if (Number.isFinite(units.minDistanceUnits)) {
            controls.minDistance = units.minDistanceUnits;             // <-- Clamp orbit zoom in
        }

        if (Number.isFinite(units.maxDistanceUnits)) {
            controls.maxDistance = units.maxDistanceUnits;             // <-- Clamp orbit zoom out
        }

        const Na__DefaultNavmode__OnWheel = Na__DefaultNavmode__CreateWheelZoomHandler(camera, controls, units);
        domElement.addEventListener('wheel', Na__DefaultNavmode__OnWheel, { passive: false });

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
            domElement.removeEventListener('wheel', Na__DefaultNavmode__OnWheel);
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

    // MODULE EXPORTS | Default Mouse Controls API
    // ------------------------------------------------------------
    export {
        Na__DefaultNavmode__InitializeMouseControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
