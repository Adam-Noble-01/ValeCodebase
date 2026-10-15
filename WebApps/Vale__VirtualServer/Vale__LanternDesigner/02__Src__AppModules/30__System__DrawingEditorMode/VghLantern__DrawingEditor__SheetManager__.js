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
     and persists them onto each lantern's DrawingLayout block so a multi-lantern
     project keeps an independent sheet per lantern through Flask autosave.
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

    // The sheet, its frames and its handles are built by SheetSurface, which owns
    // their class names and data attributes. Only the classes this module applies
    // itself are named here.
    const CSS_SHEET_SCALER  =  'VghLantern__Sheet__Scaler';
    const CSS_EMPTY_STATE   =  'VghLantern__DrawingEditor__EmptyState';

    const CSS_RESIZE_DRAG   =  'VghLantern__Sheet__ResizeHandle--dragging';
    const CSS_BODY_RESIZING =  'VghLantern__Sheet__IsResizing';
    const CSS_BODY_RESIZE_ROW =  'VghLantern__Sheet__IsResizing--row';
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


    // MODULE CONSTANTS | Project File Layout Block Keys
    // ------------------------------------------------------------
    // Sheet setup is stored on each lantern so Kitchen and Dining Room can keep
    // independent paper, scale, grid and camera state. The project-level
    // DrawingLayout block remains a legacy fallback seed for older files.
    const LAYOUT_LANTERN_BLOCK     =  'Lantern__DrawingLayout__Config';
    const LAYOUT_SHEET_SIZE        =  'Lantern__DrawingLayout__Config__SheetSizeKey';
    const LAYOUT_ORIENTATION       =  'Lantern__DrawingLayout__Config__Orientation';
    const LAYOUT_SCALE             =  'Lantern__DrawingLayout__Config__ScaleDenominator';
    const LAYOUT_SCALE_MANUAL      =  'Lantern__DrawingLayout__Config__ScaleIsManual';
    const LAYOUT_PAPER_MANUAL      =  'Lantern__DrawingLayout__Config__PaperIsManual';
    const LAYOUT_COLUMN_SHARES     =  'Lantern__DrawingLayout__Config__ColumnSharesPct';
    const LAYOUT_ROW_SHARES        =  'Lantern__DrawingLayout__Config__RowSharesPct';
    const LAYOUT_ZOOM              =  'Lantern__DrawingLayout__Config__SheetZoomFactor';
    const LAYOUT_CAMERAS           =  'Lantern__DrawingLayout__Config__ViewCameraStates';

    const LAYOUT_PROJECT_BLOCK          =  'VghLantern__ProjectFile__DrawingLayout';
    const LAYOUT_PROJECT_SHEET_SIZE     =  'VghLantern__ProjectFile__DrawingLayout__SheetSizeKey';
    const LAYOUT_PROJECT_ORIENTATION    =  'VghLantern__ProjectFile__DrawingLayout__Orientation';
    const LAYOUT_PROJECT_SCALE          =  'VghLantern__ProjectFile__DrawingLayout__ScaleDenominator';
    const LAYOUT_PROJECT_SCALE_MANUAL   =  'VghLantern__ProjectFile__DrawingLayout__ScaleIsManual';
    const LAYOUT_PROJECT_PAPER_MANUAL   =  'VghLantern__ProjectFile__DrawingLayout__PaperIsManual';
    const LAYOUT_PROJECT_COLUMN_SHARES  =  'VghLantern__ProjectFile__DrawingLayout__ColumnSharesPct';
    const LAYOUT_PROJECT_ROW_SHARES     =  'VghLantern__ProjectFile__DrawingLayout__RowSharesPct';
    const LAYOUT_PROJECT_ZOOM           =  'VghLantern__ProjectFile__DrawingLayout__SheetZoomFactor';
    const LAYOUT_PROJECT_CAMERAS        =  'VghLantern__ProjectFile__DrawingLayout__ViewCameraStates';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Sheet Selection and Lifecycle State
    // ------------------------------------------------------------
    let VghLantern__SheetManager__SheetSizeKey    =  null;                    // <-- Null means "use the config default"
    let VghLantern__SheetManager__Orientation     =  null;
    let VghLantern__SheetManager__IsScaleManual   =  false;                   // <-- User picked a scale; auto fit stands down until reset
    let VghLantern__SheetManager__IsPaperManual   =  false;                   // <-- User picked a sheet size or orientation; the ladder leaves the paper alone
    let VghLantern__SheetManager__IsSubscribed    =  false;                   // <-- Guards duplicate StateManager listeners
    let VghLantern__SheetManager__RedrawTimerId   =  null;
    let VghLantern__SheetManager__IsRendering     =  false;                   // <-- Prevents overlapping async sheet builds
    let VghLantern__SheetManager__IsRerunQueued   =  false;                   // <-- A render request arrived while one was in flight
    let VghLantern__SheetManager__LayoutLanternIndex  =  -1;                 // <-- Which lantern the session sheet setup currently belongs to
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
        if (!StateManager) return { Project: null, Lantern: null, LanternIndex: 0, Geometry: null };

        var appState  =  StateManager.VghLantern__StateManager__GetState() || {};

        return {
            Project      : StateManager.VghLantern__StateManager__GetCurrentProject(),
            Lantern      : StateManager.VghLantern__StateManager__GetCurrentLantern(),
            LanternIndex : (typeof appState.currentLanternIndex === 'number') ? appState.currentLanternIndex : 0,
            Geometry     : {
                Skeleton : StateManager.VghLantern__StateManager__GetSolvedSkeleton(),
                BarSet   : StateManager.VghLantern__StateManager__GetSolvedBarSet()
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Solve the Paper Layout of the Current Sheet
    // ------------------------------------------------------------
    // The one place the sheet geometry is produced. The screen build, the gutter
    // drag, the view placement and the PDF export all consume this same shape.
    //
    // The project is no longer an input. It used to be, solely to count the notes the
    // sheet printed; the notes block has been replaced by the terms callout, which is
    // the same size on every sheet, so the layout is now a pure function of the paper
    // and the grid shares.
    function VghLantern__DrawingEditor__SheetManager__SolveLayout() {
        return VghLantern__SheetManager__SolveLayoutFor(
            VghLantern__DrawingEditor__SheetManager__SheetSizeKey(),
            VghLantern__DrawingEditor__SheetManager__Orientation()
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Solve the Paper Layout of an Arbitrary Sheet Size
    // ------------------------------------------------------------
    // The same solve as above against a paper the sheet has not adopted, which is how
    // the auto layout ladder asks "would the views fit on A4?" without the editor
    // flickering through every rung it rejects. Returns null for a size key that is
    // not in the sheet size table, so a mistyped ladder rung is skipped rather than
    // silently drawn on the default paper.
    function VghLantern__SheetManager__SolveLayoutFor(sheetSizeKey, orientation) {
        var SheetPdfLayout  =  window.VghLantern__DrawingEditor__SheetPdfLayout;
        if (!SheetPdfLayout) return null;

        var sheetSize  =  SheetPdfLayout.VghLantern__DrawingEditor__SheetPdfLayout__SheetSizeMm(sheetSizeKey, orientation);
        if (!sheetSize) return null;

        VghLantern__SheetManager__EnsureShares();                             // <-- Solver reads the shares back through GetGridShares

        return SheetPdfLayout.VghLantern__DrawingEditor__SheetPdfLayout__Solve(sheetSize);
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


    // HELPER FUNCTION | Escape Text for Safe Attribute and Content Use
    // ------------------------------------------------------------
    function VghLantern__SheetManager__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve a Lantern's Display Title
    // ------------------------------------------------------------
    function VghLantern__SheetManager__LanternLabel(lantern, index) {
        var identity  =  lantern ? lantern['Lantern__Identity__Config'] : null;
        if (identity && identity['Lantern__Identity__Config__Title']) {
            return identity['Lantern__Identity__Config__Title'];
        }
        return 'Lantern ' + (index + 1);                                      // <-- Same fallback the editor tab strip uses
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Lantern Selector Group
    // ------------------------------------------------------------
    // Only rendered when the project holds more than one lantern. Sits between
    // Scale and Download PDF - the gap the sheet toolbar leaves for cycling
    // Kitchen / Dining Room drawings without leaving the mode.
    function VghLantern__SheetManager__BuildLanternGroup() {
        var state     =  VghLantern__SheetManager__ReadState();
        var lanterns  =  (state.Project && Array.isArray(state.Project['VghLantern__ProjectFile__Lanterns']))
            ? state.Project['VghLantern__ProjectFile__Lanterns']
            : [];
        if (lanterns.length < 2) return '';

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var appState      =  StateManager ? StateManager.VghLantern__StateManager__GetState() : {};
        var activeIndex   =  typeof appState.currentLanternIndex === 'number' ? appState.currentLanternIndex : 0;

        var values  =  [];
        var labels  =  [];
        var i;
        for (i = 0; i < lanterns.length; i++) {
            values.push(i);
            labels.push(VghLantern__SheetManager__LanternLabel(lanterns[i], i));
        }

        return '<div class="' + CSS_TOOL_GROUP + '">' +
               '<label class="' + CSS_TOOL_LABEL + '" for="VghLantern__DrawingEditor__LanternSelect">Lantern</label>' +
               '<select class="' + CSS_TOOL_SELECT + '" id="VghLantern__DrawingEditor__LanternSelect">' +
               VghLantern__SheetManager__BuildOptions(values, labels.map(VghLantern__SheetManager__Escape), activeIndex) +
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
        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(toolbarCfg, 'ShowLanternSelector',   TOOLBAR_LABEL)) html  +=  VghLantern__SheetManager__BuildLanternGroup();

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

    // HELPER FUNCTION | Find the Built Sheet Element Inside a Host
    // ------------------------------------------------------------
    // The sheet's class name belongs to SheetSurface, which builds it. Reading it
    // back from there rather than repeating the literal is what stops a rename in
    // one file quietly breaking the query in the other.
    function VghLantern__SheetManager__FindSheet(hostElement) {
        var SheetSurface  =  window.VghLantern__DrawingEditor__SheetSurface;
        if (!hostElement || !SheetSurface) return null;
        return hostElement.querySelector('.' + SheetSurface.VghLantern__DrawingEditor__SheetSurface__SheetClass);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Wrap a Built Sheet in the Zoom Scaler
    // ------------------------------------------------------------
    // The scaler wraps the sheet and carries the screen zoom transform, so the sheet
    // itself keeps its true paper-pixel dimensions. SheetSurface builds the sheet;
    // this module only decides that it is interactive and that it zooms.
    function VghLantern__SheetManager__BuildSheetStructure(layout, state, logoAsset) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var SheetSurface  =  window.VghLantern__DrawingEditor__SheetSurface;
        if (!SheetSurface) return '';

        return '<div class="' + CSS_SHEET_SCALER + '">' +
               SheetSurface.VghLantern__DrawingEditor__SheetSurface__BuildHtml(layout, {
                   Project           : state.Project,
                   Lantern           : state.Lantern,
                   LanternIndex      : state.LanternIndex,                      // <-- The titleblock QR code names the lantern it is printed on
                   LogoAsset         : logoAsset,
                   SlotContentHtml   : null,                                   // <-- Frames stay empty; ViewPlacement mounts live surfaces into them
                   ShowResizeHandles : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(
                       VghLantern__SheetManager__GridConfig(), 'ResizeHandlesEnabled',
                       'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__ViewGrid')
               }) +
               '</div>';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Solve One Candidate Paper and Its Fit Requests
    // ------------------------------------------------------------
    // Memoised across a ladder walk because the ladder revisits the same two papers at
    // different scales, and building the requests means measuring the skeleton once
    // per view. The requests depend on the paper only - the scale is what is tested
    // against them - so one entry per paper serves every rung that names it.
    function VghLantern__SheetManager__AutoLayoutCandidate(cache, sheetSizeKey, orientation, geometry) {
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        var cacheKey       =  String(sheetSizeKey) + '|' + String(orientation);

        if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) return cache[cacheKey];

        var layout  =  VghLantern__SheetManager__SolveLayoutFor(sheetSizeKey, orientation);

        cache[cacheKey]  =  layout
            ? {
                Layout   : layout,
                Requests : ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__BuildFitRequests(layout, geometry)
            }
            : null;

        return cache[cacheKey];
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Build the Rungs This Walk Is Allowed to Consider
    // ------------------------------------------------------------
    // A hand-picked scale narrows the ladder to its paper steps: the rungs are walked
    // in the same order, but every one of them is tested at the scale the user pinned
    // rather than the scale it carries, and repeated papers collapse. That way pinning
    // 1:20 still moves a big lantern from A4 up to A3 rather than clipping it.
    function VghLantern__SheetManager__AutoLayoutRungs(pinnedDenominator) {
        var ScaleManager  =  window.VghLantern__DrawingEditor__ScaleManager;
        var ladder        =  ScaleManager.VghLantern__DrawingEditor__ScaleManager__ListAutoFitLadder();

        if (!pinnedDenominator) return ladder;

        var rungs  =  [];
        var seen   =  {};
        var i, rung, paperKey;

        for (i = 0; i < ladder.length; i++) {
            rung      =  ladder[i];
            paperKey  =  String(rung.SheetSizeKey) + '|' + String(rung.Orientation);
            if (seen[paperKey]) continue;

            seen[paperKey]  =  true;
            rungs.push({
                SheetSizeKey     : rung.SheetSizeKey,
                Orientation      : rung.Orientation,
                ScaleDenominator : pinnedDenominator
            });
        }

        return rungs;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Settle the Paper and the Scale Before Any View Is Drawn
    // ------------------------------------------------------------
    // Walks the configured ladder and adopts the first rung on which every
    // orthographic view fits its frame, which is how a sheet lands on A4 at 1:50 and
    // only grows from there. Returns the solved layout of the rung it settled on so
    // the caller does not solve the same paper twice, or null when it changed nothing.
    //
    // Falling off the end of the ladder adopts the last rung rather than giving up: a
    // lantern too big for the coarsest paper and scale Vale issues is drawn small, not
    // clipped, and the drawing itself is then the report that something is unusual.
    //
    // Both pins on means the user has described the sheet completely and this stands
    // down entirely.
    function VghLantern__SheetManager__ApplyAutoLayout(geometry) {
        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        if (!ScaleManager || !ViewPlacement) return null;
        if (!ScaleManager.VghLantern__DrawingEditor__ScaleManager__IsAutoFitEnabled()) return null;
        if (VghLantern__SheetManager__IsScaleManual && VghLantern__SheetManager__IsPaperManual) return null;

        // Paper pinned by hand: the ladder may not move it, so the scale is the only
        // thing left to fit and this is the pre-ladder behaviour unchanged.
        if (VghLantern__SheetManager__IsPaperManual) {
            var pinnedLayout  =  VghLantern__DrawingEditor__SheetManager__SolveLayout();
            if (!pinnedLayout) return null;

            var pinnedRequests  =  ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__BuildFitRequests(pinnedLayout, geometry);
            if (pinnedRequests.length) ScaleManager.VghLantern__DrawingEditor__ScaleManager__FitToRequests(pinnedRequests);
            return pinnedLayout;
        }

        var pinnedDenominator  =  VghLantern__SheetManager__IsScaleManual
            ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__GetDenominator()
            : null;

        var rungs  =  VghLantern__SheetManager__AutoLayoutRungs(pinnedDenominator);
        if (!rungs.length) {                                                   // <-- No ladder configured; fit the scale inside the paper we already have
            var currentLayout  =  VghLantern__DrawingEditor__SheetManager__SolveLayout();
            if (!currentLayout || pinnedDenominator) return currentLayout;

            var currentRequests  =  ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__BuildFitRequests(currentLayout, geometry);
            if (currentRequests.length) ScaleManager.VghLantern__DrawingEditor__ScaleManager__FitToRequests(currentRequests);
            return currentLayout;
        }

        var cache      =  {};
        var lastValid  =  null;
        var i, rung, candidate;

        for (i = 0; i < rungs.length; i++) {
            rung       =  rungs[i];
            candidate  =  VghLantern__SheetManager__AutoLayoutCandidate(cache, rung.SheetSizeKey, rung.Orientation, geometry);
            if (!candidate) continue;                                          // <-- Rung names a paper the sheet size table does not hold

            lastValid  =  { Rung : rung, Candidate : candidate };

            if (ScaleManager.VghLantern__DrawingEditor__ScaleManager__RequestsFitAt(candidate.Requests, rung.ScaleDenominator)) {
                return VghLantern__SheetManager__AdoptAutoLayout(rung, candidate);
            }
        }

        if (!lastValid) return null;                                           // <-- Every rung named an unknown paper; leave the sheet as it is
        return VghLantern__SheetManager__AdoptAutoLayout(lastValid.Rung, lastValid.Candidate);
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Adopt a Ladder Rung as the Sheet Setup
    // ------------------------------------------------------------
    // Written straight onto the session variables rather than through the toolbar
    // path, because this is the sheet arriving at its own answer rather than the user
    // choosing one - neither pin is set and nothing is recorded as an edit.
    function VghLantern__SheetManager__AdoptAutoLayout(rung, candidate) {
        var ScaleManager  =  window.VghLantern__DrawingEditor__ScaleManager;

        // Taken from the solved page rather than from the rung, so the session state is
        // what was actually measured. A rung that leaves the orientation out is solved
        // against the config default, and this is what records that resolution instead
        // of storing the blank and resolving it again on every later read.
        VghLantern__SheetManager__SheetSizeKey  =  candidate.Layout.Page.SizeKey;
        VghLantern__SheetManager__Orientation   =  candidate.Layout.Page.Orientation;

        if (!VghLantern__SheetManager__IsScaleManual) {
            ScaleManager.VghLantern__DrawingEditor__ScaleManager__SetDenominator(rung.ScaleDenominator);
        }

        return candidate.Layout;
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

            // Paper and scale first: the toolbar selects, the frame captions and the
            // titleblock all quote them, so both must be settled before any of them
            // render. The ladder may move the paper as well as the scale, so it runs
            // ahead of the solve rather than against an already-solved sheet - and it
            // hands back the layout of the rung it chose so the paper is solved once.
            // Anything the user pinned by hand is left exactly as they set it.
            var layout  =  hasModel ? VghLantern__SheetManager__ApplyAutoLayout(state.Geometry) : null;
            if (!layout) layout  =  VghLantern__DrawingEditor__SheetManager__SolveLayout();

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

            var SheetSurface  =  window.VghLantern__DrawingEditor__SheetSurface;
            var sheetEl       =  VghLantern__SheetManager__FindSheet(host);
            if (!sheetEl) return false;                                        // <-- SheetSurface unavailable; the empty state above already said so

            SheetSurface.VghLantern__DrawingEditor__SheetSurface__PositionResizeHandles(sheetEl, layout);

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

        var SheetSurface  =  window.VghLantern__DrawingEditor__SheetSurface;
        var rect       =  drag.SheetEl.getBoundingClientRect();
        var zoom       =  VghLantern__SheetManager__ZoomFactor || 1;
        var pxPerMm    =  SheetSurface.VghLantern__DrawingEditor__SheetSurface__PixelsPerMm(layout) * zoom;
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
        var reSolved    =  VghLantern__DrawingEditor__SheetManager__SolveLayout();
        if (!reSolved) return;

        VghLantern__SheetManager__ActiveLayout  =  reSolved;
        SheetSurface.VghLantern__DrawingEditor__SheetSurface__ApplyLayout(
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
            var SheetSurface  =  window.VghLantern__DrawingEditor__SheetSurface;
            if (!SheetSurface) return;

            var resizeAttr  =  SheetSurface.VghLantern__DrawingEditor__SheetSurface__ResizeAttribute;
            var splitAttr   =  SheetSurface.VghLantern__DrawingEditor__SheetSurface__SplitIndexAttribute;

            var handleEl  =  ev.target.closest ? ev.target.closest('[' + resizeAttr + ']') : null;
            if (!handleEl) return;

            var sheetEl  =  handleEl.closest('.' + SheetSurface.VghLantern__DrawingEditor__SheetSurface__SheetClass);
            if (!sheetEl) return;

            VghLantern__SheetManager__ActiveResize  =  {
                HandleEl   : handleEl,
                SheetEl    : sheetEl,
                IsColumn   : handleEl.getAttribute(resizeAttr) === 'col',
                SplitIndex : parseInt(handleEl.getAttribute(splitAttr), 10) || 0
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


    // FUNCTION | Describe the Composed Sheet for Every Consumer Outside This Mode
    // ------------------------------------------------------------
    // Preview and Send and both export routes consume this rather than reaching into
    // the sheet DOM, so the modes stay decoupled and the sheet can be rebuilt freely.
    // The solved layout travels with it, because that is what makes an export and a
    // preview match the screen.
    //
    // The paper size is not repeated as its own field: Layout.Page already carries
    // the size key, the label, the orientation and the millimetres, and a second copy
    // is a second thing that can disagree.
    //
    // Skeleton and LanternIndex travel with the sheet because a descriptor may be held
    // and painted long after the editor has moved on to another lantern. A pack of
    // four drawings paints four descriptors in a row, and every one of them has to
    // frame its views, caption its scale and encode its QR code from what it was
    // composed with rather than from whatever the editor is showing at the time.
    function VghLantern__DrawingEditor__SheetManager__DescribeSheet() {
        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        var state          =  VghLantern__SheetManager__ReadState();

        return {
            Layout           : VghLantern__SheetManager__ActiveLayout
                               || VghLantern__DrawingEditor__SheetManager__SolveLayout(),
            ScaleDenominator : ScaleManager ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__GetDenominator() : null,
            ScaleLabel       : ScaleManager ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__FormatLabel() : '',
            ViewSvgMarkup    : ViewPlacement ? ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__CollectSvgMarkup() : {},
            ViewSnapshots    : ViewPlacement ? ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__CollectSnapshots() : {},
            IsComposed       : ViewPlacement ? ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__HasComposedOutput() : false,
            Project          : state.Project,
            Lantern          : state.Lantern,
            LanternIndex     : state.LanternIndex,
            Skeleton         : state.Geometry ? state.Geometry.Skeleton : null
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Offscreen Bake Support
// -----------------------------------------------------------------------------

    // FUNCTION | Take a Snapshot of the Session Sheet Setup
    // ------------------------------------------------------------
    // Everything the bake is about to overwrite. The sheet setup lives in module
    // variables shared with the on-screen editor, so composing a lantern the user is
    // not looking at means borrowing that state and handing it back exactly as found.
    // Doing this here rather than in the baker is deliberate: the variables are
    // private to this module, and a snapshot taken anywhere else would be a list of
    // fields to remember to update.
    function VghLantern__DrawingEditor__SheetManager__CaptureSessionSetup() {
        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;

        return {
            SheetSizeKey    : VghLantern__SheetManager__SheetSizeKey,
            Orientation     : VghLantern__SheetManager__Orientation,
            IsScaleManual   : VghLantern__SheetManager__IsScaleManual,
            IsPaperManual   : VghLantern__SheetManager__IsPaperManual,
            ColumnSharesPct : VghLantern__SheetManager__ColumnSharesPct
                                  ? VghLantern__SheetManager__ColumnSharesPct.slice() : null,
            RowSharesPct    : VghLantern__SheetManager__RowSharesPct
                                  ? VghLantern__SheetManager__RowSharesPct.slice() : null,
            ZoomFactor      : VghLantern__SheetManager__ZoomFactor,
            ActiveLayout    : VghLantern__SheetManager__ActiveLayout,
            Denominator     : ScaleManager
                                  ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__GetDenominator() : null,
            CameraStates    : ViewPlacement
                                  ? ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__CollectCameraStates() : null
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Put a Captured Session Sheet Setup Back
    // ------------------------------------------------------------
    // Written under the restore guard so handing the editor its own state back is not
    // recorded as the user having changed anything - a bake must never mark a project
    // dirty, or opening Preview and Send would queue a save on every project opened.
    function VghLantern__DrawingEditor__SheetManager__RestoreSessionSetup(snapshot) {
        if (!snapshot) return;

        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;

        VghLantern__SheetManager__IsRestoring  =  true;

        try {
            VghLantern__SheetManager__SheetSizeKey     =  snapshot.SheetSizeKey;
            VghLantern__SheetManager__Orientation      =  snapshot.Orientation;
            VghLantern__SheetManager__IsScaleManual    =  snapshot.IsScaleManual;
            VghLantern__SheetManager__IsPaperManual    =  snapshot.IsPaperManual;
            VghLantern__SheetManager__ColumnSharesPct  =  snapshot.ColumnSharesPct;
            VghLantern__SheetManager__RowSharesPct     =  snapshot.RowSharesPct;
            VghLantern__SheetManager__ZoomFactor       =  snapshot.ZoomFactor;
            VghLantern__SheetManager__ActiveLayout     =  snapshot.ActiveLayout;

            if (ScaleManager && typeof snapshot.Denominator === 'number') {
                ScaleManager.VghLantern__DrawingEditor__ScaleManager__SetDenominator(snapshot.Denominator);
            }
            if (ViewPlacement && snapshot.CameraStates) {
                ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__RestoreCameraStates(snapshot.CameraStates);
            }
        } finally {
            VghLantern__SheetManager__IsRestoring  =  false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Adopt One Lantern's Sheet Setup and Solve Its Layout
    // ------------------------------------------------------------
    // Loads that lantern's recorded sheet setup, auto-fits the scale where the user
    // has not pinned one, and returns the solved paper layout. This is the same
    // sequence Render performs for the active lantern, which is what makes a baked
    // sheet the sheet the user would see if they selected that lantern by hand.
    //
    // Takes a lantern rather than an index, and never touches the active selection:
    // switching the selection would fire lanternSelected, re-solve the geometry the
    // viewports are showing, and repaint two other modes to compose a page.
    function VghLantern__DrawingEditor__SheetManager__AdoptLanternForBake(lantern, geometry) {
        VghLantern__SheetManager__ApplyLayoutBlock(
            VghLantern__SheetManager__LanternLayoutBlock(lantern, false) || {}
        );

        // Same order as Render: the ladder settles the paper and the scale together and
        // returns the layout of the rung it chose, so a baked sheet lands on the paper
        // the user would see if they selected that lantern by hand. Only a lantern with
        // no geometry to fit falls through to solving the recorded paper directly.
        var layout  =  (geometry && geometry.Skeleton)
            ? VghLantern__SheetManager__ApplyAutoLayout(geometry)
            : null;
        if (!layout) layout  =  VghLantern__DrawingEditor__SheetManager__SolveLayout();
        if (!layout) return null;

        VghLantern__SheetManager__ActiveLayout  =  layout;
        return layout;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing Layout Persistence
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Legacy Project-Level Layout Block
    // ------------------------------------------------------------
    function VghLantern__SheetManager__ProjectLayoutBlock() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;

        var project  =  StateManager.VghLantern__StateManager__GetCurrentProject();
        if (!project) return null;

        var block  =  project[LAYOUT_PROJECT_BLOCK];
        return (block && typeof block === 'object' && !Array.isArray(block)) ? block : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get or Create the Layout Block on a Lantern
    // ------------------------------------------------------------
    function VghLantern__SheetManager__LanternLayoutBlock(lantern, createIfMissing) {
        if (!lantern || typeof lantern !== 'object') return null;

        var block  =  lantern[LAYOUT_LANTERN_BLOCK];
        if (!block || typeof block !== 'object' || Array.isArray(block)) {
            if (!createIfMissing) return null;
            block  =  {};
            lantern[LAYOUT_LANTERN_BLOCK]  =  block;
        }

        return block;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Layout Block for the Active Lantern
    // ------------------------------------------------------------
    // Prefers the selected lantern's own sheet setup. Falls back to the legacy
    // project-level block only when no lantern is selected yet (project just
    // loaded) so Restore still has something to read before the first lantern
    // is chosen.
    function VghLantern__SheetManager__LayoutBlock(createIfMissing) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;

        var lantern  =  StateManager.VghLantern__StateManager__GetCurrentLantern();
        if (lantern) return VghLantern__SheetManager__LanternLayoutBlock(lantern, createIfMissing);

        if (createIfMissing) return null;                                     // <-- Never invent a project-level write target
        return VghLantern__SheetManager__ProjectLayoutBlock();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Map a Legacy Project Layout Block Onto Lantern Keys
    // ------------------------------------------------------------
    function VghLantern__SheetManager__ProjectBlockAsLanternKeys(projectBlock) {
        if (!projectBlock) return {};

        var mapped  =  {};
        mapped[LAYOUT_SHEET_SIZE]     =  projectBlock[LAYOUT_PROJECT_SHEET_SIZE];
        mapped[LAYOUT_ORIENTATION]    =  projectBlock[LAYOUT_PROJECT_ORIENTATION];
        mapped[LAYOUT_SCALE]          =  projectBlock[LAYOUT_PROJECT_SCALE];
        mapped[LAYOUT_SCALE_MANUAL]   =  projectBlock[LAYOUT_PROJECT_SCALE_MANUAL];
        mapped[LAYOUT_PAPER_MANUAL]   =  projectBlock[LAYOUT_PROJECT_PAPER_MANUAL];
        mapped[LAYOUT_COLUMN_SHARES]  =  projectBlock[LAYOUT_PROJECT_COLUMN_SHARES];
        mapped[LAYOUT_ROW_SHARES]     =  projectBlock[LAYOUT_PROJECT_ROW_SHARES];
        mapped[LAYOUT_ZOOM]           =  projectBlock[LAYOUT_PROJECT_ZOOM];
        mapped[LAYOUT_CAMERAS]        =  projectBlock[LAYOUT_PROJECT_CAMERAS];
        return mapped;
    }
    // ------------------------------------------------------------


    // FUNCTION | Write the Current Sheet Setup Onto the Active Lantern
    // ------------------------------------------------------------
    // Marking the project dirty is what schedules the write: AppCore already
    // debounces dirty state into a single disk save, so a gutter drag or a run of
    // zoom steps costs one file write rather than one per event. Flask persists
    // the whole project JSON, so each lantern's DrawingLayout rides along.
    function VghLantern__SheetManager__RecordLayoutState(reason) {
        if (VghLantern__SheetManager__IsRestoring) return;

        var block  =  VghLantern__SheetManager__LayoutBlock(true);
        if (!block) return;

        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        var StateManager   =  window.VghLantern__AppCore__StateManager;

        VghLantern__SheetManager__EnsureShares();

        block[LAYOUT_SHEET_SIZE]    =  VghLantern__DrawingEditor__SheetManager__SheetSizeKey();
        block[LAYOUT_ORIENTATION]   =  VghLantern__DrawingEditor__SheetManager__Orientation();
        block[LAYOUT_SCALE]         =  ScaleManager
            ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__GetDenominator()
            : null;
        block[LAYOUT_SCALE_MANUAL]  =  VghLantern__SheetManager__IsScaleManual;
        block[LAYOUT_PAPER_MANUAL]  =  VghLantern__SheetManager__IsPaperManual;
        block[LAYOUT_COLUMN_SHARES] =  VghLantern__SheetManager__ColumnSharesPct.slice();
        block[LAYOUT_ROW_SHARES]    =  VghLantern__SheetManager__RowSharesPct.slice();
        block[LAYOUT_ZOOM]          =  VghLantern__SheetManager__ZoomFactor;
        block[LAYOUT_CAMERAS]       =  ViewPlacement
            ? ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__CollectCameraStates()
            : (block[LAYOUT_CAMERAS] || {});

        if (StateManager) {
            var state  =  StateManager.VghLantern__StateManager__GetState();
            VghLantern__SheetManager__LayoutLanternIndex  =  state.currentLanternIndex;
            StateManager.VghLantern__StateManager__MarkDirty();
        }

        if (reason) console.log('[VghLantern__DrawingEditor__SheetManager] Sheet setup recorded: ' + reason);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Load One Layout Block Into the Session State
    // ------------------------------------------------------------
    // The whole of "become this sheet setup", separated from deciding whose setup it
    // is. Restoring the active lantern and baking a lantern the editor is not looking
    // at are the same operation on different blocks, and one implementation of it is
    // what stops a baked sheet drifting from the sheet the user approved.
    function VghLantern__SheetManager__ApplyLayoutBlock(block) {
        var ConfigLoader   =  window.VghLantern__AppCore__ConfigLoader;
        var GRID_LABEL     =  'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__ViewGrid';
        var ScaleManager   =  window.VghLantern__DrawingEditor__ScaleManager;
        var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
        var gridCfg        =  VghLantern__SheetManager__GridConfig();
        var columns        =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'Columns', GRID_LABEL);
        var rows           =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridCfg, 'Rows',    GRID_LABEL);

        block  =  block || {};

        VghLantern__SheetManager__IsRestoring  =  true;

        try {
            var sizes  =  VghLantern__SheetManager__SheetConfig().SheetSizes || {};
            VghLantern__SheetManager__SheetSizeKey  =  (block[LAYOUT_SHEET_SIZE] && sizes[block[LAYOUT_SHEET_SIZE]])
                ? block[LAYOUT_SHEET_SIZE]
                : null;

            VghLantern__SheetManager__Orientation   =  (block[LAYOUT_ORIENTATION] === 'portrait' || block[LAYOUT_ORIENTATION] === 'landscape')
                ? block[LAYOUT_ORIENTATION]
                : null;

            // Absent means false, which is what re-fits a project saved before the auto
            // layout ladder existed: its recorded paper is a default the app chose, not
            // a choice the user made, so the ladder is free to move it back to A4.
            VghLantern__SheetManager__IsScaleManual =  block[LAYOUT_SCALE_MANUAL] === true;
            VghLantern__SheetManager__IsPaperManual =  block[LAYOUT_PAPER_MANUAL] === true;

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


    // FUNCTION | Restore the Sheet Setup From the Active Lantern
    // ------------------------------------------------------------
    // A lantern with no recorded layout falls back to the config defaults, which is
    // exactly what a newly added lantern should do. The legacy project-level block
    // is only consulted when no lantern is selected yet.
    function VghLantern__SheetManager__RestoreLayoutState() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        var lantern       =  StateManager ? StateManager.VghLantern__StateManager__GetCurrentLantern() : null;
        var block;

        if (lantern) {
            block  =  VghLantern__SheetManager__LanternLayoutBlock(lantern, false) || {};
        } else {
            block  =  VghLantern__SheetManager__ProjectBlockAsLanternKeys(
                VghLantern__SheetManager__ProjectLayoutBlock()
            );
        }

        VghLantern__SheetManager__ApplyLayoutBlock(block);

        if (StateManager) {
            var state  =  StateManager.VghLantern__StateManager__GetState();
            VghLantern__SheetManager__LayoutLanternIndex  =  state.currentLanternIndex;
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Flush Session Layout Onto the Previous Lantern Before a Switch
    // ------------------------------------------------------------
    // Lantern Editor tabs and the Drawing Editor selector both change the active
    // index. Flushing first stops Kitchen's camera and scale being written onto
    // Dining Room when the solve for the new lantern arrives.
    function VghLantern__SheetManager__FlushLayoutBeforeLanternChange() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        var state      =  StateManager.VghLantern__StateManager__GetState();
        var nextIndex  =  state.currentLanternIndex;
        var prevIndex  =  VghLantern__SheetManager__LayoutLanternIndex;

        if (prevIndex < 0 || prevIndex === nextIndex) return;

        var project   =  StateManager.VghLantern__StateManager__GetCurrentProject();
        var lanterns  =  project ? project['VghLantern__ProjectFile__Lanterns'] : null;
        if (!Array.isArray(lanterns) || !lanterns[prevIndex]) return;

        // Temporarily point GetCurrentLantern at the previous lantern by writing
        // through its block directly - the active index has already moved.
        var block  =  VghLantern__SheetManager__LanternLayoutBlock(lanterns[prevIndex], true);
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
        block[LAYOUT_PAPER_MANUAL]  =  VghLantern__SheetManager__IsPaperManual;
        block[LAYOUT_COLUMN_SHARES] =  VghLantern__SheetManager__ColumnSharesPct
            ? VghLantern__SheetManager__ColumnSharesPct.slice()
            : null;
        block[LAYOUT_ROW_SHARES]    =  VghLantern__SheetManager__RowSharesPct
            ? VghLantern__SheetManager__RowSharesPct.slice()
            : null;
        block[LAYOUT_ZOOM]          =  VghLantern__SheetManager__ZoomFactor;
        block[LAYOUT_CAMERAS]       =  ViewPlacement
            ? ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__CollectCameraStates()
            : (block[LAYOUT_CAMERAS] || {});

        StateManager.VghLantern__StateManager__MarkDirty();
        console.log('[VghLantern__DrawingEditor__SheetManager] Sheet setup flushed for lantern ' + prevIndex);
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
        var lanternSelect  =  document.getElementById('VghLantern__DrawingEditor__LanternSelect');

        if (sizeSelect) {
            sizeSelect.addEventListener('change', function(e) {
                VghLantern__SheetManager__SheetSizeKey   =  e.currentTarget.value;
                VghLantern__SheetManager__IsPaperManual  =  true;              // <-- The choice sticks; the auto layout ladder no longer moves the paper
                VghLantern__SheetManager__RecordLayoutState('drawingLayout:sheetSize');
                void VghLantern__DrawingEditor__SheetManager__Render();
            });
        }

        if (orientSelect) {
            orientSelect.addEventListener('change', function(e) {
                VghLantern__SheetManager__Orientation    =  e.currentTarget.value;
                VghLantern__SheetManager__IsPaperManual  =  true;              // <-- Orientation is half the paper choice, so it pins the same way
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

        if (lanternSelect) {
            lanternSelect.addEventListener('change', function(e) {
                var StateManager  =  window.VghLantern__AppCore__StateManager;
                if (!StateManager) return;

                var nextIndex  =  parseInt(e.currentTarget.value, 10);
                if (isNaN(nextIndex)) return;

                // Flush the current sheet onto the lantern we are leaving, then switch.
                // lanternSelected restores the incoming lantern's layout and the solve
                // rebuilds the sheet against its geometry.
                VghLantern__SheetManager__RecordLayoutState('drawingLayout:lanternSwitch');
                StateManager.VghLantern__StateManager__SetCurrentLanternIndex(nextIndex);
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
        var sheet   =  VghLantern__SheetManager__FindSheet(host);
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
    // because all of them end in a resolve. lanternSelected restores that lantern's
    // own sheet setup before the debounced redraw paints it.
    function VghLantern__DrawingEditor__SheetManager__Init() {
        if (VghLantern__SheetManager__IsSubscribed) return;

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.VghLantern__StateManager__On('geometrySolved', VghLantern__SheetManager__QueueRedraw);

        // The sheet setup is restored before the redraw, so a project opens on the
        // paper, scale and viewpoint it was last saved with rather than on the
        // defaults followed by a visible correction.
        StateManager.VghLantern__StateManager__On('projectChanged', function() {
            VghLantern__SheetManager__LayoutLanternIndex  =  -1;
            VghLantern__SheetManager__RestoreLayoutState();
            VghLantern__SheetManager__QueueRedraw();
        });

        // Lantern Editor tabs and the Drawing Editor selector both fire this. Flush
        // the outgoing lantern first when the switch came from elsewhere (tabs),
        // then restore the incoming lantern's sheet so the solve paints the right
        // paper rather than the previous lantern's session state.
        StateManager.VghLantern__StateManager__On('lanternSelected', function() {
            VghLantern__SheetManager__FlushLayoutBeforeLanternChange();
            VghLantern__SheetManager__RestoreLayoutState();
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
        VghLantern__DrawingEditor__SheetManager__OnModeExit       : VghLantern__DrawingEditor__SheetManager__OnModeExit,

        // Offscreen bake support. Consumed by SheetBaker only - these lend the session
        // sheet setup out and take it back, which nothing but a bake has any business
        // doing.
        VghLantern__DrawingEditor__SheetManager__CaptureSessionSetup : VghLantern__DrawingEditor__SheetManager__CaptureSessionSetup,
        VghLantern__DrawingEditor__SheetManager__RestoreSessionSetup : VghLantern__DrawingEditor__SheetManager__RestoreSessionSetup,
        VghLantern__DrawingEditor__SheetManager__AdoptLanternForBake : VghLantern__DrawingEditor__SheetManager__AdoptLanternForBake
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetManager  =  VghLantern__DrawingEditor__SheetManager;
