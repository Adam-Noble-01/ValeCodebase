/* =============================================================================
   VGHLANTERN - WEB DEMO MODE | ENVIRONMENT DETECTOR
   =============================================================================

   FILE       : VghLantern__WebDemoMode__EnvironmentDetector__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__WebDemoMode__EnvironmentDetector
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Classify the runtime as full local mode or hosted demo mode
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Lantern Designer persists projects through the local Flask server, which
     writes JSON files into 07__LocalProjectData. Every loader in the app already
     falls back to a static file, and the project file manager already falls back
     to localStorage when the server is unreachable, so the app runs perfectly
     well without a server. What it cannot do without one is write to disk.
   - That gap is invisible by default: a save succeeds into localStorage and the
     user has no way to know their work never reached a file. This module exists
     to make it visible.
   - Detection is hostname first so the answer is available synchronously with no
     race against the boot sequence, then confirmed by a health probe:
       * Not localhost                -> demo mode, resolved immediately.
       * Localhost, health responds   -> full mode.
       * Localhost, health fails      -> demo mode. Catches the case of opening
                                         the app without starting the server.
   - The health probe only runs on localhost. Probing on the hosted build would
     add a guaranteed 404 to the console for no information gain.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Detection Configuration
    // ------------------------------------------------------------
    var WEB_DEMO_LOCALHOST_HOSTS        = ['localhost', '127.0.0.1', '0.0.0.0'];                                  // <-- Hostnames treated as local development
    var WEB_DEMO_HEALTH_PATH            = 'api/system/health';                                                    // <-- Flask health route, matches the connection monitor
    var WEB_DEMO_HEALTH_TIMEOUT_MS      = 4000;                                                                   // <-- Give up on a silent server after this long
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Mode Tokens and Event Name
    // ------------------------------------------------------------
    var WEB_DEMO_MODE_FULL              = 'full';                                                                 // <-- Local server present, disk writes work
    var WEB_DEMO_MODE_DEMO              = 'demo';                                                                 // <-- No server, browser storage only
    var WEB_DEMO_MODE_PENDING           = 'pending';                                                              // <-- Health probe still in flight
    var WEB_DEMO_RESOLVED_EVENT_NAME    = 'vghlantern-webdemomode-resolved';                                      // <-- Dispatched once the mode is final
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Document Root Attribute
    // ------------------------------------------------------------
    var WEB_DEMO_ROOT_ATTRIBUTE         = 'data-vghlantern-runtime-mode';                                         // <-- Attribute stamped on the document root
    // ------------------------------------------------------------


    // MODULE VARIABLES | Resolution State
    // ------------------------------------------------------------
    var VghLantern__WebDemoMode__CurrentMode    = WEB_DEMO_MODE_PENDING;                                          // <-- Current classification
    var VghLantern__WebDemoMode__IsResolved     = false;                                                          // <-- True once the mode is final
    var VghLantern__WebDemoMode__ResolvePromise = null;                                                           // <-- Shared in-flight resolution
    var VghLantern__WebDemoMode__Subscribers    = [];                                                             // <-- Callbacks awaiting resolution
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Detect a Localhost Runtime
    // ---------------------------------------------------------------
    function VghLantern__WebDemoMode__IsLocalhost() {
        if (typeof window === 'undefined') return false;                                                          // <-- Guard non-window contexts
        var hostname    = window.location.hostname || '';                                                         // <-- Current hostname
        return WEB_DEMO_LOCALHOST_HOSTS.indexOf(hostname) !== -1;                                                 // <-- Match against the localhost list
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Probe the Local Server Health Route
    // ---------------------------------------------------------------
    async function VghLantern__WebDemoMode__ProbeServerHealth() {
        var abortController = (typeof AbortController !== 'undefined') ? new AbortController() : null;             // <-- Optional abort support
        var timeoutHandle   = null;                                                                               // <-- Timeout handle for cleanup

        try {
            if (abortController) {
                timeoutHandle = setTimeout(function () { abortController.abort(); }, WEB_DEMO_HEALTH_TIMEOUT_MS);  // <-- Do not hang on a silent server
            }

            var response = await fetch(WEB_DEMO_HEALTH_PATH, {
                method  : 'GET',
                cache   : 'no-store',                                                                             // <-- Always ask the server, never the cache
                signal  : abortController ? abortController.signal : undefined
            });

            return Boolean(response && response.ok);                                                              // <-- A 2xx means the server is live
        } catch (probeError) {
            return false;                                                                                         // <-- Any failure means no server
        } finally {
            if (timeoutHandle) clearTimeout(timeoutHandle);                                                       // <-- Always clear the timer
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Apply the Resolved Mode and Notify Subscribers
    // ---------------------------------------------------------------
    function VghLantern__WebDemoMode__ApplyResolvedMode(resolvedMode) {
        VghLantern__WebDemoMode__CurrentMode = resolvedMode;                                                      // <-- Persist the classification
        VghLantern__WebDemoMode__IsResolved  = true;                                                              // <-- Mark as final

        try {
            if (typeof document !== 'undefined' && document.documentElement) {
                document.documentElement.setAttribute(WEB_DEMO_ROOT_ATTRIBUTE, resolvedMode);                     // <-- Let stylesheets react to the mode
            }
        } catch (attributeError) {
            // Silent: the attribute is a styling convenience and must never break boot
        }

        var subscriberList = VghLantern__WebDemoMode__Subscribers.slice();                                        // <-- Snapshot before invoking
        VghLantern__WebDemoMode__Subscribers.length = 0;                                                          // <-- Each subscriber fires once

        subscriberList.forEach(function (callback) {
            try { callback(resolvedMode); }                                                                       // <-- Notify the subscriber
            catch (callbackError) { console.warn('VghLantern web demo mode subscriber failed:', callbackError); } // <-- Log non-blocking
        });

        try {
            window.dispatchEvent(new CustomEvent(WEB_DEMO_RESOLVED_EVENT_NAME, { detail: { mode: resolvedMode } })); // <-- Broadcast for late listeners
        } catch (eventError) {
            // Silent: the event is an optional convenience
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Runtime Mode (Memoised)
    // ------------------------------------------------------------
    function VghLantern__WebDemoMode__Resolve() {
        if (VghLantern__WebDemoMode__ResolvePromise) return VghLantern__WebDemoMode__ResolvePromise;              // <-- Share the in-flight resolution

        VghLantern__WebDemoMode__ResolvePromise = (async function () {

            if (!VghLantern__WebDemoMode__IsLocalhost()) {
                VghLantern__WebDemoMode__ApplyResolvedMode(WEB_DEMO_MODE_DEMO);                                   // <-- Hosted build, no local server can exist
                return WEB_DEMO_MODE_DEMO;
            }

            var isServerLive = await VghLantern__WebDemoMode__ProbeServerHealth();                                // <-- Confirm the server is actually running
            var resolvedMode = isServerLive ? WEB_DEMO_MODE_FULL : WEB_DEMO_MODE_DEMO;                            // <-- Localhost without a server is still demo

            VghLantern__WebDemoMode__ApplyResolvedMode(resolvedMode);                                             // <-- Publish the result
            return resolvedMode;
        })();

        return VghLantern__WebDemoMode__ResolvePromise;
    }
    // ---------------------------------------------------------------


    // FUNCTION | Report Whether the App Is in Demo Mode
    // ------------------------------------------------------------
    // Before resolution completes this returns the hostname-based provisional
    // answer, which is already correct for every hosted visitor and only
    // provisional for the localhost case.
    // ------------------------------------------------------------
    function VghLantern__WebDemoMode__IsDemoMode() {
        if (VghLantern__WebDemoMode__IsResolved) {
            return VghLantern__WebDemoMode__CurrentMode === WEB_DEMO_MODE_DEMO;                                   // <-- Final answer
        }
        return !VghLantern__WebDemoMode__IsLocalhost();                                                           // <-- Provisional hostname answer
    }
    // ---------------------------------------------------------------


    // FUNCTION | Read the Current Mode Token
    // ------------------------------------------------------------
    function VghLantern__WebDemoMode__GetMode() {
        return VghLantern__WebDemoMode__CurrentMode;                                                              // <-- 'pending', 'full' or 'demo'
    }
    // ---------------------------------------------------------------


    // FUNCTION | Report Whether Resolution Has Completed
    // ------------------------------------------------------------
    function VghLantern__WebDemoMode__IsResolvedNow() {
        return VghLantern__WebDemoMode__IsResolved;                                                               // <-- True once the mode is final
    }
    // ---------------------------------------------------------------


    // FUNCTION | Register a Callback for Mode Resolution
    // ------------------------------------------------------------
    function VghLantern__WebDemoMode__WhenResolved(callback) {
        if (typeof callback !== 'function') return;                                                               // <-- Guard bad callbacks

        if (VghLantern__WebDemoMode__IsResolved) {
            try { callback(VghLantern__WebDemoMode__CurrentMode); }                                               // <-- Already resolved, fire immediately
            catch (callbackError) { console.warn('VghLantern web demo mode subscriber failed:', callbackError); }
            return;
        }

        VghLantern__WebDemoMode__Subscribers.push(callback);                                                      // <-- Queue until resolution
        VghLantern__WebDemoMode__Resolve();                                                                       // <-- Ensure resolution is under way
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Global Environment Detector Namespace
    // ------------------------------------------------------------
    function VghLantern__WebDemoMode__InitializeGlobalNamespace() {
        if (typeof window === 'undefined') return;                                                                // <-- Guard non-window contexts

        window.VghLantern__WebDemoMode__EnvironmentDetector = {                                                   // <-- Public API surface
            resolve      : VghLantern__WebDemoMode__Resolve,
            isDemoMode   : VghLantern__WebDemoMode__IsDemoMode,
            getMode      : VghLantern__WebDemoMode__GetMode,
            isResolved   : VghLantern__WebDemoMode__IsResolvedNow,
            whenResolved : VghLantern__WebDemoMode__WhenResolved,
            isLocalhost  : VghLantern__WebDemoMode__IsLocalhost,
            Modes : {
                Full    : WEB_DEMO_MODE_FULL,
                Demo    : WEB_DEMO_MODE_DEMO,
                Pending : WEB_DEMO_MODE_PENDING
            },
            ResolvedEventName : WEB_DEMO_RESOLVED_EVENT_NAME
        };
    }
    // ---------------------------------------------------------------


    // SUB FUNCTION | Bootstrap Detection
    // ---------------------------------------------------------------
    function VghLantern__WebDemoMode__Bootstrap() {
        VghLantern__WebDemoMode__InitializeGlobalNamespace();                                                     // <-- Mount the API immediately
        VghLantern__WebDemoMode__Resolve();                                                                       // <-- Start resolving without waiting to be asked
    }
    // ---------------------------------------------------------------


    VghLantern__WebDemoMode__Bootstrap();                                                                         // <-- Kick off bootstrap

// endregion -------------------------------------------------------------------

})();
