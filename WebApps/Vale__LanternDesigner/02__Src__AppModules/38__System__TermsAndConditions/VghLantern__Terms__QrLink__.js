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
    // Mirrors TermsQrQueryPattern and DrawingTermsQrQueryPattern in config. Named
    // here because reading a query needs the parameter names as data, which a pattern
    // string cannot supply.
    const QUERY_PARAM_DOC           =  'doc';
    const QUERY_PARAM_PROJECT       =  'project';
    const QUERY_PARAM_LANTERN       =  'lantern';
    const QUERY_VALUE_TERMS         =  'terms';
    const QUERY_VALUE_DRAWING_TERMS =  'drawingTerms';
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
    //
    // A sheet always names its own lantern, so a scanned drawing always asks for the
    // DRAWING terms - the omissions and limitations a contractor setting out needs -
    // rather than the business terms of engagement. Whether that lantern has notes of
    // its own is not decided here: the encoded address is the same either way and the
    // inbound handler resolves it against the pack. That keeps the fallback in one
    // place, and means writing a lantern's first note does not invalidate a code
    // already printed on an issued sheet.
    //
    // Called with no lantern (a project-level link), it falls back to the general
    // terms address, which is what the pre-lantern callers still expect.
    function VghLantern__Terms__QrLink__BuildUrl(project, lantern, lanternIndex) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__QrLink__Config();
        if (!ConfigLoader) return '';

        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(config, 'Enabled', QR_LABEL)) return '';

        var metadata     =  (project && project['VghLantern__ProjectFile__Metadata']) || {};
        var projectCode  =  metadata['VghLantern__ProjectFile__Metadata__ProjectCode'] || '';
        if (projectCode === '') return '';

        var baseUrl  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'TermsQrBaseUrl', QR_LABEL);
        if (baseUrl === '') return '';

        var pattern  =  lantern
            ? ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'DrawingTermsQrQueryPattern', QR_LABEL)
            : ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'TermsQrQueryPattern',        QR_LABEL);
        if (pattern === '') return '';

        return baseUrl + pattern
            .replace('{projectCode}',  encodeURIComponent(projectCode))
            .replace('{lanternIndex}', encodeURIComponent(String(typeof lanternIndex === 'number' ? lanternIndex : 0)));
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Inbound - Answering the Link
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Read the Terms Deep Link From the Current Address
    // ------------------------------------------------------------
    // Answers both addresses the application prints. A drawing link carries a lantern
    // index; a terms link does not, and lands on the business terms as it always has.
    function VghLantern__QrLink__ReadInboundRequest() {
        var params  =  new URLSearchParams(window.location.search);
        var doc     =  params.get(QUERY_PARAM_DOC);

        if (doc !== QUERY_VALUE_TERMS && doc !== QUERY_VALUE_DRAWING_TERMS) return null;

        var projectCode  =  params.get(QUERY_PARAM_PROJECT) || '';
        var rawLantern   =  params.get(QUERY_PARAM_LANTERN);
        var lanternIndex =  parseInt(rawLantern, 10);

        return {
            ProjectCode    : projectCode.trim(),
            IsDrawingTerms : doc === QUERY_VALUE_DRAWING_TERMS,
            LanternIndex   : isNaN(lanternIndex) ? null : lanternIndex
        };
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

        // A drawing link names the lantern whose sheet was scanned. Selecting it first
        // means the editor opens on that lantern's notes rather than on whichever
        // lantern happened to be active, and it is what lets the scroll below find
        // them. An index the project no longer holds is ignored rather than obeyed,
        // because a code on an issued sheet outlives the schedule it was printed from.
        var targetLantern  =  null;
        if (request.IsDrawingTerms && request.LanternIndex !== null) {
            var project   =  StateManager.VghLantern__StateManager__GetCurrentProject();
            var lanterns  =  project ? project['VghLantern__ProjectFile__Lanterns'] : null;

            if (Array.isArray(lanterns) && lanterns[request.LanternIndex]) {
                StateManager.VghLantern__StateManager__SetCurrentLanternIndex(request.LanternIndex);
                targetLantern  =  lanterns[request.LanternIndex];
            }
        }

        ModeManager.VghLantern__ModeManager__SwitchToMode(ModeManager.MODE_CLIENT_DOCUMENT, false);

        // The mode paints on the switch above, so the scroll is queued behind it.
        //
        // Which anchor to land on is the fallback the printed code deliberately does
        // not encode: a scanned drawing goes to that lantern's own notes when it has
        // any, and to the general drawing terms when it has none.
        window.setTimeout(function() {
            var Layout      =  window.VghLantern__ClientDoc__Layout;
            var TermsModel  =  window.VghLantern__Terms__DocumentModel;
            if (!Layout) return;

            var hasOwnNotes  =  !!(targetLantern && TermsModel &&
                TermsModel.VghLantern__Terms__DocumentModel__LanternNoteTexts(targetLantern).length);

            if (request.IsDrawingTerms && Layout.VghLantern__ClientDoc__Layout__ScrollToDrawingNotes) {
                Layout.VghLantern__ClientDoc__Layout__ScrollToDrawingNotes(hasOwnNotes);
                return;
            }

            if (Layout.VghLantern__ClientDoc__Layout__ScrollToTerms) {
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
