/* =============================================================================
   VALEVISION THEIA - SERVICE WORKER (THE MEDIA CACHE, AND THE INSTALLABLE APP)
   =============================================================================

   FILE       : TheiaVideoPlayer__Pwa__ServiceWorker__.js
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Keep Theia's videos on the device in full quality: every byte a
                video uses is fetched once, kept, and played back from here
   CREATED    : 07-Oct-2026

   DESCRIPTION:
   - Scope: this app's route (/theia/). It sees every request the Theia page
     makes, including the videos under /Vale__Projects__MasterLibrary/.
   - VIDEOS (…/ValeVision__TheiaVideo/Content__VideoFiles/…mp4?v=…):
       The <video> element asks for byte ranges. They are answered here from
       4 MB chunks kept in Cache Storage ('theia-media-v1'); a missing chunk is
       fetched from the server once, kept, and shared by everyone waiting for it.
       So a video that has been watched, or that the page prefetched, plays
       back without the network: seeking is instant, a connection that drops
       for a minute is not noticed, and there is never a lower quality to fall
       back to.
       - 16 MB A REQUEST: a missing chunk is fetched together with the missing
         chunks after it, up to four (16 MB), in one Range request. Each 4 MB
         chunk is kept and handed on the moment its bytes are in, so playback
         does not wait for the whole 16 MB; it only saves the 0.2 s each
         request costs through Cloudflare (07-Oct-2026).
       - An open-ended range (bytes=N-) is answered with up to 32 MB; the
         browser asks again for the rest. No response outlives a few seconds.
       - A range with an end (Safari) is answered exactly.
       - A request carrying X-Theia-Prefetch: 1 (the page's prefetcher) only
         fills the cache and answers 204: no bytes go back to the page.
       - Every chunk fetched is checked against the file's size and its
         ETag / Last-Modified. A file replaced on the server under the same
         URL is dropped from the cache and the page is told
         ('theia-media-changed'), so old and new bytes can never mix.
         (URLs carry ?v=<size>-<modified>, so in practice a new file is a new URL.)
       - ?theia-direct=1 bypasses all of this (the page's fallback).
       - Each network chunk's size and time are posted to the page
         ('theia-sample'): Theia's connection estimate.
   - POSTERS (Content__VideoThumbnails): from the cache at once, refreshed behind.
   - APP FILES (this route, /AppAssets__CommonApplicationAssets/): network
     first, the cached copy when offline. Always checked with the server
     (cache: 'no-cache', a 304 when unchanged): the stylesheets and modules
     reach browsers with a 4-hour max-age, so without it an installed app kept
     old files for hours after a push (07-Oct-2026, the iPad header), and could
     mix old and new modules.
   - Never touched: api/ and anything that is not a GET.
   - The page talks to this worker with MessageChannel requests:
       theia-cached-ahead {url, fromByte} -> {bytes, size}
       theia-cached       {urls}          -> {[url]: {cachedBytes, size}}
       theia-usage        {}              -> {totalBytes, files: [{url, cachedBytes, size, accessMs}]}
       theia-evict        {keep, targetBytes} -> {removedBytes}
       theia-purge-stale  {current}       -> {removed}   (older ?v= of the same files)

   CHUNK SIZE: changing THEIA_CHUNK makes every cached chunk unusable; bump
   THEIA_MEDIA's name with it.

   ============================================================================= */

const THEIA_VERSION        = '2026-10-08-2';
const THEIA_SHELL          = 'theia-shell-' + THEIA_VERSION;
const THEIA_MEDIA          = 'theia-media-v1';
const THEIA_IMAGES         = 'theia-images-v1';
const THEIA_CHUNK          = 4 * 1024 * 1024;
const THEIA_MAX_OPEN_SPAN  = 32 * 1024 * 1024;
const THEIA_SPAN_CHUNKS    = 4;                                               // <-- Chunks one network request may carry (16 MB)
const THEIA_MEDIA_PATH     = /\/Vale__Projects__MasterLibrary\/.+\/ValeVision__TheiaVideo\/Content__VideoFiles\/.+\.(mp4|m4v|mov)$/i;
const THEIA_IMAGE_PATH     = /\/Vale__Projects__MasterLibrary\/.+\/ValeVision__TheiaVideo\/Content__VideoThumbnails\//i;
const THEIA_TOUCH_EVERY_MS = 60 * 1000;


