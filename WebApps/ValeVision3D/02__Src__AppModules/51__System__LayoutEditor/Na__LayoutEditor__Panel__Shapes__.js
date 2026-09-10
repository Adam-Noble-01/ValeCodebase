// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - VECTORS PANEL
// =============================================================================
//
// FILE       : Na__LayoutEditor__Panel__Shapes__.js
// NAMESPACE  : Na__LePanelShapes
// MODULE     : Layout Editor - Vectors Panel
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Edge colour, edge weight in points, fill and closure for the selected shape, or the defaults for the next one
// CREATED    : 10-Sep-2026
//
// DESCRIPTION:
// - With a shape selected the controls edit it; with nothing selected they
//   set what the Draw tool uses next, the same way the Text and Dimensions
//   panels work.
// - Weights are printed points because that is what a drawing office
//   reads; the geometry converts to paper millimetres.
//
// INTEGRATION:
// - Registered by the mode controller in the right column.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : ValeVision3D 51 Na__LayoutEditor__Panel__Dimensions__ (pattern)
// - Ported on     : 10-Sep-2026 for ValeVision3D v2.21.8 (port Phase 5)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Model, Tools and Panel Host
    // ------------------------------------------------------------
    import { Na__LeCfg__GetLabel, Na__LeCfg__GetLineweightSetup } from './Na__LayoutEditor__ConfigState__.js';
    import { Na__LeModel__GetActiveSheet, Na__LeModel__GetSelection, Na__LeModel__UpdateShape } from './Na__LayoutEditor__SheetModel__.js';
    import { Na__LeTools__GetShapeDefaults, Na__LeTools__SetShapeDefaults } from './Na__LayoutEditor__SheetTools__.js';
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

    // MODULE CONSTANTS | Section Id
    // ------------------------------------------------------------
    const Na__LePanelShapes__ID = 'shapes';
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Selected Shape, if Any
    // ------------------------------------------------------------
    function Na__LePanelShapes__Selected() {
        const sheet = Na__LeModel__GetActiveSheet();
        const selection = Na__LeModel__GetSelection();
        if (!sheet || !selection || selection.kind !== 'shape') return null;
        const item = sheet.Sheet__Shapes.find((s) => s.Shape__Id === selection.id) || null;
        return item ? { sheet : sheet, item : item } : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Controls
    // ------------------------------------------------------------
    function Na__LePanelShapes__Build(body) {
        const lw = Na__LeCfg__GetLineweightSetup();
        const note = Na__LePanels__Note('');
        note.setAttribute('data-na-block', 'note');
        body.appendChild(note);
        body.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('ShapeStroke', 'Edge colour'), Na__LePanels__Input('color', 'shape-stroke')));
        body.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('ShapeStrokePt', 'Edge pt'), Na__LePanels__Input('number', 'shape-pt', { min : lw.minPt, max : lw.maxPt, step : lw.stepPt })));
        body.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('ShapeFill', 'Fill'), Na__LePanels__Input('checkbox', 'shape-filled')));
        body.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('ShapeFillColour', 'Fill colour'), Na__LePanels__Input('color', 'shape-fill')));
        body.appendChild(Na__LePanels__Row(Na__LeCfg__GetLabel('ShapeClosed', 'Closed'), Na__LePanels__Input('checkbox', 'shape-closed')));
        const hint = Na__LePanels__Note(Na__LeCfg__GetLabel('ShapeDrawNote', 'Draw tool (L): click points, click the first point to close a polygon, Enter or double-click to finish a line, Esc to abandon.'));
        hint.setAttribute('data-na-block', 'hint');
        body.appendChild(hint);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Reflect the Selection or the Defaults
    // ------------------------------------------------------------
    function Na__LePanelShapes__Refresh(body) {
        const selected = Na__LePanelShapes__Selected();
        const d = Na__LeTools__GetShapeDefaults();
        const values = selected
            ? { strokeColour : selected.item.Shape__StrokeColour, strokePt : selected.item.Shape__StrokePt, filled : !!selected.item.Shape__FillColour, fillColour : selected.item.Shape__FillColour || d.fillColour, closed : selected.item.Shape__Closed === true }
            : { strokeColour : d.strokeColour, strokePt : d.strokePt, filled : d.filled === true, fillColour : d.fillColour, closed : false };
        const el  = (name) => body.querySelector('[data-na-control="' + name + '"]');
        const set = (name, value) => { const e = el(name); if (e && document.activeElement !== e) e.value = String(value); };
        const hex = (value, fallback) => (/^#[0-9a-fA-F]{6}$/.test(String(value)) ? value : fallback);
        set('shape-stroke', hex(values.strokeColour, '#172b3a'));
        set('shape-pt', values.strokePt);
        set('shape-fill', hex(values.fillColour, '#e4e8ec'));
        el('shape-filled').checked = values.filled;
        el('shape-closed').checked = values.closed;
        el('shape-closed').parentNode.hidden = !selected;
        el('shape-fill').parentNode.hidden = !values.filled;
        body.querySelector('[data-na-block="note"]').textContent = selected
            ? Na__LeCfg__GetLabel('ShapeSelectedNote', 'Editing the selected shape.')
            : Na__LeCfg__GetLabel('ShapeDefaultsNote', 'Nothing selected: these settings apply to new shapes.');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply a Change to the Selection or the Defaults
    // ------------------------------------------------------------
    function Na__LePanelShapes__Apply(patch, defaultsPatch) {
        const selected = Na__LePanelShapes__Selected();
        if (selected) Na__LeModel__UpdateShape(selected.sheet, selected.item.Shape__Id, patch);
        else if (defaultsPatch) Na__LeTools__SetShapeDefaults(defaultsPatch);
    }
    // ------------------------------------------------------------


    // FUNCTION | Register the Section and Its Controls
    // ------------------------------------------------------------
    function Na__LePanelShapes__Register() {
        Na__LePanels__OnControl('change', 'shape-stroke', (e, el) => Na__LePanelShapes__Apply({ strokeColour : el.value }, { strokeColour : el.value }));
        Na__LePanels__OnControl('change', 'shape-pt',     (e, el) => { const v = parseFloat(el.value); if (Number.isFinite(v)) Na__LePanelShapes__Apply({ strokePt : v }, { strokePt : v }); });
        Na__LePanels__OnControl('change', 'shape-fill',   (e, el) => Na__LePanelShapes__Apply({ fillColour : el.value }, { fillColour : el.value }));
        Na__LePanels__OnControl('change', 'shape-filled', (e, el) => {
            const d = Na__LeTools__GetShapeDefaults();
            const selected = Na__LePanelShapes__Selected();
            const colour = selected && selected.item.Shape__FillColour ? selected.item.Shape__FillColour : d.fillColour;
            Na__LePanelShapes__Apply({ fillColour : el.checked ? colour : null }, { filled : el.checked });
        });
        Na__LePanels__OnControl('change', 'shape-closed', (e, el) => Na__LePanelShapes__Apply({ closed : el.checked }, null));
        return Na__LePanels__RegisterSection('right', {
            id : Na__LePanelShapes__ID, title : Na__LeCfg__GetLabel('ShapesTitle', 'Vectors'),
            build : Na__LePanelShapes__Build, refresh : Na__LePanelShapes__Refresh
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Vectors Panel API
    // ------------------------------------------------------------
    export {
        Na__LePanelShapes__Register
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
