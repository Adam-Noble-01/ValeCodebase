// Na__DepthOverlay__RenderColorMap
// Renders a metric depth map onto a canvas as a colour-mapped heatmap.
// Currently uses an approximation of the "turbo" colormap.

const Na__DepthOverlay__TurboLut = (() => {
    const lut = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
        const t   = i / 255;
        const r   = 0.13572138 + 4.61539260 * t - 42.66032258 * t * t + 132.13108234 * t * t * t - 152.94239396 * t * t * t * t + 59.28637943 * t * t * t * t * t;
        const g   = 0.09140261 + 2.19418839 * t + 4.84296658 * t * t - 14.18503333 * t * t * t + 4.27729857 * t * t * t * t + 2.82956604 * t * t * t * t * t;
        const b   = 0.10667330 + 12.64194608 * t - 60.58204836 * t * t + 110.36276771 * t * t * t - 89.90310912 * t * t * t * t + 27.34824973 * t * t * t * t * t;
        lut[i * 3 + 0] = Na__DepthOverlay__Clamp01Byte(r);
        lut[i * 3 + 1] = Na__DepthOverlay__Clamp01Byte(g);
        lut[i * 3 + 2] = Na__DepthOverlay__Clamp01Byte(b);
    }
    return lut;
})();

function Na__DepthOverlay__Clamp01Byte(v) {
    return Math.max(0, Math.min(255, Math.round(v * 255)));
}

export function Na__DepthOverlay__RenderColorMap(canvas, depthResult) {
    const { depth, depthWidth, depthHeight, depthMin, depthMax } = depthResult;
    if (canvas.width !== depthWidth || canvas.height !== depthHeight) {
        canvas.width  = depthWidth;
        canvas.height = depthHeight;
    }

    const ctx     = canvas.getContext('2d');
    const imgData = ctx.createImageData(depthWidth, depthHeight);
    const out     = imgData.data;

    const lo = isFinite(depthMin) ? depthMin : 0;
    const hi = isFinite(depthMax) && depthMax > lo ? depthMax : (lo + 1);
    const inv = 1.0 / (hi - lo);

    for (let i = 0, p = 0; i < depth.length; i++, p += 4) {
        const d = depth[i];
        let t = (d - lo) * inv;
        if (!isFinite(t)) t = 0;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        // Closer = warm, far = cool: invert so user sees warm=near.
        const idx = Math.min(255, Math.round((1 - t) * 255));
        const lutOffset = idx * 3;
        out[p + 0] = Na__DepthOverlay__TurboLut[lutOffset + 0];
        out[p + 1] = Na__DepthOverlay__TurboLut[lutOffset + 1];
        out[p + 2] = Na__DepthOverlay__TurboLut[lutOffset + 2];
        out[p + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
}

export function Na__DepthOverlay__SetOpacity(canvas, opacity) {
    canvas.style.opacity = String(Math.max(0, Math.min(1, opacity)));
}

export function Na__DepthOverlay__SetVisible(canvas, visible) {
    canvas.style.display = visible ? '' : 'none';
}
