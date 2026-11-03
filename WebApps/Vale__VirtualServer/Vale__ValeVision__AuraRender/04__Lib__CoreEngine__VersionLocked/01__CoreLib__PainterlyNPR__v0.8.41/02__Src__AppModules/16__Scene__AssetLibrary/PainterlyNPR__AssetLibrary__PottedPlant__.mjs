/* =============================================================================
   PAINTERLYNPR - SCENE | ASSET LIBRARY - POTTED PLANT
   =============================================================================

   FILE       : PainterlyNPR__AssetLibrary__PottedPlant__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - AssetLibrary - PottedPlant
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A potted plant as its DAT sets it out: a turned bowl, its leaves
                and flower heads placed one by one as the wash's shapes, and the
                pen's own loops, rings and flecks laid over them
   CREATED    : 03-Nov-2026 (v0.8.34)

   DESCRIPTION:
   - Adam, 03-Nov-2026, with a scan of a row of red bowl plants along an orangery:
     "Make these 4x potted plant assets".
   - The illustrator's wash and pen do not register. Each leaf is a shape of wash
     with no line round it; the pen comes after, in long loops of its own that
     owe the wash nothing. So the leaves here carry no edges and no organic, and
     the pen is a Sketch of its own (40), never traced from them.
   - The plant is data, not a generator's dice: a new potted plant is a new DAT.
     Leaves and pen lines are set out as seen from the front (x right, y up, in
     metres from the pot's foot). A leaf's Z says how far it stands out, so the
     proxy has depth in SketchUp and a three-quarter view. The seed only nudges
     them, so a duplicated plant is visibly varied and re-renders identically.
   - The bowl is the shared BowlPlanter (v0.8.33), by the profile a DAT measures.

   ============================================================================= */

