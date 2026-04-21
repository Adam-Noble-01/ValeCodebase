// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Measurement3D Engine
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__Measurement3D__Engine = (function() {

    function PhotoMeasurePro__Measurement3D__GenerateId() {
        return "Measure3D__" + Date.now().toString(36) + "__" + Math.floor(Math.random() * 100000).toString(36);
    }

    function PhotoMeasurePro__Measurement3D__Distance(pointA, pointB) {
        const dx = pointA.x - pointB.x;
        const dy = pointA.y - pointB.y;
        const dz = pointA.z - pointB.z;
        return Math.hypot(dx, dy, dz);
    }

    function PhotoMeasurePro__Measurement3D__RegisterPick(worldPoint, snapSource, planeName) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const scene3dState = previousState.scene3d || {};
            const pendingPoint = scene3dState.pendingMeasurementPoint;
            if (!pendingPoint) {
                return {
                    scene3d: Object.assign({}, scene3dState, {
                        pendingMeasurementPoint: {
                            point: worldPoint,
                            snapSource: snapSource,
                            planeName: planeName
                        }
                    })
                };
            }

            const nextMeasurement = {
                id: PhotoMeasurePro__Measurement3D__GenerateId(),
                a: pendingPoint.point,
                b: worldPoint,
                lengthMm: PhotoMeasurePro__Measurement3D__Distance(pendingPoint.point, worldPoint),
                snappedPlaneA: pendingPoint.planeName || null,
                snappedPlaneB: planeName || null,
                snapSourceA: pendingPoint.snapSource || null,
                snapSourceB: snapSource || null
            };
            const measurementList = (previousState.measurements3d || []).concat([nextMeasurement]);
            return {
                measurements3d: measurementList,
                scene3d: Object.assign({}, scene3dState, { pendingMeasurementPoint: null })
            };
        });
    }

    function PhotoMeasurePro__Measurement3D__ClearAll() {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            return {
                measurements3d: [],
                scene3d: Object.assign({}, previousState.scene3d, { pendingMeasurementPoint: null })
            };
        });
    }

    return {
        PhotoMeasurePro__Measurement3D__RegisterPick: PhotoMeasurePro__Measurement3D__RegisterPick,
        PhotoMeasurePro__Measurement3D__ClearAll: PhotoMeasurePro__Measurement3D__ClearAll
    };
})();

window.PhotoMeasurePro__System__Measurement3D__Engine = PhotoMeasurePro__System__Measurement3D__Engine;
// endregion ----------------------------------------------------
