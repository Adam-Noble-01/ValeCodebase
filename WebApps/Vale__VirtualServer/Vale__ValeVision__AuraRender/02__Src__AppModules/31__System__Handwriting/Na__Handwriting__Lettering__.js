// =============================================================================
// VALEVISION AURA - HANDWRITING - LETTERING (TITLE BLOCK AND VIEWPORT TITLES)
// =============================================================================
//
// FILE       : Na__Handwriting__Lettering__.js
// NAMESPACE  : Na__Lettering
// MODULE     : Handwriting - Lettering
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Write a sheet's own words by hand, as its notes are written: the
//              title block's entries and every viewport's title, drawn from this
//              device's store of handwritten ink, typed until they are written
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - Adam, 30-Oct-2026: "Use handwriting in the titleblock and viewports not
//   text". The printed form stays printed (the title block's labels and Vale's
//   artwork); what is filled in is written by hand.
// - THE SAME ENGINE AS THE NOTES: the WebAssembly Graves model, through the
//   handwriting client's queue, always after any note. The lettering hand,
//   pens and colour are AuraConfig__Handwriting__Lettering (the careful hand;
//   the 0.18 mm Mars matic M018, and the 0.25 mm M025 where the typed block
//   was bold), with no margin, so the ink starts where the typed words did.
// - KEPT ON THIS DEVICE, NOT IN THE DRAWING SET: lettering is written from a
//   sheet's own words, and the engine writes the same strokes for the same
//   words and settings on every device, so each device writes it once and
//   keeps it (IndexedDB 'aura-handwriting', and memory for this page). Every
//   save stays small; a changed word is a new key, written fresh.
// - THE SEED is the words' own (a hash of the text): the same words always
//   read the same way, on any sheet.
// - UNTIL IT IS WRITTEN the typed words show (the caller's own drawing). Words
//   the pen cannot write, or a phrase that keeps stalling, stay typed. "@" is
//   written "at".
// - FITS ITS BOX: a phrase is drawn smaller when it is wider or taller than
//   its box, its pen kept at its true width on the paper.
// - IN ARCHITECT'S CAPITALS (1.1.0, Adam's call, 30-Oct-2026): the lettering's
//   Letters (AuraConfig__Handwriting__Lettering) is 'Capitals', drawn at once
//   on the page from the words (the capitals engine needs no model), so the
//   titles never wait, never stall and never show typed. 'Joined' keeps the
//   model's hand, through the queue and this device's store, as in 1.0.0.
// - ONE PEN FOR THE WHOLE SHEET (1.2.0, AURA 0.5.10; Adam: "it all looks like
//   it was written by the same person with the same pen at the same time"):
//   the lettering writes as a new note does, the Example Cottage's leader note
//   being the standard: the Steady hand, capitals, the 0.18 mm M018 and the
//   note's Forest ink (AuraConfig__Handwriting__Lettering Ink, an
//   Annotation__Inks key), never a black of its own.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.2.0
// - The house hand (AURA 0.5.10): the Steady hand, M018 for every entry and
//   the notes' Forest ink by default (Na__Lettering__Colour); a caller's
//   Colour still wins.
//
// 30-Oct-2026 - Version 1.1.0
// - Architect's capitals, drawn at once (AURA 0.4.9).
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build (AURA 0.3.4).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Dom__Svg } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Key } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__HandwritingStyle__Effective, Na__HandwritingStyle__Pens } from './Na__Handwriting__Style__.js';
    import { Na__Handwriting__QueueRequest, Na__Handwriting__IsCapitals, Na__Handwriting__Letter, Na__Handwriting__Ink } from './Na__Handwriting__Client__.js';
    import { Na__Layout__REVISION } from './02__Engine__Wasm/Na__HandwritingEngine__Layout__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    const Na__Lettering__DB_NAME     = 'aura-handwriting';
    const Na__Lettering__DB_STORE    = 'ink';
    const Na__Lettering__ONE_LINE_MM = 350;                                     // <-- The engine's widest note: a one-line phrase never wraps
    const Na__Lettering__RETRY_MS    = 20000;                                   // <-- After the engine could not run, ask again after this long
    const Na__Lettering__BATCH_MS    = 40;                                      // <-- Ink arriving together redraws once

    const Na__Lettering__State = {
        ink        : new Map(),                  // <-- Key -> ink, for this page
        pending    : new Set(),                  // <-- Keys asked for and not answered yet
        failed     : new Map(),                  // <-- Key -> why it stays typed (words the pen cannot write)
        engineDown : 0,                          // <-- Until when the engine is not asked again (it could not run)
        channels   : new Map(),                  // <-- Channel -> the latest redraw for it
        due        : new Set(),                  // <-- Channels to redraw at the next batch
        timer      : 0,
        db         : null                        // <-- A promise of the IndexedDB database, or null
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Device's Store (IndexedDB, memory if there is none)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Database, Opened Once (null in a browser that refuses it)
    // ------------------------------------------------------------
    function Na__Lettering__Db() {
        const S = Na__Lettering__State;
        if (!S.db) {
            S.db = new Promise((resolve) => {
                try {
                    const open = self.indexedDB.open(Na__Lettering__DB_NAME, 1);
                    open.onupgradeneeded = () => open.result.createObjectStore(Na__Lettering__DB_STORE);
                    open.onsuccess = () => resolve(open.result);
                    open.onerror = () => resolve(null);
                    open.onblocked = () => resolve(null);
                } catch (error) { resolve(null); }                              // <-- A private window may have no IndexedDB: memory only
            });
        }
        return S.db;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read and Keep One Ink by Its Key
    // ------------------------------------------------------------
    async function Na__Lettering__Read(key) {
        const db = await Na__Lettering__Db();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const request = db.transaction(Na__Lettering__DB_STORE, 'readonly').objectStore(Na__Lettering__DB_STORE).get(key);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
            } catch (error) { resolve(null); }
        });
    }

    async function Na__Lettering__Keep(key, ink) {
        const db = await Na__Lettering__Db();
        if (!db) return;
        try { db.transaction(Na__Lettering__DB_STORE, 'readwrite').objectStore(Na__Lettering__DB_STORE).put(ink, key); }
        catch (error) { /* <-- A full disk: the page still has it in memory */ }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Requests and Redraws
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Words as the Pen Writes Them ("@" as "at", single spaces)
    // ------------------------------------------------------------
    function Na__Lettering__Clean(text) {
        return String(text || '').replace(/\s*@\s*/g, ' at ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Words' Own Seed (FNV-1a, in the engine's seed range)
    // ------------------------------------------------------------
    function Na__Lettering__Seed(text) {
        let h = 0x811C9DC5;
        for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
        return (h >>> 0) & 0x7FFFFFFF;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Engine Request for Some Lettering (the lettering hand, no margin, widths relative to the nib)
    // ------------------------------------------------------------
    function Na__Lettering__Request(text, sizeMm, widthMm) {
        const config = Na__AppConfig__Get('Handwriting__Lettering', {});
        const letters = config.Letters === 'Joined' ? 'Joined' : 'Capitals';
        const style = Na__HandwritingStyle__Effective({ Annotation__HandKey: config.Hand || Na__AppConfig__Get('Handwriting__DefaultHand', 'Steady'), Annotation__Style: Object.assign({}, config.Style || {}, { MarginMm: 0 }) });
        return {
            text     : text,
            size     : Math.round(Math.min(12, Math.max(2, sizeMm)) * 100) / 100,
            width    : Math.round(Math.min(Na__Lettering__ONE_LINE_MM, Math.max(20, widthMm)) * 10) / 10,
            seed     : Na__Lettering__Seed(text),
            style    : Object.assign(style, { Letters: letters }),
            widths   : 'nib',
            revision : Na__Layout__REVISION[letters]
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Redraw Each Channel Once When Ink Arrives Together
    // ------------------------------------------------------------
    function Na__Lettering__Notify(channel) {
        const S = Na__Lettering__State;
        S.due.add(channel);
        if (S.timer) return;
        S.timer = setTimeout(() => {
            S.timer = 0;
            const due = Array.from(S.due);
            S.due.clear();
            due.forEach((c) => {
                const redraw = S.channels.get(c);
                if (redraw) { try { redraw(); } catch (error) { console.error('[AURA] Lettering redraw failed:', error); } }
            });
        }, Na__Lettering__BATCH_MS);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch Some Lettering: this device's store first, else the engine (behind every note)
    // ------------------------------------------------------------
    async function Na__Lettering__Fetch(key, request, channel) {
        const S = Na__Lettering__State;
        if (S.pending.has(key) || S.failed.has(key) || Date.now() < S.engineDown) return;
        S.pending.add(key);
        const kept = await Na__Lettering__Read(key);
        if (kept && Array.isArray(kept.Paths)) {
            S.pending.delete(key);
            S.ink.set(key, kept);
            Na__Lettering__Notify(channel);
            return;
        }
        Na__Handwriting__QueueRequest(key, request, (ink, error) => {
            S.pending.delete(key);
            if (ink) {
                S.ink.set(key, ink);
                Na__Lettering__Keep(key, ink);
                Na__Lettering__Notify(channel);
            } else if (error && error.engine) {
                S.engineDown = Date.now() + Na__Lettering__RETRY_MS;         // <-- The engine could not run: typed for now, asked again later
            } else {
                S.failed.set(key, error ? error.message || String(error) : 'not written');   // <-- The words themselves: typed for this page
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing
// -----------------------------------------------------------------------------

    // FUNCTION | Draw Lettering by Hand Where It Is Written, Else Typed: true when drawn by hand
    // ------------------------------------------------------------
    // spec: { Text, X, Y (the box's top left, sheet mm), WidthMm, HeightMm
    // (the box; HeightMm optional), SizeMm (the handwriting's letter height),
    // OneLine (never wrap: the box only shrinks it), PenKey (else the lettering
    // pen), Colour, Channel (what onInk redraws: one redraw per channel) }.
    // typed(): draws the typed words meanwhile. onInk(): the caller's redraw,
    // called once the ink is here (a short batch, once per channel).
    // ------------------------------------------------------------
    function Na__Lettering__Draw(parent, spec, typed, onInk) {
        const S = Na__Lettering__State;
        const text = Na__Lettering__Clean(spec.Text);
        if (!text) return false;
        const channel = spec.Channel || 'default';
        if (onInk) S.channels.set(channel, onInk);
        const request = Na__Lettering__Request(text, spec.SizeMm, spec.OneLine ? Na__Lettering__ONE_LINE_MM : spec.WidthMm);
        const key = Na__Format__Key(request);
        if (!S.ink.has(key) && !S.failed.has(key) && Na__Handwriting__IsCapitals(request)) {
            try { S.ink.set(key, Na__Handwriting__Letter(request)); }          // <-- Capitals: lettered now, kept for this page
            catch (error) { S.failed.set(key, error.message || String(error)); }
        }
        const ink = S.ink.get(key);
        if (!ink) {
            if (typed) typed();
            Na__Lettering__Fetch(key, request, channel);
            return false;
        }

        const config = Na__AppConfig__Get('Handwriting__Lettering', {});
        const pens = Na__HandwritingStyle__Pens();
        const pen = pens.find((p) => p.Key === (spec.PenKey || config.Pen || 'M018')) || pens[0];
        const wide = spec.WidthMm && ink.InkWidthMm > spec.WidthMm ? spec.WidthMm / ink.InkWidthMm : 1;
        const tall = spec.HeightMm && ink.HeightMm > spec.HeightMm ? spec.HeightMm / ink.HeightMm : 1;
        const k = Math.min(1, wide, tall);                                       // <-- Smaller to fit its box, never larger
        const g = Na__Dom__Svg('g', { transform: `translate(${spec.X.toFixed(3)} ${spec.Y.toFixed(3)})${k < 1 ? ` scale(${k.toFixed(4)})` : ''}`,
                                      fill: 'none', stroke: spec.Colour || Na__Lettering__Colour(), 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
                                      class: 'aura-lettering' }, parent);
        ink.Paths.forEach((p) => Na__Dom__Svg('path', { d: p.D, 'stroke-width': ((ink.Relative ? p.W * pen.WidthMm : p.W) / k).toFixed(4) }, g));   // <-- / k: the pen keeps its true width
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Lettering's Ink Colour: the notes' ink (AuraConfig__Handwriting__Lettering Ink, else a new note's)
    // ------------------------------------------------------------
    function Na__Lettering__Colour() {
        const config = Na__AppConfig__Get('Handwriting__Lettering', {});
        return config.Colour || Na__Handwriting__Ink(config.Ink || Na__AppConfig__Get('Annotation__DefaultInk', 'Forest'));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Lettering's Letter Height for a Typed Size (AuraConfig__Handwriting__Lettering SizeFactor)
    // ------------------------------------------------------------
    function Na__Lettering__Size(typedSizeMm) {
        const config = Na__AppConfig__Get('Handwriting__Lettering', {});
        if (config.Letters === 'Joined') return typedSizeMm * (Number(config.SizeFactor) || 1.15);
        return typedSizeMm * (Number(config.CapitalsSizeFactor) || 1.1);       // <-- A capital stands 0.7 of the letter height: about the typed capitals' own height
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Lettering__Draw,
        Na__Lettering__Size,
        Na__Lettering__Colour,
        Na__Lettering__Request
    };

// endregion -------------------------------------------------------------------
