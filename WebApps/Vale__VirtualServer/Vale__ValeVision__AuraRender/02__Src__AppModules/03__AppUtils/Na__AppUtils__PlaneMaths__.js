// =============================================================================
// VALEVISION AURA - APP UTILS - PLANE MATHS
// =============================================================================
//
// FILE       : Na__AppUtils__PlaneMaths__.js
// NAMESPACE  : Na__PlaneMath
// MODULE     : App Utils - Plane Maths
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The snap grid and the drag solve of the drawing planes, with no
//              imports at all
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - PORTED FROM TRUEVISION 3D (Adam, 30-Oct-2026: "look at the way these kinds
//   of plan and section planes work in TrueVision 3D AND COPY THAT
//   FUNCTIONALITY"): 47__System__DrawingPlanes/Na__DrawingPlanes__Maths__.js
//   1.0.0, its snap grid and drag solve. Vectors are AURA's [x, y, z] arrays
//   in metres; the snap is in millimetres, as TrueVision's is.
// - THE SNAP IS ABSOLUTE. A plane's position is one number: how far along its
//   own normal it sits from the world origin (a height, for the roof plan).
//   That number is what is snapped, never the distance dragged, so a plane
//   that started off the grid lands on it and every plane shares one grid.
// - THE DRAG IS THE POINT ON THE NORMAL CLOSEST TO THE POINTER RAY, so a plane
//   only ever travels along its own normal. The solve says how well
//   conditioned it is: with the normal pointing almost at the camera a pixel
//   becomes metres, and the drag holds the plane still instead.
// - IMPORTS NOTHING, so Node runs it exactly as the page does.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.5.6)
// - Initial build: TrueVision 3D's ToIncrement, ApplySnap, FormatMm,
//   NearestInList, StepInList, ClosestParamOnAxis and IsAxisTooSteep, on
//   arrays. Its ground cut, frame and record solves are not needed: AURA's
//   planes stand on the building's own bounds and keep one number each.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__PlaneMath__PARALLEL_EPSILON = 1e-9;   // <-- Below this a ray and an axis are treated as parallel

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Snap Grid
// -----------------------------------------------------------------------------

    // FUNCTION | The Multiple of an Increment Nearest to a Value
    // ------------------------------------------------------------
    // A bad increment returns the value rounded to a whole millimetre, which is
    // what "no snapping" means everywhere else here.
    // ------------------------------------------------------------
    function Na__PlaneMath__ToIncrement(valueMm, incrementMm) {
        if (!Number.isFinite(valueMm)) return 0;
        if (!Number.isFinite(incrementMm) || incrementMm <= 0) return Math.round(valueMm) + 0;
        return (Math.round(valueMm / incrementMm) * incrementMm) + 0;            // <-- + 0 turns a negative zero into zero
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply the Snap State to a Value: { enabled, incrementMm }
    // ------------------------------------------------------------
    // Off still rounds to a whole millimetre: a plane is kept to the millimetre,
    // so the number on screen is the number saved.
    // ------------------------------------------------------------
    function Na__PlaneMath__ApplySnap(valueMm, snap) {
        if (snap && snap.enabled === true) return Na__PlaneMath__ToIncrement(valueMm, snap.incrementMm);
        return Na__PlaneMath__ToIncrement(valueMm, 1);
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Millimetre Value With Its Thousands Grouped ("6 050", "-1 250")
    // ------------------------------------------------------------
    // A space rather than a comma: on a drawing a comma is a decimal point to
    // half of Europe.
    // ------------------------------------------------------------
    function Na__PlaneMath__FormatMm(valueMm) {
        if (!Number.isFinite(valueMm)) return '0';
        const whole = Math.round(valueMm);
        const text  = String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return (whole < 0 ? '-' : '') + text;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Member of a List Nearest to a Value (ties go to the smaller)
    // ------------------------------------------------------------
    function Na__PlaneMath__NearestInList(list, value) {
        if (!Array.isArray(list) || list.length === 0) return value;
        let best = list[0];
        for (let i = 1; i < list.length; i++) {
            if (Math.abs(list[i] - value) < Math.abs(best - value)) best = list[i];
        }
        return best;
    }
    // ------------------------------------------------------------


    // FUNCTION | Step to the Next or Previous Increment in a Sorted List
    // ------------------------------------------------------------
    // direction > 0 steps up, otherwise down. Stops at the ends rather than
    // wrapping: going past 500 to land on 10 would be a surprise mid-task.
    // ------------------------------------------------------------
    function Na__PlaneMath__StepInList(list, current, direction) {
        if (!Array.isArray(list) || list.length === 0) return current;
        const at   = list.indexOf(Na__PlaneMath__NearestInList(list, current));
        const next = Math.min(list.length - 1, Math.max(0, at + (direction > 0 ? 1 : -1)));
        return list[next];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Drag Solve
// -----------------------------------------------------------------------------

    // FUNCTION | Where Along an Axis Is the Point Closest to a Ray: { param, alignment }
    // ------------------------------------------------------------
    // axisDir and rayDir must be unit length. param is the distance along the
    // axis from axisOrigin; alignment is |axisDir . rayDir|, 0 when the axis
    // lies across the view (the best case) and 1 when it points straight at the
    // camera. Null when the two are parallel.
    // ------------------------------------------------------------
    function Na__PlaneMath__ClosestParamOnAxis(axisOrigin, axisDir, rayOrigin, rayDir) {
        const wx = axisOrigin[0] - rayOrigin[0];
        const wy = axisOrigin[1] - rayOrigin[1];
        const wz = axisOrigin[2] - rayOrigin[2];
        const b  = (axisDir[0] * rayDir[0]) + (axisDir[1] * rayDir[1]) + (axisDir[2] * rayDir[2]);
        const dw = (axisDir[0] * wx) + (axisDir[1] * wy) + (axisDir[2] * wz);
        const ew = (rayDir[0] * wx)  + (rayDir[1] * wy)  + (rayDir[2] * wz);
        const denom = 1 - (b * b);                                               // <-- Both directions are unit length
        if (Math.abs(denom) < Na__PlaneMath__PARALLEL_EPSILON) return null;
        return { param : ((b * ew) - dw) / denom, alignment : Math.abs(b) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Is an Axis Too Nearly in Line With the View to Be Dragged
    // ------------------------------------------------------------
    // alignment is what ClosestParamOnAxis reports. Inside minAngleDeg of the
    // view direction a pixel of pointer travel becomes metres of plane.
    // ------------------------------------------------------------
    function Na__PlaneMath__IsAxisTooSteep(alignment, minAngleDeg) {
        if (!Number.isFinite(alignment)) return true;
        const limit = Math.cos((Number.isFinite(minAngleDeg) ? minAngleDeg : 0) * (Math.PI / 180));
        return alignment > limit;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__PlaneMath__ToIncrement,
        Na__PlaneMath__ApplySnap,
        Na__PlaneMath__FormatMm,
        Na__PlaneMath__NearestInList,
        Na__PlaneMath__StepInList,
        Na__PlaneMath__ClosestParamOnAxis,
        Na__PlaneMath__IsAxisTooSteep
    };

// endregion -------------------------------------------------------------------
