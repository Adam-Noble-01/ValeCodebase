// =============================================================================
// WHITECARDOPEDIA - PWA INSTALL CONTROLLER (ORCHESTRATOR)
// =============================================================================
//
// FILE       : Whitecardopedia__Pwa__InstallController__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__Pwa__InstallController
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Pick the correct platform handler and govern when to prompt
// CREATED    : 2026
//
// DESCRIPTION:
// - Reads the platform descriptor from Whitecardopedia__Pwa__PlatformDetector
//   and activates the matching platform handler module.
// - Honours session state (snooze ladder, installed flag) and live changes
//   to the standalone display mode.
// - Schedules the first prompt after a small delay so it never competes
//   with the application's own boot UI.
// - Exposes a small public API (`requestShow`, `dismissNow`) so other
//   features (e.g. About menu) can re-trigger the install flow on demand.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Display Timing
    // ------------------------------------------------------------
    const INSTALL_CONTROLLER_FIRST_SHOW_DELAY_MS    = 4500;                                                                         // <-- Delay before first prompt attempt
    const INSTALL_CONTROLLER_RETRY_INTERVAL_MS      = 1500;                                                                         // <-- Retry cadence while handler is warming up
    const INSTALL_CONTROLLER_MAX_RETRY_ATTEMPTS     = 6;                                                                            // <-- Cap on retry attempts
    // ------------------------------------------------------------


    // MODULE VARIABLES | Internal State
    // ------------------------------------------------------------
    let Whitecardopedia__Pwa__InstallController__ActiveDescriptor   = null;                                                         // <-- Current platform descriptor
    let Whitecardopedia__Pwa__InstallController__ActiveHandler      = null;                                                         // <-- Selected handler reference
    let Whitecardopedia__Pwa__InstallController__StandaloneUnsub    = null;                                                         // <-- Disposer for standalone listener
    let Whitecardopedia__Pwa__InstallController__InitDone           = false;                                                        // <-- Idempotent init flag
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Handler Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Handler for Platform Identifier
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__InstallController__ResolveHandler(platformId) {
        const PlatformIds       = (window.Whitecardopedia__Pwa__PlatformDetector && window.Whitecardopedia__Pwa__PlatformDetector.PlatformIds) || {}; // <-- Token map

        if (platformId === PlatformIds.InstalledStandalone) {
            return window.Whitecardopedia__Pwa__Handler__InstalledStandalone || null;                                               // <-- Already installed
        }

        if (platformId === PlatformIds.IosSafariIphone || platformId === PlatformIds.IosSafariIpad) {
            return window.Whitecardopedia__Pwa__Handler__IosSafari || null;                                                         // <-- iPhone / iPad Safari
        }

        if (platformId === PlatformIds.IosNonSafari) {
            return window.Whitecardopedia__Pwa__Handler__IosNonSafari || null;                                                      // <-- iOS Chrome / Edge / Firefox
        }

        if (platformId === PlatformIds.MacSafari) {
            return window.Whitecardopedia__Pwa__Handler__MacSafari || null;                                                         // <-- macOS Safari
        }

        if (
            platformId === PlatformIds.ChromiumDesktopWindows ||
            platformId === PlatformIds.ChromiumDesktopMac ||
            platformId === PlatformIds.ChromiumDesktopLinux ||
            platformId === PlatformIds.ChromiumAndroid
        ) {
            return window.Whitecardopedia__Pwa__Handler__Chromium || null;                                                          // <-- Chromium family
        }

        return null;                                                                                                                // <-- Firefox desktop / Android / Unknown -> no handler
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Probe Related Installed Apps API
    // ---------------------------------------------------------------
    async function Whitecardopedia__Pwa__InstallController__IsRelatedAppInstalled() {
        try {
            if (!navigator.getInstalledRelatedApps) return false;                                                                   // <-- API unavailable
            const relatedAppList = await navigator.getInstalledRelatedApps();                                                       // <-- Fetch list
            return Array.isArray(relatedAppList) && relatedAppList.length > 0;                                                      // <-- Any entry implies installed
        } catch (error) {
            return false;                                                                                                           // <-- Treat errors as "not installed"
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Show Scheduling
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Attempt to Trigger Handler Show
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__InstallController__AttemptShow(remainingAttempts) {
        const activeHandler     = Whitecardopedia__Pwa__InstallController__ActiveHandler;                                           // <-- Snapshot active handler
        if (!activeHandler) return;                                                                                                 // <-- No handler -> bail

        if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.isSuppressed) {
            const platformId    = (Whitecardopedia__Pwa__InstallController__ActiveDescriptor || {}).platformId || '';               // <-- Descriptor platform id
            if (window.Whitecardopedia__Pwa__SessionState.isSuppressed(platformId)) {
                return;                                                                                                             // <-- Snooze active -> do nothing
            }
        }

        if (typeof activeHandler.requestShow === 'function') {
            activeHandler.requestShow();                                                                                            // <-- Ask handler to render
        }

        if (remainingAttempts > 0 && window.Whitecardopedia__Pwa__PromptUi && !window.Whitecardopedia__Pwa__PromptUi.isVisible()) {
            setTimeout(() => Whitecardopedia__Pwa__InstallController__AttemptShow(remainingAttempts - 1), INSTALL_CONTROLLER_RETRY_INTERVAL_MS); // <-- Retry while handler warms up (Chromium event arrival, etc.)
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Handle Standalone Mode Change
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__InstallController__OnStandaloneChange(isStandaloneNow) {
        if (!isStandaloneNow) return;                                                                                               // <-- Only act when entering standalone

        if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.markInstalled) {
            window.Whitecardopedia__Pwa__SessionState.markInstalled();                                                              // <-- Persist install state
        }

        if (Whitecardopedia__Pwa__InstallController__ActiveHandler && typeof Whitecardopedia__Pwa__InstallController__ActiveHandler.setSuppressed === 'function') {
            Whitecardopedia__Pwa__InstallController__ActiveHandler.setSuppressed(true);                                             // <-- Suppress active handler
        }

        if (window.Whitecardopedia__Pwa__PromptUi && window.Whitecardopedia__Pwa__PromptUi.hide) {
            window.Whitecardopedia__Pwa__PromptUi.hide();                                                                           // <-- Tear down any prompt
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Controller and Activate Platform Handler
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__InstallController__Initialize() {
        if (Whitecardopedia__Pwa__InstallController__InitDone) return;                                                              // <-- Idempotent guard
        Whitecardopedia__Pwa__InstallController__InitDone = true;                                                                   // <-- Mark initialised

        const platformDetector  = window.Whitecardopedia__Pwa__PlatformDetector;                                                    // <-- Resolve detector
        if (!platformDetector || !platformDetector.getPlatformDescriptor) return;                                                   // <-- No detector -> bail safely

        const descriptor        = platformDetector.getPlatformDescriptor();                                                         // <-- Build descriptor snapshot
        Whitecardopedia__Pwa__InstallController__ActiveDescriptor = descriptor;                                                     // <-- Persist descriptor

        const handlerInstance   = Whitecardopedia__Pwa__InstallController__ResolveHandler(descriptor.platformId);                   // <-- Pick handler
        Whitecardopedia__Pwa__InstallController__ActiveHandler = handlerInstance;                                                   // <-- Persist handler reference

        if (handlerInstance && typeof handlerInstance.activate === 'function') {
            handlerInstance.activate(descriptor);                                                                                   // <-- Wire handler to descriptor
        }

        Whitecardopedia__Pwa__InstallController__StandaloneUnsub = platformDetector.subscribeStandaloneChanges                      // <-- Watch live mode changes
            ? platformDetector.subscribeStandaloneChanges(Whitecardopedia__Pwa__InstallController__OnStandaloneChange)
            : null;

        if (descriptor.platformId === platformDetector.PlatformIds.InstalledStandalone) {
            return;                                                                                                                 // <-- Already running standalone -> skip prompt scheduling
        }

        const isRelatedAppInstalled = await Whitecardopedia__Pwa__InstallController__IsRelatedAppInstalled();                       // <-- Check related apps API
        if (isRelatedAppInstalled) {
            if (handlerInstance && typeof handlerInstance.setSuppressed === 'function') {
                handlerInstance.setSuppressed(true);                                                                                // <-- Suppress when related app installed
            }
            return;
        }

        setTimeout(() => Whitecardopedia__Pwa__InstallController__AttemptShow(INSTALL_CONTROLLER_MAX_RETRY_ATTEMPTS), INSTALL_CONTROLLER_FIRST_SHOW_DELAY_MS); // <-- Schedule first show attempt
    }
    // ---------------------------------------------------------------


    // FUNCTION | Manually Request Prompt (e.g. from About menu)
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__InstallController__RequestShow() {
        if (Whitecardopedia__Pwa__InstallController__ActiveHandler && typeof Whitecardopedia__Pwa__InstallController__ActiveHandler.requestShow === 'function') {
            Whitecardopedia__Pwa__InstallController__ActiveHandler.requestShow();                                                   // <-- Delegate to handler
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Dismiss Any Active Prompt
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__InstallController__DismissNow() {
        if (window.Whitecardopedia__Pwa__PromptUi && window.Whitecardopedia__Pwa__PromptUi.hide) {
            window.Whitecardopedia__Pwa__PromptUi.hide();                                                                           // <-- Tear down DOM
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Active Platform Descriptor (Diagnostic)
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__InstallController__GetActiveDescriptor() {
        return Whitecardopedia__Pwa__InstallController__ActiveDescriptor;                                                           // <-- Expose for diagnostics
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bootstrap
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Bootstrap Initialization
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__InstallController__Bootstrap() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        window.Whitecardopedia__Pwa__InstallController = {                                                                          // <-- Public API surface
            initialize           : Whitecardopedia__Pwa__InstallController__Initialize,
            requestShow          : Whitecardopedia__Pwa__InstallController__RequestShow,
            dismissNow           : Whitecardopedia__Pwa__InstallController__DismissNow,
            getActiveDescriptor  : Whitecardopedia__Pwa__InstallController__GetActiveDescriptor
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => Whitecardopedia__Pwa__InstallController__Initialize());             // <-- Defer until DOM ready
            return;
        }

        Whitecardopedia__Pwa__InstallController__Initialize();                                                                      // <-- DOM already ready -> init immediately
    }
    // ---------------------------------------------------------------


    Whitecardopedia__Pwa__InstallController__Bootstrap();                                                                           // <-- Kick off bootstrap

// endregion -------------------------------------------------------------------

})();
