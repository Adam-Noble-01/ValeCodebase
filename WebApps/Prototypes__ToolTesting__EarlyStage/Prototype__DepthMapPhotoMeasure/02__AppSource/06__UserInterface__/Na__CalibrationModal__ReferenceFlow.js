// Na__CalibrationModal__ReferenceFlow
// Drives the inline reference-calibration form. Two capture modes are
// supported:
//   'primary'   : the first calibration; produces the focal solve and the
//                 wall-plane primary anchor.
//   'secondary' : an optional second known length on the same wall used to
//                 stabilise the wall-plane interpolation across x-position.
//
// The bootstrap layer samples the depth at each captured point eagerly so we
// can show a divergence-warning banner inside the form when the depth model
// disagrees about whether the two clicks lie on the same plane (the surveyor
// should re-pick on a clearly flat feature in that case).

export function Na__CalibrationModal__ReferenceFlow_Wire(elements, picker) {
    const {
        startButton,
        startSecondaryButton,
        inlineForm,
        lengthInput,
        applyButton,
        cancelButton,
        divergenceBanner,
        captureModeLabel,
        summaryReadout
    } = elements;

    const state = {
        listeners: {
            onApplied:           null,
            onSecondaryApplied:  null,
            onStarted:           null,
            onCancelled:         null,
            onPairCaptured:      null
        },
        firstPoint:   null,
        secondPoint:  null,
        captureMode:  'primary'
    };

    function Na__Calibration__SetCaptureModeLabel(mode) {
        if (!captureModeLabel) return;
        captureModeLabel.textContent = mode === 'secondary' ? 'Secondary wall reference' : 'Primary reference';
        captureModeLabel.classList.toggle('Na__Calibration__CaptureModeLabel__Secondary', mode === 'secondary');
    }

    function Na__Calibration__ResetForm() {
        state.firstPoint  = null;
        state.secondPoint = null;
        state.captureMode = 'primary';
        inlineForm.hidden = true;
        startButton.classList.remove('Na__Calibration__Active');
        if (startSecondaryButton) startSecondaryButton.classList.remove('Na__Calibration__Active');
        startButton.textContent = 'Start reference calibration';
        if (startSecondaryButton) startSecondaryButton.textContent = 'Add second wall reference';
        lengthInput.value = '';
        Na__Calibration__SetCaptureModeLabel('primary');
        if (divergenceBanner) {
            divergenceBanner.hidden = true;
            divergenceBanner.classList.remove('Na__Calibration__Banner__Bad');
        }
    }

    function Na__Calibration__BeginCapture(mode) {
        Na__Calibration__ResetForm();
        state.captureMode = mode;
        Na__Calibration__SetCaptureModeLabel(mode);
        picker.startCalibrationMode();
        if (mode === 'secondary' && startSecondaryButton) {
            startSecondaryButton.classList.add('Na__Calibration__Active');
            startSecondaryButton.textContent = 'Click first secondary point...';
        } else {
            startButton.classList.add('Na__Calibration__Active');
            startButton.textContent = 'Click first reference point...';
        }
        if (typeof state.listeners.onStarted === 'function') state.listeners.onStarted(mode);
    }

    startButton.addEventListener('click', () => {
        console.info('[Na__Calibration] start clicked - arming picker for primary reference');
        Na__Calibration__BeginCapture('primary');
    });

    if (startSecondaryButton) {
        startSecondaryButton.addEventListener('click', () => {
            console.info('[Na__Calibration] start clicked - arming picker for secondary reference');
            Na__Calibration__BeginCapture('secondary');
        });
    }

    cancelButton.addEventListener('click', () => {
        console.info('[Na__Calibration] cancel clicked');
        picker.cancel();
        if (typeof state.listeners.onCancelled === 'function') state.listeners.onCancelled(state.captureMode);
        Na__Calibration__ResetForm();
    });

    function Na__Calibration__TryApply() {
        const lengthMm = parseFloat(lengthInput.value);
        console.info(`[Na__Calibration] apply requested - mode=${state.captureMode} lengthMm=${lengthMm}, hasPair=${!!(state.firstPoint && state.secondPoint)}`);
        if (!isFinite(lengthMm) || lengthMm <= 0) {
            lengthInput.focus();
            console.warn('[Na__Calibration] apply blocked - invalid known length');
            return;
        }
        if (!state.firstPoint || !state.secondPoint) {
            console.warn('[Na__Calibration] apply blocked - reference points not captured');
            return;
        }
        const lengthMeters = lengthMm / 1000.0;
        const mode = state.captureMode;
        const listenerName = mode === 'secondary' ? 'onSecondaryApplied' : 'onApplied';
        let applyResult = { success: true };
        if (typeof state.listeners[listenerName] === 'function') {
            console.info(`[Na__Calibration] firing ${listenerName} with length=${lengthMeters}m`);
            applyResult = state.listeners[listenerName](state.firstPoint, state.secondPoint, lengthMeters);
        } else {
            console.error(`[Na__Calibration] ${listenerName} listener missing!`);
            applyResult = { success: false, reason: `${listenerName} listener missing.` };
        }

        const isSecondary = mode === 'secondary';
        const didFailSecondaryApply = isSecondary && applyResult && applyResult.success === false;
        if (didFailSecondaryApply) {
            const reason = applyResult.reason || 'Secondary wall reference could not be applied.';
            console.warn(`[Na__Calibration] secondary apply failed: ${reason}`);
            if (divergenceBanner) {
                divergenceBanner.textContent = reason;
                divergenceBanner.classList.add('Na__Calibration__Banner__Bad');
                divergenceBanner.hidden = false;
            }
            return;
        }
        Na__Calibration__ResetForm();
    }

    applyButton.addEventListener('click', Na__Calibration__TryApply);

    lengthInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            Na__Calibration__TryApply();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancelButton.click();
        }
    });

    return {
        on(eventName, fn) { state.listeners[eventName] = fn; },
        getCaptureMode() { return state.captureMode; },
        handleCalibrationPair(first, second) {
            console.info(`[Na__Calibration] pair captured (mode=${state.captureMode}): A=(${first.x.toFixed(0)},${first.y.toFixed(0)}) B=(${second.x.toFixed(0)},${second.y.toFixed(0)})`);
            state.firstPoint  = first;
            state.secondPoint = second;
            const activeBtn = state.captureMode === 'secondary' ? (startSecondaryButton || startButton) : startButton;
            activeBtn.textContent = 'Reference points captured - enter length';
            inlineForm.hidden = false;
            lengthInput.focus();
            if (typeof state.listeners.onPairCaptured === 'function') state.listeners.onPairCaptured(first, second, state.captureMode);
        },
        showDivergenceResult(depthA, depthB, inspection) {
            if (!divergenceBanner) return;
            if (!inspection || inspection.status === 'ok') {
                divergenceBanner.hidden = true;
                divergenceBanner.classList.remove('Na__Calibration__Banner__Bad');
                return;
            }
            const a = isFinite(depthA) ? `${depthA.toFixed(2)} m` : '--';
            const b = isFinite(depthB) ? `${depthB.toFixed(2)} m` : '--';
            const ratio = isFinite(inspection.ratio) ? inspection.ratio.toFixed(2) : '--';
            divergenceBanner.textContent = `Depth model says ${a} vs ${b} (ratio ${ratio}x). These points may not be on the same plane - calibration will still scale your dimensions correctly, but consider re-picking on a clearly flat feature for best accuracy.`;
            divergenceBanner.classList.toggle('Na__Calibration__Banner__Bad', inspection.status === 'bad');
            divergenceBanner.hidden = false;
        },
        showSecondaryAvailable(visible) {
            if (!startSecondaryButton) return;
            startSecondaryButton.hidden = !visible;
        },
        showSummary(text) {
            if (!summaryReadout) return;
            if (!text) {
                summaryReadout.hidden = true;
                summaryReadout.textContent = '';
                return;
            }
            summaryReadout.textContent = text;
            summaryReadout.hidden = false;
        },
        cancel: Na__Calibration__ResetForm
    };
}
