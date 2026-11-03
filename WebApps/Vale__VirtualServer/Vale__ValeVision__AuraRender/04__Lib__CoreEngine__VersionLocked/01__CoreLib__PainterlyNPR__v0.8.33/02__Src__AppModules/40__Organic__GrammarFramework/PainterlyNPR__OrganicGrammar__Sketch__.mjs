/* =============================================================================
   PAINTERLYNPR - ORGANIC | GRAMMAR FRAMEWORK - SKETCH
   =============================================================================

   FILE       : PainterlyNPR__OrganicGrammar__Sketch__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Organic - GrammarFramework - Sketch
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Pen laid by hand over the wash, with no masses of its own: lines
                in the world, strap leaves looped on the sheet, buds and flecks;
                and paper left, the place a brush went round
   CREATED    : 03-Nov-2026 (v0.8.32)

   DESCRIPTION:
   - An organic of Kind 'Sketch' holds a list of entries, each one stroke of the
     hand, in world points (Adam's orangery scans, 03-Nov-2026: the pen at a
     pot's planting runs free of the washes under it, so it cannot be traced
     from them):
       { Line: [p0, p1, ...], Alpha?, TaperIn?, TaperOut?, Wobble?, Class?, Dry? }
                 a smooth line through world points, tested by depth: a stem, a
                 corkscrew, a rim
       { Straps: [{ Blade: [start, ctrl, tip], WidthM, Lift? }, ...], Alpha? }
                 looped leaves in one stroke of the pen: up, round the tip, down,
                 on to the next. Widened on the sheet, so a leaf reads from any
                 side; Lift leaves paper along it
       { Ring: centre, RM, Alpha? }
                 a small open circle: a bud
       { Fleck: point, Size?, Alpha? }
                 a dot of the pen
   - Every stroke goes through the grammar's one Emit, so the paper, the field
     and the asset's hand (Overdraw, Wobble) act on it as on any plant's.
   - Paper left is its own accent channel (Accent2's alpha, read by the wash):
     LeavePaper is how a gesture asks for it.

   ============================================================================= */

import { PainterlyNPR__Maths__Clamp as Clamp } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__GeometryBuffers__MaxDepth3,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__LineCandidates__Lines as Lines } from '../30__Line__CandidateCollection/PainterlyNPR__LineCandidates__Collect__.mjs';
import { PainterlyNPR__AccentLayer__Ribbon } from '../52__Wash__LayerStack/PainterlyNPR__AccentLayer__Pass__.mjs';
import { PainterlyNPR__ArtDirection__FieldAt } from '../66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__Field__.mjs';
import { PainterlyNPR__CameraRig__Project } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
import {
    PainterlyNPR__OrganicGrammar__Circle,
    PainterlyNPR__OrganicGrammar__Emit,
    PainterlyNPR__OrganicGrammar__Mark,
} from './PainterlyNPR__OrganicGrammar__Framework__.mjs';

