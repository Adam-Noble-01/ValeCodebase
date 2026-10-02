// =============================================================================
// VALEVISION3D - PROJECT QR CODE - PROJECT LINK
// =============================================================================
//
// FILE       : Na__ProjectQr__ProjectLink__.js
// NAMESPACE  : Na__QrLink
// MODULE     : Project QR Code - Project Link
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Build the address a project's QR code carries
// CREATED    : 19-Sep-2026
//
// DESCRIPTION:
// - Composes the address a scanned code opens: a base address plus a query
//   pattern with the project's identity filled in. Both come from
//   Na__ProjectQr__Config__.json; nothing in this file knows what they are.
// - The project is whichever one the application is showing, as the project
//   loader resolves it from the address bar: its folder and four-digit year
//   are those of the master-index entry the address bar names, read by the
//   loader's own two functions, and its code is that same entry's permanent
//   resolver key, so the code on a drawing cannot name a different project
//   from the one drawn.
//
// INTEGRATION:
// - Read by Na__ProjectQr__Symbol__, which encodes what this returns.
//
// -----------------------------------------------------------------------------
//
// THE ADDRESS IS A SHORT ONE, AND A PAGE OUTSIDE THE APP RESOLVES IT:
// TrueVision prints its resolver's short address, /q/?<code>, and a flat page
// looks the code up in an index and sends the phone on to the project's full
// app address. The long address is what the app answers; the short one is
// what is printed. ValeVision has no resolver yet: until Adam picks one
// (DR-12; package W5-05) the config's base address is empty and this file
// builds no address at all.
//
// WHY: the symbol's module count is decided by the address's length, and the
// printed module's size is what decides whether a phone reads it. The long
// address is 135 bytes - a 49 module symbol, which needed a 20 mm title block
// to print a readable module, and Adam judged that strip "too tall, too
// portrait-feeling, and stretched" (20-Sep-2026). The short one is 42 bytes,
// which is EXACTLY what a 29 module symbol holds: a readable 0.30 mm module in
// the 10 mm strip the drawings already had. There is not a character to spare,
// which is why the folder is one letter and the query is the bare code.
//
// THE CODE IS THE PROJECT'S PERMANENT KEY, NEVER THE ADDRESS BAR'S TOKEN:
// Whitecardopedia opens ValeVision with the whole folder id
// (?project=2026/3047__Doous), a project can be renamed live, which rewrites
// its folder and can rewrite its code, and thirteen Vale project codes are
// shared with a sibling scheme. A key carried on paper must outlive all of
// that, so it is the master-index entry's qrKey: written once by the index
// writer and kept through a rename (DR-12). The token would be long as well:
// keyed by 2026/57994__Harris__Scheme-02 the address is 79 bytes, a version 5
// symbol printing a 0.244 mm module in the same strip.
//
// THE ADDRESS IS THE LIVE ONE, NEVER THE ONE IN THE ADDRESS BAR:
// Drawings are authored and exported on localhost - the editor is read-only on
// the web - so window.location is exactly the address a printed code must NOT
// carry. A code reading http://localhost:8000/... works on the authoring
// machine and on no phone in the world. The host and path are therefore a
// config value, and only the project's identity is read off the address bar.
//
// A PRINTED CODE OUTLIVES EVERYTHING IN THIS REPOSITORY:
// A code on an issued drawing sits in a site bag or a planning file for years
// and has no idea anything moved on. So the q folder must never be moved,
// renamed or removed, and if the pattern printed here ever changes, the
// resolver must go on answering the old one. The resolver is also what keeps
// old paper alive when the APP moves: the ValeVision address lives in that one
// page, and changing it there re-points every code ever printed.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/53__Feature__ProjectQrCode/Na__ProjectQr__ProjectLink__.js
// - Source version: 1.1.0 (TrueVision3D v2.81.0, 20-Sep-2026; moved into the Layout Editor by v2.155.0,
//                   23-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-15}}
// - Parity        : adapted - ValeVision's project identity; BuildUrl and CurrentUrl are TrueVision's line for line
// - Divergences   :
//   - Na__QrLink__CurrentProject reads ValeVision's identity, never the address bar's ?project= token:
//     projectFolder and year through Na__AppUtils__GetProjectFolderFromUrl and Na__AppUtils__GetYearFromUrl
//     (package W0-11: the master-index entry the token names, the year in four digits), and projectCode
//     is that entry's permanent resolver key, qrKey (DR-12's recommendation; package W5-05 writes the
//     keys), read once from the loader's memoised index (Na__AppUtils__InitMasterIndex) by the new
//     helper Na__QrLink__ResolverKey. No entry has a key yet, so no project has a code: with the
//     config's empty BaseUrl, a second guard keeping every code off a Vale drawing.
//   - Imports Na__AppUtils__InitMasterIndex in place of Na__AppUtils__GetProjectCodeFromUrl; the
//     constants region also holds the index the helper keeps.
//   - Module Start (new): a page already showing a project the loader has found reads the index as
//     the module loads, so the first sheet painted carries its code. With no page (a test) or no
//     project nothing is asked for.
//   - The header's address sections describe ValeVision (no resolver yet; the key, never the token);
//     the authoring port reads 8000 (ValeVision's Flask server) and the app the resolver opens is
//     ValeVision. CurrentProject's and CurrentUrl's comments say where the identity comes from.
//   - Banner reads ValeVision3D. (No console output in this file.)
// - Lineage       : authored in TrueVision3D first (19-Sep-2026), after the Lantern Designer's
//                   VghLantern__Terms__QrLink__.js, which learned both lessons first: the scanned
//                   address must open on a phone that has never seen this system, and its length
//                   is what decides whether the code can be read at all.
// - Back-port     : none - the two identity functions are the seam; TrueVision keeps its URL parameters.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 20-Sep-2026 - Version 1.1.0
// - The link setup's base is baseUrl (it was liveAppUrl): it is the resolver's
//   address now, not the app's. BuildUrl itself is unchanged - the short
//   address is config, as the long one was.
//
// 19-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Project the Application Is Showing
    // ------------------------------------------------------------
    import {
        Na__AppUtils__GetProjectFolderFromUrl,
        Na__AppUtils__GetYearFromUrl,
        Na__AppUtils__InitMasterIndex
    } from '../../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Pattern Tokens
    // ------------------------------------------------------------
    const Na__QrLink__TOKEN_CODE   = '{projectCode}';
    const Na__QrLink__TOKEN_FOLDER = '{projectFolder}';
    const Na__QrLink__TOKEN_YEAR   = '{year}';
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Project Loader's Master Index, Once It Has Settled
    // ------------------------------------------------------------
    let   Na__QrLink__IndexByFolderId = null;                                   // <-- Map of folderId to its master-index entry; null until it has been read
    let   Na__QrLink__IndexAsked      = false;                                  // <-- The loader's memoised index has been asked for
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Resolver Key of a Project ('' when it has none)
    // ------------------------------------------------------------
    // The permanent qrKey of the project's master-index entry: written once by
    // the index writer and kept through a rename, so a printed code goes on
    // opening its project (DR-12; package W5-05 writes the keys). Never the
    // address bar's ?project= token and never the bare project code - see the
    // header.
    //
    // The index is the one the project loader loaded at start-up and holds as
    // a memoised promise (Na__AppUtils__InitMasterIndex). The folder and year
    // asked about come from that same index, so by the time there is a folder
    // the promise has settled: it is read once, a moment later, and kept. Until
    // then, and for an entry with no key - every entry until the resolver
    // exists - the answer is '', and a code needs its key, so none is drawn.
    // ------------------------------------------------------------
    function Na__QrLink__ResolverKey(year, projectFolder) {
        if (year === '' || projectFolder === '') return '';
        if (!Na__QrLink__IndexAsked) {
            Na__QrLink__IndexAsked = true;
            Promise.resolve(Na__AppUtils__InitMasterIndex()).then(
                (byFolderId) => { Na__QrLink__IndexByFolderId = (byFolderId instanceof Map) ? byFolderId : new Map(); },
                ()           => { Na__QrLink__IndexByFolderId = new Map(); });
        }
        const entry = Na__QrLink__IndexByFolderId ? Na__QrLink__IndexByFolderId.get(year + '/' + projectFolder) : null;
        const key   = entry ? entry.qrKey : null;
        return (typeof key === 'string' || typeof key === 'number') ? String(key).trim() : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | The Identity of the Project the Application Is Showing
    // ------------------------------------------------------------
    // { projectCode, projectFolder, year }, each a trimmed string, empty when
    // it is not known. projectFolder and year are those of the master-index
    // entry the address bar names ("3047__Doous", "2026"), as the project
    // loader answers them: both empty until its index has settled and for a
    // project it does not list - the loader never guesses a year. projectCode
    // is that entry's resolver key (Na__QrLink__ResolverKey).
    // ------------------------------------------------------------
    function Na__QrLink__CurrentProject() {
        const text   = (value) => String(value === undefined || value === null ? '' : value).trim();
        const folder = text(Na__AppUtils__GetProjectFolderFromUrl());
        const year   = text(Na__AppUtils__GetYearFromUrl());
        return {
            projectCode   : Na__QrLink__ResolverKey(year, folder),
            projectFolder : folder,
            year          : year
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Address a Project's Code Carries
    // ------------------------------------------------------------
    // link    : { baseUrl, queryPattern }, from the config.
    // project : { projectCode, projectFolder, year }.
    //
    // Returns an empty string when any token the pattern asks for has no
    // value, which the caller treats as "draw no code". A code that scans to a
    // broken address is worse than no code, because nobody finds out until
    // they are standing on site with it.
    // ------------------------------------------------------------
    function Na__QrLink__BuildUrl(link, project) {
        const setup   = (link && typeof link === 'object') ? link : {};
        const parts   = (project && typeof project === 'object') ? project : {};
        const baseUrl = String(setup.baseUrl || '').trim();
        const pattern = String(setup.queryPattern || '');
        if (baseUrl === '') return '';

        const tokens = [
            [ Na__QrLink__TOKEN_CODE,   parts.projectCode ],
            [ Na__QrLink__TOKEN_FOLDER, parts.projectFolder ],
            [ Na__QrLink__TOKEN_YEAR,   parts.year ]
        ];

        let query = pattern;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i][0];
            if (query.indexOf(token) === -1) continue;
            const value = String(tokens[i][1] === undefined || tokens[i][1] === null ? '' : tokens[i][1]).trim();
            if (value === '') return '';                                         // <-- The pattern needs it and the project has none: no code
            query = query.split(token).join(encodeURIComponent(value));
        }
        return baseUrl + query;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Address the Code of the Project on Screen Carries
    // ------------------------------------------------------------
    // A project is only on screen when the loader has BOTH its code and its
    // folder (here: the master-index entry's resolver key and its folder), so
    // a short pattern that names the code alone still draws nothing for an
    // address bar with half a project on it.
    // ------------------------------------------------------------
    function Na__QrLink__CurrentUrl(link) {
        const project = Na__QrLink__CurrentProject();
        if (project.projectCode === '' || project.projectFolder === '') return '';
        return Na__QrLink__BuildUrl(link, project);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Start
// -----------------------------------------------------------------------------

    // A page already showing a project the loader has found reads the index
    // now, rather than at its first paint, so the first sheet painted carries
    // its code. With no page or no project (a test, a page with no project on
    // its address bar) nothing is asked for.
    if (typeof window !== 'undefined' && window.location) void Na__QrLink__CurrentProject();

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Project QR Code Project Link API
    // ------------------------------------------------------------
    export {
        Na__QrLink__CurrentProject,
        Na__QrLink__BuildUrl,
        Na__QrLink__CurrentUrl
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
