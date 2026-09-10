// =============================================================================
// VALEVISION3D - DRAWING VIEW CORE - PROJECT DATA
// =============================================================================
//
// FILE       : Na__DrawView__ProjectData__.js
// NAMESPACE  : Na__DrawData
// MODULE     : Drawing View Core - Project Data
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Own the LayoutEditor__DrawingsData block and the one save path for drawings
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - Every drawing ValeVision authors - floor plans, elevations, sections and
//   Layout Editor sheets - is stored in ONE top-level project.json block,
//   LayoutEditor__DrawingsData, with three-stage keys. The SketchUp cloud sync
//   only ever patches its own keys, so this block survives a re-sync untouched
//   and needs no entry on any dev-owned key list.
// - Scene-side facts (which scene shows which drawing, which group it sits
//   in) stay inside PresentationMode__SavedCameraScenes, exactly where the
//   scene groups live. This module owns the link-key checks so the drawing
//   systems never have to import each other's data modules to answer "is
//   this a drawing scene".
// - Loaded once per project from the loading sequence event. An absent block
//   becomes an empty skeleton in memory and is only written on the first save.
// - ONE WRITER. Save fetches the live project.json, merges the presentation
//   block (scene links and groups), the cross section bindings (a section
//   drawing's cut) and this block, and hands the document to the shared
//   R2-first save utility. The Floor Plans, Elevations and Layout Editor
//   panels all call this and nothing else writes drawing data.
//
// INTEGRATION:
// - Na__AppFlow__LoadingSequence.js dispatches na-layouteditor-drawingsdata-loaded.
// - Na__FloorPlan__ProjectJson__Data__ and its elevation counterpart read
//   their arrays through GetBlock.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none. TrueVision nests floor plans inside the presentation block and saves them
//                   through Na__CfApi__MergeAndSaveKeys; ValeVision keeps a separate drawings block (plan D08).
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : candidate once TrueVision adopts a separate drawings block.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 2.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Presentation Scene Config (scene links ride in it)
    // ------------------------------------------------------------
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__GetActiveConfig,
        Na__PresentationMode__ProjectJson__GetActiveProjectCode
    } from '../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Project Utilities and R2-First Save
    // ------------------------------------------------------------
    // @delegate: ../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js
    // ------------------------------------------------------------
    import { Na__AppUtils__GetProjectCodeFromUrl } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    import { Na__AppUtils__R2SaveProjectJson } from '../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Cross Section Scene Bindings (a section drawing's cut)
    // ------------------------------------------------------------
    // @delegate: ../41__System__CrossSectionView/Na__CrossSectionView__SceneData.js
    // ------------------------------------------------------------
    import { Na__SectSceneData__GetProjectBlock } from '../41__System__CrossSectionView/Na__CrossSectionView__SceneData.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Block and Key Names
    // ------------------------------------------------------------
    const Na__DrawData__BLOCK_KEY        = 'LayoutEditor__DrawingsData';
    const Na__DrawData__DESCRIPTION_KEY  = 'LayoutEditor__DrawingsData__Description';
    const Na__DrawData__VERSION_KEY      = 'LayoutEditor__DrawingsData__Version';
    const Na__DrawData__CLIENT_DIMS_KEY  = 'LayoutEditor__DrawingsData__ClientDimensionsEnabled';
    const Na__DrawData__FLOOR_PLANS_KEY  = 'LayoutEditor__DrawingsData__FloorPlans';
    const Na__DrawData__ELEVATIONS_KEY   = 'LayoutEditor__DrawingsData__Elevations';
    const Na__DrawData__SHEETS_KEY       = 'LayoutEditor__DrawingsData__Sheets';
    const Na__DrawData__PRESENTATION_KEY = 'PresentationMode__SavedCameraScenes';
    const Na__DrawData__CROSSSECTION_KEY = 'CrossSection__SceneData';
    const Na__DrawData__VERSION          = 1;
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Scene Link Keys (scene side, presentation block)
    // ------------------------------------------------------------
    const Na__DrawData__SCENE_PLAN_ID_KEY      = 'PresentationMode__Scene__FloorPlanId';
    const Na__DrawData__SCENE_ELEVATION_ID_KEY = 'PresentationMode__Scene__ElevationId';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Events
    // ------------------------------------------------------------
    const Na__DrawData__LOADED_EVENT  = 'na-layouteditor-drawingsdata-loaded';   // <-- Loading sequence hands the raw block over
    const Na__DrawData__CHANGED_EVENT = 'na-layouteditor-drawingsdata-changed';  // <-- Raised after a load or a save
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Block Description Written on First Save
    // ------------------------------------------------------------
    const Na__DrawData__DESCRIPTION = 'ValeVision-owned drawing definitions: floor plans, elevations and sections with their markup, and Layout Editor sheets. Distances are integer millimetres. The SketchUp cloud sync never writes this key.';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | The Live Block and Its Project
    // ------------------------------------------------------------
    let Na__DrawData__Block       = null;    // <-- Live LayoutEditor__DrawingsData object (skeleton until a project supplies one)
    let Na__DrawData__ProjectCode = null;    // <-- Project code the block was loaded for
    let Na__DrawData__Initialized = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Block Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build an Empty Block
    // ------------------------------------------------------------
    function Na__DrawData__BuildSkeleton() {
        const block = {};
        block[Na__DrawData__DESCRIPTION_KEY] = Na__DrawData__DESCRIPTION;
        block[Na__DrawData__VERSION_KEY]     = Na__DrawData__VERSION;
        block[Na__DrawData__CLIENT_DIMS_KEY] = false;
        block[Na__DrawData__FLOOR_PLANS_KEY] = [];
        block[Na__DrawData__ELEVATIONS_KEY]  = [];
        block[Na__DrawData__SHEETS_KEY]      = [];
        return block;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Make Sure Every Array and Flag Exists on a Block
    // ------------------------------------------------------------
    // Applied to whatever the project supplies, so a hand-edited or partial
    // block still reads correctly rather than producing undefined arrays.
    // ------------------------------------------------------------
    function Na__DrawData__Normalise(block) {
        if (typeof block[Na__DrawData__DESCRIPTION_KEY] !== 'string') block[Na__DrawData__DESCRIPTION_KEY] = Na__DrawData__DESCRIPTION;
        if (!Number.isFinite(block[Na__DrawData__VERSION_KEY]))        block[Na__DrawData__VERSION_KEY]     = Na__DrawData__VERSION;
        if (typeof block[Na__DrawData__CLIENT_DIMS_KEY] !== 'boolean') block[Na__DrawData__CLIENT_DIMS_KEY] = false;
        if (!Array.isArray(block[Na__DrawData__FLOOR_PLANS_KEY]))      block[Na__DrawData__FLOOR_PLANS_KEY] = [];
        if (!Array.isArray(block[Na__DrawData__ELEVATIONS_KEY]))       block[Na__DrawData__ELEVATIONS_KEY]  = [];
        if (!Array.isArray(block[Na__DrawData__SHEETS_KEY]))           block[Na__DrawData__SHEETS_KEY]      = [];
        return block;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Live Drawings Block (Created Empty on First Use)
    // ------------------------------------------------------------
    // Returns the LIVE object. Mutating a returned array edits what the next
    // save writes, which is the whole point: the drawing records, the markup
    // arrays and the saved document are one object, never three.
    // ------------------------------------------------------------
    function Na__DrawData__GetBlock() {
        if (!Na__DrawData__Block) Na__DrawData__Block = Na__DrawData__BuildSkeleton();
        return Na__DrawData__Block;
    }
    // ------------------------------------------------------------


    // FUNCTION | Adopt the Block a Project Supplied (null = start empty)
    // ------------------------------------------------------------
    function Na__DrawData__Load(block, projectCode) {
        Na__DrawData__Block = (block && typeof block === 'object' && !Array.isArray(block))
            ? Na__DrawData__Normalise(block)                                     // <-- Adopt verbatim; unknown keys are preserved on save
            : Na__DrawData__BuildSkeleton();
        Na__DrawData__ProjectCode = projectCode || Na__DrawData__ProjectCode || null;

        window.dispatchEvent(new CustomEvent(Na__DrawData__CHANGED_EVENT, {
            detail : { reason : 'loaded', projectCode : Na__DrawData__ProjectCode }
        }));
        return Na__DrawData__Block;
    }
    // ------------------------------------------------------------


    // FUNCTION | Project Code the Block Belongs To
    // ------------------------------------------------------------
    function Na__DrawData__GetProjectCode() {
        return Na__DrawData__ProjectCode
            || Na__PresentationMode__ProjectJson__GetActiveProjectCode()
            || Na__AppUtils__GetProjectCodeFromUrl()
            || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Three Record Arrays (Live References)
    // ------------------------------------------------------------
    function Na__DrawData__GetFloorPlansArray() { return Na__DrawData__GetBlock()[Na__DrawData__FLOOR_PLANS_KEY]; }
    function Na__DrawData__GetElevationsArray() { return Na__DrawData__GetBlock()[Na__DrawData__ELEVATIONS_KEY]; }
    function Na__DrawData__GetSheetsArray()     { return Na__DrawData__GetBlock()[Na__DrawData__SHEETS_KEY]; }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Client Measuring Grant
// -----------------------------------------------------------------------------

    // FUNCTION | May Clients Measure on This Project?
    // ------------------------------------------------------------
    // Absent reads as OFF: a project nobody has considered never exposes the
    // tool.
    // ------------------------------------------------------------
    function Na__DrawData__GetClientDimensionsEnabled() {
        return Na__DrawData__GetBlock()[Na__DrawData__CLIENT_DIMS_KEY] === true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Grant or Withhold Client Measuring for This Project
    // ------------------------------------------------------------
    function Na__DrawData__SetClientDimensionsEnabled(enabled) {
        Na__DrawData__GetBlock()[Na__DrawData__CLIENT_DIMS_KEY] = (enabled === true);
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Link Checks
// -----------------------------------------------------------------------------

    // FUNCTION | Does This Scene Show a Floor Plan?
    // ------------------------------------------------------------
    function Na__DrawData__IsFloorPlanScene(scene) {
        return Boolean(scene && typeof scene === 'object' && scene[Na__DrawData__SCENE_PLAN_ID_KEY]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Does This Scene Show an Elevation or Section?
    // ------------------------------------------------------------
    function Na__DrawData__IsElevationScene(scene) {
        return Boolean(scene && typeof scene === 'object' && scene[Na__DrawData__SCENE_ELEVATION_ID_KEY]);
    }
    // ------------------------------------------------------------


    // FUNCTION | Does This Scene Show Any 2D Drawing?
    // ------------------------------------------------------------
    function Na__DrawData__IsDrawingScene(scene) {
        return Na__DrawData__IsFloorPlanScene(scene) || Na__DrawData__IsElevationScene(scene);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Save Path (R2-First)
// -----------------------------------------------------------------------------

    // FUNCTION | Save the Drawings Block and the Scene Links to project.json
    // ------------------------------------------------------------
    // Fetches the live document from Flask so nothing another panel wrote is
    // lost, replaces the two blocks this system owns, and hands the whole
    // document to the two-phase R2-first save. Returns true on success.
    // ------------------------------------------------------------
    async function Na__DrawData__Save(showToast) {
        const toast       = (typeof showToast === 'function') ? showToast : () => {};
        const projectCode = Na__DrawData__GetProjectCode();
        if (!projectCode) {
            toast('No project loaded.', true);
            return false;
        }

        try {
            const response = await fetch(`${window.location.origin}/api/projects/${projectCode}`);
            if (!response.ok) {
                toast(`Project not found: ${projectCode}`, true);
                return false;
            }
            const projectData = await response.json();

            // SCENE LINKS AND GROUPS | Ride in the presentation block
            const sceneConfig = Na__PresentationMode__ProjectJson__GetActiveConfig();
            if (sceneConfig) projectData[Na__DrawData__PRESENTATION_KEY] = sceneConfig;

            // DRAWINGS | The block this module owns
            projectData[Na__DrawData__BLOCK_KEY] = Na__DrawData__GetBlock();

            // SECTION BINDINGS | A section drawing's cut is stored per scene
            // in its own top-level block, keyed by scene name. Renaming a
            // drawing re-keys that entry, so the block has to ride with the
            // same save or the rename lands everywhere except the cut.
            // GetProjectBlock returns null until something loads or captures
            // one, so an untouched project never gains the key.
            const crossSectionBlock = Na__SectSceneData__GetProjectBlock();
            if (crossSectionBlock) projectData[Na__DrawData__CROSSSECTION_KEY] = crossSectionBlock;

            await Na__AppUtils__R2SaveProjectJson(projectData, projectCode, toast);

            window.dispatchEvent(new CustomEvent(Na__DrawData__CHANGED_EVENT, {
                detail : { reason : 'saved', projectCode : projectCode }
            }));
            return true;

        } catch (error) {
            console.error('[ValeVision3D] Drawings save error:', error);
            toast(`Drawings save failed: ${error.message}`, true);
            return false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Listen for the Project Block From the Loading Sequence
    // ------------------------------------------------------------
    function Na__DrawView__ProjectData__Initialize() {
        if (Na__DrawData__Initialized) return;
        Na__DrawData__Initialized = true;

        window.addEventListener(Na__DrawData__LOADED_EVENT, (event) => {
            const detail = event.detail || {};
            Na__DrawData__Load(detail.block || null, detail.projectCode || null);
            const block = Na__DrawData__GetBlock();
            console.log('[ValeVision3D] Drawings data loaded: '
                + block[Na__DrawData__FLOOR_PLANS_KEY].length + ' plan(s), '
                + block[Na__DrawData__ELEVATIONS_KEY].length + ' elevation(s), '
                + block[Na__DrawData__SHEETS_KEY].length + ' sheet(s).');
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Drawings Project Data API
    // ------------------------------------------------------------
    export {
        Na__DrawData__BLOCK_KEY,
        Na__DrawData__FLOOR_PLANS_KEY,
        Na__DrawData__ELEVATIONS_KEY,
        Na__DrawData__SHEETS_KEY,
        Na__DrawData__SCENE_PLAN_ID_KEY,
        Na__DrawData__SCENE_ELEVATION_ID_KEY,
        Na__DrawData__LOADED_EVENT,
        Na__DrawData__CHANGED_EVENT,
        Na__DrawView__ProjectData__Initialize,
        Na__DrawData__GetBlock,
        Na__DrawData__Load,
        Na__DrawData__GetProjectCode,
        Na__DrawData__GetFloorPlansArray,
        Na__DrawData__GetElevationsArray,
        Na__DrawData__GetSheetsArray,
        Na__DrawData__GetClientDimensionsEnabled,
        Na__DrawData__SetClientDimensionsEnabled,
        Na__DrawData__IsFloorPlanScene,
        Na__DrawData__IsElevationScene,
        Na__DrawData__IsDrawingScene,
        Na__DrawData__Save
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
