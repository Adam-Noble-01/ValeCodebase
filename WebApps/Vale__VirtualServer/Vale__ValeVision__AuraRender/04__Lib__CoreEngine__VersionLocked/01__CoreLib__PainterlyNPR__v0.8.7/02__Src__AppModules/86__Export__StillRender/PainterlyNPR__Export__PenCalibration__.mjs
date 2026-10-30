/* =============================================================================
   PAINTERLYNPR - EXPORT | STILL RENDER - PEN CALIBRATION SHEET
   =============================================================================

   FILE       : PainterlyNPR__Export__PenCalibration__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Export - StillRender - PenCalibration
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The four technical pens drawn through the engine's own stroke
                synthesis and ink pass at a print resolution, measured, and
                exported as a true-size sheet to check a print with a ruler
   CREATED    : 30-Oct-2026 (v0.8.0)

   DESCRIPTION:
   - Render(dpi): a row for each pen - a 100 mm horizontal, a 25 mm vertical,
     diagonals at 30, 45 and 60 degrees, a circle, a cross and a saltire, a
     small window - labelled in the lettering pen; a 100 mm scale ticked every
     millimetre, a 10 mm square, a 100 mm upright and corner marks in the base
     pen. Drawn into targets of its own at the dpi's exact sheet pixels, with the
     app's state put back afterwards.
   - Measure(render): the pens checked twice. Geometry, strictly: every ribbon
     half-width stroke synthesis wrote is the pen's, to a ten-thousandth of a
     pixel. Raster: the ink's coverage summed across each line - the box filter
     makes that its width in pixels - against the pen, in millimetres. And the
     base buffer lies inside the ink, and a line of a heavier pen is never
     darkened by the base beneath it.
   - Export(format, dpi): the sheet as a PNG with its print size (pHYs) or a
     true-size PDF, and the measured widths on the status line.

   WHY THROUGH THE ENGINE:
   - Adam: "The objective is to simulate drawing architecture with four real
     STAEDTLER technical pens, not merely to produce lines that look
     approximately thin or thick on a monitor." The sheet is drawn by the same
     code as the drawing, so what it measures is what the drawing prints.

   ============================================================================= */

import CalibrationConfig from './Na__PenCalibration__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__BASE_PX_PER_MM   as  BASE_PX_PER_MM,
    PainterlyNPR__Engine__ENGINE_VERSION   as  ENGINE_VERSION,
    PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
    PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__Maths__Hex as Hex } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__RenderGraph__Bump,
    PainterlyNPR__RenderGraph__Request,
    PainterlyNPR__RenderGraph__Graph  as  Graph,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import {
    PainterlyNPR__GpuResources__CreateTarget,
    PainterlyNPR__GpuResources__DisposeTarget,
    PainterlyNPR__GpuResources__SheetPixels,
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__FloatBuilder } from '../21__System__GpuResources/PainterlyNPR__GpuResources__FloatBuilder__.mjs';
import {
    PainterlyNPR__TechnicalPens__SetPrintPxPerMm,
    PainterlyNPR__TechnicalPens__BASE_WIDTH_MM  as  BASE_WIDTH_MM,
    PainterlyNPR__TechnicalPens__PEN_ORDER      as  PEN_ORDER,
    PainterlyNPR__TechnicalPens__PENS           as  PENS,
    PainterlyNPR__TechnicalPens__TIER_BASE      as  TIER_BASE,
    PainterlyNPR__TechnicalPens__TIER_WIDTH_MM  as  TIER_WIDTH_MM,
} from '../32__Line__ClassAndPriority/PainterlyNPR__TechnicalPens__Tiers__.mjs';
import { PainterlyNPR__StrokeSynthesis__Stroke } from '../33__Stroke__Synthesis/PainterlyNPR__StrokeSynthesis__Pen__.mjs';
import { PainterlyNPR__InkLayer__Run } from '../34__Stroke__InkCompositing/PainterlyNPR__InkLayer__Pass__.mjs';
import {
    PainterlyNPR__DrawingDiscipline__NEUTRAL_LOCAL  as  NEUTRAL_LOCAL,
    PainterlyNPR__DrawingDiscipline__PEN_DEFAULTS   as  PEN_DEFAULTS,
} from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import {
    PainterlyNPR__Lettering__Strokes,
    PainterlyNPR__Lettering__WidthMm,
} from '../38__Line__Lettering/PainterlyNPR__Lettering__Strokes__.mjs';
import { PainterlyNPR__Interface__Status } from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Export__Pdf } from '../87__Export__PassesAndPdf/PainterlyNPR__Export__Pdf__.mjs';
import {
    PainterlyNPR__Export__Download,
    PainterlyNPR__PrintSize__Describe,
    PainterlyNPR__PrintSize__Png,
} from './PainterlyNPR__Export__PrintSize__.mjs';

