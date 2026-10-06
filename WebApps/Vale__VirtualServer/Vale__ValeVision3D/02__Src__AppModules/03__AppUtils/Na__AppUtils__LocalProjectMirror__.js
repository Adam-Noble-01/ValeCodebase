// =============================================================================
// VALEVISION3D - APP UTILS - PROJECT DATA ON THE SERVER
// =============================================================================
//
// FILE       : Na__AppUtils__LocalProjectMirror__.js
// NAMESPACE  : Na__LocalMirror
// MODULE     : Local Project Data Mirror
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Write a project's saved keys, its sibling files and its statements to
//              ValeVision 3D's server - the one store of record - under TrueVision's names
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - THE SERVER IS THE STORE. Since 06-Oct-2026 a project lives in the Projects
//   Master Library on app.valegardenhouses.com and nowhere else: no R2, no
//   repository copy to mirror. This module keeps TrueVision's names (its
//   "local mirror" twin) because every caller and every port is written to
//   them, but what it writes to is the server API, on the PC and live alike.
// - MERGE IN ONE STEP. MergeKeys sends only the saved top-level keys
//   (PATCH api/projects/<id>); the server merges them into the record as it is
//   on disk, under its lock, so keys the Gallery, the SketchUp sync or another
//   window wrote meanwhile are never put back.
// - SIBLING FILES. ValeVision__DrawingNotes__.json and the statement index
//   ValeVision__StatementDocs__.json are written WHOLE through
//   POST api/projects/<id>/files/<fileName>.
// - STATEMENTS go through api/valevision/statements/<route>.
// - NEVER THROWS. Every outcome is { ok, skipped, error, ... }.
// - THE DRAWINGS SAVE GUARD. The server fingerprints the drawings block
//   (DrawingsFingerprint: { savedIso, digest }); a merge that says which
//   fingerprint it was built on (options.drawingsBase) is refused with a
//   conflict when the block has since become something else, so one window
//   can never put another's sheets back unseen. The server keeps a revision
//   of every file it overwrites (<project>/ProjectData__Revisions/).
// - SIGN-IN. Writes need a signed-in user at the authoring level; a 401 or 403
//   comes back as { ok:false, error } with the server's words.
//
// INTEGRATION:
// - Na__DrawView__ProjectData__ calls MergeKeys for every drawings save, and
//   DrawingsFingerprint as a project loads and before each save.
// - The specification module calls WriteSiblingFile; the Statement Writer the
//   statement functions.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js
//                   - its eight exported names, their parameters and result shapes
// - Parity        : diverged (DIV-4: identical names and signatures, different transport)
// - Divergences   : the transport is ValeVision 3D's own server API (Server__Api/Api__ValeVision3D), which is
//                   the store of record, not a mirror of R2; the merge happens on the server (PATCH).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - Version 2.0.0 (the move to app.valegardenhouses.com)
// - Writes to the ValeVision 3D API on every host: no localhost gate, no
//   ValeVision Gallery server, no health probe. MergeKeys is one PATCH merged on
//   the server instead of a read here and a whole-document POST.
//
// 01-Oct-2026 - Version 1.0.0 (transport facade, v2.71.1)
// - TrueVision3D's local mirror interface over the ValeVision Gallery server.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Identity and Environment
    // ------------------------------------------------------------
    import {
        Na__AppUtils__ApiUrl,
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
    const Na__LocalMirror__ProjectsApi        = 'projects';                         // <-- api/projects/<id>[/drawings-fingerprint|/files/<name>]
    const Na__LocalMirror__StatementsApi      = 'valevision/statements';            // <-- The statement folder's routes
    const Na__LocalMirror__SiblingFiles       = [                                   // <-- Whole documents beside project.json
        'ValeVision__DrawingNotes__.json',
        'ValeVision__StatementDocs__.json'                                          // <-- The Statement Writer's index of the project's written documents
    ];
    const Na__LocalMirror__ServerName         = 'the ValeVision 3D server';
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
    // Null when the page has no project the server placed (no ?project=, or one
    // the library does not have). The statement routes take the folder and the
    // year as query parameters.
    // ------------------------------------------------------------
    function Na__LocalMirror__Locate() {
        const yearCode      = Na__AppUtils__GetYearFromUrl();
        const projectFolder = Na__AppUtils__GetProjectFolderFromUrl();
        if (!yearCode || !projectFolder) return null;
        const query = new URLSearchParams({ 'project-folder' : projectFolder, year : yearCode });
        return {
            origin   : Na__LocalMirror__ServerName,
            folderId : `${yearCode}/${projectFolder}`,
            dataUrl  : Na__AppUtils__ApiUrl(`${Na__LocalMirror__ProjectsApi}/${encodeURIComponent(projectFolder)}`),
            query    : query.toString()
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Send JSON to the Server; Never Throws
    // ------------------------------------------------------------
    // headers (optional): extra request headers. A save the server refused as
    // a conflict (409: the drawings on disk are not the ones the window
    // loaded) comes back with conflict true and the fingerprint on disk in
    // drawings; a save that landed carries the fingerprint written and the
    // backup the server kept, so the caller can take the file's new identity
    // without asking for it again.
    // ------------------------------------------------------------
    async function Na__LocalMirror__PostJson(url, origin, payload, headers, method) {
        try {
            const response = await fetch(url, {
                method      : method || 'POST',
                credentials : 'same-origin',                                                         // <-- The sign-in cookie: writes need the authoring level
                headers     : Object.assign({ 'Content-Type' : 'application/json' }, headers || {}),
                body        : JSON.stringify(payload)
            });
            const answer = await response.json().catch(() => null);                                  // <-- The API always answers in JSON
            if (response.ok) {
                const result = Na__LocalMirror__Result(true, false, null);
                if (answer && answer.drawings) result.drawings = answer.drawings;
                if (answer && typeof answer.revision === 'string') result.backup = answer.revision;    // <-- The revision the server kept
                return result;
            }
            if (response.status === 409 && answer && answer.conflict) {
                const result = Na__LocalMirror__Result(false, false, answer.error || 'the drawings on disk are not the ones this window loaded');
                result.conflict = true;
                result.drawings = answer.drawings || null;
                return result;
            }
            if (response.status === 401) return Na__LocalMirror__Result(false, false, 'sign in to save (your session has ended)');
            if (response.status === 403) return Na__LocalMirror__Result(false, false, (answer && answer.error) || 'your account cannot save this');
            if (answer && answer.error) return Na__LocalMirror__Result(false, false, answer.error);
            return Na__LocalMirror__Result(false, false, `${Na__LocalMirror__ServerName} refused the write (HTTP ${response.status})`);
        } catch (error) {
            return Na__LocalMirror__Result(false, false, `${Na__LocalMirror__ServerName} did not answer (${(error && error.message) || 'no answer'})`);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Merge Top-Level Keys Into the Project Record on the Server
    // ------------------------------------------------------------
    // partialObject: { KeyName: value, ... } - the keys being saved.
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
            .catch((error) => Na__LocalMirror__Result(false, false, (error && error.message) || 'the project was not saved'));
        Na__LocalMirror__MergeQueue = job.then(() => undefined, () => undefined);
        return job;
    }
    async function Na__LocalMirror__MergeKeysNow(partialObject, options) {
        if (!partialObject || typeof partialObject !== 'object' || Array.isArray(partialObject)) return Na__LocalMirror__Result(false, false, 'nothing to write');
        const place = Na__LocalMirror__Locate();
        if (!place) return Na__LocalMirror__Result(false, false, 'no project for this page (?project= names none the library has)');
        const headers = {};
        if (options && options.drawingsBase !== undefined) headers[Na__LocalMirror__DrawingsBaseHeader] = options.drawingsBase || 'none';   // <-- null: the project had no drawings block when it was loaded
        return Na__LocalMirror__PostJson(place.dataUrl, place.origin, partialObject, headers, 'PATCH');    // <-- Merged on the server, under its lock
    }
    // ------------------------------------------------------------
    // ------------------------------------------------------------


    // FUNCTION | What the Drawings Block on Disk Is Right Now
    // ------------------------------------------------------------
    // Resolves to { ok, skipped, unsupported, error, drawings }, where
    // drawings is { savedIso, digest } as the server computes it:
    // digest 'sha1:...' of the block's canonical JSON, null when the file has
    // no block. Asked as a project loads, so a save can say what it was built
    // on, and again just before a save, so a block changed since - by another
    // window, an agent on the file, a git checkout - is found before anything
    // is written. unsupported (any 404 or 405) is a server without this route:
    // the caller saves unjudged, as it always did, rather than refusing to
    // save at all. Never rejects.
    // ------------------------------------------------------------
    async function Na__LocalMirror__DrawingsFingerprint() {
        const none = { ok : false, skipped : false, unsupported : false, error : null, drawings : null };
        const place = Na__LocalMirror__Locate();
        if (!place) return Object.assign(none, { error : 'no project for this page (?project= names none the library has)' });
        try {
            const response = await fetch(`${place.dataUrl}/drawings-fingerprint`, { cache : 'no-store', credentials : 'same-origin' });
            const answer   = await response.json().catch(() => null);
            if (response.ok && answer && answer.drawings && typeof answer.drawings === 'object') {
                return Object.assign(none, { ok : true, drawings : { savedIso : answer.drawings.savedIso || null, digest : answer.drawings.digest || null } });
            }
            if (response.status === 404 || response.status === 405) {
                return Object.assign(none, { unsupported : true, error : (answer && answer.error) || `${Na__LocalMirror__ServerName} has no drawings fingerprint for this project` });
            }
            return Object.assign(none, { error : (answer && answer.error) || `the fingerprint could not be read (${response.status})` });
        } catch (error) {
            return Object.assign(none, { error : `${Na__LocalMirror__ServerName} did not answer (${(error && error.message) || 'no answer'})` });
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
        if (Na__LocalMirror__SiblingFiles.indexOf(fileName) === -1) return Na__LocalMirror__Result(false, false, `refused local file "${fileName}"`);
        if (!dataObject || typeof dataObject !== 'object' || Array.isArray(dataObject)) {
            return Na__LocalMirror__Result(false, false, 'nothing to write');
        }

        const place = Na__LocalMirror__Locate();
        if (!place) return Na__LocalMirror__Result(false, false, 'no project for this page (?project= names none the library has)');

        return Na__LocalMirror__PostJson(`${place.dataUrl}/files/${encodeURIComponent(fileName)}`, place.origin, dataObject);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Statement Files (a folder of markdown and pictures, not one document)
// -----------------------------------------------------------------------------

    // FUNCTION | List Everything Under the Project's Statements Folder
    // ------------------------------------------------------------
    // A static server cannot list a folder, so the API answers this
    // one. Resolves to { ok, entries, exists, error }; never rejects.
    // ------------------------------------------------------------
    async function Na__LocalMirror__StatementTree() {
        const place = Na__LocalMirror__Locate();
        if (!place) return { ok : false, skipped : false, entries : [], error : 'no project for this page (?project= names none the library has)' };

        try {
            const response = await fetch(Na__AppUtils__ApiUrl(`${Na__LocalMirror__StatementsApi}/tree?${place.query}`), { cache : 'no-store', credentials : 'same-origin' });
            if (!response.ok) {
                const answer = await response.json().catch(() => null);
                return { ok : false, skipped : false, entries : [], error : (answer && answer.error) || `no statement routes on ${Na__LocalMirror__ServerName} (HTTP ${response.status})` };
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
        const place = Na__LocalMirror__Locate();
        if (!place) return Na__LocalMirror__Result(false, false, 'no project for this page (?project= names none the library has)');
        return Na__LocalMirror__PostJson(
            Na__AppUtils__ApiUrl(`${Na__LocalMirror__StatementsApi}/${route}?${place.query}`),
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
