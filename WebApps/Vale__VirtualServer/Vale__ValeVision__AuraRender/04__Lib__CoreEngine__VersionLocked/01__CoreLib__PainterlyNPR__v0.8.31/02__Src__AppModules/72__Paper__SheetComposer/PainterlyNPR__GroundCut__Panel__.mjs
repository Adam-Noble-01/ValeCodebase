/* =============================================================================
   PAINTERLYNPR - PAPER | SHEET COMPOSER - GROUND CUT PANEL
   =============================================================================

   FILE       : PainterlyNPR__GroundCut__Panel__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Paper - SheetComposer - GroundCut Panel
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The sheet's ground cut in the panel (Paper and finish, Ground
                cut-off) and on the drawing's right-click menu
   CREATED    : 03-Nov-2026

   DESCRIPTION:
   - Adam, 03-Nov-2026: "add the same elevation watercolour swooshes that the AURA
     port uses". The kinds, colours, ranges, readouts, hints and defaults are the
     painter's (Settings, Na__GroundCut__Config.json): this module only gives them
     rows in the panel's own markup, and the menu's items are Settings' MenuItems,
     the list a wrapper's own menu can call as well.
   - The panel config holds one placeholder, [data-ground-cut]. A wrapper's reader
     of that config finds no slider in it and leaves the group out (ValeVision AURA
     has its own menu and Adjust panel on each viewport); SketchUp's NPR Parameters
     window runs this page, so it shows there and goes to the viewport with the look.
   - Every change goes through the painter's Clean, bumps GroundCut alone (the
     ground cut and the compositor run, nothing else) and becomes one undo step by
     84's watching the settings object.
   - Every lookup is null-safe: a host with none of this panel loses nothing.

   ============================================================================= */

import GroundConfig from './Na__GroundCut__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import { PainterlyNPR__AppCore__DefaultState } from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__RenderGraph__Bump,
    PainterlyNPR__RenderGraph__Request,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import {
    PainterlyNPR__Interface__Query     as  $,
    PainterlyNPR__Interface__Ui        as  Ui,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Interface__SetFold } from '../80__System__HudOverlay/PainterlyNPR__Interface__Folds__.mjs';
import { PainterlyNPR__Interface__FormatFrom } from '../80__System__HudOverlay/PainterlyNPR__Interface__Formats__.mjs';
import { PainterlyNPR__Interface__PanelElement as E } from '../80__System__HudOverlay/PainterlyNPR__Interface__Panel__.mjs';
import { PainterlyNPR__TypeIn__Register } from '../80__System__HudOverlay/PainterlyNPR__Interface__TypeIn__.mjs';
import { PainterlyNPR__Interface__UpdateSettingsJson } from '../85__System__ProjectPersistence/PainterlyNPR__Interface__SettingsJson__.mjs';
import {
    PainterlyNPR__GroundCut__Clean,
    PainterlyNPR__GroundCut__Colours,
    PainterlyNPR__GroundCut__Controls,
    PainterlyNPR__GroundCut__Kinds,
    PainterlyNPR__GroundCut__MenuItems,
    PainterlyNPR__GroundCut__NewSeed,
    PainterlyNPR__GroundCut__Resolve,
    PainterlyNPR__GroundCut__WithKind,
} from './PainterlyNPR__GroundCut__Settings__.mjs';
import {
    PainterlyNPR__GroundCut__OnElevation,
    PainterlyNPR__GroundCut__Record,
    PainterlyNPR__GroundCut__SheetIdentity,
} from './PainterlyNPR__GroundCut__Sheet__.mjs';

