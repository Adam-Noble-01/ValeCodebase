// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - PREVIEW CONTROLLER
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__PreviewController__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Preview Controller
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Show one structural pass over the 3D viewport, on a canvas
//              overlay, without touching the live composer, camera, materials
//              or engine.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - Preview paints into a canvas overlay that sits exactly on top of the WebGL
//   canvas with pointer-events disabled. The underlying renderer and controls
//   stay completely alive; orbit still works, and dismissing the overlay is
//   instant because nothing was ever reconfigured.
// - The alternative - swapping the live composer into a debug mode - is what
//   this design exists to avoid. Under MaxEngine that would risk leaving
//   ambient occlusion or profile lines in a debug state after switching back,
//   which is precisely the kind of hidden state leak the acceptance tests
//   look for.
// - A preview is a SNAPSHOT. It is cleared automatically the moment the view
//   it describes stops being true: camera movement, a navigation mode change,
//   an engine switch, a presentation scene change, a model visibility change,
//   or the start of an export. A stale structural image sitting over a moved
//   camera would read as a live view and mislead.
// - Preview renders at viewport resolution capped to a configured long edge,
//   never at the selected export resolution. It is a look, not a deliverable.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Initial implementation for the Export Render Layers system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Overlay DOM
    // ------------------------------------------------------------
    const Na__ErlPreview__OVERLAY_ID    = 'naExportRenderLayersPreviewOverlay';
    const Na__ErlPreview__OVERLAY_CLASS = 'na-erl-preview-overlay';
    const Na__ErlPreview__VISIBLE_CLASS = 'na-erl-preview-overlay--visible';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Arming Delay
    // ------------------------------------------------------------
    // OrbitControls keeps dispatching 'change' for a few frames while its
    // damping decays. Without a short arming window a preview shown right
    // after the user let go of the viewport would clear itself instantly.
    // ------------------------------------------------------------
    const Na__ErlPreview__ARM_DELAY_MS = 250;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Events That Invalidate a Preview Snapshot
    // ------------------------------------------------------------
    const Na__ErlPreview__INVALIDATING_EVENTS = [
        'na-request-active-render',        // <-- Walk, fly, orbit key movement, scene transitions
        'na-render-engine-switch',         // <-- Pipeline is about to be rebuilt
        'na-render-engine-changed',
        'na-pm-scene-activated',           // <-- Presentation mode moved the camera
        'na-elevation-state-changed',      // <-- 2D elevation view took over the viewport
        'na-crosssection-config-loaded'
    ];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Preview Controller Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Create the Preview Controller
    // ------------------------------------------------------------
    // options:
    //   renderer  {THREE.WebGLRenderer}
    //   controls  {OrbitControls|null}  Emits 'change' while orbiting
    //   config    {object}              ExportRenderLayers__Config block
    //   onCleared {Function|null}       Called whenever a preview is dropped,
    //                                   so the panel can un-press its button
    //
    // Returns:
    //   {
    //     getCanvas(), isActive(), getActivePassId(),
    //     show(passId), clear(reason), resolvePreviewSize(), dispose()
    //   }
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__Preview__Create(options) {
        const { renderer, controls = null, config = {}, onCleared = null } = options;

        let overlayCanvas  = null;
        let activePassId   = null;
        let isDisposed     = false;
        let armedAt        = 0;


        // SUB FUNCTION | Build the Overlay Canvas Once
        // ---------------------------------------------------------------
        // Inserted immediately after the WebGL canvas so it inherits the
        // same stacking context; the stylesheet gives it the identical box.
        // ---------------------------------------------------------------
        function ensureOverlay() {
            if (overlayCanvas) return overlayCanvas;

            const existing = document.getElementById(Na__ErlPreview__OVERLAY_ID);
            if (existing) {
                overlayCanvas = existing;
                return overlayCanvas;
            }

            const liveCanvas = renderer.domElement;
            const container  = liveCanvas.parentElement || document.body;

            overlayCanvas    = document.createElement('canvas');
            overlayCanvas.id = Na__ErlPreview__OVERLAY_ID;
            overlayCanvas.className = Na__ErlPreview__OVERLAY_CLASS;
            overlayCanvas.setAttribute('aria-hidden', 'true');

            container.insertBefore(overlayCanvas, liveCanvas.nextSibling);
            return overlayCanvas;
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Drop the Preview and Notify the Panel
        // ---------------------------------------------------------------
        function clearPreview(reason) {
            if (!activePassId) return;

            activePassId = null;

            if (overlayCanvas) {
                overlayCanvas.classList.remove(Na__ErlPreview__VISIBLE_CLASS);
                const context = overlayCanvas.getContext('2d');
                if (context) context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            }

            if (typeof onCleared === 'function') onCleared(reason || 'cleared');
        }
        // ---------------------------------------------------------------


        // SUB FUNCTION | Handle Any Invalidating Signal
        // ---------------------------------------------------------------
        // Ignored inside the arming window; see ARM_DELAY_MS above.
        // ---------------------------------------------------------------
        function handleInvalidation() {
            if (!activePassId) return;
            if ((performance.now() - armedAt) < Na__ErlPreview__ARM_DELAY_MS) return;
            clearPreview('view changed');
        }
        // ---------------------------------------------------------------


        // WIRE INVALIDATION | Window events, orbit changes and direct input
        // ---------------------------------------------------------------
        Na__ErlPreview__INVALIDATING_EVENTS.forEach((eventName) => {
            window.addEventListener(eventName, handleInvalidation);
        });

        if (controls && typeof controls.addEventListener === 'function') {
            controls.addEventListener('change', handleInvalidation);      // <-- Orbit drag and zoom
        }

        renderer.domElement.addEventListener('pointerdown', handleInvalidation);
        renderer.domElement.addEventListener('wheel', handleInvalidation, { passive: true });
        // ---------------------------------------------------------------


        return {

            // FUNCTION | Get the Overlay Canvas, Creating It If Needed
            // ------------------------------------------------------------
            getCanvas() {
                return ensureOverlay();
            },
            // ------------------------------------------------------------


            // FUNCTION | Test Whether a Preview Is Currently Showing
            // ------------------------------------------------------------
            isActive() {
                return activePassId !== null;
            },
            // ------------------------------------------------------------


            // FUNCTION | Read the Pass ID Currently Previewing
            // ------------------------------------------------------------
            getActivePassId() {
                return activePassId;
            },
            // ------------------------------------------------------------


            // FUNCTION | Reveal the Overlay for One Pass
            // ------------------------------------------------------------
            // The caller has already painted the canvas; this only makes the
            // overlay visible and records which pass owns it. Exclusive by
            // construction, because there is one overlay and one pass ID.
            // ------------------------------------------------------------
            show(passId) {
                if (isDisposed) return;

                const canvas = ensureOverlay();
                canvas.classList.add(Na__ErlPreview__VISIBLE_CLASS);
                activePassId = passId;
                armedAt      = performance.now();                         // <-- Start the arming window
            },
            // ------------------------------------------------------------


            // FUNCTION | Hide and Clear the Overlay
            // ------------------------------------------------------------
            clear(reason) {
                clearPreview(reason);
            },
            // ------------------------------------------------------------


            // FUNCTION | Resolve the Preview Pixel Size for This Viewport
            // ------------------------------------------------------------
            // Preserves the live viewport aspect ratio and caps the long edge
            // so a 4K monitor does not turn a look into a full export render.
            // ------------------------------------------------------------
            resolvePreviewSize() {
                const liveCanvas = renderer.domElement;
                const cssWidth   = Math.max(1, liveCanvas.clientWidth  || liveCanvas.width);
                const cssHeight  = Math.max(1, liveCanvas.clientHeight || liveCanvas.height);

                const maxLongEdge = Number.isFinite(config.ExportRenderLayers__Config__PreviewMaxLongEdgePx)
                    ? config.ExportRenderLayers__Config__PreviewMaxLongEdgePx
                    : 1600;

                const longEdge = Math.max(cssWidth, cssHeight);
                const scale    = (longEdge > maxLongEdge) ? (maxLongEdge / longEdge) : 1;

                return {
                    width  : Math.max(1, Math.round(cssWidth  * scale)),
                    height : Math.max(1, Math.round(cssHeight * scale))
                };
            },
            // ------------------------------------------------------------


            // FUNCTION | Tear Down Listeners and Remove the Overlay
            // ------------------------------------------------------------
            dispose() {
                if (isDisposed) return;
                isDisposed = true;

                Na__ErlPreview__INVALIDATING_EVENTS.forEach((eventName) => {
                    window.removeEventListener(eventName, handleInvalidation);
                });

                if (controls && typeof controls.removeEventListener === 'function') {
                    controls.removeEventListener('change', handleInvalidation);
                }

                renderer.domElement.removeEventListener('pointerdown', handleInvalidation);
                renderer.domElement.removeEventListener('wheel', handleInvalidation);

                if (overlayCanvas && overlayCanvas.parentElement) {
                    overlayCanvas.parentElement.removeChild(overlayCanvas);
                }

                overlayCanvas = null;
                activePassId  = null;
            }
            // ------------------------------------------------------------
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Preview Controller API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__Preview__Create
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
