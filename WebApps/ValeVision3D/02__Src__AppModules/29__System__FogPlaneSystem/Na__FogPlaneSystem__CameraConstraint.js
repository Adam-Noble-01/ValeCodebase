// =============================================================================
// VALEVISION3D - FOG PLANE SYSTEM - CAMERA CONSTRAINT
// =============================================================================
//
// FILE       : Na__FogPlaneSystem__CameraConstraint.js
// NAMESPACE  : Na__FogPlane
// MODULE     : CameraConstraint
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Per-frame camera clamping to prevent crossing fog planes
// CREATED    : 07-Apr-2026
//
// DESCRIPTION:
// - Provides a per-frame constraint function that tests the camera position
//   against each active fog plane and pushes it back if it crosses to the
//   fog side (negative signed distance).
// - Also clamps the orbit controls target when necessary to prevent orbit
//   from pulling the camera through the plane on subsequent frames.
// - A configurable padding distance (in mm) prevents the camera from
//   sitting exactly on the plane surface.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Unit Conversion
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Constraint Configuration
    // ------------------------------------------------------------
    let Na__FogPlane__ConstraintEnabled = false;
    let Na__FogPlane__PaddingUnits      = 0.2;                                   // <-- Default padding (200mm converted at init)
    // ------------------------------------------------------------

    // MODULE VARIABLES | Active Plane Data (set by system logic)
    // ------------------------------------------------------------
    const Na__FogPlane__ConstraintPlanes = {
        A: { active: false, position: null, normal: null },
        B: { active: false, position: null, normal: null }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Constraint Configuration
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Camera Constraint with Padding
    // ------------------------------------------------------------
    function Na__FogPlane__InitializeCameraConstraint(paddingMm) {
        Na__FogPlane__PaddingUnits = Na__Math__ConvertMmToUnits(paddingMm || 200);
    }
    // ------------------------------------------------------------


    // FUNCTION | Enable or Disable the Camera Constraint
    // ------------------------------------------------------------
    function Na__FogPlane__SetConstraintEnabled(enabled) {
        Na__FogPlane__ConstraintEnabled = enabled;
    }
    // ------------------------------------------------------------


    // FUNCTION | Update Constraint Plane Data for a Slot
    // ------------------------------------------------------------
    function Na__FogPlane__UpdateConstraintPlane(slotId, active, positionVec3, normalVec3) {
        const plane = Na__FogPlane__ConstraintPlanes[slotId];
        if (!plane) return;

        plane.active   = active;
        plane.position = positionVec3 || null;
        plane.normal   = normalVec3   || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per-Frame Constraint Application
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Clamp a Point Against a Single Plane
    // ------------------------------------------------------------
    function Na__FogPlane__ClampPointToPlane(point, planePosition, planeNormal, padding) {
        const dx = point.x - planePosition.x;
        const dy = point.y - planePosition.y;
        const dz = point.z - planePosition.z;
        const signedDist = dx * planeNormal.x + dy * planeNormal.y + dz * planeNormal.z;

        if (signedDist < padding) {
            const pushBack = padding - signedDist;
            point.x += planeNormal.x * pushBack;
            point.y += planeNormal.y * pushBack;
            point.z += planeNormal.z * pushBack;
            return true;
        }
        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply Camera Constraint Each Frame
    // ------------------------------------------------------------
    function Na__FogPlane__ApplyCameraConstraint(camera, controls) {
        if (!Na__FogPlane__ConstraintEnabled || !camera) return;

        let clamped = false;

        for (const id of ['A', 'B']) {
            const plane = Na__FogPlane__ConstraintPlanes[id];
            if (!plane.active || !plane.position || !plane.normal) continue;

            const wasClamped = Na__FogPlane__ClampPointToPlane(
                camera.position, plane.position, plane.normal, Na__FogPlane__PaddingUnits
            );

            if (wasClamped && controls && controls.target) {
                Na__FogPlane__ClampPointToPlane(
                    controls.target, plane.position, plane.normal, Na__FogPlane__PaddingUnits
                );
            }

            if (wasClamped) clamped = true;
        }

        if (clamped && controls) {
            controls.update();
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Camera Constraint API
    // ------------------------------------------------------------
    export {
        Na__FogPlane__InitializeCameraConstraint,
        Na__FogPlane__SetConstraintEnabled,
        Na__FogPlane__UpdateConstraintPlane,
        Na__FogPlane__ApplyCameraConstraint
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
