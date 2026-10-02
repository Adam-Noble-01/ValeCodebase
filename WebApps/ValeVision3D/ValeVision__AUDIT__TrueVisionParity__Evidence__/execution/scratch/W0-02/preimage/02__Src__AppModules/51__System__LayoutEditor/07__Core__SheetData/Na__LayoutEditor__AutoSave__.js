// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - AUTO SAVE
// =============================================================================
//
// FILE       : Na__LayoutEditor__AutoSave__.js
// NAMESPACE  : Na__LeAuto
// MODULE     : Layout Editor - Auto Save
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Keep sheets from being lost: a browser draft of every change, a project save of its own when a sheet is created, renamed, reordered or deleted, and a question before the window closes on unsaved work
// CREATED    : 10-Sep-2026
//
// DESCRIPTION:
// - DRAFT. Every announced change writes the sheet records to localStorage
//   under the project code. On the next project load a draft that differs
//   from what the project supplied is put back, the model is marked dirty
//   and a toast says so. A successful save clears the draft, so a draft only
//   ever exists while something is unsaved.
// - AUTO SAVE. A structural change (a sheet created, renamed, reordered or
//   deleted, or its paper or title block changed) schedules a project save
//   a short debounce later, on localhost only (the web build is read-only).
//   Content edits (viewports, text, dimensions) stay with the Save Sheets
//   button and the draft, so a drag session never writes the project
//   between moves.
// - The save path is the one Save Sheets uses: Na__LeModel__Save through
//   Na__DrawView__ProjectData__. Only a failure shows a toast; a save that
//   worked clears the Save button's attention state through the model.
// - CLOSE GUARD. While anything is unsaved - sheets not yet written to the
//   project, or a specification not yet synced - closing the window, closing
//   the tab or reloading asks the browser's own leave-site question first.
//   The draft is flushed as the question goes up, so the answer decides
//   whether the work is picked up now or on the next load, never whether it
//   survives. Editable sessions only: a read-only viewer has nothing to lose.
//
// INTEGRATION:
// - Initialised by the mode controller with the app toast and the editable
//   flag; listens to the sheet model and to the drawings data events.
// - Reads the specification's dirty flag straight from its document unit, so
//   the one guard covers both halves of the editor.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none originally; the close guard came FROM TrueVision3D
//                   v2.67.0 51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__AutoSave__.js
// - Ported on     : 10-Sep-2026 for ValeVision3D v2.21.7 (port Phase 5);
//                   close guard 19-Sep-2026 for ValeVision3D v2.44.0
// - Parity        : close guard verbatim
// - Divergences   : TrueVision also publishes window.TrueVision__Pwa__HasUnsavedWork
//                   so its PWA service worker registrar holds an automatic update
//                   reload back while work is unsaved. ValeVision has no service
//                   worker and nothing to reload the page by itself, so there is
//                   no reader for that flag and it is not published here.
//                   Na__LeAuto__HasUnsavedWork is exported all the same, so a
//                   registrar arriving later needs no change in this module.
//                 : This module is still at TrueVision's v1.1.0 for the auto save
//                   itself - TrueVision's v1.2.0, which judges an undo or redo by
//                   the step it reverses rather than saving on every Ctrl+Z, has
//                   not been ported. Unrelated to the guard, but it is the next
//                   thing this file wants.
// - Back-port     : n/a for the guard (this IS the port).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 20-Sep-2026 - Version 1.3.0
// - An undo or redo is saved only when the step it reverses or replays was a
//   structural one: Na__LeAuto__CallsForSave reads the restore detail that
//   Na__LeModel__AnnounceRestore puts on the announcement. Before this every
//   Ctrl+Z and Ctrl+Y arrived as a plain sheet update and wrote the whole
//   project to R2 1.5 s later, whatever it undid.
// - Ported from TrueVision3D v2.30.1 (AutoSave 1.2.0). This closes the open
//   row in the parity ledger's pending return trip.
//
// 19-Sep-2026 - Version 1.2.0
// - CLOSE GUARD, ported from TrueVision3D v2.67.0. A beforeunload handler asks
//   the browser's leave-site question while sheets are unsaved or the
//   specification is unsynced. Content edits - viewports, text, dimensions,
//   vectors - never auto save, so the editor could hold an hour of work that
//   only the Save Sheets button would write, and Ctrl+W or the window's close
//   button took it with no question asked.
// - The draft is flushed before the question goes up rather than waiting for
//   pagehide. pagehide is not guaranteed on an abnormal close, and it is the
//   only reason the draft existed at all on that path.
//
// 13-Sep-2026 - Version 1.1.0
// - The browser draft is written DraftDebounceMs after the editing pauses rather
//   than inside every change. It is a synchronous disk write of every sheet, so
//   doing it per click stalled the editor. Flushed when the tab is hidden or
//   closed; a queued write is dropped when a new project loads. Ported from
//   TrueVision.
//
// 10-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Sheet Model, Drawings Data
    // ------------------------------------------------------------
    import { Na__LeCfg__GetAutoSaveSetup, Na__LeCfg__GetLabel } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';
    import {
        Na__LeModel__CHANGED_EVENT,
        Na__LeModel__GetSheets,
        Na__LeModel__RestoreSheets,
        Na__LeModel__IsDirty,
        Na__LeModel__Save
    } from './Na__LayoutEditor__SheetModel__.js';
    import { Na__DrawData__CHANGED_EVENT, Na__DrawData__GetProjectCode } from '../../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Specification Document (the close guard's second half)
    // ------------------------------------------------------------
    // Straight from the document unit, not the barrel: that unit reads the
    // config and the R2 client and nothing else, so the sheet side of the
    // editor does not take the specification's transport with it.
    // ------------------------------------------------------------
    import { Na__LeSpec__IsDirty } from '../50__Feature__Specification/Na__LayoutEditor__SpecData__Document__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Storage Key and the Reasons That Matter
    // ------------------------------------------------------------
    const Na__LeAuto__DRAFT_PREFIX = 'Na__LayoutEditor__Draft__';
    const Na__LeAuto__STRUCTURAL   = [ 'sheet-created', 'sheet-deleted', 'sheet-updated', 'sheet-reordered' ];
    const Na__LeAuto__IGNORED      = [ 'loaded', 'saved', 'active', 'selection' ];
    // ------------------------------------------------------------

    // MODULE VARIABLES | Timer, In-Flight Save and Guards
    // ------------------------------------------------------------
    let Na__LeAuto__ShowToast = null;
    let Na__LeAuto__Editable  = false;
    let Na__LeAuto__Timer     = null;
    let Na__LeAuto__DraftTimer = null;     // <-- The browser draft waits for a pause in the editing
    let Na__LeAuto__Saving    = false;
    let Na__LeAuto__Again     = false;     // <-- A structural change arrived while a save was in flight
    let Na__LeAuto__Restoring = false;
    let Na__LeAuto__Ready     = false;
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Close Guard's Legacy Return Value
    // ------------------------------------------------------------
    // Every current browser shows its own wording and ignores this string. It
    // is set because the older browsers that DID read it treat an empty
    // returnValue as "no question", and a guard that silently does nothing on
    // one browser is worse than no guard at all.
    // ------------------------------------------------------------
    const Na__LeAuto__LEAVE_PROMPT = 'This drawing has changes that have not been saved to the project.';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Browser Draft
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Storage Key for the Open Project
    // ------------------------------------------------------------
    function Na__LeAuto__Key() {
        const code = Na__DrawData__GetProjectCode();
        return code ? Na__LeAuto__DRAFT_PREFIX + code : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Two Sheet Lists Hold the Same Records
    // ------------------------------------------------------------
    function Na__LeAuto__Same(a, b) {
        try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write, Read and Clear the Draft
    // ------------------------------------------------------------
    function Na__LeAuto__WriteDraft() {
        const key = Na__LeAuto__Key();
        if (!key || !Na__LeCfg__GetAutoSaveSetup().draftEnabled) return false;
        try { window.localStorage.setItem(key, JSON.stringify({ savedAt : Date.now(), sheets : Na__LeModel__GetSheets() })); return true; }
        catch (e) { return false; }                                              // <-- Private mode or a full store: the draft is a courtesy
    }
    function Na__LeAuto__ReadDraft() {
        const key = Na__LeAuto__Key();
        if (!key) return null;
        try {
            const raw = window.localStorage.getItem(key);
            const draft = raw ? JSON.parse(raw) : null;
            return (draft && Array.isArray(draft.sheets)) ? draft : null;
        } catch (e) { return null; }
    }
    function Na__LeAuto__ClearDraft() {
        const key = Na__LeAuto__Key();
        if (!key) return;
        try { window.localStorage.removeItem(key); } catch (e) { /* nothing to clear */ }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write the Draft Once the Editing Pauses
    // ------------------------------------------------------------
    // THIS USED TO RUN ON EVERY CHANGE, INSIDE THE CLICK. It stringifies every
    // sheet in the project and hands the lot to localStorage, which is a
    // synchronous disk write on the main thread - so each delete, each style
    // paint and each nudge waited on the disk before the browser could paint
    // the result. On a project with a few full sheets that is the difference
    // between an editor that answers and one that stutters.
    //
    // The draft is crash insurance, not a save. Written a moment after the
    // last change it protects exactly as much work, and it is flushed when the
    // tab is hidden or closed so leaving the page never loses the last edit.
    // ------------------------------------------------------------
    function Na__LeAuto__ScheduleDraft() {
        if (Na__LeAuto__DraftTimer) window.clearTimeout(Na__LeAuto__DraftTimer);
        Na__LeAuto__DraftTimer = window.setTimeout(() => {
            Na__LeAuto__DraftTimer = null;
            Na__LeAuto__WriteDraft();
        }, Na__LeCfg__GetAutoSaveSetup().draftDebounceMs);
    }
    function Na__LeAuto__FlushDraft() {
        if (!Na__LeAuto__DraftTimer) return false;
        window.clearTimeout(Na__LeAuto__DraftTimer);
        Na__LeAuto__DraftTimer = null;
        return Na__LeAuto__WriteDraft();
    }
    function Na__LeAuto__DropDraftWrite() {
        if (Na__LeAuto__DraftTimer) window.clearTimeout(Na__LeAuto__DraftTimer);
        Na__LeAuto__DraftTimer = null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | On a Project Load, Put an Unsaved Draft Back
    // ------------------------------------------------------------
    function Na__LeAuto__RestoreDraft() {
        if (Na__LeAuto__Restoring || !Na__LeCfg__GetAutoSaveSetup().draftEnabled) return false;
        const draft = Na__LeAuto__ReadDraft();
        if (!draft || Na__LeAuto__Same(draft.sheets, Na__LeModel__GetSheets())) return false;
        Na__LeAuto__Restoring = true;
        try { Na__LeModel__RestoreSheets(draft.sheets); }
        finally { Na__LeAuto__Restoring = false; }
        if (typeof Na__LeAuto__ShowToast === 'function') Na__LeAuto__ShowToast(Na__LeCfg__GetLabel('DraftRestored', 'Unsaved sheet changes from this browser were restored. Save Sheets keeps them.'), false);
        console.log('[ValeVision3D] Layout Editor: unsaved sheet draft restored from this browser.');
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Automatic Project Save
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Save Now, Once, and Again if Something Arrived Meanwhile
    // ------------------------------------------------------------
    async function Na__LeAuto__Run() {
        Na__LeAuto__Timer = null;
        if (Na__LeAuto__Saving) { Na__LeAuto__Again = true; return; }
        if (!Na__LeModel__IsDirty()) return;
        Na__LeAuto__Saving = true;
        try {
            await Na__LeModel__Save((message, isError) => { if (isError && typeof Na__LeAuto__ShowToast === 'function') Na__LeAuto__ShowToast(message, true); });
        } finally {
            Na__LeAuto__Saving = false;
            if (Na__LeAuto__Again) { Na__LeAuto__Again = false; Na__LeAuto__Schedule(); }
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Schedule a Save a Debounce After the Last Structural Change
    // ------------------------------------------------------------
    function Na__LeAuto__Schedule() {
        if (Na__LeAuto__Timer) window.clearTimeout(Na__LeAuto__Timer);
        Na__LeAuto__Timer = window.setTimeout(() => { void Na__LeAuto__Run(); }, Na__LeCfg__GetAutoSaveSetup().debounceMs);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Does a Change Call for a Project Save
    // ------------------------------------------------------------
    // A restore - an undo or a redo - is announced as a sheet update, because
    // for drawing purposes that is what it is. For saving it is not: it is one
    // step reversed or replayed, so it is judged by that step's own reason.
    // Without this every Ctrl+Z wrote the whole project to R2, including the
    // undo of a vector delete that had never written anything itself.
    // ------------------------------------------------------------
    function Na__LeAuto__CallsForSave(detail) {
        const restore = detail.restore;
        const reason  = restore ? restore.stepReason : detail.reason;
        return Na__LeAuto__STRUCTURAL.indexOf(reason || '') >= 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Model Change Arrives
    // ------------------------------------------------------------
    function Na__LeAuto__OnModelChanged(event) {
        const detail = event.detail || {};
        const reason = detail.reason || '';
        if (reason === 'loaded') { Na__LeAuto__DropDraftWrite(); Na__LeAuto__RestoreDraft(); return; }   // <-- A write still queued from the last project must not overwrite this one's draft
        if (Na__LeAuto__IGNORED.indexOf(reason) >= 0) return;
        Na__LeAuto__ScheduleDraft();
        if (Na__LeAuto__Editable && Na__LeCfg__GetAutoSaveSetup().enabled && Na__LeAuto__CallsForSave(detail)) Na__LeAuto__Schedule();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Save Landed: the Draft Has Nothing Left to Protect
    // ------------------------------------------------------------
    function Na__LeAuto__OnDrawingsData(event) {
        const reason = (event.detail && event.detail.reason) || '';
        if (reason !== 'saved') return;
        const draft = Na__LeAuto__ReadDraft();
        if (draft && Na__LeAuto__Same(draft.sheets, Na__LeModel__GetSheets())) Na__LeAuto__ClearDraft();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Close Guard
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Is There Work the Project Has Not Been Told About
    // ------------------------------------------------------------
    // The sheet flag first, because it is a flag: the specification's answer
    // stringifies its whole document.
    //
    // A read-only session is never asked. Its model cannot go dirty, but the
    // check is on editability rather than on that, because "nothing to save"
    // is the reason not to ask and the dirty flag is only its symptom.
    // ------------------------------------------------------------
    function Na__LeAuto__HasUnsavedWork() {
        if (!Na__LeAuto__Editable) return false;
        if (Na__LeModel__IsDirty()) return true;
        try { return Na__LeSpec__IsDirty(); } catch (e) { return false; }        // <-- The specification may never have loaded
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Window Is Closing: Save What Can Be Saved, Then Ask
    // ------------------------------------------------------------
    // WHAT THIS IS FOR. Content edits - viewports, text, dimensions, vectors -
    // do not auto save, by design: a drag session must not write the project
    // between moves. The cost of that is an editor that can hold a session's
    // work behind one button, and Ctrl+W, a middle-clicked tab and the window's
    // close button all took it without asking.
    //
    // THE DRAFT IS FLUSHED FIRST, and deliberately before the question rather
    // than on the pagehide that follows it. pagehide is the browser's promise,
    // not a guarantee - it is skipped on an abnormal close - and by the time
    // it would fire the decision has already been made. Flushing here means
    // the answer to the question decides when the work is picked up again,
    // not whether there is any.
    //
    // THE WORDING IS THE BROWSER'S. Chrome, Edge, Firefox and Safari all
    // replaced the custom message years ago, so there is nowhere to say
    // "your drawing has unsaved changes" - only somewhere to make it ask.
    // ------------------------------------------------------------
    function Na__LeAuto__OnBeforeUnload(event) {
        if (!Na__LeCfg__GetAutoSaveSetup().closeGuardEnabled) return undefined;
        if (!Na__LeAuto__HasUnsavedWork()) return undefined;                     // <-- Nothing at stake: leaving stays instant

        Na__LeAuto__FlushDraft();                                                // <-- Whatever the answer, the last edit is on disk before it is given

        event.preventDefault();                                                  // <-- The modern way to raise the question
        event.returnValue = Na__LeAuto__LEAVE_PROMPT;                            // <-- The old way, for a browser that still reads it
        return Na__LeAuto__LEAVE_PROMPT;                                         // <-- The older way still
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Listen to the Model and the Drawings Data (once)
    // ------------------------------------------------------------
    // options: { showToast, editable }
    // ------------------------------------------------------------
    function Na__LeAuto__Initialize(options) {
        Na__LeAuto__ShowToast = (options && options.showToast) || null;
        Na__LeAuto__Editable  = !!(options && options.editable);
        if (Na__LeAuto__Ready) return true;
        Na__LeAuto__Ready = true;
        window.addEventListener(Na__LeModel__CHANGED_EVENT, Na__LeAuto__OnModelChanged);
        window.addEventListener(Na__DrawData__CHANGED_EVENT, Na__LeAuto__OnDrawingsData);
        window.addEventListener('beforeunload', Na__LeAuto__OnBeforeUnload);                                      // <-- Unsaved work is asked about before the window goes
        window.addEventListener('pagehide', () => Na__LeAuto__FlushDraft());                                      // <-- Closing the tab keeps the last edit
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Na__LeAuto__FlushDraft(); });
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Now if a Save Is Pending
    // ------------------------------------------------------------
    function Na__LeAuto__Flush() {
        if (!Na__LeAuto__Timer) return false;
        window.clearTimeout(Na__LeAuto__Timer);
        Na__LeAuto__Timer = null;
        void Na__LeAuto__Run();
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Auto Save API
    // ------------------------------------------------------------
    export {
        Na__LeAuto__Initialize,
        Na__LeAuto__Flush,
        Na__LeAuto__HasUnsavedWork
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
