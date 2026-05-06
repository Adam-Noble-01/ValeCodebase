// Na__BackProject__PixelToWorldPoint
// Pin-hole back-projection: image pixel (px, py) + metric depth d -> world XYZ.
// Square-pixel assumption (fx == fy == focalPx). Principal point defaults to
// the image centre.

export function Na__BackProject__PixelToWorldPoint(pixelX, pixelY, depth, focalPx, principalPoint) {
    if (!isFinite(depth) || depth <= 0)   throw new Error(`Depth must be positive (got ${depth}).`);
    if (!isFinite(focalPx) || focalPx <= 0) throw new Error(`Focal length must be positive (got ${focalPx}).`);

    const cx = principalPoint.x;
    const cy = principalPoint.y;
    return {
        x: (pixelX - cx) * depth / focalPx,
        y: (pixelY - cy) * depth / focalPx,
        z: depth
    };
}
