// Na__CanvasViewport__ZoomPanController
// Owns a single { scale, panX, panY } triple for the canvas stage and writes it
// to a CSS transform on a frame element wrapping the three canvases.
//
// Inputs:
//   - mouse wheel anywhere on the stage  -> cursor-centred zoom
//   - configured pan mouse button drag    -> pan
//   - keyboard 'F' on the stage region    -> fit to view
//   - the HUD's Fit button                -> fit to view
//
// Because the point picker reads canvas.getBoundingClientRect() and rescales by
// canvas.width / rect.width, CSS-transforming the frame element does NOT break
// click-to-image-pixel mapping. No measurement-side changes are required.

export function Na__CanvasViewport__Create(deps) {
    const { stageElement, frameElement, hudElements, viewportConfig } = deps;
    const cfg = Na__CanvasViewport__NormaliseConfig(viewportConfig);

    const state = {
        imageWidth:  0,
        imageHeight: 0,
        scale:       1,
        panX:        0,
        panY:        0,
        panning:     false,
        panLastX:    0,
        panLastY:    0,
        listeners:   []
    };

    Na__CanvasViewport__InstallWheelHandler(stageElement, state, cfg, frameElement);
    Na__CanvasViewport__InstallPanHandlers(stageElement, state, cfg);
    Na__CanvasViewport__InstallKeyHandler(stageElement, state, () => Na__CanvasViewport__FitToStage(state, stageElement, cfg));
    Na__CanvasViewport__InstallHudHandlers(hudElements, () => Na__CanvasViewport__FitToStage(state, stageElement, cfg));

    Na__CanvasViewport__ApplyTransform(frameElement, state);
    Na__CanvasViewport__UpdateHud(hudElements, state);

    return {
        setImageSize(width, height) {
            state.imageWidth  = width;
            state.imageHeight = height;
            Na__CanvasViewport__SetFrameIntrinsicSize(frameElement, width, height);
            Na__CanvasViewport__FitToStage(state, stageElement, cfg);
            Na__CanvasViewport__ApplyTransform(frameElement, state);
            Na__CanvasViewport__UpdateHud(hudElements, state);
            Na__CanvasViewport__NotifyListeners(state);
        },
        fitToStage() {
            Na__CanvasViewport__FitToStage(state, stageElement, cfg);
            Na__CanvasViewport__ApplyTransform(frameElement, state);
            Na__CanvasViewport__UpdateHud(hudElements, state);
            Na__CanvasViewport__NotifyListeners(state);
        },
        getTransform() {
            return { scale: state.scale, panX: state.panX, panY: state.panY };
        },
        subscribe(fn) {
            state.listeners.push(fn);
            return () => {
                const idx = state.listeners.indexOf(fn);
                if (idx >= 0) state.listeners.splice(idx, 1);
            };
        }
    };
}

function Na__CanvasViewport__NormaliseConfig(viewportConfig) {
    return {
        minZoom:         viewportConfig?.minZoom         ?? 0.05,
        maxZoom:         viewportConfig?.maxZoom         ?? 16,
        wheelZoomFactor: viewportConfig?.wheelZoomFactor ?? 1.15,
        fitPaddingPx:    viewportConfig?.fitPaddingPx    ?? 16,
        panMouseButton:  viewportConfig?.panMouseButton  ?? 1
    };
}

function Na__CanvasViewport__SetFrameIntrinsicSize(frameElement, width, height) {
    frameElement.style.width  = `${width}px`;
    frameElement.style.height = `${height}px`;
}

// ============================== TRANSFORM APPLICATION ==============================
function Na__CanvasViewport__ApplyTransform(frameElement, state) {
    frameElement.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
}

function Na__CanvasViewport__UpdateHud(hudElements, state) {
    if (!hudElements || !hudElements.zoomReadout) return;
    const pct = Math.round(state.scale * 100);
    hudElements.zoomReadout.textContent = `${pct}%`;
}

function Na__CanvasViewport__NotifyListeners(state) {
    const snapshot = { scale: state.scale, panX: state.panX, panY: state.panY };
    for (const fn of state.listeners) {
        try { fn(snapshot); } catch (err) { console.error('[Na__CanvasViewport] listener error:', err); }
    }
}

