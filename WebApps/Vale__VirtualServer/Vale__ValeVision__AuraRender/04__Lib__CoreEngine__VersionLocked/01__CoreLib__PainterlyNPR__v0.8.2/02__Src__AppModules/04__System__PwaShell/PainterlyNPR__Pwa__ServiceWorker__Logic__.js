/* =============================================================================
   PAINTERLYNPR - PWA SHELL | SERVICE WORKER - LOGIC
   =============================================================================

   FILE       : PainterlyNPR__Pwa__ServiceWorker__Logic__.js
   NAMESPACE  : PainterlyNPR
   MODULE     : PwaShell - ServiceWorker - Logic
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Keep every file the app needs in a cache of its own, so PainterlyNPR
                opens and draws with no server and no network
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Loaded by Na__Pwa__ServiceWorker__.js at the app's root (importScripts): a
     worker's scope is the folder it is served from, so the stub sits at the root
     and the logic lives here with the rest of the shell, as TrueVision's does.
   - INSTALL: reads PainterlyNPR__Pwa__PrecacheList__.json (written by
     60__Dev__WebBuildUtils/PainterlyNPR__BuildUtil__PrecacheList__.py) and caches
     every file in it - the page, the stylesheets, every module and config, the
     icons and the manifest. A file that fails fails the install, so a half-cached
     app never takes over.
   - FETCH: network first, every time, on this computer (localhost): an edit reaches
     the page on the next reload, and the copy in the cache is refreshed as it goes.
     Away from localhost the page and the JSON stay network first; the rest is served
     from the cache and refreshed behind it (stale while revalidate).
   - /api/ is never cached: saves go to the local server or nowhere.
   - ACTIVATE: deletes only caches with this app's prefix and an older version token
     - the origin may be shared with other apps - then claims the open pages.

   ---------------------------------------------------------------------------

   VERSIONING

   PWA_SW_VERSION_TOKEN names the cache. Change it with every release that changes
   the shell (DEVELOPMENT LOG below): the new worker installs a fresh cache and the
   old one is deleted when it activates.

   ---------------------------------------------------------------------------

   DEVELOPMENT LOG:
   30-Oct-2026 - Version 1.0.0 (app v0.5.0)
   - First worker: precache from the list, network first on localhost, stale while
     revalidate elsewhere, /api/ never cached.
   30-Oct-2026 - token 2026-10-30-04 (app v0.6.0)
   - The shell changed: the Assets drawer (82), the asset factory (88), the asset
     library's modules (16) and the work mode's switch. The library itself
     (12__Data__AssetLibrary) is data, fetched and kept as it is used.
   30-Oct-2026 - token 2026-10-30-05 (app v0.7.1)
   - The shell changed: the refresh guard (85, its module and its stylesheet
     part), Shift + R on the work mode's switch. A later release that changes
     the shell again bumps past this, never back.
   30-Oct-2026 - token 2026-10-30-06 (app v0.7.4)
   - The shell changed: undo and redo (84__System__UndoHistory, its modules,
     config and stylesheet part) and its two arrows in the page's meta strip.
   30-Oct-2026 - token 2026-10-30-07 (app v0.7.4, with v0.7.0 finished)
   - The shell changed: v0.7.0's materials, selection and right-click menu
     finished (17__Scene__MaterialAssignment, 80's ContextMenu, 82's Material
     tab, 83__Hud__SceneEditing). The material library's register and swatches
     (07__Data__MaterialRecipes) are data, fetched and kept as they are used.

   ============================================================================= */

(function () {
    'use strict';

// =============================================================================
// REGION | Service Worker - Logic
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Cache, the List and What Is Never Cached
    // ------------------------------------------------------------
    const PWA_SW_VERSION_TOKEN  =  '2026-10-30-07';                          // <-- Bump with every release that changes the shell
    const CACHE_PREFIX          =  'painterlynpr-shell-';
    const CACHE_NAME            =  CACHE_PREFIX + PWA_SW_VERSION_TOKEN;
    const PRECACHE_LIST         =  '02__Src__AppModules/04__System__PwaShell/PainterlyNPR__Pwa__PrecacheList__.json';
    const LIST_ROOT_KEY         =  'PainterlyNPR__Pwa__PrecacheList';
    const NEVER_CACHE           =  ['/api/'];                                // <-- Saves go to the server or nowhere
    const LOCAL_HOSTS           =  /^(localhost|127\.0\.0\.1|\[::1\])$/;
    const SCOPE                 =  self.registration.scope;                  // <-- The app's root, with its trailing slash
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Install and Activate
// -----------------------------------------------------------------------------

    // EVENT HANDLER | Install - every file on the list, or none
    // ------------------------------------------------------------
    self.addEventListener('install', (event) => {
        event.waitUntil((async () => {
            const response  =  await fetch(new URL(PRECACHE_LIST, SCOPE), { cache: 'no-store' });
            if (!response.ok) throw new Error('[PainterlyNPR PWA] The precache list did not load: ' + response.status);
            const list   =  await response.json();
            const files  =  list[LIST_ROOT_KEY][LIST_ROOT_KEY + '__Files'].Files;
            const cache  =  await caches.open(CACHE_NAME);
            await cache.addAll(files.map(path => new Request(new URL(path, SCOPE), { cache: 'no-store' })));
            await self.skipWaiting();
        })());
    });
    // ------------------------------------------------------------


    // EVENT HANDLER | Activate - this app's older caches deleted, the open pages claimed
    // ------------------------------------------------------------
    self.addEventListener('activate', (event) => {
        event.waitUntil((async () => {
            const names  =  await caches.keys();
            await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
            await self.clients.claim();
        })());
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fetch
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Network First - the cache refreshed as it goes, and the fallback
    // ------------------------------------------------------------
    async function PainterlyNPR__Pwa__NetworkFirst(request) {
        const cache  =  await caches.open(CACHE_NAME);
        try {
            const response  =  await fetch(request, { cache: 'no-store' });
            if (response.ok && response.type === 'basic') cache.put(request, response.clone());
            return response;
        } catch (error) {
            const cached  =  await cache.match(request, { ignoreSearch: true });
            if (cached) return cached;
            throw error;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stale While Revalidate - the cache at once, refreshed behind it
    // ------------------------------------------------------------
    async function PainterlyNPR__Pwa__StaleWhileRevalidate(request, event) {
        const cache    =  await caches.open(CACHE_NAME);
        const cached   =  await cache.match(request, { ignoreSearch: true });
        const refresh  =  fetch(request).then((response) => {
            if (response.ok && response.type === 'basic') cache.put(request, response.clone());
            return response;
        }).catch(() => cached);
        if (cached) {
            event.waitUntil(refresh);
            return cached;
        }
        return refresh;
    }
    // ------------------------------------------------------------


    // EVENT HANDLER | Fetch - the app's own files only; /api/ straight through
    // ------------------------------------------------------------
    self.addEventListener('fetch', (event) => {
        const request  =  event.request;
        if (request.method !== 'GET') return;
        const url  =  new URL(request.url);
        if (url.origin !== self.location.origin || !request.url.startsWith(SCOPE)) return;
        if (NEVER_CACHE.some(path => url.pathname.startsWith(path))) return;
        const local    =  LOCAL_HOSTS.test(url.hostname);
        const fresh    =  request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.json');
        event.respondWith(local || fresh ? PainterlyNPR__Pwa__NetworkFirst(request) : PainterlyNPR__Pwa__StaleWhileRevalidate(request, event));
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
