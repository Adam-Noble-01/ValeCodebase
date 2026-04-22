// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Scene3D Offset Plane Manager
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__SceneReconstruction3D__PlaneOffsetManager = (function() {

    function PhotoMeasurePro__PlaneOffsetManager__CreateOffsetPlaneId() {
        return "OffsetPlane__" + Date.now().toString(36) + "__" + Math.floor(Math.random() * 100000).toString(36);
    }

    function PhotoMeasurePro__PlaneOffsetManager__BuildOffsetPlane(nameValue, parentPlane, offsetMm) {
        return {
            id:           PhotoMeasurePro__PlaneOffsetManager__CreateOffsetPlaneId(),
            name:         nameValue,
            parentPlane:  parentPlane,
            offsetMm:     Number(offsetMm),
            source:       "manual",
            cornersWorld: null
        };
    }

    // FUNCTION | Build Offset Plane Record From A Detector Suggestion
    // ------------------------------------------------------------
    // Source="detected" entries carry explicit world corners so the viewport
    // can draw them at the detector's actual extent rather than inheriting the
    // parent plane's full width/height.
    function PhotoMeasurePro__PlaneOffsetManager__BuildDetectedOffsetPlane(suggestion, suggestionIndex) {
        const parentPlane = suggestion.parentPlane || "Facade";
        const offsetMm    = Number(suggestion.offsetMm);
        const labelValue  = suggestion.name
            || (parentPlane + (offsetMm >= 0 ? " +" : " ") + Math.round(offsetMm) + " mm [auto]");
        return {
            id:           PhotoMeasurePro__PlaneOffsetManager__CreateOffsetPlaneId(),
            name:         labelValue,
            parentPlane:  parentPlane,
            offsetMm:     offsetMm,
            source:       "detected",
            cornersWorld: Array.isArray(suggestion.cornersWorld) ? suggestion.cornersWorld : null,
            widthMm:      Number(suggestion.widthMm)  || null,
            heightMm:     Number(suggestion.heightMm) || null,
            pixelSupport: Number(suggestion.pixelSupport) || null
        };
    }
    // ------------------------------------------------------------

    function PhotoMeasurePro__PlaneOffsetManager__AddOffsetPlane(nameValue, parentPlane, offsetMm) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const nextOffsetPlane = PhotoMeasurePro__PlaneOffsetManager__BuildOffsetPlane(nameValue, parentPlane, offsetMm);
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const scene3dState = previousState.scene3d || {};
            const nextOffsetPlaneList = (scene3dState.offsetPlanes || []).concat([nextOffsetPlane]);
            return {
                scene3d: Object.assign({}, scene3dState, { offsetPlanes: nextOffsetPlaneList })
            };
        });
    }

    // FUNCTION | Replace All Detected Offset Planes With A New Detector Response
    // ------------------------------------------------------------
    // Manual offset planes are preserved; only source="detected" entries are
    // replaced with the latest suggestion set. Returns the count appended.
    function PhotoMeasurePro__PlaneOffsetManager__ReplaceDetectedOffsetPlanes(suggestionList) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        const normalizedSuggestions = Array.isArray(suggestionList) ? suggestionList : [];
        const detectedEntries = normalizedSuggestions.map(function(suggestionItem, suggestionIndex) {
            return PhotoMeasurePro__PlaneOffsetManager__BuildDetectedOffsetPlane(suggestionItem, suggestionIndex);
        });
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const scene3dState = previousState.scene3d || {};
            const retainedEntries = (scene3dState.offsetPlanes || []).filter(function(existingEntry) {
                return existingEntry.source !== "detected";
            });
            return {
                scene3d: Object.assign({}, scene3dState, {
                    offsetPlanes: retainedEntries.concat(detectedEntries)
                })
            };
        });
        return detectedEntries.length;
    }
    // ------------------------------------------------------------

    function PhotoMeasurePro__PlaneOffsetManager__RemoveOffsetPlane(offsetPlaneId) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const scene3dState = previousState.scene3d || {};
            const nextOffsetPlaneList = (scene3dState.offsetPlanes || []).filter(function(offsetPlaneEntry) {
                return offsetPlaneEntry.id !== offsetPlaneId;
            });
            return {
                scene3d: Object.assign({}, scene3dState, { offsetPlanes: nextOffsetPlaneList })
            };
        });
    }

    return {
        PhotoMeasurePro__PlaneOffsetManager__AddOffsetPlane:              PhotoMeasurePro__PlaneOffsetManager__AddOffsetPlane,
        PhotoMeasurePro__PlaneOffsetManager__ReplaceDetectedOffsetPlanes: PhotoMeasurePro__PlaneOffsetManager__ReplaceDetectedOffsetPlanes,
        PhotoMeasurePro__PlaneOffsetManager__RemoveOffsetPlane:           PhotoMeasurePro__PlaneOffsetManager__RemoveOffsetPlane
    };
})();

window.PhotoMeasurePro__System__SceneReconstruction3D__PlaneOffsetManager = PhotoMeasurePro__System__SceneReconstruction3D__PlaneOffsetManager;
// endregion ----------------------------------------------------
