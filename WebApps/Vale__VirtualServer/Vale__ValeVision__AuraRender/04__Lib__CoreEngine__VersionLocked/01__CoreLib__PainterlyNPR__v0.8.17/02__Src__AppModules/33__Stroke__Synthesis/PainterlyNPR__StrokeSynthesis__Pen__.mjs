/* =============================================================================
   PAINTERLYNPR - STROKE | SYNTHESIS
   =============================================================================

   FILE       : PainterlyNPR__StrokeSynthesis__Pen__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Stroke - Synthesis
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : One stroke as a pen would make it - resampled in millimetres,
                wobbled, tapered, pressed and overdrawn by the discipline - into
                one ribbon buffer
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Ribbons are two triangles a segment, widened by AA_PX and faded in the
     shader: antialiasing without MSAA.
   - v0.8.0, the technical pens: a stroke is drawn at exactly its pen's width
     (0.13, 0.18, 0.25 or 0.35 mm x the print density), shaped only at its ends
     by its taper and a run-out. Pressure, dwell and the presets move its ink and
     its path, never its width; the broad nib, line weight and pressure widths
     belong to the explicitly non-technical Variable mode, and even there a
     line is never thinner than the base pen. Every stroke is drawn a second
     time, on the same centreline, at the base pen, into the base buffer.

   WHY ONE CENTRELINE, ONCE:
   - The ink layer holds each stroke once, at the strongest pen that applies,
     so a heavier pen never sits over the base and darkens or thickens it. The
     base buffer is the same centrelines at 0.13 mm, drawn alongside: inside the
     ink by construction, and on view by itself (Base lines).

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Stroke Synthesis
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : v0.8.0 - widths are the technical pens' (see above); every
                   stroke also gives a base ribbon; the pen is packed with the dry
                   ink (dry + 2 x tier) for the Pen tiers view

   ============================================================================= */

import StrokeConfig from './Na__StrokeSynthesis__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__AA_PX              as  AA_PX,
    PainterlyNPR__Engine__DEG                as  DEG,
    PainterlyNPR__Engine__STROKE_SPACING_MM  as  STROKE_SPACING_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__Maths__Clamp       as  Clamp,
    PainterlyNPR__Maths__SmoothStep  as  SmoothStep,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__Noise1,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import {
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__LineCandidates__Lines as Lines } from '../30__Line__CandidateCollection/PainterlyNPR__LineCandidates__Collect__.mjs';
import {
    PainterlyNPR__TechnicalPens__NearestTier,
    PainterlyNPR__TechnicalPens__PxPerMm,
    PainterlyNPR__TechnicalPens__Technical,
    PainterlyNPR__TechnicalPens__BASE_WIDTH_MM  as  BASE_WIDTH_MM,
    PainterlyNPR__TechnicalPens__TIER_BASE      as  TIER_BASE,
    PainterlyNPR__TechnicalPens__TIER_WIDTH_MM  as  TIER_WIDTH_MM,
} from '../32__Line__ClassAndPriority/PainterlyNPR__TechnicalPens__Tiers__.mjs';
import { PainterlyNPR__DrawingDiscipline__NEUTRAL_LOCAL as NEUTRAL_LOCAL } from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import { PainterlyNPR__StrokeSynthesis__DisciplineAt } from '../35__Line__DrawingDiscipline/PainterlyNPR__StrokeSynthesis__DisciplineMacro__.mjs';
import { PainterlyNPR__MaterialIndication__Indication as Indication } from '../36__Line__MaterialIndication/PainterlyNPR__MaterialIndication__Pass__.mjs';

