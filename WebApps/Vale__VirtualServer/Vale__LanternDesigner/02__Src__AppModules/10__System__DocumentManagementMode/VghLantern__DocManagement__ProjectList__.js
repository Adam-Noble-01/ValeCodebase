/* =============================================================================
   VGHLANTERN - DOCUMENT MANAGEMENT PROJECT LIST
   =============================================================================

   FILE       : VghLantern__DocManagement__ProjectList__.js
   NAMESPACE  : VghLantern
   MODULE     : DocManagement - ProjectList
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render the lantern project table into the Document Management panel
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Reads the project manifest via ProjectFileManager.VghLantern__ProjectFileManager__ListProjects()
   - Renders a full HTML table with project metadata columns
   - Sortable column headers, defaulting to newest Last Modified first
   - Status column renders a colour-coded pill badge (Draft / For Approval / Issued)
   - Each row provides Open, Edit, and Delete action buttons
   - Inline edit mode turns name/document/status cells into inputs and swaps Edit for Save
   - Renders an empty-state placeholder when no projects exist
   - Subscribes to StateManager 'projectChanged' so the table self-refreshes
   - Rows are keyed by the design's library project id (libraryId, e.g.
     "57079__Mordaunt"), shown under the job number: schemes of one job share
     the number, so the folder is what tells them apart (15-Oct-2026)
   - Edit appears for Employee and up; Delete for the design's creator and for
     Management and up (the API decides; the buttons only follow it)
   - Ownership and edits (15-Oct-2026): Created By and Last Modified By columns
     (sortable and searchable; the full time on hover) come from the API's own
     stamp, never from the app; a prototype design, started before sign-in, shows
     "Prototype" as its creator. Date Created and Last Modified use the API's
     times too when it has them, so a date and its name describe the same save.
     History, for everyone signed in, opens the design's sessions and changes
     (ProjectActions)

   -----------------------------------------------------------------------------

   MODE PANEL CONTRACT:
   - Search input is injected into  #VghLantern__DocManagement__SearchWrapper
   - Table is injected into         #VghLantern__DocManagement__TableContainer
   - Row action buttons are bound by ProjectActions via event delegation on the
     table container, so this module only emits markup with data attributes.

   ============================================================================= */

// =============================================================================
// REGION | Project List Module
// =============================================================================

