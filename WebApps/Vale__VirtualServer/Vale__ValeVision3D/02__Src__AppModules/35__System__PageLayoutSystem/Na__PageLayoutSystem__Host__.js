// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - HOST LINK
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__Host__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Host Link
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : This page's link to ValeVision 3D: the window that holds the
//              picture and the render bridge, the way back to the Model View, and
//              what the app may ask this page
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - INSIDE THE APP (ValeVision3D v2.76.0): this page is the Drawing Editor page
//   of ValeVision 3D, in a frame the app makes (Na__AppPages__DrawingPage__Host__,
//   ?embed=1). The app is window.parent: the picture is left there, the render
//   bridge lives there, and window.Na__PageLayout__AppHost there takes the page
//   back to the Model View. The head's script in Na__PageLayoutSystem__Layout__.html
//   marks the page embedded (na-layout--embedded) before it first paints, and
//   the stylesheet then puts the page's own header away: the app's header and
//   its breadcrumb trail are this page's.
// - A TAB AN OLDER VALEVISION 3D OPENED (window.opener) still works as one,
//   until that 3D tab is reloaded.
// - ON ITS OWN (an old bookmark, a link) the head's script moves the page into
//   the app straight away (?project=<id>&page=drawing): there is no model behind
//   a page on its own to re-render from. ?standalone=1 keeps it on its own.
// - WHAT THE APP ASKS (window.Na__PageLayout__Embed, put up by Expose from the
//   page's boot): Status (a drawing open, saved, savable, which layout), Save
//   (the Drawing Layout section's own save), StandAside (the page is about to be
//   replaced: no close warning), OpenLayout (a saved layout picked in the app's
//   Drawings menu) and LayoutDeleted (one deleted there).
// - A LEAF ON PURPOSE: no imports, so every module of the page can ask it
//   without importing one another.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.76.2)
// - ConfirmDelete: deleting a saved drawing is final, so the word delete has to be
//   typed; inside the app the app's own dialog asks (window.Na__PageLayout__AppHost).
//
// 09-Oct-2026 - Version 1.0.1 (ValeVision3D v2.76.1, notes only)
// - The app asks OpenLayout and LayoutDeleted (its Drawings menu lists the saved
//   layouts now) in place of RevealSaved.
//
// 09-Oct-2026 - Version 1.0.0 (ValeVision3D v2.76.0)
// - Initial build: the page moved from a new browser tab into the app.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | What This Page and the App Share
    // ------------------------------------------------------------
    const Na__PageLayout__Host__EMBEDDED_CLASS = 'na-layout--embedded';             // <-- On <html>, from the head's script
    const Na__PageLayout__Host__PENDING_KEY    = '__Na__PageLayout__PendingImage';   // <-- The picture Create Drawing left
    const Na__PageLayout__Host__BRIDGE_KEY     = 'Na__PageLayout__RenderBridge';     // <-- Re-Render (Na__ImageExport__PageLayoutBridge__)
    const Na__PageLayout__Host__APP_KEY        = 'Na__PageLayout__AppHost';          // <-- Back, IsShown (Na__AppPages__DrawingPage__Host__)
    const Na__PageLayout__Host__EMBED_KEY      = 'Na__PageLayout__Embed';            // <-- What the app asks this page
    const Na__PageLayout__Host__READY_TYPE     = 'Na__PageLayout__Ready';
    const Na__PageLayout__Host__DELETE_WORD    = 'delete';                           // <-- Typed before a saved drawing is deleted for good
    const Na__PageLayout__Host__VERSION        = '1.0.0';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The App Behind This Page
