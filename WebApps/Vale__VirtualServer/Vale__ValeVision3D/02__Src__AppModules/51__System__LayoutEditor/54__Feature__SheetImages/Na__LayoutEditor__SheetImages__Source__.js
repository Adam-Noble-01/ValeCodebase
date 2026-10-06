// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - SHEET IMAGES - SOURCE
// =============================================================================
//
// FILE       : Na__LayoutEditor__SheetImages__Source__.js
// NAMESPACE  : Na__LeImgSrc
// MODULE     : Layout Editor - Sheet Images - Source
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Find a stored picture's bytes - R2 first, GitHub Pages last - and hand the painter a URL it can draw
// CREATED    : 21-Sep-2026
//
// DESCRIPTION:
// - THE URL IS BUILT, NEVER STORED. A record names its file and the folder it
//   was filed in; where that folder is served from is worked out here, every
//   session, from the project in the address bar (Na__CfApi__SheetImageLocation):
//     web viewer   the CDN (R2), then the site's own copy, then GitHub Pages
//     localhost    the repository copy, then the CDN - a drop writes the
//                  repository copy before any save has pushed it to R2
//   R2 is the plan: the Pages copy exists only once the repository is pushed,
//   so it is the fallback for when R2 does not answer, never the source.
// - A PICTURE IS KNOWN BY ITS FILE NAME, NOT ITS FOLDER. A stored name ends
//   in its content hash, so any copy of it anywhere is the same picture. That
//   is what makes a renumber harmless to the screen: while the save has yet
//   to re-file a picture under its drawing's new id, the copy in the old
//   folder is still that picture, and the folders the editor knows about are
//   all asked before a picture is called missing.
// - EACH PICTURE IS FETCHED ONCE and held as a blob with an object URL, so
//   the markup a sheet is redrawn with never changes for it and the PDF cuts
//   its print copy from the same bytes rather than downloading them again.
//
// INTEGRATION:
// - The painter asks Url and State on every paint; the first ask starts the
//   load, and CHANGED_EVENT says when to paint again.
// - The core registers a folder finder in the editor (the document ids of
//   the sheets that hold a picture), and Adopt hands over a picture the drop
//   has just stored, so it shows at once.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Source__.js
// - Source version: 1.0.0 (TrueVision3D v2.116.0, 21-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.2
// - Parity        : verbatim (the code is TrueVision 1.0.0's; the banner, the two console prefixes and this note
//                   are the only differences)
// - Divergences   :
//   - Banner and console prefixes read ValeVision3D.
//   - Both transport imports resolve to ValeVision's own modules at TrueVision's
//     paths (K2 R6, DIV-4): Na__AppUtils__IsRunningOnLocalhost (ProjectLoader;
//     also true on port 8000, the Flask server) and Na__CfApi__SheetImageLocation,
//     the transport facade's ValeVision body (W0-12). So a picture is read from
//     VaApps/Projects/<folderId>/05__Layout__DrawingDocs__Images/<document id>/
//     on the CDN, from the copy under WebApps/ValeVisionGallery/Projects/<folderId>/
//     that the Flask server serves on localhost, and on the live site from
//     GitHub Pages last (the config's PagesBaseUrl). The folder is the
//     master-index entry ?project= names, never project.json's folderId; with
//     none, no picture has an address and it shows as missing.
//   - ValeVision commits no picture until Adam answers DR-29 (the .gitignore
//     keeps the images folders out), so GitHub Pages holds none and the
//     repository copy exists only on the machine that saved it: on the live
//     site R2 is the one source.
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

    // MODULE IMPORTS | Where the Project Is, Where Its Pictures Are, and the Setup
    // ------------------------------------------------------------
    import { Na__CfApi__SheetImageLocation } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';
    import { Na__LeImgCfg__Sources } from './Na__LayoutEditor__SheetImages__Setup__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Event and the States
    // ------------------------------------------------------------
    const Na__LeImgSrc__CHANGED_EVENT = 'na-layouteditor-sheetimages-source';
    const Na__LeImgSrc__READY         = 'ready';
    const Na__LeImgSrc__LOADING       = 'loading';
    const Na__LeImgSrc__MISSING       = 'missing';
    // ------------------------------------------------------------

    // MODULE VARIABLES | Every Picture Asked For, and Where Else to Look
    // ------------------------------------------------------------
    const Na__LeImgSrc__Entries = new Map();      // <-- file -> { state, url, blob, from, loading }
    let   Na__LeImgSrc__Finder  = null;           // <-- (file, folder) => [ folder, ... ] - the editor's extra places to look
    let   Na__LeImgSrc__Pending = 0;              // <-- Announcements waiting for the next frame
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Say a Picture Changed State (one announcement per frame)
    // ------------------------------------------------------------
    // A sheet of eight pictures arriving together repaints once, not eight
    // times.
    // ------------------------------------------------------------
    function Na__LeImgSrc__Announce(file) {
        Na__LeImgSrc__Pending++;
        if (Na__LeImgSrc__Pending > 1) return;
        const fire = () => {
            Na__LeImgSrc__Pending = 0;
            window.dispatchEvent(new CustomEvent(Na__LeImgSrc__CHANGED_EVENT, { detail : { file : file || null } }));
        };
        if (typeof window.requestAnimationFrame === 'function' && document.visibilityState !== 'hidden') window.requestAnimationFrame(fire);
        else window.setTimeout(fire, 16);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The URLs One Folder's Copy Is Tried At, in Order
    // ------------------------------------------------------------
    function Na__LeImgSrc__Candidates(folder, file) {
        const location = Na__CfApi__SheetImageLocation(folder, file);
        if (!location) return [];
        return [ location.cdnUrl ];                                            // <-- One copy: the project's pictures folder on the server
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch One URL as a Picture, or null
    // ------------------------------------------------------------
    // A static server answers a missing file with a page of HTML as often as
    // with a 404, so anything that is not an image is not the picture.
    // ------------------------------------------------------------
    async function Na__LeImgSrc__Fetch(url, timeoutMs) {
        const controller = (typeof AbortController === 'function') ? new AbortController() : null;
        const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : 0;
        try {
            const response = await fetch(url, { mode : 'cors', credentials : 'omit', signal : controller ? controller.signal : undefined });
            if (!response.ok) return null;
            const type = response.headers.get('Content-Type') || '';
            if (type && !/^image\//i.test(type) && !/octet-stream/i.test(type)) return null;
            const blob = await response.blob();
            if (!blob || !blob.size) return null;
            return /^image\//i.test(blob.type) ? blob : new Blob([ blob ], { type : /\.png$/i.test(url) ? 'image/png' : (/\.jpe?g$/i.test(url) ? 'image/jpeg' : 'image/webp') });
        } catch (error) {
            return null;
        } finally {
            if (timer) window.clearTimeout(timer);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Every Folder Worth Asking for a File, the Record's First
    // ------------------------------------------------------------
    function Na__LeImgSrc__Folders(file, folder) {
        const list = [ folder ];
        if (Na__LeImgSrc__Finder) {
            try { (Na__LeImgSrc__Finder(file, folder) || []).forEach((f) => list.push(f)); }
            catch (error) { console.warn('[ValeVision3D LayoutEditor] The picture folder finder failed.', error); }
        }
        return list.filter((f, index) => typeof f === 'string' && f && list.indexOf(f) === index);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load a Picture: Each Folder, Each Source, First Answer Wins
    // ------------------------------------------------------------
    function Na__LeImgSrc__Load(file, folder) {
        const entry = { state : Na__LeImgSrc__LOADING, url : null, blob : null, from : null, loading : null };
        Na__LeImgSrc__Entries.set(file, entry);
        entry.loading = (async () => {
            const timeout = Na__LeImgCfg__Sources().timeoutMs;
            for (const where of Na__LeImgSrc__Folders(file, folder)) {
                for (const url of Na__LeImgSrc__Candidates(where, file)) {
                    const blob = await Na__LeImgSrc__Fetch(url, timeout);
                    if (!blob) continue;
                    if (Na__LeImgSrc__Entries.get(file) !== entry) return entry.blob;   // <-- Adopted or forgotten while this was in flight
                    entry.blob  = blob;
                    entry.url   = URL.createObjectURL(blob);
                    entry.from  = url;
                    entry.state = Na__LeImgSrc__READY;
                    Na__LeImgSrc__Announce(file);
                    return blob;
                }
            }
            if (Na__LeImgSrc__Entries.get(file) === entry) {
                entry.state = Na__LeImgSrc__MISSING;
                console.warn('[ValeVision3D LayoutEditor] Picture not found in any folder or source: ' + file + ' (filed under ' + folder + ').');
                Na__LeImgSrc__Announce(file);
            }
            return null;
        })();
        return entry;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | The URL to Paint a Picture With Now, or null (starts the load)
    // ------------------------------------------------------------
    function Na__LeImgSrc__Url(folder, file) {
        if (!file) return null;
        const entry = Na__LeImgSrc__Entries.get(file) || Na__LeImgSrc__Load(file, folder);
        return entry.state === Na__LeImgSrc__READY ? entry.url : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Where a Picture Is Up To: 'ready', 'loading' or 'missing'
    // ------------------------------------------------------------
    function Na__LeImgSrc__State(folder, file) {
        if (!file) return Na__LeImgSrc__MISSING;
        const entry = Na__LeImgSrc__Entries.get(file) || Na__LeImgSrc__Load(file, folder);
        return entry.state;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Picture's Bytes, Waiting for Them if Need Be (null when missing)
    // ------------------------------------------------------------
    // The PDF cuts its print copy from these, and the save uploads them when
    // the repository copy cannot be read.
    // ------------------------------------------------------------
    async function Na__LeImgSrc__Blob(folder, file) {
        if (!file) return null;
        const entry = Na__LeImgSrc__Entries.get(file) || Na__LeImgSrc__Load(file, folder);
        if (entry.state === Na__LeImgSrc__READY) return entry.blob;
        if (entry.state === Na__LeImgSrc__LOADING && entry.loading) { await entry.loading; }
        const settled = Na__LeImgSrc__Entries.get(file);
        return (settled && settled.state === Na__LeImgSrc__READY) ? settled.blob : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Hand Over a Picture the Drop Has Just Stored, So It Shows at Once
    // ------------------------------------------------------------
    function Na__LeImgSrc__Adopt(file, blob) {
        if (!file || !(blob instanceof Blob)) return null;
        const old = Na__LeImgSrc__Entries.get(file);
        if (old && old.state === Na__LeImgSrc__READY) return old.url;            // <-- The same name is the same picture: keep the URL the sheet already draws
        const entry = { state : Na__LeImgSrc__READY, url : URL.createObjectURL(blob), blob : blob, from : 'drop', loading : null };
        Na__LeImgSrc__Entries.set(file, entry);
        Na__LeImgSrc__Announce(file);
        return entry.url;
    }
    // ------------------------------------------------------------


    // FUNCTION | Ask Again for Pictures That Were Missing (after a save re-filed them)
    // ------------------------------------------------------------
    // files: a list of names, or nothing for every missing picture.
    // ------------------------------------------------------------
    function Na__LeImgSrc__Retry(files) {
        const only = Array.isArray(files) ? new Set(files) : null;
        let any = false;
        Na__LeImgSrc__Entries.forEach((entry, file) => {
            if (entry.state !== Na__LeImgSrc__MISSING || (only && !only.has(file))) return;
            Na__LeImgSrc__Entries.delete(file);
            any = true;
        });
        if (any) Na__LeImgSrc__Announce(null);
        return any;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Editor's Extra Places to Look (null to stop)
    // ------------------------------------------------------------
    function Na__LeImgSrc__SetFolderFinder(finder) {
        Na__LeImgSrc__Finder = (typeof finder === 'function') ? finder : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Which Pictures Are Missing (for the save's report)
    // ------------------------------------------------------------
    function Na__LeImgSrc__MissingFiles() {
        const list = [];
        Na__LeImgSrc__Entries.forEach((entry, file) => { if (entry.state === Na__LeImgSrc__MISSING) list.push(file); });
        return list;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Sheet Images Source API
    // ------------------------------------------------------------
    export {
        Na__LeImgSrc__CHANGED_EVENT,
        Na__LeImgSrc__READY,
        Na__LeImgSrc__LOADING,
        Na__LeImgSrc__MISSING,
        Na__LeImgSrc__Url,
        Na__LeImgSrc__State,
        Na__LeImgSrc__Blob,
        Na__LeImgSrc__Adopt,
        Na__LeImgSrc__Retry,
        Na__LeImgSrc__SetFolderFinder,
        Na__LeImgSrc__MissingFiles
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
