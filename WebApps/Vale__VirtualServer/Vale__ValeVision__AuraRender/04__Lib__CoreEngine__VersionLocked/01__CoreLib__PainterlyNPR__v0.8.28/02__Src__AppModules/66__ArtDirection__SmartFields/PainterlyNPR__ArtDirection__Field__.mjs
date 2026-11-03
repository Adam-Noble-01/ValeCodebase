/* =============================================================================
   PAINTERLYNPR - ART DIRECTION | SMART FIELDS
   =============================================================================

   FILE       : PainterlyNPR__ArtDirection__Field__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : ArtDirection - SmartFields
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The art direction field: every point's influence rendered into one
                field the lines and the washes both obey, read back for the CPU,
                and the run-out points
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - The field is read back to the CPU so the lines and the washes obey the same
     field.
   - A host showing only part of the sheet fits the vignette to that part
     (SetFrame, v0.8.9: ValeVision AURA's viewports); none is the sheet's own.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Art Direction
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import FieldConfig from './Na__SmartFields__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__DEG              as  DEG,
    PainterlyNPR__Engine__MAX_POINTS       as  MAX_POINTS,
    PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
    PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__Maths__Clamp       as  Clamp,
    PainterlyNPR__Maths__Lerp        as  Lerp,
    PainterlyNPR__Maths__SmoothStep  as  SmoothStep,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Noise2,
    PainterlyNPR__SeededRandom__Offset,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import {
    PainterlyNPR__GpuResources__Fullscreen,
    PainterlyNPR__GpuResources__PaintPxPerMm,
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__GeometryBuffers__Index,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__DrawingDiscipline__LINE_CLASS_FADE as LINE_CLASS_FADE } from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import { PainterlyNPR__StrokeSynthesis__EffectiveDiscipline } from '../35__Line__DrawingDiscipline/PainterlyNPR__StrokeSynthesis__DisciplineMacro__.mjs';
import { PainterlyNPR__Watercolour__Materials as Materials } from '../52__Wash__LayerStack/PainterlyNPR__Watercolour__Pass__.mjs';
import {
    PainterlyNPR__ArtDirection__ActivePoints,
    PainterlyNPR__ArtDirection__PlaceObjectPoints,
    PainterlyNPR__ArtDirection__POINT_TARGETS  as  POINT_TARGETS,
    PainterlyNPR__ArtDirection__POINT_TYPES    as  POINT_TYPES,
} from '../65__ArtDirection__InfluencePoints/PainterlyNPR__ArtDirection__Points__.mjs';

// =============================================================================
// REGION | Smart Fields
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__SmartFields__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const RUN_OUT_CONFIG  =  PainterlyNPR__ConfigAccess__Section(FieldConfig, 'PainterlyNPR__SmartFields__Config', 'RunOut', ['LineRunClasses', 'RunClassReach', 'Unaimed']);
    const VIGNETTE        =  PainterlyNPR__ConfigAccess__Section(FieldConfig, 'PainterlyNPR__SmartFields__Config', 'Vignette', ['CentreMm', 'HalfWidthMm', 'HalfHeightMm', 'ForegroundSqueeze', 'Fade', 'Roughness']);
    // ------------------------------------------------------------


    // MODULE STATE | A Host's Frame for the Vignette (null: the sheet's own)
    // ------------------------------------------------------------
    // A wrapper that shows only part of the sheet (ValeVision AURA's viewports,
    // v0.8.9) fits the vignette to that part, so the paint dissolves inside the
    // frame's edges as it does inside the sheet's. Painted area and Edge
    // irregularity still steer it; the edge's noise stays in paper millimetres.
    let Frame  =  null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Art Direction
// -----------------------------------------------------------------------------

    // FUNCTION | Fit the Vignette to a Host's Frame - { CentreMm: [x, y], Scale: [across, up] }, or null for the sheet
    // ------------------------------------------------------------
    // CentreMm is the frame's middle on the sheet, in sheet millimetres from its
    // bottom-left; Scale is the frame's size over the sheet's, across and up
    // apart, so a frame of another shape gets a vignette of its own shape. The
    // caller bumps 'Composition' so the field is drawn again. True when a frame
    // is set; anything else (null, a bad frame) puts the sheet's own back.
    function PainterlyNPR__ArtDirection__SetFrame(frame) {
        const ok  =  !!frame && Array.isArray(frame.CentreMm) && Array.isArray(frame.Scale)
                     && [frame.CentreMm[0], frame.CentreMm[1], frame.Scale[0], frame.Scale[1]].every(Number.isFinite)
                     && frame.Scale[0] > 0 && frame.Scale[1] > 0;
        Frame  =  ok ? { CentreMm: [frame.CentreMm[0], frame.CentreMm[1]], Scale: [frame.Scale[0], frame.Scale[1]] } : null;
        return Frame !== null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Vignette's Centre and Half Sizes (mm): the sheet's, or fitted to the host's frame
    // ------------------------------------------------------------
    // With no frame these are the config's values exactly, so the sheet draws as
    // before, pixel for pixel. A frame keeps the shape's own offset from the
    // sheet's middle (a touch low, for the foreground), scaled with it.
    function PainterlyNPR__ArtDirection__VignetteShape(composition) {
        const halfW  =  Lerp(VIGNETTE.HalfWidthMm[0], VIGNETTE.HalfWidthMm[1], composition.Vignette);
        const halfH  =  Lerp(VIGNETTE.HalfHeightMm[0], VIGNETTE.HalfHeightMm[1], composition.Vignette);
        if (!Frame) return [VIGNETTE.CentreMm[0], VIGNETTE.CentreMm[1], halfW, halfH];
        const [kx, ky]  =  Frame.Scale;
        return [Frame.CentreMm[0] + (VIGNETTE.CentreMm[0] - SHEET_WIDTH_MM / 2) * kx,
                Frame.CentreMm[1] + (VIGNETTE.CentreMm[1] - SHEET_HEIGHT_MM / 2) * ky,
                halfW * kx, halfH * ky];
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - the Art Direction Field
    // ------------------------------------------------------------
    function PainterlyNPR__ArtDirection__Run() {
        const gl  =  Gpu.Gl;
        PainterlyNPR__ArtDirection__PlaceObjectPoints();
        const v   =  State.Composition;
        const n   =  MAX_POINTS * 4;
        const A = new Float32Array(n), B = new Float32Array(n), C = new Float32Array(n), D = new Float32Array(n), E = new Float32Array(n);
        const points  =  PainterlyNPR__ArtDirection__ActivePoints();
        points.forEach((p, i) => {
            A.set([p.PaperMm[0], p.PaperMm[1], p.RadiusMm, p.Strength], i * 4);
            const targetId  =  p.Target === 'Object' ? p.ObjectId : (p.Target === 'Material' ? p.MaterialId : -1);
            const target    =  targetId < 0 ? 0 : POINT_TARGETS[p.Target];
            B.set([POINT_TYPES[p.Type].Code, target, targetId, p.Seed], i * 4);
            const loose  =  p.Type === 'Discipline' ? p.Discipline - PainterlyNPR__StrokeSynthesis__EffectiveDiscipline() : p.Looseness;   // <-- Packed as its offset from the sheet's, so at its centre the line is drawn at its own setting
            C.set([p.LineWeight, loose, p.Amount || 0, p.Breakup], i * 4);
            D.set([p.Emphasis, p.Overdraw, p.Pressure, p.HatchDensity], i * 4);
            E.set([p.HatchReach, p.Wobble, p.Shape == null ? 1 : p.Shape, (p.Turn || 0) * DEG], i * 4);
        });
        PainterlyNPR__GpuResources__Fullscreen(Gpu.Targets.Field, Gpu.Programs.Field, {
            uData        :  { t: Gpu.Targets.GBuffer.Textures[2] },
            uPxPerMm     :  { f: Gpu.PxPerMm },
            uPaintPxPerMm:  { f: PainterlyNPR__GpuResources__PaintPxPerMm() },  // <-- The paint edge's noise only: the points and the vignette's shape stay on the paper (v0.8.15)
            uSeed        :  { v2: PainterlyNPR__SeededRandom__Offset(State.Seed, 'vignette') },
            uVignette    :  { v4: PainterlyNPR__ArtDirection__VignetteShape(v) },
            uVignetteB   :  { v4: [VIGNETTE.Fade[0], VIGNETTE.Fade[1], Lerp(VIGNETTE.Roughness[0], VIGNETTE.Roughness[1], v.Roughness), VIGNETTE.ForegroundSqueeze] },
            uPointCount  :  { i: points.length },
            uPointA      :  { v4a: A },
            uPointB      :  { v4a: B },
            uPointC      :  { v4a: C },
            uPointD      :  { v4a: D },
            uPointE      :  { v4a: E },
            uHatchAmount :  { f: State.Pen.HatchAmount },
            uHatchReach  :  { f: State.Pen.HatchReach },
            uHatchTake   :  { fa: Materials.HatchTake },
        });
        // The field itself, and the line field; attachment 1 is the influence picture
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, Gpu.Targets.Field.Fbo);
        [[0, Cpu.Field], [2, Cpu.FieldB], [3, Cpu.FieldC]].forEach(([k, buffer]) => {
            gl.readBuffer(gl.COLOR_ATTACHMENT0 + k);
            gl.readPixels(0, 0, Gpu.Width, Gpu.Height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
        });
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        RunOut.Reach  =  null;                                                // <-- A new field: the Line Run-out's distances from the paint are built afresh
    }
    // ------------------------------------------------------------


    // FUNCTION | A Line Control Point's Planting Settings Where a Leaf Falls
    // ------------------------------------------------------------
    // The field has no channel left, so leaves read the Line Control points
    // directly, with the reach the field gives them - the point's own unit disc,
    // full to 0.3 and gone by its ring, aimed at its object or material - less
    // the edge's irregularity, which leaves scattered at random never show.
    // Leaves and Leaf size multiply where points overlap; the strongest point
    // past half its strength chooses the hand.
    function PainterlyNPR__ArtDirection__PlantingAt(x, y) {
        const out  =  { Leaves: 1, LeafSize: 1, LeafStyle: null };
        const pxPerMm  =  Gpu.PxPerMm;
        let best  =  0.5;
        for (const p of State.Points.slice(0, MAX_POINTS)) {
            if (p.Type !== 'LineControl' || p.Enabled === false) continue;
            const t  =  (p.Turn || 0) * DEG, shape = Math.max(p.Shape == null ? 1 : p.Shape, 0.05);
            const dx = x / pxPerMm - p.PaperMm[0], dy = y / pxPerMm - p.PaperMm[1];
            const lx  =  Math.cos(t) * dx + Math.sin(t) * dy, ly = (-Math.sin(t) * dx + Math.cos(t) * dy) / shape;
            let f  =  1 - SmoothStep(0.3, 1.0, Math.hypot(lx, ly) / Math.max(p.RadiusMm, 1));
            if (f <= 0) continue;
            if (p.Target === 'Object' && p.ObjectId >= 0 && PainterlyNPR__GeometryBuffers__ObjectAt(x, y) !== p.ObjectId) f *= 0.1;
            else if (p.Target === 'Material' && p.MaterialId >= 0) { const i = PainterlyNPR__GeometryBuffers__Index(x, y); if (i < 0 || Math.round(Cpu.Geo[i + 2]) !== p.MaterialId) f *= 0.1; }
            f  =  Clamp(f * p.Strength, 0, 1);
            out.Leaves    *=  Lerp(1, p.VegLeaves == null ? 1 : p.VegLeaves, f);
            out.LeafSize  *=  Lerp(1, p.VegLeafSize == null ? 1 : p.VegLeafSize, f);
            if (p.VegLeafStyle && p.VegLeafStyle !== 'Kind' && f > best) { best = f; out.LeafStyle = p.VegLeafStyle; }
        }
        return out;
    }
    // ------------------------------------------------------------


    // MODULE STATE | Line Run-out - the points that let the pen run on past the paint
    // ------------------------------------------------------------
    // The architect's lines that run off the side of the page: where a Line
    // Run-out reaches, a line the paper would have taken (the vignette, a Fade to
    // paper) runs on past the paint instead, fading as it goes. Read on the CPU,
    // as the planting reads Line Control - the field has no channel to spare -
    // with the point's unit disc and the same broken edge, here from 2D value
    // noise in place of the shader's fbm. Taken afresh by each pass that draws
    // lines, so it always holds the points as they are.
    const LINE_RUN_CLASSES  =  RUN_OUT_CONFIG.LineRunClasses;               // <-- The last class a point's Lines let through
    const RUN_CLASS_REACH   =  RUN_OUT_CONFIG.RunClassReach;                // <-- Profiles run furthest, texture least - gently: a rail is often modelled Optional
    const RUN_OUT_UNAIMED   =  Object.freeze(RUN_OUT_CONFIG.Unaimed);        // <-- For a caller that does not know its object: the pixel's stands in
    const RunOut  =  { Points: [], MaxClass: -1, Reach: null, GW: 0, GH: 0 };   // <-- Reach: per class, each millimetre of the sheet's distance from that class's paint
    // ------------------------------------------------------------


    // FUNCTION | Take the Line Run-out Points as They Are Now
    // ------------------------------------------------------------
    // The distances from the paint wait for the first point and are dropped
    // whenever the field is read back, so they are built once per field.
    function PainterlyNPR__ArtDirection__RunOutPrepare() {
        RunOut.Points  =  PainterlyNPR__ArtDirection__ActivePoints().filter(p => p.Type === 'RunOut' && p.Strength > 0).map(p => {
            const t  =  (p.Turn || 0) * DEG;
            return { P: p, Cos: Math.cos(t), Sin: Math.sin(t), Shape: Math.max(p.Shape == null ? 1 : p.Shape, 0.05), R: Math.max(p.RadiusMm, 1),
                     MaxClass: LINE_RUN_CLASSES[p.RunLines] != null ? LINE_RUN_CLASSES[p.RunLines] : 3, Salt: Math.imul((p.Seed | 0) + 1, 0x85EBCA6B) >>> 0 };
        });
        RunOut.MaxClass  =  RunOut.Points.reduce((m, r) => Math.max(m, r.MaxClass), -1);
        if (RunOut.Points.length && (!RunOut.Reach || RunOut.Reach.length <= RunOut.MaxClass)) PainterlyNPR__ArtDirection__RunOutReach();
        return RunOut.Points.length > 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | One Line Run-out's Pull at a Sheet Pixel
    // ------------------------------------------------------------
    // Full to 0.3 of its ring and gone by it, broken as the field breaks a
    // point's edge, times its strength; aimed at its object (the line's own, when
    // the caller knows it) or its material as any point is.
    function PainterlyNPR__ArtDirection__RunOutPull(r, x, y, objectId) {
        const pxPerMm  =  Gpu.PxPerMm;
        const p   =  r.P;
        const dx  =  x / pxPerMm - p.PaperMm[0], dy = y / pxPerMm - p.PaperMm[1];
        const qx  =  (r.Cos * dx + r.Sin * dy) / r.R, qy = (-r.Sin * dx + r.Cos * dy) / r.Shape / r.R;
        const d   =  Math.hypot(qx, qy);
        if (d > 1.5) return 0;
        const irr  =  (PainterlyNPR__SeededRandom__Noise2(qx * 1.6 + 7.3, qy * 1.6 + 2.9, r.Salt) - 0.5) * 0.9;
        let f  =  1 - SmoothStep(0.3 + irr * 0.5, 1.0 + irr * 0.4, d);
        if (f <= 0) return 0;
        if (p.Target === 'Object' && p.ObjectId >= 0 && (objectId != null ? objectId : PainterlyNPR__GeometryBuffers__ObjectAt(x, y)) !== p.ObjectId) f *= 0.1;
        else if (p.Target === 'Material' && p.MaterialId >= 0) { const i = PainterlyNPR__GeometryBuffers__Index(x, y); if (i < 0 || Math.round(Cpu.Geo[i + 2]) !== p.MaterialId) f *= 0.1; }
        return Clamp(f * p.Strength, 0, 1);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Strongest Line Run-out Reaching a Sheet Pixel, for a Class
    // ------------------------------------------------------------
    // Null where none reaches, or none lets this class through.
    function PainterlyNPR__ArtDirection__RunOutAt(x, y, lineClass, objectId) {
        let best  =  null;
        for (const r of RunOut.Points) {
            if (lineClass > r.MaxClass) continue;
            const f  =  PainterlyNPR__ArtDirection__RunOutPull(r, x, y, objectId);
            if (f > 0.004 && (!best || f > best.F)) best = { F: f, Node: r };
        }
        return best;
    }
    // ------------------------------------------------------------


    // FUNCTION | How Far Each Millimetre of the Sheet Lies From the Paint
    // ------------------------------------------------------------
    // For each class a line can be, on a 1 mm grid: the exact Euclidean
    // distance (Felzenszwalb and Huttenlocher's, rows then columns) to the
    // nearest place that class is drawn - the field's presence past its
    // threshold, or a Line Run-out's Reveal there. So a line runs out by how far
    // it lies from the paint, wherever it met it - the road below the vignette
    // as much as a rail leaving its side.
    function PainterlyNPR__ArtDirection__RunOutReach() {
        const pxPerMm = Gpu.PxPerMm, W = Gpu.Width, H = Gpu.Height;
        const GW  =  Math.max(1, Math.round(W / pxPerMm)), GH = Math.max(1, Math.round(H / pxPerMm));
        const presence  =  new Float32Array(GW * GH);
        for (let cy = 0; cy < GH; cy++) {
            const y  =  Math.min(H - 1, Math.floor((cy + 0.5) * pxPerMm));
            for (let cx = 0; cx < GW; cx++) presence[cy * GW + cx] = Cpu.Field[(y * W + Math.min(W - 1, Math.floor((cx + 0.5) * pxPerMm))) * 4] / 255;
        }
        const reveal  =  RunOut.Points.filter(r => r.P.RunReveal > 0);
        const N    =  Math.max(GW, GH);
        const f1 = new Float64Array(N), d1 = new Float64Array(N), v = new Int32Array(N), z = new Float64Array(N + 1);
        const edt  =  (n) => {                                                  // <-- The squared distance transform of f1[0..n) into d1
            let k  =  0;
            v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
            for (let q = 1; q < n; q++) {
                let s  =  ((f1[q] + q * q) - (f1[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
                while (s <= z[k]) { k--; s = ((f1[q] + q * q) - (f1[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
                k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
            }
            k  =  0;
            for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d1[q] = (q - v[k]) * (q - v[k]) + f1[v[k]]; }
        };
        RunOut.Reach  =  [];
        for (let c = 0; c <= RunOut.MaxClass; c++) {
            const thr  =  LINE_CLASS_FADE[c];
            const g    =  new Float64Array(GW * GH);
            for (let k = 0; k < GW * GH; k++) {
                let p  =  presence[k];
                if (p <= thr && reveal.length) {
                    const x = ((k % GW) + 0.5) * pxPerMm, y = (Math.floor(k / GW) + 0.5) * pxPerMm;
                    for (const r of reveal) if (c <= r.MaxClass) p = Math.max(p, PainterlyNPR__ArtDirection__RunOutPull(r, x, y) * r.P.RunReveal);
                }
                g[k]  =  p > thr ? 0 : 1e20;
            }
            for (let cx = 0; cx < GW; cx++) {
                for (let cy = 0; cy < GH; cy++) f1[cy] = g[cy * GW + cx];
                edt(GH);
                for (let cy = 0; cy < GH; cy++) g[cy * GW + cx] = d1[cy];
            }
            const out  =  new Float32Array(GW * GH);
            for (let cy = 0; cy < GH; cy++) {
                for (let cx = 0; cx < GW; cx++) f1[cx] = g[cy * GW + cx];
                edt(GW);
                for (let cx = 0; cx < GW; cx++) out[cy * GW + cx] = Math.sqrt(d1[cx]);
            }
            RunOut.Reach.push(out);
        }
        RunOut.GW = GW; RunOut.GH = GH;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Sheet Pixel's Distance From a Class's Paint, in Millimetres
    // ------------------------------------------------------------
    function PainterlyNPR__ArtDirection__RunOutDistance(x, y, lineClass) {
        const g  =  RunOut.Reach[lineClass], GW = RunOut.GW, GH = RunOut.GH;
        const gx  =  Clamp(x / Gpu.PxPerMm - 0.5, 0, GW - 1), gy = Clamp(y / Gpu.PxPerMm - 0.5, 0, GH - 1);
        const x0  =  Math.min(Math.floor(gx), GW - 2 < 0 ? 0 : GW - 2), y0 = Math.min(Math.floor(gy), GH - 2 < 0 ? 0 : GH - 2);
        const x1  =  Math.min(x0 + 1, GW - 1), y1 = Math.min(y0 + 1, GH - 1);
        const tx  =  gx - x0, ty = gy - y0;
        const a   =  g[y0 * GW + x0] + (g[y0 * GW + x1] - g[y0 * GW + x0]) * tx;
        const b   =  g[y1 * GW + x0] + (g[y1 * GW + x1] - g[y1 * GW + x0]) * tx;
        return a + (b - a) * ty;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Field at a Sheet Pixel, Decoded
    // ------------------------------------------------------------
    function PainterlyNPR__ArtDirection__FieldAt(x, y) {
        const xi  =  Clamp(Math.floor(x), 0, Gpu.Width - 1), yi = Clamp(Math.floor(y), 0, Gpu.Height - 1);
        const i   =  (yi * Gpu.Width + xi) * 4;
        const a = Cpu.Field, b = Cpu.FieldB, c = Cpu.FieldC;
        return {
            Presence : a[i] / 255,          Weight  : (a[i + 1] / 255) * 2,   Loose    : (a[i + 2] / 255) * 2 - 1, Indication : (a[i + 3] / 255) * 2 - 1,
            Wobble   : (b[i] / 255) * 3,    Breakup : b[i + 1] / 255,         Emphasis : (b[i + 2] / 255) * 3,     Overdraw   : (b[i + 3] / 255) * 3,
            Pressure : (c[i + 2] / 255) * 3,    Detail : (c[i + 3] / 255) * 2 - 1,
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__ArtDirection__FieldAt,
        PainterlyNPR__ArtDirection__PlantingAt,
        PainterlyNPR__ArtDirection__Run,
        PainterlyNPR__ArtDirection__RunOutAt,
        PainterlyNPR__ArtDirection__RunOutDistance,
        PainterlyNPR__ArtDirection__RunOutPrepare,
        PainterlyNPR__ArtDirection__SetFrame,
        RUN_CLASS_REACH  as  PainterlyNPR__ArtDirection__RUN_CLASS_REACH,
        RUN_OUT_UNAIMED  as  PainterlyNPR__ArtDirection__RUN_OUT_UNAIMED,
        RunOut           as  PainterlyNPR__ArtDirection__RunOut,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
