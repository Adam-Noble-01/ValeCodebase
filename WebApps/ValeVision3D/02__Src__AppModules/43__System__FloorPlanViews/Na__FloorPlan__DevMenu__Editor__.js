// =============================================================================
// VALEVISION3D - FLOOR PLAN VIEWS - DEV MENU EDITOR
// =============================================================================
//
// FILE       : Na__FloorPlan__DevMenu__Editor__.js
// NAMESPACE  : Na__FpDev
// MODULE     : Floor Plan Views - Dev Menu Editor
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Localhost-only authoring UI for creating and tuning floor plans
// CREATED    : 31-Aug-2026
//
// DESCRIPTION:
// - The developer-facing half of the feature: add a floor plan, name it, set
//   its floor level, preview the cut, mark it up, style it, and save.
// - The FLOOR LEVEL slider is the datum, not the cut. The cut is taken a
//   configurable distance above it (1200mm by default, the standard
//   architectural cut height), which is why a plan left at datum 0 still
//   slices the walls rather than skimming the slab. Both numbers are shown so
//   the relationship is never a mystery.
// - Dragging the slider while previewing recuts live, throttled by the cut
//   engine, with an exact unthrottled pass on release. Nothing is written to
//   R2 until Save is pressed.
// - ADD GROUND FLOOR PLAN is the one-click start most jobs need: a plan at
//   datum 0 with the standard cut. SEED FROM MODEL STOREYS reads the storeys
//   the app detects from GLB names and measures each one's floor level from
//   its own geometry; a model without named storeys says so.
// - Save writes the drawings block and the scene links through the one
//   drawings save path (Na__DrawView__ProjectData__), which merges both into
//   the live project.json and hands it to the R2-first save utility.
//
// INTEGRATION:
// - Initialized from index.html alongside the other localhost-only dev tools.
// - Drives Na__FloorPlan__ModeController__ for preview, annotation and styles.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__DevMenu__Editor__.js
// - Source version: 1.0.0 (31-Aug-2026)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2)
// - Parity        : adapted
// - Divergences   :
//   - Records read from the drawings block; Save goes through Na__DrawData__Save (D08) instead of
//     Na__CfApi__MergeAndSaveKeys.
//   - Live cut through Na__DrawView__SectionAdapter__ (D07).
//   - Thumbnails upload through Na__PresentationMode__Thumbnail__CaptureAndUpload and the R2 asset route (D36).
//   - Add Ground Floor Plan quick action (D11); the storey seed degrades to the configured message.
//   - Style and exclusion handlers re-apply the presets to the plan on screen.
//   - Delete prompts use Na__AppUtils__ConfirmDialog__Show rather than window.confirm.
// - Back-port     : Add Ground Floor Plan, the confirm dialog.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Bake before save (port Phase 4)
// - Save bakes every drawing's projected linework asset that is missing or stale before the project save.
//
// 09-Sep-2026 - Version 1.1.0
// - Ported to ValeVision3D: drawings block save path, section adapter, R2
//   asset thumbnails, Ground Floor Plan quick action, style handlers.
//
// 31-Aug-2026 - Version 1.0.0
// - Initial implementation for the Floor Plan Builder.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js, Confirm Dialog and Project Code
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { Na__AppUtils__ConfirmDialog__Show } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Presentation Scene Config and Storey Detection
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__GetActiveConfig,
        Na__PresentationMode__ProjectJson__BroadcastScenesChanged
    } from '../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    import {
        Na__StoreySystem__GetState,
        Na__StoreySystem__GetStoreyDisplayName
    } from '../26__System__ToggleModelElements/3dObject__ViewBuildingStoreys__SystemLogic__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Drawings Block Save Path and Drawing View Core
    // ------------------------------------------------------------
    // @delegate: ../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js
    // @delegate: ../42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js
    // @delegate: ../42__System__DrawingViewCore/Na__DrawView__SceneLinkRow__.js
    // ------------------------------------------------------------
    import {
        Na__DrawData__Save,
        Na__DrawData__GetProjectCode,
        Na__DrawData__CHANGED_EVENT
    } from '../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    import { Na__DrawView__SectionAdapter__SetPlaneHeightMm } from '../42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js';
    import { Na__DrawSceneRow__Build } from '../42__System__DrawingViewCore/Na__DrawView__SceneLinkRow__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Projected Linework Baking (port Phase 4)
    // ------------------------------------------------------------
    // @delegate: ../50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js
    // ------------------------------------------------------------
    import { Na__PlStore__BakeBeforeSave } from '../50__System__ProjectedLinework/Na__ProjectedLinework__Persistence__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Floor Plan Data, Config, Scene Link and Mode
    // ------------------------------------------------------------
    // @delegate: ./Na__FloorPlan__ProjectJson__Data__.js
    // @delegate: ./Na__FloorPlan__Framing__.js
    // @delegate: ./Na__FloorPlan__DevMenu__RowBuilders__.js
    // @delegate: ./Na__FloorPlan__SceneLink__.js
    // @delegate: ./Na__FloorPlan__ModeController__.js
    // ------------------------------------------------------------
    import {
        Na__FpData__GetClientDimensionsEnabled,
        Na__FpData__SetClientDimensionsEnabled,
        Na__FpData__GetFloorPlans,
        Na__FpData__GetCutHeightMm,
        Na__FpData__CreatePlan,
        Na__FpData__DeletePlan,
        Na__FpData__FindSceneForPlan
    } from './Na__FloorPlan__ProjectJson__Data__.js';
    import {
        Na__FpCfg__GetLabel,
        Na__FpCfg__FormatLabel,
        Na__FpCfg__GetSceneGroupTarget
    } from './Na__FloorPlan__ConfigState__.js';
    import {
        Na__FpFrame__MeasureModel
    } from './Na__FloorPlan__Framing__.js';
    import {
        Na__FpRow__BuildButton,
        Na__FpRow__BuildPlanRow
    } from './Na__FloorPlan__DevMenu__RowBuilders__.js';
    import {
        Na__FpLink__CreateSceneForPlan,
        Na__FpLink__RemoveSceneForPlan,
        Na__FpLink__SyncSceneCamera
    } from './Na__FloorPlan__SceneLink__.js';
    import { Na__DrawRename__RenameFloorPlan } from '../42__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js';
    import {
        Na__DrawFold__Wrap,
        Na__DrawFold__SetOpenId,
        Na__DrawFold__CloseIfOpen
    } from '../42__System__DrawingViewCore/Na__DrawView__RowAccordion__.js';
    import {
        Na__FloorPlanMode__EnterPlan,
        Na__FloorPlanMode__ExitPlan,
        Na__FloorPlanMode__SetEditMode,
        Na__FloorPlanMode__IsEditMode,
        Na__FloorPlanMode__ApplyStyles,
        Na__FloorPlanMode__IsActive,
        Na__FloorPlanMode__GetActivePlan,
        Na__FloorPlanMode__StoreActiveFraming,
        Na__FpMode__CHANGED_EVENT
    } from './Na__FloorPlan__ModeController__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Client Measuring Grant and Thumbnail Capture
    // ------------------------------------------------------------
    // @delegate: ../45__System__PlanDimensions/Na__PlanDimensions__ClientMode__.js
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js
    // ------------------------------------------------------------
    import { Na__PlanDimClient__SetAllowed } from '../45__System__PlanDimensions/Na__PlanDimensions__ClientMode__.js';
    import { Na__PlanDim__GetLabel } from '../45__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js';
    import { Na__PresentationMode__Thumbnail__CaptureAndUpload } from '../21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Identifiers
    // ------------------------------------------------------------
    const Na__FpDev__PANEL_ID  = 'naFloorPlanDevPanel';
    const Na__FpDev__ITEM_ID   = 'naFloorPlanDevItem';
    const Na__FpDev__TOGGLE_ID = 'naFloorPlanDevToggle';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Section Cut Plane Id Prefix (mirrors the controller)
    // ------------------------------------------------------------
    const Na__FpDev__CUT_ID_PREFIX = 'FloorPlanCut__';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Host Context
    // ------------------------------------------------------------
    let Na__FpDev__Panel       = null;
    let Na__FpDev__ModelRoot   = null;
    let Na__FpDev__Camera      = null;
    let Na__FpDev__ShowToast   = null;
    let Na__FpDev__Initialized = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Live Presentation Scene Config (scene links live here)
    // ------------------------------------------------------------
    function Na__FpDev__GetConfig() {
        return Na__PresentationMode__ProjectJson__GetActiveConfig();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show a Toast if the Host Supplied One
    // ------------------------------------------------------------
    function Na__FpDev__Toast(message, isError) {
        if (typeof Na__FpDev__ShowToast === 'function') Na__FpDev__ShowToast(message, isError === true);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Field of View of the Live Perspective Camera
    // ------------------------------------------------------------
    function Na__FpDev__Fov() {
        return Na__FpDev__Camera ? Na__FpDev__Camera.fov : 30;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Measure the Loaded Model for Camera Placement
    // ------------------------------------------------------------
    function Na__FpDev__Measure() {
        return Na__FpFrame__MeasureModel(Na__FpDev__ModelRoot, Na__FpDev__Camera);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Measure Each Detected Storey's Floor Level
    // ------------------------------------------------------------
    // The storey system knows WHICH models belong to a storey but not how high
    // it sits, so the floor level is taken from the bottom of that storey's own
    // geometry. That is the datum a plan of it should use.
    // ------------------------------------------------------------
    function Na__FpDev__MeasureStoreys() {
        const state = Na__StoreySystem__GetState();
        if (!state || !state.hasStoreys || !Array.isArray(state.order)) return [];

        const measured = [];
        for (let i = 0; i < state.order.length; i++) {
            const key    = state.order[i];
            const models = state.map[key];
            if (!Array.isArray(models) || models.length === 0) continue;

            const box = new THREE.Box3();
            for (let m = 0; m < models.length; m++) box.expandByObject(models[m]);
            if (box.isEmpty()) continue;

            measured.push({
                key          : key,
                name         : Na__StoreySystem__GetStoreyDisplayName(key),
                floorDatumMm : Math.round(box.min.y * 1000)                       // <-- Bottom of the storey's geometry
            });
        }
        return measured;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push a Plan's Live Cut Height to the Cut Engine
    // ------------------------------------------------------------
    function Na__FpDev__PushLiveCut(plan, liveDrag) {
        if (!Na__FloorPlanMode__IsActive()) return;
        if (Na__FloorPlanMode__GetActivePlan() !== plan) return;
        Na__DrawView__SectionAdapter__SetPlaneHeightMm(
            Na__FpDev__CUT_ID_PREFIX + plan.FloorPlan__Id,
            Na__FpData__GetCutHeightMm(plan),
            liveDrag === true
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Capture the Plan on Screen and File It as Its Scene Thumbnail
    // ------------------------------------------------------------
    // The plan MUST be previewing for this to mean anything - the capture is
    // of the viewport, so from 3D it would file a picture of the model as the
    // plan's card. The button is disabled in that state; this is the second
    // guard, because a disabled button is a UI fact rather than a rule.
    // ------------------------------------------------------------
    async function Na__FpDev__SaveThumbnail(plan) {
        if (!Na__FloorPlanMode__IsActive() || Na__FloorPlanMode__GetActivePlan() !== plan) {
            Na__FpDev__Toast('Preview the plan before saving its thumbnail.', true);
            return false;
        }

        const config = Na__FpDev__GetConfig();
        const scene  = config ? Na__FpData__FindSceneForPlan(config, plan) : null;
        if (!scene) {
            Na__FpDev__Toast('This plan has no scene to attach a thumbnail to.', true);
            return false;
        }

        // The thumbnail IS the framing. Recording it here means the card and
        // the view it opens at can never disagree.
        Na__FloorPlanMode__StoreActiveFraming();

        try {
            const result = await Na__PresentationMode__Thumbnail__CaptureAndUpload(
                scene.PresentationMode__Scene__Id,
                Na__DrawData__GetProjectCode(),
                Na__FpDev__ShowToast
            );
            if (!result || !result.ok) {
                Na__FpDev__Toast('Thumbnail upload failed: ' + (result ? result.error : 'no result'), true);
                return false;
            }
            scene.PresentationMode__Scene__ThumbnailUrl = result.relUrl;         // <-- Saved with the next Save Floor Plans
            Na__PresentationMode__ProjectJson__BroadcastScenesChanged();         // <-- The card picks the new image up
            Na__FpDev__Toast('Thumbnail saved to R2: ' + result.relUrl);
            return true;
        } catch (error) {
            console.error('[ValeVision3D] Floor plan thumbnail error:', error);
            Na__FpDev__Toast('Thumbnail error - see console.', true);
            return false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Row Handler Wiring
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Plan Row With Its Handlers Bound
    // ------------------------------------------------------------
    // The row builder is purely presentational, so everything that actually
    // changes state is assembled here and handed to it.
    // ------------------------------------------------------------
    function Na__FpDev__BuildRow(plan) {
        const config   = Na__FpDev__GetConfig();
        const isActive = Na__FloorPlanMode__IsActive() && Na__FloorPlanMode__GetActivePlan() === plan;

        return Na__FpRow__BuildPlanRow(plan, {
            isActive   : isActive,
            isEditMode : isActive && Na__FloorPlanMode__IsEditMode(),

            // A name is held by the record, its scene card and every sheet
            // viewport's snapshot fingerprint. One path writes all three,
            // saves the document once and says so.
            onRename : (nextName) => Na__DrawRename__RenameFloorPlan(plan, nextName, Na__FpDev__ShowToast),

            onDatumLive   : () => Na__FpDev__PushLiveCut(plan, true),
            onDatumCommit : () => {
                Na__FpDev__PushLiveCut(plan, false);
                if (config) Na__FpLink__SyncSceneCamera(config, plan, Na__FpDev__Measure(), Na__FpDev__Fov());
            },

            onOffsetChange : () => {
                Na__FpDev__PushLiveCut(plan, false);
                if (config) Na__FpLink__SyncSceneCamera(config, plan, Na__FpDev__Measure(), Na__FpDev__Fov());
            },

            // Depth changes the PLANE SET, not just a constant, so the cut has
            // to be rebuilt rather than nudged.
            onDepthChange : () => {
                if (isActive) Na__FloorPlanMode__EnterPlan(plan);
            },

            // Styles re-apply live; exclusions only matter to the projection
            // stage, which reads them when it next runs.
            onStyleChange      : () => { if (isActive) Na__FloorPlanMode__ApplyStyles(plan); },
            onExclusionsChange : () => {},

            onPreviewToggle : () => {
                if (isActive) {
                    Na__FloorPlanMode__ExitPlan(null);
                } else {
                    Na__DrawFold__SetOpenId(plan.FloorPlan__Id);                 // <-- The drawing on screen is the row left unfolded
                    Na__FloorPlanMode__EnterPlan(plan);
                }
            },
            onAnnotate  : () => Na__FloorPlanMode__SetEditMode(!Na__FloorPlanMode__IsEditMode()),
            onThumbnail : () => Na__FpDev__SaveThumbnail(plan),
            onDelete    : () => Na__FpDev__DeletePlan(plan)
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Panel Mutations
// -----------------------------------------------------------------------------

    // FUNCTION | Add One Floor Plan and Its Scene
    // ------------------------------------------------------------
    // The record goes into the drawings block; the card goes into the
    // presentation block. A project with no presentation block cannot take
    // the card yet, so the plan is still created and the panel says why.
    // ------------------------------------------------------------
    function Na__FpDev__AddPlan(options) {
        const plan = Na__FpData__CreatePlan(null, options || {});
        if (!plan) return null;

        const config = Na__FpDev__GetConfig();
        if (config) {
            Na__FpLink__CreateSceneForPlan(config, plan, Na__FpDev__Measure(), Na__FpDev__Fov());
            Na__PresentationMode__ProjectJson__BroadcastScenesChanged();         // <-- Or the new card stays invisible all session
        } else {
            Na__FpDev__Toast('Plan created. Add a Presentation scene first so it can have a carousel card.', true);
        }

        Na__DrawFold__SetOpenId(plan.FloorPlan__Id);                             // <-- Open the one just made, and fold whatever was open
        Na__FpDev__Render();
        return plan;
    }
    // ------------------------------------------------------------


    // FUNCTION | Add the Standard Ground Floor Plan (datum 0, standard cut)
    // ------------------------------------------------------------
    function Na__FpDev__AddGroundFloorPlan() {
        if (!Na__FpDev__Measure()) {
            Na__FpDev__Toast(Na__FpCfg__GetLabel('NoModelMessage', 'Load a model before adding floor plans.'), true);
            return null;
        }
        return Na__FpDev__AddPlan({
            name         : Na__FpCfg__GetLabel('GroundFloorPlanName', 'Ground Floor Plan'),
            floorDatumMm : 0
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Create One Plan Per Detected Model Storey
    // ------------------------------------------------------------
    function Na__FpDev__SeedFromStoreys() {
        const storeys = Na__FpDev__MeasureStoreys();
        if (storeys.length === 0) {
            Na__FpDev__Toast(Na__FpCfg__GetLabel('NoStoreysMessage', 'No named storeys detected in this model.'), true);
            return 0;
        }

        for (let i = 0; i < storeys.length; i++) {
            Na__FpDev__AddPlan({
                name         : storeys[i].name,
                floorDatumMm : storeys[i].floorDatumMm
            });
        }
        // A WHOLE SET AT ONCE MEANS NO ONE OF THEM IS "THE" ONE. Each Add
        // opened its own row, so the last would be left open arbitrarily; fold
        // the lot and let the choice be made deliberately.
        Na__DrawFold__SetOpenId(null);                                           // <-- Applies to the rows already on screen; no rebuild needed

        Na__FpDev__Toast('Created ' + storeys.length + ' floor plan(s) from the model storeys.');
        return storeys.length;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a Floor Plan, Its Scene and Its Markup
    // ------------------------------------------------------------
    async function Na__FpDev__DeletePlan(plan) {
        const ok = await Na__AppUtils__ConfirmDialog__Show({
            title         : 'Delete Floor Plan?',
            message       : Na__FpCfg__FormatLabel(
                'DeletePlanPrompt',
                'Delete the floor plan "{name}"? Its scene and annotations go with it.',
                { name: plan.FloorPlan__Name }
            ),
            confirmLabel  : 'Delete',
            isDestructive : true
        });
        if (!ok) return false;

        if (Na__FloorPlanMode__IsActive() && Na__FloorPlanMode__GetActivePlan() === plan) {
            Na__FloorPlanMode__ExitPlan(null);                                   // <-- Never leave a deleted plan on screen
        }

        Na__DrawFold__CloseIfOpen(plan.FloorPlan__Id);                           // <-- Never leave the slot pointing at a deleted record

        const orphanedSceneId = Na__FpData__DeletePlan(null, plan.FloorPlan__Id);
        const config          = Na__FpDev__GetConfig();
        if (orphanedSceneId && config) Na__FpLink__RemoveSceneForPlan(config, orphanedSceneId);

        Na__PresentationMode__ProjectJson__BroadcastScenesChanged();             // <-- Drop the card with the plan
        Na__FpDev__Render();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Save the Drawings Block and the Scene Links to R2
    // ------------------------------------------------------------
    async function Na__FpDev__Save() {
        Na__FloorPlanMode__StoreActiveFraming();                                 // <-- Save what is on screen, not the last gesture

        await Na__PlStore__BakeBeforeSave(Na__FpDev__ShowToast);                       // <-- Linework assets first, so the records carry their references (D20)

        const saved = await Na__DrawData__Save(Na__FpDev__ShowToast);
        if (saved) {
            Na__FpDev__Toast(Na__FpCfg__GetLabel('SavedMessage', 'Floor plans saved to R2.'));
            return true;
        }
        Na__FpDev__Toast(Na__FpCfg__GetLabel('SaveFailedMessage', 'Floor plan save failed - see console.'), true);
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Panel Render
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build the Client Measuring Toggle
    // ------------------------------------------------------------
    // The gate for the live app. Off unless switched on, and stored in the
    // drawings block so it rides the same save as everything else in this
    // panel - there is no separate save to remember.
    // ------------------------------------------------------------
    function Na__FpDev__BuildClientDimensionsToggle() {
        const row = document.createElement('div');
        row.className = 'na-dropdown-menu__panel-row na-dropdown-menu__panel-row--toggle';

        const label = document.createElement('span');
        label.className   = 'na-dropdown-menu__panel-title';
        label.textContent = Na__PlanDim__GetLabel('ClientToggleLabel', 'Let clients measure');

        const check = document.createElement('input');
        check.type      = 'checkbox';
        check.className = 'na-pm-dev__checkbox';
        check.checked   = Na__FpData__GetClientDimensionsEnabled();
        check.title     = Na__PlanDim__GetLabel(
            'ClientToggleHint',
            'Adds a red measuring tool to the live app for this project.'
        );

        check.addEventListener('change', () => {
            Na__FpData__SetClientDimensionsEnabled(null, check.checked);
            Na__PlanDimClient__SetAllowed(check.checked);                        // <-- Applies without a reload
            Na__FpDev__Render();
        });

        row.appendChild(label);
        row.appendChild(check);
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Explanatory Note Under the Toggle
    // ------------------------------------------------------------
    function Na__FpDev__BuildClientDimensionsNote() {
        const note = document.createElement('p');
        note.className   = 'na-fp-dev__empty';
        note.textContent = Na__PlanDim__GetLabel(
            'ClientToggleHint',
            'Adds a red measuring tool to the live app for this project.'
        );
        return note;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the Carousel Card Status and Action for One Plan
    // ------------------------------------------------------------
    // Creating the card is the same call the Add path makes, so a plan that
    // lost its card - or never had one, because it predates the link - is
    // recovered rather than needing to be deleted and rebuilt.
    // ------------------------------------------------------------
    function Na__FpDev__BuildSceneLinkRow(plan) {
        const config = Na__FpDev__GetConfig();

        return Na__DrawSceneRow__Build({
            scene       : config ? Na__FpData__FindSceneForPlan(config, plan) : null,
            groupName   : Na__FpCfg__GetSceneGroupTarget().groupName,
            drawingWord : 'plan',
            onCreate    : () => {
                if (!config) {
                    Na__FpDev__Toast('No presentation scene config loaded.', true);
                    return;
                }
                Na__FpLink__CreateSceneForPlan(config, plan, Na__FpDev__Measure(), Na__FpDev__Fov());
                Na__PresentationMode__ProjectJson__BroadcastScenesChanged();
                Na__FpDev__Toast('Added "' + plan.FloorPlan__Name + '" to the scene carousel.');
                Na__FpDev__Render();
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebuild the Whole Floor Plan Panel
    // ------------------------------------------------------------
    function Na__FpDev__Render() {
        if (!Na__FpDev__Panel) return;
        Na__FpDev__Panel.innerHTML = '';

        const title = document.createElement('div');
        title.className   = 'na-dropdown-menu__panel-title';
        title.textContent = Na__FpCfg__GetLabel('SectionTitle', 'Floor Plans');
        Na__FpDev__Panel.appendChild(title);

        const plans = Na__FpData__GetFloorPlans();

        // ONE ROW OPEN AT A TIME. The scene link row goes into the fold's body
        // rather than onto the card, or it would stay visible under a folded
        // header. The open slot is shared with the Elevations panel.
        for (let i = 0; i < plans.length; i++) {
            const plan    = plans[i];
            const planRow = Na__FpDev__BuildRow(plan);
            const fold    = Na__DrawFold__Wrap(planRow, {
                id    : plan.FloorPlan__Id,
                title : plan.FloorPlan__Name
            });
            fold.body.appendChild(Na__FpDev__BuildSceneLinkRow(plan));
            Na__FpDev__Panel.appendChild(planRow);
        }

        if (plans.length === 0) {
            const empty = document.createElement('p');
            empty.className   = 'na-fp-dev__empty';
            empty.textContent = 'No floor plans yet. Add the ground floor, add one by hand, or seed them from the model storeys.';
            Na__FpDev__Panel.appendChild(empty);
        }

        const actions = document.createElement('div');
        actions.className = 'na-pm-dev__actions';

        actions.appendChild(Na__FpRow__BuildButton(
            Na__FpCfg__GetLabel('GroundFloorPlanLabel', '+ Add Ground Floor Plan'), 'na-pm-dev__btn--primary',
            Na__FpDev__AddGroundFloorPlan
        ));
        actions.appendChild(Na__FpRow__BuildButton(
            Na__FpCfg__GetLabel('AddPlanLabel', '+ Add Floor Plan'), '',
            () => {
                if (!Na__FpDev__Measure()) {
                    Na__FpDev__Toast(Na__FpCfg__GetLabel('NoModelMessage', 'Load a model before adding floor plans.'), true);
                    return;
                }
                Na__FpDev__AddPlan({});
            }
        ));
        actions.appendChild(Na__FpRow__BuildButton(
            Na__FpCfg__GetLabel('SeedFromStoreysLabel', 'Seed From Model Storeys'), '',
            Na__FpDev__SeedFromStoreys
        ));
        Na__FpDev__Panel.appendChild(actions);

        // CLIENT MEASURING | Sits with the plan tools it governs, and above
        // Save because it is saved by the same button.
        const clientTitle = document.createElement('div');
        clientTitle.className   = 'na-dropdown-menu__panel-title';
        clientTitle.textContent = 'Live App';
        Na__FpDev__Panel.appendChild(clientTitle);
        Na__FpDev__Panel.appendChild(Na__FpDev__BuildClientDimensionsToggle());
        Na__FpDev__Panel.appendChild(Na__FpDev__BuildClientDimensionsNote());

        const saveActions = document.createElement('div');
        saveActions.className = 'na-pm-dev__actions';
        saveActions.appendChild(Na__FpRow__BuildButton(
            Na__FpCfg__GetLabel('SaveLabel', 'Save Floor Plans'),
            'na-pm-dev__btn--primary',
            Na__FpDev__Save
        ));
        Na__FpDev__Panel.appendChild(saveActions);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Localhost-Only Floor Plan Editor
    // ------------------------------------------------------------
    // context: { modelRoot, camera, showToast }
    // Mirrors the Presentation Scenes section: the wrapper is revealed, the
    // toggle opens the panel, and the panel rebuilds on every open so it can
    // never show data from a previous project.
    // ------------------------------------------------------------
    function Na__FloorPlan__DevMenu__Initialize(context) {
        const menuItem = document.getElementById(Na__FpDev__ITEM_ID);
        const toggle   = document.getElementById(Na__FpDev__TOGGLE_ID);
        const panel    = document.getElementById(Na__FpDev__PANEL_ID);
        if (!menuItem || !toggle || !panel) return false;                        // <-- Markup absent: nothing to mount into

        Na__FpDev__Panel       = panel;
        Na__FpDev__ModelRoot   = (context && context.modelRoot) || null;
        Na__FpDev__Camera      = (context && context.camera)    || null;
        Na__FpDev__ShowToast   = (context && context.showToast) || null;
        Na__FpDev__Initialized = true;

        menuItem.style.display = '';                                             // <-- Reveal alongside the other dev tools

        toggle.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);
            toggle.setAttribute('aria-expanded', String(!isOpen));
            if (!isOpen) {
                // WHAT IS ON SCREEN IS WHAT IS UNFOLDED. Coming into the panel
                // with a drawing previewed opens that row and no other; with
                // none previewed the panel starts fully folded.
                const active = Na__FloorPlanMode__IsActive() ? Na__FloorPlanMode__GetActivePlan() : null;
                Na__DrawFold__SetOpenId(active ? active.FloorPlan__Id : null);
                Na__FpDev__Render();                                             // <-- Rebuild on each open so data is fresh
            }
        });

        // Preview and Annotate button states are derived from mode, so the
        // panel refreshes whenever the controller reports a change.
        window.addEventListener(Na__FpMode__CHANGED_EVENT, () => {
            if (panel.classList.contains('is-open')) Na__FpDev__Render();
        });

        // A project switch during the same session replaces the scene config
        // and the drawings block.
        window.addEventListener('na-presentation-mode-scenes-loaded', () => {
            if (panel.classList.contains('is-open')) Na__FpDev__Render();
        });
        window.addEventListener(Na__DrawData__CHANGED_EVENT, () => {
            if (panel.classList.contains('is-open')) Na__FpDev__Render();
        });

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Point the Editor at a Different Model Root
    // ------------------------------------------------------------
    function Na__FloorPlan__DevMenu__SetModelRoot(modelRoot) {
        Na__FpDev__ModelRoot = modelRoot || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Force a Panel Refresh
    // ------------------------------------------------------------
    function Na__FloorPlan__DevMenu__Refresh() {
        if (Na__FpDev__Initialized) Na__FpDev__Render();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Floor Plan Dev Menu Editor API
    // ------------------------------------------------------------
    export {
        Na__FloorPlan__DevMenu__Initialize,
        Na__FloorPlan__DevMenu__SetModelRoot,
        Na__FloorPlan__DevMenu__Refresh
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
