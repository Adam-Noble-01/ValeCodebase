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


    // HELPER FUNCTION | Get the Document Page Geometry
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__Page() {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        return DocumentState ? DocumentState.VghLantern__DocPreview__DocumentState__DescribePage() : null;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Project Summary Page Descriptor
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__BuildProjectSummaryPage(viewState, specModel) {
        var SpecPainter  =  window.VghLantern__DocPreview__SpecificationPdfPainter;
        var page         =  VghLantern__PdfExporter__Page();
        if (!SpecPainter || !specModel || !page) return null;

        return SpecPainter.VghLantern__DocPreview__SpecificationPdfPainter__BuildProjectSummaryPage(
            page, specModel, viewState
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Lantern's Specification Page Descriptor
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__BuildLanternSpecPage(viewState, specModel, lanternIndex) {
        var SpecPainter  =  window.VghLantern__DocPreview__SpecificationPdfPainter;
        var page         =  VghLantern__PdfExporter__Page();
        if (!SpecPainter || !specModel || !page) return null;

        return SpecPainter.VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternPage(
            page, specModel, viewState, lanternIndex
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Lantern's Cutting List Page Descriptor
    // ------------------------------------------------------------
    // Returns null for a lantern with nothing to cut, which drops the page. Unlike a
    // missing drawing that is not a blocking problem: a lantern whose sections are all
    // continuous perimeter runs genuinely has no cutting list.
    function VghLantern__PdfExporter__BuildLanternCuttingListPage(specModel, lanternIndex) {
        var SpecPainter  =  window.VghLantern__DocPreview__SpecificationPdfPainter;
        var page         =  VghLantern__PdfExporter__Page();
        if (!SpecPainter || !specModel || !page) return null;

        return SpecPainter.VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternCuttingListPage(
            page, specModel, lanternIndex
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Lantern's Drawing Sheet Page Descriptor
    // ------------------------------------------------------------
    // The sheet comes from the baker, which composes it exactly as the Drawing Editor
    // would, so this document's drawing pages and the Drawing Editor's own download
    // are the same page built by the same code.
    function VghLantern__PdfExporter__BuildDrawingPage(bakedSheets, lanternIndex) {
        var Painter  =  window.VghLantern__DrawingEditor__SheetPdfPainter;
        if (!Painter) return null;

        var sheet  =  bakedSheets ? bakedSheets[lanternIndex] : null;
        if (!sheet) return null;

        return Painter.VghLantern__DrawingEditor__SheetPdfPainter__BuildPage(sheet);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Lantern's Drawing Notes Page Descriptor
    // ------------------------------------------------------------
    // Painted by the terms painter from a terms model, because a drawing notes page is
    // a numbered note list - the same object a terms document is, from a different
    // source. Returns null for a lantern with no notes, which is how the page drops
    // out of the pack.
    function VghLantern__PdfExporter__BuildLanternNotesPage(lanternIndex) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var TermsModel    =  window.VghLantern__Terms__DocumentModel;
        var Painter       =  window.VghLantern__Terms__PdfPainter;
        var page          =  VghLantern__PdfExporter__Page();
        if (!StateManager || !TermsModel || !Painter || !page) return null;

        var project   =  StateManager.VghLantern__StateManager__GetCurrentProject();
        var lanterns  =  (project && Array.isArray(project['VghLantern__ProjectFile__Lanterns']))
            ? project['VghLantern__ProjectFile__Lanterns'] : [];

        var model  =  TermsModel.VghLantern__Terms__DocumentModel__BuildLanternDrawingTerms(
            project, lanterns[lanternIndex], lanternIndex
        );
        if (!model) return null;

        return Painter.VghLantern__Terms__PdfPainter__BuildPage(page, model);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the General Drawing Terms Page Descriptor
    // ------------------------------------------------------------
    // The omissions and limitations covering the whole pack, and where a titleblock QR
    // code lands when its lantern has no notes of its own.
    function VghLantern__PdfExporter__BuildDrawingTermsPage() {
        var TermsModel  =  window.VghLantern__Terms__DocumentModel;
        var Painter     =  window.VghLantern__Terms__PdfPainter;
        var page        =  VghLantern__PdfExporter__Page();
        if (!TermsModel || !Painter || !page) return null;

        var model  =  TermsModel.VghLantern__Terms__DocumentModel__BuildDrawingTermsFromState();
        if (!model) return null;

        return Painter.VghLantern__Terms__PdfPainter__BuildPage(page, model);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Welcome Letter Page Descriptor
    // ------------------------------------------------------------
    // The letter is resolved by the Client Doc mode's model and painted by its own
    // painter, so the letter in this document is the letter that mode previews.
    function VghLantern__PdfExporter__BuildWelcomeLetterPage() {
        var LetterModel  =  window.VghLantern__ClientDoc__LetterModel;
        var Painter      =  window.VghLantern__ClientDoc__LetterPdfPainter;
        var page         =  VghLantern__PdfExporter__Page();
        if (!LetterModel || !Painter || !page) return null;

        var letter  =  LetterModel.VghLantern__ClientDoc__LetterModel__BuildFromState();
        if (!letter) return null;

        return Painter.VghLantern__ClientDoc__LetterPdfPainter__BuildPage(page, letter);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Terms Page Descriptor
    // ------------------------------------------------------------
    // One descriptor for the whole terms document however many sheets it runs to,
    // because it is one continuously numbered document. The clause numbers come from
    // the terms model, which is the same model the preview and the editor read.
    function VghLantern__PdfExporter__BuildTermsPage() {
        var TermsModel  =  window.VghLantern__Terms__DocumentModel;
        var Painter     =  window.VghLantern__Terms__PdfPainter;
        var page        =  VghLantern__PdfExporter__Page();
        if (!TermsModel || !Painter || !page) return null;

        var model  =  TermsModel.VghLantern__Terms__DocumentModel__BuildFromState();
        if (!model) return null;

        return Painter.VghLantern__Terms__PdfPainter__BuildPage(page, model);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Guarantee the Projected Linework Before Anything Is Issued
    // ------------------------------------------------------------
    // The projection keeps itself up to date on a short delay, which covers a person
    // working in the editors. It does not cover this: a document can be opened and
    // exported faster than that delay, and a drawing that leaves the office showing
    // less than the model says is the one failure worth spending a second to avoid.
    //
    // So the export waits for it, every time. When everything is already in hand -
    // which it usually is - this costs a promise and returns immediately.
    //
    // Returns whether anything was actually rendered, which the caller needs in
    // order to know whether the baked sheets it is about to use are still current.
    async function VghLantern__PdfExporter__EnsureLineworkRendered() {
        var ProjectedEdges  =  window.VghLantern__ProjectedEdges;
        if (!ProjectedEdges || !ProjectedEdges.VghLantern__ProjectedEdges__ForceRender) return false;

        try {
            var outcome  =  await ProjectedEdges.VghLantern__ProjectedEdges__ForceRender();
            return !!(outcome && outcome.Rendered > 0);
        } catch (renderError) {
            // Not fatal. A pack without projected linework is still a valid pack,
            // and refusing to export because a backdrop layer failed would be a
            // worse answer than exporting the drawing that was on screen.
            console.error('[VghLantern__PdfExporter] Projected linework render failed; exporting without it:', renderError);
            return false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Export the Previewed Document as a PDF
    // ------------------------------------------------------------
    async function VghLantern__DocPreview__PdfExporter__Export() {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var IssueHandler   =  window.VghLantern__DocPreview__DocIssueHandler;
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
        var plan       =  DocumentState.VghLantern__DocPreview__DocumentState__BuildPagePlan();
        if (!plan.length) {
            VghLantern__PdfExporter__ReportFailure(VghLantern__PdfExporter__IssueMessage('EmptySelectionMessage'));
            return false;
        }

        // Export is the longest wait in the mode: the linework render, then a sheet
        // composed per lantern, then the file written. On a multi-lantern job that is
        // long enough that a user presses the button twice, so the overlay covers the
        // whole of it rather than just the bake.
        // Opened unconditionally rather than only when sheets are missing: the export
        // guarantees the linework first, and a render that produces anything new throws
        // every cached sheet away, so "all sheets cached" is no promise of a short wait
        // here the way it is on entering the mode.
        var Overlay        =  window.VghLantern__DocPreview__ProgressOverlay;
        var ownsOverlay    =  !!(Overlay && Overlay.VghLantern__DocPreview__ProgressOverlay__Open());
        var exportFailed   =  false;

        // Waited on for the same reason mode entry waits: everything below runs on the
        // main thread, and an overlay that has not been painted before that starts is
        // not on screen for any of it.
        if (ownsOverlay) await Overlay.VghLantern__DocPreview__ProgressOverlay__WaitUntilVisible();

        try {
            // Nothing is issued showing less than the model says.
            var lineworkChanged  =  await VghLantern__PdfExporter__EnsureLineworkRendered();

            // Every drawing in the pack is composed before a single page is written.
            // Awaited here rather than per page because the bake borrows the Drawing
            // Editor's session sheet setup, and interleaving that with painting would
            // mean handing it back and taking it again for every sheet.
            var SheetBaker   =  window.VghLantern__DrawingEditor__SheetBaker;

            // Baked sheets are cached against the lantern's signature, and that
            // signature does not change when linework is added to a lantern that
            // already had a sheet. So a render that produced something new has to
            // discard them, or the pack is written from sheets composed before the
            // linework existed - which would look exactly like the render having
            // silently done nothing.
            if (lineworkChanged && SheetBaker && SheetBaker.VghLantern__DrawingEditor__SheetBaker__Clear) {
                SheetBaker.VghLantern__DrawingEditor__SheetBaker__Clear();
            }

            var bakedSheets  =  SheetBaker
                ? await SheetBaker.VghLantern__DrawingEditor__SheetBaker__BakeAll(
                      ownsOverlay ? Overlay.VghLantern__DocPreview__ProgressOverlay__Update : null)
                : [];

            return await VghLantern__PdfExporter__WritePack(viewState, plan, bakedSheets);
        } catch (exportError) {
            exportFailed  =  true;
            throw exportError;
        } finally {
            if (ownsOverlay) Overlay.VghLantern__DocPreview__ProgressOverlay__Close({ IsError : exportFailed });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Assemble and Write the Pack Once Every Drawing Is Composed
    // ------------------------------------------------------------
    // Split from Export above so the overlay's lifetime is one plain try/finally around
    // the whole wait rather than a close call repeated down every early return.
    async function VghLantern__PdfExporter__WritePack(viewState, plan, bakedSheets) {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var StateManager   =  window.VghLantern__AppCore__StateManager;
        var Writer         =  window.VghLantern__PdfWriter__Document;
        var Metadata       =  window.VghLantern__PdfWriter__Metadata;

        // Built once and shared by every specification page. Solving the takeoff for
        // the whole project per lantern page would repeat the same arithmetic once per
        // lantern squared.
        var SpecModel  =  window.VghLantern__Specification__DocumentModel;
        var specModel  =  SpecModel ? SpecModel.VghLantern__Specification__DocumentModel__BuildFromState() : null;

        // One builder per page kind. Adding a page kind is adding a row here and a row
        // in DocumentState's include table, and nothing else. Each is handed the plan
        // entry, so a per-lantern builder reads its lantern from the plan rather than
        // inferring one from where it happens to be in the pack.
        var builders  =  {};
        builders[DocumentState.KIND_WELCOME_LETTER]   =  function()      { return VghLantern__PdfExporter__BuildWelcomeLetterPage(); };
        builders[DocumentState.KIND_PROJECT_SUMMARY]  =  function()      { return VghLantern__PdfExporter__BuildProjectSummaryPage(viewState, specModel); };
        builders[DocumentState.KIND_LANTERN_DRAWING]  =  function(entry) { return VghLantern__PdfExporter__BuildDrawingPage(bakedSheets, entry.LanternIndex); };
        builders[DocumentState.KIND_LANTERN_NOTES]    =  function(entry) { return VghLantern__PdfExporter__BuildLanternNotesPage(entry.LanternIndex); };
        builders[DocumentState.KIND_LANTERN_SPEC]     =  function(entry) { return VghLantern__PdfExporter__BuildLanternSpecPage(viewState, specModel, entry.LanternIndex); };
        builders[DocumentState.KIND_LANTERN_CUTLIST]  =  function(entry) { return VghLantern__PdfExporter__BuildLanternCuttingListPage(specModel, entry.LanternIndex); };
        builders[DocumentState.KIND_DRAWING_TERMS]    =  function()      { return VghLantern__PdfExporter__BuildDrawingTermsPage(); };
        builders[DocumentState.KIND_TERMS]            =  function()      { return VghLantern__PdfExporter__BuildTermsPage(); };

        var pages         =  [];
        var missingSheets =  0;
        var i, page;

        for (i = 0; i < plan.length; i++) {
            if (!builders[plan[i].Kind]) continue;
            page  =  builders[plan[i].Kind](plan[i]);

            // A drawing the user asked for that cannot be composed is a blocking
            // problem, not a page to quietly leave out of an issued document. Counted
            // rather than refused on the spot so the message can name how many, which
            // on a four-lantern job is the difference between a useful report and a
            // user re-exporting three times to find them all.
            if (!page && plan[i].Kind === DocumentState.KIND_LANTERN_DRAWING) {
                missingSheets++;
                continue;
            }
            if (page) pages.push(page);
        }

        if (missingSheets) {
            VghLantern__PdfExporter__ReportFailure(VghLantern__PdfExporter__IssueMessage('NoDrawingSheetMessage'));
            return false;
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
