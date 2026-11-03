/* =============================================================================
   PAINTERLYNPR - SCENE | MATERIAL ASSIGNMENT - OBJECTS AND FACES
   =============================================================================

   FILE       : PainterlyNPR__MaterialAssignment__Faces__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Scene - MaterialAssignment - Faces
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What a material is given to: an object by a key that survives a
                rebuild, and a face - the triangles of one object that lie in one
                plane and join edge to edge, as SketchUp has them - found from a
                picked triangle
   CREATED    : 30-Oct-2026 (v0.7.0)

   DESCRIPTION:
   - An object's key: '#Id' for the scene's own objects (their Ids never move),
     'Uid.Part' for a placed asset's (A0003.0 the oak's canopy, A0003.1 its
     trunk), so a plop removed before another never moves the other's key.
   - A face's key: the object's key and the place, among that object's own
     triangles, of the one picked. The scene is built the same way every time,
     so the same place is the same triangle; the face is found again from it.
   - A triangle t is the scene's vertices 3t to 3t + 2: 24 floats, an object's
     triangles never sharing a triangle with another's.

   ============================================================================= */

import AssignConfig from './Na__MaterialAssignment__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__Maths__V3Cross      as  V3Cross,
    PainterlyNPR__Maths__V3Dot        as  V3Dot,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Sub        as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';

