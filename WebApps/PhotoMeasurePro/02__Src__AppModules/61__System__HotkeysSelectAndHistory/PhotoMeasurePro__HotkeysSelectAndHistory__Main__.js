// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Hotkeys, Canvas Select Mode, Undo / Redo
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__HotkeysSelectAndHistory__Main = (function() {

    const PhotoMeasurePro__HotkeysSelectAndHistory__ConfigPath =
        "02__Src__AppModules/61__System__HotkeysSelectAndHistory/PhotoMeasurePro__HotkeysSelectAndHistory__Config__.json";

    let PhotoMeasurePro__HotkeysSelectAndHistory__Config = {
        PhotoMeasurePro__HotkeysSelectAndHistory__MaxUndoDepth: 80,
        PhotoMeasurePro__HotkeysSelectAndHistory__SelectModeKey: "s",
        PhotoMeasurePro__HotkeysSelectAndHistory__UndoKey: "z",
        PhotoMeasurePro__HotkeysSelectAndHistory__RedoKey: "y"
    };

    let PhotoMeasurePro__HotkeysSelectAndHistory__UndoStack = [];
    let PhotoMeasurePro__HotkeysSelectAndHistory__RedoStack = [];
    let PhotoMeasurePro__HotkeysSelectAndHistory__IsApplyingHistory = false;

    let PhotoMeasurePro__HotkeysSelectAndHistory__DomRefs = null;
    let PhotoMeasurePro__HotkeysSelectAndHistory__BoundKeydown = null;

    // HELPER FUNCTION | Default Config Object
    // ------------------------------------------------------------
    function PhotoMeasurePro__HotkeysSelectAndHistory__BuildDefaultConfigObject() {
        return {
            PhotoMeasurePro__HotkeysSelectAndHistory__MaxUndoDepth: 80,
            PhotoMeasurePro__HotkeysSelectAndHistory__SelectModeKey: "s",
            PhotoMeasurePro__HotkeysSelectAndHistory__UndoKey: "z",
            PhotoMeasurePro__HotkeysSelectAndHistory__RedoKey: "y"
        };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Deep Clone Undo-Relevant Slice
    // ------------------------------------------------------------
    function PhotoMeasurePro__HotkeysSelectAndHistory__CloneUndoSlice(stateSnapshot) {
        return {
            lines: JSON.parse(JSON.stringify(stateSnapshot.lines || [])),
            constraintsByPlane: JSON.parse(JSON.stringify(stateSnapshot.constraintsByPlane || {})),
            anchorPoint: stateSnapshot.anchorPoint
                ? JSON.parse(JSON.stringify(stateSnapshot.anchorPoint))
                : null
        };
    }
    // ------------------------------------------------------------

    // FUNCTION | Load JSON Config
    // ------------------------------------------------------------
    async function PhotoMeasurePro__HotkeysSelectAndHistory__LoadConfigJson() {
        if (window.location && window.location.protocol === "file:") {
            PhotoMeasurePro__HotkeysSelectAndHistory__Config = PhotoMeasurePro__HotkeysSelectAndHistory__BuildDefaultConfigObject();
            return;
        }
        try {
            const response = await fetch(PhotoMeasurePro__HotkeysSelectAndHistory__ConfigPath, { cache: "no-store" });
            if (!response.ok) throw new Error("config fetch failed");
            const parsedRoot = await response.json();
            const section = parsedRoot.PhotoMeasurePro__HotkeysSelectAndHistory__Config || {};
            PhotoMeasurePro__HotkeysSelectAndHistory__Config = Object.assign(
                PhotoMeasurePro__HotkeysSelectAndHistory__BuildDefaultConfigObject(),
                section
            );
        } catch (_unusedError) {
            PhotoMeasurePro__HotkeysSelectAndHistory__Config = PhotoMeasurePro__HotkeysSelectAndHistory__BuildDefaultConfigObject();
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Reset Undo And Redo Stacks
    // ------------------------------------------------------------
    function PhotoMeasurePro__HotkeysSelectAndHistory__ResetStacks() {
        PhotoMeasurePro__HotkeysSelectAndHistory__UndoStack = [];
        PhotoMeasurePro__HotkeysSelectAndHistory__RedoStack = [];
    }
    // ------------------------------------------------------------

    // FUNCTION | Push Current State To Undo Stack Before A Mutation
    // ------------------------------------------------------------
    function PhotoMeasurePro__HotkeysSelectAndHistory__RecordBeforeChange() {
        if (PhotoMeasurePro__HotkeysSelectAndHistory__IsApplyingHistory) return;
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        const snapshot = PhotoMeasurePro__HotkeysSelectAndHistory__CloneUndoSlice(currentState);
        PhotoMeasurePro__HotkeysSelectAndHistory__UndoStack.push(snapshot);
        const maxDepth = PhotoMeasurePro__HotkeysSelectAndHistory__Config.PhotoMeasurePro__HotkeysSelectAndHistory__MaxUndoDepth || 80;
        while (PhotoMeasurePro__HotkeysSelectAndHistory__UndoStack.length > maxDepth) {
            PhotoMeasurePro__HotkeysSelectAndHistory__UndoStack.shift();
        }
        PhotoMeasurePro__HotkeysSelectAndHistory__RedoStack.length = 0;
    }
    // ------------------------------------------------------------

    // FUNCTION | Apply Undo
    // ------------------------------------------------------------
    function PhotoMeasurePro__HotkeysSelectAndHistory__Undo() {
        if (PhotoMeasurePro__HotkeysSelectAndHistory__UndoStack.length === 0) return;
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        const currentSlice = PhotoMeasurePro__HotkeysSelectAndHistory__CloneUndoSlice(currentState);
        const targetSlice = PhotoMeasurePro__HotkeysSelectAndHistory__UndoStack.pop();
        PhotoMeasurePro__HotkeysSelectAndHistory__RedoStack.push(currentSlice);
        PhotoMeasurePro__HotkeysSelectAndHistory__IsApplyingHistory = true;
        try {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return Object.assign({}, targetSlice, {
                    drawingLine: null,
                    drawingAngle: null,
                    draggingPoint: null,
                    selectedLineId: null
                });
            });
        } finally {
            PhotoMeasurePro__HotkeysSelectAndHistory__IsApplyingHistory = false;
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Apply Redo
    // ------------------------------------------------------------
    function PhotoMeasurePro__HotkeysSelectAndHistory__Redo() {
        if (PhotoMeasurePro__HotkeysSelectAndHistory__RedoStack.length === 0) return;
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        const currentSlice = PhotoMeasurePro__HotkeysSelectAndHistory__CloneUndoSlice(currentState);
        const targetSlice = PhotoMeasurePro__HotkeysSelectAndHistory__RedoStack.pop();
        PhotoMeasurePro__HotkeysSelectAndHistory__UndoStack.push(currentSlice);
        PhotoMeasurePro__HotkeysSelectAndHistory__IsApplyingHistory = true;
        try {
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return Object.assign({}, targetSlice, {
                    drawingLine: null,
                    drawingAngle: null,
                    draggingPoint: null,
                    selectedLineId: null
                });
            });
        } finally {
            PhotoMeasurePro__HotkeysSelectAndHistory__IsApplyingHistory = false;
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Delete Currently Selected Line
    // ------------------------------------------------------------
    function PhotoMeasurePro__HotkeysSelectAndHistory__DeleteSelected() {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        if (!currentState.selectedLineId) return;
        const selectedLine = (currentState.lines || []).find(function(lineItem) {
            return lineItem.id === currentState.selectedLineId;
        });
        if (!selectedLine) return;

        const isPerspectiveLine =
            selectedLine.type === "FacadeHorizontal" ||
            selectedLine.type === "SideHorizontal" ||
            selectedLine.type === "Vertical";
        if (isPerspectiveLine) return;

        PhotoMeasurePro__HotkeysSelectAndHistory__RecordBeforeChange();
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
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Ignore Keydown When Typing
    // ------------------------------------------------------------
    function PhotoMeasurePro__HotkeysSelectAndHistory__ShouldIgnoreKeyTarget(eventTarget) {
        if (!eventTarget) return false;
        if (eventTarget.isContentEditable) return true;
        const tag = eventTarget.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
        return false;
    }
    // ------------------------------------------------------------

    // FUNCTION | Toggle Canvas Select Mode
    // ------------------------------------------------------------
    function PhotoMeasurePro__HotkeysSelectAndHistory__ToggleSelectMode() {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            return {
                canvasSelectMode: !previousState.canvasSelectMode,
                drawingLine: null,
                drawingAngle: null,
                draggingPoint: null
            };
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle Document Keydown
    // ------------------------------------------------------------
    function PhotoMeasurePro__HotkeysSelectAndHistory__OnDocumentKeydown(keyEvent) {
        if (PhotoMeasurePro__HotkeysSelectAndHistory__ShouldIgnoreKeyTarget(keyEvent.target)) return;

        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const currentState = stateManager.PhotoMeasurePro__StateManager__GetState();
        const keyLower = keyEvent.key.toLowerCase();
        const cfg = PhotoMeasurePro__HotkeysSelectAndHistory__Config;
        const mod = keyEvent.ctrlKey || keyEvent.metaKey;
        const undoKey = (cfg.PhotoMeasurePro__HotkeysSelectAndHistory__UndoKey || "z").toLowerCase();
        const redoKey = (cfg.PhotoMeasurePro__HotkeysSelectAndHistory__RedoKey || "y").toLowerCase();
        const selectKey = (cfg.PhotoMeasurePro__HotkeysSelectAndHistory__SelectModeKey || "s").toLowerCase();

        if (keyEvent.key === "Escape") {
            keyEvent.preventDefault();
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return {
                    drawingAngle: null,
                    awaitingAnchorClick: false,
                    orthoCropMode: false,
                    orthoDrawingCrop: null,
                    orthoIsPanning: false
                };
            });
            return;
        }

        if (mod && keyLower === undoKey) {
            keyEvent.preventDefault();
            PhotoMeasurePro__HotkeysSelectAndHistory__Undo();
            return;
        }
        if (mod && keyLower === redoKey) {
            keyEvent.preventDefault();
            PhotoMeasurePro__HotkeysSelectAndHistory__Redo();
            return;
        }

        if (keyEvent.key === "Delete" || keyEvent.key === "Backspace") {
            keyEvent.preventDefault();
            PhotoMeasurePro__HotkeysSelectAndHistory__DeleteSelected();
            return;
        }

        if (!mod && keyLower === selectKey) {
            keyEvent.preventDefault();
            PhotoMeasurePro__HotkeysSelectAndHistory__ToggleSelectMode();
            return;
        }

        if (currentState.mode !== "measure") return;

        if (currentState.canvasSelectMode) return;

        if (keyLower === "g") {
            keyEvent.preventDefault();
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { measureSubMode: "guide", drawingAngle: null };
            });
            return;
        }
        if (keyLower === "a") {
            keyEvent.preventDefault();
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { measureSubMode: "angle", drawingAngle: null };
            });
            return;
        }
        if (keyLower === "l") {
            keyEvent.preventDefault();
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { measureSubMode: "line", drawingAngle: null };
            });
            return;
        }

        if (currentState.measureSubMode === "guide" && (keyLower === "x" || keyLower === "y" || keyLower === "z")) {
            keyEvent.preventDefault();
            stateManager.PhotoMeasurePro__StateManager__PatchState(function() {
                return { guideAxis: keyLower.toUpperCase() };
            });
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Sync Select Mode Button Visual State
    // ------------------------------------------------------------
    function PhotoMeasurePro__HotkeysSelectAndHistory__SyncSelectModeButton(currentState) {
        const buttonElement = PhotoMeasurePro__HotkeysSelectAndHistory__DomRefs
            && PhotoMeasurePro__HotkeysSelectAndHistory__DomRefs.PhotoMeasurePro__HotkeysSelectAndHistory__SelectModeButton;
        if (!buttonElement) return;
        if (currentState.canvasSelectMode) {
            buttonElement.classList.add("PhotoMeasurePro__Sidebar__ButtonSelectMode--active");
        } else {
            buttonElement.classList.remove("PhotoMeasurePro__Sidebar__ButtonSelectMode--active");
        }

        const subModeRow = PhotoMeasurePro__HotkeysSelectAndHistory__DomRefs.PhotoMeasurePro__Measurement__SubModeRow;
        if (subModeRow) {
            if (currentState.canvasSelectMode && currentState.mode === "measure") {
                subModeRow.classList.add("PhotoMeasurePro__Measurement__SubModeRow--selectBlocked");
            } else {
                subModeRow.classList.remove("PhotoMeasurePro__Measurement__SubModeRow--selectBlocked");
            }
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Initialize Module
    // ------------------------------------------------------------
    async function PhotoMeasurePro__HotkeysSelectAndHistory__Initialize(domRefs) {
        PhotoMeasurePro__HotkeysSelectAndHistory__DomRefs = domRefs;
        await PhotoMeasurePro__HotkeysSelectAndHistory__LoadConfigJson();

        if (PhotoMeasurePro__HotkeysSelectAndHistory__BoundKeydown) {
            document.removeEventListener("keydown", PhotoMeasurePro__HotkeysSelectAndHistory__BoundKeydown);
        }
        PhotoMeasurePro__HotkeysSelectAndHistory__BoundKeydown = PhotoMeasurePro__HotkeysSelectAndHistory__OnDocumentKeydown;
        document.addEventListener("keydown", PhotoMeasurePro__HotkeysSelectAndHistory__BoundKeydown);

        if (domRefs.PhotoMeasurePro__HotkeysSelectAndHistory__SelectModeButton) {
            domRefs.PhotoMeasurePro__HotkeysSelectAndHistory__SelectModeButton.addEventListener("click", function() {
                PhotoMeasurePro__HotkeysSelectAndHistory__ToggleSelectMode();
            });
        }
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__HotkeysSelectAndHistory__Initialize: PhotoMeasurePro__HotkeysSelectAndHistory__Initialize,
        PhotoMeasurePro__HotkeysSelectAndHistory__RecordBeforeChange: PhotoMeasurePro__HotkeysSelectAndHistory__RecordBeforeChange,
        PhotoMeasurePro__HotkeysSelectAndHistory__ResetStacks: PhotoMeasurePro__HotkeysSelectAndHistory__ResetStacks,
        PhotoMeasurePro__HotkeysSelectAndHistory__Undo: PhotoMeasurePro__HotkeysSelectAndHistory__Undo,
        PhotoMeasurePro__HotkeysSelectAndHistory__Redo: PhotoMeasurePro__HotkeysSelectAndHistory__Redo,
        PhotoMeasurePro__HotkeysSelectAndHistory__DeleteSelected: PhotoMeasurePro__HotkeysSelectAndHistory__DeleteSelected,
        PhotoMeasurePro__HotkeysSelectAndHistory__SyncSelectModeButton: PhotoMeasurePro__HotkeysSelectAndHistory__SyncSelectModeButton
    };
})();

window.PhotoMeasurePro__System__HotkeysSelectAndHistory__Main = PhotoMeasurePro__System__HotkeysSelectAndHistory__Main;
// endregion ----------------------------------------------------
