/* =============================================================================
   VALESPEC - DOCUMENT MANAGEMENT PROJECT LIST
   =============================================================================

   FILE       : ValeSpec__DocManagement__ProjectList__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocManagement - ProjectList
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render the project table into the Document Management mode panel
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Reads project manifest via ProjectFileManager.ValeSpec__ProjectFileManager__ListProjects()
   - Renders a full HTML table with project metadata columns
   - Sortable column headers (view-level sort; default newest Date Created first)
   - Status column renders a colour-coded pill badge
   - Each row provides Open and Delete action buttons
   - Renders an empty state placeholder when no projects exist
   - Subscribes to StateManager 'projectChanged' event for auto re-render

   ============================================================================= */

// =============================================================================
// REGION | Project List Module
// =============================================================================

const ValeSpec__DocManagement__ProjectList = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants — DOM Target, Status Map, and Sort Configuration
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Target ID
    // ------------------------------------------------------------
    const TABLE_CONTAINER_ID  =  'ValeSpec__DocManagement__TableContainer';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Status Badge CSS Class Mapping
    // ------------------------------------------------------------
    const STATUS_CLASS_MAP  =  {
        'Draft'              : 'ValeSpec__DocManagement__StatusBadge--draft',
        'In Progress'        : 'ValeSpec__DocManagement__StatusBadge--inProgress',
        'Pending Approval'   : 'ValeSpec__DocManagement__StatusBadge--pending',
        'Approved'           : 'ValeSpec__DocManagement__StatusBadge--approved',
        'Completed'          : 'ValeSpec__DocManagement__StatusBadge--completed'
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Sortable Column Field Keys and Defaults
    // ------------------------------------------------------------
    const SORT_FIELD_PROJECT_CODE   =  'projectCode';
    const SORT_FIELD_PROJECT_NAME   =  'projectName';
    const SORT_FIELD_DOCUMENT_NAME  =  'documentName';
    const SORT_FIELD_STATUS         =  'status';
    const SORT_FIELD_DATE_CREATED   =  'dateCreated';
    const SORT_FIELD_DATE_MODIFIED  =  'dateModified';
    const DEFAULT_SORT_FIELD        =  SORT_FIELD_DATE_CREATED;
    const DEFAULT_SORT_DIRECTION    =  'desc';

    const STATUS_SORT_ORDER = {
        'Draft'              : 1,
        'In Progress'        : 2,
        'Pending Approval'   : 3,
        'Approved'           : 4,
        'Completed'          : 5
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Current Table Sort State
    // ------------------------------------------------------------
    let ValeSpec__ProjectList__SortField      =  DEFAULT_SORT_FIELD;
    let ValeSpec__ProjectList__SortDirection  =  DEFAULT_SORT_DIRECTION;
    let ValeSpec__ProjectList__SearchQuery    =  '';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Display Helpers — Status Badge and Date Formatting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Status Badge HTML
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__BuildStatusBadge(status) {
        var cssClass  =  STATUS_CLASS_MAP[status] || STATUS_CLASS_MAP['Draft'];   // <-- Fallback to Draft style
        return '<span class="ValeSpec__DocManagement__StatusBadge ' + cssClass + '">' + status + '</span>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Date via DateFormatter Utility
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__FormatDate(dateStr) {
        if (!dateStr) return '—';
        if (window.ValeSpec__AppUtils__DateFormatter) {
            return window.ValeSpec__AppUtils__DateFormatter.ValeSpec__DateFormatter__FormatShort(dateStr);  // <-- "09 Apr 2026" format
        }
        return dateStr;                                                           // <-- Raw fallback if formatter unavailable
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sort Comparators — Field Validation, Primitives, and Row Compare
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Check Whether Sort Field is Allowed
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__IsSortableField(fieldName) {
        return (
            fieldName === SORT_FIELD_PROJECT_CODE  ||
            fieldName === SORT_FIELD_PROJECT_NAME  ||
            fieldName === SORT_FIELD_DOCUMENT_NAME ||
            fieldName === SORT_FIELD_STATUS        ||
            fieldName === SORT_FIELD_DATE_CREATED  ||
            fieldName === SORT_FIELD_DATE_MODIFIED
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compare Text Values with Numeric Awareness
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__CompareText(leftValue, rightValue) {
        var leftText   =  String(leftValue  || '').trim();
        var rightText  =  String(rightValue || '').trim();
        return leftText.localeCompare(rightText, undefined, { numeric: true, sensitivity: 'base' });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert Date Text to Sort Value
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__BuildDateSortValue(dateText) {
        if (!dateText) return 0;
        var parsedValue  =  Date.parse(dateText);
        if (isNaN(parsedValue)) return 0;
        return parsedValue;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compare Date Values
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__CompareDates(leftDateText, rightDateText) {
        var leftValue   =  ValeSpec__ProjectList__BuildDateSortValue(leftDateText);
        var rightValue  =  ValeSpec__ProjectList__BuildDateSortValue(rightDateText);
        if (leftValue === rightValue) return 0;
        return leftValue > rightValue ? 1 : -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compare Status Values by Workflow Order
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__CompareStatus(leftStatus, rightStatus) {
        var leftRank   =  STATUS_SORT_ORDER[leftStatus]  || 0;
        var rightRank  =  STATUS_SORT_ORDER[rightStatus] || 0;
        if (leftRank === rightRank) {
            return ValeSpec__ProjectList__CompareText(leftStatus, rightStatus);
        }
        return leftRank > rightRank ? 1 : -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Compare Two Project Records by Active Field
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__CompareProjectsByField(leftProject, rightProject, fieldName) {
        var left   =  leftProject  || {};
        var right  =  rightProject || {};

        if (fieldName === SORT_FIELD_DATE_CREATED || fieldName === SORT_FIELD_DATE_MODIFIED) {
            return ValeSpec__ProjectList__CompareDates(left[fieldName], right[fieldName]);
        }
        if (fieldName === SORT_FIELD_STATUS) {
            return ValeSpec__ProjectList__CompareStatus(left[fieldName], right[fieldName]);
        }
        return ValeSpec__ProjectList__CompareText(left[fieldName], right[fieldName]);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sortable Header Cell Markup
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Sortable Header Cell HTML
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__BuildSortableHeaderCell(labelText, fieldName) {
        var isActive      =  (ValeSpec__ProjectList__SortField === fieldName);
        var headerClass   =  isActive
            ? 'ValeSpec__DocManagement__SortableHeader ValeSpec__DocManagement__SortableHeader--active'
            : 'ValeSpec__DocManagement__SortableHeader';

        return '<th class="' + headerClass + '" data-sort-field="' + fieldName + '">' + labelText + '</th>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sorted Manifest and Table Fragment Builders
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Sorted Copy of Project Array
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__BuildSortedProjects(projects) {
        var list  =  Array.isArray(projects) ? projects.slice() : [];

        // Apply Search Filter
        if (ValeSpec__ProjectList__SearchQuery) {
            var query  =  ValeSpec__ProjectList__SearchQuery.toLowerCase();
            list  =  list.filter(function(project) {
                var code     =  String(project.projectCode || '').toLowerCase();
                var name     =  String(project.projectName || '').toLowerCase();
                var docName  =  String(project.documentName || '').toLowerCase();
                var status   =  String(project.status || '').toLowerCase();
                return code.indexOf(query) !== -1 ||
                       name.indexOf(query) !== -1 ||
                       docName.indexOf(query) !== -1 ||
                       status.indexOf(query) !== -1;
            });
        }

        if (!ValeSpec__ProjectList__IsSortableField(ValeSpec__ProjectList__SortField)) {
            ValeSpec__ProjectList__SortField      =  DEFAULT_SORT_FIELD;
            ValeSpec__ProjectList__SortDirection  =  DEFAULT_SORT_DIRECTION;
        }

        var sortDirectionFactor  =  (ValeSpec__ProjectList__SortDirection === 'asc') ? 1 : -1;
        list.sort(function(leftProject, rightProject) {
            var compareResult  =  ValeSpec__ProjectList__CompareProjectsByField(
                leftProject,
                rightProject,
                ValeSpec__ProjectList__SortField
            );
            return compareResult * sortDirectionFactor;
        });
        return list;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Table Header Row HTML
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__BuildTableHeader() {
        var html  =  '<thead><tr>';
        html     +=  ValeSpec__ProjectList__BuildSortableHeaderCell('Project Code', SORT_FIELD_PROJECT_CODE);
        html     +=  ValeSpec__ProjectList__BuildSortableHeaderCell('Project Name', SORT_FIELD_PROJECT_NAME);
        html     +=  ValeSpec__ProjectList__BuildSortableHeaderCell('Document Name', SORT_FIELD_DOCUMENT_NAME);
        html     +=  ValeSpec__ProjectList__BuildSortableHeaderCell('Status', SORT_FIELD_STATUS);
        html     +=  ValeSpec__ProjectList__BuildSortableHeaderCell('Date Created', SORT_FIELD_DATE_CREATED);
        html     +=  ValeSpec__ProjectList__BuildSortableHeaderCell('Last Modified', SORT_FIELD_DATE_MODIFIED);
        html     +=  '<th>Actions</th>';
        html     +=  '</tr></thead>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Single Table Row HTML
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__BuildTableRow(project) {
        var code          =  project.projectCode   || '—';                        // <-- Project code identifier
        var name          =  project.projectName   || '—';                        // <-- Human-readable project name
        var docName       =  project.documentName  || '—';                        // <-- Document title
        var status        =  project.status        || 'Draft';                    // <-- Workflow status
        var dateCreated   =  ValeSpec__ProjectList__FormatDate(project.dateCreated);   // <-- Formatted creation date
        var dateModified  =  ValeSpec__ProjectList__FormatDate(project.dateModified);  // <-- Formatted last-modified date

        var html  =  '<tr>';
        html     +=  '<td>' + code + '</td>';
        html     +=  '<td>' + name + '</td>';
        html     +=  '<td>' + docName + '</td>';
        html     +=  '<td>' + ValeSpec__ProjectList__BuildStatusBadge(status) + '</td>';
        html     +=  '<td>' + dateCreated + '</td>';
        html     +=  '<td>' + dateModified + '</td>';
        html     +=  '<td>';
        html     +=      '<div class="ValeSpec__DocManagement__RowActions">';
        html     +=          '<button class="ValeSpec__DocManagement__RowBtn" data-action="open" data-code="' + code + '">Open</button>';
        html     +=          '<button class="ValeSpec__DocManagement__RowBtn ValeSpec__DocManagement__RowBtn--delete" data-action="delete" data-code="' + code + '">Delete</button>';
        html     +=      '</div>';
        html     +=  '</td>';
        html     +=  '</tr>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Empty State Placeholder HTML
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__BuildEmptyState() {
        var html  =  '<div class="ValeSpec__DocManagement__EmptyState">';
        html     +=      '<div class="ValeSpec__DocManagement__EmptyState__Icon">&#128203;</div>';
        html     +=      '<div class="ValeSpec__DocManagement__EmptyState__Title">No Projects Yet</div>';
        html     +=      '<div class="ValeSpec__DocManagement__EmptyState__Text">';
        html     +=          'Create a new project to get started.';
        html     +=      '</div>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render Pipeline, State Subscription, and Sort Toggle
// -----------------------------------------------------------------------------

    // FUNCTION | Render Project Table into DOM
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__Render() {
        var container  =  document.getElementById(TABLE_CONTAINER_ID);
        var searchWrapper  =  document.getElementById('ValeSpec__DocManagement__SearchWrapper');
        
        if (!container) {
            console.warn('[ValeSpec__ProjectList] Container not found: #' + TABLE_CONTAINER_ID);
            return;
        }

        var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;  // <-- Reference to data layer
        if (!ProjectFileManager) {
            console.error('[ValeSpec__ProjectList] ProjectFileManager not available.');
            container.innerHTML  =  ValeSpec__ProjectList__BuildEmptyState();
            if (searchWrapper) searchWrapper.innerHTML = '';
            return;
        }

        var projects  =  ProjectFileManager.ValeSpec__ProjectFileManager__ListProjects();   // <-- Fetch project manifest array

        if (!projects || projects.length === 0) {
            container.innerHTML  =  ValeSpec__ProjectList__BuildEmptyState();               // <-- Show empty state when no projects
            if (searchWrapper) searchWrapper.innerHTML = '';
            return;
        }

        var sortedProjects  =  ValeSpec__ProjectList__BuildSortedProjects(projects);         // <-- Apply active table sort without mutating source array

        var searchWrapper  =  document.getElementById('ValeSpec__DocManagement__SearchWrapper');
        if (searchWrapper) {
            var searchHtml  =  '<div class="ValeSpec__DocManagement__SearchContainer">';
            searchHtml     +=      '<input type="text" id="ValeSpec__DocManagement__SearchInput" class="ValeSpec__DocManagement__SearchInput" placeholder="Search projects..." value="' + ValeSpec__ProjectList__SearchQuery.replace(/"/g, '&quot;') + '">';
            searchHtml     +=  '</div>';
            searchWrapper.innerHTML  =  searchHtml;

            var searchInput  =  document.getElementById('ValeSpec__DocManagement__SearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                    ValeSpec__ProjectList__SearchQuery  =  e.target.value;
                    ValeSpec__ProjectList__Render();
                });
                // Restore focus to end of input if we just re-rendered
                if (document.activeElement !== searchInput && ValeSpec__ProjectList__SearchQuery.length > 0) {
                    searchInput.focus();
                    var val = searchInput.value;
                    searchInput.value = '';
                    searchInput.value = val;
                }
            }
        }

        var html  =  '<table class="ValeSpec__DocManagement__Table">';
        html     +=  ValeSpec__ProjectList__BuildTableHeader();
        html     +=  '<tbody>';
        
        if (sortedProjects.length === 0) {
            html +=      '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--Vale_TextSecondary);">No projects match your search.</td></tr>';
        } else {
            for (var i = 0; i < sortedProjects.length; i++) {
                html  +=  ValeSpec__ProjectList__BuildTableRow(sortedProjects[i]);              // <-- Append each project row
            }
        }
        
        html     +=  '</tbody>';
        html     +=  '</table>';

        container.innerHTML  =  html;

        // Bind Sortable Headers
        var headers  =  container.querySelectorAll('.ValeSpec__DocManagement__SortableHeader');
        for (var h = 0; h < headers.length; h++) {
            headers[h].addEventListener('click', function(e) {
                var fieldName  =  e.currentTarget.getAttribute('data-sort-field');
                ValeSpec__ProjectList__ToggleSortByField(fieldName);
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to State Change Events
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__SubscribeToStateEvents() {
        if (window.ValeSpec__AppCore__StateManager) {
            window.ValeSpec__AppCore__StateManager.ValeSpec__StateManager__On('projectChanged', function() {
                ValeSpec__ProjectList__Render();                                           // <-- Re-render table on project change
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Toggle Sort by Field and Re-render Table
    // ------------------------------------------------------------
    function ValeSpec__ProjectList__ToggleSortByField(fieldName) {
        if (!ValeSpec__ProjectList__IsSortableField(fieldName)) return;

        if (ValeSpec__ProjectList__SortField === fieldName) {
            ValeSpec__ProjectList__SortDirection  =  (ValeSpec__ProjectList__SortDirection === 'asc') ? 'desc' : 'asc';
        } else {
            ValeSpec__ProjectList__SortField      =  fieldName;
            ValeSpec__ProjectList__SortDirection  =  'asc';
        }

        ValeSpec__ProjectList__Render();
    }
    // ------------------------------------------------------------


    // BOOT | Initial Subscription
    // ------------------------------------------------------------
    ValeSpec__ProjectList__SubscribeToStateEvents();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API — Exposed Module Surface
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__ProjectList__Render              : ValeSpec__ProjectList__Render,
        ValeSpec__ProjectList__ToggleSortByField   : ValeSpec__ProjectList__ToggleSortByField
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.ValeSpec__DocManagement__ProjectList  =  ValeSpec__DocManagement__ProjectList;
