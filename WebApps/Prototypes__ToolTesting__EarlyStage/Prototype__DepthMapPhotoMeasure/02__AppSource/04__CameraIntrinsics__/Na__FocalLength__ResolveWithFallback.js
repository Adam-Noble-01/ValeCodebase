// Na__FocalLength__ResolveWithFallback
// Decides which focal-length value to use for the current photo by walking the
// fallback chain: MODEL -> EXIF -> MANUAL -> CALIBRATION -> DEFAULT.
//
// The function does NOT trigger the chain itself; it consumes whichever inputs
// the caller has assembled and picks the highest-priority valid one.
//
// Inputs (all optional):
//   modelFocalPx          - number from a model that estimates focal (e.g. DepthPro)
//   exifResolved          - { focalPx, method } from Na__FocalLength__ComputePixelsFromExif
//   manualFocalPx         - user override from slider/input
//   calibrationFocalPx    - solved by Na__Calibration__FromKnownReference
//   imageWidthPx          - used to compute DEFAULT focal from default FOV
//   defaultFovDegrees     - applied as last resort
//
// Returns:
//   {
//     focalPx:   number,
//     source:    'MODEL'|'EXIF'|'MANUAL'|'CALIBRATION'|'DEFAULT',
//     fovDegrees: number,
//     details:   { ... }
//   }

export const Na__FocalLength__SourceLabels = Object.freeze(['MODEL', 'EXIF', 'MANUAL', 'CALIBRATION', 'DEFAULT']);

export function Na__FocalLength__ResolveWithFallback(args) {
    const {
        modelFocalPx,
        exifResolved,
        manualFocalPx,
        calibrationFocalPx,
        imageWidthPx,
        defaultFovDegrees
    } = args;

    // Manual override has the highest priority by design - the surveyor said so.
    if (Na__FocalLength__IsValidPositive(manualFocalPx)) {
        return Na__FocalLength__BuildResult('MANUAL', manualFocalPx, imageWidthPx, { manualFocalPx });
    }
    if (Na__FocalLength__IsValidPositive(calibrationFocalPx)) {
        return Na__FocalLength__BuildResult('CALIBRATION', calibrationFocalPx, imageWidthPx, { calibrationFocalPx });
    }
    if (Na__FocalLength__IsValidPositive(modelFocalPx)) {
        return Na__FocalLength__BuildResult('MODEL', modelFocalPx, imageWidthPx, { modelFocalPx });
    }
    if (exifResolved && Na__FocalLength__IsValidPositive(exifResolved.focalPx)) {
        return Na__FocalLength__BuildResult('EXIF', exifResolved.focalPx, imageWidthPx, exifResolved.details || {});
    }
    const fovDegrees = defaultFovDegrees || 60;
    const focalPx    = Na__FocalLength__FocalFromFovDegrees(fovDegrees, imageWidthPx);
    return Na__FocalLength__BuildResult('DEFAULT', focalPx, imageWidthPx, { defaultFovDegrees: fovDegrees });
}

export function Na__FocalLength__FocalFromFovDegrees(fovDegrees, imageWidthPx) {
    const fovRad = (fovDegrees * Math.PI) / 180.0;
    return imageWidthPx / (2 * Math.tan(fovRad / 2));
}

export function Na__FocalLength__FovDegreesFromFocal(focalPx, imageWidthPx) {
    return (2 * Math.atan(imageWidthPx / (2 * focalPx)) * 180.0) / Math.PI;
}

function Na__FocalLength__BuildResult(source, focalPx, imageWidthPx, details) {
    return {
        focalPx,
        source,
        fovDegrees: Na__FocalLength__FovDegreesFromFocal(focalPx, imageWidthPx),
        details: details || {}
    };
}

function Na__FocalLength__IsValidPositive(value) {
    return typeof value === 'number' && isFinite(value) && value > 0;
}