import {
    PainterlyNPR__Maths__Clamp        as  Clamp,
    PainterlyNPR__Maths__V3Add        as  V3Add,
    PainterlyNPR__Maths__V3Cross      as  V3Cross,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Scale      as  V3Scale,
    PainterlyNPR__Maths__V3Sub        as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import { PainterlyNPR__AssetLibrary__BowlPlanter } from './PainterlyNPR__AssetLibrary__BowlStandard__.mjs';
import { PainterlyNPR__AssetLibrary__Organic } from './PainterlyNPR__AssetLibrary__Planting__.mjs';

// =============================================================================
// REGION | Asset Library - Potted Plant
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | A Leaf's Shape
    // ------------------------------------------------------------
    // A leaf is a lens swept along a curved midrib: thick enough to hold its shape
    // edge on, so it reads from any side, and flat enough to read as a leaf.
    const LEAF  =  {
        Stations   :  14,                                                      // <-- Along the midrib: a smooth outline at a hand's scale, few triangles at a drawing's
        Round      :  6,                                                       // <-- Round its section
        Thick      :  0.28,                                                    // <-- Its thickness over its width: a leaf turned edge on still reads as a leaf. A flower head says its own (Thick), nearer round
        MinThickM  :  0.006,                                                   // <-- A narrow leaf still has a body
        WidestAt   :  0.75,                                                    // <-- The power on the length: below 1 the widest part sits nearer the foot, as a leaf's does
        Full       :  0.68,                                                    // <-- The power on the outline: below 1 fuller shoulders and a blunter tip, so the scan's washes read as shapes a brush filled, not a maple's points. A leaf may say its own (Full)
        Rag        :  0.07,                                                    // <-- How much each station's width wanders: cut by a brush, not a template
        FaceTilt   :  [0.3, 0.2],                                              // <-- How far its flat turns off the front, side to side and up and down, by the seed
        FaceRise   :  0.25,                                                    // <-- Its flat looks a little up, toward the light, as a leaf's does
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Band Round the Rim
    // ------------------------------------------------------------
    const RIM  =  {
        ProudM    :  0.003,                                                    // <-- How far it stands off the pot: enough to win the depth test, never a ledge
        Segments  :  36,                                                       // <-- As the bowl's
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Pen
    // ------------------------------------------------------------
    const PEN  =  {
        JitterShare  :  0.5,                                                   // <-- A pen point moves by this much of a leaf's jitter: the loop stays the loop
        OnPotM       :  0.006,                                                 // <-- A mark on the pot stands this far off its surface, clear of the depth test
        LeanOverM    :  0.3,                                                   // <-- A line stands in the crown at the rim and has leaned its full way out this far above it
        FleckSize    :  1.4,                                                   // <-- A fleck's size on Mark's Stipple: from 1.2 it is long enough for the pen to draw it at all (33 drops a stroke under 0.3 mm)
        FleckBlot    :  3,                                                     // <-- Strokes side by side in a fleck: a dot gone over, as fat as the scan's on the base pen
        Alpha        :  1,                                                     // <-- Firm ink: the scan's loops are laid on purpose, not searching
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Leaves
// -----------------------------------------------------------------------------

    // FUNCTION | One Leaf - a lens swept along a curved midrib, its flat to the front
    // ------------------------------------------------------------
    // From and To are the midrib's ends as seen from the front, Bow how far its
    // middle stands off the chord (to the left, going from foot to tip), Z how far
    // its tip stands out toward the front; its foot stands out a quarter as far,
    // nearer the crown, unless it says (ZFrom, v0.8.40); WidestAt as LEAF's, its own.
    // No edges and no organic: a shape of wash, no more.
    function PainterlyNPR__AssetLibrary__Leaf(G, object, leaf) {
        const { K, T, Rng: r, P }  =  G;
        const L      =  LEAF;
        const nudge  =  () => r.Spread(P.JitterM);
        const z      =  leaf.Z || 0;
        const p0     =  [leaf.From[0] + nudge(), leaf.From[1] + nudge(), leaf.ZFrom != null ? leaf.ZFrom : z * 0.25];
        const p2     =  [leaf.To[0] + nudge(), leaf.To[1] + nudge(), z];
        const chord  =  V3Sub(p2, p0);
        const mid    =  V3Scale(V3Add(p0, p2), 0.5);
        const side   =  V3Normalise([-chord[1], chord[0], 0]);
        const p1     =  V3Add(mid, V3Scale(side, leaf.Bow || 0));
        const face   =  V3Normalise([r.Spread(L.FaceTilt[0]), L.FaceRise + r.Spread(L.FaceTilt[1]), 1]);
        const halfW  =  leaf.WidthM / 2;
        const halfT  =  Math.max(L.MinThickM, leaf.WidthM * (leaf.Thick != null ? leaf.Thick : L.Thick)) / 2;
        const full   =  leaf.Full != null ? leaf.Full : L.Full;
        const at     =  (t) => V3Add(V3Add(V3Scale(p0, (1 - t) * (1 - t)), V3Scale(p1, 2 * t * (1 - t))), V3Scale(p2, t * t));
        const along  =  (t) => V3Normalise(V3Add(V3Scale(V3Sub(p1, p0), 2 * (1 - t)), V3Scale(V3Sub(p2, p1), 2 * t)));
        const rings  =  [];
        for (let s = 1; s < L.Stations; s++) {
            const t      =  s / L.Stations;
            const tan    =  along(t);
            const u      =  V3Normalise(V3Cross(face, tan));                   // <-- Across the leaf
            const v      =  V3Normalise(V3Cross(tan, u));                      // <-- Through its thickness
            const shape  =  Math.pow(Math.sin(Math.PI * Math.pow(t, leaf.WidestAt != null ? leaf.WidestAt : L.WidestAt)), full) * (1 + r.Spread(L.Rag));
            const a      =  halfW * shape, b = halfT * shape;
            const ring   =  [];
            for (let k = 0; k < L.Round; k++) {
                const q  =  (k / L.Round) * Math.PI * 2;
                const c  =  Math.cos(q), n = Math.sin(q);
                ring.push({
                    P  :  T.At(V3Add(V3Add(at(t), V3Scale(u, c * a)), V3Scale(v, n * b))),
                    N  :  T.Dir(V3Normalise(V3Add(V3Scale(u, c * b), V3Scale(v, n * a)))),   // <-- The ellipse's own normal: its flat shades as a flat, its edge turns quickly
                });
            }
            rings.push(ring);
        }
        const foot  =  { P: T.At(p0), N: T.Dir(V3Scale(along(0), -1)) };
        const tip   =  { P: T.At(p2), N: T.Dir(along(1)) };
        const tri   =  (a, b, c) => K.triSmooth(a.P, b.P, c.P, a.N, b.N, c.N, object);
        for (let k = 0; k < L.Round; k++) {
            const k1  =  (k + 1) % L.Round;
            tri(foot, rings[0][k1], rings[0][k]);
            tri(tip, rings[rings.length - 1][k], rings[rings.length - 1][k1]);
            for (let s = 0; s < rings.length - 1; s++) {
                tri(rings[s][k], rings[s][k1], rings[s + 1][k1]);
                tri(rings[s][k], rings[s + 1][k1], rings[s + 1][k]);
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Leaves, One Object a Tone
    // ------------------------------------------------------------
    // Each material the DAT's leaves name is one object, in the order they first
    // appear, so its leaves dry as one wash. A material the engine does not know
    // falls back, loudly, rather than breaking the build, as a plop's do.
    function PainterlyNPR__AssetLibrary__PlantLeaves(G) {
        const { K, P }  =  G;
        const tones  =  new Map();
        for (const leaf of P.Leaves) {
            let key  =  leaf.Tone;
            if (!MATERIAL_BY_KEY[key]) { console.warn(`[PainterlyNPR AssetLibrary] ${G.Name}: no material ${key}`); key = 'Foliage'; }
            if (!tones.has(key)) tones.set(key, K.addObject(`${G.Name} - ${MATERIAL_BY_KEY[key].Label}`, 'Planting', key, 'Planting'));
            PainterlyNPR__AssetLibrary__Leaf(G, tones.get(key), leaf);
        }
        return Array.from(tones.values());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Pen
// -----------------------------------------------------------------------------

    // FUNCTION | The Pen's Own Marks - loops, rings and flecks, and the brush's darker touches, as a Sketch
    // ------------------------------------------------------------
    // Each is set out from the front; the seed leans it toward or away from the
    // eye (PenSpreadM), so from another side the loops still fan out as the leaves
    // do. A line marked Pot lies on the bowl's own curve instead, so it turns with
    // the pot. A touch deepens whatever wash it lands on, so the darkest of a plant
    // is the same wash gone darker, not another material with a line round it.
    // zAt (v0.8.40), when given, says how far out a mark lies, instead of the lean: a
    // plant with a body lays its pen on the body's front.
    function PainterlyNPR__AssetLibrary__PlantPen(G, zAt) {
        const { T, Rng: r, P }  =  G;
        const nudge  =  () => r.Spread(P.JitterM * PEN.JitterShare);
        const belly  =  P.PotWidthM / 2;
        const leanAt  =  (y, lean) => lean * Clamp((y - P.PotHeightM) / PEN.LeanOverM, 0, 1);
        const sketch  =  [];
        for (const line of P.PenLines) {
            const lean    =  r.Spread(P.PenSpreadM);
            const points  =  [];
            for (let i = 0; i + 1 < line.Points.length; i += 2) {
                const x  =  line.Points[i] + nudge(), y = line.Points[i + 1] + nudge();
                points.push(T.At([x, y, line.Pot ? Math.sqrt(Math.max(0, belly * belly - x * x)) + PEN.OnPotM : (zAt ? zAt(x, y, lean, line) : leanAt(y, lean))]));
            }
            if (points.length >= 2) sketch.push({ Line: points, Alpha: PEN.Alpha, Whole: true, Tier: P.PenTier, Times: line.Times });
        }
        for (const touch of P.Touches) sketch.push({ Touch: [T.At([touch.From[0], touch.From[1], touch.Z || 0]), T.At([touch.To[0], touch.To[1], touch.Z || 0])], WidthM: touch.WidthM * T.Scale, Amount: touch.Amount });
        for (const ring of P.PenRings) { const lean = r.Spread(P.PenSpreadM); sketch.push({ Ring: T.At([ring.At[0], ring.At[1], zAt ? zAt(ring.At[0], ring.At[1], lean) : leanAt(ring.At[1], lean)]), RM: ring.RM * T.Scale, Alpha: PEN.Alpha }); }
        for (let i = 0; i + 1 < P.PenFlecks.length; i += 2) { const lean = r.Spread(P.PenSpreadM); sketch.push({ Fleck: T.At([P.PenFlecks[i], P.PenFlecks[i + 1], zAt ? zAt(P.PenFlecks[i], P.PenFlecks[i + 1], lean) : leanAt(P.PenFlecks[i + 1], lean)]), Size: PEN.FleckSize, Blot: PEN.FleckBlot, Alpha: PEN.Alpha }); }
        return sketch;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Band Round the Rim - a paler wash, its two lines traced as the pot's are
    // ------------------------------------------------------------
    // The scan's rims: a band left pale between two dark lines, or dark where the
    // soil shows. It stands just off the pot, so the red stops at its foot. RimM 0: none.
    function PainterlyNPR__AssetLibrary__PlantRim(G, radiusAt, own) {
        const { K, T, P }  =  G;
        if (!(P.RimM > 0)) return [];
        const rim  =  K.addObject(G.Name + ' - rim', 'Furniture', P.RimMaterial, 'Furniture');
        const H    =  P.PotHeightM, foot = H - P.RimM;
        K.cylinder({ Base: T.At([0, foot, 0]), Axis: [0, 1, 0], R0: (radiusAt(foot / H) + RIM.ProudM) * T.Scale, R1: (radiusAt(1) + RIM.ProudM) * T.Scale, Height: P.RimM * T.Scale, Segments: RIM.Segments }, rim);
        PainterlyNPR__AssetLibrary__Organic(own('rim'), rim, 'Pot', { Masses: [{ C: T.At([0, H - P.RimM / 2, 0]), R: radiusAt(1) * T.Scale }], Hand: { Overdraw: P.Overdraw, Wobble: P.Wobble } });
        return [rim];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Generator
// -----------------------------------------------------------------------------

    // FUNCTION | A Potted Plant - a turned bowl, its leaves, and the pen over them
    // ------------------------------------------------------------
    // The bowl and its soil come first, its rim's band, its leaves one object a
    // tone, then the pen's Sketch, an organic with its own seed key and the
    // asset's hand, so how it sketches travels with the asset and its plops. It
    // comes after the wash as the pen does: it is drawn over this plant from any
    // side (Over), and hidden only by something else standing in front.
    function PainterlyNPR__AssetLibrary__PottedPlant(G) {
        const { K, P }  =  G;
        const own   =  (tag) => Object.assign({}, G, { Extras: Object.assign({}, G.Extras, { SeedKey: G.Extras.SeedKey + ':' + tag }) });
        const pot   =  K.addObject(G.Name + ' - pot', 'Furniture', P.PotMaterial, 'Furniture');
        const soil  =  K.addObject(G.Name + ' - soil', 'Planting', P.TrunkMaterial, 'Planting');
        const { RadiusAt: radiusAt }  =  PainterlyNPR__AssetLibrary__BowlPlanter(G, pot, soil);
        const rim     =  PainterlyNPR__AssetLibrary__PlantRim(G, radiusAt, own);
        const leaves  =  PainterlyNPR__AssetLibrary__PlantLeaves(G);
        const objects  =  [pot, soil, ...rim, ...leaves];
        PainterlyNPR__AssetLibrary__Organic(own('pen'), pot, 'Sketch', { Sketch: PainterlyNPR__AssetLibrary__PlantPen(G), Over: objects.map(o => o.Id), Hand: { Overdraw: P.Overdraw, Wobble: P.Wobble } });
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
        PainterlyNPR__AssetLibrary__PlantLeaves,
        PainterlyNPR__AssetLibrary__PlantPen,
        PainterlyNPR__AssetLibrary__PottedPlant,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
