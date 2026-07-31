/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | SETTING OUT - DASH STAMP
   =============================================================================

   FILE       : VghLantern__Env3d__SetOut__DashStamp__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - SetOut DashStamp
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Cut a polyline into the discrete segments of a drafting line type
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Turns a continuous run into the individual dashes and dots that make up a
     named line type, measured in real millimetres along the run.
   - Pure geometry. No Three.js, no scene, no materials - it takes points and
     returns points, so the same stamping could drive the SVG environment.

   ---------------------------------------------------------------------------

   WHY STAMP GEOMETRY RATHER THAN USE THE SHADER'S DASH MODE

   The vendored LineMaterial does have a dashed mode, and it was rejected for four
   specific reasons, all of which this module avoids outright:

     1. It cannot draw DASH-DOT. It has exactly one dash length and one gap
        length. Dash-dot is the standard drafting line type for a datum, and the
        one the ridge datum is required to use.
     2. Dash phase accumulates across disjoint segments inside a single object,
        so the second construction line in a buffer starts its dash wherever the
        first happened to finish. Every line would need its own draw call to get
        a clean start.
     3. Dashed lines lose their end caps - the cap fragments are discarded under
        the dash define - so a dashed run reads shorter than it is.
     4. The dash handling in this version carries an unresolved defect note in
        the vendor source, and the documented gap default disagrees with the
        actual uniform default.

   Stamping instead means every line type is ordinary solid geometry: no
   computeLineDistances call, no per-object phase management, caps intact, and one
   merged buffer per colour. The pattern is measured in model millimetres, so it
   scales with the lantern exactly as drawn linework does.

   ---------------------------------------------------------------------------

   PATTERN GRAMMAR
   A pattern is an array of millimetre lengths, alternating ON and OFF and always
   starting ON:

       solid    null                 one segment, uncut
       dotted   [ 6, 10 ]            6 on, 10 off, repeating
       dashed   [ 40, 22 ]           40 on, 22 off, repeating
       dashDot  [ 48, 16, 4, 16 ]    long, gap, dot, gap - the datum line type

   ============================================================================= */

// =============================================================================
// REGION | Setting Out Dash Stamp Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Stamping Guards
    // ------------------------------------------------------------
    const MIN_RUN_LENGTH_MM   =  0.001;                                      // <-- Below this a run is degenerate
    const MIN_PATTERN_STEP_MM =  0.01;                                       // <-- A pattern entry below this would never advance
    const MAX_STAMPS_PER_RUN  =  4000;                                       // <-- Backstop against a pathological pattern
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Geometry Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Straight Line Distance Between Two Points
    // ------------------------------------------------------------
    function VghLantern__Env3d__SetOut__DashStamp__Distance(a, b) {
        const dx  =  b.x - a.x;
        const dy  =  b.y - a.y;
        const dz  =  b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Point a Fraction of the Way Along a Segment
    // ------------------------------------------------------------
    function VghLantern__Env3d__SetOut__DashStamp__Lerp(a, b, t) {
        return {
            x : a.x + (b.x - a.x) * t,
            y : a.y + (b.y - a.y) * t,
            z : a.z + (b.z - a.z) * t
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether a Pattern Is Usable
    // ------------------------------------------------------------
    // A pattern of all-zero or negative entries would never advance the cursor, so
    // it is rejected here rather than looping forever at the stamping step.
    function VghLantern__Env3d__SetOut__DashStamp__IsUsablePattern(patternMm) {
        if (!Array.isArray(patternMm) || patternMm.length < 2) return false;

        for (let i = 0; i < patternMm.length; i++) {
            if (Number(patternMm[i]) >= MIN_PATTERN_STEP_MM) return true;     // <-- At least one entry advances
        }
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Stamping
// -----------------------------------------------------------------------------

    // FUNCTION | Cut a Polyline Into the Segments of a Line Type
    // ------------------------------------------------------------
    // polylinePoints is an open run of model-space points. Returns an array of
    // [start, end] pairs - the ON spans only. A null or unusable pattern returns
    // the run uncut, which is exactly what a solid line type wants.
    //
    // The pattern cursor carries ACROSS polyline vertices rather than restarting at
    // each one. That is what keeps a dash running continuously round a corner of a
    // datum perimeter instead of restarting four times and reading as four lines.
    export function VghLantern__Env3d__SetOut__DashStamp__Polyline(polylinePoints, patternMm) {
        if (!Array.isArray(polylinePoints) || polylinePoints.length < 2) return [];

        if (!VghLantern__Env3d__SetOut__DashStamp__IsUsablePattern(patternMm)) {
            return VghLantern__Env3d__SetOut__DashStamp__Uncut(polylinePoints);
        }

        const stamped  =  [];
        const cursor   =  {
            Index     : 0,                                                    // <-- Even index is ON, odd is OFF
            Remaining : Math.max(MIN_PATTERN_STEP_MM, Number(patternMm[0]))
        };

        for (let i = 0; i < polylinePoints.length - 1; i++) {
            const from       =  polylinePoints[i];
            const to         =  polylinePoints[i + 1];
            const spanLength =  VghLantern__Env3d__SetOut__DashStamp__Distance(from, to);
            if (spanLength < MIN_RUN_LENGTH_MM) continue;                     // <-- Duplicate vertex, nothing to walk

            let travelled  =  0;
            let guard      =  0;

            while (travelled < spanLength - MIN_RUN_LENGTH_MM) {
                if (++guard > MAX_STAMPS_PER_RUN) break;                      // <-- Pattern too fine for this run

                const take     =  Math.min(cursor.Remaining, spanLength - travelled);
                const isOnSpan =  (cursor.Index % 2) === 0;

                if (isOnSpan && take > MIN_RUN_LENGTH_MM) {
                    stamped.push([
                        VghLantern__Env3d__SetOut__DashStamp__Lerp(from, to, travelled / spanLength),
                        VghLantern__Env3d__SetOut__DashStamp__Lerp(from, to, (travelled + take) / spanLength)
                    ]);
                }

                travelled          +=  take;
                cursor.Remaining   -=  take;

                if (cursor.Remaining <= MIN_RUN_LENGTH_MM) {
                    cursor.Index      =  (cursor.Index + 1) % patternMm.length;
                    cursor.Remaining  =  Math.max(MIN_PATTERN_STEP_MM, Number(patternMm[cursor.Index]));
                }
            }
        }

        return stamped;
    }
    // ------------------------------------------------------------


    // FUNCTION | Cut a Closed Ring Into the Segments of a Line Type
    // ------------------------------------------------------------
    // The convenience form for a datum perimeter: repeats the first point so the
    // ring closes, then stamps it as one continuous run.
    export function VghLantern__Env3d__SetOut__DashStamp__Ring(ringPoints, patternMm) {
        if (!Array.isArray(ringPoints) || ringPoints.length < 3) return [];

        const closed  =  ringPoints.slice();
        closed.push(ringPoints[0]);                                           // <-- setFromPoints never closes a loop for you

        return VghLantern__Env3d__SetOut__DashStamp__Polyline(closed, patternMm);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Emit a Polyline Uncut, One Segment Per Span
    // ------------------------------------------------------------
    export function VghLantern__Env3d__SetOut__DashStamp__Uncut(polylinePoints) {
        const segments  =  [];

        for (let i = 0; i < polylinePoints.length - 1; i++) {
            if (VghLantern__Env3d__SetOut__DashStamp__Distance(polylinePoints[i], polylinePoints[i + 1]) < MIN_RUN_LENGTH_MM) continue;
            segments.push([polylinePoints[i], polylinePoints[i + 1]]);
        }
        return segments;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
