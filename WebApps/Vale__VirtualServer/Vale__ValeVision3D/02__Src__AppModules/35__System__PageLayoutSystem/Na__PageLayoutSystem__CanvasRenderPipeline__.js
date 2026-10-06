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
// - All appearance values are read from state.config
//   (PageLayout__CanvasAppearance__Config section) with hard-coded fallbacks.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants (Hard-Coded Fallback Defaults)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback Render Style Settings
    // ------------------------------------------------------------
    const Na__PageLayout__FALLBACK_PAPER_SHADOW_BLUR    = 12;                     // <-- Paper drop shadow blur radius
    const Na__PageLayout__FALLBACK_PAPER_SHADOW_COLOR   = 'rgba(0, 0, 0, 0.25)'; // <-- Paper drop shadow color
    const Na__PageLayout__FALLBACK_PAPER_SHADOW_OFFSET  = 4;                      // <-- Paper drop shadow Y offset
    const Na__PageLayout__FALLBACK_HANDLE_SIZE_PX       = 8;                      // <-- Selection handle size in screen pixels
    const Na__PageLayout__FALLBACK_HANDLE_FILL          = '#336699';              // <-- Selection handle fill color (Vale blue)
    const Na__PageLayout__FALLBACK_HANDLE_STROKE        = '#ffffff';              // <-- Selection handle stroke color
    const Na__PageLayout__FALLBACK_HANDLE_LINE_WIDTH    = 1.5;                    // <-- Selection handle stroke width
    const Na__PageLayout__FALLBACK_IMAGE_BORDER_COLOR   = 'rgba(51, 102, 153, 0.6)'; // <-- Image selection border color
    const Na__PageLayout__FALLBACK_IMAGE_BORDER_WIDTH   = 1;                      // <-- Image selection border width in mm
    const Na__PageLayout__FALLBACK_BG_COLOR             = '#b0b5ba';              // <-- Canvas background grey
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Canvas Appearance Config from State
    // ------------------------------------------------------------
    function Na__PageLayout__ResolveAppearanceConfig(state) {
        const section = (state && state.config) ? state.config['PageLayout__CanvasAppearance__Config'] : null;

        return {
            bgColor          : (section && typeof section['PageLayout__CanvasAppearance__Config__BackgroundColor'] === 'string')
                                    ? section['PageLayout__CanvasAppearance__Config__BackgroundColor']
                                    : Na__PageLayout__FALLBACK_BG_COLOR,
            paperShadowBlur  : (section && typeof section['PageLayout__CanvasAppearance__Config__PaperShadowBlur'] === 'number')
                                    ? section['PageLayout__CanvasAppearance__Config__PaperShadowBlur']
                                    : Na__PageLayout__FALLBACK_PAPER_SHADOW_BLUR,
            paperShadowColor : (section && typeof section['PageLayout__CanvasAppearance__Config__PaperShadowColor'] === 'string')
                                    ? section['PageLayout__CanvasAppearance__Config__PaperShadowColor']
                                    : Na__PageLayout__FALLBACK_PAPER_SHADOW_COLOR,
            paperShadowOffset: (section && typeof section['PageLayout__CanvasAppearance__Config__PaperShadowOffset'] === 'number')
                                    ? section['PageLayout__CanvasAppearance__Config__PaperShadowOffset']
                                    : Na__PageLayout__FALLBACK_PAPER_SHADOW_OFFSET,
            handleSizePx     : (section && typeof section['PageLayout__CanvasAppearance__Config__HandleSizePx'] === 'number')
                                    ? section['PageLayout__CanvasAppearance__Config__HandleSizePx']
                                    : Na__PageLayout__FALLBACK_HANDLE_SIZE_PX,
            handleFill       : (section && typeof section['PageLayout__CanvasAppearance__Config__HandleFillColor'] === 'string')
                                    ? section['PageLayout__CanvasAppearance__Config__HandleFillColor']
                                    : Na__PageLayout__FALLBACK_HANDLE_FILL,
            handleStroke     : (section && typeof section['PageLayout__CanvasAppearance__Config__HandleStrokeColor'] === 'string')
                                    ? section['PageLayout__CanvasAppearance__Config__HandleStrokeColor']
                                    : Na__PageLayout__FALLBACK_HANDLE_STROKE,
            handleLineWidth  : (section && typeof section['PageLayout__CanvasAppearance__Config__HandleLineWidth'] === 'number')
                                    ? section['PageLayout__CanvasAppearance__Config__HandleLineWidth']
                                    : Na__PageLayout__FALLBACK_HANDLE_LINE_WIDTH,
            imageBorderColor : (section && typeof section['PageLayout__CanvasAppearance__Config__ImageBorderColor'] === 'string')
                                    ? section['PageLayout__CanvasAppearance__Config__ImageBorderColor']
                                    : Na__PageLayout__FALLBACK_IMAGE_BORDER_COLOR,
            imageBorderWidth : (section && typeof section['PageLayout__CanvasAppearance__Config__ImageBorderWidth'] === 'number')
                                    ? section['PageLayout__CanvasAppearance__Config__ImageBorderWidth']
                                    : Na__PageLayout__FALLBACK_IMAGE_BORDER_WIDTH
        };
    }
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


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Selection Handle Rendering System
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Draw Single Selection Handle at Position
    // ------------------------------------------------------------
    function Na__PageLayout__DrawHandle(ctx, x, y, halfSize, appearance) {
        ctx.fillStyle   = appearance.handleFill; // <-- Handle fill from config
        ctx.strokeStyle = appearance.handleStroke; // <-- Handle stroke from config
        ctx.lineWidth   = appearance.handleLineWidth; // <-- Handle stroke width from config
        ctx.fillRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2); // <-- Draw filled square
        ctx.strokeRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2); // <-- Draw stroke
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw All 8 Selection Handles Around Image
    // ------------------------------------------------------------
    function Na__PageLayout__DrawSelectionHandles(ctx, imgX, imgY, imgW, imgH, appearance) {
        const hs = appearance.handleSizePx / 2; // <-- Half handle size in CSS pixels

        // Corner handles (for proportional scaling)
        // ------------------------------------------------------------
        Na__PageLayout__DrawHandle(ctx, imgX, imgY, hs, appearance); // <-- Top-left
        Na__PageLayout__DrawHandle(ctx, imgX + imgW, imgY, hs, appearance); // <-- Top-right
        Na__PageLayout__DrawHandle(ctx, imgX, imgY + imgH, hs, appearance); // <-- Bottom-left
        Na__PageLayout__DrawHandle(ctx, imgX + imgW, imgY + imgH, hs, appearance); // <-- Bottom-right

        // Edge midpoint handles (for image clipping/trimming)
        // ------------------------------------------------------------
        Na__PageLayout__DrawHandle(ctx, imgX + imgW / 2, imgY, hs, appearance); // <-- Top-center
        Na__PageLayout__DrawHandle(ctx, imgX + imgW / 2, imgY + imgH, hs, appearance); // <-- Bottom-center
        Na__PageLayout__DrawHandle(ctx, imgX, imgY + imgH / 2, hs, appearance); // <-- Left-center
        Na__PageLayout__DrawHandle(ctx, imgX + imgW, imgY + imgH / 2, hs, appearance); // <-- Right-center
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw Selection Border Around Image
    // ------------------------------------------------------------
    function Na__PageLayout__DrawSelectionBorder(ctx, imgX, imgY, imgW, imgH, appearance) {
        ctx.strokeStyle = appearance.imageBorderColor; // <-- Border color from config
        ctx.lineWidth   = appearance.imageBorderWidth; // <-- Border width from config
        ctx.setLineDash([4, 4]); // <-- Dashed border pattern
        ctx.strokeRect(imgX, imgY, imgW, imgH); // <-- Draw dashed border
        ctx.setLineDash([]); // <-- Reset dash pattern
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
        const appearance = Na__PageLayout__ResolveAppearanceConfig(state); // <-- Resolve appearance from config

        // Clear canvas background
        // ------------------------------------------------------------
        ctx.clearRect(0, 0, canvasWidth, canvasHeight); // <-- Clear entire canvas
        ctx.fillStyle = appearance.bgColor; // <-- Background color from config
        ctx.fillRect(0, 0, canvasWidth, canvasHeight); // <-- Fill background

        // Apply canvas transform (pan + zoom, accounting for DPR)
        // ------------------------------------------------------------
        ctx.save(); // <-- Save context state
        ctx.scale(dpr, dpr); // <-- Scale for device pixel ratio
        ctx.translate(offsetX, offsetY); // <-- Apply pan offset (in CSS pixels)

        // DRAW PAPER | White rectangle with drop shadow
        // ------------------------------------------------------------
        const paperWidth  = a3.widthMm * zoom; // <-- Page width in CSS pixels at current zoom
        const paperHeight = a3.heightMm * zoom; // <-- Page height in CSS pixels at current zoom

        ctx.shadowColor   = appearance.paperShadowColor; // <-- Shadow color from config
        ctx.shadowBlur    = appearance.paperShadowBlur; // <-- Shadow blur from config
        ctx.shadowOffsetX = 0; // <-- No horizontal offset
        ctx.shadowOffsetY = appearance.paperShadowOffset; // <-- Shadow Y offset from config
        ctx.fillStyle     = '#ffffff'; // <-- White paper fill
        ctx.fillRect(0, 0, paperWidth, paperHeight); // <-- Draw paper rectangle

        // Reset shadow for subsequent draws
        // ------------------------------------------------------------
        ctx.shadowColor   = 'transparent'; // <-- Clear shadow
        ctx.shadowBlur    = 0; // <-- Clear shadow
        ctx.shadowOffsetX = 0; // <-- Clear shadow
        ctx.shadowOffsetY = 0; // <-- Clear shadow

        // DRAW TITLE BLOCK | Locked background layer at full page size
        // ------------------------------------------------------------
        if (titleBlockImage) {
            ctx.drawImage(titleBlockImage, 0, 0, paperWidth, paperHeight); // <-- Draw title block stretched to page
        }

        // DRAW VIEWPORT IMAGE | User-positionable foreground layer with clipping
        // ------------------------------------------------------------
        if (viewportImage) {
            const imgX = imageTransform.x * zoom; // <-- Image X in CSS pixels
            const imgY = imageTransform.y * zoom; // <-- Image Y in CSS pixels
            const imgW = imageTransform.width * zoom; // <-- Image width in CSS pixels
            const imgH = imageTransform.height * zoom; // <-- Image height in CSS pixels

            // Extract clipping values in mm
            // ------------------------------------------------------------
            const clipT = imageTransform.clipTop || 0; // <-- Clip from top in mm
            const clipR = imageTransform.clipRight || 0; // <-- Clip from right in mm
            const clipB = imageTransform.clipBottom || 0; // <-- Clip from bottom in mm
            const clipL = imageTransform.clipLeft || 0; // <-- Clip from left in mm

            // Calculate clipped region dimensions
            // ------------------------------------------------------------
            const clipTpx = clipT * zoom; // <-- Clip top in CSS pixels
            const clipRpx = clipR * zoom; // <-- Clip right in CSS pixels
            const clipBpx = clipB * zoom; // <-- Clip bottom in CSS pixels
            const clipLpx = clipL * zoom; // <-- Clip left in CSS pixels

            const visibleX = imgX + clipLpx; // <-- Visible region X start
            const visibleY = imgY + clipTpx; // <-- Visible region Y start
            const visibleW = imgW - clipLpx - clipRpx; // <-- Visible region width
            const visibleH = imgH - clipTpx - clipBpx; // <-- Visible region height

            // Draw image with clipping mask applied (image stays at full size)
            // ------------------------------------------------------------
            if (visibleW > 0 && visibleH > 0) {
                ctx.save(); // <-- Save context state
                ctx.beginPath(); // <-- Start clipping path
                ctx.rect(visibleX, visibleY, visibleW, visibleH); // <-- Define visible region
                ctx.clip(); // <-- Apply clipping mask

                ctx.drawImage(viewportImage, imgX, imgY, imgW, imgH); // <-- Draw full image (clip hides trimmed edges)

                ctx.restore(); // <-- Restore context state (removes clip)
            }

            // DRAW SELECTION BORDER AND HANDLES | When image is selected
            // ------------------------------------------------------------
            if (isImageSelected) {
                Na__PageLayout__DrawSelectionBorder(ctx, imgX, imgY, imgW, imgH, appearance); // <-- Draw border
                Na__PageLayout__DrawSelectionHandles(ctx, imgX, imgY, imgW, imgH, appearance); // <-- Draw all 8 handles
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
        Na__PageLayout__RenderFrame
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
