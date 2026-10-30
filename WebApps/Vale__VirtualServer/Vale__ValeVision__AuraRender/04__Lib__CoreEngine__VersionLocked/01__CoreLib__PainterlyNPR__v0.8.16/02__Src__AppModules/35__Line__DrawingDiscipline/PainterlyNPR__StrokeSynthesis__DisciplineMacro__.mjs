/* =============================================================================
   PAINTERLYNPR - LINE | DRAWING DISCIPLINE - THE MACRO
   =============================================================================

   FILE       : PainterlyNPR__StrokeSynthesis__DisciplineMacro__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - DrawingDiscipline - Macro
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The Drawing Discipline at a looseness - four stops, interpolated -
                and the looseness that applies under the view's ceiling
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - One control, many parameters: as the drawing loosens, low-priority lines are
     simplified away first, and only then do the survivors wobble, overshoot and
     overdraw.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Line Candidates
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Maths__Clamp  as  Clamp,
    PainterlyNPR__Maths__Lerp   as  Lerp,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__DrawingDiscipline__DISCIPLINE_STOPS as DISCIPLINE_STOPS } from './PainterlyNPR__DrawingDiscipline__Constants__.mjs';

// =============================================================================
// REGION | Drawing Discipline - The Macro
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Line Candidates
// -----------------------------------------------------------------------------

    // FUNCTION | The Drawing Discipline at a Looseness - four stops, interpolated
    // ------------------------------------------------------------
    function PainterlyNPR__StrokeSynthesis__DisciplineAt(loose) {
        const L  =  Clamp(loose, 0, 1);
        let i    =  0;
        while (i < DISCIPLINE_STOPS.length - 2 && L > DISCIPLINE_STOPS[i + 1].At) i++;
        const a  =  DISCIPLINE_STOPS[i], b = DISCIPLINE_STOPS[i + 1];
        const t  =  Clamp((L - a.At) / (b.At - a.At), 0, 1);
        const out  =  { Name: t < 0.5 ? a.Name : b.Name };
        for (const key of Object.keys(a)) {
            if (typeof a[key] === 'number') out[key] = Lerp(a[key], b[key], t);
            else if (Array.isArray(a[key])) out[key] = a[key].map((x, k) => Lerp(x, b[key][k], t));
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Looseness That Applies - the slider under the view's ceiling
    // ------------------------------------------------------------
    function PainterlyNPR__StrokeSynthesis__EffectiveDiscipline() {
        return Math.min(State.Discipline, State.Camera.Ceiling);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__StrokeSynthesis__DisciplineAt,
        PainterlyNPR__StrokeSynthesis__EffectiveDiscipline,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
