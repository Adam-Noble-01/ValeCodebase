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
// - Movement modifiers: Alt scales steps to 20% for extra-fine nudges; Shift
//   dollies the rig (camera + orbit target together) so framing holds.
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
// 28-Jul-2026 - Version 1.1.0
// - WASD / arrow keys now request active rendering while held, so keyboard
//   movement works without holding the left mouse button (previously the
//   invalidation-based render loop only ticked during pointer interaction).
// - Keydown ignored while typing in inputs; arrows preventDefault page scroll.
// - Window blur releases all held keys to avoid a stuck active-render reason.
//
// 28-Jul-2026 - Version 1.2.0
// - Movement modifiers added: Alt scales steps to 20% for extra-fine nudges;
//   Shift dollies the whole rig (camera + orbit target translate together so
//   the view direction holds instead of re-aiming at the orbit pivot).
// - Arrow preventDefault also blocks Alt+arrow browser history navigation.
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
    import {
        Na__RenderLoop__RequestActiveRender,
        Na__RenderLoop__StopActiveRender
    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State Variables
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Keyboard Movement Modifier Tuning
    // ------------------------------------------------------------
    const Na__DefaultNavmode__AltFineScale = 0.2;                      // <-- Alt slows keyboard movement to 20% speed
    // ------------------------------------------------------------

    // MODULE VARIABLES | Movement Modifier State
    // ------------------------------------------------------------
    const Na__DefaultNavmode__ModifierState = {
        alt   : false,                                                 // <-- Extra-fine speed scale
        shift : false                                                  // <-- Dolly rig (camera + target together)
    };
    // ------------------------------------------------------------

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


    // HELPER FUNCTION | Check if Focus is on an Interactive Input Element
    // ------------------------------------------------------------
    function Na__DefaultNavmode__IsInputFocused() {
        const tag = document.activeElement && document.activeElement.tagName.toLowerCase(); // <-- Get focused element tag
        return tag === 'input' || tag === 'textarea' || tag === 'select';                   // <-- True if typing context is active
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Check if Any Movement Key is Currently Held
    // ------------------------------------------------------------
    function Na__DefaultNavmode__AnyMovementKeyHeld() {
        return Object.values(Na__DefaultNavmode__KeyState).some(Boolean);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bind WASD and Arrow Keyboard Listeners
    // ------------------------------------------------------------
    function Na__DefaultNavmode__BindWASDListeners() {
        const Na__DefaultNavmode__OnKeyDown = (event) => {
            Na__DefaultNavmode__ModifierState.alt   = event.altKey;    // <-- Sync modifiers on every key event
            Na__DefaultNavmode__ModifierState.shift = event.shiftKey;
            if (Na__DefaultNavmode__IsInputFocused()) return;          // <-- Ignore keys while typing in UI inputs
            if (event.key === 'Alt' && Na__DefaultNavmode__AnyMovementKeyHeld()) {
                event.preventDefault();                                // <-- Stop Alt focusing the browser menu mid-move
            }
            const key = event.key.toLowerCase();                       // <-- Normalise key name
            if (Na__DefaultNavmode__KeyState.hasOwnProperty(key)) {
                if (key.startsWith('arrow')) event.preventDefault();   // <-- Stop arrow scroll + Alt+arrow history nav
                Na__DefaultNavmode__KeyState[key] = true;
                Na__RenderLoop__RequestActiveRender('orbit-keys');     // <-- Keep frames ticking while keys held
            }
        };

        const Na__DefaultNavmode__OnKeyUp = (event) => {
            Na__DefaultNavmode__ModifierState.alt   = event.altKey;    // <-- Sync modifiers on every key event
            Na__DefaultNavmode__ModifierState.shift = event.shiftKey;
            const key = event.key.toLowerCase();                       // <-- Normalise key name
            if (Na__DefaultNavmode__KeyState.hasOwnProperty(key)) {
                Na__DefaultNavmode__KeyState[key] = false;
                if (!Na__DefaultNavmode__AnyMovementKeyHeld()) {
                    Na__RenderLoop__StopActiveRender('orbit-keys');    // <-- Idle the loop once all keys released
                }
            }
        };

        const Na__DefaultNavmode__OnWindowBlur = () => {
            Na__DefaultNavmode__ModifierState.alt   = false;           // <-- Modifiers release on focus loss too
            Na__DefaultNavmode__ModifierState.shift = false;
            if (!Na__DefaultNavmode__AnyMovementKeyHeld()) return;
            Object.keys(Na__DefaultNavmode__KeyState).forEach((key) => {
                Na__DefaultNavmode__KeyState[key] = false;             // <-- Release keys on focus loss (no keyup fires)
            });
            Na__RenderLoop__StopActiveRender('orbit-keys');
        };

        window.addEventListener('keydown', Na__DefaultNavmode__OnKeyDown);
        window.addEventListener('keyup', Na__DefaultNavmode__OnKeyUp);
        window.addEventListener('blur', Na__DefaultNavmode__OnWindowBlur);

        return () => {
            window.removeEventListener('keydown', Na__DefaultNavmode__OnKeyDown);
            window.removeEventListener('keyup', Na__DefaultNavmode__OnKeyUp);
            window.removeEventListener('blur', Na__DefaultNavmode__OnWindowBlur);
            Na__RenderLoop__StopActiveRender('orbit-keys');            // <-- Never leave the loop pinned after dispose
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
    function Na__DefaultNavmode__ApplyWASDMovement(camera, controls, movementSpeedUnits, elevationSpeedUnits) {
        if (!Na__DefaultNavmode__KeyState.w && !Na__DefaultNavmode__KeyState.a && !Na__DefaultNavmode__KeyState.s &&
            !Na__DefaultNavmode__KeyState.d && !Na__DefaultNavmode__KeyState.q && !Na__DefaultNavmode__KeyState.e &&
            !Na__DefaultNavmode__KeyState.arrowup && !Na__DefaultNavmode__KeyState.arrowleft &&
            !Na__DefaultNavmode__KeyState.arrowdown && !Na__DefaultNavmode__KeyState.arrowright) {
            return false;                                              // <-- No movement keys held
        }

        const speedScale = Na__DefaultNavmode__ModifierState.alt
            ? Na__DefaultNavmode__AltFineScale
            : 1;                                                       // <-- Alt = extra-fine steps
        const moveStep = movementSpeedUnits * speedScale;
        const elevStep = elevationSpeedUnits * speedScale;

        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;                                                 // <-- Keep movement horizontal
        forward.normalize();

        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const displacement = new THREE.Vector3();

        if (Na__DefaultNavmode__KeyState.w || Na__DefaultNavmode__KeyState.arrowup) {
            displacement.add(forward.clone().multiplyScalar(moveStep));
        }
        if (Na__DefaultNavmode__KeyState.s || Na__DefaultNavmode__KeyState.arrowdown) {
            displacement.sub(forward.clone().multiplyScalar(moveStep));
        }
        if (Na__DefaultNavmode__KeyState.d || Na__DefaultNavmode__KeyState.arrowright) {
            displacement.add(right.clone().multiplyScalar(moveStep));
        }
        if (Na__DefaultNavmode__KeyState.a || Na__DefaultNavmode__KeyState.arrowleft) {
            displacement.sub(right.clone().multiplyScalar(moveStep));
        }
        if (Na__DefaultNavmode__KeyState.e) {
            displacement.y += elevStep;
        }
        if (Na__DefaultNavmode__KeyState.q) {
            displacement.y -= elevStep;
        }

        camera.position.add(displacement);

        if (Na__DefaultNavmode__ModifierState.shift) {
            controls.target.add(displacement);                         // <-- Dolly: rig translates, view direction holds
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
                    controls,
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
