/* =============================================================================
   PAINTERLYNPR - ART DIRECTION | INFLUENCE POINTS - POINT LIST
   =============================================================================

   FILE       : PainterlyNPR__Interface__PointList__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : ArtDirection - InfluencePoints - PointList
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The points list in the Art direction tab: rows, groups, their eyes
                and names
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - A hidden group still acts on the drawing; it only leaves the sheet.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Interface
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import { PainterlyNPR__Engine__MAX_POINTS as MAX_POINTS } from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_CLASSES as MATERIAL_CLASSES } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__ArtDirection__LINE_CONTROL_PRESETS  as  LINE_CONTROL_PRESETS,
    PainterlyNPR__ArtDirection__POINT_TYPES           as  POINT_TYPES,
} from './PainterlyNPR__ArtDirection__Points__.mjs';
import {
    PainterlyNPR__Interface__PointById,
    PainterlyNPR__Interface__PointChanged,
    PainterlyNPR__Interface__PointNumber,
    PainterlyNPR__Interface__PointTargetText,
    PainterlyNPR__Interface__RefreshPointInputs,
    PainterlyNPR__Interface__RemovePoint,
    PainterlyNPR__Interface__SelectPoint,
    PainterlyNPR__Interface__SetPointValue,
    PainterlyNPR__Interface__TogglePoint,
    PainterlyNPR__Interface__POINT_ADVANCED  as  POINT_ADVANCED,
    PainterlyNPR__Interface__POINT_CONTROLS  as  POINT_CONTROLS,
    PainterlyNPR__Interface__POINT_HINTS     as  POINT_HINTS,
    PainterlyNPR__Interface__POINT_SELECTS   as  POINT_SELECTS,
} from './PainterlyNPR__Interface__PointControls__.mjs';
import { PainterlyNPR__Interface__UpdateOverlay } from './PainterlyNPR__Interface__PointOverlay__.mjs';
import {
    PainterlyNPR__Interface__Query     as  $,
    PainterlyNPR__Interface__QueryAll  as  $$,
    PainterlyNPR__Interface__Ui        as  Ui,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Interface__INFO_EYE as INFO_EYE } from '../80__System__HudOverlay/PainterlyNPR__Interface__Folds__.mjs';
import { PainterlyNPR__Interface__UpdateSettingsJson } from '../85__System__ProjectPersistence/PainterlyNPR__Interface__SettingsJson__.mjs';
import { PainterlyNPR__TypeIn__Register } from '../80__System__HudOverlay/PainterlyNPR__Interface__TypeIn__.mjs';

// =============================================================================
// REGION | Influence Points - Point List
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Interface
// -----------------------------------------------------------------------------

    // FUNCTION | The Points List in the Art Direction Tab
    // ------------------------------------------------------------
    // One compact row a point - number, type, what it acts on, on/off, remove -
    // and only the selected point's row open with its controls. Click a row to
    // edit that point; hover one to find its handle on the sheet.
    function PainterlyNPR__Interface__RenderPointList() {
        const list  =  $('#PainterlyNPR__App__PointList');
        list.innerHTML  =  '';
        if (!PainterlyNPR__Interface__PointById(Ui.SelectedPointId)) Ui.SelectedPointId = null;
        if (!State.Points.length) {
            list.innerHTML  =  '<p class="PainterlyNPR__Hint">No points. Add one, then click the sheet where it should act.</p>';
            return;
        }
        const count  =  document.createElement('p');
        count.className  =  'PainterlyNPR__PointList__Count';
        count.textContent  =  `${State.Points.length} of ${MAX_POINTS} points · ${Ui.SelectedPointId === null ? 'click one, here or on the sheet, to edit it' : 'Delete removes, Ctrl+D duplicates, [ ] size'}`;
        const anyShown  =  State.Points.some(p => p.Visible !== false);
        count.insertAdjacentHTML('beforeend', PainterlyNPR__Interface__EyeButton(anyShown, 'data-visible-all', anyShown ? 'Hide every point on the sheet - they all still act' : 'Show every point on the sheet'));
        count.querySelector('[data-visible-all]').addEventListener('click', () => PainterlyNPR__Interface__SetPointsVisible(State.Points, !anyShown));
        list.appendChild(count);
        const groups  =  [...new Set(State.Points.map(p => p.Group || '').filter(Boolean))];
        const cards   =  new Map();
        for (const point of State.Points) {
            const object    =  Scene.ObjectById.get(point.ObjectId);
            const selected  =  point.Id === Ui.SelectedPointId;
            const on        =  point.Enabled !== false;
            const visible   =  point.Visible !== false;
            const card      =  document.createElement('div');
            card.className  =  'PainterlyNPR__PointCard' + (selected ? ' PainterlyNPR__PointCard--selected' : '') + (on ? '' : ' PainterlyNPR__PointCard--off');
            card.dataset.type     =  point.Type;
            card.dataset.pointId  =  point.Id;
            const anchorText  =  point.Anchor === 'Object' && object ? `on ${object.Name}` : 'on the paper';
            const head  =  `
                <div class="PainterlyNPR__PointCard__Head" title="${selected ? 'Close' : 'Edit this point'}">
                    <span class="PainterlyNPR__PointCard__Number">${PainterlyNPR__Interface__PointNumber(point)}</span>
                    <span class="PainterlyNPR__PointCard__Glyph">${POINT_TYPES[point.Type].Glyph}</span>
                    <strong>${POINT_TYPES[point.Type].Label}</strong>
                    <span class="PainterlyNPR__PointCard__Meta">${PainterlyNPR__Interface__PointTargetText(point)} · ${anchorText}</span>
                    ${PainterlyNPR__Interface__EyeButton(visible, 'data-visible-point', visible ? 'Hide on the sheet - it still acts' : 'Show on the sheet')}
                    <button type="button" class="PainterlyNPR__IconButton PainterlyNPR__PointCard__Toggle" data-toggle-point title="${on ? 'Switch off - keep it, out of the drawing' : 'Switch on'}">${on ? '◉' : '○'}</button>
                    <button type="button" class="PainterlyNPR__IconButton" data-remove title="Remove this point">×</button>
                </div>`;
            if (!selected) {
                card.innerHTML  =  head;
            } else {
                const slider  =  ([key, label, min, max, step, format]) => `
                    <label class="PainterlyNPR__Field">
                        <span class="PainterlyNPR__Field__Label">${label}</span>
                        <input type="range" min="${min}" max="${max}" step="${step}" value="${point[key]}" data-point-key="${key}" data-for-point="${point.Id}">
                        <output>${format(point[key])}</output>
                    </label>`;
                const presets   =  point.Type === 'LineControl' ? `<div class="PainterlyNPR__ChipRow">${Object.entries(LINE_CONTROL_PRESETS).map(([k, p]) => `<button type="button" class="PainterlyNPR__Chip" data-line-preset="${k}">${p.Label}</button>`).join('')}</div>` : '';
                const advanced  =  POINT_ADVANCED[point.Type] ? `<details class="PainterlyNPR__PointCard__Advanced"><summary>Advanced</summary>${POINT_ADVANCED[point.Type].map(slider).join('')}</details>` : '';
                card.innerHTML  =  `${head}
                    <div class="PainterlyNPR__PointCard__Body">
                        <label class="PainterlyNPR__Field">
                            <span class="PainterlyNPR__Field__Label">Acts on</span>
                            <select data-target-select>
                                <option value="Area"${point.Target === 'Area' ? ' selected' : ''}>The area</option>
                                <option value="Object"${point.Target === 'Object' ? ' selected' : ''}${object ? '' : ' disabled'}>${object ? object.Name : 'An object (drop it on one)'}</option>
                                <option value="Material"${point.Target === 'Material' ? ' selected' : ''}${point.MaterialId >= 0 ? '' : ' disabled'}>${point.MaterialId >= 0 ? `All ${MATERIAL_CLASSES[point.MaterialId].Label.toLowerCase()}` : 'A material'}</option>
                            </select>
                        </label>
                        <label class="PainterlyNPR__Field">
                            <span class="PainterlyNPR__Field__Label">Group</span>
                            <select data-group-select>
                                <option value=""${point.Group ? '' : ' selected'}>None</option>
                                ${groups.map(g => `<option value="${PainterlyNPR__Interface__Escape(g)}"${point.Group === g ? ' selected' : ''}>${PainterlyNPR__Interface__Escape(g)}</option>`).join('')}
                                <option value="__new">New group …</option>
                            </select>
                        </label>
                        ${(POINT_SELECTS[point.Type] || []).map(([key, label, options]) => `
                        <label class="PainterlyNPR__Field">
                            <span class="PainterlyNPR__Field__Label">${label}</span>
                            <select data-point-select="${key}">${options.map(([value, text]) => `<option value="${value}"${point[key] === value ? ' selected' : ''}>${text}</option>`).join('')}</select>
                        </label>`).join('')}
                        ${presets}
                        ${POINT_CONTROLS[point.Type].map(slider).join('')}
                        ${advanced}
                        ${POINT_HINTS[point.Type] ? `<p class="PainterlyNPR__Hint">${POINT_HINTS[point.Type]}</p>` : ''}
                    </div>`;
            }
            card.querySelector('.PainterlyNPR__PointCard__Head').addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                PainterlyNPR__Interface__SelectPoint(selected ? null : point.Id, !selected);
            });
            card.querySelector('[data-remove]').addEventListener('click', () => PainterlyNPR__Interface__RemovePoint(point.Id));
            card.querySelector('[data-toggle-point]').addEventListener('click', () => PainterlyNPR__Interface__TogglePoint(point.Id));
            card.querySelector('[data-visible-point]').addEventListener('click', () => PainterlyNPR__Interface__SetPointsVisible([point], !visible));
            card.addEventListener('mouseenter', () => { const h = Ui.Points.querySelector(`.PainterlyNPR__Handle[data-point-id="${point.Id}"]`); if (h) h.classList.add('PainterlyNPR__Handle--hover'); });
            card.addEventListener('mouseleave', () => { const h = Ui.Points.querySelector(`.PainterlyNPR__Handle[data-point-id="${point.Id}"]`); if (h) h.classList.remove('PainterlyNPR__Handle--hover'); });
            if (selected) {
                for (const menu of $$('[data-point-select]', card)) {
                    menu.addEventListener('change', () => { point[menu.dataset.pointSelect] = menu.value; PainterlyNPR__Interface__PointChanged(); });
                }
                const groupSelect  =  card.querySelector('[data-group-select]');
                groupSelect.addEventListener('change', () => {
                    point.Group  =  groupSelect.value === '__new' ? PainterlyNPR__Interface__NextGroupName() : groupSelect.value;
                    PainterlyNPR__Interface__RenderPointList();
                    PainterlyNPR__Interface__UpdateSettingsJson();
                });
                const target  =  card.querySelector('[data-target-select]');
                target.addEventListener('change', () => {
                    point.Target  =  target.value;
                    PainterlyNPR__Interface__RenderPointList();
                    PainterlyNPR__Interface__UpdateOverlay();
                    PainterlyNPR__Interface__PointChanged();
                });
                for (const chip of $$('[data-line-preset]', card)) {
                    chip.addEventListener('click', () => {
                        Object.assign(point, LINE_CONTROL_PRESETS[chip.dataset.linePreset].Values);
                        for (const menu of $$('[data-point-select]', card)) menu.value = point[menu.dataset.pointSelect];
                        PainterlyNPR__Interface__RefreshPointInputs(point, null);
                        PainterlyNPR__Interface__UpdateOverlay();
                        PainterlyNPR__Interface__PointChanged();
                    });
                }
                const rows  =  [...POINT_CONTROLS[point.Type], ...(POINT_ADVANCED[point.Type] || [])];
                for (const input of $$('[data-point-key]', card)) {
                    const row  =  rows.find(r => r[0] === input.dataset.pointKey);
                    if (row) PainterlyNPR__TypeIn__Register(input, row[5]);      // <-- Its readout can be typed into
                    input.addEventListener('input', () => PainterlyNPR__Interface__SetPointValue(point, input.dataset.pointKey, parseFloat(input.value), input));
                }
            }
            cards.set(point.Id, card);
        }
        // The points with no group first, then each group under its header, in
        // the order the groups were first made
        for (const point of State.Points) if (!point.Group) list.appendChild(cards.get(point.Id));
        for (const name of groups) {
            const members  =  State.Points.filter(p => p.Group === name);
            list.appendChild(PainterlyNPR__Interface__GroupHeader(name, members));
            const box  =  document.createElement('div');
            box.className  =  'PainterlyNPR__PointGroup';
            for (const point of members) box.appendChild(cards.get(point.Id));
            list.appendChild(box);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Groups and Visibility - a group's header, the eye, a new name
    // ------------------------------------------------------------
    // A group is a name its points share, so it travels with them in the
    // settings. Its header renames it, shows or hides all of it, switches all
    // of it on or off, and ungroups it (the points stay). Hiding is only for
    // the sheet: a hidden point still acts on the drawing, and shows again
    // while it is the point being edited.
    function PainterlyNPR__Interface__Escape(text) {
        return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function PainterlyNPR__Interface__EyeButton(shown, attribute, title) {
        return `<button type="button" class="PainterlyNPR__IconButton PainterlyNPR__EyeButton${shown ? '' : ' PainterlyNPR__EyeButton--off'}" ${attribute} title="${title}" aria-pressed="${!shown}">${INFO_EYE}</button>`;
    }

    function PainterlyNPR__Interface__NextGroupName() {
        const used  =  new Set(State.Points.map(p => p.Group));
        let n  =  1;
        while (used.has(`Group ${n}`)) n++;
        return `Group ${n}`;
    }

    function PainterlyNPR__Interface__SetPointsVisible(points, visible) {
        for (const point of points) point.Visible = visible;
        PainterlyNPR__Interface__RenderPointList();
        PainterlyNPR__Interface__UpdateOverlay();
        PainterlyNPR__Interface__UpdateSettingsJson();
    }

    function PainterlyNPR__Interface__GroupHeader(name, members) {
        const shown  =  members.some(p => p.Visible !== false);
        const on     =  members.some(p => p.Enabled !== false);
        const head   =  document.createElement('div');
        head.className  =  'PainterlyNPR__GroupHead';
        head.innerHTML  =  `
            <input type="text" class="PainterlyNPR__GroupHead__Name" value="${PainterlyNPR__Interface__Escape(name)}" aria-label="Group name" spellcheck="false">
            <span class="PainterlyNPR__GroupHead__Count">${members.length}</span>
            ${PainterlyNPR__Interface__EyeButton(shown, 'data-group-visible', shown ? 'Hide the group on the sheet - it still acts' : 'Show the group on the sheet')}
            <button type="button" class="PainterlyNPR__IconButton" data-group-enabled title="${on ? 'Switch the group off - kept, out of the drawing' : 'Switch the group on'}">${on ? '◉' : '○'}</button>
            <button type="button" class="PainterlyNPR__IconButton" data-group-ungroup title="Ungroup - the points stay">⊟</button>`;
        const input  =  head.querySelector('input');
        input.addEventListener('change', () => {
            const next  =  input.value.trim();
            if (next && next !== name && !State.Points.some(p => p.Group === next)) for (const point of members) point.Group = next;
            PainterlyNPR__Interface__RenderPointList();
            PainterlyNPR__Interface__UpdateSettingsJson();
        });
        input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') input.blur(); });   // <-- Typing a name never reaches the sheet's shortcuts
        head.querySelector('[data-group-visible]').addEventListener('click', () => PainterlyNPR__Interface__SetPointsVisible(members, !shown));
        head.querySelector('[data-group-enabled]').addEventListener('click', () => {
            for (const point of members) point.Enabled = !on;
            PainterlyNPR__Interface__RenderPointList();
            PainterlyNPR__Interface__UpdateOverlay();
            PainterlyNPR__Interface__PointChanged();
        });
        head.querySelector('[data-group-ungroup]').addEventListener('click', () => {
            for (const point of members) point.Group = '';
            PainterlyNPR__Interface__RenderPointList();
            PainterlyNPR__Interface__UpdateSettingsJson();
        });
        return head;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__RenderPointList,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
