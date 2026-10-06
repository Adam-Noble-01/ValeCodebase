// =============================================================================
// VALEVISION3D - EXPORT RENDER LAYERS - CANVAS INVERSION
// =============================================================================
//
// FILE       : Na__ExportRenderLayers__CanvasInvert__.js
// NAMESPACE  : Na__ExportRenderLayers
// MODULE     : Export Render Layers - Canvas Inversion
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Invert a composed output canvas in place, so a black-on-white
//              line drawing becomes the white-on-black edge map the Qwen
//              ControlNet families expect.
// CREATED    : 19-Aug-2026
//
// DESCRIPTION:
// - Canny Edges is produced by inverting the Line Art render rather than by
//   detecting edges in a raster. ValeVision already knows exactly where every
//   edge is, so inferring them back out of an image can only lose accuracy.
//   Inversion is the entire difference between the two passes: Line Art is
//   dark lines on white for the Line Art control families, Canny is white
//   lines on black for the Canny ones.
// - The inversion uses the 2D context's difference blend against white rather
//   than a getImageData round trip. At 6144x4096 a pixel-array round trip is
//   roughly 100MB of JavaScript heap and a full read-modify-write; the blend
//   is a single composited fillRect the browser runs on the GPU.
//
// WHY DIFFERENCE AGAINST WHITE:
// - The difference operator produces |backdrop - source| per channel. With a
//   pure white source that is 255 - backdrop, which is exactly an inversion,
//   and it leaves the alpha channel alone.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Aug-2026 - Version 1.0.0
// - Initial implementation so Canny Edges can be the inverted Line Art render.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Inversion
// -----------------------------------------------------------------------------

    // FUNCTION | Invert a Canvas in Place
    // ------------------------------------------------------------
    // canvas {HTMLCanvasElement}  Mutated directly; nothing is returned.
    //
    // The composite operation is restored afterwards so the canvas can still
    // be drawn into normally by anything downstream.
    // ------------------------------------------------------------
    function Na__ExportRenderLayers__InvertCanvas(canvas) {
        if (!canvas || !canvas.width || !canvas.height) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const savedOperation = context.globalCompositeOperation;
        const savedAlpha     = context.globalAlpha;

        try {
            context.globalCompositeOperation = 'difference';             // <-- |backdrop - source| per channel
            context.globalAlpha              = 1.0;
            context.fillStyle                = '#ffffff';                // <-- 255 - backdrop, alpha untouched
            context.fillRect(0, 0, canvas.width, canvas.height);
        } finally {
            context.globalCompositeOperation = savedOperation;
            context.globalAlpha              = savedAlpha;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Canvas Inversion API
    // ------------------------------------------------------------
    export {
        Na__ExportRenderLayers__InvertCanvas
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
