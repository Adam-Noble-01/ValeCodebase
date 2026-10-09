// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - COMPOSITION GUIDE CONTROLS
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__CompositionGuide__Controls__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Composition Guide Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The side menu's Composition Guide section: show, lock, move
//              opposite edges together, each margin in mm, reset to the frame
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - Show Guide switches the grid of thirds and centre cross on over the drawing
//   frame. Lock Guide stops it taking the pointer, so the picture under it
//   drags freely. Move Opposite Edges Together does what Shift does while
//   dragging (and is the only way on a touch screen).
// - The four margin boxes are mm in from the drawing frame's edges (negative:
//   out past them). Typing moves the guide as you type; a value past a limit
//   is held at it. Typing a margin shows the guide if it was off.
// - The boxes follow a drag on the sheet as it happens.
// - Every change marks the layout as changed (the guide is saved with it).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.75.3)
// - Typing in a margin box names itself (coalesce), so it is one undo step.
//
// 09-Oct-2026 - Version 1.0.0
// - Initial build with the side menu (ValeVision3D v2.75.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Guide's Logic, Page Events
    // ------------------------------------------------------------
    import { Na__PageLayout__Guide__SetMargin, Na__PageLayout__Guide__Reset } from './Na__PageLayoutSystem__CompositionGuide__.js';
    import { Na__PageLayout__Emit, Na__PageLayout__On } from './Na__PageLayoutSystem__UiNotify__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Ids
    // ------------------------------------------------------------
    const Na__PageLayout__GuideUi__IDS = Object.freeze({
        visible : 'naGuideVisible',
        locked  : 'naGuideLocked',
        pair    : 'naGuidePairEdges',
        reset   : 'naGuideReset',
        top     : 'naGuideMarginTop',
        right   : 'naGuideMarginRight',
        bottom  : 'naGuideMarginBottom',
        left    : 'naGuideMarginLeft'
    });
    const Na__PageLayout__GuideUi__SIDES = Object.freeze(['top', 'right', 'bottom', 'left']);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Composition Guide Controls Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Composition Guide Section
    // ------------------------------------------------------------
    function Na__PageLayout__InitCompositionGuideControls(state, requestRedraw) {
        if (!state || !state.guide) return;

        const el      = (key) => document.getElementById(Na__PageLayout__GuideUi__IDS[key]);
        const visible = el('visible');
        const locked  = el('locked');
        const pair    = el('pair');
        const reset   = el('reset');
        const inputs  = {};
        Na__PageLayout__GuideUi__SIDES.forEach((side) => { inputs[side] = el(side); });


        // SUB FUNCTION | The Section From the Guide's State
        // ------------------------------------------------------------
        const syncFromState = (skipSide) => {
            const g = state.guide;
            if (visible) visible.checked = g.visible;
            if (locked)  locked.checked  = g.locked;
            if (pair)    pair.checked    = g.pairEdges;
            Na__PageLayout__GuideUi__SIDES.forEach((side) => {
                const input = inputs[side];
                if (!input || side === skipSide) return;                    // <-- Never rewrite the box being typed in
                input.value = (Math.round(g.margins[side] * 10) / 10).toFixed(1);
            });
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | A Change the Layout Should Remember
        // ------------------------------------------------------------
        // coalesce: typing in one margin box is one undo step, however many keys
        // ------------------------------------------------------------
        const changed = (coalesce) => {
            requestRedraw();
            Na__PageLayout__Emit('changed', { what : 'guide', coalesce : coalesce || '' });
        };
        // ------------------------------------------------------------


        // Wire the toggles
        // ------------------------------------------------------------
        if (visible) visible.addEventListener('change', () => { state.guide.visible   = visible.checked; changed(); });
        if (locked)  locked.addEventListener('change',  () => { state.guide.locked    = locked.checked;  changed(); });
        if (pair)    pair.addEventListener('change',    () => { state.guide.pairEdges = pair.checked;    changed(); });

        // Wire the margin boxes (live while typing; tidied on leaving the box)
        // ------------------------------------------------------------
        Na__PageLayout__GuideUi__SIDES.forEach((side) => {
            const input = inputs[side];
            if (!input) return;
            input.addEventListener('input', () => {
                const value = parseFloat(input.value);
                if (!Number.isFinite(value)) return;                        // <-- "-" or empty while typing
                Na__PageLayout__Guide__SetMargin(state, side, value, state.guide.pairEdges === true);
                if (!state.guide.visible) state.guide.visible = true;       // <-- Typing a margin shows the guide
                syncFromState(side);
                changed('guide-margin-' + side);
            });
            input.addEventListener('change', () => syncFromState(null));    // <-- Shows the value as held
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') { event.preventDefault(); input.blur(); }
            });
        });

        // Wire Reset to Frame
        // ------------------------------------------------------------
        if (reset) {
            reset.addEventListener('click', () => {
                Na__PageLayout__Guide__Reset(state);
                syncFromState(null);
                changed();
            });
        }

        // Follow drags on the sheet and opened layouts
        // ------------------------------------------------------------
        Na__PageLayout__On('guide', () => syncFromState(null));
        syncFromState(null);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Composition Guide Controls API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__InitCompositionGuideControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
