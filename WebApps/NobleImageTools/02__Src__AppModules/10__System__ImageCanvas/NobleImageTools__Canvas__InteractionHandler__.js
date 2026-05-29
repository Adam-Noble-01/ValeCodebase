/* =============================================================================
   NOBLEIMAGETOOLS - CANVAS INTERACTION HANDLER
   =============================================================================

   FILE       : NobleImageTools__Canvas__InteractionHandler__.js
   NAMESPACE  : NobleImageTools
   MODULE     : Canvas - Interaction Handler
   PURPOSE    : Routes mouse events on the canvas to the correct system based
                on the active mode. In 'click' mode it delegates to the prompt
                controller. In 'box' mode it builds a drag bounding box. In
                'auto' and 'pan' modes it handles accordingly. Bridges
                PanZoom, PromptController, and the app state.

   ============================================================================= */

// @delegate: ./NobleImageTools__Canvas__PanZoom__.js
// @delegate: ../30__System__MaskingTools/NobleImageTools__MaskingTools__PromptController__.js

(function () {
    'use strict';

// =============================================================================
// REGION | Module State
// =============================================================================

    // MODULE VARIABLES | Drag-box tracking
    // ------------------------------------------------------------
    let _canvas         = null;                                      // <-- HTML canvas element reference
    let _isDraggingBox  = false;                                     // <-- True during box-mode drag
    let _boxDragStart   = null;                                      // <-- Image coords where box drag began
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Event Routing
// =============================================================================

    // HELPER FUNCTION | Get image coords from a mouse event
    // ------------------------------------------------------------
    function NobleImageTools__Interaction__EventToImage(e) {
        const rect  = _canvas.getBoundingClientRect();
        const sx    = e.clientX - rect.left;
        const sy    = e.clientY - rect.top;
        return window.NobleImageTools__Canvas__PanZoom.NobleImageTools__PanZoom__ScreenToImage(sx, sy);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update the live preview box in state and request redraw
    // ------------------------------------------------------------
    function NobleImageTools__Interaction__UpdateBoxInState(imgCoord) {
        const state = window.NobleImageTools__State;
        if (!_boxDragStart) return;

        const x1    = Math.min(_boxDragStart.x, imgCoord.x);
        const y1    = Math.min(_boxDragStart.y, imgCoord.y);
        const x2    = Math.max(_boxDragStart.x, imgCoord.x);
        const y2    = Math.max(_boxDragStart.y, imgCoord.y);

        state.tool.box = { x1, y1, x2, y2 };
        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle mousedown on the canvas (routes by mode)
    // ------------------------------------------------------------
    function NobleImageTools__Interaction__OnMouseDown(e) {
        if (window.NobleImageTools__Canvas__PanZoom.NobleImageTools__PanZoom__IsPanning()) return;
        if (e.button !== 0) return;                                  // <-- Only left-click handled here

        e.preventDefault();                                          // <-- Prevent text selection and native drag

        const state     = window.NobleImageTools__State;
        const mode      = state.mode;
        const imgCoord  = NobleImageTools__Interaction__EventToImage(e);

        if (mode === 'click') {
            const label = e.altKey ? 0 : 1;                         // <-- Alt+left=negative, left=positive
            window.NobleImageTools__MaskingTools__PromptController
                .NobleImageTools__Prompt__AddClickPoint(imgCoord.x, imgCoord.y, label);
        }

        if (mode === 'box') {
            _isDraggingBox      = true;
            _boxDragStart       = imgCoord;
            state.tool.box      = null;
            window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle contextmenu (right-click) for negative points
    // ------------------------------------------------------------
    function NobleImageTools__Interaction__OnContextMenu(e) {
        e.preventDefault();
        const state = window.NobleImageTools__State;
        if (state.mode !== 'click') return;

        const imgCoord = NobleImageTools__Interaction__EventToImage(e);
        window.NobleImageTools__MaskingTools__PromptController
            .NobleImageTools__Prompt__AddClickPoint(imgCoord.x, imgCoord.y, 0);
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle mousemove anywhere on the window (box drag + pan tracking)
    // ------------------------------------------------------------
    function NobleImageTools__Interaction__OnWindowMouseMove(e) {
        if (!_isDraggingBox) return;
        const imgCoord = NobleImageTools__Interaction__EventToImage(e);
        NobleImageTools__Interaction__UpdateBoxInState(imgCoord);
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle mousemove on the canvas (cursor position display only)
    // ------------------------------------------------------------
    function NobleImageTools__Interaction__OnCanvasMouseMove(e) {
        const state    = window.NobleImageTools__State;
        const imgCoord = NobleImageTools__Interaction__EventToImage(e);
        state.cursor   = imgCoord;
        window.NobleImageTools__AppCore__StatusBar.NobleImageTools__StatusBar__Update();
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle mouseup on the canvas
    // ------------------------------------------------------------
    function NobleImageTools__Interaction__OnMouseUp(e) {
        if (_isDraggingBox && e.button === 0) {
            _isDraggingBox  = false;
            const state     = window.NobleImageTools__State;

            if (state.tool.box) {
                const box = state.tool.box;
                const minW = 4 / (window.NobleImageTools__Canvas__PanZoom.NobleImageTools__PanZoom__GetTransform().scale);
                if (Math.abs(box.x2 - box.x1) > minW && Math.abs(box.y2 - box.y1) > minW) {
                    window.NobleImageTools__MaskingTools__PromptController
                        .NobleImageTools__Prompt__RunBoxPrediction(box);
                } else {
                    state.tool.box = null;
                    window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
                }
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Public API
// =============================================================================

    window.NobleImageTools__Canvas__InteractionHandler = {

        // FUNCTION | Attach all interaction listeners to the canvas
        // ------------------------------------------------------------
        NobleImageTools__Interaction__Init : function (canvasEl) {
            _canvas = canvasEl;

            canvasEl.addEventListener('mousedown',   NobleImageTools__Interaction__OnMouseDown);
            canvasEl.addEventListener('contextmenu', NobleImageTools__Interaction__OnContextMenu);
            canvasEl.addEventListener('mousemove',   NobleImageTools__Interaction__OnCanvasMouseMove);
            window.addEventListener('mousemove',     NobleImageTools__Interaction__OnWindowMouseMove);
            window.addEventListener('mouseup',       NobleImageTools__Interaction__OnMouseUp);

            canvasEl.addEventListener('selectstart', function (e) { e.preventDefault(); });
            canvasEl.addEventListener('dragstart',   function (e) { e.preventDefault(); });
        }
        // ------------------------------------------------------------

    };

// endregion -------------------------------------------------------------------

}());
