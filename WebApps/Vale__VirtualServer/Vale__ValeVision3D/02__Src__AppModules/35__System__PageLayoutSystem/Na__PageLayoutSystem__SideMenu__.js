// =============================================================================
// VALEVISION3D - PAGE LAYOUT SYSTEM - SIDE MENU
// =============================================================================
//
// FILE       : Na__PageLayoutSystem__SideMenu__.js
// NAMESPACE  : Na__PageLayout
// MODULE     : Side Menu
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The menu down the right of the Create Drawing page: its shell
//              (fold away, drag its width), the job it saves to, the picture
//              tools, and Close
// CREATED    : 09-Oct-2026
//
// DESCRIPTION:
// - REPLACES THE BAR OF BUTTONS UNDER THE HEADER (Adam, 09-Oct-2026): every tool
//   lives in one menu on the right, in sections - Drawing Layout, Saved Layouts,
//   Composition Guide, Picture, Render Quality, Export - with Close at the foot.
//   Each section's own module wires its contents; this one wires the shell.
// - EVERY SECTION STARTS FOLDED (Adam, 09-Oct-2026): the page opens on a short
//   list of section titles. The one exception is the Saved Layouts module's
//   own: opened from Saved Drawings, or with no picture, it opens that list.
// - FOLDS AWAY with the arrow in its head, giving the sheet the whole width; a
//   Menu tab on the right brings it back. The sheet refits as the menu moves.
// - DRAG ITS WIDTH (Adam, 09-Oct-2026) by the handle on its left edge: mouse,
//   pen or finger (pointer events), or the arrow keys once the handle has focus.
//   Double-click the handle for the default width again. Between MIN_WIDTH_PX
//   and MAX_WIDTH_PX, always leaving the sheet MIN_SHEET_PX; on a narrow screen,
//   where the menu lies over the sheet, up to most of the window. The sheet
//   refits frame by frame while it moves.
// - REMEMBERS, in this browser only, whether it was folded and how wide it was
//   (a convenience: blocked storage just means the defaults).
// - PICTURE: Fit Picture in Frame puts the picture back centred in the drawing
//   frame, untrimmed; Fit Sheet to Window refits the view.
// - INSIDE THE APP (ValeVision3D v2.76.0) the foot's button is Back to Model
//   View: the drawing stays open behind the 3D model, as it was. In a tab of its
//   own it is still Close.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Oct-2026 - Version 1.3.0 (ValeVision3D v2.76.0)
// - Back to Model View inside the app.
//
// 09-Oct-2026 - Version 1.2.0 (ValeVision3D v2.75.2)
// - Close goes through the Unsaved Guard: an unsaved drawing asks first.
//
// 09-Oct-2026 - Version 1.1.0 (ValeVision3D v2.75.1)
// - Every section starts folded: open sections are no longer remembered.
// - The menu's width drags from its left edge, is remembered, and resets on a
//   double-click; the sheet follows it as it moves.
//
// 09-Oct-2026 - Version 1.0.0
// - Initial build (ValeVision3D v2.75.0).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Placement and View Tools, Page Events
    // ------------------------------------------------------------
    import {
        Na__PageLayout__FitImageInDrawingArea,
        Na__PageLayout__FitPageToView,
        Na__PageLayout__ResizeCanvasToContainer
    } from './Na__PageLayoutSystem__SystemLogic__Main__.js';
    import { Na__PageLayout__Toast, Na__PageLayout__Emit, Na__PageLayout__On } from './Na__PageLayoutSystem__UiNotify__.js';
    import { Na__PageLayout__UnsavedGuard__RequestClose } from './Na__PageLayoutSystem__UnsavedGuard__.js';
    import { Na__PageLayout__Host__IsEmbedded } from './Na__PageLayoutSystem__Host__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Ids, Classes, Storage Key
    // ------------------------------------------------------------
    const Na__PageLayout__Menu__IDS = Object.freeze({
        workspace  : 'naLayoutWorkspace',
        menu       : 'naLayoutMenu',
        resizer    : 'naLayoutMenuResizer',
        collapse   : 'naLayoutMenuCollapse',
        reopen     : 'naLayoutMenuReopen',
        project    : 'naLayoutProjectName',
        resetImage : 'naLayoutResetImage',
        fitSheet   : 'naLayoutFitSheet',
        close      : 'naLayoutClose'
    });
    const Na__PageLayout__Menu__COLLAPSED_CLASS = 'na-layout-workspace--menu-folded';
    const Na__PageLayout__Menu__RESIZING_CLASS  = 'na-layout-workspace--menu-resizing';
    const Na__PageLayout__Menu__STORAGE_KEY     = 'NaPageLayout__SideMenu__State';
    const Na__PageLayout__Menu__WIDTH_VAR       = '--Vale_LayoutMenuWidth';    // <-- The stylesheet sizes the menu (and its fold) from this
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Width Limits
    // ------------------------------------------------------------
    const Na__PageLayout__Menu__MIN_WIDTH_PX   = 260;                        // <-- Narrower and the margin boxes and cards crowd
    const Na__PageLayout__Menu__MAX_WIDTH_PX   = 760;
    const Na__PageLayout__Menu__MIN_SHEET_PX   = 320;                        // <-- The sheet always keeps at least this much
    const Na__PageLayout__Menu__OVERLAY_MAX_PX = 760;                        // <-- At or below this window width the menu lies over the sheet (the stylesheet's breakpoint)
    const Na__PageLayout__Menu__OVERLAY_SHARE  = 0.95;                       // <-- ...and may cover this share of the window
    const Na__PageLayout__Menu__KEY_STEP_PX    = 16;                         // <-- One arrow key press; Shift moves four times as far
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Foot's Button Inside the App
    // ------------------------------------------------------------
    const Na__PageLayout__Menu__BACK_LABEL = 'Back to Model View';
    const Na__PageLayout__Menu__BACK_TITLE = 'Back to the 3D model (Alt+Left). This drawing stays open: Alt+Right comes back to it';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Remembered Menu State (Never Throws)
    // ------------------------------------------------------------
    function Na__PageLayout__Menu__Load() {
        try {
            const text = window.localStorage.getItem(Na__PageLayout__Menu__STORAGE_KEY);
            const data = text ? JSON.parse(text) : null;
            return (data && typeof data === 'object') ? data : {};
        } catch (error) {
            return {};
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remember the Menu State (Never Throws)
    // ------------------------------------------------------------
    function Na__PageLayout__Menu__Store(data) {
        try {
            window.localStorage.setItem(Na__PageLayout__Menu__STORAGE_KEY, JSON.stringify({
                folded : data.folded === true,
                width  : Number.isFinite(data.width) ? Math.round(data.width) : null
            }));
        } catch (error) { /* private window or blocked storage: the defaults next time */ }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Widest the Menu May Be in This Window
    // ------------------------------------------------------------
    function Na__PageLayout__Menu__MaxWidth() {
        const windowWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        if (windowWidth <= Na__PageLayout__Menu__OVERLAY_MAX_PX) {
            return Math.max(Na__PageLayout__Menu__MIN_WIDTH_PX, Math.floor(windowWidth * Na__PageLayout__Menu__OVERLAY_SHARE));
        }
        return Math.max(Na__PageLayout__Menu__MIN_WIDTH_PX,
                        Math.min(Na__PageLayout__Menu__MAX_WIDTH_PX, windowWidth - Na__PageLayout__Menu__MIN_SHEET_PX));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Width Held Within the Limits
    // ------------------------------------------------------------
    function Na__PageLayout__Menu__ClampWidth(widthPx) {
        return Math.round(Math.min(Na__PageLayout__Menu__MaxWidth(), Math.max(Na__PageLayout__Menu__MIN_WIDTH_PX, widthPx)));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Side Menu Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize the Side Menu's Shell and Picture Tools
    // ------------------------------------------------------------
    function Na__PageLayout__InitSideMenu(state, requestRedraw) {
        const el        = (key) => document.getElementById(Na__PageLayout__Menu__IDS[key]);
        const workspace = el('workspace');
        const menu      = el('menu');
        if (!workspace || !menu) return;

        const memory = Na__PageLayout__Menu__Load();


        // FOLD AWAY | The arrow folds the menu, the Menu tab brings it back
        // ------------------------------------------------------------
        const setFolded = (folded) => {
            workspace.classList.toggle(Na__PageLayout__Menu__COLLAPSED_CLASS, folded);
            const reopen = el('reopen');
            if (reopen) reopen.hidden = !folded;
            memory.folded = folded;
            Na__PageLayout__Menu__Store(memory);
        };
        const collapse = el('collapse');
        const reopen   = el('reopen');
        if (collapse) collapse.addEventListener('click', () => setFolded(true));
        if (reopen)   reopen.addEventListener('click', () => setFolded(false));
        setFolded(memory.folded === true);

        // SECTIONS | Every one starts folded, whatever was open last time
        // ------------------------------------------------------------
        menu.querySelectorAll('details[data-section]').forEach((section) => { section.open = false; });


        // WIDTH | Set through the stylesheet's variable, so the fold and the toast follow it
        // ------------------------------------------------------------
        // chosenWidth is what someone chose (null: the stylesheet's default). A
        // window too small for it holds the menu within its limits without
        // forgetting it, so the chosen width comes back when the window does.
        // ------------------------------------------------------------
        const resizer   = el('resizer');
        let chosenWidth = Number.isFinite(memory.width) ? memory.width : null;
        let refitFrame  = 0;                                                 // <-- One sheet refit per animation frame while dragging

        const refitSoon = () => {
            if (refitFrame) return;
            refitFrame = requestAnimationFrame(() => {
                refitFrame = 0;
                Na__PageLayout__ResizeCanvasToContainer(state);
            });
        };
        const applyWidth = (widthPx) => {
            if (Number.isFinite(widthPx)) {
                document.documentElement.style.setProperty(Na__PageLayout__Menu__WIDTH_VAR, Na__PageLayout__Menu__ClampWidth(widthPx) + 'px');
            } else {
                document.documentElement.style.removeProperty(Na__PageLayout__Menu__WIDTH_VAR);   // <-- The stylesheet's default again
            }
            if (resizer) {
                resizer.setAttribute('aria-valuemax', String(Na__PageLayout__Menu__MaxWidth()));
                resizer.setAttribute('aria-valuenow', String(Math.round(menu.getBoundingClientRect().width)));
            }
            refitSoon();
        };
        const chooseWidth = (widthPx) => {
            chosenWidth   = Number.isFinite(widthPx) ? Na__PageLayout__Menu__ClampWidth(widthPx) : null;
            memory.width  = chosenWidth;
            applyWidth(chosenWidth);
            Na__PageLayout__Menu__Store(memory);
        };
        if (chosenWidth !== null) applyWidth(chosenWidth);
        window.addEventListener('resize', () => { if (chosenWidth !== null) applyWidth(chosenWidth); });

        // RESIZER | Drag (mouse, pen, finger), arrow keys, double-click for the default
        // ------------------------------------------------------------
        if (resizer) {
            resizer.setAttribute('aria-valuemin', String(Na__PageLayout__Menu__MIN_WIDTH_PX));
            resizer.setAttribute('aria-valuemax', String(Na__PageLayout__Menu__MaxWidth()));
            resizer.setAttribute('aria-valuenow', String(Math.round(menu.getBoundingClientRect().width)));

            let dragPointer = null;
            let startX      = 0;
            let startWidth  = 0;

            resizer.addEventListener('pointerdown', (event) => {
                if (event.button !== 0 || workspace.classList.contains(Na__PageLayout__Menu__COLLAPSED_CLASS)) return;
                event.preventDefault();
                dragPointer = event.pointerId;
                startX      = event.clientX;
                startWidth  = menu.getBoundingClientRect().width;
                try { resizer.setPointerCapture(event.pointerId); } catch (error) { /* the drag still follows the handle */ }
                workspace.classList.add(Na__PageLayout__Menu__RESIZING_CLASS);
            });

            resizer.addEventListener('pointermove', (event) => {
                if (dragPointer === null || event.pointerId !== dragPointer) return;
                applyWidth(startWidth + (startX - event.clientX));            // <-- The menu is on the right: moving left widens it
            });

            const endDrag = (event) => {
                if (dragPointer === null || event.pointerId !== dragPointer) return;
                dragPointer = null;
                try { resizer.releasePointerCapture(event.pointerId); } catch (error) { /* already released */ }
                workspace.classList.remove(Na__PageLayout__Menu__RESIZING_CLASS);
                chooseWidth(menu.getBoundingClientRect().width);              // <-- Remember where it was let go
            };
            resizer.addEventListener('pointerup', endDrag);
            resizer.addEventListener('pointercancel', endDrag);

            resizer.addEventListener('dblclick', () => chooseWidth(NaN));     // <-- Back to the stylesheet's default

            resizer.addEventListener('keydown', (event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                const step = Na__PageLayout__Menu__KEY_STEP_PX * (event.shiftKey ? 4 : 1);
                const now  = menu.getBoundingClientRect().width;
                chooseWidth(now + (event.key === 'ArrowLeft' ? step : -step));
            });
        }

        // THE JOB | Which project a save goes to
        // ------------------------------------------------------------
        const showProject = () => {
            const label = el('project');
            if (!label) return;
            const id = String((state.project && state.project.id) || '').split('/').pop();
            label.textContent = id ? id.replace(/__/g, ' ') : 'No project';
            label.title       = id ? `Layouts are saved to job ${id}` : 'Opened without a project: layouts cannot be saved';
        };
        Na__PageLayout__On('layout', showProject);
        Na__PageLayout__On('user', showProject);
        showProject();

        // PICTURE | Back in the frame, untrimmed; the sheet refitted to the window
        // ------------------------------------------------------------
        const resetImage = el('resetImage');
        if (resetImage) {
            resetImage.addEventListener('click', () => {
                if (!state.viewportImage) { Na__PageLayout__Toast('There is no picture on the sheet yet', true); return; }
                Na__PageLayout__FitImageInDrawingArea(state);
                state.isImageSelected = true;
                requestRedraw();
                Na__PageLayout__Emit('changed', { what : 'image' });
            });
        }
        const fitSheet = el('fitSheet');
        if (fitSheet) {
            fitSheet.addEventListener('click', () => {
                Na__PageLayout__FitPageToView(state);
                requestRedraw();
            });
        }

        // CLOSE | Inside the app: Back to Model View (the drawing stays open). In a
        // tab of its own: an unsaved drawing asks first (Save and Close, Keep
        // Editing, Close Without Saving); a saved one closes the tab
        // ------------------------------------------------------------
        const close = el('close');
        if (close) {
            if (Na__PageLayout__Host__IsEmbedded()) {
                close.textContent = Na__PageLayout__Menu__BACK_LABEL;
                close.title       = Na__PageLayout__Menu__BACK_TITLE;
            }
            close.addEventListener('click', () => Na__PageLayout__UnsavedGuard__RequestClose());
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Side Menu API
    // ------------------------------------------------------------
    export {
        Na__PageLayout__InitSideMenu
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
