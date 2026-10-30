/* =============================================================================
   PAINTERLYNPR - SCENE PACKAGE | DEMO SCENE
   =============================================================================

   FILE       : PainterlyNPR__ScenePackage__Build__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : ScenePackage - DemoScene
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The demo scene as the records a Painterly Scene Package carries: a
                brick cottage in its garden, built in code, part by part, in a
                fixed order
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Build returns the package; Load builds it and holds it as the Scene every
     pass reads - at boot, and again whenever the drawing's placed assets change
     (v0.6.0) or its material assignments do (v0.7.0). Upload hands its vertices
     to the GPU.
   - The parts run in this order and no other: an object's Id is its place in the
     order, and the scene's seed is drawn from in it. Placed assets
     (16__Scene__AssetLibrary) come after every one of them.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Scene Package - the demo scene as a
                   package's records, region Boot
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : Experiment 01 built the scene in one function; its parts are
                   functions of K here, every line of them unchanged, run in the
                   same order - so every Id, edge and seed comes out as it did.
                   v0.6.0: Finish no longer packs the vertices - Pack does, after
                   the placed assets are spliced in among the shadow casters; with
                   none placed the package is the one it was, byte for byte

   ============================================================================= */

import { PainterlyNPR__Engine__DEG as DEG } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import {
    PainterlyNPR__ScenePackage__BackOfCottage,
    PainterlyNPR__ScenePackage__Casements,
    PainterlyNPR__ScenePackage__Cottage,
    PainterlyNPR__ScenePackage__PorchTruss,
} from './PainterlyNPR__ScenePackage__Cottage__.mjs';
import {
    PainterlyNPR__ScenePackage__BackGarden,
    PainterlyNPR__ScenePackage__FenceBorder,
    PainterlyNPR__ScenePackage__Garden,
    PainterlyNPR__ScenePackage__Tufts,
} from './PainterlyNPR__ScenePackage__Garden__.mjs';
import {
    PainterlyNPR__ScenePackage__GlbBase,
    PainterlyNPR__ScenePackage__GlbRead,
} from './PainterlyNPR__ScenePackage__Glb__.mjs';
import { PainterlyNPR__SemanticModel__CreateBuilder } from '../12__Scene__SemanticModel/PainterlyNPR__SemanticModel__Builder__.mjs';
import {
    PainterlyNPR__ScenePackage__MiddleDistance,
    PainterlyNPR__ScenePackage__Street,
} from '../15__Scene__ContextProxies/PainterlyNPR__ScenePackage__Context__.mjs';
import { PainterlyNPR__AssetLibrary__PlaceAll } from '../16__Scene__AssetLibrary/PainterlyNPR__AssetLibrary__Placement__.mjs';
import { PainterlyNPR__MaterialAssignment__ApplyAll } from '../17__Scene__MaterialAssignment/PainterlyNPR__MaterialAssignment__Apply__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';

