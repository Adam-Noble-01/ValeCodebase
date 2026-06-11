// =============================================================================
// VALEVISION3D - APP CORE - LOAD WATCHDOG
// =============================================================================
//
// FILE       : Na__AppCore__LoadWatchdog__.js
// NAMESPACE  : Na__AppCore
// MODULE     : LoadWatchdog
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Detect and recover from stalled model loads on iOS PWA
// CREATED    : 11-Jun-2026
//
// DESCRIPTION:
// - Provides a global-budget timer started at the beginning of the load
//   sequence and cleared by Na__UiFeature__ShowScene on success. If the
//   budget expires while the overlay is still visible the error callback fires.
// - On visibilitychange (tab returns to foreground) checks whether a load is
//   in flight and the last progress notification is older than the stall
//   threshold. If so, fires the error callback immediately so the user sees a
//   Retry button rather than a permanently frozen spinner — the primary iOS
//   recovery mechanism.
// - Exposes Na__LoadWatchdog__SetIsLoadingFlag so the SW controllerchange
//   bridge can check whether a load is in flight before reloading the page.
// - All timing values are passed in by the caller from LoadResilience__Config;
//   this module never hardcodes timing constants.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Jun-2026 - Version 1.0.0
// - Initial release. Part of PWA stability fix (C1, M6).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Watchdog State
    // ------------------------------------------------------------
    let Na__LoadWatchdog__BudgetHandle     = null;   // <-- setTimeout handle for total budget
    let Na__LoadWatchdog__IsLoading        = false;  // <-- True while overlay is up
    let Na__LoadWatchdog__LastProgressMs   = 0;      // <-- Date.now() of last progress notification
    let Na__LoadWatchdog__OnError          = null;   // <-- Caller-supplied error callback
    let Na__LoadWatchdog__StallThresholdMs = 30000;  // <-- Default stall threshold (overridden on start)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Start the Load Watchdog
    // ------------------------------------------------------------
    // Call once at the very start of Na__AppFlow__StartLoadingSequence.
    // Params:
    //   onError          {Function} Invoked with a message string on timeout or stall.
    //   budgetMs         {number}  Total load budget before hard timeout.
    //   stallThresholdMs {number}  Silence after visibilitychange before stall fires.
    // ------------------------------------------------------------
    function Na__LoadWatchdog__Start(onError, budgetMs, stallThresholdMs) {
        Na__LoadWatchdog__Clear();                                             // <-- Reset any previous watchdog session

        Na__LoadWatchdog__OnError          = onError || null;                  // <-- Store error callback
        Na__LoadWatchdog__IsLoading        = true;                             // <-- Mark load as in flight
        Na__LoadWatchdog__LastProgressMs   = Date.now();                       // <-- Record start as first progress event
        Na__LoadWatchdog__StallThresholdMs = stallThresholdMs || 30000;        // <-- Stall threshold from config

        window.Na__LoadWatchdog__IsLoadingActive = true;                       // <-- Expose flag for SW controllerchange bridge

        Na__LoadWatchdog__BudgetHandle = setTimeout(() => {
            if (!Na__LoadWatchdog__IsLoading) return;                          // <-- Already resolved (ShowScene called Clear)
            Na__LoadWatchdog__IsLoading = false;
            window.Na__LoadWatchdog__IsLoadingActive = false;
            const message = `Loading timed out after ${Math.round(budgetMs / 1000)}s — tap Retry to try again.`;
            console.warn(`[LoadWatchdog] Budget expired. ${message}`);
            if (Na__LoadWatchdog__OnError) Na__LoadWatchdog__OnError(message); // <-- Fire error callback
        }, budgetMs);

        document.addEventListener('visibilitychange', Na__LoadWatchdog__HandleVisibilityChange); // <-- iOS recovery hook
    }
    // ---------------------------------------------------------------


    // FUNCTION | Clear the Watchdog (call on load success)
    // ------------------------------------------------------------
    function Na__LoadWatchdog__Clear() {
        if (Na__LoadWatchdog__BudgetHandle !== null) {
            clearTimeout(Na__LoadWatchdog__BudgetHandle);                      // <-- Disarm budget timer
            Na__LoadWatchdog__BudgetHandle = null;
        }
        Na__LoadWatchdog__IsLoading = false;
        window.Na__LoadWatchdog__IsLoadingActive = false;
        document.removeEventListener('visibilitychange', Na__LoadWatchdog__HandleVisibilityChange); // <-- Detach listener
    }
    // ---------------------------------------------------------------


    // FUNCTION | Notify Progress (resets stall clock)
    // ------------------------------------------------------------
    // Call whenever meaningful loading progress occurs (status update, file
    // started, file finished) so the stall threshold is reset.
    // ------------------------------------------------------------
    function Na__LoadWatchdog__NotifyProgress() {
        Na__LoadWatchdog__LastProgressMs = Date.now();                         // <-- Advance last-progress timestamp
    }
    // ---------------------------------------------------------------


    // FUNCTION | Expose Loading Flag for External Consumers
    // ------------------------------------------------------------
    // Returns true while a model load is in flight. Used by the SW
    // controllerchange bridge to avoid yanking a mid-load viewer page.
    // ------------------------------------------------------------
    function Na__LoadWatchdog__SetIsLoadingFlag(isLoading) {
        Na__LoadWatchdog__IsLoading          = isLoading;                      // <-- Sync module state
        window.Na__LoadWatchdog__IsLoadingActive = isLoading;                  // <-- Sync global flag read by SW registrar
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Handle visibilitychange for Stall Detection
    // ------------------------------------------------------------
    function Na__LoadWatchdog__HandleVisibilityChange() {
        if (document.hidden) return;                                           // <-- Only act when returning to foreground
        if (!Na__LoadWatchdog__IsLoading) return;                              // <-- No load in flight; nothing to check

        const silenceDurationMs = Date.now() - Na__LoadWatchdog__LastProgressMs; // <-- Time since last progress
        if (silenceDurationMs < Na__LoadWatchdog__StallThresholdMs) return;    // <-- Still within stall tolerance

        Na__LoadWatchdog__Clear();                                             // <-- Stop watchdog before firing error
        const message = 'The load was interrupted (likely backgrounded). Tap Retry to reload.';
        console.warn(`[LoadWatchdog] Stall detected after ${Math.round(silenceDurationMs / 1000)}s silence. ${message}`);
        if (Na__LoadWatchdog__OnError) Na__LoadWatchdog__OnError(message);     // <-- Fire stall error callback
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Load Watchdog API
    // ------------------------------------------------------------
    export {
        Na__LoadWatchdog__Start,
        Na__LoadWatchdog__Clear,
        Na__LoadWatchdog__NotifyProgress,
        Na__LoadWatchdog__SetIsLoadingFlag
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
