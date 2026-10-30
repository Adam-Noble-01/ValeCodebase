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
//   words, or the engine still loading or unable to run here) shows its words
//   typed, pale, until the engine writes it. The engine runs in this browser
//   (31__System__Handwriting). "Write a new copy" gives it a new seed: the same
//   words, a different hand-written copy.
// - THE PEN: every note and its leader are drawn with the note's STAEDTLER Mars
//   matic 700 nib (0.18 mm unless chosen), in millimetres on the paper; the
//   panel's Pen shows its true and printed widths. The Advanced writing style
//   sets everything else the writing model and its layout use.
// - Select a note to move it; a leader's tip has its own handle.
// - BENDING A LEADER (1.3.0): a selected leader shows its bend points. Drag one
//   and the spline follows smoothly; Ctrl + click the leader adds a point there
//   (and drags it straight away); Ctrl + Shift + click a point, or select it
//   and press Delete, takes it out. "Straighten" clears them all.
// - WHERE A LEADER LEAVES (1.4.0): the square handle where it meets the words
//   slides round their box (or the panel's Leader leaves picks a place);
//   Annotation__LeaderFrom { Side, At }, null: automatic.
// - JUSTIFY (1.4.0): Left, Centre, Right or Box (justified), set on the sheet
//   from the written ink (Na__Annotations__Justify__.js); Annotation__Align.
// - LETTERS (1.5.0): each note is lettered in drawn architect's capitals (the
//   default, drawn at once on the page) or written in the model's joined-up
//   hand (Annotation__Letters; the panel's Letters, after Hand). A joined-up
//   note appears line by line as it is written, its later lines typed till
//   then.
// - A LEADER LEAVES BESIDE THE FIRST LINE (1.5.0): unless dragged or picked,
//   from the words' side level with the first line's middle; words set Left
//   lead from the left, Right from the right, Centre and Box from the side
//   nearer the tip (Na__PenLeaders__Start's note).
// - THE BOX'S TWO SIDES (1.5.0): a selected note has a handle on each side;
//   drag either to size the box its words wrap to (Adam: "Add a handle here so
//   you can drag to set the text box size, remove the box size from the menu
//   its simply not intuitive"). The panel's Width (mm) is gone.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.5.0
// - Architect's capitals or joined-up handwriting per note, a joined-up note
//   drawn line by line as it is written, and a left-side handle to size the box
//   in place of the panel's width (AURA 0.4.9).
//
// 30-Oct-2026 - Version 1.4.0
// - Where a leader leaves its words, dragged or picked, and the note's words
//   justified left, centre, right or to the box (AURA 0.4.7).
//
// 30-Oct-2026 - Version 1.3.0
// - Spline leaders (AURA 0.4.5): Annotation__BendsMm, the bend handles, Ctrl +
//   click to add a point, Ctrl + Shift + click or Delete to remove one, the
//   hit line following the curve, Straighten in the panel.
//
// 30-Oct-2026 - Version 1.2.0
// - The pen and the writing style (AURA 0.3.2): ink and leaders drawn with the
//   note's nib (relative ink times the nib; widths written to 0.001 mm), the
//   leader technical unless the style is variable, the stand-in's line spacing
//   the style's; the panel gains Pen with its metric and the Advanced writing
//   style; a new hand clears the note's own settings; the panel waits to
//   rebuild while a style slider is held.
//
// 30-Oct-2026 - Version 1.1.0
// - The note panel says when the handwriting engine is being fetched (the
//   first note on a device waits for its 15 MB model); AURA 0.2.1.
//
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
    import { Na__Handwriting__Ink, Na__Handwriting__KeyFor, Na__Handwriting__Loading, Na__Handwriting__NeedsWriting, Na__Handwriting__Queue, Na__Handwriting__Status } from '../31__System__Handwriting/Na__Handwriting__Client__.js';
    import { Na__PenLeaders__Strokes, Na__PenLeaders__Start, Na__PenLeaders__Place } from '../31__System__Handwriting/Na__Handwriting__PenLeaders__.js';
    import { Na__Justify__Offsets } from './Na__Annotations__Justify__.js';
    import { Na__HandwritingStyle__Effective, Na__HandwritingStyle__Pen, Na__HandwritingStyle__BuildPen, Na__HandwritingStyle__BuildAdvanced, Na__HandwritingStyle__Busy,
             Na__HandwritingStyle__Letters, Na__HandwritingStyle__LettersOptions } from '../31__System__Handwriting/Na__Handwriting__Style__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Annotations__STANDIN_FONT = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
    const Na__Annotations__CHAR_EM      = 0.6;                                  // <-- A written character is about this many letter heights wide

    const Na__Annotations__State = {
        writing   : new Set(),                   // <-- Note ids being written now
        failures  : new Map(),                   // <-- Note id -> why it could not be written
        partial   : new Map(),                   // <-- Note id -> its ink so far, line by line, while the model writes it
        editing   : null,                        // <-- The note whose words are being typed: written once the typing stops
        bend      : null,                        // <-- The selected bend point: { id, index }; Delete removes it
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


    // HELPER FUNCTION | The Ink a Note Shows: { ink, partial } (its written ink, else its lines written so far), or null
    // ------------------------------------------------------------
    function Na__Annotations__Showing(annotation) {
        if (!Na__Handwriting__NeedsWriting(annotation) && annotation.Annotation__Written) return { ink: annotation.Annotation__Written, partial: false };
        const so = Na__Annotations__State.partial.get(annotation.Annotation__Id);
        return so && so.Key === Na__Handwriting__KeyFor(annotation) ? { ink: so, partial: true } : null;   // <-- Never the old words' lines
    }
    // ------------------------------------------------------------


    // FUNCTION | A Note's Box on the Sheet ({ X, Y, W, H }): its ink's size when written
    // ------------------------------------------------------------
    function Na__Annotations__Box(annotation) {
        const at = annotation.Annotation__AtMm;
        const shown = Na__Annotations__Showing(annotation);
        const lines = Na__Annotations__Wrap(annotation);
        if (shown && !shown.partial) return { X: at.X, Y: at.Y, W: Math.max(8, shown.ink.InkWidthMm), H: Math.max(annotation.Annotation__SizeMm, shown.ink.HeightMm) };
        if (shown) {                                                             // <-- Lines so far, then the typed rest beneath
            const rest = Math.max(0, lines.length - shown.ink.Lines) * annotation.Annotation__SizeMm * Na__HandwritingStyle__Effective(annotation).LineSpacing;
            return { X: at.X, Y: at.Y, W: Math.max(8, annotation.Annotation__WidthMm), H: shown.ink.HeightMm + rest };
        }
        const longest = Math.max(4, ...lines.map((l) => l.length));
        const size = annotation.Annotation__SizeMm;
        return {
            X : at.X,
            Y : at.Y,
            W : Math.min(annotation.Annotation__WidthMm, longest * size * Na__Annotations__CHAR_EM + 3),
            H : lines.length * size * Na__HandwritingStyle__Effective(annotation).LineSpacing + size * 0.6
        };
    }
    // ------------------------------------------------------------



    // FUNCTION | A Leader's Strokes and Samples, or null: where it leaves its words, through its bends, to its tip
    // ------------------------------------------------------------
    function Na__Annotations__Leader(annotation, box) {
        if (annotation.Annotation__Kind !== 'Leader' || !annotation.Annotation__TipMm) return null;
        const tip = [annotation.Annotation__TipMm.X, annotation.Annotation__TipMm.Y];
        const bends = Array.isArray(annotation.Annotation__BendsMm) ? annotation.Annotation__BendsMm : [];
        const style = Na__HandwritingStyle__Effective(annotation);
        const middle = Na__HandwritingStyle__Letters(annotation) === 'Capitals' ? 0.35 : 0.48;   // <-- The first line's middle: half a capital (0.7), or the joined-up hand's small letters
        const start = Na__PenLeaders__Start(box || Na__Annotations__Box(annotation), bends.length ? [bends[0].X, bends[0].Y] : tip, annotation.Annotation__LeaderFrom,
                                            { align: annotation.Annotation__Align, firstLine: style.MarginMm + annotation.Annotation__SizeMm * middle });
        return Na__PenLeaders__Strokes({ from: start.from, exit: start.exit, bends, to: tip, seed: annotation.Annotation__Seed,
                                         pen: Na__HandwritingStyle__Pen(annotation).WidthMm, variation: style.Variation, technical: style.PenMode !== 'Variable' });
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
        const style = Na__HandwritingStyle__Effective(annotation);
        const nib = Na__HandwritingStyle__Pen(annotation).WidthMm;              // <-- mm on the paper: true when the sheet prints at 100%
        const box = Na__Annotations__Box(annotation);
        const g = Na__Dom__Svg('g', { class: 'aura-note', 'data-hit': 'annotation', 'data-id': id }, parent);

        const line = Na__Annotations__Leader(annotation, box);
        if (line) {
            const leader = Na__Dom__Svg('g', { fill: 'none', stroke: colour, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'aura-note__leader' }, g);
            line.paths.forEach((s) => Na__Dom__Svg('path', { d: s.d, 'stroke-width': s.width.toFixed(3) }, leader));   // <-- Text: the builder would round a number to 0.01 mm
            const along = line.samples.filter((p, i) => i % 3 === 0 || i === line.samples.length - 1).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('');
            Na__Dom__Svg('path', { d: along, fill: 'none', class: 'aura-note__leader-hit' }, g);   // <-- An easy curve to press (and to Ctrl + click a point onto)
        }

        Na__Dom__Svg('rect', { x: box.X, y: box.Y, width: box.W, height: box.H, class: 'aura-note__hit' }, g);
        const shown = Na__Annotations__Showing(annotation);
        if (shown) {
            const written = shown.ink;
            const ink = Na__Dom__Svg('g', { transform: `translate(${box.X} ${box.Y})`, fill: 'none', stroke: colour, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'aura-note__ink' }, g);
            const shift = Na__Justify__Offsets(written, annotation.Annotation__Align, annotation.Annotation__SizeMm);   // <-- null: set left, as written
            written.Paths.forEach((p, i) => Na__Dom__Svg('path', { d: p.D, 'stroke-width': written.Relative ? (p.W * nib).toFixed(3) : p.W,   // <-- Relative ink: the note's pen applied here
                                                                   transform: shift && shift[i] ? `translate(${shift[i]} 0)` : null }, ink));
        }
        const typed = shown ? (shown.partial ? Na__Annotations__Wrap(annotation).slice(shown.ink.Lines) : []) : Na__Annotations__Wrap(annotation);   // <-- Lines not written yet
        if (typed.length) {
            const size = annotation.Annotation__SizeMm;
            const align = annotation.Annotation__Align;
            const top = shown ? box.Y + shown.ink.HeightMm : box.Y;
            const x = align === 'Centre' ? box.X + box.W / 2 : align === 'Right' ? box.X + box.W - 1.5 : box.X + 1.5;   // <-- Box typed: set left, the ink justifies
            const text = Na__Dom__Svg('text', { x, y: top + size * 1.05, 'font-size': size, 'font-family': Na__Annotations__STANDIN_FONT, fill: colour, class: 'aura-note__standin',
                                                'text-anchor': align === 'Centre' ? 'middle' : align === 'Right' ? 'end' : null }, g);
            typed.forEach((line, i) => {
                const span = Na__Dom__Svg('tspan', { x, dy: i === 0 ? 0 : size * style.LineSpacing }, text);
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
            const bend = Na__Annotations__SelectedBend(annotation);
            (annotation.Annotation__BendsMm || []).forEach((b, i) => {
                Na__Dom__Svg('circle', { cx: b.X, cy: b.Y, r: 4 * k, class: `aura-handle aura-handle--bend${i === bend ? ' is-active' : ''}`, 'stroke-width': 1.2 * k,
                                         'data-hit': 'handle', 'data-owner': 'annotation', 'data-handle': 'bend', 'data-index': i }, group);
            });
            Na__Dom__Svg('circle', { cx: annotation.Annotation__TipMm.X, cy: annotation.Annotation__TipMm.Y, r: 5 * k, class: 'aura-handle', 'stroke-width': 1.2 * k,
                                     'data-hit': 'handle', 'data-owner': 'annotation', 'data-handle': 'tip' }, group);
            const line = Na__Annotations__Leader(annotation, box);
            if (line) {
                const [fx, fy] = line.samples[0], f = 7 * k;
                Na__Dom__Svg('rect', { x: fx - f / 2, y: fy - f / 2, width: f, height: f, class: `aura-handle aura-handle--from${annotation.Annotation__LeaderFrom ? ' is-set' : ''}`, 'stroke-width': 1.2 * k,
                                       'data-hit': 'handle', 'data-owner': 'annotation', 'data-handle': 'from' }, group);   // <-- Where it leaves the words: slides round their box
            }
        }
        const w = 9 * k;                                                         // <-- The box's two sides: drag either to size it (its words wrap to it)
        Na__Dom__Svg('rect', { x: box.X - w / 2 - 1, y: box.Y + box.H / 2 - w / 2, width: w, height: w, class: 'aura-handle aura-handle--w',
                               'stroke-width': 1.2 * k, 'data-hit': 'handle', 'data-owner': 'annotation', 'data-handle': 'left' }, group);
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
        const repaint = () => {
            if (Na__AppState__Data.tab === 'environment') return;
            Na__Surface__RedrawLayer('annotations');
            Na__Surface__RedrawOverlay();
        };
        Na__Handwriting__Queue(annotation, (ink, error) => {
            S.writing.delete(id);
            S.partial.delete(id);
            if (error) S.failures.set(id, error.message || String(error));
            else if (ink) {
                annotation.Annotation__Written = ink;
                Na__AppState__Touch('ink', Na__AppState__Data.tab);
            }
            repaint();
            const sel = Na__AppState__Data.selection;
            if (sel && sel.kind === 'annotation' && sel.id === id && S.onPanel && S.editing !== id && !Na__HandwritingStyle__Busy()) S.onPanel();   // <-- Never rebuild the panel under someone typing or holding a slider
        }, (so) => {                                                             // <-- A joined-up note line by line: shown, not saved
            if (!S.writing.has(id)) return;
            S.partial.set(id, so);
            repaint();
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
        const onLeader = event.target && event.target.classList && event.target.classList.contains('aura-note__leader-hit');
        if (onLeader && (event.ctrlKey || event.metaKey) && !event.shiftKey) return Na__Annotations__AddBend(sheet, annotation, mm);
        Na__Annotations__State.bend = null;
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
        if (which === 'from') return Na__Annotations__DragFrom(sheet, annotation);
        if (which === 'bend') {
            const index = Number(element.getAttribute('data-index'));
            if ((event.ctrlKey || event.metaKey) && event.shiftKey) { Na__Annotations__RemoveBend(annotation, index); return {}; }   // <-- Taken out at once: an empty drag
            return Na__Annotations__DragBend(sheet, annotation, index);
        }
        let moved = false;
        const right = annotation.Annotation__AtMm.X + annotation.Annotation__WidthMm;   // <-- The left side moves; the right stays put
        return {
            move(p) {
                moved = true;
                if (which === 'tip') annotation.Annotation__TipMm = { X: Na__Format__Round(p.X, 1), Y: Na__Format__Round(p.Y, 1) };
                else if (which === 'left') {
                    const width = Na__Format__Round(Na__Format__Clamp(right - p.X, 20, 350), 1);
                    annotation.Annotation__AtMm = { X: Na__Format__Round(right - width, 1), Y: annotation.Annotation__AtMm.Y };
                    annotation.Annotation__WidthMm = width;
                }
                else annotation.Annotation__WidthMm = Na__Format__Round(Na__Format__Clamp(p.X - annotation.Annotation__AtMm.X, 20, 350), 1);
                Na__Surface__RedrawLayer('annotations');
                Na__Surface__RedrawOverlay();
            },
            end() {
                if (!moved) return;
                Na__AppState__Touch('annotation', sheet.Sheet__Id);
                if ((which === 'width' || which === 'left') && Na__Annotations__State.onPanel) Na__Annotations__State.onPanel();
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Drag Where a Leader Leaves Its Words: round their box, to the nearest side
    // ------------------------------------------------------------
    function Na__Annotations__DragFrom(sheet, annotation) {
        const was = JSON.stringify(annotation.Annotation__LeaderFrom || null);
        return {
            move(p) {
                annotation.Annotation__LeaderFrom = Na__PenLeaders__Place(Na__Annotations__Box(annotation), [p.X, p.Y]);
                Na__Surface__RedrawLayer('annotations');
                Na__Surface__RedrawOverlay();
            },
            end() {
                if (JSON.stringify(annotation.Annotation__LeaderFrom || null) === was) return;
                Na__AppState__Touch('annotation', sheet.Sheet__Id);
                if (Na__Annotations__State.onPanel) Na__Annotations__State.onPanel();   // <-- Its Leader leaves shows the new place
            }
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Selected Leader's Selected Bend, or -1
    // ------------------------------------------------------------
    function Na__Annotations__SelectedBend(annotation) {
        const b = Na__Annotations__State.bend;
        const count = (annotation && annotation.Annotation__BendsMm || []).length;
        return b && annotation && b.id === annotation.Annotation__Id && b.index < count ? b.index : -1;
    }
    // ------------------------------------------------------------


    // FUNCTION | Drag One Bend Point (selecting it): the spline follows it smoothly
    // ------------------------------------------------------------
    function Na__Annotations__DragBend(sheet, annotation, index, added) {
        Na__Annotations__State.bend = { id: annotation.Annotation__Id, index };
        Na__Surface__RedrawOverlay();
        let moved = false;
        return {
            move(p) {
                moved = true;
                annotation.Annotation__BendsMm[index] = { X: Na__Format__Round(p.X, 1), Y: Na__Format__Round(p.Y, 1) };
                Na__Surface__RedrawLayer('annotations');
                Na__Surface__RedrawOverlay();
            },
            end() {
                if (moved || added) Na__AppState__Touch('annotation', sheet.Sheet__Id);
                if (added && Na__Annotations__State.onPanel) Na__Annotations__State.onPanel();   // <-- Its panel gains Straighten
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Ctrl + Click on a Leader: a new bend point there, in its place along the curve, dragged at once
    // ------------------------------------------------------------
    function Na__Annotations__AddBend(sheet, annotation, mm) {
        const line = Na__Annotations__Leader(annotation);
        if (!line) return null;
        let best = 0, bestD = Infinity;
        line.samples.forEach((s, i) => {
            const d = Math.hypot(s[0] - mm.X, s[1] - mm.Y);
            if (d < bestD) { bestD = d; best = i; }
        });
        const span = line.samples[best][2];                                     // <-- Between point span and span + 1 (0: the words' end)
        if (!Array.isArray(annotation.Annotation__BendsMm)) annotation.Annotation__BendsMm = [];
        annotation.Annotation__BendsMm.splice(span, 0, { X: Na__Format__Round(mm.X, 1), Y: Na__Format__Round(mm.Y, 1) });
        Na__Surface__RedrawLayer('annotations');
        return Na__Annotations__DragBend(sheet, annotation, span, true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove a Bend Point (the selected one when no index is given); false when there was none
    // ------------------------------------------------------------
    function Na__Annotations__RemoveBend(annotation, index) {
        const sheet = Na__Annotations__Sheet();
        const at = Number.isInteger(index) ? index : Na__Annotations__SelectedBend(annotation);
        if (!sheet || !annotation || at < 0 || at >= (annotation.Annotation__BendsMm || []).length) return false;
        annotation.Annotation__BendsMm.splice(at, 1);
        Na__Annotations__State.bend = null;
        Na__AppState__Touch('annotation', sheet.Sheet__Id);
        Na__Surface__RedrawLayer('annotations');
        Na__Surface__RedrawOverlay();
        if (Na__Annotations__State.onPanel) Na__Annotations__State.onPanel();
        return true;
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

        const inks = Na__AppConfig__Get('Annotation__Inks', []).map((i) => ({ value: i.Key, label: i.Label }));
        const ink = Na__Dom__Select(inks, annotation.Annotation__InkKey);
        ink.addEventListener('change', () => { annotation.Annotation__InkKey = ink.value; edited(false); });
        container.appendChild(Na__Dom__Field('Ink', ink));

        // Justify: a row of four, set on the sheet (no rewrite)
        const justify = Na__Dom__El('div', 'aura-field');
        justify.appendChild(Na__Dom__El('span', 'aura-field__label', 'Justify'));       // <-- Not a <label>: a press on it would press the first button
        const aligns = Na__Dom__El('div', 'aura-segmented aura-segmented--justify', null, { role: 'group', 'aria-label': 'Justify the words' });
        const current = annotation.Annotation__Align || 'Left';
        [['Left', 'alignLeft', 'Set left'], ['Centre', 'alignCentre', 'Centred'], ['Right', 'alignRight', 'Set right'], ['Box', 'alignBox', 'Justified to the box: every line but the last as wide as the widest']].forEach(([value, icon, title]) => {
            const b = Na__Dom__IconButton(icon, `aura-segmented__item${value === current ? ' is-active' : ''}`, null, title);
            b.setAttribute('aria-pressed', String(value === current));
            b.addEventListener('click', () => {
                annotation.Annotation__Align = value;
                aligns.querySelectorAll('.aura-segmented__item').forEach((other) => {
                    const on = other === b;
                    other.classList.toggle('is-active', on);
                    other.setAttribute('aria-pressed', String(on));
                });
                edited(false);
            });
            aligns.appendChild(b);
        });
        justify.appendChild(aligns);
        container.appendChild(justify);

        const hands = Na__AppConfig__Get('Handwriting__Hands', []).map((h) => ({ value: h.Key, label: h.Label }));
        const rebuild = () => { if (Na__Annotations__State.onPanel) Na__Annotations__State.onPanel(); };
        const hand = Na__Dom__Select(hands, annotation.Annotation__HandKey);
        hand.addEventListener('change', () => {
            annotation.Annotation__HandKey = hand.value;
            annotation.Annotation__Style = null;                                 // <-- A hand starts afresh: its own settings, nothing left over (Adam's call)
            edited(true);
            rebuild();
        });
        container.appendChild(Na__Dom__Field('Hand', hand));

        const letters = Na__Dom__Select(Na__HandwritingStyle__LettersOptions(), Na__HandwritingStyle__Letters(annotation));
        letters.addEventListener('change', () => { annotation.Annotation__Letters = letters.value; edited(true); rebuild(); });
        container.appendChild(Na__Dom__Field('Letters', letters));

        Na__HandwritingStyle__BuildPen(container, annotation, () => Na__Annotations__Sheet(), () => Na__Surface__PxPerMm(), () => edited(false));   // <-- The pen is applied on the sheet: a redraw, no rewrite

        const copy = Na__Dom__IconButton('refresh', 'aura-button', 'Write a new copy', 'The same words in a different hand-written copy (a new seed)');
        copy.addEventListener('click', () => { annotation.Annotation__Seed = Na__Format__Seed(); edited(true); rebuild(); });
        container.appendChild(copy);

        if (annotation.Annotation__Kind === 'Leader') {
            const PLACES = [
                { value: 'Auto',        label: 'Beside the first line',    place: null },
                { value: 'Bottom:0.1',  label: 'Under the start',          place: { Side: 'Bottom', At: 0.1 } },
                { value: 'Bottom:0.5',  label: 'Under the middle',         place: { Side: 'Bottom', At: 0.5 } },
                { value: 'Bottom:0.9',  label: 'Under the end',            place: { Side: 'Bottom', At: 0.9 } },
                { value: 'Top:0.1',     label: 'Over the start',           place: { Side: 'Top', At: 0.1 } },
                { value: 'Top:0.5',     label: 'Over the middle',          place: { Side: 'Top', At: 0.5 } },
                { value: 'Top:0.9',     label: 'Over the end',             place: { Side: 'Top', At: 0.9 } },
                { value: 'Left:0.5',    label: 'From the left side',       place: { Side: 'Left', At: 0.5 } },
                { value: 'Right:0.5',   label: 'From the right side',      place: { Side: 'Right', At: 0.5 } }
            ];
            const from = annotation.Annotation__LeaderFrom;
            const now = from ? `${from.Side}:${from.At}` : 'Auto';
            const options = PLACES.map((o) => ({ value: o.value, label: o.label }));
            if (!PLACES.some((o) => o.value === now)) options.push({ value: now, label: 'Where dragged' });
            const leaves = Na__Dom__Select(options, now);
            leaves.addEventListener('change', () => {
                const picked = PLACES.find((o) => o.value === leaves.value);
                if (!picked) return;
                annotation.Annotation__LeaderFrom = picked.place ? Object.assign({}, picked.place) : null;
                edited(false);
            });
            container.appendChild(Na__Dom__Field('Leader leaves', leaves));
            container.appendChild(Na__Dom__El('p', 'aura-panel__note', 'Drag the square where the leader meets the words to slide it round them. Drag a point on the leader to bend it. Ctrl + click the leader to add a point; Ctrl + Shift + click a point, or select it and press Delete, to take it out.'));
            if ((annotation.Annotation__BendsMm || []).length) {
                const straighten = Na__Dom__IconButton('refresh', 'aura-button', 'Straighten', 'Take out every bend point: back to one smooth swoop');
                straighten.addEventListener('click', () => { annotation.Annotation__BendsMm = []; Na__Annotations__State.bend = null; edited(false); rebuild(); });
                container.appendChild(straighten);
            }
        }

        // How the ink stands: written, being written, or why it cannot be
        const state = Na__Dom__El('p', 'aura-panel__note aura-ink-state');
        container.appendChild(state);
        const S = Na__Annotations__State;
        const capitals = Na__HandwritingStyle__Letters(annotation) === 'Capitals';
        if (S.writing.has(annotation.Annotation__Id)) {
            const so = S.partial.get(annotation.Annotation__Id);
            state.textContent = Na__Handwriting__Loading()
                ? 'Fetching the handwriting engine (15 MB, once on this device), then writing this note...'
                : so ? `Writing this note: ${so.Lines} line${so.Lines === 1 ? '' : 's'} written...` : 'Writing this note...';
        }
        else if (S.failures.has(annotation.Annotation__Id)) {
            state.textContent = `Shown typed: ${S.failures.get(annotation.Annotation__Id)}`;
            state.classList.add('is-warning');
        } else if (annotation.Annotation__Written && !Na__Handwriting__NeedsWriting(annotation)) {
            const w = annotation.Annotation__Written;
            state.textContent = capitals
                ? `Lettered in architect's capitals.${w.Warnings && w.Warnings.length ? ' ' + w.Warnings.join(' ') : ''}`
                : `Hand-written${w.Seconds ? ` in ${w.Seconds.toFixed(1)} s` : ''}.${w.Warnings && w.Warnings.length ? ' ' + w.Warnings.join(' ') : ''}`;
        } else if (!capitals) {                                                  // <-- Capitals need no engine: never fetch it for them
            Na__Handwriting__Status().then((status) => {
                if (!status.available) { state.textContent = `Shown typed: ${status.reason}`; state.classList.add('is-warning'); }
            });
        }

        Na__HandwritingStyle__BuildAdvanced(container, annotation, (rewrite, again) => { edited(rewrite); if (again) rebuild(); });

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
        Na__Annotations__RemoveBend,
        Na__Annotations__WriteNote
    };

// endregion -------------------------------------------------------------------