// =============================================================================
// REGION | Material Assignment - Objects and Faces
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__MaterialAssignment__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const FACES  =  PainterlyNPR__ConfigAccess__Section(AssignConfig, 'PainterlyNPR__MaterialAssignment__Config', 'Faces', ['NormalDot', 'PlaneM', 'WeldM', 'OffsetM', 'UprightNy', 'LevelNy', 'MaskCellM', 'MaskReachM', 'MaskWallM2']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Objects
// -----------------------------------------------------------------------------

    // FUNCTION | An Object's Key, and the Object a Key Names in a Package
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__ObjectKey(object) {
        return object.Uid ? `${object.Uid}.${object.Part}` : `#${object.Id}`;
    }

    function PainterlyNPR__MaterialAssignment__ResolveObject(pkg, key) {
        if (!key) return null;
        if (key[0] === '#') return pkg.ObjectById.get(Number(key.slice(1))) || null;
        const [uid, part]  =  key.split('.');
        for (let i = pkg.Objects.length - 1; i >= 0; i--) {
            const object  =  pkg.Objects[i];
            if (object.Uid === uid && String(object.Part) === part) return object;
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Object's Triangles - made once per package and kept on it
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__Triangles(pkg) {
        if (pkg.TrianglesByObject) return pkg.TrianglesByObject;
        const V      =  pkg.Vertices;
        const lists  =  new Map();
        for (let t = 0, n = V.length / 24; t < n; t++) {
            const id  =  V[t * 24 + 6];
            let list  =  lists.get(id);
            if (!list) { list = []; lists.set(id, list); }
            list.push(t);
        }
        pkg.TrianglesByObject  =  lists;
        return lists;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Faces
// -----------------------------------------------------------------------------

    // FUNCTION | A Triangle's Corners and Plane
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__Corners(V, t) {
        const o  =  t * 24;
        return [[V[o], V[o + 1], V[o + 2]], [V[o + 8], V[o + 9], V[o + 10]], [V[o + 16], V[o + 17], V[o + 18]]];
    }

    // The builder's quads keep their corners' order and turn only the stored
    // normal outward, so the plane's normal is turned to agree with the stored
    // ones: every face's normal points out of its object.
    function PainterlyNPR__MaterialAssignment__Plane(V, t) {
        const [a, b, c]  =  PainterlyNPR__MaterialAssignment__Corners(V, t);
        let n  =  V3Normalise(V3Cross(V3Sub(b, a), V3Sub(c, a)));
        const o  =  t * 24;
        const stored  =  [V[o + 3] + V[o + 11] + V[o + 19], V[o + 4] + V[o + 12] + V[o + 20], V[o + 5] + V[o + 13] + V[o + 21]];
        if (V3Dot(n, stored) < 0) n = [-n[0], -n[1], -n[2]];
        return { N: n, D: V3Dot(n, a) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Pick the Triangle a Ray Meets First, Among One Object's
    // ------------------------------------------------------------
    // Moller and Trumbore's test, both sides. Returns the triangle's place among
    // the object's own (the face key) and the distance along the ray, or null.
    function PainterlyNPR__MaterialAssignment__PickTriangle(pkg, objectId, origin, dir) {
        const list  =  PainterlyNPR__MaterialAssignment__Triangles(pkg).get(objectId);
        if (!list) return null;
        const V  =  pkg.Vertices;
        let best  =  null;
        for (let k = 0; k < list.length; k++) {
            const [a, b, c]  =  PainterlyNPR__MaterialAssignment__Corners(V, list[k]);
            const e1  =  V3Sub(b, a), e2 = V3Sub(c, a);
            const p   =  V3Cross(dir, e2);
            const det =  V3Dot(e1, p);
            if (Math.abs(det) < 1e-12) continue;
            const inv =  1 / det;
            const s   =  V3Sub(origin, a);
            const u   =  V3Dot(s, p) * inv;
            if (u < 0 || u > 1) continue;
            const q   =  V3Cross(s, e1);
            const v   =  V3Dot(dir, q) * inv;
            if (v < 0 || u + v > 1) continue;
            const t   =  V3Dot(e2, q) * inv;
            if (t > 1e-6 && (!best || t < best.T)) best = { Local: k, T: t };
        }
        return best;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Object's Triangles Joined by Their Edges - made once per package and kept on it
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__Joins(pkg, objectId) {
        if (!pkg.FaceJoins) pkg.FaceJoins = new Map();
        const kept  =  pkg.FaceJoins.get(objectId);
        if (kept) return kept;
        const list   =  PainterlyNPR__MaterialAssignment__Triangles(pkg).get(objectId);
        if (!list) return null;
        const V      =  pkg.Vertices;
        const weld   =  (t, k) => { const o = t * 24 + k * 8; return `${Math.round(V[o] / FACES.WeldM)},${Math.round(V[o + 1] / FACES.WeldM)},${Math.round(V[o + 2] / FACES.WeldM)}`; };
        const keysOf =  new Map();
        const byEdge =  new Map();
        const places =  new Map();
        list.forEach((t, place) => {
            places.set(t, place);
            const keys  =  [weld(t, 0), weld(t, 1), weld(t, 2)];
            keysOf.set(t, keys);
            for (let k = 0; k < 3; k++) {
                const a = keys[k], b = keys[(k + 1) % 3];
                const edge  =  a < b ? a + '|' + b : b + '|' + a;
                let on  =  byEdge.get(edge);
                if (!on) { on = []; byEdge.set(edge, on); }
                on.push(t);
            }
        });
        const joins  =  { List: list, KeysOf: keysOf, ByEdge: byEdge, Places: places };
        pkg.FaceJoins.set(objectId, joins);
        return joins;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Face a Triangle Belongs To - joined edge to edge, as SketchUp joins them
    // ------------------------------------------------------------
    // From the triangle at place `local` among the object's: every triangle of the
    // object reached across shared edges where the two sides agree on the normal
    // at both ends - flat triangles in one plane, or a smooth surface (a pot's
    // side, a pipe), never across a crease. Returns the scene triangles, the
    // picked triangle's plane, whether the face is flat (only a flat face takes
    // courses of its own) and its place: the lowest place among its triangles,
    // the same whichever of them was picked.
    function PainterlyNPR__MaterialAssignment__FaceTriangles(pkg, objectId, local) {
        const joins  =  PainterlyNPR__MaterialAssignment__Joins(pkg, objectId);
        if (!joins || local == null || local < 0 || local >= joins.List.length) return null;
        const { List: list, KeysOf: keysOf, ByEdge: byEdge, Places: places }  =  joins;
        const V      =  pkg.Vertices;
        const seed   =  list[local];
        const normalAt  =  (t, key) => {
            const k  =  keysOf.get(t).indexOf(key);
            const o  =  t * 24 + k * 8;
            return [V[o + 3], V[o + 4], V[o + 5]];
        };
        const agree  =  (t, u, key) => V3Dot(normalAt(t, key), normalAt(u, key)) >= FACES.NormalDot;
        const face  =  new Set([seed]);
        const todo  =  [seed];
        while (todo.length) {
            const t     =  todo.pop();
            const keys  =  keysOf.get(t);
            for (let k = 0; k < 3; k++) {
                const a = keys[k], b = keys[(k + 1) % 3];
                for (const u of byEdge.get(a < b ? a + '|' + b : b + '|' + a) || []) {
                    if (face.has(u) || !agree(t, u, a) || !agree(t, u, b)) continue;
                    face.add(u);
                    todo.push(u);
                }
            }
        }
        const triangles  =  [...face].sort((x, y) => x - y);

        // A sliver has no plane to disagree: SketchUp's tessellation leaves zero-area
        // triangles along collinear corners, and one of them must not make a whole
        // face "not flat" (Thrower's 80 m2 of painted paving, v0.8.22). The plane is
        // the picked triangle's, or the first with one
        const planeOf    =  (t) => { const p = PainterlyNPR__MaterialAssignment__Plane(V, t); return V3Dot(p.N, p.N) > 0.5 ? p : null; };
        const plane      =  planeOf(seed) || triangles.map(planeOf).find(Boolean) || PainterlyNPR__MaterialAssignment__Plane(V, seed);
        const flat       =  triangles.every(t => { const p = planeOf(t); return !p || (V3Dot(p.N, plane.N) >= FACES.NormalDot && Math.abs(p.D - plane.D) <= FACES.PlaneM); });
        return { Triangles: triangles, Plane: plane, Flat: flat, Local: places.get(triangles[0]) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Flat Face of an Object - with its area and how far it rises
    // ------------------------------------------------------------
    // Walked through the object's triangles once, each face met by its first.
    function PainterlyNPR__MaterialAssignment__FlatFaces(pkg, objectId) {
        const joins  =  PainterlyNPR__MaterialAssignment__Joins(pkg, objectId);
        if (!joins) return [];
        const V      =  pkg.Vertices;
        const seen   =  new Set();
        const faces  =  [];
        joins.List.forEach((t, place) => {
            if (seen.has(t)) return;
            const face  =  PainterlyNPR__MaterialAssignment__FaceTriangles(pkg, objectId, place);
            let area    =  0;
            let lo = Infinity, hi = -Infinity;
            for (const u of face.Triangles) {
                seen.add(u);
                const [a, b, c]  =  PainterlyNPR__MaterialAssignment__Corners(V, u);
                const n  =  V3Cross(V3Sub(b, a), V3Sub(c, a));
                area += Math.hypot(n[0], n[1], n[2]) / 2;
                lo = Math.min(lo, a[1], b[1], c[1]);
                hi = Math.max(hi, a[1], b[1], c[1]);
            }
            if (face.Flat) faces.push(Object.assign(face, { Area: area, Rise: hi - lo }));
        });
        return faces;
    }
    // ------------------------------------------------------------


    // FUNCTION | Does a Flat Face Suit a Pattern? - its slope and its size
    // ------------------------------------------------------------
    // Either way up: a SketchUp face is often modelled back to front.
    function PainterlyNPR__MaterialAssignment__FaceSuits(face, rule) {
        const ny     =  Math.abs(face.Plane.N[1]);
        const slope  =  rule.Slope === 'Upright' ? ny <= FACES.UprightNy : rule.Slope === 'Level' ? ny >= FACES.LevelNy : ny < FACES.LevelNy;
        return slope && face.Area >= rule.MinAreaM2 && face.Rise >= rule.MinHeightM;
    }
    // ------------------------------------------------------------


    // FUNCTION | Pick a Face - the triangle a ray meets first, and its whole face
    // ------------------------------------------------------------
    function PainterlyNPR__MaterialAssignment__PickFace(pkg, objectId, origin, dir) {
        const hit  =  PainterlyNPR__MaterialAssignment__PickTriangle(pkg, objectId, origin, dir);
        return hit ? PainterlyNPR__MaterialAssignment__FaceTriangles(pkg, objectId, hit.Local) : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Face's Own Axes and Extent - for courses laid on it
    // ------------------------------------------------------------
    // U level along the face (or world x on a level face), V up its slope; the
    // corners in (u, v) metres, the extent, and a clip giving each course's span
    // between the face's outermost edges at that height.
    function PainterlyNPR__MaterialAssignment__FaceFrame(pkg, face) {
        const V   =  pkg.Vertices;
        const n   =  face.Plane.N;
        const U   =  Math.abs(n[1]) < 0.9 ? V3Normalise(V3Cross([0, 1, 0], n)) : [1, 0, 0];
        const Vv  =  V3Normalise(V3Cross(n, U));
        const flat  =  face.Triangles.map(t => PainterlyNPR__MaterialAssignment__Corners(V, t).map(p => [V3Dot(p, U), V3Dot(p, Vv)]));
        let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
        for (const tri of flat) for (const [u, v] of tri) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
        let lastV = null, lastRange = null;                                    // <-- Asked again and again for one course, a unit at a time
        const clip  =  (v) => {
            if (v === lastV) return lastRange;
            lastV  =  v;
            const at  =  v + v0;
            let lo = Infinity, hi = -Infinity;
            for (const tri of flat) {
                for (let k = 0; k < 3; k++) {
                    const p = tri[k], q = tri[(k + 1) % 3];
                    if ((p[1] - at) * (q[1] - at) > 0 || p[1] === q[1]) continue;
                    const u  =  p[0] + (q[0] - p[0]) * (at - p[1]) / (q[1] - p[1]);
                    lo = Math.min(lo, u); hi = Math.max(hi, u);
                }
            }
            lastRange  =  hi > lo ? [lo - u0, hi - u0] : [0, 0];
            return lastRange;
        };
        const d       =  face.Plane.D + FACES.OffsetM;
        const origin  =  [n[0] * d + U[0] * u0 + Vv[0] * v0, n[1] * d + U[1] * u0 + Vv[1] * v0, n[2] * d + U[2] * u0 + Vv[2] * v0];
        return { Origin: origin, U: U, V: Vv, N: n, Width: u1 - u0, Height: v1 - v0, Clip: clip };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Every Line a Face Might Have to Keep Off - made once per package and kept on it
    // ------------------------------------------------------------
    // Six numbers to a line: a face walks all of them, and a model has many faces.
    function PainterlyNPR__MaterialAssignment__MaskEdges(pkg) {
        if (pkg.MaskEdges) return pkg.MaskEdges;
        const lines  =  pkg.Edges.filter(e => !e.Retired && e.Kind !== 'Smooth');
        const out    =  new Float64Array(lines.length * 6);
        lines.forEach((e, k) => { out.set(e.A, k * 6); out.set(e.B, k * 6 + 3); });
        pkg.MaskEdges  =  out;
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | What Is Clear on a Face - where a material's marks may be laid on it
    // ------------------------------------------------------------
    // A grid over the face's frame, cell by cell: inside one of its triangles, and
    // not on a line lying on or near its plane, nor (rule.MaskCloseCells) next to
    // one. A whitecard's wall is often one flat rectangle with its windows and
    // quoins only drawn on it (Thrower's are), so the face alone cannot say. Any
    // object's lines count: a wall painted in SketchUp is its own bucket, and its
    // container's lines belong to the largest bucket (10, GlbTwinPairs). With
    // rule.OutlineCloses off, a line along the face's own outline shuts nothing, so
    // courses run right up to its edge: a plinth two courses high has nothing else.
    // What is left falls into patches; only those big enough to be open wall count
    // (rule.MaskMinM2, rule.MaskMinShare), so the panes of a window and the blocks
    // of a quoin, shut in by their own lines, take nothing. Returns
    // { Cell, Nu, Nv, Grid } (1: open wall).
    function PainterlyNPR__MaterialAssignment__FaceMask(pkg, face, frame, rule) {
        const V     =  pkg.Vertices;
        const cell  =  FACES.MaskCellM;
        const Nu    =  Math.max(1, Math.ceil(frame.Width / cell));
        const Nv    =  Math.max(1, Math.ceil(frame.Height / cell));
        const grid  =  new Uint8Array(Nu * Nv);
        const toUv  =  (p) => { const q = V3Sub(p, frame.Origin); return [V3Dot(q, frame.U), V3Dot(q, frame.V)]; };

        // Inside the face: a cell whose middle lies in one of its triangles
        for (const t of face.Triangles) {
            const [a, b, c]  =  PainterlyNPR__MaterialAssignment__Corners(V, t).map(toUv);
            const j0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]) / cell)), j1 = Math.min(Nv - 1, Math.floor(Math.max(a[1], b[1], c[1]) / cell));
            const i0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]) / cell)), i1 = Math.min(Nu - 1, Math.floor(Math.max(a[0], b[0], c[0]) / cell));
            const area  =  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
            if (Math.abs(area) < 1e-9) continue;
            for (let j = j0; j <= j1; j++) {
                const y  =  (j + 0.5) * cell;
                for (let i = i0; i <= i1; i++) {
                    const x   =  (i + 0.5) * cell;
                    const w0  =  ((b[0] - x) * (c[1] - y) - (b[1] - y) * (c[0] - x)) / area;
                    const w1  =  ((c[0] - x) * (a[1] - y) - (c[1] - y) * (a[0] - x)) / area;
                    if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) grid[j * Nu + i] = 1;
                }
            }
        }

        // The lines near the plane close off the cells they cross, and as far round as the rule says
        const n       =  face.Plane.N;
        const D       =  face.Plane.D;
        const reach   =  rule.MaskCloseCells;
        const inside  =  rule.OutlineCloses ? null : grid.slice();
        const close   =  (i, j) => { for (let y = j - reach; y <= j + reach; y++) for (let x = i - reach; x <= i + reach; x++) if (x >= 0 && y >= 0 && x < Nu && y < Nv) grid[y * Nu + x] = 0; };
        const onRim   =  (i, j) => {
            for (let y = j - 1; y <= j + 1; y++) for (let x = i - 1; x <= i + 1; x++) if (x < 0 || y < 0 || x >= Nu || y >= Nv || !inside[y * Nu + x]) return true;
            return false;
        };
        const edges   =  PainterlyNPR__MaterialAssignment__MaskEdges(pkg);
        for (let e = 0; e < edges.length; e += 6) {
            const ax = edges[e], ay = edges[e + 1], az = edges[e + 2], bx = edges[e + 3], by = edges[e + 4], bz = edges[e + 5];
            if (Math.abs(ax * n[0] + ay * n[1] + az * n[2] - D) > FACES.MaskReachM || Math.abs(bx * n[0] + by * n[1] + bz * n[2] - D) > FACES.MaskReachM) continue;
            const a = toUv([ax, ay, az]), b = toUv([bx, by, bz]);
            if ((a[0] < -cell && b[0] < -cell) || (a[1] < -cell && b[1] < -cell) || (a[0] > frame.Width + cell && b[0] > frame.Width + cell) || (a[1] > frame.Height + cell && b[1] > frame.Height + cell)) continue;   // <-- Nowhere near this face: no walking its length
            const steps  =  Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (cell * 0.5)));
            for (let s = 0; s <= steps; s++) {
                const i  =  Math.floor((a[0] + (b[0] - a[0]) * s / steps) / cell);
                const j  =  Math.floor((a[1] + (b[1] - a[1]) * s / steps) / cell);
                if (i >= -1 && j >= -1 && i <= Nu && j <= Nv && (!inside || !onRim(i, j))) close(i, j);
            }
        }

        // The patches left, flooded one by one; those too small are shut as well
        const patch   =  new Int32Array(Nu * Nv);
        const sizes   =  [0];
        for (let start = 0; start < grid.length; start++) {
            if (!grid[start] || patch[start]) continue;
            const id     =  sizes.length;
            const stack  =  [start];
            let size     =  0;
            patch[start] =  id;
            while (stack.length) {
                const at  =  stack.pop();
                size++;
                const i = at % Nu, j = (at - i) / Nu;
                if (i > 0 && grid[at - 1] && !patch[at - 1]) { patch[at - 1] = id; stack.push(at - 1); }
                if (i < Nu - 1 && grid[at + 1] && !patch[at + 1]) { patch[at + 1] = id; stack.push(at + 1); }
                if (j > 0 && grid[at - Nu] && !patch[at - Nu]) { patch[at - Nu] = id; stack.push(at - Nu); }
                if (j < Nv - 1 && grid[at + Nu] && !patch[at + Nu]) { patch[at + Nu] = id; stack.push(at + Nu); }
            }
            sizes.push(size);
        }
        const largest  =  Math.max(...sizes);
        const least    =  Math.max(rule.MaskMinM2, Math.min(rule.MaskMinShare * largest * cell * cell, FACES.MaskWallM2)) / (cell * cell);
        for (let at = 0; at < grid.length; at++) if (grid[at] && sizes[patch[at]] < least) grid[at] = 0;
        return { Cell: cell, Nu, Nv, Grid: grid };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__MaterialAssignment__Corners,
        PainterlyNPR__MaterialAssignment__FaceFrame,
        PainterlyNPR__MaterialAssignment__FaceMask,
        PainterlyNPR__MaterialAssignment__FaceSuits,
        PainterlyNPR__MaterialAssignment__FaceTriangles,
        PainterlyNPR__MaterialAssignment__FlatFaces,
        PainterlyNPR__MaterialAssignment__ObjectKey,
        PainterlyNPR__MaterialAssignment__PickFace,
        PainterlyNPR__MaterialAssignment__PickTriangle,
        PainterlyNPR__MaterialAssignment__Plane,
        PainterlyNPR__MaterialAssignment__ResolveObject,
        PainterlyNPR__MaterialAssignment__Triangles,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
