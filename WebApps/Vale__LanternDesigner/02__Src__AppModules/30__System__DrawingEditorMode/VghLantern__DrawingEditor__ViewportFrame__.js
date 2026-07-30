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
    const FALLBACK_TITLE_MM     =  10;
    const FALLBACK_LABEL_MM     =  7;
    const FALLBACK_LABEL_FONT_MM =  3.2;
    const FALLBACK_SHARE_MIN    =  20;
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


    // HELPER FUNCTION | Normalise a Share Array to Track Count and 100%
    // ------------------------------------------------------------
    function VghLantern__ViewportFrame__NormaliseShares(rawShares, trackCount) {
        var count   =  Math.max(1, trackCount);
        var shares  =  [];
        var i, total, value;

        for (i = 0; i < count; i++) {
            value  =  (Array.isArray(rawShares) && typeof rawShares[i] === 'number') ? rawShares[i] : (100 / count);
            shares.push(Math.max(0.01, value));
        }

        total  =  0;
        for (i = 0; i < shares.length; i++) total  +=  shares[i];
        if (total <= 0) {
            for (i = 0; i < shares.length; i++) shares[i]  =  100 / count;
            return shares;
        }

        for (i = 0; i < shares.length; i++) shares[i]  =  (shares[i] / total) * 100;
        return shares;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Active Column and Row Share Percentages
    // ------------------------------------------------------------
    // Session shares from SheetManager win when present so gutter drags survive a
    // sheet rebuild without writing back into the config file.
    function VghLantern__ViewportFrame__ResolveShares(shareOverride) {
        var gridCfg   =  VghLantern__ViewportFrame__GridConfig();
        var columns   =  (typeof gridCfg.Columns === 'number' && gridCfg.Columns > 0) ? gridCfg.Columns : FALLBACK_COLUMNS;
        var rows      =  (typeof gridCfg.Rows === 'number' && gridCfg.Rows > 0)       ? gridCfg.Rows    : FALLBACK_ROWS;

        var SheetManager  =  window.VghLantern__DrawingEditor__SheetManager;
        var session       =  (shareOverride) ? shareOverride
            : (SheetManager && SheetManager.VghLantern__DrawingEditor__SheetManager__GetGridShares
                ? SheetManager.VghLantern__DrawingEditor__SheetManager__GetGridShares()
                : null);

        return {
            ColumnSharesPct  : VghLantern__ViewportFrame__NormaliseShares(
                (session && session.ColumnSharesPct) || gridCfg.ColumnSharesPct, columns
            ),
            RowSharesPct     : VghLantern__ViewportFrame__NormaliseShares(
                (session && session.RowSharesPct) || gridCfg.RowSharesPct, rows
            )
        };
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


    // FUNCTION | Compute the Paper Size of Every Grid Track
    // ------------------------------------------------------------
    // Returns per-column and per-row millimetre sizes from the active share split.
    // Equal shares keep the historic equal-cell behaviour; gutter drags change the
    // arrays without touching the quoted drawing scale.
    function VghLantern__DrawingEditor__ViewportFrame__CellSizeMm(sheetSize, shareOverride) {
        if (!sheetSize) return null;

        var sheetCfg  =  VghLantern__ViewportFrame__SheetConfig();
        var gridCfg   =  VghLantern__ViewportFrame__GridConfig();
        var pdfCfg    =  VghLantern__ViewportFrame__DrawingConfig()['VghLantern__DrawingEditor__Config__PdfExport'] || {};
        var shares    =  VghLantern__ViewportFrame__ResolveShares(shareOverride);

        var marginMm  =  (typeof sheetCfg.MarginMm === 'number')           ? sheetCfg.MarginMm           : FALLBACK_MARGIN_MM;
        var titleMm   =  (typeof sheetCfg.TitleBlockHeightMm === 'number') ? sheetCfg.TitleBlockHeightMm : FALLBACK_TITLE_MM;
        var gutterMm  =  (typeof gridCfg.GutterMm === 'number')            ? gridCfg.GutterMm            : FALLBACK_GUTTER_MM;
        var columns   =  shares.ColumnSharesPct.length;
        var rows      =  shares.RowSharesPct.length;
        var labelMm   =  (typeof gridCfg.FrameLabelHeightMm === 'number')  ? gridCfg.FrameLabelHeightMm  : FALLBACK_LABEL_MM;
        var blockGapMm =  (typeof sheetCfg.BlockGapMm === 'number')
            ? sheetCfg.BlockGapMm
            : ((typeof pdfCfg.BlockGapMm === 'number') ? pdfCfg.BlockGapMm : 3);

        // Reserve the notes band the same way PDF Solve does, so auto-fit and
        // true-scale bodies match the printed frame sizes.
        var notesReserveMm  =  0;
        var SheetPdfLayout  =  window.VghLantern__DrawingEditor__SheetPdfLayout;
        var AnnotationLayer =  window.VghLantern__DrawingEditor__AnnotationLayer;
        var StateManager    =  window.VghLantern__AppCore__StateManager;
        if (SheetPdfLayout && AnnotationLayer && StateManager) {
            var project   =  StateManager.VghLantern__StateManager__GetCurrentProject();
            var noteList  =  AnnotationLayer.VghLantern__DrawingEditor__AnnotationLayer__CollectNotes(project);
            var notesBand =  SheetPdfLayout.VghLantern__DrawingEditor__SheetPdfLayout__MeasureNotesBand(noteList.length);
            if (notesBand) notesReserveMm  =  notesBand.HeightMm + (blockGapMm * 2);
            else notesReserveMm  =  blockGapMm;
        } else {
            notesReserveMm  =  blockGapMm;
        }

        var drawableWidthMm   =  sheetSize.WidthMm  - (marginMm * 2);
        var drawableHeightMm  =  sheetSize.HeightMm - (marginMm * 2) - titleMm - notesReserveMm;
        var usableWidthMm     =  drawableWidthMm  - (gutterMm * (columns - 1));
        var usableHeightMm    =  drawableHeightMm - (gutterMm * (rows - 1));

        var columnWidthsMm  =  [];
        var rowHeightsMm    =  [];
        var i;

        for (i = 0; i < columns; i++) columnWidthsMm.push(usableWidthMm  * (shares.ColumnSharesPct[i] / 100));
        for (i = 0; i < rows; i++)    rowHeightsMm.push(usableHeightMm * (shares.RowSharesPct[i] / 100));

        return {
            Columns          : columns,
            Rows             : rows,
            GutterMm         : gutterMm,
            LabelMm          : labelMm,
            ColumnSharesPct  : shares.ColumnSharesPct.slice(),
            RowSharesPct     : shares.RowSharesPct.slice(),
            ColumnWidthsMm   : columnWidthsMm,
            RowHeightsMm     : rowHeightsMm,
            CellWidthMm      : columnWidthsMm[0] || 0,
            CellHeightMm     : rowHeightsMm[0] || 0,
            BodyWidthMm      : columnWidthsMm[0] || 0,
            BodyHeightMm     : Math.max(0, (rowHeightsMm[0] || 0) - labelMm),
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

        var columnSpan   =  (typeof slot.ColumnSpan === 'number' && slot.ColumnSpan > 0) ? slot.ColumnSpan : 1;
        var rowSpan      =  (typeof slot.RowSpan === 'number' && slot.RowSpan > 0)       ? slot.RowSpan    : 1;
        var columnStart  =  Math.max(1, Number(slot.ColumnStart) || 1);
        var rowStart     =  Math.max(1, Number(slot.RowStart)    || 1);
        var labelMm      =  (typeof cellMetrics.LabelMm === 'number') ? cellMetrics.LabelMm : FALLBACK_LABEL_MM;

        var widthMm   =  0;
        var heightMm  =  0;
        var i, colIndex, rowIndex;

        for (i = 0; i < columnSpan; i++) {
            colIndex  =  columnStart - 1 + i;
            widthMm  +=  (cellMetrics.ColumnWidthsMm && cellMetrics.ColumnWidthsMm[colIndex] != null)
                ? cellMetrics.ColumnWidthsMm[colIndex]
                : (cellMetrics.CellWidthMm || 0);
        }
        widthMm  +=  cellMetrics.GutterMm * (columnSpan - 1);

        for (i = 0; i < rowSpan; i++) {
            rowIndex   =  rowStart - 1 + i;
            heightMm  +=  (cellMetrics.RowHeightsMm && cellMetrics.RowHeightsMm[rowIndex] != null)
                ? cellMetrics.RowHeightsMm[rowIndex]
                : (cellMetrics.CellHeightMm || 0);
        }
        heightMm  +=  cellMetrics.GutterMm * (rowSpan - 1);

        return {
            WidthMm  : widthMm,
            HeightMm : Math.max(0, heightMm - labelMm)
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

        // The caption height is pinned to its configured paper height, because the
        // body size maths subtracts FrameLabelHeightMm - a font-driven height here
        // would put the drawn scale slightly off its quoted value.
        var sheetCfg  =  VghLantern__ViewportFrame__SheetConfig();
        var gridCfg   =  VghLantern__ViewportFrame__GridConfig();
        var labelMm   =  (typeof gridCfg.FrameLabelHeightMm === 'number') ? gridCfg.FrameLabelHeightMm : FALLBACK_LABEL_MM;
        var fontMm    =  (typeof gridCfg.FrameLabelFontSizeMm === 'number') ? gridCfg.FrameLabelFontSizeMm : FALLBACK_LABEL_FONT_MM;
        var pxPerMm   =  (typeof sheetCfg.ScreenPixelsPerMm === 'number') ? sheetCfg.ScreenPixelsPerMm : 3.2;

        var html  =  '<div class="' + CSS_FRAME_LABEL + '" style="height:' + (labelMm * pxPerMm) + 'px;' +
                     'font-size:' + (fontMm * pxPerMm) + 'px;box-sizing:border-box">' +
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
