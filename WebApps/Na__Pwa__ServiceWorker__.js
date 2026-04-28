// =============================================================================
// VALE WEBAPPS - PWA SERVICE WORKER LOADER STUB
// =============================================================================
//
// FILE       : Na__Pwa__ServiceWorker__.js
// NAMESPACE  : ValeWebApps (multi-app shared service worker)
// MODULE     : Na__Pwa__ServiceWorker
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Top-level SW entrypoint required for max scope coverage on
//              GitHub Pages (which cannot send Service-Worker-Allowed headers).
// CREATED    : 2026
//
// DESCRIPTION:
// - This file deliberately lives at the WebApps root so its scope can cover
//   both Whitecardopedia and ValeVision3D simultaneously.
// - All actual logic is held inside the Whitecardopedia install module folder
//   to keep the codebase tidy. We pull it in via importScripts() so the
//   loader stays trivially small.
//
// =============================================================================

// REGION | Service Worker Constants
// ------------------------------------------------------------
const NA_PWA_SW_LOGIC_RELATIVE_PATH     = 'Whitecardopedia/02__Src__AppModules/62__Feature__AppInstallability/Whitecardopedia__Pwa__ServiceWorker__Logic__.js';   // <-- Logic location relative to this stub
// ------------------------------------------------------------


// REGION | Boot Strap Logic Import
// ------------------------------------------------------------
try {
    importScripts(NA_PWA_SW_LOGIC_RELATIVE_PATH);                                                                                   // <-- Pull real SW logic
} catch (importError) {
    self.addEventListener('install',  (event) => self.skipWaiting());                                                               // <-- Minimal install fallback
    self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));                                            // <-- Minimal activate fallback
    self.addEventListener('fetch',    () => {});                                                                                    // <-- Pass-through fetch on import failure
    console.error('Vale PWA service worker logic failed to load:', importError);                                                    // <-- Surface diagnostic
}
// ------------------------------------------------------------
