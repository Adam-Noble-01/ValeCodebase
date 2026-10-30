// =============================================================================
// VALEVISION AURA - DRAWING SHEETS - THE TABS
// =============================================================================
//
// FILE       : Na__DrawingSheets__Tabs__.js
// NAMESPACE  : Na__Tabs
// MODULE     : Drawing Sheets - Tabs
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The tab strip: the 3D Environment first, then one tab per drawing
//              sheet, and New sheet (A1 to A4, landscape or portrait)
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - A sheet tab shows its name and paper ("Elevations - A1"). Double-click a
//   tab to rename it; the sheet's panel can delete it.
// - NEW SHEET asks for a name, a paper size and an orientation, then opens it.
// - The open tab is kept in the address (#sheet=<id>), so a reload returns to it.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__Set, Na__AppState__Touch } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El, Na__Dom__Icon, Na__Dom__IconButton, Na__Dom__Clear, Na__Dom__Field, Na__Dom__Select } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';
    import { Na__DrawingSet__NewSheet } from '../40__Feature__DrawingSet/Na__DrawingSet__Model__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Tabs__State = { strip: null, onOpen: null };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Strip
// -----------------------------------------------------------------------------

    // FUNCTION | Draw the Tabs
    // ------------------------------------------------------------
    function Na__Tabs__Render() {
        const S = Na__Tabs__State;
        const d = Na__AppState__Data;
        if (!S.strip || !d.doc) return;
        Na__Dom__Clear(S.strip);

        const env = Na__Dom__El('button', `aura-tab${d.tab === 'environment' ? ' is-active' : ''}`, null, { type: 'button', role: 'tab', 'aria-selected': String(d.tab === 'environment') });
        env.appendChild(Na__Dom__Icon('cube'));
        env.appendChild(Na__Dom__El('span', 'aura-tab__label', '3D Environment'));
        env.addEventListener('click', () => Na__Tabs__Open('environment'));
        S.strip.appendChild(env);

        d.doc.AuraDrawingSet__Sheets.forEach((sheet) => {
            const active = d.tab === sheet.Sheet__Id;
            const tab = Na__Dom__El('button', `aura-tab${active ? ' is-active' : ''}`, null, { type: 'button', role: 'tab', 'aria-selected': String(active), title: 'Double-click to rename' });
            tab.appendChild(Na__Dom__Icon('sheet'));
            tab.appendChild(Na__Dom__El('span', 'aura-tab__label', sheet.Sheet__Name));
            tab.appendChild(Na__Dom__El('span', 'aura-tab__paper', `${sheet.Sheet__PaperSize}${sheet.Sheet__Orientation === 'portrait' ? ' P' : ''}`));
            tab.addEventListener('click', () => Na__Tabs__Open(sheet.Sheet__Id));
            tab.addEventListener('dblclick', () => Na__Tabs__Rename(sheet));
            S.strip.appendChild(tab);
        });

        const add = Na__Dom__IconButton('plus', 'aura-tab aura-tab--add', 'New sheet', 'Add a drawing sheet: A1 to A4, landscape or portrait');
        add.addEventListener('click', () => Na__Tabs__NewSheetDialog());
        S.strip.appendChild(add);
    }
    // ------------------------------------------------------------


    // FUNCTION | Open a Tab ('environment' or a sheet id)
    // ------------------------------------------------------------
    function Na__Tabs__Open(tab) {
        const d = Na__AppState__Data;
        const exists = tab === 'environment' || (d.doc && d.doc.AuraDrawingSet__Sheets.some((s) => s.Sheet__Id === tab));
        const next = exists ? tab : 'environment';
        Na__AppState__Set({ tab: next });
        try { window.history.replaceState(null, '', next === 'environment' ? window.location.pathname + window.location.search : `#sheet=${encodeURIComponent(next)}`); }
        catch (error) { /* the address is a nicety */ }
        Na__Tabs__Render();
        if (Na__Tabs__State.onOpen) Na__Tabs__State.onOpen(next);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Rename a Sheet
    // ------------------------------------------------------------
    function Na__Tabs__Rename(sheet) {
        const name = window.prompt('Name this sheet', sheet.Sheet__Name);
        if (name === null) return;
        sheet.Sheet__Name = name.trim().slice(0, 80) || sheet.Sheet__Name;
        Na__AppState__Touch('sheet', sheet.Sheet__Id);
        Na__Tabs__Render();
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a Sheet (asks first)
    // ------------------------------------------------------------
    function Na__Tabs__Delete(sheet) {
        const d = Na__AppState__Data;
        if (!window.confirm(`Delete the sheet "${sheet.Sheet__Name}" and everything on it? The previous save is kept as a revision in the project.`)) return;
        d.doc.AuraDrawingSet__Sheets = d.doc.AuraDrawingSet__Sheets.filter((s) => s !== sheet);
        Na__AppState__Touch('sheet', null);
        Na__Tabs__Open('environment');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | New Sheet
// -----------------------------------------------------------------------------

    // FUNCTION | Ask for a Name, Paper and Orientation, Then Open the New Sheet
    // ------------------------------------------------------------
    function Na__Tabs__NewSheetDialog() {
        const d = Na__AppState__Data;
        if (d.doc.AuraDrawingSet__Sheets.length >= Na__AppConfig__Get('Save__MaxSheets', 60)) {
            Na__Toast__Show('This drawing set has as many sheets as it can hold.', { error: true });
            return;
        }
        const dialog = Na__Dom__El('dialog', 'aura-dialog');
        const form = Na__Dom__El('form', 'aura-dialog__body', null, { method: 'dialog' });
        form.appendChild(Na__Dom__El('h2', 'aura-dialog__title', 'New sheet'));
        const name = Na__Dom__El('input', 'aura-input', null, { type: 'text', maxlength: 80, required: true });
        name.value = `Sheet ${d.doc.AuraDrawingSet__Sheets.length + 1}`;
        form.appendChild(Na__Dom__Field('Name', name));
        const sizes = Object.keys(Na__AppConfig__Get('Sheet__PaperSizes', {})).map((k) => ({ value: k, label: k }));
        const size = Na__Dom__Select(sizes, Na__AppConfig__Get('Sheet__DefaultPaperSize', 'A3'));
        const turn = Na__Dom__Select([{ value: 'landscape', label: 'Landscape' }, { value: 'portrait', label: 'Portrait' }], Na__AppConfig__Get('Sheet__DefaultOrientation', 'landscape'));
        const pair = Na__Dom__El('div', 'aura-field-pair');
        pair.appendChild(Na__Dom__Field('Paper', size));
        pair.appendChild(Na__Dom__Field('Orientation', turn));
        form.appendChild(pair);
        form.appendChild(Na__Dom__El('p', 'aura-panel__note', 'Vale\'s drawing page: the title column sits at the bottom right in landscape and along the foot in portrait.'));
        const actions = Na__Dom__El('div', 'aura-dialog__actions');
        const cancel = Na__Dom__El('button', 'aura-button', 'Cancel', { type: 'button' });
        cancel.addEventListener('click', () => dialog.close());
        const create = Na__Dom__El('button', 'aura-button aura-button--primary', 'Create sheet', { type: 'submit' });
        actions.appendChild(cancel);
        actions.appendChild(create);
        form.appendChild(actions);
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const project = d.project || {};
            const sheet = Na__DrawingSet__NewSheet({
                name        : name.value.trim() || 'Sheet',
                paperSize   : size.value,
                orientation : turn.value,
                fields      : {
                    Client    : project.title || '',
                    Address   : project.address || '',
                    DrawnBy   : d.user ? d.user.name || '' : '',
                    DrawingNo : `${project.code ? project.code + '-' : ''}AURA-${String(d.doc.AuraDrawingSet__Sheets.length + 1).padStart(2, '0')}`
                }
            });
            d.doc.AuraDrawingSet__Sheets.push(sheet);
            Na__AppState__Touch('sheet', sheet.Sheet__Id);
            dialog.close();
            Na__Tabs__Open(sheet.Sheet__Id);
        });
        dialog.appendChild(form);
        dialog.addEventListener('close', () => dialog.remove());
        document.body.appendChild(dialog);
        dialog.showModal();
        name.select();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mount
// -----------------------------------------------------------------------------

    // FUNCTION | Mount the Strip; onOpen(tab) shows the tab's content
    // ------------------------------------------------------------
    function Na__Tabs__Mount(strip, onOpen) {
        Na__Tabs__State.strip = strip;
        Na__Tabs__State.onOpen = onOpen;
        Na__Tabs__Render();
    }

    // The tab the address asks for (#sheet=<id>), else the 3D Environment
    function Na__Tabs__FromAddress() {
        const m = /[#&]sheet=([^&]+)/.exec(window.location.hash || '');
        return m ? decodeURIComponent(m[1]) : 'environment';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Tabs__Mount,
        Na__Tabs__Render,
        Na__Tabs__Open,
        Na__Tabs__Delete,
        Na__Tabs__FromAddress
    };

// endregion -------------------------------------------------------------------
