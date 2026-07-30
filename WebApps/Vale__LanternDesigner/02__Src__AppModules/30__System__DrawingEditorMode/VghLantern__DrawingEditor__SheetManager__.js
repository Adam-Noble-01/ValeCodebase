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

    const CSS_SHEET         =  'VghLantern__Sheet';
    const CSS_SHEET_SCALER  =  'VghLantern__Sheet__Scaler';
    const CSS_SHEET_GRID    =  'VghLantern__Sheet__ViewGrid';
    const CSS_SHEET_NOTES   =  'VghLantern__Sheet__NotesHost';
    const CSS_SHEET_TITLE   =  'VghLantern__Sheet__TitleHost';
    const CSS_EMPTY_STATE   =  'VghLantern__DrawingEditor__EmptyState';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Behaviour
    // ------------------------------------------------------------
    const REDRAW_DEBOUNCE_MS  =  180;                                         // <-- Coalesces geometry event storms into one sheet rebuild
    const MESSAGE_NO_LANTERN  =  'Select a lantern in the Lantern Editor to compose a drawing sheet.';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Sheet Selection and Lifecycle State
    // ------------------------------------------------------------
    let VghLantern__SheetManager__SheetSizeKey    =  null;                    // <-- Null means "use the config default"
    let VghLantern__SheetManager__Orientation     =  null;
    let VghLantern__SheetManager__IsSubscribed    =  false;                   // <-- Guards duplicate StateManager listeners
    let VghLantern__SheetManager__RedrawTimerId   =  null;
    let VghLantern__SheetManager__IsRendering     =  false;                   // <-- Prevents overlapping async sheet builds
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

        if (toolbarCfg.ShowFitButton !== false) {
            html  +=  '<button type="button" class="' + CSS_TOOL_BUTTON + '" ' +
                      'id="VghLantern__DrawingEditor__FitButton">Fit Views</button>';
        }
        if (toolbarCfg.ShowRefreshButton !== false) {
            html  +=  '<button type="button" class="' + CSS_TOOL_BUTTON + '" ' +
                      'id="VghLantern__DrawingEditor__RefreshButton">Refresh</button>';
        }

        host.innerHTML  =  html + '</div>';
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
        var gridCfg        =  VghLantern__SheetManager__DrawingConfig()['VghLantern__DrawingEditor__Config__ViewGrid'] || {};

        var marginMm    =  (typeof sheetCfg.MarginMm === 'number') ? sheetCfg.MarginMm : 10;
        var titleMm     =  (typeof sheetCfg.TitleBlockHeightMm === 'number') ? sheetCfg.TitleBlockHeightMm : 22;
        var gutterMm    =  (typeof gridCfg.GutterMm === 'number') ? gridCfg.GutterMm : 6;
        var columns     =  (typeof gridCfg.Columns === 'number') ? gridCfg.Columns : 2;
        var rows        =  (typeof gridCfg.Rows === 'number')    ? gridCfg.Rows    : 2;
        var pxPerMm     =  (typeof sheetCfg.ScreenPixelsPerMm === 'number') ? sheetCfg.ScreenPixelsPerMm : 3.2;

        var sheetStyle  =  'width:' + (sheetSize.WidthMm * pxPerMm) + 'px;' +
                           'height:' + (sheetSize.HeightMm * pxPerMm) + 'px;' +
                           'padding:' + (marginMm * pxPerMm) + 'px;';

        var gridStyle   =  'grid-template-columns:repeat(' + columns + ',1fr);' +
                           'grid-template-rows:repeat(' + rows + ',1fr);' +
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

        return '<div class="' + CSS_SHEET_SCALER + '">' +
               '<div class="' + CSS_SHEET + '" style="' + sheetStyle + '" ' +
               'data-vgh-sheet-size="' + sheetSize.Key + '" data-vgh-sheet-orientation="' + sheetSize.Orientation + '">' +
               '<div class="' + CSS_SHEET_GRID + '" style="' + gridStyle + '">' + framesHtml + '</div>' +
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

        if (VghLantern__SheetManager__IsRendering) return false;               // <-- A rebuild is already in flight
        VghLantern__SheetManager__IsRendering  =  true;

        try {
            VghLantern__SheetManager__RenderToolbar();
            VghLantern__SheetManager__BindToolbar();

            var state  =  VghLantern__SheetManager__ReadState();
            if (!state.Lantern || !state.Geometry.Skeleton) {
                host.innerHTML  =  '<p class="' + CSS_EMPTY_STATE + '">' + MESSAGE_NO_LANTERN + '</p>';
                return false;
            }

            var ViewportFrame  =  window.VghLantern__DrawingEditor__ViewportFrame;
            var sheetSize      =  ViewportFrame
                ? ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__SheetSizeMm(
                      VghLantern__DrawingEditor__SheetManager__SheetSizeKey(),
                      VghLantern__DrawingEditor__SheetManager__Orientation()
                  )
                : null;

            if (!sheetSize) {
                host.innerHTML  =  '<p class="' + CSS_EMPTY_STATE + '">Sheet configuration unavailable.</p>';
                return false;
            }

            // Scale first: frame captions quote it, so it must be settled before build.
            VghLantern__SheetManager__ApplyAutoFit(sheetSize, state.Geometry);

            host.innerHTML  =  VghLantern__SheetManager__BuildSheetStructure(sheetSize);

            var sheetEl  =  host.querySelector('.' + CSS_SHEET);
            VghLantern__SheetManager__RenderSheetFurniture(sheetEl, state);

            var ViewPlacement  =  window.VghLantern__DrawingEditor__ViewPlacement;
            if (ViewPlacement) {
                await ViewPlacement.VghLantern__DrawingEditor__ViewPlacement__PlaceAll(
                    sheetEl, state.Geometry, state.Lantern
                );
            }

            return true;
        } catch (e) {
            console.error('[VghLantern__DrawingEditor__SheetManager] Sheet render failed:', e);
            return false;
        } finally {
            VghLantern__SheetManager__IsRendering  =  false;
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
        var fitButton      =  document.getElementById('VghLantern__DrawingEditor__FitButton');
        var refreshButton  =  document.getElementById('VghLantern__DrawingEditor__RefreshButton');

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
                void VghLantern__DrawingEditor__SheetManager__Render();       // <-- Manual choice; auto fit will re-run on next rebuild
            });
        }

        if (fitButton)     fitButton.addEventListener('click', function() { void VghLantern__DrawingEditor__SheetManager__Render(); });
        if (refreshButton) refreshButton.addEventListener('click', function() { void VghLantern__DrawingEditor__SheetManager__Render(); });
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
        VghLantern__DrawingEditor__SheetManager__SheetSizeKey    : VghLantern__DrawingEditor__SheetManager__SheetSizeKey,
        VghLantern__DrawingEditor__SheetManager__Orientation     : VghLantern__DrawingEditor__SheetManager__Orientation,
        VghLantern__DrawingEditor__SheetManager__OnModeExit      : VghLantern__DrawingEditor__SheetManager__OnModeExit
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetManager  =  VghLantern__DrawingEditor__SheetManager;
