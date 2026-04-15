/* =============================================================================
   VALESPEC - DOCUMENT PREVIEW PDF EXPORTER
   =============================================================================

   FILE       : ValeSpec__DocPreview__PdfExporter__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocPreview - PdfExporter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Export the document preview as an A4-width pageless PDF via jsPDF
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Produces a single-page A4-width PDF whose height grows to fit all content.
   - SVG drawings are rasterised to JPEG at 300 DPI via offscreen canvas.
   - All text (branding, titles, spec tables, job notes) is rendered as native
     selectable PDF text using jsPDF doc.text() / doc.setFont().
   - jsPDF v4.1.0 UMD build loaded via <script> tag (version-locked, CDN independent).
   - Accessed via window.jspdf.jsPDF (standard jsPDF UMD pattern).
   - Config values read from Na__DocPreview__Config.json with hard-coded fallbacks.

   -----------------------------------------------------------------------------

   DEVELOPMENT LOG:
   15-Apr-2026 - Version 1.0.0
   - Initial implementation with selectable text and rasterised SVG pipeline.
   - Two-pass renderer: measure total height then render into custom-height page.
   - Spec table rows mirror SpecTableRenderer data extraction logic exactly.

   15-Apr-2026 - Spec table miscellaneous
   - Miscellaneous row uses human-readable labels via shared SpecTableRenderer helper.
   - Optional Miscellaneous Notes row; PDF table uses dynamic row heights for wrapped text.

   ============================================================================= */

// =============================================================================
// REGION | PDF Exporter Module
// =============================================================================

