/* =============================================================================
   PAINTERLYNPR - LINE | VISIBILITY
   =============================================================================

   FILE       : PainterlyNPR__LineCandidates__Visibility__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Line - Visibility
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Whether a line is seen: each projected point tested against the
                truth buffers, a line split where it is lost and found - or let
                run out past the paint
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Sampled against the depth buffer (the farthest of a 3x3 neighbourhood), not
     solved exactly: a line can peek a pixel past an occluder.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Line Candidates
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : v0.8.0 - SplitByPresence can mark the points Lost in light
                   would take (LitLost) instead of dropping them: a visible line
                   keeps its base pen and loses only a heavier one

   ============================================================================= */

import {
    PainterlyNPR__Maths__Clamp       as  Clamp,
    PainterlyNPR__Maths__Lerp        as  Lerp,
    PainterlyNPR__Maths__SmoothStep  as  SmoothStep,
    PainterlyNPR__Maths__V3Lerp      as  V3Lerp,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__SeededRandom__HashUnit,
    PainterlyNPR__SeededRandom__Noise1,
} from '../03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
import { PainterlyNPR__GpuResources__Gpu as Gpu } from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__GeometryBuffers__DepthAt,
    PainterlyNPR__GeometryBuffers__LightAt,
    PainterlyNPR__GeometryBuffers__MaxDepth3,
    PainterlyNPR__GeometryBuffers__ObjectAt,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import {
    PainterlyNPR__DrawingDiscipline__LINE_CLASS_FADE  as  LINE_CLASS_FADE,
    PainterlyNPR__DrawingDiscipline__LINE_CLASS_LOST  as  LINE_CLASS_LOST,
} from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import {
    PainterlyNPR__ArtDirection__FieldAt,
    PainterlyNPR__ArtDirection__RunOutAt,
    PainterlyNPR__ArtDirection__RunOutDistance,
    PainterlyNPR__ArtDirection__RUN_CLASS_REACH  as  RUN_CLASS_REACH,
    PainterlyNPR__ArtDirection__RunOut           as  RunOut,
} from '../66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__Field__.mjs';
import {
    PainterlyNPR__CameraRig__Project,
    PainterlyNPR__CameraRig__Camera  as  Camera,
} from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Visibility
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Line Candidates
// -----------------------------------------------------------------------------

    // FUNCTION | Test One Projected Point Against the Truth Buffers
    // ------------------------------------------------------------
    // A point is visible when nothing in the depth buffer lies nearer than it by
    // more than a tolerance: the farthest of a 3x3 neighbourhood is compared, so a
    // point on a silhouette sees past it, and coplanar authored lines are held on
    // their face by the tolerance, never drawn always-on-top. It also asks whether
    // a much farther surface lies to either side: a PROFILE line. A mark laid on a
    // surface (material indication) names its object instead, and is visible only
    // where that object is what the truth buffer shows - never over a plant.
    function PainterlyNPR__LineCandidates__TestPoint(p, nx, ny, objectId) {
        let visible = false, profile = false, lit = 0.5, shadowSide = false;
        if (p.X >= 0 && p.Y >= 0 && p.X < Gpu.Width && p.Y < Gpu.Height && p.Depth > 0) {
            if (objectId != null) {
                visible  =  PainterlyNPR__GeometryBuffers__ObjectAt(p.X, p.Y) === objectId && p.Depth <= PainterlyNPR__GeometryBuffers__DepthAt(p.X, p.Y) + 0.05 + p.Depth * 0.004;
            } else {
                visible  =  p.Depth <= PainterlyNPR__GeometryBuffers__MaxDepth3(p.X, p.Y) + 0.02 + p.Depth * 0.003;
                if (visible) {
                    // What lies to either side: a much farther surface (a profile), and
                    // how lit each near side is - lines between lit planes are lost
                    // first, lines with shade on one side carry the weight
                    const side  =  2.5 * Gpu.Scale;
                    const x1 = p.X + nx * side, y1 = p.Y + ny * side, x2 = p.X - nx * side, y2 = p.Y - ny * side;
                    const far1  =  PainterlyNPR__GeometryBuffers__DepthAt(x1, y1) > p.Depth * 1.12 + 0.25;
                    const far2  =  PainterlyNPR__GeometryBuffers__DepthAt(x2, y2) > p.Depth * 1.12 + 0.25;
                    const l1    =  PainterlyNPR__GeometryBuffers__LightAt(x1, y1);
                    const l2    =  PainterlyNPR__GeometryBuffers__LightAt(x2, y2);
                    profile     =  far1 || far2;
                    lit         =  far1 && far2 ? 0.5 : (far1 ? l2 : (far2 ? l1 : (l1 + l2) * 0.5));
                    shadowSide  =  (!far1 && l1 < 0.12 && (far2 || l2 >= 0.25)) || (!far2 && l2 < 0.12 && (far1 || l1 >= 0.25));
                }
            }
        }
        return { X: p.X, Y: p.Y, Depth: p.Depth, Visible: visible, Profile: profile, Lit: lit, ShadowSide: shadowSide };
    }
    // ------------------------------------------------------------


    // FUNCTION | Visibility - sample a line against the depth buffer
    // ------------------------------------------------------------
    // A straight edge is clipped to the near plane and sampled every 1.25 px. A
    // curve (Points: a path's edge) is sampled segment by segment, so its visible
    // runs become single flowing strokes, never a chain of short straight ones.
    function PainterlyNPR__LineCandidates__Visibility(edge, objectId) {
        if (edge.Points) {
            const pts      =  edge.Points;
            const samples  =  [];
            for (let s = 0; s < pts.length - 1; s++) {
                const pa     =  PainterlyNPR__CameraRig__Project(pts[s]);
                const pb     =  PainterlyNPR__CameraRig__Project(pts[s + 1]);
                const lenPx  =  Math.hypot(pb.X - pa.X, pb.Y - pa.Y);
                if (pa.Depth < 0.2 || pb.Depth < 0.2 || !(lenPx < 1e5)) {
                    samples.push({ X: pb.X, Y: pb.Y, Depth: pb.Depth, Visible: false, Profile: false });
                    continue;
                }
                const n   =  Math.max(1, Math.ceil(lenPx / 1.25));
                const nx  =  lenPx > 0 ? -(pb.Y - pa.Y) / lenPx : 0, ny = lenPx > 0 ? (pb.X - pa.X) / lenPx : 0;
                for (let i = s === 0 ? 0 : 1; i <= n; i++) {
                    const p  =  i === 0 ? pa : (i === n ? pb : PainterlyNPR__CameraRig__Project(V3Lerp(pts[s], pts[s + 1], i / n)));
                    samples.push(PainterlyNPR__LineCandidates__TestPoint(p, nx, ny, objectId));
                }
            }
            return samples.length >= 2 ? { Samples: samples, ClipA: false, ClipB: false } : null;
        }
        let A = edge.A, B = edge.B, clipA = false, clipB = false;
        const near  =  0.2;
        const dA  =  -(Camera.View[2] * A[0] + Camera.View[6] * A[1] + Camera.View[10] * A[2] + Camera.View[14]);
        const dB  =  -(Camera.View[2] * B[0] + Camera.View[6] * B[1] + Camera.View[10] * B[2] + Camera.View[14]);
        if (dA < near && dB < near) return null;
        if (dA < near) { A = V3Lerp(A, B, (near - dA) / (dB - dA)); clipA = true; }
        else if (dB < near) { B = V3Lerp(B, A, (near - dB) / (dA - dB)); clipB = true; }
        const pa  =  PainterlyNPR__CameraRig__Project(A);
        const pb  =  PainterlyNPR__CameraRig__Project(B);
        const lenPx  =  Math.hypot(pb.X - pa.X, pb.Y - pa.Y);
        if (lenPx < 1) return null;
        const n     =  Math.max(2, Math.ceil(lenPx / 1.25));
        const nx    =  -(pb.Y - pa.Y) / lenPx, ny = (pb.X - pa.X) / lenPx;
        const samples  =  new Array(n + 1);
        for (let i = 0; i <= n; i++) samples[i] = PainterlyNPR__LineCandidates__TestPoint(PainterlyNPR__CameraRig__Project(V3Lerp(A, B, i / n)), nx, ny, objectId);
        return { Samples: samples, ClipA: clipA, ClipB: clipB };
    }
    // ------------------------------------------------------------


    // FUNCTION | Split Points by Presence - lost and found edges
    // ------------------------------------------------------------
    // Each point survives only where the field's presence clears its class's
    // threshold, jittered along the line so the loss is irregular: lines break up
    // as they approach the paper, rather than stopping at a contour. A Line
    // Control point's break-up raises the threshold and the jitter; Lost in light
    // raises it where the planes either side are lit - the manifest's lines that
    // are "implied only by tonal differences" - least for primary profiles.
    // A caller that lets its lines run out passes runOut (its object, if known);
    // where a Line Run-out point reaches, the split goes the longer way round.
    // markLost (v0.8.0): a point Lost in light would take is kept - presence alone
    // decides - and marked LitLost, so the caller draws it with the base pen.
    function PainterlyNPR__LineCandidates__SplitByPresence(points, lineClass, seed, spacingMm, lostInLight, runOut, markLost) {
        if (runOut && lineClass <= RunOut.MaxClass) return PainterlyNPR__LineCandidates__SplitWithRunOut(points, lineClass, seed, spacingMm, lostInLight, runOut, markLost);
        const out  =  [];
        let run    =  [];
        const threshold  =  LINE_CLASS_FADE[lineClass];
        const lost       =  (lostInLight || 0) * 0.42 * LINE_CLASS_LOST[lineClass];
        for (let i = 0; i < points.length; i++) {
            const p   =  points[i];
            const f   =  PainterlyNPR__ArtDirection__FieldAt(p.X, p.Y);
            const jitter  =  (PainterlyNPR__SeededRandom__Noise1(i * spacingMm / 3.5, seed) - 0.5) * 0.22 * (1 + 2 * f.Breakup);
            const lit     =  p.Lit != null ? lost * SmoothStep(0.35, 0.85, p.Lit) : 0;
            const need    =  threshold + jitter + f.Breakup * 0.55 + (markLost ? 0 : lit);
            if (f.Presence > need) { p.Field = f; if (markLost) p.LitLost = f.Presence <= need + lit; run.push(p); }
            else if (run.length) { out.push(run); run = []; }
        }
        if (run.length) out.push(run);
        return out.filter(r => r.length >= 2);
    }
    // ------------------------------------------------------------


    // FUNCTION | How One Side of a Line Runs Out - its length and its end
    // ------------------------------------------------------------
    // Drawn per line and side (1 past its paint going on, 0 before its paint
    // coming in, 2 a line no paint meets), from the line's own seed and the
    // point's salt, so a line keeps its run-out as the point moves. Unevenness
    // spreads the lengths, short ones the commoner; Ends vary spreads the fade,
    // the taper and the break-up, and now and then lets a line simply stop,
    // ruled off.
    function PainterlyNPR__LineCandidates__RunEnds(node, seed, side) {
        const P     =  node.P;
        const salt  =  (seed ^ node.Salt) >>> 0;
        const h     =  (k) => PainterlyNPR__SeededRandom__HashUnit(k + 8 * side, salt);
        const V     =  Clamp(P.RunVariety, 0, 1);
        const crisp =  h(4) < 0.22 * V;
        return {
            Reach :  Lerp(1, 0.12 + 1.55 * Math.pow(h(0), 1.5), Clamp(P.RunUneven, 0, 1)),
            Fade  :  crisp ? 0 : Clamp(P.RunFade * Lerp(1, 0.25 + 1.5 * h(1), V), 0, 1),
            Taper :  crisp ? 0.06 : Clamp(P.RunTaper * Lerp(1, 0.25 + 1.5 * h(2), V), 0, 1),
            Break :  crisp ? 0 : Clamp(P.RunBreak * Lerp(1, 2 * h(3), V), 0, 1),
            Seed  :  (salt ^ [0x7F4A7C15, 0x9E3779B9, 0x2C1B3C6D][side]) >>> 0,
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Split Points by Presence, Letting Them Run Out Past the Paint
    // ------------------------------------------------------------
    // Found as SplitByPresence finds them - with a point's Reveal counting as
    // presence - and then a point the paper took is kept, where a Line Run-out
    // reaches it, while its distance from its class's paint is within reach:
    // the point's Run-out, the side's draw and the class's share, times the
    // point's pull there - so inside it the line work shows as through a second
    // window, out from the paint, and shortens into its fall-off. Only presence
    // loses a point to the paper, so a gap lost in light or to break-up inside
    // the paint is never filled. A kept point carries RunU, how far through its
    // reach it lies (0 at the paint), and its side's end, for the stroke to fade
    // and taper by; its own break-up opens toward the end. Where no point
    // reaches, every point falls as the plain split lets it.
    const RunScratch  =  { N: 0, S: null, Found: null, Paint: null, Lit: null, Behind: null, Ahead: null, Fields: [], Near: [] };   // <-- Reused call to call: the split never nests

    function PainterlyNPR__LineCandidates__SplitWithRunOut(points, lineClass, seed, spacingMm, lostInLight, ctx, markLost) {
        const n          =  points.length;
        const threshold  =  LINE_CLASS_FADE[lineClass];
        const lost       =  (lostInLight || 0) * 0.42 * LINE_CLASS_LOST[lineClass];
        const pxPerMm    =  Gpu.PxPerMm;
        if (RunScratch.N < n) {
            const N  =  Math.max(n, RunScratch.N * 2, 256);
            Object.assign(RunScratch, { N, S: new Float32Array(N), Found: new Uint8Array(N), Paint: new Uint8Array(N), Lit: new Uint8Array(N), Behind: new Int32Array(N), Ahead: new Int32Array(N) });
        }
        const { S, Found: found, Paint: paint, Lit: litLost, Behind: behind, Ahead: ahead, Fields: fields, Near: near } = RunScratch;   // <-- S: along the line from its first point, sheet millimetres
        let reached   =  false;
        for (let i = 0; i < n; i++) {
            const p   =  points[i];
            S[i]      =  i ? S[i - 1] + Math.hypot(p.X - points[i - 1].X, p.Y - points[i - 1].Y) / pxPerMm : 0;
            const f   =  PainterlyNPR__ArtDirection__FieldAt(p.X, p.Y);
            const jitter  =  (PainterlyNPR__SeededRandom__Noise1(i * spacingMm / 3.5, seed) - 0.5) * 0.22 * (1 + 2 * f.Breakup);
            const lit     =  p.Lit != null ? lost * SmoothStep(0.35, 0.85, p.Lit) : 0;
            const need    =  threshold + jitter + f.Breakup * 0.55 + (markLost ? 0 : lit);
            fields[i] = f; near[i] = null; litLost[i] = 0;
            if (f.Presence > need) { found[i] = 1; paint[i] = 1; litLost[i] = markLost && f.Presence <= need + lit ? 1 : 0; continue; }   // <-- Found as ever: only what the paper took looks for a point
            const r  =  PainterlyNPR__ArtDirection__RunOutAt(p.X, p.Y, lineClass, ctx.ObjectId);
            const presence  =  r ? Math.max(f.Presence, r.F * r.Node.P.RunReveal) : f.Presence;
            found[i]  =  presence > need ? 1 : 0;
            paint[i]  =  presence > threshold + jitter ? 1 : 0;
            near[i]   =  r;
            if (r) reached = true;
        }
        // Which side of its paint each point lies: the nearer painted point behind
        // it (1) or ahead (0); 2 on a line no paint meets
        if (reached) {
            let last  =  -1;
            for (let i = 0; i < n; i++) { if (paint[i]) last = i; behind[i] = last; }
            last  =  -1;
            for (let i = n - 1; i >= 0; i--) { if (paint[i]) last = i; ahead[i] = last; }
        }
        const ends  =  reached ? [] : null;
        const endsFor  =  (r, s) => {
            const k  =  RunOut.Points.indexOf(r.Node) * 3 + s;
            return ends[k] || (ends[k] = PainterlyNPR__LineCandidates__RunEnds(r.Node, seed, s));
        };
        const out  =  [];
        let run    =  [];
        for (let i = 0; i < n; i++) {
            const p  =  points[i];
            let keep  =  found[i] === 1;
            const r  =  near[i];
            if (!keep && r && !paint[i]) {
                const b = behind[i], a = ahead[i];
                const s  =  b < 0 && a < 0 ? 2 : (a < 0 || (b >= 0 && S[i] - S[b] <= S[a] - S[i]) ? 1 : 0);
                const e  =  endsFor(r, s);
                const allowed  =  r.Node.P.RunReachMm * e.Reach * RUN_CLASS_REACH[lineClass] * SmoothStep(0, 0.6, r.F);   // <-- Full over most of the disc, falling away toward its ring
                const u  =  allowed > 0.05 ? PainterlyNPR__ArtDirection__RunOutDistance(p.X, p.Y, lineClass) / allowed : 2;
                if (u < 1) {
                    const brk  =  Math.max(e.Break, fields[i].Breakup);
                    keep  =  !(brk > 0 && PainterlyNPR__SeededRandom__Noise1(S[i] / 2.2, e.Seed) < brk * (0.12 + 0.88 * u) * 0.95);
                    if (keep) { p.RunU = u; p.RunEnd = e; }
                }
            } else if (keep && p.RunEnd) p.RunEnd = null;                     // <-- A point handed through twice (a plant's second pass) is found afresh
            if (keep) { p.Field = fields[i]; if (markLost) p.LitLost = litLost[i] === 1; run.push(p); }
            else if (run.length) { out.push(run); run = []; }
        }
        if (run.length) out.push(run);
        return out.filter(r => r.length >= 2);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Stroke's Run-out - how its ink and width fall along it
    // ------------------------------------------------------------
    // Null unless some of the fragment ran out. Otherwise stops along it, in
    // sheet millimetres from its first point, at most about 48: the ink falls by
    // the side's Fade over the run-out, eased; the width narrows to 15% over the
    // last Taper of it.
    function PainterlyNPR__LineCandidates__RunInk(e, u) { return 1 - e.Fade * SmoothStep(0, 1, u); }
    function PainterlyNPR__LineCandidates__RunWidth(e, u) { return e.Taper > 0.02 ? 1 - 0.85 * SmoothStep(1 - e.Taper, 1, u) : 1; }

    function PainterlyNPR__LineCandidates__RunProfile(frag) {
        let any  =  false;
        for (const p of frag) if (p.RunEnd) { any = true; break; }
        if (!any) return null;
        const n     =  frag.length;
        const step  =  Math.max(1, Math.floor(n / 48));
        const S = [], A = [], W = [];
        let s  =  0;
        for (let i = 0; i < n; i++) {
            if (i) s += Math.hypot(frag[i].X - frag[i - 1].X, frag[i].Y - frag[i - 1].Y) / Gpu.PxPerMm;
            if (i % step && i !== n - 1) continue;
            const e  =  frag[i].RunEnd;
            S.push(s);
            A.push(e ? PainterlyNPR__LineCandidates__RunInk(e, frag[i].RunU) : 1);
            W.push(e ? PainterlyNPR__LineCandidates__RunWidth(e, frag[i].RunU) : 1);
        }
        return { S: Float32Array.from(S), A: Float32Array.from(A), W: Float32Array.from(W) };
    }

    // A run-on's: full over the corner it starts back over (leadMm), then the
    // side's fall across its length
    function PainterlyNPR__LineCandidates__RunOnProfile(leadMm, lenMm, e) {
        const S = [0], A = [1], W = [1];
        for (let k = 0; k <= 12; k++) {
            const u  =  k / 12;
            S.push(leadMm + u * lenMm);
            A.push(PainterlyNPR__LineCandidates__RunInk(e, u));
            W.push(PainterlyNPR__LineCandidates__RunWidth(e, u));
        }
        return { S: Float32Array.from(S), A: Float32Array.from(A), W: Float32Array.from(W) };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__LineCandidates__RunEnds,
        PainterlyNPR__LineCandidates__RunOnProfile,
        PainterlyNPR__LineCandidates__RunProfile,
        PainterlyNPR__LineCandidates__SplitByPresence,
        PainterlyNPR__LineCandidates__Visibility,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