const VghLantern__DocManagement__ProjectList = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants - DOM Targets, Status Map, and Sort Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Target IDs
    // ------------------------------------------------------------
    const TABLE_CONTAINER_ID   =  'VghLantern__DocManagement__TableContainer';    // <-- Table injection point
    const SEARCH_WRAPPER_ID    =  'VghLantern__DocManagement__SearchWrapper';     // <-- Search field injection point
    const SEARCH_INPUT_ID      =  'VghLantern__DocManagement__SearchInput';       // <-- Generated search input
    const COLUMN_COUNT         =  10;                                             // <-- Used for the no-match spanning row
    const BY_COLUMN_CLASS      =  'VghLantern__DocManagement__ByColumn';          // <-- Created By / Last Modified By: folded under the dates on narrower screens (CSS)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Status Badge CSS Class Mapping
    // ------------------------------------------------------------
    const STATUS_CLASS_MAP  =  {
        'Draft'         : 'VghLantern__DocManagement__StatusBadge--draft',
        'For Approval'  : 'VghLantern__DocManagement__StatusBadge--forApproval',
        'Issued'        : 'VghLantern__DocManagement__StatusBadge--issued'
    };

    const DEFAULT_STATUS_OPTIONS  =  ['Draft', 'For Approval', 'Issued'];         // <-- Fallback when config is unavailable
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Sortable Column Field Keys and Defaults
    // ------------------------------------------------------------
    const SORT_FIELD_PROJECT_CODE   =  'projectCode';                             // <-- Vale job number
    const SORT_FIELD_PROJECT_NAME   =  'projectName';                             // <-- Site / job name
    const SORT_FIELD_CLIENT_NAME    =  'clientName';                              // <-- Client shown on drawings
    const SORT_FIELD_DOCUMENT_NAME  =  'documentName';                            // <-- Document title
    const SORT_FIELD_STATUS         =  'status';                                  // <-- Workflow status
    const SORT_FIELD_DATE_CREATED   =  'dateCreated';                             // <-- Creation timestamp
    const SORT_FIELD_DATE_MODIFIED  =  'dateModified';                            // <-- Last save timestamp
    const SORT_FIELD_CREATED_BY     =  'createdByName';                           // <-- Who started the design (its owner)
    const SORT_FIELD_MODIFIED_BY    =  'modifiedByName';                          // <-- Who saved it last
    const DEFAULT_SORT_FIELD        =  SORT_FIELD_DATE_MODIFIED;
    const DEFAULT_SORT_DIRECTION    =  'desc';

    const STATUS_SORT_ORDER  =  {
        'Draft'         : 1,
        'For Approval'  : 2,
        'Issued'        : 3
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Current Table Sort, Search, and Edit State
    // ------------------------------------------------------------
    let VghLantern__ProjectList__SortField      =  DEFAULT_SORT_FIELD;            // <-- Active sort column
    let VghLantern__ProjectList__SortDirection  =  DEFAULT_SORT_DIRECTION;        // <-- 'asc' or 'desc'
    let VghLantern__ProjectList__SortDefaultsApplied  =  false;                   // <-- Config defaults seeded on first render
    let VghLantern__ProjectList__SearchQuery    =  '';                            // <-- Live search filter text
    let VghLantern__ProjectList__EditingCode    =  null;                          // <-- Library id of the row in inline edit mode
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access and Display Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Document Management Table Config Block
    // ------------------------------------------------------------
    function VghLantern__ProjectList__TableConfig() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return {};

        return appConfig['VghLantern__DocManagement__Config__Table'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Empty State Config Block
    // ------------------------------------------------------------
    function VghLantern__ProjectList__EmptyStateConfig() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return {};

        return appConfig['VghLantern__DocManagement__Config__EmptyState'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Configured Default Sort Field
    // ------------------------------------------------------------
    function VghLantern__ProjectList__ResolveDefaultSortField() {
        var tableCfg  =  VghLantern__ProjectList__TableConfig();
        var field     =  tableCfg.DefaultSortField;

        if (field && VghLantern__ProjectList__IsSortableField(field)) return field;
        return DEFAULT_SORT_FIELD;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Configured Default Sort Direction
    // ------------------------------------------------------------
    function VghLantern__ProjectList__ResolveDefaultSortDirection() {
        var tableCfg  =  VghLantern__ProjectList__TableConfig();
        var direction =  tableCfg.DefaultSortDirection;

        return (direction === 'asc' || direction === 'desc') ? direction : DEFAULT_SORT_DIRECTION;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply Table Config Sort Defaults on First Render
    // ------------------------------------------------------------
    function VghLantern__ProjectList__ApplyConfigSortDefaultsOnce() {
        if (VghLantern__ProjectList__SortDefaultsApplied) return;

        VghLantern__ProjectList__SortField      =  VghLantern__ProjectList__ResolveDefaultSortField();
        VghLantern__ProjectList__SortDirection  =  VghLantern__ProjectList__ResolveDefaultSortDirection();
        VghLantern__ProjectList__SortDefaultsApplied  =  true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe HTML Interpolation
    // ------------------------------------------------------------
    function VghLantern__ProjectList__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g,  '&amp;')
            .replace(/</g,  '&lt;')
            .replace(/>/g,  '&gt;')
            .replace(/"/g,  '&quot;')
            .replace(/'/g,  '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Status Badge HTML
    // ------------------------------------------------------------
    function VghLantern__ProjectList__BuildStatusBadge(status) {
        var cssClass  =  STATUS_CLASS_MAP[status] || STATUS_CLASS_MAP['Draft'];   // <-- Fallback to Draft styling
        return '<span class="VghLantern__DocManagement__StatusBadge ' + cssClass + '">' +
               VghLantern__ProjectList__Escape(status) + '</span>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Status Options from Config with Fallback
    // ------------------------------------------------------------
    function VghLantern__ProjectList__BuildStatusOptionsList() {
        var config   =  VghLantern__ProjectList__TableConfig();
        var options  =  Array.isArray(config.StatusOptions) && config.StatusOptions.length
            ? config.StatusOptions
            : DEFAULT_STATUS_OPTIONS;
        return options;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Status Select HTML for Inline Edit Mode
    // ------------------------------------------------------------
    function VghLantern__ProjectList__BuildStatusSelect(currentStatus) {
        var options  =  VghLantern__ProjectList__BuildStatusOptionsList();
        var html     =  '<select class="VghLantern__DocManagement__EditSelect" data-field="status">';

        for (var i = 0; i < options.length; i++) {
            var optionValue  =  options[i];
            var selectedAttr =  (optionValue === currentStatus) ? ' selected' : '';
            html  +=  '<option value="' + VghLantern__ProjectList__Escape(optionValue) + '"' + selectedAttr + '>' +
                      VghLantern__ProjectList__Escape(optionValue) + '</option>';
        }

        html  +=  '</select>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Date via DateFormatter Utility
    // ------------------------------------------------------------
    function VghLantern__ProjectList__FormatDate(dateStr) {
        if (!dateStr) return '&mdash;';

        var DateFormatter  =  window.VghLantern__AppUtils__DateFormatter;
        if (DateFormatter) {
            return VghLantern__ProjectList__Escape(
                DateFormatter.VghLantern__DateFormatter__FormatShort(dateStr)      // <-- "30 Jul 2026" format
            );
        }

        return VghLantern__ProjectList__Escape(dateStr);                          // <-- Raw fallback
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Date a Date Column Shows and Sorts By
    // ------------------------------------------------------------
    // The API's own time of the last save (or of the start) when it has one, so
    // Last Modified and Last Modified By always describe the same save; the
    // design's metadata date otherwise (a prototype design not saved since the move).
    function VghLantern__ProjectList__ColumnDate(project, fieldName) {
        var p  =  project || {};
        if (fieldName === SORT_FIELD_DATE_MODIFIED) return p.modifiedUtc || p.dateModified;
        if (fieldName === SORT_FIELD_DATE_CREATED)  return p.createdUtc  || p.dateCreated;
        return p[fieldName];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Created By / Last Modified By Cell
    // ------------------------------------------------------------
    // The name from the API's stamp, with the full time on hover. A prototype
    // design has no creator (it predates sign-in), so it says so rather than
    // leaving the owner blank.
    function VghLantern__ProjectList__BuildPersonCell(personName, utcText, verb, isPrototype) {
        if (personName) {
            var DateFormatter  =  window.VghLantern__AppUtils__DateFormatter;
            var when  =  (utcText && DateFormatter) ? DateFormatter.VghLantern__DateFormatter__FormatShortTime(utcText) : '';
            var tip   =  when ? ' title="' + VghLantern__ProjectList__Escape(verb + ' ' + when) + '"' : '';
            return '<span class="VghLantern__DocManagement__Person"' + tip + '>' + VghLantern__ProjectList__Escape(personName) + '</span>';
        }
        if (isPrototype) {
            return '<span class="VghLantern__DocManagement__Person VghLantern__DocManagement__Person--prototype"' +
                   ' title="Started in the prototype app before sign-in, then moved into the Master Library (15-Oct-2026)">Prototype</span>';
        }
        return '&mdash;';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sort Comparators - Field Validation, Primitives, and Row Compare
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Check Whether Sort Field is Allowed
    // ------------------------------------------------------------
    function VghLantern__ProjectList__IsSortableField(fieldName) {
        return (
            fieldName === SORT_FIELD_PROJECT_CODE  ||
            fieldName === SORT_FIELD_PROJECT_NAME  ||
            fieldName === SORT_FIELD_CLIENT_NAME   ||
            fieldName === SORT_FIELD_DOCUMENT_NAME ||
            fieldName === SORT_FIELD_STATUS        ||
            fieldName === SORT_FIELD_DATE_CREATED  ||
            fieldName === SORT_FIELD_DATE_MODIFIED ||
            fieldName === SORT_FIELD_CREATED_BY    ||
            fieldName === SORT_FIELD_MODIFIED_BY
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compare Text Values with Numeric Awareness
    // ------------------------------------------------------------
    function VghLantern__ProjectList__CompareText(leftValue, rightValue) {
        var leftText   =  String(leftValue  || '').trim();
        var rightText  =  String(rightValue || '').trim();
        return leftText.localeCompare(rightText, undefined, { numeric : true, sensitivity : 'base' });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert Date Text to Numeric Sort Value
    // ------------------------------------------------------------
    function VghLantern__ProjectList__BuildDateSortValue(dateText) {
        if (!dateText) return 0;

        var DateFormatter  =  window.VghLantern__AppUtils__DateFormatter;
        var parsedValue    =  DateFormatter
            ? DateFormatter.VghLantern__DateFormatter__ToDate(dateText).getTime()   // <-- Handles "30-Jul-2026" and legacy ISO
            : Date.parse(dateText);                                                 // <-- Raw fallback
        if (isNaN(parsedValue)) return 0;

        return parsedValue;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compare Date Values
    // ------------------------------------------------------------
    function VghLantern__ProjectList__CompareDates(leftDateText, rightDateText) {
        var leftValue   =  VghLantern__ProjectList__BuildDateSortValue(leftDateText);
        var rightValue  =  VghLantern__ProjectList__BuildDateSortValue(rightDateText);
        if (leftValue === rightValue) return 0;
        return leftValue > rightValue ? 1 : -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compare Status Values by Workflow Order
    // ------------------------------------------------------------
    function VghLantern__ProjectList__CompareStatus(leftStatus, rightStatus) {
        var leftRank   =  STATUS_SORT_ORDER[leftStatus]  || 0;
        var rightRank  =  STATUS_SORT_ORDER[rightStatus] || 0;

        if (leftRank === rightRank) {
            return VghLantern__ProjectList__CompareText(leftStatus, rightStatus);
        }
        return leftRank > rightRank ? 1 : -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compare Two Project Records by Active Field
    // ------------------------------------------------------------
    function VghLantern__ProjectList__CompareProjectsByField(leftProject, rightProject, fieldName) {
        var left   =  leftProject  || {};
        var right  =  rightProject || {};

        if (fieldName === SORT_FIELD_DATE_CREATED || fieldName === SORT_FIELD_DATE_MODIFIED) {
            return VghLantern__ProjectList__CompareDates(
                VghLantern__ProjectList__ColumnDate(left, fieldName), VghLantern__ProjectList__ColumnDate(right, fieldName));
        }
        if (fieldName === SORT_FIELD_STATUS) {
            return VghLantern__ProjectList__CompareStatus(left[fieldName], right[fieldName]);
        }
        return VghLantern__ProjectList__CompareText(left[fieldName], right[fieldName]);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Filtered and Sorted Manifest Builder
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Apply Live Search Filter to Project Array
    // ------------------------------------------------------------
    function VghLantern__ProjectList__ApplySearchFilter(list) {
        if (!VghLantern__ProjectList__SearchQuery) return list;

        var config       =  VghLantern__ProjectList__TableConfig();
        var searchFields =  Array.isArray(config.SearchFields) && config.SearchFields.length
            ? config.SearchFields
            : [SORT_FIELD_PROJECT_CODE, SORT_FIELD_PROJECT_NAME, SORT_FIELD_CLIENT_NAME, SORT_FIELD_DOCUMENT_NAME, SORT_FIELD_STATUS,
               SORT_FIELD_CREATED_BY, SORT_FIELD_MODIFIED_BY];

        var query  =  VghLantern__ProjectList__SearchQuery.toLowerCase();

        return list.filter(function(project) {
            for (var i = 0; i < searchFields.length; i++) {
                var fieldValue  =  String(project[searchFields[i]] || '').toLowerCase();
                if (fieldValue.indexOf(query) !== -1) return true;
            }
            return false;
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Filtered and Sorted Copy of Project Array
    // ------------------------------------------------------------
    function VghLantern__ProjectList__BuildSortedProjects(projects) {
        var list  =  Array.isArray(projects) ? projects.slice() : [];             // <-- Never mutate the source manifest

        list  =  VghLantern__ProjectList__ApplySearchFilter(list);

        if (!VghLantern__ProjectList__IsSortableField(VghLantern__ProjectList__SortField)) {
            VghLantern__ProjectList__SortField      =  VghLantern__ProjectList__ResolveDefaultSortField();
            VghLantern__ProjectList__SortDirection  =  VghLantern__ProjectList__ResolveDefaultSortDirection();
        }

        var directionFactor  =  (VghLantern__ProjectList__SortDirection === 'asc') ? 1 : -1;

        list.sort(function(leftProject, rightProject) {
            var compareResult  =  VghLantern__ProjectList__CompareProjectsByField(
                leftProject,
                rightProject,
                VghLantern__ProjectList__SortField
            );
            return compareResult * directionFactor;
        });

        return list;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Markup Builders - Header, Rows, and Empty State
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Sortable Header Cell HTML
    // ------------------------------------------------------------
    function VghLantern__ProjectList__BuildSortableHeaderCell(labelText, fieldName, extraClass) {
        var isActive     =  (VghLantern__ProjectList__SortField === fieldName);
        var headerClass  =  'VghLantern__DocManagement__SortableHeader' + (extraClass ? ' ' + extraClass : '');
        var arrowGlyph   =  '';

        if (isActive) {
            headerClass  +=  ' VghLantern__DocManagement__SortableHeader--active';
            arrowGlyph    =  (VghLantern__ProjectList__SortDirection === 'asc') ? ' &#9650;' : ' &#9660;';
        }

        return '<th class="' + headerClass + '" data-sort-field="' + fieldName + '">' +
               labelText + arrowGlyph + '</th>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Table Header Row HTML
    // ------------------------------------------------------------
    function VghLantern__ProjectList__BuildTableHeader() {
        var html  =  '<thead><tr>';
        html     +=  VghLantern__ProjectList__BuildSortableHeaderCell('Project Code',  SORT_FIELD_PROJECT_CODE);
        html     +=  VghLantern__ProjectList__BuildSortableHeaderCell('Project Name',  SORT_FIELD_PROJECT_NAME);
        html     +=  VghLantern__ProjectList__BuildSortableHeaderCell('Client Name',   SORT_FIELD_CLIENT_NAME);
        html     +=  VghLantern__ProjectList__BuildSortableHeaderCell('Document Name', SORT_FIELD_DOCUMENT_NAME);
        html     +=  VghLantern__ProjectList__BuildSortableHeaderCell('Status',        SORT_FIELD_STATUS);
        html     +=  VghLantern__ProjectList__BuildSortableHeaderCell('Date Created',  SORT_FIELD_DATE_CREATED);
        html     +=  VghLantern__ProjectList__BuildSortableHeaderCell('Created By',    SORT_FIELD_CREATED_BY, BY_COLUMN_CLASS);
        html     +=  VghLantern__ProjectList__BuildSortableHeaderCell('Last Modified', SORT_FIELD_DATE_MODIFIED);
        html     +=  VghLantern__ProjectList__BuildSortableHeaderCell('Last Modified By', SORT_FIELD_MODIFIED_BY, BY_COLUMN_CLASS);
        html     +=  '<th>Actions</th>';
        html     +=  '</tr></thead>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Single Table Row HTML
    // ------------------------------------------------------------
    function VghLantern__ProjectList__BuildTableRow(project) {
        var code          =  VghLantern__ProjectList__Escape(project.projectCode  || '');
        var libraryId     =  VghLantern__ProjectList__Escape(project.libraryId    || '');
        var nameRaw       =  project.projectName  || '';
        var clientRaw     =  project.clientName   || '';
        var docNameRaw    =  project.documentName || '';
        var name          =  VghLantern__ProjectList__Escape(nameRaw);
        var clientName    =  VghLantern__ProjectList__Escape(clientRaw);
        var docName       =  VghLantern__ProjectList__Escape(docNameRaw);
        var status        =  project.status || 'Draft';
        var dateCreated   =  VghLantern__ProjectList__FormatDate(VghLantern__ProjectList__ColumnDate(project, SORT_FIELD_DATE_CREATED));
        var dateModified  =  VghLantern__ProjectList__FormatDate(VghLantern__ProjectList__ColumnDate(project, SORT_FIELD_DATE_MODIFIED));
        var createdBy     =  VghLantern__ProjectList__BuildPersonCell(project.createdByName, project.createdUtc, 'Started', !!project.migrated);
        var modifiedBy    =  VghLantern__ProjectList__BuildPersonCell(project.modifiedByName, project.modifiedUtc, 'Saved', false);
        var byOpen        =  '<td class="' + BY_COLUMN_CLASS + '">';
        var underDate     =  function(personHtml) {                                // <-- Shown instead of the By columns on narrower screens
            return personHtml === '&mdash;' ? '' : '<span class="VghLantern__DocManagement__DateBy">' + personHtml + '</span>';
        };
        dateCreated       =  dateCreated  + underDate(createdBy);
        dateModified      =  dateModified + underDate(modifiedBy);
        var lanternCount  =  Number(project.lanternCount || 0);                   // <-- Optional manifest hint
        var isEditing     =  (VghLantern__ProjectList__EditingCode === (project.libraryId || ''));
        var FileManager   =  window.VghLantern__AppData__ProjectFileManager;
        var canEdit       =  !!(FileManager && FileManager.VghLantern__ProjectFileManager__CanWrite());
        var canDelete     =  !!(FileManager && FileManager.VghLantern__ProjectFileManager__CanDelete(project));

        var html  =  '<tr' + (isEditing ? ' class="VghLantern__DocManagement__TableRow--editing"' : '') + '>';
        html     +=  '<td>' + (code || '&mdash;') +
                     (libraryId ? '<span class="VghLantern__DocManagement__LibraryId" title="Folder in the Vale Projects Master Library">' + libraryId + '</span>' : '') +
                     '</td>';

        if (isEditing) {
            html  +=  '<td><input type="text" class="VghLantern__DocManagement__EditInput" data-field="projectName" value="' + name + '"></td>';
            html  +=  '<td><input type="text" class="VghLantern__DocManagement__EditInput" data-field="clientName" value="' + clientName + '"></td>';
            html  +=  '<td><input type="text" class="VghLantern__DocManagement__EditInput" data-field="documentName" value="' + docName + '"></td>';
            html  +=  '<td>' + VghLantern__ProjectList__BuildStatusSelect(status) + '</td>';
            html  +=  '<td>' + dateCreated  + '</td>';
            html  +=  byOpen + createdBy    + '</td>';
            html  +=  '<td>' + dateModified + '</td>';
            html  +=  byOpen + modifiedBy   + '</td>';
            html  +=  '<td>';
            html  +=      '<div class="VghLantern__DocManagement__RowActions">';
            html  +=          '<button class="VghLantern__DocManagement__RowBtn VghLantern__DocManagement__RowBtn--save" data-action="save-edit" data-code="' + libraryId + '">Save</button>';
            html  +=          '<button class="VghLantern__DocManagement__RowBtn VghLantern__DocManagement__RowBtn--cancel" data-action="cancel-edit" data-code="' + libraryId + '">Cancel</button>';
            html  +=      '</div>';
            html  +=  '</td>';
        } else {
            var nameCell  =  name || '&mdash;';
            if (lanternCount > 0) {
                nameCell  +=  ' <span class="VghLantern__DocManagement__CountChip">' + lanternCount +
                              (lanternCount === 1 ? ' lantern' : ' lanterns') + '</span>';
            }

            html  +=  '<td>' + nameCell                    + '</td>';
            html  +=  '<td>' + (clientName || '&mdash;')   + '</td>';
            html  +=  '<td>' + (docName || '&mdash;')      + '</td>';
            html  +=  '<td>' + VghLantern__ProjectList__BuildStatusBadge(status) + '</td>';
            html  +=  '<td>' + dateCreated  + '</td>';
            html  +=  byOpen + createdBy    + '</td>';
            html  +=  '<td>' + dateModified + '</td>';
            html  +=  byOpen + modifiedBy   + '</td>';
            html  +=  '<td>';
            html  +=      '<div class="VghLantern__DocManagement__RowActions">';
            html  +=          '<button class="VghLantern__DocManagement__RowBtn" data-action="open" data-code="' + libraryId + '">Open</button>';
            if (canEdit) {
                html  +=      '<button class="VghLantern__DocManagement__RowBtn" data-action="edit" data-code="' + libraryId + '">Edit</button>';
            }
            html  +=          '<button class="VghLantern__DocManagement__RowBtn" data-action="history" data-code="' + libraryId + '" title="Who started this design, who has worked on it, and what changed">History</button>';
            if (canDelete) {
                html  +=      '<button class="VghLantern__DocManagement__RowBtn VghLantern__DocManagement__RowBtn--delete" data-action="delete" data-code="' + libraryId + '">Delete</button>';
            }
            html  +=      '</div>';
            html  +=  '</td>';
        }

        html  +=  '</tr>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Empty State Placeholder HTML
    // ------------------------------------------------------------
    function VghLantern__ProjectList__BuildEmptyState() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var EMPTY_LABEL   =  'Na__DocManagement__Config.json -> VghLantern__DocManagement__Config__EmptyState';
        var config     =  VghLantern__ProjectList__EmptyStateConfig();
        var glyphHtml  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'Glyph', EMPTY_LABEL);
        var titleText  =  VghLantern__ProjectList__Escape(ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'Title', EMPTY_LABEL));
        var bodyText   =  VghLantern__ProjectList__Escape(ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'Text',  EMPTY_LABEL));

        var html  =  '<div class="VghLantern__DocManagement__EmptyState">';
        html     +=      '<div class="VghLantern__DocManagement__EmptyState__Icon">'  + glyphHtml + '</div>';
        html     +=      '<div class="VghLantern__DocManagement__EmptyState__Title">' + titleText + '</div>';
        html     +=      '<div class="VghLantern__DocManagement__EmptyState__Text">'  + bodyText  + '</div>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Search Field Rendering
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Render the Search Field and Rebind Its Listener
    // ------------------------------------------------------------
    function VghLantern__ProjectList__RenderSearchField() {
        var wrapper  =  document.getElementById(SEARCH_WRAPPER_ID);
        if (!wrapper) return;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config       =  VghLantern__ProjectList__TableConfig();
        var placeholder  =  VghLantern__ProjectList__Escape(ConfigLoader.VghLantern__ConfigLoader__RequireString(
            config, 'SearchPlaceholder', 'Na__DocManagement__Config.json -> VghLantern__DocManagement__Config__Table'));
        var currentValue =  VghLantern__ProjectList__Escape(VghLantern__ProjectList__SearchQuery);

        var html  =  '<div class="VghLantern__DocManagement__SearchContainer">';
        html     +=      '<input type="text" id="' + SEARCH_INPUT_ID + '"';
        html     +=          ' class="VghLantern__DocManagement__SearchInput"';
        html     +=          ' autocomplete="off" data-vghlantern-noautofill="true"';
        html     +=          ' placeholder="' + placeholder + '" value="' + currentValue + '">';
        html     +=  '</div>';

        wrapper.innerHTML  =  html;

        var searchInput  =  document.getElementById(SEARCH_INPUT_ID);
        if (!searchInput) return;

        searchInput.addEventListener('input', function(event) {
            VghLantern__ProjectList__SearchQuery  =  event.target.value;
            VghLantern__ProjectList__RenderTableOnly();                           // <-- Table-only redraw keeps caret position
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Clear the Active Search Query and Re-render
    // ------------------------------------------------------------
    function VghLantern__ProjectList__ClearSearch() {
        VghLantern__ProjectList__SearchQuery  =  '';
        VghLantern__ProjectList__Render();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render Pipeline, State Subscription, and Sort Toggle
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Render the Table Body Only, Leaving Search Untouched
    // ------------------------------------------------------------
    function VghLantern__ProjectList__RenderTableOnly() {
        var container  =  document.getElementById(TABLE_CONTAINER_ID);
        if (!container) return;

        VghLantern__ProjectList__ApplyConfigSortDefaultsOnce();

        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        if (!ProjectFileManager) {
            container.innerHTML  =  VghLantern__ProjectList__BuildEmptyState();
            return;
        }

        var projects  =  ProjectFileManager.VghLantern__ProjectFileManager__ListProjects();
        if (!projects || projects.length === 0) {
            container.innerHTML  =  VghLantern__ProjectList__BuildEmptyState();
            return;
        }

        var sortedProjects  =  VghLantern__ProjectList__BuildSortedProjects(projects);

        var html  =  '<table class="VghLantern__DocManagement__Table">';
        html     +=  VghLantern__ProjectList__BuildTableHeader();
        html     +=  '<tbody>';

        if (sortedProjects.length === 0) {
            html +=      '<tr><td colspan="' + COLUMN_COUNT + '" class="VghLantern__DocManagement__NoMatchCell">' +
                         'No projects match your search.</td></tr>';
        } else {
            for (var i = 0; i < sortedProjects.length; i++) {
                html  +=  VghLantern__ProjectList__BuildTableRow(sortedProjects[i]);
            }
        }

        html     +=  '</tbody>';
        html     +=  '</table>';

        container.innerHTML  =  html;                                             // <-- Row and header clicks are delegated by ProjectActions
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Search Field and Project Table into DOM
    // ------------------------------------------------------------
    function VghLantern__ProjectList__Render() {
        var container      =  document.getElementById(TABLE_CONTAINER_ID);
        var searchWrapper  =  document.getElementById(SEARCH_WRAPPER_ID);

        if (!container) {
            console.warn('[VghLantern ProjectList] Container not found: #' + TABLE_CONTAINER_ID);
            return;
        }

        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        if (!ProjectFileManager) {
            console.error('[VghLantern ProjectList] ProjectFileManager not available.');
            container.innerHTML  =  VghLantern__ProjectList__BuildEmptyState();
            if (searchWrapper) searchWrapper.innerHTML  =  '';
            return;
        }

        var projects  =  ProjectFileManager.VghLantern__ProjectFileManager__ListProjects();

        if (!projects || projects.length === 0) {
            container.innerHTML  =  VghLantern__ProjectList__BuildEmptyState();    // <-- No projects at all, so no search field either
            if (searchWrapper) searchWrapper.innerHTML  =  '';
            return;
        }

        VghLantern__ProjectList__RenderSearchField();
        VghLantern__ProjectList__RenderTableOnly();
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle Sort by Field and Re-render Table
    // ------------------------------------------------------------
    function VghLantern__ProjectList__ToggleSortByField(fieldName) {
        if (!VghLantern__ProjectList__IsSortableField(fieldName)) return;

        if (VghLantern__ProjectList__SortField === fieldName) {
            VghLantern__ProjectList__SortDirection  =  (VghLantern__ProjectList__SortDirection === 'asc') ? 'desc' : 'asc';
        } else {
            VghLantern__ProjectList__SortField      =  fieldName;
            VghLantern__ProjectList__SortDirection  =  'asc';
        }

        VghLantern__ProjectList__RenderTableOnly();                               // <-- Sort never disturbs the search field
    }
    // ------------------------------------------------------------


    // FUNCTION | Enter Inline Edit Mode for a Project Row
    // ------------------------------------------------------------
    function VghLantern__ProjectList__SetEditingRow(libraryId) {
        VghLantern__ProjectList__EditingCode  =  libraryId || null;
        VghLantern__ProjectList__RenderTableOnly();                               // <-- Table-only redraw keeps search caret
    }
    // ------------------------------------------------------------


    // FUNCTION | Exit Inline Edit Mode and Re-render Display Rows
    // ------------------------------------------------------------
    function VghLantern__ProjectList__ClearEditingRow() {
        VghLantern__ProjectList__EditingCode  =  null;
        VghLantern__ProjectList__RenderTableOnly();
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to State Change Events
    // ------------------------------------------------------------
    function VghLantern__ProjectList__SubscribeToStateEvents() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.VghLantern__StateManager__On('projectChanged', function() {
            VghLantern__ProjectList__Render();                                    // <-- Re-render on any project mutation
        });
    }
    // ------------------------------------------------------------


    // BOOT | Initial Subscription
    // ------------------------------------------------------------
    VghLantern__ProjectList__SubscribeToStateEvents();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ProjectList__Render              : VghLantern__ProjectList__Render,
        VghLantern__ProjectList__ToggleSortByField   : VghLantern__ProjectList__ToggleSortByField,
        VghLantern__ProjectList__ClearSearch         : VghLantern__ProjectList__ClearSearch,
        VghLantern__ProjectList__SetEditingRow       : VghLantern__ProjectList__SetEditingRow,
        VghLantern__ProjectList__ClearEditingRow     : VghLantern__ProjectList__ClearEditingRow
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocManagement__ProjectList  =  VghLantern__DocManagement__ProjectList;
