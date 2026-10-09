// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - UNSAVED DRAWING GUARD
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__UnsavedGuard__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Unsaved Guard
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Stop a drawing being closed without being saved: warn when the
//              tab or the browser is closed, and ask before the menu's Close
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - UNSAVED MEANS: a picture on the sheet, changes (or a new drawing) not yet on
//   the Vale Cloud, and someone here who could save it (a staff account, a
//   project). A client with no account is never asked: there is nothing they
//   could do about it.
// - CLOSING THE TAB OR THE BROWSER (Adam, 09-Oct-2026): the browser's own
//   "Leave site?" question appears. Browsers never let a page word that box, so
//   when someone chooses to stay, this page then shows its own: "Your drawing is
//   not saved", with Save Drawing, Keep Editing and Close Without Saving.
// - THE MENU'S CLOSE asks the page's own question straight away: Save and Close,
//   Keep Editing, Close Without Saving. Esc or a click outside keeps editing.
// - CLOSE WITHOUT SAVING is the deliberate way out: the guard stands aside for a
//   moment and the tab closes (a tab ValeVision 3D opened can close itself).
// - Saving goes through the Drawing Layout section's own save (SetSaver), so
//   its checks, its "Syncing..." and its Vale Cloud toast are the same.
// - INSIDE THE APP (ValeVision3D v2.76.0) the page is the app's Drawing Editor
//   page, not a tab:
//     The menu's button is Back to Model View. Nothing is lost by it (the
//     drawing stays open, put away), so it asks nothing.
//     A new drawing replacing this one is asked about by the app (Create
//     Drawing), which saves through SaveNow and lets the page go with
//     StandAside.
//     Closing ValeVision 3D, or leaving it, still brings the browser's own
//     question; the page's own follows only while the page is on screen.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.76.0)
// - Inside the app: RequestClose goes back to the Model View; SaveNow and
//   StandAside for the app's Create Drawing; the stayed question waits for the
//   page to be on screen.
//
// 09-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.75.2).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Who May Save, the Toast
    // ------------------------------------------------------------
    import { Na__PageLayout__CanSave } from './Na__PageLayoutSystem__UserSession__.js';
    import { Na__PageLayout__Toast } from './Na__PageLayoutSystem__UiNotify__.js';
    import { Na__PageLayout__Host__BackToModel, Na__PageLayout__Host__IsShown } from './Na__PageLayoutSystem__Host__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Ids, Timing
    // ------------------------------------------------------------
    const Na__PageLayout__Guard__IDS = Object.freeze({
        dialog  : 'naLayoutUnsavedDialog',
        title   : 'naLayoutUnsavedTitle',
        message : 'naLayoutUnsavedMessage',
        save    : 'naLayoutUnsavedSave',
        keep    : 'naLayoutUnsavedKeep',
        discard : 'naLayoutUnsavedDiscard'
    });
    const Na__PageLayout__Guard__BYPASS_MS = 1500;                          // <-- How long Close Without Saving stands the guard aside
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Two Ways the Question Is Asked
    // ------------------------------------------------------------
    const Na__PageLayout__Guard__WORDS = Object.freeze({
        close  : {                                                          // <-- The menu's Close
            title   : 'Save your drawing before closing?',
            message : 'This drawing has not been saved to the Vale Cloud. If you close now, it will be lost.',
            save    : 'Save and Close'
        },
        stayed : {                                                          // <-- After the browser's own "Leave site?", answered Stay
            title   : 'Your drawing is not saved',
            message : 'Save it to the Vale Cloud before you close, or it will be lost.',
            save    : 'Save Drawing'
        }
    });
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Page, the Save, the Dialog's Mode
    // ------------------------------------------------------------
    let Na__PageLayout__Guard__State  = null;
    let Na__PageLayout__Guard__Saver  = null;                               // <-- () => Promise<boolean>: true once the Vale Cloud has it
    let Na__PageLayout__Guard__Mode   = null;                               // <-- 'close' | 'stayed' while the dialog is up
    let Na__PageLayout__Guard__Bypass = false;                              // <-- Close Without Saving: let the tab go
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Element by Id
    // ------------------------------------------------------------
    function Na__PageLayout__Guard__El(key) {
        return document.getElementById(Na__PageLayout__Guard__IDS[key]);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Close the Tab Now, Without Asking (Toast If the Browser Will Not)
    // ------------------------------------------------------------
    function Na__PageLayout__Guard__CloseTab(saved) {
        Na__PageLayout__Guard__Bypass = true;
        setTimeout(() => { Na__PageLayout__Guard__Bypass = false; }, Na__PageLayout__Guard__BYPASS_MS);
        window.close();
        setTimeout(() => {
            if (!window.closed) {
                Na__PageLayout__Toast(saved
                    ? 'Saved. Close this tab from the browser (it was not opened by ValeVision 3D)'
                    : 'Close this tab from the browser (it was not opened by ValeVision 3D)');
            }
        }, 300);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Is There a Drawing Here Someone Could Lose by Closing?
    // ------------------------------------------------------------
    function Na__PageLayout__UnsavedGuard__IsUnsaved() {
        const state = Na__PageLayout__Guard__State;
        return !!state && state.layout.dirty === true && !!state.viewportImage
            && !!(state.project && state.project.id) && Na__PageLayout__CanSave();
    }
    // ------------------------------------------------------------


    // FUNCTION | Hand the Guard the Page's Save (the Drawing Layout Section's)
    // ------------------------------------------------------------
    function Na__PageLayout__UnsavedGuard__SetSaver(saver) {
        Na__PageLayout__Guard__Saver = (typeof saver === 'function') ? saver : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Question (mode 'close' or 'stayed')
    // ------------------------------------------------------------
    function Na__PageLayout__UnsavedGuard__Ask(mode) {
        const dialog = Na__PageLayout__Guard__El('dialog');
        if (!dialog) return;
        const words = Na__PageLayout__Guard__WORDS[mode] || Na__PageLayout__Guard__WORDS.stayed;
        Na__PageLayout__Guard__Mode = mode;

        const title   = Na__PageLayout__Guard__El('title');
        const message = Na__PageLayout__Guard__El('message');
        const save    = Na__PageLayout__Guard__El('save');
        if (title)   title.textContent   = words.title;
        if (message) message.textContent = words.message;
        if (save) {
            save.textContent = words.save;
            save.disabled    = false;
        }
        dialog.hidden = false;
        if (save) save.focus();
    }
    // ------------------------------------------------------------


    // FUNCTION | Put the Question Away (Keep Editing)
    // ------------------------------------------------------------
    function Na__PageLayout__UnsavedGuard__Dismiss() {
        const dialog = Na__PageLayout__Guard__El('dialog');
        if (dialog) dialog.hidden = true;
        Na__PageLayout__Guard__Mode = null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Now, Through the Drawing Layout Section's Save (Promise<boolean>)
    // ------------------------------------------------------------
    // The app's Save and Start New: true once the Vale Cloud has it.
    // ------------------------------------------------------------
    function Na__PageLayout__UnsavedGuard__SaveNow() {
        if (!Na__PageLayout__Guard__Saver) return Promise.resolve(false);
        try {
            return Promise.resolve(Na__PageLayout__Guard__Saver()).then((saved) => saved === true, () => false);
        } catch (error) {
            return Promise.resolve(false);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Stand Aside for Good: the Page Is About to Be Replaced (Already Asked)
    // ------------------------------------------------------------
    function Na__PageLayout__UnsavedGuard__StandAside() {
        Na__PageLayout__UnsavedGuard__Dismiss();
        Na__PageLayout__Guard__Bypass = true;                               // <-- Never cleared: this page is going
    }
    // ------------------------------------------------------------


    // FUNCTION | The Menu's Close: Ask First When the Drawing Is Not Saved
    // ------------------------------------------------------------
    // Inside the app the button is Back to Model View: the drawing stays open,
    // so nothing is asked.
    // ------------------------------------------------------------
    function Na__PageLayout__UnsavedGuard__RequestClose() {
        if (Na__PageLayout__Host__BackToModel()) return;
        if (Na__PageLayout__UnsavedGuard__IsUnsaved()) {
            Na__PageLayout__UnsavedGuard__Ask('close');
            return;
        }
        Na__PageLayout__Guard__CloseTab(false);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Unsaved Guard Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Guard: the Close Warning and the Dialog's Buttons
    // ------------------------------------------------------------
    function Na__PageLayout__InitUnsavedGuard(state) {
        Na__PageLayout__Guard__State = state || null;


        // TAB OR BROWSER CLOSING | The browser's own question; if they stay, the page's
        // ------------------------------------------------------------
        window.addEventListener('beforeunload', (event) => {
            if (Na__PageLayout__Guard__Bypass || !Na__PageLayout__UnsavedGuard__IsUnsaved()) return;
            event.preventDefault();
            event.returnValue = '';                                         // <-- The browser's "Leave site?" (its words, not ours)
            setTimeout(() => {                                              // <-- Runs only when they choose to stay
                if (Na__PageLayout__UnsavedGuard__IsUnsaved() && Na__PageLayout__Host__IsShown()) Na__PageLayout__UnsavedGuard__Ask('stayed');   // <-- Put away behind the Model View: the browser's question was enough
            }, 0);
        });


        // THE DIALOG'S BUTTONS
        // ------------------------------------------------------------
        const save    = Na__PageLayout__Guard__El('save');
        const keep    = Na__PageLayout__Guard__El('keep');
        const discard = Na__PageLayout__Guard__El('discard');
        const dialog  = Na__PageLayout__Guard__El('dialog');

        if (save) {
            save.addEventListener('click', async () => {
                const closing = Na__PageLayout__Guard__Mode === 'close';
                if (!Na__PageLayout__Guard__Saver) {
                    Na__PageLayout__Toast('The drawing cannot be saved from here: use Save Drawing in the menu', true);
                    return;
                }
                save.disabled    = true;
                save.textContent = 'Syncing to the Vale Cloud...';
                let saved = false;
                try {
                    saved = await Na__PageLayout__Guard__Saver();           // <-- Its own toasts say how it went
                } finally {
                    Na__PageLayout__UnsavedGuard__Dismiss();
                }
                if (saved && closing) Na__PageLayout__Guard__CloseTab(true);
            });
        }
        if (keep) keep.addEventListener('click', () => Na__PageLayout__UnsavedGuard__Dismiss());
        if (discard) {
            discard.addEventListener('click', () => {
                Na__PageLayout__UnsavedGuard__Dismiss();
                Na__PageLayout__Guard__CloseTab(false);                     // <-- Their choice: close without saving
            });
        }
        if (dialog) {
            dialog.addEventListener('click', (event) => {
                if (event.target && event.target.hasAttribute('data-dialog-dismiss')) Na__PageLayout__UnsavedGuard__Dismiss();
            });
        }
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && Na__PageLayout__Guard__Mode) Na__PageLayout__UnsavedGuard__Dismiss();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Unsaved Guard API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__InitUnsavedGuard,
        Na__PageLayout__UnsavedGuard__IsUnsaved,
        Na__PageLayout__UnsavedGuard__SetSaver,
        Na__PageLayout__UnsavedGuard__Ask,
        Na__PageLayout__UnsavedGuard__Dismiss,
        Na__PageLayout__UnsavedGuard__SaveNow,
        Na__PageLayout__UnsavedGuard__StandAside,
        Na__PageLayout__UnsavedGuard__RequestClose
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
