// =============================================================================
// VALEVISION3D - VIDEO STUDIO - MODEL LAYERS SESSION
// =============================================================================
//
// FILE       : Na__VideoStudio__Playback__ModelLayers.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Model Layers Session
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Apply a video path's saved model layer visibility for the length
//              of a preview or an export, then put the viewport back as it was
// CREATED    : 01-Sep-2026
//
// DESCRIPTION:
// - Model category visibility is global state owned by the Tools menu's Toggle
//   Model Layers panel.  Whatever is switched on there is what the exporter
//   renders, because the export borrows the live scene.
// - That makes layer state a property of the moment rather than of the path,
//   which is wrong: a site boundary that blocks the camera on one path is
//   wanted on the next, and there was nothing stopping an export going out with
//   a foreground building sitting across the lens because someone had switched
//   it back on since the path was authored.
// - This module scopes a path's layer state to the run.  Begin snapshots the
//   live visibility of every category the path has an opinion about, applies
//   the path's own state, and End puts the snapshot back.
//
// WHY A SNAPSHOT RATHER THAN A FULL RESET:
// - Only the categories named in the path's map are touched.  A category the
//   path says nothing about - typically one added to the model after the path
//   was authored - keeps whatever the Tools panel is showing, rather than being
//   silently forced off by an old saved state.
//
// REFERENCE COUNTING:
// - Sessions nest the same way the scene animation sessions do, so a preview
//   left running while an export starts cannot leave the scene stuck with one
//   path's layers applied.  Only the outermost session snapshots and restores.
//
// INTEGRATION:
// - Begin / End wrap preview playback and each export session.
// - The Dev menu's Advanced Layer State list writes the saved map that Begin
//   reads, via Na__VideoStudio__ProjectJson__SetModelLayerVisibility.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Sep-2026 - Version 1.0.0
// - Initial implementation. Previews and exports now honour a path's own model
//   layer state instead of whatever the Tools panel happened to be showing.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Model Category Toggle Controls
    // @delegate: ../26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js
    // ------------------------------------------------------------
    import {
        Na__ModelToggle__ApplySceneLayerVisibility,
        Na__ModelToggle__CaptureVisibilityMap
    } from '../26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Session State
    // ------------------------------------------------------------
    let Na__VsLayers__SessionCount = 0;      // <-- Nested sessions keep the restore honest
    let Na__VsLayers__Restore      = null;   // <-- Visibility to put back when the outermost session closes
    let Na__VsLayers__IsActive     = false;  // <-- True while at least one session is open
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Open a Model Layers Session
    // ------------------------------------------------------------
    // Pass enabled false to open a no-op session, so callers can wrap their work
    // unconditionally and let the path's own setting decide.
    //
    // visibilityMap {object|null} - categoryKey -> boolean, from
    //   Na__VideoStudio__ProjectJson__GetModelLayerOptions(video).visibility
    //
    // Returns true when a session was opened; pass that value straight to End.
    // Always pair with End in a finally block.
    // ------------------------------------------------------------
    function Na__VideoStudio__ModelLayers__Begin(enabled, visibilityMap) {
        if (enabled === false) return false;                                 // <-- Path has no layer opinion; leave the view alone
        if (!visibilityMap || typeof visibilityMap !== 'object') return false;

        const keys = Object.keys(visibilityMap);
        if (keys.length === 0) return false;                                 // <-- Nothing saved yet; nothing to apply or restore

        Na__VsLayers__SessionCount++;

        if (Na__VsLayers__SessionCount === 1) {
            // SNAPSHOT | Only the categories this path speaks about, so an
            // untouched layer is never rewritten on the way back out.
            const live = Na__ModelToggle__CaptureVisibilityMap();
            const restore = {};

            keys.forEach((categoryKey) => {
                if (Object.prototype.hasOwnProperty.call(live, categoryKey)) {
                    restore[categoryKey] = live[categoryKey];                // <-- Loaded category; remember its live state
                }
            });

            Na__VsLayers__Restore  = restore;
            Na__VsLayers__IsActive = true;
        }

        Na__ModelToggle__ApplySceneLayerVisibility(visibilityMap);           // <-- Categories not loaded are skipped internally
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Close a Model Layers Session
    // ------------------------------------------------------------
    // Safe to call when no session is open, and safe to call twice.
    // ------------------------------------------------------------
    function Na__VideoStudio__ModelLayers__End(wasOpened) {
        if (wasOpened === false) return;
        if (Na__VsLayers__SessionCount === 0) return;

        Na__VsLayers__SessionCount--;

        if (Na__VsLayers__SessionCount === 0) {
            if (Na__VsLayers__Restore) {
                Na__ModelToggle__ApplySceneLayerVisibility(Na__VsLayers__Restore);  // <-- Tools panel buttons follow this too
            }
            Na__VsLayers__Restore  = null;
            Na__VsLayers__IsActive = false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether a Model Layers Session Is Open
    // ------------------------------------------------------------
    function Na__VideoStudio__ModelLayers__IsActive() {
        return Na__VsLayers__IsActive;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Model Layers Session API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__ModelLayers__Begin,
        Na__VideoStudio__ModelLayers__End,
        Na__VideoStudio__ModelLayers__IsActive
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
