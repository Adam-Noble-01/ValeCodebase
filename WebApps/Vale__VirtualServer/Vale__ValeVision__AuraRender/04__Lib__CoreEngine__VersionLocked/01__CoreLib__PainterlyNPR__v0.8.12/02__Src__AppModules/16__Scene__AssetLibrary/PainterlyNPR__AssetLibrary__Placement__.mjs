/* =============================================================================
   PAINTERLYNPR - SCENE | ASSET LIBRARY - PLACEMENT
   =============================================================================

   FILE       : PainterlyNPR__AssetLibrary__Placement__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - AssetLibrary - Placement
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Library assets into scene packages: a plop made from an asset and a
                point on the ground, every plop built into the package after the
                cottage, and the catalogue stage the factory draws one asset on
   CREATED    : 30-Oct-2026 (v0.6.0)

   DESCRIPTION:
   - A plop (a placement) carries its asset's recipe, its own seed, turn and
     scale: the drawing rebuilds exactly with or without the library, and every
     plop is its own plant (manifest section 07: duplicated plant assets are
     visibly varied but re-render identically).
   - Placed assets are built after every object the cottage has, so no existing
     Id or seed moves, and their triangles are spliced in among the shadow
     casters, before the lawn and the far belt: they cast shadows and stand in
     an elevation.
   - The stage is the catalogue environment: the asset alone at the origin as
     authored (its stage seed, no turn, scale 1) on a disc of lawn.

   ============================================================================= */

import AssetConfig from './Na__AssetLibrary__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__Engine__DEG as DEG } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__Maths__Clamp as Clamp } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__SemanticModel__CreateBuilder } from '../12__Scene__SemanticModel/PainterlyNPR__SemanticModel__Builder__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__AssetLibrary__Bench,
    PainterlyNPR__AssetLibrary__PicketFence,
    PainterlyNPR__AssetLibrary__Planter,
    PainterlyNPR__AssetLibrary__PottedStandard,
} from './PainterlyNPR__AssetLibrary__Objects__.mjs';
import {
    PainterlyNPR__AssetLibrary__Conifer,
    PainterlyNPR__AssetLibrary__Grass,
    PainterlyNPR__AssetLibrary__Hedge,
    PainterlyNPR__AssetLibrary__Mound,
    PainterlyNPR__AssetLibrary__Reeds,
    PainterlyNPR__AssetLibrary__Spire,
    PainterlyNPR__AssetLibrary__Topiary,
    PainterlyNPR__AssetLibrary__Tree,
} from './PainterlyNPR__AssetLibrary__Planting__.mjs';

// =============================================================================
// REGION | Asset Library - Placement
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__AssetLibrary__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const LIBRARY     =  PainterlyNPR__ConfigAccess__Section(AssetConfig, 'PainterlyNPR__AssetLibrary__Config', 'Library', ['Root', 'IndexFile', 'Api', 'MaxPlaced']);
    LIBRARY.Root  =  new URL('../../' + LIBRARY.Root, import.meta.url).href;   // <-- From the engine's own files, not the page: a wrapper's pinned copy reads the library pinned beside it (v0.8.2)
    const PLACEMENT   =  PainterlyNPR__ConfigAccess__Section(AssetConfig, 'PainterlyNPR__AssetLibrary__Config', 'Placement', ['ScaleClamp', 'GroundY']);
    const STAGE       =  PainterlyNPR__ConfigAccess__Section(AssetConfig, 'PainterlyNPR__AssetLibrary__Config', 'Stage', ['StageVersion', 'GroundMaterial', 'GroundRadiusFactor', 'GroundMinRadiusM', 'GroundSegments', 'Footprint']);
    const GENERATORS  =  PainterlyNPR__ConfigAccess__Section(AssetConfig, 'PainterlyNPR__AssetLibrary__Config', 'Generators', ['Generators']).Generators;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Generators, by the Name an Asset's DAT Gives
    // ------------------------------------------------------------
    const BUILD  =  {
        Tree           :  PainterlyNPR__AssetLibrary__Tree,
        Conifer        :  PainterlyNPR__AssetLibrary__Conifer,
        Mound          :  PainterlyNPR__AssetLibrary__Mound,
        Spire          :  PainterlyNPR__AssetLibrary__Spire,
        Hedge          :  PainterlyNPR__AssetLibrary__Hedge,
        Topiary        :  PainterlyNPR__AssetLibrary__Topiary,
        Grass          :  (G) => PainterlyNPR__AssetLibrary__Grass(G, 0),
        Reeds          :  PainterlyNPR__AssetLibrary__Reeds,
        Planter        :  PainterlyNPR__AssetLibrary__Planter,
        PottedStandard :  PainterlyNPR__AssetLibrary__PottedStandard,
        Bench          :  PainterlyNPR__AssetLibrary__Bench,
        PicketFence    :  PainterlyNPR__AssetLibrary__PicketFence,
    };
    const MATERIAL_PARAMS  =  ['CanopyMaterial', 'TrunkMaterial', 'PotMaterial', 'GrassMaterial', 'UnderplantMaterial'];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building a Plop
