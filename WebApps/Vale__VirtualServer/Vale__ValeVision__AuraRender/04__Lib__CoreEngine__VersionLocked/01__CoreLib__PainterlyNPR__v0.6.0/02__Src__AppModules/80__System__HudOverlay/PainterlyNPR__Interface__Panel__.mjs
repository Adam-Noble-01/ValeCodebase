/* =============================================================================
   PAINTERLYNPR - HUD | INTERFACE - THE PANEL
   =============================================================================

   FILE       : PainterlyNPR__Interface__Panel__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Hud - Interface - Panel
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the control panel from its description in
                Na__Interface__Panel__Config.json - the tabs, groups, folds,
                sliders, menus and hints - before the interface is wired
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - AppCore Init calls BuildPanel on the page's empty panel element once WebGL 2 is
     there, then the interface is wired: every listener finds the controls by the
     same data attributes and ids the page's markup gave them before v0.5.0.
   - A slider is described once. Its item in the panel names its control
     ({ "Range": "PenWobble" }); its label, min, max and step sit with the state it
     sets, its bump and its readout format in Na__Interface__Controls__Config.json.
   - An item is a Group, a Fold, a Range, a Select, a Hint, a row of Buttons or
     Chips, the Tabs - or, for anything with no kind of its own, an Element written
     out with its attributes and children, or a Text. Each kind builds exactly the
     markup Experiment 01's page carried, attribute for attribute, so the
     stylesheets and the interface read it as they read that.
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
        if ('Group' in item) return E('div', [['class', 'PainterlyNPR__Group']], [E('h3', [['class', 'PainterlyNPR__Group__Title']], [item.Group]), ...many(item.Items)]);
        if ('Fold' in item) {
            const attrs  =  [['class', 'PainterlyNPR__Group PainterlyNPR__Fold']];
            if (item.Open) attrs.push(['open', '']);
            return E('details', attrs, [E('summary', [['class', 'PainterlyNPR__Group__Title']], [item.Fold]), ...many(item.Items)]);
        }
        if ('Buttons' in item || 'Chips' in item) {
            const chips  =  'Chips' in item;
            const row    =  (chips ? 'PainterlyNPR__ChipRow' : 'PainterlyNPR__ButtonGrid') + (item.Class ? ' ' + item.Class : '');
            return E('div', [['class', row]], (chips ? item.Chips : item.Buttons).map(b =>
                E('button', [['type', 'button'], ['class', chips ? 'PainterlyNPR__Chip' : 'PainterlyNPR__Button'], ['data-' + b.Data[0], b.Data[1]]], [b.Text])));
        }
        if ('Tabs' in item) {
            const tabs  =  item.Tabs.map(t => E('button', [['type', 'button'], ['role', 'tab'], ['class', 'PainterlyNPR__Tab'], ['data-tab', t.Key], ['aria-selected', String(t.Selected)]], [t.Label]));
            const f     =  item.FoldButton;
            tabs.push(E('button', [['type', 'button'], ['class', 'PainterlyNPR__FoldButton'], ['data-fold', f.Fold], ['aria-expanded', String(f.Expanded)], ['title', f.Title]], [f.Text]));
            return E('nav', [['class', 'PainterlyNPR__Tabs'], ['role', 'tablist']], tabs);
        }
        if ('Element' in item) return E(item.Element, item.Attrs, (item.Children || []).map(c => 'Text' in c ? c.Text : PainterlyNPR__Interface__PanelItem(c)));
        if ('Text' in item) return document.createTextNode(item.Text);
        throw new Error(`[PainterlyNPR Panel] An item of no kind: ${JSON.stringify(item).slice(0, 120)}`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Panel Into the Page's Panel Element
    // ------------------------------------------------------------
    // The unfold button and the tabs first, then one section a tab, in the
    // config's order; a section that starts hidden carries the hidden attribute.
    function PainterlyNPR__Interface__BuildPanel(aside) {
        if (!aside) throw new Error('[PainterlyNPR Panel] The page has no panel element (.PainterlyNPR__Panel).');
        for (const item of SHELL.Before) aside.appendChild(PainterlyNPR__Interface__PanelItem(item));
        for (const key of SHELL.Sections) {
            const section  =  PainterlyNPR__ConfigAccess__Section(PanelConfig, PANEL_ROOT, key, ['Hidden', 'Items']);
            const attrs    =  [['class', 'PainterlyNPR__PanelBody'], ['data-panel', key]];
            if (section.Hidden) attrs.push(['hidden', '']);
            aside.appendChild(PainterlyNPR__Interface__PanelElement('section', attrs, section.Items.map(PainterlyNPR__Interface__PanelItem)));
        }
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
