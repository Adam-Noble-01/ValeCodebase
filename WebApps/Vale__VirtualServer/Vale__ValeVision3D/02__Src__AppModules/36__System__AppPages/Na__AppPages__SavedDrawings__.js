// =============================================================================
// VALEVISION3D - APP PAGES - SAVED DRAWINGS (THE DRAWINGS MENU'S LIST)
// =============================================================================
//
// FILE       : Na__AppPages__SavedDrawings__.js
// NAMESPACE  : Na__SavedDrawings
// MODULE     : App Pages - Saved Drawings
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Tools & Settings > Drawings: the job's saved layouts under Create
//              Drawing, exactly as the Drawing Editor lists them (thumbnails, who
//              and when, Everyone / Mine, Open, Delete), and only when there are some
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - THE SAME LIST AS THE DRAWING EDITOR'S (Adam, 09-Oct-2026: "use this same menu,
//   it's way better and more intuitive"). It is drawn by the shared
//   Na__PageLayoutSystem__SavedList__ with the shared stylesheet, so it looks and
//   reads as the editor's Saved Layouts section does.
// - ONLY WHEN THERE ARE DRAWINGS (Adam: "if no drawings made already then don't show
//   the saved drawings buttons"). With none saved for the job, or nobody signed in
//   (the list needs an account), the section is not there and Create Drawing stands
//   alone. It replaces the old Saved Drawings button.
// - READ AT START, EACH TIME THE DRAWINGS PANEL OPENS, on coming back from the
//   Drawing Editor and when someone signs in or out: drawings change in the editor
//   and on other machines. The cards already drawn stay while it is read again.
// - OPEN puts the layout on the Drawing Editor's sheet, in this window
//   (Na__DrawingPage__OpenLayout). The layout already on the editor's sheet is
//   outlined, and Open on it brings the editor back exactly as it was left.
// - DELETE MEANS DELETE (Adam, 09-Oct-2026, v2.76.2): the word delete has to be
//   typed first (Na__DrawingPage__ConfirmDelete, the editor's question too), then
//   the server removes the layout and every picture of it for good: the editor's
//   own route and rule (its creator, or Management and up). An editor with it on
//   its sheet is told; its drawing stays, as a new unsaved one.
//
// INTEGRATION:
// - index.html: the markup under #naDrawingsPanel (#naSavedDrawings), and
//   Na__SavedDrawings__Initialize() once the Drawing Editor page is registered.
// - API (Server__Api/Api__ValeVision3D/ValeVision3D__Api__PageLayouts__.py), as the
//   signed-in person (window.ValeUserLogin.Fetch):
//     GET  api/projects/<id>/page-layouts                      the list
//     GET  api/projects/<id>/page-layouts/files/<path>         the thumbnails
//     POST api/projects/<id>/page-layouts/<layout id>/delete   Delete
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.1.1 (ValeVision3D v2.76.3)
// - The open button says Open Drawing (the shared list's OPEN_LABEL).
//
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.76.2)
// - Delete is final on the server; the word delete has to be typed first.
//
// 09-Oct-2026 - Version 1.0.0 (ValeVision3D v2.76.1)
// - Initial build, in place of the Saved Drawings button.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Shared List (the Drawing Editor's Cards and Everyone / Mine)
    // @delegate: ../35__System__PageLayoutSystem/Na__PageLayoutSystem__SavedList__.js
    // ------------------------------------------------------------
    import {
        Na__PageLayout__SavedList__OPEN_LABEL,
        Na__PageLayout__SavedList__Shown,
        Na__PageLayout__SavedList__Render,
        Na__PageLayout__SavedList__SetBusy,
        Na__PageLayout__SavedList__WireFilter
    } from '../35__System__PageLayoutSystem/Na__PageLayoutSystem__SavedList__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Drawing Editor Page, the App's Pages
    // ------------------------------------------------------------
    import {
        Na__DrawingPage__OpenLayout,
        Na__DrawingPage__OpenedLayoutId,
        Na__DrawingPage__ConfirmDelete,
        Na__DrawingPage__LayoutDeleted
    } from './Na__AppPages__DrawingPage__Host__.js';
    import { Na__AppPages__MODEL, Na__AppPages__EVENT } from './Na__AppPages__Navigation__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | This Job
    // ------------------------------------------------------------
    import { Na__PageLayoutHandoff__ProjectId } from '../30__System__ImageExport/Na__ImageExport__PageLayoutHandoff__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Ids (index.html, under #naDrawingsPanel)
    // ------------------------------------------------------------
    const Na__SavedDrawings__IDS = Object.freeze({
        panel   : 'naDrawingsPanel',                                         // <-- Tools & Settings > Drawings
        section : 'naSavedDrawings',
        count   : 'naSavedDrawingsCount',
        filter  : 'naSavedDrawingsFilter',
        list    : 'naSavedDrawingsList'
    });
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The API, the Panel, the Toast
    // ------------------------------------------------------------
    const Na__SavedDrawings__API_BASE    = new URL('../../api/', import.meta.url).href;   // <-- <app>/api/ wherever the app is served
    const Na__SavedDrawings__OPEN_CLASS  = 'is-open';                        // <-- The panel's open state (every submenu's)
    const Na__SavedDrawings__TOAST_EVENT = 'na-show-toast';
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Job's Layouts as Last Read, the Choice, the Levels the API Named
    // ------------------------------------------------------------
    let Na__SavedDrawings__Layouts     = [];
    let Na__SavedDrawings__Filter      = 'all';                              // <-- 'all' | 'mine'
    let Na__SavedDrawings__SaveLevel   = 'Employee';                         // <-- Until the API says
    let Na__SavedDrawings__DeleteLevel = 'Management';
    let Na__SavedDrawings__Reading     = null;                               // <-- The read in flight (one at a time)
    let Na__SavedDrawings__Busy        = false;                              // <-- A delete is running
    let Na__SavedDrawings__Started     = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Element by Key
    // ------------------------------------------------------------
    function Na__SavedDrawings__El(key) {
        return document.getElementById(Na__SavedDrawings__IDS[key]);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Shared Sign-In, the Person Signed In (or Null)
    // ------------------------------------------------------------
    function Na__SavedDrawings__Login() {
        return window.ValeUserLogin || null;
    }
    function Na__SavedDrawings__User() {
        const login = Na__SavedDrawings__Login();
        try { return (login && typeof login.User === 'function' && login.User()) || null; } catch (error) { return null; }
    }
    function Na__SavedDrawings__HasLevel(level) {
        const login = Na__SavedDrawings__Login();
        try { return !!login && typeof login.HasLevel === 'function' && login.HasLevel(level); } catch (error) { return false; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The API's Address for a Path, and the Job's Page Layouts Route
    // ------------------------------------------------------------
    function Na__SavedDrawings__ApiUrl(path) {
        return Na__SavedDrawings__API_BASE + String(path || '').replace(/^\/+/, '');
    }
    function Na__SavedDrawings__Route(tail) {
        const id = String(Na__PageLayoutHandoff__ProjectId() || '').split('/').map(encodeURIComponent).join('/');
        return Na__SavedDrawings__ApiUrl(`projects/${id}/page-layouts${tail || ''}`);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch as the Person Signed In
    // ------------------------------------------------------------
    function Na__SavedDrawings__Fetch(url, init) {
        const login = Na__SavedDrawings__Login();
        if (login && typeof login.Fetch === 'function') return login.Fetch(url, init);
        return fetch(url, Object.assign({ credentials : 'same-origin' }, init || {}));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Refusal's Reason (the API's Own Words When It Gives Them)
    // ------------------------------------------------------------
    async function Na__SavedDrawings__Reason(response, fallback) {
        const answer = await response.json().catch(() => ({}));
        if (response.status === 401) return 'Sign in to use saved layouts';
        return answer.error || `${fallback} (HTTP ${response.status})`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The App's Toast
    // ------------------------------------------------------------
    function Na__SavedDrawings__Toast(message, isError) {
        window.dispatchEvent(new CustomEvent(Na__SavedDrawings__TOAST_EVENT, { detail : { message, isError : !!isError } }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | May the Person Here Delete This Layout? (Its Creator, or Management and Up)
    // ------------------------------------------------------------
    // The Drawing Editor's rule (Na__PageLayoutSystem__UserSession__ CanDelete):
    // someone who may save layouts at all, and either made this one or holds
    // the delete-any level. The server decides again.
    // ------------------------------------------------------------
    function Na__SavedDrawings__CanDelete(record) {
        const user = Na__SavedDrawings__User();
        if (!user || !record || user.mustChangePassword) return false;
        if (!Na__SavedDrawings__HasLevel(Na__SavedDrawings__SaveLevel)) return false;
        return record.PageLayouts__Layout__CreatedBy === user.code || Na__SavedDrawings__HasLevel(Na__SavedDrawings__DeleteLevel);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing, Reading, Deleting
// -----------------------------------------------------------------------------

    // FUNCTION | Draw the Section: There Only When the Job Has Drawings
    // ------------------------------------------------------------
    function Na__SavedDrawings__Draw() {
        const section = Na__SavedDrawings__El('section');
        if (!section) return;
        const user = Na__SavedDrawings__User();
        const show = !!user && !!Na__PageLayoutHandoff__ProjectId() && Na__SavedDrawings__Layouts.length > 0;
        section.hidden = !show;
        if (!show) return;

        const count = Na__SavedDrawings__El('count');
        if (count) count.textContent = String(Na__SavedDrawings__Layouts.length);
        Na__PageLayout__SavedList__Render(Na__SavedDrawings__El('list'), {
            layouts   : Na__PageLayout__SavedList__Shown(Na__SavedDrawings__Layouts, Na__SavedDrawings__Filter, user.code),
            filter    : Na__SavedDrawings__Filter,
            currentId : Na__DrawingPage__OpenedLayoutId(),                   // <-- The one on the Drawing Editor's sheet is outlined
            openLabel : () => Na__PageLayout__SavedList__OPEN_LABEL,         // <-- Open Drawing
            canDelete : (record) => Na__SavedDrawings__CanDelete(record),
            fileUrl   : (relative) => Na__SavedDrawings__ApiUrl(relative),
            onOpen    : (record) => Na__DrawingPage__OpenLayout(record.PageLayouts__Layout__Id),
            onDelete  : (record) => Na__SavedDrawings__Delete(record)
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Job's Layouts Again (Quietly: the Menu Keeps What It Had on a Failure)
    // ------------------------------------------------------------
    function Na__SavedDrawings__Read() {
        if (!Na__SavedDrawings__User() || !Na__PageLayoutHandoff__ProjectId()) {
            Na__SavedDrawings__Layouts = [];
            Na__SavedDrawings__Draw();
            return Promise.resolve();
        }
        if (Na__SavedDrawings__Reading) return Na__SavedDrawings__Reading;
        Na__SavedDrawings__Reading = (async () => {
            try {
                const response = await Na__SavedDrawings__Fetch(Na__SavedDrawings__Route(''), { cache : 'no-store' });
                if (!response.ok) throw new Error(await Na__SavedDrawings__Reason(response, 'The saved layouts could not be read'));
                const answer = await response.json();
                Na__SavedDrawings__Layouts = Array.isArray(answer.layouts) ? answer.layouts : [];
                if (typeof answer.saveLevel === 'string' && answer.saveLevel)           Na__SavedDrawings__SaveLevel   = answer.saveLevel;
                if (typeof answer.deleteAnyLevel === 'string' && answer.deleteAnyLevel) Na__SavedDrawings__DeleteLevel = answer.deleteAnyLevel;
            } catch (error) {
                console.warn('[SavedDrawings] The saved layouts could not be read:', error);
            } finally {
                Na__SavedDrawings__Reading = null;
            }
            Na__SavedDrawings__Draw();
        })();
        return Na__SavedDrawings__Reading;
    }
    // ------------------------------------------------------------


    // FUNCTION | Delete a Saved Layout for Good (Once the Word Delete Is Typed)
    // ------------------------------------------------------------
    async function Na__SavedDrawings__Delete(record) {
        if (Na__SavedDrawings__Busy || !record) return;
        const layoutId = record.PageLayouts__Layout__Id;
        const name     = record.PageLayouts__Layout__Name || 'this layout';
        if (!(await Na__DrawingPage__ConfirmDelete(name))) return;           // <-- The word delete typed, or nothing happens

        const listBox = Na__SavedDrawings__El('list');
        Na__SavedDrawings__Busy = true;
        Na__PageLayout__SavedList__SetBusy(listBox, true);
        try {
            const response = await Na__SavedDrawings__Fetch(
                Na__SavedDrawings__Route(`/${encodeURIComponent(layoutId)}/delete`),
                { method : 'POST' }
            );
            if (!response.ok) throw new Error(await Na__SavedDrawings__Reason(response, 'The server refused the delete'));
            Na__SavedDrawings__Toast(`Deleted ${name}`);
            Na__DrawingPage__LayoutDeleted(layoutId);                        // <-- An editor with it on its sheet keeps the drawing, unsaved
        } catch (error) {
            Na__SavedDrawings__Toast(error.message || 'The server refused the delete', true);
        } finally {
            Na__SavedDrawings__Busy = false;
            Na__PageLayout__SavedList__SetBusy(listBox, false);
        }
        await Na__SavedDrawings__Read();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Wire the Section, and Read the List Whenever It Could Have Changed
    // ------------------------------------------------------------
    function Na__SavedDrawings__Initialize() {
        if (Na__SavedDrawings__Started) return;
        const panel   = Na__SavedDrawings__El('panel');
        const section = Na__SavedDrawings__El('section');
        if (!panel || !section) return;                                      // <-- Guard: markup not in DOM
        Na__SavedDrawings__Started = true;

        // EVERYONE / MINE | The shared wiring, this menu's own choice
        // ------------------------------------------------------------
        Na__PageLayout__SavedList__WireFilter(Na__SavedDrawings__El('filter'), (chosen) => {
            Na__SavedDrawings__Filter = chosen;
            Na__SavedDrawings__Draw();
        });

        // THE DRAWINGS PANEL OPENING | Read again each time (it toggles the panel's is-open)
        // ------------------------------------------------------------
        let wasOpen = panel.classList.contains(Na__SavedDrawings__OPEN_CLASS);
        new MutationObserver(() => {
            const isOpen = panel.classList.contains(Na__SavedDrawings__OPEN_CLASS);
            if (isOpen && !wasOpen) Na__SavedDrawings__Read();
            wasOpen = isOpen;
        }).observe(panel, { attributes : true, attributeFilter : ['class'] });

        // SIGNING IN OR OUT | Another person's list (or none)
        // ------------------------------------------------------------
        const login = Na__SavedDrawings__Login();
        if (login && typeof login.OnChange === 'function') {
            login.OnChange(() => {
                Na__SavedDrawings__Layouts = [];
                Na__SavedDrawings__Draw();
                Na__SavedDrawings__Read();
            });
        }

        // BACK FROM THE DRAWING EDITOR | It may have saved, opened or deleted one
        // ------------------------------------------------------------
        window.addEventListener(Na__AppPages__EVENT, (event) => {
            if (event.detail && event.detail.page === Na__AppPages__MODEL) Na__SavedDrawings__Read();
        });

        Na__SavedDrawings__Draw();                                           // <-- Hidden until the first read finds drawings
        Na__SavedDrawings__Read();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Saved Drawings API
    // ------------------------------------------------------------
    export {
        Na__SavedDrawings__Initialize,
        Na__SavedDrawings__Read
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
