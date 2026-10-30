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
//              annotations draw into; zoom, pan, and the pointer passed to whoever
//              owns what was pressed
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - ONE SVG, viewBox in paper millimetres, shown at 3.2 px/mm times the zoom
//   (the Layout Editor's screen scale) inside a scrolling desk. Fit puts the
//   whole sheet in view.
// - LAYERS, bottom to top: paper and border, viewports, annotations, the title
//   column, and the overlay (selection handles). A module adds its layer with
//   Na__Surface__AddLayer and is asked to draw it on every Na__Surface__Render.
// - THE POINTER: whatever is pressed carries data-hit ("viewport",
//   "annotation", "handle") and an id; the owner registered with Na__Surface__On
//   answers with a drag ({ move(mm, e), end(mm, e) }) or nothing. A press on
//   bare paper goes to "paper". Pressing the middle button, or holding Space,
//   pans the desk instead.
// - ZOOM: Ctrl + wheel about the pointer, or the zoom buttons. The plain wheel
//   scrolls the desk.
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
    import { Na__Dom__Svg, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Clamp } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__Paper__Solve } from './Na__DrawingSheets__Paper__.js';
    import { Na__TitleBlock__Draw } from './Na__DrawingSheets__TitleBlock__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Surface__PX_PER_MM = 3.2;                                         // <-- On screen at zoom 1 (ValeVision 3D's Layout Editor)
    const Na__Surface__ZOOM_MIN  = 0.1;
    const Na__Surface__ZOOM_MAX  = 12;

    const Na__Surface__State = {
        desk      : null,                        // <-- The scrolling host
        svg       : null,
        sheet     : null,
        solve     : null,
        zoom      : 1,
        fitted    : {},                          // <-- sheet id -> true once fitted on first show
        layers    : [],                          // <-- [{ name, draw(group, sheet, solve), group }]
        overlays  : [],                          // <-- draw(group, sheet, solve): selection handles, on top of everything
        overlay   : null,
        handlers  : {},                          // <-- hit kind ('handle:<owner>' for handles) -> (event, mm, element) => drag | null
        drag      : null,
        panning   : null,
        spaceDown : false
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

        if (!S.fitted[sheet.Sheet__Id]) {
            S.fitted[sheet.Sheet__Id] = true;
            requestAnimationFrame(() => Na__Surface__Fit());
        }
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
// REGION | Zoom and Pan
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


    // FUNCTION | Zoom To a Value, Keeping a Point of the Desk Still (the pointer, or the centre)
    // ------------------------------------------------------------
    function Na__Surface__ZoomTo(zoom, clientX, clientY) {
        const S = Na__Surface__State;
        if (!S.solve) return;
        const desk = S.desk;
        const rect = desk.getBoundingClientRect();
        const cx = clientX === undefined ? rect.left + rect.width / 2 : clientX;
        const cy = clientY === undefined ? rect.top + rect.height / 2 : clientY;
        const before = Na__Surface__ClientToMm(cx, cy);
        S.zoom = Na__Format__Clamp(zoom, Na__Surface__ZOOM_MIN, Na__Surface__ZOOM_MAX);
        Na__Surface__ApplyZoom();
        const svgRect = S.svg.getBoundingClientRect();
        const k = Na__Surface__PX_PER_MM * S.zoom;
        desk.scrollLeft += (svgRect.left + before.X * k) - cx;
        desk.scrollTop += (svgRect.top + before.Y * k) - cy;
    }

    function Na__Surface__ZoomBy(factor) {
        Na__Surface__ZoomTo(Na__Surface__State.zoom * factor);
    }
    // ------------------------------------------------------------


    // FUNCTION | Fit the Whole Sheet in the Desk
    // ------------------------------------------------------------
    function Na__Surface__Fit() {
        const S = Na__Surface__State;
        if (!S.solve || !S.desk) return;
        const pad = 48;
        const fit = Math.min((S.desk.clientWidth - pad) / (S.solve.Paper.WidthMm * Na__Surface__PX_PER_MM),
                             (S.desk.clientHeight - pad) / (S.solve.Paper.HeightMm * Na__Surface__PX_PER_MM));
        S.zoom = Na__Format__Clamp(fit > 0 ? fit : 1, Na__Surface__ZOOM_MIN, Na__Surface__ZOOM_MAX);
        Na__Surface__ApplyZoom();
        S.desk.scrollLeft = (S.desk.scrollWidth - S.desk.clientWidth) / 2;
        S.desk.scrollTop = (S.desk.scrollHeight - S.desk.clientHeight) / 2;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Pointer
// -----------------------------------------------------------------------------

    // FUNCTION | Say Who Answers a Press on a Kind of Thing
    // ------------------------------------------------------------
    // kind: 'viewport', 'annotation', 'handle' or 'paper'. handler(event, mm,
    // element) returns a drag ({ move(mm, event), end(mm, event) }) or nothing.
    // ------------------------------------------------------------
    function Na__Surface__On(kind, handler) {
        Na__Surface__State.handlers[kind] = handler;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Wire the Desk: presses, drags, desk panning and the zoom wheel
    // ------------------------------------------------------------
    function Na__Surface__Wire() {
        const S = Na__Surface__State;
        const desk = S.desk;
        desk.addEventListener('pointerdown', (e) => {
            if (!S.sheet) return;
            if (e.button === 1 || (e.button === 0 && S.spaceDown)) {
                S.panning = { x: e.clientX, y: e.clientY, left: desk.scrollLeft, top: desk.scrollTop };
                desk.setPointerCapture(e.pointerId);
                desk.classList.add('is-panning');
                e.preventDefault();
                return;
            }
            if (e.button !== 0) return;
            const mm = Na__Surface__ClientToMm(e.clientX, e.clientY);
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
            if (S.panning) {
                desk.scrollLeft = S.panning.left - (e.clientX - S.panning.x);
                desk.scrollTop = S.panning.top - (e.clientY - S.panning.y);
                return;
            }
            if (S.drag && S.drag.move) S.drag.move(Na__Surface__ClientToMm(e.clientX, e.clientY), e);
        });
        const end = (e) => {
            if (S.panning) {
                S.panning = null;
                desk.classList.remove('is-panning');
            }
            if (S.drag) {
                const drag = S.drag;
                S.drag = null;
                if (drag.end) drag.end(Na__Surface__ClientToMm(e.clientX, e.clientY), e);
            }
            try { desk.releasePointerCapture(e.pointerId); } catch (error) { /* not captured */ }
        };
        desk.addEventListener('pointerup', end);
        desk.addEventListener('pointercancel', end);
        desk.addEventListener('wheel', (e) => {
            if (!e.ctrlKey || !S.sheet) return;                                   // <-- The plain wheel scrolls the desk
            e.preventDefault();
            Na__Surface__ZoomTo(S.zoom * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
        }, { passive: false });
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName || '')) {
                S.spaceDown = true;
                desk.classList.add('is-pan-ready');
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') { S.spaceDown = false; desk.classList.remove('is-pan-ready'); }
        });
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
        Na__Surface__ZoomBy,
        Na__Surface__Fit,
        Na__Surface__Current
    };

// endregion -------------------------------------------------------------------
