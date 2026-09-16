// =============================================================================
// VALEVISION3D - DEV TOOLS - PROFILE LINES CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__ProfileLines__Controls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : ProfileLines Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Dev Tools button state and runtime toggle for profile lines
// CREATED    : 11-Mar-2026
//
// DESCRIPTION:
// - Owns the Dev Tools UI state for the Profile Lines runtime toggle.
// - Hosts Profile Lines inside the Visual Settings Dev Tools submenu.
// - Keeps the button label, status text, and pressed state in sync with the
//   existing render-pipeline toggle function.
// - Extracts the remaining inline profile-lines menu logic from index.html into
//   a standalone module ready for future Dev Tools expansion.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Mar-2026 - Version 1.0.0
// - Initial extraction from index.html into a standalone Dev Tools module.
//
// 16-Sep-2026 - Version 1.2.0
// - The user-facing Visual Effects section carries a Profile Lines row too.
//   Both rows announce a flip on na-profile-lines-changed and follow each
//   other, so neither can sit showing a state the pass is not in.
//
// 11-Jun-2026 - Version 1.1.0
// - Profile Lines moved into new Visual Settings Dev Tools submenu.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Profile Lines DOM IDs and Classes
    // ------------------------------------------------------------
    const Na__ProfileLines__ButtonId      = 'naProfileLinesToggle';            // <-- Profile Lines toggle button
    const Na__ProfileLines__StatusId      = 'naProfileLinesStatus';            // <-- Profile Lines status label
    const Na__ProfileLines__ActiveClass   = 'na-dev-toggle--active';           // <-- Active button class
    const Na__VisualSettings__ToggleId    = 'naVisualSettingsToggle';          // <-- Visual Settings submenu button
    const Na__VisualSettings__PanelId     = 'naVisualSettingsPanel';           // <-- Visual Settings submenu panel
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | UI State Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Initial Profile Lines State
    // ------------------------------------------------------------
    function Na__ProfileLines__ResolveInitialState(profileLinesConfig) {
        return !!(
            profileLinesConfig
            && profileLinesConfig.RenderEffect__ProfileLines__Enabled === true
        );                                                                     // <-- Respect AppConfig initial state
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Toggle Button Status
    // ------------------------------------------------------------
    function Na__ProfileLines__UpdateButtonState(button, statusElement, isOn) {
        if (statusElement) {
            statusElement.textContent = isOn ? 'ON' : 'OFF';                   // <-- Keep status copy in sync
        }

        if (button) {
            button.classList.toggle(Na__ProfileLines__ActiveClass, isOn);      // <-- Toggle visual active state
            button.setAttribute('aria-pressed', isOn ? 'true' : 'false');      // <-- Keep accessibility state aligned
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visual Settings Submenu
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Wire Visual Settings Panel Open/Close Toggle
    // ------------------------------------------------------------
    function Na__VisualSettings__InitPanelToggle() {
        const toggleBtn = document.getElementById(Na__VisualSettings__ToggleId);
        const panel     = document.getElementById(Na__VisualSettings__PanelId);
        if (!toggleBtn || !panel) return;

        toggleBtn.addEventListener('click', () => {
            const isOpen = panel.classList.contains('is-open');
            panel.classList.toggle('is-open', !isOpen);                        // <-- Toggle submenu open state
            toggleBtn.setAttribute('aria-expanded', String(!isOpen));          // <-- Sync accessibility state
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Profile Lines Dev Tools Control
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeProfileLinesControls(pipelineRef, profileLinesConfig) {
        Na__VisualSettings__InitPanelToggle();                                 // <-- Wire Visual Settings submenu

        const toggleButton  = document.getElementById(Na__ProfileLines__ButtonId);
        const statusElement = document.getElementById(Na__ProfileLines__StatusId);
        if (!toggleButton) return;                                             // <-- Exit if markup is unavailable

        let isProfileLinesOn = Na__ProfileLines__ResolveInitialState(profileLinesConfig);
        Na__ProfileLines__UpdateButtonState(toggleButton, statusElement, isProfileLinesOn);

        toggleButton.addEventListener('click', () => {
            const pipeline = pipelineRef ? pipelineRef.current : null;
            if (!pipeline || !pipeline.toggleProfileLines) return;             // <-- Guard until pipeline is ready

            isProfileLinesOn = pipeline.toggleProfileLines();                  // <-- Flip runtime pass state
            Na__ProfileLines__UpdateButtonState(toggleButton, statusElement, isProfileLinesOn);
            window.dispatchEvent(new CustomEvent('na-profile-lines-changed', {
                detail: { enabled: isProfileLinesOn }
            }));                                                               // <-- The user-facing Visual Effects row follows this
            Na__RenderLoop__RequestRender();                                   // <-- Force one fresh render after state change
        });

        // THE OTHER TOGGLE | Profile lines are also in Tools and Settings ->
        // App Settings -> Visual Effects, and both rows must agree. Each one
        // announces the flip and the other follows rather than re-toggling.
        // @delegate: ../05__RenderPipeline/Na__UiFeature__VisualEffects__Controls.js
        window.addEventListener('na-profile-lines-changed', (event) => {
            const enabled = !!(event.detail && event.detail.enabled);
            if (enabled === isProfileLinesOn) return;                          // <-- Our own dispatch, or already in step
            isProfileLinesOn = enabled;
            Na__ProfileLines__UpdateButtonState(toggleButton, statusElement, isProfileLinesOn);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Profile Lines Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeProfileLinesControls
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
