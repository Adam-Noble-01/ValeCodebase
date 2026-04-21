// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Scale Constraint Engine
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__ScaleConstraint__Engine = (function() {

    // FUNCTION | Get Active Constraint Line
    // ------------------------------------------------------------
    function PhotoMeasurePro__ScaleConstraint__GetConstraintLine(lineList) {
        return lineList.find(function(lineItem) { return lineItem.type === "constraint"; }) || null;
    }
    // ------------------------------------------------------------

    // FUNCTION | Compute Scale Value
    // ------------------------------------------------------------
    function PhotoMeasurePro__ScaleConstraint__ComputeScaleValue(currentState, perspectiveData) {
        if (!perspectiveData || !perspectiveData.basis) return 1;

        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;
        const constraintLine = PhotoMeasurePro__ScaleConstraint__GetConstraintLine(currentState.lines);
        if (!constraintLine || !constraintLine.lengthInput) return 1;

        const unscaledDistance = mathUtils.PhotoMeasurePro__PerspectiveMath__GetUnscaledDistanceRobust(
            constraintLine.start,
            constraintLine.end,
            perspectiveData.basis,
            currentState.constraintPlane,
            perspectiveData.f,
            perspectiveData.cx,
            perspectiveData.cy
        );

        if (!unscaledDistance || unscaledDistance === 0) return 1;
        return constraintLine.lengthInput / unscaledDistance;
    }
    // ------------------------------------------------------------

    // FUNCTION | Update Constraint Length Input
    // ------------------------------------------------------------
    function PhotoMeasurePro__ScaleConstraint__UpdateConstraintLength(lengthInMm) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const updatedLines = previousState.lines.map(function(lineItem) {
                if (lineItem.type !== "constraint") return lineItem;
                return Object.assign({}, lineItem, { lengthInput: lengthInMm });
            });
            return {
                lines: updatedLines,
                constraintLengthMm: lengthInMm
            };
        });
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__ScaleConstraint__GetConstraintLine: PhotoMeasurePro__ScaleConstraint__GetConstraintLine,
        PhotoMeasurePro__ScaleConstraint__ComputeScaleValue: PhotoMeasurePro__ScaleConstraint__ComputeScaleValue,
        PhotoMeasurePro__ScaleConstraint__UpdateConstraintLength: PhotoMeasurePro__ScaleConstraint__UpdateConstraintLength
    };
})();

window.PhotoMeasurePro__System__ScaleConstraint__Engine = PhotoMeasurePro__System__ScaleConstraint__Engine;
// endregion ----------------------------------------------------
