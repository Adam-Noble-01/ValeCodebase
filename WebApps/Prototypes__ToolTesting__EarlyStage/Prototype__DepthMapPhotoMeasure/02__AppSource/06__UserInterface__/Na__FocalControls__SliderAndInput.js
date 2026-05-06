// Na__FocalControls__SliderAndInput
// Two-way bound FOV slider + focal-px input. The two widgets stay in sync via
// the resolver helpers in Na__FocalLength__ResolveWithFallback.
//
// External callers register `onChange` to be told when the user has overridden
// the value. They also call `setResolved(focalPx, source, imageWidthPx)` after
// every recompute to mirror the resolved state into the widgets when no manual
// override is active.

import {
    Na__FocalLength__FocalFromFovDegrees,
    Na__FocalLength__FovDegreesFromFocal
} from '../04__CameraIntrinsics__/Na__FocalLength__ResolveWithFallback.js';

export function Na__FocalControls__SliderAndInput_Wire(elements) {
    const { fovSlider, fovValueEl, focalPxInput, sourceTagEl, hintEl } = elements;

    let imageWidthPx = 0;
    let suppressFire = false;
    let manualActive = false;
    const listeners  = { onChange: null };

    function setImageWidth(px) {
        imageWidthPx = px;
    }

    function setResolved(focalPx, source, imageWidthArg, hint) {
        if (typeof imageWidthArg === 'number') imageWidthPx = imageWidthArg;
        if (manualActive) return;
        suppressFire = true;
        try {
            if (imageWidthPx > 0 && isFinite(focalPx) && focalPx > 0) {
                fovSlider.value      = Na__FocalLength__FovDegreesFromFocal(focalPx, imageWidthPx).toFixed(1);
                fovValueEl.textContent = `${parseFloat(fovSlider.value).toFixed(1)}\u00B0`;
                focalPxInput.value   = Math.round(focalPx);
            } else {
                fovSlider.value      = '60';
                fovValueEl.textContent = '60.0\u00B0';
                focalPxInput.value   = '';
            }
            Na__FocalControls__ApplySourceTag(sourceTagEl, source);
            if (hint != null) hintEl.textContent = hint;
        } finally {
            suppressFire = false;
        }
    }

    function clearManualOverride() {
        manualActive = false;
    }

    function getCurrentFocalPx() {
        const v = parseFloat(focalPxInput.value);
        return isFinite(v) && v > 0 ? v : null;
    }

    fovSlider.addEventListener('input', () => {
        if (suppressFire) return;
        if (imageWidthPx <= 0) return;
        const fov     = parseFloat(fovSlider.value);
        const focalPx = Na__FocalLength__FocalFromFovDegrees(fov, imageWidthPx);
        suppressFire  = true;
        focalPxInput.value = Math.round(focalPx);
        suppressFire  = false;
        fovValueEl.textContent = `${fov.toFixed(1)}\u00B0`;
        manualActive  = true;
        Na__FocalControls__ApplySourceTag(sourceTagEl, 'MANUAL');
        if (typeof listeners.onChange === 'function') listeners.onChange(focalPx, 'MANUAL');
    });

    focalPxInput.addEventListener('input', () => {
        if (suppressFire) return;
        const focalPx = parseFloat(focalPxInput.value);
        if (!isFinite(focalPx) || focalPx <= 0) return;
        if (imageWidthPx > 0) {
            const fov          = Na__FocalLength__FovDegreesFromFocal(focalPx, imageWidthPx);
            suppressFire       = true;
            fovSlider.value    = fov.toFixed(1);
            fovValueEl.textContent = `${fov.toFixed(1)}\u00B0`;
            suppressFire       = false;
        }
        manualActive = true;
        Na__FocalControls__ApplySourceTag(sourceTagEl, 'MANUAL');
        if (typeof listeners.onChange === 'function') listeners.onChange(focalPx, 'MANUAL');
    });

    return {
        on(eventName, fn) { listeners[eventName] = fn; },
        setImageWidth,
        setResolved,
        clearManualOverride,
        getCurrentFocalPx,
        isManualActive: () => manualActive
    };
}

function Na__FocalControls__ApplySourceTag(sourceTagEl, source) {
    sourceTagEl.textContent = source;
    sourceTagEl.classList.remove(
        'Na__SourceTag__MODEL',
        'Na__SourceTag__EXIF',
        'Na__SourceTag__MANUAL',
        'Na__SourceTag__CALIBRATION',
        'Na__SourceTag__DEFAULT'
    );
    if (source) sourceTagEl.classList.add(`Na__SourceTag__${source}`);
}
