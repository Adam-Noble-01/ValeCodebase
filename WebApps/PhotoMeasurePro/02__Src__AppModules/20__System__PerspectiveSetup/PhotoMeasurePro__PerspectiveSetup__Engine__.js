// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Perspective Setup Engine
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__PerspectiveSetup__Engine = (function() {

    // HELPER FUNCTION | Group Perspective Lines By World Axis Letter
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveSetup__GetLinesByAxis(lineList, axisLetter) {
        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        return lineList.filter(function(lineItem) {
            return coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetAxisLetterForLineType(lineItem.type) === axisLetter;
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Compute Perspective Data Bundle
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveSetup__ComputePerspectiveData(currentState) {
        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;

        const xLines = PhotoMeasurePro__PerspectiveSetup__GetLinesByAxis(currentState.lines, "X");
        const yLines = PhotoMeasurePro__PerspectiveSetup__GetLinesByAxis(currentState.lines, "Y");
        const zLines = PhotoMeasurePro__PerspectiveSetup__GetLinesByAxis(currentState.lines, "Z");

        const vanishingX = xLines.length >= 2 ? mathUtils.PhotoMeasurePro__PerspectiveMath__GetLineIntersection(xLines[0], xLines[1]) : null;
        const vanishingY = yLines.length >= 2 ? mathUtils.PhotoMeasurePro__PerspectiveMath__GetLineIntersection(yLines[0], yLines[1]) : null;
        const vanishingZ = zLines.length >= 2 ? mathUtils.PhotoMeasurePro__PerspectiveMath__GetLineIntersection(zLines[0], zLines[1]) : null;

        const principalX = currentState.imgSize.w / 2;
        const principalY = currentState.imgSize.h / 2;

        let focalLength = null;
        let focalSource = "unresolved";
        let pairFocalLengths = { XY: null, XZ: null, YZ: null };

        if (currentState.metadataFocalPixels && Number.isFinite(currentState.metadataFocalPixels)) {
            focalLength = currentState.metadataFocalPixels;
            focalSource = "exif";
        }

        const robustFocal = mathUtils.PhotoMeasurePro__PerspectiveMath__CalculateFocalLengthRobust(
            { VPx: vanishingX, VPy: vanishingY, VPz: vanishingZ },
            principalX,
            principalY
        );
        pairFocalLengths = robustFocal.pairFocalLengths;

        if (!focalLength && robustFocal.focalLength) {
            focalLength = robustFocal.focalLength;
            focalSource = "pairs";
        }

        const basis = focalLength
            ? mathUtils.PhotoMeasurePro__PerspectiveMath__GetOrthogonalBasis(
                vanishingX, vanishingY, vanishingZ,
                focalLength, principalX, principalY
            )
            : null;

        return {
            VPx: vanishingX,
            VPy: vanishingY,
            VPz: vanishingZ,
            f: focalLength,
            focalSource: focalSource,
            pairFocalLengths: pairFocalLengths,
            cx: principalX,
            cy: principalY,
            basis: basis
        };
    }
    // ------------------------------------------------------------

    // FUNCTION | Basis Orthogonality Diagnostic
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveSetup__ComputeBasisOrthogonality(basis) {
        if (!basis) return null;
        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;
        return {
            xDotY: mathUtils.PhotoMeasurePro__PerspectiveMath__Dot(basis.Rx, basis.Ry),
            xDotZ: mathUtils.PhotoMeasurePro__PerspectiveMath__Dot(basis.Rx, basis.Rz),
            yDotZ: mathUtils.PhotoMeasurePro__PerspectiveMath__Dot(basis.Ry, basis.Rz)
        };
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__PerspectiveSetup__ComputePerspectiveData: PhotoMeasurePro__PerspectiveSetup__ComputePerspectiveData,
        PhotoMeasurePro__PerspectiveSetup__ComputeBasisOrthogonality: PhotoMeasurePro__PerspectiveSetup__ComputeBasisOrthogonality
    };
})();

window.PhotoMeasurePro__System__PerspectiveSetup__Engine = PhotoMeasurePro__System__PerspectiveSetup__Engine;
// endregion ----------------------------------------------------
