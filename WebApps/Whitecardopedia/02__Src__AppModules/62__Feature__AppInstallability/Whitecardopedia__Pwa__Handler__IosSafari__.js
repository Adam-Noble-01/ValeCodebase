// =============================================================================
// WHITECARDOPEDIA - PWA HANDLER (IOS SAFARI - IPHONE & IPAD)
// =============================================================================
//
// FILE       : Whitecardopedia__Pwa__Handler__IosSafari__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__Pwa__Handler__IosSafari
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Render Add to Home Screen instructions for iOS / iPadOS Safari
// CREATED    : 2026
//
// DESCRIPTION:
// - Apple does not implement `beforeinstallprompt`, so installation requires
//   manual interaction with the Safari Share menu. This handler renders a
//   centred instruction sheet that walks the user through the steps and
//   points an animated arrow at the share icon.
// - Arrow direction is platform-aware:
//     * iPhone Safari -> share icon at the bottom of the screen
//     * iPad / iPadOS Safari -> share icon at the top right of the toolbar
// - Snoozes via the shared session state on dismissal.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Active Platform Context
    // ------------------------------------------------------------
    let Whitecardopedia__Pwa__Handler__IosSafari__PlatformIdContext     = '';                                                       // <-- Active platform identifier
    let Whitecardopedia__Pwa__Handler__IosSafari__SuppressShow          = false;                                                    // <-- Suppress flag from controller
    let Whitecardopedia__Pwa__Handler__IosSafari__IsIpadDevice          = false;                                                    // <-- Cached iPad flag
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Prompt Configuration for iOS Safari
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__IosSafari__BuildPromptConfig() {
        const urlHelper         = window.Whitecardopedia__Pwa__Url || null;                                                         // <-- Resolve URL helper
        const iconUrl           = urlHelper && urlHelper.buildPwaModuleUrl                                                          // <-- Use 192 PNG as visual cue
            ? urlHelper.buildPwaModuleUrl('Na__AppInstallability__Icon__192x192.png')
            : null;

        const arrowDirection    = Whitecardopedia__Pwa__Handler__IosSafari__IsIpadDevice ? 'top' : 'bottom';                        // <-- Point at share icon location

        const stepEntries       = [                                                                                                 // <-- Three-step Apple flow
            'Tap the Share button in Safari (the square with the upward arrow).',
            'Scroll the share sheet and tap "Add to Home Screen".',
            'Confirm with "Add" - the ValeVision 3D icon will appear on your home screen.'
        ];

        return {
            variant              : 'sheet',                                                                                         // <-- Use centred sheet variant
            iconUrl              : iconUrl,
            title                : 'Install ValeVision 3D',
            body                 : 'Apple devices install web apps via the Share menu. Follow the steps below to pin ValeVision 3D to your home screen.',
            steps                : stepEntries,
            arrowDirection       : arrowDirection,
            primaryActionLabel   : null,                                                                                            // <-- No native trigger available
            secondaryActionLabel : 'Got it',                                                                                        // <-- Friendly dismiss label
            onPrimary            : null,
            onDismiss            : Whitecardopedia__Pwa__Handler__IosSafari__OnDismiss
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Handle User Dismissal of Sheet
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__IosSafari__OnDismiss() {
        if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.recordDismissal) {
            window.Whitecardopedia__Pwa__SessionState.recordDismissal(Whitecardopedia__Pwa__Handler__IosSafari__PlatformIdContext); // <-- Snooze ladder advance
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Activate Handler for Platform Descriptor
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__IosSafari__Activate(platformDescriptor) {
        Whitecardopedia__Pwa__Handler__IosSafari__PlatformIdContext = (platformDescriptor && platformDescriptor.platformId) || 'ios-safari';   // <-- Persist platform id
        Whitecardopedia__Pwa__Handler__IosSafari__IsIpadDevice      = Boolean(platformDescriptor && platformDescriptor.isIpadDevice);          // <-- Cache iPad flag
    }
    // ---------------------------------------------------------------


    // FUNCTION | Request Sheet Display
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__IosSafari__RequestShow() {
        if (Whitecardopedia__Pwa__Handler__IosSafari__SuppressShow) return;                                                         // <-- Suppressed by controller
        if (!window.Whitecardopedia__Pwa__PromptUi || !window.Whitecardopedia__Pwa__PromptUi.show) return;                          // <-- UI not loaded yet

        if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.isSuppressed) {
            if (window.Whitecardopedia__Pwa__SessionState.isSuppressed(Whitecardopedia__Pwa__Handler__IosSafari__PlatformIdContext)) {
                return;                                                                                                             // <-- Snooze still active
            }
        }

        window.Whitecardopedia__Pwa__PromptUi.show(Whitecardopedia__Pwa__Handler__IosSafari__BuildPromptConfig());                  // <-- Render instructions sheet
    }
    // ---------------------------------------------------------------


    // FUNCTION | Set Suppress Flag (e.g. running standalone)
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__IosSafari__SetSuppressed(shouldSuppress) {
        Whitecardopedia__Pwa__Handler__IosSafari__SuppressShow = Boolean(shouldSuppress);                                           // <-- Update suppress flag
        if (Whitecardopedia__Pwa__Handler__IosSafari__SuppressShow && window.Whitecardopedia__Pwa__PromptUi && window.Whitecardopedia__Pwa__PromptUi.hide) {
            window.Whitecardopedia__Pwa__PromptUi.hide();                                                                           // <-- Hide if showing
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    if (typeof window !== 'undefined') {
        window.Whitecardopedia__Pwa__Handler__IosSafari = {                                                                         // <-- Expose handler API
            activate      : Whitecardopedia__Pwa__Handler__IosSafari__Activate,
            requestShow   : Whitecardopedia__Pwa__Handler__IosSafari__RequestShow,
            setSuppressed : Whitecardopedia__Pwa__Handler__IosSafari__SetSuppressed
        };
    }

// endregion -------------------------------------------------------------------

})();
