// -----------------------------------------------------------------------------
// REGION | ValeSpec Service Worker
// -----------------------------------------------------------------------------

 // MODULE CONSTANTS | Cache Prefix For Legacy Cleanup
 // ------------------------------------------------------------
 const Na__ServiceWorker__CachePrefix = 'na-valespec-cache-';
 // ------------------------------------------------------------


 // EVENT | Install and Activate Immediately
 // ------------------------------------------------------------
 self.addEventListener('install', (installEvent) => {
     installEvent.waitUntil(
         self.skipWaiting()
     );
 });
 // ------------------------------------------------------------


 // EVENT | Activate and Clear Legacy ValeSpec Caches
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
