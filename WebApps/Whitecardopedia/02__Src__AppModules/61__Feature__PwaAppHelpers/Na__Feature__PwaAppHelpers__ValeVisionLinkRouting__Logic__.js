// =============================================================================
// WHITECARDOPEDIA - PWA APP HELPERS - VALEVISION LINK ROUTING LOGIC
// =============================================================================
//
// FILE       : Na__Feature__PwaAppHelpers__ValeVisionLinkRouting__Logic__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Na__Feature__PwaAppHelpers__ValeVisionLinkRouting
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Route ValeVision links through in-app navigation policy
// CREATED    : 2026
//
// DESCRIPTION:
// - Builds ValeVision project URLs from Whitecardopedia project context
// - Routes clicks via same-client navigation to avoid fresh browser windows
// - Exposes global helper API for React components and UI overlays
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | ValeVision Link Routing Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Detect Localhost Runtime
    // ---------------------------------------------------------------
    function Na__Feature__PwaAppHelpers__IsRunningOnLocalhost() {
        const hostname = window.location.hostname;                               // <-- Current hostname
        const port = window.location.port;                                       // <-- Current port

        return hostname === 'localhost' || hostname === '127.0.0.1' || port === '8000'; // <-- Localhost indicators
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build ValeVision Project URL
    // ---------------------------------------------------------------
    function Na__Feature__PwaAppHelpers__BuildValeVisionProjectUrl(projectCode) {
        const safeProjectCode = encodeURIComponent(String(projectCode || '').trim()); // <-- URL-safe project code value
        if (!safeProjectCode) return null;

        if (Na__Feature__PwaAppHelpers__IsRunningOnLocalhost()) {
            return `/ValeVision3D/index.html?project=${safeProjectCode}`;        // <-- Localhost route
        }

        return `../ValeVision3D/index.html?project=${safeProjectCode}`;          // <-- Static relative route
    }
    // ---------------------------------------------------------------


    // FUNCTION | Navigate to ValeVision Project in Current App Client
    // ------------------------------------------------------------
    function Na__Feature__PwaAppHelpers__NavigateToValeVisionProject(projectData) {
        if (!projectData || !projectData.folderId) return false;                 // <-- Guard missing project context

        const targetUrl = Na__Feature__PwaAppHelpers__BuildValeVisionProjectUrl(projectData.folderId); // <-- Build ValeVision URL
        if (!targetUrl) return false;

        const appScopeNavigationHelper = window.Na__Feature__PwaAppHelpers__AppScopeNavigation; // <-- Read app-scope helper
        if (appScopeNavigationHelper && typeof appScopeNavigationHelper.navigateCurrentClient === 'function') {
            return appScopeNavigationHelper.navigateCurrentClient(targetUrl);     // <-- Reuse current app window
        }

        window.location.assign(targetUrl);                                        // <-- Fallback same-client navigation
        return true;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Initialize Global ValeVision Link Routing API
    // ------------------------------------------------------------
    function Na__Feature__PwaAppHelpers__InitializeValeVisionLinkRouting() {
        window.Na__Feature__PwaAppHelpers__ValeVisionLinkRouting = {
            isRunningOnLocalhost : Na__Feature__PwaAppHelpers__IsRunningOnLocalhost,
            buildValeVisionProjectUrl : Na__Feature__PwaAppHelpers__BuildValeVisionProjectUrl,
            navigateToValeVisionProject : Na__Feature__PwaAppHelpers__NavigateToValeVisionProject
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Bootstrap ValeVision Link Routing Initialization
    // ---------------------------------------------------------------
    function Na__Feature__PwaAppHelpers__BootstrapValeVisionLinkRouting() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', Na__Feature__PwaAppHelpers__InitializeValeVisionLinkRouting); // <-- Delay until DOM ready
            return;
        }

        Na__Feature__PwaAppHelpers__InitializeValeVisionLinkRouting();           // <-- Immediate init when DOM already loaded
    }
    // ---------------------------------------------------------------


    Na__Feature__PwaAppHelpers__BootstrapValeVisionLinkRouting();                // <-- Start helper initialization on load

// endregion -------------------------------------------------------------------
