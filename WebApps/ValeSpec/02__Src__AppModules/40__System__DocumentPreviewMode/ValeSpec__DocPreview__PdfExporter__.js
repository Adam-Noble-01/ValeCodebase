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
    const COLOUR_BRAND_PRIMARY     = [23, 43, 58];                              // <-- #172b3a — Vale brand navy
    const COLOUR_TEXT_PRIMARY      = [30, 30, 30];                              // <-- #1e1e1e — Primary body text
    const COLOUR_TEXT_SECONDARY    = [100, 100, 100];                           // <-- #646464 — Secondary / muted text
    const COLOUR_TABLE_HEADER_BG   = [23, 43, 58];                              // <-- #172b3a — Table header background
    const COLOUR_TABLE_HEADER_FG   = [255, 255, 255];                           // <-- #ffffff — Table header text
    const COLOUR_TABLE_ALT_ROW     = [245, 245, 245];                           // <-- #f5f5f5 — Alternating row background
    const COLOUR_TABLE_BORDER      = [200, 200, 200];                           // <-- #c8c8c8 — Table cell border
    const COLOUR_RULE_LINE         = [23, 43, 58];                              // <-- #172b3a — Horizontal rule
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
        var rows  =  [];

        var doorCfg    =  assembly['Assembly__DoorType__Config'] || {};
        var doorType   =  doorCfg['Assembly__DoorType__Config__Type']             || '';
        var direction  =  doorCfg['Assembly__DoorType__Config__OpeningDirection'] || '';
        var doorDesc   =  doorType ? (direction ? (direction + ' Opening ' + doorType) : doorType) : '\u2014';
        rows.push(['Door Type', doorDesc]);

        var dims    =  assembly['Assembly__Dimensions__Config'] || {};
        var dimW    =  dims['Assembly__Dimensions__Config__WidthMm'];
        var dimH    =  dims['Assembly__Dimensions__Config__HeightMm'];
        var dimStr  =  (!dimW && !dimH) ? '\u2014' : ((dimW || '\u2014') + ' x ' + (dimH || '\u2014') + ' mm');
        rows.push(['Dimensions', dimStr]);

        var lockCfg   =  assembly['Assembly__Locking__Config'] || {};
        var lockType  =  lockCfg['Assembly__Locking__Config__Type'] || 'None';
        var mpDesc    =  'None';
        if (lockType !== 'None') {
            mpDesc  =  lockType;
            var pts =  lockCfg['Assembly__Locking__Config__Points'] || '';
            if (pts) mpDesc  +=  ' (' + pts + '-point)';
        }
        rows.push(['Multi-Point Locking', mpDesc]);

        var hingeCfg    =  assembly['Assembly__Hinge__Config'] || {};
        var hCount      =  hingeCfg['Assembly__Hinge__Config__HingesPerLeaf'] || '\u2014';
        var hProj       =  hingeCfg['Assembly__Hinge__Config__Projection']    || '\u2014';
        var hHand       =  hingeCfg['Assembly__Hinge__Config__Hanging']       || '\u2014';
        rows.push(['Hinge Requirement', hCount + ' per leaf, ' + hProj + '" projection, ' + hHand + ' hand']);

        var leverCfg  =  assembly['Assembly__Lever__Config'] || {};
        var leverT    =  leverCfg['Assembly__Lever__Config__Type']      || '\u2014';
        var leverH    =  leverCfg['Assembly__Lever__Config__HeightMm'] || '';
        var leverDesc =  leverT;
        if (leverH) leverDesc  +=  ' @ ' + leverH + ' mm';
        rows.push(['Lever Type & Qty', leverDesc]);

        var cylDesc  =  (lockType === 'None') ? 'Not required' : '1 x Euro Cylinder (per multi-point track)';
        rows.push(['Cylinder Requirement', cylDesc]);

        var hooksCfg   =  assembly['Assembly__CabinHooks__Config'] || {};
        var hookCount  =  hooksCfg['Assembly__CabinHooks__Config__HookCount'] || 0;
        var eyeCount   =  hooksCfg['Assembly__CabinHooks__Config__EyeCount']  || 0;
        var hooksDesc  =  'None';
        if (hookCount > 0 || eyeCount > 0) {
            var hSize  =  hooksCfg['Assembly__CabinHooks__Config__Size'] || '';
            hooksDesc  =  hSize + ' \u2014 ' + hookCount + ' hook(s), ' + eyeCount + ' eye(s)';
        }
        rows.push(['Cabin Hooks', hooksDesc]);

        var miscLine   =  'None';
        var miscNotes  =  null;
        var SpecRenderer  =  window.ValeSpec__DocPreview__SpecTableRenderer;
        if (SpecRenderer && SpecRenderer.ValeSpec__SpecTableRenderer__GetMiscellaneousForPdf) {
            var miscParts  =  SpecRenderer.ValeSpec__SpecTableRenderer__GetMiscellaneousForPdf(assembly);
            miscLine   =  miscParts.itemsLine;
            miscNotes  =  miscParts.notesText;
        } else {
            var miscCfgFb   =  assembly['Assembly__Miscellaneous__Config'] || {};
            var miscItemsFb =  miscCfgFb['Assembly__Miscellaneous__Config__Items'] || [];
            miscLine  =  miscItemsFb.length ? miscItemsFb.join(', ') : 'None';
        }
        rows.push(['Miscellaneous', miscLine]);
        if (miscNotes) {
            rows.push(['Miscellaneous Notes', miscNotes]);
        }

        return rows;
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
