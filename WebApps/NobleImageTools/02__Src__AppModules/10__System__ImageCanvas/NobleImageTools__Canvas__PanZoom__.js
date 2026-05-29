/* =============================================================================
   NOBLEIMAGETOOLS - CANVAS PAN/ZOOM SYSTEM
   =============================================================================

   FILE       : NobleImageTools__Canvas__PanZoom__.js
   NAMESPACE  : NobleImageTools
   MODULE     : Canvas - Pan/Zoom Transform Manager
   PURPOSE    : Manages the canvas transform state (scale, offsetX, offsetY).
                Handles mouse-wheel zoom centred on cursor, middle-mouse drag
                panning, and Space+drag panning. Exposes transform helpers for
                converting between screen and image coordinates.

   ============================================================================= */

// @delegate: ../01__AppCore/NobleImageTools__AppCore__Init__.js

(function () {
    'use strict';

// =============================================================================
// REGION | Module State
// =============================================================================

    // MODULE VARIABLES | Transform and interaction state
    // ------------------------------------------------------------
    let _canvas         = null;                                      // <-- HTML canvas element
    let _transform      = { scale: 1.0, offsetX: 0, offsetY: 0 };  // <-- Current canvas transform
    let _isPanning      = false;                                     // <-- True while middle-mouse/space panning
    let _panStart       = { x: 0, y: 0 };                          // <-- Mouse position at pan start
    let _panOrigin      = { offsetX: 0, offsetY: 0 };              // <-- Transform at pan start
    let _spaceHeld      = false;                                     // <-- True when Space key is depressed
    let _onChangeCallback = null;                                    // <-- Called after any transform change
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Coordinate Utilities
// =============================================================================

    // HELPER FUNCTION | Convert screen pixel to image coordinate
    // ------------------------------------------------------------
    function NobleImageTools__PanZoom__ScreenToImage(screenX, screenY) {
        return {
            x : (screenX - _transform.offsetX) / _transform.scale,
            y : (screenY - _transform.offsetY) / _transform.scale
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert image coordinate to screen pixel
    // ------------------------------------------------------------
    function NobleImageTools__PanZoom__ImageToScreen(imageX, imageY) {
        return {
            x : imageX * _transform.scale + _transform.offsetX,
            y : imageY * _transform.scale + _transform.offsetY
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp transform to reasonable bounds
    // ------------------------------------------------------------
    function NobleImageTools__PanZoom__ClampTransform(config, imgW, imgH) {
        if (!imgW || !imgH) return;

        const canvasW   = _canvas.offsetWidth;
        const canvasH   = _canvas.offsetHeight;
        const minZoom   = config.NobleImageTools__Canvas__MinZoom || 0.05;
        const maxZoom   = config.NobleImageTools__Canvas__MaxZoom || 20.0;

        _transform.scale    = Math.max(minZoom, Math.min(maxZoom, _transform.scale));

        const scaledW   = imgW * _transform.scale;
        const scaledH   = imgH * _transform.scale;
        const marginX   = Math.min(canvasW * 0.5, scaledW * 0.5);
        const marginY   = Math.min(canvasH * 0.5, scaledH * 0.5);

        _transform.offsetX  = Math.max(marginX - scaledW, Math.min(canvasW - marginX, _transform.offsetX));
        _transform.offsetY  = Math.max(marginY - scaledH, Math.min(canvasH - marginY, _transform.offsetY));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Transform Manipulation
// =============================================================================

    // FUNCTION | Zoom centred on a screen coordinate
    // ------------------------------------------------------------
    function NobleImageTools__PanZoom__ZoomAt(screenX, screenY, delta, config) {
        const step      = config.NobleImageTools__Canvas__ZoomStep || 0.12;
        const factor    = delta < 0 ? (1 + step) : (1 - step);
        const newScale  = _transform.scale * factor;

        const minZoom   = config.NobleImageTools__Canvas__MinZoom || 0.05;
        const maxZoom   = config.NobleImageTools__Canvas__MaxZoom || 20.0;
        const clamped   = Math.max(minZoom, Math.min(maxZoom, newScale));

        const ratio     = clamped / _transform.scale;

        _transform.offsetX  = screenX - (screenX - _transform.offsetX) * ratio;
        _transform.offsetY  = screenY - (screenY - _transform.offsetY) * ratio;
        _transform.scale    = clamped;

        if (_onChangeCallback) _onChangeCallback(_transform);
    }
    // ------------------------------------------------------------


    // FUNCTION | Fit image to canvas with padding
    // ------------------------------------------------------------
    function NobleImageTools__PanZoom__FitToCanvas(imgW, imgH) {
        if (!imgW || !imgH || !_canvas) return;

        const canvasW   = _canvas.offsetWidth;
        const canvasH   = _canvas.offsetHeight;
        const padding   = 32;

        const scaleX    = (canvasW - padding * 2) / imgW;
        const scaleY    = (canvasH - padding * 2) / imgH;
        const scale     = Math.min(scaleX, scaleY, 1.0);

        _transform.scale    = scale;
        _transform.offsetX  = (canvasW - imgW * scale) / 2;
        _transform.offsetY  = (canvasH - imgH * scale) / 2;

        if (_onChangeCallback) _onChangeCallback(_transform);
    }
    // ------------------------------------------------------------


    // FUNCTION | Reset zoom to 100%
    // ------------------------------------------------------------
    function NobleImageTools__PanZoom__ResetZoom(imgW, imgH) {
        if (!_canvas) return;

        _transform.scale    = 1.0;
        _transform.offsetX  = (_canvas.offsetWidth  - imgW) / 2;
        _transform.offsetY  = (_canvas.offsetHeight - imgH) / 2;

        if (_onChangeCallback) _onChangeCallback(_transform);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Mouse & Keyboard Event Handlers
// =============================================================================

    // HELPER FUNCTION | Begin a pan gesture
    // ------------------------------------------------------------
    function NobleImageTools__PanZoom__BeginPan(clientX, clientY) {
        _isPanning          = true;
        _panStart           = { x: clientX, y: clientY };
        _panOrigin          = { offsetX: _transform.offsetX, offsetY: _transform.offsetY };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update pan during drag
    // ------------------------------------------------------------
    function NobleImageTools__PanZoom__UpdatePan(clientX, clientY) {
        if (!_isPanning) return;

        const rect          = _canvas.getBoundingClientRect();
        const dx            = clientX - _panStart.x;
        const dy            = clientY - _panStart.y;

        _transform.offsetX  = _panOrigin.offsetX + dx;
        _transform.offsetY  = _panOrigin.offsetY + dy;

        if (_onChangeCallback) _onChangeCallback(_transform);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | End a pan gesture
    // ------------------------------------------------------------
    function NobleImageTools__PanZoom__EndPan() {
        _isPanning = false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Attach all input event listeners to the canvas
    // ------------------------------------------------------------
    function NobleImageTools__PanZoom__AttachListeners(canvas, config, onChangeCallback, onCanvasClickCallback) {
        _canvas             = canvas;
        _onChangeCallback   = onChangeCallback;

        canvas.addEventListener('wheel', function (e) {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            NobleImageTools__PanZoom__ZoomAt(
                e.clientX - rect.left,
                e.clientY - rect.top,
                e.deltaY,
                config
            );
            if (_onChangeCallback) _onChangeCallback(_transform);
        }, { passive: false });

        canvas.addEventListener('mousedown', function (e) {
            if (e.button === 1 || (e.button === 0 && _spaceHeld)) {
                e.preventDefault();
                NobleImageTools__PanZoom__BeginPan(e.clientX, e.clientY);
                canvas.classList.add('Nit__Canvas--Panning');
                return;
            }
            if (typeof onCanvasClickCallback === 'function') {
                onCanvasClickCallback(e);
            }
        });

        window.addEventListener('mousemove', function (e) {
            if (_isPanning) {
                NobleImageTools__PanZoom__UpdatePan(e.clientX, e.clientY);
            }
        });

        window.addEventListener('mouseup', function (e) {
            if (_isPanning && (e.button === 1 || e.button === 0)) {
                NobleImageTools__PanZoom__EndPan();
                canvas.classList.remove('Nit__Canvas--Panning');
            }
        });

        window.addEventListener('keydown', function (e) {
            if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                _spaceHeld = true;
                canvas.classList.add('Nit__Canvas--Pan');
            }
        });

        window.addEventListener('keyup', function (e) {
            if (e.code === 'Space') {
                _spaceHeld = false;
                if (!_isPanning) canvas.classList.remove('Nit__Canvas--Pan');
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Public API
// =============================================================================

    window.NobleImageTools__Canvas__PanZoom = {

        // FUNCTION | Initialise and attach listeners
        // ------------------------------------------------------------
        NobleImageTools__PanZoom__Init : function (canvas, config, onChangeCallback, onClickCallback) {
            NobleImageTools__PanZoom__AttachListeners(canvas, config, onChangeCallback, onClickCallback);
        },
        // ------------------------------------------------------------

        NobleImageTools__PanZoom__GetTransform  : function ()       { return Object.assign({}, _transform); },
        NobleImageTools__PanZoom__FitToCanvas   : NobleImageTools__PanZoom__FitToCanvas,
        NobleImageTools__PanZoom__ResetZoom     : NobleImageTools__PanZoom__ResetZoom,
        NobleImageTools__PanZoom__ScreenToImage : NobleImageTools__PanZoom__ScreenToImage,
        NobleImageTools__PanZoom__ImageToScreen : NobleImageTools__PanZoom__ImageToScreen,
        NobleImageTools__PanZoom__IsPanning     : function ()       { return _isPanning; }
    };

// endregion -------------------------------------------------------------------

}());
