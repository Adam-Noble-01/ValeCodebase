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
// - CaptureAndUpload is called by the Presentation Scenes editor (through
//   ScenePersistence, and by its batch Update All Thumbnails), the floor plan
//   and elevation Dev editors and Na__DrawView__ThumbnailBake__.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 11-Jun-2026); TrueVision3D took it on 21-Jun-2026
//                   for its Presentation Mode transplant, and each app has grown its own 1.1.0 since
// - Twin          : TrueVision3D 02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js 1.1.0
// - Source version: 1.1.0 (TrueVision3D v2.18.0, 07-Sep-2026; read at b2aa9151) - its
//                   CaptureAndUpload(sceneId, targetWidthPx) call shape
// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1 (the call shape only)
// - Parity        : diverged (DIV-1: a drawing's frame comes from the drawing composer preset)
// - Divergences   :
//   - A 2D drawing is captured through the frame renderer the drawing composer preset
//     registers (SetFrameRenderer, a ValeVision-only export); TrueVision draws the drawing
//     here, flat, with its profile-line, depth-fog and section-cut overlays.
//   - The 3D path draws the cross-section caps through Na__SectionClipping__GetOverlayRenderer,
//     where TrueVision calls its SectionCut engine.
//   - CaptureAndUpload writes through Na__AppUtils__R2AssetUpload (the worker's asset route,
//     then the Flask mirror), where TrueVision calls Na__CfApi__WriteThumbnailWebp, and it
//     also takes ValeVision's (sceneId, projectCode, showToast) shape. ok means R2 took the
//     picture (r2Success).
//   - Banner and console prefix read ValeVision3D.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.1.1 (TrueVision's call shape, v2.71.1)
// - CaptureAndUpload also takes TrueVision's (sceneId) and (sceneId,
//   targetWidthPx) shapes: with no project code passed it uses the active
//   scene set's, else the URL's, and a number is the thumbnail width.
//   Presentation Scenes > Update All Thumbnails calls it with the scene id
//   alone and had failed every scene.
// - ok now means R2 took the picture (r2Success): Na__AppUtils__R2AssetUpload
//   no longer throws on a failure, it says so, and a refused upload must
//   never hand its path to a scene record. The three-argument form is
//   otherwise unchanged.
//
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
    import { Na__AppUtils__AssetUpload } from '../03__AppUtils/Na__AppUtils__AssetUpload__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Project Code When a Caller Passes None (TrueVision's call shape)
    // ------------------------------------------------------------
    import { Na__PresentationMode__ProjectJson__GetActiveProjectCode } from './Na__PresentationMode__ProjectJson__SceneData.js';
    import { Na__AppUtils__GetProjectCodeFromUrl } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
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
    // Two call shapes, one path:
    //   CaptureAndUpload(sceneId, projectCode, showToast) - ValeVision's callers
    //   CaptureAndUpload(sceneId[, targetWidthPx])        - TrueVision's, so its
    //                                                       callers port unchanged
    // When the second argument is not a string the project code is the active
    // scene set's, else the URL's; a number is the thumbnail's width.
    // Returns { ok, relUrl, publicUrl } or { ok: false, error }. ok means R2
    // took the picture (r2Success), so a refused or failed upload never hands
    // a caller a path to write onto its scene record.
    // ------------------------------------------------------------
    async function Na__PresentationMode__Thumbnail__CaptureAndUpload(sceneId, second, showToast) {
        const projectCode = (typeof second === 'string')
            ? second                                                         // <-- ValeVision's shape: the caller's code, as before
            : (Na__PresentationMode__ProjectJson__GetActiveProjectCode() || Na__AppUtils__GetProjectCodeFromUrl());
        const targetWidthPx = (typeof second === 'number' && Number.isFinite(second) && second > 0) ? second : undefined;
        if (!sceneId || !projectCode) return { ok : false, error : 'missing scene id or project code' };

        const blob = await Na__PresentationMode__Thumbnail__RenderCurrentViewportToWebp(targetWidthPx);
        if (!blob) return { ok : false, error : 'render failed' };

        const relUrl = 'PresentationMode/Thumbnails/' + sceneId + '.webp';
        try {
            const result = await Na__AppUtils__AssetUpload(blob, projectCode, relUrl, showToast);
            if (!result || result.ok !== true) {
                return { ok : false, error : (result && result.error) || 'thumbnail upload failed' };   // <-- Never a path the server did not take
            }
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