// ============================== FIT TO STAGE ==============================
function Na__CanvasViewport__FitToStage(state, stageElement, cfg) {
    if (!state.imageWidth || !state.imageHeight) return;
    const rect = stageElement.getBoundingClientRect();
    const availW = Math.max(1, rect.width  - cfg.fitPaddingPx * 2);
    const availH = Math.max(1, rect.height - cfg.fitPaddingPx * 2);
    const scale  = Math.min(availW / state.imageWidth, availH / state.imageHeight);
    state.scale  = Na__CanvasViewport__Clamp(scale, cfg.minZoom, cfg.maxZoom);
    state.panX   = (rect.width  - state.imageWidth  * state.scale) / 2;
    state.panY   = (rect.height - state.imageHeight * state.scale) / 2;
}

function Na__CanvasViewport__Clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

// ============================== WHEEL ZOOM ==============================
function Na__CanvasViewport__InstallWheelHandler(stageElement, state, cfg, frameElement) {
    stageElement.addEventListener('wheel', (event) => {
        if (!state.imageWidth) return;
        event.preventDefault();
        const stageRect = stageElement.getBoundingClientRect();
        const stageX    = event.clientX - stageRect.left;
        const stageY    = event.clientY - stageRect.top;
        const zoomIn    = event.deltaY < 0;
        const factor    = zoomIn ? cfg.wheelZoomFactor : 1 / cfg.wheelZoomFactor;
        Na__CanvasViewport__ZoomAtStagePoint(state, cfg, stageX, stageY, factor);
        Na__CanvasViewport__ApplyTransform(frameElement, state);
        Na__CanvasViewport__UpdateHud({ zoomReadout: stageElement.querySelector('#Na__Viewport__ZoomReadout') }, state);
        Na__CanvasViewport__NotifyListeners(state);
    }, { passive: false });
}

function Na__CanvasViewport__ZoomAtStagePoint(state, cfg, stageX, stageY, factor) {
    const imageX     = (stageX - state.panX) / state.scale;
    const imageY     = (stageY - state.panY) / state.scale;
    const newScale   = Na__CanvasViewport__Clamp(state.scale * factor, cfg.minZoom, cfg.maxZoom);
    state.panX       = stageX - imageX * newScale;
    state.panY       = stageY - imageY * newScale;
    state.scale      = newScale;
}

// ============================== PAN (configured mouse button drag) ==============================
function Na__CanvasViewport__InstallPanHandlers(stageElement, state, cfg) {
    stageElement.addEventListener('mousedown', (event) => {
        if (event.button !== cfg.panMouseButton) return;
        if (!state.imageWidth) return;
        event.preventDefault();
        state.panning  = true;
        state.panLastX = event.clientX;
        state.panLastY = event.clientY;
        stageElement.classList.add('Na__Stage__Panning');
    });

    window.addEventListener('mousemove', (event) => {
        if (!state.panning) return;
        const dx = event.clientX - state.panLastX;
        const dy = event.clientY - state.panLastY;
        state.panLastX = event.clientX;
        state.panLastY = event.clientY;
        state.panX    += dx;
        state.panY    += dy;
        const frame = stageElement.querySelector('#Na__Stage__ViewportFrame');
        if (frame) Na__CanvasViewport__ApplyTransform(frame, state);
    });

    window.addEventListener('mouseup', (event) => {
        if (!state.panning) return;
        if (event.button !== cfg.panMouseButton) return;
        state.panning = false;
        stageElement.classList.remove('Na__Stage__Panning');
        Na__CanvasViewport__NotifyListeners(state);
    });

    stageElement.addEventListener('auxclick', (event) => {
        if (event.button === cfg.panMouseButton) event.preventDefault();
    });

    stageElement.addEventListener('contextmenu', (event) => {
        if (state.panning) event.preventDefault();
    });
}

// ============================== KEYBOARD FIT ==============================
function Na__CanvasViewport__InstallKeyHandler(stageElement, state, fitFn) {
    stageElement.tabIndex = stageElement.tabIndex || 0;
    stageElement.addEventListener('keydown', (event) => {
        if (event.key === 'f' || event.key === 'F') {
            event.preventDefault();
            fitFn();
        }
    });
    window.addEventListener('keydown', (event) => {
        if (event.target && event.target.matches && event.target.matches('input, textarea, [contenteditable]')) return;
        if (event.key === 'f' || event.key === 'F') {
            if (!state.imageWidth) return;
            event.preventDefault();
            fitFn();
        }
    });
}

// ============================== HUD WIRING ==============================
function Na__CanvasViewport__InstallHudHandlers(hudElements, fitFn) {
    if (!hudElements || !hudElements.fitButton) return;
    hudElements.fitButton.addEventListener('click', () => fitFn());
}
