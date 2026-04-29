// =============================================================================
// VALEVISION3D - GRID LINE SYSTEM - UI ELEMENT
// =============================================================================
//
// FILE       : Na__GridLineSystem__UiElement.js
// NAMESPACE  : Na__UiFeature
// MODULE     : GridLine System - UI Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Wire DOM sliders and selectors to the Grid Line creation logic
// CREATED    : 13-Mar-2026
//
// DESCRIPTION:
// - Fetches the GridLine config JSON at initialization.
// - Caches all DOM element references for grid line controls.
// - Maps discrete slider positions to non-linear step arrays (size, width).
// - Wires input/change events to rebuild the grid via Na__GridLine__Update.
// - Shows localhost-only position controls via Na__AppUtils__IsRunningOnLocalhost.
// - On init, loads persisted grid offsets from the project JSON via Flask API.
// - Provides a Save Position button that writes the current grid offsets
//   (X, Z, and Height) to the project JSON via the Flask API.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Grid Creation Logic
    // ------------------------------------------------------------
    import {
        Na__GridLine__Initialize,
        Na__GridLine__Update,
        Na__GridLine__GetGridGroup
    } from './Na__GridLineSysem__GridCreationLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import {
        Na__AppUtils__IsRunningOnLocalhost,
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__FetchProjectJson
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Confirm Dialog (gates destructive write)
    // ------------------------------------------------------------
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants - DOM Element IDs
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Grid Lines Panel IDs
    // ------------------------------------------------------------
    const Na__GridUi__TOGGLE_BTN_ID       = 'naGridLineToggle';              // <-- Panel toggle button
    const Na__GridUi__PANEL_ID            = 'naGridLinePanel';               // <-- Main sub-panel
    const Na__GridUi__ENABLE_TOGGLE_ID    = 'naGridLineEnableToggle';        // <-- Grid on/off checkbox
    const Na__GridUi__SIZE_SLIDER_ID      = 'naGridLineSizeSlider';          // <-- Grid size slider
    const Na__GridUi__SIZE_VALUE_ID       = 'naGridLineSizeValue';           // <-- Grid size display label
    const Na__GridUi__HEIGHT_SLIDER_ID    = 'naGridLineHeightSlider';        // <-- Grid height slider
    const Na__GridUi__HEIGHT_VALUE_ID     = 'naGridLineHeightValue';         // <-- Grid height display label
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Grid Style Section IDs
    // ------------------------------------------------------------
    const Na__GridUi__STYLE_DETAILS_ID    = 'naGridLineStyleDetails';        // <-- Collapsible style section
    const Na__GridUi__WIDTH_SLIDER_ID     = 'naGridLineWidthSlider';         // <-- Line width slider
    const Na__GridUi__WIDTH_VALUE_ID      = 'naGridLineWidthValue';          // <-- Line width display label
    const Na__GridUi__TYPE_SELECT_ID      = 'naGridLineTypeSelect';          // <-- Line type dropdown
    const Na__GridUi__COLOR_SELECT_ID     = 'naGridLineColorSelect';         // <-- Line colour dropdown
    const Na__GridUi__OPACITY_SLIDER_ID   = 'naGridLineOpacitySlider';        // <-- Line opacity slider
    const Na__GridUi__OPACITY_VALUE_ID    = 'naGridLineOpacityValue';        // <-- Line opacity display label
    const Na__GridUi__GAP_ROW_ID          = 'naGridLineGapRow';              // <-- Gap slider row (show/hide)
    const Na__GridUi__GAP_SLIDER_ID       = 'naGridLineGapSlider';           // <-- Gap size slider
    const Na__GridUi__GAP_VALUE_ID        = 'naGridLineGapValue';            // <-- Gap size display label
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Localhost-Only Position IDs
    // ------------------------------------------------------------
    const Na__GridUi__POS_SECTION_ID      = 'naGridLinePositionSection';     // <-- Position controls wrapper
    const Na__GridUi__POS_X_SLIDER_ID     = 'naGridLinePosXSlider';          // <-- X offset slider
    const Na__GridUi__POS_X_INPUT_ID      = 'naGridLinePosXInput';           // <-- X offset numeric input
    const Na__GridUi__POS_Z_SLIDER_ID     = 'naGridLinePosZSlider';          // <-- Z offset slider
    const Na__GridUi__POS_Z_INPUT_ID      = 'naGridLinePosZInput';           // <-- Z offset numeric input
    const Na__GridUi__SAVE_BTN_ID         = 'naGridLineSavePosition';        // <-- Save position button
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Cached DOM Elements
    // ------------------------------------------------------------
    let Na__GridUi__ToggleBtn     = null;
    let Na__GridUi__Panel         = null;
    let Na__GridUi__EnableToggle  = null;
    let Na__GridUi__SizeSlider    = null;
    let Na__GridUi__SizeValue     = null;
    let Na__GridUi__HeightSlider  = null;
    let Na__GridUi__HeightValue   = null;
    let Na__GridUi__WidthSlider   = null;
    let Na__GridUi__WidthValue    = null;
    let Na__GridUi__TypeSelect    = null;
    let Na__GridUi__ColorSelect   = null;
    let Na__GridUi__OpacitySlider  = null;
    let Na__GridUi__OpacityValue   = null;
    let Na__GridUi__GapRow        = null;
    let Na__GridUi__GapSlider     = null;
    let Na__GridUi__GapValue      = null;
    let Na__GridUi__PosSection    = null;
    let Na__GridUi__PosXSlider    = null;
    let Na__GridUi__PosXInput     = null;
    let Na__GridUi__PosZSlider    = null;
    let Na__GridUi__PosZInput     = null;
    let Na__GridUi__SaveBtn       = null;
    // ------------------------------------------------------------

    // MODULE VARIABLES | Config Data
    // ------------------------------------------------------------
    let Na__GridUi__Config        = null;                                    // <-- Parsed config JSON
    let Na__GridUi__GridEnabled   = false;                                   // <-- Grid visibility state (off by default)
    let Na__GridUi__IsLocalhost   = false;                                   // <-- Localhost environment flag
    let Na__GridUi__ShowToast     = null;                                    // <-- Toast notification callback
    let Na__GridUi__PipelineRef   = null;                                    // <-- Ref to render pipeline for cache invalidation
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Loader
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch Grid Line Config JSON
    // ------------------------------------------------------------
    async function Na__GridUi__LoadConfig() {
        try {
            const response = await fetch('./02__Src__AppModules/28__System__GridLineSystem/Na__GridLineSysem__Config.json');
            if (!response.ok) throw new Error(`Config fetch failed: ${response.status}`);
            return await response.json();
        } catch (err) {
            console.error('[ValeVision3D] Grid config load error:', err);
            return null;
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Load Persisted Grid Offsets from Project JSON
    // ------------------------------------------------------------
    async function Na__GridUi__LoadProjectOffsets() {
        try {
            const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
            if (!projectCode) return;

            const projectData   = await Na__AppUtils__FetchProjectJson(projectCode);
            const savedOffsets  = projectData.GridLine__Grid__Offset__Config;
            if (!savedOffsets) return;

            // Merge project-level offsets into the local config so ApplyDefaults picks them up
            if (!Na__GridUi__Config.GridLine__Grid__Offset__Config) {
                Na__GridUi__Config.GridLine__Grid__Offset__Config = {};
            }
            const target = Na__GridUi__Config.GridLine__Grid__Offset__Config;

            if (savedOffsets.GridLine__Grid__Config__Offset__OffsetXMm !== undefined) {
                target.GridLine__Grid__Config__Offset__OffsetXMm = savedOffsets.GridLine__Grid__Config__Offset__OffsetXMm;
            }
            if (savedOffsets.GridLine__Grid__Config__Offset__OffsetZMm !== undefined) {
                target.GridLine__Grid__Config__Offset__OffsetZMm = savedOffsets.GridLine__Grid__Config__Offset__OffsetZMm;
            }
            if (savedOffsets.GridLine__Grid__Config__Offset__HeightMm !== undefined) {
                Na__GridUi__Config.GridLine__Height__Config.GridLine__Height__Config__DefaultMm = savedOffsets.GridLine__Grid__Config__Offset__HeightMm;
            }
        } catch (err) {
            console.warn('[ValeVision3D] Could not load project grid offsets:', err);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | DOM Cache
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Cache All DOM References
    // ------------------------------------------------------------
    function Na__GridUi__CacheDomElements() {
        Na__GridUi__ToggleBtn    = document.getElementById(Na__GridUi__TOGGLE_BTN_ID);
        Na__GridUi__Panel        = document.getElementById(Na__GridUi__PANEL_ID);
        Na__GridUi__EnableToggle = document.getElementById(Na__GridUi__ENABLE_TOGGLE_ID);
        Na__GridUi__SizeSlider   = document.getElementById(Na__GridUi__SIZE_SLIDER_ID);
        Na__GridUi__SizeValue    = document.getElementById(Na__GridUi__SIZE_VALUE_ID);
        Na__GridUi__HeightSlider = document.getElementById(Na__GridUi__HEIGHT_SLIDER_ID);
        Na__GridUi__HeightValue  = document.getElementById(Na__GridUi__HEIGHT_VALUE_ID);
        Na__GridUi__WidthSlider  = document.getElementById(Na__GridUi__WIDTH_SLIDER_ID);
        Na__GridUi__WidthValue   = document.getElementById(Na__GridUi__WIDTH_VALUE_ID);
        Na__GridUi__TypeSelect   = document.getElementById(Na__GridUi__TYPE_SELECT_ID);
        Na__GridUi__ColorSelect  = document.getElementById(Na__GridUi__COLOR_SELECT_ID);
        Na__GridUi__OpacitySlider = document.getElementById(Na__GridUi__OPACITY_SLIDER_ID);
        Na__GridUi__OpacityValue = document.getElementById(Na__GridUi__OPACITY_VALUE_ID);
        Na__GridUi__GapRow       = document.getElementById(Na__GridUi__GAP_ROW_ID);
        Na__GridUi__GapSlider    = document.getElementById(Na__GridUi__GAP_SLIDER_ID);
        Na__GridUi__GapValue     = document.getElementById(Na__GridUi__GAP_VALUE_ID);
        Na__GridUi__PosSection   = document.getElementById(Na__GridUi__POS_SECTION_ID);
        Na__GridUi__PosXSlider   = document.getElementById(Na__GridUi__POS_X_SLIDER_ID);
        Na__GridUi__PosXInput    = document.getElementById(Na__GridUi__POS_X_INPUT_ID);
        Na__GridUi__PosZSlider   = document.getElementById(Na__GridUi__POS_Z_SLIDER_ID);
        Na__GridUi__PosZInput    = document.getElementById(Na__GridUi__POS_Z_INPUT_ID);
        Na__GridUi__SaveBtn      = document.getElementById(Na__GridUi__SAVE_BTN_ID);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Parameter Gathering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read Current Slider State Into Update Params
    // ------------------------------------------------------------
    function Na__GridUi__GatherParams() {
        const sizeConfig   = Na__GridUi__Config.GridLine__Size__Config;
        const styleConfig  = Na__GridUi__Config.GridLine__Style__Config;
        const posConfig    = Na__GridUi__Config.GridLine__Position__Config;
        const gridConfig   = Na__GridUi__Config.GridLine__Grid__Config;

        const sizeIndex    = parseInt(Na__GridUi__SizeSlider.value, 10);
        const widthIndex   = parseInt(Na__GridUi__WidthSlider.value, 10);
        const colorIndex   = parseInt(Na__GridUi__ColorSelect.value, 10);

        return {
            sizeMm             : sizeConfig.GridLine__Size__Config__StepsMm[sizeIndex],
            heightMm           : parseInt(Na__GridUi__HeightSlider.value, 10),
            lineWidth          : styleConfig.GridLine__Style__Config__WidthStepsPx[widthIndex],
            lineType           : Na__GridUi__TypeSelect.value,
            colorHex           : styleConfig.GridLine__Style__Config__ColorPalette[colorIndex].hex,
            opacity            : parseFloat(Na__GridUi__OpacitySlider.value),
            gapScale           : parseFloat(Na__GridUi__GapSlider.value),
            positionXMm        : parseInt(Na__GridUi__PosXSlider.value, 10),
            positionZMm        : parseInt(Na__GridUi__PosZSlider.value, 10),
            lineCount          : gridConfig.GridLine__Grid__Config__LineCount,
            showOriginMarker   : Na__GridUi__IsLocalhost,
            originMarkerSizeMm : styleConfig.GridLine__Style__Config__OriginMarkerSizeMm || 500
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push Current State to Grid Logic
    // ------------------------------------------------------------
    function Na__GridUi__ApplyUpdate() {
        if (!Na__GridUi__GridEnabled) return;
        Na__GridLine__Update(Na__GridUi__GatherParams());
        Na__GridUi__PipelineRef?.current?.invalidateProfileLinesCache?.();  // <-- New LineSegments2 objects created; force cache rebuild
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Display Label Updaters
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Update Size Display Label
    // ------------------------------------------------------------
    function Na__GridUi__UpdateSizeLabel() {
        const steps = Na__GridUi__Config.GridLine__Size__Config.GridLine__Size__Config__StepsMm;
        const idx   = parseInt(Na__GridUi__SizeSlider.value, 10);
        Na__GridUi__SizeValue.textContent = `${steps[idx]} mm`;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Update Height Display Label
    // ------------------------------------------------------------
    function Na__GridUi__UpdateHeightLabel() {
        Na__GridUi__HeightValue.textContent = `${Na__GridUi__HeightSlider.value} mm`;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Update Width Display Label
    // ------------------------------------------------------------
    function Na__GridUi__UpdateWidthLabel() {
        const steps = Na__GridUi__Config.GridLine__Style__Config.GridLine__Style__Config__WidthStepsPx;
        const idx   = parseInt(Na__GridUi__WidthSlider.value, 10);
        Na__GridUi__WidthValue.textContent = `${steps[idx].toFixed(2)} px`;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Update Opacity Display Label
    // ------------------------------------------------------------
    function Na__GridUi__UpdateOpacityLabel() {
        const pct = Math.round(parseFloat(Na__GridUi__OpacitySlider.value) * 100);
        Na__GridUi__OpacityValue.textContent = `${pct}%`;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Update Gap Display Label
    // ------------------------------------------------------------
    function Na__GridUi__UpdateGapLabel() {
        Na__GridUi__GapValue.textContent = `${parseFloat(Na__GridUi__GapSlider.value).toFixed(1)}x`;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Update Position X Numeric Input from Slider
    // ------------------------------------------------------------
    function Na__GridUi__UpdatePosXLabel() {
        if (Na__GridUi__PosXInput) Na__GridUi__PosXInput.value = Na__GridUi__PosXSlider.value;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Update Position Z Numeric Input from Slider
    // ------------------------------------------------------------
    function Na__GridUi__UpdatePosZLabel() {
        if (Na__GridUi__PosZInput) Na__GridUi__PosZInput.value = Na__GridUi__PosZSlider.value;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Gap Row Visibility
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Show or Hide Gap Slider Based on Line Type
    // ------------------------------------------------------------
    function Na__GridUi__UpdateGapVisibility() {
        if (!Na__GridUi__GapRow) return;
        const lineType = Na__GridUi__TypeSelect.value;
        Na__GridUi__GapRow.style.display = (lineType === 'Solid') ? 'none' : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Save Position (Localhost Only)
// -----------------------------------------------------------------------------

    // FUNCTION | Save Grid Position to Project JSON via Flask API
    // ------------------------------------------------------------
    async function Na__GridUi__SavePositionToProject() {
        const toast       = Na__GridUi__ShowToast || (() => {});
        const projectCode = Na__AppUtils__GetProjectCodeFromUrl();

        if (!projectCode) {
            toast('No project loaded — cannot save grid position.', true);
            return;
        }

        // CONFIRM | Block accidental writes of the grid offset
        const confirmed = await Na__AppUtils__ConfirmDialog__Show({
            title        : 'Overwrite Saved Grid Position?',
            message      : `Save grid position offset to ${projectCode}? This overwrites any existing grid position.`,
            confirmLabel : 'Overwrite',
            isDestructive: true
        });
        if (!confirmed) return;

        try {
            const fetchUrl        = `${window.location.origin}/api/projects/${projectCode}`;
            const projectResponse = await fetch(fetchUrl);                   // <-- Fetch existing project.json
            if (!projectResponse.ok) {
                toast(`Project not found: ${projectCode}`, true);
                return;
            }

            const projectData = await projectResponse.json();                // <-- Parse existing project data

            projectData.GridLine__Grid__Offset__Config = {
                "GridLine__Grid__Config__Offset__Description" : "Grid origin offset on X and Z axes in millimeters.",
                "GridLine__Grid__Config__Offset__OffsetXMm"   : parseInt(Na__GridUi__PosXSlider.value, 10),
                "GridLine__Grid__Config__Offset__OffsetZMm"   : parseInt(Na__GridUi__PosZSlider.value, 10),
                "GridLine__Grid__Config__Offset__HeightMm"    : parseInt(Na__GridUi__HeightSlider.value, 10)
            };

            const saveResponse = await fetch(fetchUrl, {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(projectData)                        // <-- Send merged project data
            });

            if (saveResponse.ok) {
                toast(`Grid position saved to ${projectCode}`);
            } else {
                const errorData = await saveResponse.json().catch(() => ({}));
                toast(`Save failed: ${errorData.error || 'Unknown error'}`, true);
            }
        } catch (error) {
            console.error('[ValeVision3D] Save grid position error:', error);
            toast('Save failed — server unreachable.', true);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Wiring
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Wire All Control Events
    // ------------------------------------------------------------
    function Na__GridUi__WireEvents() {

        // Panel toggle
        Na__GridUi__ToggleBtn.addEventListener('click', () => {
            Na__GridUi__Panel.classList.toggle('is-open');
        });

        // Grid enable/disable toggle
        Na__GridUi__EnableToggle.addEventListener('change', () => {
            Na__GridUi__GridEnabled = Na__GridUi__EnableToggle.checked;
            const gridGroup = Na__GridLine__GetGridGroup();
            if (gridGroup) gridGroup.visible = Na__GridUi__GridEnabled;
            Na__GridUi__PipelineRef?.current?.invalidateProfileLinesCache?.();  // <-- Scene composition changed; rebuild line cache
            if (Na__GridUi__GridEnabled) Na__GridUi__ApplyUpdate();
            Na__RenderLoop__RequestRender();
        });

        // Grid size slider
        Na__GridUi__SizeSlider.addEventListener('input', () => {
            Na__GridUi__UpdateSizeLabel();
            Na__GridUi__ApplyUpdate();
        });

        // Grid height slider
        Na__GridUi__HeightSlider.addEventListener('input', () => {
            Na__GridUi__UpdateHeightLabel();
            Na__GridUi__ApplyUpdate();
        });

        // Line width slider
        Na__GridUi__WidthSlider.addEventListener('input', () => {
            Na__GridUi__UpdateWidthLabel();
            Na__GridUi__ApplyUpdate();
        });

        // Line type dropdown
        Na__GridUi__TypeSelect.addEventListener('change', () => {
            Na__GridUi__UpdateGapVisibility();
            Na__GridUi__ApplyUpdate();
        });

        // Line colour dropdown
        Na__GridUi__ColorSelect.addEventListener('change', () => {
            Na__GridUi__ApplyUpdate();
        });

        // Line opacity slider
        Na__GridUi__OpacitySlider.addEventListener('input', () => {
            Na__GridUi__UpdateOpacityLabel();
            Na__GridUi__ApplyUpdate();
        });

        // Gap size slider
        Na__GridUi__GapSlider.addEventListener('input', () => {
            Na__GridUi__UpdateGapLabel();
            Na__GridUi__ApplyUpdate();
        });

        // Position X slider
        if (Na__GridUi__PosXSlider) {
            Na__GridUi__PosXSlider.addEventListener('input', () => {
                Na__GridUi__UpdatePosXLabel();
                Na__GridUi__ApplyUpdate();
            });
        }

        // Position X numeric input
        if (Na__GridUi__PosXInput) {
            const handlePosXInput = () => {
                const posCfg = Na__GridUi__Config?.GridLine__Position__Config;
                const minMm  = posCfg?.GridLine__Position__Config__SliderMinMm ?? -35000;
                const maxMm  = posCfg?.GridLine__Position__Config__SliderMaxMm ?? 35000;
                let val      = parseInt(Na__GridUi__PosXInput.value, 10);
                if (Number.isNaN(val) || Na__GridUi__PosXInput.value.trim() === '') {
                    Na__GridUi__PosXInput.value = Na__GridUi__PosXSlider.value;
                    return;
                }
                val = Math.max(minMm, Math.min(maxMm, val));
                Na__GridUi__PosXSlider.value = val;
                Na__GridUi__PosXInput.value  = val;
                Na__GridUi__ApplyUpdate();
            };
            Na__GridUi__PosXInput.addEventListener('input', handlePosXInput);
            Na__GridUi__PosXInput.addEventListener('change', handlePosXInput);
        }

        // Position Z slider
        if (Na__GridUi__PosZSlider) {
            Na__GridUi__PosZSlider.addEventListener('input', () => {
                Na__GridUi__UpdatePosZLabel();
                Na__GridUi__ApplyUpdate();
            });
        }

        // Position Z numeric input
        if (Na__GridUi__PosZInput) {
            const handlePosZInput = () => {
                const posCfg = Na__GridUi__Config?.GridLine__Position__Config;
                const minMm  = posCfg?.GridLine__Position__Config__SliderMinMm ?? -35000;
                const maxMm  = posCfg?.GridLine__Position__Config__SliderMaxMm ?? 35000;
                let val      = parseInt(Na__GridUi__PosZInput.value, 10);
                if (Number.isNaN(val) || Na__GridUi__PosZInput.value.trim() === '') {
                    Na__GridUi__PosZInput.value = Na__GridUi__PosZSlider.value;
                    return;
                }
                val = Math.max(minMm, Math.min(maxMm, val));
                Na__GridUi__PosZSlider.value = val;
                Na__GridUi__PosZInput.value  = val;
                Na__GridUi__ApplyUpdate();
            };
            Na__GridUi__PosZInput.addEventListener('input', handlePosZInput);
            Na__GridUi__PosZInput.addEventListener('change', handlePosZInput);
        }

        // Save position button
        if (Na__GridUi__SaveBtn) {
            Na__GridUi__SaveBtn.addEventListener('click', Na__GridUi__SavePositionToProject);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Populate Colour Select from Config Palette
    // ------------------------------------------------------------
    function Na__GridUi__PopulateColorSelect() {
        const palette = Na__GridUi__Config.GridLine__Style__Config.GridLine__Style__Config__ColorPalette;
        if (!palette || !Na__GridUi__ColorSelect) return;
        Na__GridUi__ColorSelect.innerHTML = '';
        palette.forEach((entry, idx) => {
            const opt = document.createElement('option');
            opt.value = String(idx);
            opt.textContent = entry.label;
            Na__GridUi__ColorSelect.appendChild(opt);
        });
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Apply Config Defaults to DOM Elements
    // ------------------------------------------------------------
    function Na__GridUi__ApplyDefaults() {
        const sizeConfig  = Na__GridUi__Config.GridLine__Size__Config;
        const heightCfg   = Na__GridUi__Config.GridLine__Height__Config;
        const styleCfg    = Na__GridUi__Config.GridLine__Style__Config;
        const posCfg      = Na__GridUi__Config.GridLine__Position__Config;

        Na__GridUi__PopulateColorSelect(); // <-- Build colour options from config before applying defaults

        // Size slider (discrete steps)
        Na__GridUi__SizeSlider.min   = 0;
        Na__GridUi__SizeSlider.max   = sizeConfig.GridLine__Size__Config__StepsMm.length - 1;
        Na__GridUi__SizeSlider.step  = 1;
        Na__GridUi__SizeSlider.value = sizeConfig.GridLine__Size__Config__DefaultIndex;

        // Height slider (linear)
        Na__GridUi__HeightSlider.min   = heightCfg.GridLine__Height__Config__MinMm;
        Na__GridUi__HeightSlider.max   = heightCfg.GridLine__Height__Config__MaxMm;
        Na__GridUi__HeightSlider.step  = heightCfg.GridLine__Height__Config__StepMm;
        Na__GridUi__HeightSlider.value = heightCfg.GridLine__Height__Config__DefaultMm;

        // Width slider (discrete steps)
        Na__GridUi__WidthSlider.min   = 0;
        Na__GridUi__WidthSlider.max   = styleCfg.GridLine__Style__Config__WidthStepsPx.length - 1;
        Na__GridUi__WidthSlider.step  = 1;
        Na__GridUi__WidthSlider.value = styleCfg.GridLine__Style__Config__WidthDefaultIndex;

        // Line type select
        Na__GridUi__TypeSelect.value = styleCfg.GridLine__Style__Config__LineTypes[styleCfg.GridLine__Style__Config__LineTypeDefaultIndex];

        // Colour select
        Na__GridUi__ColorSelect.value = styleCfg.GridLine__Style__Config__ColorDefaultIndex;

        // Opacity slider
        Na__GridUi__OpacitySlider.min   = styleCfg.GridLine__Style__Config__OpacityMin;
        Na__GridUi__OpacitySlider.max   = styleCfg.GridLine__Style__Config__OpacityMax;
        Na__GridUi__OpacitySlider.step  = styleCfg.GridLine__Style__Config__OpacityStep;
        Na__GridUi__OpacitySlider.value = styleCfg.GridLine__Style__Config__OpacityDefault;

        // Gap slider
        Na__GridUi__GapSlider.min   = styleCfg.GridLine__Style__Config__GapScaleMin;
        Na__GridUi__GapSlider.max   = styleCfg.GridLine__Style__Config__GapScaleMax;
        Na__GridUi__GapSlider.step  = styleCfg.GridLine__Style__Config__GapScaleStep;
        Na__GridUi__GapSlider.value = styleCfg.GridLine__Style__Config__GapScaleDefault;

        // Position sliders (localhost only) — use persisted offsets from GridLine__Grid__Offset__Config
        const offsetCfg = Na__GridUi__Config.GridLine__Grid__Offset__Config || {};
        const initialXMm = offsetCfg.GridLine__Grid__Config__Offset__OffsetXMm ?? posCfg.GridLine__Position__Config__OffsetXMm;
        const initialZMm = offsetCfg.GridLine__Grid__Config__Offset__OffsetZMm ?? posCfg.GridLine__Position__Config__OffsetZMm;

        if (Na__GridUi__PosXSlider) {
            Na__GridUi__PosXSlider.min   = posCfg.GridLine__Position__Config__SliderMinMm;
            Na__GridUi__PosXSlider.max   = posCfg.GridLine__Position__Config__SliderMaxMm;
            Na__GridUi__PosXSlider.step  = posCfg.GridLine__Position__Config__SliderStepMm;
            Na__GridUi__PosXSlider.value = initialXMm;
        }
        if (Na__GridUi__PosXInput) {
            Na__GridUi__PosXInput.min    = posCfg.GridLine__Position__Config__SliderMinMm;
            Na__GridUi__PosXInput.max    = posCfg.GridLine__Position__Config__SliderMaxMm;
            Na__GridUi__PosXInput.step   = posCfg.GridLine__Position__Config__SliderStepMm;
            Na__GridUi__PosXInput.value  = initialXMm;
        }
        if (Na__GridUi__PosZSlider) {
            Na__GridUi__PosZSlider.min   = posCfg.GridLine__Position__Config__SliderMinMm;
            Na__GridUi__PosZSlider.max   = posCfg.GridLine__Position__Config__SliderMaxMm;
            Na__GridUi__PosZSlider.step  = posCfg.GridLine__Position__Config__SliderStepMm;
            Na__GridUi__PosZSlider.value = initialZMm;
        }
        if (Na__GridUi__PosZInput) {
            Na__GridUi__PosZInput.min    = posCfg.GridLine__Position__Config__SliderMinMm;
            Na__GridUi__PosZInput.max    = posCfg.GridLine__Position__Config__SliderMaxMm;
            Na__GridUi__PosZInput.step   = posCfg.GridLine__Position__Config__SliderStepMm;
            Na__GridUi__PosZInput.value  = initialZMm;
        }

        // Enable toggle (off by default — user must enable)
        Na__GridUi__EnableToggle.checked = false;

        // Sync labels
        Na__GridUi__UpdateSizeLabel();
        Na__GridUi__UpdateHeightLabel();
        Na__GridUi__UpdateWidthLabel();
        Na__GridUi__UpdateOpacityLabel();
        Na__GridUi__UpdateGapLabel();
        Na__GridUi__UpdateGapVisibility();
        if (Na__GridUi__PosXSlider) Na__GridUi__UpdatePosXLabel();
        if (Na__GridUi__PosZSlider) Na__GridUi__UpdatePosZLabel();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Grid Line Controls
    // ------------------------------------------------------------
    async function Na__UiFeature__InitializeGridLineControls(scene, showToast, pipelineRef) {
        Na__GridUi__ShowToast   = showToast   || null;
        Na__GridUi__PipelineRef = pipelineRef || null;                       // <-- Store for profile lines cache invalidation
        Na__GridUi__Config    = await Na__GridUi__LoadConfig();
        if (!Na__GridUi__Config) return;

        // Merge project-level grid offsets if persisted in the project JSON
        await Na__GridUi__LoadProjectOffsets();

        Na__GridUi__CacheDomElements();
        if (!Na__GridUi__ToggleBtn || !Na__GridUi__Panel || !Na__GridUi__SizeSlider) return;

        // Reveal localhost-only position controls and enable origin marker
        Na__GridUi__IsLocalhost = Na__AppUtils__IsRunningOnLocalhost();
        if (Na__GridUi__IsLocalhost && Na__GridUi__PosSection) {
            Na__GridUi__PosSection.style.display = '';
        }

        Na__GridLine__Initialize(scene);
        Na__GridUi__ApplyDefaults();
        Na__GridUi__WireEvents();

        // Grid starts hidden — user enables via the Show Grid toggle
        const gridGroup = Na__GridLine__GetGridGroup();
        if (gridGroup) gridGroup.visible = false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Grid Line UI Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeGridLineControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
