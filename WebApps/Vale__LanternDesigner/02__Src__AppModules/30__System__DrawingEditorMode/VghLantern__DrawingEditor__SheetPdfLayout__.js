/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | SHEET PDF LAYOUT
   =============================================================================

   FILE       : VghLantern__DrawingEditor__SheetPdfLayout__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - SheetPdfLayout
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Solve the paper millimetre rectangle of every element on a sheet
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Pure paper-space arithmetic for a drawing sheet: where the view grid sits, where
     each frame and its drawable body sit, where the notes block and the titleblock
     strip sit. Every number returned is a real paper millimetre.
   - No DOM, no jsPDF, no config writing. SheetManager lays the screen sheet out from
     this and SheetPdfExporter draws the page from it; this module decides nothing
     about appearance.
   - Sheet sizes come from ViewportFrame so the paper dimensions have exactly one
     definition in the application.

   -----------------------------------------------------------------------------

   WHY BOTH SURFACES SOLVE HERE RATHER THAN THE SCREEN MEASURING ITSELF:
   The screen sheet used to be a CSS grid inside a flex column, and the exporter
   re-derived the same rectangles in millimetres. Two implementations of one layout
   drift on every rounding decision, so the screen now positions its frames from this
   solve as well - divided by ScreenPixelsPerMm and nothing else.

   WHY THE BODY RECTANGLE IS THE UNIT THAT MATTERS:
   A view is drawn at 1:N by giving it a model-space window of (body size x N). The
   body rectangle returned here is therefore the single input that decides whether a
   printed drawing measures correctly under a scale rule.

   -----------------------------------------------------------------------------

   RETURNED LAYOUT SHAPE:

     Page        { WidthMm, HeightMm, Orientation, SizeKey, Label }
     Content     { X, Y, WidthMm, HeightMm }          inside the sheet margins
     Grid        { X, Y, WidthMm, HeightMm, GutterMm, Columns, Rows,
                   ColumnTracks, RowTracks }         tracks are { OffsetMm, SizeMm }
     Notes       { X, Y, WidthMm, HeightMm, Columns, ... } or null when empty
     TitleBlock  { X, Y, WidthMm, HeightMm }
     Slots       [ { Slot, Frame, Label, Body } ]     one entry per configured slot
     Fonts       { ... }                              millimetre type sizes
     LabelMm     caption strip height
     ScreenPixelsPerMm                                screen scaling only

   ============================================================================= */

// =============================================================================
// REGION | Drawing Sheet PDF Layout Module
// =============================================================================

