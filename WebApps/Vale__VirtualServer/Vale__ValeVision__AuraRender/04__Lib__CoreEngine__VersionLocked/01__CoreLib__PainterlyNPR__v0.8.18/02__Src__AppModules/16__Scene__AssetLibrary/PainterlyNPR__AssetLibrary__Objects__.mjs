/* =============================================================================
   PAINTERLYNPR - SCENE | ASSET LIBRARY - OBJECT GENERATORS
   =============================================================================

   FILE       : PainterlyNPR__AssetLibrary__Objects__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - AssetLibrary - Objects
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The generators that build a library object drawn by its edges: a
                terracotta planter of grass, a timber garden bench, a panel of
                picket fence and a potted standard in its square lead planter -
                and the turned box they are made of
   CREATED    : 30-Oct-2026 (v0.6.0)

   DESCRIPTION:
   - Each is the cottage garden's own object (10__Import__ScenePackage: the
     planters, the bench by the pond, the front fence), made a function of its
     parameters and a placement, in its own space (metres, +Y up, base centre at
     the origin, front to +Z).
   - The potted standard (v0.8.12) is new to the library, not the cottage's: a
     planter drawn by its edges with planting drawn by the grammars, as the
     terracotta planter is.
   - The builder's box() is square to the world axes; a placed object turns, so
     its boxes are built here from their eight turned corners, with the same
     twelve creases by class.
   - Edges are authored as the cottage authors them: a triangulation line is
     never a pen line, and smooth sides give only their silhouettes.

   ============================================================================= */

import {
    PainterlyNPR__Maths__V3Add        as  V3Add,
    PainterlyNPR__Maths__V3Length     as  V3Length,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Scale      as  V3Scale,
    PainterlyNPR__Maths__V3Sub        as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__AssetLibrary__Grass,
    PainterlyNPR__AssetLibrary__Masses,
    PainterlyNPR__AssetLibrary__Organic,
} from './PainterlyNPR__AssetLibrary__Planting__.mjs';

