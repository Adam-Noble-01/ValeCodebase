// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - SHEET IMAGES - STORE
// =============================================================================
//
// FILE       : Na__LayoutEditor__SheetImages__Store__.js
// NAMESPACE  : Na__LeImgStore
// MODULE     : Layout Editor - Sheet Images - Store
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Write sheet pictures into the project folder, and keep that folder filed by document id, through the local server
// CREATED    : 21-Sep-2026
//
// DESCRIPTION:
// - A BROWSER CANNOT WRITE A FILE, so on localhost the pictures reach the
//   repository through the Whitecardopedia local server's sheet image routes
//   (Server__ValeVisionSheetImages__Api__.py):
//     upload     one stored picture into 05__Layout__DrawingDocs__Images/<id>/,
//                the images folder and the id folder made on the way if they
//                are not there yet - the first picture a project ever gets
//                is what creates its images folder
//     reconcile  make every picture the drawings use exist in the folder its
//                drawing's id names, copied from wherever it is found; and,
//                after a save, move what nothing uses into 00__Archive
//     list       what is on disk, for the report and the tests
// - With no project folder every call answers skipped. The routes are asked
//   of the page's own origin, whatever its host (see the PORT NOTE).
// - A SERVER THAT NEVER LOADED THESE ROUTES is told apart from one that is
//   not the Whitecardopedia server at all: the first needs a restart (started
//   without its debug reloader it never reloads its routes), the second
//   cannot save pictures anywhere.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Store__.js
// - Source version: 1.0.0 (TrueVision3D v2.116.0, 21-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D v2.71.5, landed inert: only
//                   Na__LayoutEditor__SheetImages__Publish__ imports it, and nothing starts that
//                   until Sheet Images is switched on (W3-09). v2.116.0 is "NOT signed off by Adam"
//                   in TrueVision; it comes across under DR-01 (c) and is named as not yet confirmed.
// - Parity        : adapted (TrueVision 1.0.0's code; the route, the service name, the server's name
//                   in two refusals and the host test are the only differences)
// - Divergences   :
//   - Banner reads ValeVision3D. (No console output in this file.)
//   - The routes are /api/valevision/sheet-images/{upload,reconcile,list}, served by
//     Server__ValeVisionSheetImages__Api__.py (W0-18), the blueprint WebApps/Whitecardopedia/server.py
//     registers (TrueVision: /api/truevision/sheet-images on its ProjectVision local server). The
//     pictures land in WebApps/Whitecardopedia/Projects/<yyyy>/<folder>/05__Layout__DrawingDocs__Images/
//     (K1 DR-29 (A)). The query keeps TrueVision's names, project-folder and year (four digits here,
//     from the master-index entry ?project= names).
//   - The server is known by GET /api/health answering service 'whitecardopedia-local-dev' (DR-28 (A),
//     R3 C.1 row 9); the two refusals and DESCRIPTION name the Whitecardopedia local server and its
//     blueprint. The private helper keeps TrueVision's name, Na__LeImgStore__IsProjectVision.
//   - No host test. TrueVision answers skipped off localhost, where R2 is its only store; ValeVision is
//     moving to one OVH VPS whose same-origin Flask service is the store (Adam, 02-Oct-2026), so the
//     routes are asked of the page's own origin whatever its host, and only a page with no project
//     folder is skipped. Na__AppUtils__IsRunningOnLocalhost is not imported. Today only a drawings
//     save calls this, and a save needs the localhost-only transport facade, so nothing reaches it on
//     a static host.
//     TODO(OVH-MIGRATION): on the VPS ValeVision's own Flask service (127.0.0.1:8001, behind Nginx at
//     /ValeVision/) answers these routes and /api/health; the route prefix and the service name are
//     this file's two constants.
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 21-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Where the Project Is
    // ------------------------------------------------------------
    import {
        Na__AppUtils__GetProjectFolderFromUrl,
        Na__AppUtils__GetYearFromUrl
    } from '../../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Routes and the Server's Name
    // ------------------------------------------------------------
    const Na__LeImgStore__ROUTE   = '/api/valevision/sheet-images';
    const Na__LeImgStore__SERVICE = 'whitecardopedia-local-dev';               // <-- What the Whitecardopedia local server answers /api/health with
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Server and the Project Query, or null With No Project
    // ------------------------------------------------------------
    function Na__LeImgStore__Place() {
        const projectFolder = Na__AppUtils__GetProjectFolderFromUrl();
        if (!projectFolder) return null;
        return {
            origin : window.location.origin,
            query  : new URLSearchParams({ 'project-folder' : projectFolder, year : Na__AppUtils__GetYearFromUrl() })
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is the Whitecardopedia Local Server the One Answering
    // ------------------------------------------------------------
    async function Na__LeImgStore__IsProjectVision(origin) {
        try {
            const response = await fetch(`${origin}/api/health`, { cache : 'no-store' });
            const health   = response.ok ? await response.json().catch(() => null) : null;
            return !!(health && health.service === Na__LeImgStore__SERVICE);
        } catch (error) {
            return false;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Why a Route Refused, in Words That Say What to Do
    // ------------------------------------------------------------
    async function Na__LeImgStore__Refusal(response, origin) {
        const answer = await response.json().catch(() => null);
        if (answer && answer.error) return answer.error;
        if (await Na__LeImgStore__IsProjectVision(origin)) {
            return `the Whitecardopedia local server at ${origin} is running without the sheet image routes - restart it to load its current routes`;
        }
        return `no sheet image routes at ${origin} (HTTP ${response.status}) - serve the app with the Whitecardopedia local server`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Call to a Route; Never Throws
    // ------------------------------------------------------------
    async function Na__LeImgStore__Call(path, init, extraQuery) {
        const place = Na__LeImgStore__Place();
        if (!place) return { ok : false, skipped : true, error : null };
        const query = new URLSearchParams(place.query);
        Object.keys(extraQuery || {}).forEach((key) => query.set(key, extraQuery[key]));
        try {
            const response = await fetch(`${place.origin}${Na__LeImgStore__ROUTE}/${path}?${query.toString()}`, Object.assign({ cache : 'no-store' }, init || {}));
            if (!response.ok) return { ok : false, skipped : false, error : await Na__LeImgStore__Refusal(response, place.origin), status : response.status };
            const data = await response.json().catch(() => ({}));
            return Object.assign({ ok : true, skipped : false, error : null }, data);
        } catch (error) {
            return { ok : false, skipped : false, error : `the local server did not answer (${(error && error.message) || 'no answer'})` };
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Write One Stored Picture Into Its Document Folder
    // ------------------------------------------------------------
    // Resolves to { ok, skipped, error, created }. The same name with the same
    // bytes already there is success, not a clash: a picture dropped twice
    // is stored once.
    // ------------------------------------------------------------
    async function Na__LeImgStore__Upload(folder, file, blob) {
        if (!(blob instanceof Blob) || !blob.size) return { ok : false, skipped : false, error : 'nothing to write' };
        return Na__LeImgStore__Call('upload', {
            method  : 'POST',
            headers : { 'Content-Type' : blob.type || 'application/octet-stream' },
            body    : blob
        }, { folder : folder, name : file });
    }
    // ------------------------------------------------------------


    // FUNCTION | File Every Picture Where Its Drawing Wants It (and Archive the Rest)
    // ------------------------------------------------------------
    // keep: [{ folder, file, from: [ folder, ... ] }] - every picture the
    // drawings use, the folder it belongs in, and where it was last seen.
    // options.archive moves every stored picture that is NOT in keep into
    // 00__Archive; the save asks for it only once the drawings pointing at the
    // new folders are safely written. Resolves to { ok, skipped, error,
    // results: [{ folder, file, state: 'present' | 'copied' | 'missing', source }],
    // archived: [ 'folder/file', ... ] }.
    // ------------------------------------------------------------
    async function Na__LeImgStore__Reconcile(keep, options) {
        const list = (Array.isArray(keep) ? keep : []).filter((item) => item && item.folder && item.file);
        return Na__LeImgStore__Call('reconcile', {
            method  : 'POST',
            headers : { 'Content-Type' : 'application/json' },
            body    : JSON.stringify({ keep : list, archive : !!(options && options.archive) })
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | What Is on Disk Under the Images Folder
    // ------------------------------------------------------------
    async function Na__LeImgStore__List() {
        return Na__LeImgStore__Call('list', { method : 'GET' });
    }
    // ------------------------------------------------------------


    // FUNCTION | Is There a Local Store at All Here
    // ------------------------------------------------------------
    function Na__LeImgStore__IsLocal() {
        return !!Na__LeImgStore__Place();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Sheet Images Store API
    // ------------------------------------------------------------
    export {
        Na__LeImgStore__Upload,
        Na__LeImgStore__Reconcile,
        Na__LeImgStore__List,
        Na__LeImgStore__IsLocal
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
