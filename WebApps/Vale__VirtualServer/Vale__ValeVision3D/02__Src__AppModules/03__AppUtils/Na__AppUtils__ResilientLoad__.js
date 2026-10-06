// =============================================================================
// VALEVISION3D - APPLICATION UTILITIES - RESILIENT LOAD HELPERS
// =============================================================================
//
// FILE       : Na__AppUtils__ResilientLoad__.js
// NAMESPACE  : Na__AppUtils
// MODULE     : ResilientLoad
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Timeout-bounded, retry-capable fetch and GLTF load helpers with
//              a concurrency-capped pool runner for parallel GLB loading.
// CREATED    : 11-Jun-2026
//
// DESCRIPTION:
// - Na__ResilientLoad__FetchWithTimeout   : AbortController-backed fetch with
//   exponential-backoff retries. Prevents fetch promises stalling forever on
//   iOS background/suspended connections.
// - Na__ResilientLoad__GltfLoadWithTimeout: Promise.race wrapper around
//   GLTFLoader.loadAsync so a stalled CDN transfer cannot block the load
//   pipeline indefinitely. Retries are re-attempted with a fresh race.
// - Na__ResilientLoad__RunWithConcurrencyCap: pool runner that executes an
//   array of async task factories with a bounded number of simultaneous slots.
//   Used to parallelise GLB downloads while staying within iOS GPU budget.
// - All tuning values (timeouts, retries, concurrency) are passed in by the
//   caller from Na__AppConfig__Main.json > LoadResilience__Config. This module
//   never hardcodes timing constants.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Jun-2026 - Version 1.0.0
// - Initial release. Part of PWA stability fix (C1, M1, M5).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Resilient Fetch
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Sleep for a given number of milliseconds
    // ------------------------------------------------------------
    function Na__ResilientLoad__Sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));             // <-- Simple delay promise
    }
    // ------------------------------------------------------------


    // FUNCTION | Fetch with Timeout and Retry
    // ------------------------------------------------------------
    // Params:
    //   url        {string}  - The URL to fetch.
    //   options    {object}  - Configuration object:
    //     timeoutMs      {number}  Milliseconds before abort (per attempt).
    //     retries        {number}  Number of additional attempts after the first.
    //     retryDelayMs   {number}  Base delay before first retry (doubles each attempt).
    //     fetchOptions   {object}  Passed directly to fetch() (headers, mode, etc.).
    // ------------------------------------------------------------
    async function Na__ResilientLoad__FetchWithTimeout(url, { timeoutMs = 15000, retries = 2, retryDelayMs = 1000, fetchOptions = {} } = {}) {
        let lastError;                                                      // <-- Track last error for final rejection

        for (let attempt = 0; attempt <= retries; attempt += 1) {
            const controller    = new AbortController();                   // <-- Fresh controller each attempt
            const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs); // <-- Arm abort timer

            try {
                const response = await fetch(url, { ...fetchOptions, signal: controller.signal }); // <-- Abortable fetch

                clearTimeout(timeoutHandle);                               // <-- Disarm timer on success

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}`); // <-- Non-2xx as error
                }

                return response;                                           // <-- Resolved response

            } catch (fetchError) {
                clearTimeout(timeoutHandle);                               // <-- Disarm timer on error

                const isAbort   = fetchError && fetchError.name === 'AbortError'; // <-- Timeout-triggered abort
                lastError       = isAbort
                    ? new Error(`Fetch timed out after ${timeoutMs} ms — ${url}`)
                    : fetchError;

                if (attempt < retries) {
                    const delay = retryDelayMs * Math.pow(2, attempt);    // <-- Exponential backoff
                    console.warn(`[ResilientLoad] Fetch attempt ${attempt + 1} failed (${lastError.message}). Retrying in ${delay} ms…`);
                    await Na__ResilientLoad__Sleep(delay);                 // <-- Wait before retry
                }
            }
        }

        throw lastError;                                                   // <-- All attempts exhausted
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Resilient GLTF Load
// -----------------------------------------------------------------------------

    // FUNCTION | GLTF loadAsync with Timeout Race and Retry
    // ------------------------------------------------------------
    // GLTFLoader has no built-in abort. We race the load promise against a
    // rejection timer so a stalled CDN transfer cannot block the pipeline.
    // On timeout the load continues in the background (unavoidable) but control
    // returns to the caller so the watchdog / error path can proceed.
    //
    // Params:
    //   loader     {GLTFLoader} - A Three.js GLTFLoader instance (already created).
    //   url        {string}     - CDN URL of the .glb file.
    //   options    {object}     - Configuration object:
    //     timeoutMs    {number}  Milliseconds before the race timer fires.
    //     retries      {number}  Additional attempts after the first.
    //     retryDelayMs {number}  Base delay before first retry.
    // ------------------------------------------------------------
    async function Na__ResilientLoad__GltfLoadWithTimeout(loader, url, { timeoutMs = 45000, retries = 2, retryDelayMs = 1000 } = {}) {
        let lastError;                                                      // <-- Track last error for final rejection

        for (let attempt = 0; attempt <= retries; attempt += 1) {
            let raceTimeoutHandle = null;                                   // <-- Timer handle for cleanup

            const timeoutPromise = new Promise((_, reject) => {
                raceTimeoutHandle = setTimeout(() => {
                    reject(new Error(`GLTF load timed out after ${timeoutMs} ms — ${url}`)); // <-- Race timer rejection
                }, timeoutMs);
            });

            try {
                const gltf = await Promise.race([
                    loader.loadAsync(url),                                 // <-- Actual load
                    timeoutPromise                                         // <-- Timeout sentinel
                ]);

                clearTimeout(raceTimeoutHandle);                           // <-- Disarm timer on success
                return gltf;                                               // <-- Resolved GLTF

            } catch (loadError) {
                clearTimeout(raceTimeoutHandle);                           // <-- Disarm timer on error
                lastError = loadError;

                if (attempt < retries) {
                    const delay = retryDelayMs * Math.pow(2, attempt);    // <-- Exponential backoff
                    console.warn(`[ResilientLoad] GLTF attempt ${attempt + 1} failed (${lastError.message}). Retrying in ${delay} ms…`);
                    await Na__ResilientLoad__Sleep(delay);                 // <-- Wait before retry
                }
            }
        }

        throw lastError;                                                   // <-- All attempts exhausted
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Concurrency-Capped Pool Runner
// -----------------------------------------------------------------------------

    // FUNCTION | Run Task Factories with a Maximum Concurrency Cap
    // ------------------------------------------------------------
    // Executes an array of async task factories (zero-argument functions that
    // return promises) with at most maxConcurrent tasks running simultaneously.
    // Results array preserves input order. Individual task rejections are caught
    // and stored as Error objects in the results array — they do not abort the
    // pool. Inspect results[i] instanceof Error to detect per-item failures.
    //
    // Params:
    //   taskFactories  {Array<() => Promise<any>>}  Tasks to execute.
    //   maxConcurrent  {number}                     Slot limit (>= 1).
    // ------------------------------------------------------------
    async function Na__ResilientLoad__RunWithConcurrencyCap(taskFactories, maxConcurrent = 3) {
        const results       = new Array(taskFactories.length).fill(null); // <-- Pre-allocated results (preserves order)
        let   nextIndex     = 0;                                          // <-- Next task factory index to start

        async function Na__ResilientLoad__RunSlot() {
            while (nextIndex < taskFactories.length) {
                const taskIndex     = nextIndex;                          // <-- Capture index before increment
                nextIndex          += 1;                                  // <-- Advance before await (prevents double-assign)

                try {
                    results[taskIndex] = await taskFactories[taskIndex](); // <-- Run task and store result
                } catch (taskError) {
                    results[taskIndex] = taskError;                       // <-- Store error object (caller checks instanceof Error)
                    console.warn(`[ResilientLoad] Pool task ${taskIndex} failed:`, taskError);
                }
            }
        }

        const slotCount = Math.min(Math.max(1, maxConcurrent), taskFactories.length); // <-- Clamp slot count
        const slots     = Array.from({ length: slotCount }, Na__ResilientLoad__RunSlot); // <-- Spin up slots

        await Promise.all(slots);                                         // <-- Wait for all slots to drain

        return results;                                                   // <-- Ordered results (or Error objects)
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Resilient Load API
    // ------------------------------------------------------------
    export {
        Na__ResilientLoad__FetchWithTimeout,
        Na__ResilientLoad__GltfLoadWithTimeout,
        Na__ResilientLoad__RunWithConcurrencyCap
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
