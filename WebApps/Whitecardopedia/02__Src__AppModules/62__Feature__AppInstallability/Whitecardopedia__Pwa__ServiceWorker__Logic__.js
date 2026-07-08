// =============================================================================
// WHITECARDOPEDIA - PWA SERVICE WORKER LOGIC
// =============================================================================
//
// FILE       : Whitecardopedia__Pwa__ServiceWorker__Logic__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__Pwa__ServiceWorker__Logic
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Caching brain of the Whitecardopedia + ValeVision3D PWA
// CREATED    : 2026
//
// DESCRIPTION:
// - Loaded via importScripts() from the WebApps-level stub so this file can
//   live alongside the rest of the install module set without sacrificing
//   the broad service-worker scope required to cover both apps.
// - Cache buckets:
//     * pwa-shell-vN  : HTML / CSS / JSX / JS / manifest / fonts / icons
//     * pwa-thumbs-vN : 524p gallery thumbnail images (stale-while-revalidate, capped)
//     * pwa-data-vN   : project.json / masterConfig.json (network-first)
// - Full-resolution IMG##__* project images are intentionally NOT cached so
//   the project view always shows the latest delivered art.
// - Bumping VERSION_TOKEN below invalidates everything via the activate
//   cleanup step. The app also evicts the thumbnail bucket on its own when the
//   shared R2 build-version manifest reports a newer build (see ProjectLoader).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 2026 - Version 1.0.0
// - Initial PWA service worker with shell / thumbs / data / models cache buckets.
//
// 08-Jul-2026 - Version 1.5.1
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-08-2 (force shell cache eviction after
//   ValeVision3D v2.9.9 tiled static export renderer rebuild — new ImageExport
//   modules, ProfileLines shader uniforms, and Advanced Linework Settings UI
//   must not be shadowed by the stale shell cache).
//
// 08-Jul-2026 - Version 1.5.0
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-08-1 (force full cache eviction —
//   NetworkFirst now fetches with cache:'no-store' so "network-first" for
//   project.json/masterConfig/HTML can never be quietly satisfied by the
//   browser's own HTTP disk cache; without this, an editor save's fresh R2
//   write could still be shadowed by a stale disk-cached response that no
//   Cache-Storage-level "clear cache" action could ever reach).
//
// 02-Jul-2026 - Version 1.4.1
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-02-2 (force shell cache eviction after
//   the Scene Entourage 2D billboard naming/toggle changes; ValeVision3D shell JS
//   -- Na__UiFeature__ModelToggle__Controls.js and Na__ModelLoader__MultiModel.js --
//   was stuck serving the old "Scene Context" / "SiteEntourage2D" cached copy under
//   the stale-while-revalidate JS/CSS strategy).
//
// 02-Jul-2026 - Version 1.4.0
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-02-1 (force shell cache eviction after
//   the manifest gained "handle_links": "preferred" and an explicit "id": "/";
//   ensures browsers re-read the updated manifest rather than a stale cached copy).
//
// 01-Jul-2026 - Version 1.3.0
// - PWA_SW_VERSION_TOKEN bumped to 2026-07-01-1 (force shell cache eviction after
//   the gallery filter drawer responsive reflow fix; ensures the corrected
//   Na__CoreUi__Styles__App__.css and the FilterPanel drawer styling are served
//   fresh to older/narrow webviews still holding a pre-FilterPanel shell cache).
//
// 26-Jun-2026 - Version 1.2.0
// - PWA_SW_VERSION_TOKEN bumped to 2026-06-26-1 (force shell cache eviction after
//   designer/artist filter feature; ensures FilterControls.jsx, updated Main.jsx,
//   and ProjectLoader loadOptionsListFromFile changes are served fresh to all users).
//
// 25-Jun-2026 - Version 1.1.0
// - PWA_SW_VERSION_TOKEN bumped to 2026-06-25-2 (force shell cache eviction after
//   ProjectLoader R2-first changes; avoids stale double-reload for users).
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Cache Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Cache Identifiers and Limits
    // ------------------------------------------------------------
    const PWA_SW_VERSION_TOKEN              = '2026-07-08-2';                                                                       // <-- Bump to invalidate all caches (model/HDRI/DataLib caching strategy). BUMP THIS whenever shell JS/CSS changes so the old shell cache is force-evicted and users skip the stale double-reload.
    const PWA_SW_CACHE_NAME_SHELL           = `wpwa-shell-${PWA_SW_VERSION_TOKEN}`;                                                 // <-- App shell cache id
    const PWA_SW_CACHE_NAME_THUMBS          = `wpwa-thumbs-${PWA_SW_VERSION_TOKEN}`;                                                // <-- Gallery thumbnail cache id
    const PWA_SW_CACHE_NAME_DATA            = `wpwa-data-${PWA_SW_VERSION_TOKEN}`;                                                  // <-- Project JSON cache id
    const PWA_SW_CACHE_NAME_MODELS          = `wpwa-models-${PWA_SW_VERSION_TOKEN}`;                                                // <-- Model GLB cache id (network-first, offline fallback)
    const PWA_SW_CACHE_PREFIXES_OWNED       = ['wpwa-shell-', 'wpwa-thumbs-', 'wpwa-data-', 'wpwa-models-'];                        // <-- Owned cache prefixes (for cleanup)
    const PWA_SW_THUMBS_MAX_ENTRIES         = 256;                                                                                  // <-- LRU cap on thumbnail cache
    const PWA_SW_MODELS_MAX_ENTRIES         = 36;                                                                                   // <-- LRU cap on model cache (GLBs are large; ~3-6 projects worth)
    const PWA_SW_MODELS_NETWORK_TIMEOUT_MS  = 4000;                                                                                 // <-- Slow-network grace: serve cached model if network exceeds this (fresh copy still refreshes cache in background)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Path Recognition Patterns
    // ------------------------------------------------------------
    const PWA_SW_PATH_PATTERN_THUMBNAIL     = /__Thumbnail__524p__\.(webp|jpg|jpeg|png)(\?.*)?$/i;                                  // <-- Gallery thumbnail filenames
    const PWA_SW_PATH_PATTERN_FULL_IMAGE    = /\/IMG\d{2}(?:_ART\d{2})?__[^\/]+\.(png|jpg|jpeg|svg|gif|webp)(\?.*)?$/i;             // <-- Full-resolution project images
    const PWA_SW_PATH_PATTERN_PROJECT_JSON  = /\/(project|.+masterConfig.*|.+ValeDesignersList.*|.+ValeConceptArtistsList.*|.+Hotkeys.*|Na__AppConfig.*|Na__DataLib__CoreIndex.*)\.json(\?.*)?$/i;   // <-- Data + app config + DataLib SSOT JSONs
    const PWA_SW_PATH_PATTERN_HTML          = /\.(html?)(\?.*)?$/i;                                                                 // <-- HTML documents
    const PWA_SW_PATH_PATTERN_MODEL_GLB     = /\.(glb|gltf)(\?.*)?$/i;                                                              // <-- 3D model files (R2 CDN + local)
    const PWA_SW_PATH_PATTERN_HDRI          = /\.hdr(\?.*)?$/i;                                                                     // <-- HDR environment maps (immutable, filename-versioned)
    const PWA_SW_PATH_PATTERN_SHELL_ASSET   = /\.(css|js|jsx|mjs|webmanifest|ico|png|svg|woff2?)(\?.*)?$/i;                         // <-- App shell assets
    const PWA_SW_APP_FOLDER_TOKENS          = ['/Whitecardopedia/', '/ValeVision3D/', '/assets__CommonApplicationAssets/'];          // <-- Folders we manage
    const PWA_SW_REMOTE_ORIGINS_OWNED       = [                                                                                     // <-- Cross-origin hosts we cache (CORS-enabled)
        'https://cdn.noble-architecture.com',                                                                                       // <-- Cloudflare R2 CDN (model GLBs)
        'https://raw.githubusercontent.com'                                                                                         // <-- DataLib SSOT JSONs (MaxEngine materials)
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | App Shell Pre-cache List (Relative to scope)
    // ------------------------------------------------------------
    const PWA_SW_SHELL_PRECACHE_RELATIVE    = [                                                                                     // <-- Best-effort pre-cache list (relative to scope)
        // WHITECARDOPEDIA SHELL
        'Whitecardopedia/app.html',
        'Whitecardopedia/index.html',
        'Whitecardopedia/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__CoreUi__Styles__Variables__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__CoreUi__Styles__App__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__UiFeature__Styles__ImageCarouselOverlay__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__UiFeature__Styles__Tools__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__UiFeature__Styles__TimeAnalysis__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__UiFeature__Styles__Blockoutopedia__.css',
        'Whitecardopedia/03__Style__AppStylesheets/Na__UiFeature__Styles__PwaInstallability__.css',
        'Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__Manifest__.webmanifest',
        'Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Na__AppInstallability__Icon__192x192.png',
        'Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Na__AppInstallability__Icon__512x512.png',
        // VALEVISION3D SHELL + CONFIG (mandatory for boot; boot hangs without these)
        'ValeVision3D/index.html',
        'ValeVision3D/02__Src__AppModules/02__AppData/Na__AppConfig__Main.json',
        'ValeVision3D/02__Src__AppModules/02__AppData/Na__AppConfig__MaterialsLibrary.json',
        // VALEVISION3D HDRI ENVIRONMENT (MaxEngine reflections ? optimised 1024p, 1.46 MB)
        'ValeVision3D/01__AppAssets__ValeVision/05__AppAssets__SkyDomes/HdriSkydome__RuralLandscape__AutumnField__SunnyDay__OptimisedVersion__1024p__.hdr',
        // VALEVISION3D VENDORED THREE.JS (full dependency graph ? every relative import must be present)
        'ValeVision3D/04__Lib__ThirdParty__Three/three.module.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/controls/OrbitControls.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/lines/Line2.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/lines/LineGeometry.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/lines/LineMaterial.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/lines/LineSegments2.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/lines/LineSegmentsGeometry.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/loaders/GLTFLoader.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/loaders/RGBELoader.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/postprocessing/EffectComposer.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/postprocessing/MaskPass.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/postprocessing/Pass.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/postprocessing/RenderPass.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/postprocessing/ShaderPass.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/shaders/CopyShader.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/shaders/FXAAShader.js',
        'ValeVision3D/04__Lib__ThirdParty__Three/examples/jsm/utils/BufferGeometryUtils.js',
        // VALEVISION3D STYLESHEETS
        'ValeVision3D/03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css',
        'ValeVision3D/03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css',
        'ValeVision3D/03__Style__AppStylesheets/Na__UiFeature__Styles__NavigationToolbar__.css',
        'ValeVision3D/03__Style__AppStylesheets/Na__UiFeature__Styles__DropdownAndToast__.css',
        // VALEVISION3D APP CORE MODULES
        'ValeVision3D/02__Src__AppModules/01__AppCore/Na__AppConfig__Loader.js',
        'ValeVision3D/02__Src__AppModules/01__AppCore/AppCore__DataLib__Loader.js',
        'ValeVision3D/02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js',
        'ValeVision3D/02__Src__AppModules/01__AppCore/Na__AppCore__GpuLifecycle__.js',
        'ValeVision3D/02__Src__AppModules/01__AppCore/Na__AppCore__LoadWatchdog__.js',
        'ValeVision3D/02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js',
        'ValeVision3D/02__Src__AppModules/03__AppUtils/Na__AppUtils__ResilientLoad__.js',
        'ValeVision3D/02__Src__AppModules/04__MathUtils/Na__Math__Units.js',
        // VALEVISION3D RENDER PIPELINE
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/02__Engine__MaxEngine/Na__RenderEffect__DistanceCulling__.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProfileLines__.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__RenderEngine__State.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__RenderLoop__Invalidation.js',
        'ValeVision3D/02__Src__AppModules/05__RenderPipeline/Na__UiFeature__RenderEngine__Controls.js',
        // VALEVISION3D SCENE + MODEL LOADER
        'ValeVision3D/02__Src__AppModules/06__Scene__LightingEffects/Na__Scene__DefaultSceneLighting.js',
        'ValeVision3D/02__Src__AppModules/07__Scene__EnvironmentEffects/Na__RenderEffect__AmbientOcclusion__.js',
        'ValeVision3D/02__Src__AppModules/07__Scene__EnvironmentEffects/Na__RenderEffect__AmbientOcclusion__Shader.js',
        'ValeVision3D/02__Src__AppModules/15__ModelLoader/Na__ModelLoader__MultiModel.js',
        // VALEVISION3D NAVIGATION + CAMERAS
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__Camera__ProjectStartState.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__IpadControls.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__DefaultNavmode__MouseControls.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__NavigationModes__State.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__FlyMode__SystemLogic.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__NavigationHelpPanel__Controls.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__WalkModeControls.js',
        'ValeVision3D/02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js',
        'ValeVision3D/02__Src__AppModules/11__CameraUtils/Na__UiFeature__CameraPosition__Controls.js',
        'ValeVision3D/02__Src__AppModules/11__CameraUtils/Na__UiFeature__CameraLens__Controls.js',
        'ValeVision3D/02__Src__AppModules/11__CameraUtils/Na__UiFeature__SaveCameraSettings.js',
        // VALEVISION3D MATERIALS + INTERACTIONS + SYSTEMS
        'ValeVision3D/02__Src__AppModules/20__System__MaterialsSystem/Na__MaterialsSystem__LibraryLoader.js',
        'ValeVision3D/02__Src__AppModules/20__System__MaterialsSystem/Na__MaterialsSystem__MaterialSwap.js',
        'ValeVision3D/02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js',
        'ValeVision3D/02__Src__AppModules/25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js',
        'ValeVision3D/02__Src__AppModules/26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js',
        'ValeVision3D/02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js',
        'ValeVision3D/02__Src__AppModules/29__System__FogPlaneSystem/Na__FogPlaneSystem__UiControls.js'
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Utilities
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Scope Origin Path Prefix
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Logic__GetScopePathPrefix() {
        const scopeUrl          = new URL(self.registration && self.registration.scope ? self.registration.scope : self.location.href);   // <-- Parse scope URL
        const pathPrefix        = scopeUrl.pathname.endsWith('/') ? scopeUrl.pathname : `${scopeUrl.pathname}/`;                    // <-- Ensure trailing slash
        return pathPrefix;                                                                                                          // <-- Path-only prefix
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Determine if URL is Inside Owned App Folders
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Logic__IsOwnedRequest(requestUrl) {
        try {
            const targetUrl     = new URL(requestUrl);                                                                              // <-- Parse target URL
            if (PWA_SW_REMOTE_ORIGINS_OWNED.indexOf(targetUrl.origin) !== -1) return true;                                          // <-- Trusted CORS-enabled remote hosts (R2 CDN models, DataLib SSOT)
            if (targetUrl.origin !== self.location.origin) return false;                                                            // <-- Skip all other cross-origin
            const pathname      = targetUrl.pathname;                                                                               // <-- Path-only segment
            return PWA_SW_APP_FOLDER_TOKENS.some(token => pathname.indexOf(token) !== -1);                                          // <-- Match against owned folders
        } catch (error) {
            return false;                                                                                                           // <-- Treat parse failures as not-owned
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Classify Request for Cache Routing
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Logic__ClassifyRequest(request) {
        const requestUrl        = request.url || '';                                                                                // <-- Snapshot URL
        if (PWA_SW_PATH_PATTERN_THUMBNAIL.test(requestUrl)) return 'thumbnail';                                                     // <-- Gallery thumbnail
        if (PWA_SW_PATH_PATTERN_FULL_IMAGE.test(requestUrl)) return 'full-image';                                                   // <-- Full-resolution image
        if (PWA_SW_PATH_PATTERN_MODEL_GLB.test(requestUrl)) return 'model';                                                         // <-- 3D model GLB/GLTF
        if (PWA_SW_PATH_PATTERN_HDRI.test(requestUrl)) return 'hdri';                                                               // <-- HDR environment map
        if (PWA_SW_PATH_PATTERN_PROJECT_JSON.test(requestUrl)) return 'data';                                                       // <-- Project / config / DataLib JSON
        if (PWA_SW_PATH_PATTERN_HTML.test(requestUrl)) return 'html';                                                               // <-- HTML document
        if (PWA_SW_PATH_PATTERN_SHELL_ASSET.test(requestUrl)) return 'shell';                                                       // <-- Shell asset
        return 'other';                                                                                                             // <-- Fall through
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Trim Cache to Maximum Entry Count
    // ---------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Logic__TrimCacheLru(cacheName, maxEntries) {
        try {
            const cacheInstance = await caches.open(cacheName);                                                                     // <-- Open cache
            const allRequests   = await cacheInstance.keys();                                                                       // <-- List entries
            const overflowCount = allRequests.length - maxEntries;                                                                  // <-- Compute overflow
            if (overflowCount <= 0) return;                                                                                         // <-- Nothing to do

            for (let entryIndex = 0; entryIndex < overflowCount; entryIndex += 1) {
                await cacheInstance.delete(allRequests[entryIndex]);                                                                // <-- Drop oldest entries first
            }
        } catch (error) {
            console.warn('Whitecardopedia PWA SW LRU trim failed:', error);                                                         // <-- Non-blocking log
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cache Strategies
// -----------------------------------------------------------------------------

    // FUNCTION | Cache First Strategy
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Logic__CacheFirst(request, cacheName) {
        const cacheInstance     = await caches.open(cacheName);                                                                     // <-- Open named cache
        const cachedResponse    = await cacheInstance.match(request);                                                               // <-- Lookup cached entry
        if (cachedResponse) return cachedResponse;                                                                                  // <-- Cache hit -> return immediately

        try {
            const networkResponse = await fetch(request);                                                                           // <-- Network fetch
            if (networkResponse && networkResponse.ok) {
                cacheInstance.put(request, networkResponse.clone()).catch(() => {});                                                // <-- Persist clone (best-effort)
            }
            return networkResponse;                                                                                                 // <-- Return live response
        } catch (error) {
            return Response.error();                                                                                                // <-- Fail closed when offline + uncached
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Stale While Revalidate Strategy
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Logic__StaleWhileRevalidate(request, cacheName) {
        const cacheInstance     = await caches.open(cacheName);                                                                     // <-- Open named cache
        const cachedResponse    = await cacheInstance.match(request);                                                               // <-- Cached entry (may be undefined)

        const networkPromise    = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
                cacheInstance.put(request, networkResponse.clone()).catch(() => {});                                                // <-- Refresh cache in background
            }
            return networkResponse;                                                                                                 // <-- Return live response
        }).catch(() => null);                                                                                                       // <-- Swallow network errors

        return cachedResponse || (await networkPromise) || Response.error();                                                        // <-- Prefer cache, fallback to network, then error
    }
    // ---------------------------------------------------------------


    // FUNCTION | Network First Strategy
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirst(request, cacheName) {
        const cacheInstance     = await caches.open(cacheName);                                                                     // <-- Open named cache

        try {
            // cache:'no-store' overrides the captured Request's own cache mode so a
            // "network-first" strategy can never be quietly satisfied by the browser's
            // HTTP disk cache — it must genuinely hit the network (or origin edge cache
            // honouring its own Cache-Control) every time. Without this, a stale
            // project.json/masterConfig response could sit in the browser's HTTP cache
            // and keep getting written straight back into wpwa-data-* as if it were fresh.
            const networkResponse = await fetch(request, { cache: 'no-store' });                                                    // <-- Try network first, bypassing the browser HTTP cache
            if (networkResponse && networkResponse.ok) {
                cacheInstance.put(request, networkResponse.clone()).catch(() => {});                                                // <-- Refresh cache
            }
            return networkResponse;                                                                                                 // <-- Return live response
        } catch (error) {
            const cachedResponse  = await cacheInstance.match(request);                                                             // <-- Lookup fallback
            if (cachedResponse) return cachedResponse;                                                                              // <-- Serve stale data when offline
            return Response.error();                                                                                                // <-- Fail closed when uncached
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Network First With Slow-Network Grace (Model GLBs)
    // ------------------------------------------------------------
    // Behaviour contract (model caching strategy):
    //   - Good connection  : fresh network copy always wins; cache refreshed.
    //   - Slow connection  : if the network exceeds the grace timeout AND a
    //                        cached copy exists, the cached model is served
    //                        immediately. The in-flight network fetch still
    //                        completes and refreshes the cache in background,
    //                        so the NEXT load gets the fresh copy.
    //   - Offline          : cached copy served; error only when uncached.
    //   - Cache writes are LRU-trimmed so large GLBs cannot grow unbounded.
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirstWithGrace(request, cacheName, graceTimeoutMs, maxEntries) {
        const cacheInstance     = await caches.open(cacheName);                                                                     // <-- Open named cache
        const cachedResponse    = await cacheInstance.match(request);                                                               // <-- Existing cached copy (may be undefined)

        const networkPromise    = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
                cacheInstance.put(request, networkResponse.clone()).then(() => {
                    Whitecardopedia__Pwa__ServiceWorker__Logic__TrimCacheLru(cacheName, maxEntries);                                // <-- LRU trim after successful put only
                }).catch(() => {});                                                                                                 // <-- Quota failures must not break response
            }
            return networkResponse;                                                                                                 // <-- Live response
        });

        if (!cachedResponse) {
            return networkPromise.catch(() => Response.error());                                                                    // <-- No fallback available; network is the only source
        }

        const graceTimer        = new Promise((resolve) => setTimeout(() => resolve('grace-expired'), graceTimeoutMs));            // <-- Slow-network grace window
        const raceWinner        = await Promise.race([networkPromise.catch(() => 'network-failed'), graceTimer]);                  // <-- First settled outcome wins

        if (raceWinner === 'grace-expired' || raceWinner === 'network-failed') {
            return cachedResponse;                                                                                                  // <-- Serve cache; background fetch still refreshes for next load
        }
        return raceWinner;                                                                                                          // <-- Fresh network response (good connection path)
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lifecycle Event Handlers
// -----------------------------------------------------------------------------

    // EVENT HANDLER | Service Worker Install
    // ------------------------------------------------------------
    self.addEventListener('install', (installEvent) => {
        installEvent.waitUntil((async () => {
            try {
                const shellCache    = await caches.open(PWA_SW_CACHE_NAME_SHELL);                                                   // <-- Open shell cache
                const scopePrefix   = Whitecardopedia__Pwa__ServiceWorker__Logic__GetScopePathPrefix();                             // <-- Resolve scope prefix
                const absoluteUrls  = PWA_SW_SHELL_PRECACHE_RELATIVE.map(relative => `${scopePrefix}${relative}`);                  // <-- Build absolute URLs

                await Promise.all(absoluteUrls.map(async (absoluteUrl) => {
                    try {
                        const response = await fetch(absoluteUrl, { cache: 'reload' });                                             // <-- Force fresh fetch
                        if (response && response.ok) {
                            await shellCache.put(absoluteUrl, response.clone());                                                    // <-- Best-effort precache
                        }
                    } catch (resourceError) {
                        // Silent: missing precache entries should not fail the install
                    }
                }));
            } catch (error) {
                console.warn('Whitecardopedia PWA SW install precache failed:', error);                                             // <-- Non-blocking log
            }
            await self.skipWaiting();                                                                                               // <-- Activate immediately
        })());
    });
    // ---------------------------------------------------------------


    // EVENT HANDLER | Service Worker Activate
    // ------------------------------------------------------------
    self.addEventListener('activate', (activateEvent) => {
        activateEvent.waitUntil((async () => {
            try {
                const allCacheNames = await caches.keys();                                                                          // <-- Enumerate all caches
                await Promise.all(allCacheNames.map(async (cacheName) => {
                    const isOwnedCache  = PWA_SW_CACHE_PREFIXES_OWNED.some(prefix => cacheName.startsWith(prefix));                 // <-- Owned caches only
                    if (!isOwnedCache) return;                                                                                      // <-- Skip foreign caches
                    if (cacheName === PWA_SW_CACHE_NAME_SHELL) return;                                                              // <-- Keep current shell cache
                    if (cacheName === PWA_SW_CACHE_NAME_THUMBS) return;                                                             // <-- Keep current thumbs cache
                    if (cacheName === PWA_SW_CACHE_NAME_DATA) return;                                                               // <-- Keep current data cache
                    await caches.delete(cacheName);                                                                                 // <-- Delete superseded version
                }));
            } catch (error) {
                console.warn('Whitecardopedia PWA SW activate cleanup failed:', error);                                             // <-- Non-blocking log
            }
            await self.clients.claim();                                                                                             // <-- Take control of open clients
        })());
    });
    // ---------------------------------------------------------------


    // EVENT HANDLER | Fetch Routing
    // ------------------------------------------------------------
    self.addEventListener('fetch', (fetchEvent) => {
        const request           = fetchEvent.request;                                                                               // <-- Snapshot request
        if (request.method !== 'GET') return;                                                                                       // <-- Only handle GET
        if (!Whitecardopedia__Pwa__ServiceWorker__Logic__IsOwnedRequest(request.url)) return;                                       // <-- Skip non-owned requests

        const classification    = Whitecardopedia__Pwa__ServiceWorker__Logic__ClassifyRequest(request);                             // <-- Classify request

        if (classification === 'full-image') return;                                                                                // <-- Always network for full-res images

        if (classification === 'thumbnail') {
            fetchEvent.respondWith((async () => {
                const cacheInstance = await caches.open(PWA_SW_CACHE_NAME_THUMBS);
                const cachedThumb   = await cacheInstance.match(request);   // <-- Serve cache immediately if present

                // STALE-WHILE-REVALIDATE | Always refresh in the background so a re-synced
                // thumbnail (same URL) is picked up on the next view rather than locked forever.
                const networkRefresh = fetch(request).then((networkThumb) => {
                    if (networkThumb && networkThumb.ok) {
                        cacheInstance.put(request, networkThumb.clone()).then(() => {
                            // LRU trim only runs after a successful put (L3 fix: not on every request)
                            Whitecardopedia__Pwa__ServiceWorker__Logic__TrimCacheLru(PWA_SW_CACHE_NAME_THUMBS, PWA_SW_THUMBS_MAX_ENTRIES);
                        }).catch(() => {});
                    }
                    return networkThumb;
                }).catch(() => null);                                        // <-- Network failure: keep the cached copy

                if (cachedThumb) return cachedThumb;                         // <-- Fast path: cache now, refresh in background
                const networkThumb = await networkRefresh;                   // <-- Cache miss: wait for the network
                return networkThumb || Response.error();
            })());
            return;
        }

        if (classification === 'model') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirstWithGrace(
                request, PWA_SW_CACHE_NAME_MODELS, PWA_SW_MODELS_NETWORK_TIMEOUT_MS, PWA_SW_MODELS_MAX_ENTRIES                      // <-- Fresh on good connection, cache on slow/offline
            ));
            return;
        }

        if (classification === 'hdri') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__CacheFirst(request, PWA_SW_CACHE_NAME_SHELL));       // <-- Immutable filename-versioned asset; one download per SW version
            return;
        }

        if (classification === 'data') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirst(request, PWA_SW_CACHE_NAME_DATA));      // <-- Network-first JSON (project.json + Na__AppConfig + DataLib SSOT)
            return;
        }

        if (classification === 'html') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirst(request, PWA_SW_CACHE_NAME_SHELL));     // <-- HTML: network-first to prevent stale/module mismatch (C4 fix)
            return;
        }

        if (classification === 'shell') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__StaleWhileRevalidate(request, PWA_SW_CACHE_NAME_SHELL)); // <-- JS/CSS: stale-while-revalidate (fast, background refresh)
            return;
        }
    });
    // ---------------------------------------------------------------


    // EVENT HANDLER | Message-Based Cache Reset (Diagnostic)
    // ------------------------------------------------------------
    self.addEventListener('message', (messageEvent) => {
        if (!messageEvent.data || messageEvent.data.type !== 'wpwa-clear-caches') return;                                           // <-- Ignore unrelated messages

        messageEvent.waitUntil((async () => {
            try {
                const ownedCaches   = (await caches.keys()).filter(cacheName => PWA_SW_CACHE_PREFIXES_OWNED.some(prefix => cacheName.startsWith(prefix))); // <-- Owned caches
                await Promise.all(ownedCaches.map(cacheName => caches.delete(cacheName)));                                          // <-- Drop all
                if (messageEvent.source && messageEvent.source.postMessage) {
                    messageEvent.source.postMessage({ type: 'wpwa-cleared', success: true });                                       // <-- Acknowledge
                }
            } catch (error) {
                if (messageEvent.source && messageEvent.source.postMessage) {
                    messageEvent.source.postMessage({ type: 'wpwa-cleared', success: false, error: String(error) });                // <-- Report failure
                }
            }
        })());
    });
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
