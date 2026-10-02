// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - LOADER
// =============================================================================
//
// FILE       : Na__LayoutEditor__Loader__.js
// NAMESPACE  : Na__LeLoad
// MODULE     : Layout Editor - Loader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Keep the Layout Editor off the start-up path: decide when it is offered, and load it the first time it is used
// CREATED    : 15-Sep-2026
//
// DESCRIPTION:
// - THE ONLY LAYOUT EDITOR MODULE THE PAGE IMPORTS. index.html used to import
//   the mode controller, the tab strip and the Dev section, and through them
//   the whole editor: 73 modules (1.9 MB) and three stylesheets on every
//   start-up, for every project, drawings or not.
// - OFFERED when the project's Layout Mode switch is on AND it has at least
//   one sheet, on localhost and on the live site alike. This module answers
//   that from the raw drawings block, before the editor exists, and imports
//   the tab strip the first time the answer is yes. A project without
//   drawings never fetches it.
// - LOADED the first time something needs the editor itself: a drawing
//   opened from the tab strip (a row of its Drawings menu, an end arrow,
//   New sheet), the Specification tab, a drawing row dragged to a new
//   place, or a Dev section action. The loading screen covers the wait
//   while the modules, the editor's stylesheets and its configs arrive;
//   then the mode controller is initialised with the render context
//   index.html used to hand it directly.
// - THE FIRST DRAWING OPENS AS TRUEVISION'S DOES. A press that will open the
//   editor puts the editor's body class on at the click, before anything is
//   fetched, so the 3D furniture goes at once and the header holds and folds
//   over the loading screen, which sits where the editor will. When the press
//   has run, the editor's own first-open veil is already up over the same
//   rectangle, whole, and the screen is dropped behind it: that veil waits on
//   the drawing. A load that fails, an editor its config switches off and a
//   press that opens nothing take the class off again.
// - THE FACADE. The tab strip and the Dev section reach the editor only
//   through this module. Before the load they get answers read from the raw
//   block (the sheets, the switch, nothing open, nothing unsaved) and every
//   action loads first; after it, every call goes straight to the real
//   module, so neither UI needs to know which side of the load it is on.
// - A LATE START. The drawings block arrived while the page started; the
//   editor arrives later. The sheet model announces that load itself, once,
//   as TrueVision's does (its late start, SheetModel 1.35.0): it finds the
//   drawings already loaded when it initialises and says so on a microtask,
//   after the mode controller's start-up pass has attached auto save,
//   history and the spec links. Nothing here announces it again.
// - A drawing rename that has to re-stamp a baked 3D snapshot loads the
//   editor quietly (no screen), because only the editor computes the stamp.
// - TRUEVISION'S ENTRY POINTS, THROUGH THE FACADE. TrueVision's tab strip
//   reaches its editor's document views directly: the register and
//   statement view names, OpenRegister, OpenStatements, Ready and the site
//   plan test. Here each one is a facade name: the view names are copies,
//   the site plan test is TrueVision's own rule read off the record the
//   strip already holds, Ready settles with the first load and never causes
//   one, and a document view this build does not have yet (HasFeature says
//   which) is refused without loading anything.
// - THE SAME ANSWER EITHER SIDE OF THE LOAD. A tab or a Dev row that read
//   one thing before the editor arrived and another after it would change
//   under the reader as the bundle lands. So a question is answered from
//   the raw drawings block by the editor's own rule, and the loaded editor
//   is asked only for what the block cannot say: what is open, what is
//   unsaved, the configured wording and the register's numbering series.
// - THE REGISTRATION PATTERN. Everything TrueVision wires to its editor at
//   start-up is registered here instead, and a port keeps six rules so the
//   editor stays off the start-up path:
//   1. A Layout Editor module enters through the mode controller's own
//      import graph - never index.html, and never a static import in this
//      file, which would put the whole editor back on every start-up.
//   2. Whatever TrueVision's Index.html, tab strip or Dev menu calls on the
//      editor becomes a facade function here. Before the load it answers
//      from the raw drawings block, or refuses, and fetches nothing; an
//      action loads the editor through Na__LeLoad__WithEditor and then calls
//      the real function (an action that opens the editor - a drawing or a
//      document tab - passes enters, so its body class goes on at the
//      press). The editor's modules are reached only through the
//      literal import() specifiers of Na__LeLoad__ImportEditor, so the
//      module graph harness still walks them and the export harness proves
//      every name the facade calls.
//   3. A constant copied here (an event name, a view name, a drawing type)
//      gets a Na__LeLoad__CheckNames row against the editor's own, checked
//      the moment the editor loads - in the change that makes the editor
//      declare it, because a row for a name the editor does not export yet
//      fails the export harness.
//   4. A document view TrueVision always has, and this build may not yet,
//      answers from Na__LeLoad__FEATURES: a static map, never a probe of the
//      editor (a probe would have to load it). Its entry point refuses,
//      loading nothing, until the change that lands the feature flips its
//      entry and forwards the entry point, in one edit.
//   5. A stylesheet TrueVision imports from its CSS index joins
//      Na__LeLoad__STYLESHEETS at TrueVision's position (Surfaces first,
//      WebViewer last), and only once its file exists; a sheet its own
//      module links needs nothing; a rule that must style the page before
//      the editor loads goes to Na__LayoutEditor__Styles__Boot__.css.
//   6. A module that needs the drawings starts from the state as it stands
//      (the drawings block, the sheet model), never from the first
//      drawings-loaded event: the editor arrives after it.
//
// INTEGRATION:
// - index.html calls Na__LeLoad__Initialize with the render context.
// - Na__LayoutEditor__TabStrip__ and Na__LayoutEditor__DevMenu__Controls__
//   import the facade; Na__DrawView__RenameDrawing__ imports the re-stamp.
// - The names it mirrors are TrueVision's (PORT NOTE): the mode controller's
//   view names, OpenRegister, OpenStatements and Ready, and the sheet
//   records' site plan and drawing number rules. The body class it puts on
//   at a press is the mode controller's (na-layout-editor--active), which
//   the header's fold, the 3D furniture's hiding block and the loading
//   screen all key on.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.45.0). No TrueVision twin:
//                   TrueVision imports its editor with the page and keeps LE/01 free for a loader.
// - Mirrors       : TrueVision3D's editor entry points, read at b2aa9151 (v2.172.0): the mode
//                   controller 1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026) - VIEW_REGISTER,
//                   VIEW_STATEMENT, OpenRegister, OpenStatements, Ready; the sheet records' site plan
//                   rule (Na__LeRec__IsSitePlanSheet, 'siteplan', TrueVision3D v2.48.0) and drawing
//                   number (Na__LeRec__DrawingNumber: the stored number, else the register's series
//                   and the sheet's place, TrueVision3D v2.71.0); and the first
//                   open of TrueVision3D v2.83.0 (LoadingVeil 1.1.0, the mode controller's Enter): the
//                   body class lands at the press and the first-open veil covers the drawing
// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.2 (the entry points above; the
//                   loader itself is this app's); 02-Oct-2026 for ValeVision3D v2.71.2 (the
//                   first open: the body class at the press, the hand-over to the first-open veil);
//                   02-Oct-2026 for ValeVision3D v2.71.2 (TrueVision's tab strip 2.0.0 reads
//                   the editor through this facade alone); 02-Oct-2026 for ValeVision3D
//                   v2.71.3 (the sheet model's own late start; the drawing number's default)
// - Parity        : new - a permanent ValeVision seam (DR-24 (a))
// - Divergences   :
//   - The whole module: TrueVision loads its editor with the page and has no facade.
//   - Layout Mode (DR-25 (a)): the editor is offered only while the project's switch is on and it
//     has a sheet; TrueVision's strip shows whenever a sheet exists.
//   - TrueVision always has its Document Register and Statements views. Here
//     Na__LeLoad__HasFeature says whether this build has them, and their entry points refuse,
//     loading nothing, until they land.
//   - The first drawing tab of a session opens under the loading screen while the editor is
//     fetched. Its body class goes on at the press (TrueVision's Enter adds it in the click
//     task; here Enter runs after the import) and comes off again when the editor does not
//     open; the screen hands over to the first-open veil, which the mode controller puts up
//     whole while the screen is still up (immediate, R6 F.8 C22).
// - Back-port     : none - a permanent ValeVision divergence, not a back-port candidate (DR-24 (a),
//                   D64). Offering it to TrueVision would be a new decision under DR-36 (b).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.1.6 ({{VVREL:W2-18}})
// - THE DRAFTING AIDS' STYLESHEETS LOAD WITH THE EDITOR. Draft mode's
//   (26__System__DraftMode/Na__LayoutEditor__Styles__DraftMode__.css, every
//   rule keyed on body.na-le-draft), the drawing grid's
//   (27__System__DrawingGrid/Na__LayoutEditor__Styles__DrawingGrid__.css,
//   the grid's canvas on the paper) and the drawing axes'
//   (33__System__DrawingAxes/Na__LayoutEditor__Styles__DrawingAxes__.css,
//   the axes layer) join Na__LeLoad__STYLESHEETS in TrueVision's CSS-index
//   order (rule 5 above): Draft and Grid between Styles__Main__Paper and
//   Styles__ObjectSnap, Axes straight after it. Their modules landed in the
//   same change and stay inert until the drafting aids are switched on, so
//   none of the three styles anything yet.
//
// 02-Oct-2026 - Version 1.1.5 ({{VVREL:W2-19}})
// - OBJECT SNAP'S STYLESHEET LOADS WITH THE EDITOR.
//   28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css (the
//   snap marker coloured by what it snapped to, the Snap button's arrow, the
//   snap options menu and the Move Anchor's cross) joins
//   Na__LeLoad__STYLESHEETS straight after Styles__Main__Paper, its place in
//   TrueVision's CSS index (rule 5 above). The marker's old rules left
//   Styles__Main__Paper in the same change.
//
// 02-Oct-2026 - Version 1.1.4 (v2.71.3)
// - THE SHEET MODEL ANNOUNCES ITS OWN LATE START. The sheet model is
//   TrueVision's 1.35.1 now, and its Initialize announces a project load
//   that landed before the editor did - once, on a microtask, after the
//   mode controller's start-up pass has attached auto save, history and
//   the spec links - and runs the common field seed, which the loader's
//   re-announcement had skipped. Na__LeLoad__AnnounceProjectLoad and its
//   call are gone: kept, the load would be announced twice.
// - CheckNames checks the site plan drawing type, now that the sheet model
//   declares DRAWING_SITEPLAN.
// - A TAB'S CODE FOLLOWS THE SHEET RECORDS' DRAWING NUMBER. GetDrawingNumber,
//   GetShortCode and GetTabLabel read TrueVision's rule
//   (Na__LeRec__DrawingNumber): the stored number, else the register's
//   series and the sheet's place ("D01"), the series read from the
//   editor's config once it has loaded. The sheet model reads the same
//   rule now that its Sheets unit is TrueVision's, so the Drawings menu,
//   its hover and the Dev list name a drawing as the toolbar and the Sheet
//   panel do, before the load and after it.
//
// 02-Oct-2026 - Version 1.1.3 (TrueVision's tab strip 2.0.0, v2.71.2)
// - THE COMPACT STRIP NEEDS NOTHING NEW HERE. TrueVision's tab strip 2.0.0
//   reads its config, sheet model, mode controller and specification
//   through this facade alone: the document tabs ask HasFeature, the
//   Drawings menu's rows IsSitePlanSheet, its New sheet row CreateSheet,
//   and the drag this app keeps on those rows until the Document Register
//   lands ReorderSheet. The code is unchanged; the header now says what
//   loads the editor from that strip (a Drawings menu row, an end arrow,
//   New sheet, the Specification tab, a dragged row), as it has no tab per
//   sheet, no + tab and no rename any more.
//
// 02-Oct-2026 - Version 1.1.2 (the first open as TrueVision's, v2.71.2)
// - THE BAR FOLDS AT THE CLICK. A press that will open the editor - a
//   drawing tab, the Dev section's Open, the Project Specification - puts
//   the editor's body class (na-layout-editor--active) on before anything
//   is fetched, so the 3D furniture goes at once and the header holds and
//   folds over the loading screen as TrueVision's does over its editor.
//   The class comes off again when the load fails, when the editor's
//   config has it off, and when the press opens nothing (Enter said no:
//   Layout Mode switched off meanwhile), so the bar comes back down.
// - NO DRAWING WAIT HERE ANY MORE. The screen is dropped as soon as the
//   press has run: by then the editor's own first-open veil is up over the
//   same rectangle at full opacity, and it waits on the drawing, the
//   specification and the fonts as TrueVision's does. AwaitFirstDrawing
//   and the screen's drawing-count line are retired; the 20-Sep-2026 change
//   that added them (ValeVision3D v2.70.0) was never logged here.
// - The screen's two pre-load lines are in Title Case: "Fetching the
//   Drawing Tools", "Reading the Drawing Settings".
// - CheckNames checks the register and statement view names, now that the
//   mode controller declares them.
//
// 01-Oct-2026 - Version 1.1.1 (TrueVision's editor entry points, v2.71.2)
// - TRUEVISION'S TAB STRIP CAN BE TAKEN THROUGH THIS FACADE. Its document
//   views gain their facade names: the view-name copies VIEW_REGISTER and
//   VIEW_STATEMENT; OpenRegister and OpenStatements, refused without loading
//   anything while this build has no register or statements
//   (Na__LeLoad__HasFeature, a static map the changes that land them flip);
//   IsSitePlanSheet, TrueVision's rule read off the record, with SheetViews
//   now carrying Sheet__DrawingType for a site plan; and Ready, which
//   settles with the first load and never causes one.
// - The registration pattern is written into the header: how an entry
//   point, a copied constant, a document feature and a stylesheet join the
//   facade without putting the editor back on the start-up path.
// - The drawing count on the loading screen reads the editor's own veil
//   label (VeilDrawingViews) once the editor is there, as TrueVision's
//   first-open veil does; the words are unchanged.
// - The back-port line says what the ledger says (DR-24 (a), D64): a
//   permanent ValeVision divergence, not a back-port candidate.
//
// 19-Sep-2026 - Version 1.1.0
// - Short tab names, ported from TrueVision3D v2.70.0. GetTabLabel, GetShortCode
//   and GetDrawingNumber on the facade, composed from the dependency-free
//   Na__LayoutEditor__DrawingCode__ leaf rather than from the editor, because
//   the tab strip and the Dev menu name sheets before the editor is loaded - a
//   tab that gained its code only once the bundle arrived would rename itself
//   under the reader. SheetViews carries each record's Sheet__Fields for the
//   same reason (read only, for the drawing number).
// - The pre-load default name follows the config to "New Drawing".
//
// 15-Sep-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The Drawings Block, the Authoring Gate and the Loading Screen
    // ------------------------------------------------------------
    // All three are on the start-up path already or belong to the loader. An
    // import added here that reaches into the editor puts the whole editor
    // back on every start-up: editor modules are only ever import()ed below.
    // ------------------------------------------------------------
    import {
        Na__DrawData__CHANGED_EVENT,
        Na__DrawData__GetSheetsArray,
        Na__DrawData__GetLayoutModeEnabled,
        Na__DrawData__SetLayoutModeEnabled,
        Na__DrawData__Save
    } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    import { Na__DevGate__IsAuthoringEnabled } from '../../03__AppUtils/Na__AppUtils__DevGate__.js';
    import { Na__LeCode__ShortCode, Na__LeCode__Compose } from '../07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js';   // <-- A leaf with no imports of its own: the tab code rules, without pulling the editor in
    import {
        Na__LeLoadScreen__Show,
        Na__LeLoadScreen__SetStatus,
        Na__LeLoadScreen__Hide,
        Na__LeLoadScreen__ShowError
    } from './Na__LayoutEditor__LoadingScreen__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Event Names, Views and the Drawing Type the Tab Strip and Dev Section Use
    // ------------------------------------------------------------
    // Copies of the names the editor's modules declare, so both UIs can listen
    // before those modules exist. Compared with the real constants the moment
    // the editor loads; a mismatch is reported in the console.
    // ------------------------------------------------------------
    const Na__LeLoad__SHEETS_EVENT     = 'na-layouteditor-sheets-changed';    // <-- Na__LeModel__CHANGED_EVENT
    const Na__LeLoad__MODE_EVENT       = 'na-layouteditor-mode-changed';      // <-- Na__LeMode__CHANGED_EVENT
    const Na__LeLoad__SPEC_EVENT       = 'na-layouteditor-spec-changed';      // <-- Na__LeSpec__CHANGED_EVENT
    const Na__LeLoad__VIEW_SHEET       = 'sheet';                             // <-- Na__LeMode__VIEW_SHEET
    const Na__LeLoad__VIEW_SPEC        = 'spec';                              // <-- Na__LeMode__VIEW_SPEC
    const Na__LeLoad__VIEW_REGISTER    = 'register';                          // <-- Na__LeMode__VIEW_REGISTER (TrueVision's mode controller)
    const Na__LeLoad__VIEW_STATEMENT   = 'statement';                         // <-- Na__LeMode__VIEW_STATEMENT (TrueVision's mode controller)
    const Na__LeLoad__DRAWING_SITEPLAN = 'siteplan';                          // <-- Na__LeModel__DRAWING_SITEPLAN: the only drawing type a sheet record ever stores
    const Na__LeLoad__STATE_EVENT      = 'na-layouteditor-loader-changed';    // <-- This module: a project loaded or saved, Layout Mode switched, the editor loaded
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Editor's Body Class, Put On at the Press
    // ------------------------------------------------------------
    // The mode controller's own class (Na__LeMode__BODY_CLASS, which neither
    // app exports, so CheckNames has nothing to read it from). The header's
    // fold, the 3D furniture's hiding block and the loading screen's place
    // all key on it, so a press that will open the editor sets it before the
    // import, as TrueVision's Enter does in the click task.
    // ------------------------------------------------------------
    const Na__LeLoad__BODY_CLASS       = 'na-layout-editor--active';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Views This Build Has
    // ------------------------------------------------------------
    // TrueVision always has all four, so its tab strip shows every document
    // tab. This build answers from this map instead: static, never a probe of
    // the editor, because a probe would have to load the editor to answer a
    // question the strip asks at start-up. A view marked false is refused
    // without loading anything (Na__LeLoad__OpenRegister, OpenStatements); the
    // change that lands its feature flips the entry and forwards its entry
    // point, in one edit.
    // ------------------------------------------------------------
    const Na__LeLoad__FEATURES = Object.freeze({
        [Na__LeLoad__VIEW_SHEET]     : true,      // <-- The drawing tabs
        [Na__LeLoad__VIEW_SPEC]      : true,      // <-- The Project Specification
        [Na__LeLoad__VIEW_REGISTER]  : false,     // <-- The Document Register (51__Feature__DrawingRegister): not in this build yet
        [Na__LeLoad__VIEW_STATEMENT] : false      // <-- The Statement Writer (52__Feature__StatementWriter): not in this build yet, and switched off by its own config when it lands (DR-10)
    });
    // ------------------------------------------------------------

    // MODULE CONSTANTS | The Stylesheets That Load With the Editor
    // ------------------------------------------------------------
    // Linked in this order, which is the cascade order the rules were written
    // in: a sheet split in two keeps its halves next to each other.
    // ------------------------------------------------------------
    const Na__LeLoad__STYLESHEETS = [
        new URL('../10__Core__SheetSurface/Na__LayoutEditor__Styles__Surfaces__.css', import.meta.url).href,   // <-- FIRST: the ground, paper and shadow tokens every sheet below reads
        new URL('../10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css', import.meta.url).href,
        new URL('../10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__Paper__.css', import.meta.url).href,
        new URL('../26__System__DraftMode/Na__LayoutEditor__Styles__DraftMode__.css', import.meta.url).href,   // <-- Draft mode (K): every rule keyed on body.na-le-draft, so it is inert until Draft is on
        new URL('../27__System__DrawingGrid/Na__LayoutEditor__Styles__DrawingGrid__.css', import.meta.url).href,   // <-- Drawing grid (F6 / F7): the grid's canvas on the paper and the grid snap ring
        new URL('../28__System__ObjectSnap/Na__LayoutEditor__Styles__ObjectSnap__.css', import.meta.url).href,   // <-- Object snap (F3): the snap marker (coloured by what it snapped to), the Snap button's arrow and the snap options menu
        new URL('../33__System__DrawingAxes/Na__LayoutEditor__Styles__DrawingAxes__.css', import.meta.url).href,   // <-- Drawing axes overlay (F9): SketchUp's red and green axes on the cursor, out to the edges of the sheet
        new URL('../40__Ui__Panels/Na__LayoutEditor__Styles__Panels__.css', import.meta.url).href,
        new URL('../50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css', import.meta.url).href,
        new URL('../50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Notes__.css', import.meta.url).href,
        new URL('../50__Feature__Specification/Na__LayoutEditor__Styles__Specification__Read__.css', import.meta.url).href,
        new URL('../80__Feature__WebViewer/Na__LayoutEditor__Styles__WebViewer__.css', import.meta.url).href   // <-- LAST: it reshapes the shell and the specification page for the read-only web viewer
    ];
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Main Config Block, Dev Section Ids, Record Fallbacks and Wording
    // ------------------------------------------------------------
    const Na__LeLoad__MAIN_BLOCK       = 'LayoutEditor__Config';               // <-- Na__AppConfig__Main.json: the web read-only flag
    const Na__LeLoad__DEV_ITEM_ID      = 'naLayoutEditorDevItem';              // <-- index.html
    const Na__LeLoad__DEV_TOGGLE_ID    = 'naLayoutEditorDevToggle';
    const Na__LeLoad__NAME_FORMAT      = 'New Drawing';                        // <-- The config's DefaultNameFormat, for a record without a name
    const Na__LeLoad__PAPER_SIZE       = 'A3';                                 // <-- The config's DefaultPaperSize, for a record without one
    const Na__LeLoad__STATUS_FILES     = 'Fetching the Drawing Tools';           // <-- The screen's two pre-load lines, in Title Case; the drawing's own lines are the first-open veil's
    const Na__LeLoad__STATUS_SETTINGS  = 'Reading the Drawing Settings';
    const Na__LeLoad__MSG_SWITCHED_OFF = 'The Layout Editor is switched off in its config.';
    const Na__LeLoad__MSG_DEV_FAILED   = 'The Layout Editor Dev section could not load. The console has the reason.';
    // ------------------------------------------------------------

    // MODULE VARIABLES | Context, the Loaded Editor and the Imports in Flight
    // ------------------------------------------------------------
    let Na__LeLoad__Context    = null;    // <-- The render context from index.html, handed to the mode controller on load
    let Na__LeLoad__Editor     = null;    // <-- { mode, model, spec, config, viewport3d, pdf } once loaded
    let Na__LeLoad__Loading    = null;    // <-- The load in flight, shared by every caller meanwhile
    let Na__LeLoad__Disabled   = false;   // <-- The editor's own config has it off (known only after a load)
    let Na__LeLoad__TabsImport = null;    // <-- The tab strip import, started the first time the editor is offered
    let Na__LeLoad__DevImport  = null;    // <-- The Dev section import, started the first time the section is opened
    let Na__LeLoad__Offered    = null;    // <-- The last announced answer to IsAvailable
    let Na__LeLoad__ReadyWait  = null;    // <-- { promise, settle }: Ready asked before the editor started, settled by the load
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Before the Editor Exists
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Sheet Records as the Project Supplied Them
    // ------------------------------------------------------------
    function Na__LeLoad__RawRecords() {
        const records = Na__DrawData__GetSheetsArray();
        return Array.isArray(records)
            ? records.filter((record) => record && typeof record === 'object' && typeof record.Sheet__Id === 'string')
            : [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read-Only Views of the Sheets, Ordered as the Sheet Model Orders Them
    // ------------------------------------------------------------
    // The records are not normalised here. That needs the editor's config, and
    // writing defaults into them before it has loaded would change what the
    // next save writes. A view carries what the tab strip and the Dev list
    // show, with the sheet model's own fallbacks where a field is missing,
    // and a site plan's drawing type as the record stores it.
    // ------------------------------------------------------------
    function Na__LeLoad__SheetViews() {
        return Na__LeLoad__RawRecords().map((record, index) => {
            const view = {
                Sheet__Id        : record.Sheet__Id,
                Sheet__Name      : (typeof record.Sheet__Name === 'string' && record.Sheet__Name) ? record.Sheet__Name : Na__LeLoad__NAME_FORMAT.split('{index}').join(String(index + 1)),
                Sheet__Order     : (typeof record.Sheet__Order === 'number' && Number.isFinite(record.Sheet__Order)) ? record.Sheet__Order : index + 1,
                Sheet__PaperSize : (typeof record.Sheet__PaperSize === 'string' && record.Sheet__PaperSize) ? record.Sheet__PaperSize : Na__LeLoad__PAPER_SIZE,
                Sheet__Fields    : (record.Sheet__Fields && typeof record.Sheet__Fields === 'object') ? record.Sheet__Fields : {},   // <-- Read only, and only for the tab's drawing code: a tab must not change when the editor finishes loading
                Sheet__Viewports : Array.isArray(record.Sheet__Viewports) ? record.Sheet__Viewports : []
            };
            if (record.Sheet__DrawingType === Na__LeLoad__DRAWING_SITEPLAN) view.Sheet__DrawingType = Na__LeLoad__DRAWING_SITEPLAN;   // <-- Stored only for a site plan, as the record keeps it, so IsSitePlanSheet answers as it will once the editor has loaded
            return view;
        }).sort((a, b) => a.Sheet__Order - b.Sheet__Order);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Drawing Register's Numbering Series: the Editor's Config Once Loaded
    // ------------------------------------------------------------
    // { prefix, digits, ... } from the editor's own reader once it has loaded;
    // before that an empty setup, and the rule below falls back to the
    // defaults the sheet records fall back to (D, two digits).
    // ------------------------------------------------------------
    function Na__LeLoad__RegisterSetup() {
        const read  = Na__LeLoad__Editor ? Na__LeLoad__Editor.config.Na__LeCfg__GetDrawingRegisterSetup : null;
        const setup = (typeof read === 'function') ? read() : null;
        return (setup && typeof setup === 'object') ? setup : {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Sheet's Drawing Number, by the Sheet Records' Rule (TrueVision's Na__LeRec__DrawingNumber)
    // ------------------------------------------------------------
    // The number a sheet stores, else the register's series and the sheet's
    // place in the order ("D01") - TrueVision's rule line for line, which
    // the sheet model reads too. The pre-load views carry Sheet__Order with
    // the sheet model's own fallback, so a sheet reads the same number
    // either side of the load.
    // ------------------------------------------------------------
    function Na__LeLoad__DrawingNumber(sheet) {
        const stored = (sheet && sheet.Sheet__Fields) ? sheet.Sheet__Fields.Sheet__Fields__DrawingNumber : undefined;
        if (typeof stored === 'string') return stored;
        const setup  = Na__LeLoad__RegisterSetup();
        const digits = Math.max(1, Math.min(6, Math.round(Number(setup.digits) || 2)));
        return String(setup.prefix || 'D') + String(sheet ? sheet.Sheet__Order : 1).padStart(digits, '0');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Web Read-Only Flag, Read as the Config Module Reads It
    // ------------------------------------------------------------
    function Na__LeLoad__IsReadOnlyOnWeb() {
        const config = Na__LeLoad__Context ? Na__LeLoad__Context.appConfig : null;
        const main   = (config && typeof config === 'object') ? config[Na__LeLoad__MAIN_BLOCK] : null;
        return !main || main['LayoutEditor__Config__ReadOnlyOnWeb'] !== false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Does a Sheet Viewport Hold a Baked Snapshot of This Scene?
    // ------------------------------------------------------------
    // The same test Na__LeVp3d__RestampForScene applies before it re-stamps.
    // ------------------------------------------------------------
    function Na__LeLoad__HasBakedSnapshotOf(sceneId) {
        return Na__LeLoad__RawRecords().some((sheet) => Array.isArray(sheet.Sheet__Viewports) && sheet.Sheet__Viewports.some((viewport) => {
            const slot = viewport ? viewport.Viewport__SnapshotAsset : null;
            return !!(viewport && viewport.Viewport__SceneId === sceneId && slot && slot.Asset__Path && slot.Asset__Fingerprint);
        }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toast Through the App
    // ------------------------------------------------------------
    function Na__LeLoad__Toast(message, isError) {
        const toast = Na__LeLoad__Context ? Na__LeLoad__Context.showToast : null;
        if (typeof toast === 'function') toast(message, isError === true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Import the Editor's Entry Modules
    // ------------------------------------------------------------
    // The mode controller brings the rest of the editor with it. The other five
    // are already in its graph; they are named here for the facade to call.
    // Literal specifiers, so the module graph harness walks the editor too.
    // ------------------------------------------------------------
    function Na__LeLoad__ImportEditor() {
        return Promise.all([
            import('../05__Core__ModeController/Na__LayoutEditor__ModeController__.js'),
            import('../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js'),
            import('../50__Feature__Specification/Na__LayoutEditor__SpecData__.js'),
            import('../03__Core__Config/Na__LayoutEditor__ConfigState__.js'),
            import('../20__System__Viewports/Na__LayoutEditor__Viewport3d__.js'),
            import('../60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js')
        ]).then(([mode, model, spec, config, viewport3d, pdf]) => ({ mode, model, spec, config, viewport3d, pdf }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Link the Editor's Stylesheets and Wait for Them
    // ------------------------------------------------------------
    // Linked at the end of the head. Their selectors are the editor's own
    // (na-le- classes and body.na-layout-editor--active), so landing after the
    // page's other sheets changes no other rule. A sheet that fails is
    // reported and not waited on: an unstyled editor is still an editor.
    // ------------------------------------------------------------
    function Na__LeLoad__LinkStylesheets() {
        return Promise.all(Na__LeLoad__STYLESHEETS.map((href) => new Promise((resolve) => {
            if (document.querySelector('link[data-na-le-stylesheet="' + href + '"]')) { resolve(); return; }
            const link = document.createElement('link');
            link.rel  = 'stylesheet';
            link.href = href;
            link.setAttribute('data-na-le-stylesheet', href);
            link.addEventListener('load', () => resolve(), { once : true });
            link.addEventListener('error', () => {
                console.warn('[ValeVision3D] Layout Editor stylesheet failed to load: ' + href);
                resolve();
            }, { once : true });
            document.head.appendChild(link);
        })));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Check the Name Copies Against the Editor's Own
    // ------------------------------------------------------------
    // One row per copy the editor declares. A copy whose constant the editor
    // does not declare yet gets its row in the change that declares it: a
    // row reading a name the editor does not export fails the export
    // harness, which is what that harness is for.
    // ------------------------------------------------------------
    function Na__LeLoad__CheckNames(editor) {
        [
            [ Na__LeLoad__SHEETS_EVENT, editor.model.Na__LeModel__CHANGED_EVENT, 'the sheet model change event'   ],
            [ Na__LeLoad__MODE_EVENT,   editor.mode.Na__LeMode__CHANGED_EVENT,   'the mode change event'          ],
            [ Na__LeLoad__SPEC_EVENT,   editor.spec.Na__LeSpec__CHANGED_EVENT,   'the specification change event' ],
            [ Na__LeLoad__VIEW_SHEET,   editor.mode.Na__LeMode__VIEW_SHEET,      'the sheet view name'            ],
            [ Na__LeLoad__VIEW_SPEC,    editor.mode.Na__LeMode__VIEW_SPEC,       'the specification view name'    ],
            [ Na__LeLoad__VIEW_REGISTER,  editor.mode.Na__LeMode__VIEW_REGISTER,  'the register view name'   ],
            [ Na__LeLoad__VIEW_STATEMENT, editor.mode.Na__LeMode__VIEW_STATEMENT, 'the statements view name' ],
            [ Na__LeLoad__DRAWING_SITEPLAN, editor.model.Na__LeModel__DRAWING_SITEPLAN, 'the site plan drawing type' ]
        ].forEach(([copy, real, what]) => {
            if (copy === real) return;
            console.error('[ValeVision3D] Layout Editor loader: ' + what + ' is "' + real + '" but the loader holds "' + copy + '". The tab strip and Dev section miss it until the loader copy is updated.');
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch, Link and Initialise the Editor
    // ------------------------------------------------------------
    // Resolves to the editor, or to null when its config has it off. Rejects
    // when a file cannot be fetched or linked, or the editor fails to start.
    // The project load is announced by the sheet model itself while the mode
    // controller starts (its late start), so nothing is announced here.
    // ------------------------------------------------------------
    async function Na__LeLoad__Run() {
        if (!Na__LeLoad__Context) throw new Error('Na__LeLoad__Initialize has not run.');
        const started = performance.now();

        Na__LeLoadScreen__SetStatus(Na__LeLoad__STATUS_FILES);
        const loaded = await Promise.all([ Na__LeLoad__ImportEditor(), Na__LeLoad__LinkStylesheets() ]);
        const editor = loaded[0];

        Na__LeLoadScreen__SetStatus(Na__LeLoad__STATUS_SETTINGS);
        const enabled = await editor.mode.Na__LeMode__Initialize(Na__LeLoad__Context);   // <-- The call index.html used to make at start-up
        if (!enabled) {
            if (editor.config.Na__LeCfg__IsEnabled()) throw new Error('The editor did not start. The console has the reason.');
            Na__LeLoad__Disabled = true;
            Na__LeLoad__SyncOffer(true);
            return null;
        }

        Na__LeLoad__CheckNames(editor);
        Na__LeLoad__Editor = editor;                                             // <-- From here every facade call goes straight to the editor
        Na__LeLoad__SyncOffer(true);
        console.log('[ValeVision3D] Layout Editor loaded on first use (' + Math.round(performance.now() - started) + ' ms).');
        return editor;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Settle the Ready Promise Handed Out Before the Load
    // ------------------------------------------------------------
    function Na__LeLoad__SettleReady(ready) {
        const wait = Na__LeLoad__ReadyWait;
        Na__LeLoad__ReadyWait = null;
        if (wait) wait.settle(ready === true);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | One Load, Shared by Everyone Who Asks While It Runs
    // ------------------------------------------------------------
    function Na__LeLoad__Load() {
        if (Na__LeLoad__Editor)   return Promise.resolve(Na__LeLoad__Editor);
        if (Na__LeLoad__Disabled) return Promise.resolve(null);
        if (!Na__LeLoad__Loading) {
            Na__LeLoad__Loading = Na__LeLoad__Run()
                .then((editor) => { Na__LeLoad__SettleReady(!!editor); return editor; },
                      (error)  => { Na__LeLoad__SettleReady(false); throw error; })   // <-- A Ready asked before the load hears how it went
                .finally(() => { Na__LeLoad__Loading = null; });
        }
        return Na__LeLoad__Loading;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Editor's Body Class, On at the Press and Off When Nothing Opens
    // ------------------------------------------------------------
    function Na__LeLoad__SetEditorClass(on) {
        document.body.classList.toggle(Na__LeLoad__BODY_CLASS, on === true);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Run an Action on the Editor, Loading It First if Needed
    // ------------------------------------------------------------
    // Loaded: the action runs at once, with no screen. Not loaded: the loading
    // screen shows (unless quiet), the editor loads, the action runs, and the
    // screen is dropped as soon as it has run. A long action (a bake) hands
    // back its promise and the screen hides as it starts; its progress
    // belongs to the Dev section. Resolves to the action's result, or null
    // when the editor could not be had.
    //
    // enters: the action opens the editor (a drawing tab, the specification).
    // Its body class goes on at the press, before the import, so the 3D
    // furniture goes at once and the header holds and folds over the loading
    // screen as TrueVision's does over its editor, whose Enter runs in the
    // click task. Every way the editor can fail to open takes it off again,
    // and the bar comes back down.
    // ------------------------------------------------------------
    async function Na__LeLoad__WithEditor(action, quiet, enters) {
        if (Na__LeLoad__Editor) return action(Na__LeLoad__Editor);
        const early = !quiet && enters === true && Na__LeLoad__IsAvailable();   // <-- Only a press that will open the editor: never a quiet load or a Dev action
        if (early) Na__LeLoad__SetEditorClass(true);
        if (!quiet) Na__LeLoadScreen__Show();

        let editor = null;
        try {
            editor = await Na__LeLoad__Load();
        } catch (error) {
            if (early) Na__LeLoad__SetEditorClass(false);                         // <-- Nothing opened: the bar comes back down behind the error state, so Back to 3D Model finds it down
            console.error('[ValeVision3D] Layout Editor failed to load:', error);
            if (!quiet) Na__LeLoadScreen__ShowError(String((error && error.message) || error));
            return null;
        }

        if (!editor) {                                                           // <-- The editor's own config has it off
            if (early) Na__LeLoad__SetEditorClass(false);
            if (!quiet) Na__LeLoadScreen__Hide(true);
            Na__LeLoad__Toast(Na__LeLoad__MSG_SWITCHED_OFF, true);
            return null;
        }

        try {
            return action(editor);
        } finally {
            // THE HAND-OVER. The screen used to wait here for the sheet's
            // pictures; it no longer needs to. Enter has put the editor's own
            // first-open veil up over the same rectangle, whole, because it
            // asked Na__LeLoadScreen__IsShown while this screen was still up
            // (R6 F.8 C22), and that veil waits on the drawing, the
            // specification and the fonts. So the screen is dropped once the
            // action has run, never before it, and the veil painted above it is
            // what the reader sees go.
            if (early && !editor.mode.Na__LeMode__IsActive()) Na__LeLoad__SetEditorClass(false);   // <-- The press opened nothing (Enter said no: Layout Mode switched off meanwhile)
            if (!quiet) Na__LeLoadScreen__Hide();                                // <-- Two frames, then the veil's fade
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Offering the Editor
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Import the Tab Strip the First Time the Editor Is Offered
    // ------------------------------------------------------------
    function Na__LeLoad__ImportTabs() {
        Na__LeLoad__TabsImport = import('../05__Core__ModeController/Na__LayoutEditor__TabStrip__.js')
            .then((tabs) => tabs.Na__LeTabs__Initialize())
            .catch((error) => console.error('[ValeVision3D] Layout Editor tab strip failed to load:', error));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Ask Again Whether the Editor Is Offered, and Say So
    // ------------------------------------------------------------
    // force: announce even when the answer has not changed, because a project
    // load or save can rename or reorder the sheets the strip is showing.
    // ------------------------------------------------------------
    function Na__LeLoad__SyncOffer(force) {
        const offered = Na__LeLoad__IsAvailable();
        if (offered && !Na__LeLoad__TabsImport) Na__LeLoad__ImportTabs();
        if (force !== true && offered === Na__LeLoad__Offered) return;
        Na__LeLoad__Offered = offered;
        window.dispatchEvent(new CustomEvent(Na__LeLoad__STATE_EVENT, {
            detail : { offered : offered, loaded : !!Na__LeLoad__Editor }
        }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Reveal the Dev Section and Import It When First Opened
    // ------------------------------------------------------------
    // The first click on the section's toggle is spent importing it, so the
    // section is asked to open itself; from then on it owns its toggle.
    // ------------------------------------------------------------
    function Na__LeLoad__WireDevSection() {
        const item   = document.getElementById(Na__LeLoad__DEV_ITEM_ID);
        const toggle = document.getElementById(Na__LeLoad__DEV_TOGGLE_ID);
        if (!item || !toggle) return false;
        item.style.display = '';                                                // <-- As the section always did; the Dev Tools container itself is localhost-only
        const onFirstClick = () => {
            if (Na__LeLoad__DevImport) return;
            toggle.removeEventListener('click', onFirstClick);
            Na__LeLoad__DevImport = import('../70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js')
                .then((dev) => dev.Na__LayoutEditor__DevMenu__Initialize({ showToast : Na__LeLoad__Context ? Na__LeLoad__Context.showToast : null, open : true }))
                .catch((error) => {
                    console.error('[ValeVision3D] Layout Editor Dev section failed to load:', error);
                    Na__LeLoad__Toast(Na__LeLoad__MSG_DEV_FAILED, true);
                });
        };
        toggle.addEventListener('click', onFirstClick);
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Questions (answered from the raw block until the editor loads)
// -----------------------------------------------------------------------------

    // FUNCTION | Has the Editor Loaded?
    // ------------------------------------------------------------
    function Na__LeLoad__IsLoaded() { return !!Na__LeLoad__Editor; }
    function Na__LeLoad__GetEditor() { return Na__LeLoad__Editor; }
    // ------------------------------------------------------------


    // FUNCTION | Ready: Settles When the Editor Has Started (TrueVision's Na__LeMode__Ready)
    // ------------------------------------------------------------
    // TrueVision starts its editor with the page, so its Ready promise exists
    // from start-up and resolves true once the configs are in, false when the
    // config has the editor off or it failed to start. This editor starts on
    // first use, so the promise handed out before then settles with that
    // first load, the same way: true once the editor has started, false when
    // its config has it off or the load fails. The same answer whether it is
    // asked before the load or after it. Asking never loads anything: a
    // caller that needs the editor calls Na__LeLoad__Require.
    // ------------------------------------------------------------
    function Na__LeLoad__Ready() {
        if (Na__LeLoad__Editor)   return Na__LeLoad__Editor.mode.Na__LeMode__Ready();
        if (Na__LeLoad__Disabled) return Promise.resolve(false);
        if (!Na__LeLoad__ReadyWait) {
            let settle = null;
            const promise = new Promise((resolve) => { settle = resolve; });
            Na__LeLoad__ReadyWait = { promise : promise, settle : settle };
        }
        return Na__LeLoad__ReadyWait.promise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Does This Build Have the Feature Behind a View
    // ------------------------------------------------------------
    // view: one of the VIEW_ names. The same answer before the load and after
    // it, because the map is static, so a document tab never appears or
    // vanishes as the editor finishes loading.
    // ------------------------------------------------------------
    function Na__LeLoad__HasFeature(view) {
        return Object.prototype.hasOwnProperty.call(Na__LeLoad__FEATURES, view) && Na__LeLoad__FEATURES[view] === true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This Sheet a Site Plan (TrueVision's Na__LeModel__IsSitePlanSheet)
    // ------------------------------------------------------------
    // TrueVision's rule (Na__LeRec__IsSitePlanSheet): a sheet is a site plan
    // when its Sheet__DrawingType is 'siteplan', the only drawing type ever
    // stored; a sheet without the key is an architectural drawing. Applied
    // here to the sheet handed in, before the load and after it alike: the
    // views carry the field as the record stores it, and the sheet model
    // keeps it on the live record, so a Drawings menu row reads the same
    // when the editor finishes loading. No sheet of this app is a site plan
    // today (DR-08 (B): site plans stay dormant), so every one answers false.
    // ------------------------------------------------------------
    function Na__LeLoad__IsSitePlanSheet(sheet) {
        return !!sheet && sheet.Sheet__DrawingType === Na__LeLoad__DRAWING_SITEPLAN;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Editor Offered (tab strip shown, sheets can open)
    // ------------------------------------------------------------
    // The mode controller's rule once it has loaded; the same rule read from
    // the raw block before that: Layout Mode on AND at least one sheet.
    // ------------------------------------------------------------
    function Na__LeLoad__IsAvailable() {
        if (Na__LeLoad__Editor)   return Na__LeLoad__Editor.mode.Na__LeMode__IsAvailable();
        if (Na__LeLoad__Disabled) return false;
        return Na__DrawData__GetLayoutModeEnabled() && Na__LeLoad__RawRecords().length > 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Project's Layout Mode Switch
    // ------------------------------------------------------------
    function Na__LeLoad__IsLayoutModeOn() { return Na__DrawData__GetLayoutModeEnabled(); }
    // ------------------------------------------------------------


    // FUNCTION | May This Session Edit Sheets (the mode controller's rule)
    // ------------------------------------------------------------
    function Na__LeLoad__IsEditable() {
        if (Na__LeLoad__Editor) return Na__LeLoad__Editor.mode.Na__LeMode__IsEditable();
        return Na__DevGate__IsAuthoringEnabled() || !Na__LeLoad__IsReadOnlyOnWeb();
    }
    // ------------------------------------------------------------


    // FUNCTION | Open Sheet, View, Sheets and Unsaved State
    // ------------------------------------------------------------
    function Na__LeLoad__IsActive()       { return !!Na__LeLoad__Editor && Na__LeLoad__Editor.mode.Na__LeMode__IsActive(); }
    function Na__LeLoad__GetView()        { return Na__LeLoad__Editor ? Na__LeLoad__Editor.mode.Na__LeMode__GetView() : Na__LeLoad__VIEW_SHEET; }
    function Na__LeLoad__GetSheets()      { return Na__LeLoad__Editor ? Na__LeLoad__Editor.model.Na__LeModel__GetSheets() : Na__LeLoad__SheetViews(); }

    // WHAT A SHEET IS CALLED ON SCREEN | The same answer loaded or not
    // ------------------------------------------------------------
    // "D03 - Elevations": the short code cut from the sheet's drawing number,
    // then its name. Composed here from the leaf rather than handed to the
    // editor, because the tab strip and the Dev menu draw sheet names before
    // the editor exists - and a tab that gained its code only once the bundle
    // arrived would rename itself under the reader. The loaded model's
    // Na__LeModel__GetTabLabel composes the same two parts through the same
    // configured format, from the same drawing number (Na__LeLoad__DrawingNumber).
    // ------------------------------------------------------------
    function Na__LeLoad__GetTabLabel(sheet, name) {
        if (!sheet) return '';
        const words = (typeof name === 'string') ? name : sheet.Sheet__Name;
        return Na__LeCode__Compose(Na__LeCode__ShortCode(Na__LeLoad__DrawingNumber(sheet)), words, Na__LeLoad__GetLabel('TabLabelFormat', '{code} - {name}'));
    }
    function Na__LeLoad__GetShortCode(sheet) { return Na__LeCode__ShortCode(Na__LeLoad__DrawingNumber(sheet)); }
    function Na__LeLoad__GetDrawingNumber(sheet) { return Na__LeLoad__DrawingNumber(sheet); }
    // ------------------------------------------------------------
    function Na__LeLoad__GetActiveSheet() { return Na__LeLoad__Editor ? Na__LeLoad__Editor.model.Na__LeModel__GetActiveSheet() : null; }
    function Na__LeLoad__IsDirty()        { return !!Na__LeLoad__Editor && Na__LeLoad__Editor.model.Na__LeModel__IsDirty(); }
    function Na__LeLoad__IsSpecDirty()    { return !!Na__LeLoad__Editor && Na__LeLoad__Editor.spec.Na__LeSpec__IsDirty(); }
    // ------------------------------------------------------------


    // FUNCTION | Labels: the Config's Wording Once Loaded, the Caller's Fallback Before
    // ------------------------------------------------------------
    function Na__LeLoad__GetLabel(keySuffix, fallback) {
        return Na__LeLoad__Editor ? Na__LeLoad__Editor.config.Na__LeCfg__GetLabel(keySuffix, fallback) : fallback;
    }
    function Na__LeLoad__FormatLabel(keySuffix, fallback, tokens) {
        if (Na__LeLoad__Editor) return Na__LeLoad__Editor.config.Na__LeCfg__FormatLabel(keySuffix, fallback, tokens);
        let text = fallback;
        Object.keys(tokens || {}).forEach((key) => { text = text.split('{' + key + '}').join(String(tokens[key])); });
        return text;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Actions (each loads the editor first when it has not loaded)
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Editor Behind the Loading Screen (options.quiet: no screen)
    // ------------------------------------------------------------
    // Resolves to the loaded modules, or null when the editor could not be had.
    // ------------------------------------------------------------
    function Na__LeLoad__Require(options) {
        return Na__LeLoad__WithEditor((editor) => editor, !!(options && options.quiet));
    }
    // ------------------------------------------------------------


    // FUNCTION | Open a Sheet (the first sheet when none is named)
    // ------------------------------------------------------------
    function Na__LeLoad__Enter(sheetId) {
        if (Na__LeLoad__Editor) return Promise.resolve(Na__LeLoad__Editor.mode.Na__LeMode__Enter(sheetId));
        if (!Na__LeLoad__IsAvailable()) return Promise.resolve(false);           // <-- Nothing to open: never load for it
        return Na__LeLoad__WithEditor((editor) => editor.mode.Na__LeMode__Enter(sheetId), false, true).then((entered) => entered === true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Back to the 3D Model (nothing to leave before the load)
    // ------------------------------------------------------------
    function Na__LeLoad__Leave() {
        return !!Na__LeLoad__Editor && Na__LeLoad__Editor.mode.Na__LeMode__Leave();
    }
    // ------------------------------------------------------------


    // FUNCTION | Show the Project Specification Tab
    // ------------------------------------------------------------
    function Na__LeLoad__OpenSpecification(noteId) {
        return Na__LeLoad__WithEditor((editor) => editor.mode.Na__LeMode__OpenSpecification(noteId), false, true);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refuse a Document View This Build Does Not Have
    // ------------------------------------------------------------
    // Resolves false, which is what the mode controller's own Open functions
    // answer when they cannot open: no editor is fetched, no screen goes up,
    // and no sheet is opened underneath a page that is not there. The tab
    // strip never offers such a tab, so whatever asked (a link, a Dev row) is
    // told in the console. A view the map says this build HAS whose entry
    // point still lands here was flipped without being forwarded: an error.
    // ------------------------------------------------------------
    function Na__LeLoad__RefuseView(view) {
        if (Na__LeLoad__HasFeature(view)) {
            console.error('[ValeVision3D] Layout Editor loader: the "' + view + '" view is marked present in Na__LeLoad__FEATURES, but its entry point does not reach the editor yet. Nothing was opened.');
        } else {
            console.warn('[ValeVision3D] Layout Editor loader: this build has no "' + view + '" view yet, so nothing was opened and the editor was not loaded.');
        }
        return Promise.resolve(false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the Document Register (TrueVision's Na__LeMode__OpenRegister)
    // ------------------------------------------------------------
    // options: TrueVision's - { view : 'read' } from a shared link, nothing
    // from a tab. Refused while this build has no register (HasFeature). The
    // change that lands the register flips its entry and forwards here, as
    // OpenSpecification does: through Na__LeLoad__WithEditor to the mode
    // controller's own OpenRegister(options).
    // ------------------------------------------------------------
    function Na__LeLoad__OpenRegister(options) {
        return Na__LeLoad__RefuseView(Na__LeLoad__VIEW_REGISTER);
    }
    // ------------------------------------------------------------


    // FUNCTION | Open the Statements (TrueVision's Na__LeMode__OpenStatements)
    // ------------------------------------------------------------
    // options: TrueVision's - { statementId, view : 'read' } from a shared
    // link, nothing from a tab. Refused while this build has no Statement
    // Writer (HasFeature); the change that lands it flips its entry and
    // forwards here the same way, to the mode controller's own
    // OpenStatements(options).
    // ------------------------------------------------------------
    function Na__LeLoad__OpenStatements(options) {
        return Na__LeLoad__RefuseView(Na__LeLoad__VIEW_STATEMENT);
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch Layout Mode On or Off (never loads the editor; the caller saves)
    // ------------------------------------------------------------
    function Na__LeLoad__SetLayoutMode(enabled) {
        let next = enabled === true;
        if (Na__LeLoad__Editor) next = Na__LeLoad__Editor.mode.Na__LeMode__SetLayoutMode(next);   // <-- Off leaves an open sheet first
        else Na__DrawData__SetLayoutModeEnabled(next);
        Na__LeLoad__SyncOffer(true);
        return next;
    }
    // ------------------------------------------------------------


    // FUNCTION | Sheet Changes the Tab Strip and Dev Section Make
    // ------------------------------------------------------------
    // A sheet handed in may be a view from before the load, so an update finds
    // the live record by its id first.
    // ------------------------------------------------------------
    function Na__LeLoad__CreateSheet(options) {
        return Na__LeLoad__WithEditor((editor) => editor.model.Na__LeModel__CreateSheet(options || {}), false);
    }
    function Na__LeLoad__UpdateSheet(sheet, patch) {
        const sheetId = sheet ? sheet.Sheet__Id : null;
        return Na__LeLoad__WithEditor((editor) => {
            const live = editor.model.Na__LeModel__GetSheetById(sheetId);
            return live ? editor.model.Na__LeModel__UpdateSheet(live, patch) : null;
        }, false);
    }
    function Na__LeLoad__ReorderSheet(sheetId, index) {
        return Na__LeLoad__WithEditor((editor) => editor.model.Na__LeModel__ReorderSheet(sheetId, index), false);
    }
    function Na__LeLoad__DuplicateSheet(sheetId) {
        return Na__LeLoad__WithEditor((editor) => editor.model.Na__LeModel__DuplicateSheet(sheetId), false);
    }
    function Na__LeLoad__DeleteSheet(sheetId) {
        return Na__LeLoad__WithEditor((editor) => editor.model.Na__LeModel__DeleteSheet(sheetId), false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Save the Drawings Block
    // ------------------------------------------------------------
    // Before the load nothing can have been edited, so the block is saved as
    // the project supplied it, through the same save path the model uses.
    // ------------------------------------------------------------
    function Na__LeLoad__Save(showToast) {
        if (Na__LeLoad__Editor) return Na__LeLoad__Editor.model.Na__LeModel__Save(showToast);
        return Na__DrawData__Save(showToast);
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the Snapshot Stamper Before a Rename Writes Anything
    // ------------------------------------------------------------
    // A rename re-stamps the baked 3D snapshots of the scene it renames, and
    // only the editor computes the stamp. A project without such a snapshot
    // resolves at once and loads nothing; one with it loads the editor
    // quietly. Called before the rename writes, so the rename itself stays
    // one uninterrupted step. Resolves true when re-stamping can run.
    // ------------------------------------------------------------
    async function Na__LeLoad__PrepareRestamp(sceneId) {
        if (Na__LeLoad__Editor) return true;
        if (!sceneId || !Na__LeLoad__HasBakedSnapshotOf(sceneId)) return false;
        return !!(await Na__LeLoad__Require({ quiet : true }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Stamp the Baked 3D Snapshots of a Renamed Scene (0 when the editor has not loaded)
    // ------------------------------------------------------------
    function Na__LeLoad__RestampForScene(sceneId) {
        if (!Na__LeLoad__Editor || !sceneId) return 0;
        return Na__LeLoad__Editor.viewport3d.Na__LeVp3d__RestampForScene(sceneId);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Take the Render Context and Start Watching for Drawings
    // ------------------------------------------------------------
    // context: { renderer, scene, camera, controls, pipelineRef, modelRoot, appConfig, showToast }
    // ------------------------------------------------------------
    function Na__LeLoad__Initialize(context) {
        if (Na__LeLoad__Context || !context) return false;
        Na__LeLoad__Context = context;
        window.addEventListener(Na__DrawData__CHANGED_EVENT, () => Na__LeLoad__SyncOffer(true));   // <-- A project loaded or saved: its sheets and its switch may differ
        window.addEventListener(Na__LeLoad__SHEETS_EVENT, () => { if (!Na__LeLoad__TabsImport) Na__LeLoad__SyncOffer(false); });   // <-- The first sheet made in the Dev section brings the strip in
        Na__LeLoad__WireDevSection();
        Na__LeLoad__SyncOffer(true);                                             // <-- A block that landed before this ran
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Loader API
    // ------------------------------------------------------------
    export {
        Na__LeLoad__SHEETS_EVENT,
        Na__LeLoad__MODE_EVENT,
        Na__LeLoad__SPEC_EVENT,
        Na__LeLoad__STATE_EVENT,
        Na__LeLoad__VIEW_SHEET,
        Na__LeLoad__VIEW_SPEC,
        Na__LeLoad__VIEW_REGISTER,
        Na__LeLoad__VIEW_STATEMENT,
        Na__LeLoad__Initialize,
        Na__LeLoad__Ready,
        Na__LeLoad__IsLoaded,
        Na__LeLoad__GetEditor,
        Na__LeLoad__IsAvailable,
        Na__LeLoad__IsLayoutModeOn,
        Na__LeLoad__HasFeature,
        Na__LeLoad__IsEditable,
        Na__LeLoad__IsActive,
        Na__LeLoad__GetView,
        Na__LeLoad__GetSheets,
        Na__LeLoad__IsSitePlanSheet,
        Na__LeLoad__GetTabLabel,
        Na__LeLoad__GetShortCode,
        Na__LeLoad__GetDrawingNumber,
        Na__LeLoad__GetActiveSheet,
        Na__LeLoad__IsDirty,
        Na__LeLoad__IsSpecDirty,
        Na__LeLoad__GetLabel,
        Na__LeLoad__FormatLabel,
        Na__LeLoad__Require,
        Na__LeLoad__Enter,
        Na__LeLoad__Leave,
        Na__LeLoad__OpenSpecification,
        Na__LeLoad__OpenRegister,
        Na__LeLoad__OpenStatements,
        Na__LeLoad__SetLayoutMode,
        Na__LeLoad__CreateSheet,
        Na__LeLoad__UpdateSheet,
        Na__LeLoad__ReorderSheet,
        Na__LeLoad__DuplicateSheet,
        Na__LeLoad__DeleteSheet,
        Na__LeLoad__Save,
        Na__LeLoad__PrepareRestamp,
        Na__LeLoad__RestampForScene
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
