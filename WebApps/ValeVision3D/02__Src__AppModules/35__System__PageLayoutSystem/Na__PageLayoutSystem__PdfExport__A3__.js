// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - PDF EXPORT (A3)
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__PdfExport__A3__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : PDF Export A3
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Export the A3 layout as PDF using jsPDF (version-locked UMD build)
// CREATED    : 11-Feb-2026
//
// DESCRIPTION:
// - "Export Full Layout": A3 landscape PDF with title block + viewport image.
// - "Export Image Only": A3 landscape PDF with viewport image only (no title block).
// - Both exports flatten the entire composed A3 sheet into one PNG at 600 dpi,
//   then embed that single image into the PDF as a lossless, full-page bitmap.
// - Flattening mirrors the live canvas render exactly, including viewport clipping.
// - jsPDF is loaded as a UMD global via <script> tag in the layout HTML.
// - Accessed via window.jspdf.jsPDF (standard jsPDF UMD pattern).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Feb-2026 - Version 1.0.0
// - Initial implementation with full layout and image-only export modes.
// - Uses jsPDF v4.1.0 UMD build (version-locked, CDN independent).
//
// 11-Mar-2026 - Version 2.0.0
// - Replaced multi-image PDF composition with single flattened PNG pipeline.
// - Both export modes render full A3 sheet to 600 dpi offscreen canvas first.
// - Clipping values (clipTop/Right/Bottom/Left) now baked into the flattened PNG.
// - jsPDF document created with compress:true and floatPrecision:'smart'.
// - Added Na__PageLayout__PDF_EXPORT_DPI and Na__PageLayout__PIXELS_PER_MM constants.
// - Added Na__PageLayout__FlattenSheetToDataUrl helper.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | PDF Document Settings
    // ------------------------------------------------------------
    const Na__PageLayout__PDF_ORIENTATION = 'landscape'; // <-- A3 landscape orientation
    const Na__PageLayout__PDF_UNIT        = 'mm';        // <-- Millimeter units
    const Na__PageLayout__PDF_FORMAT      = 'a3';        // <-- A3 paper format
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Flattened PNG Export Settings
    // ------------------------------------------------------------
    const Na__PageLayout__PDF_EXPORT_DPI  = 600;                                  // <-- Target DPI for the flattened sheet PNG
    const Na__PageLayout__PIXELS_PER_MM   = Na__PageLayout__PDF_EXPORT_DPI / 25.4; // <-- Derived pixels-per-mm at target DPI
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Export Filenames
    // ------------------------------------------------------------
    const Na__PageLayout__FILENAME_FULL_LAYOUT = 'ValeVision3D__Layout__A3.pdf';  // <-- Full layout filename
    const Na__PageLayout__FILENAME_IMAGE_ONLY  = 'ValeVision3D__ImageOnly__A3.pdf'; // <-- Image only filename
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get jsPDF Constructor from UMD Global
    // ------------------------------------------------------------
    function Na__PageLayout__GetJsPDF() {
        if (window.jspdf && window.jspdf.jsPDF) {
            return window.jspdf.jsPDF; // <-- Return jsPDF constructor from UMD global
        }
        console.error('[PageLayout] jsPDF not found. Ensure jspdf.umd.js is loaded.'); // <-- Log error
        return null; // <-- Return null if not available
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create A3 Landscape PDF Document
    // ------------------------------------------------------------
    function Na__PageLayout__CreateA3Document() {
        const JsPDF = Na__PageLayout__GetJsPDF(); // <-- Get constructor
        if (!JsPDF) return null; // <-- Abort if not available

        return new JsPDF({
            orientation    : Na__PageLayout__PDF_ORIENTATION, // <-- Landscape
            unit           : Na__PageLayout__PDF_UNIT,        // <-- Millimeters
            format         : Na__PageLayout__PDF_FORMAT,      // <-- A3
            compress       : true,                             // <-- Enable FlateEncode compression on PDF streams
            floatPrecision : 'smart'                           // <-- Reduce coordinate precision bloat
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Flatten Full A3 Sheet to PNG Data URL
    // ------------------------------------------------------------
    // Renders the entire composed A3 page into a single offscreen canvas at
    // Na__PageLayout__PDF_EXPORT_DPI (600 dpi), exactly mirroring the live canvas
    // preview. Both title block and viewport image are composited together here
    // before PDF embedding, so the PDF carries one image rather than many layers.
    //
    // @param  {object}  state             - Shared layout state object
    // @param  {boolean} includeTitleBlock - Whether to draw the title block layer
    // @returns {string} PNG data URL of the fully composed sheet
    // ------------------------------------------------------------
    function Na__PageLayout__FlattenSheetToDataUrl(state, includeTitleBlock) {
        const ppm          = Na__PageLayout__PIXELS_PER_MM; // <-- Pixels per mm at export DPI
        const canvasWidth  = Math.round(state.a3.widthMm  * ppm); // <-- Pixel width of A3 landscape at target DPI
        const canvasHeight = Math.round(state.a3.heightMm * ppm); // <-- Pixel height of A3 landscape at target DPI

        const canvas       = document.createElement('canvas'); // <-- Create offscreen export canvas
        canvas.width       = canvasWidth; // <-- Set pixel width
        canvas.height      = canvasHeight; // <-- Set pixel height
        const ctx          = canvas.getContext('2d'); // <-- Get 2D context

        // Fill white paper background
        // ------------------------------------------------------------
        ctx.fillStyle = '#ffffff'; // <-- White background
        ctx.fillRect(0, 0, canvasWidth, canvasHeight); // <-- Fill entire canvas

        // Draw title block at full A3 size (locked background layer)
        // ------------------------------------------------------------
        if (includeTitleBlock && state.titleBlockImage) {
            ctx.drawImage(state.titleBlockImage, 0, 0, canvasWidth, canvasHeight); // <-- Stretch title block to full A3
        }

        // Draw viewport image with position, scale, and clipping applied
        // ------------------------------------------------------------
        if (state.viewportImage) {
            const imgX = state.imageTransform.x      * ppm; // <-- Image X position in pixels
            const imgY = state.imageTransform.y      * ppm; // <-- Image Y position in pixels
            const imgW = state.imageTransform.width  * ppm; // <-- Image width in pixels
            const imgH = state.imageTransform.height * ppm; // <-- Image height in pixels

            // Convert clipping values from mm to pixels
            // ------------------------------------------------------------
            const clipT = (state.imageTransform.clipTop    || 0) * ppm; // <-- Clip from top in pixels
            const clipR = (state.imageTransform.clipRight  || 0) * ppm; // <-- Clip from right in pixels
            const clipB = (state.imageTransform.clipBottom || 0) * ppm; // <-- Clip from bottom in pixels
            const clipL = (state.imageTransform.clipLeft   || 0) * ppm; // <-- Clip from left in pixels

            // Calculate the visible (clipped) region on the export canvas
            // ------------------------------------------------------------
            const visibleX = imgX + clipL; // <-- Visible region X start
            const visibleY = imgY + clipT; // <-- Visible region Y start
            const visibleW = imgW - clipL - clipR; // <-- Visible region width
            const visibleH = imgH - clipT - clipB; // <-- Visible region height

            // Draw image with clipping mask (mirrors CanvasRenderPipeline exactly)
            // ------------------------------------------------------------
            if (visibleW > 0 && visibleH > 0) {
                ctx.save(); // <-- Save context state
                ctx.beginPath(); // <-- Begin clip path
                ctx.rect(visibleX, visibleY, visibleW, visibleH); // <-- Define visible region
                ctx.clip(); // <-- Apply clipping mask
                ctx.drawImage(state.viewportImage, imgX, imgY, imgW, imgH); // <-- Draw full image (clip hides trimmed edges)
                ctx.restore(); // <-- Restore context state (removes clip)
            }
        }

        return canvas.toDataURL('image/png'); // <-- Serialize composed sheet as lossless PNG
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Export Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Export Full Layout (Title Block + Viewport Image)
    // ------------------------------------------------------------
    function Na__PageLayout__ExportFullLayout(state) {
        if (!state) return; // <-- Guard against missing state

        const doc = Na__PageLayout__CreateA3Document(); // <-- Create compressed PDF document
        if (!doc) return; // <-- Abort if jsPDF unavailable

        // Flatten full A3 sheet (title block + viewport) into one PNG
        // ------------------------------------------------------------
        try {
            const flattenedDataUrl = Na__PageLayout__FlattenSheetToDataUrl(state, true); // <-- Compose full sheet at 600 dpi
            doc.addImage( // <-- Embed single flattened PNG as the only image in the PDF
                flattenedDataUrl,
                'PNG',
                0,                   // <-- X position: left edge
                0,                   // <-- Y position: top edge
                state.a3.widthMm,    // <-- Full A3 width (420mm)
                state.a3.heightMm    // <-- Full A3 height (297mm)
            );
        } catch (err) {
            console.error('[PageLayout] Failed to flatten or embed full layout sheet:', err); // <-- Log error
        }

        doc.save(Na__PageLayout__FILENAME_FULL_LAYOUT); // <-- Download PDF
    }
    // ------------------------------------------------------------


    // FUNCTION | Export Image Only (No Title Block)
    // ------------------------------------------------------------
    function Na__PageLayout__ExportImageOnly(state) {
        if (!state) return; // <-- Guard against missing state

        const doc = Na__PageLayout__CreateA3Document(); // <-- Create compressed PDF document
        if (!doc) return; // <-- Abort if jsPDF unavailable

        // Flatten viewport-only sheet (no title block) into one PNG
        // ------------------------------------------------------------
        try {
            const flattenedDataUrl = Na__PageLayout__FlattenSheetToDataUrl(state, false); // <-- Compose viewport-only sheet at 600 dpi
            doc.addImage( // <-- Embed single flattened PNG as the only image in the PDF
                flattenedDataUrl,
                'PNG',
                0,                   // <-- X position: left edge
                0,                   // <-- Y position: top edge
                state.a3.widthMm,    // <-- Full A3 width (420mm)
                state.a3.heightMm    // <-- Full A3 height (297mm)
            );
        } catch (err) {
            console.error('[PageLayout] Failed to flatten or embed image-only sheet:', err); // <-- Log error
        }

        doc.save(Na__PageLayout__FILENAME_IMAGE_ONLY); // <-- Download PDF
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Button Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize PDF Export Button Handlers
    // ------------------------------------------------------------
    function Na__PageLayout__InitPdfExport(state) {
        if (!state) return; // <-- Guard against missing state

        const exportFullButton      = document.getElementById('naLayoutExportFull'); // <-- Full layout button
        const exportImageOnlyButton = document.getElementById('naLayoutExportImageOnly'); // <-- Image only button

        if (exportFullButton) {
            exportFullButton.addEventListener('click', () => {
                Na__PageLayout__ExportFullLayout(state); // <-- Export full layout PDF
            });
        }

        if (exportImageOnlyButton) {
            exportImageOnlyButton.addEventListener('click', () => {
                Na__PageLayout__ExportImageOnly(state); // <-- Export image only PDF
            });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | PDF Export API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__InitPdfExport
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
