/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | SHEET PDF PAINTER
   =============================================================================

   FILE       : VghLantern__DrawingEditor__SheetPdfPainter__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - SheetPdfPainter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Paint one composed drawing sheet onto a PDF page at true scale
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - The only code in the application that puts a drawing sheet onto a PDF page.
     Both the Drawing Editor's own download and the Preview and Send document call
     this, so a sheet cannot be drawn two different ways.
   - Creates no document and saves no file. It paints into a page the PDF writer has
     already opened at this sheet's paper size, which is what lets a drawing sheet sit
     in the middle of a document whose other pages are a different size.
   - Draws nothing of its own beyond the views. The rectangles come from the layout
     the Drawing Editor laid the screen sheet out with, and the frame furniture, notes
     and titleblock are the primitives SheetChrome built for that same sheet.

   -----------------------------------------------------------------------------

   HOW SCALE CORRECTNESS IS GUARANTEED:
   Three things have to agree, and this module plus the writer force all three:
     1. The PDF page is created at the sheet's real millimetre size, so the PDF
        MediaBox is a true A3 (or A4, A2, A1) and no printer scaling is implied.
     2. Each view is framed by SheetSurface to span exactly (body rectangle x scale
        denominator) model millimetres before rasterising. The drawn view therefore
        fills its frame at precisely 1:N regardless of how the browser laid the
        preview out.
     3. The raster is placed into that same body rectangle, so no fitting, letter-
        boxing or aspect correction happens between the maths and the paper.

   WHY FRAMING IS BORROWED FROM THE SCREEN SURFACE RATHER THAN REPEATED HERE:
   The framing rule decides what a view actually shows, so a copy of it here could
   quietly disagree with the one the preview uses and nobody would notice until a
   printed drawing showed a different window to the screen. One function, called with
   the same body rectangle by both, means they cannot.

   WHY THE SHEET'S OWN LAYOUT IS REUSED RATHER THAN RE-SOLVED:
   Re-solving here would be correct but not obviously correct - the moment a share, a
   note or a sheet size differed between the two solves, the file would stop matching
   the sheet the user approved. The layout travels on the described sheet instead.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Sheet PDF Painter Module
// =============================================================================

