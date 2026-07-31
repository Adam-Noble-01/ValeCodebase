/* =============================================================================
   VGHLANTERN - PWA HANDLER | IOS SAFARI
   =============================================================================

   FILE       : VghLantern__Pwa__Handler__IosSafari__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__Pwa__Handler__IosSafari
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Present manual Add to Home Screen guidance on iPhone and iPad
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Safari on iOS has no beforeinstallprompt event and no programmatic install
     API, so the only route is guiding the user through the share sheet.
   - Renders the instruction sheet variant with a three-step walkthrough.
   - The arrow points down on iPhone, where the share button sits in the bottom
     toolbar, and up on iPad, where it sits in the top toolbar.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Handler Context Flags
    // ------------------------------------------------------------
    var VghLantern__Pwa__Handler__IosSafari__PlatformIdContext = '';                                              // <-- Active platform identifier
    var VghLantern__Pwa__Handler__IosSafari__IsIpadDevice      = false;                                           // <-- Cached iPad flag
    var VghLantern__Pwa__Handler__IosSafari__SuppressShow      = false;                                           // <-- Suppress flag set by the controller
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Prompt Configuration for iOS Safari
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Handler__IosSafari__BuildPromptConfig() {
        var urlHelper       = window.VghLantern__Pwa__Url || null;                                                // <-- Resolve the URL helper
        var iconUrl         = (urlHelper && urlHelper.getAppIconUrl) ? urlHelper.getAppIconUrl(192) : null;       // <-- 192px icon as the visual cue

        var arrowDirection  = VghLantern__Pwa__Handler__IosSafari__IsIpadDevice ? 'top' : 'bottom';               // <-- Point at the share button location

        var stepEntries     = [                                                                                   // <-- Three-step Apple flow
            'Tap the Share button in Safari (the square with the upward arrow).',
            'Scroll the share sheet and tap "Add to Home Screen".',
            'Confirm with "Add" and the Lantern Designer icon appears on your home screen.'
        ];

        return {
            variant              : 'sheet',                                                                        // <-- Centred sheet variant
            iconUrl              : iconUrl,
            title                : 'Install Lantern Designer',
            body                 : 'Apple devices install web apps through the Share menu. Follow the steps below to add Lantern Designer to your home screen.',
            steps                : stepEntries,
            arrowDirection       : arrowDirection,
            primaryActionLabel   : null,                                                                           // <-- No programmatic install is available
            secondaryActionLabel : 'Got it',                                                                       // <-- Friendly dismiss label
            onPrimary            : null,
            onDismiss            : VghLantern__Pwa__Handler__IosSafari__OnDismiss
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Handle User Dismissal of the Sheet
    // ---------------------------------------------------------------
    function VghLantern__Pwa__Handler__IosSafari__OnDismiss() {
        if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.recordDismissal) {
            window.VghLantern__Pwa__SessionState.recordDismissal(VghLantern__Pwa__Handler__IosSafari__PlatformIdContext); // <-- Advance the snooze ladder
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Activate Handler for the Given Platform Descriptor
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__IosSafari__Activate(platformDescriptor) {
        VghLantern__Pwa__Handler__IosSafari__PlatformIdContext =                                                  // <-- Persist the platform id
            (platformDescriptor && platformDescriptor.platformId) || 'ios-safari';
        VghLantern__Pwa__Handler__IosSafari__IsIpadDevice =                                                       // <-- Cache the iPad flag
            Boolean(platformDescriptor && platformDescriptor.isIpadDevice);
    }
    // ---------------------------------------------------------------


    // FUNCTION | Request Sheet Display
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__IosSafari__RequestShow() {
        if (VghLantern__Pwa__Handler__IosSafari__SuppressShow) return;                                            // <-- Suppressed by the controller
        if (!window.VghLantern__Pwa__PromptUi || !window.VghLantern__Pwa__PromptUi.show) return;                  // <-- Prompt UI not loaded yet

        if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.isSuppressed) {
            if (window.VghLantern__Pwa__SessionState.isSuppressed(VghLantern__Pwa__Handler__IosSafari__PlatformIdContext)) {
                return;                                                                                            // <-- Snooze still active
            }
        }

        window.VghLantern__Pwa__PromptUi.show(VghLantern__Pwa__Handler__IosSafari__BuildPromptConfig());          // <-- Render the instruction sheet
    }
    // ---------------------------------------------------------------


    // FUNCTION | Set the Suppress Flag
    // ------------------------------------------------------------
    function VghLantern__Pwa__Handler__IosSafari__SetSuppressed(shouldSuppress) {
        VghLantern__Pwa__Handler__IosSafari__SuppressShow = Boolean(shouldSuppress);                              // <-- Update the suppress flag
        if (VghLantern__Pwa__Handler__IosSafari__SuppressShow && window.VghLantern__Pwa__PromptUi && window.VghLantern__Pwa__PromptUi.hide) {
            window.VghLantern__Pwa__PromptUi.hide();                                                              // <-- Hide if currently showing
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    if (typeof window !== 'undefined') {
        window.VghLantern__Pwa__Handler__IosSafari = {                                                            // <-- Expose the handler API
            activate      : VghLantern__Pwa__Handler__IosSafari__Activate,
            requestShow   : VghLantern__Pwa__Handler__IosSafari__RequestShow,
            setSuppressed : VghLantern__Pwa__Handler__IosSafari__SetSuppressed
        };
    }

// endregion -------------------------------------------------------------------

})();
