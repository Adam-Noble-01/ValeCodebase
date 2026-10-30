/* =============================================================================
   PAINTERLYNPR - SCENE | CONTEXT PROXIES - THE DEMO SCENE'S CONTEXT
   =============================================================================

   FILE       : PainterlyNPR__ScenePackage__Context__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - ContextProxies - DemoScene
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What surrounds the garden: the middle distance - a field hedgerow,
                bushes and tree clumps - and the village street in front of the
                fence
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Drawn as context: lighter, cooler, never competing with the cottage.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 -
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : Experiment 01 built the scene in one function; its parts are
                   functions of K here, every line of them unchanged, run in the
                   same order - so every Id, edge and seed comes out as it did

   ============================================================================= */

import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';

// =============================================================================
// REGION | Context Proxies - The Demo Scene'S Context
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Scene Package - the demo scene as a package's records
// -----------------------------------------------------------------------------

    // FUNCTION | The Middle Distance - a field hedgerow, bushes and tree clumps
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__MiddleDistance(K) {
        const { mound, plant, tree }  =  K;

        // Between the garden and the far belt: a field hedgerow with two gaps, a
        // few bushes along it, and trees in loose clumps 30 to 50 m back - drawn as
        // context (looser lines) in a lighter, cooler green, so they sit behind the
        // garden without competing with it.
        {
            const hr      =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(7741, 'hedgerow'));
            const masses  =  [];
            for (let x = -46; x < 46; x += 1.3) {
                const at  =  x + hr.Spread(0.3), y = 1.0 + hr.Spread(0.25), z = -26 + hr.Spread(0.5), R = hr.Range(0.9, 1.25);
                if (Math.abs(x - 12) < 2.5 || Math.abs(x + 19) < 2.0) continue;                  // <-- Gaps: two field gates
                masses.push({ C: [at, y, z], R: R });
            }
            plant('Field hedgerow', 'Hedge', 'MidTrees', masses, { Role: 'Context' });
            for (const [x, w, h, label] of [[-31, 2.4, 1.9, 'bush-a'], [-15, 2.0, 1.6, 'bush-b'], [-3, 2.6, 2.0, 'bush-c'], [8, 2.2, 1.7, 'bush-d'], [22, 2.5, 1.9, 'bush-e'], [30, 1.9, 1.5, 'bush-f'], [38, 2.3, 1.8, 'bush-g']]) {
                plant('Field bush', 'Shrub', 'MidTrees', mound([x, 0, -24.4], w, h, 8, label), { Role: 'Context' });
            }
            const far  =  { Material: 'MidTrees', Role: 'Context' };
            for (const [x, z, trunkH, crownR, count, label] of [[-36, -31, 3.6, 3.4, 15, 'a'], [-29, -35, 4.4, 3.8, 16, 'b'], [-22, -29.5, 3.0, 2.6, 12, 'c'], [-13, -40, 4.8, 4.0, 16, 'd'],
                                                                [-6, -33, 3.4, 3.0, 14, 'e'], [5, -37, 4.0, 3.4, 15, 'f'], [13, -30.5, 3.2, 2.8, 13, 'g'], [19, -42, 5.0, 4.2, 16, 'h'],
                                                                [27, -34, 3.8, 3.2, 14, 'i'], [34, -39, 4.2, 3.6, 15, 'j'], [-42, -47, 4.6, 4.0, 15, 'k'], [41, -48, 4.4, 3.8, 15, 'l']]) {
                tree('Field tree ' + label, [x, 0, z], trunkH, crownR, count, far);
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Street - verge, kerb, footway and road in front of the fence
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__Street(K) {
        const { O, S, T, addEdge, addObject, addPolyEdge, box, polygonPrism, quad, path }  =  K;

        // In front of the fence, as a village street is: a strip of verge at the foot
        // of the fence (so the corner hedges and the tufts stay off the pavement), a
        // tarmac footpath 1.6 m wide, a half-battered granite kerb 125 mm wide whose
        // stones are 914 mm long, standing 108 mm above a tarmac road 6 m across with
        // its drainage channel along the kerb. The garden path runs on through the
        // gate to the footpath. Built after everything else, so no ID moves.
        {
            const footway  =  addObject('Village footpath', 'Hardscape', 'Footway', 'Ground');
            const kerb     =  addObject('Granite kerb', 'Hardscape', 'Kerb', 'Ground');
            const road     =  addObject('Village road', 'Hardscape', 'Tarmac', 'Ground');
            const XA = -50, XB = 50, ZF = 12.3, ZK = 13.9, ZR = 14.025, ZE = 20.0, TOP = 0.12, ROAD = 0.012;
            box([XA, 0, ZF], [XB, TOP, ZK], footway, null);
            addEdge(footway, [XA, TOP, ZF], [XB, TOP, ZF], T);                                                  // <-- The footpath's back edge, at the verge
            polygonPrism({ Origin: [XB, 0, 0], U: [0, 0, 1], V: [0, 1, 0], N: [1, 0, 0], Thickness: XB - XA,
                           Points: [[ZK, 0], [ZK, TOP], [ZK + 0.075, TOP], [ZR, 0.07], [ZR, 0]] }, kerb);         // <-- The kerb's half-battered section, run the length of the street
            addEdge(kerb, [XA, TOP + 0.001, ZK], [XB, TOP + 0.001, ZK], O, 'Authored');                           // <-- Where the footpath meets the kerb
            addEdge(kerb, [XA, TOP, ZK + 0.075], [XB, TOP, ZK + 0.075], S);                                     // <-- The kerb's arris
            addEdge(kerb, [XA, 0.07, ZR], [XB, 0.07, ZR], T);                                                   // <-- The foot of its batter
            addEdge(kerb, [XA, ROAD + 0.001, ZR + 0.001], [XB, ROAD + 0.001, ZR + 0.001], T, 'Authored');       // <-- Where it meets the road
            for (let x = XA + 0.914; x < XB; x += 0.914) {
                addPolyEdge(kerb, [[x, TOP + 0.0015, ZK], [x, TOP + 0.0015, ZK + 0.076], [x, 0.0715, ZR + 0.0015], [x, ROAD + 0.0015, ZR + 0.0015]], O);   // <-- A joint between kerb stones
            }
            quad([XA, ROAD, ZR], [XB, ROAD, ZR], [XB, ROAD, ZE], [XA, ROAD, ZE], [0, 1, 0], road);
            addEdge(road, [XA, ROAD + 0.001, ZR + 0.3], [XB, ROAD + 0.001, ZR + 0.3], O, 'Authored');           // <-- The drainage channel's edge
            addEdge(road, [XA, ROAD, ZE], [XB, ROAD, ZE], T);                                                   // <-- The road's far edge, at the field
            // The garden path on through the gate to the footpath
            quad([-0.62, 0.025, 11.6], [0.62, 0.025, 11.6], [0.62, 0.025, ZF], [-0.62, 0.025, ZF], [0, 1, 0], path);
            for (const x of [-0.62, 0.62]) addEdge(path, [x, 0.026, 11.66], [x, 0.026, ZF], S, 'Authored');
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__ScenePackage__MiddleDistance,
        PainterlyNPR__ScenePackage__Street,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
