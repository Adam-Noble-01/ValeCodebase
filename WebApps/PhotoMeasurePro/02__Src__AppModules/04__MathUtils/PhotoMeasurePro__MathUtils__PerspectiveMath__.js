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

    // FUNCTION | Derive Focal Length From Orthogonal Vanishing Points
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

    // FUNCTION | Build Orthogonal Basis From Vanishing Points
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__GetOrthogonalBasis(vanishingX, vanishingY, vanishingZ, focalLength, principalX, principalY) {
        const inverseIntrinsic = [
            [1 / focalLength, 0, -principalX / focalLength],
            [0, 1 / focalLength, -principalY / focalLength],
            [0, 0, 1]
        ];

        let axisX = null;
        let axisY = null;
        let axisZ = null;

        if (vanishingX) axisX = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(inverseIntrinsic, vanishingX));
        if (vanishingY) axisY = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(inverseIntrinsic, vanishingY));
        if (vanishingZ) axisZ = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(inverseIntrinsic, vanishingZ));

        if (axisX && axisY) {
            axisZ = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisX, axisY));
            axisY = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisZ, axisX));
            axisX = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisY, axisZ));
        } else if (axisX && axisZ) {
            axisY = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisZ, axisX));
            axisZ = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisX, axisY));
            axisX = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisY, axisZ));
        } else if (axisY && axisZ) {
            axisX = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisY, axisZ));
            axisZ = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisX, axisY));
            axisY = PhotoMeasurePro__PerspectiveMath__Normalize(PhotoMeasurePro__PerspectiveMath__Cross(axisZ, axisX));
        } else {
            return null;
        }

        return { Rx: axisX, Ry: axisY, Rz: axisZ };
    }
    // ------------------------------------------------------------

    // FUNCTION | Compute Plane-Aware Unscaled Distance
    // ------------------------------------------------------------
    function PhotoMeasurePro__PerspectiveMath__GetUnscaledDistanceRobust(pointA, pointB, basis, measurePlane, focalLength, principalX, principalY) {
        if (!basis) return null;

        let planeNormal = basis.Ry;
        if (measurePlane === "XY") planeNormal = basis.Rz;
        if (measurePlane === "YZ") planeNormal = basis.Rx;

        const inverseIntrinsic = [
            [1 / focalLength, 0, -principalX / focalLength],
            [0, 1 / focalLength, -principalY / focalLength],
            [0, 0, 1]
        ];

        const rayA = PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(inverseIntrinsic, [pointA.x, pointA.y, 1]);
        const rayB = PhotoMeasurePro__PerspectiveMath__MultiplyMatVec(inverseIntrinsic, [pointB.x, pointB.y, 1]);

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

    return {
        PhotoMeasurePro__PerspectiveMath__Cross: PhotoMeasurePro__PerspectiveMath__Cross,
        PhotoMeasurePro__PerspectiveMath__Dot: PhotoMeasurePro__PerspectiveMath__Dot,
        PhotoMeasurePro__PerspectiveMath__Normalize: PhotoMeasurePro__PerspectiveMath__Normalize,
        PhotoMeasurePro__PerspectiveMath__MultiplyMatVec: PhotoMeasurePro__PerspectiveMath__MultiplyMatVec,
        PhotoMeasurePro__PerspectiveMath__GetLineIntersection: PhotoMeasurePro__PerspectiveMath__GetLineIntersection,
        PhotoMeasurePro__PerspectiveMath__CalculateFocalLength: PhotoMeasurePro__PerspectiveMath__CalculateFocalLength,
        PhotoMeasurePro__PerspectiveMath__GetOrthogonalBasis: PhotoMeasurePro__PerspectiveMath__GetOrthogonalBasis,
        PhotoMeasurePro__PerspectiveMath__GetUnscaledDistanceRobust: PhotoMeasurePro__PerspectiveMath__GetUnscaledDistanceRobust
    };
})();

window.PhotoMeasurePro__MathUtils__PerspectiveMath = PhotoMeasurePro__MathUtils__PerspectiveMath;
// endregion ----------------------------------------------------
