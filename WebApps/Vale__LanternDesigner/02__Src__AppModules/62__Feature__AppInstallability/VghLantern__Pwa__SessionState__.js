/* =============================================================================
   VGHLANTERN - PWA SESSION STATE TRACKER
   =============================================================================

   FILE       : VghLantern__Pwa__SessionState__.js
   NAMESPACE  : VghLantern
   MODULE     : VghLantern__Pwa__SessionState
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Persist install-prompt dismissal state with an escalating snooze
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Stores dismissal counts and snooze deadlines per platform in localStorage so
     the user is not asked to install on every visit.
   - Snooze ladder escalates 1 minute, 1 hour, 1 day, 1 week, 1 month.
   - Falls back to an in-memory store when localStorage is unavailable (private
     browsing, sandboxed frames) so the app never throws.
   - An install marker suppresses the prompt permanently once the app is
     installed, independent of the snooze ladder.

   ============================================================================= */

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Storage Key and Schema Version
    // ------------------------------------------------------------
    var SESSION_STATE_STORAGE_KEY       = 'VghLantern__Pwa__SessionState__v1';                                    // <-- localStorage key
    var SESSION_STATE_SCHEMA_VERSION    = 1;                                                                      // <-- Schema version for future migrations
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Snooze Ladder in Milliseconds
    // ------------------------------------------------------------
    var SESSION_STATE_SNOOZE_LADDER_MS  = [                                                                       // <-- Escalating snooze schedule
        60 * 1000,                                                                                                // <-- 1st dismissal: 1 minute
        60 * 60 * 1000,                                                                                           // <-- 2nd dismissal: 1 hour
        24 * 60 * 60 * 1000,                                                                                      // <-- 3rd dismissal: 1 day
        7 * 24 * 60 * 60 * 1000,                                                                                  // <-- 4th dismissal: 1 week
        30 * 24 * 60 * 60 * 1000                                                                                  // <-- 5th and later: 1 month
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | Fallback In-Memory Store
    // ------------------------------------------------------------
    var VghLantern__Pwa__SessionState__InMemoryFallback = null;                                                   // <-- Used when localStorage is blocked
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Storage Layer
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Probe localStorage Availability
    // ---------------------------------------------------------------
    function VghLantern__Pwa__SessionState__IsLocalStorageAvailable() {
        try {
            if (typeof window === 'undefined' || !window.localStorage) return false;                              // <-- Guard non-window contexts
            var probeKey    = SESSION_STATE_STORAGE_KEY + '__probe__';                                            // <-- Probe key
            window.localStorage.setItem(probeKey, '1');                                                           // <-- Attempt a write
            window.localStorage.removeItem(probeKey);                                                             // <-- Clean up the probe entry
            return true;                                                                                          // <-- localStorage usable
        } catch (probeError) {
            return false;                                                                                         // <-- localStorage blocked or full
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Empty State Object
    // ---------------------------------------------------------------
    function VghLantern__Pwa__SessionState__BuildEmptyState() {
        return {
            schemaVersion       : SESSION_STATE_SCHEMA_VERSION,
            installCompletedAt  : null,                                                                           // <-- Epoch ms when appinstalled fired
            globalSuppressUntil : null,                                                                           // <-- Epoch ms, full suppression deadline
            perPlatform         : {}                                                                              // <-- Map of platformId to { dismissCount, snoozeUntil }
        };
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Read Raw State from Storage
    // ---------------------------------------------------------------
    function VghLantern__Pwa__SessionState__ReadRawState() {
        if (!VghLantern__Pwa__SessionState__IsLocalStorageAvailable()) {
            if (!VghLantern__Pwa__SessionState__InMemoryFallback) {
                VghLantern__Pwa__SessionState__InMemoryFallback = VghLantern__Pwa__SessionState__BuildEmptyState(); // <-- Lazy-init the in-memory store
            }
            return VghLantern__Pwa__SessionState__InMemoryFallback;                                               // <-- Use in-memory state
        }

        try {
            var rawValue    = window.localStorage.getItem(SESSION_STATE_STORAGE_KEY);                             // <-- Read raw JSON
            if (!rawValue) return VghLantern__Pwa__SessionState__BuildEmptyState();                               // <-- Initialise on first run

            var parsedValue = JSON.parse(rawValue);                                                               // <-- Parse the stored value

            if (!parsedValue || parsedValue.schemaVersion !== SESSION_STATE_SCHEMA_VERSION) {
                return VghLantern__Pwa__SessionState__BuildEmptyState();                                          // <-- Reset on schema mismatch
            }

            if (!parsedValue.perPlatform || typeof parsedValue.perPlatform !== 'object') {
                parsedValue.perPlatform = {};                                                                     // <-- Repair a missing map
            }

            return parsedValue;                                                                                    // <-- Return live state
        } catch (readError) {
            return VghLantern__Pwa__SessionState__BuildEmptyState();                                              // <-- Reset on parse failure
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Write Raw State to Storage
    // ---------------------------------------------------------------
    function VghLantern__Pwa__SessionState__WriteRawState(stateObject) {
        if (!VghLantern__Pwa__SessionState__IsLocalStorageAvailable()) {
            VghLantern__Pwa__SessionState__InMemoryFallback = stateObject;                                        // <-- Persist to memory only
            return;
        }

        try {
            window.localStorage.setItem(SESSION_STATE_STORAGE_KEY, JSON.stringify(stateObject));                  // <-- Persist to localStorage
        } catch (writeError) {
            VghLantern__Pwa__SessionState__InMemoryFallback = stateObject;                                        // <-- Fall back if quota is exceeded
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Get Snooze Duration for a Dismissal Count
    // ------------------------------------------------------------
    function VghLantern__Pwa__SessionState__GetSnoozeDurationMs(dismissalCount) {
        var safeIndex   = Math.max(0, Math.min(SESSION_STATE_SNOOZE_LADDER_MS.length - 1, dismissalCount - 1));    // <-- Clamp to ladder bounds
        return SESSION_STATE_SNOOZE_LADDER_MS[safeIndex];                                                          // <-- Return the ladder entry
    }
    // ---------------------------------------------------------------


    // FUNCTION | Read Per-Platform Snapshot
    // ------------------------------------------------------------
    function VghLantern__Pwa__SessionState__ReadPlatformSnapshot(platformId) {
        var stateObject     = VghLantern__Pwa__SessionState__ReadRawState();                                      // <-- Load the full state
        var platformEntry   = stateObject.perPlatform[platformId] || { dismissCount: 0, snoozeUntil: null };       // <-- Default empty entry

        return {
            installCompletedAt  : stateObject.installCompletedAt,
            globalSuppressUntil : stateObject.globalSuppressUntil,
            dismissCount        : Number(platformEntry.dismissCount || 0),
            snoozeUntil         : platformEntry.snoozeUntil ? Number(platformEntry.snoozeUntil) : null
        };
    }
    // ---------------------------------------------------------------


    // FUNCTION | Determine Whether the Prompt Is Suppressed Right Now
    // ------------------------------------------------------------
    function VghLantern__Pwa__SessionState__IsSuppressed(platformId) {
        var snapshot    = VghLantern__Pwa__SessionState__ReadPlatformSnapshot(platformId);                        // <-- Read the current snapshot
        var nowEpochMs  = Date.now();                                                                             // <-- Current time

        if (snapshot.installCompletedAt) return true;                                                             // <-- Already installed, always suppress
        if (snapshot.globalSuppressUntil && nowEpochMs < snapshot.globalSuppressUntil) return true;                // <-- Global suppression active
        if (snapshot.snoozeUntil && nowEpochMs < snapshot.snoozeUntil) return true;                                // <-- Per-platform snooze active

        return false;                                                                                              // <-- Not suppressed
    }
    // ---------------------------------------------------------------


    // FUNCTION | Record a Prompt Dismissal and Advance the Snooze
    // ------------------------------------------------------------
    function VghLantern__Pwa__SessionState__RecordDismissal(platformId) {
        var stateObject     = VghLantern__Pwa__SessionState__ReadRawState();                                      // <-- Load the full state
        var previousEntry   = stateObject.perPlatform[platformId] || { dismissCount: 0, snoozeUntil: null };       // <-- Existing entry

        var nextDismissCount = Number(previousEntry.dismissCount || 0) + 1;                                       // <-- Increment the count
        var snoozeDurationMs = VghLantern__Pwa__SessionState__GetSnoozeDurationMs(nextDismissCount);              // <-- Look up the ladder duration
        var nextSnoozeUntil  = Date.now() + snoozeDurationMs;                                                     // <-- Compute the next deadline

        stateObject.perPlatform[platformId] = {                                                                   // <-- Update the entry
            dismissCount    : nextDismissCount,
            snoozeUntil     : nextSnoozeUntil
        };

        VghLantern__Pwa__SessionState__WriteRawState(stateObject);                                                // <-- Persist back

        return { dismissCount: nextDismissCount, snoozeUntil: nextSnoozeUntil };                                  // <-- Return the new snapshot
    }
    // ---------------------------------------------------------------


    // FUNCTION | Reset State for a Platform
    // ------------------------------------------------------------
    function VghLantern__Pwa__SessionState__ResetPlatform(platformId) {
        var stateObject     = VghLantern__Pwa__SessionState__ReadRawState();                                      // <-- Load the full state
        if (stateObject.perPlatform[platformId]) {
            delete stateObject.perPlatform[platformId];                                                            // <-- Remove the platform entry
            VghLantern__Pwa__SessionState__WriteRawState(stateObject);                                            // <-- Persist
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Mark the App as Installed
    // ------------------------------------------------------------
    function VghLantern__Pwa__SessionState__MarkInstalled() {
        var stateObject     = VghLantern__Pwa__SessionState__ReadRawState();                                      // <-- Load the full state
        stateObject.installCompletedAt = Date.now();                                                              // <-- Stamp the install moment
        VghLantern__Pwa__SessionState__WriteRawState(stateObject);                                                // <-- Persist
    }
    // ---------------------------------------------------------------


    // FUNCTION | Apply a Global Suppression Window
    // ------------------------------------------------------------
    function VghLantern__Pwa__SessionState__SuppressGlobally(durationMs) {
        var stateObject     = VghLantern__Pwa__SessionState__ReadRawState();                                      // <-- Load the full state
        stateObject.globalSuppressUntil = Date.now() + Math.max(0, Number(durationMs) || 0);                      // <-- Compute the deadline
        VghLantern__Pwa__SessionState__WriteRawState(stateObject);                                                // <-- Persist
    }
    // ---------------------------------------------------------------


    // FUNCTION | Reset All State (Diagnostic and Reinstall Flow)
    // ------------------------------------------------------------
    function VghLantern__Pwa__SessionState__ResetAll() {
        VghLantern__Pwa__SessionState__WriteRawState(VghLantern__Pwa__SessionState__BuildEmptyState());           // <-- Replace with a clean state
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Global Session State Namespace
    // ------------------------------------------------------------
    function VghLantern__Pwa__SessionState__InitializeGlobalNamespace() {
        if (typeof window === 'undefined') return;                                                                 // <-- Guard non-window contexts

        window.VghLantern__Pwa__SessionState = {                                                                   // <-- Public API surface
            readPlatformSnapshot : VghLantern__Pwa__SessionState__ReadPlatformSnapshot,
            isSuppressed         : VghLantern__Pwa__SessionState__IsSuppressed,
            recordDismissal      : VghLantern__Pwa__SessionState__RecordDismissal,
            resetPlatform        : VghLantern__Pwa__SessionState__ResetPlatform,
            markInstalled        : VghLantern__Pwa__SessionState__MarkInstalled,
            suppressGlobally     : VghLantern__Pwa__SessionState__SuppressGlobally,
            resetAll             : VghLantern__Pwa__SessionState__ResetAll
        };
    }
    // ---------------------------------------------------------------


    VghLantern__Pwa__SessionState__InitializeGlobalNamespace();                                                    // <-- Mount on window immediately

// endregion -------------------------------------------------------------------

})();
