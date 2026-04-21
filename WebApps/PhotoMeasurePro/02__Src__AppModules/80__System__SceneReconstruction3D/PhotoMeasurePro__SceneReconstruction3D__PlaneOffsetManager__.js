// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Scene3D Offset Plane Manager
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__SceneReconstruction3D__PlaneOffsetManager = (function() {

    function PhotoMeasurePro__PlaneOffsetManager__BuildOffsetPlane(nameValue, parentPlane, offsetMm) {
        return {
            id: "OffsetPlane__" + Date.now().toString(36) + "__" + Math.floor(Math.random() * 100000).toString(36),
            name: nameValue,
            parentPlane: parentPlane,
            offsetMm: Number(offsetMm)
        };
    }

    function PhotoMeasurePro__PlaneOffsetManager__AddOffsetPlane(nameValue, parentPlane, offsetMm) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const nextOffsetPlane = PhotoMeasurePro__PlaneOffsetManager__BuildOffsetPlane(nameValue, parentPlane, offsetMm);
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const scene3dState = previousState.scene3d || {};
            const nextOffsetPlaneList = (scene3dState.offsetPlanes || []).concat([nextOffsetPlane]);
            return {
                scene3d: Object.assign({}, scene3dState, { offsetPlanes: nextOffsetPlaneList })
            };
        });
    }

    function PhotoMeasurePro__PlaneOffsetManager__RemoveOffsetPlane(offsetPlaneId) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const scene3dState = previousState.scene3d || {};
            const nextOffsetPlaneList = (scene3dState.offsetPlanes || []).filter(function(offsetPlaneEntry) {
                return offsetPlaneEntry.id !== offsetPlaneId;
            });
            return {
                scene3d: Object.assign({}, scene3dState, { offsetPlanes: nextOffsetPlaneList })
            };
        });
    }

    return {
        PhotoMeasurePro__PlaneOffsetManager__AddOffsetPlane: PhotoMeasurePro__PlaneOffsetManager__AddOffsetPlane,
        PhotoMeasurePro__PlaneOffsetManager__RemoveOffsetPlane: PhotoMeasurePro__PlaneOffsetManager__RemoveOffsetPlane
    };
})();

window.PhotoMeasurePro__System__SceneReconstruction3D__PlaneOffsetManager = PhotoMeasurePro__System__SceneReconstruction3D__PlaneOffsetManager;
// endregion ----------------------------------------------------
