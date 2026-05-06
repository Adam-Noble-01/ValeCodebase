// Na__Measurement__FormatLabel
// Pretty-prints metric distances. All measurement dimensions are displayed in
// millimetres, snapped to the nearest 5 mm (Vale survey/drawing convention -
// finer precision is meaningless given the depth-model's inherent error).

const Na__Measurement__SnapStepMm = 5;

export function Na__Measurement__FormatLabel(meters) {
    if (!isFinite(meters) || meters < 0) return '--';
    return `${Na__Measurement__RoundToStepMm(meters)} mm`;
}

export function Na__Measurement__FormatLabel_Compact(meters) {
    return Na__Measurement__FormatLabel(meters);
}

function Na__Measurement__RoundToStepMm(meters) {
    const mm   = meters * 1000;
    const step = Na__Measurement__SnapStepMm;
    return Math.round(mm / step) * step;
}
