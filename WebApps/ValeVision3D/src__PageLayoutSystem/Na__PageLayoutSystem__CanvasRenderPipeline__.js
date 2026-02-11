// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - CANVAS RENDER PIPELINE
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__CanvasRenderPipeline__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Canvas Render Pipeline
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : 2D Canvas rendering of A3 document, title block, and viewport image
// CREATED    : 11-Feb-2026
//
// DESCRIPTION:
// - Renders the full A3 page layout on an HTML Canvas 2D context.
// - Draws the A3 paper rectangle with subtle shadow on grey background.
// - Draws the title block PNG as a locked background layer at full A3 size.
// - Draws the viewport image at its current position and size (user-adjustable).
// - Draws selection handles around the viewport image when selected.
// - All drawing respects the current canvasTransform (pan/zoom).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Render Style Settings
    // ------------------------------------------------------------
    const Na__PageLayout__PAPER_SHADOW_BLUR    = 12;                     // <-- Paper drop shadow blur radius
    const Na__PageLayout__PAPER_SHADOW_COLOR   = 'rgba(0, 0, 0, 0.25)'; // <-- Paper drop shadow color
    const Na__PageLayout__PAPER_SHADOW_OFFSET  = 4;                      // <-- Paper drop shadow Y offset
    const Na__PageLayout__HANDLE_SIZE_PX       = 8;                      // <-- Selection handle size in screen pixels
    const Na__PageLayout__HANDLE_FILL          = '#336699';              // <-- Selection handle fill color (Vale blue)
    const Na__PageLayout__HANDLE_STROKE        = '#ffffff';              // <-- Selection handle stroke color
    const Na__PageLayout__HANDLE_LINE_WIDTH    = 1.5;                    // <-- Selection handle stroke width
    const Na__PageLayout__IMAGE_BORDER_COLOR   = 'rgba(51, 102, 153, 0.6)'; // <-- Image selection border color
    const Na__PageLayout__IMAGE_BORDER_WIDTH   = 1;                      // <-- Image selection border width in mm
    const Na__PageLayout__BG_COLOR             = '#b0b5ba';              // <-- Canvas background grey
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert mm to Canvas Pixels
    // ------------------------------------------------------------
    function Na__PageLayout__MmToPx(mm, zoom, dpr) {
        return mm * zoom * dpr; // <-- mm * pixels-per-mm * device-pixel-ratio
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Draw Selection Handle at Position
    // ------------------------------------------------------------
    function Na__PageLayout__DrawHandle(ctx, x, y, halfSize) {
        ctx.fillStyle   = Na__PageLayout__HANDLE_FILL; // <-- Handle fill
        ctx.strokeStyle = Na__PageLayout__HANDLE_STROKE; // <-- Handle stroke
        ctx.lineWidth   = Na__PageLayout__HANDLE_LINE_WIDTH; // <-- Handle stroke width
        ctx.fillRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2); // <-- Draw filled square
        ctx.strokeRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2); // <-- Draw stroke
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Render Function
// -----------------------------------------------------------------------------

    // FUNCTION | Render Full Layout Frame
    // ------------------------------------------------------------
    function Na__PageLayout__RenderFrame(ctx, canvasWidth, canvasHeight, state) {
        if (!ctx || !state) return; // <-- Guard against missing context or state

        const { canvasTransform, a3, titleBlockImage, viewportImage, imageTransform, isImageSelected, dpr } = state; // <-- Destructure state
        const { offsetX, offsetY, zoom } = canvasTransform; // <-- Destructure transform

        // Clear canvas background
        // ------------------------------------------------------------
        ctx.clearRect(0, 0, canvasWidth, canvasHeight); // <-- Clear entire canvas
        ctx.fillStyle = Na__PageLayout__BG_COLOR; // <-- Set background color
        ctx.fillRect(0, 0, canvasWidth, canvasHeight); // <-- Fill background

        // Apply canvas transform (pan + zoom, accounting for DPR)
        // ------------------------------------------------------------
        ctx.save(); // <-- Save context state
        ctx.scale(dpr, dpr); // <-- Scale for device pixel ratio
        ctx.translate(offsetX, offsetY); // <-- Apply pan offset (in CSS pixels)

        // DRAW A3 PAPER | White rectangle with drop shadow
        // ------------------------------------------------------------
        const paperWidth  = a3.widthMm * zoom; // <-- A3 width in CSS pixels at current zoom
        const paperHeight = a3.heightMm * zoom; // <-- A3 height in CSS pixels at current zoom

        ctx.shadowColor   = Na__PageLayout__PAPER_SHADOW_COLOR; // <-- Set shadow color
        ctx.shadowBlur    = Na__PageLayout__PAPER_SHADOW_BLUR; // <-- Set shadow blur
        ctx.shadowOffsetX = 0; // <-- No horizontal offset
        ctx.shadowOffsetY = Na__PageLayout__PAPER_SHADOW_OFFSET; // <-- Slight vertical offset
        ctx.fillStyle     = '#ffffff'; // <-- White paper fill
        ctx.fillRect(0, 0, paperWidth, paperHeight); // <-- Draw paper rectangle

        // Reset shadow for subsequent draws
        // ------------------------------------------------------------
        ctx.shadowColor   = 'transparent'; // <-- Clear shadow
        ctx.shadowBlur    = 0; // <-- Clear shadow
        ctx.shadowOffsetX = 0; // <-- Clear shadow
        ctx.shadowOffsetY = 0; // <-- Clear shadow

        // DRAW TITLE BLOCK | Locked background layer at full A3 size
        // ------------------------------------------------------------
        if (titleBlockImage) {
            ctx.drawImage(titleBlockImage, 0, 0, paperWidth, paperHeight); // <-- Draw title block stretched to A3
        }

        // DRAW VIEWPORT IMAGE | User-positionable foreground layer
        // ------------------------------------------------------------
        if (viewportImage) {
            const imgX = imageTransform.x * zoom; // <-- Image X in CSS pixels
            const imgY = imageTransform.y * zoom; // <-- Image Y in CSS pixels
            const imgW = imageTransform.width * zoom; // <-- Image width in CSS pixels
            const imgH = imageTransform.height * zoom; // <-- Image height in CSS pixels

            ctx.drawImage(viewportImage, imgX, imgY, imgW, imgH); // <-- Draw viewport image

            // DRAW SELECTION BORDER AND HANDLES | When image is selected
            // ------------------------------------------------------------
            if (isImageSelected) {
                // Draw border around image
                // ------------------------------------------------------------
                ctx.strokeStyle = Na__PageLayout__IMAGE_BORDER_COLOR; // <-- Border color
                ctx.lineWidth   = Na__PageLayout__IMAGE_BORDER_WIDTH; // <-- Border width
                ctx.setLineDash([4, 4]); // <-- Dashed border pattern
                ctx.strokeRect(imgX, imgY, imgW, imgH); // <-- Draw dashed border
                ctx.setLineDash([]); // <-- Reset dash pattern

                // Draw 8 selection handles
                // ------------------------------------------------------------
                const hs = Na__PageLayout__HANDLE_SIZE_PX / 2; // <-- Half handle size in CSS pixels

                // Corner handles
                Na__PageLayout__DrawHandle(ctx, imgX, imgY, hs); // <-- Top-left
                Na__PageLayout__DrawHandle(ctx, imgX + imgW, imgY, hs); // <-- Top-right
                Na__PageLayout__DrawHandle(ctx, imgX, imgY + imgH, hs); // <-- Bottom-left
                Na__PageLayout__DrawHandle(ctx, imgX + imgW, imgY + imgH, hs); // <-- Bottom-right

                // Edge midpoint handles
                Na__PageLayout__DrawHandle(ctx, imgX + imgW / 2, imgY, hs); // <-- Top-center
                Na__PageLayout__DrawHandle(ctx, imgX + imgW / 2, imgY + imgH, hs); // <-- Bottom-center
                Na__PageLayout__DrawHandle(ctx, imgX, imgY + imgH / 2, hs); // <-- Left-center
                Na__PageLayout__DrawHandle(ctx, imgX + imgW, imgY + imgH / 2, hs); // <-- Right-center
            }
        }

        ctx.restore(); // <-- Restore context state
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Canvas Render Pipeline API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__RenderFrame,
        Na__PageLayout__HANDLE_SIZE_PX
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