// =============================================================================
// REGION | Sheet Composer - Ground Cut Panel
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__GroundCut__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const SHEET_UI  =  PainterlyNPR__ConfigAccess__Section(GroundConfig, 'PainterlyNPR__GroundCut__Config', 'Sheet', ['Title', 'Show', 'Height']);
    const WORDS     =  PainterlyNPR__ConfigAccess__Section(GroundConfig, 'PainterlyNPR__GroundCut__Config', 'Menu', ['Kind', 'Colour', 'NewSwish', 'Flip', 'Reset']);
    const HEIGHT_READOUT  =  PainterlyNPR__Interface__FormatFrom(SHEET_UI.Height.Format);
    // ------------------------------------------------------------


    // MODULE STATE | The Rows Built Into the Panel (null: this page has none)
    // ------------------------------------------------------------
    const Panel  =  { Rows: null };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Changing the Cut
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | What Moves When the Cut Does: the cut and the compositor, nothing else
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCutPanel__Moved() {
        PainterlyNPR__RenderGraph__Bump('GroundCut');
        PainterlyNPR__Interface__UpdateSettingsJson();
        PainterlyNPR__RenderGraph__Request('Refine');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Sheet's Starting Look, for Its Own Kind (the seed and Flip kept)
    // ------------------------------------------------------------
    // A kind's own look is drawn for a viewport's short stroke. The sheet's starting
    // kind has its own for a whole sheet, in the starting state: going back to that
    // kind goes back to that look.
    function PainterlyNPR__GroundCutPanel__StartLook(kept) {
        const look  =  PainterlyNPR__AppCore__DefaultState().Composition.GroundCut.Settings;
        if (kept.Seed !== undefined) look.Seed = kept.Seed;
        if (kept.Flip) look.Flip = true;
        return look;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Change the Painter's Settings - mutate(settings) returns the next, kept in its clean form
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCutPanel__Change(mutate) {
        const record  =  PainterlyNPR__GroundCut__Record();
        const before  =  PainterlyNPR__GroundCut__Resolve(record.Settings, '').Kind;
        const now     =  record.Settings ? JSON.parse(JSON.stringify(record.Settings)) : {};
        const next    =  mutate(now);
        const start   =  PainterlyNPR__AppCore__DefaultState().Composition.GroundCut.Settings.Kind;
        record.Settings  =  PainterlyNPR__GroundCut__Clean(next.Kind === start && before !== start ? PainterlyNPR__GroundCutPanel__StartLook(next) : next);
        PainterlyNPR__GroundCutPanel__Moved();
    }

    function PainterlyNPR__GroundCutPanel__ChangeAndShow(mutate) {
        PainterlyNPR__GroundCutPanel__Change(mutate);
        PainterlyNPR__GroundCutPanel__Sync();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Sheet's Switch, and Back to Its Starting Look (the seed and Flip kept)
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCutPanel__SetOn(on) {
        PainterlyNPR__GroundCut__Record().On  =  !!on;
        PainterlyNPR__GroundCutPanel__Moved();
        PainterlyNPR__GroundCutPanel__Sync();
    }

    function PainterlyNPR__GroundCutPanel__Reset() {
        const start  =  PainterlyNPR__AppCore__DefaultState().Composition.GroundCut.Settings.Kind;
        PainterlyNPR__GroundCutPanel__ChangeAndShow((st) => {
            const kind  =  st.Kind || start;
            return kind === start ? PainterlyNPR__GroundCutPanel__StartLook(st) : PainterlyNPR__GroundCut__WithKind(st, kind);   // <-- The sheet's own look for its own kind, a kind's own for any other
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Panel's Rows
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Slider Row, in the Panel's Own Markup (its readout can be typed into)
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCutPanel__Slider(label, hint, min, max, step, readout, set) {
        const input   =  E('input', [['type', 'range'], ['min', String(min)], ['max', String(max)], ['step', String(step)]]);
        const output  =  E('output');
        input.addEventListener('input', () => {
            const value  =  parseFloat(input.value);
            output.textContent  =  readout(value);
            set(value);
        });
        const row  =  E('label', [['class', 'PainterlyNPR__Field'], ['title', hint || '']], [E('span', [['class', 'PainterlyNPR__Field__Label']], [label]), input, output]);
        PainterlyNPR__TypeIn__Register(input, readout);
        return { Row: row, Input: input, Output: output, Readout: readout };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Menu Row and a Tick Row
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCutPanel__Menu(label, choose) {
        const select  =  E('select');
        select.addEventListener('change', () => choose(select.value));
        return { Row: E('label', [['class', 'PainterlyNPR__Field']], [E('span', [['class', 'PainterlyNPR__Field__Label']], [label]), select]), Select: select };
    }

    function PainterlyNPR__GroundCutPanel__Fill(select, options) {
        select.replaceChildren(...options.map(option => E('option', [['value', option.Key]], [option.Label])));
    }

    function PainterlyNPR__GroundCutPanel__Tick(label, hint, set) {
        const check  =  E('input', [['type', 'checkbox']]);
        check.addEventListener('change', () => set(check.checked));
        return { Row: E('label', [['class', 'PainterlyNPR__Toggle'], ['title', hint || '']], [check, ` ${label}`]), Check: check };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Rows Into the Panel's Placeholder - once, as the Interface Is Wired
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCutPanel__Wire() {
        const host  =  $('[data-ground-cut]');
        if (!host || Panel.Rows) return;
        const change  =  PainterlyNPR__GroundCutPanel__Change;
        const show    =  PainterlyNPR__GroundCutPanel__ChangeAndShow;

        const on      =  PainterlyNPR__GroundCutPanel__Tick(SHEET_UI.Show.Label, SHEET_UI.Show.Hint, PainterlyNPR__GroundCutPanel__SetOn);
        const h       =  SHEET_UI.Height;
        const height  =  PainterlyNPR__GroundCutPanel__Slider(h.Label, h.Hint, h.Min, h.Max, h.Step, HEIGHT_READOUT, (value) => { PainterlyNPR__GroundCut__Record().RaiseMm = value; PainterlyNPR__GroundCutPanel__Moved(); });
        const kind    =  PainterlyNPR__GroundCutPanel__Menu(WORDS.Kind.Label, (key) => show((st) => PainterlyNPR__GroundCut__WithKind(st, key)));
        const colour  =  PainterlyNPR__GroundCutPanel__Menu(WORDS.Colour.Label, (key) => show((st) => Object.assign(st, { Colour: key })));
        PainterlyNPR__GroundCutPanel__Fill(kind.Select, PainterlyNPR__GroundCut__Kinds());

        const chip    =  (word, act) => {
            const button  =  E('button', [['type', 'button'], ['class', 'PainterlyNPR__Chip'], ['title', word.Title]], [word.Label]);
            button.addEventListener('click', act);
            return button;
        };
        const flip    =  chip(WORDS.Flip, () => show((st) => Object.assign(st, { Flip: !st.Flip })));
        const chips   =  E('div', [['class', 'PainterlyNPR__ChipRow']], [
            chip(WORDS.NewSwish, () => show((st) => PainterlyNPR__GroundCut__NewSeed(st))),
            flip,
            chip(WORDS.Reset, PainterlyNPR__GroundCutPanel__Reset),
        ]);

        const ticks    =  {};
        const sliders  =  {};
        const look     =  E('div', [['class', 'PainterlyNPR__GroundCut__Look']], [colour.Row, chips]);
        for (const c of PainterlyNPR__GroundCut__Controls()) {
            if (c.Type === 'Toggle') {
                ticks[c.Key]  =  PainterlyNPR__GroundCutPanel__Tick(c.Label, c.Hint, (checked) => show((st) => Object.assign(st, { [c.Key]: checked })));
                look.appendChild(ticks[c.Key].Row);
                continue;
            }
            sliders[c.Key]  =  PainterlyNPR__GroundCutPanel__Slider(c.Label, c.Hint, c.Min, c.Max, c.Step, c.Readout, (value) => change((st) => { st.Values = Object.assign({}, st.Values, { [c.Key]: value }); return st; }));
            look.appendChild(sliders[c.Key].Row);
        }

        host.append(on.Row, height.Row, kind.Row, look);
        Panel.Rows  =  { On: on, Height: height, Kind: kind, Colour: colour, ColourOf: null, Flip: flip, Look: look, Ticks: ticks, Sliders: sliders };
        PainterlyNPR__GroundCutPanel__Sync();
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Cut as It Is Now (SyncControls calls this: a preset, a load, an undo)
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCutPanel__Sync() {
        const rows  =  Panel.Rows;
        if (!rows) return;
        const record  =  PainterlyNPR__GroundCut__Record();
        const s       =  PainterlyNPR__GroundCut__Resolve(record.Settings, PainterlyNPR__GroundCut__SheetIdentity());
        const set     =  (slider, value) => { slider.Input.value = value; slider.Output.textContent = slider.Readout(value); };
        rows.On.Check.checked  =  !!record.On;
        set(rows.Height, Number(record.RaiseMm) || 0);
        rows.Kind.Select.value  =  s.Kind;
        if (rows.ColourOf !== s.Kind) {
            PainterlyNPR__GroundCutPanel__Fill(rows.Colour.Select, PainterlyNPR__GroundCut__Colours(s.Kind));
            rows.ColourOf  =  s.Kind;
        }
        if (s.Colour) rows.Colour.Select.value = s.Colour;
        rows.Look.hidden  =  s.Plain;
        rows.Flip.classList.toggle('PainterlyNPR__Button--active', s.Flip);
        rows.Flip.setAttribute('aria-pressed', String(s.Flip));
        for (const [key, tick] of Object.entries(rows.Ticks)) tick.Check.checked = !!s[key];
        for (const [key, slider] of Object.entries(rows.Sliders)) set(slider, s.Values[key]);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Right-Click Menu
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Open the Panel's Ground Cut-Off Group, Unfolding What Holds It
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCutPanel__Reveal() {
        const host  =  $('[data-ground-cut]');
        if (!host) return;
        if (Ui.Root && Ui.Root.classList.contains('PainterlyNPR--foldPanel')) PainterlyNPR__Interface__SetFold('Panel', false);
        for (let el = host.parentElement; el; el = el.parentElement) if (el.tagName === 'DETAILS') el.open = true;
        host.scrollIntoView({ block: 'nearest' });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Drawing's Menu Items on an Elevation (none on any other view, or for a host that never asked)
    // ------------------------------------------------------------
    function PainterlyNPR__GroundCutPanel__MenuItems() {
        if (!PainterlyNPR__GroundCut__OnElevation()) return [];
        const record  =  PainterlyNPR__GroundCut__Record();
        const change  =  (mutate) => () => PainterlyNPR__GroundCutPanel__ChangeAndShow(mutate);
        const items   =  PainterlyNPR__GroundCut__MenuItems(record.Settings, PainterlyNPR__GroundCut__SheetIdentity(), change, PainterlyNPR__GroundCutPanel__Reveal);
        return [
            { Separator: true },
            { Label: SHEET_UI.Title, Submenu: [
                ...items,
                { Separator: true },
                { Label: SHEET_UI.Show.Label, Title: SHEET_UI.Show.Hint, Checked: !!record.On, Action: () => PainterlyNPR__GroundCutPanel__SetOn(!record.On) },
            ] },
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__GroundCutPanel__MenuItems,
        PainterlyNPR__GroundCutPanel__Sync,
        PainterlyNPR__GroundCutPanel__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
