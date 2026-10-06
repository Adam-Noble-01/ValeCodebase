// =============================================================================
// VALEVISION3D - CAMERA MODE TRANSITION LOGIC
// =============================================================================
//
// FILE       : Na__Navmode__ModeTransition.js
// NAMESPACE  : Na__ModeTransition
// MODULE     : Camera Mode Transition
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Smooth camera handoff between orbit, walk, and fly modes
// CREATED    : 09-Jun-2026
//
// DESCRIPTION:
// - Handles the spatial continuity problem when switching camera modes.
// - Orbit-to-Walk: delegates to WalkMode__Activate then clamps the entry
//   pitch so the user does not stare at the floor after ground-snap.
// - Walk-to-Orbit: repositions the orbit camera on the side of the
//   OrbitHelperCube target closest to where the user walked, preserving
//   the original orbit distance and elevation.  The orbit target itself
//   (OrbitHelperCube) is NEVER modified.
// - Orbit-to-Fly: straight pass-through to FlyMode__Activate.  No
//   ground-snap recovery needed so no pitch clamp is applied.
// - Fly-to-Orbit: same repositioning logic as Walk-to-Orbit so the
//   returning orbit view is never jarring.
// - Ported from TrueVision3D (27-Feb-2026 / 25-May-2026).
//
// INTEGRATION:
// - Called by Na__UiFeature__WalkModeControls.js and
//   Na__UiFeature__FlyModeControls.js instead of calling
//   WalkMode/FlyMode Activate / Deactivate directly.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Jun-2026 - Version 1.0.0
// - Ported from TrueVision3D Na__Navmode__ModeTransition.js.
// - Re-headered for ValeVision3D namespace.
//
// 09-Jun-2026 - Version 1.1.0
// - Added FOV compensation: when entering walk or fly mode the camera/capsule
//   is nudged forward to counteract the apparent zoom-out caused by switching
//   from a narrow orbit lens to the wider walk/fly FOV.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Core
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Walk Mode System Logic
    // ------------------------------------------------------------
    import {
        Na__WalkMode__Activate,
        Na__WalkMode__Deactivate,
        Na__WalkMode__ClampEntryPitch,
        Na__WalkMode__NudgeCapsuleForward,
        Na__WalkMode__GetSavedOrbitState
    } from './Na__Navmode__WalkMode__SystemLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fly Mode System Logic
    // ------------------------------------------------------------
    import {
        Na__FlyMode__Activate,
        Na__FlyMode__Deactivate,
        Na__FlyMode__GetSavedOrbitState
    } from './Na__Navmode__FlyMode__SystemLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Unit Conversion
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | FOV Compensation Helper
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Calculate FOV Compensation Forward Distance (Three.js Units)
    // ------------------------------------------------------------
    // When the camera FOV widens on entering walk/fly mode the scene appears to
    // jump back because the same orbit distance subtends a smaller visual angle.
    // This function returns how far forward to move the camera/capsule (in Three.js
    // units) so the apparent size of objects at the orbit target is preserved.
    //
    // Formula: compensation = distToTarget * (1 - tan(orbitFov/2) / tan(modeFov/2))
    //   - Returns > 0 when modeFov > orbitFov (FOV widened — needs forward nudge).
    //   - Returns 0 when FOVs are identical or compensation cannot be calculated.
    //   - scaleFactor (0.0–1.0) lets the caller apply partial compensation when full
    //     mathematical correction would feel too aggressive (e.g. spawning near walls).
    // ------------------------------------------------------------
    function Na__ModeTransition__CalcFovCompensation(orbitFovDeg, modeFovDeg, distToTargetUnits, scaleFactor) {
        if (!Number.isFinite(orbitFovDeg) || !Number.isFinite(modeFovDeg)) return 0;
        if (Math.abs(orbitFovDeg - modeFovDeg) < 0.5) return 0;             // <-- FOVs close enough; skip
        if (modeFovDeg <= orbitFovDeg) return 0;                             // <-- FOV narrowed or equal; no compensation needed
        if (!Number.isFinite(distToTargetUnits) || distToTargetUnits < 0.001) return 0;

        const orbitFovRad = orbitFovDeg * Math.PI / 180;
        const modeFovRad  = modeFovDeg  * Math.PI / 180;
        const fovRatio    = Math.tan(orbitFovRad * 0.5) / Math.tan(modeFovRad * 0.5); // <-- Scale ratio at new FOV

        const rawCompensation = distToTargetUnits * (1 - fovRatio);         // <-- Full mathematical compensation
        const scale = (Number.isFinite(scaleFactor) && scaleFactor > 0) ? scaleFactor : 1.0;

        return rawCompensation * scale;                                      // <-- Scaled compensation distance (units)
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Nudge Camera Forward Along Horizontal Look Direction
    // ------------------------------------------------------------
    // Used by the Orbit-to-Fly transition to move the camera position toward
    // the scene before fly mode captures the new position.  Operates on the
    // horizontal plane only (y unchanged) to avoid altitude drift.
    // ------------------------------------------------------------
    function Na__ModeTransition__NudgeCameraForward(camera, distanceUnits) {
        if (!camera || !Number.isFinite(distanceUnits) || distanceUnits <= 0) return;

        const lookDir = new THREE.Vector3();
        camera.getWorldDirection(lookDir);
        lookDir.y = 0;                                                       // <-- Horizontal-only nudge (no altitude change)
        if (lookDir.lengthSq() < 0.0001) return;                            // <-- Guard: camera pointing straight up/down
        lookDir.normalize();

        camera.position.addScaledVector(lookDir, distanceUnits);            // <-- Move camera forward
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Orbit to Walk Transition
// -----------------------------------------------------------------------------

    // FUNCTION | Transition from Orbit Mode to Walk Mode
    // ------------------------------------------------------------
    // camera       : Three.js camera (orbit FOV is read before activation changes it).
    // modeFovDeg   : the walk mode FOV that will be applied on activation.
    // fovCompScale : 0.0–1.0 scale applied to the FOV compensation nudge; pass 0 to disable.
    // ------------------------------------------------------------
    function Na__ModeTransition__OrbitToWalk(orbitControls, maxEntryPitchDeg, entryForwardNudgeMm, camera, modeFovDeg, fovCompScale) {
        // CAPTURE PRE-ACTIVATION STATE (camera.fov and distance change after Na__WalkMode__Activate)
        const orbitFovDeg  = (camera && Number.isFinite(camera.fov)) ? camera.fov : null;
        const distToTarget = (camera && orbitControls && orbitControls.target)
            ? camera.position.distanceTo(orbitControls.target)
            : null;

        const activated = Na__WalkMode__Activate(orbitControls);

        if (activated && Number.isFinite(maxEntryPitchDeg)) {
            const maxEntryPitchRad = maxEntryPitchDeg * (Math.PI / 180);
            Na__WalkMode__ClampEntryPitch(maxEntryPitchRad);
        }

        // FIXED FORWARD NUDGE (safety margin — avoids spawning directly on top of entry geometry)
        if (activated && Number.isFinite(entryForwardNudgeMm) && entryForwardNudgeMm > 0) {
            Na__WalkMode__NudgeCapsuleForward(Na__Math__ConvertMmToUnits(entryForwardNudgeMm));
        }

        // FOV COMPENSATION NUDGE (counteracts apparent zoom-out caused by the wider walk FOV)
        if (activated && orbitFovDeg !== null && distToTarget !== null && fovCompScale > 0) {
            const compensationUnits = Na__ModeTransition__CalcFovCompensation(
                orbitFovDeg, modeFovDeg, distToTarget, fovCompScale
            );
            if (compensationUnits > 0) {
                Na__WalkMode__NudgeCapsuleForward(compensationUnits);        // <-- Move capsule forward to preserve visual scale
            }
        }

        return activated;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Walk to Orbit Transition
// -----------------------------------------------------------------------------

    // FUNCTION | Transition from Walk Mode to Orbit Mode
    // ------------------------------------------------------------
    function Na__ModeTransition__WalkToOrbit(camera, orbitControls) {
        const savedState = Na__WalkMode__GetSavedOrbitState();
        if (!savedState) {
            return Na__WalkMode__Deactivate(orbitControls);
        }

        const savedTarget    = savedState.orbitTarget;
        const savedCamPos    = savedState.cameraPosition;
        const savedDistance  = savedCamPos.distanceTo(savedTarget);
        const savedElevation = savedCamPos.y - savedTarget.y;

        const walkPos = camera.position.clone();

        const dirToWalk = new THREE.Vector3(
            walkPos.x - savedTarget.x,
            0,
            walkPos.z - savedTarget.z
        );

        if (dirToWalk.lengthSq() > 0.001) {
            dirToWalk.normalize();
        } else {
            dirToWalk.set(
                savedCamPos.x - savedTarget.x,
                0,
                savedCamPos.z - savedTarget.z
            ).normalize();
        }

        const elevationSq    = savedElevation * savedElevation;
        const distanceSq     = savedDistance * savedDistance;
        const horizontalDist = distanceSq > elevationSq
            ? Math.sqrt(distanceSq - elevationSq)
            : savedDistance;

        const overridePosition = new THREE.Vector3(
            savedTarget.x + dirToWalk.x * horizontalDist,
            savedTarget.y + savedElevation,
            savedTarget.z + dirToWalk.z * horizontalDist
        );

        return Na__WalkMode__Deactivate(orbitControls, overridePosition);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Orbit to Fly Transition
// -----------------------------------------------------------------------------

    // FUNCTION | Transition from Orbit Mode to Fly Mode
    // ------------------------------------------------------------
    // camera       : Three.js camera (orbit FOV read before activation; position nudged before fly takes over).
    // modeFovDeg   : the fly mode FOV that will be applied on activation.
    // fovCompScale : 0.0–1.0 scale; pass 0 to disable FOV compensation.
    //
    // FOV compensation: the camera is moved forward along its horizontal look
    // direction BEFORE Na__FlyMode__Activate so fly mode captures the corrected
    // position.  Unlike walk mode there is no ground-snap so horizontal+only
    // movement preserves the correct elevation while closing the apparent gap.
    // ------------------------------------------------------------
    function Na__ModeTransition__OrbitToFly(orbitControls, camera, modeFovDeg, fovCompScale) {
        // APPLY FOV COMPENSATION BEFORE ACTIVATION (fly captures new position)
        if (camera && orbitControls && orbitControls.target && fovCompScale > 0) {
            const orbitFovDeg  = Number.isFinite(camera.fov) ? camera.fov : null;
            const distToTarget = (orbitFovDeg !== null)
                ? camera.position.distanceTo(orbitControls.target)
                : null;

            if (orbitFovDeg !== null && distToTarget !== null) {
                const compensationUnits = Na__ModeTransition__CalcFovCompensation(
                    orbitFovDeg, modeFovDeg, distToTarget, fovCompScale
                );
                if (compensationUnits > 0) {
                    Na__ModeTransition__NudgeCameraForward(camera, compensationUnits); // <-- Move camera before fly captures state
                }
            }
        }

        return Na__FlyMode__Activate(orbitControls);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fly to Orbit Transition
// -----------------------------------------------------------------------------

    // FUNCTION | Transition from Fly Mode to Orbit Mode
    // ------------------------------------------------------------
    // Uses the same "reposition orbit camera on the side of the helper cube
    // closest to where the user ended up" logic as Walk-to-Orbit so the
    // returning orbit view never snaps to a wildly different vantage point.
    // ------------------------------------------------------------
    function Na__ModeTransition__FlyToOrbit(camera, orbitControls) {
        const savedState = Na__FlyMode__GetSavedOrbitState();
        if (!savedState) {
            return Na__FlyMode__Deactivate(orbitControls);
        }

        const savedTarget    = savedState.orbitTarget;
        const savedCamPos    = savedState.cameraPosition;
        const savedDistance  = savedCamPos.distanceTo(savedTarget);
        const savedElevation = savedCamPos.y - savedTarget.y;

        const flyPos = camera.position.clone();

        const dirToFly = new THREE.Vector3(
            flyPos.x - savedTarget.x,
            0,
            flyPos.z - savedTarget.z
        );

        if (dirToFly.lengthSq() > 0.001) {
            dirToFly.normalize();
        } else {
            dirToFly.set(
                savedCamPos.x - savedTarget.x,
                0,
                savedCamPos.z - savedTarget.z
            ).normalize();
        }

        const elevationSq    = savedElevation * savedElevation;
        const distanceSq     = savedDistance * savedDistance;
        const horizontalDist = distanceSq > elevationSq
            ? Math.sqrt(distanceSq - elevationSq)
            : savedDistance;

        const overridePosition = new THREE.Vector3(
            savedTarget.x + dirToFly.x * horizontalDist,
            savedTarget.y + savedElevation,
            savedTarget.z + dirToFly.z * horizontalDist
        );

        return Na__FlyMode__Deactivate(orbitControls, overridePosition);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Mode Transition API
    // ------------------------------------------------------------
    export {
        Na__ModeTransition__OrbitToWalk,
        Na__ModeTransition__WalkToOrbit,
        Na__ModeTransition__OrbitToFly,
        Na__ModeTransition__FlyToOrbit
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
