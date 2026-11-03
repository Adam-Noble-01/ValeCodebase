/* =============================================================================
   PAINTERLYNPR - LINE | MATERIAL INDICATION - RUBBLE STONE: WHAT A HAND PUTS DOWN
   =============================================================================

   FILE       : PainterlyNPR__MaterialIndication__RubbleMarks__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - MaterialIndication - RubbleMarks
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The marks of one stone and one group on a rubble wall: the broken
                pen strokes and the loose tan washes
   CREATED    : 03-Nov-2026 (v0.8.20)

   DESCRIPTION:
   - THE PEN: each stone's outline is walked round and the pen lifts along its
     top, along its bottom and often down its right side, so what is left is a
     left bracket and a right hook. Some stones are only a dash or a bracket.
   - THE WASHES: written into the Stone target (52), R the darker wash inside a
     stone, G the broad pale wash round a group, A the stone's own strength. A
     cone, one at the heart and none at the rim: the shader cuts it where it
     likes, so its edge wanders and dries hard or runs soft as a wash's does.
     Walked out from its middle along each direction, a wash stops where the
     wall does, so it never runs over a quoin or a window. On a wall turned away
     it stays long and low, a brush not being foreshortened as a stone is.

   ============================================================================= */

import IndicationConfig from './Na__MaterialIndication__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__Maths__Lerp     as  Lerp,
    PainterlyNPR__Maths__V3Add    as  V3Add,
    PainterlyNPR__Maths__V3Scale  as  V3Scale,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__HashUnit,
    PainterlyNPR__SeededRandom__Noise1,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__LineCandidates__Process } from '../30__Line__CandidateCollection/PainterlyNPR__LineCandidates__Collect__.mjs';
