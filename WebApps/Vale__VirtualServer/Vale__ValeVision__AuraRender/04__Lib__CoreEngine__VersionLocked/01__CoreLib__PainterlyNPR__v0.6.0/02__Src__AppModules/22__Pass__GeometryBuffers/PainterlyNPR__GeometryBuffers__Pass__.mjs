/* =============================================================================
   PAINTERLYNPR - PASS | GEOMETRY BUFFERS
   =============================================================================

   FILE       : PainterlyNPR__GeometryBuffers__Pass__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Pass - GeometryBuffers
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The truth buffers: albedo, normals, depth, object and material ids
                and the light, in four targets at once; the navigation preview;
                the readback
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - The truth the drawing is judged against: lines are tested on its depth,
     washes masked by its ids.
   - The CPU lookups (depth, object, light at a sheet pixel) read the copy the
     readback pass takes.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Geometry Buffers
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here. v0.6.0: Preview takes an
                   optional target (the asset factory's proxy pictures)

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Maths__Hex } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import {
    PainterlyNPR__GpuResources__Fullscreen,
    PainterlyNPR__GpuResources__Use,
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__LightAndShadow__Compute,
    PainterlyNPR__LightAndShadow__Sun  as  Sun,
} from '../23__Pass__LightAndShadow/PainterlyNPR__LightAndShadow__Pass__.mjs';
import { PainterlyNPR__InkLayer__INK_FAMILIES as INK_FAMILIES } from '../34__Stroke__InkCompositing/PainterlyNPR__InkLayer__InkFamilies__.mjs';
import { PainterlyNPR__Watercolour__Materials as Materials } from '../52__Wash__LayerStack/PainterlyNPR__Watercolour__Pass__.mjs';
import { PainterlyNPR__Paper__PAPER_PRESETS as PAPER_PRESETS } from '../55__Paper__Model/PainterlyNPR__Paper__Presets__.mjs';
import {
    PainterlyNPR__CameraRig__Compute,
    PainterlyNPR__CameraRig__Camera  as  Camera,
} from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
import { PainterlyNPR__PassViewer__View as View } from '../81__Hud__PassViewer/PainterlyNPR__PassViewer__Views__.mjs';

// =============================================================================
// REGION | Geometry Buffers
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Geometry Buffers
// -----------------------------------------------------------------------------

    // FUNCTION | Pass - the Truth Buffers
    // ------------------------------------------------------------
    function PainterlyNPR__GeometryBuffers__Run() {
        const gl  =  Gpu.Gl;
        const T   =  Gpu.Targets.GBuffer;
        PainterlyNPR__CameraRig__Compute();
        if (!Sun) PainterlyNPR__LightAndShadow__Compute();
        gl.bindFramebuffer(gl.FRAMEBUFFER, T.Fbo);
        gl.viewport(0, 0, T.Width, T.Height);
        gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
        gl.clearBufferfv(gl.COLOR, 1, [0.5, 0.5, 1, 1]);
        gl.clearBufferfv(gl.COLOR, 2, [100000, -1, 0, 1]);
        gl.clearBufferfv(gl.COLOR, 3, [0, 0, 0, 0]);
        gl.clearBufferfv(gl.DEPTH, 0, [1]);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        PainterlyNPR__GpuResources__Use(Gpu.Programs.GBuffer, {
            uShadowMap     :  { t: Gpu.Targets.Shadow.Textures[0] },
            uViewProj      :  { m4: Camera.ViewProj },
            uView          :  { m4: Camera.View },
            uLightViewProj :  { m4: Sun.ViewProj },
            uViewRot       :  { m3: Camera.ViewRot },
            uSunDir        :  { v3: Sun.Dir },
            uCameraPos     :  { v3: Camera.Eye },
            uViewDir       :  { v3: Camera.Forward },
            uOrtho         :  { i: Camera.Ortho ? 1 : 0 },
            uAlbedo        :  { v3a: Materials.Albedo },
        });
        gl.bindVertexArray(Gpu.Vaos.Scene);
        gl.drawArrays(gl.TRIANGLES, 0, Camera.Ortho ? Scene.BeltStart : Scene.VertexCount);
        gl.bindVertexArray(null);
        gl.disable(gl.DEPTH_TEST);
        Cpu.Valid  =  false;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Navigation Preview, Straight to the Sheet
    // ------------------------------------------------------------
    // Or into a target given (v0.6.0): the asset factory's proxy pictures.
    function PainterlyNPR__GeometryBuffers__Preview(target) {
        const T  =  Gpu.Targets.GBuffer;
        PainterlyNPR__GpuResources__Fullscreen(target || null, Gpu.Programs.Preview, {
            uAlbedo :  { t: T.Textures[0] },
            uNormal :  { t: T.Textures[1] },
            uData   :  { t: T.Textures[2] },
            uPaper  :  { v3: PainterlyNPR__Maths__Hex(PAPER_PRESETS[State.Paper.Preset].Tone) },
            uInk    :  { v3: PainterlyNPR__Maths__Hex(INK_FAMILIES[State.InkFamily].Colour) },
        });
        if (!target) View.Showing = 'Preview';
    }
    // ------------------------------------------------------------


    // FUNCTION | Pass - Read the Truth Data Back to the CPU
    // ------------------------------------------------------------
    // Line visibility, organic outlines, hover picking and point anchoring all
    // read it. One RGBA32F read per camera; a style change reuses it.
    function PainterlyNPR__GeometryBuffers__Readback() {
        const gl  =  Gpu.Gl;
        const T   =  Gpu.Targets.GBuffer;
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.Fbo);
        gl.readBuffer(gl.COLOR_ATTACHMENT2);
        gl.readPixels(0, 0, T.Width, T.Height, gl.RGBA, gl.FLOAT, Cpu.Geo);
        gl.readBuffer(gl.COLOR_ATTACHMENT0);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        Cpu.Valid  =  true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Truth Lookups on the CPU
    // ------------------------------------------------------------
    function PainterlyNPR__GeometryBuffers__Index(x, y) {
        const xi  =  Math.floor(x), yi = Math.floor(y);
        if (xi < 0 || yi < 0 || xi >= Gpu.Width || yi >= Gpu.Height) return -1;
        return (yi * Gpu.Width + xi) * 4;
    }

    function PainterlyNPR__GeometryBuffers__DepthAt(x, y) {
        const i  =  PainterlyNPR__GeometryBuffers__Index(x, y);
        return i < 0 ? 100000 : Cpu.Geo[i];
    }

    function PainterlyNPR__GeometryBuffers__ObjectAt(x, y) {
        const i  =  PainterlyNPR__GeometryBuffers__Index(x, y);
        return i < 0 ? -1 : Math.round(Cpu.Geo[i + 1]);
    }

    function PainterlyNPR__GeometryBuffers__LightAt(x, y) {
        const i  =  PainterlyNPR__GeometryBuffers__Index(x, y);
        return i < 0 ? 1 : Cpu.Geo[i + 3];
    }

    function PainterlyNPR__GeometryBuffers__MaxDepth3(x, y) {
        const xi  =  Math.floor(x), yi = Math.floor(y);
        let best  =  0;
        for (let dy = -1; dy <= 1; dy++) {
            const yy  =  yi + dy;
            if (yy < 0 || yy >= Gpu.Height) { best = 100000; continue; }
            for (let dx = -1; dx <= 1; dx++) {
                const xx  =  xi + dx;
                if (xx < 0 || xx >= Gpu.Width) { best = 100000; continue; }
                const d  =  Cpu.Geo[(yy * Gpu.Width + xx) * 4];
                if (d > best) best = d;
            }
        }
        return best;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__GeometryBuffers__DepthAt,
        PainterlyNPR__GeometryBuffers__Index,
        PainterlyNPR__GeometryBuffers__LightAt,
        PainterlyNPR__GeometryBuffers__MaxDepth3,
        PainterlyNPR__GeometryBuffers__ObjectAt,
        PainterlyNPR__GeometryBuffers__Preview,
        PainterlyNPR__GeometryBuffers__Readback,
        PainterlyNPR__GeometryBuffers__Run,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
