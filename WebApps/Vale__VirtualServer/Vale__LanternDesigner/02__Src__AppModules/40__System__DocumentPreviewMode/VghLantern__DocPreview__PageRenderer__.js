/* =============================================================================
   VGHLANTERN - DOCUMENT PREVIEW | PAGE RENDERER
   =============================================================================

   FILE       : VghLantern__DocPreview__PageRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : DocPreview - PageRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Compose the paginated Preview and Send document on screen
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Owns the Preview and Send mode: toolbar, issue banner and the paginated pages.
   - Page order comes from DocPreview config (specification first, drawing sheet last
     by default). Specification pages use PrintDocumentRenderer so the preview matches
     the PDF; the drawing page is the Drawing Editor's composed sheet, built by the
     same SheetSurface the Drawing Editor itself uses.
   - Pages are sized in paper millimetres, which is what makes the preview and the PDF
     the same document rather than two lookalikes.

   -----------------------------------------------------------------------------

   WHY THE DRAWING PAGE IS NOT A PAGE THIS MODULE LAYS OUT:
   It used to be: its own view grid, its own caption strips, its own titleblock markup
   and its own paper size, none of which the Drawing Editor knew about. What the user
   approved on the sheet and what appeared here were two renderings that agreed only
   by coincidence, and stopped agreeing the moment a gutter was dragged. The drawing
   page is now the sheet, at the sheet's own paper size, baked in whole.

   WHY THERE ARE TWO PAGE SHELLS:
   A specification page is flowing text laid out in millimetres and scaled by one CSS
   transform. A drawing sheet is an absolutely positioned paper surface already built
   in pixels from its own layout. They are genuinely different objects, so each has
   its own wrapper rather than one wrapper with a mode flag inside it.

   ============================================================================= */

// =============================================================================
// REGION | Document Preview Page Renderer Module
// =============================================================================

