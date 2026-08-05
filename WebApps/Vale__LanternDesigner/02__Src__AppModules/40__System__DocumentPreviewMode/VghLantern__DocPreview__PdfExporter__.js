/* =============================================================================
   VGHLANTERN - DOCUMENT PREVIEW | PDF EXPORTER
   =============================================================================

   FILE       : VghLantern__DocPreview__PdfExporter__.js
   NAMESPACE  : VghLantern
   MODULE     : DocPreview - PdfExporter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Compose the Preview and Send document as an ordered list of pages
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Decides which pages the document contains and in what order, then hands them to
     the application's PDF writer. It paints nothing itself.
   - Specification pages are painted by SpecificationPdfPainter at the document paper
     size. The drawing page is painted by the Drawing Editor's own SheetPdfPainter at
     the Drawing Editor's paper size, which is what makes the drawing in this document
     the drawing the user composed rather than a second rendering of it.
   - Blocks on any error the issue handler raises, because issuing a document whose
     numbers cannot be trusted is worse than issuing nothing.

   -----------------------------------------------------------------------------

   WHY THIS FILE NO LONGER DRAWS A DRAWING:
   It used to re-derive the view grid from raw config, re-draw the frames and captions
   with its own strokes and greys, and re-draw the titleblock without the logo and with
   equal column widths. That was a second description of a sheet that already had one,
   and it drifted: a gutter dragged in the Drawing Editor never moved anything here.
   The drawing page is now the composed sheet, baked whole.

   WHY THE DOCUMENT CAN MIX PAPER SIZES:
   Each page descriptor carries its own millimetres, so a default project exports A4
   portrait schedules followed by an A3 landscape drawing sheet in one file. Nothing
   here needs to know that; the writer opens each page at the size its descriptor
   states.

   ============================================================================= */

// =============================================================================
// REGION | Document Preview PDF Exporter Module
// =============================================================================

