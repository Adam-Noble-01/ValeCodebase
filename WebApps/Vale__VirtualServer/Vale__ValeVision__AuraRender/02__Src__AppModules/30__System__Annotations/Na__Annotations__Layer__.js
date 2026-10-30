// =============================================================================
// VALEVISION AURA - ANNOTATIONS - NOTES AND LEADERS ON THE SHEET
// =============================================================================
//
// FILE       : Na__Annotations__Layer__.js
// NAMESPACE  : Na__Annotations
// MODULE     : Annotations - Layer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Handwritten notes and leader notes on a sheet: drawn in their
//              written ink (or a typed stand-in until written), placed with the
//              Note and Leader tools, moved, re-aimed and set up in the panel
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - A NOTE is a block of words at a point, wrapped to its width, written by the
//   handwriting engine in the note's hand, size and seed. A LEADER NOTE adds a
//   hand-drawn arrow from the note to a tip on the drawing.
// - TOOLS: Note - press on the sheet to place a note there. Leader - press on
//   the thing to point at, drag to where the words go, let go. Either opens the
//   note's words in the panel.
// - INK: written notes draw the engine's strokes; a note not yet written (new
//   words, or no engine on this server) shows its words typed, pale, until the
//   engine writes it. "Write a new copy" gives it a new seed: the same words, a
//   different hand-written copy.
// - Select a note to move it; a leader's tip has its own handle.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__Select, Na__AppState__Touch, Na__AppState__Set, Na__AppState__On } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El, Na__Dom__Svg, Na__Dom__Field, Na__Dom__Select, Na__Dom__IconButton } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Seed, Na__Format__Round, Na__Format__Clamp } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__Surface__AddLayer, Na__Surface__AddOverlay, Na__Surface__On, Na__Surface__RedrawLayer, Na__Surface__RedrawOverlay, Na__Surface__PxPerMm } from '../20__System__DrawingSheets/Na__DrawingSheets__Surface__.js';
    import { Na__DrawingSet__NewAnnotation, Na__DrawingSet__Annotation } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';
    import { Na__Handwriting__Hand, Na__Handwriting__Ink, Na__Handwriting__NeedsWriting, Na__Handwriting__Queue, Na__Handwriting__Status } from '../31__System__Handwriting/Na__Handwriting__Client__.js';
    import { Na__PenLeaders__Strokes, Na__PenLeaders__Start } from '../31__System__Handwriting/Na__Handwriting__PenLeaders__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Annotations__STANDIN_FONT = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
    const Na__Annotations__CHAR_EM      = 0.6;                                  // <-- A written character is about this many letter heights wide

    const Na__Annotations__State = {
        writing   : new Set(),                   // <-- Note ids being written now
        failures  : new Map(),                   // <-- Note id -> why it could not be written
        editing   : null,                        // <-- The note whose words are being typed: written once the typing stops
        onPanel   : null                         // <-- The workspace's "show this note's panel" (focus the words)
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Geometry
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Words Wrapped as the Engine Will Roughly Wrap Them (for the stand-in)
    // ------------------------------------------------------------
    function Na__Annotations__Wrap(annotation) {
        const size = annotation.Annotation__SizeMm;
        const perLine = Math.max(6, Math.floor((annotation.Annotation__WidthMm - 3) / (size * Na__Annotations__CHAR_EM)));
        const lines = [];
        String(annotation.Annotation__Text || '').split(/\r?\n/).forEach((paragraph) => {
            let line = '';
            paragraph.split(/\s+/).filter(Boolean).forEach((word) => {
                if (line && (line + ' ' + word).length > perLine) { lines.push(line); line = word; }
                else line = line ? line + ' ' + word : word;
            });
            lines.push(line);
        });
        return lines.length ? lines : [''];
    }
    // ------------------------------------------------------------


    // FUNCTION | A Note's Box on the Sheet ({ X, Y, W, H }): its ink's size when written
    // ------------------------------------------------------------
    function Na__Annotations__Box(annotation) {
        const at = annotation.Annotation__AtMm;
        const written = !Na__Handwriting__NeedsWriting(annotation) && annotation.Annotation__Written;
        if (written) return { X: at.X, Y: at.Y, W: Math.max(8, written.InkWidthMm), H: Math.max(annotation.Annotation__SizeMm, written.HeightMm) };
        const lines = Na__Annotations__Wrap(annotation);
        const longest = Math.max(4, ...lines.map((l) => l.length));
        const size = annotation.Annotation__SizeMm;
        return {
            X : at.X,
            Y : at.Y,
            W : Math.min(annotation.Annotation__WidthMm, longest * size * Na__Annotations__CHAR_EM + 3),
            H : lines.length * size * Na__AppConfig__Get('Handwriting__LineSpacing', 1.35) + size * 0.6
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing
// -----------------------------------------------------------------------------

    // FUNCTION | Draw One Annotation: its leader, its ink (or stand-in), and a box to press
    // ------------------------------------------------------------
    function Na__Annotations__DrawOne(parent, annotation) {
        const id = annotation.Annotation__Id;
        const colour = Na__Handwriting__Ink(annotation.Annotation__InkKey);
        const hand = Na__Handwriting__Hand(annotation.Annotation__HandKey);
        const box = Na__Annotations__Box(annotation);
        const g = Na__Dom__Svg('g', { class: 'aura-note', 'data-hit': 'annotation', 'data-id': id }, parent);

        if (annotation.Annotation__Kind === 'Leader' && annotation.Annotation__TipMm) {
            const tip = [annotation.Annotation__TipMm.X, annotation.Annotation__TipMm.Y];
            const from = Na__PenLeaders__Start(box, tip);
            const leader = Na__Dom__Svg('g', { fill: 'none', stroke: colour, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'aura-note__leader' }, g);
            Na__PenLeaders__Strokes({ from, to: tip, seed: annotation.Annotation__Seed, pen: Na__AppConfig__Get('Annotation__PenWidthMm', 0.3), variation: hand.Variation })
                .forEach((s) => Na__Dom__Svg('path', { d: s.d, 'stroke-width': s.width }, leader));
            Na__Dom__Svg('line', { x1: from[0], y1: from[1], x2: tip[0], y2: tip[1], class: 'aura-note__leader-hit' }, g);   // <-- An easy line to press
        }

        Na__Dom__Svg('rect', { x: box.X, y: box.Y, width: box.W, height: box.H, class: 'aura-note__hit' }, g);
        const written = !Na__Handwriting__NeedsWriting(annotation) && annotation.Annotation__Written;
        if (written) {
            const ink = Na__Dom__Svg('g', { transform: `translate(${box.X} ${box.Y})`, fill: 'none', stroke: colour, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'aura-note__ink' }, g);
            written.Paths.forEach((p) => Na__Dom__Svg('path', { d: p.D, 'stroke-width': p.W }, ink));
        } else {
            const size = annotation.Annotation__SizeMm;
            const lines = Na__Annotations__Wrap(annotation);
            const text = Na__Dom__Svg('text', { x: box.X + 1.5, y: box.Y + size * 1.05, 'font-size': size, 'font-family': Na__Annotations__STANDIN_FONT, fill: colour, class: 'aura-note__standin' }, g);
            lines.forEach((line, i) => {
                const span = Na__Dom__Svg('tspan', { x: box.X + 1.5, dy: i === 0 ? 0 : size * Na__AppConfig__Get('Handwriting__LineSpacing', 1.35) }, text);
                span.textContent = line || (i === 0 && !annotation.Annotation__Text ? '...' : '');
            });
        }
        return g;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Annotations Layer; notes not yet written are queued for the engine
    // ------------------------------------------------------------
    function Na__Annotations__DrawLayer(group, sheet) {
        const S = Na__Annotations__State;
        (sheet.Sheet__Annotations || []).forEach((a) => {
            Na__Annotations__DrawOne(group, a);
            if (Na__Handwriting__NeedsWriting(a) && !S.failures.has(a.Annotation__Id) && S.editing !== a.Annotation__Id) Na__Annotations__WriteNote(a);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Selected Note's Box and Handles (the overlay)
    // ------------------------------------------------------------
    function Na__Annotations__DrawOverlay(group, sheet) {
        const sel = Na__AppState__Data.selection;
        const annotation = sel && sel.kind === 'annotation' ? Na__DrawingSet__Annotation(sheet, sel.id) : null;
        if (!annotation) return;
        const k = 1 / Na__Surface__PxPerMm();
        const box = Na__Annotations__Box(annotation);
        Na__Dom__Svg('rect', { x: box.X - 1, y: box.Y - 1, width: box.W + 2, height: box.H + 2, class: 'aura-select-frame', 'stroke-width': 1.5 * k, 'pointer-events': 'none' }, group);
        if (annotation.Annotation__Kind === 'Leader' && annotation.Annotation__TipMm) {
            Na__Dom__Svg('circle', { cx: annotation.Annotation__TipMm.X, cy: annotation.Annotation__TipMm.Y, r: 5 * k, class: 'aura-handle', 'stroke-width': 1.2 * k,
                                     'data-hit': 'handle', 'data-owner': 'annotation', 'data-handle': 'tip' }, group);
        }
        const w = 9 * k;
        Na__Dom__Svg('rect', { x: box.X + annotation.Annotation__WidthMm - w / 2 + 1, y: box.Y + box.H / 2 - w / 2, width: w, height: w, class: 'aura-handle aura-handle--e',
                               'stroke-width': 1.2 * k, 'data-hit': 'handle', 'data-owner': 'annotation', 'data-handle': 'width' }, group);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Writing
// -----------------------------------------------------------------------------

    // FUNCTION | Have the Engine Write a Note (once its words, size, width or hand changed)
    // ------------------------------------------------------------
    function Na__Annotations__WriteNote(annotation) {
        const S = Na__Annotations__State;
        const id = annotation.Annotation__Id;
        if (S.writing.has(id) || !String(annotation.Annotation__Text || '').trim()) return;
        S.writing.add(id);
        S.failures.delete(id);
        Na__Handwriting__Queue(annotation, (ink, error) => {
            S.writing.delete(id);
            if (error) S.failures.set(id, error.message || String(error));
            else if (ink) {
                annotation.Annotation__Written = ink;
                Na__AppState__Touch('ink', Na__AppState__Data.tab);
            }
            if (Na__AppState__Data.tab !== 'environment') {
                Na__Surface__RedrawLayer('annotations');
                Na__Surface__RedrawOverlay();
            }
            const sel = Na__AppState__Data.selection;
            if (sel && sel.kind === 'annotation' && sel.id === id && S.onPanel && S.editing !== id) S.onPanel();   // <-- Never rebuild the panel under someone typing
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pointer: Tools, Select, Move, Re-Aim
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Sheet Being Edited
    // ------------------------------------------------------------
    function Na__Annotations__Sheet() {
        const d = Na__AppState__Data;
        return d.doc ? (d.doc.AuraDrawingSet__Sheets || []).find((s) => s.Sheet__Id === d.tab) || null : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Press on Bare Paper With the Note or Leader Tool: place one
    // ------------------------------------------------------------
    function Na__Annotations__OnPaper(event, mm) {
        const tool = Na__AppState__Data.tool;
        const sheet = Na__Annotations__Sheet();
        if (!sheet || (tool !== 'note' && tool !== 'leader')) return null;
        const start = { X: Na__Format__Round(mm.X, 1), Y: Na__Format__Round(mm.Y, 1) };
        const finish = (at) => {
            const annotation = Na__DrawingSet__NewAnnotation(tool === 'leader'
                ? { kind: 'Leader', at, tip: start }
                : { kind: 'Note', at: start });
            sheet.Sheet__Annotations.push(annotation);
            Na__AppState__Set({ tool: 'select' });
            Na__AppState__Select('annotation', annotation.Annotation__Id);
            Na__AppState__Touch('annotation', sheet.Sheet__Id);
            Na__Surface__RedrawLayer('annotations');
            Na__Surface__RedrawOverlay();
            if (Na__Annotations__State.onPanel) Na__Annotations__State.onPanel(true);
        };
        if (tool === 'note') { finish(start); return {}; }                       // <-- Placed at once: an empty drag, so the press goes no further
        let last = start;
        return {
            move(p) { last = { X: Na__Format__Round(p.X, 1), Y: Na__Format__Round(p.Y, 1) }; },
            end() {
                const far = Math.hypot(last.X - start.X, last.Y - start.Y) > 4;
                finish(far ? last : { X: start.X + 15, Y: start.Y - 15 });       // <-- A click without a drag: the words up and to the right
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Press on a Note: select it, then move it (its leader's tip stays on what it points at)
    // ------------------------------------------------------------
    function Na__Annotations__OnPress(event, mm, element) {
        if (Na__AppState__Data.tool !== 'select') return Na__Annotations__OnPaper(event, mm);
        const sheet = Na__Annotations__Sheet();
        const annotation = Na__DrawingSet__Annotation(sheet, element.getAttribute('data-id'));
        if (!annotation) return null;
        Na__AppState__Select('annotation', annotation.Annotation__Id);
        const start = { X: mm.X, Y: mm.Y, at: Object.assign({}, annotation.Annotation__AtMm) };
        let moved = false;
        return {
            move(p) {
                moved = true;
                annotation.Annotation__AtMm = { X: Na__Format__Round(start.at.X + p.X - start.X, 1), Y: Na__Format__Round(start.at.Y + p.Y - start.Y, 1) };
                Na__Surface__RedrawLayer('annotations');
                Na__Surface__RedrawOverlay();
            },
            end() { if (moved) Na__AppState__Touch('annotation', sheet.Sheet__Id); }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Press on a Note's Handle: its leader's tip, or its width
    // ------------------------------------------------------------
    function Na__Annotations__OnHandle(event, mm, element) {
        const sheet = Na__Annotations__Sheet();
        const sel = Na__AppState__Data.selection;
        const annotation = sel && sel.kind === 'annotation' ? Na__DrawingSet__Annotation(sheet, sel.id) : null;
        if (!annotation) return null;
        const which = element.getAttribute('data-handle');
        let moved = false;
        return {
            move(p) {
                moved = true;
                if (which === 'tip') annotation.Annotation__TipMm = { X: Na__Format__Round(p.X, 1), Y: Na__Format__Round(p.Y, 1) };
                else annotation.Annotation__WidthMm = Na__Format__Round(Na__Format__Clamp(p.X - annotation.Annotation__AtMm.X, 20, 350), 1);
                Na__Surface__RedrawLayer('annotations');
                Na__Surface__RedrawOverlay();
            },
            end() {
                if (!moved) return;
                Na__AppState__Touch('annotation', sheet.Sheet__Id);
                if (which === 'width' && Na__Annotations__State.onPanel) Na__Annotations__State.onPanel();
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove a Note
    // ------------------------------------------------------------
    function Na__Annotations__Remove(annotation) {
        const sheet = Na__Annotations__Sheet();
        if (!sheet || !annotation) return;
        sheet.Sheet__Annotations = sheet.Sheet__Annotations.filter((a) => a !== annotation);
        Na__AppState__Select(null);
        Na__AppState__Touch('annotation', sheet.Sheet__Id);
        Na__Surface__RedrawLayer('annotations');
        Na__Surface__RedrawOverlay();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Note Panel
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Selected Note's Settings Into a Panel (focusWords: put the cursor in its words)
    // ------------------------------------------------------------
    function Na__Annotations__Panel(container, annotation, focusWords) {
        const sheet = Na__Annotations__Sheet();
        const redraw = () => { Na__Surface__RedrawLayer('annotations'); Na__Surface__RedrawOverlay(); };
        const edited = (rewrite) => {
            Na__AppState__Touch('annotation', sheet.Sheet__Id);
            if (rewrite) Na__Annotations__State.failures.delete(annotation.Annotation__Id);
            redraw();
        };
        container.appendChild(Na__Dom__El('h2', 'aura-panel__title', annotation.Annotation__Kind === 'Leader' ? 'Leader note' : 'Note'));

        const words = Na__Dom__El('textarea', 'aura-input aura-input--words', null, { rows: 4, maxlength: Na__AppConfig__Get('Handwriting__MaxChars', 600), placeholder: 'Write the note here' });
        words.value = annotation.Annotation__Text || '';
        words.addEventListener('focus', () => { Na__Annotations__State.editing = annotation.Annotation__Id; });
        words.addEventListener('input', () => { annotation.Annotation__Text = words.value; Na__AppState__Touch('annotation', sheet.Sheet__Id); redraw(); });
        words.addEventListener('blur', () => {
            Na__Annotations__State.editing = null;                               // <-- Typing stopped: now the engine may write it
            Na__Annotations__State.failures.delete(annotation.Annotation__Id);
            redraw();
        });
        container.appendChild(Na__Dom__Field('Words', words));
        if (focusWords) requestAnimationFrame(() => words.focus());

        const sizes = Na__AppConfig__Get('Annotation__Sizes', [3, 4.5, 6]).map((s) => ({ value: s, label: `${s} mm` }));
        const size = Na__Dom__Select(sizes, annotation.Annotation__SizeMm);
        size.addEventListener('change', () => { annotation.Annotation__SizeMm = Number(size.value); edited(true); });
        container.appendChild(Na__Dom__Field('Letter height', size));

        const width = Na__Dom__El('input', 'aura-input aura-input--number', null, { type: 'number', min: 20, max: 350, step: 1 });
        width.value = Math.round(annotation.Annotation__WidthMm);
        width.addEventListener('change', () => { annotation.Annotation__WidthMm = Na__Format__Clamp(Number(width.value) || 70, 20, 350); width.value = Math.round(annotation.Annotation__WidthMm); edited(true); });
        container.appendChild(Na__Dom__Field('Width (mm)', width));

        const inks = Na__AppConfig__Get('Annotation__Inks', []).map((i) => ({ value: i.Key, label: i.Label }));
        const ink = Na__Dom__Select(inks, annotation.Annotation__InkKey);
        ink.addEventListener('change', () => { annotation.Annotation__InkKey = ink.value; edited(false); });
        container.appendChild(Na__Dom__Field('Ink', ink));

        const hands = Na__AppConfig__Get('Handwriting__Hands', []).map((h) => ({ value: h.Key, label: h.Label }));
        const hand = Na__Dom__Select(hands, annotation.Annotation__HandKey);
        hand.addEventListener('change', () => { annotation.Annotation__HandKey = hand.value; edited(true); });
        container.appendChild(Na__Dom__Field('Hand', hand));

        const copy = Na__Dom__IconButton('refresh', 'aura-button', 'Write a new copy', 'The same words in a different hand-written copy (a new seed)');
        copy.addEventListener('click', () => { annotation.Annotation__Seed = Na__Format__Seed(); edited(true); });
        container.appendChild(copy);

        // How the ink stands: written, being written, or why it cannot be
        const state = Na__Dom__El('p', 'aura-panel__note aura-ink-state');
        container.appendChild(state);
        const S = Na__Annotations__State;
        if (S.writing.has(annotation.Annotation__Id)) state.textContent = 'Writing this note...';
        else if (S.failures.has(annotation.Annotation__Id)) {
            state.textContent = `Shown typed: ${S.failures.get(annotation.Annotation__Id)}`;
            state.classList.add('is-warning');
        } else if (annotation.Annotation__Written && !Na__Handwriting__NeedsWriting(annotation)) {
            const w = annotation.Annotation__Written;
            state.textContent = `Hand-written${w.Seconds ? ` in ${w.Seconds.toFixed(1)} s` : ''}.${w.Warnings && w.Warnings.length ? ' ' + w.Warnings.join(' ') : ''}`;
        } else {
            Na__Handwriting__Status().then((status) => {
                if (!status.available) { state.textContent = `Shown typed: ${status.reason}`; state.classList.add('is-warning'); }
            });
        }

        const remove = Na__Dom__IconButton('trash', 'aura-button aura-button--danger', 'Delete note');
        remove.addEventListener('click', () => Na__Annotations__Remove(annotation));
        container.appendChild(remove);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount
// -----------------------------------------------------------------------------

    // FUNCTION | Join the Surface: the layer, the overlay, the presses; onPanel shows the note's panel
    // ------------------------------------------------------------
    function Na__Annotations__Mount(onPanel) {
        Na__Annotations__State.onPanel = onPanel || null;
        Na__Surface__AddLayer('annotations', Na__Annotations__DrawLayer);
        Na__Surface__AddOverlay(Na__Annotations__DrawOverlay);
        Na__Surface__On('annotation', Na__Annotations__OnPress);
        Na__Surface__On('handle:annotation', Na__Annotations__OnHandle);
        Na__AppState__On('tool', () => Na__Surface__RedrawOverlay());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Annotations__Mount,
        Na__Annotations__OnPaper,
        Na__Annotations__Panel,
        Na__Annotations__Remove,
        Na__Annotations__WriteNote
    };

// endregion -------------------------------------------------------------------
