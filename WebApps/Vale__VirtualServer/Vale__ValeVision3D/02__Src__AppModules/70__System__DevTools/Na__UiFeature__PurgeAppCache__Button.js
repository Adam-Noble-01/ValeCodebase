// =============================================================================
// VALEVISION3D - PURGE APP CACHE BUTTON
// =============================================================================
//
// FILE       : Na__UiFeature__PurgeAppCache__Button.js
// NAMESPACE  : ValeVision3D
// MODULE     : Na__UiFeature__PurgeAppCache__Button
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Wire the Purge App Cache button in the Tools & Settings menu
// CREATED    : 26-Jun-2026
//
// DESCRIPTION:
// - Attaches a click handler to the #naPurgeAppCacheAction button.
// - Shows a confirm() dialog to guard against accidental clicks.
// - Delegates to window.ValeVisionGallery__Pwa__ServiceWorker__Registrar.purgeAppCache()
//   (the shared brutal-purge function from the shared PWA registrar that wipes
//   all Cache Storage, unregisters the SW, clears localStorage/sessionStorage/IDB
//   while preserving auth tokens, then hard-reloads).
// - Falls back to window.location.reload() if the registrar is not loaded.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - The purge clears this app's own service worker and caches (the borrowed Gallery
//   registrar is gone with the move to app.valegardenhouses.com).
//
// 26-Jun-2026 - Version 1.0.0
// - Initial release wiring the Purge App Cache button for ValeVision3D.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Purge App Cache Button
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Purge App Cache Button
    // ------------------------------------------------------------
    export function Na__UiFeature__InitializePurgeAppCacheButton() {
        Na__UiFeature__WireAppSettingsSubmenuToggle();                           // <-- Wire App Settings submenu expand/collapse
        Na__UiFeature__WirePurgeCacheAction();                                  // <-- Wire Purge App Cache button click
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Wire App Settings Submenu Toggle
    // ---------------------------------------------------------------
    function Na__UiFeature__WireAppSettingsSubmenuToggle() {
        const toggleButton = document.getElementById('naAppSettingsToggle');
        const panel        = document.getElementById('naAppSettingsPanel');
        if (!toggleButton || !panel) return;                                     // <-- Elements not in DOM — skip silently

        toggleButton.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);                          // <-- Same pattern as all other submenus
        });
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Wire Purge App Cache Action Button
    // ---------------------------------------------------------------
    function Na__UiFeature__WirePurgeCacheAction() {
        const button = document.getElementById('naPurgeAppCacheAction');
        if (!button) return;                                                     // <-- Button not in DOM — skip silently

        button.addEventListener('click', Na__UiFeature__HandlePurgeCacheClick); // <-- Wire click handler
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Handle Purge App Cache Button Click
    // ---------------------------------------------------------------
    async function Na__UiFeature__HandlePurgeCacheClick() {
        const confirmed = window.confirm(                                        // <-- Guard against accidental click
            'Purge App Cache?\n\nThis clears ValeVision 3D\'s cached files and reloads the app from the server.\nYou stay signed in (the sign-in is a cookie).'
        );
        if (!confirmed) return;                                                  // <-- Bail if user cancels

        try {
            if (navigator.serviceWorker) {                                       // <-- This app's service worker (ValeVision3D__Pwa__ServiceWorker__.js)
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map((reg) => reg.unregister()));
            }
            if (window.caches) {                                                 // <-- Its caches, and nothing of another app's
                const keys = await caches.keys();
                await Promise.all(keys.filter((key) => key.indexOf('valevision3d-') === 0).map((key) => caches.delete(key)));
            }
        } catch (error) {
            console.warn('[ValeVision3D] Purge App Cache: part of the cache could not be cleared.', error);
        }
        window.location.reload();
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
