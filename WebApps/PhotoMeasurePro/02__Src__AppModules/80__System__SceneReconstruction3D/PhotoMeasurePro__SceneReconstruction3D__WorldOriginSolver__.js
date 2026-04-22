// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Scene3D World Origin Solver
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__SceneReconstruction3D__WorldOriginSolver = (function() {

    function PhotoMeasurePro__SceneReconstruction3D__BuildDefaultPlaneSize(currentState, planeName, fallbackValue) {
        const byPlane = currentState.constraintsByPlane || {};
        const planeEntry = byPlane[planeName] || {};
        const lengthMm = Number(planeEntry.lengthMm);
        if (Number.isFinite(lengthMm) && lengthMm > 0) return lengthMm;
        return fallbackValue;
    }

    function PhotoMeasurePro__SceneReconstruction3D__Dot(vectorA, vectorB) {
        return vectorA[0] * vectorB[0] + vectorA[1] * vectorB[1] + vectorA[2] * vectorB[2];
    }

    function PhotoMeasurePro__SceneReconstruction3D__Normalize(vectorValue) {
        const magnitude = Math.hypot(vectorValue[0], vectorValue[1], vectorValue[2]);
        if (!magnitude) return [0, 0, 0];
        return [vectorValue[0] / magnitude, vectorValue[1] / magnitude, vectorValue[2] / magnitude];
    }

    function PhotoMeasurePro__SceneReconstruction3D__ResolveAnchorPoint(perspectiveData, anchorPoint, currentState) {
        if (anchorPoint && Number.isFinite(anchorPoint.x) && Number.isFinite(anchorPoint.y)) return anchorPoint;
        if (!perspectiveData) return null;
        if (Number.isFinite(perspectiveData.cx) && Number.isFinite(perspectiveData.cy)) {
            return { x: perspectiveData.cx, y: perspectiveData.cy };
        }
        const imageWidth = currentState && currentState.imgSize && Number(currentState.imgSize.w);
        const imageHeight = currentState && currentState.imgSize && Number(currentState.imgSize.h);
        if (Number.isFinite(imageWidth) && Number.isFinite(imageHeight) && imageWidth > 0 && imageHeight > 0) {
            return { x: imageWidth * 0.5, y: imageHeight * 0.5 };
        }
        return null;
    }

    function PhotoMeasurePro__SceneReconstruction3D__BuildCameraPose(perspectiveData, anchorPoint, sceneScaleHintMm, currentState) {
        if (!perspectiveData || !perspectiveData.basis || !perspectiveData.f) return null;
        const resolvedAnchorPoint = PhotoMeasurePro__SceneReconstruction3D__ResolveAnchorPoint(
            perspectiveData,
            anchorPoint,
            currentState
        );
        if (!resolvedAnchorPoint) return null;
        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;
        const basis = perspectiveData.basis;
        const rayCamera = mathUtils.PhotoMeasurePro__PerspectiveMath__ImagePixelToRay(
            resolvedAnchorPoint,
            perspectiveData.f,
            perspectiveData.cx,
            perspectiveData.cy
        );
        const rotationCameraFromWorld = [
            [basis.Rx[0], basis.Ry[0], basis.Rz[0]],
            [basis.Rx[1], basis.Ry[1], basis.Rz[1]],
            [basis.Rx[2], basis.Ry[2], basis.Rz[2]]
        ];
        const rotationWorldFromCamera = [
            [rotationCameraFromWorld[0][0], rotationCameraFromWorld[1][0], rotationCameraFromWorld[2][0]],
            [rotationCameraFromWorld[0][1], rotationCameraFromWorld[1][1], rotationCameraFromWorld[2][1]],
            [rotationCameraFromWorld[0][2], rotationCameraFromWorld[1][2], rotationCameraFromWorld[2][2]]
        ];
        const rayWorld = mathUtils.PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(rotationWorldFromCamera, rayCamera);
        const normalizedRayWorld = PhotoMeasurePro__SceneReconstruction3D__Normalize(rayWorld);
        if (!Number.isFinite(normalizedRayWorld[0]) || (normalizedRayWorld[0] === 0 && normalizedRayWorld[1] === 0 && normalizedRayWorld[2] === 0)) return null;
        const sceneScaleMm = Number.isFinite(sceneScaleHintMm) && sceneScaleHintMm > 0 ? sceneScaleHintMm : 6000;
        const cameraDistanceMm = Math.max(3000, sceneScaleMm * 1.6);
        const cameraPosition = [
            -normalizedRayWorld[0] * cameraDistanceMm,
            -normalizedRayWorld[1] * cameraDistanceMm,
            -normalizedRayWorld[2] * cameraDistanceMm
        ];
        return {
            R_wc: rotationCameraFromWorld,
            R_cw: rotationWorldFromCamera,
            C: cameraPosition,
            anchorPointUsed: { x: resolvedAnchorPoint.x, y: resolvedAnchorPoint.y },
            anchorRayCamera: rayCamera,
            anchorRayWorld: normalizedRayWorld
        };
    }

    function PhotoMeasurePro__SceneReconstruction3D__ProjectWorldToImage(worldPoint, perspectiveData, worldOrigin) {
        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;
        const relativePoint = [
            worldPoint[0] - worldOrigin.C[0],
            worldPoint[1] - worldOrigin.C[1],
            worldPoint[2] - worldOrigin.C[2]
        ];
        const pointCamera = mathUtils.PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(worldOrigin.R_wc, relativePoint);
        if (pointCamera[2] <= 1e-6) return null;
        return {
            x: perspectiveData.f * (pointCamera[0] / pointCamera[2]) + perspectiveData.cx,
            y: perspectiveData.f * (pointCamera[1] / pointCamera[2]) + perspectiveData.cy
        };
    }

    function PhotoMeasurePro__SceneReconstruction3D__LiftImagePointToPlane(imagePoint, perspectiveData, worldOrigin, planeNormal, planeOffset) {
        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;
        const rayCamera = mathUtils.PhotoMeasurePro__PerspectiveMath__ImagePixelToRay(
            imagePoint,
            perspectiveData.f,
            perspectiveData.cx,
            perspectiveData.cy
        );
        const rayWorld = mathUtils.PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(worldOrigin.R_cw, rayCamera);
        const denominator = PhotoMeasurePro__SceneReconstruction3D__Dot(planeNormal, rayWorld);
        if (Math.abs(denominator) < 1e-8) return null;
        const numerator = planeOffset - PhotoMeasurePro__SceneReconstruction3D__Dot(planeNormal, worldOrigin.C);
        const rayParameter = numerator / denominator;
        return [
            worldOrigin.C[0] + rayWorld[0] * rayParameter,
            worldOrigin.C[1] + rayWorld[1] * rayParameter,
            worldOrigin.C[2] + rayWorld[2] * rayParameter
        ];
    }

    function PhotoMeasurePro__SceneReconstruction3D__InferVerticalHeight(currentState, perspectiveData, worldOrigin, fallbackHeightMm) {
        const verticalLines = (currentState.lines || []).filter(function(lineItem) {
            return lineItem.type === "Vertical";
        });
        if (!verticalLines.length) return fallbackHeightMm;
        let maxHeight = 0;
        verticalLines.forEach(function(verticalLine) {
            const pointA = PhotoMeasurePro__SceneReconstruction3D__LiftImagePointToPlane(
                verticalLine.start,
                perspectiveData,
                worldOrigin,
                [0, 1, 0],
                0
            );
            const pointB = PhotoMeasurePro__SceneReconstruction3D__LiftImagePointToPlane(
                verticalLine.end,
                perspectiveData,
                worldOrigin,
                [0, 1, 0],
                0
            );
            if (!pointA || !pointB) return;
            maxHeight = Math.max(maxHeight, Math.abs(pointA[2] - pointB[2]));
        });
        return Math.max(maxHeight, fallbackHeightMm);
    }

    function PhotoMeasurePro__SceneReconstruction3D__BuildPlanes(currentState, perspectiveData, worldOrigin) {
        const facadeWidth = PhotoMeasurePro__SceneReconstruction3D__BuildDefaultPlaneSize(currentState, "Facade", 6000);
        const sideDepth = PhotoMeasurePro__SceneReconstruction3D__BuildDefaultPlaneSize(currentState, "Side", 6000);
        const inferredHeight = PhotoMeasurePro__SceneReconstruction3D__InferVerticalHeight(
            currentState,
            perspectiveData,
            worldOrigin,
            2500
        );
        return {
            Facade: {
                name: "Facade",
                widthMm: facadeWidth,
                heightMm: inferredHeight,
                normal: [0, 1, 0],
                cornersWorld: [
                    [0, 0, 0],
                    [facadeWidth, 0, 0],
                    [facadeWidth, 0, inferredHeight],
                    [0, 0, inferredHeight]
                ]
            },
            Side: {
                name: "Side",
                widthMm: sideDepth,
                heightMm: inferredHeight,
                normal: [1, 0, 0],
                cornersWorld: [
                    [0, 0, 0],
                    [0, sideDepth, 0],
                    [0, sideDepth, inferredHeight],
                    [0, 0, inferredHeight]
                ]
            },
            Ground: {
                name: "Ground",
                widthMm: facadeWidth,
                heightMm: sideDepth,
                normal: [0, 0, 1],
                cornersWorld: [
                    [0, 0, 0],
                    [facadeWidth, 0, 0],
                    [facadeWidth, sideDepth, 0],
                    [0, sideDepth, 0]
                ]
            }
        };
    }

    function PhotoMeasurePro__SceneReconstruction3D__BuildPlaneFootprints(planesByName, perspectiveData, worldOrigin) {
        const footprintsByPlane = {};
        Object.keys(planesByName).forEach(function(planeName) {
            const planeDef = planesByName[planeName];
            const imagePoints = planeDef.cornersWorld.map(function(worldCorner) {
                return PhotoMeasurePro__SceneReconstruction3D__ProjectWorldToImage(worldCorner, perspectiveData, worldOrigin);
            });
            footprintsByPlane[planeName] = imagePoints;
        });
        return footprintsByPlane;
    }

    function PhotoMeasurePro__SceneReconstruction3D__BuildAnalyticalScene(currentState) {
        const perspectiveEngine = window.PhotoMeasurePro__System__PerspectiveSetup__Engine;
        const perspectiveData = perspectiveEngine.PhotoMeasurePro__PerspectiveSetup__ComputePerspectiveData(currentState);
        const facadeScaleHint = PhotoMeasurePro__SceneReconstruction3D__BuildDefaultPlaneSize(currentState, "Facade", 6000);
        const sideScaleHint = PhotoMeasurePro__SceneReconstruction3D__BuildDefaultPlaneSize(currentState, "Side", 6000);
        const worldOrigin = PhotoMeasurePro__SceneReconstruction3D__BuildCameraPose(
            perspectiveData,
            currentState.anchorPoint,
            Math.max(facadeScaleHint, sideScaleHint),
            currentState
        );
        if (!worldOrigin || !perspectiveData || !perspectiveData.basis) {
            return {
                ready: false,
                worldOrigin: null,
                perspectiveData: perspectiveData,
                planesByName: null,
                imageFootprintsByPlane: null
            };
        }
        const planesByName = PhotoMeasurePro__SceneReconstruction3D__BuildPlanes(currentState, perspectiveData, worldOrigin);
        const imageFootprintsByPlane = PhotoMeasurePro__SceneReconstruction3D__BuildPlaneFootprints(
            planesByName,
            perspectiveData,
            worldOrigin
        );
        const ready = Boolean(planesByName.Facade && planesByName.Side && planesByName.Ground);
        return {
            ready: ready,
            worldOrigin: worldOrigin,
            perspectiveData: perspectiveData,
            planesByName: planesByName,
            imageFootprintsByPlane: imageFootprintsByPlane
        };
    }

    return {
        PhotoMeasurePro__SceneReconstruction3D__BuildAnalyticalScene: PhotoMeasurePro__SceneReconstruction3D__BuildAnalyticalScene,
        PhotoMeasurePro__SceneReconstruction3D__ProjectWorldToImage:  PhotoMeasurePro__SceneReconstruction3D__ProjectWorldToImage
    };
})();

window.PhotoMeasurePro__System__SceneReconstruction3D__WorldOriginSolver = PhotoMeasurePro__System__SceneReconstruction3D__WorldOriginSolver;
// endregion ----------------------------------------------------
