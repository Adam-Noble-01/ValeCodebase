/* =============================================================================
   PAINTERLYNPR - WASH | LAYER STACK - SHADOW LINES
   =============================================================================

   FILE       : PainterlyNPR__ShadowLines__Pass__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Wash - LayerStack - ShadowLines
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The illustrator's marker accent on a window: a darker stroke on
                the glass beside each jamb and glazing bar, on the side away from
                the sun
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - As wide as the shadow really falls: the reveal's depth times the sun's slant
     across the wall.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Shadow Lines
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import ShadowLinesConfig from './Na__ShadowLines__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Maths__Clamp    as  Clamp,
    PainterlyNPR__Maths__V3Add    as  V3Add,
    PainterlyNPR__Maths__V3Dot    as  V3Dot,
    PainterlyNPR__Maths__V3Scale  as  V3Scale,
    PainterlyNPR__Maths__V3Sub    as  V3Sub,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import {
    PainterlyNPR__GpuResources__PaintPxPerMm,
    PainterlyNPR__GpuResources__Use,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__FloatBuilder } from '../21__System__GpuResources/PainterlyNPR__GpuResources__FloatBuilder__.mjs';
import {
    PainterlyNPR__LightAndShadow__Compute,
    PainterlyNPR__LightAndShadow__Sun  as  Sun,
} from '../23__Pass__LightAndShadow/PainterlyNPR__LightAndShadow__Pass__.mjs';
import {
    PainterlyNPR__CameraRig__Project,
    PainterlyNPR__CameraRig__Camera  as  Camera,
} from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';

// =============================================================================
// REGION | Layer Stack - Shadow Lines
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__ShadowLines__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const SHADOW_LINE_CONFIG  =  PainterlyNPR__ConfigAccess__Section(ShadowLinesConfig, 'PainterlyNPR__ShadowLines__Config', 'ShadowLines', ['ShadowLines']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Shadow Lines
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Shadow Lines
    // ------------------------------------------------------------
    // The illustrator's marker accent on a window - drafting calls it a shade
    // line, the geometry behind it sciagraphy: a straight, slightly darker
    // vertical stroke on the glass beside each jamb of the reveal and each
    // vertical glazing bar, on the side away from the sun. It replaces the
    // diagonal glints, which read as a computer's reflection, not a hand's.
    const SHADOW_LINES  =  SHADOW_LINE_CONFIG.ShadowLines;
    const ShadowLines  =  { Quads: new PainterlyNPR__FloatBuilder(1 << 14), Stats: { Windows: 0, Lines: 0 } };
    // ------------------------------------------------------------


    // FUNCTION | One Window's Shadow Lines
    // ------------------------------------------------------------
    // Each stroke is as wide as the shadow really falls: the depth of the reveal
    // (or of the bar) times the sun's slant across the wall, |L.U| / L.N - so it
    // moves to the other side, and narrows or widens, as the sun goes round. On
    // the sheet it is never thinner than a marker's nib nor wider than a share of
    // its pane. A wall the sun does not reach gets none.
    function PainterlyNPR__ShadowLines__Window(w, strength, out, stats) {
        const L   =  Sun.Dir;
        const ln  =  V3Dot(L, w.N);
        const lu  =  V3Dot(L, w.U);
        if (ln < 0.05 || Math.abs(lu) < 0.02) return;                       // <-- Out of the sun, or the sun square on: no shadow beside the jambs
        const toEye  =  Camera.Ortho ? V3Scale(Camera.Forward, -1) : V3Sub(Camera.Eye, w.Origin);
        if (V3Dot(toEye, w.N) <= 0) return;
        const at  =  (u, v, d) => V3Add(V3Add(V3Add(w.Origin, V3Scale(w.U, u)), V3Scale(w.V, v)), V3Scale(w.N, d || 0));   // <-- d behind the record's plane: a casement's glass lies deeper than its joinery
        const uc  =  (w.U0 + w.U1) / 2, vc = (w.V0 + w.V1) / 2;
        const p0  =  PainterlyNPR__CameraRig__Project(at(uc, vc)), p1 = PainterlyNPR__CameraRig__Project(at(uc + 0.1, vc));
        const mmPerMetre  =  Math.hypot(p1.X - p0.X, p1.Y - p0.Y) / PainterlyNPR__GpuResources__PaintPxPerMm() / 0.1;   // <-- The paint's millimetres: the nib shrinks with the picture (v0.8.15)
        if (!(p0.Depth > 0.2) || !(mmPerMetre > 0.05)) return;
        stats.Windows++;
        const away   =  lu > 0 ? -1 : 1;                                     // <-- The shadow falls toward -U when the sun stands toward +U
        const slant  =  Math.abs(lu) / ln;
        const minM   =  SHADOW_LINES.MinMm / mmPerMetre;
        const put    =  (q, amount) => {
            out.Reserve(6);
            out.Data.set([q.X, q.Y, Clamp(amount, 0, 1), 0, 0, 0], out.Length);
            out.Length += 6;
        };
        // A stroke from u0 to u1 between v0 and v1; a marker lays a touch more ink where it starts, at the top
        const stroke  =  (u0, u1, v0, v1, density, depth) => {
            const a = PainterlyNPR__CameraRig__Project(at(u0, v0, depth)), b = PainterlyNPR__CameraRig__Project(at(u1, v0, depth));
            const c = PainterlyNPR__CameraRig__Project(at(u1, v1, depth)), d = PainterlyNPR__CameraRig__Project(at(u0, v1, depth));
            if (!(a.Depth > 0.2 && b.Depth > 0.2 && c.Depth > 0.2 && d.Depth > 0.2)) return;
            const low = density * strength * 0.47, top = density * strength * 0.54;   // <-- Stored as density / 2
            put(a, low); put(b, low); put(c, top);
            put(a, low); put(c, top); put(d, top);
            stats.Lines++;
        };
        const scale  =  State.Wash.ShadowLineWidth;                          // <-- The Width slider: a broader or finer marker
        const width  =  (depth, pane) => Clamp(Math.max(depth * slant, minM) * scale, 0, pane * SHADOW_LINES.MaxShare * Math.max(1, scale));

        // A modelled casement: the reveal's shadow falls on its frame; then each leaf's
        // sash casts onto its own glass, and each glazing bar from its shaded edge
        if (w.Lights) {
            const g0     =  w.Lights[0];
            const paneC  =  (g0.U1 - g0.U0) / (w.Bars.length / w.Lights.length + 1);
            const jambC  =  away < 0 ? w.U1 : w.U0;
            stroke(jambC, jambC + away * width(w.Reveal, g0.U1 - g0.U0), w.V0, w.V1, SHADOW_LINES.Jamb, 0);
            const ws  =  width(w.Glass.Set, paneC), wbC = width(w.Glass.BarDepth, paneC);
            for (const g of w.Lights) {
                const e  =  away < 0 ? g.U1 : g.U0;
                stroke(e, e + away * ws, g.V0, g.V1, SHADOW_LINES.Jamb, -w.Glass.Set);
            }
            for (const ub of w.Bars) {
                const e  =  ub + away * w.Glass.BarHalf;
                stroke(e, e + away * wbC, g0.V0, g0.V1, SHADOW_LINES.Bar, -w.Glass.Set);
            }
            return;
        }

        // The reveal: the jamb on the sun's side casts onto the glass. A pane found
        // in a project's model (GlbWindows) knows what stands in front beyond each
        // edge, [offset, depth]: the shadow reaches depth x slant - offset onto the
        // glass, the furthest of them; nothing in front casts nothing
        const paneU  =  (w.U1 - w.U0) / (w.Bars.length + 1);
        const jamb   =  away < 0 ? w.U1 : w.U0;
        if (w.Casters) {
            const cast  =  Math.max(0, ...w.Casters[away < 0 ? 1 : 0].map(([offset, depth]) => depth * slant - offset));
            if (cast > 0) stroke(jamb, jamb + away * Clamp(Math.max(cast, minM) * scale, 0, paneU * SHADOW_LINES.MaxShare * Math.max(1, scale)), w.V0, w.V1, SHADOW_LINES.Jamb);
        } else {
            const wj  =  width(w.Reveal, paneU);
            stroke(jamb, jamb + away * wj, w.V0, w.V1, SHADOW_LINES.Jamb);
        }

        // Each vertical glazing bar, from its shaded edge (a found bar its own half width and depth)
        const wb  =  width(SHADOW_LINES.BarDepth, paneU);
        w.Bars.forEach((ub, i) => {
            const bar   =  w.BarCasts ? w.BarCasts[i] : null;
            const edge  =  ub + away * (bar ? bar.Half : SHADOW_LINES.BarHalfWidth);
            stroke(edge, edge + away * (bar ? width(bar.Depth, paneU) : wb), w.V0 + w.Frame, w.V1 - w.Frame, SHADOW_LINES.Bar);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - Shadow Lines
    // ------------------------------------------------------------
    // Every window's strokes into one RGBA8 target (R: density / 2), blended by
    // MAX. The washes lay them over the glass alone, so a plant in front of a
    // window keeps its own wash. Re-runs on its slider, the camera and the sun.
    function PainterlyNPR__ShadowLines__Run() {
        const gl   =  Gpu.Gl;
        const T    =  Gpu.Targets.Marker;
        const out  =  ShadowLines.Quads;
        const stats  =  { Windows: 0, Lines: 0 };
        out.Clear();
        if (!Sun) PainterlyNPR__LightAndShadow__Compute();
        const strength  =  State.Wash.ShadowLines;
        if (strength > 0) for (const w of Scene.Windows) PainterlyNPR__ShadowLines__Window(w, strength, out, stats);
        ShadowLines.Stats  =  stats;
        gl.bindFramebuffer(gl.FRAMEBUFFER, T.Fbo);
        gl.viewport(0, 0, T.Width, T.Height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!out.Length) return;
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.MAX);
        gl.blendFunc(gl.ONE, gl.ONE);
        PainterlyNPR__GpuResources__Use(Gpu.Programs.Lines, { uSize: { v2: [T.Width, T.Height] } });
        gl.bindVertexArray(Gpu.Vaos.Dabs);
        gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Dabs);
        gl.bufferData(gl.ARRAY_BUFFER, out.Data.subarray(0, out.Length), gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, out.Length / 6);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
        gl.blendEquation(gl.FUNC_ADD);
        gl.disable(gl.BLEND);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__ShadowLines__Run,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
