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
// - Both exports flatten the entire composed A3 sheet into one JPEG at 600 dpi,
//   then embed that single image into the PDF as a full-page bitmap.
// - Flattening mirrors the live canvas render exactly, including viewport clipping.
// - All export parameters are read from state.config (PageLayout__PdfExport__Config)
//   with hard-coded fallback defaults for graceful degradation.
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
// 12-Mar-2026 - Version 2.1.0
// - Switched flattened sheet from PNG to JPEG (0.92 quality) — 5-10x smaller data
//   URLs, dramatically reducing memory pressure and PDF file size.
// - Added canvas allocation validation to detect silent browser dimension capping
//   that caused vertical-stripe corruption on some devices/GPUs.
// - Added 2D context null-check to guard against total canvas allocation failure.
// - Added data URL length validation before passing to jsPDF addImage.
// - Export functions now abort cleanly (no corrupt PDF saved) when flatten fails.
//
// 12-Mar-2026 - Version 2.2.0
// - All hard-coded export parameters now read from state.config
//   (PageLayout__PdfExport__Config section) with fallback defaults.
//
// 09-Oct-2026 - Version 2.3.0 (ValeVision3D v2.75.0)
// - The picture and its trims are drawn by the render pipeline's DrawImageLayer,
//   the routine the screen uses, instead of a copy of it.
// - With a project the file is named <project>__<layout name>__Layout__A3.pdf
//   (FilenamePattern* in the config); without one, as before.
// - The buttons live in the side menu (same ids). A sheet with no picture, and a
//   failed flatten, say so on screen rather than only in the console.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Picture Layer, the Toast
    // ------------------------------------------------------------
    import { Na__PageLayout__DrawImageLayer } from './Na__PageLayoutSystem__CanvasRenderPipeline__.js';
    import { Na__PageLayout__Toast } from './Na__PageLayoutSystem__UiNotify__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants (Hard-Coded Fallback Defaults)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback PDF Document Settings
    // ------------------------------------------------------------
    const Na__PageLayout__FALLBACK_ORIENTATION    = 'landscape';                      // <-- Default A3 landscape orientation
    const Na__PageLayout__FALLBACK_UNIT           = 'mm';                             // <-- Default millimeter units
    const Na__PageLayout__FALLBACK_FORMAT         = 'a3';                             // <-- Default A3 paper format
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback Flattened JPEG Export Settings
    // ------------------------------------------------------------
    const Na__PageLayout__FALLBACK_EXPORT_DPI     = 600;                              // <-- Default target DPI for the flattened sheet
    const Na__PageLayout__FALLBACK_JPEG_QUALITY   = 0.92;                             // <-- Default JPEG compression quality (0.0 - 1.0)
    const Na__PageLayout__FALLBACK_COMPRESS       = true;                             // <-- Default FlateEncode compression on PDF streams
    const Na__PageLayout__FALLBACK_FLOAT_PREC     = 'smart';                          // <-- Default coordinate precision mode
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback Export Filenames
    // ------------------------------------------------------------
    const Na__PageLayout__FALLBACK_FILENAME_FULL  = 'ValeVision3D__Layout__A3.pdf';   // <-- Default full layout filename
    const Na__PageLayout__FALLBACK_FILENAME_IMG   = 'ValeVision3D__ImageOnly__A3.pdf'; // <-- Default image only filename
    const Na__PageLayout__FALLBACK_PATTERN_FULL   = '{project}__{layout}__Layout__A3.pdf';    // <-- With a project
    const Na__PageLayout__FALLBACK_PATTERN_IMG    = '{project}__{layout}__ImageOnly__A3.pdf'; // <-- With a project
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Data URL Validation
    // ------------------------------------------------------------
    const Na__PageLayout__MIN_DATAURL_LEN         = 1000;                             // <-- Minimum valid data URL length (sanity check)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve PDF Export Config from State
    // ------------------------------------------------------------
    function Na__PageLayout__ResolvePdfConfig(state) {
        const section = (state && state.config) ? state.config['PageLayout__PdfExport__Config'] : null;

        return {
            orientation    : (section && typeof section['PageLayout__PdfExport__Config__Orientation'] === 'string')
                                ? section['PageLayout__PdfExport__Config__Orientation']
                                : Na__PageLayout__FALLBACK_ORIENTATION,
            unit           : (section && typeof section['PageLayout__PdfExport__Config__Unit'] === 'string')
                                ? section['PageLayout__PdfExport__Config__Unit']
                                : Na__PageLayout__FALLBACK_UNIT,
            format         : (section && typeof section['PageLayout__PdfExport__Config__Format'] === 'string')
                                ? section['PageLayout__PdfExport__Config__Format']
                                : Na__PageLayout__FALLBACK_FORMAT,
            targetDpi      : (section && typeof section['PageLayout__PdfExport__Config__TargetDpi'] === 'number')
                                ? section['PageLayout__PdfExport__Config__TargetDpi']
                                : Na__PageLayout__FALLBACK_EXPORT_DPI,
            jpegQuality    : (section && typeof section['PageLayout__PdfExport__Config__JpegQuality'] === 'number')
                                ? section['PageLayout__PdfExport__Config__JpegQuality']
                                : Na__PageLayout__FALLBACK_JPEG_QUALITY,
            compress       : (section && typeof section['PageLayout__PdfExport__Config__Compress'] === 'boolean')
                                ? section['PageLayout__PdfExport__Config__Compress']
                                : Na__PageLayout__FALLBACK_COMPRESS,
            floatPrecision : (section && typeof section['PageLayout__PdfExport__Config__FloatPrecision'] === 'string')
                                ? section['PageLayout__PdfExport__Config__FloatPrecision']
                                : Na__PageLayout__FALLBACK_FLOAT_PREC,
            filenameFull   : (section && typeof section['PageLayout__PdfExport__Config__FilenameFullLayout'] === 'string')
                                ? section['PageLayout__PdfExport__Config__FilenameFullLayout']
                                : Na__PageLayout__FALLBACK_FILENAME_FULL,
            filenameImg    : (section && typeof section['PageLayout__PdfExport__Config__FilenameImageOnly'] === 'string')
                                ? section['PageLayout__PdfExport__Config__FilenameImageOnly']
                                : Na__PageLayout__FALLBACK_FILENAME_IMG,
            patternFull    : (section && typeof section['PageLayout__PdfExport__Config__FilenamePatternFull'] === 'string')
                                ? section['PageLayout__PdfExport__Config__FilenamePatternFull']
                                : Na__PageLayout__FALLBACK_PATTERN_FULL,
            patternImg     : (section && typeof section['PageLayout__PdfExport__Config__FilenamePatternImageOnly'] === 'string')
                                ? section['PageLayout__PdfExport__Config__FilenamePatternImageOnly']
                                : Na__PageLayout__FALLBACK_PATTERN_IMG
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The File Name: the Project and the Layout When Known, Else the Plain Name
    // ------------------------------------------------------------
    function Na__PageLayout__ResolvePdfFilename(state, pdfConfig, isFullLayout) {
        const project = (state.project && state.project.id) ? String(state.project.id) : '';
        if (!project) return isFullLayout ? pdfConfig.filenameFull : pdfConfig.filenameImg;

        const safe   = (text) => String(text || '').trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
        const record = state.layout && state.layout.record;
        const name   = safe(state.layout && state.layout.name) || safe(record && record.PageLayouts__Layout__Name) || 'Drawing';
        const file   = (isFullLayout ? pdfConfig.patternFull : pdfConfig.patternImg)
            .replace('{project}', safe(project.split('/').pop()) || 'Project')
            .replace('{layout}', name);
        return /\.pdf$/i.test(file) ? file : file + '.pdf';
    }
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
        console.error('[PageLayout] jsPDF not found. Ensure jspdf.umd.js is loaded.');
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create PDF Document from Config
    // ------------------------------------------------------------
    function Na__PageLayout__CreateDocument(pdfConfig) {
        const JsPDF = Na__PageLayout__GetJsPDF(); // <-- Get constructor
        if (!JsPDF) return null; // <-- Abort if not available

        return new JsPDF({
            orientation    : pdfConfig.orientation,    // <-- From config
            unit           : pdfConfig.unit,           // <-- From config
            format         : pdfConfig.format,         // <-- From config
            compress       : pdfConfig.compress,       // <-- From config
            floatPrecision : pdfConfig.floatPrecision  // <-- From config
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Flatten Full A3 Sheet to JPEG Data URL
    // ------------------------------------------------------------
    // Renders the entire composed page into a single offscreen canvas at the
    // configured target DPI, exactly mirroring the live canvas preview.
    // Both title block and viewport image are composited together here
    // before PDF embedding, so the PDF carries one image rather than many layers.
    //
    // Validates that the browser actually allocated the requested canvas
    // dimensions (browsers may silently cap large canvases, causing corrupt
    // pixel data with misaligned row stride). Returns null on failure.
    //
    // @param  {object}  state             - Shared layout state object
    // @param  {boolean} includeTitleBlock  - Whether to draw the title block layer
    // @param  {object}  pdfConfig          - Resolved PDF export config
    // @returns {string|null} JPEG data URL of the fully composed sheet, or null on failure
    // ------------------------------------------------------------
    function Na__PageLayout__FlattenSheetToDataUrl(state, includeTitleBlock, pdfConfig) {
        const ppm          = pdfConfig.targetDpi / 25.4; // <-- Pixels per mm at export DPI
        const canvasWidth  = Math.round(state.a3.widthMm  * ppm); // <-- Pixel width at target DPI
        const canvasHeight = Math.round(state.a3.heightMm * ppm); // <-- Pixel height at target DPI

        const canvas       = document.createElement('canvas'); // <-- Create offscreen export canvas
        canvas.width       = canvasWidth; // <-- Set pixel width
        canvas.height      = canvasHeight; // <-- Set pixel height

        // Validate canvas allocation (browser may silently cap dimensions)
        // ------------------------------------------------------------
        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
            console.error(`[PageLayout] Canvas capped by browser: requested ${canvasWidth}x${canvasHeight}, got ${canvas.width}x${canvas.height}`);
            return null;
        }

        const ctx = canvas.getContext('2d'); // <-- Get 2D context
        if (!ctx) {
            console.error('[PageLayout] Failed to acquire 2D context for offscreen canvas');
            return null;
        }

        // Fill white paper background
        // ------------------------------------------------------------
        ctx.fillStyle = '#ffffff'; // <-- White background
        ctx.fillRect(0, 0, canvasWidth, canvasHeight); // <-- Fill entire canvas

        // Draw title block at full page size (locked background layer)
        // ------------------------------------------------------------
        if (includeTitleBlock && state.titleBlockImage) {
            ctx.drawImage(state.titleBlockImage, 0, 0, canvasWidth, canvasHeight); // <-- Stretch title block to full page
        }

        // Draw viewport image with position, scale, and clipping applied
        // (the render pipeline's own routine, so the PDF is exactly the screen)
        // ------------------------------------------------------------
        Na__PageLayout__DrawImageLayer(ctx, state, ppm);

        // Serialize as JPEG (5-10x smaller than PNG for photographic content)
        // ------------------------------------------------------------
        const dataUrl = canvas.toDataURL('image/jpeg', pdfConfig.jpegQuality);

        // Validate data URL is not empty or suspiciously short
        // ------------------------------------------------------------
        if (!dataUrl || dataUrl.length < Na__PageLayout__MIN_DATAURL_LEN) {
            console.error(`[PageLayout] Canvas toDataURL returned invalid result (length: ${dataUrl ? dataUrl.length : 0})`);
            return null;
        }

        return dataUrl; // <-- Serialized composed sheet as JPEG
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
        if (!state.viewportImage) {
            Na__PageLayout__Toast('There is no picture on the sheet yet: open a saved layout first', true);
            return;
        }

        const pdfConfig = Na__PageLayout__ResolvePdfConfig(state); // <-- Resolve config with fallbacks
        const doc       = Na__PageLayout__CreateDocument(pdfConfig); // <-- Create PDF document
        if (!doc) {
            Na__PageLayout__Toast('The PDF library did not load: reload the page and try again', true);
            return; // <-- Abort if jsPDF unavailable
        }

        // Flatten full sheet (title block + viewport) into one JPEG
        // ------------------------------------------------------------
        try {
            const flattenedDataUrl = Na__PageLayout__FlattenSheetToDataUrl(state, true, pdfConfig);
            if (!flattenedDataUrl) {
                console.error('[PageLayout] Flatten returned null - canvas may have been capped or corrupt');
                Na__PageLayout__Toast('This device could not make the PDF at full quality', true);
                return;
            }

            doc.addImage(
                flattenedDataUrl,
                'JPEG',
                0,                   // <-- X position: left edge
                0,                   // <-- Y position: top edge
                state.a3.widthMm,    // <-- Full page width
                state.a3.heightMm    // <-- Full page height
            );
        } catch (err) {
            console.error('[PageLayout] Failed to flatten or embed full layout sheet:', err);
            Na__PageLayout__Toast('The PDF could not be made', true);
            return;
        }

        doc.save(Na__PageLayout__ResolvePdfFilename(state, pdfConfig, true)); // <-- Download PDF
    }
    // ------------------------------------------------------------


    // FUNCTION | Export Image Only (No Title Block)
    // ------------------------------------------------------------
    function Na__PageLayout__ExportImageOnly(state) {
        if (!state) return; // <-- Guard against missing state
        if (!state.viewportImage) {
            Na__PageLayout__Toast('There is no picture on the sheet yet: open a saved layout first', true);
            return;
        }

        const pdfConfig = Na__PageLayout__ResolvePdfConfig(state); // <-- Resolve config with fallbacks
        const doc       = Na__PageLayout__CreateDocument(pdfConfig); // <-- Create PDF document
        if (!doc) {
            Na__PageLayout__Toast('The PDF library did not load: reload the page and try again', true);
            return; // <-- Abort if jsPDF unavailable
        }

        // Flatten viewport-only sheet (no title block) into one JPEG
        // ------------------------------------------------------------
        try {
            const flattenedDataUrl = Na__PageLayout__FlattenSheetToDataUrl(state, false, pdfConfig);
            if (!flattenedDataUrl) {
                console.error('[PageLayout] Flatten returned null - canvas may have been capped or corrupt');
                Na__PageLayout__Toast('This device could not make the PDF at full quality', true);
                return;
            }

            doc.addImage(
                flattenedDataUrl,
                'JPEG',
                0,                   // <-- X position: left edge
                0,                   // <-- Y position: top edge
                state.a3.widthMm,    // <-- Full page width
                state.a3.heightMm    // <-- Full page height
            );
        } catch (err) {
            console.error('[PageLayout] Failed to flatten or embed image-only sheet:', err);
            Na__PageLayout__Toast('The PDF could not be made', true);
            return;
        }

        doc.save(Na__PageLayout__ResolvePdfFilename(state, pdfConfig, false)); // <-- Download PDF
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