// =============================================================================
// REGION | Synthesis
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__StrokeSynthesis__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const PATH  =  PainterlyNPR__ConfigAccess__Section(StrokeConfig, 'PainterlyNPR__StrokeSynthesis__Config', 'Path', ['PenPathAdd']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Stroke Synthesis
// -----------------------------------------------------------------------------

    // FUNCTION | Resample a Polyline at a Fixed Spacing
    // ------------------------------------------------------------
    function PainterlyNPR__StrokeSynthesis__Resample(points, spacing) {
        const X = [points[0][0]], Y = [points[0][1]], S = [0];
        let carried  =  0;
        let total    =  0;
        for (let i = 0; i < points.length - 1; i++) {
            const ax = points[i][0], ay = points[i][1], bx = points[i + 1][0], by = points[i + 1][1];
            const len  =  Math.hypot(bx - ax, by - ay);
            if (len < 1e-6) continue;
            let at  =  spacing - carried;
            while (at <= len) {
                X.push(ax + (bx - ax) * (at / len));
                Y.push(ay + (by - ay) * (at / len));
                S.push(total + at);
                at += spacing;
            }
            carried  =  len - (at - spacing);
            total   +=  len;
        }
        const last  =  points[points.length - 1];
        if (Math.hypot(last[0] - X[X.length - 1], last[1] - Y[Y.length - 1]) > spacing * 0.25) { X.push(last[0]); Y.push(last[1]); S.push(total); }
        return { X, Y, S, Length: total };
    }
    // ------------------------------------------------------------


    // FUNCTION | Emit a Ribbon - two triangles per segment, widened for antialiasing
    // ------------------------------------------------------------
    function PainterlyNPR__StrokeSynthesis__Ribbon(X, Y, Half, Alpha, dry, out) {
        const n  =  X.length;
        if (n < 2) return;
        const NX  =  new Float32Array(n), NY = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
            let tx = X[i1] - X[i0], ty = Y[i1] - Y[i0];
            const len  =  Math.hypot(tx, ty) || 1;
            tx /= len; ty /= len;
            NX[i] = -ty; NY[i] = tx;
        }
        out.Reserve((n - 1) * 42);
        const d  =  out.Data;
        let o    =  out.Length;
        const put  =  (i, side) => {
            const e  =  Half[i] + AA_PX;
            d[o++] = X[i] + NX[i] * e * side; d[o++] = Y[i] + NY[i] * e * side;
            d[o++] = Alpha[i]; d[o++] = dry; d[o++] = side; d[o++] = Half[i]; d[o++] = e;
        };
        for (let i = 0; i < n - 1; i++) {
            put(i, 1); put(i, -1); put(i + 1, 1);
            put(i, -1); put(i + 1, -1); put(i + 1, 1);
        }
        out.Length  =  o;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Stroke's Parameters - the macro, the Pen's sliders, the field, the ceiling
    // ------------------------------------------------------------
    // The Drawing Discipline gives each value; the Pen tab multiplies it; a Line
    // Control point multiplies it again where it reaches. Then the view profile's
    // ceiling binds the PATH (wobble, drift, tremor, overshoot, searching lines):
    // in a measured elevation the centreline stays where the geometry is, while
    // the mark itself - pressure, taper, nib, dwell - stays free.
    // Above x1 the path sliders add an amount of their own - the macro's are
    // tiny, its tremor never a pixel - so x3 is a wobble that shows, a bow even
    // on a short line, a tremor in the hand; below x1 they scale the macro's down
    // to none, and at x1 nothing changes. A measured elevation's ceiling still
    // binds them all.
    const PEN_PATH_ADD  =  PATH.PenPathAdd;

    function PainterlyNPR__StrokeSynthesis__Params(stroke) {
        const pen    =  State.Pen;
        const P      =  PainterlyNPR__StrokeSynthesis__DisciplineAt(stroke.Loose);
        const local  =  stroke.Local || NEUTRAL_LOCAL;
        const out    =  {
            WobbleMm         :  (P.WobbleMm * pen.Wobble + PEN_PATH_ADD.WobbleMm * Math.max(0, pen.Wobble - 1)) * local.Wobble + (local.WobbleAddMm || 0),   // <-- Added by a Line Control point on planting: a real wobble, not a multiple of the macro's tiny one
            DriftMm          :  P.DriftMm * pen.Drift * local.Wobble + 2 * (local.WobbleAddMm || 0),
            DriftAddMm       :  PEN_PATH_ADD.DriftMm * Math.max(0, pen.Drift - 1) * local.Wobble,   // <-- The slider's own bow, full from a 15 mm line up
            TremorMm         :  (P.TremorMm * pen.Tremor + PEN_PATH_ADD.TremorMm * Math.max(0, pen.Tremor - 1)) * local.Wobble,
            OvershootMm      :  P.OvershootMm * pen.Overshoot,
            UndershootChance :  Math.min(0.9, P.UndershootChance * pen.MissedJoins),
            PressureVar      :  Math.min(0.95, P.PressureVar * pen.Pressure * local.Pressure + (local.PressureAdd || 0)),
            BreakChance      :  Math.min(0.95, P.BreakChance * pen.Breaks * (1 + 2 * local.Breakup)),
            OverdrawChance   :  P.OverdrawChance * pen.Searching * local.Overdraw + (local.OverdrawAdd || 0),
            TaperInMm        :  P.TaperInMm * pen.Taper,
            TaperOutMm       :  P.TaperOutMm * pen.Taper,
            DwellChance      :  Math.min(0.95, P.DwellChance * pen.Dwell),
            FlickChance      :  Math.min(0.95, P.FlickChance * pen.Flick),
        };
        const ceiling  =  State.Camera.Ceiling;
        if (ceiling < 1) {
            const C  =  PainterlyNPR__StrokeSynthesis__DisciplineAt(ceiling);
            out.WobbleMm        =  Math.min(out.WobbleMm, C.WobbleMm);
            out.DriftMm         =  Math.min(out.DriftMm, C.DriftMm);
            out.DriftAddMm      =  0;
            out.TremorMm        =  Math.min(out.TremorMm, C.TremorMm);
            out.OvershootMm     =  Math.min(out.OvershootMm, C.OvershootMm);
            out.OverdrawChance  =  Math.min(out.OverdrawChance, C.OverdrawChance);
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | One Stroke, as a Pen Would Make It
    // ------------------------------------------------------------
    // The path first: overshoot or a missed join at TRUE corners only - never
    // where a line went behind something - and, as the pen leaves the paper,
    // sometimes a flick. Then smooth drift and a slight bow (never a visible
    // sine), a controlled break on a long line, and searching lines beside it.
    // Then the mark: pressure tapering in and out, a dot of ink where the pen
    // rested on landing, and a broad nib's width turning with the direction.
    // A stroke that ran out past the paint (Run) fades and narrows along it.
    // With the technical pens (the default) the width is the pen's, exactly,
    // along the body: the taper and a run-out shape its ends, pressure and the
    // dwell are ink. base, when given, takes the same centreline at the base pen.
    const RUN_AT  =  new Float32Array(2);                                     // <-- A run-out's ink and width where a vertex falls
    const BASE_END_INSET_PX  =  0.02;                                         // <-- Past the rasteriser's sub-pixel snapping (1/256 px), far under a micron on paper

    function PainterlyNPR__StrokeSynthesis__RunAt(run, s) {
        const S = run.S, n = S.length;
        if (s <= S[0])     { RUN_AT[0] = run.A[0];     RUN_AT[1] = run.W[0];     return; }
        if (s >= S[n - 1]) { RUN_AT[0] = run.A[n - 1]; RUN_AT[1] = run.W[n - 1]; return; }
        let lo = 0, hi = n - 1;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
        const t  =  (s - S[lo]) / Math.max(S[hi] - S[lo], 1e-6);
        RUN_AT[0]  =  run.A[lo] + (run.A[hi] - run.A[lo]) * t;
        RUN_AT[1]  =  run.W[lo] + (run.W[hi] - run.W[lo]) * t;
    }

    function PainterlyNPR__StrokeSynthesis__Stroke(stroke, out, base) {
        const pxPerMm  =  Gpu.PxPerMm;                                        // <-- The sheet's: the path, its wobble and overshoot
        const penPx    =  PainterlyNPR__TechnicalPens__PxPerMm();             // <-- The print's: the pen's width
        const pen      =  State.Pen;
        const technical  =  PainterlyNPR__TechnicalPens__Technical();
        const tier     =  stroke.Tier != null ? stroke.Tier : PainterlyNPR__TechnicalPens__NearestTier(stroke.WidthMm || BASE_WIDTH_MM);   // <-- A stroke from outside the line pass without a pen takes the nearest
        const widthMm  =  technical ? TIER_WIDTH_MM[tier] : (stroke.WidthMm || TIER_WIDTH_MM[tier]);
        const P        =  PainterlyNPR__StrokeSynthesis__Params(stroke);
        const rng      =  PainterlyNPR__SeededRandom__Create(stroke.Seed);
        const run      =  stroke.Run;
        let pts        =  stroke.Points;
        let dwell      =  false;
        let lead       =  0;                                                  // <-- How far before its first point the path now starts (an overshoot), px
        if (stroke.Straight) {
            const a = pts[0], b = pts[pts.length - 1];
            const len  =  Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (len < 0.5) return;
            const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
            const end  =  (isTrue) => {
                if (!isTrue) return 0;
                if (rng.Chance(P.UndershootChance)) return -(0.1 + rng.Range(0.15, 0.5) * Math.max(P.OvershootMm, 0.6));   // <-- A missed join: the pen stops short of the corner
                return rng.Range(0.2, 1.0) * P.OvershootMm;
            };
            const e0 = end(stroke.StartTrue) * pxPerMm, e1 = end(stroke.EndTrue) * pxPerMm;
            if (len + e0 + e1 < 1) return;
            lead  =  e0;
            const A = [a[0] - ux * e0, a[1] - uy * e0], B = [b[0] + ux * e1, b[1] + uy * e1];
            pts    =  [A, B];
            dwell  =  stroke.StartTrue && rng.Chance(P.DwellChance);
            if (stroke.EndTrue && rng.Chance(P.FlickChance)) {
                // The flick: the pen leaves with a hook that curls a little more each step
                const hook   =  rng.Range(18, 40) * DEG * (rng.Chance(0.5) ? 1 : -1);
                const segPx  =  rng.Range(0.5, 1.3) * Math.sqrt(Math.max(pen.Flick, 0.2)) * pxPerMm / 4;
                let x = B[0], y = B[1];
                for (let j = 1; j <= 4; j++) {
                    const turn  =  hook * (j / 4) * (j / 4);
                    x  +=  (ux * Math.cos(turn) - uy * Math.sin(turn)) * segPx;
                    y  +=  (ux * Math.sin(turn) + uy * Math.cos(turn)) * segPx;
                    pts.push([x, y]);
                }
            }
        }
        const res  =  PainterlyNPR__StrokeSynthesis__Resample(pts, STROKE_SPACING_MM * pxPerMm);
        if (res.X.length < 2) return;
        const L      =  res.Length;
        const Lmm    =  L / pxPerMm;
        const wobble =  stroke.Wobble != null ? stroke.Wobble : 1;

        let segments  =  [[0, L]];
        if (Lmm > 9 && rng.Chance(P.BreakChance)) {
            const at = rng.Range(0.3, 0.7) * L, gap = rng.Range(0.5, 1.6) * pxPerMm;
            segments  =  [[0, at - gap / 2], [at + gap / 2, L]];
        }
        // Searching lines: the chance is now an expected count, up to three. With
        // the technical pens a searching line is a light mark of the base pen
        const passes  =  [{ Offset: 0, Seed: stroke.Seed, Alpha: 1, Width: 1, T0: 0, T1: 0, Dwell: dwell, Tier: tier }];
        if (Lmm > (stroke.OverdrawMinMm != null ? stroke.OverdrawMinMm : 5)) {   // <-- A leaf mark is short: planting lets its searching passes in from 1.2 mm
            const expect  =  Math.min(3, P.OverdrawChance);
            const count   =  Math.floor(expect) + (rng.Next() < expect - Math.floor(expect) ? 1 : 0);
            for (let j = 0; j < count; j++) {
                passes.push({ Offset: (rng.Chance(0.5) ? 1 : -1) * rng.Range(0.12, 0.42) * (1 + 0.45 * j), Seed: (stroke.Seed ^ (0x5BD1E995 + Math.imul(j + 1, 0x9E3779B9))) >>> 0, Alpha: 0.6 / (1 + 0.35 * j), Width: 0.85, T0: rng.Range(0, 0.25) * L, T1: rng.Range(0, 0.25) * L, Dwell: false, Tier: technical ? TIER_BASE : tier });
            }
        }

        // Normals of the resampled path, for drift; the broad nib's width by direction
        const n    =  res.X.length;
        const NX   =  new Float32Array(n), NY = new Float32Array(n), NIB = new Float32Array(n);
        const nib  =  pen.NibAngle * DEG;
        for (let i = 0; i < n; i++) {
            const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
            let tx = res.X[i1] - res.X[i0], ty = res.Y[i1] - res.Y[i0];
            const len  =  Math.hypot(tx, ty) || 1;
            tx /= len; ty /= len;
            NX[i]  =  -ty; NY[i] = tx;
            NIB[i] =  technical ? 1 : 1 + pen.NibContrast * (0.3 + 1.1 * Math.abs(Math.sin(Math.atan2(ty, tx) - nib)) - 1);   // <-- Thin along the nib's edge, full across it; the mean stays 1. A tubular nib is round
        }

        const dwellSize =  1 + 0.6 * Math.max(0, pen.Dwell - 1);
        const taperIn   =  stroke.TaperIn  != null ? stroke.TaperIn  : P.TaperInMm;   // <-- 0: no taper at all - a tubular nib's full width to its end (lettering, the calibration sheet, Taper x0)
        const taperOut  =  stroke.TaperOut != null ? stroke.TaperOut : P.TaperOutMm;
        const baseHalf  =  0.5 * BASE_WIDTH_MM * penPx;
        for (const pass of passes) {
            const prng      =  PainterlyNPR__SeededRandom__Create(pass.Seed);
            const passHalf  =  0.5 * (technical ? TIER_WIDTH_MM[pass.Tier] : widthMm * State.LineWeight * pass.Width) * penPx;
            const packed    =  Clamp(stroke.Dry, 0, 1) + 2 * pass.Tier;        // <-- The pen rides with the dry ink: the shader takes it apart
            const lam       =  prng.Range(5, 11);
            const seedA = prng.IntRange(1, 1e6), seedB = prng.IntRange(1, 1e6), seedC = prng.IntRange(1, 1e6);
            const driftSign =  prng.Chance(0.5) ? 1 : -1;
            for (const [s0raw, s1raw] of segments) {
                const s0  =  Math.max(s0raw, pass.T0), s1 = Math.min(s1raw, L - pass.T1);
                if (s1 - s0 < 0.3 * pxPerMm) continue;
                const landed  =  pass.Dwell && s0 === 0;
                const X = [], Y = [], Half = [], HalfBase = [], Alpha = [];
                for (let i = 0; i < n; i++) {
                    const S  =  res.S[i];
                    if (S < s0 || S > s1) continue;
                    const t      =  (S - s0) / (s1 - s0);
                    const sMm    =  S / pxPerMm;
                    const segMm  =  (s1 - s0) / pxPerMm;
                    const off    =  wobble * (P.WobbleMm * (PainterlyNPR__SeededRandom__Noise1(sMm / lam, seedA) - 0.5) * 2
                                 + (P.DriftMm * Math.min(1, segMm / 40) + (P.DriftAddMm || 0) * Math.min(1, segMm / 15)) * driftSign * 4 * t * (1 - t)
                                 + P.TremorMm * (PainterlyNPR__SeededRandom__Noise1(sMm / 0.7, seedB) - 0.5) * 2)
                                 + pass.Offset;
                    const fromStart  =  (S - s0) / pxPerMm;
                    const blob   =  landed ? Math.exp(-Math.pow((fromStart - 0.1 * dwellSize) / (0.16 * dwellSize), 2)) : 0;   // <-- The ink the pen left while it rested; Ink dwell above x1 leaves more
                    const tin    =  landed || taperIn <= 0 ? 1 : SmoothStep(0, Math.max(taperIn, 0.01), fromStart);
                    const tout   =  taperOut <= 0 ? 1 : SmoothStep(0, Math.max(taperOut, 0.01), (s1 - S) / pxPerMm);
                    const shape  =  (0.4 + 0.6 * tin) * (0.25 + 0.75 * tout);      // <-- The taper: 1 along the body, so the body is the pen's own width
                    const press  =  shape * (1 - P.PressureVar * PainterlyNPR__SeededRandom__Noise1(sMm / 6 + 3.1, seedC));
                    let ra = 1, rw = 1;
                    if (run) { PainterlyNPR__StrokeSynthesis__RunAt(run, (S - lead) / pxPerMm); ra = RUN_AT[0]; rw = RUN_AT[1]; }
                    const ends   =  (0.5 + 0.5 * shape) * rw;
                    X.push(res.X[i] + NX[i] * off * pxPerMm);
                    Y.push(res.Y[i] + NY[i] * off * pxPerMm);
                    HalfBase.push(baseHalf * ends);
                    Half.push(technical ? passHalf * ends : Math.max(baseHalf * ends, passHalf * (0.5 + 0.5 * press) * NIB[i] * (1 + 1.4 * dwellSize * blob) * rw));   // <-- Variable: pressure, nib and dwell widths, never under the base
                    Alpha.push(Clamp((stroke.Alpha * pass.Alpha * (0.72 + 0.28 * press) + 0.3 * blob) * pen.InkDensity * ra, 0, 1));
                }
                PainterlyNPR__StrokeSynthesis__Ribbon(X, Y, Half, Alpha, packed, out);
                if (base && technical && pass.Tier === TIER_BASE) PainterlyNPR__StrokeSynthesis__Ribbon(X, Y, HalfBase, Alpha, Clamp(stroke.Dry, 0, 1), base);   // <-- Drawn with the base pen: its base ribbon is its ink ribbon, exactly
                else if (base) {
                    const m  =  X.length;
                    const XB = X.slice(), YB = Y.slice();                 // <-- Under a heavier pen, its ends a fiftieth of a pixel inside the ink's: a pixel centre on a ribbon's end edge, which the rasteriser may give either way, is never the base's alone
                    for (const [i, j] of m > 1 ? [[0, 1], [m - 1, m - 2]] : []) {
                        const dx = XB[j] - XB[i], dy = YB[j] - YB[i], len = Math.hypot(dx, dy);
                        if (len > 0.1) { XB[i] += dx / len * BASE_END_INSET_PX; YB[i] += dy / len * BASE_END_INSET_PX; }
                    }
                    PainterlyNPR__StrokeSynthesis__Ribbon(XB, YB, HalfBase, Alpha, Clamp(stroke.Dry, 0, 1), base);
                }
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - Synthesise Every Stroke Into One Ribbon Buffer
    // ------------------------------------------------------------
    // The ink's ribbons first, then the base buffer's - the same strokes at the
    // base pen - in one buffer, so the ink pass draws them as two ranges with
    // the vertex array every host already makes.
    function PainterlyNPR__StrokeSynthesis__Run() {
        const gl    =  Gpu.Gl;
        const out   =  Cpu.Ribbons;
        const base  =  Cpu.RibbonsBase;
        out.Clear();
        base.Clear();
        for (const stroke of Lines.Strokes) PainterlyNPR__StrokeSynthesis__Stroke(stroke, out, base);
        for (const stroke of Indication.Strokes) PainterlyNPR__StrokeSynthesis__Stroke(stroke, out, base);
        Cpu.RibbonVerts      =  out.Length / 7;
        Cpu.RibbonBaseVerts  =  base.Length / 7;
        out.Reserve(base.Length);
        out.Data.set(base.Data.subarray(0, base.Length), out.Length);
        gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Ribbons);
        gl.bufferData(gl.ARRAY_BUFFER, out.Data.subarray(0, out.Length + base.Length), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__StrokeSynthesis__Params,
        PainterlyNPR__StrokeSynthesis__Run,
        PainterlyNPR__StrokeSynthesis__Stroke,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
