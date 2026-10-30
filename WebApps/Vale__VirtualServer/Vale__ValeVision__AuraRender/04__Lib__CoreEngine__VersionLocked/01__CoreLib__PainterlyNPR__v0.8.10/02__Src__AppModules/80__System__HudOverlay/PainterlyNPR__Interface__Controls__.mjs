/* =============================================================================
   PAINTERLYNPR - HUD | INTERFACE - CONTROLS
   =============================================================================

   FILE       : PainterlyNPR__Interface__Controls__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - Interface - Controls
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The range controls - which state each sets and which inputs it
                dirties - kept in step with the state, and the Pen's and the
                vegetation's presets
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - The controls are Na__Interface__Controls__Config.json beside this file: each
     one's Path, Bump and readout Format, as data.
   - A preset sets the Drawing Discipline and every slider; any slider moved after
     marks the preset Custom.
   - A slider's move (SetControl) and the panel's menus (ChoiceValue, SetChoice)
     live here once, for the Wire and for a wrapper's panel. Nothing here needs
     this app's panel to exist: every lookup is null-safe, so a wrapper can
     apply a preset (v0.8.1).

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Interface
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : the readouts' format functions are data in the config, written
                   by PainterlyNPR__Interface__FormatFrom
                   (PainterlyNPR__Interface__Formats__.mjs), which writes every
                   readout as the functions did

   ============================================================================= */

import ControlsConfig from './Na__Interface__Controls__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__State as State } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__RenderGraph__Bump,
    PainterlyNPR__RenderGraph__Request,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import {
    PainterlyNPR__DrawingDiscipline__PEN_DEFAULTS     as  PEN_DEFAULTS,
    PainterlyNPR__DrawingDiscipline__PEN_LEGACY_KEYS  as  PEN_LEGACY_KEYS,
    PainterlyNPR__DrawingDiscipline__PEN_PRESETS      as  PEN_PRESETS,
    PainterlyNPR__DrawingDiscipline__VEG_PRESETS      as  VEG_PRESETS,
} from '../35__Line__DrawingDiscipline/PainterlyNPR__DrawingDiscipline__Constants__.mjs';
import {
    PainterlyNPR__StrokeSynthesis__DisciplineAt,
    PainterlyNPR__StrokeSynthesis__EffectiveDiscipline,
} from '../35__Line__DrawingDiscipline/PainterlyNPR__StrokeSynthesis__DisciplineMacro__.mjs';
import { PainterlyNPR__Kuwahara__Kuwahara as Kuwahara } from '../57__Wash__KuwaharaFilter/PainterlyNPR__Kuwahara__Host__.mjs';
import {
    PainterlyNPR__SkyClouds__ApplyType,
    PainterlyNPR__SkyClouds__SkyClouds  as  SkyClouds,
} from '../60__Atmos__SkyAndClouds/PainterlyNPR__SkyClouds__Host__.mjs';
import { PainterlyNPR__Interface__RenderPointList } from '../65__ArtDirection__InfluencePoints/PainterlyNPR__Interface__PointList__.mjs';
import { PainterlyNPR__CameraRig__CAMERA_PRESETS as CAMERA_PRESETS } from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Presets__.mjs';
import { PainterlyNPR__Interface__UpdateZoomReadout } from './PainterlyNPR__Interface__CameraControls__.mjs';
import {
    PainterlyNPR__Interface__Get,
    PainterlyNPR__Interface__Set,
    PainterlyNPR__Interface__Query     as  $,
    PainterlyNPR__Interface__QueryAll  as  $$,
} from './PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Interface__FormatFrom } from './PainterlyNPR__Interface__Formats__.mjs';
import { PainterlyNPR__Interface__UpdateSettingsJson } from '../85__System__ProjectPersistence/PainterlyNPR__Interface__SettingsJson__.mjs';

