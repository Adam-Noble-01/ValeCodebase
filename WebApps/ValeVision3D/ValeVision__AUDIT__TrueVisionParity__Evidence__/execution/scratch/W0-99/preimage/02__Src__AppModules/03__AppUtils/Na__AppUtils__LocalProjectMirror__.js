// =============================================================================
// VALEVISION3D - APP UTILS - LOCAL PROJECT DATA MIRROR
// =============================================================================
//
// FILE       : Na__AppUtils__LocalProjectMirror__.js
// NAMESPACE  : Na__LocalMirror
// MODULE     : Local Project Data Mirror
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Copy saved project JSON onto the repository copy through the local
//              Whitecardopedia server, under TrueVision's names
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - R2 is the project's source of truth. The repository copy of project.json
//   (Whitecardopedia/Projects/<year>/<folder>/project.json) is its local
//   mirror, and this module writes it at the moment of a save, so what the
//   app has just written to R2 is on disk too.
// - READ, MERGE, WRITE - THE LOCAL HALF OF THE WORKER'S JOB. The file is read
//   fresh from the local server (GET /api/projects/<folderId>), the saved
//   top-level keys replace their old values, and the whole document goes back
//   through POST /api/projects/<folderId>. Every other key stays exactly as
//   the file has it, so keys a build or a sync regenerated while the app was
//   open are never put back to the copy the app loaded.
// - SIBLING FILES. ValeVision__DrawingNotes__.json and the statement index
//   ValeVision__StatementDocs__.json sit beside project.json and are written
//   WHOLE (WriteSiblingFile), never merged, through
//   POST /api/projects/<folderId>/files/<fileName>.
// - STATEMENTS. The statement folder is listed and written through the local
//   server's /api/valevision/statements routes.
// - LOCALHOST ONLY. The web build has no local copy; there the result reports
//   skipped, and the caller says the save went to R2.
// - NEVER THROWS. R2 already holds the save when this runs, so a failure here
//   is reported and can never undo or hide that save.
// - THE DRAWINGS SAVE GUARD. The local server fingerprints the drawings block
//   on disk (DrawingsFingerprint: { savedIso, digest }). A merge that says
//   which fingerprint it was built on (options.drawingsBase) is refused with
//   a conflict when the block on disk has since become something else - a
//   save from another window, an agent's edit on the file, a git checkout -
//   so one window can no longer put another's sheets back unseen. The server
//   also keeps a copy of every file it overwrites, outside the repository.
// - THE PROJECT FOLDER is the master-index entry the ?project= token names
//   (Na__AppUtils__GetYearFromUrl / GetProjectFolderFromUrl), never
//   project.json's own folderId field: with no entry nothing is written.
//
// INTEGRATION:
// - The drawings data module (Na__DrawView__ProjectData__) calls
//   Na__LocalMirror__MergeKeys after every drawings save that reached R2, and
//   DrawingsFingerprint as a project loads and before each save.
// - The specification module calls Na__LocalMirror__WriteSiblingFile after a
//   Sync, and to seed the local drawing-notes file on load.
// - Needs the local Whitecardopedia server (WebApps/Whitecardopedia/server.py),
//   which serves the app and owns the write routes. A plain static server
//   answers the POST with 501, reported as no local save server; a 405 from
//   the right server (its /api/health names it) is reported as a restart.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js
//                   - its eight exported names, their parameters and result shapes, and its result handling
//                   (PostJson, the 409 conflict, the 405 restart words); the routes and the project
//                   addressing are ValeVision's.
// - Source version: 1.2.0 (TrueVision3D v2.146.0, 22-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W0-12}}
// - Parity        : diverged (DIV-4: identical names and signatures, different transport)
// - Divergences   :
//   - A ValeVision-bodied twin (K2 H3): FILE, NAMESPACE, MODULE, the banner text and every exported name are
//     TrueVision's; PURPOSE, CREATED, DESCRIPTION and INTEGRATION describe ValeVision's body.
//   - The local server is Whitecardopedia's Flask server.py, recognised by GET /api/health answering service
//     'whitecardopedia-local-dev', not TrueVision's ProjectVision server.
//   - The project is addressed by its folderId in the route (/api/projects/2026/3047__Doous), encoded per
//     segment; TrueVision sends its project code with ?project-folder= and ?year= query parameters. The
//     statement routes take project-folder and a four-digit year.
//   - The fresh read is the local server's GET /api/projects/<folderId> (TrueVision reads the repository file
//     directly).
//   - The drawings base travels in X-ValeVision-Drawings-Base (TrueVision: its own drawings-base header).
//   - The sibling files are ValeVision__DrawingNotes__.json and ValeVision__StatementDocs__.json; statements go
//     through /api/valevision/statements/<route>.
//   - DrawingsFingerprint reads any 404 or 405 as unsupported (saves stay unjudged): a server from before the
//     route answers the URL through its project GET with a JSON 404, which cannot be told from a route that
//     exists.
//   - The project folder comes from the master index only (no project code needed).
// - Back-port     : none (the names are the seam).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0 (transport facade, {{VVREL:W0-12}})
// - TrueVision3D's local mirror interface (LocalProjectMirror 1.2.0, its
//   eight names) over the Whitecardopedia server: MergeKeys with the drawings
//   base, DrawingsFingerprint, WriteSiblingFile and the statement routes.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Identity and Environment
    // ------------------------------------------------------------
    import {
        Na__AppUtils__IsRunningOnLocalhost,
        Na__AppUtils__GetProjectFolderFromUrl,
        Na__AppUtils__GetYearFromUrl
    } from './Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Local Server, Its Routes and Its Header
    // ------------------------------------------------------------
    const Na__LocalMirror__ProjectsApi        = '/api/projects';                    // <-- GET/POST /api/projects/<folderId>[/drawings-fingerprint|/files/<name>]
    const Na__LocalMirror__StatementsApi      = '/api/valevision/statements';       // <-- The statement folder's routes
    const Na__LocalMirror__SiblingFiles       = [                                   // <-- Whole documents beside project.json
        'ValeVision__DrawingNotes__.json',
        'ValeVision__StatementDocs__.json'                                          // <-- The Statement Writer's index of the project's written documents
    ];
    const Na__LocalMirror__ServerService      = 'whitecardopedia-local-dev';        // <-- The name the Whitecardopedia server gives in /api/health
    const Na__LocalMirror__ServerName         = 'the local Whitecardopedia server (WebApps/Whitecardopedia/server.py)';
    const Na__LocalMirror__DrawingsBaseHeader = 'X-ValeVision-Drawings-Base';       // <-- The drawings fingerprint a save was built on (the server's DRAWINGS_BASE_HEADER)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Result: { ok, skipped, error }
    // ------------------------------------------------------------
    function Na__LocalMirror__Result(ok, skipped, error) {
        return { ok : ok === true, skipped : skipped === true, error : error || null };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Encode Each Segment of a Path (a folder may hold a space)
    // ------------------------------------------------------------
    function Na__LocalMirror__EncodePath(path) {
        return String(path).split('/').map((segment) => encodeURIComponent(segment)).join('/');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Where the Repository Copy Is Read From and Written To
    // ------------------------------------------------------------
    // Null when the page has no project folder (no master-index entry for its
    // ?project= token). The statement routes take the folder and the year as
    // query parameters, which is how the local server finds the folder.
    // ------------------------------------------------------------
    function Na__LocalMirror__Locate() {
        const yearCode      = Na__AppUtils__GetYearFromUrl();
        const projectFolder = Na__AppUtils__GetProjectFolderFromUrl();
        if (!yearCode || !projectFolder) return null;

        const folderId = `${yearCode}/${projectFolder}`;
        const origin   = window.location.origin;
        const query    = new URLSearchParams({ 'project-folder' : projectFolder, year : yearCode });
        return {
            origin   : origin,
            folderId : folderId,
            dataUrl  : `${origin}${Na__LocalMirror__ProjectsApi}/${Na__LocalMirror__EncodePath(folderId)}`,
            query    : query.toString()
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is the Whitecardopedia Server the One Answering
    // ------------------------------------------------------------
    // Asked only after a refused write, to tell a server that needs a restart
    // from a static server that cannot save at all. Never throws.
    // ------------------------------------------------------------
    async function Na__LocalMirror__IsLocalServer(origin) {
        try {
            const response = await fetch(`${origin}/api/health`, { cache : 'no-store' });
            const health   = response.ok ? await response.json().catch(() => null) : null;
            return !!(health && health.service === Na__LocalMirror__ServerService);
        } catch (error) {
            return false;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | POST JSON to the Local Server; Never Throws
    // ------------------------------------------------------------
    // headers (optional): extra request headers. A save the server refused as
    // a conflict (409: the drawings on disk are not the ones the window
    // loaded) comes back with conflict true and the fingerprint on disk in
    // drawings; a save that landed carries the fingerprint written and the
    // backup the server kept, so the caller can take the file's new identity
    // without asking for it again.
    // ------------------------------------------------------------
    async function Na__LocalMirror__PostJson(url, origin, payload, headers) {
        try {
            const response = await fetch(url, {
                method  : 'POST',
                headers : Object.assign({ 'Content-Type' : 'application/json' }, headers || {}),
                body    : JSON.stringify(payload)
            });
            const answer = await response.json().catch(() => null);                                  // <-- The local server answers in JSON; a static server does not
            if (response.ok) {
                const result = Na__LocalMirror__Result(true, false, null);
                if (answer && answer.drawings) result.drawings = answer.drawings;
                if (answer && typeof answer.backup === 'string') result.backup = answer.backup;
                return result;
            }
            if (response.status === 409 && answer && answer.conflict) {
                const result = Na__LocalMirror__Result(false, false, answer.error || 'the drawings on disk are not the ones this window loaded');
                result.conflict = true;
                result.drawings = answer.drawings || null;
                return result;
            }
            if (answer && answer.error) return Na__LocalMirror__Result(false, false, answer.error);
            if (response.status === 405 && await Na__LocalMirror__IsLocalServer(origin)) {           // <-- The right server, running from before this route
                return Na__LocalMirror__Result(false, false, `${Na__LocalMirror__ServerName} at ${origin} refused this write (405): it is running without this route - restart it to load its current routes`);
            }
            return Na__LocalMirror__Result(false, false, `no local save server at ${origin} (${response.status}) - serve the app with ${Na__LocalMirror__ServerName}`);
        } catch (error) {
            return Na__LocalMirror__Result(false, false, `the local server did not answer (${(error && error.message) || 'no answer'})`);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Merge Top-Level Keys Into the Repository Copy of the Project Data
    // ------------------------------------------------------------
    // partialObject: { KeyName: value, ... } - the keys the save wrote to R2.
    // options (optional): { drawingsBase } - the drawings fingerprint this
    // window loaded (DrawingsFingerprint), or null for a project that had no
    // drawings block. Given, it rides as X-ValeVision-Drawings-Base and the
    // server refuses the write when the block on disk is no longer that one:
    // the result then has conflict true. Left out, the write is not judged -
    // a save of other keys leaves the block as it found it on disk.
    // Resolves to { ok, skipped, error, conflict?, drawings?, backup? };
    // never rejects.
    // ------------------------------------------------------------
    let Na__LocalMirror__MergeQueue = Promise.resolve();
    function Na__LocalMirror__MergeKeys(partialObject, options) {
        let snapshot = null;
        try {
            snapshot = JSON.parse(JSON.stringify(partialObject || null));
        } catch (error) {
            return Promise.resolve(Na__LocalMirror__Result(false, false, 'nothing to write: the keys could not be read'));
        }
        const opts = Object.assign({}, options || {});
        const job  = Na__LocalMirror__MergeQueue
            .then(() => Na__LocalMirror__MergeKeysNow(snapshot, opts))
            .catch((error) => Na__LocalMirror__Result(false, false, (error && error.message) || 'the local copy was not written'));
        Na__LocalMirror__MergeQueue = job.then(() => undefined, () => undefined);
        return job;
    }
    async function Na__LocalMirror__MergeKeysNow(partialObject, options) {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return Na__LocalMirror__Result(false, true, null);   // <-- The web build has no local copy
        if (!partialObject || typeof partialObject !== 'object' || Array.isArray(partialObject)) return Na__LocalMirror__Result(false, false, 'nothing to write');

        const place = Na__LocalMirror__Locate();
        if (!place) return Na__LocalMirror__Result(false, false, 'no project folder for this page (the master index has no entry for ?project=)');

        // READ | The file as it is on disk now, never the copy the app loaded
        let onDisk = null;
        try {
            const response = await fetch(place.dataUrl, { cache : 'no-store' });
            if (!response.ok) return Na__LocalMirror__Result(false, false, `the local project data file could not be read (${response.status})`);
            onDisk = await response.json();
        } catch (error) {
            return Na__LocalMirror__Result(false, false, `the local project data file could not be read (${(error && error.message) || 'no answer'})`);
        }
        if (!onDisk || typeof onDisk !== 'object' || Array.isArray(onDisk)) {
            return Na__LocalMirror__Result(false, false, 'the local project data file is not a JSON object');
        }

        // WRITE | The saved keys over the file's own, through the local server
        const merged  = Object.assign({}, onDisk, partialObject);
        const headers = {};
        if (options && options.drawingsBase !== undefined) headers[Na__LocalMirror__DrawingsBaseHeader] = options.drawingsBase || 'none';   // <-- null: the project had no drawings block when it was loaded
        return Na__LocalMirror__PostJson(place.dataUrl, place.origin, merged, headers);
    }
    // ------------------------------------------------------------


    // FUNCTION | What the Drawings Block on Disk Is Right Now
    // ------------------------------------------------------------
    // Resolves to { ok, skipped, unsupported, error, drawings }, where
    // drawings is { savedIso, digest } as the local server computes it:
    // digest 'sha1:...' of the block's canonical JSON, null when the file has
    // no block. Asked as a project loads, so a save can say what it was built
    // on, and again just before a save, so a block changed since - by another
    // window, an agent on the file, a git checkout - is found before R2 is
    // written. unsupported (any 404 or 405) is a server without this route:
    // the caller saves unjudged, as it always did, rather than refusing to
    // save at all. Never rejects.
    // ------------------------------------------------------------
    async function Na__LocalMirror__DrawingsFingerprint() {
        const none = { ok : false, skipped : false, unsupported : false, error : null, drawings : null };
        if (!Na__AppUtils__IsRunningOnLocalhost()) return Object.assign(none, { skipped : true });
        const place = Na__LocalMirror__Locate();
        if (!place) return Object.assign(none, { error : 'no project folder for this page (the master index has no entry for ?project=)' });
        try {
            const response = await fetch(`${place.dataUrl}/drawings-fingerprint`, { cache : 'no-store' });
            const answer   = await response.json().catch(() => null);
            if (response.ok && answer && answer.drawings && typeof answer.drawings === 'object') {
                return Object.assign(none, { ok : true, drawings : { savedIso : answer.drawings.savedIso || null, digest : answer.drawings.digest || null } });
            }
            if (response.status === 404 || response.status === 405) {
                return Object.assign(none, { unsupported : true, error : (answer && answer.error) || `the server at ${place.origin} has no drawings-fingerprint route - serve the app with ${Na__LocalMirror__ServerName}` });
            }
            return Object.assign(none, { error : (answer && answer.error) || `the fingerprint could not be read (${response.status})` });
        } catch (error) {
            return Object.assign(none, { error : `the local server did not answer (${(error && error.message) || 'no answer'})` });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Whole Sibling File Into the Repository Copy
    // ------------------------------------------------------------
    // fileName: an allowed sibling (ValeVision__DrawingNotes__.json, or the
    // statement index). dataObject: the complete document. Resolves to { ok,
    // skipped, error }; never rejects. Creates the file when the folder has
    // none yet.
    // ------------------------------------------------------------
    async function Na__LocalMirror__WriteSiblingFile(fileName, dataObject) {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return Na__LocalMirror__Result(false, true, null);
        if (Na__LocalMirror__SiblingFiles.indexOf(fileName) === -1) return Na__LocalMirror__Result(false, false, `refused local file "${fileName}"`);
        if (!dataObject || typeof dataObject !== 'object' || Array.isArray(dataObject)) {
            return Na__LocalMirror__Result(false, false, 'nothing to write');
        }

        const place = Na__LocalMirror__Locate();
        if (!place) return Na__LocalMirror__Result(false, false, 'no project folder for this page (the master index has no entry for ?project=)');

        return Na__LocalMirror__PostJson(`${place.dataUrl}/files/${encodeURIComponent(fileName)}`, place.origin, dataObject);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Statement Files (a folder of markdown and pictures, not one document)
// -----------------------------------------------------------------------------

    // FUNCTION | List Everything Under the Project's Statements Folder
    // ------------------------------------------------------------
    // A static server cannot list a folder, so the local server answers this
    // one. Resolves to { ok, entries, exists, error }; never rejects. Off
    // localhost it reports skipped, and the caller falls back to what the
    // statement index already knows.
    // ------------------------------------------------------------
    async function Na__LocalMirror__StatementTree() {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return { ok : false, skipped : true, entries : [], error : null };
        const place = Na__LocalMirror__Locate();
        if (!place) return { ok : false, skipped : false, entries : [], error : 'no project folder for this page (the master index has no entry for ?project=)' };

        try {
            const response = await fetch(`${place.origin}${Na__LocalMirror__StatementsApi}/tree?${place.query}`, { cache : 'no-store' });
            if (!response.ok) {
                const answer = await response.json().catch(() => null);

                // A SERVER THAT NEVER LOADED THESE ROUTES LOOKS EXACTLY LIKE A
                // PROJECT WITH NO STATEMENTS, and that is the worst answer the
                // tab can give: it reads "no statements yet" over a folder that
                // holds one, and offers to make a second 01__ folder beside it.
                // So the server is asked who it is instead.
                const needsRestart = await Na__LocalMirror__IsLocalServer(place.origin);
                return {
                    ok            : false,
                    skipped       : false,
                    entries       : [],
                    needsRestart  : needsRestart,
                    error         : needsRestart
                        ? `${Na__LocalMirror__ServerName} at ${place.origin} is running without the statement routes - restart it to load its current routes`
                        : ((answer && answer.error) || `no statement routes at ${place.origin} (HTTP ${response.status}) - serve the app with ${Na__LocalMirror__ServerName}`)
                };
            }
            const data = await response.json();
            return { ok : true, skipped : false, exists : data.exists !== false, entries : Array.isArray(data.entries) ? data.entries : [], error : null };
        } catch (error) {
            return { ok : false, skipped : false, entries : [], error : (error && error.message) || 'no answer' };
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | POST to One of the Statement Routes
    // ------------------------------------------------------------
    async function Na__LocalMirror__StatementPost(route, payload) {
        if (!Na__AppUtils__IsRunningOnLocalhost()) return Na__LocalMirror__Result(false, true, null);
        const place = Na__LocalMirror__Locate();
        if (!place) return Na__LocalMirror__Result(false, false, 'no project folder for this page (the master index has no entry for ?project=)');
        return Na__LocalMirror__PostJson(
            `${place.origin}${Na__LocalMirror__StatementsApi}/${route}?${place.query}`,
            place.origin,
            payload
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Write One Statement Text File Into the Project Folder
    // ------------------------------------------------------------
    // path is relative to 10__StatementDocs, e.g.
    // "01__PreApp__Statement/3047_S01__Doous__PreApplicationStatement__.md".
    // ------------------------------------------------------------
    async function Na__LocalMirror__WriteStatementFile(path, text) {
        if (typeof text !== 'string') return Na__LocalMirror__Result(false, false, 'nothing to write');
        return Na__LocalMirror__StatementPost('file', { path : path, text : text });
    }
    // ------------------------------------------------------------


    // FUNCTION | Make a Folder Under the Project's Statements Folder
    // ------------------------------------------------------------
    async function Na__LocalMirror__MakeStatementFolder(path) {
        return Na__LocalMirror__StatementPost('folder', { path : path });
    }
    // ------------------------------------------------------------


    // FUNCTION | Move or Rename Something Inside the Statements Folder
    // ------------------------------------------------------------
    async function Na__LocalMirror__MoveStatement(fromPath, toPath) {
        return Na__LocalMirror__StatementPost('move', { from : fromPath, to : toPath });
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a Statement File or Folder
    // ------------------------------------------------------------
    // The server asks for the path twice - once as the instruction and once as
    // the confirmation - because this one takes a folder of writing with it.
    // ------------------------------------------------------------
    async function Na__LocalMirror__DeleteStatement(path) {
        return Na__LocalMirror__StatementPost('delete', { path : path, confirm : path });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Local Project Data Mirror API
    // ------------------------------------------------------------
    export {
        Na__LocalMirror__MergeKeys,
        Na__LocalMirror__DrawingsFingerprint,
        Na__LocalMirror__WriteSiblingFile,
        Na__LocalMirror__StatementTree,
        Na__LocalMirror__WriteStatementFile,
        Na__LocalMirror__MakeStatementFolder,
        Na__LocalMirror__MoveStatement,
        Na__LocalMirror__DeleteStatement
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
