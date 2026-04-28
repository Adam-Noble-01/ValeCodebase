// =============================================================================
// WHITECARDOPEDIA - PWA SESSION STATE TRACKER
// =============================================================================
//
// FILE       : Whitecardopedia__Pwa__SessionState__.js
// NAMESPACE  : Whitecardopedia
// MODULE     : Whitecardopedia__Pwa__SessionState
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Persist install-prompt dismissal state with exponential snooze
// CREATED    : 2026
//
// DESCRIPTION:
// - Stores dismissal counts and snooze deadlines per platform under
//   localStorage keys so the user is not nagged on every visit.
// - Exposes simple read/write helpers used by the install controller and
//   per-platform handlers.
// - Snooze schedule (1 min -> 1 hr -> 1 day -> 1 wk -> 1 mo) follows the
//   pattern documented in the planning research.
// - Falls back to in-memory storage when localStorage is unavailable
//   (private mode, sandboxed iframes) so the app never throws.
//
// =============================================================================

(function () {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Storage Keys and Schema Version
    // ------------------------------------------------------------
    const SESSION_STATE_STORAGE_KEY         = 'Whitecardopedia__Pwa__SessionState__v1';                                             // <-- localStorage key
    const SESSION_STATE_SCHEMA_VERSION      = 1;                                                                                    // <-- Schema version for future migrations
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Snooze Ladder (milliseconds)
    // ------------------------------------------------------------
    const SESSION_STATE_SNOOZE_LADDER_MS    = [                                                                                     // <-- Exponential snooze schedule
        60 * 1000,                                                                                                                  // <-- 1st dismissal: 1 minute
        60 * 60 * 1000,                                                                                                             // <-- 2nd dismissal: 1 hour
        24 * 60 * 60 * 1000,                                                                                                        // <-- 3rd dismissal: 1 day
        7 * 24 * 60 * 60 * 1000,                                                                                                    // <-- 4th dismissal: 1 week
        30 * 24 * 60 * 60 * 1000                                                                                                    // <-- 5th+ dismissal: 1 month
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | Fallback In-Memory Store
    // ------------------------------------------------------------
    let Whitecardopedia__Pwa__SessionState__InMemoryFallback = null;                                                                // <-- Used when localStorage is blocked
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Storage Layer
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Probe localStorage Availability
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__IsLocalStorageAvailable() {
        try {
            if (typeof window === 'undefined' || !window.localStorage) return false;                                                // <-- Guard non-window context
            const probeKey      = `${SESSION_STATE_STORAGE_KEY}__probe__`;                                                          // <-- Probe key
            window.localStorage.setItem(probeKey, '1');                                                                             // <-- Attempt write
            window.localStorage.removeItem(probeKey);                                                                               // <-- Clean up probe entry
            return true;                                                                                                            // <-- localStorage usable
        } catch (error) {
            return false;                                                                                                           // <-- localStorage blocked or full
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Build Empty State Object
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__BuildEmptyState() {
        return {
            schemaVersion        : SESSION_STATE_SCHEMA_VERSION,
            installCompletedAt   : null,                                                                                            // <-- Epoch ms when appinstalled fired
            globalSuppressUntil  : null,                                                                                            // <-- Epoch ms; full suppression deadline
            perPlatform          : {}                                                                                               // <-- Map: platformId -> { dismissCount, snoozeUntil }
        };
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Read Raw State from Storage
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__ReadRawState() {
        if (!Whitecardopedia__Pwa__SessionState__IsLocalStorageAvailable()) {
            if (!Whitecardopedia__Pwa__SessionState__InMemoryFallback) {
                Whitecardopedia__Pwa__SessionState__InMemoryFallback = Whitecardopedia__Pwa__SessionState__BuildEmptyState();      // <-- Lazy-init in-memory store
            }
            return Whitecardopedia__Pwa__SessionState__InMemoryFallback;                                                            // <-- Use in-memory state
        }

        try {
            const rawValue      = window.localStorage.getItem(SESSION_STATE_STORAGE_KEY);                                           // <-- Read raw JSON
            if (!rawValue) return Whitecardopedia__Pwa__SessionState__BuildEmptyState();                                            // <-- Initialise on first run
            const parsedValue   = JSON.parse(rawValue);                                                                             // <-- Parse JSON value

            if (!parsedValue || parsedValue.schemaVersion !== SESSION_STATE_SCHEMA_VERSION) {
                return Whitecardopedia__Pwa__SessionState__BuildEmptyState();                                                       // <-- Reset on schema mismatch
            }

            if (!parsedValue.perPlatform || typeof parsedValue.perPlatform !== 'object') {
                parsedValue.perPlatform = {};                                                                                       // <-- Repair missing map
            }

            return parsedValue;                                                                                                     // <-- Return live state
        } catch (error) {
            return Whitecardopedia__Pwa__SessionState__BuildEmptyState();                                                           // <-- Reset on parse failure
        }
    }
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Write Raw State to Storage
    // ---------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__WriteRawState(stateObject) {
        if (!Whitecardopedia__Pwa__SessionState__IsLocalStorageAvailable()) {
            Whitecardopedia__Pwa__SessionState__InMemoryFallback = stateObject;                                                     // <-- Persist to memory only
            return;
        }

        try {
            window.localStorage.setItem(SESSION_STATE_STORAGE_KEY, JSON.stringify(stateObject));                                    // <-- Persist to localStorage
        } catch (error) {
            Whitecardopedia__Pwa__SessionState__InMemoryFallback = stateObject;                                                     // <-- Fallback if quota exceeded
        }
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Get Snooze Duration for Dismissal Count
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__GetSnoozeDurationMs(dismissalCount) {
        const safeIndex         = Math.max(0, Math.min(SESSION_STATE_SNOOZE_LADDER_MS.length - 1, dismissalCount - 1));             // <-- Clamp to ladder bounds
        return SESSION_STATE_SNOOZE_LADDER_MS[safeIndex];                                                                           // <-- Return ladder entry
    }
    // ---------------------------------------------------------------


    // FUNCTION | Read Per-Platform Snapshot
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__ReadPlatformSnapshot(platformId) {
        const stateObject       = Whitecardopedia__Pwa__SessionState__ReadRawState();                                               // <-- Load full state
        const platformEntry     = stateObject.perPlatform[platformId] || { dismissCount: 0, snoozeUntil: null };                    // <-- Default empty entry

        return {
            installCompletedAt  : stateObject.installCompletedAt,
            globalSuppressUntil : stateObject.globalSuppressUntil,
            dismissCount        : Number(platformEntry.dismissCount || 0),
            snoozeUntil         : platformEntry.snoozeUntil ? Number(platformEntry.snoozeUntil) : null
        };
    }
    // ---------------------------------------------------------------


    // FUNCTION | Determine if Prompt Should Be Suppressed Right Now
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__IsSuppressed(platformId) {
        const snapshot          = Whitecardopedia__Pwa__SessionState__ReadPlatformSnapshot(platformId);                             // <-- Read current snapshot
        const nowEpochMs        = Date.now();                                                                                       // <-- Current time

        if (snapshot.installCompletedAt) return true;                                                                               // <-- Already installed -> always suppress
        if (snapshot.globalSuppressUntil && nowEpochMs < snapshot.globalSuppressUntil) return true;                                 // <-- Global suppression active
        if (snapshot.snoozeUntil && nowEpochMs < snapshot.snoozeUntil) return true;                                                 // <-- Per-platform snooze active

        return false;                                                                                                               // <-- Not suppressed
    }
    // ---------------------------------------------------------------


    // FUNCTION | Record Prompt Dismissal and Advance Snooze
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__RecordDismissal(platformId) {
        const stateObject       = Whitecardopedia__Pwa__SessionState__ReadRawState();                                               // <-- Load full state
        const previousEntry     = stateObject.perPlatform[platformId] || { dismissCount: 0, snoozeUntil: null };                    // <-- Existing entry

        const nextDismissCount  = Number(previousEntry.dismissCount || 0) + 1;                                                      // <-- Increment count
        const snoozeDurationMs  = Whitecardopedia__Pwa__SessionState__GetSnoozeDurationMs(nextDismissCount);                        // <-- Lookup ladder duration
        const nextSnoozeUntil   = Date.now() + snoozeDurationMs;                                                                    // <-- Compute next deadline

        stateObject.perPlatform[platformId] = {                                                                                     // <-- Update entry
            dismissCount        : nextDismissCount,
            snoozeUntil         : nextSnoozeUntil
        };

        Whitecardopedia__Pwa__SessionState__WriteRawState(stateObject);                                                             // <-- Persist back

        return { dismissCount: nextDismissCount, snoozeUntil: nextSnoozeUntil };                                                    // <-- Return new snapshot
    }
    // ---------------------------------------------------------------


    // FUNCTION | Reset State for Platform (e.g. user opted in)
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__ResetPlatform(platformId) {
        const stateObject       = Whitecardopedia__Pwa__SessionState__ReadRawState();                                               // <-- Load full state
        if (stateObject.perPlatform[platformId]) {
            delete stateObject.perPlatform[platformId];                                                                             // <-- Remove platform entry
            Whitecardopedia__Pwa__SessionState__WriteRawState(stateObject);                                                         // <-- Persist
        }
    }
    // ---------------------------------------------------------------


    // FUNCTION | Mark App as Installed
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__MarkInstalled() {
        const stateObject       = Whitecardopedia__Pwa__SessionState__ReadRawState();                                               // <-- Load full state
        stateObject.installCompletedAt = Date.now();                                                                                // <-- Stamp install moment
        Whitecardopedia__Pwa__SessionState__WriteRawState(stateObject);                                                             // <-- Persist
    }
    // ---------------------------------------------------------------


    // FUNCTION | Apply Global Suppression Window
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__SuppressGlobally(durationMs) {
        const stateObject       = Whitecardopedia__Pwa__SessionState__ReadRawState();                                               // <-- Load full state
        stateObject.globalSuppressUntil = Date.now() + Math.max(0, Number(durationMs) || 0);                                        // <-- Compute deadline
        Whitecardopedia__Pwa__SessionState__WriteRawState(stateObject);                                                             // <-- Persist
    }
    // ---------------------------------------------------------------


    // FUNCTION | Reset All State (Diagnostic / Reinstall Flow)
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__ResetAll() {
        Whitecardopedia__Pwa__SessionState__WriteRawState(Whitecardopedia__Pwa__SessionState__BuildEmptyState());                   // <-- Replace with clean state
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Global Exposure
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Global Session State Namespace
    // ------------------------------------------------------------
    function Whitecardopedia__Pwa__SessionState__InitializeGlobalNamespace() {
        if (typeof window === 'undefined') return;                                                                                  // <-- Guard non-window contexts

        window.Whitecardopedia__Pwa__SessionState = {                                                                               // <-- Public API surface
            readPlatformSnapshot : Whitecardopedia__Pwa__SessionState__ReadPlatformSnapshot,
            isSuppressed         : Whitecardopedia__Pwa__SessionState__IsSuppressed,
            recordDismissal      : Whitecardopedia__Pwa__SessionState__RecordDismissal,
            resetPlatform        : Whitecardopedia__Pwa__SessionState__ResetPlatform,
            markInstalled        : Whitecardopedia__Pwa__SessionState__MarkInstalled,
            suppressGlobally     : Whitecardopedia__Pwa__SessionState__SuppressGlobally,
            resetAll             : Whitecardopedia__Pwa__SessionState__ResetAll
        };
    }
    // ---------------------------------------------------------------


    Whitecardopedia__Pwa__SessionState__InitializeGlobalNamespace();                                                                // <-- Mount on window immediately

// endregion -------------------------------------------------------------------

})();
