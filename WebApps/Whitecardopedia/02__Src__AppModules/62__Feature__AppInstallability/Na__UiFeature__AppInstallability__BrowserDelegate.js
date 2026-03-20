// =============================================================================
// WHITECARDOPEDIA - BROWSER APP INSTALLABILITY DELEGATE
// =============================================================================
//
// FILE       : Na__UiFeature__AppInstallability__BrowserDelegate.js
// NAMESPACE  : Whitecardopedia
// MODULE     : AppInstallabilityBrowserDelegate
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Bridge browser install events for Edge and Chrome app install UX
// CREATED    : 2026
//
// DESCRIPTION:
// - Captures browser install prompt event (`beforeinstallprompt`)
// - Exposes global helper functions for install availability and prompt trigger
// - Detects installed/standalone mode for UI state handling
// - Keeps implementation lightweight with zero dependency on React component tree
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | App Installability Browser Delegate
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Deferred Prompt and Install State
    // ------------------------------------------------------------
    let Na__AppInstallability__DeferredPromptEvent = null;                      // <-- Cached browser prompt event
    let Na__AppInstallability__InstalledFromPrompt = false;                     // <-- Tracks if install flow succeeded
    // ------------------------------------------------------------


    // HELPER FUNCTION | Detect Standalone Installed Mode
    // ---------------------------------------------------------------
    function Na__AppInstallability__IsStandaloneMode() {
        const isIosStandaloneMode = window.navigator.standalone === true;       // <-- iOS standalone signal
        const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches; // <-- Chromium standalone signal
        const isDisplayModeMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;   // <-- Alternate standalone-like mode

        return isIosStandaloneMode || isDisplayModeStandalone || isDisplayModeMinimalUi; // <-- True when app is installed/running app-like
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Check Install Prompt Availability
    // ---------------------------------------------------------------
    function Na__AppInstallability__IsPromptAvailable() {
        return !!Na__AppInstallability__DeferredPromptEvent;                     // <-- Prompt becomes available after browser heuristics pass
    }
    // ---------------------------------------------------------------


    // FUNCTION | Trigger Browser Install Prompt
    // ------------------------------------------------------------
    async function Na__AppInstallability__TriggerInstallPrompt() {
        if (!Na__AppInstallability__DeferredPromptEvent) {
            return { success: false, reason: 'prompt-not-available' };           // <-- No prompt available yet
        }

        Na__AppInstallability__DeferredPromptEvent.prompt();                     // <-- Ask browser to show native install prompt
        const choiceResult = await Na__AppInstallability__DeferredPromptEvent.userChoice; // <-- Wait for user action

        Na__AppInstallability__InstalledFromPrompt = choiceResult.outcome === 'accepted'; // <-- Track accepted state
        Na__AppInstallability__DeferredPromptEvent = null;                       // <-- Prompt event can only be used once

        return {
            success : Na__AppInstallability__InstalledFromPrompt,                // <-- True if user accepted
            outcome : choiceResult.outcome || 'dismissed'                        // <-- Browser outcome payload
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Bind Browser Install Events
    // ---------------------------------------------------------------
    function Na__AppInstallability__BindInstallEvents() {
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();                                               // <-- Use delegated custom trigger flow
            Na__AppInstallability__DeferredPromptEvent = event;                  // <-- Cache prompt for later call
        });

        window.addEventListener('appinstalled', () => {
            Na__AppInstallability__InstalledFromPrompt = true;                   // <-- Browser confirms installation
            Na__AppInstallability__DeferredPromptEvent = null;                   // <-- Prompt no longer needed
        });
    }
    // ---------------------------------------------------------------


    // FUNCTION | Initialize Global Browser Delegate API
    // ------------------------------------------------------------
    function Na__AppInstallability__InitializeBrowserDelegate() {
        Na__AppInstallability__BindInstallEvents();                              // <-- Activate browser event listeners

        window.Na__AppInstallability__BrowserDelegate = {                        // <-- Expose API for future UI integration
            isStandaloneMode      : Na__AppInstallability__IsStandaloneMode,
            isPromptAvailable     : Na__AppInstallability__IsPromptAvailable,
            triggerInstallPrompt  : Na__AppInstallability__TriggerInstallPrompt
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Bootstrap Delegate Initialization
    // ---------------------------------------------------------------
    function Na__AppInstallability__BootstrapInitialization() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', Na__AppInstallability__InitializeBrowserDelegate); // <-- Delay until DOM is ready
            return;
        }

        Na__AppInstallability__InitializeBrowserDelegate();                      // <-- Immediate init when DOM already loaded
    }
    // ---------------------------------------------------------------


    Na__AppInstallability__BootstrapInitialization();                            // <-- Start delegate as soon as script loads

// endregion -------------------------------------------------------------------
