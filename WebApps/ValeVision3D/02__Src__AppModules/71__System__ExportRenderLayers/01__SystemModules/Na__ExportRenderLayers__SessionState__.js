// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - SESSION STATE
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__SessionState__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Session State
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Private module state for the developer render-layer exporter -
//              which passes are selected, what is previewing, output size and
//              the cancellation token for an in-flight batch.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - These are developer session settings, not project data. Nothing here is
//   ever written into R2 project.json; closing the tab discards it all.
// - Deliberately procedural: a handful of independent values with named
//   getters and setters. There is no shared mutable lifecycle that would
//   justify a class.
// - The cancellation token is a plain object with a boolean flag rather than
//   an AbortController because the batch exporter only ever polls it between
//   tiles; it must never interrupt a GPU draw or a state restore mid-function.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Initial implementation for the Export Render Layers system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Developer Session Selections
    // ------------------------------------------------------------
    let Na__ErlState__SelectedPassIds     = new Set();   // <-- Pass IDs ticked for export
    let Na__ErlState__ActivePreviewPassId = null;        // <-- Exactly one pass may preview at a time
    let Na__ErlState__SelectedCategories  = new Set();   // <-- Category group names driving the inpaint mask
    // ------------------------------------------------------------


    // MODULE VARIABLES | Output Framing
    // ------------------------------------------------------------
    let Na__ErlState__AspectIndex     = 0;               // <-- Index into the shared ImageExport aspect ratio list
    let Na__ErlState__ResolutionIndex = 0;               // <-- Index into the shared ImageExport resolution list
    // ------------------------------------------------------------


    // MODULE VARIABLES | Batch Lifecycle
    // ------------------------------------------------------------
    let Na__ErlState__ExportInProgress = false;          // <-- True from validation until the finally block completes
    let Na__ErlState__CancelToken      = null;           // <-- { cancelled: boolean } for the active batch, else null
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pass Selection
// -----------------------------------------------------------------------------

    // FUNCTION | Replace the Entire Export Selection
    // ------------------------------------------------------------
    function Na__ErlState__SetSelectedPassIds(passIds) {
        Na__ErlState__SelectedPassIds = new Set(Array.isArray(passIds) ? passIds : []);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Export Selection in Registry-Independent Form
    // ------------------------------------------------------------
    function Na__ErlState__GetSelectedPassIds() {
        return Array.from(Na__ErlState__SelectedPassIds);
    }
    // ------------------------------------------------------------


    // FUNCTION | Tick or Untick One Pass
    // ------------------------------------------------------------
    function Na__ErlState__SetPassSelected(passId, isSelected) {
        if (!passId) return;
        if (isSelected) {
            Na__ErlState__SelectedPassIds.add(passId);
        } else {
            Na__ErlState__SelectedPassIds.delete(passId);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Test Whether One Pass Is Ticked
    // ------------------------------------------------------------
    function Na__ErlState__IsPassSelected(passId) {
        return Na__ErlState__SelectedPassIds.has(passId);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Preview Selection
// -----------------------------------------------------------------------------

    // FUNCTION | Set the Single Active Preview Pass (Null Clears)
    // ------------------------------------------------------------
    function Na__ErlState__SetActivePreviewPassId(passId) {
        Na__ErlState__ActivePreviewPassId = passId || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Active Preview Pass ID
    // ------------------------------------------------------------
    function Na__ErlState__GetActivePreviewPassId() {
        return Na__ErlState__ActivePreviewPassId;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mask Category Selection
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Inpaint Mask Category Selection
    // ------------------------------------------------------------
    function Na__ErlState__GetSelectedCategories() {
        return Array.from(Na__ErlState__SelectedCategories);
    }
    // ------------------------------------------------------------


    // FUNCTION | Tick or Untick One Mask Category
    // ------------------------------------------------------------
    function Na__ErlState__SetCategorySelected(categoryName, isSelected) {
        if (!categoryName) return;
        if (isSelected) {
            Na__ErlState__SelectedCategories.add(categoryName);
        } else {
            Na__ErlState__SelectedCategories.delete(categoryName);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Test Whether One Mask Category Is Ticked
    // ------------------------------------------------------------
    function Na__ErlState__IsCategorySelected(categoryName) {
        return Na__ErlState__SelectedCategories.has(categoryName);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Output Framing
// -----------------------------------------------------------------------------

    // FUNCTION | Set the Selected Aspect Ratio Index
    // ------------------------------------------------------------
    function Na__ErlState__SetAspectIndex(index) {
        Na__ErlState__AspectIndex = Math.max(0, Math.floor(index) || 0);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Selected Aspect Ratio Index
    // ------------------------------------------------------------
    function Na__ErlState__GetAspectIndex() {
        return Na__ErlState__AspectIndex;
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Selected Resolution Index
    // ------------------------------------------------------------
    function Na__ErlState__SetResolutionIndex(index) {
        Na__ErlState__ResolutionIndex = Math.max(0, Math.floor(index) || 0);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Selected Resolution Index
    // ------------------------------------------------------------
    function Na__ErlState__GetResolutionIndex() {
        return Na__ErlState__ResolutionIndex;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Batch Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Mark the Batch Exporter Busy or Idle
    // ------------------------------------------------------------
    function Na__ErlState__SetExportInProgress(isRunning) {
        Na__ErlState__ExportInProgress = !!isRunning;
    }
    // ------------------------------------------------------------


    // FUNCTION | Test Whether a Batch Is Currently Running
    // ------------------------------------------------------------
    function Na__ErlState__IsExportInProgress() {
        return Na__ErlState__ExportInProgress;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create and Store a Fresh Cancellation Token
    // ------------------------------------------------------------
    function Na__ErlState__CreateCancelToken() {
        Na__ErlState__CancelToken = { cancelled: false };
        return Na__ErlState__CancelToken;
    }
    // ------------------------------------------------------------


    // FUNCTION | Request Cancellation of the Active Batch
    // ------------------------------------------------------------
    // The batch exporter polls this between tiles and between passes only,
    // so a cancel can never tear down GPU state mid-draw.
    // ------------------------------------------------------------
    function Na__ErlState__RequestCancel() {
        if (Na__ErlState__CancelToken) Na__ErlState__CancelToken.cancelled = true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear the Cancellation Token After a Batch Settles
    // ------------------------------------------------------------
    function Na__ErlState__ClearCancelToken() {
        Na__ErlState__CancelToken = null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Session State API
    // ------------------------------------------------------------
    export {
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
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
