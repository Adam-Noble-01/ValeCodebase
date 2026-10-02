// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - DEV MENU CONTROLS
// =============================================================================
//
// FILE       : Na__LayoutEditor__DevMenu__Controls__.js
// NAMESPACE  : Na__LeDev
// MODULE     : Layout Editor - Dev Menu Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Localhost-only Dev Tools section: sheets, save, bake, export
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - A Dev Tools section beside Floor Plans, Elevations and Projected
//   Linework: the sheet list with Open, New Sheet, Duplicate, Delete (asks
//   first), Save Sheets, Bake Snapshots and Linework (every 3D viewport's
//   picture and every drawing's linework to R2, so the web build renders
//   nothing), Export PDF of the open sheet, and Leave Editor.
// - An Enable Layout Mode switch heads the section, off by default and
//   saved with the project the moment it changes. While it is off the
//   project shows no drawing tabs, here or on the live site, and the section
//   holds only the switch, so a sheet can never open without tabs to leave
//   it by.
// - WORKS BEFORE THE EDITOR HAS LOADED. The section is imported the first
//   time it is opened and reaches the editor only through
//   Na__LayoutEditor__Loader__. It looks the same either side of the load:
//   the switch and Save Sheets never load the editor; Open, New Sheet,
//   Duplicate, Delete and Bake load it first, behind the loading screen.
//
// INTEGRATION:
// - Imported and initialized by Na__LayoutEditor__Loader__ when its toggle is
//   first clicked; never by index.html.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : ValeVision3D 50__System__ProjectedLinework/Na__ProjectedLinework__DevMenu__Controls__.js (section pattern)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Sep-2026 - Version 1.4.0
// - The sheet list and the delete prompt name a sheet as its tab does
//   (Na__LeLoad__GetTabLabel, "D03 - Elevations"), in place of its place in the
//   order and a name that no longer carries a number. Ported from TrueVision3D
//   v2.70.0.
//
// 15-Sep-2026 - Version 1.3.0
// - Loads before the editor and without it: the sheet model, mode
//   controller, config, Viewport3d and PDF exporter are reached through
//   Na__LayoutEditor__Loader__, so opening the section no longer needs the
//   editor, and an action that does needs it loads it first.
// - Initialize takes open: the loader spends the first toggle click on the
//   import and asks the section to open itself.
// - Layout Mode wording follows the one rule: no tabs here or on the live
//   site while it is off, and New Sheet makes a project's first sheet.
//
// 11-Sep-2026 - Version 1.2.0
// - Enable Layout Mode switch (per project, saved at once, off by default);
//   the sheet list and actions only appear while it is on.
//
// 10-Sep-2026 - Version 1.1.0
// - Bake names the drawings that sheet viewports want linework for; readable progress and counts.
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Layout Editor Loader, the Linework Store and the Confirm Dialog
    // ------------------------------------------------------------
    // The linework store and the confirm dialog are on the start-up path
    // already. Nothing from the editor may be imported here: the section
    // loads before the editor does, and a static import would pull it in.
    // ------------------------------------------------------------
    import {
        Na__LeLoad__SHEETS_EVENT,
        Na__LeLoad__MODE_EVENT,
        Na__LeLoad__STATE_EVENT,
        Na__LeLoad__GetLabel,
        Na__LeLoad__FormatLabel,
        Na__LeLoad__GetTabLabel,
        Na__LeLoad__GetEditor,
        Na__LeLoad__Require,
        Na__LeLoad__GetSheets,
        Na__LeLoad__GetActiveSheet,
        Na__LeLoad__IsActive,
        Na__LeLoad__IsDirty,
        Na__LeLoad__IsLayoutModeOn,
        Na__LeLoad__SetLayoutMode,
        Na__LeLoad__Enter,
        Na__LeLoad__Leave,
        Na__LeLoad__CreateSheet,
        Na__LeLoad__DuplicateSheet,
        Na__LeLoad__DeleteSheet,
        Na__LeLoad__Save
    } from '../01__Core__Loader/Na__LayoutEditor__Loader__.js';
    import { Na__PlStore__BakeAll } from '../../50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js';
    import { Na__AppUtils__ConfirmDialog__Show } from '../../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Element Ids (must match index.html)
    // ------------------------------------------------------------
    const Na__LeDev__ITEM_ID   = 'naLayoutEditorDevItem';
    const Na__LeDev__TOGGLE_ID = 'naLayoutEditorDevToggle';
    const Na__LeDev__PANEL_ID  = 'naLayoutEditorDevPanel';
    // ------------------------------------------------------------

    // MODULE VARIABLES | Panel, Toast and Busy State
    // ------------------------------------------------------------
    let Na__LeDev__Panel     = null;
    let Na__LeDev__ShowToast = null;
    let Na__LeDev__Busy      = false;
    let Na__LeDev__Note      = '';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Button and Toast
    // ------------------------------------------------------------
    function Na__LeDev__Button(text, modifierClass, onClick) {
        const button = document.createElement('button');
        button.type        = 'button';
        button.className   = 'na-pm-dev__btn' + (modifierClass ? ' ' + modifierClass : '');
        button.textContent = text;
        button.disabled    = Na__LeDev__Busy;
        button.addEventListener('click', onClick);
        return button;
    }
    function Na__LeDev__Toast(message, isError) {
        if (typeof Na__LeDev__ShowToast === 'function') Na__LeDev__ShowToast(message, isError === true);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Run a Long Action With the Buttons Disabled
    // ------------------------------------------------------------
    async function Na__LeDev__Run(task) {
        if (Na__LeDev__Busy) return;
        Na__LeDev__Busy = true; Na__LeDev__Render();
        try { await task(); }
        catch (error) { console.error('[ValeVision3D LayoutEditor] Dev action failed:', error); Na__LeDev__Toast(String(error && error.message || error), true); }
        finally { Na__LeDev__Busy = false; Na__LeDev__Render(); }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Actions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Delete a Sheet After Confirmation
    // ------------------------------------------------------------
    // Asked first, so a cancelled delete never loads the editor.
    // ------------------------------------------------------------
    async function Na__LeDev__Delete(sheet) {
        const ok = await Na__AppUtils__ConfirmDialog__Show({
            title : Na__LeLoad__GetLabel('DeleteSheetTitle', 'Delete sheet'),
            message : Na__LeLoad__FormatLabel('DeleteSheetPrompt', 'Delete the sheet "{name}"? Its viewports, text and dimensions go with it.', { name : Na__LeLoad__GetTabLabel(sheet) }),
            confirmLabel : Na__LeLoad__GetLabel('DeleteLabel', 'Delete'), isDestructive : true
        });
        if (ok) await Na__LeLoad__DeleteSheet(sheet.Sheet__Id);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Open a Copy of a Sheet
    // ------------------------------------------------------------
    async function Na__LeDev__Duplicate(sheet) {
        const copy = await Na__LeLoad__DuplicateSheet(sheet.Sheet__Id);
        if (copy) await Na__LeLoad__Enter(copy.Sheet__Id);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Make a Sheet and Open It
    // ------------------------------------------------------------
    async function Na__LeDev__NewSheet() {
        const sheet = await Na__LeLoad__CreateSheet({});
        if (sheet) await Na__LeLoad__Enter(sheet.Sheet__Id);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bake Every 3D Snapshot and Every Drawing's Linework to R2
    // ------------------------------------------------------------
    // The snapshots are rendered by the editor, so it is loaded first.
    // ------------------------------------------------------------
    async function Na__LeDev__Bake() {
        const editor = await Na__LeLoad__Require();
        if (!editor) return;
        const model = editor.model;
        let baked = 0, skipped = 0, failed = 0;
        const sheets = model.Na__LeModel__GetSheets();
        for (let s = 0; s < sheets.length; s++) {
            const sheet = sheets[s];
            for (let v = 0; v < sheet.Sheet__Viewports.length; v++) {
                const viewport = sheet.Sheet__Viewports[v];
                if (viewport.Viewport__Kind !== model.Na__LeModel__KIND_3D) continue;
                const result = await editor.viewport3d.Na__LeVp3d__Bake(sheet, viewport, false);
                if (result === 'baked') baked++; else if (result === 'skipped') skipped++; else failed++;
                Na__LeDev__Note = 'Snapshots: ' + baked + ' baked, ' + skipped + ' up to date, ' + failed + ' failed.';
                Na__LeDev__Render();
            }
        }
        // LINEWORK | Only drawings that ask for it: the record toggle, or a sheet viewport with Projected Linework on
        const wanted = [];
        sheets.forEach((sheet) => sheet.Sheet__Viewports.forEach((v) => {
            if (v.Viewport__Kind === model.Na__LeModel__KIND_2D && v.Viewport__Styles.projectedLinework && v.Viewport__DrawingId) wanted.push(v.Viewport__DrawingId);
        }));
        const linework = await Na__PlStore__BakeAll({
            showToast : Na__LeDev__ShowToast, force : false, includeDrawingIds : wanted,
            onProgress : (p) => { Na__LeDev__Note = 'Linework ' + p.index + ' of ' + p.total + ': ' + p.name; Na__LeDev__Render(); }
        });
        const l = linework || {};
        Na__LeDev__Note = 'Snapshots: ' + baked + ' baked, ' + skipped + ' up to date, ' + failed + ' failed. Linework: ' + (l.baked || 0) + ' baked, ' + (l.skipped || 0) + ' up to date, ' + (l.off || 0) + ' off, ' + (l.refused || 0) + ' refused, ' + (l.failed || 0) + ' failed.';
        if (baked > 0) await model.Na__LeModel__Save(Na__LeDev__ShowToast);        // <-- Snapshot references live on the records
        Na__LeDev__Toast(Na__LeDev__Note, failed > 0);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Layout Mode Switch (per project, saved at once)
    // ------------------------------------------------------------
    // The choice lives in the drawings block, so it is saved the moment it
    // changes: switched off, the Save Sheets button goes with the rest of
    // the section and nothing else would ever write it. Neither the switch
    // nor its save loads the editor.
    // ------------------------------------------------------------
    function Na__LeDev__BuildLayoutModeSwitch() {
        const wrapper = document.createElement('div');
        wrapper.className = 'na-fp-dev__styles';

        const label = document.createElement('label');
        label.className = 'na-fp-dev__style';
        label.title     = Na__LeLoad__GetLabel('LayoutModeHint', 'Shows this project\'s drawing tabs, here and on the live site, once it has a sheet. Saved with the project.');
        const check = document.createElement('input');
        check.type      = 'checkbox';
        check.className = 'na-pm-dev__checkbox';
        check.checked   = Na__LeLoad__IsLayoutModeOn();
        check.disabled  = Na__LeDev__Busy;
        check.addEventListener('change', () => {
            Na__LeLoad__SetLayoutMode(check.checked);                          // <-- Off leaves an open sheet first
            void Na__LeDev__Run(() => Na__LeLoad__Save(Na__LeDev__ShowToast));
        });
        const text = document.createElement('span');
        text.textContent = Na__LeLoad__GetLabel('LayoutModeLabel', 'Enable Layout Mode');
        label.appendChild(check);
        label.appendChild(text);
        wrapper.appendChild(label);
        return wrapper;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Sheet Rows
    // ------------------------------------------------------------
    function Na__LeDev__BuildSheets() {
        const list   = document.createElement('div');
        list.className = 'na-le-dev__sheets';
        const active = Na__LeLoad__IsActive() ? Na__LeLoad__GetActiveSheet() : null;
        const sheets = Na__LeLoad__GetSheets();
        if (sheets.length === 0) {
            const empty = document.createElement('p');
            empty.className   = 'na-fp-dev__empty';
            empty.textContent = Na__LeLoad__GetLabel('NoSheets', 'No sheets yet. New Sheet makes the first one and opens it.');
            list.appendChild(empty);
            return list;
        }
        sheets.forEach((sheet) => {
            const row = document.createElement('div');
            row.className = 'na-pm-dev__row na-le-dev__sheet' + (active && active.Sheet__Id === sheet.Sheet__Id ? ' na-le-dev__sheet--active' : '');
            const name = document.createElement('span');
            name.className   = 'na-pm-dev__label na-le-dev__sheet-name';
            name.textContent = Na__LeLoad__GetTabLabel(sheet) + ' (' + sheet.Sheet__PaperSize + ', ' + sheet.Sheet__Viewports.length + ' viewports)';
            row.appendChild(name);
            row.appendChild(Na__LeDev__Button(Na__LeLoad__GetLabel('OpenSheet', 'Open'), 'na-pm-dev__btn--primary', () => { void Na__LeLoad__Enter(sheet.Sheet__Id); }));
            row.appendChild(Na__LeDev__Button(Na__LeLoad__GetLabel('DuplicateSheet', 'Duplicate'), '', () => { void Na__LeDev__Duplicate(sheet); }));
            row.appendChild(Na__LeDev__Button(Na__LeLoad__GetLabel('DeleteLabel', 'Delete'), 'na-pm-dev__btn--danger', () => { void Na__LeDev__Delete(sheet); }));
            list.appendChild(row);
        });
        return list;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebuild the Section
    // ------------------------------------------------------------
    function Na__LeDev__Render() {
        if (!Na__LeDev__Panel) return;
        Na__LeDev__Panel.innerHTML = '';

        const title = document.createElement('div');
        title.className   = 'na-dropdown-menu__panel-title';
        title.textContent = Na__LeLoad__GetLabel('DevSectionTitle', 'Layout Editor') + (Na__LeLoad__IsDirty() ? ' (unsaved changes)' : '');
        Na__LeDev__Panel.appendChild(title);
        Na__LeDev__Panel.appendChild(Na__LeDev__BuildLayoutModeSwitch());

        // LAYOUT MODE OFF | The switch and one line on what it does; no sheet can be opened
        if (!Na__LeLoad__IsLayoutModeOn()) {
            const off = document.createElement('p');
            off.className   = 'na-fp-dev__empty';
            off.textContent = Na__LeLoad__GetLabel('LayoutModeOffNote', 'Off for this project: no drawing tabs, here or on the live site.');
            Na__LeDev__Panel.appendChild(off);
            return;
        }

        Na__LeDev__Panel.appendChild(Na__LeDev__BuildSheets());

        const actions = document.createElement('div');
        actions.className = 'na-pm-dev__actions';
        actions.appendChild(Na__LeDev__Button(Na__LeLoad__GetLabel('NewSheet', 'New Sheet'), 'na-pm-dev__btn--primary', () => { void Na__LeDev__NewSheet(); }));
        actions.appendChild(Na__LeDev__Button(Na__LeLoad__GetLabel('SaveSheets', 'Save Sheets'), '', () => { void Na__LeDev__Run(() => Na__LeLoad__Save(Na__LeDev__ShowToast)); }));
        actions.appendChild(Na__LeDev__Button(Na__LeLoad__GetLabel('BakeAll', 'Bake Snapshots and Linework'), '', () => { void Na__LeDev__Run(Na__LeDev__Bake); }));
        const active = Na__LeLoad__IsActive() ? Na__LeLoad__GetActiveSheet() : null;   // <-- Only once the editor has loaded and a sheet is open
        if (active) {
            actions.appendChild(Na__LeDev__Button(Na__LeLoad__GetLabel('ExportPdf', 'Export PDF'), '', () => { void Na__LeDev__Run(() => Na__LeLoad__GetEditor().pdf.Na__LePdf__ExportSheet(active, Na__LeDev__ShowToast)); }));
            actions.appendChild(Na__LeDev__Button(Na__LeLoad__GetLabel('LeaveEditor', 'Leave Editor'), '', () => Na__LeLoad__Leave()));
        }
        Na__LeDev__Panel.appendChild(actions);

        if (Na__LeDev__Note) {
            const note = document.createElement('p');
            note.className   = 'na-fp-dev__empty';
            note.textContent = Na__LeDev__Note;
            Na__LeDev__Panel.appendChild(note);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Reveal the Section and Wire Its Toggle
    // ------------------------------------------------------------
    // context: { showToast, open } - open: the click that imported the section
    // was spent on the import, so the section opens itself.
    // ------------------------------------------------------------
    function Na__LayoutEditor__DevMenu__Initialize(context) {
        const menuItem = document.getElementById(Na__LeDev__ITEM_ID);
        const toggle   = document.getElementById(Na__LeDev__TOGGLE_ID);
        const panel    = document.getElementById(Na__LeDev__PANEL_ID);
        if (!menuItem || !toggle || !panel) return false;
        if (Na__LeDev__Panel) return true;
        Na__LeDev__Panel     = panel;
        Na__LeDev__ShowToast = (context && context.showToast) || null;
        menuItem.style.display = '';
        toggle.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);
            toggle.setAttribute('aria-expanded', String(!isOpen));
            if (!isOpen) Na__LeDev__Render();
        });
        const refresh = () => { if (panel.classList.contains('is-open')) Na__LeDev__Render(); };
        window.addEventListener(Na__LeLoad__SHEETS_EVENT, refresh);
        window.addEventListener(Na__LeLoad__MODE_EVENT, refresh);
        window.addEventListener(Na__LeLoad__STATE_EVENT, refresh);                // <-- A project loaded or saved, Layout Mode switched, the editor loaded
        if (context && context.open) {
            panel.classList.add('is-open');
            toggle.setAttribute('aria-expanded', 'true');
            Na__LeDev__Render();
        }
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Dev Menu API
    // ------------------------------------------------------------
    export {
        Na__LayoutEditor__DevMenu__Initialize
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
