// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - RECOVERY DRAFTS CONTROLS
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__RecoveryDraft__Controls__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Recovery Drafts Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Keep a recovery copy of the drawing on the sheet while it has changes
//              not on the Vale Cloud, and offer the copies left behind by a crash,
//              a closed tab or a closed app (Recover, Discard)
// CREATED    : 11-Nov-2026
//
// DESCRIPTION:
// - WHEN A COPY IS KEPT: a picture on the sheet, changes not saved, a job, and a
//   person who could save it. The copy is written a moment after each change
//   (RecoveryWriteDelayMs), at once when the page is hidden or closing, and the
//   picture itself only when it is new (a re-render, an opened drawing).
// - WHEN IT GOES: once the drawing is saved (or opened clean), and when it is thrown
//   away on purpose (Close Without Saving, Discard and Start New: the Unsaved Guard
//   calls the discarder). Closing the tab or the browser keeps it: that is the case
//   it is for.
// - AN EXPORTED VERSION OPENED AND NOT TOUCHED keeps no copy: it differs from the
//   current drawing, but the server has it, so nothing would be lost. Its first real
//   change makes it worth keeping.
// - THE COPIES LEFT BEHIND show at the top of Saved Layouts as amber "Not saved"
//   cards, the signed-in person's only (a shared computer): Recover puts the drawing
//   back on the sheet unsaved (a change of a saved drawing is reattached to it, so
//   Save Changes updates it, and says so if someone saved it since); Discard asks,
//   then removes it. The page opens Saved Layouts and says so when there are some.
// - ONE COPY PER PAGE SESSION: recovering another copy starts a new session, so the
//   drawing that was on the sheet stays recoverable too.
// - Old copies are tidied as the page starts (RecoveryKeepDays, RecoveryKeepPerJob,
//   RecoveryKeepAll in the config).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Nov-2026 - Version 1.0.0 (ValeVision3D v2.94.0)
// - Initial build (Adam, 11-Nov-2026: a recovery copy on the computer).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Copies, the Store, the List, the Page
    // ------------------------------------------------------------
    import {
        Na__PageLayout__Recovery__Put,
        Na__PageLayout__Recovery__List,
        Na__PageLayout__Recovery__Get,
        Na__PageLayout__Recovery__Remove,
        Na__PageLayout__Recovery__Prune
    } from './Na__PageLayoutSystem__RecoveryDraft__.js';
    import {
        Na__PageLayout__Store__BuildRecord,
        Na__PageLayout__Store__MakeThumbnail,
        Na__PageLayout__Store__Recover
    } from './Na__PageLayoutSystem__LayoutStore__.js';
    import { Na__PageLayout__SavedList__RenderDrafts, Na__PageLayout__SavedList__FormatIso } from './Na__PageLayoutSystem__SavedList__.js';
    import { Na__PageLayout__SavedLayouts__FindRecord } from './Na__PageLayoutSystem__SavedLayouts__Controls__.js';
    import { Na__PageLayout__UnsavedGuard__SetDiscarder } from './Na__PageLayoutSystem__UnsavedGuard__.js';
    import { Na__PageLayout__User, Na__PageLayout__CanSave } from './Na__PageLayoutSystem__UserSession__.js';
    import { Na__PageLayout__Toast, Na__PageLayout__On } from './Na__PageLayoutSystem__UiNotify__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Ids
    // ------------------------------------------------------------
    const Na__PageLayout__RecoveryUi__IDS = Object.freeze({
        box     : 'naLayoutDraftList',
        section : 'naLayoutSavedSection'
    });
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Fallbacks for the Config (PageLayout__SavedLayouts__Config)
    // ------------------------------------------------------------
    const Na__PageLayout__RecoveryUi__WRITE_DELAY_MS = 1500;                // <-- A copy a moment after the last change
    const Na__PageLayout__RecoveryUi__KEEP_DAYS      = 14;
    const Na__PageLayout__RecoveryUi__KEEP_PER_JOB   = 5;
    const Na__PageLayout__RecoveryUi__KEEP_ALL       = 12;
    const Na__PageLayout__RecoveryUi__TITLE          = 'Not saved: kept on this computer';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Config's Numbers (PageLayout__SavedLayouts__Config__Recovery*)
    // ------------------------------------------------------------
    function Na__PageLayout__RecoveryUi__Config(state) {
        const section = (state && state.config) ? state.config['PageLayout__SavedLayouts__Config'] : null;
        const P   = 'PageLayout__SavedLayouts__Config__';
        const num = (key, fallback) => (section && typeof section[P + key] === 'number' && Number.isFinite(section[P + key])) ? section[P + key] : fallback;
        return {
            writeDelayMs : num('RecoveryWriteDelayMs', Na__PageLayout__RecoveryUi__WRITE_DELAY_MS),
            keepDays     : num('RecoveryKeepDays',     Na__PageLayout__RecoveryUi__KEEP_DAYS),
            keepPerJob   : num('RecoveryKeepPerJob',   Na__PageLayout__RecoveryUi__KEEP_PER_JOB),
            keepAll      : num('RecoveryKeepAll',      Na__PageLayout__RecoveryUi__KEEP_ALL)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A New Page Session's Id ('S-20261111-091843-k3x9')
    // ------------------------------------------------------------
    function Na__PageLayout__RecoveryUi__SessionId() {
        const now   = new Date();
        const pad   = (n) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        return `S-${stamp}-${Math.random().toString(36).slice(2, 6)}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Recovery Controls Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize: Keep This Page's Copy, Offer the Copies Left Behind
    // ------------------------------------------------------------
    function Na__PageLayout__InitRecoveryDrafts(state, requestRedraw) {
        if (!state) return;
        const cfg = Na__PageLayout__RecoveryUi__Config(state);
        const box = document.getElementById(Na__PageLayout__RecoveryUi__IDS.box);

        let sessionId  = Na__PageLayout__RecoveryUi__SessionId();
        let startedIso = new Date().toISOString();
        let pictureNo  = 0;
        let pictureKey = '';
        let lastBlob   = null;                                              // <-- The picture last stored under pictureKey
        let kept       = false;                                             // <-- This session has a copy stored
        let viewOnly   = false;                                             // <-- An exported version opened and untouched: the server has it already
        let timer      = 0;
        let chain      = Promise.resolve();                                 // <-- Writes and removals, one after another

        const job     = () => String((state.project && state.project.id) || '').split('/').pop();
        const draftId = () => `${job()}|${sessionId}`;


        // SUB FUNCTION | Should the Drawing on the Sheet Have a Copy?
        // ------------------------------------------------------------
        const shouldKeep = () => !viewOnly && !!(state.layout && state.layout.dirty === true && state.viewportImage && state.imageBlob
            && job() && Na__PageLayout__CanSave());
        // ------------------------------------------------------------


        // SUB FUNCTION | Write the Copy Now (or Remove It When There Is Nothing to Keep)
        // ------------------------------------------------------------
        const writeNow = () => {
            clearTimeout(timer);
            timer = 0;
            chain = chain.then(async () => {
                if (!shouldKeep()) {
                    if (kept) {
                        await Na__PageLayout__Recovery__Remove(draftId());
                        kept     = false;
                        lastBlob = null;
                    }
                    return;
                }
                let picture = null;
                if (state.imageBlob !== lastBlob) {                         // <-- A new picture: stored once, under a new key
                    pictureNo += 1;
                    pictureKey = `${draftId()}|${pictureNo}`;
                    picture    = state.imageBlob;
                }
                const record = Na__PageLayout__Store__BuildRecord(state, true);
                const user   = Na__PageLayout__User() || {};
                const saved  = state.layout.record || null;
                const thumb  = await Na__PageLayout__Store__MakeThumbnail(state);
                const draft  = {
                    Draft__Id            : draftId(),
                    Draft__Project       : job(),
                    Draft__SessionId     : sessionId,
                    Draft__StartedIso    : startedIso,
                    Draft__SavedIso      : new Date().toISOString(),
                    Draft__UserCode      : user.code || '',
                    Draft__UserName      : user.name || user.code || '',
                    Draft__Name          : record.PageLayouts__Layout__Name || '',
                    Draft__LayoutId      : saved ? saved.PageLayouts__Layout__Id : '',
                    Draft__LayoutRev     : saved ? saved.PageLayouts__Layout__Rev : 0,
                    Draft__LayoutName    : saved ? saved.PageLayouts__Layout__Name : '',
                    Draft__PictureKey    : pictureKey,
                    Draft__ImageWidthPx  : record.PageLayouts__Layout__ImageWidthPx,
                    Draft__ImageHeightPx : record.PageLayouts__Layout__ImageHeightPx,
                    Draft__Blocks        : {
                        PageLayouts__Layout__Sheet          : record.PageLayouts__Layout__Sheet,
                        PageLayouts__Layout__ImagePlacement : record.PageLayouts__Layout__ImagePlacement,
                        PageLayouts__Layout__Guide          : record.PageLayouts__Layout__Guide,
                        PageLayouts__Layout__RenderSettings : record.PageLayouts__Layout__RenderSettings || null,
                        PageLayouts__Layout__SourceView     : record.PageLayouts__Layout__SourceView || null
                    },
                    Draft__Thumbnail     : thumb || null
                };
                const ok = await Na__PageLayout__Recovery__Put(draft, picture);
                if (ok) {
                    kept = true;
                    if (picture) lastBlob = picture;
                }
            }).catch((error) => console.warn('[PageLayout] The recovery copy was not kept:', error));
            return chain;
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Write the Copy a Moment After the Last Change
        // ------------------------------------------------------------
        const writeSoon = () => {
            clearTimeout(timer);
            timer = setTimeout(writeNow, Math.max(0, cfg.writeDelayMs));
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Drop This Session's Copy (a Deliberate Discard)
        // ------------------------------------------------------------
        const dropOwn = () => {
            clearTimeout(timer);
            timer = 0;
            const id = draftId();
            chain = chain.then(() => Na__PageLayout__Recovery__Remove(id)).then(() => { kept = false; lastBlob = null; });
            return chain;
        };
        Na__PageLayout__UnsavedGuard__SetDiscarder(dropOwn);
        // ------------------------------------------------------------


        // SUB FUNCTION | Draw the Copies Left Behind (This Person's, Not This Page's Own)
        // ------------------------------------------------------------
        const render = async () => {
            if (!box) return [];
            const user = Na__PageLayout__User();
            if (!user || !job()) {
                Na__PageLayout__SavedList__RenderDrafts(box, []);
                return [];
            }
            const drafts = (await Na__PageLayout__Recovery__List(job(), user.code || '')).filter((draft) => draft.Draft__Id !== draftId());
            Na__PageLayout__SavedList__RenderDrafts(box, drafts, {
                title     : Na__PageLayout__RecoveryUi__TITLE,
                onRecover : (draft) => recover(draft),
                onDiscard : (draft) => discard(draft)
            });
            return drafts;
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Put a Copy Back on the Sheet (the Drawing There Stays Recoverable)
        // ------------------------------------------------------------
        const recover = async (draft) => {
            const name = draft.Draft__Name || 'the unsaved drawing';
            if (state.layout.dirty && state.viewportImage) {
                const go = window.confirm(`Recover ${name}?\n\nIt replaces the drawing on the sheet, which has changes that are not saved. That drawing stays recoverable from this list.`);
                if (!go) return;
            }
            await writeNow();                                               // <-- The drawing on the sheet: its copy is up to date...
            const full = await Na__PageLayout__Recovery__Get(draft.Draft__Id);
            if (!full || !full.blob) {
                Na__PageLayout__Toast('This recovery copy could not be read on this computer', true);
                render();
                return;
            }
            sessionId  = Na__PageLayout__RecoveryUi__SessionId();           // <-- ...and kept under its own session: a new one starts here
            startedIso = new Date().toISOString();
            kept       = false;
            lastBlob   = null;
            pictureNo  = 0;

            const record = full.Draft__LayoutId ? await Na__PageLayout__SavedLayouts__FindRecord(full.Draft__LayoutId) : null;
            try {
                await Na__PageLayout__Store__Recover(state, {
                    blob          : full.blob,
                    name          : full.Draft__Name,
                    blocks        : full.Draft__Blocks || {},
                    imageWidthPx  : full.Draft__ImageWidthPx,
                    imageHeightPx : full.Draft__ImageHeightPx
                }, record);
            } catch (error) {
                Na__PageLayout__Toast(error.message || 'The recovery copy could not be put back', true);
                return;
            }
            if (typeof requestRedraw === 'function') requestRedraw();
            await writeNow();                                               // <-- Kept again, under this page's session...
            await Na__PageLayout__Recovery__Remove(full.Draft__Id);         // <-- ...so the old copy can go
            render();

            const movedOn = record && record.PageLayouts__Layout__Rev !== full.Draft__LayoutRev;
            const lost    = full.Draft__LayoutId && !record;
            Na__PageLayout__Toast(movedOn
                ? `Recovered ${name}. ${record.PageLayouts__Layout__UpdatedByName || 'Someone'} has saved it since: Save as New keeps yours as a drawing of its own`
                : lost
                    ? `Recovered ${name}. The saved drawing it changed has been deleted: Save Layout keeps it as a new one`
                    : `Recovered ${name}: save it to keep it on the Vale Cloud`);
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Throw a Copy Away (Asked First: It Cannot Be Got Back)
        // ------------------------------------------------------------
        const discard = async (draft) => {
            const when = Na__PageLayout__SavedList__FormatIso(draft.Draft__SavedIso);
            const go   = window.confirm(`Discard the unsaved copy of ${draft.Draft__Name || 'this drawing'}${when ? ' from ' + when : ''}?\n\nIt is only on this computer and cannot be recovered after this.`);
            if (!go) return;
            await Na__PageLayout__Recovery__Remove(draft.Draft__Id);
            render();
        };
        // ------------------------------------------------------------


        // Keep the copy current
        // ------------------------------------------------------------
        Na__PageLayout__On('changed', () => { viewOnly = false; writeSoon(); });   // <-- A real change: worth recovering from here on
        Na__PageLayout__On('history', writeSoon);
        Na__PageLayout__On('image',   writeSoon);
        Na__PageLayout__On('layout',  (detail) => {
            if (detail.opened) viewOnly = !!detail.version && detail.recovered !== true;   // <-- Viewing an exported version is not unsaved work
            if (detail.saved || detail.deleted) viewOnly = false;
            if (detail.saved || detail.deleted || detail.opened) writeNow();   // <-- Saved, deleted or opened: keep or drop the copy now
            else writeSoon();
        });
        Na__PageLayout__On('user', () => { writeSoon(); render(); });
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && timer) writeNow(); });
        window.addEventListener('pagehide', () => { if (timer) writeNow(); });

        // First look: tidy, then offer what was left behind
        // ------------------------------------------------------------
        Na__PageLayout__Recovery__Prune({ keepDays : cfg.keepDays, keepPerJob : cfg.keepPerJob, keepAll : cfg.keepAll }, [draftId()])
            .then(() => render())
            .then((drafts) => {
                if (!drafts || !drafts.length) return;
                const section = document.getElementById(Na__PageLayout__RecoveryUi__IDS.section);
                if (section && !state.viewportImage) section.open = true;   // <-- Nothing on the sheet: show them straight away
                Na__PageLayout__Toast(drafts.length === 1
                    ? `An unsaved drawing from ${Na__PageLayout__SavedList__FormatIso(drafts[0].Draft__SavedIso)} is kept on this computer: Recover it from Saved Layouts`
                    : `${drafts.length} unsaved drawings are kept on this computer: Recover them from Saved Layouts`);
            });
        if (shouldKeep()) writeSoon();                                      // <-- A new picture from Create Drawing: kept from the start
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Recovery Drafts Controls API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__InitRecoveryDrafts
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
