/* =============================================================================
   VGHLANTERN - ROOF PITCH CALCULATOR
   =============================================================================

   FILE       : VghLantern__Geometry__RoofPitchCalculator__.js
   NAMESPACE  : VghLantern
   MODULE     : Geometry - RoofPitchCalculator
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Interconvert roof pitch, ridge rise, run, and hip angle
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Pure trigonometry. No DOM, no state, no config reads, no side effects.
   - The lantern editor lets the user drive pitch either by angle or by ridge
     rise; this module is the single place those two representations convert.
   - Also derives the true hip angle, which is shallower than the slope pitch
     because a hip travels diagonally in plan.

   TERMINOLOGY (all linear values in millimetres, all angles in degrees):
   - run        : horizontal distance from eaves to ridge, measured square to
                  the eaves. For a hipped lantern this is half the eaves depth.
   - rise       : vertical distance from eaves level to ridge level.
   - pitch      : angle of a roof slope from horizontal = atan(rise / run).
   - rafterLen  : true sloping length along a common rafter = hypot(run, rise).
   - hipRun     : horizontal length of a hip in plan = hypot(runX, runY).
   - hipAngle   : angle of a hip from horizontal = atan(rise / hipRun).

   ============================================================================= */

// =============================================================================
// REGION | Roof Pitch Calculator Module
// =============================================================================

const VghLantern__Geometry__RoofPitchCalculator = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Angle Conversion and Guards
    // ------------------------------------------------------------
    const DEG_TO_RAD        =  Math.PI / 180;                                // <-- Degrees to radians factor
    const RAD_TO_DEG        =  180 / Math.PI;                                // <-- Radians to degrees factor
    const MIN_SAFE_RUN_MM   =  0.001;                                        // <-- Guards divide-by-zero on degenerate spans
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pitch and Rise Interconversion
// -----------------------------------------------------------------------------

    // FUNCTION | Derive Ridge Rise from Pitch Angle and Horizontal Run
    // ------------------------------------------------------------
    function VghLantern__RoofPitch__RiseFromPitch(runMm, pitchDegrees) {
        var run  =  Math.max(0, Number(runMm) || 0);
        return run * Math.tan((Number(pitchDegrees) || 0) * DEG_TO_RAD);
    }
    // ------------------------------------------------------------


    // FUNCTION | Derive Pitch Angle from Ridge Rise and Horizontal Run
    // ------------------------------------------------------------
    function VghLantern__RoofPitch__PitchFromRise(runMm, riseMm) {
        var run  =  Math.max(MIN_SAFE_RUN_MM, Number(runMm) || 0);
        var rise =  Math.max(0, Number(riseMm) || 0);
        return Math.atan(rise / run) * RAD_TO_DEG;
    }
    // ------------------------------------------------------------


    // FUNCTION | Derive True Rafter Length from Run and Rise
    // ------------------------------------------------------------
    function VghLantern__RoofPitch__RafterLength(runMm, riseMm) {
        var run  =  Math.max(0, Number(runMm) || 0);
        var rise =  Math.max(0, Number(riseMm) || 0);
        return Math.sqrt((run * run) + (rise * rise));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hip Geometry
// -----------------------------------------------------------------------------

    // FUNCTION | Derive Horizontal Hip Run from Its Two Plan Components
    // ------------------------------------------------------------
    // A hip travels diagonally in plan, so its horizontal run is the hypotenuse
    // of the two axis runs it covers between the eaves corner and the ridge end.
    function VghLantern__RoofPitch__HipRun(runXMm, runYMm) {
        var runX  =  Math.max(0, Number(runXMm) || 0);
        var runY  =  Math.max(0, Number(runYMm) || 0);
        return Math.sqrt((runX * runX) + (runY * runY));
    }
    // ------------------------------------------------------------


    // FUNCTION | Derive True Hip Angle from Hip Run and Rise
    // ------------------------------------------------------------
    function VghLantern__RoofPitch__HipAngle(hipRunMm, riseMm) {
        return VghLantern__RoofPitch__PitchFromRise(hipRunMm, riseMm);
    }
    // ------------------------------------------------------------


    // FUNCTION | Derive True Hip Length from Hip Run and Rise
    // ------------------------------------------------------------
    function VghLantern__RoofPitch__HipLength(hipRunMm, riseMm) {
        return VghLantern__RoofPitch__RafterLength(hipRunMm, riseMm);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Resolved Pitch Set
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Complete Pitch Set for a Lantern
    // ------------------------------------------------------------
    // Accepts whichever value the user is driving (angle or rise) and returns
    // both, plus the derived slope lengths. The SkeletonSolver calls this once
    // so that the rest of the solve never re-derives pitch.
    //
    // driveMode    : 'angle' | 'rise'
    // shortRunMm   : horizontal run of the short-axis slope (eaves to ridge)
    // longRunMm    : horizontal run of the long-axis slope  (eaves to ridge end)
    //
    // Returns { PitchDegrees, RiseMm, ShortRafterLengthMm, LongSlopePitchDegrees,
    //           LongRafterLengthMm, HipRunMm, HipAngleDegrees, HipLengthMm }
    function VghLantern__RoofPitch__ResolvePitchSet(driveMode, shortRunMm, longRunMm, pitchDegrees, riseMm) {
        var shortRun  =  Math.max(MIN_SAFE_RUN_MM, Number(shortRunMm) || 0);
        var longRun   =  Math.max(0, Number(longRunMm) || 0);

        var resolvedPitch;
        var resolvedRise;

        if (driveMode === 'rise') {
            resolvedRise   =  Math.max(0, Number(riseMm) || 0);
            resolvedPitch  =  VghLantern__RoofPitch__PitchFromRise(shortRun, resolvedRise);
        } else {
            resolvedPitch  =  Number(pitchDegrees) || 0;
            resolvedRise   =  VghLantern__RoofPitch__RiseFromPitch(shortRun, resolvedPitch);
        }

        var hipRun  =  VghLantern__RoofPitch__HipRun(shortRun, shortRun);    // <-- Equal-pitch hip bisects the corner in plan

        return {
            PitchDegrees           : resolvedPitch,
            RiseMm                 : resolvedRise,
            ShortRafterLengthMm    : VghLantern__RoofPitch__RafterLength(shortRun, resolvedRise),
            LongSlopePitchDegrees  : longRun > 0 ? VghLantern__RoofPitch__PitchFromRise(longRun, resolvedRise) : resolvedPitch,
            LongRafterLengthMm     : VghLantern__RoofPitch__RafterLength(longRun, resolvedRise),
            HipRunMm               : hipRun,
            HipAngleDegrees        : VghLantern__RoofPitch__HipAngle(hipRun, resolvedRise),
            HipLengthMm            : VghLantern__RoofPitch__HipLength(hipRun, resolvedRise)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__RoofPitch__RiseFromPitch    : VghLantern__RoofPitch__RiseFromPitch,
        VghLantern__RoofPitch__PitchFromRise    : VghLantern__RoofPitch__PitchFromRise,
        VghLantern__RoofPitch__RafterLength     : VghLantern__RoofPitch__RafterLength,
        VghLantern__RoofPitch__HipRun           : VghLantern__RoofPitch__HipRun,
        VghLantern__RoofPitch__HipAngle         : VghLantern__RoofPitch__HipAngle,
        VghLantern__RoofPitch__HipLength        : VghLantern__RoofPitch__HipLength,
        VghLantern__RoofPitch__ResolvePitchSet  : VghLantern__RoofPitch__ResolvePitchSet
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Geometry__RoofPitchCalculator  =  VghLantern__Geometry__RoofPitchCalculator;
