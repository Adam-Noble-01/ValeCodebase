/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | SHEET PDF EXPORTER
   =============================================================================

   FILE       : VghLantern__DrawingEditor__SheetPdfExporter__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - SheetPdfExporter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Turn the Drawing Editor's Download PDF button into one page descriptor
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - The Drawing Editor's export route. Describes the composed sheet, wraps it as a
     single page descriptor and hands it to the application's PDF writer.
   - Draws nothing and creates nothing. SheetPdfPainter paints the page and
     PdfWriter__Document opens, foots and saves the file, exactly as they do for the
     drawing page inside a Preview and Send document.

   -----------------------------------------------------------------------------

   WHY THIS FILE IS NOW SO SMALL:
   It used to own a rasteriser, a filename resolver, a metadata stamper and a jsPDF
   document lifecycle, all of which had a second implementation over in Preview and
   Send. Every one of those now has exactly one owner, and what is left here is the
   only part that was ever specific to this button: which sheet, and what to call it.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Sheet PDF Exporter Module
// =============================================================================

const VghLantern__DrawingEditor__SheetPdfExporter = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Failure Messages
    // ------------------------------------------------------------
    // The writer owns the library and write-failure messages; this one is about the
    // state of the sheet, which only this module can know about.
    const MESSAGE_NO_SHEET  =  'Open a lantern in the Drawing Editor before exporting a PDF.';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Export the Composed Sheet as a True Size PDF
    // ------------------------------------------------------------
    async function VghLantern__DrawingEditor__SheetPdfExporter__Export() {
        var SheetManager  =  window.VghLantern__DrawingEditor__SheetManager;
        var Painter       =  window.VghLantern__DrawingEditor__SheetPdfPainter;
        var Writer        =  window.VghLantern__PdfWriter__Document;
        var Metadata      =  window.VghLantern__PdfWriter__Metadata;
        if (!SheetManager || !Painter || !Writer || !Metadata) return false;

        var sheet  =  SheetManager.VghLantern__DrawingEditor__SheetManager__DescribeSheet();
        var page   =  Painter.VghLantern__DrawingEditor__SheetPdfPainter__BuildPage(sheet);

        if (!page) {
            var Toast  =  window.VghLantern__AppNotifications__Toast;
            if (Toast && Toast.VghLantern__Toast__Show) Toast.VghLantern__Toast__Show(MESSAGE_NO_SHEET, 'error');
            return false;
        }

        var pageMeta  =  sheet.Layout.Page;

        return Writer.VghLantern__PdfWriter__Document__Write([page], {
            Filename   : Metadata.VghLantern__PdfWriter__Metadata__DrawingSheetFilename(
                             sheet.Project, sheet.Lantern, pageMeta.SizeKey, sheet.ScaleDenominator
                         ),
            Properties : Metadata.VghLantern__PdfWriter__Metadata__DrawingSheetProperties(
                             sheet.Project, sheet.Lantern, pageMeta, sheet.ScaleLabel
                         ),
            SuccessMessage : 'Drawing exported at ' + (pageMeta.Label || pageMeta.SizeKey) +
                             ' ' + (sheet.ScaleLabel || '')
        });
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__SheetPdfExporter__Export : VghLantern__DrawingEditor__SheetPdfExporter__Export
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetPdfExporter  =  VghLantern__DrawingEditor__SheetPdfExporter;
