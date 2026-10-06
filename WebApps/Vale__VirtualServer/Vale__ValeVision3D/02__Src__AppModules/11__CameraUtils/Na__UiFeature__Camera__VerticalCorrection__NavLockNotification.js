// =============================================================================
// VALEDESIGNSUITE - CAMERA VERTICAL CORRECTION - NAVIGATION LOCK NOTIFICATION
// =============================================================================
//
// FILE      : Na__UiFeature__Camera__VerticalCorrection__NavLockNotification.js
// NAMESPACE : ValeVision3D
// MODULE    : CameraVerticalCorrectionNavLock
// AUTHOR    : Adam Noble - Noble Architecture
// PURPOSE   : Lock navigation and show notification when vertical correction is active
// CREATED   : 13-Mar-2026
//
// DESCRIPTION:
// - Disables orbit controls when vertical correction is toggled on.
// - Displays a centred notification that fades away after a short delay.
// - Re-shows the notification if the user attempts any navigation input
//   (mouse, wheel, touch) while correction is active and controls are locked.
// - Restores orbit controls when vertical correction is toggled off.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 13-Mar-2026 - Version 1.0.0
// - Initial implementation of navigation lock with notification overlay.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Navigation Lock Notification
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Notification Timing
    // ------------------------------------------------------------
    const NA__NAVLOCK__SHOW_DURATION_MS  = 3000;                             // <-- How long the notification stays fully visible
    const NA__NAVLOCK__FADE_DURATION_MS  = 600;                              // <-- CSS fade-out transition length
    // ------------------------------------------------------------


    // MODULE VARIABLES | Internal State
    // ------------------------------------------------------------
    let Na__NavLock__Controls       = null;                                  // <-- Orbit controls reference
    let Na__NavLock__Locked         = false;                                 // <-- Whether navigation is currently locked
    let Na__NavLock__NotificationEl = null;                                  // <-- Cached notification DOM element
    let Na__NavLock__DismissTimer   = null;                                  // <-- Active dismiss timeout handle
    let Na__NavLock__Canvas         = null;                                  // <-- Render canvas element for input interception
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create Notification DOM Element
    // ------------------------------------------------------------
    function Na__NavLock__CreateNotificationElement() {
        if (Na__NavLock__NotificationEl) return Na__NavLock__NotificationEl;

        const el = document.createElement('div');
        el.className = 'na-navlock-notification';
        el.textContent = 'Navigation locked — Vertical Correction is active';
        document.body.appendChild(el);

        Na__NavLock__NotificationEl = el;
        return el;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show Notification with Auto-Dismiss
    // ------------------------------------------------------------
    function Na__NavLock__ShowNotification() {
        const el = Na__NavLock__CreateNotificationElement();

        if (Na__NavLock__DismissTimer) {
            clearTimeout(Na__NavLock__DismissTimer);                         // <-- Reset any pending dismiss
            Na__NavLock__DismissTimer = null;
        }

        el.classList.remove('na-navlock-notification--fade-out');
        void el.offsetWidth;                                                 // <-- Force reflow for re-trigger
        el.classList.add('na-navlock-notification--visible');

        Na__NavLock__DismissTimer = setTimeout(() => {
            el.classList.add('na-navlock-notification--fade-out');
            setTimeout(() => {
                el.classList.remove('na-navlock-notification--visible');
                el.classList.remove('na-navlock-notification--fade-out');
            }, NA__NAVLOCK__FADE_DURATION_MS);
            Na__NavLock__DismissTimer = null;
        }, NA__NAVLOCK__SHOW_DURATION_MS);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hide Notification Immediately
    // ------------------------------------------------------------
    function Na__NavLock__HideNotification() {
        if (!Na__NavLock__NotificationEl) return;

        if (Na__NavLock__DismissTimer) {
            clearTimeout(Na__NavLock__DismissTimer);
            Na__NavLock__DismissTimer = null;
        }

        Na__NavLock__NotificationEl.classList.remove('na-navlock-notification--visible');
        Na__NavLock__NotificationEl.classList.remove('na-navlock-notification--fade-out');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Blocked Navigation Attempt
    // ------------------------------------------------------------
    function Na__NavLock__OnBlockedInput(event) {
        if (!Na__NavLock__Locked) return;
        Na__NavLock__ShowNotification();                                     // <-- Re-show notification on blocked input
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Navigation Lock System
    // ------------------------------------------------------------
    function Na__NavLock__Initialize(controls, canvas) {
        if (!controls) return;
        Na__NavLock__Controls = controls;
        Na__NavLock__Canvas   = canvas || document.getElementById('renderCanvas');

        Na__NavLock__CreateNotificationElement();                             // <-- Pre-create DOM element

        if (Na__NavLock__Canvas) {
            Na__NavLock__Canvas.addEventListener('mousedown', Na__NavLock__OnBlockedInput);
            Na__NavLock__Canvas.addEventListener('wheel', Na__NavLock__OnBlockedInput);
            Na__NavLock__Canvas.addEventListener('touchstart', Na__NavLock__OnBlockedInput);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Lock Navigation (Correction Enabled)
    // ------------------------------------------------------------
    function Na__NavLock__Lock() {
        if (!Na__NavLock__Controls) return;
        Na__NavLock__Locked = true;
        Na__NavLock__Controls.enabled = false;                               // <-- Disable orbit controls
        Na__NavLock__ShowNotification();
    }
    // ------------------------------------------------------------


    // FUNCTION | Unlock Navigation (Correction Disabled)
    // ------------------------------------------------------------
    function Na__NavLock__Unlock() {
        if (!Na__NavLock__Controls) return;
        Na__NavLock__Locked = false;
        Na__NavLock__Controls.enabled = true;                                // <-- Re-enable orbit controls
        Na__NavLock__HideNotification();
    }
    // ------------------------------------------------------------


    // MODULE EXPORTS | Navigation Lock API
    // ------------------------------------------------------------
    export {
        Na__NavLock__Initialize,
        Na__NavLock__Lock,
        Na__NavLock__Unlock
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