// =============================================================================
// REGION | Interface - Controls
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__Interface__Controls__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const CONTROL_CONFIG  =  PainterlyNPR__ConfigAccess__Section(ControlsConfig, 'PainterlyNPR__InterfaceControls__Config', 'Controls', ['Controls', 'PenTabKeys']);
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Readouts No Format Writes - the discipline's name
    // ------------------------------------------------------------
    const READOUT_SPECIALS  =  Object.freeze({
        DisciplineName  :  v => PainterlyNPR__StrokeSynthesis__DisciplineAt(v).Name,
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Interface
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Range Controls - which state each sets and which inputs it dirties
    // ------------------------------------------------------------
    const CONTROLS  =  Object.fromEntries(Object.entries(CONTROL_CONFIG.Controls).map(([key, c]) => [key, {
        Path        :  c.Path,
        Bump        :  c.Bump,
        Format      :  PainterlyNPR__Interface__FormatFrom(c.Format, READOUT_SPECIALS),
        Multiplier  :  c.Multiplier === true,                              // <-- A x-slider: switched off, it rests at x1
    }]));
    const PEN_TAB_KEYS  =  CONTROL_CONFIG.PenTabKeys;                // <-- Older homes in State a Pen preset also sets
    // ------------------------------------------------------------


    // FUNCTION | Sync Every Control to the State
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__SyncControls() {
        for (const [key, spec] of Object.entries(CONTROLS)) {
            const input   =  $(`[data-control="${key}"]`);
            const output  =  $(`[data-readout="${key}"]`);
            const value   =  PainterlyNPR__Interface__Get(spec.Path);
            if (input) input.value = value;
            if (output) output.textContent = spec.Format(value);
        }
        for (const select of $$('[data-select]')) {                         // <-- Each lookup here null-safe: a wrapper has none of this panel (v0.8.1)
            const value  =  PainterlyNPR__Interface__ChoiceValue('data-select', select.dataset.select);
            if (value !== undefined) select.value = value;
        }
        const cloudsNote  =  $('#PainterlyNPR__App__CloudsNote');
        if (cloudsNote) cloudsNote.hidden = !!SkyClouds.Instance;           // <-- Says why the sky is the painted one, from file://
        const kuwaharaNote  =  $('#PainterlyNPR__App__KuwaharaNote');
        if (kuwaharaNote) kuwaharaNote.hidden = !!Kuwahara.Instance;         // <-- Says why the Kuwahara does nothing, from file://
        const influence  =  $('[data-toggle="ShowInfluence"]');
        if (influence) influence.checked = State.ShowInfluence;
        const seed  =  $('#PainterlyNPR__App__SeedValue');
        if (seed) seed.textContent = String(State.Seed);
        for (const button of $$('[data-camera]')) button.classList.toggle('PainterlyNPR__Button--active', button.dataset.camera === State.CameraPreset);
        PainterlyNPR__Interface__MarkPenPreset();
        for (const select of $$('[data-pen-select]')) select.value = State.Pen[select.dataset.penSelect];
        PainterlyNPR__Interface__UpdateZoomReadout();
        PainterlyNPR__Interface__UpdateDiscipline();
        PainterlyNPR__Interface__RenderPointList();
        PainterlyNPR__Interface__UpdateSettingsJson();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Discipline Readout - and the View's Ceiling When It Binds
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__UpdateDiscipline() {
        const effective  =  PainterlyNPR__StrokeSynthesis__EffectiveDiscipline();
        const note       =  $('#PainterlyNPR__App__DisciplineCeiling');
        const capped     =  effective < State.Discipline - 1e-6;
        if (note) {
            note.hidden  =  !capped;
            if (capped) note.textContent = `${CAMERA_PRESETS.MeasuredElevation.Label.split(' ·')[0]} caps the line at ${PainterlyNPR__StrokeSynthesis__DisciplineAt(effective).Name} - the geometry stays exact.`;
        }
        const marker  =  $('#PainterlyNPR__App__DisciplineMarker');
        if (marker) {
            marker.style.left  =  `${effective * 100}%`;
            marker.hidden      =  !capped;
        }
        const pathNote  =  $('#PainterlyNPR__App__PathCeiling');
        if (pathNote) pathNote.hidden = State.Camera.Ceiling >= 1;
    }
    // ------------------------------------------------------------


    // FUNCTION | Mark the Active Pen Preset - none, once a slider has moved
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__MarkPenPreset() {
        for (const button of $$('[data-pen-preset]')) button.classList.toggle('PainterlyNPR__Button--active', button.dataset.penPreset === State.PenPreset);
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Vegetation Preset - the plants' keys only, the rest of the Pen kept
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__ApplyVegPreset(key) {
        const preset  =  VEG_PRESETS[key];
        if (!preset) return;
        for (const name of Object.keys(PEN_DEFAULTS)) if (name.startsWith('Veg')) State.Pen[name] = PEN_DEFAULTS[name];
        Object.assign(State.Pen, preset.Values);
        State.PenPreset  =  'Custom';
        PainterlyNPR__RenderGraph__Bump('Discipline');
        PainterlyNPR__Interface__SyncControls();
        PainterlyNPR__RenderGraph__Request('Refine');
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Pen Preset - the discipline and every Pen slider at once
    // ------------------------------------------------------------
    // Keys a preset leaves out return to their defaults, so presets never stack.
    // The pen-width mode is kept (v0.8.0): a preset is behaviour, never the pens.
    function PainterlyNPR__Interface__ApplyPenPreset(key) {
        const preset  =  PEN_PRESETS[key];
        if (!preset) return;
        State.Pen  =  Object.assign({}, PEN_DEFAULTS, { WidthMode: State.Pen.WidthMode || PEN_DEFAULTS.WidthMode });
        for (const [name, value] of Object.entries(preset.Values)) {
            if (PEN_LEGACY_KEYS[name]) PainterlyNPR__Interface__Set(PEN_LEGACY_KEYS[name], value);
            else State.Pen[name] = value;
        }
        State.PenPreset  =  key;
        PainterlyNPR__RenderGraph__Bump('ArtDirection', 'Discipline', 'Lines', 'Finish');
        PainterlyNPR__Interface__SyncControls();
        PainterlyNPR__RenderGraph__Request('Refine');
    }
    // ------------------------------------------------------------


    // FUNCTION | The Panel's Menus - each one's value, and choosing in it
    // ------------------------------------------------------------
    // A menu is named as the panel config names it: By 'data-pen-select' for a
    // Pen key (the vegetation's outline hand and leaf marks), else 'data-select'
    // and its own name (InkFamily, PaperPreset, CloudType). What a choice sets,
    // dirties and marks lives here once, for this panel's Wire and for a
    // wrapper's own panel (ValeVision AURA builds its parameters from this
    // panel's config, v0.8.1). SetChoice returns false for a menu it does not know.
    function PainterlyNPR__Interface__ChoiceValue(by, key) {
        if (by === 'data-pen-select') return State.Pen[key];
        if (key === 'InkFamily') return State.InkFamily;
        if (key === 'PaperPreset') return State.Paper.Preset;
        if (key === 'CloudType') return State.Sky.Type;
        return undefined;
    }

    function PainterlyNPR__Interface__SetChoice(by, key, value) {
        if (by === 'data-pen-select') {
            State.Pen[key]  =  value;
            State.PenPreset  =  'Custom';
            PainterlyNPR__Interface__MarkPenPreset();
            PainterlyNPR__RenderGraph__Bump('Discipline');
        } else if (key === 'InkFamily') {
            State.InkFamily  =  value;
            State.PenPreset  =  'Custom';
            PainterlyNPR__Interface__MarkPenPreset();
            PainterlyNPR__RenderGraph__Bump('Finish');
        } else if (key === 'PaperPreset') {
            State.Paper.Preset  =  value;
            PainterlyNPR__RenderGraph__Bump('Paper');
        } else if (key === 'CloudType') {
            PainterlyNPR__SkyClouds__ApplyType(value);
            PainterlyNPR__RenderGraph__Bump('Sky');
            PainterlyNPR__Interface__SyncControls();                         // <-- A cloud type sets the coverage, size and height too
        } else {
            return false;
        }
        PainterlyNPR__Interface__UpdateSettingsJson();
        PainterlyNPR__RenderGraph__Request('Refine');
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Range Control - what moving its slider does
    // ------------------------------------------------------------
    // The value into the state at the control's Path, the pen preset marked
    // Custom for a Pen key or one of the older homes a preset sets (PenTabKeys),
    // the control's inputs dirtied, and the drawing asked for: the navigation
    // preview for the sun, a refine for the rest. One place for this panel's
    // Wire and a wrapper's own sliders (v0.8.1). False for a key or value it
    // cannot take.
    function PainterlyNPR__Interface__SetControl(key, value) {
        const spec  =  CONTROLS[key];
        if (!spec || !Number.isFinite(value)) return false;
        PainterlyNPR__Interface__Set(spec.Path, value);
        if (spec.Path[0] === 'Pen' || PEN_TAB_KEYS.includes(key)) { State.PenPreset = 'Custom'; PainterlyNPR__Interface__MarkPenPreset(); }
        PainterlyNPR__RenderGraph__Bump(...spec.Bump);
        if (key === 'Discipline') PainterlyNPR__Interface__UpdateDiscipline();
        PainterlyNPR__Interface__UpdateSettingsJson();
        PainterlyNPR__RenderGraph__Request(spec.Bump.includes('Sun') ? 'Navigate' : 'Refine');
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__ApplyPenPreset,
        PainterlyNPR__Interface__ApplyVegPreset,
        PainterlyNPR__Interface__ChoiceValue,
        PainterlyNPR__Interface__MarkPenPreset,
        PainterlyNPR__Interface__SetChoice,
        PainterlyNPR__Interface__SetControl,
        PainterlyNPR__Interface__SyncControls,
        PainterlyNPR__Interface__UpdateDiscipline,
        CONTROLS      as  PainterlyNPR__Interface__CONTROLS,
        PEN_TAB_KEYS  as  PainterlyNPR__Interface__PEN_TAB_KEYS,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
