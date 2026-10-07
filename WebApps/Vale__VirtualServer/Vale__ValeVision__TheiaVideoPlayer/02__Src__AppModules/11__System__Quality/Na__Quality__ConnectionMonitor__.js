// =============================================================================
// VALEVISION THEIA - QUALITY - CONNECTION MONITOR
// =============================================================================
//
// FILE       : Na__Quality__ConnectionMonitor__.js
// NAMESPACE  : Na__Connection
// MODULE     : Quality - Connection Monitor
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : How fast this connection really is, measured from the video bytes
//              it has just carried, and whether it is a metered one
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - MEASURED, NOT GUESSED. Every chunk the service worker fetches reports its
//   bytes and time. Downloads overlap (the player and the prefetcher), so the
//   estimate is bytes over the time any download was running (the union of
//   their intervals), not the average of each one's own speed - which would
//   halve the figure whenever two ran at once.
// - The last 45 seconds count; older samples are forgotten.
// - METERED: navigator.connection says cellular, or the person has asked their
//   browser to save data. Then prefetching keeps to the start of the next
//   videos (config), and the page recommends Wi-Fi.
// - Listeners hear about each new estimate.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Monitor
// -----------------------------------------------------------------------------

    const Na__Connection__WINDOW_MS   = 45000;
    const Na__Connection__MIN_BYTES   = 2 * 1024 * 1024;                          // <-- Below this, no estimate yet

    const Na__Connection__Samples     = [];                                       // <-- { start, end, bytes }
    const Na__Connection__Listeners   = [];


    // FUNCTION | Add One Measured Download (bytes, milliseconds, ending now)
    // ------------------------------------------------------------
    function Na__Connection__AddSample(bytes, ms) {
        const end = performance.now();
        Na__Connection__Samples.push({ start: end - Math.max(1, ms), end, bytes: Number(bytes) || 0 });
        const cutoff = end - Na__Connection__WINDOW_MS;
        while (Na__Connection__Samples.length && Na__Connection__Samples[0].end < cutoff) Na__Connection__Samples.shift();
        const estimate = Na__Connection__EstimateMbps();
        Na__Connection__Listeners.forEach((fn) => { try { fn(estimate); } catch (error) { console.error(error); } });
    }
    // ------------------------------------------------------------


    // FUNCTION | Megabits a Second Over the Recent Window, or null Before Enough Is Known
    // ------------------------------------------------------------
    function Na__Connection__EstimateMbps() {
        const cutoff = performance.now() - Na__Connection__WINDOW_MS;
        const recent = Na__Connection__Samples.filter((s) => s.end >= cutoff).sort((a, b) => a.start - b.start);
        const bytes = recent.reduce((sum, s) => sum + s.bytes, 0);
        if (bytes < Na__Connection__MIN_BYTES) return null;
        let busy = 0, runStart = -1, runEnd = -1;                                 // <-- The union of the download intervals
        recent.forEach((s) => {
            if (s.start > runEnd) {
                if (runEnd > runStart) busy += runEnd - runStart;
                runStart = s.start; runEnd = s.end;
            } else {
                runEnd = Math.max(runEnd, s.end);
            }
        });
        if (runEnd > runStart) busy += runEnd - runStart;
        return busy > 0 ? (bytes * 8) / (busy * 1000) : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This a Metered Connection (mobile data, or Save Data on)?
    // ------------------------------------------------------------
    function Na__Connection__IsMetered() {
        const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return !!(c && (c.saveData || c.type === 'cellular'));
    }
    // ------------------------------------------------------------


    // FUNCTION | Hear Each New Estimate
    // ------------------------------------------------------------
    function Na__Connection__OnChange(fn) {
        Na__Connection__Listeners.push(fn);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Connection__AddSample,
        Na__Connection__EstimateMbps,
        Na__Connection__IsMetered,
        Na__Connection__OnChange
    };

// endregion -------------------------------------------------------------------
