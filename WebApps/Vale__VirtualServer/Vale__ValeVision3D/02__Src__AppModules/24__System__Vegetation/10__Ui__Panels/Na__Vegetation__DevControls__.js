// =============================================================================
// VALEVISION3D - VEGETATION - DEV CONTROLS
// =============================================================================
//
// FILE       : Na__Vegetation__DevControls__.js
// NAMESPACE  : Na__VegDev
// MODULE     : System - Vegetation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The Dev Tools section that switches a project's vegetation on and off,
//              and lays down a test row to look at until the real tools arrive
// CREATED    : 04-Nov-2026
//
// DESCRIPTION:
// - ONE SWITCH (Adam, 04-Nov-2026). On makes the project's object, with every parameter
//   in it, and shows the plants. Off keeps the object and takes them away.
// - ADD TEST ROW is a stand-in for the Linear Tool (Stage 5). One click on the model
//   and a short row lies along the view, each plant dropped onto whatever is under it,
//   so a real project's planter can be tried now. Every plant it makes carries the
//   same stroke id, so Remove Test Plants takes those and nothing else.
// - SAVED STRAIGHT AWAY. There is no Save Vegetation yet (Stage 4), so a test row
//   that vanished on reload would prove nothing. Through Na__VegData__Save, a merge of
//   this one key, like everything else that writes the project's object.
// - A CLICK AND AN ORBIT ARE TOLD APART as in the north pick tool: too much travel
//   between press and release was an orbit, and the row waits for a real click.
//
// FRAMES:
// - Points are picked in world metres, and saved as integer mm in three.js axes, as
//   every saved value is.
//
// INTEGRATION:
// - Loaded by Na__Vegetation__.js for an author only. Nobody else fetches this file.
// - Markup: #naVegetationDevItem, #naVegetationDevToggle, #naVegetationDevPanel.
// - Tuned from Vegetation__DevTools__Config in ../Na__Vegetation__AppConfig__.json.
// - @delegate: ../03__System__SceneLayer/Na__Vegetation__Runtime__.js
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 04-Nov-2026 - Version 1.0.0 (ValeVision3D v2.84.0)
// - Initial build: Stage 2 of ValeVision__PLAN__VegetationSystem__.md.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Units, Vegetation's Data and Its Door
    // ------------------------------------------------------------
    import { Na__Math__ConvertUnitsToMm } from '../../04__MathUtils/Na__Math__Units.js';
    import {
        Na__VegData__LoadConfig,
        Na__VegData__Current,
        Na__VegData__SetDirty,
        Na__VegData__Save
    } from '../02__Core__Data/Na__Vegetation__SceneData__.js';
    import { Na__VegLib__LoadAllAssets } from '../02__Core__Data/Na__Vegetation__Library__.js';
    import { Na__Vegetation__IsActive, Na__Vegetation__SetEnabled } from '../Na__Vegetation__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Markup Ids and the Readout's Pace
    // ------------------------------------------------------------
    const Na__VegDev__ITEM_ID     = 'naVegetationDevItem';
    const Na__VegDev__TOGGLE_ID   = 'naVegetationDevToggle';
    const Na__VegDev__PANEL_ID    = 'naVegetationDevPanel';
    const Na__VegDev__READOUT_MS  = 500;
    const Na__VegDev__DROP_FROM_M = 1.5;                                       // <-- A plant lands on what is under it, looking no further up than this
    const Na__VegDev__FULL_CIRCLE = 360;
    const Na__VegDev__SEED_RANGE  = 1000000000;
    // ------------------------------------------------------------

    // MODULE VARIABLES | Injected References and What Is Armed
    // ------------------------------------------------------------
    const Na__VegDev__State = {
        context     : null,
        panel       : null,
        toggle      : null,
        config      : null,
        armed       : false,
        pointerDown : false,
        downX       : 0,
        downY       : 0,
        priorCursor : '',
        busy        : false,
        readout     : 0
    };
    const Na__VegDev__Raycaster = new THREE.Raycaster();
    const Na__VegDev__Ndc       = new THREE.Vector2();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | An Element, a Button and the Toast
    // ------------------------------------------------------------
    function Na__VegDev__El(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }
    function Na__VegDev__Button(text, modifierClass, onClick) {
        const button = Na__VegDev__El('button', 'na-pm-dev__btn' + (modifierClass ? ' ' + modifierClass : ''), text);
        button.type = 'button';
        button.addEventListener('click', onClick);
        return button;
    }
    function Na__VegDev__Toast(message, isError) {
        const context = Na__VegDev__State.context;
        if (context && typeof context.showToast === 'function') context.showToast(message, isError === true);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Runtime, Already Loaded Once the Project Is On
    // ------------------------------------------------------------
    function Na__VegDev__Runtime() {
        return import('../03__System__SceneLayer/Na__Vegetation__Runtime__.js');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Save the Object, and Say What Happened
    // ------------------------------------------------------------
    async function Na__VegDev__SaveAndSay(whatChanged) {
        Na__VegData__SetDirty(true);
        const result = await Na__VegData__Save();
        if (result && result.ok) {
            Na__VegDev__Toast(whatChanged + ' Saved.', false);
        } else {
            Na__VegDev__Toast(whatChanged + ' Not saved: ' + ((result && result.error) || 'the server did not answer') + '.', true);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Test Row
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Model's Solid Surfaces, as a Raycast Wants Them
    // ------------------------------------------------------------
    // Fat lines are meshes to three.js and cannot be raycast without a camera, and
    // what is switched off is not there to stand a plant on.
    // ------------------------------------------------------------
    function Na__VegDev__ModelSurfaces() {
        const surfaces = [];
        const modelRoot = Na__VegDev__State.context.modelRoot;
        if (!modelRoot) return surfaces;
        modelRoot.traverseVisible((child) => {
            if (child.isMesh && !child.isLine2 && !child.isLineSegments2) surfaces.push(child);
        });
        return surfaces;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The First Surface Under a Pointer, or Null
    // ------------------------------------------------------------
    function Na__VegDev__PointAt(clientX, clientY, surfaces) {
        const { renderer, camera } = Na__VegDev__State.context;
        const rect = renderer.domElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        Na__VegDev__Ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        Na__VegDev__Ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        Na__VegDev__Raycaster.setFromCamera(Na__VegDev__Ndc, camera);
        const hits = surfaces.length ? Na__VegDev__Raycaster.intersectObjects(surfaces, false) : [];
        return hits.length ? hits[0].point.clone() : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Height of Whatever Is Under a Spot, or the Height Given
    // ------------------------------------------------------------
    function Na__VegDev__HeightUnder(x, fromY, z, surfaces) {
        Na__VegDev__Raycaster.set(new THREE.Vector3(x, fromY + Na__VegDev__DROP_FROM_M, z), new THREE.Vector3(0, -1, 0));
        const hits = surfaces.length ? Na__VegDev__Raycaster.intersectObjects(surfaces, false) : [];
        return hits.length ? hits[0].point.y : fromY;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Next Free Plop Number
    // ------------------------------------------------------------
    function Na__VegDev__NextUidNumber(plops) {
        let highest = 0;
        plops.forEach((plop) => {
            const number = parseInt(String(plop.Vegetation__Plop__Uid || '').replace(/\D/g, ''), 10);
            if (number > highest) highest = number;
        });
        return highest + 1;
    }
    // ------------------------------------------------------------


    // FUNCTION | Make the Saved Plops of a Row Through a Point
    // ------------------------------------------------------------
    // Along the view's own right, level, so the row faces whoever asked for it. An
    // asset's width runs along the row (a turn of yaw about +Y carries its local x to
    // (cos, 0, -sin)). The sizes and turns vary a little, as the real tools' will.
    // ------------------------------------------------------------
    async function Na__VegDev__MakeRow(point, surfaces) {
        const devConfig = Na__VegDev__State.config.Vegetation__DevTools__Config;
        const count     = devConfig.Vegetation__DevTools__TestRowCount;
        const spacingM  = devConfig.Vegetation__DevTools__TestRowSpacingMm / 1000;
        const vary      = devConfig.Vegetation__DevTools__TestRowSizeVariationPercent / 100;
        const turn      = devConfig.Vegetation__DevTools__TestRowYawVariationDeg;
        const strokeUid = devConfig.Vegetation__DevTools__TestRowStrokeUid;

        const assets = await Na__VegLib__LoadAllAssets();
        const e = Na__VegDev__State.context.camera.matrixWorld.elements;
        let rx = e[0], rz = e[2];
        const length = Math.hypot(rx, rz);
        if (length < 1e-6) { rx = 1; rz = 0; } else { rx /= length; rz /= length; }
        const headingDeg = (Math.atan2(-rz, rx) * Na__VegDev__FULL_CIRCLE) / (2 * Math.PI);

        const existing = Na__VegData__Current().Vegetation__SceneData__Plops;
        let uidNumber  = Na__VegDev__NextUidNumber(existing);
        const row = [];
        for (let i = 0; i < count; i++) {
            const along = (i - (count - 1) / 2) * spacingM;
            const x = point.x + rx * along;
            const z = point.z + rz * along;
            const y = Na__VegDev__HeightUnder(x, point.y, z, surfaces);
            const asset = assets[i % assets.length];
            const size  = asset.Asset__Size;
            const scale = 1 + (Math.random() * 2 - 1) * vary;
            row.push({
                Vegetation__Plop__Uid        : 'A' + String(uidNumber++).padStart(4, '0'),
                Vegetation__Plop__AssetId    : asset.Asset__Id,
                Vegetation__Plop__Seed       : Math.floor(Math.random() * Na__VegDev__SEED_RANGE),
                Vegetation__Plop__PositionMm : [Na__Math__ConvertUnitsToMm(x), Na__Math__ConvertUnitsToMm(y), Na__Math__ConvertUnitsToMm(z)].map(Math.round),
                Vegetation__Plop__YawDeg     : Math.round(headingDeg + (Math.random() * 2 - 1) * turn),
                Vegetation__Plop__SizeMm     : [size.Size__WidthMm, size.Size__DepthMm, size.Size__HeightMm].map((mm) => Math.round(mm * scale)),
                Vegetation__Plop__StrokeUid  : strokeUid
            });
        }
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stop Waiting for a Click
    // ------------------------------------------------------------
    function Na__VegDev__Disarm() {
        if (!Na__VegDev__State.armed) return;
        const canvas = Na__VegDev__State.context.renderer.domElement;
        canvas.removeEventListener('pointerdown', Na__VegDev__HandlePointerDown);
        canvas.removeEventListener('pointerup', Na__VegDev__HandlePointerUp);
        window.removeEventListener('keydown', Na__VegDev__HandleKeyDown, true);
        canvas.style.cursor = Na__VegDev__State.priorCursor;
        Na__VegDev__State.armed       = false;
        Na__VegDev__State.pointerDown = false;
    }
    // ------------------------------------------------------------


    // HANDLERS | Press, Release and Escape
    // ------------------------------------------------------------
    function Na__VegDev__HandlePointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return;
        Na__VegDev__State.pointerDown = true;
        Na__VegDev__State.downX       = event.clientX;
        Na__VegDev__State.downY       = event.clientY;
    }
    async function Na__VegDev__HandlePointerUp(event) {
        if (!Na__VegDev__State.pointerDown) return;
        Na__VegDev__State.pointerDown = false;

        const threshold = Na__VegDev__State.config.Vegetation__DevTools__Config.Vegetation__DevTools__ClickThresholdPx;
        if (Math.abs(event.clientX - Na__VegDev__State.downX) > threshold || Math.abs(event.clientY - Na__VegDev__State.downY) > threshold) return;   // <-- An orbit, not a click

        const surfaces = Na__VegDev__ModelSurfaces();
        const point = Na__VegDev__PointAt(event.clientX, event.clientY, surfaces);
        if (!point) return;                                                    // <-- The sky: stay armed

        Na__VegDev__Disarm();
        Na__VegDev__State.busy = true;
        Na__VegDev__Render();
        try {
            const row = await Na__VegDev__MakeRow(point, surfaces);
            const runtime = await Na__VegDev__Runtime();
            await runtime.Na__VegRun__AddPlops(row);
            await Na__VegDev__SaveAndSay('Test row added.');
        } catch (error) {
            Na__VegDev__Toast('The test row could not be added: ' + (error && error.message), true);
        }
        Na__VegDev__State.busy = false;
        Na__VegDev__Render();
    }
    function Na__VegDev__HandleKeyDown(event) {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        Na__VegDev__Disarm();
        Na__VegDev__Render();
    }
    // ------------------------------------------------------------


    // FUNCTION | Wait for a Click on the Model, or Stop Waiting
    // ------------------------------------------------------------
    function Na__VegDev__ToggleTestRow() {
        if (Na__VegDev__State.armed) {
            Na__VegDev__Disarm();
            Na__VegDev__Render();
            return;
        }
        const canvas = Na__VegDev__State.context.renderer.domElement;
        Na__VegDev__State.priorCursor = canvas.style.cursor;
        canvas.style.cursor = 'crosshair';
        canvas.addEventListener('pointerdown', Na__VegDev__HandlePointerDown);
        canvas.addEventListener('pointerup', Na__VegDev__HandlePointerUp);
        window.addEventListener('keydown', Na__VegDev__HandleKeyDown, true);
        Na__VegDev__State.armed = true;
        Na__VegDev__Render();
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove Every Plant a Test Row Made
    // ------------------------------------------------------------
    async function Na__VegDev__RemoveTestPlants() {
        const strokeUid = Na__VegDev__State.config.Vegetation__DevTools__Config.Vegetation__DevTools__TestRowStrokeUid;
        const sceneData = Na__VegData__Current();
        Na__VegDev__State.busy = true;
        Na__VegDev__Render();
        try {
            sceneData.Vegetation__SceneData__Plops = sceneData.Vegetation__SceneData__Plops.filter((plop) => plop.Vegetation__Plop__StrokeUid !== strokeUid);
            const runtime = await Na__VegDev__Runtime();
            await runtime.Na__VegRun__SyncPlants();
            await Na__VegDev__SaveAndSay('Test plants removed.');
        } catch (error) {
            Na__VegDev__Toast('The test plants could not be removed: ' + (error && error.message), true);
        }
        Na__VegDev__State.busy = false;
        Na__VegDev__Render();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Panel
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Words for the Live Numbers
    // ------------------------------------------------------------
    async function Na__VegDev__WriteReadout() {
        const line = Na__VegDev__State.panel ? Na__VegDev__State.panel.querySelector('[data-na-vegetation="readout"]') : null;
        if (!line || !Na__Vegetation__IsActive()) return;
        const runtime = await Na__VegDev__Runtime();
        const stats = runtime.Na__VegRun__GetStats();
        if (!stats) return;
        line.textContent = stats.plants + ' plants, ' + stats.bushes + ' on the page. Last full redraw '
            + stats.lastFullMs.toFixed(0) + ' ms for ' + stats.lastFullDrawn + '. Buffers ' + stats.buffersMb.toFixed(0) + ' MB.';
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch the Project On or Off
    // ------------------------------------------------------------
    async function Na__VegDev__ToggleEnabled() {
        const turningOn = !Na__Vegetation__IsActive();
        Na__VegDev__Disarm();
        Na__VegDev__State.busy = true;
        Na__VegDev__Render();
        try {
            const result = await Na__Vegetation__SetEnabled(turningOn);
            const words = turningOn ? 'Vegetation on for this project.' : 'Vegetation off for this project.';
            if (result && result.ok) {
                Na__VegDev__Toast(words + ' Saved.', false);
            } else {
                Na__VegDev__Toast(words + ' Not saved: ' + ((result && result.error) || 'the server did not answer') + '.', true);
            }
        } catch (error) {
            Na__VegDev__Toast('Vegetation could not be switched: ' + (error && error.message), true);
        }
        Na__VegDev__State.busy = false;
        Na__VegDev__Render();
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Panel
    // ------------------------------------------------------------
    function Na__VegDev__Render() {
        const panel = Na__VegDev__State.panel;
        if (!panel) return;
        const isOn = Na__Vegetation__IsActive();
        const busy = Na__VegDev__State.busy;

        panel.innerHTML = '';
        panel.appendChild(Na__VegDev__El('div', 'na-dropdown-menu__panel-title', 'Vegetation'));
        panel.appendChild(Na__VegDev__El('p', 'na-fp-dev__empty', isOn
            ? 'On for this project. Clients see the plants too.'
            : 'Off for this project. Nothing loads and nothing draws.'));

        const switchRow = Na__VegDev__El('div', 'na-pm-dev__actions');
        const enable = Na__VegDev__Button(isOn ? 'Switch Off' : 'Switch On', isOn ? '' : 'na-pm-dev__btn--primary', Na__VegDev__ToggleEnabled);
        enable.disabled = busy;
        switchRow.appendChild(enable);
        panel.appendChild(switchRow);

        if (!isOn) return;

        const readout = Na__VegDev__El('p', 'na-fp-dev__empty');
        readout.setAttribute('data-na-vegetation', 'readout');
        panel.appendChild(readout);
        Na__VegDev__WriteReadout();

        if (Na__VegDev__State.armed) {
            panel.appendChild(Na__VegDev__El('p', 'na-fp-dev__empty', 'Click a place on the model for the middle of the row. Escape cancels.'));
        }

        const toolRow = Na__VegDev__El('div', 'na-pm-dev__actions');
        const addRow = Na__VegDev__Button(Na__VegDev__State.armed ? 'Cancel' : 'Add Test Row', Na__VegDev__State.armed ? 'na-pm-dev__btn--primary' : '', Na__VegDev__ToggleTestRow);
        addRow.disabled = busy;
        toolRow.appendChild(addRow);
        const remove = Na__VegDev__Button('Remove Test Plants', '', Na__VegDev__RemoveTestPlants);
        remove.disabled = busy;
        toolRow.appendChild(remove);
        panel.appendChild(toolRow);
    }
    // ------------------------------------------------------------


    // FUNCTION | Mount the Section
    // ------------------------------------------------------------
    async function Na__VegDev__Initialize(context) {
        const menuItem = document.getElementById(Na__VegDev__ITEM_ID);
        const toggle   = document.getElementById(Na__VegDev__TOGGLE_ID);
        const panel    = document.getElementById(Na__VegDev__PANEL_ID);
        if (!menuItem || !toggle || !panel) return false;                      // <-- Markup absent: nothing to mount into

        Na__VegDev__State.context = context;
        Na__VegDev__State.panel   = panel;
        Na__VegDev__State.toggle  = toggle;
        Na__VegDev__State.config  = await Na__VegData__LoadConfig();

        menuItem.style.display = '';                                           // <-- Reveal alongside the other dev tools

        toggle.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);
            toggle.setAttribute('aria-expanded', String(!isOpen));
            if (!isOpen) {
                Na__VegDev__Render();                                          // <-- Rebuild on each open so the state is fresh
                Na__VegDev__State.readout = window.setInterval(Na__VegDev__WriteReadout, Na__VegDev__READOUT_MS);
            } else {
                Na__VegDev__Disarm();
                window.clearInterval(Na__VegDev__State.readout);
            }
        });
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Dev Controls API
    // ------------------------------------------------------------
    export {
        Na__VegDev__Initialize
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
