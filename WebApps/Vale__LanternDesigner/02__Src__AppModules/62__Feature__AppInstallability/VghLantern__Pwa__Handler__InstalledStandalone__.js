/* =============================================================================
   VGHLANTERN - PWA HANDLER | INSTALLED STANDALONE
   =============================================================================

   FILE       : VghLantern__Pwa__Handler__InstalledStandalone__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__Pwa__Handler__InstalledStandalone
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Null handler for sessions already running as an installed app
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Selected when the platform detector reports a standalone display mode, which
     means the app is already installed and launched from the home screen, Dock,
     Start menu or taskbar.
   - Records the installed state so the prompt stays suppressed even after the
     user later opens the app in a normal browser tab.
   - requestShow is deliberately a no-op. Having a real handler here rather than
     a null keeps the controller free of special cases.
   - Also tags the document root with a data attribute so stylesheets can adapt
     to standalone mode without re-running detection.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Document Attribute
    // ------------------------------------------------------------
    var STANDALONE_ROOT_ATTRIBUTE = 'data-vghlantern-display-mode';                                               // <-- Attribute stamped on the document root
    var STANDALONE_ATTRIBUTE_VALUE = 'standalone';                                                                // <-- Value indicating installed app mode
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Activate Handler for the Given Platform Descriptor
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__InstalledStandalone__Activate(platformDescriptor) {
        if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.markInstalled) {
            window.VghLantern__Pwa__SessionState.markInstalled();                                                 // <-- Persist the installed state
        }

        if (window.VghLantern__Pwa__PromptUi && window.VghLantern__Pwa__PromptUi.hide) {
            window.VghLantern__Pwa__PromptUi.hide();                                                              // <-- Tear down anything already rendered
        }

        try {
            if (typeof document !== 'undefined' && document.documentElement) {
                document.documentElement.setAttribute(STANDALONE_ROOT_ATTRIBUTE, STANDALONE_ATTRIBUTE_VALUE);     // <-- Let stylesheets react to app mode
            }
        } catch (attributeError) {
            // Silent: the attribute is a styling convenience and must never break boot
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Request Display (No Operation)
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__InstalledStandalone__RequestShow() {
        return;                                                                                                    // <-- Already installed, nothing to prompt
    }
    // ---------------------------------------------------------------


    // FUNCTION | Set the Suppress Flag (No Operation)
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__InstalledStandalone__SetSuppressed() {
        return;                                                                                                    // <-- Permanently suppressed by definition
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    if (typeof window !== 'undefined') {
        window.VghLantern__Pwa__Handler__InstalledStandalone = {                                                  // <-- Expose the handler API
            activate      : VghLantern__Pwa__Handler__InstalledStandalone__Activate,
            requestShow   : VghLantern__Pwa__Handler__InstalledStandalone__RequestShow,
            setSuppressed : VghLantern__Pwa__Handler__InstalledStandalone__SetSuppressed
        };
    }

// endregion -------------------------------------------------------------------

})();
