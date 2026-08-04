/* =============================================================================
   VGHLANTERN - PDF DOCUMENT WRITER | METADATA
   =============================================================================

   FILE       : VghLantern__PdfWriter__Metadata__.js
   NAMESPACE  : VghLantern
   MODULE     : System - PdfDocumentWriter - Metadata
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Resolve every export filename and every embedded document property
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Resolves the filename pattern for both export routes and sanitises the result.
     One sanitiser, so a project name that is safe in one export cannot be unsafe in
     the other.
   - Builds the document properties jsPDF embeds in the file: title, subject, author,
     creator and keywords, for a drawing sheet and for a specification document.
   - Reads no DOM and writes no file. The writer applies whatever this returns.

   -----------------------------------------------------------------------------

   WHY TOKENS COME FROM THE TITLEBLOCK RESOLVER:
   The titleblock already resolves every project and lantern field a filename could
   want, and it is the resolver an issued drawing is proofread against. Reading the
   project file a second time here produced a filename that could disagree with the
   titleblock printed on the page it names. It also produced a real defect: the old
   resolver looked the lantern identity block up under the wrong key, so every
   {lanternTitle} token in a Preview and Send filename silently resolved to nothing.

   FILENAME PATTERN TOKENS:
   {projectCode} {projectName} {clientName} {client} {drawingNumber} {lanternTitle}
   {lanternRef} {revision} {status} {scale} {issueDate} {date} plus anything the
   caller supplies, such as {sheetSize}. An unresolved token collapses to an empty
   segment rather than printing literally, because a filename containing "{revision}"
   looks like a bug to whoever receives it.

   ============================================================================= */

// =============================================================================
// REGION | PDF Writer Metadata Module
// =============================================================================

