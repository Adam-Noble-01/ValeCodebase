// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - UI NOTIFY (TOASTS AND PAGE EVENTS)
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__UiNotify__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : UI Notify
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : One toast for the page, and the page's own events, so the
//              side menu's sections hear about each other without importing
//              each other
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - TOAST: a short message bottom left of the sheet; red for a failure.
// - SYNCED TOAST (Adam, 09-Oct-2026): the confirmation every save button shows
//   once the server has the layout: a green card with a tick, "Synced to the Vale
//   Cloud", and a line saying what was saved, to which job, and when.
// - EVENTS: Emit(name, detail) / On(name, fn), carried as 'na-pagelayout-<name>'
//   CustomEvents on window. The names the page uses:
//     changed          the layout differs from what was saved (detail.what:
//                      'image', 'guide', 'name', 'render'; detail.coalesce
//                      joins a run of them into one undo step)
//     history          an undo or redo put an earlier drawing back
//                      (Na__PageLayoutSystem__UndoHistory__)
//     guide            the guide moved or was switched (the menu re-reads it)
//     image            a new picture is on the sheet (re-render or open)
//     layout           a saved layout was opened, saved, or forgotten
//     user             someone signed in or out
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.75.1)
// - SyncedToast: the Vale Cloud confirmation for every save button.
//
// 09-Oct-2026 - Version 1.0.0
// - Initial build with the side menu (ValeVision3D v2.75.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Toast and Events
    // ------------------------------------------------------------
    const Na__PageLayout__TOAST_ID        = 'naLayoutToast';
    const Na__PageLayout__TOAST_VISIBLE   = 'na-layout-toast--visible';
    const Na__PageLayout__TOAST_ERROR     = 'na-layout-toast--error';
    const Na__PageLayout__TOAST_SYNCED    = 'na-layout-toast--synced';
    const Na__PageLayout__TOAST_MS        = 3500;
    const Na__PageLayout__TOAST_ERROR_MS  = 6000;
    const Na__PageLayout__TOAST_SYNCED_MS = 5000;
    const Na__PageLayout__EVENT_PREFIX    = 'na-pagelayout-';
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Toast's Timer
    // ------------------------------------------------------------
    let Na__PageLayout__ToastTimer = null;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Toast
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Show the Toast Element Now, Then Hide It After a While
    // ------------------------------------------------------------
    function Na__PageLayout__ShowToastFor(toast, holdMs) {
        toast.classList.remove(Na__PageLayout__TOAST_VISIBLE);
        void toast.offsetWidth;                                               // <-- Reflow, so a repeat message animates again
        toast.classList.add(Na__PageLayout__TOAST_VISIBLE);

        clearTimeout(Na__PageLayout__ToastTimer);
        Na__PageLayout__ToastTimer = setTimeout(() => {
            toast.classList.remove(Na__PageLayout__TOAST_VISIBLE);
        }, holdMs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Show a Short Message (Red for a Failure)
    // ------------------------------------------------------------
    function Na__PageLayout__Toast(message, isError) {
        const toast = document.getElementById(Na__PageLayout__TOAST_ID);
        if (!toast) {
            (isError ? console.warn : console.log)('[PageLayout]', message);
            return;
        }
        toast.textContent = String(message || '');
        toast.classList.remove(Na__PageLayout__TOAST_SYNCED);
        toast.classList.toggle(Na__PageLayout__TOAST_ERROR, isError === true);
        Na__PageLayout__ShowToastFor(toast, isError ? Na__PageLayout__TOAST_ERROR_MS : Na__PageLayout__TOAST_MS);
    }
    // ------------------------------------------------------------


    // FUNCTION | Confirm a Save Reached the Server: Tick, "Synced to the Vale Cloud", What and When
    // ------------------------------------------------------------
    // title: the headline (default "Synced to the Vale Cloud"); detail: one line
    // under it, e.g. "Rear view saved to job 64435 Harris at 09:42".
    // ------------------------------------------------------------
    function Na__PageLayout__SyncedToast(detail, title) {
        const toast = document.getElementById(Na__PageLayout__TOAST_ID);
        if (!toast) {
            console.log('[PageLayout]', title || 'Synced to the Vale Cloud', detail || '');
            return;
        }
        toast.textContent = '';
        toast.classList.remove(Na__PageLayout__TOAST_ERROR);
        toast.classList.add(Na__PageLayout__TOAST_SYNCED);

        const tick = document.createElement('span');
        tick.className = 'na-layout-toast__tick';                            // <-- Drawn by the stylesheet (a tick in a circle)
        tick.setAttribute('aria-hidden', 'true');
        const words = document.createElement('span');
        words.className = 'na-layout-toast__words';
        const head = document.createElement('span');
        head.className = 'na-layout-toast__title';
        head.textContent = title || 'Synced to the Vale Cloud';
        words.appendChild(head);
        if (detail) {
            const line = document.createElement('span');
            line.className = 'na-layout-toast__detail';
            line.textContent = String(detail);
            words.appendChild(line);
        }
        toast.appendChild(tick);
        toast.appendChild(words);
        Na__PageLayout__ShowToastFor(toast, Na__PageLayout__TOAST_SYNCED_MS);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Page Events
// -----------------------------------------------------------------------------

    // FUNCTION | Announce Something to the Rest of the Page
    // ------------------------------------------------------------
    function Na__PageLayout__Emit(name, detail) {
        window.dispatchEvent(new CustomEvent(Na__PageLayout__EVENT_PREFIX + name, { detail : detail || {} }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Listen for One of the Page's Events
    // ------------------------------------------------------------
    function Na__PageLayout__On(name, handler) {
        if (typeof handler !== 'function') return;
        window.addEventListener(Na__PageLayout__EVENT_PREFIX + name, (event) => handler(event.detail || {}));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | UI Notify API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__Toast,
        Na__PageLayout__SyncedToast,
        Na__PageLayout__Emit,
        Na__PageLayout__On
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
