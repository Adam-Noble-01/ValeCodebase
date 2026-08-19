// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - DEV MENU CONTROLS
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__DevMenu__Controls__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Dev Menu Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The single public entry point for the localhost-only Export
//              Render Layers system - builds the panel from the pass registry
//              and wires preview, selection and batch export.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - Every row in the panel is generated from the pass registry. There is no
//   duplicate list in index.html, so adding a registry entry adds a row, a
//   preview button, a filename and a manifest record with no edit here.
// - The pipeline is read through a LAZY getter, never captured. Switching
//   render engine rebuilds Na__AppFlow__PipelineRef.current, and a captured
//   reference would silently point at a disposed composer afterwards.
// - Export selection and preview are independent. Ticking a row never starts a
//   preview, and previewing a row never ticks it. Preview is exclusive by
//   construction: one overlay, one active pass id.
// - Nothing here is written to R2 project.json. These are developer session
//   settings and they live in the session state module for the tab's lifetime.
// - The system exposes exactly one named export and installs no globals.
//
// INTEGRATION:
// - Call Na__ExportRenderLayers__InitializeDevControls after the renderer,
//   scene, camera, controls, model root and mutable pipeline ref exist.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Initial implementation for the Export Render Layers system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // @delegate: ../03__AppUtils/Na__AppUtils__ProjectLoader.js
    // ------------------------------------------------------------
    import {
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__IsRunningOnLocalhost
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Shared Loading Overlay
    // @delegate: ../03__AppUtils/Na__AppUtils__LoadingOverlay__.js
    // ------------------------------------------------------------
    import { Na__AppUtils__LoadingOverlay__Create } from '../03__AppUtils/Na__AppUtils__LoadingOverlay__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // @delegate: ../05__RenderPipeline/Na__RenderLoop__Invalidation.js
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Active Presentation Scene Name
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__GetActiveConfig,
        Na__PresentationMode__ProjectJson__GetActiveSceneId,
        Na__PresentationMode__ProjectJson__GetSceneById
    } from '../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Pass Registry
    // @delegate: ./01__SystemModules/Na__ExportRenderLayers__PassRegistry__.js
    // ------------------------------------------------------------
    import {
        Na__ExportRenderLayers__Registry__GetAll,
        Na__ExportRenderLayers__Registry__GetGroups,
        Na__ExportRenderLayers__Registry__GetDefaultSelection,
        Na__ExportRenderLayers__Registry__GetEssentialIds,
        Na__ExportRenderLayers__Registry__DescribeCapability
    } from './01__SystemModules/Na__ExportRenderLayers__PassRegistry__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Session State
    // @delegate: ./01__SystemModules/Na__ExportRenderLayers__SessionState__.js
    // ------------------------------------------------------------
    import {
        Na__ErlState__SetSelectedPassIds,
        Na__ErlState__GetSelectedPassIds,
        Na__ErlState__SetPassSelected,
        Na__ErlState__IsPassSelected,
        Na__ErlState__SetActivePreviewPassId,
        Na__ErlState__GetActivePreviewPassId,
        Na__ErlState__GetSelectedCategories,
        Na__ErlState__SetCategorySelected,
        Na__ErlState__IsCategorySelected,
        Na__ErlState__SetAspectIndex,
        Na__ErlState__GetAspectIndex,
        Na__ErlState__SetResolutionIndex,
        Na__ErlState__GetResolutionIndex,
        Na__ErlState__SetExportInProgress,
        Na__ErlState__IsExportInProgress,
        Na__ErlState__CreateCancelToken,
        Na__ErlState__RequestCancel,
        Na__ErlState__ClearCancelToken
    } from './01__SystemModules/Na__ExportRenderLayers__SessionState__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Classification and State Guard
    // @delegate: ./01__SystemModules/Na__ExportRenderLayers__SceneClassifier__.js
    // @delegate: ./01__SystemModules/Na__ExportRenderLayers__SceneStateGuard__.js
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__Classify }           from './01__SystemModules/Na__ExportRenderLayers__SceneClassifier__.js';
    import { Na__ExportRenderLayers__StateGuard__Create } from './01__SystemModules/Na__ExportRenderLayers__SceneStateGuard__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Preview Pipeline
    // @delegate: ./01__SystemModules/Na__ExportRenderLayers__PreviewController__.js
    // @delegate: ./01__SystemModules/Na__ExportRenderLayers__TiledPassRenderer__.js
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__Preview__Create }      from './01__SystemModules/Na__ExportRenderLayers__PreviewController__.js';
    import { Na__ExportRenderLayers__RenderPassPreview }    from './01__SystemModules/Na__ExportRenderLayers__TiledPassRenderer__.js';
    import { Na__ExportRenderLayers__DepthRange__Calculate } from './01__SystemModules/Na__ExportRenderLayers__DepthRange__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Pass Dispatch and Whitecard Preset
    // @delegate: ./01__SystemModules/Na__ExportRenderLayers__PassRenderers__.js
    // @delegate: ./01__SystemModules/Na__ExportRenderLayers__Pass__SurfacePreset__.js
    // ------------------------------------------------------------
    import {
        Na__ExportRenderLayers__CreateGenerator,
        Na__ExportRenderLayers__CreateRenderContext
    } from './01__SystemModules/Na__ExportRenderLayers__PassRenderers__.js';
    import { Na__ExportRenderLayers__SurfacePreset__Create } from './01__SystemModules/Na__ExportRenderLayers__Pass__SurfacePreset__.js';
    import { Na__ExportRenderLayers__InvertCanvas }            from './01__SystemModules/Na__ExportRenderLayers__CanvasInvert__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Conditional Pass Availability
    // @delegate: ./01__SystemModules/Na__ExportRenderLayers__Pass__ShadowMask__.js
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__ShadowMask__CheckAvailability } from './01__SystemModules/Na__ExportRenderLayers__Pass__ShadowMask__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Batch Exporter
    // @delegate: ./01__SystemModules/Na__ExportRenderLayers__BatchExporter__.js
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__Batch__Run } from './01__SystemModules/Na__ExportRenderLayers__BatchExporter__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Manual Save Fallback
    // @delegate: ./01__SystemModules/Na__ExportRenderLayers__FileWriter__.js
    // ------------------------------------------------------------
    import { Na__ExportRenderLayers__DownloadBlob } from './01__SystemModules/Na__ExportRenderLayers__FileWriter__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Dev Menu DOM IDs
    // ------------------------------------------------------------
    const Na__ErlUi__ITEM_ID            = 'naExportRenderLayersDevItem';
    const Na__ErlUi__TOGGLE_ID          = 'naExportRenderLayersToggle';
    const Na__ErlUi__PANEL_ID           = 'naExportRenderLayersPanel';
    const Na__ErlUi__PASS_LIST_ID       = 'naExportRenderLayersPassList';
    const Na__ErlUi__OUTPUT_ID          = 'naExportRenderLayersOutput';
    const Na__ErlUi__CATEGORIES_ID      = 'naExportRenderLayersCategories';
    const Na__ErlUi__HELP_ID            = 'naExportRenderLayersHelp';
    const Na__ErlUi__STATUS_ID          = 'naExportRenderLayersStatus';
    const Na__ErlUi__RETAINED_ID        = 'naExportRenderLayersRetained';
    const Na__ErlUi__RETURN_ID          = 'naExportRenderLayersReturnToBeauty';
    const Na__ErlUi__EXPORT_ID          = 'naExportRenderLayersExportSelected';
    const Na__ErlUi__CANCEL_ID          = 'naExportRenderLayersCancel';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Shared Image Export Config Keys
    // ------------------------------------------------------------
    // Aspect ratios and resolutions are reused from the existing image
    // exporter so a structural map always drops beside a normal ValeVision
    // export without resizing.
    // ------------------------------------------------------------
    const Na__ErlUi__IMAGE_EXPORT_KEYS = {
        aspectRatios           : 'ImageExport__Config__AspectRatios',
        defaultAspectIndex     : 'ImageExport__Config__DefaultAspectIndex',
        resolutions            : 'ImageExport__Config__Resolutions',
        defaultResolutionIndex : 'ImageExport__Config__DefaultResolutionIndex'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Panel Help Text
    // ------------------------------------------------------------
    const Na__ErlUi__HELP_TEXT = [
        'Structural passes render at the live camera, crop and dimensions, so every exported layer aligns to the pixel with the Beauty render.',
        'Preview shows one pass over the viewport without changing the live scene. It clears as soon as the camera moves.',
        'MLSD needs a Qwen-Image-2512 base. Normal and Line Art need a Qwen-Image base. Depth and Canny work against either, which makes them the safest first test.'
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Injected Context (Set Once at Initialization)
    // ------------------------------------------------------------
    let Na__ErlUi__Renderer       = null;
    let Na__ErlUi__Scene          = null;
    let Na__ErlUi__Camera         = null;
    let Na__ErlUi__Controls       = null;
    let Na__ErlUi__ModelRoot      = null;
    let Na__ErlUi__GetPipeline    = null;
    let Na__ErlUi__Config         = null;
    let Na__ErlUi__ImageConfig    = null;
    let Na__ErlUi__LineworkConfig = null;
    let Na__ErlUi__ShowToast      = null;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Panel Elements and Controllers
    // ------------------------------------------------------------
    let Na__ErlUi__StatusElement  = null;
    let Na__ErlUi__ExportButton   = null;
    let Na__ErlUi__CancelButton   = null;
    let Na__ErlUi__PreviewCtrl    = null;
    let Na__ErlUi__PassRows       = new Map();   // <-- passId -> { checkbox, previewButton, row }
    let Na__ErlUi__KnownCategories = [];
    let Na__ErlUi__RetainedElement = null;       // <-- Manual-save list shown only on the download fallback path
    let Na__ErlUi__RetainedFiles   = [];         // <-- [{ filename, blob }] held until the next export or a clear
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Small UI Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create an Element With a Class and Optional Text
    // ------------------------------------------------------------
    function Na__ErlUi__CreateElement(tagName, className, textContent) {
        const element = document.createElement(tagName);
        if (className)   element.className   = className;
        if (textContent) element.textContent = textContent;
        return element;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write a Message to the Panel Status Line
    // ------------------------------------------------------------
    function Na__ErlUi__SetStatus(message, isError) {
        if (!Na__ErlUi__StatusElement) return;
        Na__ErlUi__StatusElement.textContent = message || '';
        Na__ErlUi__StatusElement.classList.toggle('na-erl__status--error', !!isError);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Raise a Toast When One Was Supplied
    // ------------------------------------------------------------
    function Na__ErlUi__Toast(message) {
        if (typeof Na__ErlUi__ShowToast === 'function') Na__ErlUi__ShowToast(message);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp a Configured Index Into a List's Range
    // ------------------------------------------------------------
    // A config default that outruns its list would otherwise leave a slider
    // reading "undefined" on first open.
    // ------------------------------------------------------------
    function Na__ErlUi__ClampIndex(value, listLength) {
        const index = Number.isFinite(value) ? Math.floor(value) : 0;
        return Math.max(0, Math.min(index, Math.max(0, listLength - 1)));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse an Aspect Ratio String Into a Number Pair
    // ------------------------------------------------------------
    function Na__ErlUi__ParseAspectRatio(ratioText) {
        const parts  = String(ratioText || '3:2').split(':');
        const width  = parseFloat(parts[0]);
        const height = parseFloat(parts[1]);
        if (!Number.isFinite(width) || !Number.isFinite(height) || height === 0) {
            return { width: 3, height: 2 };
        }
        return { width, height };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Requested Output Dimensions
    // ------------------------------------------------------------
    function Na__ErlUi__ResolveOutputDimensions() {
        const ratios      = Na__ErlUi__ImageConfig[Na__ErlUi__IMAGE_EXPORT_KEYS.aspectRatios];
        const resolutions = Na__ErlUi__ImageConfig[Na__ErlUi__IMAGE_EXPORT_KEYS.resolutions];

        const ratioText    = ratios[Math.min(Na__ErlState__GetAspectIndex(), ratios.length - 1)];
        const targetHeight = resolutions[Math.min(Na__ErlState__GetResolutionIndex(), resolutions.length - 1)];

        const ratio = Na__ErlUi__ParseAspectRatio(ratioText);

        return {
            width       : Math.round(targetHeight * (ratio.width / ratio.height)),
            height      : targetHeight,
            aspectRatio : ratioText
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Active Presentation Scene Name
    // ------------------------------------------------------------
    // Returns null when no presentation scene is active, which the manifest
    // builder turns into the stable CurrentScene fallback.
    // ------------------------------------------------------------
    function Na__ErlUi__ResolveActiveSceneName() {
        try {
            const config  = Na__PresentationMode__ProjectJson__GetActiveConfig();
            const sceneId = Na__PresentationMode__ProjectJson__GetActiveSceneId();
            if (!config || !sceneId) return null;

            const scene = Na__PresentationMode__ProjectJson__GetSceneById(config, sceneId);
            return (scene && scene.PresentationMode__Scene__Name) || null;
        } catch (lookupError) {
            return null;                                                 // <-- Presentation mode is optional; never block an export on it
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Panel Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Output Framing Controls From the Image Export Config
    // ------------------------------------------------------------
    function Na__ErlUi__BuildOutputControls(container) {
        if (!container) return;                                          // <-- Markup section absent; the rest of the panel still builds

        const ratios      = Na__ErlUi__ImageConfig[Na__ErlUi__IMAGE_EXPORT_KEYS.aspectRatios];
        const resolutions = Na__ErlUi__ImageConfig[Na__ErlUi__IMAGE_EXPORT_KEYS.resolutions];

        container.innerHTML = '';
        container.appendChild(Na__ErlUi__CreateElement('div', 'na-dropdown-menu__panel-title', 'Output Framing'));


        // ASPECT RATIO | Same list the Tools menu image export offers
        // ------------------------------------------------------------
        const ratioRow   = Na__ErlUi__CreateElement('div', 'na-dropdown-menu__panel-row');
        const ratioSlider = document.createElement('input');
        ratioSlider.type  = 'range';
        ratioSlider.className = 'na-dropdown-menu__slider';
        ratioSlider.min   = '0';
        ratioSlider.max   = String(ratios.length - 1);
        ratioSlider.step  = '1';
        ratioSlider.value = String(Na__ErlState__GetAspectIndex());

        const ratioValue = Na__ErlUi__CreateElement('span', 'na-dropdown-menu__value', ratios[Na__ErlState__GetAspectIndex()]);

        ratioRow.appendChild(ratioSlider);
        ratioRow.appendChild(ratioValue);
        container.appendChild(ratioRow);


        // RESOLUTION | Pixel heights, shown alongside the derived pixel width
        // ------------------------------------------------------------
        const resRow    = Na__ErlUi__CreateElement('div', 'na-dropdown-menu__panel-row');
        const resSlider = document.createElement('input');
        resSlider.type  = 'range';
        resSlider.className = 'na-dropdown-menu__slider';
        resSlider.min   = '0';
        resSlider.max   = String(resolutions.length - 1);
        resSlider.step  = '1';
        resSlider.value = String(Na__ErlState__GetResolutionIndex());

        const resValue = Na__ErlUi__CreateElement('span', 'na-dropdown-menu__value', '');

        resRow.appendChild(resSlider);
        resRow.appendChild(resValue);
        container.appendChild(resRow);


        // SUB FUNCTION | Refresh the Two Readouts From Session State
        // ---------------------------------------------------------------
        function refreshReadouts() {
            const dimensions = Na__ErlUi__ResolveOutputDimensions();
            ratioValue.textContent = dimensions.aspectRatio;
            resValue.textContent   = `${dimensions.width}x${dimensions.height}`;
        }
        // ---------------------------------------------------------------

        ratioSlider.addEventListener('input', () => {
            Na__ErlState__SetAspectIndex(parseInt(ratioSlider.value, 10));
            refreshReadouts();
        });

        resSlider.addEventListener('input', () => {
            Na__ErlState__SetResolutionIndex(parseInt(resSlider.value, 10));
            refreshReadouts();
        });

        refreshReadouts();
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Pass's Availability Against the Live Scene
    // ------------------------------------------------------------
    // Registry entries that declare conditionalAvailability are checked
    // here, so a pass that cannot work in THIS scene reads as unavailable
    // in the panel with a reason rather than failing on click.
    // ------------------------------------------------------------
    function Na__ErlUi__ResolveAvailability(pass) {
        if (pass.available === false) {
            return { available: false, reason: pass.unavailableReason || 'This pass is not available.' };
        }

        if (pass.conditionalAvailability === 'shadowMap') {
            return Na__ExportRenderLayers__ShadowMask__CheckAvailability({
                renderer : Na__ErlUi__Renderer,
                scene    : Na__ErlUi__Scene
            });
        }

        return { available: true, reason: '' };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build One Registry-Driven Pass Row
    // ------------------------------------------------------------
    // Export checkbox, readable name, capability note and Preview button.
    // The Preview button never touches the export checkbox.
    // ------------------------------------------------------------
    function Na__ErlUi__BuildPassRow(pass) {
        const availability = Na__ErlUi__ResolveAvailability(pass);

        const row = Na__ErlUi__CreateElement('div', 'na-erl__row');
        if (!availability.available) row.classList.add('na-erl__row--unavailable');


        // SELECTION | Export checkbox
        // ------------------------------------------------------------
        const checkbox = document.createElement('input');
        checkbox.type      = 'checkbox';
        checkbox.className = 'na-dropdown-menu__checkbox na-erl__checkbox';
        checkbox.checked   = Na__ErlState__IsPassSelected(pass.id) && availability.available;
        checkbox.disabled  = !availability.available;
        checkbox.setAttribute('aria-label', `Include ${pass.label} in the export`);
        if (!availability.available) {
            checkbox.title = availability.reason;
            Na__ErlState__SetPassSelected(pass.id, false);               // <-- An unusable pass must never stay ticked
        }

        checkbox.addEventListener('change', () => {
            Na__ErlState__SetPassSelected(pass.id, checkbox.checked);
            Na__ErlUi__RefreshExportButton();
        });


        // LABEL | Name plus the derived capability note
        // ------------------------------------------------------------
        const labelBlock = Na__ErlUi__CreateElement('div', 'na-erl__label-block');
        labelBlock.appendChild(Na__ErlUi__CreateElement('span', 'na-erl__label', pass.label));

        const noteText = Na__ExportRenderLayers__Registry__DescribeCapability(pass, availability.available);

        const note = Na__ErlUi__CreateElement('span', 'na-erl__note',
            pass.isEssential ? `essential, ${noteText}` : noteText);
        if (pass.isEssential) note.classList.add('na-erl__note--essential');
        note.title = pass.description || '';
        labelBlock.appendChild(note);

        if (!availability.available && availability.reason) {
            const reason = Na__ErlUi__CreateElement('span', 'na-erl__reason', availability.reason);
            reason.title = availability.reason;
            labelBlock.appendChild(reason);                              // <-- Explained in text, never merely greyed out
        }


        // PREVIEW | Exclusive, and independent of the export selection
        // ------------------------------------------------------------
        const previewButton = Na__ErlUi__CreateElement('button', 'na-erl__preview-btn', 'Preview');
        previewButton.type     = 'button';
        previewButton.disabled = !availability.available || pass.previewMode === 'none';
        if (previewButton.disabled && availability.reason) previewButton.title = availability.reason;

        previewButton.addEventListener('click', () => {
            Na__ErlUi__HandlePreviewClick(pass);
        });


        row.appendChild(checkbox);
        row.appendChild(labelBlock);
        row.appendChild(previewButton);

        Na__ErlUi__PassRows.set(pass.id, { row, checkbox, previewButton, pass });
        return row;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Bulk Selection Across Every Row
    // ------------------------------------------------------------
    // passIds {array|null}  Exact set to tick, or null to tick everything
    //                       that is currently usable.
    //
    // A row that is unavailable in this scene, or that is waiting on a
    // category selection, is never ticked by a bulk action. Bulk selection
    // must not be able to queue a layer that would then fail the export.
    // ------------------------------------------------------------
    function Na__ErlUi__ApplyBulkSelection(passIds) {
        const wanted = (passIds === null) ? null : new Set(passIds);

        Na__ErlUi__PassRows.forEach((entry, passId) => {
            const isSelectable = !entry.checkbox.disabled;
            const shouldSelect = isSelectable && (wanted === null || wanted.has(passId));

            entry.checkbox.checked = shouldSelect;
            Na__ErlState__SetPassSelected(passId, shouldSelect);
        });

        Na__ErlUi__RefreshExportButton();
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Bulk Selection Button Row
    // ------------------------------------------------------------
    // Three actions, all driven from the registry so the definition of
    // "essential" lives in one place and cannot drift from the metadata
    // the manifest publishes.
    // ------------------------------------------------------------
    function Na__ErlUi__BuildBulkActions(container) {
        const row = Na__ErlUi__CreateElement('div', 'na-erl__bulk-row');


        // SUB FUNCTION | Add One Bulk Action Button
        // ---------------------------------------------------------------
        function addAction(label, title, resolveIds) {
            const button = Na__ErlUi__CreateElement('button', 'na-erl__bulk-btn', label);
            button.type  = 'button';
            button.title = title;
            button.addEventListener('click', () => {
                Na__ErlUi__ApplyBulkSelection(resolveIds());
                Na__ErlUi__SetStatus(`${label}: ${Na__ErlState__GetSelectedPassIds().length} layer(s) selected.`, false);
            });
            row.appendChild(button);
        }
        // ---------------------------------------------------------------

        addAction(
            'Select All',
            'Tick every layer that can be exported from this scene.',
            () => null
        );

        addAction(
            'Select None',
            'Clear the whole selection.',
            () => []
        );

        addAction(
            'Essential Only',
            'The working set a Qwen ControlNet workflow consumes: the composed edit image plus Depth, Normal, Canny, Line Art and MLSD.',
            () => Na__ExportRenderLayers__Registry__GetEssentialIds()
        );

        container.appendChild(row);
    }
    // ------------------------------------------------------------


    // FUNCTION | Build Every Pass Row, Grouped by Registry Group
    // ------------------------------------------------------------
    function Na__ErlUi__BuildPassList(container) {
        if (!container) return;                                          // <-- Markup section absent; the rest of the panel still builds

        container.innerHTML = '';
        Na__ErlUi__PassRows.clear();

        Na__ErlUi__BuildBulkActions(container);

        const passes = Na__ExportRenderLayers__Registry__GetAll();

        Na__ExportRenderLayers__Registry__GetGroups().forEach((groupName) => {
            container.appendChild(Na__ErlUi__CreateElement('div', 'na-erl__group-title', groupName));

            passes
                .filter((pass) => pass.group === groupName)
                .forEach((pass) => container.appendChild(Na__ErlUi__BuildPassRow(pass)));
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Inpaint Mask Category Selection
    // ------------------------------------------------------------
    // Rebuilt whenever the panel opens, because categories only exist once
    // the model has loaded and can be toggled by the model element controls.
    // ------------------------------------------------------------
    function Na__ErlUi__BuildCategoryList(container) {
        if (!container) return;                                          // <-- Markup section absent; the rest of the panel still builds

        container.innerHTML = '';

        const classification = Na__ExportRenderLayers__Classify(Na__ErlUi__ModelRoot, Na__ErlUi__Config);
        Na__ErlUi__KnownCategories = classification.categoryNames;

        container.appendChild(Na__ErlUi__CreateElement('div', 'na-dropdown-menu__panel-title', 'Inpaint Mask Region'));

        if (Na__ErlUi__KnownCategories.length === 0) {
            container.appendChild(Na__ErlUi__CreateElement('div', 'na-erl__note', 'No visible model categories yet.'));
            Na__ErlUi__RefreshRowAvailability();
            return;
        }


        // PRESET | Every visible category at once
        // ------------------------------------------------------------
        const presetButton = Na__ErlUi__CreateElement('button', 'na-dropdown-menu__action na-dropdown-menu__action--secondary', 'Select All Visible Categories');
        presetButton.type = 'button';
        presetButton.addEventListener('click', () => {
            Na__ErlUi__KnownCategories.forEach((name) => Na__ErlState__SetCategorySelected(name, true));
            Na__ErlUi__BuildCategoryList(container);
        });
        container.appendChild(presetButton);

        Na__ErlUi__KnownCategories.forEach((categoryName) => {
            const row = Na__ErlUi__CreateElement('div', 'na-erl__category-row');

            const checkbox = document.createElement('input');
            checkbox.type      = 'checkbox';
            checkbox.className = 'na-dropdown-menu__checkbox na-erl__checkbox';
            checkbox.checked   = Na__ErlState__IsCategorySelected(categoryName);
            checkbox.setAttribute('aria-label', `Include ${categoryName} in the inpaint mask`);

            checkbox.addEventListener('change', () => {
                Na__ErlState__SetCategorySelected(categoryName, checkbox.checked);
                Na__ErlUi__RefreshRowAvailability();
            });

            row.appendChild(checkbox);
            row.appendChild(Na__ErlUi__CreateElement('span', 'na-erl__category-label', categoryName));
            container.appendChild(row);
        });

        Na__ErlUi__RefreshRowAvailability();
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Panel Help Text
    // ------------------------------------------------------------
    function Na__ErlUi__BuildHelp(container) {
        if (!container) return;                                          // <-- Markup section absent; the rest of the panel still builds

        container.innerHTML = '';
        Na__ErlUi__HELP_TEXT.forEach((paragraph) => {
            container.appendChild(Na__ErlUi__CreateElement('p', 'na-erl__help-line', paragraph));
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Row State Refresh
// -----------------------------------------------------------------------------

    // FUNCTION | Enable or Disable Rows That Depend on a Selection
    // ------------------------------------------------------------
    // A pass that requires a selection stays disabled, and explains why in
    // its title, until that selection exists.
    // ------------------------------------------------------------
    function Na__ErlUi__RefreshRowAvailability() {
        const hasCategorySelection = Na__ErlState__GetSelectedCategories().length > 0;

        Na__ErlUi__PassRows.forEach((entry) => {
            if (!entry.pass.requiresSelection) return;

            const enabled = hasCategorySelection && entry.pass.available !== false;

            entry.checkbox.disabled      = !enabled;
            entry.previewButton.disabled = !enabled;
            entry.row.classList.toggle('na-erl__row--needs-selection', !enabled);

            const reason = enabled ? '' : 'Select at least one category group below to enable this pass.';
            entry.checkbox.title      = reason;
            entry.previewButton.title = reason;

            if (!enabled && entry.checkbox.checked) {
                entry.checkbox.checked = false;
                Na__ErlState__SetPassSelected(entry.pass.id, false);      // <-- Never let an unusable pass stay ticked
            }
        });

        Na__ErlUi__RefreshExportButton();
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh the Export Button Label and Enabled State
    // ------------------------------------------------------------
    function Na__ErlUi__RefreshExportButton() {
        if (!Na__ErlUi__ExportButton) return;

        const count = Na__ErlState__GetSelectedPassIds().length;

        Na__ErlUi__ExportButton.textContent = (count === 1)
            ? 'Export 1 Selected Layer'
            : `Export ${count} Selected Layers`;

        Na__ErlUi__ExportButton.disabled = (count === 0) || Na__ErlState__IsExportInProgress();
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh Every Preview Button Against the Active Preview
    // ------------------------------------------------------------
    // The active pass reads "Viewing"; every other available pass reads
    // "Preview". Exclusivity is visible, not just enforced.
    // ------------------------------------------------------------
    function Na__ErlUi__RefreshPreviewButtons() {
        const activeId = Na__ErlState__GetActivePreviewPassId();

        Na__ErlUi__PassRows.forEach((entry, passId) => {
            const isActive = (passId === activeId);
            entry.previewButton.textContent = isActive ? 'Viewing' : 'Preview';
            entry.previewButton.classList.toggle('na-erl__preview-btn--active', isActive);
            entry.row.classList.toggle('na-erl__row--previewing', isActive);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Preview
// -----------------------------------------------------------------------------

    // FUNCTION | Handle a Preview Button Click
    // ------------------------------------------------------------
    function Na__ErlUi__HandlePreviewClick(pass) {
        if (Na__ErlState__IsExportInProgress()) {
            Na__ErlUi__SetStatus('An export is running. Preview is unavailable until it finishes.', true);
            return;
        }

        // TOGGLE OFF | Clicking the active pass returns to the beauty viewport
        if (Na__ErlState__GetActivePreviewPassId() === pass.id) {
            Na__ErlUi__ClearPreview('toggled off');
            return;
        }

        try {
            if (pass.previewMode === 'viewport') {
                Na__ErlUi__ClearPreview('beauty');                       // <-- The live viewport already shows beauty
                Na__ErlUi__SetStatus('Showing the live beauty viewport.', false);
                return;
            }

            if (pass.previewMode === 'composer') {
                Na__ErlUi__RenderComposerPreview(pass);
            } else {
                Na__ErlUi__RenderOverlayPreview(pass);
            }

            Na__ErlUi__PreviewCtrl.show(pass.id);
            Na__ErlState__SetActivePreviewPassId(pass.id);
            Na__ErlUi__RefreshPreviewButtons();
            Na__ErlUi__SetStatus(`Previewing ${pass.label}. Move the camera to return to the live view.`, false);

        } catch (previewError) {
            console.error('[ExportRenderLayers] Preview failed:', previewError);
            Na__ErlUi__ClearPreview('preview failed');
            Na__ErlUi__SetStatus(previewError.message || 'The preview could not be rendered.', true);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Render a Structural Pass Into the Overlay Canvas
    // ------------------------------------------------------------
    // Everything is torn down in finally, so a shader failure mid-preview
    // still leaves the live composer untouched.
    // ------------------------------------------------------------
    function Na__ErlUi__RenderOverlayPreview(pass) {
        const classification = Na__ExportRenderLayers__Classify(Na__ErlUi__ModelRoot, Na__ErlUi__Config);
        if (classification.meshes.length === 0) {
            throw new Error('No visible structural geometry to preview.');
        }

        const size  = Na__ErlUi__PreviewCtrl.resolvePreviewSize();
        const guard = Na__ExportRenderLayers__StateGuard__Create({
            renderer : Na__ErlUi__Renderer,
            scene    : Na__ErlUi__Scene,
            camera   : Na__ErlUi__Camera
        });

        let context   = null;
        let generator = null;

        try {
            const depthRange = Na__ExportRenderLayers__DepthRange__Calculate({
                camera         : Na__ErlUi__Camera,
                classification,
                config         : Na__ErlUi__Config
            });

            context = Na__ExportRenderLayers__CreateRenderContext({
                renderer       : Na__ErlUi__Renderer,
                scene          : Na__ErlUi__Scene,
                camera         : Na__ErlUi__Camera,
                classification,
                guard,
                config         : Na__ErlUi__Config,
                lineworkConfig : Na__ErlUi__LineworkConfig,
                depthRange,
                outputWidth    : size.width,
                outputHeight   : size.height,
                selectedCategories : Na__ErlState__GetSelectedCategories()
            });

            generator = Na__ExportRenderLayers__CreateGenerator(pass.generator);
            if (!generator) throw new Error(`${pass.label} has no generator implementation registered.`);

            if (typeof generator.begin === 'function') generator.begin(context);

            Na__ExportRenderLayers__RenderPassPreview({
                context,
                generator,
                width        : size.width,
                height       : size.height,
                targetCanvas : Na__ErlUi__PreviewCtrl.getCanvas()
            });

        } finally {
            // RESTORE THEN DISPOSE | The scene must point at its own materials
            // again before the generator frees the export ones.
            // ------------------------------------------------------------
            guard.restore();

            if (generator && typeof generator.end === 'function') {
                try { generator.end(context); } catch (endError) { console.error('[ExportRenderLayers] Preview teardown failed:', endError); }
            }
            if (context) context.dispose();

            Na__RenderLoop__RequestRender();                             // <-- Repaint the live viewport under the overlay
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Render a Composed Pass Through the Live Composer
    // ------------------------------------------------------------
    // Used by Whitecard, which is a composed image rather than a structural
    // buffer. The composer output is copied straight off the canvas in the
    // same task, exactly as the viewport image capture already does.
    // ------------------------------------------------------------
    function Na__ErlUi__RenderComposerPreview(pass) {
        const classification = Na__ExportRenderLayers__Classify(Na__ErlUi__ModelRoot, Na__ErlUi__Config);
        if (classification.meshes.length === 0) {
            throw new Error('No visible structural geometry to preview.');
        }

        const guard  = Na__ExportRenderLayers__StateGuard__Create({
            renderer : Na__ErlUi__Renderer,
            scene    : Na__ErlUi__Scene,
            camera   : Na__ErlUi__Camera
        });
        const preset = pass.surfacePreset
            ? Na__ExportRenderLayers__SurfacePreset__Create(pass.surfacePreset)
            : null;

        try {
            if (preset) {
                preset.apply({
                    classification, guard,
                    config           : Na__ErlUi__Config,
                    getPipelineState : Na__ErlUi__GetPipeline
                });
            }

            const pipeline = (typeof Na__ErlUi__GetPipeline === 'function') ? Na__ErlUi__GetPipeline() : null;

            if (pipeline && pipeline.composer) {
                if (typeof pipeline.renderProfileNormals === 'function') pipeline.renderProfileNormals();
                pipeline.composer.render();
            } else {
                Na__ErlUi__Renderer.render(Na__ErlUi__Scene, Na__ErlUi__Camera);
            }

            const liveCanvas    = Na__ErlUi__Renderer.domElement;
            const overlayCanvas = Na__ErlUi__PreviewCtrl.getCanvas();

            overlayCanvas.width  = liveCanvas.width;
            overlayCanvas.height = liveCanvas.height;
            overlayCanvas.getContext('2d').drawImage(liveCanvas, 0, 0);  // <-- Same task as the render; no preserveDrawingBuffer needed

            if (pass.invertOutput) {
                Na__ExportRenderLayers__InvertCanvas(overlayCanvas);      // <-- Preview must match what the export will write
            }

        } finally {
            if (preset) preset.revert();
            guard.restore();
            Na__RenderLoop__RequestRender();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear the Preview Overlay and Reset Button State
    // ------------------------------------------------------------
    function Na__ErlUi__ClearPreview(reason) {
        if (Na__ErlUi__PreviewCtrl) Na__ErlUi__PreviewCtrl.clear(reason);
        Na__ErlState__SetActivePreviewPassId(null);
        Na__ErlUi__RefreshPreviewButtons();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Export
// -----------------------------------------------------------------------------

    // FUNCTION | Run the Batch Export for the Current Selection
    // ------------------------------------------------------------
    async function Na__ErlUi__HandleExportClick() {
        if (Na__ErlState__IsExportInProgress()) return;

        const selectedIds = Na__ErlState__GetSelectedPassIds();
        if (selectedIds.length === 0) {
            Na__ErlUi__SetStatus('Tick at least one render layer first.', true);
            return;
        }


        // ORDER | Registry order, so a set is always assembled the same way
        // ------------------------------------------------------------
        const selectedPasses = Na__ExportRenderLayers__Registry__GetAll()
            .filter((pass) => selectedIds.includes(pass.id) && Na__ErlUi__ResolveAvailability(pass).available);

        const dimensions  = Na__ErlUi__ResolveOutputDimensions();
        const cancelToken = Na__ErlState__CreateCancelToken();
        const overlay     = Na__AppUtils__LoadingOverlay__Create({ actionButton: Na__ErlUi__ExportButton, opaque: true });

        Na__ErlState__SetExportInProgress(true);
        Na__ErlUi__RenderRetainedFiles([]);                              // <-- Release the previous run's Blobs before allocating new ones
        Na__ErlUi__ClearPreview('export started');                       // <-- A stale structural snapshot must not survive an export
        Na__ErlUi__RefreshExportButton();
        Na__ErlUi__SetCancelVisible(true);

        overlay.show('Preparing render layers...');

        try {
            const result = await Na__ExportRenderLayers__Batch__Run({
                renderer   : Na__ErlUi__Renderer,
                scene      : Na__ErlUi__Scene,
                camera     : Na__ErlUi__Camera,
                controls   : Na__ErlUi__Controls,
                modelRoot  : Na__ErlUi__ModelRoot,
                getRenderPipelineState : Na__ErlUi__GetPipeline,
                config         : Na__ErlUi__Config,
                lineworkConfig : Na__ErlUi__LineworkConfig,
                selectedPasses,
                selectedCategories : Na__ErlState__GetSelectedCategories(),
                outputWidth  : dimensions.width,
                outputHeight : dimensions.height,
                aspectRatio  : dimensions.aspectRatio,
                projectCode  : Na__AppUtils__GetProjectCodeFromUrl(),
                sceneName    : Na__ErlUi__ResolveActiveSceneName(),
                cameraName   : null,
                cancelToken,
                onProgress   : (update) => {
                    if (update && update.message) {
                        overlay.setStatus(update.message);
                        Na__ErlUi__SetStatus(update.message, false);
                    }
                }
            });

            const destination = (result.mode === 'folder')
                ? 'the folder you chose'
                : 'your downloads';
            const clampNote = result.wasClamped
                ? ` Output was reduced to ${result.width}x${result.height} to fit this device.`
                : '';

            const summary = `Exported ${result.writtenFiles.length} file(s) to ${destination}.${clampNote}`;
            Na__ErlUi__RenderRetainedFiles(result.retained);             // <-- Empty in folder mode
            overlay.dismiss(summary, false, 1200, null);
            Na__ErlUi__SetStatus(summary, false);
            Na__ErlUi__Toast(summary);

        } catch (exportError) {
            console.error('[ExportRenderLayers] Export failed:', exportError);

            const alreadyWritten = Array.isArray(exportError.na_writtenFiles) ? exportError.na_writtenFiles : [];
            const writtenNote    = alreadyWritten.length > 0
                ? ` ${alreadyWritten.length} file(s) were already written before it stopped.`
                : '';
            const message = `${exportError.message || 'The export failed.'}${writtenNote}`;

            Na__ErlUi__RenderRetainedFiles(exportError.na_retained || []);
            overlay.dismiss(message, true, 2400, null);
            Na__ErlUi__SetStatus(message, true);

        } finally {
            Na__ErlState__SetExportInProgress(false);
            Na__ErlState__ClearCancelToken();
            Na__ErlUi__SetCancelVisible(false);
            Na__ErlUi__RefreshExportButton();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Offer Individual Saves for Retained Blobs
    // ------------------------------------------------------------
    // Only ever populated on the download fallback path, where a browser can
    // silently refuse a rapid succession of downloads. The Blobs stay alive
    // until the next export or an explicit clear, so anything the browser
    // dropped can still be saved by hand.
    //
    // Full-resolution PNGs are large, so the list carries its own Clear
    // action rather than holding several hundred megabytes indefinitely.
    // ------------------------------------------------------------
    function Na__ErlUi__RenderRetainedFiles(retained) {
        if (!Na__ErlUi__RetainedElement) return;

        Na__ErlUi__RetainedFiles = Array.isArray(retained) ? retained : [];
        Na__ErlUi__RetainedElement.innerHTML = '';

        if (Na__ErlUi__RetainedFiles.length === 0) return;

        Na__ErlUi__RetainedElement.appendChild(Na__ErlUi__CreateElement(
            'div',
            'na-dropdown-menu__panel-title',
            'Save Individually (if a download was blocked)'
        ));

        Na__ErlUi__RetainedFiles.forEach((record) => {
            const button = Na__ErlUi__CreateElement('button', 'na-erl__retained-btn', record.filename);
            button.type  = 'button';
            button.title = record.filename;
            button.addEventListener('click', () => {
                Na__ExportRenderLayers__DownloadBlob(record.blob, record.filename);
            });
            Na__ErlUi__RetainedElement.appendChild(button);
        });

        const clearButton = Na__ErlUi__CreateElement('button', 'na-dropdown-menu__action na-dropdown-menu__action--secondary', 'Clear Retained Files');
        clearButton.type = 'button';
        clearButton.addEventListener('click', () => {
            Na__ErlUi__RenderRetainedFiles([]);                          // <-- Release the Blobs
            Na__ErlUi__SetStatus('Retained files cleared.', false);
        });
        Na__ErlUi__RetainedElement.appendChild(clearButton);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show or Hide the Cancel Button
    // ------------------------------------------------------------
    function Na__ErlUi__SetCancelVisible(isVisible) {
        if (!Na__ErlUi__CancelButton) return;
        Na__ErlUi__CancelButton.style.display = isVisible ? '' : 'none';
        Na__ErlUi__CancelButton.disabled = !isVisible;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public Initialization
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Validate the Shared Image Export Config Block
    // ------------------------------------------------------------
    function Na__ErlUi__ValidateImageConfig(imageConfig) {
        if (!imageConfig) return false;
        if (!Array.isArray(imageConfig[Na__ErlUi__IMAGE_EXPORT_KEYS.aspectRatios])) return false;
        if (!Array.isArray(imageConfig[Na__ErlUi__IMAGE_EXPORT_KEYS.resolutions]))  return false;
        if (imageConfig[Na__ErlUi__IMAGE_EXPORT_KEYS.aspectRatios].length === 0)    return false;
        if (imageConfig[Na__ErlUi__IMAGE_EXPORT_KEYS.resolutions].length === 0)     return false;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize the Localhost-Only Export Render Layers Controls
    // ------------------------------------------------------------
    // options:
    //   renderer               {THREE.WebGLRenderer}
    //   scene                  {THREE.Scene}
    //   camera                 {THREE.PerspectiveCamera}
    //   controls               {OrbitControls}
    //   modelRoot              {THREE.Group}   Na__ModelGroup__Root
    //   getRenderPipelineState {Function}      LAZY pipeline getter
    //   config                 {object}        ExportRenderLayers__Config block
    //   imageExportConfig      {object}        ImageExport__Config block
    //   lineworkConfig         {object}        models.RenderConfig__Linework block
    //   showToast              {Function|null}
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__InitializeDevControls(options) {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return;                       // <-- Developer system; never on a deployment

        const config = options.config || {};
        if (config.ExportRenderLayers__Config__Enabled === false) return;        // <-- AppConfig owns the feature flag

        const menuItem  = document.getElementById(Na__ErlUi__ITEM_ID);
        const toggleBtn = document.getElementById(Na__ErlUi__TOGGLE_ID);
        const panel     = document.getElementById(Na__ErlUi__PANEL_ID);
        if (!menuItem || !panel) return;                                         // <-- Guard: Dev menu shell is absent

        if (!Na__ErlUi__ValidateImageConfig(options.imageExportConfig)) {
            console.warn('[ExportRenderLayers] ImageExport__Config is missing aspect ratios or resolutions; panel not built.');
            return;
        }


        // CONTEXT | Store the injected references (pipeline stays lazy)
        // ------------------------------------------------------------
        Na__ErlUi__Renderer       = options.renderer;
        Na__ErlUi__Scene          = options.scene;
        Na__ErlUi__Camera         = options.camera;
        Na__ErlUi__Controls       = options.controls;
        Na__ErlUi__ModelRoot      = options.modelRoot;
        Na__ErlUi__GetPipeline    = options.getRenderPipelineState;
        Na__ErlUi__Config         = config;
        Na__ErlUi__ImageConfig    = options.imageExportConfig;
        Na__ErlUi__LineworkConfig = options.lineworkConfig || null;
        Na__ErlUi__ShowToast      = options.showToast || null;


        // SESSION DEFAULTS | Selection and framing from AppConfig
        // ------------------------------------------------------------
        Na__ErlState__SetSelectedPassIds(Na__ExportRenderLayers__Registry__GetDefaultSelection(config));

        const ratioCount = Na__ErlUi__ImageConfig[Na__ErlUi__IMAGE_EXPORT_KEYS.aspectRatios].length;
        const resCount   = Na__ErlUi__ImageConfig[Na__ErlUi__IMAGE_EXPORT_KEYS.resolutions].length;

        Na__ErlState__SetAspectIndex(Na__ErlUi__ClampIndex(
            Na__ErlUi__ImageConfig[Na__ErlUi__IMAGE_EXPORT_KEYS.defaultAspectIndex], ratioCount
        ));
        Na__ErlState__SetResolutionIndex(Na__ErlUi__ClampIndex(
            Na__ErlUi__ImageConfig[Na__ErlUi__IMAGE_EXPORT_KEYS.defaultResolutionIndex], resCount
        ));


        // PREVIEW | Overlay controller plus the automatic invalidation wiring
        // ------------------------------------------------------------
        Na__ErlUi__PreviewCtrl = Na__ExportRenderLayers__Preview__Create({
            renderer  : Na__ErlUi__Renderer,
            controls  : Na__ErlUi__Controls,
            config,
            onCleared : () => {
                Na__ErlState__SetActivePreviewPassId(null);
                Na__ErlUi__RefreshPreviewButtons();
            }
        });


        // PANEL | Build every section from data
        // ------------------------------------------------------------
        Na__ErlUi__BuildHelp(document.getElementById(Na__ErlUi__HELP_ID));
        Na__ErlUi__BuildOutputControls(document.getElementById(Na__ErlUi__OUTPUT_ID));
        Na__ErlUi__BuildPassList(document.getElementById(Na__ErlUi__PASS_LIST_ID));
        Na__ErlUi__BuildCategoryList(document.getElementById(Na__ErlUi__CATEGORIES_ID));

        Na__ErlUi__StatusElement   = document.getElementById(Na__ErlUi__STATUS_ID);
        Na__ErlUi__RetainedElement = document.getElementById(Na__ErlUi__RETAINED_ID);
        Na__ErlUi__ExportButton  = document.getElementById(Na__ErlUi__EXPORT_ID);
        Na__ErlUi__CancelButton  = document.getElementById(Na__ErlUi__CANCEL_ID);

        const returnButton = document.getElementById(Na__ErlUi__RETURN_ID);


        // WIRE | Submenu open and close
        // ------------------------------------------------------------
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isOpen = panel.classList.contains('is-open');
                panel.classList.toggle('is-open', !isOpen);
                toggleBtn.setAttribute('aria-expanded', String(!isOpen));

                if (!isOpen) {
                    Na__ErlUi__BuildCategoryList(document.getElementById(Na__ErlUi__CATEGORIES_ID)); // <-- Categories appear after load
                } else {
                    Na__ErlUi__ClearPreview('panel closed');
                }
            });
        }


        // WIRE | Return to Beauty, Export and Cancel
        // ------------------------------------------------------------
        if (returnButton) {
            returnButton.addEventListener('click', () => {
                Na__ErlUi__ClearPreview('return to beauty');
                Na__ErlUi__SetStatus('Returned to the live beauty viewport.', false);
            });
        }

        if (Na__ErlUi__ExportButton) {
            Na__ErlUi__ExportButton.addEventListener('click', Na__ErlUi__HandleExportClick);
        }

        if (Na__ErlUi__CancelButton) {
            Na__ErlUi__CancelButton.addEventListener('click', () => {
                Na__ErlState__RequestCancel();
                Na__ErlUi__SetStatus('Cancelling after the current tile...', false);
            });
        }

        Na__ErlUi__SetCancelVisible(false);
        Na__ErlUi__RefreshExportButton();
        Na__ErlUi__RefreshPreviewButtons();

        menuItem.style.display = '';                                             // <-- Reveal the dev section

        console.log('[ValeVision3D] Export Render Layers dev controls initialized.');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Export Render Layers Public API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__InitializeDevControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
