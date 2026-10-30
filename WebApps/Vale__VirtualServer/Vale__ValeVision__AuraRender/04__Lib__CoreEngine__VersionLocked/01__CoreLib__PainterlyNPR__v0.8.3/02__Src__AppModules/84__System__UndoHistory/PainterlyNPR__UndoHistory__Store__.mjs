/* =============================================================================
   PAINTERLYNPR - SYSTEM | UNDO HISTORY - STORE
   =============================================================================

   FILE       : PainterlyNPR__UndoHistory__Store__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : System - UndoHistory - Store
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Where the undo history keeps its steps: each one a whole snapshot,
                its repeated parts stored once, so 100 undos and 100 redos stay
                small
   CREATED    : 30-Oct-2026 (v0.7.4)

   DESCRIPTION:
   - A step is a whole snapshot, never a list of operations to reverse: there is
     no inverse to get wrong (the rule of ValeVision 3D's snapshot histories).
   - SHARED PARTS: a snapshot is kept as JSON whose larger objects and arrays
     (ChunkMinChars of text and over) are chunks, each named by a hash of its
     text and kept once however many steps hold it. One slider moved between
     two steps adds the few chunks on the path to it; every placed asset, point
     and material that did not change is shared by both.
   - EXACT: a hash only names a chunk; a chunk is taken for another only when
     their texts are the same, and two texts that hash alike get two names.
     Read gives back what Keep was given, in the same key order, as JSON would.
   - COUNTED: each chunk counts the steps and chunks that hold it and goes when
     the last lets go, so a step dropped off the end frees what only it held.
   - Plain data only (what JSON keeps). This module knows nothing of the app.

   ============================================================================= */

// =============================================================================
// REGION | System - Undo History - Store
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | The Chunks
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Reference Key - a chunk written inside its parent's text
    // ------------------------------------------------------------
    const REF       =  '\u0000';                                                 // <-- No key in a drawing is a NUL character, so a reference is never taken for data
    const REF_JSON  =  JSON.stringify(REF);
    // ------------------------------------------------------------

    // MODULE STATE | The Chunks by Name - { Text, Refs, Count }
    // ------------------------------------------------------------
    const Chunks  =  new Map();
    const Store   =  { MinChars: 256, Chars: 0 };
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Chunk's Name - two 32-bit hashes of its text, and its length
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Hash(text) {
        let a  =  0x811c9dc5, b  =  0x9e3779b9;
        for (let i = 0; i < text.length; i++) {
            const c  =  text.charCodeAt(i);
            a  =  Math.imul(a ^ c, 0x01000193);
            b  =  Math.imul(b ^ c, 0x5bd1e995);
            b ^=  b >>> 15;
        }
        return `${(a >>> 0).toString(36)}.${(b >>> 0).toString(36)}.${text.length.toString(36)}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put a Chunk in the Store, or Find It There - its name
    // ------------------------------------------------------------
    // A new chunk holds each chunk its text names, once.
    function PainterlyNPR__UndoHistory__Put(text, refs) {
        const base  =  PainterlyNPR__UndoHistory__Hash(text);
        let name  =  base;
        for (let n = 1; Chunks.has(name) && Chunks.get(name).Text !== text; n++) name = `${base}~${n}`;   // <-- Two texts, one hash: each keeps a name of its own
        if (!Chunks.has(name)) {
            const unique  =  [...new Set(refs)];
            Chunks.set(name, { Text: text, Refs: unique, Count: 0 });
            Store.Chars  +=  text.length;
            for (const ref of unique) Chunks.get(ref).Count++;
        }
        return name;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Value as Stored Text - { Text, Refs }
    // ------------------------------------------------------------
    // The value's JSON, with each large object or array inside it written as a
    // reference to its chunk; Refs names the chunks this text holds. A root is
    // always a chunk, whatever its size.
    function PainterlyNPR__UndoHistory__Encode(value, root) {
        if (value === null || typeof value !== 'object') return { Text: JSON.stringify(value) ?? 'null', Refs: [] };
        const parts  =  [];
        const refs   =  [];
        const take   =  (item) => {
            const encoded  =  PainterlyNPR__UndoHistory__Encode(item, false);
            for (const ref of encoded.Refs) refs.push(ref);
            return encoded.Text;
        };
        let text;
        if (Array.isArray(value)) {
            for (const item of value) parts.push(item === undefined || typeof item === 'function' ? 'null' : take(item));
            text  =  `[${parts.join(',')}]`;
        } else {
            for (const key of Object.keys(value)) {
                const item  =  value[key];
                if (item === undefined || typeof item === 'function') continue;  // <-- As JSON leaves them out
                parts.push(`${JSON.stringify(key)}:${take(item)}`);
            }
            text  =  `{${parts.join(',')}}`;
        }
        if (!root && text.length < Store.MinChars) return { Text: text, Refs: refs };
        const name  =  PainterlyNPR__UndoHistory__Put(text, refs);
        return { Text: `{${REF_JSON}:${JSON.stringify(name)}}`, Refs: [name] };
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
    function PainterlyNPR__UndoHistory__Keep(value) {
        const encoded  =  PainterlyNPR__UndoHistory__Encode(value, true);
        const name     =  encoded.Refs.length ? encoded.Refs[0] : PainterlyNPR__UndoHistory__Put(encoded.Text, []);
        Chunks.get(name).Count++;
        return name;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Snapshot Back - a fresh copy, exactly as it was kept
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Read(name) {
        const chunk  =  Chunks.get(name);
        if (!chunk) throw new Error(`[PainterlyNPR UndoHistory] No snapshot ${name} in the store.`);
        return JSON.parse(chunk.Text, (key, value) => (value && typeof value === 'object' && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, REF))
            ? PainterlyNPR__UndoHistory__Read(value[REF])
            : value);
    }
    // ------------------------------------------------------------


    // FUNCTION | Let a Snapshot Go - each chunk goes once nothing holds it
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__Drop(name) {
        const names  =  [name];
        while (names.length) {
            const next   =  names.pop();
            const chunk  =  Chunks.get(next);
            if (!chunk || --chunk.Count > 0) continue;
            Chunks.delete(next);
            Store.Chars  -=  chunk.Text.length;
            for (const ref of chunk.Refs) names.push(ref);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Chunk Size, and How Big the Store Is
    // ------------------------------------------------------------
    function PainterlyNPR__UndoHistory__SetChunkSize(chars) {
        Store.MinChars  =  Math.max(32, Math.round(Number(chars) || 256));
    }

    function PainterlyNPR__UndoHistory__StoreSize() {
        return { Chunks: Chunks.size, Chars: Store.Chars };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__UndoHistory__Drop,
        PainterlyNPR__UndoHistory__Keep,
        PainterlyNPR__UndoHistory__Read,
        PainterlyNPR__UndoHistory__SetChunkSize,
        PainterlyNPR__UndoHistory__StoreSize,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
