// Na__DepthSampler__SampleAtPixel
// Bilinear sampling of a metric depth map at floating-point pixel coordinates.
//
// depthMap is a Float32Array sized depthWidth * depthHeight stored row-major;
// values are assumed to be in metres (or whatever unit the model emits).
// Coordinates outside the bounds are clamped to the nearest valid pixel.

export function Na__DepthSampler__SampleAtPixel(depthMap, depthWidth, depthHeight, x, y) {
    if (!depthMap || depthMap.length !== depthWidth * depthHeight) {
        throw new Error('Depth map size does not match width*height.');
    }
    const xClamped = Math.max(0, Math.min(depthWidth  - 1, x));
    const yClamped = Math.max(0, Math.min(depthHeight - 1, y));

    const x0 = Math.floor(xClamped);
    const y0 = Math.floor(yClamped);
    const x1 = Math.min(depthWidth  - 1, x0 + 1);
    const y1 = Math.min(depthHeight - 1, y0 + 1);
    const tx = xClamped - x0;
    const ty = yClamped - y0;

    const v00 = depthMap[y0 * depthWidth + x0];
    const v10 = depthMap[y0 * depthWidth + x1];
    const v01 = depthMap[y1 * depthWidth + x0];
    const v11 = depthMap[y1 * depthWidth + x1];

    const top    = v00 * (1 - tx) + v10 * tx;
    const bottom = v01 * (1 - tx) + v11 * tx;
    return top * (1 - ty) + bottom * ty;
}

// Optional helper: averages depth in a small kernel to be robust against the
// sometimes noisy single-pixel reading.
export function Na__DepthSampler__SampleAroundPixel(depthMap, depthWidth, depthHeight, x, y, kernelRadius) {
    if (!kernelRadius || kernelRadius <= 0) {
        return Na__DepthSampler__SampleAtPixel(depthMap, depthWidth, depthHeight, x, y);
    }
    let sum    = 0;
    let count  = 0;
    const minX = Math.max(0, Math.floor(x - kernelRadius));
    const maxX = Math.min(depthWidth  - 1, Math.ceil(x + kernelRadius));
    const minY = Math.max(0, Math.floor(y - kernelRadius));
    const maxY = Math.min(depthHeight - 1, Math.ceil(y + kernelRadius));
    for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
            const v = depthMap[py * depthWidth + px];
            if (isFinite(v) && v > 0) {
                sum   += v;
                count += 1;
            }
        }
    }
    if (count === 0) return Na__DepthSampler__SampleAtPixel(depthMap, depthWidth, depthHeight, x, y);
    return sum / count;
}
