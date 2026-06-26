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
// - Delegates to window.Whitecardopedia__Pwa__ServiceWorker__Registrar.purgeAppCache()
//   (the shared brutal-purge function from the shared PWA registrar that wipes
//   all Cache Storage, unregisters the SW, clears localStorage/sessionStorage/IDB
//   while preserving auth tokens, then hard-reloads).
// - Falls back to window.location.reload() if the registrar is not loaded.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
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
    function Na__UiFeature__HandlePurgeCacheClick() {
        const confirmed = window.confirm(                                        // <-- Guard against accidental click
            'Purge App Cache?\n\nThis will clear all cached data and reload the app from scratch.\nYour login will be preserved.'
        );
        if (!confirmed) return;                                                  // <-- Bail if user cancels

        const registrar = window.Whitecardopedia__Pwa__ServiceWorker__Registrar;
        if (registrar && typeof registrar.purgeAppCache === 'function') {
            registrar.purgeAppCache();                                           // <-- Brutal full purge (preserves auth tokens)
        } else {
            window.location.reload();                                            // <-- Fallback: plain reload if registrar unavailable
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------
