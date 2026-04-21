// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Ortho Viewport Stage
// -----------------------------------------------------------------------------
// Dedicated viewport for the orthographic rectified plane. Renders the canvas
// (produced by the ortho canvas renderer) plus an SVG overlay in sync with it,
// and handles pan/zoom/crop interactions without re-running the pixel warp.
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__CanvasViewport__OrthoStage = (function() {

    let PhotoMeasurePro__OrthoStage__LastRenderedGeometry = null;
    let PhotoMeasurePro__OrthoStage__LastRenderSignature = null;
    let PhotoMeasurePro__OrthoStage__LastRenderResult = null;

    // FUNCTION | Initialize Ortho Pointer + Wheel Handlers
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__Initialize(domRefs) {
        const viewportRoot = domRefs.PhotoMeasurePro__OrthoWarpAndExport__Viewport;
        if (!viewportRoot) return;

        viewportRoot.style.touchAction = "none";
        viewportRoot.addEventListener("contextmenu", function(contextMenuEvent) { contextMenuEvent.preventDefault(); });
        viewportRoot.addEventListener("wheel", function(wheelEvent) {
            PhotoMeasurePro__OrthoStage__HandleWheelZoom(wheelEvent, domRefs);
        }, { passive: false });

        viewportRoot.addEventListener("pointerdown", function(pointerEvent) {
            PhotoMeasurePro__OrthoStage__HandlePointerDown(pointerEvent, domRefs);
        });
        viewportRoot.addEventListener("pointermove", function(pointerEvent) {
            PhotoMeasurePro__OrthoStage__HandlePointerMove(pointerEvent, domRefs);
        });
        viewportRoot.addEventListener("pointerup", function(pointerEvent) {
            PhotoMeasurePro__OrthoStage__HandlePointerUp(pointerEvent, domRefs);
        });
        viewportRoot.addEventListener("pointerleave", function(pointerEvent) {
            PhotoMeasurePro__OrthoStage__HandlePointerLeave(pointerEvent);
        });
        viewportRoot.addEventListener("pointercancel", function(pointerEvent) {
            PhotoMeasurePro__OrthoStage__HandlePointerCancel(pointerEvent);
        });
        viewportRoot.addEventListener("lostpointercapture", function() {
            PhotoMeasurePro__OrthoStage__HandlePointerCaptureLost();
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Drive A Full Render Cycle Of The Ortho Viewport
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__Render(domRefs, currentState, derivedData) {
        const orthoEngine = window.PhotoMeasurePro__System__OrthoWarpAndExport__Engine;
        const orthoGeometry = orthoEngine.PhotoMeasurePro__OrthoWarpAndExport__BuildOrthoGeometry(currentState, derivedData);
        const canvasElement = domRefs.PhotoMeasurePro__CanvasViewport__OrthoCanvasElement;
        const svgOverlay = domRefs.PhotoMeasurePro__CanvasViewport__OrthoSvgOverlay;
        const stageElement = domRefs.PhotoMeasurePro__CanvasViewport__OrthoStage;
        const viewportRoot = domRefs.PhotoMeasurePro__OrthoWarpAndExport__Viewport;
        const infoCard = domRefs.PhotoMeasurePro__CanvasViewport__OrthoInfoCard;

        if (!canvasElement || !svgOverlay || !stageElement || !viewportRoot) return;

        if (!orthoGeometry || !currentState.imageUrl) {
            if (infoCard) {
                infoCard.textContent =
                    orthoEngine.PhotoMeasurePro__OrthoWarpAndExport__GetPlaneLabel(currentState.measurePlane)
                    + "   Ortho needs a scale on this plane (constraint or anchor-propagated).";
            }
            svgOverlay.innerHTML = "";
            PhotoMeasurePro__OrthoStage__LastRenderedGeometry = null;
            return;
        }

        PhotoMeasurePro__OrthoStage__LastRenderedGeometry = orthoGeometry;

        viewportRoot.style.cursor = currentState.orthoIsPanning ? "grabbing" : (currentState.orthoCropMode ? "crosshair" : "grab");

        const renderSignature = PhotoMeasurePro__OrthoStage__BuildRenderSignature(currentState, orthoGeometry);
        const pixelsAreStillValid = (renderSignature === PhotoMeasurePro__OrthoStage__LastRenderSignature) && PhotoMeasurePro__OrthoStage__LastRenderResult;

        if (pixelsAreStillValid) {
            PhotoMeasurePro__OrthoStage__LayoutStageToCanvas(stageElement, canvasElement, svgOverlay, PhotoMeasurePro__OrthoStage__LastRenderResult, viewportRoot, currentState);
            PhotoMeasurePro__OrthoStage__BuildOverlayMarkup(svgOverlay, PhotoMeasurePro__OrthoStage__LastRenderResult, orthoGeometry, currentState, derivedData);
        } else {
            orthoEngine.PhotoMeasurePro__OrthoWarpAndExport__RenderPreview(canvasElement, currentState, derivedData).then(function(renderResult) {
                if (!renderResult) return;
                PhotoMeasurePro__OrthoStage__LastRenderSignature = renderSignature;
                PhotoMeasurePro__OrthoStage__LastRenderResult = renderResult;
                PhotoMeasurePro__OrthoStage__LayoutStageToCanvas(stageElement, canvasElement, svgOverlay, renderResult, viewportRoot, currentState);
                PhotoMeasurePro__OrthoStage__BuildOverlayMarkup(svgOverlay, renderResult, orthoGeometry, currentState, derivedData);
            });
        }

        if (infoCard) {
            const scaleMmPerU = orthoGeometry.planeScale;
            infoCard.textContent =
                orthoEngine.PhotoMeasurePro__OrthoWarpAndExport__GetPlaneLabel(currentState.measurePlane)
                + "   scale: " + scaleMmPerU.toFixed(2) + " mm/u"
                + "   (" + orthoGeometry.planeScaleSource + ")"
                + (currentState.orthoCrop ? "   CROPPED" : "")
                + (currentState.orthoCropMode ? "   [crop mode: drag on canvas]" : "");
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build A Cheap Render-Cache Key From The Inputs That Affect Pixels
    // ------------------------------------------------------------
    // Only the image URL, plane, scale, and homography determine the canvas
    // pixels. Pan, zoom, crop rectangle, visual settings, and measurement edits
    // do not; they can reuse the cached canvas and only re-draw the SVG overlay.
    function PhotoMeasurePro__OrthoStage__BuildRenderSignature(currentState, orthoGeometry) {
        const homographyFlat = orthoGeometry.homography
            .map(function(row) { return row.join(","); })
            .join("|");
        return [
            currentState.imageUrl,
            currentState.measurePlane,
            orthoGeometry.planeScale,
            homographyFlat
        ].join("::");
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Lay Out Stage Element To Match Canvas + Apply Transform
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__LayoutStageToCanvas(stageElement, canvasElement, svgOverlay, renderResult, viewportRoot, currentState) {
        const outputWidth  = renderResult.outputWidth;
        const outputHeight = renderResult.outputHeight;

        stageElement.style.width = outputWidth + "px";
        stageElement.style.height = outputHeight + "px";
        canvasElement.style.width = outputWidth + "px";
        canvasElement.style.height = outputHeight + "px";
        svgOverlay.setAttribute("viewBox", "0 0 " + outputWidth + " " + outputHeight);
        svgOverlay.style.width = outputWidth + "px";
        svgOverlay.style.height = outputHeight + "px";

        const transformData = PhotoMeasurePro__OrthoStage__ResolveDisplayTransform(currentState, viewportRoot, outputWidth, outputHeight);
        stageElement.style.transform =
            "translate(" + transformData.x + "px, " + transformData.y + "px) scale(" + transformData.scale + ")";
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Compute The Effective Display Transform For The Stage
    // ------------------------------------------------------------
    // If the user has not panned/zoomed, auto-fit the rectified canvas inside
    // the viewport with a small margin. Once they interact, their explicit
    // transform takes over.
    function PhotoMeasurePro__OrthoStage__ResolveDisplayTransform(currentState, viewportRoot, outputWidth, outputHeight) {
        const orthoTransform = currentState.orthoTransform;
        if (orthoTransform && orthoTransform.userAdjusted) {
            return orthoTransform;
        }
        const viewportRect = viewportRoot.getBoundingClientRect();
        const marginScale = currentState.appConfig.PhotoMeasurePro__Application__ViewportMarginScale || 0.95;
        const fitScale = Math.min(viewportRect.width / outputWidth, viewportRect.height / outputHeight) * marginScale;
        return {
            x: (viewportRect.width - outputWidth * fitScale) / 2,
            y: (viewportRect.height - outputHeight * fitScale) / 2,
            scale: fitScale,
            userAdjusted: false
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Overlay SVG Markup (Measurements + Crop)
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__BuildOverlayMarkup(svgOverlay, renderResult, orthoGeometry, currentState, derivedData) {
        const measurementEngine = window.PhotoMeasurePro__System__Measurement__Engine;
        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        const visualSettings = currentState.visualSettings || {};
        const dimThickness = visualSettings.dimensionLineThickness || 1.5;
        const orthoTransform = currentState.orthoTransform || { scale: 1 };
        const displayScale = (orthoTransform && orthoTransform.scale) || 1;
        const dimensionFontSize = (currentState.dimensionSize / displayScale);

        const measureColor = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetColorForLineType("measure");
        const constraintColor = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetColorForLineType("constraint");

        let markupBuffer = "";

        const activePlaneDefinition = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetPlaneDefinition(currentState.measurePlane);

        currentState.lines.forEach(function(lineItem) {
            if (lineItem.type === "guide") {
                const guideAxisLetter = lineItem.axis;
                const guideIsOnPlane = (guideAxisLetter === activePlaneDefinition.rightAxis || guideAxisLetter === activePlaneDefinition.upAxis);
                if (!guideIsOnPlane) return;
                const guideStartCanvas = PhotoMeasurePro__OrthoStage__ImagePointToCanvasPixel(lineItem.start, orthoGeometry, renderResult);
                const guideEndCanvas   = PhotoMeasurePro__OrthoStage__ImagePointToCanvasPixel(lineItem.end,   orthoGeometry, renderResult);
                if (!guideStartCanvas || !guideEndCanvas) return;
                const guideColor = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetColorForGuide(guideAxisLetter);
                markupBuffer += "<line x1=\"" + guideStartCanvas.x + "\" y1=\"" + guideStartCanvas.y +
                    "\" x2=\"" + guideEndCanvas.x + "\" y2=\"" + guideEndCanvas.y +
                    "\" stroke=\"" + guideColor + "\" stroke-width=\"" + (dimThickness * 0.7 / displayScale) +
                    "\" stroke-dasharray=\"10,6\" stroke-opacity=\"0.8\" />";
                return;
            }

            if (lineItem.type === "angle") {
                if (lineItem.plane && lineItem.plane !== currentState.measurePlane) return;
                if (!lineItem.vertex || !lineItem.armA || !lineItem.armB) return;
                const vertexCanvas = PhotoMeasurePro__OrthoStage__ImagePointToCanvasPixel(lineItem.vertex, orthoGeometry, renderResult);
                const armACanvas   = PhotoMeasurePro__OrthoStage__ImagePointToCanvasPixel(lineItem.armA,   orthoGeometry, renderResult);
                const armBCanvas   = PhotoMeasurePro__OrthoStage__ImagePointToCanvasPixel(lineItem.armB,   orthoGeometry, renderResult);
                if (!vertexCanvas || !armACanvas || !armBCanvas) return;
                const angleStroke = "#a855f7";
                const angleWidth = dimThickness / displayScale;
                markupBuffer += "<line x1=\"" + vertexCanvas.x + "\" y1=\"" + vertexCanvas.y + "\" x2=\"" + armACanvas.x + "\" y2=\"" + armACanvas.y + "\" stroke=\"" + angleStroke + "\" stroke-width=\"" + angleWidth + "\" stroke-dasharray=\"6,4\" />";
                markupBuffer += "<line x1=\"" + vertexCanvas.x + "\" y1=\"" + vertexCanvas.y + "\" x2=\"" + armBCanvas.x + "\" y2=\"" + armBCanvas.y + "\" stroke=\"" + angleStroke + "\" stroke-width=\"" + angleWidth + "\" stroke-dasharray=\"6,4\" />";
                const angleLabel = measurementEngine.PhotoMeasurePro__Measurement__FormatAngleLabel(lineItem, currentState, derivedData.perspectiveData);
                if (angleLabel) {
                    const bx = (armACanvas.x + armBCanvas.x) / 2 - vertexCanvas.x;
                    const by = (armACanvas.y + armBCanvas.y) / 2 - vertexCanvas.y;
                    const bLen = Math.hypot(bx, by) || 1;
                    const labelX = vertexCanvas.x + (bx / bLen) * dimensionFontSize * 2.5;
                    const labelY = vertexCanvas.y + (by / bLen) * dimensionFontSize * 2.5;
                    markupBuffer += "<text x=\"" + labelX + "\" y=\"" + labelY + "\" fill=\"" + angleStroke + "\" font-weight=\"700\" font-size=\"" + dimensionFontSize + "\" text-anchor=\"middle\" paint-order=\"stroke\" stroke=\"rgba(15,23,42,0.85)\" stroke-width=\"" + (dimensionFontSize * 0.18) + "\">" + angleLabel + "</text>";
                }
                return;
            }

            if (lineItem.type !== "measure" && lineItem.type !== "constraint") return;
            if (lineItem.plane && lineItem.plane !== currentState.measurePlane) return;

            const startCanvas = PhotoMeasurePro__OrthoStage__ImagePointToCanvasPixel(lineItem.start, orthoGeometry, renderResult);
            const endCanvas   = PhotoMeasurePro__OrthoStage__ImagePointToCanvasPixel(lineItem.end,   orthoGeometry, renderResult);
            if (!startCanvas || !endCanvas) return;

            const lineStrokeColor = lineItem.type === "measure" ? measureColor : constraintColor;
            const lineLabel = measurementEngine.PhotoMeasurePro__Measurement__FormatLineLabel(
                lineItem, currentState, derivedData.perspectiveData, derivedData.scalesByPlane
            );

            markupBuffer += "<line x1=\"" + startCanvas.x + "\" y1=\"" + startCanvas.y +
                "\" x2=\"" + endCanvas.x + "\" y2=\"" + endCanvas.y +
                "\" stroke=\"" + lineStrokeColor + "\" stroke-width=\"" + (dimThickness / displayScale) +
                "\" stroke-linecap=\"round\" />";
            markupBuffer += PhotoMeasurePro__OrthoStage__BuildEndpointTick(startCanvas, dimThickness / displayScale, lineStrokeColor);
            markupBuffer += PhotoMeasurePro__OrthoStage__BuildEndpointTick(endCanvas,   dimThickness / displayScale, lineStrokeColor);

            if (lineLabel) {
                const midX = (startCanvas.x + endCanvas.x) / 2;
                const midY = (startCanvas.y + endCanvas.y) / 2;
                markupBuffer += "<text x=\"" + midX + "\" y=\"" + (midY - dimensionFontSize * 0.6) +
                    "\" fill=\"" + lineStrokeColor +
                    "\" font-weight=\"700\" font-size=\"" + dimensionFontSize +
                    "\" text-anchor=\"middle\" paint-order=\"stroke\" stroke=\"rgba(15,23,42,0.85)\" stroke-width=\"" + (dimensionFontSize * 0.18) +
                    "\">" + lineLabel + "</text>";
            }
        });

        markupBuffer += PhotoMeasurePro__OrthoStage__BuildCropRectangleMarkup(
            currentState,
            orthoGeometry,
            renderResult,
            displayScale
        );

        svgOverlay.innerHTML = markupBuffer;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build A Small Crosshair Tick At An Endpoint
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__BuildEndpointTick(canvasPoint, strokeWidth, strokeColor) {
        const halfSize = Math.max(4, strokeWidth * 3);
        const pathData = "M " + (canvasPoint.x - halfSize) + " " + canvasPoint.y + " L " + (canvasPoint.x + halfSize) + " " + canvasPoint.y +
            " M " + canvasPoint.x + " " + (canvasPoint.y - halfSize) + " L " + canvasPoint.x + " " + (canvasPoint.y + halfSize);
        return "<path d=\"" + pathData + "\" stroke=\"" + strokeColor + "\" stroke-width=\"" + strokeWidth + "\" />";
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Crop Rectangle Markup (Committed + Drawing)
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__BuildCropRectangleMarkup(currentState, orthoGeometry, renderResult, displayScale) {
        let markup = "";
        const strokeWidth = 2 / displayScale;

        if (currentState.orthoCrop) {
            const cropRect = PhotoMeasurePro__OrthoStage__PlaneCropToCanvasRect(currentState.orthoCrop, orthoGeometry, renderResult);
            if (cropRect) {
                markup += "<rect x=\"" + cropRect.x + "\" y=\"" + cropRect.y +
                    "\" width=\"" + cropRect.width + "\" height=\"" + cropRect.height +
                    "\" fill=\"none\" stroke=\"#facc15\" stroke-width=\"" + strokeWidth +
                    "\" stroke-dasharray=\"8,4\" />";
            }
        }

        if (currentState.orthoDrawingCrop) {
            const drawingRect = PhotoMeasurePro__OrthoStage__PlaneCropToCanvasRect(currentState.orthoDrawingCrop, orthoGeometry, renderResult);
            if (drawingRect) {
                markup += "<rect x=\"" + drawingRect.x + "\" y=\"" + drawingRect.y +
                    "\" width=\"" + drawingRect.width + "\" height=\"" + drawingRect.height +
                    "\" fill=\"rgba(250,204,21,0.12)\" stroke=\"#facc15\" stroke-width=\"" + strokeWidth +
                    "\" stroke-dasharray=\"4,4\" />";
            }
        }

        return markup;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Project Image Pixel Through Homography To Canvas Pixel
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__ImagePointToCanvasPixel(imagePoint, orthoGeometry, renderResult) {
        const homographyUtils = window.PhotoMeasurePro__MathUtils__PlanarHomography;
        const planePoint = homographyUtils.PhotoMeasurePro__PlanarHomography__ApplyHomography(
            orthoGeometry.homography,
            [imagePoint.x, imagePoint.y]
        );
        if (!planePoint || !Number.isFinite(planePoint[0]) || !Number.isFinite(planePoint[1])) return null;

        const planeBounds = renderResult.planeBounds || orthoGeometry.planeBounds;
        const canvasX = (planePoint[0] - planeBounds.minRight) / planeBounds.width * renderResult.outputWidth;
        const canvasY = (planeBounds.maxUp - planePoint[1]) / planeBounds.height * renderResult.outputHeight;
        return { x: canvasX, y: canvasY };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Convert Plane-Space Crop To Canvas-Space Rect
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__PlaneCropToCanvasRect(planeCrop, orthoGeometry, renderResult) {
        const planeBounds = renderResult.planeBounds || orthoGeometry.planeBounds;
        const xCanvas = (planeCrop.minRight - planeBounds.minRight) / planeBounds.width * renderResult.outputWidth;
        const yCanvas = (planeBounds.maxUp - planeCrop.maxUp) / planeBounds.height * renderResult.outputHeight;
        const widthCanvas  = (planeCrop.maxRight - planeCrop.minRight) / planeBounds.width * renderResult.outputWidth;
        const heightCanvas = (planeCrop.maxUp - planeCrop.minUp) / planeBounds.height * renderResult.outputHeight;
        if (!Number.isFinite(widthCanvas) || !Number.isFinite(heightCanvas)) return null;
        return { x: xCanvas, y: yCanvas, width: widthCanvas, height: heightCanvas };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Convert Canvas-Pixel Point To Plane-Space (mm)
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__CanvasPixelToPlaneMm(canvasPoint, renderResult, orthoGeometry) {
        const planeBounds = renderResult ? (renderResult.planeBounds || orthoGeometry.planeBounds) : orthoGeometry.planeBounds;
        const outputWidth  = renderResult ? renderResult.outputWidth  : null;
        const outputHeight = renderResult ? renderResult.outputHeight : null;
        if (!outputWidth || !outputHeight) return null;
        return {
            right: planeBounds.minRight + (canvasPoint.x / outputWidth) * planeBounds.width,
            up:    planeBounds.maxUp    - (canvasPoint.y / outputHeight) * planeBounds.height
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Convert Client Pointer To Canvas-Pixel Point
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__GetCanvasSpacePoint(clientX, clientY, viewportRoot, currentState, renderResult) {
        const viewportRect = viewportRoot.getBoundingClientRect();
        const deltaX = clientX - viewportRect.left;
        const deltaY = clientY - viewportRect.top;
        const transformData = PhotoMeasurePro__OrthoStage__ResolveInteractionTransform(currentState, viewportRoot, renderResult);
        const safeScale = transformData.scale || 1;
        return {
            x: (deltaX - transformData.x) / safeScale,
            y: (deltaY - transformData.y) / safeScale
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Resolve Interaction Transform (Matches Display Transform)
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__ResolveInteractionTransform(currentState, viewportRoot, renderResult) {
        if (renderResult && renderResult.outputWidth && renderResult.outputHeight) {
            return PhotoMeasurePro__OrthoStage__ResolveDisplayTransform(
                currentState,
                viewportRoot,
                renderResult.outputWidth,
                renderResult.outputHeight
            );
        }
        return currentState.orthoTransform || { x: 0, y: 0, scale: 1, userAdjusted: false };
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Pointer Down On Ortho Viewport
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__HandlePointerDown(pointerEvent, domRefs) {
        pointerEvent.preventDefault();

        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        if (!currentState.imageUrl) return;

        if (pointerEvent.button === 1 || pointerEvent.button === 2) {
            if (pointerEvent.currentTarget.setPointerCapture) {
                pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
            }
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return {
                    orthoIsPanning: true,
                    orthoLastPan: { x: pointerEvent.clientX, y: pointerEvent.clientY }
                };
            });
            return;
        }

        if (currentState.orthoCropMode) {
            const renderResult = PhotoMeasurePro__OrthoStage__LastRenderedGeometry
                ? { outputWidth: domRefs.PhotoMeasurePro__CanvasViewport__OrthoCanvasElement.width, outputHeight: domRefs.PhotoMeasurePro__CanvasViewport__OrthoCanvasElement.height, planeBounds: PhotoMeasurePro__OrthoStage__LastRenderedGeometry.planeBounds }
                : null;
            if (!renderResult) return;

            if (pointerEvent.currentTarget.setPointerCapture) {
                pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
            }
            const canvasPoint = PhotoMeasurePro__OrthoStage__GetCanvasSpacePoint(
                pointerEvent.clientX, pointerEvent.clientY,
                domRefs.PhotoMeasurePro__OrthoWarpAndExport__Viewport, currentState, renderResult
            );
            const planePoint = PhotoMeasurePro__OrthoStage__CanvasPixelToPlaneMm(canvasPoint, renderResult, PhotoMeasurePro__OrthoStage__LastRenderedGeometry);
            if (!planePoint) return;

            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return {
                    orthoDrawingCrop: {
                        startRight: planePoint.right,
                        startUp:    planePoint.up,
                        minRight:   planePoint.right,
                        maxRight:   planePoint.right,
                        minUp:      planePoint.up,
                        maxUp:      planePoint.up
                    }
                };
            });
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Pointer Move On Ortho Viewport
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__HandlePointerMove(pointerEvent, domRefs) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        if (!currentState.imageUrl) return;

        if (currentState.orthoIsPanning) {
            const deltaX = pointerEvent.clientX - currentState.orthoLastPan.x;
            const deltaY = pointerEvent.clientY - currentState.orthoLastPan.y;
            stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
                const previousTransform = previousState.orthoTransform;
                return {
                    orthoTransform: {
                        x: previousTransform.x + deltaX,
                        y: previousTransform.y + deltaY,
                        scale: previousTransform.scale,
                        userAdjusted: true
                    },
                    orthoLastPan: { x: pointerEvent.clientX, y: pointerEvent.clientY }
                };
            });
            return;
        }

        if (currentState.orthoDrawingCrop && PhotoMeasurePro__OrthoStage__LastRenderedGeometry) {
            const renderResult = {
                outputWidth: domRefs.PhotoMeasurePro__CanvasViewport__OrthoCanvasElement.width,
                outputHeight: domRefs.PhotoMeasurePro__CanvasViewport__OrthoCanvasElement.height,
                planeBounds: PhotoMeasurePro__OrthoStage__LastRenderedGeometry.planeBounds
            };
            const canvasPoint = PhotoMeasurePro__OrthoStage__GetCanvasSpacePoint(
                pointerEvent.clientX, pointerEvent.clientY,
                domRefs.PhotoMeasurePro__OrthoWarpAndExport__Viewport, currentState, renderResult
            );
            const planePoint = PhotoMeasurePro__OrthoStage__CanvasPixelToPlaneMm(canvasPoint, renderResult, PhotoMeasurePro__OrthoStage__LastRenderedGeometry);
            if (!planePoint) return;

            stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
                const drawing = previousState.orthoDrawingCrop;
                const minRight = Math.min(drawing.startRight, planePoint.right);
                const maxRight = Math.max(drawing.startRight, planePoint.right);
                const minUp    = Math.min(drawing.startUp,    planePoint.up);
                const maxUp    = Math.max(drawing.startUp,    planePoint.up);
                return {
                    orthoDrawingCrop: Object.assign({}, drawing, {
                        minRight: minRight, maxRight: maxRight,
                        minUp: minUp, maxUp: maxUp
                    })
                };
            });
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Pointer Up On Ortho Viewport
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__HandlePointerUp(pointerEvent, domRefs) {
        if (
            pointerEvent.currentTarget.hasPointerCapture &&
            pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)
        ) {
            pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
        }

        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();

        if ((pointerEvent.button === 1 || pointerEvent.button === 2) || (currentState.orthoIsPanning && pointerEvent.buttons === 0)) {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() { return { orthoIsPanning: false }; });
            return;
        }

        if (currentState.orthoDrawingCrop) {
            const drawing = currentState.orthoDrawingCrop;
            const widthMm = drawing.maxRight - drawing.minRight;
            const heightMm = drawing.maxUp - drawing.minUp;
            if (widthMm > 1 && heightMm > 1) {
                stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                    return {
                        orthoCrop: {
                            minRight: drawing.minRight,
                            maxRight: drawing.maxRight,
                            minUp: drawing.minUp,
                            maxUp: drawing.maxUp
                        },
                        orthoDrawingCrop: null,
                        orthoCropMode: false
                    };
                });
            } else {
                stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                    return { orthoDrawingCrop: null };
                });
            }
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Pointer Leaving Viewport
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__HandlePointerLeave(pointerEvent) {
        if (pointerEvent.buttons !== 0) return;
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            if (!previousState.orthoIsPanning) return {};
            return { orthoIsPanning: false };
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Pointer Cancellation
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__HandlePointerCancel(pointerEvent) {
        if (
            pointerEvent.currentTarget &&
            pointerEvent.currentTarget.hasPointerCapture &&
            pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)
        ) {
            pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
        }
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const patch = {};
            if (previousState.orthoIsPanning) patch.orthoIsPanning = false;
            if (previousState.orthoDrawingCrop) patch.orthoDrawingCrop = null;
            return patch;
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Lost Pointer Capture Cleanup
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__HandlePointerCaptureLost() {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            if (!previousState.orthoIsPanning) return {};
            return { orthoIsPanning: false };
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Wheel Zoom On Ortho Viewport
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__HandleWheelZoom(wheelEvent, domRefs) {
        wheelEvent.preventDefault();
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        if (!currentState.imageUrl) return;

        const viewportRoot = domRefs.PhotoMeasurePro__OrthoWarpAndExport__Viewport;
        const viewportRect = viewportRoot.getBoundingClientRect();
        const mouseX = wheelEvent.clientX - viewportRect.left;
        const mouseY = wheelEvent.clientY - viewportRect.top;
        const zoomFactor = wheelEvent.deltaY > 0 ? 0.9 : 1.1;
        const minScale = currentState.appConfig.PhotoMeasurePro__Application__MinZoomScale || 0.1;
        const maxScale = currentState.appConfig.PhotoMeasurePro__Application__MaxZoomScale || 30;

        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const previousTransform = previousState.orthoTransform;
            const nextScale = Math.min(Math.max(previousTransform.scale * zoomFactor, minScale), maxScale);
            const nextX = mouseX - (mouseX - previousTransform.x) * (nextScale / previousTransform.scale);
            const nextY = mouseY - (mouseY - previousTransform.y) * (nextScale / previousTransform.scale);
            return {
                orthoTransform: { x: nextX, y: nextY, scale: nextScale, userAdjusted: true }
            };
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Invalidate Render Caches (called when source image changes)
    // ------------------------------------------------------------
    function PhotoMeasurePro__OrthoStage__InvalidateCaches() {
        PhotoMeasurePro__OrthoStage__LastRenderedGeometry = null;
        PhotoMeasurePro__OrthoStage__LastRenderSignature = null;
        PhotoMeasurePro__OrthoStage__LastRenderResult = null;
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__OrthoStage__Initialize: PhotoMeasurePro__OrthoStage__Initialize,
        PhotoMeasurePro__OrthoStage__Render: PhotoMeasurePro__OrthoStage__Render,
        PhotoMeasurePro__OrthoStage__InvalidateCaches: PhotoMeasurePro__OrthoStage__InvalidateCaches
    };
})();

window.PhotoMeasurePro__System__CanvasViewport__OrthoStage = PhotoMeasurePro__System__CanvasViewport__OrthoStage;
// endregion ----------------------------------------------------
