// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Application Bootstrap
// -----------------------------------------------------------------------------
(async function PhotoMeasurePro__AppCore__Bootstrap() {
    const domRefs = PhotoMeasurePro__AppCore__ResolveDomReferences();
    const appConfig = await window.PhotoMeasurePro__AppData__ConfigLoader.PhotoMeasurePro__ConfigLoader__LoadConfig();

    const applicationConfig = appConfig.PhotoMeasurePro__Application__Config || {};
    const measurementConfig = appConfig.PhotoMeasurePro__Measurement__Config || {};
    window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__Initialize(applicationConfig, measurementConfig);

    PhotoMeasurePro__AppCore__InitializeSidebarEvents(domRefs);
    PhotoMeasurePro__AppCore__InitializeHotkeys();
    window.PhotoMeasurePro__System__ImageSession__Main.PhotoMeasurePro__ImageSession__Initialize(domRefs);
    window.PhotoMeasurePro__System__CanvasViewport__Main.PhotoMeasurePro__CanvasViewport__Initialize(domRefs);
    if (window.PhotoMeasurePro__System__CanvasViewport__OrthoStage) {
        window.PhotoMeasurePro__System__CanvasViewport__OrthoStage.PhotoMeasurePro__OrthoStage__Initialize(domRefs);
    }

    let previousDirtySnapshot = PhotoMeasurePro__AppCore__BuildDirtySnapshot(
        window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__GetState()
    );
    window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__Subscribe(function(stateSnapshot) {
        const nextDirtySnapshot = PhotoMeasurePro__AppCore__BuildDirtySnapshot(stateSnapshot);
        if (stateSnapshot.currentProjectCode && previousDirtySnapshot !== nextDirtySnapshot && !stateSnapshot.currentProjectDirty) {
            window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { currentProjectDirty: true };
            });
            return;
        }
        previousDirtySnapshot = nextDirtySnapshot;
        PhotoMeasurePro__AppCore__RenderAll(stateSnapshot, domRefs);
    });

    if (window.PhotoMeasurePro__AppData__ProjectFileManager) {
        window.PhotoMeasurePro__AppData__ProjectFileManager.PhotoMeasurePro__ProjectFileManager__SyncFromServer().then(function() {
            PhotoMeasurePro__AppCore__RenderAll(
                window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__GetState(),
                domRefs
            );
        });
    }

    PhotoMeasurePro__AppCore__RenderAll(
        window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__GetState(),
        domRefs
    );
})();
// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | AppCore Helpers
// -----------------------------------------------------------------------------
function PhotoMeasurePro__AppCore__ResolveDomReferences() {
    const domHelpers = window.PhotoMeasurePro__AppUtils__DomHelpers;
    const domById = domHelpers.PhotoMeasurePro__DomHelpers__GetElementById;

    return {
        PhotoMeasurePro__ModeManager__ModeButtons: Array.from(document.querySelectorAll(".PhotoMeasurePro__Sidebar__ModeButton")),
        PhotoMeasurePro__ModeManager__SetupPanel: domById("PhotoMeasurePro__Sidebar__SetupPanel"),
        PhotoMeasurePro__ModeManager__ConstraintPanel: domById("PhotoMeasurePro__Sidebar__ConstraintPanel"),
        PhotoMeasurePro__ModeManager__MeasurementPanel: domById("PhotoMeasurePro__Sidebar__MeasurementPanel"),
        PhotoMeasurePro__ModeManager__OrthoSidebarPanel: domById("PhotoMeasurePro__Sidebar__OrthoPanel"),
        PhotoMeasurePro__ModeManager__OrthoPanel: domById("PhotoMeasurePro__OrthoWarpAndExport__Panel"),
        PhotoMeasurePro__ModeManager__StageWrapper: domById("PhotoMeasurePro__CanvasViewport__StageWrapper"),

        PhotoMeasurePro__ImageSession__FileInput: domById("PhotoMeasurePro__Sidebar__InputImageFile"),
        PhotoMeasurePro__ImageSession__ViewportRoot: domById("PhotoMeasurePro__CanvasViewport__ViewportRoot"),
        PhotoMeasurePro__ImageSession__HiddenAlignButton: domById("PhotoMeasurePro__Sidebar__ButtonHiddenAlign"),

        PhotoMeasurePro__CanvasViewport__ViewportRoot: domById("PhotoMeasurePro__CanvasViewport__ViewportRoot"),
        PhotoMeasurePro__CanvasViewport__DropHint: domById("PhotoMeasurePro__CanvasViewport__DropHint"),
        PhotoMeasurePro__CanvasViewport__StageSurface: domById("PhotoMeasurePro__CanvasViewport__StageSurface"),
        PhotoMeasurePro__CanvasViewport__ImageElement: domById("PhotoMeasurePro__CanvasViewport__ImageTarget"),
        PhotoMeasurePro__CanvasViewport__SvgOverlay: domById("PhotoMeasurePro__CanvasViewport__SvgOverlay"),
        PhotoMeasurePro__CanvasViewport__OrthoCanvasElement: domById("PhotoMeasurePro__OrthoWarpAndExport__CanvasTarget"),
        PhotoMeasurePro__CanvasViewport__OrthoInfoCard: domById("PhotoMeasurePro__OrthoWarpAndExport__InfoCard"),
        PhotoMeasurePro__CanvasViewport__OrthoSvgOverlay: domById("PhotoMeasurePro__OrthoWarpAndExport__SvgOverlay"),
        PhotoMeasurePro__CanvasViewport__OrthoStage: domById("PhotoMeasurePro__OrthoWarpAndExport__Stage"),
        PhotoMeasurePro__OrthoWarpAndExport__Viewport: domById("PhotoMeasurePro__OrthoWarpAndExport__Viewport"),
        PhotoMeasurePro__OrthoWarpAndExport__ButtonCropToggle: domById("PhotoMeasurePro__OrthoWarpAndExport__ButtonCropToggle"),
        PhotoMeasurePro__OrthoWarpAndExport__ButtonCropClear: domById("PhotoMeasurePro__OrthoWarpAndExport__ButtonCropClear"),
        PhotoMeasurePro__OrthoWarpAndExport__ButtonResetView: domById("PhotoMeasurePro__OrthoWarpAndExport__ButtonResetView"),

        PhotoMeasurePro__VisualSettings__Panel: domById("PhotoMeasurePro__VisualSettings__Panel"),
        PhotoMeasurePro__VisualSettings__ToggleButton: domById("PhotoMeasurePro__Sidebar__ButtonVisualSettingsToggle"),
        PhotoMeasurePro__VisualSettings__AxisThicknessSlider: domById("PhotoMeasurePro__VisualSettings__InputAxisThickness"),
        PhotoMeasurePro__VisualSettings__AxisThicknessValue: domById("PhotoMeasurePro__VisualSettings__AxisThicknessValue"),
        PhotoMeasurePro__VisualSettings__DimThicknessSlider: domById("PhotoMeasurePro__VisualSettings__InputDimensionThickness"),
        PhotoMeasurePro__VisualSettings__DimThicknessValue: domById("PhotoMeasurePro__VisualSettings__DimensionThicknessValue"),

        PhotoMeasurePro__AppCore__ExifStatusText: domById("PhotoMeasurePro__Sidebar__ExifStatusText"),
        PhotoMeasurePro__ScaleConstraint__LengthInput: domById("PhotoMeasurePro__ScaleConstraint__InputLengthMm"),
        PhotoMeasurePro__ScaleConstraint__PlaneStatusList: domById("PhotoMeasurePro__ScaleConstraint__PlaneStatusList"),
        PhotoMeasurePro__ScaleConstraint__ClearButtons: Array.from(document.querySelectorAll("#PhotoMeasurePro__ScaleConstraint__ClearButtonRow button")),
        PhotoMeasurePro__ScaleConstraint__ButtonSetAnchor: domById("PhotoMeasurePro__ScaleConstraint__ButtonSetAnchor"),
        PhotoMeasurePro__ScaleConstraint__ButtonClearAnchor: domById("PhotoMeasurePro__ScaleConstraint__ButtonClearAnchor"),
        PhotoMeasurePro__ScaleConstraint__AnchorStatusText: domById("PhotoMeasurePro__ScaleConstraint__AnchorStatusText"),
        PhotoMeasurePro__Measurement__DimensionSlider: domById("PhotoMeasurePro__Measurement__InputDimensionSize"),
        PhotoMeasurePro__Measurement__WarningText: domById("PhotoMeasurePro__Measurement__WarningText"),
        PhotoMeasurePro__AppCore__DeleteButton: domById("PhotoMeasurePro__Sidebar__ButtonDeleteSelected"),
        PhotoMeasurePro__AppCore__ExportButton: domById("PhotoMeasurePro__OrthoWarpAndExport__ButtonExportPng"),
        PhotoMeasurePro__AppCore__ConstraintPlaneButtons: Array.from(document.querySelectorAll(".PhotoMeasurePro__ScaleConstraint__PlaneButton")),
        PhotoMeasurePro__AppCore__MeasurePlaneButtons: Array.from(document.querySelectorAll(".PhotoMeasurePro__Measurement__PlaneButton")),

        PhotoMeasurePro__Diagnostics__Panel: domById("PhotoMeasurePro__Diagnostics__Panel"),
        PhotoMeasurePro__Diagnostics__ToggleButton: domById("PhotoMeasurePro__Sidebar__ButtonDiagnosticsToggle"),
        PhotoMeasurePro__Diagnostics__FocalText: domById("PhotoMeasurePro__Diagnostics__FocalText"),
        PhotoMeasurePro__Diagnostics__PairFocalText: domById("PhotoMeasurePro__Diagnostics__PairFocalText"),
        PhotoMeasurePro__Diagnostics__OrthogonalityText: domById("PhotoMeasurePro__Diagnostics__OrthogonalityText"),
        PhotoMeasurePro__Diagnostics__ScalesText: domById("PhotoMeasurePro__Diagnostics__ScalesText"),
        PhotoMeasurePro__Diagnostics__AnchorText: domById("PhotoMeasurePro__Diagnostics__AnchorText"),

        PhotoMeasurePro__Measurement__SubModeButtons: Array.from(document.querySelectorAll(".PhotoMeasurePro__Measurement__SubModeButton")),
        PhotoMeasurePro__Measurement__GuideAxisRow: domById("PhotoMeasurePro__Measurement__GuideAxisRow"),
        PhotoMeasurePro__Measurement__GuideAxisButtons: Array.from(document.querySelectorAll(".PhotoMeasurePro__Measurement__GuideAxisButton")),
        PhotoMeasurePro__Measurement__AngleHintText: domById("PhotoMeasurePro__Measurement__AngleHintText"),

        PhotoMeasurePro__Projects__CurrentText: domById("PhotoMeasurePro__Projects__CurrentText"),
        PhotoMeasurePro__Projects__ButtonNew: domById("PhotoMeasurePro__Projects__ButtonNew"),
        PhotoMeasurePro__Projects__ButtonSave: domById("PhotoMeasurePro__Projects__ButtonSave"),
        PhotoMeasurePro__Projects__ButtonSaveAs: domById("PhotoMeasurePro__Projects__ButtonSaveAs"),
        PhotoMeasurePro__Projects__ButtonExportJson: domById("PhotoMeasurePro__Projects__ButtonExportJson"),
        PhotoMeasurePro__Projects__InputImportJson: domById("PhotoMeasurePro__Projects__InputImportJson"),
        PhotoMeasurePro__Projects__ManifestList: domById("PhotoMeasurePro__Projects__ManifestList")
    };
}
// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Sidebar + Control Event Wiring
// -----------------------------------------------------------------------------
function PhotoMeasurePro__AppCore__InitializeSidebarEvents(domRefs) {
    const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
    const modeManager = window.PhotoMeasurePro__AppCore__ModeManager;
    const scaleEngine = window.PhotoMeasurePro__System__ScaleConstraint__Engine;

    domRefs.PhotoMeasurePro__ModeManager__ModeButtons.forEach(function(modeButtonElement) {
        modeButtonElement.addEventListener("click", function() {
            modeManager.PhotoMeasurePro__ModeManager__SetMode(modeButtonElement.dataset.mode);
        });
    });

    domRefs.PhotoMeasurePro__AppCore__ConstraintPlaneButtons.forEach(function(planeButtonElement) {
        planeButtonElement.addEventListener("click", function() {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
                const selectedPlane = planeButtonElement.dataset.plane;
                const planeEntry = previousState.constraintsByPlane[selectedPlane] || { lineId: null, lengthMm: null };
                return {
                    constraintPlane: selectedPlane
                };
            });
            PhotoMeasurePro__AppCore__SyncLengthInputToSelectedPlane(domRefs);
        });
    });

    domRefs.PhotoMeasurePro__AppCore__MeasurePlaneButtons.forEach(function(planeButtonElement) {
        planeButtonElement.addEventListener("click", function() {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { measurePlane: planeButtonElement.dataset.plane };
            });
        });
    });

    domRefs.PhotoMeasurePro__ScaleConstraint__LengthInput.addEventListener("change", function(changeEvent) {
        const numericValue = Number(changeEvent.target.value);
        if (!Number.isFinite(numericValue) || numericValue <= 0) return;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        scaleEngine.PhotoMeasurePro__ScaleConstraint__UpdateConstraintLengthForPlane(currentState.constraintPlane, numericValue);
    });

    domRefs.PhotoMeasurePro__ScaleConstraint__ClearButtons.forEach(function(clearButtonElement) {
        clearButtonElement.addEventListener("click", function() {
            const planeToClear = clearButtonElement.dataset.plane;
            scaleEngine.PhotoMeasurePro__ScaleConstraint__ClearConstraintForPlane(planeToClear);
        });
    });

    domRefs.PhotoMeasurePro__ScaleConstraint__ButtonSetAnchor.addEventListener("click", function() {
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            return { awaitingAnchorClick: !previousState.awaitingAnchorClick };
        });
    });

    domRefs.PhotoMeasurePro__ScaleConstraint__ButtonClearAnchor.addEventListener("click", function() {
        stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
            return { anchorPoint: null, awaitingAnchorClick: false };
        });
    });

    domRefs.PhotoMeasurePro__Measurement__DimensionSlider.addEventListener("input", function(inputEvent) {
        const sliderValue = Number(inputEvent.target.value);
        stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
            return { dimensionSize: sliderValue };
        });
    });

    domRefs.PhotoMeasurePro__AppCore__DeleteButton.addEventListener("click", function() {
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        if (!currentState.selectedLineId) return;

        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const deletedLineId = previousState.selectedLineId;
            const remainingLines = previousState.lines.filter(function(lineItem) {
                return lineItem.id !== deletedLineId;
            });
            const updatedConstraints = Object.assign({}, previousState.constraintsByPlane);
            Object.keys(updatedConstraints).forEach(function(planeKey) {
                if (updatedConstraints[planeKey].lineId === deletedLineId) {
                    updatedConstraints[planeKey] = Object.assign({}, updatedConstraints[planeKey], { lineId: null });
                }
            });
            return {
                lines: remainingLines,
                constraintsByPlane: updatedConstraints,
                selectedLineId: null
            };
        });
    });

    domRefs.PhotoMeasurePro__AppCore__ExportButton.addEventListener("click", function() {
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        const derivedData = PhotoMeasurePro__AppCore__ComputeDerivedData(currentState);
        window.PhotoMeasurePro__System__OrthoWarpAndExport__Engine.PhotoMeasurePro__OrthoWarpAndExport__ExportPng(domRefs, currentState, derivedData);
    });

    domRefs.PhotoMeasurePro__Diagnostics__ToggleButton.addEventListener("click", function() {
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            return { diagnosticsOpen: !previousState.diagnosticsOpen };
        });
    });

    domRefs.PhotoMeasurePro__VisualSettings__ToggleButton.addEventListener("click", function() {
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            return { visualSettingsOpen: !previousState.visualSettingsOpen };
        });
    });

    domRefs.PhotoMeasurePro__VisualSettings__AxisThicknessSlider.addEventListener("input", function(inputEvent) {
        const sliderValue = Number(inputEvent.target.value);
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            return {
                visualSettings: Object.assign({}, previousState.visualSettings, { axisLineThickness: sliderValue })
            };
        });
    });

    domRefs.PhotoMeasurePro__VisualSettings__DimThicknessSlider.addEventListener("input", function(inputEvent) {
        const sliderValue = Number(inputEvent.target.value);
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            return {
                visualSettings: Object.assign({}, previousState.visualSettings, { dimensionLineThickness: sliderValue })
            };
        });
    });

    if (domRefs.PhotoMeasurePro__OrthoWarpAndExport__ButtonCropToggle) {
        domRefs.PhotoMeasurePro__OrthoWarpAndExport__ButtonCropToggle.addEventListener("click", function() {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
                return { orthoCropMode: !previousState.orthoCropMode };
            });
        });
    }

    if (domRefs.PhotoMeasurePro__OrthoWarpAndExport__ButtonCropClear) {
        domRefs.PhotoMeasurePro__OrthoWarpAndExport__ButtonCropClear.addEventListener("click", function() {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { orthoCrop: null, orthoDrawingCrop: null, orthoCropMode: false };
            });
        });
    }

    if (domRefs.PhotoMeasurePro__OrthoWarpAndExport__ButtonResetView) {
        domRefs.PhotoMeasurePro__OrthoWarpAndExport__ButtonResetView.addEventListener("click", function() {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { orthoTransform: { x: 0, y: 0, scale: 1, userAdjusted: false } };
            });
        });
    }

    domRefs.PhotoMeasurePro__Measurement__SubModeButtons.forEach(function(subModeButton) {
        subModeButton.addEventListener("click", function() {
            const nextSubMode = subModeButton.dataset.submode;
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { measureSubMode: nextSubMode, drawingAngle: null };
            });
        });
    });

    domRefs.PhotoMeasurePro__Measurement__GuideAxisButtons.forEach(function(axisButton) {
        axisButton.addEventListener("click", function() {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { guideAxis: axisButton.dataset.guideAxis };
            });
        });
    });

    PhotoMeasurePro__AppCore__InitializeProjectsPanelEvents(domRefs);
}
// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Projects Panel Event Wiring
// -----------------------------------------------------------------------------
function PhotoMeasurePro__AppCore__InitializeProjectsPanelEvents(domRefs) {
    if (!domRefs.PhotoMeasurePro__Projects__ButtonNew) return;
    const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
    const projectFileManager = window.PhotoMeasurePro__AppData__ProjectFileManager;

    domRefs.PhotoMeasurePro__Projects__ButtonNew.addEventListener("click", function() {
        const projectName = window.prompt("Project name:", "New Project");
        if (!projectName) return;
        const newProjectCode = projectFileManager.PhotoMeasurePro__ProjectFileManager__GenerateProjectCode();
        stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
            return {
                currentProjectCode: newProjectCode,
                currentProjectName: projectName,
                currentProjectDirty: true
            };
        });
    });

    domRefs.PhotoMeasurePro__Projects__ButtonSave.addEventListener("click", function() {
        PhotoMeasurePro__AppCore__PersistCurrentProject(domRefs, false);
    });

    domRefs.PhotoMeasurePro__Projects__ButtonSaveAs.addEventListener("click", function() {
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        const nextName = window.prompt("Save project as:", currentState.currentProjectName || "Project Copy");
        if (!nextName) return;
        const nextCode = projectFileManager.PhotoMeasurePro__ProjectFileManager__GenerateProjectCode();
        stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
            return {
                currentProjectCode: nextCode,
                currentProjectName: nextName,
                currentProjectDirty: true
            };
        });
        PhotoMeasurePro__AppCore__PersistCurrentProject(domRefs, true);
    });

    domRefs.PhotoMeasurePro__Projects__ButtonExportJson.addEventListener("click", function() {
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        PhotoMeasurePro__AppCore__BuildProjectFromState(currentState).then(function(projectData) {
            if (!projectData) { window.alert("Nothing to export yet."); return; }
            projectFileManager.PhotoMeasurePro__ProjectFileManager__ExportProjectAsJson(projectData);
        });
    });

    domRefs.PhotoMeasurePro__Projects__InputImportJson.addEventListener("change", function(changeEvent) {
        const inputFile = changeEvent.target.files && changeEvent.target.files[0];
        if (!inputFile) return;
        projectFileManager.PhotoMeasurePro__ProjectFileManager__ImportProjectFromJsonFile(inputFile).then(function(projectData) {
            PhotoMeasurePro__AppCore__HydrateStateFromProject(projectData, domRefs);
        }).catch(function(importError) {
            window.alert("Import failed: " + (importError && importError.message ? importError.message : importError));
        });
        changeEvent.target.value = "";
    });
}
// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Project Bridge: State <-> JSON
// -----------------------------------------------------------------------------
function PhotoMeasurePro__AppCore__BuildProjectFromState(currentState) {
    if (!currentState.imageUrl) return Promise.resolve(null);
    return PhotoMeasurePro__AppCore__FetchImageAsDataUrl(currentState.imageUrl).then(function(imageDataUrl) {
        const nowIso = new Date().toISOString().split("T")[0];
        const validator = window.PhotoMeasurePro__AppUtils__ProjectSchemaValidator;
        const projectData = {
            PhotoMeasurePro__ProjectFile__Metadata: {
                ProjectCode: currentState.currentProjectCode || "",
                ProjectName: currentState.currentProjectName || "Untitled",
                Author: "",
                DateCreated: nowIso,
                DateModified: nowIso,
                SchemaVersion: 1
            },
            PhotoMeasurePro__ProjectFile__Image: {
                FileName: currentState.imageName || "image.jpg",
                MimeType: imageDataUrl.substring(5, imageDataUrl.indexOf(";")) || "image/jpeg",
                WidthPx: currentState.imgSize.w,
                HeightPx: currentState.imgSize.h,
                FocalPixelsExif: currentState.metadataFocalPixels || null,
                DataUrlBase64: imageDataUrl
            },
            PhotoMeasurePro__ProjectFile__Perspective: {
                Lines: currentState.lines.filter(function(l) {
                    return l.type === "FacadeHorizontal" || l.type === "SideHorizontal" || l.type === "Vertical" || l.type === "guide";
                })
            },
            PhotoMeasurePro__ProjectFile__Calibration: {
                ConstraintsByPlane: currentState.constraintsByPlane,
                AnchorPoint: currentState.anchorPoint
            },
            PhotoMeasurePro__ProjectFile__Measurements: {
                Lines: currentState.lines.filter(function(l) { return l.type === "measure" || l.type === "constraint" || l.type === "angle"; })
            },
            PhotoMeasurePro__ProjectFile__VisualSettings: {
                AxisLineThickness: currentState.visualSettings.axisLineThickness,
                DimensionLineThickness: currentState.visualSettings.dimensionLineThickness,
                DimensionTextSize: currentState.dimensionSize
            },
            PhotoMeasurePro__ProjectFile__OrthoView: {
                SelectedPlane: currentState.measurePlane,
                Crop: currentState.orthoCrop
            }
        };
        return validator
            ? validator.PhotoMeasurePro__SchemaValidator__ValidateAndNormaliseProject(projectData, "buildFromState").ProjectData
            : projectData;
    });
}

