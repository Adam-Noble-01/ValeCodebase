// =============================================================================
// WHITECARDOPEDIA - PWA APP HELPERS - APP SCOPE NAVIGATION LOGIC
// =============================================================================
//
// FILE       : Na__Feature__PwaAppHelpers__AppScopeNavigation__Logic__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Na__Feature__PwaAppHelpers__AppScopeNavigation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Centralize app-window navigation behavior for installed PWA mode
// CREATED    : 2026
//
// DESCRIPTION:
// - Detects whether the current page is running in standalone app mode
// - Navigates in the current app client instead of spawning browser windows
// - Exposes a global helper namespace for other feature modules
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | PWA App Scope Navigation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Detect Standalone App Window Mode
    // ---------------------------------------------------------------
    function Na__Feature__PwaAppHelpers__IsStandaloneAppMode() {
        const isIosStandaloneMode = window.navigator.standalone === true;       // <-- iOS standalone signal
        const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches; // <-- Chromium standalone signal
        const isDisplayModeMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;   // <-- Minimal UI signal

        return isIosStandaloneMode || isDisplayModeStandalone || isDisplayModeMinimalUi; // <-- True when running app-like window
    }
    // ---------------------------------------------------------------


    // FUNCTION | Navigate Current Client to URL
    // ------------------------------------------------------------
    function Na__Feature__PwaAppHelpers__NavigateCurrentClient(url) {
        if (!url || typeof url !== 'string') return false;                       // <-- Guard invalid URL input

        window.location.assign(url);                                             // <-- Keep navigation in same client
        return true;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Initialize Global PWA Navigation Helper API
    // ------------------------------------------------------------
    function Na__Feature__PwaAppHelpers__InitializeAppScopeNavigation() {
        window.Na__Feature__PwaAppHelpers__AppScopeNavigation = {
            isStandaloneAppMode : Na__Feature__PwaAppHelpers__IsStandaloneAppMode,
            navigateCurrentClient : Na__Feature__PwaAppHelpers__NavigateCurrentClient
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Bootstrap Navigation Helper Initialization
    // ---------------------------------------------------------------
    function Na__Feature__PwaAppHelpers__BootstrapAppScopeNavigation() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', Na__Feature__PwaAppHelpers__InitializeAppScopeNavigation); // <-- Delay until DOM is ready
            return;
        }

        Na__Feature__PwaAppHelpers__InitializeAppScopeNavigation();              // <-- Immediate init when DOM already loaded
    }
    // ---------------------------------------------------------------


    Na__Feature__PwaAppHelpers__BootstrapAppScopeNavigation();                   // <-- Start helper initialization on load

// endregion -------------------------------------------------------------------
