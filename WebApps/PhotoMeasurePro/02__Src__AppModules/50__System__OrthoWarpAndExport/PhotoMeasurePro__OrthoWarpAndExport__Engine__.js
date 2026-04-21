// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Ortho Warp And Export Engine
// -----------------------------------------------------------------------------
// Thin orchestration: builds the planar homography + bounds for the selected
// plane, drives the canvas renderer for both the live preview and the PNG
// export (so the export is pixel-identical to the preview, optionally cropped).
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__OrthoWarpAndExport__Engine = (function() {

    // FUNCTION | Get Plane Label For UI
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoWarpAndExport__GetPlaneLabel(semanticPlane) {
        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        const planeDefinition = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetPlaneDefinition(semanticPlane);
        return semanticPlane + " (" + planeDefinition.planeCode + ")";
    }
    // ------------------------------------------------------------

    // FUNCTION | Build Ortho Geometry Bundle (Homography + Bounds)
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoWarpAndExport__BuildOrthoGeometry(currentState, derivedData) {
        const perspectiveData = derivedData && derivedData.perspectiveData;
        if (!perspectiveData || !perspectiveData.basis || !perspectiveData.f) return null;

        const planeScaleEntry = derivedData.scalesByPlane && derivedData.scalesByPlane[currentState.measurePlane];
        const planeScale = planeScaleEntry && planeScaleEntry.value;
        if (!planeScale) return null;

        const homographyUtils = window.PhotoMeasurePro__MathUtils__PlanarHomography;
        const homography = homographyUtils.PhotoMeasurePro__PlanarHomography__BuildImageToPlaneHomography(
            perspectiveData.basis,
            currentState.measurePlane,
            perspectiveData.f,
            perspectiveData.cx,
            perspectiveData.cy,
            planeScale
        );
        if (!homography) return null;

        const planeBounds = homographyUtils.PhotoMeasurePro__PlanarHomography__ComputePlaneBoundsForImage(
            homography,
            currentState.imgSize.w,
            currentState.imgSize.h
        );
        if (!planeBounds) return null;

        return {
            homography: homography,
            planeBounds: planeBounds,
            planeScale: planeScale,
            planeScaleSource: planeScaleEntry.source
        };
    }
    // ------------------------------------------------------------

    // FUNCTION | Render Ortho Preview Canvas
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoWarpAndExport__RenderPreview(targetCanvas, currentState, derivedData) {
        const orthoGeometry = PhotoMeasurePro__OrthoWarpAndExport__BuildOrthoGeometry(currentState, derivedData);
        if (!orthoGeometry || !currentState.imageUrl) return Promise.resolve(null);

        const canvasRenderer = window.PhotoMeasurePro__System__OrthoWarpAndExport__CanvasRenderer;
        return canvasRenderer.PhotoMeasurePro__OrthoCanvasRenderer__RenderOrthoCanvas({
            targetCanvas: targetCanvas,
            sourceImageUrl: currentState.imageUrl,
            perspectiveData: derivedData.perspectiveData,
            semanticPlane: currentState.measurePlane,
            planeScale: orthoGeometry.planeScale,
            planeBounds: orthoGeometry.planeBounds,
            homography: orthoGeometry.homography,
            maxLongEdgePx: 4096
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Export Rectified Plane (Optionally Cropped) As PNG
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoWarpAndExport__ExportPng(domRefs, currentState, derivedData) {
        const orthoGeometry = PhotoMeasurePro__OrthoWarpAndExport__BuildOrthoGeometry(currentState, derivedData);
        if (!orthoGeometry || !currentState.imageUrl) {
            window.alert("Set a constraint (or anchor + any constraint) so the selected plane has a scale before exporting.");
            return;
        }

        const exportCanvas = document.createElement("canvas");
        const canvasRenderer = window.PhotoMeasurePro__System__OrthoWarpAndExport__CanvasRenderer;

        const boundsForExport = PhotoMeasurePro__OrthoWarpAndExport__ApplyCropToBounds(orthoGeometry.planeBounds, currentState.orthoCrop);

        canvasRenderer.PhotoMeasurePro__OrthoCanvasRenderer__RenderOrthoCanvas({
            targetCanvas: exportCanvas,
            sourceImageUrl: currentState.imageUrl,
            perspectiveData: derivedData.perspectiveData,
            semanticPlane: currentState.measurePlane,
            planeScale: orthoGeometry.planeScale,
            planeBounds: boundsForExport,
            homography: orthoGeometry.homography,
            maxLongEdgePx: Math.max(currentState.imgSize.w, currentState.imgSize.h)
        }).then(function(renderResult) {
            if (!renderResult) return;
            PhotoMeasurePro__OrthoWarpAndExport__DrawDimensionsOnExportCanvas(exportCanvas, renderResult, orthoGeometry, boundsForExport, currentState, derivedData)
                .catch(function() {
                    // If overlay rasterisation fails we still export the base rectified bitmap.
                })
                .finally(function() {
                    const downloadLink = document.createElement("a");
                    downloadLink.href = exportCanvas.toDataURL("image/png");
                    const cropSuffix = currentState.orthoCrop ? "__Cropped" : "";
                    downloadLink.download = "PhotoMeasurePro__Ortho__" + currentState.measurePlane + cropSuffix + ".png";
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                });
        });
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Draw Ortho Dimension Overlay Onto Export Canvas
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoWarpAndExport__DrawDimensionsOnExportCanvas(exportCanvas, renderResult, orthoGeometry, boundsForExport, currentState, derivedData) {
        const orthoStage = window.PhotoMeasurePro__System__CanvasViewport__OrthoStage;
        if (!orthoStage || !orthoStage.PhotoMeasurePro__OrthoStage__BuildOverlaySvgDocument) {
            return Promise.resolve();
        }

        const exportGeometry = Object.assign({}, orthoGeometry, {
            planeBounds: boundsForExport
        });
        const svgDocument = orthoStage.PhotoMeasurePro__OrthoStage__BuildOverlaySvgDocument(
            renderResult,
            exportGeometry,
            currentState,
            derivedData,
            currentState.exportVisibility || {}
        );
        if (!svgDocument) return Promise.resolve();

        return new Promise(function(resolvePromise, rejectPromise) {
            const overlayImage = new Image();
            overlayImage.onload = function() {
                const exportContext = exportCanvas.getContext("2d");
                exportContext.drawImage(overlayImage, 0, 0, renderResult.outputWidth, renderResult.outputHeight);
                resolvePromise();
            };
            overlayImage.onerror = function(error) {
                rejectPromise(error);
            };
            overlayImage.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgDocument);
        });
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Apply Crop Rectangle To Plane Bounds
    // ------------------------------------------------------------
    // orthoCrop is stored in plane-local mm coordinates. If it clips the full
    // bounds, we use the intersection so the export respects the user's crop.
    function PhotoMeasurePro__OrthoWarpAndExport__ApplyCropToBounds(planeBounds, orthoCrop) {
        if (!orthoCrop) return planeBounds;
        const clippedMinRight = Math.max(planeBounds.minRight, orthoCrop.minRight);
        const clippedMaxRight = Math.min(planeBounds.maxRight, orthoCrop.maxRight);
        const clippedMinUp    = Math.max(planeBounds.minUp,    orthoCrop.minUp);
        const clippedMaxUp    = Math.min(planeBounds.maxUp,    orthoCrop.maxUp);
        if (clippedMaxRight - clippedMinRight <= 0 || clippedMaxUp - clippedMinUp <= 0) return planeBounds;
        return {
            minRight: clippedMinRight,
            maxRight: clippedMaxRight,
            minUp:    clippedMinUp,
            maxUp:    clippedMaxUp,
            width:    clippedMaxRight - clippedMinRight,
            height:   clippedMaxUp - clippedMinUp
        };
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__OrthoWarpAndExport__GetPlaneLabel: PhotoMeasurePro__OrthoWarpAndExport__GetPlaneLabel,
        PhotoMeasurePro__OrthoWarpAndExport__BuildOrthoGeometry: PhotoMeasurePro__OrthoWarpAndExport__BuildOrthoGeometry,
        PhotoMeasurePro__OrthoWarpAndExport__RenderPreview: PhotoMeasurePro__OrthoWarpAndExport__RenderPreview,
        PhotoMeasurePro__OrthoWarpAndExport__ExportPng: PhotoMeasurePro__OrthoWarpAndExport__ExportPng
    };
})();

window.PhotoMeasurePro__System__OrthoWarpAndExport__Engine = PhotoMeasurePro__System__OrthoWarpAndExport__Engine;
// endregion ----------------------------------------------------
