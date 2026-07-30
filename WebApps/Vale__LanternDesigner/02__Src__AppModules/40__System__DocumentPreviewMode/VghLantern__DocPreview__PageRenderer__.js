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
     by default). Drawing views rebuild from the Drawing Editor sheet description;
     specification pages use PrintDocumentRenderer so the preview matches the PDF.
   - Pages are sized in paper millimetres and scaled to screen by a single CSS
     transform, which is what makes the preview and the PDF the same document.

   -----------------------------------------------------------------------------

   WHY THE DRAWING PAGE IS REBUILT RATHER THAN CLONED:
   Cloning the Drawing Editor's live sheet would drag its interactive scaffolding and
   its own paper size along with it. Rebuilding from the serialised views means the
   preview controls its own page size and can drop views the user switched off.

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
    const CSS_VIEW_GRID      =  'VghLantern__DocPreview__ViewGrid';
    const CSS_VIEW_FRAME     =  'VghLantern__DocPreview__ViewFrame';
    const CSS_VIEW_LABEL     =  'VghLantern__DocPreview__ViewLabel';
    const CSS_VIEW_BODY      =  'VghLantern__DocPreview__ViewBody';
    const CSS_TITLE_HOST     =  'VghLantern__DocPreview__TitleHost';
    const CSS_EMPTY          =  'VghLantern__DocPreview__Empty';

    const ATTR_TOGGLE_KEY    =  'data-vghlantern-preview-toggle';
    const ATTR_ACTION        =  'data-vghlantern-preview-action';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Binding Guard
    // ------------------------------------------------------------
    let VghLantern__PageRenderer__IsBound  =  false;                           // <-- Delegated toolbar listener attaches once
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


    // HELPER FUNCTION | Get the Drawing Editor Config Block
    // ------------------------------------------------------------
    function VghLantern__PageRenderer__DrawingConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
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

        var toolbarCfg  =  VghLantern__PageRenderer__Config()['VghLantern__DocPreview__Config__Toolbar'] || {};
        if (toolbarCfg.ShowContentToggles === false) return '';

        var labels  =  toolbarCfg.ToggleLabels || {};
        var state   =  DocumentState.VghLantern__DocPreview__DocumentState__GetViewState();
        var groups  =  [
            { Label : 'Drawing Views', Keys : DocumentState.DRAWING_VIEW_KEYS },
            { Label : 'Document',      Keys : DocumentState.DOCUMENT_KEYS }
        ];

        var html  =  '';
        var g, i, key;

        for (g = 0; g < groups.length; g++) {
            html  +=  '<div class="' + CSS_TOOLBAR_GROUP + '">' +
                      '<span class="' + CSS_TOOLBAR_LABEL + '">' + groups[g].Label + '</span>';

            for (i = 0; i < groups[g].Keys.length; i++) {
                key   =  groups[g].Keys[i];
                html  +=  '<label class="' + CSS_TOGGLE + '">' +
                          '<input type="checkbox" ' + ATTR_TOGGLE_KEY + '="' + key + '"' +
                          (state[key] ? ' checked' : '') + '>' +
                          '<span>' + VghLantern__PageRenderer__Escape(labels[key] || key) + '</span>' +
                          '</label>';
            }

            html  +=  '</div>';
        }

        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Paper Size and Action Controls
    // ------------------------------------------------------------
    function VghLantern__PageRenderer__BuildActions() {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var config         =  VghLantern__PageRenderer__Config();
        var toolbarCfg     =  config['VghLantern__DocPreview__Config__Toolbar'] || {};
        var pageCfg        =  config['VghLantern__DocPreview__Config__Page'] || {};

        var html  =  '<div class="' + CSS_TOOLBAR_GROUP + '">';

        if (toolbarCfg.ShowPaperSizeSelector !== false && DocumentState) {
            var page   =  DocumentState.VghLantern__DocPreview__DocumentState__DescribePage();
            var sizes  =  pageCfg.PaperSizesMm || {};
            var sizeKey;

            html  +=  '<span class="' + CSS_TOOLBAR_LABEL + '">Paper</span>' +
                      '<select class="' + CSS_SELECT + '" ' + ATTR_ACTION + '="paperSize">';

            for (sizeKey in sizes) {
                if (!Object.prototype.hasOwnProperty.call(sizes, sizeKey)) continue;
                html  +=  '<option value="' + VghLantern__PageRenderer__Escape(sizeKey) + '"' +
                          (sizeKey === page.PaperSize ? ' selected' : '') + '>' +
                          VghLantern__PageRenderer__Escape(sizeKey) + '</option>';
            }

            html  +=  '</select>';
        }

        if (toolbarCfg.ShowPrintButton !== false) {
            html  +=  '<button type="button" class="' + CSS_BUTTON + '" ' + ATTR_ACTION + '="print">' +
                      VghLantern__PageRenderer__Escape(toolbarCfg.PrintLabel || 'Print') + '</button>';
        }

        if (toolbarCfg.ShowExportPdfButton !== false) {
            html  +=  '<button type="button" class="' + CSS_BUTTON + ' ' + CSS_BUTTON_PRIMARY + '" ' +
                      ATTR_ACTION + '="exportPdf">' +
                      VghLantern__PageRenderer__Escape(toolbarCfg.ExportPdfLabel || 'Export PDF') + '</button>';
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
// REGION | Page Shell
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Wrap Page Content in a Scaled Paper Sheet
    // ------------------------------------------------------------
    // The page is laid out in millimetres and scaled once by a CSS transform. Layout
    // stays in paper units so the same numbers drive the PDF.
    function VghLantern__PageRenderer__WrapPage(page, bodyHtml, pageNumber) {
        var pdfCfg      =  VghLantern__PageRenderer__Config()['VghLantern__DocPreview__Config__Pdf'] || {};
        var scaledW     =  page.WidthMm  * page.PxPerMm;
        var scaledH     =  page.HeightMm * page.PxPerMm;

        var footerHtml  =  '';
        if (pdfCfg.ShowPageNumbers !== false) {
            footerHtml  =  '<div class="' + CSS_PAGE_FOOTER + '">' +
                           '<span>' + VghLantern__PageRenderer__Escape(pdfCfg.FooterText || '') + '</span>' +
                           '<span>Page ' + pageNumber + '</span>' +
                           '</div>';
        }

        return '<div class="' + CSS_PAGE_SCALER + '" style="width:' + scaledW + 'px;height:' + scaledH + 'px;">' +
               '<div class="' + CSS_PAGE + '" style="width:' + page.WidthMm + 'mm;height:' + page.HeightMm + 'mm;' +
               'padding:' + page.MarginMm + 'mm;transform:scale(' + (page.PxPerMm / (96 / 25.4)) + ');">' +
               '<div class="' + CSS_PAGE_BODY + '">' + bodyHtml + '</div>' +
               footerHtml +
               '</div></div>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing Page
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Resolve the Slots to Print, in Config Order
    // ------------------------------------------------------------
    // Config order is honoured rather than toggle order, so the sheet layout stays
    // recognisable however the user ticks the boxes.
    function VghLantern__PageRenderer__ResolvePrintedSlots() {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        if (!DocumentState) return [];

        var enabled  =  DocumentState.VghLantern__DocPreview__DocumentState__ListEnabledSlotKeys();
        var slots    =  VghLantern__PageRenderer__DrawingConfig()['VghLantern__DrawingEditor__Config__ViewSlots'] || [];

        return slots.filter(function(slot) { return enabled.indexOf(slot.Key) !== -1; });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One View Frame for the Drawing Page
    // ------------------------------------------------------------
    function VghLantern__PageRenderer__BuildViewFrame(slot, sheet) {
        var content  =  '';

        if (slot.Source === 'env3d') {
            var dataUrl  =  sheet.ViewSnapshots ? sheet.ViewSnapshots[slot.Key] : null;
            content  =  dataUrl
                ? '<img src="' + dataUrl + '" alt="' + VghLantern__PageRenderer__Escape(slot.Label || '3D view') + '">'
                : '<p class="' + CSS_EMPTY + '">3D view unavailable</p>';
        } else {
            var markup  =  sheet.ViewSvgMarkup ? sheet.ViewSvgMarkup[slot.Key] : null;
            content  =  markup || '<p class="' + CSS_EMPTY + '">View not composed</p>';
        }

        var scaleNote  =  (slot.ShowScale !== false && sheet.ScaleLabel)
            ? ' <span>' + VghLantern__PageRenderer__Escape(sheet.ScaleLabel) + '</span>'
            : '';

        return '<div class="' + CSS_VIEW_FRAME + '">' +
               '<div class="' + CSS_VIEW_LABEL + '">' +
               '<span>' + VghLantern__PageRenderer__Escape(slot.Label || slot.Key) + '</span>' + scaleNote +
               '</div>' +
               '<div class="' + CSS_VIEW_BODY + '">' + content + '</div>' +
               '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Drawing Page Body
    // ------------------------------------------------------------
    function VghLantern__PageRenderer__BuildDrawingBody(sheet) {
        var TitleBlock  =  window.VghLantern__DrawingEditor__TitleBlockRenderer;
        var Annotations =  window.VghLantern__DrawingEditor__AnnotationLayer;

        var slots  =  VghLantern__PageRenderer__ResolvePrintedSlots();
        var html   =  '<div class="' + CSS_VIEW_GRID + '">';
        var i;

        for (i = 0; i < slots.length; i++) {
            html  +=  VghLantern__PageRenderer__BuildViewFrame(slots[i], sheet);
        }

        html  +=  '</div>';

        if (Annotations) {
            html  +=  Annotations.VghLantern__DrawingEditor__AnnotationLayer__BuildMarkup(sheet.Project);
        }

        if (TitleBlock) {
            var sheetCfg  =  VghLantern__PageRenderer__DrawingConfig()['VghLantern__DrawingEditor__Config__Sheet'] || {};
            var titleMm   =  (typeof sheetCfg.TitleBlockHeightMm === 'number') ? sheetCfg.TitleBlockHeightMm : 10;

            html  +=  '<div class="' + CSS_TITLE_HOST + '" style="height:' + titleMm + 'mm">' +
                      TitleBlock.VghLantern__DrawingEditor__TitleBlockRenderer__BuildMarkup(sheet.Project, sheet.Lantern) +
                      '</div>';
        }

        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Specification Pages
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Specification Page Body
    // ------------------------------------------------------------
    // Uses the print-faithful renderer (same model path as PdfExporter), not the
    // Specification Mode card UI. Toggles filter which takeoff sections print.
    function VghLantern__PageRenderer__BuildSpecificationBody() {
        var PrintDocument  =  window.VghLantern__DocPreview__PrintDocumentRenderer;
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        if (!PrintDocument || !DocumentState) {
            return '<p class="' + CSS_EMPTY + '">No specification content available.</p>';
        }

        return PrintDocument.VghLantern__DocPreview__PrintDocumentRenderer__BuildSpecificationHtml(
            DocumentState.VghLantern__DocPreview__DocumentState__GetViewState()
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build One Page Kind Into Scaled Paper Markup
    // ------------------------------------------------------------
    function VghLantern__PageRenderer__BuildPageKind(kind, pageNumber) {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        if (!DocumentState) return '';

        if (kind === 'drawing') {
            var SheetManager  =  window.VghLantern__DrawingEditor__SheetManager;
            var sheet         =  SheetManager
                ? SheetManager.VghLantern__DrawingEditor__SheetManager__DescribeSheet()
                : { ViewSvgMarkup: {}, ViewSnapshots: {}, ScaleLabel: '' };

            var drawingPage  =  DocumentState.VghLantern__DocPreview__DocumentState__DescribePage(
                DocumentState.VghLantern__DocPreview__DocumentState__DrawingOrientation()
            );

            return VghLantern__PageRenderer__WrapPage(
                drawingPage, VghLantern__PageRenderer__BuildDrawingBody(sheet), pageNumber
            );
        }

        if (kind === 'specification') {
            var specPage  =  DocumentState.VghLantern__DocPreview__DocumentState__DescribePage(null);
            return VghLantern__PageRenderer__WrapPage(
                specPage, VghLantern__PageRenderer__BuildSpecificationBody(), pageNumber
            );
        }

        return '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Whole Preview Mode
    // ------------------------------------------------------------
    function VghLantern__DocPreview__PageRenderer__Render() {
        var container  =  document.getElementById(DOM_CONTAINER);
        if (!container) return;

        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var IssueHandler   =  window.VghLantern__DocPreview__DocIssueHandler;
        if (!DocumentState) return;

        var issues     =  IssueHandler ? IssueHandler.VghLantern__DocPreview__DocIssueHandler__Collect() : [];
        var bannerHtml =  IssueHandler ? IssueHandler.VghLantern__DocPreview__DocIssueHandler__BuildBanner(issues) : '';

        var pageKinds   =  DocumentState.VghLantern__DocPreview__DocumentState__ListPageKinds();
        var pagesHtml   =  '';
        var pageNumber  =  1;
        var i;

        for (i = 0; i < pageKinds.length; i++) {
            pagesHtml  +=  VghLantern__PageRenderer__BuildPageKind(pageKinds[i], pageNumber);
            pageNumber++;
        }

        container.innerHTML  =  VghLantern__PageRenderer__BuildToolbar() +
                                bannerHtml +
                                '<div class="' + CSS_STAGE + '">' + pagesHtml + '</div>';
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
