/* =============================================================================
   VGHLANTERN - DOCUMENT MANAGEMENT PROJECT ACTIONS
   =============================================================================

   FILE       : VghLantern__DocManagement__ProjectActions__.js
   NAMESPACE  : VghLantern
   MODULE     : DocManagement - ProjectActions
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Action buttons and modal dialogs for lantern project CRUD
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Renders the "+ New Project" button into the actions container
   - New Project opens a modal for entering project metadata
   - Open action loads a project and switches to the Lantern Editor mode
   - Delete action shows a confirmation modal before removing a project
   - Owns the single delegated click listener on the table container, covering
     both sortable headers and row action buttons
   - Coordinates with ProjectFileManager, StateManager, and ModeManager

   -----------------------------------------------------------------------------

   WHY DELEGATION LIVES HERE:
   ProjectList rewrites the table's innerHTML on every render, so per-element
   listeners would be lost. One delegated listener bound once to the container
   survives every redraw.

   ============================================================================= */

// =============================================================================
// REGION | Project Actions Module
// =============================================================================

const VghLantern__DocManagement__ProjectActions = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants - DOM Target IDs
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Target IDs
    // ------------------------------------------------------------
    const ACTIONS_CONTAINER_ID  =  'VghLantern__DocManagement__Actions';          // <-- Button bar container
    const TABLE_CONTAINER_ID    =  'VghLantern__DocManagement__TableContainer';   // <-- Delegation root
    const MODAL_ROOT_ID         =  'VghLantern__Modal__Root';                     // <-- Modal overlay element
    const MODAL_TITLE_ID        =  'VghLantern__Modal__TitleEl';                  // <-- Modal title element
    const MODAL_BODY_ID         =  'VghLantern__Modal__BodyEl';                   // <-- Modal body element
    const MODAL_ACTIONS_ID      =  'VghLantern__Modal__ActionsEl';                // <-- Modal button row element
    const MODAL_VISIBLE_CLASS   =  'VghLantern__Modal__Overlay--visible';         // <-- Shown-state class
    // ------------------------------------------------------------


    // MODULE VARIABLES | Delegation Bind Guard
    // ------------------------------------------------------------
    let VghLantern__ProjectActions__IsDelegationBound  =  false;                  // <-- Prevents duplicate listeners
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access and Modal Dialog Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the New Project Config Block
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__NewProjectConfig() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return {};

        var appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return {};

        return appConfig['VghLantern__DocManagement__Config__NewProject'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show Modal Dialog
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__ShowModal(title, bodyHtml, actionsHtml) {
        var root       =  document.getElementById(MODAL_ROOT_ID);
        var titleEl    =  document.getElementById(MODAL_TITLE_ID);
        var bodyEl     =  document.getElementById(MODAL_BODY_ID);
        var actionsEl  =  document.getElementById(MODAL_ACTIONS_ID);

        if (!root || !titleEl || !bodyEl || !actionsEl) return;

        titleEl.textContent  =  title;
        bodyEl.innerHTML     =  bodyHtml;
        actionsEl.innerHTML  =  actionsHtml;

        root.classList.add(MODAL_VISIBLE_CLASS);                                  // <-- Display the modal overlay
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hide Modal Dialog
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__HideModal() {
        var root  =  document.getElementById(MODAL_ROOT_ID);
        if (root) root.classList.remove(MODAL_VISIBLE_CLASS);                     // <-- Hide the modal overlay
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Re-render Project List Table
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__RefreshProjectList() {
        var ProjectList  =  window.VghLantern__DocManagement__ProjectList;
        if (ProjectList) ProjectList.VghLantern__ProjectList__Render();            // <-- Delegate to the list module
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Raise a Toast Notification When Available
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__Toast(message, variantKey) {
        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast && Toast.VghLantern__Toast__Show) {
            Toast.VghLantern__Toast__Show(message, variantKey);
            return;
        }
        console.info('[VghLantern ProjectActions] ' + message);                    // <-- Console fallback
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build a Labelled Modal Text Input Row
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__BuildInputRow(labelText, inputId, placeholderText) {
        var html  =  '<label class="VghLantern__Modal__Label" for="' + inputId + '">' + labelText + '</label>';
        html     +=  '<input id="' + inputId + '" class="VghLantern__Modal__Input" type="text"';
        html     +=      ' autocomplete="off" data-vghlantern-noautofill="true"';
        html     +=      ' placeholder="' + placeholderText + '">';
        return html;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | New Project Flow
// -----------------------------------------------------------------------------

    // FUNCTION | Handle New Project Button Click
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OnNewProjectClick() {
        var config  =  VghLantern__ProjectActions__NewProjectConfig();

        var bodyHtml  =  '';
        bodyHtml     +=  VghLantern__ProjectActions__BuildInputRow(
            'Project Code',  'VghLantern__Modal__InputProjectCode',  config.PlaceholderProjectCode  || 'e.g. 2601');
        bodyHtml     +=  VghLantern__ProjectActions__BuildInputRow(
            'Project Name',  'VghLantern__Modal__InputProjectName',  config.PlaceholderProjectName  || 'e.g. Jones-Smith');
        bodyHtml     +=  VghLantern__ProjectActions__BuildInputRow(
            'Document Name', 'VghLantern__Modal__InputDocumentName', config.PlaceholderDocumentName || 'e.g. Orangery Roof Lantern');
        bodyHtml     +=  '<div id="VghLantern__Modal__ValidationMsg" class="VghLantern__Modal__ValidationMsg"></div>';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnCancel" class="VghLantern__Modal__BtnSecondary">Cancel</button>';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnConfirm" class="VghLantern__Modal__BtnPrimary">Create Project</button>';

        VghLantern__ProjectActions__ShowModal('New Lantern Project', bodyHtml, actionsHtml);

        var cancelBtn   =  document.getElementById('VghLantern__Modal__BtnCancel');
        var confirmBtn  =  document.getElementById('VghLantern__Modal__BtnConfirm');
        var codeInput   =  document.getElementById('VghLantern__Modal__InputProjectCode');

        if (cancelBtn)  cancelBtn.addEventListener('click', VghLantern__ProjectActions__HideModal);
        if (confirmBtn) confirmBtn.addEventListener('click', VghLantern__ProjectActions__OnConfirmNewProject);
        if (codeInput)  codeInput.focus();                                        // <-- Land the caret on the first field
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Show Inline Validation Message in the Modal
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__ShowValidationMessage(message) {
        var target  =  document.getElementById('VghLantern__Modal__ValidationMsg');
        if (target) target.textContent  =  message;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Confirm New Project Creation from Modal
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OnConfirmNewProject() {
        var codeInput  =  document.getElementById('VghLantern__Modal__InputProjectCode');
        var nameInput  =  document.getElementById('VghLantern__Modal__InputProjectName');
        var docInput   =  document.getElementById('VghLantern__Modal__InputDocumentName');

        var projectCode   =  codeInput ? codeInput.value.trim() : '';
        var projectName   =  nameInput ? nameInput.value.trim() : '';
        var documentName  =  docInput  ? docInput.value.trim()  : '';

        if (!projectCode || !projectName) {
            VghLantern__ProjectActions__ShowValidationMessage('Project Code and Project Name are both required.');
            return;                                                               // <-- Abort while required fields are empty
        }

        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var StateManager        =  window.VghLantern__AppCore__StateManager;
        var ModeManager         =  window.VghLantern__AppCore__ModeManager;

        if (!ProjectFileManager) {
            VghLantern__ProjectActions__ShowValidationMessage('Project storage is unavailable.');
            return;
        }

        var existing  =  ProjectFileManager.VghLantern__ProjectFileManager__LoadProject(projectCode);
        if (existing) {
            VghLantern__ProjectActions__ShowValidationMessage('Project code ' + projectCode + ' already exists.');
            return;                                                               // <-- Never silently overwrite
        }

        var projectData  =  ProjectFileManager.VghLantern__ProjectFileManager__CreateProject(
            projectCode, projectName, documentName);

        if (!projectData) {
            VghLantern__ProjectActions__ShowValidationMessage('Could not create the project. See the console for detail.');
            return;
        }

        if (StateManager) {
            StateManager.VghLantern__StateManager__SetCurrentProject(projectData); // <-- Make the new project active
        }

        VghLantern__ProjectActions__HideModal();
        VghLantern__ProjectActions__RefreshProjectList();
        VghLantern__ProjectActions__Toast('Project ' + projectCode + ' created.', 'success');

        if (ModeManager) {
            var config      =  VghLantern__ProjectActions__NewProjectConfig();
            var landingMode =  config.LandingModeKey || 'LanternEditor';
            ModeManager.VghLantern__ModeManager__SwitchToMode(landingMode);        // <-- Straight into the Lantern Editor
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Row Actions - Open and Delete
// -----------------------------------------------------------------------------

    // FUNCTION | Handle Open Project Row Action
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OpenProject(projectCode) {
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var StateManager        =  window.VghLantern__AppCore__StateManager;
        var ModeManager         =  window.VghLantern__AppCore__ModeManager;

        if (!ProjectFileManager) return;

        var projectData  =  ProjectFileManager.VghLantern__ProjectFileManager__LoadProject(projectCode);
        if (!projectData) {
            VghLantern__ProjectActions__Toast('Could not load project ' + projectCode + '.', 'error');
            return;
        }

        if (StateManager) {
            StateManager.VghLantern__StateManager__SetCurrentProject(projectData); // <-- Publish to application state
        }

        if (ModeManager) {
            var config      =  VghLantern__ProjectActions__NewProjectConfig();
            var landingMode =  config.LandingModeKey || 'LanternEditor';
            ModeManager.VghLantern__ModeManager__SwitchToMode(landingMode);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Delete Project Row Action
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__DeleteProject(projectCode) {
        var bodyHtml  =  '<p>Delete project <strong>' + projectCode + '</strong>?</p>';
        bodyHtml     +=  '<p class="VghLantern__Modal__DangerNote">This removes the project file and cannot be undone.</p>';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnCancel" class="VghLantern__Modal__BtnSecondary">Cancel</button>';
        actionsHtml     +=  '<button id="VghLantern__Modal__BtnConfirmDelete" class="VghLantern__Modal__BtnDanger">Delete</button>';

        VghLantern__ProjectActions__ShowModal('Delete Project', bodyHtml, actionsHtml);

        var cancelBtn   =  document.getElementById('VghLantern__Modal__BtnCancel');
        var confirmBtn  =  document.getElementById('VghLantern__Modal__BtnConfirmDelete');

        if (cancelBtn) cancelBtn.addEventListener('click', VghLantern__ProjectActions__HideModal);

        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                VghLantern__ProjectActions__CommitDelete(projectCode);
            });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Commit the Delete and Clear State If It Was Active
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__CommitDelete(projectCode) {
        var ProjectFileManager  =  window.VghLantern__AppData__ProjectFileManager;
        var StateManager        =  window.VghLantern__AppCore__StateManager;

        if (ProjectFileManager) {
            ProjectFileManager.VghLantern__ProjectFileManager__DeleteProject(projectCode);
        }

        if (StateManager) {
            var current  =  StateManager.VghLantern__StateManager__GetCurrentProject();
            var currentCode  =  current && current['VghLantern__ProjectFile__Metadata']
                ? current['VghLantern__ProjectFile__Metadata']['ProjectCode']
                : '';

            if (currentCode === projectCode) {
                StateManager.VghLantern__StateManager__SetCurrentProject(null);    // <-- Drop the deleted project from state
            }
        }

        VghLantern__ProjectActions__HideModal();
        VghLantern__ProjectActions__RefreshProjectList();
        VghLantern__ProjectActions__Toast('Project ' + projectCode + ' deleted.', 'info');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Render, Delegation, and Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Render Action Buttons into DOM
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__Render() {
        var container  =  document.getElementById(ACTIONS_CONTAINER_ID);
        if (!container) {
            console.warn('[VghLantern ProjectActions] Container not found: #' + ACTIONS_CONTAINER_ID);
            return;
        }

        container.innerHTML  =
            '<button id="VghLantern__DocManagement__BtnNewProject" class="VghLantern__DocManagement__BtnPrimary">+ New Project</button>';

        var newBtn  =  document.getElementById('VghLantern__DocManagement__BtnNewProject');
        if (newBtn) newBtn.addEventListener('click', VghLantern__ProjectActions__OnNewProjectClick);
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind One Delegated Click Listener on the Table Container
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__BindTableRowActions() {
        if (VghLantern__ProjectActions__IsDelegationBound) return;                // <-- Bind exactly once

        var tableContainer  =  document.getElementById(TABLE_CONTAINER_ID);
        if (!tableContainer) return;

        tableContainer.addEventListener('click', VghLantern__ProjectActions__OnTableClick);
        VghLantern__ProjectActions__IsDelegationBound  =  true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Route a Delegated Table Click to Sort or Row Action
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__OnTableClick(event) {
        var sortableHeader  =  event.target.closest('.VghLantern__DocManagement__SortableHeader');
        if (sortableHeader) {
            var sortField    =  sortableHeader.getAttribute('data-sort-field');
            var ProjectList  =  window.VghLantern__DocManagement__ProjectList;
            if (ProjectList && sortField) {
                ProjectList.VghLantern__ProjectList__ToggleSortByField(sortField);
            }
            return;
        }

        var btn  =  event.target.closest('.VghLantern__DocManagement__RowBtn');
        if (!btn) return;

        var action  =  btn.getAttribute('data-action');                           // <-- 'open' or 'delete'
        var code    =  btn.getAttribute('data-code');                             // <-- Project code from the row
        if (!action || !code) return;

        if (action === 'open')   VghLantern__ProjectActions__OpenProject(code);
        if (action === 'delete') VghLantern__ProjectActions__DeleteProject(code);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Buttons, Delegation, and First Table Render
    // ------------------------------------------------------------
    function VghLantern__ProjectActions__Init() {
        VghLantern__ProjectActions__Render();
        VghLantern__ProjectActions__BindTableRowActions();
        VghLantern__ProjectActions__RefreshProjectList();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ProjectActions__Init          : VghLantern__ProjectActions__Init,
        VghLantern__ProjectActions__Render        : VghLantern__ProjectActions__Render,
        VghLantern__ProjectActions__OpenProject   : VghLantern__ProjectActions__OpenProject,
        VghLantern__ProjectActions__DeleteProject : VghLantern__ProjectActions__DeleteProject,
        VghLantern__ProjectActions__HideModal     : VghLantern__ProjectActions__HideModal
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocManagement__ProjectActions  =  VghLantern__DocManagement__ProjectActions;
