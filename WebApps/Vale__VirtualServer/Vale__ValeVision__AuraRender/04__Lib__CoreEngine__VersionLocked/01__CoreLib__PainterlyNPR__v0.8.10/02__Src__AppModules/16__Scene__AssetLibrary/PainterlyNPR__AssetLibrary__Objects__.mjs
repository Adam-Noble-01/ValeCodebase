/* =============================================================================
   PAINTERLYNPR - SCENE | ASSET LIBRARY - OBJECT GENERATORS
   =============================================================================

   FILE       : PainterlyNPR__AssetLibrary__Objects__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - AssetLibrary - Objects
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The generators that build a library object drawn by its edges: a
                terracotta planter of grass, a timber garden bench and a panel of
                picket fence - and the turned box they are made of
   CREATED    : 30-Oct-2026 (v0.6.0)

   DESCRIPTION:
   - Each is the cottage garden's own object (10__Import__ScenePackage: the
     planters, the bench by the pond, the front fence), made a function of its
     parameters and a placement, in its own space (metres, +Y up, base centre at
     the origin, front to +Z).
   - The builder's box() is square to the world axes; a placed object turns, so
     its boxes are built here from their eight turned corners, with the same
     twelve creases by class.
   - Edges are authored as the cottage authors them: a triangulation line is
     never a pen line, and smooth sides give only their silhouettes.

   ============================================================================= */

import { PainterlyNPR__AssetLibrary__Grass } from './PainterlyNPR__AssetLibrary__Planting__.mjs';

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
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
