/* =============================================================================
   PAINTERLYNPR - HUD | INTERFACE - THE PANEL
   =============================================================================

   FILE       : PainterlyNPR__Interface__Panel__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - Interface - Panel
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the control panel from its description in
                Na__Interface__Panel__Config.json - the fold-down sections,
                groups, folds, sliders, menus and hints - before the interface
                is wired
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - AppCore Init calls BuildPanel on the page's empty panel element once WebGL 2 is
     there, then the interface is wired: every listener finds the controls by the
     same data attributes and ids the page's markup gave them before v0.5.0.
   - A slider is described once. Its item in the panel names its control
     ({ "Range": "PenWobble" }); its label, min, max and step sit with the state it
     sets, its bump and its readout format in Na__Interface__Controls__Config.json.
   - An item is a Group, a Fold, a Range, a Select, a Hint, a row of Buttons or
     Chips - or, for anything with no kind of its own, an Element written out with
     its attributes and children, or a Text. Each kind builds the markup Experiment
     01's page carried, attribute for attribute, so the stylesheets and the
     interface read it as they read that.
   - AURA'S FLOW (v0.7.2, Adam: "use the same menu flow of nested folddown
     sections as aura ... with the styling remaining the same and the extra
     parameters"): the tabs are gone. The panel is one column of fold-down
     sections in AURA's order, each a <details data-panel>; a titled Group inside
     one is itself a fold, so the folds nest as AURA's do. An
     untitled Group (a section that is one group) is a plain block, so its title
     is never said twice.
   - EVERY FOLD STARTS FOLDED, sections and the groups and folds inside them,
     and opening one folds its open siblings at the same level (v0.8.4,
     Adam: "keep them all folded and then when a user unfolds the section they
     want in the parameters the other parameter sections fold"); the Wire does
     the folding. A Fold's Open in the config is no longer read, and nothing
     about the sections is remembered any more.
   - EACH SECTION'S HEAD CARRIES ITS LINE ICON before its title (v0.8.11, Adam:
     "Create icons for the menus in the NPR Test app but change the color to
     suit the UI col pallette"): the Shell's SectionIcons names the file by the
     section's key, AURA's panel icons in the palette's sepia, shown as <img>.
   - The panel's elements are made with the DOM, never from an HTML string.

   ============================================================================= */

