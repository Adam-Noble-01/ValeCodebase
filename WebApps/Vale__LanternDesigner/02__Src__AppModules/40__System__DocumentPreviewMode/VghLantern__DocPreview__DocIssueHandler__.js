/* =============================================================================
   VGHLANTERN - DOCUMENT PREVIEW | DOCUMENT ISSUE HANDLER
   =============================================================================

   FILE       : VghLantern__DocPreview__DocIssueHandler__.js
   NAMESPACE  : VghLantern
   MODULE     : DocPreview - DocIssueHandler
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Collect and present anything that blocks or qualifies a document issue
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Gathers issues from the project state, the geometry solve and the specification
     document model, then classifies each as an error or a warning.
   - Errors block PDF export. Warnings are printed on the document as a caveat.
   - This is the only module that decides whether a document may be issued, so the
     rule lives in exactly one place.

   -----------------------------------------------------------------------------

   WHY ERRORS BLOCK AND WARNINGS DO NOT:
   An error means the numbers on the page cannot be trusted - unsolved geometry, no
   lantern, nothing selected. Issuing that to a workshop is worse than issuing
   nothing. A warning means the numbers are correct but unusual, which is the
   estimator's judgement call, not the software's.

   ============================================================================= */

// =============================================================================
// REGION | Document Preview Issue Handler Module
// =============================================================================

