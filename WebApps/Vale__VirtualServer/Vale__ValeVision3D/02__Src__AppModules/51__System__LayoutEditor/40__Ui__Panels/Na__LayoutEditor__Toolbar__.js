// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - TOOLBAR
// =============================================================================
//
// FILE       : Na__LayoutEditor__Toolbar__.js
// NAMESPACE  : Na__LeToolbar
// MODULE     : Layout Editor - Toolbar
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The strip above the stage: tools, raster, save and Download PDF
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - Tool buttons (Select, Text, Dimension) and Save exist only when the
//   session can edit; the Raster list and Download PDF are for everyone, so
//   a web viewer can read a sheet and take the PDF away.
// - Undo, Redo, Zoom to Fit and the zoom readout have no buttons here: they
//   are keys (Ctrl+Z, Ctrl+Y, and the key map's zoom bindings), and Zoom to
//   fit is on the right-click menu as well.
//
// INTEGRATION:
// - Mounted by the mode controller into the centre column.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (v2.21.0, 09-Sep-2026, after the sheet toolbar of
//                   Lantern Designer's 30__System__DrawingEditorMode). TrueVision3D took it
//                   whole on 10-Sep-2026 for its re-alignment and has led it since; this file
//                   has taken TrueVision's changes as hunks, one log entry each.
// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/40__Ui__Panels/Na__LayoutEditor__Toolbar__.js
// - Source version: hunks up to TrueVision's Toolbar 1.12.0 (TrueVision3D v2.70.0, 19-Sep-2026),
//                   then its 1.17.0 (the Notes toggle; 21-Sep-2026, named in no TrueVision3D
//                   release entry) and 1.19.0 (Undo, Redo, Fit and the zoom readout; TrueVision3D
//                   v2.124.0, 21-Sep-2026); TrueVision's file is 1.24.0 (read at b2aa9151)
// - Ported on     : hunk by hunk, 13-Sep-2026 to 19-Sep-2026, then 02-Oct-2026 for
//                   ValeVision3D v2.71.2 (see the log below)
// - Parity        : adapted
// - Divergences   :
//   - Snap is a plain toggle over 28__System__ObjectSnap's controller
//     (Na__LayoutEditor__ObjectSnap__.js) with this app's words. TrueVision's is a split
//     button whose arrow opens Na__LayoutEditor__ObjectSnap__Menu__, worded by the
//     controller's Label (its 1.20.0); the menu is landed and waits for W5-01.
//   - The Select and Move hover texts keep this app's words, in the code and in the
//     config: TrueVision's describe its automatic Move (TrueVision3D v2.78.0), which
//     this app does not have until Adam confirms it (DR-40 item 7; W3-04, then W5-01).
//   - Not here yet, each waiting for its feature: Floor Area, Image, Circle, Arc,
//     Draft, Grid, Grid Snap, Ortho, Axes, the vector quality list, Share, and the
//     Save Sheets note for a specification held back by its lockstep (TrueVision
//     1.13.0 to 1.24.0). W5-01 takes TrueVision's file whole once they exist.
//   - Banner reads ValeVision3D.
// - Back-port     : none - TrueVision has the file and leads it.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.9.5 (object snap's own folder, v2.71.4)
// - THE SNAP BUTTON SWITCHES THROUGH 28__System__ObjectSnap. CHANGED_EVENT,
//   IsEnabled and Toggle come from its controller,
//   Na__LayoutEditor__ObjectSnap__.js, so a click echoes "<Osnap on>" /
//   "<Osnap off>" as F3 does, and the button follows the same event and
//   the same remembered switch. One import line. The arrow and the snap
//   options menu are TrueVision's 1.20.0 and come with W5-01.
//
// 02-Oct-2026 - Version 1.9.4 (the strip slimmed as TrueVision's, v2.71.2)
// - THE NOTES TOGGLE IS GONE, as in TrueVision's 1.17.0: Show notes margin in
//   the Margin Notes panel is the one switch for a sheet's notes margin, so
//   the strip no longer spends a button on a setting that already had a
//   home. Its sync went with it, and the SheetModel UpdateMarginNotes and
//   SheetRecords MarginNotes imports; the config lost the button's two
//   labels, and its Margin Notes description is TrueVision's.
// - UNDO, REDO, FIT AND THE 100% BUTTON ARE GONE, as in TrueVision's 1.19.0
//   (TrueVision3D v2.124.0), with the two separators that fenced them: the
//   tools close with one separator and Raster with another, so neither
//   strip shows two side by side. The keys stay - Ctrl+Z, Ctrl+Y and
//   Ctrl+Shift+Z, and the key map's Nav__ZoomFit and Nav__ZoomActualSize -
//   and Zoom to fit, Undo and Redo stay on the right-click menu. Nothing
//   left reads the undo depth or the zoom, so the toolbar no longer listens
//   for Na__LeHist__CHANGED_EVENT or Na__LeSurface__ZOOM_EVENT and the
//   History, Navigation and SheetSurface imports are gone; an undo still
//   re-syncs it through the model change it announces
//   (Na__LeModel__AnnounceRestore). PURPOSE and DESCRIPTION are TrueVision's.
// - TrueVision's 1.14.0 (a zoom step updating the readout alone) leaves
//   nothing to take: its 1.19.0 removed the readout.
// - The Select and Move hover texts stay this app's (PORT NOTE).
//
// 01-Oct-2026 - Version 1.9.3 (records hygiene, v2.71.1)
// - Comments only. The PORT NOTE says where this file came from and what
//   TrueVision's has that it lacks, in the house fields; it had read
//   "Parity : new" since 09-Sep.
// - Two entries below carried numbers already used further down: 17-Sep's
//   1.8.0 (the Move button) is now 1.9.1 and 19-Sep's 1.9.0 (the tab's name) is
//   now 1.9.2, so the log reads newest first with no number twice. The parity
//   ledger and the devlog of those days name them by their old numbers.
//
// 19-Sep-2026 - Version 1.9.2 (written as 1.9.0; renumbered 01-Oct-2026)
// - The sheet's name on the toolbar is what its tab reads
//   (Na__LeModel__GetTabLabel, "D03 - Elevations"). Ported from TrueVision3D
//   v2.70.0.
//
// 17-Sep-2026 - Version 1.9.1 (written as 1.8.0; renumbered 01-Oct-2026)
// - The Move button (M), beside Select, and a tooltip on Select that says a
//   drag no longer moves anything.
// - The state hint: which container is open and how to leave it. It is
//   invisible otherwise, and a faded sheet reads as a broken editor.
//
// 14-Sep-2026 - Version 1.9.0
// - Leader tool button (E), after Text; its tooltip comes from ToolLeaderTitle.
// - Ported from TrueVision3D v2.35.0.
//
// 13-Sep-2026 - Version 1.8.0
// - The Dimension button's tooltip comes from the ToolDimensionTitle label and
//   says that Shift makes the dimension horizontal or vertical.
// - Ported from TrueVision3D v2.31.0.
//
// 13-Sep-2026 - Version 1.7.0
// - Shift+click on the Eyedropper button arms the palette, as Shift+B does.
// - Ported from TrueVision3D v2.30.0.
//
// 13-Sep-2026 - Version 1.6.0
// - Rectangle tool button (R), beside Draw, ported from TrueVision.
//
// 13-Sep-2026 - Version 1.5.0
// - Eyedropper button and its hint line, ported from TrueVision. The button arms
//   the dropper exactly as the B key does, loaded from the selection if any.
//
// 10-Sep-2026 - Version 1.4.0
// - Raster select: the working resolution of the viewport pictures (Low, Medium, High).
//
// 10-Sep-2026 - Version 1.3.0
// - Draw tool button; the dimension tool is three clicks.
//
// 10-Sep-2026 - Version 1.2.0
// - Undo and Redo buttons, enabled by the history depth.
//
// 10-Sep-2026 - Version 1.1.0
// - Snap toggle button.
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Model, Tools, PDF
    // ------------------------------------------------------------
    import { Na__LeCfg__GetLabel, Na__LeCfg__FormatLabel } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';
    import { Na__LeModel__CHANGED_EVENT, Na__LeModel__GetActiveSheet, Na__LeModel__GetTabLabel, Na__LeModel__IsDirty, Na__LeModel__Save } from '../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';
    import { Na__LeSpec__CHANGED_EVENT, Na__LeSpec__IsDirty, Na__LeSpec__GetState, Na__LeSpec__Sync } from '../50__Feature__Specification/Na__LayoutEditor__SpecData__.js';
    import {
        Na__LeTools__TOOL_SELECT,
        Na__LeTools__TOOL_MOVE,
        Na__LeTools__TOOL_TEXT,
        Na__LeTools__TOOL_DIMENSION,
        Na__LeTools__TOOL_DRAW,
        Na__LeTools__TOOL_RECT,
        Na__LeTools__TOOL_EYEDROP,
        Na__LeTools__TOOL_LEADER,
        Na__LeTools__CHANGED_EVENT,
        Na__LeTools__SetTool,
        Na__LeTools__GetTool,
        Na__LeTools__ArmEyedropper,
        Na__LeTools__ArmPalette
    } from '../30__System__SheetTools/Na__LayoutEditor__SheetTools__.js';
    import { Na__LeDrop__CHANGED_EVENT, Na__LeDrop__GetHint } from '../30__System__SheetTools/Na__LayoutEditor__Eyedropper__.js';
    import { Na__LeScope__CHANGED_EVENT, Na__LeScope__Get, Na__LeScope__GetVectorId, Na__LeScope__GetDimensionId } from '../30__System__SheetTools/Na__LayoutEditor__EditScope__.js';
    import { Na__LeOsnap__CHANGED_EVENT, Na__LeOsnap__IsEnabled, Na__LeOsnap__Toggle } from '../28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js';
    import { Na__LePdf__ExportSheet } from '../60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js';
    import { Na__LeRaster__LEVELS, Na__LeRaster__CHANGED_EVENT, Na__LeRaster__Get, Na__LeRaster__Set } from '../20__System__Viewports/Na__LayoutEditor__RasterQuality__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Root and Handlers
    // ------------------------------------------------------------
    let Na__LeToolbar__Root      = null;
    let Na__LeToolbar__Editable  = false;
    let Na__LeToolbar__ShowToast = null;
    let Na__LeToolbar__Listeners = null;
    let Na__LeToolbar__Busy      = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Building
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Toolbar Button
    // ------------------------------------------------------------
    function Na__LeToolbar__Button(text, name, title, onClick) {
        const button = document.createElement('button');
        button.type        = 'button';
        button.className   = 'na-le-toolbar__btn';
        button.textContent = text;
        button.title       = title || text;
        button.setAttribute('data-na-toolbar', name);
        button.addEventListener('click', onClick);
        return button;
    }
    function Na__LeToolbar__Gap() {
        const gap = document.createElement('span');
        gap.className = 'na-le-toolbar__gap';
        return gap;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Reflect Tool, Sheet Name and Dirty State
    // ------------------------------------------------------------
    function Na__LeToolbar__Sync() {
        if (!Na__LeToolbar__Root) return;
        const tool = Na__LeTools__GetTool();
        Na__LeToolbar__Root.querySelectorAll('[data-na-tool]').forEach((button) => {
            const active = button.getAttribute('data-na-tool') === tool;
            button.classList.toggle('na-le-toolbar__btn--active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        const snap = Na__LeToolbar__Root.querySelector('[data-na-toolbar="snap"]');
        if (snap) { snap.classList.toggle('na-le-toolbar__btn--active', Na__LeOsnap__IsEnabled()); snap.setAttribute('aria-pressed', String(Na__LeOsnap__IsEnabled())); }
        const raster = Na__LeToolbar__Root.querySelector('[data-na-toolbar="raster"]');
        if (raster && raster.value !== Na__LeRaster__Get()) raster.value = Na__LeRaster__Get();
        const hint = Na__LeToolbar__Root.querySelector('[data-na-toolbar="dropper-hint"]');
        if (hint) {
            const armed = tool === Na__LeTools__TOOL_EYEDROP;
            hint.hidden = !armed;
            if (armed) { hint.textContent = Na__LeDrop__GetHint(); hint.title = hint.textContent; }
        }
        // WHICH CONTAINER IS OPEN, IN WORDS. It is invisible otherwise, and
        // "the sheet has faded and only this one thing answers a press" reads as
        // the editor being broken unless something says so.
        // ------------------------------------
        const scope = Na__LeToolbar__Root.querySelector('[data-na-toolbar="scope-hint"]');
        if (scope) {
            const open  = Na__LeScope__Get();
            const where = Na__LeScope__GetVectorId() ? Na__LeCfg__GetLabel('ScopeVector', 'Editing vector')
                        : (Na__LeScope__GetDimensionId() ? Na__LeCfg__GetLabel('ScopeDimension', 'Editing dimension')
                        : Na__LeCfg__GetLabel('ScopeGroup', 'Inside group'));
            const text  = open ? Na__LeCfg__FormatLabel('ScopeHint', '{where} - click outside to close, Esc to stop', { where : where }) : '';
            scope.hidden      = !text;
            scope.textContent = text;
            scope.title       = text;
            scope.classList.toggle('na-le-toolbar__hint--scope', !!open);
        }
        const sheet = Na__LeModel__GetActiveSheet();
        const name  = Na__LeToolbar__Root.querySelector('.na-le-toolbar__name');
        if (name) name.textContent = sheet ? Na__LeModel__GetTabLabel(sheet) : '';   // <-- What the tab reads: the short code, then the short name
        const save = Na__LeToolbar__Root.querySelector('[data-na-toolbar="save"]');
        if (save) { save.classList.toggle('na-le-toolbar__btn--attention', Na__LeModel__IsDirty() || Na__LeSpec__IsDirty()); save.disabled = Na__LeToolbar__Busy; }
        const pdf = Na__LeToolbar__Root.querySelector('[data-na-toolbar="pdf"]');
        if (pdf) pdf.disabled = Na__LeToolbar__Busy || !sheet;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Save and Export Actions
    // ------------------------------------------------------------
    // Save is exported as well as wired to its button, so Ctrl+S is the SAME
    // action rather than a second one that drifts from it: the busy guard, the
    // specification sync and the one combined toast all come with it.
    // ------------------------------------------------------------
    async function Na__LeToolbar__Save() {
        if (Na__LeToolbar__Busy) return;
        Na__LeToolbar__Busy = true; Na__LeToolbar__Sync();
        const notes = [];
        let failed  = false;
        const note  = (message, isError) => {
            if (message) notes.push(/[.!?]$/.test(message) ? message : message + '.');
            if (isError) failed = true;
        };
        try {
            await Na__LeModel__Save(note);
            const spec = Na__LeSpec__GetState();
            if (spec.dirty && spec.canSync) await Na__LeSpec__Sync({ showToast : note });   // <-- The notes the sheets' codes come from go up with them
        }
        finally {
            Na__LeToolbar__Busy = false; Na__LeToolbar__Sync();
            if (notes.length > 0 && typeof Na__LeToolbar__ShowToast === 'function') Na__LeToolbar__ShowToast(notes.join(' '), failed);
        }
    }
    async function Na__LeToolbar__Pdf() {
        const sheet = Na__LeModel__GetActiveSheet();
        if (Na__LeToolbar__Busy || !sheet) return;
        Na__LeToolbar__Busy = true; Na__LeToolbar__Sync();
        try { await Na__LePdf__ExportSheet(sheet, Na__LeToolbar__ShowToast); }
        finally { Na__LeToolbar__Busy = false; Na__LeToolbar__Sync(); }
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Toolbar Into a Container
    // ------------------------------------------------------------
    function Na__LeToolbar__Mount(container, options) {
        if (!container) return false;
        Na__LeToolbar__Unmount();
        Na__LeToolbar__Editable  = !!(options && options.editable);
        Na__LeToolbar__ShowToast = (options && options.showToast) || null;
        const root = document.createElement('div');
        root.className = 'na-le-toolbar';

        const name = document.createElement('span');
        name.className = 'na-le-toolbar__name';
        root.appendChild(name);
        root.appendChild(Na__LeToolbar__Gap());

        if (Na__LeToolbar__Editable) {
            [ [ Na__LeTools__TOOL_SELECT, Na__LeCfg__GetLabel('ToolSelect', 'Select'),
                  Na__LeCfg__GetLabel('ToolSelectTitle', 'Select (V or space): click to pick, drag from bare paper to box-select. Double-click a group, a vector or a dimension to edit inside it. Press M to move things.') ],
              [ Na__LeTools__TOOL_MOVE, Na__LeCfg__GetLabel('ToolMove', 'Move'),
                  Na__LeCfg__GetLabel('ToolMoveTitle', 'Move tool (M): drag to move whatever is under the pointer. With the Select tool a drag moves nothing, so nothing is shifted by accident; Escape puts every tool down.') ],
              [ Na__LeTools__TOOL_TEXT, Na__LeCfg__GetLabel('ToolText', 'Text'), 'Place text (T)' ],
              [ Na__LeTools__TOOL_LEADER, Na__LeCfg__GetLabel('ToolLeader', 'Leader'), Na__LeCfg__GetLabel('ToolLeaderTitle', 'Place a leader (E): click the point it marks, then where its note or bubble goes - or drag from one to the other.') ],
              [ Na__LeTools__TOOL_DIMENSION, Na__LeCfg__GetLabel('ToolDimension', 'Dimension'), Na__LeCfg__GetLabel('ToolDimensionTitle', 'Place a dimension in three clicks (D): start, end, then where the line sits. Hold Shift while placing the line for a horizontal or vertical dimension.') ],
              [ Na__LeTools__TOOL_DRAW, Na__LeCfg__GetLabel('ToolDraw', 'Draw'), 'Draw lines and polygons: click points, click the first point to close, Enter to finish (L)' ],
              [ Na__LeTools__TOOL_RECT, Na__LeCfg__GetLabel('ToolRectangle', 'Rectangle'), Na__LeCfg__GetLabel('ToolRectangleTitle', 'Draw a rectangle (R): click one corner then the opposite corner, or drag from one to the other. Shift keeps it square, Esc abandons it.') ],
              [ Na__LeTools__TOOL_EYEDROP, Na__LeCfg__GetLabel('ToolEyedropper', 'Eyedropper'), Na__LeCfg__GetLabel('ToolEyedropperTitle', 'Match properties (B): click the object to copy FROM, then each object to copy ONTO. Alt+click picks a new source, Esc finishes.') ] ].forEach((entry) => {
                // The eyedropper arms through its own call so the button behaves
                // exactly as the B key does: with something selected it comes up
                // already loaded from that selection. Shift+click is Shift+B, the
                // palette.
                // ------------------------------------
                const pick   = (event) => (entry[0] !== Na__LeTools__TOOL_EYEDROP ? Na__LeTools__SetTool(entry[0]) : ((event && event.shiftKey) ? Na__LeTools__ArmPalette() : Na__LeTools__ArmEyedropper()));
                const button = Na__LeToolbar__Button(entry[1], 'tool-' + entry[0], entry[2], pick);
                button.setAttribute('data-na-tool', entry[0]);
                root.appendChild(button);
            });
            root.appendChild(Na__LeToolbar__Button(Na__LeCfg__GetLabel('SnapToggle', 'Snap'), 'snap', Na__LeCfg__GetLabel('SnapToggleTitle', 'Snap dimensions to the linework endpoints and midpoints (F3)'), () => Na__LeOsnap__Toggle()));

            // EYEDROPPER HINT | What the dropper is holding and what to do next.
            // It lives beside the tool buttons because that is where the eye
            // already is when the tool is picked up, and it shrinks rather than
            // pushing the rest of the toolbar off the end.
            // ------------------------------------
            const hint = document.createElement('span');
            hint.className = 'na-le-toolbar__hint';
            hint.setAttribute('data-na-toolbar', 'dropper-hint');
            hint.hidden = true;
            root.appendChild(hint);

            // THE CONTAINER AND NO-TOOL HINT | Beside the dropper's, for the
            // same reason: it belongs where the tool buttons are.
            // ------------------------------------
            const scopeHint = document.createElement('span');
            scopeHint.className = 'na-le-toolbar__hint';
            scopeHint.setAttribute('data-na-toolbar', 'scope-hint');
            scopeHint.hidden = true;
            root.appendChild(scopeHint);
            root.appendChild(Na__LeToolbar__Gap());
        }

        // RASTER | The working resolution of the viewport pictures; the PDF ignores it
        const rasterLabel = document.createElement('span');
        rasterLabel.className   = 'na-le-toolbar__label';
        rasterLabel.textContent = Na__LeCfg__GetLabel('RasterLabel', 'Raster');
        root.appendChild(rasterLabel);
        const raster = document.createElement('select');
        raster.className = 'na-le-toolbar__select';
        raster.title     = Na__LeCfg__GetLabel('RasterTitle', 'Working resolution of the viewport pictures on screen. The PDF always exports at High.');
        raster.setAttribute('data-na-toolbar', 'raster');
        Na__LeRaster__LEVELS.forEach((level) => {
            const option = document.createElement('option');
            option.value       = level;
            option.textContent = Na__LeCfg__GetLabel('Raster' + level.charAt(0).toUpperCase() + level.slice(1), level.charAt(0).toUpperCase() + level.slice(1));
            raster.appendChild(option);
        });
        raster.value = Na__LeRaster__Get();
        raster.addEventListener('change', () => Na__LeRaster__Set(raster.value));
        root.appendChild(raster);
        root.appendChild(Na__LeToolbar__Gap());

        if (Na__LeToolbar__Editable) {
            root.appendChild(Na__LeToolbar__Button(Na__LeCfg__GetLabel('SaveSheets', 'Save Sheets'), 'save', Na__LeCfg__GetLabel('SaveSheetsTitle', 'Save every sheet to the project, and sync the project specification when it has changes'), () => { void Na__LeToolbar__Save(); }));
        } else {
            const note = document.createElement('span');
            note.className   = 'na-le-toolbar__note';
            note.textContent = Na__LeCfg__GetLabel('ReadOnlyNote', 'Read-only on the web build.');
            root.appendChild(note);
        }
        root.appendChild(Na__LeToolbar__Button(Na__LeCfg__GetLabel('DownloadPdf', 'Download PDF'), 'pdf', 'Export this sheet as a PDF at paper size', () => { void Na__LeToolbar__Pdf(); }));

        container.appendChild(root);
        Na__LeToolbar__Root = root;
        Na__LeToolbar__Listeners = () => Na__LeToolbar__Sync();
        [ Na__LeTools__CHANGED_EVENT, Na__LeModel__CHANGED_EVENT, Na__LeOsnap__CHANGED_EVENT, Na__LeRaster__CHANGED_EVENT, Na__LeDrop__CHANGED_EVENT, Na__LeScope__CHANGED_EVENT, Na__LeSpec__CHANGED_EVENT ].forEach((name) => window.addEventListener(name, Na__LeToolbar__Listeners));
        Na__LeToolbar__Sync();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove the Toolbar
    // ------------------------------------------------------------
    function Na__LeToolbar__Unmount() {
        if (Na__LeToolbar__Listeners) {
            [ Na__LeTools__CHANGED_EVENT, Na__LeModel__CHANGED_EVENT, Na__LeOsnap__CHANGED_EVENT, Na__LeRaster__CHANGED_EVENT, Na__LeDrop__CHANGED_EVENT, Na__LeScope__CHANGED_EVENT, Na__LeSpec__CHANGED_EVENT ].forEach((name) => window.removeEventListener(name, Na__LeToolbar__Listeners));
        }
        if (Na__LeToolbar__Root && Na__LeToolbar__Root.parentNode) Na__LeToolbar__Root.parentNode.removeChild(Na__LeToolbar__Root);
        Na__LeToolbar__Root = Na__LeToolbar__Listeners = null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Toolbar API
    // ------------------------------------------------------------
    export {
        Na__LeToolbar__Mount,
        Na__LeToolbar__Unmount,
        Na__LeToolbar__Save
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
