// =============================================================================
// VALEVISION THEIA - MEDIA CACHE - CLIENT (THE PAGE'S SIDE OF THE SERVICE WORKER)
// =============================================================================
//
// FILE       : Na__MediaCache__Client__.js
// NAMESPACE  : Na__MediaCache
// MODULE     : Media Cache - Client
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Start Theia's service worker, wait until it is answering this page,
//              and ask it what it holds
// CREATED    : 07-Oct-2026
//
// DESCRIPTION:
// - THE WORKER MUST BE IN CHARGE BEFORE A VIDEO LOADS, or the browser fetches
//   that video straight from the server and none of it is kept. So Start()
//   registers TheiaVideoPlayer__Pwa__ServiceWorker__.js and waits (up to 3 s) for
//   it to take this page over; the player only sets a source after that.
// - Without a worker (an old browser, a private window that refuses one) the
//   player still works: it streams straight from nginx, byte ranges and all.
// - Messages: CachedAhead (contiguous bytes held from a byte onwards), Cached
//   (bytes held per file), Usage, Evict, PurgeStale. Each times out quietly.
// - Events from the worker are forwarded to listeners: 'theia-sample' (a chunk's
//   bytes and time: the connection estimate) and 'theia-media-changed'.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__MediaCache__WORKER   = new URL('../../TheiaVideoPlayer__Pwa__ServiceWorker__.js', import.meta.url).href;
    const Na__MediaCache__SCOPE    = new URL('../../', import.meta.url).href;
    const Na__MediaCache__WAIT_MS  = 3000;
    const Na__MediaCache__ASK_MS   = 4000;

    let Na__MediaCache__Active     = false;
    const Na__MediaCache__Listeners = [];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Start
// -----------------------------------------------------------------------------

    // FUNCTION | Register the Worker and Wait Until It Answers This Page: true / false
    // ------------------------------------------------------------
    async function Na__MediaCache__Start() {
        if (!('serviceWorker' in navigator)) return false;
        try {
            navigator.serviceWorker.addEventListener('message', (event) => {
                const data = event.data || {};
                if (typeof data.type === 'string' && data.type.indexOf('theia-') === 0) {
                    Na__MediaCache__Listeners.forEach((fn) => { try { fn(data); } catch (error) { console.error(error); } });
                }
            });
            await navigator.serviceWorker.register(Na__MediaCache__WORKER, { scope: Na__MediaCache__SCOPE });
            if (!navigator.serviceWorker.controller) {
                await new Promise((resolve) => {
                    const timer = setTimeout(resolve, Na__MediaCache__WAIT_MS);
                    navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(timer); resolve(); }, { once: true });
                });
            }
        } catch (error) {
            console.warn('[Theia] The media cache could not start; videos stream directly:', error);
        }
        Na__MediaCache__Active = !!navigator.serviceWorker.controller;
        return Na__MediaCache__Active;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Worker Answering This Page?
    // ------------------------------------------------------------
    function Na__MediaCache__IsActive() {
        return Na__MediaCache__Active && !!navigator.serviceWorker.controller;
    }
    // ------------------------------------------------------------


    // FUNCTION | Listen to the Worker's Events
    // ------------------------------------------------------------
    function Na__MediaCache__OnEvent(fn) {
        Na__MediaCache__Listeners.push(fn);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Questions to the Worker
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A URL as the Worker Keys It: absolute
    // ------------------------------------------------------------
    function Na__MediaCache__Abs(url) {
        return new URL(url, window.location.href).href;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Request and Its Answer (null on timeout, an error, or without a worker)
    // ------------------------------------------------------------
    function Na__MediaCache__Ask(message) {
        if (!Na__MediaCache__IsActive()) return Promise.resolve(null);
        return new Promise((resolve) => {
            const channel = new MessageChannel();
            const timer = setTimeout(() => resolve(null), Na__MediaCache__ASK_MS);
            channel.port1.onmessage = (event) => {
                clearTimeout(timer);
                const data = event.data || null;
                if (data && data.error) console.warn('[Theia] The media cache said:', data.error);
                resolve(data && !data.error ? data : null);
            };
            navigator.serviceWorker.controller.postMessage(message, [channel.port2]);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Contiguous Bytes Held From a Byte Onwards: { bytes, size }
    // ------------------------------------------------------------
    async function Na__MediaCache__CachedAhead(url, fromByte) {
        return (await Na__MediaCache__Ask({ type: 'theia-cached-ahead', url: Na__MediaCache__Abs(url), fromByte })) || { bytes: 0, size: 0 };
    }

    // FUNCTION | Bytes Held per File: { url: { cachedBytes, size } }
    async function Na__MediaCache__Cached(urls) {
        const answer = (await Na__MediaCache__Ask({ type: 'theia-cached', urls: urls.map(Na__MediaCache__Abs) })) || {};
        const out = {};
        urls.forEach((url) => { out[url] = answer[Na__MediaCache__Abs(url)]; });   // <-- Keyed as the caller asked
        return out;
    }

    // FUNCTION | Everything Held: { totalBytes, files }
    async function Na__MediaCache__Usage() {
        return (await Na__MediaCache__Ask({ type: 'theia-usage' })) || { totalBytes: 0, files: [] };
    }

    // FUNCTION | Make Room: drop the least recently watched files not in keep
    async function Na__MediaCache__Evict(keep, targetBytes) {
        return (await Na__MediaCache__Ask({ type: 'theia-evict', keep: (keep || []).map(Na__MediaCache__Abs), targetBytes })) || { removedBytes: 0 };
    }

    // FUNCTION | Drop Older Versions (?v=) of the Files Listed
    async function Na__MediaCache__PurgeStale(currentUrls) {
        return (await Na__MediaCache__Ask({ type: 'theia-purge-stale', current: (currentUrls || []).map(Na__MediaCache__Abs) })) || { removed: 0 };
    }
    // ------------------------------------------------------------


    // FUNCTION | Ask the Browser to Keep the Cache Through Clear-Ups (granted or not, it carries on)
    // ------------------------------------------------------------
    async function Na__MediaCache__Persist() {
        try {
            if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) {
                return await navigator.storage.persist();
            }
            return true;
        } catch (error) { return false; }
    }

    // FUNCTION | The Browser's Storage Figures: { usage, quota } (zeros when unknown)
    async function Na__MediaCache__Estimate() {
        try {
            const e = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
            return { usage: (e && e.usage) || 0, quota: (e && e.quota) || 0 };
        } catch (error) { return { usage: 0, quota: 0 }; }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__MediaCache__Start,
        Na__MediaCache__IsActive,
        Na__MediaCache__OnEvent,
        Na__MediaCache__CachedAhead,
        Na__MediaCache__Cached,
        Na__MediaCache__Usage,
        Na__MediaCache__Evict,
        Na__MediaCache__PurgeStale,
        Na__MediaCache__Persist,
        Na__MediaCache__Estimate
    };

// endregion -------------------------------------------------------------------
