// =============================================================================
// VGHLANTERN - PWA SERVICE WORKER
// =============================================================================
//
// FILE       : Na__ServiceWorker__VghLantern.js
// NAMESPACE  : VghLantern
// MODULE     : VghLantern__Pwa__ServiceWorker
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Caching brain of the Lantern Designer PWA
// CREATED    : 31-Jul-2026
//
// DESCRIPTION:
// - Lives at the app folder root so its scope covers the whole application and
//   nothing above it. GitHub Pages cannot send a Service-Worker-Allowed header,
//   so the file's own location is the only way to set a broad scope.
// - The filename is retained from the previous installability stub deliberately.
//   Registering a differently named worker would leave the old registration in
//   place as an orphan rather than replacing it.
// - Cache buckets:
//     * vghlantern-shell-vN : HTML, CSS, JS, vendor builds, manifest, icons
//     * vghlantern-data-vN  : component index, profile index, app config JSON
// - Strategy by class:
//     * /api/*   -> bypassed entirely. The local Flask routes carry live project
//                   state and health checks, and a cached answer there would be
//                   actively wrong.
//     * HTML     -> network-first. Prevents a stale document from loading against
//                   a newer module graph.
//     * data     -> network-first with cache:'no-store' on the network leg, so a
//                   network-first read can never be quietly satisfied by the
//                   browser's own HTTP disk cache.
//     * shell    -> stale-while-revalidate. Fast paint, background refresh.
// - Precache is deliberately minimal: the document, the stylesheet index, the two
//   vendor builds the app actually loads, and the boot-critical JSON. Everything
//   else enters the cache through stale-while-revalidate as it is first requested,
//   so the app is fully offline after one visit with no hand-maintained file list
//   to keep in step with the source tree.
// - Bumping PWA_SW_VERSION_TOKEN invalidates every bucket on the next activate.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 31-Jul-2026 - Version 1.0.0
// - Replaced the previous no-op installability stub with a real caching worker.
// - Retained 'na-vghlantern-cache-' in the owned prefix list so any cache left by
//   the stub is cleaned up on first activate of this worker.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Cache Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Cache Identifiers
    // ------------------------------------------------------------
    const PWA_SW_VERSION_TOKEN          = '2026-07-31-1';                                                          // <-- Bump to invalidate every cache bucket
    const PWA_SW_CACHE_NAME_SHELL       = `vghlantern-shell-${PWA_SW_VERSION_TOKEN}`;                              // <-- App shell cache id
    const PWA_SW_CACHE_NAME_DATA        = `vghlantern-data-${PWA_SW_VERSION_TOKEN}`;                               // <-- Application data cache id
    const PWA_SW_CACHE_PREFIXES_OWNED   = ['vghlantern-shell-', 'vghlantern-data-', 'na-vghlantern-cache-'];       // <-- Owned prefixes, including the superseded stub prefix
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Message Tokens
    // ------------------------------------------------------------
    const PWA_SW_MESSAGE_CLEAR_CACHES   = 'vghlantern-clear-caches';                                               // <-- Cache reset request token
    const PWA_SW_MESSAGE_CLEARED        = 'vghlantern-cleared';                                                    // <-- Cache reset acknowledgement token
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Path Recognition Patterns
    // ------------------------------------------------------------
    const PWA_SW_PATH_PATTERN_API       = /\/api\//i;                                                              // <-- Local Flask API routes, never cached
    const PWA_SW_PATH_PATTERN_HTML      = /\.html?(\?.*)?$/i;                                                       // <-- HTML documents
    const PWA_SW_PATH_PATTERN_DATA      = /\.json(\?.*)?$/i;                                                        // <-- Every JSON file. All JSON in this app is config or library data, never a bulk asset, so treating the whole extension as network-first is both simpler than an allow-list and safer during development where an edited config must never be shadowed by a cached copy
    const PWA_SW_PATH_PATTERN_SHELL     = /\.(css|js|mjs|cjs|webmanifest|ico|png|jpe?g|svg|gif|webp|woff2?|ttf|otf)(\?.*)?$/i; // <-- App shell assets
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Shell Pre-cache List, Relative to Scope
    // ------------------------------------------------------------
    const PWA_SW_SHELL_PRECACHE_RELATIVE = [                                                                       // <-- Best-effort critical path only
        'VghLantern__App__.html',
        '03__Style__AppStylesheets/VghLantern__CoreUi__Styles__Index__.css',
        '04__Src__Dependencies__VersionLocked/01__Vendor__ThreeJs__v0.184.0/build/three.module.js',
        '04__Src__Dependencies__VersionLocked/05__Vendor__JsPdf__v4.1.0/jspdf.umd.js',
        '02__Src__AppModules/62__Feature__AppInstallability/VghLantern__Pwa__Manifest__.webmanifest',
        '01__AppAssets__VghLantern/Na__VghLanternApp__Icon__192x192.png',
        '01__AppAssets__VghLantern/Na__VghLanternApp__Icon__512x512.png',
        '01__AppAssets__VghLantern/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png'
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Data Pre-cache List, Relative to Scope
    // ------------------------------------------------------------
    const PWA_SW_DATA_PRECACHE_RELATIVE = [                                                                        // <-- Boot-critical JSON, the app stalls without these
        '02__Src__AppModules/02__AppData/VghLantern__AppConfig__Main__.json',
        '02__Src__AppModules/02__AppData/VghLantern__AppData__Hotkeys__Main__.json',
        '05__Data__LanternComponentLibrary/VghLantern__ComponentDataIndex__.json',
        '06__Data__LanternProfileLibrary/VghLantern__ProfileDataIndex__.json'
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Utilities
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Scope Path Prefix
    // ---------------------------------------------------------------
    function VghLantern__Pwa__ServiceWorker__GetScopePathPrefix() {
        const scopeUrl      = new URL(self.registration && self.registration.scope ? self.registration.scope : self.location.href); // <-- Parse the scope URL
        return scopeUrl.pathname.endsWith('/') ? scopeUrl.pathname : `${scopeUrl.pathname}/`;                      // <-- Ensure a trailing slash
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Determine Whether a Request Belongs to This App
    // ---------------------------------------------------------------
    // Same-origin and inside the registration scope. Anything else, including the
    // shared assets folder that sits above the app on GitHub Pages, is left to the
    // network so the worker never answers for files it does not own.
    // ---------------------------------------------------------------
    function VghLantern__Pwa__ServiceWorker__IsOwnedRequest(requestUrl) {
        try {
            const targetUrl = new URL(requestUrl);                                                                 // <-- Parse the target URL
            if (targetUrl.origin !== self.location.origin) return false;                                           // <-- Skip cross-origin entirely
            return targetUrl.pathname.indexOf(VghLantern__Pwa__ServiceWorker__GetScopePathPrefix()) === 0;         // <-- Must sit inside the scope
        } catch (parseError) {
            return false;                                                                                          // <-- Treat parse failures as not owned
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Classify a Request for Cache Routing
    // ---------------------------------------------------------------
    function VghLantern__Pwa__ServiceWorker__ClassifyRequest(request) {
        const requestUrl    = request.url || '';                                                                   // <-- Snapshot the URL
        if (PWA_SW_PATH_PATTERN_API.test(requestUrl)) return 'api';                                                // <-- Live server routes
        if (PWA_SW_PATH_PATTERN_HTML.test(requestUrl)) return 'html';                                              // <-- HTML document
        if (PWA_SW_PATH_PATTERN_DATA.test(requestUrl)) return 'data';                                              // <-- Application data JSON
        if (PWA_SW_PATH_PATTERN_SHELL.test(requestUrl)) return 'shell';                                            // <-- Shell asset
        return 'other';                                                                                            // <-- Fall through to the network
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Pre-cache a List of Scope-Relative Paths
    // ---------------------------------------------------------------
    async function VghLantern__Pwa__ServiceWorker__PrecacheList(cacheName, relativePaths) {
        const cacheInstance = await caches.open(cacheName);                                                        // <-- Open the named cache
        const scopePrefix   = VghLantern__Pwa__ServiceWorker__GetScopePathPrefix();                                // <-- Resolve the scope prefix

        await Promise.all(relativePaths.map(async (relativePath) => {
            const absoluteUrl = `${scopePrefix}${relativePath}`;                                                   // <-- Build the absolute path
            try {
                const response = await fetch(absoluteUrl, { cache: 'reload' });                                    // <-- Force a fresh fetch
                if (response && response.ok) {
                    await cacheInstance.put(absoluteUrl, response.clone());                                        // <-- Best-effort precache
                }
            } catch (resourceError) {
                // Silent: a missing precache entry must never fail the install
            }
        }));
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cache Strategies
// -----------------------------------------------------------------------------

    // FUNCTION | Stale While Revalidate Strategy
    // ------------------------------------------------------------
    async function VghLantern__Pwa__ServiceWorker__StaleWhileRevalidate(request, cacheName) {
        const cacheInstance  = await caches.open(cacheName);                                                       // <-- Open the named cache
        const cachedResponse = await cacheInstance.match(request);                                                 // <-- Cached entry, may be undefined

        const networkPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
                cacheInstance.put(request, networkResponse.clone()).catch(() => {});                               // <-- Refresh the cache in the background
            }
            return networkResponse;                                                                                // <-- Live response
        }).catch(() => null);                                                                                      // <-- Swallow network errors

        return cachedResponse || (await networkPromise) || Response.error();                                       // <-- Cache, then network, then fail
    }
    // ---------------------------------------------------------------


    // FUNCTION | Network First Strategy
    // ------------------------------------------------------------
    // cache:'no-store' overrides the captured request's own cache mode so a
    // network-first read genuinely reaches the network rather than being satisfied
    // by the browser's HTTP disk cache and written back as though it were fresh.
    // ------------------------------------------------------------
    async function VghLantern__Pwa__ServiceWorker__NetworkFirst(request, cacheName) {
        const cacheInstance = await caches.open(cacheName);                                                        // <-- Open the named cache

        try {
            const networkResponse = await fetch(request, { cache: 'no-store' });                                   // <-- Network first, bypassing the HTTP cache
            if (networkResponse && networkResponse.ok) {
                cacheInstance.put(request, networkResponse.clone()).catch(() => {});                               // <-- Refresh the cache
            }
            return networkResponse;                                                                                // <-- Live response
        } catch (networkError) {
            const cachedResponse = await cacheInstance.match(request);                                             // <-- Look up the offline fallback
            if (cachedResponse) return cachedResponse;                                                             // <-- Serve the cached copy
            return Response.error();                                                                               // <-- Fail closed when uncached
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
                await VghLantern__Pwa__ServiceWorker__PrecacheList(PWA_SW_CACHE_NAME_SHELL, PWA_SW_SHELL_PRECACHE_RELATIVE); // <-- Critical shell
                await VghLantern__Pwa__ServiceWorker__PrecacheList(PWA_SW_CACHE_NAME_DATA, PWA_SW_DATA_PRECACHE_RELATIVE);   // <-- Boot-critical data
            } catch (precacheError) {
                console.warn('VghLantern PWA service worker precache failed:', precacheError);                     // <-- Non-blocking log
            }
            await self.skipWaiting();                                                                              // <-- Activate immediately
        })());
    });
    // ---------------------------------------------------------------


    // EVENT HANDLER | Service Worker Activate
    // ------------------------------------------------------------
    self.addEventListener('activate', (activateEvent) => {
        activateEvent.waitUntil((async () => {
            try {
                const allCacheNames = await caches.keys();                                                         // <-- Enumerate every cache
                await Promise.all(allCacheNames.map(async (cacheName) => {
                    const isOwnedCache = PWA_SW_CACHE_PREFIXES_OWNED.some(prefix => cacheName.startsWith(prefix)); // <-- Owned caches only
                    if (!isOwnedCache) return;                                                                     // <-- Leave foreign caches alone
                    if (cacheName === PWA_SW_CACHE_NAME_SHELL) return;                                             // <-- Keep the current shell cache
                    if (cacheName === PWA_SW_CACHE_NAME_DATA) return;                                              // <-- Keep the current data cache
                    await caches.delete(cacheName);                                                                // <-- Delete the superseded version
                }));
            } catch (cleanupError) {
                console.warn('VghLantern PWA service worker activate cleanup failed:', cleanupError);              // <-- Non-blocking log
            }
            await self.clients.claim();                                                                            // <-- Take control of open clients
        })());
    });
    // ---------------------------------------------------------------


    // EVENT HANDLER | Fetch Routing
    // ------------------------------------------------------------
    self.addEventListener('fetch', (fetchEvent) => {
        const request = fetchEvent.request;                                                                        // <-- Snapshot the request
        if (request.method !== 'GET') return;                                                                      // <-- Only GET is cacheable

        const classification = VghLantern__Pwa__ServiceWorker__ClassifyRequest(request);                           // <-- Classify before the ownership test

        if (classification === 'api') return;                                                                      // <-- Never intercept live server routes
        if (!VghLantern__Pwa__ServiceWorker__IsOwnedRequest(request.url)) return;                                  // <-- Skip anything outside the app scope

        if (classification === 'html') {
            fetchEvent.respondWith(VghLantern__Pwa__ServiceWorker__NetworkFirst(request, PWA_SW_CACHE_NAME_SHELL)); // <-- Fresh document, cached offline fallback
            return;
        }

        if (classification === 'data') {
            fetchEvent.respondWith(VghLantern__Pwa__ServiceWorker__NetworkFirst(request, PWA_SW_CACHE_NAME_DATA));  // <-- Fresh data, cached offline fallback
            return;
        }

        if (classification === 'shell') {
            fetchEvent.respondWith(VghLantern__Pwa__ServiceWorker__StaleWhileRevalidate(request, PWA_SW_CACHE_NAME_SHELL)); // <-- Fast paint, background refresh
            return;
        }
    });
    // ---------------------------------------------------------------


    // EVENT HANDLER | Message-Based Cache Reset
    // ------------------------------------------------------------
    self.addEventListener('message', (messageEvent) => {
        if (!messageEvent.data || messageEvent.data.type !== PWA_SW_MESSAGE_CLEAR_CACHES) return;                  // <-- Ignore unrelated messages

        messageEvent.waitUntil((async () => {
            try {
                const ownedCaches = (await caches.keys()).filter(cacheName =>
                    PWA_SW_CACHE_PREFIXES_OWNED.some(prefix => cacheName.startsWith(prefix)));                     // <-- Owned caches only
                await Promise.all(ownedCaches.map(cacheName => caches.delete(cacheName)));                         // <-- Drop them all
                if (messageEvent.source && messageEvent.source.postMessage) {
                    messageEvent.source.postMessage({ type: PWA_SW_MESSAGE_CLEARED, success: true });              // <-- Acknowledge
                }
            } catch (clearError) {
                if (messageEvent.source && messageEvent.source.postMessage) {
                    messageEvent.source.postMessage({ type: PWA_SW_MESSAGE_CLEARED, success: false, error: String(clearError) }); // <-- Report the failure
                }
            }
        })());
    });
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
