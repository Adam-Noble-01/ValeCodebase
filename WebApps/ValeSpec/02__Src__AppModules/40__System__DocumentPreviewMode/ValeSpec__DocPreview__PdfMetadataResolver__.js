/* =============================================================================
   VALESPEC - DOCUMENT PREVIEW PDF METADATA RESOLVER
   =============================================================================

   FILE       : ValeSpec__DocPreview__PdfMetadataResolver__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocPreview - PdfMetadataResolver
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Resolve project metadata and map it into jsPDF document properties
   CREATED    : 16-Apr-2026

   DESCRIPTION:
   - Reads active project metadata from StateManager currentProject payload
   - Maps project metadata fields into a canonical metadata bundle for PDF use
   - Applies PDF document properties (title/subject/author/keywords/creator)
   - Applies PDF creation date when source metadata contains valid date values
   - Provides one consistent metadata source for filename and PDF properties

   ============================================================================= */

// =============================================================================
// REGION | PDF Metadata Resolver Module
// =============================================================================

const ValeSpec__DocPreview__PdfMetadataResolver = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Project Metadata Keys
    // ------------------------------------------------------------
    const METADATA_SECTION_KEY  =  'ValeSpec__ProjectFile__Metadata';
    const KEY_PROJECT_CODE      =  'ValeSpec__ProjectFile__Metadata__ProjectCode';
    const KEY_PROJECT_NAME      =  'ValeSpec__ProjectFile__Metadata__ProjectName';
    const KEY_DOCUMENT_NAME     =  'ValeSpec__ProjectFile__Metadata__DocumentName';
    const KEY_DOCUMENT_STATUS   =  'ValeSpec__ProjectFile__Metadata__DocumentStatus';
    const KEY_DATE_CREATED      =  'ValeSpec__ProjectFile__Metadata__DateCreated';
    const KEY_DATE_MODIFIED     =  'ValeSpec__ProjectFile__Metadata__DateModified';
    const KEY_DATE_ISSUED       =  'ValeSpec__ProjectFile__Metadata__DateIssued';
    const KEY_REVISION_CODE     =  'ValeSpec__ProjectFile__Metadata__RevisionCode';
    const KEY_AUTHOR            =  'ValeSpec__ProjectFile__Metadata__Author';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | PDF Metadata Defaults
    // ------------------------------------------------------------
    const FALLBACK_PROJECT_NAME   =  'Untitled Project';
    const FALLBACK_DOCUMENT_NAME  =  'Untitled Document';
    const FALLBACK_STATUS         =  'Draft';
    const FALLBACK_REVISION       =  'A';
    const FALLBACK_AUTHOR         =  'Unknown';
    const FALLBACK_CREATOR        =  'ValeSpec - Noble Architecture';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Data Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get Active Project Metadata from State
    // ------------------------------------------------------------
    function ValeSpec__PdfMetadataResolver__GetActiveProjectMetadata() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager || !StateManager.ValeSpec__StateManager__GetState) return {};

        var state    =  StateManager.ValeSpec__StateManager__GetState();
        var project  =  state ? state.currentProject : null;
        if (!project || typeof project !== 'object') return {};

        var metadata  =  project[METADATA_SECTION_KEY];
        if (!metadata || typeof metadata !== 'object') return {};

        return metadata;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get First Non-Empty String
    // ------------------------------------------------------------
    function ValeSpec__PdfMetadataResolver__FirstNonEmpty() {
        for (var i = 0; i < arguments.length; i++) {
            var value  =  arguments[i];
            if (typeof value === 'string' && value.trim()) return value.trim();
        }
        return '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse ISO Date String to Date
    // ------------------------------------------------------------
    function ValeSpec__PdfMetadataResolver__ParseDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return null;
        var parsedDate  =  new Date(dateString);
        if (isNaN(parsedDate.getTime())) return null;
        return parsedDate;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Metadata Mapping
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Project Metadata Bundle
    // ------------------------------------------------------------
    function ValeSpec__PdfMetadataResolver__BuildMetadataBundle(fallbackMetadata) {
        var stateMetadata     =  ValeSpec__PdfMetadataResolver__GetActiveProjectMetadata();
        var fallbackMeta      =  (fallbackMetadata && typeof fallbackMetadata === 'object') ? fallbackMetadata : {};
        var mergedMetadata    =  Object.assign({}, fallbackMeta, stateMetadata);

        var projectCode       =  ValeSpec__PdfMetadataResolver__FirstNonEmpty(mergedMetadata[KEY_PROJECT_CODE], '');
        var projectName       =  ValeSpec__PdfMetadataResolver__FirstNonEmpty(mergedMetadata[KEY_PROJECT_NAME], FALLBACK_PROJECT_NAME);
        var documentName      =  ValeSpec__PdfMetadataResolver__FirstNonEmpty(mergedMetadata[KEY_DOCUMENT_NAME], FALLBACK_DOCUMENT_NAME);
        var documentStatus    =  ValeSpec__PdfMetadataResolver__FirstNonEmpty(mergedMetadata[KEY_DOCUMENT_STATUS], FALLBACK_STATUS);
        var revisionCode      =  ValeSpec__PdfMetadataResolver__FirstNonEmpty(mergedMetadata[KEY_REVISION_CODE], FALLBACK_REVISION);
        var authorName        =  ValeSpec__PdfMetadataResolver__FirstNonEmpty(mergedMetadata[KEY_AUTHOR], FALLBACK_AUTHOR);
        var dateCreated       =  ValeSpec__PdfMetadataResolver__FirstNonEmpty(mergedMetadata[KEY_DATE_CREATED], '');
        var dateModified      =  ValeSpec__PdfMetadataResolver__FirstNonEmpty(mergedMetadata[KEY_DATE_MODIFIED], '');
        var dateIssued        =  ValeSpec__PdfMetadataResolver__FirstNonEmpty(mergedMetadata[KEY_DATE_ISSUED], '');
        var creationDateValue =  ValeSpec__PdfMetadataResolver__FirstNonEmpty(dateIssued, dateModified, dateCreated);

        var titleText    =  documentName + ' - ' + projectName;
        var subjectText  =  'Project ' + (projectCode || 'N/A') + ' | Revision ' + revisionCode + ' | Status ' + documentStatus;
        var keywordText  =  [
            'ValeSpec',
            'Ironmongery Schedule',
            projectCode || 'NoProjectCode',
            revisionCode,
            documentStatus
        ].join(', ');

        return {
            projectMetadata : {
                ValeSpec__ProjectFile__Metadata__ProjectCode    : projectCode,
                ValeSpec__ProjectFile__Metadata__ProjectName    : projectName,
                ValeSpec__ProjectFile__Metadata__DocumentName   : documentName,
                ValeSpec__ProjectFile__Metadata__DocumentStatus : documentStatus,
                ValeSpec__ProjectFile__Metadata__DateCreated    : dateCreated,
                ValeSpec__ProjectFile__Metadata__DateModified   : dateModified,
                ValeSpec__ProjectFile__Metadata__DateIssued     : dateIssued,
                ValeSpec__ProjectFile__Metadata__RevisionCode   : revisionCode,
                ValeSpec__ProjectFile__Metadata__Author         : authorName
            },
            pdfProperties  : {
                title    : titleText,
                subject  : subjectText,
                author   : authorName,
                keywords : keywordText,
                creator  : FALLBACK_CREATOR
            },
            creationDate   : creationDateValue
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve Metadata Bundle from Project JSON Metadata
    // ------------------------------------------------------------
    function ValeSpec__PdfMetadataResolver__ResolveMetadataBundle(fallbackMetadata) {
        return ValeSpec__PdfMetadataResolver__BuildMetadataBundle(fallbackMetadata);
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply Resolved Metadata Bundle to jsPDF Document
    // ------------------------------------------------------------
    function ValeSpec__PdfMetadataResolver__ApplyToPdfDocument(doc, fallbackMetadata) {
        if (!doc) return ValeSpec__PdfMetadataResolver__BuildMetadataBundle(fallbackMetadata);

        var bundle  =  ValeSpec__PdfMetadataResolver__BuildMetadataBundle(fallbackMetadata);

        if (typeof doc.setDocumentProperties === 'function') {
            doc.setDocumentProperties(bundle.pdfProperties);
        } else if (typeof doc.setProperties === 'function') {
            doc.setProperties(bundle.pdfProperties);
        }

        if (typeof doc.setCreationDate === 'function') {
            var parsedDate  =  ValeSpec__PdfMetadataResolver__ParseDate(bundle.creationDate);
            if (parsedDate) doc.setCreationDate(parsedDate);
        }

        return bundle;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__PdfMetadataResolver__ResolveMetadataBundle : ValeSpec__PdfMetadataResolver__ResolveMetadataBundle,
        ValeSpec__PdfMetadataResolver__ApplyToPdfDocument    : ValeSpec__PdfMetadataResolver__ApplyToPdfDocument
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__PdfMetadataResolver  =  ValeSpec__DocPreview__PdfMetadataResolver;
