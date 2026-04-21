// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Measurement Engine
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__Measurement__Engine = (function() {

    // FUNCTION | Resolve Stroke Color For Line Type
    // ------------------------------------------------------------
    function PhotoMeasurePro__Measurement__GetStrokeColor(lineType) {
        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        return coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetColorForLineType(lineType);
    }
    // ------------------------------------------------------------

    // FUNCTION | Determine If Any Plane Currently Has A Resolved Scale
    // ------------------------------------------------------------
    function PhotoMeasurePro__Measurement__HasAnyScale(scalesByPlane) {
        if (!scalesByPlane) return false;
        const semanticPlanes = Object.keys(scalesByPlane);
        for (let planeIndex = 0; planeIndex < semanticPlanes.length; planeIndex++) {
            const planeEntry = scalesByPlane[semanticPlanes[planeIndex]];
            if (planeEntry && planeEntry.value && Number.isFinite(planeEntry.value)) return true;
        }
        return false;
    }
    // ------------------------------------------------------------

    // FUNCTION | Format Display Label For A Line
    // ------------------------------------------------------------
    function PhotoMeasurePro__Measurement__FormatLineLabel(lineItem, currentState, perspectiveData, scalesByPlane) {
        if (lineItem.type === "constraint") {
            const constraintEntry = lineItem.plane && currentState.constraintsByPlane
                ? currentState.constraintsByPlane[lineItem.plane]
                : null;
            const lengthMm = (constraintEntry && constraintEntry.lengthMm) || lineItem.lengthInput;
            if (!lengthMm) return "";
            const planeLabel = lineItem.plane || "";
            return String(lengthMm) + " mm" + (planeLabel ? " (" + planeLabel + ")" : "");
        }

        if (lineItem.type === "angle") {
            return PhotoMeasurePro__Measurement__FormatAngleLabel(lineItem, currentState, perspectiveData);
        }

        if (lineItem.type !== "measure") return "";
        if (!perspectiveData || !perspectiveData.basis || !perspectiveData.f) return "";

        const semanticPlane = currentState.measurePlane;
        const planeScaleEntry = scalesByPlane && scalesByPlane[semanticPlane];
        const scaleValue = planeScaleEntry && planeScaleEntry.value;

        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;
        const unscaledDistance = mathUtils.PhotoMeasurePro__PerspectiveMath__GetUnscaledDistanceRobust(
            lineItem.start,
            lineItem.end,
            perspectiveData.basis,
            semanticPlane,
            perspectiveData.f,
            perspectiveData.cx,
            perspectiveData.cy
        );
        if (!unscaledDistance) return "N/A";

        if (scaleValue && Number.isFinite(scaleValue)) {
            return (unscaledDistance * scaleValue).toFixed(0) + " mm";
        }
        return unscaledDistance.toFixed(2) + " u";
    }
    // ------------------------------------------------------------

    // FUNCTION | Format Display Label For An Angle Measurement
    // ------------------------------------------------------------
    function PhotoMeasurePro__Measurement__FormatAngleLabel(lineItem, currentState, perspectiveData) {
        if (!perspectiveData || !perspectiveData.basis || !perspectiveData.f) return "";
        if (!lineItem.vertex || !lineItem.armA || !lineItem.armB) return "";

        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;
        const anglePlane = lineItem.plane || currentState.measurePlane;
        const angleDegrees = mathUtils.PhotoMeasurePro__PerspectiveMath__GetAngleOnPlane(
            lineItem.vertex,
            lineItem.armA,
            lineItem.armB,
            perspectiveData.basis,
            anglePlane,
            perspectiveData.f,
            perspectiveData.cx,
            perspectiveData.cy
        );
        if (angleDegrees === null || !Number.isFinite(angleDegrees)) return "N/A";
        return angleDegrees.toFixed(1) + "\u00B0";
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__Measurement__GetStrokeColor: PhotoMeasurePro__Measurement__GetStrokeColor,
        PhotoMeasurePro__Measurement__HasAnyScale: PhotoMeasurePro__Measurement__HasAnyScale,
        PhotoMeasurePro__Measurement__FormatLineLabel: PhotoMeasurePro__Measurement__FormatLineLabel,
        PhotoMeasurePro__Measurement__FormatAngleLabel: PhotoMeasurePro__Measurement__FormatAngleLabel
    };
})();

window.PhotoMeasurePro__System__Measurement__Engine = PhotoMeasurePro__System__Measurement__Engine;
// endregion ----------------------------------------------------
