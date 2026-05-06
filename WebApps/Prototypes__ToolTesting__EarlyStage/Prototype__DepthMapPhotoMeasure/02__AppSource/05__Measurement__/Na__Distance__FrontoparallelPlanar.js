// Na__Distance__FrontoparallelPlanar
// Treats the two image-pixel clicks as lying on a single frontoparallel plane
// at the average of their sampled depths, and returns the on-plane world
// length in metres.
//
// Why 2D rather than full 3D back-projection: the depth model on architectural
// scenes assigns slightly different depths to neighbouring pixels even on a
// physically-flat wall. A full 3D distance includes those bogus depth deltas
// as a Z-component and pollutes the result. A surveyor measuring across a
// window pane wants the on-plane length; using the average depth as a single
// shared plane removes the per-pixel Z-noise entirely.
//
// Maths:
//   deltaPx2D = sqrt((pxB - pxA)^2 + (pyB - pyA)^2)
//   dAvg     = (depthA + depthB) / 2
//   distance = deltaPx2D * dAvg / focalPx

export function Na__Distance__FrontoparallelPlanar(pointA, pointB, depthA, depthB, focalPx) {
    const dx        = pointB.x - pointA.x;
    const dy        = pointB.y - pointA.y;
    const deltaPx2D = Math.sqrt(dx * dx + dy * dy);
    const dAvg      = 0.5 * (depthA + depthB);
    const distance  = deltaPx2D * dAvg / focalPx;
    return {
        distance,
        deltaPx2D,
        dAvg,
        worldDx: dx * dAvg / focalPx,
        worldDy: dy * dAvg / focalPx
    };
}
