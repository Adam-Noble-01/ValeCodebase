/* =============================================================================
   NOBLEIMAGETOOLS - MASKING TOOLS - PROMPT CONTROLLER
   =============================================================================

   FILE       : NobleImageTools__MaskingTools__PromptController__.js
   NAMESPACE  : NobleImageTools
   MODULE     : MaskingTools - Prompt Controller
   PURPOSE    : Manages the active prompt state (click points and bounding box)
                and sends requests to the Flask SAM2 inference API. Handles
                the preview mask flow (show before commit) and commit/accept
                flow (store as a permanent layer).

   ============================================================================= */

// @delegate: ../30__System__MaskingTools/NobleImageTools__MaskingTools__LayerManager__.js
// @delegate: ../10__System__ImageCanvas/NobleImageTools__Canvas__Renderer__.js

(function () {
    'use strict';

// =============================================================================
// REGION | API Helpers
// =============================================================================

    // HELPER FUNCTION | Call the SAM2 predict endpoint
    // ------------------------------------------------------------
    async function NobleImageTools__Prompt__CallPredictApi(payload) {
        const config    = window.NobleImageTools__State.config;
        const base      = config.NobleImageTools__Server__BaseUrl;
        const url       = `${base}/api/sam2/predict`;

        const res       = await fetch(url, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify(payload)
        });

        const json      = await res.json();
        if (!json.ok) throw new Error(json.error || 'Prediction failed');
        return json.data;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Call the SAM2 auto-segment everything endpoint
    // ------------------------------------------------------------
    async function NobleImageTools__Prompt__CallAutoApi(imagePath) {
        const config    = window.NobleImageTools__State.config;
        const base      = config.NobleImageTools__Server__BaseUrl;
        const url       = `${base}/api/sam2/auto`;

        const res       = await fetch(url, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({ image_path: imagePath })
        });

        const json      = await res.json();
        if (!json.ok) throw new Error(json.error || 'Auto-segment failed');
        return json.data;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Prompt State Helpers
// =============================================================================

    // HELPER FUNCTION | Build the API payload from current prompt state
    // ------------------------------------------------------------
    function NobleImageTools__Prompt__BuildPayload() {
        const state     = window.NobleImageTools__State;
        const tool      = state.tool;

        const points    = [];
        const labels    = [];

        for (const pt of (tool.positivePoints || [])) {
            points.push([pt.x, pt.y]);
            labels.push(1);
        }
        for (const pt of (tool.negativePoints || [])) {
            points.push([pt.x, pt.y]);
            labels.push(0);
        }

        return {
            image_path   : state.image.path,
            points       : points.length ? points : null,
            point_labels : labels.length ? labels : null,
            box          : tool.box ? [tool.box.x1, tool.box.y1, tool.box.x2, tool.box.y2] : null
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clear the current prompt state
    // ------------------------------------------------------------
    function NobleImageTools__Prompt__ClearPrompt() {
        const state             = window.NobleImageTools__State;
        state.tool.positivePoints   = [];
        state.tool.negativePoints   = [];
        state.tool.box              = null;
        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__ClearPreview();
        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Set the inferring spinner state
    // ------------------------------------------------------------
    function NobleImageTools__Prompt__SetInferring(active) {
        window.NobleImageTools__State.inferring = active;

        const btns = document.querySelectorAll('[data-nit-infer-disable]');
        for (const btn of btns) {
            btn.disabled = active;
        }

        const statusEl = document.getElementById('Nit__Header__InferStatus');
        if (statusEl) {
            statusEl.style.display = active ? 'flex' : 'none';
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Inference Flows
// =============================================================================

    // FUNCTION | Run a prediction from the current prompt state and show preview
    // ------------------------------------------------------------
    async function NobleImageTools__Prompt__RunPrediction() {
        const state = window.NobleImageTools__State;

        if (!state.image.path) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Load an image first.', 'warning');
            return;
        }

        const payload   = NobleImageTools__Prompt__BuildPayload();
        if (!payload.points && !payload.box) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Add a click point or drag a box first.', 'warning');
            return;
        }

        try {
            NobleImageTools__Prompt__SetInferring(true);
            const data  = await NobleImageTools__Prompt__CallPredictApi(payload);

            window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__SetPreviewMask(
                data.mask, state.image.width, state.image.height
            );

            state.pendingMask = data.mask;

            const acceptBtn = document.getElementById('Nit__Toolbar__AcceptMask');
            if (acceptBtn) acceptBtn.disabled = false;

        } catch (err) {
            console.error('[SAM2 Predict]', err.message);
            const short = err.message.length > 120
                ? err.message.slice(0, 120) + '…'
                : err.message;
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'SAM2: ' + short, 'error', 6000
            );
        } finally {
            NobleImageTools__Prompt__SetInferring(false);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Add a click point and automatically run prediction
    // ------------------------------------------------------------
    async function NobleImageTools__Prompt__AddClickPoint(imgX, imgY, label) {
        const state     = window.NobleImageTools__State;

        if (label === 1) {
            state.tool.positivePoints.push({ x: imgX, y: imgY });
        } else {
            state.tool.negativePoints.push({ x: imgX, y: imgY });
        }

        window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__RequestRedraw();
        await NobleImageTools__Prompt__RunPrediction();
    }
    // ------------------------------------------------------------


    // FUNCTION | Run prediction with a box prompt
    // ------------------------------------------------------------
    async function NobleImageTools__Prompt__RunBoxPrediction(box) {
        const state     = window.NobleImageTools__State;
        state.tool.box  = box;
        await NobleImageTools__Prompt__RunPrediction();
    }
    // ------------------------------------------------------------


    // FUNCTION | Accept the preview mask and commit it as a layer
    // ------------------------------------------------------------
    function NobleImageTools__Prompt__AcceptMask() {
        const state     = window.NobleImageTools__State;

        if (!state.pendingMask) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('No pending mask to accept.', 'warning');
            return;
        }

        window.NobleImageTools__MaskingTools__LayerManager.NobleImageTools__LayerManager__AddLayer(
            state.pendingMask
        );

        state.pendingMask   = null;
        NobleImageTools__Prompt__ClearPrompt();

        const acceptBtn = document.getElementById('Nit__Toolbar__AcceptMask');
        if (acceptBtn) acceptBtn.disabled = true;

        window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Mask added to layers.', 'success');
    }
    // ------------------------------------------------------------


    // FUNCTION | Auto-segment all objects in the image
    // ------------------------------------------------------------
    async function NobleImageTools__Prompt__RunAutoSegment() {
        const state = window.NobleImageTools__State;

        if (!state.image.path) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Load an image first.', 'warning');
            return;
        }

        try {
            NobleImageTools__Prompt__SetInferring(true);
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show('Running auto-segment (this may take a moment)...', 'info');

            const data = await NobleImageTools__Prompt__CallAutoApi(state.image.path);

            window.NobleImageTools__MaskingTools__LayerManager.NobleImageTools__LayerManager__ClearAll();

            for (let i = 0; i < data.masks.length; i++) {
                window.NobleImageTools__MaskingTools__LayerManager.NobleImageTools__LayerManager__AddLayer(
                    data.masks[i],
                    'Object ' + (i + 1)
                );
            }

            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                `Auto-segment found ${data.masks.length} objects.`, 'success'
            );

        } catch (err) {
            console.error('[SAM2 Auto]', err.message);
            const short = err.message.length > 120
                ? err.message.slice(0, 120) + '…'
                : err.message;
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'SAM2 auto: ' + short, 'error', 6000
            );
        } finally {
            NobleImageTools__Prompt__SetInferring(false);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Public API
// =============================================================================

    window.NobleImageTools__MaskingTools__PromptController = {
        NobleImageTools__Prompt__AddClickPoint      : NobleImageTools__Prompt__AddClickPoint,
        NobleImageTools__Prompt__RunBoxPrediction   : NobleImageTools__Prompt__RunBoxPrediction,
        NobleImageTools__Prompt__AcceptMask         : NobleImageTools__Prompt__AcceptMask,
        NobleImageTools__Prompt__RunAutoSegment     : NobleImageTools__Prompt__RunAutoSegment,
        NobleImageTools__Prompt__ClearPrompt        : NobleImageTools__Prompt__ClearPrompt
    };

// endregion -------------------------------------------------------------------

}());
