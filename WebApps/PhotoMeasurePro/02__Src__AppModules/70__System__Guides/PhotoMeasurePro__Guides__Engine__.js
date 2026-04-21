// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Perspective Guides Engine
// -----------------------------------------------------------------------------
// Builds SketchUp-style guide lines: given an anchor point in image space and
// a chosen world axis (X, Y, Z), construct a line through the anchor that runs
// toward that axis's vanishing point, clipped to the image rectangle. The
// resulting line can then be used as a dashed visual aid and as a snap target
// for measure-line endpoints.
// -----------------------------------------------------------------------------
const PhotoMeasurePro__System__Guides__Engine = (function() {

    // HELPER FUNCTION | Clip Infinite Line To A Rectangle (Liang-Barsky)
    // ------------------------------------------------------------
    function PhotoMeasurePro__Guides__ClipLineToRect(originPoint, directionVector, rectMinX, rectMinY, rectMaxX, rectMaxY) {
        let tMin = -Infinity;
        let tMax = Infinity;

        const edgeChecks = [
            { p: -directionVector.x, q: originPoint.x - rectMinX },
            { p:  directionVector.x, q: rectMaxX - originPoint.x },
            { p: -directionVector.y, q: originPoint.y - rectMinY },
            { p:  directionVector.y, q: rectMaxY - originPoint.y }
        ];

        for (let edgeIndex = 0; edgeIndex < edgeChecks.length; edgeIndex++) {
            const p = edgeChecks[edgeIndex].p;
            const q = edgeChecks[edgeIndex].q;
            if (Math.abs(p) < 1e-9) {
                if (q < 0) return null;
                continue;
            }
            const t = q / p;
            if (p < 0) {
                if (t > tMax) return null;
                if (t > tMin) tMin = t;
            } else {
                if (t < tMin) return null;
                if (t < tMax) tMax = t;
            }
        }

        return {
            start: { x: originPoint.x + tMin * directionVector.x, y: originPoint.y + tMin * directionVector.y },
            end:   { x: originPoint.x + tMax * directionVector.x, y: originPoint.y + tMax * directionVector.y }
        };
    }
    // ------------------------------------------------------------

    // FUNCTION | Resolve The Vanishing Point For A Given Axis From Perspective Data
    // ------------------------------------------------------------
    function PhotoMeasurePro__Guides__GetVanishingPointForAxis(perspectiveData, axisLetter) {
        if (!perspectiveData) return null;
        if (axisLetter === "X") return perspectiveData.VPx;
        if (axisLetter === "Y") return perspectiveData.VPy;
        if (axisLetter === "Z") return perspectiveData.VPz;
        return null;
    }
    // ------------------------------------------------------------

    // FUNCTION | Extend A Line Through An Anchor Toward The Vanishing Point
    // ------------------------------------------------------------
    function PhotoMeasurePro__Guides__ExtendThroughVanishingPoint(anchorPoint, vanishingPointHomogeneous, imageWidth, imageHeight) {
        if (!anchorPoint || !vanishingPointHomogeneous) return null;

        let directionVector;
        if (Math.abs(vanishingPointHomogeneous[2]) < 1e-9) {
            directionVector = { x: vanishingPointHomogeneous[0], y: vanishingPointHomogeneous[1] };
        } else {
            const vanishingX = vanishingPointHomogeneous[0] / vanishingPointHomogeneous[2];
            const vanishingY = vanishingPointHomogeneous[1] / vanishingPointHomogeneous[2];
            directionVector = { x: vanishingX - anchorPoint.x, y: vanishingY - anchorPoint.y };
        }

        const directionLength = Math.hypot(directionVector.x, directionVector.y);
        if (directionLength < 1e-9) return null;
        directionVector.x /= directionLength;
        directionVector.y /= directionLength;

        return PhotoMeasurePro__Guides__ClipLineToRect(
            anchorPoint, directionVector,
            0, 0, imageWidth, imageHeight
        );
    }
    // ------------------------------------------------------------

    // FUNCTION | Build A Guide Line Object From Anchor + Axis
    // ------------------------------------------------------------
    function PhotoMeasurePro__Guides__BuildGuideLine(idValue, axisLetter, anchorPoint, perspectiveData, imgSize) {
        const vanishingPoint = PhotoMeasurePro__Guides__GetVanishingPointForAxis(perspectiveData, axisLetter);
        if (!vanishingPoint) return null;

        const clippedSegment = PhotoMeasurePro__Guides__ExtendThroughVanishingPoint(
            anchorPoint, vanishingPoint, imgSize.w, imgSize.h
        );
        if (!clippedSegment) return null;

        return {
            id: idValue,
            type: "guide",
            axis: axisLetter,
            anchor: { x: anchorPoint.x, y: anchorPoint.y },
            start: clippedSegment.start,
            end: clippedSegment.end
        };
    }
    // ------------------------------------------------------------

    // FUNCTION | Recompute A Guide Line's Clipped Endpoints After Basis Changes
    // ------------------------------------------------------------
    function PhotoMeasurePro__Guides__RefreshGuideEndpoints(guideLine, perspectiveData, imgSize) {
        if (!guideLine || guideLine.type !== "guide") return guideLine;
        const rebuiltSegment = PhotoMeasurePro__Guides__ExtendThroughVanishingPoint(
            guideLine.anchor,
            PhotoMeasurePro__Guides__GetVanishingPointForAxis(perspectiveData, guideLine.axis),
            imgSize.w, imgSize.h
        );
        if (!rebuiltSegment) return guideLine;
        return Object.assign({}, guideLine, { start: rebuiltSegment.start, end: rebuiltSegment.end });
    }
    // ------------------------------------------------------------

    // FUNCTION | Project A Point Orthogonally Onto A Guide Line Segment
    // ------------------------------------------------------------
    function PhotoMeasurePro__Guides__ProjectPointOntoGuide(inputPoint, guideLine) {
        const segmentVectorX = guideLine.end.x - guideLine.start.x;
        const segmentVectorY = guideLine.end.y - guideLine.start.y;
        const segmentLengthSquared = segmentVectorX * segmentVectorX + segmentVectorY * segmentVectorY;
        if (segmentLengthSquared < 1e-9) return { x: guideLine.start.x, y: guideLine.start.y };

        const deltaX = inputPoint.x - guideLine.start.x;
        const deltaY = inputPoint.y - guideLine.start.y;
        const projectionT = (deltaX * segmentVectorX + deltaY * segmentVectorY) / segmentLengthSquared;

        return {
            x: guideLine.start.x + projectionT * segmentVectorX,
            y: guideLine.start.y + projectionT * segmentVectorY
        };
    }
    // ------------------------------------------------------------

    // FUNCTION | Find The Best Guide-Line Snap For A Pointer Target
    // ------------------------------------------------------------
    function PhotoMeasurePro__Guides__FindBestGuideSnap(inputPoint, lineList, hitRadius) {
        let bestSnap = null;
        let bestDistance = hitRadius;

        lineList.forEach(function(lineItem) {
            if (lineItem.type !== "guide") return;
            const projectedPoint = PhotoMeasurePro__Guides__ProjectPointOntoGuide(inputPoint, lineItem);
            const distance = Math.hypot(projectedPoint.x - inputPoint.x, projectedPoint.y - inputPoint.y);
            if (distance <= bestDistance) {
                bestSnap = { point: projectedPoint, guideId: lineItem.id };
                bestDistance = distance;
            }
        });

        return bestSnap;
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__Guides__ExtendThroughVanishingPoint: PhotoMeasurePro__Guides__ExtendThroughVanishingPoint,
        PhotoMeasurePro__Guides__BuildGuideLine: PhotoMeasurePro__Guides__BuildGuideLine,
        PhotoMeasurePro__Guides__RefreshGuideEndpoints: PhotoMeasurePro__Guides__RefreshGuideEndpoints,
        PhotoMeasurePro__Guides__ProjectPointOntoGuide: PhotoMeasurePro__Guides__ProjectPointOntoGuide,
        PhotoMeasurePro__Guides__FindBestGuideSnap: PhotoMeasurePro__Guides__FindBestGuideSnap
    };
})();

window.PhotoMeasurePro__System__Guides__Engine = PhotoMeasurePro__System__Guides__Engine;
// endregion ----------------------------------------------------
