/* =============================================================================
 WHITECARDVISION - PROJECT MANAGER - PROJECT ACTIONS
=============================================================================
 FILE       : WhitecardVision__ProjectManager__ProjectActions__.js
 NAMESPACE  : Wv
 MODULE     : System - ProjectManagerMode - ProjectActions
 PURPOSE    : High-level project lifecycle operations invoked from the
              Project Manager UI (create, duplicate, open, delete, rename). Feedback
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
        const confirmations = (systemConfig || {}).Wv__ProjectManager__Config__Confirmations || {};
        return {
            slugPrefix       : defaults.Wv__ProjectManager__Config__Defaults__NewProjectSlugPrefix  || 'Untitled',
            displayName      : defaults.Wv__ProjectManager__Config__Defaults__NewProjectDisplayName || 'Untitled Project',
            duplicateSuffix  : defaults.Wv__ProjectManager__Config__Defaults__DuplicateSuffix       || '__COPY__',
            duplicateConfirm : !!confirmations.Wv__ProjectManager__Config__Confirmations__DuplicateRequiresConfirm,
            deleteConfirm    : !!confirmations.Wv__ProjectManager__Config__Confirmations__DeleteRequiresConfirm
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public action - New Project
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public action - Duplicate Project
// -----------------------------------------------------------------------------

    // FUNCTION | Duplicate an existing project into a new folder-backed clone
    // ------------------------------------------------------------
    //  1. Prompt with the existing project display name plus configured copy suffix.
    //  2. Build the destination slug using the same allowlist as create/rename.
    //  3. Ask the server to clone the full project tree without changing the active project.
    // ------------------------------------------------------------
    async function Wv__ProjectManager__ProjectActions__DuplicateProject(yearFolderToken, projectSlugToken, projectDisplayName) {
        const projectFileManager = window.Wv__AppData__ProjectFileManager;
        const toast              = window.Wv__AppUtils__Toast;
        const defaults           = Wv__ProjectManager__ProjectActions__ReadDefaults();

        const sourceDisplayName = String(projectDisplayName || projectSlugToken || defaults.displayName).trim();
        const duplicateSeedName = sourceDisplayName + defaults.duplicateSuffix;
        const userInputRaw      = window.prompt('Duplicate project as:', duplicateSeedName);
        if (userInputRaw === null) return null;

        const trimmedName = userInputRaw.trim();
        if (!trimmedName) {
            if (toast) toast.Wv__Toast__Show('Project name cannot be empty.', 'warning');
            return null;
        }
        if (defaults.duplicateConfirm) {
            const okToDuplicate = window.confirm(
                'Duplicate project "' + sourceDisplayName + '" as "' + trimmedName + '"?\n\nThis will clone the full project folder, images, outputs, and JSON data.'
            );
            if (!okToDuplicate) return null;
        }

        const duplicateSlugToken = Wv__ProjectManager__ProjectActions__BuildCleanSlug(trimmedName);
        try {
            const duplicateDescriptor = await projectFileManager.Wv__ProjectFileManager__DuplicateProject(
                yearFolderToken,
                projectSlugToken,
                duplicateSlugToken,
                trimmedName
            );
            if (toast) toast.Wv__Toast__Show('Duplicated project "' + trimmedName + '".', 'success');
            return {
                yearFolder  : duplicateDescriptor.yearFolder,
                projectSlug : duplicateDescriptor.projectSlug || duplicateDescriptor.projectName,
                projectName : duplicateDescriptor.projectDisplayName || trimmedName
            };
        } catch (duplicateError) {
            if (toast) toast.Wv__Toast__Show('Duplicate failed: ' + duplicateError.message, 'error');
            return null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public action - Open Project
// -----------------------------------------------------------------------------


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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public action - Delete Project
// -----------------------------------------------------------------------------


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
                projectFileManager.Wv__ProjectFileManager__GetProjectSlugForApi(activeMeta) === projectSlugToken) {
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public action - Rename Project
// -----------------------------------------------------------------------------


    // FUNCTION | Commit an inline-edited display name for a project
    // ------------------------------------------------------------
    //  1. Load the project to make it active.
    //  2. Update the display name in metadata and mark dirty.
    //  3. SaveActiveProject — the server reconciles the folder slug automatically.
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
            await projectFileManager.Wv__ProjectFileManager__LoadProject(yearFolderToken, projectSlugToken);
            const activeTree    = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
            const metadataBlock = activeTree.Wv__ProjectFile__Metadata || (activeTree.Wv__ProjectFile__Metadata = {});
            metadataBlock.Wv__ProjectFile__Metadata__ProjectName = trimmedName;
            window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
            await projectFileManager.Wv__ProjectFileManager__SaveActiveProject();
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
        Wv__ProjectManager__ProjectActions__DuplicateProject,
        Wv__ProjectManager__ProjectActions__OpenProject,
        Wv__ProjectManager__ProjectActions__DeleteProject,
        Wv__ProjectManager__ProjectActions__CommitRename,
        Wv__ProjectManager__ProjectActions__BuildCleanSlug
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