// =============================================================================
// REGION | Asset Library - Object Generators
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | A Turned Box
// -----------------------------------------------------------------------------

    // FUNCTION | A Box in the Asset's Own Space, Turned and Placed, With Its Creases
    // ------------------------------------------------------------
    // min and max are local corners; classes as the builder's box(): Top, Bottom
    // and Vertical edge classes, or null for none.
    function PainterlyNPR__AssetLibrary__Box(G, min, max, object, classes) {
        const { K, T }  =  G;
        const c  =  (i, j, k) => T.At([i ? max[0] : min[0], j ? max[1] : min[1], k ? max[2] : min[2]]);
        K.quad(c(0, 0, 0), c(0, 0, 1), c(0, 1, 1), c(0, 1, 0), T.Dir([-1, 0, 0]), object);
        K.quad(c(1, 0, 0), c(1, 1, 0), c(1, 1, 1), c(1, 0, 1), T.Dir([ 1, 0, 0]), object);
        K.quad(c(0, 0, 0), c(1, 0, 0), c(1, 0, 1), c(0, 0, 1), [0, -1, 0], object);
        K.quad(c(0, 1, 0), c(0, 1, 1), c(1, 1, 1), c(1, 1, 0), [0,  1, 0], object);
        K.quad(c(0, 0, 0), c(0, 1, 0), c(1, 1, 0), c(1, 0, 0), T.Dir([0, 0, -1]), object);
        K.quad(c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1), T.Dir([0, 0,  1]), object);
        if (!classes) return;
        const ring  =  [[0, 0], [1, 0], [1, 1], [0, 1]];
        for (let r = 0; r < 4; r++) {
            const [i0, k0]  =  ring[r];
            const [i1, k1]  =  ring[(r + 1) % 4];
            if (classes.Bottom   != null) K.addEdge(object, c(i0, 0, k0), c(i1, 0, k1), classes.Bottom);
            if (classes.Top      != null) K.addEdge(object, c(i0, 1, k0), c(i1, 1, k1), classes.Top);
            if (classes.Vertical != null) K.addEdge(object, c(i0, 0, k0), c(i0, 1, k0), classes.Vertical);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Furniture
// -----------------------------------------------------------------------------

    // FUNCTION | A Terracotta Planter of Grass - the pair either side of the step
    // ------------------------------------------------------------
    // A flared pot, its rim and foot drawn, a band of authored line below the rim,
    // and the grass standing in it.
    function PainterlyNPR__AssetLibrary__Planter(G) {
        const { K, T, P }  =  G;
        const pot   =  K.addObject(G.Name + ' - pot', 'Furniture', P.PotMaterial, G.Recipe.Role || 'Furniture');
        const ring  =  K.cylinder({ Base: T.At([0, 0, 0]), Axis: T.Dir([0, 1, 0]), R0: P.BaseRadiusM * T.Scale, R1: P.RimRadiusM * T.Scale, Height: P.HeightM * T.Scale, Segments: P.Segments, RimTop: K.S, RimBottom: K.T, Silhouette: K.S, CapTop: true, CapBottom: false }, pot);
        const band  =  ring.Ring(P.HeightM * 0.867 * T.Scale, (P.BaseRadiusM + (P.RimRadiusM - P.BaseRadiusM) * 0.85) * T.Scale);
        for (let k = 0; k < P.Segments; k++) K.addEdge(pot, band((k / P.Segments) * Math.PI * 2), band(((k + 1) / P.Segments) * Math.PI * 2), K.T, 'Authored');
        const grassP  =  Object.assign({}, G.Defaults('Grass'), { Blades: P.Blades, GrassMaterial: P.GrassMaterial });
        const grass   =  PainterlyNPR__AssetLibrary__Grass(Object.assign({}, G, { P: grassP, GrassName: G.Name + ' - grass' }), P.HeightM);
        return [pot, ...grass];
    }
    // ------------------------------------------------------------


    // FUNCTION | A Timber Garden Bench - the bench by the pond, its front to +z
    // ------------------------------------------------------------
    function PainterlyNPR__AssetLibrary__Bench(G) {
        const { K, P }  =  G;
        const bench  =  K.addObject(G.Name, 'Furniture', G.Recipe.Material, G.Recipe.Role || 'Furniture');
        const half   =  P.LengthM / 2;
        const back   =  -(P.SeatDepthM + 0.04) / 2;                            // <-- The back's rear face: the seat starts 40 mm in front of it, and the bench is centred on its depth
        const front  =  back + 0.04 + P.SeatDepthM;
        const C      =  { Top: K.T, Bottom: K.T, Vertical: K.T };
        PainterlyNPR__AssetLibrary__Box(G, [-half, P.SeatHeightM - 0.05, back + 0.04], [half, P.SeatHeightM, front], bench, { Top: K.S, Bottom: K.T, Vertical: K.T });
        PainterlyNPR__AssetLibrary__Box(G, [-half, P.SeatHeightM + 0.07, back], [half, P.BackHeightM, back + 0.05], bench, C);
        for (const x of [-half + 0.03, half - 0.08]) {
            PainterlyNPR__AssetLibrary__Box(G, [x, 0, front - 0.08], [x + 0.06, P.SeatHeightM - 0.05, front - 0.02], bench, C);
            PainterlyNPR__AssetLibrary__Box(G, [x, 0, back], [x + 0.06, P.BackHeightM, back + 0.06], bench, C);
        }
        return [bench];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Potted Plants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | A Square Lead Planter's Proportions
    // ------------------------------------------------------------
    // The generator's parameters size the box; these shape it (metres, or a
    // share of the planter's width).
    const SQUARE_PLANTER  =  {
        PlinthM          :  0.035,                                             // <-- The base the box stands on: its top edge is a shadow line at the ground
        PlinthOutM       :  0.012,                                             // <-- How far the plinth stands proud of the body
        LipM             :  0.045,                                             // <-- The rim moulding's depth
        LipOutM          :  0.016,                                             // <-- How far the lip overhangs the body: its shadow reads the box as cast lead, not a crate
        WallM            :  0.025,                                             // <-- The lip's inner edge from the body's face: the soil sits inside it
        SoilDropM        :  0.03,                                              // <-- The soil's level below the rim
        PanelInset       :  0.15,                                              // <-- A panel's margin, over the smaller of the face's width and height
        PanelReliefM     :  0.006,                                             // <-- How far a panel stands off its face: enough for its outline, never a ledge
        PanelBeadM       :  0.014,                                             // <-- The bead inside the panel's edge: the panel drawn as two nested squares, as the hand draws a cast panel
        RosetteShare     :  0.36,                                              // <-- The rosette's radius over the panel's smaller half-side
        RosetteSegments  :  16,
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | A Potted Standard's Proportions
    // ------------------------------------------------------------
    const STANDARD  =  {
        LeanM              :  0.02,                                            // <-- How far the head may stand off the planter's centre: grown, not turned on a lathe
        StemTaper          :  0.75,                                            // <-- The stem's top radius over its foot's
        StemSegments       :  10,
        HeadCore           :  0.9,                                             // <-- The core mass's radius over the head's: the others round it out to the full ball
        HeadReach          :  0.42,                                            // <-- How far the outer masses sit from the head's centre, over its radius
        HeadOuter          :  [0.5, 0.58],                                     // <-- An outer mass's radius over the head's: reach plus this is the ball, a touch uneven as clipped by hand
        TuftCrown          :  [0.12, 0.04],                                    // <-- The tuft's low crown for the wash: its radius over the planter's width, its height in metres. Small: a wider one buried the leaf strokes in dark wash
        TuftLump           :  0.12,
        TuftLumps          :  100,                                             // <-- The crown's lumps are numbered after the head's masses, so it never shares one's shape
        LeafLength         :  [0.55, 0.85],                                    // <-- A strap leaf's length over the planter's width: long enough that about half pass the lip
        LeafRise           :  [0.3, 0.6],                                      // <-- How high it arches, over its length
        LeafReach          :  [0.7, 1.0],                                      // <-- How far out its tip lands, over its length
        LeafDroop          :  [1.0, 2.2],                                      // <-- Past the lip a leaf hangs: its drop over how far it passes the lip's inner edge
    };
    // ------------------------------------------------------------


    // FUNCTION | A Square Lead Planter - a Versailles box with a panel on each face
    // ------------------------------------------------------------
    // A plinth, the body, a lip round the soil and a raised panel on each of the
    // four faces, a bead inside its edge and a rosette at its middle. The lip's
    // and the panels' outlines are authored (the lip's four pieces meet without a
    // line); the bead and the rosette are lines on the panel, of its class.
    // Returns the soil's level and the lip's inner half-width.
    function PainterlyNPR__AssetLibrary__SquarePlanter(G, pot, soil) {
        const { K, T, P }  =  G;
        const Q       =  SQUARE_PLANTER;
        const w       =  P.PlanterWidthM / 2, h = P.PlanterHeightM;
        const lipY    =  h - Q.LipM;
        const wo      =  w + Q.LipOutM, wi = w - Q.WallM, wp = w + Q.PlinthOutM;
        PainterlyNPR__AssetLibrary__Box(G, [-wp, 0, -wp], [wp, Q.PlinthM, wp], pot, { Top: K.T, Bottom: K.T, Vertical: K.S });
        PainterlyNPR__AssetLibrary__Box(G, [-w, Q.PlinthM, -w], [w, lipY, w], pot, { Top: null, Bottom: null, Vertical: K.S });
        for (const [min, max] of [[[-wo, lipY, wi], [wo, h, wo]], [[-wo, lipY, -wo], [wo, h, -wi]], [[-wo, lipY, -wi], [-wi, h, wi]], [[wi, lipY, -wi], [wo, h, wi]]]) {
            PainterlyNPR__AssetLibrary__Box(G, min, max, pot, null);
        }
        const square  =  (half, y) => [[-half, y, -half], [half, y, -half], [half, y, half], [-half, y, half]].map(T.At);
        const loop    =  (points, lineClass) => points.forEach((p, k) => K.addEdge(pot, p, points[(k + 1) % points.length], lineClass));
        const lipTop  =  square(wo, h), lipFoot = square(wo, lipY);
        loop(lipTop, K.S);
        loop(lipFoot, K.T);
        loop(square(wi, h), K.T);
        lipFoot.forEach((p, k) => K.addEdge(pot, p, lipTop[k], K.S));
        const soilY   =  h - Q.SoilDropM;
        K.quad(...square(wi, soilY), [0, 1, 0], soil);

        const margin  =  Math.min(P.PlanterWidthM, lipY - Q.PlinthM) * Q.PanelInset;
        const a       =  w - margin, y0 = Q.PlinthM + margin, y1 = lipY - margin;
        const cy      =  (y0 + y1) / 2, rr = Math.min(a, (y1 - y0) / 2) * Q.RosetteShare;
        for (const [n, u] of [[[0, 0, 1], [1, 0, 0]], [[1, 0, 0], [0, 0, -1]], [[0, 0, -1], [-1, 0, 0]], [[-1, 0, 0], [0, 0, 1]]]) {
            const at       =  (s, y, out) => T.At([n[0] * (w + out) + u[0] * s, y, n[2] * (w + out) + u[2] * s]);
            const corners  =  (out) => [at(-a, y0, out), at(a, y0, out), at(a, y1, out), at(-a, y1, out)];
            const back     =  corners(0), front = corners(Q.PanelReliefM);
            const sides    =  [[0, -1, 0], T.Dir(u), [0, 1, 0], T.Dir(V3Scale(u, -1))];
            K.quad(...front, T.Dir(n), pot);
            for (let k = 0; k < 4; k++) K.quad(back[k], back[(k + 1) % 4], front[(k + 1) % 4], front[k], sides[k], pot);
            loop(front, K.T);
            const b  =  Q.PanelBeadM, lift = Q.PanelReliefM + 0.001;
            loop([at(-a + b, y0 + b, lift), at(a - b, y0 + b, lift), at(a - b, y1 - b, lift), at(-a + b, y1 - b, lift)], K.T);
            if (!P.Rosette) continue;
            const ring  =  [];
            for (let k = 0; k <= Q.RosetteSegments; k++) {
                const t  =  (k / Q.RosetteSegments) * Math.PI * 2;
                ring.push(at(Math.cos(t) * rr, cy + Math.sin(t) * rr, lift));
            }
            K.addPolyEdge(pot, ring, K.T);
        }
        return { SoilY: soilY, InnerHalf: wi };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Potted Standard - a clipped ball on a clear stem, in a square planter
    // ------------------------------------------------------------
    // The pair either side of an orangery's doors: the lead planter and its soil,
    // a stem leaning a touch (by its own seed), a head of tight masses for the
    // clipped grammar, and a tuft of strap leaves at the stem's foot - pen strokes
    // arching out of a low crown, those that pass the lip hanging over it, as the
    // hand draws them; UnderplantLeaves 0 leaves the soil bare. The tuft is an
    // organic of its own with its own seed key, so its marks never repeat the
    // head's. Both carry the asset's hand (Overdraw, Wobble): how its pen sketches
    // over them, on top of whatever the field asks where each stroke falls.
    function PainterlyNPR__AssetLibrary__PottedStandard(G) {
        const { K, T, Rng: r, P }  =  G;
        const S      =  STANDARD;
        const hand   =  { Hand: { Overdraw: P.Overdraw, Wobble: P.Wobble } };
        const pot    =  K.addObject(G.Name + ' - planter', 'Furniture', P.PotMaterial, 'Furniture');
        const soil   =  K.addObject(G.Name + ' - soil', 'Planting', P.TrunkMaterial, 'Planting');
        const stem   =  K.addObject(G.Name + ' - stem', 'Planting', P.TrunkMaterial, 'Planting');
        const head   =  K.addObject(G.Name + ' - head', 'Planting', P.CanopyMaterial, 'Planting');
        const { SoilY: soilY, InnerHalf: wi }  =  PainterlyNPR__AssetLibrary__SquarePlanter(G, pot, soil);

        const headR   =  P.HeadRadiusM;
        const centre  =  [r.Spread(S.LeanM), P.PlanterHeightM + P.StemM + headR, r.Spread(S.LeanM)];
        const axis    =  V3Sub(centre, [0, soilY, 0]);
        K.cylinder({ Base: T.At([0, soilY, 0]), Axis: T.Dir(axis), R0: P.StemRadiusM * T.Scale, R1: P.StemRadiusM * S.StemTaper * T.Scale, Height: V3Length(axis) * T.Scale, Segments: S.StemSegments, Silhouette: K.S }, stem);

        const masses  =  [{ C: centre, R: headR * S.HeadCore }];
        const outer   =  Math.max(0, P.HeadMasses - 1);
        for (let i = 0; i < outer; i++) {
            const y     =  1 - 2 * (i + 0.5) / outer;                            // <-- Spread evenly over the ball (a Fibonacci sphere), each nudged by the seed
            const ring  =  Math.sqrt(1 - y * y), a = i * 2.39996 + r.Spread(0.4);
            const d     =  V3Normalise([Math.cos(a) * ring + r.Spread(0.15), y + r.Spread(0.15), Math.sin(a) * ring + r.Spread(0.15)]);
            masses.push({ C: V3Add(centre, V3Scale(d, headR * S.HeadReach)), R: headR * r.Range(S.HeadOuter[0], S.HeadOuter[1]) });
        }
        const world  =  PainterlyNPR__AssetLibrary__Masses(G, head, masses, null, P.Lump);
        PainterlyNPR__AssetLibrary__Organic(G, head, G.Recipe.Kind || 'Topiary', Object.assign({ Masses: world, TrunkId: stem.Id }, hand));
        const objects  =  [pot, soil, stem, head];
        if (!(P.UnderplantLeaves > 0)) return objects;

        const under   =  K.addObject(G.Name + ' - underplanting', 'Planting', P.UnderplantMaterial, 'Planting');
        const crownW  =  P.PlanterWidthM * S.TuftCrown[0];
        K.icosphere(T.At([0, soilY + S.TuftCrown[1] * 0.4, 0]), T.Scale, [crownW, S.TuftCrown[1], crownW], 1, under, G.Lump(S.TuftLumps), S.TuftLump);
        const blades  =  [];
        for (let b = 0; b < P.UnderplantLeaves; b++) {
            const a      =  (b / P.UnderplantLeaves) * Math.PI * 2 + r.Spread(0.4);
            const out    =  [Math.cos(a), 0, Math.sin(a)];
            const start  =  V3Add([0, soilY, 0], V3Scale(out, r.Range(0.01, 0.05)));
            const len    =  P.PlanterWidthM * r.Range(S.LeafLength[0], S.LeafLength[1]);
            const rise   =  len * r.Range(S.LeafRise[0], S.LeafRise[1]);
            const reach  =  len * r.Range(S.LeafReach[0], S.LeafReach[1]);
            const past   =  Math.max(0, reach - wi);                               // <-- How far beyond the lip's inner edge the tip lands: only those leaves hang over it
            const ctrl   =  V3Add(start, V3Add(V3Scale(out, reach * 0.45), [0, rise, 0]));
            const tip    =  V3Add(start, V3Add(V3Scale(out, reach), [0, rise * 0.3 - past * r.Range(S.LeafDroop[0], S.LeafDroop[1]), 0]));
            blades.push([T.At(start), T.At(ctrl), T.At(tip)]);
        }
        const own    =  Object.assign({}, G, { Extras: Object.assign({}, G.Extras, { SeedKey: G.Extras.SeedKey + ':underplanting' }) });
        PainterlyNPR__AssetLibrary__Organic(own, under, 'Grass', Object.assign({ Blades: blades }, hand));
        objects.push(under);
        return objects;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Boundaries
// -----------------------------------------------------------------------------

    // FUNCTION | A Panel of Picket Fence - the front fence's, by the length
    // ------------------------------------------------------------
    // Two posts with their caps, two rails behind, and pointed pickets in front
    // (their outline authored: sides and points, never the foot), as the front
    // fence is built; its run along x, its face to +z.
    function PainterlyNPR__AssetLibrary__PicketFence(G) {
        const { K, T, P }  =  G;
        const fence    =  K.addObject(G.Name, 'Boundary', G.Recipe.Material, G.Recipe.Role || 'Context');
        const half     =  P.LengthM / 2;
        const pickets  =  [[0, 0.04], [0.065, 0.04], [0.065, 0.86], [0.0325, 0.94], [0, 0.86]];
        for (const y of [0.24, 0.7]) PainterlyNPR__AssetLibrary__Box(G, [-half, y, -0.05], [half, y + 0.06, -0.01], fence, { Top: K.O, Bottom: null, Vertical: null });
        for (const x of [-half, half]) {
            PainterlyNPR__AssetLibrary__Box(G, [x - 0.06, 0, -0.07], [x + 0.06, P.PostHeightM, 0.05], fence, { Top: K.S, Bottom: null, Vertical: K.S });
            PainterlyNPR__AssetLibrary__Box(G, [x - 0.08, P.PostHeightM, -0.09], [x + 0.08, P.PostHeightM + 0.06, 0.07], fence, { Top: K.T, Bottom: K.T, Vertical: null });
        }
        const U  =  T.Dir([T.Scale, 0, 0]), V = [0, T.Scale, 0], N = T.Dir([0, 0, 1]);
        for (let x = -half + 0.12; x < half - 0.12 - 0.065; x += P.PicketSpacingM) {
            K.polygonPrism({ Origin: T.At([x, 0, 0.022]), U: U, V: V, N: N, Points: pickets, Thickness: 0.022 * T.Scale, EdgeClasses: [null, K.O, K.T, K.T, K.O] }, fence);
        }
        return [fence];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__AssetLibrary__Bench,
        PainterlyNPR__AssetLibrary__Box,
        PainterlyNPR__AssetLibrary__PicketFence,
        PainterlyNPR__AssetLibrary__Planter,
        PainterlyNPR__AssetLibrary__PottedStandard,
        PainterlyNPR__AssetLibrary__SquarePlanter,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