function PhotoMeasurePro__AppCore__FetchImageAsDataUrl(imageSourceUrl) {
    return fetch(imageSourceUrl).then(function(response) {
        return response.blob();
    }).then(function(blobValue) {
        return new Promise(function(resolvePromise, rejectPromise) {
            const reader = new FileReader();
            reader.onload = function() { resolvePromise(reader.result); };
            reader.onerror = function() { rejectPromise(reader.error); };
            reader.readAsDataURL(blobValue);
        });
    });
}

function PhotoMeasurePro__AppCore__HydrateStateFromProject(projectData, domRefs) {
    const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
    const canvasRenderer = window.PhotoMeasurePro__System__OrthoWarpAndExport__CanvasRenderer;
    const orthoStage = window.PhotoMeasurePro__System__CanvasViewport__OrthoStage;

    const metadata = projectData.PhotoMeasurePro__ProjectFile__Metadata || {};
    const imageEntry = projectData.PhotoMeasurePro__ProjectFile__Image || {};
    const perspective = projectData.PhotoMeasurePro__ProjectFile__Perspective || { Lines: [] };
    const calibration = projectData.PhotoMeasurePro__ProjectFile__Calibration || {};
    const measurements = projectData.PhotoMeasurePro__ProjectFile__Measurements || { Lines: [] };
    const visuals = projectData.PhotoMeasurePro__ProjectFile__VisualSettings || {};
    const orthoView = projectData.PhotoMeasurePro__ProjectFile__OrthoView || {};

    if (canvasRenderer && canvasRenderer.PhotoMeasurePro__OrthoCanvasRenderer__ResetSourceCache) {
        canvasRenderer.PhotoMeasurePro__OrthoCanvasRenderer__ResetSourceCache();
    }
    if (orthoStage && orthoStage.PhotoMeasurePro__OrthoStage__InvalidateCaches) {
        orthoStage.PhotoMeasurePro__OrthoStage__InvalidateCaches();
    }

    const rebuiltImageUrl = imageEntry.DataUrlBase64 || null;
    const combinedLines = (perspective.Lines || []).concat(measurements.Lines || []);

    stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
        return {
            mode: "setup",
            imageUrl: rebuiltImageUrl,
            imageName: imageEntry.FileName || "",
            metadataFocalPixels: imageEntry.FocalPixelsExif || null,
            imgSize: { w: imageEntry.WidthPx || 1, h: imageEntry.HeightPx || 1 },
            transform: PhotoMeasurePro__AppCore__ComputeCenteredFitTransform(imageEntry.WidthPx || 1, imageEntry.HeightPx || 1, domRefs, previousState),
            lines: combinedLines,
            selectedLineId: null,
            drawingLine: null,
            drawingAngle: null,
            draggingPoint: null,
            isPanning: false,
            measurePlane: orthoView.SelectedPlane || "Facade",
            measureSubMode: "line",
            guideAxis: "Z",
            constraintsByPlane: calibration.ConstraintsByPlane || previousState.constraintsByPlane,
            anchorPoint: calibration.AnchorPoint || null,
            awaitingAnchorClick: false,
            visualSettings: {
                axisLineThickness: visuals.AxisLineThickness || 1.5,
                dimensionLineThickness: visuals.DimensionLineThickness || 1.5
            },
            dimensionSize: visuals.DimensionTextSize || previousState.dimensionSize,
            orthoTransform: { x: 0, y: 0, scale: 1, userAdjusted: false },
            orthoCrop: orthoView.Crop || null,
            orthoDrawingCrop: null,
            orthoCropMode: false,
            currentProjectCode: metadata.ProjectCode || null,
            currentProjectName: metadata.ProjectName || "",
            currentProjectDirty: false
        };
    });
}

