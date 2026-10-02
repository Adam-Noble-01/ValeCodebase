// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - PANEL: VIEWPORT SETTINGS
// =============================================================================
//
// FILE       : Na__LayoutEditor__Panel__ViewportSettings__.js
// NAMESPACE  : Na__LePanelViewport
// MODULE     : Layout Editor - Panel Viewport Settings
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Add a viewport; for the selected one: scene, scale, frame, pan, markup mode, import, edit in drawing
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - The scene select is grouped by scene group (plans, elevations, cross
//   sections, 3D views). A drawing scene makes a 2D viewport carrying its
//   drawing id; any other scene makes a 3D snapshot viewport (D28, D30).
// - Scale is a three-way toggle (D27) on 2D viewports; the frame and pan
//   readouts are editable numbers in paper and drawing millimetres; the
//   markup mode switch, Import From Scene and Edit In Drawing implement
//   D34 (editing of scene markup happens in the drawing itself).
// - Zoom % (3D viewports only): how large the picture is drawn in its frame,
//   typed to a decimal place and applied about the middle of the frame; Reset
//   puts it back to 100 percent, centred. The wheel does the same about the
//   cursor while the viewport's content is being edited
//   (Na__LayoutEditor__Viewport3dZoom__). Greyed out while the viewport or its
//   layer is locked.
//
// INTEGRATION:
// - Registered into the right column by the mode controller, which also
//   answers the Edit In Drawing request event.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : Lantern Designer 30__System__DrawingEditorMode (view settings purpose)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 15-Sep-2026 - Version 1.4.1
// - The Add Viewport scene list is rebuilt on every refresh. It was filled
//   when the section was built and refilled only while it held a single
//   option, so plans, elevations and scenes added after a sheet first opened
//   never appeared in it until the page reloaded. The choice in progress is
//   kept, and the list is left alone while it has focus.
//
// 14-Sep-2026 - Version 1.4.0
// - Zoom % on 3D viewports: a number box for the picture's zoom (to a decimal
//   place, one undo step, about the middle of the frame) and Reset (100 percent,
//   centred). Hidden on 2D viewports, greyed out when locked.
// - Ported from TrueVision3D (Panel__ViewportSettings 1.7.0, v2.50.0).
//
// 14-Sep-2026 - Version 1.3.0
// - Changing the scene of a pasted viewport copy clears its placeholder name
//   so the caption follows the new scene.
// - Ported from TrueVision3D v2.44.0.
//
// 10-Sep-2026 - Version 1.2.0
// - The global raster level (Low, Medium, High) sits above the viewport settings, where it is looked for.
//
// 10-Sep-2026 - Version 1.1.0
// - Locked checkbox.
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Scale, Layout, Model, Panels, Viewports, Markup
    // ------------------------------------------------------------
    import { Na__LeCfg__GetLabel, Na__LeCfg__GetViewportSetup } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';
    import { Na__LeScale__ListDenominators, Na__LeScale__FormatLabel } from '../07__Core__SheetData/Na__LayoutEditor__ScaleManager__.js';
    import { Na__LeLayout__Solve, Na__LeLayout__DefaultViewportRect } from '../07__Core__SheetData/Na__LayoutEditor__SheetLayout__.js';
    import {
        Na__LeModel__KIND_2D,
        Na__LeModel__KIND_3D,
        Na__LeModel__GetActiveSheet,
        Na__LeModel__GetLayers,
        Na__LeModel__DefaultLayerId,
        Na__LeModel__CreateViewport,
        Na__LeModel__UpdateViewport,
        Na__LeModel__GetSelectedViewport,
        Na__LeModel__SetSelection,
        Na__LeModel__ResolveViewportSource,
        Na__LeModel__IsLayerLocked
    } from '../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';
    import { Na__LeVpZoom__Get, Na__LeVpZoom__Percent, Na__LeVpZoom__PatchAbout, Na__LeVpZoom__PatchReset } from '../20__System__Viewports/Na__LayoutEditor__Viewport3dZoom__.js';
    import {
        Na__LePanels__RegisterSection,
        Na__LePanels__OnControl,
        Na__LePanels__IsEditable,
        Na__LePanels__GetContext,
        Na__LePanels__Row,
        Na__LePanels__Input,
        Na__LePanels__Select,
        Na__LePanels__FillSelect,
        Na__LePanels__Button,
        Na__LePanels__Note
    } from './Na__LayoutEditor__PanelHost__.js';
    import { Na__LeVp2d__Describe, Na__LeVp2d__CentreOnDrawing } from '../20__System__Viewports/Na__LayoutEditor__Viewport2d__.js';
    import { Na__LeRaster__LEVELS, Na__LeRaster__Get, Na__LeRaster__Set } from '../20__System__Viewports/Na__LayoutEditor__RasterQuality__.js';
    import { Na__LeMarkup__ImportFromScene } from '../15__Core__Markup/Na__LayoutEditor__MarkupBridge__.js';
    import { Na__LeClip__IsCopyName } from '../20__System__Viewports/Na__LayoutEditor__ViewportClipboard__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scenes and Groups
    // ------------------------------------------------------------
    import { Na__PresentationMode__ProjectJson__GetActiveConfig } from '../../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    import { Na__PresentationMode__SceneGroups__GetEnabledGroups, Na__PresentationMode__SceneGroups__GetScenesInGroup } from '../../21__System__PresentationMode/Na__PresentationMode__SceneGroups__Data__.js';
    import { Na__DrawData__IsFloorPlanScene, Na__DrawData__IsElevationScene, Na__DrawData__SCENE_PLAN_ID_KEY, Na__DrawData__SCENE_ELEVATION_ID_KEY } from '../../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Section Id, Scene Keys and the Edit Request Event
    // ------------------------------------------------------------
    const Na__LePanelViewport__ID            = 'viewport';
    const Na__LePanelViewport__SCENES_KEY    = 'PresentationMode__SavedCameraScenes__Scenes';
    const Na__LePanelViewport__EDIT_EVENT    = 'na-layouteditor-request-drawing';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Options
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Every Scene Grouped for a Select
    // ------------------------------------------------------------
    function Na__LePanelViewport__SceneOptions() {
        const config  = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const scenes  = (config && Array.isArray(config[Na__LePanelViewport__SCENES_KEY])) ? config[Na__LePanelViewport__SCENES_KEY] : [];
        const groups  = Na__PresentationMode__SceneGroups__GetEnabledGroups(config);
        const options = [ { value : '', label : Na__LeCfg__GetLabel('ChooseScene', 'Choose a scene...') } ];
        const seen    = new Set();
        const push = (scene, groupName) => {
            if (!scene || !scene.PresentationMode__Scene__Id || seen.has(scene.PresentationMode__Scene__Id)) return;
            seen.add(scene.PresentationMode__Scene__Id);
            const kind = Na__DrawData__IsFloorPlanScene(scene) ? ' (plan)' : (Na__DrawData__IsElevationScene(scene) ? ' (elevation)' : ' (3D)');
            options.push({ value : scene.PresentationMode__Scene__Id, label : (groupName ? groupName + ': ' : '') + (scene.PresentationMode__Scene__Name || scene.PresentationMode__Scene__Id) + kind, group : groupName });
        };
        groups.forEach((group) => {
            Na__PresentationMode__SceneGroups__GetScenesInGroup(scenes, config, group.PresentationMode__Group__Id).forEach((scene) => push(scene, group.PresentationMode__Group__Name));
        });
        scenes.forEach((scene) => push(scene, null));
        return options;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Kind and Drawing Id for a Scene
    // ------------------------------------------------------------
    function Na__LePanelViewport__Describe(sceneId) {
        const config = Na__PresentationMode__ProjectJson__GetActiveConfig();
        const scenes = (config && Array.isArray(config[Na__LePanelViewport__SCENES_KEY])) ? config[Na__LePanelViewport__SCENES_KEY] : [];
        const scene  = scenes.find((s) => s && s.PresentationMode__Scene__Id === sceneId) || null;
        if (!scene) return null;
        if (Na__DrawData__IsFloorPlanScene(scene)) return { scene : scene, kind : Na__LeModel__KIND_2D, drawingId : scene[Na__DrawData__SCENE_PLAN_ID_KEY] };
        if (Na__DrawData__IsElevationScene(scene)) return { scene : scene, kind : Na__LeModel__KIND_2D, drawingId : scene[Na__DrawData__SCENE_ELEVATION_ID_KEY] };
        return { scene : scene, kind : Na__LeModel__KIND_3D, drawingId : null };
    }
    // ------------------------------------------------------------


    // FUNCTION | Add a Viewport for a Scene (centred, at the default size)
    // ------------------------------------------------------------
    function Na__LePanelViewport__Add(sheet, sceneId) {
        const described = Na__LePanelViewport__Describe(sceneId);
        if (!sheet || !described) return null;
        const setup    = Na__LeCfg__GetViewportSetup();
        const layout   = Na__LeLayout__Solve(sheet);
        const viewport = Na__LeModel__CreateViewport(sheet, {
            kind : described.kind, sceneId : sceneId, drawingId : described.drawingId,
            rect : Na__LeLayout__DefaultViewportRect(layout, setup.defaultWidthMm, setup.defaultHeightMm)
        });
        if (viewport && viewport.Viewport__Kind === Na__LeModel__KIND_2D) Na__LeVp2d__CentreOnDrawing(sheet, viewport);
        if (viewport) Na__LeModel__SetSelection({ kind : 'viewport', id : viewport.Viewport__Id });
        return viewport;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Controls (both states live in the body; refresh shows one)
    // ------------------------------------------------------------
    function Na__LePanelViewport__Build(body) {
        const editable = Na__LePanels__IsEditable();
        const add = document.createElement('div');
        add.className = 'na-le-block';
        add.setAttribute('data-na-block', 'add');
        add.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('SceneLabel', 'Scene'), Na__LePanels__Select('vp-add-scene', Na__LePanelViewport__SceneOptions(), '')));
        if (editable) add.appendChild(Na__LePanels__Button(Na__LeCfg__GetLabel('AddViewport', 'Add Viewport'), 'vp-add', 'na-le-btn--primary'));
        add.appendChild(Na__LePanels__Note(Na__LeCfg__GetLabel('NoSelection', 'Select a viewport on the sheet.')));
        body.appendChild(add);

        // RASTER | Not a property of this viewport: one working resolution for
        // every picture on every sheet, so it sits outside the edit block and
        // shows whether or not something is selected.
        const raster = Na__LePanels__Select('vp-raster', Na__LeRaster__LEVELS.map((level) => ({
            value : level, label : Na__LeCfg__GetLabel('Raster' + level.charAt(0).toUpperCase() + level.slice(1), level.charAt(0).toUpperCase() + level.slice(1))
        })), Na__LeRaster__Get());
        body.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('RasterGlobal', 'Raster (all sheets)'), raster));
        body.appendChild(Na__LePanels__Note(Na__LeCfg__GetLabel('RasterNote', 'Global working resolution of every viewport picture. The PDF always exports at High.')));

        const edit = document.createElement('div');
        edit.className = 'na-le-block';
        edit.setAttribute('data-na-block', 'edit');
        edit.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('ViewportName', 'Name'), Na__LePanels__Input('text', 'vp-name', { placeholder : 'Caption from the scene' })));
        edit.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('SceneLabel', 'Scene'), Na__LePanels__Select('vp-scene', Na__LePanelViewport__SceneOptions(), '')));
        edit.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('LayerLabel', 'Layer'), Na__LePanels__Select('vp-layer', [], '')));

        const scale = document.createElement('div');
        scale.className = 'na-le-toggle-group';
        scale.setAttribute('data-na-block', 'scale');
        Na__LeScale__ListDenominators().forEach((d) => scale.appendChild(Na__LePanels__Button(Na__LeScale__FormatLabel(d), 'vp-scale', 'na-le-btn--toggle', d)));
        edit.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('ScaleLabel', 'Scale'), scale));

        const frame = document.createElement('div');
        frame.className = 'na-le-grid4';
        [ 'X', 'Y', 'WidthMm', 'HeightMm' ].forEach((key) => {
            const input = Na__LePanels__Input('number', 'vp-frame', { step : 1 });
            input.setAttribute('data-na-role', key);
            input.title = key;
            frame.appendChild(input);
        });
        edit.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('FrameLabel', 'Frame mm'), frame));

        const pan = document.createElement('div');
        pan.className = 'na-le-grid4';
        pan.setAttribute('data-na-block', 'pan');
        [ 'X', 'Y' ].forEach((key) => { const input = Na__LePanels__Input('number', 'vp-pan', { step : 10 }); input.setAttribute('data-na-role', key); input.title = 'Window centre ' + key; pan.appendChild(input); });
        if (editable) pan.appendChild(Na__LePanels__Button(Na__LeCfg__GetLabel('CentreOnDrawing', 'Centre'), 'vp-centre', 'na-le-btn--small'));
        edit.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('PanLabel', 'Window mm'), pan));

        // ZOOM | 3D only: how large the picture is drawn in its frame. A 2D
        // viewport's size on the paper is its scale, so it has no zoom of its own.
        const zoomSetup = Na__LeCfg__GetViewportSetup();
        const zoom      = document.createElement('div');
        zoom.className = 'na-le-grid4';
        zoom.setAttribute('data-na-block', 'zoom');
        const zoomInput = Na__LePanels__Input('number', 'vp-zoom', { step : 'any', min : Math.round(zoomSetup.imageZoomMin * 100), max : Math.round(zoomSetup.imageZoomMax * 100) });   // <-- Any decimal typed; the arrows still step by one
        zoomInput.title = Na__LeCfg__GetLabel('ZoomTitle', 'How large the 3D picture is drawn in its frame, as a percentage of its size before zooming. Type any value, to a decimal place. Or double-click the viewport and scroll over it to zoom about the cursor.');
        zoom.appendChild(zoomInput);
        if (editable) {
            const zoomReset = Na__LePanels__Button(Na__LeCfg__GetLabel('ZoomReset', 'Reset'), 'vp-zoom-reset', 'na-le-btn--small');
            zoomReset.title = Na__LeCfg__GetLabel('ZoomResetTitle', 'Back to 100%, centred in the frame.');
            zoom.appendChild(zoomReset);
        }
        edit.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('ZoomLabel', 'Zoom %'), zoom));

        const markup = document.createElement('div');
        markup.className = 'na-le-toggle-group';
        markup.setAttribute('data-na-block', 'markup');
        markup.appendChild(Na__LePanels__Button(Na__LeCfg__GetLabel('MarkupScene', 'Scene'), 'vp-markup', 'na-le-btn--toggle', 'scene'));
        markup.appendChild(Na__LePanels__Button(Na__LeCfg__GetLabel('MarkupSheet', 'Sheet'), 'vp-markup', 'na-le-btn--toggle', 'sheet'));
        edit.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('MarkupMode', 'Markup'), markup));
        edit.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('ShowScaleLabel', 'Caption'), Na__LePanels__Input('checkbox', 'vp-caption')));
        edit.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('LockedLabel', 'Locked'), Na__LePanels__Input('checkbox', 'vp-locked')));

        if (editable) {
            const actions = document.createElement('div');
            actions.className = 'na-le-bar';
            actions.setAttribute('data-na-block', 'actions2d');
            actions.appendChild(Na__LePanels__Button(Na__LeCfg__GetLabel('ImportFromScene', 'Import From Scene'), 'vp-import', ''));
            actions.appendChild(Na__LePanels__Button(Na__LeCfg__GetLabel('EditInDrawing', 'Edit In Drawing'), 'vp-edit', ''));
            edit.appendChild(actions);
        }
        body.appendChild(edit);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Reflect the Selected Viewport
    // ------------------------------------------------------------
    function Na__LePanelViewport__Refresh(body) {
        const rasterSelect = body.querySelector('[data-na-control="vp-raster"]');
        if (rasterSelect && document.activeElement !== rasterSelect) rasterSelect.value = Na__LeRaster__Get();
        const sheet    = Na__LeModel__GetActiveSheet();
        const viewport = Na__LeModel__GetSelectedViewport();
        const addBlock = body.querySelector('[data-na-block="add"]');
        const editBlock = body.querySelector('[data-na-block="edit"]');
        addBlock.hidden  = !!viewport;
        editBlock.hidden = !viewport;
        // ADD LIST | Rebuilt on every refresh. It used to be filled only while it
        // held a single option, so once a project's first scenes were in it, a
        // plan, an elevation or a scene added later never reached it until the
        // page reloaded. The choice in progress survives the rebuild, and a list
        // that has focus (open, or just chosen from) is left alone.
        const addSelect = addBlock.querySelector('[data-na-control="vp-add-scene"]');
        if (addSelect && document.activeElement !== addSelect) {
            const addOptions = Na__LePanelViewport__SceneOptions();
            const keep       = addOptions.some((option) => option.value === addSelect.value) ? addSelect.value : '';
            Na__LePanels__FillSelect(addSelect, addOptions, keep);
        }
        if (!viewport || !sheet) return;

        const is2d = viewport.Viewport__Kind === Na__LeModel__KIND_2D;
        const set  = (name, value) => { const el = editBlock.querySelector('[data-na-control="' + name + '"]'); if (el && document.activeElement !== el) el.value = value; };
        set('vp-name', viewport.Viewport__Name || '');
        const sceneSelect = editBlock.querySelector('[data-na-control="vp-scene"]');
        Na__LePanels__FillSelect(sceneSelect, Na__LePanelViewport__SceneOptions(), viewport.Viewport__SceneId || '');
        Na__LePanels__FillSelect(editBlock.querySelector('[data-na-control="vp-layer"]'), Na__LeModel__GetLayers(sheet).map((l) => ({ value : l.Layer__Id, label : l.Layer__Name })), viewport.Viewport__LayerId);

        editBlock.querySelector('[data-na-block="scale"]').parentNode.hidden = !is2d;
        editBlock.querySelectorAll('[data-na-control="vp-scale"]').forEach((b) => b.classList.toggle('na-le-btn--active', parseFloat(b.getAttribute('data-na-role')) === viewport.Viewport__ScaleDenominator));
        editBlock.querySelectorAll('[data-na-control="vp-frame"]').forEach((input) => {
            if (document.activeElement !== input) input.value = String(Math.round(viewport.Viewport__FrameMm[input.getAttribute('data-na-role')] * 10) / 10);
        });
        editBlock.querySelector('[data-na-block="pan"]').parentNode.hidden = !is2d;
        editBlock.querySelectorAll('[data-na-control="vp-pan"]').forEach((input) => {
            if (document.activeElement !== input) input.value = String(Math.round(viewport.Viewport__PanMm[input.getAttribute('data-na-role')]));
        });
        const zoomBlock = editBlock.querySelector('[data-na-block="zoom"]');
        if (zoomBlock) {
            const zoomLocked = viewport.Viewport__Locked === true || Na__LeModel__IsLayerLocked(sheet, viewport.Viewport__LayerId);   // <-- A lock holds the framing as well as the frame
            zoomBlock.parentNode.hidden = is2d;
            const zoomInput = zoomBlock.querySelector('[data-na-control="vp-zoom"]');
            if (zoomInput) {
                if (document.activeElement !== zoomInput) zoomInput.value = String(Na__LeVpZoom__Percent(Na__LeVpZoom__Get(viewport)));
                zoomInput.disabled = !Na__LePanels__IsEditable() || zoomLocked;
            }
            const zoomReset = zoomBlock.querySelector('[data-na-control="vp-zoom-reset"]');
            if (zoomReset) zoomReset.disabled = !Na__LePanels__IsEditable() || zoomLocked;
        }
        editBlock.querySelector('[data-na-block="markup"]').parentNode.hidden = !is2d;
        editBlock.querySelectorAll('[data-na-control="vp-markup"]').forEach((b) => b.classList.toggle('na-le-btn--active', b.getAttribute('data-na-role') === viewport.Viewport__MarkupMode));
        const caption = editBlock.querySelector('[data-na-control="vp-caption"]');
        if (caption) caption.checked = viewport.Viewport__ShowScaleLabel !== false;
        const locked = editBlock.querySelector('[data-na-control="vp-locked"]');
        if (locked) locked.checked = viewport.Viewport__Locked === true;
        const actions = editBlock.querySelector('[data-na-block="actions2d"]');
        if (actions) actions.hidden = !is2d;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Selected Viewport With Its Sheet, or Nothing
    // ------------------------------------------------------------
    function Na__LePanelViewport__Current() {
        const sheet = Na__LeModel__GetActiveSheet();
        const viewport = Na__LeModel__GetSelectedViewport();
        return (sheet && viewport) ? { sheet : sheet, viewport : viewport } : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Register the Section and Its Controls
    // ------------------------------------------------------------
    function Na__LePanelViewport__Register() {
        Na__LePanels__OnControl('change', 'vp-raster', (e, el) => Na__LeRaster__Set(el.value));
        Na__LePanels__OnControl('click', 'vp-add', (e, el) => {
            const select = el.parentNode.querySelector('[data-na-control="vp-add-scene"]');
            const sheet  = Na__LeModel__GetActiveSheet();
            if (select && select.value && sheet) Na__LePanelViewport__Add(sheet, select.value);
        });
        Na__LePanels__OnControl('change', 'vp-name',  (e, el) => { const c = Na__LePanelViewport__Current(); if (c) Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, { name : el.value.trim() }); });
        Na__LePanels__OnControl('change', 'vp-layer', (e, el) => { const c = Na__LePanelViewport__Current(); if (c) Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, { layerId : el.value }); });
        Na__LePanels__OnControl('change', 'vp-scene', (e, el) => {
            const c = Na__LePanelViewport__Current();
            const d = Na__LePanelViewport__Describe(el.value);
            if (!c || !d) return;
            const patch = { sceneId : el.value, drawingId : d.drawingId, kind : d.kind, snapshotAsset : null };
            if (Na__LeClip__IsCopyName(c.viewport)) patch.name = '';                  // <-- A pasted copy's placeholder name described the old scene: the caption follows the new one
            Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, patch);
            if (d.kind === Na__LeModel__KIND_2D) Na__LeVp2d__CentreOnDrawing(c.sheet, c.viewport);
        });
        Na__LePanels__OnControl('click', 'vp-scale', (e, el, role) => { const c = Na__LePanelViewport__Current(); if (c) Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, { scaleDenominator : parseFloat(role) }); });
        Na__LePanels__OnControl('change', 'vp-frame', (e, el, key) => {
            const c = Na__LePanelViewport__Current(); const v = parseFloat(el.value);
            if (c && Number.isFinite(v)) { const rect = {}; rect[key] = v; Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, { rect : rect }); }
        });
        Na__LePanels__OnControl('change', 'vp-pan', (e, el, key) => {
            const c = Na__LePanelViewport__Current(); const v = parseFloat(el.value);
            if (c && Number.isFinite(v)) { const pan = {}; pan[key] = v; Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, { pan : pan }); }
        });
        Na__LePanels__OnControl('click', 'vp-centre', () => { const c = Na__LePanelViewport__Current(); if (c && Na__LeVp2d__CentreOnDrawing(c.sheet, c.viewport)) Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, {}, false); });
        Na__LePanels__OnControl('change', 'vp-zoom', (e, el) => {
            const c = Na__LePanelViewport__Current();
            if (!c || c.viewport.Viewport__Kind !== Na__LeModel__KIND_3D) return;
            const percent = parseFloat(el.value);
            const patch   = (Number.isFinite(percent) && percent > 0) ? Na__LeVpZoom__PatchAbout(c.viewport, percent / 100, null) : null;
            if (!patch) { el.value = String(Na__LeVpZoom__Percent(Na__LeVpZoom__Get(c.viewport))); return; }   // <-- Not a zoom: the box shows the one the picture has
            Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, patch);                                // <-- About the middle of the frame; one undo step
            el.value = String(Na__LeVpZoom__Percent(Na__LeVpZoom__Get(c.viewport)));                             // <-- A value past a limit shows the limit it was held to
        });
        Na__LePanels__OnControl('click', 'vp-zoom-reset', () => {
            const c = Na__LePanelViewport__Current();
            if (c && c.viewport.Viewport__Kind === Na__LeModel__KIND_3D) Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, Na__LeVpZoom__PatchReset(c.viewport));
        });
        Na__LePanels__OnControl('click', 'vp-markup', (e, el, role) => { const c = Na__LePanelViewport__Current(); if (c) Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, { markupMode : role }); });
        Na__LePanels__OnControl('change', 'vp-caption', (e, el) => { const c = Na__LePanelViewport__Current(); if (c) Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, { showScaleLabel : el.checked }); });
        Na__LePanels__OnControl('change', 'vp-locked',  (e, el) => { const c = Na__LePanelViewport__Current(); if (c) Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, { locked : el.checked }); });
        Na__LePanels__OnControl('click', 'vp-import', () => {
            const c = Na__LePanelViewport__Current();
            if (!c || c.viewport.Viewport__Kind !== Na__LeModel__KIND_2D) return;
            const count = Na__LeMarkup__ImportFromScene(c.sheet, c.viewport, Na__LeModel__DefaultLayerId(c.sheet, 'annotation'), Na__LeVp2d__Describe(c.viewport));
            const toast = Na__LePanels__GetContext() ? Na__LePanels__GetContext().showToast : null;
            if (typeof toast === 'function') toast(count + ' item(s) copied from the scene.', false);
            if (count > 0) Na__LeModel__UpdateViewport(c.sheet, c.viewport.Viewport__Id, { markupMode : 'sheet' });
        });
        Na__LePanels__OnControl('click', 'vp-edit', () => {
            const c = Na__LePanelViewport__Current();
            if (!c) return;
            const source = Na__LeModel__ResolveViewportSource(c.viewport);
            window.dispatchEvent(new CustomEvent(Na__LePanelViewport__EDIT_EVENT, { detail : { viewportId : c.viewport.Viewport__Id, plan : source.plan, elevation : source.elevation } }));
        });
        return Na__LePanels__RegisterSection('right', {
            id : Na__LePanelViewport__ID, title : Na__LeCfg__GetLabel('ViewportTitle', 'Viewport'),
            build : Na__LePanelViewport__Build, refresh : Na__LePanelViewport__Refresh
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Viewport Settings Panel API
    // ------------------------------------------------------------
    export {
        Na__LePanelViewport__EDIT_EVENT,
        Na__LePanelViewport__Register,
        Na__LePanelViewport__Add
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
