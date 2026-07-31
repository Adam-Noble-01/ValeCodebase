/* =============================================================================
   VGHLANTERN - PWA INSTALL CONTROLLER
   =============================================================================

   FILE       : VghLantern__Pwa__InstallController__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__Pwa__InstallController
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Pick the correct platform handler and govern when to prompt
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Reads the platform descriptor from VghLantern__Pwa__PlatformDetector and
     activates the matching platform handler module.
   - Honours session state (snooze ladder, installed flag) and live changes to
     the standalone display mode.
   - Schedules the first prompt after a short delay so it never competes with the
     application's own boot sequence, and retries a bounded number of times while
     a handler warms up (Chromium fires beforeinstallprompt asynchronously).
   - Defers while the web demo notice modal is on screen, so a first-time web
     visitor reads one message at a time rather than two stacked panels.
   - Exposes requestShow and dismissNow so other features can drive the install
     flow on demand, for example from a menu item.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Display Timing
    // ------------------------------------------------------------
    var INSTALL_CONTROLLER_FIRST_SHOW_DELAY_MS = 4500;                                                            // <-- Delay before the first prompt attempt
    var INSTALL_CONTROLLER_RETRY_INTERVAL_MS   = 1500;                                                            // <-- Retry cadence while a handler warms up
    var INSTALL_CONTROLLER_MAX_RETRY_ATTEMPTS  = 6;                                                               // <-- Cap on retry attempts
    // ------------------------------------------------------------


    // MODULE VARIABLES | Internal State
    // ------------------------------------------------------------
    var VghLantern__Pwa__InstallController__ActiveDescriptor = null;                                              // <-- Current platform descriptor
    var VghLantern__Pwa__InstallController__ActiveHandler    = null;                                              // <-- Selected handler reference
    var VghLantern__Pwa__InstallController__StandaloneUnsub  = null;                                              // <-- Disposer for the standalone listener
    var VghLantern__Pwa__InstallController__InitDone         = false;                                             // <-- Idempotent init flag
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Handler Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Handler for a Platform Identifier
    // ---------------------------------------------------------------
    function VghLantern__Pwa__InstallController__ResolveHandler(platformId) {
        var PlatformIds = (window.VghLantern__Pwa__PlatformDetector && window.VghLantern__Pwa__PlatformDetector.PlatformIds) || {}; // <-- Token map

        if (platformId === PlatformIds.InstalledStandalone) {
            return window.VghLantern__Pwa__Handler__InstalledStandalone || null;                                  // <-- Already installed
        }

        if (platformId === PlatformIds.IosSafariIphone || platformId === PlatformIds.IosSafariIpad) {
            return window.VghLantern__Pwa__Handler__IosSafari || null;                                            // <-- iPhone and iPad Safari
        }

        if (platformId === PlatformIds.IosNonSafari) {
            return window.VghLantern__Pwa__Handler__IosNonSafari || null;                                         // <-- iOS Chrome, Edge and Firefox
        }

        if (platformId === PlatformIds.MacSafari) {
            return window.VghLantern__Pwa__Handler__MacSafari || null;                                            // <-- macOS Safari
        }

        if (
            platformId === PlatformIds.ChromiumDesktopWindows ||
            platformId === PlatformIds.ChromiumDesktopMac ||
            platformId === PlatformIds.ChromiumDesktopLinux ||
            platformId === PlatformIds.ChromiumAndroid
        ) {
            return window.VghLantern__Pwa__Handler__Chromium || null;                                             // <-- Chromium family
        }

        return null;                                                                                               // <-- Firefox and unknown agents get no handler
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Probe the Related Installed Apps API
    // ---------------------------------------------------------------
    async function VghLantern__Pwa__InstallController__IsRelatedAppInstalled() {
        try {
            if (!navigator.getInstalledRelatedApps) return false;                                                 // <-- API unavailable
            var relatedAppList = await navigator.getInstalledRelatedApps();                                       // <-- Fetch the list
            return Array.isArray(relatedAppList) && relatedAppList.length > 0;                                    // <-- Any entry implies installed
        } catch (probeError) {
            return false;                                                                                          // <-- Treat errors as not installed
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Report Whether the Web Demo Notice Is On Screen
    // ---------------------------------------------------------------
    function VghLantern__Pwa__InstallController__IsDemoNoticeVisible() {
        var noticeModule = window.VghLantern__WebDemoMode__NoticeModal || null;                                   // <-- Optional module, may not be loaded
        if (!noticeModule || typeof noticeModule.isVisible !== 'function') return false;                          // <-- Nothing to defer to
        return Boolean(noticeModule.isVisible());                                                                 // <-- Defer while the notice is showing
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Show Scheduling
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Attempt to Trigger a Handler Show
    // ---------------------------------------------------------------
    function VghLantern__Pwa__InstallController__AttemptShow(remainingAttempts) {
        var activeHandler = VghLantern__Pwa__InstallController__ActiveHandler;                                    // <-- Snapshot the active handler
        if (!activeHandler) return;                                                                               // <-- No handler, nothing to do

        var platformId    = (VghLantern__Pwa__InstallController__ActiveDescriptor || {}).platformId || '';        // <-- Descriptor platform id

        if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.isSuppressed) {
            if (window.VghLantern__Pwa__SessionState.isSuppressed(platformId)) {
                return;                                                                                            // <-- Snooze active, stop entirely
            }
        }

        var isDeferredByNotice = VghLantern__Pwa__InstallController__IsDemoNoticeVisible();                       // <-- Web demo notice takes precedence

        if (!isDeferredByNotice && typeof activeHandler.requestShow === 'function') {
            activeHandler.requestShow();                                                                          // <-- Ask the handler to render
        }

        var shouldRetry = remainingAttempts > 0
            && (isDeferredByNotice || (window.VghLantern__Pwa__PromptUi && !window.VghLantern__Pwa__PromptUi.isVisible()));

        if (shouldRetry) {
            setTimeout(function () {
                VghLantern__Pwa__InstallController__AttemptShow(remainingAttempts - 1);                           // <-- Retry while the handler warms up or the notice clears
            }, INSTALL_CONTROLLER_RETRY_INTERVAL_MS);
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Handle a Standalone Mode Change
    // ---------------------------------------------------------------
    function VghLantern__Pwa__InstallController__OnStandaloneChange(isStandaloneNow) {
        if (!isStandaloneNow) return;                                                                             // <-- Only act when entering standalone

        if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.markInstalled) {
            window.VghLantern__Pwa__SessionState.markInstalled();                                                 // <-- Persist the install state
        }

        if (VghLantern__Pwa__InstallController__ActiveHandler && typeof VghLantern__Pwa__InstallController__ActiveHandler.setSuppressed === 'function') {
            VghLantern__Pwa__InstallController__ActiveHandler.setSuppressed(true);                                // <-- Suppress the active handler
        }

        if (window.VghLantern__Pwa__PromptUi && window.VghLantern__Pwa__PromptUi.hide) {
            window.VghLantern__Pwa__PromptUi.hide();                                                              // <-- Tear down any visible prompt
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Controller and Activate the Platform Handler
    // ------------------------------------------------------------
    async function VghLantern__Pwa__InstallController__Initialize() {
        if (VghLantern__Pwa__InstallController__InitDone) return;                                                 // <-- Idempotent guard
        VghLantern__Pwa__InstallController__InitDone = true;                                                      // <-- Mark as initialised

        var platformDetector = window.VghLantern__Pwa__PlatformDetector;                                          // <-- Resolve the detector
        if (!platformDetector || !platformDetector.getPlatformDescriptor) return;                                 // <-- No detector, bail safely

        var descriptor  = platformDetector.getPlatformDescriptor();                                               // <-- Build the descriptor snapshot
        VghLantern__Pwa__InstallController__ActiveDescriptor = descriptor;                                        // <-- Persist the descriptor

        var handlerInstance = VghLantern__Pwa__InstallController__ResolveHandler(descriptor.platformId);          // <-- Pick the handler
        VghLantern__Pwa__InstallController__ActiveHandler = handlerInstance;                                      // <-- Persist the handler reference

        if (handlerInstance && typeof handlerInstance.activate === 'function') {
            handlerInstance.activate(descriptor);                                                                 // <-- Wire the handler to the descriptor
        }

        VghLantern__Pwa__InstallController__StandaloneUnsub = platformDetector.subscribeStandaloneChanges         // <-- Watch live mode changes
            ? platformDetector.subscribeStandaloneChanges(VghLantern__Pwa__InstallController__OnStandaloneChange)
            : null;

        if (descriptor.platformId === platformDetector.PlatformIds.InstalledStandalone) {
            return;                                                                                                // <-- Already standalone, skip prompt scheduling
        }

        var isRelatedAppInstalled = await VghLantern__Pwa__InstallController__IsRelatedAppInstalled();            // <-- Check the related apps API
        if (isRelatedAppInstalled) {
            if (handlerInstance && typeof handlerInstance.setSuppressed === 'function') {
                handlerInstance.setSuppressed(true);                                                              // <-- Suppress when a related app is installed
            }
            return;
        }

        setTimeout(function () {
            VghLantern__Pwa__InstallController__AttemptShow(INSTALL_CONTROLLER_MAX_RETRY_ATTEMPTS);               // <-- Schedule the first show attempt
        }, INSTALL_CONTROLLER_FIRST_SHOW_DELAY_MS);
    }
    // ---------------------------------------------------------------


    // FUNCTION | Manually Request the Prompt
    // ------------------------------------------------------------
    function VghLantern__Pwa__InstallController__RequestShow() {
        if (VghLantern__Pwa__InstallController__ActiveHandler && typeof VghLantern__Pwa__InstallController__ActiveHandler.requestShow === 'function') {
            VghLantern__Pwa__InstallController__ActiveHandler.requestShow();                                      // <-- Delegate to the handler
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Dismiss Any Active Prompt
    // ------------------------------------------------------------
    function VghLantern__Pwa__InstallController__DismissNow() {
        if (window.VghLantern__Pwa__PromptUi && window.VghLantern__Pwa__PromptUi.hide) {
            window.VghLantern__Pwa__PromptUi.hide();                                                              // <-- Tear down the DOM
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get the Active Platform Descriptor (Diagnostic)
    // ------------------------------------------------------------
    function VghLantern__Pwa__InstallController__GetActiveDescriptor() {
        return VghLantern__Pwa__InstallController__ActiveDescriptor;                                              // <-- Expose for diagnostics
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bootstrap
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Bootstrap Initialization
    // ---------------------------------------------------------------
    function VghLantern__Pwa__InstallController__Bootstrap() {
        if (typeof window === 'undefined') return;                                                                // <-- Guard non-window contexts

        window.VghLantern__Pwa__InstallController = {                                                             // <-- Public API surface
            initialize          : VghLantern__Pwa__InstallController__Initialize,
            requestShow         : VghLantern__Pwa__InstallController__RequestShow,
            dismissNow          : VghLantern__Pwa__InstallController__DismissNow,
            getActiveDescriptor : VghLantern__Pwa__InstallController__GetActiveDescriptor
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                VghLantern__Pwa__InstallController__Initialize();                                                 // <-- Defer until the DOM is ready
            }, { once: true });
            return;
        }

        VghLantern__Pwa__InstallController__Initialize();                                                         // <-- DOM already ready
    }
    // ---------------------------------------------------------------


    VghLantern__Pwa__InstallController__Bootstrap();                                                              // <-- Kick off bootstrap

// endregion -------------------------------------------------------------------

})();
