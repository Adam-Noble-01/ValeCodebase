/* =============================================================================
   PAINTERLYNPR - SYSTEM | PROJECT PERSISTENCE - SETTINGS JSON
   =============================================================================

   FILE       : PainterlyNPR__Interface__SettingsJson__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : System - ProjectPersistence - SettingsJson
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The settings JSON: deterministic recall in one object - shown,
                copied and applied in the Export tab
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - The same object a save records. A settings object from Experiment 01 applies
     here unchanged, and one saved here applies there.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Interface
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : the settings object names the engine 'PainterlyNPR - pen and
                   wash renderer' and carries the app's version; v0.6.0 adds the
                   placed assets (Assets, only when there are any) and applies
                   them; v0.8.3 adds the sheet it was drawn on (Sheet), and a
                   settings object from another sheet - or naming none, so from
                   before A3 - has its points refitted; otherwise none

   ============================================================================= */

import {
    PainterlyNPR__AppCore__KUWAHARA_DEFAULTS  as  KUWAHARA_DEFAULTS,
    PainterlyNPR__AppCore__State              as  State,
} from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__ENGINE_VERSION   as  ENGINE_VERSION,
    PainterlyNPR__Engine__MAX_POINTS       as  MAX_POINTS,
    PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
    PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__RenderGraph__Request,
    PainterlyNPR__RenderGraph__Versions  as  Versions,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import { PainterlyNPR__InkLayer__INK_FAMILIES as INK_FAMILIES } from '../34__Stroke__InkCompositing/PainterlyNPR__InkLayer__InkFamilies__.mjs';
import {
    PainterlyNPR__DrawingDiscipline__PEN_DEFAULTS  as  PEN_DEFAULTS,
    PainterlyNPR__DrawingDiscipline__PEN_PRESETS   as  PEN_PRESETS,
} from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import { PainterlyNPR__Paper__PAPER_PRESETS as PAPER_PRESETS } from '../55__Paper__Model/PainterlyNPR__Paper__Presets__.mjs';
import {
    PainterlyNPR__ArtDirection__MakePoint,
    PainterlyNPR__ArtDirection__RefitPoints,
    PainterlyNPR__ArtDirection__POINT_TYPES  as  POINT_TYPES,
} from '../65__ArtDirection__InfluencePoints/PainterlyNPR__ArtDirection__Points__.mjs';
import {
    PainterlyNPR__Interface__POINT_ADVANCED  as  POINT_ADVANCED,
    PainterlyNPR__Interface__POINT_CONTROLS  as  POINT_CONTROLS,
    PainterlyNPR__Interface__POINT_SELECTS   as  POINT_SELECTS,
} from '../65__ArtDirection__InfluencePoints/PainterlyNPR__Interface__PointControls__.mjs';
import { PainterlyNPR__Interface__SyncControls } from '../80__System__HudOverlay/PainterlyNPR__Interface__Controls__.mjs';
import { PainterlyNPR__Interface__Query as $ } from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Interface__AssetsChanged } from '../82__Hud__AssetCatalogue/PainterlyNPR__Interface__AssetDrawer__.mjs';

