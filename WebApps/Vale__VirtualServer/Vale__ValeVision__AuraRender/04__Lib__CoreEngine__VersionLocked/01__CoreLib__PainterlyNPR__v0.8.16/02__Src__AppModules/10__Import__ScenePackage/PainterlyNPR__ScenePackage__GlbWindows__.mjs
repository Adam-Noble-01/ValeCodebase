/* =============================================================================
   PAINTERLYNPR - SCENE PACKAGE | GLB SCENES - WINDOWS FROM THE GLASS
   =============================================================================

   FILE       : PainterlyNPR__ScenePackage__GlbWindows__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : ScenePackage - GlbWindows
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A project's own model's panes of glass made into the window
                records the shadow lines draw from: each pane's plane and size,
                what stands in front of it beside each upright edge, and the
                glazing bars standing in front of one sheet of glass
   CREATED    : 30-Oct-2026 (v0.8.16)

   DESCRIPTION:
   - Adam, 30-Oct-2026, on the window shadows a project's whitecard never had:
     "Naming from sketchup and using the SSOT Windows tags (there is one for
     existing and proposed) same with doors so use a tipple method
     tag/material/naming".
   - THE GLASS is every triangle of the model's own objects whose class is
     Glass once the package is packed and the drawing's material assignments
     are applied: recognised by tag, material or name (Glb), set on a whole
     object by the host, or given to a face in the Materials tab. So it is
     read from the packed vertices, after Build's ApplyAll.
   - A PANE is the glass's triangles joined across shared sides while they
     face the same way. It faces out of the building (away from the middle of
     the buildings' shadow square); of the two faces of one sheet of glass the
     outer is kept.
   - WHAT CASTS: beyond each upright edge the model is probed straight in
     towards the glass at a few offsets and heights; each offset keeps the
     depth in front of the glass at its middle height. The shadow-line pass
     sizes the stroke from them with the real sun: the furthest any of them
     reaches onto the glass (depth x slant - offset). A side with nothing in
     front casts nothing.
   - GLAZING BARS standing in front of one sheet of glass are found by rows of
     probes across the pane: a narrow run in front of the glass in two rows is
     a bar, with its middle, half width and depth.
   - The demo cottage's records are its own (Cottage, Casements): this runs for
     a GLB scene only, and only over the model's own objects (never the lawn,
     the belt or a placed asset).

   ============================================================================= */

import GlbScenesConfig from './Na__GlbScenes__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__Maths__V3Add        as  V3Add,
    PainterlyNPR__Maths__V3Cross      as  V3Cross,
    PainterlyNPR__Maths__V3Dot        as  V3Dot,
    PainterlyNPR__Maths__V3Normalise  as  V3Normalise,
    PainterlyNPR__Maths__V3Scale      as  V3Scale,
    PainterlyNPR__Maths__V3Sub        as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';