// =============================================================================
// REGION | Still Render - Pen Calibration Sheet
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__PenCalibration__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const ROOT     =  'PainterlyNPR__PenCalibration__Config';
    const SHEET    =  PainterlyNPR__ConfigAccess__Section(CalibrationConfig, ROOT, 'Sheet', ['TestDpi', 'ExportDpi', 'Alpha', 'InkSrgb', 'PaperSrgb', 'Title', 'Subtitle']);
    const LAYOUT   =  PainterlyNPR__ConfigAccess__Section(CalibrationConfig, ROOT, 'Layout', ['DesignMm', 'RowTopsMm', 'LabelAtMm', 'LabelHeightMm', 'HorizontalMm', 'VerticalMm', 'Diagonals', 'DiagonalMm', 'CircleMm', 'CrossMm', 'SaltireMm', 'WindowMm']);
    const RULERS   =  PainterlyNPR__ConfigAccess__Section(CalibrationConfig, ROOT, 'Rulers', ['ScaleAtMm', 'ScaleTicksMm', 'SquareAtMm', 'UprightAtMm', 'CornerMm', 'LabelHeightMm']);
    const MEASURE  =  PainterlyNPR__ConfigAccess__Section(CalibrationConfig, ROOT, 'Measure', ['GeometryTolPx', 'RasterTolMm', 'EndClearMm', 'WindowPx', 'ContainTol', 'HalfInkAlpha']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Sheet's Strokes
// -----------------------------------------------------------------------------

    // FUNCTION | Every Stroke of the Sheet, and What to Measure
    // ------------------------------------------------------------
    // At pxPerMm, in sheet pixels (y up, as the ink target is). Measures name
    // what Measure reads: H, V and D lines and the circle, each with its pen, in
    // the real sheet's millimetres. The layout is centred on the sheet.
    function PainterlyNPR__PenCalibration__Strokes(pxPerMm, dpi, probe) {
        const ox       =  (SHEET_WIDTH_MM - LAYOUT.DesignMm[0]) / 2, oy = (SHEET_HEIGHT_MM - LAYOUT.DesignMm[1]) / 2;
        const sheetAt  =  (x, y) => [x * pxPerMm, (SHEET_HEIGHT_MM - y) * pxPerMm];
        const at       =  (x, y) => sheetAt(x + ox, y + oy);
        const strokes  =  [];
        const measures =  [];
        let seed       =  7001;
        const line     =  (points, tier, alpha) => strokes.push({
            Points: points.map(p => at(p[0], p[1])), Straight: points.length === 2, StartTrue: false, EndTrue: false,
            Tier: tier, WidthMm: TIER_WIDTH_MM[tier], Alpha: alpha != null ? alpha : SHEET.Alpha, Dry: 0, Loose: 0, Seed: seed++,
            TaperIn: 0, TaperOut: 0, Wobble: 0, Local: NEUTRAL_LOCAL, Source: 'Calibration',
        });
        const letters  =  (text, x, y, h) => { for (const s of PainterlyNPR__Lettering__Strokes(text, x, y, h, { At: at, Alpha: SHEET.Alpha, Seed: seed++ })) strokes.push(s); };
        const pieces   =  (points, tier) => {                                // <-- A frame as a pen draws it: each side its own line, past the corner by the nib's radius
            const cap  =  TIER_WIDTH_MM[tier] / 2;
            for (let i = 0; i < points.length - 1; i++) {
                const [ax, ay] = points[i], [bx, by] = points[i + 1];
                const len  =  Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / len * cap, uy = (by - ay) / len * cap;
                line([[ax - ux, ay - uy], [bx + ux, by + uy]], tier);
            }
        };

        letters(SHEET.Title, 15, 20, 4);
        letters(SHEET.Subtitle.replace('{W}', SHEET_WIDTH_MM).replace('{H}', SHEET_HEIGHT_MM), 15, 27, 2.5);
        letters(`RENDERED AT ${dpi} DPI (${pxPerMm.toFixed(3)} PX/mm) - CHECK THE 100 mm SCALE AND THE 10 mm SQUARE WITH A RULER`, 15, 33, 2.5);

        PEN_ORDER.forEach((key, tier) => {
            const top  =  LAYOUT.RowTopsMm[tier];
            const pen  =  PENS[key];
            letters(`${pen.Label}  ${key}  ${pen.Name.toUpperCase()}`, LAYOUT.LabelAtMm[0], top + LAYOUT.LabelAtMm[1], LAYOUT.LabelHeightMm);
            const [hx0, hx1, hy]  =  LAYOUT.HorizontalMm;
            line([[hx0, top + hy], [hx1, top + hy]], tier);
            measures.push({ Kind: 'H', Tier: tier, X0: hx0, X1: hx1, Y: top + hy });
            const [vx, vy0, vy1]  =  LAYOUT.VerticalMm;
            line([[vx, top + vy0], [vx, top + vy1]], tier);
            measures.push({ Kind: 'V', Tier: tier, X: vx, Y0: top + vy0, Y1: top + vy1 });
            for (const [dx, deg] of LAYOUT.Diagonals) {
                const a  =  deg * Math.PI / 180, x0 = dx, y0 = top + 27;
                const x1 =  x0 + LAYOUT.DiagonalMm * Math.cos(a), y1 = y0 - LAYOUT.DiagonalMm * Math.sin(a);
                line([[x0, y0], [x1, y1]], tier);
                measures.push({ Kind: 'D', Tier: tier, Angle: deg, A: [x0, y0], B: [x1, y1] });
            }
            const [cx, cy, r]  =  LAYOUT.CircleMm;
            const n  =  Math.ceil(2 * Math.PI * r / 0.25);
            line(Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos(2 * Math.PI * i / n), top + cy + r * Math.sin(2 * Math.PI * i / n)]), tier);
            measures.push({ Kind: 'Circle', Tier: tier, C: [cx, top + cy], R: r });
            const [px, py, pa]  =  LAYOUT.CrossMm;
            line([[px - pa, top + py], [px + pa, top + py]], tier);
            line([[px, top + py - pa], [px, top + py + pa]], tier);
            const [sx, sy, sa]  =  LAYOUT.SaltireMm;
            line([[sx - sa, top + sy - sa], [sx + sa, top + sy + sa]], tier);
            line([[sx - sa, top + sy + sa], [sx + sa, top + sy - sa]], tier);
            const [wx0, wy0, wx1, wy1]  =  LAYOUT.WindowMm;
            pieces([[wx0, top + wy0], [wx1, top + wy0], [wx1, top + wy1], [wx0, top + wy1], [wx0, top + wy0]], tier);
            line([[(wx0 + wx1) / 2, top + wy0], [(wx0 + wx1) / 2, top + wy1]], tier);
            line([[wx0, top + (wy0 + wy1) * 0.45], [wx1, top + (wy0 + wy1) * 0.45]], tier);
            line([[wx0 - 2, top + wy1 + 1.2], [wx1 + 2, top + wy1 + 1.2]], tier);
        });

        // The rulers, in the base pen
        const [sx0, sy0]  =  RULERS.ScaleAtMm;
        const ticks       =  RULERS.ScaleTicksMm;
        line([[sx0, sy0], [sx0 + 100, sy0]], TIER_BASE);
        for (let i = 0; i <= 100; i++) {
            const len  =  i % 10 === 0 ? ticks[2] : (i % 5 === 0 ? ticks[1] : ticks[0]);
            line([[sx0 + i, sy0], [sx0 + i, sy0 - len]], TIER_BASE);
            if (i % 10 === 0) {
                const text  =  i === 100 ? '100 mm' : String(i);
                const w     =  PainterlyNPR__Lettering__WidthMm(String(i), RULERS.LabelHeightMm);
                letters(text, sx0 + i - w / 2, sy0 - ticks[2] - 1, RULERS.LabelHeightMm);
            }
        }
        const [qx, qy, qs]  =  RULERS.SquareAtMm;
        pieces([[qx, qy], [qx + qs, qy], [qx + qs, qy + qs], [qx, qy + qs], [qx, qy]], TIER_BASE);
        letters('10 mm SQUARE', qx + qs + 3, qy + qs, RULERS.LabelHeightMm);
        const [ux, uy0, ulen]  =  RULERS.UprightAtMm;
        line([[ux, uy0], [ux, uy0 + ulen]], TIER_BASE);
        for (let i = 0; i <= ulen; i++) {
            const len  =  i % 10 === 0 ? ticks[2] : (i % 5 === 0 ? ticks[1] : ticks[0]);
            line([[ux, uy0 + i], [ux + len, uy0 + i]], TIER_BASE);
            if (i % 50 === 0) letters(String(i), ux + ticks[2] + 1.2, uy0 + i + RULERS.LabelHeightMm / 2, RULERS.LabelHeightMm);
        }
        const [ci, ca]  =  RULERS.CornerMm;
        for (const [x, y, dx, dy] of [[ci, ci, 1, 1], [SHEET_WIDTH_MM - ci, ci, -1, 1], [ci, SHEET_HEIGHT_MM - ci, 1, -1], [SHEET_WIDTH_MM - ci, SHEET_HEIGHT_MM - ci, -1, -1]]) {
            pieces([[x - ox, y + dy * ca - oy], [x - ox, y - oy], [x + dx * ca - ox, y - oy]], TIER_BASE);   // <-- At the real sheet's corners
        }

        // The half-ink probe (tests only): a profile-pen line at a known ink
        if (probe) {
            line([[150, 40.5], [200, 40.5]], PEN_ORDER.length - 1, MEASURE.HalfInkAlpha);
            measures.push({ Kind: 'Probe', Tier: PEN_ORDER.length - 1, X0: 150, X1: 200, Y: 40.5 });
        }
        for (const m of measures) {                                       // <-- Into the real sheet's millimetres
            if (m.X0 != null) { m.X0 += ox; m.X1 += ox; }
            if (m.X != null) m.X += ox;
            if (m.Y != null) m.Y += oy;
            if (m.Y0 != null) { m.Y0 += oy; m.Y1 += oy; }
            if (m.A) { m.A = [m.A[0] + ox, m.A[1] + oy]; m.B = [m.B[0] + ox, m.B[1] + oy]; }
            if (m.C) m.C = [m.C[0] + ox, m.C[1] + oy];
        }
        return { Strokes: strokes, Measures: measures };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing It
