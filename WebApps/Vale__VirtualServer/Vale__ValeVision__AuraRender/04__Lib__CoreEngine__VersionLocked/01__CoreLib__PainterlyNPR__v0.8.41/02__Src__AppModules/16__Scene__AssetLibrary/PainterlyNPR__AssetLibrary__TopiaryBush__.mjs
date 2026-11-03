/* =============================================================================
   PAINTERLYNPR - SCENE | ASSET LIBRARY - A TOPIARY BUSH
   =============================================================================

   FILE       : PainterlyNPR__AssetLibrary__TopiaryBush__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - AssetLibrary - TopiaryBush
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A clipped bush in a border, as its DAT sets it out: a turned body
                with no mesh edges, the leaves and flowers about it placed one by
                one as shapes of wash, gold glazed into them, paper left in a
                meander, and the pen's own stems and scribble laid over them
   CREATED    : 03-Nov-2026 (v0.8.40)

   DESCRIPTION:
   - Adam, 03-Nov-2026, with two bushes ringed on Vale's Thrower perspective
     (A2Q 15270-1 PER): "Load your NPR Skill and create two new topiary bush
     assets like these". One rounded, one pointed.
   - The body has no mesh edges: its outline is traced from the ID buffer in its
     own style, and 44's gesture goes over it by the sun's side on the sheet. So
     everything that depends on the light is drawn by the light, and what is set
     out here (flowers, stems, the scribble at its foot) owes it nothing.
   - The plant is data, not a generator's dice, as PottedPlant's is: a new bush is
     a new DAT. Set out as seen from the front, x right, y up, in metres from its
     foot. What is set out lies just proud of the body's front, whatever its
     height, so the marks stay together when the eye moves round it.
   - A plop mirrors its set-out by its seed and grows its own lumps, so two side
     by side never read as one copied. Its leaves and pen are PottedPlant's own
     (PlantLeaves, PlantPen), never a second way of making them.
   - Built in its own space (metres, +Y up, base centre at the origin, front to
     +Z), as every generator is. A turn goes through T, so it holds its shape.

   ============================================================================= */

import {
    PainterlyNPR__Maths__Clamp        as  Clamp,
    PainterlyNPR__Maths__V3Cross      as  V3Cross,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Sub        as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__AssetLibrary__ProfileAt } from './PainterlyNPR__AssetLibrary__BowlStandard__.mjs';
import { PainterlyNPR__AssetLibrary__Organic } from './PainterlyNPR__AssetLibrary__Planting__.mjs';
import {
    PainterlyNPR__AssetLibrary__PlantLeaves,
    PainterlyNPR__AssetLibrary__PlantPen,
} from './PainterlyNPR__AssetLibrary__PottedPlant__.mjs';

