// -----------------------------------------------------------------------------
// REGION | PWA Service Worker Registration
// -----------------------------------------------------------------------------

 // MODULE CONSTANTS | Service Worker Route and Scope
 // ------------------------------------------------------------
 const Na__AppInstallability__ServiceWorkerPath = './Na__ServiceWorker__ValePlanner.js';
 const Na__AppInstallability__ServiceWorkerScope = './';
 // ------------------------------------------------------------


 // FUNCTION | Register Service Worker for App Installability
 // ------------------------------------------------------------
 export async function Na__AppInstallability__RegisterServiceWorkerAsync() {
     if (!('serviceWorker' in navigator)) return;

     const isSecureContextOrLocalhost = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
     if (!isSecureContextOrLocalhost) return;

     try {
         await navigator.serviceWorker.register(Na__AppInstallability__ServiceWorkerPath, {
             scope: Na__AppInstallability__ServiceWorkerScope
         });
     } catch (errorValue) {
         console.warn('ValePlanner service worker registration failed:', errorValue);
     }
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
