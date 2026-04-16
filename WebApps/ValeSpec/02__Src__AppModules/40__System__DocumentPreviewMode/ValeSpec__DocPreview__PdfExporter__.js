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
    const A4_PAGE_WIDTH_MM         =  210;
    const A4_PAGE_HEIGHT_MM        =  297;
    const FOOTER_RESERVED_HEIGHT_MM =  8;
    const FOOTER_FONT_SIZE_PT      =  8;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Branding Header Metrics (mm)
    // ------------------------------------------------------------
    const BRANDING_LOGO_WIDTH_MM          =  36;
    const BRANDING_LOGO_HEIGHT_MM         =  10;
    const BRANDING_PROJECT_NAME_PT        =  13;
    const BRANDING_PROJECT_CODE_PT        =  8;
    const BRANDING_DC_HEADER_PT           =  7;
    const BRANDING_DC_LABEL_PT            =  7;
    const BRANDING_DC_VALUE_PT            =  7.5;
    const BRANDING_DC_BOX_WIDTH_MM        =  100;
    const BRANDING_DC_ROW_HEIGHT_MM       =  5;
    const BRANDING_DC_HEADER_HEIGHT_MM    =  5.5;
    const BRANDING_DC_LABEL_WIDTH_MM      =  18;
    const BRANDING_DC_PADDING_H_MM        =  2.5;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Layout Metrics (mm)
    // ------------------------------------------------------------
    const BRANDING_RULE_GAP_MM            =  3;
    const BRANDING_BLOCK_BOTTOM_GAP_MM    =  6;
    const SECTION_HEADING_HEIGHT_MM       =  7;
    const SECTION_HEADING_BOTTOM_GAP_MM   =  4;
    const SECTION_BOTTOM_GAP_MM           =  16;
    const ASSEMBLY_TITLE_HEIGHT_MM        =  7;
    const ASSEMBLY_BLOCK_GAP_MM           =  8;
    const DRAWING_HEIGHT_LARGE_MM         =  80;
    const DRAWING_HEIGHT_SMALL_MM         =  40;
    const DRAWING_GAP_BELOW_MM            =  4;
    const TABLE_HEADER_HEIGHT_MM          =  7;
    const TABLE_ROW_MIN_HEIGHT_MM         =  6;
    const TABLE_LINE_HEIGHT_MM            =  3.5;
    const NOTES_LINE_HEIGHT_MM            =  4.5;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Stroke Widths (mm)
    // ------------------------------------------------------------
    const LINE_WIDTH_THIN_MM   =  0.15;
    const LINE_WIDTH_MEDIUM_MM =  0.30;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Font Sizes (pt)
    // ------------------------------------------------------------
    const FONT_SIZE_SECTION_TITLE  =  11;
    const FONT_SIZE_ASSEMBLY_TITLE =  10;
    const FONT_SIZE_TABLE_HEADER   =  8;
    const FONT_SIZE_TABLE_BODY     =  8;
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


    // MODULE VARIABLES | Active Font Family (set at export time)
    // ------------------------------------------------------------
    var ValeSpec__PdfExporter__ActiveFontFamily  =  'helvetica';
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


    // HELPER FUNCTION | Convert rgb()/rgba() String to RGB Triplet (alpha composited over white)
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__CssRgbToTriplet(rgbString) {
        if (typeof rgbString !== 'string') return null;
        var match  =  rgbString.match(/rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
        if (!match) return null;

        var r  =  Math.max(0, Math.min(255, parseFloat(match[1])));
        var g  =  Math.max(0, Math.min(255, parseFloat(match[2])));
        var b  =  Math.max(0, Math.min(255, parseFloat(match[3])));
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

        var a  =  match[4] !== undefined ? parseFloat(match[4]) : 1;
        if (isNaN(a)) a  =  1;
        a  =  Math.max(0, Math.min(1, a));

        if (a < 1) {
            r  =  Math.round(a * r + (1 - a) * 255);
            g  =  Math.round(a * g + (1 - a) * 255);
            b  =  Math.round(a * b + (1 - a) * 255);
        } else {
            r  =  Math.round(r);
            g  =  Math.round(g);
            b  =  Math.round(b);
        }

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
// REGION | Internal Helpers - Header Native Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch Image as Data URL via Blob (avoids canvas taint)
    // ------------------------------------------------------------
    async function ValeSpec__PdfExporter__FetchImageAsDataUrl(imageSrc) {
        if (!imageSrc || typeof imageSrc !== 'string') return null;
        if (imageSrc.startsWith('data:')) return imageSrc;

        try {
            var response  =  await fetch(imageSrc, { cache: 'force-cache' });
            if (!response.ok) return null;

            var blobData  =  await response.blob();
            if (!blobData || !blobData.size) return null;

            return await new Promise(function(resolve) {
                var reader  =  new FileReader();
                reader.onload   =  function() { resolve(typeof reader.result === 'string' ? reader.result : null); };
                reader.onerror  =  function() { resolve(null); };
                reader.readAsDataURL(blobData);
            });
        } catch (err) {
            console.warn('[ValeSpec__PdfExporter] Logo fetch failed:', err && err.message ? err.message : err);
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Logo Path from PageRenderer Config
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetLogoPath() {
        var fallbackLogoPath  =  '../assets__CommonApplicationAssets/AppLogo__ValeHeaderImage_ValeLogo_HorizontalFormat__.png';
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return fallbackLogoPath;
        var state         =  StateManager.ValeSpec__StateManager__GetState();
        var config        =  (state && state.appConfig) ? state.appConfig : {};
        var headerConfig  =  config['DocEditor__Header__Config'] || {};
        return headerConfig['DocEditor__Header__Config__LogoPath'] || fallbackLogoPath;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Status Badge Colour for PDF
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetStatusBadgeColour(statusText) {
        var s  =  String(statusText || '').toLowerCase().replace(/\s+/g, '');
        if (s === 'approved' || s === 'completed') return [42, 125, 79];
        if (s === 'inprogress')                    return [230, 168, 23];
        if (s === 'pending' || s === 'pendingapproval') return [214, 126, 40];
        return [211, 47, 47]; // Draft
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Branding Header Natively via jsPDF Drawing
    // ------------------------------------------------------------
    async function ValeSpec__PdfExporter__RenderBrandingNative(doc, metadata, x, y, contentWidth, colours) {
        var cursorY  =  y;

        // --- Logo Image ---
        var logoPath     =  ValeSpec__PdfExporter__GetLogoPath();
        var logoDataUrl  =  await ValeSpec__PdfExporter__FetchImageAsDataUrl(logoPath);
        var logoBottomY  =  cursorY;

        if (logoDataUrl) {
            try {
                var logoFormat  =  logoDataUrl.indexOf('image/svg') !== -1 ? 'SVG' : 'PNG';
                doc.addImage(logoDataUrl, logoFormat, x, cursorY, BRANDING_LOGO_WIDTH_MM, BRANDING_LOGO_HEIGHT_MM);
            } catch (logoErr) {
                console.warn('[ValeSpec__PdfExporter] Logo embed failed:', logoErr);
            }
            logoBottomY  =  cursorY + BRANDING_LOGO_HEIGHT_MM;
        }

        // --- Project Name + Code (below logo) ---
        var projectName  =  metadata['ValeSpec__ProjectFile__Metadata__ProjectName'] || 'Untitled Project';
        var projectCode  =  metadata['ValeSpec__ProjectFile__Metadata__ProjectCode'] || '—';

        var nameY  =  logoBottomY + 3;
        doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'bold');
        doc.setFontSize(BRANDING_PROJECT_NAME_PT);
        doc.setTextColor(colours.brandPrimary[0], colours.brandPrimary[1], colours.brandPrimary[2]);
        doc.text(projectName, x, nameY + 4);
        nameY += 6;

        doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'bold');
        doc.setFontSize(BRANDING_PROJECT_CODE_PT);
        doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
        doc.text('Project ' + projectCode, x, nameY + 2.5);
        nameY += 4;

        var leftBlockBottomY  =  nameY;

        // --- Document Control Box (right-aligned, 4-column: Label|Value|Label|Value) ---
        var dcBoxX   =  x + contentWidth - BRANDING_DC_BOX_WIDTH_MM;
        var dcBoxY   =  cursorY;
        var halfW    =  BRANDING_DC_BOX_WIDTH_MM / 2;
        var colWidths  =  [
            BRANDING_DC_LABEL_WIDTH_MM,
            halfW - BRANDING_DC_LABEL_WIDTH_MM,
            BRANDING_DC_LABEL_WIDTH_MM,
            halfW - BRANDING_DC_LABEL_WIDTH_MM
        ];

        // DC header bar
        doc.setFillColor(colours.brandPrimary[0], colours.brandPrimary[1], colours.brandPrimary[2]);
        doc.rect(dcBoxX, dcBoxY, BRANDING_DC_BOX_WIDTH_MM, BRANDING_DC_HEADER_HEIGHT_MM, 'F');
        doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'bold');
        doc.setFontSize(BRANDING_DC_HEADER_PT);
        doc.setTextColor(255, 255, 255);
        doc.text('DOCUMENT CONTROL', dcBoxX + BRANDING_DC_PADDING_H_MM, dcBoxY + 3.8);

        var dcRowY  =  dcBoxY + BRANDING_DC_HEADER_HEIGHT_MM;

        var docName       =  metadata['ValeSpec__ProjectFile__Metadata__DocumentName'] || 'Untitled Document';
        var revision      =  metadata['ValeSpec__ProjectFile__Metadata__RevisionCode'] || '—';
        var author        =  metadata['ValeSpec__ProjectFile__Metadata__Author'] || '—';
        var status        =  metadata['ValeSpec__ProjectFile__Metadata__DocumentStatus'] || 'Draft';
        var dateRevision  =  ValeSpec__PdfExporter__FormatDate(
                                metadata['ValeSpec__ProjectFile__Metadata__DateModified']
                                || metadata['ValeSpec__ProjectFile__Metadata__DateCreated']);
        var dateIssued    =  metadata['ValeSpec__ProjectFile__Metadata__DateIssued']
                                ? ValeSpec__PdfExporter__FormatDate(metadata['ValeSpec__ProjectFile__Metadata__DateIssued'])
                                : '—';

        var dcRows  =  [
            ['Document', docName,       'Revision', revision],
            ['Author',   author,        'Status',   status],
            ['Rev Date', dateRevision,  'Issued',   dateIssued]
        ];

        var textBaselineOffset  =  3.5;

        for (var r = 0; r < dcRows.length; r++) {
            var rowTop  =  dcRowY + (r * BRANDING_DC_ROW_HEIGHT_MM);

            // Horizontal row divider
            if (r < dcRows.length - 1) {
                doc.setDrawColor(COLOUR_BORDER_LIGHT[0], COLOUR_BORDER_LIGHT[1], COLOUR_BORDER_LIGHT[2]);
                doc.setLineWidth(0.1);
                doc.line(dcBoxX, rowTop + BRANDING_DC_ROW_HEIGHT_MM, dcBoxX + BRANDING_DC_BOX_WIDTH_MM, rowTop + BRANDING_DC_ROW_HEIGHT_MM);
            }

            var cellRunX  =  dcBoxX;
            for (var ci = 0; ci < 4; ci++) {
                var cellW     =  colWidths[ci];
                var isLabel   =  (ci === 0 || ci === 2);
                var cellText  =  dcRows[r][ci];

                if (isLabel) {
                    // Label cell background
                    doc.setFillColor(245, 245, 245);
                    doc.rect(cellRunX, rowTop, cellW, BRANDING_DC_ROW_HEIGHT_MM, 'F');

                    // Label right border
                    doc.setDrawColor(COLOUR_BORDER_LIGHT[0], COLOUR_BORDER_LIGHT[1], COLOUR_BORDER_LIGHT[2]);
                    doc.setLineWidth(0.1);
                    doc.line(cellRunX + cellW, rowTop, cellRunX + cellW, rowTop + BRANDING_DC_ROW_HEIGHT_MM);

                    doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'bold');
                    doc.setFontSize(BRANDING_DC_LABEL_PT);
                    doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
                    doc.text(cellText, cellRunX + BRANDING_DC_PADDING_H_MM, rowTop + textBaselineOffset);
                } else {
                    doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'normal');
                    doc.setFontSize(BRANDING_DC_VALUE_PT);

                    var labelKey  =  dcRows[r][ci - 1];
                    if (labelKey === 'Revision') {
                        doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'bold');
                        doc.setTextColor(colours.brandPrimary[0], colours.brandPrimary[1], colours.brandPrimary[2]);
                    } else if (labelKey === 'Status') {
                        var statusCol  =  ValeSpec__PdfExporter__GetStatusBadgeColour(cellText);
                        doc.setTextColor(statusCol[0], statusCol[1], statusCol[2]);
                        doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'bold');
                    } else {
                        doc.setTextColor(COLOUR_TEXT_PRIMARY[0], COLOUR_TEXT_PRIMARY[1], COLOUR_TEXT_PRIMARY[2]);
                    }

                    doc.text(cellText, cellRunX + BRANDING_DC_PADDING_H_MM, rowTop + textBaselineOffset);
                }

                cellRunX += cellW;
            }

            // Vertical divider between left and right column pairs
            doc.setDrawColor(COLOUR_BORDER_LIGHT[0], COLOUR_BORDER_LIGHT[1], COLOUR_BORDER_LIGHT[2]);
            doc.setLineWidth(0.1);
            doc.line(dcBoxX + halfW, rowTop, dcBoxX + halfW, rowTop + BRANDING_DC_ROW_HEIGHT_MM);
        }

        // DC outer border
        var dcTotalHeight  =  BRANDING_DC_HEADER_HEIGHT_MM + (dcRows.length * BRANDING_DC_ROW_HEIGHT_MM);
        doc.setDrawColor(COLOUR_BORDER_LIGHT[0], COLOUR_BORDER_LIGHT[1], COLOUR_BORDER_LIGHT[2]);
        doc.setLineWidth(0.15);
        doc.rect(dcBoxX, dcBoxY, BRANDING_DC_BOX_WIDTH_MM, dcTotalHeight);

        // --- Branding Divider Rule ---
        var blockBottom  =  Math.max(leftBlockBottomY, dcBoxY + dcTotalHeight);
        cursorY  =  blockBottom + BRANDING_RULE_GAP_MM;
        doc.setDrawColor(colours.brandPrimary[0], colours.brandPrimary[1], colours.brandPrimary[2]);
        doc.setLineWidth(LINE_WIDTH_MEDIUM_MM);
        doc.line(x, cursorY, x + contentWidth, cursorY);
        cursorY += BRANDING_BLOCK_BOTTOM_GAP_MM;

        return cursorY;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Font Embedding
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Font CDN Paths
    // ------------------------------------------------------------
    const FONT_URL_REGULAR   =  'https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/AD04_01_-_Standard-Font_-_Open-Sans-Regular.ttf';
    const FONT_URL_SEMIBOLD  =  'https://www.noble-architecture.com/assets/AD04_-_LIBR_-_Common_-_Front-Files/AD04_02_-_Standard-Font_-_Open-Sans-SemiBold.ttf';
    const FONT_FAMILY_NAME   =  'OpenSans';
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch TTF and Convert to Base64
    // ------------------------------------------------------------
    async function ValeSpec__PdfExporter__FetchFontAsBase64(fontUrl) {
        var response  =  await fetch(fontUrl, { cache: 'force-cache' });
        if (!response.ok) throw new Error('Font fetch failed: ' + response.status);
        var buffer   =  await response.arrayBuffer();
        var bytes    =  new Uint8Array(buffer);
        var binary   =  '';
        for (var i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    // ------------------------------------------------------------


    // FUNCTION | Load and Register Open Sans Fonts with jsPDF
    // ------------------------------------------------------------
    async function ValeSpec__PdfExporter__LoadAndRegisterFonts(doc) {
        try {
            var regularB64   =  await ValeSpec__PdfExporter__FetchFontAsBase64(FONT_URL_REGULAR);
            var semiboldB64  =  await ValeSpec__PdfExporter__FetchFontAsBase64(FONT_URL_SEMIBOLD);

            doc.addFileToVFS('OpenSans-Regular.ttf', regularB64);
            doc.addFont('OpenSans-Regular.ttf', FONT_FAMILY_NAME, 'normal');

            doc.addFileToVFS('OpenSans-SemiBold.ttf', semiboldB64);
            doc.addFont('OpenSans-SemiBold.ttf', FONT_FAMILY_NAME, 'bold');

            console.log('[ValeSpec__PdfExporter] Open Sans fonts registered.');
            return true;
        } catch (err) {
            console.warn('[ValeSpec__PdfExporter] Font embedding failed, falling back to Helvetica:', err.message);
            return false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Image and SVG
// -----------------------------------------------------------------------------

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
                try {
                    resolve(canvas.toDataURL('image/jpeg', jpegQuality));
                } catch (svgRasterErr) {
                    console.warn('[ValeSpec__PdfExporter] SVG rasterisation skipped (canvas tainted):', svgRasterErr && svgRasterErr.message ? svgRasterErr.message : svgRasterErr);
                    resolve(null);
                }
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
        doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'normal');
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


    // HELPER FUNCTION | Get Diagram Height by Mode
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__GetDiagramHeightByMode(diagramMode) {
        if (diagramMode === 'small') return DRAWING_HEIGHT_SMALL_MM;
        if (diagramMode === 'none') return 0;
        return DRAWING_HEIGHT_LARGE_MM;
    }
    // ------------------------------------------------------------


// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Pagination
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Page-Aware Pagination Context
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__CreatePaginationContext(doc, pageWidthMm, pageHeightMm, paddingMm) {
        var context  =  {
            doc          : doc,
            pageWidthMm  : pageWidthMm,
            pageHeightMm : pageHeightMm,
            paddingMm    : paddingMm,
            footerReserveMm : FOOTER_RESERVED_HEIGHT_MM,
            cursorY      : paddingMm
        };

        context.getPageBottomY  =  function() {
            return context.pageHeightMm - context.paddingMm - context.footerReserveMm;
        };

        context.startNewPage  =  function() {
            context.doc.addPage([context.pageWidthMm, context.pageHeightMm], 'portrait');
            context.cursorY  =  context.paddingMm;
            return context.cursorY;
        };

        context.ensureSpace  =  function(requiredHeightMm) {
            var required  =  Math.max(0, requiredHeightMm || 0);
            var bottomY   =  context.getPageBottomY();
            if ((context.cursorY + required) > bottomY) {
                var blankGap  =  bottomY - context.cursorY;
                if (blankGap > 20) {
                    var noticeY  =  context.cursorY + (blankGap / 2);
                    context.doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'normal');
                    context.doc.setFontSize(8);
                    context.doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
                    context.doc.text('Continued on next page...', context.pageWidthMm / 2, noticeY, { align: 'center' });
                }
                context.startNewPage();
            }
            return context.cursorY;
        };

        return context;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Zero-Padded Page Number Text
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__BuildPageNumberLabel(pageNo, pageTotal) {
        var left   =  String(pageNo || 0).padStart(2, '0');
        var right  =  String(pageTotal || 0).padStart(2, '0');
        return 'Page ' + left + ' of ' + right;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Footer Page Numbers
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderPageFooters(doc, pageWidthMm, pageHeightMm, paddingMm) {
        var pageTotal  =  (doc && typeof doc.getNumberOfPages === 'function') ? doc.getNumberOfPages() : 0;
        if (!pageTotal) return;

        for (var pageNo = 1; pageNo <= pageTotal; pageNo++) {
            doc.setPage(pageNo);
            doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'normal');
            doc.setFontSize(FOOTER_FONT_SIZE_PT);
            doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
            var label  =  ValeSpec__PdfExporter__BuildPageNumberLabel(pageNo, pageTotal);
            doc.text(label, pageWidthMm - paddingMm, pageHeightMm - 3, { align: 'right' });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Render Branding Block (delegates to native jsPDF drawing)
    // ------------------------------------------------------------
    async function ValeSpec__PdfExporter__RenderBranding(doc, metadata, x, y, contentWidth, colours) {
        return await ValeSpec__PdfExporter__RenderBrandingNative(doc, metadata, x, y, contentWidth, colours);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Section Heading
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderSectionHeading(doc, headingText, x, y, contentWidth, colours) {
        doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'bold');
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


    // HELPER FUNCTION | Render Data Table (moves whole table to next page if it fits a single page)
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderTable(doc, headerLabels, rows, columnWidths, x, y, colours, paginationCtx) {
        var cursorY  =  y;
        var totalW   =  0;
        for (var i = 0; i < columnWidths.length; i++) totalW += columnWidths[i];

        // Pre-measure total table height to decide page placement
        var totalTableH  =  TABLE_HEADER_HEIGHT_MM;
        for (var m = 0; m < rows.length; m++) {
            totalTableH += ValeSpec__PdfExporter__MeasureWrappedRowHeight(doc, rows[m] || [], columnWidths);
        }

        if (paginationCtx) {
            var pageContentH  =  paginationCtx.getPageBottomY() - paginationCtx.paddingMm;
            var remainingH    =  paginationCtx.getPageBottomY() - cursorY;

            // If table fits on a single page but not in remaining space, move it to the next page
            if (totalTableH <= pageContentH && totalTableH > remainingH) {
                paginationCtx.startNewPage();
                cursorY  =  paginationCtx.cursorY;
            }
        }

        function renderHeader() {
            doc.setFillColor(colours.tableHeaderBg[0], colours.tableHeaderBg[1], colours.tableHeaderBg[2]);
            doc.rect(x, cursorY, totalW, TABLE_HEADER_HEIGHT_MM, 'F');
            doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'bold');
            doc.setFontSize(FONT_SIZE_TABLE_HEADER);
            doc.setTextColor(colours.tableHeaderFg[0], colours.tableHeaderFg[1], colours.tableHeaderFg[2]);

            var runningXHeader  =  x;
            for (var hh = 0; hh < headerLabels.length; hh++) {
                doc.text(String(headerLabels[hh] || ''), runningXHeader + 2, cursorY + 4.5);
                runningXHeader += columnWidths[hh];
            }

            cursorY += TABLE_HEADER_HEIGHT_MM;
            if (paginationCtx) paginationCtx.cursorY  =  cursorY;
        }

        renderHeader();

        for (var r = 0; r < rows.length; r++) {
            var row          =  rows[r] || [];
            var rowHeight    =  ValeSpec__PdfExporter__MeasureWrappedRowHeight(doc, row, columnWidths);

            // Only split across pages if the table is genuinely larger than one page
            if (paginationCtx && totalTableH > (paginationCtx.getPageBottomY() - paginationCtx.paddingMm)) {
                paginationCtx.cursorY  =  cursorY;
                paginationCtx.ensureSpace(rowHeight);
                if (paginationCtx.cursorY !== cursorY) {
                    cursorY  =  paginationCtx.cursorY;
                    renderHeader();
                }
            }

            if (r % 2 === 1) {
                doc.setFillColor(colours.tableAltRow[0], colours.tableAltRow[1], colours.tableAltRow[2]);
                doc.rect(x, cursorY, totalW, rowHeight, 'F');
            }

            doc.setDrawColor(COLOUR_BORDER_LIGHT[0], COLOUR_BORDER_LIGHT[1], COLOUR_BORDER_LIGHT[2]);
            doc.setLineWidth(LINE_WIDTH_THIN_MM);
            doc.line(x, cursorY + rowHeight, x + totalW, cursorY + rowHeight);

            var runningX  =  x;
            for (var c = 0; c < columnWidths.length; c++) {
                var cellText  =  row[c] === null || row[c] === undefined || row[c] === '' ? 'N/A' : String(row[c]);
                var wrapW     =  Math.max(8, columnWidths[c] - 4);
                var lines     =  doc.splitTextToSize(cellText, wrapW);

                if (c === 0) {
                    doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'bold');
                    doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
                } else {
                    doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'normal');
                    doc.setTextColor(COLOUR_TEXT_PRIMARY[0], COLOUR_TEXT_PRIMARY[1], COLOUR_TEXT_PRIMARY[2]);
                }

                doc.setFontSize(FONT_SIZE_TABLE_BODY);
                doc.text(lines, runningX + 2, cursorY + 4);
                runningX += columnWidths[c];
            }

            cursorY += rowHeight;
            if (paginationCtx) paginationCtx.cursorY  =  cursorY;
        }

        return cursorY;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render Warnings Table (red-text style, moves whole table to next page if it fits)
    // ------------------------------------------------------------
    function ValeSpec__PdfExporter__RenderWarningsTable(doc, headerLabels, rows, columnWidths, x, y, colours, paginationCtx) {
        var cursorY  =  y;
        var totalW   =  0;
        for (var i = 0; i < columnWidths.length; i++) totalW += columnWidths[i];

        var warnBg      =  colours.warningBg;
        var warnBorder  =  colours.warningBorder;
        var warnTitle   =  colours.warningTitle;
        var warnText    =  colours.warningText;

        // Pre-measure total table height
        var estimatedTableH  =  TABLE_HEADER_HEIGHT_MM + 2;
        for (var m = 0; m < rows.length; m++) {
            estimatedTableH += ValeSpec__PdfExporter__MeasureWrappedRowHeight(doc, rows[m] || [], columnWidths);
        }

        // Move whole table to next page if it fits a single page but not remaining space
        if (paginationCtx) {
            var pageContentH  =  paginationCtx.getPageBottomY() - paginationCtx.paddingMm;
            var remainingH    =  paginationCtx.getPageBottomY() - cursorY;
            if (estimatedTableH <= pageContentH && estimatedTableH > remainingH) {
                paginationCtx.startNewPage();
                cursorY  =  paginationCtx.cursorY;
            }
        }

        // Outer container background
        doc.setFillColor(warnBg[0], warnBg[1], warnBg[2]);
        doc.setDrawColor(warnBorder[0], warnBorder[1], warnBorder[2]);
        doc.setLineWidth(LINE_WIDTH_THIN_MM);
        doc.roundedRect(x, cursorY, totalW, estimatedTableH, 1, 1, 'FD');

        cursorY += 1;

        function renderWarningHeader() {
            doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'bold');
            doc.setFontSize(FONT_SIZE_TABLE_HEADER);
            doc.setTextColor(warnTitle[0], warnTitle[1], warnTitle[2]);

            var runningXH  =  x;
            for (var hh = 0; hh < headerLabels.length; hh++) {
                doc.text(String(headerLabels[hh] || ''), runningXH + 2, cursorY + 4.5);
                runningXH += columnWidths[hh];
            }

            doc.setDrawColor(warnBorder[0], warnBorder[1], warnBorder[2]);
            doc.setLineWidth(LINE_WIDTH_THIN_MM);
            doc.line(x, cursorY + TABLE_HEADER_HEIGHT_MM, x + totalW, cursorY + TABLE_HEADER_HEIGHT_MM);

            cursorY += TABLE_HEADER_HEIGHT_MM;
            if (paginationCtx) paginationCtx.cursorY  =  cursorY;
        }

        renderWarningHeader();

        for (var r = 0; r < rows.length; r++) {
            var row          =  rows[r] || [];
            var rowHeight    =  ValeSpec__PdfExporter__MeasureWrappedRowHeight(doc, row, columnWidths);

            if (r < rows.length - 1) {
                doc.setDrawColor(211, 47, 47);
                doc.setLineWidth(LINE_WIDTH_THIN_MM);
                doc.line(x, cursorY + rowHeight, x + totalW, cursorY + rowHeight);
            }

            var runningX  =  x;
            doc.setFontSize(FONT_SIZE_TABLE_BODY);
            doc.setTextColor(warnText[0], warnText[1], warnText[2]);

            for (var c = 0; c < columnWidths.length; c++) {
                var cellText  =  row[c] === null || row[c] === undefined || row[c] === '' ? '' : String(row[c]);
                var wrapW     =  Math.max(8, columnWidths[c] - 4);
                var lines     =  doc.splitTextToSize(cellText, wrapW);

                if (c === 0) {
                    doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'bold');
                } else {
                    doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'normal');
                }

                doc.text(lines, runningX + 2, cursorY + 4);
                runningX += columnWidths[c];
            }

            cursorY += rowHeight;
            if (paginationCtx) paginationCtx.cursorY  =  cursorY;
        }

        cursorY += 1;
        return cursorY;
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

        var DocIssueHandler  =  window.ValeSpec__DocPreview__DocIssueHandler;
        if (DocIssueHandler && DocIssueHandler.ValeSpec__DocIssueHandler__StampIssuedDate) {
            DocIssueHandler.ValeSpec__DocIssueHandler__StampIssuedDate(); // <-- Stamp before model build so PDF includes issued date
            var PageRenderer  =  window.ValeSpec__DocPreview__PageRenderer;
            if (PageRenderer && PageRenderer.ValeSpec__PageRenderer__Render) {
                PageRenderer.ValeSpec__PageRenderer__Render(); // <-- Refresh viewer header date immediately
            }
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
        var metadata     =  model.metadata || {};
        var pageWidthMm  =  A4_PAGE_WIDTH_MM;
        var pageHeightMm =  A4_PAGE_HEIGHT_MM;
        var paddingMm    =  pdfConfig.pagePaddingMm;
        var contentW     =  pageWidthMm - (paddingMm * 2);

        var exportBtn  =  document.getElementById('ValeSpec__DocPreview__BtnExport');
        if (exportBtn) {
            exportBtn.disabled     =  true;
            exportBtn.textContent  =  'Generating PDF…';
        }

        try {
            // Render pass (fixed A4)
            // ------------------------------------------------------------
            var doc  =  new JsPDF({
                orientation    : 'portrait',
                unit           : 'mm',
                format         : [pageWidthMm, pageHeightMm],
                compress       : pdfConfig.compress,
                floatPrecision : pdfConfig.floatPrecision
            });

            var MetadataResolver  =  window.ValeSpec__DocPreview__PdfMetadataResolver;
            if (MetadataResolver && MetadataResolver.ValeSpec__PdfMetadataResolver__ApplyToPdfDocument) {
                var metadataBundle  =  MetadataResolver.ValeSpec__PdfMetadataResolver__ApplyToPdfDocument(doc, metadata);
                if (metadataBundle && metadataBundle.projectMetadata) {
                    metadata  =  metadataBundle.projectMetadata;
                }
            }

            var fontsLoaded  =  await ValeSpec__PdfExporter__LoadAndRegisterFonts(doc);
            ValeSpec__PdfExporter__ActiveFontFamily  =  fontsLoaded ? FONT_FAMILY_NAME : 'helvetica';

            var paginationCtx  =  ValeSpec__PdfExporter__CreatePaginationContext(doc, pageWidthMm, pageHeightMm, paddingMm);
            var cursorX  =  paddingMm;
            var cursorY  =  paginationCtx.cursorY;

            cursorY  =  await ValeSpec__PdfExporter__RenderBranding(doc, metadata, cursorX, cursorY, contentW, colours);
            paginationCtx.cursorY  =  cursorY;

            // Section 01 | Ironmongery Schedule Summary & Totals
            // ------------------------------------------------------------
            if (viewState.showSummary) {
                var summaryRows  =  model.summaryRows && model.summaryRows.length
                    ? model.summaryRows.map(function(row) {
                        return [
                            String(row.itemName || 'N/A'),
                            String(row.supplier || 'N/A'),
                            String(row.finish || 'N/A'),
                            String(row.totalQuantity || 'N/A')
                        ];
                    })
                    : [['N/A', 'N/A', 'N/A', 'N/A']];

                var summaryWidths   =  [contentW * 0.34, contentW * 0.22, contentW * 0.22, contentW * 0.22];
                var summaryHeadingH =  SECTION_HEADING_HEIGHT_MM + SECTION_HEADING_BOTTOM_GAP_MM;
                var summaryTableH   =  TABLE_HEADER_HEIGHT_MM;
                for (var sm = 0; sm < summaryRows.length; sm++) {
                    summaryTableH += ValeSpec__PdfExporter__MeasureWrappedRowHeight(doc, summaryRows[sm], summaryWidths);
                }

                paginationCtx.ensureSpace(summaryHeadingH + summaryTableH);
                cursorY  =  paginationCtx.cursorY;
                cursorY  =  ValeSpec__PdfExporter__RenderSectionHeading(doc, styleTokens.sectionTitle01, cursorX, cursorY, contentW, colours);
                paginationCtx.cursorY  =  cursorY;

                cursorY            =  ValeSpec__PdfExporter__RenderTable(
                                        doc,
                                        ['SPECIFICATION ITEM', 'SUPPLIER', 'FINISH', 'TOTAL QTY'],
                                        summaryRows,
                                        summaryWidths,
                                        cursorX,
                                        cursorY,
                                        colours,
                                        paginationCtx
                                      );
                cursorY += SECTION_BOTTOM_GAP_MM;
                paginationCtx.cursorY  =  cursorY;
            }

            // Section 02 | Warnings Section
            // ------------------------------------------------------------
            if (model.warningRows && model.warningRows.length) {

                var warningTableRows  =  [];
                for (var w = 0; w < model.warningRows.length; w++) {
                    var wRow  =  model.warningRows[w] || {};
                    warningTableRows.push([
                        String(wRow.assemblyTitle || 'N/A'),
                        String(wRow.warningTitle  || 'Warning'),
                        String(wRow.warningMessage || '')
                    ]);
                }

                var warningWidths    =  [contentW * 0.25, contentW * 0.20, contentW * 0.55];
                var warnHeadingH     =  SECTION_HEADING_HEIGHT_MM + SECTION_HEADING_BOTTOM_GAP_MM;
                var warnTableH       =  TABLE_HEADER_HEIGHT_MM + 2;
                for (var wm = 0; wm < warningTableRows.length; wm++) {
                    warnTableH += ValeSpec__PdfExporter__MeasureWrappedRowHeight(doc, warningTableRows[wm], warningWidths);
                }

                paginationCtx.ensureSpace(warnHeadingH + warnTableH);
                cursorY  =  paginationCtx.cursorY;
                cursorY  =  ValeSpec__PdfExporter__RenderSectionHeading(doc, styleTokens.sectionTitle02, cursorX, cursorY, contentW, colours);
                paginationCtx.cursorY  =  cursorY;

                cursorY  =  ValeSpec__PdfExporter__RenderWarningsTable(
                                doc,
                                ['Assembly', 'Warning', 'Message'],
                                warningTableRows,
                                warningWidths,
                                cursorX,
                                cursorY,
                                colours,
                                paginationCtx
                            );
                cursorY += SECTION_BOTTOM_GAP_MM;
                paginationCtx.cursorY  =  cursorY;
            }

            // Section 03 | Full Ironmongery Schedule Per Assembly
            // ------------------------------------------------------------
            if (viewState.showFullSchedule) {
                var scheduleHeadingH  =  SECTION_HEADING_HEIGHT_MM + SECTION_HEADING_BOTTOM_GAP_MM;
                var scheduleFirstBlockH  =  ASSEMBLY_TITLE_HEIGHT_MM + TABLE_HEADER_HEIGHT_MM + TABLE_ROW_MIN_HEIGHT_MM + ASSEMBLY_BLOCK_GAP_MM;

                if (!model.orderedAssemblies.length) {
                    paginationCtx.ensureSpace(scheduleHeadingH + TABLE_ROW_MIN_HEIGHT_MM);
                    cursorY  =  paginationCtx.cursorY;
                    cursorY  =  ValeSpec__PdfExporter__RenderSectionHeading(doc, styleTokens.sectionTitle03, cursorX, cursorY, contentW, colours);
                    paginationCtx.cursorY  =  cursorY;
                    doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'normal');
                    doc.setFontSize(FONT_SIZE_TABLE_BODY);
                    doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
                    doc.text('No configured assemblies available.', cursorX, cursorY + 4);
                    cursorY += TABLE_ROW_MIN_HEIGHT_MM + SECTION_BOTTOM_GAP_MM;
                    paginationCtx.cursorY  =  cursorY;
                } else {
                    var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;
                    var targetDrawingH  =  ValeSpec__PdfExporter__GetDiagramHeightByMode(viewState.diagramMode);

                    for (var a = 0; a < model.orderedAssemblies.length; a++) {
                        var assemblyInfo  =  model.orderedAssemblies[a];
                        var assemblyData  =  assemblyInfo.assemblyData;

                        // Pre-build spec rows so we can measure full height accurately
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

                        // Measure actual full assembly block height
                        var fullAssemblyH  =  ASSEMBLY_TITLE_HEIGHT_MM + TABLE_HEADER_HEIGHT_MM + ASSEMBLY_BLOCK_GAP_MM;
                        if (viewState.diagramMode !== 'none') {
                            fullAssemblyH += targetDrawingH + DRAWING_GAP_BELOW_MM;
                        }
                        for (var rm = 0; rm < specTableRows.length; rm++) {
                            fullAssemblyH += ValeSpec__PdfExporter__MeasureWrappedRowHeight(doc, specTableRows[rm], specWidths);
                        }

                        // Ensure heading + first assembly move together; others just check their own height
                        var requiredH  =  (a === 0) ? (scheduleHeadingH + fullAssemblyH) : fullAssemblyH;
                        var pageContentH  =  paginationCtx.getPageBottomY() - paginationCtx.paddingMm;

                        // If the block fits on a page but not in remaining space, move everything
                        if (requiredH <= pageContentH) {
                            paginationCtx.ensureSpace(requiredH);
                            cursorY  =  paginationCtx.cursorY;
                        }

                        // Render section heading for first assembly
                        if (a === 0) {
                            cursorY  =  ValeSpec__PdfExporter__RenderSectionHeading(doc, styleTokens.sectionTitle03, cursorX, cursorY, contentW, colours);
                            paginationCtx.cursorY  =  cursorY;
                        }

                        doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'bold');
                        doc.setFontSize(FONT_SIZE_ASSEMBLY_TITLE);
                        doc.setTextColor(COLOUR_TEXT_PRIMARY[0], COLOUR_TEXT_PRIMARY[1], COLOUR_TEXT_PRIMARY[2]);
                        doc.text(assemblyInfo.title || 'Assembly', cursorX, cursorY + 4);
                        cursorY += ASSEMBLY_TITLE_HEIGHT_MM;
                        paginationCtx.cursorY  =  cursorY;

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
                            paginationCtx.cursorY  =  cursorY;
                        }

                        cursorY         =  ValeSpec__PdfExporter__RenderTable(
                                            doc,
                                            ['SPECIFICATION ITEM', 'DETAIL'],
                                            specTableRows,
                                            specWidths,
                                            cursorX,
                                            cursorY,
                                            colours,
                                            paginationCtx
                                          );
                        cursorY += ASSEMBLY_BLOCK_GAP_MM;
                        paginationCtx.cursorY  =  cursorY;
                    }

                    cursorY += SECTION_BOTTOM_GAP_MM;
                    paginationCtx.cursorY  =  cursorY;
                }
            }

            // Section 04 | Special Job Notes
            // ------------------------------------------------------------
            if (viewState.showJobNotes && model.jobNotes) {
                paginationCtx.ensureSpace(SECTION_HEADING_HEIGHT_MM + SECTION_HEADING_BOTTOM_GAP_MM + NOTES_LINE_HEIGHT_MM);
                cursorY  =  paginationCtx.cursorY;
                cursorY  =  ValeSpec__PdfExporter__RenderSectionHeading(doc, styleTokens.sectionTitle04, cursorX, cursorY, contentW, colours);
                paginationCtx.cursorY  =  cursorY;

                doc.setFont(ValeSpec__PdfExporter__ActiveFontFamily, 'normal');
                doc.setFontSize(FONT_SIZE_NOTES_BODY);
                doc.setTextColor(COLOUR_TEXT_SECONDARY[0], COLOUR_TEXT_SECONDARY[1], COLOUR_TEXT_SECONDARY[2]);
                var notesLines  =  doc.splitTextToSize(model.jobNotes, contentW);

                var noteLineCursor  =  0;
                while (noteLineCursor < notesLines.length) {
                    var availableHeightMm  =  paginationCtx.getPageBottomY() - cursorY;
                    var availableLines     =  Math.floor(Math.max(0, availableHeightMm - 2) / NOTES_LINE_HEIGHT_MM);

                    if (availableLines < 1) {
                        paginationCtx.startNewPage();
                        cursorY  =  paginationCtx.cursorY;
                        continue;
                    }

                    var nextLineCursor  =  Math.min(notesLines.length, noteLineCursor + availableLines);
                    var lineChunk       =  notesLines.slice(noteLineCursor, nextLineCursor);
                    doc.text(lineChunk, cursorX, cursorY + 3);
                    cursorY += lineChunk.length * NOTES_LINE_HEIGHT_MM;
                    paginationCtx.cursorY  =  cursorY;
                    noteLineCursor         =  nextLineCursor;
                }

                cursorY += SECTION_BOTTOM_GAP_MM;
                paginationCtx.cursorY  =  cursorY;
            }

            ValeSpec__PdfExporter__RenderPageFooters(doc, pageWidthMm, pageHeightMm, paddingMm);

            var projectName  =  metadata['ValeSpec__ProjectFile__Metadata__ProjectName'] || 'ValeSpec_Document';
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
