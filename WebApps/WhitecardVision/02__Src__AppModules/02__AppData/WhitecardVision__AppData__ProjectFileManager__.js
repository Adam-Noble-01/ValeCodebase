/* =============================================================================
 WHITECARDVISION - PROJECT FILE MANAGER
=============================================================================
 FILE       : WhitecardVision__AppData__ProjectFileManager__.js
 NAMESPACE  : Wv
 MODULE     : AppData - ProjectFileManager
 PURPOSE    : Browser-side wrapper around the Flask project endpoints.
              - Lists / loads / saves / deletes projects.
              - Uploads role-scoped images (whitecard/material/style/edit).
              - Keeps the in-memory active project in StateManager in sync.
============================================================================= */

// =============================================================================
// REGION | Project File Manager Module
// =============================================================================

(function () {
    'use strict';


// -----------------------------------------------------------------------------
// REGION | HTTP and endpoint root
// -----------------------------------------------------------------------------

    // FUNCTION | Derive endpoint root from loaded AppConfig
    // ------------------------------------------------------------
    function Wv__ProjectFileManager__ServerBaseUrl() {                                                                          //<-- Empty string means "same origin", which is what Flask serves.
        const appConfig = window.Wv__AppCore__StateManager.Wv__StateManager__GetAppConfig();
        return (appConfig && appConfig.Wv__AppConfig__Server && appConfig.Wv__AppConfig__Server.Wv__AppConfig__Server__BaseUrl) || '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Wrap fetch with JSON parse + uniform error shape
    // ------------------------------------------------------------
    async function Wv__ProjectFileManager__FetchJson(relativeUrl, fetchOptions) {
        const response  = await fetch(Wv__ProjectFileManager__ServerBaseUrl() + relativeUrl, fetchOptions);
        let   payload;
        try {
            payload = await response.json();
        } catch (_parseError) {
            const bodySnippet = await response.text().catch(() => '');
            throw new Error('HTTP ' + response.status + ': ' + (bodySnippet.slice(0, 200) || 'non-JSON response from server'));
        }
        if (!response.ok || !payload.ok) {
            throw new Error(payload.error || ('HTTP ' + response.status));
        }
        return payload.data;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project identity (display vs API slug)
// -----------------------------------------------------------------------------

    //  Flask routes /api/projects/{Year}/{slug} and generate `projectName` use the
    //  stable folder id (Wv__ProjectFile__Metadata__ProjectCode). Display label is
    //  Wv__ProjectFile__Metadata__ProjectName. Legacy JSON may only have ProjectName.
    // ------------------------------------------------------------
    function Wv__ProjectFileManager__GetProjectSlugForApi(metadataBlock) {
        const m = metadataBlock || {};
        const fromCode = String(m.Wv__ProjectFile__Metadata__ProjectCode || '').trim();
        if (fromCode) { return fromCode; }
        return String(m.Wv__ProjectFile__Metadata__ProjectName || '').trim();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project CRUD
// -----------------------------------------------------------------------------

    // FUNCTION | List every project on disk (sorted newest first)
    // ------------------------------------------------------------
    async function Wv__ProjectFileManager__ListAllProjects() {
        return await Wv__ProjectFileManager__FetchJson('/api/projects', { method: 'GET' });
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a new project folder + seed JSON
    // ------------------------------------------------------------
    async function Wv__ProjectFileManager__CreateProject(projectName, description, yearFolder, displayName) {
        const seededData = await Wv__ProjectFileManager__FetchJson('/api/projects', {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({
                projectName : projectName,
                description : description  || '',
                yearFolder  : yearFolder   || '',
                displayName : displayName  || ''
            })
        });
        await Wv__ProjectFileManager__LoadProject(seededData.yearFolder, seededData.projectName);
        return seededData;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load a project JSON from disk into StateManager
    // ------------------------------------------------------------
    async function Wv__ProjectFileManager__LoadProject(yearFolder, projectName) {
        const rawJson = await Wv__ProjectFileManager__FetchJson(
            '/api/projects/' + encodeURIComponent(yearFolder) + '/' + encodeURIComponent(projectName),
            { method: 'GET' }
        );
        const normalisedTree = window.Wv__AppData__ProjectSchemaValidator.Wv__ProjectSchemaValidator__Normalise(
            rawJson, projectName, yearFolder
        );
        window.Wv__AppCore__StateManager.Wv__StateManager__SetActiveProject(normalisedTree);

        if (Wv__ProjectFileManager__ProjectTreeNeedsThumbBackfill(normalisedTree)) {
            Wv__ProjectFileManager__BackfillProjectThumbnails(yearFolder, projectName)
                .then(async () => {
                    const refreshedRawJson = await Wv__ProjectFileManager__FetchJson(
                        '/api/projects/' + encodeURIComponent(yearFolder) + '/' + encodeURIComponent(projectName),
                        { method: 'GET' }
                    );
                    const refreshedTree = window.Wv__AppData__ProjectSchemaValidator.Wv__ProjectSchemaValidator__Normalise(
                        refreshedRawJson, projectName, yearFolder
                    );
                    const activeTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
                    if (!activeTree) return;
                    const activeMeta = activeTree.Wv__ProjectFile__Metadata || {};
                    if ((activeMeta.Wv__ProjectFile__Metadata__ProjectCode || '') !== projectName) return;
                    if ((activeMeta.Wv__ProjectFile__Metadata__YearFolder || '') !== yearFolder) return;
                    window.Wv__AppCore__StateManager.Wv__StateManager__SetActiveProject(refreshedTree);
                })
                .catch((backfillError) => {
                    console.warn('[ProjectFileManager] thumbnail backfill failed:', backfillError);
                });
        }
        return normalisedTree;
    }
    // ------------------------------------------------------------


    // FUNCTION | Persist the currently-active project tree back to disk
    // ------------------------------------------------------------
    //  The server is self-reconciling: if the display name implies a new folder slug
    //  it moves the folder and returns { renamed: true, projectName: newSlug }.
    //  This function reloads the project automatically in that case so the
    //  in-memory state and URL references are consistent with the new slug.
    // ------------------------------------------------------------
    async function Wv__ProjectFileManager__SaveActiveProject() {
        const activeTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!activeTree) { throw new Error('No active project to save.'); }

        const metadataBlock    = activeTree.Wv__ProjectFile__Metadata || {};
        const yearFolderToken  = metadataBlock.Wv__ProjectFile__Metadata__YearFolder;
        const projectSlugToken = Wv__ProjectFileManager__GetProjectSlugForApi(metadataBlock);
        if (!yearFolderToken)  { throw new Error('Project metadata missing year folder.'); }
        if (!projectSlugToken) { throw new Error('Project metadata missing project id (ProjectCode).'); }

        const result = await Wv__ProjectFileManager__FetchJson(
            '/api/projects/' + encodeURIComponent(yearFolderToken) + '/' + encodeURIComponent(projectSlugToken),
            {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(activeTree)
            }
        );
        if (result && result.renamed) {
            await Wv__ProjectFileManager__LoadProject(result.yearFolder, result.projectName);
        }
        return result || true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete an entire project directory on disk
    // ------------------------------------------------------------
    async function Wv__ProjectFileManager__DeleteProject(yearFolder, projectName) {
        await Wv__ProjectFileManager__FetchJson(
            '/api/projects/' + encodeURIComponent(yearFolder) + '/' + encodeURIComponent(projectName),
            { method: 'DELETE' }
        );
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Rename the currently-active project's DISPLAY name and persist
    // ------------------------------------------------------------
    //  Use when the folder slug (ProjectCode) is unchanged. To rename the
    //  on-disk folder, call Wv__ProjectFileManager__RelocateProject.
    // ------------------------------------------------------------
    async function Wv__ProjectFileManager__RenameActiveProject(newDisplayName) {
        const activeTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!activeTree)          { throw new Error('No active project to rename.'); }
        if (!newDisplayName)      { throw new Error('New display name is empty.'); }

        const metadataBlock = activeTree.Wv__ProjectFile__Metadata || {};
        metadataBlock.Wv__ProjectFile__Metadata__ProjectName = String(newDisplayName).trim();
        activeTree.Wv__ProjectFile__Metadata = metadataBlock;

        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        await Wv__ProjectFileManager__SaveActiveProject();
        return activeTree;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Image upload and Gemini proxy
// -----------------------------------------------------------------------------

    // FUNCTION | Upload a base64 image into a role slot
    // ------------------------------------------------------------
    async function Wv__ProjectFileManager__UploadImage(roleToken, uploadDescriptor) {                                           //<-- role: "whitecard" | "material" | "style" | "edit".
        const activeTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!activeTree) { throw new Error('Create or load a project before uploading images.'); }
        const metadataBlock    = activeTree.Wv__ProjectFile__Metadata || {};
        const yearFolderToken  = metadataBlock.Wv__ProjectFile__Metadata__YearFolder;
        const projectSlugToken = Wv__ProjectFileManager__GetProjectSlugForApi(metadataBlock);

        return await Wv__ProjectFileManager__FetchJson(
            '/api/projects/' + encodeURIComponent(yearFolderToken) + '/' + encodeURIComponent(projectSlugToken) + '/images/' + roleToken,
            {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify({
                    base64Data  : uploadDescriptor.base64Data,
                    mimeType    : uploadDescriptor.mimeType  || 'image/png',
                    label       : uploadDescriptor.label     || '',
                    slotIndex   : uploadDescriptor.slotIndex || 0,
                    iterationId : uploadDescriptor.iterationId || ''
                })
            }
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Fire a render/edit generation against the Flask proxy
    // ------------------------------------------------------------
    async function Wv__ProjectFileManager__Generate(isEditModeBool, geminiRequestShell, iterationIdOrEmpty) {
        const activeTree        = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!activeTree) { throw new Error('No active project.'); }
        const metadataBlock     = activeTree.Wv__ProjectFile__Metadata || {};
        const endpointKey       = isEditModeBool
            ? 'Wv__AppConfig__Server__GenerateEditEndpoint'
            : 'Wv__AppConfig__Server__GenerateRenderEndpoint';
        const appConfig         = window.Wv__AppCore__StateManager.Wv__StateManager__GetAppConfig();
        const relativeEndpoint  = appConfig.Wv__AppConfig__Server[endpointKey];

        const apiLogger         = window.Wv__SharedElements__ApiLogger;
        const inlinePartsArray  = (((geminiRequestShell || {}).contents || [{}])[0].parts || []).filter(p => p.inlineData);
        const generationConfig  = (geminiRequestShell || {}).generationConfig || {};
        const logMeta           = {
            mode              : isEditModeBool ? 'Edit' : 'Render',
            project           : metadataBlock.Wv__ProjectFile__Metadata__ProjectName,
            iterationId       : iterationIdOrEmpty || '',
            imageCount        : inlinePartsArray.length,
            aspectRatio       : (generationConfig.imageConfig || {}).aspectRatio,
            imageSize         : (generationConfig.imageConfig || {}).imageSize
        };

        if (apiLogger) apiLogger.Wv__SharedElements__ApiLogger__LogSent('POST ' + relativeEndpoint, logMeta);
        const startedAtMs       = performance.now();
        try {
            const responseData  = await Wv__ProjectFileManager__FetchJson(relativeEndpoint, {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify({
                    projectName    : Wv__ProjectFileManager__GetProjectSlugForApi(metadataBlock),
                    yearFolder     : metadataBlock.Wv__ProjectFile__Metadata__YearFolder,
                    iterationId    : iterationIdOrEmpty || '',
                    geminiRequest  : geminiRequestShell
                })
            });
            if (apiLogger) {
                apiLogger.Wv__SharedElements__ApiLogger__LogReceived('POST ' + relativeEndpoint, {
                    imagePathRel        : responseData.imagePathRel,
                    thumbPathRel        : responseData.thumbPathRel,
                    appliedAspectRatio  : responseData.appliedAspectRatio,
                    appliedImageSize    : responseData.appliedImageSize,
                    modelId             : responseData.modelId
                }, performance.now() - startedAtMs);
            }
            return responseData;
        } catch (fetchError) {
            if (apiLogger) apiLogger.Wv__SharedElements__ApiLogger__LogError('POST ' + relativeEndpoint, fetchError, performance.now() - startedAtMs);
            throw fetchError;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Utilities
// -----------------------------------------------------------------------------

    // FUNCTION | Compute current year folder token (Projects__YYYY)
    // ------------------------------------------------------------
    function Wv__ProjectFileManager__CurrentYearFolder() {
        return 'Projects__' + new Date().getFullYear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Trigger server-side thumbnail backfill for one project
    // ------------------------------------------------------------
    async function Wv__ProjectFileManager__BackfillProjectThumbnails(yearFolder, projectName) {
        return await Wv__ProjectFileManager__FetchJson(
            '/api/projects/' + encodeURIComponent(yearFolder) + '/' + encodeURIComponent(projectName) + '/thumbnails/backfill',
            { method: 'POST' }
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Detect whether a project tree has missing thumb fields
    // ------------------------------------------------------------
    function Wv__ProjectFileManager__ProjectTreeNeedsThumbBackfill(projectTree) {
        if (!projectTree) return false;
        const renderGroup = projectTree.Wv__Project__RenderGroup || {};
        const whitecard = renderGroup.Wv__Project__RenderGroup__Whitecard || {};

        if (whitecard.Wv__Whitecard__ImagePath && !whitecard.Wv__Whitecard__ImageThumbPath) return true;
        if (renderGroup.Wv__Project__RenderGroup__LastOutputPath && !renderGroup.Wv__Project__RenderGroup__LastOutputThumbPath) return true;

        const materialRefs = renderGroup.Wv__Project__RenderGroup__MaterialReferences || [];
        for (const materialRef of materialRefs) {
            if (materialRef.Wv__Reference__ImagePath && !materialRef.Wv__Reference__ThumbPath) return true;
        }

        const styleRefs = renderGroup.Wv__Project__RenderGroup__StyleReferences || [];
        for (const styleRef of styleRefs) {
            if (styleRef.Wv__Reference__ImagePath && !styleRef.Wv__Reference__ThumbPath) return true;
        }

        const iterations = projectTree.Wv__Project__EditIterations || [];
        for (const iteration of iterations) {
            if (iteration.Wv__EditIteration__BaseImagePath && !iteration.Wv__EditIteration__BaseImageThumbPath) return true;
            if (iteration.Wv__EditIteration__LastOutputPath && !iteration.Wv__EditIteration__LastOutputThumbPath) return true;
        }
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__AppData__ProjectFileManager = {
        Wv__ProjectFileManager__ListAllProjects,
        Wv__ProjectFileManager__CreateProject,
        Wv__ProjectFileManager__LoadProject,
        Wv__ProjectFileManager__SaveActiveProject,
        Wv__ProjectFileManager__DeleteProject,
        Wv__ProjectFileManager__RenameActiveProject,
        Wv__ProjectFileManager__UploadImage,
        Wv__ProjectFileManager__Generate,
        Wv__ProjectFileManager__CurrentYearFolder,
        Wv__ProjectFileManager__BackfillProjectThumbnails,
        Wv__ProjectFileManager__GetProjectSlugForApi
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
