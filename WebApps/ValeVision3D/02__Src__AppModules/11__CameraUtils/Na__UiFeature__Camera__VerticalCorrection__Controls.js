// =============================================================================
// VALEDESIGNSUITE - CAMERA VERTICAL PERSPECTIVE CORRECTION - UI CONTROLS
// =============================================================================
//
// FILE      : Na__UiFeature__Camera__VerticalCorrection__Controls.js
// NAMESPACE : ValeVision3D
// MODULE    : CameraVerticalCorrectionControls
// AUTHOR    : Adam Noble - Noble Architecture
// PURPOSE   : Toggle UI for enabling / disabling vertical line correction
// CREATED   : 13-Mar-2026
//
// DESCRIPTION:
// - Wires the "Vertical Correction" checkbox to the EffectLogic module.
// - Initialises the camera reference in EffectLogic on startup.
// - Locks orbit navigation and shows a notification when correction is active.
// - The checkbox lives inside the Camera Lens panel so it inherits the
//   fold / collapse behaviour with the Export Image workflow.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 13-Mar-2026 - Version 1.0.0
// - Initial implementation of vertical correction toggle control.
//
// 13-Mar-2026 - Version 1.1.0
// - Added navigation lock with notification when correction is active.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | UI Feature - Vertical Correction Controls
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Vertical Correction Effect Logic
    // ------------------------------------------------------------
    import {
        Na__VerticalCorrection__Initialize,
        Na__VerticalCorrection__SetEnabled,
        Na__VerticalCorrection__IsEnabled
    } from './Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Navigation Lock Notification
    // ------------------------------------------------------------
    import {
        Na__NavLock__Initialize,
        Na__NavLock__Lock,
        Na__NavLock__Unlock
    } from './Na__UiFeature__Camera__VerticalCorrection__NavLockNotification.js';
    // ------------------------------------------------------------


    // FUNCTION | Initialize Vertical Correction Controls
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeVerticalCorrectionControls(camera, controls) {
        if (!camera) return;

        Na__VerticalCorrection__Initialize(camera);                          // <-- Store camera ref in EffectLogic module
        Na__NavLock__Initialize(controls);                                   // <-- Store orbit controls ref for nav lock

        const toggle = document.getElementById('naVerticalCorrectionToggle');
        if (!toggle) return;

        toggle.checked = Na__VerticalCorrection__IsEnabled();                // <-- Sync checkbox with default state (off)

        toggle.addEventListener('change', (event) => {
            const enabled = event.target.checked;
            Na__VerticalCorrection__SetEnabled(enabled);                     // <-- Update effect state on user toggle

            if (enabled) {
                Na__NavLock__Lock();                                         // <-- Lock navigation and show notification
            } else {
                Na__NavLock__Unlock();                                       // <-- Unlock navigation and hide notification
            }
        });
    }
    // ------------------------------------------------------------


    // MODULE EXPORTS | Vertical Correction Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeVerticalCorrectionControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
