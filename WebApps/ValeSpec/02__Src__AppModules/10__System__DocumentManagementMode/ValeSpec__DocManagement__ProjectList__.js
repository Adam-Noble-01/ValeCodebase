/* =============================================================================
   VALESPEC - DOCUMENT MANAGEMENT PROJECT LIST
   =============================================================================

   FILE       : ValeSpec__DocManagement__ProjectList__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocManagement - ProjectList
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render the project table into the Document Management mode panel
   CREATED    : 2026

   DESCRIPTION:
   - Reads project manifest via ProjectFileManager.listProjects()
   - Renders a full HTML table with project metadata columns
   - Status column renders a colour-coded pill badge
   - Each row provides Open and Delete action buttons
   - Renders an empty state placeholder when no projects exist
   - Subscribes to StateManager 'projectChanged' event for auto re-render

   ============================================================================= */

// =============================================================================
// REGION | Project List Module
// =============================================================================

const ValeSpec__DocManagement__ProjectList = (function() {

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


    // HELPER FUNCTION | Build Status Badge HTML
    // ------------------------------------------------------------
    function _buildStatusBadge(status) {
        var cssClass  =  STATUS_CLASS_MAP[status] || STATUS_CLASS_MAP['Draft'];   // <-- Fallback to Draft style
        return '<span class="ValeSpec__DocManagement__StatusBadge ' + cssClass + '">' + status + '</span>';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Format Date via DateFormatter Utility
    // ------------------------------------------------------------
    function _formatDate(dateStr) {
        if (!dateStr) return '—';
        if (window.ValeSpec__AppUtils__DateFormatter) {
            return window.ValeSpec__AppUtils__DateFormatter.formatShort(dateStr);  // <-- "09 Apr 2026" format
        }
        return dateStr;                                                           // <-- Raw fallback if formatter unavailable
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Table Header Row HTML
    // ------------------------------------------------------------
    function _buildTableHeader() {
        var html  =  '<thead><tr>';
        html     +=  '<th>Project Code</th>';
        html     +=  '<th>Project Name</th>';
        html     +=  '<th>Document Name</th>';
        html     +=  '<th>Status</th>';
        html     +=  '<th>Date Created</th>';
        html     +=  '<th>Last Modified</th>';
        html     +=  '<th>Actions</th>';
        html     +=  '</tr></thead>';
        return html;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Single Table Row HTML
    // ------------------------------------------------------------
    function _buildTableRow(project) {
        var code          =  project.projectCode   || '—';                        // <-- Project code identifier
        var name          =  project.projectName   || '—';                        // <-- Human-readable project name
        var docName       =  project.documentName  || '—';                        // <-- Document title
        var status        =  project.status        || 'Draft';                    // <-- Workflow status
        var dateCreated   =  _formatDate(project.dateCreated);                    // <-- Formatted creation date
        var dateModified  =  _formatDate(project.dateModified);                   // <-- Formatted last-modified date

        var html  =  '<tr>';
        html     +=  '<td>' + code + '</td>';
        html     +=  '<td>' + name + '</td>';
        html     +=  '<td>' + docName + '</td>';
        html     +=  '<td>' + _buildStatusBadge(status) + '</td>';
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
    function _buildEmptyState() {
        var html  =  '<div class="ValeSpec__DocManagement__EmptyState">';
        html     +=      '<div class="ValeSpec__DocManagement__EmptyState__Icon">&#128203;</div>';
        html     +=      '<div class="ValeSpec__DocManagement__EmptyState__Title">No Projects Yet</div>';
        html     +=      '<div class="ValeSpec__DocManagement__EmptyState__Text">';
        html     +=          'Create a new project or import an existing JSON file to get started.';
        html     +=      '</div>';
        html     +=  '</div>';
        return html;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Project Table into DOM
    // ------------------------------------------------------------
    function render() {
        var container  =  document.getElementById(TABLE_CONTAINER_ID);
        if (!container) {
            console.warn('[ValeSpec__ProjectList] Container not found: #' + TABLE_CONTAINER_ID);
            return;
        }

        var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;  // <-- Reference to data layer
        if (!ProjectFileManager) {
            console.error('[ValeSpec__ProjectList] ProjectFileManager not available.');
            container.innerHTML  =  _buildEmptyState();
            return;
        }

        var projects  =  ProjectFileManager.listProjects();                       // <-- Fetch project manifest array

        if (!projects || projects.length === 0) {
            container.innerHTML  =  _buildEmptyState();                           // <-- Show empty state when no projects
            return;
        }

        var html  =  '<table class="ValeSpec__DocManagement__Table">';
        html     +=  _buildTableHeader();
        html     +=  '<tbody>';
        for (var i = 0; i < projects.length; i++) {
            html  +=  _buildTableRow(projects[i]);                                // <-- Append each project row
        }
        html     +=  '</tbody>';
        html     +=  '</table>';

        container.innerHTML  =  html;
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to State Change Events
    // ------------------------------------------------------------
    function _subscribeToStateEvents() {
        if (window.ValeSpec__AppCore__StateManager) {
            window.ValeSpec__AppCore__StateManager.on('projectChanged', function() {
                render();                                                         // <-- Re-render table on project change
            });
        }
    }
    // ------------------------------------------------------------


    // BOOT | Initial Subscription
    // ------------------------------------------------------------
    _subscribeToStateEvents();
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        render  : render
    };

})();

// endregion ===================================================================

window.ValeSpec__DocManagement__ProjectList  =  ValeSpec__DocManagement__ProjectList;
