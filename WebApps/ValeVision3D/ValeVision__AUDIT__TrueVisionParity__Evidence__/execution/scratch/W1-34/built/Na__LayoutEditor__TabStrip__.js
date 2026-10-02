// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - TAB STRIP
// =============================================================================
//
// FILE       : Na__LayoutEditor__TabStrip__.js
// NAMESPACE  : Na__LeTabs
// MODULE     : Layout Editor - Tab Strip
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The row of tabs under the header: 3D Model, Drawings (a menu of every drawing), Specification, Document Register, Design Statements
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - FIVE TABS, HOWEVER LARGE THE PACK. 3D Model | Drawings | Specification |
//   Document Register | Design Statements. The strip used to carry one tab
//   per drawing, so a fourteen-drawing pack put the register and the
//   statements off the side of the screen and a reader scrolled the whole
//   pack to reach them. The drawings now live in a MENU under the Drawings
//   tab, in the register's order, each read as "D03 - 3D Images"
//   (Na__LeModel__GetTabLabel) with the whole drawing number on its hover; the
//   open drawing is marked; and on localhost the last row makes a new sheet.
//   Every tab reads the same as its neighbours (Adam: a mark on one tab reads
//   as "more important"), and the menu is the pattern the header's own menus
//   use.
// - THE STRIP SHOWS ONLY WHAT THE PROJECT HAS. Shown whenever the project has
//   a drawing sheet; a project with a 3D model and no drawings shows no strip
//   at all (Adam: "keeps concept-only jobs simple, keeping the UI less
//   cluttered with empty placeholders"). The first sheet of a project is made
//   from Dev Tools > Layout Editor > New Sheet. Its height is published as
//   --Vale_LayoutTabStripHeight and the body carries na-layout-tabs--visible,
//   so the canvas, menus, breadcrumb and carousel shift down by the same
//   amount.
// - WHICH TAB IS THE OPEN ONE. 3D Model while the editor is shut; Drawings
//   while a sheet is up; Specification, Document Register and Design
//   Statements while their pages are up over it. Pressing Drawings opens or
//   shuts its menu and never leaves the drawing already open; a row of the
//   menu opens that drawing. The document tabs open from the 3D view
//   directly: the mode controller opens the first sheet underneath them.
//   The Specification tab carries the amber dot while the specification
//   holds changes the cloud has not got, as it always did.
// - THE SAME TABS EVERYWHERE, EDITOR OR WEB VIEWER. What a viewer loses is the
//   new-sheet row, which it never had; the row of documents is the row of
//   documents. Renaming and reordering drawings is the Document Register's
//   and the Sheet panel's (a tab used to rename on a double-click and reorder
//   on a drag; with the drawings in a menu, the register is where that lives).
// - WHEN THEY DO NOT ALL FIT (a phone in portrait) the strip scrolls sideways
//   under a finger and an arrow appears at each end, stepping a tab at a time.
//   An arrow landing on Drawings opens the last drawing read, or the first,
//   rather than the menu, so there is still exactly one thing each step does.
//
// INTEGRATION:
// - Imported and initialized by Na__LayoutEditor__Loader__ the first time the
//   editor is offered for the project; never by index.html.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5, after Lantern Designer
//                   30__System__DrawingEditorMode's mode tabs); TrueVision3D took it for v2.21.0 (10-Sep-2026);
//                   since ported back whole from TrueVision3D 2.0.0 (HEAD b2aa9151)
// - Source version: 2.0.0 (TrueVision3D v2.158.0, 23-Sep-2026; read at b2aa9151)
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-34}} - whole, with TrueVision's log. This app's
//                   own 1.0.0-1.5.0 (09-Sep-2026 to 19-Sep-2026) kept a tab per sheet, a + tab, and rename
//                   and reorder on the tabs; its 1.4.0 and 1.5.0 had taken TrueVision's scroller and arrows
//                   (1.5.0) and short tab names (1.6.0).
// - Parity        : adapted
// - Divergences   :
//   - Banner reads ValeVision3D, and INTEGRATION is this app's: the loader starts the strip.
//   - Every read and action goes through Na__LayoutEditor__Loader__ (Na__LeLoad__ names in place of
//     TrueVision's Na__LeCfg__, Na__LeModel__, Na__LeMode__ and Na__LeSpec__ ones), never a static
//     import of the editor, which would put the whole editor back on every start-up (DR-24 (a)). The
//     facade answers from the raw drawings block until the editor has loaded, and from the editor after.
//   - Shown by Na__LeLoad__IsAvailable where TrueVision reads its config's enable flag: the project's
//     Layout Mode switch must be on as well as a sheet existing (DR-25 (a)); the rebuild signature
//     carries it too.
//   - Drawn as soon as the loader starts it, and redrawn on the loader's state event (a project loaded
//     or saved, Layout Mode switched, the editor loaded); TrueVision waits on Na__LeMode__Ready.
//   - The Document Register and Design Statements tabs are added only while Na__LeLoad__HasFeature
//     says this build has them (DR-38 (a)): until then the strip reads 3D Model | Drawings |
//     Specification.
//   - + New sheet waits for the sheet Na__LeLoad__CreateSheet promises (the editor may load first)
//     before opening it.
//   - A drawing row of the menu can be dragged to a new place in an editable session
//     (Na__LeTabs__Draggable, Na__LeLoad__ReorderSheet): this build's only way to reorder drawings
//     until the Document Register lands, whose port takes the drag away (DR-38, reorder (a)).
// - Back-port     : none - every divergence answers this app's lazy loader, its Layout Mode switch or a
//                   feature it does not have yet.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 23-Sep-2026 - Version 2.0.0
// - THE COMPACT STRIP, from Adam's mockup and his order: 3D Model | Drawings
//   | Specification | Document Register | Design Statements. One tab per
//   drawing is gone; the Drawings tab opens a menu of every drawing (the
//   register's order, the open one marked, the whole number on the hover),
//   then on localhost a New sheet row in place of the old + tab. "Drawing
//   Register" reads "Document Register" (Adam: to tell it from the drawings),
//   and "Statements" reads "Design Statements" (there is room now); the
//   specification tab reads "Specification" (Adam: "Project specification
//   needs to be on the top bar as well").
// - The strip is shown only while the project has a drawing sheet - never as
//   an empty placeholder on a concept-only job, and no longer on localhost
//   just to offer a +. The document tabs are there from the 3D view, not only
//   once a drawing is open, so the register is one press away.
// - Rename on double-click and reorder by drag are gone from the strip (the
//   Document Register and the Sheet panel do both); the arrows step tabs, and
//   landing on Drawings opens a drawing rather than the menu.
//
// 19-Sep-2026 - Version 1.6.0
// - Short tabs. A sheet tab reads "D03 - 3D Images": the short code cut from
//   the Drawing Register's number, then the sheet's short name
//   (Na__LeModel__GetTabLabel). It read "PS01_T02_D03 · D03 - 3D Images" - the
//   whole number, then a name with the number typed into it by hand, which had
//   to be retyped on every renumber. The whole number is on the tab's hover.
// - The rename field holds the short name alone, with the code standing in
//   front of it as fixed text: the code is the register's, not the name's.
//
// 18-Sep-2026 - Version 1.5.0
// - The tabs go into a scroller with an arrow at each end, shown only when they
//   do not all fit. An arrow opens the tab before or after the open one by
//   clicking it, so there is still exactly one way into each document, and a
//   rebuild scrolls the open tab back into the visible run.
// - Reverts 1.4.0's two-tab strip (Adam: "the tab system is too different, use
//   regular tabs"). A web viewer now sees the same tabs as the editor.
// - Reveal measures with rects rather than offsetLeft, which is counted from
//   the nearest positioned ancestor - not the scroller - so the sums came out
//   plausible and the open tab still sat half off the edge.
//
// 14-Sep-2026 - Version 1.3.1
// - The green mark on site plan tabs is gone (Adam): beside tabs without one it
//   read as more important. The na-le-tabs__tab--siteplan class stays, unstyled.
//
// 14-Sep-2026 - Version 1.3.0
// - Site plan drawings: the strip reads 3D Model | architectural sheets | + |
//   site plan sheets | Project Specification. A site plan tab carries a small
//   green mark and a drag reorders only within its own group. The rebuild
//   signature includes each sheet's drawing type.
//
// 14-Sep-2026 - Version 1.2.0
// - Project Specification: while a drawing tab is open, a Project
//   Specification tab sits at the end of the strip (Na__LeMode__OpenSpecification).
//   It is the active tab while its page is showing, and carries an amber dot
//   while the specification holds changes the cloud has not got.
//
// 13-Sep-2026 - Version 1.1.0
// - A model change rebuilds the strip only when a tab would look different - a
//   sheet added, removed, renamed, reordered or opened - instead of on every edit.
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Model and Mode Controller
    // ------------------------------------------------------------
    // THROUGH THE LOADER, AND NOTHING ELSE (this app only). The strip is drawn
    // before the editor exists - the loader starts it the first time the
    // editor is offered - so the config, sheet model, mode controller and
    // specification names TrueVision imports are the loader's facade names
    // here, in TrueVision's order: answered from the raw drawings block until
    // the editor has loaded, and by the editor after. The last three are this
    // app's own (PORT NOTE). A static import of any editor module would put
    // the whole editor back on every start-up.
    // ------------------------------------------------------------
    import {
        Na__LeLoad__GetLabel,
        Na__LeLoad__FormatLabel,
        Na__LeLoad__IsAvailable,
        Na__LeLoad__SHEETS_EVENT,
        Na__LeLoad__GetSheets,
        Na__LeLoad__GetDrawingNumber,
        Na__LeLoad__GetTabLabel,
        Na__LeLoad__GetActiveSheet,
        Na__LeLoad__CreateSheet,
        Na__LeLoad__IsSitePlanSheet,
        Na__LeLoad__MODE_EVENT,
        Na__LeLoad__Enter,
        Na__LeLoad__Leave,
        Na__LeLoad__IsActive,
        Na__LeLoad__IsEditable,
        Na__LeLoad__VIEW_SHEET,
        Na__LeLoad__VIEW_SPEC,
        Na__LeLoad__VIEW_REGISTER,
        Na__LeLoad__VIEW_STATEMENT,
        Na__LeLoad__OpenRegister,
        Na__LeLoad__GetView,
        Na__LeLoad__OpenSpecification,
        Na__LeLoad__OpenStatements,
        Na__LeLoad__SPEC_EVENT,
        Na__LeLoad__IsSpecDirty,
        Na__LeLoad__STATE_EVENT,
        Na__LeLoad__HasFeature,
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
    const Na__LeTabs__MENU_ID    = 'naLayoutEditorDrawingsMenu';
    const Na__LeTabs__BODY_CLASS = 'na-layout-tabs--visible';
    const Na__LeTabs__CSS_VAR    = '--Vale_LayoutTabStripHeight';
    const Na__LeTabs__HEIGHT_PX  = 36;
    const Na__LeTabs__REVEAL_PAD = 8;     // <-- Breathing room left beside a tab scrolled back into view
    const Na__LeTabs__MENU_EDGE  = 8;     // <-- The menu keeps this far inside the window's edges
    const Na__LeTabs__MENU_FOOT  = 12;    // <-- ...and this far above its bottom, however long the pack
    // ------------------------------------------------------------

    // MODULE VARIABLES | Root, Scroller and the Drawings Menu
    // ------------------------------------------------------------
    let Na__LeTabs__Root       = null;
    let Na__LeTabs__Scroller   = null;   // <-- The tabs themselves; the arrows sit outside it so they never scroll away
    let Na__LeTabs__Menu       = null;   // <-- The drawings menu, on the body so the strip's overflow cannot clip it
    let Na__LeTabs__MenuOpen   = false;
    let Na__LeTabs__MenuAnchor = null;   // <-- The Drawings tab the open menu hangs under (rebuilt with the strip)
    let Na__LeTabs__Signature  = null;   // <-- What the strip last drew, so a change that alters no tab skips the rebuild
    let Na__LeTabs__Visible    = null;   // <-- Last published state; the resize only fires on a change
    let Na__LeTabs__DragId     = null;   // <-- This app only: the drawing row being dragged to a new place (PORT NOTE)
    const Na__LeTabs__Activate = new WeakMap();   // <-- What an ARROW does on landing on a tab, where that is not its click
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


    // HELPER FUNCTION | Every Tab, in the Order They Sit
    // ------------------------------------------------------------
    // Read back off the strip rather than rebuilt from the model, so the arrows
    // step through exactly what is on screen, in exactly the order it is shown.
    // ------------------------------------------------------------
    function Na__LeTabs__Openable() {
        if (!Na__LeTabs__Scroller) return [];
        return Array.from(Na__LeTabs__Scroller.querySelectorAll('.na-le-tabs__tab'));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Open the Tab Before or After the Open One
    // ------------------------------------------------------------
    // Through the tab's own click, so there is one way in per tab - except
    // Drawings, whose click opens a menu: an arrow landing there opens a
    // drawing (the one last read, or the first), because an arrow is a step
    // and a step should arrive somewhere.
    // ------------------------------------------------------------
    function Na__LeTabs__Step(direction) {
        const tabs = Na__LeTabs__Openable();
        if (!tabs.length) return false;
        const at   = tabs.findIndex((tab) => tab.classList.contains('na-le-tabs__tab--active'));
        const next = (at === -1 ? 0 : at + (direction < 0 ? -1 : 1));
        if (next < 0 || next >= tabs.length) return false;
        const activate = Na__LeTabs__Activate.get(tabs[next]);
        if (activate) activate(); else tabs[next].click();
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
    // The difference between the two rects is the distance to travel whatever
    // either is measured from.
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
    // Four tabs fit any desktop; a phone in portrait may still not fit them,
    // so the strip scrolls sideways under a finger and the arrows at its ends
    // step a tab at a time for anyone who would rather press than flick. Where
    // the whole set fits, nothing is shown and the strip is a flat row.
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
        const view     = Na__LeLoad__IsActive() ? Na__LeLoad__GetView() : null;
        const onSheet  = view === Na__LeLoad__VIEW_SHEET;                       // <-- A document page over the sheet is its own tab, not Drawings
        const active   = onSheet ? Na__LeLoad__GetActiveSheet() : null;
        const visible  = Na__LeLoad__IsAvailable() && sheets.length > 0;          // <-- No drawings, no strip: a concept-only job shows the model alone
        Na__LeTabs__Scroller.innerHTML = '';
        Na__LeTabs__Publish(visible);
        if (!visible) { Na__LeTabs__CloseMenu(false); Na__LeTabs__SyncArrows(); return; }

        // 3D MODEL | Leaves the editor
        Na__LeTabs__Scroller.appendChild(Na__LeTabs__Tab(Na__LeLoad__GetLabel('ModelTab', '3D Model'), !Na__LeLoad__IsActive(), () => Na__LeLoad__Leave(), 'na-le-tabs__tab--model'));

        // DRAWINGS | The menu of every drawing; the open tab while a sheet is up
        const drawings = Na__LeTabs__Tab(Na__LeLoad__GetLabel('DrawingsTab', 'Drawings'), onSheet, () => Na__LeTabs__ToggleMenu(drawings), 'na-le-tabs__tab--drawings');
        drawings.setAttribute('aria-haspopup', 'menu');
        drawings.setAttribute('aria-expanded', 'false');
        drawings.setAttribute('aria-controls', Na__LeTabs__MENU_ID);
        const caret = document.createElement('span');
        caret.className   = 'na-le-tabs__caret';
        caret.textContent = '▾';
        caret.setAttribute('aria-hidden', 'true');
        drawings.appendChild(caret);
        // THE WHOLE DRAWING NUMBER IS ON THE HOVER while one is open ("RB05_T01_D02
        // is open"), so the tab can stay one word wide and still say where the
        // reader is.
        const number = active ? Na__LeLoad__GetDrawingNumber(active).trim() : '';
        drawings.title = active
            ? Na__LeLoad__FormatLabel('DrawingsTabOpenTitle', '{drawing} is open. Press to choose another drawing', { drawing : number || Na__LeLoad__GetTabLabel(active) })
            : Na__LeLoad__GetLabel('DrawingsTabTitle', 'The drawings of this project. Press to choose one');
        Na__LeTabs__Activate.set(drawings, () => { Na__LeTabs__CloseMenu(false); Na__LeLoad__Enter(active ? active.Sheet__Id : null); });
        Na__LeTabs__Scroller.appendChild(drawings);

        // SPECIFICATION | Every drawing note of the project, over the sheet; amber while unsynced
        const unsynced = Na__LeLoad__IsSpecDirty();
        const spec = Na__LeTabs__Tab(Na__LeLoad__GetLabel('SpecificationTab', 'Specification'), view === Na__LeLoad__VIEW_SPEC, () => Na__LeLoad__OpenSpecification(),
            'na-le-tabs__tab--specification' + (unsynced ? ' na-le-tabs__tab--unsynced' : ''));   // <-- The dot rule is the specification's own (Styles__Specification__)
        spec.title = unsynced
            ? Na__LeLoad__GetLabel('SpecificationTabUnsynced', 'Project Specification - changes kept in this browser, not yet synced')
            : Na__LeLoad__GetLabel('SpecificationTabTitle', 'Every drawing note of the project, grouped and numbered');
        Na__LeTabs__Scroller.appendChild(spec);

        // DOCUMENT REGISTER | The pack's numbers, revisions and status
        const register = Na__LeTabs__Tab(Na__LeLoad__GetLabel('RegisterTab', 'Document Register'), view === Na__LeLoad__VIEW_REGISTER, () => Na__LeLoad__OpenRegister(), 'na-le-tabs__tab--register');
        register.title = Na__LeLoad__GetLabel('RegisterTabTitle', 'Every drawing of the project - its number, revision and status, and the revision notes');
        if (Na__LeLoad__HasFeature(Na__LeLoad__VIEW_REGISTER)) Na__LeTabs__Scroller.appendChild(register);     // <-- This app only: once this build has the Document Register (DR-38)

        // DESIGN STATEMENTS | The written documents
        const statements = Na__LeTabs__Tab(Na__LeLoad__GetLabel('StatementsTab', 'Design Statements'), view === Na__LeLoad__VIEW_STATEMENT, () => Na__LeLoad__OpenStatements(), 'na-le-tabs__tab--statement');
        statements.title = Na__LeLoad__GetLabel('StatementsTabTitle', 'The written documents of this project - the pre-application statement, the design and access statement');
        if (Na__LeLoad__HasFeature(Na__LeLoad__VIEW_STATEMENT)) Na__LeTabs__Scroller.appendChild(statements);   // <-- This app only: once this build has the Statement Writer (DR-38, DR-10)

        // A MENU LEFT OPEN THROUGH A REBUILD (a rename, a reorder, a save) hangs
        // under the new Drawings tab with its rows brought up to date.
        if (Na__LeTabs__MenuOpen) {
            Na__LeTabs__MenuAnchor = drawings;
            drawings.setAttribute('aria-expanded', 'true');
            drawings.classList.add('na-le-tabs__tab--menu-open');
            Na__LeTabs__FillMenu();
            Na__LeTabs__PlaceMenu();
        }
        Na__LeTabs__SyncArrows();
        Na__LeTabs__Reveal();                                                    // <-- The tab just opened is brought back into the visible run
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Everything a Tab Shows, as One Comparable String
    // ------------------------------------------------------------
    // The sheets are in it although no tab names one: the open menu lists
    // them, and a rename or renumber must reach its rows.
    // ------------------------------------------------------------
    function Na__LeTabs__Sig() {
        const sheets = Na__LeLoad__GetSheets();
        const active = Na__LeLoad__IsActive() ? Na__LeLoad__GetActiveSheet() : null;
        return sheets.map((sheet) => sheet.Sheet__Id + '\u0001' + Na__LeLoad__GetDrawingNumber(sheet) + '\u0001' + sheet.Sheet__Name + '\u0001' + Na__LeLoad__IsSitePlanSheet(sheet)).join('\u0002')   // <-- The whole number, not the short code: the hover shows it, and any renumber must redraw the row
            + '|' + (active ? active.Sheet__Id : '') + '|' + Na__LeLoad__IsActive() + '|' + Na__LeLoad__IsEditable() + '|' + Na__LeLoad__IsAvailable()
            + '|' + Na__LeLoad__GetView() + '|' + Na__LeLoad__IsSpecDirty();          // <-- The specification: which tab is open, synced or not
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Model Change Arrives: Rebuild Only if a Tab Would Change
    // ------------------------------------------------------------
    // The strip used to be torn down and rebuilt on EVERY model change - each
    // nudge, each style paint, each vertex of a shape - although a tab only
    // shows a document's name and whether it is the open one. Render records
    // the signature of what it drew, so the comparison is always against the
    // strip actually on screen.
    // ------------------------------------------------------------
    function Na__LeTabs__OnModelChanged() {
        if (Na__LeTabs__Root && Na__LeTabs__Root.childElementCount > 0 && Na__LeTabs__Sig() === Na__LeTabs__Signature) return;
        Na__LeTabs__Render();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Drawings Menu
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Menu Element, Made Once
    // ------------------------------------------------------------
    // ON THE BODY, NOT IN THE STRIP. The strip clips its overflow so the
    // scroller can do the scrolling, and a menu inside it would be cut off at
    // the strip's lower edge. Fixed, and placed under the Drawings tab each
    // time it opens.
    // ------------------------------------------------------------
    function Na__LeTabs__BuildMenu() {
        if (Na__LeTabs__Menu) return Na__LeTabs__Menu;
        const menu = document.createElement('div');
        menu.id        = Na__LeTabs__MENU_ID;
        menu.className = 'na-le-tabs__menu';
        menu.hidden    = true;
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', Na__LeLoad__GetLabel('DrawingsTab', 'Drawings'));
        document.body.appendChild(menu);
        Na__LeTabs__Menu = menu;
        return menu;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Row of the Menu
    // ------------------------------------------------------------
    // A row shuts the menu and then does its work, so the sheet arriving
    // underneath never finds the menu still over it.
    // ------------------------------------------------------------
    function Na__LeTabs__MenuRow(text, open, onPick, modifier) {
        const row = document.createElement('button');
        row.type        = 'button';
        row.className   = 'na-le-tabs__menu-row' + (open ? ' na-le-tabs__menu-row--open' : '') + (modifier ? ' ' + modifier : '');
        row.textContent = text;
        row.setAttribute('role', 'menuitem');
        if (open) row.setAttribute('aria-current', 'true');
        row.addEventListener('click', () => { Na__LeTabs__CloseMenu(false); onPick(); });
        return row;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Rule Between Two Kinds of Row
    // ------------------------------------------------------------
    function Na__LeTabs__MenuDivider() {
        const rule = document.createElement('div');
        rule.className = 'na-le-tabs__menu-divider';
        rule.setAttribute('role', 'separator');
        return rule;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Drag a Drawing Row to a New Place (this app only)
    // ------------------------------------------------------------
    // UNTIL THE DOCUMENT REGISTER LANDS. TrueVision reorders drawings from
    // its register; this build has none yet, and the tabs that used to be
    // dragged are rows of this menu now, so a row carries the drag in an
    // editable session (DR-38, reorder (a)). A drop puts the dragged drawing
    // where the row it lands on stands; the rebuild that follows refreshes
    // the open menu's rows in place. The register's port takes this away.
    // ------------------------------------------------------------
    function Na__LeTabs__Draggable(row, sheet) {
        row.draggable = true;
        row.addEventListener('dragstart', (e) => { Na__LeTabs__DragId = sheet.Sheet__Id; e.dataTransfer.effectAllowed = 'move'; });
        row.addEventListener('dragover', (e) => { if (Na__LeTabs__DragId && Na__LeTabs__DragId !== sheet.Sheet__Id) e.preventDefault(); });
        row.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!Na__LeTabs__DragId || Na__LeTabs__DragId === sheet.Sheet__Id) return;
            const dragged = Na__LeTabs__DragId;
            Na__LeTabs__DragId = null;
            void Na__LeLoad__ReorderSheet(dragged, Na__LeLoad__GetSheets().findIndex((s) => s.Sheet__Id === sheet.Sheet__Id));
        });
        row.addEventListener('dragend', () => { Na__LeTabs__DragId = null; });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fill the Menu: Every Drawing, Then New Sheet
    // ------------------------------------------------------------
    // The drawings in the register's order, each as its tab used to read; the
    // open one marked. The new-sheet row is the old + tab, and only where a
    // sheet can be made.
    // ------------------------------------------------------------
    function Na__LeTabs__FillMenu() {
        const menu = Na__LeTabs__BuildMenu();
        menu.innerHTML = '';
        const view   = Na__LeLoad__IsActive() ? Na__LeLoad__GetView() : null;
        const active = (view === Na__LeLoad__VIEW_SHEET) ? Na__LeLoad__GetActiveSheet() : null;
        const sitePlanTitle = Na__LeLoad__GetLabel('SitePlanTabTitle', 'Site plan drawing');

        Na__LeLoad__GetSheets().forEach((sheet) => {
            const sitePlan = Na__LeLoad__IsSitePlanSheet(sheet);
            const row = Na__LeTabs__MenuRow(Na__LeLoad__GetTabLabel(sheet), !!active && active.Sheet__Id === sheet.Sheet__Id, () => Na__LeLoad__Enter(sheet.Sheet__Id), sitePlan ? 'na-le-tabs__menu-row--siteplan' : '');   // <-- "D03 - 3D Images": the register's short code, then the short name
            row.setAttribute('data-na-sheet-id', sheet.Sheet__Id);
            const hover = [ Na__LeLoad__GetDrawingNumber(sheet).trim(), sitePlan ? sitePlanTitle : '' ].filter((part) => part !== '');
            if (hover.length) row.title = hover.join('. ');                      // <-- The whole drawing number, and what kind of drawing it is
            if (Na__LeLoad__IsEditable()) Na__LeTabs__Draggable(row, sheet);     // <-- This app only: drag to reorder, until the Document Register (PORT NOTE)
            menu.appendChild(row);
        });

        // NEW SHEET | Where the + tab was, and only where a sheet can be made
        if (Na__LeLoad__IsEditable()) {
            menu.appendChild(Na__LeTabs__MenuDivider());
            const add = Na__LeTabs__MenuRow(Na__LeLoad__GetLabel('AddSheetTab', '+') + ' ' + Na__LeLoad__GetLabel('AddSheetTitle', 'New sheet'), false, async () => {
                const sheet = await Na__LeLoad__CreateSheet({});                  // <-- This app only: a promise, as the editor may load first
                if (sheet) Na__LeLoad__Enter(sheet.Sheet__Id);
            }, 'na-le-tabs__menu-row--add');
            add.title = Na__LeLoad__GetLabel('AddSheetTitle', 'New sheet');
            menu.appendChild(add);
        }
        return menu;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hang the Menu Under the Drawings Tab
    // ------------------------------------------------------------
    // Under the strip's lower edge, its left on the tab's left, kept inside
    // the window sideways and given only the height there is below it, so a
    // long pack scrolls inside the menu rather than off the screen.
    // ------------------------------------------------------------
    function Na__LeTabs__PlaceMenu() {
        if (!Na__LeTabs__Menu || !Na__LeTabs__MenuAnchor || !Na__LeTabs__Root) return;
        const strip = Na__LeTabs__Root.getBoundingClientRect();
        const tab   = Na__LeTabs__MenuAnchor.getBoundingClientRect();
        const top   = Math.round(strip.bottom);
        Na__LeTabs__Menu.style.top       = top + 'px';
        Na__LeTabs__Menu.style.maxHeight = Math.max(96, window.innerHeight - top - Na__LeTabs__MENU_FOOT) + 'px';
        const width = Na__LeTabs__Menu.offsetWidth;
        let left = Math.round(tab.left);
        if (left + width > window.innerWidth - Na__LeTabs__MENU_EDGE) left = window.innerWidth - Na__LeTabs__MENU_EDGE - width;
        Na__LeTabs__Menu.style.left = Math.max(Na__LeTabs__MENU_EDGE, left) + 'px';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Press Anywhere Else Shuts the Menu
    // ------------------------------------------------------------
    function Na__LeTabs__OnOutsidePress(event) {
        if (!Na__LeTabs__MenuOpen) return;
        const target = event.target;
        if (Na__LeTabs__Menu && Na__LeTabs__Menu.contains(target)) return;
        if (Na__LeTabs__MenuAnchor && Na__LeTabs__MenuAnchor.contains(target)) return;   // <-- The tab's own click toggles it shut
        Na__LeTabs__CloseMenu(false);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Keys While the Menu Is Open
    // ------------------------------------------------------------
    // Escape shuts it from anywhere. Inside it the arrows walk the rows and
    // Home and End jump to the ends; Enter and Space are the row's own. The
    // keys are stopped here so the sheet's keyboard underneath never nudges
    // an item while a reader is choosing a drawing.
    // ------------------------------------------------------------
    function Na__LeTabs__OnMenuKey(event) {
        if (!Na__LeTabs__MenuOpen) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); Na__LeTabs__CloseMenu(true); return; }
        if (!Na__LeTabs__Menu || !Na__LeTabs__Menu.contains(event.target)) return;
        const rows = Array.from(Na__LeTabs__Menu.querySelectorAll('.na-le-tabs__menu-row'));
        const at   = rows.indexOf(document.activeElement);
        let next = -1;
        if      (event.key === 'ArrowDown') next = Math.min(rows.length - 1, at + 1);
        else if (event.key === 'ArrowUp')   next = Math.max(0, at - 1);
        else if (event.key === 'Home')      next = 0;
        else if (event.key === 'End')       next = rows.length - 1;
        else return;
        event.preventDefault();
        event.stopPropagation();
        if (rows[next]) rows[next].focus();
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the Menu Under a Drawings Tab
    // ------------------------------------------------------------
    // The open drawing's row takes the focus, so the arrow keys carry on from
    // where the reader is and Escape has somewhere to give the focus back to.
    // ------------------------------------------------------------
    function Na__LeTabs__OpenMenu(anchor) {
        if (!anchor) return false;
        Na__LeTabs__MenuAnchor = anchor;
        Na__LeTabs__MenuOpen   = true;
        const menu = Na__LeTabs__FillMenu();
        anchor.setAttribute('aria-expanded', 'true');
        anchor.classList.add('na-le-tabs__tab--menu-open');
        menu.hidden = false;
        Na__LeTabs__PlaceMenu();
        const open = menu.querySelector('.na-le-tabs__menu-row--open') || menu.querySelector('.na-le-tabs__menu-row');
        if (open) {
            menu.scrollTop = Math.max(0, open.offsetTop - Math.round(menu.clientHeight / 2));   // <-- The open drawing in the middle of a long list; never scrollIntoView, which would move the page
            open.focus({ preventScroll : true });
        }
        document.addEventListener('pointerdown', Na__LeTabs__OnOutsidePress, true);
        document.addEventListener('keydown', Na__LeTabs__OnMenuKey, true);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Shut the Menu
    // ------------------------------------------------------------
    // refocus: put the focus back on the Drawings tab (a keyboard close).
    // ------------------------------------------------------------
    function Na__LeTabs__CloseMenu(refocus) {
        if (!Na__LeTabs__MenuOpen) return false;
        Na__LeTabs__MenuOpen = false;
        if (Na__LeTabs__Menu) Na__LeTabs__Menu.hidden = true;
        document.removeEventListener('pointerdown', Na__LeTabs__OnOutsidePress, true);
        document.removeEventListener('keydown', Na__LeTabs__OnMenuKey, true);
        const anchor = Na__LeTabs__MenuAnchor;
        Na__LeTabs__MenuAnchor = null;
        if (anchor) {
            anchor.setAttribute('aria-expanded', 'false');
            anchor.classList.remove('na-le-tabs__tab--menu-open');
            if (refocus && anchor.isConnected) anchor.focus({ preventScroll : true });
        }
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Drawings Tab Was Pressed: Open or Shut the Menu
    // ------------------------------------------------------------
    function Na__LeTabs__ToggleMenu(anchor) {
        if (Na__LeTabs__MenuOpen) return Na__LeTabs__CloseMenu(false);
        return Na__LeTabs__OpenMenu(anchor);
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
        nav.setAttribute('aria-label', 'Project documents');
        nav.hidden = true;
        // THE ARROWS SIT OUTSIDE THE SCROLLER, so they stay put at the ends of
        // the visible run however far the tabs are scrolled along.
        nav.innerHTML = '<button type="button" class="na-le-tabs__arrow na-le-tabs__arrow--prev" hidden>‹</button>'
                      + '<div class="na-le-tabs__scroller"></div>'
                      + '<button type="button" class="na-le-tabs__arrow na-le-tabs__arrow--next" hidden>›</button>';
        if (header && header.parentNode) header.parentNode.insertBefore(nav, header.nextSibling);
        else document.body.insertBefore(nav, document.body.firstChild);
        Na__LeTabs__Root     = nav;
        Na__LeTabs__Scroller = nav.querySelector('.na-le-tabs__scroller');
        const prev = nav.querySelector('.na-le-tabs__arrow--prev');
        const next = nav.querySelector('.na-le-tabs__arrow--next');
        prev.title = prev.ariaLabel = Na__LeLoad__GetLabel('TabsPreviousTitle', 'The tab before this one');
        next.title = next.ariaLabel = Na__LeLoad__GetLabel('TabsNextTitle', 'The tab after this one');
        prev.addEventListener('click', () => Na__LeTabs__Step(-1));
        next.addEventListener('click', () => Na__LeTabs__Step(1));
        Na__LeTabs__Scroller.addEventListener('scroll', () => { Na__LeTabs__SyncArrows(); if (Na__LeTabs__MenuOpen) Na__LeTabs__PlaceMenu(); }, { passive : true });
        // A ROTATED PHONE FITS A DIFFERENT NUMBER OF TABS, and measured twice on
        // purpose: resize can arrive before the strip has been laid out at the
        // new width, and a reading taken then is of the old one. The second,
        // on the settled frame, is the one that is right. An open menu follows
        // its tab to wherever the new width puts it.
        window.addEventListener('resize', () => {
            Na__LeTabs__SyncArrows();
            if (Na__LeTabs__MenuOpen) Na__LeTabs__PlaceMenu();
            window.requestAnimationFrame(() => { Na__LeTabs__SyncArrows(); if (Na__LeTabs__MenuOpen) Na__LeTabs__PlaceMenu(); });
        });
        window.addEventListener(Na__LeLoad__SHEETS_EVENT, Na__LeTabs__OnModelChanged);   // <-- Only when a tab or a menu row would look different
        window.addEventListener(Na__LeLoad__SPEC_EVENT,  Na__LeTabs__OnModelChanged);   // <-- The specification's unsynced dot
        window.addEventListener(Na__LeLoad__MODE_EVENT,  () => { Na__LeTabs__CloseMenu(false); Na__LeTabs__Render(); });   // <-- A document changed under the menu: it shuts; the strip follows
        window.addEventListener(Na__LeLoad__STATE_EVENT, Na__LeTabs__OnModelChanged);   // <-- This app only: a project loaded or saved, Layout Mode switched, the editor loaded
        Na__LeTabs__Render();                                                    // <-- This app only: started because the editor is offered, so drawn now (TrueVision waits on Na__LeMode__Ready)
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
        Na__LeTabs__Render,
        Na__LeTabs__CloseMenu
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
