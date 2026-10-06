// =============================================================================
// VALEVISION3D - APPLICATION UTILITIES - PROJECT LOADER
// =============================================================================
//
// FILE       : Na__AppUtils__ProjectLoader.js
// NAMESPACE  : Na__AppUtils
// MODULE     : ProjectLoader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Which project this page shows, where it lives in the Projects Master
//              Library, and its record, fetched from ValeVision 3D's own server API
// CREATED    : 24-Feb-2026
//
// DESCRIPTION:
// - ONE SERVER, ONE ORIGIN. ValeVision 3D is served from
//   app.valegardenhouses.com/valevision/ with its Flask API under
//   /valevision/api/ (Server__Api/Api__ValeVision3D). The same API runs on
//   Adam's PC (Server__DeveloperTools/ValeDev__LocalServer__.py), so there is
//   no localhost branch: every read and every save goes to the API.
// - THE PROJECT comes from ?project= in the URL. The library folder name
//   ("64135__Washington") is its id; a bare job number ("64135"), a legacy
//   "2026/<folder>" and the TrueVision pair ?project-folder=&year= still work.
//   The server answers where that project lives (Na__AppUtils__InitProjectLocation)
//   - its id, year and the public URLs of its content buckets - and the folder
//   and year helpers answer from that, never from a guess.
// - MODELS are bare file names in the record (valeVision_ModelUrls) and are
//   served by nginx from <project>/ValeVision3D/Content__3dModel__GlbFiles/. A
//   full URL from an older record is reduced to its file name the same way.
// - Promise-memoises the record per project token, so the fog, grid and
//   elevation systems share the loading sequence's one fetch.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js - two exported
//                   names (Na__AppUtils__GetProjectFolderFromUrl, Na__AppUtils__GetYearFromUrl)
// - Parity        : diverged (DIV-4: the same file and those two names; ValeVision's project identity and
//                   transport, which since 06-Oct-2026 is its own server API rather than R2 / GitHub Pages)
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - Version 2.0.0 (the move to app.valegardenhouses.com)
// - Everything comes from the ValeVision 3D API: the record (GET api/projects/<id>),
//   the project's place in the Master Library (GET api/projects/<id>/location) and
//   the model files beside it. Removed: the R2 / GitHub Pages pair, the master index,
//   the build-version manifest and its ?v= token (nginx sends no-cache with
//   ETags, so a pushed model is fresh on the next load), the fallback toast,
//   and Na__AppUtils__IsRunningOnLocalhost - there is no other place to read from.
// - New: Na__AppUtils__ApiUrl (the API's address from wherever a module runs),
//   Na__AppUtils__InitProjectLocation / GetProjectLocation (replace InitMasterIndex).
//
// 01-Oct-2026 - Version 1.4.1 (TrueVision identity helpers, v2.71.1)
// 25-Jun-2026 - Versions 1.2.0 to 1.4.0 (R2-first loading, master index, build manifest)
// 11-Jun-2026 - Version 1.1.0 (resilient fetch, memoisation)
// 24-Feb-2026 - Version 1.0.0 (extracted from index.html)
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Resilient Fetch Helper
    // ------------------------------------------------------------
    // @delegate: ./Na__AppUtils__ResilientLoad__.js
    // ------------------------------------------------------------
    import { Na__ResilientLoad__FetchWithTimeout } from './Na__AppUtils__ResilientLoad__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The API, Relative to the App Folder
    // ------------------------------------------------------------
    // This file is <app>/02__Src__AppModules/03__AppUtils/, so two folders up is
    // the app folder whatever page imported it: /valevision/api/ on the route.
    // ------------------------------------------------------------
    const Na__AppUtils__ApiBase           = new URL('../../api/', import.meta.url).href;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Content Buckets Inside a Project Folder
    // ------------------------------------------------------------
    const Na__AppUtils__SceneThumbsPrefix = 'PresentationMode/Thumbnails/';      // <-- How older records name a scene thumbnail
    const Na__AppUtils__UserDataPrefix    = 'LayoutEditor/';                      // <-- Files the Layout Editor made: user data, read through the API
    const Na__AppUtils__GalleryImageRx    = /^IMG\d{2,3}.*\.(png|jpe?g)$/i;       // <-- Full gallery images (ValeVision Gallery's bucket)
    const Na__AppUtils__WebpRx            = /\.webp$/i;
    // ------------------------------------------------------------


    // MODULE VARIABLES | This Page's Project Location and the Record Cache
    // ------------------------------------------------------------
    let   Na__AppUtils__Location          = null;                                // <-- { id, year, folder, webBase, modelsUrl, scenesUrl, galleryUrl } once settled
    let   Na__AppUtils__LocationPromise   = null;                                // <-- Memoised, never rejects
    const Na__AppUtils__FetchCache        = new Map();                           // <-- Record promises keyed by project token
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The API's Address
// -----------------------------------------------------------------------------

    // FUNCTION | Absolute URL of an API Route ("projects/64135__Washington" -> https://.../valevision/api/projects/...)
    // ------------------------------------------------------------
    function Na__AppUtils__ApiUrl(path) {
        return Na__AppUtils__ApiBase + String(path || '').replace(/^\/+/, '');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Encode Each Segment of a Path (a legacy folder may hold a space)
    // ------------------------------------------------------------
    function Na__AppUtils__EncodePath(path) {
        return String(path).split('/').map((segment) => encodeURIComponent(segment)).join('/');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | URL Parsing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The ?project= Token Exactly as the URL Gives It
    // ------------------------------------------------------------
    function Na__AppUtils__GetProjectCodeFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('project') || urlParams.get('project-folder');   // <-- TrueVision's explicit folder is a project id too
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Project's Library Folder ("64135__Washington"), or Null Until Known
    // ------------------------------------------------------------
    function Na__AppUtils__GetProjectFolderFromUrl() {
        return Na__AppUtils__Location ? Na__AppUtils__Location.folder : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Project's Four-Digit Year ("2026"), or Null Until Known
    // ------------------------------------------------------------
    function Na__AppUtils__GetYearFromUrl() {
        return Na__AppUtils__Location ? Na__AppUtils__Location.year : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | "<year>/<folder>" for a Token, Once the Server Has Placed It
    // ------------------------------------------------------------
    // Kept for the modules that still key things by a folderId. The API takes
    // the bare id, the folderId or a job number alike, so an unplaced token is
    // returned as it is rather than guessed.
    // ------------------------------------------------------------
    function Na__AppUtils__NormalizeProjectFolderId(projectCode) {
        if (!projectCode) return null;
        const loc = Na__AppUtils__Location;
        if (loc && (projectCode === Na__AppUtils__GetProjectCodeFromUrl() || String(projectCode).split('/').pop() === loc.folder)) {
            return `${loc.year}/${loc.folder}`;
        }
        return String(projectCode).replace(/^\/+|\/+$/g, '');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Where the Project Lives (asked of the server once)
// -----------------------------------------------------------------------------

    // FUNCTION | Ask the Server Where This Page's Project Lives (Memoised, Never Rejects)
    // ------------------------------------------------------------
    // Settles to the location, or null without a ?project= or for a project the
    // library does not have. Await it before asking for the folder or the year.
    // ------------------------------------------------------------
    function Na__AppUtils__InitProjectLocation() {
        if (Na__AppUtils__LocationPromise) return Na__AppUtils__LocationPromise;
        const token = Na__AppUtils__GetProjectCodeFromUrl();
        Na__AppUtils__LocationPromise = (async () => {
            if (!token) return null;
            try {
                const response = await fetch(Na__AppUtils__ApiUrl(`projects/${Na__AppUtils__EncodePath(token)}/location`), { cache : 'no-store', credentials : 'same-origin' });
                if (!response.ok) {
                    console.warn(`[ValeVision3D] Project "${token}" is not in the Projects Master Library (${response.status}).`);
                    return null;
                }
                const answer = await response.json();
                Na__AppUtils__Location = answer && answer.folder ? answer : null;
            } catch (error) {
                console.warn('[ValeVision3D] The project location could not be read:', error && error.message);
            }
            return Na__AppUtils__Location;
        })();
        return Na__AppUtils__LocationPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Settled Location, or Null
    // ------------------------------------------------------------
    function Na__AppUtils__GetProjectLocation() {
        return Na__AppUtils__Location;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Project Record
// -----------------------------------------------------------------------------

    // FUNCTION | Fetch the Project Record (Memoised per Token)
    // ------------------------------------------------------------
    // resilienceConfig: LoadResilience__Config (FetchTimeoutMs, RetryCount,
    // RetryBaseDelayMs) from Na__AppConfig__Main.json; defaults otherwise.
    // ------------------------------------------------------------
    function Na__AppUtils__FetchProjectJson(projectCode, resilienceConfig) {
        const cacheKey = projectCode || '__no_project__';
        if (Na__AppUtils__FetchCache.has(cacheKey)) return Na__AppUtils__FetchCache.get(cacheKey);

        const timeoutMs    = (resilienceConfig && resilienceConfig.LoadResilience__Config__FetchTimeoutMs)   || 15000;
        const retries      = (resilienceConfig && resilienceConfig.LoadResilience__Config__RetryCount)       || 2;
        const retryDelayMs = (resilienceConfig && resilienceConfig.LoadResilience__Config__RetryBaseDelayMs) || 1000;

        const fetchPromise = (async () => {
            await Na__AppUtils__InitProjectLocation();                         // <-- Folder, year and model URLs known before anyone uses the record
            try {
                const url  = Na__AppUtils__ApiUrl(`projects/${Na__AppUtils__EncodePath(projectCode)}`);
                const resp = await Na__ResilientLoad__FetchWithTimeout(url, { timeoutMs, retries, retryDelayMs });
                return await resp.json();
            } catch (err) {
                Na__AppUtils__FetchCache.delete(cacheKey);                      // <-- Evict so a later call can retry
                throw err;
            }
        })();

        Na__AppUtils__FetchCache.set(cacheKey, fetchPromise);
        return fetchPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Public URL of a File the Project Holds (scene thumbnails, gallery images, Layout Editor files)
    // ------------------------------------------------------------
    // Answers { primary, fallback } - the same URL twice now there is one
    // store - so the callers written for the R2 / GitHub Pages pair work as
    // they are. A file name with no bucket of its own is read from the
    // project folder itself.
    // ------------------------------------------------------------
    function Na__AppUtils__ResolveAssetUrl(projectFolderId, filename) {
        const url = Na__AppUtils__ProjectFileUrl(projectFolderId, filename);
        return { primary : url, fallback : url };
    }

    function Na__AppUtils__ProjectFileUrl(projectFolderId, filename) {
        const name = String(filename || '').replace(/^\/+/, '');
        const loc  = Na__AppUtils__Location;
        const id   = String(projectFolderId || (loc && loc.folder) || '').split('/').pop();
        if (name.startsWith(Na__AppUtils__UserDataPrefix)) {
            return Na__AppUtils__ApiUrl(`projects/${encodeURIComponent(id)}/userdata/${Na__AppUtils__EncodePath(name)}`);
        }
        if (!loc || loc.folder !== id) {
            return Na__AppUtils__ApiUrl(`projects/${encodeURIComponent(id)}/userdata/${Na__AppUtils__EncodePath(name)}`);   // <-- Another project's file: the API knows where it is
        }
        const base = name.split('/').pop();
        if (name.startsWith(Na__AppUtils__SceneThumbsPrefix) || (!name.includes('/') && Na__AppUtils__WebpRx.test(name))) {
            return loc.scenesUrl + encodeURIComponent(base);
        }
        if (!name.includes('/') && Na__AppUtils__GalleryImageRx.test(name)) return loc.galleryUrl + encodeURIComponent(base);
        return loc.webBase + Na__AppUtils__EncodePath(name);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Model URL Extraction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Model URLs From the Record (Multi-Format)
    // ------------------------------------------------------------
    // Four record formats, one flat array of URLs in the project's model bucket:
    //   v4: valeVision_ModelUrls (array)            -> each one
    //   v3: valeVision_ModelUrl_BaseMesh + _Linework -> the pair
    //   v2: valeVision_ModelUrl (array of versions)  -> the last
    //   v1: valeVision_ModelUrl (string)             -> that one
    // Each entry is a file name; an older full URL is reduced to its name.
    // ------------------------------------------------------------
    function Na__AppUtils__ExtractModelUrls(projectData) {
        if (!projectData) return [];
        let names = [];
        if (Array.isArray(projectData.valeVision_ModelUrls) && projectData.valeVision_ModelUrls.length > 0) {
            names = projectData.valeVision_ModelUrls;
        } else if (projectData.valeVision_ModelUrl_BaseMesh || projectData.valeVision_ModelUrl_Linework) {
            names = [projectData.valeVision_ModelUrl_BaseMesh, projectData.valeVision_ModelUrl_Linework].filter(Boolean);
        } else if (Array.isArray(projectData.valeVision_ModelUrl) && projectData.valeVision_ModelUrl.length > 0) {
            names = [projectData.valeVision_ModelUrl[projectData.valeVision_ModelUrl.length - 1]];
        } else if (typeof projectData.valeVision_ModelUrl === 'string' && projectData.valeVision_ModelUrl) {
            names = [projectData.valeVision_ModelUrl];
        }
        return names.map(Na__AppUtils__ModelUrl).filter(Boolean);
    }

    function Na__AppUtils__ModelUrl(entry) {
        const name = String(entry || '').split('?')[0].split('/').pop();
        if (!name) return null;
        const loc = Na__AppUtils__Location;
        if (!loc) {
            console.warn(`[ValeVision3D] No project location for model ${name}; it cannot be loaded.`);
            return null;
        }
        return loc.modelsUrl + encodeURIComponent(name);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Project Loader API
    // ------------------------------------------------------------
    export {
        Na__AppUtils__ApiUrl,
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__GetProjectFolderFromUrl,
        Na__AppUtils__GetYearFromUrl,
        Na__AppUtils__NormalizeProjectFolderId,
        Na__AppUtils__InitProjectLocation,
        Na__AppUtils__GetProjectLocation,
        Na__AppUtils__FetchProjectJson,
        Na__AppUtils__ExtractModelUrls,
        Na__AppUtils__ResolveAssetUrl,
        Na__AppUtils__ProjectFileUrl
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
