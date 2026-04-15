/* =============================================================================
   VALESPEC - DOCUMENT MANAGEMENT PROJECT ACTIONS
   =============================================================================

   FILE       : ValeSpec__DocManagement__ProjectActions__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocManagement - ProjectActions
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Action buttons and modal dialogs for project CRUD operations
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Renders the New Project button into the actions container
   - New Project opens a modal dialog for entering project metadata
   - Open action loads a project and switches to DocumentEditor mode
   - Delete action shows a confirmation modal before removing a project
   - Coordinates with ProjectFileManager, StateManager, and ModeManager

   ============================================================================= */

// =============================================================================
// REGION | Project Actions Module
// =============================================================================

const ValeSpec__DocManagement__ProjectActions = (function() {

    // MODULE CONSTANTS | DOM Target IDs
    // ------------------------------------------------------------
    const ACTIONS_CONTAINER_ID  =  'ValeSpec__DocManagement__Actions';            // <-- Button bar container
    const MODAL_ROOT_ID         =  'ValeSpec__Modal__Root';                       // <-- Modal overlay element
    const MODAL_TITLE_ID        =  'ValeSpec__Modal__TitleEl';                    // <-- Modal title element
    const MODAL_BODY_ID         =  'ValeSpec__Modal__BodyEl';                     // <-- Modal body element
    const MODAL_ACTIONS_ID      =  'ValeSpec__Modal__ActionsEl';                  // <-- Modal button row element
    // ------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Modal Dialog Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Show Modal Dialog
    // ------------------------------------------------------------
    function ValeSpec__ProjectActions__ShowModal(title, bodyHtml, actionsHtml) {
        var root       =  document.getElementById(MODAL_ROOT_ID);
        var titleEl    =  document.getElementById(MODAL_TITLE_ID);
        var bodyEl     =  document.getElementById(MODAL_BODY_ID);
        var actionsEl  =  document.getElementById(MODAL_ACTIONS_ID);

        if (!root || !titleEl || !bodyEl || !actionsEl) return;

        titleEl.textContent  =  title;
        bodyEl.innerHTML     =  bodyHtml;
        actionsEl.innerHTML  =  actionsHtml;

        root.classList.add('ValeSpec__Modal__Overlay--visible');                   // <-- Display the modal overlay
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hide Modal Dialog
    // ------------------------------------------------------------
    function ValeSpec__ProjectActions__HideModal() {
        var root  =  document.getElementById(MODAL_ROOT_ID);
        if (root) {
            root.classList.remove('ValeSpec__Modal__Overlay--visible');            // <-- Hide the modal overlay
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Re-render Project List Table
    // ------------------------------------------------------------
    function ValeSpec__ProjectActions__RefreshProjectList() {
        if (window.ValeSpec__DocManagement__ProjectList) {
            window.ValeSpec__DocManagement__ProjectList.ValeSpec__ProjectList__Render();   // <-- Delegate to ProjectList module
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | New Project Flow
// -----------------------------------------------------------------------------

    // FUNCTION | Handle New Project Button Click
    // ------------------------------------------------------------
    function ValeSpec__ProjectActions__OnNewProjectClick() {
        var bodyHtml  =  '';
        bodyHtml     +=  '<label style="display:block; margin-bottom:4px; font-weight:600; font-size:var(--Vale_FontSize_Small);">Project Code</label>';
        bodyHtml     +=  '<input id="ValeSpec__Modal__InputProjectCode" class="ValeSpec__Modal__Input" type="text" placeholder="e.g. 2526">';
        bodyHtml     +=  '<label style="display:block; margin-bottom:4px; font-weight:600; font-size:var(--Vale_FontSize_Small);">Project Name</label>';
        bodyHtml     +=  '<input id="ValeSpec__Modal__InputProjectName" class="ValeSpec__Modal__Input" type="text" placeholder="e.g. Jones-Smith">';
        bodyHtml     +=  '<label style="display:block; margin-bottom:4px; font-weight:600; font-size:var(--Vale_FontSize_Small);">Document Name</label>';
        bodyHtml     +=  '<input id="ValeSpec__Modal__InputDocumentName" class="ValeSpec__Modal__Input" type="text" placeholder="e.g. Orangery / Doors / Extras etc.">';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="ValeSpec__Modal__BtnCancel" class="ValeSpec__Modal__BtnSecondary">Cancel</button>';
        actionsHtml     +=  '<button id="ValeSpec__Modal__BtnConfirm" class="ValeSpec__Modal__BtnPrimary">Create Project</button>';

        ValeSpec__ProjectActions__ShowModal('New Project', bodyHtml, actionsHtml);

        setTimeout(function() {
            var cancelBtn   =  document.getElementById('ValeSpec__Modal__BtnCancel');
            var confirmBtn  =  document.getElementById('ValeSpec__Modal__BtnConfirm');

            if (cancelBtn)  cancelBtn.addEventListener('click', ValeSpec__ProjectActions__HideModal);
            if (confirmBtn) confirmBtn.addEventListener('click', ValeSpec__ProjectActions__OnConfirmNewProject);
        }, 0);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Confirm New Project Creation from Modal
    // ------------------------------------------------------------
    function ValeSpec__ProjectActions__OnConfirmNewProject() {
        var codeInput  =  document.getElementById('ValeSpec__Modal__InputProjectCode');
        var nameInput  =  document.getElementById('ValeSpec__Modal__InputProjectName');
        var docInput   =  document.getElementById('ValeSpec__Modal__InputDocumentName');

        var projectCode   =  codeInput ? codeInput.value.trim() : '';
        var projectName   =  nameInput ? nameInput.value.trim() : '';
        var documentName  =  docInput  ? docInput.value.trim()  : '';

        if (!projectCode || !projectName) {
            console.warn('[ValeSpec__ProjectActions] Project Code and Name are required.');
            return;                                                               // <-- Abort if required fields empty
        }

        var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;
        var StateManager        =  window.ValeSpec__AppCore__StateManager;
        var ModeManager         =  window.ValeSpec__AppCore__ModeManager;

        if (!ProjectFileManager) return;

        var projectData  =  ProjectFileManager.ValeSpec__ProjectFileManager__CreateProject(projectCode, projectName, documentName);

        if (StateManager && projectData) {
            StateManager.ValeSpec__StateManager__SetCurrentProject(projectData);  // <-- Set new project as active
        }

        ValeSpec__ProjectActions__HideModal();
        ValeSpec__ProjectActions__RefreshProjectList();

        if (ModeManager) {
            ModeManager.ValeSpec__ModeManager__SwitchToMode('DocumentEditor');    // <-- Navigate to Document Editor
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project Row Actions - Open and Delete
// -----------------------------------------------------------------------------

    // FUNCTION | Handle Open Project Row Action
    // ------------------------------------------------------------
    function ValeSpec__ProjectActions__OpenProject(projectCode) {
        var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;
        var StateManager        =  window.ValeSpec__AppCore__StateManager;
        var ModeManager         =  window.ValeSpec__AppCore__ModeManager;

        if (!ProjectFileManager) return;

        var projectData  =  ProjectFileManager.ValeSpec__ProjectFileManager__LoadProject(projectCode);   // <-- Load from localStorage
        if (!projectData) {
            console.warn('[ValeSpec__ProjectActions] Could not load project: ' + projectCode);
            return;
        }

        if (StateManager) {
            StateManager.ValeSpec__StateManager__SetCurrentProject(projectData);  // <-- Store in application state
        }

        if (ModeManager) {
            ModeManager.ValeSpec__ModeManager__SwitchToMode('DocumentEditor');    // <-- Navigate to Document Editor
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Delete Project Row Action
    // ------------------------------------------------------------
    function ValeSpec__ProjectActions__DeleteProject(projectCode) {
        var bodyHtml  =  '<p>Are you sure you want to delete project <strong>' + projectCode + '</strong>?</p>';
        bodyHtml     +=  '<p style="margin-top:8px; color:var(--ValeSpec_ErrorRed);">This action cannot be undone.</p>';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="ValeSpec__Modal__BtnCancel" class="ValeSpec__Modal__BtnSecondary">Cancel</button>';
        actionsHtml     +=  '<button id="ValeSpec__Modal__BtnConfirmDelete" class="ValeSpec__Modal__BtnPrimary" style="background:var(--ValeSpec_ErrorRed);">Delete</button>';

        ValeSpec__ProjectActions__ShowModal('Delete Project', bodyHtml, actionsHtml);

        setTimeout(function() {
            var cancelBtn   =  document.getElementById('ValeSpec__Modal__BtnCancel');
            var confirmBtn  =  document.getElementById('ValeSpec__Modal__BtnConfirmDelete');

            if (cancelBtn)  cancelBtn.addEventListener('click', ValeSpec__ProjectActions__HideModal);
            if (confirmBtn) confirmBtn.addEventListener('click', function() {
                var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;
                if (ProjectFileManager) {
                    ProjectFileManager.ValeSpec__ProjectFileManager__DeleteProject(projectCode); // <-- Remove from localStorage
                }
                ValeSpec__ProjectActions__HideModal();
                ValeSpec__ProjectActions__RefreshProjectList();                                  // <-- Refresh table after delete
            });
        }, 0);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render and Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Render Action Buttons into DOM
    // ------------------------------------------------------------
    function ValeSpec__ProjectActions__Render() {
        var container  =  document.getElementById(ACTIONS_CONTAINER_ID);
        if (!container) {
            console.warn('[ValeSpec__ProjectActions] Container not found: #' + ACTIONS_CONTAINER_ID);
            return;
        }

        var html  =  '';
        html     +=  '<button id="ValeSpec__DocManagement__BtnNewProject" class="ValeSpec__DocManagement__BtnPrimary">+ New Project</button>';

        container.innerHTML  =  html;

        var newBtn  =  document.getElementById('ValeSpec__DocManagement__BtnNewProject');

        if (newBtn) newBtn.addEventListener('click', ValeSpec__ProjectActions__OnNewProjectClick);      // <-- Bind New Project handler
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind Table Row Action Event Delegation
    // ------------------------------------------------------------
    function ValeSpec__ProjectActions__BindTableRowActions() {
        var tableContainer  =  document.getElementById('ValeSpec__DocManagement__TableContainer');
        if (!tableContainer) return;

        tableContainer.addEventListener('click', function(e) {
            var btn  =  e.target.closest('.ValeSpec__DocManagement__RowBtn');
            if (!btn) return;

            var action  =  btn.dataset.action;                                    // <-- "open" or "delete"
            var code    =  btn.dataset.code;                                      // <-- Project code from data attribute
            if (!action || !code) return;

            if (action === 'open')   ValeSpec__ProjectActions__OpenProject(code);
            if (action === 'delete') ValeSpec__ProjectActions__DeleteProject(code);
        });
    }
    // ------------------------------------------------------------


    // BOOT | Render Buttons and Bind Listeners When DOM is Ready
    // ------------------------------------------------------------
    function ValeSpec__ProjectActions__Init() {
        ValeSpec__ProjectActions__Render();
        ValeSpec__ProjectActions__BindTableRowActions();

        if (window.ValeSpec__DocManagement__ProjectList) {
            window.ValeSpec__DocManagement__ProjectList.ValeSpec__ProjectList__Render();   // <-- Initial table render
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ValeSpec__ProjectActions__Init);
    } else {
        ValeSpec__ProjectActions__Init();
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__ProjectActions__Render        : ValeSpec__ProjectActions__Render,
        ValeSpec__ProjectActions__OpenProject   : ValeSpec__ProjectActions__OpenProject,
        ValeSpec__ProjectActions__DeleteProject : ValeSpec__ProjectActions__DeleteProject
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.ValeSpec__DocManagement__ProjectActions  =  ValeSpec__DocManagement__ProjectActions;
