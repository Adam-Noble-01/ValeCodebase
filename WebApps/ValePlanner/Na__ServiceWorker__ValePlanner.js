// -----------------------------------------------------------------------------
// REGION | ValePlanner Service Worker
// -----------------------------------------------------------------------------

 // MODULE CONSTANTS | Cache Prefix For Legacy Cleanup
 // ------------------------------------------------------------
 const Na__ServiceWorker__CachePrefix = 'na-valeplanner-cache-';
 // ------------------------------------------------------------


 // EVENT | Install and Activate Immediately
 // ------------------------------------------------------------
 self.addEventListener('install', (installEvent) => {
     installEvent.waitUntil(
         self.skipWaiting()
     );
 });
 // ------------------------------------------------------------


 // EVENT | Activate and Clear Legacy ValePlanner Caches
 // ------------------------------------------------------------
 self.addEventListener('activate', (activateEvent) => {
     activateEvent.waitUntil(
         caches.keys().then((cacheKeys) => Promise.all(
             cacheKeys
                 .filter((cacheKey) => cacheKey.startsWith(Na__ServiceWorker__CachePrefix))
                 .map((cacheKey) => caches.delete(cacheKey))
         )).then(() => self.clients.claim())
     );
 });
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
