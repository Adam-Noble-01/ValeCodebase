/* =============================================================================
   PAINTERLYNPR - ORGANIC | FURNITURE GESTURE - A ROUND POT
   =============================================================================

   FILE       : PainterlyNPR__FurnitureGesture__Pot__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Organic - FurnitureGesture - Pot
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What a hand adds to a round pot, after its outline: the side the
                sun falls on left as paper, a second try at the line on the
                shaded side, a scribble of shade, and a few level touches on the
                ground at its foot
   CREATED    : 03-Nov-2026 (v0.8.32)

   DESCRIPTION:
   - From Adam's orangery scans (03-Nov-2026), measured on six pots: the red stops
     short of the line by about 30% of the pot's half-width down the lit side and
     9% along the top, and goes right up to it on the shaded side. On the shaded
     side the pen goes over the line again and scribbles a "3" and a zigzag.
   - On the sheet, from the sun's side (40's SunOnSheet), not from the light where
     it falls: a pot standing in a wall's shadow is still drawn as if lit from
     the drawing's side, and a turned plop is the same pot.
   - Its size goes with the drawing: under MinMm on the sheet the scribble would
     clog, so there is only the white side and the line.
   - Its white side is what an elevation sees (Adam's scans are elevations). Looking
     down the pot has no side, and the same share of its radius cut its red rim into
     stripes in a plan (v0.8.38, SideOnPitch): it fades out, and the scribble and
     the touches at its foot go with it.

   ============================================================================= */

