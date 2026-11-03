/* =============================================================================
   PAINTERLYNPR - LINE | CANDIDATE COLLECTION - PROFILE LINES
   =============================================================================

   FILE       : PainterlyNPR__LineCandidates__ProfileLines__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - CandidateCollection - ProfileLines
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A round thing's outline, traced from the rim 24 finds on the truth
                buffers into real pen strokes, where the scene's records drew no
                line: a downpipe's sides, a finial, a stem, a chimney pot
   CREATED    : 03-Nov-2026 (v0.8.38)

   DESCRIPTION:
   - Adam, 03-Nov-2026: "There should be a sobel type profile line effect like we
     use in ValeVision3D but then this is used to generate lines around smoother
     objects which then help create the bounds".
   - A VECTOR PATH THROUGH THE ONE PEN: each run goes through the same Process as
     an edge, so what it belongs to picks its pen, the paper loses it, a point
     weights it and the Drawing Discipline loosens it. No pixels go on the picture.
   - WHERE NO LINE IS DRAWN ALREADY: a rim within CoverMm of a line from the
     records is that line, so a mesh whose smooth edges did draw is never drawn
     twice. And never on a plant (Category Planting): plants are drawn by grammar.
   - IT RUNS LAST (rule 38): every earlier stroke keeps its seed, and at Round
     profiles 0 the drawing's lines are as they were.

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__GeometryBuffers__DepthAt,
    PainterlyNPR__GeometryBuffers__LightAt,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import {
    PainterlyNPR__ProfileLines__Read,
    PainterlyNPR__ProfileLines__TRACE  as  TRACE,
} from '../24__Pass__DerivedFields/PainterlyNPR__ProfileLines__Pass__.mjs';
import { PainterlyNPR__LineCandidates__ClassInk } from '../32__Line__ClassAndPriority/PainterlyNPR__LineCandidates__ClassAndPriority__.mjs';
import {
    PainterlyNPR__TechnicalPens__EdgeTier,
    PainterlyNPR__TechnicalPens__TierOf,
} from '../32__Line__ClassAndPriority/PainterlyNPR__TechnicalPens__Tiers__.mjs';

// =============================================================================
// REGION | Candidate Collection - Profile Lines
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Tracing the Rim
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Tracing
    // ------------------------------------------------------------
    const LINE_CLASS  =  1;                                                    // <-- A form's outline: secondary, as a whitecard's edges are; the paper takes it late
    const STEPS       =  [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const NO_LINE_CATEGORIES  =  new Set(TRACE.NoLineCategories);
    const NO_LINE_ROLES       =  new Set(TRACE.NoLineRoles);
    // ------------------------------------------------------------


    // HELPER FUNCTION | Walk the Rim One Way From a Pixel, Bridging Small Breaks
    // ------------------------------------------------------------
    // The rim's pixels are G of the profile target (one thick, eight-connected). Each
    // step takes the unseen neighbour nearest the way it was going; with none, it
    // looks a little further ahead, so a break of a pixel or two does not end a line.
    function PainterlyNPR__LineCandidates__ProfileWalk(on, seen, W, x, y, dx, dy, gap) {
        const out  =  [];
        let vx = dx, vy = dy;
        for (;;) {
            let best = -1, bx = 0, by = 0;
            for (let r = 1; r <= gap && best < 0; r++) {
                let score  =  r === 1 ? -2 : 0.3;                              // <-- Past the next pixel, only ahead
                for (let j = -r; j <= r; j++) {
                    for (let i = -r; i <= r; i++) {
                        if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
                        const nx = x + i, ny = y + j;
                        if (!on(nx, ny) || seen[ny * W + nx]) continue;
                        const len  =  Math.hypot(i, j);
                        const dot  =  (vx || vy) ? (i * vx + j * vy) / (len * Math.hypot(vx, vy)) : 0;
                        if (dot > score) { score = dot; best = 1; bx = nx; by = ny; }
                    }
                }
            }
            if (best < 0) return out;
            seen[by * W + bx]  =  1;
            vx  =  vx * 0.7 + (bx - x);                                        // <-- The way it has been going, over the last few steps
            vy  =  vy * 0.7 + (by - y);
            x   =  bx;
            y   =  by;
            out.push([x, y]);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Every Rim as a Chain of Pixels, in Scan Order
    // ------------------------------------------------------------
    function PainterlyNPR__LineCandidates__ProfileChains(mask, W, H, gap, minPx) {
        const on      =  (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[(y * W + x) * 4 + 1] > 127;
        const seen    =  new Uint8Array(W * H);
        const chains  =  [];
        for (let y = 0; y < H; y++) {
            const row  =  y * W * 4 + 1;
            for (let x = 0; x < W; x++) {
                if (mask[row + x * 4] <= 127 || seen[y * W + x]) continue;
                seen[y * W + x]  =  1;
                const ahead  =  PainterlyNPR__LineCandidates__ProfileWalk(on, seen, W, x, y, 0, 0, gap);
                const first  =  ahead.length ? [ahead[0][0] - x, ahead[0][1] - y] : [0, 0];
                const back   =  PainterlyNPR__LineCandidates__ProfileWalk(on, seen, W, x, y, -first[0], -first[1], gap);
                if (back.length + ahead.length + 1 >= minPx) chains.push(back.reverse().concat([[x, y]], ahead));
            }
        }
        return chains;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Where the Records Have Already Drawn a Line: a coarse grid, and the question
    // ------------------------------------------------------------
    function PainterlyNPR__LineCandidates__ProfileCover(strokes, W, H, cell) {
        const cols   =  Math.ceil(W / cell) + 2;
        const rows   =  Math.ceil(H / cell) + 2;
        const grid   =  new Uint8Array(cols * rows);
        const mark   =  (x, y) => { const c = Math.floor(x / cell) + 1, r = Math.floor(y / cell) + 1; if (c >= 0 && r >= 0 && c < cols && r < rows) grid[r * cols + c] = 1; };
        for (const stroke of strokes) {
            if (stroke.Source !== 'Edge') continue;
            const pts  =  stroke.Points;
            for (let i = 0; i + 1 < pts.length; i++) {
                const a = pts[i], b = pts[i + 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / cell) + 1;
                for (let k = 0; k <= n; k++) mark(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n);
            }
        }
        return (x, y) => {
            const c = Math.floor(x / cell) + 1, r = Math.floor(y / cell) + 1;
            for (let j = r - 1; j <= r + 1; j++) for (let i = c - 1; i <= c + 1; i++) if (i >= 0 && j >= 0 && i < cols && j < rows && grid[j * cols + i]) return true;
            return false;
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Run of Pixels Smoothed Along Itself, Then Set on the Form's Edge
    // ------------------------------------------------------------
    // Two passes of a moving average, narrowing to nothing at its ends so a line
    // keeps its length; then half a pixel outward, for the rim's pixels lie just
    // inside the form and the pen belongs on the edge the wash runs to.
    function PainterlyNPR__LineCandidates__ProfileSmooth(run, reach) {
        let pts  =  run.map(p => [p[0] + 0.5, p[1] + 0.5]);
        for (let pass = 0; pass < 2; pass++) {
            pts  =  pts.map((_, i) => {
                const h  =  Math.min(reach, i, pts.length - 1 - i);
                let x = 0, y = 0;
                for (let k = i - h; k <= i + h; k++) { x += pts[k][0]; y += pts[k][1]; }
                return [x / (2 * h + 1), y / (2 * h + 1)];
            });
        }
        return pts.map((p, i) => {
            const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
            const tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1;
            const nx = -ty / len, ny = tx / len;
            const outward  =  PainterlyNPR__GeometryBuffers__DepthAt(p[0] + nx * 1.5, p[1] + ny * 1.5) >= PainterlyNPR__GeometryBuffers__DepthAt(p[0] - nx * 1.5, p[1] - ny * 1.5) ? 0.5 : -0.5;
            return [p[0] + nx * outward, p[1] + ny * outward];
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is a Run Straight? Nothing in It Further From Its Chord Than This
    // ------------------------------------------------------------
    function PainterlyNPR__LineCandidates__ProfileStraight(pts, tolerancePx) {
        const a = pts[0], b = pts[pts.length - 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 1) return false;
        for (const p of pts) if (Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / len > tolerancePx) return false;
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pass Part
// -----------------------------------------------------------------------------

    // FUNCTION | A Round Thing's Outline Where No Line Is Drawn: appends its strokes, returns how many runs
    // ------------------------------------------------------------
    // process: 30's Process, handed in so this module need not import the one that
    // imports it. Called last of everything in the Line Candidates pass.
    function PainterlyNPR__LineCandidates__ProfileLines(strokes, pushDebug, process) {
        const amount  =  State.Pen.ProfileLines != null ? State.Pen.ProfileLines : 1;   // <-- A settings object saved before it draws with it
        if (!(amount > 0)) return 0;
        const W = Gpu.Width, H = Gpu.Height, pxPerMm = Gpu.PxPerMm;
        const chains  =  PainterlyNPR__LineCandidates__ProfileChains(PainterlyNPR__ProfileLines__Read(), W, H, Math.max(2, Math.round(TRACE.GapMm * pxPerMm)), TRACE.MinMm * pxPerMm);
        if (!chains.length) return 0;
        const covered   =  PainterlyNPR__LineCandidates__ProfileCover(strokes, W, H, Math.max(2, Math.ceil(TRACE.CoverMm * pxPerMm)));
        const ownLine   =  new Set(Scene.Organics.filter(o => o.Kind !== 'Sketch').map(o => o.ObjectId));   // <-- A pot's outline is its gesture's
        const maxTier   =  PainterlyNPR__TechnicalPens__TierOf(TRACE.MaxPen);
        const reach     =  Math.max(1, Math.round(TRACE.SmoothMm * pxPerMm / 2));
        const minPoints =  TRACE.MinMm * pxPerMm;
        let runs  =  0;
        const flush  =  (run, id) => {
            if (id < 0 || run.length < minPoints) return;
            const object  =  Scene.ObjectById.get(id);
            const pts     =  PainterlyNPR__LineCandidates__ProfileSmooth(run, reach);
            const samples =  pts.map(p => ({ X: p[0], Y: p[1], Depth: PainterlyNPR__GeometryBuffers__DepthAt(p[0], p[1]), Visible: true, Profile: false, Lit: PainterlyNPR__GeometryBuffers__LightAt(p[0], p[1]), ShadowSide: false }));
            const straight  =  PainterlyNPR__LineCandidates__ProfileStraight(pts, TRACE.StraightMm * pxPerMm);
            const mid       =  pts[pts.length >> 1];
            const edge      =  { ObjectId: id, Class: LINE_CLASS, Kind: 'Smooth', Points: straight ? null : pts };
            const tier      =  Math.min(maxTier, PainterlyNPR__TechnicalPens__EdgeTier(edge, object, { Profile: false, Ground: false }).Tier);
            process(edge, strokes, pushDebug, {
                Tested   :  { Samples: samples, ClipA: false, ClipB: false },
                Key      :  `profile:${id}:${Math.round(mid[0] / pxPerMm)}:${Math.round(mid[1] / pxPerMm)}`,   // <-- Where it lies on the sheet, so a line elsewhere never moves its seed
                SkipKeep :  true,
                NoProfile:  true,
                NoEnds   :  true,
                Quiet    :  true,
                Tier     :  tier,
                Alpha    :  PainterlyNPR__LineCandidates__ClassInk(LINE_CLASS) * amount,
                MinMm    :  TRACE.MinMm,
                Source   :  'Profile',
            });
            runs++;
        };
        for (const chain of chains) {
            let run = [], owner = -1;
            for (const p of chain) {
                const id      =  PainterlyNPR__GeometryBuffers__ObjectAt(p[0], p[1]);
                const object  =  id >= 0 ? Scene.ObjectById.get(id) : null;
                const draws   =  object && !NO_LINE_CATEGORIES.has(object.Category) && !NO_LINE_ROLES.has(object.Role) && !ownLine.has(id) && !covered(p[0], p[1]);
                if (!draws || id !== owner) { flush(run, owner); run = []; owner = -1; }
                if (draws) { run.push(p); owner = id; }
            }
            flush(run, owner);
        }
        return runs;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__LineCandidates__ProfileLines,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