const VghLantern__DrawingEditor__SheetPdfPainter = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Page Kind
    // ------------------------------------------------------------
    // The writer decides footer eligibility by page kind, and the config block
    // Na__PdfWriter__Config.json -> Footer.SkipOnPageKinds names this string.
    const PAGE_KIND  =  'drawingSheet';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Slot Source Kinds
    // ------------------------------------------------------------
    const SOURCE_ENV3D  =  'env3d';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Drawing Editor PDF Export Config Block
    // ------------------------------------------------------------
    function VghLantern__SheetPdfPainter__PdfConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var drawingCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
        return drawingCfg['VghLantern__DrawingEditor__Config__PdfExport'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Raster Density Views Are Baked At
    // ------------------------------------------------------------
    // One density for every route. The Preview and Send document used to bake the
    // same views at half this and as JPEG, which haloed thin dark linework.
    function VghLantern__SheetPdfPainter__RasterPixelsPerMm() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            VghLantern__SheetPdfPainter__PdfConfig(), 'RasterPixelsPerMm',
            'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__PdfExport');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | View Rasterisation at True Scale
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Load an SVG String Into an Image Element
    // ------------------------------------------------------------
    // A blob URL rather than a data URI, because serialised drawing SVG routinely
    // exceeds the data URI length some browsers accept.
    function VghLantern__SheetPdfPainter__LoadSvgImage(svgMarkup) {
        return new Promise(function(resolve, reject) {
            var blob     =  new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
            var blobUrl  =  URL.createObjectURL(blob);
            var image    =  new Image();

            image.onload   =  function() { URL.revokeObjectURL(blobUrl); resolve(image); };
            image.onerror  =  function() { URL.revokeObjectURL(blobUrl); reject(new Error('SVG could not be decoded.')); };
            image.src      =  blobUrl;
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Rasterise Framed SVG Markup to a PNG Data URL
    // ------------------------------------------------------------
    // PNG rather than JPEG: a drawing is thin dark lines on white, which JPEG blurs
    // into grey haloes and PNG compresses better than it would a photograph.
    async function VghLantern__SheetPdfPainter__RasteriseSvg(svgMarkup, bodyRect, pixelsPerMm) {
        var image   =  await VghLantern__SheetPdfPainter__LoadSvgImage(svgMarkup);
        var canvas  =  document.createElement('canvas');

        canvas.width   =  Math.max(1, Math.round(bodyRect.WidthMm  * pixelsPerMm));
        canvas.height  =  Math.max(1, Math.round(bodyRect.HeightMm * pixelsPerMm));

        var context  =  canvas.getContext('2d');
        context.fillStyle  =  '#ffffff';                                      // <-- Paper, and PNG alpha would otherwise print grey
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/png');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place One View Into Its Body Rectangle
    // ------------------------------------------------------------
    // A slot that cannot produce an image leaves an empty frame rather than aborting
    // the export: an issued sheet missing one view is recoverable, a missing file is
    // not.
    async function VghLantern__SheetPdfPainter__DrawView(doc, placement, sheet, skeleton, pixelsPerMm) {
        var SheetSurface  =  window.VghLantern__DrawingEditor__SheetSurface;
        var slot  =  placement.Slot;
        var body  =  placement.Body;

        // The 3D snapshot was captured at this rectangle's aspect when the sheet was
        // composed, so it is placed rather than fitted - the same image fills the
        // same frame here as it does on screen.
        if (slot.Source === SOURCE_ENV3D) {
            var snapshot  =  sheet.ViewSnapshots ? sheet.ViewSnapshots[slot.Key] : null;
            if (snapshot) doc.addImage(snapshot, 'PNG', body.X, body.Y, body.WidthMm, body.HeightMm);
            return;
        }

        var markup  =  sheet.ViewSvgMarkup ? sheet.ViewSvgMarkup[slot.Key] : null;
        if (!markup || !SheetSurface) return;

        try {
            // Framed by the same function the on-screen sheet frames it with, at the
            // same body rectangle, so the raster shows exactly the previewed window.
            var framed  =  SheetSurface.VghLantern__DrawingEditor__SheetSurface__FrameViewMarkup(
                markup, slot.ViewKey || slot.Key, body, sheet.ScaleDenominator, skeleton, pixelsPerMm
            );
            if (!framed) return;

            var png  =  await VghLantern__SheetPdfPainter__RasteriseSvg(framed, body, pixelsPerMm);
            doc.addImage(png, 'PNG', body.X, body.Y, body.WidthMm, body.HeightMm);
        } catch (rasterError) {
            console.warn('[VghLantern__DrawingEditor__SheetPdfPainter] View "' + slot.Key + '" could not be rasterised:', rasterError);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Paint a Composed Sheet Onto an Already-Opened PDF Page
    // ------------------------------------------------------------
    // The caller is responsible for having opened a page at this sheet's paper size;
    // every coordinate below is a paper millimetre on that page.
    async function VghLantern__DrawingEditor__SheetPdfPainter__Paint(doc, sheet) {
        var SheetChrome   =  window.VghLantern__DrawingEditor__SheetChrome;
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var layout        =  sheet ? sheet.Layout : null;
        if (!doc || !layout || !SheetChrome) return false;

        var pixelsPerMm  =  VghLantern__SheetPdfPainter__RasterPixelsPerMm();
        var skeleton     =  StateManager ? StateManager.VghLantern__StateManager__GetSolvedSkeleton() : null;
        var i;

        // Views first, chrome after. A view is an opaque raster that fills its body
        // rectangle to the millimetre, so chrome drawn first would be painted over
        // along every edge it shares with the image. The on-screen sheet stacks the
        // chrome overlay above the frames for the same reason.
        for (i = 0; i < layout.Slots.length; i++) {
            await VghLantern__SheetPdfPainter__DrawView(doc, layout.Slots[i], sheet, skeleton, pixelsPerMm);
        }

        var logoAsset   =  await SheetChrome.VghLantern__DrawingEditor__SheetChrome__LoadLogo();
        var primitives  =  SheetChrome.VghLantern__DrawingEditor__SheetChrome__BuildForSheet(
            layout, sheet.Project, sheet.Lantern, logoAsset
        );
        SheetChrome.VghLantern__DrawingEditor__SheetChrome__DrawToPdf(doc, primitives);

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Page Descriptor for a Composed Sheet
    // ------------------------------------------------------------
    // The one factory both export routes use, so the drawing page is the same page
    // whether it is the whole file or the last page of a longer document. Returns
    // null when there is no sheet to write, which the caller reports rather than
    // silently exporting a blank page.
    function VghLantern__DrawingEditor__SheetPdfPainter__BuildPage(sheet) {
        if (!sheet || !sheet.IsComposed || !sheet.Layout) return null;

        return {
            Kind     : PAGE_KIND,
            WidthMm  : sheet.Layout.Page.WidthMm,
            HeightMm : sheet.Layout.Page.HeightMm,
            Paint    : function(doc) {
                return VghLantern__DrawingEditor__SheetPdfPainter__Paint(doc, sheet);
            }
        };
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__SheetPdfPainter__PageKind   : PAGE_KIND,
        VghLantern__DrawingEditor__SheetPdfPainter__Paint      : VghLantern__DrawingEditor__SheetPdfPainter__Paint,
        VghLantern__DrawingEditor__SheetPdfPainter__BuildPage  : VghLantern__DrawingEditor__SheetPdfPainter__BuildPage
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetPdfPainter  =  VghLantern__DrawingEditor__SheetPdfPainter;
