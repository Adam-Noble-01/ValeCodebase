/* =============================================================================
   PAINTERLYNPR - HUD | INTERFACE - DOM
   =============================================================================

   FILE       : PainterlyNPR__Interface__Dom__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - Interface - Dom
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The interface's elements and interaction state, the two selector
                helpers, state by path, and the status line
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - $ and $$ keep their short names inside the modules that use them.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Interface
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__RenderGraph__Graph as Graph } from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';

// =============================================================================
// REGION | Interface - Dom
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Interface
// -----------------------------------------------------------------------------

    // MODULE STATE | Interface Elements and Interaction
    // ------------------------------------------------------------
    const Ui  =  { Root: null, Canvas: null, Points: null, Status: null, Hover: null, Placing: null, ActiveTab: 'Scene', KnobSide: new Map(), SizeSide: new Map(), SelectedPointId: null, NodeCollapsed: false, NodeKey: '' };   // <-- The sheet's drags and fingers are 74__Camera__Navigation's (v0.5.4)
    const ZOOM_STEP  =  180;                                                  // <-- One click of the zoom bar or + / -: about a quarter nearer or further
    const $   =  (selector, root) => (root || document).querySelector(selector);
    const $$  =  (selector, root) => Array.from((root || document).querySelectorAll(selector));
    // ------------------------------------------------------------


    // FUNCTION | Read and Write State by Path
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__Get(path) { return path.reduce((o, k) => o[k], State); }
    function PainterlyNPR__Interface__Set(path, value) { const last = path[path.length - 1]; path.slice(0, -1).reduce((o, k) => o[k], State)[last] = value; }
    // ------------------------------------------------------------


    // FUNCTION | Status Line and Failure
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__Status(text) { if (Ui.Status) Ui.Status.textContent = text; }

    function PainterlyNPR__Interface__Fail(error) {
        console.error(error);
        PainterlyNPR__Interface__Status(`Error - ${error.message}`);
        Graph.Refining  =  false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__Fail,
        PainterlyNPR__Interface__Get,
        PainterlyNPR__Interface__Set,
        PainterlyNPR__Interface__Status,
        $          as  PainterlyNPR__Interface__Query,
        $$         as  PainterlyNPR__Interface__QueryAll,
        Ui       as  PainterlyNPR__Interface__Ui,
        ZOOM_STEP  as  PainterlyNPR__Interface__ZOOM_STEP,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
