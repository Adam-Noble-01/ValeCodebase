// =============================================================================
// VALEVISION AURA - HANDWRITING - THE CLIENT
// =============================================================================
//
// FILE       : Na__Handwriting__Client__.js
// NAMESPACE  : Na__Handwriting
// MODULE     : Handwriting - Client
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Turn a note's words into handwritten ink: ask the handwriting
//              engine through the AURA API, one note at a time, and say plainly
//              when the engine is not there
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE ENGINE is the Vale Handwriting Studio's (a PyTorch Graves model,
//   01__Engine__PythonReference beside this file). It runs on the user's own
//   machine, never on the server (Adam, 30-Oct-2026: the server is resource
//   constrained). Today that means a PC running the Vale dev server with the
//   engine's Python; on app.valegardenhouses.com the API answers "not here",
//   and a note keeps a typed stand-in until it is written on such a PC.
// - INK IS SAVED WITH THE NOTE (Annotation__Written: the strokes as SVG paths
//   in millimetres, keyed by what made them), so a note is written once and
//   shows everywhere. The ink's colour is applied on the sheet, so a new colour
//   never needs a new copy; new words, size, width or hand do.
// - NEXT (Adam): the engine rewritten for WebAssembly, served as static files
//   and kept on the device by AURA's service worker; Na__Handwriting__Write
//   then asks it instead of the API, and nothing else changes.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Api__Get, Na__Api__Post } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';
    import { Na__Format__Key } from '../03__AppUtils/Na__AppUtils__Format__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Handwriting__State = {
        status  : null,                          // <-- A promise of { available, reason, engine }
        queue   : [],                            // <-- [{ annotation, onDone }]
        running : false
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
// REGION | The Engine
// -----------------------------------------------------------------------------

    // FUNCTION | Is the Engine Here? (asked once a page; { available, reason, engine })
    // ------------------------------------------------------------
    function Na__Handwriting__Status(refresh) {
        if (!Na__Handwriting__State.status || refresh) {
            Na__Handwriting__State.status = Na__Api__Get('handwriting/status')
                .then((answer) => ({ available: !!answer.available, reason: answer.reason || '', engine: answer.engine || null }))
                .catch((error) => ({ available: false, reason: error.message || 'The handwriting engine could not be reached.', engine: null }));
        }
        return Na__Handwriting__State.status;
    }
    // ------------------------------------------------------------


    // FUNCTION | Write One Note Now: the ink, or a thrown error in the engine's words
    // ------------------------------------------------------------
    async function Na__Handwriting__Write(annotation) {
        const request = Na__Handwriting__Request(annotation);
        const answer = await Na__Api__Post('handwriting/write', request);
        const ink = answer.ink || {};
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
            const status = await Na__Handwriting__Status();
            while (S.queue.length) {
                const job = S.queue.shift();
                let ink = null, failure = null;
                if (!status.available) failure = new Error(status.reason || 'The handwriting engine is not on this server.');
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
        Na__Handwriting__Write,
        Na__Handwriting__Queue
    };

// endregion -------------------------------------------------------------------
