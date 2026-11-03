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
   - A Material art direction point (its Type is 'Indication' in saved drawings)
     steers the choice, and moves the material's hand where it reaches: how loose,
     random, rounded, rough and broken its line work is, and how many accents it
     takes (Depiction, v0.8.22). The model never carries a brick.
   - A PICKED UNIT IS A DRAWN UNIT (v0.8.22): its joints are drawn all round it, and
     its touch of wash fits inside them, as a stone's does. Adam: "ensure the accent
     patches fall within the drawn bricks like we just did the stone".

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Material Indication
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : v0.8.0 - a mark is drawn with the base technical pen (Tier 0,
                   0.13 mm), never the pattern's own width

   ============================================================================= */

import IndicationConfig from './Na__MaterialIndication__Config.json' with { type: 'json' };
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
    PainterlyNPR__GeometryBuffers__DepthAt,
    PainterlyNPR__GeometryBuffers__LightAt,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import {
    PainterlyNPR__LineCandidates__DebugWriter,
    PainterlyNPR__LineCandidates__Process,
} from '../30__Line__CandidateCollection/PainterlyNPR__LineCandidates__Collect__.mjs';
import { PainterlyNPR__TechnicalPens__TIER_BASE as TIER_BASE } from '../32__Line__ClassAndPriority/PainterlyNPR__TechnicalPens__Tiers__.mjs';
import { PainterlyNPR__StrokeSynthesis__EffectiveDiscipline } from '../35__Line__DrawingDiscipline/PainterlyNPR__StrokeSynthesis__DisciplineMacro__.mjs';
import {
    PainterlyNPR__MaterialDepiction__At,
    PainterlyNPR__MaterialDepiction__AtWorld,
    PainterlyNPR__MaterialDepiction__Dashes,
    PainterlyNPR__MaterialDepiction__HandKey,
    PainterlyNPR__MaterialDepiction__LooseAdd,
    PainterlyNPR__MaterialDepiction__MarkSalt,
    PainterlyNPR__MaterialDepiction__Over,
    PainterlyNPR__MaterialDepiction__Own,
    PainterlyNPR__MaterialDepiction__Prepare,
    PainterlyNPR__MaterialDepiction__SeedHere,
    PainterlyNPR__MaterialDepiction__Times,
    PainterlyNPR__MaterialDepiction__Trace,
    PainterlyNPR__MaterialDepiction__Varies,
    PainterlyNPR__MaterialDepiction__REACH  as  DEPICT,
} from './PainterlyNPR__MaterialIndication__Depiction__.mjs';
import { PainterlyNPR__MaterialIndication__INDICATION_PATTERNS as INDICATION_PATTERNS } from './PainterlyNPR__MaterialIndication__Patterns__.mjs';
import {
    PainterlyNPR__MaterialIndication__Rubble,
    PainterlyNPR__Rubble__DepthTolerance,
} from './PainterlyNPR__MaterialIndication__Rubble__.mjs';
import { PainterlyNPR__AccentLayer__Patch } from '../52__Wash__LayerStack/PainterlyNPR__AccentLayer__Pass__.mjs';
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
    const OBLIQUE          =  PainterlyNPR__ConfigAccess__Section(IndicationConfig, 'PainterlyNPR__MaterialIndication__Config', 'Oblique', ['WallFacing', 'GroundFacing', 'GroundSheetMm', 'UnitMm']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Material Indication
// -----------------------------------------------------------------------------

    // MODULE STATE | Indication's Output
    // ------------------------------------------------------------
    // Strokes join the pen's (stroke synthesis draws both lists); Dabs are bricks,
    // tiles and flags picked out with a darker touch - the accent layer's R;
    // StoneDabs a rubble wall's washes, for the Stone target (52).
    const Indication  =  { Strokes: [], Dabs: new PainterlyNPR__FloatBuilder(1 << 15), StoneDabs: new PainterlyNPR__FloatBuilder(1 << 16), Stats: { Surfaces: 0, Runs: 0, Marks: 0, Picks: 0, Stones: 0 } };
    const INDICATION_DEBUG_LAID  =  INDICATION_VIEW.Laid;                    // <-- Every joint the pattern lays, for the Indication view
    const INDICATION_DEBUG_KEPT  =  INDICATION_VIEW.Kept;                    // <-- The ones the drawing keeps
    // ------------------------------------------------------------


    // MODULE CONSTANTS | How a Masked Face's Openings Are Looked For
    // ------------------------------------------------------------
    const MASK_LOOK_M     =  [0.12, 0.3, 0.6];
    const MASK_LOOK_DIRS  =  [[1, 0], [-1, 0], [0, 1], [0, -1], [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71]];
    const UP              =  [0, 1, 0];                                        // <-- A path's marks lie on level ground: it has no surface to say
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
        if (surface.Mask) s = Math.max(s, PainterlyNPR__MaterialIndication__NearShut(surface.Mask, u, v));
        return s;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Masked Face's Openings Have Their Say Too
    // ------------------------------------------------------------
    // A painted face has its windows and quoins in its Mask (17), not its Holes:
    // how near a shut cell lies, looked for in eight directions at three distances.
    function PainterlyNPR__MaterialIndication__NearShut(mask, u, v) {
        for (const d of MASK_LOOK_M) {
            for (const [dx, dy] of MASK_LOOK_DIRS) {
                const i  =  Math.floor((u + dx * d) / mask.Cell), j = Math.floor((v + dy * d) / mask.Cell);
                if (i >= 0 && j >= 0 && i < mask.Nu && j < mask.Nv && mask.Grid[j * mask.Nu + i] !== 1) return Math.exp(-d / 0.4);
            }
        }
        return 0;
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
    // A pattern on the ground (Flagstone) is weighed as a flagstone path is (Flags):
    // its joints are grooves, read in the sun as well as out of it, and it keeps
    // them across its middle, where a wall's indication gathers at its edges.
    // Thin is how far a unit's own length on the sheet leaves room for the joints
    // between units: a turned surface keeps its courses and loses those first.
    function PainterlyNPR__MaterialIndication__Importance(surface, pattern, u, v, gauge, ctx, seed) {
        const p  =  PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u, v));
        if (!(p.Depth > 0.2) || p.X < 0 || p.Y < 0 || p.X >= Gpu.Width || p.Y >= Gpu.Height) return null;
        const up        =  PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u, v + gauge));
        const courseMm  =  Math.hypot(up.X - p.X, up.Y - p.Y) / Gpu.PxPerMm;
        const field     =  PainterlyNPR__ArtDirection__FieldAt(p.X, p.Y);
        const light     =  PainterlyNPR__GeometryBuffers__LightAt(p.X, p.Y);
        const patch     =  PainterlyNPR__SeededRandom__Noise2(u / 1.3, v / 0.8, seed);
        const structure =  PainterlyNPR__MaterialIndication__Structure(surface, u, v);
        const base      =  pattern.Ground ? Math.max(0, 0.2 + 0.9 * structure + 1.6 * (patch - 0.4)) : Math.max(0.9 * structure + 1.6 * (patch - 0.42), pattern.Floor);
        const sheet     =  pattern.Ground ? SmoothStep(OBLIQUE.GroundSheetMm[0], OBLIQUE.GroundSheetMm[1], courseMm) * ctx.Facing * ctx.Simplify : SmoothStep(0.28, 0.6, courseMm) * (1 - 0.25 * light) * ctx.Facing * ctx.Simplify;
        const along     =  PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u + pattern.Length, v));
        const unitMm    =  Math.hypot(along.X - p.X, along.Y - p.Y) / Gpu.PxPerMm;
        const room      =  OBLIQUE.UnitMm[surface.Pattern] || OBLIQUE.UnitMm.Default;
        return { I: base * ctx.Amount * sheet + 0.95 * field.Indication, P: p, Field: field, Thin: SmoothStep(room[0], room[1], unitMm) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Hand One Mark to the Pen - through the same visibility and loss as any line
    // ------------------------------------------------------------
    // path is world points; two of them, at the hand's neutral, is the straight
    // line it always was. Where the hand asks, the line lifts into dashes and each
    // is traced with its bow, its wander and its rough edge (Depiction).
    function PainterlyNPR__MaterialIndication__Mark(surface, pattern, path, key, cls, short, ctx) {
        const handKey  =  ctx.HandKey;
        const first    =  path[0], last = path[path.length - 1];
        const hand     =  PainterlyNPR__MaterialDepiction__AtWorld(handKey, [(first[0] + last[0]) / 2, (first[1] + last[1]) / 2, (first[2] + last[2]) / 2]);
        const loose    =  PainterlyNPR__MaterialDepiction__Times(hand, 'Looseness', handKey, DEPICT.LooseMax);
        const dashes   =  PainterlyNPR__MaterialDepiction__Dashes(path, hand, handKey, key, ctx.UnitM);
        dashes.forEach((dash, d) => {
            const name    =  d ? `${key}:d${d}` : key;
            const traced  =  PainterlyNPR__MaterialDepiction__Trace(dash, surface.N || UP, name, handKey, ctx.GaugeM);
            const edge    =  { Id: 0, ObjectId: surface.ObjectId, A: traced[0], B: traced[traced.length - 1], Class: cls, Kind: 'Indication' };
            if (traced.length > 2) edge.Points = traced;
            PainterlyNPR__LineCandidates__Process(edge, ctx.Strokes, ctx.Push, {
                ObjectId :  surface.ObjectId,
                Key      :  name,
                SkipKeep :  true,
                NoProfile:  true,
                NoEnds   :  true,
                Quiet    :  true,
                Class    :  cls,
                Tier     :  TIER_BASE,                                             // <-- Material is indicated with the base pen, 0.13 mm
                Alpha    :  pattern.Ink,
                MinMm    :  short ? 0.25 : 0.5,
                TaperIn  :  (short ? 0.06 : 0.18) * loose,
                TaperOut :  (short ? 0.15 : 0.45) * loose,
                Wobble   :  0.45 * loose,
                LooseAdd :  PainterlyNPR__MaterialDepiction__LooseAdd(hand, handKey),
                Colour   :  INDICATION_DEBUG_KEPT,
                Source   :  'Indication',
                Stats    :  ctx.Stats,
            });
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Pick a Unit Out With a Darker Touch of Wash - inside its own joints
    // ------------------------------------------------------------
    // The patch lies on the surface and fits the unit: its axes are the unit's own,
    // projected, so a brick on a foreshortened wall gets a foreshortened touch, and
    // it stops short of the joints the caller draws round it. Only where the surface
    // itself shows: one mesh can hold a whole building, and what its object shows at
    // this pixel may be its roof, or another of its walls.
    function PainterlyNPR__MaterialIndication__Pick(surface, u, v, halfU, halfV, amount, seed, ctx) {
        const c  =  PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u, v));
        if (PainterlyNPR__GeometryBuffers__ObjectAt(c.X, c.Y) !== surface.ObjectId) return;
        if (Math.abs(PainterlyNPR__GeometryBuffers__DepthAt(c.X, c.Y) - c.Depth) > PainterlyNPR__Rubble__DepthTolerance(surface, u, v, c)) return;
        const a  =  PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u + halfU, v));
        const b  =  PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u, v + halfV));
        PainterlyNPR__AccentLayer__Patch(Indication.Dabs, c.X, c.Y, a.X - c.X, a.Y - c.Y, b.X - c.X, b.Y - c.Y, Clamp(amount, 0, 1), seed);
        ctx.Stats.Picks++;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Open Stretches of a Masked Face Along One Course
    // ------------------------------------------------------------
    // A painted face has its windows and quoins in its Mask (17): a stretch is open
    // where the rows a quarter of the way in from the course's two joints are both
    // open, so no brick is laid across a drawn window.
    function PainterlyNPR__MaterialIndication__MaskSpans(mask, a, b, v0, v1) {
        const row0  =  Math.floor((v0 + (v1 - v0) * 0.25) / mask.Cell), row1 = Math.floor((v1 - (v1 - v0) * 0.25) / mask.Cell);
        if (row0 < 0 || row1 >= mask.Nv) return [];
        const open   =  (i) => i >= 0 && i < mask.Nu && mask.Grid[row0 * mask.Nu + i] === 1 && mask.Grid[row1 * mask.Nu + i] === 1;
        const spans  =  [];
        let start    =  null;
        const i0  =  Math.floor(a / mask.Cell), i1 = Math.ceil(b / mask.Cell);
        for (let i = i0; i <= i1; i++) {
            if (i < i1 && open(i)) { if (start === null) start = i; continue; }
            if (start !== null) spans.push([Math.max(a, start * mask.Cell), Math.min(b, i * mask.Cell)]);
            start  =  null;
        }
        return spans;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What of a Stretch the Joints Already Drawn Leave Bare
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialIndication__Bare(a, b, drawn) {
        const bare  =  [];
        let at      =  a;
        for (const [x, y] of [...drawn].sort((p, q) => p[0] - q[0])) {
            if (y <= at) continue;
            if (x >= b) break;
            if (x > at) bare.push([at, x]);
            at  =  Math.max(at, y);
        }
        if (at < b) bare.push([at, b]);
        return bare;
    }
    // ------------------------------------------------------------


    // FUNCTION | Lay One Surface's Courses - bed joints, perpends, picked units
    // ------------------------------------------------------------
    // Courses fill the surface at its pattern's gauge (as brickwork is set out),
    // each bonded half a unit from the last, clipped to a gable's rake and cut
    // round the openings. Every unit is weighed; a run of kept units along a
    // course becomes one bed-joint line, its ends staggered off the unit; inside
    // the run some joints between units are ticked and a few units picked out,
    // and a picked unit's joints are drawn all round it, so its touch of wash
    // lies in a drawn brick. A soldier course draws its top line and every joint
    // - it is an embellishment, kept unless something takes it away. The hand
    // (Depiction) sizes the stagger, the units' and courses' strays and the corners,
    // and a Material point's seed draws other units where it holds: every choice of
    // a unit is from the seed under its own hand. One wall's courses stay one set-out.
    function PainterlyNPR__MaterialIndication__Surface(surface, ctx) {
        if (surface.Suppressed) return;                                       // <-- Given a class that lays no courses (17, v0.7.0)
        const pattern  =  INDICATION_PATTERNS[surface.Pattern];
        if (!pattern || !pattern.Gauge) return;
        const centre   =  PainterlyNPR__MaterialIndication__At(surface, surface.Width / 2, surface.Height / 2);
        const toEye    =  Camera.Ortho ? V3Scale(Camera.Forward, -1) : V3Normalise(V3Sub(Camera.Eye, centre));
        const turned   =  V3Dot(surface.N, toEye);
        const facing   =  surface.Painted ? Math.abs(turned) : turned;         // <-- A whitecard's face can be modelled back to front: the truth buffer says whether it shows
        const ground   =  !!INDICATION_PATTERNS[surface.Pattern] && !!INDICATION_PATTERNS[surface.Pattern].Ground;   // <-- Seen low across it, as a path is: an eye-level view must not lose it
        const holds    =  ground ? OBLIQUE.GroundFacing : OBLIQUE.WallFacing;
        if (facing < holds[0]) return;
        ctx.Facing     =  SmoothStep(holds[0], holds[1], facing);
        ctx.Stats.Surfaces++;
        const seed     =  PainterlyNPR__SeededRandom__DeriveSeed(ctx.Seed, 'surface:' + surface.Id);
        const handKey  =  PainterlyNPR__MaterialDepiction__HandKey(surface.Pattern);
        ctx.HandKey    =  handKey;
        if (pattern.Layout === 'Rubble') { PainterlyNPR__MaterialIndication__Rubble(surface, pattern, seed, ctx); return; }   // <-- Stones in groups, not courses (v0.8.20)
        const soldier  =  surface.Pattern === 'Soldier';
        const courses  =  Math.max(1, Math.round(surface.Height / pattern.Gauge));
        const g        =  surface.Height / courses;
        const unit     =  pattern.Length;
        const cls      =  soldier ? 2 : 3;
        const hash     =  (i, salt) => PainterlyNPR__SeededRandom__HashUnit(i, seed + salt);
        const drawIn   =  (s, i, salt) => PainterlyNPR__SeededRandom__HashUnit(i, s + salt);
        const project  =  (u, v) => PainterlyNPR__CameraRig__Project(PainterlyNPR__MaterialIndication__At(surface, u, v));
        const at       =  (u, v) => PainterlyNPR__MaterialIndication__At(surface, u, v);
        const own      =  PainterlyNPR__MaterialDepiction__Own(handKey);
        const varies   =  PainterlyNPR__MaterialDepiction__Varies();
        const courseV  =  (c) => (c <= 0 ? 0 : c >= courses ? surface.Height : (c + DEPICT.CourseJitter * own.Randomness * (hash(c, 23) - 0.5)) * g);   // <-- One wall's courses are one set-out: the material's own hand sizes them
        ctx.UnitM      =  unit;
        ctx.GaugeM     =  g;
        let below      =  [];                                                  // <-- The joints drawn along the top of the course below

        for (let c = 0; c < courses; c++) {
            const v0 = courseV(c), v1 = courseV(c + 1), vm = (v0 + v1) / 2;
            const range  =  surface.Clip ? surface.Clip(vm) : [0, surface.Width];
            if (range[1] - range[0] < unit * 0.5) { below = []; continue; }

            // The course's spans between openings
            let spans  =  surface.Mask ? PainterlyNPR__MaterialIndication__MaskSpans(surface.Mask, range[0], range[1], v0, v1) : [range];
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
            const above    =  [];                                              // <-- The joints drawn along this course's top

            // A unit's end, where the hand has it; a joint between units, in the hand's corners and lean
            const unitEnd  =  (j) => {
                const u     =  offset + j * unit;
                const hand  =  varies ? PainterlyNPR__MaterialDepiction__AtWorld(handKey, at(u, vm)) : own;
                const rnd   =  hand.Randomness;
                return rnd > 0 ? u + unit * DEPICT.UnitJitter * rnd * (drawIn(PainterlyNPR__MaterialDepiction__SeedHere(seed, hand), c * 8191 + j + 4096, 21) - 0.5) : u;
            };
            const joint    =  (u, j, hand, spanEnd) => {
                const rad   =  hand.Rounding * DEPICT.RoundShare * Math.min(v1 - v0, unit);
                const lean  =  hand.Randomness * DEPICT.TiltM * (drawIn(PainterlyNPR__MaterialDepiction__SeedHere(seed, hand), c * 8191 + j + 4096, 22) - 0.5) * 2;
                const key   =  `ind:${surface.Id}:${c}:p${j}${PainterlyNPR__MaterialDepiction__MarkSalt(hand)}`;
                if (rad < 1e-4 || u + rad > spanEnd) { PainterlyNPR__MaterialIndication__Mark(surface, pattern, [at(u - lean, v0), at(u + lean, v1)], key, cls, true, ctx); return; }
                const path  =  [];
                for (let k = 0; k <= 3; k++) { const t = (k / 3) * Math.PI / 2; path.push(at(u + rad * (1 - Math.sin(t)), v0 + rad * (1 - Math.cos(t)))); }
                for (let k = 3; k >= 0; k--) { const t = (k / 3) * Math.PI / 2; path.push(at(u + rad * (1 - Math.sin(t)), v1 - rad * (1 - Math.cos(t)))); }
                PainterlyNPR__MaterialIndication__Mark(surface, pattern, path, key, cls, true, ctx);
            };

            spans.forEach(([a, b], si) => {
                if (b - a < unit * 0.3) return;
                if (drawTop) { const pa = project(a, v1), pb = project(b, v1); ctx.Push(pa, pb, INDICATION_DEBUG_LAID); }
                const j0  =  Math.floor((a - offset) / unit), j1 = Math.ceil((b - offset) / unit);
                let runStart  =  null, runEnd = null, runIndex = 0, mustA = null, mustB = null, runLoose = 1;
                let jointDone =  null;                                         // <-- The joint already drawn as a picked unit's right side
                let lastPick  =  -Infinity;                                    // <-- Never two side by side: however many are asked for, they stay single bricks, not a band
                let runSeed   =  seed, runSalt = '';
                const closeRun  =  () => {
                    if (runStart == null) return;
                    if (drawTop) {
                        const k0 = drawIn(runSeed, c * 4093 + si * 131 + runIndex, 11) - 0.5, k1 = drawIn(runSeed, c * 4093 + si * 131 + runIndex, 12) - 0.5;
                        let ua  =  Clamp(runStart + k0 * unit * 0.7 * runLoose, a, b), ub = Clamp(runEnd + k1 * unit * 0.7 * runLoose, a, b);
                        if (mustA !== null) { ua = Math.min(ua, mustA); ub = Math.max(ub, mustB); }   // <-- A picked unit's top is always drawn
                        if (ub - ua > unit * 0.4) {
                            PainterlyNPR__MaterialIndication__Mark(surface, pattern, [at(ua, v1), at(ub, v1)], `ind:${surface.Id}:${c}:${si}:${runIndex}${runSalt}`, cls, false, ctx);
                            above.push([ua, ub]);
                        }
                    }
                    runStart  =  null;
                    mustA     =  null;
                    mustB     =  null;
                    runIndex++;
                };
                let endHere  =  unitEnd(j0);
                for (let j = j0; j < j1; j++) {
                    const endNext  =  unitEnd(j + 1);
                    const ua  =  Math.max(a, endHere), ub = Math.min(b, endNext);
                    endHere   =  endNext;
                    if (ub - ua < unit * 0.3) { closeRun(); continue; }
                    const cell  =  c * 8191 + (j + 4096);
                    const first =  PainterlyNPR__MaterialIndication__Importance(surface, pattern, (ua + ub) / 2, vm, g, ctx, seed);
                    const hand  =  first ? PainterlyNPR__MaterialDepiction__At(handKey, first.P.X, first.P.Y) : own;
                    const here  =  PainterlyNPR__MaterialDepiction__SeedHere(seed, hand);
                    const salt  =  PainterlyNPR__MaterialDepiction__MarkSalt(hand);
                    if (salt !== runSalt) closeRun();                          // <-- A bed joint never runs across a seed's edge: what lies outside it stays exactly as it was
                    const w     =  hand.Seed ? PainterlyNPR__MaterialIndication__Importance(surface, pattern, (ua + ub) / 2, vm, g, ctx, here) : first;
                    const keep  =  0.16 + DEPICT.KeepJitter * PainterlyNPR__MaterialDepiction__Over(hand, 'Randomness', handKey);
                    const kept  =  w && w.I > 0.42 + keep * (drawIn(here, cell, 1) - 0.5);
                    if (!kept) { closeRun(); continue; }
                    if (runStart == null) { runStart = ua; runLoose = PainterlyNPR__MaterialDepiction__Times(hand, 'Looseness', handKey, DEPICT.LooseMax); runSeed = here; runSalt = salt; }
                    runEnd  =  ub;
                    const inner  =  ua > a + 1e-6;
                    let leftDrawn  =  jointDone === j;
                    if (inner && !leftDrawn && drawIn(here, cell, 2) < pattern.Perpend * Clamp(w.I, 0, 1) * w.Thin) { joint(ua, j, hand, ub); leftDrawn = true; }
                    const accents  =  PainterlyNPR__MaterialDepiction__Times(hand, 'Accents', handKey, DEPICT.AccentMax);
                    if (j - lastPick > 1 && drawIn(here, cell, 3) < pattern.Pick * accents * Clamp(w.I, 0, 1.2) * w.Thin) {
                        lastPick  =  j;
                        // Its joints all round it, then its touch of wash inside them
                        if (inner && !leftDrawn) joint(ua, j, hand, ub);
                        if (ub < b - 1e-6) { joint(ub, j + 1, hand, b); jointDone = j + 1; }
                        if (drawTop) { mustA = mustA === null ? ua : Math.min(mustA, ua); mustB = mustB === null ? ub : Math.max(mustB, ub); }
                        if (c > 0) {
                            PainterlyNPR__MaterialIndication__Bare(ua, ub, below).forEach(([x, y], n) => {
                                if (y - x > unit * 0.12) PainterlyNPR__MaterialIndication__Mark(surface, pattern, [at(x, v0), at(y, v0)], `ind:${surface.Id}:${c}:b${j}:${n}${salt}`, cls, false, ctx);
                            });
                        }
                        const fit  =  DEPICT.PatchFit + DEPICT.PatchSpill * PainterlyNPR__MaterialDepiction__Over(hand, 'Looseness', handKey);
                        PainterlyNPR__MaterialIndication__Pick(surface, (ua + ub) / 2, vm, (ub - ua) * fit, (v1 - v0) * fit, (0.55 + 0.4 * Math.min(w.I, 1)) * w.Field.Presence * (0.7 + 0.6 * hand.Accents), here + cell, ctx);
                    }
                }
                closeRun();
            });
            below  =  above;
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
        if (toEye[1] < OBLIQUE.GroundFacing[0]) return;
        ctx.Facing     =  SmoothStep(OBLIQUE.GroundFacing[0], OBLIQUE.GroundFacing[1], toEye[1]);
        ctx.Stats.Surfaces++;
        const surface  =  { ObjectId: path.ObjectId };
        ctx.HandKey    =  PainterlyNPR__MaterialDepiction__HandKey('Flag');
        ctx.UnitM      =  0.6;
        ctx.GaugeM     =  0.56;
        const weigh  =  (s, f) => {
            const p  =  PainterlyNPR__CameraRig__Project(at(s, f));
            if (!(p.Depth > 0.2) || p.X < 0 || p.Y < 0 || p.X >= Gpu.Width || p.Y >= Gpu.Height) return null;
            const q       =  PainterlyNPR__CameraRig__Project(at(s + 0.5, f));
            const rowMm   =  Math.hypot(q.X - p.X, q.Y - p.Y) / Gpu.PxPerMm;
            const field   =  PainterlyNPR__ArtDirection__FieldAt(p.X, p.Y);
            const ends    =  Math.max(Math.exp(-s / 1.6), Math.exp(-(total - s) / 1.6));
            const patch   =  PainterlyNPR__SeededRandom__Noise2(s / 1.6, f * 0.8, seed);
            const sheet   =  SmoothStep(OBLIQUE.GroundSheetMm[0], OBLIQUE.GroundSheetMm[1], rowMm) * ctx.Facing * ctx.Simplify;      // <-- No light term: a joint is a groove, and reads in the sun as well as out of it
            return { I: Math.max(0, 0.2 + 0.9 * ends + 1.6 * (patch - 0.4)) * ctx.Amount * sheet + 0.95 * field.Indication, Field: field };
        };

        let s0 = 0, s = rng.Range(0.3, 0.55), row = 0;
        while (s < total - 0.15) {
            const skew0 = rng.Spread(0.06), skew1 = rng.Spread(0.06), split0 = rng.Next(), splitAt0 = rng.Range(0.3, 0.7), splitLean = rng.Spread(0.08), pick0 = rng.Next(), pickAt0 = rng.Range(0.25, 0.75), jitter0 = rng.Next(), step = rng.Range(0.42, 0.72);

            // A Material point's seed draws this row's choices again; the rows stay where they are
            const rowHand  =  PainterlyNPR__MaterialDepiction__AtWorld(ctx.HandKey, at(s, 0.5));
            const again    =  (n, drawn) => (rowHand.Seed ? PainterlyNPR__SeededRandom__HashUnit(row, PainterlyNPR__MaterialDepiction__SeedHere(seed, rowHand) + n) : drawn);
            const salt     =  PainterlyNPR__MaterialDepiction__MarkSalt(rowHand);
            const split = again(1, split0), splitAt = rowHand.Seed ? 0.3 + 0.4 * again(2) : splitAt0, pick = again(3, pick0), pickAt = rowHand.Seed ? 0.25 + 0.5 * again(4) : pickAt0, jitter = again(5, jitter0);
            ctx.Push(PainterlyNPR__CameraRig__Project(at(s + skew0, 0.04)), PainterlyNPR__CameraRig__Project(at(s + skew1, 0.96)), INDICATION_DEBUG_LAID);
            const w  =  weigh(s, 0.5);
            if (w && w.I > 0.42 + 0.16 * (jitter - 0.5)) {
                PainterlyNPR__MaterialIndication__Mark(surface, pattern, [at(s + skew0, 0.04), at(s + skew1, 0.96)], `flag:${path.ObjectId}:${row}${salt}`, 3, false, ctx);
                const back  =  weigh((s0 + s) / 2, 0.5);
                const splits  =  back && back.I > 0.42 && split < 0.45;
                if (splits) {
                    PainterlyNPR__MaterialIndication__Mark(surface, pattern, [at(s0 + 0.03, splitAt), at(s - 0.03, splitAt + splitLean)], `flag:${path.ObjectId}:${row}:split${salt}`, 3, true, ctx);
                }
                const handHere  =  back ? PainterlyNPR__MaterialDepiction__AtWorld(ctx.HandKey, at((s0 + s) / 2, pickAt)) : null;
                if (back && pick < pattern.Pick * Clamp(back.I, 0, 1.2) * 2 * PainterlyNPR__MaterialDepiction__Times(handHere, 'Accents', ctx.HandKey, DEPICT.AccentMax)) {
                    // Its touch of wash inside the flag it falls in: between the row's two joints and the split, if the row has one
                    const f0  =  splits && pickAt >= splitAt ? splitAt : 0.04;
                    const f1  =  splits && pickAt < splitAt ? splitAt : 0.96;
                    const fm  =  (f0 + f1) / 2;
                    const c   =  PainterlyNPR__CameraRig__Project(at((s0 + s) / 2, fm));
                    const a   =  PainterlyNPR__CameraRig__Project(at((s0 + s) / 2 + (s - s0) * DEPICT.PatchFit * 0.9, fm));
                    const b   =  PainterlyNPR__CameraRig__Project(at((s0 + s) / 2, fm + (f1 - f0) * DEPICT.PatchFit * 0.9));
                    if (PainterlyNPR__GeometryBuffers__ObjectAt(c.X, c.Y) === path.ObjectId) {
                        PainterlyNPR__AccentLayer__Patch(Indication.Dabs, c.X, c.Y, a.X - c.X, a.Y - c.Y, b.X - c.X, b.Y - c.Y, 0.6 * back.Field.Presence * (0.7 + 0.6 * handHere.Accents), seed + row);
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
        Indication.StoneDabs.Clear();
        const strokes  =  [];
        const stats    =  { Surfaces: 0, Runs: 0, Marks: 0, Picks: 0, Stones: 0 };
        PainterlyNPR__ArtDirection__RunOutPrepare();
        PainterlyNPR__MaterialDepiction__Prepare();
        const ctx  =  {
            Amount   :  State.Indication.Amount,
            Simplify :  Lerp(1.0, 0.7, PainterlyNPR__StrokeSynthesis__EffectiveDiscipline()),
            Seed     :  PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, 'indication'),
            Facing   :  1,
            Strokes  :  strokes,
            Stats    :  stats,
            Push     :  PainterlyNPR__LineCandidates__DebugWriter(debug),
            StoneDabs:  Indication.StoneDabs,
            Laid     :  INDICATION_DEBUG_LAID,
            Kept     :  INDICATION_DEBUG_KEPT,
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
