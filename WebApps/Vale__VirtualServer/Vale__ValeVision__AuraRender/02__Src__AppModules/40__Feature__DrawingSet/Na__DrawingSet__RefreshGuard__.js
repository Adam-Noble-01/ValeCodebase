// =============================================================================
// VALEVISION AURA - DRAWING SET - THE REFRESH GUARD
// =============================================================================
//
// FILE       : Na__DrawingSet__RefreshGuard__.js
// NAMESPACE  : Na__RefreshGuard
// MODULE     : Drawing Set - Refresh Guard
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Ctrl + R (Ctrl + Shift + R, Cmd + R, F5) asks first: save the
//              drawing set and refresh, cancel the refresh, or refresh and
//              abandon the changes
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - Adam, 30-Oct-2026: "add a guard modal that pops up if you hit control + r
//   warning you will lose progress if you refresh would you like to save /
//   cancel refresh/ abandon the changes". It shows on every refresh key, saved
//   or not (his call), and says which: unsaved changes, or nothing to lose.
// - SAVE AND REFRESH is the autosave's own save (Na__Persistence__Save), at
//   once; the page refreshes only once it is saved. A refused save (someone
//   else saved first, the project switched off) keeps the guard up, and the
//   save's own message says why.
// - THE BROWSER'S RELOAD BUTTON and closing the tab cannot be given a page's
//   own modal: there the persistence module's beforeunload asks, the browser's
//   own "Leave site?", and only with unsaved changes.
// - The refresh keys are taken in the capture phase, from anywhere on the page,
//   a text box included: a refresh from a box loses the work just the same.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0 (AURA 0.2.2)
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppState__Data } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Dom__El } from '../03__AppUtils/Na__AppUtils__Dom__.js';
    import { Na__Persistence__Save } from './Na__DrawingSet__Persistence__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__RefreshGuard__State = {
        started : false,
        dialog  : null                           // <-- The guard while it is open
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Guard
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether a Key Press Is a Refresh
    // ------------------------------------------------------------
    function Na__RefreshGuard__IsRefresh(e) {
        if (e.key === 'F5') return true;
        return (e.ctrlKey || e.metaKey) && !e.altKey && (e.key || '').toLowerCase() === 'r';
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the Guard: save and refresh, cancel, or abandon and refresh
    // ------------------------------------------------------------
    function Na__RefreshGuard__Open() {
        const S = Na__RefreshGuard__State;
        if (S.dialog) return;
        const d = Na__AppState__Data;
        const unsaved = !!d.dirty;
        const canSave = !!(d.doc && d.project);

        const dialog = Na__Dom__El('dialog', 'aura-dialog', null, { 'aria-labelledby': 'auraRefreshGuardTitle' });
        const body = Na__Dom__El('div', 'aura-dialog__body');
        body.appendChild(Na__Dom__El('h2', 'aura-dialog__title', 'Refresh the page?', { id: 'auraRefreshGuardTitle' }));
        const say = Na__Dom__El('p', 'aura-panel__note', unsaved
            ? 'This drawing set has changes that are not saved yet. Refreshing now loses them.'
            : 'Everything is saved: refreshing loses nothing.');
        body.appendChild(say);

        const actions = Na__Dom__El('div', 'aura-dialog__actions');
        const abandon = Na__Dom__El('button', 'aura-button aura-button--danger', unsaved ? 'Abandon changes' : 'Refresh', { type: 'button', title: 'Refresh without saving' });
        const cancel = Na__Dom__El('button', 'aura-button', 'Cancel refresh', { type: 'button' });
        const save = Na__Dom__El('button', 'aura-button aura-button--primary', 'Save and refresh', { type: 'button' });
        save.disabled = !canSave;
        actions.appendChild(abandon);
        actions.appendChild(cancel);
        actions.appendChild(save);
        body.appendChild(actions);
        dialog.appendChild(body);

        const busy = (on) => { [abandon, cancel, save].forEach((b) => { b.disabled = on || (b === save && !canSave); }); };
        abandon.addEventListener('click', () => {
            d.dirty = false;                                                     // <-- Abandoned: nothing left for the browser's own warning to ask about
            window.location.reload();
        });
        cancel.addEventListener('click', () => dialog.close());
        save.addEventListener('click', async () => {
            busy(true);
            say.textContent = 'Saving...';
            const ok = await Na__Persistence__Save();
            if (ok) { window.location.reload(); return; }
            say.textContent = 'Not saved: see the message at the top of the page. Cancel to keep working, or abandon the changes.';
            busy(false);
        });
        dialog.addEventListener('keydown', (e) => {
            if (!Na__RefreshGuard__IsRefresh(e)) e.stopPropagation();            // <-- The app's shortcuts wait while the guard is up
        });
        dialog.addEventListener('close', () => { dialog.remove(); S.dialog = null; });

        S.dialog = dialog;
        document.body.appendChild(dialog);
        dialog.showModal();
        (canSave ? save : cancel).focus();
    }
    // ------------------------------------------------------------


    // FUNCTION | Start: take the refresh keys from the browser, from now on
    // ------------------------------------------------------------
    function Na__RefreshGuard__Start() {
        const S = Na__RefreshGuard__State;
        if (S.started) return;
        S.started = true;
        window.addEventListener('keydown', (e) => {
            if (!Na__RefreshGuard__IsRefresh(e)) return;
            e.preventDefault();
            e.stopPropagation();
            Na__RefreshGuard__Open();
        }, true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__RefreshGuard__Start,
        Na__RefreshGuard__Open
    };

// endregion -------------------------------------------------------------------
