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
        const orthoStage = window.PhotoMeasurePro__System__CanvasViewport__OrthoStage;
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
        svgOverlay.innerHTML = PhotoMeasurePro__CanvasViewport__BuildSvgMarkup(currentState, derivedData, measurementEngine);

        if (currentState.mode === "ortho" && orthoStage) {
            orthoStage.PhotoMeasurePro__OrthoStage__Render(domRefs, currentState, derivedData);
        }

        modeManager.PhotoMeasurePro__ModeManager__RenderModeUi(currentState, domRefs);
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build SVG Overlay Markup
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__BuildSvgMarkup(currentState, derivedData, measurementEngine) {
        const perspectiveData = derivedData.perspectiveData;
        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        const axisColors = coordinateSpace.PhotoMeasurePro__CoordinateSpace__AxisColors;
        const allLines = currentState.drawingLine ? currentState.lines.concat([currentState.drawingLine]) : currentState.lines;
        const crosshairSize = (Math.max(currentState.imgSize.w, currentState.imgSize.h) * 0.01) / currentState.transform.scale;
        const textSizeFull = currentState.dimensionSize / currentState.transform.scale;
        const textSizeSmall = textSizeFull * 0.7;
        const pairRolesByAxisLetter = PhotoMeasurePro__CanvasViewport__BuildPairRoleMap(currentState.lines);
        const visualSettings = currentState.visualSettings || {};
        const axisThickness = visualSettings.axisLineThickness || 1.5;
        const dimThickness = visualSettings.dimensionLineThickness || 1.5;

        let markupBuffer = "";

        if (currentState.mode === "setup" && perspectiveData) {
            markupBuffer += "<g opacity=\"0.3\">";
            markupBuffer += PhotoMeasurePro__CanvasViewport__BuildVpGuideMarkup("X", perspectiveData.VPx, axisColors.X, currentState.lines, axisThickness);
            markupBuffer += PhotoMeasurePro__CanvasViewport__BuildVpGuideMarkup("Y", perspectiveData.VPy, axisColors.Y, currentState.lines, axisThickness);
            markupBuffer += PhotoMeasurePro__CanvasViewport__BuildVpGuideMarkup("Z", perspectiveData.VPz, axisColors.Z, currentState.lines, axisThickness);
            markupBuffer += "</g>";
        }

        allLines.forEach(function(lineItem) {
            if (lineItem.type === "angle") {
                markupBuffer += PhotoMeasurePro__CanvasViewport__BuildAngleMarkup(
                    lineItem, currentState, perspectiveData, crosshairSize, textSizeFull, dimThickness, measurementEngine
                );
                return;
            }
            if (lineItem.type === "guide") {
                markupBuffer += PhotoMeasurePro__CanvasViewport__BuildGuideLineMarkup(
                    lineItem, currentState, perspectiveData, crosshairSize, textSizeSmall, axisThickness
                );
                return;
            }

            const strokeColor = measurementEngine.PhotoMeasurePro__Measurement__GetStrokeColor(lineItem.type);
            const isAxisLine = Boolean(coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetAxisLetterForLineType(lineItem.type));
            const baseStrokeWidth = isAxisLine ? axisThickness : dimThickness;
            const lineStrokeWidth = lineItem.id === currentState.selectedLineId ? baseStrokeWidth * 2 : baseStrokeWidth;
            const labelText = measurementEngine.PhotoMeasurePro__Measurement__FormatLineLabel(
                lineItem,
                currentState,
                perspectiveData,
                derivedData.scalesByPlane
            );

            markupBuffer += "<g>";
            markupBuffer += "<line x1=\"" + lineItem.start.x + "\" y1=\"" + lineItem.start.y + "\" x2=\"" + lineItem.end.x + "\" y2=\"" + lineItem.end.y +
                "\" stroke=\"" + strokeColor + "\" stroke-width=\"" + lineStrokeWidth + "\" stroke-dasharray=\"6,4\" vector-effect=\"non-scaling-stroke\" stroke-linecap=\"round\" />";

            markupBuffer += PhotoMeasurePro__CanvasViewport__BuildCrosshairMarkup(lineItem.start.x, lineItem.start.y, crosshairSize, strokeColor, baseStrokeWidth);
            markupBuffer += PhotoMeasurePro__CanvasViewport__BuildCrosshairMarkup(lineItem.end.x, lineItem.end.y, crosshairSize, strokeColor, baseStrokeWidth);

            if (labelText) {
                const midX = (lineItem.start.x + lineItem.end.x) / 2;
                const midY = (lineItem.start.y + lineItem.end.y) / 2;
                markupBuffer += PhotoMeasurePro__CanvasViewport__BuildHaloedText(midX, midY - textSizeFull, textSizeFull, strokeColor, labelText, "middle");
            }

            if (currentState.mode === "setup") {
                markupBuffer += PhotoMeasurePro__CanvasViewport__BuildPerspectiveLineLabels(
                    lineItem,
                    textSizeSmall,
                    strokeColor,
                    pairRolesByAxisLetter
                );
            }

            markupBuffer += "</g>";
        });

        if (currentState.drawingAngle) {
            markupBuffer += PhotoMeasurePro__CanvasViewport__BuildAngleMarkup(
                currentState.drawingAngle, currentState, perspectiveData, crosshairSize, textSizeFull, dimThickness, measurementEngine
            );
        }

        if (currentState.anchorPoint) {
            markupBuffer += PhotoMeasurePro__CanvasViewport__BuildAnchorMarkerMarkup(currentState.anchorPoint, crosshairSize, textSizeSmall);
        }

        return markupBuffer;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build SVG Markup For A Guide Line
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__BuildGuideLineMarkup(guideLine, currentState, perspectiveData, crosshairSize, textSizeSmall, axisThickness) {
        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        const guidesEngine = window.PhotoMeasurePro__System__Guides__Engine;
        const guideColor = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetColorForGuide(guideLine.axis);
        const baseStrokeWidth = Math.max(0.8, axisThickness * 0.8);
        const strokeWidth = guideLine.id === currentState.selectedLineId ? baseStrokeWidth * 2 : baseStrokeWidth;

        const refreshedLine = perspectiveData
            ? guidesEngine.PhotoMeasurePro__Guides__RefreshGuideEndpoints(guideLine, perspectiveData, currentState.imgSize)
            : guideLine;

        let markup = "<g>";
        markup += "<line x1=\"" + refreshedLine.start.x + "\" y1=\"" + refreshedLine.start.y +
            "\" x2=\"" + refreshedLine.end.x + "\" y2=\"" + refreshedLine.end.y +
            "\" stroke=\"" + guideColor + "\" stroke-width=\"" + strokeWidth +
            "\" stroke-dasharray=\"10,6\" stroke-opacity=\"0.85\" vector-effect=\"non-scaling-stroke\" stroke-linecap=\"round\" />";

        markup += PhotoMeasurePro__CanvasViewport__BuildCrosshairMarkup(
            guideLine.anchor.x, guideLine.anchor.y, crosshairSize * 0.9, guideColor, baseStrokeWidth * 1.4
        );

        markup += PhotoMeasurePro__CanvasViewport__BuildHaloedText(
            guideLine.anchor.x + crosshairSize * 1.5,
            guideLine.anchor.y - crosshairSize * 0.8,
            textSizeSmall,
            guideColor,
            guideLine.axis,
            "start"
        );
        markup += "</g>";
        return markup;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build SVG Markup For An Angle Measurement
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__BuildAngleMarkup(angleItem, currentState, perspectiveData, crosshairSize, textSizeFull, dimThickness, measurementEngine) {
        if (!angleItem.vertex) return "";
        const strokeColor = "#a855f7";
        const isSelected = angleItem.id === currentState.selectedLineId;
        const strokeWidth = (isSelected ? dimThickness * 2 : dimThickness);

        const vertex = angleItem.vertex;
        const armA = angleItem.armA;
        const armB = angleItem.armB;

        let markup = "<g>";

        markup += PhotoMeasurePro__CanvasViewport__BuildCrosshairMarkup(vertex.x, vertex.y, crosshairSize, strokeColor, dimThickness * 1.2);

        if (armA) {
            markup += "<line x1=\"" + vertex.x + "\" y1=\"" + vertex.y + "\" x2=\"" + armA.x + "\" y2=\"" + armA.y +
                "\" stroke=\"" + strokeColor + "\" stroke-width=\"" + strokeWidth +
                "\" stroke-dasharray=\"6,4\" vector-effect=\"non-scaling-stroke\" stroke-linecap=\"round\" />";
            markup += PhotoMeasurePro__CanvasViewport__BuildCrosshairMarkup(armA.x, armA.y, crosshairSize * 0.7, strokeColor, dimThickness);
        }
        if (armB) {
            markup += "<line x1=\"" + vertex.x + "\" y1=\"" + vertex.y + "\" x2=\"" + armB.x + "\" y2=\"" + armB.y +
                "\" stroke=\"" + strokeColor + "\" stroke-width=\"" + strokeWidth +
                "\" stroke-dasharray=\"6,4\" vector-effect=\"non-scaling-stroke\" stroke-linecap=\"round\" />";
            markup += PhotoMeasurePro__CanvasViewport__BuildCrosshairMarkup(armB.x, armB.y, crosshairSize * 0.7, strokeColor, dimThickness);
        }

        if (armA && armB) {
            markup += PhotoMeasurePro__CanvasViewport__BuildAngleArc(vertex, armA, armB, crosshairSize * 2.4, strokeColor, strokeWidth * 0.8);
            const angleLabel = measurementEngine.PhotoMeasurePro__Measurement__FormatAngleLabel(angleItem, currentState, perspectiveData);
            if (angleLabel) {
                const bisectorX = (armA.x + armB.x) / 2 - vertex.x;
                const bisectorY = (armA.y + armB.y) / 2 - vertex.y;
                const bisectorLength = Math.hypot(bisectorX, bisectorY) || 1;
                const labelDistance = crosshairSize * 3.5;
                const labelX = vertex.x + (bisectorX / bisectorLength) * labelDistance;
                const labelY = vertex.y + (bisectorY / bisectorLength) * labelDistance;
                markup += PhotoMeasurePro__CanvasViewport__BuildHaloedText(labelX, labelY, textSizeFull, strokeColor, angleLabel, "middle");
            }
        }

        markup += "</g>";
        return markup;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build A 2D SVG Arc Between Two Arms At A Vertex
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__BuildAngleArc(vertex, armA, armB, arcRadius, strokeColor, strokeWidth) {
        const angleA = Math.atan2(armA.y - vertex.y, armA.x - vertex.x);
        const angleB = Math.atan2(armB.y - vertex.y, armB.x - vertex.x);
        let deltaAngle = angleB - angleA;
        while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
        while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
        const sweepFlag = deltaAngle >= 0 ? 1 : 0;
        const largeArcFlag = 0;

        const arcStart = { x: vertex.x + Math.cos(angleA) * arcRadius, y: vertex.y + Math.sin(angleA) * arcRadius };
        const arcEnd   = { x: vertex.x + Math.cos(angleB) * arcRadius, y: vertex.y + Math.sin(angleB) * arcRadius };

        const pathData = "M " + arcStart.x + " " + arcStart.y +
            " A " + arcRadius + " " + arcRadius + " 0 " + largeArcFlag + " " + sweepFlag + " " + arcEnd.x + " " + arcEnd.y;

        return "<path d=\"" + pathData + "\" fill=\"none\" stroke=\"" + strokeColor +
            "\" stroke-width=\"" + strokeWidth + "\" vector-effect=\"non-scaling-stroke\" />";
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Determine Line Pair Roles By Axis Letter
    // ------------------------------------------------------------
    // For each axis (X, Y, Z) we find the two perspective lines of that axis and
    // pick the "top" or "left" one based on mean screen coordinate. Returns
    // a map from lineId to its role string ("Top"/"Bottom" for X and Y,
    // "Left"/"Right" for Z).
    function PhotoMeasurePro__CanvasViewport__BuildPairRoleMap(lineList) {
        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        const rolesByLineId = {};
        const axisLetters = ["X", "Y", "Z"];

        axisLetters.forEach(function(axisLetter) {
            const linesForAxis = lineList.filter(function(lineItem) {
                return coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetAxisLetterForLineType(lineItem.type) === axisLetter;
            });
            if (linesForAxis.length < 2) {
                linesForAxis.forEach(function(lineItem) { rolesByLineId[lineItem.id] = ""; });
                return;
            }

            const annotatedLines = linesForAxis.map(function(lineItem) {
                const meanScreenX = (lineItem.start.x + lineItem.end.x) / 2;
                const meanScreenY = (lineItem.start.y + lineItem.end.y) / 2;
                return { item: lineItem, meanX: meanScreenX, meanY: meanScreenY };
            });

            if (axisLetter === "Z") {
                annotatedLines.sort(function(a, b) { return a.meanX - b.meanX; });
                rolesByLineId[annotatedLines[0].item.id] = "Left";
                rolesByLineId[annotatedLines[annotatedLines.length - 1].item.id] = "Right";
            } else {
                annotatedLines.sort(function(a, b) { return a.meanY - b.meanY; });
                rolesByLineId[annotatedLines[0].item.id] = "Top";
                rolesByLineId[annotatedLines[annotatedLines.length - 1].item.id] = "Bottom";
            }
        });

        return rolesByLineId;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Vanishing Point Guide Lines
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__BuildVpGuideMarkup(axisLetter, vanishingPoint, strokeColor, lineList, axisThickness) {
        if (!vanishingPoint || vanishingPoint[2] === 0) return "";

        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        const vpX = vanishingPoint[0] / vanishingPoint[2];
        const vpY = vanishingPoint[1] / vanishingPoint[2];
        const guideStrokeWidth = Math.max(0.5, (axisThickness || 1.5) * 0.6);
        let guideMarkup = "";

        lineList.filter(function(lineItem) {
            return coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetAxisLetterForLineType(lineItem.type) === axisLetter;
        }).forEach(function(lineItem) {
            guideMarkup += "<line x1=\"" + lineItem.start.x + "\" y1=\"" + lineItem.start.y + "\" x2=\"" + vpX + "\" y2=\"" + vpY +
                "\" stroke=\"" + strokeColor + "\" stroke-width=\"" + guideStrokeWidth + "\" stroke-dasharray=\"10,10\" vector-effect=\"non-scaling-stroke\" />";
        });

        return guideMarkup;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Setup-Mode Labels For A Perspective Line
    // ------------------------------------------------------------
    // Pair label (e.g. "X-Top") is rendered near the line midpoint. Endpoint
    // labels are chosen from screen position so they always match the world:
    // verticals get Top (lower screen-y) / Bottom, horizontals get Left / Right.
    function PhotoMeasurePro__CanvasViewport__BuildPerspectiveLineLabels(lineItem, textSizeSmall, strokeColor, pairRolesByAxisLetter) {
        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        const axisLetter = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetAxisLetterForLineType(lineItem.type);
        if (!axisLetter) return "";

        const pairRole = pairRolesByAxisLetter[lineItem.id] || "";
        const pairLabel = pairRole ? (axisLetter + "-" + pairRole) : axisLetter;

        const endpointRoles = PhotoMeasurePro__CanvasViewport__ResolveEndpointRoles(lineItem, axisLetter);
        const startLabel = axisLetter + " " + endpointRoles.startRole;
        const endLabel   = axisLetter + " " + endpointRoles.endRole;

        const midX = (lineItem.start.x + lineItem.end.x) / 2;
        const midY = (lineItem.start.y + lineItem.end.y) / 2;

        const labelOffset = textSizeSmall * 0.6;

        let markup = "";
        markup += PhotoMeasurePro__CanvasViewport__BuildHaloedText(midX, midY - labelOffset, textSizeSmall, strokeColor, pairLabel, "middle");
        markup += PhotoMeasurePro__CanvasViewport__BuildHaloedText(lineItem.start.x + labelOffset, lineItem.start.y - labelOffset, textSizeSmall, strokeColor, startLabel, "start");
        markup += PhotoMeasurePro__CanvasViewport__BuildHaloedText(lineItem.end.x + labelOffset, lineItem.end.y - labelOffset, textSizeSmall, strokeColor, endLabel, "start");
        return markup;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Choose Endpoint Roles Purely From Screen Positions
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__ResolveEndpointRoles(lineItem, axisLetter) {
        if (axisLetter === "Z") {
            if (lineItem.start.y <= lineItem.end.y) {
                return { startRole: "Top", endRole: "Bottom" };
            }
            return { startRole: "Bottom", endRole: "Top" };
        }
        if (lineItem.start.x <= lineItem.end.x) {
            return { startRole: "Left", endRole: "Right" };
        }
        return { startRole: "Right", endRole: "Left" };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build An SVG Text Element With Dark Halo Stroke
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__BuildHaloedText(xPos, yPos, textSize, fillColor, textContent, textAnchor) {
        return "<text x=\"" + xPos + "\" y=\"" + yPos + "\" fill=\"" + fillColor +
            "\" font-weight=\"700\" font-size=\"" + textSize +
            "\" text-anchor=\"" + textAnchor +
            "\" paint-order=\"stroke\" stroke=\"rgba(15,23,42,0.8)\" stroke-width=\"" + (textSize * 0.18) +
            "\">" + textContent + "</text>";
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Endpoint Crosshair Path
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__BuildCrosshairMarkup(xPos, yPos, sizeValue, strokeColor, strokeWidth) {
        const pathData = "M " + (xPos - sizeValue) + " " + yPos + " L " + (xPos + sizeValue) + " " + yPos +
            " M " + xPos + " " + (yPos - sizeValue) + " L " + xPos + " " + (yPos + sizeValue);
        const effectiveStrokeWidth = Math.max(1, (strokeWidth || 1.5) * 1.3);
        return "<path d=\"" + pathData + "\" stroke=\"" + strokeColor + "\" stroke-width=\"" + effectiveStrokeWidth + "\" vector-effect=\"non-scaling-stroke\" />";
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Build Anchor Corner Marker (Yellow Diamond)
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__BuildAnchorMarkerMarkup(anchorPoint, crosshairSize, textSize) {
        const diamondRadius = crosshairSize * 1.6;
        const anchorMarker =
            "<polygon points=\"" +
            anchorPoint.x + "," + (anchorPoint.y - diamondRadius) + " " +
            (anchorPoint.x + diamondRadius) + "," + anchorPoint.y + " " +
            anchorPoint.x + "," + (anchorPoint.y + diamondRadius) + " " +
            (anchorPoint.x - diamondRadius) + "," + anchorPoint.y +
            "\" fill=\"#facc15\" stroke=\"rgba(15,23,42,0.9)\" stroke-width=\"1.5\" vector-effect=\"non-scaling-stroke\" />";

        const anchorLabel = PhotoMeasurePro__CanvasViewport__BuildHaloedText(
            anchorPoint.x + diamondRadius * 1.2,
            anchorPoint.y - diamondRadius * 1.2,
            textSize,
            "#facc15",
            "Anchor",
            "start"
        );
        return anchorMarker + anchorLabel;
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
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return {
                    isPanning: true,
                    lastPan: { x: pointerEvent.clientX, y: pointerEvent.clientY }
                };
            });
            return;
        }

        const svgPoint = PhotoMeasurePro__CanvasViewport__GetImageSpacePoint(pointerEvent.clientX, pointerEvent.clientY, domRefs, currentState);

        if (currentState.awaitingAnchorClick) {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return {
                    anchorPoint: svgPoint,
                    awaitingAnchorClick: false
                };
            });
            return;
        }

        const hitRadius = (currentState.measurementConfig.PhotoMeasurePro__Measurement__HitRadiusPixels || 30) / currentState.transform.scale;
        const draggableLines = currentState.lines.filter(function(lineItem) { return lineItem.type !== "guide" && lineItem.type !== "angle"; });
        const nearestPoint = PhotoMeasurePro__CanvasViewport__FindNearestLineEndpoint(svgPoint, draggableLines, hitRadius);

        if (nearestPoint) {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { draggingPoint: nearestPoint, selectedLineId: nearestPoint.lineId };
            });
            return;
        }

        if (currentState.mode === "measure" && currentState.measureSubMode === "guide") {
            PhotoMeasurePro__CanvasViewport__PlaceGuideAtPoint(svgPoint, stateManager, idGenerator, currentState);
            return;
        }

        if (currentState.mode === "measure" && currentState.measureSubMode === "angle") {
            PhotoMeasurePro__CanvasViewport__AdvanceAngleDrawing(svgPoint, stateManager, idGenerator, currentState);
            return;
        }

        if (currentState.mode === "constraint" || currentState.mode === "measure") {
            const lineType = currentState.mode;
            const snappedPoint = PhotoMeasurePro__CanvasViewport__ApplyGuideSnap(svgPoint, currentState);
            const newLine = {
                id: idGenerator.PhotoMeasurePro__IdGenerator__Create(lineType),
                type: lineType,
                start: snappedPoint,
                end: snappedPoint,
                plane: lineType === "constraint" ? currentState.constraintPlane : currentState.measurePlane
            };
            if (lineType === "constraint") {
                const planeEntry = currentState.constraintsByPlane[currentState.constraintPlane];
                newLine.lengthInput = planeEntry && planeEntry.lengthMm;
            }

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
            const snappedEnd = PhotoMeasurePro__CanvasViewport__ApplyGuideSnap(svgPoint, currentState);
            stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
                return {
                    drawingLine: Object.assign({}, previousState.drawingLine, { end: snappedEnd })
                };
            });
            return;
        }

        if (currentState.drawingAngle && currentState.drawingAngle.awaitingArm) {
            const snappedPoint = PhotoMeasurePro__CanvasViewport__ApplyGuideSnap(svgPoint, currentState);
            stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
                const drawingAngle = previousState.drawingAngle;
                if (!drawingAngle) return {};
                const updatedAngle = Object.assign({}, drawingAngle);
                updatedAngle[drawingAngle.awaitingArm] = snappedPoint;
                return { drawingAngle: updatedAngle };
            });
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Place A Guide At The Click Point (Continuous Mode)
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__PlaceGuideAtPoint(svgPoint, stateManager, idGenerator, currentState) {
        const guidesEngine = window.PhotoMeasurePro__System__Guides__Engine;
        const perspectiveEngine = window.PhotoMeasurePro__System__PerspectiveSetup__Engine;
        const perspectiveData = perspectiveEngine.PhotoMeasurePro__PerspectiveSetup__ComputePerspectiveData(currentState);
        if (!perspectiveData || !perspectiveData.basis) return;

        const guideLine = guidesEngine.PhotoMeasurePro__Guides__BuildGuideLine(
            idGenerator.PhotoMeasurePro__IdGenerator__Create("guide"),
            currentState.guideAxis,
            svgPoint,
            perspectiveData,
            currentState.imgSize
        );
        if (!guideLine) return;

        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            return {
                lines: previousState.lines.concat([guideLine]),
                selectedLineId: guideLine.id
            };
        });
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Advance A Three-Click Angle Measurement
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__AdvanceAngleDrawing(svgPoint, stateManager, idGenerator, currentState) {
        const snappedPoint = PhotoMeasurePro__CanvasViewport__ApplyGuideSnap(svgPoint, currentState);

        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const drawingAngle = previousState.drawingAngle;

            if (!drawingAngle) {
                return {
                    drawingAngle: {
                        id: idGenerator.PhotoMeasurePro__IdGenerator__Create("angle"),
                        type: "angle",
                        plane: previousState.measurePlane,
                        vertex: snappedPoint,
                        armA: snappedPoint,
                        armB: null,
                        awaitingArm: "armA"
                    }
                };
            }

            if (drawingAngle.awaitingArm === "armA") {
                return {
                    drawingAngle: Object.assign({}, drawingAngle, {
                        armA: snappedPoint,
                        armB: snappedPoint,
                        awaitingArm: "armB"
                    })
                };
            }

            const committedAngle = Object.assign({}, drawingAngle, {
                armB: snappedPoint,
                awaitingArm: null
            });
            delete committedAngle.awaitingArm;
            return {
                lines: previousState.lines.concat([committedAngle]),
                drawingAngle: null,
                selectedLineId: committedAngle.id
            };
        });
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Snap A Point To The Nearest Guide Line
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__ApplyGuideSnap(svgPoint, currentState) {
        const guidesEngine = window.PhotoMeasurePro__System__Guides__Engine;
        const hitRadius = (currentState.measurementConfig.PhotoMeasurePro__Measurement__HitRadiusPixels || 30) / currentState.transform.scale;
        const snap = guidesEngine.PhotoMeasurePro__Guides__FindBestGuideSnap(svgPoint, currentState.lines, hitRadius);
        if (snap) return snap.point;
        return svgPoint;
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Pointer Up
    // ------------------------------------------------------------
    function PhotoMeasurePro__CanvasViewport__HandlePointerUp(pointerEvent) {
        if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
            pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
        }

        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const scaleEngine = window.PhotoMeasurePro__System__ScaleConstraint__Engine;
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

            let registeredConstraintPayload = null;

            stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
                let updatedLines = previousState.lines.slice();
                let updatedConstraints = previousState.constraintsByPlane;

                if (lineDistance > threshold) {
                    const newLine = previousState.drawingLine;
                    if (newLine.type === "constraint" && newLine.plane) {
                        const previousEntry = previousState.constraintsByPlane[newLine.plane] || { lineId: null, lengthMm: null };
                        if (previousEntry.lineId) {
                            updatedLines = updatedLines.filter(function(lineItem) { return lineItem.id !== previousEntry.lineId; });
                        }
                        updatedConstraints = Object.assign({}, previousState.constraintsByPlane);
                        updatedConstraints[newLine.plane] = {
                            lineId: newLine.id,
                            lengthMm: previousEntry.lengthMm || newLine.lengthInput
                        };
                        registeredConstraintPayload = {
                            lineId: newLine.id,
                            plane: newLine.plane,
                            lengthMm: updatedConstraints[newLine.plane].lengthMm
                        };
                    }
                    updatedLines.push(newLine);
                }

                return {
                    lines: updatedLines,
                    constraintsByPlane: updatedConstraints,
                    drawingLine: null,
                    draggingPoint: null
                };
            });

            if (registeredConstraintPayload) {
                scaleEngine.PhotoMeasurePro__ScaleConstraint__RegisterConstraintLine(
                    registeredConstraintPayload.lineId,
                    registeredConstraintPayload.plane,
                    registeredConstraintPayload.lengthMm
                );
            }
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
