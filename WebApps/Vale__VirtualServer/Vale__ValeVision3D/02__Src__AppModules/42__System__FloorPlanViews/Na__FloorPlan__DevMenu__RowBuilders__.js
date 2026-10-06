// =============================================================================
// VALEVISION3D - FLOOR PLAN VIEWS - DEV MENU ROW BUILDERS
// =============================================================================
//
// FILE       : Na__FloorPlan__DevMenu__RowBuilders__.js
// NAMESPACE  : Na__FpRow
// MODULE     : Floor Plan Views - Dev Menu Row Builders
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build the DOM for one floor plan's row in the Dev menu
// CREATED    : 31-Aug-2026
//
// DESCRIPTION:
// - Purely presentational. Every action is handed back to the editor through
//   the handlers object, so this module holds no state, saves nothing and
//   knows nothing about R2, drafts or the section cut engine.
// - A ROW READS TOP TO BOTTOM AS: WHAT IT IS, WHERE IT IS, WHAT TO DO - the
//   same order the Elevations row reads in. Its name and storey; its plane in
//   the 3D view, its floor level, its cut and its depth; then Preview and
//   Annotate to look, Update and Revert to keep or throw away. Delete is not
//   here: it sits below a rule the editor draws at the foot of the row.
// - The datum slider shows BOTH the floor level and the resulting cut height
//   in one readout. Those are two different numbers and confusing them is the
//   easiest way to author a plan that slices the wrong part of the building,
//   so they are always displayed together.
// - Dragging the slider fires the live handler on every input event and the
//   commit handler once on release, which is what lets the editor recut
//   cheaply while dragging and exactly on drop.
//
// INTEGRATION:
// - Na__FloorPlan__DevMenu__Editor__ supplies the handlers and folds the
//   returned row behind its header.
// // @delegate: ../40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js
// // @delegate: ./Na__FloorPlan__DevMenu__StoreyRow__.js
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__DevMenu__RowBuilders__.js
// - Source version: 2.0.0 (TrueVision3D v2.86.0, 20-Sep-2026; read at b2aa9151) - with the storey row of
//                   v2.87.0. Neither is confirmed by Adam in TrueVision yet; ported under DR-01 (c)
// - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.4, whole; first ported 09-Sep-2026 for
//                   ValeVision3D v2.18.0 (port Phase 2)
// - Parity        : adapted
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
//   - An Advanced fold under View depth holds the Styles toggles and the Exclude field, built by the
//     shared Na__DrawView__StyleRows__ with the plan record's accessors; the editor's onStyleChange and
//     onExclusionsChange handlers take the edits (D33, DR-32).
// - History       : ValeVision's own 1.1.0 and 1.2.0 (09-Sep-2026: the styles row and exclusion field, then
//                   the shared StyleRows) are superseded by this port; the style rows live on as the seam above.
// - Back-port     : the style rows, once TrueVision carries per-drawing styles (WT-09).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 20-Sep-2026 - Version 2.0.0 (Floor Plans and Elevations menu rebuild)
// - Save Thumbnail and Delete left the action row. Actions are Preview,
//   Annotate, a green Update and Revert, from the shared row shell.
// - The name is handed to the editor as typed (it is part of the row's draft
//   now) instead of being written to the record here.
// - The plane controls, the storey row and the card status are placed here,
//   so the row has one reading order; captions over each group of controls.
//
// 31-Aug-2026 - Version 1.0.0
// - Initial implementation for the Floor Plan Builder. Split out of the dev
//   editor so both files stay inside the house 600-line limit.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Floor Plan Config and Derived Cut Height
    // ------------------------------------------------------------
    // @delegate: ./Na__FloorPlan__ConfigState__.js
    // @delegate: ./Na__FloorPlan__ProjectJson__Data__.js
    // ------------------------------------------------------------
    import {
        Na__FpCfg__GetDatumRangeMm,
        Na__FpCfg__GetCutOffsetMm,
        Na__FpCfg__GetLabel
    } from './Na__FloorPlan__ConfigState__.js';
    import { Na__FpData__GetCutHeightMm } from './Na__FloorPlan__ProjectJson__Data__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Storey Dropdown (its own module, another author's)
    // ------------------------------------------------------------
    import {
        Na__FpStoreyRow__Build,
        Na__FpStoreyRow__Refresh
    } from './Na__FloorPlan__DevMenu__StoreyRow__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Parts Every Drawing Row Is Made Of
    // ------------------------------------------------------------
    import {
        Na__DrawShell__Button,
        Na__DrawShell__Caption,
        Na__DrawShell__BuildCommitActions,
        Na__DrawShell__BuildAdvanced
    } from '../40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | ValeVision: the Shared Style Rows and the Plan's Style Accessors (D33)
    // ------------------------------------------------------------
    // @delegate: ../40__System__DrawingViewCore/Na__DrawView__StyleRows__.js
    // ------------------------------------------------------------
    import {
        Na__DrawStyleRow__BuildStylesRow,
        Na__DrawStyleRow__BuildExclusionsRow
    } from '../40__System__DrawingViewCore/Na__DrawView__StyleRows__.js';
    import {
        Na__FpData__GetStyles,
        Na__FpData__SetStyle,
        Na__FpData__GetExcludeTokens,
        Na__FpData__SetExcludeTokens
    } from './Na__FloorPlan__ProjectJson__Data__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | View Depth Input Bounds
    // ------------------------------------------------------------
    // Blank means the ordinary infinite cut downward, so the field has no
    // sensible default - only a ceiling to stop a typo becoming a huge number.
    // ------------------------------------------------------------
    const Na__FpRow__DEPTH_MAX_MM  = 50000;
    const Na__FpRow__DEPTH_STEP_MM = 100;
    const Na__FpRow__OFFSET_STEP_MM = 50;
    // ------------------------------------------------------------

    // MODULE CONSTANTS | ValeVision: Style Row Accessors (the plan record's own, D33)
    // ------------------------------------------------------------
    const Na__FpRow__STYLE_ACCESSORS = Object.freeze({
        getStyles : Na__FpData__GetStyles,
        setStyle  : Na__FpData__SetStyle,
        getTokens : Na__FpData__GetExcludeTokens,
        setTokens : Na__FpData__SetExcludeTokens,
        getLabel  : Na__FpCfg__GetLabel
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generic Control Builders
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Dev Menu Button
    // ------------------------------------------------------------
    function Na__FpRow__BuildButton(text, modifierClass, onClick) {
        return Na__DrawShell__Button(text, modifierClass, '', onClick);
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Labelled Millimetre Number Input Row
    // ------------------------------------------------------------
    // onChange receives a finite number, or null when the field is cleared.
    // ------------------------------------------------------------
    function Na__FpRow__BuildNumberRow(labelText, value, min, max, step, placeholder, onChange) {
        const row = document.createElement('div');
        row.className = 'na-dropdown-menu__panel-row';

        const caption = document.createElement('span');
        caption.className   = 'na-dropdown-menu__value';
        caption.textContent = labelText;

        const input = document.createElement('input');
        input.type      = 'number';
        input.className = 'na-pm-dev__input na-pm-dev__input--short';
        if (Number.isFinite(min))  input.min  = String(min);
        if (Number.isFinite(max))  input.max  = String(max);
        if (Number.isFinite(step)) input.step = String(step);
        input.value       = Number.isFinite(value) ? String(value) : '';
        input.placeholder = placeholder || '';
        input.addEventListener('change', () => {
            onChange(input.value === '' ? null : parseFloat(input.value));
        });

        const unit = document.createElement('span');
        unit.className   = 'na-dropdown-menu__value';
        unit.textContent = 'mm';

        row.appendChild(caption);
        row.appendChild(input);
        row.appendChild(unit);
        return { row, input };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Floor Datum Slider With a Live Cut Readout
    // ------------------------------------------------------------
    // Returns refreshReadout so the caller can re-render the readout when the
    // cut offset changes without rebuilding the whole row.
    // ------------------------------------------------------------
    function Na__FpRow__BuildDatumSlider(plan, onLiveChange, onCommit) {
        const range = Na__FpCfg__GetDatumRangeMm();

        const wrapper = document.createElement('div');
        wrapper.className = 'na-fp-dev__slider-row';

        const slider = document.createElement('input');
        slider.type      = 'range';
        slider.className = 'na-fp-dev__slider';
        slider.min       = String(range.minMm);
        slider.max       = String(range.maxMm);
        slider.step      = String(range.stepMm);
        slider.value     = String(plan.FloorPlan__FloorDatumMm);
        slider.title     = 'Floor level. 0 is the model ground floor.';

        const readout = document.createElement('span');
        readout.className = 'na-fp-dev__readout';

        // Both numbers, always. The datum is what the author sets; the cut is
        // where the model is actually sliced, and they are never the same.
        const refreshReadout = () => {
            readout.textContent = plan.FloorPlan__FloorDatumMm + ' mm  (cut at '
                + Na__FpData__GetCutHeightMm(plan) + ' mm)';
        };
        refreshReadout();

        slider.addEventListener('input', () => {
            plan.FloorPlan__FloorDatumMm = parseFloat(slider.value);
            refreshReadout();
            onLiveChange();                                                      // <-- Throttled recut while dragging
        });
        slider.addEventListener('change', () => {
            plan.FloorPlan__FloorDatumMm = parseFloat(slider.value);
            refreshReadout();
            onCommit();                                                          // <-- Exact recut on release
        });

        wrapper.appendChild(slider);
        wrapper.appendChild(readout);
        return { wrapper, slider, refreshReadout };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plan Row Assembly
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Name Field
    // ------------------------------------------------------------
    // The typed name goes to the editor, which holds it in the row's draft. An
    // emptied box is put back: a plan never loses its name.
    // Returns { input, refresh }.
    // ------------------------------------------------------------
    function Na__FpRow__BuildNameField(plan, onNameTyped) {
        const input = document.createElement('input');
        input.type         = 'text';
        input.className    = 'na-pm-dev__input na-fp-dev__name';
        input.spellcheck   = false;
        input.autocomplete = 'off';
        input.value        = plan.FloorPlan__Name;
        input.title        = 'Also the label on its carousel card, and the words a drawing title reads.';
        input.addEventListener('change', () => {
            const next = input.value.trim();
            if (next.length === 0) {
                input.value = plan.FloorPlan__Name;                              // <-- Never let a plan lose its name
                return;
            }
            onNameTyped(next);
        });

        const refresh = () => { if (document.activeElement !== input) input.value = plan.FloorPlan__Name; };
        return { input, refresh };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build One Floor Plan's Complete Editor Row
    // ------------------------------------------------------------
    // handlers: {
    //   isActive, isEditMode,
    //   planeControls - element | null : Show plane / Move to face
    //   sceneLinkRow  - element | null : the carousel card's status
    //   onNameTyped(text), onStoreyChange(key),
    //   onDatumLive, onDatumCommit, onOffsetChange, onDepthChange,
    //   onPreviewToggle, onAnnotate, onUpdate, onRevert,
    //   onStyleChange, onExclusionsChange   (ValeVision: the Advanced fold's style rows)
    // }
    // Returns { row, refreshDraft(state), refreshIdentity() }. The editor
    // folds `row` behind a header and adds the danger zone beneath it.
    // ------------------------------------------------------------
    function Na__FpRow__BuildPlanRow(plan, handlers) {
        const cutOffset = Na__FpCfg__GetCutOffsetMm();

        const rowRoot = document.createElement('div');
        rowRoot.className = 'na-fp-dev__row' + (handlers.isActive ? ' na-fp-dev__row--active' : '');

        // WHAT IT IS | Its name, and which storey of the building it is a plan of
        const name = Na__FpRow__BuildNameField(plan, handlers.onNameTyped);
        rowRoot.appendChild(name.input);

        const storeyRow = Na__FpStoreyRow__Build(plan, handlers.onStoreyChange);
        rowRoot.appendChild(storeyRow);
        const refreshStorey = () => Na__FpStoreyRow__Refresh(storeyRow);         // <-- Until a storey is chosen it is GUESSED from the cut, so it follows the cut

        // WHERE IT IS | The cut's plane in the 3D view
        if (handlers.planeControls) {
            rowRoot.appendChild(Na__DrawShell__Caption(Na__FpCfg__GetLabel('PlaneControlsCaption', 'Cut plane in the 3D view')));
            rowRoot.appendChild(handlers.planeControls);
        }

        // FLOOR LEVEL | The datum the author actually thinks in
        rowRoot.appendChild(Na__DrawShell__Caption(Na__FpCfg__GetLabel('DatumFieldLabel', 'Floor level')));
        const datum = Na__FpRow__BuildDatumSlider(
            plan,
            () => { handlers.onDatumLive(); },
            () => { refreshStorey(); handlers.onDatumCommit(); }
        );
        rowRoot.appendChild(datum.wrapper);

        // CUT ABOVE FLOOR | Standard architectural cut height
        rowRoot.appendChild(Na__FpRow__BuildNumberRow(
            Na__FpCfg__GetLabel('CutOffsetFieldLabel', 'Cut above floor'),
            plan.FloorPlan__CutOffsetMm,
            cutOffset.minMm, cutOffset.maxMm, Na__FpRow__OFFSET_STEP_MM, '',
            (value) => {
                if (!Number.isFinite(value)) return;
                plan.FloorPlan__CutOffsetMm = value;
                datum.refreshReadout();                                          // <-- Cut height moved, datum did not
                refreshStorey();
                handlers.onOffsetChange();
            }
        ).row);

        // VIEW DEPTH | Optional. Blank is the ordinary infinite cut downward,
        // needed only when a model has no floor slabs to occlude the storey
        // below the one being drawn.
        rowRoot.appendChild(Na__FpRow__BuildNumberRow(
            Na__FpCfg__GetLabel('ViewDepthFieldLabel', 'View depth'),
            plan.FloorPlan__ViewDepthMm,
            0, Na__FpRow__DEPTH_MAX_MM, Na__FpRow__DEPTH_STEP_MM,
            Na__FpCfg__GetLabel('ViewDepthPlaceholder', 'Full'),
            (value) => {
                plan.FloorPlan__ViewDepthMm = (Number.isFinite(value) && value > 0) ? value : null;
                handlers.onDepthChange();
            }
        ).row);

        // ADVANCED | ValeVision: the drawing's styles and the categories left
        // out of its linework - set once, rarely revisited, and read by the
        // Layout Editor viewports of this plan too (D33). Folded, as the
        // Elevations row's model bearing is.
        const advanced = Na__DrawShell__BuildAdvanced(plan.FloorPlan__Id, 'Advanced');
        advanced.body.appendChild(Na__DrawStyleRow__BuildStylesRow(plan, Na__FpRow__STYLE_ACCESSORS, handlers.onStyleChange));
        advanced.body.appendChild(Na__DrawStyleRow__BuildExclusionsRow(plan, Na__FpRow__STYLE_ACCESSORS, handlers.onExclusionsChange));
        rowRoot.appendChild(advanced.element);

        // WHAT TO DO | Look, then keep or throw away
        const actions = Na__DrawShell__BuildCommitActions({
            isActive         : handlers.isActive,
            isEditMode       : handlers.isEditMode,
            drawingWord      : 'floor plan',
            previewLabel     : Na__FpCfg__GetLabel('PreviewLabel', 'Preview'),
            exitPreviewLabel : Na__FpCfg__GetLabel('ExitPreviewLabel', 'Exit Preview'),
            annotateLabel    : Na__FpCfg__GetLabel('AnnotateLabel', 'Annotate'),
            updateLabel      : Na__FpCfg__GetLabel('UpdateLabel', 'Update Floor Plan'),
            revertLabel      : Na__FpCfg__GetLabel('RevertLabel', 'Revert'),
            onPreviewToggle  : handlers.onPreviewToggle,
            onAnnotate       : handlers.onAnnotate,
            onUpdate         : handlers.onUpdate,
            onRevert         : handlers.onRevert
        });
        rowRoot.appendChild(actions.element);

        if (handlers.sceneLinkRow) rowRoot.appendChild(handlers.sceneLinkRow);

        return {
            row             : rowRoot,
            refreshDraft    : actions.refresh,
            refreshIdentity : () => { name.refresh(); refreshStorey(); }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Floor Plan Dev Menu Row Builder API
    // ------------------------------------------------------------
    export {
        Na__FpRow__BuildButton,
        Na__FpRow__BuildNumberRow,
        Na__FpRow__BuildDatumSlider,
        Na__FpRow__BuildPlanRow
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
