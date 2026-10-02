// =============================================================================
// VALEVISION3D - PRESENTATION MODE - THUMBNAIL RENDERER
// =============================================================================
//
// FILE       : Na__PresentationMode__Thumbnail__Renderer.js
// NAMESPACE  : Na__PresentationMode
// MODULE     : PresentationMode - Thumbnail Renderer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Capture the current rendered Three.js viewport as a lightweight
//              WebP thumbnail for a Presentation Mode saved scene
// CREATED    : 11-Jun-2026
//
// DESCRIPTION:
// - Renders one frame synchronously through the active composer pipeline
//   (same approach as Na__UiFeature__ImageExport__Controls.js) then copies
//   the WebGL framebuffer to a 2D canvas IMMEDIATELY — required because the
//   renderer does not use preserveDrawingBuffer, so the buffer is only valid
//   in the same task as the render call.
// - Downscales to a compact thumbnail (default 480px wide) using drawImage
//   to preserve aspect ratio.
// - Returns the result as a Promise<Blob> (image/webp) so the caller can POST
//   it to the Flask thumbnail endpoint or trigger a browser download.
// - Render context (renderer, scene, camera, pipeline getter) must be
//   registered via SetRenderContext before use.
//
// INTEGRATION:
// - Na__PresentationMode__DevMenu__SceneEditor calls
//   Na__PresentationMode__Thumbnail__RenderCurrentViewportToWebp().
// - SetRenderContext is called from index.html after the renderer exists.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.1.0 (port Phase 2)
// - SetFrameRenderer lets the drawing composer preset render a capture the
// - way the viewport shows it; the 3D path now draws the section overlay
// - into the captured frame; CaptureAndUpload writes a scene thumbnail to R2
// - through the asset route with a Flask mirror.
//
// 11-Jun-2026 - Version 1.0.0
// - Initial implementation for Presentation Mode system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Section Overlay and R2 Asset Upload (port Phase 2)
    // ------------------------------------------------------------
    import { Na__SectionClipping__GetOverlayRenderer } from '../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
    import { Na__AppUtils__R2AssetUpload } from '../03__AppUtils/Na__AppUtils__R2AssetUpload__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Default Thumbnail Dimensions
    // ------------------------------------------------------------
    const Na__PmThumb__DEFAULT_WIDTH   = 480;    // <-- Target thumbnail width in pixels
    const Na__PmThumb__WEBP_QUALITY    = 0.80;   // <-- WebP quality (0-1)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Render Context References
    // ------------------------------------------------------------
    let Na__PmThumb__Renderer         = null;  // <-- WebGLRenderer
    let Na__PmThumb__Scene            = null;  // <-- Three.js scene (direct render fallback)
    let Na__PmThumb__Camera           = null;  // <-- Active camera (direct render fallback)
    let Na__PmThumb__GetPipelineState = null;  // <-- () => pipeline state with composer + renderProfileNormals
    let Na__PmThumb__FrameRenderer    = null;  // <-- Optional drawing-frame renderer registered by the composer preset (port Phase 2)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render Context Registration
