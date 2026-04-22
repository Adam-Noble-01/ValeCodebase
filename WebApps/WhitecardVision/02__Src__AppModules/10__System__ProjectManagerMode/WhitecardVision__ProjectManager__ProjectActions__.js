/* =============================================================================
 WHITECARDVISION - PROJECT MANAGER - PROJECT ACTIONS
=============================================================================
 FILE       : WhitecardVision__ProjectManager__ProjectActions__.js
 NAMESPACE  : Wv
 MODULE     : System - ProjectManagerMode - ProjectActions
 PURPOSE    : High-level project lifecycle operations invoked from the
              Project Manager UI (create, open, delete, rename). All browser
              prompt dialogs are deliberately avoided; feedback flows through
              toast notifications and inline table edits.
============================================================================= */

// =============================================================================
// REGION | Project Manager Action Helpers
// =============================================================================

(function () {
    'use strict';


// -----------------------------------------------------------------------------
// REGION | Helpers - Slug + date formatting
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a unique slug "Untitled-20260422-143207"
    // ------------------------------------------------------------
    function Wv__ProjectManager__ProjectActions__BuildTimestampSlug(prefixToken) {
        const nowDate         = new Date();
        const pad2            = (n) => String(n).padStart(2, '0');
        const yearToken       = nowDate.getFullYear();
        const monthToken      = pad2(nowDate.getMonth() + 1);
        const dayToken        = pad2(nowDate.getDate());
        const hourToken       = pad2(nowDate.getHours());
        const minuteToken     = pad2(nowDate.getMinutes());
        const secondToken     = pad2(nowDate.getSeconds());
        const cleanPrefix     = String(prefixToken || 'Untitled').replace(/[^A-Za-z0-9]/g, '') || 'Untitled';
        return cleanPrefix + '-' + yearToken + monthToken + dayToken + '-' + hourToken + minuteToken + secondToken;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read defaults config for the PM system (with fallbacks)
    // ------------------------------------------------------------
    function Wv__ProjectManager__ProjectActions__ReadDefaults() {
        const systemConfig = window.Wv__AppCore__StateManager.Wv__StateManager__GetSystemConfig('ProjectManager');
        const defaults     = (systemConfig || {}).Wv__ProjectManager__Config__Defaults || {};
        return {
            slugPrefix       : defaults.Wv__ProjectManager__Config__Defaults__NewProjectSlugPrefix  || 'Untitled',
            displayName      : defaults.Wv__ProjectManager__Config__Defaults__NewProjectDisplayName || 'Untitled Project',
            deleteConfirm    : !!((((systemConfig || {}).Wv__ProjectManager__Config__Confirmations) || {}).Wv__ProjectManager__Config__Confirmations__DeleteRequiresConfirm)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public actions - Create / Open / Delete / Rename
// -----------------------------------------------------------------------------

    // FUNCTION | Create a new Untitled project and flag it for inline rename
    // ------------------------------------------------------------
    //  1. Generate a unique timestamped slug.
    //  2. Post to the server to create the folder + seed JSON.
    //  3. Set metadata.ProjectName to the default display string and save.
    //  4. Return `{ yearFolder, projectSlug, projectName }` so the table
    //     can spawn an inline rename input on the newly-created row.
    // ------------------------------------------------------------
    async function Wv__ProjectManager__ProjectActions__CreateUntitledProject() {
        const projectFileManager = window.Wv__AppData__ProjectFileManager;
        const toast              = window.Wv__AppUtils__Toast;
        const defaults           = Wv__ProjectManager__ProjectActions__ReadDefaults();
        const yearFolderToken    = projectFileManager.Wv__ProjectFileManager__CurrentYearFolder();
        const newSlugToken       = Wv__ProjectManager__ProjectActions__BuildTimestampSlug(defaults.slugPrefix);

        try {
            const createdDescriptor = await projectFileManager.Wv__ProjectFileManager__CreateProject(
                newSlugToken, '', yearFolderToken
            );
            await projectFileManager.Wv__ProjectFileManager__RenameActiveProject(defaults.displayName);
            if (toast) toast.Wv__Toast__Show('New project created.', 'success');
            return {
                yearFolder  : createdDescriptor.yearFolder,
                projectSlug : createdDescriptor.projectName,
                projectName : defaults.displayName
            };
        } catch (createError) {
            if (toast) toast.Wv__Toast__Show('Create failed: ' + createError.message, 'error');
            throw createError;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Open an existing project and switch to Render mode
    // ------------------------------------------------------------
    async function Wv__ProjectManager__ProjectActions__OpenProject(yearFolderToken, projectSlugToken) {
        const projectFileManager = window.Wv__AppData__ProjectFileManager;
        const modeManager        = window.Wv__AppCore__ModeManager;
        const toast              = window.Wv__AppUtils__Toast;
        try {
            await projectFileManager.Wv__ProjectFileManager__LoadProject(yearFolderToken, projectSlugToken);
            if (toast)       toast.Wv__Toast__Show('Project opened.', 'success');
            if (modeManager) modeManager.Wv__ModeManager__SwitchToMode('Render');
            return true;
        } catch (openError) {
            if (toast) toast.Wv__Toast__Show('Open failed: ' + openError.message, 'error');
            return false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a project after (optional) confirmation
    // ------------------------------------------------------------
    async function Wv__ProjectManager__ProjectActions__DeleteProject(yearFolderToken, projectSlugToken, projectDisplayName) {
        const projectFileManager = window.Wv__AppData__ProjectFileManager;
        const toast              = window.Wv__AppUtils__Toast;
        const defaults           = Wv__ProjectManager__ProjectActions__ReadDefaults();

        if (defaults.deleteConfirm) {
            const okToDelete = window.confirm(                                                                                   //<-- Single confirm dialogue is acceptable for destructive ops.
                'Permanently delete project "' + (projectDisplayName || projectSlugToken) + '"?\n\nThis removes the folder and every image/JSON inside.'
            );
            if (!okToDelete) return false;
        }

        try {
            await projectFileManager.Wv__ProjectFileManager__DeleteProject(yearFolderToken, projectSlugToken);

            const activeTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
            const activeMeta = (activeTree && activeTree.Wv__ProjectFile__Metadata) || {};
            if (activeMeta.Wv__ProjectFile__Metadata__YearFolder === yearFolderToken &&
                activeMeta.Wv__ProjectFile__Metadata__ProjectName === projectSlugToken) {
                window.Wv__AppCore__StateManager.Wv__StateManager__SetActiveProject(null);
            }
            if (toast) toast.Wv__Toast__Show('Project deleted.', 'success');
            return true;
        } catch (deleteError) {
            if (toast) toast.Wv__Toast__Show('Delete failed: ' + deleteError.message, 'error');
            return false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Commit an inline-edited display name for a project
    // ------------------------------------------------------------
    async function Wv__ProjectManager__ProjectActions__CommitRename(yearFolderToken, projectSlugToken, newDisplayName) {
        const projectFileManager = window.Wv__AppData__ProjectFileManager;
        const toast              = window.Wv__AppUtils__Toast;
        const trimmedName        = String(newDisplayName || '').trim();
        if (!trimmedName) {
            if (toast) toast.Wv__Toast__Show('Project name cannot be empty.', 'warning');
            return false;
        }

        try {
            await projectFileManager.Wv__ProjectFileManager__LoadProject(yearFolderToken, projectSlugToken);                     //<-- Ensure the project is the active one so RenameActiveProject targets it.
            await projectFileManager.Wv__ProjectFileManager__RenameActiveProject(trimmedName);
            if (toast) toast.Wv__Toast__Show('Renamed to "' + trimmedName + '".', 'success');
            return true;
        } catch (renameError) {
            if (toast) toast.Wv__Toast__Show('Rename failed: ' + renameError.message, 'error');
            return false;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__ProjectManager__ProjectActions = {
        Wv__ProjectManager__ProjectActions__CreateUntitledProject,
        Wv__ProjectManager__ProjectActions__OpenProject,
        Wv__ProjectManager__ProjectActions__DeleteProject,
        Wv__ProjectManager__ProjectActions__CommitRename
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
