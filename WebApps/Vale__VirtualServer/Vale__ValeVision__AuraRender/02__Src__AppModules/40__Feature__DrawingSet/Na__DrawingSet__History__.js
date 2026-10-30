// =============================================================================
// VALEVISION AURA - DRAWING SET - UNDO AND REDO
// =============================================================================
//
// FILE       : Na__DrawingSet__History__.js
// NAMESPACE  : Na__History
// MODULE     : Drawing Set - History
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Undo and redo for the whole drawing set: the last 100 changes back
//              and 100 forward again, from Ctrl + Z and Ctrl + Y or the header's
//              two arrows, each opening the tab it was made on
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - Adam, 30-Oct-2026: "Add a comprehensive user undo / redo caching system to
//   both The NPR Demo Environment and Aura so to both apps to store 100 undos
//   and 100 redos then add control +z and control + y as keyboard mappings".
//   His calls: one history for the whole drawing set, and Ctrl + Z opens the
//   tab the change was on; buttons as well as keys; this visit only.
// - A STEP IS THE WHOLE DRAWING SET, its Meta aside (when and by whom it was
//   saved): sheets and their title blocks, viewports, notes and leaders, saved
//   views, art direction points and the engine's settings; adding and deleting
//   a sheet are steps too. The 3D camera is not in the drawing set, so it is
//   never undone; nor are the open tab, the zoom, the selection or the tool.
// - EVERY EDIT IS ANNOUNCED (Na__AppState__Touch: 'changed'), and becomes a
//   step once it has settled: nothing more for SettleMs and no pointer button
//   held (TypingSettleMs in a text box, or when the box is left), so a drag or
//   a run of typing is one step. A note's handwriting arriving ('ink') is not
//   an edit: it is written into the step that made the note. What the drawing
//   set does before the first key or press (opening, a pen catching up) is the
//   starting point.
// - UNDO WRITES THE STEP BACK INTO THE LIVE RECORDS BY ID, as the Layout
//   Editor's history writes into its sheet record: a sheet, viewport, note or
//   saved view that is still there is the same object, so whatever holds it
//   sees the change. Engine settings that differ are applied again (the
//   viewports redraw); a note's handwriting seen before is put back from a
//   small cache, so it is not written again. The restore is saved like the
//   edit it reverses, then 'restored' is announced ({ direction, reason,
//   label, tab }) and AuraApp reopens that tab, keeping the selection if it
//   is still there.
// - KEPT by 03's Snapshot Store: whole snapshots, their repeated parts once,
//   so 200 steps of a drawing set full of handwritten notes stay small.
// - The pattern of ValeVision 3D's Layout Editor history
//   (Na__LayoutEditor__History__ 1.7.0: announced changes as whole snapshots,
//   a cap, restores never recorded, the reason kept with the step) and its key
//   map's Edit__Undo, Edit__Redo and Edit__RedoShift; the same design as
//   PainterlyNPR's own (84__System__UndoHistory, v0.7.4).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.3.1)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import Na__History__KeyMap from './Na__Hotkeys__DrawingSet__.json' with { type: 'json' };
    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__On, Na__AppState__Emit, Na__AppState__Touch, Na__AppState__Select } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__IconButton, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__SnapStore__Keep, Na__SnapStore__Read, Na__SnapStore__Drop, Na__SnapStore__SetChunkSize } from '../03__AppUtils/Na__AppUtils__SnapshotStore__.js';
    import { Na__EngineHost__Settings, Na__EngineHost__ApplySettings } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__Handwriting__KeyFor, Na__Handwriting__NeedsWriting } from '../31__System__Handwriting/Na__Handwriting__Client__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | What the Arrows Say, and What Each Kind of Step Is Called
    // ------------------------------------------------------------
    const Na__History__WORDS = {
        Undo         : 'Undo: {step} ({keys})',
        Redo         : 'Redo: {step} ({keys})',
        NothingUndo  : 'Nothing to undo ({keys})',
        NothingRedo  : 'Nothing to redo ({keys})',
        SheetAdded   : 'Add a sheet',
        SheetRemoved : 'Delete a sheet',
        SheetRenamed : 'Rename a sheet',
        Paper        : 'Change the paper',
        TitleBlock   : 'Change the title block',
        Engine       : 'Change the parameters',
        Points       : 'Change the art direction points',
        Other        : 'Change the drawing set',
        Several      : 'Several changes'
    };
    const Na__History__VIEW_WORDS = {
        added   : 'Add a view',
        removed : 'Delete a view',
        changed : 'Change a view',
        detail  : (was, now) => {
            const a = was.Viewport__FrameMm || {}, b = now.Viewport__FrameMm || {};
            if (a.WidthMm !== b.WidthMm || a.HeightMm !== b.HeightMm) return 'Resize a view';
            if (a.X !== b.X || a.Y !== b.Y) return 'Move a view';
            return 'Change a view';
        }
    };
    const Na__History__NOTE_WORDS = {
        added   : 'Add a note',
        removed : 'Delete a note',
        changed : 'Change a note',
        detail  : (was, now) => {
            if (was.Annotation__Text !== now.Annotation__Text) return 'Change a note\'s words';
            if (JSON.stringify(was.Annotation__TipMm) !== JSON.stringify(now.Annotation__TipMm)) return 'Move a leader\'s arrow';
            if (JSON.stringify(was.Annotation__AtMm) !== JSON.stringify(now.Annotation__AtMm)) return 'Move a note';
            return 'Change a note';
        }
    };
    const Na__History__SAVED_WORDS = {
        added   : 'Save a view',
        removed : 'Delete a saved view',
        changed : 'Change a saved view'
    };
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Keys (Na__Hotkeys__DrawingSet__.json), Their Words, and What Is a Text Box
    // ------------------------------------------------------------
    const Na__History__BINDINGS = (Na__History__KeyMap.DrawingSet__KeyboardBindings__Config || {});
    const Na__History__KEY_LIST = Array.isArray(Na__History__BINDINGS.DrawingSet__KeyboardBindings__List) ? Na__History__BINDINGS.DrawingSet__KeyboardBindings__List : [];
    const Na__History__KEY_WORDS = {
        Undo : Na__History__KeyWords('Edit__Undo'),
        Redo : Na__History__KeyWords('Edit__Redo')
    };
    const Na__History__TEXT_INPUTS   = ['text', 'search', 'number', 'email', 'url', 'tel', 'password'];
    const Na__History__MODIFIER_KEYS = ['Control', 'Shift', 'Alt', 'AltGraph', 'Meta'];
    const Na__History__INK_CACHE     = 120;                                     // <-- Handwritten notes remembered for a restore
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // A step is { id, reason, tab, label }: its snapshot's name in the store,
    // and the edit that made it - announced as what, on which tab, called what.
    const Na__History__State = {
        started   : false,
        undo      : [],                          // <-- Steps back, the oldest first
        redo      : [],                          // <-- Steps forward again, the next one last
        current   : null,                        // <-- The drawing set as it stands
        last      : null,                        // <-- Current's summary: the next step is named by what moved from it
        pending   : null,                        // <-- An announced edit, settling: { reason, tab }
        timer     : 0,
        held      : false,                       // <-- A pointer button is down: a drag is under way
        touched   : false,                       // <-- A key or press since the start or the last restore
        restoring : false,
        keyAt     : 0,                           // <-- When a key last undid or redid (RepeatMs)
        inks      : new Map(),                   // <-- Handwriting seen, by its key, the newest last
        buttons   : null                         // <-- { Undo, Redo }: the header's arrows
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Snapshots and Their Names
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Keys of an Action as Words ("Ctrl + Z")
    // ------------------------------------------------------------
    function Na__History__KeyWords(action) {
        const binding = Na__History__KEY_LIST.find((b) => b && b.Enabled !== false && b.Action === action && Array.isArray(b.Keys) && b.Keys.length);
        return binding ? [...(binding.Modifiers || []), binding.Keys[0].toUpperCase()].join(' + ') : '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Drawing Set as a Step - all of it but its Meta
    // ------------------------------------------------------------
    // Shallow: the store reads it at once. A new drawing set's engine settings
    // are null (the engine's own start); the step keeps what that is, so an
    // undo can put the engine back to it.
    // ------------------------------------------------------------
    function Na__History__Snapshot() {
        const doc = Na__AppState__Data.doc;
        const snapshot = {};
        Object.keys(doc).forEach((key) => { if (key !== 'AuraDrawingSet__Meta') snapshot[key] = doc[key]; });
        const engine = doc.AuraDrawingSet__Engine;
        if (!engine || !engine.Settings) snapshot.AuraDrawingSet__Engine = Object.assign({}, engine || {}, { Settings: Na__EngineHost__Settings() });
        return snapshot;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Summary of a Step: each record as text, to say what moved
    // ------------------------------------------------------------
    function Na__History__Summary(snapshot) {
        const text = (value) => JSON.stringify(value === undefined ? null : value);
        const sheets = new Map();
        (snapshot.AuraDrawingSet__Sheets || []).forEach((s) => {
            sheets.set(s.Sheet__Id, {
                name   : s.Sheet__Name,
                paper  : `${s.Sheet__PaperSize} ${s.Sheet__Orientation}`,
                fields : text(s.Sheet__Fields),
                views  : new Map((s.Sheet__Viewports || []).map((v) => [v.Viewport__Id, text(v)])),
                notes  : new Map((s.Sheet__Annotations || []).map((a) => [a.Annotation__Id, text(Object.assign({}, a, { Annotation__Written: null }))]))   // <-- The pen catching up is not an edit
            });
        });
        const rest = {};
        Object.keys(snapshot).forEach((key) => {
            if (!['AuraDrawingSet__Sheets', 'AuraDrawingSet__SavedViews', 'AuraDrawingSet__Engine', 'AuraDrawingSet__WorkingPoints'].includes(key)) rest[key] = snapshot[key];
        });
        return {
            sheets : sheets,
            saved  : new Map((snapshot.AuraDrawingSet__SavedViews || []).map((v) => [v.View__Id, text(v)])),
            engine : text(snapshot.AuraDrawingSet__Engine),
            points : text(snapshot.AuraDrawingSet__WorkingPoints || []),
            rest   : text(rest)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Records Added, Removed or Changed - their words into found
    // ------------------------------------------------------------
    function Na__History__Records(was, now, found, words) {
        const added = [...now.keys()].filter((id) => !was.has(id));
        const removed = [...was.keys()].filter((id) => !now.has(id));
        const changed = [...now.keys()].filter((id) => was.has(id) && was.get(id) !== now.get(id));
        if (added.length) found.push(words.added);
        if (removed.length) found.push(words.removed);
        if (changed.length === 1 && words.detail) found.push(words.detail(JSON.parse(was.get(changed[0])), JSON.parse(now.get(changed[0]))));
        else if (changed.length) found.push(words.changed);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What a Step Is Called - by what moved between two summaries
    // ------------------------------------------------------------
    function Na__History__Name(before, after) {
        const W = Na__History__WORDS;
        if (!before || !after) return W.Several;
        const found = [];
        if ([...after.sheets.keys()].some((id) => !before.sheets.has(id))) found.push(W.SheetAdded);
        if ([...before.sheets.keys()].some((id) => !after.sheets.has(id))) found.push(W.SheetRemoved);
        after.sheets.forEach((now, id) => {
            const was = before.sheets.get(id);
            if (!was) return;
            if (was.name !== now.name) found.push(W.SheetRenamed);
            if (was.paper !== now.paper) found.push(W.Paper);
            if (was.fields !== now.fields) found.push(W.TitleBlock);
            Na__History__Records(was.views, now.views, found, Na__History__VIEW_WORDS);
            Na__History__Records(was.notes, now.notes, found, Na__History__NOTE_WORDS);
        });
        Na__History__Records(before.saved, after.saved, found, Na__History__SAVED_WORDS);
        if (before.engine !== after.engine) found.push(W.Engine);
        if (before.points !== after.points) found.push(W.Points);
        if (before.rest !== after.rest) found.push(W.Other);
        const unique = [...new Set(found)];
        return unique.length === 1 ? unique[0] : W.Several;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Handwriting Kept for a Restore
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Remember Every Note's Handwriting That Matches Its Words
    // ------------------------------------------------------------
    function Na__History__KeepInks() {
        const S = Na__History__State;
        const doc = Na__AppState__Data.doc;
        (doc && doc.AuraDrawingSet__Sheets || []).forEach((sheet) => (sheet.Sheet__Annotations || []).forEach((a) => {
            if (!a.Annotation__Written || Na__Handwriting__NeedsWriting(a)) return;
            const key = Na__Handwriting__KeyFor(a);
            S.inks.delete(key);
            S.inks.set(key, a.Annotation__Written);                             // <-- The newest last: the oldest go first
        }));
        while (S.inks.size > Na__History__INK_CACHE) S.inks.delete(S.inks.keys().next().value);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Give Each Restored Note Its Handwriting Back, If It Was Seen
    // ------------------------------------------------------------
    function Na__History__ReInk(doc) {
        const S = Na__History__State;
        (doc.AuraDrawingSet__Sheets || []).forEach((sheet) => (sheet.Sheet__Annotations || []).forEach((a) => {
            if (!Na__Handwriting__NeedsWriting(a)) return;
            const ink = S.inks.get(Na__Handwriting__KeyFor(a));
            if (ink) a.Annotation__Written = ink;                               // <-- Never edited in place, only replaced: safe to share
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Recording
// -----------------------------------------------------------------------------

    // FUNCTION | Take the Drawing Set as a Step if an Announced Edit Moved It - true when it did
    // ------------------------------------------------------------
    // A difference nothing announced (a pen catching up, the opening, the
    // settling after a restore) is written into the step that stands.
    // ------------------------------------------------------------
    function Na__History__Commit() {
        const S = Na__History__State;
        clearTimeout(S.timer);
        S.timer = 0;
        if (!S.current || S.restoring || !Na__AppState__Data.doc) return false;
        const announced = S.pending;
        S.pending = null;
        const snapshot = Na__History__Snapshot();
        const id = Na__SnapStore__Keep(snapshot);
        Na__History__KeepInks();
        if (id === S.current.id) { Na__SnapStore__Drop(id); return false; }   // <-- Announced, but nothing moved
        const summary = Na__History__Summary(snapshot);
        if (!announced || !S.touched) {
            Na__SnapStore__Drop(S.current.id);
            S.current.id = id;
            S.last = summary;
            return false;
        }
        S.undo.push(S.current);
        while (S.undo.length > Na__AppConfig__Get('History__MaxUndo', 100)) Na__SnapStore__Drop(S.undo.shift().id);   // <-- The 101st step: the oldest goes
        S.redo.forEach((step) => Na__SnapStore__Drop(step.id));
        S.redo.length = 0;                                                      // <-- A new edit after an undo: the steps forward are gone, as everywhere
        S.current = { id: id, reason: announced.reason, tab: announced.tab, label: Na__History__Name(S.last, summary) };
        S.last = summary;
        Na__History__Render(null);
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Look Again Once the Edit Has Settled
    // ------------------------------------------------------------
    function Na__History__Soon(ms) {
        const S = Na__History__State;
        clearTimeout(S.timer);
        S.timer = setTimeout(() => {
            S.timer = 0;
            if (!S.held) Na__History__Commit();                                 // <-- Mid-drag: the release asks again
        }, ms);
    }

    function Na__History__Look() {
        Na__History__Soon(Na__History__Typing() ? Na__AppConfig__Get('History__TypingSettleMs', 1200) : Na__AppConfig__Get('History__SettleMs', 400));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Has a Text Box the Keyboard? (then its own undo works on its words)
    // ------------------------------------------------------------
    function Na__History__Typing() {
        const focus = document.activeElement;
        if (!focus) return false;
        if (focus.isContentEditable || focus.tagName === 'TEXTAREA') return true;
        return focus.tagName === 'INPUT' && Na__History__TEXT_INPUTS.includes(focus.type);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Edit Was Announced
    // ------------------------------------------------------------
    function Na__History__OnChanged(detail) {
        const S = Na__History__State;
        if (!S.started || S.restoring) return;
        const reason = (detail && detail.reason) || 'edit';
        if (reason === 'ink') {                                                 // <-- A note written: part of the step that made it
            if (!S.pending && !S.held) Na__History__Commit();
            return;
        }
        if (!S.pending) S.pending = { reason: reason, tab: (detail && detail.sheetId) || Na__AppState__Data.tab };
        Na__History__Look();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Undo and Redo
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Key That Names a Record (Sheet__Id, Viewport__Id, Annotation__Id, View__Id)
    // ------------------------------------------------------------
    function Na__History__IdKey(record) {
        if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
        return Object.keys(record).find((key) => /__Id$/.test(key)) || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write a Snapshot Back Into a Live Object, Its Records Kept by Id
    // ------------------------------------------------------------
    // A list of records is written back into the same array, each record that
    // is still there into the same object; anything else is the snapshot's own
    // fresh copy. keep: keys of the live object left as they are.
    // ------------------------------------------------------------
    function Na__History__WriteBack(live, snap, keep) {
        Object.keys(live).forEach((key) => { if (!(key in snap) && !(keep || []).includes(key)) delete live[key]; });
        Object.keys(snap).forEach((key) => {
            const was = live[key], now = snap[key];
            if (!Array.isArray(was) || !Array.isArray(now)) { live[key] = now; return; }
            const idKey = Na__History__IdKey(now[0]) || Na__History__IdKey(was[0]);
            const byId = new Map(idKey ? was.filter((r) => Na__History__IdKey(r) === idKey).map((r) => [r[idKey], r]) : []);
            const next = now.map((r) => {
                const kept = idKey && r ? byId.get(r[idKey]) : null;
                return kept ? Na__History__WriteBack(kept, r, null) : r;
            });
            was.splice(0, was.length, ...next);                                 // <-- The list kept too: whatever holds it sees the restore
        });
        return live;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Selection the Restore Took Away Goes
    // ------------------------------------------------------------
    function Na__History__PruneSelection() {
        const d = Na__AppState__Data;
        const sel = d.selection;
        if (!sel) return;
        const there = (d.doc.AuraDrawingSet__Sheets || []).some((s) => (sel.kind === 'viewport' ? (s.Sheet__Viewports || []) : (s.Sheet__Annotations || []))
            .some((r) => (sel.kind === 'viewport' ? r.Viewport__Id : r.Annotation__Id) === sel.id));
        if (!there) Na__AppState__Select(null);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Which Tab Shows a Restore
    // ------------------------------------------------------------
    // A sheet the restore brought back (a deletion undone); else the tab the
    // change was made on; else where the edit before it was made; else where
    // we are.
    // ------------------------------------------------------------
    function Na__History__TargetTab(step, before) {
        const d = Na__AppState__Data;
        const sheets = d.doc.AuraDrawingSet__Sheets || [];
        const open = (tab) => !!tab && (tab === 'environment' || sheets.some((s) => s.Sheet__Id === tab));
        const revived = sheets.find((s) => !before.has(s.Sheet__Id));
        if (revived) return revived.Sheet__Id;
        if (open(step.tab)) return step.tab;
        if (open(Na__History__State.current.tab)) return Na__History__State.current.tab;
        return open(d.tab) ? d.tab : 'environment';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put the Current Step Back: the records, the handwriting, the engine
    // ------------------------------------------------------------
    // step: the edit being undone or redone, whose reason and tab the restore
    // takes: saved the way that edit was, shown where it was made.
    // ------------------------------------------------------------
    function Na__History__Apply(direction, step) {
        const S = Na__History__State;
        const d = Na__AppState__Data;
        const before = new Set((d.doc.AuraDrawingSet__Sheets || []).map((s) => s.Sheet__Id));
        S.restoring = true;
        try {
            Na__History__WriteBack(d.doc, Na__SnapStore__Read(S.current.id), ['AuraDrawingSet__Meta']);
            Na__History__ReInk(d.doc);
            const settings = d.doc.AuraDrawingSet__Engine && d.doc.AuraDrawingSet__Engine.Settings;
            if (settings && JSON.stringify(settings) !== JSON.stringify(Na__EngineHost__Settings())) Na__EngineHost__ApplySettings(settings);   // <-- Told to the engine's listeners: the viewports redraw
            Na__History__PruneSelection();
            Na__AppState__Touch(step.reason || 'edit', step.tab && step.tab !== 'environment' ? step.tab : null);   // <-- Saved like the edit it reverses
            const now = Na__History__Snapshot();
            const actual = Na__SnapStore__Keep(now);                            // <-- What the drawing set is now is the step from now on
            if (actual !== S.current.id) { Na__SnapStore__Drop(S.current.id); S.current.id = actual; }
            else Na__SnapStore__Drop(actual);
            S.last = Na__History__Summary(now);
        } finally {
            S.restoring = false;
            S.touched = false;                                                  // <-- Until the next key or press, what settles is the restore's
            S.pending = null;
        }
        Na__AppState__Emit('restored', { direction: direction, reason: step.reason || 'edit', label: step.label || Na__History__WORDS.Several, tab: Na__History__TargetTab(step, before) });
        Na__History__Render(direction === 'undo' ? 'Undo' : 'Redo');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Can a Step Be Taken Now? (not mid-drag, mid-restore, or under a dialog)
    // ------------------------------------------------------------
    function Na__History__Ready() {
        const S = Na__History__State;
        return S.started && !!S.current && !S.restoring && !S.held && !document.querySelector('dialog[open]');
    }
    // ------------------------------------------------------------


    // FUNCTION | Step Back - the last change undone, true when there was one
    // ------------------------------------------------------------
    function Na__History__Undo() {
        const S = Na__History__State;
        if (!Na__History__Ready()) return false;
        Na__History__Commit();                                                  // <-- An edit not yet settled is the one undone
        if (!S.undo.length) return false;
        const undone = S.current;                                               // <-- The step being undone is the one that made the drawing set as it stands
        S.redo.push(undone);
        while (S.redo.length > Na__AppConfig__Get('History__MaxRedo', 100)) Na__SnapStore__Drop(S.redo.shift().id);
        S.current = S.undo.pop();
        Na__History__Apply('undo', undone);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Step Forward Again - the change just undone redone, true when there was one
    // ------------------------------------------------------------
    function Na__History__Redo() {
        const S = Na__History__State;
        if (!Na__History__Ready()) return false;
        Na__History__Commit();                                                  // <-- An edit since the undo clears the redos: then there is nothing to redo
        if (!S.redo.length) return false;
        S.undo.push(S.current);
        while (S.undo.length > Na__AppConfig__Get('History__MaxUndo', 100)) Na__SnapStore__Drop(S.undo.shift().id);
        S.current = S.redo.pop();
        Na__History__Apply('redo', S.current);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | What Undo or Redo Would Do Now - its words, or null; and whether it can
    // ------------------------------------------------------------
    // An edit still settling is taken first, so a menu opened straight after an
    // edit offers to undo it.
    // ------------------------------------------------------------
    function Na__History__Label(direction) {
        const S = Na__History__State;
        if (S.timer && !S.held) Na__History__Commit();
        if (direction === 'redo') return S.redo.length ? (S.redo[S.redo.length - 1].label || Na__History__WORDS.Several) : null;
        return S.undo.length ? (S.current.label || Na__History__WORDS.Several) : null;
    }

    function Na__History__CanUndo() { return Na__History__Label('undo') !== null; }
    function Na__History__CanRedo() { return Na__History__Label('redo') !== null; }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Arrows and the Keys
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Header's Arrows: lit when there is a step, titled with it; flash: the one just used
    // ------------------------------------------------------------
    function Na__History__Render(flash) {
        const S = Na__History__State;
        const W = Na__History__WORDS;
        if (!S.buttons) return;
        [['Undo', S.undo, S.current && S.current.label], ['Redo', S.redo, S.redo.length ? S.redo[S.redo.length - 1].label : null]].forEach(([action, steps, label]) => {
            const button = S.buttons[action];
            const words = steps.length ? W[action].replace('{step}', label || W.Several) : W[action === 'Undo' ? 'NothingUndo' : 'NothingRedo'];
            button.disabled = !steps.length;
            button.title = words.replace('{keys}', Na__History__KEY_WORDS[action]);
            button.setAttribute('aria-label', button.title);
            if (flash !== action) return;
            button.classList.remove('is-flash');
            void button.offsetWidth;                                            // <-- Restarts the flash when the same arrow is used twice in a row
            button.classList.add('is-flash');
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What a Key Press Means - Edit__Undo, Edit__Redo or null (the modifiers exactly as listed)
    // ------------------------------------------------------------
    function Na__History__MatchKey(event) {
        for (const binding of Na__History__KEY_LIST) {
            if (!binding || binding.Enabled === false || !Array.isArray(binding.Keys) || !binding.Keys.includes(event.key)) continue;
            const named = Array.isArray(binding.Modifiers) ? binding.Modifiers : [];
            if (named.includes('Ctrl') === event.ctrlKey && named.includes('Shift') === event.shiftKey
                && named.includes('Alt') === event.altKey && named.includes('Meta') === event.metaKey) return binding.Action || null;
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Key: Ctrl + Z and Ctrl + Y on every tab, the box's own undo while typing
    // ------------------------------------------------------------
    function Na__History__OnKey(event) {
        const S = Na__History__State;
        const action = Na__History__MatchKey(event);
        const typing = Na__History__BINDINGS.DrawingSet__KeyboardBindings__IgnoreWhenTyping !== false && Na__History__Typing();
        if (!action || event.defaultPrevented || event.isComposing || typing) {
            if (!Na__History__MODIFIER_KEYS.includes(event.key)) S.touched = true;   // <-- The user at work (Ctrl on its way to a Z is not)
            return;
        }
        event.preventDefault();
        const now = performance.now();
        if (event.repeat && now - S.keyAt < (Na__History__BINDINGS.DrawingSet__KeyboardBindings__RepeatMs || 90)) return;
        S.keyAt = now;
        if (action === 'Edit__Undo') Na__History__Undo();
        else Na__History__Redo();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Pointer Let Go: a drag has ended, so a settling edit may be taken
    // ------------------------------------------------------------
    function Na__History__Release() {
        const S = Na__History__State;
        S.held = false;
        if (S.pending) Na__History__Look();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Start
// -----------------------------------------------------------------------------

    // FUNCTION | Start Once the Drawing Set Is Loaded: the starting point, the arrows in slot, the keys
    // ------------------------------------------------------------
    // The pointer listens in the capture phase, so a tool that stops its own
    // events is still seen; the keys in the bubble phase, after the sheets'.
    // ------------------------------------------------------------
    function Na__History__Start(slot) {
        const S = Na__History__State;
        if (S.started || !Na__AppState__Data.doc) return;
        S.started = true;
        Na__SnapStore__SetChunkSize(Na__AppConfig__Get('History__ChunkMinChars', 512));
        const snapshot = Na__History__Snapshot();
        S.current = { id: Na__SnapStore__Keep(snapshot), reason: null, tab: Na__AppState__Data.tab, label: null };
        S.last = Na__History__Summary(snapshot);
        Na__History__KeepInks();

        if (slot) {
            Na__Dom__Clear(slot);
            S.buttons = {
                Undo : Na__Dom__IconButton('undo', 'aura-icon-button aura-icon-button--quiet aura-history__button', null, ''),
                Redo : Na__Dom__IconButton('redo', 'aura-icon-button aura-icon-button--quiet aura-history__button', null, '')
            };
            S.buttons.Undo.addEventListener('click', () => Na__History__Undo());
            S.buttons.Redo.addEventListener('click', () => Na__History__Redo());
            slot.appendChild(S.buttons.Undo);
            slot.appendChild(S.buttons.Redo);
            slot.hidden = false;
        }

        Na__AppState__On('changed', Na__History__OnChanged);
        window.addEventListener('keydown', Na__History__OnKey);
        window.addEventListener('pointerdown', (event) => {
            S.held = true;
            if (!(event.target && event.target.closest && event.target.closest('.aura-history__button'))) S.touched = true;   // <-- Pressing an arrow is not an edit
        }, true);
        window.addEventListener('pointerup', () => Na__History__Release(), true);
        window.addEventListener('pointercancel', () => Na__History__Release(), true);
        window.addEventListener('pointermove', (event) => { if (S.held && event.buttons === 0) Na__History__Release(); }, true);   // <-- Let go outside the window
        window.addEventListener('blur', () => { S.held = false; });
        window.addEventListener('focusout', (event) => {
            const box = event.target;
            if (S.pending && box && (box.isContentEditable || box.tagName === 'TEXTAREA' || box.tagName === 'INPUT')) Na__History__Soon(0);   // <-- Leaving a box ends its edit
        }, true);
        Na__History__Render(null);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__History__Start,
        Na__History__Undo,
        Na__History__Redo,
        Na__History__CanUndo,
        Na__History__CanRedo,
        Na__History__Label
    };

// endregion -------------------------------------------------------------------
