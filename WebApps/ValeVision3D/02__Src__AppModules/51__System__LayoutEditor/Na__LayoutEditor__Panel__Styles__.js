// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - PANEL: STYLES
// =============================================================================
//
// FILE       : Na__LayoutEditor__Panel__Styles__.js
// NAMESPACE  : Na__LePanelStyles
// MODULE     : Layout Editor - Panel Styles
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The per-viewport style toggles: projected linework, profile linework, opaque glass, whitecard, hidden lines
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - The same four toggles a plan or elevation record carries (D33) plus
//   Hidden Lines (D21), applied to the selected viewport only, so two
//   viewports of one drawing can look different on one sheet. A 3D
//   viewport hides the two that only mean something on a drawing.
//
// INTEGRATION:
// - Registered into the right column by the mode controller.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : ValeVision3D 42__System__DrawingViewCore/Na__DrawView__StyleRows__.js (toggle set)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : adapted
// - Divergences   : per-viewport target; Hidden Lines added.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Model and Panel Host
    // ------------------------------------------------------------
    import { Na__LeCfg__GetLabel } from './Na__LayoutEditor__ConfigState__.js';
    import { Na__LeModel__KIND_2D, Na__LeModel__GetActiveSheet, Na__LeModel__GetSelectedViewport, Na__LeModel__UpdateViewport } from './Na__LayoutEditor__SheetModel__.js';
    import {
        Na__LePanels__RegisterSection,
        Na__LePanels__OnControl,
        Na__LePanels__Row,
        Na__LePanels__Input,
        Na__LePanels__Note
    } from './Na__LayoutEditor__PanelHost__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Section Id and the Toggle Set
    // ------------------------------------------------------------
    const Na__LePanelStyles__ID = 'styles';
    const Na__LePanelStyles__TOGGLES = [
        { key : 'projectedLinework', label : 'Projected Linework',      twoDOnly : true },
        { key : 'profileLinework',   label : 'Profile Linework Effect', twoDOnly : false },
        { key : 'glassOpaque',       label : 'Glass Transparency Off',  twoDOnly : false },
        { key : 'whitecard',         label : 'Whitecard',               twoDOnly : false },
        { key : 'hiddenLines',       label : 'Hidden Lines',            twoDOnly : true }
    ];
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Toggles
    // ------------------------------------------------------------
    function Na__LePanelStyles__Build(body) {
        const note = Na__LePanels__Note(Na__LeCfg__GetLabel('NoSelection', 'Select a viewport on the sheet.'));
        note.setAttribute('data-na-block', 'note');
        body.appendChild(note);
        Na__LePanelStyles__TOGGLES.forEach((toggle) => {
            const input = Na__LePanels__Input('checkbox', 'style-toggle');
            input.setAttribute('data-na-role', toggle.key);
            const row = Na__LePanels__Row(Na__LeCfg__GetLabel('Style' + toggle.key.charAt(0).toUpperCase() + toggle.key.slice(1), toggle.label), input, 'na-le-row--toggle');
            row.setAttribute('data-na-toggle', toggle.key);
            body.appendChild(row);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Reflect the Selected Viewport
    // ------------------------------------------------------------
    function Na__LePanelStyles__Refresh(body) {
        const viewport = Na__LeModel__GetSelectedViewport();
        body.querySelector('[data-na-block="note"]').hidden = !!viewport;
        Na__LePanelStyles__TOGGLES.forEach((toggle) => {
            const row = body.querySelector('[data-na-toggle="' + toggle.key + '"]');
            row.hidden = !viewport || (toggle.twoDOnly && viewport.Viewport__Kind !== Na__LeModel__KIND_2D);
            const input = row.querySelector('input');
            if (viewport) input.checked = viewport.Viewport__Styles[toggle.key] === true;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Register the Section and Its Controls
    // ------------------------------------------------------------
    function Na__LePanelStyles__Register() {
        Na__LePanels__OnControl('change', 'style-toggle', (e, el, key) => {
            const sheet = Na__LeModel__GetActiveSheet();
            const viewport = Na__LeModel__GetSelectedViewport();
            if (!sheet || !viewport) return;
            const styles = {};
            styles[key] = el.checked;
            Na__LeModel__UpdateViewport(sheet, viewport.Viewport__Id, { styles : styles });
        });
        return Na__LePanels__RegisterSection('right', {
            id : Na__LePanelStyles__ID, title : Na__LeCfg__GetLabel('StylesTitle', 'Styles'),
            build : Na__LePanelStyles__Build, refresh : Na__LePanelStyles__Refresh
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Styles Panel API
    // ------------------------------------------------------------
    export {
        Na__LePanelStyles__Register
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
