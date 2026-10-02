# W1-31 - patch Na__LayoutEditor__Loader__.js (CRLF file) with byte-exact anchors.
# Reads bytes, normalises CRLF -> LF for matching, applies each (old, new) pair once,
# restores CRLF, writes the file in one write. Refuses if the file is not the pre-image.
#   python -B patch_loader.py            apply
#   python -B patch_loader.py --check    dry run (anchors only)
#   python -B patch_loader.py --restore  put the pre-image back
import hashlib
import sys
from pathlib import Path

TARGET = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\02__Src__AppModules\51__System__LayoutEditor\01__Core__Loader\Na__LayoutEditor__Loader__.js')
PREIMAGE = Path(r'D:\10_CoreLib__ValeCodebase\WebApps\ValeVision3D\ValeVision__AUDIT__TrueVisionParity__Evidence__\execution\scratch\W1-31\preimage\Na__LayoutEditor__Loader__.js')
PRE_SHA1 = '9dc1dd7851e2f1b5079b0c3b51a052a9bc398a92'

PAIRS = []

# -----------------------------------------------------------------------------
# 1. Header: DESCRIPTION additions, INTEGRATION, PORT NOTE, new log entry
# -----------------------------------------------------------------------------
PAIRS.append(('''// - A drawing rename that has to re-stamp a baked 3D snapshot loads the
//   editor quietly (no screen), because only the editor computes the stamp.
//
// INTEGRATION:
// - index.html calls Na__LeLoad__Initialize with the render context.
// - Na__LayoutEditor__TabStrip__ and Na__LayoutEditor__DevMenu__Controls__
//   import the facade; Na__DrawView__RenameDrawing__ imports the re-stamp.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none
// - Ported on     : 15-Sep-2026 for ValeVision3D v2.45.0
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : candidate. TrueVision's Index.html still imports the editor at start-up.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 19-Sep-2026 - Version 1.1.0
''', '''// - A drawing rename that has to re-stamp a baked 3D snapshot loads the
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
//   unsaved, the configured wording.
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
//      the real function. The editor's modules are reached only through the
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
//   view names, OpenRegister, OpenStatements and Ready, the sheet records'
//   site plan rule, and the first-open veil's drawing label.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 15-Sep-2026, v2.45.0). No TrueVision twin:
//                   TrueVision imports its editor with the page and keeps LE/01 free for a loader.
// - Mirrors       : TrueVision3D's editor entry points, read at b2aa9151 (v2.172.0): the mode
//                   controller 1.32.0 (TrueVision3D v2.166.0, 29-Sep-2026) - VIEW_REGISTER,
//                   VIEW_STATEMENT, OpenRegister, OpenStatements, Ready; the sheet records' site plan
//                   rule (Na__LeRec__IsSitePlanSheet, 'siteplan', TrueVision3D v2.48.0); the first-open
//                   veil's drawing label (VeilDrawingViews, LoadingVeil 1.1.0, TrueVision3D v2.83.0)
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-31}} (the entry points above; the
//                   loader itself is this app's)
// - Parity        : new - a permanent ValeVision seam (DR-24 (a))
// - Divergences   :
//   - The whole module: TrueVision loads its editor with the page and has no facade.
//   - Layout Mode (DR-25 (a)): the editor is offered only while the project's switch is on and it
//     has a sheet; TrueVision's strip shows whenever a sheet exists.
//   - TrueVision always has its Document Register and Statements views. Here
//     Na__LeLoad__HasFeature says whether this build has them, and their entry points refuse,
//     loading nothing, until they land.
// - Back-port     : none by default (DR-24 (a)). Offered to TrueVision as an optional back-port
//                   under DR-36: it would take the editor off TrueVision's start-up as well.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.1.1 (TrueVision's editor entry points, {{VVREL:W1-31}})
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
// - The back-port line follows DR-24 (a): a permanent ValeVision seam,
//   offered to TrueVision only as an option.
//
// 19-Sep-2026 - Version 1.1.0
'''))

