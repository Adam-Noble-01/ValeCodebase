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

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Shader Sources, region Ink Layer
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import {
    PainterlyNPR__GpuResources__Use,
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';

// =============================================================================
// REGION | Ink Compositing - Ink Layer
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fragment Shaders - ink ribbons and debug lines
    // ------------------------------------------------------------
    // A ribbon's coverage integrates to its true width even under a pixel, so a
    // 0.15 mm line reads lighter, never aliased. Premultiplied: crossing strokes
    // build density where they overlap, as ink does.
    const FS_RIBBON = `#version 300 es
        precision highp float;
        in float vAlpha; in float vDry; in float vSide; in float vHalf; in float vExpand;
        out vec4 oInk;
        void main() {
            float dist = abs(vSide) * vExpand;
            float cover = clamp(vHalf + 0.5 - dist, 0.0, 1.0);
            float a = vAlpha * cover;
            oInk = vec4(a, vDry * a, 0.0, a);
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

    // FUNCTION | Pass - Draw the Ribbons Into the Ink Layer
    // ------------------------------------------------------------
    function PainterlyNPR__InkLayer__Run() {
        const gl  =  Gpu.Gl;
        const T   =  Gpu.Targets.Ink;
        gl.bindFramebuffer(gl.FRAMEBUFFER, T.Fbo);
        gl.viewport(0, 0, T.Width, T.Height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!Cpu.RibbonVerts) return;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        PainterlyNPR__GpuResources__Use(Gpu.Programs.Ribbon, { uSize: { v2: [T.Width, T.Height] } });
        gl.bindVertexArray(Gpu.Vaos.Ribbons);
        gl.drawArrays(gl.TRIANGLES, 0, Cpu.RibbonVerts);
        gl.bindVertexArray(null);
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
        PainterlyNPR__InkLayer__Run,
        FS_LINES   as  PainterlyNPR__InkLayer__FS_LINES,
        FS_RIBBON  as  PainterlyNPR__InkLayer__FS_RIBBON,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
