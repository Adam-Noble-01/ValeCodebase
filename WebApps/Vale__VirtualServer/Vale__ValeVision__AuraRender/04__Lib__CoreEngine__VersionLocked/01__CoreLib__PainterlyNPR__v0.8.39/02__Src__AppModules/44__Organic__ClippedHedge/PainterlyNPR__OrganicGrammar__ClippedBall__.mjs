/* =============================================================================
   PAINTERLYNPR - ORGANIC | CLIPPED HEDGE - A CLIPPED BALL
   =============================================================================

   FILE       : PainterlyNPR__OrganicGrammar__ClippedBall__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Organic - ClippedHedge - ClippedBall
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What a hand adds to a ball clipped smooth, after its outline: a tick
                of paper left low on the side away from the sun, a sliver at its
                rim, searching arcs on its shaded side and a touch where the stem
                meets it
   CREATED    : 03-Nov-2026 (v0.8.32)

   DESCRIPTION:
   - From Adam's orangery scans (03-Nov-2026), measured on four balls: the tick
     runs round the lower quarter away from the light, at about half the ball's
     radius from its middle, a seventh of its radius thick at most. It is paper
     the brush went round, not a reflection worked out from the sun, so it goes
     by the side the sun is on and never moves with the ball's shading.
   - All on the sheet, from the ball's circle: a round thing looks the same from
     every side, and its turn in the world means nothing.
   - Its size goes with the drawing: under MinMm on the sheet there is no room
     for any of it.

   ============================================================================= */

import { PainterlyNPR__SeededRandom__Create } from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__OrganicGrammar__Emit,
    PainterlyNPR__OrganicGrammar__SunOnSheet,
} from '../40__Organic__GrammarFramework/PainterlyNPR__OrganicGrammar__Framework__.mjs';
import {
    PainterlyNPR__OrganicGrammar__LeavePaper,
    PainterlyNPR__OrganicGrammar__SketchSeen,
} from '../40__Organic__GrammarFramework/PainterlyNPR__OrganicGrammar__Sketch__.mjs';

