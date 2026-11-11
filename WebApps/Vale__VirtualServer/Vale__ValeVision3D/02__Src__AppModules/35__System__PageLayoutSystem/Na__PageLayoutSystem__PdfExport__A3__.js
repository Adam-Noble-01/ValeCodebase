// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - PDF EXPORT (A3)
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__PdfExport__A3__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : PDF Export A3
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Make the A3 layout's PDF with jsPDF (version-locked UMD build): build it
//              in memory, name it, hand it to the browser, report it
// CREATED    : 11-Feb-2026
//
// DESCRIPTION:
// - SINCE v2.94.0 THE EXPORT DIALOG DRIVES IT (Na__PageLayoutSystem__ExportDialog__): the
//   menu's two Export buttons open the dialog, which asks for the scheme name or
//   reference, builds the PDF here (Build), saves the drawing as a version on the
//   Vale Cloud, and only then hands the PDF to the browser (Download) and reports
//   it (Report). Nothing here is wired to a button any more.
// - "Full layout": A3 landscape PDF with title block + viewport image.
// - "Image only": A3 landscape PDF with viewport image only (no title block).
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
// 06-Nov-2026 - Version 2.4.0
// - Each PDF made is reported to the activity ledger as drawing.export ("Exported a
//   drawing PDF"; Target the layout name; Detail Kind "Full layout" or "Image only"
//   and File), through the app's shared Na__AppUtils__ExportReport__ (v2.90.0), which
//   finds ValeVision 3D's window.ValeActivity around this frame; alone, nothing.
//
// 11-Nov-2026 - Version 3.0.0 (ValeVision3D v2.94.0)
// - A library for the export dialog: Build (the PDF in memory, or an Error saying
//   why not), FileName, Download and Report. InitPdfExport is gone: the dialog
//   wires the buttons, because a PDF now leaves only after its drawing is saved
//   (Adam, 11-Nov-2026: an export with no saved version could never be got back).
// - The file is named {ProjectNo}__{ProjectName}__{Reference}__ValeVisionLayout__{Date}__.pdf
//   (Na__PageLayoutSystem__ExportNaming__, the config's patterns).
// - Report names the layout, its version and whether it was saved, and its Path is
//   the address that opens that version again.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Picture Layer, the File Name, the Activity Ledger
    // ------------------------------------------------------------
    import { Na__PageLayout__DrawImageLayer } from './Na__PageLayoutSystem__CanvasRenderPipeline__.js';
    import {
        Na__PageLayout__Naming__KIND,
        Na__PageLayout__Naming__FileName,
        Na__PageLayout__Naming__DrawingPath
    } from './Na__PageLayoutSystem__ExportNaming__.js';
    import { Na__ExportReport__Send } from '../03__AppUtils/Na__AppUtils__ExportReport__.js';   // <-- Activity ledger: what was produced
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
    const Na__PageLayout__FALLBACK_PATTERN_FULL   = '{ProjectNo}__{ProjectName}__{Reference}__ValeVisionLayout__{Date}__.pdf';
    const Na__PageLayout__FALLBACK_PATTERN_IMG    = '{ProjectNo}__{ProjectName}__{Reference}__ValeVisionLayout__ImageOnly__{Date}__.pdf';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Where the App Is (the Address That Opens a Version Again)
    // ------------------------------------------------------------
    const Na__PageLayout__APP_PATH                = new URL('../../', import.meta.url).pathname;   // <-- '/valevision/' wherever the app is served
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


    // FUNCTION | The PDF's File Name: the Job, the Reference, the Kind and the Date
    // ------------------------------------------------------------
    // 60795__Brown__Scheme-2a__Rear-Garden-View__ValeVisionLayout__11-Nov-2026__.pdf
    // ------------------------------------------------------------
    function Na__PageLayout__Pdf__FileName(state, reference, isFullLayout, date) {
        const pdfConfig = Na__PageLayout__ResolvePdfConfig(state);
        return Na__PageLayout__Naming__FileName({
            pattern      : isFullLayout ? pdfConfig.patternFull : pdfConfig.patternImg,
            projectId    : (state && state.project && state.project.id) ? String(state.project.id) : '',
            reference    : reference,
            date         : date,
            isFullLayout : isFullLayout
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Report the PDF to the Activity Ledger (never throws, never in the way)
    // ------------------------------------------------------------
    // The page is ValeVision 3D's Drawing Editor frame: the app's window holds the
    // shared ValeShared__ActivityLog__.js (window.ValeActivity), which adds who,
    // where from and the share link. Alone (?standalone=1) there is none.
    // details: { isFullLayout, fileName, reference, layoutId, versionNumber, saved,
    // notSavedWhy }. The ledger keeps six facts: Kind, File, Version, Saved, Layout.
    // Its Path is the address that opens the saved version again.
    // ------------------------------------------------------------
    function Na__PageLayout__Pdf__Report(state, details = {}) {
        try {
            const project = (state.project && state.project.id) ? String(state.project.id) : '';
            const name    = String(details.reference || (state.layout && state.layout.name) || 'Drawing').trim();
            const version = Number.isInteger(details.versionNumber) ? details.versionNumber : null;
            const path    = details.saved && details.layoutId
                ? Na__PageLayout__Naming__DrawingPath(Na__PageLayout__APP_PATH, project, details.layoutId, version)
                : '';
            Na__ExportReport__Send('drawing.export', name, {
                Kind    : details.isFullLayout === false ? Na__PageLayout__Naming__KIND.image : Na__PageLayout__Naming__KIND.full,
                File    : details.fileName || '',
                Version : version,
                Saved   : details.saved ? 'Yes' : ('No' + (details.notSavedWhy ? ': ' + String(details.notSavedWhy).slice(0, 80) : '')),
                Layout  : details.layoutId || ''
            }, project, path);
        } catch (err) { /* the ledger never stops a PDF */ }
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
// REGION | Build and Download
// -----------------------------------------------------------------------------

    // FUNCTION | Build the PDF in Memory (Nothing Leaves the Page Yet)
    // ------------------------------------------------------------
    // Answers the jsPDF document; THROWS an Error whose message says, in plain
    // words, why there is no PDF. The whole A3 sheet (title block and picture,
    // or the picture alone) is flattened to one JPEG at the configured DPI.
    // ------------------------------------------------------------
    function Na__PageLayout__Pdf__Build(state, isFullLayout) {
        if (!state || !state.viewportImage) throw new Error('There is no picture on the sheet yet: open a saved drawing or press Create Drawing first');

        const pdfConfig = Na__PageLayout__ResolvePdfConfig(state); // <-- Resolve config with fallbacks
        const doc       = Na__PageLayout__CreateDocument(pdfConfig); // <-- Create PDF document
        if (!doc) throw new Error('The PDF library did not load: reload the page and try again');

        let flattenedDataUrl = null;
        try {
            flattenedDataUrl = Na__PageLayout__FlattenSheetToDataUrl(state, isFullLayout !== false, pdfConfig);
        } catch (err) {
            console.error('[PageLayout] Failed to flatten the sheet:', err);
        }
        if (!flattenedDataUrl) {
            console.error('[PageLayout] Flatten returned null - canvas may have been capped or corrupt');
            throw new Error('This device could not make the PDF at full quality');
        }

        try {
            doc.addImage(
                flattenedDataUrl,
                'JPEG',
                0,                   // <-- X position: left edge
                0,                   // <-- Y position: top edge
                state.a3.widthMm,    // <-- Full page width
                state.a3.heightMm    // <-- Full page height
            );
        } catch (err) {
            console.error('[PageLayout] Failed to embed the flattened sheet:', err);
            throw new Error('The PDF could not be made');
        }
        return doc;
    }
    // ------------------------------------------------------------


    // FUNCTION | Hand the PDF to the Browser Under Its Name (true When the Browser Took It)
    // ------------------------------------------------------------
    function Na__PageLayout__Pdf__Download(doc, fileName) {
        if (!doc || typeof doc.save !== 'function') return false;
        try {
            doc.save(fileName || Na__PageLayout__FALLBACK_FILENAME_FULL);   // <-- jsPDF's own download link
            return true;
        } catch (err) {
            console.error('[PageLayout] The PDF could not be handed to the browser:', err);
            return false;
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
        Na__PageLayout__Pdf__Build,
        Na__PageLayout__Pdf__FileName,
        Na__PageLayout__Pdf__Download,
        Na__PageLayout__Pdf__Report
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
