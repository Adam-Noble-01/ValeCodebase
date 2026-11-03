/* =============================================================================
   PAINTERLYNPR - PWA SHELL | SERVICE WORKER - REGISTRAR
   =============================================================================

   FILE       : PainterlyNPR__Pwa__ServiceWorker__Registrar__.js
   NAMESPACE  : PainterlyNPR
   MODULE     : PwaShell - ServiceWorker - Registrar
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Register the service worker once the page has loaded, on secure
                origins only, and say quietly when a newer version takes over
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - A classic script, loaded with defer: it waits for the page's load event, so
     registering never competes with the first drawing for the network or the GPU.
   - updateViaCache 'none': the browser checks the worker's own files every time.
   - When a newer worker takes over a page that already had one, it says so on the
     console and never reloads: the drawing on the sheet may be unsaved work. The
     next reload uses the new version.
   - PainterlyNPR__Pwa__ClearCache() on the console deletes this app's caches and
     unregisters the worker - a clean start, as TrueVision's helper gives.

   ============================================================================= */

(function () {
    'use strict';

// =============================================================================
// REGION | Service Worker - Registrar
// =============================================================================

    // MODULE CONSTANTS | The Worker and Its Scope
    // ------------------------------------------------------------
    const WORKER        =  'Na__Pwa__ServiceWorker__.js';                    // <-- At the app's root, beside the page
    const SCOPE         =  './';
    const CACHE_PREFIX  =  'painterlynpr-shell-';
    // ------------------------------------------------------------


    // FUNCTION | Register - after load, on a secure origin
    // ------------------------------------------------------------
    function PainterlyNPR__Pwa__Register() {
        if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
        const hadController  =  !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (hadController) console.info('[PainterlyNPR PWA] A newer version is ready - it opens on the next reload.');
        });
        navigator.serviceWorker.register(WORKER, { scope: SCOPE, updateViaCache: 'none' })
            .then(registration => registration.update().catch(() => {}))
            .catch(error => console.warn('[PainterlyNPR PWA] The service worker did not register:', error));
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear the Cache - this app's caches deleted, the worker unregistered
    // ------------------------------------------------------------
    async function PainterlyNPR__Pwa__ClearCache() {
        const names  =  await caches.keys();
        await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX)).map(name => caches.delete(name)));
        const registrations  =  await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
        return 'PainterlyNPR caches cleared; reload to start clean.';
    }
    // ------------------------------------------------------------

    // FUNCTION | A Double-Clicked Page - say how to open the app, since file:// loads no module
    // ------------------------------------------------------------
    // This script is classic, so it runs from file:// where the app's modules
    // cannot; the status line would otherwise say "Starting ..." for ever.
    function PainterlyNPR__Pwa__FileNotice() {
        if (location.protocol !== 'file:') return;
        const status  =  document.getElementById('PainterlyNPR__App__Status');
        if (status) status.textContent  =  'Opened as a file: PainterlyNPR is ES modules, which a browser will not load from file://. Double-click Start__PainterlyNPR__Localhost__8020__.bat to open it.';
    }
    // ------------------------------------------------------------

    window.PainterlyNPR__Pwa__ClearCache  =  PainterlyNPR__Pwa__ClearCache;
    PainterlyNPR__Pwa__FileNotice();
    if (document.readyState === 'complete') PainterlyNPR__Pwa__Register();
    else window.addEventListener('load', PainterlyNPR__Pwa__Register);

// endregion -------------------------------------------------------------------

})();
