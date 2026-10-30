/* =============================================================================
   PAINTERLYNPR - LINE | MATERIAL INDICATION
   =============================================================================

   FILE       : PainterlyNPR__MaterialIndication__Pass__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - MaterialIndication
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Material chosen, never textured: courses, joints, tiles and flags
                laid at their real gauge, each unit weighed, and only the chosen
                few handed to the pen
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Corners, openings, base and eaves, the light, its size on the sheet and the
     art direction field each have their say.
   - An Indication point steers the choice; the model never carries a brick.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Material Indication
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import IndicationViewsConfig from './Na__MaterialIndication__Views__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Maths__Clamp        as  Clamp,
    PainterlyNPR__Maths__Lerp         as  Lerp,
    PainterlyNPR__Maths__SmoothStep   as  SmoothStep,
    PainterlyNPR__Maths__V3Add        as  V3Add,
    PainterlyNPR__Maths__V3Dot        as  V3Dot,
    PainterlyNPR__Maths__V3Length     as  V3Length,
    PainterlyNPR__Maths__V3Lerp       as  V3Lerp,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Scale      as  V3Scale,
    PainterlyNPR__Maths__V3Sub        as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
    PainterlyNPR__SeededRandom__HashUnit,
    PainterlyNPR__SeededRandom__Noise2,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import {
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__FloatBuilder } from '../21__System__GpuResources/PainterlyNPR__GpuResources__FloatBuilder__.mjs';
import {
    PainterlyNPR__GeometryBuffers__LightAt,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import {
    PainterlyNPR__LineCandidates__DebugWriter,
    PainterlyNPR__LineCandidates__Process,
} from '../30__Line__CandidateCollection/PainterlyNPR__LineCandidates__Collect__.mjs';
import { PainterlyNPR__StrokeSynthesis__EffectiveDiscipline } from '../35__Line__DrawingDiscipline/PainterlyNPR__StrokeSynthesis__DisciplineMacro__.mjs';
import { PainterlyNPR__MaterialIndication__INDICATION_PATTERNS as INDICATION_PATTERNS } from './PainterlyNPR__MaterialIndication__Patterns__.mjs';
import { PainterlyNPR__AccentLayer__Dab } from '../52__Wash__LayerStack/PainterlyNPR__AccentLayer__Pass__.mjs';
import {
    PainterlyNPR__ArtDirection__FieldAt,
    PainterlyNPR__ArtDirection__RunOutPrepare,
} from '../66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__Field__.mjs';
import {
    PainterlyNPR__CameraRig__Project,
    PainterlyNPR__CameraRig__Camera  as  Camera,
} from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Material Indication
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__MaterialIndication__Views__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const INDICATION_VIEW  =  PainterlyNPR__ConfigAccess__Section(IndicationViewsConfig, 'PainterlyNPR__MaterialIndicationViews__Config', 'Debug', ['Laid', 'Kept']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Indication
// -----------------------------------------------------------------------------

    // MODULE STATE | Indication's Output
    // ------------------------------------------------------------
    // Strokes join the pen's (stroke synthesis draws both lists); Dabs are bricks,
    // tiles and flags picked out with a darker touch - the accent layer's R.
    const Indication  =  { Strokes: [], Dabs: new PainterlyNPR__FloatBuilder(1 << 15), Stats: { Surfaces: 0, Runs: 0, Marks: 0, Picks: 0 } };
    const INDICATION_DEBUG_LAID  =  INDICATION_VIEW.Laid;                    // <-- Every joint the pattern lays, for the Indication view
    const INDICATION_DEBUG_KEPT  =  INDICATION_VIEW.Kept;                    // <-- The ones the drawing keeps
    // ------------------------------------------------------------


    // FUNCTION | A Point on a Surface, From Its (u, v) Metres
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialIndication__At(surface, u, v) {
        return V3Add(V3Add(surface.Origin, V3Scale(surface.U, u)), V3Scale(surface.V, v));
    }
    // ------------------------------------------------------------


    // FUNCTION | Where a Surface Asks for Its Material to Be Shown
    // ------------------------------------------------------------
    // The illustrator's judgement made procedural (manifest section 08, selected
    // surface cues): texture where the eye expects it - at a wall's corners, round
    // its openings, at its base and under the eaves. In (u, v) metres, so the
    // choice belongs to the building and holds still while the camera moves.
    function PainterlyNPR__MaterialIndication__Structure(surface, u, v) {
        const range  =  surface.Clip ? surface.Clip(v) : [0, surface.Width];
        let s  =  0;
        if (surface.Corners) s = Math.max(s, Math.exp(-Math.max(0, Math.min(u - range[0], range[1] - u)) / 0.55));
        if (surface.Base)    s = Math.max(s, Math.exp(-Math.max(0, v) / 0.45));
        if (surface.Top)     s = Math.max(s, Math.exp(-Math.max(0, surface.Height - v) / 0.35));
        for (const h of surface.Holes) {
            const du  =  Math.max(h.U0 - u, 0, u - h.U1);
            const dv  =  Math.max(h.V0 - v, 0, v - h.V1);
            s  =  Math.max(s, Math.exp(-Math.hypot(du, dv) / 0.4));
        }
        return s;
    }
    // ------------------------------------------------------------


    // FUNCTION | How Strongly One Unit Asks to Be Drawn - the surface's say, then the sheet's
    // ------------------------------------------------------------
    // Structure, plus a few loose patches between from seeded noise. Then the
    // sheet: a course too fine to read on the paper goes; the lit plane bleaches
    // texture and the half-tones keep it; the Drawing Discipline simplifies first;
    // the global Amount scales it all; and the art direction field's Indication
    // lands on top - + expresses, - suppresses - so a point can ask for brickwork
    // round the door and keep it off the gable. Null when the unit is off the sheet.
    function PainterlyNPR__MaterialIndication__Importance(surface, pattern, u, v, gauge, ctx, seed) {
        const p  =  PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u, v));
        if (!(p.Depth > 0.2) || p.X < 0 || p.Y < 0 || p.X >= Gpu.Width || p.Y >= Gpu.Height) return null;
        const up        =  PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u, v + gauge));
        const courseMm  =  Math.hypot(up.X - p.X, up.Y - p.Y) / Gpu.PxPerMm;
        const field     =  PainterlyNPR__ArtDirection__FieldAt(p.X, p.Y);
        const light     =  PainterlyNPR__GeometryBuffers__LightAt(p.X, p.Y);
        const patch     =  PainterlyNPR__SeededRandom__Noise2(u / 1.3, v / 0.8, seed);
        const base      =  Math.max(0.9 * PainterlyNPR__MaterialIndication__Structure(surface, u, v) + 1.6 * (patch - 0.42), pattern.Floor);
        const sheet     =  SmoothStep(0.28, 0.6, courseMm) * (1 - 0.25 * light) * ctx.Facing * ctx.Simplify;
        return { I: base * ctx.Amount * sheet + 0.95 * field.Indication, P: p, Field: field };
    }
    // ------------------------------------------------------------


    // FUNCTION | Hand One Mark to the Pen - through the same visibility and loss as any line
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialIndication__Mark(surface, pattern, a, b, key, cls, short, ctx) {
        const edge  =  { Id: 0, ObjectId: surface.ObjectId, A: a, B: b, Class: cls, Kind: 'Indication' };
        PainterlyNPR__LineCandidates__Process(edge, ctx.Strokes, ctx.Push, {
            ObjectId :  surface.ObjectId,
            Key      :  key,
            SkipKeep :  true,
            NoProfile:  true,
            NoEnds   :  true,
            Quiet    :  true,
            Class    :  cls,
            WidthMm  :  pattern.LineMm,
            Alpha    :  pattern.Ink,
            MinMm    :  short ? 0.25 : 0.5,
            TaperIn  :  short ? 0.06 : 0.18,
            TaperOut :  short ? 0.15 : 0.45,
            Wobble   :  0.45,
            Colour   :  INDICATION_DEBUG_KEPT,
            Stats    :  ctx.Stats,
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Pick a Unit Out With a Darker Touch of Wash
    // ------------------------------------------------------------
    // The dab lies on the surface: its axes are the unit's own, projected, so a
    // brick on a foreshortened wall gets a foreshortened touch.
    function PainterlyNPR__MaterialIndication__Pick(surface, u, v, halfU, halfV, amount, seed, ctx) {
        const c  =  PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u, v));
        if (PainterlyNPR__GeometryBuffers__ObjectAt(c.X, c.Y) !== surface.ObjectId) return;
        const a  =  PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u + halfU, v));
        const b  =  PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u, v + halfV));
        PainterlyNPR__AccentLayer__Dab(Indication.Dabs, c.X, c.Y, a.X - c.X, a.Y - c.Y, b.X - c.X, b.Y - c.Y, 0, Clamp(amount, 0, 1), seed);
        ctx.Stats.Picks++;
    }
    // ------------------------------------------------------------


    // FUNCTION | Lay One Surface's Courses - bed joints, perpends, picked units
    // ------------------------------------------------------------
    // Courses fill the surface at its pattern's gauge (as brickwork is set out),
    // each bonded half a unit from the last, clipped to a gable's rake and cut
    // round the openings. Every unit is weighed; a run of kept units along a
    // course becomes one bed-joint line, its ends staggered off the unit; inside
    // the run some joints between units are ticked and a few units picked out.
    // A soldier course draws its top line and every joint - it is an
    // embellishment, kept unless something takes it away.
    function PainterlyNPR__MaterialIndication__Surface(surface, ctx) {
        if (surface.Suppressed) return;                                       // <-- Given a class that lays no courses (17, v0.7.0)
        const pattern  =  INDICATION_PATTERNS[surface.Pattern];
        if (!pattern || !pattern.Gauge) return;
        const centre   =  PainterlyNPR__MaterialIndication__At(surface, surface.Width / 2, surface.Height / 2);
        const toEye    =  Camera.Ortho ? V3Scale(Camera.Forward, -1) : V3Normalise(V3Sub(Camera.Eye, centre));
        const facing   =  V3Dot(surface.N, toEye);
        if (facing < 0.06) return;
        ctx.Facing     =  SmoothStep(0.06, 0.3, facing);
        ctx.Stats.Surfaces++;
        const seed     =  PainterlyNPR__SeededRandom__DeriveSeed(ctx.Seed, 'surface:' + surface.Id);
        const soldier  =  surface.Pattern === 'Soldier';
        const courses  =  Math.max(1, Math.round(surface.Height / pattern.Gauge));
        const g        =  surface.Height / courses;
        const unit     =  pattern.Length;
        const cls      =  soldier ? 2 : 3;
        const hash     =  (i, salt) => PainterlyNPR__SeededRandom__HashUnit(i, seed + salt);
        const project  =  (u, v) => PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u, v));

        for (let c = 0; c < courses; c++) {
            const v0 = c * g, v1 = v0 + g, vm = v0 + g / 2;
            const range  =  surface.Clip ? surface.Clip(vm) : [0, surface.Width];
            if (range[1] - range[0] < unit * 0.5) continue;

            // The course's spans between openings
            let spans  =  [range];
            for (const h of surface.Holes) {
                if (h.V0 >= v1 || h.V1 <= v0) continue;
                const next  =  [];
                for (const [a, b] of spans) {
                    if (h.U1 <= a || h.U0 >= b) { next.push([a, b]); continue; }
                    if (h.U0 > a) next.push([a, h.U0]);
                    if (h.U1 < b) next.push([h.U1, b]);
                }
                spans  =  next;
            }
            const drawTop  =  soldier || c < courses - 1;
            const offset   =  (c % 2) * pattern.Bond * unit;

            spans.forEach(([a, b], si) => {
                if (b - a < unit * 0.3) return;
                if (drawTop) { const pa = project(a, v1), pb = project(b, v1); ctx.Push(pa, pb, INDICATION_DEBUG_LAID); }
                const j0  =  Math.floor((a - offset) / unit), j1 = Math.ceil((b - offset) / unit);
                let runStart  =  null, runEnd = null, runIndex = 0;
                const closeRun  =  () => {
                    if (runStart == null) return;
                    if (drawTop) {
                        const k0 = hash(c * 4093 + si * 131 + runIndex, 11) - 0.5, k1 = hash(c * 4093 + si * 131 + runIndex, 12) - 0.5;
                        const ua  =  Clamp(runStart + k0 * unit * 0.7, a, b), ub = Clamp(runEnd + k1 * unit * 0.7, a, b);
                        if (ub - ua > unit * 0.4) {
                            PainterlyNPR__MaterialIndication__Mark(surface, pattern, PainterlyNPR__MaterialIndication__At(surface, ua, v1), PainterlyNPR__MaterialIndication__At(surface, ub, v1), `ind:${surface.Id}:${c}:${si}:${runIndex}`, cls, false, ctx);
                        }
                    }
                    runStart  =  null;
                    runIndex++;
                };
                for (let j = j0; j < j1; j++) {
                    const ua  =  Math.max(a, offset + j * unit), ub = Math.min(b, offset + (j + 1) * unit);
                    if (ub - ua < unit * 0.3) { closeRun(); continue; }
                    const cell  =  c * 8191 + (j + 4096);
                    const w     =  PainterlyNPR__MaterialIndication__Importance(surface, pattern, (ua + ub) / 2, vm, g, ctx, seed);
                    const kept  =  w && w.I > 0.42 + 0.16 * (hash(cell, 1) - 0.5);
                    if (!kept) { closeRun(); continue; }
                    if (runStart == null) runStart = ua;
                    runEnd  =  ub;
                    if (ua > a + 1e-6 && hash(cell, 2) < pattern.Perpend * Clamp(w.I, 0, 1)) {
                        PainterlyNPR__MaterialIndication__Mark(surface, pattern, PainterlyNPR__MaterialIndication__At(surface, ua, v0), PainterlyNPR__MaterialIndication__At(surface, ua, v1), `ind:${surface.Id}:${c}:p${j}`, cls, true, ctx);
                    }
                    if (hash(cell, 3) < pattern.Pick * Clamp(w.I, 0, 1.2)) {
                        PainterlyNPR__MaterialIndication__Pick(surface, (ua + ub) / 2, vm, (ub - ua) * 0.42, g * 0.42, (0.55 + 0.4 * Math.min(w.I, 1)) * w.Field.Presence, seed + cell, ctx);
                    }
                }
                closeRun();
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Flagstones - joints across the path, and a few along it
    // ------------------------------------------------------------
    // Riven flags of a cottage path, in rows 420 to 720 mm deep laid across it,
    // some rows split in two: indicated most where the path meets the porch and
    // the gate, and in patches between - a path leads the eye, so it keeps more
    // of its joints than a wall does. Every random draw is made in a fixed
    // order, whatever is kept, so the stones never reshuffle as the camera moves.
    function PainterlyNPR__MaterialIndication__Flags(path, ctx) {
        if (path.Suppressed) return;                                          // <-- The path given a class other than paving (17, v0.7.0)
        const pattern  =  INDICATION_PATTERNS.Flag;
        const seed     =  PainterlyNPR__SeededRandom__DeriveSeed(ctx.Seed, 'flags:' + path.ObjectId);
        const rng      =  PainterlyNPR__SeededRandom__Create(seed);
        const left = path.Left, right = path.Right;
        const cum      =  [0];
        for (let i = 1; i < left.length; i++) cum.push(cum[i - 1] + V3Length(V3Sub(V3Lerp(left[i], right[i], 0.5), V3Lerp(left[i - 1], right[i - 1], 0.5))));
        const total    =  cum[cum.length - 1];
        const at  =  (s, f) => {
            const S  =  Clamp(s, 0, total);
            let i    =  0;
            while (i < cum.length - 2 && cum[i + 1] < S) i++;
            const t  =  (S - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i]);
            const p  =  V3Lerp(V3Lerp(left[i], left[i + 1], t), V3Lerp(right[i], right[i + 1], t), f);
            return [p[0], p[1] + 0.002, p[2]];
        };
        const toEye    =  Camera.Ortho ? V3Scale(Camera.Forward, -1) : V3Normalise(V3Sub(Camera.Eye, at(total / 2, 0.5)));
        if (toEye[1] < 0.04) return;
        ctx.Facing     =  SmoothStep(0.04, 0.2, toEye[1]);
        ctx.Stats.Surfaces++;
        const surface  =  { ObjectId: path.ObjectId };
        const weigh  =  (s, f) => {
            const p  =  PainterlyNPR__CameraRig__Project(at(s, f));
            if (!(p.Depth > 0.2) || p.X < 0 || p.Y < 0 || p.X >= Gpu.Width || p.Y >= Gpu.Height) return null;
            const q       =  PainterlyNPR__CameraRig__Project(at(s + 0.5, f));
            const rowMm   =  Math.hypot(q.X - p.X, q.Y - p.Y) / Gpu.PxPerMm;
            const field   =  PainterlyNPR__ArtDirection__FieldAt(p.X, p.Y);
            const ends    =  Math.max(Math.exp(-s / 1.6), Math.exp(-(total - s) / 1.6));
            const patch   =  PainterlyNPR__SeededRandom__Noise2(s / 1.6, f * 0.8, seed);
            const sheet   =  SmoothStep(0.35, 0.8, rowMm) * ctx.Facing * ctx.Simplify;      // <-- No light term: a joint is a groove, and reads in the sun as well as out of it
            return { I: Math.max(0, 0.2 + 0.9 * ends + 1.6 * (patch - 0.4)) * ctx.Amount * sheet + 0.95 * field.Indication, Field: field };
        };

        let s0 = 0, s = rng.Range(0.3, 0.55), row = 0;
        while (s < total - 0.15) {
            const skew0 = rng.Spread(0.06), skew1 = rng.Spread(0.06), split = rng.Next(), splitAt = rng.Range(0.3, 0.7), splitLean = rng.Spread(0.08), pick = rng.Next(), pickAt = rng.Range(0.25, 0.75), jitter = rng.Next(), step = rng.Range(0.42, 0.72);
            ctx.Push(PainterlyNPR__CameraRig__Project(at(s + skew0, 0.04)), PainterlyNPR__CameraRig__Project(at(s + skew1, 0.96)), INDICATION_DEBUG_LAID);
            const w  =  weigh(s, 0.5);
            if (w && w.I > 0.42 + 0.16 * (jitter - 0.5)) {
                PainterlyNPR__MaterialIndication__Mark(surface, pattern, at(s + skew0, 0.04), at(s + skew1, 0.96), `flag:${path.ObjectId}:${row}`, 3, false, ctx);
                const back  =  weigh((s0 + s) / 2, 0.5);
                if (back && back.I > 0.42 && split < 0.45) {
                    PainterlyNPR__MaterialIndication__Mark(surface, pattern, at(s0 + 0.03, splitAt), at(s - 0.03, splitAt + splitLean), `flag:${path.ObjectId}:${row}:split`, 3, true, ctx);
                }
                if (back && pick < pattern.Pick * Clamp(back.I, 0, 1.2) * 2) {
                    const c  =  PainterlyNPR__CameraRig__Project(at((s0 + s) / 2, pickAt));
                    const a  =  PainterlyNPR__CameraRig__Project(at((s0 + s) / 2 + (s - s0) * 0.35, pickAt));
                    const b  =  PainterlyNPR__CameraRig__Project(at((s0 + s) / 2, pickAt + 0.18));
                    if (PainterlyNPR__GeometryBuffers__ObjectAt(c.X, c.Y) === path.ObjectId) {
                        PainterlyNPR__AccentLayer__Dab(Indication.Dabs, c.X, c.Y, a.X - c.X, a.Y - c.Y, b.X - c.X, b.Y - c.Y, 0, 0.6 * back.Field.Presence, seed + row);
                        ctx.Stats.Picks++;
                    }
                }
            }
            s0  =  s;
            s  +=  step;
            row++;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - Material Indication
    // ------------------------------------------------------------
    // Reads the truth buffers (where each surface shows, its light) and the art
    // direction field; writes pen strokes and picked-out units. Re-runs on its
    // own control, the Drawing Discipline, the seed, a camera move, or a point.
    function PainterlyNPR__MaterialIndication__Run() {
        const debug  =  Cpu.DebugInd;
        debug.Clear();
        Indication.Dabs.Clear();
        const strokes  =  [];
        const stats    =  { Surfaces: 0, Runs: 0, Marks: 0, Picks: 0 };
        PainterlyNPR__ArtDirection__RunOutPrepare();
        const ctx  =  {
            Amount   :  State.Indication.Amount,
            Simplify :  Lerp(1.0, 0.7, PainterlyNPR__StrokeSynthesis__EffectiveDiscipline()),
            Seed     :  PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, 'indication'),
            Facing   :  1,
            Strokes  :  strokes,
            Stats    :  stats,
            Push     :  PainterlyNPR__LineCandidates__DebugWriter(debug),
        };
        for (const surface of Scene.Surfaces) PainterlyNPR__MaterialIndication__Surface(surface, ctx);
        for (const path of Scene.Paths) PainterlyNPR__MaterialIndication__Flags(path, ctx);
        stats.Marks          =  strokes.length;
        Indication.Strokes   =  strokes;
        Indication.Stats     =  stats;
        Cpu.DebugIndVerts    =  debug.Length / 6;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__MaterialIndication__Run,
        Indication  as  PainterlyNPR__MaterialIndication__Indication,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
