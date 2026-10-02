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
// - Bridges service worker controllerchange events: when a NEWER SW takes
//   over a page an older one was already controlling, the page reloads
//   exactly once (guarded by sessionStorage) so the user gets a consistent
//   module graph. The very first SW claiming an uncontrolled page is not an
//   update and does not reload. The reload is deferred while a model load
//   is in flight - window.Na__LoadWatchdog__IsLoadingActive, set by the
//   LoadWatchdog module, so a mid-load ValeVision3D session is not yanked -
//   and while the page holds unsaved work - window.Na__Pwa__HasUnsavedWork,
//   published by the ValeVision3D Layout Editor's auto save and absent on
//   Whitecardopedia pages - for up to 30 s, then the update waits for the
//   next fresh load.
// - Registers with updateViaCache 'none', so every update check revalidates
//   the imported worker logic with the server.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 2026 - Version 1.0.0
// - Initial service worker registrar with controllerchange idle-reload bridge.
//
// 25-Jun-2026 - Version 1.1.0
// - Added Whitecardopedia__Pwa__ServiceWorker__Registrar__HardResetAndReload:
//   controller-independent full reset (wipes all Cache Storage buckets,
//   unregisters every SW, clears the build-version marker, then reloads).
// - Installed the `--ClearCache` console shortcut (window.ClearCache getter)
//   plus the window.na_clear_cache() programmatic alias for one-keystroke
//   stale-PWA recovery from the browser console.
//
// 26-Jun-2026 - Version 1.2.0
// - Added PWA_PRESERVE_LOCALSTORAGE_KEYS constant: single source of truth for
//   auth keys that survive a full purge.
// - Added Whitecardopedia__Pwa__ServiceWorker__Registrar__PurgeAppCacheAndReload:
//   brutal full reset that wipes Cache Storage, SW registrations, localStorage,
//   sessionStorage, and IndexedDB while preserving the user's login tokens.
//   Exposed on the global API as purgeAppCache().
//
// 01-Oct-2026 - Version 1.2.1
// - Brought up to TrueVision3D's registrar 1.1.0-1.3.0 (19-Sep and
//   29-Sep-2026, read at b2aa9151) for the ValeVision3D Layout Editor, which
//   runs under this worker. Whitecardopedia pages publish no unsaved-work
//   flag, so for them only the second and third points change anything.
//   * UNSAVED WORK HOLDS THE RELOAD. The idle check also waits while
//     window.Na__Pwa__HasUnsavedWork() answers true: sheets not yet saved to
//     the project, or a specification not yet synced. This reload asks
//     nothing before it happens, and the editor's close guard would raise the
//     browser's leave-site question over the top of it. The poll still gives
//     up after 30 s and the update lands on the next fresh load; a probe that
//     throws counts as nothing unsaved, so it can never wedge updates.
//   * NO RELOAD ON A FIRST INSTALL. clients.claim() raises controllerchange
//     on a page nothing was controlling, and the bridge treated that as an
//     update: every first visit loaded the model, reloaded and loaded it
//     again, and so did every first launch of a Home Screen icon (its storage
//     starts empty). The bridge is now armed before registering and samples
//     navigator.serviceWorker.controller first; the first claim passes, and
//     any change after it is a real update and reloads as before.
//   * updateViaCache 'none'. The worker logic is a script the stub imports,
//     and with the default ('imports') an update check took it from the HTTP
//     cache while the host still called it fresh, so a token bump could go
//     unseen for that long. Every check now revalidates it with the server (a
//     304 when unchanged); a registration made with the default is switched
//     over the next time this runs.
// - Prepared by the ValeVision3D TrueVision-parity package W0-08; Adam deploys
//   it with the worker logic 1.0.17.
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


    // MODULE CONSTANTS | localStorage Keys Preserved During Full Purge
    // ------------------------------------------------------------
    const PWA_PRESERVE_LOCALSTORAGE_KEYS = [
        'whitecardopedia_auth_token',                                                                                                // <-- Whitecardopedia 30-day login token
        'whitecardopedia_auth_expiry',                                                                                               // <-- Whitecardopedia token expiry timestamp
        'valevision3d_email_auth_token',                                                                                             // <-- ValeVision3D email worker auth token
        'valevision3d_email_authExpiry',                                                                                             // <-- ValeVision3D email token expiry timestamp
    ];
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


    // HELPER FUNCTION | Is There Unsaved Editor Work
    // ---------------------------------------------------------------
    // The ValeVision3D Layout Editor's auto save publishes this probe once it
    // knows whether the session may edit at all; unsaved sheets and an
    // unsynced specification both count. Whitecardopedia pages publish
    // nothing, and a page that publishes nothing has nothing to protect.
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Registrar__HasUnsavedWork() {
        const probe             = window.Na__Pwa__HasUnsavedWork;                                                                   // <-- Published by the Layout Editor auto save
        if (typeof probe !== 'function') return false;                                                                              // <-- No editor on this page: nothing to protect

        try { return probe() === true; } catch (error) { return false; }                                                            // <-- A broken probe must not wedge updates forever
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Bridge controllerchange to a Guarded Idle Reload
    // ---------------------------------------------------------------
    // Armed once, BEFORE the registration, because controllerchange fires for
    // two different reasons and only one of them wants a reload:
    //   UPDATE        - a SW was already controlling this page and a newer one
    //                   has taken over. The page may hold modules from the old
    //                   cache, so it reloads exactly once (the sessionStorage
    //                   guard prevents reload loops).
    //   FIRST INSTALL - nothing was controlling the page and the first SW has
    //                   just claimed it. Everything on screen came straight off
    //                   the network, so a reload would only throw away a model
    //                   the client has just finished downloading.
    // The reload is deferred while a model load is in flight -
    // window.Na__LoadWatchdog__IsLoadingActive - or while the page holds
    // unsaved work - window.Na__Pwa__HasUnsavedWork - polling until the page
    // is idle, for up to 30 s before giving up.
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Registrar__BridgeControllerChange() {
        if (!navigator.serviceWorker) return;                                                                                        // <-- Guard: SW not available

        const NA__RELOAD_SESSION_KEY  = 'wpwa-sw-reload-done';                                                                      // <-- sessionStorage guard key
        const NA__RELOAD_POLL_MAX_MS  = 30000;                                                                                      // <-- Max wait for idle before giving up
        const NA__RELOAD_POLL_INTERVAL_MS = 500;                                                                                    // <-- Poll interval (ms)

        let Whitecardopedia__Pwa__PageIsControlled = Boolean(navigator.serviceWorker.controller);                                   // <-- Sampled before registration can change it

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!Whitecardopedia__Pwa__PageIsControlled) {
                Whitecardopedia__Pwa__PageIsControlled = true;                                                                      // <-- Any later change on this page IS an update
                console.log('[SW Registrar] First service worker has taken control - no reload needed.');
                return;                                                                                                             // <-- First install, not an update
            }

            if (sessionStorage.getItem(NA__RELOAD_SESSION_KEY)) return;                                                              // <-- Already reloaded this session

            sessionStorage.setItem(NA__RELOAD_SESSION_KEY, '1');                                                                    // <-- Mark before any async work (prevents race)

            let Whitecardopedia__Pwa__PollElapsedMs = 0;                                                                            // <-- Elapsed polling time

            function Whitecardopedia__Pwa__AttemptReload() {
                const isLoading = window.Na__LoadWatchdog__IsLoadingActive === true;                                                 // <-- Check in-flight load flag
                const isHolding = Whitecardopedia__Pwa__ServiceWorker__Registrar__HasUnsavedWork();                                 // <-- Unsaved editor work holds it too

                if (!isLoading && !isHolding) {
                    console.log('[SW Registrar] Controller changed — reloading for consistent module graph.');
                    window.location.reload();                                                                                        // <-- Safe to reload now
                    return;
                }

                Whitecardopedia__Pwa__PollElapsedMs += NA__RELOAD_POLL_INTERVAL_MS;
                if (Whitecardopedia__Pwa__PollElapsedMs >= NA__RELOAD_POLL_MAX_MS) {
                    console.warn('[SW Registrar] Controller changed but the page is still loading or holding unsaved work after 30s - skipping reload.');
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

        Whitecardopedia__Pwa__ServiceWorker__Registrar__BridgeControllerChange();                                                   // <-- Wire controllerchange -> idle reload, BEFORE registering: it samples whether this page is controlled yet

        try {
            // updateViaCache 'none'. The worker's logic is a script the stub imports,
            // and by default ('imports') the browser's update check - and a new
            // worker's install - take imported scripts from the HTTP cache while the
            // host still calls them fresh, so a token bump in the logic file could go
            // unseen for that long: the check compared the unchanged stub and the
            // cached logic and found nothing new. With 'none' the logic is
            // revalidated with the server on every check, a 304 when it has not
            // changed. A registration made with the default is switched over, and
            // checked, the next time this runs.
            const registration  = await navigator.serviceWorker.register(targets.url, { scope: targets.scope, updateViaCache: 'none' }); // <-- Register service worker
            Whitecardopedia__Pwa__ServiceWorker__Registrar__Registration = registration;                                            // <-- Persist registration
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


    // FUNCTION | Hard Reset — Wipe All Caches, Unregister SW, Then Reload
    // ------------------------------------------------------------
    // Robust one-shot reset that does NOT depend on an active SW controller:
    //   1. Deletes every Cache Storage bucket (shell, thumbs, data, models).
    //   2. Unregisters all service workers under this scope.
    //   3. Clears the build-version marker so build-change logic re-runs.
    //   4. Reloads so a fresh module graph + fresh R2 config load occurs.
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Registrar__HardResetAndReload() {
        try {
            if ('caches' in window) {
                const allCacheNames = await caches.keys();                                                                          // <-- Every Cache Storage bucket
                await Promise.all(allCacheNames.map(name => caches.delete(name)));                                                   // <-- Drop them all (best-effort)
            }
        } catch (cacheError) {
            console.warn('[ClearCache] Cache deletion failed:', cacheError);                                                        // <-- Non-blocking
        }

        try {
            if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                const registrations = await navigator.serviceWorker.getRegistrations();                                             // <-- All SW registrations
                await Promise.all(registrations.map(reg => reg.unregister()));                                                      // <-- Unregister each
            }
        } catch (swError) {
            console.warn('[ClearCache] Service worker unregister failed:', swError);                                                // <-- Non-blocking
        }

        try {
            localStorage.removeItem('wcp_last_build_version');                                                                      // <-- Force build-change eviction to re-run next load
        } catch (storageError) {}                                                                                                   // <-- Ignore storage failures

        console.log('%c[ClearCache] Caches cleared + service worker unregistered — reloading…', 'color:#006600;font-weight:bold;'); // <-- User feedback
        window.location.reload();                                                                                                   // <-- Fresh load (a clean SW reinstalls)
        return true;                                                                                                                // <-- Indicator (page unloads before this matters)
    }
    // ---------------------------------------------------------------


    // FUNCTION | Purge App Cache — Brutal Full Reset, Auth Preserved
    // ------------------------------------------------------------
    // Nuclear one-shot reset that wipes ALL client-side state so the app
    // behaves as though it has never been opened, while preserving the
    // user's saved login tokens so they stay signed in after reload.
    //
    // Clears in order:
    //   1. All Cache Storage buckets (shell, thumbs, data, models).
    //   2. All service worker registrations.
    //   3. All localStorage keys except PWA_PRESERVE_LOCALSTORAGE_KEYS.
    //   4. All sessionStorage keys.
    //   5. All IndexedDB databases (best-effort; browsers may not support .databases()).
    // Then reloads the page for a completely fresh session.
    // ------------------------------------------------------------
    async function Whitecardopedia__Pwa__ServiceWorker__Registrar__PurgeAppCacheAndReload() {

        // STEP 1 — snapshot auth keys before any storage mutation
        const na__preserved = {};
        try {
            for (const key of PWA_PRESERVE_LOCALSTORAGE_KEYS) {
                const value = localStorage.getItem(key);
                if (value !== null) na__preserved[key] = value;                                                                      // <-- Save value to restore after clear
            }
        } catch (snapError) {}                                                                                                       // <-- Ignore storage access failures

        // STEP 2 — delete all Cache Storage buckets
        try {
            if ('caches' in window) {
                const na__allCacheNames = await caches.keys();                                                                       // <-- Every Cache Storage bucket
                await Promise.all(na__allCacheNames.map(name => caches.delete(name)));                                               // <-- Wipe every bucket
            }
        } catch (cacheError) {
            console.warn('[PurgeCache] Cache deletion failed:', cacheError);                                                         // <-- Non-blocking
        }

        // STEP 3 — unregister all service workers
        try {
            if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                const na__registrations = await navigator.serviceWorker.getRegistrations();                                          // <-- All SW registrations
                await Promise.all(na__registrations.map(reg => reg.unregister()));                                                   // <-- Unregister each
            }
        } catch (swError) {
            console.warn('[PurgeCache] Service worker unregister failed:', swError);                                                 // <-- Non-blocking
        }

        // STEP 4 — wipe localStorage/sessionStorage, then restore auth tokens
        try {
            localStorage.clear();                                                                                                    // <-- Nuclear clear of all keys
            for (const [key, value] of Object.entries(na__preserved)) {
                localStorage.setItem(key, value);                                                                                    // <-- Restore preserved auth values
            }
            sessionStorage.clear();                                                                                                  // <-- Clear all session state
        } catch (storageError) {
            console.warn('[PurgeCache] Storage clear failed:', storageError);                                                        // <-- Non-blocking
        }

        // STEP 5 — delete all IndexedDB databases (best-effort, future-proofing)
        try {
            if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
                const na__databases = await indexedDB.databases();                                                                   // <-- List all IDB databases
                await Promise.all(na__databases.map(db => indexedDB.deleteDatabase(db.name)));                                       // <-- Delete each
            }
        } catch (idbError) {
            console.warn('[PurgeCache] IndexedDB clear failed:', idbError);                                                          // <-- Non-blocking
        }

        console.log('%c[PurgeCache] Full cache purge complete — reloading for a clean session…', 'color:#006600;font-weight:bold;'); // <-- User feedback
        window.location.reload();                                                                                                    // <-- Brutally fresh load
        return true;                                                                                                                 // <-- Indicator (page unloads before this matters)
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bootstrap
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Install "--ClearCache" Console Shortcut
    // ---------------------------------------------------------------
    // Defines a side-effecting getter on window named `ClearCache` so a
    // developer can simply type `--ClearCache` (or `ClearCache`) into the
    // browser console to wipe every PWA cache, unregister the service worker
    // and reload — no postMessage boilerplate. The getter only fires on Enter:
    // Chrome's side-effect-free eager-evaluation preview never triggers it,
    // and the `--` decrement's write-back to a getter-only property is a
    // silent no-op in the console's sloppy-mode evaluation.
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Registrar__InstallConsoleShortcut() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        try {
            Object.defineProperty(window, 'ClearCache', {                                                                          // <-- Type `--ClearCache` or `ClearCache` in console
                configurable : true,                                                                                                // <-- Allow redefine on hot reload
                get() {
                    Whitecardopedia__Pwa__ServiceWorker__Registrar__HardResetAndReload();                                          // <-- Fire the full reset
                    return 'Clearing Whitecardopedia caches and reloading…';                                                       // <-- Friendly console echo
                }
            });
        } catch (defineError) {
            console.warn('[ClearCache] Could not install console shortcut:', defineError);                                          // <-- Non-blocking
        }

        window.na_clear_cache = Whitecardopedia__Pwa__ServiceWorker__Registrar__HardResetAndReload;                                 // <-- Programmatic alias: na_clear_cache()
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Bootstrap Registration
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__ServiceWorker__Registrar__Bootstrap() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        window.Whitecardopedia__Pwa__ServiceWorker__Registrar = {                                                                   // <-- Expose registrar API
            register        : Whitecardopedia__Pwa__ServiceWorker__Registrar__Register,
            getRegistration : Whitecardopedia__Pwa__ServiceWorker__Registrar__GetRegistration,
            clearCaches     : Whitecardopedia__Pwa__ServiceWorker__Registrar__ClearCaches,
            hardReset       : Whitecardopedia__Pwa__ServiceWorker__Registrar__HardResetAndReload,
            purgeAppCache   : Whitecardopedia__Pwa__ServiceWorker__Registrar__PurgeAppCacheAndReload   // <-- Brutal full purge (preserves auth tokens)
        };

        Whitecardopedia__Pwa__ServiceWorker__Registrar__InstallConsoleShortcut();                                                  // <-- Wire the `--ClearCache` console helper

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
