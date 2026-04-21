// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Three Viewport Overlay HUD
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__ThreeViewport__OverlayHud = (function() {

    function PhotoMeasurePro__ThreeViewport__OverlayHud__BuildMarkup(currentState) {
        const scene3dState = currentState.scene3d || {};
        const measurementCount = (currentState.measurements3d || []).length;
        const pendingPoint = scene3dState.pendingMeasurementPoint;
        const offsetCount = (scene3dState.offsetPlanes || []).length;
        const activeSnap = scene3dState.snapTarget || "analytical";
        const depthFlag = scene3dState.depthCacheUrl ? "ready" : "none";
        const analyticalFlag = scene3dState.analyticalSceneReady ? "ready" : "none";
        const pendingText = pendingPoint
            ? "Pending A: " + pendingPoint.point.x.toFixed(0) + ", " + pendingPoint.point.y.toFixed(0) + ", " + pendingPoint.point.z.toFixed(0) + " mm"
            : "Pending A: none";
        return [
            "Scene3D",
            "Status: " + (scene3dState.status || "idle"),
            "Analytical: " + analyticalFlag + " | Depth: " + depthFlag,
            "Snap: " + activeSnap,
            "Offset planes: " + offsetCount,
            "3D measurements: " + measurementCount,
            pendingText,
            "Tip: click two points in 3D view."
        ].join("\n");
    }

    return {
        PhotoMeasurePro__ThreeViewport__OverlayHud__BuildMarkup: PhotoMeasurePro__ThreeViewport__OverlayHud__BuildMarkup
    };
})();

window.PhotoMeasurePro__System__ThreeViewport__OverlayHud = PhotoMeasurePro__System__ThreeViewport__OverlayHud;
// endregion ----------------------------------------------------
