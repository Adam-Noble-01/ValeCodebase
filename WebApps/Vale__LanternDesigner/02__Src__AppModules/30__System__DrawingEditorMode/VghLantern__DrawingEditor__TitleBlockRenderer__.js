/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | TITLE BLOCK RENDERER
   =============================================================================

   FILE       : VghLantern__DrawingEditor__TitleBlockRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - TitleBlockRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the Vale-branded titleblock strip for a drawing sheet
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Resolves every titleblock field from the project metadata, the active lantern
     and the scale manager, then emits the titleblock markup for the sheet.
   - Field rows, widths, label copy and the logo are all configuration; this module
     only resolves values and lays them out.
   - Returns markup rather than writing to the DOM, so the same block can be placed
     on screen and handed to the PDF exporter.

   -----------------------------------------------------------------------------

   WHY AN UNRESOLVED FIELD STILL RENDERS:
   A field with no value renders an empty value box rather than being dropped. A
   titleblock whose row count changes with the completeness of the data is a
   titleblock nobody can proofread, and an obviously blank Client box is a far more
   useful prompt than a silently missing one.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Title Block Renderer Module
// =============================================================================

const VghLantern__DrawingEditor__TitleBlockRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_BLOCK        =  'VghLantern__Sheet__TitleBlock';
    const CSS_LOGO_CELL    =  'VghLantern__Sheet__TitleBlockLogo';
    const CSS_FIELDS       =  'VghLantern__Sheet__TitleBlockFields';
    const CSS_FIELD        =  'VghLantern__Sheet__TitleBlockField';
    const CSS_FIELD_LABEL  =  'VghLantern__Sheet__TitleBlockFieldLabel';
    const CSS_FIELD_VALUE  =  'VghLantern__Sheet__TitleBlockFieldValue';
    const CSS_COMPANY      =  'VghLantern__Sheet__TitleBlockCompany';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Project Data Keys
    // ------------------------------------------------------------
    const METADATA_BLOCK   =  'VghLantern__ProjectFile__Metadata';
    const IDENTITY_BLOCK   =  'Lantern__Identity__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Titleblock Config Block
    // ------------------------------------------------------------
    function VghLantern__TitleBlockRenderer__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var drawingCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
        return drawingCfg['VghLantern__DrawingEditor__Config__TitleBlock'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__TitleBlockRenderer__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
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
        if (DateFormatter && DateFormatter.VghLantern__DateFormatter__FormatShort) {
            return DateFormatter.VghLantern__DateFormatter__FormatShort(new Date());
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


    // FUNCTION | Resolve Every Titleblock Field Value
    // ------------------------------------------------------------
    // Returned as a flat key-to-string map matching the Row Key values in config,
    // so adding a row to config only needs a matching key here.
    function VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields(project, lantern) {
        var metadata     =  (project && project[METADATA_BLOCK]) || {};
        var identity     =  (lantern && lantern[IDENTITY_BLOCK]) || {};
        var ScaleManager =  window.VghLantern__DrawingEditor__ScaleManager;

        return {
            projectName   : metadata['VghLantern__ProjectFile__Metadata__ProjectName']   || '',
            projectCode   : metadata['VghLantern__ProjectFile__Metadata__ProjectCode']   || '',
            clientName    : metadata['VghLantern__ProjectFile__Metadata__ClientName']    || '',
            siteAddress   : metadata['VghLantern__ProjectFile__Metadata__SiteAddress']   || '',
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
// REGION | Markup Builders
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Logo Cell
    // ------------------------------------------------------------
    // Company name text is opt-in only - the logo already carries the brand, so
    // printing "Vale Garden Houses Limited" under it just burns titleblock height.
    function VghLantern__TitleBlockRenderer__BuildLogoCell(config) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var LABEL         =  'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__TitleBlock';
        var cellWidthMm   =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(config, 'LogoCellWidthMm', LABEL);
        var cellStyle    =  cellWidthMm ? ' style="width:' + cellWidthMm + 'mm;min-width:' + cellWidthMm + 'mm"' : '';
        var html         =  '<div class="' + CSS_LOGO_CELL + '"' + cellStyle + '>';

        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(config, 'ShowValeLogo', LABEL) && config.LogoAssetPath) {
            var widthStyle  =  config.LogoWidthMm ? ' style="width:' + config.LogoWidthMm + 'mm"' : '';
            html  +=  '<img src="' + VghLantern__TitleBlockRenderer__Escape(config.LogoAssetPath) + '"' +
                      widthStyle + ' alt="Vale Garden Houses">';
        }

        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(config, 'ShowCompanyName', LABEL) && config.CompanyName) {
            html  +=  '<span class="' + CSS_COMPANY + '">' +
                      VghLantern__TitleBlockRenderer__Escape(config.CompanyName) + '</span>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Field Cell
    // ------------------------------------------------------------
    // WidthMm is a relative flex share, not an absolute millimetre width. Absolute
    // widths summed past the sheet width and wrapped the strip onto a second row.
    function VghLantern__TitleBlockRenderer__BuildFieldCell(row, value) {
        var flexShare  =  (typeof row.WidthMm === 'number' && row.WidthMm > 0) ? row.WidthMm : 1;
        var style      =  ' style="flex:' + flexShare + ' ' + flexShare + ' 0;min-width:0"';

        return '<div class="' + CSS_FIELD + '"' + style + '>' +
               '<span class="' + CSS_FIELD_LABEL + '">' + VghLantern__TitleBlockRenderer__Escape(row.Label || row.Key) + '</span>' +
               '<span class="' + CSS_FIELD_VALUE + '">' + VghLantern__TitleBlockRenderer__Escape(value) + '</span>' +
               '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Full Titleblock Markup
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__TitleBlockRenderer__BuildMarkup(project, lantern) {
        var config  =  VghLantern__TitleBlockRenderer__Config();
        var fields  =  VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields(project, lantern);
        var rows    =  Array.isArray(config.Rows) ? config.Rows : [];

        var html  =  '<div class="' + CSS_BLOCK + '">' +
                     VghLantern__TitleBlockRenderer__BuildLogoCell(config) +
                     '<div class="' + CSS_FIELDS + '">';

        var i;
        for (i = 0; i < rows.length; i++) {
            html  +=  VghLantern__TitleBlockRenderer__BuildFieldCell(rows[i], fields[rows[i].Key]);
        }

        return html + '</div></div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Titleblock Into a Host Element
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__TitleBlockRenderer__Render(hostElement, project, lantern) {
        if (!hostElement) return;
        hostElement.innerHTML  =  VghLantern__DrawingEditor__TitleBlockRenderer__BuildMarkup(project, lantern);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__TitleBlockRenderer__Render         : VghLantern__DrawingEditor__TitleBlockRenderer__Render,
        VghLantern__DrawingEditor__TitleBlockRenderer__BuildMarkup    : VghLantern__DrawingEditor__TitleBlockRenderer__BuildMarkup,
        VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields  : VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__TitleBlockRenderer  =  VghLantern__DrawingEditor__TitleBlockRenderer;