const VghLantern__DocPreview__PdfExporter = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Failure Message the Issue Config Does Not Own
    // ------------------------------------------------------------
    // The empty-selection and no-sheet copy already exists in the Issues config block,
    // which is where the on-screen banner reads it from. Only this one is about the
    // act of exporting rather than about the document, so it has no config home.
    const MESSAGE_BLOCKED  =  'Resolve the errors listed above before exporting.';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Configured Issue Message
    // ------------------------------------------------------------
    // Shared with the issue banner, so an export refusal and the banner above it say
    // the same thing in the same words.
    function VghLantern__PdfExporter__IssueMessage(key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var docCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DocPreview') || {};

        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            docCfg['VghLantern__DocPreview__Config__Issues'] || {}, key,
            'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Issues');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report a Failure to the User
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__ReportFailure(message) {
        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast && Toast.VghLantern__Toast__Show) {
            Toast.VghLantern__Toast__Show(message, 'error');
            return;
        }
        console.error('[VghLantern__DocPreview__PdfExporter] ' + message);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Specification Page Descriptor
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__BuildSpecificationPage(viewState) {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var SpecModel      =  window.VghLantern__Specification__DocumentModel;
        var SpecPainter    =  window.VghLantern__DocPreview__SpecificationPdfPainter;
        if (!DocumentState || !SpecModel || !SpecPainter) return null;

        var model  =  SpecModel.VghLantern__Specification__DocumentModel__BuildFromState();
        if (!model) return null;

        return SpecPainter.VghLantern__DocPreview__SpecificationPdfPainter__BuildPage(
            DocumentState.VghLantern__DocPreview__DocumentState__DescribePage(), model, viewState
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Drawing Sheet Page Descriptor
    // ------------------------------------------------------------
    // The sheet is described by the Drawing Editor and wrapped by its own painter, so
    // this document's drawing page and the Drawing Editor's own download are the same
    // page built by the same code.
    function VghLantern__PdfExporter__BuildDrawingPage() {
        var SheetManager  =  window.VghLantern__DrawingEditor__SheetManager;
        var Painter       =  window.VghLantern__DrawingEditor__SheetPdfPainter;
        if (!SheetManager || !Painter) return null;

        return Painter.VghLantern__DrawingEditor__SheetPdfPainter__BuildPage(
            SheetManager.VghLantern__DrawingEditor__SheetManager__DescribeSheet()
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Welcome Letter Page Descriptor
    // ------------------------------------------------------------
    // The letter is resolved by the Client Doc mode's model and painted by its own
    // painter, so the letter in this document is the letter that mode previews.
    function VghLantern__PdfExporter__BuildWelcomeLetterPage() {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var LetterModel    =  window.VghLantern__ClientDoc__LetterModel;
        var Painter        =  window.VghLantern__ClientDoc__LetterPdfPainter;
        if (!DocumentState || !LetterModel || !Painter) return null;

        var letter  =  LetterModel.VghLantern__ClientDoc__LetterModel__BuildFromState();
        if (!letter) return null;

        return Painter.VghLantern__ClientDoc__LetterPdfPainter__BuildPage(
            DocumentState.VghLantern__DocPreview__DocumentState__DescribePage(), letter
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Terms Page Descriptor
    // ------------------------------------------------------------
    // One descriptor for the whole terms document however many sheets it runs to,
    // because it is one continuously numbered document. The clause numbers come from
    // the terms model, which is the same model the preview and the editor read.
    function VghLantern__PdfExporter__BuildTermsPage() {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var TermsModel     =  window.VghLantern__Terms__DocumentModel;
        var Painter        =  window.VghLantern__Terms__PdfPainter;
        if (!DocumentState || !TermsModel || !Painter) return null;

        var model  =  TermsModel.VghLantern__Terms__DocumentModel__BuildFromState();
        if (!model) return null;

        return Painter.VghLantern__Terms__PdfPainter__BuildPage(
            DocumentState.VghLantern__DocPreview__DocumentState__DescribePage(), model
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Export the Previewed Document as a PDF
    // ------------------------------------------------------------
    async function VghLantern__DocPreview__PdfExporter__Export() {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var IssueHandler   =  window.VghLantern__DocPreview__DocIssueHandler;
        var StateManager   =  window.VghLantern__AppCore__StateManager;
        var Writer         =  window.VghLantern__PdfWriter__Document;
        var Metadata       =  window.VghLantern__PdfWriter__Metadata;
        if (!DocumentState || !Writer || !Metadata) return false;

        if (IssueHandler &&
            IssueHandler.VghLantern__DocPreview__DocIssueHandler__IsExportBlocked(
                IssueHandler.VghLantern__DocPreview__DocIssueHandler__Collect())) {
            VghLantern__PdfExporter__ReportFailure(MESSAGE_BLOCKED);
            return false;
        }

        var viewState  =  DocumentState.VghLantern__DocPreview__DocumentState__GetViewState();
        var pageKinds  =  DocumentState.VghLantern__DocPreview__DocumentState__ListPageKinds();
        if (!pageKinds.length) {
            VghLantern__PdfExporter__ReportFailure(VghLantern__PdfExporter__IssueMessage('EmptySelectionMessage'));
            return false;
        }

        // One builder per page kind. Adding a page kind is adding a row here and a row
        // in DocumentState's include table, and nothing else.
        var builders  =  {
            welcomeLetter : VghLantern__PdfExporter__BuildWelcomeLetterPage,
            drawing       : VghLantern__PdfExporter__BuildDrawingPage,
            specification : function() { return VghLantern__PdfExporter__BuildSpecificationPage(viewState); },
            terms         : VghLantern__PdfExporter__BuildTermsPage
        };

        var pages  =  [];
        var i, page;

        for (i = 0; i < pageKinds.length; i++) {
            if (!builders[pageKinds[i]]) continue;
            page  =  builders[pageKinds[i]]();

            // A drawing page the user asked for that cannot be built is a blocking
            // problem, not a page to quietly leave out of an issued document. The
            // letter and the terms are different: an empty letter or a document with
            // every terms section switched off are states the user chose, and they are
            // reported as warnings by the issue handler rather than refused here.
            if (!page && pageKinds[i] === 'drawing') {
                VghLantern__PdfExporter__ReportFailure(VghLantern__PdfExporter__IssueMessage('NoDrawingSheetMessage'));
                return false;
            }
            if (page) pages.push(page);
        }

        var project  =  StateManager ? StateManager.VghLantern__StateManager__GetCurrentProject() : null;
        var lantern  =  StateManager ? StateManager.VghLantern__StateManager__GetCurrentLantern() : null;

        return Writer.VghLantern__PdfWriter__Document__Write(pages, {
            Filename       : Metadata.VghLantern__PdfWriter__Metadata__DocumentFilename(project, lantern),
            Properties     : Metadata.VghLantern__PdfWriter__Metadata__DocumentProperties(project, lantern),
            SuccessMessage : 'Document exported.'
        });
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DocPreview__PdfExporter__Export : VghLantern__DocPreview__PdfExporter__Export
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__PdfExporter  =  VghLantern__DocPreview__PdfExporter;
