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
    const FACES  =  PainterlyNPR__ConfigAccess__Section(AssignConfig, 'PainterlyNPR__MaterialAssignment__Config', 'Faces', ['NormalDot', 'PlaneM', 'WeldM', 'OffsetM']);
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
        const list  =  PainterlyNPR__MaterialAssignment__Triangles(pkg).get(objectId);
        if (!list || local == null || local < 0 || local >= list.length) return null;
        const V      =  pkg.Vertices;
        const seed   =  list[local];
        const plane  =  PainterlyNPR__MaterialAssignment__Plane(V, seed);
        const weld   =  (t, k) => { const o = t * 24 + k * 8; return `${Math.round(V[o] / FACES.WeldM)},${Math.round(V[o + 1] / FACES.WeldM)},${Math.round(V[o + 2] / FACES.WeldM)}`; };
        const keysOf =  new Map();
        const byEdge =  new Map();
        for (const t of list) {
            const keys  =  [weld(t, 0), weld(t, 1), weld(t, 2)];
            keysOf.set(t, keys);
            for (let k = 0; k < 3; k++) {
                const a = keys[k], b = keys[(k + 1) % 3];
                const edge  =  a < b ? a + '|' + b : b + '|' + a;
                let on  =  byEdge.get(edge);
                if (!on) { on = []; byEdge.set(edge, on); }
                on.push(t);
            }
        }
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
        const flat       =  triangles.every(t => { const p = PainterlyNPR__MaterialAssignment__Plane(V, t); return V3Dot(p.N, plane.N) >= FACES.NormalDot && Math.abs(p.D - plane.D) <= FACES.PlaneM; });
        return { Triangles: triangles, Plane: plane, Flat: flat, Local: list.indexOf(triangles[0]) };
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
        const clip  =  (v) => {
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
            return hi > lo ? [lo - u0, hi - u0] : [0, 0];
        };
        const d       =  face.Plane.D + FACES.OffsetM;
        const origin  =  [n[0] * d + U[0] * u0 + Vv[0] * v0, n[1] * d + U[1] * u0 + Vv[1] * v0, n[2] * d + U[2] * u0 + Vv[2] * v0];
        return { Origin: origin, U: U, V: Vv, N: n, Width: u1 - u0, Height: v1 - v0, Clip: clip };
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
        PainterlyNPR__MaterialAssignment__FaceTriangles,
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
