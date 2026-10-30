/* =============================================================================
   PAINTERLYNPR - ART DIRECTION | INFLUENCE POINTS - CONTROLS
   =============================================================================

   FILE       : PainterlyNPR__Interface__PointControls__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : ArtDirection - InfluencePoints - Controls
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : A point's contextual controls, and every edit to one: select, set
                a value, remove, duplicate, switch off
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Three to six controls a point shows (manifest section 10); the rest wait
     under Advanced.

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

import PointControlsConfig from './Na__ArtDirection__PointControls__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__MAX_POINTS       as  MAX_POINTS,
    PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
    PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import { PainterlyNPR__Maths__Clamp as Clamp } from '../03__AppUtils/PainterlyNPR__AppUtils__Maths__.mjs';
import { PainterlyNPR__ScenePackage__Scene as Scene } from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import { PainterlyNPR__MaterialClasses__MATERIAL_CLASSES as MATERIAL_CLASSES } from '../13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
import {
    PainterlyNPR__RenderGraph__Bump,
    PainterlyNPR__RenderGraph__Request,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import { PainterlyNPR__StrokeSynthesis__DisciplineAt } from '../35__Line__DrawingDiscipline/PainterlyNPR__StrokeSynthesis__DisciplineMacro__.mjs';
import {
    PainterlyNPR__ArtDirection__AnchorAt,
    PainterlyNPR__ArtDirection__MakePoint,
} from './PainterlyNPR__ArtDirection__Points__.mjs';
import { PainterlyNPR__Interface__RenderPointList } from './PainterlyNPR__Interface__PointList__.mjs';
import { PainterlyNPR__Interface__UpdateOverlay } from './PainterlyNPR__Interface__PointOverlay__.mjs';
import {
    PainterlyNPR__Interface__Status,
    PainterlyNPR__Interface__Query     as  $,
    PainterlyNPR__Interface__QueryAll  as  $$,
    PainterlyNPR__Interface__Ui        as  Ui,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Interface__RowFrom } from '../80__System__HudOverlay/PainterlyNPR__Interface__Formats__.mjs';
import { PainterlyNPR__Interface__UpdateSettingsJson } from '../85__System__ProjectPersistence/PainterlyNPR__Interface__SettingsJson__.mjs';

// =============================================================================
// REGION | Influence Points - Controls
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__ArtDirection__PointControls__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const POINT_CONFIG  =  PainterlyNPR__ConfigAccess__Section(PointControlsConfig, 'PainterlyNPR__PointControls__Config', 'Points', ['Controls', 'Shape', 'Selects', 'Advanced', 'Hints']);
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Readouts No Format Writes - the discipline's name, an Indication point's words
    // ------------------------------------------------------------
    const POINT_SPECIALS  =  Object.freeze({
        DisciplineNameAndValue  :  v => `${PainterlyNPR__StrokeSynthesis__DisciplineAt(v).Name} · ${v.toFixed(2)}`,
        IndicationText          :  PainterlyNPR__Interface__IndicationText,
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Interface
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | A Point's Contextual Controls - [key, label, min, max, step, format]
    // ------------------------------------------------------------
    // Three to six controls a point shows (manifest section 10); the rest wait
    // under Advanced. A Line Control point carries the manifest's six - weight,
    // pressure, wobble, break-up, silhouette emphasis, overdraw - with looseness
    // and strength one fold down. The field holds a weight up to 2.
    const POINT_CONTROLS  =  Object.fromEntries(Object.entries(POINT_CONFIG.Controls).map(([type, rows]) => [type, rows.map(row => PainterlyNPR__Interface__RowFrom(row, POINT_SPECIALS))]));
    const POINT_SHAPE  =  POINT_CONFIG.Shape.map(row => PainterlyNPR__Interface__RowFrom(row, POINT_SPECIALS));   // <-- Every point can be an ellipse
    const POINT_SELECTS  =  POINT_CONFIG.Selects;                            // <-- [key, label, [[value, text]]]: menus in the open card, saved with the point
    const POINT_ADVANCED  =  Object.fromEntries(Object.entries(POINT_CONFIG.Advanced).map(([type, rows]) => [type, rows === 'PointShape'
        ? POINT_SHAPE                                                        // <-- The same rows, as Experiment 01 shared them
        : rows.flatMap(row => row === 'PointShape' ? POINT_SHAPE : [PainterlyNPR__Interface__RowFrom(row, POINT_SPECIALS)])]));
    const POINT_HINTS  =  POINT_CONFIG.Hints;
    // ------------------------------------------------------------


    // FUNCTION | Points - find, number, name, and what every edit to one does
    // ------------------------------------------------------------
    // A point's number is its place in the list, shown on its handle and its
    // row alike, so the one on the sheet and the one in the panel are plainly
    // the same point.
    function PainterlyNPR__Interface__PointById(id) { return State.Points.find(p => p.Id === id) || null; }
    function PainterlyNPR__Interface__PointNumber(point) { return State.Points.indexOf(point) + 1; }
    function PainterlyNPR__Interface__PointSpec(type, key) { return [...POINT_CONTROLS[type], ...(POINT_ADVANCED[type] || [])].find(s => s[0] === key); }

    function PainterlyNPR__Interface__PointTargetText(point) {
        const object  =  Scene.ObjectById.get(point.ObjectId);
        if (point.Target === 'Object' && object) return object.Name;
        if (point.Target === 'Material' && point.MaterialId >= 0) return `All ${MATERIAL_CLASSES[point.MaterialId].Label.toLowerCase()}`;
        return 'The area';
    }

    function PainterlyNPR__Interface__PointChanged() {
        PainterlyNPR__RenderGraph__Bump('ArtDirection');
        PainterlyNPR__Interface__UpdateSettingsJson();
        PainterlyNPR__RenderGraph__Request('Refine');
    }
    // ------------------------------------------------------------


    // FUNCTION | Select a Point - its row opens, its node shows its sliders
    // ------------------------------------------------------------
    // One point is edited at a time, as in a U-Point editor: the selected
    // point's ring, knobs and sliders show on the sheet; its row is the only one
    // open in the panel, scrolled into view - so a point just placed is the
    // point being edited, wherever it falls in the list.
    function PainterlyNPR__Interface__SelectPoint(id, reveal) {
        Ui.SelectedPointId  =  PainterlyNPR__Interface__PointById(id) ? id : null;
        PainterlyNPR__Interface__RenderPointList();
        PainterlyNPR__Interface__UpdateOverlay();
        if (!reveal || Ui.SelectedPointId === null) return;
        const card  =  $(`.PainterlyNPR__PointCard[data-point-id="${Ui.SelectedPointId}"]`);
        if (card && card.offsetParent) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    // ------------------------------------------------------------


    // FUNCTION | Set One of a Point's Values - from the node, the row or a knob
    // ------------------------------------------------------------
    // Every control bound to the point is brought into step except the one being
    // dragged, so the node's sliders and the row's never disagree.
    function PainterlyNPR__Interface__SetPointValue(point, key, value, source) {
        point[key]  =  value;
        PainterlyNPR__Interface__RefreshPointInputs(point, source);
        PainterlyNPR__Interface__UpdateOverlay();
        PainterlyNPR__Interface__PointChanged();
    }

    function PainterlyNPR__Interface__RefreshPointInputs(point, source) {
        for (const input of $$(`[data-for-point="${point.Id}"][data-point-key]`)) {
            const key  =  input.dataset.pointKey;
            if (input !== source) input.value = point[key];
            const spec    =  PainterlyNPR__Interface__PointSpec(point.Type, key);
            const output  =  input.parentElement.querySelector('output');
            if (spec && output) output.textContent = spec[5](point[key]);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove, Duplicate and Switch a Point Off
    // ------------------------------------------------------------
    // Removing the selected point selects its neighbour, so Delete can clear a
    // run of points. A duplicate is a new point - its own Id and so its own
    // seed - placed just beside its source and listed after it; Alt-drag drops
    // it where the drag ends. A point switched off keeps its settings but leaves
    // the field, so a variation can be compared without being lost.
    function PainterlyNPR__Interface__RemovePoint(id) {
        const index  =  State.Points.findIndex(p => p.Id === id);
        if (index < 0) return;
        State.Points.splice(index, 1);
        Ui.KnobSide.delete(id);
        if (Ui.SelectedPointId === id) {
            const next  =  State.Points[Math.min(index, State.Points.length - 1)];
            Ui.SelectedPointId  =  next ? next.Id : null;
        }
        PainterlyNPR__Interface__RenderPointList();
        PainterlyNPR__Interface__UpdateOverlay();
        PainterlyNPR__Interface__PointChanged();
    }

    function PainterlyNPR__Interface__DuplicatePoint(id, offset) {
        const source  =  PainterlyNPR__Interface__PointById(id);
        if (!source) return null;
        if (State.Points.length >= MAX_POINTS) { PainterlyNPR__Interface__Status(`The field holds ${MAX_POINTS} points at most.`); return null; }
        const options  =  JSON.parse(JSON.stringify(source));
        delete options.Id;
        delete options.Seed;
        const step   =  offset === false ? 0 : 8;
        const x      =  Clamp(source.PaperMm[0] + step, 0, SHEET_WIDTH_MM), y = Clamp(source.PaperMm[1] - step, 0, SHEET_HEIGHT_MM);
        const point  =  PainterlyNPR__ArtDirection__MakePoint(source.Type, x, y, Object.assign(options, { PaperMm: [x, y] }));
        if (step) PainterlyNPR__ArtDirection__AnchorAt(point, x, y);
        State.Points.splice(State.Points.indexOf(source) + 1, 0, point);
        PainterlyNPR__Interface__SelectPoint(point.Id, true);
        PainterlyNPR__Interface__PointChanged();
        return point;
    }

    function PainterlyNPR__Interface__TogglePoint(id) {
        const point  =  PainterlyNPR__Interface__PointById(id);
        if (!point) return;
        point.Enabled  =  point.Enabled === false;
        PainterlyNPR__Interface__RenderPointList();
        PainterlyNPR__Interface__UpdateOverlay();
        PainterlyNPR__Interface__PointChanged();
    }

    // What a point acts on, stepped through what it can reach
    function PainterlyNPR__Interface__CycleTarget(point) {
        const order  =  ['Area', 'Object', 'Material'].filter(t => t === 'Area' || (t === 'Object' ? Scene.ObjectById.has(point.ObjectId) : point.MaterialId >= 0));
        point.Target  =  order[(order.indexOf(point.Target) + 1) % order.length];
        PainterlyNPR__Interface__RenderPointList();
        PainterlyNPR__Interface__UpdateOverlay();
        PainterlyNPR__Interface__PointChanged();
    }
    // ------------------------------------------------------------


    // FUNCTION | An Indication Point's Amount in Words
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__IndicationText(v) {
        if (Math.abs(v) < 0.005) return 'neutral';
        return v > 0 ? `express ${Math.round(v * 100)}%` : `suppress ${Math.round(-v * 100)}%`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
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
        POINT_ADVANCED  as  PainterlyNPR__Interface__POINT_ADVANCED,
        POINT_CONTROLS  as  PainterlyNPR__Interface__POINT_CONTROLS,
        POINT_HINTS     as  PainterlyNPR__Interface__POINT_HINTS,
        POINT_SELECTS   as  PainterlyNPR__Interface__POINT_SELECTS,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
