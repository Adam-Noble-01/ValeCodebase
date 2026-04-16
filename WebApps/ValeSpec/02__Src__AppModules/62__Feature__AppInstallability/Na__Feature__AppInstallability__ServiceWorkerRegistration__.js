/* =============================================================================
   VALESPEC - FEATURE | APP INSTALLABILITY SERVICE WORKER REGISTRATION
   =============================================================================

   FILE       : Na__Feature__AppInstallability__ServiceWorkerRegistration__.js
   NAMESPACE  : ValeSpec
   MODULE     : Feature - AppInstallability
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Register ValeSpec service worker for installability support
   CREATED    : 16-Apr-2026

   DESCRIPTION:
   - Registers the ValeSpec service worker when supported
   - Restricts registration to secure contexts and localhost environments
   - Keeps installability wiring isolated from core app initialization logic

   ============================================================================= */

(function() {

// -----------------------------------------------------------------------------
// REGION | PWA Service Worker Registration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Service Worker Route and Scope
    // ------------------------------------------------------------
    var ValeSpec__AppInstallability__ServiceWorkerPath   = './Na__ServiceWorker__ValeSpec.js';
    var ValeSpec__AppInstallability__ServiceWorkerScope  = './';
    // ------------------------------------------------------------


    // FUNCTION | Register Service Worker for App Installability
    // ------------------------------------------------------------
    async function ValeSpec__AppInstallability__RegisterServiceWorkerAsync() {
        if (!('serviceWorker' in navigator)) return;

        var isSecureContextOrLocalhost = window.isSecureContext
            || window.location.hostname === 'localhost'
            || window.location.hostname === '127.0.0.1';
        if (!isSecureContextOrLocalhost) return;

        try {
            await navigator.serviceWorker.register(ValeSpec__AppInstallability__ServiceWorkerPath, {
                scope : ValeSpec__AppInstallability__ServiceWorkerScope
            });
        } catch (errorValue) {
            console.warn('ValeSpec service worker registration failed:', errorValue);
        }
    }
    // ------------------------------------------------------------


    // MODULE EXPORT | Expose App Installability API
    // ------------------------------------------------------------
    window.ValeSpec__Feature__AppInstallability = {
        ValeSpec__AppInstallability__RegisterServiceWorkerAsync : ValeSpec__AppInstallability__RegisterServiceWorkerAsync
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
