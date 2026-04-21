// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Scene3D World Origin Solver
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__SceneReconstruction3D__WorldOriginSolver = (function() {

    function PhotoMeasurePro__SceneReconstruction3D__BuildDefaultPlaneSize(currentState, planeName) {
        const byPlane = currentState.constraintsByPlane || {};
        const planeEntry = byPlane[planeName] || {};
        const lengthMm = Number(planeEntry.lengthMm);
        if (Number.isFinite(lengthMm) && lengthMm > 0) return lengthMm;
        return 4000;
    }

    function PhotoMeasurePro__SceneReconstruction3D__BuildCameraPose(perspectiveData, anchorPoint) {
        if (!perspectiveData || !perspectiveData.basis || !perspectiveData.f || !anchorPoint) return null;
        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;
        const basis = perspectiveData.basis;
        const ray = mathUtils.PhotoMeasurePro__PerspectiveMath__ImagePixelToRay(
            anchorPoint,
            perspectiveData.f,
            perspectiveData.cx,
            perspectiveData.cy
        );
        const anchorDepth = Math.max(1000, Math.abs(ray[2]) * 2000);
        const anchorCamera = [ray[0] * anchorDepth, ray[1] * anchorDepth, ray[2] * anchorDepth];
        const rotation = [
            [basis.Rx[0], basis.Ry[0], basis.Rz[0]],
            [basis.Rx[1], basis.Ry[1], basis.Rz[1]],
            [basis.Rx[2], basis.Ry[2], basis.Rz[2]]
        ];
        return {
            rotation: rotation,
            translation: [-anchorCamera[0], -anchorCamera[1], -anchorCamera[2]],
            anchorCamera: anchorCamera
        };
    }

    function PhotoMeasurePro__SceneReconstruction3D__BuildPlanes(currentState) {
        const facadeWidth = PhotoMeasurePro__SceneReconstruction3D__BuildDefaultPlaneSize(currentState, "Facade");
        const sideDepth = PhotoMeasurePro__SceneReconstruction3D__BuildDefaultPlaneSize(currentState, "Side");
        const verticalHeight = Math.max(
            PhotoMeasurePro__SceneReconstruction3D__BuildDefaultPlaneSize(currentState, "Ground") * 0.55,
            2500
        );
        return {
            facade: { name: "Facade", axisU: "X", axisV: "Z", normalAxis: "Y", offsetMm: 0, widthMm: facadeWidth, heightMm: verticalHeight },
            side: { name: "Side", axisU: "Y", axisV: "Z", normalAxis: "X", offsetMm: facadeWidth, widthMm: sideDepth, heightMm: verticalHeight },
            ground: { name: "Ground", axisU: "X", axisV: "Y", normalAxis: "Z", offsetMm: 0, widthMm: facadeWidth, heightMm: sideDepth }
        };
    }

    function PhotoMeasurePro__SceneReconstruction3D__BuildAnalyticalScene(currentState) {
        const perspectiveEngine = window.PhotoMeasurePro__System__PerspectiveSetup__Engine;
        const perspectiveData = perspectiveEngine.PhotoMeasurePro__PerspectiveSetup__ComputePerspectiveData(currentState);
        const scenePlanes = PhotoMeasurePro__SceneReconstruction3D__BuildPlanes(currentState);
        const worldOrigin = PhotoMeasurePro__SceneReconstruction3D__BuildCameraPose(perspectiveData, currentState.anchorPoint);
        const ready = Boolean(worldOrigin && perspectiveData && perspectiveData.basis);
        return {
            ready: ready,
            worldOrigin: worldOrigin,
            perspectiveData: perspectiveData,
            planes: scenePlanes
        };
    }

    return {
        PhotoMeasurePro__SceneReconstruction3D__BuildAnalyticalScene: PhotoMeasurePro__SceneReconstruction3D__BuildAnalyticalScene
    };
})();

window.PhotoMeasurePro__System__SceneReconstruction3D__WorldOriginSolver = PhotoMeasurePro__System__SceneReconstruction3D__WorldOriginSolver;
// endregion ----------------------------------------------------
