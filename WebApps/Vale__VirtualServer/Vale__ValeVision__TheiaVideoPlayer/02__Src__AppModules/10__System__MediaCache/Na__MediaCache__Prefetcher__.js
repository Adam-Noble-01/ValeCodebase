// =============================================================================
// VALEVISION THEIA - MEDIA CACHE - PREFETCHER (FETCH AHEAD, IN PLAYING ORDER)
// =============================================================================
//
// FILE       : Na__MediaCache__Prefetcher__.js
// NAMESPACE  : Na__Prefetch
// MODULE     : Media Cache - Prefetcher
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Bring videos onto the device before they are needed, in the order
//              they will be watched, as fast as the connection allows
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - THE PLAN, in priority order (config TheiaConfig__Prefetch__*):
//     1. A ROLLING WINDOW of the video on screen: from the playhead to 90 s
//        ahead of it (AheadSeconds), moving as it plays; 60 s at most on a
//        metered connection;
//     2. the start of the next videos in the list (NextVideosHeadCount, 3;
//        NextVideosHeadSeconds, 20 s), and the moov box of any that is not
//        fast-start - so pressing play on them starts at once.
//   Whole files are no longer fetched ahead (Adam, 07-Oct-2026): a 1.7 GB file
//   was downloaded in full even when ten seconds of it were watched.
// - HOW: a Range GET with X-Theia-Prefetch: 1 for up to four chunks (16 MB) at a
//   time, Concurrency (2) at once. The service worker fetches them in one
//   request, keeps each chunk and answers 204, so nothing comes back to the
//   page. A chunk the video element has already pulled is a cache hit.
// - THE BUDGET: before taking more, the browser's storage figures are checked;
//   over min(Cache__MaxBytes, quota x Cache__MaxQuotaFraction) the least recently
//   watched files go first (never the ones in the plan), and if that is not
//   enough the prefetcher stops at the plan's essentials.
// - It pauses offline and when told to (Pause / Resume), backs off after
//   failures, and keeps going in a background tab.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.1.0
// - A 90 s rolling window of the playing video and the start of the next three,
//   instead of whole files; 16 MB requests instead of 4 MB.
//
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Connection__IsMetered } from '../11__System__Quality/Na__Quality__ConnectionMonitor__.js';
    import { Na__MediaCache__IsActive, Na__MediaCache__Cached, Na__MediaCache__Estimate,
             Na__MediaCache__Evict } from './Na__MediaCache__Client__.js';

    const Na__Prefetch__CHUNK          = 4 * 1024 * 1024;                         // <-- Must equal the worker's THEIA_CHUNK
    const Na__Prefetch__SPAN           = 4;                                       // <-- Chunks a request asks for (16 MB): the worker's THEIA_SPAN_CHUNKS
    const Na__Prefetch__BUDGET_EVERY   = 12;                                      // <-- Chunks between storage checks

    let Na__Prefetch__Plan       = null;     // <-- { current: item, upcoming: [item] }; item = { url, size, mbps, playheadByte, moovOffset, moovBytes, fastStart }
    let Na__Prefetch__Running    = 0;
    let Na__Prefetch__Paused     = false;
    let Na__Prefetch__Failures   = 0;
    let Na__Prefetch__RetryTimer = null;
    let Na__Prefetch__Since      = 0;        // <-- Chunks since the last storage check
    let Na__Prefetch__EssentialsOnly = false;
    const Na__Prefetch__Held     = new Map(); // <-- url -> Set(chunk index) held or in flight (what we know)
    const Na__Prefetch__Listeners = [];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Plan
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Chunk Index Range Covering a Byte Range
    // ------------------------------------------------------------
    function Na__Prefetch__Chunks(fromByte, toByte) {
        const out = [];
        for (let i = Math.floor(Math.max(0, fromByte) / Na__Prefetch__CHUNK); i <= Math.floor(Math.max(0, toByte) / Na__Prefetch__CHUNK); i++) out.push(i);
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What Each Item Needs, Highest Priority First: [{ item, chunks, essential }]
    // ------------------------------------------------------------
    function Na__Prefetch__Wants() {
        const plan = Na__Prefetch__Plan;
        if (!plan || !plan.current) return [];
        const metered = Na__Connection__IsMetered() && Na__AppConfig__Get('Prefetch__MeteredHeadsOnly', true);
        const wants = [];
        const cur = plan.current;
        const last = cur.size - 1;
        const aheadSeconds = Number(Na__AppConfig__Get('Prefetch__AheadSeconds', 90)) || 90;
        const windowSeconds = metered ? Math.min(aheadSeconds, 60) : aheadSeconds;   // <-- The rolling window: from the playhead, this far ahead
        const aheadBytes = Math.min(last, cur.playheadByte + cur.mbps * 125000 * windowSeconds);
        wants.push({ item: cur, chunks: Na__Prefetch__Chunks(cur.playheadByte, aheadBytes), essential: true });
        const headSeconds = Number(Na__AppConfig__Get('Prefetch__NextVideosHeadSeconds', 20)) || 20;
        const headCount = Math.max(0, Number(Na__AppConfig__Get('Prefetch__NextVideosHeadCount', 3)));
        (plan.upcoming || []).slice(0, headCount).forEach((item) => {
            const head = Na__Prefetch__Chunks(0, Math.min(item.size - 1, item.mbps * 125000 * headSeconds));
            if (!item.fastStart && item.moovBytes) head.push(...Na__Prefetch__Chunks(item.moovOffset, item.moovOffset + item.moovBytes - 1));
            wants.push({ item, chunks: head, essential: true });
        });
        return wants;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Next Chunks Nobody Has Yet (up to four in a row): { item, indices } or null
    // ------------------------------------------------------------
    function Na__Prefetch__Next() {
        for (const want of Na__Prefetch__Wants()) {
            const held = Na__Prefetch__Held.get(want.item.url) || new Set();
            const at = want.chunks.findIndex((i) => !held.has(i));
            if (at < 0) continue;
            const indices = [want.chunks[at]];
            for (let k = at + 1; k < want.chunks.length && indices.length < Na__Prefetch__SPAN; k++) {
                const i = want.chunks[k];
                if (i !== indices[indices.length - 1] + 1 || held.has(i)) break;   // <-- Only a run of consecutive missing chunks
                indices.push(i);
            }
            return { item: want.item, indices };
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fetching
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Keep Storage Within the Budget (true = carry on)
    // ------------------------------------------------------------
    async function Na__Prefetch__WithinBudget() {
        const { usage, quota } = await Na__MediaCache__Estimate();
        if (!quota) return true;
        const budget = Math.min(Number(Na__AppConfig__Get('Cache__MaxBytes', 20 * 1024 ** 3)),
                                quota * (Number(Na__AppConfig__Get('Cache__MaxQuotaFraction', 0.6)) || 0.6));
        if (usage < budget * 0.95) { Na__Prefetch__EssentialsOnly = false; return true; }
        const plan = Na__Prefetch__Plan;
        const keep = plan ? [plan.current.url, ...(plan.upcoming || []).map((i) => i.url)] : [];
        await Na__MediaCache__Evict(keep, budget * 0.85);
        const after = await Na__MediaCache__Estimate();
        Na__Prefetch__EssentialsOnly = after.usage >= budget * 0.95;
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch a Run of Chunks Through the Worker (one request, up to 16 MB)
    // ------------------------------------------------------------
    async function Na__Prefetch__Fetch(item, indices) {
        const start = indices[0] * Na__Prefetch__CHUNK;
        const end = Math.min(item.size - 1, (indices[indices.length - 1] + 1) * Na__Prefetch__CHUNK - 1);
        const response = await fetch(item.url, { headers: { Range: `bytes=${start}-${end}`, 'X-Theia-Prefetch': '1' },
                                                 cache: 'no-store', credentials: 'same-origin' });
        if (response.status !== 204 && response.status !== 206) throw new Error(`HTTP ${response.status}`);
        if (response.body) await response.body.cancel().catch(() => {});
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Keep Up to Concurrency Fetches Going
    // ------------------------------------------------------------
    function Na__Prefetch__Pump() {
        if (!Na__MediaCache__IsActive() || Na__Prefetch__Paused || !navigator.onLine || Na__Prefetch__RetryTimer) return;
        const concurrency = Math.max(1, Number(Na__AppConfig__Get('Prefetch__Concurrency', 2)) || 2);
        while (Na__Prefetch__Running < concurrency) {
            const next = Na__Prefetch__Next();
            if (!next) break;
            const held = Na__Prefetch__Held.get(next.item.url) || new Set();
            next.indices.forEach((i) => held.add(i));
            Na__Prefetch__Held.set(next.item.url, held);
            Na__Prefetch__Running++;
            (async () => {
                Na__Prefetch__Since += next.indices.length;
                if (Na__Prefetch__Since >= Na__Prefetch__BUDGET_EVERY) { Na__Prefetch__Since = 0; await Na__Prefetch__WithinBudget(); }
                await Na__Prefetch__Fetch(next.item, next.indices);
            })().then(() => {
                Na__Prefetch__Failures = 0;
                Na__Prefetch__Listeners.forEach((fn) => { try { fn(next.item.url, next.indices[next.indices.length - 1]); } catch (error) { console.error(error); } });
            }, () => {
                next.indices.forEach((i) => held.delete(i));                   // <-- Not held after all: try again later
                Na__Prefetch__Failures++;
                const wait = Math.min(30000, 1000 * 2 ** Math.min(5, Na__Prefetch__Failures));
                if (!Na__Prefetch__RetryTimer) {
                    Na__Prefetch__RetryTimer = setTimeout(() => { Na__Prefetch__RetryTimer = null; Na__Prefetch__Pump(); }, wait);
                }
            }).finally(() => {
                Na__Prefetch__Running--;
                Na__Prefetch__Pump();
            });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Set the Plan: { current: item, upcoming: [item] }
    // ------------------------------------------------------------
    async function Na__Prefetch__SetPlan(plan) {
        Na__Prefetch__Plan = plan;
        if (!plan || !Na__MediaCache__IsActive()) return;
        const fresh = [plan.current, ...(plan.upcoming || [])].filter((i) => i && !Na__Prefetch__Held.has(i.url));
        if (fresh.length) {                                                   // <-- Learn what the worker already holds, once per file
            const cached = await Na__MediaCache__Cached(fresh.map((i) => i.url));
            fresh.forEach((item) => {
                const held = new Set();
                const info = cached[item.url];
                if (info && info.cachedBytes >= info.size && info.size) Na__Prefetch__Chunks(0, info.size - 1).forEach((i) => held.add(i));
                Na__Prefetch__Held.set(item.url, held);
            });
        }
        Na__Prefetch__Pump();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Playhead Moved (bytes into the current file)
    // ------------------------------------------------------------
    function Na__Prefetch__SetPlayhead(byte) {
        if (Na__Prefetch__Plan && Na__Prefetch__Plan.current) {
            Na__Prefetch__Plan.current.playheadByte = Math.max(0, Math.floor(byte));
            Na__Prefetch__Pump();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Forget What We Knew About a File (it changed on the server)
    // ------------------------------------------------------------
    function Na__Prefetch__Forget(url) {
        Na__Prefetch__Held.delete(url);
    }
    // ------------------------------------------------------------


    // FUNCTION | Pause / Resume
    // ------------------------------------------------------------
    function Na__Prefetch__Pause()  { Na__Prefetch__Paused = true; }
    function Na__Prefetch__Resume() { Na__Prefetch__Paused = false; Na__Prefetch__Pump(); }
    // ------------------------------------------------------------


    // FUNCTION | Hear Each Chunk Kept: fn(url, index)
    // ------------------------------------------------------------
    function Na__Prefetch__OnChunk(fn) {
        Na__Prefetch__Listeners.push(fn);
    }
    // ------------------------------------------------------------

    window.addEventListener('online', () => Na__Prefetch__Pump());

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Prefetch__SetPlan,
        Na__Prefetch__SetPlayhead,
        Na__Prefetch__Forget,
        Na__Prefetch__Pause,
        Na__Prefetch__Resume,
        Na__Prefetch__OnChunk
    };

// endregion -------------------------------------------------------------------
