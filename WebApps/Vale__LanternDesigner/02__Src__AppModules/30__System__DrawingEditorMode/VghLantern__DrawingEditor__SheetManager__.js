/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | SHEET MANAGER
   =============================================================================

   FILE       : VghLantern__DrawingEditor__SheetManager__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - SheetManager
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Own the Drawing Editor mode - build the sheet, place views, export
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - The single owner of the Drawing Editor mode. Builds the toolbar and the paper
     sheet, drives the scale fit, asks ViewPlacement to fill the frames, and renders
     the titleblock and notes.
   - Holds the sheet size and orientation selection for the session and exposes the
     composed sheet to the Document Preview mode for PDF export.
   - Everything measurable comes from ViewportFrame and ScaleManager; this module
     sequences them rather than repeating their arithmetic.

   -----------------------------------------------------------------------------

   WHY THE SHEET IS LAID OUT IN MILLIMETRES AND SCALED TO PIXELS:
   The sheet element is sized in real paper millimetres and then scaled to the screen
   with a single CSS transform. That keeps one set of numbers for screen and print,
   so a view that fits on screen fits on paper - no second layout pass at export.

   WHY REDRAW IS DEBOUNCED:
   Every solved-geometry event would otherwise trigger four view renders plus a 3D
   snapshot. Dragging a slider in the editor and then switching to this mode would
   queue a backlog of full sheet rebuilds, so redraws coalesce.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Sheet Manager Module
// =============================================================================

