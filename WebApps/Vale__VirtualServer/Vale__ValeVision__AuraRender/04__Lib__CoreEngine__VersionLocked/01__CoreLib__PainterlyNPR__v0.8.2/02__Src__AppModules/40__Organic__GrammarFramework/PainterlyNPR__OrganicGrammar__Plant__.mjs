/* =============================================================================
   PAINTERLYNPR - ORGANIC | GRAMMAR FRAMEWORK - ONE PLANT
   =============================================================================

   FILE       : PainterlyNPR__OrganicGrammar__Plant__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Organic - GrammarFramework - Plant
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : One organic object, by mass, in its kind's style: its outline in
                its hand, its shade, its leaves - and grass by blade
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Shrubs, grasses, trees, hedges, climbers and conifers are branches of one
     grammar, styled by ORGANIC_STYLES.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Organic Grammars
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here. v0.6.0: an organic's
                   seed reads its SeedKey when it has one - a placed library
                   asset's; the cottage's plants have none, so theirs is unchanged

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__DEG as DEG } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__Maths__Clamp    as  Clamp,
    PainterlyNPR__Maths__V3Add    as  V3Add,
    PainterlyNPR__Maths__V3Lerp   as  V3Lerp,
    PainterlyNPR__Maths__V3Scale  as  V3Scale,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
    PainterlyNPR__SeededRandom__HashUnit,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__GeometryBuffers__DepthAt,
    PainterlyNPR__GeometryBuffers__LightAt,
    PainterlyNPR__GeometryBuffers__MaxDepth3,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__DrawingDiscipline__ROLE_LOOSENESS as ROLE_LOOSENESS } from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import { PainterlyNPR__StrokeSynthesis__DisciplineAt } from '../35__Line__DrawingDiscipline/PainterlyNPR__StrokeSynthesis__DisciplineMacro__.mjs';
import {
    PainterlyNPR__OrganicGrammar__Chop,
    PainterlyNPR__OrganicGrammar__Circle,
    PainterlyNPR__OrganicGrammar__Contours,
    PainterlyNPR__OrganicGrammar__Decorate,
    PainterlyNPR__OrganicGrammar__Emit,
    PainterlyNPR__OrganicGrammar__Frame,
    PainterlyNPR__OrganicGrammar__Mark,
    PainterlyNPR__OrganicGrammar__Runs,
    PainterlyNPR__OrganicGrammar__OrganicLocal  as  OrganicLocal,
} from './PainterlyNPR__OrganicGrammar__Framework__.mjs';
import { PainterlyNPR__OrganicGrammar__ORGANIC_STYLES as ORGANIC_STYLES } from './PainterlyNPR__OrganicGrammar__Styles__.mjs';
import { PainterlyNPR__OrganicGrammar__Flowers } from '../41__Organic__Shrub/PainterlyNPR__OrganicGrammar__Flowers__.mjs';
import { PainterlyNPR__OrganicGrammar__Twig } from '../43__Organic__SmallTree/PainterlyNPR__OrganicGrammar__Twig__.mjs';
import {
    PainterlyNPR__ArtDirection__FieldAt,
    PainterlyNPR__ArtDirection__PlantingAt,
} from '../66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__Field__.mjs';
import { PainterlyNPR__CameraRig__Project } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Grammar Framework - One Plant
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Organic Grammars
// -----------------------------------------------------------------------------

    // FUNCTION | A Plant's Outline - its true silhouette, in its hand
    // ------------------------------------------------------------
    // Traced from the ID buffer, so it is the shape the wash fills; drawn only
    // where the plant stands against something behind it - where something in
    // front hides it, that thing draws the edge. In strokes of hand length,
    // heavier in shade and broken toward the light; Sketchiness adds searching
    // passes beside the first, the last of them partial.
    function PainterlyNPR__OrganicGrammar__Outline(organic, style, box, edge, clump, L, seed, strokes, pushDebug) {
        const far       =  organic.Role === 'Context';                         // <-- A middle-distance plant: Pen -> 7 · Distant trees adds to the Vegetation fold
        const outlineK  =  State.Pen.VegOutline * (far ? State.Pen.DistantOutline : 1);
        const sketch    =  State.Pen.VegSketch + (far ? State.Pen.DistantSketch : 0);
        const weightK   =  far ? State.Pen.DistantWeight : 1;
        const pen      =  State.Pen;
        const pxPerMm  =  Gpu.PxPerMm;
        const id       =  organic.ObjectId;
        const step     =  Math.max(1.25, 0.35 * pxPerMm);
        const probe    =  step + 1.5;
        const passes   =  1 + Math.ceil(sketch - 1e-6);
        const contours =  PainterlyNPR__OrganicGrammar__Contours(box, step, (x, y) => PainterlyNPR__GeometryBuffers__ObjectAt(x, y) === id);
        contours.forEach((contour, ci) => {
            const P  =  PainterlyNPR__OrganicGrammar__Frame(contour);
            for (const p of P) {
                const ox = p.X + p.NX * probe, oy = p.Y + p.NY * probe, ix = p.X - p.NX * probe, iy = p.Y - p.NY * probe;
                const dIn  =  PainterlyNPR__GeometryBuffers__DepthAt(ix, iy);
                p.Sil    =  PainterlyNPR__GeometryBuffers__ObjectAt(ox, oy) < 0 || PainterlyNPR__GeometryBuffers__DepthAt(ox, oy) >= dIn - (0.05 + dIn * 0.004);
                p.Light  =  PainterlyNPR__GeometryBuffers__LightAt(ix, iy);
            }
            PainterlyNPR__OrganicGrammar__Runs(P, contour.Closed, p => p.Sil).forEach((run, ri) => {
                for (let pass = 0; pass < passes; pass++) {
                    const cover  =  pass ? Clamp(sketch - (pass - 1), 0, 1) : 1;
                    if (cover < 0.02) continue;
                    const rng  =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(seed, `${ci}:${ri}:${pass}`));
                    const off  =  pass ? (rng.Chance(0.5) ? 1 : -1) * rng.Range(0.12, 0.36) * (1 + 0.4 * (pass - 1)) * pxPerMm : 0;
                    const line =  PainterlyNPR__OrganicGrammar__Decorate(run, edge, clump, off, rng);
                    PainterlyNPR__OrganicGrammar__Chop(line, rng, strokes, pushDebug, {
                        DrawMm  :  [3.5, 11].map(v => v * (0.55 + 0.45 * Math.min(outlineK, 2)) * style.Outline * (pass ? 0.4 + 0.4 * cover : 1)),
                        GapMm   :  [0.4, 1.8].map(v => v * style.Gap * (pass ? 1.5 / cover : 1) / Math.max(0.25, outlineK)),
                        LitGap  :  2.5 * pen.VegLostInLight,
                        Class   :  2,
                        WidthMm :  style.WidthMm * 1.25 * (pass ? 0.8 : 1) * weightK,
                        Shade   :  0.7,
                        Alpha   :  pass ? 0.62 / (1 + 0.3 * (pass - 1)) : 0.9,
                        Loose   :  L,
                        TaperIn :  0.4,
                        TaperOut:  0.9,
                        Wobble  :  0.6,
                        Profile :  !pass,
                        Seed    :  PainterlyNPR__SeededRandom__DeriveSeed(seed, `s${ci}:${ri}:${pass}`),
                    });
                }
            });
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Plant's Shade - the line where its light turns, and cups beneath
    // ------------------------------------------------------------
    // Inside the silhouette, where the plant's own light falls below a third, the
    // boundary is drawn as smaller clumps - the undersides of the leaf masses -
    // and the shadow is filled sparsely with clusters of little cups. Never on
    // the silhouette itself: that is the outline's.
    function PainterlyNPR__OrganicGrammar__Shade(organic, box, clump, L, seed, strokes, pushDebug) {
        const pen      =  State.Pen;
        const pxPerMm  =  Gpu.PxPerMm;
        const id       =  organic.ObjectId;
        const step     =  Math.max(1.25, 0.4 * pxPerMm);
        const probe    =  step + 1.5;
        const dark     =  (x, y) => PainterlyNPR__GeometryBuffers__ObjectAt(x, y) === id && PainterlyNPR__GeometryBuffers__LightAt(x, y) < 0.3;
        PainterlyNPR__OrganicGrammar__Contours(box, step, dark).forEach((contour, ci) => {
            const P  =  PainterlyNPR__OrganicGrammar__Frame(contour);
            for (const p of P) { p.In = PainterlyNPR__GeometryBuffers__ObjectAt(p.X + p.NX * probe, p.Y + p.NY * probe) === id; p.Light = 0.3; }
            PainterlyNPR__OrganicGrammar__Runs(P, contour.Closed, p => p.In).forEach((run, ri) => {
                const rng   =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(seed, `${ci}:${ri}`));
                const line  =  PainterlyNPR__OrganicGrammar__Decorate(run, 'Scallop', clump * 0.7, 0, rng);
                PainterlyNPR__OrganicGrammar__Chop(line, rng, strokes, pushDebug, {
                    DrawMm: [2, 6].map(v => v * Math.sqrt(pen.VegShade)), GapMm: [1.2, 4.5].map(v => v / Math.max(0.2, pen.VegShade)), LitGap: 0,
                    Class: 3, WidthMm: 0.17, Shade: 0, Alpha: 0.8, Loose: L, TaperIn: 0.3, TaperOut: 0.6, Wobble: 0.4,
                    Seed: PainterlyNPR__SeededRandom__DeriveSeed(seed, `t${ci}:${ri}`),
                });
            });
        });
        const rng    =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(seed, 'clusters'));
        const tries  =  Math.round((box[2] - box[0]) * (box[3] - box[1]) / (pxPerMm * pxPerMm) * 0.035 * pen.VegShade);
        for (let k = 0; k < tries; k++) {
            const x = rng.Range(box[0], box[2]), y = rng.Range(box[1], box[3]);
            if (!dark(x, y)) continue;
            const mark  =  PainterlyNPR__OrganicGrammar__Mark('Scallops', x, y, null, null, rng, pxPerMm, 0.85 * pen.VegLeafSize);
            PainterlyNPR__OrganicGrammar__Emit(mark.Points, strokes, { Class: 3, Seed: PainterlyNPR__SeededRandom__DeriveSeed(seed, 'c' + k), WidthMm: 0.16, Alpha: 0.78, Loose: L, TaperIn: mark.TaperIn, TaperOut: mark.TaperOut, Wobble: 0.3, SpacingMm: mark.LenMm / 8 }, pushDebug);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | One Organic Object - by mass, in its kind's style; grass by blade
    // ------------------------------------------------------------
    // The impression of a plant, never its mesh edges (manifest section 07): its
    // true silhouette traced from the ID buffer and drawn in its hand - leaf
    // clumps, needles or a loose line - broken more on the lit side; leaves inside
    // in the kind's rhythm (ORGANIC_STYLES) or the Pen's, densest low and in
    // shadow; the shade line and cups beneath it; a tree's branches suggested
    // through its canopy, and twigs; a hollyhock's stem; and its flowers as dabs
    // of colour for the accent layer. Grass by tapering blades.
    function PainterlyNPR__OrganicGrammar__Run(organic, strokes, globalL, ceiling, pushDebug) {
        const seed     =  PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, 'organic:' + (organic.SeedKey || organic.ObjectId));   // <-- A placed asset's own identity (v0.6.0), so removing one plop leaves the others' hands; the cottage's plants have none
        const rng      =  PainterlyNPR__SeededRandom__Create(seed);
        const pxPerMm  =  Gpu.PxPerMm;
        OrganicLocal.Base     =  globalL + ROLE_LOOSENESS.Planting + (organic.Kind === 'Grass' ? 0 : 0.12 * (State.Pen.VegWild - 1));
        OrganicLocal.Ceiling  =  ceiling;

        if (organic.Kind === 'Grass') {
            const crown  =  PainterlyNPR__CameraRig__Project(organic.Blades[0][0]);
            const field  =  PainterlyNPR__ArtDirection__FieldAt(crown.X, crown.Y);
            const L      =  Clamp(globalL + ROLE_LOOSENESS.Planting + field.Loose, 0, ceiling);
            organic.Blades.forEach((blade, i) => {
                const pts  =  [];
                for (let k = 0; k <= 14; k++) {
                    const t  =  k / 14;
                    const w  =  V3Add(V3Add(V3Scale(blade[0], (1 - t) * (1 - t)), V3Scale(blade[1], 2 * t * (1 - t))), V3Scale(blade[2], t * t));
                    const p  =  PainterlyNPR__CameraRig__Project(w);
                    const id =  PainterlyNPR__GeometryBuffers__ObjectAt(p.X, p.Y);
                    const visible  =  id === organic.ObjectId || PainterlyNPR__GeometryBuffers__DepthAt(p.X, p.Y) > p.Depth - 0.05;
                    if (visible) pts.push({ X: p.X, Y: p.Y });
                    else if (pts.length) { PainterlyNPR__OrganicGrammar__Emit(pts.splice(0), strokes, { Class: 2, Seed: seed + i, WidthMm: 0.19, Alpha: 0.85, Loose: L, TaperIn: 0.4, TaperOut: 3.0, Wobble: 0.3 }, pushDebug); }
                }
                PainterlyNPR__OrganicGrammar__Emit(pts, strokes, { Class: 2, Seed: seed + i, WidthMm: 0.19, Alpha: 0.85, Loose: L, TaperIn: 0.4, TaperOut: 3.0, Wobble: 0.3 }, pushDebug);
            });
            return;
        }

        const pen      =  State.Pen;
        const style    =  ORGANIC_STYLES[organic.Kind] || ORGANIC_STYLES.Shrub;
        const circles  =  organic.Masses.map(PainterlyNPR__OrganicGrammar__Circle).filter(c => c.Depth > 0.2 && c.R > 0.5);
        if (!circles.length) return;
        const cx  =  circles.reduce((s, c) => s + c.X, 0) / circles.length;
        const cy  =  circles.reduce((s, c) => s + c.Y, 0) / circles.length;
        const field  =  PainterlyNPR__ArtDirection__FieldAt(cx, cy);
        const L      =  Clamp(globalL + ROLE_LOOSENESS.Planting + field.Loose + 0.12 * (pen.VegWild - 1), 0, ceiling);
        const disc   =  PainterlyNPR__StrokeSynthesis__DisciplineAt(L);
        const edge   =  pen.VegEdge === 'Kind' ? (style.Edge || 'Scallop') : pen.VegEdge;
        const clump  =  (style.EdgeMm || 1.4) * pen.VegClump * pxPerMm;
        const box    =  [
            Math.max(0, Math.min(...circles.map(c => c.X - c.R * 1.3)) - 4), Math.max(0, Math.min(...circles.map(c => c.Y - c.R * 1.3)) - 4),
            Math.min(Gpu.Width - 1, Math.max(...circles.map(c => c.X + c.R * 1.3)) + 4), Math.min(Gpu.Height - 1, Math.max(...circles.map(c => c.Y + c.R * 1.3)) + 4),
        ];
        const visible  =  box[2] > box[0] && box[3] > box[1];

        // Outline: the plant's true silhouette, in its hand, heavier in shade, lost toward the light
        if (visible && pen.VegOutline * (organic.Role === 'Context' ? pen.DistantOutline : 1) > 0.005) PainterlyNPR__OrganicGrammar__Outline(organic, style, box, edge, clump, L, PainterlyNPR__SeededRandom__DeriveSeed(seed, 'outline'), strokes, pushDebug);

        // Leaves inside, in the kind's rhythm or the chosen one, densest low and in shadow
        const leafKind  =  pen.VegLeafStyle === 'Kind' ? style.Marks : pen.VegLeafStyle;
        const leafMax   =  Math.max(1, ...State.Points.filter(p => p.Type === 'LineControl' && p.Enabled !== false).map(p => p.VegLeaves || 1));   // <-- Room for the most a point asks for
        const density   =  style.Density * disc.Marks * pen.VegLeaves * 1.3 * (leafKind === 'Stipple' ? 3 : 1) * leafMax;
        circles.forEach((c, ci) => {
            const Rmm    =  c.R / pxPerMm;
            const count  =  Math.round(Math.PI * Rmm * Rmm * density);
            for (let m = 0; m < count; m++) {
                const a   =  rng.Range(0, Math.PI * 2), d = Math.sqrt(rng.Next()) * c.R * 0.92;
                const x   =  c.X + Math.cos(a) * d, y = c.Y + Math.sin(a) * d;
                if (PainterlyNPR__GeometryBuffers__ObjectAt(x, y) !== organic.ObjectId) continue;
                const light  =  PainterlyNPR__GeometryBuffers__LightAt(x, y);
                const low    =  y < cy ? 0.22 : 0;
                if (rng.Next() > 0.1 + 0.85 * Math.pow(1 - light, 1.5) + low) continue;
                const plant  =  PainterlyNPR__ArtDirection__PlantingAt(x, y);
                if (PainterlyNPR__SeededRandom__HashUnit(m + ci * 7919, seed) * leafMax > plant.Leaves) continue;   // <-- With no point here every leaf is kept, as before
                const kind   =  plant.LeafStyle || leafKind;
                const mark   =  PainterlyNPR__OrganicGrammar__Mark(kind, x, y, c, [cx, cy], rng, pxPerMm, pen.VegLeafSize * plant.LeafSize);
                PainterlyNPR__OrganicGrammar__Emit(mark.Points, strokes, { Class: 3, Seed: seed + 7919 + ci * 131 + m, WidthMm: kind === 'Stipple' ? 0.28 : (kind === 'Arcs' ? 0.17 : 0.16), Alpha: 0.8, Loose: L, TaperIn: mark.TaperIn, TaperOut: mark.TaperOut, Wobble: 0.25, SpacingMm: Math.max(0.05, mark.LenMm / 6) }, pushDebug);
            }
        });

        // Shade: where the light turns inside the mass, and clusters of cups beneath it
        if (visible && pen.VegShade > 0.005) PainterlyNPR__OrganicGrammar__Shade(organic, box, clump, L, PainterlyNPR__SeededRandom__DeriveSeed(seed, 'shade'), strokes, pushDebug);

        // Branches through the canopy, and only partly - the tree's structure suggested;
        // twigs fork off their outer halves
        if (organic.Branches && pen.VegBranches > 0.005) {
            const gapChance  =  Clamp(0.08 + 0.3 * (1 - pen.VegBranches), 0.02, 0.6);
            const branchOpts =  (bi) => ({ Class: 2, Seed: seed + 5000 + bi, WidthMm: 0.2 * (0.7 + 0.3 * pen.VegBranches), Alpha: 0.8, Loose: L, TaperIn: 0.3, TaperOut: 1.6, Wobble: 0.5 });
            const seen       =  (p) => { const id = PainterlyNPR__GeometryBuffers__ObjectAt(p.X, p.Y); return id === organic.ObjectId || id === organic.TrunkId; };
            organic.Branches.forEach((branch, bi) => {
                const pts  =  [];
                for (let s = 0; s < branch.length - 1; s++) {
                    for (let k = 0; k <= 10; k++) {
                        const p   =  PainterlyNPR__CameraRig__Project(V3Lerp(branch[s], branch[s + 1], k / 10));
                        const ok  =  seen(p) && rng.Next() > gapChance;
                        if (ok) pts.push({ X: p.X, Y: p.Y });
                        else if (pts.length) PainterlyNPR__OrganicGrammar__Emit(pts.splice(0), strokes, branchOpts(bi), pushDebug);
                    }
                }
                PainterlyNPR__OrganicGrammar__Emit(pts, strokes, branchOpts(bi), pushDebug);
                if (pen.VegTwigs <= 0.005) return;
                const tr  =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(seed, 'twigs:' + bi));
                const p1  =  PainterlyNPR__CameraRig__Project(branch[1]), p2 = PainterlyNPR__CameraRig__Project(branch[branch.length - 1]);
                const len =  Math.hypot(p2.X - p1.X, p2.Y - p1.Y);
                if (!(len > 2 * pxPerMm) || p1.Depth < 0.2 || p2.Depth < 0.2) return;
                const ux = (p2.X - p1.X) / len, uy = (p2.Y - p1.Y) / len;
                const count  =  Math.floor(2.5 * pen.VegTwigs) + (tr.Next() < (2.5 * pen.VegTwigs) % 1 ? 1 : 0);
                for (let t = 0; t < count; t++) {
                    const along  =  tr.Range(0.35, 1.0);
                    const turn   =  tr.Range(18, 48) * DEG * (tr.Chance(0.5) ? 1 : -1);
                    const lenPx  =  tr.Range(1.8, 4.5) * pxPerMm * (0.8 + 0.2 * pen.VegTwigs);
                    PainterlyNPR__OrganicGrammar__Twig(p1.X + (p2.X - p1.X) * along, p1.Y + (p2.Y - p1.Y) * along, ux, uy, turn, lenPx, tr).forEach((twig, ti) => {
                        const opts  =  { Class: 3, Seed: PainterlyNPR__SeededRandom__DeriveSeed(seed, `twig:${bi}:${t}:${ti}`), WidthMm: 0.13, Alpha: 0.72, Loose: L, TaperIn: 0.1, TaperOut: 1.0, Wobble: 0.4, SpacingMm: 0.3 };
                        let run  =  [];
                        for (const p of twig) {
                            if (seen(p)) run.push(p);
                            else if (run.length) { PainterlyNPR__OrganicGrammar__Emit(run, strokes, opts, pushDebug); run = []; }
                        }
                        PainterlyNPR__OrganicGrammar__Emit(run, strokes, opts, pushDebug);
                    });
                }
            });
        }

        // A hollyhock's or a foxglove's stem: one tall line from the ground up through its flowers
        if (organic.Kind === 'Hollyhock' || organic.Kind === 'Foxglove') {
            const first  =  organic.Masses[0].C;
            const stem   =  [[first[0], 0, first[2]], ...organic.Masses.map(m => m.C)];
            const pts    =  [];
            const emit   =  (list) => PainterlyNPR__OrganicGrammar__Emit(list, strokes, { Class: 2, Seed: seed + 3001, WidthMm: 0.17, Alpha: 0.8, Loose: L, TaperIn: 0.3, TaperOut: 2.0, Wobble: 0.4 }, pushDebug);
            for (let s = 0; s < stem.length - 1; s++) {
                for (let k = s === 0 ? 0 : 1; k <= 6; k++) {
                    const p   =  PainterlyNPR__CameraRig__Project(V3Lerp(stem[s], stem[s + 1], k / 6));
                    const ok  =  PainterlyNPR__GeometryBuffers__ObjectAt(p.X, p.Y) === organic.ObjectId || p.Depth <= PainterlyNPR__GeometryBuffers__MaxDepth3(p.X, p.Y) + 0.03 + p.Depth * 0.003;
                    if (ok) pts.push({ X: p.X, Y: p.Y });
                    else if (pts.length) emit(pts.splice(0));
                }
            }
            emit(pts);
        }

        if (organic.Flowers) PainterlyNPR__OrganicGrammar__Flowers(organic, circles, seed);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__OrganicGrammar__Run,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
