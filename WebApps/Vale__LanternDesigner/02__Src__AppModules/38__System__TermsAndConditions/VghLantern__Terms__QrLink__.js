/* =============================================================================
   VGHLANTERN - TERMS | QR LINK
   =============================================================================

   FILE       : VghLantern__Terms__QrLink__.js
   NAMESPACE  : VghLantern
   MODULE     : System - TermsAndConditions - QrLink
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the terms link a drawing's QR code carries, and answer it
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Composes the URL the drawing sheet's QR block encodes, from the base address and
     query pattern in Na__Terms__Config.json plus the project code.
   - Reads that same query back when the application is opened through one of those
     links, opens the named project and lands on its terms.
   - Both directions live here on purpose: the link the code encodes and the link the
     app answers are built from one pattern, so they cannot drift apart.

   -----------------------------------------------------------------------------

   THE ADDRESS IS A PLACEHOLDER:
   TermsQrBaseUrl currently points at the localhost development server. That is
   deliberate - it makes the printed code scannable and testable today rather than
   dead until a client portal exists. It is one JSON key, it is labelled as a
   placeholder in config, and the drawing prints a notice under the code saying so.
   Replacing it with the hosted Vale terms address is the whole migration; nothing in
   this file or any other knows what the address is.

   ============================================================================= */

// =============================================================================
// REGION | Terms QR Link Module
// =============================================================================

const VghLantern__Terms__QrLink = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Query Parameter Names
    // ------------------------------------------------------------
    // Mirrors TermsQrQueryPattern in config. Named here because reading a query
    // needs the parameter names as data, which a pattern string cannot supply.
    const QUERY_PARAM_DOC      =  'doc';
    const QUERY_PARAM_PROJECT  =  'project';
    const QUERY_VALUE_TERMS    =  'terms';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Label
    // ------------------------------------------------------------
    const QR_LABEL  =  'Na__Terms__Config.json -> VghLantern__Terms__Config__DrawingQrBlock';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Inbound Link Guard
    // ------------------------------------------------------------
    // The deep link is answered once per page load. Without this a later mode change
    // that re-ran the check would drag the user back to the terms mid-edit.
    let VghLantern__QrLink__HasHandledInbound  =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Drawing QR Block Config
    // ------------------------------------------------------------
    function VghLantern__QrLink__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var termsCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Terms') || {};
        return termsCfg['VghLantern__Terms__Config__DrawingQrBlock'] || {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Outbound - Building the Link
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Terms URL for a Project
    // ------------------------------------------------------------
    // Returns an empty string when the QR block is switched off or there is no
    // project code, which the caller treats as "draw no code" rather than drawing a
    // code that scans to a broken address.
    function VghLantern__Terms__QrLink__BuildUrl(project) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__QrLink__Config();
        if (!ConfigLoader) return '';

        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(config, 'Enabled', QR_LABEL)) return '';

        var metadata     =  (project && project['VghLantern__ProjectFile__Metadata']) || {};
        var projectCode  =  metadata['VghLantern__ProjectFile__Metadata__ProjectCode'] || '';
        if (projectCode === '') return '';

        var baseUrl  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'TermsQrBaseUrl',      QR_LABEL);
        var pattern  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'TermsQrQueryPattern', QR_LABEL);
        if (baseUrl === '' || pattern === '') return '';

        return baseUrl + pattern.replace('{projectCode}', encodeURIComponent(projectCode));
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Inbound - Answering the Link
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Read the Terms Deep Link From the Current Address
    // ------------------------------------------------------------
    function VghLantern__QrLink__ReadInboundRequest() {
        var params  =  new URLSearchParams(window.location.search);
        if (params.get(QUERY_PARAM_DOC) !== QUERY_VALUE_TERMS) return null;

        var projectCode  =  params.get(QUERY_PARAM_PROJECT) || '';
        return { ProjectCode : projectCode.trim() };
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the Terms for a Link the Application Was Launched With
    // ------------------------------------------------------------
    // Called once by AppCore Init, after the project cache has been synced from disk
    // so the named project is actually findable. Returns true when it navigated.
    function VghLantern__Terms__QrLink__HandleInboundLink() {
        if (VghLantern__QrLink__HasHandledInbound) return false;
        VghLantern__QrLink__HasHandledInbound  =  true;

        var request  =  VghLantern__QrLink__ReadInboundRequest();
        if (!request) return false;

        var ModeManager        =  window.VghLantern__AppCore__ModeManager;
        var StateManager       =  window.VghLantern__AppCore__StateManager;
        var ProjectFileManager =  window.VghLantern__AppData__ProjectFileManager;
        var Toast              =  window.VghLantern__AppNotifications__Toast;
        if (!ModeManager || !StateManager) return false;

        // HELPER | Report a link that named a project this installation does not hold
        function reportUnknownProject() {
            var message  =  'The scanned link asks for project "' + request.ProjectCode +
                            '", which is not on this device.';
            if (Toast && Toast.VghLantern__Toast__Show) Toast.VghLantern__Toast__Show(message, 'error');
            else console.warn('[VghLantern__Terms__QrLink] ' + message);
        }

        if (request.ProjectCode !== '') {
            var current      =  StateManager.VghLantern__StateManager__GetCurrentProject();
            var currentCode  =  current
                ? (current['VghLantern__ProjectFile__Metadata'] || {})['VghLantern__ProjectFile__Metadata__ProjectCode']
                : '';

            if (currentCode !== request.ProjectCode) {
                if (!ProjectFileManager) return false;

                var projectData  =  ProjectFileManager.VghLantern__ProjectFileManager__LoadProject(request.ProjectCode);
                if (!projectData) {
                    reportUnknownProject();
                    return false;
                }

                StateManager.VghLantern__StateManager__SetCurrentProject(projectData);
                StateManager.VghLantern__StateManager__SetCurrentLanternIndex(0);
            }
        }

        ModeManager.VghLantern__ModeManager__SwitchToMode(ModeManager.MODE_CLIENT_DOCUMENT, false);

        // The mode paints on the switch above, so the scroll is queued behind it.
        window.setTimeout(function() {
            var Layout  =  window.VghLantern__ClientDoc__Layout;
            if (Layout && Layout.VghLantern__ClientDoc__Layout__ScrollToTerms) {
                Layout.VghLantern__ClientDoc__Layout__ScrollToTerms();
            }
        }, 0);

        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Terms__QrLink__BuildUrl            : VghLantern__Terms__QrLink__BuildUrl,
        VghLantern__Terms__QrLink__HandleInboundLink   : VghLantern__Terms__QrLink__HandleInboundLink
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Terms__QrLink  =  VghLantern__Terms__QrLink;
