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
   - The single owner of the Drawing Editor mode. Solves the sheet layout, lays the
     paper out on screen, asks ViewPlacement to fill the frames and hands the same
     layout to the PDF exporter.
   - Holds the sheet size, orientation, scale, grid shares and zoom for the session,
     and persists them onto the project file so a reopened project comes back on the
     sheet it was left on.
   - Everything measurable comes from SheetPdfLayout; this module sequences it rather
     than repeating its arithmetic.

   -----------------------------------------------------------------------------

   WHY THE SCREEN SHEET IS POSITIONED FROM THE PDF LAYOUT SOLVE:
   The sheet used to be a CSS grid inside a flex column while the exporter solved the
   same rectangles independently in millimetres. Two descriptions of one layout drift
   on every rounding decision, and the drift lands on an issued drawing. Every frame
   is now placed from the solved paper rectangle, divided by ScreenPixelsPerMm and
   nothing else, so a frame on screen is the frame on paper.

   WHY THE CHROME IS AN SVG OVERLAY RATHER THAN DOM:
   Frame borders, caption strips, the notes block and the titleblock are drawn by
   SheetChrome into one overlay whose viewBox is the paper in millimetres. That is the
   same primitive list the exporter draws, so type sits on the same baselines in the
   same face at the same weight on both surfaces. The overlay is pointer-transparent,
   so clicking a dimension or double-clicking the 3D frame still reaches the view.

   WHY REDRAW IS DEBOUNCED:
   Every solved-geometry event would otherwise trigger three view renders plus a 3D
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
    const CSS_SHEET_CHROME  =  'VghLantern__Sheet__ChromeLayer';
    const CSS_EMPTY_STATE   =  'VghLantern__DrawingEditor__EmptyState';

    const CSS_RESIZE_HANDLE =  'VghLantern__Sheet__ResizeHandle';
    const CSS_RESIZE_COL    =  'VghLantern__Sheet__ResizeHandle--col';
    const CSS_RESIZE_ROW    =  'VghLantern__Sheet__ResizeHandle--row';
    const CSS_RESIZE_DRAG   =  'VghLantern__Sheet__ResizeHandle--dragging';
    const CSS_BODY_RESIZING =  'VghLantern__Sheet__IsResizing';
    const CSS_BODY_RESIZE_ROW =  'VghLantern__Sheet__IsResizing--row';

    const ATTR_SHEET_RESIZE =  'data-vgh-sheet-resize';
    const ATTR_SPLIT_INDEX  =  'data-vgh-split-index';
    const ATTR_SLOT_KEY     =  'data-vgh-slot';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Behaviour
    // ------------------------------------------------------------
    const REDRAW_DEBOUNCE_MS  =  180;                                         // <-- Coalesces geometry event storms into one sheet rebuild
    const MESSAGE_NO_LANTERN  =  'Select a lantern in the Lantern Editor to compose a drawing sheet.';

    const ZOOM_MIN            =  0.25;                                        // <-- Widest zoom-out of the sheet
    const ZOOM_MAX            =  4;                                           // <-- Tightest zoom-in of the sheet
    const ZOOM_WHEEL_STEP     =  0.0016;                                      // <-- Wheel delta to zoom factor, matches Env2d feel
    const CSS_HOST_PANNING    =  'VghLantern__DrawingEditor__SheetHost--panning';

    // ------------------------------------------------------------


    // MODULE CONSTANTS | Project File Layout Block
    // ------------------------------------------------------------
    // The sheet setup is document state, not application state: a project issued at
    // A2 1:20 with a rebalanced grid should reopen exactly that way, so it is written
    // onto the project file rather than held in the session or in localStorage.
    const LAYOUT_BLOCK          =  'VghLantern__ProjectFile__DrawingLayout';
    const LAYOUT_SHEET_SIZE     =  'VghLantern__ProjectFile__DrawingLayout__SheetSizeKey';
    const LAYOUT_ORIENTATION    =  'VghLantern__ProjectFile__DrawingLayout__Orientation';
    const LAYOUT_SCALE          =  'VghLantern__ProjectFile__DrawingLayout__ScaleDenominator';
    const LAYOUT_SCALE_MANUAL   =  'VghLantern__ProjectFile__DrawingLayout__ScaleIsManual';
    const LAYOUT_COLUMN_SHARES  =  'VghLantern__ProjectFile__DrawingLayout__ColumnSharesPct';
    const LAYOUT_ROW_SHARES     =  'VghLantern__ProjectFile__DrawingLayout__RowSharesPct';
    const LAYOUT_ZOOM           =  'VghLantern__ProjectFile__DrawingLayout__SheetZoomFactor';
    const LAYOUT_CAMERAS        =  'VghLantern__ProjectFile__DrawingLayout__ViewCameraStates';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Sheet Selection and Lifecycle State
    // ------------------------------------------------------------
    let VghLantern__SheetManager__SheetSizeKey    =  null;                    // <-- Null means "use the config default"
    let VghLantern__SheetManager__Orientation     =  null;
    let VghLantern__SheetManager__IsScaleManual   =  false;                   // <-- User picked a scale; auto fit stands down until reset
    let VghLantern__SheetManager__IsSubscribed    =  false;                   // <-- Guards duplicate StateManager listeners
    let VghLantern__SheetManager__RedrawTimerId   =  null;
    let VghLantern__SheetManager__IsRendering     =  false;                   // <-- Prevents overlapping async sheet builds
    let VghLantern__SheetManager__IsRerunQueued   =  false;                   // <-- A render request arrived while one was in flight
    // ------------------------------------------------------------


    // MODULE VARIABLES | Sheet Navigation State
    // ------------------------------------------------------------
    // Zoom is a CSS transform on the sheet plus an explicit size on the scaler, so
    // the sheet keeps its true paper-pixel dimensions while the host's native
    // scrollbars provide the pan surface.
    let VghLantern__SheetManager__ZoomFactor      =  1;
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


    // MODULE VARIABLES | Last Solved Layout and Persistence Guard
    // ------------------------------------------------------------
    // The layout is retained because a gutter drag re-lays the sheet out between
    // pointer moves without re-rendering any view. The restore guard stops the act of
    // loading a project's sheet setup from being recorded as a change to it.
    let VghLantern__SheetManager__ActiveLayout     =  null;
    let VghLantern__SheetManager__IsRestoring      =  false;
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


    // HELPER FUNCTION | Get the View Grid Config Block
    // ------------------------------------------------------------
    function VghLantern__SheetManager__GridConfig() {
        return VghLantern__SheetManager__DrawingConfig()['VghLantern__DrawingEditor__Config__ViewGrid'] || {};
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


    // HELPER FUNCTION | Count the Notes the Current Project Prints
    // ------------------------------------------------------------
    function VghLantern__SheetManager__NoteCount(project) {
        var AnnotationLayer  =  window.VghLantern__DrawingEditor__AnnotationLayer;
        if (!AnnotationLayer) return 0;
        return AnnotationLayer.VghLantern__DrawingEditor__AnnotationLayer__CollectNotes(project).length;
    }
    // ------------------------------------------------------------


    // FUNCTION | Solve the Paper Layout of the Current Sheet
    // ------------------------------------------------------------
    // The one place the sheet geometry is produced. The screen build, the gutter
    // drag, the view placement and the PDF export all consume this same shape.
    function VghLantern__DrawingEditor__SheetManager__SolveLayout(project) {
        var ViewportFrame   =  window.VghLantern__DrawingEditor__ViewportFrame;
        var SheetPdfLayout  =  window.VghLantern__DrawingEditor__SheetPdfLayout;
        if (!ViewportFrame || !SheetPdfLayout) return null;

        var sheetSize  =  ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__SheetSizeMm(
            VghLantern__DrawingEditor__SheetManager__SheetSizeKey(),
            VghLantern__DrawingEditor__SheetManager__Orientation()
        );
        if (!sheetSize) return null;

        VghLantern__SheetManager__EnsureShares();                             // <-- Solver reads the shares back through GetGridShares

        return SheetPdfLayout.VghLantern__DrawingEditor__SheetPdfLayout__Solve(
            sheetSize, VghLantern__SheetManager__NoteCount(project)
        );
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

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var TOOLBAR_LABEL  =  'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__Toolbar';
        var toolbarCfg  =  VghLantern__SheetManager__DrawingConfig()['VghLantern__DrawingEditor__Config__Toolbar'] || {};
        var html        =  '<div class="' + CSS_TOOLBAR + '">';

        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(toolbarCfg, 'ShowSheetSizeSelect',   TOOLBAR_LABEL)) html  +=  VghLantern__SheetManager__BuildSheetSizeGroup();
        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(toolbarCfg, 'ShowOrientationToggle', TOOLBAR_LABEL)) html  +=  VghLantern__SheetManager__BuildOrientationGroup();
        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(toolbarCfg, 'ShowScaleSelect',       TOOLBAR_LABEL)) html  +=  VghLantern__SheetManager__BuildScaleGroup();

        // Export sits hard right, away from the sheet setup controls, because it is
        // the one action on this toolbar that produces a file.
        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(toolbarCfg, 'ShowDownloadPdfButton', TOOLBAR_LABEL)) {
            html  +=  '<div class="' + CSS_TOOL_SPACER + '"></div>' +
                      '<button type="button" class="' + CSS_TOOL_BUTTON + '" ' +
                      'id="VghLantern__DrawingEditor__DownloadPdfButton">Download PDF</button>';
        }

        host.innerHTML  =  html + '</div>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Grid Shares
