// Na__Distance__ComputeBetweenPoints
// Computes Euclidean distance between two world-space points and the per-axis
// breakdown (handy for vertical-vs-horizontal interpretation in surveying).

export function Na__Distance__ComputeBetweenPoints(worldPointA, worldPointB) {
    const dx = worldPointB.x - worldPointA.x;
    const dy = worldPointB.y - worldPointA.y;
    const dz = worldPointB.z - worldPointA.z;
    return {
        distance:        Math.sqrt(dx * dx + dy * dy + dz * dz),
        deltaX:          dx,
        deltaY:          dy,
        deltaZ:          dz,
        horizontalDelta: Math.sqrt(dx * dx + dz * dz),
        verticalDelta:   Math.abs(dy)
    };
}
