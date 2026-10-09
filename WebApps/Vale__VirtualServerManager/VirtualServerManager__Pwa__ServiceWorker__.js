/* =============================================================================
   VALE VIRTUAL SERVER MANAGER - PWA SERVICE WORKER
   =============================================================================

   FILE       : VirtualServerManager__Pwa__ServiceWorker__.js
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Make the manager installable (Start menu app) and let its shell
                open even when the local server is not running yet
   CREATED    : 06-Oct-2026

   DESCRIPTION:
   - App shell: network first, cache as fallback (always fresh when the local
     server is up; the cached shell shows the "not running" banner when it is not).
   - /api/* is never cached: live data only.

   ============================================================================= */

var VSM_CACHE = 'vale-virtual-server-shell-v0.11.0';
var VSM_SHELL = [
    '/',
    '/VirtualServerManager__Pwa__Manifest__.webmanifest',
    '/03__Style__AppStylesheets/VirtualServerManager__Styles__Main__.css',
    '/02__Src__AppModules/VirtualServerManager__Ui__Core__.js',
    '/02__Src__AppModules/VirtualServerManager__Ui__Matrix__.js',
    '/02__Src__AppModules/VirtualServerManager__Ui__Explorer__.js',
    '/02__Src__AppModules/VirtualServerManager__Ui__Urls__.js',
    '/02__Src__AppModules/VirtualServerManager__Ui__Users__.js',
    '/02__Src__AppModules/VirtualServerManager__Ui__Activity__.js',
    '/01__AppAssets/VirtualServerManager__Icon__32x32.png',
    '/01__AppAssets/VirtualServerManager__Icon__192x192.png',
    '/01__AppAssets/VirtualServerManager__Icon__512x512.png'
];

self.addEventListener('install', function(event) {
    event.waitUntil(caches.open(VSM_CACHE).then(function(cache) { return cache.addAll(VSM_SHELL); })
        .then(function() { return self.skipWaiting(); }));
});

self.addEventListener('activate', function(event) {
    event.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) { return k !== VSM_CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); }));
});

self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.indexOf('/api/') === 0) return;
    event.respondWith(fetch(event.request).then(function(response) {
        if (response.ok) {
            var copy = response.clone();
            caches.open(VSM_CACHE).then(function(cache) { cache.put(url.pathname === '/' || event.request.mode === 'navigate' ? '/' : event.request, copy); });
        }
        return response;
    }).catch(function() {
        return caches.match(event.request.mode === 'navigate' ? '/' : event.request).then(function(hit) {
            return hit || new Response('Vale Virtual Server: the local manager is not running.', { status: 503 });
        });
    }));
});
