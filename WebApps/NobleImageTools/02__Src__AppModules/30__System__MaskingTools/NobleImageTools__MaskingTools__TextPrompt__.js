/* =============================================================================
   NOBLEIMAGETOOLS - MASKING TOOLS - TEXT PROMPT
   =============================================================================

   FILE       : NobleImageTools__MaskingTools__TextPrompt__.js
   NAMESPACE  : NobleImageTools
   MODULE     : MaskingTools - Text Prompt (Florence-2 + SAM2)
   PURPOSE    : Sends a natural-language text query to the Flask
                /api/sam2/text-predict endpoint. Florence-2 detects matching
                objects as bounding boxes; SAM2 turns each box into a precise
                mask. Each detected object becomes a named layer.
                Comma-separated queries are supported: "window, door, roof"

   ============================================================================= */

(function () {
    'use strict';

// =============================================================================
// REGION | API Call
// =============================================================================

    // HELPER FUNCTION | Call the text-predict endpoint
    // ------------------------------------------------------------
    async function NobleImageTools__TextPrompt__CallApi(imagePath, textQuery) {
        const config    = window.NobleImageTools__State.config;
        const base      = config.NobleImageTools__Server__BaseUrl;
        const url       = `${base}/api/sam2/text-predict`;

        const res       = await fetch(url, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({ image_path: imagePath, text_query: textQuery })
        });

        const json      = await res.json();
        if (!json.ok) throw new Error(json.error || 'Text predict failed');
        return json.data;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Prompt Execution
// =============================================================================

    // MODULE VARIABLES | Running guard to prevent concurrent requests
    // ------------------------------------------------------------
    let _isRunning = false;                                          // <-- True while a request is in flight
    // ---------------------------------------------------------------


    // FUNCTION | Run a text-guided segmentation query
    // ------------------------------------------------------------
    async function NobleImageTools__TextPrompt__RunQuery(textQuery) {
        if (_isRunning) return;                                      // <-- Prevent concurrent requests
        const state     = window.NobleImageTools__State;

        if (!state.image.path) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'Load an image before using text prompts.', 'warning'
            );
            return;
        }

        if (!textQuery || !textQuery.trim()) {
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'Enter a text description (e.g. "conservatory" or "window, door").', 'warning'
            );
            return;
        }

        const query     = textQuery.trim();

        _isRunning = true;
        NobleImageTools__TextPrompt__SetRunning(true);
        window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
            `Finding "${query}"…`, 'info', 8000
        );

        try {
            const data  = await NobleImageTools__TextPrompt__CallApi(state.image.path, query);

            if (!data.masks || data.masks.length === 0) {
                window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                    `No objects matching "${query}" found.`, 'warning'
                );
                return;
            }

            for (let i = 0; i < data.masks.length; i++) {
                const label = data.labels[i] || query;
                const name  = data.masks.length > 1
                    ? `${label} ${i + 1}`
                    : label;

                window.NobleImageTools__MaskingTools__LayerManager.NobleImageTools__LayerManager__AddLayer(
                    data.masks[i], name
                );
            }

            window.NobleImageTools__Canvas__Renderer.NobleImageTools__Renderer__ClearPreview();

            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                `Found ${data.count} object${data.count !== 1 ? 's' : ''} matching "${query}".`,
                'success'
            );

        } catch (err) {
            console.error('[TextPrompt]', err.message);
            const short = err.message.length > 120
                ? err.message.slice(0, 120) + '…'
                : err.message;
            window.NobleImageTools__AppCore__Toast.NobleImageTools__Toast__Show(
                'Text prompt error: ' + short, 'error', 7000
            );
        } finally {
            _isRunning = false;
            NobleImageTools__TextPrompt__SetRunning(false);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toggle loading state on the text input
    // ------------------------------------------------------------
    function NobleImageTools__TextPrompt__SetRunning(active) {
        const inputEl   = document.getElementById('Nit__TextPrompt__Input');
        const btnEl     = document.getElementById('Nit__TextPrompt__Btn');
        const spinner   = document.getElementById('Nit__TextPrompt__Spinner');

        if (inputEl) inputEl.disabled  = active;
        if (btnEl)   btnEl.disabled    = active;
        if (spinner) spinner.style.display = active ? 'inline-block' : 'none';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Initialisation
// =============================================================================

    // FUNCTION | Wire the text input DOM events
    // ------------------------------------------------------------
    function NobleImageTools__TextPrompt__Init() {
        const inputEl   = document.getElementById('Nit__TextPrompt__Input');
        const btnEl     = document.getElementById('Nit__TextPrompt__Btn');

        if (inputEl) {
            inputEl.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    NobleImageTools__TextPrompt__RunQuery(inputEl.value);
                }
            });
        }

        if (btnEl) {
            btnEl.addEventListener('click', function () {
                const inputEl = document.getElementById('Nit__TextPrompt__Input');
                if (inputEl) NobleImageTools__TextPrompt__RunQuery(inputEl.value);
            });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// =============================================================================
// REGION | Public API
// =============================================================================

    window.NobleImageTools__MaskingTools__TextPrompt = {
        NobleImageTools__TextPrompt__Init     : NobleImageTools__TextPrompt__Init,
        NobleImageTools__TextPrompt__RunQuery : NobleImageTools__TextPrompt__RunQuery
    };

// endregion -------------------------------------------------------------------

}());
