/* =============================================================================
   PAINTERLYNPR - SCENE PACKAGE | DEMO SCENE - THE GARDEN
   =============================================================================

   FILE       : PainterlyNPR__ScenePackage__Garden__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : ScenePackage - DemoScene - Garden
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The garden: the flagstone paths, the picket fence and gate, the
                bench and the planters, the cottage borders, hedges and trees, the
                pond, and the grass tufts
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Plants are masses with a kind - never mesh edges: the organic grammars draw
     them.

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
    PainterlyNPR__Maths__Lerp         as  Lerp,
    PainterlyNPR__Maths__V3Add        as  V3Add,
    PainterlyNPR__Maths__V3Lerp       as  V3Lerp,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Scale      as  V3Scale,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';

// =============================================================================
// REGION | Demo Scene - The Garden
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Scene Package - the demo scene as a package's records
// -----------------------------------------------------------------------------

    // FUNCTION | The Garden - the path, the gate and fence, the bench and planters, the planting
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__Garden(K) {
        const { O, S, T, pkg, addEdge, addObject, addPolyEdge, box, cylinder, icosphere, mound, polygonPrism, quad, Z1, bench, fence, path, planters }  =  K;

        // A flagstone path curving to a gate in a white picket fence
        const pathZ0 = Z1 + 1.65, pathZ1 = 11.65, pathHalf = 0.55;
        const pathX  = (z) => 0.32 * Math.sin(Math.PI * (z - pathZ0) / (pathZ1 - pathZ0));
        {
            const n = 48, left = [], right = [];
            for (let i = 0; i <= n; i++) {
                const z   =  pathZ0 + (pathZ1 - pathZ0) * (i / n);
                const dx  =  0.32 * Math.PI / (pathZ1 - pathZ0) * Math.cos(Math.PI * (z - pathZ0) / (pathZ1 - pathZ0));
                const l   =  Math.hypot(dx, 1);
                const nx  =  1 / l, nz = -dx / l;
                left.push([pathX(z) - nx * pathHalf, 0.025, z - nz * pathHalf]);
                right.push([pathX(z) + nx * pathHalf, 0.025, z + nz * pathHalf]);
            }
            for (let i = 0; i < n; i++) quad(left[i], right[i], right[i + 1], left[i + 1], [0, 1, 0], path);
            addPolyEdge(path, left, S);
            addPolyEdge(path, right, S);
            pkg.Paths.push({ ObjectId: path.Id, Left: left, Right: right });
        }
        {
            const zF = 11.6, gate = 0.75, xEnd = 9.6;
            const pickets  =  [[0, 0.04], [0.065, 0.04], [0.065, 0.86], [0.0325, 0.94], [0, 0.86]];
            for (const side of [-1, 1]) {
                for (let x = gate + 2.4; x <= xEnd; x += 2.4) box([side * x - 0.045, 0, zF - 0.06], [side * x + 0.045, 1.02, zF + 0.03], fence, { Top: T, Bottom: null, Vertical: T });
                const xa = side > 0 ? gate : -xEnd, xb = side > 0 ? xEnd : -gate;
                for (const y of [0.24, 0.7]) box([xa, y, zF - 0.05], [xb, y + 0.06, zF - 0.01], fence, { Top: O, Bottom: null, Vertical: null });
                for (let x = gate + 0.12; x < xEnd - 0.05; x += 0.135) {
                    const px  =  side > 0 ? x : -x - 0.065;
                    polygonPrism({ Origin: [px, 0, zF + 0.022], U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1], Points: pickets, Thickness: 0.022, EdgeClasses: [null, O, T, T, O] }, fence);
                }
                box([side * gate - 0.06, 0, zF - 0.07], [side * gate + 0.06, 1.2, zF + 0.05], fence, { Top: S, Bottom: null, Vertical: S });    // <-- Gate post
                box([side * gate - 0.08, 1.2, zF - 0.09], [side * gate + 0.08, 1.26, zF + 0.07], fence, { Top: T, Bottom: T, Vertical: null });  // <-- Its cap
            }
        }

        // The bench (round the back by the pond), and terracotta planters of grass either side of the step
        {
            const bx = -2.0, bz = -13.6;                                         // <-- Round the back by the pond, looking at the house: out of view for now, kept for later
            const C  =  { Top: T, Bottom: T, Vertical: T };
            box([bx, 0.40, bz + 0.02], [bx + 0.85, 0.45, bz + 0.40], bench, { Top: S, Bottom: T, Vertical: T });
            box([bx, 0.52, bz - 0.02], [bx + 0.85, 0.82, bz + 0.03], bench, C);
            for (const x of [bx + 0.03, bx + 0.77]) {
                box([x, 0, bz + 0.32], [x + 0.06, 0.40, bz + 0.38], bench, C);
                box([x, 0, bz - 0.02], [x + 0.06, 0.82, bz + 0.04], bench, C);
            }
        }
        for (const [i, x] of [-1.32, 1.32].entries()) {
            const centre  =  [x, 0, Z1 + 1.2];
            const ring    =  cylinder({ Base: centre, Axis: [0, 1, 0], R0: 0.17, R1: 0.23, Height: 0.45, Segments: 22, RimTop: S, RimBottom: T, Silhouette: S, CapTop: true, CapBottom: false }, planters);
            const band    =  ring.Ring(0.39, 0.221);
            for (let k = 0; k < 22; k++) addEdge(planters, band((k / 22) * Math.PI * 2), band(((k + 1) / 22) * Math.PI * 2), T, 'Authored');
            const grass   =  addObject('Ornamental grass', 'Planting', 'Grass', 'Planting');
            const crown   =  [x, 0.45, centre[2]];
            icosphere([crown[0], crown[1] + 0.22, crown[2]], 1, [0.30, 0.27, 0.30], 2, grass, PainterlyNPR__SeededRandom__Create(400 + i), 0.12);
            const gr      =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(7741, 'grass' + i));
            const blades  =  [];
            const wind    =  [0.35, 0, 0.15];
            for (let b = 0; b < 28; b++) {
                const a      =  gr.Range(0, Math.PI * 2);
                const start  =  [crown[0] + Math.cos(a) * gr.Range(0.02, 0.11), crown[1], crown[2] + Math.sin(a) * gr.Range(0.02, 0.11)];
                const out    =  [Math.cos(a), 0, Math.sin(a)];
                const h      =  gr.Range(0.45, 0.8);
                const ctrl   =  V3Add(start, V3Add(V3Scale(out, gr.Range(0.05, 0.22)), [0, h, 0]));
                const end    =  V3Add(start, V3Add(V3Add(V3Scale(out, gr.Range(0.25, 0.6)), V3Scale(wind, gr.Range(0.2, 0.7))), [0, h * gr.Range(0.35, 0.8), 0]));
                blades.push([start, ctrl, end]);
            }
            pkg.Organics.push({ ObjectId: grass.Id, Kind: 'Grass', Blades: blades });
        }

        // Planting: cottage borders, a climbing rose, path edging, shrubs, hedges, trees
        let plantCount  =  0;
        function plant(name, kind, materialKey, masses, extras) {
            const object  =  addObject(name, 'Planting', materialKey, (extras && extras.Role) || 'Planting');
            const scale   =  (extras && extras.Scale) || [1, 1, 1];
            masses.forEach((m, i) => icosphere(m.C, m.R, scale, m.R < 0.3 ? 1 : 2, object, PainterlyNPR__SeededRandom__Create(1000 + plantCount * 37 + i), 0.09));
            plantCount++;
            pkg.Organics.push(Object.assign({ ObjectId: object.Id, Kind: kind, Masses: masses }, extras || {}));
            return object;
        }
        function spire(base, height, seedLabel) {
            const r      =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(7741, seedLabel));
            const lean   =  [r.Spread(0.08), 0, r.Spread(0.05)];
            const n      =  Math.round(height / 0.2);
            const masses =  [];
            for (let i = 0; i < n; i++) {
                const t  =  i / (n - 1);
                masses.push({ C: [base[0] + lean[0] * t * height + r.Spread(0.04), base[1] + 0.25 + t * (height - 0.3), base[2] + lean[2] * t * height + r.Spread(0.04)], R: Lerp(0.2, 0.09, t) });
            }
            return masses;
        }
        const flowersOf  =  (pigment, density, size) => ({ Flowers: { Pigment: pigment, Density: density, SizeMm: size } });
        const borderZ    =  Z1 + 0.42;
        for (const [x, h] of [[-4.15, 2.2], [-3.75, 1.9], [3.85, 2.05], [4.25, 1.75]]) plant('Hollyhocks', 'Hollyhock', 'Foliage', spire([x, 0, Z1 + 0.32], h, 'holly' + x), flowersOf('Mixed', 0.7, [1.0, 1.7]));
        for (const x of [-3.25, -2.55, -1.9, 2.0, 2.7, 3.4]) plant('Lavender', 'Lavender', 'Lavender', mound([x, 0, borderZ + 0.15], 0.75, 0.55, 5, 'lav' + x), flowersOf('Lavender', 1.0, [0.5, 0.9]));
        for (const x of [-1.38, 1.4]) plant('Rose', 'Rose', 'Foliage', mound([x, 0, borderZ], 0.9, 1.15, 7, 'rose' + x), flowersOf('Rose', 0.45, [0.9, 1.5]));
        {
            const r       =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(7741, 'climber'));
            const masses  =  [];
            for (let i = 0; i < 11; i++) {
                const t  =  i / 10;
                masses.push({ C: [-1.5 + r.Spread(0.32) * (0.5 + t), 0.5 + t * 2.5 + r.Spread(0.1), Z1 + 0.14], R: r.Range(0.22, 0.34) });
            }
            plant('Climbing rose', 'Climber', 'Foliage', masses, Object.assign({ Scale: [1, 1, 0.45] }, flowersOf('Rose', 0.55, [0.8, 1.3])));
        }
        for (const [i, z] of [5.2, 6.1].entries()) {
            for (const s of [-1, 1]) plant('Path edging', 'Lavender', 'Lavender', mound([pathX(z) + s * (pathHalf + 0.38), 0, z], 0.6, 0.42, 4, 'edge' + i + s), flowersOf('Lavender', 0.9, [0.45, 0.8]));
        }
        plant('Shrub', 'Shrub', 'Foliage', mound([-5.5, 0, 2.3], 1.6, 1.25, 9, 'shrub-l'), {});
        plant('Shrub', 'Shrub', 'Foliage', mound([5.6, 0, 1.2], 1.3, 1.0, 8, 'shrub-r'), {});
        plant('Shrub', 'Shrub', 'Foliage', mound([-2.8, 0, 9.6], 1.2, 0.9, 7, 'shrub-f'), flowersOf('Cream', 0.2, [0.6, 1.0]));
        const hedge  =  (x, z0, z1, label) => {
            const r       =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(7741, label));
            const masses  =  [];
            for (let z = z0; z > z1; z -= 0.72) masses.push({ C: [x + r.Spread(0.1), 0.85 + r.Spread(0.12), z + r.Spread(0.1)], R: r.Range(0.6, 0.78) });
            return plant('Hedge', 'Hedge', 'Hedge', masses, {});
        };
        hedge(10.1, 11.4, -7.5, 'hedge-r');
        hedge(-10.1, 11.4, -7.5, 'hedge-l');

        const tree  =  (name, base, trunkH, crownR, count, extras) => {
            const r       =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(7741, name));
            const role    =  (extras && extras.Role) || 'Planting';
            const canopy  =  addObject(name + ' - canopy', 'Planting', (extras && extras.Material) || 'TreeFoliage', role);
            const trunk   =  addObject(name + ' - trunk', 'Planting', 'Bark', role);
            const lean    =  V3Normalise([r.Spread(0.07), 1, r.Spread(0.05)]);
            const crown   =  V3Add(base, V3Scale(lean, trunkH));
            cylinder({ Base: base, Axis: lean, R0: 0.1 + trunkH * 0.035, R1: 0.07 + trunkH * 0.015, Height: trunkH + crownR * 0.35, Segments: 14, Silhouette: S, RimBottom: T }, trunk);
            const masses  =  [];
            if (extras && extras.Dome) {
                // An apple's crown: a low dome wider than it is tall, its masses round a
                // cap of the crown with one at the heart, so the top rounds over
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
            masses.forEach((m, i) => icosphere(m.C, m.R, [1, 1, 1], 2, canopy, PainterlyNPR__SeededRandom__Create(5000 + plantCount * 41 + i), 0.1));
            plantCount++;
            const branches  =  [];
            for (let i = 0; i < 6; i++) {
                const a    =  (i / 6) * Math.PI * 2 + r.Spread(0.4);
                const mid  =  V3Add(crown, [Math.cos(a) * crownR * 0.3, crownR * 0.35 + r.Spread(0.1), Math.sin(a) * crownR * 0.25]);
                const end  =  V3Add(mid, [Math.cos(a) * r.Range(0.3, 0.6) * crownR, r.Range(0.2, 0.5) * crownR, Math.sin(a) * crownR * 0.3]);
                branches.push([V3Add(crown, [0, -0.25, 0]), mid, end]);
            }
            pkg.Organics.push(Object.assign({ ObjectId: canopy.Id, Kind: 'Tree', Masses: masses, Branches: branches, TrunkId: trunk.Id }, extras || {}));
            return { Canopy: canopy, Centre: V3Add(crown, [0, crownR * 0.7, 0]) };
        };
        const oak  =  tree('Oak', [-7.9, 0, -4.6], 3.4, 3.1, 18);
        tree('Ash behind', [3.4, 0, -8.6], 4.2, 2.8, 16);
        tree('Apple', [5.7, 0, 7.6], 1.35, 1.7, 13, Object.assign({ Dome: true }, flowersOf('Rose', 0.22, [0.6, 1.1])));   // <-- A domed apple crown, wider than tall
        tree('Field maple', [-10.8, 0, 5.2], 2.6, 2.0, 12);
        {
            const canopy  =  addObject('Yew - canopy', 'Planting', 'Conifer', 'Planting');
            const trunk   =  addObject('Yew - trunk', 'Planting', 'Bark', 'Planting');
            const base    =  [9.2, 0, -3.8];
            cylinder({ Base: base, Axis: [0, 1, 0], R0: 0.22, R1: 0.16, Height: 1.2, Segments: 12, Silhouette: S, RimBottom: T }, trunk);
            const masses  =  [];
            for (let i = 0; i < 8; i++) {
                const t  =  i / 7;
                masses.push({ C: [base[0] + Math.sin(i * 2.1) * 0.12, 1.2 + t * 5.6, base[2] + Math.cos(i * 1.7) * 0.12], R: Lerp(1.35, 0.32, t) });
            }
            masses.forEach((m, i) => icosphere(m.C, m.R, [1, 1.15, 1], 2, canopy, PainterlyNPR__SeededRandom__Create(7000 + i), 0.08));
            pkg.Organics.push({ ObjectId: canopy.Id, Kind: 'Conifer', Masses: masses, TrunkId: trunk.Id });
        }

        Object.assign(K, { flowersOf, hedge, oak, pathHalf, pathX, plant, spire, tree });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Back Garden - a second path round the gable to the pond
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__BackGarden(K) {
        const { O, S, T, pkg, addEdge, addObject, addPolyEdge, icosphere, mound, quad, tri, flowersOf, hedge, pathHalf, pathX, plant, tree }  =  K;

        // A second flagstone path leaves the first beyond the lavender edging, runs
        // round the gable end and down the garden to a pond: a sunk pool in a stone
        // kerb with reeds at its margin and lilies on the water, a birch by it, and a
        // loose mixed border across the back, where the hedges now end. Every random
        // draw here has its own seed, so nothing in the front garden moves.
        let pondRing  =  null;

        // A curving flagstone path through (x, z) control points: Catmull-Rom
        // through them, its edges authored polylines, its record in the package's
        // paths so it takes flagstone indication and tufts like the first
        const curvedPath  =  (object, ctrl, half) => {
            const cr    =  (p0, p1, p2, p3, t) => [0, 1].map(k => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t * t * t));
            const mid   =  [];
            for (let i = 0; i < ctrl.length - 1; i++) {
                const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
                for (let k = 0; k < 10; k++) mid.push(cr(p0, p1, p2, p3, k / 10));
            }
            mid.push(ctrl[ctrl.length - 1]);
            const left = [], right = [];
            mid.forEach((p, i) => {
                const a = mid[Math.max(0, i - 1)], b = mid[Math.min(mid.length - 1, i + 1)];
                const l  =  Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
                const nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;
                left.push([p[0] + nx * half, 0.024, p[1] + nz * half]);
                right.push([p[0] - nx * half, 0.024, p[1] - nz * half]);
            });
            for (let i = 0; i < mid.length - 1; i++) quad(left[i], right[i], right[i + 1], left[i + 1], [0, 1, 0], object);
            addPolyEdge(object, left, S);
            addPolyEdge(object, right, S);
            pkg.Paths.push({ ObjectId: object.Id, Left: left, Right: right });
        };
        {
            const sidePath  =  addObject('Flagstone path to the pond', 'Hardscape', 'Paving', 'Ground');
            curvedPath(sidePath, [[pathX(7.05) + pathHalf, 7.05], [3.3, 6.95], [6.3, 5.8], [7.15, 2.8], [7.05, -2.0], [6.55, -6.3], [5.6, -8.7], [5.1, -9.85]], 0.45);
        }
        {
            const pond    =  addObject('Garden pond', 'Water', 'Water', 'Ground');
            const kerb    =  addObject('Pond kerb', 'Hardscape', 'Stone', 'Ground');
            const lilies  =  addObject('Water lilies', 'Planting', 'Foliage', 'Planting');
            const pr      =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(7741, 'pond'));
            const C = [3.9, -11.7], RX = 2.1, RZ = 1.6, KERB = 0.32, N = 40;
            const ph1 = pr.Range(0, 6.28), ph2 = pr.Range(0, 6.28);
            const shape  =  (a) => 1 + 0.07 * Math.sin(3 * a + ph1) + 0.04 * Math.sin(5 * a + ph2);
            const inner = [], outer = [];
            for (let k = 0; k < N; k++) {
                const a  =  (k / N) * Math.PI * 2, s = shape(a);
                inner.push([C[0] + Math.cos(a) * RX * s, 0.05, C[1] + Math.sin(a) * RZ * s]);
                outer.push([C[0] + Math.cos(a) * (RX * s + KERB), 0.05, C[1] + Math.sin(a) * (RZ * s + KERB)]);
            }
            const centre  =  [C[0], 0.012, C[1]];
            for (let k = 0; k < N; k++) {
                const k1  =  (k + 1) % N;
                const w0  =  [inner[k][0], 0.012, inner[k][2]], w1 = [inner[k1][0], 0.012, inner[k1][2]];
                tri(centre, w0, w1, [0, 1, 0], pond);                                         // <-- The water, a little below the kerb
                quad(inner[k], outer[k], outer[k1], inner[k1], [0, 1, 0], kerb);               // <-- The kerb's top
                quad(w0, w1, inner[k1], inner[k], [C[0] - inner[k][0], 0, C[1] - inner[k][2]], kerb);   // <-- Its face down to the water
                if (k % 3 === 0) addEdge(kerb, [inner[k][0], 0.052, inner[k][2]], [outer[k][0], 0.052, outer[k][2]], O, 'Authored');   // <-- Joints between the kerb stones
            }
            addPolyEdge(pond, [...inner, inner[0]].map(p => [p[0], 0.052, p[2]]), S);
            addPolyEdge(kerb, [...outer, outer[0]].map(p => [p[0], 0.052, p[2]]), T);
            pondRing  =  outer.map(p => [p[0], 0, p[2]]);

            // Lily pads: flat discs with their notch, on the open water
            for (const [px, pz, r] of [[3.1, -11.2, 0.26], [3.6, -11.9, 0.2], [4.6, -12.4, 0.24], [2.6, -12.1, 0.18], [4.9, -11.4, 0.16]]) {
                const notch  =  pr.Range(0, 6.28);
                const rim    =  [];
                for (let k = 0; k <= 12; k++) { const a = notch + 0.24 + (k / 12) * (Math.PI * 2 - 0.48); rim.push([px + Math.cos(a) * r, 0.016, pz + Math.sin(a) * r]); }
                const c  =  [px, 0.016, pz];
                for (let k = 0; k < 12; k++) tri(c, rim[k], rim[k + 1], [0, 1, 0], lilies);
                addPolyEdge(lilies, [c, ...rim, c], O);
            }

            // Reeds at the margin: upright blades in clumps, drawn as grass is
            const reeds  =  (base, height, count, label) => {
                const object  =  addObject('Reeds', 'Planting', 'Grass', 'Planting');
                const rr      =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(7741, label));
                icosphere([base[0], base[1] + height * 0.3, base[2]], 1, [0.3, height * 0.32, 0.26], 2, object, rr, 0.1);
                const blades  =  [];
                for (let b = 0; b < count; b++) {
                    const a      =  rr.Range(0, Math.PI * 2);
                    const start  =  [base[0] + Math.cos(a) * rr.Range(0.02, 0.18), base[1], base[2] + Math.sin(a) * rr.Range(0.02, 0.14)];
                    const h      =  height * rr.Range(0.6, 1.0);
                    const lean   =  [rr.Spread(0.14), 0, rr.Spread(0.1)];
                    blades.push([start, V3Add(start, V3Add(V3Scale(lean, h * 0.4), [0, h * 0.55, 0])), V3Add(start, V3Add(V3Scale(lean, h), [0, h, 0]))]);
                }
                pkg.Organics.push({ ObjectId: object.Id, Kind: 'Grass', Blades: blades });
            };
            reeds([C[0] - 1.5, 0.05, C[1] - 1.05], 1.25, 26, 'reeds-a');
            reeds([C[0] + 1.25, 0.05, C[1] - 1.3], 1.05, 22, 'reeds-b');
            reeds([C[0] - 2.15, 0.05, C[1] + 0.2], 0.95, 18, 'reeds-c');
        }

        // The hedges run on to the back of the garden, and a loose mixed border meets them
        hedge(10.1, -8.0, -16.5, 'hedge-r-back');
        hedge(-10.1, -8.0, -16.5, 'hedge-l-back');
        for (const [x, w, h, label, flowers] of [[-8.2, 2.2, 1.7, 'back-a', null], [-5.0, 1.8, 1.4, 'back-b', null], [-1.6, 2.4, 1.8, 'back-c', flowersOf('Cream', 0.22, [0.7, 1.1])],
                                                  [1.9, 1.7, 1.3, 'back-d', null], [7.0, 2.2, 1.6, 'back-e', flowersOf('Rose', 0.18, [0.7, 1.1])], [9.0, 1.6, 1.4, 'back-f', null]]) {
            plant('Back border shrub', 'Shrub', 'Foliage', mound([x, 0, -16.6], w, h, 8, label), flowers || {});
        }
        tree('Birch by the pond', [1.0, 0, -14.3], 3.4, 1.5, 9);

        Object.assign(K, { curvedPath, pondRing });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Border Behind the Picket Fence
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__FenceBorder(K) {
        const { mound, flowersOf, plant, spire }  =  K;

        // Cottage-garden planting along the inside of the front fence, so the pickets
        // have flowers behind them and between them: lavender, chamomile, calendula,
        // catmint and foxgloves in a loose drift two deep, a clipped box ball each side
        // of the gate and a hydrangea along each run. Its own seed; built last, so no
        // earlier ID moves.
        {
            const fr  =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(7741, 'fence-border'));
            const FENCE_BACK  =  11.5;                                               // <-- The posts' and rails' back faces are at 11.54-11.55, the pickets at 11.6: nothing in the border grows through them
            const behind  =  (masses) => { for (const m of masses) m.C[2] = Math.min(m.C[2], FENCE_BACK - m.R * 1.1); return masses; };   // <-- A mass that would cross is set back, lumps and all (they reach 1.09 R), so the plant presses against the fence
            const kinds  =  {
                // Grown tall enough to spill over the 0.94 m pickets even seen from the road, as well as showing between them
                Lavender  : (x, z, k) => plant('Lavender', 'Lavender', 'Lavender', behind(mound([x, 0, z], 0.9, 1.0, 6, k)), flowersOf('Lavender', 1.0, [0.5, 0.9])),
                Chamomile : (x, z, k) => plant('Chamomile', 'Chamomile', 'Foliage', behind(mound([x, 0, z], 0.75, 0.95, 5, k)), flowersOf('Chamomile', 1.1, [0.8, 1.25])),   // <-- A deeper green, so its white daisies, lifted out of it, read
                Calendula : (x, z, k) => plant('Calendula', 'Calendula', 'TreeFoliage', behind(mound([x, 0, z], 0.75, 0.9, 5, k)), flowersOf('Calendula', 0.75, [0.7, 1.15])),
                Catmint   : (x, z, k) => plant('Catmint', 'Catmint', 'Lavender', behind(mound([x, 0, z], 0.95, 1.05, 6, k)), flowersOf('Cornflower', 0.9, [0.45, 0.8])),
                Foxglove  : (x, z, k) => plant('Foxglove', 'Foxglove', 'Foliage', behind(spire([x, 0, z], fr.Range(1.5, 1.85), k)), flowersOf('Rose', 0.85, [0.8, 1.3])),
                Box       : (x, z, k) => plant('Box ball', 'Shrub', 'Hedge', behind(mound([x, 0, z], 0.75, 0.95, 5, k)), {}),
                Hydrangea : (x, z, k) => plant('Hydrangea', 'Shrub', 'Foliage', behind(mound([x, 0, z], 1.2, 1.4, 7, k)), flowersOf('Hydrangea', 0.7, [1.1, 1.8])),
            };
            const order  =  ['Box', 'Lavender', 'Chamomile', 'Foxglove', 'Calendula', 'Catmint', 'Lavender', 'Hydrangea', 'Chamomile', 'Calendula', 'Foxglove', 'Catmint', 'Lavender', 'Chamomile'];
            for (const side of [-1, 1]) {
                let x  =  1.2;
                order.forEach((kind, i) => {
                    if (x > 9.1) return;
                    const z  =  i % 2 === 0 ? 11.2 : 10.8;                               // <-- Two rows, staggered: one 0.4 m inside the pickets, one 0.8 m
                    kinds[kind](side * (x + fr.Spread(0.06)), z + fr.Spread(0.06), 'fence' + side + i);
                    x += fr.Range(0.5, 0.75);
                });
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Tufts of Grass - along the paths, the fence and the pond
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__Tufts(K) {
        const { pkg, rng, pondRing }  =  K;

        // Tufts of grass along the paths' edges, the foot of the fence and the pond's kerb
        {
            const tuftsAlong  =  (points, count, outward) => {
                for (let i = 0; i < count; i++) {
                    const t     =  rng.Next() * (points.length - 1);
                    const k     =  Math.floor(t);
                    const base  =  V3Add(V3Lerp(points[k], points[Math.min(k + 1, points.length - 1)], t - k), outward);
                    base[1]     =  0;
                    const blades  =  [];
                    const n       =  rng.IntRange(2, 3);
                    for (let b = 0; b < n; b++) {
                        const lean  =  rng.Spread(0.5);
                        const len   =  rng.Range(0.05, 0.12);
                        const dir   =  V3Normalise([Math.sin(lean), Math.cos(lean), rng.Spread(0.25)]);
                        blades.push([base, V3Add(base, V3Scale(dir, len))]);
                    }
                    pkg.Tufts.push({ Base: base, Blades: blades });
                }
            };
            tuftsAlong(pkg.Paths[0].Left, 22, [-0.07, 0, 0]);
            tuftsAlong(pkg.Paths[0].Right, 22, [0.07, 0, 0]);
            tuftsAlong([[-9.5, 0, 11.72], [-0.9, 0, 11.72]], 18, [0, 0, 0]);
            tuftsAlong([[0.9, 0, 11.72], [9.5, 0, 11.72]], 18, [0, 0, 0]);
            tuftsAlong(pkg.Paths[1].Left, 24, [0, 0, 0]);
            tuftsAlong(pkg.Paths[1].Right, 24, [0, 0, 0]);
            tuftsAlong(pondRing, 20, [0, 0, 0]);
            tuftsAlong(pkg.Paths[2].Left, 16, [0, 0, 0]);
            tuftsAlong(pkg.Paths[2].Right, 16, [0, 0, 0]);
            tuftsAlong([[-9.6, 0, 12.27], [-0.7, 0, 12.27]], 16, [0, 0, 0]);
            tuftsAlong([[0.7, 0, 12.27], [9.6, 0, 12.27]], 16, [0, 0, 0]);
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
        PainterlyNPR__ScenePackage__BackGarden,
        PainterlyNPR__ScenePackage__FenceBorder,
        PainterlyNPR__ScenePackage__Garden,
        PainterlyNPR__ScenePackage__Tufts,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
