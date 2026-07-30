/* =============================================================================
   VGHLANTERN - DOCUMENT PREVIEW | PDF METADATA RESOLVER
   =============================================================================

   FILE       : VghLantern__DocPreview__PdfMetadataResolver__.js
   NAMESPACE  : VghLantern
   MODULE     : DocPreview - PdfMetadataResolver
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Resolve the PDF filename and embedded document properties
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Resolves the export filename from the configured pattern and the open project.
   - Resolves the PDF document properties (title, subject, author, keywords) that
     jsPDF writes into the file metadata.
   - Filename sanitisation happens here and nowhere else, so every export route
     produces the same safe name.

   -----------------------------------------------------------------------------

   FILENAME PATTERN TOKENS:
   {projectCode}  {projectName}  {lanternTitle}  {revision}  {date}
   Unresolved tokens collapse to an empty segment rather than printing literally,
   because a filename containing "{revision}" looks like a bug to the recipient.

   ============================================================================= */

// =============================================================================
// REGION | Document Preview PDF Metadata Resolver Module
// =============================================================================

const VghLantern__DocPreview__PdfMetadataResolver = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Defaults and Sanitisation
    // ------------------------------------------------------------
    const FALLBACK_PATTERN   =  'VghLantern__{projectCode}__{projectName}__RoofLanternSpecification';
    const FALLBACK_AUTHOR    =  'Vale Garden Houses Limited';
    const FALLBACK_CREATOR   =  'Vale Lantern Designer';

    const UNSAFE_CHARS       =  /[^A-Za-z0-9_\-]+/g;                           // <-- Everything outside this set becomes a hyphen
    const COLLAPSE_SEPARATOR =  /-{2,}/g;
    const TRIM_SEPARATOR     =  /^[-_]+|[-_]+$/g;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the PDF Config Block
    // ------------------------------------------------------------
    function VghLantern__PdfMetadata__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var docCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DocPreview') || {};
        return docCfg['VghLantern__DocPreview__Config__Pdf'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sanitise One Filename Segment
    // ------------------------------------------------------------
    function VghLantern__PdfMetadata__SanitiseSegment(value) {
        return String(value === undefined || value === null ? '' : value)
            .trim()
            .replace(UNSAFE_CHARS, '-')
            .replace(COLLAPSE_SEPARATOR, '-')
            .replace(TRIM_SEPARATOR, '');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Project Metadata Block
    // ------------------------------------------------------------
    function VghLantern__PdfMetadata__ProjectMeta() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var project  =  StateManager.VghLantern__StateManager__GetCurrentProject();
        if (!project) return {};

        return project['VghLantern__ProjectFile__Metadata'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Active Lantern Title
    // ------------------------------------------------------------
    function VghLantern__PdfMetadata__LanternTitle() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return '';

        var lantern  =  StateManager.VghLantern__StateManager__GetCurrentLantern();
        if (!lantern) return '';

        var identity  =  lantern['VghLantern__Lantern__Identity__Config'] || {};
        return identity['Lantern__Identity__Config__Title'] || '';
    }
    // ------------------------------------------------------------


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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Resolution
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Token Substitution Map
    // ------------------------------------------------------------
    function VghLantern__PdfMetadata__BuildTokens() {
        var meta  =  VghLantern__PdfMetadata__ProjectMeta();

        return {
            projectCode  : meta['VghLantern__ProjectFile__Metadata__ProjectCode']     || '',
            projectName  : meta['VghLantern__ProjectFile__Metadata__ProjectName']     || '',
            revision     : meta['VghLantern__ProjectFile__Metadata__RevisionCode']    || '',
            client       : meta['VghLantern__ProjectFile__Metadata__ClientName']      || '',
            lanternTitle : VghLantern__PdfMetadata__LanternTitle(),
            date         : VghLantern__PdfMetadata__TodayIso()
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Export Filename Without Extension
    // ------------------------------------------------------------
    function VghLantern__DocPreview__PdfMetadataResolver__ResolveFilename() {
        var pattern  =  VghLantern__PdfMetadata__Config().FilenamePattern || FALLBACK_PATTERN;
        var tokens   =  VghLantern__PdfMetadata__BuildTokens();

        var resolved  =  pattern.replace(/\{(\w+)\}/g, function(match, tokenName) {
            return VghLantern__PdfMetadata__SanitiseSegment(tokens[tokenName]);
        });

        // A pattern whose tokens all resolved to nothing would leave a name of
        // separators only, which is worse than an honest generic name.
        resolved  =  resolved.replace(COLLAPSE_SEPARATOR, '-').replace(/_{3,}/g, '__');
        if (!/[A-Za-z0-9]/.test(resolved)) resolved  =  'VghLantern__RoofLanternSpecification';

        return resolved;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Embedded PDF Document Properties
    // ------------------------------------------------------------
    function VghLantern__DocPreview__PdfMetadataResolver__ResolveProperties() {
        var tokens  =  VghLantern__PdfMetadata__BuildTokens();
        var config  =  VghLantern__PdfMetadata__Config();

        var titleParts  =  [];
        if (tokens.projectCode) titleParts.push(tokens.projectCode);
        if (tokens.projectName) titleParts.push(tokens.projectName);
        titleParts.push('Roof Lantern Specification');

        var keywords  =  ['roof lantern', 'specification', 'Vale Garden Houses'];
        if (tokens.projectCode) keywords.push(tokens.projectCode);
        if (tokens.lanternTitle) keywords.push(tokens.lanternTitle);

        return {
            Title    : titleParts.join(' - '),
            Subject  : tokens.client ? ('Roof lantern specification for ' + tokens.client) : 'Roof lantern specification',
            Author   : config.FooterText || FALLBACK_AUTHOR,
            Creator  : FALLBACK_CREATOR,
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
        VghLantern__DocPreview__PdfMetadataResolver__ResolveFilename   : VghLantern__DocPreview__PdfMetadataResolver__ResolveFilename,
        VghLantern__DocPreview__PdfMetadataResolver__ResolveProperties : VghLantern__DocPreview__PdfMetadataResolver__ResolveProperties
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__PdfMetadataResolver  =  VghLantern__DocPreview__PdfMetadataResolver;
