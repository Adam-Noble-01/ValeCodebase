// =============================================================================
// VALEVISION AURA - DRAWING SHEETS - THE SHEET SURFACE
// =============================================================================
//
// FILE       : Na__DrawingSheets__Surface__.js
// NAMESPACE  : Na__Surface
// MODULE     : Drawing Sheets - Surface
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The open sheet as one SVG in paper millimetres: the paper, the
//              border and the Vale title column, with layers the viewports and the
//              annotations draw into; its zoom, and the pointer passed to whoever
//              owns what was pressed
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - ONE SVG, viewBox in paper millimetres, shown at 3.2 px/mm times the zoom
//   (the Layout Editor's screen scale) inside a scrolling desk.
// - LAYERS, bottom to top: paper and border, viewports, annotations, the title
//   column, and the overlay (selection handles). A module adds its layer with
//   Na__Surface__AddLayer and is asked to draw it on every Na__Surface__Render.
// - THE POINTER: whatever is pressed carries data-hit ("viewport",
//   "annotation", "handle") and an id; the owner registered with Na__Surface__On
//   answers with a drag ({ move(mm, e), end(mm, e) }) or nothing. A press on
//   bare paper goes to "paper", a press on the grey desk to "desk".
// - NAVIGATION IS NOT HERE: the Layout Editor's, ported (Navigation, the PC
//   and touchscreen controls, the key map). They listen on the desk first; a
//   press they take arrives here with preventDefault, and while a pan or a
//   pinch holds the sheet (SetSuppressed) no press is a tool's.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.1.0 (AURA 0.1.3)
// - Zoom, fit, the middle-button and Space pans and the wheel moved out to the
//   Layout Editor's navigation (Na__DrawingSheets__Navigation__ and its two
//   control modules). This module keeps the zoom value (GetZoom, SetZoom) and
//   gains SetSuppressed, a "desk" press for the grey round the paper, and a
//   second finger that is never a tool's.
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__Dom__Svg, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Paper__Solve } from './Na__DrawingSheets__Paper__.js';
    import { Na__TitleBlock__Draw } from './Na__DrawingSheets__TitleBlock__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Surface__PX_PER_MM = 3.2;                                         // <-- On screen at zoom 1 (ValeVision 3D's Layout Editor)

    const Na__Surface__State = {
        desk       : null,                       // <-- The scrolling host
        svg        : null,
        sheet      : null,
        solve      : null,
        zoom       : 1,
        layers     : [],                         // <-- [{ name, draw(group, sheet, solve), group }]
        overlays   : [],                         // <-- draw(group, sheet, solve): selection handles, on top of everything
        overlay    : null,
        handlers   : {},                         // <-- hit kind ('handle:<owner>' for handles) -> (event, mm, element) => drag | null
        drag       : null,
        lastMm     : null,                       // <-- Where the drag last was: a suppressed drag ends there
        suppressed : false                       // <-- A pan or a pinch holds the sheet: no press is a tool's
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Coordinates
// -----------------------------------------------------------------------------

    // FUNCTION | A Pointer's Position on the Paper, in Millimetres
    // ------------------------------------------------------------
    function Na__Surface__ClientToMm(clientX, clientY) {
        const svg = Na__Surface__State.svg;
        const m = svg && svg.getScreenCTM();
        if (!m) return { X: 0, Y: 0 };
        const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
        return { X: p.x, Y: p.y };
    }
    // ------------------------------------------------------------


    // FUNCTION | Screen Pixels per Paper Millimetre Now (for handle sizes and hit slack)
    // ------------------------------------------------------------
    function Na__Surface__PxPerMm() {
        return Na__Surface__PX_PER_MM * Na__Surface__State.zoom;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Layers and Rendering
// -----------------------------------------------------------------------------

    // FUNCTION | Add a Layer (drawn in the order added, between the paper and the title column)
    // ------------------------------------------------------------
    function Na__Surface__AddLayer(name, draw) {
        Na__Surface__State.layers.push({ name, draw, group: null });
    }

    function Na__Surface__Layer(name) {
        const layer = Na__Surface__State.layers.find((l) => l.name === name);
        return layer ? layer.group : null;
    }

    // An overlay drawer: selection handles, drawn over the title column too
    function Na__Surface__AddOverlay(draw) {
        Na__Surface__State.overlays.push(draw);
    }

    function Na__Surface__RedrawOverlay() {
        const S = Na__Surface__State;
        if (!S.overlay || !S.sheet) return;
        Na__Dom__Clear(S.overlay);
        S.overlays.forEach((draw) => { try { draw(S.overlay, S.sheet, S.solve); } catch (error) { console.error('[AURA Surface] The overlay failed:', error); } });
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Whole Sheet
    // ------------------------------------------------------------
    function Na__Surface__Render(sheet) {
        const S = Na__Surface__State;
        if (!S.svg) return;
        S.sheet = sheet || null;
        Na__Dom__Clear(S.svg);
        if (!sheet) return;
        const solve = Na__Paper__Solve(sheet);
        S.solve = solve;
        const w = solve.Paper.WidthMm, h = solve.Paper.HeightMm;
        S.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        Na__Surface__ApplyZoom();

        // Paper and border
        const paper = Na__Dom__Svg('g', { class: 'aura-sheet__paper' }, S.svg);
        Na__Dom__Svg('rect', { x: 0, y: 0, width: w, height: h, fill: '#ffffff', 'data-hit': 'paper' }, paper);
        Na__Dom__Svg('rect', { x: solve.Border.X, y: solve.Border.Y, width: solve.Border.W, height: solve.Border.H,
                               fill: 'none', stroke: '#111111', 'stroke-width': Na__AppConfig__Get('Sheet__LineWidthMm', 0.25), 'pointer-events': 'none' }, paper);

        // The modules' layers, then the title column, then the overlay on top
        S.layers.forEach((layer) => {
            layer.group = Na__Dom__Svg('g', { class: `aura-sheet__layer aura-sheet__layer--${layer.name}` }, S.svg);
            try { layer.draw(layer.group, sheet, solve); } catch (error) { console.error(`[AURA Surface] The ${layer.name} layer failed:`, error); }
        });
        const title = Na__Dom__Svg('g', { class: 'aura-sheet__title', 'pointer-events': 'none' }, S.svg);
        Na__TitleBlock__Draw(title, sheet, solve);
        S.overlay = Na__Dom__Svg('g', { class: 'aura-sheet__layer aura-sheet__layer--overlay' }, S.svg);
        Na__Surface__RedrawOverlay();
    }
    // ------------------------------------------------------------


    // FUNCTION | Redraw One Layer Only (a picture arrived, a note moved)
    // ------------------------------------------------------------
    function Na__Surface__RedrawLayer(name) {
        const S = Na__Surface__State;
        const layer = S.layers.find((l) => l.name === name);
        if (!layer || !layer.group || !S.sheet) return;
        Na__Dom__Clear(layer.group);
        try { layer.draw(layer.group, S.sheet, S.solve); } catch (error) { console.error(`[AURA Surface] The ${name} layer failed:`, error); }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Zoom
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Size the SVG for the Zoom
    // ------------------------------------------------------------
    function Na__Surface__ApplyZoom() {
        const S = Na__Surface__State;
        if (!S.svg || !S.solve) return;
        const k = Na__Surface__PX_PER_MM * S.zoom;
        S.svg.setAttribute('width', Math.round(S.solve.Paper.WidthMm * k));
        S.svg.setAttribute('height', Math.round(S.solve.Paper.HeightMm * k));
        S.desk.style.setProperty('--aura-zoom', S.zoom);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Zoom Now, and Setting It (Na__DrawingSheets__Navigation__ clamps and keeps the point still)
    // ------------------------------------------------------------
    function Na__Surface__GetZoom() {
        return Na__Surface__State.zoom;
    }

    function Na__Surface__SetZoom(zoom) {
        if (!Number.isFinite(zoom) || zoom <= 0) return;
        Na__Surface__State.zoom = zoom;
        Na__Surface__ApplyZoom();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Elements Navigation Moves: { desk, svg, solve }
    // ------------------------------------------------------------
    function Na__Surface__Elements() {
        const S = Na__Surface__State;
        return { desk: S.desk, svg: S.svg, solve: S.solve };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Pointer
// -----------------------------------------------------------------------------

    // FUNCTION | Say Who Answers a Press on a Kind of Thing
    // ------------------------------------------------------------
    // kind: 'viewport', 'annotation', 'handle', 'paper' or 'desk' (the grey
    // round the paper). handler(event, mm, element) returns a drag
    // ({ move(mm, event), end(mm, event) }) or nothing.
    // ------------------------------------------------------------
    function Na__Surface__On(kind, handler) {
        Na__Surface__State.handlers[kind] = handler;
    }
    // ------------------------------------------------------------


    // FUNCTION | Hold the Sheet's Tools Off While a Pan or a Pinch Has It
    // ------------------------------------------------------------
    // Raised by the navigation's controls for the length of a pan that took the
    // left button and of any two-finger gesture. A drag already under way (the
    // first finger of a pinch) ends where it last was, so nothing is left half
    // moved.
    // ------------------------------------------------------------
    function Na__Surface__SetSuppressed(flag) {
        const S = Na__Surface__State;
        S.suppressed = !!flag;
        if (!S.suppressed || !S.drag) return;
        const drag = S.drag;
        S.drag = null;
        if (drag.end) drag.end(S.lastMm || { X: 0, Y: 0 }, null);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wire the Desk: presses and drags (navigation is the controls')
    // ------------------------------------------------------------
    function Na__Surface__Wire() {
        const S = Na__Surface__State;
        const desk = S.desk;
        desk.addEventListener('pointerdown', (e) => {
            if (!S.sheet || e.button !== 0 || !e.isPrimary) return;                // <-- A second finger is the navigation's, never a tool's
            if (e.defaultPrevented || S.suppressed) return;                       // <-- A pan took this press
            if (!S.svg.contains(e.target)) {                                      // <-- The grey desk: nothing to place or move there
                if (S.handlers.desk) S.handlers.desk(e);
                return;
            }
            const mm = Na__Surface__ClientToMm(e.clientX, e.clientY);
            S.lastMm = mm;
            const hit = e.target.closest ? e.target.closest('[data-hit]') : null;
            let kind = hit ? hit.getAttribute('data-hit') : 'paper';
            if (kind === 'handle') kind = `handle:${hit.getAttribute('data-owner') || ''}`;
            const handler = S.handlers[kind] || S.handlers.paper;
            let drag = handler ? handler(e, mm, hit) : null;
            if (!drag && handler !== S.handlers.paper && S.handlers.paper) drag = S.handlers.paper(e, mm, null);   // <-- Nothing to do with what was pressed (a note tool over a viewport): the paper's turn
            if (drag) {
                S.drag = drag;
                desk.setPointerCapture(e.pointerId);
                e.preventDefault();
            }
        });
        desk.addEventListener('pointermove', (e) => {
            if (!S.drag || !e.isPrimary) return;
            S.lastMm = Na__Surface__ClientToMm(e.clientX, e.clientY);
            if (S.drag.move) S.drag.move(S.lastMm, e);
        });
        const end = (e) => {
            if (!e.isPrimary) return;
            if (S.drag) {
                const drag = S.drag;
                S.drag = null;
                if (drag.end) drag.end(Na__Surface__ClientToMm(e.clientX, e.clientY), e);
            }
            try { desk.releasePointerCapture(e.pointerId); } catch (error) { /* not captured */ }
        };
        desk.addEventListener('pointerup', end);
        desk.addEventListener('pointercancel', end);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount
// -----------------------------------------------------------------------------

    // FUNCTION | Mount the Surface in Its Desk
    // ------------------------------------------------------------
    function Na__Surface__Mount(desk) {
        const S = Na__Surface__State;
        S.desk = desk;
        const wrap = document.createElement('div');
        wrap.className = 'aura-sheet__wrap';
        S.svg = Na__Dom__Svg('svg', { class: 'aura-sheet', role: 'img', 'aria-label': 'The drawing sheet' });
        wrap.appendChild(S.svg);
        desk.appendChild(wrap);
        Na__Surface__Wire();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Sheet and Its Solve Now
    // ------------------------------------------------------------
    function Na__Surface__Current() {
        return { sheet: Na__Surface__State.sheet, solve: Na__Surface__State.solve, svg: Na__Surface__State.svg };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Surface__Mount,
        Na__Surface__Render,
        Na__Surface__RedrawLayer,
        Na__Surface__AddLayer,
        Na__Surface__Layer,
        Na__Surface__AddOverlay,
        Na__Surface__RedrawOverlay,
        Na__Surface__On,
        Na__Surface__ClientToMm,
        Na__Surface__PxPerMm,
        Na__Surface__GetZoom,
        Na__Surface__SetZoom,
        Na__Surface__Elements,
        Na__Surface__SetSuppressed,
        Na__Surface__Current
    };

// endregion -------------------------------------------------------------------
