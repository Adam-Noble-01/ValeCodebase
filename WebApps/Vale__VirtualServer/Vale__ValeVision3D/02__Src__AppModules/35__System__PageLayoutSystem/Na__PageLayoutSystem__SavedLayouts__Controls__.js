// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - SAVED LAYOUTS CONTROLS
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__SavedLayouts__Controls__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Saved Layouts Controls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The side menu's Drawing Layout section (name, save, save as new)
//              and Saved Layouts section (the job's layouts, open, delete)
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - DRAWING LAYOUT: the layout's name, who made it and who changed it last (the
//   server's stamps), whether the page has unsaved changes, Save Layout and
//   Save as New. Signed out, a note says why there is nothing to save with.
// - SAVED LAYOUTS: every layout of the job, last changed first, each with a
//   thumbnail of its sheet, who made it, who changed it last and when. Everyone
//   or Mine (made by me). Open puts it on the sheet; Delete is offered to its
//   creator and to Management and up (the server decides). Delete is final
//   (v2.76.2): the word delete has to be typed, then the server removes the
//   layout and every picture of it.
// - SOMEONE SAVED IT FIRST: a save built on an older copy is refused by the
//   server; the page offers to open their version, or to keep this one (Save as
//   New keeps it as a layout of its own).
// - SAVE DRAWING in the Export section is the same save as Save Layout / Save
//   Changes (Adam, 09-Oct-2026). It shows the drawing's state: a muted red "Save
//   Drawing" while it is not on the Vale Cloud, "Syncing to the Vale Cloud..."
//   while it saves, and a green "Drawing Saved" once the server has it (any change
//   turns it red again). A save the server has confirmed shows the green "Synced
//   to the Vale Cloud" toast with what was saved, to which job, and when.
// - Closing with an unsaved drawing is the Unsaved Guard's
//   (Na__PageLayoutSystem__UnsavedGuard__): this module hands it the save.
// - Opened from Saved Drawings (?open=saved), the list opens by itself.
// - THE CARDS ARE SHARED (v2.76.1): the list is drawn by
//   Na__PageLayoutSystem__SavedList__, which also draws it in ValeVision 3D's
//   Tools & Settings > Drawings. From there the app asks this page to open a
//   layout (OpenById, also ?layout=<id> when the page starts) and tells it when
//   one was deleted (Deleted): the open drawing then stays, as a new unsaved one.
// - EXPORTS SAVE A VERSION (v2.94.0): the export dialog (Na__PageLayoutSystem__ExportDialog__)
//   saves through SaveForExport, the same save with the export's kind and file name,
//   which answers instead of asking (the dialog shows what went wrong and offers
//   the way on). The Drawing Layout section says which version was exported last,
//   or which version is on the sheet; every card folds out its versions, and Open
//   on one puts it on the sheet as it was exported (also ?layout=<id>&version=<n>).
// - A SAVE THAT CHANGED NOTHING says so: the server wrote nothing and the stamps stay.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Nov-2026 - Version 1.5.0 (ValeVision3D v2.94.0)
// - SaveForExport (the export dialog's save: an answer, never a question), OpenById
//   with a version, FindRecord (a recovery copy finds the layout it changed).
// - The cards fold out their versions with Open (openVersion); the meta says the
//   latest export, or the version on the sheet.
// - "Already saved" when a save changed nothing.
//
// 09-Oct-2026 - Version 1.4.2 (ValeVision3D v2.76.3)
// - Open Drawing / Reopen Drawing on the cards (the shared list's labels).
//
// 09-Oct-2026 - Version 1.4.1 (ValeVision3D v2.76.2)
// - Delete asks for the word delete (the app's question, Na__PageLayout__Host__ConfirmDelete):
//   the server now deletes for good.
//
// 09-Oct-2026 - Version 1.4.0 (ValeVision3D v2.76.1)
// - The cards and Everyone / Mine come from the shared Na__PageLayoutSystem__SavedList__
//   (same look, shared with the 3D app's Drawings menu).
// - OpenById and Deleted for the app; ?layout=<id> opens that layout as the page starts.
//
// 09-Oct-2026 - Version 1.3.1 (ValeVision3D v2.75.4)
// - Thumbnails load straight away (no loading="lazy"): a few small pictures, and no
//   Edge "[Intervention] Images loaded lazily" line in the console.
//
// 09-Oct-2026 - Version 1.3.0 (ValeVision3D v2.75.3)
// - Follows undo and redo ('history'): back to the saved drawing shows Drawing Saved.
//
// 09-Oct-2026 - Version 1.2.0 (ValeVision3D v2.75.2)
// - The Export button is Save Drawing / Drawing Saved: muted red until saved, green
//   once the Vale Cloud has it. The save answers true or false and is handed to the
//   Unsaved Guard, which now owns the close warning (moved out of here).
//
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.75.1)
// - Save Layout File in the Export section; "Syncing..." on the save buttons while
//   a save runs; the Synced to the Vale Cloud toast for every confirmed save.
//
// 09-Oct-2026 - Version 1.0.0
// - Initial build with the side menu (ValeVision3D v2.75.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Store, the Session, Page Events
    // ------------------------------------------------------------
    import {
        Na__PageLayout__Store__ResolveConfig,
        Na__PageLayout__Store__FileUrl,
        Na__PageLayout__Store__List,
        Na__PageLayout__Store__Save,
        Na__PageLayout__Store__Delete,
        Na__PageLayout__Store__Open,
        Na__PageLayout__Store__OpenVersion
    } from './Na__PageLayoutSystem__LayoutStore__.js';
    import { Na__PageLayout__User, Na__PageLayout__CanSave, Na__PageLayout__CanDelete, Na__PageLayout__ShowSignIn } from './Na__PageLayoutSystem__UserSession__.js';
    import { Na__PageLayout__Toast, Na__PageLayout__SyncedToast, Na__PageLayout__Emit, Na__PageLayout__On } from './Na__PageLayoutSystem__UiNotify__.js';
    import { Na__PageLayout__UnsavedGuard__SetSaver } from './Na__PageLayoutSystem__UnsavedGuard__.js';
    import { Na__PageLayout__Host__ConfirmDelete } from './Na__PageLayoutSystem__Host__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Shared List (the Cards, Everyone / Mine, the Dates)
    // ------------------------------------------------------------
    import {
        Na__PageLayout__SavedList__OPEN_LABEL,
        Na__PageLayout__SavedList__REOPEN_LABEL,
        Na__PageLayout__SavedList__FormatIso,
        Na__PageLayout__SavedList__Shown,
        Na__PageLayout__SavedList__Message,
        Na__PageLayout__SavedList__Render,
        Na__PageLayout__SavedList__Versions,
        Na__PageLayout__SavedList__SetBusy,
        Na__PageLayout__SavedList__WireFilter
    } from './Na__PageLayoutSystem__SavedList__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Ids
    // ------------------------------------------------------------
    const Na__PageLayout__Saved__IDS = Object.freeze({
        name          : 'naLayoutName',
        meta          : 'naLayoutMeta',
        save          : 'naLayoutSave',
        saveAsNew     : 'naLayoutSaveAsNew',
        note          : 'naLayoutSignInNote',
        noteText      : 'naLayoutSignInNoteText',
        signIn        : 'naLayoutSignIn',
        section       : 'naLayoutSavedSection',
        count         : 'naLayoutSavedCount',
        filter        : 'naLayoutSavedFilter',
        list          : 'naLayoutSavedList',
        refresh       : 'naLayoutSavedRefresh',
        exportSave    : 'naLayoutExportSaveFile',
        exportHint    : 'naLayoutExportSaveHint'
    });
    // ------------------------------------------------------------

    // MODULE VARIABLES | What the App May Ask (Set by Init: Open a Layout, One Was Deleted)
    // ------------------------------------------------------------
    let Na__PageLayout__Saved__OpenByIdFn   = null;
    let Na__PageLayout__Saved__DeletedFn    = null;
    let Na__PageLayout__Saved__ExportSaveFn = null;                         // <-- The export dialog's save
    let Na__PageLayout__Saved__FindFn       = null;                         // <-- A saved layout by id (recovery copies)
    let Na__PageLayout__Saved__StatusFn     = null;                         // <-- What the dialog needs to know of the open layout
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Element by Id
    // ------------------------------------------------------------
    function Na__PageLayout__Saved__El(key) {
        return document.getElementById(Na__PageLayout__Saved__IDS[key]);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An ISO Time as 09-Oct-2026 08:40 (Local), or '' (the Shared List's)
    // ------------------------------------------------------------
    function Na__PageLayout__Saved__FormatIso(iso) {
        return Na__PageLayout__SavedList__FormatIso(iso);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Small Element With a Class and Text
    // ------------------------------------------------------------
    function Na__PageLayout__Saved__Make(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined && text !== null) el.textContent = String(text);
        return el;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Saved Layouts Controls Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Drawing Layout and Saved Layouts Sections
    // ------------------------------------------------------------
    function Na__PageLayout__InitSavedLayoutsControls(state, requestRedraw) {
        if (!state) return;

        const cfg        = Na__PageLayout__Store__ResolveConfig(state);
        const nameInput  = Na__PageLayout__Saved__El('name');
        const metaLine   = Na__PageLayout__Saved__El('meta');
        const saveBtn    = Na__PageLayout__Saved__El('save');
        const saveNewBtn = Na__PageLayout__Saved__El('saveAsNew');
        const note       = Na__PageLayout__Saved__El('note');
        const noteText   = Na__PageLayout__Saved__El('noteText');
        const signInBtn  = Na__PageLayout__Saved__El('signIn');
        const section    = Na__PageLayout__Saved__El('section');
        const countBadge = Na__PageLayout__Saved__El('count');
        const filterBox  = Na__PageLayout__Saved__El('filter');
        const listBox    = Na__PageLayout__Saved__El('list');
        const refreshBtn = Na__PageLayout__Saved__El('refresh');
        const exportSave = Na__PageLayout__Saved__El('exportSave');
        const exportHint = Na__PageLayout__Saved__El('exportHint');

        let layouts  = [];                                                  // <-- The job's layouts as last listed
        let filter   = 'all';                                               // <-- 'all' | 'mine'
        let busy     = false;                                               // <-- A save, open or delete is running
        let saving   = false;                                               // <-- ...and it is a save (the buttons say Syncing)
        let listed   = false;                                               // <-- The list has been read at least once

        if (!state.layout.name) state.layout.name = cfg.defaultName;


        // SUB FUNCTION | The Drawing Layout Section From the Page's State
        // ------------------------------------------------------------
        const refreshDrawing = () => {
            const user    = Na__PageLayout__User();
            const canSave = Na__PageLayout__CanSave();
            const record  = state.layout.record;
            const ready   = canSave && !!state.viewportImage && !!state.project.id && !busy;

            if (nameInput && document.activeElement !== nameInput) nameInput.value = state.layout.name || '';
            if (saveBtn)    saveBtn.disabled    = !ready;
            if (saveNewBtn) saveNewBtn.disabled = !ready || !record;
            if (saveBtn)    saveBtn.textContent = saving ? 'Syncing...' : (record ? 'Save Changes' : 'Save Layout');

            // The Export section's Save Drawing: red until saved, green once the Vale Cloud has it
            // ------------------------------------------------------------
            const isSaved = !!record && !state.layout.dirty && !!state.viewportImage;
            if (exportSave) {
                exportSave.classList.toggle('is-syncing', saving);
                exportSave.classList.toggle('is-saved', isSaved && !saving);
                exportSave.disabled    = saving || (!isSaved && !ready);    // <-- Saved stays bright green (it just has nothing to do)
                exportSave.textContent = saving ? 'Syncing to the Vale Cloud...' : (isSaved ? 'Drawing Saved' : 'Save Drawing');
                exportSave.setAttribute('aria-disabled', (saving || isSaved || !ready) ? 'true' : 'false');
            }
            if (exportHint) {
                const when = record ? Na__PageLayout__Saved__FormatIso(record.PageLayouts__Layout__UpdatedIso) : '';
                const who  = record ? (record.PageLayouts__Layout__UpdatedByName || record.PageLayouts__Layout__UpdatedBy || '') : '';
                exportHint.textContent = !user
                    ? 'Sign in to save this drawing for the job on the Vale Cloud.'
                    : !canSave
                        ? 'Your account can open saved drawings but cannot save them.'
                        : !state.project.id
                            ? 'Open this page from a project in ValeVision 3D to save drawings.'
                            : saving
                                ? 'Saving this drawing for the job on the Vale Cloud...'
                                : isSaved
                                    ? `Saved on the Vale Cloud${when ? ', ' + when : ''}${who ? ', by ' + who : ''}.`
                                    : record
                                        ? `Changes to ${record.PageLayouts__Layout__Name || 'this drawing'} are not saved yet.`
                                        : 'Not saved yet. Save it to the Vale Cloud to open it again from Saved Drawings.';
            }

            if (note) {
                const why = !user
                    ? 'Sign in to save this layout for the job and to open its saved layouts.'
                    : (!canSave ? 'Your account can open saved layouts but cannot save them.' : '');
                note.hidden = !why;
                if (noteText) noteText.textContent = why;
                if (signInBtn) signInBtn.hidden = !!user;
            }

            if (metaLine) {
                const lines = [];
                const warn = new Set();
                if (record) {
                    const made = Na__PageLayout__Saved__FormatIso(record.PageLayouts__Layout__CreatedIso);
                    const last = Na__PageLayout__Saved__FormatIso(record.PageLayouts__Layout__UpdatedIso);
                    lines.push(`Created by ${record.PageLayouts__Layout__CreatedByName || record.PageLayouts__Layout__CreatedBy || 'unknown'}${made ? ', ' + made : ''}`);
                    lines.push(`Last updated by ${record.PageLayouts__Layout__UpdatedByName || record.PageLayouts__Layout__UpdatedBy || 'unknown'}${last ? ', ' + last : ''}`);

                    // EXPORTED VERSIONS | The one on the sheet, else the latest
                    // ------------------------------------------------------------
                    const shown    = state.layout.version;
                    const versions = Na__PageLayout__SavedList__Versions(record);
                    if (shown && !shown.isCurrent) {
                        const text = `Showing version ${shown.number} of ${Math.max(shown.latest || 0, shown.number)}, exported ${Na__PageLayout__Saved__FormatIso(shown.createdIso)}${shown.createdBy ? ' by ' + shown.createdBy : ''}. Save Changes makes it the current drawing.`;
                        lines.push(text);
                        warn.add(text);
                    } else if (versions.length) {
                        const latest  = versions[0];
                        const exports = Array.isArray(latest.Version__Exports) ? latest.Version__Exports : [];
                        const lastOut = exports[exports.length - 1] || {};
                        lines.push(`Version ${latest.Version__Number} exported ${Na__PageLayout__Saved__FormatIso(lastOut.Export__Iso || latest.Version__CreatedIso)} by ${lastOut.Export__ByName || latest.Version__CreatedByName || 'unknown'}`);
                    } else {
                        lines.push('Not exported yet');
                    }
                } else {
                    lines.push(state.viewportImage ? 'Not saved yet' : 'Open a saved layout below, or press Create Drawing in ValeVision 3D');
                }
                if (record && state.layout.dirty) {
                    lines.push('Unsaved changes');
                    warn.add('Unsaved changes');
                }
                metaLine.textContent = '';
                lines.forEach((text, index) => {
                    const row = Na__PageLayout__Saved__Make('div', 'na-layout-menu__meta-line', text);
                    if (warn.has(text)) row.classList.add('na-layout-menu__meta-line--warn');
                    if (index === 0 && !record) row.classList.add('na-layout-menu__meta-line--muted');
                    metaLine.appendChild(row);
                });
            }
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Draw the Saved Layouts List (the Shared Cards)
        // ------------------------------------------------------------
        const renderList = () => {
            if (!listBox) return;
            const user    = Na__PageLayout__User();
            const current = state.layout.record ? state.layout.record.PageLayouts__Layout__Id : '';

            if (!user) {
                Na__PageLayout__SavedList__Message(listBox, 'Sign in to see the layouts saved for this job.');
                if (countBadge) countBadge.textContent = '';
                return;
            }
            if (!state.project.id) {
                Na__PageLayout__SavedList__Message(listBox, 'Open this page from a project in ValeVision 3D to see its saved layouts.');
                return;
            }

            if (countBadge) countBadge.textContent = layouts.length ? String(layouts.length) : '';
            if (!listed) {
                Na__PageLayout__SavedList__Message(listBox, 'Reading the saved layouts...');
                return;
            }
            Na__PageLayout__SavedList__Render(listBox, {
                layouts        : Na__PageLayout__SavedList__Shown(layouts, filter, user.code),
                filter         : filter,
                currentId      : current,
                currentVersion : (state.layout.version && state.layout.version.number) || 0,
                openLabel      : (record) => (record.PageLayouts__Layout__Id === current ? Na__PageLayout__SavedList__REOPEN_LABEL : Na__PageLayout__SavedList__OPEN_LABEL),
                canDelete      : (record) => Na__PageLayout__CanDelete(record),
                fileUrl        : (relative) => Na__PageLayout__Store__FileUrl(relative),
                onOpen         : (record) => openLayout(record),
                onOpenVersion  : (record, number) => openVersion(record, number),
                onDelete       : (record) => deleteLayout(record)
            });
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Read the Job's Layouts Again
        // ------------------------------------------------------------
        const loadList = async (quiet) => {
            if (!Na__PageLayout__User() || !state.project.id) { renderList(); return; }
            try {
                const answer = await Na__PageLayout__Store__List(state);
                layouts = answer.layouts;
                listed  = true;
                // The open layout as the server has it now (someone may have saved it)
                const current = state.layout.record
                    ? layouts.find((record) => record.PageLayouts__Layout__Id === state.layout.record.PageLayouts__Layout__Id)
                    : null;
                if (current && !state.layout.dirty) state.layout.record = current;
            } catch (error) {
                listed = true;
                if (!quiet) Na__PageLayout__Toast(error.message, true);
            }
            renderList();
            refreshDrawing();
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Busy While Saving, Opening or Deleting
        // ------------------------------------------------------------
        const setBusy = (isBusy, isSaving) => {
            busy   = isBusy;
            saving = isBusy && isSaving === true;
            Na__PageLayout__SavedList__SetBusy(listBox, isBusy);
            refreshDrawing();
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | The Vale Cloud Confirmation for a Save the Server Took
        // ------------------------------------------------------------
        const confirmSynced = (answer) => {
            const layout = answer.layout || {};
            const name   = layout.PageLayouts__Layout__Name || 'The layout';
            const job    = String(state.project.id || '').split('/').pop().replace(/__/g, ' ');
            const when   = Na__PageLayout__Saved__FormatIso(layout.PageLayouts__Layout__UpdatedIso);
            if (answer.unchanged) {
                Na__PageLayout__SyncedToast(`Nothing had changed: ${name} is already saved${job ? ' to job ' + job : ''}${when ? ', ' + when : ''}`, 'Already on the Vale Cloud');
                return;
            }
            const what   = answer.created ? `${name} saved` : `Changes to ${name} saved`;
            Na__PageLayout__SyncedToast(`${what}${job ? ' to job ' + job : ''}${when ? ', ' + when : ''}`);
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Save (Update, or a New Layout); Answers True Once the Vale Cloud Has It
        // ------------------------------------------------------------
        const saveLayout = async (asNew) => {
            if (busy) return false;
            setBusy(true, true);
            let saved = false;
            try {
                const answer = await Na__PageLayout__Store__Save(state, { asNew });
                saved = true;
                setBusy(false);                                             // <-- Save Drawing turns green at once
                confirmSynced(answer);                                      // <-- Only once the server has it
                await loadList(true);
            } catch (error) {
                if (error.conflict && error.current) {
                    const keepTheirs = window.confirm(`${error.message}\n\nOK: open their version (the changes on this page are lost).\nCancel: keep this page as it is (Save as New keeps it as a layout of its own).`);
                    if (keepTheirs) {
                        try {
                            await Na__PageLayout__Store__Open(state, error.current);
                            requestRedraw();
                        } catch (openError) {
                            Na__PageLayout__Toast(openError.message, true);
                        }
                    }
                    await loadList(true);
                } else if (error.missing && !asNew) {
                    if (window.confirm(`${error.message}\n\nSave this page as a new layout instead?`)) {
                        setBusy(false);
                        saved = await saveLayout(true);                     // <-- Awaited, so this call's finally finds it finished
                    }
                } else {
                    Na__PageLayout__Toast(error.message, true);
                }
            } finally {
                if (busy) setBusy(false);
            }
            return saved;
        };
        Na__PageLayout__UnsavedGuard__SetSaver(() => saveLayout(false));    // <-- The close question's Save goes through here too
        // ------------------------------------------------------------


        // SUB FUNCTION | The Export Dialog's Save: { ok, answer } or { ok: false, error } (Never Asks)
        // ------------------------------------------------------------
        // options: { asNew, issue: { kind, fileName } }. The dialog shows what went
        // wrong itself (someone saved first, deleted, offline) and offers the way on.
        // ------------------------------------------------------------
        const saveForExport = async (options = {}) => {
            if (busy) return { ok : false, error : new Error('Another save is still running: try again in a moment') };
            setBusy(true, true);
            try {
                const answer = await Na__PageLayout__Store__Save(state, { asNew : options.asNew === true, issue : options.issue || null });
                setBusy(false);
                loadList(true);                                             // <-- The cards catch up behind the dialog
                return { ok : true, answer : answer };
            } catch (error) {
                return { ok : false, error : error };
            } finally {
                if (busy) setBusy(false);
            }
        };
        Na__PageLayout__Saved__ExportSaveFn = saveForExport;
        Na__PageLayout__Saved__StatusFn     = () => ({
            busy     : busy,
            layouts  : layouts,
            listed   : listed
        });
        // ------------------------------------------------------------


        // SUB FUNCTION | Open a Saved Layout on the Sheet
        // ------------------------------------------------------------
        const openLayout = async (record) => {
            if (busy) return;
            if (state.layout.dirty && state.viewportImage) {
                const loss = state.layout.record
                    ? 'The unsaved changes on this page will be lost.'
                    : 'The drawing on the sheet has not been saved and will be lost.';
                const go = window.confirm(`Open ${record.PageLayouts__Layout__Name || 'this layout'}?\n\n${loss}`);
                if (!go) return;
            }
            setBusy(true);
            try {
                await Na__PageLayout__Store__Open(state, record);
                requestRedraw();
                Na__PageLayout__Toast(`Opened ${record.PageLayouts__Layout__Name || 'the layout'}`);
            } catch (error) {
                Na__PageLayout__Toast(error.message, true);
            } finally {
                setBusy(false);
                renderList();
            }
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Open One Exported Version of a Saved Layout, as It Was Exported
        // ------------------------------------------------------------
        const openVersion = async (record, number) => {
            if (busy) return;
            if (state.layout.dirty && state.viewportImage) {
                const loss = state.layout.record
                    ? 'The unsaved changes on this page will be lost.'
                    : 'The drawing on the sheet has not been saved and will be lost.';
                if (!window.confirm(`Open version ${number} of ${record.PageLayouts__Layout__Name || 'this layout'}?\n\n${loss}`)) return;
            }
            setBusy(true);
            try {
                const version = await Na__PageLayout__Store__OpenVersion(state, record, number);
                requestRedraw();
                const latest = state.layout.version && state.layout.version.isCurrent;
                Na__PageLayout__Toast(latest
                    ? `Opened ${record.PageLayouts__Layout__Name || 'the layout'}: version ${number} is the current drawing`
                    : `Opened version ${number} of ${record.PageLayouts__Layout__Name || 'the layout'}, as exported ${Na__PageLayout__Saved__FormatIso(version.Version__CreatedIso)}`);
            } catch (error) {
                Na__PageLayout__Toast(error.message, true);
            } finally {
                setBusy(false);
                renderList();
            }
        };
        // ------------------------------------------------------------


        // SUB FUNCTION | Delete a Saved Layout for Good (Once the Word Delete Is Typed)
        // ------------------------------------------------------------
        const deleteLayout = async (record) => {
            if (busy) return;
            const name = record.PageLayouts__Layout__Name || 'this layout';
            if (!(await Na__PageLayout__Host__ConfirmDelete(name))) return;   // <-- The app's question (type delete); a tab of its own: the browser's prompt
            if (busy) return;                                               // <-- Something started while the question was up
            setBusy(true);
            try {
                await Na__PageLayout__Store__Delete(state, record.PageLayouts__Layout__Id);
                Na__PageLayout__Toast(`Deleted ${name}`);
                await loadList(true);
            } catch (error) {
                Na__PageLayout__Toast(error.message, true);
            } finally {
                setBusy(false);
            }
        };
        // ------------------------------------------------------------


        // Wire the Drawing Layout section
        // ------------------------------------------------------------
        if (nameInput) {
            nameInput.value = state.layout.name || '';
            nameInput.addEventListener('input', () => {
                state.layout.name = nameInput.value;
                Na__PageLayout__Emit('changed', { what : 'name' });
            });
            nameInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') { event.preventDefault(); nameInput.blur(); }
            });
        }
        if (saveBtn)    saveBtn.addEventListener('click', () => saveLayout(false));
        if (saveNewBtn) saveNewBtn.addEventListener('click', () => saveLayout(true));
        if (exportSave) {
            exportSave.addEventListener('click', () => {
                if (exportSave.classList.contains('is-saved')) return;      // <-- Drawing Saved: nothing to do until it changes
                saveLayout(false);                                          // <-- Save Drawing (Export): the same save
            });
        }
        if (signInBtn)  signInBtn.addEventListener('click', () => Na__PageLayout__ShowSignIn());   // <-- Signing in fires 'user', which reads the list

        // Wire the Saved Layouts section
        // ------------------------------------------------------------
        Na__PageLayout__SavedList__WireFilter(filterBox, (chosen) => {
            filter = chosen;
            renderList();
        });
        if (refreshBtn) refreshBtn.addEventListener('click', () => loadList(false));
        if (section) {
            section.addEventListener('toggle', () => { if (section.open && !listed) loadList(true); });
        }

        // Keep both sections current
        // ------------------------------------------------------------
        Na__PageLayout__On('changed', () => { state.layout.dirty = true; refreshDrawing(); });   // <-- Save Drawing turns red again
        Na__PageLayout__On('history', () => refreshDrawing());             // <-- Undo / redo set dirty themselves (back to saved is green)
        Na__PageLayout__On('layout',  () => { refreshDrawing(); renderList(); });
        Na__PageLayout__On('image',   () => refreshDrawing());
        Na__PageLayout__On('user',    () => { listed = false; layouts = []; refreshDrawing(); renderList(); loadList(true); });

        // Closing with an unsaved drawing: the Unsaved Guard asks (it has the save, above)
        // ------------------------------------------------------------

        // What the app may ask (ValeVision 3D's Drawings menu): open a layout; one was deleted there
        // ------------------------------------------------------------
        const openById = async (layoutId, versionNumber) => {
            if (!layoutId || !Na__PageLayout__User() || !state.project.id) return false;
            if (!layouts.some((record) => record.PageLayouts__Layout__Id === layoutId)) await loadList(true);
            const record = layouts.find((candidate) => candidate.PageLayouts__Layout__Id === layoutId);
            if (!record) {
                Na__PageLayout__Toast('That layout is no longer saved for this job', true);
                return false;
            }
            if (Number.isInteger(versionNumber) && versionNumber > 0) {
                await openVersion(record, versionNumber);                   // <-- An exported version, as it was
                return true;
            }
            await openLayout(record);                                       // <-- Its own question first when the sheet has unsaved changes
            return true;
        };
        Na__PageLayout__Saved__OpenByIdFn = openById;
        Na__PageLayout__Saved__FindFn     = async (layoutId) => {
            if (!layoutId || !Na__PageLayout__User() || !state.project.id) return null;
            if (!listed || !layouts.some((record) => record.PageLayouts__Layout__Id === layoutId)) await loadList(true);
            return layouts.find((record) => record.PageLayouts__Layout__Id === layoutId) || null;
        };
        Na__PageLayout__Saved__DeletedFn  = (layoutId) => {
            if (state.layout.record && state.layout.record.PageLayouts__Layout__Id === layoutId) {
                state.layout.record = null;                                 // <-- The sheet stays: a new, unsaved drawing now (as a delete from here does)
                state.layout.dirty  = true;
                state.imageIsSaved  = false;
                Na__PageLayout__Emit('layout', { record : null, deleted : layoutId });
            }
            loadList(true);
        };

        // First look: opened from Saved Drawings, the list opens by itself; opened on one
        // layout (?layout=<id>, from the app's Drawings menu), that layout goes on the sheet
        // ------------------------------------------------------------
        if (section && (state.openMode === 'saved' || !state.viewportImage) && !state.openLayoutId) section.open = true;
        refreshDrawing();
        renderList();
        if (state.openLayoutId) {
            const layoutId = state.openLayoutId;
            const version  = state.openVersion || 0;
            state.openLayoutId = '';
            state.openVersion  = 0;
            openById(layoutId, version);                                    // <-- Reads the list itself
        } else if (Na__PageLayout__User() && state.project.id) {
            loadList(true);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The App Asks: Put This Saved Layout (or One of Its Versions) on the Sheet (Promise<boolean>)
    // ------------------------------------------------------------
    function Na__PageLayout__SavedLayouts__OpenById(layoutId, versionNumber) {
        return Na__PageLayout__Saved__OpenByIdFn ? Na__PageLayout__Saved__OpenByIdFn(layoutId, versionNumber) : Promise.resolve(false);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Export Dialog's Save (Promise<{ ok, answer } | { ok: false, error }>)
    // ------------------------------------------------------------
    function Na__PageLayout__SavedLayouts__SaveForExport(options) {
        return Na__PageLayout__Saved__ExportSaveFn
            ? Na__PageLayout__Saved__ExportSaveFn(options)
            : Promise.resolve({ ok : false, error : new Error('Saving is not ready on this page yet') });
    }
    // ------------------------------------------------------------


    // FUNCTION | A Saved Layout of the Job by Id, as Last Listed (Promise<record | null>)
    // ------------------------------------------------------------
    function Na__PageLayout__SavedLayouts__FindRecord(layoutId) {
        return Na__PageLayout__Saved__FindFn ? Na__PageLayout__Saved__FindFn(layoutId) : Promise.resolve(null);
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Save, Open or Delete Running? (the Export Dialog Waits)
    // ------------------------------------------------------------
    function Na__PageLayout__SavedLayouts__IsBusy() {
        return Na__PageLayout__Saved__StatusFn ? Na__PageLayout__Saved__StatusFn().busy === true : false;
    }
    // ------------------------------------------------------------


    // FUNCTION | The App Says: This Layout Was Deleted There
    // ------------------------------------------------------------
    function Na__PageLayout__SavedLayouts__Deleted(layoutId) {
        if (Na__PageLayout__Saved__DeletedFn) Na__PageLayout__Saved__DeletedFn(layoutId);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Saved Layouts Controls API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__InitSavedLayoutsControls,
        Na__PageLayout__SavedLayouts__OpenById,
        Na__PageLayout__SavedLayouts__Deleted,
        Na__PageLayout__SavedLayouts__SaveForExport,
        Na__PageLayout__SavedLayouts__FindRecord,
        Na__PageLayout__SavedLayouts__IsBusy
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
