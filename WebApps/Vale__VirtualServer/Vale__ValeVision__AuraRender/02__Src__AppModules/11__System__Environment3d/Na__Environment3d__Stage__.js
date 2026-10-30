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
// - NAVIGATION IS THE ENGINE'S (PainterlyNPR 74__Camera__Navigation, through
//   the engine host): ValeVision 3D's orbit mode without its helper cube. Left
//   drag orbits, right drag (or Ctrl / Shift + left) pans, middle drag dollies,
//   the wheel zooms; one finger orbits, two pinch and pan; W A S D, the arrows,
//   Q and E move the camera, R resets it, + - 0 zoom. Its keys live only while
//   this tab is open. Zoom moves the camera, never a magnified page (Adam).
// - RENDERED OR PROXY: the toolbar's switch (and Shift + R) keeps the live view
//   a quick proxy preview to work in, or lets it refine into pen and wash when
//   the camera rests - the engine's own work mode. Remembered per viewer. The
//   sheets' pictures are always rendered.
// - SAVED VIEWS are named copies of the live camera and its Art Direction
//   Points, kept in the drawing set; a 3D viewport on a sheet shows one (or one
//   of the engine's presets). Picking one loads both; saving under a name in
//   use replaces that view.
// - THE PANEL folds by section (Saved views, Art direction points, Parameters),
//   each remembered in this browser, and its left edge drags it wider or
//   narrower (Na__AppUtils__Panels__, after ValeVision 3D's Layout Editor).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.3.0 (AURA 0.3.0)
// - The panel's three folding sections and its resize grip; Art direction
//   points (Na__Environment3d__ArtDirection__) over the drawing, the canvas in
//   a wrapper that holds the engine's point layer; saved views carry their
//   points and show which one is being edited; a click on bare drawing lets
//   the selected point go (the navigation's OnTap).
//
// 30-Oct-2026 - Version 1.2.0 (AURA 0.2.2)
// - The Rendered / Proxy switch in the toolbar, and Shift + R (Adam: "Add
//   toggle to aura for proxy view / rendered view ... add the hotkey shift + R").
//
// 30-Oct-2026 - Version 1.1.0 (AURA 0.1.3)
// - The canvas's own orbit and zoom handlers gave way to the engine's
//   navigation (Na__EngineHost__AttachNavigation): pan, dolly, touch and
//   keys as ValeVision 3D's, the preset buttons lit as the camera moves.
//
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
    import { Na__Panels__Section, Na__Panels__Resizable } from '../03__AppUtils/Na__AppUtils__Panels__.js';
    import {
        Na__EngineHost__Presets, Na__EngineHost__ApplyPreset, Na__EngineHost__SetCamera, Na__EngineHost__Camera,
        Na__EngineHost__AttachNavigation, Na__EngineHost__NewSeed, Na__EngineHost__Redraw, Na__EngineHost__SceneCounts,
        Na__EngineHost__WorkMode, Na__EngineHost__SetWorkMode, Na__EngineHost__Points, Na__EngineHost__RefreshPoints
    } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__DrawingSet__NewSavedView, Na__DrawingSet__CleanPoints } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';
    import { Na__Parameters__Build, Na__Parameters__Sync } from './Na__Environment3d__Parameters__.js';
    import {
        Na__ArtDirection3d__Mount, Na__ArtDirection3d__Show, Na__ArtDirection3d__SetOpen, Na__ArtDirection3d__UseView,
        Na__ArtDirection3d__LeaveView, Na__ArtDirection3d__FollowCamera, Na__ArtDirection3d__Owner, Na__ArtDirection3d__Adopt,
        Na__ArtDirection3d__Keep, Na__ArtDirection3d__OnTap
    } from './Na__Environment3d__ArtDirection__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Environment3d__State = {
        root       : null,
        canvas     : null,
        presetBar  : null,
        viewsList  : null,
        stage      : null,                       // <-- The room the drawing is fitted into
        navigation : null                        // <-- The engine's navigation on the canvas: { Detach, Home }
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Camera by Hand
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Hand the Canvas to the Engine's Navigation
    // ------------------------------------------------------------
    // Its keys act only while this tab is open: a sheet tab's V, N and L, and
    // its arrows, are the sheet's. A press takes the keyboard from a panel
    // control, so W A S D move the camera rather than type into the last box.
    // ------------------------------------------------------------
    function Na__Environment3d__WireCanvas(canvas) {
        canvas.addEventListener('pointerdown', () => canvas.focus({ preventScroll: true }), true);
        Na__Environment3d__State.navigation = Na__EngineHost__AttachNavigation(canvas, {
            Active  : () => Na__AppState__Data.tab === 'environment',
            OnMove  : () => Na__Environment3d__MarkPreset(),
            OnReset : () => Na__Environment3d__MarkPreset(),
            OnTap   : () => Na__ArtDirection3d__OnTap()                          // <-- A click on bare drawing lets the point being edited go
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Light the Preset the Camera Is On (none once it has moved)
    // ------------------------------------------------------------
    // Every camera move passes here, so it is also where a saved view being
    // edited is left once the camera moves off it (its points come along).
    // ------------------------------------------------------------
    function Na__Environment3d__MarkPreset() {
        Na__ArtDirection3d__FollowCamera();
        const bar = Na__Environment3d__State.presetBar;
        if (!bar) return;
        const current = Na__EngineHost__Camera().Preset;
        bar.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('is-active', b.dataset.preset === current));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendered or Proxy
// -----------------------------------------------------------------------------

    const Na__Environment3d__WORK_MODE_STORE = 'AuraRender.WorkMode';          // <-- This viewer's choice, as PainterlyNPR keeps its own


    // FUNCTION | Set the Live View's Work Mode: 'Rendered' or 'Proxy'
    // ------------------------------------------------------------
    function Na__Environment3d__SetWorkMode(mode, remember) {
        const now = Na__EngineHost__SetWorkMode(mode === 'Proxy' ? 'Proxy' : 'Rendered');
        const bar = Na__Environment3d__State.presetBar;
        if (bar) bar.querySelectorAll('[data-work-mode]').forEach((b) => {
            const on = b.dataset.workMode === now;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
        });
        if (remember === false) return now;
        try { window.localStorage.setItem(Na__Environment3d__WORK_MODE_STORE, now); }
        catch (error) { /* a blocked store: the mode still switches, it is just not remembered */ }
        return now;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Switch in the Toolbar, Shift + R, and This Viewer's Last Choice
    // ------------------------------------------------------------
    // Shift + R is taken in the capture phase, ahead of the engine's navigation,
    // whose R alone resets the camera: a key taken here is passed over there.
    // ------------------------------------------------------------
    function Na__Environment3d__WireWorkMode(bar) {
        const group = Na__Dom__El('div', 'aura-segmented', null, { role: 'group', 'aria-label': 'Rendered or proxy view' });
        [['Rendered', 'Rendered', 'Draw the pen and wash when the camera rests (Shift + R)'],
         ['Proxy', 'Proxy', 'Keep the quick proxy preview while you work: the renderer never kicks in (Shift + R)']].forEach(([mode, label, title]) => {
            const b = Na__Dom__El('button', 'aura-segmented__item', label, { type: 'button', title, dataset: { workMode: mode }, 'aria-pressed': 'false' });
            b.addEventListener('click', () => Na__Environment3d__SetWorkMode(mode));
            group.appendChild(b);
        });
        bar.appendChild(group);

        window.addEventListener('keydown', (e) => {
            if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || (e.key || '').toLowerCase() !== 'r') return;
            if (Na__AppState__Data.tab !== 'environment' || e.repeat) return;
            const focus = document.activeElement;
            if (focus && (/^(INPUT|TEXTAREA|SELECT)$/.test(focus.tagName) || focus.isContentEditable)) return;
            e.preventDefault();
            const now = Na__Environment3d__SetWorkMode(Na__EngineHost__WorkMode() === 'Proxy' ? 'Rendered' : 'Proxy');
            Na__Toast__Show(now === 'Proxy' ? 'Proxy view: the quick preview, no pen and wash (Shift + R to render)' : 'Rendered view: pen and wash when the camera rests');
        }, true);

        let saved = null;
        try { saved = window.localStorage.getItem(Na__Environment3d__WORK_MODE_STORE); } catch (error) { saved = null; }
        Na__Environment3d__SetWorkMode(saved === 'Proxy' ? 'Proxy' : 'Rendered', false);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Saved Views
// -----------------------------------------------------------------------------

    // FUNCTION | Draw the Saved Views List (the one whose points are being edited is lit)
    // ------------------------------------------------------------
    function Na__Environment3d__RenderViews() {
        const list = Na__Environment3d__State.viewsList;
        const doc = Na__AppState__Data.doc;
        if (!list || !doc) return;
        Na__Dom__Clear(list);
        const views = doc.AuraDrawingSet__SavedViews || [];
        if (!views.length) {
            list.appendChild(Na__Dom__El('p', 'aura-views__empty', 'No saved views yet. Frame the drawing, then save it here for a 3D viewport on a sheet. Its art direction points are saved with it.'));
            return;
        }
        const editing = Na__ArtDirection3d__Owner();
        views.forEach((view) => {
            const on = view.View__Id === editing;
            const count = (view.View__Points || []).length;
            const row = Na__Dom__El('div', `aura-views__row${on ? ' is-active' : ''}`);
            const show = Na__Dom__El('button', 'aura-views__name', null, { type: 'button', 'aria-pressed': String(on),
                                                                           title: on ? 'Its points are the ones being edited' : 'Show this view, with its art direction points' });
            show.appendChild(Na__Dom__El('span', 'aura-views__label', view.View__Name));
            if (count) show.appendChild(Na__Dom__El('span', 'aura-views__count', `${count} point${count === 1 ? '' : 's'}`));
            show.addEventListener('click', () => {
                Na__EngineHost__SetCamera(view.View__Camera, 'Custom');
                Na__ArtDirection3d__UseView(view);
                Na__Environment3d__MarkPreset();
                Na__Environment3d__RenderViews();
            });
            const remove = Na__Dom__IconButton('trash', 'aura-icon-button aura-icon-button--quiet', null, `Delete "${view.View__Name}"`);
            remove.addEventListener('click', () => {
                const used = (doc.AuraDrawingSet__Sheets || []).some((s) => s.Sheet__Viewports.some((v) => v.Viewport__CameraSource && v.Viewport__CameraSource.SavedViewId === view.View__Id));
                if (used && !window.confirm(`"${view.View__Name}" is shown on a sheet. Delete it anyway? That viewport falls back to the three-quarter view.`)) return;
                if (on) Na__ArtDirection3d__LeaveView();                         // <-- Its points stay on the drawing, now the unsaved view's
                doc.AuraDrawingSet__SavedViews = (doc.AuraDrawingSet__SavedViews || []).filter((v) => v !== view);
                Na__AppState__Touch('views');
                Na__Environment3d__RenderViews();
            });
            row.appendChild(show);
            row.appendChild(remove);
            list.appendChild(row);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Save the Live Camera and Its Points as a Named View
    // ------------------------------------------------------------
    // A name already in use (any case) replaces that view, camera and points,
    // after asking: its id stays, so every sheet showing it follows. Either
    // way the saved view is then the one being edited.
    // ------------------------------------------------------------
    function Na__Environment3d__SaveView(name) {
        const doc = Na__AppState__Data.doc;
        if (!doc) return null;
        Na__ArtDirection3d__Keep();
        const clean = String(name || '').trim() || `View ${(doc.AuraDrawingSet__SavedViews || []).length + 1}`;
        const camera = Na__EngineHost__Camera().Camera;
        const points = Na__EngineHost__Points();
        const same = (doc.AuraDrawingSet__SavedViews || []).find((v) => v.View__Name.toLowerCase() === clean.toLowerCase());
        let view = null;
        if (same) {
            if (!window.confirm(`Replace "${same.View__Name}" with the camera and points as they are now? Every sheet showing it follows.`)) return null;
            same.View__Camera = JSON.parse(JSON.stringify(camera));
            same.View__Points = Na__DrawingSet__CleanPoints(points);
            view = same;
        } else {
            view = Na__DrawingSet__NewSavedView(clean, camera, points);
            doc.AuraDrawingSet__SavedViews.push(view);
        }
        Na__ArtDirection3d__Adopt(view);
        Na__AppState__Touch('views');
        Na__Environment3d__RenderViews();
        Na__Toast__Show(same ? `Replaced "${view.View__Name}": its camera and points are as they are now.` : `Saved "${clean}". Add it to a sheet as a 3D viewport.`);
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
    // short window letterboxes the drawing instead of stretching it. The point
    // layer over it is drawn again at the new size.
    // ------------------------------------------------------------
    function Na__Environment3d__Fit() {
        const S = Na__Environment3d__State;
        const stage = S.stage;
        if (!stage || !S.canvas) return;
        const style = window.getComputedStyle(stage);
        const w = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const h = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        if (w <= 0 || h <= 0) return;
        const aspect = S.canvas.width / S.canvas.height || 1.5;
        const width = Math.floor(Math.min(w, h * aspect));
        S.canvas.style.width = `${width}px`;
        S.canvas.style.height = `${Math.floor(width / aspect)}px`;
        if (Na__AppState__Data.tab === 'environment') Na__EngineHost__RefreshPoints();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Canvas's Wrapper: the canvas and the engine's point layer over it
    // ------------------------------------------------------------
    // index.html has it; a page from before it gets one made round the canvas
    // (moving a canvas keeps its WebGL context).
    // ------------------------------------------------------------
    function Na__Environment3d__SheetWrap(canvas) {
        let wrap = canvas.closest('[data-env-sheet]');
        if (wrap) return wrap;
        wrap = Na__Dom__El('div', 'aura-env__sheet', null, { dataset: { envSheet: '' } });
        canvas.parentElement.insertBefore(wrap, canvas);
        wrap.appendChild(canvas);
        return wrap;
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
        const sheetWrap = Na__Environment3d__SheetWrap(canvas);
        S.stage = sheetWrap.parentElement;
        Na__Environment3d__WireCanvas(canvas);
        if (window.ResizeObserver && S.stage) new ResizeObserver(() => Na__Environment3d__Fit()).observe(S.stage);

        // Toolbar: the presets, a new seed, then Rendered or Proxy
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
        Na__Environment3d__WireWorkMode(bar);

        // Side panel: three folding sections - saved views, their art direction
        // points, the parameters - and a grip on its left edge to resize it
        const panel = root.querySelector('[data-env-panel]');
        Na__Dom__Clear(panel);
        Na__Environment3d__WirePanelGrip(root, panel);

        const views = Na__Panels__Section(panel, { id: 'env-views', title: 'Saved views' });
        const form = Na__Dom__El('form', 'aura-views__form');
        const input = Na__Dom__El('input', 'aura-input', null, { type: 'text', placeholder: 'Name this view', maxlength: 60, 'aria-label': 'Name for the saved view' });
        const add = Na__Dom__IconButton('camera', 'aura-button aura-button--primary', 'Save view', 'Save the camera and its art direction points as they are now (a name in use replaces that view)');
        add.type = 'submit';
        form.appendChild(input);
        form.appendChild(add);
        form.addEventListener('submit', (e) => { e.preventDefault(); Na__Environment3d__SaveView(input.value); input.value = ''; });
        views.body.appendChild(form);
        S.viewsList = Na__Dom__El('div', 'aura-views__list');
        views.body.appendChild(S.viewsList);

        const points = Na__Panels__Section(panel, { id: 'env-points', title: 'Art direction points', onToggle: (open) => Na__ArtDirection3d__SetOpen(open) });
        Na__ArtDirection3d__Mount(points, sheetWrap, canvas, () => Na__Environment3d__RenderViews());

        const params = Na__Panels__Section(panel, { id: 'env-params', title: 'Parameters' });
        const holder = Na__Dom__El('div', 'aura-params');
        params.body.appendChild(holder);
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


    // HELPER FUNCTION | The Panel's Resize Grip (on its left edge), Made Round the Panel
    // ------------------------------------------------------------
    // The tab's grid reads --aura-env-panel-width; the drawing refits as the
    // stage changes size (its ResizeObserver).
    // ------------------------------------------------------------
    function Na__Environment3d__WirePanelGrip(root, panel) {
        let column = panel.closest('.aura-column');
        if (!column) {
            column = Na__Dom__El('div', 'aura-column aura-column--right');
            panel.parentElement.insertBefore(column, panel);
            column.appendChild(panel);
        }
        let grip = column.querySelector('.aura-grip');
        if (!grip) {
            grip = Na__Dom__El('div', 'aura-grip');
            column.insertBefore(grip, panel);
        }
        const w = Na__AppConfig__Get('Panels__WidthPx', {});
        Na__Panels__Resizable({ grip, panel: column, host: root, cssVar: '--aura-env-panel-width', side: 'right', id: 'env-panel', label: 'settings',
                                min: w.Min || 240, max: w.Max || 640, initial: w.Environment || 340 });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Tab Is Shown Again: bring the live drawing back (stills, or a sheet's viewport, borrowed the engine)
    // ------------------------------------------------------------
    function Na__Environment3d__Show() {
        Na__ArtDirection3d__Show();                                             // <-- First: a sheet's viewport gives the engine back
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