const VghLantern__DocPreview__PageRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Identifiers and CSS Classes
    // ------------------------------------------------------------
    const DOM_MODE_PANEL     =  'VghLantern__App__ModeDocPreview';
    const DOM_CONTAINER      =  'VghLantern__DocPreview__Container';

    const CSS_TOOLBAR        =  'VghLantern__DocPreview__Toolbar';
    const CSS_TOOLBAR_GROUP  =  'VghLantern__DocPreview__ToolbarGroup';
    const CSS_TOOLBAR_LABEL  =  'VghLantern__DocPreview__ToolbarLabel';
    const CSS_TOGGLE         =  'VghLantern__DocPreview__Toggle';
    const CSS_SELECT         =  'VghLantern__DocPreview__Select';
    const CSS_BUTTON         =  'VghLantern__DocPreview__Button';
    const CSS_BUTTON_PRIMARY =  'VghLantern__DocPreview__Button--primary';

    const CSS_STAGE          =  'VghLantern__DocPreview__Stage';
    const CSS_PAGE_SCALER    =  'VghLantern__DocPreview__PageScaler';
    const CSS_PAGE           =  'VghLantern__DocPreview__Page';
    const CSS_PAGE_BODY      =  'VghLantern__DocPreview__PageBody';
    const CSS_PAGE_FOOTER    =  'VghLantern__DocPreview__PageFooter';
    const CSS_EMPTY          =  'VghLantern__DocPreview__Empty';

    const ATTR_TOGGLE_KEY    =  'data-vghlantern-preview-toggle';
    const ATTR_ACTION        =  'data-vghlantern-preview-action';
    const ATTR_TERMS_SECTION =  'data-vghlantern-terms-section';               // <-- Writes to the project, not to the per-user view state
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Browser CSS Pixels Per Millimetre
    // ------------------------------------------------------------
    // A page authored in millimetres lays out at the CSS reference of 96dpi. The
    // scale transform that takes it to the preview's own pixels-per-millimetre is
    // measured against this, so it is a unit conversion rather than a design value.
    const CSS_PIXELS_PER_MM  =  96 / 25.4;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | PDF Writer Page Kind for Flowing Pages
    // ------------------------------------------------------------
    // Every flowing page in the pack - letter, summary, notes, specification, terms -
    // foots the same way, and the writer decides that by kind. Naming the writer's
    // kind here rather than passing the plan's kind through keeps the preview footer
    // and the file footer answering to the same rule.
    const PDF_KIND_SPECIFICATION  =  'specification';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Binding and Bake Guards
    // ------------------------------------------------------------
    let VghLantern__PageRenderer__IsBound     =  false;                        // <-- Delegated toolbar listener attaches once
    let VghLantern__PageRenderer__IsBaking    =  false;                        // <-- One queued bake at a time; its completion re-renders
    let VghLantern__PageRenderer__LastBakeKey =  null;                         // <-- Schedule state the last bake was attempted against
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the DocPreview Config Block
    // ------------------------------------------------------------
    function VghLantern__PageRenderer__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('DocPreview') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__PageRenderer__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report Whether the Preview Panel Is Active
    // ------------------------------------------------------------
    function VghLantern__PageRenderer__IsModeVisible() {
        var panel  =  document.getElementById(DOM_MODE_PANEL);
        return !!(panel && panel.classList.contains('VghLantern__App__ModePanel--active'));
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Toolbar
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Content Toggle Controls
    // ------------------------------------------------------------
    function VghLantern__PageRenderer__BuildToggles() {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        if (!DocumentState) return '';

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var toolbarCfg  =  VghLantern__PageRenderer__Config()['VghLantern__DocPreview__Config__Toolbar'] || {};
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(
                toolbarCfg, 'ShowContentToggles', 'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Toolbar')) {
            return '';
        }

        var labels  =  toolbarCfg.ToggleLabels || {};
        var state   =  DocumentState.VghLantern__DocPreview__DocumentState__GetViewState();

        // One group for everything that is a page-level switch, because that is what
        // they are. The terms SECTION switches are a different kind of thing and get
        // their own group below.
        //
        // Listed in the order the pages appear in the pack, so the toolbar reads as a
        // table of contents rather than as a bag of options.
        var keys  =  DocumentState.LETTER_KEYS
            .concat(DocumentState.SUMMARY_KEYS, DocumentState.DRAWING_VIEW_KEYS,
                    DocumentState.DRAWING_NOTE_KEYS, DocumentState.DOCUMENT_KEYS,
                    DocumentState.CUTLIST_KEYS, DocumentState.DRAWING_TERMS_KEYS,
                    DocumentState.TERMS_KEYS);

        var html  =  '<div class="' + CSS_TOOLBAR_GROUP + '">' +
                     '<span class="' + CSS_TOOLBAR_LABEL + '">' +
                     VghLantern__PageRenderer__Escape(
                         ConfigLoader.VghLantern__ConfigLoader__RequireString(
                             toolbarCfg, 'DocumentGroupLabel',
                             'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Toolbar')) +
                     '</span>';
        var i, key;

        for (i = 0; i < keys.length; i++) {
            key   =  keys[i];
            html  +=  '<label class="' + CSS_TOGGLE + '">' +
                      '<input type="checkbox" ' + ATTR_TOGGLE_KEY + '="' + key + '"' +
                      (state[key] ? ' checked' : '') + '>' +
                      '<span>' + VghLantern__PageRenderer__Escape(labels[key] || key) + '</span>' +
                      '</label>';
        }

        return html + '</div>' + VghLantern__PageRenderer__BuildTermsSectionToggles();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Per-Section Terms Switches
    // ------------------------------------------------------------
    // These write to the PROJECT, not to the per-user view state, and they are the
    // same write the Client Doc tab makes. Flicking one here and opening that tab
    // shows it flicked, because there is one value rather than two copies of it.
    //
    // Hidden entirely when the terms pages are switched off, because a switch for
    // something that is not being printed is just noise on the toolbar.
    function VghLantern__PageRenderer__BuildTermsSectionToggles() {
        var ConfigLoader   =  window.VghLantern__AppCore__ConfigLoader;
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var TermsModel     =  window.VghLantern__Terms__DocumentModel;
        var StateManager   =  window.VghLantern__AppCore__StateManager;
        if (!DocumentState || !TermsModel || !StateManager) return '';

        var toolbarCfg  =  VghLantern__PageRenderer__Config()['VghLantern__DocPreview__Config__Toolbar'] || {};
        var TOOLBAR_LABEL  =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Toolbar';

        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(toolbarCfg, 'ShowTermsSectionToggles', TOOLBAR_LABEL)) return '';
        if (!DocumentState.VghLantern__DocPreview__DocumentState__IncludesTermsPages()) return '';

        var project   =  StateManager.VghLantern__StateManager__GetCurrentProject();
        var sections  =  TermsModel.VghLantern__Terms__DocumentModel__ListSections();
        if (!project || !sections.length) return '';

        var html  =  '<div class="' + CSS_TOOLBAR_GROUP + '">' +
                     '<span class="' + CSS_TOOLBAR_LABEL + '">' +
                     VghLantern__PageRenderer__Escape(
                         ConfigLoader.VghLantern__ConfigLoader__RequireString(toolbarCfg, 'TermsGroupLabel', TOOLBAR_LABEL)) +
                     '</span>';
        var i, isEnabled;

        for (i = 0; i < sections.length; i++) {
            isEnabled  =  TermsModel.VghLantern__Terms__DocumentModel__IsSectionEnabled(project, sections[i].Key);

            html  +=  '<label class="' + CSS_TOGGLE + '">' +
                      '<input type="checkbox" ' + ATTR_TERMS_SECTION + '="' +
                      VghLantern__PageRenderer__Escape(sections[i].Key) + '"' +
                      (isEnabled ? ' checked' : '') + '>' +
                      '<span>' + VghLantern__PageRenderer__Escape(sections[i].Number + ' ' + sections[i].Label) + '</span>' +
                      '</label>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Paper Size and Action Controls
    // ------------------------------------------------------------
    // The paper selector governs the specification pages only. The drawing sheet
    // carries its own paper size over from the Drawing Editor, which is why the
    // control is labelled Document Paper rather than Paper.
    function VghLantern__PageRenderer__BuildActions() {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var config         =  VghLantern__PageRenderer__Config();
        var toolbarCfg     =  config['VghLantern__DocPreview__Config__Toolbar'] || {};
        var pageCfg        =  config['VghLantern__DocPreview__Config__Page'] || {};

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var TOOLBAR_LABEL =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Toolbar';

        var html  =  '<div class="' + CSS_TOOLBAR_GROUP + '">';

        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(toolbarCfg, 'ShowPaperSizeSelector', TOOLBAR_LABEL) && DocumentState) {
            var page   =  DocumentState.VghLantern__DocPreview__DocumentState__DescribePage();
            var sizes  =  pageCfg.PaperSizesMm || {};
            var sizeKey;

            html  +=  '<span class="' + CSS_TOOLBAR_LABEL + '">' +
                      VghLantern__PageRenderer__Escape(
                          ConfigLoader.VghLantern__ConfigLoader__RequireString(toolbarCfg, 'PaperSizeLabel', TOOLBAR_LABEL)) +
                      '</span>' +
                      '<select class="' + CSS_SELECT + '" ' + ATTR_ACTION + '="paperSize">';

            for (sizeKey in sizes) {
                if (!Object.prototype.hasOwnProperty.call(sizes, sizeKey)) continue;
                html  +=  '<option value="' + VghLantern__PageRenderer__Escape(sizeKey) + '"' +
                          (sizeKey === page.PaperSize ? ' selected' : '') + '>' +
                          VghLantern__PageRenderer__Escape(sizeKey) + '</option>';
            }

            html  +=  '</select>';
        }

        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(toolbarCfg, 'ShowPrintButton', TOOLBAR_LABEL)) {
            html  +=  '<button type="button" class="' + CSS_BUTTON + '" ' + ATTR_ACTION + '="print">' +
                      VghLantern__PageRenderer__Escape(ConfigLoader.VghLantern__ConfigLoader__RequireString(toolbarCfg, 'PrintLabel', TOOLBAR_LABEL)) + '</button>';
        }

        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(toolbarCfg, 'ShowExportPdfButton', TOOLBAR_LABEL)) {
            html  +=  '<button type="button" class="' + CSS_BUTTON + ' ' + CSS_BUTTON_PRIMARY + '" ' +
                      ATTR_ACTION + '="exportPdf">' +
                      VghLantern__PageRenderer__Escape(ConfigLoader.VghLantern__ConfigLoader__RequireString(toolbarCfg, 'ExportPdfLabel', TOOLBAR_LABEL)) + '</button>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Whole Toolbar
    // ------------------------------------------------------------
    function VghLantern__PageRenderer__BuildToolbar() {
        return '<div class="' + CSS_TOOLBAR + '">' +
               VghLantern__PageRenderer__BuildToggles() +
               VghLantern__PageRenderer__BuildActions() +
               '</div>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Page Shells
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Footer Strip for a Page
    // ------------------------------------------------------------
    // Read from the PDF writer's footer block, and skipped for the same page kinds
    // the writer skips, so the footer on screen is the footer in the file. The page
    // number pattern is the writer's too, which is why the total is passed in: the
    // preview now knows how many pages there are, so it can print the same
    // "Page 2 of 7" the file will rather than a bare page number.
    function VghLantern__PageRenderer__BuildFooter(pageKind, pageNumber, totalPages) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var Writer        =  window.VghLantern__PdfWriter__Document;
        if (!Writer) return '';
        if (!Writer.VghLantern__PdfWriter__Document__KindShowsFooter(pageKind)) return '';

        var FOOTER_LABEL  =  'Na__PdfWriter__Config.json -> VghLantern__PdfWriter__Config__Footer';
        var footerCfg  =  Writer.VghLantern__PdfWriter__Document__FooterConfig();
        var footerText =  ConfigLoader.VghLantern__ConfigLoader__RequireString(footerCfg, 'FooterText',       FOOTER_LABEL);
        var pattern    =  ConfigLoader.VghLantern__ConfigLoader__RequireString(footerCfg, 'PageNumberFormat', FOOTER_LABEL);

        return '<div class="' + CSS_PAGE_FOOTER + '">' +
               '<span>' + VghLantern__PageRenderer__Escape(footerText) + '</span>' +
               '<span>' + VghLantern__PageRenderer__Escape(
                   pattern.replace('{page}', String(pageNumber)).replace('{total}', String(totalPages))) +
               '</span></div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Wrap Flowing Content in a Scaled Paper Page
    // ------------------------------------------------------------
    // The page is laid out in millimetres and scaled once by a CSS transform, so the
    // same numbers drive the PDF.
    function VghLantern__PageRenderer__WrapFlowingPage(page, bodyHtml, pageKind, pageNumber, totalPages) {
        var scaledW  =  page.WidthMm  * page.PxPerMm;
        var scaledH  =  page.HeightMm * page.PxPerMm;

        return '<div class="' + CSS_PAGE_SCALER + '" style="width:' + scaledW + 'px;height:' + scaledH + 'px;">' +
               '<div class="' + CSS_PAGE + '" style="width:' + page.WidthMm + 'mm;height:' + page.HeightMm + 'mm;' +
               'padding:' + page.MarginMm + 'mm;transform:scale(' + (page.PxPerMm / CSS_PIXELS_PER_MM) + ');">' +
               '<div class="' + CSS_PAGE_BODY + '">' + bodyHtml + '</div>' +
               VghLantern__PageRenderer__BuildFooter(pageKind, pageNumber, totalPages) +
               '</div></div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Wrap a Built Drawing Sheet in the Page Stage
    // ------------------------------------------------------------
    // The sheet arrives already sized in pixels from its own paper millimetres, and
    // the Drawing Editor stylesheet already gives it the paper's white, its outline
    // and its shadow. It needs no page shell of its own - it is the page.
    function VghLantern__PageRenderer__WrapSheetPage(sheetHtml, widthPx, heightPx) {
        return '<div class="' + CSS_PAGE_SCALER + '" style="width:' + widthPx + 'px;height:' + heightPx + 'px;">' +
               sheetHtml +
               '</div>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Page Bodies
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Drawing Sheet Page for One Lantern
    // ------------------------------------------------------------
    // Built by the Drawing Editor's own SheetSurface from that lantern's own solved
    // layout, with its composed views baked into the frames. Nothing about the sheet
    // is decided here, which is the whole point.
    function VghLantern__PageRenderer__BuildDrawingPage(sheet) {
        var SheetSurface  =  window.VghLantern__DrawingEditor__SheetSurface;
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var SheetChrome   =  window.VghLantern__DrawingEditor__SheetChrome;

        if (!SheetSurface || !sheet || !sheet.Layout) {
            return '<div class="' + CSS_PAGE_SCALER + '"><p class="' + CSS_EMPTY + '">' +
                   'This drawing has not been composed yet.' +
                   '</p></div>';
        }

        var pageCfg  =  VghLantern__PageRenderer__Config()['VghLantern__DocPreview__Config__Page'] || {};
        var pxPerMm  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            pageCfg, 'ScreenPixelsPerMm', 'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Page');

        var sheetHtml  =  SheetSurface.VghLantern__DrawingEditor__SheetSurface__BuildHtml(sheet.Layout, {
            PixelsPerMm       : pxPerMm,
            Project           : sheet.Project,
            Lantern           : sheet.Lantern,
            LanternIndex      : sheet.LanternIndex,
            ScaleLabel        : sheet.ScaleLabel,                              // <-- The scale this sheet was composed at, not the editor's current one
            LogoAsset         : SheetChrome ? SheetChrome.VghLantern__DrawingEditor__SheetChrome__CachedLogo() : null,
            SlotContentHtml   : SheetSurface.VghLantern__DrawingEditor__SheetSurface__BuildBakedSlotContent(sheet),
            ShowResizeHandles : false                                          // <-- A preview page is read, not composed
        });

        return VghLantern__PageRenderer__WrapSheetPage(
            sheetHtml, sheet.Layout.Page.WidthMm * pxPerMm, sheet.Layout.Page.HeightMm * pxPerMm
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Lantern's Drawing Notes Body
    // ------------------------------------------------------------
    // Rendered by the terms screen renderer from a terms model, because a drawing
    // notes page is a numbered note list - the same object a terms document is, from
    // a different source. Returns an empty string for a lantern with no notes, which
    // the plan should already have excluded.
    function VghLantern__PageRenderer__BuildLanternNotesBody(lanternIndex) {
        var StateManager   =  window.VghLantern__AppCore__StateManager;
        var TermsModel     =  window.VghLantern__Terms__DocumentModel;
        var TermsRenderer  =  window.VghLantern__Terms__ScreenRenderer;
        if (!StateManager || !TermsModel || !TermsRenderer) {
            return '<p class="' + CSS_EMPTY + '">No drawing notes available.</p>';
        }

        var project   =  StateManager.VghLantern__StateManager__GetCurrentProject();
        var lanterns  =  (project && Array.isArray(project['VghLantern__ProjectFile__Lanterns']))
            ? project['VghLantern__ProjectFile__Lanterns'] : [];

        var model  =  TermsModel.VghLantern__Terms__DocumentModel__BuildLanternDrawingTerms(
            project, lanterns[lanternIndex], lanternIndex
        );

        return model
            ? TermsRenderer.VghLantern__Terms__ScreenRenderer__BuildHtml(model)
            : '<p class="' + CSS_EMPTY + '">This lantern has no drawing notes.</p>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Body of One Flowing Page
    // ------------------------------------------------------------
    // Returns the whole of that page's content as one unbroken body. Splitting it
    // across pages is the paginator's job, further down, because that needs measuring
    // and this does not. Each renderer here is the same one that feeds the matching
    // PDF painter, which is what keeps the preview and the file the same document.
    function VghLantern__PageRenderer__BuildFlowingBody(entry) {
        var LetterRenderer  =  window.VghLantern__ClientDoc__LetterScreenRenderer;
        var TermsRenderer   =  window.VghLantern__Terms__ScreenRenderer;
        var TermsModel      =  window.VghLantern__Terms__DocumentModel;
        var PrintDocument   =  window.VghLantern__DocPreview__PrintDocumentRenderer;
        var DocumentState   =  window.VghLantern__DocPreview__DocumentState;
        if (!DocumentState) return '';

        var viewState  =  DocumentState.VghLantern__DocPreview__DocumentState__GetViewState();

        if (entry.Kind === DocumentState.KIND_WELCOME_LETTER) {
            return LetterRenderer
                ? LetterRenderer.VghLantern__ClientDoc__LetterScreenRenderer__BuildFromState()
                : '<p class="' + CSS_EMPTY + '">No welcome letter available.</p>';
        }

        if (entry.Kind === DocumentState.KIND_TERMS) {
            return TermsRenderer
                ? TermsRenderer.VghLantern__Terms__ScreenRenderer__BuildFromState()
                : '<p class="' + CSS_EMPTY + '">No terms document available.</p>';
        }

        if (entry.Kind === DocumentState.KIND_DRAWING_TERMS) {
            return (TermsRenderer && TermsModel)
                ? TermsRenderer.VghLantern__Terms__ScreenRenderer__BuildHtml(
                      TermsModel.VghLantern__Terms__DocumentModel__BuildDrawingTermsFromState())
                : '<p class="' + CSS_EMPTY + '">No drawing terms available.</p>';
        }

        if (entry.Kind === DocumentState.KIND_LANTERN_NOTES) {
            return VghLantern__PageRenderer__BuildLanternNotesBody(entry.LanternIndex);
        }

        if (!PrintDocument) return '<p class="' + CSS_EMPTY + '">No specification content available.</p>';

        // Specification. Uses the print-faithful renderer (same model path as the PDF
        // painter), not the Specification Mode card UI.
        if (entry.Kind === DocumentState.KIND_LANTERN_SPEC) {
            return PrintDocument.VghLantern__DocPreview__PrintDocumentRenderer__BuildLanternSpecificationHtml(
                viewState, entry.LanternIndex
            );
        }

        if (entry.Kind === DocumentState.KIND_LANTERN_CUTLIST) {
            return PrintDocument.VghLantern__DocPreview__PrintDocumentRenderer__BuildLanternCuttingListHtml(
                viewState, entry.LanternIndex
            );
        }

        return PrintDocument.VghLantern__DocPreview__PrintDocumentRenderer__BuildProjectSummaryHtml(viewState);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // FUNCTION | Render the Whole Preview Mode
    // ------------------------------------------------------------
    // Returns whether a drawing bake is still running when this returns. Mode entry
    // needs that answer: it opened the overlay before any of this started, and if no
    // bake follows there is nothing left to close it.
    function VghLantern__DocPreview__PageRenderer__Render() {
        var container  =  document.getElementById(DOM_CONTAINER);
        if (!container) return false;

        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var IssueHandler   =  window.VghLantern__DocPreview__DocIssueHandler;
        if (!DocumentState) return false;

        var bannerHtml  =  IssueHandler
            ? IssueHandler.VghLantern__DocPreview__DocIssueHandler__BuildBanner(
                  IssueHandler.VghLantern__DocPreview__DocIssueHandler__Collect())
            : '';

        var Paginator  =  window.VghLantern__DocPreview__FlowPaginator;
        var SheetBaker =  window.VghLantern__DrawingEditor__SheetBaker;
        var plan       =  DocumentState.VghLantern__DocPreview__DocumentState__BuildPagePlan();

        // Read rather than awaited: this render is synchronous, and a preview that
        // blanks for four seconds while a pack rasterises is worse than one that
        // paints immediately and fills its drawings in. Anything not yet composed
        // shows as a pending page, and the bake queued below re-renders when it lands.
        var bakedSheets  =  SheetBaker
            ? SheetBaker.VghLantern__DrawingEditor__SheetBaker__PeekAll()
            : [];

        // PASS ONE | Work out what the physical pages are.
        // Flowing kinds are measured and cut into as many pages as they need; a
        // drawing sheet is always exactly one. Nothing is wrapped yet, because a
        // footer cannot say "of 7" until the 7 is known - the same reason the PDF
        // writer stamps its footers only after every painter has finished.
        var slots  =  [];
        var i, entry, page, body, bodies, b;

        for (i = 0; i < plan.length; i++) {
            entry  =  plan[i];

            if (entry.Kind === DocumentState.KIND_LANTERN_DRAWING) {
                slots.push({
                    IsSheet : true,
                    Kind    : entry.Kind,
                    Html    : VghLantern__PageRenderer__BuildDrawingPage(bakedSheets[entry.LanternIndex])
                });
                continue;
            }

            page  =  DocumentState.VghLantern__DocPreview__DocumentState__DescribePage();
            body  =  VghLantern__PageRenderer__BuildFlowingBody(entry);

            bodies  =  Paginator
                ? Paginator.VghLantern__DocPreview__FlowPaginator__Split(body, page)
                : [body];

            for (b = 0; b < bodies.length; b++) {
                slots.push({ IsSheet : false, Kind : entry.Kind, Page : page, Body : bodies[b] });
            }
        }

        // PASS TWO | Wrap each page now the total is known.
        //
        // The page kind passed to the footer is the writer's own kind name, not the
        // plan's: the writer decides footer eligibility by kind, and a drawing sheet
        // carries its own titleblock rather than a running footer whatever the plan
        // calls it.
        var pagesHtml  =  '';

        for (i = 0; i < slots.length; i++) {
            pagesHtml  +=  slots[i].IsSheet
                ? slots[i].Html
                : VghLantern__PageRenderer__WrapFlowingPage(
                      slots[i].Page, slots[i].Body, PDF_KIND_SPECIFICATION, i + 1, slots.length);
        }

        container.innerHTML  =  VghLantern__PageRenderer__BuildToolbar() +
                                bannerHtml +
                                '<div class="' + CSS_STAGE + '">' + pagesHtml + '</div>';

        return VghLantern__PageRenderer__QueueSheetBake();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Describe What a Bake Would Currently Be Working From
    // ------------------------------------------------------------
    // The project's lantern schedule serialised. The baker keys its own cache the same
    // way, so two renders with the same key would produce byte-identical sheets and
    // the second bake would be pure waste.
    function VghLantern__PageRenderer__BakeKey() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;

        try {
            var project  =  StateManager.VghLantern__StateManager__GetCurrentProject();
            return JSON.stringify(project ? project['VghLantern__ProjectFile__Lanterns'] : null);
        } catch (e) {
            return null;                                                       // <-- Unserialisable: treat every render as a new attempt
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Compose Any Missing Drawings and Re-Render Once They Land
    // ------------------------------------------------------------
    // The bake is fire-and-forget: the page above is already on screen, and this fills
    // its drawings in when they are ready.
    //
    // Gated on the schedule having CHANGED since the last attempt, not on the pack
    // being incomplete. A lantern whose geometry cannot be solved never produces a
    // sheet, so "incomplete" would stay true forever - and since the bake re-renders
    // on completion, and the render queues a bake, that is an infinite loop rather
    // than a missing drawing. Attempting once per state of the schedule means an
    // unbakeable lantern is reported by the issue banner and left alone until
    // something about it actually changes.
    // Returns whether a bake is now running, which is also the answer to "is anything
    // still going to close the overlay".
    function VghLantern__PageRenderer__QueueSheetBake() {
        var SheetBaker  =  window.VghLantern__DrawingEditor__SheetBaker;
        var Overlay     =  window.VghLantern__DocPreview__ProgressOverlay;
        if (!SheetBaker) return false;
        if (VghLantern__PageRenderer__IsBaking) return true;                    // <-- One already running will close it
        if (SheetBaker.VghLantern__DrawingEditor__SheetBaker__IsComplete()) return false;

        var key  =  VghLantern__PageRenderer__BakeKey();
        if (key !== null && key === VghLantern__PageRenderer__LastBakeKey) return false;

        VghLantern__PageRenderer__IsBaking     =  true;
        VghLantern__PageRenderer__LastBakeKey  =  key;

        // Usually already open: mode entry raises it before any of this mode's work
        // starts, which is the only way it gets painted before the main thread seizes
        // up. This covers the other routes in - a geometry solve, a toolbar toggle -
        // where a bake becomes necessary with nothing on screen to say so.
        if (Overlay) Overlay.VghLantern__DocPreview__ProgressOverlay__Open();

        var onProgress  =  Overlay
            ? Overlay.VghLantern__DocPreview__ProgressOverlay__Update
            : null;

        // HELPER | Repaint the finished pack, then lift the overlay off it
        //
        // Repaint FIRST. Closing starts a hold and then a fade, and the pack has to be
        // on screen before that fade uncovers it - otherwise the overlay lifts on the
        // pending pages it was raised to hide, and the finished ones appear a second
        // later with nothing to explain them.
        function finish(isError) {
            VghLantern__PageRenderer__IsBaking  =  false;

            if (!isError && VghLantern__PageRenderer__IsModeVisible()) {
                VghLantern__DocPreview__PageRenderer__Render();
            }
            if (Overlay) Overlay.VghLantern__DocPreview__ProgressOverlay__Close({ IsError : isError });
        }

        void SheetBaker.VghLantern__DrawingEditor__SheetBaker__BakeAll(onProgress).then(function() {
            finish(false);
        }, function(bakeError) {
            console.error('[VghLantern__DocPreview__PageRenderer] Drawing bake failed:', bakeError);
            finish(true);
        });

        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Wiring
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Handle a Toolbar Action
    // ------------------------------------------------------------
    function VghLantern__PageRenderer__HandleAction(action, element) {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var PdfExporter    =  window.VghLantern__DocPreview__PdfExporter;

        if (action === 'paperSize' && DocumentState) {
            DocumentState.VghLantern__DocPreview__DocumentState__SetPaperSize(element.value);
            VghLantern__DocPreview__PageRenderer__Render();
            return;
        }

        if (action === 'print') {
            window.print();
            return;
        }

        if (action === 'exportPdf' && PdfExporter) {
            void PdfExporter.VghLantern__DocPreview__PdfExporter__Export();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind the Delegated Toolbar Listeners
    // ------------------------------------------------------------
    function VghLantern__DocPreview__PageRenderer__Init() {
        if (VghLantern__PageRenderer__IsBound) return;

        var container  =  document.getElementById(DOM_CONTAINER);
        if (!container) return;

        container.addEventListener('change', function(e) {
            var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
            var toggleKey      =  e.target.getAttribute ? e.target.getAttribute(ATTR_TOGGLE_KEY) : null;

            if (toggleKey && DocumentState) {
                var patch  =  {};
                patch[toggleKey]  =  !!e.target.checked;
                DocumentState.VghLantern__DocPreview__DocumentState__SetViewStatePartial(patch);
                VghLantern__DocPreview__PageRenderer__Render();
                return;
            }

            // A terms section switch is document content, not a view preference, so it
            // is written onto the project through the terms model. That is the same
            // call the Client Doc tab makes, which is what keeps the two in step.
            var sectionKey  =  e.target.getAttribute ? e.target.getAttribute(ATTR_TERMS_SECTION) : null;
            if (sectionKey) {
                var TermsModel    =  window.VghLantern__Terms__DocumentModel;
                var StateManager  =  window.VghLantern__AppCore__StateManager;

                if (TermsModel && StateManager) {
                    TermsModel.VghLantern__Terms__DocumentModel__SetSectionEnabled(
                        StateManager.VghLantern__StateManager__GetCurrentProject(), sectionKey, !!e.target.checked);
                    VghLantern__DocPreview__PageRenderer__Render();
                }
                return;
            }

            var action  =  e.target.getAttribute ? e.target.getAttribute(ATTR_ACTION) : null;
            if (action) VghLantern__PageRenderer__HandleAction(action, e.target);
        });

        container.addEventListener('click', function(e) {
            var button  =  e.target.closest ? e.target.closest('[' + ATTR_ACTION + ']') : null;
            if (!button || button.tagName === 'SELECT') return;

            VghLantern__PageRenderer__HandleAction(button.getAttribute(ATTR_ACTION), button);
        });

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (StateManager) {
            StateManager.VghLantern__StateManager__On('geometrySolved', function() {
                if (VghLantern__PageRenderer__IsModeVisible()) VghLantern__DocPreview__PageRenderer__Render();
            });
        }

        VghLantern__PageRenderer__IsBound  =  true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DocPreview__PageRenderer__Init   : VghLantern__DocPreview__PageRenderer__Init,
        VghLantern__DocPreview__PageRenderer__Render : VghLantern__DocPreview__PageRenderer__Render
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__PageRenderer  =  VghLantern__DocPreview__PageRenderer;
