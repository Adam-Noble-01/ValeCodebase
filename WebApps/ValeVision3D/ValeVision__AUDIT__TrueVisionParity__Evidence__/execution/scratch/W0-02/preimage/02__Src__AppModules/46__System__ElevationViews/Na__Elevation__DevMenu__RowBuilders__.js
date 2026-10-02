// =============================================================================
// VALEVISION3D - ELEVATION VIEWS - DEV MENU ROW BUILDERS
// =============================================================================
//
// FILE       : Na__Elevation__DevMenu__RowBuilders__.js
// NAMESPACE  : Na__ElevRow
// MODULE     : Elevation Views - Dev Menu Row Builders
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build the DOM for one elevation's row in the Dev menu
// CREATED    : 07-Sep-2026
//
// DESCRIPTION:
// - Purely presentational. Every action is handed back to the editor through
//   the handlers object, so this module holds no state, saves nothing and
//   knows nothing about R2 or the section cut.
//
// - THE SETUP IS THREE CONTROLS AND A READOUT, PLUS A SHORTCUT. Precisely:
//     WHICH WAY  - four compass buttons, or type any bearing
//     WHERE      - an X slider and a Z slider that move the plane bodily
//     WHAT KIND  - elevation, or section
//   Loosely: Re-pick aims the elevation at a wall clicked in the 3D view, and
//   the plane gizmo can be dragged along its normal. Either way the numbers
//   shown here are what gets saved, and the derived number that actually
//   matters - how deep into the model the plane has reached - is shown live
//   under the sliders.
//
// - Dragging a slider fires the live handler on every input event and the
//   commit handler once on release, which is what lets the editor move the
//   gizmo and recut cheaply while dragging and exactly on drop.
// - The style toggles and the exclusion field are the shared drawing rows, so
//   an elevation and a plan read the same.
//
// INTEGRATION:
// - Na__Elevation__DevMenu__Editor__ supplies the handlers and appends the
//   returned elements into the Dev menu panel.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/45__System__ElevationViews/Na__Elevation__DevMenu__RowBuilders__.js
// - Source version: 1.0.0 (07-Sep-2026)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.19.0 (port Phase 3)
// - Parity        : adapted
// - Divergences   :
//   - Re-pick button beside the compass (D16); styles row and exclusion field from Na__DrawView__StyleRows__ (D19, D33).
// - Back-port     : none pending.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.1.0
// - Ported to ValeVision3D; Re-pick, styles row and exclusion field added.
//
// 07-Sep-2026 - Version 1.0.0
// - Initial implementation for the Elevation Drawings build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Elevation Config and Derived Geometry
    // ------------------------------------------------------------
    // @delegate: ./Na__Elevation__ConfigState__.js
    // @delegate: ./Na__Elevation__ProjectJson__Data__.js
    // ------------------------------------------------------------
    import {
        Na__ElevCfg__GetDirectionSetup,
        Na__ElevCfg__GetDirectionPresets,
        Na__ElevCfg__GetPlaneOriginRangeMm,
        Na__ElevCfg__GetViewDepthMaxMm,
        Na__ElevCfg__GetLabel,
        Na__ElevCfg__FormatLabel
    } from './Na__Elevation__ConfigState__.js';
    import {
        Na__ElevData__GetPlaneOriginMm,
        Na__ElevData__SetPlaneOriginMm,
        Na__ElevData__GetPlaneDistanceMm,
        Na__ElevData__IsSection,
        Na__ElevData__GetStyles,
        Na__ElevData__SetStyle,
        Na__ElevData__GetExcludeTokens,
        Na__ElevData__SetExcludeTokens,
        Na__ElevData__MODE_ELEVATION,
        Na__ElevData__MODE_SECTION
    } from './Na__Elevation__ProjectJson__Data__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Shared Drawing Style Rows
    // ------------------------------------------------------------
    // @delegate: ../42__System__DrawingViewCore/Na__DrawView__StyleRows__.js
    // ------------------------------------------------------------
    import {
        Na__DrawStyleRow__BuildStylesRow,
        Na__DrawStyleRow__BuildExclusionsRow
    } from '../42__System__DrawingViewCore/Na__DrawView__StyleRows__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Input Bounds
    // ------------------------------------------------------------
    const Na__ElevRow__DEPTH_STEP_MM  = 100;
    const Na__ElevRow__AZIMUTH_MIN    = 0;
    const Na__ElevRow__AZIMUTH_MAX    = 359;
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Style Row Accessors (the elevation record's own)
    // ------------------------------------------------------------
    const Na__ElevRow__STYLE_ACCESSORS = Object.freeze({
        getStyles : Na__ElevData__GetStyles,
        setStyle  : Na__ElevData__SetStyle,
        getTokens : Na__ElevData__GetExcludeTokens,
        setTokens : Na__ElevData__SetExcludeTokens,
        getLabel  : Na__ElevCfg__GetLabel
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Generic Control Builders
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Dev Menu Button
    // ------------------------------------------------------------
    function Na__ElevRow__BuildButton(text, modifierClass, onClick) {
        const button = document.createElement('button');
        button.type        = 'button';
        button.className   = 'na-pm-dev__btn' + (modifierClass ? ' ' + modifierClass : '');
        button.textContent = text;
        button.addEventListener('click', onClick);
        return button;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Labelled Number Input Row
    // ------------------------------------------------------------
    // onChange receives a finite number, or null when the field is cleared.
    // ------------------------------------------------------------
    function Na__ElevRow__BuildNumberRow(labelText, value, min, max, step, placeholder, unitText, onChange) {
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
        unit.textContent = unitText || 'mm';

        row.appendChild(caption);
        row.appendChild(input);
        row.appendChild(unit);
        return { row, input };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Small Section Caption
    // ------------------------------------------------------------
    function Na__ElevRow__BuildCaption(text) {
        const caption = document.createElement('div');
        caption.className   = 'na-dropdown-menu__panel-title';
        caption.textContent = text;
        return caption;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Direction and Mode Controls
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Compass Presets and the Free Bearing Field
    // ------------------------------------------------------------
    // The presets ARE the ordinary case, so they come first and are one click.
    // The number field is the escape hatch for a building that is not square
    // to north, and the two stay in step: pressing a preset rewrites the field.
    // ------------------------------------------------------------
    function Na__ElevRow__BuildDirection(elevation, onChanged) {
        const direction = Na__ElevCfg__GetDirectionSetup();
        const presets   = Na__ElevCfg__GetDirectionPresets();

        const wrapper = document.createElement('div');
        wrapper.className = 'na-elev-dev__compass';

        const field = Na__ElevRow__BuildNumberRow(
            'Bearing', elevation.Elevation__AzimuthDeg,
            Na__ElevRow__AZIMUTH_MIN, Na__ElevRow__AZIMUTH_MAX, direction.stepDeg, '', 'deg',
            (value) => {
                if (!Number.isFinite(value)) return;
                elevation.Elevation__AzimuthDeg = value;
                refreshPressed();
                onChanged();
            }
        );

        const buttons = [];
        const refreshPressed = () => {
            for (let i = 0; i < buttons.length; i++) {
                const isOn = (elevation.Elevation__AzimuthDeg === buttons[i].azimuthDeg);
                buttons[i].element.classList.toggle('na-pm-dev__btn--primary', isOn);
            }
            field.input.value = String(elevation.Elevation__AzimuthDeg);
        };

        for (let i = 0; i < presets.length; i++) {
            const preset  = presets[i];
            const element = Na__ElevRow__BuildButton(preset.label, '', () => {
                elevation.Elevation__AzimuthDeg = preset.azimuthDeg;
                refreshPressed();
                onChanged();
            });
            element.title = 'Draw the ' + preset.label.toLowerCase() + ' elevation, seen from the '
                + preset.label.toLowerCase() + '.';
            buttons.push({ element: element, azimuthDeg: preset.azimuthDeg });
            wrapper.appendChild(element);
        }

        refreshPressed();
        return { wrapper, fieldRow: field.row, refreshPressed };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Re-pick Action (aim at a wall in the 3D view)
    // ------------------------------------------------------------
    // The loose way to set both the bearing and the plane at once. The label
    // flips to the cancel wording while this row's pick is armed.
    // ------------------------------------------------------------
    function Na__ElevRow__BuildRepick(handlers) {
        const wrapper = document.createElement('div');
        wrapper.className = 'na-pm-dev__actions';

        const button = Na__ElevRow__BuildButton(
            handlers.isPicking
                ? Na__ElevCfg__GetLabel('PickCancelLabel', 'Cancel Pick')
                : Na__ElevCfg__GetLabel('RepickLabel', 'Re-pick'),
            handlers.isPicking ? 'na-pm-dev__btn--danger' : '',
            handlers.onRepick
        );
        button.title = 'Click a wall in the 3D view to aim this elevation at it and put the plane through it.';
        wrapper.appendChild(button);
        return wrapper;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Elevation / Section Choice
    // ------------------------------------------------------------
    // Two states of one drawing rather than two drawings, so a pair of
    // buttons rather than a separate row per type.
    // ------------------------------------------------------------
    function Na__ElevRow__BuildModeChoice(elevation, onChanged) {
        const wrapper = document.createElement('div');
        wrapper.className = 'na-pm-dev__actions';

        const elevationBtn = Na__ElevRow__BuildButton(
            Na__ElevCfg__GetLabel('ModeElevationLabel', 'Elevation'), '', () => {
                elevation.Elevation__Mode = Na__ElevData__MODE_ELEVATION;
                refreshPressed();
                onChanged();
            }
        );
        elevationBtn.title = 'Draw the building whole - nothing is cut. Files into the Elevations group.';

        const sectionBtn = Na__ElevRow__BuildButton(
            Na__ElevCfg__GetLabel('ModeSectionLabel', 'Section'), '', () => {
                elevation.Elevation__Mode = Na__ElevData__MODE_SECTION;
                refreshPressed();
                onChanged();
            }
        );
        sectionBtn.title = 'Cut the building at the plane and draw what is beyond it. Files into the Cross Sections group.';

        const refreshPressed = () => {
            const isSection = Na__ElevData__IsSection(elevation);
            elevationBtn.classList.toggle('na-pm-dev__btn--primary', !isSection);
            sectionBtn.classList.toggle('na-pm-dev__btn--primary', isSection);
        };
        refreshPressed();

        wrapper.appendChild(elevationBtn);
        wrapper.appendChild(sectionBtn);
        return { wrapper, refreshPressed };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing Plane Controls
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Axis Slider for the Drawing Plane
    // ------------------------------------------------------------
    // read/write are the two halves of "which world axis is this", handed in
    // so the X and Z sliders are one function rather than two near-copies.
    // ------------------------------------------------------------
    function Na__ElevRow__BuildPlaneSlider(elevation, labelText, read, write, onLive, onCommit, refreshReadout) {
        const range = Na__ElevCfg__GetPlaneOriginRangeMm();

        const wrapper = document.createElement('div');
        wrapper.className = 'na-fp-dev__slider-row';

        const caption = document.createElement('span');
        caption.className   = 'na-elev-dev__axis-label';
        caption.textContent = labelText;

        const slider = document.createElement('input');
        slider.type      = 'range';
        slider.className = 'na-fp-dev__slider';
        slider.min       = String(range.minMm);
        slider.max       = String(range.maxMm);
        slider.step      = String(range.stepMm);
        slider.value     = String(read(elevation));

        const value = document.createElement('span');
        value.className = 'na-elev-dev__axis-value';

        const refreshValue = () => {
            value.textContent = Math.round(read(elevation)) + ' mm';
            slider.value      = String(Math.round(read(elevation)));
        };
        refreshValue();

        slider.addEventListener('input', () => {
            write(elevation, parseFloat(slider.value));
            refreshValue();
            refreshReadout();
            onLive();                                                            // <-- Throttled recut and live gizmo while dragging
        });
        slider.addEventListener('change', () => {
            write(elevation, parseFloat(slider.value));
            refreshValue();
            refreshReadout();
            onCommit();                                                          // <-- Exact recut on release
        });

        wrapper.appendChild(caption);
        wrapper.appendChild(slider);
        wrapper.appendChild(value);
        return { wrapper, refreshValue };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Derived Cut Depth Readout
    // ------------------------------------------------------------
    // The number the two sliders actually control between them. Shown because
    // moving the plane perpendicular to the view changes it not at all, and a
    // slider that visibly does nothing is worse than no slider.
    // ------------------------------------------------------------
    function Na__ElevRow__BuildDepthReadout(elevation) {
        const readout = document.createElement('div');
        readout.className = 'na-elev-dev__readout';

        const refresh = () => {
            readout.textContent = Na__ElevCfg__FormatLabel(
                'CutDepthReadoutFormat', 'cut {depth} mm into the model',
                { depth: Math.round(Na__ElevData__GetPlaneDistanceMm(elevation)) }
            );
        };
        refresh();

        return { readout, refresh };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Row Assembly
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Name Field
    // ------------------------------------------------------------
    function Na__ElevRow__BuildNameField(elevation, onRename) {
        const input = document.createElement('input');
        input.type      = 'text';
        input.className = 'na-pm-dev__input na-fp-dev__name';
        input.value     = elevation.Elevation__Name;
        input.title     = 'Also the label on the carousel card';
        input.addEventListener('change', () => {
            const next = input.value.trim();
            if (next.length === 0) {
                input.value = elevation.Elevation__Name;                         // <-- Never let an elevation lose its name
                return;
            }

            // NO "SAME NAME" SHORT CUT HERE. A record whose card has drifted
            // out of step is repaired by asking for the name it already
            // appears to have, and only the rename path can see both.

            // THE HANDLER OWNS THE WRITE. A name lives in four places - the
            // record, the scene card, the section binding's key and the sheet
            // viewports' snapshot fingerprints - so the field ASKS for the
            // new name rather than setting it and leaving the rest to catch
            // up. Disabled until the save answers, because a second rename
            // starting on top of the first would race the project document.
            input.disabled = true;
            Promise.resolve(onRename(next)).then(() => {
                input.value    = elevation.Elevation__Name;                      // <-- Whatever landed: the new name, or the old one restored
                input.disabled = false;
            });
        });
        return input;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Preview / Annotate / Thumbnail / Delete Actions
    // ------------------------------------------------------------
    function Na__ElevRow__BuildActions(handlers) {
        const actions = document.createElement('div');
        actions.className = 'na-pm-dev__actions';

        actions.appendChild(Na__ElevRow__BuildButton(
            handlers.isActive
                ? Na__ElevCfg__GetLabel('ExitPreviewLabel', 'Exit Preview')
                : Na__ElevCfg__GetLabel('PreviewLabel', 'Preview'),
            'na-pm-dev__btn--primary',
            handlers.onPreviewToggle
        ));

        const annotateBtn = Na__ElevRow__BuildButton(
            Na__ElevCfg__GetLabel('AnnotateLabel', 'Annotate'), '', handlers.onAnnotate
        );
        annotateBtn.disabled = !handlers.isActive;                               // <-- Nothing to annotate until it is on screen
        if (handlers.isEditMode) annotateBtn.classList.add('na-pm-dev__btn--primary');
        actions.appendChild(annotateBtn);

        // THUMBNAIL | Only while the drawing is on screen, because the capture
        // is of the viewport: pressing it from 3D would file a picture of the
        // model as the elevation's card.
        const thumbBtn = Na__ElevRow__BuildButton(
            Na__ElevCfg__GetLabel('ThumbnailLabel', 'Save Thumbnail'), '', handlers.onThumbnail
        );
        thumbBtn.disabled = !handlers.isActive;
        thumbBtn.title    = handlers.isActive
            ? 'Captures the elevation as it is framed right now.'
            : 'Preview the elevation first - the thumbnail is a capture of the viewport.';
        actions.appendChild(thumbBtn);

        actions.appendChild(Na__ElevRow__BuildButton(
            'Delete', 'na-pm-dev__btn--danger', handlers.onDelete
        ));
        return actions;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build One Elevation's Complete Editor Row
    // ------------------------------------------------------------
    // handlers: {
    //   isActive, isEditMode, isPicking,
    //   onRename, onDirectionChange, onModeChange, onRepick,
    //   onPlaneLive, onPlaneCommit, onDepthChange, onCentrePlane,
    //   onStyleChange, onExclusionsChange,
    //   onPreviewToggle, onAnnotate, onThumbnail, onDelete
    // }
    // ------------------------------------------------------------
    function Na__ElevRow__BuildElevationRow(elevation, handlers) {
        const rowRoot = document.createElement('div');
        rowRoot.className = 'na-fp-dev__row' + (handlers.isActive ? ' na-fp-dev__row--active' : '');

        rowRoot.appendChild(Na__ElevRow__BuildNameField(elevation, handlers.onRename));

        // DIRECTION | Which side of the building the viewer stands on
        const depth = Na__ElevRow__BuildDepthReadout(elevation);

        rowRoot.appendChild(Na__ElevRow__BuildCaption(
            Na__ElevCfg__GetLabel('DirectionFieldLabel', 'Viewed from')
        ));
        const direction = Na__ElevRow__BuildDirection(elevation, () => {
            depth.refresh();                                                     // <-- A new bearing changes how deep the plane reaches
            handlers.onDirectionChange();
        });
        rowRoot.appendChild(direction.wrapper);
        rowRoot.appendChild(direction.fieldRow);
        rowRoot.appendChild(Na__ElevRow__BuildRepick(handlers));

        // DRAWING TYPE | The same drawing with the cut on or off
        rowRoot.appendChild(Na__ElevRow__BuildCaption(
            Na__ElevCfg__GetLabel('ModeFieldLabel', 'Drawing type')
        ));
        rowRoot.appendChild(Na__ElevRow__BuildModeChoice(elevation, handlers.onModeChange).wrapper);

        // DRAWING PLANE | The two controls that move it through the model
        const sliderX = Na__ElevRow__BuildPlaneSlider(
            elevation,
            Na__ElevCfg__GetLabel('PlaneXFieldLabel', 'Plane X'),
            (record) => Na__ElevData__GetPlaneOriginMm(record).xMm,
            (record, value) => Na__ElevData__SetPlaneOriginMm(record, value, null),
            handlers.onPlaneLive, handlers.onPlaneCommit, depth.refresh
        );
        const sliderZ = Na__ElevRow__BuildPlaneSlider(
            elevation,
            Na__ElevCfg__GetLabel('PlaneZFieldLabel', 'Plane Z'),
            (record) => Na__ElevData__GetPlaneOriginMm(record).zMm,
            (record, value) => Na__ElevData__SetPlaneOriginMm(record, null, value),
            handlers.onPlaneLive, handlers.onPlaneCommit, depth.refresh
        );
        rowRoot.appendChild(sliderX.wrapper);
        rowRoot.appendChild(sliderZ.wrapper);
        rowRoot.appendChild(depth.readout);

        const centreActions = document.createElement('div');
        centreActions.className = 'na-pm-dev__actions';
        centreActions.appendChild(Na__ElevRow__BuildButton(
            Na__ElevCfg__GetLabel('CentrePlaneLabel', 'Centre on model'), '',
            () => {
                handlers.onCentrePlane();
                sliderX.refreshValue();
                sliderZ.refreshValue();
                depth.refresh();
            }
        ));
        rowRoot.appendChild(centreActions);

        // VIEW DEPTH | Optional. Blank is the ordinary infinite cut backward,
        // needed only when the far side of the building would otherwise clutter
        // a section.
        rowRoot.appendChild(Na__ElevRow__BuildNumberRow(
            Na__ElevCfg__GetLabel('ViewDepthFieldLabel', 'View depth'),
            elevation.Elevation__ViewDepthMm,
            0, Na__ElevCfg__GetViewDepthMaxMm(), Na__ElevRow__DEPTH_STEP_MM,
            Na__ElevCfg__GetLabel('ViewDepthPlaceholder', 'Full'), 'mm',
            (value) => {
                elevation.Elevation__ViewDepthMm = (Number.isFinite(value) && value > 0) ? value : null;
                handlers.onDepthChange();
            }
        ).row);

        // STYLES AND EXCLUSIONS | Shared with the plans and the Layout Editor viewports
        rowRoot.appendChild(Na__DrawStyleRow__BuildStylesRow(elevation, Na__ElevRow__STYLE_ACCESSORS, handlers.onStyleChange));
        rowRoot.appendChild(Na__DrawStyleRow__BuildExclusionsRow(elevation, Na__ElevRow__STYLE_ACCESSORS, handlers.onExclusionsChange));

        rowRoot.appendChild(Na__ElevRow__BuildActions(handlers));
        return rowRoot;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Elevation Dev Menu Row Builder API
    // ------------------------------------------------------------
    export {
        Na__ElevRow__BuildButton,
        Na__ElevRow__BuildNumberRow,
        Na__ElevRow__BuildElevationRow
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
