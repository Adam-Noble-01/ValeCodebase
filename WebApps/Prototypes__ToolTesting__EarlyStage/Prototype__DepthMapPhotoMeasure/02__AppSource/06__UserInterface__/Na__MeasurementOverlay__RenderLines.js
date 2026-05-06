// Na__MeasurementOverlay__RenderLines
// Draws every stored measurement on the measurement canvas plus a transient
// preview when the picker is mid-pair, and the persistent reference-calibration
// dimension once one has been applied.
//
// All coordinates are image-space pixels.

import { Na__Measurement__FormatLabel_Compact } from '../05__Measurement__/Na__Measurement__FormatLabel.js';

export function Na__MeasurementOverlay__RenderLines(canvas, measurements, pendingFirst, hoverPoint, uiConfig, options) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const calibrationRefs = options && options.calibrationRefs
        ? options.calibrationRefs
        : ((options && options.calibrationRef) ? [options.calibrationRef] : []);
    const pickerMode     = (options && options.pickerMode) || 'measure';

    for (let idx = 0; idx < calibrationRefs.length; idx++) {
        Na__MeasurementOverlay__DrawCalibrationReference(ctx, calibrationRefs[idx], uiConfig, idx + 1);
    }

    for (const m of measurements) {
        Na__MeasurementOverlay__DrawMeasurement(ctx, m, uiConfig);
    }

    if (pendingFirst) {
        const pendingColor = pickerMode === 'calibrate'
            ? ((uiConfig.measurementColors && uiConfig.measurementColors.CALIBRATION) || '#f472b6')
            : '#fbbf24';
        Na__MeasurementOverlay__DrawPendingMarker(ctx, pendingFirst, uiConfig, pendingColor);
        if (hoverPoint) {
            Na__MeasurementOverlay__DrawPendingPreview(ctx, pendingFirst, hoverPoint, uiConfig, pendingColor);
        }
    }
}

function Na__MeasurementOverlay__DrawMeasurement(ctx, m, uiConfig) {
    const color = (uiConfig.measurementColors && uiConfig.measurementColors[m.intrinsicsSource]) || '#22d3ee';
    Na__MeasurementOverlay__DrawSegment(ctx, m.pointA, m.pointB, color, uiConfig.pointMarkerRadiusPx || 6);
    Na__MeasurementOverlay__DrawSegmentLabel(ctx, m.pointA, m.pointB, Na__Measurement__FormatLabel_Compact(m.distanceMeters), color);
}

function Na__MeasurementOverlay__DrawSegment(ctx, a, b, color, markerRadius) {
    ctx.save();
    ctx.lineWidth   = 3;
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
    ctx.lineCap     = 'round';

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    Na__MeasurementOverlay__DrawDot(ctx, a, markerRadius);
    Na__MeasurementOverlay__DrawDot(ctx, b, markerRadius);

    ctx.restore();
}

function Na__MeasurementOverlay__DrawDot(ctx, p, radius) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0f14';
    ctx.fill();
}

function Na__MeasurementOverlay__DrawSegmentLabel(ctx, a, b, text, color) {
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    ctx.save();
    ctx.font         = 'bold 18px "Segoe UI", system-ui, sans-serif';
    const metrics    = ctx.measureText(text);
    const padX       = 8;
    const padY       = 4;
    const boxW       = metrics.width + padX * 2;
    const boxH       = 22 + padY * 2;
    ctx.fillStyle    = 'rgba(11, 15, 20, 0.85)';
    ctx.strokeStyle  = color;
    ctx.lineWidth    = 1.5;
    Na__MeasurementOverlay__RoundRect(ctx, cx - boxW / 2, cy - boxH / 2, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
    ctx.restore();
}

function Na__MeasurementOverlay__RoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function Na__MeasurementOverlay__DrawPendingMarker(ctx, point, uiConfig, color) {
    const fill = color || '#fbbf24';
    ctx.save();
    ctx.fillStyle   = fill;
    ctx.strokeStyle = fill;
    Na__MeasurementOverlay__DrawDot(ctx, point, uiConfig.pointMarkerRadiusPx || 6);
    ctx.restore();
}

function Na__MeasurementOverlay__DrawPendingPreview(ctx, a, b, uiConfig, color) {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = color || '#fbbf24';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
}

function Na__MeasurementOverlay__DrawCalibrationReference(ctx, calibrationRef, uiConfig, refIndex) {
    const { pointA, pointB, lengthMeters, status } = calibrationRef;
    const refTag = calibrationRef.refTag || `REF${refIndex || 1}`;
    const baseColor    = (uiConfig.measurementColors && uiConfig.measurementColors.CALIBRATION) || '#f472b6';
    const radius       = (uiConfig.pointMarkerRadiusPx || 6) + 2;

    ctx.save();
    ctx.lineWidth   = 4;
    ctx.strokeStyle = baseColor;
    ctx.fillStyle   = baseColor;
    ctx.lineCap     = 'round';
    ctx.setLineDash([2, 6]);

    ctx.beginPath();
    ctx.moveTo(pointA.x, pointA.y);
    ctx.lineTo(pointB.x, pointB.y);
    ctx.stroke();

    ctx.setLineDash([]);
    Na__MeasurementOverlay__DrawDot(ctx, pointA, radius);
    Na__MeasurementOverlay__DrawDot(ctx, pointB, radius);
    ctx.restore();

    if (status === 'pending') {
        Na__MeasurementOverlay__DrawCalibrationLabel(ctx, pointA, pointB, `${refTag} (set length)`, baseColor);
    } else if (lengthMeters != null) {
        const text = `${refTag} ${Math.round(lengthMeters * 1000)} mm`;
        Na__MeasurementOverlay__DrawCalibrationLabel(ctx, pointA, pointB, text, baseColor);
    }
}

function Na__MeasurementOverlay__DrawCalibrationLabel(ctx, a, b, text, color) {
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    ctx.save();
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    const metrics = ctx.measureText(text);
    const padX = 10, padY = 5;
    const boxW = metrics.width + padX * 2;
    const boxH = 22 + padY * 2;
    ctx.fillStyle    = '#0b0f14';
    ctx.strokeStyle  = color;
    ctx.lineWidth    = 2;
    Na__MeasurementOverlay__RoundRect(ctx, cx - boxW / 2, cy - boxH / 2, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle    = color;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
    ctx.restore();
}
