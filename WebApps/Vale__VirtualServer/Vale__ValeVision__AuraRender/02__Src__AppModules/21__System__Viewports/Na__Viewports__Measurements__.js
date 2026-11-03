// =============================================================================
// VALEVISION AURA - VIEWPORTS - THE MEASUREMENTS BOX
// =============================================================================
//
// FILE       : Na__Viewports__Measurements__.js
// NAMESPACE  : Na__ViewportMeasure
// MODULE     : Viewports - Measurements Box
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : SketchUp's VCB for a viewport's move: read out how far it has gone
//              as it goes, and land it exactly as far as is typed
// CREATED    : 03-Nov-2026
//
// DESCRIPTION:
// - A box at the bottom right of the desk. While a viewport's frame is dragged it
//   reads the distance, and it goes on reading the last move until something
//   else is done. With nothing on offer it rests, greyed.
// - TYPE WITHOUT CLICKING. While it is awake, a number typed anywhere over the
//   sheet goes into the box and Enter uses it (Na__ViewportMove__TypeLength): the
//   frame lands that far along its line. An arrow key holds the drag to an axis
//   while it is read and typed, which a held Shift cannot do: Shift has to be let
//   go of to reach the number keys. Clicking the box types into it directly, which
//   is also how a touch screen reaches it.
// - WHAT A NUMBER MEANS (Na__AppUtils__MeasureParse__). Millimetres unless a unit
//   follows (2.5m, 250cm), commas may group thousands (2,500), and a minus sign
//   runs the other way. As a value is typed the line above the box says how it is
//   being read, so 1,500 is seen to be one figure before Enter is pressed.
// - AT THE VIEWPORT'S SCALE, read and typed: 2500 on a 1:50 elevation moves it 50
//   mm of paper, and the chip beside the box says 1:50. A 3D view has no scale, so
//   the chip says Paper and a figure is paper millimetres.
// - Escape or Delete drops what was typed and Backspace takes a character back,
//   each only while something is typed, so every key keeps its usual job
//   otherwise. Letters stay tool keys until a value is begun. A click on the sheet
//   drops a half-typed value.
// - The line above the box also echoes Ortho being switched, as AutoCAD's command
//   line does: "<Ortho on>", "<Ortho off>".
//
// INTEGRATION:
// - Na__DrawingSheets__Workspace__ mounts it in the desk's column.
// - The keys come from Na__Hotkeys__DrawingSheets__.json (MeasurementsBox) and the
//   setup from Na__AppConfig__AuraRender__.json (Measurements__).
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : TrueVision 3D (51__System__LayoutEditor/30__System__SheetTools/
//                   Na__LayoutEditor__Measurements__.js 1.10.0)
// - Ported on     : 03-Nov-2026 for AURA 0.5.20 - the frame move's part
// - Parity        : diverged (subset)
// - Divergences   :
//   - Viewport moves only: AURA has no Draw, Rectangle, Dimension or vector tools,
//     so no pairs, spans or offsets. A pan and a resize are not read, as in
//     TrueVision.
//   - A 3D view reads in paper millimetres. TrueVision reads one at the sheet's
//     scale, but AURA's sheets can be all 3D views, with no scale to borrow.
//   - A bare minus begins a value only during a drag: once let go it is still
//     Zoom out, which AURA's sheets have on that key and TrueVision's do not.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 03-Nov-2026 - Version 1.0.0 (AURA 0.5.20)
// - Initial port.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__On } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__MeasureParse__Format, Na__MeasureParse__Length, Na__MeasureParse__REASON_UNIT } from '../03__AppUtils/Na__AppUtils__MeasureParse__.js';
    import { Na__SheetKeys__GetMeasureKeys } from '../20__System__DrawingSheets/Na__DrawingSheets__KeyMap__.js';
    import { Na__ViewportMove__OnRead, Na__ViewportMove__Reading, Na__ViewportMove__TypeLength } from './Na__Viewports__Move__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    const Na__ViewportMeasure__NON_TEXT = ['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color', 'file'];   // <-- A digit means nothing to these, so a length can still be typed straight after using one

    const Na__ViewportMeasure__State = {
        root      : null,
        hint      : null,
        label     : null,
        input     : null,
        chip      : null,
        desk      : null,                        // <-- Where the keys go back to
        shown     : null,                        // <-- What the box last wrote, so only what changed is written
        hintTimer : 0
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Millimetres as the Box Writes Them
    // ------------------------------------------------------------
    function Na__ViewportMeasure__Format(valueMm) {
        return Na__MeasureParse__Format(valueMm, { precision: Na__AppConfig__Get('Measurements__Precision', 1), suffix: Na__AppConfig__Get('Measurements__UnitsSuffix', ' mm') });
    }
    // ------------------------------------------------------------


    // FUNCTION | Bring the Box Up to Date With the Move
    // ------------------------------------------------------------
    // Run on every step of a drag and every edit, so only what changed is written.
    // ------------------------------------------------------------
    function Na__ViewportMeasure__Refresh() {
        const S = Na__ViewportMeasure__State;
        if (!S.root) return;
        const reading = Na__AppState__Data.tab === 'environment' ? null : Na__ViewportMove__Reading();
        const idle = !reading;
        const label = idle ? 'Measurements' : 'Length';
        const value = idle ? '' : Na__ViewportMeasure__Format(reading.runMm * reading.denominator);
        const scale = idle ? null : reading.denominator;
        const shown = S.shown || {};
        if (shown.label !== label) S.label.textContent = label;
        if (shown.value !== value) S.input.placeholder = value;                  // <-- The reading is the placeholder, so a typed value simply replaces it
        if (shown.scale !== scale && !idle) {
            const paper = scale === 1;
            S.chip.textContent = paper ? 'Paper' : `1:${scale}`;
            S.chip.title = paper ? 'Typed and shown in paper millimetres: a 3D view has no scale.' : `Typed and shown at 1:${scale}, the viewport's scale.`;
        }
        if (shown.idle !== idle) {
            S.root.classList.toggle('aura-measure--idle', idle);
            S.root.title = idle
                ? 'Move a viewport, then type how far.'
                : 'Drag the viewport the way to go, or press an arrow key to hold it to an axis, then type how far and press Enter: 2500, 2,500 or 2.5m, at the scale shown beside the box. A number with no unit is millimetres. Type another length to move it again from where it started.';
            S.chip.hidden = idle;
            if (idle) {
                if (document.activeElement === S.input) S.input.blur();
                Na__ViewportMeasure__Clear();
            }
            S.input.disabled = idle;
        }
        S.shown = { label, value, scale, idle };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Line Above the Box
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Show a Line Above the Box (how a value reads, or a message)
    // ------------------------------------------------------------
    // Timed lines go after HintMs; the reading of a value being typed stays until
    // the value changes or goes.
    // ------------------------------------------------------------
    function Na__ViewportMeasure__ShowHint(text, isError, timed) {
        const S = Na__ViewportMeasure__State;
        clearTimeout(S.hintTimer);
        S.hintTimer = 0;
        S.hint.textContent = text;
        S.hint.hidden = false;
        S.hint.classList.toggle('aura-measure__hint--error', !!isError);
        S.root.classList.toggle('aura-measure--error', !!isError);
        if (timed) S.hintTimer = setTimeout(Na__ViewportMeasure__HideHint, Na__AppConfig__Get('Measurements__HintMs', 2800));
    }

    function Na__ViewportMeasure__HideHint() {
        const S = Na__ViewportMeasure__State;
        clearTimeout(S.hintTimer);
        S.hintTimer = 0;
        S.hint.hidden = true;
        S.hint.textContent = '';
        S.root.classList.remove('aura-measure--error');
    }
    // ------------------------------------------------------------


    // FUNCTION | Say Something Short on the Line Above the Box, Never Over a Value Being Typed
    // ------------------------------------------------------------
    function Na__ViewportMeasure__Say(text) {
        const S = Na__ViewportMeasure__State;
        if (!S.root || S.input.value.trim()) return false;
        Na__ViewportMeasure__ShowHint(text, false, true);
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Typing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Typed Value Changed
    // ------------------------------------------------------------
    function Na__ViewportMeasure__Typed() {
        const S = Na__ViewportMeasure__State;
        const text = S.input.value;
        S.root.classList.toggle('aura-measure--typing', !!text.trim());
        if (!text.trim()) { Na__ViewportMeasure__HideHint(); return; }
        const length = Na__MeasureParse__Length(text);
        if (length.ok) Na__ViewportMeasure__ShowHint(`= ${Na__ViewportMeasure__Format(length.valueMm)}`, false, false);
        else Na__ViewportMeasure__HideHint();
    }
    // ------------------------------------------------------------


    // FUNCTION | Drop What Was Typed (true when there was something to drop)
    // ------------------------------------------------------------
    function Na__ViewportMeasure__Clear() {
        const S = Na__ViewportMeasure__State;
        if (!S.input) return false;
        const had = !!S.input.value;
        S.input.value = '';
        S.root.classList.remove('aura-measure--typing');
        if (had) Na__ViewportMeasure__HideHint();
        return had;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Give the Keys Back to the Sheet
    // ------------------------------------------------------------
    function Na__ViewportMeasure__Release() {
        const S = Na__ViewportMeasure__State;
        if (document.activeElement === S.input) S.input.blur();
        if (S.desk) { try { S.desk.focus({ preventScroll: true }); } catch (error) { /* not focusable */ } }
    }
    // ------------------------------------------------------------


    // FUNCTION | Use the Typed Value (true when a value was there to be used)
    // ------------------------------------------------------------
    // Whether or not it could be: a refusal is shown above the box and the value
    // is kept to be corrected.
    // ------------------------------------------------------------
    function Na__ViewportMeasure__Commit() {
        const S = Na__ViewportMeasure__State;
        const text = S.input.value.trim();
        if (!text) return false;
        const length = Na__MeasureParse__Length(text);
        if (!length.ok) {
            Na__ViewportMeasure__ShowHint(length.reason === Na__MeasureParse__REASON_UNIT ? 'Unknown unit. Use mm, cm or m.' : 'Not a length. Type 2500, 2,500 or 2.5m.', true, true);
            return true;
        }
        const reading = Na__ViewportMove__Reading();
        const denominator = reading ? reading.denominator : 1;                   // <-- Read first: a value typed during a drag ends the drag
        const result = Na__ViewportMove__TypeLength(length.valueMm / denominator);
        if (!result.ok) {
            Na__ViewportMeasure__ShowHint(result.reason === 'length' ? 'Too short to move it.' : 'Drag the viewport the way to go, then press Enter.', true, true);
            return true;
        }
        S.input.value = '';
        S.root.classList.remove('aura-measure--typing');
        if (result.stoppedAtMm !== null) Na__ViewportMeasure__ShowHint(`The paper's edge stopped it at ${Na__ViewportMeasure__Format(result.stoppedAtMm * denominator)}.`, false, true);
        else if (!result.retyped) Na__ViewportMeasure__ShowHint('Type another length to move it again.', false, true);
        else Na__ViewportMeasure__HideHint();
        Na__ViewportMeasure__Refresh();
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Does the Focused Element Keep Its Own Keys
    // ------------------------------------------------------------
    function Na__ViewportMeasure__KeepsKeys(target) {
        if (!target) return false;
        if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true;
        if (target.tagName !== 'INPUT') return false;
        return !Na__ViewportMeasure__NON_TEXT.includes(String(target.type || 'text').toLowerCase());
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Key Pressed Anywhere While the Box Is Awake
    // ------------------------------------------------------------
    // Listened for in the capture phase, so a value being typed is the box's before
    // a key binding can take a figure, a space or Enter. Only what the box uses is
    // taken; everything else passes on untouched.
    // ------------------------------------------------------------
    function Na__ViewportMeasure__OnKey(event) {
        const S = Na__ViewportMeasure__State;
        if (!S.input || event.defaultPrevented || event.isComposing || Na__AppState__Data.tab === 'environment') return;
        const reading = Na__ViewportMove__Reading();
        if (!reading) return;
        if (event.target === S.input || Na__ViewportMeasure__KeepsKeys(event.target)) return;   // <-- The box's own keys are handled on the box; a field keeps its own
        if (event.ctrlKey || event.metaKey || event.altKey) return;              // <-- Chords stay the sheet's: undo, redo, an Alt-drag pan
        const keys = Na__SheetKeys__GetMeasureKeys();
        const key = event.key;
        const typed = S.input.value;
        const take = () => { event.preventDefault(); event.stopImmediatePropagation(); };
        if (keys.commit.includes(key)) { if (!typed.trim()) return; take(); Na__ViewportMeasure__Commit(); return; }
        if (keys.clear.includes(key))  { if (!typed) return; take(); Na__ViewportMeasure__Clear(); return; }             // <-- Nothing typed: Escape and Delete do as ever
        if (keys.erase.includes(key))  { if (!typed) return; take(); S.input.value = typed.slice(0, -1); Na__ViewportMeasure__Typed(); return; }
        if (typeof key !== 'string' || key.length !== 1) return;
        const allowed = typed ? keys.typing : (keys.start + (reading.live ? keys.drag : ''));
        if (!allowed.includes(key)) return;                                      // <-- A letter with nothing typed is still a tool key
        take();
        S.input.value = typed + key;
        Na__ViewportMeasure__Typed();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Box in the Desk's Column (once)
    // ------------------------------------------------------------
    // Beside the desk, not in it: it stays put as the sheet scrolls, and a press on
    // it is never a tool's.
    // ------------------------------------------------------------
    function Na__ViewportMeasure__Mount(host, desk) {
        const S = Na__ViewportMeasure__State;
        if (S.root || !host) return false;
        S.desk = desk || null;
        S.root = Na__Dom__El('div', 'aura-measure aura-measure--idle', null, { role: 'group' });
        S.hint = Na__Dom__El('div', 'aura-measure__hint', null, { 'aria-live': 'polite' });
        S.hint.hidden = true;
        S.label = Na__Dom__El('span', 'aura-measure__label');
        S.input = Na__Dom__El('input', 'aura-measure__input', null, { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Measurements' });
        S.input.disabled = true;
        S.chip = Na__Dom__El('span', 'aura-measure__chip', 'Paper', { title: 'Typed and shown in paper millimetres.' });
        S.chip.hidden = true;
        [S.hint, S.label, S.input, S.chip].forEach((part) => S.root.appendChild(part));
        host.appendChild(S.root);

        // THE BOX'S OWN KEYS, once it has been clicked into: Enter uses the value
        // (or, with nothing typed, hands the keys back to the sheet) and Escape
        // drops it. Nothing typed into the box reaches the sheet's keys.
        S.input.addEventListener('keydown', (event) => {
            if (Na__SheetKeys__GetMeasureKeys().commit.includes(event.key)) {
                event.preventDefault();
                if (!Na__ViewportMeasure__Commit()) Na__ViewportMeasure__Release();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                Na__ViewportMeasure__Clear();
                Na__ViewportMeasure__Release();
            }
            event.stopPropagation();
        });
        S.input.addEventListener('input', () => Na__ViewportMeasure__Typed());

        document.addEventListener('keydown', Na__ViewportMeasure__OnKey, true);
        if (desk) desk.addEventListener('pointerdown', (event) => { if (event.button === 0) Na__ViewportMeasure__Clear(); }, true);   // <-- A click on the sheet drops a half-typed value, as in SketchUp
        Na__ViewportMove__OnRead(Na__ViewportMeasure__Refresh);
        ['select', 'tool', 'tab', 'changed', 'restored'].forEach((name) => Na__AppState__On(name, Na__ViewportMeasure__Refresh));
        Na__AppState__On('ortho', (on) => Na__ViewportMeasure__Say(on ? '<Ortho on>' : '<Ortho off>'));
        Na__ViewportMeasure__Refresh();
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ViewportMeasure__Mount,
        Na__ViewportMeasure__Refresh,
        Na__ViewportMeasure__Say,
        Na__ViewportMeasure__Clear
    };

// endregion -------------------------------------------------------------------