function PhotoMeasurePro__AppCore__ComputeCenteredFitTransform(imageWidth, imageHeight, domRefs, previousState) {
    const viewportRect = domRefs.PhotoMeasurePro__CanvasViewport__ViewportRoot.getBoundingClientRect();
    const marginScale = (previousState.appConfig && previousState.appConfig.PhotoMeasurePro__Application__ViewportMarginScale) || 0.95;
    const fitScale = Math.min(viewportRect.width / imageWidth, viewportRect.height / imageHeight) * marginScale;
    return {
        x: (viewportRect.width - imageWidth * fitScale) / 2,
        y: (viewportRect.height - imageHeight * fitScale) / 2,
        scale: fitScale
    };
}

function PhotoMeasurePro__AppCore__PersistCurrentProject(domRefs, forceFresh) {
    const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
    const projectFileManager = window.PhotoMeasurePro__AppData__ProjectFileManager;
    const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
    if (!currentState.currentProjectCode) {
        const projectName = window.prompt("Project name:", currentState.imageName || "New Project");
        if (!projectName) return;
        const newProjectCode = projectFileManager.PhotoMeasurePro__ProjectFileManager__GenerateProjectCode();
        stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
            return { currentProjectCode: newProjectCode, currentProjectName: projectName };
        });
    }
    PhotoMeasurePro__AppCore__BuildProjectFromState(stateManager.PhotoMeasurePro__StateManager__GetState()).then(function(projectData) {
        if (!projectData) { window.alert("Load an image first."); return; }
        projectFileManager.PhotoMeasurePro__ProjectFileManager__SaveProject(projectData).then(function(saveResult) {
            if (saveResult && saveResult.ok) {
                stateManager.PhotoMeasurePro__StateManager__PatchState(function() { return { currentProjectDirty: false }; });
            } else {
                window.alert("Save failed: " + ((saveResult && saveResult.error) || "unknown"));
            }
        });
    });
}
// endregion ----------------------------------------------------

