/* =============================================================================
   PAINTERLYNPR - PAPER | SHEET COMPOSER - GROUND CUT SWISH
   =============================================================================

   FILE       : PainterlyNPR__GroundCut__Swish__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Paper - SheetComposer - GroundCut Swish
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Paint the swish of wash an illustrator lays along the ground
                where an elevation is cut off on the sheet, and the mask that
                loses the drawing's foot into it
   CREATED    : 30-Oct-2026 (v0.8.13)

   DESCRIPTION:
   - What a hand does: one stroke along the ground. The brush lands round and
     full at its heavy end, carries its bristles' streaks along the stroke,
     pools darker where the wash dries at its edges, thins as it runs out of
     paint and breaks up into dry streaks at its light end, which may sweep up
     off the ground line. Gravel adds a fleck of stones, paving a few joints,
     and either may sit under a ruled ground line.
   - EVERYTHING IS MILLIMETRES ON THE SHEET, in the cut's own frame: x from the
     frame's left side (0) to its right (WidthMm), y from the cut line (0),
     down positive. Every noise reads millimetres, so a preview and a 300 dpi
     painting are the same swish, the finer one sharper (manifest: pens and
     grain are mm on the sheet).
   - THE WASH IS THE ENGINE'S: paper times each pigment to the power of its
     density (52's Watercolour shader). The swish is returned as a picture a
     wrapper lays over its drawing with a multiply blend; its alpha is chosen so
     that laid over white paper with an ordinary blend it is the same colour.
   - THE FOOT: a grey mask for the band just above the cut, white where the
     drawing is kept. Its lower edge wanders and breaks up along horizontal
     streaks, so plants and walls end in the swish as a brush leaves them, not
     at a ruled edge. Below the cut nothing is kept.
   - DETERMINISTIC BY IDENTITY: every noise and every fleck is seeded from the
     cut's Seed (Resolve gives a cut without one a seed from its identity).
   - The ground line is in the drawing's ink family and the technical pens'
     Ground pen (0.35 mm), read from 34 and 32, never copied.
   - Pure but for the canvas it returns: PaintPixels gives the bytes (Node can
     run it); Paint puts them on canvases.

   ============================================================================= */

import GroundConfig from './Na__GroundCut__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__SeededRandom__Create      as  CreateRandom,
    PainterlyNPR__SeededRandom__DeriveSeed  as  DeriveSeed,
    PainterlyNPR__SeededRandom__Noise1      as  Noise1,
    PainterlyNPR__SeededRandom__Noise2      as  Noise2,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__InkLayer__INK_FAMILIES as INK_FAMILIES } from '../34__Stroke__InkCompositing/PainterlyNPR__InkLayer__InkFamilies__.mjs';
import {
    PainterlyNPR__TechnicalPens__Element,
    PainterlyNPR__TechnicalPens__TIER_WIDTH_MM  as  TIER_WIDTH_MM,
} from '../32__Line__ClassAndPriority/PainterlyNPR__TechnicalPens__Tiers__.mjs';
import {
    PainterlyNPR__GroundCut__PigmentHex  as  PigmentHex,
    PainterlyNPR__GroundCut__Resolve     as  Resolve,
} from './PainterlyNPR__GroundCut__Settings__.mjs';

