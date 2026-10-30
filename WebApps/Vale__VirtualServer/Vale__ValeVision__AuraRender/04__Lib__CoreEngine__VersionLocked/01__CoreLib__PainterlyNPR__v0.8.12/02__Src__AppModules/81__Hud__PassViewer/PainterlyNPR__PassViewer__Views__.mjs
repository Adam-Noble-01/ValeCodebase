/* =============================================================================
   PAINTERLYNPR - HUD | PASS VIEWER
   =============================================================================

   FILE       : PainterlyNPR__PassViewer__Views__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - PassViewer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Every buffer viewable on its own: draw a view into a target or the
                sheet, present it, milestones while refinement runs, and the
                strip's thumbnails
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - View is what the sheet shows: the drawing, or one pass's buffer.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Pass Viewer
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : v0.8.0 - the Base lines view binds the base buffer
                   (Targets.InkBase) to uAux

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Maths__Hex } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__RenderGraph__PASSES as PASSES } from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import {
    PainterlyNPR__GpuResources__CreateTarget,
    PainterlyNPR__GpuResources__Fullscreen,
    PainterlyNPR__GpuResources__Use,
    PainterlyNPR__GpuResources__Cpu  as  Cpu,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__GeometryBuffers__Preview } from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__BoundaryDistance__DistanceTarget as DistanceTarget } from '../24__Pass__DerivedFields/PainterlyNPR__BoundaryDistance__Pass__.mjs';
import { PainterlyNPR__InkLayer__INK_FAMILIES as INK_FAMILIES } from '../34__Stroke__InkCompositing/PainterlyNPR__InkLayer__InkFamilies__.mjs';
import { PainterlyNPR__Watercolour__Materials as Materials } from '../52__Wash__LayerStack/PainterlyNPR__Watercolour__Pass__.mjs';
import { PainterlyNPR__Paper__Tone } from '../55__Paper__Model/PainterlyNPR__Paper__Pass__.mjs';
import { PainterlyNPR__Kuwahara__WashTexture } from '../57__Wash__KuwaharaFilter/PainterlyNPR__Kuwahara__Host__.mjs';
import { PainterlyNPR__SkyClouds__SkyClouds as SkyClouds } from '../60__Atmos__SkyAndClouds/PainterlyNPR__SkyClouds__Host__.mjs';
import { PainterlyNPR__CameraRig__Camera as Camera } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
import { PainterlyNPR__Interface__UpdateViewBadge } from './PainterlyNPR__Interface__GraphStrip__.mjs';
import { PainterlyNPR__PassViewer__VIEWS as VIEWS } from './PainterlyNPR__PassViewer__ViewList__.mjs';

// =============================================================================
// REGION | Pass Viewer
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Pass Viewer
// -----------------------------------------------------------------------------

    // MODULE STATE | What the Sheet Shows
    // ------------------------------------------------------------
    const View  =  { Showing: 'Final', Thumb: null };
    // ------------------------------------------------------------


    // FUNCTION | Draw a View Into a Target (or the Sheet)
    // ------------------------------------------------------------
    function PainterlyNPR__PassViewer__Draw(viewKey, target) {
        const gl  =  Gpu.Gl;
        const T   =  Gpu.Targets;
        const width   =  target ? target.Width : gl.canvas.width;
        const height  =  target ? target.Height : gl.canvas.height;
        PainterlyNPR__GpuResources__Fullscreen(target, Gpu.Programs.View, {
            uAlbedo          :  { t: T.GBuffer.Textures[0] },
            uNormal          :  { t: T.GBuffer.Textures[1] },
            uData            :  { t: T.GBuffer.Textures[2] },
            uField           :  { t: T.Field.Textures[0] },
            uRegion          :  { t: T.Regions.Textures[0] },
            uSeeds           :  { t: (DistanceTarget || T.SeedsA).Textures[0] },
            uPaper           :  { t: T.Paper.Textures[0] },
            uWash            :  { t: viewKey === 'Kuwahara' ? PainterlyNPR__Kuwahara__WashTexture() : T.Wash.Textures[0] },
            uInk             :  { t: T.Ink.Textures[0] },
            uComposite       :  { t: T.Composite.Textures[0] },
            uFieldViz        :  { t: T.Field.Textures[1] },
            uFieldB          :  { t: T.Field.Textures[2] },
            uFieldC          :  { t: T.Field.Textures[3] },
            uAccent          :  { t: T.Accent.Textures[0] },
            uAux             :  { t: viewKey === 'ShadowLines' ? T.Marker.Textures[0] : (viewKey === 'BaseLines' && T.InkBase ? T.InkBase.Textures[0] : T.Accent2.Textures[0]) },   // <-- The view that reads it decides what it holds
            uClouds          :  { t: viewKey === 'CloudMasses' && SkyClouds.Painted ? SkyClouds.Painted.Texture : (SkyClouds.Buffer ? SkyClouds.Buffer.Texture : SkyClouds.Clear) },   // <-- The buffer (18), or the masses the wash paints (20)
            uViewRot         :  { m3: Camera.ViewRot },                         // <-- The camera the truth buffers were drawn with
            uView            :  { i: VIEWS[viewKey].Id },
            uViewport        :  { v2: [width, height] },
            uPxPerMm         :  { f: Gpu.PxPerMm },
            uPaperSrgb       :  { v3: PainterlyNPR__Maths__Hex(PainterlyNPR__Paper__Tone()) },
            uInkSrgb         :  { v3: PainterlyNPR__Maths__Hex(INK_FAMILIES[State.InkFamily].Colour) },
            uMaterialColours :  { v3a: Materials.Display },
        });
        const debug  =  viewKey === 'Lines' ? Cpu.Debug : (viewKey === 'Indication' ? Cpu.DebugInd : null);
        if (debug && debug.Length) {
            gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Debug);
            gl.bufferData(gl.ARRAY_BUFFER, debug.Data.subarray(0, debug.Length), gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            PainterlyNPR__GpuResources__Use(Gpu.Programs.Lines, { uSize: { v2: [Gpu.Width, Gpu.Height] } });
            gl.bindVertexArray(Gpu.Vaos.Debug);
            gl.drawArrays(gl.LINES, 0, debug.Length / 6);
            gl.bindVertexArray(null);
            gl.disable(gl.BLEND);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Present the Chosen View on the Sheet
    // ------------------------------------------------------------
    function PainterlyNPR__PassViewer__Present() {
        PainterlyNPR__PassViewer__Draw(State.View, null);
        View.Showing  =  State.View;
        PainterlyNPR__Interface__UpdateViewBadge();
    }
    // ------------------------------------------------------------


    // FUNCTION | Present a Milestone While Refinement Runs
    // ------------------------------------------------------------
    function PainterlyNPR__PassViewer__PresentMilestone(milestone) {
        if (State.View !== 'Final') return;
        if (milestone === 'Preview') PainterlyNPR__GeometryBuffers__Preview();
        else PainterlyNPR__PassViewer__Draw('Ink', null);
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh the Render-Graph Thumbnails
    // ------------------------------------------------------------
    // Each pass's first view, drawn small and read back into its node's canvas.
    // All of them, every time a refine ran anything: a view can read more than
    // its own pass (the shadow map's thumbnail shows light in the truth buffers),
    // and a dozen 192 x 128 reads cost a few milliseconds.
    function PainterlyNPR__PassViewer__RefreshThumbnails() {
        const gl  =  Gpu.Gl;
        if (!View.Thumb) View.Thumb = PainterlyNPR__GpuResources__CreateTarget('Thumbnail', 192, 128, ['RGBA8'], false);
        const T      =  View.Thumb;
        const pixels =  new Uint8Array(T.Width * T.Height * 4);
        for (const pass of PASSES) {
            if (!pass.Node) continue;
            PainterlyNPR__PassViewer__Draw(pass.Views[0], T);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.Fbo);
            gl.readPixels(0, 0, T.Width, T.Height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
            const canvas  =  pass.Node.querySelector('canvas');
            const ctx     =  canvas.getContext('2d');
            const image   =  ctx.createImageData(T.Width, T.Height);
            for (let y = 0; y < T.Height; y++) image.data.set(pixels.subarray((T.Height - 1 - y) * T.Width * 4, (T.Height - y) * T.Width * 4), y * T.Width * 4);
            ctx.putImageData(image, 0, 0);
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
        PainterlyNPR__PassViewer__Draw,
        PainterlyNPR__PassViewer__Present,
        PainterlyNPR__PassViewer__PresentMilestone,
        PainterlyNPR__PassViewer__RefreshThumbnails,
        View  as  PainterlyNPR__PassViewer__View,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
