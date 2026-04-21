// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Application Bootstrap
// -----------------------------------------------------------------------------
(async function PhotoMeasurePro__AppCore__Bootstrap() {
    const domRefs = PhotoMeasurePro__AppCore__ResolveDomReferences();
    const appConfig = await window.PhotoMeasurePro__AppData__ConfigLoader.PhotoMeasurePro__ConfigLoader__LoadConfig();

    const applicationConfig = appConfig.PhotoMeasurePro__Application__Config || {};
    const measurementConfig = appConfig.PhotoMeasurePro__Measurement__Config || {};
    window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__Initialize(applicationConfig, measurementConfig);

    PhotoMeasurePro__AppCore__InitializeSidebarEvents(domRefs);
    window.PhotoMeasurePro__System__ImageSession__Main.PhotoMeasurePro__ImageSession__Initialize(domRefs);
    window.PhotoMeasurePro__System__CanvasViewport__Main.PhotoMeasurePro__CanvasViewport__Initialize(domRefs);

    window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__Subscribe(function(stateSnapshot) {
        PhotoMeasurePro__AppCore__RenderAll(stateSnapshot, domRefs);
    });

    PhotoMeasurePro__AppCore__RenderAll(
        window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__GetState(),
        domRefs
    );
})();
// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | AppCore Helpers
// -----------------------------------------------------------------------------
function PhotoMeasurePro__AppCore__ResolveDomReferences() {
    const domHelpers = window.PhotoMeasurePro__AppUtils__DomHelpers;
    const domById = domHelpers.PhotoMeasurePro__DomHelpers__GetElementById;

    return {
        PhotoMeasurePro__ModeManager__ModeButtons: Array.from(document.querySelectorAll(".PhotoMeasurePro__Sidebar__ModeButton")),
        PhotoMeasurePro__ModeManager__SetupPanel: domById("PhotoMeasurePro__Sidebar__SetupPanel"),
        PhotoMeasurePro__ModeManager__ConstraintPanel: domById("PhotoMeasurePro__Sidebar__ConstraintPanel"),
        PhotoMeasurePro__ModeManager__MeasurementPanel: domById("PhotoMeasurePro__Sidebar__MeasurementPanel"),
        PhotoMeasurePro__ModeManager__OrthoPanel: domById("PhotoMeasurePro__OrthoWarpAndExport__Panel"),
        PhotoMeasurePro__ModeManager__StageWrapper: domById("PhotoMeasurePro__CanvasViewport__StageWrapper"),

        PhotoMeasurePro__ImageSession__FileInput: domById("PhotoMeasurePro__Sidebar__InputImageFile"),
        PhotoMeasurePro__ImageSession__ViewportRoot: domById("PhotoMeasurePro__CanvasViewport__ViewportRoot"),
        PhotoMeasurePro__ImageSession__HiddenAlignButton: domById("PhotoMeasurePro__Sidebar__ButtonHiddenAlign"),

        PhotoMeasurePro__CanvasViewport__ViewportRoot: domById("PhotoMeasurePro__CanvasViewport__ViewportRoot"),
        PhotoMeasurePro__CanvasViewport__DropHint: domById("PhotoMeasurePro__CanvasViewport__DropHint"),
        PhotoMeasurePro__CanvasViewport__StageSurface: domById("PhotoMeasurePro__CanvasViewport__StageSurface"),
        PhotoMeasurePro__CanvasViewport__ImageElement: domById("PhotoMeasurePro__CanvasViewport__ImageTarget"),
        PhotoMeasurePro__CanvasViewport__SvgOverlay: domById("PhotoMeasurePro__CanvasViewport__SvgOverlay"),
        PhotoMeasurePro__CanvasViewport__OrthoImageElement: domById("PhotoMeasurePro__OrthoWarpAndExport__ImageTarget"),
        PhotoMeasurePro__CanvasViewport__OrthoInfoCard: domById("PhotoMeasurePro__OrthoWarpAndExport__InfoCard"),

        PhotoMeasurePro__OrthoWarpAndExport__BaseImageElement: domById("PhotoMeasurePro__CanvasViewport__ImageTarget"),
        PhotoMeasurePro__OrthoWarpAndExport__OverlaySvgElement: domById("PhotoMeasurePro__CanvasViewport__SvgOverlay"),

        PhotoMeasurePro__AppCore__ExifStatusText: domById("PhotoMeasurePro__Sidebar__ExifStatusText"),
        PhotoMeasurePro__ScaleConstraint__LengthInput: domById("PhotoMeasurePro__ScaleConstraint__InputLengthMm"),
        PhotoMeasurePro__Measurement__DimensionSlider: domById("PhotoMeasurePro__Measurement__InputDimensionSize"),
        PhotoMeasurePro__Measurement__WarningText: domById("PhotoMeasurePro__Measurement__WarningText"),
        PhotoMeasurePro__AppCore__DeleteButton: domById("PhotoMeasurePro__Sidebar__ButtonDeleteSelected"),
        PhotoMeasurePro__AppCore__ExportButton: domById("PhotoMeasurePro__OrthoWarpAndExport__ButtonExportPng"),
        PhotoMeasurePro__AppCore__ConstraintPlaneButtons: Array.from(document.querySelectorAll(".PhotoMeasurePro__ScaleConstraint__PlaneButton")),
        PhotoMeasurePro__AppCore__MeasurePlaneButtons: Array.from(document.querySelectorAll(".PhotoMeasurePro__Measurement__PlaneButton"))
    };
}
// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Sidebar + Control Event Wiring
// -----------------------------------------------------------------------------
function PhotoMeasurePro__AppCore__InitializeSidebarEvents(domRefs) {
    const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
    const modeManager = window.PhotoMeasurePro__AppCore__ModeManager;
    const scaleEngine = window.PhotoMeasurePro__System__ScaleConstraint__Engine;

    domRefs.PhotoMeasurePro__ModeManager__ModeButtons.forEach(function(modeButtonElement) {
        modeButtonElement.addEventListener("click", function() {
            modeManager.PhotoMeasurePro__ModeManager__SetMode(modeButtonElement.dataset.mode);
        });
    });

    domRefs.PhotoMeasurePro__AppCore__ConstraintPlaneButtons.forEach(function(planeButtonElement) {
        planeButtonElement.addEventListener("click", function() {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { constraintPlane: planeButtonElement.dataset.plane };
            });
        });
    });

    domRefs.PhotoMeasurePro__AppCore__MeasurePlaneButtons.forEach(function(planeButtonElement) {
        planeButtonElement.addEventListener("click", function() {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { measurePlane: planeButtonElement.dataset.plane };
            });
        });
    });

    domRefs.PhotoMeasurePro__ScaleConstraint__LengthInput.addEventListener("change", function(changeEvent) {
        const numericValue = Number(changeEvent.target.value);
        if (!Number.isFinite(numericValue) || numericValue <= 0) return;
        scaleEngine.PhotoMeasurePro__ScaleConstraint__UpdateConstraintLength(numericValue);
    });

    domRefs.PhotoMeasurePro__Measurement__DimensionSlider.addEventListener("input", function(inputEvent) {
        const sliderValue = Number(inputEvent.target.value);
        stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
            return { dimensionSize: sliderValue };
        });
    });

    domRefs.PhotoMeasurePro__AppCore__DeleteButton.addEventListener("click", function() {
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        if (!currentState.selectedLineId) return;

        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const remainingLines = previousState.lines.filter(function(lineItem) {
                return lineItem.id !== previousState.selectedLineId;
            });
            return {
                lines: remainingLines,
                selectedLineId: null
            };
        });
    });

    domRefs.PhotoMeasurePro__AppCore__ExportButton.addEventListener("click", function() {
        window.PhotoMeasurePro__System__OrthoWarpAndExport__Engine.PhotoMeasurePro__OrthoWarpAndExport__ExportPng(domRefs);
    });
}
// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | App Render Pipeline
// -----------------------------------------------------------------------------
function PhotoMeasurePro__AppCore__RenderAll(currentState, domRefs) {
    const perspectiveEngine = window.PhotoMeasurePro__System__PerspectiveSetup__Engine;
    const scaleEngine = window.PhotoMeasurePro__System__ScaleConstraint__Engine;
    const measurementEngine = window.PhotoMeasurePro__System__Measurement__Engine;
    const domHelpers = window.PhotoMeasurePro__AppUtils__DomHelpers;

    const perspectiveData = perspectiveEngine.PhotoMeasurePro__PerspectiveSetup__ComputePerspectiveData(currentState);
    const scaleValue = scaleEngine.PhotoMeasurePro__ScaleConstraint__ComputeScaleValue(currentState, perspectiveData);
    const orthoStyle = perspectiveEngine.PhotoMeasurePro__PerspectiveSetup__ComputeOrthoTransformStyle(currentState, perspectiveData);

    window.PhotoMeasurePro__System__CanvasViewport__Main.PhotoMeasurePro__CanvasViewport__Render(
        domRefs,
        currentState,
        { perspectiveData: perspectiveData, scaleValue: scaleValue, orthoStyle: orthoStyle }
    );

    domRefs.PhotoMeasurePro__AppCore__ExifStatusText.textContent = currentState.metadataFocalPixels
        ? "Exif focal length: Loaded"
        : "Exif focal length: Not found (fallback active)";

    domRefs.PhotoMeasurePro__ScaleConstraint__LengthInput.value = String(currentState.constraintLengthMm || 1000);
    domRefs.PhotoMeasurePro__Measurement__DimensionSlider.value = String(currentState.dimensionSize || 20);
    domRefs.PhotoMeasurePro__AppCore__DeleteButton.disabled = !currentState.selectedLineId;

    const hasScaleConstraint = measurementEngine.PhotoMeasurePro__Measurement__HasScaleConstraint(currentState.lines);
    domHelpers.PhotoMeasurePro__DomHelpers__SetHiddenByClass(
        domRefs.PhotoMeasurePro__Measurement__WarningText,
        hasScaleConstraint,
        "PhotoMeasurePro__UiState__Hidden"
    );

    domHelpers.PhotoMeasurePro__DomHelpers__SetActiveButton(
        domRefs.PhotoMeasurePro__AppCore__ConstraintPlaneButtons,
        function(domButton) { return domButton.dataset.plane === currentState.constraintPlane; },
        "PhotoMeasurePro__ScaleConstraint__PlaneButton--active"
    );

    domHelpers.PhotoMeasurePro__DomHelpers__SetActiveButton(
        domRefs.PhotoMeasurePro__AppCore__MeasurePlaneButtons,
        function(domButton) { return domButton.dataset.plane === currentState.measurePlane; },
        "PhotoMeasurePro__Measurement__PlaneButton--active"
    );
}
// endregion ----------------------------------------------------
