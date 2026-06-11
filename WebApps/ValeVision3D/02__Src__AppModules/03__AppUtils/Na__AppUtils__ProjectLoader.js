// =============================================================================
// VALEVISION3D - APPLICATION UTILITIES - PROJECT LOADER
// =============================================================================
//
// FILE       : Na__AppUtils__ProjectLoader.js
// NAMESPACE  : Na__AppUtils
// MODULE     : ProjectLoader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : URL utilities and project.json fetching for Whitecardopedia
// CREATED    : 24-Feb-2026
//
// DESCRIPTION:
// - Detects localhost vs production environment for API routing.
// - Extracts and normalises the ?project= query parameter from the URL.
// - Fetches project.json from either the local Flask API or GH Pages CDN.
// - Normalises all four historical project.json model URL formats into a
//   flat array of GLB URLs for the model loader.
// - Promise-memoises the fetch result per project code so a second call
//   (e.g. from the fog system) reuses the first settled promise rather than
//   issuing a duplicate network request.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 24-Feb-2026 - Version 1.0.0
// - Extracted from index.html inline script block (lines 617-721).
// - No logic changes; pure lift-and-shift into standalone module.
//
// 11-Jun-2026 - Version 1.1.0
// - Added resilient fetch via Na__ResilientLoad__FetchWithTimeout (timeout +
//   retry) to prevent stalled iOS connections hanging the load pipeline.
// - Added promise-memoization keyed by project code (L2 fix: single fetch
//   per boot regardless of how many callers invoke FetchProjectJson).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Resilient Fetch Helper
    // @delegate: ./Na__AppUtils__ResilientLoad__.js
    // ------------------------------------------------------------
    import { Na__ResilientLoad__FetchWithTimeout } from './Na__AppUtils__ResilientLoad__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants - Web Project Data Paths
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | GH Pages Base URL and Year Fallback
    // ------------------------------------------------------------
    const Na__AppUtils__WebProjectsBaseUrl = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/Projects'; // <-- GH Pages base
    const Na__AppUtils__DefaultProjectYear = '2026';                                                                          // <-- Legacy fallback
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fetch Memoization Cache
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Promise Cache Keyed by Project Code
    // ------------------------------------------------------------
    const Na__AppUtils__FetchCache = new Map();                             // <-- Settled or in-flight promises keyed by project code
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Environment Detection
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Detect Localhost Environment
    // ------------------------------------------------------------
    function Na__AppUtils__IsRunningOnLocalhost() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        return hostname === 'localhost' || hostname === '127.0.0.1' || port === '8000';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | URL Parsing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Extract Project Code from URL
    // ------------------------------------------------------------
    function Na__AppUtils__GetProjectCodeFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('project');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalize Project Folder ID
    // ------------------------------------------------------------
    function Na__AppUtils__NormalizeProjectFolderId(projectCode) {
        if (!projectCode) return null;

        const trimmed = projectCode.replace(/^\/+|\/+$/g, '');
        const hasYearPrefix = /^\d{4}\//.test(trimmed);

        if (hasYearPrefix) {
            return trimmed;
        }

        return `${Na__AppUtils__DefaultProjectYear}/${trimmed}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project JSON Fetching
// -----------------------------------------------------------------------------

    // FUNCTION | Fetch Whitecardopedia project.json (Resilient + Memoised)
    // ------------------------------------------------------------
    // resilienceConfig {object} - LoadResilience__Config block from Na__AppConfig__Main.json.
    //   Expected keys used here:
    //     LoadResilience__Config__FetchTimeoutMs  {number}
    //     LoadResilience__Config__RetryCount      {number}
    //     LoadResilience__Config__RetryBaseDelayMs{number}
    // If resilienceConfig is omitted sensible hardcoded defaults are used.
    // ------------------------------------------------------------
    function Na__AppUtils__FetchProjectJson(projectCode, resilienceConfig) {
        const cacheKey = projectCode || '__no_project__';                   // <-- Stable key for memoization

        if (Na__AppUtils__FetchCache.has(cacheKey)) {
            return Na__AppUtils__FetchCache.get(cacheKey);                  // <-- Return existing in-flight or settled promise
        }

        const timeoutMs    = (resilienceConfig && resilienceConfig.LoadResilience__Config__FetchTimeoutMs)   || 15000; // <-- Per-attempt fetch timeout
        const retries      = (resilienceConfig && resilienceConfig.LoadResilience__Config__RetryCount)       || 2;     // <-- Number of retries
        const retryDelayMs = (resilienceConfig && resilienceConfig.LoadResilience__Config__RetryBaseDelayMs) || 1000;  // <-- Base retry delay

        let projectJsonUrl;
        if (Na__AppUtils__IsRunningOnLocalhost()) {
            projectJsonUrl = `${window.location.origin}/api/projects/${projectCode}`;  // <-- Flask API endpoint
        } else {
            const projectFolderId = Na__AppUtils__NormalizeProjectFolderId(projectCode);
            projectJsonUrl = `${Na__AppUtils__WebProjectsBaseUrl}/${projectFolderId}/project.json`;  // <-- GH Pages path
        }

        const fetchPromise = Na__ResilientLoad__FetchWithTimeout(projectJsonUrl, { timeoutMs, retries, retryDelayMs }) // <-- Resilient fetch
            .then((response) => response.json())
            .catch((err) => {
                Na__AppUtils__FetchCache.delete(cacheKey);                  // <-- Evict cache on failure so caller can retry
                throw err;
            });

        Na__AppUtils__FetchCache.set(cacheKey, fetchPromise);               // <-- Cache in-flight promise immediately

        return fetchPromise;                                                 // <-- Return promise (caller awaits)
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Model URL Extraction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Extract Model URLs from project.json (Multi-Format)
    // ------------------------------------------------------------
    // Supports four project.json formats and normalizes to a flat URL array:
    //   v4: valeVision_ModelUrls (array)            -> pass through directly
    //   v3: valeVision_ModelUrl_BaseMesh + _Linework -> wrap into 2-element array
    //   v2: valeVision_ModelUrl (array of versions)  -> take last entry only
    //   v1: valeVision_ModelUrl (string)             -> wrap into 1-element array
    // ------------------------------------------------------------
    function Na__AppUtils__ExtractModelUrls(projectData) {
        if (!projectData) return [];                                     // <-- Guard against null

        // V4 FORMAT | New multi-model array (preferred)
        if (Array.isArray(projectData.valeVision_ModelUrls) && projectData.valeVision_ModelUrls.length > 0) {
            return projectData.valeVision_ModelUrls;                     // <-- Pass through directly
        }

        // V3 FORMAT | Layered BaseMesh + Linework pair
        const baseMeshUrl  = projectData.valeVision_ModelUrl_BaseMesh || null;
        const lineworkUrl  = projectData.valeVision_ModelUrl_Linework || null;
        if (baseMeshUrl || lineworkUrl) {
            const urls = [];
            if (baseMeshUrl) urls.push(baseMeshUrl);                     // <-- Add base mesh URL
            if (lineworkUrl) urls.push(lineworkUrl);                     // <-- Add linework URL
            return urls;
        }

        // V2 FORMAT | Array of versioned URLs (take latest)
        if (Array.isArray(projectData.valeVision_ModelUrl) && projectData.valeVision_ModelUrl.length > 0) {
            const latestUrl = projectData.valeVision_ModelUrl[projectData.valeVision_ModelUrl.length - 1];
            return [latestUrl];                                          // <-- Use last (latest) version
        }

        // V1 FORMAT | Single string URL (legacy)
        if (typeof projectData.valeVision_ModelUrl === 'string' && projectData.valeVision_ModelUrl) {
            return [projectData.valeVision_ModelUrl];                    // <-- Wrap single URL in array
        }

        return [];                                                       // <-- No model URLs found
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Project Loader API
    // ------------------------------------------------------------
    export {
        Na__AppUtils__IsRunningOnLocalhost,
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__NormalizeProjectFolderId,
        Na__AppUtils__FetchProjectJson,
        Na__AppUtils__ExtractModelUrls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
