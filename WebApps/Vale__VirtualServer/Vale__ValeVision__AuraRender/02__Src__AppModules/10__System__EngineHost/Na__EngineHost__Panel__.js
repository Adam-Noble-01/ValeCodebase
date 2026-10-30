// =============================================================================
// VALEVISION AURA - ENGINE HOST - THE ENGINE'S PANEL AND PAPER
// =============================================================================
//
// FILE       : Na__EngineHost__Panel__.js
// NAMESPACE  : Na__EnginePanel
// MODULE     : Engine Host - Panel and Paper
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : PainterlyNPR's own control panel for AURA's parameters (its
//              sections, groups, folds, sliders, menus, presets and hints), its
//              menus and presets worked by the engine's own functions, and its
//              bare paper for the drawing sheets
// CREATED    : 30-Oct-2026 (AURA 0.3.3)
//
// DESCRIPTION:
// - THE NPR REPO IS THE SOURCE (Adam, 30-Oct-2026: "dont duplicate code the npr
//   repo remains definitive source"). Nothing here copies an engine value,
//   label or rule: the panel is the engine's Na__Interface__Panel__Config.json,
//   a menu's choice is its SetChoice, a preset its ApplyPenPreset, and the
//   sheets' paper is its BarePaper. This file only hands them to AURA.
// - PART OF THE ENGINE HOST: 10__System__EngineHost is AURA's one door to the
//   engine. This file is split from Na__EngineHost__PainterlyNpr__.js so that
//   neither passes 1,000 lines; it tells the host's listeners (Notify) when
//   the engine's settings change.
// - THE SEAMS ARRIVED IN PAINTERLYNPR v0.8.1 (ChoiceValue, SetChoice, presets a
//   wrapper can apply, BarePaper). They are reached through namespace imports,
//   so an older pin still loads: its two menus (ink, paper) fall back to the
//   host's own, its presets stay off, and the sheets are the paper's flat tone.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.1 (AURA 0.5.9)
// - A sun slider tells the host's listeners 'sun' (the open scene keeps it),
//   every other control 'control' (the drawing set's settings).
//
// 30-Oct-2026 - Version 1.0.0 (AURA 0.3.3)
// - Initial build: the panel's sections, the control keys, menus, pen and
//   vegetation presets, and the sheets' paper as a tile of the engine's bare
//   paper.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports - the Core Library (PainterlyNPR, pinned)
// -----------------------------------------------------------------------------

    import PanelConfig from 'PainterlyNPR/80__System__HudOverlay/Na__Interface__Panel__Config.json' with { type: 'json' };
    import ControlsConfig from 'PainterlyNPR/80__System__HudOverlay/Na__Interface__Controls__Config.json' with { type: 'json' };
    import * as EngineControls from 'PainterlyNPR/80__System__HudOverlay/PainterlyNPR__Interface__Controls__.mjs';           // <-- Namespace: SetChoice and ChoiceValue since v0.8.1
    import * as EngineCompositor from 'PainterlyNPR/56__Paper__Compositor/PainterlyNPR__Compositor__Pass__.mjs';           // <-- Namespace: BarePaper since v0.8.1
    import * as EnginePaper from 'PainterlyNPR/55__Paper__Model/PainterlyNPR__Paper__Pass__.mjs';                          // <-- Namespace: Tone (Page whiteness) since v0.8.5
    import { PainterlyNPR__AppCore__State as State } from 'PainterlyNPR/01__AppCore/PainterlyNPR__AppCore__State__.mjs';
    import { PainterlyNPR__Paper__PAPER_PRESETS as PAPER_PRESETS } from 'PainterlyNPR/55__Paper__Model/PainterlyNPR__Paper__Presets__.mjs';
    import { Na__EngineHost__Choices, Na__EngineHost__SetChoice, Na__EngineHost__SetControl, Na__EngineHost__IsSunControl, Na__EngineHost__Notify, Na__EngineHost__Ready } from './Na__EngineHost__PainterlyNpr__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Sheets' Paper Tile
    // ------------------------------------------------------------
    const Na__EnginePanel__TILE_PX   = 768;                                      // <-- 153.6 mm of paper at the engine's 5 px/mm: a few tiles to an A1 sheet
    const Na__EnginePanel__REPEAT_PX = 48;                                       // <-- Its last 9.6 mm faded into its first, so it runs on with no seam
    // ------------------------------------------------------------

    const Na__EnginePanel__State = {
        paper    : null,                         // <-- The paper last asked for: { Key, Tone, Tile }
        lastUrl  : null                          // <-- The tile the sheets show now: let go once they show the next
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Engine's Panel
// -----------------------------------------------------------------------------

    // FUNCTION | The Panel's Sections, in the Engine's Order: [{ Key, Label, Open, Items }]
    // ------------------------------------------------------------
    // own: the sections AURA has its own of (its saved views, its art direction
    // section, its sheets). Items are the engine's own grammar, copied so AURA
    // can never change the engine's: Group (a fold, open at first; untitled, no
    // fold), Fold (with its own Open), Range, Select, Buttons, Chips, Hint and
    // Element. A pin from before the engine's sections had labels (v0.7.2) shows
    // each by its key.
    // ------------------------------------------------------------
    function Na__EnginePanel__Sections(own) {
        const root  = PanelConfig.PainterlyNPR__InterfacePanel__Config || {};
        const shell = root.PainterlyNPR__InterfacePanel__Config__Shell || {};
        const skip  = new Set(own || []);
        return (shell.Sections || []).filter((key) => !skip.has(key)).map((key) => {
            const section = root[`PainterlyNPR__InterfacePanel__Config__${key}`];
            if (!section) return null;
            return {
                Key   : key,
                Label : section.Label || key,
                Open  : section.Open !== undefined ? !!section.Open : !section.Hidden,
                Items : JSON.parse(JSON.stringify(section.Items || []))
            };
        }).filter(Boolean);
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Range Control the Engine Has (its controls config's keys)
    // ------------------------------------------------------------
    function Na__EnginePanel__ControlKeys() {
        const root = ControlsConfig.PainterlyNPR__InterfaceControls__Config || {};
        return Object.keys(((root.PainterlyNPR__InterfaceControls__Config__Controls || {}).Controls) || {});
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Menus and Presets - the Engine's Own Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Does the Pinned Engine Have the Seams for a Wrapper's Panel? (v0.8.1)
    // ------------------------------------------------------------
    function Na__EnginePanel__Seams() {
        return typeof EngineControls.PainterlyNPR__Interface__SetChoice === 'function';
    }
    // ------------------------------------------------------------


    // FUNCTION | Move a Slider, as the Engine's Own Panel Does
    // ------------------------------------------------------------
    // The engine's SetControl (v0.8.1): its path, the pen preset marked Custom
    // where the engine's panel marks it, its inputs dirtied, the drawing asked
    // for. An older pin: the host's own.
    // ------------------------------------------------------------
    function Na__EnginePanel__SetControl(key, value) {
        const set = EngineControls.PainterlyNPR__Interface__SetControl;
        if (typeof set !== 'function') { Na__EngineHost__SetControl(key, value); return; }
        if (set(key, value)) Na__EngineHost__Notify(Na__EngineHost__IsSunControl(key) ? 'sun' : 'control');   // <-- The sun is the open scene's (AURA 0.5.9)
    }
    // ------------------------------------------------------------


    // FUNCTION | A Menu: whether it works on this pin, its value, choosing in it
    // ------------------------------------------------------------
    // by and key as the engine's panel config names the menu ('data-select' and
    // InkFamily, PaperPreset, CloudType; 'data-pen-select' and a Pen key).
    // ------------------------------------------------------------
    function Na__EnginePanel__CanChoose(by, key) {
        return Na__EnginePanel__Seams() || (by === 'data-select' && !!Na__EngineHost__Choices(key));
    }

    function Na__EnginePanel__ChoiceValue(by, key) {
        if (Na__EnginePanel__Seams()) return EngineControls.PainterlyNPR__Interface__ChoiceValue(by, key);
        const choice = by === 'data-select' ? Na__EngineHost__Choices(key) : null;   // <-- An older pin: the host's own two
        return choice ? choice.Value : undefined;
    }

    function Na__EnginePanel__SetChoice(by, key, value) {
        if (!Na__EnginePanel__Seams()) { Na__EngineHost__SetChoice(key, value); return; }
        if (EngineControls.PainterlyNPR__Interface__SetChoice(by, key, value)) Na__EngineHost__Notify('choice');
    }
    // ------------------------------------------------------------


    // FUNCTION | The Pen's and the Vegetation's Presets, and the Pen Preset in Use
    // ------------------------------------------------------------
    // The engine's own: a pen preset sets the drawing discipline and every pen
    // slider (keys it leaves out go back to their defaults); a vegetation preset
    // sets the plants' keys only. False on a pin without the seams.
    // ------------------------------------------------------------
    function Na__EnginePanel__ApplyPenPreset(key) {
        if (!Na__EnginePanel__Seams()) return false;
        EngineControls.PainterlyNPR__Interface__ApplyPenPreset(key);
        Na__EngineHost__Notify('preset');
        return true;
    }

    function Na__EnginePanel__ApplyVegPreset(key) {
        if (!Na__EnginePanel__Seams()) return false;
        EngineControls.PainterlyNPR__Interface__ApplyVegPreset(key);
        Na__EngineHost__Notify('preset');
        return true;
    }

    function Na__EnginePanel__PenPreset() {
        return State.PenPreset;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Sheets' Paper
// -----------------------------------------------------------------------------

    // FUNCTION | The Drawing Set's Paper for the Sheets: onLook({ Key, Tone, Tile })
    // ------------------------------------------------------------
    // The paper the pictures are painted on (Paper and finish), so a sheet and
    // its pictures are one piece of paper. Tile is { Url, WidthMm, HeightMm }: the
    // engine's own bare paper (PainterlyNPR v0.8.1, BarePaper), made once a paper
    // (preset, seed, grain relief and page whiteness) as a PNG in the background; null on an
    // older pin or before the engine is up, when the sheets take the preset's
    // flat tone. onLook is called once the look is ready, and never for a paper
    // asked for again before it was.
    // ------------------------------------------------------------
    function Na__EnginePanel__Paper(onLook) {
        const S = Na__EnginePanel__State;
        const tell = (look, fn) => {
            if (S.paper !== look || typeof fn !== 'function') return;
            fn(look);
            const url = look.Tile ? look.Tile.Url : null;
            if (S.lastUrl && S.lastUrl !== url) URL.revokeObjectURL(S.lastUrl); // <-- The sheets show the new tile now
            S.lastUrl = url;
        };
        const make = EngineCompositor.PainterlyNPR__Compositor__BarePaper;
        const canMake = typeof make === 'function' && Na__EngineHost__Ready();
        const key = `${State.Paper.Preset}|${State.Seed}|${State.Paper.Emboss}|${State.Paper.Whiteness || 0}`;
        const known = S.paper && S.paper.Key === key ? S.paper : null;
        if (known && known.Pending) { known.Waiting = onLook; return; }          // <-- Still being made: told when it is
        if (known && (known.Tile || !canMake)) { tell(known, onLook); return; }

        const tone = typeof EnginePaper.PainterlyNPR__Paper__Tone === 'function' && PAPER_PRESETS[State.Paper.Preset]
            ? EnginePaper.PainterlyNPR__Paper__Tone()                                  // <-- The engine's tone, Page whiteness included (v0.8.5 on)
            : (PAPER_PRESETS[State.Paper.Preset] || {}).Tone || '#ffffff';
        const look = { Key: key, Tone: tone, Tile: null, Pending: false, Waiting: null };
        S.paper = look;
        let bare = null;
        if (canMake) {
            try { bare = make(Na__EnginePanel__TILE_PX, Na__EnginePanel__REPEAT_PX); }
            catch (error) { console.error('[AURA EnginePanel] The bare paper could not be drawn:', error); }
        }
        if (!bare) { tell(look, onLook); return; }
        const canvas = document.createElement('canvas');
        canvas.width = bare.Width;
        canvas.height = bare.Height;
        canvas.getContext('2d').putImageData(new ImageData(bare.Data, bare.Width, bare.Height), 0, 0);
        look.Pending = true;
        look.Waiting = onLook;
        canvas.toBlob((blob) => {
            look.Pending = false;
            if (blob) look.Tile = { Url: URL.createObjectURL(blob), WidthMm: bare.Width / bare.PxPerMm, HeightMm: bare.Height / bare.PxPerMm };
            if (S.paper !== look) { if (look.Tile) URL.revokeObjectURL(look.Tile.Url); return; }   // <-- Another paper was asked for meanwhile
            const waiting = look.Waiting;
            look.Waiting = null;
            tell(look, waiting);
        }, 'image/png');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__EnginePanel__Sections,
        Na__EnginePanel__ControlKeys,
        Na__EnginePanel__Seams,
        Na__EnginePanel__SetControl,
        Na__EnginePanel__CanChoose,
        Na__EnginePanel__ChoiceValue,
        Na__EnginePanel__SetChoice,
        Na__EnginePanel__ApplyPenPreset,
        Na__EnginePanel__ApplyVegPreset,
        Na__EnginePanel__PenPreset,
        Na__EnginePanel__Paper
    };

// endregion -------------------------------------------------------------------
