// =============================================================================
// VALEVISION3D - APP PAGES - NAVIGATION
// =============================================================================
//
// FILE       : Na__AppPages__Navigation__.js
// NAMESPACE  : Na__AppPages
// MODULE     : App Pages - Navigation
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The app's pages in one window: the 3D Model View and the pages
//              that open over it (the Drawing Editor), each with its own address,
//              Back and Forward, the Alt keys and the breadcrumb trail
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - ONE WINDOW, NO NEW TABS (Adam, 09-Oct-2026): "Stop random browser tabs
//   opening, keep everything navigable via the main app". A page opens over the
//   3D Model View in this window, the way ValeVision Gallery moves on to
//   ValeVision 3D, while the model waits underneath with its rendering paused
//   (each page's own module does that: Na__AppPages__DrawingPage__Host__).
// - EVERY PAGE HAS AN ADDRESS. The Model View is ?project=<id>; a page adds
//   &page=<name>, e.g. ?project=64435__Harris&page=drawing. Opening a page
//   pushes a history entry, so the browser's Back and Forward, a mouse's side
//   buttons and the keys below all move between the pages.
// - THE KEYS (Adam, 09-Oct-2026), on every page and inside a page's own frame:
//     Alt+Left        Back      (from the Model View: the page before it, often ValeVision Gallery)
//     Alt+Right       Forward   (to a page left with Back: it is just as it was)
//     Alt+Backspace   Back
//   They are taken first (the capture phase), so the 3D view's Alt+arrow camera
//   nudge gives way to them; the fine nudge stays on Alt+W/A/S/D and Alt+Up /
//   Alt+Down. They are left alone in a text box (on a Mac, Option+Backspace
//   deletes a word and Option+arrow moves by one), while a dialog is open, and
//   on the Layout Editor's drawing and document tabs, which keep their own keys.
// - BACK FROM A PAGE is a real step back when this window pushed the entry. A
//   page reached by its address (a reload, a link) has no Model View entry of
//   this window behind it, so Back shows the Model View in place rather than
//   leaving the app.
// - THE BREADCRUMB TRAIL follows the page: "... / Model View" on the model and
//   "... / Model View / Drawing Editor" on a page, Model View being a link back
//   (Na__Feature__BreadcrumbNav__SetPage).
//
// INTEGRATION:
// - Each page registers itself (Na__AppPages__Register) with show and hide, and
//   optionally boot: asked once when the app starts on the page's address, it
//   answers (or resolves) true when the page can be shown, false to start on
//   the Model View instead.
// - index.html calls Na__AppPages__Initialize() once every page has registered.
// - Window event na-app-page-changed { page, previous } after every change of
//   page (Na__AppUtils__ActivityLog__ reports the Drawing Editor opening).
// - Na__AppPages__InstallKeys(frame.contentWindow) gives a page's frame the keys.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.0.0 (ValeVision3D v2.76.0)
// - Initial build with the Drawing Editor page (Create Drawing no longer opens a
//   browser tab).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Which Keyboard Is Live, the Typing Test
    // ------------------------------------------------------------
    import {
        Na__KeyScope__MODEL,
        Na__KeyScope__PAGE,
        Na__KeyScope__Get,
        Na__KeyScope__IsTypingTarget
    } from '../03__AppUtils/Na__AppUtils__KeyScope__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Breadcrumb Trail's Page Crumb
    // ------------------------------------------------------------
    import { Na__Feature__BreadcrumbNav__SetPage } from '../64__Feature__BreadcrumbNav/Na__Feature__BreadcrumbNav__Controls.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Model View, the Address, the History Entries
    // ------------------------------------------------------------
    const Na__AppPages__MODEL     = 'model';                                 // <-- The 3D Model View: the app as it starts
    const Na__AppPages__PARAM     = 'page';                                  // <-- ?project=<id>&page=<name>
    const Na__AppPages__STATE_KEY = 'Na__AppPages';                          // <-- This module's part of history.state
    const Na__AppPages__EVENT     = 'na-app-page-changed';
    const Na__AppPages__WAIT_MS   = 4000;                                    // <-- WhenShown gives up after this
    const Na__AppPages__DOC_ID    = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);   // <-- This load of the app: an entry an earlier load pushed is never stepped back to in place
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Pages, the One Up Now
    // ------------------------------------------------------------
    const Na__AppPages__Pages   = new Map();                                 // <-- name -> { label, show, hide, boot }
    let   Na__AppPages__Current = Na__AppPages__MODEL;
    let   Na__AppPages__Started = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Page This Address Names (the Model View when it names none we know)
    // ------------------------------------------------------------
    function Na__AppPages__PageFromUrl() {
        try {
            const name = new URLSearchParams(window.location.search).get(Na__AppPages__PARAM) || '';
            return Na__AppPages__Pages.has(name) ? name : Na__AppPages__MODEL;
        } catch (error) {
            return Na__AppPages__MODEL;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Did This Load of the App Push the Entry We Are On?
    // ------------------------------------------------------------
    function Na__AppPages__OnOwnEntry() {
        const state = window.history.state;
        const ours  = state && state[Na__AppPages__STATE_KEY];
        return !!ours && ours.doc === Na__AppPages__DOC_ID;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Is a Dialog Waiting for an Answer in This Document?
    // ------------------------------------------------------------
    // The shared confirm dialog, a page's own question: anything marked
    // aria-modal that is on screen. A question is answered before the page
    // moves out from under it.
    // ------------------------------------------------------------
    function Na__AppPages__IsDialogOpen(doc) {
        try {
            return Array.prototype.some.call(doc.querySelectorAll('[aria-modal="true"]'),
                (element) => !element.hidden && element.getClientRects().length > 0);
        } catch (error) {
            return false;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Trail Names the Page That Is Up
    // ------------------------------------------------------------
    function Na__AppPages__SyncBreadcrumb() {
        const page = Na__AppPages__Pages.get(Na__AppPages__Current);
        Na__Feature__BreadcrumbNav__SetPage(page ? {
            label     : page.label,
            modelHref : Na__AppPages__PageUrl(Na__AppPages__MODEL),
            onModel   : () => Na__AppPages__Back()
        } : null);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put Up a Page Without Touching the History
    // ------------------------------------------------------------
    // The one place a page changes: the page going away hides first, then the
    // new one shows, then the trail and the event follow.
    // ------------------------------------------------------------
    function Na__AppPages__Show(name) {
        const next = Na__AppPages__Pages.has(name) ? name : Na__AppPages__MODEL;
        if (next === Na__AppPages__Current) return false;

        const previous = Na__AppPages__Current;
        const leaving  = Na__AppPages__Pages.get(previous);
        const entering = Na__AppPages__Pages.get(next);

        if (leaving) {
            try { leaving.hide(); } catch (error) { console.error(`[AppPages] Leaving the ${previous} page failed:`, error); }
        }
        Na__AppPages__Current = next;
        if (entering) {
            try { entering.show(); } catch (error) { console.error(`[AppPages] Opening the ${next} page failed:`, error); }
        }

        Na__AppPages__SyncBreadcrumb();
        window.dispatchEvent(new CustomEvent(Na__AppPages__EVENT, { detail : { page : next, previous } }));
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Alt+Left, Alt+Right and Alt+Backspace (Capture Phase)
    // ------------------------------------------------------------
    function Na__AppPages__OnKey(event) {
        if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;   // <-- Alt on its own
        const back    = event.key === 'ArrowLeft' || event.key === 'Backspace';
        const forward = event.key === 'ArrowRight';
        if (!back && !forward) return;

        if (Na__KeyScope__IsTypingTarget(event.target)) return;              // <-- The text box's own key
        const scope = Na__KeyScope__Get();
        if (scope !== Na__KeyScope__MODEL && scope !== Na__KeyScope__PAGE) return;   // <-- The Layout Editor's drawing and document tabs keep theirs
        const doc = (event.target && event.target.ownerDocument) || document;
        if (Na__AppPages__IsDialogOpen(doc) || (doc !== document && Na__AppPages__IsDialogOpen(document))) return;

        event.preventDefault();                                              // <-- Not the browser's own step as well
        event.stopImmediatePropagation();                                    // <-- Nor the 3D view's Alt+arrow camera nudge
        if (event.repeat) return;                                            // <-- Held down: one step, not a run of them

        if (forward) Na__AppPages__Forward();
        else         Na__AppPages__Back();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Add a Page (show, hide, and boot for an app started on its address)
    // ------------------------------------------------------------
    function Na__AppPages__Register(name, page) {
        const key = String(name || '');
        if (!key || key === Na__AppPages__MODEL) return false;
        if (!page || typeof page.show !== 'function' || typeof page.hide !== 'function') return false;
        Na__AppPages__Pages.set(key, {
            label : String(page.label || key),
            show  : page.show,
            hide  : page.hide,
            boot  : (typeof page.boot === 'function') ? page.boot : null
        });
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Page's Address (the Model View's for none), the Rest of the Query Kept
    // ------------------------------------------------------------
    function Na__AppPages__PageUrl(name) {
        const url = new URL(window.location.href);
        if (name && name !== Na__AppPages__MODEL) url.searchParams.set(Na__AppPages__PARAM, name);
        else                                      url.searchParams.delete(Na__AppPages__PARAM);
        return url.pathname + url.search + url.hash;
    }
    // ------------------------------------------------------------


    // FUNCTION | Which Page Is Up ('model' or a page's name)
    // ------------------------------------------------------------
    function Na__AppPages__CurrentPage() {
        return Na__AppPages__Current;
    }
    // ------------------------------------------------------------


    // FUNCTION | Open a Page, With a History Entry for Back to Return Through
    // ------------------------------------------------------------
    function Na__AppPages__Go(name) {
        if (!Na__AppPages__Pages.has(name)) return false;
        if (name === Na__AppPages__Current) return true;
        const state = { [Na__AppPages__STATE_KEY] : { doc : Na__AppPages__DOC_ID, page : name, from : Na__AppPages__Current } };
        try {
            window.history.pushState(state, '', Na__AppPages__PageUrl(name));
        } catch (error) {
            console.warn('[AppPages] The address could not change; the page opens anyway:', error);
        }
        Na__AppPages__Show(name);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Back: the Page Before, or the Model View in Place
    // ------------------------------------------------------------
    // From the Model View it is the browser's own Back (the page before the
    // app, often ValeVision Gallery). From a page this window opened it is a
    // step back through history (popstate puts the page up). From a page the
    // app started on there is nothing of ours behind it, so the address is
    // swapped for the Model View's and the model shown, still in the app.
    // ------------------------------------------------------------
    function Na__AppPages__Back() {
        if (Na__AppPages__Current === Na__AppPages__MODEL || Na__AppPages__OnOwnEntry()) {
            window.history.back();
            return;
        }
        try {
            window.history.replaceState(null, '', Na__AppPages__PageUrl(Na__AppPages__MODEL));
        } catch (error) { /* the model is shown anyway */ }
        Na__AppPages__Show(Na__AppPages__MODEL);
    }
    // ------------------------------------------------------------


    // FUNCTION | Forward: Back to a Page Left With Back
    // ------------------------------------------------------------
    function Na__AppPages__Forward() {
        window.history.forward();
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Once a Page Is Up (true), or After WAIT_MS (whether it is)
    // ------------------------------------------------------------
    function Na__AppPages__WhenShown(name) {
        const want = Na__AppPages__Pages.has(name) ? name : Na__AppPages__MODEL;
        if (Na__AppPages__Current === want) return Promise.resolve(true);
        return new Promise((resolve) => {
            const onChange = () => {
                if (Na__AppPages__Current !== want) return;
                clearTimeout(timer);
                window.removeEventListener(Na__AppPages__EVENT, onChange);
                resolve(true);
            };
            const timer = setTimeout(() => {
                window.removeEventListener(Na__AppPages__EVENT, onChange);
                resolve(Na__AppPages__Current === want);
            }, Na__AppPages__WAIT_MS);
            window.addEventListener(Na__AppPages__EVENT, onChange);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Give a Window the Alt Keys (this one, a page's frame)
    // ------------------------------------------------------------
    // The keys of a page in a frame go to the frame's own document, so the
    // frame's window gets the same listener, in the capture phase, before
    // anything of the page's own.
    // ------------------------------------------------------------
    function Na__AppPages__InstallKeys(targetWindow) {
        const win = targetWindow || window;
        try {
            if (win.__Na__AppPages__KeysInstalled === true) return;
            win.addEventListener('keydown', Na__AppPages__OnKey, true);
            win.__Na__AppPages__KeysInstalled = true;
        } catch (error) { /* a frame this app cannot reach keeps its keys to itself */ }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Start: the Keys, Back and Forward, and the Page the Address Names
    // ------------------------------------------------------------
    function Na__AppPages__Initialize() {
        if (Na__AppPages__Started) return;
        Na__AppPages__Started = true;

        Na__AppPages__InstallKeys(window);
        window.addEventListener('popstate', () => Na__AppPages__Show(Na__AppPages__PageFromUrl()));   // <-- Back, Forward, the mouse's side buttons
        Na__AppPages__SyncBreadcrumb();

        // STARTED ON A PAGE'S ADDRESS (a reload, a link) | The page says when it can come up
        // ------------------------------------------------------------
        const start = Na__AppPages__PageFromUrl();
        if (start === Na__AppPages__MODEL) return;
        const page  = Na__AppPages__Pages.get(start);
        const ready = page.boot ? Promise.resolve().then(() => page.boot()) : Promise.resolve(true);
        ready.then((canShow) => {
            if (Na__AppPages__PageFromUrl() !== start) return;               // <-- Moved on meanwhile
            if (canShow) {
                Na__AppPages__Show(start);
                return;
            }
            try { window.history.replaceState(null, '', Na__AppPages__PageUrl(Na__AppPages__MODEL)); } catch (error) { /* the model stays up */ }
        }).catch((error) => console.warn(`[AppPages] The ${start} page could not open:`, error));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | App Pages Navigation API
    // ------------------------------------------------------------
    export {
        Na__AppPages__MODEL,
        Na__AppPages__EVENT,
        Na__AppPages__Register,
        Na__AppPages__Initialize,
        Na__AppPages__PageUrl,
        Na__AppPages__CurrentPage,
        Na__AppPages__Go,
        Na__AppPages__Back,
        Na__AppPages__Forward,
        Na__AppPages__WhenShown,
        Na__AppPages__InstallKeys
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
