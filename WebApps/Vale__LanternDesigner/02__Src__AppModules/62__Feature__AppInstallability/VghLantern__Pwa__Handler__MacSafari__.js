/* =============================================================================
   VGHLANTERN - PWA HANDLER | MACOS SAFARI
   =============================================================================

   FILE       : VghLantern__Pwa__Handler__MacSafari__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__Pwa__Handler__MacSafari
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Present manual Add to Dock guidance on macOS Safari
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Safari 17 and later on macOS Sonoma can install a web app through
     File then Add to Dock. There is no programmatic install API, so this
     handler renders the instruction sheet variant.
   - Safari versions before 17 cannot install web apps at all. The sheet is
     written so it still reads sensibly if the menu item is absent, and the
     snooze ladder means an older Safari user is asked at most a handful of
     times before the prompt effectively stops.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Handler Context Flags
    // ------------------------------------------------------------
    var VghLantern__Pwa__Handler__MacSafari__PlatformIdContext = '';                                              // <-- Active platform identifier
    var VghLantern__Pwa__Handler__MacSafari__SuppressShow      = false;                                           // <-- Suppress flag set by the controller
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Prompt Configuration for macOS Safari
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Handler__MacSafari__BuildPromptConfig() {
        var urlHelper       = window.VghLantern__Pwa__Url || null;                                                // <-- Resolve the URL helper
        var iconUrl         = (urlHelper && urlHelper.getAppIconUrl) ? urlHelper.getAppIconUrl(192) : null;       // <-- 192px icon as the visual cue

        var stepEntries     = [                                                                                   // <-- Safari 17 Add to Dock flow
            'Open the File menu in the Safari menu bar.',
            'Choose "Add to Dock".',
            'Confirm the name and click "Add".'
        ];

        return {
            variant              : 'sheet',                                                                        // <-- Centred sheet variant
            iconUrl              : iconUrl,
            title                : 'Install Lantern Designer',
            body                 : 'Safari on macOS installs web apps from the File menu. Adding Lantern Designer to the Dock gives it its own window and offline access.',
            steps                : stepEntries,
            arrowDirection       : 'top',                                                                          // <-- Menu bar sits at the top of the screen
            primaryActionLabel   : null,                                                                           // <-- No programmatic install is available
            secondaryActionLabel : 'Got it',                                                                       // <-- Friendly dismiss label
            onPrimary            : null,
            onDismiss            : VghLantern__Pwa__Handler__MacSafari__OnDismiss
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Handle User Dismissal of the Sheet
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Handler__MacSafari__OnDismiss() {
        if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.recordDismissal) {
            window.VghLantern__Pwa__SessionState.recordDismissal(VghLantern__Pwa__Handler__MacSafari__PlatformIdContext); // <-- Advance the snooze ladder
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Activate Handler for the Given Platform Descriptor
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__MacSafari__Activate(platformDescriptor) {
        VghLantern__Pwa__Handler__MacSafari__PlatformIdContext =                                                  // <-- Persist the platform id
            (platformDescriptor && platformDescriptor.platformId) || 'mac-safari';
    }
    // ---------------------------------------------------------------


    // FUNCTION | Request Sheet Display
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__MacSafari__RequestShow() {
        if (VghLantern__Pwa__Handler__MacSafari__SuppressShow) return;                                            // <-- Suppressed by the controller
        if (!window.VghLantern__Pwa__PromptUi || !window.VghLantern__Pwa__PromptUi.show) return;                  // <-- Prompt UI not loaded yet

        if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.isSuppressed) {
            if (window.VghLantern__Pwa__SessionState.isSuppressed(VghLantern__Pwa__Handler__MacSafari__PlatformIdContext)) {
                return;                                                                                            // <-- Snooze still active
            }
        }

        window.VghLantern__Pwa__PromptUi.show(VghLantern__Pwa__Handler__MacSafari__BuildPromptConfig());          // <-- Render the instruction sheet
    }
    // ---------------------------------------------------------------


    // FUNCTION | Set the Suppress Flag
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__MacSafari__SetSuppressed(shouldSuppress) {
        VghLantern__Pwa__Handler__MacSafari__SuppressShow = Boolean(shouldSuppress);                              // <-- Update the suppress flag
        if (VghLantern__Pwa__Handler__MacSafari__SuppressShow && window.VghLantern__Pwa__PromptUi && window.VghLantern__Pwa__PromptUi.hide) {
            window.VghLantern__Pwa__PromptUi.hide();                                                              // <-- Hide if currently showing
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    if (typeof window !== 'undefined') {
        window.VghLantern__Pwa__Handler__MacSafari = {                                                            // <-- Expose the handler API
            activate      : VghLantern__Pwa__Handler__MacSafari__Activate,
            requestShow   : VghLantern__Pwa__Handler__MacSafari__RequestShow,
            setSuppressed : VghLantern__Pwa__Handler__MacSafari__SetSuppressed
        };
    }

// endregion -------------------------------------------------------------------

})();
