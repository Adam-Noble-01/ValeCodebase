// =============================================================================
// VALEVISION AURA - HANDWRITING ENGINE - THE WORKER (THE PEN, OFF THE PAGE)
// =============================================================================
//
// FILE       : Na__HandwritingEngine__Worker__.js
// NAMESPACE  : Na__PenWorker
// MODULE     : Handwriting Engine - Worker
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Run the handwriting engine on the user's own machine, beside the
//              page: load the WebAssembly network and the model's weights (kept
//              on the device), then write each note the page sends
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - A MODULE WORKER, started by ../Na__Handwriting__Client__.js. Its imports
//   are relative only (an import map does not reach a worker).
// - THE NETWORK: Na__HandwritingEngine__Network__Simd__.wasm where the browser
//   accepts SIMD, else ...Scalar__.wasm; both write the same strokes. Fetched
//   like AURA's other files (the service worker keeps a copy for offline).
// - THE WEIGHTS (15 MB, the checkpoint's own 32-bit numbers): fetched once from
//   the AURA API (signed-in Managers and App Admins only), checked against the
//   manifest's size and SHA-256, and kept in this device's cache as
//   aura-pen-<hash> (older aura-pen- copies are dropped). AURA's service worker
//   leaves aura-pen- caches alone. Nothing heavy runs on the server (Adam,
//   30-Oct-2026: the server is resource constrained).
// - MESSAGES:
//     in  { type: 'load', manifest, weightsUrl }   -> { type: 'loaded', ok, engine | reason }
//     in  { type: 'write', id, request }           -> { type: 'progress', id, message, fraction } ...
//                                                     { type: 'written', id, ok, ink | error }
//   request is the client's { text, size, width, pen, neatness, variation,
//   spacing, seed }; ink is { paths: [{ d, w }], width, inkWidth, height,
//   lines, warnings, seconds }, millimetres from the note's top left.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build (AURA 0.2.1): the handwriting moves from the PC's Python to
//   WebAssembly in the browser.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__Neural__Create } from './Na__HandwritingEngine__Neural__.js';
    import { Na__Layout__Validate, Na__Layout__Render } from './Na__HandwritingEngine__Layout__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    const Na__PenWorker__MODULES      = { Simd: 'Na__HandwritingEngine__Network__Simd__.wasm', Scalar: 'Na__HandwritingEngine__Network__Scalar__.wasm' };
    const Na__PenWorker__FORMAT       = 'Na__HandwritingModel__Graves__f32le__1';   // <-- The weights' layout the network was built for
    const Na__PenWorker__CACHE_PREFIX = 'aura-pen-';                                // <-- + the weights' hash; AURA's service worker keeps these

    const Na__PenWorker__State = {
        loading : null,                          // <-- A promise of the loaded engine { pen, engine }
        pen     : null
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Tell the Page Something
    // ------------------------------------------------------------
    function Na__PenWorker__Post(message) {
        self.postMessage(message);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Buffer's SHA-256 as Hex ('' where the browser will not hash: not a secure page)
    // ------------------------------------------------------------
    async function Na__PenWorker__Sha256(buffer) {
        if (!self.crypto || !self.crypto.subtle) return '';
        const digest = new Uint8Array(await self.crypto.subtle.digest('SHA-256', buffer));
        return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is This the Model the Manifest Describes?
    // ------------------------------------------------------------
    async function Na__PenWorker__IsModel(buffer, manifest) {
        if (buffer.byteLength !== manifest.HandwritingModel__Bytes) return false;
        const sha = await Na__PenWorker__Sha256(buffer);
        return !sha || sha === manifest.HandwritingModel__Sha256;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Model's Weights: from this device's cache, else the AURA API (once), checked either way
    // ------------------------------------------------------------
    async function Na__PenWorker__Weights(url, manifest) {
        const name = Na__PenWorker__CACHE_PREFIX + String(manifest.HandwritingModel__Sha256).slice(0, 16);
        let cache = null;
        try { cache = await self.caches.open(name); } catch (error) { cache = null; }   // <-- A private window may have no cache: fetch every time
        if (cache) {
            const hit = await cache.match(url).catch(() => null);
            if (hit) {
                const kept = await hit.arrayBuffer();
                if (await Na__PenWorker__IsModel(kept, manifest)) return kept;
                await cache.delete(url).catch(() => {});
            }
        }

        let response;
        try { response = await fetch(url, { credentials: 'same-origin' }); }
        catch (error) { throw new Error('The handwriting model could not be fetched. Check the connection, then edit the note to try again.'); }
        if (response.status === 401) throw new Error('Sign in again to use the handwriting.');
        if (response.status === 403) throw new Error('The handwriting model is for Vale managers only for now.');
        if (!response.ok) throw new Error(`The handwriting model is not on this server (it answered ${response.status}).`);

        const total = manifest.HandwritingModel__Bytes;
        const bytes = new Uint8Array(total);
        let got = 0, told = -1;
        if (response.body && response.body.getReader) {
            const reader = response.body.getReader();
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                if (got + value.length > total) throw new Error('The handwriting model arrived damaged. Reload AURA to fetch it again.');
                bytes.set(value, got);
                got += value.length;
                const mb = Math.floor(got / 1048576);
                if (mb !== told) { told = mb; Na__PenWorker__Post({ type: 'progress', id: null, message: `Fetching the handwriting model: ${mb} of ${Math.round(total / 1048576)} MB (once on this device)`, fraction: got / total }); }
            }
        } else {
            const whole = new Uint8Array(await response.arrayBuffer());
            if (whole.length <= total) bytes.set(whole);
            got = whole.length;
        }
        const buffer = bytes.buffer;
        if (got !== total || !(await Na__PenWorker__IsModel(buffer, manifest))) throw new Error('The handwriting model arrived damaged. Reload AURA to fetch it again.');

        if (cache) {
            try {
                await cache.put(url, new Response(buffer, { headers: { 'Content-Type': 'application/octet-stream' } }));
                const names = await self.caches.keys();
                await Promise.all(names.filter((n) => n.indexOf(Na__PenWorker__CACHE_PREFIX) === 0 && n !== name).map((n) => self.caches.delete(n)));
            } catch (error) { /* <-- A full disk: the pen still works, it fetches again next time */ }
        }
        return buffer;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Network: the SIMD build where this browser takes it, else the scalar one
    // ------------------------------------------------------------
    async function Na__PenWorker__Network() {
        const imports = { env: { abort() { throw new Error('The handwriting engine stopped on an internal error.'); } } };
        let last = null;
        for (const key of ['Simd', 'Scalar']) {
            try {
                const response = await fetch(new URL(Na__PenWorker__MODULES[key], import.meta.url));
                if (!response.ok) throw new Error(`answered ${response.status}`);
                const bytes = await response.arrayBuffer();
                if (!WebAssembly.validate(bytes)) { last = new Error('not valid here'); continue; }   // <-- No SIMD in this browser: the scalar build
                const { instance } = await WebAssembly.instantiate(bytes, imports);
                return { exports: instance.exports, build: key };
            } catch (error) {
                last = error;
            }
        }
        throw new Error(`The handwriting engine could not start in this browser (${last ? last.message : 'no WebAssembly'}).`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the Engine Once: the network, the model's weights in it, the neural pen
    // ------------------------------------------------------------
    async function Na__PenWorker__Load(manifest, weightsUrl) {
        if (typeof WebAssembly !== 'object') throw new Error('This browser cannot run the handwriting engine (it has no WebAssembly).');
        if (!manifest || manifest.HandwritingModel__Format !== Na__PenWorker__FORMAT) throw new Error('The server sent a handwriting model this engine cannot read. Reload AURA.');
        const { exports, build } = await Na__PenWorker__Network();
        if (exports.Na__Network__WeightsFloats() !== manifest.HandwritingModel__Floats) throw new Error('The handwriting model and engine do not match. Reload AURA.');
        const weights = await Na__PenWorker__Weights(weightsUrl, manifest);
        new Uint8Array(exports.memory.buffer, exports.Na__Network__WeightsPointer(), weights.byteLength).set(new Uint8Array(weights));
        Na__PenWorker__State.pen = Na__Neural__Create(exports, manifest);
        return {
            name       : 'Graves handwriting synthesis in WebAssembly',
            checkpoint : manifest.HandwritingModel__Checkpoint,
            commit     : String(manifest.HandwritingModel__Commit || '').slice(0, 8),
            build      : build === 'Simd' ? 'SIMD' : 'scalar',
            charset    : manifest.HandwritingModel__Charset
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Messages
// -----------------------------------------------------------------------------

    self.addEventListener('message', async (event) => {
        const message = event.data || {};
        const S = Na__PenWorker__State;

        if (message.type === 'load') {
            if (!S.loading) S.loading = Na__PenWorker__Load(message.manifest, message.weightsUrl);
            try {
                Na__PenWorker__Post({ type: 'loaded', ok: true, engine: await S.loading });
            } catch (error) {
                S.loading = null;                                                // <-- The next load tries again
                Na__PenWorker__Post({ type: 'loaded', ok: false, reason: error.message || String(error) });
            }
            return;
        }

        if (message.type === 'write') {
            const id = message.id;
            try {
                if (!S.loading) throw new Error('The handwriting engine has not been loaded.');
                await S.loading;
                const options = Na__Layout__Validate(message.request, S.pen.Charset);
                const ink = Na__Layout__Render(options, S.pen, (fraction, text) => Na__PenWorker__Post({ type: 'progress', id, message: text, fraction }));
                Na__PenWorker__Post({ type: 'written', id, ok: true, ink });
            } catch (error) {
                Na__PenWorker__Post({ type: 'written', id, ok: false, error: error.message || String(error) });
            }
        }
    });

// endregion -------------------------------------------------------------------
