/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | TITLE BLOCK RENDERER
   =============================================================================

   FILE       : VghLantern__DrawingEditor__TitleBlockRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - TitleBlockRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Resolve every titleblock field value from the project and the lantern
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Resolves the titleblock fields from the project metadata, the active lantern and
     the scale manager, and returns them as a flat key-to-string map.
   - Draws nothing. SheetChrome lays the titleblock out and paints it onto both the
     screen sheet and the PDF from one description; this module only decides what the
     values are.
   - Field rows, widths, label copy and the logo are all configuration.

   -----------------------------------------------------------------------------

   WHY THIS MODULE NO LONGER RENDERS:
   It used to emit an HTML titleblock as well, which only Preview and Send used, while
   the sheet and the export drew a different one from SheetChrome. Two titleblocks with
   two sets of paddings, two column-width rules and only one of them carrying the Vale
   logo. The markup builders are gone; what is left is the part that was always shared,
   which is the answer to "what does the Client box say".

   WHY AN UNRESOLVED FIELD STILL RETURNS A KEY:
   A field with no value resolves to an empty string rather than being dropped, so the
   titleblock's row count never changes with the completeness of the data. An obviously
   blank Client box is a far more useful prompt than a silently missing one.

   WHY THIS MODULE'S siteAddress DIFFERS FROM THE STORED ONE:
   VghLantern__ProjectFile__Metadata__SiteAddress is the complete address, county
   included, and every other reader of it - the client letter, the specification
   schedule - quotes exactly that. Only the titleblock strip is tight enough on space
   to need county gone, so the trim happens here, once, on the way out of this module,
   rather than by changing what gets stored or composed further upstream.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Title Block Field Resolver Module
// =============================================================================