function PhotoMeasurePro__AppCore__BuildDirtySnapshot(currentState) {
    return JSON.stringify({
        lines: currentState.lines,
        constraints: currentState.constraintsByPlane,
        anchor: currentState.anchorPoint,
        visual: currentState.visualSettings,
        dimSize: currentState.dimensionSize,
        crop: currentState.orthoCrop,
        measurePlane: currentState.measurePlane
    });
}
// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Hotkeys
// -----------------------------------------------------------------------------
function PhotoMeasurePro__AppCore__InitializeHotkeys() {
    const stateManager = window.PhotoMeasurePro__AppCore__StateManager;

    document.addEventListener("keydown", function(keyEvent) {
        const targetTag = keyEvent.target && keyEvent.target.tagName;
        if (targetTag === "INPUT" || targetTag === "TEXTAREA") return;

        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        const keyValue = keyEvent.key.toLowerCase();

        if (keyValue === "escape") {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { drawingAngle: null, awaitingAnchorClick: false, orthoCropMode: false };
            });
            return;
        }

        if (currentState.mode !== "measure") return;

        if (keyValue === "g") {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { measureSubMode: "guide", drawingAngle: null };
            });
            return;
        }
        if (keyValue === "a") {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { measureSubMode: "angle", drawingAngle: null };
            });
            return;
        }
        if (keyValue === "l") {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { measureSubMode: "line", drawingAngle: null };
            });
            return;
        }

        if (currentState.measureSubMode === "guide" && (keyValue === "x" || keyValue === "y" || keyValue === "z")) {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { guideAxis: keyValue.toUpperCase() };
            });
        }
    });
}
// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Constraint Length Input Sync
// -----------------------------------------------------------------------------
function PhotoMeasurePro__AppCore__SyncLengthInputToSelectedPlane(domRefs) {
    const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
    const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
    const planeEntry = currentState.constraintsByPlane[currentState.constraintPlane];
    const lengthValue = (planeEntry && planeEntry.lengthMm) || 1000;
    domRefs.PhotoMeasurePro__ScaleConstraint__LengthInput.value = String(lengthValue);
}
// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Derived Data Builder
// -----------------------------------------------------------------------------
function PhotoMeasurePro__AppCore__ComputeDerivedData(currentState) {
    const perspectiveEngine = window.PhotoMeasurePro__System__PerspectiveSetup__Engine;
    const scaleEngine = window.PhotoMeasurePro__System__ScaleConstraint__Engine;

    const perspectiveData = perspectiveEngine.PhotoMeasurePro__PerspectiveSetup__ComputePerspectiveData(currentState);
    const scalesByPlane = scaleEngine.PhotoMeasurePro__ScaleConstraint__ComputeScalesByPlane(currentState, perspectiveData);
    const basisOrthogonality = perspectiveEngine.PhotoMeasurePro__PerspectiveSetup__ComputeBasisOrthogonality(perspectiveData.basis);

    return {
        perspectiveData: perspectiveData,
        scalesByPlane: scalesByPlane,
        basisOrthogonality: basisOrthogonality
    };
}
// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | App Render Pipeline
// -----------------------------------------------------------------------------
function PhotoMeasurePro__AppCore__RenderAll(currentState, domRefs) {
    const measurementEngine = window.PhotoMeasurePro__System__Measurement__Engine;
    const domHelpers = window.PhotoMeasurePro__AppUtils__DomHelpers;

    const derivedData = PhotoMeasurePro__AppCore__ComputeDerivedData(currentState);

    window.PhotoMeasurePro__System__CanvasViewport__Main.PhotoMeasurePro__CanvasViewport__Render(
        domRefs,
        currentState,
        derivedData
    );

    PhotoMeasurePro__AppCore__RenderExifStatus(domRefs, currentState, derivedData);
    PhotoMeasurePro__AppCore__RenderConstraintStatus(domRefs, currentState, derivedData);
    PhotoMeasurePro__AppCore__RenderAnchorStatus(domRefs, currentState);

    domRefs.PhotoMeasurePro__Measurement__DimensionSlider.value = String(currentState.dimensionSize || 20);
    domRefs.PhotoMeasurePro__AppCore__DeleteButton.disabled = !currentState.selectedLineId;

    const measurePlaneScaleEntry = derivedData.scalesByPlane[currentState.measurePlane];
    const hasMeasurePlaneScale = Boolean(measurePlaneScaleEntry && measurePlaneScaleEntry.value);
    domHelpers.PhotoMeasurePro__DomHelpers__SetHiddenByClass(
        domRefs.PhotoMeasurePro__Measurement__WarningText,
        hasMeasurePlaneScale,
        "PhotoMeasurePro__UiState__Hidden"
    );

    domHelpers.PhotoMeasurePro__DomHelpers__SetActiveButton(
        domRefs.PhotoMeasurePro__AppCore__ConstraintPlaneButtons,
        function(domButton) { return domButton.dataset.plane === currentState.constraintPlane; },
        "PhotoMeasurePro__ScaleConstraint__PlaneButton--active"
    );

    domHelpers.PhotoMeasurePro__DomHelpers__SetActiveButton(
        domRefs.PhotoMeasurePro__AppCore__MeasurePlaneButtons,
        function(domButton) { return domButton.dataset.plane === currentState.measurePlane; },
        "PhotoMeasurePro__Measurement__PlaneButton--active"
    );

    PhotoMeasurePro__AppCore__RenderDiagnosticsPanel(domRefs, currentState, derivedData);
    PhotoMeasurePro__AppCore__RenderVisualSettingsPanel(domRefs, currentState);
    PhotoMeasurePro__AppCore__RenderOrthoToolbar(domRefs, currentState);
    PhotoMeasurePro__AppCore__RenderMeasurementSubModeUi(domRefs, currentState);
    PhotoMeasurePro__AppCore__RenderProjectsPanel(domRefs, currentState);
}
// endregion ----------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Sidebar Rendering Helpers
// -----------------------------------------------------------------------------
function PhotoMeasurePro__AppCore__RenderExifStatus(domRefs, currentState, derivedData) {
    const focalLength = derivedData.perspectiveData.f;
    const focalSource = derivedData.perspectiveData.focalSource;
    if (focalLength) {
        domRefs.PhotoMeasurePro__AppCore__ExifStatusText.textContent =
            "Focal length: " + focalLength.toFixed(0) + " px (" + focalSource + ")";
    } else {
        domRefs.PhotoMeasurePro__AppCore__ExifStatusText.textContent =
            "Focal length: unresolved - align setup lines so at least one VP pair is consistent.";
    }
}

