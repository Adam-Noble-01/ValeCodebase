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
   - No DOM, no jsPDF, no config writing. SheetSurface lays the screen sheet out from
     this and SheetPdfPainter draws the page from it; this module decides nothing
     about appearance.
   - Owns the sheet size table, so the paper dimensions of an A4, A3, A2 or A1 sheet
     have exactly one definition in the application.

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

     Page         { WidthMm, HeightMm, Orientation, SizeKey, Label }
     Content      { X, Y, WidthMm, HeightMm }         inside the sheet margins
     Grid         { X, Y, WidthMm, HeightMm, GutterMm, Columns, Rows,
                    ColumnTracks, RowTracks }        tracks are { OffsetMm, SizeMm }
     TitleBlock   { X, Y, WidthMm, HeightMm }         full content width; the logo
                                                      and terms cells are solved
                                                      inside it by SheetChrome
     Slots        [ { Slot, Frame, Label, Body } ]    one entry per configured slot
     Fonts        { ... }                             millimetre type sizes
     LabelMm      caption strip height
     ScreenPixelsPerMm                                screen scaling only

   ============================================================================= */

// =============================================================================
// REGION | Drawing Sheet PDF Layout Module
// =============================================================================

const VghLantern__DrawingEditor__SheetPdfLayout = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

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


    // HELPER FUNCTION | Strictly Read a Numeric Config Value
    // ------------------------------------------------------------
    // No fallbacks - a missing key must be fixed in JSON, not papered over here.
    function VghLantern__SheetPdfLayout__Number(block, key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            block, key, 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__*');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Required String from a Named Config Block
    // ------------------------------------------------------------
    function VghLantern__SheetPdfLayout__String(block, key) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            block, key, 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__*');
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
    // The terms cell has no type sizes of its own: it is a titleblock cell and uses
    // the strip's own label and value sizes, which is most of what makes it read as
    // part of the titleblock rather than as a box parked next to it.
    function VghLantern__SheetPdfLayout__ResolveFonts() {
        var gridCfg   =  VghLantern__SheetPdfLayout__Block('ViewGrid');
        var titleCfg  =  VghLantern__SheetPdfLayout__Block('TitleBlock');

        return {
            FrameLabelMm : VghLantern__SheetPdfLayout__Number(gridCfg,  'FrameLabelFontSizeMm'),
            TitleLabelMm : VghLantern__SheetPdfLayout__Number(titleCfg, 'FontSizeLabelMm'),
            TitleValueMm : VghLantern__SheetPdfLayout__Number(titleCfg, 'FontSizeValueMm')
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Line Box Height for a Millimetre Type Size
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__SheetPdfLayout__LineHeightMm(fontSizeMm, lineSpacing) {
        return fontSizeMm * lineSpacing;
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
    // The sheet size table has one reader, here, because paper dimensions are the
    // first input to every rectangle this module solves. Config lists sizes landscape
    // (long edge first); portrait swaps them here so a size is only described once.
    function VghLantern__DrawingEditor__SheetPdfLayout__SheetSizeMm(sheetSizeKey, orientation) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var sheetCfg      =  VghLantern__SheetPdfLayout__Block('Sheet');
        var sizes         =  sheetCfg.SheetSizes || {};
        var resolvedKey   =  sheetSizeKey || sheetCfg.DefaultSheetSize;
        var entry         =  sizes[resolvedKey];

        if (!entry) return null;

        var resolvedOrientation  =  orientation || ConfigLoader.VghLantern__ConfigLoader__RequireString(
            sheetCfg, 'DefaultOrientation', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__Sheet');
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


    // FUNCTION | Solve the Full Paper Layout for a Sheet
    // ------------------------------------------------------------
    // A pure function of the paper size and the session grid shares. It used to take
    // a note count as well, because the notes block grew with the number of notes;
    // the terms callout that replaced it is the same size on every sheet.
    function VghLantern__DrawingEditor__SheetPdfLayout__Solve(sheetSize) {
        if (!sheetSize) return null;

        var sheetCfg  =  VghLantern__SheetPdfLayout__Block('Sheet');
        var gridCfg   =  VghLantern__SheetPdfLayout__Block('ViewGrid');
        var pdfCfg    =  VghLantern__SheetPdfLayout__Block('PdfExport');

        var marginMm    =  VghLantern__SheetPdfLayout__Number(sheetCfg, 'MarginMm');
        var titleMm     =  VghLantern__SheetPdfLayout__Number(sheetCfg, 'TitleBlockHeightMm');
        var gutterMm    =  VghLantern__SheetPdfLayout__Number(gridCfg,  'GutterMm');
        var labelMm     =  VghLantern__SheetPdfLayout__Number(gridCfg,  'FrameLabelHeightMm');
        var blockGapMm  =  (typeof sheetCfg.BlockGapMm === 'number')
            ? sheetCfg.BlockGapMm
            : VghLantern__SheetPdfLayout__Number(pdfCfg, 'BlockGapMm');

        var columns  =  Math.max(1, VghLantern__SheetPdfLayout__Number(gridCfg, 'Columns'));
        var rows     =  Math.max(1, VghLantern__SheetPdfLayout__Number(gridCfg, 'Rows'));

        var fonts  =  VghLantern__SheetPdfLayout__ResolveFonts();

        var content  =  {
            X        : marginMm,
            Y        : marginMm,
            WidthMm  : sheetSize.WidthMm  - (marginMm * 2),
            HeightMm : sheetSize.HeightMm - (marginMm * 2)
        };

        // Bottom up: the titleblock strip is pinned to the foot of the content area and
        // the view grid takes everything above it. The terms cell is a cell WITHIN that
        // strip, like the logo cell, so it costs the layout no height of its own and is
        // solved by SheetChrome alongside the other cells rather than reserved here.
        var titleBlock  =  {
            X        : content.X,
            Y        : content.Y + content.HeightMm - titleMm,
            WidthMm  : content.WidthMm,
            HeightMm : titleMm
        };

        var gridBottom  =  titleBlock.Y - blockGapMm;

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
            Content      : content,
            Grid         : grid,
            TitleBlock   : titleBlock,
            Slots        : slots.Placed,
            Fonts        : fonts,
            MarginMm     : marginMm,
            LabelMm      : labelMm,

            // Screen-only value, carried on the layout so the Drawing Editor has one
            // place to convert paper millimetres into laid-out pixels.
            ScreenPixelsPerMm : VghLantern__SheetPdfLayout__Number(sheetCfg, 'ScreenPixelsPerMm')
        };
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__SheetPdfLayout__Solve             : VghLantern__DrawingEditor__SheetPdfLayout__Solve,
        VghLantern__DrawingEditor__SheetPdfLayout__SheetSizeMm       : VghLantern__DrawingEditor__SheetPdfLayout__SheetSizeMm
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetPdfLayout  =  VghLantern__DrawingEditor__SheetPdfLayout;
