// =============================================================================
// VALEVISION3D - SHARE PROJECT LINK - URL GENERATOR
// =============================================================================
//
// FILE       : Na__Feature__ShareProjectLink__UrlGeneratorLogic__.js
// NAMESPACE  : Na__Feature__ShareProjectLink
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build absolute ValeVision3D share URLs from ?project= state
// CREATED    : Mar-2026
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import {
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__NormalizeProjectFolderId
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Share URL Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Direct Project URL (Legacy / Fallback)
    // ------------------------------------------------------------
    // - Used as a fallback when the App Link Capture URL builder is not
    //   available on the page (e.g. very old emails / bookmarks that point
    //   straight at this module's previous output shape).
    // ------------------------------------------------------------
    function Na__Feature__ShareProjectLink__BuildDirectProjectUrlFallback(rawProjectCode) {
        const base = new URL(window.location.href);
        base.search = '';
        base.hash = '';
        const params = new URLSearchParams();
        params.set('project', rawProjectCode);
        base.search = params.toString();
        return base.toString();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Share URL for Outgoing Email
    // ------------------------------------------------------------
    // - Prefers the Whitecardopedia App Link Capture handover URL so emailed
    //   links can open inside the installed PWA wherever the platform allows.
    // - Falls back to the legacy direct-project URL when the handover helper
    //   is not loaded (e.g. running outside the wired-up app shell).
    // ------------------------------------------------------------
    function Na__Feature__ShareProjectLink__BuildProjectUrl(rawProjectCode) {
        const appLinkCaptureBuilder = (typeof window !== 'undefined')
            ? window.Whitecardopedia__AppLinkCapture__UrlBuilder
            : null;                                                                                     // <-- Resolve URL builder helper

        if (appLinkCaptureBuilder && typeof appLinkCaptureBuilder.buildHandoverUrl === 'function') {
            const handoverUrl = appLinkCaptureBuilder.buildHandoverUrl(rawProjectCode);                  // <-- Build handover URL
            if (handoverUrl) return handoverUrl;                                                         // <-- Prefer handover URL when valid
        }

        return Na__Feature__ShareProjectLink__BuildDirectProjectUrlFallback(rawProjectCode);             // <-- Legacy fallback path
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Share Context from Current Page (or Missing State)
    // ------------------------------------------------------------
    function Na__Feature__ShareProjectLink__GetShareContext() {
        const rawProjectCode = Na__AppUtils__GetProjectCodeFromUrl();
        if (!rawProjectCode || !String(rawProjectCode).trim()) {
            return {
                ok           : false,
                reason       : 'no_project',
                rawProjectCode : null,
                displayProjectId : null,
                projectUrl   : null
            };
        }
        const trimmed = String(rawProjectCode).trim();
        const displayProjectId = Na__AppUtils__NormalizeProjectFolderId(trimmed) || trimmed;
        const projectUrl = Na__Feature__ShareProjectLink__BuildProjectUrl(trimmed);
        return {
            ok               : true,
            reason           : null,
            rawProjectCode   : trimmed,
            displayProjectId,
            projectUrl
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Feature__ShareProjectLink__BuildProjectUrl,
        Na__Feature__ShareProjectLink__GetShareContext
    };

// endregion -------------------------------------------------------------------
