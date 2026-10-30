// =============================================================================
// VALEVISION AURA - DRAWING SHEETS - CONTROLS - TOUCHSCREEN
// =============================================================================
//
// FILE       : Na__DrawingSheets__Controls__TouchScreen__.js
// NAMESPACE  : Na__SheetTouch
// MODULE     : Drawing Sheets - Touchscreen Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Pan, pinch zoom and double tap to fit on a touchscreen, resolved
//              through the key map
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - TWO FINGERS ALWAYS NAVIGATE. Because a navigation gesture needs a second
//   finger, one finger stays free to select and move viewports and notes, and
//   neither gesture has to guess what the other meant. Two fingers pinch to
//   zoom about their midpoint and drag to pan.
// - ONE FINGER ALSO PANS FROM THE GREY DESK. A press that lands off the paper
//   cannot be an edit, so it pans: the desk sets touch-action none, so the
//   browser will not scroll it.
// - A tap is protected by a slop radius, so a finger that lands and lifts still
//   selects rather than nudging the view. A double tap on the desk fits.
// - Whenever a touch gesture takes over, the surface's suppression is raised
//   for the length of it, so a second finger never leaves a half-finished drag.
// - Every switch, slop and timing is read from Na__Hotkeys__DrawingSheets__.json.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D (51__System__LayoutEditor/10__Core__SheetSurface/
//                   Na__LayoutEditor__Controls__TouchScreen__.js 1.1.0)
// - Ported on     : 30-Oct-2026 for AURA 0.1.3 - whole
// - Parity        : verbatim in behaviour
// - Divergences   :
//   - Attach takes the desk; AURA has no detach (its workspace is built once).
//   - The panning class is AURA's (is-panning); the suppression is the
//     surface's (Na__Surface__SetSuppressed).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.1.3)
// - Initial port.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__SheetKeys__GetGuards, Na__SheetKeys__GetTouchSetup } from './Na__DrawingSheets__KeyMap__.js';
    import { Na__SheetNav__ZoomAbout, Na__SheetNav__Fit, Na__SheetNav__PanBy } from './Na__DrawingSheets__Navigation__.js';
    import { Na__Surface__GetZoom, Na__Surface__SetSuppressed } from './Na__DrawingSheets__Surface__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__SheetTouch__State = {
        desk       : null,
        points     : new Map(),                  // <-- pointerId -> { x, y, startX, startY, onPaper }
        single     : null,                       // <-- { pointerId, panning } one finger candidate
        pinch      : null,                       // <-- { distance, zoom, midX, midY }
        suppressed : false,
        lastTap    : null                        // <-- { time, x, y } for the double tap
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Gesture Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Test an Event Target Against a Guard Selector
    // ------------------------------------------------------------
    function Na__SheetTouch__Matches(event, selector) {
        if (!selector) return false;
        const target = event.target;
        return !!(target && target.closest && target.closest(selector));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Raise or Drop the Surface's Suppression (only when it changes)
    // ------------------------------------------------------------
    function Na__SheetTouch__Suppress(flag) {
        const S = Na__SheetTouch__State;
        if (S.suppressed === flag) return;
        S.suppressed = flag;
        Na__Surface__SetSuppressed(flag);
        S.desk.classList.toggle('is-panning', flag);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Midpoint and Spread of the Two Live Touches
    // ------------------------------------------------------------
    function Na__SheetTouch__Span() {
        const points = Array.from(Na__SheetTouch__State.points.values());
        if (points.length < 2) return null;
        return {
            midX     : (points[0].x + points[1].x) / 2,
            midY     : (points[0].y + points[1].y) / 2,
            distance : Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether One Finger May Pan From Where It Landed
    // ------------------------------------------------------------
    function Na__SheetTouch__OneFingerMayPan(onPaper) {
        const setup = Na__SheetKeys__GetTouchSetup();
        if (setup.oneFingerPanOnPaper) return true;
        return setup.oneFingerPanOnStage && !onPaper;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fit on a Second Tap in the Same Place
    // ------------------------------------------------------------
    function Na__SheetTouch__TestDoubleTap(point) {
        const S = Na__SheetTouch__State;
        const setup = Na__SheetKeys__GetTouchSetup();
        if (!setup.doubleTapFit) return;
        const now = Date.now();
        const last = S.lastTap;
        if (last && (now - last.time) <= setup.doubleTapWindowMs && Math.hypot(point.x - last.x, point.y - last.y) <= setup.doubleTapSlopPx) {
            S.lastTap = null;
            Na__SheetNav__Fit();
            return;
        }
        S.lastTap = { time: now, x: point.x, y: point.y };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Gestures
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Pointer Down: Register a Touch and Open a Gesture
    // ------------------------------------------------------------
    function Na__SheetTouch__OnPointerDown(event) {
        if (event.pointerType !== 'touch') return;                               // <-- The PC module owns mouse and pen
        const S = Na__SheetTouch__State;
        const guards = Na__SheetKeys__GetGuards();
        if (Na__SheetTouch__Matches(event, guards.pointerIgnoreSelector)) return;

        const onPaper = Na__SheetTouch__Matches(event, guards.paperSelector);
        S.points.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, onPaper });

        // ONE FINGER | Held as a candidate; it only becomes a pan once it moves
        if (S.points.size === 1) {
            S.single = Na__SheetTouch__OneFingerMayPan(onPaper) ? { pointerId: event.pointerId, panning: false } : null;
            return;
        }

        // TWO FINGERS | Navigation takes over at once, whatever the first finger was doing
        if (S.points.size === 2) {
            const setup = Na__SheetKeys__GetTouchSetup();
            if (!setup.pinchZoom && !setup.twoFingerPan) return;
            S.single = null;
            S.lastTap = null;
            Na__SheetTouch__Suppress(true);
            const span = Na__SheetTouch__Span();
            if (span) S.pinch = { distance: span.distance, zoom: Na__Surface__GetZoom(), midX: span.midX, midY: span.midY };
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pointer Move: Pan With One Finger, Pinch and Pan With Two
    // ------------------------------------------------------------
    function Na__SheetTouch__OnPointerMove(event) {
        if (event.pointerType !== 'touch') return;
        const S = Na__SheetTouch__State;
        const point = S.points.get(event.pointerId);
        if (!point) return;
        const previousX = point.x;
        const previousY = point.y;
        point.x = event.clientX;
        point.y = event.clientY;
        const setup = Na__SheetKeys__GetTouchSetup();

        // TWO FINGERS | Zoom about the midpoint, then carry the midpoint along
        if (S.pinch && S.points.size >= 2) {
            const span = Na__SheetTouch__Span();
            if (!span) return;
            if (setup.pinchZoom && S.pinch.distance > setup.pinchStartSlopPx) {
                Na__SheetNav__ZoomAbout(S.pinch.zoom * (span.distance / S.pinch.distance), span.midX, span.midY, true);   // <-- A gesture step: the handles redraw once the pinch rests
            }
            if (setup.twoFingerPan) Na__SheetNav__PanBy(S.pinch.midX - span.midX, S.pinch.midY - span.midY);
            S.pinch.midX = span.midX;
            S.pinch.midY = span.midY;
            return;
        }

        // ONE FINGER | Becomes a pan once it has travelled past the tap slop
        if (!S.single || S.single.pointerId !== event.pointerId) return;
        if (!S.single.panning) {
            if (Math.hypot(point.x - point.startX, point.y - point.startY) < setup.panStartSlopPx) return;
            S.single.panning = true;
            S.lastTap = null;
            Na__SheetTouch__Suppress(true);
        }
        Na__SheetNav__PanBy(previousX - point.x, previousY - point.y);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pointer Up or Cancel: Close the Gesture Down
    // ------------------------------------------------------------
    function Na__SheetTouch__OnPointerUp(event) {
        if (event.pointerType !== 'touch') return;
        const S = Na__SheetTouch__State;
        const point = S.points.get(event.pointerId);
        if (!point) return;
        S.points.delete(event.pointerId);

        const wasPanning = !!(S.single && S.single.pointerId === event.pointerId && S.single.panning);
        const wasPinch = !!S.pinch;
        if (S.points.size < 2) S.pinch = null;
        if (S.single && S.single.pointerId === event.pointerId) S.single = null;

        // A LIFT THAT NEVER MOVED | Still a tap, so it can complete a double tap on the desk
        if (!wasPanning && !wasPinch && event.type === 'pointerup' && !point.onPaper) {
            if (Math.hypot(point.x - point.startX, point.y - point.startY) <= Na__SheetKeys__GetTouchSetup().doubleTapSlopPx) {
                Na__SheetTouch__TestDoubleTap({ x: point.x, y: point.y });
            }
        }
        if (S.points.size === 0) Na__SheetTouch__Suppress(false);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attach
// -----------------------------------------------------------------------------

    // FUNCTION | Listen on the Desk (attach before the surface wires its presses)
    // ------------------------------------------------------------
    function Na__SheetTouch__Attach(desk) {
        const S = Na__SheetTouch__State;
        if (!desk || S.desk) return false;
        S.desk = desk;
        desk.addEventListener('pointerdown', Na__SheetTouch__OnPointerDown);
        desk.addEventListener('pointermove', Na__SheetTouch__OnPointerMove);
        desk.addEventListener('pointerup', Na__SheetTouch__OnPointerUp);
        desk.addEventListener('pointercancel', Na__SheetTouch__OnPointerUp);
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__SheetTouch__Attach
    };

// endregion -------------------------------------------------------------------
