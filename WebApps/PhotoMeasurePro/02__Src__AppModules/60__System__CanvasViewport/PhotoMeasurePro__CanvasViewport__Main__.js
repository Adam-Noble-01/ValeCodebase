// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Canvas Viewport System
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__CanvasViewport__Main = (function() {

    // FUNCTION | Initialize Canvas Interaction Listeners
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__Initialize(domRefs) {
        const viewportRoot = domRefs.PhotoMeasurePro__CanvasViewport__ViewportRoot;

        viewportRoot.style.touchAction = "none";
        viewportRoot.addEventListener("contextmenu", function(contextMenuEvent) { contextMenuEvent.preventDefault(); });
        viewportRoot.addEventListener("wheel", function(wheelEvent) {
            PhotoMeasurePro__CanvasViewport__HandleWheelZoom(wheelEvent, domRefs);
        }, { passive: false });

        viewportRoot.addEventListener("pointerdown", function(pointerEvent) {
            PhotoMeasurePro__CanvasViewport__HandlePointerDown(pointerEvent, domRefs);
        });

        viewportRoot.addEventListener("pointermove", function(pointerEvent) {
            PhotoMeasurePro__CanvasViewport__HandlePointerMove(pointerEvent, domRefs);
        });

        viewportRoot.addEventListener("pointerup", function(pointerEvent) {
            PhotoMeasurePro__CanvasViewport__HandlePointerUp(pointerEvent);
        });

        viewportRoot.addEventListener("pointerleave", function(pointerEvent) {
            PhotoMeasurePro__CanvasViewport__HandlePointerUp(pointerEvent);
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Render Canvas Stage + SVG Overlay
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__Render(domRefs, currentState, derivedData) {
        const modeManager = window.PhotoMeasurePro__AppCore__ModeManager;
        const measurementEngine = window.PhotoMeasurePro__System__Measurement__Engine;
        const domHelpers = window.PhotoMeasurePro__AppUtils__DomHelpers;

        domHelpers.PhotoMeasurePro__DomHelpers__SetHiddenByClass(
            domRefs.PhotoMeasurePro__CanvasViewport__DropHint,
            Boolean(currentState.imageUrl),
            "PhotoMeasurePro__CanvasViewport__DropHint--hidden"
        );

        if (!currentState.imageUrl) {
            domRefs.PhotoMeasurePro__CanvasViewport__ImageElement.removeAttribute("src");
            domRefs.PhotoMeasurePro__CanvasViewport__SvgOverlay.innerHTML = "";
            return;
        }

        domRefs.PhotoMeasurePro__CanvasViewport__ImageElement.src = currentState.imageUrl;
        domRefs.PhotoMeasurePro__CanvasViewport__ImageElement.style.filter = currentState.showDepthMap ? "grayscale(100%) contrast(150%)" : "none";

        const stageSurface = domRefs.PhotoMeasurePro__CanvasViewport__StageSurface;
        stageSurface.style.width = currentState.imgSize.w + "px";
        stageSurface.style.height = currentState.imgSize.h + "px";
        stageSurface.style.transform = "translate(" + currentState.transform.x + "px, " + currentState.transform.y + "px) scale(" + currentState.transform.scale + ")";

        const svgOverlay = domRefs.PhotoMeasurePro__CanvasViewport__SvgOverlay;
        svgOverlay.setAttribute("viewBox", "0 0 " + currentState.imgSize.w + " " + currentState.imgSize.h);
        svgOverlay.innerHTML = PhotoMeasurePro__CanvasViewport__BuildSvgMarkup(
            currentState,
            derivedData,
            measurementEngine
        );

        if (currentState.mode === "ortho") {
            domRefs.PhotoMeasurePro__CanvasViewport__OrthoImageElement.src = currentState.imageUrl;
            if (derivedData.orthoStyle) {
                domRefs.PhotoMeasurePro__CanvasViewport__OrthoImageElement.style.transform = derivedData.orthoStyle.transform;
                domRefs.PhotoMeasurePro__CanvasViewport__OrthoImageElement.style.transformOrigin = derivedData.orthoStyle.transformOrigin;
            }
            domRefs.PhotoMeasurePro__CanvasViewport__OrthoInfoCard.textContent =
                "Orthographic projection preview | " +
                window.PhotoMeasurePro__System__OrthoWarpAndExport__Engine.PhotoMeasurePro__OrthoWarpAndExport__GetPlaneLabel(currentState.measurePlane);
        }

        modeManager.PhotoMeasurePro__ModeManager__RenderModeUi(currentState, domRefs);
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build SVG Overlay Markup
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__BuildSvgMarkup(currentState, derivedData, measurementEngine) {
        const perspectiveData = derivedData.perspectiveData;
        const allLines = currentState.drawingLine ? currentState.lines.concat([currentState.drawingLine]) : currentState.lines;
        const crosshairSize = (Math.max(currentState.imgSize.w, currentState.imgSize.h) * 0.01) / currentState.transform.scale;

        let markupBuffer = "";

        if (currentState.mode === "setup" && perspectiveData) {
            markupBuffer += "<g opacity=\"0.3\">";
            markupBuffer += PhotoMeasurePro__CanvasViewport__BuildVpGuideMarkup("x", perspectiveData.VPx, "#ef4444", currentState.lines);
            markupBuffer += PhotoMeasurePro__CanvasViewport__BuildVpGuideMarkup("y", perspectiveData.VPy, "#22c55e", currentState.lines);
            markupBuffer += PhotoMeasurePro__CanvasViewport__BuildVpGuideMarkup("z", perspectiveData.VPz, "#3b82f6", currentState.lines);
            markupBuffer += "</g>";
        }

        allLines.forEach(function(lineItem) {
            const strokeColor = measurementEngine.PhotoMeasurePro__Measurement__GetStrokeColor(lineItem.type);
            const lineStrokeWidth = lineItem.id === currentState.selectedLineId ? 3 : 1.5;
            const labelText = measurementEngine.PhotoMeasurePro__Measurement__FormatLineLabel(
                lineItem,
                currentState,
                perspectiveData,
                derivedData.scaleValue
            );

            markupBuffer += "<g>";
            markupBuffer += "<line x1=\"" + lineItem.start.x + "\" y1=\"" + lineItem.start.y + "\" x2=\"" + lineItem.end.x + "\" y2=\"" + lineItem.end.y +
                "\" stroke=\"" + strokeColor + "\" stroke-width=\"" + lineStrokeWidth + "\" stroke-dasharray=\"6,4\" vector-effect=\"non-scaling-stroke\" stroke-linecap=\"round\" />";

            markupBuffer += PhotoMeasurePro__CanvasViewport__BuildCrosshairMarkup(lineItem.start.x, lineItem.start.y, crosshairSize, strokeColor);
            markupBuffer += PhotoMeasurePro__CanvasViewport__BuildCrosshairMarkup(lineItem.end.x, lineItem.end.y, crosshairSize, strokeColor);

            if (labelText) {
                const midX = (lineItem.start.x + lineItem.end.x) / 2;
                const midY = (lineItem.start.y + lineItem.end.y) / 2;
                const textOffsetY = (currentState.dimensionSize / currentState.transform.scale);
                const textSize = currentState.dimensionSize / currentState.transform.scale;
                markupBuffer += "<text x=\"" + midX + "\" y=\"" + (midY - textOffsetY) + "\" fill=\"" + strokeColor +
                    "\" font-weight=\"700\" font-size=\"" + textSize + "\" text-anchor=\"middle\">" + labelText + "</text>";
            }

            markupBuffer += "</g>";
        });

        return markupBuffer;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Vanishing Point Guide Lines
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__BuildVpGuideMarkup(lineType, vanishingPoint, strokeColor, lineList) {
        if (!vanishingPoint || vanishingPoint[2] === 0) return "";

        const vpX = vanishingPoint[0] / vanishingPoint[2];
        const vpY = vanishingPoint[1] / vanishingPoint[2];
        let guideMarkup = "";

        lineList.filter(function(lineItem) { return lineItem.type === lineType; }).forEach(function(lineItem) {
            guideMarkup += "<line x1=\"" + lineItem.start.x + "\" y1=\"" + lineItem.start.y + "\" x2=\"" + vpX + "\" y2=\"" + vpY +
                "\" stroke=\"" + strokeColor + "\" stroke-width=\"1\" stroke-dasharray=\"10,10\" vector-effect=\"non-scaling-stroke\" />";
        });

        return guideMarkup;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Endpoint Crosshair Path
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__BuildCrosshairMarkup(xPos, yPos, sizeValue, strokeColor) {
        const pathData = "M " + (xPos - sizeValue) + " " + yPos + " L " + (xPos + sizeValue) + " " + yPos +
            " M " + xPos + " " + (yPos - sizeValue) + " L " + xPos + " " + (yPos + sizeValue);
        return "<path d=\"" + pathData + "\" stroke=\"" + strokeColor + "\" stroke-width=\"2\" vector-effect=\"non-scaling-stroke\" />";
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Pointer Down
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__HandlePointerDown(pointerEvent, domRefs) {
        pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
        pointerEvent.preventDefault();

        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const idGenerator = window.PhotoMeasurePro__AppUtils__IdGenerator;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        if (!currentState.imageUrl) return;

        if (pointerEvent.button === 1 || pointerEvent.button === 2) {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
                return {
                    isPanning: true,
                    lastPan: { x: pointerEvent.clientX, y: pointerEvent.clientY }
                };
            });
            return;
        }

        const svgPoint = PhotoMeasurePro__CanvasViewport__GetImageSpacePoint(pointerEvent.clientX, pointerEvent.clientY, domRefs, currentState);
        const hitRadius = (currentState.measurementConfig.PhotoMeasurePro__Measurement__HitRadiusPixels || 30) / currentState.transform.scale;
        const nearestPoint = PhotoMeasurePro__CanvasViewport__FindNearestLineEndpoint(svgPoint, currentState.lines, hitRadius);

        if (nearestPoint) {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { draggingPoint: nearestPoint, selectedLineId: nearestPoint.lineId };
            });
            return;
        }

        if (currentState.mode === "constraint" || currentState.mode === "measure") {
            const lineType = currentState.mode;
            const newLine = {
                id: idGenerator.PhotoMeasurePro__IdGenerator__Create(lineType),
                type: lineType,
                start: svgPoint,
                end: svgPoint,
                lengthInput: lineType === "constraint" ? currentState.constraintLengthMm : undefined
            };

            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return {
                    drawingLine: newLine,
                    selectedLineId: newLine.id
                };
            });
            return;
        }

        stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
            return { selectedLineId: null };
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Pointer Move
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__HandlePointerMove(pointerEvent, domRefs) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        if (!currentState.imageUrl) return;

        if (currentState.isPanning) {
            const deltaX = pointerEvent.clientX - currentState.lastPan.x;
            const deltaY = pointerEvent.clientY - currentState.lastPan.y;
            stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
                return {
                    transform: {
                        x: previousState.transform.x + deltaX,
                        y: previousState.transform.y + deltaY,
                        scale: previousState.transform.scale
                    },
                    lastPan: { x: pointerEvent.clientX, y: pointerEvent.clientY }
                };
            });
            return;
        }

        const svgPoint = PhotoMeasurePro__CanvasViewport__GetImageSpacePoint(pointerEvent.clientX, pointerEvent.clientY, domRefs, currentState);
        if (currentState.draggingPoint) {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
                const updatedLines = previousState.lines.map(function(lineItem) {
                    if (lineItem.id !== previousState.draggingPoint.lineId) return lineItem;
                    const updatedLine = Object.assign({}, lineItem);
                    updatedLine[previousState.draggingPoint.end] = svgPoint;
                    return updatedLine;
                });
                return { lines: updatedLines };
            });
            return;
        }

        if (currentState.drawingLine) {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
                return {
                    drawingLine: Object.assign({}, previousState.drawingLine, { end: svgPoint })
                };
            });
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Pointer Up
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__HandlePointerUp(pointerEvent) {
        if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
            pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
        }

        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();

        if (pointerEvent.button === 1 || pointerEvent.button === 2) {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() { return { isPanning: false }; });
            return;
        }

        if (currentState.drawingLine) {
            const threshold = currentState.measurementConfig.PhotoMeasurePro__Measurement__DragThresholdPixels || 10;
            const lineDistance = Math.hypot(
                currentState.drawingLine.end.x - currentState.drawingLine.start.x,
                currentState.drawingLine.end.y - currentState.drawingLine.start.y
            );

            stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
                let updatedLines = previousState.lines.slice();
                if (lineDistance > threshold) {
                    if (previousState.drawingLine.type === "constraint") {
                        updatedLines = updatedLines.filter(function(lineItem) { return lineItem.type !== "constraint"; });
                    }
                    updatedLines.push(previousState.drawingLine);
                }

                return {
                    lines: updatedLines,
                    drawingLine: null,
                    draggingPoint: null
                };
            });
            return;
        }

        stateManager.PhotoMeasurePro__StateManager__PatchState(function() { return { draggingPoint: null }; });
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Wheel Zoom
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__HandleWheelZoom(wheelEvent, domRefs) {
        wheelEvent.preventDefault();
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        if (!currentState.imageUrl) return;

        const viewportRect = domRefs.PhotoMeasurePro__CanvasViewport__ViewportRoot.getBoundingClientRect();
        const mouseX = wheelEvent.clientX - viewportRect.left;
        const mouseY = wheelEvent.clientY - viewportRect.top;
        const zoomFactor = wheelEvent.deltaY > 0 ? 0.9 : 1.1;
        const minScale = currentState.appConfig.PhotoMeasurePro__Application__MinZoomScale || 0.1;
        const maxScale = currentState.appConfig.PhotoMeasurePro__Application__MaxZoomScale || 30;

        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const nextScale = Math.min(Math.max(previousState.transform.scale * zoomFactor, minScale), maxScale);
            const nextX = mouseX - (mouseX - previousState.transform.x) * (nextScale / previousState.transform.scale);
            const nextY = mouseY - (mouseY - previousState.transform.y) * (nextScale / previousState.transform.scale);
            return {
                transform: { x: nextX, y: nextY, scale: nextScale }
            };
        });
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Convert Viewport Point To Image Point
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__GetImageSpacePoint(clientX, clientY, domRefs, currentState) {
        const viewportRect = domRefs.PhotoMeasurePro__CanvasViewport__ViewportRoot.getBoundingClientRect();
        const deltaX = clientX - viewportRect.left;
        const deltaY = clientY - viewportRect.top;

        return {
            x: (deltaX - currentState.transform.x) / currentState.transform.scale,
            y: (deltaY - currentState.transform.y) / currentState.transform.scale
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Find Closest Endpoint Hit
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__FindNearestLineEndpoint(targetPoint, lineList, hitRadius) {
        let nearestEndpoint = null;
        let minimumDistance = hitRadius;

        lineList.forEach(function(lineItem) {
            const distanceToStart = Math.hypot(lineItem.start.x - targetPoint.x, lineItem.start.y - targetPoint.y);
            if (distanceToStart <= minimumDistance) {
                nearestEndpoint = { lineId: lineItem.id, end: "start" };
                minimumDistance = distanceToStart;
            }

            const distanceToEnd = Math.hypot(lineItem.end.x - targetPoint.x, lineItem.end.y - targetPoint.y);
            if (distanceToEnd <= minimumDistance) {
                nearestEndpoint = { lineId: lineItem.id, end: "end" };
                minimumDistance = distanceToEnd;
            }
        });

        return nearestEndpoint;
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__CanvasViewport__Initialize: PhotoMeasurePro__CanvasViewport__Initialize,
        PhotoMeasurePro__CanvasViewport__Render: PhotoMeasurePro__CanvasViewport__Render
    };
})();

window.PhotoMeasurePro__System__CanvasViewport__Main = PhotoMeasurePro__System__CanvasViewport__Main;
// endregion ----------------------------------------------------
