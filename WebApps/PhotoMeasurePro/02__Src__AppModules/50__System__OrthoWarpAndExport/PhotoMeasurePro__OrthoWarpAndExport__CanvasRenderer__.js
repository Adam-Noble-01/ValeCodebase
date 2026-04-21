// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Ortho Canvas Renderer
// -----------------------------------------------------------------------------
// Rectifies the source photo to a true orthographic view of the selected world
// plane by pixel-sampling the inverse planar homography into an offscreen
// canvas. This replaces the previous CSS matrix3d approach, which could only
// represent a rotation of the image mesh rather than a proper perspective
// rectification.
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__OrthoWarpAndExport__CanvasRenderer = (function() {

    let PhotoMeasurePro__OrthoCanvasRenderer__SourceImageCache = null;

    // HELPER FUNCTION | Ensure Source Image Is Loaded As An HTMLImageElement
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoCanvasRenderer__LoadSourceImage(imageUrl) {
        if (PhotoMeasurePro__OrthoCanvasRenderer__SourceImageCache
            && PhotoMeasurePro__OrthoCanvasRenderer__SourceImageCache.url === imageUrl
            && PhotoMeasurePro__OrthoCanvasRenderer__SourceImageCache.image.complete) {
            return Promise.resolve(PhotoMeasurePro__OrthoCanvasRenderer__SourceImageCache);
        }

        return new Promise(function(resolvePromise, rejectPromise) {
            const imageElement = new Image();
            imageElement.crossOrigin = "anonymous";
            imageElement.onload = function() {
                const workingCanvas = document.createElement("canvas");
                workingCanvas.width = imageElement.naturalWidth;
                workingCanvas.height = imageElement.naturalHeight;
                const workingContext = workingCanvas.getContext("2d");
                workingContext.drawImage(imageElement, 0, 0);
                const imageData = workingContext.getImageData(0, 0, workingCanvas.width, workingCanvas.height);
                PhotoMeasurePro__OrthoCanvasRenderer__SourceImageCache = {
                    url: imageUrl,
                    image: imageElement,
                    width: workingCanvas.width,
                    height: workingCanvas.height,
                    data: imageData.data
                };
                resolvePromise(PhotoMeasurePro__OrthoCanvasRenderer__SourceImageCache);
            };
            imageElement.onerror = rejectPromise;
            imageElement.src = imageUrl;
        });
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Sample Bilinear Pixel From Source Image
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoCanvasRenderer__BilinearSample(sourceCache, pixelX, pixelY, outputPixelData, outputIndex) {
        if (pixelX < 0 || pixelY < 0 || pixelX >= sourceCache.width - 1 || pixelY >= sourceCache.height - 1) {
            outputPixelData[outputIndex]     = 15;
            outputPixelData[outputIndex + 1] = 23;
            outputPixelData[outputIndex + 2] = 42;
            outputPixelData[outputIndex + 3] = 0;
            return;
        }

        const floorX = Math.floor(pixelX);
        const floorY = Math.floor(pixelY);
        const fractionX = pixelX - floorX;
        const fractionY = pixelY - floorY;

        const sourceStride = sourceCache.width * 4;
        const topLeftOffset  = floorY * sourceStride + floorX * 4;
        const topRightOffset = topLeftOffset + 4;
        const botLeftOffset  = topLeftOffset + sourceStride;
        const botRightOffset = botLeftOffset + 4;

        const sourceData = sourceCache.data;
        const weightTopLeft  = (1 - fractionX) * (1 - fractionY);
        const weightTopRight = fractionX * (1 - fractionY);
        const weightBotLeft  = (1 - fractionX) * fractionY;
        const weightBotRight = fractionX * fractionY;

        outputPixelData[outputIndex]     = sourceData[topLeftOffset]     * weightTopLeft + sourceData[topRightOffset]     * weightTopRight + sourceData[botLeftOffset]     * weightBotLeft + sourceData[botRightOffset]     * weightBotRight;
        outputPixelData[outputIndex + 1] = sourceData[topLeftOffset + 1] * weightTopLeft + sourceData[topRightOffset + 1] * weightTopRight + sourceData[botLeftOffset + 1] * weightBotLeft + sourceData[botRightOffset + 1] * weightBotRight;
        outputPixelData[outputIndex + 2] = sourceData[topLeftOffset + 2] * weightTopLeft + sourceData[topRightOffset + 2] * weightTopRight + sourceData[botLeftOffset + 2] * weightBotLeft + sourceData[botRightOffset + 2] * weightBotRight;
        outputPixelData[outputIndex + 3] = 255;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Choose Output Dimensions That Fit Within A Pixel Budget
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoCanvasRenderer__ResolveOutputDimensions(planeBounds, maxLongEdgePx) {
        const planeAspectRatio = planeBounds.width / planeBounds.height;
        let outputWidth;
        let outputHeight;
        if (planeAspectRatio >= 1) {
            outputWidth = maxLongEdgePx;
            outputHeight = Math.max(1, Math.round(maxLongEdgePx / planeAspectRatio));
        } else {
            outputHeight = maxLongEdgePx;
            outputWidth = Math.max(1, Math.round(maxLongEdgePx * planeAspectRatio));
        }
        return { width: outputWidth, height: outputHeight };
    }
    // ------------------------------------------------------------

    // FUNCTION | Render The Rectified Plane Onto A Canvas
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoCanvasRenderer__RenderOrthoCanvas(params) {
        const targetCanvas   = params.targetCanvas;
        const sourceImageUrl = params.sourceImageUrl;
        const perspectiveData = params.perspectiveData;
        const semanticPlane  = params.semanticPlane;
        const planeScale     = params.planeScale;
        const maxLongEdgePx  = params.maxLongEdgePx || 1600;
        const providedHomography = params.homography || null;
        const providedPlaneBounds = params.planeBounds || null;

        if (!targetCanvas || !sourceImageUrl || !perspectiveData || !semanticPlane || !planeScale) return Promise.resolve(null);
        if (!perspectiveData.basis || !perspectiveData.f) return Promise.resolve(null);

        const homographyUtils = window.PhotoMeasurePro__MathUtils__PlanarHomography;
        const homography = providedHomography || homographyUtils.PhotoMeasurePro__PlanarHomography__BuildImageToPlaneHomography(
            perspectiveData.basis,
            semanticPlane,
            perspectiveData.f,
            perspectiveData.cx,
            perspectiveData.cy,
            planeScale
        );
        if (!homography) return Promise.resolve(null);

        const inverseHomography = homographyUtils.PhotoMeasurePro__PlanarHomography__InvertHomography(homography);
        if (!inverseHomography) return Promise.resolve(null);

        return PhotoMeasurePro__OrthoCanvasRenderer__LoadSourceImage(sourceImageUrl).then(function(sourceCache) {
            const planeBounds = providedPlaneBounds || homographyUtils.PhotoMeasurePro__PlanarHomography__ComputePlaneBoundsForImage(
                homography,
                sourceCache.width,
                sourceCache.height
            );
            if (!planeBounds) return null;

            const outputDimensions = PhotoMeasurePro__OrthoCanvasRenderer__ResolveOutputDimensions(planeBounds, maxLongEdgePx);
            targetCanvas.width = outputDimensions.width;
            targetCanvas.height = outputDimensions.height;
            const targetContext = targetCanvas.getContext("2d");
            const outputImageData = targetContext.createImageData(outputDimensions.width, outputDimensions.height);
            const outputPixelData = outputImageData.data;

            const invH = inverseHomography;
            const stepRight = planeBounds.width / outputDimensions.width;
            const stepUp    = planeBounds.height / outputDimensions.height;

            for (let outputY = 0; outputY < outputDimensions.height; outputY++) {
                const upValueMm = planeBounds.maxUp - (outputY + 0.5) * stepUp;

                const columnNumeratorU_base = invH[0][1] * upValueMm + invH[0][2];
                const columnNumeratorV_base = invH[1][1] * upValueMm + invH[1][2];
                const columnNumeratorW_base = invH[2][1] * upValueMm + invH[2][2];

                let outputIndex = outputY * outputDimensions.width * 4;

                for (let outputX = 0; outputX < outputDimensions.width; outputX++) {
                    const rightValueMm = planeBounds.minRight + (outputX + 0.5) * stepRight;
                    const sourceNumeratorU = invH[0][0] * rightValueMm + columnNumeratorU_base;
                    const sourceNumeratorV = invH[1][0] * rightValueMm + columnNumeratorV_base;
                    const sourceDenominator = invH[2][0] * rightValueMm + columnNumeratorW_base;
                    if (sourceDenominator === 0) {
                        outputPixelData[outputIndex]     = 0;
                        outputPixelData[outputIndex + 1] = 0;
                        outputPixelData[outputIndex + 2] = 0;
                        outputPixelData[outputIndex + 3] = 0;
                        outputIndex += 4;
                        continue;
                    }
                    const sourcePixelX = sourceNumeratorU / sourceDenominator;
                    const sourcePixelY = sourceNumeratorV / sourceDenominator;
                    PhotoMeasurePro__OrthoCanvasRenderer__BilinearSample(sourceCache, sourcePixelX, sourcePixelY, outputPixelData, outputIndex);
                    outputIndex += 4;
                }
            }

            targetContext.putImageData(outputImageData, 0, 0);

            return {
                canvas: targetCanvas,
                planeBounds: planeBounds,
                outputWidth: outputDimensions.width,
                outputHeight: outputDimensions.height
            };
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Reset Cached Source Image (on image change)
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoCanvasRenderer__ResetSourceCache() {
        PhotoMeasurePro__OrthoCanvasRenderer__SourceImageCache = null;
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__OrthoCanvasRenderer__RenderOrthoCanvas: PhotoMeasurePro__OrthoCanvasRenderer__RenderOrthoCanvas,
        PhotoMeasurePro__OrthoCanvasRenderer__ResetSourceCache: PhotoMeasurePro__OrthoCanvasRenderer__ResetSourceCache
    };
})();

window.PhotoMeasurePro__System__OrthoWarpAndExport__CanvasRenderer = PhotoMeasurePro__System__OrthoWarpAndExport__CanvasRenderer;
// endregion ----------------------------------------------------
