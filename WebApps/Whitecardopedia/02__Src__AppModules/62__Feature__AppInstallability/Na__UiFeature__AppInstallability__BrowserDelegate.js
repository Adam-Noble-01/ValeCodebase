// =============================================================================
// WHITECARDOPEDIA - LEGACY APP INSTALLABILITY BROWSER DELEGATE (SHIM)
// =============================================================================
//
// FILE       : Na__UiFeature__AppInstallability__BrowserDelegate.js
// NAMESPACE  : Whitecardopedia
// MODULE     : AppInstallabilityBrowserDelegate (Legacy Shim)
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Maintain backwards-compatible global API for existing callers
// CREATED    : 2026 (refactored from prior implementation)
//
// DESCRIPTION:
// - The previous implementation has been replaced by the modular Pwa module
//   stack (Whitecardopedia__Pwa__*). This shim keeps the historical global
//   `Na__AppInstallability__BrowserDelegate` API alive so any existing UI
//   integrations continue to work.
// - All real logic now lives in:
//     * Whitecardopedia__Pwa__InstallController__.js
//     * Whitecardopedia__Pwa__Handler__Chromium__.js
//     * Whitecardopedia__Pwa__PlatformDetector__.js
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Legacy API Surface
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Detect Standalone Installed Mode
    // ---------------------------------------------------------------
    function Na__AppInstallability__IsStandaloneMode() {
        const platformDetector  = window.Whitecardopedia__Pwa__PlatformDetector;                                                    // <-- Resolve detector
        if (platformDetector && typeof platformDetector.isStandaloneDisplay === 'function') {
            return platformDetector.isStandaloneDisplay();                                                                          // <-- Delegate to detector
        }

        const isIosStandaloneMode      = window.navigator && window.navigator.standalone === true;                                  // <-- Legacy iOS signal
        const isDisplayModeStandalone  = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;              // <-- Modern signal
        return Boolean(isIosStandaloneMode || isDisplayModeStandalone);                                                             // <-- Inclusive standalone detection
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Check Install Prompt Availability
    // ---------------------------------------------------------------
    function Na__AppInstallability__IsPromptAvailable() {
        const controller        = window.Whitecardopedia__Pwa__InstallController;                                                   // <-- Resolve controller
        if (!controller || typeof controller.getActiveDescriptor !== 'function') return false;                                      // <-- Controller not ready

        const descriptor        = controller.getActiveDescriptor();                                                                 // <-- Active descriptor
        if (!descriptor) return false;                                                                                              // <-- Not initialised yet

        const PlatformIds       = (window.Whitecardopedia__Pwa__PlatformDetector || {}).PlatformIds || {};                          // <-- Token map
        if (descriptor.platformId === PlatformIds.InstalledStandalone) return false;                                                // <-- Already installed

        return true;                                                                                                                // <-- A handler exists for this platform
    }
    // ---------------------------------------------------------------


    // FUNCTION | Trigger Browser Install Prompt
    // ------------------------------------------------------------
    async function Na__AppInstallability__TriggerInstallPrompt() {
        const controller        = window.Whitecardopedia__Pwa__InstallController;                                                   // <-- Resolve controller
        if (!controller || typeof controller.requestShow !== 'function') {
            return { success: false, reason: 'controller-not-available' };                                                          // <-- Bail when controller missing
        }

        controller.requestShow();                                                                                                   // <-- Forward to active handler
        return { success: true, outcome: 'forwarded' };                                                                              // <-- Indicate dispatch only
    }
    // ---------------------------------------------------------------


    // FUNCTION | Initialize Global Browser Delegate API (Legacy)
    // ------------------------------------------------------------
    function Na__AppInstallability__InitializeBrowserDelegate() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        window.Na__AppInstallability__BrowserDelegate = {                                                                           // <-- Legacy API surface
            isStandaloneMode      : Na__AppInstallability__IsStandaloneMode,
            isPromptAvailable     : Na__AppInstallability__IsPromptAvailable,
            triggerInstallPrompt  : Na__AppInstallability__TriggerInstallPrompt
        };
    }
    // ---------------------------------------------------------------


    Na__AppInstallability__InitializeBrowserDelegate();                                                                             // <-- Mount shim immediately

// endregion -------------------------------------------------------------------

})();
