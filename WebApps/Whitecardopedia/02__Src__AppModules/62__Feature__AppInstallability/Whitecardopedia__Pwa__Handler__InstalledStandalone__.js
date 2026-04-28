// =============================================================================
// WHITECARDOPEDIA - PWA HANDLER (INSTALLED STANDALONE)
// =============================================================================
//
// FILE       : Whitecardopedia__Pwa__Handler__InstalledStandalone__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__Pwa__Handler__InstalledStandalone
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : No-op handler used when the PWA is already running standalone
// CREATED    : 2026
//
// DESCRIPTION:
// - Ensures any in-flight prompt is dismissed and the session is permanently
//   suppressed when the controller detects standalone mode at boot.
// - Exists so the controller can treat every platform symmetrically without
//   special-casing the standalone state.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Activate Handler (Mark As Installed)
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__InstalledStandalone__Activate() {
        if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.markInstalled) {
            window.Whitecardopedia__Pwa__SessionState.markInstalled();                                                              // <-- Persist install state
        }
        if (window.Whitecardopedia__Pwa__PromptUi && window.Whitecardopedia__Pwa__PromptUi.hide) {
            window.Whitecardopedia__Pwa__PromptUi.hide();                                                                           // <-- Tear down any visible prompt
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Request Sheet Display (No-Op)
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__InstalledStandalone__RequestShow() {
        if (window.Whitecardopedia__Pwa__PromptUi && window.Whitecardopedia__Pwa__PromptUi.hide) {
            window.Whitecardopedia__Pwa__PromptUi.hide();                                                                           // <-- Always keep prompt hidden
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Set Suppress Flag (No-Op)
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__InstalledStandalone__SetSuppressed() {
        if (window.Whitecardopedia__Pwa__PromptUi && window.Whitecardopedia__Pwa__PromptUi.hide) {
            window.Whitecardopedia__Pwa__PromptUi.hide();                                                                           // <-- Hide unconditionally
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    if (typeof window !== 'undefined') {
        window.Whitecardopedia__Pwa__Handler__InstalledStandalone = {                                                               // <-- Expose handler API
            activate      : Whitecardopedia__Pwa__Handler__InstalledStandalone__Activate,
            requestShow   : Whitecardopedia__Pwa__Handler__InstalledStandalone__RequestShow,
            setSuppressed : Whitecardopedia__Pwa__Handler__InstalledStandalone__SetSuppressed
        };
    }

// endregion -------------------------------------------------------------------

})();