// -----------------------------------------------------------------------------

    // FUNCTION | Read a Rectangle of a Target - its alpha, rows from the bottom
    // ------------------------------------------------------------
    function PainterlyNPR__PenCalibration__ReadAlpha(target, x, y, w, h) {
        const gl   =  Gpu.Gl;
        const x0   =  Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
        const x1   =  Math.min(target.Width, Math.ceil(x + w)), y1 = Math.min(target.Height, Math.ceil(y + h));
        const rgba =  new Uint8Array(Math.max(0, x1 - x0) * Math.max(0, y1 - y0) * 4);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, target.Fbo);
        gl.readPixels(x0, y0, x1 - x0, y1 - y0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        return { X: x0, Y: y0, W: x1 - x0, H: y1 - y0, At: (px, py) => rgba[((py - y0) * (x1 - x0) + (px - x0)) * 4 + 3] / 255, Rgba: rgba };
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Sheet at a Resolution - its own targets, the app's state put back
    // ------------------------------------------------------------
    // The pen is the defaults in the technical mode with a steady hand (no
    // pressure): the path exact, the ink full. Returns the targets (the caller
    // disposes them with Dispose), the strokes' geometry and the measures.
    function PainterlyNPR__PenCalibration__Render(dpi, options) {
        const o       =  options || {};
        const sheet   =  PainterlyNPR__GpuResources__SheetPixels(dpi / 25.4);
        if (sheet.Width > Gpu.MaxSize || sheet.Height > Gpu.MaxSize) throw new Error(`${sheet.Width} x ${sheet.Height} is past this GPU's ${Gpu.MaxSize} px limit`);
        Graph.Token++;                                                        // <-- Any refine in flight stops: the ribbon buffer is borrowed
        const saved   =  { Width: Gpu.Width, Height: Gpu.Height, PxPerMm: Gpu.PxPerMm, Scale: Gpu.Scale, Ink: Gpu.Targets.Ink, InkBase: Gpu.Targets.InkBase,
                           RibbonVerts: Cpu.RibbonVerts, RibbonBaseVerts: Cpu.RibbonBaseVerts, Pen: State.Pen };
        const ink     =  PainterlyNPR__GpuResources__CreateTarget('Calibration ink', sheet.Width, sheet.Height, ['RGBA8'], false);
        const base    =  PainterlyNPR__GpuResources__CreateTarget('Calibration base lines', sheet.Width, sheet.Height, ['RGBA8'], false);
        const geometry  =  [];
        let layout    =  null;
        try {
            Gpu.Width = sheet.Width; Gpu.Height = sheet.Height; Gpu.PxPerMm = sheet.PxPerMm; Gpu.Scale = sheet.PxPerMm / BASE_PX_PER_MM;
            Gpu.Targets.Ink = ink; Gpu.Targets.InkBase = base;
            State.Pen  =  Object.assign({}, PEN_DEFAULTS, { WidthMode: 'Technical', Pressure: 0 }, o.Pen || {});
            PainterlyNPR__TechnicalPens__SetPrintPxPerMm(null);
            layout  =  PainterlyNPR__PenCalibration__Strokes(sheet.PxPerMm, dpi, o.Probe);
            const out  =  new PainterlyNPR__FloatBuilder(1 << 18), under = new PainterlyNPR__FloatBuilder(1 << 18);
            for (const stroke of layout.Strokes) {
                const a = out.Length, b = under.Length;
                PainterlyNPR__StrokeSynthesis__Stroke(stroke, out, under);
                let max = 0, maxBase = 0;
                for (let i = a + 5; i < out.Length; i += 7) max = Math.max(max, out.Data[i]);
                for (let i = b + 5; i < under.Length; i += 7) maxBase = Math.max(maxBase, under.Data[i]);
                const pts  =  stroke.Points;
                let lenPx  =  0;
                for (let i = 1; i < pts.length; i++) lenPx += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
                geometry.push({ Tier: stroke.Tier, Source: stroke.Source, LenMm: lenPx / sheet.PxPerMm, MaxHalfPx: max, MaxBaseHalfPx: maxBase });
            }
            const gl  =  Gpu.Gl;
            Cpu.RibbonVerts      =  out.Length / 7;
            Cpu.RibbonBaseVerts  =  under.Length / 7;
            out.Reserve(under.Length);
            out.Data.set(under.Data.subarray(0, under.Length), out.Length);
            gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Ribbons);
            gl.bufferData(gl.ARRAY_BUFFER, out.Data.subarray(0, out.Length + under.Length), gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            PainterlyNPR__InkLayer__Run();
        } finally {
            Gpu.Width = saved.Width; Gpu.Height = saved.Height; Gpu.PxPerMm = saved.PxPerMm; Gpu.Scale = saved.Scale;
            Gpu.Targets.Ink = saved.Ink; Gpu.Targets.InkBase = saved.InkBase;
            Cpu.RibbonVerts = saved.RibbonVerts; Cpu.RibbonBaseVerts = saved.RibbonBaseVerts;
            State.Pen  =  saved.Pen;
            PainterlyNPR__RenderGraph__Bump('Lines');                         // <-- The app's ribbons are synthesised again on its next refine
        }
        return { Dpi: dpi, Width: sheet.Width, Height: sheet.Height, PxPerMm: sheet.PxPerMm, Ink: ink, Base: base, Geometry: geometry, Measures: layout.Measures, Strokes: layout.Strokes.length };
    }

    function PainterlyNPR__PenCalibration__Dispose(render) {
        PainterlyNPR__GpuResources__DisposeTarget(render.Ink);
        PainterlyNPR__GpuResources__DisposeTarget(render.Base);
        render.Ink = render.Base = null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Measuring It
// -----------------------------------------------------------------------------

    // FUNCTION | Measure the Pens - geometry strictly, the raster to a tolerance
    // ------------------------------------------------------------
    // A line's raster width is the ink's coverage summed across it: the box
    // filter makes the sum its width in pixels, whatever the pixel grid, so a
    // 0.13 mm line at 300 dpi (1.54 px) measures 1.54 px. Sampled along the
    // middle of each line, clear of its ends; a diagonal's sum across a row is
    // width / sin(angle); a circle's whole ring is its length times its width.
    function PainterlyNPR__PenCalibration__Measure(render) {
        const d     =  render.PxPerMm;
        const win   =  MEASURE.WindowPx;
        const clear =  MEASURE.EndClearMm;
        const toPx  =  (x, y) => [x * d, (SHEET_HEIGHT_MM - y) * d];          // <-- Sheet millimetres from the top-left to target pixels (y up)
        const stats =  (values) => {
            const n  =  values.length;
            const mean = values.reduce((s, v) => s + v, 0) / n;
            return { N: n, MeanMm: mean / d, MinMm: Math.min(...values) / d, MaxMm: Math.max(...values) / d };
        };
        const results  =  [];
        for (const m of render.Measures) {
            const nominal  =  TIER_WIDTH_MM[m.Tier];
            const halfPx   =  nominal * d / 2 + win;
            let sums  =  [];
            let peak  =  0;
            if (m.Kind === 'H' || m.Kind === 'Probe') {
                const [x0] = toPx(m.X0 + clear, m.Y), [x1, yc] = toPx(m.X1 - clear, m.Y);
                const r  =  PainterlyNPR__PenCalibration__ReadAlpha(render.Ink, x0, yc - halfPx, x1 - x0, 2 * halfPx + 1);
                for (let px = r.X; px < r.X + r.W; px++) { let s = 0; for (let py = r.Y; py < r.Y + r.H; py++) { const a = r.At(px, py); s += a; peak = Math.max(peak, a); } sums.push(s); }
            } else if (m.Kind === 'V') {
                const [xc, ya] = toPx(m.X, m.Y0 + clear), [, yb] = toPx(m.X, m.Y1 - clear);
                const r  =  PainterlyNPR__PenCalibration__ReadAlpha(render.Ink, xc - halfPx, yb, 2 * halfPx + 1, ya - yb);
                for (let py = r.Y; py < r.Y + r.H; py++) { let s = 0; for (let px = r.X; px < r.X + r.W; px++) s += r.At(px, py); sums.push(s); }
            } else if (m.Kind === 'D') {
                const sin  =  Math.sin(m.Angle * Math.PI / 180), cot = 1 / Math.tan(m.Angle * Math.PI / 180);
                const [ax, ay] = toPx(m.A[0], m.A[1]), [bx, by] = toPx(m.B[0], m.B[1]);
                const reach  =  halfPx / sin + 2;
                const r  =  PainterlyNPR__PenCalibration__ReadAlpha(render.Ink, Math.min(ax, bx) - reach, ay, Math.abs(bx - ax) + 2 * reach, by - ay);
                const lo = ay + clear * d * sin, hi = by - clear * d * sin;
                for (let py = Math.ceil(lo); py < Math.floor(hi); py++) {
                    const xc  =  ax + (py + 0.5 - ay) * cot;
                    let s = 0;
                    for (let px = Math.floor(xc - reach); px <= Math.ceil(xc + reach); px++) if (px >= r.X && px < r.X + r.W) s += r.At(px, py);
                    sums.push(s * sin);
                }
            } else if (m.Kind === 'Circle') {
                const [cx, cy] = toPx(m.C[0], m.C[1]);
                const R  =  m.R * d, out = R + halfPx + 1;
                const r  =  PainterlyNPR__PenCalibration__ReadAlpha(render.Ink, cx - out, cy - out, 2 * out + 1, 2 * out + 1);
                let area  =  0;
                for (let py = r.Y; py < r.Y + r.H; py++) for (let px = r.X; px < r.X + r.W; px++) {
                    const dist  =  Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
                    if (Math.abs(dist - R) <= halfPx) area += r.At(px, py);
                }
                sums  =  [area / (2 * Math.PI * R)];
            }
            const s  =  stats(sums);
            const result  =  { Kind: m.Kind + (m.Angle ? m.Angle : ''), Pen: PEN_ORDER[m.Tier], NominalMm: nominal, NominalPx: nominal * d, MeanMm: s.MeanMm, MinMm: s.MinMm, MaxMm: s.MaxMm, ErrorMm: s.MeanMm - nominal, Samples: s.N };
            if (m.Kind === 'Probe') Object.assign(result, { PeakAlpha: peak, ExpectedAlpha: MEASURE.HalfInkAlpha, MeanMm: s.MeanMm / MEASURE.HalfInkAlpha, ErrorMm: s.MeanMm / MEASURE.HalfInkAlpha - nominal });
            result.Ok  =  Math.abs(result.ErrorMm) <= MEASURE.RasterTolMm && (m.Kind !== 'Probe' || Math.abs(peak - MEASURE.HalfInkAlpha) <= 1.5 / 255);
            results.push(result);
        }

        // Geometry: the half-width each ribbon was given, against its pen
        const geometry  =  PEN_ORDER.map((key, tier) => {
            const g  =  render.Geometry.filter(x => x.Tier === tier && x.LenMm >= 1);
            const want  =  TIER_WIDTH_MM[tier] * d / 2, wantBase = BASE_WIDTH_MM * d / 2;
            const err   =  g.reduce((e, x) => Math.max(e, Math.abs(x.MaxHalfPx - want)), 0);
            const errB  =  g.reduce((e, x) => Math.max(e, Math.abs(x.MaxBaseHalfPx - wantBase)), 0);
            return { Pen: key, Strokes: g.length, HalfPx: want, MaxErrorPx: err, BaseHalfPx: wantBase, BaseMaxErrorPx: errB, Ok: g.length > 0 && err <= MEASURE.GeometryTolPx && errB <= MEASURE.GeometryTolPx };
        });

        // The base buffer inside the ink, in strips
        let outside = 0, excess = 0, basePixels = 0;
        const where  =  [];
        const strip  =  256;
        for (let y = 0; y < render.Height; y += strip) {
            const h  =  Math.min(strip, render.Height - y);
            const a  =  PainterlyNPR__PenCalibration__ReadAlpha(render.Ink, 0, y, render.Width, h).Rgba;
            const b  =  PainterlyNPR__PenCalibration__ReadAlpha(render.Base, 0, y, render.Width, h).Rgba;
            for (let i = 3; i < b.length; i += 4) {
                if (!b[i]) continue;
                basePixels++;
                const over  =  b[i] - a[i];
                if (over > MEASURE.ContainTol) {
                    outside++;
                    excess  =  Math.max(excess, over);
                    if (where.length < 12) { const p = (i - 3) / 4, px = p % render.Width, py = y + Math.floor(p / render.Width); where.push([+(px / d).toFixed(2), +(SHEET_HEIGHT_MM - py / d).toFixed(2), b[i], a[i]]); }   // <-- Sheet mm from the top-left, base and ink
                }
            }
        }
        const contain  =  { BasePixels: basePixels, Outside: outside, MaxExcess: excess, Where: where, Ok: basePixels > 0 && outside === 0 };
        const ok  =  results.every(r => r.Ok) && geometry.every(g => g.Ok) && contain.Ok;
        return { Dpi: render.Dpi, PxPerMm: d, Width: render.Width, Height: render.Height, Strokes: render.Strokes, Lines: results, Geometry: geometry, Containment: contain, Ok: ok };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Exporting It
// -----------------------------------------------------------------------------

    // FUNCTION | The Sheet as Paper - the ink laid on white, rows top to bottom
    // ------------------------------------------------------------
    function PainterlyNPR__PenCalibration__Paper(render, channels) {
        const W = render.Width, H = render.Height;
        const r  =  PainterlyNPR__PenCalibration__ReadAlpha(render.Ink, 0, 0, W, H).Rgba;
        const inkC = Hex(SHEET.InkSrgb).map(c => c * 255), paperC = Hex(SHEET.PaperSrgb).map(c => c * 255);
        const out  =  new Uint8ClampedArray(W * H * channels);
        for (let y = 0; y < H; y++) {
            const src = (H - 1 - y) * W * 4, dst = y * W * channels;
            for (let x = 0; x < W; x++) {
                const a  =  r[src + x * 4 + 3] / 255;
                for (let c = 0; c < 3; c++) out[dst + x * channels + c] = paperC[c] + (inkC[c] - paperC[c]) * a;
                if (channels === 4) out[dst + x * channels + 3] = 255;
            }
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Export the Calibration Sheet - a PNG with its print size, or a true-size PDF
    // ------------------------------------------------------------
    async function PainterlyNPR__PenCalibration__Export(format, dpi) {
        const resolution  =  dpi || SHEET.ExportDpi;
        PainterlyNPR__Interface__Status(`Drawing the pen calibration sheet at ${resolution} dpi …`);
        const render  =  PainterlyNPR__PenCalibration__Render(resolution);
        try {
            const report  =  PainterlyNPR__PenCalibration__Measure(render);
            const worst   =  report.Lines.reduce((e, l) => Math.max(e, Math.abs(l.ErrorMm)), 0);
            const name    =  `PainterlyNPR__PenCalibration__${render.Width}x${render.Height}__${resolution}dpi__.${format === 'pdf' ? 'pdf' : 'png'}`;
            const words   =  PainterlyNPR__PrintSize__Describe(render.Width, render.Height, render.PxPerMm, SHEET_WIDTH_MM, SHEET_HEIGHT_MM);
            if (format === 'pdf') {
                const blob  =  await PainterlyNPR__Export__Pdf(PainterlyNPR__PenCalibration__Paper(render, 3), render.Width, render.Height, SHEET_WIDTH_MM, SHEET_HEIGHT_MM, { Title: 'PainterlyNPR technical pen calibration', Subject: words });
                PainterlyNPR__Export__Download(blob, name);
            } else {
                const canvas  =  document.createElement('canvas');
                canvas.width  =  render.Width;
                canvas.height =  render.Height;
                canvas.getContext('2d').putImageData(new ImageData(PainterlyNPR__PenCalibration__Paper(render, 4), render.Width, render.Height), 0, 0);
                const blob  =  await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const png   =  PainterlyNPR__PrintSize__Png(new Uint8Array(await blob.arrayBuffer()), render.PxPerMm, { Comment: words, Software: `PainterlyNPR ${ENGINE_VERSION}` }, render.Height / SHEET_HEIGHT_MM);
                PainterlyNPR__Export__Download(new Blob([png], { type: 'image/png' }), name);
            }
            PainterlyNPR__Interface__Status(`Exported ${name} - the four pens measure within ${(worst * 1000).toFixed(2)} µm of 0.13, 0.18, 0.25 and 0.35 mm${report.Ok ? '' : ' (CHECK FAILED - see the console)'}`);
            if (!report.Ok) console.warn('[PainterlyNPR PenCalibration]', report);
            return report;
        } finally {
            PainterlyNPR__PenCalibration__Dispose(render);
            PainterlyNPR__RenderGraph__Request('Refine');
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
        PainterlyNPR__PenCalibration__Dispose,
        PainterlyNPR__PenCalibration__Export,
        PainterlyNPR__PenCalibration__Measure,
        PainterlyNPR__PenCalibration__ReadAlpha,
        PainterlyNPR__PenCalibration__Render,
        PainterlyNPR__PenCalibration__Strokes,
        SHEET  as  PainterlyNPR__PenCalibration__SHEET,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
