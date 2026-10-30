/* =============================================================================
   PAINTERLYNPR - SCENE | ASSET LIBRARY - PLANTING GENERATORS
   =============================================================================

   FILE       : PainterlyNPR__AssetLibrary__Planting__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - AssetLibrary - Planting
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The generators that build a library plant into a scene package:
                trees, conifers, mounds (shrubs and border plants), spires,
                hedges, clipped cones, grasses and reeds
   CREATED    : 30-Oct-2026 (v0.6.0)

   DESCRIPTION:
   - Each is the cottage garden's own way of making that plant
     (10__Import__ScenePackage: tree, plant, mound, spire, hedge, the planters'
     grass, the pond's reeds), made a function of its parameters, its own seed
     and a placement: built in its own space - metres, +Y up, its base centre at
     the origin, its front to +Z - and carried into the world by the placement's
     turn about +Y, its scale and its position.
   - Plants are masses with a kind, never mesh edges (manifest section 07): the
     organic grammars draw them. Each organic carries SeedKey, the plop's own
     identity, so its strokes keep their hand when another plop is removed.
   - A generator takes G: the builder (K), the placement's transform (T), its
     seeded random (Rng), the merged parameters (P), the recipe, the objects'
     name, the organic's extras, and Lump(i) - a mass's own lumps.

   ============================================================================= */

