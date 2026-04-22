/* =============================================================================
 WHITECARDVISION - RENDER MODE - PROJECT META PANEL
=============================================================================
 FILE       : WhitecardVision__RenderMode__ProjectMetaPanel__.js
 NAMESPACE  : Wv
 MODULE     : System — Render — ProjectMetaPanel
 PURPOSE    : New / load / save and project name + description fields.
============================================================================= */

// =============================================================================
// REGION | Render Mode Project Meta Panel Module
// =============================================================================

(function () {
    'use strict';


    // FUNCTION | Hook the panel DOM to the project file manager
    // ------------------------------------------------------------
    function Wv__RenderMode__ProjectMetaPanel__Install() {
        const projectNameInputEl        = document.getElementById('Wv__Render__ProjectMeta__NameInput');
        const projectDescriptionInputEl = document.getElementById('Wv__Render__ProjectMeta__DescriptionInput');
        const newButtonEl               = document.getElementById('Wv__Render__ProjectMeta__NewBtn');
        const loadButtonEl              = document.getElementById('Wv__Render__ProjectMeta__LoadBtn');
        const saveButtonEl              = document.getElementById('Wv__Render__ProjectMeta__SaveBtn');

        newButtonEl.addEventListener('click',  Wv__RenderMode__ProjectMetaPanel__HandleNewClicked);
        loadButtonEl.addEventListener('click', Wv__RenderMode__ProjectMetaPanel__HandleLoadClicked);
        saveButtonEl.addEventListener('click', Wv__RenderMode__ProjectMetaPanel__HandleSaveClicked);

        projectNameInputEl.addEventListener('input',        Wv__RenderMode__ProjectMetaPanel__SyncProjectNameToState);
        projectDescriptionInputEl.addEventListener('input', Wv__RenderMode__ProjectMetaPanel__SyncDescriptionToState);

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', Wv__RenderMode__ProjectMetaPanel__RefreshFromState);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Reflect active project state into the inputs
    // ------------------------------------------------------------
    function Wv__RenderMode__ProjectMetaPanel__RefreshFromState(projectTree) {
        const projectNameInputEl        = document.getElementById('Wv__Render__ProjectMeta__NameInput');
        const projectDescriptionInputEl = document.getElementById('Wv__Render__ProjectMeta__DescriptionInput');
        if (!projectTree) { projectNameInputEl.value = ''; projectDescriptionInputEl.value = ''; return; }
        const metadataBlock                     = projectTree.Wv__ProjectFile__Metadata || {};
        projectNameInputEl.value                = metadataBlock.Wv__ProjectFile__Metadata__ProjectName || '';
        projectDescriptionInputEl.value         = metadataBlock.Wv__ProjectFile__Metadata__Description  || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Keep the active project name in sync with the input
    // ------------------------------------------------------------
    function Wv__RenderMode__ProjectMetaPanel__SyncProjectNameToState() {
        // name-change requires a rename flow; input is informational until New
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write description changes straight into the tree
    // ------------------------------------------------------------
    function Wv__RenderMode__ProjectMetaPanel__SyncDescriptionToState() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const metadataBlock = projectTree.Wv__ProjectFile__Metadata || (projectTree.Wv__ProjectFile__Metadata = {});
        metadataBlock.Wv__ProjectFile__Metadata__Description =
            document.getElementById('Wv__Render__ProjectMeta__DescriptionInput').value;
        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | "New" delegates to the Project Manager prompted-new flow
    // ------------------------------------------------------------
    async function Wv__RenderMode__ProjectMetaPanel__HandleNewClicked() {
        const projectManagerController = window.Wv__ProjectManager__Controller;
        if (projectManagerController && projectManagerController.Wv__ProjectManager__Controller__TriggerNewProject) {
            await projectManagerController.Wv__ProjectManager__Controller__TriggerNewProject();
            return;
        }
        const modeManager = window.Wv__AppCore__ModeManager;
        if (modeManager) modeManager.Wv__ModeManager__SwitchToMode('ProjectManager');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | "Load" now sends the user to the Project Manager
    // ------------------------------------------------------------
    function Wv__RenderMode__ProjectMetaPanel__HandleLoadClicked() {
        const modeManager = window.Wv__AppCore__ModeManager;
        if (modeManager) modeManager.Wv__ModeManager__SwitchToMode('ProjectManager');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Save active project
    // ------------------------------------------------------------
    async function Wv__RenderMode__ProjectMetaPanel__HandleSaveClicked() {
        try {
            await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__SaveActiveProject();
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Project saved.', 'success');
        } catch (saveError) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Save failed: ' + saveError.message, 'error');
        }
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__RenderMode__ProjectMetaPanel = { Wv__RenderMode__ProjectMetaPanel__Install };
    // ------------------------------------------------------------

})();

// endregion ===================================================================

