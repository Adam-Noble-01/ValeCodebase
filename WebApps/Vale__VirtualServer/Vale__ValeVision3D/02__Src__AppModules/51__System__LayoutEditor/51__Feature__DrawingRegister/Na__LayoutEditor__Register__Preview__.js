// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - DRAWING REGISTER PDF PREVIEW
// =============================================================================
//
// FILE       : Na__LayoutEditor__Register__Preview__.js
// NAMESPACE  : Na__LeRegPreview
// MODULE     : Layout Editor - Drawing Register PDF Preview
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Render the actual register PDF on desktop and mobile browsers
// CREATED    : 19-Sep-2026
//
// DESCRIPTION:
// - Reuses PlanVision's version-locked PDF.js dependency. Native PDF iframe
//   support is not assumed.
// - What is painted is the download, not a second drawing of it: the Read
//   view hands over the exact bytes Export register PDF writes to disk.
// - Each page is rasterised at the display's own pixel density, so the
//   preview is the document at full resolution rather than an upscale.
// - Render tasks and PDF memory are released on hide, so leaving the tab
//   does not leave a document pinned in memory.
//
// INTEGRATION:
// - The register editor's Read view paints through Na__LeRegPreview__Render
//   and clears through Na__LeRegPreview__Clear. Script and worker paths
//   come from GetDrawingRegisterSetup.
// - previewWidthPx must stay in step with the max-width on
//   .na-le-register__pdf-page in Na__LayoutEditor__Styles__DrawingRegister__.css;
//   that rule is what decides how wide a page is actually laid out.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/51__Feature__DrawingRegister/Na__LayoutEditor__Register__Preview__.js
// - Source version: 1.1.0 (TrueVision3D v2.69.0, 19-Sep-2026; unchanged since; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W4-18}}, inert: nothing imports it until the register
//                   tab lands (W4-10). Its TrueVision release is not confirmed by Adam in TrueVision; ported under DR-01 (c).
// - Parity        : verbatim
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
//   - PDF.js is this app's own vendored copy, 04__Lib__ThirdParty__VersionLocked/07__Vendor__PdfJs__v3.11.174
//     (W0-16), named by the config's PdfJsScriptPath / PdfJsWorkerPath (W0-15, K2 TF-R07): the code is
//     TrueVision's, and DESCRIPTION's "PlanVision's" PDF.js is TrueVision's source of the same library.
// - Back-port     : none (the vendor path is a config value; offered to TrueVision as K2 TF-R07).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Sep-2026 - Version 1.1.0
// - FIXED. The canvas was built at a fixed 1.25 scale (744px for an A4 page)
//   and then stretched by CSS into a 794px box, so the Read view was a soft
//   enlargement of the document on every display and badly soft on a HiDPI
//   one. Scale is now derived from the page box and the device pixel ratio.
// - The canvas is opaque and pre-filled white, so text is composited against
//   paper rather than against whatever sits behind a transparent canvas.
//
// 19-Sep-2026 - Version 1.0.1
// - Headers, region breakdown, function wrapping and the export block brought
//   in line with the Layout Editor coding conventions. No behaviour change.
//
// 19-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Drawing Register Setup
    // ------------------------------------------------------------
    import { Na__LeCfg__GetDrawingRegisterSetup } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Loaded Library, Open Document and Active Render Task
    // ------------------------------------------------------------
    let Na__LeRegPreview__Library  = null;
    let Na__LeRegPreview__Document = null;
    let Na__LeRegPreview__Task     = null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | PDF.js Load and Page Paint
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Load PDF.js Once, Pointing Its Worker at the Vendored Copy
    // ------------------------------------------------------------
    function Na__LeRegPreview__Ready() {
        if (Na__LeRegPreview__Library) return Na__LeRegPreview__Library;
        const cfg = Na__LeCfg__GetDrawingRegisterSetup();
        Na__LeRegPreview__Library = new Promise((resolve, reject) => {
            const ready = () => {
                if (!window.pdfjsLib) {
                    reject(new Error('PDF preview library did not load.'));
                    return;
                }
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = cfg.pdfJsWorkerPath;
                resolve(window.pdfjsLib);
            };
            if (window.pdfjsLib) {
                ready();
                return;
            }
            const script = document.createElement('script');
            script.src     = cfg.pdfJsScriptPath;
            script.onload  = ready;
            script.onerror = () => {
                script.remove();
                reject(new Error('PDF preview library is unavailable.'));
            };
            document.head.appendChild(script);
        }).catch((error) => {
            Na__LeRegPreview__Library = null;
            throw error;
        });
        return Na__LeRegPreview__Library;
    }
    // ------------------------------------------------------------


    // FUNCTION | Release the Open Document and Cancel an In-Flight Render
    // ------------------------------------------------------------
    function Na__LeRegPreview__Clear() {
        if (Na__LeRegPreview__Task) Na__LeRegPreview__Task.cancel();
        Na__LeRegPreview__Task = null;
        if (Na__LeRegPreview__Document) void Na__LeRegPreview__Document.destroy();
        Na__LeRegPreview__Document = null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Scale That Fills the Page Box at the Display's Own Density
    // ------------------------------------------------------------
    // The page is laid out at previewWidthPx CSS pixels, so the canvas needs
    // that many pixels times the device ratio. A fixed 1.25 was fewer pixels
    // than the box it was stretched into, which is why the preview read as a
    // soft image of the document rather than the document.
    // ------------------------------------------------------------
    function Na__LeRegPreview__Scale(page, cfg) {
        const unscaled = page.getViewport({ scale : 1 });
        const ratio    = Math.min(cfg.previewMaxDpr, Math.max(1, window.devicePixelRatio || 1));
        if (!unscaled.width) return ratio;
        return (cfg.previewWidthPx * ratio) / unscaled.width;
    }
    // ------------------------------------------------------------


    // FUNCTION | Paint the Same Bytes That the Register Download Sends
    // ------------------------------------------------------------
    async function Na__LeRegPreview__Render(bytes, container, current) {
        Na__LeRegPreview__Clear();
        const library = await Na__LeRegPreview__Ready();
        if (!current()) return;
        const pdf = await library.getDocument({ data : new Uint8Array(bytes) }).promise;
        if (!current()) {
            await pdf.destroy();
            return;
        }
        Na__LeRegPreview__Document = pdf;
        const cfg = Na__LeCfg__GetDrawingRegisterSetup();
        container.replaceChildren();
        for (let index = 1; index <= pdf.numPages; index++) {
            if (!current()) return;
            const page = await pdf.getPage(index);
            if (!current()) return;
            const viewport = page.getViewport({ scale : Na__LeRegPreview__Scale(page, cfg) });
            const canvas   = document.createElement('canvas');
            canvas.className = 'na-le-register__pdf-page';
            canvas.width     = Math.ceil(viewport.width);
            canvas.height    = Math.ceil(viewport.height);
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', 'Drawing register page ' + index + ' of ' + pdf.numPages);
            container.appendChild(canvas);
            const context = canvas.getContext('2d', { alpha : false });          // <-- Opaque: paper, not a transparent sheet over the desk behind it
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            Na__LeRegPreview__Task = page.render({
                canvasContext : context,
                viewport
            });
            await Na__LeRegPreview__Task.promise;
            Na__LeRegPreview__Task = null;
            page.cleanup();
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Drawing Register Preview API
    // ------------------------------------------------------------
    export {
        Na__LeRegPreview__Render,
        Na__LeRegPreview__Clear
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
