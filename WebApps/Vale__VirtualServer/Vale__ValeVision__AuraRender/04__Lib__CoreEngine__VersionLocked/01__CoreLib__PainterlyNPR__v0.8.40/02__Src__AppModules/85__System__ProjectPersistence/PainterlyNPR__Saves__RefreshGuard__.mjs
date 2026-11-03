/* =============================================================================
   PAINTERLYNPR - SYSTEM | PROJECT PERSISTENCE - REFRESH GUARD
   =============================================================================

   FILE       : PainterlyNPR__Saves__RefreshGuard__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : System - ProjectPersistence - RefreshGuard
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Ctrl + R (Ctrl + Shift + R, Cmd + R, F5) asks first: save under a
                name and refresh, cancel the refresh, or refresh and abandon the
                changes
   CREATED    : 30-Oct-2026 (v0.7.1)

   DESCRIPTION:
   - Adam, 30-Oct-2026: "add a guard modal that pops up if you hit control + r
     warning you will lose progress if you refresh would you like to save /
     cancel refresh/ abandon the changes". On every refresh key, saved or not
     (his call); it says whether anything would be lost.
   - UNSAVED is the settings object (everything a save holds) against the one
     last saved or loaded - or the drawing as it booted, before any of either.
   - SAVE AND REFRESH asks for a name, prefilled with the save box's or the last
     one used, and saves exactly as the Saves panel and Ctrl + S do (this
     browser, and the projects folder when served); the page refreshes only
     once it is saved.
   - THE BROWSER'S RELOAD BUTTON and closing the tab cannot be given a page's own
     modal: there beforeunload asks, the browser's own "Leave site?", and only
     with unsaved changes.
   - No import of the Saves module: Saves wires this one (Wire, its save, its
     name check and its box handed in) and reports its saves and loads
     (MarkSaved), so the pair never form a cycle.

   ============================================================================= */

import { PainterlyNPR__Interface__SettingsObject } from './PainterlyNPR__Interface__SettingsJson__.mjs';

