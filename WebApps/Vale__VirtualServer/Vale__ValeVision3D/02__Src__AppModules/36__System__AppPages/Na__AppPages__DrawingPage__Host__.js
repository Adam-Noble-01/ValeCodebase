// =============================================================================
// VALEVISION3D - APP PAGES - DRAWING EDITOR PAGE (HOST)
// =============================================================================
//
// FILE       : Na__AppPages__DrawingPage__Host__.js
// NAMESPACE  : Na__DrawingPage
// MODULE     : App Pages - Drawing Editor Page
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Open the Drawing Editor (LayoutVision 2D, the Create Drawing page)
//              as a page of this app over the 3D Model View, with the model's
//              rendering paused while it is up
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - IT WAS A NEW BROWSER TAB FOR EVERY DRAWING (to v2.75.4). Create Drawing opened
//   a blank tab, rendered, left the picture on window.__Na__PageLayout__PendingImage
//   and sent the tab to the page, which took it through window.opener; Saved
//   Drawings opened another tab; the page's Close called window.close(); and the 3D
//   tab went on rendering behind all of them. Adam, 09-Oct-2026: keep everything in
//   the app, and pause the model while the drawing is being edited.
// - NOW A PAGE OF THIS WINDOW, at ?project=<id>&page=drawing
//   (Na__AppPages__Navigation__: Back, Forward, Alt+Left / Alt+Right /
//   Alt+Backspace, the breadcrumb trail). The page itself is the same
//   Na__PageLayoutSystem__Layout__.html, in a frame that fills the window under the
//   app's header (embed=1 puts its own header away), so its styles, its keys and its
//   element ids stay its own and never meet the 3D app's.
// - THE MODEL WAITS UNDERNEATH: while the page is up the render loop is held
//   ('drawing-editor'), the 3D canvas is hidden (by visibility, so its size and the
//   offscreen renders a Re-Render makes survive), the 3D menus and panels are put
//   away (Na__AppPages__Styles__.css) and the 3D keyboard stands down
//   (Na__KeyScope__Hold). The view that was left - Orbit, Walk, Fly, a plan or an
//   elevation - is not touched, so a Re-Render of a drawing made in an elevation
//   still finds the elevation, and the Model View comes back exactly as it was.
// - BACK TO THE MODEL VIEW KEEPS THE DRAWING (Adam, 09-Oct-2026): the frame stays,
//   put away, and Forward (Alt+Right), or Open on its card in the Drawings menu,
//   brings it back as it was.
// - THE DRAWINGS MENU'S SAVED LAYOUTS (v2.76.1, Na__AppPages__SavedDrawings__):
//   Open puts a saved layout on the editor's sheet (OpenLayout: the page's own
//   open, with its own question when its sheet has unsaved changes; a new page
//   starts on it with ?layout=<id>); a Delete there is passed on (LayoutDeleted).
// - A NEW DRAWING REPLACES IT. When the open one has changes not on the Vale Cloud,
//   Create Drawing asks first (ConfirmNewDrawing): Save and Start New (the page
//   comes up and saves through its own Save Drawing, so its checks and questions
//   are seen; then the new picture is rendered), Discard and Start New, or Cancel.
//   Someone who cannot save is only asked whether to replace it.
// - THE PICTURE is still handed over on window.__Na__PageLayout__PendingImage, now
//   read by the frame through window.parent, and the frame still says it has it
//   with the Na__PageLayout__Ready message (checked to come from the frame).
// - TWO SMALL APIS BETWEEN THEM: window.Na__PageLayout__AppHost here (Back, for the
//   page's Back to Model View; IsShown; ConfirmDelete, the type-delete question)
//   and window.Na__PageLayout__Embed in the
//   frame (Status, Save, StandAside, OpenLayout, LayoutDeleted:
//   Na__PageLayoutSystem__Layout__.html).
//
// INTEGRATION:
// - index.html: Na__DrawingPage__Initialize({ leaveLayoutEditor : Na__LeLoad__Leave })
//   before Na__AppPages__Initialize().
// - Create Drawing (Na__UiFeature__ImageExport__Controls): ConfirmNewDrawing, then
//   OpenPicture. The Drawings menu's saved layouts (Na__AppPages__SavedDrawings__):
//   OpenLayout, OpenedLayoutId, LayoutDeleted.
// - The render bridge (window.Na__PageLayout__RenderBridge) is unchanged: the frame
//   finds it on window.parent instead of window.opener.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.2.0 (ValeVision3D v2.76.2)
// - ConfirmDelete: deleting a saved drawing is final, so the word delete has to be
//   typed. The Drawings menu asks it here, and the Drawing Editor through
//   window.Na__PageLayout__AppHost.ConfirmDelete, so both ask the same question.
//
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.76.1)
// - OpenLayout, OpenedLayoutId and LayoutDeleted for the Drawings menu's saved
//   layouts; OpenSaved went with the Saved Drawings button it served.
//
// 09-Oct-2026 - Version 1.0.0 (ValeVision3D v2.76.0)
// - Initial build: the Create Drawing page moved from a new browser tab into the
//   app, with the 3D render paused while it is up.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The App's Pages
    // @delegate: ./Na__AppPages__Navigation__.js
    // ------------------------------------------------------------
    import {
        Na__AppPages__MODEL,
        Na__AppPages__Register,
        Na__AppPages__CurrentPage,
        Na__AppPages__Go,
        Na__AppPages__Back,
        Na__AppPages__WhenShown,
        Na__AppPages__InstallKeys
    } from './Na__AppPages__Navigation__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Render Loop Hold, the 3D Keyboard, the Question Box
    // ------------------------------------------------------------
    import { Na__RenderLoop__Pause, Na__RenderLoop__Resume, Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    import { Na__KeyScope__Hold, Na__KeyScope__Release } from '../03__AppUtils/Na__AppUtils__KeyScope__.js';
    import { Na__AppUtils__ConfirmDialog__Choose } from '../03__AppUtils/Na__AppUtils__ConfirmDialog.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Page's Address, This Job
    // @delegate: ../30__System__ImageExport/Na__ImageExport__PageLayoutHandoff__.js
    // ------------------------------------------------------------
    import {
        Na__PageLayoutHandoff__LayoutPageUrl,
        Na__PageLayoutHandoff__ProjectId
    } from '../30__System__ImageExport/Na__ImageExport__PageLayoutHandoff__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Page
    // ------------------------------------------------------------
    const Na__DrawingPage__NAME        = 'drawing';                          // <-- ?project=<id>&page=drawing
    const Na__DrawingPage__LABEL       = 'Drawing Editor';                   // <-- Its crumb in the trail
    const Na__DrawingPage__TITLE       = 'LayoutVision 2D';                  // <-- The header's title while it is up
    const Na__DrawingPage__WINDOW_NAME = 'LayoutVision 2D | Page Layout';    // <-- The window's title while it is up (the tab's, before)
    const Na__DrawingPage__VERSION     = '1.1.0';                            // <-- window.Na__PageLayout__AppHost's (ConfirmDelete since 1.1.0)
    // ------------------------------------------------------------

    // MODULE CONSTANTS | DOM Ids, Classes, Holds
    // ------------------------------------------------------------
    const Na__DrawingPage__HOST_ID     = 'naDrawingPageHost';
    const Na__DrawingPage__FRAME_ID    = 'naDrawingPageFrame';
    const Na__DrawingPage__SHOWN_CLASS = 'is-shown';
    const Na__DrawingPage__BODY_CLASS  = 'na-app-page--active';              // <-- The stylesheet puts the 3D menus and panels away
    const Na__DrawingPage__CANVAS_ID   = 'renderCanvas';
    const Na__DrawingPage__TITLE_SEL   = '.app-header__title';
    const Na__DrawingPage__HOLD        = 'drawing-editor';                   // <-- The render loop's and the key scope's hold
    // ------------------------------------------------------------

    // MODULE CONSTANTS | What the Frame and This Window Share
    // ------------------------------------------------------------
    const Na__DrawingPage__PENDING_KEY = '__Na__PageLayout__PendingImage';   // <-- The picture, taken (and cleared) by the frame
    const Na__DrawingPage__HOST_KEY    = 'Na__PageLayout__AppHost';          // <-- What the frame calls here
    const Na__DrawingPage__EMBED_KEY   = 'Na__PageLayout__Embed';            // <-- What the frame answers
    const Na__DrawingPage__READY_TYPE  = 'Na__PageLayout__Ready';
    const Na__DrawingPage__READY_MS    = 8000;                               // <-- The spinner goes after this even without the frame's word
    const Na__DrawingPage__SAVED_MS    = 900;                                // <-- Save and Start New: Drawing Saved is seen before the model comes back
    const Na__DrawingPage__DELETE_WORD = 'delete';                           // <-- Typed before a saved drawing is deleted for good
    const Na__DrawingPage__SCENE_EVENT = 'na-app-scene-ready';
    // ------------------------------------------------------------

    // MODULE VARIABLES | The Host, the Frame, Whether It Is Up
    // ------------------------------------------------------------
    let Na__DrawingPage__Host    = null;
    let Na__DrawingPage__Frame   = null;
    let Na__DrawingPage__Shown   = false;
    let Na__DrawingPage__Titles  = null;                                     // <-- { window, header } while the page is up
    let Na__DrawingPage__Options = { leaveLayoutEditor : null };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | What the Frame Answers (null until its page has started)
    // ------------------------------------------------------------
    function Na__DrawingPage__Embed() {
        try {
            const win = Na__DrawingPage__Frame && Na__DrawingPage__Frame.contentWindow;
            return (win && win[Na__DrawingPage__EMBED_KEY]) || null;
        } catch (error) {
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Open Drawing: { hasPicture, dirty, unsaved, canSave, saved, name } or null
    // ------------------------------------------------------------
    function Na__DrawingPage__Status() {
        const embed = Na__DrawingPage__Embed();
        if (!embed || typeof embed.Status !== 'function') return null;
        try { return embed.Status() || null; } catch (error) { return null; }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Shut the 3D Menus (as the Layout Editor does: they come back shut)
    // ------------------------------------------------------------
    function Na__DrawingPage__CloseModelMenus() {
        document.querySelectorAll('.na-dropdown-menu__details[open]').forEach((details) => { details.open = false; });
        document.querySelectorAll('.na-dropdown-menu__panel.is-open').forEach((panel) => { panel.classList.remove('is-open'); });
        document.querySelectorAll('.na-dropdown-menu__button[aria-expanded="true"]').forEach((button) => { button.setAttribute('aria-expanded', 'false'); });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Header's and the Window's Titles Follow the Page
    // ------------------------------------------------------------
    function Na__DrawingPage__SetTitles(onPage) {
        const header = document.querySelector(Na__DrawingPage__TITLE_SEL);
        if (onPage) {
            if (!Na__DrawingPage__Titles) {
                Na__DrawingPage__Titles = { window : document.title, header : header ? header.textContent : '' };
            }
            document.title = Na__DrawingPage__WINDOW_NAME;
            if (header) header.textContent = Na__DrawingPage__TITLE;
            return;
        }
        if (!Na__DrawingPage__Titles) return;
        document.title = Na__DrawingPage__Titles.window;
        if (header) header.textContent = Na__DrawingPage__Titles.header;
        Na__DrawingPage__Titles = null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Keyboard Goes to the Page
    // ------------------------------------------------------------
    function Na__DrawingPage__FocusFrame() {
        const frame = Na__DrawingPage__Frame;
        if (!frame) return;
        try {
            frame.focus();
            if (frame.contentWindow) frame.contentWindow.focus();
        } catch (error) { /* the first click on the page gives it the keys */ }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Host, Built Once and Kept (Put Away Until the Page Is Up)
    // ------------------------------------------------------------
    function Na__DrawingPage__BuildHost() {
        if (Na__DrawingPage__Host) return Na__DrawingPage__Host;
        const host = document.createElement('div');
        host.id        = Na__DrawingPage__HOST_ID;
        host.className = 'na-app-page na-app-page--drawing';
        host.inert     = true;                                               // <-- Nothing in it takes the focus or a click while it is away
        document.body.appendChild(host);
        Na__DrawingPage__Host = host;
        return host;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Fresh Page in a Fresh Frame (the Old Drawing Goes With Its Frame)
    // ------------------------------------------------------------
    // params: the page's extra query, e.g. { open : 'saved' }. A new frame,
    // never a new address in the old one: a frame's first load adds nothing to
    // the history, so Back and Forward only ever step between the app's pages.
    // ------------------------------------------------------------
    function Na__DrawingPage__NewFrame(params) {
        const host = Na__DrawingPage__BuildHost();
        if (Na__DrawingPage__Frame) {
            const embed = Na__DrawingPage__Embed();
            if (embed && typeof embed.StandAside === 'function') {
                try { embed.StandAside(); } catch (error) { /* it goes anyway */ }
            }
            Na__DrawingPage__Frame.remove();                                 // <-- Asked about first, where it mattered (ConfirmNewDrawing)
            Na__DrawingPage__Frame = null;
        }

        const frame = document.createElement('iframe');
        frame.id        = Na__DrawingPage__FRAME_ID;
        frame.className = 'na-app-page__frame';
        frame.title     = Na__DrawingPage__LABEL;
        frame.addEventListener('load', () => Na__AppPages__InstallKeys(frame.contentWindow));   // <-- Alt+Left / Right / Backspace from inside the page too
        frame.src = Na__PageLayoutHandoff__LayoutPageUrl(Object.assign({ embed : '1' }, params || {}));
        host.appendChild(frame);
        Na__DrawingPage__Frame = frame;
        return frame;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve When the Frame Says It Has Its Picture (false After READY_MS)
    // ------------------------------------------------------------
    // Called in the same turn as NewFrame, before the frame can have loaded.
    // ------------------------------------------------------------
    function Na__DrawingPage__WaitReady(frame) {
        return new Promise((resolve) => {
            let settled = false;
            const finish = (ready) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                window.removeEventListener('message', onMessage);
                resolve(ready);
            };
            const onMessage = (event) => {
                if (event.origin !== window.location.origin) return;
                if (!frame.contentWindow || event.source !== frame.contentWindow) return;   // <-- This frame's word, nobody else's
                if (event.data && event.data.type === Na__DrawingPage__READY_TYPE) finish(true);
            };
            const timer = setTimeout(() => finish(false), Na__DrawingPage__READY_MS);
            window.addEventListener('message', onMessage);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Once the Model Is Loaded and On Screen
    // ------------------------------------------------------------
    function Na__DrawingPage__WhenModelReady() {
        const canvas = document.getElementById(Na__DrawingPage__CANVAS_ID);
        if (canvas && canvas.classList.contains('canvas-visible')) return Promise.resolve(true);
        return new Promise((resolve) => {
            window.addEventListener(Na__DrawingPage__SCENE_EVENT, () => resolve(true), { once : true });
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Page Going Up and Away
// -----------------------------------------------------------------------------

    // FUNCTION | Put the Page Up, the Model's Rendering Paused Underneath
    // ------------------------------------------------------------
    function Na__DrawingPage__Show() {
        const host = Na__DrawingPage__BuildHost();
        if (!Na__DrawingPage__Frame) Na__DrawingPage__NewFrame({ open : 'saved' });   // <-- Reached with nothing open (Forward, its address): the job's saved layouts
        if (Na__DrawingPage__Shown) return;
        Na__DrawingPage__Shown = true;

        if (typeof Na__DrawingPage__Options.leaveLayoutEditor === 'function') {
            try { Na__DrawingPage__Options.leaveLayoutEditor(); } catch (error) { /* the page comes up regardless */ }   // <-- One page at a time over the model
        }
        Na__DrawingPage__CloseModelMenus();
        document.body.classList.add(Na__DrawingPage__BODY_CLASS);
        const canvas = document.getElementById(Na__DrawingPage__CANVAS_ID);
        if (canvas) canvas.style.visibility = 'hidden';                      // <-- Alive and sized: a Re-Render renders offscreen from it
        Na__RenderLoop__Pause(Na__DrawingPage__HOLD);                        // <-- No frames while the drawing is edited
        Na__KeyScope__Hold(Na__DrawingPage__HOLD);                           // <-- The 3D Model tab's keys stand down

        host.inert = false;
        host.classList.add(Na__DrawingPage__SHOWN_CLASS);
        Na__DrawingPage__SetTitles(true);
        Na__DrawingPage__FocusFrame();
    }
    // ------------------------------------------------------------


    // FUNCTION | Put the Page Away and Give the Model Back (the Drawing Is Kept)
    // ------------------------------------------------------------
    function Na__DrawingPage__Hide() {
        if (!Na__DrawingPage__Shown) return;
        Na__DrawingPage__Shown = false;

        const host = Na__DrawingPage__Host;
        if (host) {
            host.classList.remove(Na__DrawingPage__SHOWN_CLASS);
            host.inert = true;                                               // <-- The focus leaves the frame for this window
        }
        document.body.classList.remove(Na__DrawingPage__BODY_CLASS);
        const canvas = document.getElementById(Na__DrawingPage__CANVAS_ID);
        if (canvas) canvas.style.visibility = '';

        Na__KeyScope__Release(Na__DrawingPage__HOLD);
        Na__RenderLoop__Resume(Na__DrawingPage__HOLD);                       // <-- The engine runs again; one frame paints now
        Na__RenderLoop__RequestRender();
        Na__DrawingPage__SetTitles(false);
        try { window.focus(); } catch (error) { /* the next click gives the model the keys */ }
    }
    // ------------------------------------------------------------


    // FUNCTION | The App Started on the Page's Address (a Reload, a Link)
    // ------------------------------------------------------------
    // The page comes up on the job's saved layouts once the model has loaded
    // (the loading sequence keeps its frames; a Re-Render needs the model).
    // With no job there is nothing to show: the app stays on the Model View.
    // ------------------------------------------------------------
    function Na__DrawingPage__Boot() {
        if (!Na__PageLayoutHandoff__ProjectId()) return Promise.resolve(false);
        return Na__DrawingPage__WhenModelReady();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Is the Drawing Editor Up?
    // ------------------------------------------------------------
    function Na__DrawingPage__IsShown() {
        return Na__DrawingPage__Shown;
    }
    // ------------------------------------------------------------


    // FUNCTION | May a New Drawing Replace the Open One? (Create Drawing Asks First)
    // ------------------------------------------------------------
    // Resolves true to go on, false to stop. Nothing open, or nothing changed
    // since it was saved: true at once. Changes not on the Vale Cloud:
    //   Save and Start New     the page comes up and saves through its own
    //                          Save Drawing (its checks, its questions, its
    //                          Synced toast), then the Model View comes back;
    //                          a save that does not happen stops here
    //   Discard and Start New  true
    //   Cancel                 false
    // Someone who cannot save is only asked whether to replace it.
    // ------------------------------------------------------------
    async function Na__DrawingPage__ConfirmNewDrawing() {
        const status = Na__DrawingPage__Status();
        if (!status || !status.hasPicture || !status.dirty) return true;

        const name = status.name ? `"${status.name}"` : 'The open drawing';
        if (!status.canSave) {
            const choice = await Na__AppUtils__ConfirmDialog__Choose({
                title         : 'Start a New Drawing?',
                message       : `${name} will be replaced by the new drawing.`,
                confirmLabel  : 'Start New Drawing',
                cancelLabel   : 'Cancel',
                isDestructive : true
            });
            return choice === 'confirm';
        }

        const choice = await Na__AppUtils__ConfirmDialog__Choose({
            title          : 'Start a New Drawing?',
            message        : `${name} has changes that are not saved to the Vale Cloud.`,
            alternateLabel : 'Save and Start New',
            confirmLabel   : 'Discard and Start New',
            cancelLabel    : 'Cancel',
            isDestructive  : true
        });
        if (choice === 'confirm') return true;
        if (choice !== 'alternate') return false;

        // SAVE AND START NEW | On the page itself, so anything it asks is seen
        // ------------------------------------------------------------
        Na__AppPages__Go(Na__DrawingPage__NAME);
        const embed = Na__DrawingPage__Embed();
        let saved = false;
        try {
            saved = !!(embed && typeof embed.Save === 'function' && await embed.Save());
        } catch (error) {
            saved = false;
        }
        if (!saved) return false;                                            // <-- The page says why; the drawing stays open on it
        await new Promise((resolve) => setTimeout(resolve, Na__DrawingPage__SAVED_MS));
        Na__AppPages__Back();
        return Na__AppPages__WhenShown(Na__AppPages__MODEL);                 // <-- The new picture renders from the Model View
    }
    // ------------------------------------------------------------


    // FUNCTION | Open a New Drawing on the Picture Create Drawing Made
    // ------------------------------------------------------------
    // pending: { blob, width, height, aspectRatio, projectId, sourceView,
    // renderSettings }, as the page has always taken it. Resolves true once
    // the page says it has the picture (false if it has not said so after
    // READY_MS: the page is up either way).
    // ------------------------------------------------------------
    function Na__DrawingPage__OpenPicture(pending) {
        window[Na__DrawingPage__PENDING_KEY] = pending || null;
        const frame = Na__DrawingPage__NewFrame(null);
        const ready = Na__DrawingPage__WaitReady(frame);
        if (Na__AppPages__CurrentPage() === Na__DrawingPage__NAME) Na__DrawingPage__FocusFrame();
        else Na__AppPages__Go(Na__DrawingPage__NAME);
        return ready;
    }
    // ------------------------------------------------------------


    // FUNCTION | Open a Saved Layout in the Drawing Editor (the Drawings Menu's Open)
    // ------------------------------------------------------------
    // Already on the editor's sheet: the page comes up as it is, unsaved
    // changes and all. Otherwise the page itself opens it (asking first when
    // its sheet has changes not saved), or, with no page yet, a new page
    // starts on it (?layout=<id>).
    // ------------------------------------------------------------
    function Na__DrawingPage__OpenLayout(layoutId) {
        if (!layoutId) return;
        const status = Na__DrawingPage__Status();
        const embed  = Na__DrawingPage__Embed();
        if (status && status.layoutId === layoutId) {
            Na__AppPages__Go(Na__DrawingPage__NAME);
            return;
        }
        if (embed && typeof embed.OpenLayout === 'function') {
            Na__AppPages__Go(Na__DrawingPage__NAME);                         // <-- Up first: its question, if it asks one, is seen
            try { embed.OpenLayout(layoutId); } catch (error) { console.error('[DrawingPage] The layout could not be opened:', error); }
            return;
        }
        Na__DrawingPage__NewFrame({ open : 'saved', layout : layoutId });
        Na__AppPages__Go(Na__DrawingPage__NAME);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Saved Layout on the Editor's Sheet ('' When None, or No Editor Yet)
    // ------------------------------------------------------------
    function Na__DrawingPage__OpenedLayoutId() {
        const status = Na__DrawingPage__Status();
        return (status && status.layoutId) || '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Ask Before a Saved Drawing Is Deleted: the Word Delete Has to Be Typed (Promise<boolean>)
    // ------------------------------------------------------------
    // DELETE MEANS DELETE (Adam, 09-Oct-2026): the server removes the layout
    // and every picture of it, with no archive, so it is made hard to do by
    // accident. One question for the Drawings menu and the Drawing Editor
    // (which asks through window.Na__PageLayout__AppHost.ConfirmDelete).
    // ------------------------------------------------------------
    async function Na__DrawingPage__ConfirmDelete(name) {
        const label  = String(name || '').trim() || 'this drawing';
        const choice = await Na__AppUtils__ConfirmDialog__Choose({
            title         : `Delete ${label}?`,
            message       : 'This permanently deletes the drawing: its layout, picture and thumbnail are removed from the Vale Cloud. It cannot be undone.\n\nType delete to confirm.',
            confirmLabel  : 'Delete',
            cancelLabel   : 'Cancel',
            typeToConfirm : Na__DrawingPage__DELETE_WORD,
            isDestructive : true
        });
        return choice === 'confirm';
    }
    // ------------------------------------------------------------


    // FUNCTION | A Layout Was Deleted From the Drawings Menu: the Editor Is Told
    // ------------------------------------------------------------
    // On its sheet, the drawing stays as a new, unsaved one; its own list is read again.
    // ------------------------------------------------------------
    function Na__DrawingPage__LayoutDeleted(layoutId) {
        const embed = Na__DrawingPage__Embed();
        if (!embed || typeof embed.LayoutDeleted !== 'function') return;
        try { embed.LayoutDeleted(layoutId); } catch (error) { /* its list catches up next time it is read */ }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Register the Page, and Put Up What the Frame Calls Here
    // ------------------------------------------------------------
    // options.leaveLayoutEditor: Na__LeLoad__Leave (the Layout Editor's loader
    // facade), so the page never opens over a drawing tab.
    // ------------------------------------------------------------
    function Na__DrawingPage__Initialize(options = {}) {
        Na__DrawingPage__Options = {
            leaveLayoutEditor : (typeof options.leaveLayoutEditor === 'function') ? options.leaveLayoutEditor : null
        };

        window[Na__DrawingPage__HOST_KEY] = Object.freeze({
            Version       : Na__DrawingPage__VERSION,
            Back          : () => Na__AppPages__Back(),                      // <-- The page's Back to Model View
            IsShown       : () => Na__DrawingPage__Shown,
            ConfirmDelete : (name) => Na__DrawingPage__ConfirmDelete(name).finally(() => {   // <-- The page's Delete asks the app's question (type delete)
                if (Na__DrawingPage__Shown) Na__DrawingPage__FocusFrame();   // <-- The keys go back to the page once it is answered
            })
        });

        Na__AppPages__Register(Na__DrawingPage__NAME, {
            label : Na__DrawingPage__LABEL,
            show  : Na__DrawingPage__Show,
            hide  : Na__DrawingPage__Hide,
            boot  : Na__DrawingPage__Boot
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Drawing Editor Page API
    // ------------------------------------------------------------
    export {
        Na__DrawingPage__Initialize,
        Na__DrawingPage__IsShown,
        Na__DrawingPage__ConfirmNewDrawing,
        Na__DrawingPage__OpenPicture,
        Na__DrawingPage__OpenLayout,
        Na__DrawingPage__OpenedLayoutId,
        Na__DrawingPage__ConfirmDelete,
        Na__DrawingPage__LayoutDeleted
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