function PhotoMeasurePro__AppCore__RenderConstraintStatus(domRefs, currentState, derivedData) {
    const statusList = domRefs.PhotoMeasurePro__ScaleConstraint__PlaneStatusList;
    if (!statusList) return;

    Array.from(statusList.children).forEach(function(liElement) {
        const planeName = liElement.dataset.plane;
        const planeEntry = currentState.constraintsByPlane[planeName];
        const scaleEntry = derivedData.scalesByPlane && derivedData.scalesByPlane[planeName];
        const lineSet = planeEntry && planeEntry.lineId;
        const lengthValue = planeEntry && planeEntry.lengthMm;

        let statusText = planeName + ": ";
        if (lineSet && lengthValue) {
            statusText += lengthValue + " mm (line set)";
        } else {
            statusText += "not set";
        }
        if (scaleEntry && scaleEntry.value) {
            statusText += "   scale " + scaleEntry.value.toFixed(2) + " mm/u (" + scaleEntry.source + ")";
        }
        liElement.textContent = statusText;
    });

    const selectedEntry = currentState.constraintsByPlane[currentState.constraintPlane];
    const selectedLength = (selectedEntry && selectedEntry.lengthMm) || 1000;
    if (document.activeElement !== domRefs.PhotoMeasurePro__ScaleConstraint__LengthInput) {
        domRefs.PhotoMeasurePro__ScaleConstraint__LengthInput.value = String(selectedLength);
    }
}