// =============================================================================
// REGION | Clipped Hedge - A Clipped Ball
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | The Gesture
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | A Ball's Marks - angles in radians, from level on the side away from the sun; sizes over its radius
    // ------------------------------------------------------------
    const BALL  =  {
        MinMm         :  1.2,                                                  // <-- A ball's radius on the sheet under this has no room for a tick
        TickAngle     :  [-1.0, -0.5],                                         // <-- The middle of the tick: the lower quarter away from the light
        TickSpan      :  [0.42, 0.78],                                         // <-- Half its length round the ball
        TickRadius    :  [0.48, 0.62],                                         // <-- How far from the ball's middle
        TickThick     :  [0.04, 0.065],                                        // <-- Half its thickness at its fullest
        TickFullAt    :  1.6,                                                  // <-- Above 1, its fullest part toward the upper end, as the scans' are
        TickSteps     :  14,
        SliverChance  :  0.55,                                                 // <-- The white left at the rim, on two of the four balls
        SliverAhead   :  [0.8, 1.2],                                           // <-- How far round from the tick, toward the top
        SliverSpan    :  0.2,
        SliverRadius  :  0.9,
        SliverThick   :  0.022,
        SliverSteps   :  8,
        ArcAngle      :  [-0.25, 0.75],                                        // <-- The searching arcs' middle: level to high on the shaded side
        ArcSpan       :  [0.4, 0.75],
        ArcRadius     :  [1.03, 1.08],                                         // <-- Just outside the first line, as a second try at the circle
        ArcCount      :  [1, 2],
        ArcStepMm     :  0.4,
        CollarOut     :  0.24,                                                 // <-- The touch at the ball's foot, past the stem on the sun's side
        CollarIn      :  0.05,
        CollarY       :  0.985,
    };
    // ------------------------------------------------------------


    // FUNCTION | A Clipped Ball's Gesture
    // ------------------------------------------------------------
    // circle: the ball on the sheet, as the grammar projected its mass.
    function PainterlyNPR__OrganicGrammar__ClippedBall(organic, circle, seed, strokes, pushDebug) {
        const pxPerMm  =  Gpu.PxPerMm;
        const R        =  circle.R;
        if (R < BALL.MinMm * pxPerMm) return;
        const Q        =  BALL;
        const rng      =  PainterlyNPR__SeededRandom__Create(seed);
        const away     =  -PainterlyNPR__OrganicGrammar__SunOnSheet().Side;
        const at       =  (angle, radius) => [circle.X + away * Math.cos(angle) * radius, circle.Y + Math.sin(angle) * radius];
        const range    =  (pair) => rng.Range(pair[0], pair[1]);

        // Paper left along an arc: thin at both ends, fullest toward the upper end
        const arcOfPaper  =  (angle, span, radius, thick, steps) => {
            const outer = [], inner = [];
            for (let k = 0; k <= steps; k++) {
                const t     =  k / steps;
                const a     =  angle + span * (2 * t - 1);
                const half  =  thick * Math.pow(Math.sin(Math.PI * Math.pow(t, Q.TickFullAt)), 0.8);
                const o     =  at(a, radius + half), i = at(a, radius - half);
                outer.push({ X: o[0], Y: o[1] });
                inner.push({ X: i[0], Y: i[1] });
            }
            PainterlyNPR__OrganicGrammar__LeavePaper(outer, inner);
        };
        const tickAngle  =  range(Q.TickAngle);
        if (organic.Tick !== false) {
            arcOfPaper(tickAngle, range(Q.TickSpan), R * range(Q.TickRadius), R * range(Q.TickThick), Q.TickSteps);
            if (rng.Chance(Q.SliverChance)) arcOfPaper(tickAngle + range(Q.SliverAhead), Q.SliverSpan, R * Q.SliverRadius, R * Q.SliverThick, Q.SliverSteps);
        }

        // Second tries at the circle, on its shaded side
        const arcs  =  rng.IntRange(Q.ArcCount[0], Q.ArcCount[1]);
        for (let i = 0; i < arcs; i++) {
            const angle  =  range(Q.ArcAngle), span = range(Q.ArcSpan), radius = R * range(Q.ArcRadius);
            const steps  =  Math.max(6, Math.ceil(radius * span * 2 / (Q.ArcStepMm * pxPerMm)));
            let run      =  [];
            const flush  =  () => { PainterlyNPR__OrganicGrammar__Emit(run, strokes, { Class: 2, Seed: seed + 101 + i, Alpha: 0.78, Loose: 0, TaperIn: 0.6, TaperOut: 1.6, Wobble: 0.5, SpacingMm: 0.35 }, pushDebug); run = []; };
            for (let k = 0; k <= steps; k++) {
                const [x, y]  =  at(angle + span * (2 * k / steps - 1), radius);
                if (PainterlyNPR__OrganicGrammar__SketchSeen(x, y, circle.Depth)) run.push({ X: x, Y: y });
                else flush();
            }
            flush();
        }

        // Where the stem meets it: a short level touch across its foot
        const y     =  circle.Y - R * Q.CollarY;
        const from  =  circle.X - away * R * Q.CollarOut, to = circle.X + away * R * Q.CollarIn;
        const line  =  [];
        for (let k = 0; k <= 5; k++) line.push({ X: from + (to - from) * k / 5, Y: y });
        if (PainterlyNPR__OrganicGrammar__SketchSeen(circle.X, y, circle.Depth)) PainterlyNPR__OrganicGrammar__Emit(line, strokes, { Class: 2, Seed: seed + 211, Alpha: 0.85, Loose: 0, TaperIn: 0.1, TaperOut: 0.3, Wobble: 0.2, SpacingMm: 0.3 }, pushDebug);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__OrganicGrammar__ClippedBall,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
