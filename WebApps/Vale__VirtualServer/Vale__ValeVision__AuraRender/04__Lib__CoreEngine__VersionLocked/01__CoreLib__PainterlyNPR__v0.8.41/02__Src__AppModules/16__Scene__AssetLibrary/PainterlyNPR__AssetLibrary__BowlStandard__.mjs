/* =============================================================================
   PAINTERLYNPR - SCENE | ASSET LIBRARY - A BALL STANDARD IN A RED BOWL
   =============================================================================

   FILE       : PainterlyNPR__AssetLibrary__BowlStandard__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - AssetLibrary - BowlStandard
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The generators for a low round bowl of a pot, drawn in one gesture,
                and for the standard that stands in it: a clear stem with a
                corkscrew round it, a ball clipped smooth, and underplanting of
                loose washes with pen laid over them
   CREATED    : 03-Nov-2026 (v0.8.32)

   DESCRIPTION:
   - Adam, 03-Nov-2026, with an orangery's pots ringed in red and a close-up: "Build
     this potted plant asset". Sized and coloured by measuring his scans: a pot
     twice as wide as it is tall, 0.66 of its width at the rim and 0.7 at the foot,
     a ball about 0.73 of its width across, the whole 2.5 times its width tall.
   - The bowl has no mesh edges: a turned pot's would come out as many short
     silhouettes, and the hand draws one gesture. Its outline is traced from the
     ID buffer in the Pot style, and 48's gesture does the rest.
   - Its washes are masses in three materials with no outline of their own, and
     the pen over them is an organic of Kind 'Sketch': in the scans the pen runs
     free of the washes under it. Strokes are not geometry, so the MOD proxy has
     the masses but not the corkscrew or the strap leaves.
   - Built in its own space (metres, +Y up, base centre at the origin, front to
     +Z), as every generator is. The shape's random comes from the plop, so each
     plop is its own plant, mirrored or not.

   ============================================================================= */

import {
    PainterlyNPR__Maths__Lerp        as  Lerp,
    PainterlyNPR__Maths__SmoothStep  as  SmoothStep,
    PainterlyNPR__Maths__V3Add       as  V3Add,
    PainterlyNPR__Maths__V3Length    as  V3Length,
    PainterlyNPR__Maths__V3Lerp      as  V3Lerp,
    PainterlyNPR__Maths__V3Scale     as  V3Scale,
    PainterlyNPR__Maths__V3Sub       as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__AssetLibrary__Masses,
    PainterlyNPR__AssetLibrary__Organic,
} from './PainterlyNPR__AssetLibrary__Planting__.mjs';

