/* =============================================================================
   NOBLEIMAGETOOLS - CANVAS RENDERER
   =============================================================================

   FILE       : NobleImageTools__Canvas__Renderer__.js
   NAMESPACE  : NobleImageTools
   MODULE     : Canvas - Renderer
   PURPOSE    : Owns the HTML5 Canvas 2D rendering loop. Composites the source
                image, all mask overlays, active prompt points/box, and the
                preview mask from the last SAM2 prediction. All drawing is
                driven by the current PanZoom transform.

   ============================================================================= */

// @delegate: ./NobleImageTools__Canvas__PanZoom__.js

(function () {
    'use strict';

// =============================================================================
// REGION | Module State
// =============================================================================

    // MODULE VARIABLES | Canvas context and cached image
    // ------------------------------------------------------------
    let _canvas         = null;                                      // <-- HTML canvas element
    let _ctx            = null;                                      // <-- 2D rendering context
    let _imageEl        = null;                                      // <-- Loaded HTMLImageElement
    let _rafId          = null;                                      // <-- requestAnimationFrame handle
    let _dirty          = false;                                     // <-- Redraw needed flag
    let _offscreenMasks = {};                                        // <-- id -> offscreen canvas (mask bitmaps)
    let _previewMask    = null;                                      // <-- Offscreen canvas for live SAM2 preview
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Offscreen Mask Helpers
// =============================================================================

    // HELPER FUNCTION | Build an offscreen canvas from a flat mask array
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__BuildMaskOffscreen(maskData, imgW, imgH, hexColor) {
        const offscreen     = document.createElement('canvas');
        offscreen.width     = imgW;
        offscreen.height    = imgH;
        const octx          = offscreen.getContext('2d');
        const imageData     = octx.createImageData(imgW, imgH);

        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        for (let i = 0; i < maskData.length; i++) {
            if (maskData[i]) {
                const p4        = i * 4;
                imageData.data[p4]      = r;
                imageData.data[p4 + 1]  = g;
                imageData.data[p4 + 2]  = b;
                imageData.data[p4 + 3]  = 160;                      // <-- ~63% opacity overlay
            }
        }

        octx.putImageData(imageData, 0, 0);
        return offscreen;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Rebuild offscreen canvas for a single layer
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__RebuildLayerOffscreen(layer, imgW, imgH) {
        if (!layer.maskData || !imgW || !imgH) return;
        _offscreenMasks[layer.id] = NobleImageTools__Renderer__BuildMaskOffscreen(
            layer.maskData, imgW, imgH, layer.color
        );
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Draw Routines
// =============================================================================

    // HELPER FUNCTION | Resize canvas pixel buffer to its CSS size
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__SyncCanvasSize() {
        const dpr       = window.devicePixelRatio || 1;
        const w         = _canvas.offsetWidth;
        const h         = _canvas.offsetHeight;
        if (_canvas.width !== w * dpr || _canvas.height !== h * dpr) {
            _canvas.width   = w * dpr;
            _canvas.height  = h * dpr;
            _ctx.scale(dpr, dpr);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw the checkerboard background (shows transparency)
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__DrawCheckerboard() {
        const size  = 16;
        const cols  = Math.ceil(_canvas.offsetWidth  / size) + 1;
        const rows  = Math.ceil(_canvas.offsetHeight / size) + 1;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                _ctx.fillStyle = (row + col) % 2 === 0 ? '#161a22' : '#1a1f2a';
                _ctx.fillRect(col * size, row * size, size, size);
            }
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw the source image at the current transform
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__DrawImage(transform) {
        if (!_imageEl) return;

        const { scale, offsetX, offsetY }   = transform;
        const w = _imageEl.naturalWidth  * scale;
        const h = _imageEl.naturalHeight * scale;

        _ctx.drawImage(_imageEl, offsetX, offsetY, w, h);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw all visible mask overlays
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__DrawMaskOverlays(transform, layers) {
        if (!layers || !layers.length) return;

        const { scale, offsetX, offsetY }   = transform;

        for (const layer of layers) {
            if (!layer.visible || !_offscreenMasks[layer.id]) continue;
            const offscreen = _offscreenMasks[layer.id];
            _ctx.drawImage(
                offscreen,
                offsetX, offsetY,
                offscreen.width  * scale,
                offscreen.height * scale
            );
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw the live SAM2 preview overlay
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__DrawPreviewMask(transform) {
        if (!_previewMask) return;

        const { scale, offsetX, offsetY }   = transform;
        _ctx.drawImage(
            _previewMask,
            offsetX, offsetY,
            _previewMask.width  * scale,
            _previewMask.height * scale
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw prompt points (pos/neg)
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__DrawPromptPoints(transform, positivePoints, negativePoints) {
        const { scale, offsetX, offsetY }   = transform;
        const r = 7;

        function drawPoint(imgX, imgY, color) {
            const sx = imgX * scale + offsetX;
            const sy = imgY * scale + offsetY;

            _ctx.beginPath();
            _ctx.arc(sx, sy, r, 0, Math.PI * 2);
            _ctx.fillStyle      = color;
            _ctx.fill();
            _ctx.strokeStyle    = '#ffffff';
            _ctx.lineWidth      = 2;
            _ctx.stroke();

            _ctx.beginPath();
            if (color === '#ff4444') {
                _ctx.moveTo(sx - 4, sy - 4);
                _ctx.lineTo(sx + 4, sy + 4);
                _ctx.moveTo(sx + 4, sy - 4);
                _ctx.lineTo(sx - 4, sy + 4);
            } else {
                _ctx.moveTo(sx, sy - 4);
                _ctx.lineTo(sx, sy + 4);
                _ctx.moveTo(sx - 4, sy);
                _ctx.lineTo(sx + 4, sy);
            }
            _ctx.strokeStyle    = '#ffffff';
            _ctx.lineWidth      = 2;
            _ctx.stroke();
        }

        for (const pt of (positivePoints || [])) drawPoint(pt.x, pt.y, '#3af55a');
        for (const pt of (negativePoints || [])) drawPoint(pt.x, pt.y, '#ff4444');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw the prompt bounding box
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__DrawPromptBox(transform, box) {
        if (!box) return;

        const { scale, offsetX, offsetY }   = transform;
        const sx1   = box.x1 * scale + offsetX;
        const sy1   = box.y1 * scale + offsetY;
        const sx2   = box.x2 * scale + offsetX;
        const sy2   = box.y2 * scale + offsetY;
        const w     = sx2 - sx1;
        const h     = sy2 - sy1;

        _ctx.beginPath();
        _ctx.rect(sx1, sy1, w, h);
        _ctx.strokeStyle    = '#ffcc00';
        _ctx.lineWidth      = 2;
        _ctx.setLineDash([6, 4]);
        _ctx.stroke();
        _ctx.setLineDash([]);
        _ctx.fillStyle      = 'rgba(255, 204, 0, 0.06)';
        _ctx.fillRect(sx1, sy1, w, h);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw the brush cursor ring at current screen position
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__DrawBrushCursor(transform) {
        const brush     = window.NobleImageTools__Brush;
        if (!brush || !brush.visible) return;

        const screenR   = brush.radiusPx * transform.scale;

        _ctx.beginPath();
        _ctx.arc(brush.cursorSX, brush.cursorSY, Math.max(1, screenR), 0, Math.PI * 2);
        _ctx.strokeStyle    = 'rgba(255,255,255,0.9)';
        _ctx.lineWidth      = 1.5;
        _ctx.setLineDash([]);
        _ctx.stroke();

        _ctx.beginPath();
        _ctx.arc(brush.cursorSX, brush.cursorSY, Math.max(1, screenR), 0, Math.PI * 2);
        _ctx.strokeStyle    = 'rgba(0,0,0,0.5)';
        _ctx.lineWidth      = 0.75;
        _ctx.stroke();

        if (screenR > 8) {
            _ctx.beginPath();
            _ctx.arc(brush.cursorSX, brush.cursorSY, 1.5, 0, Math.PI * 2);
            _ctx.fillStyle  = 'rgba(255,255,255,0.9)';
            _ctx.fill();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Full compositing render pass
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__DrawFrame(transform, appState) {
        const w = _canvas.offsetWidth;
        const h = _canvas.offsetHeight;

        _ctx.clearRect(0, 0, w, h);
        NobleImageTools__Renderer__DrawCheckerboard();

        if (!_imageEl) return;

        NobleImageTools__Renderer__DrawImage(transform);
        NobleImageTools__Renderer__DrawMaskOverlays(transform, appState.layers);
        NobleImageTools__Renderer__DrawPreviewMask(transform);

        const tool = appState.tool || {};
        NobleImageTools__Renderer__DrawPromptPoints(transform, tool.positivePoints, tool.negativePoints);
        if (tool.box) NobleImageTools__Renderer__DrawPromptBox(transform, tool.box);

        NobleImageTools__Renderer__DrawBrushCursor(transform);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Render Loop
// =============================================================================

    // FUNCTION | Schedule a redraw via rAF
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__RequestRedraw() {
        _dirty = true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Continuous rAF loop
    // ------------------------------------------------------------
    function NobleImageTools__Renderer__Loop() {
        if (_dirty) {
            NobleImageTools__Renderer__SyncCanvasSize();
            const transform = window.NobleImageTools__Canvas__PanZoom.NobleImageTools__PanZoom__GetTransform();
            const appState  = window.NobleImageTools__State;
            NobleImageTools__Renderer__DrawFrame(transform, appState);
            _dirty = false;
        }
        _rafId = requestAnimationFrame(NobleImageTools__Renderer__Loop);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Public API
// =============================================================================

    window.NobleImageTools__Canvas__Renderer = {

        // FUNCTION | Initialise renderer and start loop
        // ------------------------------------------------------------
        NobleImageTools__Renderer__Init : function (canvasEl) {
            _canvas = canvasEl;
            _ctx    = canvasEl.getContext('2d');
            NobleImageTools__Renderer__Loop();
        },
        // ------------------------------------------------------------


        // FUNCTION | Load an image URL into the renderer
        // ------------------------------------------------------------
        NobleImageTools__Renderer__LoadImage : function (src, onLoaded) {
            const img   = new Image();
            img.onload  = function () {
                _imageEl = img;
                NobleImageTools__Renderer__RequestRedraw();
                if (typeof onLoaded === 'function') onLoaded(img);
            };
            img.src     = src;
        },
        // ------------------------------------------------------------


        // FUNCTION | Update preview mask from flat boolean array
        // ------------------------------------------------------------
        NobleImageTools__Renderer__SetPreviewMask : function (maskData, imgW, imgH) {
            if (!maskData) { _previewMask = null; NobleImageTools__Renderer__RequestRedraw(); return; }
            _previewMask = NobleImageTools__Renderer__BuildMaskOffscreen(maskData, imgW, imgH, '#4f8cff');
            NobleImageTools__Renderer__RequestRedraw();
        },
        // ------------------------------------------------------------


        // FUNCTION | Commit preview mask as a permanent layer offscreen bitmap
        // ------------------------------------------------------------
        NobleImageTools__Renderer__AddLayerOffscreen : function (layer, imgW, imgH) {
            NobleImageTools__Renderer__RebuildLayerOffscreen(layer, imgW, imgH);
        },
        // ------------------------------------------------------------


        // FUNCTION | Remove a layer's offscreen bitmap
        // ------------------------------------------------------------
        NobleImageTools__Renderer__RemoveLayerOffscreen : function (layerId) {
            delete _offscreenMasks[layerId];
            NobleImageTools__Renderer__RequestRedraw();
        },
        // ------------------------------------------------------------


        // FUNCTION | Clear preview mask overlay
        // ------------------------------------------------------------
        NobleImageTools__Renderer__ClearPreview : function () {
            _previewMask = null;
            NobleImageTools__Renderer__RequestRedraw();
        },

        NobleImageTools__Renderer__RequestRedraw : NobleImageTools__Renderer__RequestRedraw,
        NobleImageTools__Renderer__GetImageEl    : function () { return _imageEl; }
    };

// endregion -------------------------------------------------------------------

}());
