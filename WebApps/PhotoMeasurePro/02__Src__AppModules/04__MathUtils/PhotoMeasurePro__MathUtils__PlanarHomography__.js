// -----------------------------------------------------------------------------
// REGION | PhotoMeasurePro Planar Homography Math
// -----------------------------------------------------------------------------
// Builds the 3x3 homography H that maps an image pixel (u, v, 1) to a
// plane-local millimetre coordinate (right_mm, up_mm, w) where (a/w, b/w) are
// the mm-space coordinates on the selected world plane.
//
// Derivation: for a camera ray r = K^-1 * (u, v, 1), the 3D intersection with a
// plane having normal n and canonical offset 1 is x = r / (n . r). When the
// plane is real-scaled so that a known length L on the plane corresponds to
// the user's constraint, we multiply the canonical distance by scale. The
// right / up / normal world axes are rows of R (basis.Rx / Ry / Rz in
// CoordinateSpace terms). Dotting the ray with each axis gives the world
// coordinate along that axis, which is what we want.
// -----------------------------------------------------------------------------
const PhotoMeasurePro__MathUtils__PlanarHomography = (function() {

    // HELPER FUNCTION | Multiply A Row Vector By A 3x3 Matrix
    // ------------------------------------------------------------
    function PhotoMeasurePro__PlanarHomography__RowTimesMatrix(rowVector, matrix3x3) {
        return [
            rowVector[0] * matrix3x3[0][0] + rowVector[1] * matrix3x3[1][0] + rowVector[2] * matrix3x3[2][0],
            rowVector[0] * matrix3x3[0][1] + rowVector[1] * matrix3x3[1][1] + rowVector[2] * matrix3x3[2][1],
            rowVector[0] * matrix3x3[0][2] + rowVector[1] * matrix3x3[1][2] + rowVector[2] * matrix3x3[2][2]
        ];
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Scale A 3-Element Row
    // ------------------------------------------------------------
    function PhotoMeasurePro__PlanarHomography__ScaleRow(rowVector, scalarValue) {
        return [rowVector[0] * scalarValue, rowVector[1] * scalarValue, rowVector[2] * scalarValue];
    }
    // ------------------------------------------------------------

    // FUNCTION | Build Image-To-Plane Homography
    // ------------------------------------------------------------
    function PhotoMeasurePro__PlanarHomography__BuildImageToPlaneHomography(basis, semanticPlane, focalLength, principalX, principalY, planeScale) {
        if (!basis || !focalLength || !planeScale) return null;

        const coordinateSpace = window.PhotoMeasurePro__MathUtils__CoordinateSpace;
        const mathUtils = window.PhotoMeasurePro__MathUtils__PerspectiveMath;

        const planeDefinition = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetPlaneDefinition(semanticPlane);
        const rightAxisVector  = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetBasisAxisByLetter(basis, planeDefinition.rightAxis);
        const upAxisVector     = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetBasisAxisByLetter(basis, planeDefinition.upAxis);
        const normalAxisVector = coordinateSpace.PhotoMeasurePro__CoordinateSpace__GetBasisAxisByLetter(basis, planeDefinition.normalAxis);
        if (!rightAxisVector || !upAxisVector || !normalAxisVector) return null;

        const inverseIntrinsic = mathUtils.PhotoMeasurePro__PerspectiveMath__BuildInverseIntrinsic(focalLength, principalX, principalY);

        const rightRowTimesInvK  = PhotoMeasurePro__PlanarHomography__RowTimesMatrix(rightAxisVector, inverseIntrinsic);
        const upRowTimesInvK     = PhotoMeasurePro__PlanarHomography__RowTimesMatrix(upAxisVector, inverseIntrinsic);
        const normalRowTimesInvK = PhotoMeasurePro__PlanarHomography__RowTimesMatrix(normalAxisVector, inverseIntrinsic);

        return [
            PhotoMeasurePro__PlanarHomography__ScaleRow(rightRowTimesInvK, planeScale),
            PhotoMeasurePro__PlanarHomography__ScaleRow(upRowTimesInvK, planeScale),
            normalRowTimesInvK
        ];
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | 3x3 Determinant
    // ------------------------------------------------------------
    function PhotoMeasurePro__PlanarHomography__Determinant3x3(matrix3x3) {
        const m = matrix3x3;
        return (
            m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
            m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
            m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
        );
    }
    // ------------------------------------------------------------

    // FUNCTION | Invert A 3x3 Homography Matrix
    // ------------------------------------------------------------
    function PhotoMeasurePro__PlanarHomography__InvertHomography(matrix3x3) {
        const m = matrix3x3;
        const determinantValue = PhotoMeasurePro__PlanarHomography__Determinant3x3(matrix3x3);
        if (Math.abs(determinantValue) < 1e-12) return null;
        const inverseDeterminant = 1 / determinantValue;

        return [
            [
                (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * inverseDeterminant,
                (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * inverseDeterminant,
                (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * inverseDeterminant
            ],
            [
                (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * inverseDeterminant,
                (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * inverseDeterminant,
                (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * inverseDeterminant
            ],
            [
                (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * inverseDeterminant,
                (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * inverseDeterminant,
                (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * inverseDeterminant
            ]
        ];
    }
    // ------------------------------------------------------------

    // FUNCTION | Apply Homography To A 2D Point
    // ------------------------------------------------------------
    function PhotoMeasurePro__PlanarHomography__ApplyHomography(matrix3x3, pointXY) {
        const m = matrix3x3;
        const a = m[0][0] * pointXY[0] + m[0][1] * pointXY[1] + m[0][2];
        const b = m[1][0] * pointXY[0] + m[1][1] * pointXY[1] + m[1][2];
        const w = m[2][0] * pointXY[0] + m[2][1] * pointXY[1] + m[2][2];
        if (w === 0) return null;
        return [a / w, b / w];
    }
    // ------------------------------------------------------------

    // FUNCTION | Compute Plane-Local Bounds Covered By The Source Image
    // ------------------------------------------------------------
    // Projects the four image corners through H into plane-local mm and returns
    // the axis-aligned bounding rectangle on the plane.
    function PhotoMeasurePro__PlanarHomography__ComputePlaneBoundsForImage(imageToPlaneHomography, imageWidth, imageHeight) {
        const imageCorners = [
            [0, 0],
            [imageWidth, 0],
            [imageWidth, imageHeight],
            [0, imageHeight]
        ];

        let minRight = Infinity;
        let maxRight = -Infinity;
        let minUp = Infinity;
        let maxUp = -Infinity;
        let allValid = true;

        imageCorners.forEach(function(cornerXY) {
            const projected = PhotoMeasurePro__PlanarHomography__ApplyHomography(imageToPlaneHomography, cornerXY);
            if (!projected || !Number.isFinite(projected[0]) || !Number.isFinite(projected[1])) {
                allValid = false;
                return;
            }
            if (projected[0] < minRight) minRight = projected[0];
            if (projected[0] > maxRight) maxRight = projected[0];
            if (projected[1] < minUp) minUp = projected[1];
            if (projected[1] > maxUp) maxUp = projected[1];
        });

        if (!allValid) return null;
        if (!Number.isFinite(minRight) || !Number.isFinite(maxRight)) return null;
        if (maxRight - minRight <= 0 || maxUp - minUp <= 0) return null;

        return {
            minRight: minRight,
            maxRight: maxRight,
            minUp: minUp,
            maxUp: maxUp,
            width: maxRight - minRight,
            height: maxUp - minUp
        };
    }
    // ------------------------------------------------------------

    return {
        PhotoMeasurePro__PlanarHomography__BuildImageToPlaneHomography: PhotoMeasurePro__PlanarHomography__BuildImageToPlaneHomography,
        PhotoMeasurePro__PlanarHomography__InvertHomography: PhotoMeasurePro__PlanarHomography__InvertHomography,
        PhotoMeasurePro__PlanarHomography__ApplyHomography: PhotoMeasurePro__PlanarHomography__ApplyHomography,
        PhotoMeasurePro__PlanarHomography__ComputePlaneBoundsForImage: PhotoMeasurePro__PlanarHomography__ComputePlaneBoundsForImage
    };
})();

window.PhotoMeasurePro__MathUtils__PlanarHomography = PhotoMeasurePro__MathUtils__PlanarHomography;
// endregion ----------------------------------------------------
