// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Image Session System
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__ImageSession__Main = (function() {

    // FUNCTION | Initialize Image Session Event Handlers
    // ------------------------------------------------------------
    function PhotoMeasurePro__ImageSession__Initialize(domRefs) {
        domRefs.PhotoMeasurePro__ImageSession__FileInput.addEventListener("change", function(changeEvent) {
            const inputFile = changeEvent.target.files && changeEvent.target.files[0];
            if (!inputFile) return;
            PhotoMeasurePro__ImageSession__LoadImageFile(inputFile, domRefs);
        });

        domRefs.PhotoMeasurePro__ImageSession__ViewportRoot.addEventListener("dragover", function(dragEvent) {
            dragEvent.preventDefault();
        });

        domRefs.PhotoMeasurePro__ImageSession__ViewportRoot.addEventListener("drop", function(dropEvent) {
            dropEvent.preventDefault();
            const droppedFile = dropEvent.dataTransfer && dropEvent.dataTransfer.files && dropEvent.dataTransfer.files[0];
            if (!droppedFile) return;
            if (!droppedFile.type || droppedFile.type.indexOf("image/") !== 0) return;
            PhotoMeasurePro__ImageSession__LoadImageFile(droppedFile, domRefs);
        });

        domRefs.PhotoMeasurePro__ImageSession__HiddenAlignButton.addEventListener("click", function() {
            PhotoMeasurePro__ImageSession__ApplyHiddenAlign(domRefs);
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Load Image File Into Session
    // ------------------------------------------------------------
    async function PhotoMeasurePro__ImageSession__LoadImageFile(imageFile, domRefs) {
        const objectUrl = URL.createObjectURL(imageFile);
        const loadedImage = await PhotoMeasurePro__ImageSession__ReadImageMetadata(objectUrl);
        const fitTransform = PhotoMeasurePro__ImageSession__ComputeFitTransform(loadedImage.width, loadedImage.height, domRefs);

        const canvasRenderer = window.PhotoMeasurePro__System__OrthoWarpAndExport__CanvasRenderer;
        if (canvasRenderer && canvasRenderer.PhotoMeasurePro__OrthoCanvasRenderer__ResetSourceCache) {
            canvasRenderer.PhotoMeasurePro__OrthoCanvasRenderer__ResetSourceCache();
        }
        const orthoStage = window.PhotoMeasurePro__System__CanvasViewport__OrthoStage;
        if (orthoStage && orthoStage.PhotoMeasurePro__OrthoStage__InvalidateCaches) {
            orthoStage.PhotoMeasurePro__OrthoStage__InvalidateCaches();
        }

        window.PhotoMeasurePro__System__HotkeysSelectAndHistory__Main.PhotoMeasurePro__HotkeysSelectAndHistory__ResetStacks();

        window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const defaultLines = PhotoMeasurePro__ImageSession__BuildDefaultSetupLines(loadedImage.width, loadedImage.height);
            const previousLengths = previousState.constraintsByPlane || {};
            return {
                imageUrl: objectUrl,
                imageName: imageFile.name || "Unnamed",
                imgSize: { w: loadedImage.width, h: loadedImage.height },
                lines: defaultLines,
                mode: "setup",
                selectedLineId: null,
                transform: fitTransform,
                constraintsByPlane: {
                    Facade: { lineId: null, lengthMm: (previousLengths.Facade && previousLengths.Facade.lengthMm) || 1000 },
                    Side:   { lineId: null, lengthMm: (previousLengths.Side   && previousLengths.Side.lengthMm)   || 1000 },
                    Ground: { lineId: null, lengthMm: (previousLengths.Ground && previousLengths.Ground.lengthMm) || 1000 }
                },
                anchorPoint: null,
                awaitingAnchorClick: false,
                canvasSelectMode: false
            };
        });

        const metadataFocalPixels = await PhotoMeasurePro__ImageSession__TryReadExifFocalPixels(imageFile, loadedImage);
        window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__PatchState(function() {
            return { metadataFocalPixels: metadataFocalPixels };
        });
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Read Image Object URL Into Dimensions
    // ------------------------------------------------------------
    function PhotoMeasurePro__ImageSession__ReadImageMetadata(objectUrl) {
        return new Promise(function(resolveImage, rejectImage) {
            const imageElement = new Image();
            imageElement.onload = function() {
                resolveImage({ width: imageElement.width, height: imageElement.height });
            };
            imageElement.onerror = rejectImage;
            imageElement.src = objectUrl;
        });
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Compute Fit Transform
    // ------------------------------------------------------------
    function PhotoMeasurePro__ImageSession__ComputeFitTransform(imageWidth, imageHeight, domRefs) {
        const state = window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__GetState();
        const viewportMarginScale = state.appConfig.PhotoMeasurePro__Application__ViewportMarginScale || 0.95;

        const viewportRect = domRefs.PhotoMeasurePro__ImageSession__ViewportRoot.getBoundingClientRect();
        const widthFitScale = viewportRect.width / imageWidth;
        const heightFitScale = viewportRect.height / imageHeight;
        const finalFitScale = Math.min(widthFitScale, heightFitScale) * viewportMarginScale;

        return {
            x: (viewportRect.width - (imageWidth * finalFitScale)) / 2,
            y: (viewportRect.height - (imageHeight * finalFitScale)) / 2,
            scale: finalFitScale
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Setup Lines For New Image
    // ------------------------------------------------------------
    // Under Z-up:
    //   FacadeHorizontal -> X (red)   horizontal features along the facade
    //   SideHorizontal   -> Y (green) horizontal features receding along the side wall
    //   Vertical         -> Z (blue)  vertical features (wall corners)
    function PhotoMeasurePro__ImageSession__BuildDefaultSetupLines(imageWidth, imageHeight) {
        return [
            { id: "facadeH1", type: "FacadeHorizontal", start: { x: imageWidth * 0.1, y: imageHeight * 0.7 }, end: { x: imageWidth * 0.9, y: imageHeight * 0.75 } },
            { id: "facadeH2", type: "FacadeHorizontal", start: { x: imageWidth * 0.1, y: imageHeight * 0.3 }, end: { x: imageWidth * 0.9, y: imageHeight * 0.25 } },
            { id: "sideH1",   type: "SideHorizontal",   start: { x: imageWidth * 0.6, y: imageHeight * 0.8 }, end: { x: imageWidth * 0.9, y: imageHeight * 0.9 } },
            { id: "sideH2",   type: "SideHorizontal",   start: { x: imageWidth * 0.6, y: imageHeight * 0.4 }, end: { x: imageWidth * 0.8, y: imageHeight * 0.6 } },
            { id: "vert1",    type: "Vertical",         start: { x: imageWidth * 0.2, y: imageHeight * 0.1 }, end: { x: imageWidth * 0.18, y: imageHeight * 0.9 } },
            { id: "vert2",    type: "Vertical",         start: { x: imageWidth * 0.8, y: imageHeight * 0.1 }, end: { x: imageWidth * 0.82, y: imageHeight * 0.9 } }
        ];
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Try Parse Exif Focal Length
    // ------------------------------------------------------------
    async function PhotoMeasurePro__ImageSession__TryReadExifFocalPixels(imageFile, loadedImage) {
        if (!window.exifr || typeof window.exifr.parse !== "function") return null;
        try {
            const metadata = await window.exifr.parse(imageFile, { tiff: true, exif: true });
            if (!metadata || !metadata.FocalLengthIn35mmFormat) return null;
            const maxImageDimension = Math.max(loadedImage.width, loadedImage.height);
            return (metadata.FocalLengthIn35mmFormat / 36) * maxImageDimension;
        } catch (_unusedError) {
            return null;
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Apply Hidden Alignment Heuristic
    // ------------------------------------------------------------
    function PhotoMeasurePro__ImageSession__ApplyHiddenAlign() {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;

        const snapshotBefore = stateManager.PhotoMeasurePro__StateManager__GetState();
        if (snapshotBefore.imageUrl) {
            window.PhotoMeasurePro__System__HotkeysSelectAndHistory__Main.PhotoMeasurePro__HotkeysSelectAndHistory__RecordBeforeChange();
        }

        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            if (!previousState.imageUrl) {
                return { showDepthMap: !previousState.showDepthMap };
            }

            const width = previousState.imgSize.w;
            const height = previousState.imgSize.h;
            const nonSetupLines = previousState.lines.filter(function(lineItem) {
                return !coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetAxisLetterForLineType(lineItem.type);
            });

            const hiddenAlignLines = [
                { id: "facadeH1", type: "FacadeHorizontal", start: { x: width * 0.1, y: height * 0.7 }, end: { x: width * 0.9, y: height * 0.75 } },
                { id: "facadeH2", type: "FacadeHorizontal", start: { x: width * 0.1, y: height * 0.3 }, end: { x: width * 0.9, y: height * 0.25 } },
                { id: "sideH1",   type: "SideHorizontal",   start: { x: width * 0.6, y: height * 0.8 }, end: { x: width * 0.9, y: height * 0.9 } },
                { id: "sideH2",   type: "SideHorizontal",   start: { x: width * 0.6, y: height * 0.4 }, end: { x: width * 0.8, y: height * 0.6 } },
                { id: "vert1",    type: "Vertical",         start: { x: width * 0.2, y: height * 0.1 }, end: { x: width * 0.18, y: height * 0.9 } },
                { id: "vert2",    type: "Vertical",         start: { x: width * 0.8, y: height * 0.1 }, end: { x: width * 0.82, y: height * 0.9 } }
            ];

            return {
                showDepthMap: !previousState.showDepthMap,
                lines: hiddenAlignLines.concat(nonSetupLines)
            };
        });
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__ImageSession__Initialize: PhotoMeasurePro__ImageSession__Initialize,
        PhotoMeasurePro__ImageSession__LoadImageFile: PhotoMeasurePro__ImageSession__LoadImageFile
    };
})();

window.PhotoMeasurePro__System__ImageSession__Main = PhotoMeasurePro__System__ImageSession__Main;
// endregion ----------------------------------------------------
