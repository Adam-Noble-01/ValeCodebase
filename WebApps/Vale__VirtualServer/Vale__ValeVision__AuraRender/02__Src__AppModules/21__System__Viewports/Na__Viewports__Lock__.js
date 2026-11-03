// =============================================================================
// VALEVISION AURA - VIEWPORTS - LOCKING ONE IN PLACE
// =============================================================================
//
// FILE       : Na__Viewports__Lock__.js
// NAMESPACE  : Na__ViewportLock
// MODULE     : Viewports - Lock
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Hold a viewport where it was placed, until it is unlocked
// CREATED    : 03-Nov-2026
//
// DESCRIPTION:
// - Adam, 03-Nov-2026: "Add right click lock viewport on the sheets to stop them
//   being able to be moved once user places where they need. toggle lock /
//   unlock".
// - A LOCKED VIEWPORT (Viewport__Locked, kept with it, saved and undone with the
//   drawing set; absent when unlocked) cannot be moved, resized, nudged, panned
//   or deleted. It can still be selected, and everything else about it changes:
//   its scene, scale, pen, title, ground cut and art direction points.
// - It is toggled from the sheet's right-click menu and the Viewport panel.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 03-Nov-2026 - Version 1.0.0 (AURA 0.5.24)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppState__Data, Na__AppState__Emit, Na__AppState__Touch } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';
    import { Na__Surface__RedrawLayer, Na__Surface__RedrawOverlay } from '../20__System__DrawingSheets/Na__DrawingSheets__Surface__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__ViewportLock__REFUSE_GAP_MS = 2500;                                // <-- A held arrow key says so once, not on every repeat

    const Na__ViewportLock__State = { refused: 0 };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Lock
// -----------------------------------------------------------------------------

    // FUNCTION | Is This Viewport Locked?
    // ------------------------------------------------------------
    function Na__ViewportLock__Is(viewport) {
        return !!viewport && viewport.Viewport__Locked === true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Lock It or Unlock It: one saved step, one undo
    // ------------------------------------------------------------
    // 'select' is said again so the Viewport panel is drawn for the new state.
    // ------------------------------------------------------------
    function Na__ViewportLock__Toggle(viewport) {
        if (!viewport) return;
        if (Na__ViewportLock__Is(viewport)) delete viewport.Viewport__Locked;
        else viewport.Viewport__Locked = true;
        const doc = Na__AppState__Data.doc;
        const sheet = doc ? (doc.AuraDrawingSet__Sheets || []).find((s) => (s.Sheet__Viewports || []).includes(viewport)) : null;
        Na__AppState__Touch('viewport', sheet ? sheet.Sheet__Id : null);
        Na__Surface__RedrawLayer('viewports');
        Na__Surface__RedrawOverlay();
        Na__AppState__Emit('select', Na__AppState__Data.selection);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Menu's Row: Lock Viewport or Unlock Viewport
    // ------------------------------------------------------------
    function Na__ViewportLock__MenuItem(viewport) {
        const locked = Na__ViewportLock__Is(viewport);
        return {
            Label  : locked ? 'Unlock viewport' : 'Lock viewport',
            Title  : locked ? 'Let it be moved, resized and deleted again' : 'Hold it where it is: it cannot be moved, resized or deleted',
            Action : () => Na__ViewportLock__Toggle(viewport)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Say Why It Did Not Move
    // ------------------------------------------------------------
    function Na__ViewportLock__Refuse() {
        const now = performance.now();
        const S = Na__ViewportLock__State;
        if (now - S.refused < Na__ViewportLock__REFUSE_GAP_MS) return;
        S.refused = now;
        Na__Toast__Show('This viewport is locked. Right-click it to unlock it.');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ViewportLock__Is,
        Na__ViewportLock__Toggle,
        Na__ViewportLock__MenuItem,
        Na__ViewportLock__Refuse
    };

// endregion -------------------------------------------------------------------
