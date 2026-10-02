// =============================================================================
// VALEVISION3D - CLOUDFLARE INTEGRATION - R2 API CLIENT
// =============================================================================
//
// FILE       : Na__CloudflareIntegration__ApiClient__.js
// NAMESPACE  : Na__CfApi
// MODULE     : Cloudflare R2 API Client
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read, merge and write ValeVision's project data and project files on
//              R2 through the whitecardopedia-editor-api Worker, under TrueVision's names
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - THE TRANSPORT FACADE. TrueVision's drawing modules reach their storage
//   through one client with 33 named exports. This file has exactly those
//   names, their parameters and their result shapes, so a module ported from
//   TrueVision links and runs here unchanged - but every body is ValeVision's
//   own: its Worker (whitecardopedia-editor-api, X-Editor-Api-Key), its R2
//   layout (VaApps/Projects/<folderId>/...) and its local Flask server.
// - ONE PROJECT FOLDER, FROM THE ADDRESS BAR. The folder is the master-index
//   entry the ?project= token names (Na__AppUtils__GetYearFromUrl and
//   Na__AppUtils__GetProjectFolderFromUrl): "2026/3047__Doous". Never
//   project.json's own folderId field (missing or stale in a third of the
//   projects) and never a guessed year: with no index entry there is no
//   folder, Na__CfApi__IsConfigured() is false and every write is refused.
// - THE WORKER'S URL AND KEY COME ONLY FROM THE LOCAL SERVER (GET
//   /api/editor-config, read once by Na__AppUtils__R2FetchWorkerConfig), so
//   authoring is a localhost activity. On the live site IsConfigured() is
//   false, every write answers "Worker not configured", and every read goes to
//   the public CDN copy - no Flask, no key.
// - THE WORKER SAYS WHAT IT CAN DO. Initialize reads its /health once and a
//   route is called only when that answer lists it (project, merge-keys and
//   files arrive with Worker 1.6.0). An older Worker still serves every call
//   ValeVision could already make: a merge becomes a whole-document save over
//   a fresh copy of the project from the local server, a sibling document is
//   read and written through drawing-notes or read from the CDN, an asset
//   goes up through /assets. Sheet pictures, published documents and
//   statements have no route on an older Worker and are refused, saying so.
// - ONLY THE EDITOR'S KEYS. A merge or a key delete never touches a key the
//   SketchUp sync and the project editor own (projectCode, images, the model
//   URLs ...): the Worker refuses them, and so does this client on every path.
// - NEVER THROWS. Every function resolves { ok: false, error } on a failure,
//   as TrueVision's does.
// - Na__CfApi__GetProjectDisplayName() (ValeVision only) answers the project's
//   name for a printed document from the loaded project data.
//
// INTEGRATION:
// - Na__AppFlow__LoadingSequence awaits Na__CfApi__Initialize() once the
//   master index has settled, and registers the project data it loaded with
//   Na__CfApi__SetLoadedProjectData() before the drawings are dispatched.
// - Ported TrueVision modules import the names they use from this file, as
//   they do in TrueVision. The local half of a save is
//   Na__AppUtils__LocalProjectMirror__.js.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js
//                   - the interface only: its 33 exported names, their parameters and their result shapes.
//                   Every body is ValeVision's.
// - Source version: 1.5.0 (TrueVision3D v2.116.0, 21-Sep-2026; the Statement and Published regions it carries
//                   unlogged came with v2.95.0 and v2.155.0; read at HEAD b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1
// - Parity        : diverged (DIV-4: identical names and signatures, different transport)
// - Divergences   :
//   - A ValeVision-bodied twin (K2 H3): FILE, NAMESPACE, MODULE, the banner text and every exported name are
//     TrueVision's; PURPOSE, CREATED, DESCRIPTION and INTEGRATION describe ValeVision's body.
//   - The transport is ValeVision's whitecardopedia-editor-api Worker, with X-Editor-Api-Key from the local
//     server's /api/editor-config, never TrueVision's own Worker. Keys are VaApps/Projects/<folderId>/<path>;
//     TrueVision's folder names sit directly inside the project folder (05__Layout__DrawingDocs__Images,
//     06__Layout__PublishedDocuments, 10__StatementDocs) with no app-content level between; the sibling
//     documents are ValeVision__DrawingNotes__.json and ValeVision__StatementDocs__.json.
//   - Initialize is async and takes no Worker URL (an app config object, when given, names the CDN base). It
//     reads the Worker's /health for its route list; IsConfigured is true only on localhost, with the Worker
//     config and a master-index folder.
//   - The project folder comes from the master index only. GetProjectContext also answers folderId, and its
//     yearCode has four digits.
//   - MergeAndSaveKeys and DeleteProjectKeys merge on the Worker (merge-keys) when it lists the route; otherwise,
//     or when R2 has no project.json yet, or when the deployed Worker's list refuses a key, they save the whole
//     document over a fresh copy from the local server (the loaded copy when that cannot be read). Both refuse
//     the pipeline-owned keys the Worker refuses, and share one queue. MergeAndSaveKeys takes an optional
//     second argument { drawingsBase } ('iso:<stamp>' | 'none') for the Worker's R2 judging; it is sent only
//     when a caller passes it (R2 judging is off until its flag is switched on).
//   - Reads fall back to the public CDN copy (no-store) when the Worker is not configured or has no route for
//     them; ReadProjectData uses the Worker's project route only when listed.
//   - WriteThumbnailWebp and WriteProjectAsset go through the files routes when listed (no build-manifest
//     bump), else /assets. Sheet pictures, published documents and statements need the files routes: there is
//     no base64 fallback through an older route.
//   - AdminFileLocation and PlansFileLocation answer null: ValeVision has no admin or PlanVision files.
//   - Repository URLs are relative to the app root (right on Flask and on the GitHub Pages sub-path), never to
//     window.location.origin; every URL is encoded per path segment (three project folders have a space).
//   - Blobs are read with blob.arrayBuffer(), not FileReader.
//   - VV-only export (K2 X2): Na__CfApi__GetProjectDisplayName, the project's name for a printed document,
//     where TrueVision reads the project context its PWA layer publishes on window.
// - Back-port     : Na__CfApi__GetProjectDisplayName (an accessor in place of the PWA global), and the server-side
//                   merge and path families TrueVision's own Worker has none of.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0 (transport facade, v2.71.1)
// - TrueVision3D's client interface (ApiClient 1.5.0, its 33 names) over
//   ValeVision's Worker, R2 layout and local server, feature-detecting the
//   Worker's routes, with the project display-name accessor.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Identity, Environment and the CDN Base
    // ------------------------------------------------------------
    import {
        Na__AppUtils__IsRunningOnLocalhost,
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__GetProjectFolderFromUrl,
        Na__AppUtils__GetYearFromUrl,
        Na__AppUtils__InitMasterIndex,
        Na__AppUtils__R2BaseUrl_Fallback
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Worker's URL and Key (from the local server, memoised)
    // ------------------------------------------------------------
    import { Na__AppUtils__R2FetchWorkerConfig } from '../03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | ValeVision's R2 Layout and the Repository Copy
    // ------------------------------------------------------------
    // Every key this client names is VaApps/Projects/<folderId>/<path>. The
    // repository copy of a project sits beside the app in the Whitecardopedia
    // folder, so its URL is found from where this module was served: the
    // Flask server (/ValeVision3D/) and GitHub Pages
    // (/ValeCodebase/WebApps/ValeVision3D/) both answer it, and a missing file
    // is a real 404 on both.
    // ------------------------------------------------------------
    const Na__CfApi__R2KeyRoot      = 'VaApps/Projects';                         // <-- Bucket prefix every ValeVision key starts with
    const Na__CfApi__ProjectFile    = 'project.json';                            // <-- The project data file beside every other project file
    const Na__CfApi__ThumbsDir      = 'PresentationMode/Thumbnails';             // <-- Presentation scene thumbnail folder (relative)
    const Na__CfApi__RepoProjects   = '../Whitecardopedia/Projects/';            // <-- The repository's project folders, relative to the app root
    const Na__CfApi__AppRootUrl     = new URL('../../', import.meta.url);        // <-- The ValeVision3D folder, wherever it is served from
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Worker's Routes and Its Answers
    // ------------------------------------------------------------
    // A Worker deployed before 1.6.0 answers /health with no route list; it
    // serves the three routes ValeVision has always called and nothing else.
    // ------------------------------------------------------------
    const Na__CfApi__RoutesBefore160 = Object.freeze([ 'save', 'assets', 'drawing-notes' ]);
    const Na__CfApi__MergeAttempts   = 3;                                        // <-- A merge the Worker asks to retry (503 retry) is sent at most this often
    const Na__CfApi__ListPageLimit   = 50;                                       // <-- Pages of a listing followed, 1,000 names each
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Top-Level Keys Only the Pipelines Write
    // ------------------------------------------------------------
    // The SketchUp sync and the project editor own these; the Worker's merge
    // refuses them, and this client refuses them on every path, so a merge
    // gives the same answer whichever route carries it. The legacy camera key
    // may be removed (the camera saver clears it) but never set.
    // ------------------------------------------------------------
    const Na__CfApi__PipelineKeys = Object.freeze([
        'projectCode', 'projectName', 'folderId', 'basePath',
        'images', 'allImages', 'displayImages', 'thumbnailImage',
        'valeVision_ModelUrls', 'valeVision_ModelUrl', 'ValeVison3D__SketchUpCameraData'
    ]);
    const Na__CfApi__RemoveOnlyKeys = Object.freeze([ 'valeVision_Camera__DefaultPosition' ]);
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Assets: Thumbnails, Baked Linework and Snapshots
    // ------------------------------------------------------------
    // The guard is not security - the Worker key is the security - it stops a
    // caller writing outside the three asset folders by accident.
    // ------------------------------------------------------------
    const Na__CfApi__AssetPathPattern = /^(PresentationMode\/Thumbnails|LayoutEditor\/(Linework|Snapshots))\/[A-Za-z0-9_.\-]+\.(webp|png|json)$/;
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Project Name Fields, in the Order Whitecardopedia Shows Them
    // ------------------------------------------------------------
    // Whitecardopedia shows projectNameAlias when one is set, else
    // projectName (its loader writes displayName from those two).
    // ------------------------------------------------------------
    const Na__CfApi__ProjectNameKeys = Object.freeze([ 'projectNameAlias', 'displayName', 'projectName' ]);
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | The Worker (localhost only) and What It Serves
    // ------------------------------------------------------------
    let Na__CfApi__WorkerConfig     = null;                                      // <-- { workerApiBaseUrl, apiKey } from the local server
    let Na__CfApi__WorkerRoutes     = [];                                        // <-- What /health listed (or the pre-1.6.0 three)
    let Na__CfApi__WorkerVersion    = null;                                      // <-- e.g. '1.6.0'; null for a Worker that does not say
    let Na__CfApi__InitPromise      = null;                                      // <-- Initialize runs once per session
    let Na__CfApi__R2BaseUrl        = String(Na__AppUtils__R2BaseUrl_Fallback).replace(/\/+$/, '');   // <-- Public CDN base of VaApps/Projects
    // ------------------------------------------------------------

    // MODULE VARIABLES | In-Memory Full Project Data (merge base for saves)
    // ------------------------------------------------------------
    // The loading sequence registers the project data the app actually loaded.
    // A merge keeps it current; a whole-document save replaces it with what it
    // wrote.
    // ------------------------------------------------------------
    let Na__CfApi__LoadedProjectData = null;                                     // <-- Full project data the app is currently running
    // ------------------------------------------------------------

    // MODULE VARIABLES | One Queue for Every Change to the Project Document
    // ------------------------------------------------------------
    let Na__CfApi__MergeQueue = Promise.resolve();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers - Paths, URLs and Answers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | This Page's Project Folder: "2026/3047__Doous", or null
    // ------------------------------------------------------------
    function Na__CfApi__FolderId() {
        const year   = Na__AppUtils__GetYearFromUrl();
        const folder = Na__AppUtils__GetProjectFolderFromUrl();
        return (year && folder) ? `${year}/${folder}` : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Encode Each Segment of a Path (a folder may hold a space)
    // ------------------------------------------------------------
    function Na__CfApi__EncodePath(path) {
        return String(path).split('/').map((segment) => encodeURIComponent(segment)).join('/');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Year as Four Digits ("26" reads as "2026")
    // ------------------------------------------------------------
    function Na__CfApi__FourDigitYear(yearCode) {
        const text = String(yearCode === undefined || yearCode === null ? '' : yearCode).trim();
        return /^\d{2}$/.test(text) ? `20${text}` : text;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The R2 Key of a Project-Relative Path
    // ------------------------------------------------------------
    function Na__CfApi__R2Key(folderId, relativePath) {
        return `${Na__CfApi__R2KeyRoot}/${folderId}/${relativePath}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Public CDN URL of a Project-Relative Path
    // ------------------------------------------------------------
    function Na__CfApi__CdnUrl(folderId, relativePath) {
        return `${Na__CfApi__R2BaseUrl}/${Na__CfApi__EncodePath(folderId)}/${Na__CfApi__EncodePath(relativePath)}`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Repository URL of a Project-Relative Path (app-root relative)
    // ------------------------------------------------------------
    function Na__CfApi__RepoUrl(folderId, relativePath) {
        return new URL(Na__CfApi__RepoProjects + Na__CfApi__EncodePath(folderId) + '/' + Na__CfApi__EncodePath(relativePath), Na__CfApi__AppRootUrl).href;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Path of a Project-Relative File Under the Repository Root
    // ------------------------------------------------------------
    // What a GitHub Pages fallback is built from: the site base, a slash and this.
    // ------------------------------------------------------------
    function Na__CfApi__RepoRelative(folderId, relativePath) {
        return 'Whitecardopedia/Projects/' + Na__CfApi__EncodePath(folderId) + '/' + Na__CfApi__EncodePath(relativePath);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Words for "No Project Folder"
    // ------------------------------------------------------------
    function Na__CfApi__NoFolderError() {
        return 'No project folder for this page: the master index has no entry for ?project=';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Words for "No Worker"
    // ------------------------------------------------------------
    function Na__CfApi__NotConfiguredError() {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return 'Worker not configured: saving needs the local Whitecardopedia server';
        if (!Na__CfApi__InitPromise) return 'Worker not configured: Na__CfApi__Initialize has not run yet';
        if (!Na__CfApi__WorkerConfig) return 'Worker not configured: the local Whitecardopedia server gave no editor worker config (EDITOR_WORKER_URL and EDITOR_API_KEY in Token__CloudflareAPI.env)';
        return 'Worker not configured: ' + Na__CfApi__NoFolderError();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Words for a Route This Worker Does Not Have
    // ------------------------------------------------------------
    function Na__CfApi__NeedsRouteError(what) {
        return `${what} need the editor worker's files routes (whitecardopedia-editor-api 1.6.0), which this Worker`
             + ` (${Na__CfApi__WorkerVersion || 'before 1.6.0'}) does not list - deploy it first`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Does the Worker List This Route
    // ------------------------------------------------------------
    function Na__CfApi__HasRoute(name) {
        return Na__CfApi__WorkerRoutes.indexOf(name) !== -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Short Pause (a merge the Worker asked to retry)
    // ------------------------------------------------------------
    function Na__CfApi__Pause(milliseconds) {
        return new Promise((resolve) => { setTimeout(resolve, milliseconds); });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Error Words of a Failed Call
    // ------------------------------------------------------------
    function Na__CfApi__CallError(call, what) {
        if (call && call.error) return call.error;
        if (call && call.answer && typeof call.answer.error === 'string' && call.answer.error) return call.answer.error;
        return `${what} failed (${call ? call.status : 'no answer'})`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bytes as Base64 (chunked: no huge argument lists)
    // ------------------------------------------------------------
    function Na__CfApi__BytesToBase64(bytes) {
        let binary = '';
        for (let index = 0; index < bytes.length; index += 0x8000) {
            binary += String.fromCharCode.apply(null, bytes.subarray(index, index + 0x8000));
        }
        return btoa(binary);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Blob as Base64 (no data: prefix)
    // ------------------------------------------------------------
    async function Na__CfApi__BlobToBase64(blob) {
        return Na__CfApi__BytesToBase64(new Uint8Array(await blob.arrayBuffer()));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Text as UTF-8 Base64
    // ------------------------------------------------------------
    function Na__CfApi__TextToBase64(text) {
        return Na__CfApi__BytesToBase64(new TextEncoder().encode(String(text)));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is This a Blob (a File is one too)
    // ------------------------------------------------------------
    function Na__CfApi__IsBlob(value) {
        return typeof Blob !== 'undefined' && value instanceof Blob;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers - Calls
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Call One of This Project's Worker Routes; Never Throws
    // ------------------------------------------------------------
    // suffix follows /projects/<folderId>, e.g. '/merge-keys' or
    // '/files/upload?path=...'. jsonBody goes as JSON; rawBody (a Blob) goes
    // as it is, with the headers given. Resolves to { status, ok, answer,
    // error }: answer is the parsed JSON reply, or null.
    // ------------------------------------------------------------
    async function Na__CfApi__CallWorker(method, suffix, jsonBody, extraHeaders, rawBody) {
        const config   = Na__CfApi__WorkerConfig;
        const folderId = Na__CfApi__FolderId();
        if (!config || !folderId) return { status : 0, ok : false, answer : null, error : Na__CfApi__NotConfiguredError() };

        const headers = Object.assign({ 'X-Editor-Api-Key' : config.apiKey }, extraHeaders || {});
        const init    = { method : method, headers : headers, cache : 'no-store' };
        if (rawBody !== undefined) {
            init.body = rawBody;
        } else if (jsonBody !== undefined) {
            headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(jsonBody);
        }

        try {
            const response = await fetch(`${config.workerApiBaseUrl}/projects/${Na__CfApi__EncodePath(folderId)}${suffix}`, init);
            const answer   = await response.json().catch(() => null);
            return { status : response.status, ok : response.ok, answer : answer, error : null };
        } catch (error) {
            console.error('[ValeVision3D] CfApi worker call error:', error);
            return { status : 0, ok : false, answer : null, error : 'Worker unreachable' };
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a File From the Public CDN, Fresh; Never Throws
    // ------------------------------------------------------------
    // asText: the body as text, else parsed JSON. Resolves to { ok, missing,
    // data, text, error }; a 404 (or the 403 R2 gives some missing keys) is
    // missing, an answer rather than a failure.
    // ------------------------------------------------------------
    async function Na__CfApi__ReadCdn(url, asText) {
        try {
            const response = await fetch(`${url}?t=${Date.now()}`, { cache : 'no-store' });
            if (response.status === 404 || response.status === 403) return { ok : true, missing : true, data : null, text : null, error : null };
            if (!response.ok) return { ok : false, missing : false, data : null, text : null, error : `CDN read failed (${response.status})` };
            if (asText) return { ok : true, missing : false, data : null, text : await response.text(), error : null };
            return { ok : true, missing : false, data : await response.json(), text : null, error : null };
        } catch (error) {
            return { ok : false, missing : false, data : null, text : null, error : (error && error.message) ? `CDN unreachable (${error.message})` : 'CDN unreachable' };
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Project File Through the Worker (files/read)
    // ------------------------------------------------------------
    async function Na__CfApi__WorkerReadFile(relativePath) {
        const call = await Na__CfApi__CallWorker('POST', '/files/read', { path : relativePath });
        if (call.status === 404 && call.answer && call.answer.missing) return { ok : true, missing : true, answer : null };
        if (!call.ok || !call.answer) return { ok : false, error : Na__CfApi__CallError(call, 'Read') };
        return { ok : true, missing : false, answer : call.answer };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write One Project File Through the Worker (files/write)
    // ------------------------------------------------------------
    async function Na__CfApi__WorkerWriteFile(relativePath, data, encoding) {
        const body = { path : relativePath, data : data };
        if (encoding) body.encoding = encoding;
        const call = await Na__CfApi__CallWorker('POST', '/files/write', body);
        if (!call.ok) return { ok : false, error : Na__CfApi__CallError(call, 'Write') };
        return { ok : true, key : (call.answer && call.answer.key) || null };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Upload One Project File's Bytes Through the Worker (files/upload)
    // ------------------------------------------------------------
    async function Na__CfApi__WorkerUploadFile(relativePath, blob, contentType) {
        const query = new URLSearchParams({ path : relativePath });
        const type  = contentType || blob.type || 'application/octet-stream';
        const call  = await Na__CfApi__CallWorker('POST', `/files/upload?${query.toString()}`, undefined, { 'Content-Type' : type }, blob);
        if (!call.ok) return { ok : false, error : Na__CfApi__CallError(call, 'Upload') };
        return { ok : true, key : (call.answer && call.answer.key) || null };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Every File Under One Family Folder (files/list, every page)
    // ------------------------------------------------------------
    // Resolves to { ok, paths: [{ path, size, etag }], error } with paths
    // relative to the project folder.
    // ------------------------------------------------------------
    async function Na__CfApi__WorkerListFiles(prefix) {
        const paths = [];
        let cursor = null;
        for (let page = 0; page < Na__CfApi__ListPageLimit; page++) {
            const body = cursor ? { prefix : prefix, limit : 1000, cursor : cursor } : { prefix : prefix, limit : 1000 };
            const call = await Na__CfApi__CallWorker('POST', '/files/list', body);
            if (!call.ok || !call.answer) return { ok : false, paths : paths, error : Na__CfApi__CallError(call, 'List') };
            (Array.isArray(call.answer.objects) ? call.answer.objects : []).forEach((object) => {
                if (object && typeof object.path === 'string') paths.push({ path : object.path, size : object.size, etag : object.etag || null });
            });
            if (!call.answer.truncated || !call.answer.cursor) break;
            cursor = call.answer.cursor;
        }
        return { ok : true, paths : paths, error : null };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Delete Project Files Through the Worker (files/delete)
    // ------------------------------------------------------------
    async function Na__CfApi__WorkerDeleteFile(relativePath) {
        const call = await Na__CfApi__CallWorker('POST', '/files/delete', { path : relativePath });
        if (!call.ok) return { ok : false, error : Na__CfApi__CallError(call, 'Delete') };
        return { ok : true };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization & Context
// -----------------------------------------------------------------------------

    // FUNCTION | Find the Worker and What It Serves (async; once per session)
    // ------------------------------------------------------------
    // TrueVision passes its Worker's URL in; ValeVision's URL and key come only
    // from the local server, so a string argument is ignored. An app config
    // object (Na__AppConfig__Main.json, or { appConfig }) names the public CDN
    // base when given. Awaits the master index, then - on localhost only -
    // the Worker config and the Worker's /health. Resolves to { ok,
    // configured, folderId, routes, version, error }; never rejects.
    // ------------------------------------------------------------
    function Na__CfApi__Initialize(options) {
        const appConfig = (options && typeof options === 'object') ? (options.appConfig || options) : null;
        const urls      = (appConfig && typeof appConfig === 'object') ? appConfig.ProjectData__AssetUrls : null;
        if (urls && typeof urls.ProjectData__AssetUrls__R2BaseUrl === 'string' && urls.ProjectData__AssetUrls__R2BaseUrl) {
            Na__CfApi__R2BaseUrl = urls.ProjectData__AssetUrls__R2BaseUrl.replace(/\/+$/, '');   // <-- The configured CDN base
        }
        if (!Na__CfApi__InitPromise) {
            Na__CfApi__InitPromise = Na__CfApi__InitializeNow().catch((error) => ({
                ok : false, configured : false, folderId : null, routes : [], version : null,
                error : (error && error.message) || 'Initialize failed'
            }));
        }
        return Na__CfApi__InitPromise;
    }
    async function Na__CfApi__InitializeNow() {
        try { await Na__AppUtils__InitMasterIndex(); } catch (error) { /* never throws; an empty index leaves no folder */ }
        const folderId = Na__CfApi__FolderId();
        const answer   = () => ({
            ok         : true,
            configured : Na__CfApi__IsConfigured(),
            folderId   : folderId,
            routes     : Na__CfApi__WorkerRoutes.slice(),
            version    : Na__CfApi__WorkerVersion,
            error      : Na__CfApi__IsConfigured() ? null : Na__CfApi__NotConfiguredError()
        });

        if (!Na__AppUtils__IsRunningOnLocalhost()) return answer();          // <-- The live site: reads through the CDN, no writes

        let config = null;
        try { config = await Na__AppUtils__R2FetchWorkerConfig(); } catch (error) { config = null; }
        if (!config || !config.workerApiBaseUrl || !config.apiKey) {
            console.warn('[ValeVision3D] CfApi: the local server gave no editor worker config - saves to R2 are off for this session.');
            return answer();
        }
        Na__CfApi__WorkerConfig = {
            workerApiBaseUrl : String(config.workerApiBaseUrl).replace(/\/+$/, ''),
            apiKey           : String(config.apiKey)
        };

        // CAPABILITIES | The routes /health lists; a Worker that lists none is the pre-1.6.0 three
        Na__CfApi__WorkerRoutes = Na__CfApi__RoutesBefore160.slice();
        try {
            const response = await fetch(`${Na__CfApi__WorkerConfig.workerApiBaseUrl}/health`, { cache : 'no-store' });
            const health   = response.ok ? await response.json().catch(() => null) : null;
            if (health && Array.isArray(health.routes)) {
                Na__CfApi__WorkerRoutes = health.routes.filter((name) => typeof name === 'string');
            }
            Na__CfApi__WorkerVersion = (health && typeof health.version === 'string') ? health.version : null;
        } catch (error) {
            console.warn('[ValeVision3D] CfApi: the editor worker did not answer /health - only the routes every version has will be used.');
        }

        if (!folderId) console.warn('[ValeVision3D] CfApi: ' + Na__CfApi__NoFolderError() + ' - every write is refused.');
        return answer();
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Client Configured for Saving?
    // ------------------------------------------------------------
    // Synchronous, as TrueVision's: the Worker config was read by Initialize.
    // ------------------------------------------------------------
    function Na__CfApi__IsConfigured() {
        return Boolean(Na__CfApi__WorkerConfig && Na__CfApi__FolderId());
    }
    // ------------------------------------------------------------


    // FUNCTION | Register the Full Project Data the App Loaded (merge base)
    // ------------------------------------------------------------
    function Na__CfApi__SetLoadedProjectData(projectData) {
        Na__CfApi__LoadedProjectData = (projectData && typeof projectData === 'object') ? projectData : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Registered Full Project Data (or null)
    // ------------------------------------------------------------
    function Na__CfApi__GetLoadedProjectData() {
        return Na__CfApi__LoadedProjectData;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Project's Name for a Printed Document ('' when unknown)
    // ------------------------------------------------------------
    // ValeVision only. The name Whitecardopedia shows - projectNameAlias when
    // one is set, then displayName, then projectName - read from the project
    // data the app loaded. Where TrueVision reads its PWA's project context.
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


    // FUNCTION | Read Project Folder / Year / Code for This Page
    // ------------------------------------------------------------
    // { projectFolder: '3047__Doous', yearCode: '2026', projectCode: '3047',
    //   folderId: '2026/3047__Doous' }; folder, year and folderId are null
    //   until the master index has settled, and when it has no entry.
    // ------------------------------------------------------------
    function Na__CfApi__GetProjectContext() {
        const projectFolder = Na__AppUtils__GetProjectFolderFromUrl();
        const yearCode      = Na__AppUtils__GetYearFromUrl();
        const folderId      = (projectFolder && yearCode) ? `${yearCode}/${projectFolder}` : null;
        const loaded        = Na__CfApi__LoadedProjectData;
        const urlCode       = Na__AppUtils__GetProjectCodeFromUrl();
        let   projectCode   = null;
        if (loaded && (typeof loaded.projectCode === 'string' || typeof loaded.projectCode === 'number') && String(loaded.projectCode)) {
            projectCode = String(loaded.projectCode);                        // <-- The project's own code
        } else if (urlCode && urlCode.indexOf('/') === -1) {
            projectCode = urlCode;                                           // <-- A bare ?project= code
        } else if (projectFolder) {
            projectCode = projectFolder.split('__')[0] || null;              // <-- The folder's code part
        }
        return {
            projectFolder : projectFolder,
            yearCode      : yearCode,
            projectCode   : projectCode,
            folderId      : folderId
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | CDN URLs
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Public CDN URL for a Project-Relative Asset
    // ------------------------------------------------------------
    // relativePath example: "PresentationMode/Thumbnails/Scene_001.webp" ->
    // https://cdn.noble-architecture.com/VaApps/Projects/2026/3047__Doous/PresentationMode/Thumbnails/Scene_001.webp
    // ------------------------------------------------------------
    function Na__CfApi__BuildContentCdnUrl(projectFolder, yearCode, relativePath) {
        const folderId = `${Na__CfApi__FourDigitYear(yearCode)}/${projectFolder}`;
        return Na__CfApi__CdnUrl(folderId, relativePath);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project Data Read / Merge / Write
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Active Project's project.json From R2
    // ------------------------------------------------------------
    // Through the Worker's project route when it lists one (localhost), else
    // the public CDN copy, fresh. { ok, data, missing }: missing, with data {},
    // when R2 has no project.json.
    // ------------------------------------------------------------
    async function Na__CfApi__ReadProjectData() {
        const folderId = Na__CfApi__FolderId();
        if (!folderId) return { ok : false, error : Na__CfApi__NoFolderError() };

        if (Na__CfApi__IsConfigured() && Na__CfApi__HasRoute('project')) {
            const call = await Na__CfApi__CallWorker('GET', '/project');
            if (call.status === 404 && call.answer && call.answer.missing) return { ok : true, data : {}, missing : true };
            if (!call.ok) return { ok : false, error : Na__CfApi__CallError(call, 'Read') };
            if (!call.answer || typeof call.answer !== 'object' || Array.isArray(call.answer)) return { ok : false, error : 'project.json on R2 is not a JSON object' };
            return { ok : true, data : call.answer, missing : false };
        }

        const cdn = await Na__CfApi__ReadCdn(Na__CfApi__CdnUrl(folderId, Na__CfApi__ProjectFile), false);
        if (!cdn.ok) return { ok : false, error : cdn.error };
        if (cdn.missing) return { ok : true, data : {}, missing : true };
        if (!cdn.data || typeof cdn.data !== 'object' || Array.isArray(cdn.data)) return { ok : false, error : 'project.json on the CDN is not a JSON object' };
        return { ok : true, data : cdn.data, missing : false };
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Full Project Data Object Back to R2
    // ------------------------------------------------------------
    // The Worker's whole-document save: it needs the document's projectCode,
    // updates the master index and bumps the build manifest.
    // ------------------------------------------------------------
    async function Na__CfApi__WriteProjectData(projectDataObject) {
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError() };
        if (!projectDataObject || typeof projectDataObject !== 'object' || Array.isArray(projectDataObject)) {
            return { ok : false, error : 'Nothing to write: project data must be a JSON object' };
        }
        const call = await Na__CfApi__CallWorker('POST', '', projectDataObject);
        if (!call.ok) return { ok : false, error : Na__CfApi__CallError(call, 'Write') };
        return { ok : true };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Keys of a Change the Pipelines Own (refused)
    // ------------------------------------------------------------
    function Na__CfApi__RefusedKeys(names, operation) {
        return names.filter((name) => Na__CfApi__PipelineKeys.indexOf(name) !== -1
            || (operation === 'set' && Na__CfApi__RemoveOnlyKeys.indexOf(name) !== -1));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Queue One Change to the Project Document; Never Rejects
    // ------------------------------------------------------------
    function Na__CfApi__Enqueue(task) {
        const job = Na__CfApi__MergeQueue.then(task).catch((error) => {
            console.error('[ValeVision3D] CfApi save error:', error);
            return { ok : false, error : (error && error.message) || 'Save failed' };
        });
        Na__CfApi__MergeQueue = job.then(() => undefined, () => undefined);
        return job;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Keep the Loaded Copy in Step With a Merge That Landed
    // ------------------------------------------------------------
    function Na__CfApi__ApplyToLoaded(setObject, removeNames) {
        if (!Na__CfApi__LoadedProjectData || typeof Na__CfApi__LoadedProjectData !== 'object') return;
        const next = Object.assign({}, Na__CfApi__LoadedProjectData, JSON.parse(JSON.stringify(setObject)));
        removeNames.forEach((name) => { delete next[name]; });
        Na__CfApi__LoadedProjectData = next;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Merge on the Worker (merge-keys), Retrying When Asked
    // ------------------------------------------------------------
    // Resolves to { ok, drawings } or { ok: false, error } with missing (no
    // project.json on R2), conflict (the drawings on R2 moved on, with their
    // stamp) or refusedKeys (the deployed Worker's list lacks a key) set.
    // ------------------------------------------------------------
    async function Na__CfApi__PostMergeKeys(body) {
        for (let attempt = 1; attempt <= Na__CfApi__MergeAttempts; attempt++) {
            const call   = await Na__CfApi__CallWorker('POST', '/merge-keys', body);
            const answer = call.answer || {};
            if (call.ok) return { ok : true, drawings : answer.drawings || null };
            if (call.status === 409 && answer.missing) return { ok : false, missing : true, error : Na__CfApi__CallError(call, 'Merge') };
            if (call.status === 409 && answer.conflict) return { ok : false, conflict : true, drawings : answer.drawings || null, error : Na__CfApi__CallError(call, 'Merge') };
            if (call.status === 400 && Array.isArray(answer.refused) && answer.refused.length) {
                return { ok : false, refusedKeys : answer.refused.map((one) => one && one.key).filter(Boolean), error : Na__CfApi__CallError(call, 'Merge') };
            }
            if (call.status === 503 && answer.retry && attempt < Na__CfApi__MergeAttempts) {
                await Na__CfApi__Pause(150 * attempt);
                continue;
            }
            return { ok : false, retry : answer.retry === true, error : Na__CfApi__CallError(call, 'Merge') };
        }
        return { ok : false, error : 'Merge failed' };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Local Server's Copy of project.json, Fresh
    // ------------------------------------------------------------
    async function Na__CfApi__ReadLocalProjectData(folderId) {
        try {
            const response = await fetch(`${window.location.origin}/api/projects/${Na__CfApi__EncodePath(folderId)}`, { cache : 'no-store' });
            const answer   = await response.json().catch(() => null);
            if (!response.ok) return { ok : false, error : (answer && answer.error) || `the local copy could not be read (${response.status})` };
            if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return { ok : false, error : 'the local copy is not a JSON object' };
            return { ok : true, data : answer };
        } catch (error) {
            return { ok : false, error : `the local server did not answer (${(error && error.message) || 'no answer'})` };
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Base a Whole-Document Save Merges Into
    // ------------------------------------------------------------
    // On localhost the project as it is on disk now, so keys a build or a sync
    // wrote while the app was open are not put back; else (or when the local
    // server cannot answer) the copy this window loaded; else R2's copy.
    // ------------------------------------------------------------
    async function Na__CfApi__WholeDocumentBase(folderId) {
        if (Na__AppUtils__IsRunningOnLocalhost()) {
            const disk = await Na__CfApi__ReadLocalProjectData(folderId);
            if (disk.ok) return disk;
            console.warn('[ValeVision3D] CfApi: ' + disk.error + ' - the save merges into the copy this window loaded.');
        }
        if (Na__CfApi__LoadedProjectData && typeof Na__CfApi__LoadedProjectData === 'object') {
            return { ok : true, data : JSON.parse(JSON.stringify(Na__CfApi__LoadedProjectData)) };   // <-- Deep clone of the loaded data
        }
        const read = await Na__CfApi__ReadProjectData();
        if (!read.ok) return read;
        if (read.missing) return { ok : false, error : 'No project data to merge into: neither the local server nor R2 has a project.json for this project' };
        return { ok : true, data : read.data };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Save the Whole Document With the Change Applied
    // ------------------------------------------------------------
    async function Na__CfApi__SaveWholeDocument(folderId, setObject, removeNames) {
        const base = await Na__CfApi__WholeDocumentBase(folderId);
        if (!base.ok) return { ok : false, error : base.error };
        const merged = Object.assign({}, base.data || {}, setObject);       // <-- Shallow-merge changed keys at root
        removeNames.forEach((name) => { delete merged[name]; });
        const write = await Na__CfApi__WriteProjectData(merged);
        if (write.ok) Na__CfApi__SetLoadedProjectData(merged);              // <-- Keep in-memory base current for next save
        return write;
    }
    // ------------------------------------------------------------


    // FUNCTION | Merge Top-Level Keys Into the Project and Write It Back (common save path)
    // ------------------------------------------------------------
    // partialObject: { KeyName: value, ... } merged at the document root.
    // options (optional, ValeVision): { drawingsBase } - 'iso:<SavedIso>' or
    // 'none' - asks the Worker to refuse the merge when the drawings on R2 are
    // no longer the ones the window loaded (then conflict: true). Queued with
    // every other change to the document; resolves { ok, error }.
    // ------------------------------------------------------------
    function Na__CfApi__MergeAndSaveKeys(partialObject, options = null) {
        let snapshot;
        try {
            snapshot = JSON.parse(JSON.stringify(partialObject));
        } catch (error) {
            return Promise.resolve({ ok : false, error : 'Nothing to save: the keys could not be read' });
        }
        const opts = Object.assign({}, options || {});
        return Na__CfApi__Enqueue(() => Na__CfApi__MergeAndSaveKeysNow(snapshot, opts));
    }
    async function Na__CfApi__MergeAndSaveKeysNow(partialObject, options) {
        if (!partialObject || typeof partialObject !== 'object' || Array.isArray(partialObject)) {
            return { ok : false, error : 'Nothing to save: the keys must be an object' };
        }
        const names = Object.keys(partialObject);
        if (names.length === 0) return { ok : true };                       // <-- Nothing to merge: the document is as it was
        const refused = Na__CfApi__RefusedKeys(names, 'set');
        if (refused.length) return { ok : false, error : `Refused key(s): ${refused.join(', ')} - written only by the SketchUp sync and the project editor` };
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError() };
        const folderId = Na__CfApi__FolderId();

        if (Na__CfApi__HasRoute('merge-keys')) {
            const body = { set : partialObject };
            if (options && options.drawingsBase !== undefined) body.drawingsBase = options.drawingsBase || 'none';   // <-- null: the window loaded no drawings block
            const merged = await Na__CfApi__PostMergeKeys(body);
            if (merged.ok) {
                Na__CfApi__ApplyToLoaded(partialObject, []);
                return { ok : true, drawings : merged.drawings };
            }
            if (merged.refusedKeys) {
                console.info(`[ValeVision3D] CfApi: the deployed editor worker does not merge ${merged.refusedKeys.join(', ')} yet (redeploy it after ProjectData__EditorOwnedKeys changes) - saving the whole document instead.`);
            } else if (!merged.missing) {
                return merged;                                               // <-- A conflict or a failure: nothing was written
            }
        }
        return Na__CfApi__SaveWholeDocument(folderId, partialObject, []);
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete Top-Level Keys From the Project and Write It Back
    // ------------------------------------------------------------
    // Queued with the merges. The legacy valeVision_Camera__DefaultPosition may
    // be named; the pipelines' own keys are refused.
    // ------------------------------------------------------------
    function Na__CfApi__DeleteProjectKeys(keyNames) {
        const names = Array.isArray(keyNames) ? keyNames.filter((name) => typeof name === 'string' && name) : [];
        return Na__CfApi__Enqueue(() => Na__CfApi__DeleteProjectKeysNow(names));
    }
    async function Na__CfApi__DeleteProjectKeysNow(names) {
        if (names.length === 0) return { ok : true };
        const refused = Na__CfApi__RefusedKeys(names, 'remove');
        if (refused.length) return { ok : false, error : `Refused key(s): ${refused.join(', ')} - written only by the SketchUp sync and the project editor` };
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError() };
        const folderId = Na__CfApi__FolderId();

        if (Na__CfApi__HasRoute('merge-keys')) {
            const merged = await Na__CfApi__PostMergeKeys({ remove : names });
            if (merged.ok) {
                Na__CfApi__ApplyToLoaded({}, names);
                return { ok : true };
            }
            if (!merged.missing && !merged.refusedKeys) return merged;
        }
        return Na__CfApi__SaveWholeDocument(folderId, {}, names);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Thumbnail and Asset Upload
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Write One Asset (thumbnail, baked linework, snapshot)
    // ------------------------------------------------------------
    // Through the files routes when the Worker lists them (no build-manifest
    // bump), else /assets as base64. A Blob goes as its bytes; anything else
    // is JSON. Resolves { ok, error }.
    // ------------------------------------------------------------
    async function Na__CfApi__WriteAsset(relativePath, payload, contentType) {
        if (!Na__CfApi__FolderId()) return { ok : false, error : Na__CfApi__NoFolderError() };
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError() };
        if (!Na__CfApi__AssetPathPattern.test(relativePath || '')) {
            return { ok : false, error : `Refused asset path "${relativePath}" - must sit under PresentationMode/Thumbnails, LayoutEditor/Linework or LayoutEditor/Snapshots` };
        }
        if (payload === undefined || payload === null) return { ok : false, error : 'Nothing to write' };
        const isBlob = Na__CfApi__IsBlob(payload);
        if (isBlob && !payload.size) return { ok : false, error : 'Nothing to write' };

        if (Na__CfApi__HasRoute('files')) {
            return isBlob
                ? Na__CfApi__WorkerUploadFile(relativePath, payload, contentType || payload.type)
                : Na__CfApi__WorkerWriteFile(relativePath, payload);
        }
        if (!Na__CfApi__HasRoute('assets')) return { ok : false, error : 'This Worker has no asset route' };

        const resolvedType = isBlob
            ? (contentType || payload.type || 'application/octet-stream')
            : (contentType || 'application/json');
        const data = isBlob
            ? await Na__CfApi__BlobToBase64(payload)
            : Na__CfApi__TextToBase64(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 4));
        const call = await Na__CfApi__CallWorker('POST', '/assets', { path : relativePath, contentType : resolvedType, encoding : 'base64', data : data });
        if (!call.ok) return { ok : false, error : Na__CfApi__CallError(call, 'Write') };
        return { ok : true };
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Presentation Scene Thumbnail WebP to R2
    // ------------------------------------------------------------
    // Returns { ok, relUrl } where relUrl is the project-relative path stored
    // in the scene's PresentationMode__Scene__ThumbnailUrl field.
    // ------------------------------------------------------------
    async function Na__CfApi__WriteThumbnailWebp(sceneId, blob) {
        const relativePath = `${Na__CfApi__ThumbsDir}/${sceneId}.webp`;
        if (!Na__CfApi__IsBlob(blob)) return { ok : false, error : 'Nothing to write: a thumbnail is a Blob' };
        const write = await Na__CfApi__WriteAsset(relativePath, blob, 'image/webp');
        if (!write.ok) return { ok : false, error : write.error };
        return { ok : true, relUrl : relativePath };
    }
    // ------------------------------------------------------------


    // FUNCTION | Write Any Project-Relative Asset to R2
    // ------------------------------------------------------------
    // relativePath is project-relative, e.g. "LayoutEditor/Linework/x__abc.json".
    // Returns { ok, relUrl, publicUrl }.
    // ------------------------------------------------------------
    async function Na__CfApi__WriteProjectAsset(relativePath, payload, contentType) {
        const write = await Na__CfApi__WriteAsset(relativePath, payload, contentType);
        if (!write.ok) return { ok : false, error : write.error };
        return {
            ok        : true,
            relUrl    : relativePath,
            publicUrl : Na__CfApi__CdnUrl(Na__CfApi__FolderId(), relativePath)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project Sibling Files (whole JSON documents beside the project data)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Files Allowed Beside project.json
    // ------------------------------------------------------------
    // A document that belongs to the project but is not project data - the
    // Layout Editor's drawing notes and the statement index. Each is written
    // WHOLE, never merged, and allowed by name only, so no caller can write
    // over project.json, or anything else in the folder, by passing a wrong one.
    // ------------------------------------------------------------
    const Na__CfApi__ProjectFileNames = Object.freeze([
        'ValeVision__DrawingNotes__.json',
        'ValeVision__StatementDocs__.json'
    ]);
    const Na__CfApi__NotesFileName = 'ValeVision__DrawingNotes__.json';         // <-- The one sibling an older Worker serves (drawing-notes)
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Statement Writer's Folder, and What May Go Into It
    // ------------------------------------------------------------
    // TrueVision's rules, verbatim: up to five segments below the statements
    // folder (file included), a small safe character set that allows spaces
    // and & ( ) [ ], and only the writer's text and picture types.
    // ------------------------------------------------------------
    const Na__CfApi__StatementsDir     = '10__StatementDocs';
    const Na__CfApi__StatementSegment  = /^[A-Za-z0-9_\-. &()\[\]]{1,140}$/;
    const Na__CfApi__StatementSuffixes = /\.(md|html|json|txt|jpe?g|png|webp|gif|tiff?|bmp|svg)$/i;
    const Na__CfApi__StatementMaxDepth = 5;
    // ------------------------------------------------------------


    // FUNCTION | Where an Admin File Lives (ValeVision has none: always null)
    // ------------------------------------------------------------
    function Na__CfApi__AdminFileLocation(fileName) {
        void fileName;                                                      // <-- No admin system writes beside a ValeVision project
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Where a PlanVision File Lives (ValeVision has none: always null)
    // ------------------------------------------------------------
    function Na__CfApi__PlansFileLocation(fileName) {
        void fileName;                                                      // <-- No PlanVision content beside a ValeVision project
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Where a Sibling File Lives: R2 Key, Public CDN URL and Repository URL
    // ------------------------------------------------------------
    // Null when the name is not on the list or the page has no project folder.
    // ------------------------------------------------------------
    function Na__CfApi__ProjectFileLocation(fileName) {
        const folderId = Na__CfApi__FolderId();
        if (!folderId || Na__CfApi__ProjectFileNames.indexOf(fileName) === -1) return null;
        return {
            key     : Na__CfApi__R2Key(folderId, fileName),
            cdnUrl  : Na__CfApi__CdnUrl(folderId, fileName),
            repoUrl : Na__CfApi__RepoUrl(folderId, fileName)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Sibling File From R2 (fresh)
    // ------------------------------------------------------------
    // Returns { ok, data, missing }: missing is true when R2 has no such file
    // yet, which is an answer, not a failure. Through the Worker when it can
    // serve the name (files/read, or drawing-notes for the notes), else the
    // public CDN copy.
    // ------------------------------------------------------------
    async function Na__CfApi__ReadProjectFile(fileName) {
        const location = Na__CfApi__ProjectFileLocation(fileName);
        if (!location) return { ok : false, error : `Refused project file "${fileName}"` };

        if (Na__CfApi__IsConfigured() && Na__CfApi__HasRoute('files')) {
            const read = await Na__CfApi__WorkerReadFile(fileName);
            if (!read.ok) return { ok : false, error : read.error };
            if (read.missing) return { ok : true, data : null, missing : true };
            return { ok : true, data : (read.answer.data && typeof read.answer.data === 'object') ? read.answer.data : null, missing : false };
        }
        if (Na__CfApi__IsConfigured() && fileName === Na__CfApi__NotesFileName && Na__CfApi__HasRoute('drawing-notes')) {
            const call = await Na__CfApi__CallWorker('GET', '/drawing-notes');
            if (call.status === 404) return { ok : true, data : null, missing : true };
            if (!call.ok) return { ok : false, error : Na__CfApi__CallError(call, 'Read') };
            return { ok : true, data : (call.answer && typeof call.answer === 'object') ? call.answer : null, missing : false };
        }

        const cdn = await Na__CfApi__ReadCdn(location.cdnUrl, false);
        if (!cdn.ok) return { ok : false, error : cdn.error };
        if (cdn.missing) return { ok : true, data : null, missing : true };
        return { ok : true, data : (cdn.data && typeof cdn.data === 'object') ? cdn.data : null, missing : false };
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Whole Sibling File to R2
    // ------------------------------------------------------------
    // files/write (no build-manifest bump) when the Worker lists it; before
    // that only the drawing notes can go, through drawing-notes.
    // ------------------------------------------------------------
    async function Na__CfApi__WriteProjectFile(fileName, dataObject) {
        const location = Na__CfApi__ProjectFileLocation(fileName);
        if (!location) return { ok : false, error : `Refused project file "${fileName}"` };
        if (!dataObject || typeof dataObject !== 'object') return { ok : false, error : 'Nothing to write' };
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError() };

        if (Na__CfApi__HasRoute('files')) {
            const write = await Na__CfApi__WorkerWriteFile(fileName, dataObject);
            return write.ok ? { ok : true } : { ok : false, error : write.error };
        }
        if (fileName === Na__CfApi__NotesFileName && Na__CfApi__HasRoute('drawing-notes')) {
            const call = await Na__CfApi__CallWorker('POST', '/drawing-notes', dataObject);
            return call.ok ? { ok : true } : { ok : false, error : Na__CfApi__CallError(call, 'Write') };
        }
        return { ok : false, error : Na__CfApi__NeedsRouteError(fileName) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Where a Statement File Lives: R2 Key, CDN URL and Repository URL
    // ------------------------------------------------------------
    // relativePath is relative to the statements folder, e.g.
    // "01__PreApp__Statement/02_StatementDocs__Content__Images/02__Site__Location/Location__Far__.png".
    // Null when the page has no project folder or the path is not one this
    // app may touch.
    // ------------------------------------------------------------
    function Na__CfApi__StatementFileLocation(relativePath) {
        const folderId = Na__CfApi__FolderId();
        if (!folderId) return null;

        const text = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        if (!text) return null;

        const segments = text.split('/').filter((segment) => segment !== '');
        if (!segments.length || segments.length > Na__CfApi__StatementMaxDepth) return null;
        for (const segment of segments) {
            if (segment === '.' || segment === '..') return null;
            if (!Na__CfApi__StatementSegment.test(segment)) return null;
        }
        if (!Na__CfApi__StatementSuffixes.test(segments[segments.length - 1])) return null;

        const inside = `${Na__CfApi__StatementsDir}/${segments.join('/')}`;
        return {
            key     : Na__CfApi__R2Key(folderId, inside),
            cdnUrl  : Na__CfApi__CdnUrl(folderId, inside),
            repoUrl : Na__CfApi__RepoUrl(folderId, inside),
            path    : segments.join('/')
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Statement File to R2
    // ------------------------------------------------------------
    // payload: a string for markdown and HTML, a Blob for a picture, an object
    // for a .json file. Resolves to { ok, publicUrl, key, path } so the caller
    // can put the CDN link straight into the generated HTML.
    // ------------------------------------------------------------
    async function Na__CfApi__WriteStatementFile(relativePath, payload, contentType) {
        const location = Na__CfApi__StatementFileLocation(relativePath);
        if (!location) return { ok : false, error : `Refused statement path "${relativePath}"` };
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError() };
        if (!Na__CfApi__HasRoute('files')) return { ok : false, error : Na__CfApi__NeedsRouteError('Statements') };
        if (payload === undefined || payload === null) return { ok : false, error : 'Nothing to write' };

        const inside = `${Na__CfApi__StatementsDir}/${location.path}`;
        const write  = Na__CfApi__IsBlob(payload)
            ? await Na__CfApi__WorkerUploadFile(inside, payload, contentType || payload.type)
            : await Na__CfApi__WorkerWriteFile(inside, payload);
        if (!write.ok) return { ok : false, error : write.error };

        return { ok : true, publicUrl : location.cdnUrl, key : location.key, path : location.path };
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Statement File From R2 (fresh)
    // ------------------------------------------------------------
    // Returns { ok, text, missing }: a statement comes back as a string.
    // Through the Worker's files/read when it lists it, else the CDN copy.
    // ------------------------------------------------------------
    async function Na__CfApi__ReadStatementFile(relativePath) {
        const location = Na__CfApi__StatementFileLocation(relativePath);
        if (!location) return { ok : false, error : `Refused statement path "${relativePath}"` };

        if (Na__CfApi__IsConfigured() && Na__CfApi__HasRoute('files')) {
            const read = await Na__CfApi__WorkerReadFile(`${Na__CfApi__StatementsDir}/${location.path}`);
            if (!read.ok) return { ok : false, error : read.error };
            if (read.missing) return { ok : true, text : null, missing : true };
            const answer = read.answer;
            let   text   = null;
            if (typeof answer.text === 'string') text = answer.text;
            else if (answer.data && typeof answer.data === 'object') text = JSON.stringify(answer.data, null, 4);
            return { ok : true, text : text, missing : false };
        }

        const cdn = await Na__CfApi__ReadCdn(location.cdnUrl, true);
        if (!cdn.ok) return { ok : false, error : cdn.error };
        if (cdn.missing) return { ok : true, text : null, missing : true };
        return { ok : true, text : cdn.text, missing : false };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sheet Images (the Layout Editor's Pictures)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Pictures Folder and the Names That May Go Into It
    // ------------------------------------------------------------
    // Every picture placed on a Layout Editor sheet lives in
    //     <project folder>/05__Layout__DrawingDocs__Images/<document id>/<file>
    // on R2 and in the repository alike. One level of folders and a flat file
    // name, both checked here so no caller can write outside the pictures
    // folder by passing a wrong one; the Worker also refuses any name that
    // does not end in its content hash. The archive folder is the local
    // save's own, and nothing is ever published from it.
    // @delegate: ../51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Publish__.js
    // ------------------------------------------------------------
    const Na__CfApi__SHEET_IMAGES_DIR     = '05__Layout__DrawingDocs__Images';
    const Na__CfApi__SHEET_IMAGES_ARCHIVE = '00__Archive';
    const Na__CfApi__SheetImageFolder     = /^[A-Za-z0-9][A-Za-z0-9_\-.]{0,119}$/;
    const Na__CfApi__SheetImageFile       = /^[A-Za-z0-9][A-Za-z0-9_\-.]{0,159}\.(webp|jpg|jpeg|png)$/i;
    // ------------------------------------------------------------


    // FUNCTION | Where a Sheet Picture Lives: R2 Key, CDN URL, Repository URL
    // ------------------------------------------------------------
    // Null when the page has no project folder or the folder or file is not
    // one this app may touch. `relative` is the path under the repository
    // root, which the Sheet Images source builds its GitHub Pages fallback from.
    // ------------------------------------------------------------
    function Na__CfApi__SheetImageLocation(folder, fileName) {
        const folderId = Na__CfApi__FolderId();
        if (!folderId) return null;
        if (!Na__CfApi__SheetImageFolder.test(String(folder || '')) || folder === Na__CfApi__SHEET_IMAGES_ARCHIVE) return null;
        if (!Na__CfApi__SheetImageFile.test(String(fileName || ''))) return null;
        const inside = `${Na__CfApi__SHEET_IMAGES_DIR}/${folder}/${fileName}`;
        return {
            key      : Na__CfApi__R2Key(folderId, inside),
            cdnUrl   : Na__CfApi__CdnUrl(folderId, inside),
            repoUrl  : Na__CfApi__RepoUrl(folderId, inside),
            relative : Na__CfApi__RepoRelative(folderId, inside),
            folder   : folder,
            file     : fileName
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The R2 Key Every Picture of This Project Starts With
    // ------------------------------------------------------------
    function Na__CfApi__SheetImagesPrefix() {
        const folderId = Na__CfApi__FolderId();
        if (!folderId) return null;
        return Na__CfApi__R2Key(folderId, `${Na__CfApi__SHEET_IMAGES_DIR}/`);
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Picture of This Project on R2
    // ------------------------------------------------------------
    // Resolves to { ok, objects: [{ key, folder, file, size, etag }] }, every
    // page of the listing followed. Only names one folder deep are reported:
    // nothing else is a picture this feature stored.
    // ------------------------------------------------------------
    async function Na__CfApi__ListSheetImages() {
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError(), objects : [] };
        if (!Na__CfApi__HasRoute('files')) return { ok : false, error : Na__CfApi__NeedsRouteError('Sheet pictures'), objects : [] };
        const folderId = Na__CfApi__FolderId();
        const root     = `${Na__CfApi__SHEET_IMAGES_DIR}/`;
        const listed   = await Na__CfApi__WorkerListFiles(root);
        const objects  = [];
        listed.paths.forEach((one) => {
            if (one.path.indexOf(root) !== 0) return;
            const rest = one.path.slice(root.length).split('/');
            if (rest.length !== 2 || !rest[0] || !rest[1]) return;
            objects.push({ key : Na__CfApi__R2Key(folderId, one.path), folder : rest[0], file : rest[1], size : one.size, etag : one.etag });
        });
        return listed.ok ? { ok : true, objects : objects } : { ok : false, error : listed.error, objects : objects };
    }
    // ------------------------------------------------------------


    // FUNCTION | Put One Picture on R2
    // ------------------------------------------------------------
    // The bytes go up as they are through files/upload; the Worker files them
    // with an immutable cache header. Resolves to { ok, key, error }.
    // ------------------------------------------------------------
    async function Na__CfApi__UploadSheetImage(folder, fileName, blob) {
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError() };
        const location = Na__CfApi__SheetImageLocation(folder, fileName);
        if (!location) return { ok : false, error : `Refused picture path "${folder}/${fileName}"` };
        if (!Na__CfApi__IsBlob(blob) || !blob.size) return { ok : false, error : 'Nothing to upload' };
        if (!Na__CfApi__HasRoute('files')) return { ok : false, error : Na__CfApi__NeedsRouteError('Sheet pictures') };
        const type   = blob.type || (/\.png$/i.test(fileName) ? 'image/png' : (/\.jpe?g$/i.test(fileName) ? 'image/jpeg' : 'image/webp'));
        const upload = await Na__CfApi__WorkerUploadFile(`${Na__CfApi__SHEET_IMAGES_DIR}/${folder}/${fileName}`, blob, type);
        return upload.ok ? { ok : true, key : location.key } : { ok : false, error : upload.error };
    }
    // ------------------------------------------------------------


    // FUNCTION | Copy a Picture From One Document Folder to Another, on R2
    // ------------------------------------------------------------
    // How a renumbered drawing's pictures follow it without going back up the
    // wire: files/copy copies inside the bucket. Resolves to { ok, key, error },
    // with missing when the picture is not on R2.
    // ------------------------------------------------------------
    async function Na__CfApi__CopySheetImage(fromFolder, toFolder, fileName) {
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError() };
        const from = Na__CfApi__SheetImageLocation(fromFolder, fileName);
        const to   = Na__CfApi__SheetImageLocation(toFolder, fileName);
        if (!from || !to) return { ok : false, error : `Refused picture copy "${fromFolder}" -> "${toFolder}"` };
        if (!Na__CfApi__HasRoute('files')) return { ok : false, error : Na__CfApi__NeedsRouteError('Sheet pictures') };
        const call = await Na__CfApi__CallWorker('POST', '/files/copy', {
            from : `${Na__CfApi__SHEET_IMAGES_DIR}/${fromFolder}/${fileName}`,
            to   : `${Na__CfApi__SHEET_IMAGES_DIR}/${toFolder}/${fileName}`
        });
        if (call.ok) return { ok : true, key : to.key };
        if (call.status === 404 && call.answer && call.answer.missing) return { ok : false, error : 'Not on R2', missing : true };
        return { ok : false, error : Na__CfApi__CallError(call, 'Copy') };
    }
    // ------------------------------------------------------------


    // FUNCTION | Take a Picture Off R2
    // ------------------------------------------------------------
    // Called by the save only for a picture no drawing in the file it has
    // just written points at, and only after that file is safely on R2.
    // ------------------------------------------------------------
    async function Na__CfApi__DeleteSheetImage(folder, fileName) {
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError() };
        const location = Na__CfApi__SheetImageLocation(folder, fileName);
        if (!location) return { ok : false, error : `Refused picture path "${folder}/${fileName}"` };
        if (!Na__CfApi__HasRoute('files')) return { ok : false, error : Na__CfApi__NeedsRouteError('Sheet pictures') };
        return Na__CfApi__WorkerDeleteFile(`${Na__CfApi__SHEET_IMAGES_DIR}/${folder}/${fileName}`);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Published Documents (the Reader's Baked Files)
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Published Folder and What May Go Into It
    // ------------------------------------------------------------
    // Every published drawing lives in
    //     <project folder>/06__Layout__PublishedDocuments/<path>
    // on R2 and in the repository alike - the index at the root, each document
    // in a folder named after its document id, shared hatch tiles and pictures
    // in 01__Shared__*. The archive folder is LOCAL ONLY and is refused here,
    // so no archive can ever be pushed to a client by mistake.
    //
    // TWO CACHE POLICIES, AND THE DIFFERENCE MATTERS. A file whose name carries
    // its content hash is immutable forever; the index, the manifests, the
    // sheet and the element files keep fixed names and change on every
    // re-publish, so they get a minute. The Worker files each by its name.
    // @delegate: ../51__System__LayoutEditor/65__Feature__DocumentPublishing/Na__LayoutEditor__Publish__Transport__.js
    // ------------------------------------------------------------
    const Na__CfApi__PUBLISHED_DIR       = '06__Layout__PublishedDocuments';
    const Na__CfApi__PUBLISHED_ARCHIVE   = '00__Archive__Revisions';
    const Na__CfApi__PublishedSegment    = /^[A-Za-z0-9][A-Za-z0-9_\-.]{0,159}$/;
    const Na__CfApi__PublishedExtension  = /\.(json|svg|webp|png|pdf|md)$/i;
    const Na__CfApi__PublishedHashed     = /__[0-9a-f]{10}\.(svg|webp|png|pdf)$/;
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Content Type a Published File Goes Up As
    // ------------------------------------------------------------
    function Na__CfApi__PublishedType(path) {
        const ext = String(path).split('.').pop().toLowerCase();
        return ({ json : 'application/json', svg : 'image/svg+xml', webp : 'image/webp', png : 'image/png',
                  pdf : 'application/pdf', md : 'text/markdown' })[ext] || 'application/octet-stream';
    }
    // ------------------------------------------------------------


    // FUNCTION | Where a Published File Lives: R2 Key, CDN URL, Repository URL
    // ------------------------------------------------------------
    // relativePath is relative to 06__Layout__PublishedDocuments. Null when
    // the page has no project folder, or when any segment is not one this app
    // may write - including anything under the archive folder.
    // ------------------------------------------------------------
    function Na__CfApi__PublishedLocation(relativePath) {
        const folderId = Na__CfApi__FolderId();
        if (!folderId) return null;
        const parts = String(relativePath || '').replace(/\\/g, '/').split('/').filter((one) => one !== '');
        if (parts.length === 0 || parts.length > 6) return null;
        if (parts[0] === Na__CfApi__PUBLISHED_ARCHIVE) return null;             // <-- Archives never leave the machine
        if (!parts.every((one) => Na__CfApi__PublishedSegment.test(one) && one !== '.' && one !== '..')) return null;
        if (!Na__CfApi__PublishedExtension.test(parts[parts.length - 1])) return null;
        const inside = `${Na__CfApi__PUBLISHED_DIR}/${parts.join('/')}`;
        return {
            key       : Na__CfApi__R2Key(folderId, inside),
            cdnUrl    : Na__CfApi__CdnUrl(folderId, inside),
            repoUrl   : Na__CfApi__RepoUrl(folderId, inside),
            path      : parts.join('/'),
            immutable : Na__CfApi__PublishedHashed.test(parts[parts.length - 1])
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The R2 Key Prefix of the Published Root, or of One Document
    // ------------------------------------------------------------
    function Na__CfApi__PublishedPrefix(documentId) {
        const folderId = Na__CfApi__FolderId();
        if (!folderId) return null;
        const root = Na__CfApi__R2Key(folderId, `${Na__CfApi__PUBLISHED_DIR}/`);
        if (!documentId) return root;
        return Na__CfApi__PublishedSegment.test(String(documentId)) ? (root + documentId + '/') : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Every Published File on R2, Under the Root or One Document
    // ------------------------------------------------------------
    // Resolves to { ok, objects: [{ key, path, size }] } with path relative to
    // the published root - the same form a manifest names its files in.
    // ------------------------------------------------------------
    async function Na__CfApi__ListPublished(documentId) {
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError(), objects : [] };
        const prefix = Na__CfApi__PublishedPrefix(documentId);
        if (!prefix) return { ok : false, error : `Refused published document "${documentId}"`, objects : [] };
        if (!Na__CfApi__HasRoute('files')) return { ok : false, error : Na__CfApi__NeedsRouteError('Published documents'), objects : [] };
        const folderId = Na__CfApi__FolderId();
        const root     = `${Na__CfApi__PUBLISHED_DIR}/`;
        const listed   = await Na__CfApi__WorkerListFiles(documentId ? `${root}${documentId}/` : root);
        const objects  = [];
        listed.paths.forEach((one) => {
            if (one.path.indexOf(root) !== 0) return;
            objects.push({ key : Na__CfApi__R2Key(folderId, one.path), path : one.path.slice(root.length), size : one.size });
        });
        return listed.ok ? { ok : true, objects : objects } : { ok : false, error : listed.error, objects : objects };
    }
    // ------------------------------------------------------------


    // FUNCTION | Put One Published File on R2
    // ------------------------------------------------------------
    // Raw bytes through files/upload with the right type; the Worker files
    // them with the cache policy their name calls for. Resolves to { ok, key, error }.
    // ------------------------------------------------------------
    async function Na__CfApi__UploadPublished(relativePath, blob) {
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError() };
        const location = Na__CfApi__PublishedLocation(relativePath);
        if (!location) return { ok : false, error : `Refused published path "${relativePath}"` };
        if (!Na__CfApi__IsBlob(blob) || !blob.size) return { ok : false, error : 'Nothing to upload' };
        if (!Na__CfApi__HasRoute('files')) return { ok : false, error : Na__CfApi__NeedsRouteError('Published documents') };
        const upload = await Na__CfApi__WorkerUploadFile(`${Na__CfApi__PUBLISHED_DIR}/${location.path}`, blob, Na__CfApi__PublishedType(location.path));
        return upload.ok ? { ok : true, key : location.key } : { ok : false, error : upload.error };
    }
    // ------------------------------------------------------------


    // FUNCTION | Take One Published File Off R2
    // ------------------------------------------------------------
    // Called by a publish ONLY for a file under the document it has just
    // published, and only after that document's new manifest is on R2. A
    // publish never sweeps a prefix, and the Worker keeps one delete inside one
    // document's folder.
    // ------------------------------------------------------------
    async function Na__CfApi__DeletePublished(relativePath) {
        if (!Na__CfApi__IsConfigured()) return { ok : false, error : Na__CfApi__NotConfiguredError() };
        const location = Na__CfApi__PublishedLocation(relativePath);
        if (!location) return { ok : false, error : `Refused published path "${relativePath}"` };
        if (!Na__CfApi__HasRoute('files')) return { ok : false, error : Na__CfApi__NeedsRouteError('Published documents') };
        return Na__CfApi__WorkerDeleteFile(`${Na__CfApi__PUBLISHED_DIR}/${location.path}`);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Cloudflare R2 API Client
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
        Na__CfApi__GetProjectDisplayName                                     // <-- ValeVision only (K2 X2): the project's name for a printed document
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