// -----------------------------------------------------------------------------

    // FUNCTION | Is This Page a Page of ValeVision 3D (in Its Frame)?
    // ------------------------------------------------------------
    function Na__PageLayout__Host__IsEmbedded() {
        return document.documentElement.classList.contains(Na__PageLayout__Host__EMBEDDED_CLASS);
    }
    // ------------------------------------------------------------


    // FUNCTION | The ValeVision 3D Window: the App Around This Page, or the Tab That Opened It, or Null
    // ------------------------------------------------------------
    function Na__PageLayout__Host__Window() {
        try {
            if (Na__PageLayout__Host__IsEmbedded()) return window.parent;
            if (window.opener && !window.opener.closed) return window.opener;
        } catch (error) { /* gone, or somewhere it cannot be read */ }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Render Bridge (Re-Render), or Null
    // ------------------------------------------------------------
    function Na__PageLayout__Host__Bridge() {
        try {
            const host   = Na__PageLayout__Host__Window();
            const bridge = host && host[Na__PageLayout__Host__BRIDGE_KEY];
            return (bridge && typeof bridge.Render === 'function') ? bridge : null;
        } catch (error) {
            return null;                                                    // <-- The app went somewhere it cannot be read
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Take the Picture Create Drawing Left (Once: the App's Copy Is Cleared)
    // ------------------------------------------------------------
    function Na__PageLayout__Host__TakePendingImage() {
        try {
            const host = Na__PageLayout__Host__Window();
            if (host && host[Na__PageLayout__Host__PENDING_KEY]) {
                const pending = host[Na__PageLayout__Host__PENDING_KEY];
                host[Na__PageLayout__Host__PENDING_KEY] = null;              // <-- Free the app's memory
                return pending;
            }
        } catch (error) {
            console.warn('[PageLayout] ValeVision 3D could not be read:', error);
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Tell the App the Page Has Its Picture (Its Spinner Goes)
    // ------------------------------------------------------------
    function Na__PageLayout__Host__SignalReady() {
        try {
            const host = Na__PageLayout__Host__Window();
            if (host) host.postMessage({ type : Na__PageLayout__Host__READY_TYPE }, window.location.origin);   // <-- Same origin only
        } catch (error) { /* the app has gone */ }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Way Back, and What the App Asks
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | What the App Offers This Page (Embedded Only), or Null
    // ------------------------------------------------------------
    function Na__PageLayout__Host__App() {
        if (!Na__PageLayout__Host__IsEmbedded()) return null;
        try { return window.parent[Na__PageLayout__Host__APP_KEY] || null; } catch (error) { return null; }
    }
    // ------------------------------------------------------------


    // FUNCTION | Back to the Model View (true when the app took it; the drawing stays as it is)
    // ------------------------------------------------------------
    function Na__PageLayout__Host__BackToModel() {
        const app = Na__PageLayout__Host__App();
        if (!app || typeof app.Back !== 'function') return false;
        try {
            app.Back();
            return true;
        } catch (error) {
            return false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This Page on Screen? (a Page Put Away Behind the Model View Is Not)
    // ------------------------------------------------------------
    function Na__PageLayout__Host__IsShown() {
        const app = Na__PageLayout__Host__App();
        if (!app || typeof app.IsShown !== 'function') return true;         // <-- A tab of its own is always on screen
        try { return app.IsShown() === true; } catch (error) { return true; }
    }
    // ------------------------------------------------------------


    // FUNCTION | Ask Before a Saved Drawing Is Deleted for Good: the Word Delete Typed (Promise<boolean>)
    // ------------------------------------------------------------
    // Inside the app the app asks (its dialog, the same question its Drawings
    // menu asks). In a tab of its own, the browser's prompt asks the same.
    // ------------------------------------------------------------
    function Na__PageLayout__Host__ConfirmDelete(name) {
        const label = String(name || '').trim() || 'this drawing';
        const app   = Na__PageLayout__Host__App();
        if (app && typeof app.ConfirmDelete === 'function') {
            try {
                return Promise.resolve(app.ConfirmDelete(label)).then((yes) => yes === true, () => false);
            } catch (error) { /* the browser's prompt below */ }
        }
        const typed = window.prompt(`Delete ${label}?\n\nThis permanently deletes the drawing: its layout, picture and thumbnail are removed from the Vale Cloud. It cannot be undone.\n\nType ${Na__PageLayout__Host__DELETE_WORD} to confirm.`, '');
        return Promise.resolve(String(typed || '').trim().toLowerCase() === Na__PageLayout__Host__DELETE_WORD);
    }
    // ------------------------------------------------------------


    // FUNCTION | Answer the App: Status, Save, StandAside, OpenLayout, LayoutDeleted (Embedded Only)
    // ------------------------------------------------------------
    function Na__PageLayout__Host__Expose(answers) {
        if (!Na__PageLayout__Host__IsEmbedded() || !answers) return;
        window[Na__PageLayout__Host__EMBED_KEY] = Object.freeze(Object.assign({ Version : Na__PageLayout__Host__VERSION }, answers));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Host Link API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__Host__IsEmbedded,
        Na__PageLayout__Host__Window,
        Na__PageLayout__Host__Bridge,
        Na__PageLayout__Host__TakePendingImage,
        Na__PageLayout__Host__SignalReady,
        Na__PageLayout__Host__BackToModel,
        Na__PageLayout__Host__IsShown,
        Na__PageLayout__Host__ConfirmDelete,
        Na__PageLayout__Host__Expose
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
