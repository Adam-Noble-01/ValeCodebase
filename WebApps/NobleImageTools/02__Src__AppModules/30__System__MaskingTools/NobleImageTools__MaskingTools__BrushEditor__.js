/* =============================================================================
   NOBLEIMAGETOOLS - MASKING TOOLS - BRUSH EDITOR
   =============================================================================

   FILE       : NobleImageTools__MaskingTools__BrushEditor__.js
   NAMESPACE  : NobleImageTools
   MODULE     : MaskingTools - Brush Editor
   PURPOSE    : Photoshop-style brush for painting or erasing on the selected
                mask layer. Operates entirely client-side on the maskData array.
                Supports adjustable radius and hardness with soft falloff.

   KEYBOARD SHORTCUTS (active when in paint-add or paint-sub mode):
     [          Decrease brush size
     ]          Increase brush size
     Shift+[    Decrease hardness (softer)
     Shift+]    Increase hardness (harder)
     1–9        Set hardness 10%–90%
     0          Set hardness 100%

   ============================================================================= */

// @delegate: ../10__System__ImageCanvas/NobleImageTools__Canvas__Renderer__.js

(function () {
    'use strict';

// =============================================================================
// REGION | Brush State (public — read by Renderer for cursor)
// =============================================================================

    // MODULE VARIABLES | Current brush parameters and cursor position
    // ------------------------------------------------------------
    window.NobleImageTools__Brush = {
        radiusPx    : 40,                                            // <-- Brush radius in IMAGE pixels
        hardness    : 0.85,                                          // <-- 0.0 (soft) to 1.0 (hard)
        cursorSX    : 0,                                             // <-- Cursor screen X
        cursorSY    : 0,                                             // <-- Cursor screen Y
        visible     : false                                          // <-- Show cursor ring
    };
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Brush Painting Logic
// =============================================================================

    // HELPER FUNCTION | Paint one circle stamp at image coordinate (imgX, imgY)
    // ------------------------------------------------------------
    function NobleImageTools__Brush__Stamp(imgX, imgY, mode) {
        const appState  = window.NobleImageTools__State;
        const layer     = appState.layers.find(function (l) { return l.id === appState.selectedLayerId; });

        if (!layer || !layer.maskData) {
            return;
        }

        const W         = appState.image.width;
        const H         = appState.image.height;
        const brush     = window.NobleImageTools__Brush;
        const r         = brush.radiusPx;
        const rSq       = r * r;
        const hardR     = r * brush.hardness;
        const hardRSq   = hardR * hardR;
        const isAdd     = (mode === 'paint-add');
        const fallRange = r - hardR;

        const x0        = Math.max(0, Math.floor(imgX - r));
        const x1        = Math.min(W - 1, Math.ceil(imgX + r));
        const y0        = Math.max(0, Math.floor(imgY - r));
        const y1        = Math.min(H - 1, Math.ceil(imgY + r));

        let changed     = false;

        for (let py = y0; py <= y1; py++) {
            for (let px = x0; px <= x1; px++) {
                const dx    = px - imgX;
                const dy    = py - imgY;
                const dSq   = dx * dx + dy * dy;

                if (dSq > rSq) continue;

                let apply   = true;

                if (dSq > hardRSq && fallRange > 0.5) {
                    const d     = Math.sqrt(dSq);
                    const t     = (d - hardR) / fallRange;          // <-- 0 at hardR, 1 at r
                    apply       = Math.random() > t;                 // <-- probabilistic soft falloff
                }

                if (apply) {
                    const idx   = py * W + px;
                    if (layer.maskData[idx] !== isAdd) {
                        layer.maskData[idx] = isAdd;
                        changed = true;
                    }
                }
            }
        }

        if (changed) {
            window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__AddLayerOffscreen(
                layer, W, H
            );
            window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Interpolate brush stamps along a drag line
    // ------------------------------------------------------------
    function NobleImageTools__Brush__StrokeTo(x0, y0, x1, y1, mode) {
        const brush     = window.NobleImageTools__Brush;
        const spacing   = Math.max(1, brush.radiusPx * 0.25);       // <-- Stamp every 25% of radius
        const dx        = x1 - x0;
        const dy        = y1 - y0;
        const dist      = Math.sqrt(dx * dx + dy * dy);
        const steps     = Math.max(1, Math.ceil(dist / spacing));

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            NobleImageTools__Brush__Stamp(x0 + dx * t, y0 + dy * t, mode);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Mouse Event Handler
// =============================================================================

    // MODULE VARIABLES | Drag state
    // ------------------------------------------------------------
    let _isPainting     = false;                                     // <-- True while left button held
    let _lastImgPos     = null;                                      // <-- Last image coord painted
    let _canvas         = null;                                      // <-- Canvas element ref
    // ---------------------------------------------------------------


    // HELPER FUNCTION | Convert mouse event to image coordinates
    // ------------------------------------------------------------
    function NobleImageTools__Brush__EventToImage(e) {
        const rect  = _canvas.getBoundingClientRect();
        const sx    = e.clientX - rect.left;
        const sy    = e.clientY - rect.top;
        return window.NobleImageTools__Canvas__PanZoom.NobleImageTools__PanZoom__ScreenToImage(sx, sy);
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle mousedown in paint mode
    // ------------------------------------------------------------
    function NobleImageTools__Brush__OnMouseDown(e) {
        const state = window.NobleImageTools__State;
        if (state.mode !== 'paint-add' && state.mode !== 'paint-sub') return;
        if (e.button !== 0) return;

        e.preventDefault();

        const layer = state.layers.find(function (l) { return l.id === state.selectedLayerId; });
        if (!layer) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'Select a layer to paint on.', 'warning'
            );
            return;
        }

        _isPainting     = true;
        const img       = NobleImageTools__Brush__EventToImage(e);
        _lastImgPos     = img;
        NobleImageTools__Brush__Stamp(img.x, img.y, state.mode);
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle mousemove — paint along stroke + update cursor
    // ------------------------------------------------------------
    function NobleImageTools__Brush__OnMouseMove(e) {
        const rect      = _canvas.getBoundingClientRect();
        const sx        = e.clientX - rect.left;
        const sy        = e.clientY - rect.top;
        const brush     = window.NobleImageTools__Brush;

        brush.cursorSX  = sx;
        brush.cursorSY  = sy;
        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();

        if (!_isPainting || !_lastImgPos) return;

        const state     = window.NobleImageTools__State;
        if (state.mode !== 'paint-add' && state.mode !== 'paint-sub') return;

        const img       = NobleImageTools__Brush__EventToImage(e);
        NobleImageTools__Brush__StrokeTo(_lastImgPos.x, _lastImgPos.y, img.x, img.y, state.mode);
        _lastImgPos     = img;
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle mouseup — end stroke
    // ------------------------------------------------------------
    function NobleImageTools__Brush__OnMouseUp(e) {
        if (e.button === 0) {
            _isPainting     = false;
            _lastImgPos     = null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Brush Size / Hardness Adjustment
// =============================================================================

    // FUNCTION | Change brush size by a delta (image pixels)
    // ------------------------------------------------------------
    function NobleImageTools__Brush__AdjustRadius(delta) {
        const brush     = window.NobleImageTools__Brush;
        brush.radiusPx  = Math.max(1, Math.min(500, brush.radiusPx + delta));
        NobleImageTools__Brush__UpdateUI();
    }
    // ------------------------------------------------------------


    // FUNCTION | Change brush hardness by a delta fraction
    // ------------------------------------------------------------
    function NobleImageTools__Brush__AdjustHardness(delta) {
        const brush     = window.NobleImageTools__Brush;
        brush.hardness  = Math.max(0, Math.min(1, brush.hardness + delta));
        NobleImageTools__Brush__UpdateUI();
    }
    // ------------------------------------------------------------


    // FUNCTION | Set hardness from number key (1=10% … 9=90%, 0=100%)
    // ------------------------------------------------------------
    function NobleImageTools__Brush__SetHardnessFromKey(digit) {
        const brush     = window.NobleImageTools__Brush;
        brush.hardness  = digit === 0 ? 1.0 : digit / 10;
        NobleImageTools__Brush__UpdateUI();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sync sliders/labels in the brush control panel
    // ------------------------------------------------------------
    function NobleImageTools__Brush__UpdateUI() {
        const brush     = window.NobleImageTools__Brush;

        const sizeSlider  = document.getElementById('Nit__Brush__SizeSlider');
        const sizeLabel   = document.getElementById('Nit__Brush__SizeLabel');
        const hardSlider  = document.getElementById('Nit__Brush__HardSlider');
        const hardLabel   = document.getElementById('Nit__Brush__HardLabel');

        if (sizeSlider) sizeSlider.value         = brush.radiusPx;
        if (sizeLabel)  sizeLabel.textContent    = `${Math.round(brush.radiusPx)}px`;
        if (hardSlider) hardSlider.value         = Math.round(brush.hardness * 100);
        if (hardLabel)  hardLabel.textContent    = `${Math.round(brush.hardness * 100)}%`;

        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Brush Mode Activation
// =============================================================================

    // FUNCTION | Called when a paint mode is entered or exited
    // ------------------------------------------------------------
    function NobleImageTools__Brush__OnModeChange(newMode) {
        const brush         = window.NobleImageTools__Brush;
        const isPaintMode   = (newMode === 'paint-add' || newMode === 'paint-sub');

        brush.visible       = isPaintMode;

        const panel     = document.getElementById('Nit__Brush__Panel');
        if (panel) panel.style.display = isPaintMode ? 'flex' : 'none';

        if (_canvas) {
            _canvas.style.cursor = isPaintMode ? 'none' : '';
        }

        if (!isPaintMode) {
            _isPainting = false;
            _lastImgPos = null;
        }

        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Initialisation
// =============================================================================

    // FUNCTION | Wire DOM and canvas events for the brush editor
    // ------------------------------------------------------------
    function NobleImageTools__Brush__Init(canvasEl) {
        _canvas = canvasEl;

        canvasEl.addEventListener('mousedown', NobleImageTools__Brush__OnMouseDown);
        canvasEl.addEventListener('mousemove', NobleImageTools__Brush__OnMouseMove);

        canvasEl.addEventListener('mouseenter', function () {
            const state = window.NobleImageTools__State;
            if (state.mode === 'paint-add' || state.mode === 'paint-sub') {
                window.NobleImageTools__Brush.visible = true;
            }
        });

        canvasEl.addEventListener('mouseleave', function () {
            window.NobleImageTools__Brush.visible = false;
            window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
        });

        window.addEventListener('mouseup', NobleImageTools__Brush__OnMouseUp);

        const sizeSlider = document.getElementById('Nit__Brush__SizeSlider');
        const hardSlider = document.getElementById('Nit__Brush__HardSlider');

        if (sizeSlider) {
            sizeSlider.addEventListener('input', function () {
                window.NobleImageTools__Brush.radiusPx = parseInt(sizeSlider.value, 10);
                NobleImageTools__Brush__UpdateUI();
            });
        }

        if (hardSlider) {
            hardSlider.addEventListener('input', function () {
                window.NobleImageTools__Brush.hardness = parseInt(hardSlider.value, 10) / 100;
                NobleImageTools__Brush__UpdateUI();
            });
        }

        NobleImageTools__Brush__UpdateUI();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Public API
// =============================================================================

    window.NobleImageTools__MaskingTools__BrushEditor = {
        NobleImageTools__Brush__Init            : NobleImageTools__Brush__Init,
        NobleImageTools__Brush__OnModeChange    : NobleImageTools__Brush__OnModeChange,
        NobleImageTools__Brush__AdjustRadius    : NobleImageTools__Brush__AdjustRadius,
        NobleImageTools__Brush__AdjustHardness  : NobleImageTools__Brush__AdjustHardness,
        NobleImageTools__Brush__SetHardnessFromKey : NobleImageTools__Brush__SetHardnessFromKey
    };

// endregion -------------------------------------------------------------------

}());
