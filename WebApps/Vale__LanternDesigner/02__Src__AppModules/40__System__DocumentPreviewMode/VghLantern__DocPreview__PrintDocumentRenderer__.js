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


    // SUB HELPER FUNCTION | Find One Lantern's Entry in a Built Model
    // ------------------------------------------------------------
    // Matched on LanternIndex rather than array position, because the model omits any
    // lantern the solver rejected - so on a project with an unbuildable lantern the
    // two stop agreeing, and position would silently return the wrong lantern's
    // takeoff under the right lantern's drawing.
    function VghLantern__PrintDocument__FindLantern(model, lanternIndex) {
        var i;
        for (i = 0; i < model.Lanterns.length; i++) {
            if (model.Lanterns[i].LanternIndex === lanternIndex) return model.Lanterns[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Tables for One Lantern Takeoff
    // ------------------------------------------------------------
    // isOwnPage suppresses the lantern heading: when this block is a page of its own
    // the masthead above it already names the lantern, and a heading repeating it
    // immediately underneath reads as a mistake.
    function VghLantern__PrintDocument__BuildLanternTakeoff(entry, viewState, isOwnPage) {
        var Tables  =  window.VghLantern__Specification__TakeoffTableRenderer;
        if (!Tables || !entry || !entry.Takeoff) return '';

        var html  =  isOwnPage ? '' : VghLantern__PrintDocument__Heading(entry.Title);

        if (viewState.ShowComponentSchedule) {
            html  +=  Tables.VghLantern__Specification__TakeoffTableRenderer__BuildComponentTable(entry.Takeoff);
        }

        if (viewState.ShowTakeoffSchedule) {
            html  +=  Tables.VghLantern__Specification__TakeoffTableRenderer__BuildLinearTable(entry.Takeoff);
            html  +=  Tables.VghLantern__Specification__TakeoffTableRenderer__BuildAreaTable(entry.Takeoff);
        }

        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Document Masthead
    // ------------------------------------------------------------
    // Repeated at the head of every specification block in the pack, because each one
    // is now a page in its own right and a page that does not say which project it
    // belongs to is a page that gets filed against the wrong job.
    function VghLantern__PrintDocument__BuildMasthead(model, titleSuffix) {
        var metaLine  =  [model.Meta.ProjectCode, model.Meta.ProjectName, model.Meta.ClientName]
            .filter(function(part) { return !!part; }).join('  |  ');

        var title  =  model.Meta.DocumentTitle + (titleSuffix ? ('  -  ' + titleSuffix) : '');

        return '<h2 class="' + CSS_TITLE + '">' + VghLantern__PrintDocument__Escape(title) + '</h2>' +
               '<p class="' + CSS_META + '">' + VghLantern__PrintDocument__Escape(metaLine) + '</p>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Project Summary Body
    // ------------------------------------------------------------
    // What the whole job amounts to: the schedule of lanterns, the project totals and
    // the job notes. It leads the pack so the reader sees the shape of the job before
    // the detail of any one lantern.
    //
    // The warnings live here rather than being repeated per lantern because they are
    // already prefixed with the lantern that raised them, and a reader wants them in
    // one list at the front rather than scattered through four specifications.
    function VghLantern__DocPreview__PrintDocumentRenderer__BuildProjectSummaryHtml(viewState) {
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

        var html  =  '<div class="' + CSS_ROOT + '">' +
                     VghLantern__PrintDocument__BuildMasthead(model, '') +
                     VghLantern__PrintDocument__BuildUserWarnings(model.UserWarnings) +
                     VghLantern__PrintDocument__BuildWarnings(model.Warnings) +
                     VghLantern__PrintDocument__Heading('Lantern Schedule') +
                     Tables.VghLantern__Specification__TakeoffTableRenderer__BuildTable(
                         ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'ScheduleColumns', TABLE_LABEL), model.ScheduleRows, null, null
                     );

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


    // FUNCTION | Build the Specification Body for One Lantern
    // ------------------------------------------------------------
    // One lantern's own tables, printed after that lantern's drawing so the T codes in
    // the component schedule are read against the plan view they are marked on. That
    // adjacency is the whole reason the specification is split per lantern: a reader
    // holding the Kitchen drawing should not be leafing through the Dining Room
    // takeoff to find what T04 is.
    function VghLantern__DocPreview__PrintDocumentRenderer__BuildLanternSpecificationHtml(viewState, lanternIndex) {
        var DocumentModel  =  window.VghLantern__Specification__DocumentModel;
        var Tables         =  window.VghLantern__Specification__TakeoffTableRenderer;
        if (!DocumentModel || !Tables) {
            return '<p class="' + CSS_EMPTY + '">Specification modules are not available.</p>';
        }

        var model  =  DocumentModel.VghLantern__Specification__DocumentModel__BuildFromState();
        if (!model) {
            return '<p class="' + CSS_EMPTY + '">No specification content available.</p>';
        }

        var entry  =  VghLantern__PrintDocument__FindLantern(model, lanternIndex);
        if (!entry) {
            return '<p class="' + CSS_EMPTY + '">This lantern has no specification content.</p>';
        }

        return '<div class="' + CSS_ROOT + '">' +
               VghLantern__PrintDocument__BuildMasthead(model, entry.Title) +
               VghLantern__PrintDocument__BuildLanternTakeoff(entry, viewState || {}, true) +
               '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Full Print-Faithful Specification Body
    // ------------------------------------------------------------
    // The whole specification as one continuous document: the project summary followed
    // by every lantern. Retained for any surface that wants the specification on its
    // own rather than interleaved with the drawings.
    function VghLantern__DocPreview__PrintDocumentRenderer__BuildSpecificationHtml(viewState) {
        var DocumentModel  =  window.VghLantern__Specification__DocumentModel;
        if (!DocumentModel) {
            return '<p class="' + CSS_EMPTY + '">Specification modules are not available.</p>';
        }

        var model  =  DocumentModel.VghLantern__Specification__DocumentModel__BuildFromState();
        if (!model) {
            return '<p class="' + CSS_EMPTY + '">No specification content available.</p>';
        }

        var html  =  VghLantern__DocPreview__PrintDocumentRenderer__BuildProjectSummaryHtml(viewState);
        var i;

        for (i = 0; i < model.Lanterns.length; i++) {
            html  +=  '<div class="' + CSS_ROOT + '">' +
                      VghLantern__PrintDocument__BuildLanternTakeoff(model.Lanterns[i], viewState || {}) +
                      '</div>';
        }

        return html;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DocPreview__PrintDocumentRenderer__BuildSpecificationHtml :
            VghLantern__DocPreview__PrintDocumentRenderer__BuildSpecificationHtml,
        VghLantern__DocPreview__PrintDocumentRenderer__BuildProjectSummaryHtml :
            VghLantern__DocPreview__PrintDocumentRenderer__BuildProjectSummaryHtml,
        VghLantern__DocPreview__PrintDocumentRenderer__BuildLanternSpecificationHtml :
            VghLantern__DocPreview__PrintDocumentRenderer__BuildLanternSpecificationHtml
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__PrintDocumentRenderer  =  VghLantern__DocPreview__PrintDocumentRenderer;
