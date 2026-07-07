// =============================================================================
// WHITECARDOPEDIA - PROJECT LOADER UTILITY
// =============================================================================
//
// FILE       : Na__AppData__ProjectLoader.js
// NAMESPACE  : Whitecardopedia
// MODULE     : ProjectLoader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Dynamic project data loading utility
// CREATED    : 2025
//
// DESCRIPTION:
// - Utility functions for loading project data from folder structure.
// - Reads masterConfig.json for project index.
// - Loads individual project.json files for project metadata.
// - Handles image path resolution for project galleries.
// - R2-first loading: project.json and images are fetched from Cloudflare R2
//   CDN first and fall back to GH Pages on failure. Base URLs are driven from
//   masterConfig (SSOT); a fallback toast is emitted on GH Pages fallback.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 2025 - Version 0.1.0
// - Initial implementation.
//
// 25-Jun-2026 - Version 0.2.0
// - R2-first loading: loadProjectData tries R2 CDN first then GH Pages.
// - getImageUrl and getThumbnailImage return R2-first URLs.
// - Na__AssetUrls__InitFromConfig seeds R2/GH bases from masterConfig.
//
// 25-Jun-2026 - Version 0.2.1
// - Fixed blank gallery thumbnails: thumbnails live in the project root as
//   <base>__Thumbnail__524p__.webp (not a Thumbnails__524p__WebP/ sub-path).
//   Removed na_get_thumbnail_sub_path; added na_derive_thumbnail_filename.
// - Added getImageUrlPair / getThumbnailImagePair returning { primary, fallback }
//   and Na__AssetUrls__HandleImgError for R2->GH onError fallback + toast.
//
// 25-Jun-2026 - Version 0.2.2
// - Master index integration: na_load_master_index (R2-first, GH fallback,
//   memoised) + na_resolve_project_base resolve each project's true asset home
//   from VaApps/Index/Na__MasterIndex__ProjectLocations__.json. project.json
//   and images now fetch the correct source directly, killing the blind-R2
//   404 flood. Index URLs seeded from masterConfig SSOT.
//
// 25-Jun-2026 - Version 0.2.3
// - R2-driven cache invalidation: na_check_and_clear_on_build_change reads the
//   shared build-version manifest (cache-busted) on load and evicts the
//   wpwa-thumbs-* Service Worker cache when buildVersion increases, so
//   re-synced gallery thumbnails appear without a manual SW version bump.
// - loadMasterConfig now fetches the R2 master config mirror first (cache-
//   busted) and falls back to the GH Pages copy, removing the GH push + deploy
//   wait when adding or enabling a project.
//
// 25-Jun-2026 - Version 0.2.4
// - Carousel gate: loadProjectData now forwards hasGlb_R2 from the master
//   index onto the project object so the viewer can suppress carousel
//   navigation for 3D projects without reading valeVision_ModelUrls.
//
// 26-Jun-2026 - Version 0.2.5
// - Cache-bust the master index fetch: na_load_master_index now appends
//   ?t=<timestamp> + cache:'no-store' to the R2 primary URL (matching
//   the pattern already used for masterConfig and the build manifest).
//   Fixes stale-session issue where hasGlb_R2 flag changes made by a sync
//   mid-session were invisible until the user did a hard refresh.
//
// 07-Jul-2026 - Version 0.2.6
// - Added loadAllProjectsIncludingDisabled() for the Project Editor's picker
//   so disabled projects can be found and re-enabled (public loadAllProjects
//   is unchanged — still enabled-only for the gallery).
// - Added na_get_master_index_entry() read-only accessor and
//   na_reset_master_index_cache() so the editor's new rename/visibility
//   actions can force a fresh index fetch after a server-side mutation.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants & State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Loader Configuration
    // ------------------------------------------------------------
    const PROJECT_LOADER_CONFIG = {
        masterConfigPath    : '02__Src__AppModules/03__AppData/Na__AppData__MasterConfig__Main.json', // <-- Master configuration file path (GH Pages fallback)
        masterConfigR2Url   : 'https://cdn.noble-architecture.com/VaApps/Index/Na__AppData__MasterConfig__Main.json', // <-- R2 mirror (real-time, no GH push)
        buildManifestUrl    : 'https://cdn.noble-architecture.com/VaApps/Index/Na__BuildVersion__Manifest__.json', // <-- Shared build-version manifest
        buildVersionKey     : 'wcp_last_build_version',                  // <-- localStorage key holding the last-seen buildVersion
        designersListPath   : '02__Src__AppModules/03__AppData/Na__AppData__ValeDesignersList__Main.json', // <-- Dedicated designers options file
        artistsListPath     : '02__Src__AppModules/03__AppData/Na__AppData__ValeConceptArtistsList__Main.json', // <-- Dedicated concept artists options file
        projectBasePath     : 'Projects',                                // <-- Base path for projects (year comes from folderId)
    };
    // ------------------------------------------------------------

    // MODULE VARIABLES | R2 Asset URL State (populated from masterConfig)
    // ------------------------------------------------------------
    let Na__AssetUrls__R2Base      = 'https://cdn.noble-architecture.com/VaApps/Projects';       // <-- R2 CDN primary base
    let Na__AssetUrls__GhBase      = 'https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/Projects'; // <-- GH Pages fallback base
    let Na__AssetUrls__FallbackMsg = 'Failed to fetch live assets — using static assets instead.'; // <-- Toast message
    let Na__AssetUrls__Initialised = false;                              // <-- Prevents re-seeding after first load
    // ------------------------------------------------------------

    // MODULE VARIABLES | Master Index State (authoritative per-project asset locations)
    // ------------------------------------------------------------
    let Na__MasterIndex__Url         = 'https://cdn.noble-architecture.com/VaApps/Index/Na__MasterIndex__ProjectLocations__.json'; // <-- R2 primary index
    let Na__MasterIndex__FallbackUrl = '02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json';                 // <-- GH Pages fallback (same-origin)
    let Na__MasterIndex__LoadPromise = null;                             // <-- Memoised load promise (R2-first, GH fallback)
    let Na__MasterIndex__EntryMap    = null;                             // <-- Map<folderId, indexEntry> once loaded
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Thumbnail Naming Convention (mirrors generator script)
    // ------------------------------------------------------------
    const THUMBNAIL_SUFFIX_TOKEN   = '__Thumbnail__524p__';              // <-- Appended to source image base name
    const THUMBNAIL_WEBP_EXTENSION = '.webp';                            // <-- Thumbnail file extension
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Batch Loading Configuration
    // ------------------------------------------------------------
    const GALLERY_INITIAL_BATCH_SIZE     = 20;                           // <-- First batch revealed to user (fast first paint)
    const GALLERY_SUBSEQUENT_BATCH_SIZE  = 20;                           // <-- Each follow-up batch streamed in background
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | R2 Asset URL System - URL Construction & Fallback Handling
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build An R2-Primary / GH-Fallback Asset URL Pair
    // ---------------------------------------------------------------
    // Returns { primary, fallback }: R2 CDN URL first (when available) and a
    // same-origin GH Pages relative URL as the fallback for onError swapping.
    // ---------------------------------------------------------------
    function na_build_asset_url_pair(projectData, fileName) {
        if (!projectData || !fileName) return null;                       // <-- Guard missing args

        const ghUrl = `${projectData.basePath}/${fileName}`;             // <-- GH Pages relative (same-origin fallback)
        const primary = projectData.r2BasePath
            ? `${projectData.r2BasePath}/${fileName}`                    // <-- R2 CDN primary when available
            : ghUrl;                                                     // <-- Otherwise GH is the primary

        return { primary, fallback: ghUrl };                             // <-- Pair for src + onError
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Seed Asset Base URLs From masterConfig (call once)
    // ---------------------------------------------------------------
    function Na__AssetUrls__InitFromConfig(masterConfig) {
        if (Na__AssetUrls__Initialised || !masterConfig) return;

        if (masterConfig.AssetUrls__R2BaseUrl)        Na__AssetUrls__R2Base        = masterConfig.AssetUrls__R2BaseUrl;
        if (masterConfig.AssetUrls__GhBaseUrl)        Na__AssetUrls__GhBase        = masterConfig.AssetUrls__GhBaseUrl;
        if (masterConfig.AssetUrls__FallbackToastMsg) Na__AssetUrls__FallbackMsg   = masterConfig.AssetUrls__FallbackToastMsg;
        if (masterConfig.AssetUrls__IndexUrl)         Na__MasterIndex__Url         = masterConfig.AssetUrls__IndexUrl;
        if (masterConfig.AssetUrls__IndexFallbackUrl) Na__MasterIndex__FallbackUrl = masterConfig.AssetUrls__IndexFallbackUrl;

        Na__AssetUrls__Initialised = true;
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Emit Fallback Toast When R2 Fails
    // ---------------------------------------------------------------
    function Na__AssetUrls__EmitFallbackToast() {
        try {
            window.dispatchEvent(new CustomEvent('wcp-asset-fallback-toast', {
                detail: { message: Na__AssetUrls__FallbackMsg }
            }));
        } catch (_) {}
    }
    // ---------------------------------------------------------------


    // FUNCTION | Shared <img> onError Handler — Swap R2 To GH Pages Once
    // ---------------------------------------------------------------
    // Attach to any <img> that was sourced from an R2 primary URL and given a
    // `data-fallback-src` (the GH Pages relative URL). On the first load
    // failure it swaps to the fallback once and emits the fallback toast.
    // ---------------------------------------------------------------
    function Na__AssetUrls__HandleImgError(event) {
        const img = event && event.currentTarget;                         // <-- The failing <img>
        if (!img) return;

        const fallback = img.getAttribute('data-fallback-src');          // <-- GH Pages relative URL
        if (!fallback) return;                                            // <-- Nothing to fall back to
        if (img.getAttribute('data-fallback-applied') === '1') return;   // <-- Already fell back once

        if (img.getAttribute('src') === fallback) {                      // <-- Primary already equalled fallback
            img.setAttribute('data-fallback-applied', '1');
            return;
        }

        img.setAttribute('data-fallback-applied', '1');                  // <-- Mark so we only swap once
        img.src = fallback;                                              // <-- Swap to same-origin GH Pages asset
        Na__AssetUrls__EmitFallbackToast();                             // <-- Notify the user
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Master Index - Loading, Caching & Project Source Resolution
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Master Project Index (R2-first, GH Fallback, Memoised)
    // ---------------------------------------------------------------
    // The index lists every project's year, asset home (r2|gh) and R2 presence
    // flags so the loader can fetch each project from the correct source
    // directly — eliminating the blind-R2 404 flood. Resolves to a
    // Map<folderId, entry>. Never throws; resolves to an empty Map on failure
    // so callers transparently fall back to the legacy R2-then-GH behaviour.
    // ---------------------------------------------------------------
    function na_load_master_index() {
        if (Na__MasterIndex__LoadPromise) return Na__MasterIndex__LoadPromise; // <-- Single fetch per session

        Na__MasterIndex__LoadPromise = (async () => {
            const cacheBust = `?t=${Date.now()}`;                         // <-- Prevent stale cached index hiding new hasGlb_R2 flags

            const tryFetch = async (url, bust = false) => {
                try {
                    const fetchUrl  = bust ? `${url}${cacheBust}` : url;  // <-- Append cache-bust to R2 URLs
                    const fetchOpts = bust ? { cache: 'no-store' } : {};  // <-- Bypass browser cache on R2 fetch
                    const resp = await fetch(fetchUrl, fetchOpts);        // <-- Attempt one source
                    if (resp.ok) return await resp.json();
                } catch (_) {}
                return null;
            };

            let index = await tryFetch(Na__MasterIndex__Url, true);      // <-- R2 CDN primary (cache-busted)
            if (!index) index = await tryFetch(Na__MasterIndex__FallbackUrl); // <-- GH Pages fallback copy

            const map = new Map();
            if (index && Array.isArray(index.projects)) {
                for (const entry of index.projects) {
                    if (entry && entry.folderId) map.set(entry.folderId, entry); // <-- Key by folderId
                }
            }
            Na__MasterIndex__EntryMap = map;                             // <-- Cache resolved map
            return map;
        })();

        return Na__MasterIndex__LoadPromise;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get a Master Index Entry by folderId (Read-Only Accessor)
    // ---------------------------------------------------------------
    // Exposes the memoised master index map for callers that need read-only
    // visibility into pipeline-managed fields (asset home, image/GLB
    // presence, last-synced date) — e.g. the Project Editor's info panel.
    // Returns null when the index hasn't loaded yet or has no matching entry.
    // Callers should `await na_load_master_index()` first to guarantee the
    // map is populated before calling this.
    // ---------------------------------------------------------------
    function na_get_master_index_entry(folderId) {
        return Na__MasterIndex__EntryMap ? (Na__MasterIndex__EntryMap.get(folderId) || null) : null;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Reset the Memoised Master Index Cache (Force Next Load to Re-Fetch)
    // ---------------------------------------------------------------
    // Called after an operation that mutates the master index server-side
    // (e.g. the Project Editor's rename action) so the very next
    // na_load_master_index() call re-fetches fresh data instead of serving
    // the stale in-memory map for the rest of the browser session.
    // ---------------------------------------------------------------
    function na_reset_master_index_cache() {
        Na__MasterIndex__LoadPromise = null;
        Na__MasterIndex__EntryMap    = null;
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Correct Asset Base For a Project
    // ---------------------------------------------------------------
    // Uses the master index (when loaded) to decide whether a project's
    // project.json lives on R2 or GH Pages, returning the matching base + a
    // flag. Falls back to R2 (legacy behaviour) when the index is unavailable
    // or has no entry for the project.
    // ---------------------------------------------------------------
    function na_resolve_project_base(folderId) {
        const entry = Na__MasterIndex__EntryMap ? Na__MasterIndex__EntryMap.get(folderId) : null;

        if (entry && entry.assetHome === 'gh') {
            return { base: Na__AssetUrls__GhBase, isR2: false, indexed: true }; // <-- Index says GH-only
        }
        if (entry && entry.assetHome === 'r2') {
            return { base: Na__AssetUrls__R2Base, isR2: true, indexed: true };  // <-- Index says R2
        }
        return { base: Na__AssetUrls__R2Base, isR2: true, indexed: false };     // <-- No index info — try R2 first (legacy)
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Fetch project.json from the Indexed Source (R2 or GH)
    // ---------------------------------------------------------------
    async function na_fetch_project_json_r2_first(folderId) {
        const r2Url  = `${Na__AssetUrls__R2Base}/${folderId}/project.json`;
        const ghUrl  = `${Na__AssetUrls__GhBase}/${folderId}/project.json`;
        const ghPath = `${PROJECT_LOADER_CONFIG.projectBasePath}/${folderId}/project.json`; // <-- Local/GH Pages relative

        await na_load_master_index();                                     // <-- Ensure index is available (memoised)
        const resolved = na_resolve_project_base(folderId);               // <-- Index-driven source decision

        // INDEX SAYS GH-ONLY | Skip the doomed R2 request entirely (kills 404 noise)
        if (resolved.indexed && !resolved.isR2) {
            try {
                const ghResponse = await fetch(ghPath);                   // <-- Same-origin GH Pages first
                if (ghResponse.ok) return { response: ghResponse, isR2: false };
            } catch (_) {}
            const ghAbsoluteResponse = await fetch(ghUrl);                // <-- Absolute GH Pages fallback
            return { response: ghAbsoluteResponse, isR2: false };
        }

        // INDEX SAYS R2 (or unknown) | Try R2 first, then GH Pages
        try {
            const r2Response = await fetch(r2Url);
            if (r2Response.ok) return { response: r2Response, isR2: true };
        } catch (_) {}

        // R2 failed — try GH Pages relative path first (same origin for GitHub Pages deployment)
        try {
            const ghResponse = await fetch(ghPath);
            if (ghResponse.ok) {
                Na__AssetUrls__EmitFallbackToast();
                return { response: ghResponse, isR2: false };
            }
        } catch (_) {}

        // Last resort: absolute GH Pages URL
        Na__AssetUrls__EmitFallbackToast();
        const ghAbsoluteResponse = await fetch(ghUrl);
        return { response: ghAbsoluteResponse, isR2: false };
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Service Worker Cache Management
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Clear Only the Thumbnail Service Worker Cache Bucket
    // ---------------------------------------------------------------
    // Evicts the wpwa-thumbs-* Cache Storage bucket(s) without touching the app
    // shell, data or model caches. The Service Worker re-fetches fresh thumbnails
    // from R2 on the next gallery render.
    // ---------------------------------------------------------------
    async function na_clear_thumbnail_cache() {
        if (!('caches' in window)) return;                               // <-- No Cache Storage API (older browsers)
        try {
            const all    = await caches.keys();                          // <-- All cache bucket names
            const thumbs = all.filter(n => n.startsWith('wpwa-thumbs-')); // <-- Only the thumbnail buckets
            await Promise.all(thumbs.map(n => caches.delete(n)));        // <-- Drop them so SW refetches from R2
        } catch (_) {}                                                   // <-- Best-effort; never break the load
    }
    // ---------------------------------------------------------------


    // FUNCTION | Fetch the R2 Build Manifest and Evict Thumbs If Newer
    // ---------------------------------------------------------------
    // Reads the shared build-version manifest (written by the sync pipeline) with
    // a cache-bust query param so the Cloudflare edge cannot serve a stale copy.
    // When the buildVersion is newer than the last-seen value, the thumbnail
    // cache is cleared so re-synced images appear immediately. Non-blocking:
    // any failure leaves the app on its current behaviour.
    // ---------------------------------------------------------------
    async function na_check_and_clear_on_build_change() {
        try {
            const url  = `${PROJECT_LOADER_CONFIG.buildManifestUrl}?t=${Date.now()}`; // <-- Bust the edge cache
            const resp = await fetch(url, { cache: 'no-store' });        // <-- Bust the browser cache
            if (!resp.ok) return;

            const manifest     = await resp.json();
            const buildVersion = manifest && manifest.buildVersion;      // <-- Unix timestamp from the sync pipeline
            if (!buildVersion) return;

            const stored = parseInt(localStorage.getItem(PROJECT_LOADER_CONFIG.buildVersionKey) || '0', 10);
            if (buildVersion > stored) {
                localStorage.setItem(PROJECT_LOADER_CONFIG.buildVersionKey, String(buildVersion)); // <-- Remember new build
                await na_clear_thumbnail_cache();                        // <-- Evict stale thumbs; SW refetches fresh from R2
            }
        } catch (_) {}                                                   // <-- Non-blocking: never break the app on manifest failure
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Master Config & Options Lists Loading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Load Option List from Dedicated Data File
    // ---------------------------------------------------------------
    async function loadOptionsListFromFile(filePath, keyName) {
        try {
            const response = await fetch(filePath);                      // <-- Fetch dedicated options file

            if (!response.ok) {
                return null;                                             // <-- Return null if file missing/unreadable
            }

            const data       = await response.json();                    // <-- Parse JSON response
            const optionsList = data[keyName];                           // <-- Read expected list key

            return Array.isArray(optionsList) ? optionsList : null;      // <-- Return list or null if invalid shape
        } catch (error) {
            console.warn(`Warning loading ${keyName} from ${filePath}:`, error); // <-- Log non-blocking warning
            return null;                                                 // <-- Return null on any fetch/parse error
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load Master Configuration (R2 mirror first, GH Pages fallback)
    // ---------------------------------------------------------------
    async function loadMasterConfig() {
        await na_check_and_clear_on_build_change();                      // <-- Check build version BEFORE loading any data
        try {
            const r2Url    = `${PROJECT_LOADER_CONFIG.masterConfigR2Url}?t=${Date.now()}`; // <-- R2 mirror, cache-busted
            let   response = await fetch(r2Url, { cache: 'no-store' }).catch(() => null);   // <-- Try R2 first (real-time)

            if (!response || !response.ok) {
                response = await fetch(PROJECT_LOADER_CONFIG.masterConfigPath); // <-- GH Pages fallback
            }

            if (!response.ok) {
                throw new Error('Failed to load master configuration');  // <-- Handle fetch error
            }

            const config = await response.json();                        // <-- Parse JSON response

            Na__AssetUrls__InitFromConfig(config);                       // <-- Seed R2/GH base URLs from masterConfig SSOT
            na_load_master_index();                                      // <-- Kick off master index load (R2-first, GH fallback; memoised)

            // LOAD DEDICATED LIST FILES | Canonical source with masterConfig fallback
            const designersList = await loadOptionsListFromFile(
                PROJECT_LOADER_CONFIG.designersListPath,
                'vale__Designer__OptionsList'
            );
            const artistsList = await loadOptionsListFromFile(
                PROJECT_LOADER_CONFIG.artistsListPath,
                'vale__ConceptArtist__OptionsList'
            );

            if (designersList !== null) {
                config.vale__Designer__OptionsList = designersList;      // <-- Prefer dedicated designers list when available
            }

            if (artistsList !== null) {
                config.vale__ConceptArtist__OptionsList = artistsList;    // <-- Prefer dedicated concept artists list when available
            }

            return config;                                               // <-- Return configuration object

        } catch (error) {
            console.error('Error loading master config:', error);        // <-- Log error
            return null;                                                 // <-- Return null on error
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project Data Loading - Individual & Batched
// -----------------------------------------------------------------------------

    // FUNCTION | Load Individual Project Data (R2-first with GH fallback)
    // ---------------------------------------------------------------
    async function loadProjectData(folderId) {
        const localProjectPath = `${PROJECT_LOADER_CONFIG.projectBasePath}/${folderId}`;  // <-- GH Pages relative path

        try {
            const { response, isR2 } = await na_fetch_project_json_r2_first(folderId);  // <-- R2-first fetch

            if (!response.ok) {
                throw new Error(`Failed to load project: ${folderId}`);  // <-- Handle fetch error
            }

            const projectData      = await response.json();              // <-- Parse JSON response
            projectData.folderId   = folderId;                           // <-- Add folder ID to data
            projectData.basePath   = localProjectPath;                   // <-- GH relative path (fallback image resolution)
            projectData.isR2Loaded = isR2;                               // <-- Provenance flag for callers

            // RESOLVE IMAGE BASE | Use R2 only when the index confirms images live there
            const indexEntry = Na__MasterIndex__EntryMap ? Na__MasterIndex__EntryMap.get(folderId) : null;
            const imagesOnR2 = !indexEntry || indexEntry.hasImages_R2 !== false;  // <-- Unknown -> assume R2 (legacy + onError safety net)
            projectData.r2BasePath = imagesOnR2
                ? `${Na__AssetUrls__R2Base}/${folderId}`                 // <-- R2 primary for images/thumbnails
                : null;                                                   // <-- Index says GH-only — make GH the primary (no 404)

            // MERGE INDEX FLAGS | Expose hasGlb_R2 from master index onto the project object
            if (indexEntry) {
                projectData.hasGlb_R2 = indexEntry.hasGlb_R2 === true;  // <-- 3D model present in R2 (drives carousel gate)
            }

            // PRE-PROCESS IMAGES | Build pairs map from JSON images array
            if (projectData.images && projectData.images.length > 0) {
                const { baseImages, pairsMap } = buildImagePairsMap(projectData.images);  // <-- Build pairs map
                projectData.displayImages = baseImages;                  // <-- Base images for carousel
                projectData.artPairsMap   = pairsMap;                    // <-- Pre-built pairs map
                projectData.allImages     = projectData.images;          // <-- Keep original for downloads
            }

            return projectData;                                          // <-- Return project data object

        } catch (error) {
            console.error(`Error loading project ${folderId}:`, error);  // <-- Log error
            return null;                                                 // <-- Return null on error
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load All Projects from Master Config
    // ---------------------------------------------------------------
    async function loadAllProjects() {
        const masterConfig = await loadMasterConfig();                   // <-- Load master configuration

        if (!masterConfig || !masterConfig.projects) {
            return [];                                                   // <-- Return empty array on error
        }

        const projectPromises = masterConfig.projects
            .filter(project => project.enabled)                          // <-- Filter enabled projects only
            .map(project => loadProjectData(project.folderId));          // <-- Map to load promises

        const projects = await Promise.all(projectPromises);             // <-- Wait for all projects to load

        return projects.filter(project => project !== null);             // <-- Filter out failed loads
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load All Projects Including Disabled (Project Editor Only)
    // ---------------------------------------------------------------
    // Mirrors loadAllProjects() but skips the `enabled` filter so the editor
    // can find and re-enable hidden projects. Still excludes blacklisted
    // template/example folders (projectFoldersBlacklist) so scaffolding
    // placeholders never clutter the editor's picker. Merges each project's
    // `enabled` flag from masterConfig onto the loaded project object —
    // public-facing loadAllProjects() is left completely untouched.
    // ---------------------------------------------------------------
    async function loadAllProjectsIncludingDisabled() {
        const masterConfig = await loadMasterConfig();                   // <-- Load master configuration

        if (!masterConfig || !masterConfig.projects) {
            return [];                                                   // <-- Return empty array on error
        }

        const blacklist = Array.isArray(masterConfig.projectFoldersBlacklist)
            ? masterConfig.projectFoldersBlacklist
            : [];

        const editableEntries = masterConfig.projects.filter(project => {
            const folderName = String(project.folderId || '').split('/')[1] || '';
            return !blacklist.includes(folderName);                      // <-- Drop template/example placeholders
        });

        const projectPromises = editableEntries.map(async (entry) => {
            const projectData = await loadProjectData(entry.folderId);   // <-- Load full project.json data
            if (projectData) {
                projectData.enabled = entry.enabled !== false;           // <-- Merge masterConfig visibility flag
            }
            return projectData;
        });

        const projects = await Promise.all(projectPromises);             // <-- Wait for all projects to load

        return projects.filter(project => project !== null);             // <-- Filter out failed loads
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Extract Year Prefix From Folder Identifier
    // ---------------------------------------------------------------
    function extractFolderIdYear(folderId) {
        const yearMatch = typeof folderId === 'string'
            ? folderId.match(/^(\d{4})\//)                               // <-- Match 4-digit year prefix before slash
            : null;
        return yearMatch ? parseInt(yearMatch[1], 10) : 0;               // <-- Return 0 if folderId is malformed
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Order Projects Newest-First For Batched Loading
    // ---------------------------------------------------------------
    // The masterConfig keeps newly-added projects at the end of the
    // list, so reverse-original-order within each year approximates
    // "newest first" - which matches the gallery's default
    // date-newest sort and gets the most-relevant cards on screen
    // during the very first batch of fetches.
    // ---------------------------------------------------------------
    function sortProjectEntriesNewestFirst(projectEntries) {
        const indexed = projectEntries.map((project, originalIndex) => ({
            project,                                                     // <-- Preserve original entry
            originalIndex                                                // <-- Preserve original position
        }));

        indexed.sort((a, b) => {
            const yearA = extractFolderIdYear(a.project.folderId);       // <-- Year of project A
            const yearB = extractFolderIdYear(b.project.folderId);       // <-- Year of project B
            if (yearA !== yearB) return yearB - yearA;                   // <-- Newer year first
            return b.originalIndex - a.originalIndex;                    // <-- Within same year: newest-appended first
        });

        return indexed.map(item => item.project);                        // <-- Return reordered entries
    }
    // ---------------------------------------------------------------


    // FUNCTION | Load Projects Progressively in Batches
    // ---------------------------------------------------------------
    // Streams enabled projects to the caller in chunks via onBatchLoaded
    // so the gallery can render the first batch immediately while
    // subsequent batches continue loading in the background. Projects
    // are ordered newest-first so the initial batch matches the
    // gallery's default date-newest sort and the user sees the most
    // relevant cards as soon as they appear.
    // ---------------------------------------------------------------
    async function loadProjectsInBatches(initialBatchSize, subsequentBatchSize, onBatchLoaded) {
        const masterConfig = await loadMasterConfig();                   // <-- Load master configuration

        if (!masterConfig || !masterConfig.projects) {
            return [];                                                   // <-- Return empty array on error
        }

        const enabledProjects = sortProjectEntriesNewestFirst(
            masterConfig.projects.filter(project => project.enabled)     // <-- Filter enabled projects only
        );                                                               // <-- Reorder so newest entries load first

        const totalEnabled = enabledProjects.length;                     // <-- Total projects to load
        const allLoaded    = [];                                         // <-- Aggregate of every loaded project
        let   cursor       = 0;                                          // <-- Position in enabled list

        while (cursor < enabledProjects.length) {
            const batchSize = cursor === 0 ? initialBatchSize : subsequentBatchSize;  // <-- First batch may differ from rest
            const chunk     = enabledProjects.slice(cursor, cursor + batchSize);       // <-- Slice next chunk

            const chunkPromises = chunk.map(project => loadProjectData(project.folderId));  // <-- Fetch project.json per item
            const chunkResults  = (await Promise.all(chunkPromises))
                .filter(project => project !== null);                    // <-- Drop failed loads

            allLoaded.push(...chunkResults);                             // <-- Append to aggregate

            if (typeof onBatchLoaded === 'function') {
                onBatchLoaded(chunkResults, allLoaded.length, totalEnabled);  // <-- Notify caller with progress
            }

            cursor += batchSize;                                         // <-- Advance cursor
        }

        return allLoaded;                                                // <-- Return full list when done
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Image URL Resolution - R2-First with GH Pages Fallback
// -----------------------------------------------------------------------------

    // FUNCTION | Get Image URL for Project (R2 primary, GH fallback)
    // ---------------------------------------------------------------
    function getImageUrl(projectData, imageName) {
        if (!projectData || !imageName) return '';                        // <-- Guard missing args

        if (projectData.r2BasePath) {
            return `${projectData.r2BasePath}/${imageName}`;             // <-- R2 primary URL when available
        }

        return `${projectData.basePath}/${imageName}`;                   // <-- GH Pages relative fallback
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Full Image URL Pair (R2 primary + GH fallback)
    // ---------------------------------------------------------------
    function getImageUrlPair(projectData, imageName) {
        return na_build_asset_url_pair(projectData, imageName);          // <-- { primary, fallback }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Derive Root-Level Thumbnail Filename
    // ---------------------------------------------------------------
    // Thumbnails are generated alongside their source image in the project
    // root using the suffix token "__Thumbnail__524p__" + ".webp"
    // (see AutomationUtil__GenerateGalleryThumbnails__524p__Main__.py).
    // project.json.thumbnailImage usually already holds this full filename;
    // if a bare source image is passed we derive it here.
    // ---------------------------------------------------------------
    function na_derive_thumbnail_filename(filename) {
        if (!filename) return null;                                       // <-- Guard missing filename
        if (filename.includes(THUMBNAIL_SUFFIX_TOKEN)) return filename;   // <-- Already a thumbnail filename
        const base = filename.replace(/\.[^.]+$/, '');                    // <-- Strip source extension
        return `${base}${THUMBNAIL_SUFFIX_TOKEN}${THUMBNAIL_WEBP_EXTENSION}`;  // <-- <base>__Thumbnail__524p__.webp
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Thumbnail Image URL for Project (R2 primary)
    // ---------------------------------------------------------------
    function getThumbnailImage(projectData) {
        const pair = getThumbnailImagePair(projectData);                  // <-- Reuse pair builder for the primary URL
        return pair ? pair.primary : null;                               // <-- Primary (R2 when available)
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Thumbnail Image URL Pair (R2 primary + GH fallback)
    // ---------------------------------------------------------------
    function getThumbnailImagePair(projectData) {
        if (!projectData) return null;                                    // <-- Guard missing project

        const sourceFile = projectData.thumbnailImage
            || (projectData.images && projectData.images.length > 0 ? projectData.images[0] : null);  // <-- Prefer explicit thumbnail key

        const thumbFile = na_derive_thumbnail_filename(sourceFile);       // <-- Root-level thumbnail filename
        if (!thumbFile) return null;                                      // <-- No images available

        return na_build_asset_url_pair(projectData, thumbFile);          // <-- { primary, fallback }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Image Filename Parsing & ART Overlay Pairs
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Parse Image Filename to Extract Image Number & ART Code
    // ---------------------------------------------------------------
    function parseImageFileName(filename) {
        const artPattern    = /^IMG(\d{2})_ART(\d{2})__/;               // <-- Pattern for ART images
        const normalPattern = /^IMG(\d{2})__/;                           // <-- Pattern for normal images

        const artMatch = filename.match(artPattern);                     // <-- Check for ART pattern
        if (artMatch) {
            return {
                imageNumber : artMatch[1],                               // <-- Image number (01, 02, etc.)
                artCode     : artMatch[2],                               // <-- ART code (00, 05, 10, 20)
                isArtImage  : true                                       // <-- Flag as ART image
            };
        }

        const normalMatch = filename.match(normalPattern);               // <-- Check for normal pattern
        if (normalMatch) {
            return {
                imageNumber : normalMatch[1],                            // <-- Image number
                artCode     : null,                                      // <-- No ART code
                isArtImage  : false                                      // <-- Flag as normal image
            };
        }

        return null;                                                     // <-- Return null if no match
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Get Human-Readable Label for ART Code
    // ---------------------------------------------------------------
    function getArtCodeLabel(artCode) {
        const ART_CODE_LABELS = {
            '00' : 'Preliminary Sketch',                                 // <-- ART00 label
            '05' : '2D CAD Drafting',                                    // <-- ART05 label
            '10' : 'Hand Drawn Technical Pen Linework',                  // <-- ART10 label
            '20' : 'Hand Drawn Watercolour Painting'                     // <-- ART20 label
        };

        return ART_CODE_LABELS[artCode] || 'Artistic Rendering';         // <-- Return label or default
    }
    // ---------------------------------------------------------------


    // FUNCTION | Build Image Pairs Map from JSON Images Array
    // ---------------------------------------------------------------
    function buildImagePairsMap(images) {
        const pairsMap   = new Map();                                    // <-- Map: base image -> ART data
        const baseImages = [];                                           // <-- Array of base images only

        for (const imageName of images) {
            const parsed = parseImageFileName(imageName);                // <-- Parse filename

            if (!parsed) continue;                                       // <-- Skip invalid filenames

            if (parsed.isArtImage) {
                // ART VARIANT | Find the base image this variant belongs to
                const baseImgNum = parsed.imageNumber;                   // <-- Get image number (01, 02, etc)

                const baseImage = images.find(img => {
                    const baseParsed = parseImageFileName(img);
                    return baseParsed && !baseParsed.isArtImage && baseParsed.imageNumber === baseImgNum;
                });

                if (baseImage) {
                    const artData = {
                        filename : imageName,                            // <-- ART filename
                        artCode  : parsed.artCode,                       // <-- ART code (20, 10, etc)
                        label    : getArtCodeLabel(parsed.artCode)       // <-- Human readable label
                    };
                    pairsMap.set(baseImage, artData);                    // <-- Map base -> ART
                }
            } else {
                // BASE IMAGE
                baseImages.push(imageName);                              // <-- Add to base images array
            }
        }

        return { baseImages, pairsMap };                                 // <-- Return structured data
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get ART Pair for Base Image (Direct Lookup)
    // ---------------------------------------------------------------
    function getArtPairForImage(projectData, baseImageName) {
        if (!projectData.artPairsMap) {
            return null;                                                 // <-- No pairs map available
        }

        const artData = projectData.artPairsMap.get(baseImageName);      // <-- Direct map lookup

        if (artData) {
            return {
                filename : artData.filename,
                artCode  : artData.artCode,
                label    : artData.label,
                url      : getImageUrl(projectData, artData.filename)    // <-- R2-first URL via shared helper
            };
        }

        return null;                                                     // <-- No ART pair exists
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
