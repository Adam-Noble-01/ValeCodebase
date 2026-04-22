/* =============================================================================
 WHITECARDVISION - PROJECT MANAGER - PROJECT ACTIONS
=============================================================================
 FILE       : WhitecardVision__ProjectManager__ProjectActions__.js
 NAMESPACE  : Wv
 MODULE     : System - ProjectManagerMode - ProjectActions
 PURPOSE    : High-level project lifecycle operations invoked from the
              Project Manager UI (create, open, delete, rename). Feedback
              flows through toast notifications; destructive ops use confirm.
============================================================================= */

// =============================================================================
// REGION | Project Manager Action Helpers
// =============================================================================

(function () {
    'use strict';


// -----------------------------------------------------------------------------
// REGION | Helpers - Slug generation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Sanitise a user display name into a filesystem-safe slug
    // ------------------------------------------------------------
    //  Rules mirror the server allowlist: [A-Za-z0-9_-], first char alphanumeric,
    //  max 64 chars. Spaces and other separators collapse to a single hyphen.
    // ------------------------------------------------------------
    function Wv__ProjectManager__ProjectActions__BuildCleanSlug(userInput) {
        let slug = String(userInput || 'Untitled')
            .trim()
            .replace(/[^A-Za-z0-9_\-]+/g, '-')
            .replace(/-{2,}/g, '-')
            .replace(/^[-_]+|[-_]+$/g, '')
            .substring(0, 64);
        if (!slug || !/^[A-Za-z0-9]/.test(slug)) {
            slug = ('Project-' + slug.replace(/^[^A-Za-z0-9]+/, '')).substring(0, 64);
        }
        return slug || 'Untitled';
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

    // FUNCTION | Prompt the user for a project name, create the project, and notify via toast
    // ------------------------------------------------------------
    //  1. Show window.prompt to capture the desired display name.
    //  2. Derive a clean filesystem slug from the user's input.
    //  3. Post to the server; the display name is seeded into the JSON directly.
    //  4. Return `{ yearFolder, projectSlug, projectName }`.
    // ------------------------------------------------------------
    async function Wv__ProjectManager__ProjectActions__CreateProjectWithPrompt() {
        const projectFileManager = window.Wv__AppData__ProjectFileManager;
        const toast              = window.Wv__AppUtils__Toast;
        const defaults           = Wv__ProjectManager__ProjectActions__ReadDefaults();

        const userInputRaw  = window.prompt('Enter new project name:', defaults.displayName);
        if (userInputRaw === null) return null;
        const trimmedName   = userInputRaw.trim();
        if (!trimmedName) {
            if (toast) toast.Wv__Toast__Show('Project name cannot be empty.', 'warning');
            return null;
        }

        const yearFolderToken = projectFileManager.Wv__ProjectFileManager__CurrentYearFolder();
        const newSlugToken    = Wv__ProjectManager__ProjectActions__BuildCleanSlug(trimmedName);

        try {
            const createdDescriptor = await projectFileManager.Wv__ProjectFileManager__CreateProject(
                newSlugToken, '', yearFolderToken, trimmedName
            );
            if (toast) toast.Wv__Toast__Show('Created project "' + trimmedName + '".', 'success');
            return {
                yearFolder  : createdDescriptor.yearFolder,
                projectSlug : createdDescriptor.projectName,
                projectName : trimmedName
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
        Wv__ProjectManager__ProjectActions__CreateProjectWithPrompt,
        Wv__ProjectManager__ProjectActions__OpenProject,
        Wv__ProjectManager__ProjectActions__DeleteProject,
        Wv__ProjectManager__ProjectActions__CommitRename
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
