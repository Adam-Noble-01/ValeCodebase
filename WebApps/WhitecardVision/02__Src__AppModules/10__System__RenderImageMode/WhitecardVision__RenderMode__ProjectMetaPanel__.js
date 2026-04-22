/* =============================================================================
 WHITECARDVISION - RENDER MODE - PROJECT META PANEL
=============================================================================
 Wires the top-row New/Load/Save buttons + name/description inputs.
============================================================================= */

(function () {
    'use strict';


    /* FUNCTION | Hook the panel DOM to the project file manager */
    /* ------------------------------------------------------------ */
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
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Reflect active project state into the inputs */
    /* ------------------------------------------------------------ */
    function Wv__RenderMode__ProjectMetaPanel__RefreshFromState(projectTree) {
        const projectNameInputEl        = document.getElementById('Wv__Render__ProjectMeta__NameInput');
        const projectDescriptionInputEl = document.getElementById('Wv__Render__ProjectMeta__DescriptionInput');
        if (!projectTree) { projectNameInputEl.value = ''; projectDescriptionInputEl.value = ''; return; }
        const metadataBlock                     = projectTree.Wv__ProjectFile__Metadata || {};
        projectNameInputEl.value                = metadataBlock.Wv__ProjectFile__Metadata__ProjectName || '';
        projectDescriptionInputEl.value         = metadataBlock.Wv__ProjectFile__Metadata__Description  || '';
    }
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Keep the active project name in sync with the input */
    /* ------------------------------------------------------------ */
    function Wv__RenderMode__ProjectMetaPanel__SyncProjectNameToState() { /* name-change requires a rename flow; input is informational until New */ }


    /* HELPER FUNCTION | Write description changes straight into the tree */
    /* ------------------------------------------------------------ */
    function Wv__RenderMode__ProjectMetaPanel__SyncDescriptionToState() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const metadataBlock = projectTree.Wv__ProjectFile__Metadata || (projectTree.Wv__ProjectFile__Metadata = {});
        metadataBlock.Wv__ProjectFile__Metadata__Description =
            document.getElementById('Wv__Render__ProjectMeta__DescriptionInput').value;
        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
    }
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Create a brand-new project on disk */
    /* ------------------------------------------------------------ */
    async function Wv__RenderMode__ProjectMetaPanel__HandleNewClicked() {
        const proposedProjectName = (document.getElementById('Wv__Render__ProjectMeta__NameInput').value || '').trim();
        const proposedDescription = (document.getElementById('Wv__Render__ProjectMeta__DescriptionInput').value || '').trim();
        if (!proposedProjectName) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Enter a project name first.', 'warning');
            return;
        }
        try {
            const createdDescriptor = await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__CreateProject(
                proposedProjectName, proposedDescription, window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__CurrentYearFolder()
            );
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Project "' + createdDescriptor.projectName + '" created.', 'success');
        } catch (createError) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Create failed: ' + createError.message, 'error');
        }
    }


    /* HELPER FUNCTION | Prompt for an existing project and load it */
    /* ------------------------------------------------------------ */
    async function Wv__RenderMode__ProjectMetaPanel__HandleLoadClicked() {
        try {
            const projectListArray = await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__ListAllProjects();
            if (!projectListArray.length) {
                window.Wv__AppUtils__Toast.Wv__Toast__Show('No saved projects found.', 'info');
                return;
            }
            const listLabelMap = projectListArray.map((p, ix) =>
                `${ix + 1}. ${p.yearFolder} / ${p.projectName}${p.description ? ' - ' + p.description : ''}`).join('\n');
            const userChoice = window.prompt('Choose a project to load (number):\n\n' + listLabelMap);
            if (!userChoice) return;
            const chosenIndex = parseInt(userChoice, 10) - 1;
            if (isNaN(chosenIndex) || chosenIndex < 0 || chosenIndex >= projectListArray.length) {
                window.Wv__AppUtils__Toast.Wv__Toast__Show('Invalid selection.', 'warning');
                return;
            }
            const chosenProject = projectListArray[chosenIndex];
            await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__LoadProject(chosenProject.yearFolder, chosenProject.projectName);
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Loaded ' + chosenProject.projectName + '.', 'success');
        } catch (loadError) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Load failed: ' + loadError.message, 'error');
        }
    }


    /* HELPER FUNCTION | Save active project */
    /* ------------------------------------------------------------ */
    async function Wv__RenderMode__ProjectMetaPanel__HandleSaveClicked() {
        try {
            await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__SaveActiveProject();
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Project saved.', 'success');
        } catch (saveError) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Save failed: ' + saveError.message, 'error');
        }
    }


    window.Wv__RenderMode__ProjectMetaPanel = { Wv__RenderMode__ProjectMetaPanel__Install };

})();
