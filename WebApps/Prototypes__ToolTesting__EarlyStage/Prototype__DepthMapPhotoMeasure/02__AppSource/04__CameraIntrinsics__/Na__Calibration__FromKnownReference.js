// Na__Calibration__FromKnownReference
// Solves the camera focal length in pixels from two clicked reference pixels
// with sampled depths and the user-supplied true-world distance between them
// (assumes square pixels: fx = fy = focalPx, principal point at the image
// centre).
//
// The downstream display-scale fix in the bootstrap layer is what actually
// pulls the displayed measurement text onto the surveyor's known length;
// this solver's only job is to give a sensible focal in image pixels for
// back-projection geometry.
//
// Strategies:
// (1) 'frontoparallel'  - default. Assumes the two reference points lie on
//     the same plane facing the camera. focal = deltaPx * dAvg / L.
// (2) 'full3D'          - closed-form pin-hole solve that uses each point's
//     own depth. Requires L^2 > (d1 - d2)^2.
// (3) 'auto'            - tries frontoparallel first, falls back to full3D.

export function Na__Calibration__FromKnownReference(point1, point2, knownLengthMeters, principalPointPx, options) {
    Na__Calibration__ValidateInput(point1, 'point1');
    Na__Calibration__ValidateInput(point2, 'point2');
    if (!isFinite(knownLengthMeters) || knownLengthMeters <= 0) {
        throw new Error('Known reference length must be a positive number (metres).');
    }

    const strategy = (options && options.strategy) || 'auto';

    if (strategy === 'frontoparallel' || strategy === 'auto') {
        const result = Na__Calibration__SolveFrontoparallel(point1, point2, knownLengthMeters);
        if (result.success) return result;
        if (strategy === 'frontoparallel') return result;
    }

    return Na__Calibration__SolveFull3D(point1, point2, knownLengthMeters, principalPointPx);
}

function Na__Calibration__SolveFrontoparallel(point1, point2, knownLengthMeters) {
    const dx = point2.pixelX - point1.pixelX;
    const dy = point2.pixelY - point1.pixelY;
    const deltaPx = Math.sqrt(dx * dx + dy * dy);

    if (deltaPx < 1) {
        return {
            success: false,
            strategy: 'frontoparallel',
            reason:  'Reference points are too close together in the image (less than 1 pixel apart).',
            focalPx: null
        };
    }
    const dAvg = 0.5 * (point1.depth + point2.depth);
    if (!isFinite(dAvg) || dAvg <= 0) {
        return {
            success: false,
            strategy: 'frontoparallel',
            reason:  'Average depth of reference points is invalid.',
            focalPx: null
        };
    }

    const focalPx = deltaPx * dAvg / knownLengthMeters;
    if (!isFinite(focalPx) || focalPx <= 0) {
        return {
            success: false,
            strategy: 'frontoparallel',
            reason:  'Solved focal length is not finite.',
            focalPx: null
        };
    }

    return {
        success:  true,
        strategy: 'frontoparallel',
        focalPx,
        details: {
            deltaPx,
            dAvg,
            depth1: point1.depth,
            depth2: point2.depth
        }
    };
}

function Na__Calibration__SolveFull3D(point1, point2, knownLengthMeters, principalPointPx) {
    const cx = principalPointPx.x;
    const cy = principalPointPx.y;
    const A  = (point1.pixelX - cx) * point1.depth - (point2.pixelX - cx) * point2.depth;
    const B  = (point1.pixelY - cy) * point1.depth - (point2.pixelY - cy) * point2.depth;
    const C  = point1.depth - point2.depth;

    const lateralSq = A * A + B * B;
    const denom     = knownLengthMeters * knownLengthMeters - C * C;

    if (denom <= 0) {
        return {
            success: false,
            strategy: 'full3D',
            reason:  `Typed length (${knownLengthMeters.toFixed(3)} m) is less than the depth difference between the two reference points (${Math.abs(C).toFixed(3)} m). Either pick two points on the same plane (e.g. left and right edges of a window), or type a larger reference length.`,
            focalPx: null
        };
    }
    if (lateralSq <= 1e-9) {
        return {
            success: false,
            strategy: 'full3D',
            reason:  'Reference points are too close together in the image plane to solve focal length.',
            focalPx: null
        };
    }

    const focalPx = Math.sqrt(lateralSq / denom);
    if (!isFinite(focalPx) || focalPx <= 0) {
        return {
            success: false,
            strategy: 'full3D',
            reason:  'Solved focal length is not finite.',
            focalPx: null
        };
    }

    return { success: true, strategy: 'full3D', focalPx };
}

function Na__Calibration__ValidateInput(point, label) {
    if (!point) throw new Error(`${label} is required.`);
    for (const key of ['pixelX', 'pixelY', 'depth']) {
        if (typeof point[key] !== 'number' || !isFinite(point[key])) {
            throw new Error(`${label}.${key} must be a finite number.`);
        }
    }
    if (point.depth <= 0) throw new Error(`${label}.depth must be positive (got ${point.depth}).`);
}

// Na__Calibration__InspectPairDepths
// Eager pre-flight check on the model's reported depth at the two reference
// clicks. The frontoparallel solver assumes coplanar reference points; if the
// model disagrees by more than the configured thresholds, the caller surfaces
// a warning so the surveyor can re-pick or switch calibration mode.
//
// thresholds expects:
//   { warnRatio: number, badRatio: number, warnRelativeDelta: number }
//
// Returns:
//   {
//     status:        'ok' | 'warn' | 'bad',
//     dAvg:          number,
//     ratio:         number  (max/min, always >= 1),
//     deltaAbs:      number  (metres),
//     deltaRel:      number  (deltaAbs / dAvg)
//   }
export function Na__Calibration__InspectPairDepths(depthA, depthB, thresholds) {
    const t = thresholds || {};
    const warnRatio    = isFinite(t.warnRatio)         ? t.warnRatio         : 1.15;
    const badRatio     = isFinite(t.badRatio)          ? t.badRatio          : 1.5;
    const warnRelDelta = isFinite(t.warnRelativeDelta) ? t.warnRelativeDelta : 0.15;

    if (!isFinite(depthA) || !isFinite(depthB) || depthA <= 0 || depthB <= 0) {
        return { status: 'bad', dAvg: NaN, ratio: Infinity, deltaAbs: NaN, deltaRel: NaN };
    }
    const dMin     = Math.min(depthA, depthB);
    const dMax     = Math.max(depthA, depthB);
    const dAvg     = 0.5 * (depthA + depthB);
    const ratio    = dMax / dMin;
    const deltaAbs = dMax - dMin;
    const deltaRel = deltaAbs / dAvg;

    let status = 'ok';
    if (ratio >= badRatio || deltaRel >= 2 * warnRelDelta) status = 'bad';
    else if (ratio >= warnRatio || deltaRel >= warnRelDelta) status = 'warn';

    return { status, dAvg, ratio, deltaAbs, deltaRel };
}
