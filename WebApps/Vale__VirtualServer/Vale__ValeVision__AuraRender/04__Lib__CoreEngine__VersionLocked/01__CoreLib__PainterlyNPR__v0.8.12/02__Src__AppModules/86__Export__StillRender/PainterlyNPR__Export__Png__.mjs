/* =============================================================================
   PAINTERLYNPR - EXPORT | STILL RENDER
   =============================================================================

   FILE       : PainterlyNPR__Export__Png__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Export - StillRender
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Export a still: the sheet, or the buffer on view, at a scale
                or a print resolution, as a PNG carrying its print size or a
                true-size PDF; and the pen calibration sheet
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - At twice the pixels it is the same drawing, sharper - never a different one.
   - which: '1' or '2' (a scale), 'dpi:300' or 'dpi:600' (a print resolution),
     'pdf:300' (a true-size PDF), 'view' (the buffer on view), or
     'calibration:pdf:600' / 'calibration:png:600' (the pen calibration sheet).
   - v0.8.0: the pixels are the sheet's own proportion at the resolution (300
     dpi on the 300 x 200 mm sheet is 3543 x 2362 at 11.81 px/mm), so every pen
     width is its millimetres x the pixels' own density; a PNG carries that
     density (pHYs) and the print size in words; the PDF's page is the sheet.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Export
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : the file is named PainterlyNPR__<View>__Seed<n>__<w>x<h>__<dpi>dpi__.png
                   (v0.8.0 added the dpi), without Experiment 01's Exp01; v0.8.0
                   added the print resolutions, pHYs, the PDF and the calibration
                   sheet

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__BASE_PX_PER_MM   as  BASE_PX_PER_MM,
    PainterlyNPR__Engine__ENGINE_VERSION   as  ENGINE_VERSION,
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
    PainterlyNPR__GpuResources__SheetPixels,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__Interface__Status } from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__PassViewer__Draw } from '../81__Hud__PassViewer/PainterlyNPR__PassViewer__Views__.mjs';
import { PainterlyNPR__Export__Pdf } from '../87__Export__PassesAndPdf/PainterlyNPR__Export__Pdf__.mjs';
import { PainterlyNPR__PenCalibration__Export } from './PainterlyNPR__Export__PenCalibration__.mjs';
import {
    PainterlyNPR__Export__Download,
    PainterlyNPR__PrintSize__Describe,
    PainterlyNPR__PrintSize__Png,
} from './PainterlyNPR__Export__PrintSize__.mjs';

// =============================================================================
// REGION | Still Render
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Export
// -----------------------------------------------------------------------------

    // FUNCTION | Export a Still - the sheet, or the buffer on view, at a scale or a print resolution
    // ------------------------------------------------------------
    // The sheet is re-made at the export size and the whole graph run again:
    // every width, scale and grain is in millimetres, so a 2x or a 300 dpi
    // export is the same drawing, sharper. Then everything returns to the
    // screen size. The file says its own print size.
    async function PainterlyNPR__Export__Png(which) {
        const what   =  String(which);
        if (what.startsWith('calibration:')) {
            const [, format, dpi]  =  what.split(':');
            return PainterlyNPR__PenCalibration__Export(format, parseFloat(dpi));
        }
        const gl     =  Gpu.Gl;
        const pdf    =  what.startsWith('pdf:');
        const dpi    =  pdf || what.startsWith('dpi:') ? parseFloat(what.split(':')[1]) : 0;
        const scale  =  what === 'view' ? 1 : (dpi ? dpi / 25.4 / BASE_PX_PER_MM : parseFloat(what));
        const sheet  =  PainterlyNPR__GpuResources__SheetPixels(BASE_PX_PER_MM * scale);
        const name   =  `PainterlyNPR__${State.View === 'Final' || what !== 'view' ? 'PenAndWash' : State.View}__Seed${State.Seed}__${sheet.Width}x${sheet.Height}__${Math.round(sheet.PxPerMm * 25.4)}dpi__.${pdf ? 'pdf' : 'png'}`;
        PainterlyNPR__Interface__Status(`Exporting ${name} …`);
        await PainterlyNPR__RenderGraph__NextFrame();
        Graph.Token++;
        let pixels = null, width = 0, height = 0, pxPerMm = 0, pxPerMmY = 0;
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
            pxPerMm =  Gpu.PxPerMm;                                           // <-- The pixels' own density: the file's print size
            pxPerMmY  =  height / SHEET_HEIGHT_MM;
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
        const words  =  PainterlyNPR__PrintSize__Describe(width, height, pxPerMm, SHEET_WIDTH_MM, SHEET_HEIGHT_MM);
        if (pdf) {
            const rgb  =  new Uint8Array(width * height * 3);                 // <-- Rows top to bottom, as a PDF image reads them
            for (let y = 0; y < height; y++) {
                const src = (height - 1 - y) * width * 4, dst = y * width * 3;
                for (let x = 0; x < width; x++) { rgb[dst + x * 3] = pixels[src + x * 4]; rgb[dst + x * 3 + 1] = pixels[src + x * 4 + 1]; rgb[dst + x * 3 + 2] = pixels[src + x * 4 + 2]; }
            }
            PainterlyNPR__Export__Download(await PainterlyNPR__Export__Pdf(rgb, width, height, SHEET_WIDTH_MM, SHEET_HEIGHT_MM, { Title: name, Subject: words }), name);
            PainterlyNPR__Interface__Status(`Exported ${name} - a true-size page: print it at 100% (actual size)`);
            return;
        }
        const canvas  =  document.createElement('canvas');
        canvas.width  =  width;
        canvas.height =  height;
        const ctx     =  canvas.getContext('2d');
        const image   =  ctx.createImageData(width, height);
        for (let y = 0; y < height; y++) image.data.set(pixels.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
        ctx.putImageData(image, 0, 0);
        const blob  =  await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const png   =  PainterlyNPR__PrintSize__Png(new Uint8Array(await blob.arrayBuffer()), pxPerMm, { Comment: words, Software: `PainterlyNPR ${ENGINE_VERSION}` }, pxPerMmY);
        PainterlyNPR__Export__Download(new Blob([png], { type: 'image/png' }), name);
        PainterlyNPR__Interface__Status(`Exported ${name} - ${Math.round(pxPerMm * 25.4)} dpi in the file, so it prints at ${SHEET_WIDTH_MM} x ${SHEET_HEIGHT_MM} mm at 100%`);
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
