/* =============================================================================
   VALEVISION AURA - SERVICE WORKER (INSTALLABLE APP, ENGINE KEPT ON THE DEVICE)
   =============================================================================

   FILE       : AuraRender__Pwa__ServiceWorker__.js
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Make ValeVision AURA installable, keep its pinned engine on the
                device, and never show a stale page or a stale drawing set
   CREATED    : 30-Oct-2026

   DESCRIPTION:
   - Scope: this app's route only (/aura/).
   - THE PINNED ENGINE (04__Lib__CoreEngine__VersionLocked/): cache first. Each
     version lives at its own path, so a cached file is never out of date; a new
     version is a new path. This is where AURA's heavy work lives on the user's
     own machine (Adam, 30-Oct-2026: the server is resource constrained), and
     where PainterlyNPR's WebGPU and WebAssembly builds will be kept the same way.
   - AURA's own files and the shared assets: network first, the cached copy only
     when offline (ValeVision 3D's rule). The handwriting engine's WebAssembly
     (31__System__Handwriting/02__Engine__Wasm, 13 KB) is one of them.
   - THE HANDWRITING MODEL (15 MB, from api/handwriting/weights/<sha256>) is kept
     by the handwriting engine's own worker in aura-pen-<hash> caches, which this
     worker never deletes: an app update does not fetch the model again.
   - Never cached here: api/ (sign-in, projects, drawing sets, the handwriting
     model's manifest), the Projects Master Library, and anything that is not a GET.

   ============================================================================= */

var AURA_VERSION = '2026-10-30-9';                                         // <-- Bump with every engine sync (a re-sync of the same version too)
var AURA_SHELL   = 'aura-shell-' + AURA_VERSION;
var AURA_ENGINE  = 'aura-engine-' + AURA_VERSION;                                // <-- Kept until the next version of this worker
var AURA_PEN     = 'aura-pen-';                                                  // <-- The handwriting model's caches: its worker keeps the current one

self.addEventListener('install', function() { self.skipWaiting(); });

self.addEventListener('activate', function(event) {
    event.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) {
            return k.indexOf('aura-') === 0 && k !== AURA_SHELL && k !== AURA_ENGINE && k.indexOf(AURA_PEN) !== 0;
        }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); }));
});

self.addEventListener('fetch', function(event) {
    var req = event.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;                            // <-- Fonts and other sites: the browser's own cache
    if (url.pathname.indexOf('/api/') >= 0) return;                              // <-- Never cache the API
    if (url.pathname.indexOf('/Vale__Projects__MasterLibrary/') === 0) return;   // <-- Project content: always the server's

    var scope = new URL(self.registration.scope);
    if (url.pathname.indexOf(scope.pathname + '04__Lib__CoreEngine__VersionLocked/') === 0) {
        event.respondWith(caches.open(AURA_ENGINE).then(function(cache) {       // <-- The pinned engine: cache first
            return cache.match(req).then(function(hit) {
                return hit || fetch(req).then(function(res) {
                    if (res.ok) cache.put(req, res.clone());
                    return res;
                });
            });
        }));
        return;
    }
    if (url.pathname.indexOf(scope.pathname) === 0 || url.pathname.indexOf('/AppAssets__CommonApplicationAssets/') === 0) {
        event.respondWith(fetch(req).then(function(res) {                        // <-- App files: network first
            if (res.ok) { var copy = res.clone(); caches.open(AURA_SHELL).then(function(c) { c.put(req, copy); }); }
            return res;
        }).catch(function() { return caches.match(req); }));
    }
});
