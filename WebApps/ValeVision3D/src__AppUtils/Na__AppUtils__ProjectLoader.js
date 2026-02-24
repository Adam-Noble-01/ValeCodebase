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
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 24-Feb-2026 - Version 1.0.0
// - Extracted from index.html inline script block (lines 617-721).
// - No logic changes; pure lift-and-shift into standalone module.
//
// =============================================================================


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

    // HELPER FUNCTION | Fetch Whitecardopedia project.json
    // ------------------------------------------------------------
    async function Na__AppUtils__FetchProjectJson(projectCode) {
        let projectJsonUrl;

        if (Na__AppUtils__IsRunningOnLocalhost()) {
            projectJsonUrl = `${window.location.origin}/api/projects/${projectCode}`;  // <-- Flask API endpoint
        } else {
            const projectFolderId = Na__AppUtils__NormalizeProjectFolderId(projectCode);
            projectJsonUrl = `${Na__AppUtils__WebProjectsBaseUrl}/${projectFolderId}/project.json`;  // <-- GH Pages path
        }

        const response = await fetch(projectJsonUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch project.json: ${response.status} ${response.statusText}`);
        }

        return response.json();
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