import PanelConfig from './Na__Interface__Panel__Config.json' with { type: 'json' };
import ControlsConfig from './Na__Interface__Controls__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Interface - The Panel
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__Interface__Panel__Config.json and the controls'
    // ------------------------------------------------------------
    const PANEL_ROOT  =  'PainterlyNPR__InterfacePanel__Config';
    const SHELL       =  PainterlyNPR__ConfigAccess__Section(PanelConfig, PANEL_ROOT, 'Shell', ['Before', 'Sections']);
    const RANGES      =  PainterlyNPR__ConfigAccess__Section(ControlsConfig, 'PainterlyNPR__InterfaceControls__Config', 'Controls', ['Controls']).Controls;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | An Element - its attributes in order, its children appended
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__PanelElement(tag, attrs, children) {
        const el  =  document.createElement(tag);
        for (const [name, value] of attrs || []) el.setAttribute(name, value);
        for (const child of children || []) el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
        return el;
    }
    // ------------------------------------------------------------


    // FUNCTION | One Item - by its kind, as the page's markup had it
    // ------------------------------------------------------------
    function PainterlyNPR__Interface__PanelItem(item) {
        const E     =  PainterlyNPR__Interface__PanelElement;
        const many  =  (items) => (items || []).map(PainterlyNPR__Interface__PanelItem);
        if ('Range' in item) {
            const c  =  RANGES[item.Range];
            if (!c || !('Label' in c)) throw new Error(`[PainterlyNPR Panel] No range control ${item.Range} in Na__Interface__Controls__Config.json.`);
            return E('label', [['class', 'PainterlyNPR__Field']], [
                E('span', [['class', 'PainterlyNPR__Field__Label']], [c.Label]),
                E('input', [['type', 'range'], ['min', String(c.Min)], ['max', String(c.Max)], ['step', String(c.Step)], ['data-control', item.Range]]),
                E('output', [['data-readout', item.Range]]),
            ]);
        }
        if ('Select' in item) {
            return E('label', [['class', 'PainterlyNPR__Field']], [
                E('span', [['class', 'PainterlyNPR__Field__Label']], [item.Label]),
                E('select', [[item.By, item.Select]], item.Options.map(([value, text]) => E('option', [['value', value]], [text]))),
            ]);
        }
        if ('Hint' in item) return E('p', [['class', 'PainterlyNPR__Hint']], [item.Hint]);
        if ('Group' in item && !item.Group) return E('div', [['class', 'PainterlyNPR__Group']], many(item.Items));   // <-- A section that is one group: its head already says the title
        if ('Group' in item) return E('details', [['class', 'PainterlyNPR__Group PainterlyNPR__Fold']], [E('summary', [['class', 'PainterlyNPR__Group__Title']], [item.Group]), ...many(item.Items)]);   // <-- Nested in its section, as AURA's groups fold (v0.7.2); folded at first (v0.8.4)
        if ('Fold' in item) {
            const attrs  =  [['class', 'PainterlyNPR__Group PainterlyNPR__Fold']];
            return E('details', attrs, [E('summary', [['class', 'PainterlyNPR__Group__Title']], [item.Fold]), ...many(item.Items)]);
        }
        if ('Buttons' in item || 'Chips' in item) {
            const chips  =  'Chips' in item;
            const row    =  (chips ? 'PainterlyNPR__ChipRow' : 'PainterlyNPR__ButtonGrid') + (item.Class ? ' ' + item.Class : '');
            return E('div', [['class', row]], (chips ? item.Chips : item.Buttons).map(b =>
                E('button', [['type', 'button'], ['class', chips ? 'PainterlyNPR__Chip' : 'PainterlyNPR__Button'], ['data-' + b.Data[0], b.Data[1]]], [b.Text])));
        }
        if ('Element' in item) return E(item.Element, item.Attrs, (item.Children || []).map(c => 'Text' in c ? c.Text : PainterlyNPR__Interface__PanelItem(c)));
        if ('Text' in item) return document.createTextNode(item.Text);
        throw new Error(`[PainterlyNPR Panel] An item of no kind: ${JSON.stringify(item).slice(0, 120)}`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Panel Into the Page's Panel Element
    // ------------------------------------------------------------
    // The unfold button and the head first, then one scrolling column of
    // fold-down sections in the config's order, every one folded (v0.8.4).
    function PainterlyNPR__Interface__BuildPanel(aside) {
        if (!aside) throw new Error('[PainterlyNPR Panel] The page has no panel element (.PainterlyNPR__Panel).');
        const E     =  PainterlyNPR__Interface__PanelElement;
        for (const item of SHELL.Before) aside.appendChild(PainterlyNPR__Interface__PanelItem(item));
        const column  =  E('div', [['class', 'PainterlyNPR__PanelBody PainterlyNPR__Sections']]);
        for (const key of SHELL.Sections) {
            const section  =  PainterlyNPR__ConfigAccess__Section(PanelConfig, PANEL_ROOT, key, ['Label', 'Items']);
            const attrs    =  [['class', 'PainterlyNPR__Section'], ['data-panel', key]];
            const head     =  [E('span', [['class', 'PainterlyNPR__Section__Title']], [section.Label])];
            if (SHELL.SectionIcons) {
                const icon  =  E('img', [['class', 'PainterlyNPR__Section__Icon'], ['src', SHELL.SectionIcons.replace('{Key}', key)], ['alt', ''], ['aria-hidden', 'true'], ['draggable', 'false']]);
                icon.addEventListener('error', () => icon.remove());                     // <-- A section with no icon file shows none, never a broken image
                head.unshift(icon);
            }
            column.appendChild(E('details', attrs, [
                E('summary', [['class', 'PainterlyNPR__Section__Head']], head),
                E('div', [['class', 'PainterlyNPR__Section__Body']], section.Items.map(PainterlyNPR__Interface__PanelItem)),
            ]));
        }
        aside.appendChild(column);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__Interface__BuildPanel,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
