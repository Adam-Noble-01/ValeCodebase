// =============================================================================
// VALEVISION AURA - 3D ENVIRONMENT - CAMERAS
// =============================================================================
//
// FILE       : Na__Environment3d__Cameras__.js
// NAMESPACE  : Na__Cameras
// MODULE     : 3D Environment - Cameras
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The 3D Environment's Cameras section: the lens, as ValeVision
//              3D's, and the elevation planes (shown, snapped, each scene's
//              cut typed in)
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - ASKED BY ADAM (30-Oct-2026, a screenshot of the panel with the room under
//   its sections ringed): "Add a Cameras tab ... adjust camera lense angle same
//   as ValeVision 3D ... show elevation camera planes, switches on the
//   elevation camera planes alowing you to reposition them".
// - THE LENS IS VALEVISION 3D'S (11__CameraUtils/Na__UiFeature__CameraLens__
//   Controls.js and its config's cameraLens): a focal length on a full-frame
//   sensor, 24 mm high, from 24 to 75 mm in whole millimetres, turned into the
//   camera's vertical field of view (the engine's FovY: its 30 degrees is a
//   45 mm lens, ValeVision's default). Its lesson kept: the readout shows the
//   camera's real focal length, even outside the slider's range, and follows
//   the camera however it changed (a scene, a preset, an undo). The readout is
//   typed into like every parameter's. A change is a camera move: the open
//   scene's tab stays lit and Update from camera keeps it. An elevation or the
//   roof plan is to scale and has no lens: the slider rests.
// - THE ELEVATION PLANES (Na__Environment3d__DrawingPlanes__, TrueVision 3D's
//   drawing planes): one switch shows them all over the drawing (Adam's pick:
//   no switch per plane); Snap and its step (10 to 500 mm, kept in this
//   browser, as TrueVision keeps them); and a row a plane, the elevations and
//   the roof plan in the tabs' order, each in its plane's colour with its
//   position typed in millimetres along its own direction from the model's
//   origin (a height, for the roof plan). Cleared, or the cross, is not cut.
// - A CUT IS THE SCENE'S (View__CutM): a typed value or a drag is saved, is one
//   step in the history, and every viewport of the scene follows. The open
//   scene's live camera follows too (the Stage's onCut).
// - CUT ELEVATIONS AT THE BUILDING (Adam, 30-Oct-2026: "UPDATE THE ASSOCIATE
//   SCENES FOR THROWER SO THEY HAVE THE CORRECT CUTS ASSIGNED", then "Offset
//   the cut 50mm infrtont of box plane"; the roof plan not cut): one press
//   sets every elevation's cut 50 mm (Cameras__CutAtBuildingM) in front of the
//   face of the building's box, measured from the building drawn now (the
//   engine's demo cottage, or a project's whitecard once it is drawn), the
//   same box the planes are sized from. The roof plan is left as it is. One
//   step in the history.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.5.6)
// - Initial build, with Cut elevations at the building.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__Touch } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__Clear } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';
    import { Na__PlaneMath__FormatMm, Na__PlaneMath__StepInList } from '../03__AppUtils/Na__AppUtils__PlaneMaths__.js';
    import { Na__EngineHost__Camera, Na__EngineHost__SetCamera, Na__EngineHost__BuildingBounds } from '../10__System__EngineHost/Na__EngineHost__PainterlyNpr__.js';
    import { Na__Views__CutM, Na__Views__SetCut, Na__Views__SceneNormal } from '../21__System__Viewports/Na__Viewports__Views__.js';
    import { Na__Parameters__TypeIn } from './Na__Environment3d__Parameters__.js';
    import {
        Na__DrawingPlanes__Show, Na__DrawingPlanes__Shown, Na__DrawingPlanes__Redraw, Na__DrawingPlanes__OnChange, Na__DrawingPlanes__Scenes,
        Na__DrawingPlanes__Colour, Na__DrawingPlanes__Snap, Na__DrawingPlanes__SetSnap, Na__DrawingPlanes__Increments
    } from './Na__Environment3d__DrawingPlanes__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Cameras__State = {
        section  : null,                         // <-- The panel section: { body, meta, ... }
        open     : false,                        // <-- Its body is showing: the watch runs
        tick     : 0,
        onCut    : null,                         // <-- A scene's cut changed: the open scene's live camera follows (the Stage)
        lens     : null,                         // <-- { row, input, output, note }
        lensKey  : '',                           // <-- The camera the lens last read
        show     : null,                         // <-- The planes' switch
        snap     : null,                         // <-- { toggle, value }
        rows     : null,                         // <-- Where a row a plane goes
        rowsKey  : ''                            // <-- The rows as last drawn: drawn again only when a plane scene comes, goes, is renamed or moved
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Lens (ValeVision 3D's)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Lens's Settings: { MinMm, MaxMm, StepMm, SensorHeightMm }
    // ------------------------------------------------------------
    function Na__Cameras__LensConfig() {
        return Object.assign({ MinMm: 24, MaxMm: 75, StepMm: 1, SensorHeightMm: 24 }, Na__AppConfig__Get('Cameras__Lens', {}) || {});
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Focal Length to Vertical Field of View, and Back (ValeVision 3D's)
    // ------------------------------------------------------------
    function Na__Cameras__FocalToFov(focalMm, sensorMm) {
        return 2 * Math.atan(sensorMm / (2 * focalMm)) * 180 / Math.PI;
    }

    function Na__Cameras__FovToFocal(fovDeg, sensorMm) {
        return sensorMm / (2 * Math.tan(fovDeg * Math.PI / 360));
    }
    // ------------------------------------------------------------


    // FUNCTION | Put a Lens on the Live Camera (a perspective only)
    // ------------------------------------------------------------
    function Na__Cameras__ApplyLens(focalMm) {
        const S = Na__Cameras__State;
        const camera = Na__EngineHost__Camera().Camera;
        if (camera.Mode === 'Ortho' || !(focalMm > 0)) return;
        camera.FovY = Na__Cameras__FocalToFov(focalMm, Na__Cameras__LensConfig().SensorHeightMm);
        Na__EngineHost__SetCamera(camera, 'Custom');
        if (S.lens) S.lens.output.textContent = `${Math.round(focalMm)} mm`;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Lens Reads the Live Camera Again (only when it has changed)
    // ------------------------------------------------------------
    // The slider is held to its range, the readout is not: a camera from
    // elsewhere may have a lens outside it, and the readout tells the truth.
    // ------------------------------------------------------------
    function Na__Cameras__SyncLens() {
        const S = Na__Cameras__State;
        if (!S.lens || S.lens.output.hidden) return;                             // <-- Hidden: a value is being typed
        const camera = Na__EngineHost__Camera().Camera;
        const ortho = camera.Mode === 'Ortho';
        const key = `${camera.Mode}|${camera.FovY}`;
        if (key === S.lensKey) return;
        S.lensKey = key;
        const cfg = Na__Cameras__LensConfig();
        S.lens.input.disabled = ortho;
        S.lens.row.classList.toggle('is-disabled', ortho);
        S.lens.output.tabIndex = ortho ? -1 : 0;
        if (ortho) {
            S.lens.output.textContent = 'To scale';
            S.lens.note.textContent = 'An elevation or the roof plan is drawn to scale, with no lens. Open a 3D scene or a preset to set one.';
            return;
        }
        const focal = Na__Cameras__FovToFocal(Number(camera.FovY) || 30, cfg.SensorHeightMm);
        S.lens.input.value = String(Math.min(cfg.MaxMm, Math.max(cfg.MinMm, Math.round(focal))));
        S.lens.output.textContent = `${Math.round(focal)} mm`;
        S.lens.note.textContent = `A full-frame camera's focal length, as ValeVision 3D's: ${cfg.MinMm} mm wide to ${cfg.MaxMm} mm long. Like an orbit, Update from camera keeps it in the open scene.`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Lens: a slider row as the parameters', its readout typed into
    // ------------------------------------------------------------
    function Na__Cameras__BuildLens(parent) {
        const S = Na__Cameras__State;
        const cfg = Na__Cameras__LensConfig();
        const group = Na__Dom__El('div', 'aura-cameras__group');
        group.appendChild(Na__Dom__El('h3', 'aura-cameras__heading', 'Lens'));
        const row = Na__Dom__El('label', 'aura-param aura-cameras__lens');
        row.appendChild(Na__Dom__El('span', 'aura-param__label', 'Focal length'));
        const input = Na__Dom__El('input', 'aura-param__range', null, { type: 'range', min: cfg.MinMm, max: cfg.MaxMm, step: cfg.StepMm, 'aria-label': 'Focal length' });
        const output = Na__Dom__El('output', 'aura-param__readout', '', { tabindex: '0', title: 'Click to type a focal length' });
        const control = { Label: 'Focal length', Parse: (text) => parseFloat(String(text).replace(/mm/i, '').trim()) };
        input.addEventListener('input', () => Na__Cameras__ApplyLens(parseFloat(input.value)));
        output.addEventListener('click', (event) => {
            event.preventDefault();                                              // <-- The label would hand the click to the slider
            if (!input.disabled) Na__Parameters__TypeIn(input, output, control);
        });
        output.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== 'F2') return;
            event.preventDefault();
            if (!input.disabled) Na__Parameters__TypeIn(input, output, control);
        });
        row.appendChild(input);
        row.appendChild(output);
        group.appendChild(row);
        const note = Na__Dom__El('p', 'aura-fold__hint aura-cameras__note');
        group.appendChild(note);
        parent.appendChild(group);
        S.lens = { row, input, output, note };
        S.lensKey = '';
        Na__Cameras__SyncLens();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Elevation Planes
// -----------------------------------------------------------------------------

    // FUNCTION | Set a Scene's Cut (metres, or null for not cut): saved, a step in the history, the live camera follows
    // ------------------------------------------------------------
    function Na__Cameras__SetCut(scene, cutM) {
        const S = Na__Cameras__State;
        const before = Na__Views__CutM(scene);
        Na__Views__SetCut(scene, cutM);
        if (Na__Views__CutM(scene) === before) return false;
        Na__AppState__Touch('views');
        if (typeof S.onCut === 'function') S.onCut(scene);
        Na__DrawingPlanes__Redraw();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Cut Every Elevation at the Building: 50 mm in front of the face of its box (the roof plan left as it is)
    // ------------------------------------------------------------
    // The building drawn now (Na__EngineHost__BuildingBounds: its Architecture
    // and Focal objects, never the garden), so it is right for the demo cottage
    // and for a project's own whitecard alike. The furthest corner of the box
    // along each elevation's normal is its face; the cut stands
    // Cameras__CutAtBuildingM in front of it, rounded up to the millimetre so
    // it is never nearer. All of them are one step in the history.
    // ------------------------------------------------------------
    function Na__Cameras__CutAtBuilding() {
        const S = Na__Cameras__State;
        const b = Na__EngineHost__BuildingBounds();
        if (!b) { Na__Toast__Show('No building to measure yet: the drawing has not loaded.'); return 0; }
        const offset = Number(Na__AppConfig__Get('Cameras__CutAtBuildingM', 0.05));
        const corners = [];
        [b.Min[0], b.Max[0]].forEach((x) => [b.Min[1], b.Max[1]].forEach((y) => [b.Min[2], b.Max[2]].forEach((z) => corners.push([x, y, z]))));
        const changed = [];
        Na__DrawingPlanes__Scenes().filter((scene) => scene.View__Kind === 'Elevation').forEach((scene) => {
            const n = Na__Views__SceneNormal(scene);
            const face = Math.max(...corners.map((c) => c[0] * n[0] + c[1] * n[1] + c[2] * n[2]));
            const cut = Math.ceil((face + offset) * 1000 - 1e-6) / 1000;
            if (Na__Views__CutM(scene) === cut) return;
            Na__Views__SetCut(scene, cut);
            changed.push(scene);
        });
        if (!changed.length) { Na__Toast__Show('Every elevation is already cut at the building.'); return 0; }
        Na__AppState__Touch('views');                                            // <-- One step for them all
        if (typeof S.onCut === 'function') S.onCut(changed[0]);                 // <-- The open scene's live camera follows (whichever it is)
        Na__DrawingPlanes__Redraw();
        Na__Cameras__RenderRows();
        Na__Toast__Show(`Cut ${changed.length} elevation${changed.length === 1 ? '' : 's'} ${Math.round(offset * 1000)} mm in front of the building. The roof plan is left as it was.`);
        return changed.length;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Typed Position: millimetres, null for not cut, NaN for nothing readable
    // ------------------------------------------------------------
    // "6050", "6 050", "6,050 mm" and "-1250" are millimetres; empty or "not
    // cut" is not cut.
    // ------------------------------------------------------------
    function Na__Cameras__ParseMm(text) {
        const t = String(text || '').trim();
        if (!t || /^not/i.test(t)) return null;
        const n = Number(t.replace(/mm$/i, '').replace(/[\s,]/g, ''));
        return Number.isFinite(n) ? n : NaN;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Row Shows Its Scene's Cut (in place: the row being typed in keeps its focus)
    // ------------------------------------------------------------
    function Na__Cameras__ShowCut(input, reset, scene) {
        const cut = Na__Views__CutM(scene);
        input.value = cut === null ? '' : Na__PlaneMath__FormatMm(cut * 1000);
        reset.hidden = cut === null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Rows: a plane a row, in its colour, its position typed in
    // ------------------------------------------------------------
    // Only when a plane scene came, went, was renamed or moved, and never
    // while one of them is being typed in (it waits for the box to be left).
    // ------------------------------------------------------------
    function Na__Cameras__RenderRows() {
        const S = Na__Cameras__State;
        if (!S.rows) return;
        const scenes = Na__DrawingPlanes__Scenes();
        const key = JSON.stringify(scenes.map((s) => [s.View__Id, s.View__Name, s.View__CutM]));
        if (key === S.rowsKey || S.rows.contains(document.activeElement)) return;
        S.rowsKey = key;
        Na__Dom__Clear(S.rows);
        if (!scenes.length) {
            S.rows.appendChild(Na__Dom__El('p', 'aura-fold__hint', 'No elevation or roof plan among the scenes yet: open one from the tabs, or add one from a sheet.'));
            return;
        }
        scenes.forEach((scene) => {
            const row = Na__Dom__El('div', 'aura-cameras__plane', null, { dataset: { scene: scene.View__Id } });
            const swatch = Na__Dom__El('span', 'aura-cameras__swatch', null, { 'aria-hidden': 'true' });
            swatch.style.background = Na__DrawingPlanes__Colour(scene.View__Id);
            row.appendChild(swatch);
            row.appendChild(Na__Dom__El('span', 'aura-cameras__name', scene.View__Name, { title: scene.View__Name }));
            const what = scene.View__Kind === 'Plan' ? 'its height above the model\'s origin' : 'how far out along its direction from the model\'s origin';
            const input = Na__Dom__El('input', 'aura-input aura-cameras__cut', null, {
                type: 'text', inputmode: 'decimal', placeholder: 'Not cut', spellcheck: 'false',
                'aria-label': `${scene.View__Name}: where its plane cuts, in millimetres`,
                title: `Where ${scene.View__Name} is cut: ${what}, in millimetres. Nothing in front of it is drawn. Clear it for not cut.`
            });
            row.appendChild(input);
            row.appendChild(Na__Dom__El('span', 'aura-cameras__unit', 'mm'));
            const reset = Na__Dom__El('button', 'aura-cameras__reset', null, { type: 'button', title: 'Not cut: draw everything in front again', 'aria-label': `${scene.View__Name}: not cut` });
            reset.appendChild(Na__Dom__Icon('close'));
            row.appendChild(reset);
            Na__Cameras__ShowCut(input, reset, scene);

            let original = input.value;
            input.addEventListener('focus', () => { original = input.value; });
            input.addEventListener('keydown', (event) => {
                event.stopPropagation();                                         // <-- Typing is never the camera's or the app's shortcuts
                if (event.key === 'Enter') { event.preventDefault(); input.blur(); }
                else if (event.key === 'Escape') { event.preventDefault(); input.value = original; input.blur(); }
            });
            input.addEventListener('change', () => {
                const mm = Na__Cameras__ParseMm(input.value);
                if (Number.isNaN(mm)) { input.value = original; return; }        // <-- Nothing readable: the plane stays
                Na__Cameras__SetCut(scene, mm === null ? null : Math.round(mm) / 1000);
                Na__Cameras__ShowCut(input, reset, scene);
                original = input.value;
            });
            reset.addEventListener('click', () => {
                Na__Cameras__SetCut(scene, null);
                Na__Cameras__ShowCut(input, reset, scene);
                original = input.value;
            });
            S.rows.appendChild(row);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Switch, the Snap and the Section's Note Show What Is So
    // ------------------------------------------------------------
    function Na__Cameras__SyncPlanes() {
        const S = Na__Cameras__State;
        if (!S.show) return;
        const shown = Na__DrawingPlanes__Shown();
        S.show.classList.toggle('is-active', shown);
        S.show.setAttribute('aria-pressed', String(shown));
        S.show.textContent = shown ? 'Hide elevation planes' : 'Show elevation planes';
        const snap = Na__DrawingPlanes__Snap();
        S.snap.toggle.classList.toggle('is-active', snap.enabled);
        S.snap.toggle.setAttribute('aria-pressed', String(snap.enabled));
        S.snap.toggle.title = snap.enabled ? `Planes land on a ${snap.incrementMm} mm grid from the model's origin. Click to move them freely.`
                                           : `Planes move freely, to the millimetre. Click to snap them to a ${snap.incrementMm} mm grid.`;
        S.snap.value.textContent = `${snap.incrementMm} mm`;
        if (S.section && S.section.meta) S.section.meta.textContent = shown ? 'Planes shown' : '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Planes' Group: the switch, the snap, the rows, a note
    // ------------------------------------------------------------
    function Na__Cameras__BuildPlanes(parent) {
        const S = Na__Cameras__State;
        const group = Na__Dom__El('div', 'aura-cameras__group');
        group.appendChild(Na__Dom__El('h3', 'aura-cameras__heading', 'Elevation planes'));

        S.show = Na__Dom__El('button', 'aura-button aura-cameras__show', 'Show elevation planes', {
            type: 'button', 'aria-pressed': 'false', title: 'Show where every elevation and the roof plan is cut, over the drawing'
        });
        S.show.addEventListener('click', () => { Na__DrawingPlanes__Show(!Na__DrawingPlanes__Shown()); Na__Cameras__SyncPlanes(); });
        group.appendChild(S.show);

        const snapRow = Na__Dom__El('div', 'aura-cameras__snap');
        const toggle = Na__Dom__El('button', 'aura-segmented__item aura-cameras__snapToggle', 'Snap', { type: 'button', 'aria-pressed': 'false' });
        toggle.addEventListener('click', () => { Na__DrawingPlanes__SetSnap({ enabled: !Na__DrawingPlanes__Snap().enabled }); Na__Cameras__SyncPlanes(); });
        const step = (direction) => {
            const now = Na__DrawingPlanes__Snap().incrementMm;
            Na__DrawingPlanes__SetSnap({ incrementMm: Na__PlaneMath__StepInList(Na__DrawingPlanes__Increments(), now, direction) });
            Na__Cameras__SyncPlanes();
        };
        const down = Na__Dom__El('button', 'aura-cameras__step', '−', { type: 'button', title: 'A smaller step', 'aria-label': 'A smaller snap step' });
        down.addEventListener('click', () => step(-1));
        const value = Na__Dom__El('span', 'aura-cameras__stepValue', '', { 'aria-live': 'polite' });
        const up = Na__Dom__El('button', 'aura-cameras__step', '+', { type: 'button', title: 'A larger step', 'aria-label': 'A larger snap step' });
        up.addEventListener('click', () => step(1));
        snapRow.appendChild(toggle);
        snapRow.appendChild(down);
        snapRow.appendChild(value);
        snapRow.appendChild(up);
        group.appendChild(snapRow);
        S.snap = { toggle, value };

        S.rows = Na__Dom__El('div', 'aura-cameras__planes');
        group.appendChild(S.rows);

        const atBuilding = Na__Dom__El('button', 'aura-button aura-cameras__atBuilding', 'Cut elevations at the building', {
            type: 'button', title: `Every elevation cut ${Math.round(Number(Na__AppConfig__Get('Cameras__CutAtBuildingM', 0.05)) * 1000)} mm in front of the face of the building's box, measured from the building drawn now. The roof plan is left as it is.`
        });
        atBuilding.addEventListener('click', () => Na__Cameras__CutAtBuilding());
        group.appendChild(atBuilding);
        group.appendChild(Na__Dom__El('p', 'aura-fold__hint aura-cameras__note',
            'Drag a plane by a corner grip or its name: it moves along its own direction, on the snap grid, and Escape puts it back. '
            + 'Nothing in front of a plane is drawn. A plane never moved is not cut: it waits, dashed, in front of the building. '
            + 'Planes never appear on a sheet or in a picture.'));
        parent.appendChild(group);
        S.rowsKey = '';
        Na__Cameras__RenderRows();
        Na__Cameras__SyncPlanes();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Build, Open and Watch
// -----------------------------------------------------------------------------

    // FUNCTION | Fill the Cameras Section: the lens, then the elevation planes
    // ------------------------------------------------------------
    // section: the panel's folding section (Na__Panels__Section). options:
    // { onCut(scene) }, the open scene's live camera following a new cut.
    // ------------------------------------------------------------
    function Na__Cameras__Build(section, options) {
        const S = Na__Cameras__State;
        S.section = section;
        S.onCut = options && typeof options.onCut === 'function' ? options.onCut : null;
        const holder = Na__Dom__El('div', 'aura-cameras');
        section.body.appendChild(holder);
        Na__Cameras__BuildLens(holder);
        Na__Cameras__BuildPlanes(holder);
        Na__DrawingPlanes__OnChange((scene) => {                                // <-- A plane dragged (its scene), or the switch (null)
            if (scene && typeof S.onCut === 'function') S.onCut(scene);
            Na__Cameras__RenderRows();
            Na__Cameras__SyncPlanes();
        });
        if (section.IsOpen && section.IsOpen()) Na__Cameras__SetOpen(true);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Section Opened or Folded: its watch runs only while it is open
    // ------------------------------------------------------------
    function Na__Cameras__SetOpen(open) {
        const S = Na__Cameras__State;
        S.open = !!open;
        if (S.open) Na__Cameras__Sync();
    }

    // Everything read again: the lens, the rows, the switch (the tab shown again, an undo)
    function Na__Cameras__Sync() {
        const S = Na__Cameras__State;
        S.lensKey = '';
        Na__Cameras__SyncLens();
        Na__Cameras__RenderRows();
        Na__Cameras__SyncPlanes();
        if (S.open && !S.tick) S.tick = requestAnimationFrame(Na__Cameras__Tick);
    }

    // While open on the 3D Environment, each frame: the lens follows the camera, the rows the scenes
    function Na__Cameras__Tick() {
        const S = Na__Cameras__State;
        S.tick = 0;
        if (!S.open || Na__AppState__Data.tab !== 'environment') return;        // <-- Stops; Sync starts it again
        Na__Cameras__SyncLens();
        Na__Cameras__RenderRows();
        S.tick = requestAnimationFrame(Na__Cameras__Tick);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Cameras__Build,
        Na__Cameras__SetOpen,
        Na__Cameras__Sync,
        Na__Cameras__CutAtBuilding,
        Na__Cameras__FocalToFov,
        Na__Cameras__FovToFocal
    };

// endregion -------------------------------------------------------------------
