// =============================================================================
// VALEVISION AURA - APP UTILS - SNAPSHOT STORE
// =============================================================================
//
// FILE       : Na__AppUtils__SnapshotStore__.js
// NAMESPACE  : Na__SnapStore
// MODULE     : App Utils - Snapshot Store
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Where the undo history keeps its steps: each one a whole snapshot
//              of the drawing set, its repeated parts stored once, so 100 undos
//              and 100 redos of a large drawing set stay small
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - A step is a whole snapshot, never a list of operations to reverse: there is
//   no inverse to get wrong (the rule of ValeVision 3D's snapshot histories).
// - SHARED PARTS: a snapshot is kept as JSON whose larger objects and arrays
//   (the chunk size and over) are chunks, each named by a hash of its text and
//   kept once however many steps hold it. Moving one viewport adds the few
//   chunks on the path to it; every other sheet, viewport and handwritten note
//   (its pen paths are most of a drawing set) is shared by both steps.
// - EXACT: a hash only names a chunk; a chunk is taken for another only when
//   their texts are the same, and two texts that hash alike get two names.
//   Read gives back what Keep was given, in the same key order, as JSON would.
// - COUNTED: each chunk counts the steps and chunks that hold it and goes when
//   the last lets go, so a step dropped off the end frees what only it held.
// - Plain data only (what JSON keeps). This module knows nothing of AURA.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : PainterlyNPR 02__Src__AppModules/84__System__UndoHistory/
//                   PainterlyNPR__UndoHistory__Store__.mjs (v0.7.4, 30-Oct-2026)
// - Ported on     : 30-Oct-2026 for AURA 0.3.1
// - Parity        : verbatim logic. AURA does not import it from the pinned
//                   engine: only 10__System__EngineHost imports the engine, and
//                   the pinned v0.6.0 has no undo history.
// - Divergences   :
//   - Na__SnapStore__ names for PainterlyNPR__UndoHistory__; Size for StoreSize.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.3.1)
// - Initial port.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | The Chunks
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Reference Key - a chunk written inside its parent's text
    // ------------------------------------------------------------
    const Na__SnapStore__REF      = '\u0000';                                    // <-- No key in a drawing set is a NUL character, so a reference is never taken for data
    const Na__SnapStore__REF_JSON = JSON.stringify(Na__SnapStore__REF);
    // ------------------------------------------------------------

    // MODULE STATE | The Chunks by Name - { text, refs, count }
    // ------------------------------------------------------------
    const Na__SnapStore__Chunks = new Map();
    const Na__SnapStore__State  = { minChars: 512, chars: 0 };
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Chunk's Name - two 32-bit hashes of its text, and its length
    // ------------------------------------------------------------
    function Na__SnapStore__Hash(text) {
        let a = 0x811c9dc5, b = 0x9e3779b9;
        for (let i = 0; i < text.length; i++) {
            const c = text.charCodeAt(i);
            a = Math.imul(a ^ c, 0x01000193);
            b = Math.imul(b ^ c, 0x5bd1e995);
            b ^= b >>> 15;
        }
        return `${(a >>> 0).toString(36)}.${(b >>> 0).toString(36)}.${text.length.toString(36)}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put a Chunk in the Store, or Find It There - its name
    // ------------------------------------------------------------
    // A new chunk holds each chunk its text names, once.
    // ------------------------------------------------------------
    function Na__SnapStore__Put(text, refs) {
        const base = Na__SnapStore__Hash(text);
        let name = base;
        for (let n = 1; Na__SnapStore__Chunks.has(name) && Na__SnapStore__Chunks.get(name).text !== text; n++) name = `${base}~${n}`;   // <-- Two texts, one hash: each keeps a name of its own
        if (!Na__SnapStore__Chunks.has(name)) {
            const unique = [...new Set(refs)];
            Na__SnapStore__Chunks.set(name, { text, refs: unique, count: 0 });
            Na__SnapStore__State.chars += text.length;
            unique.forEach((ref) => { Na__SnapStore__Chunks.get(ref).count++; });
        }
        return name;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Value as Stored Text - { text, refs }
    // ------------------------------------------------------------
    // The value's JSON, with each large object or array inside it written as a
    // reference to its chunk; refs names the chunks this text holds. A root is
    // always a chunk, whatever its size.
    // ------------------------------------------------------------
    function Na__SnapStore__Encode(value, root) {
        if (value === null || typeof value !== 'object') return { text: JSON.stringify(value) ?? 'null', refs: [] };
        const parts = [];
        const refs = [];
        const take = (item) => {
            const encoded = Na__SnapStore__Encode(item, false);
            encoded.refs.forEach((ref) => refs.push(ref));
            return encoded.text;
        };
        let text;
        if (Array.isArray(value)) {
            value.forEach((item) => parts.push(item === undefined || typeof item === 'function' ? 'null' : take(item)));
            text = `[${parts.join(',')}]`;
        } else {
            Object.keys(value).forEach((key) => {
                const item = value[key];
                if (item === undefined || typeof item === 'function') return;   // <-- As JSON leaves them out
                parts.push(`${JSON.stringify(key)}:${take(item)}`);
            });
            text = `{${parts.join(',')}}`;
        }
        if (!root && text.length < Na__SnapStore__State.minChars) return { text, refs };
        const name = Na__SnapStore__Put(text, refs);
        return { text: `{${Na__SnapStore__REF_JSON}:${JSON.stringify(name)}}`, refs: [name] };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keep, Read, Drop
// -----------------------------------------------------------------------------

    // FUNCTION | Keep a Snapshot - its name, held once for the caller
    // ------------------------------------------------------------
    // The same value kept twice is the same name, held twice: comparing two
    // names is comparing two snapshots.
    // ------------------------------------------------------------
    function Na__SnapStore__Keep(value) {
        const encoded = Na__SnapStore__Encode(value, true);
        const name = encoded.refs.length ? encoded.refs[0] : Na__SnapStore__Put(encoded.text, []);
        Na__SnapStore__Chunks.get(name).count++;
        return name;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Snapshot Back - a fresh copy, exactly as it was kept
    // ------------------------------------------------------------
    function Na__SnapStore__Read(name) {
        const chunk = Na__SnapStore__Chunks.get(name);
        if (!chunk) throw new Error(`[AURA] No snapshot ${name} in the store.`);
        return JSON.parse(chunk.text, (key, value) => ((value && typeof value === 'object' && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, Na__SnapStore__REF))
            ? Na__SnapStore__Read(value[Na__SnapStore__REF])
            : value));
    }
    // ------------------------------------------------------------


    // FUNCTION | Let a Snapshot Go - each chunk goes once nothing holds it
    // ------------------------------------------------------------
    function Na__SnapStore__Drop(name) {
        const names = [name];
        while (names.length) {
            const next = names.pop();
            const chunk = Na__SnapStore__Chunks.get(next);
            if (!chunk || --chunk.count > 0) continue;
            Na__SnapStore__Chunks.delete(next);
            Na__SnapStore__State.chars -= chunk.text.length;
            chunk.refs.forEach((ref) => names.push(ref));
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Chunk Size, and How Big the Store Is
    // ------------------------------------------------------------
    function Na__SnapStore__SetChunkSize(chars) {
        Na__SnapStore__State.minChars = Math.max(32, Math.round(Number(chars) || 512));
    }

    function Na__SnapStore__Size() {
        return { chunks: Na__SnapStore__Chunks.size, chars: Na__SnapStore__State.chars };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__SnapStore__Keep,
        Na__SnapStore__Read,
        Na__SnapStore__Drop,
        Na__SnapStore__SetChunkSize,
        Na__SnapStore__Size
    };

// endregion -------------------------------------------------------------------