function PhotoMeasurePro__AppCore__RenderAnchorStatus(domRefs, currentState) {
    if (currentState.awaitingAnchorClick) {
        domRefs.PhotoMeasurePro__ScaleConstraint__AnchorStatusText.textContent = "Anchor: click on the building corner...";
        domRefs.PhotoMeasurePro__ScaleConstraint__ButtonSetAnchor.textContent = "Cancel Anchor Pick";
    } else if (currentState.anchorPoint) {
        domRefs.PhotoMeasurePro__ScaleConstraint__AnchorStatusText.textContent =
            "Anchor: (" + currentState.anchorPoint.x.toFixed(0) + ", " + currentState.anchorPoint.y.toFixed(0) + ")";
        domRefs.PhotoMeasurePro__ScaleConstraint__ButtonSetAnchor.textContent = "Set Anchor Corner";
    } else {
        domRefs.PhotoMeasurePro__ScaleConstraint__AnchorStatusText.textContent = "Anchor: not set";
        domRefs.PhotoMeasurePro__ScaleConstraint__ButtonSetAnchor.textContent = "Set Anchor Corner";
    }
}

function PhotoMeasurePro__AppCore__RenderVisualSettingsPanel(domRefs, currentState) {
    const panelElement = domRefs.PhotoMeasurePro__VisualSettings__Panel;
    if (!panelElement) return;
    if (currentState.visualSettingsOpen) {
        panelElement.classList.remove("PhotoMeasurePro__VisualSettings__Panel--hidden");
    } else {
        panelElement.classList.add("PhotoMeasurePro__VisualSettings__Panel--hidden");
    }
    const visualSettings = currentState.visualSettings || {};
    if (document.activeElement !== domRefs.PhotoMeasurePro__VisualSettings__AxisThicknessSlider) {
        domRefs.PhotoMeasurePro__VisualSettings__AxisThicknessSlider.value = String(visualSettings.axisLineThickness || 1.5);
    }
    domRefs.PhotoMeasurePro__VisualSettings__AxisThicknessValue.textContent = (visualSettings.axisLineThickness || 1.5).toFixed(1);
    if (document.activeElement !== domRefs.PhotoMeasurePro__VisualSettings__DimThicknessSlider) {
        domRefs.PhotoMeasurePro__VisualSettings__DimThicknessSlider.value = String(visualSettings.dimensionLineThickness || 1.5);
    }
    domRefs.PhotoMeasurePro__VisualSettings__DimThicknessValue.textContent = (visualSettings.dimensionLineThickness || 1.5).toFixed(1);
}

