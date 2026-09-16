// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - SPECIFICATION DATA - TRANSPORT
// =============================================================================
//
// FILE       : Na__LayoutEditor__SpecData__Transport__.js
// NAMESPACE  : Na__LeSpec
// MODULE     : Layout Editor - Specification Data - Transport
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Load, retry and sync the specification file: ValeVision__DrawingNotes__.json on R2 through the worker or the CDN, and its local copy beside project.json through Flask
// CREATED    : 15-Sep-2026
//
// DESCRIPTION:
// - THE APP-SPECIFIC UNIT. Where the specification file lives, and how it is
//   read and written, is decided here and nowhere else, so the other units
//   stay the same in ValeVision and TrueVision.
// - WHERE IT IS READ FROM. On localhost the cloud copy and the local
//   ValeVision__DrawingNotes__.json beside project.json (through Flask) are
//   both read, and Reconcile decides between them: a local copy whose
//   UpdatedIso is newer is adopted so an on-disk edit reaches the editor, and
//   a missing local copy is seeded from whatever was loaded. The web build
//   reads the cloud copy alone.
// - A COPY THAT COULD NOT BE READ is not a copy that is not there: the status
//   is 'failed', edits stay in this browser, and Sync refuses until Retry can
//   read the cloud copy.
// - LOADING. EnsureLoaded fetches once per project, on the first entry into
//   the editor; Adopt takes the fetched copy as the live document and
//   RestoreDraft then puts back any unsynced edits from this browser.
// - SYNC reads the cloud copy first, asks before replacing one that changed
//   since this browser read it, and writes the whole file through
//   Na__AppUtils__R2DrawingNotes__ (the worker, then Flask).
// - Its own helpers: a time limit on a read, a document's cloud stamp, and the
//   local Flask mirror.
//
// INTEGRATION:
// - Imports the State, Document and Draft units, the config state, the project
//   code, the environment, the confirm dialog and
//   Na__AppUtils__R2DrawingNotes__.
// - Imported by Na__LayoutEditor__SpecData__.js, which exports EnsureLoaded,
//   Retry and Sync.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : split out of Na__LayoutEditor__SpecData__.js (15-Sep-2026, ValeVision3D v2.47.0)
// - Parity        : adapted, as the Transport region already was
// - Divergences   : the ValeVision transport (R2 worker or CDN, Flask beside
//                   project.json). Adopt, EnsureLoaded, Retry and Sync store
//                   through the State unit's setters.
// - Back-port     : the same split applies to TrueVision's copy, whose unit
//                   keeps its own Worker, CDN and repository code (UsesWorker,
//                   FetchJson, the legacy file name and its own MirrorLocal).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 15-Sep-2026 - Version 1.0.0
// - Split out of Na__LayoutEditor__SpecData__.js; the code moved verbatim.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Project Code, Environment, Drawing Notes, the Confirm Dialog and the Specification Units
    // ------------------------------------------------------------
    import { Na__LeCfg__GetSpecificationSetup, Na__LeCfg__GetLabel, Na__LeCfg__FormatLabel } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';
    import { Na__DrawData__GetProjectCode } from '../../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    import { Na__AppUtils__IsRunningOnLocalhost, Na__AppUtils__GetProjectCodeFromUrl } from '../../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    import { Na__AppUtils__ConfirmDialog__Show } from '../../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // @delegate: ../../03__AppUtils/Na__AppUtils__R2DrawingNotes__.js
    import { Na__R2Notes__ReadCloud, Na__R2Notes__Write, Na__R2Notes__WriteLocal, Na__R2Notes__ReadLocal } from '../../03__AppUtils/Na__AppUtils__R2DrawingNotes__.js';
    import {
        Na__LeSpec__VERSION,
        Na__LeSpec__STATUS_LOADING,
        Na__LeSpec__STATUS_READY,
        Na__LeSpec__STATUS_NEW,
        Na__LeSpec__STATUS_FAILED,
        Na__LeSpec__K_DESCRIPTION,
        Na__LeSpec__K_VERSION,
        Na__LeSpec__K_PROJECT,
        Na__LeSpec__K_UPDATED,
        Na__LeSpec__K_LAST_ID,
        Na__LeSpec__DESCRIPTION,
        Na__LeSpec__Doc,
        Na__LeSpec__Status,
        Na__LeSpec__ProjectCode,
        Na__LeSpec__LoadPromise,
        Na__LeSpec__BaseStamp,
        Na__LeSpec__Syncing,
        Na__LeSpec__IdFloor,
        Na__LeSpec__Editable,
        Na__LeSpec__SetDoc,
        Na__LeSpec__SetIndex,
        Na__LeSpec__SetStatus,
        Na__LeSpec__SetSource,
        Na__LeSpec__SetError,
        Na__LeSpec__SetProjectCode,
        Na__LeSpec__SetLoadPromise,
        Na__LeSpec__SetBaseStamp,
        Na__LeSpec__SetSyncedJson,
        Na__LeSpec__SetCodeSig,
        Na__LeSpec__SetSyncing,
        Na__LeSpec__SetLastSyncIso,
        Na__LeSpec__SetHistory,
        Na__LeSpec__SetIdFloor,
        Na__LeSpec__Dispatch,
        Na__LeSpec__Toast
    } from './Na__LayoutEditor__SpecData__State__.js';
    import {
        Na__LeSpec__Skeleton,
        Na__LeSpec__Normalise,
        Na__LeSpec__ContentJson,
        Na__LeSpec__CodeSignature,
        Na__LeSpec__ListNotes,
        Na__LeSpec__IsLoaded,
        Na__LeSpec__IsDirty
    } from './Na__LayoutEditor__SpecData__Document__.js';
    import { Na__LeSpec__ClearDraft, Na__LeSpec__ScheduleDraft, Na__LeSpec__RestoreDraft } from './Na__LayoutEditor__SpecData__Draft__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve After a Time Limit, Whatever the Promise Does
    // ------------------------------------------------------------
    function Na__LeSpec__WithTimeout(promise, ms) {
        return Promise.race([
            Promise.resolve(promise).catch((error) => ({ ok : false, error : (error && error.message) || 'error' })),
            new Promise((resolve) => { window.setTimeout(() => resolve({ ok : false, error : 'timed out' }), ms); })
        ]);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Document's Cloud Stamp (empty when it has none)
    // ------------------------------------------------------------
    function Na__LeSpec__Stamp(data) {
        return (data && typeof data === 'object' && typeof data[Na__LeSpec__K_UPDATED] === 'string') ? data[Na__LeSpec__K_UPDATED] : '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the Live Document to the Local Flask Copy (localhost only)
    // ------------------------------------------------------------
    // Flask-only: seeding a missing local file, or adopting a newer cloud copy
    // onto disk, must never create an empty R2 object on first editor open.
    // ------------------------------------------------------------
    async function Na__LeSpec__MirrorLocal(doc) {
        if (!Na__AppUtils__IsRunningOnLocalhost() || !doc || typeof doc !== 'object') return { ok : false, skipped : true, error : null };
        const result = await Na__R2Notes__WriteLocal(doc);
        if (!result.ok && !result.skipped) {
            console.warn('[ValeVision3D] Layout Editor: the local drawing-notes file was not written:', result.error);
        }
        return result;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Transport (ValeVision: R2 worker/CDN plus Flask beside project.json)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Find the Specification: { status, data, source, error }
    // ------------------------------------------------------------
    // On localhost the repository ValeVision__DrawingNotes__.json is read as
    // well as R2. A local copy whose UpdatedIso is newer is adopted so an
    // on-disk edit reaches the editor; a missing local copy is seeded from
    // whatever was loaded.
    // ------------------------------------------------------------
    function Na__LeSpec__HasDoc(data) {
        return !!(data && typeof data === 'object' && !Array.isArray(data));
    }

    function Na__LeSpec__Reconcile(cloud, localCopy) {
        const cloudHas = Na__LeSpec__HasDoc(cloud.data);
        const localHas = !!(localCopy && localCopy.ok && Na__LeSpec__HasDoc(localCopy.data));
        const result = Object.assign({ seedLocal : false, localAhead : false, cloudContent : null }, cloud);

        if (!cloudHas && !localHas) {
            result.seedLocal = (cloud.status === Na__LeSpec__STATUS_NEW);
            return result;
        }
        if (cloudHas && !localHas) {
            result.seedLocal = true;
            return result;
        }
        if (!cloudHas && localHas) {
            result.data   = localCopy.data;
            result.source = 'repository';
            if (cloud.status !== Na__LeSpec__STATUS_FAILED) {
                result.status       = Na__LeSpec__STATUS_READY;
                result.cloudMissing = true;
                result.error        = null;
            }
            return result;
        }

        const cloudStamp = Na__LeSpec__Stamp(cloud.data);
        const localStamp = Na__LeSpec__Stamp(localCopy.data);
        if (localStamp && cloudStamp && localStamp > cloudStamp) {
            result.status       = Na__LeSpec__STATUS_READY;
            result.data         = localCopy.data;
            result.source       = 'repository';
            result.localAhead   = true;
            result.cloudContent = cloud.data;
            result.error        = null;
            return result;
        }
        if (cloudStamp && localStamp && cloudStamp > localStamp) {
            result.seedLocal = true;
            return result;
        }
        const cloudNorm = Na__LeSpec__ContentJson(Na__LeSpec__Normalise(cloud.data));
        const localNorm = Na__LeSpec__ContentJson(Na__LeSpec__Normalise(localCopy.data));
        if (cloudNorm !== localNorm) {
            result.status       = Na__LeSpec__STATUS_READY;
            result.data         = localCopy.data;
            result.source       = 'repository';
            result.localAhead   = true;
            result.cloudContent = cloud.data;
            result.error        = null;
        }
        return result;
    }

    async function Na__LeSpec__ReadCloudFile(fileName, timeoutMs) {
        return Na__LeSpec__WithTimeout(Na__R2Notes__ReadCloud(fileName), timeoutMs);
    }

    async function Na__LeSpec__Fetch() {
        const setup = Na__LeCfg__GetSpecificationSetup();
        const local = Na__AppUtils__IsRunningOnLocalhost();
        const localCopy = local ? await Na__R2Notes__ReadLocal(setup.fileName) : { ok : true, data : null, missing : true };
        const cloud = await Na__LeSpec__ReadCloudFile(setup.fileName, setup.loadTimeoutMs);

        if (local) {
            if (cloud && cloud.ok && !cloud.missing && Na__LeSpec__HasDoc(cloud.data)) {
                return Na__LeSpec__Reconcile({ status : Na__LeSpec__STATUS_READY, data : cloud.data, source : 'cloud' }, localCopy);
            }
            if (cloud && cloud.ok) {
                return Na__LeSpec__Reconcile({ status : Na__LeSpec__STATUS_NEW, data : null, source : 'cloud', cloudMissing : true }, localCopy);
            }
            const fallback = (localCopy.ok && Na__LeSpec__HasDoc(localCopy.data)) ? localCopy : { ok : false, data : null };
            return Na__LeSpec__Reconcile({
                status : Na__LeSpec__STATUS_FAILED,
                data   : (fallback.ok && Na__LeSpec__HasDoc(fallback.data)) ? fallback.data : null,
                source : fallback.ok ? 'repository' : null,
                error  : (cloud && cloud.error) || 'unreachable'
            }, localCopy);
        }

        if (cloud && cloud.ok && !cloud.missing && Na__LeSpec__HasDoc(cloud.data)) {
            return { status : Na__LeSpec__STATUS_READY, data : cloud.data, source : 'cdn' };
        }
        if (cloud && cloud.ok) return { status : Na__LeSpec__STATUS_NEW, data : null, source : 'cdn' };
        return { status : Na__LeSpec__STATUS_FAILED, data : null, source : null, error : (cloud && cloud.error) || 'CDN unreachable' };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Take a Fetched Copy as the Live Document
    // ------------------------------------------------------------
    function Na__LeSpec__Adopt(result) {
        const doc = Na__LeSpec__Normalise(result.data);
        Na__LeSpec__SetIdFloor(Math.max(Na__LeSpec__IdFloor, doc[Na__LeSpec__K_LAST_ID]));
        Na__LeSpec__SetDoc(doc);
        Na__LeSpec__SetIndex(null);
        Na__LeSpec__SetStatus(result.status);
        Na__LeSpec__SetSource(result.source);
        Na__LeSpec__SetError(result.error || null);
        if (result.localAhead && result.cloudContent) {
            Na__LeSpec__SetBaseStamp(Na__LeSpec__Stamp(result.cloudContent) || null);
            Na__LeSpec__SetSyncedJson(Na__LeSpec__ContentJson(Na__LeSpec__Normalise(result.cloudContent)));
        } else {
            Na__LeSpec__SetBaseStamp((result.data && !result.cloudMissing) ? doc[Na__LeSpec__K_UPDATED] : null);
            Na__LeSpec__SetSyncedJson(result.cloudMissing ? Na__LeSpec__ContentJson(Na__LeSpec__Skeleton()) : Na__LeSpec__ContentJson(doc));
        }
        Na__LeSpec__SetHistory({ undo : [], redo : [], current : JSON.stringify(doc) });
        Na__LeSpec__SetCodeSig(Na__LeSpec__CodeSignature());
        if (result.seedLocal) void Na__LeSpec__MirrorLocal(doc);
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the Specification Once per Project (the first entry into the editor)
    // ------------------------------------------------------------
    // Resolves to the live document. Never rejects: a failure leaves the status
    // 'failed' and an empty (or fallback) document to work in.
    // ------------------------------------------------------------
    function Na__LeSpec__EnsureLoaded() {
        const code = Na__DrawData__GetProjectCode();
        if (Na__LeSpec__LoadPromise && Na__LeSpec__ProjectCode === code) return Na__LeSpec__LoadPromise;
        Na__LeSpec__SetProjectCode(code);
        Na__LeSpec__SetStatus(Na__LeSpec__STATUS_LOADING);
        Na__LeSpec__Dispatch('status');
        Na__LeSpec__SetLoadPromise(Na__LeSpec__Fetch().then((result) => {
            if (Na__LeSpec__ProjectCode !== code) return Na__LeSpec__Doc;           // <-- Another project arrived meanwhile
            Na__LeSpec__Adopt(result);
            Na__LeSpec__RestoreDraft();
            Na__LeSpec__SetCodeSig(Na__LeSpec__CodeSignature());
            if (result.status === Na__LeSpec__STATUS_FAILED) console.warn('[ValeVision3D] Layout Editor: the project specification could not be read (' + (result.error || 'unknown') + '). Edits stay in this browser; Sync is closed until it can be read.');
            else console.log('[ValeVision3D] Layout Editor: project specification ' + (result.status === Na__LeSpec__STATUS_NEW ? 'not created yet' : 'loaded from the ' + result.source) + ' (' + Na__LeSpec__ListNotes().length + ' note(s)).');
            Na__LeSpec__Dispatch('loaded', { codesChanged : true });
            return Na__LeSpec__Doc;
        }).catch((error) => {
            console.error('[ValeVision3D] Layout Editor: specification load error:', error);
            Na__LeSpec__Adopt({ status : Na__LeSpec__STATUS_FAILED, data : null, source : null, error : (error && error.message) || 'error' });
            Na__LeSpec__Dispatch('loaded', { codesChanged : true });
            return Na__LeSpec__Doc;
        }));
        return Na__LeSpec__LoadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Try the Cloud Copy Again After a Failed Read
    // ------------------------------------------------------------
    // With no edits made meanwhile, the cloud copy simply becomes the document.
    // Edits made while it could not be read are kept - they are this person's
    // work - but they were NOT made on the cloud copy, so the stamp they started
    // from stays their base: Sync then asks before they replace what the cloud
    // holds, rather than quietly writing an edited empty specification over a
    // real one.
    // ------------------------------------------------------------
    async function Na__LeSpec__Retry() {
        if (Na__LeSpec__Status !== Na__LeSpec__STATUS_FAILED || Na__LeSpec__Syncing) return false;
        const hadEdits = Na__LeSpec__IsDirty();
        const kept     = Na__LeSpec__Doc;
        const keptBase = Na__LeSpec__BaseStamp;
        Na__LeSpec__SetStatus(Na__LeSpec__STATUS_LOADING);
        Na__LeSpec__Dispatch('status');
        const result = await Na__LeSpec__Fetch();
        if (result.status === Na__LeSpec__STATUS_FAILED) {
            Na__LeSpec__SetStatus(Na__LeSpec__STATUS_FAILED);
            Na__LeSpec__SetError(result.error || null);
            Na__LeSpec__Dispatch('status');
            return false;
        }
        Na__LeSpec__Adopt(result);
        if (hadEdits && kept) {
            Na__LeSpec__SetDoc(kept);                                           // <-- The cloud copy's counter is already in the id floor
            Na__LeSpec__SetIndex(null);
            Na__LeSpec__SetBaseStamp(keptBase);                                 // <-- The edits' own base, so Sync asks before replacing the cloud copy
            Na__LeSpec__SetHistory({ undo : [], redo : [], current : JSON.stringify(kept) });
            Na__LeSpec__Toast(Na__LeCfg__GetLabel('SpecRetryKeptEdits', 'The cloud copy can be read again. The changes made while it could not be read are kept; Sync asks before they replace it.'), false);
        }
        Na__LeSpec__SetCodeSig(Na__LeSpec__CodeSignature());
        Na__LeSpec__Dispatch('loaded', { codesChanged : true });
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Cloud Stamp as Words for the Overwrite Question
    // ------------------------------------------------------------
    function Na__LeSpec__When(iso) {
        const date = iso ? new Date(iso) : null;
        return (date && !isNaN(date.getTime())) ? date.toLocaleString() : Na__LeCfg__GetLabel('SpecWhenUnknown', 'at an unknown time');
    }
    // ------------------------------------------------------------


    // FUNCTION | Sync: Write the Whole Specification to R2
    // ------------------------------------------------------------
    // options: { showToast, quiet }. Reads the cloud copy first; when it is not
    // the copy these edits started from, asks before replacing it. Resolves true
    // when the file was written.
    // ------------------------------------------------------------
    async function Na__LeSpec__Sync(options) {
        const opts  = options || {};
        const setup = Na__LeCfg__GetSpecificationSetup();
        const toast = (message, isError) => Na__LeSpec__Toast(message, isError, opts.showToast);
        if (Na__LeSpec__Syncing) return false;
        if (!Na__LeSpec__Editable) { toast(Na__LeCfg__GetLabel('SpecSyncReadOnly', 'The specification is read-only here.'), true); return false; }
        if (!Na__LeSpec__IsLoaded()) { toast(Na__LeCfg__GetLabel('SpecSyncNotLoaded', 'The specification has not finished loading.'), true); return false; }
        if (!Na__AppUtils__GetProjectCodeFromUrl()) { toast(Na__LeCfg__GetLabel('SpecSyncNoWorker', 'Cloudflare Worker not configured. The specification cannot be synced.'), true); return false; }

        Na__LeSpec__SetSyncing(true);
        Na__LeSpec__Dispatch('status');
        try {
            const read = await Na__LeSpec__ReadCloudFile(setup.fileName, setup.loadTimeoutMs);
            if (!read || !read.ok) {
                toast(Na__LeCfg__FormatLabel('SpecSyncUnreachable', 'The cloud copy could not be read ({error}). Your changes are kept in this browser.', { error : (read && read.error) || 'unknown' }), true);
                return false;
            }
            const cloudStamp = (read.missing || !read.data) ? null : (typeof read.data[Na__LeSpec__K_UPDATED] === 'string' ? read.data[Na__LeSpec__K_UPDATED] : 'unstamped');
            if (setup.confirmOverwrite && cloudStamp !== Na__LeSpec__BaseStamp) {
                const ok = await Na__AppUtils__ConfirmDialog__Show({
                    title        : Na__LeCfg__GetLabel('SpecOverwriteTitle', 'Replace the cloud specification?'),
                    message      : Na__LeSpec__BaseStamp === null
                        ? Na__LeCfg__GetLabel('SpecOverwriteUnreadPrompt', 'The cloud already holds a specification that this browser has not read. Syncing replaces it with the copy in this browser.')
                        : Na__LeCfg__FormatLabel('SpecOverwritePrompt', 'The specification in the cloud has changed since this browser read it (saved {when}). Syncing replaces it with the copy in this browser.', { when : Na__LeSpec__When(cloudStamp) }),
                    confirmLabel : Na__LeCfg__GetLabel('SpecOverwriteConfirm', 'Replace'),
                    isDestructive : true
                });
                if (!ok) { toast(Na__LeCfg__GetLabel('SpecSyncCancelled', 'Sync cancelled. Your changes are kept in this browser.'), false); return false; }
            }

            const out = Na__LeSpec__Normalise(Na__LeSpec__Doc);
            out[Na__LeSpec__K_DESCRIPTION] = Na__LeSpec__DESCRIPTION;
            out[Na__LeSpec__K_VERSION]     = Na__LeSpec__VERSION;
            out[Na__LeSpec__K_PROJECT]     = Na__LeSpec__ProjectCode || Na__DrawData__GetProjectCode() || null;
            out[Na__LeSpec__K_UPDATED]     = new Date().toISOString();
            out[Na__LeSpec__K_LAST_ID]     = Math.max(out[Na__LeSpec__K_LAST_ID], Na__LeSpec__IdFloor);   // <-- Ids undone away stay spent in the file too
            const write = await Na__R2Notes__Write(setup.fileName, out);
            if (!write || !write.ok) {
                const error = (write && write.error) || 'unknown';
                if (error === 'Worker config unavailable') toast(Na__LeCfg__GetLabel('SpecSyncNoWorker', 'Cloudflare Worker not configured. The specification cannot be synced.'), true);
                else toast(Na__LeCfg__FormatLabel('SpecSyncFailed', 'Specification sync failed: {error}. Your changes are kept in this browser.', { error : error }), true);
                return false;
            }

            // THE LIVE DOCUMENT IS NOT STAMPED. The stamp belongs to the copy in the
            // cloud and is remembered as the base; writing it into the document
            // would make it differ from the undo history, and the first undo after
            // a sync would quietly undo the stamp instead of the last edit.
            Na__LeSpec__SetBaseStamp(out[Na__LeSpec__K_UPDATED]);
            Na__LeSpec__SetSyncedJson(Na__LeSpec__ContentJson(out));               // <-- What was written; typing that landed during the write stays unsynced
            Na__LeSpec__SetStatus(Na__LeSpec__STATUS_READY);
            Na__LeSpec__SetSource('cloud');
            Na__LeSpec__SetError(null);
            Na__LeSpec__SetLastSyncIso(out[Na__LeSpec__K_UPDATED]);
            if (Na__LeSpec__IsDirty()) Na__LeSpec__ScheduleDraft(); else Na__LeSpec__ClearDraft();
            if (!opts.quiet) toast(Na__LeCfg__GetLabel('SpecSynced', 'Project specification synced.'), false);
            return true;
        } catch (error) {
            console.error('[ValeVision3D] Layout Editor: specification sync error:', error);
            toast(Na__LeCfg__FormatLabel('SpecSyncFailed', 'Specification sync failed: {error}. Your changes are kept in this browser.', { error : (error && error.message) || 'unknown' }), true);
            return false;
        } finally {
            Na__LeSpec__SetSyncing(false);
            Na__LeSpec__Dispatch('synced');
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Specification Data Transport: Load, Retry and Sync
    // ------------------------------------------------------------
    export {
        Na__LeSpec__EnsureLoaded,
        Na__LeSpec__Retry,
        Na__LeSpec__Sync
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
