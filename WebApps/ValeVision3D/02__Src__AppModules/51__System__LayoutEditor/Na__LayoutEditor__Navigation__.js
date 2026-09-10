// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - NAVIGATION
// =============================================================================
//
// FILE       : Na__LayoutEditor__Navigation__.js
// NAMESPACE  : Na__LeNav
// MODULE     : Layout Editor - Navigation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Zoom about the cursor, pan with the middle or right button, pinch on touch, fit to the stage
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - The wheel zooms the paper about the point under the cursor by moving
//   the stage's scroll position so that point does not drift. The middle or
//   right button drags the stage's scroll offset. Two touch points pinch.
//   The left button is left entirely to the sheet tools (LD rule).
// - Fit computes the zoom that shows the whole paper inside the stage with
//   a padding and centres it.
//
// INTEGRATION:
// - Attached by the mode controller to the stage the surface mounted in.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : Lantern Designer 30__System__DrawingEditorMode/VghLantern__DrawingEditor__SheetManager__.js (navigation region)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : adapted
// - Divergences   : scroll-based pan (the stage scrolls) instead of a translated stage; pinch added.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config and Surface
    // ------------------------------------------------------------
    import { Na__LeCfg__GetNavigationSetup } from './Na__LayoutEditor__ConfigState__.js';
    import {
        Na__LeSurface__SetZoom,
        Na__LeSurface__GetZoom,
        Na__LeSurface__GetPixelsPerMm,
        Na__LeSurface__GetLayout,
        Na__LeSurface__GetElements
    } from './Na__LayoutEditor__SheetSurface__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Attached Stage and Gesture State
    // ------------------------------------------------------------
    let Na__LeNav__Stage    = null;
    let Na__LeNav__Handlers = null;
    let Na__LeNav__Pan      = null;    // <-- { pointerId, lastX, lastY }
    const Na__LeNav__Touches = new Map();  // <-- pointerId -> { x, y } for the pinch
    let Na__LeNav__Pinch    = null;    // <-- { distance, zoom, midX, midY }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Zoom Maths
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Clamp a Zoom to the Configured Range
    // ------------------------------------------------------------
    function Na__LeNav__Clamp(zoom) {
        const setup = Na__LeCfg__GetNavigationSetup();
        return Math.min(setup.zoomMax, Math.max(setup.zoomMin, zoom));
    }
    // ------------------------------------------------------------


    // FUNCTION | Zoom So the Paper Point Under a Client Position Stays Put
    // ------------------------------------------------------------
    function Na__LeNav__ZoomAbout(newZoom, clientX, clientY) {
        const els = Na__LeSurface__GetElements();
        if (!els.stage || !els.paper) return;
        const before = Na__LeSurface__GetZoom();
        const after  = Na__LeNav__Clamp(newZoom);
        if (after === before) return;
        const stageRect = els.stage.getBoundingClientRect();
        const paperRect = els.paper.getBoundingClientRect();
        const ppm       = Na__LeSurface__GetPixelsPerMm();
        // The paper millimetre under the cursor, then where the paper's
        // top-left has to sit afterwards for that millimetre to stay there.
        const mmX = (clientX - paperRect.left) / (ppm * before);
        const mmY = (clientY - paperRect.top)  / (ppm * before);
        Na__LeSurface__SetZoom(after);
        const scalerLeft = els.scaler.offsetLeft;                                // <-- Includes the centring margin at the new size
        const scalerTop  = els.scaler.offsetTop;
        els.stage.scrollLeft = scalerLeft + (mmX * ppm * after) - (clientX - stageRect.left);
        els.stage.scrollTop  = scalerTop  + (mmY * ppm * after) - (clientY - stageRect.top);
    }
    // ------------------------------------------------------------


    // FUNCTION | Zoom About the Centre of the Stage
    // ------------------------------------------------------------
    function Na__LeNav__ZoomTo(newZoom) {
        const els = Na__LeSurface__GetElements();
        if (!els.stage) return;
        const rect = els.stage.getBoundingClientRect();
        Na__LeNav__ZoomAbout(newZoom, rect.left + (rect.width / 2), rect.top + (rect.height / 2));
    }
    // ------------------------------------------------------------


    // FUNCTION | Fit the Whole Paper Into the Stage
    // ------------------------------------------------------------
    function Na__LeNav__Fit() {
        const els    = Na__LeSurface__GetElements();
        const layout = Na__LeSurface__GetLayout();
        if (!els.stage || !layout) return;
        const setup   = Na__LeCfg__GetNavigationSetup();
        const ppm     = Na__LeSurface__GetPixelsPerMm();
        const availW  = els.stage.clientWidth  - (setup.fitPaddingPx * 2);
        const availH  = els.stage.clientHeight - (setup.fitPaddingPx * 2);
        if (availW <= 0 || availH <= 0) return;
        const zoom = Na__LeNav__Clamp(Math.min(availW / (layout.Page.WidthMm * ppm), availH / (layout.Page.HeightMm * ppm)));
        Na__LeSurface__SetZoom(zoom);
        els.stage.scrollLeft = Math.max(0, els.scaler.offsetLeft - ((els.stage.clientWidth  - els.scaler.offsetWidth)  / 2));
        els.stage.scrollTop  = Math.max(0, els.scaler.offsetTop  - ((els.stage.clientHeight - els.scaler.offsetHeight) / 2));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Gestures
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Wheel Zoom
    // ------------------------------------------------------------
    function Na__LeNav__OnWheel(event) {
        event.preventDefault();
        const setup  = Na__LeCfg__GetNavigationSetup();
        const factor = Math.exp(-event.deltaY * setup.zoomWheelStep * (event.deltaMode === 1 ? 20 : 1));
        Na__LeNav__ZoomAbout(Na__LeSurface__GetZoom() * factor, event.clientX, event.clientY);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pointer Down: Start a Pan or Register a Touch
    // ------------------------------------------------------------
    function Na__LeNav__OnPointerDown(event) {
        if (event.pointerType === 'touch') {
            Na__LeNav__Touches.set(event.pointerId, { x : event.clientX, y : event.clientY });
            if (Na__LeNav__Touches.size === 2) {
                const pts = Array.from(Na__LeNav__Touches.values());
                Na__LeNav__Pinch = {
                    distance : Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
                    zoom     : Na__LeSurface__GetZoom()
                };
            }
            return;
        }
        if (event.button !== 1 && event.button !== 2) return;                    // <-- Left button belongs to the tools
        event.preventDefault();
        Na__LeNav__Pan = { pointerId : event.pointerId, lastX : event.clientX, lastY : event.clientY };
        Na__LeNav__Stage.setPointerCapture(event.pointerId);
        Na__LeNav__Stage.classList.add('na-le-stage--panning');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pointer Move: Scroll the Stage or Pinch
    // ------------------------------------------------------------
    function Na__LeNav__OnPointerMove(event) {
        if (event.pointerType === 'touch' && Na__LeNav__Touches.has(event.pointerId)) {
            Na__LeNav__Touches.set(event.pointerId, { x : event.clientX, y : event.clientY });
            if (Na__LeNav__Pinch && Na__LeNav__Touches.size === 2) {
                const pts = Array.from(Na__LeNav__Touches.values());
                const distance = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                if (Na__LeNav__Pinch.distance > 0) {
                    Na__LeNav__ZoomAbout(Na__LeNav__Pinch.zoom * (distance / Na__LeNav__Pinch.distance), (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
                }
            }
            return;
        }
        if (!Na__LeNav__Pan || event.pointerId !== Na__LeNav__Pan.pointerId) return;
        Na__LeNav__Stage.scrollLeft -= event.clientX - Na__LeNav__Pan.lastX;
        Na__LeNav__Stage.scrollTop  -= event.clientY - Na__LeNav__Pan.lastY;
        Na__LeNav__Pan.lastX = event.clientX;
        Na__LeNav__Pan.lastY = event.clientY;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pointer Up or Cancel
    // ------------------------------------------------------------
    function Na__LeNav__OnPointerUp(event) {
        if (event.pointerType === 'touch') {
            Na__LeNav__Touches.delete(event.pointerId);
            if (Na__LeNav__Touches.size < 2) Na__LeNav__Pinch = null;
            return;
        }
        if (!Na__LeNav__Pan || event.pointerId !== Na__LeNav__Pan.pointerId) return;
        try { Na__LeNav__Stage.releasePointerCapture(event.pointerId); } catch (e) { /* already released */ }
        Na__LeNav__Pan = null;
        Na__LeNav__Stage.classList.remove('na-le-stage--panning');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attach and Detach
// -----------------------------------------------------------------------------

    // FUNCTION | Listen on the Stage
    // ------------------------------------------------------------
    function Na__LeNav__Attach() {
        const els = Na__LeSurface__GetElements();
        if (!els.stage) return false;
        Na__LeNav__Detach();
        Na__LeNav__Stage    = els.stage;
        Na__LeNav__Handlers = {
            wheel         : (e) => Na__LeNav__OnWheel(e),
            pointerdown   : (e) => Na__LeNav__OnPointerDown(e),
            pointermove   : (e) => Na__LeNav__OnPointerMove(e),
            pointerup     : (e) => Na__LeNav__OnPointerUp(e),
            pointercancel : (e) => Na__LeNav__OnPointerUp(e),
            contextmenu   : (e) => e.preventDefault()
        };
        Na__LeNav__Stage.addEventListener('wheel', Na__LeNav__Handlers.wheel, { passive : false });
        [ 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'contextmenu' ].forEach((name) => {
            Na__LeNav__Stage.addEventListener(name, Na__LeNav__Handlers[name]);
        });
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Stop Listening
    // ------------------------------------------------------------
    function Na__LeNav__Detach() {
        if (!Na__LeNav__Stage || !Na__LeNav__Handlers) return;
        Na__LeNav__Stage.removeEventListener('wheel', Na__LeNav__Handlers.wheel);
        [ 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'contextmenu' ].forEach((name) => {
            Na__LeNav__Stage.removeEventListener(name, Na__LeNav__Handlers[name]);
        });
        Na__LeNav__Stage = Na__LeNav__Handlers = Na__LeNav__Pan = Na__LeNav__Pinch = null;
        Na__LeNav__Touches.clear();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Navigation API
    // ------------------------------------------------------------
    export {
        Na__LeNav__Attach,
        Na__LeNav__Detach,
        Na__LeNav__ZoomAbout,
        Na__LeNav__ZoomTo,
        Na__LeNav__Fit
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
