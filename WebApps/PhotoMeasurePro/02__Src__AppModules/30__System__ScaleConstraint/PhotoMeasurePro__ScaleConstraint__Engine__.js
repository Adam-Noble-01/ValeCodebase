// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Scale Constraint Engine
// -----------------------------------------------------------------------------
// Produces a per-plane scale map. Each plane's scale is either:
//   (a) computed directly from a constraint line drawn on that plane, or
//   (b) propagated from another plane's scale via a shared anchor-point, using
//       the closed-form ratio (n_target . ray_anchor) / (n_source . ray_anchor).
//
// The anchor is the physical building corner where multiple planes meet, so it
// is by definition coplanar with every plane the user cares about. Knowing the
// anchor's 3D position (fixed by any one plane's scale) pins all the others.
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__ScaleConstraint__Engine = (function() {

    const PhotoMeasurePro__ScaleConstraint__PlaneOrder = ["Facade", "Side", "Ground"];

    // FUNCTION | Find Constraint Line For A Plane
    // ------------------------------------------------------------
    function PhotoMeasurePro__ScaleConstraint__GetConstraintLineForPlane(lineList, constraintsByPlane, semanticPlane) {
        const planeEntry = constraintsByPlane && constraintsByPlane[semanticPlane];
        if (!planeEntry || !planeEntry.lineId) return null;
        return lineList.find(function(lineItem) { return lineItem.id === planeEntry.lineId; }) || null;
    }
    // ------------------------------------------------------------

    // FUNCTION | Compute The Direct Per-Plane Scale From A Constraint
    // ------------------------------------------------------------
    function PhotoMeasurePro__ScaleConstraint__ComputeDirectScaleForPlane(currentState, perspectiveData, semanticPlane) {
        if (!perspectiveData || !perspectiveData.basis || !perspectiveData.f) return null;

        const constraintLine = PhotoMeasurePro__ScaleConstraint__GetConstraintLineForPlane(
            currentState.lines,
            currentState.constraintsByPlane,
            semanticPlane
        );
        if (!constraintLine) return null;

        const planeEntry = currentState.constraintsByPlane[semanticPlane];
        const lengthMm = planeEntry && planeEntry.lengthMm;
        if (!lengthMm || lengthMm <= 0) return null;

        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;
        const unscaledDistance = mathUtils.PhotoMeasurePro__PerspectiveMath__GetUnscaledDistanceRobust(
            constraintLine.start,
            constraintLine.end,
            perspectiveData.basis,
            semanticPlane,
            perspectiveData.f,
            perspectiveData.cx,
            perspectiveData.cy
        );
        if (!unscaledDistance || unscaledDistance === 0) return null;

        return lengthMm / unscaledDistance;
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Propagate One Plane's Scale To Another Via Anchor
    // ------------------------------------------------------------
    function PhotoMeasurePro__ScaleConstraint__PropagateScaleThroughAnchor(basis, anchorRay, referencePlane, referenceScale, targetPlane) {
        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;

        const referenceNormal = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetPlaneNormalVector(basis, referencePlane);
        const targetNormal    = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetPlaneNormalVector(basis, targetPlane);
        if (!referenceNormal || !targetNormal) return null;

        const referenceDot = mathUtils.PhotoMeasurePro__PerspectiveMath__Dot(referenceNormal, anchorRay);
        const targetDot    = mathUtils.PhotoMeasurePro__PerspectiveMath__Dot(targetNormal, anchorRay);
        if (Math.abs(referenceDot) < 1e-6) return null;

        return referenceScale * (targetDot / referenceDot);
    }
    // ------------------------------------------------------------

    // FUNCTION | Compute The Full Per-Plane Scale Map For Current State
    // ------------------------------------------------------------
    function PhotoMeasurePro__ScaleConstraint__ComputeScalesByPlane(currentState, perspectiveData) {
        const scalesByPlane = {
            Facade: { value: null, source: "unset" },
            Side:   { value: null, source: "unset" },
            Ground: { value: null, source: "unset" }
        };

        if (!perspectiveData || !perspectiveData.basis || !perspectiveData.f) return scalesByPlane;

        PhotoMeasurePro__ScaleConstraint__PlaneOrder.forEach(function(semanticPlane) {
            const directScale = PhotoMeasurePro__ScaleConstraint__ComputeDirectScaleForPlane(currentState, perspectiveData, semanticPlane);
            if (directScale && Number.isFinite(directScale)) {
                scalesByPlane[semanticPlane] = { value: directScale, source: "constraint" };
            }
        });

        if (currentState.anchorPoint) {
            const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;
            const anchorRay = mathUtils.PhotoMeasurePro__PerspectiveMath__ImagePixelToRay(
                currentState.anchorPoint,
                perspectiveData.f,
                perspectiveData.cx,
                perspectiveData.cy
            );

            const referenceEntry = PhotoMeasurePro__ScaleConstraint__PlaneOrder.reduce(function(chosenEntry, semanticPlane) {
                if (chosenEntry) return chosenEntry;
                if (scalesByPlane[semanticPlane].source === "constraint") {
                    return { plane: semanticPlane, value: scalesByPlane[semanticPlane].value };
                }
                return null;
            }, null);

            if (referenceEntry) {
                PhotoMeasurePro__ScaleConstraint__PlaneOrder.forEach(function(targetPlane) {
                    if (scalesByPlane[targetPlane].source === "constraint") return;
                    const propagatedScale = PhotoMeasurePro__ScaleConstraint__PropagateScaleThroughAnchor(
                        perspectiveData.basis,
                        anchorRay,
                        referenceEntry.plane,
                        referenceEntry.value,
                        targetPlane
                    );
                    if (propagatedScale && Number.isFinite(propagatedScale) && propagatedScale > 0) {
                        scalesByPlane[targetPlane] = { value: propagatedScale, source: "anchor" };
                    }
                });
            }
        }

        return scalesByPlane;
    }
    // ------------------------------------------------------------

    // FUNCTION | Update Per-Plane Constraint Length
    // ------------------------------------------------------------
    function PhotoMeasurePro__ScaleConstraint__UpdateConstraintLengthForPlane(semanticPlane, lengthInMm) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const previousEntry = previousState.constraintsByPlane[semanticPlane] || { lineId: null, lengthMm: null };
            const updatedConstraints = Object.assign({}, previousState.constraintsByPlane);
            updatedConstraints[semanticPlane] = Object.assign({}, previousEntry, { lengthMm: lengthInMm });

            const updatedLines = previousState.lines.map(function(lineItem) {
                if (lineItem.type !== "constraint") return lineItem;
                if (lineItem.id !== previousEntry.lineId) return lineItem;
                return Object.assign({}, lineItem, { lengthInput: lengthInMm });
            });

            return {
                constraintsByPlane: updatedConstraints,
                lines: updatedLines
            };
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Register A Newly Drawn Constraint Line For Its Plane
    // ------------------------------------------------------------
    function PhotoMeasurePro__ScaleConstraint__RegisterConstraintLine(lineId, semanticPlane, lengthMm) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const updatedConstraints = Object.assign({}, previousState.constraintsByPlane);
            const previousEntry = updatedConstraints[semanticPlane] || { lineId: null, lengthMm: lengthMm };
            updatedConstraints[semanticPlane] = Object.assign({}, previousEntry, {
                lineId: lineId,
                lengthMm: lengthMm || previousEntry.lengthMm
            });
            return { constraintsByPlane: updatedConstraints };
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Clear Constraint For A Plane
    // ------------------------------------------------------------
    function PhotoMeasurePro__ScaleConstraint__ClearConstraintForPlane(semanticPlane) {
        const stateManager = window.PhotoMeasurePro__AppCore__StateManager;
        stateManager.PhotoMeasurePro__StateManager__PatchState(function(previousState) {
            const previousEntry = previousState.constraintsByPlane[semanticPlane] || { lineId: null, lengthMm: null };
            const updatedConstraints = Object.assign({}, previousState.constraintsByPlane);
            updatedConstraints[semanticPlane] = { lineId: null, lengthMm: previousEntry.lengthMm };

            const remainingLines = previousEntry.lineId
                ? previousState.lines.filter(function(lineItem) { return lineItem.id !== previousEntry.lineId; })
                : previousState.lines;

            return {
                constraintsByPlane: updatedConstraints,
                lines: remainingLines
            };
        });
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__ScaleConstraint__ComputeScalesByPlane: PhotoMeasurePro__ScaleConstraint__ComputeScalesByPlane,
        PhotoMeasurePro__ScaleConstraint__UpdateConstraintLengthForPlane: PhotoMeasurePro__ScaleConstraint__UpdateConstraintLengthForPlane,
        PhotoMeasurePro__ScaleConstraint__RegisterConstraintLine: PhotoMeasurePro__ScaleConstraint__RegisterConstraintLine,
        PhotoMeasurePro__ScaleConstraint__ClearConstraintForPlane: PhotoMeasurePro__ScaleConstraint__ClearConstraintForPlane,
        PhotoMeasurePro__ScaleConstraint__GetConstraintLineForPlane: PhotoMeasurePro__ScaleConstraint__GetConstraintLineForPlane
    };
})();

window.PhotoMeasurePro__System__ScaleConstraint__Engine = PhotoMeasurePro__System__ScaleConstraint__Engine;
// endregion ----------------------------------------------------
