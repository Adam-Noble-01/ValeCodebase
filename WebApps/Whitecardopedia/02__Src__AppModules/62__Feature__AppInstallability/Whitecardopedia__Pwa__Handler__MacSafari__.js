// =============================================================================
// WHITECARDOPEDIA - PWA HANDLER (MACOS SAFARI)
// =============================================================================
//
// FILE       : Whitecardopedia__Pwa__Handler__MacSafari__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__Pwa__Handler__MacSafari
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Surface Add to Dock instructions for macOS Safari users
// CREATED    : 2026
//
// DESCRIPTION:
// - Safari 17+ on macOS supports installing web apps via File -> Add to Dock.
//   There is no programmatic API, so this handler renders a centred sheet
//   with a clear three-step explanation and a discreet dismiss action.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Active Platform Context
    // ------------------------------------------------------------
    let Whitecardopedia__Pwa__Handler__MacSafari__PlatformIdContext = '';                                                           // <-- Active platform identifier
    let Whitecardopedia__Pwa__Handler__MacSafari__SuppressShow      = false;                                                        // <-- Suppress flag from controller
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Prompt Configuration
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__MacSafari__BuildPromptConfig() {
        const urlHelper         = window.Whitecardopedia__Pwa__Url || null;                                                         // <-- Resolve URL helper
        const iconUrl           = urlHelper && urlHelper.buildPwaModuleUrl                                                          // <-- Use 192 PNG as visual cue
            ? urlHelper.buildPwaModuleUrl('Na__AppInstallability__Icon__192x192.png')
            : null;

        const stepEntries       = [                                                                                                 // <-- Apple Add-to-Dock flow
            'In the Safari menu bar, click "File".',
            'Select "Add to Dock..." from the dropdown.',
            'Confirm with "Add" to launch ValeVision 3D as a standalone app.'
        ];

        return {
            variant              : 'sheet',                                                                                         // <-- Centred sheet variant
            iconUrl              : iconUrl,
            title                : 'Add ValeVision 3D to your Dock',
            body                 : 'Safari on macOS lets you install web apps from the File menu. Follow the steps below to add a Vale icon to your Dock.',
            steps                : stepEntries,
            primaryActionLabel   : null,                                                                                            // <-- No native trigger
            secondaryActionLabel : 'Got it',                                                                                        // <-- Friendly dismiss label
            onPrimary            : null,
            onDismiss            : Whitecardopedia__Pwa__Handler__MacSafari__OnDismiss
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Handle User Dismissal of Sheet
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__MacSafari__OnDismiss() {
        if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.recordDismissal) {
            window.Whitecardopedia__Pwa__SessionState.recordDismissal(Whitecardopedia__Pwa__Handler__MacSafari__PlatformIdContext); // <-- Snooze ladder advance
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Activate Handler for Platform Descriptor
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__MacSafari__Activate(platformDescriptor) {
        Whitecardopedia__Pwa__Handler__MacSafari__PlatformIdContext = (platformDescriptor && platformDescriptor.platformId) || 'mac-safari';   // <-- Persist platform id
    }
    // ---------------------------------------------------------------


    // FUNCTION | Request Sheet Display
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__MacSafari__RequestShow() {
        if (Whitecardopedia__Pwa__Handler__MacSafari__SuppressShow) return;                                                         // <-- Suppressed by controller
        if (!window.Whitecardopedia__Pwa__PromptUi || !window.Whitecardopedia__Pwa__PromptUi.show) return;                          // <-- UI not loaded yet

        if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.isSuppressed) {
            if (window.Whitecardopedia__Pwa__SessionState.isSuppressed(Whitecardopedia__Pwa__Handler__MacSafari__PlatformIdContext)) {
                return;                                                                                                             // <-- Snooze still active
            }
        }

        window.Whitecardopedia__Pwa__PromptUi.show(Whitecardopedia__Pwa__Handler__MacSafari__BuildPromptConfig());                  // <-- Render instructions sheet
    }
    // ---------------------------------------------------------------


    // FUNCTION | Set Suppress Flag (e.g. running standalone)
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__Handler__MacSafari__SetSuppressed(shouldSuppress) {
        Whitecardopedia__Pwa__Handler__MacSafari__SuppressShow = Boolean(shouldSuppress);                                           // <-- Update suppress flag
        if (Whitecardopedia__Pwa__Handler__MacSafari__SuppressShow && window.Whitecardopedia__Pwa__PromptUi && window.Whitecardopedia__Pwa__PromptUi.hide) {
            window.Whitecardopedia__Pwa__PromptUi.hide();                                                                           // <-- Hide if showing
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    if (typeof window !== 'undefined') {
        window.Whitecardopedia__Pwa__Handler__MacSafari = {                                                                         // <-- Expose handler API
            activate      : Whitecardopedia__Pwa__Handler__MacSafari__Activate,
            requestShow   : Whitecardopedia__Pwa__Handler__MacSafari__RequestShow,
            setSuppressed : Whitecardopedia__Pwa__Handler__MacSafari__SetSuppressed
        };
    }

// endregion -------------------------------------------------------------------

})();