function PhotoMeasurePro__AppCore__RenderOrthoToolbar(domRefs, currentState) {
    if (domRefs.PhotoMeasurePro__OrthoWarpAndExport__ButtonCropToggle) {
        domRefs.PhotoMeasurePro__OrthoWarpAndExport__ButtonCropToggle.textContent = currentState.orthoCropMode ? "Cancel Crop" : "Crop";
    }
}

function PhotoMeasurePro__AppCore__RenderMeasurementSubModeUi(domRefs, currentState) {
    if (!domRefs.PhotoMeasurePro__Measurement__SubModeButtons) return;
    const domHelpers = window.PhotoMeasurePro__AppUtils__DomHelpers;
    domHelpers.PhotoMeasurePro__DomHelpers__SetActiveButton(
        domRefs.PhotoMeasurePro__Measurement__SubModeButtons,
        function(buttonElement) { return buttonElement.dataset.submode === currentState.measureSubMode; },
        "PhotoMeasurePro__Measurement__SubModeButton--active"
    );

    domHelpers.PhotoMeasurePro__DomHelpers__SetHiddenByClass(
        domRefs.PhotoMeasurePro__Measurement__GuideAxisRow,
        currentState.measureSubMode !== "guide",
        "PhotoMeasurePro__UiState__Hidden"
    );
    domHelpers.PhotoMeasurePro__DomHelpers__SetActiveButton(
        domRefs.PhotoMeasurePro__Measurement__GuideAxisButtons,
        function(buttonElement) { return buttonElement.dataset.guideAxis === currentState.guideAxis; },
        "PhotoMeasurePro__Measurement__GuideAxisButton--active"
    );

    if (domRefs.PhotoMeasurePro__Measurement__AngleHintText) {
        domHelpers.PhotoMeasurePro__DomHelpers__SetHiddenByClass(
            domRefs.PhotoMeasurePro__Measurement__AngleHintText,
            currentState.measureSubMode !== "angle",
            "PhotoMeasurePro__UiState__Hidden"
        );
    }
}