// =============================================================================
// REGION | GLB Scenes - Windows From the Glass
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__GlbScenes__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const WINDOWS  =  PainterlyNPR__ConfigAccess__Section(GlbScenesConfig, 'PainterlyNPR__GlbScenes__Config', 'Windows', ['Windows']).Windows;
    const STRIDE   =  24;                                                   // <-- Floats a packed triangle: three vertices of position, normal, object id, material id
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Probing the Model
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | What Stands in Front: the Casters (every non-glass triangle of the model's own objects) and Their Boxes
    // ------------------------------------------------------------
    function PainterlyNPR__GlbWindows__Casters(V, list) {
        const tris   =  new Float64Array(list.length * 9);
        const boxes  =  new Float64Array(list.length * 6);
        list.forEach((t, k) => {
            for (let c = 0; c < 3; c++) for (let i = 0; i < 3; i++) tris[k * 9 + c * 3 + i] = V[t * STRIDE + c * 8 + i];
            for (let i = 0; i < 3; i++) {
                const a = tris[k * 9 + i], b = tris[k * 9 + 3 + i], c = tris[k * 9 + 6 + i];
                boxes[k * 6 + i]      =  Math.min(a, b, c);
                boxes[k * 6 + 3 + i]  =  Math.max(a, b, c);
            }
        });
        return { Tris: tris, Boxes: boxes, Count: list.length };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Casters Whose Boxes Meet a Box: their indexes
    // ------------------------------------------------------------
    function PainterlyNPR__GlbWindows__Near(casters, min, max) {
        const out  =  [];
        const B    =  casters.Boxes;
        for (let k = 0; k < casters.Count; k++) {
            const o  =  k * 6;
            if (B[o] > max[0] || B[o + 3] < min[0] || B[o + 1] > max[1] || B[o + 4] < min[1] || B[o + 2] > max[2] || B[o + 5] < min[2]) continue;
            out.push(k);
        }
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Nearest Hit Along a Ray Among Some Casters (Moller-Trumbore, both faces): its distance, or Infinity
    // ------------------------------------------------------------
    function PainterlyNPR__GlbWindows__Cast(casters, near, o, d, maxT) {
        const T  =  casters.Tris;
        let best  =  Infinity;
        for (const k of near) {
            const a  =  k * 9;
            const e1x = T[a + 3] - T[a], e1y = T[a + 4] - T[a + 1], e1z = T[a + 5] - T[a + 2];
            const e2x = T[a + 6] - T[a], e2y = T[a + 7] - T[a + 1], e2z = T[a + 8] - T[a + 2];
            const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
            const det  =  e1x * px + e1y * py + e1z * pz;
            if (Math.abs(det) < 1e-12) continue;
            const inv  =  1 / det;
            const sx = o[0] - T[a], sy = o[1] - T[a + 1], sz = o[2] - T[a + 2];
            const u  =  (sx * px + sy * py + sz * pz) * inv;
            if (u < 0 || u > 1) continue;
            const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
            const v  =  (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
            if (v < 0 || u + v > 1) continue;
            const t  =  (e2x * qx + e2y * qy + e2z * qz) * inv;
            if (t > 1e-6 && t < maxT && t < best) best = t;
        }
        return best;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Panes
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Glass's Triangles Joined Into Panes: [[triangle index ...] ...]
    // ------------------------------------------------------------
    // Joined across a shared side (corners welded) while they face the same way.
    function PainterlyNPR__GlbWindows__Group(V, glass) {
        const weld    =  1 / WINDOWS.WeldM;
        const key     =  (t, c) => Math.round(V[t * STRIDE + c * 8] * weld) + ',' + Math.round(V[t * STRIDE + c * 8 + 1] * weld) + ',' + Math.round(V[t * STRIDE + c * 8 + 2] * weld);
        const normal  =  (t) => {
            const p  =  [0, 1, 2].map((c) => [V[t * STRIDE + c * 8], V[t * STRIDE + c * 8 + 1], V[t * STRIDE + c * 8 + 2]]);
            return V3Normalise(V3Cross(V3Sub(p[1], p[0]), V3Sub(p[2], p[0])));
        };
        const normals  =  glass.map(normal);
        const parent   =  glass.map((_, i) => i);
        const find     =  (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
        const sides    =  new Map();
        glass.forEach((t, i) => {
            if (!Number.isFinite(normals[i][0])) return;
            const k  =  [key(t, 0), key(t, 1), key(t, 2)];
            for (let s = 0; s < 3; s++) {
                const a = k[s], b = k[(s + 1) % 3];
                if (a === b) continue;
                const side  =  a < b ? a + '|' + b : b + '|' + a;
                const other =  sides.get(side);
                if (other === undefined) { sides.set(side, i); continue; }
                if (V3Dot(normals[i], normals[other]) >= WINDOWS.CoplanarDot) parent[find(i)] = find(other);
            }
        });
        const panes  =  new Map();
        glass.forEach((t, i) => {
            if (!Number.isFinite(normals[i][0])) return;
            const root  =  find(i);
            if (!panes.has(root)) panes.set(root, []);
            panes.get(root).push(t);
        });
        return [...panes.values()];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Pane's Frame: { ObjectId, Origin, U, V, N, U0..V1, Area, D }, or null for a sliver
    // ------------------------------------------------------------
    // N faces out of the building; U runs level along the glass (along a flat
    // roof light, the world's x), V up it; Origin is its middle.
    function PainterlyNPR__GlbWindows__Frame(V, tris, centre) {
        let n  =  [0, 0, 0];
        let area  =  0;
        const points  =  [];
        for (const t of tris) {
            const p  =  [0, 1, 2].map((c) => [V[t * STRIDE + c * 8], V[t * STRIDE + c * 8 + 1], V[t * STRIDE + c * 8 + 2]]);
            const c  =  V3Cross(V3Sub(p[1], p[0]), V3Sub(p[2], p[0]));
            n  =  V3Add(n, c);
            area  +=  Math.hypot(c[0], c[1], c[2]) / 2;
            points.push(...p);
        }
        n  =  V3Normalise(n);
        if (!Number.isFinite(n[0])) return null;
        const mid  =  V3Scale(points.reduce((s, p) => V3Add(s, p), [0, 0, 0]), 1 / points.length);
        if (centre && V3Dot(n, V3Sub(mid, centre)) < 0) n = V3Scale(n, -1);
        const U  =  Math.abs(n[1]) > 0.95 ? V3Normalise(V3Sub([1, 0, 0], V3Scale(n, n[0]))) : V3Normalise(V3Cross([0, 1, 0], n));
        const Vv =  V3Cross(n, U);
        let U0 = Infinity, U1 = -Infinity, V0 = Infinity, V1 = -Infinity;
        for (const p of points) {
            const q  =  V3Sub(p, mid);
            const u  =  V3Dot(q, U), v = V3Dot(q, Vv);
            if (u < U0) U0 = u; if (u > U1) U1 = u; if (v < V0) V0 = v; if (v > V1) V1 = v;
        }
        if (U1 - U0 < WINDOWS.MinSideM || V1 - V0 < WINDOWS.MinSideM) return null;
        return { ObjectId: Math.round(V[tris[0] * STRIDE + 6]), Origin: mid, U: U, V: Vv, N: n, U0: U0, U1: U1, V0: V0, V1: V1, Area: area, D: V3Dot(n, mid) };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Sheet of Glass Has Two Faces: keep the outer
    // ------------------------------------------------------------
    // A pane is dropped when another faces the same way, covers its middle and
    // stands a little in front of it (or exactly on it, and came first).
    function PainterlyNPR__GlbWindows__Outer(panes) {
        return panes.filter((a, i) => !panes.some((b, j) => {
            if (i === j || V3Dot(a.N, b.N) < 0.99) return false;
            const q  =  V3Sub(a.Origin, b.Origin);
            const u  =  V3Dot(q, b.U), v = V3Dot(q, b.V);
            if (u < b.U0 || u > b.U1 || v < b.V0 || v > b.V1) return false;
            const ahead  =  b.D - a.D;
            return ahead > 1e-4 ? ahead <= WINDOWS.DuplicateM : (Math.abs(ahead) <= 1e-4 && j < i);
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | What Each Pane's Shadow Lines Are Cast By
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Point on a Pane's Plane, d In Front of It
    // ------------------------------------------------------------
    function PainterlyNPR__GlbWindows__At(w, u, v, d) {
        return V3Add(V3Add(V3Add(w.Origin, V3Scale(w.U, u)), V3Scale(w.V, v)), V3Scale(w.N, d));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Depth In Front of the Glass at (u, v): metres, or 0 for none within reach
    // ------------------------------------------------------------
    function PainterlyNPR__GlbWindows__Depth(w, casters, near, u, v, reach) {
        const t  =  PainterlyNPR__GlbWindows__Cast(casters, near, PainterlyNPR__GlbWindows__At(w, u, v, reach), V3Scale(w.N, -1), reach + 0.002);
        return Number.isFinite(t) ? Math.max(0, reach - t) : 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Beside Each Upright Edge: [[offset, depth] ...] for the U0 side and the U1 side
    // ------------------------------------------------------------
    // Each offset keeps its middle depth over the probe heights; a flush one
    // (under MinRevealM) is left out, so a side with nothing in front is [].
    function PainterlyNPR__GlbWindows__Sides(w, casters, near) {
        const reach  =  WINDOWS.MaxRevealM;
        return [-1, 1].map((side) => {
            const out  =  [];
            for (const off of WINDOWS.ProbeOffsetsM) {
                const u       =  side < 0 ? w.U0 - off : w.U1 + off;
                const depths  =  WINDOWS.ProbeHeights.map((h) => PainterlyNPR__GlbWindows__Depth(w, casters, near, u, w.V0 + h * (w.V1 - w.V0), reach)).sort((a, b) => a - b);
                const depth   =  depths[depths.length >> 1];
                if (depth >= WINDOWS.MinRevealM) out.push([+off.toFixed(4), +depth.toFixed(4)]);
            }
            return out;
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Glazing Bars in Front of One Sheet: [{ U, Half, Depth }] by middle
    // ------------------------------------------------------------
    // A row of probes across the pane at each BarRows height; a run in front of
    // the glass no wider than a bar, clear of the pane's own edges, is a bar
    // there. One found in two rows (within BarMatchM) is a bar.
    function PainterlyNPR__GlbWindows__Bars(w, casters, near) {
        const step   =  WINDOWS.BarStepM;
        const reach  =  WINDOWS.BarMaxDepthM;
        const found  =  [];
        for (const h of WINDOWS.BarRows) {
            const v  =  w.V0 + h * (w.V1 - w.V0);
            let run  =  null;
            const close  =  (u) => {
                if (run && run.Start > w.U0 + step * 1.5 && u - run.Start <= WINDOWS.BarMaxWidthM) found.push({ U: (run.Start + u) / 2, Half: (u - run.Start) / 2, Depth: run.Depth });
                run  =  null;
            };
            for (let u = w.U0 + step; u < w.U1 - step / 2; u += step) {
                const depth  =  PainterlyNPR__GlbWindows__Depth(w, casters, near, u, v, reach);
                if (depth >= WINDOWS.BarMinDepthM) {
                    if (!run) run = { Start: u - step / 2, Depth: 0 };
                    run.Depth  =  Math.max(run.Depth, depth);
                } else if (run) {
                    close(u - step / 2);
                }
            }
            run  =  null;                                                    // <-- A run still open at the far edge is the frame, not a bar
        }
        const bars  =  [];
        for (const f of found.sort((a, b) => a.U - b.U)) {
            const last  =  bars[bars.length - 1];
            if (last && Math.abs(f.U - last.U / last.Rows) <= WINDOWS.BarMatchM) {
                last.U += f.U; last.Half += f.Half; last.Depth = Math.max(last.Depth, f.Depth); last.Rows++;
            } else {
                bars.push({ U: f.U, Half: f.Half, Depth: f.Depth, Rows: 1 });
            }
        }
        return bars.filter((b) => b.Rows >= 2).map((b) => ({ U: +(b.U / b.Rows).toFixed(4), Half: +(b.Half / b.Rows).toFixed(4), Depth: +b.Depth.toFixed(4) }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Windows
// -----------------------------------------------------------------------------

    // FUNCTION | The Window Records of a GLB Scene's Glass, Into pkg.Windows (returns them)
    // ------------------------------------------------------------
    // Called by PainterlyNPR__ScenePackage__Build (10) after the drawing's
    // material assignments, for a GLB scene only. Each record is the shadow-line
    // pass's (52): Origin, U, V, N, U0..U1 and V0..V1 on the glass, Frame 0,
    // Bars (their middles) with BarCasts, and Casters (the two sides' [offset,
    // depth]); Reveal is the deepest of them, for reading.
    function PainterlyNPR__ScenePackage__GlbWindows(pkg) {
        const base  =  pkg.Source && pkg.Source.Kind === 'Glb' ? pkg.Source.Objects : 0;
        if (!base) return pkg.Windows;
        const V        =  pkg.Vertices;
        const glassId  =  MATERIAL_BY_KEY.Glass.Id;
        const glass    =  [];
        const others   =  [];
        for (let t = 0; t < V.length / STRIDE; t++) {
            const id  =  Math.round(V[t * STRIDE + 6]);
            if (id < 1 || id > base) continue;                                // <-- The model's own objects: never the lawn, the belt or a placed asset
            (Math.round(V[t * STRIDE + 7]) === glassId ? glass : others).push(t);
        }
        pkg.Windows  =  [];
        if (!glass.length) return pkg.Windows;
        const panes    =  PainterlyNPR__GlbWindows__Outer(PainterlyNPR__GlbWindows__Group(V, glass).map((tris) => PainterlyNPR__GlbWindows__Frame(V, tris, pkg.ShadowCentre)).filter(Boolean));
        const casters  =  PainterlyNPR__GlbWindows__Casters(V, others);
        const out      =  Math.max(...WINDOWS.ProbeOffsetsM) + 0.01;
        for (const w of panes) {
            const corners  =  [];
            for (const u of [w.U0 - out, w.U1 + out]) for (const v of [w.V0 - 0.01, w.V1 + 0.01]) for (const d of [-0.01, WINDOWS.MaxRevealM + 0.01]) corners.push(PainterlyNPR__GlbWindows__At(w, u, v, d));
            const min   =  [0, 1, 2].map((i) => Math.min(...corners.map((p) => p[i])));
            const max   =  [0, 1, 2].map((i) => Math.max(...corners.map((p) => p[i])));
            const near  =  PainterlyNPR__GlbWindows__Near(casters, min, max);
            const sides =  PainterlyNPR__GlbWindows__Sides(w, casters, near);
            const bars  =  PainterlyNPR__GlbWindows__Bars(w, casters, near);
            pkg.Windows.push({
                ObjectId  :  w.ObjectId,
                Kind      :  'Window',
                Origin    :  w.Origin,
                U         :  w.U,
                V         :  w.V,
                N         :  w.N,
                U0        :  w.U0,
                U1        :  w.U1,
                V0        :  w.V0,
                V1        :  w.V1,
                Reveal    :  Math.max(0, ...sides.flat().map(([, d]) => d)),
                Frame     :  0,
                Bars      :  bars.map((b) => b.U),
                BarCasts  :  bars,
                Casters   :  sides,
                Derived   :  true,
            });
        }
        return pkg.Windows;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__ScenePackage__GlbWindows,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
