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

   TWO INBOUND FORMS, ONE OUTBOUND FORM:
   Newly printed sheets carry the COMPACT form, ?t={projectCode}&l={lanternIndex}, and
   that is the only form this module builds. Sheets issued before 07-Aug-2026 carry
   the LEGACY form, ?doc=drawingTerms&project=&lantern=, and that form is still read
   on the way in. A QR code printed on an issued drawing outlives any config in this
   repository, so the legacy reader is permanent and must not be deleted.

   WHY THE COMPACT FORM EXISTS:
   The printed symbol is about 8.8 mm square, so encoded length is the only thing
   deciding module size, and module size is the only thing deciding whether a phone
   on site can read it. The legacy query was 41 characters; the compact one is 19.
   Folded together with the shortened base address that is two QR versions, taking
   the symbol from 41 x 41 modules to 33 x 33 and the module from 0.215 mm to
   0.267 mm, with no change to the titleblock or the encoder.

   THE ADDRESS IS LIVE:
   TermsQrBaseUrl points at the published GitHub Pages redirect at /t/, which forwards
   its query string verbatim to this application. The redirect exists purely to keep
   the encoded address short. It is one JSON key; nothing in this file or any other
   knows what the address is.

   ============================================================================= */

// =============================================================================
// REGION | Terms QR Link Module
// =============================================================================

const VghLantern__Terms__QrLink = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Compact Query Parameter - The Form Codes Are Printed With
    // ------------------------------------------------------------
    // Mirrors TermsQrQueryPattern and DrawingTermsQrQueryPattern in config. Named here
    // because reading a query needs the parameter name as data, which a pattern string
    // cannot supply.
    //
    // One character each, because every character costs printed module size.
    //
    // The lantern index keeps a parameter of its own rather than riding on the project
    // code as ?t=15134-0. That suffix form would save two characters and encodes to the
    // IDENTICAL 33 x 33 symbol, so it saves nothing that matters, and it would be
    // ambiguous: a project code is a free-form string with no format validation
    // anywhere in this application, so ?t=AB-15134 could mean project AB lantern 15134
    // or project AB-15134 with no lantern, and nothing in the value can settle it.
    const QUERY_PARAM_COMPACT         =  't';
    const QUERY_PARAM_COMPACT_LANTERN =  'l';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Legacy Query Parameter Names - Inbound Only
    // ------------------------------------------------------------
    // The form printed before 07-Aug-2026. No longer built, permanently answered.
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

    // SUB FUNCTION | Read the Compact Terms Deep Link
    // ------------------------------------------------------------
    // ?t=15134&l=0 is the drawing terms for lantern 0 of project 15134.
    // ?t=15134     is that project's business terms of engagement.
    //
    // The PRESENCE of l is the whole discriminator, which is what lets the request
    // carry both documents without spending characters on naming which one it wants.
    // An l that is present but not a number is treated as absent rather than as
    // lantern zero, because landing on the wrong lantern's notes is worse than
    // falling back to the general terms.
    function VghLantern__QrLink__ReadCompactRequest(params) {
        var value  =  params.get(QUERY_PARAM_COMPACT);
        if (value === null) return null;

        var projectCode  =  value.trim();
        if (projectCode === '') return null;

        var rawLantern   =  params.get(QUERY_PARAM_COMPACT_LANTERN);
        var lanternIndex =  (rawLantern === null) ? NaN : parseInt(rawLantern, 10);
        var hasLantern   =  !isNaN(lanternIndex);

        return {
            ProjectCode    : projectCode,
            IsDrawingTerms : hasLantern,
            LanternIndex   : hasLantern ? lanternIndex : null
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Read the Legacy Terms Deep Link
    // ------------------------------------------------------------
    // The form printed before 07-Aug-2026. Never built any more, always answered: a
    // code on an issued drawing outlives every config in this repository, and a sheet
    // in a site bag has no idea the query pattern moved on.
    function VghLantern__QrLink__ReadLegacyRequest(params) {
        var doc  =  params.get(QUERY_PARAM_DOC);

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


    // SUB FUNCTION | Read the Terms Deep Link From the Current Address
    // ------------------------------------------------------------
    // Answers both forms the application has ever printed. The compact form is tried
    // first because it is what every newly issued sheet carries; the legacy form is
    // the fallback. Neither can be mistaken for the other - they share no parameter
    // name - so the order is about which check pays off most often, not correctness.
    function VghLantern__QrLink__ReadInboundRequest() {
        var params  =  new URLSearchParams(window.location.search);

        return VghLantern__QrLink__ReadCompactRequest(params) ||
               VghLantern__QrLink__ReadLegacyRequest(params);
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