const VghLantern__DocPreview__DocIssueHandler = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Severities and CSS Classes
    // ------------------------------------------------------------
    const SEVERITY_ERROR    =  'error';
    const SEVERITY_WARNING  =  'warning';

    const CSS_BLOCK         =  'VghLantern__DocPreview__IssueBlock';
    const CSS_BLOCK_ERROR   =  'VghLantern__DocPreview__IssueBlock--error';
    const CSS_TITLE         =  'VghLantern__DocPreview__IssueTitle';
    const CSS_LIST          =  'VghLantern__DocPreview__IssueList';
    const CSS_ITEM          =  'VghLantern__DocPreview__IssueItem';
    const CSS_ITEM_ERROR    =  'VghLantern__DocPreview__IssueItem--error';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Issue Message Config Block
    // ------------------------------------------------------------
    function VghLantern__DocIssue__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var docCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DocPreview') || {};
        return docCfg['VghLantern__DocPreview__Config__Issues'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__DocIssue__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build One Issue Record
    // ------------------------------------------------------------
    function VghLantern__DocIssue__Make(severity, message) {
        return { Severity: severity, Message: message };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Issue Collection
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Collect Issues from the Project and Geometry State
    // ------------------------------------------------------------
    function VghLantern__DocIssue__CollectStateIssues(messages) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var issues        =  [];

        if (!StateManager) {
            issues.push(VghLantern__DocIssue__Make(SEVERITY_ERROR, 'Application state is unavailable.'));
            return issues;
        }

        var project  =  StateManager.VghLantern__StateManager__GetCurrentProject();
        if (!project) {
            issues.push(VghLantern__DocIssue__Make(SEVERITY_ERROR, messages.NoProjectMessage || 'No project is open.'));
            return issues;                                                     // <-- Nothing further is meaningful without a project
        }

        var lanterns  =  project['VghLantern__ProjectFile__Lanterns'] || [];
        if (!lanterns.length) {
            issues.push(VghLantern__DocIssue__Make(SEVERITY_ERROR, messages.NoLanternMessage || 'This project has no lanterns.'));
            return issues;
        }

        var skeleton  =  StateManager.VghLantern__StateManager__GetSolvedSkeleton
                       ? StateManager.VghLantern__StateManager__GetSolvedSkeleton()
                       : null;
        if (!skeleton) {
            issues.push(VghLantern__DocIssue__Make(SEVERITY_ERROR, messages.UnsolvedGeometryMessage || 'Lantern geometry has not been solved.'));
        }

        return issues;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Collect Issues from the View State Selection
    // ------------------------------------------------------------
    function VghLantern__DocIssue__CollectSelectionIssues(messages) {
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        if (!DocumentState) return [];

        var hasDrawing  =  DocumentState.VghLantern__DocPreview__DocumentState__IncludesDrawingPage();
        var hasSpec     =  DocumentState.VghLantern__DocPreview__DocumentState__IncludesSpecificationPage();

        if (!hasDrawing && !hasSpec) {
            return [VghLantern__DocIssue__Make(SEVERITY_ERROR, messages.EmptySelectionMessage || 'No content is selected.')];
        }

        return [];
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Collect Warnings Raised by the Specification Model
    // ------------------------------------------------------------
    function VghLantern__DocIssue__CollectSpecificationIssues() {
        var SectionManager  =  window.VghLantern__Specification__SectionManager;
        if (!SectionManager) return [];

        var described  =  SectionManager.VghLantern__Specification__SectionManager__DescribeDocument();
        if (!described || !described.Model || !described.Model.Warnings) return [];

        var issues  =  [];
        var i;

        for (i = 0; i < described.Model.Warnings.length; i++) {
            issues.push(VghLantern__DocIssue__Make(SEVERITY_WARNING, described.Model.Warnings[i]));
        }

        return issues;
    }
    // ------------------------------------------------------------


    // FUNCTION | Collect Every Issue Affecting This Document
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocIssueHandler__Collect() {
        var messages  =  VghLantern__DocIssue__Config();

        var issues  =  VghLantern__DocIssue__CollectStateIssues(messages);

        // A missing project already dominates; piling on selection and takeoff
        // complaints would only bury the one instruction the user can act on.
        var hasBlockingStateIssue  =  issues.some(function(issue) { return issue.Severity === SEVERITY_ERROR; });
        if (!hasBlockingStateIssue) {
            issues  =  issues
                .concat(VghLantern__DocIssue__CollectSelectionIssues(messages))
                .concat(VghLantern__DocIssue__CollectSpecificationIssues());
        }

        return issues;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Presentation and Gating
// -----------------------------------------------------------------------------

    // FUNCTION | Report Whether Export Is Blocked
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocIssueHandler__IsExportBlocked(issues) {
        var config  =  VghLantern__DocIssue__Config();
        if (config.BlockExportOnError === false) return false;

        issues  =  issues || VghLantern__DocPreview__DocIssueHandler__Collect();

        return issues.some(function(issue) { return issue.Severity === SEVERITY_ERROR; });
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Issue Banner Markup
    // ------------------------------------------------------------
    function VghLantern__DocPreview__DocIssueHandler__BuildBanner(issues) {
        issues  =  issues || VghLantern__DocPreview__DocIssueHandler__Collect();
        if (!issues.length) return '';

        var hasError  =  issues.some(function(issue) { return issue.Severity === SEVERITY_ERROR; });
        var title     =  hasError ? 'Cannot issue this document yet' : 'Issue with caution';

        var html  =  '<div class="' + CSS_BLOCK + (hasError ? ' ' + CSS_BLOCK_ERROR : '') + '">' +
                     '<p class="' + CSS_TITLE + '">' + VghLantern__DocIssue__Escape(title) + '</p>' +
                     '<ul class="' + CSS_LIST + '">';
        var i, issue;

        for (i = 0; i < issues.length; i++) {
            issue  =  issues[i];
            html  +=  '<li class="' + CSS_ITEM + (issue.Severity === SEVERITY_ERROR ? ' ' + CSS_ITEM_ERROR : '') + '">' +
                      VghLantern__DocIssue__Escape(issue.Message) + '</li>';
        }

        return html + '</ul></div>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        SEVERITY_ERROR                                        : SEVERITY_ERROR,
        SEVERITY_WARNING                                      : SEVERITY_WARNING,
        VghLantern__DocPreview__DocIssueHandler__Collect        : VghLantern__DocPreview__DocIssueHandler__Collect,
        VghLantern__DocPreview__DocIssueHandler__IsExportBlocked: VghLantern__DocPreview__DocIssueHandler__IsExportBlocked,
        VghLantern__DocPreview__DocIssueHandler__BuildBanner    : VghLantern__DocPreview__DocIssueHandler__BuildBanner
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__DocIssueHandler  =  VghLantern__DocPreview__DocIssueHandler;
