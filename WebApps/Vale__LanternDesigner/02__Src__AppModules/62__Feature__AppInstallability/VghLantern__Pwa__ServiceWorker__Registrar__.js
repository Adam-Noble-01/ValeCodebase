/* =============================================================================
   VGHLANTERN - PWA SERVICE WORKER REGISTRAR
   =============================================================================

   FILE       : VghLantern__Pwa__ServiceWorker__Registrar__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__Pwa__ServiceWorker__Registrar
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Register the Lantern Designer service worker and own cache resets
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Reads the service worker URL and scope from VghLantern__Pwa__Url so all path
     resolution stays in one place and survives a move between localhost and a
     hosted sub-path.
   - Skips registration on insecure origins (file://, remote http://) to avoid the
     browser's "must be served over HTTPS" warning.
   - Bridges controllerchange to a single guarded reload so a newly activated
     worker cannot leave the page running a half-old module graph. The reload is
     deferred while window.VghLantern__App__SuppressReload is true, which any
     long-running operation may set to protect itself.
   - Provides three escalating reset routes, all reachable from the console:
       clearCaches()   - message the worker to drop its own buckets
       hardReset()     - wipe Cache Storage, unregister workers, reload
       purgeAppCache() - as above plus storage, preserving saved project data
   - Project data is preserved by prefix during a purge. Lantern Designer mirrors
     every project into localStorage, and on the hosted read-only build that
     mirror is the only copy, so a purge must never take it.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Registration State Cache
    // ------------------------------------------------------------
    var VghLantern__Pwa__ServiceWorker__Registrar__Started      = false;                                          // <-- Idempotent boot flag
    var VghLantern__Pwa__ServiceWorker__Registrar__Registration = null;                                           // <-- Active ServiceWorkerRegistration
    // ------------------------------------------------------------


    // MODULE CONSTANTS | localStorage Key Prefixes Preserved During a Purge
    // ------------------------------------------------------------
    var PWA_PRESERVE_LOCALSTORAGE_PREFIXES = [
        'VghLantern__Project__',                                                                                  // <-- Individual project records
        'VghLantern__ProjectManifest'                                                                             // <-- Project list manifest
    ];
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Service Worker Message Tokens
    // ------------------------------------------------------------
    var PWA_SW_MESSAGE_CLEAR_CACHES = 'vghlantern-clear-caches';                                                  // <-- Cache reset request token
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Determine Whether Registration Is Allowed
    // ---------------------------------------------------------------
    function VghLantern__Pwa__ServiceWorker__Registrar__IsRegistrationAllowed() {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;                    // <-- API unavailable
        if (typeof window === 'undefined') return false;                                                          // <-- Non-window context

        var protocol = window.location.protocol;                                                                  // <-- Page protocol
        var hostname = window.location.hostname;                                                                  // <-- Page hostname

        if (protocol === 'https:') return true;                                                                   // <-- HTTPS is always allowed
        if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0')) return true; // <-- Local development
        return false;                                                                                              // <-- Block file:// and remote http://
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Service Worker URL and Scope
    // ---------------------------------------------------------------
    function VghLantern__Pwa__ServiceWorker__Registrar__ResolveTargets() {
        var urlHelper = window.VghLantern__Pwa__Url || null;                                                      // <-- Resolve the URL helper
        if (!urlHelper) return null;                                                                              // <-- No helper available

        var serviceWorkerUrl   = urlHelper.getServiceWorkerUrl();                                                  // <-- Absolute worker script URL
        var serviceWorkerScope = urlHelper.getServiceWorkerScope();                                                // <-- Scope URL

        if (!serviceWorkerUrl || !serviceWorkerScope) return null;                                                 // <-- Validate the output
        return { url: serviceWorkerUrl, scope: serviceWorkerScope };                                               // <-- Composite descriptor
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Bridge controllerchange to a Guarded Reload
    // ---------------------------------------------------------------
    // A sessionStorage guard prevents a reload loop. If a long-running operation
    // has raised window.VghLantern__App__SuppressReload, the reload is deferred
    // until that flag clears, or abandoned after the polling window expires.
    // ---------------------------------------------------------------
    function VghLantern__Pwa__ServiceWorker__Registrar__BridgeControllerChange() {
        if (!navigator.serviceWorker) return;                                                                     // <-- Guard: service workers unavailable

        var RELOAD_SESSION_KEY      = 'vghlantern-sw-reload-done';                                                // <-- sessionStorage guard key
        var RELOAD_POLL_MAX_MS      = 30000;                                                                      // <-- Maximum wait before abandoning
        var RELOAD_POLL_INTERVAL_MS = 500;                                                                        // <-- Poll interval

        navigator.serviceWorker.addEventListener('controllerchange', function () {
            try {
                if (sessionStorage.getItem(RELOAD_SESSION_KEY)) return;                                           // <-- Already reloaded this session
                sessionStorage.setItem(RELOAD_SESSION_KEY, '1');                                                  // <-- Mark before any async work
            } catch (storageError) {
                // Storage blocked: fall through and reload once, the guard is a nicety
            }

            var pollElapsedMs = 0;                                                                                // <-- Elapsed polling time

            function VghLantern__Pwa__AttemptReload() {
                var isSuppressed = window.VghLantern__App__SuppressReload === true;                               // <-- Check the in-flight work flag

                if (!isSuppressed) {
                    console.log('[VghLantern SW] Controller changed, reloading for a consistent module graph.');
                    window.location.reload();                                                                     // <-- Safe to reload now
                    return;
                }

                pollElapsedMs += RELOAD_POLL_INTERVAL_MS;
                if (pollElapsedMs >= RELOAD_POLL_MAX_MS) {
                    console.warn('[VghLantern SW] Controller changed but work is still in flight, skipping reload.');
                    return;                                                                                        // <-- Give up rather than interrupt
                }

                setTimeout(VghLantern__Pwa__AttemptReload, RELOAD_POLL_INTERVAL_MS);                              // <-- Poll again
            }

            VghLantern__Pwa__AttemptReload();                                                                     // <-- Start the poll loop
        });
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Bridge appinstalled to Session State
    // ---------------------------------------------------------------
    function VghLantern__Pwa__ServiceWorker__Registrar__BridgeAppInstalled() {
        if (typeof window === 'undefined') return;                                                                // <-- Guard non-window contexts

        window.addEventListener('appinstalled', function () {
            if (window.VghLantern__Pwa__SessionState && window.VghLantern__Pwa__SessionState.markInstalled) {
                window.VghLantern__Pwa__SessionState.markInstalled();                                             // <-- Persist the install state
            }
            if (window.VghLantern__Pwa__PromptUi && window.VghLantern__Pwa__PromptUi.hide) {
                window.VghLantern__Pwa__PromptUi.hide();                                                          // <-- Hide any visible banner
            }
        });
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Report Whether a Storage Key Must Survive a Purge
    // ---------------------------------------------------------------
    function VghLantern__Pwa__ServiceWorker__Registrar__IsPreservedKey(storageKey) {
        for (var prefixIndex = 0; prefixIndex < PWA_PRESERVE_LOCALSTORAGE_PREFIXES.length; prefixIndex += 1) {
            if (String(storageKey).indexOf(PWA_PRESERVE_LOCALSTORAGE_PREFIXES[prefixIndex]) === 0) return true;   // <-- Prefix match, preserve
        }
        return false;                                                                                              // <-- Not a protected key
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Register the Service Worker (Idempotent)
    // ------------------------------------------------------------
    async function VghLantern__Pwa__ServiceWorker__Registrar__Register() {
        if (VghLantern__Pwa__ServiceWorker__Registrar__Started) {
            return VghLantern__Pwa__ServiceWorker__Registrar__Registration;                                       // <-- Return the cached handle
        }
        VghLantern__Pwa__ServiceWorker__Registrar__Started = true;                                                // <-- Mark as started

        if (!VghLantern__Pwa__ServiceWorker__Registrar__IsRegistrationAllowed()) {
            return null;                                                                                           // <-- Skip on file:// and remote http://
        }

        var targets = VghLantern__Pwa__ServiceWorker__Registrar__ResolveTargets();                                // <-- Resolve the URL and scope
        if (!targets) return null;                                                                                // <-- Bail without the URL helper

        try {
            var registration = await navigator.serviceWorker.register(targets.url, { scope: targets.scope });     // <-- Register the service worker
            VghLantern__Pwa__ServiceWorker__Registrar__Registration = registration;                               // <-- Persist the registration
            VghLantern__Pwa__ServiceWorker__Registrar__BridgeControllerChange();                                  // <-- Wire controllerchange to a guarded reload
            VghLantern__Pwa__ServiceWorker__Registrar__BridgeAppInstalled();                                      // <-- Wire appinstalled to session state
            return registration;                                                                                   // <-- Return the handle
        } catch (registrationError) {
            console.warn('VghLantern PWA service worker registration failed:', registrationError);                // <-- Log non-blocking
            return null;                                                                                           // <-- Allow the app to continue
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Get the Active Registration (Diagnostic)
    // ------------------------------------------------------------
    function VghLantern__Pwa__ServiceWorker__Registrar__GetRegistration() {
        return VghLantern__Pwa__ServiceWorker__Registrar__Registration;                                           // <-- May be null
    }
    // ---------------------------------------------------------------


    // FUNCTION | Send a Cache Reset Message to the Active Worker
    // ------------------------------------------------------------
    async function VghLantern__Pwa__ServiceWorker__Registrar__ClearCaches() {
        if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return false;                        // <-- No active controller
        navigator.serviceWorker.controller.postMessage({ type: PWA_SW_MESSAGE_CLEAR_CACHES });                    // <-- Trigger worker cleanup
        return true;                                                                                               // <-- Best-effort indicator
    }
    // ---------------------------------------------------------------


    // FUNCTION | Hard Reset, Wipe All Caches, Unregister, Then Reload
    // ------------------------------------------------------------
    // Controller-independent reset:
    //   1. Delete every Cache Storage bucket.
    //   2. Unregister every service worker under this scope.
    //   3. Reload so a fresh module graph and a clean worker install occur.
    // Saved project data in localStorage is untouched.
    // ------------------------------------------------------------
    async function VghLantern__Pwa__ServiceWorker__Registrar__HardResetAndReload() {
        try {
            if ('caches' in window) {
                var allCacheNames = await caches.keys();                                                          // <-- Every Cache Storage bucket
                await Promise.all(allCacheNames.map(function (name) { return caches.delete(name); }));            // <-- Drop them all
            }
        } catch (cacheError) {
            console.warn('[VghLantern ClearCache] Cache deletion failed:', cacheError);                           // <-- Non-blocking
        }

        try {
            if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                var registrations = await navigator.serviceWorker.getRegistrations();                             // <-- All registrations
                await Promise.all(registrations.map(function (reg) { return reg.unregister(); }));                // <-- Unregister each
            }
        } catch (workerError) {
            console.warn('[VghLantern ClearCache] Service worker unregister failed:', workerError);               // <-- Non-blocking
        }

        console.log('%c[VghLantern ClearCache] Caches cleared and service worker unregistered, reloading.', 'color:#006600;font-weight:bold;');
        window.location.reload();                                                                                  // <-- Fresh load
        return true;                                                                                               // <-- Page unloads before this matters
    }
    // ---------------------------------------------------------------


    // FUNCTION | Purge App Cache, Full Reset With Project Data Preserved
    // ------------------------------------------------------------
    // Wipes all client-side state so the app behaves as though it has never been
    // opened, while preserving saved projects. Clears in order:
    //   1. All Cache Storage buckets.
    //   2. All service worker registrations.
    //   3. All localStorage keys except the preserved project prefixes.
    //   4. All sessionStorage keys.
    // Then reloads for a completely fresh session.
    // ------------------------------------------------------------
    async function VghLantern__Pwa__ServiceWorker__Registrar__PurgeAppCacheAndReload() {

        // STEP 1 | Snapshot the protected project keys before touching storage
        var preservedEntries = {};
        try {
            for (var keyIndex = 0; keyIndex < localStorage.length; keyIndex += 1) {
                var storageKey = localStorage.key(keyIndex);                                                      // <-- Enumerate every key
                if (!VghLantern__Pwa__ServiceWorker__Registrar__IsPreservedKey(storageKey)) continue;             // <-- Skip unprotected keys
                var storageValue = localStorage.getItem(storageKey);
                if (storageValue !== null) preservedEntries[storageKey] = storageValue;                           // <-- Save for restoration
            }
        } catch (snapshotError) {
            console.warn('[VghLantern PurgeCache] Could not snapshot project data, aborting purge:', snapshotError);
            return false;                                                                                          // <-- Never purge without a snapshot
        }

        // STEP 2 | Delete all Cache Storage buckets
        try {
            if ('caches' in window) {
                var cacheNames = await caches.keys();                                                             // <-- Every Cache Storage bucket
                await Promise.all(cacheNames.map(function (name) { return caches.delete(name); }));               // <-- Wipe every bucket
            }
        } catch (cacheError) {
            console.warn('[VghLantern PurgeCache] Cache deletion failed:', cacheError);                           // <-- Non-blocking
        }

        // STEP 3 | Unregister all service workers
        try {
            if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                var registrations = await navigator.serviceWorker.getRegistrations();                             // <-- All registrations
                await Promise.all(registrations.map(function (reg) { return reg.unregister(); }));                // <-- Unregister each
            }
        } catch (workerError) {
            console.warn('[VghLantern PurgeCache] Service worker unregister failed:', workerError);               // <-- Non-blocking
        }

        // STEP 4 | Clear storage, then restore the protected project keys
        try {
            localStorage.clear();                                                                                  // <-- Clear all keys
            Object.keys(preservedEntries).forEach(function (storageKey) {
                localStorage.setItem(storageKey, preservedEntries[storageKey]);                                   // <-- Restore preserved project data
            });
            sessionStorage.clear();                                                                                // <-- Clear all session state
        } catch (storageError) {
            console.warn('[VghLantern PurgeCache] Storage clear failed:', storageError);                          // <-- Non-blocking
        }

        console.log('%c[VghLantern PurgeCache] Full purge complete, projects preserved, reloading.', 'color:#006600;font-weight:bold;');
        window.location.reload();                                                                                  // <-- Fresh session
        return true;                                                                                               // <-- Page unloads before this matters
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bootstrap
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Install the ClearCache Console Shortcut
    // ---------------------------------------------------------------
    // Defines a side-effecting getter on window named ClearCache so typing
    // ClearCache into the browser console wipes every cache, unregisters the
    // worker and reloads, with no postMessage boilerplate. The getter only fires
    // on Enter: eager-evaluation previews are side-effect free and never trigger it.
    // ---------------------------------------------------------------
    function VghLantern__Pwa__ServiceWorker__Registrar__InstallConsoleShortcut() {
        if (typeof window === 'undefined') return;                                                                // <-- Guard non-window contexts

        try {
            Object.defineProperty(window, 'ClearCache', {                                                         // <-- Type ClearCache in the console
                configurable : true,                                                                              // <-- Allow redefinition on reload
                get : function () {
                    VghLantern__Pwa__ServiceWorker__Registrar__HardResetAndReload();                              // <-- Fire the full reset
                    return 'Clearing Lantern Designer caches and reloading.';                                     // <-- Console echo
                }
            });
        } catch (defineError) {
            console.warn('[VghLantern ClearCache] Could not install the console shortcut:', defineError);         // <-- Non-blocking
        }

        window.vghlantern_clear_cache = VghLantern__Pwa__ServiceWorker__Registrar__HardResetAndReload;            // <-- Programmatic alias
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Bootstrap Registration
    // ---------------------------------------------------------------
    function VghLantern__Pwa__ServiceWorker__Registrar__Bootstrap() {
        if (typeof window === 'undefined') return;                                                                // <-- Guard non-window contexts

        window.VghLantern__Pwa__ServiceWorker__Registrar = {                                                      // <-- Expose the registrar API
            register        : VghLantern__Pwa__ServiceWorker__Registrar__Register,
            getRegistration : VghLantern__Pwa__ServiceWorker__Registrar__GetRegistration,
            clearCaches     : VghLantern__Pwa__ServiceWorker__Registrar__ClearCaches,
            hardReset       : VghLantern__Pwa__ServiceWorker__Registrar__HardResetAndReload,
            purgeAppCache   : VghLantern__Pwa__ServiceWorker__Registrar__PurgeAppCacheAndReload
        };

        VghLantern__Pwa__ServiceWorker__Registrar__InstallConsoleShortcut();                                      // <-- Wire the ClearCache console helper

        var startRegistration = function () { VghLantern__Pwa__ServiceWorker__Registrar__Register(); };           // <-- Local reference

        if (document.readyState === 'complete') {
            startRegistration();                                                                                   // <-- Already loaded
            return;
        }

        window.addEventListener('load', startRegistration, { once: true });                                       // <-- Defer until window load
    }
    // ---------------------------------------------------------------


    VghLantern__Pwa__ServiceWorker__Registrar__Bootstrap();                                                       // <-- Kick off bootstrap

// endregion -------------------------------------------------------------------

})();