function PhotoMeasurePro__AppCore__RenderProjectsPanel(domRefs, currentState) {
    if (!domRefs.PhotoMeasurePro__Projects__CurrentText) return;
    const projectFileManager = window.PhotoMeasurePro__AppData__ProjectFileManager;
    if (!projectFileManager) return;

    const projectLabel = currentState.currentProjectName || "none";
    const dirtySuffix = currentState.currentProjectDirty ? " (modified)" : "";
    domRefs.PhotoMeasurePro__Projects__CurrentText.textContent = "Current: " + projectLabel + dirtySuffix;

    const listElement = domRefs.PhotoMeasurePro__Projects__ManifestList;
    const manifestEntries = projectFileManager.PhotoMeasurePro__ProjectFileManager__ListProjects();
    listElement.innerHTML = "";

    manifestEntries.forEach(function(manifestEntry) {
        const listItem = document.createElement("li");
        listItem.className = "PhotoMeasurePro__Projects__ManifestItem";
        if (manifestEntry.projectCode === currentState.currentProjectCode) {
            listItem.classList.add("PhotoMeasurePro__Projects__ManifestItem--active");
        }

        const labelSpan = document.createElement("span");
        labelSpan.textContent = (manifestEntry.projectName || "(unnamed)") + "   " + (manifestEntry.dateModified || "");
        labelSpan.addEventListener("click", function() {
            projectFileManager.PhotoMeasurePro__ProjectFileManager__LoadProject(manifestEntry.projectCode).then(function(loadResult) {
                if (loadResult && loadResult.ok && loadResult.data) {
                    PhotoMeasurePro__AppCore__HydrateStateFromProject(loadResult.data, domRefs);
                } else {
                    window.alert("Load failed: " + ((loadResult && loadResult.error) || "unknown"));
                }
            });
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "PhotoMeasurePro__Projects__DeleteButton";
        deleteButton.addEventListener("click", function(clickEvent) {
            clickEvent.stopPropagation();
            if (!window.confirm("Delete " + manifestEntry.projectName + "?")) return;
            projectFileManager.PhotoMeasurePro__ProjectFileManager__DeleteProject(manifestEntry.projectCode).then(function() {
                PhotoMeasurePro__AppCore__RenderAll(
                    window.PhotoMeasurePro__AppCore__StateManager.PhotoMeasurePro__StateManager__GetState(),
                    domRefs
                );
            });
        });

        listItem.appendChild(labelSpan);
        listItem.appendChild(deleteButton);
        listElement.appendChild(listItem);
    });
}

function PhotoMeasurePro__AppCore__RenderDiagnosticsPanel(domRefs, currentState, derivedData) {
    const panelElement = domRefs.PhotoMeasurePro__Diagnostics__Panel;
    if (!panelElement) return;
    if (currentState.diagnosticsOpen) {
        panelElement.classList.remove("PhotoMeasurePro__Diagnostics__Panel--hidden");
    } else {
        panelElement.classList.add("PhotoMeasurePro__Diagnostics__Panel--hidden");
        return;
    }

    const perspectiveData = derivedData.perspectiveData;
    const focalText = perspectiveData.f
        ? "Focal length: " + perspectiveData.f.toFixed(1) + " px (" + perspectiveData.focalSource + ")"
        : "Focal length: unresolved";
    domRefs.PhotoMeasurePro__Diagnostics__FocalText.textContent = focalText;

    const pairs = perspectiveData.pairFocalLengths || {};
    const formatPair = function(nameLabel) {
        const value = pairs[nameLabel];
        return nameLabel + "=" + (value ? value.toFixed(0) : "-");
    };
    domRefs.PhotoMeasurePro__Diagnostics__PairFocalText.textContent =
        "Pair focals: " + formatPair("XY") + "   " + formatPair("XZ") + "   " + formatPair("YZ");

    const orthogonality = derivedData.basisOrthogonality;
    if (orthogonality) {
        domRefs.PhotoMeasurePro__Diagnostics__OrthogonalityText.textContent =
            "Basis dots: X.Y=" + orthogonality.xDotY.toExponential(1) +
            "  X.Z=" + orthogonality.xDotZ.toExponential(1) +
            "  Y.Z=" + orthogonality.yDotZ.toExponential(1);
    } else {
        domRefs.PhotoMeasurePro__Diagnostics__OrthogonalityText.textContent = "Basis dots: unavailable";
    }

    const scales = derivedData.scalesByPlane || {};
    const scaleLine = function(planeName) {
        const entry = scales[planeName];
        if (!entry || !entry.value) return planeName + "=unset";
        return planeName + "=" + entry.value.toFixed(2) + " mm/u (" + entry.source + ")";
    };
    domRefs.PhotoMeasurePro__Diagnostics__ScalesText.textContent =
        "Plane scales: " + scaleLine("Facade") + "   " + scaleLine("Side") + "   " + scaleLine("Ground");

    domRefs.PhotoMeasurePro__Diagnostics__AnchorText.textContent = currentState.anchorPoint
        ? "Anchor: (" + currentState.anchorPoint.x.toFixed(0) + ", " + currentState.anchorPoint.y.toFixed(0) + ")"
        : "Anchor: not set";
}
// endregion ----------------------------------------------------
