/* =============================================================================
   PAINTERLYNPR - PASS | LIGHT AND SHADOW
   =============================================================================

   FILE       : PainterlyNPR__LightAndShadow__Pass__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Pass - LightAndShadow
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The sun: its direction from the state, its shadow camera, and the
                shadow map
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Light here is a decision about where the shadow glaze goes, not a lighting
     simulation.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Shader Sources, region Light and Shadow
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__DEG as DEG } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__Maths__LookAt,
    PainterlyNPR__Maths__Multiply,
    PainterlyNPR__Maths__Ortho,
    PainterlyNPR__Maths__V3Add    as  V3Add,
    PainterlyNPR__Maths__V3Scale  as  V3Scale,
} from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import {
    PainterlyNPR__GpuResources__Use,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';

// =============================================================================
// REGION | Light And Shadow
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Shader Sources
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fragment Shader - the shadow map writes depth only
    // ------------------------------------------------------------
    const FS_SHADOW = `#version 300 es
        precision mediump float;
        void main() {}`;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Light and Shadow
// -----------------------------------------------------------------------------

    // MODULE STATE | The Sun
    // ------------------------------------------------------------
    let Sun  =  null;
    // ------------------------------------------------------------


    // FUNCTION | Compute the Sun's Direction and Shadow Camera
    // ------------------------------------------------------------
    function PainterlyNPR__LightAndShadow__Compute() {
        const az   =  State.Sun.Azimuth * DEG;
        const alt  =  State.Sun.Altitude * DEG;
        const dir  =  [Math.sin(az) * Math.cos(alt), Math.sin(alt), Math.cos(az) * Math.cos(alt)];
        const centre  =  [0, 2.5, 1.5];                                      // <-- The garden inside the hedges, fence to the trees behind
        const eye     =  V3Add(centre, V3Scale(dir, 60));
        const view    =  PainterlyNPR__Maths__LookAt(eye, centre, Math.abs(dir[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0]);
        const proj    =  PainterlyNPR__Maths__Ortho(-17, 17, -17, 17, 1, 130);
        Sun  =  { Dir: dir, ViewProj: PainterlyNPR__Maths__Multiply(proj, view) };
        return Sun;
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - the Sun Shadow Map
    // ------------------------------------------------------------
    function PainterlyNPR__LightAndShadow__Run() {
        const gl  =  Gpu.Gl;
        PainterlyNPR__LightAndShadow__Compute();
        gl.bindFramebuffer(gl.FRAMEBUFFER, Gpu.Targets.Shadow.Fbo);
        gl.viewport(0, 0, Gpu.ShadowSize, Gpu.ShadowSize);
        gl.clearDepth(1);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1.5, 3.0);
        PainterlyNPR__GpuResources__Use(Gpu.Programs.Shadow, { uViewProj: { m4: Sun.ViewProj }, uView: { m4: Sun.ViewProj }, uLightViewProj: { m4: Sun.ViewProj } });
        gl.bindVertexArray(Gpu.Vaos.Scene);
        gl.drawArrays(gl.TRIANGLES, 0, Scene.CasterCount);
        gl.bindVertexArray(null);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.disable(gl.DEPTH_TEST);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__LightAndShadow__Compute,
        PainterlyNPR__LightAndShadow__Run,
        FS_SHADOW  as  PainterlyNPR__LightAndShadow__FS_SHADOW,
        Sun        as  PainterlyNPR__LightAndShadow__Sun,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
