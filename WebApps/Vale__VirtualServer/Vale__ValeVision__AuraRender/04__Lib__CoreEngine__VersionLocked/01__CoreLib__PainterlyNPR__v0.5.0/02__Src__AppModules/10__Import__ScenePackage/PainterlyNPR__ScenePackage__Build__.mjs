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
   - Build returns the package; Load builds it once and holds it as the Scene
     every pass reads.
   - The parts run in this order and no other: an object's Id is its place in the
     order, and the scene's seed is drawn from in it.

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
                   same order - so every Id, edge and seed comes out as it did

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
import { PainterlyNPR__SemanticModel__CreateBuilder } from '../12__Scene__SemanticModel/PainterlyNPR__SemanticModel__Builder__.mjs';
import {
    PainterlyNPR__ScenePackage__MiddleDistance,
    PainterlyNPR__ScenePackage__Street,
} from '../15__Scene__ContextProxies/PainterlyNPR__ScenePackage__Context__.mjs';

// =============================================================================
// REGION | Demo Scene
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Scene Package - the demo scene as a package's records
// -----------------------------------------------------------------------------

    // MODULE STATE | The Scene, Built Once
    // ------------------------------------------------------------
    let Scene  =  null;
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
    function PainterlyNPR__ScenePackage__Build() {
        const K  =  PainterlyNPR__SemanticModel__CreateBuilder();
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
        PainterlyNPR__ScenePackage__Finish(K);
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
        quad([-400, 0, -400], [400, 0, -400], [400, 0, 400], [-400, 0, 400], [0, 1, 0], lawn);
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

        pkg.VertexCount  =  pkg.Vertices.length / 8;
        pkg.Vertices     =  new Float32Array(pkg.Vertices);
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the Demo Scene - built once, held as the Scene every pass reads
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__Load() {
        Scene  =  PainterlyNPR__ScenePackage__Build();
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
        PainterlyNPR__ScenePackage__Load,
        Scene  as  PainterlyNPR__ScenePackage__Scene,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
