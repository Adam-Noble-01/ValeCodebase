/* =============================================================================
   VALEVISION 3D - SERVICE WORKER (INSTALLABLE APP)
   =============================================================================

   FILE       : ValeVision3D__Pwa__ServiceWorker__.js
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Make ValeVision 3D installable, without ever showing a stale model
                or stale project data
   CREATED    : 06-Oct-2026

   DESCRIPTION:
   - Scope: this app's route only (/valevision/).
   - App files (this route, /AppAssets__CommonApplicationAssets/): network
     first, the cached copy only when offline.
   - Never cached here: api/ (projects, sign-in, saves), the Projects Master
     Library (models are large and change with every SketchUp sync; nginx
     answers a repeat with 304), and anything that is not a GET.
   - Replaces the Gallery's 13-file PWA stack the pre-server build borrowed.

   ============================================================================= */

var VV3D_VERSION = '2026-10-06-1';
var VV3D_SHELL   = 'valevision3d-shell-' + VV3D_VERSION;

self.addEventListener('install', function() { self.skipWaiting(); });

self.addEventListener('activate', function(event) {
    event.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) {
            return k.indexOf('valevision3d-') === 0 && k !== VV3D_SHELL;
        }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); }));
});

self.addEventListener('fetch', function(event) {
    var req = event.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;                          // <-- Fonts and other sites: the browser's own cache
    if (url.pathname.indexOf('/api/') >= 0) return;                            // <-- Never cache the API
    if (url.pathname.indexOf('/Vale__Projects__MasterLibrary/') === 0) return; // <-- Models and project content: always the server's

    var scope = new URL(self.registration.scope);
    if (url.pathname.indexOf(scope.pathname) === 0 || url.pathname.indexOf('/AppAssets__CommonApplicationAssets/') === 0) {
        event.respondWith(fetch(req).then(function(res) {                      // <-- App files: network first
            if (res.ok) { var copy = res.clone(); caches.open(VV3D_SHELL).then(function(c) { c.put(req, copy); }); }
            return res;
        }).catch(function() { return caches.match(req); }));
    }
});
