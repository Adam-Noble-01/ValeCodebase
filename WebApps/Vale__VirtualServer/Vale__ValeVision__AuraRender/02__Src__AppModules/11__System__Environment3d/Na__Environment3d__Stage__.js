// =============================================================================
// VALEVISION AURA - 3D ENVIRONMENT - THE STAGE
// =============================================================================
//
// FILE       : Na__Environment3d__Stage__.js
// NAMESPACE  : Na__Environment3d
// MODULE     : 3D Environment - Stage
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The 3D Environment tab: the engine's live drawing of the scene,
//              orbited and zoomed by hand, its camera presets, saved views for the
//              sheets' 3D viewports, a new seed, and the parameters beside it
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE DRAWING IS THE ENGINE'S OWN CANVAS (300 x 200 mm at 5 px/mm), shown
//   whole in the stage at its 3:2 shape. While the camera moves the engine shows
//   its navigation preview; when it rests it refines into pen and wash.
// - ZOOM MOVES THE CAMERA (Adam: "zoom the viewport" means the camera, never a
//   magnified page): the wheel, + and -, as in PainterlyNPR.
// - SAVED VIEWS are named copies of the live camera, kept in the drawing set;
//   a 3D viewport on a sheet shows one (or one of the engine's presets).
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
    import { Na__AppState__Data, Na__AppState__Touch, Na__AppState__On } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__IconButton, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';
    import {
        Na__EngineHost__Presets, Na__EngineHost__ApplyPreset, Na__EngineHost__SetCamera, Na__EngineHost__Camera,
        Na__EngineHost__Orbit, Na__EngineHost__Zoom, Na__EngineHost__NewSeed, Na__EngineHost__Redraw, Na__EngineHost__SceneCounts
    } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__DrawingSet__NewSavedView } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';
    import { Na__Parameters__Build, Na__Parameters__Sync } from './Na__Environment3d__Parameters__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Environment3d__ZOOM_STEP = 180;                                   // <-- One press of + or -: about a quarter nearer or further (PainterlyNPR's step)

    const Na__Environment3d__State = {
        root      : null,
        canvas    : null,
        presetBar : null,
        viewsList : null,
        drag      : null
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Camera by Hand
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Orbit With a Drag, Zoom With the Wheel and the Keys
    // ------------------------------------------------------------
    function Na__Environment3d__WireCanvas(canvas) {
        canvas.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            canvas.setPointerCapture(e.pointerId);
            Na__Environment3d__State.drag = { x: e.clientX, y: e.clientY, moved: false };
            canvas.focus({ preventScroll: true });
        });
        canvas.addEventListener('pointermove', (e) => {
            const drag = Na__Environment3d__State.drag;
            if (!drag) return;
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (!dx && !dy) return;
            drag.x = e.clientX;
            drag.y = e.clientY;
            drag.moved = true;
            Na__EngineHost__Orbit(dx, dy);
            Na__Environment3d__MarkPreset();
        });
        const end = (e) => {
            if (!Na__Environment3d__State.drag) return;
            try { canvas.releasePointerCapture(e.pointerId); } catch (error) { /* already released */ }
            Na__Environment3d__State.drag = null;
        };
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            Na__EngineHost__Zoom(e.deltaY);
            Na__Environment3d__MarkPreset();
        }, { passive: false });
        canvas.addEventListener('keydown', (e) => {
            if (e.key === '+' || e.key === '=') { Na__EngineHost__Zoom(-Na__Environment3d__ZOOM_STEP); Na__Environment3d__MarkPreset(); e.preventDefault(); }
            else if (e.key === '-' || e.key === '_') { Na__EngineHost__Zoom(Na__Environment3d__ZOOM_STEP); Na__Environment3d__MarkPreset(); e.preventDefault(); }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Light the Preset the Camera Is On (none once it has moved)
    // ------------------------------------------------------------
    function Na__Environment3d__MarkPreset() {
        const bar = Na__Environment3d__State.presetBar;
        if (!bar) return;
        const current = Na__EngineHost__Camera().Preset;
        bar.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('is-active', b.dataset.preset === current));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Saved Views
// -----------------------------------------------------------------------------

    // FUNCTION | Draw the Saved Views List
    // ------------------------------------------------------------
    function Na__Environment3d__RenderViews() {
        const list = Na__Environment3d__State.viewsList;
        const doc = Na__AppState__Data.doc;
        if (!list || !doc) return;
        Na__Dom__Clear(list);
        const views = doc.AuraDrawingSet__SavedViews || [];
        if (!views.length) {
            list.appendChild(Na__Dom__El('p', 'aura-views__empty', 'No saved views yet. Frame the drawing, then save it here for a 3D viewport on a sheet.'));
            return;
        }
        views.forEach((view) => {
            const row = Na__Dom__El('div', 'aura-views__row');
            const show = Na__Dom__El('button', 'aura-views__name', view.View__Name, { type: 'button', title: 'Show this view' });
            show.addEventListener('click', () => {
                Na__EngineHost__SetCamera(view.View__Camera, 'Custom');
                Na__Environment3d__MarkPreset();
            });
            const remove = Na__Dom__IconButton('trash', 'aura-icon-button aura-icon-button--quiet', null, `Delete "${view.View__Name}"`);
            remove.addEventListener('click', () => {
                const used = (doc.AuraDrawingSet__Sheets || []).some((s) => s.Sheet__Viewports.some((v) => v.Viewport__CameraSource && v.Viewport__CameraSource.SavedViewId === view.View__Id));
                if (used && !window.confirm(`"${view.View__Name}" is shown on a sheet. Delete it anyway? That viewport falls back to the three-quarter view.`)) return;
                doc.AuraDrawingSet__SavedViews = views.filter((v) => v !== view);
                Na__AppState__Touch('views');
                Na__Environment3d__RenderViews();
            });
            row.appendChild(show);
            row.appendChild(remove);
            list.appendChild(row);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Save the Live Camera as a Named View
    // ------------------------------------------------------------
    function Na__Environment3d__SaveView(name) {
        const doc = Na__AppState__Data.doc;
        if (!doc) return null;
        const clean = String(name || '').trim() || `View ${(doc.AuraDrawingSet__SavedViews || []).length + 1}`;
        const view = Na__DrawingSet__NewSavedView(clean, Na__EngineHost__Camera().Camera);
        doc.AuraDrawingSet__SavedViews.push(view);
        Na__AppState__Touch('views');
        Na__Environment3d__RenderViews();
        Na__Toast__Show(`Saved "${clean}". Add it to a sheet as a 3D viewport.`);
        return view;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount and Show
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fit the Engine's Sheet Whole in the Stage, at Its 3:2 Shape
    // ------------------------------------------------------------
    // Sized in pixels from the stage's room (a ResizeObserver), so a narrow or
    // short window letterboxes the drawing instead of stretching it.
    // ------------------------------------------------------------
    function Na__Environment3d__Fit() {
        const S = Na__Environment3d__State;
        const stage = S.canvas && S.canvas.parentElement;
        if (!stage) return;
        const style = window.getComputedStyle(stage);
        const w = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const h = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        if (w <= 0 || h <= 0) return;
        const aspect = S.canvas.width / S.canvas.height || 1.5;
        const width = Math.floor(Math.min(w, h * aspect));
        S.canvas.style.width = `${width}px`;
        S.canvas.style.height = `${Math.floor(width / aspect)}px`;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Tab Around the Engine's Canvas
    // ------------------------------------------------------------
    // root holds the page's skeleton (index.html): the toolbar, the stage with the
    // canvas, the side panel and the status line. This fills them in.
    // ------------------------------------------------------------
    function Na__Environment3d__Mount(root, canvas) {
        const S = Na__Environment3d__State;
        S.root = root;
        S.canvas = canvas;
        canvas.tabIndex = 0;
        Na__Environment3d__WireCanvas(canvas);
        if (window.ResizeObserver && canvas.parentElement) new ResizeObserver(() => Na__Environment3d__Fit()).observe(canvas.parentElement);

        // Toolbar: the presets, then a new seed
        const bar = root.querySelector('[data-env-toolbar]');
        S.presetBar = bar;
        Na__Dom__Clear(bar);
        const presets = Na__Dom__El('div', 'aura-segmented', null, { role: 'group', 'aria-label': 'Camera presets' });
        Na__EngineHost__Presets(Na__AppConfig__Get('Engine__CameraPresets')).forEach((p) => {
            const b = Na__Dom__El('button', 'aura-segmented__item', p.Label, { type: 'button', dataset: { preset: p.Key }, title: p.Mode === 'Ortho' ? 'An orthographic elevation' : 'A perspective view' });
            b.addEventListener('click', () => { Na__EngineHost__ApplyPreset(p.Key); Na__Environment3d__MarkPreset(); });
            presets.appendChild(b);
        });
        bar.appendChild(presets);
        const seed = Na__Dom__IconButton('dice', 'aura-button', 'New seed', 'Every stroke, wash and grain is seeded: a new seed is a new hand, the same building');
        seed.addEventListener('click', () => { Na__EngineHost__NewSeed(); Na__Parameters__Sync(); });
        bar.appendChild(seed);

        // Side panel: saved views, then the parameters
        const panel = root.querySelector('[data-env-panel]');
        Na__Dom__Clear(panel);
        const views = Na__Dom__El('section', 'aura-panel__section');
        views.appendChild(Na__Dom__El('h2', 'aura-panel__title', 'Saved views'));
        const form = Na__Dom__El('form', 'aura-views__form');
        const input = Na__Dom__El('input', 'aura-input', null, { type: 'text', placeholder: 'Name this view', maxlength: 60, 'aria-label': 'Name for the saved view' });
        const add = Na__Dom__IconButton('camera', 'aura-button aura-button--primary', 'Save view', 'Save the camera as it is now');
        add.type = 'submit';
        form.appendChild(input);
        form.appendChild(add);
        form.addEventListener('submit', (e) => { e.preventDefault(); Na__Environment3d__SaveView(input.value); input.value = ''; });
        views.appendChild(form);
        S.viewsList = Na__Dom__El('div', 'aura-views__list');
        views.appendChild(S.viewsList);
        panel.appendChild(views);

        const params = Na__Dom__El('section', 'aura-panel__section');
        params.appendChild(Na__Dom__El('h2', 'aura-panel__title', 'Parameters'));
        const holder = Na__Dom__El('div', 'aura-params');
        params.appendChild(holder);
        panel.appendChild(params);
        Na__Parameters__Build(holder);

        // The scene line under the stage
        const scene = root.querySelector('[data-env-scene]');
        if (scene) {
            const counts = Na__EngineHost__SceneCounts();
            scene.textContent = `${Na__AppConfig__Get('Scene__DemoLabel', 'Demo scene')}${counts ? ` (${counts.Objects} objects, ${counts.Edges} edges)` : ''}`;
            scene.title = Na__AppConfig__Get('Scene__DemoNote', '');
        }

        Na__Environment3d__RenderViews();
        Na__Environment3d__MarkPreset();
        Na__AppState__On('saved', () => Na__Environment3d__RenderViews());
    }
    // ------------------------------------------------------------


    // FUNCTION | The Tab Is Shown Again: bring the live drawing back (stills borrowed the engine)
    // ------------------------------------------------------------
    function Na__Environment3d__Show() {
        requestAnimationFrame(() => Na__Environment3d__Fit());                  // <-- The stage has its size once shown
        Na__EngineHost__Redraw();
        Na__Parameters__Sync();
        Na__Environment3d__MarkPreset();
        Na__Environment3d__RenderViews();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Environment3d__Mount,
        Na__Environment3d__Show,
        Na__Environment3d__SaveView,
        Na__Environment3d__RenderViews
    };

// endregion -------------------------------------------------------------------