// =============================================================================
// REGION | Project Persistence - Settings Json
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Interface
// -----------------------------------------------------------------------------

    // FUNCTION | The Settings JSON - deterministic recall in one object
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__SettingsObject() {
        return {
            Engine        :  'PainterlyNPR - pen and wash renderer',
            EngineVersion :  ENGINE_VERSION,
            Sheet         :  { WidthMm: SHEET_WIDTH_MM, HeightMm: SHEET_HEIGHT_MM },   // <-- What the points were placed on (v0.8.3): another sheet's are refitted on recall
            Seed          :  State.Seed,
            Camera        :  Object.assign({ Preset: State.CameraPreset }, State.Camera),
            Sun           :  State.Sun,
            Style         :  { Discipline: State.Discipline, InkFamily: State.InkFamily, LineWeight: State.LineWeight, PenPreset: State.PenPreset, Pen: State.Pen, Wash: State.Wash, Sky: State.Sky, Indication: State.Indication, Kuwahara: State.Kuwahara },
            Paper         :  State.Paper,
            Composition   :  State.Composition,
            ArtDirectionPoints :  State.Points.map(p => Object.assign(
                { Type: p.Type, Seed: p.Seed, Enabled: p.Enabled !== false, Visible: p.Visible !== false, Group: p.Group || '', Anchor: p.Anchor, Target: p.Target, PaperMm: p.PaperMm.map(v => +v.toFixed(4)), World: p.World ? p.World.map(v => +v.toFixed(5)) : null, ObjectId: p.ObjectId, MaterialId: p.MaterialId },
                Object.fromEntries([...POINT_CONTROLS[p.Type], ...(POINT_ADVANCED[p.Type] || []), ...(POINT_SELECTS[p.Type] || [])].map(spec => [spec[0], p[spec[0]]])))),
            ...(State.Assets.length ? { Assets: State.Assets.map(a => structuredClone(a)) } : {}),   // <-- Placed library assets (v0.6.0), each with its recipe: a drawing with none says nothing, as before
            ...(State.Materials.length ? { Materials: State.Materials.map(m => structuredClone(m)) } : {}),   // <-- Material assignments (v0.7.0), in the order made: likewise said only when there are some
        };
    }

    function PainterlyNPR__Interface__UpdateSettingsJson() {
        const area  =  $('#PainterlyNPR__App__SettingsJson');
        if (area && document.activeElement !== area) area.value = JSON.stringify(PainterlyNPR__Interface__SettingsObject(), null, 2);
    }

    function PainterlyNPR__Interface__ApplySettingsJson(text) {
        const s  =  JSON.parse(text);
        if (typeof s.Seed === 'number') State.Seed = s.Seed >>> 0;
        if (s.Camera) { State.Camera = Object.assign({}, State.Camera, s.Camera); State.CameraPreset = s.Camera.Preset || 'Custom'; delete State.Camera.Preset; }
        if (s.Sun) Object.assign(State.Sun, s.Sun);
        if (s.Style) {
            if (typeof s.Style.Discipline === 'number') State.Discipline = s.Style.Discipline;
            if (s.Style.InkFamily && INK_FAMILIES[s.Style.InkFamily]) State.InkFamily = s.Style.InkFamily;
            if (typeof s.Style.LineWeight === 'number') State.LineWeight = s.Style.LineWeight;
            State.Pen        =  Object.assign({}, PEN_DEFAULTS, s.Style.Pen || {});   // <-- A settings object without a Pen is the defaults, not whatever was on screen
            State.PenPreset  =  PEN_PRESETS[s.Style.PenPreset] ? s.Style.PenPreset : 'Custom';
            if (s.Style.Wash) Object.assign(State.Wash, { Coffee: 0 }, s.Style.Wash);   // <-- A drawing saved before coffee rings had none
            if (s.Style.Sky) Object.assign(State.Sky, s.Style.Sky);
            State.Kuwahara  =  Object.assign({}, KUWAHARA_DEFAULTS, s.Style.Kuwahara || {});   // <-- A drawing saved before the filter had none: it loads with the filter off
            if (s.Style.Indication) Object.assign(State.Indication, s.Style.Indication);
        }
        if (s.Paper) { Object.assign(State.Paper, s.Paper); if (!PAPER_PRESETS[State.Paper.Preset]) State.Paper.Preset = 'ColdPressed'; }
        if (s.Composition) Object.assign(State.Composition, s.Composition);
        if (Array.isArray(s.ArtDirectionPoints)) {
            const sheet   =  s.Sheet && s.Sheet.WidthMm > 0 && s.Sheet.HeightMm > 0 ? [s.Sheet.WidthMm, s.Sheet.HeightMm] : null;   // <-- None named: drawn before v0.8.3, on the 300 x 200 mm sheet
            const placed  =  sheet && sheet[0] === SHEET_WIDTH_MM && sheet[1] === SHEET_HEIGHT_MM ? s.ArtDirectionPoints : PainterlyNPR__ArtDirection__RefitPoints(s.ArtDirectionPoints, sheet, false);
            State.Points  =  placed.slice(0, MAX_POINTS).filter(p => POINT_TYPES[p.Type]).map(p => PainterlyNPR__ArtDirection__MakePoint(p.Type, p.PaperMm[0], p.PaperMm[1], p));
        }
        const assets  =  Array.isArray(s.Assets) ? s.Assets.filter(a => a && a.Uid && a.Recipe && Array.isArray(a.Position)).map(a => structuredClone(a)) : [];   // <-- A settings object without Assets is a drawing with none placed
        const materials  =  Array.isArray(s.Materials) ? s.Materials.filter(m => m && m.Uid && m.Object && m.Material).map(m => structuredClone(m)) : [];   // <-- Nor one without Materials: every object in its own class
        const assetsMoved  =  JSON.stringify(assets) !== JSON.stringify(State.Assets) || JSON.stringify(materials) !== JSON.stringify(State.Materials);
        State.Assets     =  assets;
        State.Materials  =  materials;
        for (const key of Object.keys(Versions)) if (key !== 'Size' && key !== 'Scene') Versions[key]++;
        if (assetsMoved) PainterlyNPR__Interface__AssetsChanged();              // <-- The scene rebuilt with them, its Scene input bumped
        PainterlyNPR__Interface__SyncControls();
        PainterlyNPR__RenderGraph__Request('Navigate');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__ApplySettingsJson,
        PainterlyNPR__Interface__SettingsObject,
        PainterlyNPR__Interface__UpdateSettingsJson,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
