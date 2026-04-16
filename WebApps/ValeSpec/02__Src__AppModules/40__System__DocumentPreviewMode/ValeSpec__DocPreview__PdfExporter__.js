/* =============================================================================
   VALESPEC - DOCUMENT PREVIEW PDF EXPORTER
   =============================================================================

   FILE       : ValeSpec__DocPreview__PdfExporter__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocPreview - PdfExporter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Export the rendered Document Preview into a parity-aligned PDF
   CREATED    : 16-Apr-2026

   DESCRIPTION:
   - Uses shared DocumentState + DocumentModel for preview/PDF parity
   - Applies section toggles and diagram mode exactly as current preview state
   - Renders full schedule, summary, warnings, and special notes sections
   - Resolves supplier/finish/quantity fallback values as N/A in summary output
   - Renders warning content in red bordered boxes for high visibility

   ============================================================================= */

// =============================================================================
// REGION | PDF Exporter Module
// =============================================================================

const ValeSpec__DocPreview__PdfExporter = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | PDF Config Fallbacks
    // ------------------------------------------------------------
    const FALLBACK_DPI             =  300;
    const FALLBACK_JPEG_QUALITY    =  0.92;
    const FALLBACK_PAGE_WIDTH_MM   =  210;
    const FALLBACK_PAGE_PADDING_MM =  15;
    const FALLBACK_COMPRESS        =  true;
    const FALLBACK_FLOAT_PRECISION =  'smart';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Layout Metrics (mm)
    // ------------------------------------------------------------
    const BRANDING_LOGO_WIDTH_MM          =  36;
    const BRANDING_LOGO_HEIGHT_MM         =  10;
    const BRANDING_RULE_GAP_MM            =  3;
    const BRANDING_BLOCK_BOTTOM_GAP_MM    =  6;
    const SECTION_HEADING_HEIGHT_MM       =  7;
    const SECTION_HEADING_BOTTOM_GAP_MM   =  4;
    const SECTION_BOTTOM_GAP_MM           =  8;
    const ASSEMBLY_TITLE_HEIGHT_MM        =  7;
    const ASSEMBLY_BLOCK_GAP_MM           =  8;
    const DRAWING_HEIGHT_LARGE_MM         =  80;
    const DRAWING_HEIGHT_SMALL_MM         =  40;
    const DRAWING_GAP_BELOW_MM            =  4;
    const TABLE_HEADER_HEIGHT_MM          =  7;
    const TABLE_ROW_MIN_HEIGHT_MM         =  6;
    const TABLE_LINE_HEIGHT_MM            =  3.5;
    const WARNING_BOX_PADDING_MM          =  4;
    const WARNING_BOX_GAP_MM              =  3;
    const WARNING_TITLE_HEIGHT_MM         =  4.5;
    const WARNING_LINE_HEIGHT_MM          =  3.5;
    const NOTES_LINE_HEIGHT_MM            =  4.5;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Stroke Widths (mm)
    // ------------------------------------------------------------
    const LINE_WIDTH_THIN_MM   =  0.15;
    const LINE_WIDTH_MEDIUM_MM =  0.30;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Font Sizes (pt)
    // ------------------------------------------------------------
    const FONT_SIZE_PROJECT_NAME   =  14;
    const FONT_SIZE_DOC_NAME       =  10;
    const FONT_SIZE_META_DATE      =  8;
    const FONT_SIZE_SECTION_TITLE  =  11;
    const FONT_SIZE_ASSEMBLY_TITLE =  10;
    const FONT_SIZE_TABLE_HEADER   =  8;
    const FONT_SIZE_TABLE_BODY     =  8;
    const FONT_SIZE_WARNING_TITLE  =  9;
    const FONT_SIZE_WARNING_BODY   =  8;
    const FONT_SIZE_NOTES_BODY     =  9;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback Colour Palette
    // ------------------------------------------------------------
    const COLOUR_TEXT_PRIMARY       =  [30, 30, 30];
    const COLOUR_TEXT_SECONDARY     =  [95, 95, 95];
    const COLOUR_BORDER_LIGHT       =  [204, 204, 204];
    const COLOUR_BRAND_PRIMARY      =  [23, 43, 58];
    const COLOUR_TABLE_HEADER_BG    =  [23, 43, 58];
    const COLOUR_TABLE_HEADER_FG    =  [255, 255, 255];
    const COLOUR_TABLE_ALT_ROW      =  [245, 245, 245];
    const COLOUR_WARNING_BG         =  [253, 237, 237];
    const COLOUR_WARNING_BORDER     =  [211, 47, 47];
    const COLOUR_WARNING_TITLE      =  [183, 28, 28];
    const COLOUR_WARNING_TEXT       =  [198, 40, 40];
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Config and State
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve PDF Export Config
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__ResolvePdfConfig() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        var section       =  null;
        if (StateManager) {
            var state      =  StateManager.ValeSpec__StateManager__GetState();
            var appConfig  =  state ? state.appConfig : null;
            if (appConfig) section  =  appConfig['DocPreview__PdfExport__Config'] || null;
        }

        return {
            targetDpi      : (section && typeof section['DocPreview__PdfExport__Config__TargetDpi'] === 'number')
                                ? section['DocPreview__PdfExport__Config__TargetDpi'] : FALLBACK_DPI,
            jpegQuality    : (section && typeof section['DocPreview__PdfExport__Config__JpegQuality'] === 'number')
                                ? section['DocPreview__PdfExport__Config__JpegQuality'] : FALLBACK_JPEG_QUALITY,
            pageWidthMm    : (section && typeof section['DocPreview__PdfExport__Config__PageWidthMm'] === 'number')
                                ? section['DocPreview__PdfExport__Config__PageWidthMm'] : FALLBACK_PAGE_WIDTH_MM,
            pagePaddingMm  : (section && typeof section['DocPreview__PdfExport__Config__PagePaddingMm'] === 'number')
                                ? section['DocPreview__PdfExport__Config__PagePaddingMm'] : FALLBACK_PAGE_PADDING_MM,
            compress       : (section && typeof section['DocPreview__PdfExport__Config__Compress'] === 'boolean')
                                ? section['DocPreview__PdfExport__Config__Compress'] : FALLBACK_COMPRESS,
            floatPrecision : (section && typeof section['DocPreview__PdfExport__Config__FloatPrecision'] === 'string')
                                ? section['DocPreview__PdfExport__Config__FloatPrecision'] : FALLBACK_FLOAT_PRECISION
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert Hex Colour to RGB Triplet
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__HexToRgb(hexValue) {
        if (typeof hexValue !== 'string') return null;
        var hex  =  hexValue.trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;

        var r  =  parseInt(hex.slice(1, 3), 16);
        var g  =  parseInt(hex.slice(3, 5), 16);
        var b  =  parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert rgb()/rgba() String to RGB Triplet
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__CssRgbToTriplet(rgbString) {
        if (typeof rgbString !== 'string') return null;
        var match  =  rgbString.match(/rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i);
        if (!match) return null;

        var r  =  Math.max(0, Math.min(255, Math.round(parseFloat(match[1]))));
        var g  =  Math.max(0, Math.min(255, Math.round(parseFloat(match[2]))));
        var b  =  Math.max(0, Math.min(255, Math.round(parseFloat(match[3]))));
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
        return [r, g, b];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Colour Token into RGB Triplet
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__ResolveColourToken(rawValue, fallbackRgb) {
        var fromHex  =  ValeSpec__PdfExporter__HexToRgb(rawValue);
        if (fromHex) return fromHex;
        var fromRgb  =  ValeSpec__PdfExporter__CssRgbToTriplet(rawValue);
        if (fromRgb) return fromRgb;
        return fallbackRgb;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Shared Colour Set from DocumentState Tokens
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__ResolveColours() {
        var DocumentState  =  window.ValeSpec__DocPreview__DocumentState;
        var styleTokens    =  (DocumentState && DocumentState.ValeSpec__DocumentState__GetStyleTokens)
                                ? DocumentState.ValeSpec__DocumentState__GetStyleTokens()
                                : {};

        return {
            brandPrimary  : ValeSpec__PdfExporter__ResolveColourToken(styleTokens.tableHeaderBg, COLOUR_BRAND_PRIMARY),
            tableHeaderBg : ValeSpec__PdfExporter__ResolveColourToken(styleTokens.tableHeaderBg, COLOUR_TABLE_HEADER_BG),
            tableHeaderFg : ValeSpec__PdfExporter__ResolveColourToken(styleTokens.tableHeaderFg, COLOUR_TABLE_HEADER_FG),
            tableAltRow   : ValeSpec__PdfExporter__ResolveColourToken(styleTokens.tableAltRowBg, COLOUR_TABLE_ALT_ROW),
            warningBg     : ValeSpec__PdfExporter__ResolveColourToken(styleTokens.warningBg, COLOUR_WARNING_BG),
            warningBorder : ValeSpec__PdfExporter__ResolveColourToken(styleTokens.warningBorder, COLOUR_WARNING_BORDER),
            warningTitle  : ValeSpec__PdfExporter__ResolveColourToken(styleTokens.warningTitle, COLOUR_WARNING_TITLE),
            warningText   : ValeSpec__PdfExporter__ResolveColourToken(styleTokens.warningText, COLOUR_WARNING_TEXT)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Current Model + View State + Style Tokens
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetRenderContext() {
        var DocumentState  =  window.ValeSpec__DocPreview__DocumentState;
        var DocumentModel  =  window.ValeSpec__DocPreview__DocumentModel;
        if (!DocumentState || !DocumentModel) return null;

        var viewState    =  DocumentState.ValeSpec__DocumentState__GetViewState();
        var styleTokens  =  DocumentState.ValeSpec__DocumentState__GetStyleTokens();
        var model        =  DocumentModel.ValeSpec__DocumentModel__Build(viewState);

        return {
            viewState   : viewState,
            styleTokens : styleTokens,
            model       : model
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Hardware Index from State
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetHardwareIndex() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return null;
        var state  =  StateManager.ValeSpec__StateManager__GetState();
        return state ? state.hardwareIndex : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Logo Path from App Config
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetLogoPath() {
        var fallbackLogoPath  =  '../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png';
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return fallbackLogoPath;
        var state    =  StateManager.ValeSpec__StateManager__GetState();
        var config   =  state.appConfig || {};
        var headerConfig  =  config['DocEditor__Header__Config'] || {};
        return headerConfig['DocEditor__Header__Config__LogoPath'] || fallbackLogoPath;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Date via DateFormatter
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__FormatDate(dateStr) {
        if (!dateStr) return '—';
        if (window.ValeSpec__AppUtils__DateFormatter) {
            return window.ValeSpec__AppUtils__DateFormatter.ValeSpec__DateFormatter__FormatShort(dateStr);
        }
        return dateStr;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Image and SVG
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Load Image as PNG Data URL
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__LoadImageAsDataUrl(imageSrc, widthPx, heightPx) {
        return new Promise(function(resolve) {
            if (!imageSrc) { resolve(null); return; }

            var image  =  new Image();
            image.crossOrigin  =  'anonymous';

            image.onload  =  function() {
                var canvas  =  document.createElement('canvas');
                canvas.width   =  widthPx  || image.naturalWidth;
                canvas.height  =  heightPx || image.naturalHeight;
                var ctx  =  canvas.getContext('2d');
                if (!ctx) { resolve(null); return; }
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
            };

            image.onerror  =  function() {
                resolve(null);
            };

            image.src  =  imageSrc;
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get SVG Aspect Ratio from Markup
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetSvgAspectRatio(svgMarkup) {
        if (!svgMarkup) return 1;
        var match  =  svgMarkup.match(/viewBox\s*=\s*"([^"]+)"/);
        if (!match) return 1;
        var parts  =  match[1].split(/\s+/);
        if (parts.length < 4) return 1;
        var vbW  =  parseFloat(parts[2]);
        var vbH  =  parseFloat(parts[3]);
        if (!vbW || !vbH) return 1;
        return vbW / vbH;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Rasterise SVG Markup to JPEG Data URL
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RasteriseSvg(svgMarkup, widthPx, heightPx, jpegQuality) {
        return new Promise(function(resolve) {
            if (!svgMarkup) { resolve(null); return; }

            var blob  =  new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
            var url   =  URL.createObjectURL(blob);
            var image =  new Image();

            image.onload  =  function() {
                var canvas  =  document.createElement('canvas');
                canvas.width   =  widthPx;
                canvas.height  =  heightPx;
                var ctx  =  canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    resolve(null);
                    return;
                }

                ctx.fillStyle =  '#ffffff';
                ctx.fillRect(0, 0, widthPx, heightPx);
                ctx.drawImage(image, 0, 0, widthPx, heightPx);

                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/jpeg', jpegQuality));
            };

            image.onerror  =  function() {
                URL.revokeObjectURL(url);
                resolve(null);
            };

            image.src  =  url;
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Measurement
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Compute Wrapped Row Height
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__MeasureWrappedRowHeight(doc, rowValues, columnWidths) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZE_TABLE_BODY);

        var maxLines  =  1;
        for (var c = 0; c < rowValues.length; c++) {
            var rawCellValue  =  rowValues[c] === null || rowValues[c] === undefined ? '' : String(rowValues[c]);
            var wrapWidth     =  Math.max(8, columnWidths[c] - 4);
            var lines         =  doc.splitTextToSize(rawCellValue, wrapWidth);
            if (lines.length > maxLines) maxLines  =  lines.length;
        }

        return Math.max(TABLE_ROW_MIN_HEIGHT_MM, 2 + (maxLines * TABLE_LINE_HEIGHT_MM));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Measure Table Total Height
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__MeasureTableHeight(doc, rows, columnWidths) {
        var total  =  TABLE_HEADER_HEIGHT_MM;
        for (var i = 0; i < rows.length; i++) {
            total += ValeSpec__PdfExporter__MeasureWrappedRowHeight(doc, rows[i], columnWidths);
        }
        return total;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Diagram Height by Mode
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetDiagramHeightByMode(diagramMode) {
        if (diagramMode === 'small') return DRAWING_HEIGHT_SMALL_MM;
        if (diagramMode === 'none') return 0;
        return DRAWING_HEIGHT_LARGE_MM;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Measure Warning Box Height
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__MeasureWarningBoxHeight(doc, row, contentWidth) {
        var titleLine  =  (row.assemblyTitle || 'N/A') + ' | ' + (row.warningTitle || 'Warning');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_WARNING_TITLE);
        var titleLines  =  doc.splitTextToSize(titleLine, contentWidth - (WARNING_BOX_PADDING_MM * 2));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZE_WARNING_BODY);
        var msgLines  =  doc.splitTextToSize(row.warningMessage || '', contentWidth - (WARNING_BOX_PADDING_MM * 2));

        return WARNING_BOX_PADDING_MM
             + (titleLines.length * WARNING_TITLE_HEIGHT_MM)
             + (msgLines.length * WARNING_LINE_HEIGHT_MM)
             + WARNING_BOX_PADDING_MM;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Measure Total PDF Height
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__MeasureTotalHeight(context, pdfConfig, colours, doc) {
        var model       =  context.model;
        var viewState   =  context.viewState;
        var contentW    =  pdfConfig.pageWidthMm - (pdfConfig.pagePaddingMm * 2);
        var cursorY     =  pdfConfig.pagePaddingMm;

        cursorY += BRANDING_LOGO_HEIGHT_MM + BRANDING_RULE_GAP_MM + BRANDING_BLOCK_BOTTOM_GAP_MM;

        if (viewState.showFullSchedule) {
            cursorY += SECTION_HEADING_HEIGHT_MM + SECTION_HEADING_BOTTOM_GAP_MM;

            if (!model.orderedAssemblies.length) {
                cursorY += TABLE_ROW_MIN_HEIGHT_MM + SECTION_BOTTOM_GAP_MM;
            } else {
                var diagramHeight  =  ValeSpec__PdfExporter__GetDiagramHeightByMode(viewState.diagramMode);
                for (var i = 0; i < model.orderedAssemblies.length; i++) {
                    var specRows       =  model.orderedAssemblies[i].specRows || [];
                    var specTableRows  =  [];
                    for (var s = 0; s < specRows.length; s++) {
                        var r  =  specRows[s] || {};
                        specTableRows.push([String(r.label || '—'), String(r.value === null || r.value === undefined || r.value === '' ? '—' : r.value)]);
                    }

                    var specColWidths  =  [contentW * 0.40, contentW * 0.60];
                    cursorY += ASSEMBLY_TITLE_HEIGHT_MM;
                    if (diagramHeight > 0) cursorY += diagramHeight + DRAWING_GAP_BELOW_MM;
                    cursorY += ValeSpec__PdfExporter__MeasureTableHeight(doc, specTableRows, specColWidths);
                    cursorY += ASSEMBLY_BLOCK_GAP_MM;
                }
            }

            cursorY += SECTION_BOTTOM_GAP_MM;
        }

        if (viewState.showSummary) {
            var summaryRows  =  model.summaryRows && model.summaryRows.length
                ? model.summaryRows.map(function(row) {
                    return [
                        String(row.itemName || 'N/A'),
                        String(row.detail || 'N/A'),
                        String(row.supplier || 'N/A'),
                        String(row.finish || 'N/A'),
                        String(row.totalQuantity || 'N/A')
                    ];
                })
                : [['N/A', 'N/A', 'N/A', 'N/A', 'N/A']];

            var summaryWidths  =  [contentW * 0.24, contentW * 0.26, contentW * 0.16, contentW * 0.16, contentW * 0.18];
            cursorY += SECTION_HEADING_HEIGHT_MM + SECTION_HEADING_BOTTOM_GAP_MM;
            cursorY += ValeSpec__PdfExporter__MeasureTableHeight(doc, summaryRows, summaryWidths);
            cursorY += SECTION_BOTTOM_GAP_MM;
        }

        if (model.warningRows && model.warningRows.length) {
            cursorY += SECTION_HEADING_HEIGHT_MM + SECTION_HEADING_BOTTOM_GAP_MM;
            for (var w = 0; w < model.warningRows.length; w++) {
                cursorY += ValeSpec__PdfExporter__MeasureWarningBoxHeight(doc, model.warningRows[w], contentW);
                cursorY += WARNING_BOX_GAP_MM;
            }
            cursorY += SECTION_BOTTOM_GAP_MM;
        }

        if (viewState.showJobNotes && model.jobNotes) {
            cursorY += SECTION_HEADING_HEIGHT_MM + SECTION_HEADING_BOTTOM_GAP_MM;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(FONT_SIZE_NOTES_BODY);
            var notesLines  =  doc.splitTextToSize(model.jobNotes, contentW);
            cursorY += notesLines.length * NOTES_LINE_HEIGHT_MM;
            cursorY += SECTION_BOTTOM_GAP_MM;
        }

        cursorY += pdfConfig.pagePaddingMm;
        return Math.max(cursorY, 120);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Render Branding Block
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderBranding(doc, meta, logoDataUrl, x, y, contentWidth, colours) {
        var cursorY  =  y;

        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', x, cursorY, BRANDING_LOGO_WIDTH_MM, BRANDING_LOGO_HEIGHT_MM);
            } catch (e) {
                console.warn('[ValeSpec__PdfExporter] Logo embed failed:', e);
            }
        }

        var textX  =  x + BRANDING_LOGO_WIDTH_MM + 4;
        var projectName  =  meta['ValeSpec__ProjectFile__Metadata__ProjectName'] || 'Untitled Project';
        var docName      =  meta['ValeSpec__ProjectFile__Metadata__DocumentName'] || 'Untitled Document';
        var revisionCode =  meta['ValeSpec__ProjectFile__Metadata__RevisionCode'] || '';
        var dateText     =  ValeSpec__PdfExporter__FormatDate(meta['ValeSpec__ProjectFile__Metadata__DateCreated']);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_PROJECT_NAME);
        doc.setTextColor(colours.brandPrimary[0], colours.brandPrimary[1], colours.brandPrimary[2]);
        doc.text(projectName, textX, cursorY + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZE_DOC_NAME);
        doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
        doc.text(revisionCode ? (docName + ' — Rev ' + revisionCode) : docName, textX, cursorY + 10);

        doc.setFontSize(FONT_SIZE_META_DATE);
        doc.text(dateText, x + contentWidth, cursorY + 5, { align: 'right' });

        cursorY += BRANDING_LOGO_HEIGHT_MM + BRANDING_RULE_GAP_MM;
        doc.setDrawColor(colours.brandPrimary[0], colours.brandPrimary[1], colours.brandPrimary[2]);
        doc.setLineWidth(LINE_WIDTH_MEDIUM_MM);
        doc.line(x, cursorY, x + contentWidth, cursorY);
        cursorY += BRANDING_BLOCK_BOTTOM_GAP_MM;

        return cursorY;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Section Heading
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderSectionHeading(doc, headingText, x, y, contentWidth, colours) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_SECTION_TITLE);
        doc.setTextColor(colours.brandPrimary[0], colours.brandPrimary[1], colours.brandPrimary[2]);
        doc.text(headingText, x, y + 4);

        var ruleY  =  y + SECTION_HEADING_HEIGHT_MM;
        doc.setDrawColor(colours.brandPrimary[0], colours.brandPrimary[1], colours.brandPrimary[2]);
        doc.setLineWidth(LINE_WIDTH_THIN_MM);
        doc.line(x, ruleY, x + contentWidth, ruleY);

        return ruleY + SECTION_HEADING_BOTTOM_GAP_MM;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Data Table
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderTable(doc, headerLabels, rows, columnWidths, x, y, colours) {
        var cursorY  =  y;
        var totalW   =  0;
        for (var i = 0; i < columnWidths.length; i++) totalW += columnWidths[i];

        doc.setFillColor(colours.tableHeaderBg[0], colours.tableHeaderBg[1], colours.tableHeaderBg[2]);
        doc.rect(x, cursorY, totalW, TABLE_HEADER_HEIGHT_MM, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_TABLE_HEADER);
        doc.setTextColor(colours.tableHeaderFg[0], colours.tableHeaderFg[1], colours.tableHeaderFg[2]);

        var runningX  =  x;
        for (var h = 0; h < headerLabels.length; h++) {
            doc.text(String(headerLabels[h] || ''), runningX + 2, cursorY + 4.5);
            runningX += columnWidths[h];
        }
        cursorY += TABLE_HEADER_HEIGHT_MM;

        for (var r = 0; r < rows.length; r++) {
            var row          =  rows[r] || [];
            var rowHeight    =  ValeSpec__PdfExporter__MeasureWrappedRowHeight(doc, row, columnWidths);

            if (r % 2 === 1) {
                doc.setFillColor(colours.tableAltRow[0], colours.tableAltRow[1], colours.tableAltRow[2]);
                doc.rect(x, cursorY, totalW, rowHeight, 'F');
            }

            doc.setDrawColor(COLOUR_BORDER_LIGHT[0], COLOUR_BORDER_LIGHT[1], COLOUR_BORDER_LIGHT[2]);
            doc.setLineWidth(LINE_WIDTH_THIN_MM);
            doc.line(x, cursorY + rowHeight, x + totalW, cursorY + rowHeight);

            runningX =  x;
            for (var c = 0; c < columnWidths.length; c++) {
                var cellText  =  row[c] === null || row[c] === undefined || row[c] === '' ? 'N/A' : String(row[c]);
                var wrapW     =  Math.max(8, columnWidths[c] - 4);
                var lines     =  doc.splitTextToSize(cellText, wrapW);

                if (c === 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
                } else {
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(COLOUR_TEXT_PRIMARY[0], COLOUR_TEXT_PRIMARY[1], COLOUR_TEXT_PRIMARY[2]);
                }

                doc.setFontSize(FONT_SIZE_TABLE_BODY);
                doc.text(lines, runningX + 2, cursorY + 4);
                runningX += columnWidths[c];
            }

            cursorY += rowHeight;
        }

        return cursorY;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render One Warning Box
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderWarningBox(doc, row, x, y, contentWidth, colours) {
        var titleText  =  (row.assemblyTitle || 'N/A') + ' | ' + (row.warningTitle || 'Warning');
        var bodyText   =  row.warningMessage || '';

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_WARNING_TITLE);
        var titleLines  =  doc.splitTextToSize(titleText, contentWidth - (WARNING_BOX_PADDING_MM * 2));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZE_WARNING_BODY);
        var bodyLines  =  doc.splitTextToSize(bodyText, contentWidth - (WARNING_BOX_PADDING_MM * 2));

        var boxHeight  =  WARNING_BOX_PADDING_MM
                       + (titleLines.length * WARNING_TITLE_HEIGHT_MM)
                       + (bodyLines.length * WARNING_LINE_HEIGHT_MM)
                       + WARNING_BOX_PADDING_MM;

        doc.setFillColor(colours.warningBg[0], colours.warningBg[1], colours.warningBg[2]);
        doc.setDrawColor(colours.warningBorder[0], colours.warningBorder[1], colours.warningBorder[2]);
        doc.setLineWidth(LINE_WIDTH_THIN_MM);
        doc.roundedRect(x, y, contentWidth, boxHeight, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZE_WARNING_TITLE);
        doc.setTextColor(colours.warningTitle[0], colours.warningTitle[1], colours.warningTitle[2]);
        doc.text(titleLines, x + WARNING_BOX_PADDING_MM, y + WARNING_BOX_PADDING_MM + 3.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZE_WARNING_BODY);
        doc.setTextColor(colours.warningText[0], colours.warningText[1], colours.warningText[2]);
        doc.text(bodyLines, x + WARNING_BOX_PADDING_MM, y + WARNING_BOX_PADDING_MM + (titleLines.length * WARNING_TITLE_HEIGHT_MM) + 2.5);

        return y + boxHeight;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Export Pipeline
// -----------------------------------------------------------------------------

    // FUNCTION | Export Current Document Preview as PDF
    // ------------------------------------------------------------
    async function ValeSpec__PdfExporter__Export() {
        var JsPDF  =  (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
        if (!JsPDF) {
            alert('PDF Export failed — jsPDF library not loaded.');
            return;
        }

        var context  =  ValeSpec__PdfExporter__GetRenderContext();
        if (!context) {
            alert('PDF Export failed — Document Preview context is unavailable.');
            return;
        }

        var pdfConfig    =  ValeSpec__PdfExporter__ResolvePdfConfig();
        var colours      =  ValeSpec__PdfExporter__ResolveColours();
        var model        =  context.model;
        var viewState    =  context.viewState;
        var styleTokens  =  context.styleTokens;
        var hardwareIdx  =  ValeSpec__PdfExporter__GetHardwareIndex();
        var logoPath     =  ValeSpec__PdfExporter__GetLogoPath();
        var paddingMm    =  pdfConfig.pagePaddingMm;
        var contentW     =  pdfConfig.pageWidthMm - (paddingMm * 2);

        var exportBtn  =  document.getElementById('ValeSpec__DocPreview__BtnExport');
        if (exportBtn) {
            exportBtn.disabled     =  true;
            exportBtn.textContent  =  'Generating PDF…';
        }

        try {
            // Measure pass
            // ------------------------------------------------------------
            var measureDoc  =  new JsPDF({
                orientation : 'portrait',
                unit        : 'mm',
                format      : [pdfConfig.pageWidthMm, 200],
                compress    : pdfConfig.compress
            });

            var totalHeight  =  ValeSpec__PdfExporter__MeasureTotalHeight(context, pdfConfig, colours, measureDoc);

            // Render pass
            // ------------------------------------------------------------
            var doc  =  new JsPDF({
                orientation    : 'portrait',
                unit           : 'mm',
                format         : [pdfConfig.pageWidthMm, totalHeight],
                compress       : pdfConfig.compress,
                floatPrecision : pdfConfig.floatPrecision
            });

            var cursorY  =  paddingMm;
            var cursorX  =  paddingMm;
            var logoDataUrl  =  await ValeSpec__PdfExporter__LoadImageAsDataUrl(logoPath, 220, 62);

            cursorY  =  ValeSpec__PdfExporter__RenderBranding(doc, model.metadata || {}, logoDataUrl, cursorX, cursorY, contentW, colours);

            // Section 01 | Full Ironmongery Schedule
            // ------------------------------------------------------------
            if (viewState.showFullSchedule) {
                cursorY  =  ValeSpec__PdfExporter__RenderSectionHeading(doc, styleTokens.sectionTitle01, cursorX, cursorY, contentW, colours);

                if (!model.orderedAssemblies.length) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(FONT_SIZE_TABLE_BODY);
                    doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
                    doc.text('No configured assemblies available.', cursorX, cursorY + 4);
                    cursorY += TABLE_ROW_MIN_HEIGHT_MM + SECTION_BOTTOM_GAP_MM;
                } else {
                    var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;
                    var targetDrawingH  =  ValeSpec__PdfExporter__GetDiagramHeightByMode(viewState.diagramMode);

                    for (var a = 0; a < model.orderedAssemblies.length; a++) {
                        var assemblyInfo  =  model.orderedAssemblies[a];
                        var assemblyData  =  assemblyInfo.assemblyData;

                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(FONT_SIZE_ASSEMBLY_TITLE);
                        doc.setTextColor(COLOUR_TEXT_PRIMARY[0], COLOUR_TEXT_PRIMARY[1], COLOUR_TEXT_PRIMARY[2]);
                        doc.text(assemblyInfo.title || 'Assembly', cursorX, cursorY + 4);
                        cursorY += ASSEMBLY_TITLE_HEIGHT_MM;

                        if (viewState.diagramMode !== 'none' && RenderPipeline) {
                            try {
                                var svgMarkup  =  null;
                                if (viewState.diagramMode === 'small') {
                                    svgMarkup  =  RenderPipeline.ValeSpec__RenderPipeline__RenderThumbnail(assemblyData, hardwareIdx, 420, 220);
                                } else {
                                    svgMarkup  =  RenderPipeline.ValeSpec__RenderPipeline__RenderThumbnail(assemblyData, hardwareIdx);
                                }

                                if (svgMarkup) {
                                    var aspect         =  ValeSpec__PdfExporter__GetSvgAspectRatio(svgMarkup);
                                    var drawWidthMm    =  contentW;
                                    var drawHeightMm   =  drawWidthMm / aspect;
                                    if (drawHeightMm > targetDrawingH) {
                                        drawHeightMm  =  targetDrawingH;
                                        drawWidthMm   =  drawHeightMm * aspect;
                                    }

                                    var pxPerMm  =  pdfConfig.targetDpi / 25.4;
                                    var rasterW  =  Math.max(1, Math.round(drawWidthMm * pxPerMm));
                                    var rasterH  =  Math.max(1, Math.round(drawHeightMm * pxPerMm));
                                    var jpegUrl  =  await ValeSpec__PdfExporter__RasteriseSvg(svgMarkup, rasterW, rasterH, pdfConfig.jpegQuality);

                                    if (jpegUrl) {
                                        var imgX  =  cursorX + ((contentW - drawWidthMm) / 2);
                                        doc.addImage(jpegUrl, 'JPEG', imgX, cursorY, drawWidthMm, drawHeightMm);
                                    }
                                }
                            } catch (drawErr) {
                                console.warn('[ValeSpec__PdfExporter] Drawing render failed for assembly index ' + a + ':', drawErr);
                            }

                            cursorY += targetDrawingH + DRAWING_GAP_BELOW_MM;
                        }

                        var specRows       =  assemblyInfo.specRows || [];
                        var specTableRows  =  [];
                        for (var sr = 0; sr < specRows.length; sr++) {
                            var specRow  =  specRows[sr] || {};
                            var label    =  specRow.label || '—';
                            var value    =  specRow.value;
                            if (value === null || value === undefined || value === '') value  =  '—';
                            specTableRows.push([String(label), String(value)]);
                        }

                        var specWidths  =  [contentW * 0.40, contentW * 0.60];
                        cursorY         =  ValeSpec__PdfExporter__RenderTable(
                                            doc,
                                            ['SPECIFICATION ITEM', 'DETAIL'],
                                            specTableRows,
                                            specWidths,
                                            cursorX,
                                            cursorY,
                                            colours
                                          );
                        cursorY += ASSEMBLY_BLOCK_GAP_MM;
                    }

                    cursorY += SECTION_BOTTOM_GAP_MM;
                }
            }

            // Section 02 | Summary
            // ------------------------------------------------------------
            if (viewState.showSummary) {
                cursorY  =  ValeSpec__PdfExporter__RenderSectionHeading(doc, styleTokens.sectionTitle02, cursorX, cursorY, contentW, colours);

                var summaryRows  =  model.summaryRows && model.summaryRows.length
                    ? model.summaryRows.map(function(row) {
                        return [
                            String(row.itemName || 'N/A'),
                            String(row.detail || 'N/A'),
                            String(row.supplier || 'N/A'),
                            String(row.finish || 'N/A'),
                            String(row.totalQuantity || 'N/A')
                        ];
                    })
                    : [['N/A', 'N/A', 'N/A', 'N/A', 'N/A']];

                var summaryWidths  =  [contentW * 0.24, contentW * 0.26, contentW * 0.16, contentW * 0.16, contentW * 0.18];
                cursorY            =  ValeSpec__PdfExporter__RenderTable(
                                        doc,
                                        ['SPECIFICATION ITEM', 'DETAIL', 'SUPPLIER', 'FINISH', 'TOTAL QTY'],
                                        summaryRows,
                                        summaryWidths,
                                        cursorX,
                                        cursorY,
                                        colours
                                      );
                cursorY += SECTION_BOTTOM_GAP_MM;
            }

            // Section 03 | Warnings
            // ------------------------------------------------------------
            if (model.warningRows && model.warningRows.length) {
                cursorY  =  ValeSpec__PdfExporter__RenderSectionHeading(doc, styleTokens.sectionTitle03, cursorX, cursorY, contentW, colours);

                for (var w = 0; w < model.warningRows.length; w++) {
                    cursorY  =  ValeSpec__PdfExporter__RenderWarningBox(doc, model.warningRows[w], cursorX, cursorY, contentW, colours);
                    cursorY += WARNING_BOX_GAP_MM;
                }

                cursorY += SECTION_BOTTOM_GAP_MM;
            }

            // Section 04 | Special Job Notes
            // ------------------------------------------------------------
            if (viewState.showJobNotes && model.jobNotes) {
                cursorY  =  ValeSpec__PdfExporter__RenderSectionHeading(doc, styleTokens.sectionTitle04, cursorX, cursorY, contentW, colours);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(FONT_SIZE_NOTES_BODY);
                doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
                var notesLines  =  doc.splitTextToSize(model.jobNotes, contentW);
                doc.text(notesLines, cursorX, cursorY + 3);
                cursorY += (notesLines.length * NOTES_LINE_HEIGHT_MM) + SECTION_BOTTOM_GAP_MM;
            }

            var projectName  =  (model.metadata && model.metadata['ValeSpec__ProjectFile__Metadata__ProjectName']) || 'ValeSpec_Document';
            var safeName     =  String(projectName).replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
            var filename     =  'ValeSpec__' + safeName + '__.pdf';
            doc.save(filename);

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
    // ------------------------------------------------------------

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__PdfExporter  =  ValeSpec__DocPreview__PdfExporter;