# -----------------------------------------------------------------------------
# 2. Constants: the view-name and drawing-type copies, and the feature map
# -----------------------------------------------------------------------------
PAIRS.append(('''    // MODULE CONSTANTS | Event Names and Views the Tab Strip and Dev Section Use
    // ------------------------------------------------------------
    // Copies of the names the editor's modules declare, so both UIs can listen
    // before those modules exist. Compared with the real constants the moment
    // the editor loads; a mismatch is reported in the console.
    // ------------------------------------------------------------
    const Na__LeLoad__SHEETS_EVENT = 'na-layouteditor-sheets-changed';        // <-- Na__LeModel__CHANGED_EVENT
    const Na__LeLoad__MODE_EVENT   = 'na-layouteditor-mode-changed';          // <-- Na__LeMode__CHANGED_EVENT
    const Na__LeLoad__SPEC_EVENT   = 'na-layouteditor-spec-changed';          // <-- Na__LeSpec__CHANGED_EVENT
    const Na__LeLoad__VIEW_SHEET   = 'sheet';                                 // <-- Na__LeMode__VIEW_SHEET
    const Na__LeLoad__VIEW_SPEC    = 'spec';                                  // <-- Na__LeMode__VIEW_SPEC
    const Na__LeLoad__STATE_EVENT  = 'na-layouteditor-loader-changed';        // <-- This module: a project loaded or saved, Layout Mode switched, the editor loaded
    // ------------------------------------------------------------
''', '''    // MODULE CONSTANTS | Event Names, Views and the Drawing Type the Tab Strip and Dev Section Use
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
'''))

# -----------------------------------------------------------------------------
# 3. The drawing-count label key beside its fallback
# -----------------------------------------------------------------------------
PAIRS.append(('''    const Na__LeLoad__STATUS_DRAWING   = 'Drawing the Views';                    // <-- A real count is appended: "Drawing the Views  -  1 of 2"
''', '''    const Na__LeLoad__STATUS_DRAWING   = 'Drawing the Views';                    // <-- A real count is appended: "Drawing the Views  -  1 of 2". The fallback of the label below
    const Na__LeLoad__LABEL_DRAWING    = 'VeilDrawingViews';                     // <-- The editor's veil label for that line: TrueVision's first-open veil reads the same key
'''))

# -----------------------------------------------------------------------------
# 4. Module variables: the Ready promise handed out before the load
# -----------------------------------------------------------------------------
PAIRS.append(('''    let Na__LeLoad__Offered    = null;    // <-- The last announced answer to IsAvailable
''', '''    let Na__LeLoad__Offered    = null;    // <-- The last announced answer to IsAvailable
    let Na__LeLoad__ReadyWait  = null;    // <-- { promise, settle }: Ready asked before the editor started, settled by the load
'''))

# -----------------------------------------------------------------------------
# 5. SheetViews: carry Sheet__DrawingType for a site plan
# -----------------------------------------------------------------------------
PAIRS.append(('''    // The records are not normalised here. That needs the editor's config, and
    // writing defaults into them before it has loaded would change what the
    // next save writes. A view carries what the tab strip and the Dev list
    // show, with the sheet model's own fallbacks where a field is missing.
    // ------------------------------------------------------------
    function Na__LeLoad__SheetViews() {
        return Na__LeLoad__RawRecords().map((record, index) => ({
            Sheet__Id        : record.Sheet__Id,
            Sheet__Name      : (typeof record.Sheet__Name === 'string' && record.Sheet__Name) ? record.Sheet__Name : Na__LeLoad__NAME_FORMAT.split('{index}').join(String(index + 1)),
            Sheet__Order     : (typeof record.Sheet__Order === 'number' && Number.isFinite(record.Sheet__Order)) ? record.Sheet__Order : index + 1,
            Sheet__PaperSize : (typeof record.Sheet__PaperSize === 'string' && record.Sheet__PaperSize) ? record.Sheet__PaperSize : Na__LeLoad__PAPER_SIZE,
            Sheet__Fields    : (record.Sheet__Fields && typeof record.Sheet__Fields === 'object') ? record.Sheet__Fields : {},   // <-- Read only, and only for the tab's drawing code: a tab must not change when the editor finishes loading
            Sheet__Viewports : Array.isArray(record.Sheet__Viewports) ? record.Sheet__Viewports : []
        })).sort((a, b) => a.Sheet__Order - b.Sheet__Order);
    }
''', '''    // The records are not normalised here. That needs the editor's config, and
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
'''))