const VghLantern__PdfWriter__Metadata = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Filename Sanitisation
    // ------------------------------------------------------------
    // Structural rules about what a filesystem accepts, not values a config file
    // could sensibly own.
    const UNSAFE_CHARS        =  /[^A-Za-z0-9_\-]+/g;                         // <-- Everything outside this set becomes a hyphen
    const COLLAPSE_SEPARATOR  =  /-{2,}/g;
    const COLLAPSE_UNDERSCORE =  /_{3,}/g;
    const TRIM_SEPARATOR      =  /^[-_]+|[-_]+$/g;
    const TOKEN_PATTERN       =  /\{(\w+)\}/g;
    const HAS_ALPHANUMERIC    =  /[A-Za-z0-9]/;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Drawing Editor PDF Export Config Block
    // ------------------------------------------------------------
    function VghLantern__PdfMetadata__DrawingPdfConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var drawingCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
        return drawingCfg['VghLantern__DrawingEditor__Config__PdfExport'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Document Preview PDF Config Block
    // ------------------------------------------------------------
    function VghLantern__PdfMetadata__DocumentPdfConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var docCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DocPreview') || {};
        return docCfg['VghLantern__DocPreview__Config__Pdf'] || {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Token Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Format Today as an ISO Date Segment
    // ------------------------------------------------------------
    function VghLantern__PdfMetadata__TodayIso() {
        var DateFormatter  =  window.VghLantern__AppUtils__DateFormatter;
        if (DateFormatter && DateFormatter.VghLantern__DateFormatter__FormatIso) {
            return DateFormatter.VghLantern__DateFormatter__FormatIso(new Date());
        }
        return '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Every Token a Filename or Property Can Use
    // ------------------------------------------------------------
    // extraTokens lets a caller add what only it knows, such as the sheet size the
    // drawing was actually written at.
    function VghLantern__PdfWriter__Metadata__ResolveTokens(project, lantern, extraTokens) {
        var TitleBlock  =  window.VghLantern__DrawingEditor__TitleBlockRenderer;

        var fields  =  TitleBlock
            ? TitleBlock.VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields(project, lantern)
            : {};

        var tokens  =  {
            projectCode   : fields.projectCode   || '',
            projectName   : fields.projectName   || '',
            clientName    : fields.clientName    || '',
            client        : fields.clientName    || '',                       // <-- Alias; older patterns were authored against {client}
            drawingNumber : fields.drawingNumber || '',
            lanternTitle  : fields.lanternTitle  || '',
            lanternRef    : fields.lanternRef    || '',
            revision      : fields.revision      || '',
            status        : fields.status        || '',
            scale         : fields.scale         || '',
            issueDate     : fields.issueDate     || '',
            date          : VghLantern__PdfMetadata__TodayIso()
        };

        return Object.assign(tokens, extraTokens || {});
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Filename Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Sanitise One Filename Segment
    // ------------------------------------------------------------
    function VghLantern__PdfWriter__Metadata__Sanitise(value) {
        return String(value === undefined || value === null ? '' : value)
            .trim()
            .replace(UNSAFE_CHARS, '-')
            .replace(COLLAPSE_SEPARATOR, '-')
            .replace(TRIM_SEPARATOR, '');
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Filename Pattern Against a Token Map
    // ------------------------------------------------------------
    // Returns the name with its .pdf extension, ready to hand to the writer. A
    // pattern whose tokens all resolved to nothing would leave a name of separators
    // only, which is worse than an honest generic name.
    function VghLantern__PdfWriter__Metadata__ResolveFilename(pattern, tokens) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var resolved  =  String(pattern || '').replace(TOKEN_PATTERN, function(match, tokenName) {
            return VghLantern__PdfWriter__Metadata__Sanitise(tokens ? tokens[tokenName] : '');
        });

        resolved  =  resolved.replace(COLLAPSE_SEPARATOR, '-').replace(COLLAPSE_UNDERSCORE, '__');

        if (!HAS_ALPHANUMERIC.test(resolved)) {
            var writerCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('PdfWriter') || {};
            resolved  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
                writerCfg['VghLantern__PdfWriter__Config__Document'] || {}, 'FallbackFilename',
                'Na__PdfWriter__Config.json -> VghLantern__PdfWriter__Config__Document');
        }

        return resolved + '.pdf';
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Drawing Sheet Export Filename
    // ------------------------------------------------------------
    function VghLantern__PdfWriter__Metadata__DrawingSheetFilename(project, lantern, sheetSizeKey, scaleDenominator) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pattern  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__PdfMetadata__DrawingPdfConfig(), 'FilenamePattern',
            'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__PdfExport');

        return VghLantern__PdfWriter__Metadata__ResolveFilename(pattern,
            VghLantern__PdfWriter__Metadata__ResolveTokens(project, lantern, {
                sheetSize : sheetSizeKey || '',
                scale     : String(scaleDenominator || '')
            }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Preview and Send Document Filename
    // ------------------------------------------------------------
    function VghLantern__PdfWriter__Metadata__DocumentFilename(project, lantern) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pattern  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__PdfMetadata__DocumentPdfConfig(), 'FilenamePattern',
            'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Pdf');

        return VghLantern__PdfWriter__Metadata__ResolveFilename(pattern,
            VghLantern__PdfWriter__Metadata__ResolveTokens(project, lantern, null));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Document Properties
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Properties for a Single Drawing Sheet
    // ------------------------------------------------------------
    // The paper size and the drawn scale are written into the file metadata as well
    // as into the page geometry, so anyone checking why a print measured short can
    // read the intended paper and scale straight out of the document properties.
    function VghLantern__PdfWriter__Metadata__DrawingSheetProperties(project, lantern, pageMeta, scaleLabel) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pdfCfg        =  VghLantern__PdfMetadata__DrawingPdfConfig();
        var PDF_LABEL     =  'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__PdfExport';
        var tokens        =  VghLantern__PdfWriter__Metadata__ResolveTokens(project, lantern, null);

        var sheetLabel  =  ((pageMeta.Label || pageMeta.SizeKey || '') + ' ' + (pageMeta.Orientation || '')).trim();
        var sizeLabel   =  pageMeta.WidthMm + 'mm x ' + pageMeta.HeightMm + 'mm';

        var titleParts  =  [];
        if (tokens.projectCode)   titleParts.push(tokens.projectCode);
        if (tokens.drawingNumber) titleParts.push(tokens.drawingNumber);
        titleParts.push('Roof Lantern Drawing');

        var keywords  =  ['roof lantern', 'Vale Garden Houses', sheetLabel, sizeLabel, scaleLabel || '']
            .filter(function(part) { return !!part; });

        return {
            Title    : titleParts.join(' - '),
            Subject  : 'Drawn at ' + (scaleLabel || 'the sheet scale') + ' on ' + sheetLabel +
                       ' (' + sizeLabel + '). Print at 100 percent with no page scaling for a true scale drawing.',
            Author   : ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'Author',  PDF_LABEL),
            Creator  : ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'Creator', PDF_LABEL),
            Keywords : keywords.join(', ')
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Properties for a Preview and Send Document
    // ------------------------------------------------------------
    function VghLantern__PdfWriter__Metadata__DocumentProperties(project, lantern) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pdfCfg        =  VghLantern__PdfMetadata__DocumentPdfConfig();
        var PDF_LABEL     =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Pdf';
        var tokens        =  VghLantern__PdfWriter__Metadata__ResolveTokens(project, lantern, null);

        var titleParts  =  [];
        if (tokens.projectCode) titleParts.push(tokens.projectCode);
        if (tokens.projectName) titleParts.push(tokens.projectName);
        titleParts.push('Roof Lantern Specification');

        var keywords  =  ['roof lantern', 'specification', 'Vale Garden Houses'];
        if (tokens.projectCode)  keywords.push(tokens.projectCode);
        if (tokens.lanternTitle) keywords.push(tokens.lanternTitle);

        return {
            Title    : titleParts.join(' - '),
            Subject  : tokens.clientName
                       ? ('Roof lantern specification for ' + tokens.clientName)
                       : 'Roof lantern specification',
            Author   : ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'DocumentAuthor', PDF_LABEL),
            Creator  : ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'PdfCreator',     PDF_LABEL),
            Keywords : keywords.join(', '),
            Revision : tokens.revision
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__PdfWriter__Metadata__ResolveTokens           : VghLantern__PdfWriter__Metadata__ResolveTokens,
        VghLantern__PdfWriter__Metadata__ResolveFilename         : VghLantern__PdfWriter__Metadata__ResolveFilename,
        VghLantern__PdfWriter__Metadata__Sanitise                : VghLantern__PdfWriter__Metadata__Sanitise,
        VghLantern__PdfWriter__Metadata__DrawingSheetFilename    : VghLantern__PdfWriter__Metadata__DrawingSheetFilename,
        VghLantern__PdfWriter__Metadata__DocumentFilename        : VghLantern__PdfWriter__Metadata__DocumentFilename,
        VghLantern__PdfWriter__Metadata__DrawingSheetProperties  : VghLantern__PdfWriter__Metadata__DrawingSheetProperties,
        VghLantern__PdfWriter__Metadata__DocumentProperties      : VghLantern__PdfWriter__Metadata__DocumentProperties
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__PdfWriter__Metadata  =  VghLantern__PdfWriter__Metadata;
