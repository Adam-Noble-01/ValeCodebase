/* =============================================================================
   PAINTERLYNPR - LINE | CLASS AND PRIORITY
   =============================================================================

   FILE       : PainterlyNPR__LineCandidates__ClassAndPriority__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - ClassAndPriority
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A class's ink under the hierarchy contrast, and the lines a
                corner earns: construction lines and run-ons
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - A class is visibility and priority; it has no width. Since v0.8.0 a line's
     width is its technical pen's (PainterlyNPR__TechnicalPens__Tiers__.mjs, beside
     this): construction lines and run-ons are base marks, 0.13 mm.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Line Candidates
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : v0.8.0 - ClassWidth (the geometric 0.50 to 0.19 mm steps) is
                   gone: construction lines and run-ons draw with the base pen

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__DEG as DEG } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__Maths__Clamp       as  Clamp,
    PainterlyNPR__Maths__SmoothStep  as  SmoothStep,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__SeededRandom__Create } from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__TechnicalPens__WidthMm,
    PainterlyNPR__TechnicalPens__TIER_BASE  as  TIER_BASE,
} from './PainterlyNPR__TechnicalPens__Tiers__.mjs';
import {
    PainterlyNPR__LineCandidates__RunEnds,
    PainterlyNPR__LineCandidates__RunOnProfile,
} from '../31__Line__Visibility/PainterlyNPR__LineCandidates__Visibility__.mjs';
import {
    PainterlyNPR__DrawingDiscipline__LINE_CLASS_FADE          as  LINE_CLASS_FADE,
    PainterlyNPR__DrawingDiscipline__LINE_CLASS_INK           as  LINE_CLASS_INK,
    PainterlyNPR__DrawingDiscipline__LINE_DEBUG_CONSTRUCTION  as  LINE_DEBUG_CONSTRUCTION,
    PainterlyNPR__DrawingDiscipline__NEUTRAL_LOCAL            as  NEUTRAL_LOCAL,
} from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import {
    PainterlyNPR__ArtDirection__FieldAt,
    PainterlyNPR__ArtDirection__RunOutAt,
    PainterlyNPR__ArtDirection__RUN_CLASS_REACH  as  RUN_CLASS_REACH,
    PainterlyNPR__ArtDirection__RunOut           as  RunOut,
} from '../66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__Field__.mjs';

// =============================================================================
// REGION | Class And Priority
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Line Candidates
// -----------------------------------------------------------------------------

    // FUNCTION | A Class's Ink Under the Hierarchy Contrast
    // ------------------------------------------------------------
    // Contrast 1 is each class's own ink; 0 inks every class alike; 2 widens the
    // gap. Ink only: a line's width is its pen's.
    function PainterlyNPR__LineCandidates__ClassInk(lineClass) {
        return Clamp(1 - (1 - LINE_CLASS_INK[lineClass]) * State.Pen.Contrast, 0.3, 1);
    }
    // ------------------------------------------------------------


    // FUNCTION | Construction Lines - a corner's lines run on, faintly
    // ------------------------------------------------------------
    // The architect's habit of letting a primary line run past its corner as a
    // faint construction mark (manifest section 06: construction marks are the
    // Optional class). Only from TRUE ends, never where a line went behind
    // something; never in a measured elevation, where a line beyond its corner
    // would be read as geometry. Where a Line Run-out with a Run-on reaches the
    // corner, the point's run-on is drawn instead (habit: whether this line
    // has the building's habit at all).
    function PainterlyNPR__LineCandidates__Construction(strokes, frag, atStart, cls, disc, L, seed, pushDebug, habit, objectId) {
        const pen  =  State.Pen;
        if (RunOut.Points.length) {
            const corner  =  atStart ? frag[0] : frag[frag.length - 1];
            const r       =  PainterlyNPR__ArtDirection__RunOutAt(corner.X, corner.Y, cls, objectId);
            if (r && r.Node.P.RunOnMm >= 0.5) { PainterlyNPR__LineCandidates__RunOn(strokes, frag, atStart, cls, disc, L, seed, pushDebug, habit, r); return; }
        }
        if (!habit || cls > 1 || State.Camera.Ceiling < 1) return;
        const rng  =  PainterlyNPR__SeededRandom__Create(seed);
        if (!rng.Chance(disc.ConstructionChance * pen.Construction * (cls === 0 ? 1 : 0.6))) return;
        const a  =  atStart ? frag[frag.length - 1] : frag[0];
        const b  =  atStart ? frag[0] : frag[frag.length - 1];
        const len  =  Math.hypot(b.X - a.X, b.Y - a.Y);
        if (len < 2) return;
        const turn  =  rng.Spread(1.2) * DEG;
        const ux0 = (b.X - a.X) / len, uy0 = (b.Y - a.Y) / len;
        const ux  =  ux0 * Math.cos(turn) - uy0 * Math.sin(turn), uy = ux0 * Math.sin(turn) + uy0 * Math.cos(turn);
        const pxPerMm  =  Gpu.PxPerMm;
        const start  =  [b.X - ux0 * 0.6 * pxPerMm, b.Y - uy0 * 0.6 * pxPerMm];
        const reach  =  pen.ConstructionMm * rng.Range(0.6, 1.4) * pxPerMm;
        const end    =  [b.X + ux * reach, b.Y + uy * reach];
        const f  =  PainterlyNPR__ArtDirection__FieldAt(end[0], end[1]);
        if (f.Presence < LINE_CLASS_FADE[3]) return;
        pushDebug({ X: start[0], Y: start[1] }, { X: end[0], Y: end[1] }, LINE_DEBUG_CONSTRUCTION);
        strokes.push({ Points: [start, end], Straight: true, StartTrue: false, EndTrue: false, Tier: TIER_BASE, WidthMm: PainterlyNPR__TechnicalPens__WidthMm(TIER_BASE, f.Weight), Alpha: 0.34, Dry: 0.55, Loose: L, Seed: rng.IntRange(1, 1e9), TaperIn: 0.5, TaperOut: 1.6, Local: NEUTRAL_LOCAL, Source: 'Construction', ObjectId: objectId });   // <-- A construction mark: the base pen
    }
    // ------------------------------------------------------------


    // FUNCTION | A Run-on - a true corner carried on past its end, where a Line Run-out reaches
    // ------------------------------------------------------------
    // The construction habit as the point asks for it: from any straight line's
    // corner, not a building's alone; at the point's share (or the habit's own
    // chance, if higher) and length - spread by Unevenness, shortened into its
    // fall-off and by class; drawn as the line carried on - most of its class's
    // width and ink - fading and tapering as a run-out does. Never refused by
    // the paper, nor in a measured elevation: the point was put down for it. A
    // corner the line reached by running out has already run out, and stops.
    // Drawn with the base pen, as construction lines are.
    function PainterlyNPR__LineCandidates__RunOn(strokes, frag, atStart, cls, disc, L, seed, pushDebug, habit, r) {
        const pen  =  State.Pen;
        const P    =  r.Node.P;
        const a    =  atStart ? frag[frag.length - 1] : frag[0];
        const b    =  atStart ? frag[0] : frag[frag.length - 1];
        if (b.RunEnd) return;
        const rng  =  PainterlyNPR__SeededRandom__Create(seed);
        const habitChance  =  habit && cls <= 1 && State.Camera.Ceiling >= 1 ? disc.ConstructionChance * pen.Construction * (cls === 0 ? 1 : 0.6) : 0;
        if (!rng.Chance(Math.max(habitChance, P.RunOnShare * r.F))) return;
        const len  =  Math.hypot(b.X - a.X, b.Y - a.Y);
        if (len < 2) return;
        const turn  =  rng.Spread(1.2) * DEG;
        const ux0 = (b.X - a.X) / len, uy0 = (b.Y - a.Y) / len;
        const ux  =  ux0 * Math.cos(turn) - uy0 * Math.sin(turn), uy = ux0 * Math.sin(turn) + uy0 * Math.cos(turn);
        const pxPerMm  =  Gpu.PxPerMm;
        const e      =  PainterlyNPR__LineCandidates__RunEnds(r.Node, seed, atStart ? 0 : 1);
        const lenMm  =  P.RunOnMm * rng.Range(0.75, 1.25) * e.Reach * RUN_CLASS_REACH[cls] * SmoothStep(0, 0.6, r.F);
        if (lenMm < 0.8) return;
        const start  =  [b.X - ux0 * 0.6 * pxPerMm, b.Y - uy0 * 0.6 * pxPerMm];
        const end    =  [b.X + ux * lenMm * pxPerMm, b.Y + uy * lenMm * pxPerMm];
        const f  =  PainterlyNPR__ArtDirection__FieldAt(b.X, b.Y);
        pushDebug({ X: start[0], Y: start[1] }, { X: end[0], Y: end[1] }, LINE_DEBUG_CONSTRUCTION);
        strokes.push({ Points: [start, end], Straight: true, StartTrue: false, EndTrue: false, Tier: TIER_BASE, WidthMm: PainterlyNPR__TechnicalPens__WidthMm(TIER_BASE, f.Weight), Alpha: PainterlyNPR__LineCandidates__ClassInk(cls) * 0.8, Dry: 0.2 + 0.6 * L, Loose: L, Seed: rng.IntRange(1, 1e9), TaperIn: 0.3, TaperOut: 1.2, Local: NEUTRAL_LOCAL, Run: PainterlyNPR__LineCandidates__RunOnProfile(0.6, lenMm, e), Source: 'RunOn' });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__LineCandidates__ClassInk,
        PainterlyNPR__LineCandidates__Construction,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