# -----------------------------------------------------------------------------
# 6. CheckNames: where the rows for names the editor does not declare yet go
# -----------------------------------------------------------------------------
PAIRS.append(('''    // HELPER FUNCTION | Check the Name Copies Against the Editor's Own
    // ------------------------------------------------------------
    function Na__LeLoad__CheckNames(editor) {
''', '''    // HELPER FUNCTION | Check the Name Copies Against the Editor's Own
    // ------------------------------------------------------------
    // One row per copy the editor declares. A copy whose constant the editor
    // does not declare yet - the register and statement views until the mode
    // controller takes TrueVision's VIEW_REGISTER and VIEW_STATEMENT, the site
    // plan type until the sheet model takes DRAWING_SITEPLAN - gets its row in
    // the change that declares it: a row reading a name the editor does not
    // export fails the export harness, which is what that harness is for.
    // ------------------------------------------------------------
    function Na__LeLoad__CheckNames(editor) {
'''))

# -----------------------------------------------------------------------------
# 7. Load: a Ready handed out before the load hears how it went
# -----------------------------------------------------------------------------
PAIRS.append(('''    // HELPER FUNCTION | One Load, Shared by Everyone Who Asks While It Runs
    // ------------------------------------------------------------
    function Na__LeLoad__Load() {
        if (Na__LeLoad__Editor)   return Promise.resolve(Na__LeLoad__Editor);
        if (Na__LeLoad__Disabled) return Promise.resolve(null);
        if (!Na__LeLoad__Loading) {
            Na__LeLoad__Loading = Na__LeLoad__Run().finally(() => { Na__LeLoad__Loading = null; });
        }
        return Na__LeLoad__Loading;
    }
    // ------------------------------------------------------------
''', '''    // HELPER FUNCTION | Settle the Ready Promise Handed Out Before the Load
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
'''))

# -----------------------------------------------------------------------------
# 8. The drawing count reads the editor's own veil label
# -----------------------------------------------------------------------------
PAIRS.append(('''        const wait = editor && editor.mode && editor.mode.Na__LeMode__WaitForFirstDrawing;
        if (typeof wait !== 'function') return Promise.resolve(true);
        const onProgress = (drawn, total) => {
            Na__LeLoadScreen__SetStatus(total > 1 ? Na__LeLoad__STATUS_DRAWING + '  -  ' + drawn + ' of ' + total : Na__LeLoad__STATUS_DRAWING);
        };
''', '''        const wait = editor && editor.mode && editor.mode.Na__LeMode__WaitForFirstDrawing;
        if (typeof wait !== 'function') return Promise.resolve(true);
        const label = Na__LeLoad__GetLabel(Na__LeLoad__LABEL_DRAWING, Na__LeLoad__STATUS_DRAWING);   // <-- The editor has loaded by now, so its own veil wording applies
        const onProgress = (drawn, total) => {
            Na__LeLoadScreen__SetStatus(total > 1 ? label + '  -  ' + drawn + ' of ' + total : label);
        };
'''))

