// =============================================================================
// VALEVISION AURA - VIEWPORTS - ON THE SHEET
// =============================================================================
//
// FILE       : Na__Viewports__Editor__.js
// NAMESPACE  : Na__ViewportEditor
// MODULE     : Viewports - Editor
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Draw a sheet's viewports (the engine's pictures, clipped to their
//              frames, with their titles), and let them be added, moved, resized,
//              panned and set up
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - A SCALED VIEW (elevation, roof plan) shows the engine's still at its true
//   300 x 200 mm, centred in the frame; the frame crops it. Resizing a frame
//   crops more or less of the same drawing, which stays put on the sheet (its
//   centre in the world follows the frame's centre). Alt + drag inside it pans
//   the view. Its frame can be no larger than the engine's sheet.
// - A 3D VIEW is a picture: it fills its frame, cropped to the frame's shape.
// - Drag a viewport to move it; drag a handle to resize it; Delete removes it.
// - The pictures come from the render queue; until one arrives its frame shows
//   "Drawing in pen and wash".
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
    import { Na__AppState__Data, Na__AppState__Select, Na__AppState__Touch, Na__AppState__On } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El, Na__Dom__Svg, Na__Dom__Field, Na__Dom__Select, Na__Dom__IconButton } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Format__Clamp, Na__Format__Round } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__EngineHost__Presets, Na__EngineHost__Camera } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__Paper__Solve, Na__Paper__ClampFrame } from '../20__System__DrawingSheets/Na__DrawingSheets__Paper__.js';
    import { Na__Surface__AddLayer, Na__Surface__AddOverlay, Na__Surface__On, Na__Surface__RedrawLayer, Na__Surface__RedrawOverlay, Na__Surface__PxPerMm } from '../20__System__DrawingSheets/Na__DrawingSheets__Surface__.js';
    import { Na__DrawingSet__NewViewport, Na__DrawingSet__NewSavedView, Na__DrawingSet__Viewport } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';
    import { Na__Views__IsScaled, Na__Views__Title, Na__Views__ScaleLabel, Na__Views__MaxScaledFrame, Na__Views__Pan } from './Na__Viewports__Views__.js';
    import { Na__RenderQueue__Picture, Na__RenderQueue__Request } from './Na__Viewports__RenderQueue__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__ViewportEditor__HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const Na__ViewportEditor__State = { failures: new Map() };                 // <-- viewport id -> the last drawing error

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing the Layer
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Sheet Open Now and Its Selected Viewport
    // ------------------------------------------------------------
    function Na__ViewportEditor__Selected(sheet) {
        const sel = Na__AppState__Data.selection;
        return sel && sel.kind === 'viewport' ? Na__DrawingSet__Viewport(sheet, sel.id) : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw One Viewport: its picture (or a placeholder), its frame, its title
    // ------------------------------------------------------------
    function Na__ViewportEditor__DrawOne(parent, defs, viewport, doc) {
        const f = viewport.Viewport__FrameMm;
        const id = viewport.Viewport__Id;
        const g = Na__Dom__Svg('g', { class: 'aura-vp', 'data-hit': 'viewport', 'data-id': id }, parent);
        const clip = Na__Dom__Svg('clipPath', { id: `aura-clip-${id}` }, defs);
        Na__Dom__Svg('rect', { x: f.X, y: f.Y, width: f.WidthMm, height: f.HeightMm }, clip);
        const inner = Na__Dom__Svg('g', { 'clip-path': `url(#aura-clip-${id})`, class: 'aura-vp__inner' }, g);
        Na__Dom__Svg('rect', { x: f.X, y: f.Y, width: f.WidthMm, height: f.HeightMm, fill: '#ffffff' }, inner);   // <-- Something to press while it draws

        const picture = Na__RenderQueue__Picture(viewport, doc);
        if (picture) {
            const image = Na__Dom__Svg('image', {}, inner);
            if (Na__Views__IsScaled(viewport)) {
                const max = Na__Views__MaxScaledFrame();
                const cx = f.X + f.WidthMm / 2, cy = f.Y + f.HeightMm / 2;
                Object.entries({ x: cx - max.WidthMm / 2, y: cy - max.HeightMm / 2, width: max.WidthMm, height: max.HeightMm, preserveAspectRatio: 'none' })
                      .forEach(([k, v]) => image.setAttribute(k, String(v)));
            } else {
                Object.entries({ x: f.X, y: f.Y, width: f.WidthMm, height: f.HeightMm, preserveAspectRatio: 'xMidYMid slice' })
                      .forEach(([k, v]) => image.setAttribute(k, String(v)));
            }
            image.setAttribute('href', picture.url);
            image.setAttribute('class', 'aura-vp__picture');
        } else {
            const failure = Na__ViewportEditor__State.failures.get(id);
            Na__Dom__Svg('rect', { x: f.X, y: f.Y, width: f.WidthMm, height: f.HeightMm, class: 'aura-vp__placeholder' }, inner);
            const words = Na__Dom__Svg('text', { x: f.X + f.WidthMm / 2, y: f.Y + f.HeightMm / 2, 'text-anchor': 'middle', class: 'aura-vp__placeholder-text',
                                                 'font-size': Na__Format__Clamp(Math.min(f.WidthMm, f.HeightMm) / 12, 2.5, 6) }, inner);
            words.textContent = failure ? 'This view could not be drawn' : 'Drawing in pen and wash...';
            if (!failure) {
                Na__RenderQueue__Request(viewport, doc, (pic, error) => {
                    if (error) Na__ViewportEditor__State.failures.set(id, error.message || String(error));
                    else Na__ViewportEditor__State.failures.delete(id);
                    if (Na__AppState__Data.tab !== 'environment') Na__Surface__RedrawLayer('viewports');
                });
            }
        }
        Na__Dom__Svg('rect', { x: f.X, y: f.Y, width: f.WidthMm, height: f.HeightMm, class: 'aura-vp__frame' }, g);

        if (viewport.Viewport__ShowTitle !== false) {
            const size = Na__AppConfig__Get('Viewport__TitleSizeMm', 4);
            const y = f.Y + f.HeightMm + Na__AppConfig__Get('Viewport__TitleGapMm', 3) + size;
            const text = Na__Dom__Svg('text', { x: f.X, y, 'font-size': size, class: 'aura-vp__title' }, g);
            const name = Na__Dom__Svg('tspan', { 'font-weight': 600 }, text);
            name.textContent = Na__Views__Title(viewport, doc);
            const scale = Na__Views__ScaleLabel(viewport);
            if (scale) {
                const s = Na__Dom__Svg('tspan', { dx: size * 0.8, 'font-weight': 400, class: 'aura-vp__scale' }, text);
                s.textContent = scale;
            }
        }
        return g;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Viewports Layer
    // ------------------------------------------------------------
    function Na__ViewportEditor__DrawLayer(group, sheet) {
        const defs = Na__Dom__Svg('defs', {}, group);
        (sheet.Sheet__Viewports || []).forEach((v) => Na__ViewportEditor__DrawOne(group, defs, v, Na__AppState__Data.doc));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Selected Viewport's Handles (the overlay)
    // ------------------------------------------------------------
    function Na__ViewportEditor__DrawOverlay(group, sheet) {
        const viewport = Na__ViewportEditor__Selected(sheet);
        if (!viewport) return;
        const f = viewport.Viewport__FrameMm;
        const k = 1 / Na__Surface__PxPerMm();                                    // <-- Millimetres per screen pixel: handles keep their size on screen
        Na__Dom__Svg('rect', { x: f.X, y: f.Y, width: f.WidthMm, height: f.HeightMm, class: 'aura-select-frame', 'stroke-width': 1.5 * k, 'pointer-events': 'none' }, group);
        const size = 9 * k;
        Na__ViewportEditor__HANDLES.forEach((h) => {
            const x = h.includes('w') ? f.X : h.includes('e') ? f.X + f.WidthMm : f.X + f.WidthMm / 2;
            const y = h.includes('n') ? f.Y : h.includes('s') ? f.Y + f.HeightMm : f.Y + f.HeightMm / 2;
            Na__Dom__Svg('rect', { x: x - size / 2, y: y - size / 2, width: size, height: size, class: `aura-handle aura-handle--${h}`,
                                   'stroke-width': 1.2 * k, 'data-hit': 'handle', 'data-owner': 'viewport', 'data-handle': h }, group);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pointer: Select, Move, Pan, Resize
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Sheet Being Edited (the workspace's)
    // ------------------------------------------------------------
    function Na__ViewportEditor__Sheet() {
        const d = Na__AppState__Data;
        return d.doc ? (d.doc.AuraDrawingSet__Sheets || []).find((s) => s.Sheet__Id === d.tab) || null : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Press on a Viewport: select it, then move it (Alt pans a scaled view)
    // ------------------------------------------------------------
    function Na__ViewportEditor__OnPress(event, mm, element) {
        if (Na__AppState__Data.tool !== 'select') return null;
        const sheet = Na__ViewportEditor__Sheet();
        const viewport = Na__DrawingSet__Viewport(sheet, element.getAttribute('data-id'));
        if (!viewport) return null;
        Na__AppState__Select('viewport', viewport.Viewport__Id);
        const start = { X: mm.X, Y: mm.Y, frame: Object.assign({}, viewport.Viewport__FrameMm) };
        let moved = false;

        if (event.altKey && Na__Views__IsScaled(viewport)) {
            const image = element.querySelector('.aura-vp__picture');
            return {
                move(p) {
                    moved = true;
                    if (image) image.setAttribute('transform', `translate(${p.X - start.X} ${p.Y - start.Y})`);
                },
                end(p) {
                    if (!moved) return;
                    Na__Views__Pan(viewport, p.X - start.X, p.Y - start.Y);
                    Na__AppState__Touch('viewport', sheet.Sheet__Id);
                    Na__Surface__RedrawLayer('viewports');
                }
            };
        }
        return {
            move(p) {
                moved = true;
                const frame = Na__Paper__ClampFrame(sheet, Object.assign({}, start.frame, { X: start.frame.X + p.X - start.X, Y: start.frame.Y + p.Y - start.Y }));
                viewport.Viewport__FrameMm.X = Na__Format__Round(frame.X, 1);
                viewport.Viewport__FrameMm.Y = Na__Format__Round(frame.Y, 1);
                element.setAttribute('transform', `translate(${viewport.Viewport__FrameMm.X - start.frame.X} ${viewport.Viewport__FrameMm.Y - start.frame.Y})`);
                Na__Surface__RedrawOverlay();
            },
            end() {
                if (!moved) return;
                Na__AppState__Touch('viewport', sheet.Sheet__Id);
                Na__Surface__RedrawLayer('viewports');
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | A Press on a Handle: resize the frame (a scaled view keeps its drawing put)
    // ------------------------------------------------------------
    function Na__ViewportEditor__OnHandle(event, mm, element) {
        const sheet = Na__ViewportEditor__Sheet();
        const viewport = Na__ViewportEditor__Selected(sheet);
        if (!viewport) return null;
        const h = element.getAttribute('data-handle');
        const start = { X: mm.X, Y: mm.Y, frame: Object.assign({}, viewport.Viewport__FrameMm) };
        const min = Na__AppConfig__Get('Viewport__MinFrameMm', 20);
        const max = Na__Views__IsScaled(viewport) ? Na__Views__MaxScaledFrame() : { WidthMm: 2000, HeightMm: 2000 };
        let moved = false;
        return {
            move(p) {
                moved = true;
                const dx = p.X - start.X, dy = p.Y - start.Y, s = start.frame;
                let x0 = s.X, y0 = s.Y, x1 = s.X + s.WidthMm, y1 = s.Y + s.HeightMm;
                if (h.includes('w')) x0 = Na__Format__Clamp(x0 + dx, x1 - max.WidthMm, x1 - min);
                if (h.includes('e')) x1 = Na__Format__Clamp(x1 + dx, x0 + min, x0 + max.WidthMm);
                if (h.includes('n')) y0 = Na__Format__Clamp(y0 + dy, y1 - max.HeightMm, y1 - min);
                if (h.includes('s')) y1 = Na__Format__Clamp(y1 + dy, y0 + min, y0 + max.HeightMm);
                Object.assign(viewport.Viewport__FrameMm, { X: Na__Format__Round(x0, 1), Y: Na__Format__Round(y0, 1), WidthMm: Na__Format__Round(x1 - x0, 1), HeightMm: Na__Format__Round(y1 - y0, 1) });
                const clip = document.querySelector(`#aura-clip-${viewport.Viewport__Id} rect`);
                if (clip) ['x', 'y', 'width', 'height'].forEach((k, i) => clip.setAttribute(k, String([x0, y0, x1 - x0, y1 - y0][i])));
                Na__Surface__RedrawOverlay();
            },
            end() {
                if (!moved) return;
                const f = viewport.Viewport__FrameMm, s = start.frame;
                if (Na__Views__IsScaled(viewport)) {
                    const dcx = (f.X + f.WidthMm / 2) - (s.X + s.WidthMm / 2), dcy = (f.Y + f.HeightMm / 2) - (s.Y + s.HeightMm / 2);
                    if (dcx || dcy) Na__Views__Pan(viewport, -dcx, -dcy);            // <-- The frame's centre moved: the world under it follows, so the drawing stays put
                }
                Na__AppState__Touch('viewport', sheet.Sheet__Id);
                Na__Surface__RedrawLayer('viewports');
                Na__Surface__RedrawOverlay();
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Adding and Removing
// -----------------------------------------------------------------------------

    // FUNCTION | Add a Viewport to the Open Sheet, in the Middle of Its Drawing Space
    // ------------------------------------------------------------
    // kind: 'Elevation' (side), 'Plan' or 'Perspective' (preset, savedViewId, or
    // live: true to save the 3D Environment's camera as a view and show it).
    // ------------------------------------------------------------
    function Na__ViewportEditor__Add(options) {
        const sheet = Na__ViewportEditor__Sheet();
        const doc = Na__AppState__Data.doc;
        if (!sheet || !doc) return null;
        const o = Object.assign({}, options);
        if (o.kind === 'Perspective' && o.live) {
            const view = Na__DrawingSet__NewSavedView(`View ${doc.AuraDrawingSet__SavedViews.length + 1}`, Na__EngineHost__Camera().Camera);
            doc.AuraDrawingSet__SavedViews.push(view);
            o.savedViewId = view.View__Id;
        }
        const solve = Na__Paper__Solve(sheet);
        const scaled = o.kind === 'Elevation' || o.kind === 'Plan';
        const space = { W: solve.Border.W - (solve.Title.Portrait ? 0 : solve.Title.Rect.W), H: solve.Border.H - (solve.Title.Portrait ? solve.Title.Rect.H : 0) };
        const w = Math.min(scaled ? 220 : 180, space.W - 20), h = Math.min(scaled ? 160 : 120, space.H - 20);
        const offset = (sheet.Sheet__Viewports.length % 5) * 8;                  // <-- A new one steps down and right of the last, so none hides another
        o.frame = Na__Paper__ClampFrame(sheet, { X: solve.Border.X + (space.W - w) / 2 + offset, Y: solve.Border.Y + (space.H - h) / 2 + offset, WidthMm: w, HeightMm: h });
        const viewport = Na__DrawingSet__NewViewport(o);
        sheet.Sheet__Viewports.push(viewport);
        Na__AppState__Touch('viewport', sheet.Sheet__Id);
        Na__AppState__Select('viewport', viewport.Viewport__Id);
        Na__Surface__RedrawLayer('viewports');
        Na__Surface__RedrawOverlay();
        return viewport;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove the Selected Viewport
    // ------------------------------------------------------------
    function Na__ViewportEditor__Remove(viewport) {
        const sheet = Na__ViewportEditor__Sheet();
        if (!sheet || !viewport) return;
        sheet.Sheet__Viewports = sheet.Sheet__Viewports.filter((v) => v !== viewport);
        Na__AppState__Select(null);
        Na__AppState__Touch('viewport', sheet.Sheet__Id);
        Na__Surface__RedrawLayer('viewports');
        Na__Surface__RedrawOverlay();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Viewport Panel
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Selected Viewport's Settings Into a Panel
    // ------------------------------------------------------------
    function Na__ViewportEditor__Panel(container, viewport) {
        const sheet = Na__ViewportEditor__Sheet();
        const doc = Na__AppState__Data.doc;
        const changed = (redrawPicture) => {
            Na__AppState__Touch('viewport', sheet.Sheet__Id);
            Na__Surface__RedrawLayer('viewports');
            Na__Surface__RedrawOverlay();
            if (redrawPicture) Na__ViewportEditor__State.failures.delete(viewport.Viewport__Id);
        };
        const kindLabel = { Elevation: 'Elevation (to scale)', Plan: 'Roof plan (to scale)', Perspective: '3D view' }[viewport.Viewport__Kind];
        container.appendChild(Na__Dom__El('h2', 'aura-panel__title', 'Viewport'));
        container.appendChild(Na__Dom__El('p', 'aura-panel__note', kindLabel));

        const title = Na__Dom__El('input', 'aura-input', null, { type: 'text', maxlength: 80, placeholder: Na__Views__Title(Object.assign({}, viewport, { Viewport__Title: '' }), doc) });
        title.value = viewport.Viewport__Title || '';
        title.addEventListener('input', () => { viewport.Viewport__Title = title.value; changed(false); });
        container.appendChild(Na__Dom__Field('Title', title));

        const show = Na__Dom__El('input', null, null, { type: 'checkbox' });
        show.checked = viewport.Viewport__ShowTitle !== false;
        show.addEventListener('change', () => { viewport.Viewport__ShowTitle = show.checked; changed(false); });
        const showRow = Na__Dom__El('label', 'aura-check');
        showRow.appendChild(show);
        showRow.appendChild(Na__Dom__El('span', null, 'Show the title and scale under the view'));
        container.appendChild(showRow);

        if (viewport.Viewport__Kind === 'Elevation') {
            const sides = Na__AppConfig__Get('Viewport__Elevations', []).map((e) => ({ value: e.Key, label: e.Label }));
            const side = Na__Dom__Select(sides, viewport.Viewport__Side);
            side.addEventListener('change', () => { viewport.Viewport__Side = side.value; viewport.Viewport__CentreM = null; changed(true); });
            container.appendChild(Na__Dom__Field('Side', side));
        }
        if (Na__Views__IsScaled(viewport)) {
            const scales = Na__AppConfig__Get('Viewport__Scales', [50, 100]).map((d) => ({ value: d, label: `1:${d}` }));
            const scale = Na__Dom__Select(scales, viewport.Viewport__ScaleDenominator);
            scale.addEventListener('change', () => { viewport.Viewport__ScaleDenominator = Number(scale.value); changed(true); });
            container.appendChild(Na__Dom__Field('Scale', scale));
            const profile = Na__Dom__Select([{ value: 'Measured', label: 'Measured (a natural pen at most)' }, { value: 'Concept', label: 'Concept (the full discipline)' }], viewport.Viewport__Profile);
            profile.addEventListener('change', () => { viewport.Viewport__Profile = profile.value; changed(true); });
            container.appendChild(Na__Dom__Field('Pen', profile));
            const centre = Na__Dom__IconButton('fit', 'aura-button', 'Centre on the building', 'Put the building back in the middle of the frame');
            centre.addEventListener('click', () => { viewport.Viewport__CentreM = null; changed(true); });
            container.appendChild(centre);
            container.appendChild(Na__Dom__El('p', 'aura-panel__hint', 'Alt and drag inside the frame to pan the drawing. A scaled view is at most 300 x 200 mm: the engine draws one sheet that size, its pen widths true on the paper.'));
        } else {
            const views = Na__EngineHost__Presets(Na__AppConfig__Get('Engine__CameraPresets')).filter((p) => p.Mode !== 'Ortho').map((p) => ({ value: `preset:${p.Key}`, label: p.Label }))
                .concat((doc.AuraDrawingSet__SavedViews || []).map((v) => ({ value: `view:${v.View__Id}`, label: `Saved: ${v.View__Name}` })));
            const source = viewport.Viewport__CameraSource || {};
            const current = source.SavedViewId ? `view:${source.SavedViewId}` : `preset:${source.Preset || 'ThreeQuarter'}`;
            const pick = Na__Dom__Select(views, current);
            pick.addEventListener('change', () => {
                const [type, key] = pick.value.split(':');
                viewport.Viewport__CameraSource = type === 'view' ? { SavedViewId: key } : { Preset: key };
                changed(true);
            });
            container.appendChild(Na__Dom__Field('View', pick));
            const live = Na__Dom__IconButton('camera', 'aura-button', 'Use the 3D Environment\'s view', 'Save the camera as it is in the 3D Environment and show it here');
            live.addEventListener('click', () => {
                const view = Na__DrawingSet__NewSavedView(`View ${doc.AuraDrawingSet__SavedViews.length + 1}`, Na__EngineHost__Camera().Camera);
                doc.AuraDrawingSet__SavedViews.push(view);
                viewport.Viewport__CameraSource = { SavedViewId: view.View__Id };
                changed(true);
                container.dispatchEvent(new CustomEvent('aura-panel-refresh', { bubbles: true }));
            });
            container.appendChild(live);
        }

        const size = Na__Dom__El('div', 'aura-field-pair');
        ['WidthMm', 'HeightMm'].forEach((key) => {
            const max = Na__Views__IsScaled(viewport) ? Na__Views__MaxScaledFrame()[key] : 2000;
            const input = Na__Dom__El('input', 'aura-input aura-input--number', null, { type: 'number', min: Na__AppConfig__Get('Viewport__MinFrameMm', 20), max, step: 1 });
            input.value = Math.round(viewport.Viewport__FrameMm[key]);
            input.addEventListener('change', () => {
                const value = Na__Format__Clamp(Number(input.value) || 0, Na__AppConfig__Get('Viewport__MinFrameMm', 20), max);
                viewport.Viewport__FrameMm = Na__Paper__ClampFrame(sheet, Object.assign({}, viewport.Viewport__FrameMm, { [key]: value }));
                input.value = Math.round(viewport.Viewport__FrameMm[key]);
                changed(false);
            });
            size.appendChild(Na__Dom__Field(key === 'WidthMm' ? 'Width (mm)' : 'Height (mm)', input));
        });
        container.appendChild(size);

        const remove = Na__Dom__IconButton('trash', 'aura-button aura-button--danger', 'Delete viewport');
        remove.addEventListener('click', () => Na__ViewportEditor__Remove(viewport));
        container.appendChild(remove);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount
// -----------------------------------------------------------------------------

    // FUNCTION | Join the Surface: the layer, the handles, the presses
    // ------------------------------------------------------------
    function Na__ViewportEditor__Mount() {
        Na__Surface__AddLayer('viewports', Na__ViewportEditor__DrawLayer);
        Na__Surface__AddOverlay(Na__ViewportEditor__DrawOverlay);
        Na__Surface__On('viewport', Na__ViewportEditor__OnPress);
        Na__Surface__On('handle:viewport', Na__ViewportEditor__OnHandle);
        Na__AppState__On('select', () => Na__Surface__RedrawOverlay());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__ViewportEditor__Mount,
        Na__ViewportEditor__Add,
        Na__ViewportEditor__Remove,
        Na__ViewportEditor__Panel,
        Na__ViewportEditor__Selected
    };

// endregion -------------------------------------------------------------------
