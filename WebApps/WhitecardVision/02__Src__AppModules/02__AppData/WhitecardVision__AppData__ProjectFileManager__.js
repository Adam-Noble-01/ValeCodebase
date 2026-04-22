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

(function () {
    'use strict';


    /* FUNCTION | Derive endpoint root from loaded AppConfig */
    /* ------------------------------------------------------------ */
    function Wv__ProjectFileManager__ServerBaseUrl() {                                                                          //<-- Empty string means "same origin", which is what Flask serves.
        const appConfig = window.Wv__AppCore__StateManager.Wv__StateManager__GetAppConfig();
        return (appConfig && appConfig.Wv__AppConfig__Server && appConfig.Wv__AppConfig__Server.Wv__AppConfig__Server__BaseUrl) || '';
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Wrap fetch with JSON parse + uniform error shape */
    /* ------------------------------------------------------------ */
    async function Wv__ProjectFileManager__FetchJson(relativeUrl, fetchOptions) {
        const response = await fetch(Wv__ProjectFileManager__ServerBaseUrl() + relativeUrl, fetchOptions);
        const payload  = await response.json().catch(() => ({ ok: false, error: 'Invalid JSON from server' }));
        if (!response.ok || !payload.ok) {
            throw new Error(payload.error || ('HTTP ' + response.status));
        }
        return payload.data;
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | List every project on disk (sorted newest first) */
    /* ------------------------------------------------------------ */
    async function Wv__ProjectFileManager__ListAllProjects() {
        return await Wv__ProjectFileManager__FetchJson('/api/projects', { method: 'GET' });
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Create a new project folder + seed JSON */
    /* ------------------------------------------------------------ */
    async function Wv__ProjectFileManager__CreateProject(projectName, description, yearFolder) {
        const seededData = await Wv__ProjectFileManager__FetchJson('/api/projects', {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({
                projectName : projectName,
                description : description || '',
                yearFolder  : yearFolder  || ''
            })
        });
        await Wv__ProjectFileManager__LoadProject(seededData.yearFolder, seededData.projectName);
        return seededData;
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Load a project JSON from disk into StateManager */
    /* ------------------------------------------------------------ */
    async function Wv__ProjectFileManager__LoadProject(yearFolder, projectName) {
        const rawJson = await Wv__ProjectFileManager__FetchJson(
            '/api/projects/' + encodeURIComponent(yearFolder) + '/' + encodeURIComponent(projectName),
            { method: 'GET' }
        );
        const normalisedTree = window.Wv__AppData__ProjectSchemaValidator.Wv__ProjectSchemaValidator__Normalise(
            rawJson, projectName, yearFolder
        );
        window.Wv__AppCore__StateManager.Wv__StateManager__SetActiveProject(normalisedTree);
        return normalisedTree;
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Persist the currently-active project tree back to disk */
    /* ------------------------------------------------------------ */
    async function Wv__ProjectFileManager__SaveActiveProject() {
        const activeTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!activeTree) { throw new Error('No active project to save.'); }

        const metadataBlock    = activeTree.Wv__ProjectFile__Metadata || {};
        const projectNameToken = metadataBlock.Wv__ProjectFile__Metadata__ProjectName;
        const yearFolderToken  = metadataBlock.Wv__ProjectFile__Metadata__YearFolder;
        if (!projectNameToken || !yearFolderToken) { throw new Error('Project metadata missing projectName/yearFolder.'); }

        await Wv__ProjectFileManager__FetchJson(
            '/api/projects/' + encodeURIComponent(yearFolderToken) + '/' + encodeURIComponent(projectNameToken),
            {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(activeTree)
            }
        );
        return true;
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Delete an entire project directory on disk */
    /* ------------------------------------------------------------ */
    async function Wv__ProjectFileManager__DeleteProject(yearFolder, projectName) {
        await Wv__ProjectFileManager__FetchJson(
            '/api/projects/' + encodeURIComponent(yearFolder) + '/' + encodeURIComponent(projectName),
            { method: 'DELETE' }
        );
        return true;
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Upload a base64 image into a role slot */
    /* ------------------------------------------------------------ */
    async function Wv__ProjectFileManager__UploadImage(roleToken, uploadDescriptor) {                                           //<-- role: "whitecard" | "material" | "style" | "edit".
        const activeTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!activeTree) { throw new Error('Create or load a project before uploading images.'); }
        const metadataBlock    = activeTree.Wv__ProjectFile__Metadata || {};
        const projectNameToken = metadataBlock.Wv__ProjectFile__Metadata__ProjectName;
        const yearFolderToken  = metadataBlock.Wv__ProjectFile__Metadata__YearFolder;

        return await Wv__ProjectFileManager__FetchJson(
            '/api/projects/' + encodeURIComponent(yearFolderToken) + '/' + encodeURIComponent(projectNameToken) + '/images/' + roleToken,
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
    /* ------------------------------------------------------------ */


    /* FUNCTION | Fire a render/edit generation against the Flask proxy */
    /* ------------------------------------------------------------ */
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
                    projectName    : metadataBlock.Wv__ProjectFile__Metadata__ProjectName,
                    yearFolder     : metadataBlock.Wv__ProjectFile__Metadata__YearFolder,
                    iterationId    : iterationIdOrEmpty || '',
                    geminiRequest  : geminiRequestShell
                })
            });
            if (apiLogger) {
                apiLogger.Wv__SharedElements__ApiLogger__LogReceived('POST ' + relativeEndpoint, {
                    imagePathRel        : responseData.imagePathRel,
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
    /* ------------------------------------------------------------ */


    /* FUNCTION | Compute current year folder token (Projects__YYYY) */
    /* ------------------------------------------------------------ */
    function Wv__ProjectFileManager__CurrentYearFolder() {
        return 'Projects__' + new Date().getFullYear();
    }
    /* ------------------------------------------------------------ */


    window.Wv__AppData__ProjectFileManager = {
        Wv__ProjectFileManager__ListAllProjects,
        Wv__ProjectFileManager__CreateProject,
        Wv__ProjectFileManager__LoadProject,
        Wv__ProjectFileManager__SaveActiveProject,
        Wv__ProjectFileManager__DeleteProject,
        Wv__ProjectFileManager__UploadImage,
        Wv__ProjectFileManager__Generate,
        Wv__ProjectFileManager__CurrentYearFolder
    };

})();
