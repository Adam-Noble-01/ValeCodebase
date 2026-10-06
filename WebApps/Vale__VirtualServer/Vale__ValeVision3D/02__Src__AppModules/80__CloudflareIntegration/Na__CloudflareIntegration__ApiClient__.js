// =============================================================================
// VALEVISION3D - PROJECT STORAGE CLIENT (TRUEVISION'S CfApi INTERFACE)
// =============================================================================
//
// FILE       : Na__CloudflareIntegration__ApiClient__.js
// NAMESPACE  : Na__CfApi
// MODULE     : Project Storage Client
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read, merge and write a project's data and files on ValeVision 3D's own
//              server, under the names TrueVision's drawing modules call
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - THE TRANSPORT FACADE. TrueVision's drawing modules reach their storage
//   through one client with these exported names (TrueVision's is its
//   Cloudflare client, hence the folder and the Na__CfApi prefix, kept so a
//   module ported from TrueVision links here unchanged). Since 06-Oct-2026
//   every body speaks to ValeVision 3D's server API
//   (Server__Api/Api__ValeVision3D, /valevision/api/): no Worker, no R2, no CDN,
//   no repository copy. Read the folder name as "the storage integration".
// - ONE PROJECT, FROM THE ADDRESS BAR. The server places ?project= in the
//   Projects Master Library (Na__AppUtils__InitProjectLocation); with no
//   project there is no folder and every write is refused.
// - READS ARE OPEN, WRITES NEED AN AUTHOR. Anyone with the project link reads
//   (clients included); IsConfigured() - "may this session write?" - is true
//   only for a signed-in author (Na__DevGate__IsAuthoringEnabled), and the
//   server checks the same on every write.
// - "Location" answers keep their shape ({ key, cdnUrl, repoUrl, ... }) so the
//   callers' read code is unchanged: cdnUrl and repoUrl are the same server URL.
// - ONLY THE EDITOR'S KEYS. A merge or a key delete never touches a key the
//   SketchUp sync and the project editor own (projectCode, images, the model
//   names ...): this client refuses them.
// - NEVER THROWS. Every function resolves { ok: false, error } on a failure.
// - Na__CfApi__GetProjectDisplayName() (ValeVision only) answers the project's
//   name for a printed document from the loaded project data.
//
// INTEGRATION:
// - Na__AppFlow__LoadingSequence awaits Na__CfApi__Initialize() and registers
//   the project data it loaded with Na__CfApi__SetLoadedProjectData().
// - The drawings save itself goes through Na__AppUtils__LocalProjectMirror__.js
//   (MergeKeys, with the drawings save guard); this client carries the rest.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js
//                   - the interface only: its exported names, their parameters and their result shapes.
// - Parity        : diverged (DIV-4: identical names and signatures, different transport)
// - Divergences   : the transport is ValeVision 3D's server API, the store of record; IsConfigured means a
//                   signed-in author with a placed project; Copy/Delete of sheet pictures and published files
//                   answer "not on this server" (nothing in ValeVision calls them; the local save's reconcile
//                   and archive routes do that work on the server).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - Version 2.0.0 (the move to app.valegardenhouses.com)
// - Every body rewritten over the ValeVision 3D API. Removed: the
//   valevision-gallery-editor-api Worker and its key, R2 keys and the CDN, the
//   repository copy URLs, the Worker route detection and its fallbacks.
//
// 01-Oct-2026 - Version 1.0.0 (transport facade, v2.71.1)
// - TrueVision3D's client interface over ValeVision's Worker, R2 layout and local server.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Identity and the API
    // ------------------------------------------------------------
    import {
        Na__AppUtils__ApiUrl,
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__GetProjectFolderFromUrl,
        Na__AppUtils__GetYearFromUrl,
        Na__AppUtils__InitProjectLocation,
        Na__AppUtils__ProjectFileUrl
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    import { Na__AppUtils__AssetUpload } from '../03__AppUtils/Na__AppUtils__AssetUpload__.js';
    import { Na__DevGate__IsAuthoringEnabled } from '../03__AppUtils/Na__AppUtils__DevGate__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Folders Inside the Project's Drawings Folder (user data, read through the API)
    // ------------------------------------------------------------
    const Na__CfApi__ThumbsDir             = 'PresentationMode/Thumbnails';
    const Na__CfApi__StatementsDir         = '10__StatementDocs';
    const Na__CfApi__SHEET_IMAGES_DIR      = '05__Layout__DrawingDocs__Images';
    const Na__CfApi__SHEET_IMAGES_ARCHIVE  = '00__Archive';
    const Na__CfApi__PUBLISHED_DIR         = '06__Layout__PublishedDocuments';
    const Na__CfApi__PUBLISHED_ARCHIVE     = '00__Archive__Revisions';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | What May Be Named
    // ------------------------------------------------------------
    const Na__CfApi__ProjectFileNames      = Object.freeze([ 'ValeVision__DrawingNotes__.json', 'ValeVision__StatementDocs__.json' ]);
    const Na__CfApi__StatementSegment      = /^[A-Za-z0-9_\-. &()\[\]]{1,140}$/;
    const Na__CfApi__StatementSuffixes     = /\.(md|html|json|txt|jpe?g|png|webp|gif|tiff?|bmp|svg)$/i;
    const Na__CfApi__StatementImages       = /\.(jpe?g|png|webp|gif|tiff?|bmp)$/i;
    const Na__CfApi__StatementMaxDepth     = 5;
    const Na__CfApi__SheetImageFolder      = /^[A-Za-z0-9][A-Za-z0-9_\-.]{0,119}$/;
    const Na__CfApi__SheetImageFile        = /^[A-Za-z0-9][A-Za-z0-9_\-.]{0,159}\.(webp|jpg|jpeg|png)$/i;
    const Na__CfApi__PublishedSegment      = /^[A-Za-z0-9][A-Za-z0-9_\-.]{0,159}$/;
    const Na__CfApi__PublishedExtension    = /\.(json|svg|webp|png|pdf|md)$/i;
    const Na__CfApi__PublishedHashed       = /__[0-9a-f]{10}\.(svg|webp|png|pdf)$/;
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Top-Level Keys Only the Pipelines Write
    // ------------------------------------------------------------
    // The SketchUp sync and the project editor own these. The legacy camera key
    // may be removed (the camera saver clears it) but never set.
    // ------------------------------------------------------------
    const Na__CfApi__PipelineKeys = Object.freeze([
        'projectCode', 'projectName', 'folderId', 'basePath',
        'images', 'allImages', 'displayImages', 'thumbnailImage',
        'valeVision_ModelUrls', 'valeVision_ModelUrl', 'ValeVison3D__SketchUpCameraData'
    ]);
    const Na__CfApi__RemoveOnlyKeys    = Object.freeze([ 'valeVision_Camera__DefaultPosition' ]);
    const Na__CfApi__ProjectNameKeys   = Object.freeze([ 'projectNameAlias', 'displayName', 'projectName' ]);
    const Na__CfApi__NotAuthor         = 'Saving needs a signed-in author (an app admin): sign in from the bubble top right.';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    let Na__CfApi__LoadedProjectData = null;                                     // <-- Full project data the app is running (merge base)
    let Na__CfApi__MergeQueue        = Promise.resolve();                       // <-- One queue for every change to the record

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | This Page's Project Folder: "2026/3047__Doous", or Null
    // ------------------------------------------------------------
    function Na__CfApi__FolderId() {
        const year   = Na__AppUtils__GetYearFromUrl();
        const folder = Na__AppUtils__GetProjectFolderFromUrl();
        return (year && folder) ? `${year}/${folder}` : null;
    }
    function Na__CfApi__Id() { return Na__AppUtils__GetProjectFolderFromUrl(); }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Encode Each Segment of a Path
    // ------------------------------------------------------------
    function Na__CfApi__EncodePath(path) {
        return String(path).split('/').map((segment) => encodeURIComponent(segment)).join('/');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | API URLs for This Project
    // ------------------------------------------------------------
    function Na__CfApi__RecordUrl()            { return Na__AppUtils__ApiUrl(`projects/${encodeURIComponent(Na__CfApi__Id())}`); }
    function Na__CfApi__FileUrl(fileName)      { return `${Na__CfApi__RecordUrl()}/files/${encodeURIComponent(fileName)}`; }
    function Na__CfApi__UserDataUrl(inside)    { return `${Na__CfApi__RecordUrl()}/userdata/${Na__CfApi__EncodePath(inside)}`; }
    function Na__CfApi__ProjectQuery() {
        return new URLSearchParams({ 'project-folder' : Na__CfApi__Id(), year : Na__AppUtils__GetYearFromUrl() }).toString();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Request to the API; Never Throws
    // ------------------------------------------------------------
    // Resolves { ok, status, answer, missing, error }: answer is the parsed JSON,
    // or the response text when asText.
    // ------------------------------------------------------------
    async function Na__CfApi__Call(method, url, body, options = {}) {
        try {
            const init = { method, credentials : 'same-origin', cache : 'no-store', headers : Object.assign({}, options.headers || {}) };
            if (body !== undefined && body !== null) {
                if (body instanceof Blob || body instanceof ArrayBuffer) init.body = body;
                else { init.body = JSON.stringify(body); init.headers['Content-Type'] = 'application/json'; }
            }
            const response = await fetch(url, init);
            const text     = await response.text();
            let   answer   = null;
            if (options.asText && response.ok) answer = text;
            else { try { answer = text ? JSON.parse(text) : null; } catch (e) { answer = options.asText ? text : null; } }
            const missing = response.status === 404 && !!(answer && answer.missing);
            let   error   = null;
            if (!response.ok) {
                error = response.status === 401 ? 'Sign in to save.'
                      : (answer && answer.error) || `The server answered HTTP ${response.status}`;
            }
            return { ok : response.ok, status : response.status, answer : answer, missing : missing, error : error };
        } catch (err) {
            return { ok : false, status : 0, answer : null, missing : false, error : `The ValeVision 3D server did not answer (${(err && err.message) || 'no answer'})` };
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refuse a Write Before It Is Sent
    // ------------------------------------------------------------
    function Na__CfApi__WriteRefusal() {
        if (!Na__CfApi__Id()) return 'No project for this page: ?project= names none the library has.';
        if (!Na__DevGate__IsAuthoringEnabled()) return Na__CfApi__NotAuthor;
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Blob or Not
    // ------------------------------------------------------------
    function Na__CfApi__IsBlob(value) {
        return typeof Blob !== 'undefined' && value instanceof Blob;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Blob as Base64 (the statement picture route takes JSON)
    // ------------------------------------------------------------
    async function Na__CfApi__BlobToBase64(blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(binary);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Session and Project Context
// -----------------------------------------------------------------------------

    // FUNCTION | Initialise: Wait Until the Server Has Placed This Page's Project
    // ------------------------------------------------------------
    function Na__CfApi__Initialize(options) {
        void options;
        return Na__AppUtils__InitProjectLocation().then((location) => ({ ok : !!location }));
    }
    // ------------------------------------------------------------


    // FUNCTION | May This Session Write? (a placed project and a signed-in author)
    // ------------------------------------------------------------
    function Na__CfApi__IsConfigured() {
        return Boolean(Na__CfApi__Id()) && Na__DevGate__IsAuthoringEnabled();
    }
    // ------------------------------------------------------------


    // FUNCTION | Register / Get the Full Project Data the App Loaded
    // ------------------------------------------------------------
    function Na__CfApi__SetLoadedProjectData(projectData) {
        Na__CfApi__LoadedProjectData = (projectData && typeof projectData === 'object') ? projectData : null;
    }
    function Na__CfApi__GetLoadedProjectData() {
        return Na__CfApi__LoadedProjectData;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Project's Name for a Printed Document ('' When Unknown)
    // ------------------------------------------------------------
    function Na__CfApi__GetProjectDisplayName() {
        const data = Na__CfApi__LoadedProjectData;
        if (!data || typeof data !== 'object') return '';
        for (const key of Na__CfApi__ProjectNameKeys) {
            const value = data[key];
            if (typeof value === 'string' && value.trim()) return value.trim();
        }
        return '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Project Folder / Year / Code for This Page
    // ------------------------------------------------------------
    function Na__CfApi__GetProjectContext() {
        const projectFolder = Na__AppUtils__GetProjectFolderFromUrl();
        const yearCode      = Na__AppUtils__GetYearFromUrl();
        const loaded        = Na__CfApi__LoadedProjectData;
        const urlCode       = Na__AppUtils__GetProjectCodeFromUrl();
        let   projectCode   = null;
        if (loaded && (typeof loaded.projectCode === 'string' || typeof loaded.projectCode === 'number') && String(loaded.projectCode)) {
            projectCode = String(loaded.projectCode);
        } else if (urlCode && urlCode.indexOf('/') === -1 && urlCode.indexOf('__') === -1) {
            projectCode = urlCode;
        } else if (projectFolder) {
            projectCode = projectFolder.split('__')[0] || null;
        }
        return {
            projectFolder : projectFolder,
            yearCode      : yearCode,
            projectCode   : projectCode,
            folderId      : (projectFolder && yearCode) ? `${yearCode}/${projectFolder}` : null
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Public URL of a Project-Relative File (TrueVision's CDN URL builder)
    // ------------------------------------------------------------
    function Na__CfApi__BuildContentCdnUrl(projectFolder, yearCode, relativePath) {
        void yearCode;
        return Na__AppUtils__ProjectFileUrl(projectFolder, relativePath);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Project Record: Read, Merge, Write
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Project Record, Fresh. { ok, data, missing }
    // ------------------------------------------------------------
    async function Na__CfApi__ReadProjectData() {
        if (!Na__CfApi__Id()) return { ok : false, error : 'No project for this page.' };
        const call = await Na__CfApi__Call('GET', Na__CfApi__RecordUrl());
        if (call.status === 404) return { ok : true, data : {}, missing : true };
        if (!call.ok) return { ok : false, error : call.error };
        if (!call.answer || typeof call.answer !== 'object' || Array.isArray(call.answer)) return { ok : false, error : 'The project record is not a JSON object' };
        return { ok : true, data : call.answer, missing : false };
    }
    // ------------------------------------------------------------


    // FUNCTION | Write the Whole Project Record
    // ------------------------------------------------------------
    async function Na__CfApi__WriteProjectData(projectDataObject) {
        const refusal = Na__CfApi__WriteRefusal();
        if (refusal) return { ok : false, error : refusal };
        if (!projectDataObject || typeof projectDataObject !== 'object' || Array.isArray(projectDataObject)) {
            return { ok : false, error : 'Nothing to write: project data must be a JSON object' };
        }
        const call = await Na__CfApi__Call('POST', Na__CfApi__RecordUrl(), projectDataObject);
        if (!call.ok) return { ok : false, error : call.error, conflict : call.status === 409 };
        Na__CfApi__LoadedProjectData = JSON.parse(JSON.stringify(projectDataObject));
        return { ok : true };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Keys the Pipelines Own (refused on every path)
    // ------------------------------------------------------------
    function Na__CfApi__RefusedKeys(names, operation) {
        return names.filter((name) => Na__CfApi__PipelineKeys.indexOf(name) !== -1
            || (operation === 'set' && Na__CfApi__RemoveOnlyKeys.indexOf(name) !== -1));
    }
    function Na__CfApi__Enqueue(task) {
        const job = Na__CfApi__MergeQueue.then(task, task);
        Na__CfApi__MergeQueue = job.then(() => undefined, () => undefined);
        return job;
    }
    function Na__CfApi__ApplyToLoaded(setObject, removeNames) {
        if (!Na__CfApi__LoadedProjectData) return;
        const next = Object.assign({}, Na__CfApi__LoadedProjectData, setObject || {});
        (removeNames || []).forEach((name) => { delete next[name]; });
        Na__CfApi__LoadedProjectData = next;
    }
    // ------------------------------------------------------------


    // FUNCTION | Merge Top-Level Keys Into the Record (on the server, one step)
    // ------------------------------------------------------------
    // options ({ drawingsBase }) is accepted for TrueVision's signature; the
    // drawings save guard rides with Na__LocalMirror__MergeKeys instead.
    // ------------------------------------------------------------
    function Na__CfApi__MergeAndSaveKeys(partialObject, options = null) {
        void options;
        return Na__CfApi__Enqueue(async () => {
            const refusal = Na__CfApi__WriteRefusal();
            if (refusal) return { ok : false, error : refusal };
            if (!partialObject || typeof partialObject !== 'object' || Array.isArray(partialObject)) return { ok : false, error : 'Nothing to merge' };
            const refused = Na__CfApi__RefusedKeys(Object.keys(partialObject), 'set');
            if (refused.length) return { ok : false, error : `Refused keys the SketchUp sync owns: ${refused.join(', ')}` };
            const call = await Na__CfApi__Call('PATCH', Na__CfApi__RecordUrl(), partialObject);
            if (!call.ok) return { ok : false, error : call.error, conflict : call.status === 409 };
            Na__CfApi__ApplyToLoaded(partialObject, []);
            return { ok : true };
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete Top-Level Keys From the Record
    // ------------------------------------------------------------
    function Na__CfApi__DeleteProjectKeys(keyNames) {
        const names = (Array.isArray(keyNames) ? keyNames : [keyNames]).filter((name) => typeof name === 'string' && name);
        return Na__CfApi__Enqueue(async () => {
            const refusal = Na__CfApi__WriteRefusal();
            if (refusal) return { ok : false, error : refusal };
            if (!names.length) return { ok : true };
            const refused = Na__CfApi__RefusedKeys(names, 'remove');
            if (refused.length) return { ok : false, error : `Refused keys the SketchUp sync owns: ${refused.join(', ')}` };
            const call = await Na__CfApi__Call('PATCH', Na__CfApi__RecordUrl(), { _unset : names });
            if (!call.ok) return { ok : false, error : call.error };
            Na__CfApi__ApplyToLoaded({}, names);
            return { ok : true };
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Assets (Thumbnails, Baked Linework, Snapshots)
// -----------------------------------------------------------------------------

    // FUNCTION | Write a Presentation Scene Thumbnail. { ok, publicUrl, relUrl }
    // ------------------------------------------------------------
    async function Na__CfApi__WriteThumbnailWebp(sceneId, blob) {
        const relUrl = `${Na__CfApi__ThumbsDir}/${sceneId}.webp`;
        const result = await Na__AppUtils__AssetUpload(blob, Na__CfApi__Id(), relUrl);
        return result.ok ? { ok : true, publicUrl : result.publicUrl, relUrl : relUrl } : { ok : false, error : result.error };
    }
    // ------------------------------------------------------------


    // FUNCTION | Write One Project Asset. { ok, publicUrl, relUrl }
    // ------------------------------------------------------------
    async function Na__CfApi__WriteProjectAsset(relativePath, payload, contentType) {
        void contentType;
        const result = await Na__AppUtils__AssetUpload(payload, Na__CfApi__Id(), relativePath);
        return result.ok ? { ok : true, publicUrl : result.publicUrl, relUrl : relativePath } : { ok : false, error : result.error };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sibling Files (Drawing Notes, the Statement Index)
// -----------------------------------------------------------------------------

    function Na__CfApi__AdminFileLocation(fileName) { void fileName; return null; }  // <-- ValeVision has no admin files
    function Na__CfApi__PlansFileLocation(fileName) { void fileName; return null; }  // <-- ValeVision has no PlanVision files


    // FUNCTION | Where a Sibling File Lives. { key, cdnUrl, repoUrl } (both URLs the server's), or Null
    // ------------------------------------------------------------
    function Na__CfApi__ProjectFileLocation(fileName) {
        if (!Na__CfApi__Id() || Na__CfApi__ProjectFileNames.indexOf(fileName) === -1) return null;
        const url = Na__CfApi__FileUrl(fileName);
        return { key : fileName, cdnUrl : url, repoUrl : url };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Sibling File, Fresh. { ok, data, missing }
    // ------------------------------------------------------------
    async function Na__CfApi__ReadProjectFile(fileName) {
        const location = Na__CfApi__ProjectFileLocation(fileName);
        if (!location) return { ok : false, error : `Refused project file "${fileName}"` };
        const call = await Na__CfApi__Call('GET', location.cdnUrl);
        if (call.status === 404) return { ok : true, data : null, missing : true };
        if (!call.ok) return { ok : false, error : call.error };
        return { ok : true, data : (call.answer && typeof call.answer === 'object') ? call.answer : null, missing : false };
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Whole Sibling File. { ok }
    // ------------------------------------------------------------
    async function Na__CfApi__WriteProjectFile(fileName, dataObject) {
        const location = Na__CfApi__ProjectFileLocation(fileName);
        if (!location) return { ok : false, error : `Refused project file "${fileName}"` };
        if (!dataObject || typeof dataObject !== 'object') return { ok : false, error : 'Nothing to write' };
        const refusal = Na__CfApi__WriteRefusal();
        if (refusal) return { ok : false, error : refusal };
        const call = await Na__CfApi__Call('POST', location.cdnUrl, dataObject);
        return call.ok ? { ok : true } : { ok : false, error : call.error };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Statement Files
// -----------------------------------------------------------------------------

    // FUNCTION | Where a Statement File Lives. { key, cdnUrl, repoUrl, path }, or Null
    // ------------------------------------------------------------
    function Na__CfApi__StatementFileLocation(relativePath) {
        if (!Na__CfApi__Id()) return null;
        const text = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        if (!text) return null;
        const segments = text.split('/').filter((segment) => segment !== '');
        if (!segments.length || segments.length > Na__CfApi__StatementMaxDepth) return null;
        for (const segment of segments) {
            if (segment === '.' || segment === '..' || !Na__CfApi__StatementSegment.test(segment)) return null;
        }
        if (!Na__CfApi__StatementSuffixes.test(segments[segments.length - 1])) return null;
        const path = segments.join('/');
        const url  = Na__CfApi__UserDataUrl(`${Na__CfApi__StatementsDir}/${path}`);   // <-- A path URL, so a statement's relative picture links resolve beside it
        return { key : `${Na__CfApi__StatementsDir}/${path}`, cdnUrl : url, repoUrl : url, path : path };
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Statement File. { ok, publicUrl, key, path }
    // ------------------------------------------------------------
    // payload: a string for markdown and HTML, a Blob for a picture, an object
    // for a .json file.
    // ------------------------------------------------------------
    async function Na__CfApi__WriteStatementFile(relativePath, payload, contentType) {
        void contentType;
        const location = Na__CfApi__StatementFileLocation(relativePath);
        if (!location) return { ok : false, error : `Refused statement path "${relativePath}"` };
        const refusal = Na__CfApi__WriteRefusal();
        if (refusal) return { ok : false, error : refusal };
        if (payload === undefined || payload === null) return { ok : false, error : 'Nothing to write' };
        const query = Na__CfApi__ProjectQuery();
        let call;
        if (Na__CfApi__IsBlob(payload) && Na__CfApi__StatementImages.test(location.path)) {
            call = await Na__CfApi__Call('POST', Na__AppUtils__ApiUrl(`valevision/statements/image?${query}`),
                { path : location.path, dataBase64 : await Na__CfApi__BlobToBase64(payload) });
        } else {
            const text = Na__CfApi__IsBlob(payload) ? await payload.text() : (typeof payload === 'string' ? payload : JSON.stringify(payload, null, 4));
            call = await Na__CfApi__Call('POST', Na__AppUtils__ApiUrl(`valevision/statements/file?${query}`), { path : location.path, text : text });
        }
        if (!call.ok) return { ok : false, error : call.error };
        const written = Na__CfApi__StatementFileLocation((call.answer && call.answer.path) || location.path) || location;
        return { ok : true, publicUrl : written.cdnUrl, key : written.key, path : written.path };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Statement File, Fresh. { ok, text, missing }
    // ------------------------------------------------------------
    async function Na__CfApi__ReadStatementFile(relativePath) {
        const location = Na__CfApi__StatementFileLocation(relativePath);
        if (!location) return { ok : false, error : `Refused statement path "${relativePath}"` };
        const call = await Na__CfApi__Call('GET', location.cdnUrl, null, { asText : true });
        if (call.status === 404) return { ok : true, text : null, missing : true };
        if (!call.ok) return { ok : false, error : call.error };
        return { ok : true, text : typeof call.answer === 'string' ? call.answer : null, missing : false };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sheet Images (the Layout Editor's Pictures)
// -----------------------------------------------------------------------------

    // FUNCTION | Where a Sheet Picture Lives. { key, cdnUrl, repoUrl, relative, folder, file }, or Null
    // ------------------------------------------------------------
    function Na__CfApi__SheetImageLocation(folder, fileName) {
        if (!Na__CfApi__Id()) return null;
        if (!Na__CfApi__SheetImageFolder.test(String(folder || '')) || folder === Na__CfApi__SHEET_IMAGES_ARCHIVE) return null;
        if (!Na__CfApi__SheetImageFile.test(String(fileName || ''))) return null;
        const inside = `${Na__CfApi__SHEET_IMAGES_DIR}/${folder}/${fileName}`;
        const url    = Na__CfApi__UserDataUrl(inside);
        return { key : inside, cdnUrl : url, repoUrl : url, relative : inside, folder : folder, file : fileName };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Folder Every Picture of This Project Starts With
    // ------------------------------------------------------------
    function Na__CfApi__SheetImagesPrefix() {
        return Na__CfApi__Id() ? `${Na__CfApi__SHEET_IMAGES_DIR}/` : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Picture of This Project. { ok, objects: [{ key, folder, file, size }] }
    // ------------------------------------------------------------
    async function Na__CfApi__ListSheetImages() {
        if (!Na__CfApi__Id()) return { ok : false, error : 'No project for this page.', objects : [] };
        const call = await Na__CfApi__Call('GET', Na__AppUtils__ApiUrl(`valevision/sheet-images/list?${Na__CfApi__ProjectQuery()}`));
        if (!call.ok) return { ok : false, error : call.error, objects : [] };
        const objects = ((call.answer && call.answer.entries) || [])
            .filter((one) => !one.archived && one.folder && one.folder.indexOf('/') === -1)
            .map((one) => ({ key : `${Na__CfApi__SHEET_IMAGES_DIR}/${one.folder}/${one.file}`, folder : one.folder, file : one.file, size : one.bytes }));
        return { ok : true, objects : objects };
    }
    // ------------------------------------------------------------


    // FUNCTION | Store One Picture. { ok, key }
    // ------------------------------------------------------------
    async function Na__CfApi__UploadSheetImage(folder, fileName, blob) {
        const location = Na__CfApi__SheetImageLocation(folder, fileName);
        if (!location) return { ok : false, error : `Refused picture path "${folder}/${fileName}"` };
        if (!Na__CfApi__IsBlob(blob) || !blob.size) return { ok : false, error : 'Nothing to upload' };
        const refusal = Na__CfApi__WriteRefusal();
        if (refusal) return { ok : false, error : refusal };
        const query = `${Na__CfApi__ProjectQuery()}&folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(fileName)}`;
        const call  = await Na__CfApi__Call('POST', Na__AppUtils__ApiUrl(`valevision/sheet-images/upload?${query}`), blob,
            { headers : { 'Content-Type' : blob.type || 'application/octet-stream' } });
        return call.ok ? { ok : true, key : location.key } : { ok : false, error : call.error };
    }
    // ------------------------------------------------------------


    // FUNCTION | Copy / Delete a Picture (the server's reconcile route does this work)
    // ------------------------------------------------------------
    async function Na__CfApi__CopySheetImage(fromFolder, toFolder, fileName) {
        void fromFolder; void toFolder; void fileName;
        return { ok : false, error : 'Not on this server: the sheet-images reconcile route moves pictures.' };
    }
    async function Na__CfApi__DeleteSheetImage(folder, fileName) {
        void folder; void fileName;
        return { ok : false, error : 'Not on this server: the sheet-images reconcile route archives pictures.' };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Published Documents
// -----------------------------------------------------------------------------

    // FUNCTION | Where a Published File Lives. { key, cdnUrl, repoUrl, path, immutable }, or Null
    // ------------------------------------------------------------
    function Na__CfApi__PublishedLocation(relativePath) {
        if (!Na__CfApi__Id()) return null;
        const parts = String(relativePath || '').replace(/\\/g, '/').split('/').filter((one) => one !== '');
        if (parts.length === 0 || parts.length > 6) return null;
        if (parts[0] === Na__CfApi__PUBLISHED_ARCHIVE) return null;
        if (!parts.every((one) => Na__CfApi__PublishedSegment.test(one) && one !== '.' && one !== '..')) return null;
        if (!Na__CfApi__PublishedExtension.test(parts[parts.length - 1])) return null;
        const inside = `${Na__CfApi__PUBLISHED_DIR}/${parts.join('/')}`;
        const url    = Na__CfApi__UserDataUrl(inside);
        return { key : inside, cdnUrl : url, repoUrl : url, path : parts.join('/'), immutable : Na__CfApi__PublishedHashed.test(parts[parts.length - 1]) };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Prefix of the Published Root, or of One Document
    // ------------------------------------------------------------
    function Na__CfApi__PublishedPrefix(documentId) {
        if (!Na__CfApi__Id()) return null;
        const root = `${Na__CfApi__PUBLISHED_DIR}/`;
        if (!documentId) return root;
        return Na__CfApi__PublishedSegment.test(String(documentId)) ? (root + documentId + '/') : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Published File, Under the Root or One Document. { ok, objects: [{ key, path, size }] }
    // ------------------------------------------------------------
    async function Na__CfApi__ListPublished(documentId) {
        const prefix = Na__CfApi__PublishedPrefix(documentId);
        if (!prefix) return { ok : false, error : `Refused published document "${documentId}"`, objects : [] };
        const call = await Na__CfApi__Call('GET', Na__AppUtils__ApiUrl(`valevision/published/list?${Na__CfApi__ProjectQuery()}`));
        if (!call.ok) return { ok : false, error : call.error, objects : [] };
        const files = (call.answer && Array.isArray(call.answer.files)) ? call.answer.files : [];
        const objects = files
            .map((one) => (typeof one === 'string' ? { path : one } : one))
            .filter((one) => one && one.path && (!documentId || one.path.indexOf(documentId + '/') === 0))
            .map((one) => ({ key : `${Na__CfApi__PUBLISHED_DIR}/${one.path}`, path : one.path, size : one.bytes || one.size || 0 }));
        return { ok : true, objects : objects };
    }
    // ------------------------------------------------------------


    // FUNCTION | Store One Published File. { ok, key }
    // ------------------------------------------------------------
    async function Na__CfApi__UploadPublished(relativePath, blob) {
        const location = Na__CfApi__PublishedLocation(relativePath);
        if (!location) return { ok : false, error : `Refused published path "${relativePath}"` };
        if (!Na__CfApi__IsBlob(blob) || !blob.size) return { ok : false, error : 'Nothing to upload' };
        const refusal = Na__CfApi__WriteRefusal();
        if (refusal) return { ok : false, error : refusal };
        const query = `${Na__CfApi__ProjectQuery()}&path=${encodeURIComponent(location.path)}`;
        const call  = await Na__CfApi__Call('POST', Na__AppUtils__ApiUrl(`valevision/published/file?${query}`), blob,
            { headers : { 'Content-Type' : blob.type || 'application/octet-stream' } });
        return call.ok ? { ok : true, key : location.key } : { ok : false, error : call.error };
    }
    // ------------------------------------------------------------


    // FUNCTION | Take One Published File Off (the server's archive and prune routes do this work)
    // ------------------------------------------------------------
    async function Na__CfApi__DeletePublished(relativePath) {
        void relativePath;
        return { ok : false, error : 'Not on this server: the published archive and prune routes retire files.' };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Project Storage Client (TrueVision's CfApi names)
    // ------------------------------------------------------------
    export {
        Na__CfApi__Initialize,
        Na__CfApi__IsConfigured,
        Na__CfApi__GetProjectContext,
        Na__CfApi__SetLoadedProjectData,
        Na__CfApi__GetLoadedProjectData,
        Na__CfApi__BuildContentCdnUrl,
        Na__CfApi__ReadProjectData,
        Na__CfApi__WriteProjectData,
        Na__CfApi__MergeAndSaveKeys,
        Na__CfApi__DeleteProjectKeys,
        Na__CfApi__WriteThumbnailWebp,
        Na__CfApi__WriteProjectAsset,
        Na__CfApi__ProjectFileLocation,
        Na__CfApi__ReadProjectFile,
        Na__CfApi__WriteProjectFile,
        Na__CfApi__StatementFileLocation,
        Na__CfApi__ReadStatementFile,
        Na__CfApi__WriteStatementFile,
        Na__CfApi__AdminFileLocation,
        Na__CfApi__PlansFileLocation,
        Na__CfApi__SHEET_IMAGES_DIR,
        Na__CfApi__SHEET_IMAGES_ARCHIVE,
        Na__CfApi__SheetImageLocation,
        Na__CfApi__SheetImagesPrefix,
        Na__CfApi__ListSheetImages,
        Na__CfApi__UploadSheetImage,
        Na__CfApi__CopySheetImage,
        Na__CfApi__DeleteSheetImage,
        Na__CfApi__PublishedLocation,
        Na__CfApi__PublishedPrefix,
        Na__CfApi__ListPublished,
        Na__CfApi__UploadPublished,
        Na__CfApi__DeletePublished,
        Na__CfApi__GetProjectDisplayName                                     // <-- ValeVision only: the project's name for a printed document
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
