// Na__PointPicker__InteractiveClick
// Listens for clicks on the measurement canvas and converts them into
// image-space pixel coordinates. Clicks are queued in pairs; once two clicks
// have been collected, the registered onPair callback fires.
//
// External code can also "arm" the picker for special modes (e.g.
// reference-calibration), in which case onCalibrationPair is fired instead of
// onPair for the next pair.

export function Na__PointPicker__Create(canvasElement) {
    const state = {
        pendingFirst:           null,
        listeners:               { onPair: null, onCalibrationPair: null, onSinglePoint: null, onPreview: null },
        mode:                   'measure',
        magnifierProvider:      null
    };

    canvasElement.addEventListener('mousedown', (event) => {
        if (event.button !== 0) return;
        const point = Na__PointPicker__ToImagePixel(event, canvasElement);
        if (typeof state.listeners.onSinglePoint === 'function') {
            state.listeners.onSinglePoint(point);
        }

        if (state.pendingFirst === null) {
            console.info(`[Na__PointPicker] first click captured (mode=${state.mode}) at (${point.x.toFixed(0)}, ${point.y.toFixed(0)})`);
            state.pendingFirst = point;
            if (typeof state.listeners.onPreview === 'function') {
                state.listeners.onPreview(point, state.pendingFirst, state.mode, { clientX: event.clientX, clientY: event.clientY });
            }
            return;
        }
        const first  = state.pendingFirst;
        const second = point;
        state.pendingFirst = null;
        const wasMode = state.mode;
        if (state.mode === 'calibrate') {
            state.mode = 'measure';
            if (typeof state.listeners.onCalibrationPair === 'function') {
                state.listeners.onCalibrationPair(first, second);
            }
        } else {
            if (typeof state.listeners.onPair === 'function') {
                state.listeners.onPair(first, second);
            }
        }
        console.info(`[Na__PointPicker] pair fired (mode=${wasMode})`);
    });

    canvasElement.addEventListener('mousemove', (event) => {
        const point = Na__PointPicker__ToImagePixel(event, canvasElement);
        if (typeof state.listeners.onPreview === 'function') {
            state.listeners.onPreview(point, state.pendingFirst, state.mode, { clientX: event.clientX, clientY: event.clientY });
        }
    });

    canvasElement.addEventListener('mouseleave', () => {
        if (typeof state.listeners.onPreview === 'function') {
            state.listeners.onPreview(null, state.pendingFirst, state.mode, null);
        }
    });

    return {
        on(eventName, fn) { state.listeners[eventName] = fn; },
        startCalibrationMode() {
            state.pendingFirst = null;
            state.mode         = 'calibrate';
        },
        cancel() {
            state.pendingFirst = null;
            state.mode         = 'measure';
        },
        getMode() { return state.mode; }
    };
}

function Na__PointPicker__ToImagePixel(mouseEvent, canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx   = canvas.width  / rect.width;
    const sy   = canvas.height / rect.height;
    return {
        x: (mouseEvent.clientX - rect.left) * sx,
        y: (mouseEvent.clientY - rect.top)  * sy
    };
}
