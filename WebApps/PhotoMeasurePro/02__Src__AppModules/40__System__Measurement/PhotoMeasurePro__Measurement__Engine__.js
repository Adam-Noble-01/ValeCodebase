// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Measurement Engine
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__Measurement__Engine = (function() {

    // FUNCTION | Resolve Stroke Color For Line Type
    // ------------------------------------------------------------
    function PhotoMeasurePro__Measurement__GetStrokeColor(lineType) {
        if (lineType === "x") return "#ef4444";
        if (lineType === "y") return "#22c55e";
        if (lineType === "z") return "#3b82f6";
        if (lineType === "measure") return "#f97316";
        return "#06b6d4";
    }
    // ------------------------------------------------------------

    // FUNCTION | Determine If Real Scale Exists
    // ------------------------------------------------------------
    function PhotoMeasurePro__Measurement__HasScaleConstraint(lineList) {
        return lineList.some(function(lineItem) {
            return lineItem.type === "constraint" && Boolean(lineItem.lengthInput);
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Format Display Label For A Line
    // ------------------------------------------------------------
    function PhotoMeasurePro__Measurement__FormatLineLabel(lineItem, currentState, perspectiveData, scaleValue) {
        const hasScaleConstraint = PhotoMeasurePro__Measurement__HasScaleConstraint(currentState.lines);
        const measurementUnitLabel = hasScaleConstraint ? "mm" : "u";

        if (lineItem.type === "constraint" && lineItem.lengthInput) {
            return String(lineItem.lengthInput) + " " + measurementUnitLabel;
        }

        if (lineItem.type !== "measure") return "";
        if (!perspectiveData || !perspectiveData.basis) return "";

        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;
        const unscaledDistance = mathUtils.PhotoMeasurePro__PerspectiveMath__GetUnscaledDistanceRobust(
            lineItem.start,
            lineItem.end,
            perspectiveData.basis,
            currentState.measurePlane,
            perspectiveData.f,
            perspectiveData.cx,
            perspectiveData.cy
        );

        if (!unscaledDistance) return "N/A";
        const scaledValue = unscaledDistance * scaleValue;
        return scaledValue.toFixed(0) + " " + measurementUnitLabel;
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__Measurement__GetStrokeColor: PhotoMeasurePro__Measurement__GetStrokeColor,
        PhotoMeasurePro__Measurement__HasScaleConstraint: PhotoMeasurePro__Measurement__HasScaleConstraint,
        PhotoMeasurePro__Measurement__FormatLineLabel: PhotoMeasurePro__Measurement__FormatLineLabel
    };
})();

window.PhotoMeasurePro__System__Measurement__Engine = PhotoMeasurePro__System__Measurement__Engine;
// endregion ----------------------------------------------------
