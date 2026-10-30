// =============================================================================
// VALEVISION AURA - APP CORE - APP STATE
// =============================================================================
//
// FILE       : Na__AppCore__AppState__.js
// NAMESPACE  : Na__AppState
// MODULE     : App Core - State
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : What the page knows (who, which project, the drawing set, the open
//              tab, the selection, the tool) and a small event bus between modules
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - ONE OWNER: modules read Na__AppState__Data and change it through
//   Na__AppState__Set, Na__AppState__Select and Na__AppState__Touch, so every
//   change is announced and the drawing set's save follows from one place.
// - EVENTS: 'tab' (the open tab changed), 'select' (the selection), 'tool',
//   'changed' (the drawing set was edited: { reason, sheetId }), 'saved',
//   'engine' (the engine's settings moved).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | State
// -----------------------------------------------------------------------------

    const Na__AppState__Data = {
        user       : null,                       // <-- The shared sign-in's user (code, name, level, levelRank)
        project    : null,                       // <-- { id, code, title, address, year }
        doc        : null,                       // <-- The drawing set (Na__DrawingSet__Model__)
        rev        : 0,                          // <-- The server's _rev of the drawing set this page holds
        tab        : 'environment',              // <-- 'environment' or a sheet id
        selection  : null,                       // <-- { kind: 'viewport' | 'annotation', id } or null
        tool       : 'select',                   // <-- 'select', 'note', 'leader'
        dirty      : false
    };

    const Na__AppState__Listeners = {};


    // FUNCTION | Listen for an Event, and Announce One
    // ------------------------------------------------------------
    function Na__AppState__On(name, fn) {
        (Na__AppState__Listeners[name] = Na__AppState__Listeners[name] || []).push(fn);
    }

    function Na__AppState__Emit(name, detail) {
        (Na__AppState__Listeners[name] || []).forEach((fn) => {
            try { fn(detail); } catch (error) { console.error(`[AURA] A "${name}" listener failed:`, error); }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Change a Few Values (each announced under its own name)
    // ------------------------------------------------------------
    function Na__AppState__Set(patch) {
        Object.entries(patch || {}).forEach(([key, value]) => {
            if (Na__AppState__Data[key] === value) return;
            Na__AppState__Data[key] = value;
            if (key === 'tab' || key === 'tool') Na__AppState__Emit(key, value);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Select a Viewport or an Annotation (null clears)
    // ------------------------------------------------------------
    function Na__AppState__Select(kind, id) {
        const next = kind && id ? { kind, id } : null;
        const now = Na__AppState__Data.selection;
        if ((now && next && now.kind === next.kind && now.id === next.id) || (!now && !next)) return;
        Na__AppState__Data.selection = next;
        Na__AppState__Emit('select', next);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Drawing Set Was Edited: mark it, announce it (the save follows)
    // ------------------------------------------------------------
    function Na__AppState__Touch(reason, sheetId) {
        Na__AppState__Data.dirty = true;
        Na__AppState__Emit('changed', { reason: reason || 'edit', sheetId: sheetId || null });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Open Sheet (null on the 3D Environment)
    // ------------------------------------------------------------
    function Na__AppState__ActiveSheet() {
        const d = Na__AppState__Data;
        if (!d.doc || d.tab === 'environment') return null;
        return (d.doc.AuraDrawingSet__Sheets || []).find((s) => s.Sheet__Id === d.tab) || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__AppState__Data,
        Na__AppState__On,
        Na__AppState__Emit,
        Na__AppState__Set,
        Na__AppState__Select,
        Na__AppState__Touch,
        Na__AppState__ActiveSheet
    };

// endregion -------------------------------------------------------------------