// -----------------------------------------------------------------------------
// REGION | State (this worker's lifetime only; the cache is the truth)
// -----------------------------------------------------------------------------

const Na__Sw__Inflight = new Map();   // <-- chunk key -> Promise<ArrayBuffer>: one network fetch per chunk
const Na__Sw__Present  = new Map();   // <-- media key -> Set(chunk index) known to be in the cache
const Na__Sw__Meta     = new Map();   // <-- media key -> { size, etag, lastModified, type, accessMs }
const Na__Sw__Touched  = new Map();   // <-- media key -> when its access time was last written
let   Na__Sw__IndexReady = null;

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keys
// -----------------------------------------------------------------------------

// The one meaningful query parameter is v (the file's size and modified time),
// so a media key is origin + path + ?v=. Chunk and meta keys extend it.
function Na__Sw__MediaKey(href) {
    const u = new URL(href, self.location.origin);                            // <-- The page may send /Vale__Projects__MasterLibrary/... as the API wrote it
    return u.origin + u.pathname + '?v=' + encodeURIComponent(u.searchParams.get('v') || '');
}
function Na__Sw__ChunkKey(key, i) { return key + '&theia-chunk=' + i; }
function Na__Sw__MetaKey(key)     { return key + '&theia-meta=1'; }
function Na__Sw__ChunkLength(meta, i) {
    return Math.max(0, Math.min(meta.size, (i + 1) * THEIA_CHUNK) - i * THEIA_CHUNK);
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Index of What Is Cached (built once, then kept up to date)
// -----------------------------------------------------------------------------

function Na__Sw__Index() {
    if (!Na__Sw__IndexReady) {
        Na__Sw__IndexReady = (async () => {
            const cache = await caches.open(THEIA_MEDIA);
            for (const req of await cache.keys()) {
                const u = new URL(req.url);
                const chunk = u.searchParams.get('theia-chunk');
                if (chunk !== null) Na__Sw__MarkPresent(Na__Sw__MediaKey(req.url), Number(chunk), true);
            }
        })().catch(() => { Na__Sw__IndexReady = null; });
    }
    return Na__Sw__IndexReady;
}

function Na__Sw__MarkPresent(key, i, present) {
    let set = Na__Sw__Present.get(key);
    if (!set) { set = new Set(); Na__Sw__Present.set(key, set); }
    if (present) set.add(i); else set.delete(i);
}

async function Na__Sw__ReadMeta(key) {
    if (Na__Sw__Meta.has(key)) return Na__Sw__Meta.get(key);
    const cache = await caches.open(THEIA_MEDIA);
    const hit = await cache.match(Na__Sw__MetaKey(key));
    if (!hit) return null;
    try {
        const meta = await hit.json();
        Na__Sw__Meta.set(key, meta);
        return meta;
    } catch (error) { return null; }
}

async function Na__Sw__WriteMeta(key, meta) {
    Na__Sw__Meta.set(key, meta);
    const cache = await caches.open(THEIA_MEDIA);
    await cache.put(Na__Sw__MetaKey(key), new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
}

function Na__Sw__Touch(key) {
    const meta = Na__Sw__Meta.get(key);
    if (!meta) return;
    meta.accessMs = Date.now();
    if (Date.now() - (Na__Sw__Touched.get(key) || 0) > THEIA_TOUCH_EVERY_MS) {
        Na__Sw__Touched.set(key, Date.now());
        Na__Sw__WriteMeta(key, meta).catch(() => {});
    }
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Talking to the Page
// -----------------------------------------------------------------------------

async function Na__Sw__Tell(message) {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach((client) => client.postMessage(message));
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fetching and Keeping Chunks
// -----------------------------------------------------------------------------

function Na__Sw__Validator(value) { return String(value || '').replace(/^W\//, ''); }

// Size from Content-Range ("bytes 0-4194303/63977245") or, for a 200, Content-Length.
function Na__Sw__TotalSize(response) {
    const range = response.headers.get('Content-Range');
    const m = range && /\/(\d+)\s*$/.exec(range);
    if (m) return Number(m[1]);
    if (response.status === 200) return Number(response.headers.get('Content-Length') || 0);
    return 0;
}

async function Na__Sw__Keep(key, i, buffer) {
    const cache = await caches.open(THEIA_MEDIA);
    try {
        await cache.put(Na__Sw__ChunkKey(key, i), new Response(buffer, { headers: { 'Content-Type': 'application/octet-stream' } }));
        Na__Sw__MarkPresent(key, i, true);
    } catch (error) {
        // QUOTA | Make room from the least recently watched files, once, then carry on uncached
        await Na__Sw__Evict([key], 0.85);
        try {
            await cache.put(Na__Sw__ChunkKey(key, i), new Response(buffer, { headers: { 'Content-Type': 'application/octet-stream' } }));
            Na__Sw__MarkPresent(key, i, true);
        } catch (again) { /* played, not kept */ }
    }
}

async function Na__Sw__Purge(key) {
    const cache = await caches.open(THEIA_MEDIA);
    await Na__Sw__Index();
    const set = Na__Sw__Present.get(key) || new Set();
    await Promise.all([...set].map((i) => cache.delete(Na__Sw__ChunkKey(key, i))));
    await cache.delete(Na__Sw__MetaKey(key));
    Na__Sw__Present.delete(key);
    Na__Sw__Meta.delete(key);
}

// One chunk from the network: a Range request, checked, kept, timed.
async function Na__Sw__FetchChunk(key, meta, i, why) {
    const start = i * THEIA_CHUNK;
    const end = start + Na__Sw__ChunkLength(meta, i) - 1;
    const began = Date.now();
    const response = await fetch(key, { headers: { Range: `bytes=${start}-${end}` }, cache: 'no-store', credentials: 'same-origin' });
    if (response.status !== 206 && !(response.status === 200 && meta.size <= THEIA_CHUNK)) {
        if (response.body) response.body.cancel().catch(() => {});
        throw new Error(`HTTP ${response.status} for a chunk of ${key}`);
    }
    const etag = Na__Sw__Validator(response.headers.get('ETag'));
    const modified = response.headers.get('Last-Modified') || '';
    if (Na__Sw__TotalSize(response) !== meta.size || (meta.etag && etag && etag !== meta.etag) ||
        (meta.lastModified && modified && modified !== meta.lastModified)) {
        if (response.body) response.body.cancel().catch(() => {});
        await Na__Sw__Purge(key);
        Na__Sw__Tell({ type: 'theia-media-changed', url: key });
        throw new Error('The video changed on the server while it was playing.');
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength !== end - start + 1) throw new Error('A chunk arrived short.');
    Na__Sw__Tell({ type: 'theia-sample', url: key, bytes: buffer.byteLength, ms: Math.max(1, Date.now() - began), why });
    await Na__Sw__Keep(key, i, buffer);
    return buffer;
}

// Several chunks from the network in ONE Range request (up to 16 MB). Each
// chunk is checked as a whole, kept, and its waiter told the moment its bytes
// are in; each also posts its own sample, timed from the one before, so the
// connection estimate sees one continuous download.
function Na__Sw__Deferred() {
    let resolve, reject;
    const promise = new Promise((ok, no) => { resolve = ok; reject = no; });
    promise.catch(() => {});                                                   // <-- A chunk nobody ended up waiting for
    return { promise, resolve, reject };
}

function Na__Sw__Join(parts, length) {
    const out = new Uint8Array(length);
    let at = 0;
    parts.forEach((part) => { out.set(part, at); at += part.byteLength; });
    return out.buffer;
}

async function Na__Sw__FetchSpan(key, meta, first, waits, why) {
    const last = first + waits.length - 1;
    const start = first * THEIA_CHUNK;
    const end = last * THEIA_CHUNK + Na__Sw__ChunkLength(meta, last) - 1;
    let index = first;
    try {
        let mark = Date.now();
        const response = await fetch(key, { headers: { Range: `bytes=${start}-${end}` }, cache: 'no-store', credentials: 'same-origin' });
        if (response.status !== 206 && !(response.status === 200 && meta.size <= THEIA_CHUNK)) {
            if (response.body) response.body.cancel().catch(() => {});
            throw new Error(`HTTP ${response.status} for a span of ${key}`);
        }
        const etag = Na__Sw__Validator(response.headers.get('ETag'));
        const modified = response.headers.get('Last-Modified') || '';
        if (Na__Sw__TotalSize(response) !== meta.size || (meta.etag && etag && etag !== meta.etag) ||
            (meta.lastModified && modified && modified !== meta.lastModified)) {
            if (response.body) response.body.cancel().catch(() => {});
            await Na__Sw__Purge(key);
            Na__Sw__Tell({ type: 'theia-media-changed', url: key });
            throw new Error('The video changed on the server while it was playing.');
        }
        const reader = response.body.getReader();
        let parts = [], have = 0, need = Na__Sw__ChunkLength(meta, index);
        while (index <= last) {
            const { value, done } = await reader.read();
            if (done) break;
            let offset = 0;
            while (offset < value.byteLength && index <= last) {
                const take = Math.min(need - have, value.byteLength - offset);
                parts.push(value.subarray(offset, offset + take));
                have += take;
                offset += take;
                if (have === need) {                                           // <-- A whole chunk: hand it on, then keep it
                    const buffer = Na__Sw__Join(parts, need);
                    const now = Date.now();
                    Na__Sw__Tell({ type: 'theia-sample', url: key, bytes: need, ms: Math.max(1, now - mark), why });
                    mark = now;
                    waits[index - first].resolve(buffer);
                    await Na__Sw__Keep(key, index, buffer);
                    index++;
                    parts = [];
                    have = 0;
                    need = index <= last ? Na__Sw__ChunkLength(meta, index) : 0;
                }
            }
        }
        if (index <= last) throw new Error('A chunk arrived short.');
    } catch (error) {
        for (let k = index; k <= last; k++) waits[k - first].reject(error);   // <-- Chunks already handed on stay good
    }
}

// A chunk from the cache, or the network once (shared by everyone waiting).
// A missing chunk starts a span: it and the missing chunks right after it, up
// to THEIA_SPAN_CHUNKS and never past maxIndex (the last chunk the request being
// answered needs), each registered as in flight before anything is awaited.
function Na__Sw__GetChunk(key, meta, i, why, maxIndex) {
    const chunkKey = Na__Sw__ChunkKey(key, i);
    if (Na__Sw__Inflight.has(chunkKey)) return Na__Sw__Inflight.get(chunkKey);
    const present = Na__Sw__Present.get(key) || new Set();
    if (present.has(i)) {
        const job = (async () => {
            const cache = await caches.open(THEIA_MEDIA);
            const hit = await cache.match(chunkKey);
            if (hit) {
                const buffer = await hit.arrayBuffer();
                if (buffer.byteLength === Na__Sw__ChunkLength(meta, i)) return buffer;
                await cache.delete(chunkKey);                                  // <-- A damaged entry is fetched again
            }
            Na__Sw__MarkPresent(key, i, false);
            return Na__Sw__FetchChunk(key, meta, i, why);
        })();
        Na__Sw__Inflight.set(chunkKey, job);
        job.then(() => Na__Sw__Inflight.delete(chunkKey), () => Na__Sw__Inflight.delete(chunkKey));
        return job;
    }
    const count = Math.max(1, Math.ceil(meta.size / THEIA_CHUNK));
    const limit = Math.min(count - 1, maxIndex === undefined ? count - 1 : maxIndex);
    let last = i;
    while (last + 1 <= limit && last + 1 - i < THEIA_SPAN_CHUNKS &&
           !present.has(last + 1) && !Na__Sw__Inflight.has(Na__Sw__ChunkKey(key, last + 1))) last++;
    const waits = [];
    for (let c = i; c <= last; c++) {
        const wait = Na__Sw__Deferred();
        const ck = Na__Sw__ChunkKey(key, c);
        Na__Sw__Inflight.set(ck, wait.promise);
        wait.promise.then(() => Na__Sw__Inflight.delete(ck), () => Na__Sw__Inflight.delete(ck));
        waits.push(wait);
    }
    Na__Sw__FetchSpan(key, meta, i, waits, why);
    return waits[0].promise;
}

// The file's size and validators: from the cache, or from its first chunk (which is kept).
// The player, the start-up spinner and the prefetcher all ask at once on a first
// visit: they share one request (it was three 4 MB fetches of the same chunk).
const Na__Sw__MetaInflight = new Map();
function Na__Sw__EnsureMeta(key) {
    if (Na__Sw__MetaInflight.has(key)) return Na__Sw__MetaInflight.get(key);
    const job = Na__Sw__EnsureMetaNow(key);
    Na__Sw__MetaInflight.set(key, job);
    job.then(() => Na__Sw__MetaInflight.delete(key), () => Na__Sw__MetaInflight.delete(key));
    return job;
}

async function Na__Sw__EnsureMetaNow(key) {
    const known = await Na__Sw__ReadMeta(key);
    if (known) return known;
    const began = Date.now();
    const response = await fetch(key, { headers: { Range: `bytes=0-${THEIA_CHUNK - 1}` }, cache: 'no-store', credentials: 'same-origin' });
    if (response.status !== 206 && response.status !== 200) throw new Error(`HTTP ${response.status}`);
    const size = Na__Sw__TotalSize(response);
    if (!size || (response.status === 200 && size > THEIA_CHUNK)) {          // <-- No byte ranges here: let the browser deal directly
        if (response.body) response.body.cancel().catch(() => {});
        throw new Error('no byte ranges');
    }
    const meta = { size, etag: Na__Sw__Validator(response.headers.get('ETag')), lastModified: response.headers.get('Last-Modified') || '',
                   type: response.headers.get('Content-Type') || 'video/mp4', accessMs: Date.now() };
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength !== Na__Sw__ChunkLength(meta, 0)) throw new Error('The first chunk arrived short.');
    Na__Sw__Tell({ type: 'theia-sample', url: key, bytes: buffer.byteLength, ms: Math.max(1, Date.now() - began), why: 'head' });
    await Na__Sw__WriteMeta(key, meta);
    await Na__Sw__Keep(key, 0, buffer);
    return meta;
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Answering the Video Element
// -----------------------------------------------------------------------------

function Na__Sw__ParseRange(header, size) {
    const m = header && /^bytes=(\d*)-(\d*)/.exec(header.trim());
    if (!m) return { start: 0, end: size - 1, partial: false, open: false };
    let start, end, open = false;
    if (m[1] === '') {                                                         // <-- bytes=-N: the last N bytes
        start = Math.max(0, size - Number(m[2] || 0));
        end = size - 1;
    } else {
        start = Number(m[1]);
        open = (m[2] === '');
        end = open ? size - 1 : Math.min(Number(m[2]), size - 1);
    }
    if (start >= size || start > end) return { unsatisfiable: true };
    return { start, end, partial: true, open };
}

function Na__Sw__Stream(key, meta, start, end) {
    let pos = start, finished = false;
    return new ReadableStream({
        async pull(controller) {
            if (finished) return;
            try {
                const i = Math.floor(pos / THEIA_CHUNK);
                const buffer = await Na__Sw__GetChunk(key, meta, i, 'play', Math.floor(end / THEIA_CHUNK));
                if (finished) return;
                const base = i * THEIA_CHUNK;
                const from = pos - base;
                const to = Math.min(buffer.byteLength, end - base + 1);
                controller.enqueue(new Uint8Array(buffer, from, to - from));
                pos = base + to;
                if (pos > end) { finished = true; controller.close(); }
            } catch (error) {
                finished = true;
                controller.error(error);
            }
        },
        cancel() { finished = true; }
    });
}

async function Na__Sw__AnswerMedia(request) {
    const key = Na__Sw__MediaKey(request.url);
    let meta;
    try {
        await Na__Sw__Index();                                                 // <-- Spans skip what is kept: know it first
        meta = await Na__Sw__EnsureMeta(key);
    } catch (error) {
        return fetch(request);                                                 // <-- Cannot cache it: the network, as if we were not here
    }
    const header = request.headers.get('Range');
    const range = Na__Sw__ParseRange(header, meta.size);
    if (range.unsatisfiable) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${meta.size}` } });
    }
    Na__Sw__Touch(key);

    // PREFETCH | Fill the cache, send nothing back
    if (request.headers.get('X-Theia-Prefetch') === '1') {
        const lastAsked = Math.floor(range.end / THEIA_CHUNK);
        for (let i = Math.floor(range.start / THEIA_CHUNK); i <= lastAsked; i++) {
            await Na__Sw__GetChunk(key, meta, i, 'prefetch', lastAsked);
        }
        return new Response(null, { status: 204 });
    }

    const end = range.open ? Math.min(range.end, range.start + THEIA_MAX_OPEN_SPAN - 1) : range.end;
    const headers = { 'Content-Type': meta.type || 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store',
                      'Content-Length': String(end - range.start + 1) };
    if (header) {
        headers['Content-Range'] = `bytes ${range.start}-${end}/${meta.size}`;
        return new Response(Na__Sw__Stream(key, meta, range.start, end), { status: 206, headers });
    }
    headers['Content-Length'] = String(meta.size);                             // <-- No Range asked: the whole file
    return new Response(Na__Sw__Stream(key, meta, 0, meta.size - 1), { status: 200, headers });
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Housekeeping (sizes, eviction, stale versions)
// -----------------------------------------------------------------------------

async function Na__Sw__Usage() {
    await Na__Sw__Index();
    const files = [];
    let total = 0;
    for (const [key, set] of Na__Sw__Present.entries()) {
        if (!set.size) continue;
        const meta = (await Na__Sw__ReadMeta(key)) || { size: 0, accessMs: 0 };
        const cachedBytes = [...set].reduce((sum, i) => sum + Na__Sw__ChunkLength(meta.size ? meta : { size: (i + 1) * THEIA_CHUNK }, i), 0);
        total += cachedBytes;
        files.push({ url: key, cachedBytes, size: meta.size, accessMs: meta.accessMs || 0 });
    }
    return { totalBytes: total, files };
}

// Drop the least recently watched files (never those in keep) until the total
// is at most targetBytes, or a fraction of it when called with a fraction.
async function Na__Sw__Evict(keep, target) {
    const usage = await Na__Sw__Usage();
    const keepKeys = new Set((keep || []).map(Na__Sw__MediaKey));
    const goal = target <= 1 ? usage.totalBytes * target : target;
    let total = usage.totalBytes, removed = 0;
    for (const file of usage.files.sort((a, b) => a.accessMs - b.accessMs)) {
        if (total <= goal) break;
        if (keepKeys.has(file.url)) continue;
        await Na__Sw__Purge(file.url);
        total -= file.cachedBytes;
        removed += file.cachedBytes;
    }
    return removed;
}

async function Na__Sw__CachedAhead(url, fromByte) {
    const key = Na__Sw__MediaKey(url);
    await Na__Sw__Index();
    const meta = await Na__Sw__ReadMeta(key);
    if (!meta) return { bytes: 0, size: 0 };
    const set = Na__Sw__Present.get(key) || new Set();
    let i = Math.floor(Math.max(0, fromByte) / THEIA_CHUNK);
    while (set.has(i)) i++;
    return { bytes: Math.max(0, Math.min(meta.size, i * THEIA_CHUNK) - fromByte), size: meta.size };
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lifecycle, Fetch and Messages
// -----------------------------------------------------------------------------

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys
        .filter((k) => k.indexOf('theia-shell-') === 0 && k !== THEIA_SHELL)
        .map((k) => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;                          // <-- Fonts and other sites: the browser's own cache
    if (url.pathname.indexOf('/api/') >= 0) return;                            // <-- Never the API

    if (THEIA_MEDIA_PATH.test(url.pathname)) {
        if (url.searchParams.has('theia-direct')) return;                      // <-- The page's fallback: straight to the network
        event.respondWith(Na__Sw__AnswerMedia(request));
        return;
    }

    if (THEIA_IMAGE_PATH.test(url.pathname)) {                                 // <-- Posters: now from the cache, refreshed behind
        event.respondWith(caches.open(THEIA_IMAGES).then((cache) => cache.match(request).then((hit) => {
            const refresh = fetch(request).then((response) => {
                if (response.ok) cache.put(request, response.clone());
                return response;
            }).catch(() => hit || Response.error());
            return hit || refresh;
        })));
        return;
    }

    const scope = new URL(self.registration.scope);
    if (url.pathname.indexOf(scope.pathname) === 0 || url.pathname.indexOf('/AppAssets__CommonApplicationAssets/') === 0) {
        event.respondWith(fetch(request, { cache: 'no-cache' }).then((response) => {   // <-- App files: network first, always checked with the server
            if (response.ok) { const copy = response.clone(); caches.open(THEIA_SHELL).then((c) => c.put(request, copy)); }
            return response;
        }).catch(() => caches.match(request).then((hit) => hit || Response.error())));
    }
});

self.addEventListener('message', (event) => {
    const message = event.data || {};
    const port = event.ports && event.ports[0];
    const reply = (data) => { if (port) port.postMessage(data); };
    event.waitUntil((async () => {
        try {
            if (message.type === 'theia-cached-ahead') {
                reply(await Na__Sw__CachedAhead(message.url, Number(message.fromByte) || 0));
            } else if (message.type === 'theia-cached') {
                await Na__Sw__Index();
                const out = {};
                for (const url of message.urls || []) {
                    const key = Na__Sw__MediaKey(url);
                    const meta = await Na__Sw__ReadMeta(key);
                    const set = Na__Sw__Present.get(key) || new Set();
                    out[url] = { size: meta ? meta.size : 0,
                                 cachedBytes: meta ? [...set].reduce((s, i) => s + Na__Sw__ChunkLength(meta, i), 0) : 0 };
                }
                reply(out);
            } else if (message.type === 'theia-usage') {
                reply(await Na__Sw__Usage());
            } else if (message.type === 'theia-evict') {
                reply({ removedBytes: await Na__Sw__Evict(message.keep || [], Number(message.targetBytes) || 0) });
            } else if (message.type === 'theia-purge-stale') {
                await Na__Sw__Index();
                const current = new Map((message.current || []).map((u) => [new URL(u, self.location.origin).pathname, Na__Sw__MediaKey(u)]));
                let removed = 0;
                for (const key of [...Na__Sw__Present.keys()]) {
                    const keep = current.get(new URL(key).pathname);
                    if (keep && keep !== key) { await Na__Sw__Purge(key); removed++; }
                }
                reply({ removed });
            } else {
                reply({ error: 'unknown message' });
            }
        } catch (error) {
            reply({ error: String(error && error.message || error) });
        }
    })());
});

// endregion -------------------------------------------------------------------
