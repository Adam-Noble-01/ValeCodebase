// Na__DepthHud__CursorReadout
// Floating chip that follows the cursor on the measurement canvas and shows
// the live depth value from the active depth map under the pointer, plus an
// "uneven depth" flag when the local kernel has a strong gradient (which
// usually means the depth model is misbehaving in that region and any
// measurement landing there will be unreliable).
//
// The bootstrap layer drives this purely through the existing onPreview
// stream; this module is otherwise stateless aside from the chip element it
// owns.

import { Na__DepthSampler__SampleAtPixel } from '../05__Measurement__/Na__DepthSampler__SampleAtPixel.js';

export function Na__DepthHud__CursorReadout_Create(deps) {
    const {
        chipElement,
        stageElement,
        hudConfig
    } = deps;

    const cfg = Na__DepthHud__NormaliseConfig(hudConfig);
    const state = {
        enabled:           cfg.enabled,
        offsetPx:          cfg.offsetPx,
        kernelRadius:      cfg.kernelRadius,
        gradientThreshold: cfg.gradientWarnRelative,
        depthResult:       null
    };

    function setDepthResult(depthResult) {
        state.depthResult = depthResult || null;
        if (!state.depthResult) Na__DepthHud__Hide(chipElement);
    }

    function setEnabled(enabled) {
        state.enabled = !!enabled;
        if (!state.enabled) Na__DepthHud__Hide(chipElement);
    }

    function update(hoverImagePoint, mouseClientPoint) {
        if (!state.enabled || !state.depthResult || !hoverImagePoint || !mouseClientPoint) {
            Na__DepthHud__Hide(chipElement);
            return;
        }
        const sample = Na__DepthHud__SampleDepthWithGradient(state.depthResult, hoverImagePoint, state.kernelRadius);
        if (sample === null) {
            Na__DepthHud__Hide(chipElement);
            return;
        }
        Na__DepthHud__Render(chipElement, hoverImagePoint, mouseClientPoint, sample, state, stageElement);
    }

    return {
        setDepthResult,
        setEnabled,
        update,
        hide: () => Na__DepthHud__Hide(chipElement)
    };
}

function Na__DepthHud__NormaliseConfig(hudConfig) {
    return {
        enabled:              hudConfig?.enabled              ?? true,
        kernelRadius:         hudConfig?.kernelRadius         ?? 2,
        gradientWarnRelative: hudConfig?.gradientWarnRelative ?? 0.15,
        offsetPx:             {
            x: hudConfig?.offsetPx?.x ?? 14,
            y: hudConfig?.offsetPx?.y ?? 14
        }
    };
}

function Na__DepthHud__SampleDepthWithGradient(depthResult, point, kernelRadius) {
    const { depth, depthWidth, depthHeight } = depthResult;
    if (!depth || !depthWidth || !depthHeight) return null;
    const centre = Na__DepthSampler__SampleAtPixel(depth, depthWidth, depthHeight, point.x, point.y);
    if (!isFinite(centre) || centre <= 0) return { centre, min: centre, max: centre, range: 0, ratio: 0 };

    const r = Math.max(1, kernelRadius | 0);
    const minX = Math.max(0, Math.floor(point.x - r));
    const maxX = Math.min(depthWidth  - 1, Math.ceil(point.x + r));
    const minY = Math.max(0, Math.floor(point.y - r));
    const maxY = Math.min(depthHeight - 1, Math.ceil(point.y + r));

    let mn =  Infinity;
    let mx = -Infinity;
    for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
            const v = depth[py * depthWidth + px];
            if (!isFinite(v) || v <= 0) continue;
            if (v < mn) mn = v;
            if (v > mx) mx = v;
        }
    }
    if (!isFinite(mn) || !isFinite(mx)) return { centre, min: centre, max: centre, range: 0, ratio: 0 };
    return {
        centre,
        min:   mn,
        max:   mx,
        range: mx - mn,
        ratio: (mx - mn) / centre
    };
}

function Na__DepthHud__Render(chipElement, hoverImagePoint, mouseClientPoint, sample, state, stageElement) {
    const stageRect = stageElement.getBoundingClientRect();
    const left      = (mouseClientPoint.clientX - stageRect.left) + state.offsetPx.x;
    const top       = (mouseClientPoint.clientY - stageRect.top)  + state.offsetPx.y;

    chipElement.style.left = `${left}px`;
    chipElement.style.top  = `${top}px`;
    chipElement.hidden     = false;

    const noisy = sample.ratio >= state.gradientThreshold;
    chipElement.classList.toggle('Na__DepthHud__Noisy', noisy);

    chipElement.textContent = Na__DepthHud__FormatLabel(hoverImagePoint, sample, noisy);
}

function Na__DepthHud__FormatLabel(point, sample, noisy) {
    const px       = `${Math.round(point.x)}, ${Math.round(point.y)}`;
    const depth    = `${sample.centre.toFixed(2)} m`;
    const spread   = sample.range > 0 ? `\u00B1${(sample.range / 2).toFixed(2)} m` : '';
    const noiseTag = noisy ? '  uneven' : '';
    return `${px} | ${depth}${spread ? `  ${spread}` : ''}${noiseTag}`;
}

function Na__DepthHud__Hide(chipElement) {
    chipElement.hidden = true;
    chipElement.classList.remove('Na__DepthHud__Noisy');
}
