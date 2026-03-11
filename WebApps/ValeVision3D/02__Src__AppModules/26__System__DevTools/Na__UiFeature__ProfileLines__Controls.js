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
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Profile Lines Dev Tools Control
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeProfileLinesControls(pipelineRef, profileLinesConfig) {
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
            Na__RenderLoop__RequestRender();                                   // <-- Force one fresh render after state change
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