// =============================================================================
// REGION | Sheet Composer - Ground Cut Swish
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__GroundCut__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const P  =  PainterlyNPR__ConfigAccess__Section(GroundConfig, 'PainterlyNPR__GroundCut__Config', 'Painting', [
        'LeastLengthMm', 'LeastThicknessMm', 'CapRatio', 'CapLeastMm', 'RoundTaperBelow', 'TaperPower', 'Swell', 'SweepPower',
        'ThickNoise', 'ThickScaleMm', 'EdgeAmpMm', 'EdgeScaleMm', 'BottomEdgeGain', 'EdgeGrainMm', 'PadMm', 'GrainMm', 'Granulation',
        'StreakPitchMm', 'StreakLengthMm', 'StreakDepth', 'PassPitchMm', 'PassLengthMm', 'PassDepth', 'MottleMm', 'Mottle', 'Unload',
        'RimMm', 'RimGain', 'RimStarve', 'RimFromMm', 'RimFullMm', 'DryFrom', 'DryLengthMm', 'DryPitchMm', 'DryGapMax', 'DrySoft', 'DryFloor',
        'Variation', 'VariationMm', 'SpecklePerMm2', 'SpeckleMm', 'SpeckleDensity', 'JointSpacingMm', 'JointWidthMm', 'JointDensity',
        'InkAlpha', 'InkWobbleMm', 'InkWobbleScaleMm', 'InkOvershootMm', 'InkCategory',
        'FootPadMm', 'FootFloor', 'FootScaleMm', 'FootStreakMm', 'FootStreakLengthMm', 'FootBreak', 'FootSoftFrom', 'FootSoftTo',
    ]);
    const OUT  =  PainterlyNPR__ConfigAccess__Section(GroundConfig, 'PainterlyNPR__GroundCut__Config', 'Output', ['MaxPixels']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Smoothstep, Clamp, and a Colour as Three Fractions
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Smooth(a, b, x) {
        const t  =  Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
    }

    function PainterlyNPR__GroundCut__Clamp(x, a, b) {
        return x < a ? a : x > b ? b : x;
    }

    function PainterlyNPR__GroundCut__Rgb(hex) {
        const v  =  parseInt(String(hex || '#808080').slice(1), 16);
        return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Rotated Value Noise - octaves turned off the axes, so no cell crease shows as a seam
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Fbm(x, y, seed) {
        const a  =  Noise2(x, y, seed);
        const x2 =  (x * 0.8 - y * 0.6) * 2.03, y2 = (x * 0.6 + y * 0.8) * 2.03;
        const b  =  Noise2(x2 + 17.1, y2 - 9.3, seed + 1);
        return a * 0.66 + b * 0.34;
    }

    function PainterlyNPR__GroundCut__Fbm1(x, seed) {
        return Noise1(x, seed) * 0.62 + Noise1(x * 2.17 + 5.3, seed + 1) * 0.38;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Density That Fits the Pixel Budget
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Density(widthMm, heightMm, pxPerMm) {
        const k    =  PainterlyNPR__GroundCut__Clamp(Number(pxPerMm) || 4, 0.5, 48);
        const px   =  widthMm * heightMm * k * k;
        return px > OUT.MaxPixels ? k * Math.sqrt(OUT.MaxPixels / px) : k;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Stroke's Shape
// -----------------------------------------------------------------------------

    // FUNCTION | The Stroke at x mm - { Top, Bottom, Q } (Q: 0 at its heavy end, 1 at its light end), or null off it
    // ------------------------------------------------------------
    // The heavy end lands round (a cap as deep as the stroke), swells to its
    // fullest at HeavyAt, then thins over Taper of its length to nothing (or
    // ends round, as a strip does). Its light end sweeps up off the ground by
    // SweepMm, following a curve that leaves the heavy end level.
    function PainterlyNPR__GroundCut__Shape(x, s, g) {
        if (x < g.X0 || x > g.X1) return null;
        const v        =  s.Values;
        const u        =  (x - g.X0) / g.L;
        const uf       =  s.Flip ? 1 - u : u;
        const q        =  Math.abs(uf - g.HeavyEnd);
        const dHeavy   =  q * g.L, dLight = (1 - q) * g.L;
        const capOf    =  (d) => { const t = 1 - Math.min(d / g.R, 1); return Math.sqrt(Math.max(0, 1 - t * t)); };
        const cap      =  capOf(dHeavy);
        const taper    =  v.Taper < P.RoundTaperBelow ? capOf(dLight)
                        : Math.pow(PainterlyNPR__GroundCut__Smooth(0, 1, dLight / Math.max(v.Taper * g.L, g.R * 0.5)), P.TaperPower);
        const swell    =  g.Qh > 0.001 && q < g.Qh ? (1 - P.Swell) + P.Swell * PainterlyNPR__GroundCut__Smooth(0, 1, q / g.Qh) : 1;
        const thick    =  1 + v.Wobble * P.ThickNoise * (2 * PainterlyNPR__GroundCut__Fbm1(x / P.ThickScaleMm, g.Seeds.Thick) - 1);
        const sweep    =  -v.SweepMm * Math.pow(q, P.SweepPower);
        const amp      =  v.Wobble * P.EdgeAmpMm;
        const top      =  -v.OverlapMm + sweep + amp * (2 * PainterlyNPR__GroundCut__Fbm1(x / P.EdgeScaleMm, g.Seeds.Top) - 1);
        const depth    =  v.ThicknessMm * cap * taper * swell * thick;
        const bottom   =  -v.OverlapMm + sweep + depth + amp * P.BottomEdgeGain * (2 * PainterlyNPR__GroundCut__Fbm1(x / P.EdgeScaleMm, g.Seeds.Bottom) - 1);
        return { Top: top, Bottom: Math.max(top, bottom), Q: q };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Stroke's Constants - its ends, landing radius, heavy end, seeds
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Geometry(s, widthMm) {
        const v     =  s.Values;
        const x0    =  -v.ReachLeftMm, x1 = widthMm + v.ReachRightMm;
        const L     =  x1 - x0;
        const h     =  v.HeavyAt;
        const end   =  h <= 0.5 ? 0 : 1;
        const seed  =  (label) => DeriveSeed(s.Seed, label);
        return {
            X0: x0, X1: x1, L, HeavyEnd: end, Qh: Math.abs(h - end),
            R: PainterlyNPR__GroundCut__Clamp(v.ThicknessMm * P.CapRatio, P.CapLeastMm, Math.max(P.CapLeastMm, L * 0.25)),
            Seeds: {
                Thick: seed('thick'), Top: seed('top'), Bottom: seed('bottom'), Grain: seed('grain'), Streak: seed('streak'), Streak2: seed('streak2'),
                Pass: seed('pass'), Mottle: seed('mottle'), Dry: seed('dry'), Variation: seed('variation'), Speckle: seed('speckle'),
                Joints: seed('joints'), Ink: seed('ink'), Foot: seed('foot'), FootStreak: seed('foot-streak'),
            },
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Painting the Swish
// -----------------------------------------------------------------------------

    // FUNCTION | The Swish's Pixels - { Rgba, Width, Height, X, Y, WidthMm, HeightMm, PxPerMm }, or null
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__SwishPixels(s, widthMm, pxPerMm) {
        const v  =  s.Values;
        const g  =  PainterlyNPR__GroundCut__Geometry(s, widthMm);
        if (g.L < P.LeastLengthMm || v.Strength <= 0) return null;

        // The ground line's reach and pen, when there is one
        const ink       =  s.InkLine ? {
            X0     :  -P.InkOvershootMm, X1: widthMm + P.InkOvershootMm,
            Width  :  TIER_WIDTH_MM[PainterlyNPR__TechnicalPens__Element({ Category: P.InkCategory }).Ground],
            Rgb    :  PainterlyNPR__GroundCut__Rgb((INK_FAMILIES[State.InkFamily] || Object.values(INK_FAMILIES)[0]).Colour),
        } : null;

        // Bounds: sampled every half millimetre (the shape is millimetres, never pixels)
        let left = g.X0, right = g.X1, top = Infinity, bottom = -Infinity;
        for (let x = g.X0; x <= g.X1; x += 0.5) {
            const sh  =  PainterlyNPR__GroundCut__Shape(x, s, g);
            if (sh) { top = Math.min(top, sh.Top); bottom = Math.max(bottom, sh.Bottom); }
        }
        if (!Number.isFinite(top)) return null;
        if (ink) { left = Math.min(left, ink.X0); right = Math.max(right, ink.X1); top = Math.min(top, -ink.Width - P.InkWobbleMm); bottom = Math.max(bottom, ink.Width + P.InkWobbleMm); }
        const pad   =  P.PadMm + v.Wobble * P.EdgeAmpMm;
        top -= pad; bottom += pad; left -= P.PadMm; right += P.PadMm;
        const k     =  PainterlyNPR__GroundCut__Density(right - left, bottom - top, pxPerMm);
        const W     =  Math.max(1, Math.ceil((right - left) * k)), H = Math.max(1, Math.ceil((bottom - top) * k));
        const dens  =  new Float32Array(W * H), mix = new Float32Array(W * H), inkA = ink ? new Float32Array(W * H) : null;
        const tops  =  new Float32Array(W), bots = new Float32Array(W), qs = new Float32Array(W);
        const grain =  (x, y) => PainterlyNPR__GroundCut__Fbm(x / P.GrainMm, y / P.GrainMm, g.Seeds.Grain);

        // The wash, column by column, only over the rows the stroke can reach
        for (let c = 0; c < W; c++) {
            const x   =  left + (c + 0.5) / k;
            const sh  =  PainterlyNPR__GroundCut__Shape(x, s, g);
            if (!sh) { tops[c] = 0; bots[c] = 0; qs[c] = 1; continue; }
            tops[c] = sh.Top; bots[c] = sh.Bottom; qs[c] = sh.Q;
            const t   =  sh.Bottom - sh.Top;
            if (t < P.LeastThicknessMm) continue;
            const load  =  1 - P.Unload * sh.Q;
            const dry   =  v.DryBrush * PainterlyNPR__GroundCut__Smooth(P.DryFrom, 1, sh.Q);
            const wRim  =  PainterlyNPR__GroundCut__Smooth(P.RimFromMm, P.RimFullMm, t);
            const r0    =  Math.max(0, Math.floor((sh.Top - pad - top) * k)), r1 = Math.min(H, Math.ceil((sh.Bottom + pad - top) * k));
            for (let r = r0; r < r1; r++) {
                const y       =  top + (r + 0.5) / k;
                const gr      =  grain(x, y);
                const dTop    =  y - sh.Top, dBot = sh.Bottom - y;
                const inside  =  Math.min(dTop, dBot) + (gr - 0.5) * P.EdgeGrainMm * (0.5 + v.Wobble);
                const cover   =  PainterlyNPR__GroundCut__Clamp(inside * k + 0.5, 0, 1);
                if (cover <= 0) continue;
                const vn      =  PainterlyNPR__GroundCut__Clamp(dTop / t, 0, 1);
                const sc      =  vn * (v.ThicknessMm / P.StreakPitchMm);            // <-- The bristles close up in the taper, as a brush's do
                const streak  =  Noise2(x / P.StreakLengthMm, sc, g.Seeds.Streak) * 0.65 + Noise2(x / (P.StreakLengthMm * 0.37), sc * 2.1, g.Seeds.Streak2) * 0.35;
                const pass    =  Noise2(x / P.PassLengthMm, vn * (v.ThicknessMm / P.PassPitchMm), g.Seeds.Pass);
                const mottle  =  PainterlyNPR__GroundCut__Fbm(x / P.MottleMm, y / P.MottleMm, g.Seeds.Mottle);
                let d         =  v.Strength * load;
                d *= 1 + v.Streaks * P.StreakDepth * (streak - 0.5) * 2;
                d *= 1 + v.Streaks * P.PassDepth * (pass - 0.5) * 2;
                d *= 1 + P.Mottle * (mottle - 0.5) * 2;
                const rimD    =  Math.max(0, Math.min(dTop, dBot));                // <-- The wash pools where it dries: a darker rim, a starved band inside it
                const rim     =  Math.exp(-Math.pow(rimD / P.RimMm, 1.6));
                const starve  =  PainterlyNPR__GroundCut__Smooth(P.RimMm, P.RimMm * 2.5, rimD) * (1 - PainterlyNPR__GroundCut__Smooth(P.RimMm * 3, P.RimMm * 6, rimD));
                d *= Math.max(0, 1 + v.EdgeDarkening * wRim * (P.RimGain * rim - P.RimStarve * starve));
                if (dry > 0) {                                                     // <-- The brush running dry: gaps along its bristles, the paper's tooth showing
                    const fine  =  Noise2(x / P.DryLengthMm, vn * (v.ThicknessMm / P.DryPitchMm), g.Seeds.Dry) * 0.7 + gr * 0.3;
                    const keep  =  PainterlyNPR__GroundCut__Smooth(dry * P.DryGapMax - P.DrySoft, dry * P.DryGapMax + P.DrySoft, fine);
                    d *= P.DryFloor + (1 - P.DryFloor) * keep;
                }
                d *= 1 + P.Granulation * (gr - 0.5) * 2;
                const i       =  r * W + c;
                dens[i] = Math.max(0, d * cover);
                mix[i]  = PainterlyNPR__GroundCut__Clamp(0.5 + P.Variation * (PainterlyNPR__GroundCut__Fbm(x / P.VariationMm, y / P.VariationMm, g.Seeds.Variation) - 0.5) * 2, 0, 1);
            }
        }

        PainterlyNPR__GroundCut__Speckle(s, g, { W, H, k, left, top, dens, mix, tops, bots, grain });
        PainterlyNPR__GroundCut__Joints(s, g, { W, H, k, left, top, dens, mix, tops, bots });
        if (ink) PainterlyNPR__GroundCut__InkLine(ink, g, { W, H, k, left, top, inkA });

        return {
            Rgba: PainterlyNPR__GroundCut__ToRgba(s, dens, mix, inkA, ink), Width: W, Height: H,
            X: left, Y: top, WidthMm: W / k, HeightMm: H / k, PxPerMm: k,
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Speckle: small darker touches inside the wash (gravel's stones, a lawn's flecks)
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Speckle(s, g, b) {
        const v  =  s.Values;
        if (v.Speckle <= 0) return;
        let area  =  0;
        for (let c = 0; c < b.W; c++) area += Math.max(0, b.bots[c] - b.tops[c]) / b.k;
        const rng    =  CreateRandom(g.Seeds.Speckle);
        const count  =  Math.round(v.Speckle * P.SpecklePerMm2 * area);
        for (let n = 0; n < count; n++) {
            const c    =  rng.IntRange(0, b.W - 1);
            const t    =  b.bots[c] - b.tops[c];
            const vn   =  rng.Range(0.08, 0.95), rad = P.SpeckleMm * rng.Range(0.45, 1.35), amp = P.SpeckleDensity * rng.Range(0.5, 1) * v.Strength;
            if (t < rad * 2) continue;
            const cx   =  b.left + (c + 0.5) / b.k, cy = b.tops[c] + vn * t;
            const c0   =  Math.max(0, Math.floor((cx - rad - b.left) * b.k)), c1 = Math.min(b.W, Math.ceil((cx + rad - b.left) * b.k));
            const r0   =  Math.max(0, Math.floor((cy - rad - b.top) * b.k)), r1 = Math.min(b.H, Math.ceil((cy + rad - b.top) * b.k));
            for (let r = r0; r < r1; r++) for (let cc = c0; cc < c1; cc++) {
                const x  =  b.left + (cc + 0.5) / b.k, y = b.top + (r + 0.5) / b.k;
                const f  =  1 - ((x - cx) ** 2 + (y - cy) ** 2) / (rad * rad);
                if (f <= 0) continue;
                const i  =  r * b.W + cc;
                if (b.dens[i] <= 0) continue;                                    // <-- Only inside the wash: a stone is never off the paint
                b.dens[i] += amp * Math.min(1, f * 1.6) * (0.6 + 0.4 * b.grain(x, y));
                b.mix[i]   = Math.max(b.mix[i], 0.85);
            }
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Joints: faint lines across paving, down from its top edge
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Joints(s, g, b) {
        const v  =  s.Values;
        if (v.Joints <= 0) return;
        const rng  =  CreateRandom(g.Seeds.Joints);
        const half =  P.JointWidthMm / 2;
        for (let xj = g.X0 + P.JointSpacingMm * rng.Range(0.3, 1); xj < g.X1; xj += P.JointSpacingMm * rng.Range(0.75, 1.25)) {
            const c    =  Math.floor((xj - b.left) * b.k);
            if (c < 0 || c >= b.W) continue;
            const t    =  b.bots[c] - b.tops[c];
            if (t < 1) continue;
            const reach =  rng.Range(0.45, 0.95), lean = rng.Range(-0.04, 0.04), amp = v.Joints * P.JointDensity * rng.Range(0.6, 1);
            const y0   =  b.tops[c], y1 = b.tops[c] + t * reach;
            const r0   =  Math.max(0, Math.floor((y0 - b.top) * b.k)), r1 = Math.min(b.H, Math.ceil((y1 - b.top) * b.k));
            for (let r = r0; r < r1; r++) {
                const y   =  b.top + (r + 0.5) / b.k;
                const xl  =  xj + lean * (y - y0);
                const fade =  1 - PainterlyNPR__GroundCut__Smooth(0.6, 1, (y - y0) / (y1 - y0));
                const c0  =  Math.max(0, Math.floor((xl - half - 1 / b.k - b.left) * b.k)), c1 = Math.min(b.W, Math.ceil((xl + half + 1 / b.k - b.left) * b.k));
                for (let cc = c0; cc < c1; cc++) {
                    const x  =  b.left + (cc + 0.5) / b.k;
                    const cover = PainterlyNPR__GroundCut__Clamp((half - Math.abs(x - xl)) * b.k + 0.5, 0, 1);
                    const i  =  r * b.W + cc;
                    if (cover <= 0 || b.dens[i] <= 0) continue;
                    b.dens[i] += amp * cover * fade;
                    b.mix[i]   = 1;
                }
            }
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Ruled Ground Line Along the Cut (its pen, its ink, a hand's slight wander)
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__InkLine(ink, g, b) {
        const half  =  ink.Width / 2;
        for (let c = 0; c < b.W; c++) {
            const x   =  b.left + (c + 0.5) / b.k;
            if (x < ink.X0 || x > ink.X1) continue;
            const yl  =  P.InkWobbleMm * (2 * Noise1(x / P.InkWobbleScaleMm, g.Seeds.Ink) - 1);
            const a   =  P.InkAlpha * (0.85 + 0.15 * Noise1(x / 9, g.Seeds.Ink + 7));
            const r0  =  Math.max(0, Math.floor((yl - half - 1 / b.k - b.top) * b.k)), r1 = Math.min(b.H, Math.ceil((yl + half + 1 / b.k - b.top) * b.k));
            for (let r = r0; r < r1; r++) {
                const y      =  b.top + (r + 0.5) / b.k;
                const cover  =  PainterlyNPR__GroundCut__Clamp((half - Math.abs(y - yl)) * b.k + 0.5, 0, 1);
                if (cover > 0) b.inkA[r * b.W + c] = Math.max(b.inkA[r * b.W + c], cover * a);
            }
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Densities to Bytes: paper x pigment^density, as a colour and an alpha
    // ------------------------------------------------------------
    // T, the transmittance, is what the swish does to the paper under it. Laid
    // with a multiply blend the picture must be T; with an ordinary blend over
    // white it must be T too. alpha = the most any channel darkens, colour =
    // 1 - (1 - T) / alpha does both.
    function PainterlyNPR__GroundCut__ToRgba(s, dens, mix, inkA, ink) {
        const hex  =  PigmentHex(s.Colour);
        const A    =  PainterlyNPR__GroundCut__Rgb(hex.A).map(c => Math.max(0.02, c));
        const B    =  PainterlyNPR__GroundCut__Rgb(hex.B).map(c => Math.max(0.02, c));
        const out  =  new Uint8ClampedArray(dens.length * 4);
        for (let i = 0; i < dens.length; i++) {
            const d   =  dens[i], ia = inkA ? inkA[i] : 0;
            if (d <= 0.002 && ia <= 0.002) continue;
            const m   =  mix[i];
            let tr    =  Math.pow(A[0] + (B[0] - A[0]) * m, d);
            let tg    =  Math.pow(A[1] + (B[1] - A[1]) * m, d);
            let tb    =  Math.pow(A[2] + (B[2] - A[2]) * m, d);
            if (ia > 0) { tr *= 1 - ia + ia * ink.Rgb[0]; tg *= 1 - ia + ia * ink.Rgb[1]; tb *= 1 - ia + ia * ink.Rgb[2]; }
            const a   =  Math.max(1 - tr, 1 - tg, 1 - tb);
            if (a < 0.5 / 255) continue;
            out[i * 4]     = 255 * (1 - (1 - tr) / a);
            out[i * 4 + 1] = 255 * (1 - (1 - tg) / a);
            out[i * 4 + 2] = 255 * (1 - (1 - tb) / a);
            out[i * 4 + 3] = 255 * a;
        }
        return out;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Lost Foot
// -----------------------------------------------------------------------------

    // FUNCTION | The Foot's Mask - { Rgba, Width, Height, X, Y, WidthMm, HeightMm, PxPerMm } (grey: white kept), or null
    // ------------------------------------------------------------
    // The band from LoseMm (and a little) above the cut down to the cut. Where
    // the foot is lost least varies along it; within it the drawing breaks up
    // along horizontal streaks and the paper's tooth, as a dry brush leaves it.
    function PainterlyNPR__GroundCut__FootPixels(s, widthMm, pxPerMm) {
        const lose  =  s.Values.LoseMm;
        if (s.Plain || !(lose > 0.05) || !(widthMm > 0)) return null;
        const g     =  PainterlyNPR__GroundCut__Geometry(s, widthMm);
        const top   =  -lose - P.FootPadMm;
        const k     =  PainterlyNPR__GroundCut__Density(widthMm, -top, pxPerMm);
        const W     =  Math.max(1, Math.ceil(widthMm * k)), H = Math.max(1, Math.ceil(-top * k));
        const out   =  new Uint8ClampedArray(W * H * 4);
        for (let c = 0; c < W; c++) {
            const x   =  (c + 0.5) / k;
            const e1  =  -lose * (P.FootFloor + (1 - P.FootFloor) * PainterlyNPR__GroundCut__Fbm1(x / P.FootScaleMm, g.Seeds.Foot));
            for (let r = 0; r < H; r++) {
                const y       =  top + (r + 0.5) / k;
                const base    =  PainterlyNPR__GroundCut__Clamp((y - e1) / -e1, 0, 1);
                const streak  =  Noise2(x / P.FootStreakLengthMm, y / P.FootStreakMm, g.Seeds.FootStreak) * 0.75
                               + PainterlyNPR__GroundCut__Fbm(x / P.GrainMm, y / P.GrainMm, g.Seeds.Grain) * 0.25;
                const ragged  =  base + (streak - 0.5) * P.FootBreak * Math.sin(Math.PI * base);   // <-- Ragged only between kept and lost: the band's top is whole
                const keep    =  y >= 0 ? 0 : 1 - PainterlyNPR__GroundCut__Smooth(P.FootSoftFrom, P.FootSoftTo, ragged);
                const i       =  (r * W + c) * 4;
                out[i] = out[i + 1] = out[i + 2] = 255 * keep;
                out[i + 3] = 255;
            }
        }
        return { Rgba: out, Width: W, Height: H, X: 0, Y: top, WidthMm: W / k, HeightMm: H / k, PxPerMm: k };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Painting
// -----------------------------------------------------------------------------

    // FUNCTION | The Cut's Pixels - { Settings, Plain, Swish, Foot } (each null when there is none)
    // ------------------------------------------------------------
    // request: { Settings (the kept form), Identity (the cut's stable name),
    // WidthMm (the frame's width), PxPerMm }. Swish and Foot are placed in the
    // cut's frame: x from the frame's left side, y from the cut line, down.
    function PainterlyNPR__GroundCut__PaintPixels(request) {
        const r      =  request || {};
        const s      =  Resolve(r.Settings, r.Identity);
        const width  =  Math.max(0, Number(r.WidthMm) || 0);
        if (s.Plain || !width) return { Settings: s, Plain: s.Plain, Swish: null, Foot: null };
        return {
            Settings :  s,
            Plain    :  false,
            Swish    :  PainterlyNPR__GroundCut__SwishPixels(s, width, r.PxPerMm),
            Foot     :  PainterlyNPR__GroundCut__FootPixels(s, width, r.PxPerMm),
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Cut Painted - as PaintPixels, each part with a Canvas instead of its bytes
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCut__Paint(request) {
        const painted  =  PainterlyNPR__GroundCut__PaintPixels(request);
        const canvasOf =  (part) => {
            if (!part) return null;
            const canvas  =  typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(part.Width, part.Height);
            canvas.width  =  part.Width;
            canvas.height =  part.Height;
            canvas.getContext('2d').putImageData(new ImageData(part.Rgba, part.Width, part.Height), 0, 0);
            return { Canvas: canvas, X: part.X, Y: part.Y, WidthMm: part.WidthMm, HeightMm: part.HeightMm, PxPerMm: part.PxPerMm };
        };
        return { Settings: painted.Settings, Plain: painted.Plain, Swish: canvasOf(painted.Swish), Foot: canvasOf(painted.Foot) };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__GroundCut__Paint,
        PainterlyNPR__GroundCut__PaintPixels,
        PainterlyNPR__GroundCut__Shape,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