import {
    PainterlyNPR__Maths__Lerp         as  Lerp,
    PainterlyNPR__Maths__V3Add        as  V3Add,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Scale      as  V3Scale,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';

// =============================================================================
// REGION | Asset Library - Planting Generators
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shared
// -----------------------------------------------------------------------------

    // FUNCTION | Masses Into the World, Their Lumpy Spheres, and the Organic Record
    // ------------------------------------------------------------
    // Local masses (C, R) carried by the placement; one icosphere each, two
    // subdivisions but for a small one, as the cottage's plant() makes them.
    function PainterlyNPR__AssetLibrary__Masses(G, object, local, scale, lump) {
        const world  =  local.map(m => ({ C: G.T.At(m.C), R: m.R * G.T.Scale }));
        world.forEach((m, i) => G.K.icosphere(m.C, m.R, scale || [1, 1, 1], m.R < 0.3 ? 1 : 2, object, G.Lump(i), lump));
        return world;
    }

    function PainterlyNPR__AssetLibrary__Organic(G, object, kind, fields) {
        const record  =  Object.assign({ ObjectId: object.Id, Kind: kind }, fields, G.Extras);
        G.K.pkg.Organics.push(record);
        return record;
    }

    // The cottage's plant(): one object of masses, an organic of its kind
    function PainterlyNPR__AssetLibrary__Plant(G, local, scale) {
        const object  =  G.K.addObject(G.Name, 'Planting', G.Recipe.Material, G.Recipe.Role || 'Planting');
        const world   =  PainterlyNPR__AssetLibrary__Masses(G, object, local, scale, G.P.Lump);
        PainterlyNPR__AssetLibrary__Organic(G, object, G.Recipe.Kind, { Masses: world });
        return [object];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Trees
// -----------------------------------------------------------------------------

    // FUNCTION | A Broadleaf Tree - the cottage's tree(), by parameters
    // ------------------------------------------------------------
    // A trunk leaning a little, a crown of masses round its top (or a dome wider
    // than tall, as the apple's), and six branches the grammar draws partly
    // through the canopy.
    function PainterlyNPR__AssetLibrary__Tree(G) {
        const { K, T, Rng: r, P }  =  G;
        const role    =  G.Recipe.Role || 'Planting';
        const canopy  =  K.addObject(G.Name + ' - canopy', 'Planting', P.CanopyMaterial, role);
        const trunk   =  K.addObject(G.Name + ' - trunk', 'Planting', P.TrunkMaterial, role);
        const trunkH  =  P.TrunkHeightM, crownR = P.CrownRadiusM, count = P.Masses;
        const lean    =  V3Normalise([r.Spread(P.Lean), 1, r.Spread(P.Lean * 0.7)]);
        const crown   =  V3Scale(lean, trunkH);
        K.cylinder({ Base: T.At([0, 0, 0]), Axis: T.Dir(lean), R0: (0.1 + trunkH * 0.035) * T.Scale, R1: (0.07 + trunkH * 0.015) * T.Scale, Height: (trunkH + crownR * 0.35) * T.Scale, Segments: 14, Silhouette: K.S, RimBottom: K.T }, trunk);
        const masses  =  [];
        if (P.Dome) {
            masses.push({ C: [crown[0], crown[1] + crownR * 0.72, crown[2]], R: crownR * 0.6 });
            for (let i = 1; i < count; i++) {
                const a      =  (i / (count - 1)) * Math.PI * 2 + r.Spread(0.3);
                const el     =  r.Range(0.05, 0.75) * Math.PI * 0.45;
                const reach  =  crownR * 0.8 * Math.cos(el);
                masses.push({ C: [crown[0] + Math.cos(a) * reach, crown[1] + crownR * (0.42 + 0.62 * Math.sin(el)), crown[2] + Math.sin(a) * reach * 0.9], R: crownR * r.Range(0.34, 0.46) * (1 - 0.2 * Math.sin(el)) });
            }
        } else {
            for (let i = 0; i < count; i++) {
                const a  =  r.Range(0, Math.PI * 2), d = Math.sqrt(r.Next()) * crownR * 0.75;
                masses.push({ C: [crown[0] + Math.cos(a) * d, crown[1] + crownR * 0.7 + r.Spread(crownR * 0.45) + (crownR * 0.75 - d) * 0.3, crown[2] + Math.sin(a) * d * 0.85], R: r.Range(0.38, 0.62) * crownR });
            }
        }
        const world  =  PainterlyNPR__AssetLibrary__Masses(G, canopy, masses, null, 0.1);
        const branches  =  [];
        for (let i = 0; i < P.Branches; i++) {
            const a    =  (i / P.Branches) * Math.PI * 2 + r.Spread(0.4);
            const mid  =  V3Add(crown, [Math.cos(a) * crownR * 0.3, crownR * 0.35 + r.Spread(0.1), Math.sin(a) * crownR * 0.25]);
            const end  =  V3Add(mid, [Math.cos(a) * r.Range(0.3, 0.6) * crownR, r.Range(0.2, 0.5) * crownR, Math.sin(a) * crownR * 0.3]);
            branches.push([T.At(V3Add(crown, [0, -0.25, 0])), T.At(mid), T.At(end)]);
        }
        PainterlyNPR__AssetLibrary__Organic(G, canopy, 'Tree', { Masses: world, Branches: branches, TrunkId: trunk.Id, Dome: !!P.Dome });
        return [canopy, trunk];
    }
    // ------------------------------------------------------------


    // FUNCTION | A Conifer - the yew: a short trunk and a stack narrowing upward
    // ------------------------------------------------------------
    function PainterlyNPR__AssetLibrary__Conifer(G) {
        const { K, T, Rng: r, P }  =  G;
        const role    =  G.Recipe.Role || 'Planting';
        const canopy  =  K.addObject(G.Name + ' - canopy', 'Planting', P.CanopyMaterial, role);
        const trunk   =  K.addObject(G.Name + ' - trunk', 'Planting', P.TrunkMaterial, role);
        K.cylinder({ Base: T.At([0, 0, 0]), Axis: T.Dir([0, 1, 0]), R0: P.TrunkRadiusM * T.Scale, R1: P.TrunkRadiusM * 0.73 * T.Scale, Height: P.TrunkHeightM * T.Scale, Segments: 12, Silhouette: K.S, RimBottom: K.T }, trunk);
        const phase   =  r.Range(0, Math.PI * 2);                              // <-- The yew's own sway, so no two plops stack alike
        const masses  =  [];
        for (let i = 0; i < P.Masses; i++) {
            const t  =  i / (P.Masses - 1);
            masses.push({ C: [Math.sin(i * 2.1 + phase) * 0.12, P.TrunkHeightM + t * P.CanopyHeightM, Math.cos(i * 1.7 + phase) * 0.12], R: Lerp(P.BaseRadiusM, P.TopRadiusM, t) });
        }
        const world  =  PainterlyNPR__AssetLibrary__Masses(G, canopy, masses, [1, P.Stretch, 1], 0.08);
        PainterlyNPR__AssetLibrary__Organic(G, canopy, 'Conifer', { Masses: world, TrunkId: trunk.Id });
        return [canopy, trunk];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shrubs, Border Plants and Hedges
// -----------------------------------------------------------------------------

    // FUNCTION | A Mound - the cottage's mound(): one crowning mass and a domed ring
    // ------------------------------------------------------------
    function PainterlyNPR__AssetLibrary__Mound(G) {
        const { Rng: r, P }  =  G;
        const width = P.WidthM, height = P.HeightM;
        const masses  =  [{ C: [0, height - width * 0.3, 0], R: width * 0.3 }];
        for (let i = 1; i < P.Masses; i++) {
            const angle   =  r.Range(0, Math.PI * 2);
            const reach   =  Math.sqrt(r.Next()) * width * 0.32;
            const radius  =  r.Range(0.24, 0.36) * width;
            const dome    =  Math.max(0, 1 - Math.pow(reach / (width * 0.5), 2));
            const y       =  Math.max(radius * 0.6, (height - radius) * dome * r.Range(0.65, 1.0));
            masses.push({ C: [Math.cos(angle) * reach, y, Math.sin(angle) * reach], R: radius });
        }
        return PainterlyNPR__AssetLibrary__Plant(G, masses);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Spire - the cottage's spire(): a hollyhock's or a foxglove's stack
    // ------------------------------------------------------------
    function PainterlyNPR__AssetLibrary__Spire(G) {
        const { Rng: r, P }  =  G;
        const height  =  P.HeightM;
        const lean    =  [r.Spread(P.Lean), 0, r.Spread(P.Lean * 0.6)];
        const n       =  Math.round(height / 0.2);
        const masses  =  [];
        for (let i = 0; i < n; i++) {
            const t  =  i / (n - 1);
            masses.push({ C: [lean[0] * t * height + r.Spread(0.04), 0.25 + t * (height - 0.3), lean[2] * t * height + r.Spread(0.04)], R: Lerp(0.2, 0.09, t) });
        }
        return PainterlyNPR__AssetLibrary__Plant(G, masses);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Hedge - the cottage's hedge(): masses in a run along x, its face to +z
    // ------------------------------------------------------------
    function PainterlyNPR__AssetLibrary__Hedge(G) {
        const { Rng: r, P }  =  G;
        const half    =  P.LengthM / 2;
        const masses  =  [];
        for (let x = -half + P.SpacingM / 2; x <= half - P.SpacingM / 2 + 1e-6; x += P.SpacingM) {
            masses.push({ C: [x + r.Spread(0.1), P.CentreHeightM + r.Spread(0.12), r.Spread(0.1)], R: r.Range(P.MinRadiusM, P.MaxRadiusM) });
        }
        return PainterlyNPR__AssetLibrary__Plant(G, masses);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Clipped Cone - topiary, broad at the foot and pointed
    // ------------------------------------------------------------
    function PainterlyNPR__AssetLibrary__Topiary(G) {
        const { Rng: r, P }  =  G;
        const masses  =  [];
        const foot    =  P.BaseRadiusM * 0.85, top = P.HeightM - P.TopRadiusM;
        for (let i = 0; i < P.Masses; i++) {
            const t  =  i / (P.Masses - 1);
            masses.push({ C: [r.Spread(0.015), Lerp(foot, top, t), r.Spread(0.015)], R: Lerp(P.BaseRadiusM, P.TopRadiusM, Math.pow(t, 0.9)) });
        }
        return PainterlyNPR__AssetLibrary__Plant(G, masses);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Grasses
// -----------------------------------------------------------------------------

    // FUNCTION | An Ornamental Grass - the planters' grass, standing on the ground
    // ------------------------------------------------------------
    // A low crown for the wash and the truth buffers, and blades of three
    // control points (start, bend, tip) that the grammar draws as tapering
    // strokes, leaning out and with the wind. crownY lifts it (a planter's rim).
    function PainterlyNPR__AssetLibrary__Grass(G, crownY) {
        const { K, T, Rng: r, P }  =  G;
        const y0      =  crownY || 0;
        const object  =  K.addObject(G.GrassName || G.Name, 'Planting', P.GrassMaterial || G.Recipe.Material, 'Planting');
        K.icosphere(T.At([0, y0 + 0.22, 0]), T.Scale, [P.CrownWidthM, P.CrownHeightM, P.CrownWidthM], 2, object, G.Lump(0), 0.12);
        const wind    =  [P.WindX, 0, P.WindZ];
        const blades  =  [];
        for (let b = 0; b < P.Blades; b++) {
            const a      =  r.Range(0, Math.PI * 2);
            const start  =  [Math.cos(a) * r.Range(0.02, 0.11), y0, Math.sin(a) * r.Range(0.02, 0.11)];
            const out    =  [Math.cos(a), 0, Math.sin(a)];
            const h      =  r.Range(P.MinBladeM, P.MaxBladeM);
            const ctrl   =  V3Add(start, V3Add(V3Scale(out, r.Range(0.05, 0.22)), [0, h, 0]));
            const end    =  V3Add(start, V3Add(V3Add(V3Scale(out, r.Range(0.25, 0.6)), V3Scale(wind, r.Range(0.2, 0.7))), [0, h * r.Range(0.35, 0.8), 0]));
            blades.push([T.At(start), T.At(ctrl), T.At(end)]);
        }
        PainterlyNPR__AssetLibrary__Organic(G, object, 'Grass', { Blades: blades });
        return [object];
    }
    // ------------------------------------------------------------


    // FUNCTION | Reeds - the pond's reeds: a narrow crown and upright blades
    // ------------------------------------------------------------
    function PainterlyNPR__AssetLibrary__Reeds(G) {
        const { K, T, Rng: r, P }  =  G;
        const height  =  P.HeightM;
        const object  =  K.addObject(G.Name, 'Planting', G.Recipe.Material, 'Planting');
        K.icosphere(T.At([0, height * 0.3, 0]), T.Scale, [0.3, height * 0.32, 0.26], 2, object, G.Lump(0), 0.1);
        const blades  =  [];
        for (let b = 0; b < P.Blades; b++) {
            const a      =  r.Range(0, Math.PI * 2);
            const start  =  [Math.cos(a) * r.Range(0.02, 0.18), 0, Math.sin(a) * r.Range(0.02, 0.14)];
            const h      =  height * r.Range(0.6, 1.0);
            const lean   =  [r.Spread(0.14), 0, r.Spread(0.1)];
            blades.push([T.At(start), T.At(V3Add(start, V3Add(V3Scale(lean, h * 0.4), [0, h * 0.55, 0]))), T.At(V3Add(start, V3Add(V3Scale(lean, h), [0, h, 0])))]);
        }
        PainterlyNPR__AssetLibrary__Organic(G, object, 'Grass', { Blades: blades });
        return [object];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__AssetLibrary__Conifer,
        PainterlyNPR__AssetLibrary__Grass,
        PainterlyNPR__AssetLibrary__Hedge,
        PainterlyNPR__AssetLibrary__Mound,
        PainterlyNPR__AssetLibrary__Reeds,
        PainterlyNPR__AssetLibrary__Spire,
        PainterlyNPR__AssetLibrary__Topiary,
        PainterlyNPR__AssetLibrary__Tree,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
