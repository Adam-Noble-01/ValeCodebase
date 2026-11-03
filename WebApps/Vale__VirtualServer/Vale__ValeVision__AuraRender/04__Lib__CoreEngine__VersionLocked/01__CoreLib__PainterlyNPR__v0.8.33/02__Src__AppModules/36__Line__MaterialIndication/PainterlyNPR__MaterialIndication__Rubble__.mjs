/* =============================================================================
   PAINTERLYNPR - LINE | MATERIAL INDICATION - RUBBLE STONE
   =============================================================================

   FILE       : PainterlyNPR__MaterialIndication__Rubble__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - MaterialIndication - Rubble
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A rubble stone wall, as Vale's illustrator draws one: groups of
                stones spaced over the wall, each chosen as a hand would, chosen
                and never textured
   CREATED    : 03-Nov-2026 (v0.8.20)

   DESCRIPTION:
   - Adam, 03-Nov-2026: "See how the darker washes appear loosely within the
     bounds of where stones appear?" Measured off the Thrower scans (A2Q 15270-1,
     1:50 at A2 and the perspective, both 300 dpi): stones about 0.25 to 0.45 m
     wide, a stone two or three pen strokes that never close, a tan wash loosely
     inside it and a broader one round its group. Adam took out the flicks of
     white the scans have: "they do not look good".
   - THE LAYOUT belongs to the wall: a group to a cell, laid once per surface and
     seed, clear of the wall's edges, its openings and its other stones, and
     never many in a column (Adam: "make sure too many cant stack vertically ...
     it spoils the effect").
   - THE CHOICE belongs to the drawing: a group is kept by its share of the wall,
     the wall's size on the sheet, its light and the art direction field, then
     stone by stone: it must still read long and low on the sheet, which a wall
     turned away thins as a hand would (Adam: "see the side looks bad? but the
     front looks good?"), and the truth buffer must show this very wall in this
     very class. What a hand puts down for each is RubbleMarks.
   - DETERMINISTIC: every draw is a hash of the surface's seed and the cell, made
     in a fixed order whatever is kept, so stones never reshuffle as the camera
     moves, and the seed of a pen stroke comes from its own identity.

   ============================================================================= */

import IndicationConfig from './Na__MaterialIndication__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__Maths__Lerp        as  Lerp,
    PainterlyNPR__Maths__SmoothStep  as  SmoothStep,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__SeededRandom__HashUnit } from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_BY_KEY as MATERIAL_BY_KEY } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__GeometryBuffers__DepthAt,
    PainterlyNPR__GeometryBuffers__LightAt,
    PainterlyNPR__GeometryBuffers__MaterialAt,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import {
    PainterlyNPR__Rubble__Clear,
    PainterlyNPR__Rubble__DrawStone,
    PainterlyNPR__Rubble__GroupWashes,
    PainterlyNPR__Rubble__LoneWash,
    PainterlyNPR__Rubble__Project,
} from './PainterlyNPR__MaterialIndication__RubbleMarks__.mjs';
import {
    PainterlyNPR__MaterialDepiction__At,
    PainterlyNPR__MaterialDepiction__MarkSalt,
    PainterlyNPR__MaterialDepiction__Seeded,
    PainterlyNPR__MaterialDepiction__SeedHere,
    PainterlyNPR__MaterialDepiction__Times,
    PainterlyNPR__MaterialDepiction__REACH  as  DEPICT,
} from './PainterlyNPR__MaterialIndication__Depiction__.mjs';
import { PainterlyNPR__ArtDirection__FieldAt } from '../66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__Field__.mjs';

