// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Perspective Setup Engine
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__PerspectiveSetup__Engine = (function() {

    // FUNCTION | Compute Perspective Data Bundle
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveSetup__ComputePerspectiveData(currentState) {
        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;

        const xLines = currentState.lines.filter(function(lineItem) { return lineItem.type === "x"; });
        const yLines = currentState.lines.filter(function(lineItem) { return lineItem.type === "y"; });
        const zLines = currentState.lines.filter(function(lineItem) { return lineItem.type === "z"; });

        const vanishingX = xLines.length >= 2 ? mathUtils.PhotoMeasurePro__PerspectiveMath__GetLineIntersection(xLines[0], xLines[1]) : null;
        const vanishingY = yLines.length >= 2 ? mathUtils.PhotoMeasurePro__PerspectiveMath__GetLineIntersection(yLines[0], yLines[1]) : null;
        const vanishingZ = zLines.length >= 2 ? mathUtils.PhotoMeasurePro__PerspectiveMath__GetLineIntersection(zLines[0], zLines[1]) : null;

        const principalX = currentState.imgSize.w / 2;
        const principalY = currentState.imgSize.h / 2;

        let focalLength = null;
        if (vanishingX && vanishingY) {
            focalLength = mathUtils.PhotoMeasurePro__PerspectiveMath__CalculateFocalLength(vanishingX, vanishingY, principalX, principalY);
        }
        if (!focalLength && vanishingX && vanishingZ) {
            focalLength = mathUtils.PhotoMeasurePro__PerspectiveMath__CalculateFocalLength(vanishingX, vanishingZ, principalX, principalY);
        }
        if (!focalLength) {
            focalLength = currentState.metadataFocalPixels || Math.max(currentState.imgSize.w, currentState.imgSize.h);
        }

        const basis = mathUtils.PhotoMeasurePro__PerspectiveMath__GetOrthogonalBasis(
            vanishingX,
            vanishingY,
            vanishingZ,
            focalLength,
            principalX,
            principalY
        );

        return {
            VPx: vanishingX,
            VPy: vanishingY,
            VPz: vanishingZ,
            f: focalLength,
            cx: principalX,
            cy: principalY,
            basis: basis
        };
    }
    // ------------------------------------------------------------

    // FUNCTION | Compute Ortho Matrix Style
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveSetup__ComputeOrthoTransformStyle(currentState, perspectiveData) {
        if (currentState.mode !== "ortho") return null;
        if (!perspectiveData || !perspectiveData.basis) return null;

        const axisX = perspectiveData.basis.Rx;
        const axisY = perspectiveData.basis.Ry;
        const axisZ = perspectiveData.basis.Rz;

        let column1 = [axisX[0], axisX[1], axisX[2], 0];
        let column2 = [axisY[0], axisY[1], axisY[2], 0];
        let column3 = [axisZ[0], axisZ[1], axisZ[2], 0];

        if (currentState.measurePlane === "XZ") {
            column2 = [-axisZ[0], -axisZ[1], -axisZ[2], 0];
            column3 = [axisY[0], axisY[1], axisY[2], 0];
        } else if (currentState.measurePlane === "YZ") {
            column1 = [-axisZ[0], -axisZ[1], -axisZ[2], 0];
            column3 = [axisX[0], axisX[1], axisX[2], 0];
        }

        const matrixValues = [].concat(column1, column2, column3, [0, 0, 0, 1]);
        return {
            transform: "translateZ(-" + perspectiveData.f + "px) matrix3d(" + matrixValues.join(",") + ")",
            transformOrigin: perspectiveData.cx + "px " + perspectiveData.cy + "px"
        };
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__PerspectiveSetup__ComputePerspectiveData: PhotoMeasurePro__PerspectiveSetup__ComputePerspectiveData,
        PhotoMeasurePro__PerspectiveSetup__ComputeOrthoTransformStyle: PhotoMeasurePro__PerspectiveSetup__ComputeOrthoTransformStyle
    };
})();

window.PhotoMeasurePro__System__PerspectiveSetup__Engine = PhotoMeasurePro__System__PerspectiveSetup__Engine;
// endregion ----------------------------------------------------