const VghLantern__DrawingEditor__TitleBlockRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Project Data Keys
    // ------------------------------------------------------------
    const METADATA_BLOCK   =  'VghLantern__ProjectFile__Metadata';
    const IDENTITY_BLOCK   =  'Lantern__Identity__Config';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Counties Dropped from the Titleblock's Site Address
    // ------------------------------------------------------------
    // The titleblock strip is the tightest space of any address consumer in the app -
    // the client letter and the specification schedule both quote SiteAddress in full,
    // county included. Matched by name, not by position in the comma list: the composed
    // line carries no marker for which segment is which, and a positional guess (say,
    // "drop the second-to-last part") would as happily eat a post town as a county
    // whenever a record's own address field folds in an extra comma of its own.
    const ENGLISH_COUNTIES  =  [
        'Bedfordshire', 'Berkshire', 'Bristol', 'Buckinghamshire', 'Cambridgeshire',
        'Cheshire', 'Cornwall', 'Cumbria', 'Derbyshire', 'Devon', 'Dorset', 'Durham',
        'East Riding of Yorkshire', 'East Sussex', 'Essex', 'Gloucestershire',
        'Greater London', 'Greater Manchester', 'Hampshire', 'Herefordshire',
        'Hertfordshire', 'Isle of Wight', 'Kent', 'Lancashire', 'Leicestershire',
        'Lincolnshire', 'Merseyside', 'Norfolk', 'North Yorkshire', 'Northamptonshire',
        'Northumberland', 'Nottinghamshire', 'Oxfordshire', 'Rutland', 'Shropshire',
        'Somerset', 'South Yorkshire', 'Staffordshire', 'Suffolk', 'Surrey',
        'Tyne and Wear', 'Warwickshire', 'West Midlands', 'West Sussex', 'West Yorkshire',
        'Wiltshire', 'Worcestershire'
    ].map(function(name) { return name.toLowerCase(); });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Field Value Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Format an Issue Date for the Titleblock
    // ------------------------------------------------------------
    // Prefers the recorded issue date; falls back to today so a working print is
    // never dated blank. Formatting goes through DateFormatter so every Vale app
    // dates a drawing identically.
    function VghLantern__TitleBlockRenderer__IssueDate(metadata) {
        var recorded  =  metadata['VghLantern__ProjectFile__Metadata__DateIssued'] || '';
        if (recorded !== '') return recorded;

        var DateFormatter  =  window.VghLantern__AppUtils__DateFormatter;
        if (DateFormatter && DateFormatter.VghLantern__DateFormatter__FormatShortOrdinal) {
            return DateFormatter.VghLantern__DateFormatter__FormatShortOrdinal(new Date());
        }

        return '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Drawing Number from Project and Lantern
    // ------------------------------------------------------------
    // Vale drawing numbers read as project code, then element sort order. Composing
    // it here keeps a single rule rather than one per output surface.
    function VghLantern__TitleBlockRenderer__DrawingNumber(metadata, lantern) {
        var projectCode  =  metadata['VghLantern__ProjectFile__Metadata__ProjectCode'] || '';
        if (projectCode === '') return '';

        var identity   =  lantern ? lantern[IDENTITY_BLOCK] : null;
        var sortOrder  =  identity ? identity['Lantern__Identity__Config__SortOrder'] : null;
        var elementNo  =  (typeof sortOrder === 'number') ? (sortOrder + 1) : 1;

        return projectCode + '-RL' + String(elementNo).padStart(2, '0');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Drop a Recognised County from a Composed Site Address
    // ------------------------------------------------------------
    // Titleblock-only trim of ComposeSiteAddress's full line (see ENGLISH_COUNTIES
    // above for why this matches by name). Leaves the address untouched, county and
    // all, when nothing in it matches the list - a safe no-op beats a wrong guess.
    function VghLantern__TitleBlockRenderer__DropCounty(address) {
        if (!address) return address;

        var kept  =  address.split(',')
            .map(function(part) { return part.trim(); })
            .filter(function(part) { return ENGLISH_COUNTIES.indexOf(part.toLowerCase()) === -1; });

        return kept.join(', ');
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Every Titleblock Field Value
    // ------------------------------------------------------------
    // Returned as a flat key-to-string map matching the Row Key values in config, so
    // adding a row to config only needs a matching key here. The PDF writer's filename
    // and metadata resolver reads the same map, so a file is named from the values
    // printed on the drawing inside it.
    function VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields(project, lantern) {
        var metadata     =  (project && project[METADATA_BLOCK]) || {};
        var identity     =  (lantern && lantern[IDENTITY_BLOCK]) || {};
        var ScaleManager =  window.VghLantern__DrawingEditor__ScaleManager;

        return {
            projectName   : metadata['VghLantern__ProjectFile__Metadata__ProjectName']   || '',
            projectCode   : metadata['VghLantern__ProjectFile__Metadata__ProjectCode']   || '',
            clientName    : metadata['VghLantern__ProjectFile__Metadata__ClientName']    || '',
            siteAddress   : VghLantern__TitleBlockRenderer__DropCounty(metadata['VghLantern__ProjectFile__Metadata__SiteAddress'] || ''),
            documentName  : metadata['VghLantern__ProjectFile__Metadata__DocumentName']  || '',
            drawnBy       : metadata['VghLantern__ProjectFile__Metadata__Author']        || '',
            revision      : metadata['VghLantern__ProjectFile__Metadata__RevisionCode']  || '',
            status        : metadata['VghLantern__ProjectFile__Metadata__DocumentStatus'] || '',
            lanternTitle  : identity['Lantern__Identity__Config__Title']                 || '',
            lanternRef    : identity['Lantern__Identity__Config__Reference']              || '',
            issueDate     : VghLantern__TitleBlockRenderer__IssueDate(metadata),
            drawingNumber : VghLantern__TitleBlockRenderer__DrawingNumber(metadata, lantern),
            scale         : ScaleManager ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__FormatLabel() : ''
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
        VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields  : VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__TitleBlockRenderer  =  VghLantern__DrawingEditor__TitleBlockRenderer;
