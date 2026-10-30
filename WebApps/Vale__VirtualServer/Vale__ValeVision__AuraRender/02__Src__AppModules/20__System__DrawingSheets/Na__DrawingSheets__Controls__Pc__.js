// =============================================================================
// VALEVISION AURA - DRAWING SHEETS - CONTROLS - PC
// =============================================================================
//
// FILE       : Na__DrawingSheets__Controls__Pc__.js
// NAMESPACE  : Na__SheetPc
// MODULE     : Drawing Sheets - PC Controls (mouse, wheel and keyboard)
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Every mouse, wheel and keyboard gesture that moves a sheet,
//              resolved through the key map
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - CAD style navigation on the desk, as the Layout Editor's: the wheel zooms
//   about the point under the cursor, a middle or right drag pans, Space and a
//   left drag pans, and the bare left button is left to the sheet's tools so it
//   can go on selecting and moving viewports and notes.
// - NOTHING HERE IS BOUND TO A FIXED BUTTON OR KEY: every gesture is looked up
//   in Na__Hotkeys__DrawingSheets__.json (Na__DrawingSheets__KeyMap__).
// - Pans that claim the left button raise the surface's suppression for the
//   length of the drag, so a pan can never also move a viewport.
// - A PRESS ON THE DESK TAKES THE KEYBOARD (TakeKeyboard): the focus moves to
//   the desk before the tools see the press (which they take from the browser,
//   and with it the focus change), so a panel box used a moment ago never keeps
//   the sheet's keys.
// - Keys act only while a sheet tab is open: the 3D Environment's keys are the
//   engine's navigation.
//
// INTEGRATION:
// - Na__DrawingSheets__Workspace__ attaches it to the desk BEFORE the surface
//   wires its own presses, so a pan is claimed before a tool sees the press.
// - Movement goes through Na__DrawingSheets__Navigation__.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D (51__System__LayoutEditor/10__Core__SheetSurface/
//                   Na__LayoutEditor__Controls__Pc__.js 1.4.0)
// - Ported on     : 30-Oct-2026 for AURA 0.1.3 - whole
// - Parity        : diverged (AURA's surface)
// - Divergences   :
//   - Page Up and Page Down open the sheet tab before or after this one
//     directly (Na__Tabs__Open) instead of asking a mode controller by event.
//   - No 3D viewport zoom (AURA's viewports are pictures) and no KeyScope:
//     the keys check AURA's open tab, and a focused field keeps every key.
//   - The panning classes are AURA's (is-panning, is-pan-ready).
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

    import { Na__AppState__Data } from '../01__AppCore/Na__AppCore__AppState__.js';
    import {
        Na__SheetKeys__GetGuards,
        Na__SheetKeys__GetKeyboardSetup,
        Na__SheetKeys__GetNavigationSetup,
        Na__SheetKeys__MatchPointer,
        Na__SheetKeys__MatchWheel,
        Na__SheetKeys__MatchKey,
        Na__SheetKeys__IsPointerModifierBound
    } from './Na__DrawingSheets__KeyMap__.js';
    import { Na__SheetNav__ZoomAbout, Na__SheetNav__ZoomTo, Na__SheetNav__Fit, Na__SheetNav__PanBy } from './Na__DrawingSheets__Navigation__.js';
    import { Na__Surface__GetZoom, Na__Surface__SetSuppressed } from './Na__DrawingSheets__Surface__.js';
    import { Na__Tabs__Open } from './Na__DrawingSheets__Tabs__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    const Na__SheetPc__BUTTON_NAMES    = ['Left', 'Middle', 'Right'];            // <-- Indexed by MouseEvent.button
    const Na__SheetPc__LINE_HEIGHT_PX  = 20;                                     // <-- deltaMode 1 reports lines, not pixels
    const Na__SheetPc__OWN_FOCUS       = 'input, select, textarea, button, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]';

    const Na__SheetPc__State = {
        desk      : null,
        handlers  : null,
        pan       : null,                        // <-- { pointerId, lastX, lastY, claimsLeft }
        spaceHeld : false,
        wheel     : null                         // <-- { factor, x, y, frame }: wheel steps gathered for the next animation frame
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Input Description
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Which Modifiers Are Held
    // ------------------------------------------------------------
    function Na__SheetPc__Modifiers(event) {
        return { Ctrl: !!event.ctrlKey, Shift: !!event.shiftKey, Alt: !!event.altKey, Meta: !!event.metaKey, Space: Na__SheetPc__State.spaceHeld };
    }

    function Na__SheetPc__Matches(event, selector) {
        if (!selector) return false;
        const target = event.target;
        return !!(target && target.closest && target.closest(selector));
    }

    function Na__SheetPc__IsTyping(target) {
        if (!target) return false;
        return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable === true;
    }

    function Na__SheetPc__OnSheet() {
        return Na__AppState__Data.tab !== 'environment';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Navigation Actions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Open the Sheet Before or After This One (the first and last are ends)
    // ------------------------------------------------------------
    function Na__SheetPc__StepSheet(direction) {
        const sheets = (Na__AppState__Data.doc && Na__AppState__Data.doc.AuraDrawingSet__Sheets) || [];
        const index = sheets.findIndex((s) => s.Sheet__Id === Na__AppState__Data.tab);
        const next = sheets[index + (direction < 0 ? -1 : 1)];
        if (index >= 0 && next) Na__Tabs__Open(next.Sheet__Id);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Run One Navigation Action From the Keyboard (true when handled)
    // ------------------------------------------------------------
    function Na__SheetPc__RunKeyAction(action, coarse, repeat) {
        const keys = Na__SheetKeys__GetKeyboardSetup();
        const step = coarse ? keys.panCoarseStepPx : keys.panStepPx;
        switch (action) {
            case 'Nav__PreviousSheet'  : if (!repeat) Na__SheetPc__StepSheet(-1);                     return true;
            case 'Nav__NextSheet'      : if (!repeat) Na__SheetPc__StepSheet(1);                      return true;
            case 'Nav__ZoomFit'        : Na__SheetNav__Fit();                                         return true;
            case 'Nav__ZoomActualSize' : Na__SheetNav__ZoomTo(1);                                     return true;
            case 'Nav__ZoomIn'         : Na__SheetNav__ZoomTo(Na__Surface__GetZoom() * keys.zoomKeyStep); return true;
            case 'Nav__ZoomOut'        : Na__SheetNav__ZoomTo(Na__Surface__GetZoom() / keys.zoomKeyStep); return true;
            case 'Nav__PanLeft'        : Na__SheetNav__PanBy(-step, 0);                               return true;
            case 'Nav__PanRight'       : Na__SheetNav__PanBy(step, 0);                                return true;
            case 'Nav__PanUp'          : Na__SheetNav__PanBy(0, -step);                               return true;
            case 'Nav__PanDown'        : Na__SheetNav__PanBy(0, step);                                return true;
            default                    : return false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Wheel
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Wheel Zoom or Wheel Scroll
    // ------------------------------------------------------------
    // ONE ZOOM A FRAME, HOWEVER MANY WHEEL EVENTS: a precision touchpad or a
    // free-spinning wheel reports several steps between two frames; they are
    // multiplied together and applied once, about the latest pointer position.
    // ------------------------------------------------------------
    function Na__SheetPc__OnWheel(event) {
        if (Na__SheetPc__Matches(event, Na__SheetKeys__GetGuards().wheelIgnoreSelector)) return;
        const action = Na__SheetKeys__MatchWheel(Na__SheetPc__Modifiers(event));
        if (!action) return;
        const delta = event.deltaY * ((event.deltaMode === 1) ? Na__SheetPc__LINE_HEIGHT_PX : 1);
        const S = Na__SheetPc__State;

        if (action === 'Nav__ZoomAtCursor') {
            event.preventDefault();                                              // <-- Always now, or the page scrolls under the sheet
            const factor = Math.exp(-delta * Na__SheetKeys__GetNavigationSetup().zoomWheelStep);
            if (!S.wheel) S.wheel = { factor: 1, x: event.clientX, y: event.clientY, frame: window.requestAnimationFrame(Na__SheetPc__FlushWheelZoom) };
            S.wheel.factor *= factor;
            S.wheel.x = event.clientX;
            S.wheel.y = event.clientY;
            return;
        }
        if (action === 'Nav__ScrollVertical')   { event.preventDefault(); Na__SheetNav__PanBy(0, delta); return; }
        if (action === 'Nav__ScrollHorizontal') { event.preventDefault(); Na__SheetNav__PanBy(delta, 0); }
    }

    function Na__SheetPc__FlushWheelZoom() {
        const S = Na__SheetPc__State;
        const pending = S.wheel;
        S.wheel = null;
        if (!pending || !S.desk) return;
        Na__SheetNav__ZoomAbout(Na__Surface__GetZoom() * pending.factor, pending.x, pending.y, true);   // <-- A gesture step: the handles redraw once the wheel rests
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pointer Pan
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Pointer Down: Claim a Pan When a Binding Matches
    // ------------------------------------------------------------
    function Na__SheetPc__OnPointerDown(event) {
        if (event.pointerType === 'touch') return;                               // <-- The touchscreen module owns touch
        const guards = Na__SheetKeys__GetGuards();
        if (Na__SheetPc__Matches(event, guards.pointerIgnoreSelector)) return;   // <-- Real controls keep their own drags
        const action = Na__SheetKeys__MatchPointer({
            button     : Na__SheetPc__BUTTON_NAMES[event.button] || null,
            modifiers  : Na__SheetPc__Modifiers(event),
            emptyStage : !Na__SheetPc__Matches(event, guards.paperSelector)
        });
        if (action !== 'Nav__Pan') return;

        const S = Na__SheetPc__State;
        event.preventDefault();                                                  // <-- Stops the middle button's autoscroll, and tells the surface the press is taken
        const claimsLeft = (event.button === 0);
        S.pan = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY, claimsLeft };
        if (claimsLeft) Na__Surface__SetSuppressed(true);                        // <-- A pan on the left button must not also edit
        try { S.desk.setPointerCapture(event.pointerId); } catch (error) { /* capture refused */ }
        S.desk.classList.add('is-panning');
    }

    function Na__SheetPc__OnPointerMove(event) {
        const pan = Na__SheetPc__State.pan;
        if (!pan || event.pointerId !== pan.pointerId) return;
        Na__SheetNav__PanBy(pan.lastX - event.clientX, pan.lastY - event.clientY);
        pan.lastX = event.clientX;
        pan.lastY = event.clientY;
    }

    function Na__SheetPc__OnPointerUp(event) {
        const S = Na__SheetPc__State;
        if (!S.pan || (event && event.pointerId !== S.pan.pointerId)) return;
        if (event) { try { S.desk.releasePointerCapture(event.pointerId); } catch (error) { /* already released */ } }
        if (S.pan.claimsLeft) Na__Surface__SetSuppressed(false);
        S.pan = null;
        S.desk.classList.remove('is-panning');
    }

    // A right drag pans, which leaves no room for the browser's menu
    function Na__SheetPc__OnContextMenu(event) {
        if (Na__SheetPc__Matches(event, Na__SheetKeys__GetGuards().contextMenuKeepSelector)) return;
        event.preventDefault();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keyboard
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Key Down: Track the Space Bar, Then Run a Navigation Action
    // ------------------------------------------------------------
    function Na__SheetPc__OnKeyDown(event) {
        const S = Na__SheetPc__State;
        if (!Na__SheetPc__OnSheet() || event.defaultPrevented) return;
        const typing = Na__SheetPc__IsTyping(event.target);

        if (event.key === ' ' || event.code === 'Space') {
            if (!typing) {
                S.spaceHeld = true;
                S.desk.classList.add('is-pan-ready');
                if (Na__SheetKeys__IsPointerModifierBound('Space')) event.preventDefault();   // <-- Only steal space when a binding wants it
            }
            return;
        }
        if (typing && Na__SheetKeys__GetKeyboardSetup().ignoreWhenTyping) return;
        const match = Na__SheetKeys__MatchKey(event.key, Na__SheetPc__Modifiers(event));
        if (!match) return;
        if (Na__SheetPc__RunKeyAction(match.action, match.coarse, !!event.repeat)) event.preventDefault();
    }

    function Na__SheetPc__OnKeyUp(event) {
        if (event.key !== ' ' && event.code !== 'Space') return;
        Na__SheetPc__State.spaceHeld = false;
        if (Na__SheetPc__State.desk) Na__SheetPc__State.desk.classList.remove('is-pan-ready');
    }

    function Na__SheetPc__OnBlur() {
        Na__SheetPc__State.spaceHeld = false;
        if (Na__SheetPc__State.desk) Na__SheetPc__State.desk.classList.remove('is-pan-ready');
        Na__SheetPc__OnPointerUp(null);                                          // <-- A pan cannot survive the window losing focus
    }
    // ------------------------------------------------------------


    // FUNCTION | Give the Keyboard to the Sheet
    // ------------------------------------------------------------
    // The tools take every press they act on from the browser (preventDefault on
    // pointerdown), and that also stops the press moving the focus: a box used
    // in the panel kept the keyboard through any number of clicks on the paper,
    // and Delete, Escape, V, N and L went to it. Called in the capture phase of
    // every press on the desk, ahead of the tools. Left alone: a press on a real
    // control, and a focus already inside the desk. True when the focus moved.
    // ------------------------------------------------------------
    function Na__SheetPc__TakeKeyboard(event) {
        const desk = Na__SheetPc__State.desk;
        if (!desk) return false;
        const target = event ? event.target : null;
        if (target && target.closest && target.closest(Na__SheetPc__OWN_FOCUS)) return false;
        const focused = document.activeElement;
        if (focused === desk) return false;
        if (focused && focused !== document.body && desk.contains(focused)) return false;
        try { desk.focus({ preventScroll: true }); } catch (error) { return false; }
        return document.activeElement === desk;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Attach
// -----------------------------------------------------------------------------

    // FUNCTION | Listen on the Desk and the Keyboard (attach before the surface wires its presses)
    // ------------------------------------------------------------
    function Na__SheetPc__Attach(desk) {
        const S = Na__SheetPc__State;
        if (!desk || S.desk) return false;
        S.desk = desk;
        if (!desk.hasAttribute('tabindex')) desk.tabIndex = -1;                  // <-- Focusable by script, never a Tab stop
        S.handlers = {
            wheel         : (e) => Na__SheetPc__OnWheel(e),
            pointerdown   : (e) => Na__SheetPc__OnPointerDown(e),
            pointermove   : (e) => Na__SheetPc__OnPointerMove(e),
            pointerup     : (e) => Na__SheetPc__OnPointerUp(e),
            pointercancel : (e) => Na__SheetPc__OnPointerUp(e),
            contextmenu   : (e) => Na__SheetPc__OnContextMenu(e),
            takekeys      : (e) => { Na__SheetPc__TakeKeyboard(e); }
        };
        desk.addEventListener('pointerdown', S.handlers.takekeys, true);         // <-- Capture: the keyboard is the sheet's before any tool sees the press
        desk.addEventListener('wheel', S.handlers.wheel, { passive: false });
        ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'contextmenu'].forEach((name) => desk.addEventListener(name, S.handlers[name]));
        window.addEventListener('keydown', Na__SheetPc__OnKeyDown);
        window.addEventListener('keyup', Na__SheetPc__OnKeyUp);
        window.addEventListener('blur', Na__SheetPc__OnBlur);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Pan Is in Flight (the touch module defers to it)
    // ------------------------------------------------------------
    function Na__SheetPc__IsPanning() { return !!Na__SheetPc__State.pan; }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__SheetPc__Attach,
        Na__SheetPc__TakeKeyboard,
        Na__SheetPc__IsPanning
    };

// endregion -------------------------------------------------------------------