const VghLantern__DrawingEditor__SheetManager = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM Identifiers
    // ------------------------------------------------------------
    const DOM_TOOLBAR     =  'VghLantern__DrawingEditor__Toolbar';
    const DOM_SHEET_HOST  =  'VghLantern__DrawingEditor__SheetHost';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_TOOLBAR       =  'VghLantern__DrawingEditor__ToolbarRow';
    const CSS_TOOL_GROUP    =  'VghLantern__DrawingEditor__ToolGroup';
    const CSS_TOOL_LABEL    =  'VghLantern__DrawingEditor__ToolLabel';
    const CSS_TOOL_SELECT   =  'VghLantern__DrawingEditor__ToolSelect';
    const CSS_TOOL_BUTTON   =  'VghLantern__DrawingEditor__ToolButton';
    const CSS_TOOL_SPACER   =  'VghLantern__DrawingEditor__ToolSpacer';

    const CSS_SHEET         =  'VghLantern__Sheet';
    const CSS_SHEET_SCALER  =  'VghLantern__Sheet__Scaler';
    const CSS_SHEET_GRID    =  'VghLantern__Sheet__ViewGrid';
    const CSS_SHEET_GRID_WRAP =  'VghLantern__Sheet__ViewGridWrap';
    const CSS_SHEET_NOTES   =  'VghLantern__Sheet__NotesHost';
    const CSS_SHEET_TITLE   =  'VghLantern__Sheet__TitleHost';
    const CSS_EMPTY_STATE   =  'VghLantern__DrawingEditor__EmptyState';

    const CSS_RESIZE_HANDLE =  'VghLantern__Sheet__ResizeHandle';
    const CSS_RESIZE_COL    =  'VghLantern__Sheet__ResizeHandle--col';
    const CSS_RESIZE_ROW    =  'VghLantern__Sheet__ResizeHandle--row';
    const CSS_RESIZE_DRAG   =  'VghLantern__Sheet__ResizeHandle--dragging';
    const CSS_BODY_RESIZING =  'VghLantern__Sheet__IsResizing';
    const CSS_BODY_RESIZE_ROW =  'VghLantern__Sheet__IsResizing--row';

    const ATTR_SHEET_RESIZE =  'data-vgh-sheet-resize';
    const ATTR_SPLIT_INDEX  =  'data-vgh-split-index';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Behaviour
    // ------------------------------------------------------------
    const REDRAW_DEBOUNCE_MS  =  180;                                         // <-- Coalesces geometry event storms into one sheet rebuild
    const MESSAGE_NO_LANTERN  =  'Select a lantern in the Lantern Editor to compose a drawing sheet.';

    const ZOOM_MIN            =  0.25;                                        // <-- Widest zoom-out of the sheet
    const ZOOM_MAX            =  4;                                           // <-- Tightest zoom-in of the sheet
    const ZOOM_WHEEL_STEP     =  0.0016;                                      // <-- Wheel delta to zoom factor, matches Env2d feel
    const CSS_HOST_PANNING    =  'VghLantern__DrawingEditor__SheetHost--panning';

    const FALLBACK_SHARE_MIN  =  20;
    const FALLBACK_SHARE_MAX  =  80;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Sheet Selection and Lifecycle State
    // ------------------------------------------------------------
    let VghLantern__SheetManager__SheetSizeKey    =  null;                    // <-- Null means "use the config default"
    let VghLantern__SheetManager__Orientation     =  null;
    let VghLantern__SheetManager__IsScaleManual   =  false;                   // <-- User picked a scale; auto fit stands down for the session
    let VghLantern__SheetManager__IsSubscribed    =  false;                   // <-- Guards duplicate StateManager listeners
    let VghLantern__SheetManager__RedrawTimerId   =  null;
    let VghLantern__SheetManager__IsRendering     =  false;                   // <-- Prevents overlapping async sheet builds
    let VghLantern__SheetManager__IsRerunQueued   =  false;                   // <-- A render request arrived while one was in flight
    // ------------------------------------------------------------


    // MODULE VARIABLES | Sheet Navigation State
    // ------------------------------------------------------------
    // Zoom is a CSS transform on the sheet plus an explicit size on the scaler, so
    // the sheet keeps its true paper-pixel dimensions for export while the host's
    // native scrollbars provide the pan surface.
    let VghLantern__SheetManager__ZoomFactor      =  1;                       // <-- Survives sheet rebuilds within the session
    let VghLantern__SheetManager__IsNavBound      =  false;                   // <-- Guards duplicate host listeners
    let VghLantern__SheetManager__PanState        =  null;                    // <-- Active drag-pan session, null when idle
    // ------------------------------------------------------------


    // MODULE VARIABLES | Grid Share Resize State
    // ------------------------------------------------------------
    // Column and row shares survive sheet rebuilds so a gutter drag is not wiped by
    // the next geometry solve. Scale is deliberately untouched by these shares.
    let VghLantern__SheetManager__ColumnSharesPct  =  null;
    let VghLantern__SheetManager__RowSharesPct     =  null;
    let VghLantern__SheetManager__ActiveResize     =  null;
    let VghLantern__SheetManager__IsResizeBound    =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and State Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Drawing Editor Config Root
    // ------------------------------------------------------------
    function VghLantern__SheetManager__DrawingConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Sheet Config Block
    // ------------------------------------------------------------
    function VghLantern__SheetManager__SheetConfig() {
        return VghLantern__SheetManager__DrawingConfig()['VghLantern__DrawingEditor__Config__Sheet'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Collect the Solved Geometry and Active Records
    // ------------------------------------------------------------
    function VghLantern__SheetManager__ReadState() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return { Project: null, Lantern: null, Geometry: null };

        return {
            Project  : StateManager.VghLantern__StateManager__GetCurrentProject(),
            Lantern  : StateManager.VghLantern__StateManager__GetCurrentLantern(),
            Geometry : {
                Skeleton : StateManager.VghLantern__StateManager__GetSolvedSkeleton(),
                BarSet   : StateManager.VghLantern__StateManager__GetSolvedBarSet()
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Toolbar
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Build an Option List for a Select Control
    // ------------------------------------------------------------
    function VghLantern__SheetManager__BuildOptions(values, labels, selectedValue) {
        var html  =  '';
        var i, isSelected;

        for (i = 0; i < values.length; i++) {
            isSelected  =  String(values[i]) === String(selectedValue) ? ' selected' : '';
            html  +=  '<option value="' + values[i] + '"' + isSelected + '>' + labels[i] + '</option>';
        }

        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Sheet Size Selector
    // ------------------------------------------------------------
    function VghLantern__SheetManager__BuildSheetSizeGroup() {
        var sheetCfg  =  VghLantern__SheetManager__SheetConfig();
        var sizes     =  sheetCfg.SheetSizes || {};
        var keys      =  Object.keys(sizes);
        var labels    =  [];
        var i;

        for (i = 0; i < keys.length; i++) labels.push(sizes[keys[i]].Label || keys[i]);

        return '<div class="' + CSS_TOOL_GROUP + '">' +
               '<label class="' + CSS_TOOL_LABEL + '" for="VghLantern__DrawingEditor__SheetSizeSelect">Sheet</label>' +
               '<select class="' + CSS_TOOL_SELECT + '" id="VghLantern__DrawingEditor__SheetSizeSelect">' +
               VghLantern__SheetManager__BuildOptions(keys, labels, VghLantern__DrawingEditor__SheetManager__SheetSizeKey()) +
               '</select></div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Orientation Selector
    // ------------------------------------------------------------
    function VghLantern__SheetManager__BuildOrientationGroup() {
        return '<div class="' + CSS_TOOL_GROUP + '">' +
               '<label class="' + CSS_TOOL_LABEL + '" for="VghLantern__DrawingEditor__OrientationSelect">Orientation</label>' +
               '<select class="' + CSS_TOOL_SELECT + '" id="VghLantern__DrawingEditor__OrientationSelect">' +
               VghLantern__SheetManager__BuildOptions(
                   ['landscape', 'portrait'], ['Landscape', 'Portrait'],
                   VghLantern__DrawingEditor__SheetManager__Orientation()
               ) +
               '</select></div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Scale Selector
    // ------------------------------------------------------------
    function VghLantern__SheetManager__BuildScaleGroup() {
        var ScaleManager  =  window.VghLantern__DrawingEditor__ScaleManager;
        if (!ScaleManager) return '';

        var denominators  =  ScaleManager.VghLantern__DrawingEditor__ScaleManager__ListDenominators();
        var labels        =  [];
        var i;

        for (i = 0; i < denominators.length; i++) labels.push('1:' + denominators[i]);

        return '<div class="' + CSS_TOOL_GROUP + '">' +
               '<label class="' + CSS_TOOL_LABEL + '" for="VghLantern__DrawingEditor__ScaleSelect">Scale</label>' +
               '<select class="' + CSS_TOOL_SELECT + '" id="VghLantern__DrawingEditor__ScaleSelect">' +
               VghLantern__SheetManager__BuildOptions(
                   denominators, labels,
                   ScaleManager.VghLantern__DrawingEditor__ScaleManager__GetDenominator()
               ) +
               '</select></div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Drawing Editor Toolbar
    // ------------------------------------------------------------
    function VghLantern__SheetManager__RenderToolbar() {
        var host  =  document.getElementById(DOM_TOOLBAR);
        if (!host) return;

        var toolbarCfg  =  VghLantern__SheetManager__DrawingConfig()['VghLantern__DrawingEditor__Config__Toolbar'] || {};
        var html        =  '<div class="' + CSS_TOOLBAR + '">';

        if (toolbarCfg.ShowSheetSizeSelect   !== false) html  +=  VghLantern__SheetManager__BuildSheetSizeGroup();
        if (toolbarCfg.ShowOrientationToggle !== false) html  +=  VghLantern__SheetManager__BuildOrientationGroup();
        if (toolbarCfg.ShowScaleSelect       !== false) html  +=  VghLantern__SheetManager__BuildScaleGroup();

        // Export sits hard right, away from the sheet setup controls, because it is
        // the one action on this toolbar that produces a file.
        if (toolbarCfg.ShowDownloadPdfButton !== false) {
            html  +=  '<div class="' + CSS_TOOL_SPACER + '"></div>' +
                      '<button type="button" class="' + CSS_TOOL_BUTTON + '" ' +
                      'id="VghLantern__DrawingEditor__DownloadPdfButton">Download PDF</button>';
        }

        host.innerHTML  =  html + '</div>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Grid Shares and Gutter Resize
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the View Grid Config Block
    // ------------------------------------------------------------
    function VghLantern__SheetManager__GridConfig() {
        return VghLantern__SheetManager__DrawingConfig()['VghLantern__DrawingEditor__Config__ViewGrid'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp a Number Into a Range
    // ------------------------------------------------------------
    function VghLantern__SheetManager__Clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalise Shares to Track Count and 100%
    // ------------------------------------------------------------
    function VghLantern__SheetManager__NormaliseShares(rawShares, trackCount) {
        var count   =  Math.max(1, trackCount);
        var shares  =  [];
        var i, total, value;

        for (i = 0; i < count; i++) {
            value  =  (Array.isArray(rawShares) && typeof rawShares[i] === 'number') ? rawShares[i] : (100 / count);
            shares.push(Math.max(0.01, value));
        }

        total  =  0;
        for (i = 0; i < shares.length; i++) total  +=  shares[i];
        for (i = 0; i < shares.length; i++) shares[i]  =  (shares[i] / total) * 100;
        return shares;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Ensure Session Shares Are Seeded From Config
    // ------------------------------------------------------------
    function VghLantern__SheetManager__EnsureShares() {
        var gridCfg  =  VghLantern__SheetManager__GridConfig();
        var columns  =  (typeof gridCfg.Columns === 'number' && gridCfg.Columns > 0) ? gridCfg.Columns : 2;
        var rows     =  (typeof gridCfg.Rows === 'number' && gridCfg.Rows > 0)       ? gridCfg.Rows    : 2;

        if (!VghLantern__SheetManager__ColumnSharesPct) {
            VghLantern__SheetManager__ColumnSharesPct  =  VghLantern__SheetManager__NormaliseShares(gridCfg.ColumnSharesPct, columns);
        }
        if (!VghLantern__SheetManager__RowSharesPct) {
            VghLantern__SheetManager__RowSharesPct  =  VghLantern__SheetManager__NormaliseShares(gridCfg.RowSharesPct, rows);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Expose Active Grid Shares for ViewportFrame and PDF Layout
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__SheetManager__GetGridShares() {
        VghLantern__SheetManager__EnsureShares();
        return {
            ColumnSharesPct  : VghLantern__SheetManager__ColumnSharesPct.slice(),
            RowSharesPct     : VghLantern__SheetManager__RowSharesPct.slice()
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build CSS Grid Template Tracks From Share Percents
    // ------------------------------------------------------------
    function VghLantern__SheetManager__BuildTrackTemplate(shares) {
        return shares.map(function(share) { return share + 'fr'; }).join(' ');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Overlay Markup for One Gutter Split
    // ------------------------------------------------------------
    function VghLantern__SheetManager__BuildResizeHandleMarkup(axis, splitIndex) {
        var axisClass  =  (axis === 'col') ? CSS_RESIZE_COL : CSS_RESIZE_ROW;
        return '<div class="' + CSS_RESIZE_HANDLE + ' ' + axisClass + '" ' +
               ATTR_SHEET_RESIZE + '="' + axis + '" ' +
               ATTR_SPLIT_INDEX + '="' + splitIndex + '" title="Drag to resize viewports"></div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Position Absolute Gutter Handles Over the Live Grid
    // ------------------------------------------------------------
    function VghLantern__SheetManager__PositionResizeHandles(gridEl) {
        if (!gridEl) return;

        var wrapEl  =  gridEl.parentElement;
        if (!wrapEl || !wrapEl.classList.contains(CSS_SHEET_GRID_WRAP)) return;

        VghLantern__SheetManager__EnsureShares();
        var gridCfg   =  VghLantern__SheetManager__GridConfig();
        var sheetCfg  =  VghLantern__SheetManager__SheetConfig();
        var gutterMm  =  (typeof gridCfg.GutterMm === 'number') ? gridCfg.GutterMm : 6;
        var pxPerMm   =  (typeof sheetCfg.ScreenPixelsPerMm === 'number') ? sheetCfg.ScreenPixelsPerMm : 3.2;
        var gutterPx  =  gutterMm * pxPerMm;

        var colShares  =  VghLantern__SheetManager__ColumnSharesPct;
        var rowShares  =  VghLantern__SheetManager__RowSharesPct;
        var usableW    =  gridEl.clientWidth  - (gutterPx * (colShares.length - 1));
        var usableH    =  gridEl.clientHeight - (gutterPx * (rowShares.length - 1));

        var handles  =  wrapEl.querySelectorAll('[' + ATTR_SHEET_RESIZE + ']');
        var i, axis, splitIndex, prefix, handleEl;

        for (i = 0; i < handles.length; i++) {
            handleEl     =  handles[i];
            axis         =  handleEl.getAttribute(ATTR_SHEET_RESIZE);
            splitIndex   =  parseInt(handleEl.getAttribute(ATTR_SPLIT_INDEX), 10) || 0;

            if (axis === 'col') {
                prefix  =  0;
                for (var c = 0; c <= splitIndex; c++) {
                    prefix  +=  usableW * (colShares[c] / 100);
                    if (c < splitIndex) prefix  +=  gutterPx;
                }
                handleEl.style.left    =  (prefix + (gutterPx / 2)) + 'px';
                handleEl.style.top     =  '0';
                handleEl.style.bottom  =  '0';
                handleEl.style.height  =  'auto';
                handleEl.style.width   =  Math.max(10, gutterPx + 6) + 'px';
            } else {
                prefix  =  0;
                for (var r = 0; r <= splitIndex; r++) {
                    prefix  +=  usableH * (rowShares[r] / 100);
                    if (r < splitIndex) prefix  +=  gutterPx;
                }
                handleEl.style.top     =  (prefix + (gutterPx / 2)) + 'px';
                handleEl.style.left    =  '0';
                handleEl.style.right   =  '0';
                handleEl.style.width   =  'auto';
                handleEl.style.height  =  Math.max(10, gutterPx + 6) + 'px';
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply Live Share Values Onto the Grid Element
    // ------------------------------------------------------------
    function VghLantern__SheetManager__ApplySharesToGrid(gridEl) {
        if (!gridEl) return;
        VghLantern__SheetManager__EnsureShares();
        gridEl.style.gridTemplateColumns  =  VghLantern__SheetManager__BuildTrackTemplate(VghLantern__SheetManager__ColumnSharesPct);
        gridEl.style.gridTemplateRows     =  VghLantern__SheetManager__BuildTrackTemplate(VghLantern__SheetManager__RowSharesPct);
        VghLantern__SheetManager__PositionResizeHandles(gridEl);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Rebalance One Split Pair From a Pointer Position
    // ------------------------------------------------------------
    function VghLantern__SheetManager__ApplyResizeDrag(clientX, clientY) {
        var drag    =  VghLantern__SheetManager__ActiveResize;
        var gridEl  =  drag ? drag.GridEl : null;
        if (!drag || !gridEl) return;

        var gridCfg   =  VghLantern__SheetManager__GridConfig();
        var minPct    =  (typeof gridCfg.ShareMinPct === 'number') ? gridCfg.ShareMinPct : FALLBACK_SHARE_MIN;
        var maxPct    =  (typeof gridCfg.ShareMaxPct === 'number') ? gridCfg.ShareMaxPct : FALLBACK_SHARE_MAX;
        var sheetCfg  =  VghLantern__SheetManager__SheetConfig();
        var gutterMm  =  (typeof gridCfg.GutterMm === 'number') ? gridCfg.GutterMm : 6;
        var pxPerMm   =  (typeof sheetCfg.ScreenPixelsPerMm === 'number') ? sheetCfg.ScreenPixelsPerMm : 3.2;
        var gutterPx  =  gutterMm * pxPerMm;

        var rect       =  gridEl.getBoundingClientRect();
        var shares     =  drag.IsColumn ? VghLantern__SheetManager__ColumnSharesPct : VghLantern__SheetManager__RowSharesPct;
        var splitIndex =  drag.SplitIndex;
        var pairTotal  =  shares[splitIndex] + shares[splitIndex + 1];
        var pairMin    =  Math.max(minPct, pairTotal - maxPct);
        var pairMax    =  Math.min(maxPct, pairTotal - minPct);

        var usable     =  drag.IsColumn
            ? (rect.width  - (gutterPx * (shares.length - 1)))
            : (rect.height - (gutterPx * (shares.length - 1)));

        var prefixPx  =  0;
        var t;
        for (t = 0; t < splitIndex; t++) {
            prefixPx  +=  usable * (shares[t] / 100) + gutterPx;
        }

        var pairPx     =  usable * (pairTotal / 100);
        var pointer    =  drag.IsColumn ? (clientX - rect.left) : (clientY - rect.top);
        var localPx    =  pointer - prefixPx;
        var firstPct   =  VghLantern__SheetManager__Clamp((localPx / pairPx) * pairTotal, pairMin, pairMax);

        shares[splitIndex]      =  firstPct;
        shares[splitIndex + 1]  =  pairTotal - firstPct;

        VghLantern__SheetManager__ApplySharesToGrid(gridEl);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | End a Gutter Drag and Re-Place Views at the Same Scale
    // ------------------------------------------------------------
    async function VghLantern__SheetManager__EndResizeDrag() {
        var drag  =  VghLantern__SheetManager__ActiveResize;
        if (!drag) return;

        if (drag.HandleEl) drag.HandleEl.classList.remove(CSS_RESIZE_DRAG);
        document.body.classList.remove(CSS_BODY_RESIZING, CSS_BODY_RESIZE_ROW);
        VghLantern__SheetManager__ActiveResize  =  null;

        // Re-apply true scale viewBoxes to the new body sizes. Auto-fit is skipped so
        // the quoted 1:N stays exactly where the user left it.
        var host     =  document.getElementById(DOM_SHEET_HOST);
        var sheetEl  =  host ? host.querySelector('.' + CSS_SHEET) : null;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        var ViewportFrame  =  window.VghLantern__DrawingEditor__ViewportFrame;
        if (!sheetEl || !ViewPlacement || !ViewportFrame) return;

        var state      =  VghLantern__SheetManager__ReadState();
        var sheetSize  =  ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__SheetSizeMm(
            VghLantern__DrawingEditor__SheetManager__SheetSizeKey(),
            VghLantern__DrawingEditor__SheetManager__Orientation()
        );
        if (!state.Lantern || !state.Geometry.Skeleton || !sheetSize) return;

        await ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__PlaceAll(
            sheetEl, state.Geometry, state.Lantern, sheetSize
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Delegated Gutter Drag Handles on the Sheet Host
    // ------------------------------------------------------------
    function VghLantern__SheetManager__BindGridResize() {
        if (VghLantern__SheetManager__IsResizeBound) return;

        var host  =  document.getElementById(DOM_SHEET_HOST);
        if (!host) return;

        host.addEventListener('pointerdown', function(ev) {
            var handleEl  =  ev.target.closest ? ev.target.closest('[' + ATTR_SHEET_RESIZE + ']') : null;
            if (!handleEl) return;

            var wrapEl  =  handleEl.closest('.' + CSS_SHEET_GRID_WRAP);
            var gridEl  =  wrapEl ? wrapEl.querySelector('.' + CSS_SHEET_GRID) : null;
            if (!gridEl) return;

            var isColumn    =  handleEl.getAttribute(ATTR_SHEET_RESIZE) === 'col';
            var splitIndex  =  parseInt(handleEl.getAttribute(ATTR_SPLIT_INDEX), 10) || 0;

            VghLantern__SheetManager__ActiveResize  =  {
                HandleEl   : handleEl,
                GridEl     : gridEl,
                IsColumn   : isColumn,
                SplitIndex : splitIndex
            };

            handleEl.classList.add(CSS_RESIZE_DRAG);
            document.body.classList.add(CSS_BODY_RESIZING);
            if (!isColumn) document.body.classList.add(CSS_BODY_RESIZE_ROW);

            function onMove(moveEv) {
                VghLantern__SheetManager__ApplyResizeDrag(moveEv.clientX, moveEv.clientY);
            }

            function onUp() {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onUp);
                void VghLantern__SheetManager__EndResizeDrag();
            }

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onUp);

            if (handleEl.setPointerCapture) handleEl.setPointerCapture(ev.pointerId);
            ev.preventDefault();
            ev.stopPropagation();
        });

        VghLantern__SheetManager__IsResizeBound  =  true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sheet Construction
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Empty Sheet Structure at Paper Size
    // ------------------------------------------------------------
    // The scaler wraps the sheet and carries the screen zoom transform, so the sheet
    // itself keeps its true paper dimensions for export.
    function VghLantern__SheetManager__BuildSheetStructure(sheetSize) {
        var ViewportFrame  =  window.VghLantern__DrawingEditor__ViewportFrame;
        var sheetCfg       =  VghLantern__SheetManager__SheetConfig();
        var gridCfg        =  VghLantern__SheetManager__GridConfig();
        var pdfCfg         =  VghLantern__SheetManager__DrawingConfig()['VghLantern__DrawingEditor__Config__PdfExport'] || {};
        var notesCfg       =  VghLantern__SheetManager__DrawingConfig()['VghLantern__DrawingEditor__Config__Annotations'] || {};
        var titleCfg       =  VghLantern__SheetManager__DrawingConfig()['VghLantern__DrawingEditor__Config__TitleBlock'] || {};

        VghLantern__SheetManager__EnsureShares();

        var marginMm     =  (typeof sheetCfg.MarginMm === 'number') ? sheetCfg.MarginMm : 10;
        var titleMm      =  (typeof sheetCfg.TitleBlockHeightMm === 'number') ? sheetCfg.TitleBlockHeightMm : 10;
        var gutterMm     =  (typeof gridCfg.GutterMm === 'number') ? gridCfg.GutterMm : 6;
        var pxPerMm      =  (typeof sheetCfg.ScreenPixelsPerMm === 'number') ? sheetCfg.ScreenPixelsPerMm : 3.2;
        var blockGapMm   =  (typeof sheetCfg.BlockGapMm === 'number')
            ? sheetCfg.BlockGapMm
            : ((typeof pdfCfg.BlockGapMm === 'number') ? pdfCfg.BlockGapMm : 3);
        var noteFontMm   =  (typeof notesCfg.DefaultFontSizeMm === 'number') ? notesCfg.DefaultFontSizeMm : 1.4;
        var noteHeadMm   =  noteFontMm * ((typeof notesCfg.HeadingScale === 'number') ? notesCfg.HeadingScale : 1.05);
        var notePadTopMm =  (typeof notesCfg.PaddingTopMm === 'number') ? notesCfg.PaddingTopMm : 1.25;
        var noteColGapMm =  (typeof notesCfg.ColumnGapMm === 'number') ? notesCfg.ColumnGapMm : 6;
        var labelFontMm  =  (typeof titleCfg.FontSizeLabelMm === 'number') ? titleCfg.FontSizeLabelMm : 1.6;
        var valueFontMm  =  (typeof titleCfg.FontSizeValueMm === 'number') ? titleCfg.FontSizeValueMm : 2.2;
        var logoMaxMm    =  (typeof titleCfg.LogoMaxHeightMm === 'number') ? titleCfg.LogoMaxHeightMm : 5.5;
        var logoPadVMm   =  (typeof titleCfg.LogoPaddingVMm === 'number') ? titleCfg.LogoPaddingVMm : 1.8;
        var logoPadHMm   =  (typeof titleCfg.LogoPaddingHMm === 'number') ? titleCfg.LogoPaddingHMm : 2.5;
        var fieldPadTMm  =  (typeof titleCfg.FieldPaddingTopMm === 'number') ? titleCfg.FieldPaddingTopMm : 2.4;
        var fieldPadHMm  =  (typeof titleCfg.FieldPaddingHMm === 'number') ? titleCfg.FieldPaddingHMm : 1.4;
        var fieldPadBMm  =  (typeof titleCfg.FieldPaddingBottomMm === 'number') ? titleCfg.FieldPaddingBottomMm : 0.8;
        var fieldLabTMm  =  (typeof titleCfg.FieldLabelOffsetTopMm === 'number') ? titleCfg.FieldLabelOffsetTopMm : 0.5;
        var frameStroke  =  (typeof gridCfg.FrameStrokeMm === 'number') ? gridCfg.FrameStrokeMm : 0.25;

        var chromeVars  =  '--VghSheet_BlockGap:' + blockGapMm + 'mm;' +
                           '--VghSheet_NoteFont:' + noteFontMm + 'mm;' +
                           '--VghSheet_NoteHeadingFont:' + noteHeadMm + 'mm;' +
                           '--VghSheet_NotePadTop:' + notePadTopMm + 'mm;' +
                           '--VghSheet_NoteColGap:' + noteColGapMm + 'mm;' +
                           '--VghSheet_TitleLabelFont:' + labelFontMm + 'mm;' +
                           '--VghSheet_TitleValueFont:' + valueFontMm + 'mm;' +
                           '--VghSheet_LogoMaxHeight:' + logoMaxMm + 'mm;' +
                           '--VghSheet_LogoPadV:' + logoPadVMm + 'mm;' +
                           '--VghSheet_LogoPadH:' + logoPadHMm + 'mm;' +
                           '--VghSheet_FieldPadT:' + fieldPadTMm + 'mm;' +
                           '--VghSheet_FieldPadH:' + fieldPadHMm + 'mm;' +
                           '--VghSheet_FieldPadB:' + fieldPadBMm + 'mm;' +
                           '--VghSheet_FieldLabelTop:' + fieldLabTMm + 'mm;' +
                           '--VghSheet_FrameStroke:' + frameStroke + 'mm;';

        var sheetStyle  =  chromeVars +
                           'width:' + (sheetSize.WidthMm * pxPerMm) + 'px;' +
                           'height:' + (sheetSize.HeightMm * pxPerMm) + 'px;' +
                           'padding:' + (marginMm * pxPerMm) + 'px;' +
                           'gap:' + (blockGapMm * pxPerMm) + 'px;';

        var gridStyle   =  'grid-template-columns:' + VghLantern__SheetManager__BuildTrackTemplate(VghLantern__SheetManager__ColumnSharesPct) + ';' +
                           'grid-template-rows:' + VghLantern__SheetManager__BuildTrackTemplate(VghLantern__SheetManager__RowSharesPct) + ';' +
                           'gap:' + (gutterMm * pxPerMm) + 'px;';

        var titleStyle  =  'height:' + (titleMm * pxPerMm) + 'px;';

        var framesHtml  =  '';
        if (ViewportFrame) {
            var slots  =  VghLantern__SheetManager__DrawingConfig()['VghLantern__DrawingEditor__Config__ViewSlots'] || [];
            var i;
            for (i = 0; i < slots.length; i++) {
                framesHtml  +=  ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__BuildMarkup(slots[i]);
            }
        }

        var handlesHtml  =  '';
        if (gridCfg.ResizeHandlesEnabled !== false) {
            var c, r;
            for (c = 0; c < VghLantern__SheetManager__ColumnSharesPct.length - 1; c++) {
                handlesHtml  +=  VghLantern__SheetManager__BuildResizeHandleMarkup('col', c);
            }
            for (r = 0; r < VghLantern__SheetManager__RowSharesPct.length - 1; r++) {
                handlesHtml  +=  VghLantern__SheetManager__BuildResizeHandleMarkup('row', r);
            }
        }

        return '<div class="' + CSS_SHEET_SCALER + '">' +
               '<div class="' + CSS_SHEET + '" style="' + sheetStyle + '" ' +
               'data-vgh-sheet-size="' + sheetSize.Key + '" data-vgh-sheet-orientation="' + sheetSize.Orientation + '">' +
               '<div class="' + CSS_SHEET_GRID_WRAP + '">' +
               '<div class="' + CSS_SHEET_GRID + '" style="' + gridStyle + '">' + framesHtml + '</div>' +
               handlesHtml +
               '</div>' +
               '<div class="' + CSS_SHEET_NOTES + '"></div>' +
               '<div class="' + CSS_SHEET_TITLE + '" style="' + titleStyle + '"></div>' +
               '</div></div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply Auto Fit to the Scale Before Any View Is Drawn
    // ------------------------------------------------------------
    function VghLantern__SheetManager__ApplyAutoFit(sheetSize, geometry) {
        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        var ViewportFrame  =  window.VghLantern__DrawingEditor__ViewportFrame;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        if (!ScaleManager || !ViewportFrame || !ViewPlacement) return;
        if (!ScaleManager.VghLantern__DrawingEditor__ScaleManager__IsAutoFitEnabled()) return;

        var cellMetrics  =  ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__CellSizeMm(sheetSize);
        var requests     =  ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__BuildFitRequests(cellMetrics, geometry);

        if (requests.length) ScaleManager.VghLantern__DrawingEditor__ScaleManager__FitToRequests(requests);
    }
    // ------------------------------------------------------------


    // FUNCTION | Build and Populate the Sheet
    // ------------------------------------------------------------
    async function VghLantern__DrawingEditor__SheetManager__Render() {
        var host  =  document.getElementById(DOM_SHEET_HOST);
        if (!host) return false;

        if (VghLantern__SheetManager__IsRendering) {
            VghLantern__SheetManager__IsRerunQueued  =  true;                  // <-- Latch the request; the in-flight build re-runs when it lands
            return false;
        }
        VghLantern__SheetManager__IsRendering  =  true;

        try {
            var state  =  VghLantern__SheetManager__ReadState();
            var hasModel  =  !!(state.Lantern && state.Geometry.Skeleton);

            var ViewportFrame  =  window.VghLantern__DrawingEditor__ViewportFrame;
            var sheetSize      =  ViewportFrame
                ? ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__SheetSizeMm(
                      VghLantern__DrawingEditor__SheetManager__SheetSizeKey(),
                      VghLantern__DrawingEditor__SheetManager__Orientation()
                  )
                : null;

            // Scale first: the toolbar select, the frame captions and the titleblock
            // all quote it, so it must be settled before any of them render. A scale
            // the user picked by hand is never overridden by the auto fit.
            if (hasModel && sheetSize && !VghLantern__SheetManager__IsScaleManual) {
                VghLantern__SheetManager__ApplyAutoFit(sheetSize, state.Geometry);
            }

            VghLantern__SheetManager__RenderToolbar();
            VghLantern__SheetManager__BindToolbar();

            if (!hasModel) {
                host.innerHTML  =  '<p class="' + CSS_EMPTY_STATE + '">' + MESSAGE_NO_LANTERN + '</p>';
                return false;
            }

            if (!sheetSize) {
                host.innerHTML  =  '<p class="' + CSS_EMPTY_STATE + '">Sheet configuration unavailable.</p>';
                return false;
            }

            host.innerHTML  =  VghLantern__SheetManager__BuildSheetStructure(sheetSize);
            VghLantern__SheetManager__ApplySheetZoom();                        // <-- Rebuilt DOM starts unscaled; re-apply the session zoom

            var sheetEl  =  host.querySelector('.' + CSS_SHEET);
            var gridEl   =  host.querySelector('.' + CSS_SHEET_GRID);
            VghLantern__SheetManager__PositionResizeHandles(gridEl);
            VghLantern__SheetManager__RenderSheetFurniture(sheetEl, state);

            var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
            if (ViewPlacement) {
                await ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__PlaceAll(
                    sheetEl, state.Geometry, state.Lantern, sheetSize
                );
            }

            return true;
        } catch (e) {
            console.error('[VghLantern__DrawingEditor__SheetManager] Sheet render failed:', e);
            return false;
        } finally {
            VghLantern__SheetManager__IsRendering  =  false;

            // Replay a request that arrived mid-build, so the sheet never shows
            // geometry older than the last thing the user did.
            if (VghLantern__SheetManager__IsRerunQueued) {
                VghLantern__SheetManager__IsRerunQueued  =  false;
                setTimeout(function() { void VghLantern__DrawingEditor__SheetManager__Render(); }, 0);
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render the Titleblock and Notes Onto a Built Sheet
    // ------------------------------------------------------------
    function VghLantern__SheetManager__RenderSheetFurniture(sheetElement, state) {
        if (!sheetElement) return;

        var TitleBlock      =  window.VghLantern__DrawingEditor__TitleBlockRenderer;
        var AnnotationLayer =  window.VghLantern__DrawingEditor__AnnotationLayer;

        if (TitleBlock) {
            TitleBlock.VghLantern__DrawingEditor__TitleBlockRenderer__Render(
                sheetElement.querySelector('.' + CSS_SHEET_TITLE), state.Project, state.Lantern
            );
        }

        if (AnnotationLayer) {
            AnnotationLayer.VghLantern__DrawingEditor__AnnotationLayer__Render(
                sheetElement.querySelector('.' + CSS_SHEET_NOTES), state.Project
            );
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Selection Accessors
// -----------------------------------------------------------------------------

    // FUNCTION | Get the Active Sheet Size Key
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__SheetManager__SheetSizeKey() {
        if (VghLantern__SheetManager__SheetSizeKey) return VghLantern__SheetManager__SheetSizeKey;
        return VghLantern__SheetManager__SheetConfig().DefaultSheetSize || 'A3';
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Active Sheet Orientation
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__SheetManager__Orientation() {
        if (VghLantern__SheetManager__Orientation) return VghLantern__SheetManager__Orientation;
        return VghLantern__SheetManager__SheetConfig().DefaultOrientation || 'landscape';
    }
    // ------------------------------------------------------------


    // FUNCTION | Describe the Composed Sheet for the Document Preview Mode
    // ------------------------------------------------------------
    // Preview and PDF export consume this rather than reaching into the sheet DOM,
    // so the two modes stay decoupled and the sheet can be rebuilt freely.
    function VghLantern__DrawingEditor__SheetManager__DescribeSheet() {
        var ViewportFrame  =  window.VghLantern__DrawingEditor__ViewportFrame;
        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        var state          =  VghLantern__SheetManager__ReadState();

        var sheetSize  =  ViewportFrame
            ? ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__SheetSizeMm(
                  VghLantern__DrawingEditor__SheetManager__SheetSizeKey(),
                  VghLantern__DrawingEditor__SheetManager__Orientation()
              )
            : null;

        return {
            SheetSizeKey     : VghLantern__DrawingEditor__SheetManager__SheetSizeKey(),
            Orientation      : VghLantern__DrawingEditor__SheetManager__Orientation(),
            SheetSize        : sheetSize,
            ScaleDenominator : ScaleManager ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__GetDenominator() : null,
            ScaleLabel       : ScaleManager ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__FormatLabel() : '',
            ViewSvgMarkup    : ViewPlacement ? ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__CollectSvgMarkup() : {},
            ViewSnapshots    : ViewPlacement ? ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__CollectSnapshots() : {},
            IsComposed       : ViewPlacement ? ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__HasComposedOutput() : false,
            Project          : state.Project,
            Lantern          : state.Lantern
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Wiring
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Bind the Toolbar Controls
    // ------------------------------------------------------------
    // Bound after every toolbar render, because the toolbar markup is replaced
    // wholesale rather than mutated.
    function VghLantern__SheetManager__BindToolbar() {
        var sizeSelect     =  document.getElementById('VghLantern__DrawingEditor__SheetSizeSelect');
        var orientSelect   =  document.getElementById('VghLantern__DrawingEditor__OrientationSelect');
        var scaleSelect    =  document.getElementById('VghLantern__DrawingEditor__ScaleSelect');

        if (sizeSelect) {
            sizeSelect.addEventListener('change', function(e) {
                VghLantern__SheetManager__SheetSizeKey  =  e.currentTarget.value;
                void VghLantern__DrawingEditor__SheetManager__Render();
            });
        }

        if (orientSelect) {
            orientSelect.addEventListener('change', function(e) {
                VghLantern__SheetManager__Orientation  =  e.currentTarget.value;
                void VghLantern__DrawingEditor__SheetManager__Render();
            });
        }

        if (scaleSelect) {
            scaleSelect.addEventListener('change', function(e) {
                var ScaleManager  =  window.VghLantern__DrawingEditor__ScaleManager;
                if (!ScaleManager) return;
                ScaleManager.VghLantern__DrawingEditor__ScaleManager__SetDenominator(e.currentTarget.value);
                VghLantern__SheetManager__IsScaleManual  =  true;             // <-- The choice sticks; auto fit no longer overrides it
                void VghLantern__DrawingEditor__SheetManager__Render();
            });
        }

        var downloadButton  =  document.getElementById('VghLantern__DrawingEditor__DownloadPdfButton');
        if (downloadButton) {
            downloadButton.addEventListener('click', function(e) {
                var PdfExporter  =  window.VghLantern__DrawingEditor__SheetPdfExporter;
                if (!PdfExporter) return;

                var button  =  e.currentTarget;
                button.disabled     =  true;                                   // <-- Rasterising blocks; the disabled state says so
                button.textContent  =  'Exporting...';

                void PdfExporter.VghLantern__DrawingEditor__SheetPdfExporter__Export().then(function() {
                    button.disabled     =  false;
                    button.textContent  =  'Download PDF';
                });
            });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply the Current Zoom Factor to the Built Sheet
    // ------------------------------------------------------------
    function VghLantern__SheetManager__ApplySheetZoom() {
        var host  =  document.getElementById(DOM_SHEET_HOST);
        if (!host) return;

        var scaler  =  host.querySelector('.' + CSS_SHEET_SCALER);
        var sheet   =  host.querySelector('.' + CSS_SHEET);
        if (!scaler || !sheet) return;

        var z  =  VghLantern__SheetManager__ZoomFactor;

        sheet.style.transform        =  'scale(' + z + ')';
        sheet.style.transformOrigin  =  'top left';

        // The transform does not affect layout, so the scaler is sized explicitly
        // to the scaled sheet - that is what keeps the host scrollbars honest.
        // display:block overrides the stylesheet's flex centring, which would
        // offset the sheet's layout box away from the transform origin.
        scaler.style.display =  'block';
        scaler.style.width   =  (sheet.offsetWidth  * z) + 'px';
        scaler.style.height  =  (sheet.offsetHeight * z) + 'px';
        scaler.style.margin  =  '0 auto';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Zoom the Sheet About a Client-Space Anchor Point
    // ------------------------------------------------------------
    function VghLantern__SheetManager__ZoomAt(nextZoom, anchorClientX, anchorClientY) {
        var host  =  document.getElementById(DOM_SHEET_HOST);
        if (!host) return;

        var clamped  =  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoom));
        var previous =  VghLantern__SheetManager__ZoomFactor;
        if (clamped === previous) return;

        var hostRect  =  host.getBoundingClientRect();
        var offsetX   =  anchorClientX - hostRect.left;
        var offsetY   =  anchorClientY - hostRect.top;

        // Keep the sheet point under the cursor stationary through the zoom.
        var contentX  =  (host.scrollLeft + offsetX) / previous;
        var contentY  =  (host.scrollTop  + offsetY) / previous;

        VghLantern__SheetManager__ZoomFactor  =  clamped;
        VghLantern__SheetManager__ApplySheetZoom();

        host.scrollLeft  =  (contentX * clamped) - offsetX;
        host.scrollTop   =  (contentY * clamped) - offsetY;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Wheel Zoom and Drag Pan to the Sheet Host
    // ------------------------------------------------------------
    // Bound once at boot to the host element, which survives every innerHTML
    // rebuild of the sheet inside it. Wheel zooms about the cursor; a RIGHT or
    // MIDDLE drag pans via the host's own scroll. Left click is deliberately
    // untouched: pan capture on it would swallow the click before it reached a
    // dimension text or the 3D frame's double-click camera entry.
    function VghLantern__SheetManager__BindSheetNavigation() {
        if (VghLantern__SheetManager__IsNavBound) return;

        var host  =  document.getElementById(DOM_SHEET_HOST);
        if (!host) return;

        host.addEventListener('wheel', function(e) {
            // A live camera-edit canvas owns its own wheel (orbit zoom).
            if (e.target && e.target.closest && e.target.closest('canvas')) return;
            e.preventDefault();
            var factor  =  Math.exp(-e.deltaY * ZOOM_WHEEL_STEP);
            VghLantern__SheetManager__ZoomAt(VghLantern__SheetManager__ZoomFactor * factor, e.clientX, e.clientY);
        }, { passive: false });

        host.addEventListener('pointerdown', function(e) {
            if (e.button !== 1 && e.button !== 2) return;                     // <-- Middle or right drag only; left is for editing

            // Real controls keep their own behaviour, and a live camera-edit
            // canvas owns its pointer drags (orbit / dolly / truck).
            if (e.target && e.target.closest && e.target.closest('input, select, button, canvas')) return;

            e.preventDefault();                                               // <-- Stops middle-button autoscroll
            VghLantern__SheetManager__PanState  =  {
                StartClientX : e.clientX,
                StartClientY : e.clientY,
                StartLeft    : host.scrollLeft,
                StartTop     : host.scrollTop
            };
            host.classList.add(CSS_HOST_PANNING);
            if (host.setPointerCapture) host.setPointerCapture(e.pointerId);
        });

        // Right-drag pan means the browser context menu has no place on the sheet.
        host.addEventListener('contextmenu', function(e) {
            if (e.target && e.target.closest && e.target.closest('input, select, button')) return;
            e.preventDefault();
        });

        host.addEventListener('pointermove', function(e) {
            var pan  =  VghLantern__SheetManager__PanState;
            if (!pan) return;
            host.scrollLeft  =  pan.StartLeft - (e.clientX - pan.StartClientX);
            host.scrollTop   =  pan.StartTop  - (e.clientY - pan.StartClientY);
        });

        function VghLantern__SheetManager__EndPan(e) {
            if (!VghLantern__SheetManager__PanState) return;
            VghLantern__SheetManager__PanState  =  null;
            host.classList.remove(CSS_HOST_PANNING);
            if (host.releasePointerCapture && e.pointerId !== undefined) {
                try { host.releasePointerCapture(e.pointerId); } catch (err) { /* capture already released */ }
            }
        }
        host.addEventListener('pointerup',     VghLantern__SheetManager__EndPan);
        host.addEventListener('pointercancel', VghLantern__SheetManager__EndPan);

        VghLantern__SheetManager__IsNavBound  =  true;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Test Whether the Drawing Editor Panel Is On Screen
    // ------------------------------------------------------------
    function VghLantern__SheetManager__IsModeVisible() {
        var panel  =  document.getElementById('VghLantern__App__ModeDrawingEditor');
        return !!panel && panel.classList.contains('VghLantern__App__ModePanel--active');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Queue a Debounced Sheet Rebuild
    // ------------------------------------------------------------
    // Skipped entirely while the mode is off screen. A sheet rebuild costs four view
    // renders and a 3D snapshot, which is far too much work to spend on a panel
    // nobody is looking at - mode entry rebuilds it anyway.
    function VghLantern__SheetManager__QueueRedraw() {
        if (!VghLantern__SheetManager__IsModeVisible()) return;

        if (VghLantern__SheetManager__RedrawTimerId !== null) {
            clearTimeout(VghLantern__SheetManager__RedrawTimerId);
        }

        VghLantern__SheetManager__RedrawTimerId  =  setTimeout(function() {
            VghLantern__SheetManager__RedrawTimerId  =  null;
            void VghLantern__DrawingEditor__SheetManager__Render();
        }, REDRAW_DEBOUNCE_MS);
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe to Geometry and Project Changes
    // ------------------------------------------------------------
    // Called once at boot. Subscribing to the solve rather than to each edit means
    // one listener covers dimension edits, control changes and lantern switches,
    // because all of them end in a resolve.
    function VghLantern__DrawingEditor__SheetManager__Init() {
        if (VghLantern__SheetManager__IsSubscribed) return;

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.VghLantern__StateManager__On('geometrySolved', VghLantern__SheetManager__QueueRedraw);
        StateManager.VghLantern__StateManager__On('projectChanged', VghLantern__SheetManager__QueueRedraw);

        VghLantern__SheetManager__BindSheetNavigation();                       // <-- Host element is static DOM, so once is enough
        VghLantern__SheetManager__BindGridResize();                            // <-- Gutter drags also bind once on the host

        VghLantern__SheetManager__IsSubscribed  =  true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Release Sheet Surfaces on Mode Exit
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__SheetManager__OnModeExit() {
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        if (ViewPlacement) ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__DisposeAll();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__SheetManager__Init           : VghLantern__DrawingEditor__SheetManager__Init,
        VghLantern__DrawingEditor__SheetManager__Render         : VghLantern__DrawingEditor__SheetManager__Render,
        VghLantern__DrawingEditor__SheetManager__DescribeSheet   : VghLantern__DrawingEditor__SheetManager__DescribeSheet,
        VghLantern__DrawingEditor__SheetManager__GetGridShares   : VghLantern__DrawingEditor__SheetManager__GetGridShares,
        VghLantern__DrawingEditor__SheetManager__SheetSizeKey    : VghLantern__DrawingEditor__SheetManager__SheetSizeKey,
        VghLantern__DrawingEditor__SheetManager__Orientation     : VghLantern__DrawingEditor__SheetManager__Orientation,
        VghLantern__DrawingEditor__SheetManager__OnModeExit      : VghLantern__DrawingEditor__SheetManager__OnModeExit
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetManager  =  VghLantern__DrawingEditor__SheetManager;