// -----------------------------------------------------------------------------

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
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var gridCfg  =  VghLantern__SheetManager__GridConfig();
        var GRID_LABEL =  'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__ViewGrid';
        var columns  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'Columns', GRID_LABEL);
        var rows     =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'Rows', GRID_LABEL);

        if (!VghLantern__SheetManager__ColumnSharesPct) {
            VghLantern__SheetManager__ColumnSharesPct  =  VghLantern__SheetManager__NormaliseShares(gridCfg.ColumnSharesPct, columns);
        }
        if (!VghLantern__SheetManager__RowSharesPct) {
            VghLantern__SheetManager__RowSharesPct  =  VghLantern__SheetManager__NormaliseShares(gridCfg.RowSharesPct, rows);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Expose Active Grid Shares for the Layout Solver
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__SheetManager__GetGridShares() {
        VghLantern__SheetManager__EnsureShares();
        return {
            ColumnSharesPct  : VghLantern__SheetManager__ColumnSharesPct.slice(),
            RowSharesPct     : VghLantern__SheetManager__RowSharesPct.slice()
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Sheet Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Paper Millimetres to Laid-Out Pixels
    // ------------------------------------------------------------
    function VghLantern__SheetManager__PxPerMm(layout) {
        var value  =  layout ? layout.ScreenPixelsPerMm : null;
        // Layout__Solve already enforces this via ConfigLoader.RequireNumber and logs
        // loudly if the JSON key is missing - only guarding here against divide-by-zero.
        return (typeof value === 'number' && value > 0) ? value : 0.01;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Chrome Overlay Markup for a Layout
    // ------------------------------------------------------------
    // The overlay is the whole of the sheet that is not a view. Its viewBox is the
    // paper in millimetres, so it carries the solved coordinates unchanged.
    function VghLantern__SheetManager__BuildChromeMarkup(layout, state, logoAsset) {
        var SheetChrome  =  window.VghLantern__DrawingEditor__SheetChrome;
        if (!SheetChrome) return '';

        var primitives  =  SheetChrome.VghLantern__DrawingEditor__SheetChrome__BuildForSheet(
            layout, state.Project, state.Lantern, logoAsset
        );

        return SheetChrome.VghLantern__DrawingEditor__SheetChrome__ToSvgMarkup(
            primitives, layout.Page.WidthMm, layout.Page.HeightMm, CSS_SHEET_CHROME
        );
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Overlay Markup for the Gutter Split Handles
    // ------------------------------------------------------------
    function VghLantern__SheetManager__BuildResizeHandles(layout) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var gridCfg  =  VghLantern__SheetManager__GridConfig();
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(
                gridCfg, 'ResizeHandlesEnabled', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__ViewGrid')) {
            return '';
        }

        var html  =  '';
        var i;

        for (i = 0; i < layout.Grid.ColumnTracks.length - 1; i++) {
            html  +=  '<div class="' + CSS_RESIZE_HANDLE + ' ' + CSS_RESIZE_COL + '" ' +
                      ATTR_SHEET_RESIZE + '="col" ' + ATTR_SPLIT_INDEX + '="' + i + '" ' +
                      'title="Drag to resize viewports"></div>';
        }
        for (i = 0; i < layout.Grid.RowTracks.length - 1; i++) {
            html  +=  '<div class="' + CSS_RESIZE_HANDLE + ' ' + CSS_RESIZE_ROW + '" ' +
                      ATTR_SHEET_RESIZE + '="row" ' + ATTR_SPLIT_INDEX + '="' + i + '" ' +
                      'title="Drag to resize viewports"></div>';
        }

        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Sheet Structure at Paper Size
    // ------------------------------------------------------------
    // The scaler wraps the sheet and carries the screen zoom transform, so the sheet
    // itself keeps its true paper-pixel dimensions.
    function VghLantern__SheetManager__BuildSheetStructure(layout, state, logoAsset) {
        var ViewportFrame  =  window.VghLantern__DrawingEditor__ViewportFrame;
        var pxPerMm        =  VghLantern__SheetManager__PxPerMm(layout);

        var sheetStyle  =  'width:'  + (layout.Page.WidthMm  * pxPerMm) + 'px;' +
                           'height:' + (layout.Page.HeightMm * pxPerMm) + 'px;';

        var framesHtml  =  '';
        var i;
        if (ViewportFrame) {
            for (i = 0; i < layout.Slots.length; i++) {
                framesHtml  +=  ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__BuildMarkup(layout.Slots[i], pxPerMm);
            }
        }

        return '<div class="' + CSS_SHEET_SCALER + '">' +
               '<div class="' + CSS_SHEET + '" style="' + sheetStyle + '" ' +
               'data-vgh-sheet-size="' + layout.Page.SizeKey + '" ' +
               'data-vgh-sheet-orientation="' + layout.Page.Orientation + '">' +
               framesHtml +
               VghLantern__SheetManager__BuildChromeMarkup(layout, state, logoAsset) +
               VghLantern__SheetManager__BuildResizeHandles(layout) +
               '</div></div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Re-Position Frames, Chrome and Handles From a Layout
    // ------------------------------------------------------------
    // Used by the live gutter drag. Only boxes and the overlay move; no view is
    // re-rendered and no surface is remounted, so a drag stays smooth.
    function VghLantern__SheetManager__ApplyLayoutToDom(sheetElement, layout, state, logoAsset) {
        if (!sheetElement || !layout) return;

        var pxPerMm  =  VghLantern__SheetManager__PxPerMm(layout);
        var i, placement, frameEl, bodyEl;

        for (i = 0; i < layout.Slots.length; i++) {
            placement  =  layout.Slots[i];
            frameEl    =  sheetElement.querySelector('[' + ATTR_SLOT_KEY + '="' + placement.Slot.Key + '"]');
            if (!frameEl) continue;

            frameEl.style.left    =  (placement.Frame.X * pxPerMm) + 'px';
            frameEl.style.top     =  (placement.Frame.Y * pxPerMm) + 'px';
            frameEl.style.width   =  (placement.Frame.WidthMm  * pxPerMm) + 'px';
            frameEl.style.height  =  (placement.Frame.HeightMm * pxPerMm) + 'px';

            bodyEl  =  frameEl.querySelector('.VghLantern__Sheet__FrameBody');
            if (!bodyEl) continue;

            bodyEl.style.left    =  ((placement.Body.X - placement.Frame.X) * pxPerMm) + 'px';
            bodyEl.style.top     =  ((placement.Body.Y - placement.Frame.Y) * pxPerMm) + 'px';
            bodyEl.style.width   =  (placement.Body.WidthMm  * pxPerMm) + 'px';
            bodyEl.style.height  =  (placement.Body.HeightMm * pxPerMm) + 'px';
        }

        var chromeEl  =  sheetElement.querySelector('.' + CSS_SHEET_CHROME);
        if (chromeEl) {
            chromeEl.outerHTML  =  VghLantern__SheetManager__BuildChromeMarkup(layout, state, logoAsset);
        }

        VghLantern__SheetManager__PositionResizeHandles(sheetElement, layout);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Position the Gutter Handles Over the Solved Tracks
    // ------------------------------------------------------------
    // A handle sits on the centre line of the gutter it drags, taken straight from
    // the solved track offsets rather than measured back off the DOM.
    function VghLantern__SheetManager__PositionResizeHandles(sheetElement, layout) {
        if (!sheetElement || !layout) return;

        var pxPerMm   =  VghLantern__SheetManager__PxPerMm(layout);
        var grid      =  layout.Grid;
        var gutterPx  =  grid.GutterMm * pxPerMm;
        var handles   =  sheetElement.querySelectorAll('[' + ATTR_SHEET_RESIZE + ']');
        var i, handleEl, isColumn, splitIndex, tracks, centreMm;

        for (i = 0; i < handles.length; i++) {
            handleEl    =  handles[i];
            isColumn    =  handleEl.getAttribute(ATTR_SHEET_RESIZE) === 'col';
            splitIndex  =  parseInt(handleEl.getAttribute(ATTR_SPLIT_INDEX), 10) || 0;
            tracks      =  isColumn ? grid.ColumnTracks : grid.RowTracks;
            if (!tracks || splitIndex + 1 >= tracks.length) continue;

            centreMm  =  tracks[splitIndex].OffsetMm + tracks[splitIndex].SizeMm + (grid.GutterMm / 2);

            if (isColumn) {
                handleEl.style.left    =  ((grid.X + centreMm) * pxPerMm) + 'px';
                handleEl.style.top     =  (grid.Y * pxPerMm) + 'px';
                handleEl.style.height  =  (grid.HeightMm * pxPerMm) + 'px';
                handleEl.style.width   =  Math.max(10, gutterPx + 6) + 'px';
            } else {
                handleEl.style.top     =  ((grid.Y + centreMm) * pxPerMm) + 'px';
                handleEl.style.left    =  (grid.X * pxPerMm) + 'px';
                handleEl.style.width   =  (grid.WidthMm * pxPerMm) + 'px';
                handleEl.style.height  =  Math.max(10, gutterPx + 6) + 'px';
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Apply Auto Fit to the Scale Before Any View Is Drawn
    // ------------------------------------------------------------
    function VghLantern__SheetManager__ApplyAutoFit(layout, geometry) {
        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        if (!ScaleManager || !ViewPlacement) return;
        if (!ScaleManager.VghLantern__DrawingEditor__ScaleManager__IsAutoFitEnabled()) return;

        var requests  =  ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__BuildFitRequests(layout, geometry);
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
            var state     =  VghLantern__SheetManager__ReadState();
            var hasModel  =  !!(state.Lantern && state.Geometry.Skeleton);
            var layout    =  VghLantern__DrawingEditor__SheetManager__SolveLayout(state.Project);

            // Scale first: the toolbar select, the frame captions and the titleblock
            // all quote it, so it must be settled before any of them render. A scale
            // the user picked by hand is never overridden by the auto fit.
            if (hasModel && layout && !VghLantern__SheetManager__IsScaleManual) {
                VghLantern__SheetManager__ApplyAutoFit(layout, state.Geometry);
            }

            VghLantern__SheetManager__RenderToolbar();
            VghLantern__SheetManager__BindToolbar();

            if (!hasModel) {
                VghLantern__SheetManager__ActiveLayout  =  null;
                host.innerHTML  =  '<p class="' + CSS_EMPTY_STATE + '">' + MESSAGE_NO_LANTERN + '</p>';
                return false;
            }

            if (!layout) {
                VghLantern__SheetManager__ActiveLayout  =  null;
                host.innerHTML  =  '<p class="' + CSS_EMPTY_STATE + '">Sheet configuration unavailable.</p>';
                return false;
            }

            // Awaited so the titleblock logo is placed in the first paint rather than
            // appearing a frame later, and so the same asset is already cached when
            // the export builds its own copy of this chrome.
            var SheetChrome  =  window.VghLantern__DrawingEditor__SheetChrome;
            var logoAsset    =  SheetChrome
                ? await SheetChrome.VghLantern__DrawingEditor__SheetChrome__LoadLogo()
                : null;

            VghLantern__SheetManager__ActiveLayout  =  layout;

            host.innerHTML  =  VghLantern__SheetManager__BuildSheetStructure(layout, state, logoAsset);
            VghLantern__SheetManager__ApplySheetZoom();                        // <-- Rebuilt DOM starts unscaled; re-apply the session zoom

            var sheetEl  =  host.querySelector('.' + CSS_SHEET);
            VghLantern__SheetManager__PositionResizeHandles(sheetEl, layout);

            var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
            if (ViewPlacement) {
                await ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__PlaceAll(
                    sheetEl, state.Geometry, state.Lantern, layout
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

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Gutter Resize
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Rebalance One Split Pair From a Pointer Position
    // ------------------------------------------------------------
    // Works in solved paper millimetres throughout: the pointer is converted into
    // the grid rectangle, so the share the user drags to is the share the export
    // will use.
    function VghLantern__SheetManager__ApplyResizeDrag(clientX, clientY) {
        var drag  =  VghLantern__SheetManager__ActiveResize;
        if (!drag || !drag.SheetEl || !VghLantern__SheetManager__ActiveLayout) return;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var layout    =  VghLantern__SheetManager__ActiveLayout;
        var gridCfg   =  VghLantern__SheetManager__GridConfig();
        var GRID_LABEL =  'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__ViewGrid';
        var minPct    =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'ShareMinPct', GRID_LABEL);
        var maxPct    =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'ShareMaxPct', GRID_LABEL);

        var rect       =  drag.SheetEl.getBoundingClientRect();
        var zoom       =  VghLantern__SheetManager__ZoomFactor || 1;
        var pxPerMm    =  VghLantern__SheetManager__PxPerMm(layout) * zoom;
        var grid       =  layout.Grid;

        var shares     =  drag.IsColumn ? VghLantern__SheetManager__ColumnSharesPct : VghLantern__SheetManager__RowSharesPct;
        var splitIndex =  drag.SplitIndex;
        var pairTotal  =  shares[splitIndex] + shares[splitIndex + 1];
        var pairMin    =  Math.max(minPct, pairTotal - maxPct);
        var pairMax    =  Math.min(maxPct, pairTotal - minPct);

        var usableMm   =  drag.IsColumn
            ? (grid.WidthMm  - (grid.GutterMm * (shares.length - 1)))
            : (grid.HeightMm - (grid.GutterMm * (shares.length - 1)));

        var prefixMm  =  0;
        var t;
        for (t = 0; t < splitIndex; t++) {
            prefixMm  +=  (usableMm * (shares[t] / 100)) + grid.GutterMm;
        }

        var pointerMm  =  drag.IsColumn
            ? (((clientX - rect.left) / pxPerMm) - grid.X)
            : (((clientY - rect.top)  / pxPerMm) - grid.Y);

        var pairMm    =  usableMm * (pairTotal / 100);
        var firstPct  =  VghLantern__SheetManager__Clamp(
            ((pointerMm - prefixMm) / pairMm) * pairTotal, pairMin, pairMax
        );

        shares[splitIndex]      =  firstPct;
        shares[splitIndex + 1]  =  pairTotal - firstPct;

        var state       =  VghLantern__SheetManager__ReadState();
        var SheetChrome =  window.VghLantern__DrawingEditor__SheetChrome;
        var reSolved    =  VghLantern__DrawingEditor__SheetManager__SolveLayout(state.Project);
        if (!reSolved) return;

        VghLantern__SheetManager__ActiveLayout  =  reSolved;
        VghLantern__SheetManager__ApplyLayoutToDom(
            drag.SheetEl, reSolved, state,
            SheetChrome ? SheetChrome.VghLantern__DrawingEditor__SheetChrome__CachedLogo() : null
        );
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

        VghLantern__SheetManager__RecordLayoutState('drawingLayout:gridShares');

        // Re-apply true scale viewBoxes to the new body sizes. Auto-fit is skipped so
        // the quoted 1:N stays exactly where the user left it.
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        var state          =  VghLantern__SheetManager__ReadState();
        if (!drag.SheetEl || !ViewPlacement || !VghLantern__SheetManager__ActiveLayout) return;
        if (!state.Lantern || !state.Geometry.Skeleton) return;

        await ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__PlaceAll(
            drag.SheetEl, state.Geometry, state.Lantern, VghLantern__SheetManager__ActiveLayout
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

            var sheetEl  =  handleEl.closest('.' + CSS_SHEET);
            if (!sheetEl) return;

            VghLantern__SheetManager__ActiveResize  =  {
                HandleEl   : handleEl,
                SheetEl    : sheetEl,
                IsColumn   : handleEl.getAttribute(ATTR_SHEET_RESIZE) === 'col',
                SplitIndex : parseInt(handleEl.getAttribute(ATTR_SPLIT_INDEX), 10) || 0
            };

            handleEl.classList.add(CSS_RESIZE_DRAG);
            document.body.classList.add(CSS_BODY_RESIZING);
            if (!VghLantern__SheetManager__ActiveResize.IsColumn) document.body.classList.add(CSS_BODY_RESIZE_ROW);

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

            ev.preventDefault();
            ev.stopPropagation();
        });

        VghLantern__SheetManager__IsResizeBound  =  true;
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
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__SheetManager__SheetConfig(), 'DefaultSheetSize', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__Sheet');
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Active Sheet Orientation
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__SheetManager__Orientation() {
        if (VghLantern__SheetManager__Orientation) return VghLantern__SheetManager__Orientation;
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__SheetManager__SheetConfig(), 'DefaultOrientation', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__Sheet');
    }
    // ------------------------------------------------------------


    // FUNCTION | Describe the Composed Sheet for the Document Preview Mode
    // ------------------------------------------------------------
    // Preview and PDF export consume this rather than reaching into the sheet DOM,
    // so the two modes stay decoupled and the sheet can be rebuilt freely. The solved
    // layout travels with it, because that is what makes an export match the screen.
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
            Layout           : VghLantern__SheetManager__ActiveLayout
                               || VghLantern__DrawingEditor__SheetManager__SolveLayout(state.Project),
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
// REGION | Drawing Layout Persistence
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get or Create the Layout Block on the Current Project
    // ------------------------------------------------------------
    function VghLantern__SheetManager__LayoutBlock(createIfMissing) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;

        var project  =  StateManager.VghLantern__StateManager__GetCurrentProject();
        if (!project) return null;

        var block  =  project[LAYOUT_BLOCK];
        if (!block || typeof block !== 'object' || Array.isArray(block)) {
            if (!createIfMissing) return null;
            block  =  {};
            project[LAYOUT_BLOCK]  =  block;
        }

        return block;
    }
    // ------------------------------------------------------------


    // FUNCTION | Write the Current Sheet Setup Onto the Project File
    // ------------------------------------------------------------
    // Marking the project dirty is what schedules the write: AppCore already
    // debounces dirty state into a single disk save, so a gutter drag or a run of
    // zoom steps costs one file write rather than one per event.
    function VghLantern__SheetManager__RecordLayoutState(reason) {
        if (VghLantern__SheetManager__IsRestoring) return;

        var block  =  VghLantern__SheetManager__LayoutBlock(true);
        if (!block) return;

        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;

        VghLantern__SheetManager__EnsureShares();

        block[LAYOUT_SHEET_SIZE]    =  VghLantern__DrawingEditor__SheetManager__SheetSizeKey();
        block[LAYOUT_ORIENTATION]   =  VghLantern__DrawingEditor__SheetManager__Orientation();
        block[LAYOUT_SCALE]         =  ScaleManager
            ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__GetDenominator()
            : null;
        block[LAYOUT_SCALE_MANUAL]  =  VghLantern__SheetManager__IsScaleManual;
        block[LAYOUT_COLUMN_SHARES] =  VghLantern__SheetManager__ColumnSharesPct.slice();
        block[LAYOUT_ROW_SHARES]    =  VghLantern__SheetManager__RowSharesPct.slice();
        block[LAYOUT_ZOOM]          =  VghLantern__SheetManager__ZoomFactor;
        block[LAYOUT_CAMERAS]       =  ViewPlacement
            ? ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__CollectCameraStates()
            : (block[LAYOUT_CAMERAS] || {});

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (StateManager) StateManager.VghLantern__StateManager__MarkDirty();

        if (reason) console.log('[VghLantern__DrawingEditor__SheetManager] Sheet setup recorded: ' + reason);
    }
    // ------------------------------------------------------------


    // FUNCTION | Restore the Sheet Setup From a Newly Loaded Project
    // ------------------------------------------------------------
    // A project with no recorded layout falls back to the config defaults, which is
    // exactly what a project created before this block existed should do.
    function VghLantern__SheetManager__RestoreLayoutState() {
        var ConfigLoader   =  window.VghLantern__AppCore__ConfigLoader;
        var GRID_LABEL     =  'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__ViewGrid';
        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        var gridCfg        =  VghLantern__SheetManager__GridConfig();
        var columns        =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'Columns', GRID_LABEL);
        var rows           =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'Rows',    GRID_LABEL);
        var block          =  VghLantern__SheetManager__LayoutBlock(false) || {};

        VghLantern__SheetManager__IsRestoring  =  true;

        try {
            var sizes  =  VghLantern__SheetManager__SheetConfig().SheetSizes || {};
            VghLantern__SheetManager__SheetSizeKey  =  (block[LAYOUT_SHEET_SIZE] && sizes[block[LAYOUT_SHEET_SIZE]])
                ? block[LAYOUT_SHEET_SIZE]
                : null;

            VghLantern__SheetManager__Orientation   =  (block[LAYOUT_ORIENTATION] === 'portrait' || block[LAYOUT_ORIENTATION] === 'landscape')
                ? block[LAYOUT_ORIENTATION]
                : null;

            VghLantern__SheetManager__IsScaleManual =  block[LAYOUT_SCALE_MANUAL] === true;
            if (ScaleManager && typeof block[LAYOUT_SCALE] === 'number') {
                ScaleManager.VghLantern__DrawingEditor__ScaleManager__SetDenominator(block[LAYOUT_SCALE]);
            }

            VghLantern__SheetManager__ColumnSharesPct  =  Array.isArray(block[LAYOUT_COLUMN_SHARES])
                ? VghLantern__SheetManager__NormaliseShares(block[LAYOUT_COLUMN_SHARES], columns)
                : null;
            VghLantern__SheetManager__RowSharesPct     =  Array.isArray(block[LAYOUT_ROW_SHARES])
                ? VghLantern__SheetManager__NormaliseShares(block[LAYOUT_ROW_SHARES], rows)
                : null;

            VghLantern__SheetManager__ZoomFactor  =  (typeof block[LAYOUT_ZOOM] === 'number' && block[LAYOUT_ZOOM] > 0)
                ? VghLantern__SheetManager__Clamp(block[LAYOUT_ZOOM], ZOOM_MIN, ZOOM_MAX)
                : 1;

            if (ViewPlacement) {
                ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__RestoreCameraStates(block[LAYOUT_CAMERAS]);
            }

            VghLantern__SheetManager__ActiveLayout  =  null;
        } finally {
            VghLantern__SheetManager__IsRestoring  =  false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Record a Sheet Camera Change From the Placement Layer
    // ------------------------------------------------------------
    // ViewPlacement owns the camera; it calls back here when a live camera edit
    // ends, so the chosen viewpoint is persisted with the rest of the sheet setup.
    function VghLantern__DrawingEditor__SheetManager__NoteCameraChanged() {
        VghLantern__SheetManager__RecordLayoutState('drawingLayout:viewCamera');
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
                VghLantern__SheetManager__RecordLayoutState('drawingLayout:sheetSize');
                void VghLantern__DrawingEditor__SheetManager__Render();
            });
        }

        if (orientSelect) {
            orientSelect.addEventListener('change', function(e) {
                VghLantern__SheetManager__Orientation  =  e.currentTarget.value;
                VghLantern__SheetManager__RecordLayoutState('drawingLayout:orientation');
                void VghLantern__DrawingEditor__SheetManager__Render();
            });
        }

        if (scaleSelect) {
            scaleSelect.addEventListener('change', function(e) {
                var ScaleManager  =  window.VghLantern__DrawingEditor__ScaleManager;
                if (!ScaleManager) return;
                ScaleManager.VghLantern__DrawingEditor__ScaleManager__SetDenominator(e.currentTarget.value);
                VghLantern__SheetManager__IsScaleManual  =  true;             // <-- The choice sticks; auto fit no longer overrides it
                VghLantern__SheetManager__RecordLayoutState('drawingLayout:scale');
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

        VghLantern__SheetManager__RecordLayoutState(null);                     // <-- Silent; a wheel produces a run of these
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
    // Skipped entirely while the mode is off screen. A sheet rebuild costs three view
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

        // The sheet setup is restored before the redraw, so a project opens on the
        // paper, scale and viewpoint it was last saved with rather than on the
        // defaults followed by a visible correction.
        StateManager.VghLantern__StateManager__On('projectChanged', function() {
            VghLantern__SheetManager__RestoreLayoutState();
            VghLantern__SheetManager__QueueRedraw();
        });

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
        VghLantern__DrawingEditor__SheetManager__Init             : VghLantern__DrawingEditor__SheetManager__Init,
        VghLantern__DrawingEditor__SheetManager__Render           : VghLantern__DrawingEditor__SheetManager__Render,
        VghLantern__DrawingEditor__SheetManager__DescribeSheet    : VghLantern__DrawingEditor__SheetManager__DescribeSheet,
        VghLantern__DrawingEditor__SheetManager__SolveLayout      : VghLantern__DrawingEditor__SheetManager__SolveLayout,
        VghLantern__DrawingEditor__SheetManager__GetGridShares    : VghLantern__DrawingEditor__SheetManager__GetGridShares,
        VghLantern__DrawingEditor__SheetManager__SheetSizeKey     : VghLantern__DrawingEditor__SheetManager__SheetSizeKey,
        VghLantern__DrawingEditor__SheetManager__Orientation      : VghLantern__DrawingEditor__SheetManager__Orientation,
        VghLantern__DrawingEditor__SheetManager__NoteCameraChanged : VghLantern__DrawingEditor__SheetManager__NoteCameraChanged,
        VghLantern__DrawingEditor__SheetManager__OnModeExit       : VghLantern__DrawingEditor__SheetManager__OnModeExit
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetManager  =  VghLantern__DrawingEditor__SheetManager;
