/* =============================================================================
   VGHLANTERN - SERVICE WORKER (INSTALLABLE APP)
   =============================================================================

   FILE       : VghLantern__Pwa__ServiceWorker__.js
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Make Lantern Designer installable and quick to reopen, without
                ever showing a stale design
   CREATED    : 15-Oct-2026

   DESCRIPTION:
   - Scope: this app's route only (/lantern-designer/).
   - App files (and the shared /AppAssets__CommonApplicationAssets/): network
     first, the cached copy when offline.
   - Never cached: api/ (designs, sign-in, settings) and anything that is not a GET.
   - Only this worker's own caches (vghlantern-*) are ever deleted: the site is
     one origin for every Vale app, so it must never touch theirs.
   - Replaces the pre-server worker (Na__ServiceWorker__VghLantern.js, whose
     version token the localhost server rewrote at every start) and the 12-file
     install stack in 62__Feature__AppInstallability. Updates after a push come
     from the shared ValeShared__AppUpdate__.js and the Server Manager's deploy stamp.

   ============================================================================= */

var VGHLANTERN_SW_VERSION = '2026-10-15-1';
var VGHLANTERN_SW_SHELL   = 'vghlantern-shell-' + VGHLANTERN_SW_VERSION;

self.addEventListener('install', function() { self.skipWaiting(); });

self.addEventListener('activate', function(event) {
    event.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) {
            return k.indexOf('vghlantern-') === 0 && k !== VGHLANTERN_SW_SHELL;      // <-- Own caches only
        }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); }));
});

self.addEventListener('fetch', function(event) {
    var req = event.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;                          // <-- Fonts and other sites: the browser's cache
    if (url.pathname.indexOf('/api/') >= 0) return;                            // <-- Never cache the API

    var scope = new URL(self.registration.scope);
    if (url.pathname.indexOf(scope.pathname) === 0 || url.pathname.indexOf('/AppAssets__CommonApplicationAssets/') === 0) {
        event.respondWith(fetch(req).then(function(res) {                      // <-- App files: network first
            if (res.ok) { var copy = res.clone(); caches.open(VGHLANTERN_SW_SHELL).then(function(c) { c.put(req, copy); }); }
            return res;
        }).catch(function() {
            return caches.match(req).then(function(hit) { return hit || Response.error(); });
        }));
    }
});
