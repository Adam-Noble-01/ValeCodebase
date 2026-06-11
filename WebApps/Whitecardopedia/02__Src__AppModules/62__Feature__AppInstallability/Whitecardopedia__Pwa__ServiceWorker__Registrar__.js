// =============================================================================
// WHITECARDOPEDIA - PWA SERVICE WORKER REGISTRAR
// =============================================================================
//
// FILE       : Whitecardopedia__Pwa__ServiceWorker__Registrar__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__Pwa__ServiceWorker__Registrar
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Register the shared service worker on every supported page
// CREATED    : 2026
//
// DESCRIPTION:
// - Reads the service worker URL and scope from
//   Whitecardopedia__Pwa__Url so all path resolution stays in one place.
// - Skips registration on non-secure origins (file://, http:// outside
//   localhost) to avoid the well-known "must be served over HTTPS"
//   browser warning.
// - Bridges service worker controllerchange events: when a new SW activates
//   and claims clients, the page reloads exactly once (guarded by
//   sessionStorage) so the user gets a consistent module graph. The reload
//   is intentionally deferred until no model load is in flight — checked via
//   window.Na__LoadWatchdog__IsLoadingActive (set by the LoadWatchdog module)
//   to avoid yanking a mid-load ValeVision3D session.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Registration State Cache
    // ------------------------------------------------------------
    let Whitecardopedia__Pwa__ServiceWorker__Registrar__Started     = false;                                                        // <-- Idempotent boot flag
    let Whitecardopedia__Pwa__ServiceWorker__Registrar__Registration = null;                                                        // <-- Active ServiceWorkerRegistration
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Determine if Service Workers Should Register
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Registrar__IsRegistrationAllowed() {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;                                      // <-- API unavailable
        if (typeof window === 'undefined') return false;                                                                            // <-- Non-window context

        const protocol          = window.location.protocol;                                                                         // <-- Page protocol
        const hostname          = window.location.hostname;                                                                         // <-- Page hostname

        if (protocol === 'https:') return true;                                                                                     // <-- HTTPS always allowed
        if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0')) return true;  // <-- Localhost dev
        return false;                                                                                                               // <-- Block file:// and remote http://
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Resolve Service Worker URL and Scope
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Registrar__ResolveTargets() {
        const urlHelper         = window.Whitecardopedia__Pwa__Url || null;                                                         // <-- Resolve URL helper
        if (!urlHelper) return null;                                                                                                // <-- No helper available -> bail

        const serviceWorkerUrl  = urlHelper.getServiceWorkerUrl();                                                                  // <-- Absolute SW script URL
        const serviceWorkerScope = urlHelper.getServiceWorkerScope();                                                               // <-- Scope URL

        if (!serviceWorkerUrl || !serviceWorkerScope) return null;                                                                  // <-- Validate output
        return { url: serviceWorkerUrl, scope: serviceWorkerScope };                                                                // <-- Composite descriptor
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Bridge controllerchange to a Guarded Idle Reload
    // ---------------------------------------------------------------
    // Attaches once to navigator.serviceWorker controllerchange. When a new SW
    // activates and claims clients, the page reloads exactly once (sessionStorage
    // guard prevents reload loops). If a model load is in flight — indicated by
    // window.Na__LoadWatchdog__IsLoadingActive — the reload is deferred until
    // the page becomes idle (or up to 30 s of polling before giving up).
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Registrar__BridgeControllerChange() {
        if (!navigator.serviceWorker) return;                                                                                        // <-- Guard: SW not available

        const NA__RELOAD_SESSION_KEY  = 'wpwa-sw-reload-done';                                                                      // <-- sessionStorage guard key
        const NA__RELOAD_POLL_MAX_MS  = 30000;                                                                                      // <-- Max wait for idle before giving up
        const NA__RELOAD_POLL_INTERVAL_MS = 500;                                                                                    // <-- Poll interval (ms)

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (sessionStorage.getItem(NA__RELOAD_SESSION_KEY)) return;                                                              // <-- Already reloaded this session

            sessionStorage.setItem(NA__RELOAD_SESSION_KEY, '1');                                                                    // <-- Mark before any async work (prevents race)

            let Whitecardopedia__Pwa__PollElapsedMs = 0;                                                                            // <-- Elapsed polling time

            function Whitecardopedia__Pwa__AttemptReload() {
                const isLoading = window.Na__LoadWatchdog__IsLoadingActive === true;                                                 // <-- Check in-flight load flag

                if (!isLoading) {
                    console.log('[SW Registrar] Controller changed — reloading for consistent module graph.');
                    window.location.reload();                                                                                        // <-- Safe to reload now
                    return;
                }

                Whitecardopedia__Pwa__PollElapsedMs += NA__RELOAD_POLL_INTERVAL_MS;
                if (Whitecardopedia__Pwa__PollElapsedMs >= NA__RELOAD_POLL_MAX_MS) {
                    console.warn('[SW Registrar] Controller changed but load still in flight after 30s — skipping reload.');
                    return;                                                                                                          // <-- Give up; do not reload mid-load
                }

                setTimeout(Whitecardopedia__Pwa__AttemptReload, NA__RELOAD_POLL_INTERVAL_MS);                                       // <-- Poll again
            }

            Whitecardopedia__Pwa__AttemptReload();                                                                                  // <-- Start poll loop immediately
        });
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Bridge appinstalled to Session State
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Registrar__BridgeAppInstalled() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        window.addEventListener('appinstalled', () => {
            if (window.Whitecardopedia__Pwa__SessionState && window.Whitecardopedia__Pwa__SessionState.markInstalled) {
                window.Whitecardopedia__Pwa__SessionState.markInstalled();                                                          // <-- Persist install state
            }
            if (window.Whitecardopedia__Pwa__PromptUi && window.Whitecardopedia__Pwa__PromptUi.hide) {
                window.Whitecardopedia__Pwa__PromptUi.hide();                                                                       // <-- Hide any visible banner
            }
        });
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Register Service Worker (Idempotent)
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Registrar__Register() {
        if (Whitecardopedia__Pwa__ServiceWorker__Registrar__Started) {
            return Whitecardopedia__Pwa__ServiceWorker__Registrar__Registration;                                                    // <-- Return cached handle
        }
        Whitecardopedia__Pwa__ServiceWorker__Registrar__Started = true;                                                             // <-- Mark started

        if (!Whitecardopedia__Pwa__ServiceWorker__Registrar__IsRegistrationAllowed()) {
            return null;                                                                                                            // <-- Skip on file:// and remote http
        }

        const targets           = Whitecardopedia__Pwa__ServiceWorker__Registrar__ResolveTargets();                                 // <-- Resolve URL + scope
        if (!targets) return null;                                                                                                  // <-- Bail without URL helper

        try {
            const registration  = await navigator.serviceWorker.register(targets.url, { scope: targets.scope });                    // <-- Register service worker
            Whitecardopedia__Pwa__ServiceWorker__Registrar__Registration = registration;                                            // <-- Persist registration
            Whitecardopedia__Pwa__ServiceWorker__Registrar__BridgeControllerChange();                                               // <-- Wire controllerchange -> idle reload
            Whitecardopedia__Pwa__ServiceWorker__Registrar__BridgeAppInstalled();                                                   // <-- Wire appinstalled -> session
            return registration;                                                                                                    // <-- Return handle
        } catch (error) {
            console.warn('Whitecardopedia PWA service worker registration failed:', error);                                         // <-- Log non-blocking
            return null;                                                                                                            // <-- Allow app to continue
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get Active Registration (Diagnostic)
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Registrar__GetRegistration() {
        return Whitecardopedia__Pwa__ServiceWorker__Registrar__Registration;                                                        // <-- Return cached handle (may be null)
    }
    // ---------------------------------------------------------------


    // FUNCTION | Send Cache Reset Message
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Registrar__ClearCaches() {
        if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return false;                                          // <-- No active controller
        navigator.serviceWorker.controller.postMessage({ type: 'wpwa-clear-caches' });                                              // <-- Trigger SW cleanup
        return true;                                                                                                                // <-- Best-effort indicator
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bootstrap
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Bootstrap Registration
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Registrar__Bootstrap() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        window.Whitecardopedia__Pwa__ServiceWorker__Registrar = {                                                                   // <-- Expose registrar API
            register        : Whitecardopedia__Pwa__ServiceWorker__Registrar__Register,
            getRegistration : Whitecardopedia__Pwa__ServiceWorker__Registrar__GetRegistration,
            clearCaches     : Whitecardopedia__Pwa__ServiceWorker__Registrar__ClearCaches
        };

        const startRegistration = () => Whitecardopedia__Pwa__ServiceWorker__Registrar__Register();                                 // <-- Local reference

        if (document.readyState === 'complete') {
            startRegistration();                                                                                                    // <-- Already loaded -> register immediately
            return;
        }

        window.addEventListener('load', startRegistration, { once: true });                                                         // <-- Defer until window load
    }
    // ---------------------------------------------------------------


    Whitecardopedia__Pwa__ServiceWorker__Registrar__Bootstrap();                                                                    // <-- Kick off bootstrap

// endregion -------------------------------------------------------------------

})();
