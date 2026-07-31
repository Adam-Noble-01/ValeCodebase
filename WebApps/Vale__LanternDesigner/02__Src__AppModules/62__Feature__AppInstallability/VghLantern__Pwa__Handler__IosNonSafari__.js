/* =============================================================================
   VGHLANTERN - PWA HANDLER | IOS NON-SAFARI BROWSERS
   =============================================================================

   FILE       : VghLantern__Pwa__Handler__IosNonSafari__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__Pwa__Handler__IosNonSafari
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Redirect iOS Chrome, Edge and Firefox users to Safari to install
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Every browser on iOS runs on WebKit, but only Safari can add a web app to
     the home screen. Chrome, Edge and Firefox on iOS cannot install at all.
   - The only useful guidance is therefore to open the app in Safari first, so
     this handler renders a short sheet explaining that, with a copy-link action
     to make the switch painless.
   - Clipboard access is best effort. When it is unavailable the sheet still
     explains the manual route, so nothing depends on the copy succeeding.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Handler Context Flags
    // ------------------------------------------------------------
    var VghLantern__Pwa__Handler__IosNonSafari__PlatformIdContext = '';                                           // <-- Active platform identifier
    var VghLantern__Pwa__Handler__IosNonSafari__SuppressShow      = false;                                        // <-- Suppress flag set by the controller
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Copy the App URL to the Clipboard
    // ---------------------------------------------------------------
    async function VghLantern__Pwa__Handler__IosNonSafari__CopyAppUrl() {
        var urlHelper       = window.VghLantern__Pwa__Url || null;                                                // <-- Resolve the URL helper
        var startUrl        = (urlHelper && urlHelper.getStartUrl) ? urlHelper.getStartUrl() : window.location.href; // <-- Prefer the canonical start URL

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(startUrl);                                                    // <-- Modern clipboard API
            }
        } catch (clipboardError) {
            console.warn('VghLantern PWA could not copy the app link:', clipboardError);                          // <-- Log non-blocking
        }

        if (window.VghLantern__Pwa__PromptUi && window.VghLantern__Pwa__PromptUi.hide) {
            window.VghLantern__Pwa__PromptUi.hide();                                                              // <-- Close the sheet either way
        }
        VghLantern__Pwa__Handler__IosNonSafari__OnDismiss();                                                      // <-- Treat as handled, advance the ladder
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Prompt Configuration
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Handler__IosNonSafari__BuildPromptConfig() {
        var urlHelper       = window.VghLantern__Pwa__Url || null;                                                // <-- Resolve the URL helper
        var iconUrl         = (urlHelper && urlHelper.getAppIconUrl) ? urlHelper.getAppIconUrl(192) : null;       // <-- 192px icon as the visual cue

        var stepEntries     = [                                                                                   // <-- Route through Safari
            'Copy the app link using the button below.',
            'Open Safari and paste the link into the address bar.',
            'Tap Share, then "Add to Home Screen", then "Add".'
        ];

        return {
            variant              : 'sheet',                                                                        // <-- Centred sheet variant
            iconUrl              : iconUrl,
            title                : 'Install from Safari',
            body                 : 'On iPhone and iPad only Safari can add an app to the home screen. Open this link in Safari to install Lantern Designer.',
            steps                : stepEntries,
            arrowDirection       : null,
            primaryActionLabel   : 'Copy link',
            secondaryActionLabel : 'Not now',
            onPrimary            : VghLantern__Pwa__Handler__IosNonSafari__CopyAppUrl,
            onDismiss            : VghLantern__Pwa__Handler__IosNonSafari__OnDismiss
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Handle User Dismissal of the Sheet
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Handler__IosNonSafari__OnDismiss() {
        if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.recordDismissal) {
            window.VghLantern__Pwa__SessionState.recordDismissal(VghLantern__Pwa__Handler__IosNonSafari__PlatformIdContext); // <-- Advance the snooze ladder
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Activate Handler for the Given Platform Descriptor
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__IosNonSafari__Activate(platformDescriptor) {
        VghLantern__Pwa__Handler__IosNonSafari__PlatformIdContext =                                               // <-- Persist the platform id
            (platformDescriptor && platformDescriptor.platformId) || 'ios-non-safari';
    }
    // ---------------------------------------------------------------


    // FUNCTION | Request Sheet Display
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__IosNonSafari__RequestShow() {
        if (VghLantern__Pwa__Handler__IosNonSafari__SuppressShow) return;                                         // <-- Suppressed by the controller
        if (!window.VghLantern__Pwa__PromptUi || !window.VghLantern__Pwa__PromptUi.show) return;                  // <-- Prompt UI not loaded yet

        if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.isSuppressed) {
            if (window.VghLantern__Pwa__SessionState.isSuppressed(VghLantern__Pwa__Handler__IosNonSafari__PlatformIdContext)) {
                return;                                                                                            // <-- Snooze still active
            }
        }

        window.VghLantern__Pwa__PromptUi.show(VghLantern__Pwa__Handler__IosNonSafari__BuildPromptConfig());       // <-- Render the instruction sheet
    }
    // ---------------------------------------------------------------


    // FUNCTION | Set the Suppress Flag
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__IosNonSafari__SetSuppressed(shouldSuppress) {
        VghLantern__Pwa__Handler__IosNonSafari__SuppressShow = Boolean(shouldSuppress);                           // <-- Update the suppress flag
        if (VghLantern__Pwa__Handler__IosNonSafari__SuppressShow && window.VghLantern__Pwa__PromptUi && window.VghLantern__Pwa__PromptUi.hide) {
            window.VghLantern__Pwa__PromptUi.hide();                                                              // <-- Hide if currently showing
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    if (typeof window !== 'undefined') {
        window.VghLantern__Pwa__Handler__IosNonSafari = {                                                         // <-- Expose the handler API
            activate      : VghLantern__Pwa__Handler__IosNonSafari__Activate,
            requestShow   : VghLantern__Pwa__Handler__IosNonSafari__RequestShow,
            setSuppressed : VghLantern__Pwa__Handler__IosNonSafari__SetSuppressed
        };
    }

// endregion -------------------------------------------------------------------

})();