// -----------------------------------------------------------------------------

    // FUNCTION | A Plop's Transform - its turn about +Y, its scale, its position
    // ------------------------------------------------------------
    // Right-handed about +Y (counter-clockwise seen from above), as glTF and the
    // engine turn: At carries a local point into the world, Dir a direction.
    function PainterlyNPR__AssetLibrary__Transform(placement) {
        const a  =  (placement.RotationDeg || 0) * DEG;
        const c  =  Math.cos(a), s = Math.sin(a);
        const S  =  placement.Scale || 1;
        const P  =  placement.Position || [0, 0, 0];
        const dir  =  (v) => [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]];
        const at   =  (p) => { const r = dir(p); return [P[0] + r[0] * S, P[1] + r[1] * S, P[2] + r[2] * S]; };
        return { At: at, Dir: dir, Scale: S };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build One Plop Into the Package Being Built
    // ------------------------------------------------------------
    // Its generator, its parameters over the generator's defaults, materials
    // the engine knows (an unknown one falls back, loudly, rather than breaking
    // the build), its own seeds, and the objects it made tagged with the plop.
    function PainterlyNPR__AssetLibrary__Place(K, placement) {
        const recipe  =  placement.Recipe || {};
        const build   =  BUILD[recipe.Generator];
        if (!build) { console.warn(`[PainterlyNPR AssetLibrary] ${placement.AssetId}: no generator ${recipe.Generator} - left out`); return []; }
        const defaults  =  GENERATORS[recipe.Generator].Defaults;
        const P         =  Object.assign({}, defaults, recipe.Params || {});
        for (const key of MATERIAL_PARAMS) {
            if (P[key] != null && !MATERIAL_BY_KEY[P[key]]) { console.warn(`[PainterlyNPR AssetLibrary] ${placement.AssetId}: no material ${P[key]}`); P[key] = defaults[key] || 'Foliage'; }
        }
        const material  =  MATERIAL_BY_KEY[recipe.Material] ? recipe.Material : 'Foliage';
        const seed      =  placement.Seed >>> 0;
        const G  =  {
            K         :  K,
            T         :  PainterlyNPR__AssetLibrary__Transform(placement),
            Rng       :  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(seed, 'shape')),
            P         :  P,
            Recipe    :  Object.assign({}, recipe, { Material: material }),
            Name      :  `${placement.Name} ${placement.Uid}`,
            Extras    :  Object.assign({ SeedKey: 'asset:' + placement.Uid, AssetId: placement.AssetId, Uid: placement.Uid, Role: recipe.Role || 'Planting' }, recipe.Flowers ? { Flowers: recipe.Flowers } : {}),
            Lump      :  (i) => PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(seed, 'mass:' + i)),
            Defaults  :  (name) => GENERATORS[name].Defaults,
        };
        const objects  =  build(G);
        objects.forEach((object, i) => { object.AssetId = placement.AssetId; object.Uid = placement.Uid; object.Part = i; });   // <-- The hover names the plop; a pick finds it; Uid.Part is its key for a material (17)
        return objects;
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Plop, After the Cottage, Among the Shadow Casters
    // ------------------------------------------------------------
    // Called once the lawn and the far belt are built and before the package is
    // packed: the plops are built into a vertex list of their own, then spliced
    // in at CasterCount, so they cast into the shadow map and stand in an
    // elevation; the lawn and the belt move along. With no plops nothing changes.
    function PainterlyNPR__AssetLibrary__PlaceAll(K, placements) {
        const list  =  (placements || []).slice(0, LIBRARY.MaxPlaced);
        if (!list.length) return;
        const pkg   =  K.pkg;
        const main  =  pkg.Vertices;
        pkg.Vertices  =  [];
        for (const placement of list) PainterlyNPR__AssetLibrary__Place(K, placement);
        const placed  =  pkg.Vertices;
        const at      =  pkg.CasterCount * 8;
        pkg.Vertices  =  main.slice(0, at).concat(placed, main.slice(at));
        pkg.CasterCount  +=  placed.length / 8;
        pkg.BeltStart    +=  placed.length / 8;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Bounds of Some Vertices (8 floats each: position first)
    // ------------------------------------------------------------
    function PainterlyNPR__AssetLibrary__Bounds(vertices, from, to, objectIds) {
        const min  =  [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (let v = from; v < to; v++) {
            const o  =  v * 8;
            if (objectIds && !objectIds.includes(vertices[o + 6])) continue;
            for (let k = 0; k < 3; k++) { if (vertices[o + k] < min[k]) min[k] = vertices[o + k]; if (vertices[o + k] > max[k]) max[k] = vertices[o + k]; }
        }
        const size    =  max.map((m, k) => m - min[k]);
        const radius  =  0.5 * Math.hypot(size[0], size[1], size[2]);
        const round   =  (v) => Math.round(v * 1000) / 1000;
        return { Min: min.map(round), Max: max.map(round), Size: size.map(round), RadiusM: round(radius) };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | A Plop From the Catalogue
// -----------------------------------------------------------------------------

    // FUNCTION | Make a Plop - an index asset, a point on the ground, a fresh seed
    // ------------------------------------------------------------
    // The asset's Placement rules decide the turn (Random for plants; Camera
    // turns its front, +Z, toward the eye; Fixed as authored), the scale
    // (1 plus or minus ScaleJitter) and the shape (a new seed each plop, or the
    // catalogue's own). seed is minted by the caller; uid is the plop's
    // identity in the drawing.
    function PainterlyNPR__AssetLibrary__MakePlacement(asset, position, seed, uid, eye) {
        const rules  =  asset.Placement || {};
        const r      =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(seed >>> 0, 'plop'));
        let rotation  =  0;
        if (rules.Facing === 'Random') rotation = r.Range(0, 360);
        else if (rules.Facing === 'Camera' && eye) rotation = Math.atan2(eye[0] - position[0], eye[2] - position[2]) / DEG;
        const scale   =  Clamp(1 + r.Spread(rules.ScaleJitter || 0), PLACEMENT.ScaleClamp[0], PLACEMENT.ScaleClamp[1]);
        const paint   =  asset.Painterly;
        const shape   =  rules.NewShapeEachPlop ? PainterlyNPR__SeededRandom__DeriveSeed(seed >>> 0, 'shape') : (asset.Factory.StageSeed >>> 0);
        const mm      =  (v) => Math.round(v * 1000) / 1000;
        return {
            Uid          :  uid,
            AssetId      :  asset.AssetId,
            Name         :  asset.Identity.DisplayName,
            Position     :  [mm(position[0]), mm(PLACEMENT.GroundY), mm(position[2])],
            RotationDeg  :  Math.round(((rotation % 360) + 360) % 360 * 10) / 10,
            Scale        :  Math.round(scale * 1000) / 1000,
            Seed         :  shape,
            Recipe       :  { Generator: paint.Generator, Params: Object.assign({}, paint.Params), Kind: paint.Kind, Material: paint.Material, Role: paint.Role, Flowers: paint.Flowers ? Object.assign({}, paint.Flowers) : null },
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Next Plop Identity in a Drawing - A0001, A0002 ...
    // ------------------------------------------------------------
    function PainterlyNPR__AssetLibrary__NextUid(placements) {
        const top  =  (placements || []).reduce((m, p) => Math.max(m, parseInt(String(p.Uid).slice(1), 10) || 0), 0);
        return 'A' + String(top + 1).padStart(4, '0');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Catalogue Stage
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Stage - one asset as authored, on a disc of lawn
    // ------------------------------------------------------------
    // A package of its own: the asset at the origin with its stage seed, no turn
    // and scale 1 - the base asset before any plop's randomisation - then a disc
    // of ground under it, no building, no belt. Returns the packed package, the
    // asset's object Ids and its bounds.
    function PainterlyNPR__AssetLibrary__BuildStage(asset) {
        const K    =  PainterlyNPR__SemanticModel__CreateBuilder();
        const placement  =  PainterlyNPR__AssetLibrary__MakePlacement(Object.assign({}, asset, { Placement: { Facing: 'Fixed', ScaleJitter: 0, NewShapeEachPlop: false } }), [0, 0, 0], 0, asset.AssetId, null);
        const objects    =  PainterlyNPR__AssetLibrary__Place(K, placement);
        return PainterlyNPR__AssetLibrary__FinishStage(K, objects);
    }
    // ------------------------------------------------------------


    // FUNCTION | Finish a Stage - what was built becomes the casters, a disc of ground under it
    // ------------------------------------------------------------
    // Shared by the assets' stage and the material swatches' (17).
    function PainterlyNPR__AssetLibrary__FinishStage(K, objects) {
        const pkg  =  K.pkg;
        pkg.CasterCount  =  pkg.Vertices.length / 8;
        const ids     =  objects.map(o => o.Id);
        const bounds  =  PainterlyNPR__AssetLibrary__Bounds(pkg.Vertices, 0, pkg.CasterCount, null);
        const ground  =  K.addObject('Catalogue ground', 'Ground', STAGE.GroundMaterial, 'Ground');
        pkg.Ids.Lawn  =  ground.Id;
        const half    =  Math.max(bounds.Size[0], bounds.Size[2]) / 2;
        const radius  =  Math.max(STAGE.GroundMinRadiusM, half * STAGE.GroundRadiusFactor);
        const centre  =  [(bounds.Min[0] + bounds.Max[0]) / 2, 0, (bounds.Min[2] + bounds.Max[2]) / 2];
        const n       =  STAGE.GroundSegments;
        const rim     =  (k) => [centre[0] + Math.cos((k / n) * Math.PI * 2) * radius, 0, centre[2] + Math.sin((k / n) * Math.PI * 2) * radius];
        for (let k = 0; k < n; k++) K.tri(centre, rim(k + 1), rim(k), [0, 1, 0], ground);
        pkg.BeltStart    =  pkg.Vertices.length / 8;
        pkg.VertexCount  =  pkg.Vertices.length / 8;
        pkg.Footprint    =  STAGE.Footprint.slice();
        pkg.Vertices     =  new Float32Array(pkg.Vertices);
        return { Package: pkg, ObjectIds: ids, Bounds: bounds, StageVersion: STAGE.StageVersion };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__AssetLibrary__Bounds,
        PainterlyNPR__AssetLibrary__BuildStage,
        PainterlyNPR__AssetLibrary__FinishStage,
        PainterlyNPR__AssetLibrary__MakePlacement,
        PainterlyNPR__AssetLibrary__NextUid,
        PainterlyNPR__AssetLibrary__Place,
        PainterlyNPR__AssetLibrary__PlaceAll,
        PainterlyNPR__AssetLibrary__Transform,
        LIBRARY    as  PainterlyNPR__AssetLibrary__LIBRARY,
        STAGE      as  PainterlyNPR__AssetLibrary__STAGE,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
