/* =============================================================================
   PAINTERLYNPR - EXPORT | STILL RENDER
   =============================================================================

   FILE       : PainterlyNPR__Export__Png__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Export - StillRender
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Export a PNG: the sheet, or the buffer on view, at a scale
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - At twice the pixels it is the same drawing, sharper - never a different one.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Export
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : the file is named PainterlyNPR__<View>__Seed<n>__<w>x<h>__.png,
                   without Experiment 01's Exp01; otherwise none

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__BASE_PX_PER_MM   as  BASE_PX_PER_MM,
    PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
    PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__RenderGraph__Bump,
    PainterlyNPR__RenderGraph__NextFrame,
    PainterlyNPR__RenderGraph__Refine,
    PainterlyNPR__RenderGraph__RunAll,
    PainterlyNPR__RenderGraph__Graph  as  Graph,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import {
    PainterlyNPR__GpuResources__CreateTarget,
    PainterlyNPR__GpuResources__DisposeTarget,
    PainterlyNPR__GpuResources__SetScale,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__Interface__Status } from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__PassViewer__Draw } from '../81__Hud__PassViewer/PainterlyNPR__PassViewer__Views__.mjs';

// =============================================================================
// REGION | Still Render
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Export
// -----------------------------------------------------------------------------

    // FUNCTION | Export a PNG - the sheet, or the buffer on view, at a scale
    // ------------------------------------------------------------
    // The sheet is re-made at the export size and the whole graph run again:
    // every width, scale and grain is in millimetres, so a 2x export is the same
    // drawing, sharper. Then everything returns to the screen size.
    async function PainterlyNPR__Export__Png(which) {
        const gl     =  Gpu.Gl;
        const scale  =  which === 'view' ? 1 : parseFloat(which);
        const name   =  `PainterlyNPR__${State.View === 'Final' || which !== 'view' ? 'PenAndWash' : State.View}__Seed${State.Seed}__${Math.round(SHEET_WIDTH_MM * BASE_PX_PER_MM * scale)}x${Math.round(SHEET_HEIGHT_MM * BASE_PX_PER_MM * scale)}__.png`;
        PainterlyNPR__Interface__Status(`Exporting ${name} …`);
        await PainterlyNPR__RenderGraph__NextFrame();
        Graph.Token++;
        let pixels = null, width = 0, height = 0;
        try {
            if (scale !== Gpu.Scale) {
                PainterlyNPR__GpuResources__SetScale(scale);
                PainterlyNPR__RenderGraph__Bump('Size');
            }
            PainterlyNPR__RenderGraph__RunAll();
            let target  =  Gpu.Targets.Composite;
            if (which === 'view' && State.View !== 'Final') {
                const temp  =  PainterlyNPR__GpuResources__CreateTarget('Export view', Gpu.Width, Gpu.Height, ['RGBA8'], false);
                PainterlyNPR__PassViewer__Draw(State.View, temp);
                target  =  temp;
            }
            width   =  target.Width;
            height  =  target.Height;
            pixels  =  new Uint8Array(width * height * 4);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, target.Fbo);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
            if (target !== Gpu.Targets.Composite) PainterlyNPR__GpuResources__DisposeTarget(target);
        } catch (error) {
            PainterlyNPR__Interface__Status(`Export failed - ${error.message}. Try 1x.`);
            console.error(error);
        }
        if (Gpu.Scale !== 1) {
            PainterlyNPR__GpuResources__SetScale(1);
            PainterlyNPR__RenderGraph__Bump('Size');
        }
        PainterlyNPR__RenderGraph__Refine();
        if (!pixels) return;
        const canvas  =  document.createElement('canvas');
        canvas.width  =  width;
        canvas.height =  height;
        const ctx     =  canvas.getContext('2d');
        const image   =  ctx.createImageData(width, height);
        for (let y = 0; y < height; y++) image.data.set(pixels.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
        ctx.putImageData(image, 0, 0);
        canvas.toBlob((blob) => {
            const a  =  document.createElement('a');
            a.href   =  URL.createObjectURL(blob);
            a.download  =  name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 4000);
            PainterlyNPR__Interface__Status(`Exported ${name}`);
        }, 'image/png');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Export__Png,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
