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
//     * pwa-thumbs-vN : 524p gallery thumbnail images (cache-first, capped)
//     * pwa-data-vN   : project.json / masterConfig.json (network-first)
// - Full-resolution IMG##__* project images are intentionally NOT cached so
//   the project view always shows the latest delivered art.
// - Bumping VERSION_TOKEN below invalidates everything via the activate
//   cleanup step.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Cache Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Cache Identifiers and Limits
    // ------------------------------------------------------------
    const PWA_SW_VERSION_TOKEN              = '2026-06-11-1';                                                                       // <-- Bump to invalidate all caches (PWA stability fix)
    const PWA_SW_CACHE_NAME_SHELL           = `wpwa-shell-${PWA_SW_VERSION_TOKEN}`;                                                 // <-- App shell cache id
    const PWA_SW_CACHE_NAME_THUMBS          = `wpwa-thumbs-${PWA_SW_VERSION_TOKEN}`;                                                // <-- Gallery thumbnail cache id
    const PWA_SW_CACHE_NAME_DATA            = `wpwa-data-${PWA_SW_VERSION_TOKEN}`;                                                  // <-- Project JSON cache id
    const PWA_SW_CACHE_PREFIXES_OWNED       = ['wpwa-shell-', 'wpwa-thumbs-', 'wpwa-data-'];                                        // <-- Owned cache prefixes (for cleanup)
    const PWA_SW_THUMBS_MAX_ENTRIES         = 256;                                                                                  // <-- LRU cap on thumbnail cache
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Path Recognition Patterns
    // ------------------------------------------------------------
    const PWA_SW_PATH_PATTERN_THUMBNAIL     = /__Thumbnail__524p__\.(webp|jpg|jpeg|png)(\?.*)?$/i;                                  // <-- Gallery thumbnail filenames
    const PWA_SW_PATH_PATTERN_FULL_IMAGE    = /\/IMG\d{2}(?:_ART\d{2})?__[^\/]+\.(png|jpg|jpeg|svg|gif|webp)(\?.*)?$/i;             // <-- Full-resolution project images
    const PWA_SW_PATH_PATTERN_PROJECT_JSON  = /\/(project|.+masterConfig.*|.+ValeDesignersList.*|.+ValeConceptArtistsList.*|.+Hotkeys.*|Na__AppConfig.*)\.json(\?.*)?$/i;   // <-- Data + app config JSONs
    const PWA_SW_PATH_PATTERN_HTML          = /\.(html?)(\?.*)?$/i;                                                                 // <-- HTML documents
    const PWA_SW_PATH_PATTERN_SHELL_ASSET   = /\.(css|js|jsx|mjs|webmanifest|ico|png|svg|woff2?)(\?.*)?$/i;                         // <-- App shell assets
    const PWA_SW_APP_FOLDER_TOKENS          = ['/Whitecardopedia/', '/ValeVision3D/', '/assets__CommonApplicationAssets/'];          // <-- Folders we manage
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
            if (targetUrl.origin !== self.location.origin) return false;                                                            // <-- Skip cross-origin
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
        if (PWA_SW_PATH_PATTERN_PROJECT_JSON.test(requestUrl)) return 'data';                                                       // <-- Project / config JSON
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
            const networkResponse = await fetch(request);                                                                           // <-- Try network first
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
                const cachedThumb   = await cacheInstance.match(request);   // <-- Check cache first
                if (cachedThumb) return cachedThumb;                         // <-- Cache hit: no LRU work needed

                try {
                    const networkThumb = await fetch(request);
                    if (networkThumb && networkThumb.ok) {
                        cacheInstance.put(request, networkThumb.clone()).then(() => {
                            // LRU trim only runs after a successful put (L3 fix: not on every request)
                            Whitecardopedia__Pwa__ServiceWorker__Logic__TrimCacheLru(PWA_SW_CACHE_NAME_THUMBS, PWA_SW_THUMBS_MAX_ENTRIES);
                        }).catch(() => {});
                    }
                    return networkThumb;
                } catch (error) {
                    return Response.error();
                }
            })());
            return;
        }

        if (classification === 'data') {
            fetchEvent.respondWith(Whitecardopedia__Pwa__ServiceWorker__Logic__NetworkFirst(request, PWA_SW_CACHE_NAME_DATA));      // <-- Network-first JSON (project.json + Na__AppConfig JSONs)
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