// =============================================================================
// REGION | Grammar Framework - Sketch
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Paper Left
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | How a Stroke Is Laid
    // ------------------------------------------------------------
    const SKETCH  =  {
        NearM        :  0.2,                                                   // <-- Nearer the eye than this is behind the camera, or in it
        SeenM        :  0.03,                                                  // <-- The depth test's slack, as a hollyhock's stem's: a line on a surface is never hidden by it
        SeenShare    :  0.003,
        StepMm       :  0.3,                                                   // <-- A line's samples on the sheet
        StrapSteps   :  18,                                                    // <-- A leaf's samples, up one side
        StrapPeak    :  0.85,                                                  // <-- Where a leaf is widest: a power on its length, below 1 toward the tip
        StrapFill    :  0.7,                                                   // <-- How soon it reaches that width, unless the leaf says: below 1 a strap, above it a spindle
        LiftFrom     :  0.3,                                                   // <-- Paper left in a leaf only this far along it: its foot is down among the soil and the rim
        RingSteps    :  16,
        RingOverlap  :  1.1,                                                   // <-- Turns round a bud: the pen runs a little past where it began
        Dry          :  0.15,                                                  // <-- Firm ink: a line laid on purpose, not a searching one
        PaperFrom    :  0.25,                                                  // <-- Where the paper is taking the drawing there is nothing to leave paper in
        PaperGain    :  1.4,
    };
    // ------------------------------------------------------------


    // FUNCTION | Leave Paper Between Two Lines - the wash and its shadow glaze lifted away
    // ------------------------------------------------------------
    // a and b: lists of { X, Y } in sheet pixels, one across from the other. Flat,
    // so what is left has the edge a brush went round. The wash reads it from
    // Accent2's alpha. Where the paper is already taking the drawing it fades with it.
    function PainterlyNPR__OrganicGrammar__LeavePaper(a, b) {
        const amount  =  (p) => {
            const presence  =  PainterlyNPR__ArtDirection__FieldAt(p.X, p.Y).Presence;
            return { X: p.X, Y: p.Y, Amount: presence < SKETCH.PaperFrom ? 0 : Clamp(presence * SKETCH.PaperGain, 0, 1) };
        };
        PainterlyNPR__AccentLayer__Ribbon(Lines.Dabs2, a.map(amount), b.map(amount), 3);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Entries
// -----------------------------------------------------------------------------

    // FUNCTION | Can the Eye See a Point of a Line?
    // ------------------------------------------------------------
    // By depth alone, never by object: the far side of a pot's rim lands on the
    // pot, and an object test would draw it through the near side.
    function PainterlyNPR__OrganicGrammar__SketchSeen(x, y, depth) {
        return PainterlyNPR__GeometryBuffers__ObjectAt(x, y) < 0 || depth <= PainterlyNPR__GeometryBuffers__MaxDepth3(x, y) + SKETCH.SeenM + depth * SKETCH.SeenShare;
    }
    // ------------------------------------------------------------


    // FUNCTION | Hand the Seen Runs of Some Points On as Strokes
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__SketchRuns(points, strokes, options, pushDebug) {
        let run  =  [];
        for (const p of points) {
            if (PainterlyNPR__OrganicGrammar__SketchSeen(p.X, p.Y, p.Depth)) run.push({ X: p.X, Y: p.Y });
            else if (run.length) { PainterlyNPR__OrganicGrammar__Emit(run, strokes, options, pushDebug); run = []; }
        }
        PainterlyNPR__OrganicGrammar__Emit(run, strokes, options, pushDebug);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Smooth Curve Through Projected Points - Catmull-Rom, on the sheet
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__SketchCurve(points) {
        const step  =  SKETCH.StepMm * Gpu.PxPerMm;
        const n     =  points.length;
        const out   =  [];
        for (let i = 0; i < n - 1; i++) {
            const p0 = points[Math.max(i - 1, 0)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(i + 2, n - 1)];
            const steps  =  Math.max(1, Math.ceil(Math.hypot(p2.X - p1.X, p2.Y - p1.Y) / step));
            for (let k = i ? 1 : 0; k <= steps; k++) {
                const t = k / steps, t2 = t * t, t3 = t2 * t;
                const along  =  (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
                out.push({ X: along(p0.X, p1.X, p2.X, p3.X), Y: along(p0.Y, p1.Y, p2.Y, p3.Y), Depth: p1.Depth + (p2.Depth - p1.Depth) * t });
            }
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | One Line - a smooth line through world points
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__SketchLine(entry, seed, strokes, pushDebug) {
        const points  =  entry.Line.map(PainterlyNPR__CameraRig__Project);
        if (points.some(p => p.Depth < SKETCH.NearM)) return;
        PainterlyNPR__OrganicGrammar__SketchRuns(PainterlyNPR__OrganicGrammar__SketchCurve(points), strokes, {
            Class: entry.Class != null ? entry.Class : 2, Seed: seed, Alpha: entry.Alpha != null ? entry.Alpha : 0.85, Loose: 0,
            TaperIn: entry.TaperIn != null ? entry.TaperIn : 0.3, TaperOut: entry.TaperOut != null ? entry.TaperOut : 1.2,
            Wobble: entry.Wobble != null ? entry.Wobble : 0.35, SpacingMm: 0.35, Dry: entry.Dry != null ? entry.Dry : SKETCH.Dry,
        }, pushDebug);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Run of Strap Leaves - looped in one stroke of the pen
    // ------------------------------------------------------------
    // Each leaf's middle is a curve through the world (start, ctrl, tip); its two
    // sides are drawn on the sheet, either side of that curve, pointed at both
    // ends: up one side, round the tip, down the other, on to the next leaf. That
    // is the scribble at the foot of Adam's standards, all V's and loops. A leaf
    // with Lift has paper left inside it, so it cuts white through a wash.
    function PainterlyNPR__OrganicGrammar__SketchStraps(entry, seed, strokes, pushDebug) {
        const n        =  SKETCH.StrapSteps;
        const outline  =  [];
        entry.Straps.forEach((strap) => {
            const a = PainterlyNPR__CameraRig__Project(strap.Blade[0]), b = PainterlyNPR__CameraRig__Project(strap.Blade[1]), c = PainterlyNPR__CameraRig__Project(strap.Blade[2]);
            if (a.Depth < SKETCH.NearM || b.Depth < SKETCH.NearM || c.Depth < SKETCH.NearM) return;
            const width   =  PainterlyNPR__OrganicGrammar__Circle({ C: strap.Blade[1], R: strap.WidthM }).R;
            const middle  =  [];
            for (let k = 0; k <= n; k++) {
                const t = k / n, u = 1 - t;
                const tx = 2 * u * (b.X - a.X) + 2 * t * (c.X - b.X), ty = 2 * u * (b.Y - a.Y) + 2 * t * (c.Y - b.Y);
                const len  =  Math.hypot(tx, ty) || 1;
                middle.push({
                    X: u * u * a.X + 2 * u * t * b.X + t * t * c.X, Y: u * u * a.Y + 2 * u * t * b.Y + t * t * c.Y,
                    Depth: u * u * a.Depth + 2 * u * t * b.Depth + t * t * c.Depth,
                    NX: -ty / len, NY: tx / len,
                    H: width * Math.pow(Math.sin(Math.PI * Math.pow(t, SKETCH.StrapPeak)), strap.Fill != null ? strap.Fill : SKETCH.StrapFill),
                });
            }
            for (const m of middle) outline.push({ X: m.X + m.NX * m.H, Y: m.Y + m.NY * m.H, Depth: m.Depth });
            for (let k = n - 1; k >= 0; k--) outline.push({ X: middle[k].X - middle[k].NX * middle[k].H, Y: middle[k].Y - middle[k].NY * middle[k].H, Depth: middle[k].Depth });
            if (!strap.Lift) return;
            const shown  =  middle.slice(Math.ceil(n * SKETCH.LiftFrom)).filter(m => PainterlyNPR__OrganicGrammar__SketchSeen(m.X, m.Y, m.Depth));
            PainterlyNPR__OrganicGrammar__LeavePaper(shown.map(m => ({ X: m.X + m.NX * m.H, Y: m.Y + m.NY * m.H })), shown.map(m => ({ X: m.X - m.NX * m.H, Y: m.Y - m.NY * m.H })));
        });
        PainterlyNPR__OrganicGrammar__SketchRuns(outline, strokes, { Class: 2, Seed: seed, Alpha: entry.Alpha != null ? entry.Alpha : 0.92, Loose: 0, TaperIn: 0.25, TaperOut: 0.9, Wobble: 0.3, SpacingMm: 0.3, Dry: entry.Dry != null ? entry.Dry : SKETCH.Dry }, pushDebug);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Bud - a small open circle, the pen running a little past its start
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__SketchRing(entry, seed, strokes, pushDebug) {
        const c  =  PainterlyNPR__CameraRig__Project(entry.Ring);
        if (c.Depth < SKETCH.NearM) return;
        const r       =  PainterlyNPR__OrganicGrammar__Circle({ C: entry.Ring, R: entry.RM }).R;
        const rng     =  PainterlyNPR__SeededRandom__Create(seed);
        const start   =  rng.Range(0, Math.PI * 2), squash = rng.Range(0.82, 1), turn = rng.Range(0, Math.PI);
        const n       =  Math.ceil(SKETCH.RingSteps * SKETCH.RingOverlap);
        const points  =  [];
        for (let k = 0; k <= n; k++) {
            const a  =  start + (k / SKETCH.RingSteps) * Math.PI * 2;
            const u  =  Math.cos(a) * r * (1 + rng.Spread(0.05)), v = Math.sin(a) * r * squash * (1 + rng.Spread(0.05));
            points.push({ X: c.X + u * Math.cos(turn) - v * Math.sin(turn), Y: c.Y + u * Math.sin(turn) + v * Math.cos(turn), Depth: c.Depth });
        }
        PainterlyNPR__OrganicGrammar__SketchRuns(points, strokes, { Class: 2, Seed: seed, Alpha: entry.Alpha != null ? entry.Alpha : 0.9, Loose: 0, TaperIn: 0.05, TaperOut: 0.15, Wobble: 0.2, SpacingMm: 0.15, Dry: entry.Dry != null ? entry.Dry : SKETCH.Dry }, pushDebug);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Fleck - a dot of the pen
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__SketchFleck(entry, seed, strokes, pushDebug) {
        const p  =  PainterlyNPR__CameraRig__Project(entry.Fleck);
        if (p.Depth < SKETCH.NearM || !PainterlyNPR__OrganicGrammar__SketchSeen(p.X, p.Y, p.Depth)) return;
        const mark  =  PainterlyNPR__OrganicGrammar__Mark('Stipple', p.X, p.Y, null, null, PainterlyNPR__SeededRandom__Create(seed), Gpu.PxPerMm, entry.Size || 1);
        PainterlyNPR__OrganicGrammar__Emit(mark.Points, strokes, { Class: 3, Seed: seed, Alpha: entry.Alpha != null ? entry.Alpha : 0.9, Loose: 0, TaperIn: mark.TaperIn, TaperOut: mark.TaperOut, Wobble: 0, SpacingMm: 0.1, Dry: entry.Dry }, pushDebug);
    }
    // ------------------------------------------------------------


    // FUNCTION | One Sketch - its entries in their order, each with its own seed
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__Sketch(organic, strokes, seed, pushDebug) {
        organic.Sketch.forEach((entry, i) => {
            const own  =  PainterlyNPR__SeededRandom__DeriveSeed(seed, 'sketch:' + i);
            if (entry.Line) PainterlyNPR__OrganicGrammar__SketchLine(entry, own, strokes, pushDebug);
            else if (entry.Straps) PainterlyNPR__OrganicGrammar__SketchStraps(entry, own, strokes, pushDebug);
            else if (entry.Ring) PainterlyNPR__OrganicGrammar__SketchRing(entry, own, strokes, pushDebug);
            else if (entry.Fleck) PainterlyNPR__OrganicGrammar__SketchFleck(entry, own, strokes, pushDebug);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__OrganicGrammar__LeavePaper,
        PainterlyNPR__OrganicGrammar__Sketch,
        PainterlyNPR__OrganicGrammar__SketchCurve,
        PainterlyNPR__OrganicGrammar__SketchSeen,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
