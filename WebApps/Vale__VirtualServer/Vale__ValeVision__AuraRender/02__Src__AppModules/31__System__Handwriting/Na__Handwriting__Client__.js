// =============================================================================
// VALEVISION AURA - HANDWRITING - THE CLIENT
// =============================================================================
//
// FILE       : Na__Handwriting__Client__.js
// NAMESPACE  : Na__Handwriting
// MODULE     : Handwriting - Client
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Turn a note's words into handwritten ink with the handwriting
//              engine in this browser, one note at a time, and say plainly
//              when it cannot
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE ENGINE runs on the user's own machine, in the browser: the Vale
//   Handwriting Studio's Graves model rewritten for WebAssembly
//   (02__Engine__Wasm beside this file), in a Web Worker so the sheet stays
//   responsive while it writes. Nothing heavy runs on the server (Adam,
//   30-Oct-2026: the server is resource constrained); the AURA API only hands
//   over the model, to signed-in Managers and App Admins.
// - LOADED WHEN FIRST NEEDED: the first note to write asks the API for the
//   model's manifest and starts the worker, which fetches the 15 MB of weights
//   once and keeps them on the device. A sheet whose notes are all written
//   never loads it.
// - INK IS SAVED WITH THE NOTE (Annotation__Written: the strokes as SVG paths
//   in millimetres, keyed by what made them), so a note is written once and
//   shows everywhere. The ink's colour is applied on the sheet, so a new colour
//   never needs a new copy; new words, size, width or hand do. The engine is
//   deterministic: the same words, settings and seed write the same strokes on
//   every device.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 2.0.0
// - The engine moves into the browser (AURA 0.2.1): Na__Handwriting__Status
//   loads the WebAssembly engine in a worker, Na__Handwriting__Write asks it;
//   the API's PC-only Python path is retired. Na__Handwriting__Loading tells
//   the panel while the model is being fetched. The ink keeps its shape.
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Api__BASE, Na__Api__Get } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';
    import { Na__Format__Key } from '../03__AppUtils/Na__AppUtils__Format__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Handwriting__WORKER     = new URL('./02__Engine__Wasm/Na__HandwritingEngine__Worker__.js', import.meta.url);
    const Na__Handwriting__RETRY_MS  = 20000;                                   // <-- A failed load is tried again by the next note after this long

    const Na__Handwriting__State = {
        status   : null,                         // <-- A promise of { available, reason, engine }
        failedAt : 0,                            // <-- When the last load failed (0: it did not)
        loading  : false,                        // <-- The engine is being fetched and started
        progress : '',                           // <-- The engine's latest words, e.g. "Fetching the handwriting model: 6 of 15 MB"
        worker   : null,
        loaded   : null,                         // <-- Resolves the load in flight with the worker's answer
        nextId   : 0,
        waiting  : new Map(),                    // <-- Write id -> resolve
        queue    : [],                           // <-- [{ annotation, callbacks }]
        running  : false
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hands, Inks and Keys
// -----------------------------------------------------------------------------

    // FUNCTION | A Hand ({ Key, Label, Neatness, Variation }) and an Ink's Colour
    // ------------------------------------------------------------
    function Na__Handwriting__Hand(key) {
        const hands = Na__AppConfig__Get('Handwriting__Hands', []);
        return hands.find((h) => h.Key === key) || hands[0] || { Key: 'Steady', Label: 'Steady hand', Neatness: 1.1, Variation: 0.3 };
    }

    function Na__Handwriting__Ink(key) {
        const inks = Na__AppConfig__Get('Annotation__Inks', []);
        return (inks.find((i) => i.Key === key) || inks[0] || { Colour: '#263b37' }).Colour;
    }
    // ------------------------------------------------------------


    // FUNCTION | What a Note's Ink Depends On (its colour is not one of them)
    // ------------------------------------------------------------
    function Na__Handwriting__Request(annotation) {
        const hand = Na__Handwriting__Hand(annotation.Annotation__HandKey);
        return {
            text      : String(annotation.Annotation__Text || ''),
            size      : Number(annotation.Annotation__SizeMm) || 4.5,
            width     : Number(annotation.Annotation__WidthMm) || 70,
            pen       : Na__AppConfig__Get('Annotation__PenWidthMm', 0.3),
            neatness  : hand.Neatness,
            variation : hand.Variation,
            spacing   : Na__AppConfig__Get('Handwriting__LineSpacing', 1.35),
            seed      : Number(annotation.Annotation__Seed) || 0
        };
    }

    function Na__Handwriting__KeyFor(annotation) {
        return Na__Format__Key(Na__Handwriting__Request(annotation));
    }

    function Na__Handwriting__NeedsWriting(annotation) {
        if (!String(annotation.Annotation__Text || '').trim()) return false;
        const written = annotation.Annotation__Written;
        return !written || written.Key !== Na__Handwriting__KeyFor(annotation);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Engine's Worker
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Answer Everyone Waiting With a Failure (the worker could not run)
    // ------------------------------------------------------------
    function Na__Handwriting__FailAll(reason) {
        const S = Na__Handwriting__State;
        if (S.loaded) { S.loaded({ ok: false, reason }); S.loaded = null; }
        S.waiting.forEach((resolve) => resolve({ ok: false, error: reason }));
        S.waiting.clear();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Message From the Worker: loaded, progress, or a written note
    // ------------------------------------------------------------
    function Na__Handwriting__OnMessage(message) {
        const S = Na__Handwriting__State;
        if (message.type === 'loaded') {
            if (S.loaded) { S.loaded(message); S.loaded = null; }
        } else if (message.type === 'progress') {
            S.progress = String(message.message || '');
        } else if (message.type === 'written') {
            const resolve = S.waiting.get(message.id);
            S.waiting.delete(message.id);
            if (resolve) resolve(message);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Worker, Started Once
    // ------------------------------------------------------------
    function Na__Handwriting__Worker() {
        const S = Na__Handwriting__State;
        if (S.worker) return S.worker;
        const worker = new Worker(Na__Handwriting__WORKER, { type: 'module', name: 'AURA handwriting' });
        worker.addEventListener('message', (event) => Na__Handwriting__OnMessage(event.data || {}));
        worker.addEventListener('error', (event) => {                           // <-- A browser that cannot run it (no module workers), or a script fault
            console.error('[AURA] The handwriting engine\'s worker failed:', event.message || event);
            if (event.preventDefault) event.preventDefault();
            worker.terminate();
            if (S.worker === worker) S.worker = null;
            Na__Handwriting__FailAll('The handwriting engine could not start in this browser.');
        });
        S.worker = worker;
        return worker;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the Engine: the model's manifest from the API, then the worker fetches its weights and starts
    // ------------------------------------------------------------
    async function Na__Handwriting__Load() {
        if (typeof Worker !== 'function' || typeof WebAssembly !== 'object') throw new Error('This browser cannot run the handwriting engine.');
        const answer = await Na__Api__Get('handwriting/model');
        if (!answer.available || !answer.model) throw new Error(answer.reason || 'The handwriting model is not on this server.');
        const worker = Na__Handwriting__Worker();
        const reply = await new Promise((resolve) => {
            Na__Handwriting__State.loaded = resolve;
            worker.postMessage({ type: 'load', manifest: answer.model, weightsUrl: new URL(answer.weights, Na__Api__BASE).href });
        });
        if (!reply.ok) throw new Error(reply.reason || 'The handwriting engine could not start.');
        return reply.engine;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Engine Here? (loaded once a page, again after a failure; { available, reason, engine })
    // ------------------------------------------------------------
    function Na__Handwriting__Status(refresh) {
        const S = Na__Handwriting__State;
        const retry = S.failedAt && Date.now() - S.failedAt > Na__Handwriting__RETRY_MS;
        if (!S.status || refresh || retry) {
            S.failedAt = 0;
            S.loading = true;
            S.status = Na__Handwriting__Load()
                .then((engine) => ({ available: true, reason: '', engine }))
                .catch((error) => {
                    S.failedAt = Date.now();
                    return { available: false, reason: error.message || String(error), engine: null };
                })
                .finally(() => { S.loading = false; S.progress = ''; });
        }
        return S.status;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Engine Being Fetched or Started Now? (the panel says so); its latest words
    // ------------------------------------------------------------
    function Na__Handwriting__Loading() {
        return Na__Handwriting__State.loading;
    }

    function Na__Handwriting__Progress() {
        return Na__Handwriting__State.progress;
    }
    // ------------------------------------------------------------


    // FUNCTION | Write One Note Now: the ink, or a thrown error in the engine's words
    // ------------------------------------------------------------
    async function Na__Handwriting__Write(annotation) {
        const S = Na__Handwriting__State;
        const request = Na__Handwriting__Request(annotation);
        const worker = Na__Handwriting__Worker();
        const id = ++S.nextId;
        const reply = await new Promise((resolve) => {
            S.waiting.set(id, resolve);
            worker.postMessage({ type: 'write', id, request });
        });
        if (!reply.ok) throw new Error(reply.error || 'The handwriting engine could not write this note.');
        const ink = reply.ink || {};
        return {
            Key        : Na__Format__Key(request),
            Paths      : Array.isArray(ink.paths) ? ink.paths.map((p) => ({ D: String(p.d || ''), W: Number(p.w) || request.pen })) : [],
            HeightMm   : Number(ink.height) || request.size * 1.5,
            InkWidthMm : Number(ink.inkWidth) || request.width,
            Lines      : Number(ink.lines) || 1,
            Warnings   : Array.isArray(ink.warnings) ? ink.warnings.slice(0, 4) : [],
            Seconds    : Number(ink.seconds) || 0
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Queue a Note for Writing: onDone(ink | null, error) when it is done
    // ------------------------------------------------------------
    // One note at a time (the engine has one pen). A note queued again while it
    // waits is written once, with its latest words.
    // ------------------------------------------------------------
    function Na__Handwriting__Queue(annotation, onDone) {
        const S = Na__Handwriting__State;
        const waiting = S.queue.find((q) => q.annotation.Annotation__Id === annotation.Annotation__Id);
        if (waiting) { waiting.annotation = annotation; if (onDone) waiting.callbacks.push(onDone); }
        else S.queue.push({ annotation, callbacks: onDone ? [onDone] : [] });
        Na__Handwriting__Pump();
    }

    async function Na__Handwriting__Pump() {
        const S = Na__Handwriting__State;
        if (S.running) return;
        S.running = true;
        try {
            while (S.queue.length) {
                const status = await Na__Handwriting__Status();                  // <-- Loads the engine for the first note; tries again after a failure
                const job = S.queue.shift();
                let ink = null, failure = null;
                if (!status.available) failure = new Error(status.reason || 'The handwriting engine could not start.');
                else {
                    try { ink = await Na__Handwriting__Write(job.annotation); }
                    catch (error) { failure = error; }
                }
                job.callbacks.forEach((fn) => { try { fn(ink, failure); } catch (error) { console.error(error); } });
            }
        } finally {
            S.running = false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Handwriting__Hand,
        Na__Handwriting__Ink,
        Na__Handwriting__KeyFor,
        Na__Handwriting__NeedsWriting,
        Na__Handwriting__Status,
        Na__Handwriting__Loading,
        Na__Handwriting__Progress,
        Na__Handwriting__Write,
        Na__Handwriting__Queue
    };

// endregion -------------------------------------------------------------------
