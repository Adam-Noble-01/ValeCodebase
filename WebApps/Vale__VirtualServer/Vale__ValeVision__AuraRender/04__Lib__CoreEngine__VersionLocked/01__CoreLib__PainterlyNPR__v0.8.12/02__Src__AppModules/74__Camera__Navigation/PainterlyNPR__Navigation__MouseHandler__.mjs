/* =============================================================================
   PAINTERLYNPR - CAMERA | NAVIGATION - MOUSE HANDLER
   =============================================================================

   FILE       : PainterlyNPR__Navigation__MouseHandler__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Camera - Navigation - MouseHandler
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Mouse and pen on the drawing: drags that orbit, pan or dolly, the
                wheel's zoom, and the right button's menu kept out of the way
   CREATED    : 30-Oct-2026 (v0.5.4)

   DESCRIPTION:
   - What a press means is the mappings' (MatchPointer): ValeVision's orbit mode,
     left orbits, right pans, Ctrl, Shift or Cmd swaps them, middle dollies.
   - The wheel zooms, accelerating on a long spin as ValeVision's does; a
     trackpad pinch (a small Ctrl + wheel) is multiplied to a finger's pace.
   - A press that never travels past the slop is a click: the session is told
     (OnTap), and the camera has not moved.
   - Nothing here moves the camera itself: it reports to the session (the orbit
     mode), which applies the moves once a frame.
   - Touch is the touch handler's: a finger is never taken here.

   ============================================================================= */

import {
    PainterlyNPR__Navigation__MatchPointer,
    PainterlyNPR__Navigation__Modifiers,
    PainterlyNPR__Navigation__POINTER  as  POINTER,
    PainterlyNPR__Navigation__WHEEL    as  WHEEL,
} from './PainterlyNPR__Navigation__Mappings__.mjs';

// =============================================================================
// REGION | Navigation - Mouse Handler
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Presses That Belong to a Control, Not the Camera
    // ------------------------------------------------------------
    const OWN_INPUT  =  'input, select, textarea, button, [contenteditable="true"], [contenteditable=""]';
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Wheel Event's Delta in Pixels (lines and pages turned into pixels)
    // ------------------------------------------------------------
    function PainterlyNPR__NavigationMouse__WheelPx(event) {
        const unit  =  event.deltaMode === 1 ? WHEEL.LineDeltaPx : event.deltaMode === 2 ? WHEEL.PageDeltaPx : 1;
        const px    =  (Number.isFinite(event.deltaY) ? event.deltaY : 0) * unit;
        return (event.ctrlKey || event.metaKey) ? px * WHEEL.PinchMultiplier : px;      // <-- A trackpad pinch arrives as a small Ctrl + wheel
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attach
// -----------------------------------------------------------------------------

    // FUNCTION | Listen for the Mouse on the Session's Element - returns a detach function
    // ------------------------------------------------------------
    // session: the orbit mode's session (Element, Allowed, Start, Grip, Rotate,
    // Pan, Dolly, Zoom, Tap).
    function PainterlyNPR__NavigationMouse__Attach(session) {
        const el      =  session.Element;
        let drag      =  null;                                                // <-- { PointerId, Action, Button, X, Y, StartX, StartY, Moved }
        const spin    =  { Ticks: 0, Last: 0 };                               // <-- The wheel's acceleration

        const down  =  (e) => {
            if (e.pointerType === 'touch' || drag) return;                    // <-- Fingers are the touch handler's
            if (e.defaultPrevented || (e.target.closest && e.target.closest(OWN_INPUT)) || !session.Allowed(e)) return;
            const action  =  PainterlyNPR__Navigation__MatchPointer(e.button, PainterlyNPR__Navigation__Modifiers(e));
            if (!action) return;
            if (e.button === 1) e.preventDefault();                           // <-- No middle-button autoscroll
            drag  =  { PointerId: e.pointerId, Action: action, Button: e.button, X: e.clientX, Y: e.clientY, StartX: e.clientX, StartY: e.clientY, Moved: false };
            session.Start();
            session.Grip(1);
            try { el.setPointerCapture(e.pointerId); } catch (error) { /* no real pointer (a synthetic event) */ }
        };

        const move  =  (e) => {
            if (!drag || e.pointerId !== drag.PointerId) return;
            if (!drag.Moved) {
                if (Math.hypot(e.clientX - drag.StartX, e.clientY - drag.StartY) < POINTER.DragSlopPx) return;
                drag.Moved  =  true;
            }
            const dx = e.clientX - drag.X, dy = e.clientY - drag.Y;
            drag.X  =  e.clientX;
            drag.Y  =  e.clientY;
            if (!dx && !dy) return;
            if (drag.Action === 'Orbit')      session.Rotate(dx, dy, e.pointerType);
            else if (drag.Action === 'Pan')   session.Pan(dx, dy, e.pointerType);
            else if (drag.Action === 'Dolly') session.Dolly(dy);
        };

        const up  =  (e) => {
            if (!drag || e.pointerId !== drag.PointerId) return;
            const ended  =  drag;
            drag  =  null;
            try { el.releasePointerCapture(e.pointerId); } catch (error) { /* already released */ }
            if (!ended.Moved && ended.Button === 0 && e.type === 'pointerup') session.Tap(e);   // <-- A click: it may let a selected point go
            session.Grip(-1);
        };

        const wheel  =  (e) => {
            if (e.defaultPrevented || !session.Allowed(e)) return;
            e.preventDefault();                                               // <-- Always, or the page scrolls under the drawing
            const now  =  performance.now();
            if (now - spin.Last > WHEEL.TickResetMs) spin.Ticks = 0;          // <-- A new spin
            spin.Last   =  now;
            spin.Ticks +=  1;
            const extra  =  Math.max(0, spin.Ticks - WHEEL.AccelerateAfterTicks);
            session.Start();
            session.Zoom(PainterlyNPR__NavigationMouse__WheelPx(e) * Math.pow(WHEEL.AcceleratePerTick, extra));
        };

        const menu  =  (e) => {
            if (e.target.closest && e.target.closest(OWN_INPUT)) return;
            e.preventDefault();                                               // <-- The right button pans: no menu at its end
        };

        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('wheel', wheel, { passive: false });
        el.addEventListener('contextmenu', menu);

        return () => {
            el.removeEventListener('pointerdown', down);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', up);
            el.removeEventListener('pointercancel', up);
            el.removeEventListener('wheel', wheel);
            el.removeEventListener('contextmenu', menu);
            if (drag) { drag = null; session.Grip(-1); }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__NavigationMouse__Attach,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
