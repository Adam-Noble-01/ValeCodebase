/* =============================================================================
   VGHLANTERN - TERMS | SCREEN RENDERER
   =============================================================================

   FILE       : VghLantern__Terms__ScreenRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : System - TermsAndConditions - ScreenRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build print-faithful terms markup for the editor and Preview and Send
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Renders the model VghLantern__Terms__DocumentModel builds, in the same order and
     with the same numbers the PDF painter will use, because both read that one model.
   - Emits markup only. Nothing here decides what a clause says or what it is called.
   - Two consumers: the live preview column in the Client Doc tab, and the terms pages
     in Preview and Send. They get the identical body.

   ============================================================================= */

// =============================================================================
// REGION | Terms Screen Renderer Module
// =============================================================================

const VghLantern__Terms__ScreenRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_ROOT          =  'VghLantern__Terms__Document';
    const CSS_TITLE         =  'VghLantern__Terms__Title';
    const CSS_INTRO         =  'VghLantern__Terms__Introduction';
    const CSS_SECTION       =  'VghLantern__Terms__Section';
    const CSS_SECTION_CRIT  =  'VghLantern__Terms__Section--critical';
    const CSS_HEADING       =  'VghLantern__Terms__SectionHeading';
    const CSS_LIST          =  'VghLantern__Terms__ClauseList';
    const CSS_CLAUSE        =  'VghLantern__Terms__Clause';
    const CSS_CLAUSE_CRIT   =  'VghLantern__Terms__Clause--critical';
    const CSS_NUMBER        =  'VghLantern__Terms__ClauseNumber';
    const CSS_BODY          =  'VghLantern__Terms__ClauseBody';
    const CSS_NOTICE        =  'VghLantern__Terms__ReviewNotice';
    const CSS_NOTICE_TITLE  =  'VghLantern__Terms__ReviewNoticeTitle';
    const CSS_EMPTY         =  'VghLantern__Terms__Empty';
    const CSS_FAILURE       =  'VghLantern__Terms__Failure';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Label
    // ------------------------------------------------------------
    const DOCUMENT_LABEL  =  'Na__Terms__Config.json -> VghLantern__Terms__Config__Document';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get a Named Terms Config Block
    // ------------------------------------------------------------
    function VghLantern__TermsScreen__Block(blockName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var termsCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Terms') || {};
        return termsCfg['VghLantern__Terms__Config__' + blockName] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__TermsScreen__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Closing Review Notice
    // ------------------------------------------------------------
    // The one statement, at the end, that these terms have not been through legal
    // review. Returns nothing when the notice is switched off in config.
    function VghLantern__TermsScreen__BuildReviewNotice(notice) {
        if (!notice) return '';

        return '<section class="' + CSS_NOTICE + '">' +
               '<h3 class="' + CSS_NOTICE_TITLE + '">' +
               VghLantern__TermsScreen__Escape(notice.Heading) + '</h3>' +
               '<p>' + VghLantern__TermsScreen__Escape(notice.Text) + '</p>' +
               '</section>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Builders
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build One Clause Row
    // ------------------------------------------------------------
    function VghLantern__TermsScreen__BuildClause(term) {
        var rowClass  =  CSS_CLAUSE + (term.IsCritical ? ' ' + CSS_CLAUSE_CRIT : '');

        return '<li class="' + rowClass + '">' +
               '<span class="' + CSS_NUMBER + '">' + VghLantern__TermsScreen__Escape(term.Number) + '</span>' +
               '<span class="' + CSS_BODY + '">' + VghLantern__TermsScreen__Escape(term.Text) + '</span>' +
               '</li>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Section With Its Heading and Clauses
    // ------------------------------------------------------------
    function VghLantern__TermsScreen__BuildSection(section) {
        var blockClass  =  CSS_SECTION + (section.IsCritical ? ' ' + CSS_SECTION_CRIT : '');
        var html  =  '<section class="' + blockClass + '">' +
                     '<h3 class="' + CSS_HEADING + '">' +
                     VghLantern__TermsScreen__Escape(section.Number + '.  ' + section.Label) +
                     '</h3><ol class="' + CSS_LIST + '">';
        var i;

        for (i = 0; i < section.Terms.length; i++) {
            html  +=  VghLantern__TermsScreen__BuildClause(section.Terms[i]);
        }

        return html + '</ol></section>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Notice for Sections That Could Not Be Read
    // ------------------------------------------------------------
    // Printed in the document body rather than only raised as an issue, so a preview
    // that is missing its payment terms says so on the page.
    function VghLantern__TermsScreen__BuildFailureNotice(failedSections) {
        if (!failedSections || !failedSections.length) return '';

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var message  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__TermsScreen__Block('Document'), 'LibraryFailureMessage', DOCUMENT_LABEL);

        return '<p class="' + CSS_FAILURE + '">' +
               VghLantern__TermsScreen__Escape(message + ' Missing: ' + failedSections.join(', ') + '.') +
               '</p>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Full Terms Document Body
    // ------------------------------------------------------------
    // Takes the model rather than building one, so the caller can render a model it
    // has already built for its own issue reporting without doing the work twice.
    function VghLantern__Terms__ScreenRenderer__BuildHtml(model) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;

        if (!model) {
            return '<p class="' + CSS_EMPTY + '">No terms document available.</p>';
        }

        var html  =  '<div class="' + CSS_ROOT + '">' +
                     '<h2 class="' + CSS_TITLE + '">' + VghLantern__TermsScreen__Escape(model.Title) + '</h2>';

        if (model.Introduction) {
            html  +=  '<p class="' + CSS_INTRO + '">' + VghLantern__TermsScreen__Escape(model.Introduction) + '</p>';
        }

        html  +=  VghLantern__TermsScreen__BuildFailureNotice(model.Issues ? model.Issues.FailedSections : []);

        if (!model.Sections.length) {
            var emptyMessage  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
                VghLantern__TermsScreen__Block('Document'), 'EmptyStateMessage', DOCUMENT_LABEL);
            return html + '<p class="' + CSS_EMPTY + '">' +
                   VghLantern__TermsScreen__Escape(emptyMessage) + '</p></div>';
        }

        var i;
        for (i = 0; i < model.Sections.length; i++) {
            html  +=  VghLantern__TermsScreen__BuildSection(model.Sections[i]);
        }

        return html + VghLantern__TermsScreen__BuildReviewNotice(model.ReviewNotice) + '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Terms Document Body for the Current Project
    // ------------------------------------------------------------
    function VghLantern__Terms__ScreenRenderer__BuildFromState() {
        var DocumentModel  =  window.VghLantern__Terms__DocumentModel;
        if (!DocumentModel) return '';

        return VghLantern__Terms__ScreenRenderer__BuildHtml(
            DocumentModel.VghLantern__Terms__DocumentModel__BuildFromState()
        );
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Terms__ScreenRenderer__BuildHtml       : VghLantern__Terms__ScreenRenderer__BuildHtml,
        VghLantern__Terms__ScreenRenderer__BuildFromState  : VghLantern__Terms__ScreenRenderer__BuildFromState
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Terms__ScreenRenderer  =  VghLantern__Terms__ScreenRenderer;
