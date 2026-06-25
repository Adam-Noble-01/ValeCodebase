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
// 25-Jun-2026 - Version 1.2.0
// - R2-first loading: FetchProjectJson now tries the CDN R2 URL first then
//   falls back to GH Pages; emits a "Failed to fetch live assets" toast on
//   fallback. Base URLs driven from Na__AppConfig__Main.json SSOT.
//
// 25-Jun-2026 - Version 1.3.0
// - Master index integration: Na__AppUtils__InitMasterIndex (R2-first, GH
//   fallback) resolves each project's real year/folderId from its numeric code
//   (replacing the hardcoded 2026 default) and its asset home (r2|gh) so
//   FetchProjectJson and ResolveAssetUrl fetch the correct source directly,
//   eliminating the blind-R2 404 flood. Index URLs from AppConfig SSOT.
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

    // MODULE CONSTANTS | Base URLs (sourced from Na__AppConfig__Main.json SSOT at runtime)
    // ------------------------------------------------------------
    // These fallback constants are only used when appConfig is unavailable.
    // The live values come from ProjectData__AssetUrls in Na__AppConfig__Main.json.
    // ------------------------------------------------------------
    const Na__AppUtils__R2BaseUrl_Fallback  = 'https://cdn.noble-architecture.com/VaApps/Projects';     // <-- R2 CDN fallback default
    const Na__AppUtils__GhBaseUrl_Fallback  = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/Projects'; // <-- GH Pages fallback default
    const Na__AppUtils__DefaultProjectYear  = '2026';                                                   // <-- Legacy year fallback
    // ------------------------------------------------------------

    // MODULE VARIABLES | Runtime Base URLs (populated by Na__AppUtils__InitFromConfig)
    // ------------------------------------------------------------
    let Na__AppUtils__R2BaseUrl           = Na__AppUtils__R2BaseUrl_Fallback;    // <-- Set from appConfig at init time
    let Na__AppUtils__GhBaseUrl           = Na__AppUtils__GhBaseUrl_Fallback;    // <-- Set from appConfig at init time
    let Na__AppUtils__FallbackToastMsg    = 'Failed to fetch live assets — using static assets instead.'; // <-- Set from appConfig
    // ------------------------------------------------------------

    // MODULE VARIABLES | Master Index (authoritative per-project asset locations)
    // ------------------------------------------------------------
    // The index (built by the R2 automation lib) lets ValeVision3D resolve a
    // project's real year/folderId from its numeric code and learn whether its
    // assets live on R2 or GH Pages — replacing the hardcoded 2026 default and
    // killing the blind-R2 404 flood. Sourced from Na__AppConfig__Main.json SSOT.
    // ------------------------------------------------------------
    let Na__AppUtils__IndexUrl            = 'https://cdn.noble-architecture.com/VaApps/Index/Na__MasterIndex__ProjectLocations__.json'; // <-- R2 primary index
    let Na__AppUtils__IndexFallbackUrl    = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json'; // <-- GH fallback copy
    let Na__AppUtils__IndexLoadPromise    = null;                                // <-- Memoised index load promise
    let Na__AppUtils__IndexByFolderId     = null;                                // <-- Map<folderId, entry>
    let Na__AppUtils__IndexByCode         = null;                                // <-- Map<projectCode, entry> (newest year wins)
    let Na__AppUtils__IndexByFolderName   = null;                                // <-- Map<folderName, entry>
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Initialise Base URLs From AppConfig (call once after config loads)
    // ------------------------------------------------------------
    function Na__AppUtils__InitFromConfig(appConfig) {
        const urlConfig = appConfig && appConfig['ProjectData__AssetUrls'];
        if (!urlConfig) return;

        if (urlConfig['ProjectData__AssetUrls__R2BaseUrl'])
            Na__AppUtils__R2BaseUrl = urlConfig['ProjectData__AssetUrls__R2BaseUrl'];   // <-- Override R2 base from config
        if (urlConfig['ProjectData__AssetUrls__GhBaseUrl'])
            Na__AppUtils__GhBaseUrl = urlConfig['ProjectData__AssetUrls__GhBaseUrl'];   // <-- Override GH base from config
        if (urlConfig['ProjectData__AssetUrls__FallbackToastMsg'])
            Na__AppUtils__FallbackToastMsg = urlConfig['ProjectData__AssetUrls__FallbackToastMsg']; // <-- Override toast message
        if (urlConfig['ProjectData__AssetUrls__IndexUrl'])
            Na__AppUtils__IndexUrl = urlConfig['ProjectData__AssetUrls__IndexUrl'];               // <-- Override R2 index URL
        if (urlConfig['ProjectData__AssetUrls__IndexFallbackUrl'])
            Na__AppUtils__IndexFallbackUrl = urlConfig['ProjectData__AssetUrls__IndexFallbackUrl']; // <-- Override GH index fallback
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise the Master Project Index (R2-first, GH Fallback, Memoised)
    // ------------------------------------------------------------
    // Fetches Na__MasterIndex__ProjectLocations__.json (R2 first, GH copy
    // fallback) and builds lookup maps by folderId, numeric projectCode and
    // folder name. Call once after Na__AppUtils__InitFromConfig and before the
    // first Na__AppUtils__FetchProjectJson. Never throws — resolves with empty
    // maps on failure so the loader transparently uses the legacy behaviour.
    // ------------------------------------------------------------
    function Na__AppUtils__InitMasterIndex() {
        if (Na__AppUtils__IndexLoadPromise) return Na__AppUtils__IndexLoadPromise; // <-- Single fetch per session

        Na__AppUtils__IndexLoadPromise = (async () => {
            const tryFetch = async (url) => {
                try {
                    const resp = await fetch(url);                              // <-- Attempt one source
                    if (resp.ok) return await resp.json();
                } catch (_) {}
                return null;
            };

            let index = await tryFetch(Na__AppUtils__IndexUrl);                 // <-- R2 CDN primary
            if (!index) index = await tryFetch(Na__AppUtils__IndexFallbackUrl); // <-- GH Pages fallback copy

            const byFolderId   = new Map();
            const byCode       = new Map();
            const byFolderName = new Map();

            if (index && Array.isArray(index.projects)) {
                for (const entry of index.projects) {
                    if (!entry || !entry.folderId) continue;
                    byFolderId.set(entry.folderId, entry);                      // <-- Exact folderId key

                    const folderName = entry.folderId.split('/')[1] || entry.folderId;
                    byFolderName.set(folderName, entry);                        // <-- Folder name without year

                    if (entry.projectCode) {
                        const existing = byCode.get(entry.projectCode);         // <-- Resolve numeric-code collisions
                        if (!existing || (parseInt(entry.year, 10) || 0) >= (parseInt(existing.year, 10) || 0)) {
                            byCode.set(entry.projectCode, entry);               // <-- Prefer the newest year on collision
                        }
                    }
                }
            }

            Na__AppUtils__IndexByFolderId   = byFolderId;
            Na__AppUtils__IndexByCode       = byCode;
            Na__AppUtils__IndexByFolderName = byFolderName;
            return byFolderId;
        })();

        return Na__AppUtils__IndexLoadPromise;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Look Up an Index Entry by Code / Folder Name / FolderId
    // ------------------------------------------------------------
    function Na__AppUtils__LookupIndexEntry(token) {
        if (!token) return null;
        const trimmed = String(token).replace(/^\/+|\/+$/g, '');

        if (Na__AppUtils__IndexByFolderId && Na__AppUtils__IndexByFolderId.has(trimmed))
            return Na__AppUtils__IndexByFolderId.get(trimmed);                  // <-- Direct folderId hit

        if (Na__AppUtils__IndexByCode && Na__AppUtils__IndexByCode.has(trimmed))
            return Na__AppUtils__IndexByCode.get(trimmed);                      // <-- Numeric project code hit

        if (Na__AppUtils__IndexByFolderName && Na__AppUtils__IndexByFolderName.has(trimmed))
            return Na__AppUtils__IndexByFolderName.get(trimmed);               // <-- Folder name (no year) hit

        if (Na__AppUtils__IndexByFolderName) {
            for (const [folderName, entry] of Na__AppUtils__IndexByFolderName) {
                if (folderName.startsWith(`${trimmed}__`)) return entry;        // <-- '63592' -> '63592__Bressard-Kayode'
            }
        }
        return null;
    }
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


    // HELPER FUNCTION | Normalize Project Folder ID (index-aware year lookup)
    // ------------------------------------------------------------
    // Resolves a `?project=` value into a full `{year}/{folder}` folderId.
    // When the value already carries a year prefix it is used verbatim.
    // Otherwise the master index is consulted to find the real year/folderId
    // by numeric code or folder name (so 2025 projects no longer get a wrong
    // hardcoded 2026 prefix). Falls back to the legacy default only when the
    // index has no matching entry.
    // ------------------------------------------------------------
    function Na__AppUtils__NormalizeProjectFolderId(projectCode) {
        if (!projectCode) return null;

        const trimmed = projectCode.replace(/^\/+|\/+$/g, '');
        const hasYearPrefix = /^\d{4}\//.test(trimmed);

        if (hasYearPrefix) {
            return trimmed;                                                  // <-- Already a full folderId
        }

        const entry = Na__AppUtils__LookupIndexEntry(trimmed);              // <-- Index-driven year/folder resolution
        if (entry && entry.folderId) {
            return entry.folderId;                                          // <-- Real folderId (correct year)
        }

        return `${Na__AppUtils__DefaultProjectYear}/${trimmed}`;            // <-- Legacy fallback when index unavailable
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project JSON Fetching
// -----------------------------------------------------------------------------

    // FUNCTION | Fetch Whitecardopedia project.json (R2-first, GH fallback, Memoised)
    // ------------------------------------------------------------
    // resilienceConfig {object} - LoadResilience__Config block from Na__AppConfig__Main.json.
    //   Expected keys used here:
    //     LoadResilience__Config__FetchTimeoutMs  {number}
    //     LoadResilience__Config__RetryCount      {number}
    //     LoadResilience__Config__RetryBaseDelayMs{number}
    // If resilienceConfig is omitted sensible hardcoded defaults are used.
    // On production, tries R2 CDN first; falls back to GH Pages and emits a
    // fallback toast so the user knows they may be on stale assets.
    // ------------------------------------------------------------
    function Na__AppUtils__FetchProjectJson(projectCode, resilienceConfig) {
        const cacheKey = projectCode || '__no_project__';                   // <-- Stable key for memoization

        if (Na__AppUtils__FetchCache.has(cacheKey)) {
            return Na__AppUtils__FetchCache.get(cacheKey);                  // <-- Return existing in-flight or settled promise
        }

        const timeoutMs    = (resilienceConfig && resilienceConfig.LoadResilience__Config__FetchTimeoutMs)   || 15000; // <-- Per-attempt fetch timeout
        const retries      = (resilienceConfig && resilienceConfig.LoadResilience__Config__RetryCount)       || 2;     // <-- Number of retries
        const retryDelayMs = (resilienceConfig && resilienceConfig.LoadResilience__Config__RetryBaseDelayMs) || 1000;  // <-- Base retry delay

        const fetchOpts    = { timeoutMs, retries: 1, retryDelayMs };       // <-- Reduced retries on first attempt; full retries on GH fallback

        let fetchPromise;

        if (Na__AppUtils__IsRunningOnLocalhost()) {
            const localUrl = `${window.location.origin}/api/projects/${projectCode}`; // <-- Flask API endpoint
            fetchPromise = Na__ResilientLoad__FetchWithTimeout(localUrl, { timeoutMs, retries, retryDelayMs })
                .then(r => r.json())
                .catch(err => {
                    Na__AppUtils__FetchCache.delete(cacheKey);
                    throw err;
                });
        } else {
            const projectFolderId = Na__AppUtils__NormalizeProjectFolderId(projectCode);
            const r2Url           = `${Na__AppUtils__R2BaseUrl}/${projectFolderId}/project.json`;   // <-- R2 CDN (primary)
            const ghUrl           = `${Na__AppUtils__GhBaseUrl}/${projectFolderId}/project.json`;   // <-- GH Pages (fallback)

            const indexEntry      = Na__AppUtils__LookupIndexEntry(projectFolderId)
                                    || Na__AppUtils__LookupIndexEntry(projectCode);                 // <-- Resolve asset home from index
            const ghOnly          = indexEntry && indexEntry.assetHome === 'gh';                    // <-- Index says project.json is GH-only

            if (ghOnly) {
                // INDEX SAYS GH-ONLY | Skip the doomed R2 request entirely (no 404)
                fetchPromise = Na__ResilientLoad__FetchWithTimeout(ghUrl, { timeoutMs, retries, retryDelayMs })
                    .then(r => r.json())
                    .catch(err => {
                        Na__AppUtils__FetchCache.delete(cacheKey);          // <-- GH failed; evict cache
                        throw err;
                    });
            } else {
                // INDEX SAYS R2 (or unknown) | Try R2 first, then GH Pages
                fetchPromise = Na__ResilientLoad__FetchWithTimeout(r2Url, fetchOpts)
                    .then(r => r.json())
                    .catch(() => {
                        // R2 failed — fall back to GH Pages and notify the user
                        Na__AppUtils__EmitFallbackToast();                  // <-- Notify user of R2 failure
                        return Na__ResilientLoad__FetchWithTimeout(ghUrl, { timeoutMs, retries, retryDelayMs })
                            .then(r => r.json());
                    })
                    .catch(err => {
                        Na__AppUtils__FetchCache.delete(cacheKey);          // <-- Both sources failed; evict cache
                        throw err;
                    });
            }
        }

        Na__AppUtils__FetchCache.set(cacheKey, fetchPromise);               // <-- Cache in-flight promise immediately

        return fetchPromise;                                                 // <-- Return promise (caller awaits)
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Emit General Fallback Toast Notification
    // ------------------------------------------------------------
    function Na__AppUtils__EmitFallbackToast() {
        try {
            window.dispatchEvent(new CustomEvent('na-asset-fallback-toast', {
                detail: { message: Na__AppUtils__FallbackToastMsg }
            }));
        } catch (_) {
            // Non-critical; silently ignore if CustomEvent is unavailable
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Asset URL (R2-first, GH fallback)
    // ------------------------------------------------------------
    // Used by callers that need to resolve image/thumbnail URLs for a known
    // project folder ID (e.g. Presentation Mode scene images).
    // Returns the R2 URL and the GH fallback URL as a pair.
    // ------------------------------------------------------------
    function Na__AppUtils__ResolveAssetUrl(projectFolderId, filename) {
        const r2Url = `${Na__AppUtils__R2BaseUrl}/${projectFolderId}/${filename}`;   // <-- R2 CDN
        const ghUrl = `${Na__AppUtils__GhBaseUrl}/${projectFolderId}/${filename}`;   // <-- GH Pages

        const entry      = Na__AppUtils__LookupIndexEntry(projectFolderId);          // <-- Index entry (if any)
        const imagesOnGh = entry && entry.hasImages_R2 === false;                    // <-- Index says images are GH-only

        if (imagesOnGh) {
            return { primary: ghUrl, fallback: ghUrl };                              // <-- Go straight to GH (no 404)
        }
        return { primary: r2Url, fallback: ghUrl };                                  // <-- R2 primary, GH fallback
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
        Na__AppUtils__ExtractModelUrls,
        Na__AppUtils__InitFromConfig,
        Na__AppUtils__InitMasterIndex,
        Na__AppUtils__ResolveAssetUrl,
        Na__AppUtils__EmitFallbackToast,
        Na__AppUtils__R2BaseUrl_Fallback,
        Na__AppUtils__GhBaseUrl_Fallback
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
