/* =============================================================================
   VALESPEC - DOCUMENT MANAGEMENT PROJECT ACTIONS
   =============================================================================

   FILE       : ValeSpec__DocManagement__ProjectActions__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocManagement - ProjectActions
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Action buttons and modal dialogs for project CRUD operations
   CREATED    : 2026

   DESCRIPTION:
   - Renders New Project and Import JSON buttons into the actions container
   - New Project opens a modal dialog for entering project metadata
   - Import button triggers a hidden file input for .json import
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


    // HELPER FUNCTION | Show Modal Dialog
    // ------------------------------------------------------------
    function _showModal(title, bodyHtml, actionsHtml) {
        var root        =  document.getElementById(MODAL_ROOT_ID);
        var titleEl     =  document.getElementById(MODAL_TITLE_ID);
        var bodyEl      =  document.getElementById(MODAL_BODY_ID);
        var actionsEl   =  document.getElementById(MODAL_ACTIONS_ID);

        if (!root || !titleEl || !bodyEl || !actionsEl) return;

        titleEl.textContent  =  title;
        bodyEl.innerHTML     =  bodyHtml;
        actionsEl.innerHTML  =  actionsHtml;

        root.classList.add('ValeSpec__Modal__Overlay--visible');                   // <-- Display the modal overlay
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hide Modal Dialog
    // ------------------------------------------------------------
    function _hideModal() {
        var root  =  document.getElementById(MODAL_ROOT_ID);
        if (root) {
            root.classList.remove('ValeSpec__Modal__Overlay--visible');            // <-- Hide the modal overlay
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Re-render Project List Table
    // ------------------------------------------------------------
    function _refreshProjectList() {
        if (window.ValeSpec__DocManagement__ProjectList) {
            window.ValeSpec__DocManagement__ProjectList.render();                  // <-- Delegate to ProjectList module
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle New Project Button Click
    // ------------------------------------------------------------
    function _onNewProjectClick() {
        var bodyHtml  =  '';
        bodyHtml     +=  '<label style="display:block; margin-bottom:4px; font-weight:600; font-size:var(--Vale_FontSize_Small);">Project Code</label>';
        bodyHtml     +=  '<input id="ValeSpec__Modal__InputProjectCode" class="ValeSpec__Modal__Input" type="text" placeholder="e.g. PRJ-001">';
        bodyHtml     +=  '<label style="display:block; margin-bottom:4px; font-weight:600; font-size:var(--Vale_FontSize_Small);">Project Name</label>';
        bodyHtml     +=  '<input id="ValeSpec__Modal__InputProjectName" class="ValeSpec__Modal__Input" type="text" placeholder="e.g. Oak Lodge">';
        bodyHtml     +=  '<label style="display:block; margin-bottom:4px; font-weight:600; font-size:var(--Vale_FontSize_Small);">Document Name</label>';
        bodyHtml     +=  '<input id="ValeSpec__Modal__InputDocumentName" class="ValeSpec__Modal__Input" type="text" placeholder="e.g. Oak Lodge Doors">';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="ValeSpec__Modal__BtnCancel" class="ValeSpec__Modal__BtnSecondary">Cancel</button>';
        actionsHtml     +=  '<button id="ValeSpec__Modal__BtnConfirm" class="ValeSpec__Modal__BtnPrimary">Create Project</button>';

        _showModal('New Project', bodyHtml, actionsHtml);

        setTimeout(function() {
            var cancelBtn   =  document.getElementById('ValeSpec__Modal__BtnCancel');
            var confirmBtn  =  document.getElementById('ValeSpec__Modal__BtnConfirm');

            if (cancelBtn)  cancelBtn.addEventListener('click', _hideModal);
            if (confirmBtn) confirmBtn.addEventListener('click', _onConfirmNewProject);
        }, 0);
    }
    // ------------------------------------------------------------


    // FUNCTION | Confirm New Project Creation from Modal
    // ------------------------------------------------------------
    function _onConfirmNewProject() {
        var codeInput  =  document.getElementById('ValeSpec__Modal__InputProjectCode');
        var nameInput  =  document.getElementById('ValeSpec__Modal__InputProjectName');
        var docInput   =  document.getElementById('ValeSpec__Modal__InputDocumentName');

        var projectCode    =  codeInput ? codeInput.value.trim() : '';
        var projectName    =  nameInput ? nameInput.value.trim() : '';
        var documentName   =  docInput  ? docInput.value.trim()  : '';

        if (!projectCode || !projectName) {
            console.warn('[ValeSpec__ProjectActions] Project Code and Name are required.');
            return;                                                               // <-- Abort if required fields empty
        }

        var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;
        var StateManager        =  window.ValeSpec__AppCore__StateManager;
        var ModeManager         =  window.ValeSpec__AppCore__ModeManager;

        if (!ProjectFileManager) return;

        var projectData  =  ProjectFileManager.createProject(projectCode, projectName, documentName);

        if (StateManager && projectData) {
            StateManager.setCurrentProject(projectData);                          // <-- Set new project as active
        }

        _hideModal();
        _refreshProjectList();

        if (ModeManager) {
            ModeManager.switchToMode('DocumentEditor');                           // <-- Navigate to Document Editor
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Import JSON Button Click
    // ------------------------------------------------------------
    function _onImportClick() {
        var fileInput       =  document.createElement('input');
        fileInput.type      =  'file';
        fileInput.accept    =  '.json';
        fileInput.style.display  =  'none';

        fileInput.addEventListener('change', function(e) {
            var file  =  e.target.files[0];
            if (!file) return;

            var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;
            if (!ProjectFileManager) return;

            ProjectFileManager.importProjectFromJson(file)
                .then(function(projectData) {
                    console.log('[ValeSpec__ProjectActions] Project imported successfully.');
                    _refreshProjectList();                                        // <-- Refresh table after import
                })
                .catch(function(err) {
                    console.error('[ValeSpec__ProjectActions] Import failed:', err);
                });

            fileInput.remove();                                                   // <-- Clean up hidden input
        });

        document.body.appendChild(fileInput);
        fileInput.click();                                                        // <-- Trigger file browser dialog
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Open Project Row Action
    // ------------------------------------------------------------
    function openProject(projectCode) {
        var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;
        var StateManager        =  window.ValeSpec__AppCore__StateManager;
        var ModeManager         =  window.ValeSpec__AppCore__ModeManager;

        if (!ProjectFileManager) return;

        var projectData  =  ProjectFileManager.loadProject(projectCode);          // <-- Load from localStorage
        if (!projectData) {
            console.warn('[ValeSpec__ProjectActions] Could not load project: ' + projectCode);
            return;
        }

        if (StateManager) {
            StateManager.setCurrentProject(projectData);                          // <-- Store in application state
        }

        if (ModeManager) {
            ModeManager.switchToMode('DocumentEditor');                           // <-- Navigate to Document Editor
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Delete Project Row Action
    // ------------------------------------------------------------
    function deleteProject(projectCode) {
        var bodyHtml  =  '<p>Are you sure you want to delete project <strong>' + projectCode + '</strong>?</p>';
        bodyHtml     +=  '<p style="margin-top:8px; color:var(--ValeSpec_ErrorRed);">This action cannot be undone.</p>';

        var actionsHtml  =  '';
        actionsHtml     +=  '<button id="ValeSpec__Modal__BtnCancel" class="ValeSpec__Modal__BtnSecondary">Cancel</button>';
        actionsHtml     +=  '<button id="ValeSpec__Modal__BtnConfirmDelete" class="ValeSpec__Modal__BtnPrimary" style="background:var(--ValeSpec_ErrorRed);">Delete</button>';

        _showModal('Delete Project', bodyHtml, actionsHtml);

        setTimeout(function() {
            var cancelBtn   =  document.getElementById('ValeSpec__Modal__BtnCancel');
            var confirmBtn  =  document.getElementById('ValeSpec__Modal__BtnConfirmDelete');

            if (cancelBtn)  cancelBtn.addEventListener('click', _hideModal);
            if (confirmBtn) confirmBtn.addEventListener('click', function() {
                var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;
                if (ProjectFileManager) {
                    ProjectFileManager.deleteProject(projectCode);                // <-- Remove from localStorage
                }
                _hideModal();
                _refreshProjectList();                                            // <-- Refresh table after delete
            });
        }, 0);
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Action Buttons into DOM
    // ------------------------------------------------------------
    function render() {
        var container  =  document.getElementById(ACTIONS_CONTAINER_ID);
        if (!container) {
            console.warn('[ValeSpec__ProjectActions] Container not found: #' + ACTIONS_CONTAINER_ID);
            return;
        }

        var html  =  '';
        html     +=  '<button id="ValeSpec__DocManagement__BtnNewProject" class="ValeSpec__DocManagement__BtnPrimary">+ New Project</button>';
        html     +=  '<button id="ValeSpec__DocManagement__BtnImport" class="ValeSpec__DocManagement__BtnSecondary">Import JSON</button>';

        container.innerHTML  =  html;

        var newBtn     =  document.getElementById('ValeSpec__DocManagement__BtnNewProject');
        var importBtn  =  document.getElementById('ValeSpec__DocManagement__BtnImport');

        if (newBtn)    newBtn.addEventListener('click', _onNewProjectClick);       // <-- Bind New Project handler
        if (importBtn) importBtn.addEventListener('click', _onImportClick);        // <-- Bind Import handler
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind Table Row Action Event Delegation
    // ------------------------------------------------------------
    function _bindTableRowActions() {
        var tableContainer  =  document.getElementById('ValeSpec__DocManagement__TableContainer');
        if (!tableContainer) return;

        tableContainer.addEventListener('click', function(e) {
            var btn  =  e.target.closest('.ValeSpec__DocManagement__RowBtn');
            if (!btn) return;

            var action  =  btn.dataset.action;                                    // <-- "open" or "delete"
            var code    =  btn.dataset.code;                                      // <-- Project code from data attribute
            if (!action || !code) return;

            if (action === 'open')   openProject(code);
            if (action === 'delete') deleteProject(code);
        });
    }
    // ------------------------------------------------------------


    // BOOT | Render Buttons and Bind Listeners When DOM is Ready
    // ------------------------------------------------------------
    function _init() {
        render();
        _bindTableRowActions();

        if (window.ValeSpec__DocManagement__ProjectList) {
            window.ValeSpec__DocManagement__ProjectList.render();                  // <-- Initial table render
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        render         : render,
        openProject    : openProject,
        deleteProject  : deleteProject
    };

})();

// endregion ===================================================================

window.ValeSpec__DocManagement__ProjectActions  =  ValeSpec__DocManagement__ProjectActions;
