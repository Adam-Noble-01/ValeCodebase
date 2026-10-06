// =============================================================================
// VALEDESIGNSUITE - CAMERA VERTICAL PERSPECTIVE CORRECTION - EFFECT LOGIC
// =============================================================================
//
// FILE      : Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js
// NAMESPACE : ValeVision3D
// MODULE    : CameraVerticalCorrection
// AUTHOR    : Adam Noble - Noble Architecture
// PURPOSE   : Projection matrix shear correction to straighten vertical lines
// CREATED   : 13-Mar-2026
//
// DESCRIPTION:
// - Applies a shift-lens correction to the camera projection matrix.
// - Calculates the camera's pitch angle each frame and offsets the vertical
//   frustum boundary so that vertical world lines render as true verticals.
// - The correction is mathematically exact with no resampling artifacts.
// - Must be called every rendered frame after navigation updates and after
//   any call to camera.updateProjectionMatrix().
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 13-Mar-2026 - Version 1.0.0
// - Initial implementation of projection matrix shear correction.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Vertical Perspective Correction - Effect Logic
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js Math Utils
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Correction State
    // ------------------------------------------------------------
    let Na__VerticalCorrection__Camera  = null;                              // <-- Reference to the active camera
    let Na__VerticalCorrection__Enabled = false;                             // <-- Whether correction is currently active
    const Na__VerticalCorrection__Dir   = new THREE.Vector3();               // <-- Reusable direction vector (avoids per-frame allocation)
    // ------------------------------------------------------------


    // FUNCTION | Initialize Vertical Correction
    // ------------------------------------------------------------
    function Na__VerticalCorrection__Initialize(camera) {
        if (!camera) return;
        Na__VerticalCorrection__Camera = camera;                             // <-- Store camera reference for per-frame use
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Enabled State
    // ------------------------------------------------------------
    function Na__VerticalCorrection__SetEnabled(enabled) {
        const wasEnabled = Na__VerticalCorrection__Enabled;
        Na__VerticalCorrection__Enabled = Boolean(enabled);

        if (wasEnabled && !Na__VerticalCorrection__Enabled && Na__VerticalCorrection__Camera) {
            Na__VerticalCorrection__Camera.updateProjectionMatrix();          // <-- Restore original projection when disabling
        }

        Na__RenderLoop__RequestRender();                                     // <-- Trigger re-render to reflect new state
    }
    // ------------------------------------------------------------


    // FUNCTION | Query Enabled State
    // ------------------------------------------------------------
    function Na__VerticalCorrection__IsEnabled() {
        return Na__VerticalCorrection__Enabled;
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply Correction for Current Frame
    // ------------------------------------------------------------
    // Called once per rendered frame, after navigation updates and
    // after any camera.updateProjectionMatrix() call.  Reads the
    // camera's current world-space direction, derives the pitch
    // angle, and applies a vertical frustum offset that cancels the
    // convergence of vertical scene lines.
    //
    // projectionMatrix.elements layout (column-major):
    //   [0]  sx    [4]  0     [8]  tx    [12]  0
    //   [1]  0     [5]  sy    [9]  ty    [13]  0
    //   [2]  0     [6]  0     [10] sz    [14]  tz
    //   [3]  0     [7]  0     [11] -1    [15]  0
    //
    // elements[9] = (top+bottom)/(top-bottom) — controls vertical
    // frustum asymmetry (zero for a centred frustum).
    // elements[5] = 2*near/(top-bottom)      — vertical scale.
    //
    // Correction: elements[9] += tan(pitch) * elements[5]
    // ------------------------------------------------------------
    function Na__VerticalCorrection__ApplyFrame() {
        if (!Na__VerticalCorrection__Enabled) return;                        // <-- Early-out when disabled
        if (!Na__VerticalCorrection__Camera) return;                         // <-- Guard against missing camera

        const camera = Na__VerticalCorrection__Camera;

        camera.updateProjectionMatrix();                                     // <-- Reset to clean symmetric frustum before applying shear

        camera.getWorldDirection(Na__VerticalCorrection__Dir);               // <-- Get camera forward vector in world space
        const dirY  = Math.max(-1, Math.min(1, Na__VerticalCorrection__Dir.y)); // <-- Clamp to valid asin range
        const pitch = Math.asin(dirY);                                       // <-- Pitch angle in radians (positive = looking up)

        const proj = camera.projectionMatrix.elements;
        proj[9] += Math.tan(pitch) * proj[5];                               // <-- Shift frustum to cancel vertical convergence

        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert(); // <-- Keep inverse in sync for raycasting
    }
    // ------------------------------------------------------------


    // MODULE EXPORTS | Vertical Correction API
    // ------------------------------------------------------------
    export {
        Na__VerticalCorrection__Initialize,
        Na__VerticalCorrection__SetEnabled,
        Na__VerticalCorrection__IsEnabled,
        Na__VerticalCorrection__ApplyFrame
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
