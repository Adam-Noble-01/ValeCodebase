/* =============================================================================
   PAINTERLYNPR - HUD | INTERFACE - TYPE IN
   =============================================================================

   FILE       : PainterlyNPR__Interface__TypeIn__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - Interface - Type In
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Every slider's readout can be typed into: click it (or Tab to it
                and press Enter), type the value as the readout shows it, Enter
   CREATED    : 30-Oct-2026 (v0.5.2)

   DESCRIPTION:
   - Register(input, format) pairs a range with the readout format that writes
     the <output> beside it; the format's .Parse (Formats, ParseFrom) reads the
     typed text back to a value.
   - A typed value goes in through the slider itself: its value is set (the range
     clamps and snaps it to its own min, max and step) and an input event is sent,
     so the listener that already moves the engine for a drag does the rest -
     state, bump, readout, render. Nothing else needed to change.
   - While typing, a text field stands in for the readout; Escape puts the readout
     back unchanged, and no key reaches the sheet's shortcuts.
   - Wire() adds the one listener pair, on the document, once: rows built later
     (the point cards, the node beside a point) only need registering.

   ============================================================================= */

// =============================================================================
// REGION | Interface - Type In
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Registry
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Which Readout Belongs to Which Slider
    // ------------------------------------------------------------
    const FORMATS  =  new WeakMap();                                         // <-- range input -> its readout format (with .Parse)
    const Wired    =  { Done: false };
    // ------------------------------------------------------------


    // FUNCTION | Pair a Range With Its Readout's Format
    // ------------------------------------------------------------
    // The readout is the <output> straight after the range, as every row in the
    // panel, the point cards and the node is written.
    function PainterlyNPR__TypeIn__Register(input, format) {
        if (!input || !format || typeof format.Parse !== 'function') return;
        FORMATS.set(input, format);
        const output  =  PainterlyNPR__TypeIn__OutputOf(input);
        if (!output) return;
        output.classList.add('PainterlyNPR__TypeIn__Readout');
        output.tabIndex  =  0;
        output.title     =  'Click to type a value';
    }

    function PainterlyNPR__TypeIn__OutputOf(input) {
        const next  =  input.nextElementSibling;
        return next && next.tagName === 'OUTPUT' ? next : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Editing
// -----------------------------------------------------------------------------

    // FUNCTION | Stand a Text Field in for the Readout
    // ------------------------------------------------------------
    function PainterlyNPR__TypeIn__Begin(output) {
        const input   =  output.previousElementSibling;
        const format  =  input && FORMATS.get(input);
        if (!format || output.hidden) return;
        const field   =  document.createElement('input');
        field.type       =  'text';
        field.className  =  'PainterlyNPR__TypeIn__Field';
        field.value      =  output.textContent;
        field.setAttribute('aria-label', 'Type a value');
        let done  =  false;
        const finish  =  (commit) => {
            if (done) return;
            done  =  true;
            const value  =  commit ? format.Parse(field.value) : NaN;
            field.remove();
            output.hidden  =  false;
            if (!Number.isFinite(value)) return;                             // <-- Nothing readable: the slider keeps its value
            input.value  =  String(value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };
        field.addEventListener('keydown', (e) => {
            e.stopPropagation();                                             // <-- Typing never reaches the sheet's shortcuts
            if (e.key === 'Enter') { e.preventDefault(); finish(true); }
            else if (e.key === 'Escape') { e.preventDefault(); finish(false); output.focus(); }
        });
        field.addEventListener('blur', () => finish(true));
        for (const type of ['pointerdown', 'click']) field.addEventListener(type, (e) => e.stopPropagation());
        output.hidden  =  true;
        output.after(field);
        field.focus();
        field.select();
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Document - once
    // ------------------------------------------------------------
    // A click on a readout inside a <label> would otherwise be handed to the
    // slider (the label's own behaviour): cancelled in the capture phase.
    function PainterlyNPR__TypeIn__Wire() {
        if (Wired.Done) return;
        Wired.Done  =  true;
        document.addEventListener('click', (e) => {
            const output  =  e.target.closest && e.target.closest('output.PainterlyNPR__TypeIn__Readout');
            if (!output) return;
            e.preventDefault();
            PainterlyNPR__TypeIn__Begin(output);
        }, true);
        document.addEventListener('keydown', (e) => {
            const output  =  e.target.closest && e.target.closest('output.PainterlyNPR__TypeIn__Readout');
            if (!output || (e.key !== 'Enter' && e.key !== 'F2')) return;
            e.preventDefault();
            e.stopPropagation();
            PainterlyNPR__TypeIn__Begin(output);
        }, true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__TypeIn__Register,
        PainterlyNPR__TypeIn__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
