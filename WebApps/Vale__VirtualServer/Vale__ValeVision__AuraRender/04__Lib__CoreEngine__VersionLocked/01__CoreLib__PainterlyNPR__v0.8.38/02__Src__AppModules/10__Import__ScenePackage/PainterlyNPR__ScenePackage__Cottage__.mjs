/* =============================================================================
   PAINTERLYNPR - SCENE PACKAGE | DEMO SCENE - THE COTTAGE
   =============================================================================

   FILE       : PainterlyNPR__ScenePackage__Cottage__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : ScenePackage - DemoScene - Cottage
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The brick cottage of a storey and a half: walls and openings, the
                clay-tiled roof, chimneys, dormers, the oak porch and its truss,
                rainwater goods, the back wall, and every casement's joinery
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Glazing bars, planks and courses are authored lines with no geometry, as
     SketchUp draws them on faces.

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

import { PainterlyNPR__Engine__DEG as DEG } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__Maths__V3Add        as  V3Add,
    PainterlyNPR__Maths__V3Length     as  V3Length,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Scale      as  V3Scale,
    PainterlyNPR__Maths__V3Sub        as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';

// =============================================================================
// REGION | Demo Scene - The Cottage
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Scene Package - the demo scene as a package's records
// -----------------------------------------------------------------------------

    // FUNCTION | The Cottage - walls, openings, roof, chimneys, dormers, porch, rainwater goods
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__Cottage(K) {
        const { O, P, S, T, pkg, addEdge, addSurface, box, cylinder, hexahedron, openingLines, polygonPrism, quad, wallWithOpenings, chimneys, door,
                dormerRoofs, dormers, plinth, porch, porchRoof, pots, rainwater, roof, stone, walls, windows }  =  K;

        // A brick country cottage of a storey and a half: a steep clay-tiled roof
        // with two gabled dormers, a chimney at each gable, an oak porch over a
        // plank door, casements under soldier-course lintels, stone cills.
        const X0 = -4.5, X1 = 4.5, Z0 = -2.7, Z1 = 2.7, WALL = 0.3, PLINTH = 0.3, EAVES = 3.55, REVEAL = 0.1;   // <-- Eaves at 3.55 m: the gutter clears the porch gable and runs the whole front
        const GLAZING_SET  =  0.03;                                           // <-- A casement's glass sits 30 mm behind its joinery's face, in the sashes' rebates
        const PITCH = 50 * DEG, TAN = Math.tan(PITCH), COS = Math.cos(PITCH), SIN = Math.sin(PITCH);
        const ROOF_T = 0.16, OVER_E = 0.18, OVER_V = 0.18;
        const APEX      =  EAVES + Z1 * TAN;                                  // <-- Gable apex, under the roof
        const RIDGE     =  APEX + ROOF_T / COS;                               // <-- Ridge, on top of it
        const WALL_H    =  EAVES - PLINTH;
        const roofTop   =  (z) => RIDGE - Math.abs(z) * TAN;                  // <-- The roof's top surface over depth z
        const DORMER_X  =  [-2.75, 2.75];
        const DORMER_EAVES  =  5.45;                                          // <-- Lowered from 5.6 to 5.3 so the gables stopped standing up pointy, raised to 5.55 for taller windows (Adam: "They look really squat"), then down to 5.45 to lower the ridge (Adam: "It looks too high") - the window stays put
        const DORMER_PITCH  =  PITCH - 5 * DEG;                               // <-- 45°, 5° flatter than the main roof (Adam: "They look a little bit too steep")
        const DORMER_TAN = Math.tan(DORMER_PITCH), DORMER_COS = Math.cos(DORMER_PITCH);
        const PORCH  =  { Z0: Z1, Z1: Z1 + 1.35, X: 0.85, Eave: 2.2, Pitch: 40 * DEG, Post: 0.07, Beam: 0.18, Depth: 0.14 };   // <-- The oak porch: its front line, posts' half width, tie beam's height, the frame's thickness
        const SOLDIER   =  0.215;                                             // <-- A soldier course: bricks on end over each opening

        box([X0 - 0.04, 0, Z0 - 0.04], [X1 + 0.04, PLINTH, Z1 + 0.04], plinth, { Bottom: P, Top: S, Vertical: S });

        const winL   =  { U0: 1.05, U1: 2.45, V0: 0.65, V1: 1.95 };
        const doorO  =  { U0: 4.02, U1: 4.98, V0: 0.00, V1: 1.80 };
        const winR   =  { U0: 6.55, U1: 7.95, V0: 0.65, V1: 1.95 };
        const atFront  =  wallWithOpenings({ Origin: [X0, PLINTH, Z1], U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1], Width: X1 - X0, Height: WALL_H, Thickness: WALL, Openings: [winL, doorO, winR] }, walls);
        // The back wall, with its door and casements, is built after the garden (below), so no earlier edge or object changes its ID
        box([X0, PLINTH, Z0 + WALL], [X0 + WALL, EAVES, Z1 - WALL], walls, null);
        const sideWin  =  { U0: 1.9, U1: 2.9, V0: 0.65, V1: 1.85 };
        const atSide   =  wallWithOpenings({ Origin: [X1, PLINTH, Z1 - WALL], U: [0, 0, -1], V: [0, 1, 0], N: [1, 0, 0], Width: (Z1 - Z0) - 2 * WALL, Height: WALL_H, Thickness: WALL, Openings: [sideWin] }, walls);
        polygonPrism({ Origin: [X1, EAVES, Z1], U: [0, 0, -1], V: [0, 1, 0], N: [ 1, 0, 0], Points: [[0, 0], [Z1 - Z0, 0], [Z1, APEX - EAVES]], Thickness: WALL }, walls);
        polygonPrism({ Origin: [X0, EAVES, Z0], U: [0, 0,  1], V: [0, 1, 0], N: [-1, 0, 0], Points: [[0, 0], [Z1 - Z0, 0], [Z1, APEX - EAVES]], Thickness: WALL }, walls);

        for (const [x, z] of [[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1]]) addEdge(walls, [x, PLINTH, z], [x, EAVES, z], P);
        addEdge(walls, [X0, EAVES, Z1], [X1, EAVES, Z1], T);
        addEdge(walls, [X0, EAVES, Z0], [X1, EAVES, Z0], T);
        for (const x of [X0, X1]) { addEdge(walls, [x, EAVES, Z1], [x, APEX, 0], T); addEdge(walls, [x, APEX, 0], [x, EAVES, Z0], T); }

        // Casements, their cills, soldier courses over every opening, and the brick
        const lintel  =  (o) => ({ U0: o.U0 - 0.11, U1: o.U1 + 0.11, V0: o.V1, V1: o.V1 + SOLDIER });
        const cill    =  (o) => ({ U0: o.U0 - 0.08, U1: o.U1 + 0.08, V0: o.V0 - 0.09, V1: o.V0 });
        for (const o of [winL, winR]) {
            const g  =  -REVEAL - GLAZING_SET;
            quad(atFront(o.U0, o.V0, g), atFront(o.U1, o.V0, g), atFront(o.U1, o.V1, g), atFront(o.U0, o.V1, g), [0, 0, 1], windows);
            openingLines(atFront, o, windows, REVEAL, 4, 3);
            box([X0 + o.U0 - 0.07, PLINTH + o.V0 - 0.08, Z1 - REVEAL - 0.01], [X0 + o.U1 + 0.07, PLINTH + o.V0, Z1 + 0.06], stone, { Top: S, Bottom: T, Vertical: T });
        }
        for (const o of [winL, doorO, winR]) {
            const l  =  lintel(o);
            addSurface(walls, 'Soldier', [X0 + l.U0, PLINTH + l.V0, Z1], [1, 0, 0], [0, 1, 0], l.U1 - l.U0, SOLDIER, {});
        }
        addSurface(walls, 'Brick', [X0, PLINTH, Z1], [1, 0, 0], [0, 1, 0], X1 - X0, WALL_H, { Holes: [winL, doorO, winR, lintel(winL), lintel(doorO), lintel(winR), cill(winL), cill(winR)] });

        // The plank door: its arris, frame, planks and ledges - timber suggested by its joints
        {
            const o = doorO, f = 0.06;
            const origin  =  atFront(0, 0, -REVEAL);
            pkg.Windows.push({ ObjectId: door.Id, Kind: 'Door', Origin: origin, U: V3Sub(atFront(1, 0, -REVEAL), origin), V: V3Sub(atFront(0, 1, -REVEAL), origin), N: [0, 0, 1],   // <-- An external door takes the reveal's shadow line too
                               U0: o.U0, U1: o.U1, V0: o.V0, V1: o.V1, Reveal: REVEAL, Frame: 0, Bars: [], Rails: [] });
            quad(atFront(o.U0, o.V0, -REVEAL), atFront(o.U1, o.V0, -REVEAL), atFront(o.U1, o.V1, -REVEAL), atFront(o.U0, o.V1, -REVEAL), [0, 0, 1], door);
            addEdge(door, atFront(o.U0, o.V0, 0), atFront(o.U0, o.V1, 0), S);
            addEdge(door, atFront(o.U1, o.V0, 0), atFront(o.U1, o.V1, 0), S);
            addEdge(door, atFront(o.U0, o.V1, 0), atFront(o.U1, o.V1, 0), S);
            addEdge(door, atFront(o.U0 + f, o.V0, -REVEAL), atFront(o.U0 + f, o.V1 - f, -REVEAL), T, 'Authored');
            addEdge(door, atFront(o.U1 - f, o.V0, -REVEAL), atFront(o.U1 - f, o.V1 - f, -REVEAL), T, 'Authored');
            addEdge(door, atFront(o.U0 + f, o.V1 - f, -REVEAL), atFront(o.U1 - f, o.V1 - f, -REVEAL), T, 'Authored');
            for (let u = o.U0 + f + 0.15; u < o.U1 - f - 0.04; u += 0.15) addEdge(door, atFront(u, o.V0 + 0.02, -REVEAL), atFront(u, o.V1 - f, -REVEAL), O, 'Authored');
            for (const v of [0.3, 0.9, 1.5]) addEdge(door, atFront(o.U0 + f, v, -REVEAL), atFront(o.U1 - f, v, -REVEAL), T, 'Authored');
        }

        // The gable side: a casement below, a small window in the gable above
        {
            const o = sideWin;
            const g  =  -REVEAL - GLAZING_SET;
            quad(atSide(o.U0, o.V0, g), atSide(o.U1, o.V0, g), atSide(o.U1, o.V1, g), atSide(o.U0, o.V1, g), [1, 0, 0], windows);
            openingLines(atSide, o, windows, REVEAL, 2, 3);
            const z0 = (Z1 - WALL) - o.U1, z1 = (Z1 - WALL) - o.U0;
            box([X1 - REVEAL - 0.01, PLINTH + o.V0 - 0.08, z0 - 0.07], [X1 + 0.06, PLINTH + o.V0, z1 + 0.07], stone, { Top: S, Bottom: T, Vertical: T });
            const shift  =  (r) => ({ U0: r.U0 + WALL, U1: r.U1 + WALL, V0: r.V0, V1: r.V1 });    // <-- The surface starts at the corner, the wall at its inner face
            const l      =  shift(lintel(o));
            addSurface(walls, 'Soldier', [X1, PLINTH + l.V0, Z1 - l.U0], [0, 0, -1], [0, 1, 0], l.U1 - l.U0, SOLDIER, {});
            addSurface(walls, 'Brick', [X1, PLINTH, Z1], [0, 0, -1], [0, 1, 0], Z1 - Z0, WALL_H, { Holes: [shift(o), l, shift(cill(o))] });

            const y0 = 4.15, y1 = 5.0, zA = 0.32, gx = X1 + 0.012, fx = X1 + 0.013;
            quad([gx, y0, zA], [gx, y0, -zA], [gx, y1, -zA], [gx, y1, zA], [1, 0, 0], windows);
            addEdge(windows, [fx, y0, zA], [fx, y0, -zA], S); addEdge(windows, [fx, y0, -zA], [fx, y1, -zA], S);
            addEdge(windows, [fx, y1, -zA], [fx, y1, zA], S); addEdge(windows, [fx, y1, zA], [fx, y0, zA], S);
            addEdge(windows, [fx, y0, 0], [fx, y1, 0], T, 'Authored');
            addEdge(windows, [fx, (y0 + y1) / 2, zA], [fx, (y0 + y1) / 2, -zA], T, 'Authored');
            pkg.Windows.push({ ObjectId: windows.Id, Origin: [gx, y0, zA], U: [0, 0, -1], V: [0, 1, 0], N: [1, 0, 0],                         // <-- Near flush: its frame is the reveal
                               U0: 0, U1: 2 * zA, V0: 0, V1: y1 - y0, Reveal: 0.04, Frame: 0, Bars: [zA], Rails: [(y1 - y0) / 2] });
            box([X1, y0 - 0.07, -zA - 0.06], [X1 + 0.06, y0, zA + 0.06], stone, { Top: S, Bottom: T, Vertical: T });
            const gableClip  =  (v) => [v / TAN, (Z1 - Z0) - v / TAN];
            addSurface(walls, 'Brick', [X1, EAVES, Z1], [0, 0, -1], [0, 1, 0], Z1 - Z0, APEX - EAVES, { Clip: gableClip, Top: false, Base: false, Holes: [{ U0: Z1 - zA - 0.08, U1: Z1 + zA + 0.08, V0: y0 - EAVES - 0.1, V1: y1 - EAVES + 0.05 }] });
            addSurface(walls, 'Brick', [X0, PLINTH, Z0], [0, 0, 1], [0, 1, 0], Z1 - Z0, WALL_H, {});
            addSurface(walls, 'Brick', [X0, EAVES, Z0], [0, 0, 1], [0, 1, 0], Z1 - Z0, APEX - EAVES, { Clip: gableClip, Top: false, Base: false });
            addSurface(plinth, 'Brick', [X0 - 0.04, 0, Z1 + 0.04], [1, 0, 0], [0, 1, 0], X1 - X0 + 0.08, PLINTH, {});
            addSurface(plinth, 'Brick', [X1 + 0.04, 0, Z1 + 0.04], [0, 0, -1], [0, 1, 0], Z1 - Z0 + 0.08, PLINTH, {});
            addSurface(plinth, 'Brick', [X0 - 0.04, 0, Z0 - 0.04], [0, 0, 1], [0, 1, 0], Z1 - Z0 + 0.08, PLINTH, {});
        }

        // Roof: two steep slopes mitred at the ridge; tile courses for indication on the front one
        {
            const xL = X0 - OVER_V, xR = X1 + OVER_V;
            const ue = [Z1 + OVER_E, EAVES - OVER_E * TAN];                     // <-- [z, y] underside at the eaves
            const ur = [0, APEX];
            const tr = [0, RIDGE];
            const te = [ue[0] + ROOF_T * SIN, ue[1] + ROOF_T * COS];
            for (const s of [1, -1]) {
                const p  =  (x, zy) => [x, zy[1], zy[0] * s];
                hexahedron([p(xL, ue), p(xR, ue), p(xR, ur), p(xL, ur), p(xL, te), p(xR, te), p(xR, tr), p(xL, tr)], roof);
                addEdge(roof, p(xL, te), p(xR, te), P);                          // <-- Eaves
                addEdge(roof, p(xL, ue), p(xR, ue), S);                          // <-- Fascia's lower arris
                for (const x of [xL, xR]) {
                    addEdge(roof, p(x, te), p(x, tr), P);                        // <-- Verge
                    addEdge(roof, p(x, ue), p(x, ur), T);
                    addEdge(roof, p(x, te), p(x, ue), T);
                }
                const capZ  =  0.14 * COS;
                addEdge(roof, [xL, RIDGE - capZ * TAN, capZ * s], [xR, RIDGE - capZ * TAN, capZ * s], T, 'Authored');   // <-- Ridge tiles
            }
            addEdge(roof, [xL, RIDGE, 0], [xR, RIDGE, 0], P);                     // <-- The ridge, once
            const slopeLen  =  Math.hypot(tr[1] - te[1], te[0] - tr[0]);
            const up        =  V3Normalise([0, tr[1] - te[1], tr[0] - te[0]]);
            const vAtZ      =  (z) => (te[0] - z) / COS;
            const holes     =  [];
            for (const s of [-1, 1]) holes.push({ U0: Math.min(s * 3.85, s * 4.5) - xL - 0.06, U1: Math.max(s * 3.85, s * 4.5) - xL + 0.06, V0: vAtZ(0.52), V1: slopeLen + 0.1 });
            const dormerRidgeZ  =  (RIDGE - (DORMER_EAVES + 0.72 * DORMER_TAN + 0.12 / DORMER_COS)) / TAN;   // <-- Where a dormer's ridge runs into the roof
            for (const c of DORMER_X) holes.push({ U0: c - 0.86 - xL, U1: c + 0.86 - xL, V0: vAtZ(2.42), V1: vAtZ(dormerRidgeZ - 0.11) });
            addSurface(roof, 'Tile', [xL, te[1], te[0]], [1, 0, 0], up, xR - xL, slopeLen, { Holes: holes });
        }

        // Chimneys at both gables: stack, oversailing cap, two pots; flashing where each leaves the roof
        for (const s of [-1, 1]) {
            const xa = Math.min(s * 3.85, s * 4.5), xb = Math.max(s * 3.85, s * 4.5), cz = 0.45, top = 7.75;
            box([xa, 5.2, -cz], [xb, top, cz], chimneys, { Top: S, Vertical: S, Bottom: null });
            box([xa - 0.05, top, -cz - 0.05], [xb + 0.05, top + 0.12, cz + 0.05], chimneys, { Top: S, Bottom: S, Vertical: T });
            const xi  =  s > 0 ? xa : xb;                                     // <-- The face toward the middle of the roof
            addEdge(chimneys, [xa, roofTop(cz), cz], [xb, roofTop(cz), cz], S);
            addEdge(chimneys, [xi, roofTop(cz), cz], [xi, RIDGE, 0], S);
            addEdge(chimneys, [xi, RIDGE, 0], [xi, roofTop(cz), -cz], S);
            for (const x of [xa + 0.17, xb - 0.17]) cylinder({ Base: [x, top + 0.12, 0], Axis: [0, 1, 0], R0: 0.11, R1: 0.09, Height: 0.42, Segments: 18, RimTop: S, RimBottom: T, Silhouette: S, CapTop: true, CapBottom: false }, pots);
            const h  =  top - roofTop(cz);
            addSurface(chimneys, 'Brick', [xa, roofTop(cz), cz], [1, 0, 0], [0, 1, 0], xb - xa, h, { Base: false });
            if (s > 0) {
                addSurface(chimneys, 'Brick', [xa, roofTop(cz), -cz], [0, 0, 1], [0, 1, 0], 2 * cz, h, { Base: false });
                addSurface(chimneys, 'Brick', [xb, APEX - 0.2, cz], [0, 0, -1], [0, 1, 0], 2 * cz, top - APEX + 0.2, { Base: false });
            } else {
                addSurface(chimneys, 'Brick', [xb, roofTop(cz), cz], [0, 0, -1], [0, 1, 0], 2 * cz, h, { Base: false });
                addSurface(chimneys, 'Brick', [xa, APEX - 0.2, -cz], [0, 0, 1], [0, 1, 0], 2 * cz, top - APEX + 0.2, { Base: false });
            }
        }

        // Dormers: rendered fronts and cheeks under small tiled gables, buried at the back in the main roof
        for (const c of DORMER_X) {
            const a = 0.72, zf = 2.25, ye = DORMER_EAVES, dt = 0.12, ovS = 0.1, ovF = 0.12, wallT = 0.12;
            const yb   =  roofTop(zf) - 0.3;
            const win  =  { U0: a - 0.4, U1: a + 0.4, V0: 4.58 - yb, V1: 5.37 - yb };   // <-- 790 mm tall, its sill about 245 mm above the tiles at its foot, 80 mm under the eaves
            const atD  =  wallWithOpenings({ Origin: [c - a, yb, zf], U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1], Width: 2 * a, Height: ye - yb, Thickness: wallT, Openings: [win] }, dormers);
            polygonPrism({ Origin: [c - a, ye, zf], U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1], Points: [[0, 0], [2 * a, 0], [a, a * DORMER_TAN]], Thickness: wallT }, dormers);
            const zc  =  (RIDGE - ye) / TAN;
            for (const s of [-1, 1]) {
                polygonPrism({ Origin: [c + s * a, 0, 0], U: [0, 0, 1], V: [0, 1, 0], N: [s, 0, 0], Points: [[zf, roofTop(zf) - 0.06], [zf, ye], [zc - 0.06, ye]], Thickness: 0.1 }, dormers);
                addEdge(dormers, [c + s * a, roofTop(zf), zf], [c + s * a, ye, zc], T);       // <-- The cheek on the roof
                addEdge(dormers, [c + s * a, roofTop(zf), zf], [c + s * a, ye, zf], S);       // <-- Front corner
            }
            addEdge(dormers, [c - a, roofTop(zf), zf], [c + a, roofTop(zf), zf], S);           // <-- Where the front meets the roof
            const g  =  -0.08 - GLAZING_SET;
            quad(atD(win.U0, win.V0, g), atD(win.U1, win.V0, g), atD(win.U1, win.V1, g), atD(win.U0, win.V1, g), [0, 0, 1], windows);
            openingLines(atD, win, windows, 0.08, 2, 2);
            const yu  =  (x) => ye + DORMER_TAN * (a - Math.abs(x - c));
            const Tv  =  dt / DORMER_COS;
            const zFront = zf + ovF, zBack = 0.05;
            for (const s of [-1, 1]) {
                const xe  =  c + s * (a + ovS);
                hexahedron([[xe, yu(xe), zFront], [c, yu(c), zFront], [c, yu(c), zBack], [xe, yu(xe), zBack],
                            [xe, yu(xe) + Tv, zFront], [c, yu(c) + Tv, zFront], [c, yu(c) + Tv, zBack], [xe, yu(xe) + Tv, zBack]], dormerRoofs);
                const zE  =  (RIDGE - (yu(xe) + Tv)) / TAN;
                const zR  =  (RIDGE - (yu(c) + Tv)) / TAN;
                addEdge(dormerRoofs, [xe, yu(xe) + Tv, zFront], [c, yu(c) + Tv, zFront], S);    // <-- Verge
                addEdge(dormerRoofs, [xe, yu(xe), zFront], [c, yu(c), zFront], T);
                addEdge(dormerRoofs, [xe, yu(xe) + Tv, zFront], [xe, yu(xe) + Tv, zE], S);      // <-- Eaves, back to the main roof
                addEdge(dormerRoofs, [xe, yu(xe) + Tv, zE], [c, yu(c) + Tv, zR], T);            // <-- Valley
            }
            addEdge(dormerRoofs, [c, yu(c) + Tv, zFront], [c, yu(c) + Tv, (RIDGE - (yu(c) + Tv)) / TAN], S);   // <-- Dormer ridge
        }

        // The oak porch: two posts, plates and a tiled gable, standing on a stone step
        {
            const pz0 = PORCH.Z0, pz1 = PORCH.Z1, px = PORCH.X, pEave = PORCH.Eave, pTan = Math.tan(PORCH.Pitch), pCos = Math.cos(PORCH.Pitch);
            const pt = 0.1, ov = 0.12, ovF = 0.15, pp = PORCH.Post, pb = PORCH.Beam, pd = PORCH.Depth;   // <-- Rustic sections: 140 mm posts, a 180 mm tie beam
            for (const s of [-1, 1]) box([s * px - pp, 0.15, pz1 - pd], [s * px + pp, pEave - pb, pz1], porch, { Top: null, Bottom: T, Vertical: T });
            box([-px - pp, pEave - pb, pz1 - pd], [px + pp, pEave, pz1], porch, { Top: T, Bottom: T, Vertical: T });
            for (const s of [-1, 1]) box([s * px - 0.05, pEave - 0.14, pz0], [s * px + 0.05, pEave, pz1 - pd], porch, { Top: T, Bottom: T, Vertical: null });
            const yu  =  (x) => pEave + pTan * (px - Math.abs(x));
            const Tv  =  pt / pCos;
            for (const s of [-1, 1]) {
                const xe  =  s * (px + ov);
                hexahedron([[xe, yu(xe), pz1 + ovF], [0, yu(0), pz1 + ovF], [0, yu(0), pz0], [xe, yu(xe), pz0],
                            [xe, yu(xe) + Tv, pz1 + ovF], [0, yu(0) + Tv, pz1 + ovF], [0, yu(0) + Tv, pz0], [xe, yu(xe) + Tv, pz0]], porchRoof);
                addEdge(porchRoof, [xe, yu(xe) + Tv, pz1 + ovF], [0, yu(0) + Tv, pz1 + ovF], S);
                addEdge(porchRoof, [xe, yu(xe), pz1 + ovF], [0, yu(0), pz1 + ovF], T);
                addEdge(porchRoof, [xe, yu(xe) + Tv, pz1 + ovF], [xe, yu(xe) + Tv, pz0], S);
                addEdge(porchRoof, [xe, yu(xe) + Tv, pz0], [0, yu(0) + Tv, pz0], T);
            }
            addEdge(porchRoof, [0, yu(0) + Tv, pz1 + ovF], [0, yu(0) + Tv, pz0], S);
            box([-1.05, 0, pz0 + 0.04], [1.05, 0.15, pz1 + 0.3], stone, { Top: S, Bottom: T, Vertical: T });
        }

        // Rainwater goods: one gutter the length of the front, a swan neck and downpipe at the corner
        {
            const gy = EAVES - OVER_E * TAN - 0.07, gz = Z1 + OVER_E + 0.11;
            cylinder({ Base: [X0 - 0.15, gy, gz], Axis: [1, 0, 0], R0: 0.065, R1: 0.065, Height: (X1 - X0) + 0.3, Segments: 12, RimTop: T, RimBottom: T, Silhouette: S, CapTop: true, CapBottom: true }, rainwater);
            const x = 4.28, zWall = Z1 + 0.09;
            cylinder({ Base: [x, gy - 0.02, gz], Axis: [0, -1, 0], R0: 0.045, R1: 0.045, Height: 0.16, Segments: 10, Silhouette: S }, rainwater);
            const a = [x, gy - 0.18, gz], b = [x, gy - 0.45, zWall];
            cylinder({ Base: a, Axis: V3Sub(b, a), R0: 0.045, R1: 0.045, Height: V3Length(V3Sub(b, a)), Segments: 10, Silhouette: S }, rainwater);
            cylinder({ Base: b, Axis: [0, -1, 0], R0: 0.045, R1: 0.045, Height: b[1], Segments: 10, Silhouette: S, RimTop: T }, rainwater);
        }

        Object.assign(K, { GLAZING_SET, PLINTH, PORCH, REVEAL, SOLDIER, WALL, WALL_H, X0, X1, Z0, Z1, cill, lintel });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Back of the Cottage - its door and casements, built after the garden
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__BackOfCottage(K) {
        const { O, S, T, pkg, addEdge, addObject, addSurface, box, openingLines, quad, wallWithOpenings, GLAZING_SET, PLINTH, REVEAL, SOLDIER, WALL,
                WALL_H, X0, X1, Z0, cill, curvedPath, lintel, plinth, stone, walls, windows }  =  K;

        // A ledged plank door toward the garden end and two casements under soldier
        // courses, as at the front, so the back garden looks at a house; a stone
        // step, and a path from it down the garden to the pond, west of the ash.
        // Built here, after everything else, so no earlier object, edge or surface
        // changes its ID - and so no stroke already drawn changes its seed.
        {
            const backDoorO  =  { U0: 1.2, U1: 2.1, V0: 0.00, V1: 1.80 };       // <-- (u, v) from the right-hand corner seen from the garden, x 4.5
            const winB1      =  { U0: 3.2, U1: 4.6, V0: 0.65, V1: 1.95 };
            const winB2      =  { U0: 6.4, U1: 7.8, V0: 0.65, V1: 1.95 };
            const atBack  =  wallWithOpenings({ Origin: [X1, PLINTH, Z0], U: [-1, 0, 0], V: [0, 1, 0], N: [0, 0, -1], Width: X1 - X0, Height: WALL_H, Thickness: WALL, Openings: [backDoorO, winB1, winB2] }, walls);
            for (const o of [winB1, winB2]) {
                const g  =  -REVEAL - GLAZING_SET;
                quad(atBack(o.U0, o.V0, g), atBack(o.U1, o.V0, g), atBack(o.U1, o.V1, g), atBack(o.U0, o.V1, g), [0, 0, -1], windows);
                openingLines(atBack, o, windows, REVEAL, 4, 3);
                box([X1 - o.U1 - 0.07, PLINTH + o.V0 - 0.08, Z0 - 0.06], [X1 - o.U0 + 0.07, PLINTH + o.V0, Z0 + REVEAL + 0.01], stone, { Top: S, Bottom: T, Vertical: T });
            }
            const backDoor  =  addObject('Back door', 'Opening', 'Joinery', 'Architecture');
            {
                const o = backDoorO, f = 0.06;
                const origin  =  atBack(0, 0, -REVEAL);
                pkg.Windows.push({ ObjectId: backDoor.Id, Kind: 'Door', Origin: origin, U: V3Sub(atBack(1, 0, -REVEAL), origin), V: V3Sub(atBack(0, 1, -REVEAL), origin), N: [0, 0, -1],   // <-- As at the front: its leaf takes the reveal's shadow line
                                   U0: o.U0, U1: o.U1, V0: o.V0, V1: o.V1, Reveal: REVEAL, Frame: 0, Bars: [], Rails: [] });
                quad(atBack(o.U0, o.V0, -REVEAL), atBack(o.U1, o.V0, -REVEAL), atBack(o.U1, o.V1, -REVEAL), atBack(o.U0, o.V1, -REVEAL), [0, 0, -1], backDoor);
                addEdge(backDoor, atBack(o.U0, o.V0, 0), atBack(o.U0, o.V1, 0), S);
                addEdge(backDoor, atBack(o.U1, o.V0, 0), atBack(o.U1, o.V1, 0), S);
                addEdge(backDoor, atBack(o.U0, o.V1, 0), atBack(o.U1, o.V1, 0), S);
                addEdge(backDoor, atBack(o.U0 + f, o.V0, -REVEAL), atBack(o.U0 + f, o.V1 - f, -REVEAL), T, 'Authored');
                addEdge(backDoor, atBack(o.U1 - f, o.V0, -REVEAL), atBack(o.U1 - f, o.V1 - f, -REVEAL), T, 'Authored');
                addEdge(backDoor, atBack(o.U0 + f, o.V1 - f, -REVEAL), atBack(o.U1 - f, o.V1 - f, -REVEAL), T, 'Authored');
                for (let u = o.U0 + f + 0.15; u < o.U1 - f - 0.04; u += 0.15) addEdge(backDoor, atBack(u, o.V0 + 0.02, -REVEAL), atBack(u, o.V1 - f, -REVEAL), O, 'Authored');
                for (const v of [0.3, 0.9, 1.5]) addEdge(backDoor, atBack(o.U0 + f, v, -REVEAL), atBack(o.U1 - f, v, -REVEAL), T, 'Authored');
                box([X1 - o.U1 - 0.12, 0, Z0 - 0.46], [X1 - o.U0 + 0.12, 0.16, Z0 - 0.04], stone, { Top: S, Bottom: null, Vertical: T });   // <-- The back step
            }
            for (const o of [backDoorO, winB1, winB2]) {
                const l  =  lintel(o);
                addSurface(walls, 'Soldier', [X1 - l.U0, PLINTH + l.V0, Z0], [-1, 0, 0], [0, 1, 0], l.U1 - l.U0, SOLDIER, {});
            }
            addSurface(walls, 'Brick', [X1, PLINTH, Z0], [-1, 0, 0], [0, 1, 0], X1 - X0, WALL_H, { Holes: [backDoorO, winB1, winB2, lintel(backDoorO), lintel(winB1), lintel(winB2), cill(winB1), cill(winB2)] });
            addSurface(plinth, 'Brick', [X1 + 0.04, 0, Z0 - 0.04], [-1, 0, 0], [0, 1, 0], X1 - X0 + 0.08, PLINTH, {});
            const backPath  =  addObject('Flagstone path from the back door', 'Hardscape', 'Paving', 'Ground');
            const xd  =  X1 - (backDoorO.U0 + backDoorO.U1) / 2;
            curvedPath(backPath, [[xd, Z0 - 0.3], [xd - 0.3, -5.0], [2.0, -7.0], [1.85, -8.7], [2.2, -9.75], [2.45, -10.25]], 0.4);   // <-- Over 0.9 m clear of the ash at (3.4, -8.6)
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Cottage Casements - frames, sashes and glazing bars
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__Casements(K) {
        const { O, T, pkg, addEdge, addObject, box, GLAZING_SET }  =  K;

        // Every window openingLines registered as a casement gets its joinery, painted
        // off-white: a frame at the back of the reveal (jambs, head and sill), a mullion
        // between two leaves, each leaf's stiles and rails flush with the frame (the
        // bottom rail deeper), and glazing bars a little behind them - six lights a leaf
        // on the ground floor, three in the gable's casement, two in a dormer's - the
        // glass 30 mm back in the rebates. The pen gets each pane's arrises and the
        // mullion's joints; a bar's two arrises are a pair, drawn as one line down the
        // bar until they stand half a millimetre apart on the sheet. Built last, so no
        // earlier Id moves.
        {
            const joinery  =  addObject('Window joinery', 'Opening', 'WindowPaint', 'Joinery');
            const J  =  { Frame: 0.055, Depth: 0.06, Mullion: 0.06, Stile: 0.045, TopRail: 0.045, BottomRail: 0.065, SashDepth: 0.045, Bar: 0.02, BarSet: 0.006 };   // <-- Metres: a softwood flush casement's sections
            const pair  =  (a, b) => { a.Pair = { Mate: b.Id, Lead: true }; b.Pair = { Mate: a.Id, Lead: false }; };
            for (const w of pkg.Windows) {
                if (!w.Casement) continue;
                const at      =  (u, v, d) => V3Add(V3Add(V3Add(w.Origin, V3Scale(w.U, u)), V3Scale(w.V, v)), V3Scale(w.N, d));   // <-- d along the outward normal: 0 the joinery's face, negative into the wall
                const member  =  (u0, u1, v0, v1, d0, d1) => {
                    const p = at(u0, v0, d0), q = at(u1, v1, d1);
                    box([Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.min(p[2], q[2])], [Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.max(p[2], q[2])], joinery, null);
                };
                const line    =  (u0, v0, u1, v1, d, cls, kind) => { addEdge(joinery, at(u0, v0, d), at(u1, v1, d), cls, kind); return pkg.Edges[pkg.Edges.length - 1]; };
                const leaves  =  w.Casement.Columns >= 2 ? 2 : 1;
                const across  =  w.Casement.Columns / leaves;                    // <-- Panes across each leaf
                const rows    =  w.Casement.Rows;
                const F = J.Frame, uc = (w.U0 + w.U1) / 2, v0 = w.V0 + F, v1 = w.V1 - F;
                // The frame: jambs, head and sill
                member(w.U0, w.U0 + F, w.V0, w.V1, -J.Depth, 0);
                member(w.U1 - F, w.U1, w.V0, w.V1, -J.Depth, 0);
                member(w.U0 + F, w.U1 - F, v1, w.V1, -J.Depth, 0);
                member(w.U0 + F, w.U1 - F, w.V0, v0, -J.Depth, 0);
                // The mullion between the leaves, and its two joints with them
                const spans  =  leaves === 2 ? [[w.U0 + F, uc - J.Mullion / 2], [uc + J.Mullion / 2, w.U1 - F]] : [[w.U0 + F, w.U1 - F]];
                if (leaves === 2) {
                    member(uc - J.Mullion / 2, uc + J.Mullion / 2, v0, v1, -J.Depth, 0);
                    pair(line(uc - J.Mullion / 2, v0, uc - J.Mullion / 2, v1, 0, T, 'Authored'), line(uc + J.Mullion / 2, v0, uc + J.Mullion / 2, v1, 0, T, 'Authored'));
                }
                const lights = [], bars = [];
                for (const [s0, s1] of spans) {
                    // The leaf's stiles and rails
                    member(s0, s0 + J.Stile, v0, v1, -J.SashDepth, 0);
                    member(s1 - J.Stile, s1, v0, v1, -J.SashDepth, 0);
                    member(s0 + J.Stile, s1 - J.Stile, v1 - J.TopRail, v1, -J.SashDepth, 0);
                    member(s0 + J.Stile, s1 - J.Stile, v0, v0 + J.BottomRail, -J.SashDepth, 0);
                    // Its glass, and the bars across it
                    const g   =  { U0: s0 + J.Stile, U1: s1 - J.Stile, V0: v0 + J.BottomRail, V1: v1 - J.TopRail };
                    const pw  =  (g.U1 - g.U0 - (across - 1) * J.Bar) / across;
                    const ph  =  (g.V1 - g.V0 - (rows - 1) * J.Bar) / rows;
                    const cu  =  (i) => g.U0 + i * (pw + J.Bar), cv = (j) => g.V0 + j * (ph + J.Bar);   // <-- A pane's lower-left corner
                    lights.push(g);
                    for (let i = 1; i < across; i++) { member(cu(i) - J.Bar, cu(i), g.V0, g.V1, -GLAZING_SET - 0.01, -J.BarSet); bars.push(cu(i) - J.Bar / 2); }
                    for (let j = 1; j < rows; j++) member(g.U0, g.U1, cv(j) - J.Bar, cv(j), -GLAZING_SET - 0.01, -J.BarSet);
                    // Every pane's four arrises onto the glass: at the sash's face beside a
                    // stile or rail, at the bar's face beside a bar
                    const panes  =  [];
                    for (let j = 0; j < rows; j++) {
                        panes.push([]);
                        for (let i = 0; i < across; i++) {
                            const a = cu(i), b = a + pw, c = cv(j), d = c + ph;
                            const dL = i === 0 ? 0 : -J.BarSet, dR = i === across - 1 ? 0 : -J.BarSet;
                            const dB = j === 0 ? 0 : -J.BarSet, dT = j === rows - 1 ? 0 : -J.BarSet;
                            panes[j].push({ Left: line(a, c, a, d, dL, O, 'Hard'), Right: line(b, c, b, d, dR, O, 'Hard'), Bottom: line(a, c, b, c, dB, O, 'Hard'), Top: line(a, d, b, d, dT, O, 'Hard') });
                        }
                    }
                    for (let j = 0; j < rows; j++) for (let i = 0; i < across; i++) {
                        if (i + 1 < across) pair(panes[j][i].Right, panes[j][i + 1].Left);
                        if (j + 1 < rows) pair(panes[j][i].Top, panes[j + 1][i].Bottom);
                    }
                }
                Object.assign(w, { Lights: lights, Bars: bars, Glass: { Set: GLAZING_SET, BarHalf: J.Bar / 2, BarDepth: GLAZING_SET - J.BarSet } });   // <-- For the shadow lines: each leaf's glass and every vertical bar
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Porch's Gable - a rustic oak king-post truss
    // ------------------------------------------------------------
    function PainterlyNPR__ScenePackage__PorchTruss(K) {
        const { T, pkg, addPolyEdge, polygonPrism, PORCH, oak, porch }  =  K;

        // Framed as a carpenter frames an open oak porch: on the tie beam a king post up
        // to the ridge, two principal rafters under the roof seated on the beam, and two
        // struts from the post's foot out to the rafters, all in the gable's plane; under
        // the beam an arched brace sweeps into each post. Weathered oak, of a piece with
        // the porch. Built last, so no earlier Id moves.
        {
            const px = PORCH.X, pEave = PORCH.Eave, pTan = Math.tan(PORCH.Pitch), pCos = Math.cos(PORCH.Pitch), zf = PORCH.Z1, depth = PORCH.Depth;
            const yu    =  (x) => pEave + pTan * (px - Math.abs(x));             // <-- The roof's underside over the gable
            const kh    =  0.07, dv = 0.12 / pCos;                                // <-- The king post's half width; a 120 mm rafter, measured upright
            const face  =  (points, classes, inset, thickness) => polygonPrism({ Origin: [0, 0, zf - (inset || 0)], U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1], Points: points, Thickness: thickness || depth, EdgeClasses: classes }, porch);
            const meet  =  (p, d, q, e) => { const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / (d[0] * e[1] - d[1] * e[0]); return [p[0] + d[0] * t, p[1] + d[1] * t]; };   // <-- Where two lines cross
            // The king post, its head following the roof up to the ridge
            face([[-kh, pEave], [kh, pEave], [kh, yu(kh)], [0, yu(0)], [-kh, yu(kh)]], [null, T, null, null, T]);
            for (const s of [-1, 1]) {
                const m  =  (pts) => pts.map(([x, y]) => [s * x, y]);            // <-- Drawn for the right-hand side, mirrored for the left
                // The principal rafter: under the roof, seated on the beam, butting the post
                face(m([[kh, yu(kh)], [px, pEave], [px - dv / pTan, pEave], [kh, yu(kh) - dv]]), [T, null, T, null]);
                // The strut, rising at 45 degrees from the king post's foot to the rafter, 80 mm and set back a little
                const A  =  [kh, pEave + 0.06];
                const d  =  [Math.SQRT1_2, Math.SQRT1_2], n = [-d[1] * 0.04, d[0] * 0.04];
                const up = [A[0] + n[0], A[1] + n[1]], lo = [A[0] - n[0], A[1] - n[1]];
                const postFace = [[kh, 0], [0, 1]], rafterSoffit = [[0, yu(0) - dv], [1, -pTan]];
                face(m([meet(lo, d, ...postFace), meet(lo, d, ...rafterSoffit), meet(up, d, ...rafterSoffit), meet(up, d, ...postFace)]), [T, null, T, null], 0.02, depth - 0.04);
                // The arched brace: a quarter circle from the post into the beam's soffit
                const L = 0.42, w = 0.08, N = 6;
                const C   =  [px - PORCH.Post - L, pEave - PORCH.Beam - L];
                const on  =  (r, a) => [C[0] + r * Math.cos(a), C[1] + r * Math.sin(a)];
                for (let k = 0; k < N; k++) {
                    const a0 = (k / N) * Math.PI / 2, a1 = ((k + 1) / N) * Math.PI / 2;
                    face(m([on(L, a0), on(L, a1), on(L + w, a1), on(L + w, a0)]), null, 0.02, depth - 0.04);   // <-- Its outer ends run on into the post and beam, hidden
                }
                const arc  =  (r, a0, a1) => Array.from({ length: 13 }, (_, i) => { const p = on(r, a0 + (a1 - a0) * i / 12); return [s * p[0], p[1], zf - 0.02]; });
                addPolyEdge(porch, arc(L, 0, Math.PI / 2), T);                                                   // <-- Its soffit, post to beam
                addPolyEdge(porch, arc(L + w, Math.acos(L / (L + w)), Math.asin(L / (L + w))), T);               // <-- Its back, where it shows in the corner
            }
        }

        Object.assign(pkg.Ids, { OakCanopy: oak.Canopy.Id, OakCentre: oak.Centre });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__ScenePackage__BackOfCottage,
        PainterlyNPR__ScenePackage__Casements,
        PainterlyNPR__ScenePackage__Cottage,
        PainterlyNPR__ScenePackage__PorchTruss,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