# -----------------------------------------------------------------------------
# 9. Questions: Ready, HasFeature, IsSitePlanSheet
# -----------------------------------------------------------------------------
PAIRS.append(('''    // FUNCTION | Has the Editor Loaded?
    // ------------------------------------------------------------
    function Na__LeLoad__IsLoaded() { return !!Na__LeLoad__Editor; }
    function Na__LeLoad__GetEditor() { return Na__LeLoad__Editor; }
    // ------------------------------------------------------------
''', '''    // FUNCTION | Has the Editor Loaded?
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
'''))

# -----------------------------------------------------------------------------
# 10. Actions: OpenRegister and OpenStatements, refused while absent
# -----------------------------------------------------------------------------
PAIRS.append(('''    function Na__LeLoad__OpenSpecification(noteId) {
        return Na__LeLoad__WithEditor((editor) => editor.mode.Na__LeMode__OpenSpecification(noteId), false);
    }
    // ------------------------------------------------------------
''', '''    function Na__LeLoad__OpenSpecification(noteId) {
        return Na__LeLoad__WithEditor((editor) => editor.mode.Na__LeMode__OpenSpecification(noteId), false);
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
'''))

# -----------------------------------------------------------------------------
# 11. Exports
# -----------------------------------------------------------------------------
PAIRS.append(('''        Na__LeLoad__VIEW_SHEET,
        Na__LeLoad__VIEW_SPEC,
        Na__LeLoad__Initialize,
        Na__LeLoad__IsLoaded,
        Na__LeLoad__GetEditor,
        Na__LeLoad__IsAvailable,
        Na__LeLoad__IsLayoutModeOn,
        Na__LeLoad__IsEditable,
        Na__LeLoad__IsActive,
        Na__LeLoad__GetView,
        Na__LeLoad__GetSheets,
        Na__LeLoad__GetTabLabel,
''', '''        Na__LeLoad__VIEW_SHEET,
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
'''))
PAIRS.append(('''        Na__LeLoad__OpenSpecification,
        Na__LeLoad__SetLayoutMode,
''', '''        Na__LeLoad__OpenSpecification,
        Na__LeLoad__OpenRegister,
        Na__LeLoad__OpenStatements,
        Na__LeLoad__SetLayoutMode,
'''))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--apply'
    if mode == '--restore':
        data = PREIMAGE.read_bytes()
        assert hashlib.sha1(data).hexdigest() == PRE_SHA1, 'pre-image copy is not the recorded pre-image'
        TARGET.write_bytes(data)
        print('restored', TARGET, hashlib.sha1(data).hexdigest())
        return
    raw = TARGET.read_bytes()
    sha = hashlib.sha1(raw).hexdigest()
    if sha != PRE_SHA1:
        sys.exit('REFUSED: ' + str(TARGET) + ' is ' + sha + ', not the pre-image ' + PRE_SHA1 + ' (changed under us?)')
    crlf = raw.count(b'\r\n')
    lf_only = raw.count(b'\n') - crlf
    assert lf_only == 0, 'mixed line endings: %d bare LF' % lf_only
    text = raw.decode('utf-8').replace('\r\n', '\n')
    for n, (old, new) in enumerate(PAIRS, 1):
        count = text.count(old)
        if count != 1:
            sys.exit('REFUSED: anchor %d found %d times' % (n, count))
        assert '\r' not in new and '\t' not in new, 'pair %d has CR or TAB' % n
        text = text.replace(old, new, 1)
    out = text.replace('\n', '\r\n').encode('utf-8')
    assert out.count(b'\r\n') == out.count(b'\n'), 'line ending check failed'
    if mode == '--check':
        print('anchors OK (%d pairs); would write %d bytes (%d lines), sha1 %s' % (len(PAIRS), len(out), out.count(b'\n'), hashlib.sha1(out).hexdigest()))
        return
    TARGET.write_bytes(out)
    print('written', TARGET, len(out), 'bytes,', out.count(b'\n'), 'lines, sha1', hashlib.sha1(out).hexdigest())


if __name__ == '__main__':
    main()