const VghLantern__DrawingEditor__SheetPdfLayout = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Layout Fallbacks Used Before Config Resolves
    // ------------------------------------------------------------
    const FALLBACK_MARGIN_MM      =  5;
    const FALLBACK_TITLE_MM       =  10;
    const FALLBACK_COLUMNS        =  2;
    const FALLBACK_ROWS           =  2;
    const FALLBACK_GUTTER_MM      =  6;
    const FALLBACK_LABEL_MM       =  7;
    const FALLBACK_BLOCK_GAP_MM   =  3;                                       // <-- Between grid, notes and titleblock
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Typography Fallbacks in Millimetres
    // ------------------------------------------------------------
    const FALLBACK_NOTE_FONT_MM   =  1.4;
    const FALLBACK_LABEL_FONT_MM  =  3.2;
    const FALLBACK_TITLE_LABEL_MM =  1.6;
    const FALLBACK_TITLE_VALUE_MM =  2.2;

    const FALLBACK_LINE_SPACING   =  1.35;                                    // <-- Line box height as a multiple of type size
    const FALLBACK_NOTE_COLUMNS   =  2;
    const FALLBACK_NOTE_COL_GAP   =  6;
    const FALLBACK_NOTE_HEADING   =  1.05;
    const FALLBACK_NOTE_PAD_TOP   =  1.25;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Drawing Editor Config Root
    // ------------------------------------------------------------
    function VghLantern__SheetPdfLayout__DrawingConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get a Named Drawing Editor Config Block
    // ------------------------------------------------------------
    function VghLantern__SheetPdfLayout__Block(blockName) {
        return VghLantern__SheetPdfLayout__DrawingConfig()['VghLantern__DrawingEditor__Config__' + blockName] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Numeric Config Value With a Fallback
    // ------------------------------------------------------------
    function VghLantern__SheetPdfLayout__Number(block, key, fallback) {
        return (typeof block[key] === 'number' && isFinite(block[key])) ? block[key] : fallback;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | List the Configured View Slots
    // ------------------------------------------------------------
    function VghLantern__SheetPdfLayout__Slots() {
        var slots  =  VghLantern__SheetPdfLayout__DrawingConfig()['VghLantern__DrawingEditor__Config__ViewSlots'];
        return Array.isArray(slots) ? slots : [];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Typography
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve Every Type Size the Sheet Uses
    // ------------------------------------------------------------
    // Sizes are millimetres because the whole page is millimetres; the exporter
    // converts to points at the moment it talks to jsPDF and nowhere else.
    function VghLantern__SheetPdfLayout__ResolveFonts() {
        var gridCfg   =  VghLantern__SheetPdfLayout__Block('ViewGrid');
        var notesCfg  =  VghLantern__SheetPdfLayout__Block('Annotations');
        var titleCfg  =  VghLantern__SheetPdfLayout__Block('TitleBlock');

        return {
            FrameLabelMm : VghLantern__SheetPdfLayout__Number(gridCfg,  'FrameLabelFontSizeMm', FALLBACK_LABEL_FONT_MM),
            NoteMm       : VghLantern__SheetPdfLayout__Number(notesCfg, 'DefaultFontSizeMm',    FALLBACK_NOTE_FONT_MM),
            TitleLabelMm : VghLantern__SheetPdfLayout__Number(titleCfg, 'FontSizeLabelMm',      FALLBACK_TITLE_LABEL_MM),
            TitleValueMm : VghLantern__SheetPdfLayout__Number(titleCfg, 'FontSizeValueMm',      FALLBACK_TITLE_VALUE_MM),
            LineSpacing  : VghLantern__SheetPdfLayout__Number(notesCfg, 'LineSpacing',         FALLBACK_LINE_SPACING)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Line Box Height for a Millimetre Type Size
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__SheetPdfLayout__LineHeightMm(fontSizeMm, lineSpacing) {
        var spacing  =  (typeof lineSpacing === 'number' && lineSpacing > 0) ? lineSpacing : FALLBACK_LINE_SPACING;
        return fontSizeMm * spacing;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Notes Block Measurement
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Measure the Notes Block for a Given Note Count
    // ------------------------------------------------------------
    // Returned before the grid is solved, because the notes block takes its space
    // off the top of the titleblock and the grid gets whatever is left. Height is
    // driven by the note count so a long note list never overruns the titleblock.
    // Screen CellSizeMm and PDF Solve both call this so the reserved band matches.
    function VghLantern__SheetPdfLayout__MeasureNotes(noteCount, fonts) {
        var notesCfg  =  VghLantern__SheetPdfLayout__Block('Annotations');
        if (notesCfg.Enabled === false || noteCount <= 0) return null;

        var columns      =  Math.max(1, VghLantern__SheetPdfLayout__Number(notesCfg, 'ColumnCount', FALLBACK_NOTE_COLUMNS));
        var columnGapMm  =  VghLantern__SheetPdfLayout__Number(notesCfg, 'ColumnGapMm', FALLBACK_NOTE_COL_GAP);
        var lineSpacing  =  VghLantern__SheetPdfLayout__Number(notesCfg, 'LineSpacing', FALLBACK_LINE_SPACING);
        var headingScale =  VghLantern__SheetPdfLayout__Number(notesCfg, 'HeadingScale', FALLBACK_NOTE_HEADING);
        var paddingTopMm =  VghLantern__SheetPdfLayout__Number(notesCfg, 'PaddingTopMm', FALLBACK_NOTE_PAD_TOP);
        var rows         =  Math.ceil(noteCount / columns);
        var lineMm       =  VghLantern__DrawingEditor__SheetPdfLayout__LineHeightMm(fonts.NoteMm, lineSpacing);
        var headingMm    =  VghLantern__DrawingEditor__SheetPdfLayout__LineHeightMm(fonts.NoteMm * headingScale, lineSpacing);

        return {
            Columns      : columns,
            Rows         : rows,
            ColumnGapMm  : columnGapMm,
            LineHeightMm : lineMm,
            HeadingMm    : headingMm,
            HeadingScale : headingScale,
            PaddingTopMm : paddingTopMm,
            HeightMm     : paddingTopMm + headingMm + (rows * lineMm),
            Title        : notesCfg.NotesBlockTitle || 'Notes'
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Public Notes Height Helper for Screen Cell Maths
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__SheetPdfLayout__MeasureNotesBand(noteCount) {
        return VghLantern__SheetPdfLayout__MeasureNotes(noteCount, VghLantern__SheetPdfLayout__ResolveFonts());
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Slot Placement
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Read the Grid Shares Currently in Force
    // ------------------------------------------------------------
    // Session shares set by dragging a gutter live on SheetManager and win over the
    // config defaults, so an exported sheet matches the frames on screen rather than
    // the frames the config file was authored with.
    function VghLantern__SheetPdfLayout__ActiveShares() {
        var gridCfg       =  VghLantern__SheetPdfLayout__Block('ViewGrid');
        var SheetManager  =  window.VghLantern__DrawingEditor__SheetManager;

        var session  =  (SheetManager && SheetManager.VghLantern__DrawingEditor__SheetManager__GetGridShares)
            ? SheetManager.VghLantern__DrawingEditor__SheetManager__GetGridShares()
            : null;

        return {
            ColumnSharesPct : (session && session.ColumnSharesPct) || gridCfg.ColumnSharesPct,
            RowSharesPct    : (session && session.RowSharesPct)    || gridCfg.RowSharesPct
        };
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Divide a Span Into Tracks From Percentage Shares
    // ------------------------------------------------------------
    // Shares let the grid be rebalanced away from equal halves. A missing or
    // malformed share list falls back to equal tracks, so the sheet is never left
    // undrawable by a bad config value.
    function VghLantern__SheetPdfLayout__ResolveTracks(spanMm, trackCount, gutterMm, shares) {
        var usableMm  =  spanMm - (gutterMm * (trackCount - 1));
        var weights   =  [];
        var total     =  0;
        var i, weight;

        for (i = 0; i < trackCount; i++) {
            weight  =  (Array.isArray(shares) && typeof shares[i] === 'number' && shares[i] > 0) ? shares[i] : 0;
            weights.push(weight);
            total  +=  weight;
        }

        if (total <= 0) {
            for (i = 0; i < trackCount; i++) weights[i]  =  1;
            total  =  trackCount;
        }

        var tracks    =  [];
        var cursorMm  =  0;

        for (i = 0; i < trackCount; i++) {
            tracks.push({ OffsetMm : cursorMm, SizeMm : (weights[i] / total) * usableMm });
            cursorMm  +=  tracks[i].SizeMm + gutterMm;
        }

        return tracks;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Measure a Span Across Consecutive Tracks
    // ------------------------------------------------------------
    function VghLantern__SheetPdfLayout__SpanSizeMm(tracks, startIndex, spanCount, gutterMm) {
        var sizeMm  =  0;
        var i;

        for (i = startIndex; i < startIndex + spanCount && i < tracks.length; i++) {
            sizeMm  +=  tracks[i].SizeMm;
            if (i > startIndex) sizeMm  +=  gutterMm;
        }

        return sizeMm;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place Every Configured Slot Into the Grid Rectangle
    // ------------------------------------------------------------
    // Column and row indices in config are one-based. The solved tracks are returned
    // alongside the placements because the on-screen gutter handles are positioned
    // from them - the sheet and its handles then agree by construction rather than
    // by two implementations of the same division.
    function VghLantern__SheetPdfLayout__PlaceSlots(gridRect, labelHeightMm) {
        var slots   =  VghLantern__SheetPdfLayout__Slots();
        var shares  =  VghLantern__SheetPdfLayout__ActiveShares();
        var gutter  =  gridRect.GutterMm;

        var columnTracks  =  VghLantern__SheetPdfLayout__ResolveTracks(
            gridRect.WidthMm,  gridRect.Columns, gutter, shares.ColumnSharesPct
        );
        var rowTracks     =  VghLantern__SheetPdfLayout__ResolveTracks(
            gridRect.HeightMm, gridRect.Rows,    gutter, shares.RowSharesPct
        );

        var placed  =  [];
        var i, slot, columnStart, rowStart, columnSpan, rowSpan, frame;

        for (i = 0; i < slots.length; i++) {
            slot         =  slots[i];
            columnStart  =  Math.max(1, Number(slot.ColumnStart) || 1);
            rowStart     =  Math.max(1, Number(slot.RowStart)    || 1);
            columnSpan   =  Math.max(1, Number(slot.ColumnSpan)  || 1);
            rowSpan      =  Math.max(1, Number(slot.RowSpan)     || 1);

            frame  =  {
                X        : gridRect.X + columnTracks[Math.min(columnStart - 1, columnTracks.length - 1)].OffsetMm,
                Y        : gridRect.Y + rowTracks[Math.min(rowStart - 1, rowTracks.length - 1)].OffsetMm,
                WidthMm  : VghLantern__SheetPdfLayout__SpanSizeMm(columnTracks, columnStart - 1, columnSpan, gutter),
                HeightMm : VghLantern__SheetPdfLayout__SpanSizeMm(rowTracks,    rowStart    - 1, rowSpan,    gutter)
            };

            placed.push({
                Slot  : slot,
                Frame : frame,
                Label : {
                    X        : frame.X,
                    Y        : frame.Y,
                    WidthMm  : frame.WidthMm,
                    HeightMm : labelHeightMm
                },
                Body  : {
                    X        : frame.X,
                    Y        : frame.Y + labelHeightMm,
                    WidthMm  : frame.WidthMm,
                    HeightMm : frame.HeightMm - labelHeightMm
                }
            });
        }

        return { Placed : placed, ColumnTracks : columnTracks, RowTracks : rowTracks };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Paper Size of a Sheet
    // ------------------------------------------------------------
    // Delegated to ViewportFrame rather than re-read here, so portrait swapping and
    // the sheet size table keep one owner.
    function VghLantern__DrawingEditor__SheetPdfLayout__PageSize(sheetSizeKey, orientation) {
        var ViewportFrame  =  window.VghLantern__DrawingEditor__ViewportFrame;
        if (!ViewportFrame) return null;

        return ViewportFrame.VghLantern__DrawingEditor__ViewportFrame__SheetSizeMm(sheetSizeKey, orientation);
    }
    // ------------------------------------------------------------


    // FUNCTION | Solve the Full Paper Layout for a Sheet
    // ------------------------------------------------------------
    // noteCount is supplied by the caller because the notes themselves are resolved
    // by the AnnotationLayer, which owns what a sheet actually prints.
    function VghLantern__DrawingEditor__SheetPdfLayout__Solve(sheetSize, noteCount) {
        if (!sheetSize) return null;

        var sheetCfg  =  VghLantern__SheetPdfLayout__Block('Sheet');
        var gridCfg   =  VghLantern__SheetPdfLayout__Block('ViewGrid');
        var pdfCfg    =  VghLantern__SheetPdfLayout__Block('PdfExport');

        var marginMm    =  VghLantern__SheetPdfLayout__Number(sheetCfg, 'MarginMm',            FALLBACK_MARGIN_MM);
        var titleMm     =  VghLantern__SheetPdfLayout__Number(sheetCfg, 'TitleBlockHeightMm',  FALLBACK_TITLE_MM);
        var gutterMm    =  VghLantern__SheetPdfLayout__Number(gridCfg,  'GutterMm',            FALLBACK_GUTTER_MM);
        var labelMm     =  VghLantern__SheetPdfLayout__Number(gridCfg,  'FrameLabelHeightMm',  FALLBACK_LABEL_MM);
        var blockGapMm  =  VghLantern__SheetPdfLayout__Number(sheetCfg, 'BlockGapMm',
            VghLantern__SheetPdfLayout__Number(pdfCfg, 'BlockGapMm', FALLBACK_BLOCK_GAP_MM));

        var columns  =  Math.max(1, VghLantern__SheetPdfLayout__Number(gridCfg, 'Columns', FALLBACK_COLUMNS));
        var rows     =  Math.max(1, VghLantern__SheetPdfLayout__Number(gridCfg, 'Rows',    FALLBACK_ROWS));

        var fonts  =  VghLantern__SheetPdfLayout__ResolveFonts();
        var notes  =  VghLantern__SheetPdfLayout__MeasureNotes(noteCount, fonts);

        var content  =  {
            X        : marginMm,
            Y        : marginMm,
            WidthMm  : sheetSize.WidthMm  - (marginMm * 2),
            HeightMm : sheetSize.HeightMm - (marginMm * 2)
        };

        // Bottom up: the titleblock is pinned to the foot of the content area, the
        // notes sit directly above it, and the view grid takes everything left.
        var titleBlock  =  {
            X        : content.X,
            Y        : content.Y + content.HeightMm - titleMm,
            WidthMm  : content.WidthMm,
            HeightMm : titleMm
        };

        var notesRect  =  null;
        var gridBottom =  titleBlock.Y - blockGapMm;

        if (notes) {
            notesRect  =  {
                X        : content.X,
                Y        : titleBlock.Y - blockGapMm - notes.HeightMm,
                WidthMm  : content.WidthMm,
                HeightMm : notes.HeightMm,

                Columns      : notes.Columns,
                Rows         : notes.Rows,
                ColumnGapMm  : notes.ColumnGapMm,
                LineHeightMm : notes.LineHeightMm,
                HeadingMm    : notes.HeadingMm,
                HeadingScale : notes.HeadingScale,
                PaddingTopMm : notes.PaddingTopMm || 0,
                Title        : notes.Title
            };
            gridBottom  =  notesRect.Y - blockGapMm;
        }

        var grid  =  {
            X        : content.X,
            Y        : content.Y,
            WidthMm  : content.WidthMm,
            HeightMm : Math.max(1, gridBottom - content.Y),
            GutterMm : gutterMm,
            Columns  : columns,
            Rows     : rows
        };

        var slots  =  VghLantern__SheetPdfLayout__PlaceSlots(grid, labelMm);
        grid.ColumnTracks  =  slots.ColumnTracks;
        grid.RowTracks     =  slots.RowTracks;

        return {
            Page       : {
                WidthMm     : sheetSize.WidthMm,
                HeightMm    : sheetSize.HeightMm,
                Orientation : sheetSize.Orientation,
                SizeKey     : sheetSize.Key,
                Label       : sheetSize.Label
            },
            Content    : content,
            Grid       : grid,
            Notes      : notesRect,
            TitleBlock : titleBlock,
            Slots      : slots.Placed,
            Fonts      : fonts,
            MarginMm   : marginMm,
            LabelMm    : labelMm,

            // Screen-only value, carried on the layout so the Drawing Editor has one
            // place to convert paper millimetres into laid-out pixels.
            ScreenPixelsPerMm : VghLantern__SheetPdfLayout__Number(sheetCfg, 'ScreenPixelsPerMm', 3.2)
        };
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__SheetPdfLayout__Solve             : VghLantern__DrawingEditor__SheetPdfLayout__Solve,
        VghLantern__DrawingEditor__SheetPdfLayout__PageSize          : VghLantern__DrawingEditor__SheetPdfLayout__PageSize,
        VghLantern__DrawingEditor__SheetPdfLayout__LineHeightMm      : VghLantern__DrawingEditor__SheetPdfLayout__LineHeightMm,
        VghLantern__DrawingEditor__SheetPdfLayout__MeasureNotesBand  : VghLantern__DrawingEditor__SheetPdfLayout__MeasureNotesBand
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetPdfLayout  =  VghLantern__DrawingEditor__SheetPdfLayout;