// =============================================================================
// REGION | Asset Library - A Topiary Bush
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Body - a lathe, its outline traced from the ID buffer
    // ------------------------------------------------------------
    const BODY  =  {
        Rings       :  30,                                                     // <-- Fine enough that the traced outline shows no facets at a close view
        Segments    :  44,
        Lobes       :  5,                                                      // <-- Its lumps: a few waves round it and up it, from the plop's seed
        RoundWaves  :  [2, 5],                                                 // <-- Waves round it: fewer than this and it only leans, more and it reads as a gear
        UpWaves     :  [0.7, 1.9],                                             // <-- Waves up it
        LobeSize    :  [0.5, 1],
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | What Is Set Out
    // ------------------------------------------------------------
    const SETOUT  =  {
        ProudM       :  0.02,                                                  // <-- How far in front of the body's surface a mark lies, past its lumps
        LeafProud    :  0.2,                                                   // <-- A leaf stands a further share of its width: half its thickness and a little
        LeafSamples  :  7,                                                     // <-- Along a leaf, to find the body's deepest point behind it: a leaf is a flat thing, a body is round
        GroundM      :  0.012,                                                 // <-- A mark at its foot keeps this far off the ground, or the ground's depth test takes it
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Body
// -----------------------------------------------------------------------------

    // FUNCTION | The Body - a lathe by a measured profile, with no mesh edges
    // ------------------------------------------------------------
    // P.Profile (flat pairs, as a pot's: a height share, that height's width over
    // the widest) by P.HeightM and P.WidthM; P.LeanM how far its top stands off its
    // foot, toward whichever side the plop's mirror says; P.Lump its lumps' size,
    // over its width. Returns where the body's front lies at a point seen from the
    // front, and its widest radius.
    function PainterlyNPR__AssetLibrary__BushBody(G, body, flip) {
        const { K, T, Rng: r, P }  =  G;
        const Q      =  BODY;
        const halfW  =  P.WidthM / 2, H = P.HeightM;
        const lean   =  flip * P.LeanM;
        const lobes  =  [];
        for (let i = 0; i < Q.Lobes; i++) lobes.push({ Round: r.IntRange(Q.RoundWaves[0], Q.RoundWaves[1]), Up: r.Range(Q.UpWaves[0], Q.UpWaves[1]) * Math.PI * 2, Phase: r.Range(0, Math.PI * 2), Size: r.Range(Q.LobeSize[0], Q.LobeSize[1]) });
        const shape  =  (t) => Math.max(0, halfW * PainterlyNPR__AssetLibrary__ProfileAt(P.Profile, t));
        const lump   =  (t, a) => {
            let k  =  0;
            for (const l of lobes) k  +=  l.Size * Math.sin(l.Round * a + l.Up * t + l.Phase);
            return 1 + P.Lump * k;
        };
        const local   =  (t, a) => { const rr = shape(t) * lump(t, a); return [Math.cos(a) * rr + lean * t, t * H, Math.sin(a) * rr]; };
        const normal  =  (t, a) => {
            if (t >= 1) return [0, 1, 0];
            const dT = 0.5 / Q.Rings, dA = Math.PI / Q.Segments;
            const up     =  V3Sub(local(Math.min(1, t + dT), a), local(Math.max(0, t - dT), a));
            const round  =  V3Sub(local(t, a + dA), local(t, a - dA));
            return T.Dir(V3Normalise(V3Cross(up, round)));
        };
        const angle  =  (j) => (j / Q.Segments) * Math.PI * 2;
        for (let i = 0; i < Q.Rings; i++) {
            const t0 = i / Q.Rings, t1 = (i + 1) / Q.Rings;
            for (let j = 0; j < Q.Segments; j++) {
                const a0 = angle(j), a1 = angle(j + 1);
                const p00 = T.At(local(t0, a0)), p01 = T.At(local(t0, a1)), p11 = T.At(local(t1, a1)), p10 = T.At(local(t1, a0));
                const n00 = normal(t0, a0), n01 = normal(t0, a1), n11 = normal(t1, a1), n10 = normal(t1, a0);
                K.triSmooth(p00, p01, p11, n00, n01, n11, body);
                K.triSmooth(p00, p11, p10, n00, n11, n10, body);
            }
        }
        const base  =  T.At([0, 0, 0]);
        for (let j = 0; j < Q.Segments; j++) K.tri(base, T.At(local(0, angle(j))), T.At(local(0, angle(j + 1))), [0, -1, 0], body);
        const widest  =  Math.max(...P.Profile.filter((v, i) => i % 2 === 1)) * halfW;
        const front   =  (x, y) => {
            const t   =  Clamp(y / H, 0, 1);
            const rr  =  shape(t), dx = x - lean * t;
            return Math.sqrt(Math.max(0, rr * rr - dx * dx));
        };
        return { Front: front, Widest: widest, Top: [lean, H, 0] };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | What Is Set Out
// -----------------------------------------------------------------------------

    // FUNCTION | The Set-Out Mirrored and Laid on the Body's Front
    // ------------------------------------------------------------
    // Everything the DAT sets out, by the plop's mirror: Leaves for PottedPlant's
    // PlantLeaves, each flat at the depth that clears the body behind it (its own Z
    // a further distance out), and the pen's lines, rings, flecks and touches for
    // its PlantPen. A line's Times (how often the pen goes over it) goes on to the Sketch.
    function PainterlyNPR__AssetLibrary__BushSetOut(P, flip, on) {
        const Q      =  SETOUT;
        const mirrorPairs  =  (flat) => flat.map((v, i) => (i % 2 === 0 ? flip * v : Math.max(v, Q.GroundM)));
        const leaves  =  P.Leaves.map((leaf) => {
            const from = [flip * leaf.From[0], Math.max(leaf.From[1], Q.GroundM)], to = [flip * leaf.To[0], Math.max(leaf.To[1], Q.GroundM)];
            let deepest  =  0;
            for (let s = 0; s < Q.LeafSamples; s++) {
                const t  =  s / (Q.LeafSamples - 1);
                deepest  =  Math.max(deepest, on(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t));
            }
            const z  =  deepest + leaf.WidthM * Q.LeafProud + (leaf.Z || 0);
            return Object.assign({}, leaf, { From: from, To: to, Bow: flip * (leaf.Bow || 0), Z: z, ZFrom: z });
        });
        return {
            Leaves     :  leaves,
            PenLines   :  P.PenLines.map(line => Object.assign({}, line, { Points: mirrorPairs(line.Points) })),
            PenRings   :  P.PenRings.map(ring => Object.assign({}, ring, { At: [flip * ring.At[0], ring.At[1]] })),
            PenFlecks  :  mirrorPairs(P.PenFlecks),
            Touches    :  P.Touches.map(touch => Object.assign({}, touch, { From: [flip * touch.From[0], touch.From[1]], To: [flip * touch.To[0], touch.To[1]], Z: on(flip * touch.From[0], touch.From[1]) })),
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Glazes and Paper Left - shapes in the accent layers, as Sketch entries
    // ------------------------------------------------------------
    // A glaze (From, To, WidthM, Bow, Full, WidestAt, Pigments) is a shape of
    // colour no one wash has, gold above all, laid over whatever wash it lands on.
    // A line of paper (Points, WidthMm) is what the brush went round.
    function PainterlyNPR__AssetLibrary__BushAccents(G, flip, on) {
        const { T, Rng: r, P }  =  G;
        const Q       =  SETOUT;
        const nudge   =  () => r.Spread(P.JitterM);
        const sketch  =  [];
        for (const glaze of P.Glazes) {
            const x0 = flip * glaze.From[0] + nudge(), y0 = Math.max(glaze.From[1], Q.GroundM) + nudge();
            const x2 = flip * glaze.To[0] + nudge(), y2 = Math.max(glaze.To[1], Q.GroundM) + nudge();
            const len  =  Math.hypot(x2 - x0, y2 - y0) || 1;
            const bow  =  (glaze.Bow || 0) * flip;
            const x1 = (x0 + x2) / 2 - (y2 - y0) / len * bow, y1 = (y0 + y2) / 2 + (x2 - x0) / len * bow;
            const z  =  Math.max(on(x0, y0), on(x1, y1), on(x2, y2)) + (glaze.Z || 0);
            sketch.push({ Glaze: [T.At([x0, y0, z]), T.At([x1, y1, z]), T.At([x2, y2, z])], WidthM: glaze.WidthM * T.Scale, Full: glaze.Full, WidestAt: glaze.WidestAt, Pigments: glaze.Pigments });
        }
        for (const line of P.PaperLines) {
            const points  =  [];
            for (let i = 0; i + 1 < line.Points.length; i += 2) {
                const x  =  flip * line.Points[i] + nudge(), y = Math.max(line.Points[i + 1], Q.GroundM) + nudge();
                points.push(T.At([x, y, on(x, y) + (line.Z || 0)]));
            }
            if (points.length >= 2) sketch.push({ Paper: points, WidthMm: line.WidthMm });
        }
        return sketch;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Generator
// -----------------------------------------------------------------------------

    // FUNCTION | A Topiary Bush - a turned body, what is set out about it, the pen over them
    // ------------------------------------------------------------
    // The body comes first (Part 0, the wash a material on it takes), its leaves one
    // object a tone, then the organics: the body's outline and gesture, and a Sketch
    // for the rest, drawn over the plant's own objects from any side (Over), hidden
    // only by something else standing in front. Each has its own seed key.
    function PainterlyNPR__AssetLibrary__TopiaryBush(G) {
        const { K, T, Rng: r, P }  =  G;
        const Q     =  SETOUT;
        const own   =  (tag) => Object.assign({}, G, { Extras: Object.assign({}, G.Extras, { SeedKey: G.Extras.SeedKey + ':' + tag }) });
        const hand  =  { Overdraw: P.Overdraw, Wobble: P.Wobble };
        const flip  =  r.Chance(0.5) ? -1 : 1;
        const body  =  K.addObject(G.Name + ' - body', 'Planting', G.Recipe.Material, G.Recipe.Role || 'Planting');
        const form  =  PainterlyNPR__AssetLibrary__BushBody(G, body, flip);
        const on    =  (x, y) => form.Front(x, y) + Q.ProudM;
        const set   =  PainterlyNPR__AssetLibrary__BushSetOut(P, flip, on);
        const laid  =  Object.assign({}, G, { P: Object.assign({}, P, set) });
        const leaves   =  PainterlyNPR__AssetLibrary__PlantLeaves(laid);
        const objects  =  [body, ...leaves];
        PainterlyNPR__AssetLibrary__Organic(own('body'), body, G.Recipe.Kind, {
            Masses   :  [{ C: T.At([0, P.HeightM * 0.3, 0]), R: form.Widest * T.Scale }, { C: T.At([0, 0, 0]), R: form.Widest * T.Scale }, { C: T.At(form.Top), R: form.Widest * 0.2 * T.Scale }],   // <-- For the box the grammar traces in: its widest first, as a gesture reads the first
            Open     :  P.OpenFoot,                                            // <-- No line along its foot or round its own leaves: the scan's foot is scribble and paper
            Gesture  :  'Bush',
            Bush     :  { Foot: T.At([0, 0, 0]), Top: T.At(form.Top) },
            Hand     :  hand,
        });
        const zAt     =  (x, y, lean, line) => on(x, y) + ((line && line.Z) || 0);
        const sketch  =  PainterlyNPR__AssetLibrary__BushAccents(G, flip, on).concat(PainterlyNPR__AssetLibrary__PlantPen(laid, zAt));
        PainterlyNPR__AssetLibrary__Organic(own('pen'), body, 'Sketch', { Sketch: sketch, Over: objects.map(o => o.Id), Hand: hand });
        return objects;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__AssetLibrary__TopiaryBush,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