// =============================================================================
// REGION | Asset Library - A Ball Standard in a Red Bowl
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | The Bowl
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | A Bowl's Proportions - shares of its belly's width, metres where named
    // ------------------------------------------------------------
    const BOWL  =  {
        FootShare   :  0.7,                                                    // <-- Its foot's width over its belly's, off Adam's close-up
        RimShare    :  0.66,                                                   // <-- Its rim's. Measured up the pot's side: 0.74 of its belly 4% up, 0.84 at 13%, 0.97 at 30%, 1 at half
        BellyAt     :  0.5,                                                    // <-- How far up its height it is widest
        BellyPower  :  0.95,                                                   // <-- Below 1 a fuller side, a barrel at 0.7; about 1 is a plain round
        LipM        :  0.02,                                                   // <-- The line under the rim, this far down; 0 none
        WallM       :  0.018,                                                  // <-- The rim's thickness: the soil sits inside it
        SoilDropM   :  0.03,                                                   // <-- The soil's level below the rim
        Rings       :  22,                                                     // <-- Fine enough that the outline, traced from the ID buffer, shows no facets at 1:50
        Segments    :  36,
    };
    // ------------------------------------------------------------


    // FUNCTION | A Measured Profile - a pot's width up its height, smooth between the points given
    // ------------------------------------------------------------
    // Flat pairs: a height (0 the foot, 1 the rim), that height's width over the belly's (v0.8.34).
    function PainterlyNPR__AssetLibrary__ProfileAt(pairs, t) {
        const n  =  pairs.length / 2;
        let i    =  0;
        while (i < n - 2 && t > pairs[(i + 1) * 2]) i++;
        const at   =  (k) => pairs[Math.max(0, Math.min(n - 1, k)) * 2], val = (k) => pairs[Math.max(0, Math.min(n - 1, k)) * 2 + 1];
        const h    =  at(i + 1) - at(i);
        const u    =  Math.max(0, Math.min(1, (t - at(i)) / h));
        const m0   =  (val(i + 1) - val(i - 1)) / Math.max(1e-6, at(i + 1) - at(i - 1)) * h;
        const m1   =  (val(i + 2) - val(i)) / Math.max(1e-6, at(i + 2) - at(i)) * h;
        const u2 = u * u, u3 = u2 * u;
        return (2 * u3 - 3 * u2 + 1) * val(i) + (u3 - 2 * u2 + u) * m0 + (3 * u2 - 2 * u3) * val(i + 1) + (u3 - u2) * m1;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Low Round Bowl - a lathe with no mesh edges, drawn by its Pot style and gesture
    // ------------------------------------------------------------
    // P.PotWidthM and P.PotHeightM size it. P.PotFootShare, PotRimShare, PotBellyAt
    // and PotLipM shape it, each defaulting to BOWL's. P.PotGesture null leaves out
    // 48's white side and scribble, for a pot whose marks are all laid by hand. P's
    // Overdraw and Wobble are its hand. P.PotProfile, when given, is its measured
    // shape and the shares above are not read (v0.8.34). Returns the soil's level,
    // the radius inside the rim, and the bowl's radius at a share of its height.
    function PainterlyNPR__AssetLibrary__BowlPlanter(G, pot, soil) {
        const { K, T, P }  =  G;
        const Q        =  BOWL;
        const R        =  P.PotWidthM / 2, H = P.PotHeightM;
        const footK    =  P.PotFootShare != null ? P.PotFootShare : Q.FootShare;
        const rimK     =  P.PotRimShare != null ? P.PotRimShare : Q.RimShare;
        const bellyAt  =  P.PotBellyAt != null ? P.PotBellyAt : Q.BellyAt;
        const lipM     =  P.PotLipM != null ? P.PotLipM : Q.LipM;
        const gesture  =  P.PotGesture === undefined ? 'Pot' : P.PotGesture;
        const swell    =  1 - Lerp(footK, rimK, bellyAt);                      // <-- What the sides add at the belly, so it comes to the full width there
        const radius   =  P.PotProfile ? (t) => R * PainterlyNPR__AssetLibrary__ProfileAt(P.PotProfile, t) : (t) => {
            const u  =  t <= bellyAt ? 0.5 * t / bellyAt : 0.5 + 0.5 * (t - bellyAt) / (1 - bellyAt);
            return R * (Lerp(footK, rimK, t) + swell * Math.pow(Math.sin(Math.PI * u), Q.BellyPower));
        };
        const at       =  (t, a) => { const r = radius(t); return T.At([Math.cos(a) * r, t * H, Math.sin(a) * r]); };
        const normal   =  (t, a) => {
            const e    =  1 / (Q.Rings * 4);
            const dr   =  (radius(Math.min(1, t + e)) - radius(Math.max(0, t - e))) / (Math.min(1, t + e) - Math.max(0, t - e)) / H;
            const len  =  Math.hypot(1, dr);
            return T.Dir([Math.cos(a) / len, -dr / len, Math.sin(a) / len]);
        };
        const angle    =  (j) => (j / Q.Segments) * Math.PI * 2;
        for (let i = 0; i < Q.Rings; i++) {
            const t0 = i / Q.Rings, t1 = (i + 1) / Q.Rings;
            for (let j = 0; j < Q.Segments; j++) {
                const a0 = angle(j), a1 = angle(j + 1);
                K.triSmooth(at(t0, a0), at(t0, a1), at(t1, a1), normal(t0, a0), normal(t0, a1), normal(t1, a1), pot);
                K.triSmooth(at(t0, a0), at(t1, a1), at(t1, a0), normal(t0, a0), normal(t1, a1), normal(t1, a0), pot);
            }
        }
        const rimR   =  radius(1) - Q.WallM;
        const soilY  =  H - Q.SoilDropM;
        const ring   =  (r, y) => (a) => T.At([Math.cos(a) * r, y, Math.sin(a) * r]);
        const rimOut = ring(radius(1), H), rimIn = ring(rimR, H), wallFoot = ring(rimR, soilY), footRing = ring(radius(0), 0);
        const centre = T.At([0, soilY, 0]), base = T.At([0, 0, 0]);
        for (let j = 0; j < Q.Segments; j++) {
            const a0 = angle(j), a1 = angle(j + 1);
            K.quad(rimOut(a0), rimOut(a1), rimIn(a1), rimIn(a0), [0, 1, 0], pot);
            K.quad(rimIn(a0), rimIn(a1), wallFoot(a1), wallFoot(a0), T.Dir([-Math.cos(a0), 0, -Math.sin(a0)]), pot);
            K.tri(base, footRing(a0), footRing(a1), [0, -1, 0], pot);
            K.tri(centre, wallFoot(a1), wallFoot(a0), [0, 1, 0], soil);
        }

        const hand  =  { Hand: { Overdraw: P.Overdraw, Wobble: P.Wobble } };
        const own   =  (tag) => Object.assign({}, G, { Extras: Object.assign({}, G.Extras, { SeedKey: G.Extras.SeedKey + ':' + tag }) });
        PainterlyNPR__AssetLibrary__Organic(own('pot'), pot, 'Pot', Object.assign({
            Masses   :  [{ C: T.At([0, H / 2, 0]), R: R * T.Scale }],
            Gesture  :  gesture,
            Pot      :  { Foot: T.At([0, 0, 0]), Top: T.At([0, H, 0]), SoilId: soil.Id },
        }, hand));
        if (lipM > 0) {
            const t     =  1 - lipM / H;
            const band  =  [];
            for (let j = 0; j <= Q.Segments; j++) band.push(at(t, angle(j)));
            PainterlyNPR__AssetLibrary__Organic(own('rim'), pot, 'Sketch', Object.assign({ Sketch: [{ Line: band, Alpha: 0.7, Wobble: 0.3, TaperIn: 0.2, TaperOut: 0.2 }] }, hand));
        }
        return { SoilY: soilY, RimR: rimR, RadiusAt: (t) => radius(t) };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Standard
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | A Standard's Proportions and Its Planting - metres, for a pot 0.62 wide
    // ------------------------------------------------------------
    // Each plant: x, height above the rim (or from the ground where named), z, radius.
    // Laid out from the two close-ups, heavier on one side; a plop mirrors them by
    // its seed and scales them with its pot (W, its width over 0.62, in the code).
    const STANDARD  =  {
        LeanM            :  0.012,                                             // <-- How far the head may stand off the pot's centre: grown, not turned on a lathe
        StemTaper        :  0.8,                                               // <-- The stem's top radius over its foot's
        StemSegments     :  10,
        StemInto         :  0.97,                                              // <-- Stops this share of the ball's radius short of its middle
        HeadDetail       :  3,                                                 // <-- One smooth ball, so its own subdivisions: the outline is traced from it
        TwistFrom        :  0.1,                                               // <-- The corkscrew starts this far above the soil, under the leaves
        TwistSteps       :  24,                                                // <-- Points a turn
        TwistZig         :  0.6,
        Jitter           :  [0.03, 0.025, 0.02],                               // <-- A plant's own place: x, up, z
        MassSquash       :  [1, 0.85, 0.7],                                    // <-- Washes laid on the sheet, not round balls: flatter toward the eye
        OliveLump        :  0.3,                                               // <-- Lumpy and few-sided: an irregular shape, as a loaded brush leaves
        DarkLump         :  0.25,
        LilacLump        :  0.3,
        Olive            :  [[-0.20, 0.30, -0.12, 0.15], [-0.31, 0.22, -0.10, 0.11], [-0.09, 0.19, -0.14, 0.11], [-0.45, 0.08, -0.02, 0.09], [-0.33, 0.05, 0, 0.08], [0.16, 0.20, -0.10, 0.085], [0.24, 0.13, -0.08, 0.065], [0.47, 0.03, 0.02, 0.045]],   // <-- Overlapping, so their union is a wash and not a row of balls
        Dark             :  [[0.08, 0.08, 0.16, 0.05], [-0.12, 0.05, 0.18, 0.042], [0.24, 0.07, 0.12, 0.05]],
        DarkFoot         :  [[-0.38, 0.03, 0.14, 0.036], [-0.33, 0.015, 0.2, 0.024], [0.40, 0.03, 0.14, 0.028]],   // <-- Height from the ground: the little leaves at the pot's foot
        Lilac            :  [[-0.56, 0.36, 0, 0.05], [-0.50, 0.33, 0.02, 0.04], [-0.50, 0.13, 0.05, 0.05], [-0.44, 0.10, 0.06, 0.035], [-0.33, 0.0, 0.2, 0.035], [0.10, 0.46, -0.05, 0.04], [0.03, 0.42, -0.05, 0.03], [0.44, 0.24, 0.02, 0.055]],
        LilacStems       :  [2, 5, 7],                                         // <-- Those that stand on a stem of their own: the rest float, as a dab does
        Rings            :  [[-0.42, 0.31, 0.02, 0.022], [0.30, 0.38, 0, 0.024], [-0.31, -0.03, 0.16, 0.016], [0.46, 0.12, 0, 0.018]],
        Sweeps           :  [[[-0.52, -0.02, 0], [-0.40, 0.13, 0.02], [-0.24, 0.15, 0.04], [-0.07, 0.03, 0.08]],
                             [[0.12, 0.02, 0.1], [0.22, 0.14, 0.06], [0.31, 0.2, 0.02], [0.41, 0.15, 0]],
                             [[-0.08, 0.03, 0.12], [-0.18, 0.19, 0.08], [-0.30, 0.30, 0.02], [-0.40, 0.30, 0]],
                             [[0.2, 0, 0.12], [0.3, 0.07, 0.1], [0.37, 0, 0.08]]],   // <-- Long free arcs, out over the washes and back: never spokes from the stem
        TallShare        :  0.42,                                              // <-- This share of the strap leaves stand tall by the stem; the rest lean out and droop
        TallHeight       :  [0.30, 0.46],                                      // <-- Height from the soil
        TallReach        :  [0.02, 0.12],                                      // <-- How far out the tip lands
        LowHeight        :  [0.15, 0.30],
        LowReach         :  [0.12, 0.30],
        StrapBend        :  0.05,                                              // <-- How far a leaf bows sideways
        StrapWidth       :  [0.02, 0.04],                                      // <-- Half its width
        StrapFill        :  [0.4, 0.85],                                       // <-- Blunt to spindly: the scans' loops are not all one leaf
        StrapStart       :  [0.03, 0.19],                                      // <-- How far from the stem it starts: along the rim, not all from the stem's foot, or it reads as an artichoke
        StrapLift        :  0.3,                                               // <-- The share with paper left in them, so they read white through a wash
        StrapRun         :  [1, 4],                                            // <-- Leaves drawn in one stroke of the pen, the scans' run of V's
        LipLeaves        :  3,                                                 // <-- Short leaves falling over the rim
        LipLeafLength    :  [0.1, 0.16],
        LipLeafWidth     :  [0.016, 0.026],
    };
    // ------------------------------------------------------------


    // FUNCTION | A Ball Standard in a Red Bowl
    // ------------------------------------------------------------
    // The pair by an orangery's doors, in Adam's scans: the bowl and its soil, a
    // clear stem, a corkscrew round it, a ball clipped smooth with its tick, and
    // underplanting: broad olive washes behind, dark leaves low in front, lilac
    // on stems of their own, and over them strap leaves, stems, buds. The parts of
    // the pen each carry the asset's hand (Overdraw, Wobble), and each its own seed
    // key, so their marks never repeat.
    function PainterlyNPR__AssetLibrary__BowlStandard(G) {
        const { K, T, Rng: r, P }  =  G;
        const S      =  STANDARD;
        const hand   =  { Hand: { Overdraw: P.Overdraw, Wobble: P.Wobble } };
        const own    =  (tag) => Object.assign({}, G, { Extras: Object.assign({}, G.Extras, { SeedKey: G.Extras.SeedKey + ':' + tag }) });
        const pot    =  K.addObject(G.Name + ' - pot', 'Furniture', P.PotMaterial, 'Furniture');
        const soil   =  K.addObject(G.Name + ' - soil', 'Planting', P.TrunkMaterial, 'Planting');
        const stem   =  K.addObject(G.Name + ' - stem', 'Planting', P.TrunkMaterial, 'Planting');
        const head   =  K.addObject(G.Name + ' - head', 'Planting', P.CanopyMaterial, 'Planting');
        const { SoilY: soilY }  =  PainterlyNPR__AssetLibrary__BowlPlanter(G, pot, soil);

        // The stem and the ball
        const headR   =  P.HeadRadiusM;
        const rimY    =  P.PotHeightM;
        const centre  =  [r.Spread(S.LeanM), rimY + P.StemM + headR, r.Spread(S.LeanM)];
        const axis    =  V3Sub(centre, [0, soilY, 0]);
        K.cylinder({ Base: T.At([0, soilY, 0]), Axis: T.Dir(axis), R0: P.StemRadiusM * T.Scale, R1: P.StemRadiusM * S.StemTaper * T.Scale, Height: (V3Length(axis) - headR * S.StemInto) * T.Scale, Segments: S.StemSegments, Silhouette: K.S }, stem);   // <-- Stops inside the ball's foot: a line's depth test has slack enough to draw it on up through the ball if it ran to the middle
        K.icosphere(T.At(centre), headR * T.Scale, [1, 1, 1], S.HeadDetail, head, G.Lump(0), P.Lump, G.Turn);
        PainterlyNPR__AssetLibrary__Organic(own('head'), head, G.Recipe.Kind || 'ClippedBall', Object.assign({ Masses: [{ C: T.At(centre), R: headR * T.Scale }], TrunkId: stem.Id, Gesture: 'Ball', Tick: P.HeadTick > 0 }, hand));

        // The corkscrew: a helix round the stem, uneven as a hand goes round. A true
        // helix seen from the front is a sine, so its reach and its pitch wander
        const pen  =  [];
        if (P.TwistTurns > 0) {
            const foot    =  soilY + S.TwistFrom;
            const headY   =  centre[1] - headR;
            const phase   =  [0, 0, 0, 0, 0].map(() => r.Range(0, Math.PI * 2));
            const steps   =  Math.ceil(P.TwistTurns * S.TwistSteps);
            const coil    =  [];
            for (let i = 0; i <= steps; i++) {
                const t      =  i / steps;
                const up     =  t + 0.018 * Math.sin(t * 11 + phase[0]);
                const turn   =  phase[1] + Math.PI * 2 * P.TwistTurns * (t + 0.035 * Math.sin(t * 7.3 + phase[2]));
                const reach  =  P.TwistRadiusM * (1 + 0.28 * Math.sin(t * 9.1 + phase[3]) + 0.18 * Math.sin(t * 17.3 + phase[4])) * SmoothStep(0, 0.06, t) * (1 - 0.6 * SmoothStep(0.93, 1, t));
                const on     =  V3Lerp([0, soilY, 0], centre, (Lerp(foot, headY, up) - soilY) / axis[1]);
                const c      =  Math.cos(turn), s = Math.sin(turn);
                const zig    =  Lerp(c, Math.asin(c) * 2 / Math.PI, S.TwistZig), zag = Lerp(s, Math.asin(s) * 2 / Math.PI, S.TwistZig);   // <-- Part way to a zigzag: the hand turns sharper than a helix does at each side
                coil.push(T.At([on[0] + zig * reach, Lerp(foot, headY, up), on[2] + zag * reach]));
            }
            pen.push({ Line: coil, Alpha: 0.88, Wobble: 0.3, TaperIn: 0.4, TaperOut: 0.8 });
        }
        if (pen.length) PainterlyNPR__AssetLibrary__Organic(own('stem'), stem, 'Sketch', Object.assign({ Sketch: pen }, hand));
        const objects  =  [pot, soil, stem, head];
        if (!(P.UnderplantStraps > 0)) return objects;

        // The underplanting's washes: three materials of loose masses, no outline
        const W      =  P.PotWidthM / 0.62;                                    // <-- Its planting grows with its pot
        const flip   =  r.Chance(0.5) ? -1 : 1;
        const place  =  (x, y, z) => [flip * W * x, y, W * z];
        const plant  =  (row, fromY) => ({
            C: place(row[0] + r.Spread(S.Jitter[0]), fromY + W * (row[1] + r.Spread(S.Jitter[1])), row[2] + r.Spread(S.Jitter[2])),
            R: row[3] * W * r.Range(0.9, 1.1),
        });
        const wash  =  (name, material, rows, fromY, lump, first) => {
            const object  =  K.addObject(G.Name + ' - ' + name, 'Planting', material, 'Planting');
            const local   =  rows.map(row => plant(row, fromY));
            PainterlyNPR__AssetLibrary__Masses(Object.assign({}, G, { Lump: (i) => G.Lump(first + i) }), object, local, S.MassSquash, lump);
            return { Object: object, Local: local };
        };
        const olive  =  wash('underplanting', P.UnderplantMaterial, S.Olive, rimY, S.OliveLump, 1);
        const dark   =  wash('dark leaves', P.UnderplantDarkMaterial, S.Dark, rimY, S.DarkLump, 20);
        const low    =  wash('leaves at its foot', P.UnderplantDarkMaterial, S.DarkFoot, 0, S.DarkLump, 30);
        const lilac  =  wash('flowers', P.FlowerMaterial, S.Lilac, rimY, S.LilacLump, 40);

        // The pen over them: strap leaves fanning out of the soil, in runs of one
        // stroke; short leaves falling over the rim; stems out to the flowers and
        // buds, and a couple of free sweeps
        const sketch  =  [];
        const range   =  (pair) => r.Range(pair[0], pair[1]);
        const count   =  P.UnderplantStraps;
        const leaves  =  [];
        for (let b = 0; b < count; b++) leaves.push({ A: r.Range(0, Math.PI * 2), Tall: b < count * S.TallShare });
        leaves.sort((p, q) => p.A - q.A);                                      // <-- Neighbours round the pot, so a run of one stroke goes from leaf to leaf
        const straps  =  leaves.map((leaf) => {
            const out    =  [Math.cos(leaf.A), 0, Math.sin(leaf.A)];
            const across =  [-out[2], 0, out[0]];
            const start  =  V3Add([0, soilY, 0], V3Scale(out, range(S.StrapStart) * W));
            const up     =  range(leaf.Tall ? S.TallHeight : S.LowHeight) * W, reach = range(leaf.Tall ? S.TallReach : S.LowReach) * W;
            const bow    =  V3Scale(across, r.Spread(S.StrapBend) * W);
            const ctrl   =  V3Add(V3Add(start, bow), V3Add(V3Scale(out, reach * 0.35), [0, up * 0.75, 0]));
            const tip    =  V3Add(V3Add(start, V3Scale(bow, 0.6)), V3Add(V3Scale(out, reach), [0, up * (leaf.Tall ? r.Range(0.92, 1) : r.Range(0.7, 0.95)), 0]));
            return { Blade: [T.At(start), T.At(ctrl), T.At(tip)], WidthM: range(S.StrapWidth) * W * T.Scale, Fill: range(S.StrapFill), Lift: r.Chance(S.StrapLift) };
        });
        for (let i = 0; i < straps.length;) {
            const n  =  r.IntRange(S.StrapRun[0], S.StrapRun[1]);
            sketch.push({ Straps: straps.slice(i, i + n) });
            i  +=  n;
        }
        const rimR  =  P.PotWidthM / 2 * BOWL.RimShare;
        for (let b = 0; b < S.LipLeaves; b++) {
            const a      =  Math.PI * 0.5 + (b - 1) * 0.9 + r.Spread(0.25);        // <-- Toward the front, where they show
            const out    =  [Math.cos(a), 0, Math.sin(a)];
            const len    =  range(S.LipLeafLength) * W;
            const start  =  V3Add([0, rimY - 0.005, 0], V3Scale(out, rimR * 0.9));
            const ctrl   =  V3Add(start, V3Add(V3Scale(out, len * 0.5), [0, len * 0.4, 0]));
            const tip    =  V3Add(start, V3Add(V3Scale(out, len), [0, -len * 0.25, 0]));
            sketch.push({ Straps: [{ Blade: [T.At(start), T.At(ctrl), T.At(tip)], WidthM: range(S.LipLeafWidth) * W * T.Scale }] });
        }
        const stemTo  =  (target) => {
            const out    =  [target[0], 0, target[2]];
            const start  =  V3Add([0, soilY, 0], V3Scale(out, 0.15));
            const rise   =  target[1] - soilY;
            return [start, V3Add(start, V3Add(V3Scale(out, 0.25), [0, rise * 0.6, 0])), V3Add(V3Lerp(start, target, 0.72), [0, 0.07 * W, 0]), target].map(T.At);
        };
        for (const i of S.LilacStems) sketch.push({ Line: stemTo(lilac.Local[i].C), Alpha: 0.85, Wobble: 0.4, TaperIn: 0.3, TaperOut: 1 });
        for (const row of S.Rings) sketch.push({ Ring: T.At(place(row[0] + r.Spread(S.Jitter[0]), rimY + W * (row[1] + r.Spread(S.Jitter[1])), row[2])), RM: row[3] * W * T.Scale });
        for (const sweep of S.Sweeps) sketch.push({ Line: sweep.map(q => T.At(place(q[0] + r.Spread(0.02), rimY + W * (q[1] + r.Spread(0.02)), q[2]))), Alpha: 0.88, Wobble: 0.45, TaperIn: 0.3, TaperOut: 1.4 });
        for (const m of dark.Local.concat(low.Local)) {                        // <-- A dark leaf's own line, a little off its wash: the pen and the brush never quite agree
            const lie  =  r.Range(-0.5, 0.5);
            const dir  =  [Math.cos(lie), Math.sin(lie), 0];
            sketch.push({ Straps: [{ Blade: [T.At(V3Add(m.C, V3Scale(dir, -m.R * 1.2))), T.At(V3Add(m.C, [0, m.R * 0.2, 0.02])), T.At(V3Add(m.C, V3Scale(dir, m.R * 1.35)))], WidthM: m.R * 0.5 * T.Scale }], Alpha: 0.8 });
        }
        PainterlyNPR__AssetLibrary__Organic(own('planting'), olive.Object, 'Sketch', Object.assign({ Sketch: sketch }, hand));
        return objects.concat(olive.Object, dark.Object, low.Object, lilac.Object);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__AssetLibrary__BowlPlanter,
        PainterlyNPR__AssetLibrary__BowlStandard,
        PainterlyNPR__AssetLibrary__ProfileAt,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
