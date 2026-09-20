// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - TAB STRIP
// =============================================================================
//
// FILE       : Na__LayoutEditor__TabStrip__.js
// NAMESPACE  : Na__LeTabs
// MODULE     : Layout Editor - Tab Strip
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The row of tabs under the header: 3D Model, one per sheet, and a plus on localhost
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - Shown only while the project's Layout Mode switch (Dev Tools, Layout
//   Editor) is on AND the project has a sheet, on localhost and on the live
//   site alike; IsAvailable owns the rule (the loader's copy before the
//   editor has loaded, the mode controller's after).
//   Its height is published as --Vale_LayoutTabStripHeight and the body
//   carries na-layout-tabs--visible, so the canvas, menus, breadcrumb and
//   carousel shift down by the same amount (D22, D23, D24).
// - The 3D Model tab leaves the editor; a sheet tab enters it on that
//   sheet; the plus tab makes a sheet and opens it. Double-click a sheet
//   tab to rename it (localhost). Web viewers switch tabs but cannot add,
//   rename or reorder.
// - WHEN THE TABS DO NOT ALL FIT the strip scrolls sideways under a finger and
//   an arrow appears at each end of the visible run, stepping a document at a
//   time. Seven tabs need about 700px and a phone in portrait has 375, so this
//   is how the whole set is reachable there; on a desktop that fits them all,
//   no arrow is shown and the strip is what it always was. The same strip
//   serves the read-only web viewer: what a viewer loses is the plus, the
//   rename and the drag, which it never had.
// - LIGHT ON PURPOSE. The strip is drawn before the editor exists, so it
//   reaches the editor only through Na__LayoutEditor__Loader__: before the
//   load the tabs are read from the raw drawings block, and the first click
//   on a sheet tab, the plus, a rename or a drag loads the editor behind the
//   loading screen, then does what was asked.
//
// INTEGRATION:
// - Imported and initialized by Na__LayoutEditor__Loader__ the first time the
//   editor is offered for the project; never by index.html.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : Lantern Designer 30__System__DrawingEditorMode (mode tab purpose)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Sep-2026 - Version 1.5.0
// - Short tabs, ported from TrueVision3D v2.70.0. A sheet tab reads
//   "D03 - Elevations": the short code cut from the sheet's drawing number,
//   then its short name (Na__LeLoad__GetTabLabel). The whole drawing number is
//   on the tab's hover, where it costs no width. A sheet with no drawing number
//   shows its name alone, exactly as every tab did before.
// - The rename field holds the short name alone, with the code standing in
//   front of it as fixed text: the code is the drawing's, not the name's.
// - The rebuild signature carries the drawing number, so a renumber redraws
//   the strip.
//
// 18-Sep-2026 - Version 1.4.0
// - The tabs go into a scroller with an arrow at each end, shown only when they
//   do not all fit. An arrow opens the tab before or after the open one by
//   clicking it, so there is still exactly one way into each document - in
//   ValeVision that is also what loads the editor on the first press - and a
//   rebuild scrolls the open tab back into the visible run. Ported from
//   TrueVision3D 1.5.0.
//
// 15-Sep-2026 - Version 1.3.0
// - Loads before the editor and without it: every read and every action goes
//   through Na__LayoutEditor__Loader__ instead of the mode controller, the
//   sheet model, the config and the specification, which between them put
//   the whole editor on the start-up path. The rendering is unchanged.
// - Shown only when Layout Mode is on and the project has a sheet, here and
//   on the live site, so a project with no sheets has no plus tab either: its
//   first sheet comes from New Sheet in the Dev section.
// - Rebuilt when the loader announces a change (a project loaded or saved,
//   Layout Mode switched, the editor loaded), through the same signature gate.
//
// 13-Sep-2026 - Version 1.2.0
// - A model change rebuilds the strip only when a tab would look different - a
//   sheet added, removed, renamed, reordered or opened, or Layout Mode switched -
//   instead of on every edit. Ported from TrueVision; the signature carries
//   IsAvailable where TrueVision's carries the config enable flag.
//
// 11-Sep-2026 - Version 1.1.0
// - Visibility from Na__LeMode__IsAvailable: no strip on the live site for a
//   project without sheets, none on localhost until Layout Mode is switched on.
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Layout Editor Loader (the strip's only way to the editor)
    // ------------------------------------------------------------
    // Nothing else from the editor may be imported here: this module loads
    // before the editor does, and a static import would pull it in.
    // ------------------------------------------------------------
    import {
        Na__LeLoad__SHEETS_EVENT,
        Na__LeLoad__MODE_EVENT,
        Na__LeLoad__SPEC_EVENT,
        Na__LeLoad__STATE_EVENT,
        Na__LeLoad__VIEW_SPEC,
        Na__LeLoad__GetLabel,
        Na__LeLoad__GetSheets,
        Na__LeLoad__GetTabLabel,
        Na__LeLoad__GetShortCode,
        Na__LeLoad__GetDrawingNumber,
        Na__LeLoad__GetActiveSheet,
        Na__LeLoad__IsActive,
        Na__LeLoad__IsEditable,
        Na__LeLoad__IsAvailable,
        Na__LeLoad__GetView,
        Na__LeLoad__IsSpecDirty,
        Na__LeLoad__Enter,
        Na__LeLoad__Leave,
        Na__LeLoad__OpenSpecification,
        Na__LeLoad__CreateSheet,
        Na__LeLoad__UpdateSheet,
        Na__LeLoad__ReorderSheet
    } from '../01__Core__Loader/Na__LayoutEditor__Loader__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Ids, Classes and the Published Height
    // ------------------------------------------------------------
    const Na__LeTabs__NAV_ID     = 'naLayoutEditorTabStrip';
    const Na__LeTabs__BODY_CLASS = 'na-layout-tabs--visible';
    const Na__LeTabs__CSS_VAR    = '--Vale_LayoutTabStripHeight';
    const Na__LeTabs__HEIGHT_PX  = 36;
    const Na__LeTabs__REVEAL_PAD = 8;     // <-- Breathing room left beside a tab scrolled back into view
    // ------------------------------------------------------------

    // MODULE VARIABLES | Root and Drag State
    // ------------------------------------------------------------
    let Na__LeTabs__Root     = null;
    let Na__LeTabs__Scroller = null;   // <-- The tabs themselves; the arrows sit outside it so they never scroll away
    let Na__LeTabs__DragId  = null;
    let Na__LeTabs__Signature = null;    // <-- What the strip last drew, so a change that alters no tab skips the rebuild
    let Na__LeTabs__Visible = null;    // <-- Last published state; the resize only fires on a change
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One Tab Button
    // ------------------------------------------------------------
    function Na__LeTabs__Tab(text, active, onClick, modifier) {
        const button = document.createElement('button');
        button.type        = 'button';
        button.className   = 'na-le-tabs__tab' + (active ? ' na-le-tabs__tab--active' : '') + (modifier ? ' ' + modifier : '');
        button.textContent = text;
        button.setAttribute('aria-pressed', String(!!active));
        button.addEventListener('click', onClick);
        return button;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Inline Rename of a Sheet Tab
    // ------------------------------------------------------------
    function Na__LeTabs__Rename(button, sheet) {
        const frame = document.createElement('span');
        frame.className = 'na-le-tabs__renaming';
        const code = document.createElement('span');
        code.className   = 'na-le-tabs__renaming-code';
        code.textContent = Na__LeLoad__GetTabLabel(sheet, '');                    // <-- The label with no name in it: "D03 -"
        code.hidden      = !Na__LeLoad__GetShortCode(sheet);
        const input = document.createElement('input');
        input.type      = 'text';
        input.className = 'na-le-tabs__rename';
        input.value     = sheet.Sheet__Name;
        input.setAttribute('aria-label', Na__LeLoad__GetLabel('SheetNameTitle', 'Short tab name'));
        const commit = () => { const v = input.value.trim(); if (v && v !== sheet.Sheet__Name) void Na__LeLoad__UpdateSheet(sheet, { name : v }); else Na__LeTabs__Render(); };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } if (e.key === 'Escape') { input.value = sheet.Sheet__Name; input.blur(); } e.stopPropagation(); });
        input.addEventListener('blur', commit);
        frame.appendChild(code);
        frame.appendChild(input);
        button.replaceWith(frame);
        input.focus(); input.select();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Publish Visibility to the Rest of the Shell
    // ------------------------------------------------------------
    function Na__LeTabs__Publish(visible) {
        document.documentElement.style.setProperty(Na__LeTabs__CSS_VAR, (visible ? Na__LeTabs__HEIGHT_PX : 0) + 'px');
        document.body.classList.toggle(Na__LeTabs__BODY_CLASS, visible);
        if (Na__LeTabs__Root) Na__LeTabs__Root.hidden = !visible;
        if (visible === Na__LeTabs__Visible) return;
        Na__LeTabs__Visible = visible;
        window.dispatchEvent(new Event('resize'));                               // <-- Canvas-sized listeners re-measure once per change
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Every Tab That Opens Something, in the Order They Sit
    // ------------------------------------------------------------
    // Read back off the strip rather than rebuilt from the model, so the arrows
    // step through exactly what is on screen, in exactly the order it is shown,
    // and every tab is opened by its own click handler - which in ValeVision is
    // what loads the editor on the first press. The plus is left out: it makes
    // a sheet rather than opening one.
    // ------------------------------------------------------------
    function Na__LeTabs__Openable() {
        if (!Na__LeTabs__Scroller) return [];
        return Array.from(Na__LeTabs__Scroller.querySelectorAll('.na-le-tabs__tab:not(.na-le-tabs__tab--add)'));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Open the Tab Before or After the Open One
    // ------------------------------------------------------------
    function Na__LeTabs__Step(direction) {
        const tabs = Na__LeTabs__Openable();
        if (!tabs.length) return false;
        const at   = tabs.findIndex((tab) => tab.classList.contains('na-le-tabs__tab--active'));
        const next = (at === -1 ? 0 : at + (direction < 0 ? -1 : 1));
        if (next < 0 || next >= tabs.length) return false;
        tabs[next].click();                                                      // <-- The tab's own handler, so there is one way in per tab
        return true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Bring the Open Tab Into View Inside the Scroller
    // ------------------------------------------------------------
    // Written as a scrollLeft rather than scrollIntoView, which scrolls every
    // scrollable ancestor as well - including the page, which on a phone slides
    // the header and the drawing about for no reason anybody asked for.
    //
    // MEASURED WITH RECTS, NOT offsetLeft. offsetLeft is counted from the
    // nearest POSITIONED ancestor, which the scroller is not, so comparing it
    // with the scroller's own scrollLeft compares two different origins: the
    // sums come out plausible and the open tab still sits half off the edge.
    // ------------------------------------------------------------
    function Na__LeTabs__Reveal() {
        const active = Na__LeTabs__Scroller ? Na__LeTabs__Scroller.querySelector('.na-le-tabs__tab--active') : null;
        if (!active) return;
        const box = Na__LeTabs__Scroller.getBoundingClientRect();
        const tab = active.getBoundingClientRect();
        if (tab.left  < box.left)  Na__LeTabs__Scroller.scrollLeft += (tab.left  - box.left)  - Na__LeTabs__REVEAL_PAD;
        else if (tab.right > box.right) Na__LeTabs__Scroller.scrollLeft += (tab.right - box.right) + Na__LeTabs__REVEAL_PAD;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show the End Arrows Only When the Tabs Do Not All Fit
    // ------------------------------------------------------------
    // ON A PHONE IN PORTRAIT THEY ALWAYS WILL NOT. Seven tabs at their natural
    // width need about 700px and a phone has 375, so the strip scrolls sideways
    // under a finger and the arrows at its ends step a document at a time for
    // anyone who would rather press than flick. On a desktop, where the whole
    // set fits, nothing is shown and the strip is exactly what it always was.
    // ------------------------------------------------------------
    function Na__LeTabs__SyncArrows() {
        if (!Na__LeTabs__Root || !Na__LeTabs__Scroller) return;
        const tabs     = Na__LeTabs__Openable();
        const at       = tabs.findIndex((tab) => tab.classList.contains('na-le-tabs__tab--active'));
        const overflow = Na__LeTabs__Scroller.scrollWidth > Na__LeTabs__Scroller.clientWidth + 1;
        [ [ 'prev', at > 0 ], [ 'next', at !== -1 && at < tabs.length - 1 ] ].forEach((entry) => {
            const arrow = Na__LeTabs__Root.querySelector('.na-le-tabs__arrow--' + entry[0]);
            if (!arrow) return;
            arrow.hidden   = !overflow || !tabs.length;
            arrow.disabled = !entry[1];
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Rebuild the Tabs
    // ------------------------------------------------------------
    function Na__LeTabs__Render() {
        if (!Na__LeTabs__Root) return;
        Na__LeTabs__Signature = Na__LeTabs__Sig();                              // <-- Recorded by every build, direct or gated, so the gate can never go stale
        const sheets   = Na__LeLoad__GetSheets();
        const editable = Na__LeLoad__IsEditable();
        const isActive = Na__LeLoad__IsActive();
        const onSpec   = isActive && Na__LeLoad__GetView() === Na__LeLoad__VIEW_SPEC;
        const active   = (isActive && !onSpec) ? Na__LeLoad__GetActiveSheet() : null;   // <-- No sheet tab is the open one while the specification is
        const visible  = Na__LeLoad__IsAvailable();                          // <-- Layout Mode on and at least one sheet, here and on the live site
        Na__LeTabs__Scroller.innerHTML = '';
        Na__LeTabs__Publish(visible);
        if (!visible) { Na__LeTabs__SyncArrows(); return; }

        Na__LeTabs__Scroller.appendChild(Na__LeTabs__Tab(Na__LeLoad__GetLabel('ModelTab', '3D Model'), !isActive, () => Na__LeLoad__Leave(), 'na-le-tabs__tab--model'));
        sheets.forEach((sheet) => {
            const tab = Na__LeTabs__Tab(Na__LeLoad__GetTabLabel(sheet), !!active && active.Sheet__Id === sheet.Sheet__Id, () => { void Na__LeLoad__Enter(sheet.Sheet__Id); });   // <-- "D03 - Elevations"; loads the editor on the first click
            tab.setAttribute('data-na-sheet-id', sheet.Sheet__Id);
            // THE WHOLE DRAWING NUMBER IS ON THE HOVER, not on the tab. A tab
            // has room for "D03"; the project and task in front of it are the
            // same on every tab of a pack, so there they are only width.
            const hover = Na__LeLoad__GetDrawingNumber(sheet).trim();
            if (hover) tab.title = hover;
            if (editable) {
                tab.title = (hover ? hover + '. ' : '') + Na__LeLoad__GetLabel('SheetTabEditTitle', 'Double-click to rename, drag to reorder');
                tab.addEventListener('dblclick', () => Na__LeTabs__Rename(tab, sheet));
                tab.draggable = true;
                tab.addEventListener('dragstart', (e) => { Na__LeTabs__DragId = sheet.Sheet__Id; e.dataTransfer.effectAllowed = 'move'; });
                tab.addEventListener('dragover', (e) => { if (Na__LeTabs__DragId && Na__LeTabs__DragId !== sheet.Sheet__Id) e.preventDefault(); });
                tab.addEventListener('drop', (e) => {
                    e.preventDefault();
                    if (!Na__LeTabs__DragId || Na__LeTabs__DragId === sheet.Sheet__Id) return;
                    const dragged = Na__LeTabs__DragId;
                    Na__LeTabs__DragId = null;
                    void Na__LeLoad__ReorderSheet(dragged, Na__LeLoad__GetSheets().findIndex((s) => s.Sheet__Id === sheet.Sheet__Id));
                });
                tab.addEventListener('dragend', () => { Na__LeTabs__DragId = null; });
            }
            Na__LeTabs__Scroller.appendChild(tab);
        });
        if (editable) {
            const plus = Na__LeTabs__Tab(Na__LeLoad__GetLabel('AddSheetTab', '+'), false, async () => {
                const sheet = await Na__LeLoad__CreateSheet({});
                if (sheet) void Na__LeLoad__Enter(sheet.Sheet__Id);
            }, 'na-le-tabs__tab--add');
            plus.title = Na__LeLoad__GetLabel('AddSheetTitle', 'New sheet');
            Na__LeTabs__Scroller.appendChild(plus);
        }

        // PROJECT SPECIFICATION | Last, and only while a drawing tab is open
        if (isActive) {
            const unsynced = Na__LeLoad__IsSpecDirty();
            const spec = Na__LeTabs__Tab(Na__LeLoad__GetLabel('SpecificationTab', 'Project Specification'), onSpec, () => { void Na__LeLoad__OpenSpecification(); },
                'na-le-tabs__tab--spec' + (unsynced ? ' na-le-tabs__tab--unsynced' : ''));
            spec.title = unsynced
                ? Na__LeLoad__GetLabel('SpecificationTabUnsynced', 'Project Specification - changes kept in this browser, not yet synced')
                : Na__LeLoad__GetLabel('SpecificationTabTitle', 'Every drawing note of the project, grouped and numbered');
            Na__LeTabs__Scroller.appendChild(spec);
        }
        Na__LeTabs__SyncArrows();
        Na__LeTabs__Reveal();                                                    // <-- The tab just opened is brought back into the visible run
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Everything a Tab Shows, as One Comparable String
    // ------------------------------------------------------------
    // ValeVision's strip is shown by IsAvailable - the project's Layout Mode
    // switch AND the presence of sheets - so that is what the signature
    // carries where TrueVision's carries the config enable flag. Flipping
    // Layout Mode therefore always rebuilds.
    // ------------------------------------------------------------
    function Na__LeTabs__Sig() {
        const sheets   = Na__LeLoad__GetSheets();
        const isActive = Na__LeLoad__IsActive();
        const active   = isActive ? Na__LeLoad__GetActiveSheet() : null;
        return sheets.map((sheet) => sheet.Sheet__Id + '' + Na__LeLoad__GetDrawingNumber(sheet) + '' + sheet.Sheet__Name).join('')   // <-- The number too: a renumber must redraw the tab
            + '|' + (active ? active.Sheet__Id : '') + '|' + isActive + '|' + Na__LeLoad__IsEditable() + '|' + Na__LeLoad__IsAvailable()
            + '|' + Na__LeLoad__GetView() + '|' + Na__LeLoad__IsSpecDirty();     // <-- The specification tab: open or not, synced or not
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Change Arrives: Rebuild Only if a Tab Would Change
    // ------------------------------------------------------------
    // The strip used to be torn down and rebuilt on EVERY model change - each
    // nudge, each style paint, each vertex of a shape - although a tab only
    // shows a sheet's name and whether it is the open one. Rebuilding also
    // threw away a rename field half-typed whenever something else on the
    // sheet changed underneath it. Render records the signature of what it
    // drew, so the comparison is always against the strip actually on screen.
    // ------------------------------------------------------------
    function Na__LeTabs__OnModelChanged() {
        if (Na__LeTabs__Root && Na__LeTabs__Root.childElementCount > 0 && Na__LeTabs__Sig() === Na__LeTabs__Signature) return;
        Na__LeTabs__Render();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Strip Under the Header
    // ------------------------------------------------------------
    function Na__LeTabs__Initialize() {
        if (Na__LeTabs__Root) return true;
        const header = document.querySelector('.app-header');
        const nav = document.createElement('nav');
        nav.id        = Na__LeTabs__NAV_ID;
        nav.className = 'na-le-tabs';
        nav.setAttribute('aria-label', 'Drawing sheets');
        nav.hidden = true;
        // THE ARROWS SIT OUTSIDE THE SCROLLER, so they stay put at the ends of
        // the visible run however far the tabs are scrolled along.
        nav.innerHTML = '<button type="button" class="na-le-tabs__arrow na-le-tabs__arrow--prev" hidden>\u2039</button>'
                      + '<div class="na-le-tabs__scroller"></div>'
                      + '<button type="button" class="na-le-tabs__arrow na-le-tabs__arrow--next" hidden>\u203a</button>';
        if (header && header.parentNode) header.parentNode.insertBefore(nav, header.nextSibling);
        else document.body.insertBefore(nav, document.body.firstChild);
        Na__LeTabs__Root     = nav;
        Na__LeTabs__Scroller = nav.querySelector('.na-le-tabs__scroller');
        const prev = nav.querySelector('.na-le-tabs__arrow--prev');
        const next = nav.querySelector('.na-le-tabs__arrow--next');
        prev.title = prev.ariaLabel = Na__LeLoad__GetLabel('TabsPreviousTitle', 'The drawing before this one');
        next.title = next.ariaLabel = Na__LeLoad__GetLabel('TabsNextTitle', 'The drawing after this one');
        prev.addEventListener('click', () => Na__LeTabs__Step(-1));
        next.addEventListener('click', () => Na__LeTabs__Step(1));
        Na__LeTabs__Scroller.addEventListener('scroll', Na__LeTabs__SyncArrows, { passive : true });
        // A ROTATED PHONE FITS A DIFFERENT NUMBER OF TABS, and measured twice on
        // purpose: resize can arrive before the strip has been laid out at the
        // new width, and a reading taken then is of the old one. The second,
        // on the settled frame, is the one that is right.
        window.addEventListener('resize', () => {
            Na__LeTabs__SyncArrows();
            window.requestAnimationFrame(Na__LeTabs__SyncArrows);
        });
        window.addEventListener(Na__LeLoad__SHEETS_EVENT, Na__LeTabs__OnModelChanged);   // <-- Only when a tab would look different
        window.addEventListener(Na__LeLoad__SPEC_EVENT,   Na__LeTabs__OnModelChanged);   // <-- The specification tab's unsynced dot
        window.addEventListener(Na__LeLoad__STATE_EVENT,  Na__LeTabs__OnModelChanged);   // <-- A project loaded or saved, Layout Mode switched, the editor loaded
        window.addEventListener(Na__LeLoad__MODE_EVENT,   () => Na__LeTabs__Render());
        Na__LeTabs__Render();                                                    // <-- Imported because the editor is offered: draw it now
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Tab Strip API
    // ------------------------------------------------------------
    export {
        Na__LeTabs__Initialize,
        Na__LeTabs__Render
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
