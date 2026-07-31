/* =============================================================================
   VGHLANTERN - DOCUMENT PREVIEW | PRINT DOCUMENT RENDERER
   =============================================================================

   FILE       : VghLantern__DocPreview__PrintDocumentRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : DocPreview - PrintDocumentRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build PDF-faithful HTML for the Preview and Send specification pages
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Renders the specification document for Preview and Send using the same
     DocumentModel and section sequence as PdfExporter.
   - Specification Mode keeps its interactive card abstractions; this module is the
     print-faithful surface so on-screen preview matches the exported PDF.
   - Tables reuse TakeoffTableRenderer so column config stays a single source of truth.

   ============================================================================= */

// =============================================================================
// REGION | Document Preview Print Document Renderer Module
// =============================================================================

const VghLantern__DocPreview__PrintDocumentRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_ROOT       =  'VghLantern__DocPreview__PrintDoc';
    const CSS_TITLE      =  'VghLantern__DocPreview__PrintDocTitle';
    const CSS_META       =  'VghLantern__DocPreview__PrintDocMeta';
    const CSS_HEADING    =  'VghLantern__DocPreview__PrintDocHeading';
    const CSS_HEADING_ERROR   =  'VghLantern__DocPreview__PrintDocHeading--error';
    const CSS_PARAGRAPH  =  'VghLantern__DocPreview__PrintDocParagraph';
    const CSS_WARNINGS   =  'VghLantern__DocPreview__PrintDocWarnings';
    const CSS_USER_WARNINGS  =  'VghLantern__DocPreview__PrintDocUserWarnings';
    const CSS_EMPTY      =  'VghLantern__DocPreview__Empty';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Specification Config Block
    // ------------------------------------------------------------
    function VghLantern__PrintDocument__SpecConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('Specification') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__PrintDocument__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Heading Element
    // ------------------------------------------------------------
    // isError adds the red modifier class, used only for the staff-authored
    // Document Warnings heading so it reads as urgent against the brand-blue
    // headings used everywhere else in the document.
    function VghLantern__PrintDocument__Heading(text, isError) {
        var cls  =  CSS_HEADING + (isError ? ' ' + CSS_HEADING_ERROR : '');
        return '<h3 class="' + cls + '">' + VghLantern__PrintDocument__Escape(text) + '</h3>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Body Paragraph
    // ------------------------------------------------------------
    function VghLantern__PrintDocument__Paragraph(text) {
        if (!text) return '';
        return '<p class="' + CSS_PARAGRAPH + '">' + VghLantern__PrintDocument__Escape(text) + '</p>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Builders
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build Warning List Markup
    // ------------------------------------------------------------
    function VghLantern__PrintDocument__BuildWarnings(warnings) {
        if (!warnings || !warnings.length) return '';

        var html  =  VghLantern__PrintDocument__Heading('Warnings') +
                     '<ul class="' + CSS_WARNINGS + '">';
        var i;

        for (i = 0; i < warnings.length; i++) {
            html  +=  '<li>' + VghLantern__PrintDocument__Escape(warnings[i]) + '</li>';
        }

        return html + '</ul>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Staff-Authored Document Warning List Markup
    // ------------------------------------------------------------
    // Kept separate from BuildWarnings above: this is free text a person wrote,
    // not a rule the app evaluated, so it prints in red ahead of the rule-based
    // warnings rather than merging into that list.
    function VghLantern__PrintDocument__BuildUserWarnings(warnings) {
        if (!warnings || !warnings.length) return '';

        var html  =  VghLantern__PrintDocument__Heading('Document Warnings', true) +
                     '<ul class="' + CSS_USER_WARNINGS + '">';
        var i;

        for (i = 0; i < warnings.length; i++) {
            html  +=  '<li>' + VghLantern__PrintDocument__Escape(warnings[i]) + '</li>';
        }

        return html + '</ul>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Tables for One Lantern Takeoff
    // ------------------------------------------------------------
    function VghLantern__PrintDocument__BuildLanternTakeoff(entry, viewState) {
        var Tables  =  window.VghLantern__Specification__TakeoffTableRenderer;
        if (!Tables || !entry || !entry.Takeoff) return '';

        var html  =  VghLantern__PrintDocument__Heading(entry.Title);

        if (viewState.ShowTakeoffSchedule) {
            html  +=  Tables.VghLantern__Specification__TakeoffTableRenderer__BuildLinearTable(entry.Takeoff);
            html  +=  Tables.VghLantern__Specification__TakeoffTableRenderer__BuildAreaTable(entry.Takeoff);
        }

        if (viewState.ShowComponentSchedule) {
            html  +=  Tables.VghLantern__Specification__TakeoffTableRenderer__BuildComponentTable(entry.Takeoff);
        }

        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Full Print-Faithful Specification Body
    // ------------------------------------------------------------
    // Mirrors PdfExporter__RenderSpecificationPages so Preview and Send shows the
    // same document the PDF will write, not the Specification Mode card UI.
    function VghLantern__DocPreview__PrintDocumentRenderer__BuildSpecificationHtml(viewState) {
        var DocumentModel  =  window.VghLantern__Specification__DocumentModel;
        var Tables         =  window.VghLantern__Specification__TakeoffTableRenderer;
        if (!DocumentModel || !Tables) {
            return '<p class="' + CSS_EMPTY + '">Specification modules are not available.</p>';
        }

        var model  =  DocumentModel.VghLantern__Specification__DocumentModel__BuildFromState();
        if (!model) {
            return '<p class="' + CSS_EMPTY + '">No specification content available.</p>';
        }

        var state         =  viewState || {};
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var tableCfg      =  VghLantern__PrintDocument__SpecConfig()['VghLantern__Specification__Config__Tables'] || {};
        var TABLE_LABEL   =  'Na__Specification__Config.json -> VghLantern__Specification__Config__Tables';
        var metaLine      =  [model.Meta.ProjectCode, model.Meta.ProjectName, model.Meta.ClientName]
            .filter(function(part) { return !!part; }).join('  |  ');

        var html  =  '<div class="' + CSS_ROOT + '">' +
                     '<h2 class="' + CSS_TITLE + '">' +
                     VghLantern__PrintDocument__Escape(model.Meta.DocumentTitle) + '</h2>' +
                     '<p class="' + CSS_META + '">' + VghLantern__PrintDocument__Escape(metaLine) + '</p>' +
                     VghLantern__PrintDocument__BuildUserWarnings(model.UserWarnings) +
                     VghLantern__PrintDocument__BuildWarnings(model.Warnings) +
                     VghLantern__PrintDocument__Heading('Lantern Schedule') +
                     Tables.VghLantern__Specification__TakeoffTableRenderer__BuildTable(
                         ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'ScheduleColumns', TABLE_LABEL), model.ScheduleRows, null, null
                     );

        var i;
        for (i = 0; i < model.Lanterns.length; i++) {
            html  +=  VghLantern__PrintDocument__BuildLanternTakeoff(model.Lanterns[i], state);
        }

        if (model.Aggregate && state.ShowTakeoffSchedule) {
            html  +=  VghLantern__PrintDocument__Heading('Project Totals') +
                      Tables.VghLantern__Specification__TakeoffTableRenderer__BuildAggregateTable(model.Aggregate);
        }

        if (state.ShowJobNotes && model.JobNotes) {
            html  +=  VghLantern__PrintDocument__Heading('Job Notes') +
                      VghLantern__PrintDocument__Paragraph(model.JobNotes);
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DocPreview__PrintDocumentRenderer__BuildSpecificationHtml :
            VghLantern__DocPreview__PrintDocumentRenderer__BuildSpecificationHtml
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__PrintDocumentRenderer  =  VghLantern__DocPreview__PrintDocumentRenderer;