// -----------------------------------------------------------------------------

    // FUNCTION | Register the Render Context for Thumbnail Capture
    // ------------------------------------------------------------
    // Must be called once from index.html after the renderer is constructed.
    // getPipelineState: () => pipelineRef.current (composer surface or null)
    // ------------------------------------------------------------
    function Na__PresentationMode__Thumbnail__SetRenderContext(renderer, scene, camera, getPipelineState) {
        Na__PmThumb__Renderer         = renderer;          // <-- Store live renderer reference
        Na__PmThumb__Scene            = scene;             // <-- Store scene for direct render fallback
        Na__PmThumb__Camera           = camera;            // <-- Store camera for direct render fallback
        Na__PmThumb__GetPipelineState = getPipelineState;  // <-- Lazy pipeline getter (pipeline built after load)
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Thumbnail Capture
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Copy Renderer Canvas to Downscaled 2D Canvas and Return WebP Blob
    // ------------------------------------------------------------
    function Na__PmThumb__CaptureFromCanvas(sourceCanvas, targetWidthPx) {
        return new Promise((resolve, reject) => {
            if (!sourceCanvas) {
                reject(new Error('No source canvas for thumbnail capture'));
                return;
            }

            const srcW = sourceCanvas.width  || 1;
            const srcH = sourceCanvas.height || 1;

            const targetW = Math.round(targetWidthPx);
            const targetH = Math.round((srcH / srcW) * targetW);            // <-- Preserve aspect ratio

            const offscreen = document.createElement('canvas');
            offscreen.width  = targetW;
            offscreen.height = targetH;

            const ctx = offscreen.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not create 2D context for thumbnail'));
                return;
            }

            ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);            // <-- Downscale to target dimensions

            offscreen.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);                                        // <-- Return WebP blob
                    } else {
                        reject(new Error('toBlob returned null for thumbnail'));
                    }
                },
                'image/webp',
                Na__PmThumb__WEBP_QUALITY
            );
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Current Viewport to a WebP Blob (async)
    // ------------------------------------------------------------
    // Renders one frame SYNCHRONOUSLY through the composer pipeline (same
    // pattern as ImageExport) then copies the framebuffer to a 2D canvas in
    // the same task — required because preserveDrawingBuffer is off and the
    // WebGL buffer is cleared after compositing.
    // Returns Promise<Blob | null>.
    // ------------------------------------------------------------
    async function Na__PresentationMode__Thumbnail__RenderCurrentViewportToWebp(targetWidthPx) {
        if (!Na__PmThumb__Renderer) {
            console.warn('[ValeVision3D] Thumbnail renderer not registered — call SetRenderContext first.');
            return null;
        }

        const canvas = Na__PmThumb__Renderer.domElement;
        if (!canvas) {
            console.warn('[ValeVision3D] Renderer has no domElement for thumbnail capture.');
            return null;
        }

        const width = targetWidthPx || Na__PmThumb__DEFAULT_WIDTH;

        try {
            // SYNCHRONOUS RENDER | Composer pipeline preferred, direct render fallback
            const pipelineState = (typeof Na__PmThumb__GetPipelineState === 'function')
                ? Na__PmThumb__GetPipelineState()
                : null;

            if (typeof Na__PmThumb__FrameRenderer === 'function' && Na__PmThumb__FrameRenderer() === true) {
                // DRAWING FRAME | The composer preset renders the drawing exactly as the viewport shows it
            } else if (pipelineState && pipelineState.composer) {
                if (typeof pipelineState.renderProfileNormals === 'function') {
                    pipelineState.renderProfileNormals();                    // <-- Profile lines normals pre-pass
                }
                pipelineState.composer.render();                             // <-- Full post-processing pipeline
                const drawOverlay = Na__SectionClipping__GetOverlayRenderer();
                if (typeof drawOverlay === 'function') drawOverlay(Na__PmThumb__Camera); // <-- Cross-section caps into the same frame
            } else if (Na__PmThumb__Scene && Na__PmThumb__Camera) {
                Na__PmThumb__Renderer.render(Na__PmThumb__Scene, Na__PmThumb__Camera); // <-- Direct render fallback
            }

            // IMMEDIATE CAPTURE | Same task as render so the buffer is intact
            const blob = await Na__PmThumb__CaptureFromCanvas(canvas, width);
            return blob;                                                     // <-- Return blob to caller for upload or download
        } catch (error) {
            console.error('[ValeVision3D] Thumbnail capture error:', error);
            return null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing Frame Hook and R2 Upload (port Phase 2)
// -----------------------------------------------------------------------------

    // FUNCTION | Register (or Clear) a Frame Renderer That Replaces the Composer Path
    // ------------------------------------------------------------
    // The drawing composer preset registers its own frame renderer while a 2D
    // drawing owns the viewport, so a captured card shows the drawing as it is
    // on screen. fn() returns true when it rendered; null clears the hook.
    // ------------------------------------------------------------
    function Na__PresentationMode__Thumbnail__SetFrameRenderer(fn) {
        Na__PmThumb__FrameRenderer = (typeof fn === 'function') ? fn : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Capture the Viewport and Upload It as a Scene's Thumbnail (R2-First)
    // ------------------------------------------------------------
    // Returns { ok, relUrl, publicUrl } or { ok: false, error }.
    // ------------------------------------------------------------
    async function Na__PresentationMode__Thumbnail__CaptureAndUpload(sceneId, projectCode, showToast) {
        if (!sceneId || !projectCode) return { ok : false, error : 'missing scene id or project code' };

        const blob = await Na__PresentationMode__Thumbnail__RenderCurrentViewportToWebp();
        if (!blob) return { ok : false, error : 'render failed' };

        const relUrl = 'PresentationMode/Thumbnails/' + sceneId + '.webp';
        try {
            const result = await Na__AppUtils__R2AssetUpload(blob, projectCode, relUrl, showToast);
            return { ok : true, relUrl : relUrl, publicUrl : result.publicUrl || null };
        } catch (error) {
            console.error('[ValeVision3D] Thumbnail upload error:', error);
            return { ok : false, error : error.message };
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Thumbnail Renderer API
    // ------------------------------------------------------------
    export {
        Na__PresentationMode__Thumbnail__SetRenderContext,
        Na__PresentationMode__Thumbnail__RenderCurrentViewportToWebp,
        Na__PresentationMode__Thumbnail__SetFrameRenderer,
        Na__PresentationMode__Thumbnail__CaptureAndUpload
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
