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
   - Sortable column headers, defaulting to newest Date Created first
   - Status column renders a colour-coded pill badge (Draft / For Approval / Issued)
   - Each row provides Open, Edit, and Delete action buttons
   - Inline edit mode turns name/document/status cells into inputs and swaps Edit for Save
   - Renders an empty-state placeholder when no projects exist
   - Subscribes to StateManager 'projectChanged' so the table self-refreshes

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
    const COLUMN_COUNT         =  8;                                              // <-- Used for the no-match spanning row
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
    const DEFAULT_SORT_FIELD        =  SORT_FIELD_DATE_CREATED;
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
    let VghLantern__ProjectList__SearchQuery    =  '';                            // <-- Live search filter text
    let VghLantern__ProjectList__EditingCode    =  null;                          // <-- Project code currently in inline edit mode
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
            fieldName === SORT_FIELD_DATE_MODIFIED
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
            return VghLantern__ProjectList__CompareDates(left[fieldName], right[fieldName]);
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
            : [SORT_FIELD_PROJECT_CODE, SORT_FIELD_PROJECT_NAME, SORT_FIELD_CLIENT_NAME, SORT_FIELD_DOCUMENT_NAME, SORT_FIELD_STATUS];

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
            VghLantern__ProjectList__SortField      =  DEFAULT_SORT_FIELD;        // <-- Recover from an invalid field
            VghLantern__ProjectList__SortDirection  =  DEFAULT_SORT_DIRECTION;
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
    function VghLantern__ProjectList__BuildSortableHeaderCell(labelText, fieldName) {
        var isActive     =  (VghLantern__ProjectList__SortField === fieldName);
        var headerClass  =  'VghLantern__DocManagement__SortableHeader';
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
        html     +=  VghLantern__ProjectList__BuildSortableHeaderCell('Last Modified', SORT_FIELD_DATE_MODIFIED);
        html     +=  '<th>Actions</th>';
        html     +=  '</tr></thead>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Single Table Row HTML
    // ------------------------------------------------------------
    function VghLantern__ProjectList__BuildTableRow(project) {
        var code          =  VghLantern__ProjectList__Escape(project.projectCode  || '');
        var nameRaw       =  project.projectName  || '';
        var clientRaw     =  project.clientName   || '';
        var docNameRaw    =  project.documentName || '';
        var name          =  VghLantern__ProjectList__Escape(nameRaw);
        var clientName    =  VghLantern__ProjectList__Escape(clientRaw);
        var docName       =  VghLantern__ProjectList__Escape(docNameRaw);
        var status        =  project.status || 'Draft';
        var dateCreated   =  VghLantern__ProjectList__FormatDate(project.dateCreated);
        var dateModified  =  VghLantern__ProjectList__FormatDate(project.dateModified);
        var lanternCount  =  Number(project.lanternCount || 0);                   // <-- Optional manifest hint
        var isEditing     =  (VghLantern__ProjectList__EditingCode === (project.projectCode || ''));

        var html  =  '<tr' + (isEditing ? ' class="VghLantern__DocManagement__TableRow--editing"' : '') + '>';
        html     +=  '<td>' + (code || '&mdash;') + '</td>';

        if (isEditing) {
            html  +=  '<td><input type="text" class="VghLantern__DocManagement__EditInput" data-field="projectName" value="' + name + '"></td>';
            html  +=  '<td><input type="text" class="VghLantern__DocManagement__EditInput" data-field="clientName" value="' + clientName + '"></td>';
            html  +=  '<td><input type="text" class="VghLantern__DocManagement__EditInput" data-field="documentName" value="' + docName + '"></td>';
            html  +=  '<td>' + VghLantern__ProjectList__BuildStatusSelect(status) + '</td>';
            html  +=  '<td>' + dateCreated  + '</td>';
            html  +=  '<td>' + dateModified + '</td>';
            html  +=  '<td>';
            html  +=      '<div class="VghLantern__DocManagement__RowActions">';
            html  +=          '<button class="VghLantern__DocManagement__RowBtn VghLantern__DocManagement__RowBtn--save" data-action="save-edit" data-code="' + code + '">Save</button>';
            html  +=          '<button class="VghLantern__DocManagement__RowBtn VghLantern__DocManagement__RowBtn--cancel" data-action="cancel-edit" data-code="' + code + '">Cancel</button>';
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
            html  +=  '<td>' + dateModified + '</td>';
            html  +=  '<td>';
            html  +=      '<div class="VghLantern__DocManagement__RowActions">';
            html  +=          '<button class="VghLantern__DocManagement__RowBtn" data-action="open" data-code="' + code + '">Open</button>';
            html  +=          '<button class="VghLantern__DocManagement__RowBtn" data-action="edit" data-code="' + code + '">Edit</button>';
            html  +=          '<button class="VghLantern__DocManagement__RowBtn VghLantern__DocManagement__RowBtn--delete" data-action="delete" data-code="' + code + '">Delete</button>';
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
        var config     =  VghLantern__ProjectList__EmptyStateConfig();
        var glyphHtml  =  config.Glyph || '&#128736;';                            // <-- Hammer and spanner default
        var titleText  =  VghLantern__ProjectList__Escape(config.Title || 'No Lantern Projects Yet');
        var bodyText   =  VghLantern__ProjectList__Escape(config.Text  || 'Create a new project to start configuring a roof lantern.');

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

        var config       =  VghLantern__ProjectList__TableConfig();
        var placeholder  =  VghLantern__ProjectList__Escape(config.SearchPlaceholder || 'Search lantern projects...');
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
    function VghLantern__ProjectList__SetEditingRow(projectCode) {
        VghLantern__ProjectList__EditingCode  =  projectCode || null;
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
