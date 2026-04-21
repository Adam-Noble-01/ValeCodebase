// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Perspective Math Utilities
// -----------------------------------------------------------------------------
const PhotoMeasurePro__MathUtils__PerspectiveMath = (function() {

    // HELPER FUNCTION | Vector Cross Product
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__Cross(u, v) {
        return [
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0]
        ];
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Vector Dot Product
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__Dot(u, v) {
        return (u[0] * v[0]) + (u[1] * v[1]) + (u[2] * v[2]);
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Normalize 3D Vector
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__Normalize(v) {
        const vectorLength = Math.hypot(v[0], v[1], v[2]);
        if (vectorLength === 0) return [0, 0, 0];
        return [v[0] / vectorLength, v[1] / vectorLength, v[2] / vectorLength];
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Subtract Scaled Vector
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__SubtractScaled(u, v, scalarValue) {
        return [u[0] - v[0] * scalarValue, u[1] - v[1] * scalarValue, u[2] - v[2] * scalarValue];
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Multiply 3x3 Matrix by Vector
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(matrix, vector) {
        return [
            matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
            matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
            matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
        ];
    }
    // ------------------------------------------------------------

    // FUNCTION | Build Inverse Intrinsic Matrix
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__BuildInverseIntrinsic(focalLength, principalX, principalY) {
        return [
            [1 / focalLength, 0, -principalX / focalLength],
            [0, 1 / focalLength, -principalY / focalLength],
            [0, 0, 1]
        ];
    }
    // ------------------------------------------------------------

    // FUNCTION | Get Homogeneous Intersection Of Two 2D Segments
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__GetLineIntersection(lineA, lineB) {
        const homogeneousLineA = PhotoMeasurePro__PerspectiveMath__Cross(
            [lineA.start.x, lineA.start.y, 1],
            [lineA.end.x, lineA.end.y, 1]
        );
        const homogeneousLineB = PhotoMeasurePro__PerspectiveMath__Cross(
            [lineB.start.x, lineB.start.y, 1],
            [lineB.end.x, lineB.end.y, 1]
        );
        return PhotoMeasurePro__PerspectiveMath__Cross(homogeneousLineA, homogeneousLineB);
    }
    // ------------------------------------------------------------

    // FUNCTION | Derive Focal Length From Two Orthogonal Vanishing Points
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__CalculateFocalLength(vanishingX, vanishingY, principalX, principalY) {
        if (!vanishingX || !vanishingY) return null;
        if (vanishingX[2] === 0 || vanishingY[2] === 0) return null;

        const vx = (vanishingX[0] / vanishingX[2]) - principalX;
        const vy = (vanishingX[1] / vanishingX[2]) - principalY;
        const ux = (vanishingY[0] / vanishingY[2]) - principalX;
        const uy = (vanishingY[1] / vanishingY[2]) - principalY;

        const focalSquared = -((vx * ux) + (vy * uy));
        if (focalSquared <= 0) return null;
        return Math.sqrt(focalSquared);
    }
    // ------------------------------------------------------------

    // FUNCTION | Robust Focal Length From All Available Vanishing Point Pairs
    // ------------------------------------------------------------
    // Returns an object describing the chosen focal length plus the per-pair
    // candidates so the diagnostics pane can surface disagreement. No silent
    // max(w,h) fallback - if nothing can be solved, focalLength is null and the
    // UI must disable measurements.
    function PhotoMeasurePro__PerspectiveMath__CalculateFocalLengthRobust(vanishings, principalX, principalY) {
        const pairDefinitions = [
            { name: "XY", a: "VPx", b: "VPy" },
            { name: "XZ", a: "VPx", b: "VPz" },
            { name: "YZ", a: "VPy", b: "VPz" }
        ];

        const pairFocalLengths = {};
        const validValues = [];

        pairDefinitions.forEach(function(pairDefinition) {
            const vanishingA = vanishings[pairDefinition.a];
            const vanishingB = vanishings[pairDefinition.b];
            const focalLength = PhotoMeasurePro__PerspectiveMath__CalculateFocalLength(vanishingA, vanishingB, principalX, principalY);
            pairFocalLengths[pairDefinition.name] = focalLength;
            if (focalLength && Number.isFinite(focalLength)) {
                validValues.push(focalLength);
            }
        });

        let medianFocalLength = null;
        if (validValues.length > 0) {
            const sortedValues = validValues.slice().sort(function(a, b) { return a - b; });
            medianFocalLength = sortedValues[Math.floor(sortedValues.length / 2)];
        }

        return {
            focalLength: medianFocalLength,
            pairFocalLengths: pairFocalLengths,
            validPairCount: validValues.length
        };
    }
    // ------------------------------------------------------------

    // FUNCTION | Build Orthogonal Basis From Vanishing Points
    // ------------------------------------------------------------
    // Gram-Schmidt with Z as the anchor axis when present (vertical vanishing
    // points are usually the best-conditioned). Preserves the user's measured
    // Z direction instead of re-deriving it from Cross(X, Y).
    //
    // After construction, the basis is sign-corrected so that world +Z points
    // screen-up (camera -Y) and world +X points screen-right (camera +X), with
    // right-handedness maintained. Without this correction the ortho renderer
    // can appear vertically flipped depending on which homogeneous limit point
    // the vanishing-point intersection picked.
    function PhotoMeasurePro__PerspectiveMath__GetOrthogonalBasis(vanishingX, vanishingY, vanishingZ, focalLength, principalX, principalY) {
        if (!focalLength) return null;

        const inverseIntrinsic = PhotoMeasurePro__PerspectiveMath__BuildInverseIntrinsic(focalLength, principalX, principalY);

        let axisX = vanishingX ? PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(inverseIntrinsic, vanishingX)) : null;
        let axisY = vanishingY ? PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(inverseIntrinsic, vanishingY)) : null;
        let axisZ = vanishingZ ? PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(inverseIntrinsic, vanishingZ)) : null;

        if (axisZ) {
            if (axisX) {
                axisX = PhotoMeasurePro__PerspectiveMath__Normalize(
                    PhotoMeasurePro__PerspectiveMath__SubtractScaled(axisX, axisZ, PhotoMeasurePro__PerspectiveMath__Dot(axisX, axisZ))
                );
            } else if (axisY) {
                axisX = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisY, axisZ));
            } else {
                return null;
            }

            if (axisY) {
                let projectedY = PhotoMeasurePro__PerspectiveMath__SubtractScaled(axisY, axisZ, PhotoMeasurePro__PerspectiveMath__Dot(axisY, axisZ));
                projectedY = PhotoMeasurePro__PerspectiveMath__SubtractScaled(projectedY, axisX, PhotoMeasurePro__PerspectiveMath__Dot(projectedY, axisX));
                axisY = PhotoMeasurePro__PerspectiveMath__Normalize(projectedY);
            } else {
                axisY = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisZ, axisX));
            }
        } else if (axisX && axisY) {
            axisZ = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisX, axisY));
            axisY = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisZ, axisX));
            axisX = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisY, axisZ));
        } else {
            return null;
        }

        const orientedBasis = PhotoMeasurePro__PerspectiveMath__OrientBasisToScreen(axisX, axisY, axisZ);
        return { Rx: orientedBasis.axisX, Ry: orientedBasis.axisY, Rz: orientedBasis.axisZ };
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Sign-Correct Basis Axes So Output Is Visually Upright
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__OrientBasisToScreen(axisX, axisY, axisZ) {
        function negate(vectorValues) { return [-vectorValues[0], -vectorValues[1], -vectorValues[2]]; }

        if (axisZ[1] > 0) {
            axisZ = negate(axisZ);
            axisY = negate(axisY);
        }

        if (axisX[0] < 0) {
            axisX = negate(axisX);
            axisY = negate(axisY);
        }

        const rightHandednessCheck = PhotoMeasurePro__PerspectiveMath__Dot(
            PhotoMeasurePro__PerspectiveMath__Cross(axisX, axisY),
            axisZ
        );
        if (rightHandednessCheck < 0) {
            axisY = negate(axisY);
        }

        return { axisX: axisX, axisY: axisY, axisZ: axisZ };
    }
    // ------------------------------------------------------------

    // FUNCTION | Ray Direction In Camera Space For An Image Pixel
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__ImagePixelToRay(imagePoint, focalLength, principalX, principalY) {
        const inverseIntrinsic = PhotoMeasurePro__PerspectiveMath__BuildInverseIntrinsic(focalLength, principalX, principalY);
        return PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(inverseIntrinsic, [imagePoint.x, imagePoint.y, 1]);
    }
    // ------------------------------------------------------------

    // FUNCTION | Compute Plane-Aware Unscaled Distance
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__GetUnscaledDistanceRobust(pointA, pointB, basis, measurePlane, focalLength, principalX, principalY) {
        if (!basis || !focalLength) return null;

        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        const planeNormal = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetPlaneNormalVector(basis, measurePlane);
        if (!planeNormal) return null;

        const rayA = PhotoMeasurePro__PerspectiveMath__ImagePixelToRay(pointA, focalLength, principalX, principalY);
        const rayB = PhotoMeasurePro__PerspectiveMath__ImagePixelToRay(pointB, focalLength, principalX, principalY);

        const normalDotA = PhotoMeasurePro__PerspectiveMath__Dot(planeNormal, rayA);
        const normalDotB = PhotoMeasurePro__PerspectiveMath__Dot(planeNormal, rayB);
        if (Math.abs(normalDotA) < 1e-6 || Math.abs(normalDotB) < 1e-6) return null;

        const distanceA = 1 / normalDotA;
        const distanceB = 1 / normalDotB;
        const planePointA = [rayA[0] * distanceA, rayA[1] * distanceA, rayA[2] * distanceA];
        const planePointB = [rayB[0] * distanceB, rayB[1] * distanceB, rayB[2] * distanceB];

        return Math.hypot(
            planePointA[0] - planePointB[0],
            planePointA[1] - planePointB[1],
            planePointA[2] - planePointB[2]
        );
    }
    // ------------------------------------------------------------

    // FUNCTION | Compute Plane-Aware Angle At A Vertex Between Two Arms
    // ------------------------------------------------------------
    // Both arms are image-pixel points; we unproject them and the vertex onto
    // the chosen world plane, form 3D arm vectors in plane-local space, and
    // return the signed angle in degrees (0-180). The plane normalisation
    // cancels the plane-to-camera depth so the result is independent of scale.
    function PhotoMeasurePro__PerspectiveMath__GetAngleOnPlane(vertexPoint, armPointA, armPointB, basis, semanticPlane, focalLength, principalX, principalY) {
        if (!basis || !focalLength) return null;

        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        const planeNormal = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetPlaneNormalVector(basis, semanticPlane);
        if (!planeNormal) return null;

        function liftPointToPlane(imagePoint) {
            const rayVector = PhotoMeasurePro__PerspectiveMath__ImagePixelToRay(imagePoint, focalLength, principalX, principalY);
            const normalDotRay = PhotoMeasurePro__PerspectiveMath__Dot(planeNormal, rayVector);
            if (Math.abs(normalDotRay) < 1e-6) return null;
            const depthValue = 1 / normalDotRay;
            return [rayVector[0] * depthValue, rayVector[1] * depthValue, rayVector[2] * depthValue];
        }

        const vertex3D = liftPointToPlane(vertexPoint);
        const armA3D = liftPointToPlane(armPointA);
        const armB3D = liftPointToPlane(armPointB);
        if (!vertex3D || !armA3D || !armB3D) return null;

        const armVectorA = [armA3D[0] - vertex3D[0], armA3D[1] - vertex3D[1], armA3D[2] - vertex3D[2]];
        const armVectorB = [armB3D[0] - vertex3D[0], armB3D[1] - vertex3D[1], armB3D[2] - vertex3D[2]];
        const lengthA = Math.hypot(armVectorA[0], armVectorA[1], armVectorA[2]);
        const lengthB = Math.hypot(armVectorB[0], armVectorB[1], armVectorB[2]);
        if (lengthA < 1e-12 || lengthB < 1e-12) return null;

        let cosineValue = PhotoMeasurePro__PerspectiveMath__Dot(armVectorA, armVectorB) / (lengthA * lengthB);
        if (cosineValue > 1) cosineValue = 1;
        if (cosineValue < -1) cosineValue = -1;
        return Math.acos(cosineValue) * (180 / Math.PI);
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__PerspectiveMath__Cross: PhotoMeasurePro__PerspectiveMath__Cross,
        PhotoMeasurePro__PerspectiveMath__Dot: PhotoMeasurePro__PerspectiveMath__Dot,
        PhotoMeasurePro__PerspectiveMath__Normalize: PhotoMeasurePro__PerspectiveMath__Normalize,
        PhotoMeasurePro__PerspectiveMath__MultiplyMatVec: PhotoMeasurePro__PerspectiveMath__MultiplyMatVec,
        PhotoMeasurePro__PerspectiveMath__BuildInverseIntrinsic: PhotoMeasurePro__PerspectiveMath__BuildInverseIntrinsic,
        PhotoMeasurePro__PerspectiveMath__ImagePixelToRay: PhotoMeasurePro__PerspectiveMath__ImagePixelToRay,
        PhotoMeasurePro__PerspectiveMath__GetLineIntersection: PhotoMeasurePro__PerspectiveMath__GetLineIntersection,
        PhotoMeasurePro__PerspectiveMath__CalculateFocalLength: PhotoMeasurePro__PerspectiveMath__CalculateFocalLength,
        PhotoMeasurePro__PerspectiveMath__CalculateFocalLengthRobust: PhotoMeasurePro__PerspectiveMath__CalculateFocalLengthRobust,
        PhotoMeasurePro__PerspectiveMath__GetOrthogonalBasis: PhotoMeasurePro__PerspectiveMath__GetOrthogonalBasis,
        PhotoMeasurePro__PerspectiveMath__GetUnscaledDistanceRobust: PhotoMeasurePro__PerspectiveMath__GetUnscaledDistanceRobust,
        PhotoMeasurePro__PerspectiveMath__GetAngleOnPlane: PhotoMeasurePro__PerspectiveMath__GetAngleOnPlane
    };
})();

window.PhotoMeasurePro__MathUtils__PerspectiveMath = PhotoMeasurePro__MathUtils__PerspectiveMath;
// endregion ----------------------------------------------------