// =============================================================================
// REGION | Demo Scene
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Scene Package - the demo scene as a package's records
// -----------------------------------------------------------------------------

    // MODULE STATE | The Scene, Built Once, and a Host's Own Base
    // ------------------------------------------------------------
    // Base is a host's scene in place of the cottage and its garden (SetBase: a
    // project's GLB model, PainterlyNPR__ScenePackage__Glb__): null is the demo.
    let Scene  =  null;
    let Base   =  null;
    // ------------------------------------------------------------


    // FUNCTION | Build the Demo Scene
    // ------------------------------------------------------------
    // Returns what an importer (10__Import__ScenePackage) would hand on: objects
    // with stable IDs, material classes and roles; edges with their kind and
    // class, independent of the triangles; organic objects described by masses,
    // never by mesh edges; and one interleaved vertex array for the truth pass.
    //
    // Edge kinds: HARD - a real crease, drawn where visible. AUTHORED - a line
    // drawn on a face (glazing bars, planks, path edges), held on its face by a
    // depth tolerance. SMOOTH - a softened edge between facets, drawn only where
    // it is a silhouette from the current camera (pipes, pots, trunks).
    //
    // SURFACES are what material indication works on: a brick wall, a tiled roof
    // slope, a soldier course - each a rectangle in its own (u, v) metres with
    // its openings, so courses can be laid on the real building at their real
    // gauge. The model carries no brick geometry at all.
    //
    // PLACEMENTS are the drawing's placed library assets (State.Assets): built
    // after every object above, so no Id or seed moves, and spliced in among the
    // shadow casters before Pack. None (or no argument) is the cottage as it was.
    //
    // MATERIALS are the drawing's material assignments (State.Materials, v0.7.0):
    // a class given to an object or a face, applied to the packed package in the
    // order they were made (17__Scene__MaterialAssignment). None changes nothing.
    function PainterlyNPR__ScenePackage__Build(placements, materials) {
        const K  =  PainterlyNPR__SemanticModel__CreateBuilder();
        if (Base) {
            Base(K);                                                           // <-- A host's model takes the cottage's place; everything after it is the same
        } else {
            PainterlyNPR__ScenePackage__Objects(K);
            PainterlyNPR__ScenePackage__Cottage(K);
            PainterlyNPR__ScenePackage__Garden(K);
            PainterlyNPR__ScenePackage__BackGarden(K);
            PainterlyNPR__ScenePackage__MiddleDistance(K);
            PainterlyNPR__ScenePackage__BackOfCottage(K);
            PainterlyNPR__ScenePackage__Street(K);
            PainterlyNPR__ScenePackage__FenceBorder(K);
            PainterlyNPR__ScenePackage__Casements(K);
            PainterlyNPR__ScenePackage__PorchTruss(K);
            PainterlyNPR__ScenePackage__Tufts(K);
        }
        PainterlyNPR__ScenePackage__Finish(K);
        PainterlyNPR__AssetLibrary__PlaceAll(K, placements);
        PainterlyNPR__ScenePackage__Pack(K);
        PainterlyNPR__MaterialAssignment__ApplyAll(K.pkg, materials);
        return K.pkg;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Objects - every named object, in Id order
    // ------------------------------------------------------------
    // K is the package being built: the builder's records and primitives, and
    // what each part before leaves for the parts after it.
    function PainterlyNPR__ScenePackage__Objects(K) {
        const { pkg, addObject }  =  K;

        const plinth      =  addObject('Brick plinth', 'Wall', 'Brick', 'Architecture');
        const walls       =  addObject('Brick walls', 'Wall', 'Brick', 'Architecture');
        const roof        =  addObject('Clay tile roof', 'Roof', 'ClayTile', 'Architecture');
        const chimneys    =  addObject('Chimney stacks', 'Roof', 'Brick', 'Architecture');
        const pots        =  addObject('Chimney pots', 'Roof', 'Terracotta', 'Architecture');
        const dormers     =  addObject('Dormers', 'Roof', 'Render', 'Architecture');
        const dormerRoofs =  addObject('Dormer roofs', 'Roof', 'ClayTile', 'Architecture');
        const windows     =  addObject('Casement windows', 'Opening', 'Glass', 'Architecture');
        const door        =  addObject('Plank door', 'Opening', 'Joinery', 'Focal');
        const porch       =  addObject('Oak porch', 'Porch', 'Timber', 'Focal');
        const porchRoof   =  addObject('Porch roof', 'Porch', 'ClayTile', 'Focal');
        const stone       =  addObject('Stone cills and steps', 'Dressing', 'Stone', 'Architecture');
        const rainwater   =  addObject('Gutters and downpipe', 'Rainwater', 'Metal', 'Architecture');
        const path        =  addObject('Flagstone path', 'Hardscape', 'Paving', 'Ground');
        const fence       =  addObject('Picket fence', 'Boundary', 'WhitePaint', 'Context');
        const bench       =  addObject('Garden bench', 'Furniture', 'Timber', 'Furniture');
        const planters    =  addObject('Terracotta planters', 'Furniture', 'Terracotta', 'Furniture');
        Object.assign(pkg.Ids, { Door: door.Id, Walls: walls.Id });

        Object.assign(K, { bench, chimneys, door, dormerRoofs, dormers, fence, path, planters, plinth, porch, porchRoof, pots, rainwater, roof,
                           stone, walls, windows });
    }
    // ------------------------------------------------------------


    // FUNCTION | Finish - the lawn and the distant belt, then the vertices packed
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__Finish(K) {
        const { pkg, addObject, icosphere, quad }  =  K;

        pkg.CasterCount  =  pkg.Vertices.length / 8;

        // The lawn and the distant belt neither cast into the shadow map nor carry lines
        const lawn  =  addObject('Lawn', 'Ground', 'Lawn', 'Ground');
        const belt  =  addObject('Distant tree belt', 'Context', 'DistantTrees', 'Context');
        Object.assign(pkg.Ids, { Lawn: lawn.Id, Belt: belt.Id });
        const y     =  K.GroundY || 0;                                         // <-- A host's base with its own ground sets the lawn under it (GlbBase); the demo's is 0
        quad([-400, y, -400], [400, y, -400], [400, y, 400], [-400, y, 400], [0, 1, 0], lawn);
        pkg.BeltStart  =  pkg.Vertices.length / 8;                         // <-- The belt is perspective's backdrop: an elevation draws it full size, facets and all
        {
            const br  =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(7741, 'belt'));
            let angle  =  95 * DEG;
            while (angle < 265 * DEG) {
                const clusterSize  =  br.IntRange(3, 7);
                for (let i = 0; i < clusterSize; i++) {
                    const a  =  angle + br.Spread(1.5 * DEG);
                    const d  =  br.Range(160, 225);
                    const r  =  br.Range(4, 8.5);
                    icosphere([Math.sin(a) * d, r * 0.7 + br.Range(0, 3.5), Math.cos(a) * d - 10], r, [1, br.Range(0.8, 1.15), 1], 1, belt, br, 0.12);
                    angle += br.Range(0.9, 2.2) * DEG;
                }
                angle += br.Range(1.5, 7) * DEG;
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Pack - the vertices into the one array the truth pass draws
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__Pack(K) {
        const { pkg }  =  K;
        pkg.VertexCount  =  pkg.Vertices.length / 8;
        pkg.Vertices     =  new Float32Array(pkg.Vertices);
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the Demo Scene - built, held as the Scene every pass reads
    // ------------------------------------------------------------
    // At boot with no placements; again with the drawing's placed assets and its
    // material assignments each time either changes (82__Hud__AssetCatalogue, a
    // settings object applied).
    function PainterlyNPR__ScenePackage__Load(placements, materials) {
        Scene  =  PainterlyNPR__ScenePackage__Build(placements || [], materials || []);
        return Scene;
    }
    // ------------------------------------------------------------


    // FUNCTION | Use a Package Built Elsewhere - the factory's catalogue stage
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__Use(pkg) {
        Scene  =  pkg;
        return Scene;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Host's Own Base - its model in the cottage's place (null: the demo)
    // ------------------------------------------------------------
    // A function of K (the package builder) that adds the host's objects, triangles
    // and edges, as the cottage's parts do (PainterlyNPR__ScenePackage__GlbBase for
    // a project's GLB files). The next Load or Reload builds with it, so placed
    // assets and material assignments follow it as they follow the cottage.
    function PainterlyNPR__ScenePackage__SetBase(base) {
        Base  =  typeof base === 'function' ? base : null;
        return Base !== null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Upload the Scene's Vertices to the GPU - after a rebuild
    // ------------------------------------------------------------
    // Into the buffer the Scene vertex array reads (Init keeps it as
    // Gpu.Buffers.Scene). A host that booted without keeping it gets a new one,
    // and the vertex array is pointed at it - the same three attributes Init sets.
    function PainterlyNPR__ScenePackage__Upload() {
        const gl  =  Gpu.Gl;
        if (!Gpu.Buffers.Scene) {
            Gpu.Buffers.Scene  =  gl.createBuffer();
            gl.bindVertexArray(Gpu.Vaos.Scene);
            gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Scene);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
            gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
            gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
            gl.bindVertexArray(null);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Scene);
        gl.bufferData(gl.ARRAY_BUFFER, Scene.Vertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    // ------------------------------------------------------------


    // FUNCTION | Reload - the scene rebuilt with these placed assets and materials, on the GPU
    // ------------------------------------------------------------
    // The caller bumps the render graph's Scene input: every pass that reads the
    // geometry runs again, and nothing else.
    function PainterlyNPR__ScenePackage__Reload(placements, materials) {
        PainterlyNPR__ScenePackage__Load(placements, materials);
        PainterlyNPR__ScenePackage__Upload();
        return Scene;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__ScenePackage__GlbBase,                                   // <-- A host's GLB model reaches the engine through this one module (Glb)
        PainterlyNPR__ScenePackage__GlbRead,
        PainterlyNPR__ScenePackage__Load,
        PainterlyNPR__ScenePackage__Reload,
        PainterlyNPR__ScenePackage__SetBase,
        PainterlyNPR__ScenePackage__Upload,
        PainterlyNPR__ScenePackage__Use,
        Scene  as  PainterlyNPR__ScenePackage__Scene,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
