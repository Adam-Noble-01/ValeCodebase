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
// - Draws the selected picture's outline, scale corners and trim tabs through
//   Na__PageLayoutSystem__ImageHandles__ (the trim ghost under the guide, the
//   handles and their label over it).
// - All drawing respects the current canvasTransform (pan/zoom).
// - All appearance values are read from state.config
//   (PageLayout__CanvasAppearance__Config section) with hard-coded fallbacks.
// - DrawImageLayer draws the picture with its trims at any scale: the live
//   canvas, the PDF flatten and the saved layout's thumbnail all call it, so
//   the three can never disagree about a trim.
// - The composition guide is drawn over the picture, under its handles.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Nov-2026 - Version 1.2.0 (ValeVision3D v2.94.1)
// - The picture's handles move to Na__PageLayoutSystem__ImageHandles__: larger
//   navy scale discs at the corners, white trim tabs on the edges, both on the
//   visible (trimmed) picture, with a label under the pointer. The old eight
//   small squares and their config keys are gone.
//
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.75.0)
// - DrawImageLayer exported (the picture and its trims, one implementation for
//   screen, PDF and thumbnail); the composition guide drawn; a sheet with no
//   picture yet (opened on the saved list) draws as an empty sheet; the picture
//   is drawn with high-quality smoothing (a 6K picture shrunk to the screen).
//
// 11-Feb-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Composition Guide's Drawing, the Picture's Handles
    // ------------------------------------------------------------
    import { Na__PageLayout__Guide__Draw } from './Na__PageLayoutSystem__CompositionGuide__.js';
    import {
        Na__PageLayout__Handles__DrawGhost,
        Na__PageLayout__Handles__Draw
    } from './Na__PageLayoutSystem__ImageHandles__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants (Hard-Coded Fallback Defaults)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback Render Style Settings
    // ------------------------------------------------------------
    const Na__PageLayout__FALLBACK_PAPER_SHADOW_BLUR    = 12;                     // <-- Paper drop shadow blur radius
    const Na__PageLayout__FALLBACK_PAPER_SHADOW_COLOR   = 'rgba(0, 0, 0, 0.25)'; // <-- Paper drop shadow color
    const Na__PageLayout__FALLBACK_PAPER_SHADOW_OFFSET  = 4;                      // <-- Paper drop shadow Y offset
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
                                    : Na__PageLayout__FALLBACK_PAPER_SHADOW_OFFSET
        };                                                                  // <-- The handles and outline read their own keys (__ImageHandles__)
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


    // FUNCTION | Draw the Picture With Its Trims at a Scale (Screen, PDF, Thumbnail)
    // ------------------------------------------------------------
    // pxPerMm: the context's pixels per sheet mm (the live zoom, or an export's
    // dots). The context's origin is the sheet's top-left corner. The picture
    // stays at full size; the clip hides the trimmed edges.
    // ------------------------------------------------------------
    function Na__PageLayout__DrawImageLayer(ctx, state, pxPerMm) {
        const image = state ? state.viewportImage : null;
        const it    = state ? state.imageTransform : null;
        if (!image || !it || !(it.width > 0) || !(it.height > 0)) return;

        const imgX = it.x * pxPerMm; // <-- Image X in context pixels
        const imgY = it.y * pxPerMm; // <-- Image Y in context pixels
        const imgW = it.width * pxPerMm; // <-- Image width in context pixels
        const imgH = it.height * pxPerMm; // <-- Image height in context pixels

        // Calculate clipped region dimensions
        // ------------------------------------------------------------
        const clipT = (it.clipTop    || 0) * pxPerMm; // <-- Clip top in context pixels
        const clipR = (it.clipRight  || 0) * pxPerMm; // <-- Clip right in context pixels
        const clipB = (it.clipBottom || 0) * pxPerMm; // <-- Clip bottom in context pixels
        const clipL = (it.clipLeft   || 0) * pxPerMm; // <-- Clip left in context pixels

        const visibleX = imgX + clipL; // <-- Visible region X start
        const visibleY = imgY + clipT; // <-- Visible region Y start
        const visibleW = imgW - clipL - clipR; // <-- Visible region width
        const visibleH = imgH - clipT - clipB; // <-- Visible region height

        // Draw image with clipping mask applied (image stays at full size)
        // ------------------------------------------------------------
        if (visibleW > 0 && visibleH > 0) {
            ctx.save(); // <-- Save context state
            ctx.beginPath(); // <-- Start clipping path
            ctx.rect(visibleX, visibleY, visibleW, visibleH); // <-- Define visible region
            ctx.clip(); // <-- Apply clipping mask
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high'; // <-- A 6K picture shrunk to the screen or a thumbnail stays clean
            ctx.drawImage(image, imgX, imgY, imgW, imgH); // <-- Draw full image (clip hides trimmed edges)
            ctx.restore(); // <-- Restore context state (removes clip)
        }
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

        const { canvasTransform, a3, titleBlockImage, dpr } = state; // <-- Destructure state
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
        Na__PageLayout__DrawImageLayer(ctx, state, zoom); // <-- Same routine as the PDF and the thumbnail
        Na__PageLayout__Handles__DrawGhost(ctx, state, zoom);             // <-- A trim being dragged: what it cuts, faintly (screen only)

        // DRAW COMPOSITION GUIDE | Over the picture, under its handles (never printed)
        // ------------------------------------------------------------
        Na__PageLayout__Guide__Draw(ctx, state, zoom);

        // DRAW THE PICTURE'S OUTLINE, SCALE CORNERS AND TRIM TABS | When it is selected
        // ------------------------------------------------------------
        const bounds = {                                                    // <-- The canvas's visible area, from the sheet's top left
            left   : -offsetX,
            top    : -offsetY,
            right  : canvasWidth  / dpr - offsetX,
            bottom : canvasHeight / dpr - offsetY
        };
        Na__PageLayout__Handles__Draw(ctx, state, zoom, bounds);

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
        Na__PageLayout__DrawImageLayer
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
