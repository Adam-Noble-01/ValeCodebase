/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | VIEWPORT FRAME
   =============================================================================

   FILE       : VghLantern__DrawingEditor__ViewportFrame__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - ViewportFrame
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the framed, captioned slots that hold each view on a sheet
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Builds the frame chrome for one view slot: the bordered box, the caption strip
     and the empty body that a view is later placed into.
   - Computes the paper-space size of every frame from the sheet size, margins,
     titleblock height and grid gutters, so the scale manager can be asked whether a
     view fits before anything is drawn.
   - Knows nothing about what goes inside a frame. ViewPlacement fills the bodies.

   -----------------------------------------------------------------------------

   WHY FRAME SIZES ARE COMPUTED IN PAPER MILLIMETRES:
   The sheet is laid out in real paper millimetres and only scaled to pixels for
   display. That means the same numbers drive the screen sheet and the PDF, so what
   fits on screen fits on paper. A pixel-first layout would have to be re-derived at
   export time and would inevitably drift.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Viewport Frame Module
// =============================================================================

const VghLantern__DrawingEditor__ViewportFrame = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names and Data Attributes
    // ------------------------------------------------------------
    const CSS_FRAME        =  'VghLantern__Sheet__Frame';
    const CSS_FRAME_LABEL  =  'VghLantern__Sheet__FrameLabel';
    const CSS_FRAME_SCALE  =  'VghLantern__Sheet__FrameScale';
    const CSS_FRAME_BODY   =  'VghLantern__Sheet__FrameBody';

    const ATTR_SLOT_KEY    =  'data-vgh-slot';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Layout Fallbacks Used Before Config Resolves
    // ------------------------------------------------------------
    const FALLBACK_COLUMNS      =  2;
    const FALLBACK_ROWS         =  2;
    const FALLBACK_GUTTER_MM    =  6;
    const FALLBACK_MARGIN_MM    =  10;
    const FALLBACK_TITLE_MM     =  22;
    const FALLBACK_LABEL_MM     =  7;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Drawing Editor Config Root
    // ------------------------------------------------------------
    function VghLantern__ViewportFrame__DrawingConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Sheet Config Block
    // ------------------------------------------------------------
    function VghLantern__ViewportFrame__SheetConfig() {
        return VghLantern__ViewportFrame__DrawingConfig()['VghLantern__DrawingEditor__Config__Sheet'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the View Grid Config Block
    // ------------------------------------------------------------
    function VghLantern__ViewportFrame__GridConfig() {
        return VghLantern__ViewportFrame__DrawingConfig()['VghLantern__DrawingEditor__Config__ViewGrid'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__ViewportFrame__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Paper Space Measurement
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Paper Size of a Sheet
    // ------------------------------------------------------------
    // Config lists sizes landscape (long edge first); portrait swaps them here so a
    // size is only described once.
    function VghLantern__DrawingEditor__ViewportFrame__SheetSizeMm(sheetSizeKey, orientation) {
        var sheetCfg     =  VghLantern__ViewportFrame__SheetConfig();
        var sizes        =  sheetCfg.SheetSizes || {};
        var resolvedKey  =  sheetSizeKey || sheetCfg.DefaultSheetSize;
        var entry        =  sizes[resolvedKey];

        if (!entry) return null;

        var resolvedOrientation  =  orientation || sheetCfg.DefaultOrientation || 'landscape';
        var isPortrait           =  resolvedOrientation === 'portrait';

        return {
            Key         : resolvedKey,
            Label       : entry.Label || resolvedKey,
            Orientation : resolvedOrientation,
            WidthMm     : isPortrait ? entry.HeightMm : entry.WidthMm,
            HeightMm    : isPortrait ? entry.WidthMm  : entry.HeightMm
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Compute the Paper Size of a Single Grid Cell
    // ------------------------------------------------------------
    // The drawable area is the sheet less its margins and the titleblock strip; the
    // grid then divides that, less gutters between cells.
    function VghLantern__DrawingEditor__ViewportFrame__CellSizeMm(sheetSize) {
        if (!sheetSize) return null;

        var sheetCfg  =  VghLantern__ViewportFrame__SheetConfig();
        var gridCfg   =  VghLantern__ViewportFrame__GridConfig();

        var marginMm  =  (typeof sheetCfg.MarginMm === 'number')           ? sheetCfg.MarginMm           : FALLBACK_MARGIN_MM;
        var titleMm   =  (typeof sheetCfg.TitleBlockHeightMm === 'number') ? sheetCfg.TitleBlockHeightMm : FALLBACK_TITLE_MM;
        var gutterMm  =  (typeof gridCfg.GutterMm === 'number')            ? gridCfg.GutterMm            : FALLBACK_GUTTER_MM;
        var columns   =  (typeof gridCfg.Columns === 'number' && gridCfg.Columns > 0) ? gridCfg.Columns  : FALLBACK_COLUMNS;
        var rows      =  (typeof gridCfg.Rows === 'number' && gridCfg.Rows > 0)       ? gridCfg.Rows     : FALLBACK_ROWS;
        var labelMm   =  (typeof gridCfg.FrameLabelHeightMm === 'number')  ? gridCfg.FrameLabelHeightMm  : FALLBACK_LABEL_MM;

        var drawableWidthMm   =  sheetSize.WidthMm  - (marginMm * 2);
        var drawableHeightMm  =  sheetSize.HeightMm - (marginMm * 2) - titleMm;

        var cellWidthMm   =  (drawableWidthMm  - (gutterMm * (columns - 1))) / columns;
        var cellHeightMm  =  (drawableHeightMm - (gutterMm * (rows - 1)))    / rows;

        return {
            Columns          : columns,
            Rows             : rows,
            GutterMm         : gutterMm,
            CellWidthMm      : cellWidthMm,
            CellHeightMm     : cellHeightMm,
            BodyWidthMm      : cellWidthMm,
            BodyHeightMm     : cellHeightMm - labelMm,                     // <-- Caption strip is not drawable area
            DrawableWidthMm  : drawableWidthMm,
            DrawableHeightMm : drawableHeightMm
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Compute the Paper Size of One Slot's Drawable Body
    // ------------------------------------------------------------
    // A slot spanning two columns gets both cells plus the gutter between them, so
    // a wide plan can be given a full-width frame purely through config.
    function VghLantern__DrawingEditor__ViewportFrame__SlotBodySizeMm(slot, cellMetrics) {
        if (!slot || !cellMetrics) return null;

        var columnSpan  =  (typeof slot.ColumnSpan === 'number' && slot.ColumnSpan > 0) ? slot.ColumnSpan : 1;
        var rowSpan     =  (typeof slot.RowSpan === 'number' && slot.RowSpan > 0)       ? slot.RowSpan    : 1;

        return {
            WidthMm  : (cellMetrics.BodyWidthMm  * columnSpan) + (cellMetrics.GutterMm * (columnSpan - 1)),
            HeightMm : (cellMetrics.BodyHeightMm * rowSpan)    + (cellMetrics.GutterMm * (rowSpan - 1))
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Frame Markup
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Caption Strip for One Frame
    // ------------------------------------------------------------
    // The scale caption is suppressed for perspective views, because quoting a scale
    // beside a 3D view would misrepresent it.
    function VghLantern__ViewportFrame__BuildCaption(slot) {
        var ScaleManager  =  window.VghLantern__DrawingEditor__ScaleManager;
        var html          =  '<div class="' + CSS_FRAME_LABEL + '">' +
                             VghLantern__ViewportFrame__Escape(slot.Label || slot.Key);

        if (slot.ShowScale !== false && ScaleManager) {
            html  +=  '<span class="' + CSS_FRAME_SCALE + '">' +
                      VghLantern__ViewportFrame__Escape(ScaleManager.VghLantern__DrawingEditor__ScaleManager__FormatLabel()) +
                      '</span>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Frame Markup for One Slot
    // ------------------------------------------------------------
    // Grid placement is emitted as inline CSS grid coordinates so the sheet layout
    // follows the slot table in config without a matching stylesheet rule per slot.
    function VghLantern__DrawingEditor__ViewportFrame__BuildMarkup(slot) {
        if (!slot) return '';

        var columnSpan  =  (typeof slot.ColumnSpan === 'number' && slot.ColumnSpan > 0) ? slot.ColumnSpan : 1;
        var rowSpan     =  (typeof slot.RowSpan === 'number' && slot.RowSpan > 0)       ? slot.RowSpan    : 1;
        var columnStart =  (typeof slot.ColumnStart === 'number') ? slot.ColumnStart : 1;
        var rowStart    =  (typeof slot.RowStart === 'number')    ? slot.RowStart    : 1;

        var gridStyle  =  ' style="grid-column:' + columnStart + ' / span ' + columnSpan + ';' +
                          'grid-row:' + rowStart + ' / span ' + rowSpan + '"';

        return '<div class="' + CSS_FRAME + '" ' + ATTR_SLOT_KEY + '="' +
               VghLantern__ViewportFrame__Escape(slot.Key) + '"' + gridStyle + '>' +
               VghLantern__ViewportFrame__BuildCaption(slot) +
               '<div class="' + CSS_FRAME_BODY + '"></div>' +
               '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Find the Drawable Body Element of a Rendered Slot
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__ViewportFrame__FindBody(sheetElement, slotKey) {
        if (!sheetElement) return null;

        var frame  =  sheetElement.querySelector('[' + ATTR_SLOT_KEY + '="' + slotKey + '"]');
        return frame ? frame.querySelector('.' + CSS_FRAME_BODY) : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__ViewportFrame__SheetSizeMm     : VghLantern__DrawingEditor__ViewportFrame__SheetSizeMm,
        VghLantern__DrawingEditor__ViewportFrame__CellSizeMm      : VghLantern__DrawingEditor__ViewportFrame__CellSizeMm,
        VghLantern__DrawingEditor__ViewportFrame__SlotBodySizeMm  : VghLantern__DrawingEditor__ViewportFrame__SlotBodySizeMm,
        VghLantern__DrawingEditor__ViewportFrame__BuildMarkup     : VghLantern__DrawingEditor__ViewportFrame__BuildMarkup,
        VghLantern__DrawingEditor__ViewportFrame__FindBody        : VghLantern__DrawingEditor__ViewportFrame__FindBody,
        VghLantern__DrawingEditor__ViewportFrame__SlotAttribute   : ATTR_SLOT_KEY
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__ViewportFrame  =  VghLantern__DrawingEditor__ViewportFrame;