// =============================================================================
// REGION | Project Persistence - Refresh Guard
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | State
// -----------------------------------------------------------------------------

    // MODULE STATE | The Guard
    // ------------------------------------------------------------
    const Guard  =  {
        Baseline :  null,                                                     // <-- The settings as last saved, loaded or booted (JSON)
        LastName :  '',                                                       // <-- The last name saved or loaded under
        Hooks    :  null,                                                     // <-- { Save(name) -> Promise<bool>, CleanName(text), NameNow() }
        Dialog   :  null,
        Leaving  :  false,                                                    // <-- The guard said refresh: no second warning on the way out
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | What Is Unsaved
// -----------------------------------------------------------------------------

    // FUNCTION | The Drawing Now, as a Save Would Hold It
    // ------------------------------------------------------------
    function PainterlyNPR__RefreshGuard__Snapshot() {
        try { return JSON.stringify(PainterlyNPR__Interface__SettingsObject()); }
        catch (error) { return ''; }
    }
    // ------------------------------------------------------------


    // FUNCTION | Saved or Loaded: this is the drawing nothing would be lost from
    // ------------------------------------------------------------
    function PainterlyNPR__RefreshGuard__MarkSaved(name) {
        Guard.Baseline  =  PainterlyNPR__RefreshGuard__Snapshot();
        if (name) Guard.LastName = name;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Refresh Would Lose Anything
    // ------------------------------------------------------------
    function PainterlyNPR__RefreshGuard__Unsaved() {
        return Guard.Baseline !== null && PainterlyNPR__RefreshGuard__Snapshot() !== Guard.Baseline;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Guard
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Whether a Key Press Is a Refresh
    // ------------------------------------------------------------
    function PainterlyNPR__RefreshGuard__IsRefresh(event) {
        if (event.key === 'F5') return true;
        return (event.ctrlKey || event.metaKey) && !event.altKey && (event.key || '').toLowerCase() === 'r';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Element, Its Class and Text
    // ------------------------------------------------------------
    function PainterlyNPR__RefreshGuard__El(tag, className, text) {
        const element  =  document.createElement(tag);
        if (className) element.className = className;
        if (text) element.textContent = text;
        return element;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refresh, Asking Nothing More
    // ------------------------------------------------------------
    function PainterlyNPR__RefreshGuard__Refresh() {
        Guard.Leaving  =  true;
        window.location.reload();
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the Guard: save and refresh, cancel, or abandon and refresh
    // ------------------------------------------------------------
    function PainterlyNPR__RefreshGuard__Open() {
        if (Guard.Dialog) return;
        const unsaved  =  PainterlyNPR__RefreshGuard__Unsaved();
        const hooks    =  Guard.Hooks;

        const dialog   =  PainterlyNPR__RefreshGuard__El('dialog', 'PainterlyNPR__Guard');
        dialog.setAttribute('aria-labelledby', 'PainterlyNPR__Guard__Title');
        const title    =  PainterlyNPR__RefreshGuard__El('h2', 'PainterlyNPR__Guard__Title', 'Refresh the page?');
        title.id  =  'PainterlyNPR__Guard__Title';
        const say      =  PainterlyNPR__RefreshGuard__El('p', 'PainterlyNPR__Guard__Text', unsaved
            ? 'This drawing has changes since it was last saved. Refreshing now loses them.'
            : 'Nothing has changed since the drawing was last saved: refreshing loses nothing.');
        const label    =  PainterlyNPR__RefreshGuard__El('label', 'PainterlyNPR__Guard__Label', 'Save as');
        const name     =  PainterlyNPR__RefreshGuard__El('input', 'PainterlyNPR__Guard__Name');
        name.type         =  'text';
        name.maxLength    =  80;
        name.placeholder  =  'Name this set-up';
        name.value        =  ((hooks && hooks.NameNow && hooks.NameNow()) || Guard.LastName || '').trim();
        label.appendChild(name);

        const actions  =  PainterlyNPR__RefreshGuard__El('div', 'PainterlyNPR__Guard__Actions');
        const abandon  =  PainterlyNPR__RefreshGuard__El('button', 'PainterlyNPR__Button PainterlyNPR__Guard__Abandon', unsaved ? 'Abandon changes' : 'Refresh');
        const cancel   =  PainterlyNPR__RefreshGuard__El('button', 'PainterlyNPR__Button', 'Cancel refresh');
        const save     =  PainterlyNPR__RefreshGuard__El('button', 'PainterlyNPR__Button PainterlyNPR__Guard__Save', 'Save and refresh');
        for (const button of [abandon, cancel, save]) { button.type = 'button'; actions.appendChild(button); }
        abandon.title  =  'Refresh without saving';
        save.disabled  =  !hooks;
        dialog.append(title, say, label, actions);

        const busy  =  (on) => { for (const button of [abandon, cancel, save]) button.disabled = on || (button === save && !hooks); name.disabled = on; };
        abandon.addEventListener('click', PainterlyNPR__RefreshGuard__Refresh);
        cancel.addEventListener('click', () => dialog.close());
        const saveThenRefresh  =  async () => {
            const clean  =  hooks.CleanName(name.value);
            if (!clean) { say.textContent = 'A name takes letters, digits, spaces, _ . and -, and starts with a letter or digit.'; name.focus(); return; }
            busy(true);
            say.textContent  =  `Saving "${clean}" ...`;
            const ok  =  await hooks.Save(clean);
            if (ok) { PainterlyNPR__RefreshGuard__Refresh(); return; }
            say.textContent  =  `"${clean}" was not saved (the Saves panel says why). Cancel to keep working, or abandon the changes.`;
            busy(false);
        };
        save.addEventListener('click', saveThenRefresh);
        name.addEventListener('keydown', (e) => { if (e.key === 'Enter' && hooks) { e.preventDefault(); saveThenRefresh(); } });
        dialog.addEventListener('keydown', (e) => { if (!PainterlyNPR__RefreshGuard__IsRefresh(e)) e.stopPropagation(); });   // <-- The sheet's shortcuts wait while the guard is up
        for (const type of ['pointerdown', 'click', 'contextmenu']) dialog.addEventListener(type, (e) => e.stopPropagation());
        dialog.addEventListener('close', () => { dialog.remove(); Guard.Dialog = null; });

        Guard.Dialog  =  dialog;
        document.body.appendChild(dialog);
        dialog.showModal();
        if (hooks && !name.value) name.focus();
        else (hooks ? save : cancel).focus();
    }
    // ------------------------------------------------------------


    // FUNCTION | Wire the Guard - once, from the Saves panel's Wire
    // ------------------------------------------------------------
    // hooks: { Save(name) -> Promise<bool>, CleanName(text), NameNow() }. The
    // drawing as it boots is the first "saved": taken once boot has finished,
    // after the panel, the drawer and the first controls have all settled.
    function PainterlyNPR__RefreshGuard__Wire(hooks) {
        if (Guard.Hooks) return;
        Guard.Hooks  =  hooks || null;
        setTimeout(() => { if (Guard.Baseline === null) PainterlyNPR__RefreshGuard__MarkSaved(); }, 0);
        window.addEventListener('keydown', (e) => {
            if (!PainterlyNPR__RefreshGuard__IsRefresh(e)) return;
            e.preventDefault();
            e.stopPropagation();
            PainterlyNPR__RefreshGuard__Open();
        }, true);
        window.addEventListener('beforeunload', (e) => {
            if (Guard.Leaving || !PainterlyNPR__RefreshGuard__Unsaved()) return;
            e.preventDefault();
            e.returnValue  =  '';                                             // <-- The browser's own "Leave site?": the reload button, closing the tab
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__RefreshGuard__MarkSaved,
        PainterlyNPR__RefreshGuard__Open,
        PainterlyNPR__RefreshGuard__Unsaved,
        PainterlyNPR__RefreshGuard__Wire,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