// =============================================================================
// REGION | Material Indication - Rubble Stone
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__MaterialIndication__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const RUBBLE  =  PainterlyNPR__ConfigAccess__Section(IndicationConfig, 'PainterlyNPR__MaterialIndication__Config', 'Rubble', ['CellM', 'CellJitter', 'GroupShare', 'GroupSizes', 'SideBySide', 'Bond', 'StoneWidthM', 'StoneHeightM', 'GapM', 'Stack', 'Quiet', 'SheetMm', 'SheetAspect', 'OnWallEpsM', 'Wash']);
    const WASH    =  RUBBLE.Wash;
    const STACK   =  RUBBLE.Stack;
    const QUIET   =  RUBBLE.Quiet;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Where a Stone Is Probed, and How It Is Fitted
    // ------------------------------------------------------------
    const STONE_PROBES  =  [[0.5, 0.5], [0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]];   // <-- Shares of its box
    const CLEARANCE_M   =  0.02;                                             // <-- A stone stands this far clear of what it must not cross
    const SALT          =  { Jitter: 1, Keep: 3, Count: 4, Rows: 5, Height: 10, Bond: 90, Lone: 100, Shift: 200, Drift: 300 };   // <-- Every draw has its own, so one more never shifts another
    const JOINT_M       =  0.035;                                            // <-- Stones of different groups keep this far apart
    const LAYOUTS_KEPT  =  12;                                                 // <-- A wall's layouts kept at once, one to a seed: cycling through more only draws them again
    const BUCKET_M      =  0.6;                                              // <-- The overlap test's coarse cell of the wall
    const SHIFTS        =  [[0, 0], [0.07, 0], [-0.07, 0], [0.14, 0], [-0.14, 0], [0, 0.05], [0, -0.05], [0.21, 0], [-0.21, 0]];   // <-- Where a stone is tried, nearest first, in metres: how a mason shifts one to fit; further would crowd every wall's edge
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Truth Buffer's Say
// -----------------------------------------------------------------------------

    // FUNCTION | How Far a Pixel's Depth May Stray and Still Be This Wall
    // ------------------------------------------------------------
    // A wall turned away changes depth quickly from pixel to pixel: the tolerance
    // is a small constant plus what one pixel's step along each of its axes does.
    function PainterlyNPR__Rubble__DepthTolerance(surface, u, v, p) {
        const a  =  PainterlyNPR__Rubble__Project(surface, u + 0.1, v);
        const b  =  PainterlyNPR__Rubble__Project(surface, u, v + 0.1);
        const perPx  =  (q) => Math.abs(q.Depth - p.Depth) / Math.max(Math.hypot(q.X - p.X, q.Y - p.Y), 1e-3);
        return RUBBLE.OnWallEpsM + 1.5 * (perPx(a) + perPx(b));
    }
    // ------------------------------------------------------------


    // FUNCTION | Does the Truth Buffer Show This Wall Where a Stone Would Lie?
    // ------------------------------------------------------------
    // Anything standing proud of the plane, or a face of it given another class,
    // takes the stone away; something in front of the wall (a plant) only hides
    // what it hides, and the pen's own visibility test deals with that.
    function PainterlyNPR__Rubble__OnWall(surface, stone, tolerance) {
        const stoneId  =  MATERIAL_BY_KEY.Stonework.Id;
        let seen  =  0;
        for (const [fu, fv] of STONE_PROBES) {
            const p  =  PainterlyNPR__Rubble__Project(surface, Lerp(stone.U0, stone.U1, fu), Lerp(stone.V0, stone.V1, fv));
            if (!(p.Depth > 0.2) || p.X < 0 || p.Y < 0 || p.X >= Gpu.Width || p.Y >= Gpu.Height) continue;
            const depth  =  PainterlyNPR__GeometryBuffers__DepthAt(p.X, p.Y);
            if (PainterlyNPR__GeometryBuffers__ObjectAt(p.X, p.Y) === surface.ObjectId) {
                if (Math.abs(depth - p.Depth) > tolerance) return false;
                if (Math.round(PainterlyNPR__GeometryBuffers__MaterialAt(p.X, p.Y)) !== stoneId) return false;
                seen++;
            } else if (depth > p.Depth + tolerance) return false;                 // <-- Past the wall's edge, or a hole in it
        }
        return seen > 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Layout
// -----------------------------------------------------------------------------

    // FUNCTION | One Group's Stones - laid out round the group's place, whatever is kept
    // ------------------------------------------------------------
    // One or two rows, the second bonded off the first, never straight over it, as
    // a wall's joints never line up. Every draw is made for every stone, kept or
    // not. Returns boxes in (u, v) metres, Index the stone's place in the group,
    // which names it from here on.
    function PainterlyNPR__Rubble__GroupStones(cu, cv, cell, hash) {
        const sizes  =  RUBBLE.GroupSizes;
        const total  =  sizes.reduce((sum, s) => sum + s, 0);
        let pick     =  hash(cell, SALT.Count) * total;
        let count    =  1;
        for (let i = 0; i < sizes.length; i++) { if (pick < sizes[i]) { count = i + 1; break; } pick -= sizes[i]; }
        const stack  =  hash(cell, SALT.Rows);
        const rows   =  count === 1 ? [1] : count === 2 ? (stack < RUBBLE.SideBySide ? [2] : [1, 1]) : count === 3 ? (stack < 0.5 ? [2, 1] : [1, 2]) : [2, 2];
        const stones =  [];
        const heightOf  =  (k) => Lerp(RUBBLE.StoneHeightM[0], RUBBLE.StoneHeightM[1], hash(cell, SALT.Height + 7 * k));
        const widthOf   =  (k) => Lerp(RUBBLE.StoneWidthM[0], RUBBLE.StoneWidthM[1], hash(cell, SALT.Height + 7 * k + 1));
        const gapOf     =  (k) => Lerp(RUBBLE.GapM[0], RUBBLE.GapM[1], hash(cell, SALT.Height + 7 * k + 2));
        const h0        =  heightOf(0);
        const h1        =  rows.length > 1 ? heightOf(1) : h0;
        const rowGap    =  rows.length > 1 ? gapOf(6) : 0;
        let k  =  0;
        rows.forEach((n, r) => {
            const h      =  r === 0 ? h0 : h1;
            const vc     =  rows.length === 1 ? cv : (r === 0 ? cv - (rowGap + h) / 2 : cv + (rowGap + h) / 2);
            const widths =  [];
            for (let i = 0; i < n; i++) widths.push(widthOf(k + i + 2));
            const gap    =  n > 1 ? gapOf(k + 2) : 0;
            const span   =  widths.reduce((sum, w) => sum + w, 0) + gap;
            const off    =  hash(cell, SALT.Bond) - 0.5;
            const bond   =  r === 0 ? 0 : Math.sign(off) * Lerp(RUBBLE.Bond[0], RUBBLE.Bond[1], 2 * Math.abs(off)) * widths[0];
            let u        =  cu - span / 2 + bond;
            for (let i = 0; i < n; i++) {
                const short  =  h * Lerp(0.82, 1, hash(cell, SALT.Height + 7 * k + 3));
                stones.push({ U0: u, U1: u + widths[i], V0: vc - short / 2, V1: vc + short / 2, Index: k });
                u += widths[i] + gap;
                k++;
            }
        });
        return stones;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Stone's Box Clear of Everything It Must Not Cross?
    // ------------------------------------------------------------
    function PainterlyNPR__Rubble__StoneClear(surface, stone) {
        for (const [fu, fv] of STONE_PROBES) {
            const u  =  Lerp(stone.U0 - CLEARANCE_M, stone.U1 + CLEARANCE_M, fu);
            const v  =  Lerp(stone.V0 - CLEARANCE_M, stone.V1 + CLEARANCE_M, fv);
            if (!PainterlyNPR__Rubble__Clear(surface, u, v)) return false;
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | How Much of a Group's Chance It Keeps - the middle of a plain wall goes quiet
    // ------------------------------------------------------------
    // A front's windows and porch break its stones up; a plain gable has nothing to,
    // and its groups spread as evenly as spots. A hand draws stones where the eye
    // goes, round openings and corners, and lets the middle of a plain stretch go
    // quiet in wandering patches. Plain: the share of the probes round the group
    // that find open wall. Returns 1 near anything, less out in the open.
    function PainterlyNPR__Rubble__Quiet(surface, cu, cv, hash) {
        let open  =  0;
        for (let k = 0; k < QUIET.Probes; k++) {
            const t  =  6.283 * k / QUIET.Probes;
            if (PainterlyNPR__Rubble__Clear(surface, cu + Math.cos(t) * QUIET.ReachM[0], cv + Math.sin(t) * QUIET.ReachM[1])) open++;
        }
        const x = cu / QUIET.DriftM, y = cv / QUIET.DriftM;
        const i = Math.floor(x), j = Math.floor(y);
        const fx = SmoothStep(0, 1, x - i), fy = SmoothStep(0, 1, y - j);
        const at     =  (a, b) => hash(a * 613 + b * 9973 + 50021, SALT.Drift);
        const drift  =  Lerp(Lerp(at(i, j), at(i + 1, j), fx), Lerp(at(i, j + 1), at(i + 1, j + 1), fx), fy);
        return Lerp(1, Lerp(QUIET.Keep[0], QUIET.Keep[1], SmoothStep(0.25, 0.75, drift)), SmoothStep(QUIET.Plain[0], QUIET.Plain[1], open / QUIET.Probes));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Wall's Stones - laid once per surface and seed, whatever is drawn
    // ------------------------------------------------------------
    // Group by group, cell by cell, offset row by row so no grid shows. Each stone
    // is tried where its group would have it and then a little to either side, as
    // a mason shifts one to fit: clear of the wall's edges, its openings and the
    // stones already laid, and never the one too many in a column, or left out.
    // So the layout never depends on the camera or on which groups get drawn, and
    // it is kept on the surface until the scene changes: a few of them, one to a
    // seed, as a Material point's dice and slider cycle through variations.
    function PainterlyNPR__Rubble__Layout(surface, seed) {
        if (!surface.RubbleLayouts) surface.RubbleLayouts = new Map();
        const kept  =  surface.RubbleLayouts.get(seed);
        if (kept) return kept;
        const hash   =  (i, salt) => PainterlyNPR__SeededRandom__HashUnit(i, seed + salt);
        const [cellU, cellV]  =  RUBBLE.CellM;
        const rows   =  Math.ceil(surface.Height / cellV) + 1;
        const cols   =  Math.ceil(surface.Width / cellU) + 2;
        const groups =  [];
        const laid   =  new Map();                                             // <-- Stones by a coarse cell of the wall, for the overlap test
        const bucket =  (u, v) => Math.floor(u / BUCKET_M) * 8192 + Math.floor(v / BUCKET_M);
        const free   =  (s) => {
            for (let u = s.U0 - BUCKET_M; u <= s.U1 + BUCKET_M; u += BUCKET_M) {
                for (let v = s.V0 - BUCKET_M; v <= s.V1 + BUCKET_M; v += BUCKET_M) {
                    for (const o of laid.get(bucket(u, v)) || []) {
                        if (s.U0 < o.U1 + JOINT_M && s.U1 > o.U0 - JOINT_M && s.V0 < o.V1 + JOINT_M && s.V1 > o.V0 - JOINT_M) return false;
                    }
                }
            }
            return true;
        };
        // How many stones stand over (or under) this one, by the longest chain: each
        // link within a stone's height of the next and sharing enough of its width
        const chain  =  (s, up) => {
            const v0 = up ? s.V1 : s.V0 - STACK.GapM, v1 = up ? s.V1 + STACK.GapM : s.V0;
            let most  =  0;
            for (let u = s.U0; u <= s.U1 + BUCKET_M; u += BUCKET_M) {
                for (let v = v0; v <= v1 + BUCKET_M; v += BUCKET_M) {
                    for (const o of laid.get(bucket(Math.min(u, s.U1), Math.min(v, v1))) || []) {
                        const gap  =  up ? o.V0 - s.V1 : s.V0 - o.V1;
                        if (gap < 0 || gap > STACK.GapM) continue;
                        const shared  =  Math.min(s.U1, o.U1) - Math.max(s.U0, o.U0);
                        if (shared >= STACK.SharedWidth * Math.min(s.U1 - s.U0, o.U1 - o.U0)) most = Math.max(most, 1 + chain(o, up));
                    }
                }
            }
            return most;
        };
        for (let row = 0; row < rows; row++) {
            const shift  =  (row % 2) * 0.5 * cellU;
            for (let col = -1; col < cols; col++) {
                const cell  =  row * 4093 + col + 2048;
                const cu    =  shift + (col + 0.5 + RUBBLE.CellJitter * (hash(cell, SALT.Jitter) - 0.5)) * cellU;
                const cv    =  (row + 0.5 + RUBBLE.CellJitter * (hash(cell, SALT.Jitter + 1) - 0.5)) * cellV;
                if (cu < -cellU || cu > surface.Width + cellU) continue;
                const stones  =  [];
                groups.push({ Cell: cell, Cu: cu, Cv: cv, Quiet: PainterlyNPR__Rubble__Quiet(surface, cu, cv, hash), Stones: stones });
                if (!PainterlyNPR__Rubble__Clear(surface, cu, cv)) continue;          // <-- A group stands on open wall, or nowhere
                for (const stone of PainterlyNPR__Rubble__GroupStones(cu, cv, cell, hash)) {
                    const flip  =  hash(cell * 53 + stone.Index, SALT.Shift) < 0.5 ? 1 : -1;
                    for (const [du, dv] of SHIFTS) {
                        const moved  =  { U0: stone.U0 + flip * du, U1: stone.U1 + flip * du, V0: stone.V0 + dv, V1: stone.V1 + dv, Index: stone.Index };
                        if (!PainterlyNPR__Rubble__StoneClear(surface, moved) || !free(moved) || 1 + chain(moved, true) + chain(moved, false) > STACK.Most) continue;
                        stones.push(moved);
                        for (let u = moved.U0; u <= moved.U1 + BUCKET_M; u += BUCKET_M) {
                            for (let v = moved.V0; v <= moved.V1 + BUCKET_M; v += BUCKET_M) {
                                const key  =  bucket(Math.min(u, moved.U1), Math.min(v, moved.V1));
                                let on     =  laid.get(key);
                                if (!on) { on = []; laid.set(key, on); }
                                if (!on.includes(moved)) on.push(moved);
                            }
                        }
                        break;
                    }
                }
            }
        }
        if (surface.RubbleLayouts.size >= LAYOUTS_KEPT) surface.RubbleLayouts.clear();
        const made  =  { Groups: groups, ByCell: new Map(groups.map(g => [g.Cell, g])) };
        surface.RubbleLayouts.set(seed, made);
        return made;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Choice
// -----------------------------------------------------------------------------

    // FUNCTION | Draw One Rubble Surface - each of its groups weighed once
    // ------------------------------------------------------------
    // ctx is material indication's own (Amount, Simplify, Facing, Strokes, Stats,
    // Push), with StoneDabs, Laid and Kept, and WallSeed and Squeeze set here (how
    // wide the wall comes out on the sheet for its height). A group is chosen
    // by its share of the wall, the wall's size on the sheet, its light and the art
    // direction field, then stone by stone: long and low on the sheet, and on the
    // wall by the truth buffer. A wall turned away squeezes its stones narrower but
    // no lower, so they would come out square and twice as close: it keeps fewer
    // groups, so they stand as far apart on the sheet as on a wall seen square on,
    // and of those only the stones that still read as stones. A cell with no stones
    // drawn may still take a pale wash alone. Where a Material point's seed holds, the
    // cell's group comes from that seed's own layout of the wall, and every choice
    // and mark from that seed; a stone that would cross one already drawn from the
    // other layout, along the seed's edge, is left out.
    function PainterlyNPR__MaterialIndication__Rubble(surface, pattern, seed, ctx) {
        const stoneH  =  RUBBLE.StoneHeightM[1];
        const seeded  =  PainterlyNPR__MaterialDepiction__Seeded();
        const placed  =  [];
        for (const home of PainterlyNPR__Rubble__Layout(surface, seed).Groups) {
            let group  =  home, wallSeed = seed, salt = '';
            if (seeded) {
                const q  =  PainterlyNPR__Rubble__Project(surface, home.Cu, home.Cv);
                const h  =  q.Depth > 0.2 && q.X >= 0 && q.Y >= 0 && q.X < Gpu.Width && q.Y < Gpu.Height ? PainterlyNPR__MaterialDepiction__At('Rubble', q.X, q.Y) : null;
                if (h && h.Seed) {
                    wallSeed  =  PainterlyNPR__MaterialDepiction__SeedHere(seed, h);
                    salt      =  PainterlyNPR__MaterialDepiction__MarkSalt(h);
                    group     =  PainterlyNPR__Rubble__Layout(surface, wallSeed).ByCell.get(home.Cell);
                    if (!group) continue;
                }
            }
            const hash    =  (i, s) => PainterlyNPR__SeededRandom__HashUnit(i, wallSeed + s);
            ctx.WallSeed  =  wallSeed;
            ctx.MarkSalt  =  salt;
            const { Cell: cell, Stones: stones }  =  group;
            for (const s of stones) {
                const a = PainterlyNPR__Rubble__Project(surface, s.U0, s.V0), b = PainterlyNPR__Rubble__Project(surface, s.U1, s.V0);
                const c = PainterlyNPR__Rubble__Project(surface, s.U1, s.V1), d = PainterlyNPR__Rubble__Project(surface, s.U0, s.V1);
                ctx.Push(a, b, ctx.Laid); ctx.Push(b, c, ctx.Laid); ctx.Push(c, d, ctx.Laid); ctx.Push(d, a, ctx.Laid);
            }

            // Weighed at the group's middle: off the sheet, none of it
            const cu  =  stones.length ? stones.reduce((sum, s) => sum + s.U0 + s.U1, 0) / (2 * stones.length) : group.Cu;
            const cv  =  stones.length ? stones.reduce((sum, s) => sum + s.V0 + s.V1, 0) / (2 * stones.length) : group.Cv;
            const p   =  PainterlyNPR__Rubble__Project(surface, cu, cv);
            if (!(p.Depth > 0.2) || p.X < 0 || p.Y < 0 || p.X >= Gpu.Width || p.Y >= Gpu.Height) continue;
            const up        =  PainterlyNPR__Rubble__Project(surface, cu, cv + stoneH);
            const along     =  PainterlyNPR__Rubble__Project(surface, cu + stoneH, cv);
            const upPx      =  Math.hypot(up.X - p.X, up.Y - p.Y);
            const heightMm  =  upPx / Gpu.PxPerMm;
            ctx.Squeeze     =  Math.min(1, Math.hypot(along.X - p.X, along.Y - p.Y) / Math.max(upPx, 1e-3));
            const field     =  PainterlyNPR__ArtDirection__FieldAt(p.X, p.Y);
            const light     =  PainterlyNPR__GeometryBuffers__LightAt(p.X, p.Y);
            ctx.Hand        =  PainterlyNPR__MaterialDepiction__At('Rubble', p.X, p.Y);   // <-- The material's hand here, a Material point's say included: what its marks are drawn in
            const sheet     =  SmoothStep(RUBBLE.SheetMm[0], RUBBLE.SheetMm[1], heightMm) * (1 - 0.15 * light) * ctx.Facing * ctx.Simplify;
            const share     =  RUBBLE.GroupShare * ctx.Amount * sheet * group.Quiet * Math.min(1, ctx.Squeeze / WASH.LongAt) + 0.95 * field.Indication;
            const chosen    =  hash(cell, SALT.Keep) < share;

            const tolerance  =  chosen ? PainterlyNPR__Rubble__DepthTolerance(surface, cu, cv, p) : 0;
            const aspect     =  RUBBLE.SheetAspect * Math.max(0, 1 - field.Indication);   // <-- A point asking for stones may have them, whatever they read as
            const drawn      =  chosen ? stones.filter(s => (s.U1 - s.U0) * ctx.Squeeze >= aspect * (s.V1 - s.V0) && PainterlyNPR__Rubble__OnWall(surface, s, tolerance) && !placed.some(o => s.U0 < o.U1 + JOINT_M && s.U1 > o.U0 - JOINT_M && s.V0 < o.V1 + JOINT_M && s.V1 > o.V0 - JOINT_M)) : [];
            if (seeded) placed.push(...drawn);
            if (drawn.length) {
                PainterlyNPR__Rubble__GroupWashes(surface, drawn, cell, ctx);
                for (const s of drawn) PainterlyNPR__Rubble__DrawStone(surface, pattern, s, cell, ctx);
            } else if (share > 0.02 && sheet > 0.1 && hash(cell, SALT.Lone) < WASH.LoneChance * PainterlyNPR__MaterialDepiction__Times(ctx.Hand, 'Accents', 'Rubble', DEPICT.AccentMax)) {
                PainterlyNPR__Rubble__LoneWash(surface, cu, cv, cell, ctx);
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
        PainterlyNPR__MaterialIndication__Rubble,
        PainterlyNPR__Rubble__DepthTolerance,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
