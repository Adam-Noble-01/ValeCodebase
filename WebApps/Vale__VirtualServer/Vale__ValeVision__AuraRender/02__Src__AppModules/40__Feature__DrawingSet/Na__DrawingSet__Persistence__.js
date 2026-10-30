// =============================================================================
// VALEVISION AURA - DRAWING SET - SAVING AND LOADING
// =============================================================================
//
// FILE       : Na__DrawingSet__Persistence__.js
// NAMESPACE  : Na__Persistence
// MODULE     : Drawing Set - Persistence
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Load a project's drawing set from the AURA API, and save it a
//              moment after every edit, without ever overwriting someone else's
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - LOAD: GET api/projects/<id>/drawings answers the set (or none yet: a new set
//   with the demo sheet is made here, and saved on the first edit) and its _rev.
// - SAVE: PUT the whole set with the _rev it was loaded at, a pause after the
//   last edit (AuraConfig__Save__AutosaveDelayMs). The API keeps the previous
//   copy as a revision in the project (ValeShared__Library__ WriteJson).
// - SOMEONE ELSE SAVED FIRST (409): nothing is overwritten. The page says so and
//   offers to load theirs; this page's edits stay on screen until then.
// - SWITCHED OFF WHILE OPEN (403, notSwitchedOn: the project was unticked in the
//   Gallery's Project Editor): saving stops and the page says so, once.
// - Leaving with unsaved edits asks first (the browser's own question).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.1.0
// - A project switched off for AURA while open stops saving, as a 409 does,
//   instead of failing again on every edit.
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    import { Na__AppConfig__Get } from '../01__AppCore/Na__AppCore__AppConfig__.js';
    import { Na__AppState__Data, Na__AppState__On, Na__AppState__Emit } from '../01__AppCore/Na__AppCore__AppState__.js';
    import { Na__Api__Get, Na__Api__Put } from '../03__AppUtils/Na__AppUtils__ApiClient__.js';
    import { Na__Toast__Show } from '../03__AppUtils/Na__AppUtils__Toast__.js';
    import { Na__DrawingSet__New, Na__DrawingSet__Normalise } from './Na__DrawingSet__Model__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__Persistence__State = {
        timer     : 0,
        saving    : false,
        again     : false,                       // <-- An edit arrived while saving: save once more after
        conflict  : false,                       // <-- Someone else saved first, or the project was switched off: saving stops until reloaded
        onState   : null                         // <-- (text, kind) => {}: the header's save state
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Load
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Project's Drawing Set (a new one when it has none yet)
    // ------------------------------------------------------------
    async function Na__Persistence__Load(project, user) {
        const answer = await Na__Api__Get(`projects/${encodeURIComponent(project.id)}/drawings`);
        const d = Na__AppState__Data;
        if (answer.drawings) {
            d.doc = Na__DrawingSet__Normalise(answer.drawings, project);
            d.rev = Number(answer.drawings._rev) || 0;
        } else {
            d.doc = Na__DrawingSet__New(project, user);
            d.rev = 0;
        }
        d.dirty = false;
        Na__Persistence__State.conflict = false;
        Na__Persistence__Say(answer.drawings ? 'Saved' : 'New drawing set', 'saved');
        return d.doc;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Save
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Tell the Header How the Saving Stands
    // ------------------------------------------------------------
    function Na__Persistence__Say(text, kind) {
        if (Na__Persistence__State.onState) Na__Persistence__State.onState(text, kind);
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Now (the autosave calls this; so can a button)
    // ------------------------------------------------------------
    async function Na__Persistence__Save() {
        const S = Na__Persistence__State;
        const d = Na__AppState__Data;
        clearTimeout(S.timer);
        if (!d.doc || !d.project || S.conflict) return false;
        if (S.saving) { S.again = true; return false; }
        S.saving = true;
        d.dirty = false;
        Na__Persistence__Say('Saving...', 'saving');
        try {
            const doc = d.doc;
            doc.AuraDrawingSet__Meta.UpdatedIso = new Date().toISOString();
            doc.AuraDrawingSet__Meta.UpdatedBy = d.user ? d.user.code : '';
            const body = Object.assign({}, doc, { _rev: d.rev });
            const size = JSON.stringify(body).length;
            if (size > Na__AppConfig__Get('Save__MaxBytes', 4194304)) throw new Error(`The drawing set is too large to save (${Math.round(size / 1024)} KB).`);
            const answer = await Na__Api__Put(`projects/${encodeURIComponent(d.project.id)}/drawings`, body);
            d.rev = Number(answer.rev) || d.rev + 1;
            Na__Persistence__Say('Saved', 'saved');
            Na__AppState__Emit('saved', d.rev);
        } catch (error) {
            d.dirty = true;
            if (error.status === 409) {
                S.conflict = true;
                Na__Persistence__Say('Not saved: someone else saved first', 'error');
                Na__Toast__Show('Someone else saved this drawing set while you were working. Your changes are still on screen but are not saved.', {
                    error : true,
                    ms    : 15000,
                    action: { label: 'Load theirs', onClick: () => window.location.reload() }
                });
            } else if (error.status === 403 && error.data && error.data.notSwitchedOn) {
                S.conflict = true;                                           // <-- Unticked in the Project Editor: no point trying again
                Na__Persistence__Say('Not saved: switched off for AURA', 'error');
                Na__Toast__Show('This project was switched off for AURA in ValeVision Gallery while you were working. Your changes are still on screen but are not saved.', {
                    error : true,
                    ms    : 15000
                });
            } else {
                Na__Persistence__Say('Not saved', 'error');
                Na__Toast__Show(`The drawing set could not be saved: ${error.message}`, { error: true });
            }
        } finally {
            S.saving = false;
            if (S.again && !S.conflict) { S.again = false; Na__Persistence__Schedule(); }
        }
        return !d.dirty;
    }
    // ------------------------------------------------------------


    // FUNCTION | Save a Moment After the Last Edit
    // ------------------------------------------------------------
    function Na__Persistence__Schedule() {
        const S = Na__Persistence__State;
        if (S.conflict) return;
        clearTimeout(S.timer);
        Na__Persistence__Say('Unsaved changes', 'dirty');
        S.timer = setTimeout(() => { Na__Persistence__Save(); }, Na__AppConfig__Get('Save__AutosaveDelayMs', 2000));
    }
    // ------------------------------------------------------------


    // FUNCTION | Start: save after edits, ask before leaving with unsaved ones; onState(text, kind)
    // ------------------------------------------------------------
    function Na__Persistence__Start(onState) {
        Na__Persistence__State.onState = onState || null;
        Na__AppState__On('changed', () => Na__Persistence__Schedule());
        window.addEventListener('beforeunload', (e) => {
            if (!Na__AppState__Data.dirty) return;
            e.preventDefault();
            e.returnValue = '';
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Persistence__Load,
        Na__Persistence__Save,
        Na__Persistence__Schedule,
        Na__Persistence__Start
    };

// endregion -------------------------------------------------------------------
