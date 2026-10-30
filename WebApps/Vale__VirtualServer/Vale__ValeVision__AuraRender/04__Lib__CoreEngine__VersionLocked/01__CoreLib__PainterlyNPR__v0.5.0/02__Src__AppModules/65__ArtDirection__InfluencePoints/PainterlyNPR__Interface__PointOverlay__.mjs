/* =============================================================================
   PAINTERLYNPR - ART DIRECTION | INFLUENCE POINTS - OVERLAY
   =============================================================================

   FILE       : PainterlyNPR__Interface__PointOverlay__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : ArtDirection - InfluencePoints - Overlay
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The points over the sheet: handles and rings, the selected point's
                node of sliders, and the drags that move, size, flatten and turn a
                point
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Only the handles take the pointer; the layer covers the sheet exactly.

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
import {
    PainterlyNPR__Engine__DEG              as  DEG,
    PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
    PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__Maths__Clamp as Clamp } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import {
    PainterlyNPR__ArtDirection__AnchorAt,
    PainterlyNPR__ArtDirection__POINT_TYPES  as  POINT_TYPES,
} from './PainterlyNPR__ArtDirection__Points__.mjs';
import {
    PainterlyNPR__Interface__CycleTarget,
    PainterlyNPR__Interface__DuplicatePoint,
    PainterlyNPR__Interface__PointById,
    PainterlyNPR__Interface__PointChanged,
    PainterlyNPR__Interface__PointNumber,
    PainterlyNPR__Interface__PointTargetText,
    PainterlyNPR__Interface__RefreshPointInputs,
    PainterlyNPR__Interface__RemovePoint,
    PainterlyNPR__Interface__SelectPoint,
    PainterlyNPR__Interface__SetPointValue,
    PainterlyNPR__Interface__TogglePoint,
    PainterlyNPR__Interface__POINT_CONTROLS  as  POINT_CONTROLS,
} from './PainterlyNPR__Interface__PointControls__.mjs';
import { PainterlyNPR__Interface__RenderPointList } from './PainterlyNPR__Interface__PointList__.mjs';
import { PainterlyNPR__Interface__SheetMm } from '../80__System__HudOverlay/PainterlyNPR__Interface__CameraControls__.mjs';
import {
    PainterlyNPR__Interface__Query     as  $,
    PainterlyNPR__Interface__QueryAll  as  $$,
    PainterlyNPR__Interface__Ui        as  Ui,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';

// =============================================================================
// REGION | Influence Points - Overlay
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Interface
// -----------------------------------------------------------------------------

    // FUNCTION | Draw the Points' Handles and Rings Over the Sheet
    // ------------------------------------------------------------
    // Every point shows its grip and number; only the selected one shows its
    // full ring, its size dot, a Hatch point's direction knob and its node of
    // sliders. The others' rings stay faint, so the sheet is not a tangle of
    // circles.
    function PainterlyNPR__Interface__UpdateOverlay() {
        const layer  =  Ui.Points;
        const show   =  Ui.ActiveTab === 'ArtDirection' || State.ShowInfluence;
        layer.hidden  =  !show;
        if (!show) return;
        const kx     =  Ui.Canvas.offsetWidth / SHEET_WIDTH_MM, ky = Ui.Canvas.offsetHeight / SHEET_HEIGHT_MM;
        const seen   =  new Set();
        for (const point of State.Points) {
            seen.add(String(point.Id));
            let el  =  layer.querySelector(`.PainterlyNPR__Handle[data-point-id="${point.Id}"]`);
            if (!el) {
                el  =  document.createElement('div');
                el.className  =  'PainterlyNPR__Handle';
                el.dataset.pointId  =  point.Id;
                el.innerHTML  =  '<div class="PainterlyNPR__Handle__Ring"></div>'
                              +  '<button type="button" class="PainterlyNPR__Handle__Size" title="Drag to size and turn the point ( [ and ] size it too )"></button>'
                              +  '<button type="button" class="PainterlyNPR__Handle__Shape" title="Drag in to flatten the point into an ellipse, out to round it"></button>'
                              +  '<button type="button" class="PainterlyNPR__Handle__Grip"><span class="PainterlyNPR__Handle__Glyph"></span><span class="PainterlyNPR__Handle__Number"></span></button>'
                              +  (point.Type === 'Hatch' ? '<button type="button" class="PainterlyNPR__Handle__Knob" title="Hatch direction - drag to turn"></button>' : '');
                el.querySelector('.PainterlyNPR__Handle__Grip').addEventListener('pointerdown', (e) => PainterlyNPR__Interface__StartPointDrag(e, point.Id));
                el.querySelector('.PainterlyNPR__Handle__Size').addEventListener('pointerdown', (e) => PainterlyNPR__Interface__StartSizeDrag(e, point.Id));
                el.querySelector('.PainterlyNPR__Handle__Shape').addEventListener('pointerdown', (e) => PainterlyNPR__Interface__StartShapeDrag(e, point.Id));
                const knob  =  el.querySelector('.PainterlyNPR__Handle__Knob');
                if (knob) knob.addEventListener('pointerdown', (e) => PainterlyNPR__Interface__StartKnobDrag(e, point.Id));
                layer.appendChild(el);
            }
            const selected  =  point.Id === Ui.SelectedPointId;
            el.dataset.type  =  point.Type;
            el.classList.toggle('PainterlyNPR__Handle--selected', selected);
            el.classList.toggle('PainterlyNPR__Handle--off', point.Enabled === false);
            el.classList.toggle('PainterlyNPR__Handle--hidden', point.Visible === false && !selected);
            el.style.left  =  `${point.PaperMm[0] * kx}px`;
            el.style.top   =  `${(SHEET_HEIGHT_MM - point.PaperMm[1]) * ky}px`;
            el.style.zIndex  =  selected ? 2 : 1;
            const ring  =  el.querySelector('.PainterlyNPR__Handle__Ring');
            // An ellipse: long axis along Turn (the sheet's y is up, the screen's down,
            // so the screen turns the other way), the short axis Shape of it
            const turn   =  point.Turn || 0, shape = point.Shape == null ? 1 : point.Shape;
            const major  =  (turn + (Ui.SizeSide.get(point.Id) || 0)) * DEG, R = point.RadiusMm * kx;
            ring.style.width   =  `${R * 2}px`;
            ring.style.height  =  `${R * 2 * shape}px`;
            ring.style.transform  =  `translate(-50%, -50%) rotate(${-turn}deg)`;
            const size  =  el.querySelector('.PainterlyNPR__Handle__Size');
            size.style.left  =  `${Math.cos(major) * R}px`;
            size.style.top   =  `${-Math.sin(major) * R}px`;
            const flat  =  el.querySelector('.PainterlyNPR__Handle__Shape');
            flat.style.left  =  `${-Math.sin(turn * DEG) * R * shape}px`;
            flat.style.top   =  `${-Math.cos(turn * DEG) * R * shape}px`;
            if (point.Type === 'Hatch') {
                // Stripes along the hatch (the sheet's y is up, the screen's down), the knob on the ring
                const a  =  (point.HatchAngle + (Ui.KnobSide.get(point.Id) || 0)) * DEG, r = point.RadiusMm * kx;
                ring.classList.add('PainterlyNPR__Handle__Ring--stripes');
                ring.style.background  =  `repeating-linear-gradient(${turn - point.HatchAngle}deg, transparent 0 7px, rgba(122, 95, 163, 0.3) 7px 8.5px)`;   // <-- Undoes the ring's own turn, so the stripes stay true
                const knob  =  el.querySelector('.PainterlyNPR__Handle__Knob');
                knob.style.left  =  `${Math.cos(a) * r}px`;
                knob.style.top   =  `${-Math.sin(a) * r}px`;
            }
            const number  =  PainterlyNPR__Interface__PointNumber(point);
            el.querySelector('.PainterlyNPR__Handle__Glyph').textContent   =  POINT_TYPES[point.Type].Glyph;
            el.querySelector('.PainterlyNPR__Handle__Number').textContent  =  number;
            el.querySelector('.PainterlyNPR__Handle__Grip').title  =  `${number} · ${POINT_TYPES[point.Type].Label}${point.Enabled === false ? ' (off)' : ''} - click to edit, drag to move, Alt-drag to duplicate`;
        }
        for (const el of $$('.PainterlyNPR__Handle', layer)) if (!seen.has(el.dataset.pointId)) el.remove();
        PainterlyNPR__Interface__PlacePointNode(kx, ky);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Node - the selected point's own sliders, on the sheet beside it
    // ------------------------------------------------------------
    // After DxO's Color Efex Pro: the point's sliders hang beside the point
    // itself while it is edited, the first one its size, and fold to that one
    // alone. Built once per point (and when what it shows changes), then only
    // moved, so a slider being dragged is never rebuilt under the pointer. It
    // sits clear of the point's whole ring - its turned ellipse's extent - so
    // the point and the dots on the ring are never under it: to the right, the
    // left, below or above, and on a ring nearly the sheet's size in the corner
    // farthest from the point. While it is held it stays put, so a slider never
    // runs away as the ring grows; the pointer on it never orbits the camera.
    function PainterlyNPR__Interface__PlacePointNode(kx, ky) {
        const layer  =  Ui.Points;
        const point  =  PainterlyNPR__Interface__PointById(Ui.SelectedPointId);
        let node     =  $('.PainterlyNPR__Node', layer);
        if (!point) { if (node) node.remove(); Ui.NodeKey = ''; return; }
        const key  =  [point.Id, point.Target, point.Enabled !== false, Ui.NodeCollapsed, PainterlyNPR__Interface__PointNumber(point)].join(':');
        if (!node || Ui.NodeKey !== key) {
            if (node) node.remove();
            node  =  PainterlyNPR__Interface__BuildPointNode(point);
            layer.appendChild(node);
            Ui.NodeKey  =  key;
        }
        node.dataset.type  =  point.Type;
        const px = point.PaperMm[0] * kx, py = (SHEET_HEIGHT_MM - point.PaperMm[1]) * ky;
        if (Ui.NodeHeld && node.style.left) return;
        const w  =  node.offsetWidth, h = node.offsetHeight, W = layer.clientWidth, H = layer.clientHeight;
        const R  =  point.RadiusMm * kx, shape = point.Shape == null ? 1 : point.Shape, turn = (point.Turn || 0) * DEG;
        const ex  =  Math.hypot(R * Math.cos(turn), R * shape * Math.sin(turn)) + 14;   // <-- The turned ellipse's half extents, plus a dot's size and a gap
        const ey  =  Math.hypot(R * Math.sin(turn), R * shape * Math.cos(turn)) + 14;
        const fits  =  ([l, t]) => l >= 6 && t >= 6 && l + w <= W - 6 && t + h <= H - 6;
        const side  =  Clamp(py - 18, 6, Math.max(6, H - h - 6)), mid = Clamp(px - w / 2, 6, Math.max(6, W - w - 6));
        const spot  =  [[px + ex, side], [px - ex - w, side], [mid, py + ey], [mid, py - ey - h]].find(fits)
                    || [px < W / 2 ? Math.max(6, W - w - 6) : 6, py < H / 2 ? Math.max(6, H - h - 6) : 6];
        node.style.left  =  `${spot[0]}px`;
        node.style.top   =  `${spot[1]}px`;
    }

    // Faint until used: the node fades back so the painting shows through it, and
    // wakes - nearly opaque - under the pointer, at a touch, or with keyboard
    // focus. A touch has no hover, so it keeps the node awake a moment after the
    // finger lifts; the moment survives the node being rebuilt under the finger.
    const NODE_AWAKE_MS  =  2500;

    function PainterlyNPR__Interface__WakeNode(node) {
        node.classList.add('PainterlyNPR__Node--awake');
        Ui.NodeAwakeUntil  =  performance.now() + NODE_AWAKE_MS;
        clearTimeout(Ui.NodeSleep);
        Ui.NodeSleep  =  setTimeout(() => { const live = $('.PainterlyNPR__Node'); if (live) live.classList.remove('PainterlyNPR__Node--awake'); }, NODE_AWAKE_MS);
    }

    function PainterlyNPR__Interface__BuildPointNode(point) {
        const node     =  document.createElement('div');
        node.className  =  'PainterlyNPR__Node';
        const specs    =  Ui.NodeCollapsed ? POINT_CONTROLS[point.Type].slice(0, 1) : POINT_CONTROLS[point.Type];
        const on       =  point.Enabled !== false;
        node.innerHTML  =  `
            <div class="PainterlyNPR__Node__Head">
                <span class="PainterlyNPR__Node__Badge">${PainterlyNPR__Interface__PointNumber(point)}</span>
                <span class="PainterlyNPR__Node__Glyph">${POINT_TYPES[point.Type].Glyph}</span>
                <strong class="PainterlyNPR__Node__Title">${POINT_TYPES[point.Type].Label}</strong>
                <button type="button" class="PainterlyNPR__Node__Icon" data-node-act="Collapse" title="${Ui.NodeCollapsed ? 'Show every slider' : 'Fold to the size slider'}">${Ui.NodeCollapsed ? '▸' : '▾'}</button>
            </div>
            <div class="PainterlyNPR__Node__Bar">
                <button type="button" class="PainterlyNPR__Node__Chip" data-node-act="Target" title="What it acts on - click to step through the area, the object and its material">${PainterlyNPR__Interface__PointTargetText(point)}</button>
                <button type="button" class="PainterlyNPR__Node__Icon${on ? '' : ' PainterlyNPR__Node__Icon--off'}" data-node-act="Enabled" title="${on ? 'Switch off - keep it, out of the drawing (H)' : 'Switch on (H)'}">${on ? '◉' : '○'}</button>
                <button type="button" class="PainterlyNPR__Node__Icon" data-node-act="Duplicate" title="Duplicate (Ctrl+D, or Alt-drag the point)">⧉</button>
                <button type="button" class="PainterlyNPR__Node__Icon" data-node-act="Remove" title="Remove (Delete)">×</button>
            </div>
            ${specs.map(([key, label, min, max, step, format]) => `
            <label class="PainterlyNPR__Node__Row">
                <span class="PainterlyNPR__Node__Label">${label}</span>
                <input type="range" min="${min}" max="${max}" step="${step}" value="${point[key]}" data-point-key="${key}" data-for-point="${point.Id}">
                <output>${format(point[key])}</output>
            </label>`).join('')}`;
        // The node is not the sheet: no orbit, no zoom, no deselect from in here
        for (const type of ['pointerdown', 'wheel', 'dblclick']) node.addEventListener(type, (e) => e.stopPropagation());
        for (const type of ['pointerdown', 'pointerup', 'input']) node.addEventListener(type, () => PainterlyNPR__Interface__WakeNode(node));
        node.addEventListener('pointerdown', () => {
            Ui.NodeHeld  =  true;
            window.addEventListener('pointerup', () => { Ui.NodeHeld = false; PainterlyNPR__Interface__UpdateOverlay(); }, { once: true });   // <-- Let go: now it may move clear
        });
        if (performance.now() < (Ui.NodeAwakeUntil || 0)) node.classList.add('PainterlyNPR__Node--awake');
        for (const input of $$('[data-point-key]', node)) {
            input.addEventListener('input', () => PainterlyNPR__Interface__SetPointValue(point, input.dataset.pointKey, parseFloat(input.value), input));
        }
        for (const button of $$('[data-node-act]', node)) {
            button.addEventListener('click', () => {
                const act  =  button.dataset.nodeAct;
                if (act === 'Collapse') { Ui.NodeCollapsed = !Ui.NodeCollapsed; PainterlyNPR__Interface__UpdateOverlay(); }
                else if (act === 'Target') PainterlyNPR__Interface__CycleTarget(point);
                else if (act === 'Enabled') PainterlyNPR__Interface__TogglePoint(point.Id);
                else if (act === 'Duplicate') PainterlyNPR__Interface__DuplicatePoint(point.Id);
                else if (act === 'Remove') PainterlyNPR__Interface__RemovePoint(point.Id);
            });
        }
        return node;
    }
    // ------------------------------------------------------------


    // FUNCTION | Drag a Point - a click selects it, Alt-drag drags off a copy
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__StartPointDrag(event, id) {
        event.preventDefault();
        event.stopPropagation();
        if (event.button !== 0) return;
        let point  =  PainterlyNPR__Interface__PointById(id);
        if (!point) return;
        if (event.altKey) point = PainterlyNPR__Interface__DuplicatePoint(id, false) || point;
        if (Ui.SelectedPointId !== point.Id) PainterlyNPR__Interface__SelectPoint(point.Id, true);
        const start  =  { X: event.clientX, Y: event.clientY };
        let moved    =  false;
        const move  =  (e) => {
            if (!moved && Math.hypot(e.clientX - start.X, e.clientY - start.Y) < 3) return;
            moved  =  true;
            const [x, y]  =  PainterlyNPR__Interface__SheetMm(e);
            point.PaperMm  =  [Clamp(x, 0, SHEET_WIDTH_MM), Clamp(y, 0, SHEET_HEIGHT_MM)];
            PainterlyNPR__Interface__UpdateOverlay();
        };
        const up  =  (e) => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            if (!moved) return;
            const [x, y]  =  PainterlyNPR__Interface__SheetMm(e);
            PainterlyNPR__ArtDirection__AnchorAt(point, Clamp(x, 0, SHEET_WIDTH_MM), Clamp(y, 0, SHEET_HEIGHT_MM));
            Ui.NodeKey  =  '';                                                  // <-- What it acts on may have changed under it
            PainterlyNPR__Interface__RenderPointList();
            PainterlyNPR__Interface__UpdateOverlay();
            PainterlyNPR__Interface__PointChanged();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }
    // ------------------------------------------------------------


    // FUNCTION | Size and Turn a Point by the Dot on Its Long Axis
    // ------------------------------------------------------------
    // The distance is the radius, the direction the turn. An ellipse has no head
    // or tail, so the turn is kept in 0-180 degrees and the dot stays on the
    // side of the ring the pointer is.
    function PainterlyNPR__Interface__StartSizeDrag(event, id) {
        event.preventDefault();
        event.stopPropagation();
        const point  =  PainterlyNPR__Interface__PointById(id);
        if (!point) return;
        const move  =  (e) => {
            const [x, y]  =  PainterlyNPR__Interface__SheetMm(e);
            const raw     =  (Math.atan2(y - point.PaperMm[1], x - point.PaperMm[0]) / DEG + 360) % 360;
            point.Turn    =  Math.round(raw % 180) % 180;
            Ui.SizeSide.set(point.Id, raw >= 180 ? 180 : 0);
            point.RadiusMm  =  Clamp(Math.round(Math.hypot(x - point.PaperMm[0], y - point.PaperMm[1])), 10, 140);
            PainterlyNPR__Interface__RefreshPointInputs(point, null);
            PainterlyNPR__Interface__UpdateOverlay();
        };
        const up  =  () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            PainterlyNPR__Interface__PointChanged();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }
    // ------------------------------------------------------------


    // FUNCTION | Flatten a Point Into an Ellipse by the Dot on Its Short Axis
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__StartShapeDrag(event, id) {
        event.preventDefault();
        event.stopPropagation();
        const point  =  PainterlyNPR__Interface__PointById(id);
        if (!point) return;
        const move  =  (e) => {
            const [x, y]  =  PainterlyNPR__Interface__SheetMm(e);
            const t       =  (point.Turn || 0) * DEG;
            const across  =  Math.abs(-Math.sin(t) * (x - point.PaperMm[0]) + Math.cos(t) * (y - point.PaperMm[1]));   // <-- Along the short axis only
            point.Shape   =  Math.round(Clamp(across / Math.max(point.RadiusMm, 1), 0.2, 1) * 100) / 100;
            PainterlyNPR__Interface__RefreshPointInputs(point, null);
            PainterlyNPR__Interface__UpdateOverlay();
        };
        const up  =  () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            PainterlyNPR__Interface__PointChanged();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }
    // ------------------------------------------------------------


    // FUNCTION | Turn a Hatch Point's Direction by Its Knob
    // ------------------------------------------------------------
    // Hatching has no head or tail, so the angle is kept in 0-180 degrees; the
    // knob stays on whichever side of the ring the pointer is.
    function PainterlyNPR__Interface__StartKnobDrag(event, id) {
        event.preventDefault();
        event.stopPropagation();
        const point  =  PainterlyNPR__Interface__PointById(id);
        if (!point) return;
        const move  =  (e) => {
            const [x, y]  =  PainterlyNPR__Interface__SheetMm(e);
            const raw     =  (Math.atan2(y - point.PaperMm[1], x - point.PaperMm[0]) / DEG + 360) % 360;
            point.HatchAngle  =  Math.round(raw % 180);
            Ui.KnobSide.set(point.Id, raw >= 180 ? 180 : 0);
            PainterlyNPR__Interface__RefreshPointInputs(point, null);
            PainterlyNPR__Interface__UpdateOverlay();
        };
        const up  =  () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            PainterlyNPR__Interface__PointChanged();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__UpdateOverlay,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