const ValeSpec__DocPreview__PdfExporter = (function() {

// -----------------------------------------------------------------------------
// REGION | Fallback Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback PDF Export Settings
    // ------------------------------------------------------------
    const FALLBACK_DPI             = 300;                                       // <-- Target DPI for SVG rasterisation
    const FALLBACK_JPEG_QUALITY    = 0.92;                                      // <-- JPEG compression quality (0.0 - 1.0)
    const FALLBACK_PAGE_WIDTH_MM   = 210;                                       // <-- A4 portrait width in millimetres
    const FALLBACK_PAGE_PADDING_MM = 15;                                        // <-- Page padding on all sides
    const FALLBACK_COMPRESS        = true;                                      // <-- FlateEncode compression on PDF streams
    const FALLBACK_FLOAT_PRECISION = 'smart';                                   // <-- Coordinate precision mode
    const FALLBACK_MIN_DATAURL_LEN = 500;                                       // <-- Minimum valid data URL length
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Layout Metrics (mm)
    // ------------------------------------------------------------
    const BRANDING_LOGO_HEIGHT_MM  = 10;                                        // <-- Logo image height in the PDF
    const BRANDING_LOGO_WIDTH_MM   = 36;                                        // <-- Logo image width in the PDF
    const BRANDING_TOTAL_HEIGHT_MM = 22;                                        // <-- Branding block total height
    const BRANDING_RULE_GAP_MM     = 3;                                         // <-- Gap before horizontal rule
    const ASSEMBLY_TITLE_HEIGHT_MM = 8;                                         // <-- Assembly title line height
    const DRAWING_MAX_HEIGHT_MM    = 80;                                        // <-- Max height for rasterised SVG
    const DRAWING_GAP_BELOW_MM     = 4;                                         // <-- Gap below drawing before table
    const TABLE_HEADER_HEIGHT_MM   = 7;                                         // <-- Table header row height
    const TABLE_ROW_HEIGHT_MM      = 6;                                         // <-- Minimum table body row height
    const SPEC_TABLE_LINE_HEIGHT_MM = 3.5;                                      // <-- Per-line height for wrapped spec table cells (8pt body)
    const SECTION_GAP_MM           = 12;                                        // <-- Gap after last assembly (before job notes)
    const ASSEMBLY_SECTION_RULE_GAP_BEFORE_MM = 6;                              // <-- Space above inter-assembly horizontal rule
    const ASSEMBLY_SECTION_RULE_GAP_AFTER_MM  = 6;                              // <-- Space below inter-assembly horizontal rule
    const JOBNOTES_TITLE_HEIGHT_MM = 8;                                         // <-- Job notes heading height
    const JOBNOTES_LINE_HEIGHT_MM  = 5;                                         // <-- Job notes text line height
    const JOBNOTES_TOP_GAP_MM      = 6;                                         // <-- Gap above job notes section
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Rule Stroke Widths (mm, align with preview CSS 1px / 2px borders)
    // ------------------------------------------------------------
    const LINE_WIDTH_RULE_1PX_MM   = 0.15;                                      // <-- Matches 1px hr / table row borders in DocPreview
    const LINE_WIDTH_RULE_2PX_MM   = 0.30;                                      // <-- Matches 2px ValeSpec__DocPreview__BrandingHeader rule
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Font Sizes (pt)
    // ------------------------------------------------------------
    const FONT_SIZE_PROJECT_NAME   = 14;                                        // <-- Project name heading
    const FONT_SIZE_DOC_NAME       = 10;                                        // <-- Document name sub-heading
    const FONT_SIZE_DATE           = 8;                                         // <-- Date label
    const FONT_SIZE_ASSEMBLY_TITLE = 11;                                        // <-- Assembly block title
    const FONT_SIZE_TABLE_HEADER   = 8;                                         // <-- Table header text
    const FONT_SIZE_TABLE_BODY     = 8;                                         // <-- Table body text
    const FONT_SIZE_NOTES_TITLE    = 11;                                        // <-- Job notes heading
    const FONT_SIZE_NOTES_BODY     = 9;                                         // <-- Job notes body text
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Brand Colours
    // ------------------------------------------------------------
    // var (not const) = config-driven; overwritten by ResolveColours() at export time
    var COLOUR_BRAND_PRIMARY       = [23, 43, 58];                              // <-- #172b3a — Vale brand navy
    const COLOUR_TEXT_PRIMARY      = [30, 30, 30];                              // <-- #1e1e1e — Primary body text
    const COLOUR_TEXT_SECONDARY    = [100, 100, 100];                           // <-- #646464 — Secondary / muted text
    var COLOUR_TABLE_HEADER_BG     = [23, 43, 58];                              // <-- #172b3a — Table header background
    var COLOUR_TABLE_HEADER_FG     = [255, 255, 255];                           // <-- #ffffff — Table header text
    var COLOUR_TABLE_ALT_ROW       = [245, 245, 245];                           // <-- #f5f5f5 — Alternating row background
    const COLOUR_TABLE_BORDER      = [200, 200, 200];                           // <-- #c8c8c8 — Table cell border
    var COLOUR_RULE_LINE           = [23, 43, 58];                              // <-- #172b3a — Horizontal rule
    const COLOUR_WARNING_BG        = [253, 237, 237];                           // <-- #fdeded — Warning box background
    const COLOUR_WARNING_BORDER    = [211, 47, 47];                             // <-- #d32f2f — Warning box border
    const COLOUR_WARNING_TITLE     = [183, 28, 28];                             // <-- #b71c1c — Warning title text
    const COLOUR_WARNING_TEXT      = [198, 40, 40];                             // <-- #c62828 — Warning body text
    const WARNING_BOX_PADDING_MM   = 4;                                         // <-- Inner padding for warning box
    const WARNING_TITLE_HEIGHT_MM  = 5;                                         // <-- Warning title line height
    const WARNING_LINE_HEIGHT_MM   = 3.5;                                       // <-- Warning body text line height
    const WARNING_GAP_ABOVE_MM     = 4;                                         // <-- Gap above warning box
    const WARNING_GAP_BELOW_MM     = 2;                                         // <-- Gap below warning box
    const FONT_SIZE_WARNING_TITLE  = 9;                                         // <-- Warning title font size
    const FONT_SIZE_WARNING_BODY   = 8;                                         // <-- Warning body font size
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve PDF Export Config from App State
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__ResolveConfig() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var section       =  null;

        if (StateManager) {
            var state      =  StateManager.ValeSpec__StateManager__GetState();
            var appConfig  =  state ? state.appConfig : null;
            if (appConfig) section  =  appConfig['DocPreview__PdfExport__Config'] || null;
        }

        return {
            targetDpi      : (section && typeof section['DocPreview__PdfExport__Config__TargetDpi'] === 'number')
                                ? section['DocPreview__PdfExport__Config__TargetDpi']
                                : FALLBACK_DPI,
            jpegQuality    : (section && typeof section['DocPreview__PdfExport__Config__JpegQuality'] === 'number')
                                ? section['DocPreview__PdfExport__Config__JpegQuality']
                                : FALLBACK_JPEG_QUALITY,
            pageWidthMm    : (section && typeof section['DocPreview__PdfExport__Config__PageWidthMm'] === 'number')
                                ? section['DocPreview__PdfExport__Config__PageWidthMm']
                                : FALLBACK_PAGE_WIDTH_MM,
            pagePaddingMm  : (section && typeof section['DocPreview__PdfExport__Config__PagePaddingMm'] === 'number')
                                ? section['DocPreview__PdfExport__Config__PagePaddingMm']
                                : FALLBACK_PAGE_PADDING_MM,
            compress       : (section && typeof section['DocPreview__PdfExport__Config__Compress'] === 'boolean')
                                ? section['DocPreview__PdfExport__Config__Compress']
                                : FALLBACK_COMPRESS,
            floatPrecision : (section && typeof section['DocPreview__PdfExport__Config__FloatPrecision'] === 'string')
                                ? section['DocPreview__PdfExport__Config__FloatPrecision']
                                : FALLBACK_FLOAT_PRECISION
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert Hex Colour String to RGB Array
    // ------------------------------------------------------------
    function hexToRgb(hex) {
        if (typeof hex !== 'string' || hex.length < 7) return null;
        var r  =  parseInt(hex.slice(1, 3), 16);                                // <-- Red channel (0-255)
        var g  =  parseInt(hex.slice(3, 5), 16);                                // <-- Green channel (0-255)
        var b  =  parseInt(hex.slice(5, 7), 16);                                // <-- Blue channel (0-255)
        return (isNaN(r) || isNaN(g) || isNaN(b)) ? null : [r, g, b];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Brand and Table Colours from App Config
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__ResolveColours() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var section       =  null;

        if (StateManager) {
            var state      =  StateManager.ValeSpec__StateManager__GetState();
            var appConfig  =  state ? state.appConfig : null;
            if (appConfig) section  =  appConfig['DocPreview__SpecTable__Config'] || null;
        }

        function resolveHex(key, fallback) {
            if (section && typeof section[key] === 'string') {
                var rgb  =  hexToRgb(section[key]);
                if (rgb) return rgb;
            }
            return fallback;
        }

        var headerBg  =  resolveHex('DocPreview__SpecTable__Config__HeaderBackground', COLOUR_TABLE_HEADER_BG);

        return {
            brandPrimary   : headerBg,                                          // <-- Derived from table header bg (same brand navy)
            ruleLine       : headerBg,                                          // <-- Derived from table header bg (same brand navy)
            tableHeaderBg  : headerBg,
            tableHeaderFg  : resolveHex('DocPreview__SpecTable__Config__HeaderTextColor',  COLOUR_TABLE_HEADER_FG),
            tableAltRow    : resolveHex('DocPreview__SpecTable__Config__AltRowBackground', COLOUR_TABLE_ALT_ROW)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | State Access Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get Logo Path from Config
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetLogoPath() {
        var fallback      =  '../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png';
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return fallback;
        var state   =  StateManager.ValeSpec__StateManager__GetState();
        var config  =  state.appConfig;
        if (!config) return fallback;
        var hdr  =  config['DocEditor__Header__Config'];
        if (!hdr) return fallback;
        return hdr['DocEditor__Header__Config__LogoPath'] || fallback;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Project Metadata from State
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetProjectMeta() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return {};
        var state    =  StateManager.ValeSpec__StateManager__GetState();
        var project  =  state.currentProject;
        if (!project) return {};
        return project['ValeSpec__ProjectFile__Metadata'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Assemblies Array from State
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetAssemblies() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return [];
        var state    =  StateManager.ValeSpec__StateManager__GetState();
        var project  =  state.currentProject;
        if (!project) return [];
        return project['ValeSpec__ProjectFile__Assemblies'] || [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Job Notes from State
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetJobNotes() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return '';
        var state    =  StateManager.ValeSpec__StateManager__GetState();
        var project  =  state.currentProject;
        if (!project) return '';
        var gs  =  project['ValeSpec__ProjectFile__GlobalSettings'] || {};
        return gs['ValeSpec__ProjectFile__GlobalSettings__JobNotes'] || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Hardware Index from State
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetHardwareIndex() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return null;
        var state  =  StateManager.ValeSpec__StateManager__GetState();
        return state ? state.hardwareIndex : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Date via DateFormatter
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__FormatDate(dateStr) {
        if (!dateStr) return '\u2014';
        if (window.ValeSpec__AppUtils__DateFormatter) {
            return window.ValeSpec__AppUtils__DateFormatter.ValeSpec__DateFormatter__FormatShort(dateStr);
        }
        return dateStr;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Spec Table Data Extraction (mirrors SpecTableRenderer)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Assembly Title from Data
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__BuildAssemblyTitle(assembly) {
        var identity  =  assembly['Assembly__Identity__Config'] || {};
        var custom    =  identity['Assembly__Identity__Config__Title'];
        if (custom) return custom;

        var doorCfg     =  assembly['Assembly__DoorType__Config'] || {};
        var doorType    =  doorCfg['Assembly__DoorType__Config__Type']             || 'Door';
        var direction   =  doorCfg['Assembly__DoorType__Config__OpeningDirection'] || '';
        var fullLabel   =  direction ? (direction + ' Opening ' + doorType) : doorType;
        var dimensions  =  assembly['Assembly__Dimensions__Config'] || {};
        var width       =  dimensions['Assembly__Dimensions__Config__WidthMm']  || '\u2014';
        var height      =  dimensions['Assembly__Dimensions__Config__HeightMm'] || '\u2014';
        return fullLabel + ' \u2014 ' + width + ' x ' + height + ' mm';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract Spec Table Row Data as Array
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__ExtractSpecRows(assembly) {
        var SpecRenderer  =  window.ValeSpec__DocPreview__SpecTableRenderer;
        if (SpecRenderer && SpecRenderer.ValeSpec__SpecTableRenderer__GetSpecRows) {
            var sharedRows  =  SpecRenderer.ValeSpec__SpecTableRenderer__GetSpecRows(assembly) || [];
            var rows        =  [];

            for (var i = 0; i < sharedRows.length; i++) {
                var sharedRow  =  sharedRows[i] || {};
                var label      =  sharedRow.label || '\u2014';
                var value      =  sharedRow.value;

                if (value === null || value === undefined || value === '') value  =  '\u2014';

                rows.push([String(label), String(value)]);
            }

            return rows;
        }

        console.warn('[ValeSpec__PdfExporter] Spec table helper unavailable; using fallback rows.');
        return [
            ['Door Type', '\u2014'],
            ['Dimensions', '\u2014'],
            ['Locking Type', 'None'],
            ['Locking Points', 'Not required'],
            ['Cylinder Requirement', 'Not required'],
            ['Hinges Per Leaf', '\u2014'],
            ['Hinge Projection', '\u2014'],
            ['Hinge Hand', '\u2014'],
            ['Handle Type', '\u2014'],
            ['Handle Height', '\u2014'],
            ['Cabin Hook Type', 'None'],
            ['Cabin Hooks No.', 'None'],
            ['Cabin Hook Eyes', 'None'],
            ['Miscellaneous', 'None']
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | SVG Rasterisation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Rasterise SVG Markup to JPEG Data URL via Offscreen Canvas
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RasteriseSvg(svgMarkup, widthPx, heightPx, jpegQuality) {
        return new Promise(function(resolve) {
            if (!svgMarkup) { resolve(null); return; }

            var blob  =  new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
            var url   =  URL.createObjectURL(blob);
            var img   =  new Image();

            img.onload  =  function() {
                var canvas     =  document.createElement('canvas');
                canvas.width   =  widthPx;
                canvas.height  =  heightPx;

                if (canvas.width !== widthPx || canvas.height !== heightPx) {
                    console.error('[ValeSpec__PdfExporter] Canvas capped by browser: requested ' + widthPx + 'x' + heightPx);
                    URL.revokeObjectURL(url);
                    resolve(null);
                    return;
                }

                var ctx  =  canvas.getContext('2d');
                if (!ctx) {
                    console.error('[ValeSpec__PdfExporter] Failed to acquire 2D context');
                    URL.revokeObjectURL(url);
                    resolve(null);
                    return;
                }

                ctx.fillStyle  =  '#ffffff';
                ctx.fillRect(0, 0, widthPx, heightPx);
                ctx.drawImage(img, 0, 0, widthPx, heightPx);

                var dataUrl  =  canvas.toDataURL('image/jpeg', jpegQuality);
                URL.revokeObjectURL(url);

                if (!dataUrl || dataUrl.length < FALLBACK_MIN_DATAURL_LEN) {
                    console.error('[ValeSpec__PdfExporter] Canvas toDataURL returned invalid result');
                    resolve(null);
                    return;
                }

                resolve(dataUrl);
            };

            img.onerror  =  function() {
                console.error('[ValeSpec__PdfExporter] Failed to load SVG into Image element');
                URL.revokeObjectURL(url);
                resolve(null);
            };

            img.src  =  url;
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get SVG Intrinsic Aspect Ratio from viewBox
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetSvgAspectRatio(svgMarkup) {
        var match  =  svgMarkup.match(/viewBox\s*=\s*"([^"]+)"/);
        if (!match) return 1.0;
        var parts  =  match[1].split(/\s+/);
        if (parts.length < 4) return 1.0;
        var vbW  =  parseFloat(parts[2]);
        var vbH  =  parseFloat(parts[3]);
        if (!vbW || !vbH) return 1.0;
        return vbW / vbH;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Image Loading Helper
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Load Image from URL as Data URL for PDF Embedding
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__LoadImageAsDataUrl(imageSrc, width, height) {
        return new Promise(function(resolve) {
            if (!imageSrc) { resolve(null); return; }

            var img  =  new Image();
            img.crossOrigin  =  'anonymous';

            img.onload  =  function() {
                var canvas     =  document.createElement('canvas');
                canvas.width   =  width  || img.naturalWidth;
                canvas.height  =  height || img.naturalHeight;
                var ctx  =  canvas.getContext('2d');
                if (!ctx) { resolve(null); return; }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
            };

            img.onerror  =  function() {
                console.warn('[ValeSpec__PdfExporter] Could not load logo image: ' + imageSrc);
                resolve(null);
            };

            img.src  =  imageSrc;
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | PDF Rendering Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Render Branding Header into PDF Document
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderBranding(doc, meta, logoDataUrl, x, y, contentWidth) {
        var cursorY  =  y;

        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', x, cursorY, BRANDING_LOGO_WIDTH_MM, BRANDING_LOGO_HEIGHT_MM);
            } catch (e) {
                console.warn('[ValeSpec__PdfExporter] Logo embed failed:', e);
            }
        }

        var textX  =  x + BRANDING_LOGO_WIDTH_MM + 4;

        var projectName  =  meta['ValeSpec__ProjectFile__Metadata__ProjectName']  || 'Untitled Project';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_PROJECT_NAME);
        doc.setTextColor(COLOUR_BRAND_PRIMARY[0], COLOUR_BRAND_PRIMARY[1], COLOUR_BRAND_PRIMARY[2]);
        doc.text(projectName, textX, cursorY + 5);

        var docName   =  meta['ValeSpec__ProjectFile__Metadata__DocumentName'] || 'Untitled Document';
        var revision  =  meta['ValeSpec__ProjectFile__Metadata__RevisionCode'] || '';
        var docLabel  =  revision ? (docName + ' \u2014 Rev ' + revision) : docName;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZE_DOC_NAME);
        doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
        doc.text(docLabel, textX, cursorY + 10);

        var dateStr  =  ValeSpec__PdfExporter__FormatDate(meta['ValeSpec__ProjectFile__Metadata__DateCreated']);
        doc.setFontSize(FONT_SIZE_DATE);
        doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
        doc.text(dateStr, x + contentWidth, cursorY + 5, { align: 'right' });

        cursorY  +=  BRANDING_LOGO_HEIGHT_MM + BRANDING_RULE_GAP_MM;
        doc.setDrawColor(COLOUR_RULE_LINE[0], COLOUR_RULE_LINE[1], COLOUR_RULE_LINE[2]);
        doc.setLineWidth(LINE_WIDTH_RULE_2PX_MM);
        doc.line(x, cursorY, x + contentWidth, cursorY);

        return cursorY + 4;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Assembly Title into PDF
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderAssemblyTitle(doc, title, x, y) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_ASSEMBLY_TITLE);
        doc.setTextColor(COLOUR_TEXT_PRIMARY[0], COLOUR_TEXT_PRIMARY[1], COLOUR_TEXT_PRIMARY[2]);
        doc.text(title, x, y + 4);
        return y + ASSEMBLY_TITLE_HEIGHT_MM;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Measure Height of One Spec Table Body Row (wrapped text)
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__CalcSpecTableBodyRowHeight(doc, row, labelColW, valueColW) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZE_TABLE_BODY);
        var labelLines  =  doc.splitTextToSize(row[0], Math.max(8, labelColW - 4));
        var valueLines  =  doc.splitTextToSize(row[1], Math.max(8, valueColW - 4));
        var lineCount   =  Math.max(labelLines.length, valueLines.length);
        return Math.max(TABLE_ROW_HEIGHT_MM, 2 + lineCount * SPEC_TABLE_LINE_HEIGHT_MM);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Spec Table into PDF
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderSpecTable(doc, rows, x, y, contentWidth) {
        var cursorY    =  y;
        var labelColW  =  contentWidth * 0.40;
        var valueColW  =  contentWidth * 0.60;

        doc.setFillColor(COLOUR_TABLE_HEADER_BG[0], COLOUR_TABLE_HEADER_BG[1], COLOUR_TABLE_HEADER_BG[2]);
        doc.rect(x, cursorY, contentWidth, TABLE_HEADER_HEIGHT_MM, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_TABLE_HEADER);
        doc.setTextColor(COLOUR_TABLE_HEADER_FG[0], COLOUR_TABLE_HEADER_FG[1], COLOUR_TABLE_HEADER_FG[2]);
        doc.text('SPECIFICATION ITEM', x + 2, cursorY + 4.5);
        doc.text('DETAIL', x + labelColW + 2, cursorY + 4.5);
        cursorY  +=  TABLE_HEADER_HEIGHT_MM;

        doc.setFontSize(FONT_SIZE_TABLE_BODY);

        for (var i = 0; i < rows.length; i++) {
            var rowH  =  ValeSpec__PdfExporter__CalcSpecTableBodyRowHeight(doc, rows[i], labelColW, valueColW);

            if (i % 2 === 1) {
                doc.setFillColor(COLOUR_TABLE_ALT_ROW[0], COLOUR_TABLE_ALT_ROW[1], COLOUR_TABLE_ALT_ROW[2]);
                doc.rect(x, cursorY, contentWidth, rowH, 'F');
            }

            doc.setDrawColor(COLOUR_TABLE_BORDER[0], COLOUR_TABLE_BORDER[1], COLOUR_TABLE_BORDER[2]);
            doc.setLineWidth(LINE_WIDTH_RULE_1PX_MM);
            doc.line(x, cursorY + rowH, x + contentWidth, cursorY + rowH);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
            var labelLines  =  doc.splitTextToSize(rows[i][0], labelColW - 4);
            doc.text(labelLines, x + 2, cursorY + 4);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(COLOUR_TEXT_PRIMARY[0], COLOUR_TEXT_PRIMARY[1], COLOUR_TEXT_PRIMARY[2]);
            var valueLines  =  doc.splitTextToSize(rows[i][1], valueColW - 4);
            doc.text(valueLines, x + labelColW + 2, cursorY + 4);

            cursorY  +=  rowH;
        }

        return cursorY;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Job Notes Section into PDF
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderJobNotes(doc, notesText, x, y, contentWidth) {
        if (!notesText) return y;

        var cursorY  =  y + JOBNOTES_TOP_GAP_MM;

        doc.setDrawColor(COLOUR_TABLE_BORDER[0], COLOUR_TABLE_BORDER[1], COLOUR_TABLE_BORDER[2]);
        doc.setLineWidth(LINE_WIDTH_RULE_1PX_MM);
        doc.line(x, cursorY, x + contentWidth, cursorY);
        cursorY  +=  4;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_NOTES_TITLE);
        doc.setTextColor(COLOUR_TEXT_PRIMARY[0], COLOUR_TEXT_PRIMARY[1], COLOUR_TEXT_PRIMARY[2]);
        doc.text('Job Notes', x, cursorY + 4);
        cursorY  +=  JOBNOTES_TITLE_HEIGHT_MM;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZE_NOTES_BODY);
        doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);

        var maxTextWidth  =  contentWidth;
        var splitLines    =  doc.splitTextToSize(notesText, maxTextWidth);
        doc.text(splitLines, x, cursorY + 3);
        cursorY  +=  splitLines.length * JOBNOTES_LINE_HEIGHT_MM;

        return cursorY;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Warning Box Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Extract Active Warnings from Assembly
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__ExtractActiveWarnings(assembly) {
        var warningsCfg  =  assembly['Assembly__Warnings__Config'] || {};
        return warningsCfg['Assembly__Warnings__Config__ActiveWarnings'] || [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Calculate Warning Box Height for Measurement
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__MeasureWarningBoxHeight(doc, activeWarnings, contentWidth) {
        if (!activeWarnings || activeWarnings.length === 0) return 0;

        var totalHeight  =  0;
        var innerWidth   =  contentWidth - (WARNING_BOX_PADDING_MM * 2);

        for (var w = 0; w < activeWarnings.length; w++) {
            var warning     =  activeWarnings[w];
            var docWarning  =  warning.DocumentWarning || {};
            var warnMsg     =  docWarning.Message || warning.WarningMessage || '';

            totalHeight  +=  WARNING_GAP_ABOVE_MM;
            totalHeight  +=  WARNING_BOX_PADDING_MM;
            totalHeight  +=  WARNING_TITLE_HEIGHT_MM;

            doc.setFontSize(FONT_SIZE_WARNING_BODY);
            var msgLines  =  doc.splitTextToSize(warnMsg, innerWidth);
            totalHeight  +=  msgLines.length * WARNING_LINE_HEIGHT_MM;

            totalHeight  +=  WARNING_BOX_PADDING_MM;
            totalHeight  +=  WARNING_GAP_BELOW_MM;
        }

        return totalHeight;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Warning Boxes into PDF
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderWarningBoxes(doc, activeWarnings, x, y, contentWidth) {
        if (!activeWarnings || activeWarnings.length === 0) return y;

        var cursorY    =  y;
        var innerWidth =  contentWidth - (WARNING_BOX_PADDING_MM * 2);

        for (var w = 0; w < activeWarnings.length; w++) {
            var warning     =  activeWarnings[w];
            var docWarning  =  warning.DocumentWarning || {};
            var warnTitle   =  docWarning.Title   || 'Warning';
            var warnMsg     =  docWarning.Message  || warning.WarningMessage || '';

            cursorY  +=  WARNING_GAP_ABOVE_MM;

            doc.setFontSize(FONT_SIZE_WARNING_BODY);
            var msgLines  =  doc.splitTextToSize(warnMsg, innerWidth);
            var boxH      =  WARNING_BOX_PADDING_MM
                           + WARNING_TITLE_HEIGHT_MM
                           + (msgLines.length * WARNING_LINE_HEIGHT_MM)
                           + WARNING_BOX_PADDING_MM;

            doc.setFillColor(COLOUR_WARNING_BG[0], COLOUR_WARNING_BG[1], COLOUR_WARNING_BG[2]);
            doc.setDrawColor(COLOUR_WARNING_BORDER[0], COLOUR_WARNING_BORDER[1], COLOUR_WARNING_BORDER[2]);
            doc.setLineWidth(LINE_WIDTH_RULE_1PX_MM);
            doc.roundedRect(x, cursorY, contentWidth, boxH, 1, 1, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(FONT_SIZE_WARNING_TITLE);
            doc.setTextColor(COLOUR_WARNING_TITLE[0], COLOUR_WARNING_TITLE[1], COLOUR_WARNING_TITLE[2]);
            doc.text('\u26A0 ' + warnTitle, x + WARNING_BOX_PADDING_MM, cursorY + WARNING_BOX_PADDING_MM + 3.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(FONT_SIZE_WARNING_BODY);
            doc.setTextColor(COLOUR_WARNING_TEXT[0], COLOUR_WARNING_TEXT[1], COLOUR_WARNING_TEXT[2]);
            doc.text(msgLines, x + WARNING_BOX_PADDING_MM, cursorY + WARNING_BOX_PADDING_MM + WARNING_TITLE_HEIGHT_MM + 2);

            cursorY  +=  boxH + WARNING_GAP_BELOW_MM;
        }

        return cursorY;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Measurement Pass
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Calculate Total Document Height in mm
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__MeasureTotalHeight(assemblies, jobNotes, pdfConfig, doc) {
        var pad     =  pdfConfig.pagePaddingMm;
        var height  =  pad;

        height  +=  BRANDING_TOTAL_HEIGHT_MM;

        var contentWidth  =  pdfConfig.pageWidthMm - (pad * 2);
        var labelColW     =  contentWidth * 0.40;
        var valueColW     =  contentWidth * 0.60;

        for (var i = 0; i < assemblies.length; i++) {
            height  +=  ASSEMBLY_TITLE_HEIGHT_MM;
            height  +=  DRAWING_MAX_HEIGHT_MM + DRAWING_GAP_BELOW_MM;

            var specRows  =  ValeSpec__PdfExporter__ExtractSpecRows(assemblies[i]);
            height  +=  TABLE_HEADER_HEIGHT_MM;
            for (var r = 0; r < specRows.length; r++) {
                height  +=  ValeSpec__PdfExporter__CalcSpecTableBodyRowHeight(doc, specRows[r], labelColW, valueColW);
            }

            var activeWarnings  =  ValeSpec__PdfExporter__ExtractActiveWarnings(assemblies[i]);
            height  +=  ValeSpec__PdfExporter__MeasureWarningBoxHeight(doc, activeWarnings, contentWidth);

            if (i < assemblies.length - 1) {
                height  +=  ASSEMBLY_SECTION_RULE_GAP_BEFORE_MM + ASSEMBLY_SECTION_RULE_GAP_AFTER_MM;
            } else {
                height  +=  SECTION_GAP_MM;
            }
        }

        if (jobNotes) {
            height  +=  JOBNOTES_TOP_GAP_MM + 4 + JOBNOTES_TITLE_HEIGHT_MM;
            var contentWidth  =  pdfConfig.pageWidthMm - (pad * 2);
            doc.setFontSize(FONT_SIZE_NOTES_BODY);
            var splitLines  =  doc.splitTextToSize(jobNotes, contentWidth);
            height  +=  splitLines.length * JOBNOTES_LINE_HEIGHT_MM;
        }

        height  +=  pad;
        return Math.max(height, 100);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Export Function
// -----------------------------------------------------------------------------

    // FUNCTION | Export Document Preview as PDF
    // ------------------------------------------------------------
    async function ValeSpec__PdfExporter__Export() {

        var JsPDF  =  (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
        if (!JsPDF) {
            console.error('[ValeSpec__PdfExporter] jsPDF not found. Ensure jspdf.umd.js is loaded.');
            alert('PDF Export failed — jsPDF library not loaded.');
            return;
        }

        var pdfConfig     =  ValeSpec__PdfExporter__ResolveConfig();
        var colours       =  ValeSpec__PdfExporter__ResolveColours();           // <-- Read brand/table colours from Na__DocPreview__Config.json via app state

        COLOUR_BRAND_PRIMARY     =  colours.brandPrimary;                       // <-- Override fallback constants with config-driven values
        COLOUR_RULE_LINE         =  colours.ruleLine;
        COLOUR_TABLE_HEADER_BG   =  colours.tableHeaderBg;
        COLOUR_TABLE_HEADER_FG   =  colours.tableHeaderFg;
        COLOUR_TABLE_ALT_ROW     =  colours.tableAltRow;

        var meta          =  ValeSpec__PdfExporter__GetProjectMeta();
        var assemblies    =  ValeSpec__PdfExporter__GetAssemblies();
        var jobNotes      =  ValeSpec__PdfExporter__GetJobNotes();
        var hwIndex       =  ValeSpec__PdfExporter__GetHardwareIndex();
        var logoPath      =  ValeSpec__PdfExporter__GetLogoPath();
        var pad           =  pdfConfig.pagePaddingMm;
        var contentWidth  =  pdfConfig.pageWidthMm - (pad * 2);

        var exportBtn  =  document.getElementById('ValeSpec__DocPreview__BtnExport');
        if (exportBtn) {
            exportBtn.disabled   =  true;
            exportBtn.textContent  =  'Generating PDF\u2026';
        }

        try {

            // Create a temporary doc for measurement (splitTextToSize needs a doc instance)
            // ----------------------------------------------------------------
            var measureDoc  =  new JsPDF({
                orientation    : 'portrait',
                unit           : 'mm',
                format         : [pdfConfig.pageWidthMm, 200],
                compress       : pdfConfig.compress
            });

            var totalHeight  =  ValeSpec__PdfExporter__MeasureTotalHeight(assemblies, jobNotes, pdfConfig, measureDoc);

            // Create the real document with the measured height
            // ----------------------------------------------------------------
            var doc  =  new JsPDF({
                orientation    : 'portrait',
                unit           : 'mm',
                format         : [pdfConfig.pageWidthMm, totalHeight],
                compress       : pdfConfig.compress,
                floatPrecision : pdfConfig.floatPrecision
            });

            var cursorY  =  pad;
            var x        =  pad;

            // Load logo image
            // ----------------------------------------------------------------
            var logoDataUrl  =  await ValeSpec__PdfExporter__LoadImageAsDataUrl(logoPath, 200, 56);

            // Render branding header
            // ----------------------------------------------------------------
            cursorY  =  ValeSpec__PdfExporter__RenderBranding(doc, meta, logoDataUrl, x, cursorY, contentWidth);

            // Render each assembly block
            // ----------------------------------------------------------------
            var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;

            for (var i = 0; i < assemblies.length; i++) {
                var assembly  =  assemblies[i];

                var title  =  ValeSpec__PdfExporter__BuildAssemblyTitle(assembly);
                cursorY    =  ValeSpec__PdfExporter__RenderAssemblyTitle(doc, title, x, cursorY);

                // Rasterise SVG drawing
                // ------------------------------------------------------------
                if (RenderPipeline) {
                    var svgMarkup  =  null;
                    try {
                        svgMarkup  =  RenderPipeline.ValeSpec__RenderPipeline__RenderThumbnail(assembly, hwIndex);
                    } catch (e) {
                        console.warn('[ValeSpec__PdfExporter] SVG render error for assembly ' + i + ':', e);
                    }

                    if (svgMarkup) {
                        var aspectRatio    =  ValeSpec__PdfExporter__GetSvgAspectRatio(svgMarkup);
                        var drawingWidthMm   =  contentWidth;
                        var drawingHeightMm  =  drawingWidthMm / aspectRatio;

                        if (drawingHeightMm > DRAWING_MAX_HEIGHT_MM) {
                            drawingHeightMm  =  DRAWING_MAX_HEIGHT_MM;
                            drawingWidthMm   =  drawingHeightMm * aspectRatio;
                        }

                        var ppm       =  pdfConfig.targetDpi / 25.4;
                        var rasterW   =  Math.round(drawingWidthMm * ppm);
                        var rasterH   =  Math.round(drawingHeightMm * ppm);

                        var drawingDataUrl  =  await ValeSpec__PdfExporter__RasteriseSvg(svgMarkup, rasterW, rasterH, pdfConfig.jpegQuality);
                        if (drawingDataUrl) {
                            var imgX  =  x + (contentWidth - drawingWidthMm) / 2;
                            try {
                                doc.addImage(drawingDataUrl, 'JPEG', imgX, cursorY, drawingWidthMm, drawingHeightMm);
                            } catch (e) {
                                console.warn('[ValeSpec__PdfExporter] addImage failed for assembly ' + i + ':', e);
                            }
                        }
                        cursorY  +=  drawingHeightMm + DRAWING_GAP_BELOW_MM;
                    } else {
                        cursorY  +=  DRAWING_MAX_HEIGHT_MM + DRAWING_GAP_BELOW_MM;
                    }
                } else {
                    cursorY  +=  DRAWING_MAX_HEIGHT_MM + DRAWING_GAP_BELOW_MM;
                }

                // Render spec table
                // ------------------------------------------------------------
                var specRows  =  ValeSpec__PdfExporter__ExtractSpecRows(assembly);
                cursorY       =  ValeSpec__PdfExporter__RenderSpecTable(doc, specRows, x, cursorY, contentWidth);

                // Render warning boxes (if any active warnings)
                // ------------------------------------------------------------
                var pdfWarnings  =  ValeSpec__PdfExporter__ExtractActiveWarnings(assembly);
                cursorY          =  ValeSpec__PdfExporter__RenderWarningBoxes(doc, pdfWarnings, x, cursorY, contentWidth);

                if (i < assemblies.length - 1) {
                    cursorY  +=  ASSEMBLY_SECTION_RULE_GAP_BEFORE_MM;
                    doc.setDrawColor(COLOUR_RULE_LINE[0], COLOUR_RULE_LINE[1], COLOUR_RULE_LINE[2]);
                    doc.setLineWidth(LINE_WIDTH_RULE_1PX_MM);
                    doc.line(x, cursorY, x + contentWidth, cursorY);
                    cursorY  +=  ASSEMBLY_SECTION_RULE_GAP_AFTER_MM;
                } else {
                    cursorY  +=  SECTION_GAP_MM;
                }
            }

            // Render job notes
            // ----------------------------------------------------------------
            cursorY  =  ValeSpec__PdfExporter__RenderJobNotes(doc, jobNotes, x, cursorY, contentWidth);

            // Save the PDF
            // ----------------------------------------------------------------
            var projectName  =  meta['ValeSpec__ProjectFile__Metadata__ProjectName'] || 'ValeSpec_Document';
            var safeName     =  projectName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
            var filename     =  'ValeSpec__' + safeName + '__.pdf';

            doc.save(filename);

            console.log('[ValeSpec__PdfExporter] PDF exported: ' + filename);

        } catch (err) {
            console.error('[ValeSpec__PdfExporter] Export failed:', err);
            alert('PDF Export failed. Check console for details.');
        } finally {
            if (exportBtn) {
                exportBtn.disabled     =  false;
                exportBtn.textContent  =  'Export PDF';
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__PdfExporter__Export  : ValeSpec__PdfExporter__Export
    };

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__PdfExporter  =  ValeSpec__DocPreview__PdfExporter;