import {
    PainterlyNPR__Maths__Clamp       as  Clamp,
    PainterlyNPR__Maths__SmoothStep  as  SmoothStep,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__GeometryBuffers__DepthAt,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import {
    PainterlyNPR__OrganicGrammar__Contours,
    PainterlyNPR__OrganicGrammar__Emit,
    PainterlyNPR__OrganicGrammar__Frame,
    PainterlyNPR__OrganicGrammar__Runs,
    PainterlyNPR__OrganicGrammar__SunOnSheet,
} from '../40__Organic__GrammarFramework/PainterlyNPR__OrganicGrammar__Framework__.mjs';
import {
    PainterlyNPR__OrganicGrammar__LeavePaper,
    PainterlyNPR__OrganicGrammar__SketchCurve,
} from '../40__Organic__GrammarFramework/PainterlyNPR__OrganicGrammar__Sketch__.mjs';
import {
    PainterlyNPR__CameraRig__Project,
    PainterlyNPR__CameraRig__Camera  as  Camera,
} from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Furniture Gesture - A Round Pot
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | The Gesture
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | A Pot's Marks - sizes over its belly's radius
    // ------------------------------------------------------------
    // The scribbles are in the pot's own frame on the sheet: u from its middle
    // toward the shaded side, v from its middle up, each 1 at its edge. Read off
    // the left-hand pot in Adam's close-up.
    const POT  =  {
        SideShare     :  0.3,                                                  // <-- The white down the lit side
        TopShare      :  0.09,                                                 // <-- The white along the top
        BelowShare    :  0.012,                                                // <-- A hair under the foot, with the line's overlap below: the loosened wash never runs down past the ground line
        SideFacing    :  [-0.05, 0.5],                                         // <-- How far the line must face the sun's side for the side's white to begin and be full: full over most of the side, or its inner edge comes to a point at the belly
        TopFacing     :  [0.55, 0.95],                                         // <-- The same, facing up
        MinAcross     :  0.4,                                                  // <-- A sun straight behind the eye still leaves a little
        Wander        :  0.28,                                                 // <-- The white's edge wanders this share of its width, as a brush's does
        PaperPastMm   :  0.12,                                                 // <-- Past the line: only a hand's looseness now the washes are held to a round thing's rim (v0.8.38; it was 0.45 when they strayed, which left a white margin outside the line too)
        PaperSmooth   :  0.6,                                                  // <-- The white's edge is smoothed along the line over this share of the radius: a contour traced on a grid has a grid's noise, and a brush does not
        ProbeOut      :  1.5,
        InFrontM      :  0.4,                                                  // <-- Nearer than this is still its outline: seen from above the ground just below a bowl's belly IS nearer than the belly, and a tighter test flickers along the foot, breaking the white into teeth. Its own plop's leaves are told apart by name, however close
        MinMm         :  2,                                                    // <-- A radius on the sheet under this has no room for a scribble
        SideOnPitch   :  [0.45, 0.85],                                         // <-- How far the eye looks down (the view's forward, downward share) before the side's white begins to go, and is gone: about 27 and 58 degrees
        ShadeFacing   :  -0.25,                                                // <-- Facing away from the sun past this, the line is gone over again
        ShadeOffMm    :  [-0.1, 0.28],
        Scribble      :  [[0.44, 0.5], [0.42, 0.3], [0.5, 0.24], [0.8, 0.74], [0.49, 0], [0.72, -0.08], [0.8, -0.3], [0.7, -0.66], [0.49, -0.92]],
        ScribbleJitter:  0.05,
        Zigzag        :  [[-0.1, -0.85], [0.2, -0.45], [0.16, -0.9], [0.36, -0.6], [0.5, -0.75]],
        ZigzagChance  :  0.6,
        TickRows      :  3,                                                    // <-- The level touches at its foot
        TickDrop      :  [0.07, 0.09],                                         // <-- The first's drop below the foot and the step to the next, over the radius
        TickLength    :  [0.25, 0.62],
        TickFrom      :  [-0.75, 0.3],
    };
    // ------------------------------------------------------------


    // FUNCTION | A Round Pot's Gesture
    // ------------------------------------------------------------
    // organic.Pot: its Foot and Top in the world, and its soil's object. circle:
    // the pot on the sheet, as the grammar projected its belly.
    function PainterlyNPR__FurnitureGesture__Pot(organic, circle, seed, strokes, pushDebug) {
        const Q        =  POT;
        const pxPerMm  =  Gpu.PxPerMm;
        const R        =  circle.R;
        const foot     =  PainterlyNPR__CameraRig__Project(organic.Pot.Foot);
        const top      =  PainterlyNPR__CameraRig__Project(organic.Pot.Top);
        const cx       =  (foot.X + top.X) / 2, cy = (foot.Y + top.Y) / 2;
        const Ry       =  Math.max(Math.abs(top.Y - foot.Y) / 2, R * 0.35);
        const sun      =  PainterlyNPR__OrganicGrammar__SunOnSheet();
        const id       =  organic.ObjectId;
        const sideOn   =  1 - SmoothStep(Q.SideOnPitch[0], Q.SideOnPitch[1], Math.abs(Camera.Forward[1]));   // <-- 1 from the side, 0 from above
        const box      =  [Math.max(0, cx - R * 1.3 - 4), Math.max(0, cy - Ry - R * 0.7 - 4), Math.min(Gpu.Width - 1, cx + R * 1.3 + 4), Math.min(Gpu.Height - 1, cy + Ry + R * 0.7 + 4)];
        if (!(box[2] > box[0] && box[3] > box[1])) return;

        // The line round it: the lit side left as paper, the shaded side gone over again
        const step   =  Math.max(1.25, 0.35 * pxPerMm);
        const probe  =  step + Q.ProbeOut;
        const traced  =  PainterlyNPR__OrganicGrammar__Contours(box, step, (x, y) => PainterlyNPR__GeometryBuffers__ObjectAt(x, y) === id);
        const outer   =  traced.reduce((best, c) => (c.Points.length > best ? c.Points.length : best), 0);
        traced.filter(c => c.Points.length === outer).forEach((contour, ci) => {   // <-- Its outer line alone: a loop round a flower hanging in front of the pot, or round its soil, is no edge of the pot's
            const P    =  PainterlyNPR__OrganicGrammar__Frame(contour);
            const rng  =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(seed, 'line:' + ci));
            const a1   =  rng.Range(0, Math.PI * 2), a2 = rng.Range(0, Math.PI * 2);
            let s = 0, last = P[0];
            for (const p of P) {
                s  +=  Math.hypot(p.X - last.X, p.Y - last.Y);
                last  =  p;
                const ox = p.X + p.NX * probe, oy = p.Y + p.NY * probe, ix = p.X - p.NX * probe, iy = p.Y - p.NY * probe;
                const out  =  PainterlyNPR__GeometryBuffers__ObjectAt(ox, oy);
                const dIn  =  PainterlyNPR__GeometryBuffers__DepthAt(ix, iy);
                const dOut     =  PainterlyNPR__GeometryBuffers__DepthAt(ox, oy);
                const ownPart  =  out >= 0 && organic.Uid != null && (Scene.ObjectById.get(out) || {}).Uid === organic.Uid;
                p.Sil     =  out !== organic.Pot.SoilId && (out < 0 || ownPart || dOut >= dIn - (Q.InFrontM + dIn * 0.004));   // <-- The white runs on past a leaf of its own, its edge smoothed across it, but stops at something else standing well in front
                p.Clear   =  p.Sil && !(ownPart && dOut < dIn);                 // <-- The pen goes over only what is the pot's own line
                p.Facing  =  p.NX * sun.Side;
                const side    =  SmoothStep(Q.SideFacing[0], Q.SideFacing[1], p.Facing) * Q.SideShare * Math.max(Q.MinAcross, sun.Across);
                const above   =  Math.max(SmoothStep(Q.TopFacing[0], Q.TopFacing[1], p.NY) * Q.TopShare, SmoothStep(Q.TopFacing[0], Q.TopFacing[1], -p.NY) * Q.BelowShare);
                const wander  =  1 + Q.Wander * (0.6 * Math.sin(s / (R * 0.7) + a1) + 0.4 * Math.sin(s / (R * 0.29) + a2));
                p.Gap     =  Math.max(side, above) * R * wander * sideOn;
            }
            PainterlyNPR__OrganicGrammar__Runs(P, contour.Closed, p => p.Sil && p.Gap > 0.15).forEach((run) => {
                const past    =  Q.PaperPastMm * pxPerMm;
                const reach   =  Math.max(1, Math.round(Q.PaperSmooth * R / step / 2));
                const smooth  =  run.map((p, i) => {                            // <-- Its place, its normal and its gap, each averaged along the line
                    let x = 0, y = 0, nx = 0, ny = 0, gap = 0, n = 0;
                    for (let k = Math.max(0, i - reach); k <= Math.min(run.length - 1, i + reach); k++) { const q = run[k]; x += q.X; y += q.Y; nx += q.NX; ny += q.NY; gap += q.Gap; n++; }
                    const len  =  Math.hypot(nx, ny) || 1;
                    return { X: x / n, Y: y / n, NX: nx / len, NY: ny / len, Gap: gap / n };
                });
                PainterlyNPR__OrganicGrammar__LeavePaper(smooth.map(p => ({ X: p.X + p.NX * past, Y: p.Y + p.NY * past })), smooth.map(p => ({ X: p.X - p.NX * p.Gap, Y: p.Y - p.NY * p.Gap })));
            });
            PainterlyNPR__OrganicGrammar__Runs(P, contour.Closed, p => p.Clear && p.Facing < Q.ShadeFacing).forEach((run, ri) => {
                const off  =  rng.Range(Q.ShadeOffMm[0], Q.ShadeOffMm[1]) * pxPerMm;
                PainterlyNPR__OrganicGrammar__Emit(run.map(p => ({ X: p.X + p.NX * off, Y: p.Y + p.NY * off })), strokes, { Class: 2, Seed: seed + 301 + ci * 13 + ri, Alpha: 0.75, Loose: 0, TaperIn: 0.6, TaperOut: 1.2, Wobble: 0.5, SpacingMm: 0.35 }, pushDebug);
            });
        });
        if (R < Q.MinMm * pxPerMm || sideOn < 0.5) return;

        // A scribble of shade: only on the pot itself, broken where anything stands in front
        const rng     =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(seed, 'scribble'));
        const toward  =  -sun.Side;
        const scribble  =  (template, key) => {
            const points  =  template.map(([u, v]) => ({ X: cx + toward * (u + rng.Spread(Q.ScribbleJitter)) * R, Y: cy + (v + rng.Spread(Q.ScribbleJitter)) * Ry, Depth: 1 }));
            let run  =  [];
            const options  =  { Class: 2, Seed: seed + key, Alpha: 0.86, Loose: 0, TaperIn: 0.2, TaperOut: 0.6, Wobble: 0.35, SpacingMm: 0.3 };
            for (const p of PainterlyNPR__OrganicGrammar__SketchCurve(points)) {
                if (PainterlyNPR__GeometryBuffers__ObjectAt(p.X, p.Y) === id) run.push({ X: p.X, Y: p.Y });
                else if (run.length) { PainterlyNPR__OrganicGrammar__Emit(run, strokes, options, pushDebug); run = []; }
            }
            PainterlyNPR__OrganicGrammar__Emit(run, strokes, options, pushDebug);
        };
        scribble(Q.Scribble, 401);
        if (rng.Chance(Q.ZigzagChance)) scribble(Q.Zigzag, 503);

        // A few level touches on the ground at its foot
        const footY  =  foot.Y - R * Q.TickDrop[0];
        for (let i = 0; i < Q.TickRows; i++) {
            const from  =  foot.X + toward * rng.Range(Q.TickFrom[0], Q.TickFrom[1]) * R;
            const len   =  toward * rng.Range(Q.TickLength[0], Q.TickLength[1]) * R;
            const y     =  footY - i * R * Q.TickDrop[1];
            const line  =  [];
            for (let k = 0; k <= 6; k++) line.push({ X: from + len * k / 6, Y: y + Clamp(k / 6, 0, 1) * rng.Spread(0.4) });
            PainterlyNPR__OrganicGrammar__Emit(line, strokes, { Class: 3, Seed: seed + 601 + i, Alpha: 0.7, Loose: 0, TaperIn: 0.2, TaperOut: 0.5, Wobble: 0.3, SpacingMm: 0.3 }, pushDebug);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__FurnitureGesture__Pot,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
