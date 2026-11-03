/* =============================================================================
   PAINTERLYNPR - LINE | TONAL HATCHING
   =============================================================================

   FILE       : PainterlyNPR__LineCandidates__Hatching__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - TonalHatching
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Tonal hatching: nested lines, so tone grows without reshuffling -
                each run as a hand draws it
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Lines join a tone in bit-reversed order, so a lighter tone is a subset of a
     darker one.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Line Candidates
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : v0.8.0 - hatching is drawn with the base technical pen,
                   0.13 mm; a point's weight is its ink in the technical mode

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__DEG as DEG } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__Maths__Clamp as Clamp } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__Create,
    PainterlyNPR__SeededRandom__DeriveSeed,
    PainterlyNPR__SeededRandom__HashUnit,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import {
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__LineCandidates__SplitByPresence } from '../31__Line__Visibility/PainterlyNPR__LineCandidates__Visibility__.mjs';
import {
    PainterlyNPR__TechnicalPens__Technical,
    PainterlyNPR__TechnicalPens__WidthMm,
    PainterlyNPR__TechnicalPens__TIER_BASE  as  TIER_BASE,
} from '../32__Line__ClassAndPriority/PainterlyNPR__TechnicalPens__Tiers__.mjs';
import { PainterlyNPR__DrawingDiscipline__LINE_DEBUG_HATCH as LINE_DEBUG_HATCH } from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import { PainterlyNPR__ArtDirection__ActivePoints } from '../65__ArtDirection__InfluencePoints/PainterlyNPR__ArtDirection__Points__.mjs';

// =============================================================================
// REGION | Tonal Hatching
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Line Candidates
// -----------------------------------------------------------------------------

    // FUNCTION | Bit-Reverse Six Bits - the order lines join a tone
    // ------------------------------------------------------------
    function PainterlyNPR__LineCandidates__Rank(k) {
        let r  =  0;
        for (let b = 0; b < 6; b++) r |= ((k >> b) & 1) << (5 - b);
        return r / 64;
    }
    // ------------------------------------------------------------


    // FUNCTION | Tonal Hatching - nested lines, so tone grows without reshuffling
    // ------------------------------------------------------------
    // "Tonal-art-map-inspired coherent stroke patterns" (manifest section 07),
    // turned on shadow: parallel lines at a spacing, each with a rank from a
    // bit-reversed count, drawn where the field's hatch density beats its rank.
    // A darker tone adds lines BETWEEN the ones already there - never moves them -
    // and past the cross-hatch threshold a second family crosses at 72 degrees.
    // Each source (the global shadow hatching, and every Hatch point) draws only
    // where the field names it the owner. Strokes are chopped to hand lengths,
    // their ends jittered, and broken wherever the object under them changes.
    function PainterlyNPR__LineCandidates__Hatching(strokes, globalL, ceiling, pushDebug) {
        const pen      =  State.Pen;
        const W = Gpu.Width, H = Gpu.Height, pxPerMm = Gpu.PxPerMm;
        const sources  =  [];
        if (pen.HatchAmount > 0) sources.push({ Owner: 0, Angle: pen.HatchAngle, Box: [0, 0, W, H] });
        PainterlyNPR__ArtDirection__ActivePoints().forEach((p, i) => {
            if (p.Type !== 'Hatch') return;
            const cx = p.PaperMm[0] * pxPerMm, cy = p.PaperMm[1] * pxPerMm, r = p.RadiusMm * pxPerMm * 1.5;
            sources.push({ Owner: i + 1, Angle: p.HatchAngle, Box: [cx - r, cy - r, cx + r, cy + r] });
        });
        if (!sources.length) return 0;
        const fc        =  Cpu.FieldC;
        const geo       =  Cpu.Geo;
        const spacing   =  Math.max(0.5, pen.HatchSpacingMm) * pxPerMm;
        const step      =  0.45 * pxPerMm;
        const crossFrom =  1 - 0.7 * Clamp(pen.HatchCross, 0, 1);
        const L         =  Clamp(globalL * 0.7 + 0.12 * pen.HatchLoose, 0, ceiling);
        let count       =  0;
        for (const src of sources) {
            for (let family = 0; family < 2; family++) {
                if (family === 1 && crossFrom >= 1) continue;
                const angle  =  (src.Angle + (family ? 72 : 0)) * DEG;
                const ux = Math.cos(angle), uy = Math.sin(angle), nx = -uy, ny = ux;
                const corners  =  [[src.Box[0], src.Box[1]], [src.Box[2], src.Box[1]], [src.Box[0], src.Box[3]], [src.Box[2], src.Box[3]]];
                const ns = corners.map(c => c[0] * nx + c[1] * ny), us = corners.map(c => c[0] * ux + c[1] * uy);
                const u0 = Math.floor(Math.min(...us) / step) * step, u1 = Math.max(...us);   // <-- On a fixed lattice, so a point's rounding never shifts its lines
                const seedBase  =  PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, `hatch:${src.Owner}:${family}`);
                for (let k = Math.ceil(Math.min(...ns) / spacing); k <= Math.floor(Math.max(...ns) / spacing); k++) {
                    const rank  =  PainterlyNPR__LineCandidates__Rank(k & 63);
                    const need  =  family ? crossFrom + (1 - crossFrom) * rank : 0.02 + 0.96 * rank;
                    const off   =  k * spacing + (PainterlyNPR__SeededRandom__HashUnit(k, seedBase) - 0.5) * 0.3 * spacing;
                    let run = [], lastObj = -2;
                    const flush  =  () => {
                        if (run.length >= 2) count += PainterlyNPR__LineCandidates__HatchRun(run, strokes, L, PainterlyNPR__SeededRandom__DeriveSeed(seedBase, `k${k}:${run[0].X | 0}`), pushDebug);
                        run = [];
                    };
                    for (let t = u0; t <= u1; t += step) {
                        const x = nx * off + ux * t, y = ny * off + uy * t;
                        if (x < 0 || y < 0 || x >= W || y >= H) { flush(); lastObj = -2; continue; }
                        const i    =  ((y | 0) * W + (x | 0)) * 4;
                        const own  =  Math.round((fc[i + 1] / 255) * 16);
                        const obj  =  Math.round(geo[i + 1]);
                        if (own !== src.Owner || fc[i] / 255 <= need || obj < 0) { flush(); lastObj = -2; continue; }
                        if (run.length && obj !== lastObj) flush();
                        run.push({ X: x, Y: y });
                        lastObj = obj;
                    }
                    flush();
                }
            }
        }
        return count;
    }
    // ------------------------------------------------------------


    // FUNCTION | One Run of Hatching, as a Hand Draws It
    // ------------------------------------------------------------
    // With the base pen: tone comes from how many lines there are, never how wide.
    function PainterlyNPR__LineCandidates__HatchRun(run, strokes, L, seed, pushDebug) {
        const pxPerMm  =  Gpu.PxPerMm;
        const technical  =  PainterlyNPR__TechnicalPens__Technical();
        const rng      =  PainterlyNPR__SeededRandom__Create(seed);
        const pen      =  State.Pen;
        let made  =  0;
        let i     =  0;
        while (i < run.length - 1) {
            const lenMm  =  rng.Range(5, 11);
            const n      =  Math.max(2, Math.round(lenMm / 0.45));
            const piece  =  run.slice(i, i + n);
            i += n + (rng.Chance(0.35) ? 1 : 0);
            for (const frag of PainterlyNPR__LineCandidates__SplitByPresence(piece, 2, seed + i, 0.45)) {
                const a = frag[0], b = frag[frag.length - 1];
                const len  =  Math.hypot(b.X - a.X, b.Y - a.Y);
                if (len < 0.8 * pxPerMm) continue;
                const ux = (b.X - a.X) / len, uy = (b.Y - a.Y) / len;
                const e0 = rng.Spread(0.35) * pxPerMm, e1 = rng.Spread(0.35) * pxPerMm;
                const fMid  =  frag[frag.length >> 1].Field;
                pushDebug(a, b, LINE_DEBUG_HATCH);
                strokes.push({ Points: [[a.X - ux * e0, a.Y - uy * e0], [b.X + ux * e1, b.Y + uy * e1]], Straight: true, StartTrue: false, EndTrue: false, Tier: TIER_BASE, WidthMm: PainterlyNPR__TechnicalPens__WidthMm(TIER_BASE, fMid.Weight), Alpha: technical ? Math.min(1, 0.62 * fMid.Weight) : 0.62, Dry: 0.45, Loose: L, Seed: rng.IntRange(1, 1e9), TaperIn: 0.15, TaperOut: 0.7, Local: { Wobble: pen.HatchLoose, Pressure: 1, Overdraw: 0, Breakup: 0 }, Source: 'Hatch' });
                made++;
            }
        }
        return made;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__LineCandidates__Hatching,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
