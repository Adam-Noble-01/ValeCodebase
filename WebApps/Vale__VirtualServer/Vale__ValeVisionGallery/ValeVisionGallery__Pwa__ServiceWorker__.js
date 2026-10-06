/* =============================================================================
   VALEVISION GALLERY - SERVICE WORKER (INSTALLABLE APP)
   =============================================================================

   FILE       : ValeVisionGallery__Pwa__ServiceWorker__.js
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Make the Gallery installable and quick to reopen, without ever
                showing stale project data
   CREATED    : 06-Oct-2026

   DESCRIPTION:
   - Scope: this app's route only (/project-gallery/).
   - App files: network first, cached copy when offline.
   - Project images (/Vale__Projects__MasterLibrary/...Content__...): shown from
     the cache at once and refreshed in the background.
   - Never cached: api/ (projects, sign-in) and anything that is not a GET.
   - Replaces the 13-file PWA stack of the pre-server build.

   ============================================================================= */

var VVG_VERSION = '2026-10-06-2';
var VVG_SHELL   = 'valevision-gallery-shell-' + VVG_VERSION;
var VVG_IMAGES  = 'valevision-gallery-images-' + VVG_VERSION;

self.addEventListener('install', function() { self.skipWaiting(); });

self.addEventListener('activate', function(event) {
    event.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) {
            return k.indexOf('valevision-gallery-') === 0 && k !== VVG_SHELL && k !== VVG_IMAGES;
        }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); }));
});

self.addEventListener('fetch', function(event) {
    var req = event.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;                          // <-- CDN libraries: browser cache
    if (url.pathname.indexOf('/api/') >= 0) return;                            // <-- Never cache the API

    if (url.pathname.indexOf('/Vale__Projects__MasterLibrary/') === 0 && url.pathname.indexOf('/Content__') > 0) {
        event.respondWith(caches.open(VVG_IMAGES).then(function(cache) {       // <-- Images: cached now, refreshed behind
            return cache.match(req).then(function(hit) {
                var refresh = fetch(req).then(function(res) {
                    if (res.ok) cache.put(req, res.clone());
                    return res;
                }).catch(function() { return hit || Response.error(); }); // <-- Never resolve to nothing (aborted on page change)
                return hit || refresh;
            });
        }));
        return;
    }

    var scope = new URL(self.registration.scope);
    if (url.pathname.indexOf(scope.pathname) === 0 || url.pathname.indexOf('/AppAssets__CommonApplicationAssets/') === 0) {
        event.respondWith(fetch(req).then(function(res) {                      // <-- App files: network first
            if (res.ok) { var copy = res.clone(); caches.open(VVG_SHELL).then(function(c) { c.put(req, copy); }); }
            return res;
        }).catch(function() {
            return caches.match(req).then(function(hit) { return hit || Response.error(); });
        }));
    }
});
