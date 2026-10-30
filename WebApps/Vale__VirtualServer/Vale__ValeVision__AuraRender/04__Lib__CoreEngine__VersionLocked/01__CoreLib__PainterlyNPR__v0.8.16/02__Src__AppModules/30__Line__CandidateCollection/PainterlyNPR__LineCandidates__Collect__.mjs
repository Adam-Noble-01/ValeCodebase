/* =============================================================================
   PAINTERLYNPR - LINE | CANDIDATE COLLECTION
   =============================================================================

   FILE       : PainterlyNPR__LineCandidates__Collect__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - CandidateCollection
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Every line the drawing might have - authored, hard and silhouette
                edges from the scene's own records, and the organic grammars'
                marks - collected, tested, classified and simplified
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Never Sobel: the drawing's lines come from the scene's edge records, not from
     edge detection on the buffers.
   - Lines holds the pass's output: the strokes for synthesis and the debug lines
     for the Lines view.
   - v0.8.0: every stroke carries its technical pen (Tier) and the width that
     pen draws (32's PainterlyNPR__TechnicalPens__Tiers__.mjs). A visible eligible
     line is never taken away by the Drawing Discipline's simplification or by
     Lost in light: they take only a heavier pen, and the line keeps its 0.13 mm
     base. Occlusion, the paper (presence), retired edges and a Detail
     suppression point still take lines away.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Line Candidates
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : v0.8.0 - widths are the four technical pens, decided in 32;
                   simplification and Lost in light demote a line to the base
                   pen instead of removing it; strokes carry Tier, Why, Source and
                   ObjectId

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Maths__Clamp    as  Clamp,
    PainterlyNPR__Maths__V3Add    as  V3Add,
    PainterlyNPR__Maths__V3Dot    as  V3Dot,
    PainterlyNPR__Maths__V3Lerp   as  V3Lerp,
    PainterlyNPR__Maths__V3Scale  as  V3Scale,
    PainterlyNPR__Maths__V3Sub    as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__DeriveSeed,
    PainterlyNPR__SeededRandom__HashUnit,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import {
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__FloatBuilder } from '../21__System__GpuResources/PainterlyNPR__GpuResources__FloatBuilder__.mjs';
import {
    PainterlyNPR__LineCandidates__RunProfile,
    PainterlyNPR__LineCandidates__SplitByPresence,
    PainterlyNPR__LineCandidates__Visibility,
} from '../31__Line__Visibility/PainterlyNPR__LineCandidates__Visibility__.mjs';
import {
    PainterlyNPR__LineCandidates__ClassInk,
    PainterlyNPR__LineCandidates__Construction,
} from '../32__Line__ClassAndPriority/PainterlyNPR__LineCandidates__ClassAndPriority__.mjs';
import {
    PainterlyNPR__TechnicalPens__EdgeTier,
    PainterlyNPR__TechnicalPens__PointSteps,
    PainterlyNPR__TechnicalPens__Shift,
    PainterlyNPR__TechnicalPens__Technical,
    PainterlyNPR__TechnicalPens__WidthMm,
    PainterlyNPR__TechnicalPens__PROMOTIONS      as  PROMOTIONS,
    PainterlyNPR__TechnicalPens__SIMPLIFICATION  as  SIMPLIFICATION,
    PainterlyNPR__TechnicalPens__TIER_BASE       as  TIER_BASE,
} from '../32__Line__ClassAndPriority/PainterlyNPR__TechnicalPens__Tiers__.mjs';
import {
    PainterlyNPR__DrawingDiscipline__LINE_CLASS_DEBUG       as  LINE_CLASS_DEBUG,
    PainterlyNPR__DrawingDiscipline__LINE_DEBUG_SIMPLIFIED  as  LINE_DEBUG_SIMPLIFIED,
    PainterlyNPR__DrawingDiscipline__LINE_PAIR_MERGE_MM     as  LINE_PAIR_MERGE_MM,
    PainterlyNPR__DrawingDiscipline__ROLE_LOOSENESS         as  ROLE_LOOSENESS,
} from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import {
    PainterlyNPR__StrokeSynthesis__DisciplineAt,
    PainterlyNPR__StrokeSynthesis__EffectiveDiscipline,
} from '../35__Line__DrawingDiscipline/PainterlyNPR__StrokeSynthesis__DisciplineMacro__.mjs';
import { PainterlyNPR__LineCandidates__Hatching } from '../37__Line__TonalHatching/PainterlyNPR__LineCandidates__Hatching__.mjs';
import { PainterlyNPR__OrganicGrammar__OrganicLocal as OrganicLocal } from '../40__Organic__GrammarFramework/PainterlyNPR__OrganicGrammar__Framework__.mjs';
import { PainterlyNPR__OrganicGrammar__Run } from '../40__Organic__GrammarFramework/PainterlyNPR__OrganicGrammar__Plant__.mjs';
import { PainterlyNPR__OrganicGrammar__Tufts } from '../42__Organic__OrnamentalGrass/PainterlyNPR__OrganicGrammar__Tufts__.mjs';
import { PainterlyNPR__OrganicGrammar__DistantTrees } from '../61__Atmos__DistantLandscape/PainterlyNPR__OrganicGrammar__DistantTrees__.mjs';
import {
    PainterlyNPR__ArtDirection__FieldAt,
    PainterlyNPR__ArtDirection__RunOutPrepare,
    PainterlyNPR__ArtDirection__RunOut  as  RunOut,
} from '../66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__Field__.mjs';
import {
    PainterlyNPR__CameraRig__Aerial,
    PainterlyNPR__CameraRig__Project,
    PainterlyNPR__CameraRig__Camera  as  Camera,
} from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Candidate Collection
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Line Candidates
// -----------------------------------------------------------------------------

    // MODULE STATE | The Candidates' Output
    // ------------------------------------------------------------
    // Strokes for the pen, and Dabs for the accent layer - flowers dropped into
    // the foliage - six floats a vertex: sheet x and y, then an RGBA of amounts.
    const Lines  =  { Strokes: [], Dabs: new PainterlyNPR__FloatBuilder(1 << 16), Dabs2: new PainterlyNPR__FloatBuilder(1 << 14), Stats: { Edges: 0, Runs: 0, Strokes: 0 } };
    // ------------------------------------------------------------


    // FUNCTION | Is a Smooth Edge a Silhouette From This Camera?
    // ------------------------------------------------------------
    function PainterlyNPR__LineCandidates__IsSilhouette(edge) {
        const mid   =  V3Lerp(edge.A, edge.B, 0.5);
        const view  =  Camera.Ortho ? V3Scale(Camera.Forward, -1) : V3Sub(Camera.Eye, mid);
        return V3Dot(edge.N1, view) * V3Dot(edge.N2, view) <= 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Writer of Debug Lines Into a Builder
    // ------------------------------------------------------------
    function PainterlyNPR__LineCandidates__DebugWriter(builder) {
        return (a, b, colour) => {
            builder.Reserve(12);
            builder.Data.set([a.X, a.Y, ...colour, b.X, b.Y, ...colour], builder.Length);
            builder.Length += 12;
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Test, Classify and Simplify One Line - an edge, or a mark laid on a surface
    // ------------------------------------------------------------
    // Visible runs; a run that is mostly profile is promoted a class; the line's
    // technical pen is decided from what it belongs to (32), the strongest that
    // applies winning; the Drawing Discipline's simplification by class and
    // length, and Lost in light, can take only a heavier pen away - a visible
    // line keeps its base; what survives the paper is handed on as strokes.
    // Material indication hands its marks in here too, with the base pen, its own
    // object to sit on and no Keep - it chose them already. Options: ObjectId, Key
    // (the seed's identity), SkipKeep, NoProfile, NoEnds (no overshoot), Quiet (no
    // hidden debug), Class, Tier (a mark's pen), Alpha, MinMm, TaperIn, TaperOut,
    // Wobble, Colour, Source, Stats.
    function PainterlyNPR__LineCandidates__Process(edge, strokes, pushDebug, opts) {
        const o        =  opts || {};
        const tested   =  PainterlyNPR__LineCandidates__Visibility(edge, o.ObjectId);
        if (!tested) return;
        const samples  =  tested.Samples;
        const object   =  Scene.ObjectById.get(edge.ObjectId);
        const roleL    =  ROLE_LOOSENESS[object.Role] || 0;
        const globalL  =  PainterlyNPR__StrokeSynthesis__EffectiveDiscipline();
        const ceiling  =  State.Camera.Ceiling;
        const key      =  o.Key || String(edge.Id);
        const keepSeed =  PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, 'keep:' + key);
        const score    =  PainterlyNPR__SeededRandom__HashUnit(edge.Id || 0, keepSeed);
        const straight =  !edge.Points;
        const pen      =  State.Pen;
        const mark     =  o.ObjectId != null;                                // <-- A mark laid on a surface chose itself: the Pen's selection and weights leave it be
        const runOut   =  RunOut.Points.length ? { ObjectId: edge.ObjectId } : null;   // <-- Only while a Line Run-out point is down
        const technical  =  PainterlyNPR__TechnicalPens__Technical();
        // A measured view keeps every line: the Pen's own simplification and lost-in-
        // light wait (a missing line is missing information); points still act
        const penDetail    =  ceiling < 1 ? Math.max(0, pen.Detail) : pen.Detail;
        const lostInLight  =  ceiling < 1 || mark ? 0 : pen.LostInLight;
        const ground   =  straight && !mark && edge.Kind !== 'Smooth' && object.Role !== 'Ground' && Math.max(edge.A[1], edge.B[1]) < PROMOTIONS.GroundHeightM;   // <-- Where a wall, a step or a leg meets the ground

        // Runs of visible samples
        let start  =  -1;
        const runs  =  [];
        for (let i = 0; i <= samples.length; i++) {
            const vis  =  i < samples.length && samples[i].Visible;
            if (vis && start < 0) start = i;
            if (!vis && start >= 0) { runs.push([start, i - 1]); start = -1; }
        }
        if (!o.Quiet) {
            for (let i = 0; i < samples.length - 1; i++) {
                if (!samples[i].Visible || !samples[i + 1].Visible) pushDebug(samples[i], samples[i + 1], [0.55, 0.53, 0.50, 0.30]);
            }
        }

        runs.forEach(([s0, s1], runIndex) => {
            if (s1 - s0 < 1) return;
            if (o.Stats) o.Stats.Runs++;
            const run      =  samples.slice(s0, s1 + 1);
            const profile  =  !o.NoProfile && run.filter(s => s.Profile).length > run.length * PROMOTIONS.ProfileShare;
            const shaded   =  !mark && run.filter(s => s.ShadowSide).length > run.length * PROMOTIONS.ShadeShare;
            const cls      =  o.Class != null ? o.Class : (profile ? Math.max(0, edge.Class - 1) : edge.Class);
            const mid      =  run[run.length >> 1];
            const field    =  PainterlyNPR__ArtDirection__FieldAt(mid.X, mid.Y);
            const L        =  Clamp(globalL + roleL + field.Loose, 0, ceiling);
            const disc     =  PainterlyNPR__StrokeSynthesis__DisciplineAt(L);
            let runLenPx   =  0;
            for (let i = 0; i < run.length - 1; i++) runLenPx += Math.hypot(run[i + 1].X - run[i].X, run[i + 1].Y - run[i].Y);
            const runLenMm =  runLenPx / Gpu.PxPerMm;
            // Which lines exist: only a Detail Suppression point takes a visible line
            // away (subordinate classes first; profiles hold). The Discipline's own
            // simplification - Keep by class, the shortest line, the Pen's Detail,
            // moved by a Focus or a suppression point - decides only whether the
            // line keeps a heavier pen: simplified, it is drawn with the base. A mark
            // chose itself; a suppression point still thins it
            const detail   =  Clamp(penDetail + field.Detail, -1, 1);
            const strip    =  detail < 0 ? 1 + detail * (cls === 0 ? 0.15 : 1) : 1;
            const keepC    =  detail >= 0 ? disc.Keep[cls] + detail * (1 - disc.Keep[cls]) : disc.Keep[cls] * strip;
            const minLen   =  disc.MinLenMm * (cls >= 2 ? 1 : 0.4) * (detail >= 0 ? 1 - detail : 1 - detail * 1.5);
            const suppress =  Clamp(field.Detail, -1, 0);
            const exists   =  score <= 1 + suppress * (cls === 0 ? 0.15 : 1);
            const emphasis =  o.SkipKeep || (score <= keepC && runLenMm >= minLen);
            const colour   =  exists && emphasis ? (o.Colour || LINE_CLASS_DEBUG[cls]) : LINE_DEBUG_SIMPLIFIED;
            if (!exists) { for (let i = 0; i < run.length - 1; i++) pushDebug(run[i], run[i + 1], colour); return; }

            // The run's pen: a mark's own (the base), or what the edge belongs to,
            // raised where the run is its element's silhouette or ground line
            const pens     =  o.Tier != null ? { Tier: o.Tier, Why: 'Mark' } : PainterlyNPR__TechnicalPens__EdgeTier(edge, object, { Profile: profile, Ground: ground });
            let runTier    =  pens.Tier, runWhy = pens.Why;
            if (!emphasis && SIMPLIFICATION.KeepDemotes && runTier > TIER_BASE) { runTier = TIER_BASE; runWhy = 'Simplified'; }

            const spacingMm  =  runLenMm / Math.max(1, run.length - 1);
            const fragments  =  PainterlyNPR__LineCandidates__SplitByPresence(run, cls, keepSeed, spacingMm, lostInLight, runOut, true);   // <-- Lost in light marks its points (LitLost); presence alone takes them
            for (let i = 0; i < run.length - 1; i++) pushDebug(run[i], run[i + 1], run[i].Field && run[i + 1].Field ? colour : LINE_DEBUG_SIMPLIFIED);
            const aerial  =  Math.min(1, PainterlyNPR__CameraRig__Aerial(mid.Depth) * pen.DepthFade);
            fragments.forEach((frag, fragIndex) => {
                const first  =  frag[0], last = frag[frag.length - 1];
                const lenMm  =  Math.hypot(last.X - first.X, last.Y - first.Y) / Gpu.PxPerMm;
                if (lenMm < (o.MinMm != null ? o.MinMm : 0.6)) return;
                const fMid    =  frag[frag.length >> 1].Field;
                // A fragment mostly lit on both sides loses its heavier pen, as a
                // line implied by tone; then a point's weight moves it between pens
                let tier  =  runTier, why = runWhy;
                if (tier > TIER_BASE && lostInLight > 0 && SIMPLIFICATION.LostInLightDemotes) {
                    let lit  =  0;
                    for (const p of frag) if (p.LitLost) lit++;
                    if (lit > frag.length * SIMPLIFICATION.LitShare) { tier = TIER_BASE; why = 'Light'; }
                }
                const weight  =  fMid.Weight * (profile ? fMid.Emphasis : 1);
                let alpha     =  (o.Alpha || PainterlyNPR__LineCandidates__ClassInk(cls)) * (1 - 0.55 * aerial);
                let widthMm;
                if (technical) {
                    const steps  =  mark ? 0 : PainterlyNPR__TechnicalPens__PointSteps(weight);
                    if (steps) { tier = PainterlyNPR__TechnicalPens__Shift(tier, steps); why = 'Point'; }
                    if (mark) alpha *= weight;                                        // <-- A mark keeps the base pen: a point's weight is its ink
                    if (shaded) alpha *= 1 + PROMOTIONS.ShadeInk * pen.ShadowSide;    // <-- Shade on one side weights the ink, not the width
                    widthMm  =  PainterlyNPR__TechnicalPens__WidthMm(tier);
                } else {
                    widthMm  =  PainterlyNPR__TechnicalPens__WidthMm(tier, (profile ? pen.Profile * fMid.Emphasis : 1) * (ground ? pen.Ground : 1) * (shaded ? 1 + pen.ShadowSide : 1) * fMid.Weight * (1 - 0.3 * aerial));
                }
                const ends    =  !o.NoEnds && lenMm >= 3;                       // <-- A pen flicks past the corner of a long line, never of a picket's 2 mm top
                const seed    =  PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, `edge:${key}:${runIndex}:${fragIndex}`);
                const startTrue  =  ends && first === samples[0] && !tested.ClipA;
                const endTrue    =  ends && last === samples[samples.length - 1] && !tested.ClipB;
                strokes.push({
                    Points    :  straight ? [[first.X, first.Y], [last.X, last.Y]] : frag.map(p => [p.X, p.Y]),
                    Straight  :  straight,
                    StartTrue :  startTrue,
                    EndTrue   :  endTrue,
                    Tier      :  tier,                                            // <-- Its technical pen: 0 base 0.13, 1 minor 0.18, 2 structural 0.25, 3 profile 0.35
                    Why       :  why,
                    Semantic  :  pens.Tier,                                       // <-- The pen what it belongs to asks for, before simplification, light or a point moved it
                    WidthMm   :  widthMm,
                    Alpha     :  Math.min(1, alpha),
                    Dry       :  0.2 + 0.6 * L,
                    Loose     :  L,
                    Seed      :  seed,
                    TaperIn   :  o.TaperIn,
                    TaperOut  :  o.TaperOut,
                    Wobble    :  o.Wobble,
                    Local     :  { Wobble: fMid.Wobble, Pressure: fMid.Pressure, Overdraw: fMid.Overdraw, Breakup: fMid.Breakup },
                    Run       :  runOut ? PainterlyNPR__LineCandidates__RunProfile(frag) : null,
                    Source    :  o.Source || 'Edge',
                    ObjectId  :  edge.ObjectId,
                });
                const habit  =  straight && !mark && edge.Kind !== 'Smooth' && (object.Role === 'Architecture' || object.Role === 'Focal');   // <-- A building's habit: never a pot's or a bench's
                if (habit || (runOut && straight && !mark && edge.Kind !== 'Smooth')) {   // <-- A Line Run-out's run-ons take any straight line's corner
                    if (startTrue) PainterlyNPR__LineCandidates__Construction(strokes, frag, true, cls, disc, L, (seed ^ 0x1B873593) >>> 0, pushDebug, habit, edge.ObjectId);
                    if (endTrue)   PainterlyNPR__LineCandidates__Construction(strokes, frag, false, cls, disc, L, (seed ^ 0x68E31DA4) >>> 0, pushDebug, habit, edge.ObjectId);
                }
            });
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | How Far Apart Two Paired Arrises Stand on the Sheet
    // ------------------------------------------------------------
    // Their midpoints projected, in sheet millimetres: the pair is built parallel
    // and the same length, so the midpoints measure the member's drawn width.
    function PainterlyNPR__LineCandidates__PairMm(a, b) {
        const p  =  PainterlyNPR__CameraRig__Project(V3Scale(V3Add(a.A, a.B), 0.5));
        const q  =  PainterlyNPR__CameraRig__Project(V3Scale(V3Add(b.A, b.B), 0.5));
        return Math.hypot(p.X - q.X, p.Y - q.Y) / Gpu.PxPerMm;
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - Collect, Test, Classify and Simplify Every Line
    // ------------------------------------------------------------
    function PainterlyNPR__LineCandidates__Run() {
        const strokes  =  [];
        const debug    =  Cpu.Debug;
        debug.Clear();
        Lines.Dabs.Clear();
        Lines.Dabs2.Clear();
        const globalL  =  PainterlyNPR__StrokeSynthesis__EffectiveDiscipline();
        const ceiling  =  State.Camera.Ceiling;
        const stats    =  { Edges: 0, Runs: 0, Strokes: 0, Hatching: 0 };
        const pushDebug  =  PainterlyNPR__LineCandidates__DebugWriter(debug);
        PainterlyNPR__ArtDirection__RunOutPrepare();

        for (const edge of Scene.Edges) {
            if (edge.Retired) continue;                                       // <-- A line the model has since replaced, kept so every later Id holds
            if (edge.Kind === 'Smooth' && !PainterlyNPR__LineCandidates__IsSilhouette(edge)) continue;
            let line  =  edge;
            // A thin member's two arrises (a glazing bar, a mullion): one line down its
            // middle until they stand far enough apart on the sheet to draw both
            if (edge.Pair) {
                const mate  =  Scene.Edges[edge.Pair.Mate - 1];
                if (PainterlyNPR__LineCandidates__PairMm(edge, mate) < LINE_PAIR_MERGE_MM) {
                    if (!edge.Pair.Lead) continue;
                    line  =  Object.assign({}, edge, { A: V3Scale(V3Add(edge.A, mate.A), 0.5), B: V3Scale(V3Add(edge.B, mate.B), 0.5), Kind: 'Authored' });   // <-- The lead's Id seeds it
                }
            }
            stats.Edges++;
            PainterlyNPR__LineCandidates__Process(line, strokes, pushDebug, { Stats: stats });
        }

        for (const organic of Scene.Organics) PainterlyNPR__OrganicGrammar__Run(organic, strokes, globalL, ceiling, pushDebug);
        OrganicLocal.Base  =  null;
        OrganicLocal.Hand  =  null;                                            // <-- The last plant's hand never reaches the lawn's tufts (v0.8.12)
        PainterlyNPR__OrganicGrammar__Tufts(strokes, globalL, ceiling, pushDebug);
        stats.Hatching  =  PainterlyNPR__LineCandidates__Hatching(strokes, globalL, ceiling, pushDebug);
        stats.Distant   =  PainterlyNPR__OrganicGrammar__DistantTrees(strokes, globalL, ceiling, pushDebug);   // <-- Last: every earlier stroke keeps its seed

        stats.Strokes  =  strokes.length;
        Lines.Strokes  =  strokes;
        Lines.Stats    =  stats;
        Cpu.DebugVerts =  debug.Length / 6;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__LineCandidates__DebugWriter,
        PainterlyNPR__LineCandidates__Process,
        PainterlyNPR__LineCandidates__Run,
        Lines  as  PainterlyNPR__LineCandidates__Lines,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
