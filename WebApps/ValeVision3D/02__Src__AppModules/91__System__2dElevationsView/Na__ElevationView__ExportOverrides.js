// =============================================================================
// VALEVISION3D - ELEVATION VIEW - EXPORT OVERRIDES
// =============================================================================
//
// FILE      : Na__ElevationView__ExportOverrides.js
// NAMESPACE : ValeVision3D
// MODULE    : Na__ElevationView__ExportOverrides
// AUTHOR    : Adam Noble - Noble Architecture
// PURPOSE   : Provides elevation-aware export overrides for the image export
//             system so Download Image and Create Drawing render the 2D
//             orthographic elevation view instead of the 3D perspective view.
// CREATED   : 12-Mar-2026
//
// DESCRIPTION:
// - Listens for the same na-elevation-camera-changed event the render loop
//   uses to capture the ortho camera and 2D profile normals renderer.
// - Exports a single getter that returns null when not in elevation mode,
//   or an overrides object the export pipeline can use in place of the
//   default 3D camera and profile normals logic.
// - Provides frustum resize/restore helpers so custom-resolution exports
//   update the ortho camera's left/right/top/bottom without losing the
//   user's current zoom level.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Elevation View State API
    // ------------------------------------------------------------
    import {
        Na__ElevationView__GetState,
        Na__ElevationView__GetActiveCamera
    } from './Na__ElevationView__SystemLogic.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Captured Elevation State
    // ------------------------------------------------------------
    let Na__ExportOverrides__IsOrtho              = false; // <-- True when ortho elevation camera is active
    let Na__ExportOverrides__Render2dProfileNormals = null; // <-- 2D profile normals render function (captured from event)
    // ------------------------------------------------------------


    // MODULE VARIABLES | Frustum Restore Cache
    // ------------------------------------------------------------
    let Na__ExportOverrides__SavedLeft   = 0; // <-- Original ortho camera left before export resize
    let Na__ExportOverrides__SavedRight  = 0; // <-- Original ortho camera right before export resize
    let Na__ExportOverrides__SavedTop    = 0; // <-- Original ortho camera top before export resize
    let Na__ExportOverrides__SavedBottom = 0; // <-- Original ortho camera bottom before export resize
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Listener - Capture Elevation Camera State
// -----------------------------------------------------------------------------

    // FUNCTION | Listen for Elevation Camera Changes
    // ------------------------------------------------------------
    window.addEventListener('na-elevation-camera-changed', (event) => {
        Na__ExportOverrides__IsOrtho = !!(event.detail && event.detail.isOrtho); // <-- Track ortho state

        if (event.detail && event.detail.render2dProfileNormals) {
            Na__ExportOverrides__Render2dProfileNormals = event.detail.render2dProfileNormals; // <-- Capture 2D renderer
        }

        if (!Na__ExportOverrides__IsOrtho) {
            Na__ExportOverrides__Render2dProfileNormals = null; // <-- Clear when returning to 3D
        }
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Export Overrides API
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resize Ortho Frustum for Export Aspect Ratio
    // ------------------------------------------------------------
    function Na__ExportOverrides__ResizeFrustum(targetWidth, targetHeight) {
        const camera = Na__ElevationView__GetActiveCamera();
        if (!camera || !camera.isOrthographicCamera) return;

        Na__ExportOverrides__SavedLeft   = camera.left;   // <-- Stash current frustum
        Na__ExportOverrides__SavedRight  = camera.right;
        Na__ExportOverrides__SavedTop    = camera.top;
        Na__ExportOverrides__SavedBottom = camera.bottom;

        const halfH   = camera.top;                                    // <-- Current half-height (preserves zoom level)
        const aspect  = targetWidth / targetHeight;                    // <-- Export aspect ratio
        const halfW   = halfH * aspect;                                // <-- Compute new half-width from export aspect

        camera.left   = -halfW;
        camera.right  =  halfW;
        camera.top    =  halfH;
        camera.bottom = -halfH;
        camera.updateProjectionMatrix();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Restore Ortho Frustum After Export
    // ------------------------------------------------------------
    function Na__ExportOverrides__RestoreFrustum() {
        const camera = Na__ElevationView__GetActiveCamera();
        if (!camera || !camera.isOrthographicCamera) return;

        camera.left   = Na__ExportOverrides__SavedLeft;
        camera.right  = Na__ExportOverrides__SavedRight;
        camera.top    = Na__ExportOverrides__SavedTop;
        camera.bottom = Na__ExportOverrides__SavedBottom;
        camera.updateProjectionMatrix();
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Export Overrides for Current View Mode
    // ------------------------------------------------------------
    // Returns null when in 3D perspective mode.
    // Returns an overrides object when in 2D elevation mode so the
    // export pipeline can use the ortho camera and 2D profile lines.
    // ------------------------------------------------------------
    function Na__ElevationView__GetExportOverrides() {
        if (!Na__ExportOverrides__IsOrtho) return null;                // <-- Not in elevation mode

        const state = Na__ElevationView__GetState();
        if (state !== 'VIEWING_ELEVATION') return null;                // <-- Guard: only active in viewing state

        const camera = Na__ElevationView__GetActiveCamera();
        if (!camera || !camera.isOrthographicCamera) return null;      // <-- Guard: camera must exist and be ortho

        if (!Na__ExportOverrides__Render2dProfileNormals) return null;  // <-- Guard: 2D renderer must be available

        return {
            camera               : camera,                             // <-- Ortho camera for export
            renderProfileNormals : Na__ExportOverrides__Render2dProfileNormals, // <-- 2D profile normals renderer
            resizeFrustum        : Na__ExportOverrides__ResizeFrustum,  // <-- Resize frustum for export dimensions
            restoreFrustum       : Na__ExportOverrides__RestoreFrustum  // <-- Restore frustum after export
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Elevation Export Overrides API
    // ------------------------------------------------------------
    export {
        Na__ElevationView__GetExportOverrides
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
