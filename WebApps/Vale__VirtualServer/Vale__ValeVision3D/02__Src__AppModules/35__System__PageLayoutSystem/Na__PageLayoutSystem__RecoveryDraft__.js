// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - RECOVERY DRAFTS (KEPT ON THIS COMPUTER)
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__RecoveryDraft__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Recovery Drafts
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Keep a copy of an unsaved drawing in this browser's own storage, so
//              a crash, a closed tab or a closed app can be undone
// CREATED    : 11-Nov-2026
//
// DESCRIPTION:
// - WHY (Adam, 11-Nov-2026): a drawing that was never saved could never be got back
//   once its page closed. Adam chose a recovery copy on the computer itself, not on
//   the Vale Cloud: nothing extra goes to the server, and it is there on that
//   machine only.
// - WHERE: IndexedDB 'Na__PageLayout__RecoveryDrafts', two stores:
//     Drafts    one record per drawing session: the job, who, when, the name, the
//               saved layout it changes (if any), the layout's blocks, a small
//               thumbnail of the sheet
//     Pictures  the picture itself (a PNG of up to tens of MB), written once per
//               picture and kept apart, so a moved picture does not copy it again
// - THE PAGE DECIDES WHEN (Na__PageLayoutSystem__RecoveryDraft__Controls__): written
//   while a drawing has changes not on the Vale Cloud, removed once it is saved or
//   deliberately thrown away.
// - NEVER IN THE WAY: every call resolves (false, null or []), never rejects. A
//   browser with no IndexedDB, a full disk or a private window just keeps no copy.
// - A LEAF: no imports, so ValeVision 3D's own menus can read it too.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Nov-2026 - Version 1.0.0 (ValeVision3D v2.94.0)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Database
    // ------------------------------------------------------------
    const Na__PageLayout__Recovery__DB_NAME       = 'Na__PageLayout__RecoveryDrafts';
    const Na__PageLayout__Recovery__DB_VERSION    = 1;
    const Na__PageLayout__Recovery__DRAFTS        = 'Drafts';
    const Na__PageLayout__Recovery__PICTURES      = 'Pictures';
    const Na__PageLayout__Recovery__BY_PROJECT    = 'ByProject';
    const Na__PageLayout__Recovery__BY_DRAFT      = 'ByDraft';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | What Is Kept When the Caller Says Nothing
    // ------------------------------------------------------------
    const Na__PageLayout__Recovery__KEEP_DAYS     = 14;                     // <-- A copy older than this is removed
    const Na__PageLayout__Recovery__KEEP_PER_JOB  = 5;                      // <-- Newest copies per job per person
    const Na__PageLayout__Recovery__KEEP_ALL      = 12;                     // <-- Newest copies on this computer in all
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Open Database (One Promise Per Page)
    // ------------------------------------------------------------
    let Na__PageLayout__Recovery__Db = null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Open the Database (Resolves null When This Browser Cannot)
    // ------------------------------------------------------------
    function Na__PageLayout__Recovery__Open() {
        if (Na__PageLayout__Recovery__Db) return Na__PageLayout__Recovery__Db;
        Na__PageLayout__Recovery__Db = new Promise((resolve) => {
            try {
                if (typeof indexedDB === 'undefined' || !indexedDB) { resolve(null); return; }
                const request = indexedDB.open(Na__PageLayout__Recovery__DB_NAME, Na__PageLayout__Recovery__DB_VERSION);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(Na__PageLayout__Recovery__DRAFTS)) {
                        const drafts = db.createObjectStore(Na__PageLayout__Recovery__DRAFTS, { keyPath : 'Draft__Id' });
                        drafts.createIndex(Na__PageLayout__Recovery__BY_PROJECT, 'Draft__Project', { unique : false });
                    }
                    if (!db.objectStoreNames.contains(Na__PageLayout__Recovery__PICTURES)) {
                        const pictures = db.createObjectStore(Na__PageLayout__Recovery__PICTURES, { keyPath : 'Picture__Key' });
                        pictures.createIndex(Na__PageLayout__Recovery__BY_DRAFT, 'Picture__DraftId', { unique : false });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror   = () => { console.warn('[PageLayout] No recovery copies on this browser:', request.error); resolve(null); };
                request.onblocked = () => resolve(null);
            } catch (error) {
                console.warn('[PageLayout] No recovery copies on this browser:', error);
                resolve(null);
            }
        });
        return Na__PageLayout__Recovery__Db;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Run One Transaction; Resolves What fn Leaves in result, or fallback on Any Failure
    // ------------------------------------------------------------
    async function Na__PageLayout__Recovery__Run(storeNames, mode, fn, fallback) {
        const db = await Na__PageLayout__Recovery__Open();
        if (!db) return fallback;
        return new Promise((resolve) => {
            try {
                const tx  = db.transaction(storeNames, mode);
                const box = { result : fallback };
                fn(tx, box);
                tx.oncomplete = () => resolve(box.result);
                tx.onerror    = () => { console.warn('[PageLayout] A recovery copy could not be kept:', tx.error); resolve(fallback); };
                tx.onabort    = () => { console.warn('[PageLayout] A recovery copy could not be kept:', tx.error); resolve(fallback); };
            } catch (error) {
                console.warn('[PageLayout] A recovery copy could not be kept:', error);
                resolve(fallback);
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Delete Every Picture of a Draft Except One Key, Inside a Transaction
    // ------------------------------------------------------------
    function Na__PageLayout__Recovery__DropPictures(tx, draftId, keepKey) {
        const index = tx.objectStore(Na__PageLayout__Recovery__PICTURES).index(Na__PageLayout__Recovery__BY_DRAFT);
        const request = index.openKeyCursor(IDBKeyRange.only(draftId));
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return;
            if (cursor.primaryKey !== keepKey) tx.objectStore(Na__PageLayout__Recovery__PICTURES).delete(cursor.primaryKey);
            cursor.continue();
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Keep (or Replace) One Draft; the Picture Only When It Is Not Kept Yet (Promise<boolean>)
    // ------------------------------------------------------------
    // draft: { Draft__Id, Draft__Project, Draft__PictureKey, ... }. picture: the
    // PNG Blob, sent with a new Draft__PictureKey; leave it out to keep the one
    // stored under that key. Older pictures of the draft are dropped.
    // ------------------------------------------------------------
    function Na__PageLayout__Recovery__Put(draft, picture) {
        if (!draft || !draft.Draft__Id || !draft.Draft__Project) return Promise.resolve(false);
        return Na__PageLayout__Recovery__Run([Na__PageLayout__Recovery__DRAFTS, Na__PageLayout__Recovery__PICTURES], 'readwrite', (tx, box) => {
            if (picture && draft.Draft__PictureKey) {
                tx.objectStore(Na__PageLayout__Recovery__PICTURES).put({
                    Picture__Key     : draft.Draft__PictureKey,
                    Picture__DraftId : draft.Draft__Id,
                    Picture__Blob    : picture
                });
            }
            tx.objectStore(Na__PageLayout__Recovery__DRAFTS).put(draft);
            Na__PageLayout__Recovery__DropPictures(tx, draft.Draft__Id, draft.Draft__PictureKey);
            box.result = true;
        }, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Drafts of One Job, Newest First, Without Their Pictures (Promise<Array>)
    // ------------------------------------------------------------
    // userCode: only that person's (a shared computer); '' for everyone's.
    // ------------------------------------------------------------
    function Na__PageLayout__Recovery__List(project, userCode) {
        const job = String(project || '').split('/').pop();
        if (!job) return Promise.resolve([]);
        return Na__PageLayout__Recovery__Run([Na__PageLayout__Recovery__DRAFTS], 'readonly', (tx, box) => {
            const request = tx.objectStore(Na__PageLayout__Recovery__DRAFTS).index(Na__PageLayout__Recovery__BY_PROJECT).getAll(IDBKeyRange.only(job));
            request.onsuccess = () => {
                box.result = (request.result || [])
                    .filter((draft) => !userCode || draft.Draft__UserCode === userCode)
                    .sort((a, b) => String(b.Draft__SavedIso || '').localeCompare(String(a.Draft__SavedIso || '')));
            };
        }, []);
    }
    // ------------------------------------------------------------


    // FUNCTION | One Draft With Its Picture (draft.blob), or null (Promise)
    // ------------------------------------------------------------
    function Na__PageLayout__Recovery__Get(draftId) {
        if (!draftId) return Promise.resolve(null);
        return Na__PageLayout__Recovery__Run([Na__PageLayout__Recovery__DRAFTS, Na__PageLayout__Recovery__PICTURES], 'readonly', (tx, box) => {
            const request = tx.objectStore(Na__PageLayout__Recovery__DRAFTS).get(draftId);
            request.onsuccess = () => {
                const draft = request.result;
                if (!draft) return;
                const pictureRequest = tx.objectStore(Na__PageLayout__Recovery__PICTURES).get(draft.Draft__PictureKey || '');
                pictureRequest.onsuccess = () => {
                    const picture = pictureRequest.result;
                    box.result = Object.assign({}, draft, { blob : picture ? picture.Picture__Blob : null });
                };
            };
        }, null);
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove One Draft and Its Pictures (Promise<boolean>)
    // ------------------------------------------------------------
    function Na__PageLayout__Recovery__Remove(draftId) {
        if (!draftId) return Promise.resolve(false);
        return Na__PageLayout__Recovery__Run([Na__PageLayout__Recovery__DRAFTS, Na__PageLayout__Recovery__PICTURES], 'readwrite', (tx, box) => {
            tx.objectStore(Na__PageLayout__Recovery__DRAFTS).delete(draftId);
            Na__PageLayout__Recovery__DropPictures(tx, draftId, null);
            box.result = true;
        }, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Tidy: Drop Old Copies, and the Oldest Past the Limits (Promise<number> Removed)
    // ------------------------------------------------------------
    // limits: { keepDays, keepPerJob, keepAll }; keepIds: drafts never dropped
    // (the page's own, while it is open).
    // ------------------------------------------------------------
    async function Na__PageLayout__Recovery__Prune(limits = {}, keepIds = []) {
        const keepDays   = Number.isFinite(limits.keepDays)   ? limits.keepDays   : Na__PageLayout__Recovery__KEEP_DAYS;
        const keepPerJob = Number.isFinite(limits.keepPerJob) ? limits.keepPerJob : Na__PageLayout__Recovery__KEEP_PER_JOB;
        const keepAll    = Number.isFinite(limits.keepAll)    ? limits.keepAll    : Na__PageLayout__Recovery__KEEP_ALL;
        const all = await Na__PageLayout__Recovery__Run([Na__PageLayout__Recovery__DRAFTS], 'readonly', (tx, box) => {
            const request = tx.objectStore(Na__PageLayout__Recovery__DRAFTS).getAll();
            request.onsuccess = () => { box.result = request.result || []; };
        }, []);
        if (!all.length) return 0;

        const oldest = Date.now() - keepDays * 86400000;
        const newest = all.slice().sort((a, b) => String(b.Draft__SavedIso || '').localeCompare(String(a.Draft__SavedIso || '')));
        const perJob = {};
        const doomed = [];
        newest.forEach((draft, index) => {
            if (keepIds.indexOf(draft.Draft__Id) >= 0) return;
            const key  = `${draft.Draft__Project}|${draft.Draft__UserCode || ''}`;
            perJob[key] = (perJob[key] || 0) + 1;
            const when = Date.parse(draft.Draft__SavedIso || '') || 0;
            if (when < oldest || perJob[key] > keepPerJob || index >= keepAll) doomed.push(draft.Draft__Id);
        });
        for (const draftId of doomed) await Na__PageLayout__Recovery__Remove(draftId);
        return doomed.length;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Recovery Drafts API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__Recovery__Put,
        Na__PageLayout__Recovery__List,
        Na__PageLayout__Recovery__Get,
        Na__PageLayout__Recovery__Remove,
        Na__PageLayout__Recovery__Prune
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
