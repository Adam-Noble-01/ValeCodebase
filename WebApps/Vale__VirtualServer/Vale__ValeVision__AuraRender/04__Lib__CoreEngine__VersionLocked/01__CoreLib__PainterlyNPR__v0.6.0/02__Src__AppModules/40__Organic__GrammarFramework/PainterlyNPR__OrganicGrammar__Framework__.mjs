/* =============================================================================
   PAINTERLYNPR - ORGANIC | GRAMMAR FRAMEWORK
   =============================================================================

   FILE       : PainterlyNPR__OrganicGrammar__Framework__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Organic - GrammarFramework
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : What every plant's grammar is made of: a mass projected to the
                sheet, marks in a kind's rhythm, contours traced on the truth
                buffers, runs, decoration and hand-length strokes
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Plants are drawn by stroke grammar, never by their mesh edges.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Organic Grammars
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Maths__Clamp       as  Clamp,
    PainterlyNPR__Maths__Lerp        as  Lerp,
    PainterlyNPR__Maths__SmoothStep  as  SmoothStep,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__DeriveSeed,
    PainterlyNPR__SeededRandom__HashUnit,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__LineCandidates__RunProfile,
    PainterlyNPR__LineCandidates__SplitByPresence,
} from '../31__Line__Visibility/PainterlyNPR__LineCandidates__Visibility__.mjs';
import {
    PainterlyNPR__ArtDirection__RUN_OUT_UNAIMED  as  RUN_OUT_UNAIMED,
    PainterlyNPR__ArtDirection__RunOut           as  RunOut,
} from '../66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__Field__.mjs';
import {
    PainterlyNPR__CameraRig__Project,
    PainterlyNPR__CameraRig__Camera  as  Camera,
} from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Grammar Framework
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Organic Grammars
// -----------------------------------------------------------------------------

    // FUNCTION | Project a Foliage Mass to a Circle on the Sheet
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__Circle(mass) {
        const p  =  PainterlyNPR__CameraRig__Project(mass.C);
        const R  =  Camera.Ortho ? mass.R * Camera.PxPerMetre : mass.R * Camera.FocalPx / Math.max(p.Depth, 0.1);
        return { X: p.X, Y: p.Y, R: R, Depth: p.Depth };
    }
    // ------------------------------------------------------------


    // FUNCTION | Hand Organic Points On as Strokes, Lost Where the Paper Takes Them
    // ------------------------------------------------------------
    // Every plant stroke comes through here: lost and found by presence, weighed
    // and loosened by the Pen's vegetation sliders, and carrying the field's line
    // control - so a Sketchy Line Control point makes a tree sketchier too, and a
    // Detail Suppression point strips its leaves before its outline.
    // While a plant is drawn: its looseness before the field (Base), so each
    // stroke can add the field's looseness where it falls - a Line Control point
    // on one end of a long hedge loosens that end, not nothing
    const OrganicLocal  =  { Base: null, Ceiling: 1 };

    function PainterlyNPR__OrganicGrammar__Emit(points, strokes, options, pushDebug) {
        if (points.length < 2) return;
        const pen        =  State.Pen;
        const runOut     =  RunOut.Points.length ? RUN_OUT_UNAIMED : null;       // <-- A plant's lines run out by their class, as any line's
        const fragments  =  PainterlyNPR__LineCandidates__SplitByPresence(points, options.Class, options.Seed, options.SpacingMm || 0.5, 0, runOut);
        for (const frag of fragments) {
            const mid  =  frag[frag.length >> 1].Field;
            const loose  =  OrganicLocal.Base != null ? Clamp(OrganicLocal.Base + mid.Loose, 0, OrganicLocal.Ceiling) : options.Loose;
            const wild   =  Math.max(0, mid.Wobble - 1), over = Math.max(0, mid.Overdraw - 1);   // <-- Above x1 a point adds; below it scales down, as on any line
            if (mid.Detail < 0 && options.Class >= 2 && PainterlyNPR__SeededRandom__HashUnit(strokes.length, options.Seed) < -mid.Detail * (options.Class === 3 ? 1 : 0.6)) continue;
            for (let i = 0; i < frag.length - 1; i++) pushDebug(frag[i], frag[i + 1], [0.42, 0.56, 0.36, 0.95]);
            strokes.push({
                Points   :  frag.map(p => [p.X, p.Y]),
                Straight :  false,
                WidthMm  :  options.WidthMm * mid.Weight * (options.Profile ? mid.Emphasis : 1) * pen.VegWeight,   // <-- A plant's outline is its profile: Emphasis weights it
                Alpha    :  options.Alpha,
                Dry      :  0.3 + 0.5 * loose,
                Loose    :  loose,
                OverdrawMinMm :  over > 0 ? 1.2 : undefined,                     // <-- Only where a point asks for more: with none, every stroke is as it was
                Seed     :  PainterlyNPR__SeededRandom__DeriveSeed(options.Seed, 'frag:' + strokes.length),
                TaperIn  :  options.TaperIn,
                TaperOut :  options.TaperOut,
                Wobble   :  (options.Wobble != null ? options.Wobble : 0.5) * pen.VegWild,
                Local    :  { Wobble: mid.Wobble, Pressure: mid.Pressure, Overdraw: mid.Overdraw, Breakup: mid.Breakup, WobbleAddMm: 0.16 * wild, OverdrawAdd: 0.45 * over, PressureAdd: 0.3 * Math.max(0, mid.Pressure - 1) },
                Run      :  runOut ? PainterlyNPR__LineCandidates__RunProfile(frag) : null,
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | One Interior Mark in a Kind's Rhythm
    // ------------------------------------------------------------
    // Arcs: a small curve on the flow round the mass - leaf clusters. Spikes: an
    // upright flick fanning out from the crown - lavender. Ticks: a short stroke
    // drooping outward - a conifer's layered sprays. Loops: a run of cursive
    // loops along the flow - foliage scribbled. Scallops: two to four little cups,
    // a clump's underside. Stipple: a dot. Size scales the mark; returns its
    // points and its own tapers, in millimetres.
    function PainterlyNPR__OrganicGrammar__Mark(kind, x, y, circle, centre, rng, pxPerMm, size) {
        const k    =  size || 1;
        const pts  =  [];
        if (kind === 'Spikes') {
            const lenPx  =  rng.Range(1.2, 2.6) * pxPerMm * k;
            const lean   =  Clamp((x - circle.X) / circle.R, -1, 1);
            const ang    =  Math.PI / 2 - 0.55 * lean + rng.Spread(0.12);
            const ux = Math.cos(ang), uy = Math.sin(ang);
            const bend   =  rng.Spread(0.15) * lenPx;
            for (let j = 0; j <= 5; j++) {
                const t  =  j / 5;
                pts.push({ X: x + ux * t * lenPx - uy * bend * t * t, Y: y + uy * t * lenPx + ux * bend * t * t });
            }
            return { Points: pts, TaperIn: 0.05, TaperOut: 0.55 * lenPx / pxPerMm, LenMm: lenPx / pxPerMm };
        }
        if (kind === 'Ticks') {
            const side   =  x >= circle.X ? 1 : -1;
            const lenPx  =  rng.Range(0.8, 1.7) * pxPerMm * k;
            const ang    =  side > 0 ? -0.55 + rng.Spread(0.2) : Math.PI + 0.55 + rng.Spread(0.2);
            const ux = Math.cos(ang), uy = Math.sin(ang);
            for (let j = 0; j <= 4; j++) {
                const t  =  j / 4;
                pts.push({ X: x + ux * t * lenPx, Y: y + uy * t * lenPx - 0.25 * lenPx * t * t });
            }
            return { Points: pts, TaperIn: 0.1, TaperOut: 0.5 * lenPx / pxPerMm, LenMm: lenPx / pxPerMm };
        }
        if (kind === 'Stipple') {
            const r  =  0.13 * pxPerMm * k, a = rng.Range(0, Math.PI);
            pts.push({ X: x - Math.cos(a) * r, Y: y - Math.sin(a) * r }, { X: x + Math.cos(a) * r, Y: y + Math.sin(a) * r });
            return { Points: pts, TaperIn: 0.02, TaperOut: 0.02, LenMm: 0.26 * k };
        }
        if (kind === 'Scallops') {
            // Cups along a near-level line, bulging up toward the light above them
            const cups  =  rng.IntRange(2, 4);
            const w     =  rng.Range(0.55, 0.95) * pxPerMm * k;
            const tilt  =  rng.Spread(0.35);
            const ux = Math.cos(tilt), uy = Math.sin(tilt);
            for (let c = 0; c < cups; c++) {
                for (let j = c ? 1 : 0; j <= 5; j++) {
                    const t  =  j / 5;
                    const along  =  (c + t - cups / 2) * w;
                    const b      =  0.42 * w * Math.sin(Math.PI * t);
                    pts.push({ X: x + ux * along - uy * b, Y: y + uy * along + ux * b });
                }
            }
            return { Points: pts, TaperIn: 0.15, TaperOut: 0.4, LenMm: cups * w * 1.3 / pxPerMm };
        }
        const lenPx  =  (kind === 'Loops' ? rng.Range(1.6, 3.0) : rng.Range(1.0, 2.3)) * pxPerMm * k;
        const ang    =  Math.atan2(y - centre[1], x - centre[0]) + Math.PI / 2 + rng.Spread(0.55);
        const ux = Math.cos(ang), uy = Math.sin(ang);
        const out    =  [Math.cos(ang - Math.PI / 2), Math.sin(ang - Math.PI / 2)];
        if (kind === 'Loops') {
            // A prolate cycloid: moving on while it circles, so it loops - cursive e's
            const loops  =  rng.IntRange(2, 3);
            const r      =  lenPx / (loops * 2.2);
            const n      =  loops * 10;
            for (let j = 0; j <= n; j++) {
                const t      =  j / n;
                const phase  =  t * loops * Math.PI * 2;
                const along  =  t * lenPx - 1.25 * r * Math.sin(phase) - lenPx / 2;
                const across =  r * (1 - Math.cos(phase));
                pts.push({ X: x + ux * along - out[0] * across, Y: y + uy * along - out[1] * across });
            }
            return { Points: pts, TaperIn: 0.2, TaperOut: 0.6, LenMm: lenPx * 1.8 / pxPerMm };
        }
        const bend   =  lenPx * rng.Range(0.18, 0.38);
        for (let j = 0; j <= 6; j++) {
            const t  =  j / 6;
            const b  =  bend * (1 - Math.pow(2 * t - 1, 2));
            pts.push({ X: x + ux * (t - 0.5) * lenPx - out[0] * b, Y: y + uy * (t - 0.5) * lenPx - out[1] * b });
        }
        return { Points: pts, TaperIn: lenPx / pxPerMm * 0.3, TaperOut: lenPx / pxPerMm * 0.45, LenMm: lenPx / pxPerMm };
    }
    // ------------------------------------------------------------


    // FUNCTION | Trace Where a Region Ends - marching squares over the truth buffers
    // ------------------------------------------------------------
    // The region is whatever inside(x, y) says, sampled every step pixels across
    // the box; the result is its boundary as polylines in sheet pixels, smoothed
    // once, with Out (+1 or -1) saying which side of the line is outside. Used
    // for a plant's true silhouette (its object in the ID buffer) and its shade
    // (its object, in shadow) - never the circles it was built from.
    function PainterlyNPR__OrganicGrammar__Contours(box, step, inside) {
        const x0 = box[0], y0 = box[1];
        const nx = Math.max(2, Math.ceil((box[2] - x0) / step) + 1), ny = Math.max(2, Math.ceil((box[3] - y0) / step) + 1);
        const v  =  new Uint8Array(nx * ny);
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = inside(x0 + i * step, y0 + j * step) ? 1 : 0;
        const links = new Map(), where = new Map();
        const at    =  (i, j, h) => {                                        // <-- A crossing on a cell edge: h for the edge along x
            const k  =  ((j * nx + i) << 1) | (h ? 1 : 0);
            if (!where.has(k)) where.set(k, h ? [x0 + (i + 0.5) * step, y0 + j * step] : [x0 + i * step, y0 + (j + 0.5) * step]);
            return k;
        };
        const link  =  (a, b) => {
            if (!links.has(a)) links.set(a, []);
            if (!links.has(b)) links.set(b, []);
            links.get(a).push(b);
            links.get(b).push(a);
        };
        for (let j = 0; j < ny - 1; j++) {
            for (let i = 0; i < nx - 1; i++) {
                const a = v[j * nx + i], b = v[j * nx + i + 1], c = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
                if (a === b && b === c && c === d) continue;
                const e  =  [];                                                  // <-- Crossings in order round the cell: bottom, right, top, left
                if (a !== b) e.push(at(i, j, true));
                if (b !== c) e.push(at(i + 1, j, false));
                if (d !== c) e.push(at(i, j + 1, true));
                if (a !== d) e.push(at(i, j, false));
                if (e.length === 2) link(e[0], e[1]);
                else if (a) { link(e[0], e[3]); link(e[1], e[2]); }             // <-- A saddle: the inside corners kept apart
                else { link(e[0], e[1]); link(e[2], e[3]); }
            }
        }
        const used  =  new Set();
        const walk  =  (start) => {
            const keys  =  [start];
            used.add(start);
            let cur  =  start;
            for (;;) {
                const next  =  links.get(cur).find(n => !used.has(n));
                if (next == null) break;
                keys.push(next);
                used.add(next);
                cur  =  next;
            }
            return keys;
        };
        const lines  =  [];
        for (const [k, n] of links) if (n.length === 1 && !used.has(k)) lines.push({ Keys: walk(k), Closed: false });
        for (const k of links.keys()) if (!used.has(k)) lines.push({ Keys: walk(k), Closed: true });
        return lines.filter(l => l.Keys.length >= 3).map(({ Keys, Closed }) => {
            const raw  =  Keys.map(k => where.get(k));
            const n    =  raw.length;
            const pts  =  raw.map((p, i) => {
                const a = raw[Closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = raw[Closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
                return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
            });
            let votes  =  0;                                                     // <-- Which side is out: the left normal, tested at a few points
            const tests  =  Math.min(9, n - 1);
            for (let s = 0; s < tests; s++) {
                const i  =  Math.floor((s + 0.5) * (n - 1) / tests);
                const p = pts[i], q = pts[i + 1];
                const len  =  Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
                votes  +=  inside(p[0] - (q[1] - p[1]) / len * step, p[1] + (q[0] - p[0]) / len * step) ? -1 : 1;
            }
            return { Points: pts, Closed: Closed, Out: votes >= 0 ? 1 : -1 };
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Contour's Points With Their Outward Normals
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__Frame(contour) {
        const pts = contour.Points, n = pts.length, out = contour.Out;
        return pts.map((p, i) => {
            const a = pts[contour.Closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[contour.Closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
            const tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1;
            return { X: p[0], Y: p[1], NX: -ty / len * out, NY: tx / len * out, Light: 0.5 };
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Runs of a Contour That Pass a Test - a closed loop's ends joined
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__Runs(points, closed, test) {
        const runs  =  [];
        let run     =  [];
        for (const p of points) {
            if (test(p)) run.push(p);
            else if (run.length) { runs.push(run); run = []; }
        }
        if (run.length) {
            if (closed && runs.length && test(points[0])) runs[0] = run.concat(runs[0]);
            else runs.push(run);
        }
        if (closed && runs.length === 1 && runs[0].length === points.length) runs[0] = runs[0].concat([runs[0][0]]);   // <-- A whole loop closes on itself
        return runs.filter(r => r.length >= 3);
    }
    // ------------------------------------------------------------


    // FUNCTION | Decorate a Run of Outline - leaf clumps, needles, or a loose line
    // ------------------------------------------------------------
    // Clumps are arcs bulging out, each its own size, meeting in a cusp - the
    // illustrator's cloud of leaf masses; needles are points thrown outward; a
    // loose line follows the silhouette and lets the pen's wobble do the rest.
    // The bumps straddle the wash's edge rather than sit outside it. Offset moves
    // a searching pass off the first.
    function PainterlyNPR__OrganicGrammar__Decorate(run, edge, clump, offset, rng) {
        const S  =  [0];
        for (let i = 1; i < run.length; i++) S.push(S[i - 1] + Math.hypot(run[i].X - run[i - 1].X, run[i].Y - run[i - 1].Y));
        const total  =  S[S.length - 1];
        let j  =  0;
        const at  =  (s) => {                                                // <-- Position, normal and light at arc length s
            while (j < S.length - 2 && S[j + 1] < s) j++;
            while (j > 0 && S[j] > s) j--;
            const t  =  Clamp((s - S[j]) / Math.max(S[j + 1] - S[j], 1e-6), 0, 1);
            const a = run[j], b = run[Math.min(j + 1, run.length - 1)];
            const nx = Lerp(a.NX, b.NX, t), ny = Lerp(a.NY, b.NY, t), nl = Math.hypot(nx, ny) || 1;
            return { X: Lerp(a.X, b.X, t), Y: Lerp(a.Y, b.Y, t), NX: nx / nl, NY: ny / nl, Light: Lerp(a.Light, b.Light, t) };
        };
        const out   =  [];
        const push  =  (p, b) => out.push({ X: p.X + p.NX * (b + offset), Y: p.Y + p.NY * (b + offset), Light: p.Light });
        if (edge === 'Loose') {
            for (let s = 0; s < total; s += 1.2) push(at(s), 0);
            push(at(total), 0);
            return out;
        }
        let s  =  0;
        while (s < total - 1) {
            const w     =  Math.min(total - s, clump * rng.Range(0.6, 1.45));
            const h     =  w * (edge === 'Jagged' ? rng.Range(0.5, 0.9) : rng.Range(0.2, 0.36));
            const base  =  -(edge === 'Jagged' ? 0.25 : 0.35) * h;
            if (edge === 'Jagged') {
                if (!out.length) push(at(s), base);
                push(at(s + w * rng.Range(0.45, 0.65)), base + h);
                push(at(s + w), base);
            } else {
                const n  =  Math.max(3, Math.ceil(w / 1.5));
                for (let k = out.length ? 1 : 0; k <= n; k++) {
                    const t  =  k / n;
                    push(at(s + w * t), base + h * Math.pow(Math.sin(Math.PI * t), 0.8));
                }
            }
            s += w;
        }
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Chop a Decorated Line Into Hand-Length Strokes, Broken Toward the Light
    // ------------------------------------------------------------
    function PainterlyNPR__OrganicGrammar__Chop(line, rng, strokes, pushDebug, o) {
        const pxPerMm  =  Gpu.PxPerMm;
        let i = 0, k = 0;
        while (i < line.length - 1) {
            const lit     =  SmoothStep(0.35, 0.9, line[i].Light);
            const drawPx  =  rng.Range(o.DrawMm[0], o.DrawMm[1]) * (1 - 0.3 * lit) * pxPerMm;
            const gapPx   =  rng.Range(o.GapMm[0], o.GapMm[1]) * (1 + o.LitGap * lit) * pxPerMm;
            const frag    =  [line[i]];
            let len  =  0;
            while (i < line.length - 1 && len < drawPx) { len += Math.hypot(line[i + 1].X - line[i].X, line[i + 1].Y - line[i].Y); i++; frag.push(line[i]); }
            if (frag.length >= 2 && len > 0.5 * pxPerMm) {
                const shade  =  1 - frag[frag.length >> 1].Light;
                PainterlyNPR__OrganicGrammar__Emit(frag.map(p => ({ X: p.X, Y: p.Y })), strokes, { Class: o.Class, Seed: o.Seed + k * 7, WidthMm: o.WidthMm * (1 + o.Shade * shade), Alpha: o.Alpha, Loose: o.Loose, TaperIn: o.TaperIn, TaperOut: o.TaperOut, Wobble: o.Wobble, SpacingMm: 0.35, Profile: o.Profile }, pushDebug);
            }
            k++;
            let gap  =  0;
            while (i < line.length - 1 && gap < gapPx) { gap += Math.hypot(line[i + 1].X - line[i].X, line[i + 1].Y - line[i].Y); i++; }
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
        PainterlyNPR__OrganicGrammar__Chop,
        PainterlyNPR__OrganicGrammar__Circle,
        PainterlyNPR__OrganicGrammar__Contours,
        PainterlyNPR__OrganicGrammar__Decorate,
        PainterlyNPR__OrganicGrammar__Emit,
        PainterlyNPR__OrganicGrammar__Frame,
        PainterlyNPR__OrganicGrammar__Mark,
        PainterlyNPR__OrganicGrammar__Runs,
        OrganicLocal  as  PainterlyNPR__OrganicGrammar__OrganicLocal,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
