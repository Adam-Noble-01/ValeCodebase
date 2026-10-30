/* =============================================================================
   PAINTERLYNPR - STROKE | INK COMPOSITING - INK LAYER
   =============================================================================

   FILE       : PainterlyNPR__InkLayer__Pass__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Stroke - InkCompositing - InkLayer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The ribbons drawn into the ink layer, and the debug lines for the
                Lines view
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Ink is a layer of its own until the compositor lays it on the washes and the
     paper.
   - v0.8.0: two ranges of one ribbon buffer - each stroke once at its technical
     pen into the ink, and every stroke at the base pen into the base buffer
     (Base lines). The ink's B channel carries the pen, for the Pen tiers view.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Shader Sources, region Ink Layer
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : v0.8.0 - the coverage is the exact area of the pixel's
                   square under the line, at every width and angle (the old ramp
                   gave a 0.13 mm line at 5 px/mm 5% too much ink, and diagonals a
                   few per cent either way); the distance is interpolated whole
                   (vDist); the pen in B; the base range drawn into InkBase

   ============================================================================= */

import {
    PainterlyNPR__GpuResources__Use,
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__TechnicalPens__TIER_COUNT as TIER_COUNT } from '../32__Line__ClassAndPriority/PainterlyNPR__TechnicalPens__Tiers__.mjs';

// =============================================================================
// REGION | Ink Compositing - Ink Layer
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fragment Shaders - ink ribbons and debug lines
    // ------------------------------------------------------------
    // A ribbon's coverage is the area of the pixel's square the line covers,
    // exactly, at any angle: the square projected onto the line's normal is a
    // trapezoid (a box at 0 or 90 degrees, a tent at 45), and the line covers
    // its share between distance - half and distance + half. Summed over the
    // pixels the ink is exactly the line's area, so a 0.13 mm line at 300 dpi
    // (1.54 px) carries 1.54 px of ink across it at every angle, and at 5 px/mm
    // (0.65 px) reads lighter - never rounded up to a pixel. The distance is
    // vDist, interpolated whole, so it is exact where a ribbon tapers; the normal
    // is its screen gradient. Premultiplied: crossing strokes build
    // density where they overlap, as ink does. The pen rides with the dry ink
    // (dry + 2 x tier) and is written to B as tier / (pens - 1), for the Pen
    // tiers view.
    const FS_RIBBON = `#version 300 es
        precision highp float;
        in float vAlpha; in float vDry; in float vHalf; in float vDist;
        out vec4 oInk;
        float pixelCdf(float x, float p, float q) {                     // the share of the pixel nearer than x along the normal
            float e = 0.5 * (p + q), m = 0.5 * (p - q);
            if (x <= -e) return 0.0;
            if (x >= e) return 1.0;
            if (x < -m) { float t = x + e; return t * t / (2.0 * p * q); }
            if (x > m) { float t = e - x; return 1.0 - t * t / (2.0 * p * q); }
            return (x + m) / p + q / (2.0 * p);
        }
        void main() {
            float dist = abs(vDist);
            vec2 g = vec2(dFdx(vDist), dFdy(vDist));
            float glen = length(g);
            vec2 n = glen > 1e-6 ? abs(g) / glen : vec2(1.0, 0.0);
            float p = max(n.x, n.y), q = max(min(n.x, n.y), 1e-4);
            float cover = clamp(pixelCdf(vHalf - dist, p, q) - pixelCdf(-vHalf - dist, p, q), 0.0, 1.0);
            float tier = floor((vDry + 0.5) * 0.5);
            float dry = clamp(vDry - 2.0 * tier, 0.0, 1.0);
            float a = vAlpha * cover;
            oInk = vec4(a, dry * a, tier / ${(TIER_COUNT - 1).toFixed(1)} * a, a);
        }`;

    const FS_LINES = `#version 300 es
        precision mediump float;
        in vec4 vColour;
        out vec4 oColour;
        void main() { oColour = vColour; }`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Ink Layer
// -----------------------------------------------------------------------------

    // FUNCTION | Pass - Draw the Ribbons Into the Ink Layer, and the Base Lines
    // ------------------------------------------------------------
    // The buffer's first range is the ink (each stroke at its pen); the second,
    // the same strokes at the base pen, goes to the base buffer.
    function PainterlyNPR__InkLayer__Run() {
        const gl  =  Gpu.Gl;
        const T   =  Gpu.Targets.Ink;
        const B   =  Gpu.Targets.InkBase;
        gl.clearColor(0, 0, 0, 0);
        if (B) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, B.Fbo);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, T.Fbo);
        gl.viewport(0, 0, T.Width, T.Height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!Cpu.RibbonVerts) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); return; }
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        PainterlyNPR__GpuResources__Use(Gpu.Programs.Ribbon, { uSize: { v2: [T.Width, T.Height] } });
        gl.bindVertexArray(Gpu.Vaos.Ribbons);
        gl.drawArrays(gl.TRIANGLES, 0, Cpu.RibbonVerts);
        if (B && Cpu.RibbonBaseVerts) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, B.Fbo);
            gl.viewport(0, 0, B.Width, B.Height);
            gl.drawArrays(gl.TRIANGLES, Cpu.RibbonVerts, Cpu.RibbonBaseVerts);
        }
        gl.bindVertexArray(null);
        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__InkLayer__Run,
        FS_LINES   as  PainterlyNPR__InkLayer__FS_LINES,
        FS_RIBBON  as  PainterlyNPR__InkLayer__FS_RIBBON,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
