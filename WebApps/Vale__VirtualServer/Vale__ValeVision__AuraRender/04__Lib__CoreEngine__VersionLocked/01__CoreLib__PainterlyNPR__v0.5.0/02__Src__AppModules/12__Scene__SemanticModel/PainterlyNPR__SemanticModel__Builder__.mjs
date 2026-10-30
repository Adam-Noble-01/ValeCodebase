/* =============================================================================
   PAINTERLYNPR - SCENE | SEMANTIC MODEL - BUILDER
   =============================================================================

   FILE       : PainterlyNPR__SemanticModel__Builder__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - SemanticModel - Builder
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A package builder: the records a Painterly Scene Package carries,
                and the primitives that fill them - objects, edges, surfaces,
                triangles, boxes, walls with reveals, prisms, cylinders, lumpy
                spheres and an opening's lines
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Objects carry stable Ids, materials and roles; edges are held apart from the
     triangles, each with its kind (hard, authored, smooth) and class.
   - Surfaces are what material indication works on: a rectangle in its own
     metres, with its openings. The model carries no brick geometry at all.

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
    PainterlyNPR__Maths__V3Add        as  V3Add,
    PainterlyNPR__Maths__V3Cross      as  V3Cross,
    PainterlyNPR__Maths__V3Dot        as  V3Dot,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Scale      as  V3Scale,
    PainterlyNPR__Maths__V3Sub        as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';

// =============================================================================
// REGION | Semantic Model - Builder
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Scene Package - the demo scene as a package's records
// -----------------------------------------------------------------------------

    // FUNCTION | A Package Builder - the records, and the primitives that fill them
    // ------------------------------------------------------------
    // What every part of the demo scene builds with: the package's records (pkg),
    // the scene's own fixed seed (rng) and the primitives - records, triangles,
    // boxes, walls with reveals, prisms, cylinders, lumpy spheres, mounds and an
    // opening's authored lines. The parts receive it as K and add to it.
    function PainterlyNPR__SemanticModel__CreateBuilder() {
        const pkg  =  {
            Objects      :  [],
            ObjectById   :  new Map(),
            Edges        :  [],
            Organics     :  [],
            Surfaces     :  [],
            Paths        :  [],
            Windows      :  [],
            Tufts        :  [],
            Vertices     :  [],
            CasterCount  :  0,
            BeltStart    :  0,
            VertexCount  :  0,
            Footprint    :  [4.54, 2.74],
            Ids          :  {},
        };
        const P = 0, S = 1, T = 2, O = 3;
        const rng  =  PainterlyNPR__SeededRandom__Create(7741);              // <-- The scene's own fixed seed: the "authored" model never changes with the style seed

        // SUB FUNCTION | Records
        // ------------------------------------------------------------
        function addObject(name, category, materialKey, role) {
            const material  =  MATERIAL_BY_KEY[materialKey];
            const object    =  { Id: pkg.Objects.length + 1, Name: name, Category: category, MaterialId: material.Id, MaterialKey: materialKey, Role: role };
            pkg.Objects.push(object);
            pkg.ObjectById.set(object.Id, object);
            return object;
        }

        function addEdge(object, a, b, lineClass, kind, n1, n2) {
            pkg.Edges.push({ Id: pkg.Edges.length + 1, ObjectId: object.Id, A: a, B: b, Class: lineClass, Kind: kind || 'Hard', N1: n1 || null, N2: n2 || null });
        }

        // A curve held as one line: visible runs of it become single strokes
        function addPolyEdge(object, points, lineClass) {
            pkg.Edges.push({ Id: pkg.Edges.length + 1, ObjectId: object.Id, A: points[0], B: points[points.length - 1], Points: points, Class: lineClass, Kind: 'Authored', N1: null, N2: null });
        }

        // A surface for material indication: (u, v) in metres from Origin along U and V
        function addSurface(object, pattern, origin, U, V, width, height, options) {
            const N  =  V3Normalise(V3Cross(U, V));
            pkg.Surfaces.push(Object.assign({
                Id: pkg.Surfaces.length + 1, ObjectId: object.Id, Pattern: pattern,
                Origin: V3Add(origin, V3Scale(N, 0.002)), U: U, V: V, N: N, Width: width, Height: height,
                Holes: [], Clip: null, Corners: true, Top: true, Base: true,
            }, options || {}));
        }
        // ------------------------------------------------------------

        // SUB FUNCTION | Triangles
        // ------------------------------------------------------------
        function vertex(p, n, object) {
            pkg.Vertices.push(p[0], p[1], p[2], n[0], n[1], n[2], object.Id, object.MaterialId);
        }

        function tri(a, b, c, n, object) {
            vertex(a, n, object); vertex(b, n, object); vertex(c, n, object);
        }

        function triSmooth(a, b, c, na, nb, nc, object) {
            vertex(a, na, object); vertex(b, nb, object); vertex(c, nc, object);
        }

        function quad(a, b, c, d, outward, object) {
            let n  =  V3Normalise(V3Cross(V3Sub(b, a), V3Sub(c, a)));
            if (V3Dot(n, outward) < 0) n = V3Scale(n, -1);
            tri(a, b, c, n, object);
            tri(a, c, d, n, object);
        }
        // ------------------------------------------------------------

        // SUB FUNCTION | A Box, With Its Twelve Creases by Class
        // ------------------------------------------------------------
        function box(min, max, object, classes) {
            const c  =  (i, j, k) => [i ? max[0] : min[0], j ? max[1] : min[1], k ? max[2] : min[2]];
            quad(c(0, 0, 0), c(0, 0, 1), c(0, 1, 1), c(0, 1, 0), [-1, 0, 0], object);
            quad(c(1, 0, 0), c(1, 1, 0), c(1, 1, 1), c(1, 0, 1), [ 1, 0, 0], object);
            quad(c(0, 0, 0), c(1, 0, 0), c(1, 0, 1), c(0, 0, 1), [0, -1, 0], object);
            quad(c(0, 1, 0), c(0, 1, 1), c(1, 1, 1), c(1, 1, 0), [0,  1, 0], object);
            quad(c(0, 0, 0), c(0, 1, 0), c(1, 1, 0), c(1, 0, 0), [0, 0, -1], object);
            quad(c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1), [0, 0,  1], object);
            if (!classes) return;
            const ring  =  [[0, 0], [1, 0], [1, 1], [0, 1]];
            for (let r = 0; r < 4; r++) {
                const [i0, k0]  =  ring[r];
                const [i1, k1]  =  ring[(r + 1) % 4];
                if (classes.Bottom   != null) addEdge(object, c(i0, 0, k0), c(i1, 0, k1), classes.Bottom);
                if (classes.Top      != null) addEdge(object, c(i0, 1, k0), c(i1, 1, k1), classes.Top);
                if (classes.Vertical != null) addEdge(object, c(i0, 0, k0), c(i0, 1, k0), classes.Vertical);
            }
        }
        // ------------------------------------------------------------

        // SUB FUNCTION | An Eight-Cornered Solid (the roof slopes)
        // ------------------------------------------------------------
        function hexahedron(p, object) {
            const centre  =  V3Scale(p.reduce((s, q) => V3Add(s, q), [0, 0, 0]), 1 / 8);
            const faces   =  [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
            for (const f of faces) {
                const fc  =  V3Scale(V3Add(V3Add(p[f[0]], p[f[1]]), V3Add(p[f[2]], p[f[3]])), 0.25);
                quad(p[f[0]], p[f[1]], p[f[2]], p[f[3]], V3Sub(fc, centre), object);
            }
        }
        // ------------------------------------------------------------

        // SUB FUNCTION | A Wall With Rectangular Openings and Real Reveals
        // ------------------------------------------------------------
        // The face is cut into a grid by the openings' edges and every cell outside
        // an opening is kept, so reveals are real geometry that casts real shadow
        // onto the glass. No edges: the caller authors them, as SketchUp would hold
        // them - a triangulation line is never a pen line.
        function wallWithOpenings(spec, object) {
            const { Origin, U, V, N, Width, Height, Thickness, Openings }  =  spec;
            const at      =  (u, v, w) => V3Add(V3Add(V3Add(Origin, V3Scale(U, u)), V3Scale(V, v)), V3Scale(N, w));
            const unique  =  (list) => Array.from(new Set(list.map(x => +x.toFixed(4)))).sort((a, b) => a - b);
            const us      =  unique([0, Width, ...Openings.flatMap(o => [o.U0, o.U1])]);
            const vs      =  unique([0, Height, ...Openings.flatMap(o => [o.V0, o.V1])]);
            const inside  =  (u, v) => Openings.some(o => u > o.U0 && u < o.U1 && v > o.V0 && v < o.V1);
            const back    =  V3Scale(N, -1);
            const uNeg    =  V3Scale(U, -1);
            const vNeg    =  V3Scale(V, -1);
            const t       =  Thickness;
            for (let i = 0; i < us.length - 1; i++) {
                for (let j = 0; j < vs.length - 1; j++) {
                    const u0 = us[i], u1 = us[i + 1], v0 = vs[j], v1 = vs[j + 1];
                    if (inside((u0 + u1) / 2, (v0 + v1) / 2)) continue;
                    quad(at(u0, v0, 0),  at(u1, v0, 0),  at(u1, v1, 0),  at(u0, v1, 0),  N,    object);
                    quad(at(u0, v0, -t), at(u1, v0, -t), at(u1, v1, -t), at(u0, v1, -t), back, object);
                }
            }
            for (const o of Openings) {
                quad(at(o.U0, o.V0, 0), at(o.U0, o.V1, 0), at(o.U0, o.V1, -t), at(o.U0, o.V0, -t), U,    object);
                quad(at(o.U1, o.V0, 0), at(o.U1, o.V1, 0), at(o.U1, o.V1, -t), at(o.U1, o.V0, -t), uNeg, object);
                quad(at(o.U0, o.V1, 0), at(o.U1, o.V1, 0), at(o.U1, o.V1, -t), at(o.U0, o.V1, -t), vNeg, object);
                if (o.V0 > 0) quad(at(o.U0, o.V0, 0), at(o.U1, o.V0, 0), at(o.U1, o.V0, -t), at(o.U0, o.V0, -t), V, object);
            }
            quad(at(0, Height, 0), at(Width, Height, 0), at(Width, Height, -t), at(0, Height, -t), V, object);
            quad(at(0, 0, 0), at(0, Height, 0), at(0, Height, -t), at(0, 0, -t), uNeg, object);
            quad(at(Width, 0, 0), at(Width, Height, 0), at(Width, Height, -t), at(Width, 0, -t), U, object);
            return at;
        }
        // ------------------------------------------------------------

        // SUB FUNCTION | A Prism From a Convex Polygon (gables, dormer cheeks, pickets)
        // ------------------------------------------------------------
        // EdgeClasses, when given, authors the front outline: one class (or null)
        // per polygon edge, in order.
        function polygonPrism(spec, object) {
            const { Origin, U, V, N, Thickness, EdgeClasses }  =  spec;
            let Points  =  spec.Points;
            let area    =  0;
            for (let k = 0; k < Points.length; k++) { const a = Points[k], b = Points[(k + 1) % Points.length]; area += a[0] * b[1] - b[0] * a[1]; }
            if (area < 0) Points = Points.slice().reverse();                  // <-- Counter-clockwise in (U, V), so every side's outward normal is right
            const at    =  (u, v, w) => V3Add(V3Add(V3Add(Origin, V3Scale(U, u)), V3Scale(V, v)), V3Scale(N, w));
            const back  =  V3Scale(N, -1);
            if (EdgeClasses) spec.Points.forEach((a, k) => {
                const b  =  spec.Points[(k + 1) % spec.Points.length];
                if (EdgeClasses[k] != null) addEdge(object, at(a[0], a[1], 0), at(b[0], b[1], 0), EdgeClasses[k]);
            });
            for (let k = 1; k < Points.length - 1; k++) {
                tri(at(Points[0][0], Points[0][1], 0), at(Points[k][0], Points[k][1], 0), at(Points[k + 1][0], Points[k + 1][1], 0), N, object);
                tri(at(Points[0][0], Points[0][1], -Thickness), at(Points[k + 1][0], Points[k + 1][1], -Thickness), at(Points[k][0], Points[k][1], -Thickness), back, object);
            }
            for (let k = 0; k < Points.length; k++) {
                const a        =  Points[k];
                const b        =  Points[(k + 1) % Points.length];
                const outward  =  V3Add(V3Scale(U, b[1] - a[1]), V3Scale(V, a[0] - b[0]));
                quad(at(a[0], a[1], 0), at(b[0], b[1], 0), at(b[0], b[1], -Thickness), at(a[0], a[1], -Thickness), outward, object);
            }
        }
        // ------------------------------------------------------------

        // SUB FUNCTION | A Cylinder or Cone - smooth sides, silhouettes only
        // ------------------------------------------------------------
        // Each side edge is SMOOTH and carries its two facet normals, so the line
        // stage can ask "is this a silhouette from here?" - a pipe gives its two
        // profile lines and never its sixteen facets (manifest section 04).
        function cylinder(spec, object) {
            const { Base, Axis, R0, R1, Height, Segments, RimBottom, RimTop, Silhouette, CapTop, CapBottom }  =  spec;
            const a       =  V3Normalise(Axis);
            const ref     =  Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
            const ux      =  V3Normalise(V3Cross(a, ref));
            const uy      =  V3Cross(a, ux);
            const top     =  V3Add(Base, V3Scale(a, Height));
            const radial  =  (t) => V3Add(V3Scale(ux, Math.cos(t)), V3Scale(uy, Math.sin(t)));
            const slope   =  (R0 - R1) / Height;
            const nAt     =  (t) => V3Normalise(V3Add(radial(t), V3Scale(a, slope)));
            const bottoms = [], tops = [], normals = [], facets = [];
            for (let k = 0; k < Segments; k++) {
                const t  =  (k / Segments) * Math.PI * 2;
                bottoms.push(V3Add(Base, V3Scale(radial(t), R0)));
                tops.push(V3Add(top, V3Scale(radial(t), R1)));
                normals.push(nAt(t));
                facets.push(nAt(((k + 0.5) / Segments) * Math.PI * 2));
            }
            for (let k = 0; k < Segments; k++) {
                const k1  =  (k + 1) % Segments;
                triSmooth(bottoms[k], bottoms[k1], tops[k1], normals[k], normals[k1], normals[k1], object);
                triSmooth(bottoms[k], tops[k1], tops[k], normals[k], normals[k1], normals[k], object);
                if (CapTop)    tri(top, tops[k], tops[k1], a, object);
                if (CapBottom) tri(Base, bottoms[k1], bottoms[k], V3Scale(a, -1), object);
                if (Silhouette != null) addEdge(object, bottoms[k], tops[k], Silhouette, 'Smooth', facets[(k - 1 + Segments) % Segments], facets[k]);
                if (RimBottom  != null) addEdge(object, bottoms[k], bottoms[k1], RimBottom);
                if (RimTop     != null) addEdge(object, tops[k], tops[k1], RimTop);
            }
            return { Ring: (h, r) => (t) => V3Add(V3Add(Base, V3Scale(a, h)), V3Scale(radial(t), r)) };
        }
        // ------------------------------------------------------------

        // SUB FUNCTION | A Lumpy Icosphere (foliage masses, the distant belt)
        // ------------------------------------------------------------
        function icosphere(centre, radius, scale, subdivisions, object, lumpRng, lump) {
            const g  =  (1 + Math.sqrt(5)) / 2;
            const verts  =  [[-1, g, 0], [1, g, 0], [-1, -g, 0], [1, -g, 0], [0, -1, g], [0, 1, g], [0, -1, -g], [0, 1, -g], [g, 0, -1], [g, 0, 1], [-g, 0, -1], [-g, 0, 1]].map(V3Normalise);
            let faces    =  [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
            for (let s = 0; s < subdivisions; s++) {
                const cache  =  new Map();
                const mid    =  (i, j) => {
                    const key  =  i < j ? i + '_' + j : j + '_' + i;
                    if (cache.has(key)) return cache.get(key);
                    verts.push(V3Normalise(V3Add(verts[i], verts[j])));
                    cache.set(key, verts.length - 1);
                    return verts.length - 1;
                };
                const next  =  [];
                for (const [a, b, c] of faces) {
                    const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
                    next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
                }
                faces  =  next;
            }
            const lobes  =  [];
            for (let i = 0; i < 5; i++) lobes.push({ D: V3Normalise([lumpRng.Spread(1), lumpRng.Spread(1), lumpRng.Spread(1)]), F: lumpRng.Range(1.6, 3.4), P: lumpRng.Range(0, 6.283), A: lumpRng.Range(0.4, 1.0) });
            const pos  =  verts.map(v => {
                let k  =  0;
                for (const l of lobes) k += l.A * Math.sin(l.F * V3Dot(v, l.D) * 3 + l.P);
                const r  =  radius * (1 + lump * k / lobes.length);
                return [centre[0] + v[0] * r * scale[0], centre[1] + v[1] * r * scale[1], centre[2] + v[2] * r * scale[2]];
            });
            const nrm  =  pos.map(() => [0, 0, 0]);
            for (const [a, b, c] of faces) {
                const n  =  V3Cross(V3Sub(pos[b], pos[a]), V3Sub(pos[c], pos[a]));
                for (const i of [a, b, c]) { nrm[i][0] += n[0]; nrm[i][1] += n[1]; nrm[i][2] += n[2]; }
            }
            for (let i = 0; i < nrm.length; i++) {
                nrm[i]  =  V3Normalise(nrm[i]);
                if (V3Dot(nrm[i], V3Sub(pos[i], centre)) < 0) nrm[i] = V3Scale(nrm[i], -1);
            }
            for (const [a, b, c] of faces) triSmooth(pos[a], pos[b], pos[c], nrm[a], nrm[b], nrm[c], object);
        }
        // ------------------------------------------------------------

        // SUB FUNCTION | A Mound of Foliage Masses
        // ------------------------------------------------------------
        function mound(centre, width, height, count, seedLabel) {
            const r       =  PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(7741, seedLabel));
            const masses  =  [{ C: [centre[0], centre[1] + height - width * 0.3, centre[2]], R: width * 0.3 }];
            for (let i = 1; i < count; i++) {
                const angle   =  r.Range(0, Math.PI * 2);
                const reach   =  Math.sqrt(r.Next()) * width * 0.32;
                const radius  =  r.Range(0.24, 0.36) * width;
                const dome    =  Math.max(0, 1 - Math.pow(reach / (width * 0.5), 2));
                const y       =  Math.max(radius * 0.6, (height - radius) * dome * r.Range(0.65, 1.0));
                masses.push({ C: [centre[0] + Math.cos(angle) * reach, centre[1] + y, centre[2] + Math.sin(angle) * reach], R: radius });
            }
            return masses;
        }
        // ------------------------------------------------------------

        // SUB FUNCTION | An Opening's Authored Lines, and Its Window Record
        // ------------------------------------------------------------
        // The arris round the opening, the line where the reveal meets the frame and
        // the frame's joint with its sashes: lines drawn on faces, exactly as SketchUp
        // carries them. The record keeps the joinery's face plane (the back of the
        // reveal), the reveal's depth and the casement's panes, so the joinery - built
        // at the end of the scene - and the shadow lines are made from it. The glazing
        // bars once drawn on the glass are retired in place, not removed: the modelled
        // bars draw their own, and every later edge keeps its Id (and so its seed).
        function openingLines(at, o, object, reveal, columns, rows) {
            const f  =  0.055;
            const loop  =  (w, inset, cls, kind) => {
                const a = at(o.U0 + inset, o.V0 + inset, w), b = at(o.U1 - inset, o.V0 + inset, w), c = at(o.U1 - inset, o.V1 - inset, w), d = at(o.U0 + inset, o.V1 - inset, w);
                addEdge(object, a, b, cls, kind); addEdge(object, b, c, cls, kind); addEdge(object, c, d, cls, kind); addEdge(object, d, a, cls, kind);
            };
            loop(0, 0, S, 'Hard');
            loop(-reveal, 0, O, 'Hard');
            loop(-reveal, f, T, 'Authored');
            const retire  =  () => { pkg.Edges[pkg.Edges.length - 1].Retired = true; };
            for (let k = 1; k < columns; k++) {
                const u  =  o.U0 + f + (k / columns) * (o.U1 - o.U0 - 2 * f);
                addEdge(object, at(u, o.V0 + f, -reveal), at(u, o.V1 - f, -reveal), T, 'Authored');
                retire();
            }
            for (let k = 1; k < rows; k++) {
                const v  =  o.V0 + f + (k / rows) * (o.V1 - o.V0 - 2 * f);
                addEdge(object, at(o.U0 + f, v, -reveal), at(o.U1 - f, v, -reveal), T, 'Authored');
                retire();
            }
            const origin  =  at(0, 0, -reveal);
            pkg.Windows.push({ ObjectId: object.Id, Origin: origin, U: V3Sub(at(1, 0, -reveal), origin), V: V3Sub(at(0, 1, -reveal), origin), N: V3Sub(at(0, 0, 1 - reveal), origin),
                               U0: o.U0, U1: o.U1, V0: o.V0, V1: o.V1, Reveal: reveal, Frame: f, Bars: [], Rails: [], Casement: { Columns: columns, Rows: rows } });   // <-- Bars and the panes' glass are filled in by the joinery
        }
        // ------------------------------------------------------------

        return { O, P, S, T, pkg, rng, addEdge, addObject, addPolyEdge, addSurface, box, cylinder, hexahedron, icosphere, mound, openingLines,
                 polygonPrism, quad, tri, triSmooth, vertex, wallWithOpenings };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__SemanticModel__CreateBuilder,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
