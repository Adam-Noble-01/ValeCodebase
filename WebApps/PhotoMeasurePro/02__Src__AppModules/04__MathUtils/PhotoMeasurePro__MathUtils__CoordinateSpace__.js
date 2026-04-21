// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Coordinate Space Authority
// -----------------------------------------------------------------------------
// Single source of truth for Z-up, right-handed world coordinates and their
// translation to screen / camera space.
//
// World axes (Z-up):
//   X = Facade-horizontal   (red)
//   Y = Side-horizontal     (green)  (depth into the scene from facade)
//   Z = Vertical, up        (blue)
//
// Semantic planes:
//   Facade  = XZ plane  (front wall: width x height)
//   Side    = YZ plane  (side wall: depth x height)
//   Ground  = XY plane  (horizontal floor)
// -----------------------------------------------------------------------------
const PhotoMeasurePro__MathUtils__CoordinateSpace = (function() {

    // REGION | Canonical Tokens
    // ------------------------------------------------------------
    const PhotoMeasurePro__CoordinateSpace__Planes = {
        Facade: "Facade",
        Side: "Side",
        Ground: "Ground"
    };

    const PhotoMeasurePro__CoordinateSpace__LineTypes = {
        FacadeHorizontal: "FacadeHorizontal",
        SideHorizontal: "SideHorizontal",
        Vertical: "Vertical",
        Constraint: "constraint",
        Measure: "measure",
        Guide: "guide",
        Angle: "angle"
    };

    const PhotoMeasurePro__CoordinateSpace__AxisLetterByLineType = {
        FacadeHorizontal: "X",
        SideHorizontal: "Y",
        Vertical: "Z"
    };

    const PhotoMeasurePro__CoordinateSpace__AxisColors = {
        X: "#ef4444",
        Y: "#22c55e",
        Z: "#3b82f6"
    };

    const PhotoMeasurePro__CoordinateSpace__PlaneDefinitions = {
        Facade: { rightAxis: "X", upAxis: "Z", normalAxis: "Y", planeCode: "XZ" },
        Side:   { rightAxis: "Y", upAxis: "Z", normalAxis: "X", planeCode: "YZ" },
        Ground: { rightAxis: "X", upAxis: "Y", normalAxis: "Z", planeCode: "XY" }
    };
    // endregion ----------------------------------------------------

    // FUNCTION | Resolve Axis Letter For A Perspective Line Type
    // ------------------------------------------------------------
    function PhotoMeasurePro__CoordinateSpace__GetAxisLetterForLineType(lineType) {
        return PhotoMeasurePro__CoordinateSpace__AxisLetterByLineType[lineType] || null;
    }
    // ------------------------------------------------------------

    // FUNCTION | Resolve Colour For A Line Type
    // ------------------------------------------------------------
    function PhotoMeasurePro__CoordinateSpace__GetColorForLineType(lineType) {
        const axisLetter = PhotoMeasurePro__CoordinateSpace__GetAxisLetterForLineType(lineType);
        if (axisLetter) return PhotoMeasurePro__CoordinateSpace__AxisColors[axisLetter];
        if (lineType === PhotoMeasurePro__CoordinateSpace__LineTypes.Measure) return "#f97316";
        if (lineType === PhotoMeasurePro__CoordinateSpace__LineTypes.Constraint) return "#06b6d4";
        if (lineType === PhotoMeasurePro__CoordinateSpace__LineTypes.Angle) return "#a855f7";
        return "#94a3b8";
    }
    // ------------------------------------------------------------

    // FUNCTION | Resolve Colour For A Guide Line (By Its Axis)
    // ------------------------------------------------------------
    function PhotoMeasurePro__CoordinateSpace__GetColorForGuide(guideAxisLetter) {
        return PhotoMeasurePro__CoordinateSpace__AxisColors[guideAxisLetter] || "#94a3b8";
    }
    // ------------------------------------------------------------

    // FUNCTION | Resolve Plane Definition
    // ------------------------------------------------------------
    function PhotoMeasurePro__CoordinateSpace__GetPlaneDefinition(semanticPlane) {
        return PhotoMeasurePro__CoordinateSpace__PlaneDefinitions[semanticPlane]
            || PhotoMeasurePro__CoordinateSpace__PlaneDefinitions.Facade;
    }
    // ------------------------------------------------------------

    // FUNCTION | Pick Basis Vector By Axis Letter
    // ------------------------------------------------------------
    function PhotoMeasurePro__CoordinateSpace__GetBasisAxisByLetter(basis, axisLetter) {
        if (!basis) return null;
        if (axisLetter === "X") return basis.Rx;
        if (axisLetter === "Y") return basis.Ry;
        if (axisLetter === "Z") return basis.Rz;
        return null;
    }
    // ------------------------------------------------------------

    // FUNCTION | Resolve Plane Normal Vector In Camera Space
    // ------------------------------------------------------------
    function PhotoMeasurePro__CoordinateSpace__GetPlaneNormalVector(basis, semanticPlane) {
        const planeDefinition = PhotoMeasurePro__CoordinateSpace__GetPlaneDefinition(semanticPlane);
        return PhotoMeasurePro__CoordinateSpace__GetBasisAxisByLetter(basis, planeDefinition.normalAxis);
    }
    // ------------------------------------------------------------

    // FUNCTION | Translate World Z-up Value To Screen Y-down
    // ------------------------------------------------------------
    function PhotoMeasurePro__CoordinateSpace__ScreenYFromWorldZ(worldZ) {
        return -worldZ;
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__CoordinateSpace__Planes: PhotoMeasurePro__CoordinateSpace__Planes,
        PhotoMeasurePro__CoordinateSpace__LineTypes: PhotoMeasurePro__CoordinateSpace__LineTypes,
        PhotoMeasurePro__CoordinateSpace__AxisColors: PhotoMeasurePro__CoordinateSpace__AxisColors,
        PhotoMeasurePro__CoordinateSpace__GetAxisLetterForLineType: PhotoMeasurePro__CoordinateSpace__GetAxisLetterForLineType,
        PhotoMeasurePro__CoordinateSpace__GetColorForLineType: PhotoMeasurePro__CoordinateSpace__GetColorForLineType,
        PhotoMeasurePro__CoordinateSpace__GetColorForGuide: PhotoMeasurePro__CoordinateSpace__GetColorForGuide,
        PhotoMeasurePro__CoordinateSpace__GetPlaneDefinition: PhotoMeasurePro__CoordinateSpace__GetPlaneDefinition,
        PhotoMeasurePro__CoordinateSpace__GetBasisAxisByLetter: PhotoMeasurePro__CoordinateSpace__GetBasisAxisByLetter,
        PhotoMeasurePro__CoordinateSpace__GetPlaneNormalVector: PhotoMeasurePro__CoordinateSpace__GetPlaneNormalVector,
        PhotoMeasurePro__CoordinateSpace__ScreenYFromWorldZ: PhotoMeasurePro__CoordinateSpace__ScreenYFromWorldZ
    };
})();

window.PhotoMeasurePro__MathUtils__CoordinateSpace = PhotoMeasurePro__MathUtils__CoordinateSpace;
// endregion ----------------------------------------------------