import {
    PainterlyNPR__MaterialDepiction__LooseAdd,
    PainterlyNPR__MaterialDepiction__Times,
    PainterlyNPR__MaterialDepiction__REACH  as  DEPICT,
} from './PainterlyNPR__MaterialIndication__Depiction__.mjs';
import { PainterlyNPR__CameraRig__Project } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Material Indication - Rubble Stone Marks
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__MaterialIndication__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const RUBBLE  =  PainterlyNPR__ConfigAccess__Section(IndicationConfig, 'PainterlyNPR__MaterialIndication__Config', 'Rubble', ['TiltDeg', 'Pen', 'Wash', 'StoneWidthM', 'StoneHeightM']);
    const PEN     =  RUBBLE.Pen;
    const WASH    =  RUBBLE.Wash;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Marks' Own Draws and Sizes
    // ------------------------------------------------------------
    const CLEARANCE_M  =  0.02;                                               // <-- What a stone or a wash keeps clear of a builder's opening
    const SALT_PEN     =  1009;                                               // <-- Every kind of draw has its own run of salts, so one more never shifts another
    const SALT_WASH    =  100;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Wall
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Point on a Surface, and Its Place on the Sheet
    // ------------------------------------------------------------
    function PainterlyNPR__Rubble__At(surface, u, v) {
        return V3Add(V3Add(surface.Origin, V3Scale(surface.U, u)), V3Scale(surface.V, v));
    }

    function PainterlyNPR__Rubble__Project(surface, u, v) {
        return PainterlyNPR__CameraRig__Project(PainterlyNPR__Rubble__At(surface, u, v));
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This Place on the Surface Clear? - its Mask, or its clip and holes
    // ------------------------------------------------------------
    function PainterlyNPR__Rubble__Clear(surface, u, v) {
        if (u < 0 || v < 0 || u > surface.Width || v > surface.Height) return false;
        const mask  =  surface.Mask;
        if (mask) {
            const i = Math.floor(u / mask.Cell), j = Math.floor(v / mask.Cell);
            return i >= 0 && j >= 0 && i < mask.Nu && j < mask.Nv && mask.Grid[j * mask.Nu + i] === 1;
        }
        if (surface.Clip) {
            const range  =  surface.Clip(v);
            if (u < range[0] || u > range[1]) return false;
        }
        for (const h of surface.Holes) {
            if (u > h.U0 - CLEARANCE_M && u < h.U1 + CLEARANCE_M && v > h.V0 - CLEARANCE_M && v < h.V1 + CLEARANCE_M) return false;
        }
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Pen
// -----------------------------------------------------------------------------

    // FUNCTION | Walk Round a Stone - where the pen goes down, as runs of (u, v) points
    // ------------------------------------------------------------
    // A rounded box, clockwise from the middle of the left side, a little off true,
    // with the pen lifted along the gaps drawn for it. Most stones keep a left
    // bracket and a right hook; some are only their two long sides; some only one
    // stroke, the hint of a stone. Returns the runs, longest stroke first. The
    // hand (Depiction): Rounding its corners, Breaks its gaps (closed at 0),
    // Looseness how far it strays, Randomness its tilt, Roughness a broken edge.
    function PainterlyNPR__Rubble__StoneRuns(stone, id, hash, hand) {
        const round   =  PainterlyNPR__MaterialDepiction__Times(hand, 'Rounding', 'Rubble', 2);
        const breaks  =  PainterlyNPR__MaterialDepiction__Times(hand, 'Breaks', 'Rubble', 1.6);
        const strays  =  PainterlyNPR__MaterialDepiction__Times(hand, 'Looseness', 'Rubble', DEPICT.LooseMax);
        const tilts   =  PainterlyNPR__MaterialDepiction__Times(hand, 'Randomness', 'Rubble', 2.2);
        const w = stone.U1 - stone.U0, h = stone.V1 - stone.V0;
        const hw = w / 2, hh = h / 2;
        const cx = (stone.U0 + stone.U1) / 2, cy = (stone.V0 + stone.V1) / 2;
        const r  =  Math.min(h * PEN.CornerShare * Lerp(0.3, 1.5, hash(id, 1)) * round, w * 0.3, hh * 0.98);
        const side = hh - r, top = 2 * hw - 2 * r, drop = 2 * hh - 2 * r, q = Math.PI * r / 2;
        const lengths  =  [side, q, top, q, drop, q, top, q, side];
        const L  =  lengths.reduce((sum, s) => sum + s, 0);
        const topMid    =  side + q + top / 2;
        const rightMid  =  side + q + top + q + drop / 2;
        const baseMid   =  side + q + top + q + drop + q + top / 2;

        // The gaps: [where it starts, how long], round the perimeter
        const gap  =  (centre, share, size) => [centre - breaks * share * size / 2, breaks * share * size];
        const gaps =  [];
        const kind =  hash(id, 2);
        if (kind < 0.38) {                                                    // <-- The two brackets, joined here and there
            gaps.push(gap(topMid + (hash(id, 3) - 0.5) * 0.55 * top, Lerp(PEN.TopGap[0], PEN.TopGap[1], hash(id, 4)), w));
            gaps.push(gap(baseMid + (hash(id, 5) - 0.5) * 0.6 * top, Lerp(PEN.BottomGap[0], PEN.BottomGap[1], hash(id, 6)), w));
            if (hash(id, 7) < PEN.RightGapChance) gaps.push(gap(rightMid + (hash(id, 8) - 0.5) * 0.4 * h, Lerp(PEN.RightGap[0], PEN.RightGap[1], hash(id, 9)), h));
            if (hash(id, 10) < PEN.LeftGapChance) gaps.push(gap(0, Lerp(PEN.LeftGap[0], PEN.LeftGap[1], hash(id, 11)), h));
        } else if (kind < 0.78) {                                             // <-- Most: a left bracket and a right hook, well apart
            gaps.push(gap(topMid + (hash(id, 3) - 0.5) * 0.65 * top, Lerp(0.35, 0.6, hash(id, 4)), w));
            gaps.push(gap(baseMid + (hash(id, 5) - 0.5) * 0.65 * top, Lerp(0.3, 0.6, hash(id, 6)), w));
            gaps.push(gap(rightMid + 0.3 * h, Lerp(0.35, 0.7, hash(id, 9)), h));
        } else if (kind < 0.9) {                                              // <-- Its top and bottom only
            gaps.push(gap(0, 1.3, h + 2 * q * 0.9));
            gaps.push(gap(rightMid, 1.3, h + 2 * q * 0.9));
        } else {                                                              // <-- One stroke: a bracket, or a dash
            const alone  =  hash(id, 3);
            if (alone < 0.4) gaps.push([side + q + 0.28 * top, breaks * (L - 2 * (side + q) - 0.48 * top)]);   // <-- Only the left bracket stays
            else if (alone < 0.7) gaps.push([side + q + top, breaks * (L - top)]);   // <-- Only the top stays
            else gaps.push([baseMid + top / 2, breaks * (L - top)]);                 // <-- Only the bottom stays
        }

        const inGap  =  (s) => gaps.some(([a, length]) => {
            const d  =  (((s - a) % L) + L) % L;
            return length > 1e-6 && d <= length;
        });

        // Out along each straight and quarter turn, in steps of about 20 mm, with the hand's drift
        const amp    =  PEN.WobbleShare * h * strays;
        const rough  =  DEPICT.RoughM.Rubble * hand.Roughness;
        const phase1 =  hash(id, 12) * 6.283, phase2 = hash(id, 13) * 6.283;
        const seedR1 =  Math.floor(hash(id, 19) * 1e6), seedR2 = Math.floor(hash(id, 20) * 1e6);
        const tilt   =  (hash(id, 14) - 0.5) * 2 * RUBBLE.TiltDeg * tilts * Math.PI / 180;
        const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
        const place  =  (x, y, nx, ny, s) => {
            const off = amp * (0.7 * Math.sin(6.283 * s / 0.8 + phase1) + 0.3 * Math.sin(6.283 * s / 0.3 + phase2))
                      + (rough > 0 ? rough * ((PainterlyNPR__SeededRandom__Noise1(s / 0.14, seedR1) - 0.5) * 1.4 + (PainterlyNPR__SeededRandom__Noise1(s / 0.05, seedR2) - 0.5) * 0.6) : 0);   // <-- A rough-hewn edge: unevenly, as noise, never a regular zigzag
            const X = x + nx * off, Y = y + ny * off;
            return [cx + cosT * X - sinT * Y, cy + sinT * X + cosT * Y];
        };
        const at  =  (s) => {
            let d = s, i = 0;
            while (i < lengths.length - 1 && d > lengths[i]) { d -= lengths[i]; i++; }
            const arc  =  (ox, oy, from) => { const a = from - (d / Math.max(q, 1e-5)) * Math.PI / 2; return place(ox + Math.cos(a) * r, oy + Math.sin(a) * r, Math.cos(a), Math.sin(a), s); };
            switch (i) {
                case 0  : return place(-hw, d, -1, 0, s);
                case 1  : return arc(-hw + r, hh - r, Math.PI);
                case 2  : return place(-hw + r + d, hh, 0, 1, s);
                case 3  : return arc(hw - r, hh - r, Math.PI / 2);
                case 4  : return place(hw, hh - r - d, 1, 0, s);
                case 5  : return arc(hw - r, -hh + r, 0);
                case 6  : return place(hw - r - d, -hh, 0, -1, s);
                case 7  : return arc(-hw + r, -hh + r, -Math.PI / 2);
                default : return place(-hw, -hh + r + d, -1, 0, s);
            }
        };
        const step   =  L / Math.max(8, Math.round(L / 0.02));
        const n      =  Math.round(L / step);
        let start    =  0;
        while (start < n && !inGap(start * step)) start++;
        const half   =  start >= n ? Math.floor(n / 2) : -1;                  // <-- No gaps at all (Breaks at 0): two strokes that meet, as a hand closes a stone. One stroke ending where it began has no length to the pen
        const runs   =  [];
        let run      =  null;
        for (let i = 0; i <= n; i++) {
            const s  =  ((start + i) % n) * step;
            if (inGap(s)) { if (run) { runs.push(run); run = null; } continue; }
            if (!run) run = [];
            run.push(at(s));
            if (i === half) { runs.push(run); run = [at(s)]; }
        }
        if (run) runs.push(run);
        return runs.map((points, i) => ({ Points: points, Length: (points.length - 1) * step, Key: i })).filter(kept => kept.Points.length >= 3).sort((a, b) => b.Length - a.Length);
    }
    // ------------------------------------------------------------


    // FUNCTION | Hand One Stroke to the Pen - through the same visibility and loss as any line
    // ------------------------------------------------------------
    function PainterlyNPR__Rubble__Mark(surface, pattern, points, key, ctx) {
        const loose  =  PainterlyNPR__MaterialDepiction__Times(ctx.Hand, 'Looseness', 'Rubble', DEPICT.LooseMax);
        const world  =  points.map(([u, v]) => PainterlyNPR__Rubble__At(surface, u, v));
        const edge   =  { Id: 0, ObjectId: surface.ObjectId, A: world[0], B: world[world.length - 1], Points: world, Class: 3, Kind: 'Indication' };
        PainterlyNPR__LineCandidates__Process(edge, ctx.Strokes, ctx.Push, {
            ObjectId :  surface.ObjectId,
            Key      :  key,
            SkipKeep :  true,
            NoProfile:  true,
            NoEnds   :  true,
            Quiet    :  true,
            Class    :  3,
            Tier     :  PEN.Tier,
            Alpha    :  pattern.Ink,
            MinMm    :  0.2,
            TaperIn  :  PEN.TaperInMm * loose,
            TaperOut :  PEN.TaperOutMm * loose,
            Wobble   :  PEN.Wobble * loose,
            LooseAdd :  PainterlyNPR__MaterialDepiction__LooseAdd(ctx.Hand, 'Rubble'),
            Colour   :  ctx.Kept,
            Source   :  'Indication',
            Stats    :  ctx.Stats,
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Stone's Box in Its Hand - coursed nearer one size, or more various
    // ------------------------------------------------------------
    // Randomness below its neutral draws each stone toward the wall's middling size,
    // about its own middle; above it, sizes and places scatter further. The layout
    // stays the wall's: only what is drawn moves, so a point can act here alone.
    function PainterlyNPR__Rubble__InHand(stone, id, hash, hand) {
        const k  =  PainterlyNPR__MaterialDepiction__Times(hand, 'Randomness', 'Rubble', 2);
        if (k === 1) return stone;
        const cu = (stone.U0 + stone.U1) / 2, cv = (stone.V0 + stone.V1) / 2;
        const meanW  =  (RUBBLE.StoneWidthM[0] + RUBBLE.StoneWidthM[1]) / 2, meanH = (RUBBLE.StoneHeightM[0] + RUBBLE.StoneHeightM[1]) / 2;
        const w  =  Lerp(meanW, stone.U1 - stone.U0, Math.min(k, 1)) * (k > 1 ? 1 + (k - 1) * 0.5 * (hash(id, 21) - 0.5) : 1);
        const h  =  Lerp(meanH, stone.V1 - stone.V0, Math.min(k, 1)) * (k > 1 ? 1 + (k - 1) * 0.5 * (hash(id, 22) - 0.5) : 1);
        const shift  =  k > 1 ? (k - 1) * 0.05 : 0;
        const du = shift * (hash(id, 23) - 0.5) * 2, dv = shift * (hash(id, 24) - 0.5) * 2;
        return { U0: cu + du - w / 2, U1: cu + du + w / 2, V0: cv + dv - h / 2, V1: cv + dv + h / 2, Index: stone.Index };
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw One Stone - its strokes, and now and then a tick beside it
    // ------------------------------------------------------------
    function PainterlyNPR__Rubble__DrawStone(surface, pattern, stone, group, ctx) {
        const id    =  group * 53 + stone.Index;
        const hash  =  (i, salt) => PainterlyNPR__SeededRandom__HashUnit(i, ctx.WallSeed + SALT_PEN + salt);
        const runs  =  PainterlyNPR__Rubble__StoneRuns(PainterlyNPR__Rubble__InHand(stone, id, hash, ctx.Hand), id, hash, ctx.Hand);
        runs.forEach((run, r) => {
            if (r > 0 && run.Length < 0.14 && hash(id * 5 + r, 15) < PEN.DropChance) return;
            PainterlyNPR__Rubble__Mark(surface, pattern, run.Points, `rub:${surface.Id}${ctx.MarkSalt}:${group}:${stone.Index}:${run.Key}`, ctx);
        });
        if (hash(id, 16) < PEN.TickChance) {
            const u  =  stone.U1 + 0.012 + 0.025 * hash(id, 17);
            const v  =  Lerp(stone.V0, stone.V1, 0.2 + 0.6 * hash(id, 18));
            PainterlyNPR__Rubble__Mark(surface, pattern, [[u, v], [u + 0.002, v + PEN.TickM * 0.5], [u + 0.004, v + PEN.TickM]], `rub:${surface.Id}${ctx.MarkSalt}:${group}:${stone.Index}:t`, ctx);
        }
        ctx.Stats.Stones++;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Washes
// -----------------------------------------------------------------------------

    // FUNCTION | One Wash's Shape Into the Stone Target - a cone, heart to rim, on the wall
    // ------------------------------------------------------------
    // An outline that swells and falls, walked out from the middle along each of
    // its directions and stopped where the wall does. Triangles fanned from the
    // middle, six floats a corner (sheet x and y, then the RGBA), blended by MAX:
    // heart holds the channel amounts at the middle, rim what stays at the edge
    // (a stone's strength in A holds right across it).
    function PainterlyNPR__Rubble__Wash(surface, cu, cv, halfU, halfV, heart, rim, id, salt, ctx) {
        if (!PainterlyNPR__Rubble__Clear(surface, cu, cv)) return;
        const c  =  PainterlyNPR__Rubble__Project(surface, cu, cv);
        if (!(c.Depth > 0.2)) return;
        const hash   =  (i, s) => PainterlyNPR__SeededRandom__HashUnit(i + Math.imul(id, 131), ctx.WallSeed + SALT_WASH + salt + s);
        const sides  =  WASH.Sides;
        const p2 = hash(0, 1) * 6.283, p3 = hash(0, 2) * 6.283, p5 = hash(0, 3) * 6.283;
        const RX = new Array(sides), RY = new Array(sides);
        for (let k = 0; k < sides; k++) {
            const t      =  (k + 0.6 * (hash(k, 4) - 0.5)) / sides * 6.283;
            const swell  =  1 + WASH.Lobes * (0.5 * Math.cos(2 * t + p2) + 0.32 * Math.cos(3 * t + p3) + 0.22 * Math.cos(5 * t + p5));
            const du     =  Math.cos(t) * halfU * swell, dv = Math.sin(t) * halfV * swell;
            let reach    =  1;
            for (let s = 1; s <= WASH.SearchSteps; s++) {
                const f  =  s / WASH.SearchSteps;
                if (!PainterlyNPR__Rubble__Clear(surface, cu + du * f, cv + dv * f)) { reach = (s - 1) / WASH.SearchSteps; break; }
            }
            const p  =  PainterlyNPR__Rubble__Project(surface, cu + du * reach, cv + dv * reach);
            RX[k] = p.X; RY[k] = p.Y;
        }
        const out  =  ctx.StoneDabs;
        out.Reserve(sides * 18);
        const d  =  out.Data;
        let o    =  out.Length;
        const put  =  (x, y, q) => { d[o++] = x; d[o++] = y; d[o++] = q[0]; d[o++] = q[1]; d[o++] = q[2]; d[o++] = q[3]; };
        for (let k = 0; k < sides; k++) {
            const k1  =  (k + 1) % sides;
            put(c.X, c.Y, heart); put(RX[k], RY[k], rim); put(RX[k1], RY[k1], rim);
        }
        out.Length  =  o;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | How Much Longer and Lower a Wash Lies on a Wall Turned Away
    // ------------------------------------------------------------
    // ctx.Squeeze is how wide the wall comes out on the sheet for its height, 1 seen
    // square on. Half of what it takes back goes on the length, half off the height,
    // so a wash covers the wall as it would have.
    function PainterlyNPR__Rubble__Lean(ctx) {
        return Math.sqrt(Math.max(1, WASH.LongAt / ctx.Squeeze));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | How Strong the Hand Has a Wash - exactly as drawn at Accents' neutral, as a brick's touch is
    // ------------------------------------------------------------
    function PainterlyNPR__Rubble__WashStrength(ctx) {
        return 0.7 + 0.6 * ctx.Hand.Accents;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Pale Wash Alone - where no stones are drawn
    // ------------------------------------------------------------
    function PainterlyNPR__Rubble__LoneWash(surface, cu, cv, cell, ctx) {
        const lean  =  PainterlyNPR__Rubble__Lean(ctx);
        PainterlyNPR__Rubble__Wash(surface, cu, cv, WASH.LoneHalfM[0] * lean, WASH.LoneHalfM[1] / lean, [0, 0.7 * PainterlyNPR__Rubble__WashStrength(ctx), 0, 0], [0, 0, 0, 0], cell, 4, ctx);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Group's Washes - the broad pale one round it, and the darker ones inside its stones
    // ------------------------------------------------------------
    function PainterlyNPR__Rubble__GroupWashes(surface, stones, cell, ctx) {
        const lean  =  PainterlyNPR__Rubble__Lean(ctx);
        const hash  =  (i, salt) => PainterlyNPR__SeededRandom__HashUnit(i, ctx.WallSeed + SALT_WASH + 50 + salt);
        const accents  =  PainterlyNPR__MaterialDepiction__Times(ctx.Hand, 'Accents', 'Rubble', DEPICT.AccentMax);
        const strong   =  PainterlyNPR__Rubble__WashStrength(ctx);
        let U0 = Infinity, U1 = -Infinity, V0 = Infinity, V1 = -Infinity;
        for (const s of stones) { U0 = Math.min(U0, s.U0); U1 = Math.max(U1, s.U1); V0 = Math.min(V0, s.V0); V1 = Math.max(V1, s.V1); }
        if (hash(cell, 0) < WASH.GroupChance * accents) {
            const peak  =  Math.min(1, Lerp(WASH.GroupPeak[0], WASH.GroupPeak[1], hash(cell, 1)) * strong);
            const grow  =  WASH.GroupGrowM * Lerp(0.7, 1.3, hash(cell, 2));
            const cu    =  (U0 + U1) / 2 + (hash(cell, 3) - 0.5) * 0.3 * (U1 - U0);
            const cv    =  (V0 + V1) / 2 + (hash(cell, 4) - 0.5) * 0.3 * (V1 - V0);
            PainterlyNPR__Rubble__Wash(surface, cu, cv, ((U1 - U0) / 2 + grow) * lean, ((V1 - V0) / 2 + grow) / lean, [0, peak, 0, 0], [0, 0, 0, 0], cell, 1, ctx);
        }
        for (const s of stones) {
            const id  =  cell * 53 + s.Index;
            if (hash(id, 5) >= WASH.StoneChance * accents) continue;
            const w = s.U1 - s.U0, h = s.V1 - s.V0;
            const fit   =  Lerp(WASH.StoneFit[0], WASH.StoneFit[1], hash(id, 6));
            const tone  =  Math.min(1, Lerp(WASH.StoneTone[0], WASH.StoneTone[1], hash(id, 7)) * strong);
            const cu    =  (s.U0 + s.U1) / 2 + (hash(id, 8) - 0.5) * 2 * WASH.StoneOffset * w;
            const cv    =  (s.V0 + s.V1) / 2 + (hash(id, 9) - 0.5) * 2 * WASH.StoneOffset * h;
            PainterlyNPR__Rubble__Wash(surface, cu, cv, 0.5 * w * fit * 1.15 * lean, 0.5 * h * fit * 1.5 / lean, [1, 0, 0, tone], [0, 0, 0, tone], id, 2, ctx);
            if (hash(id, 10) < WASH.SecondLobeChance) {
                const side  =  hash(id, 11) < 0.5 ? -1 : 1;
                PainterlyNPR__Rubble__Wash(surface, cu + side * 0.3 * w * lean, cv + (hash(id, 12) - 0.5) * 0.4 * h, 0.3 * w * lean, 0.42 * h / lean, [1, 0, 0, tone * 0.85], [0, 0, 0, tone * 0.85], id, 3, ctx);
            }
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
        PainterlyNPR__Rubble__Clear,
        PainterlyNPR__Rubble__DrawStone,
        PainterlyNPR__Rubble__GroupWashes,
        PainterlyNPR__Rubble__LoneWash,
        PainterlyNPR__Rubble__Project,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
