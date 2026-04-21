// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Mode Manager
// -----------------------------------------------------------------------------
const PhotoMeasurePro__AppCore__ModeManager = (function() {

    // FUNCTION | Set Active Application Mode
    // ------------------------------------------------------------
    function PhotoMeasurePro__ModeManager__SetMode(nextMode) {
        window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__PatchState(function() {
            return { mode: nextMode };
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Refresh Mode UI State
    // ------------------------------------------------------------
    function PhotoMeasurePro__ModeManager__RenderModeUi(currentState, domRefs) {
        const domHelpers = window.PhotoMeasurePro__AppUtils__DomHelpers;

        domHelpers.PhotoMeasurePro__DomHelpers__SetActiveButton(
            domRefs.PhotoMeasurePro__ModeManager__ModeButtons,
            function(modeButtonElement) { return modeButtonElement.dataset.mode === currentState.mode; },
            "PhotoMeasurePro__Sidebar__ModeButton--active"
        );

        domHelpers.PhotoMeasurePro__DomHelpers__SetHiddenByClass(
            domRefs.PhotoMeasurePro__ModeManager__SetupPanel,
            currentState.mode !== "setup",
            "PhotoMeasurePro__Sidebar__ModeSection--hidden"
        );

        domHelpers.PhotoMeasurePro__DomHelpers__SetHiddenByClass(
            domRefs.PhotoMeasurePro__ModeManager__ConstraintPanel,
            currentState.mode !== "constraint",
            "PhotoMeasurePro__Sidebar__ModeSection--hidden"
        );

        domHelpers.PhotoMeasurePro__DomHelpers__SetHiddenByClass(
            domRefs.PhotoMeasurePro__ModeManager__MeasurementPanel,
            !(currentState.mode === "measure" || currentState.mode === "ortho"),
            "PhotoMeasurePro__Sidebar__ModeSection--hidden"
        );

        domHelpers.PhotoMeasurePro__DomHelpers__SetHiddenByClass(
            domRefs.PhotoMeasurePro__ModeManager__OrthoSidebarPanel,
            currentState.mode !== "ortho",
            "PhotoMeasurePro__Sidebar__ModeSection--hidden"
        );

        domHelpers.PhotoMeasurePro__DomHelpers__SetHiddenByClass(
            domRefs.PhotoMeasurePro__ModeManager__OrthoPanel,
            currentState.mode !== "ortho",
            "PhotoMeasurePro__OrthoWarpAndExport__Panel--hidden"
        );

        domHelpers.PhotoMeasurePro__DomHelpers__SetHiddenByClass(
            domRefs.PhotoMeasurePro__ModeManager__StageWrapper,
            currentState.mode === "ortho",
            "PhotoMeasurePro__UiState__Hidden"
        );
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__ModeManager__SetMode: PhotoMeasurePro__ModeManager__SetMode,
        PhotoMeasurePro__ModeManager__RenderModeUi: PhotoMeasurePro__ModeManager__RenderModeUi
    };
})();

window.PhotoMeasurePro__AppCore__ModeManager = PhotoMeasurePro__AppCore__ModeManager;
// endregion ----------------------------------------------------
