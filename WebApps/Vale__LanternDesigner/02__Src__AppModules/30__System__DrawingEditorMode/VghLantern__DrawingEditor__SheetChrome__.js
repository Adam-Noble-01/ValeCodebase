/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | SHEET CHROME
   =============================================================================

   FILE       : VghLantern__DrawingEditor__SheetChrome__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - SheetChrome
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : One description of everything printed on a sheet that is not a view
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Turns a solved sheet layout into a flat list of paper-millimetre primitives:
     the frame boxes, the caption strips, the notes block and the titleblock.
   - Renders that one list two ways - to SVG for the on-screen sheet, and to jsPDF
     for the exported file. Both renderers walk the same primitives in the same
     order, so what the Drawing Editor shows is what the PDF contains.
   - Owns nothing about layout. SheetPdfLayout decides where things sit; this module
     decides what is drawn there and how it is painted.

   -----------------------------------------------------------------------------

   WHY THE CHROME IS BUILT ONCE AND RENDERED TWICE:
   The sheet used to be drawn by two independent authors - CSS on screen, jsPDF on
   export - and the two drifted on every value that was not a shared config number:
   font stack, weight, letter spacing, text baselines, rule colours. Anything that
   is described in only one place cannot drift, so the description moved here and
   both surfaces became dumb renderers of it.

   WHY TEXT IS MEASURED THROUGH jsPDF:
   Truncation has to make the same decision on both surfaces or a titleblock value
   clipped on paper reads in full on screen. jsPDF holds the Helvetica metrics the
   PDF will actually use, so a throwaway document is kept as the single measuring
   authority and the screen honours its answers.

   WHY BASELINES ARE COMPUTED FROM CAP HEIGHT:
   A baseline is the only vertical anchor SVG and PDF agree on exactly - line boxes,
   half-leading and flex baseline alignment are all browser-side concepts with no
   equivalent in a PDF content stream. Every text primitive therefore carries an
   absolute baseline in paper millimetres, derived from cap height so type sits
   optically centred in its strip on both surfaces.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Sheet Chrome Module
// =============================================================================

const VghLantern__DrawingEditor__SheetChrome = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Typography Metrics
    // ------------------------------------------------------------
    const MM_PER_POINT        =  0.352778;                                    // <-- One point in millimetres
    const CAP_HEIGHT_RATIO    =  0.717;                                       // <-- Helvetica cap height as a fraction of type size
    const TRUNCATION_SUFFIX   =  '...';                                       // <-- Three dots, not an ellipsis glyph, so WinAnsi is never in question
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Primitive Kinds
    // ------------------------------------------------------------
    const KIND_RECT   =  'Rect';
    const KIND_LINE   =  'Line';
    const KIND_TEXT   =  'Text';
    const KIND_IMAGE  =  'Image';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Hex Sanity Fallback for Malformed Colour Input
    // ------------------------------------------------------------
    // Rgb() below sanitises arbitrary hex strings; this is a defensive guard against
    // malformed input, not a duplicate of any single config value.
    const SANITY_INK_COLOUR      =  '#172b3a';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Measuring Document and Logo Cache
    // ------------------------------------------------------------
    // The measuring document is never written to a file; it exists only so text can
    // be measured in the same metrics the export will use. The logo is fetched once
    // per session because every sheet and every export embeds the same image.
    let VghLantern__SheetChrome__MeasureDoc  =  null;
    let VghLantern__SheetChrome__LogoAsset   =  null;                         // <-- { DataUrl, WidthPx, HeightPx }, or false once known to be unavailable
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get a Named Drawing Editor Config Block
    // ------------------------------------------------------------
    function VghLantern__SheetChrome__Block(blockName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var drawingCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
        return drawingCfg['VghLantern__DrawingEditor__Config__' + blockName] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Strictly Read a Numeric Config Value
    // ------------------------------------------------------------
    // blockName identifies which named config block is being read (e.g.
    // 'SheetStyle', 'TitleBlock') so a missing-key console error points at the
    // right place in Na__DrawingEditor__Config.json instead of always blaming SheetStyle.
    function VghLantern__SheetChrome__Number(block, key, blockName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            block, key, 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__' + (blockName || 'SheetStyle'));
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Sheet Style Every Surface Paints With
    // ------------------------------------------------------------
    // SheetStyle is the owner. PdfExport colours are read second only as a legacy
    // cross-block lookup for older config files that set colours there instead.
    function VghLantern__DrawingEditor__SheetChrome__Style() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var style  =  VghLantern__SheetChrome__Block('SheetStyle');
        var pdf    =  VghLantern__SheetChrome__Block('PdfExport');
        var LABEL  =  'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__SheetStyle';

        return {
            FontFamily   : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'FontFamily', LABEL),
            PaperColour  : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'PaperColour', LABEL),
            InkColour    : style.InkColour       || pdf.InkColour       || ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'InkColour', LABEL),
            FrameColour  : style.FrameLineColour || pdf.FrameLineColour || ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'FrameLineColour', LABEL),
            MutedColour  : style.MutedTextColour || pdf.MutedTextColour || ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'MutedTextColour', LABEL),

            FrameStrokeMm : (typeof style.FrameStrokeMm === 'number') ? style.FrameStrokeMm
                            : (typeof pdf.FrameStrokeMm === 'number') ? pdf.FrameStrokeMm
                            : VghLantern__SheetChrome__Number(style, 'FrameStrokeMm'),
            TitleStrokeMm : (typeof style.TitleStrokeMm === 'number') ? style.TitleStrokeMm
                            : (typeof pdf.TitleStrokeMm === 'number') ? pdf.TitleStrokeMm
                            : VghLantern__SheetChrome__Number(style, 'TitleStrokeMm'),
            CellPaddingMm : VghLantern__SheetChrome__Number(style, 'CellPaddingMm'),

            FrameLabelWeight        : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'FrameLabelWeight', LABEL),
            FrameLabelTrackingMm    : VghLantern__SheetChrome__Number(style, 'FrameLabelTrackingMm'),
            FrameLabelUppercase     : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(style, 'FrameLabelUppercase', LABEL),
            ScaleLabelWeight        : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'ScaleLabelWeight', LABEL),

            NotesTitleWeight        : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'NotesTitleWeight', LABEL),
            NotesTitleTrackingMm    : VghLantern__SheetChrome__Number(style, 'NotesTitleTrackingMm'),
            NotesTitleUppercase     : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(style, 'NotesTitleUppercase', LABEL),
            NoteWeight              : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'NoteWeight', LABEL),

            TitleLabelWeight        : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'TitleLabelWeight', LABEL),
            TitleLabelTrackingMm    : VghLantern__SheetChrome__Number(style, 'TitleLabelTrackingMm'),
            TitleLabelUppercase     : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(style, 'TitleLabelUppercase', LABEL),
            TitleValueWeight        : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'TitleValueWeight', LABEL)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Text Measurement
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Get the Throwaway jsPDF Document Used for Measuring
    // ------------------------------------------------------------
    // Returns null when jsPDF has not loaded, which only costs exact truncation -
    // the caller falls back to an average-advance estimate rather than failing.
    function VghLantern__SheetChrome__MeasuringDoc() {
        if (VghLantern__SheetChrome__MeasureDoc !== null) return VghLantern__SheetChrome__MeasureDoc;

        var JsPdf  =  (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
        if (!JsPdf) {
            VghLantern__SheetChrome__MeasureDoc  =  false;
            return null;
        }

        try {
            VghLantern__SheetChrome__MeasureDoc  =  new JsPdf({ unit: 'mm', format: [210, 297] });
        } catch (e) {
            VghLantern__SheetChrome__MeasureDoc  =  false;
        }

        return VghLantern__SheetChrome__MeasureDoc || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Measure a Text Run in Paper Millimetres
    // ------------------------------------------------------------
    // Tracking is added per character because both renderers add it after every
    // glyph, so it has to be inside the width the truncation test compares.
    function VghLantern__DrawingEditor__SheetChrome__MeasureTextMm(text, fontMm, weight, trackingMm) {
        var value    =  String(text === undefined || text === null ? '' : text);
        if (value === '') return 0;

        var tracking =  (typeof trackingMm === 'number' && trackingMm > 0) ? trackingMm * value.length : 0;
        var doc      =  VghLantern__SheetChrome__MeasuringDoc();

        if (!doc) return (value.length * fontMm * 0.52) + tracking;            // <-- Average Helvetica advance, good enough to keep a layout sane

        try {
            doc.setFont('helvetica', (weight === 'bold') ? 'bold' : 'normal');
            doc.setFontSize(fontMm / MM_PER_POINT);
            return doc.getTextWidth(value) + tracking;
        } catch (e) {
            return (value.length * fontMm * 0.52) + tracking;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Truncate a Text Run to a Maximum Paper Width
    // ------------------------------------------------------------
    // Both surfaces call this through the primitive builder, so a value that is cut
    // short on paper is cut short in exactly the same place on screen.
    function VghLantern__DrawingEditor__SheetChrome__FitText(text, fontMm, weight, trackingMm, maxWidthMm) {
        var value  =  String(text === undefined || text === null ? '' : text);
        if (value === '' || !(maxWidthMm > 0)) return value;

        if (VghLantern__DrawingEditor__SheetChrome__MeasureTextMm(value, fontMm, weight, trackingMm) <= maxWidthMm) return value;

        var trimmed  =  value;
        while (trimmed.length > 0) {
            trimmed  =  trimmed.slice(0, -1);
            if (VghLantern__DrawingEditor__SheetChrome__MeasureTextMm(
                    trimmed + TRUNCATION_SUFFIX, fontMm, weight, trackingMm) <= maxWidthMm) {
                return trimmed.replace(/\s+$/, '') + TRUNCATION_SUFFIX;
            }
        }

        return '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Baseline for Text Sitting Optically Centred in a Box
    // ------------------------------------------------------------
    function VghLantern__SheetChrome__BaselineCentred(boxY, boxHeightMm, fontMm) {
        return boxY + ((boxHeightMm + (fontMm * CAP_HEIGHT_RATIO)) / 2);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Baseline for Text Hung From the Top of a Region
    // ------------------------------------------------------------
    function VghLantern__SheetChrome__BaselineFromTop(topY, fontMm) {
        return topY + (fontMm * CAP_HEIGHT_RATIO);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Primitive Builders
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Push a Stroked or Filled Rectangle
    // ------------------------------------------------------------
    function VghLantern__SheetChrome__PushRect(list, x, y, widthMm, heightMm, strokeColour, strokeMm, fillColour) {
        list.push({
            Kind         : KIND_RECT,
            X            : x,
            Y            : y,
            WidthMm      : widthMm,
            HeightMm     : heightMm,
            StrokeColour : strokeColour || null,
            StrokeMm     : (typeof strokeMm === 'number') ? strokeMm : 0,
            FillColour   : fillColour || null
        });
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Push a Straight Rule
    // ------------------------------------------------------------
    function VghLantern__SheetChrome__PushLine(list, x1, y1, x2, y2, strokeColour, strokeMm) {
        list.push({
            Kind         : KIND_LINE,
            X1           : x1,
            Y1           : y1,
            X2           : x2,
            Y2           : y2,
            StrokeColour : strokeColour,
            StrokeMm     : strokeMm
        });
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Push a Text Run at an Absolute Baseline
    // ------------------------------------------------------------
    // Empty runs are dropped rather than pushed, so neither renderer has to guard
    // against a blank titleblock value.
    function VghLantern__SheetChrome__PushText(list, spec) {
        var value  =  String(spec.Text === undefined || spec.Text === null ? '' : spec.Text);
        if (value === '') return;

        list.push({
            Kind        : KIND_TEXT,
            X           : spec.X,
            BaselineY   : spec.BaselineY,
            Text        : value,
            FontMm      : spec.FontMm,
            Weight      : (spec.Weight === 'bold') ? 'bold' : 'normal',
            Colour      : spec.Colour,
            Align       : spec.Align || 'left',
            TrackingMm  : (typeof spec.TrackingMm === 'number' && spec.TrackingMm > 0) ? spec.TrackingMm : 0
        });
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Push a Placed Raster Image
    // ------------------------------------------------------------
    function VghLantern__SheetChrome__PushImage(list, x, y, widthMm, heightMm, dataUrl) {
        if (!dataUrl) return;
        list.push({
            Kind     : KIND_IMAGE,
            X        : x,
            Y        : y,
            WidthMm  : widthMm,
            HeightMm : heightMm,
            DataUrl  : dataUrl
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Frame Chrome
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Box, Caption Rule and Caption Text of One Frame
    // ------------------------------------------------------------
    // The caption is truncated against the space the scale label leaves, so a long
    // view name shortens rather than running under the quoted scale.
    function VghLantern__SheetChrome__BuildFrame(list, placement, scaleLabel, fonts, style) {
        var frame  =  placement.Frame;
        var label  =  placement.Label;
        var slot   =  placement.Slot;

        VghLantern__SheetChrome__PushRect(list, frame.X, frame.Y, frame.WidthMm, frame.HeightMm,
                                          style.FrameColour, style.FrameStrokeMm, null);
        VghLantern__SheetChrome__PushLine(list, label.X, label.Y + label.HeightMm,
                                          label.X + label.WidthMm, label.Y + label.HeightMm,
                                          style.FrameColour, style.FrameStrokeMm);

        var padMm       =  style.CellPaddingMm;
        var fontMm      =  fonts.FrameLabelMm;
        var baselineY   =  VghLantern__SheetChrome__BaselineCentred(label.Y, label.HeightMm, fontMm);
        var showScale   =  (slot.ShowScale !== false) && !!scaleLabel;
        var scaleWidth  =  showScale
            ? VghLantern__DrawingEditor__SheetChrome__MeasureTextMm(scaleLabel, fontMm, style.ScaleLabelWeight, 0)
            : 0;

        var captionText  =  String(slot.Label || slot.Key);
        if (style.FrameLabelUppercase) captionText  =  captionText.toUpperCase();

        var captionRoom  =  label.WidthMm - (padMm * 2) - (showScale ? (scaleWidth + padMm) : 0);
        captionText      =  VghLantern__DrawingEditor__SheetChrome__FitText(
            captionText, fontMm, style.FrameLabelWeight, style.FrameLabelTrackingMm, captionRoom
        );

        VghLantern__SheetChrome__PushText(list, {
            X          : label.X + padMm,
            BaselineY  : baselineY,
            Text       : captionText,
            FontMm     : fontMm,
            Weight     : style.FrameLabelWeight,
            Colour     : style.InkColour,
            Align      : 'left',
            TrackingMm : style.FrameLabelTrackingMm
        });

        if (!showScale) return;

        VghLantern__SheetChrome__PushText(list, {
            X          : label.X + label.WidthMm - padMm,
            BaselineY  : baselineY,
            Text       : scaleLabel,
            FontMm     : fontMm,
            Weight     : style.ScaleLabelWeight,
            Colour     : style.MutedColour,
            Align      : 'right'
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Notes Block Chrome
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Rule, Heading and Numbered Notes
    // ------------------------------------------------------------
    // Filled column by column so the numbering reads down then across, which is the
    // order a reader scans a two-column note list in.
    function VghLantern__SheetChrome__BuildNotes(list, layout, notes, fonts, style) {
        var rect  =  layout.Notes;
        if (!rect || !notes || !notes.length) return;

        // PaddingTopMm, HeadingScale and Title are already resolved strictly from
        // config by SheetPdfLayout, so no fallback is needed (or wanted) here.
        var padTopMm     =  rect.PaddingTopMm;
        var headingFont  =  fonts.NoteMm * rect.HeadingScale;
        var originY      =  rect.Y + padTopMm;

        VghLantern__SheetChrome__PushLine(list, rect.X, rect.Y, rect.X + rect.WidthMm, rect.Y,
                                          style.FrameColour, style.FrameStrokeMm);

        var headingText  =  String(rect.Title);
        if (style.NotesTitleUppercase) headingText  =  headingText.toUpperCase();

        VghLantern__SheetChrome__PushText(list, {
            X          : rect.X,
            BaselineY  : VghLantern__SheetChrome__BaselineFromTop(originY, headingFont),
            Text       : headingText,
            FontMm     : headingFont,
            Weight     : style.NotesTitleWeight,
            Colour     : style.InkColour,
            Align      : 'left',
            TrackingMm : style.NotesTitleTrackingMm
        });

        var columnWidth  =  (rect.WidthMm - (rect.ColumnGapMm * (rect.Columns - 1))) / rect.Columns;
        var i, columnIndex, rowIndex, textX, baselineY, noteText;

        for (i = 0; i < notes.length; i++) {
            columnIndex  =  Math.floor(i / rect.Rows);
            rowIndex     =  i % rect.Rows;

            textX      =  rect.X + (columnIndex * (columnWidth + rect.ColumnGapMm));
            baselineY  =  VghLantern__SheetChrome__BaselineFromTop(
                originY + rect.HeadingMm + (rowIndex * rect.LineHeightMm), fonts.NoteMm
            );

            noteText  =  VghLantern__DrawingEditor__SheetChrome__FitText(
                (i + 1) + '. ' + String(notes[i].Text || ''), fonts.NoteMm, style.NoteWeight, 0, columnWidth
            );

            VghLantern__SheetChrome__PushText(list, {
                X         : textX,
                BaselineY : baselineY,
                Text      : noteText,
                FontMm    : fonts.NoteMm,
                Weight    : style.NoteWeight,
                Colour    : style.InkColour,
                Align     : 'left'
            });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Titleblock Chrome
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Solve the Logo Cell and the Image Rectangle Inside It
    // ------------------------------------------------------------
    // The image is fitted inside the padded cell and capped at the configured max
    // height, preserving its own aspect. Returned even when there is no image, so
    // the field strip always starts at the same x.
    function VghLantern__SheetChrome__SolveLogo(titleRect, titleCfg, logoAsset) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var cellWidthMm  =  VghLantern__SheetChrome__Number(titleCfg, 'LogoCellWidthMm', 'TitleBlock');

        var solved  =  { CellWidthMm : cellWidthMm || 0, Image : null };
        var showLogo  =  ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(
            titleCfg, 'ShowValeLogo', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__TitleBlock');
        if (!cellWidthMm || !logoAsset || !logoAsset.DataUrl || !showLogo) return solved;

        var padVMm      =  VghLantern__SheetChrome__Number(titleCfg, 'LogoPaddingVMm', 'TitleBlock');
        var padHMm      =  VghLantern__SheetChrome__Number(titleCfg, 'LogoPaddingHMm', 'TitleBlock');
        var maxHeightMm =  VghLantern__SheetChrome__Number(titleCfg, 'LogoMaxHeightMm', 'TitleBlock');
        var aspect      =  logoAsset.HeightPx / logoAsset.WidthPx;

        var widthMm   =  VghLantern__SheetChrome__Number(titleCfg, 'LogoWidthMm', 'TitleBlock');
        var heightMm  =  widthMm * aspect;

        var roomWidthMm   =  Math.max(0, cellWidthMm - (padHMm * 2));
        var roomHeightMm  =  Math.max(0, Math.min(maxHeightMm, titleRect.HeightMm - (padVMm * 2)));

        if (roomWidthMm > 0 && widthMm > roomWidthMm) {
            widthMm   =  roomWidthMm;
            heightMm  =  widthMm * aspect;
        }
        if (roomHeightMm > 0 && heightMm > roomHeightMm) {
            heightMm  =  roomHeightMm;
            widthMm   =  heightMm / aspect;
        }

        solved.Image  =  {
            X        : titleRect.X + ((cellWidthMm - widthMm) / 2),
            Y        : titleRect.Y + ((titleRect.HeightMm - heightMm) / 2),
            WidthMm  : widthMm,
            HeightMm : heightMm,
            DataUrl  : logoAsset.DataUrl
        };

        return solved;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Single Row Titleblock Strip
    // ------------------------------------------------------------
    // Row WidthMm values are relative shares of the field strip, not absolute
    // widths, so adding a row rebalances the strip instead of overflowing it.
    function VghLantern__SheetChrome__BuildTitleBlock(list, layout, fields, fonts, style, logoAsset) {
        var rect      =  layout.TitleBlock;
        var titleCfg  =  VghLantern__SheetChrome__Block('TitleBlock');
        var rows      =  Array.isArray(titleCfg.Rows) ? titleCfg.Rows : [];

        VghLantern__SheetChrome__PushRect(list, rect.X, rect.Y, rect.WidthMm, rect.HeightMm,
                                          style.InkColour, style.TitleStrokeMm, null);

        var logo  =  VghLantern__SheetChrome__SolveLogo(rect, titleCfg, logoAsset);
        if (logo.Image) {
            VghLantern__SheetChrome__PushImage(list, logo.Image.X, logo.Image.Y,
                                               logo.Image.WidthMm, logo.Image.HeightMm, logo.Image.DataUrl);
        }

        if (logo.CellWidthMm > 0) {
            VghLantern__SheetChrome__PushLine(list, rect.X + logo.CellWidthMm, rect.Y,
                                              rect.X + logo.CellWidthMm, rect.Y + rect.HeightMm,
                                              style.InkColour, style.TitleStrokeMm);
        }
        if (!rows.length) return;

        var fieldsX      =  rect.X + logo.CellWidthMm;
        var fieldsWidth  =  rect.WidthMm - logo.CellWidthMm;
        var padHMm       =  VghLantern__SheetChrome__Number(titleCfg, 'FieldPaddingHMm', 'TitleBlock');
        var padTopMm     =  VghLantern__SheetChrome__Number(titleCfg, 'FieldPaddingTopMm', 'TitleBlock');
        var padBottomMm  =  VghLantern__SheetChrome__Number(titleCfg, 'FieldPaddingBottomMm', 'TitleBlock');
        var labelTopMm   =  VghLantern__SheetChrome__Number(titleCfg, 'FieldLabelOffsetTopMm', 'TitleBlock');

        var totalShare  =  0;
        var i, share;
        for (i = 0; i < rows.length; i++) {
            totalShare  +=  (typeof rows[i].WidthMm === 'number' && rows[i].WidthMm > 0) ? rows[i].WidthMm : 1;
        }
        if (totalShare <= 0) return;

        // The value sits centred in the cell below the label band, which is what the
        // titleblock reads as: a small caption over a strong value.
        var valueBandY   =  rect.Y + padTopMm;
        var valueBandH   =  Math.max(0, rect.HeightMm - padTopMm - padBottomMm);
        var valueBaseY   =  VghLantern__SheetChrome__BaselineCentred(valueBandY, valueBandH, fonts.TitleValueMm);
        var labelBaseY   =  VghLantern__SheetChrome__BaselineFromTop(rect.Y + labelTopMm, fonts.TitleLabelMm);

        var cursorX  =  fieldsX;
        var cellWidth, textRoom, labelText, valueText;

        for (i = 0; i < rows.length; i++) {
            share      =  (typeof rows[i].WidthMm === 'number' && rows[i].WidthMm > 0) ? rows[i].WidthMm : 1;
            cellWidth  =  (share / totalShare) * fieldsWidth;
            textRoom   =  Math.max(0, cellWidth - (padHMm * 2));

            if (i > 0) {
                VghLantern__SheetChrome__PushLine(list, cursorX, rect.Y, cursorX, rect.Y + rect.HeightMm,
                                                  style.FrameColour, style.FrameStrokeMm);
            }

            labelText  =  String(rows[i].Label || rows[i].Key || '');
            if (style.TitleLabelUppercase) labelText  =  labelText.toUpperCase();
            labelText  =  VghLantern__DrawingEditor__SheetChrome__FitText(
                labelText, fonts.TitleLabelMm, style.TitleLabelWeight, style.TitleLabelTrackingMm, textRoom
            );

            valueText  =  VghLantern__DrawingEditor__SheetChrome__FitText(
                String(fields[rows[i].Key] || ''), fonts.TitleValueMm, style.TitleValueWeight, 0, textRoom
            );

            VghLantern__SheetChrome__PushText(list, {
                X          : cursorX + padHMm,
                BaselineY  : labelBaseY,
                Text       : labelText,
                FontMm     : fonts.TitleLabelMm,
                Weight     : style.TitleLabelWeight,
                Colour     : style.MutedColour,
                Align      : 'left',
                TrackingMm : style.TitleLabelTrackingMm
            });

            VghLantern__SheetChrome__PushText(list, {
                X         : cursorX + padHMm,
                BaselineY : valueBaseY,
                Text      : valueText,
                FontMm    : fonts.TitleValueMm,
                Weight    : style.TitleValueWeight,
                Colour    : style.InkColour,
                Align     : 'left'
            });

            cursorX  +=  cellWidth;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Logo Asset
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Vale Logo Once Per Session
    // ------------------------------------------------------------
    // Resolves to null on any failure so a missing asset costs the logo, never the
    // sheet or the export. Both surfaces await this before building primitives, so
    // the logo rectangle is identical on paper and on screen.
    function VghLantern__DrawingEditor__SheetChrome__LoadLogo() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var titleCfg  =  VghLantern__SheetChrome__Block('TitleBlock');
        var logoPath  =  titleCfg.LogoAssetPath;

        if (!logoPath || !ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(
                titleCfg, 'ShowValeLogo', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__TitleBlock')) {
            return Promise.resolve(null);
        }
        if (VghLantern__SheetChrome__LogoAsset !== null) {
            return Promise.resolve(VghLantern__SheetChrome__LogoAsset || null);
        }

        return new Promise(function(resolve) {
            var image  =  new Image();

            image.onload  =  function() {
                var canvas     =  document.createElement('canvas');
                canvas.width   =  image.naturalWidth;
                canvas.height  =  image.naturalHeight;
                canvas.getContext('2d').drawImage(image, 0, 0);

                try {
                    VghLantern__SheetChrome__LogoAsset  =  {
                        DataUrl  : canvas.toDataURL('image/png'),
                        WidthPx  : image.naturalWidth,
                        HeightPx : image.naturalHeight
                    };
                } catch (taintError) {
                    VghLantern__SheetChrome__LogoAsset  =  false;              // <-- Canvas tainted; never retry
                }
                resolve(VghLantern__SheetChrome__LogoAsset || null);
            };

            image.onerror  =  function() {
                VghLantern__SheetChrome__LogoAsset  =  false;
                resolve(null);
            };

            image.src  =  logoPath;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Cached Logo Without Waiting
    // ------------------------------------------------------------
    // For redraws that must stay synchronous, such as a live gutter drag. Returns
    // null until the first LoadLogo has settled, which only costs the logo on a
    // frame nobody has finished dragging yet.
    function VghLantern__DrawingEditor__SheetChrome__CachedLogo() {
        return VghLantern__SheetChrome__LogoAsset || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Primitive Assembly
// -----------------------------------------------------------------------------

    // FUNCTION | Build Every Chrome Primitive for a Solved Layout
    // ------------------------------------------------------------
    // context is { ScaleLabel, Notes, Fields, LogoAsset }. Nothing here reads the
    // DOM or the exporter, so the same call serves both surfaces.
    function VghLantern__DrawingEditor__SheetChrome__Build(layout, context) {
        if (!layout) return [];

        var ctx    =  context || {};
        var style  =  VghLantern__DrawingEditor__SheetChrome__Style();
        var fonts  =  layout.Fonts || {};
        var list   =  [];
        var i;

        for (i = 0; i < layout.Slots.length; i++) {
            VghLantern__SheetChrome__BuildFrame(list, layout.Slots[i], ctx.ScaleLabel || '', fonts, style);
        }

        VghLantern__SheetChrome__BuildNotes(list, layout, ctx.Notes || [], fonts, style);
        VghLantern__SheetChrome__BuildTitleBlock(list, layout, ctx.Fields || {}, fonts, style, ctx.LogoAsset || null);

        return list;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build Chrome Primitives for a Project's Sheet
    // ------------------------------------------------------------
    // The one call both the Drawing Editor and the PDF exporter make. Resolving the
    // notes, the titleblock fields and the scale label here rather than in each
    // caller is what stops a sheet and its export quoting different values.
    // Deliberately synchronous - hand it the logo from LoadLogo or CachedLogo.
    function VghLantern__DrawingEditor__SheetChrome__BuildForSheet(layout, project, lantern, logoAsset) {
        var AnnotationLayer  =  window.VghLantern__DrawingEditor__AnnotationLayer;
        var TitleBlock       =  window.VghLantern__DrawingEditor__TitleBlockRenderer;
        var ScaleManager     =  window.VghLantern__DrawingEditor__ScaleManager;

        return VghLantern__DrawingEditor__SheetChrome__Build(layout, {
            ScaleLabel : ScaleManager ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__FormatLabel() : '',
            Notes      : AnnotationLayer
                ? AnnotationLayer.VghLantern__DrawingEditor__AnnotationLayer__CollectNotes(project)
                : [],
            Fields     : TitleBlock
                ? TitleBlock.VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields(project, lantern)
                : {},
            LogoAsset  : logoAsset || null
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | SVG Renderer
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__SheetChrome__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Map a Primitive Alignment to an SVG Text Anchor
    // ------------------------------------------------------------
    function VghLantern__SheetChrome__TextAnchor(align) {
        if (align === 'right')  return 'end';
        if (align === 'center') return 'middle';
        return 'start';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Serialise One Primitive to SVG Markup
    // ------------------------------------------------------------
    function VghLantern__SheetChrome__PrimitiveToSvg(primitive, style) {
        if (primitive.Kind === KIND_RECT) {
            return '<rect x="' + primitive.X + '" y="' + primitive.Y + '" ' +
                   'width="' + primitive.WidthMm + '" height="' + primitive.HeightMm + '" ' +
                   'fill="' + (primitive.FillColour || 'none') + '" ' +
                   'stroke="' + (primitive.StrokeColour || 'none') + '" ' +
                   'stroke-width="' + primitive.StrokeMm + '"/>';
        }

        if (primitive.Kind === KIND_LINE) {
            return '<line x1="' + primitive.X1 + '" y1="' + primitive.Y1 + '" ' +
                   'x2="' + primitive.X2 + '" y2="' + primitive.Y2 + '" ' +
                   'stroke="' + primitive.StrokeColour + '" stroke-width="' + primitive.StrokeMm + '"/>';
        }

        if (primitive.Kind === KIND_TEXT) {
            // dominant-baseline is left alphabetic, which is the baseline jsPDF also
            // writes text against, so the two surfaces sit type on the same line.
            return '<text x="' + primitive.X + '" y="' + primitive.BaselineY + '" ' +
                   'font-family="' + VghLantern__SheetChrome__Escape(style.FontFamily) + '" ' +
                   'font-size="' + primitive.FontMm + '" ' +
                   'font-weight="' + (primitive.Weight === 'bold' ? '700' : '400') + '" ' +
                   'fill="' + primitive.Colour + '" ' +
                   'text-anchor="' + VghLantern__SheetChrome__TextAnchor(primitive.Align) + '" ' +
                   (primitive.TrackingMm ? 'letter-spacing="' + primitive.TrackingMm + '" ' : '') +
                   'xml:space="preserve">' + VghLantern__SheetChrome__Escape(primitive.Text) + '</text>';
        }

        if (primitive.Kind === KIND_IMAGE) {
            return '<image x="' + primitive.X + '" y="' + primitive.Y + '" ' +
                   'width="' + primitive.WidthMm + '" height="' + primitive.HeightMm + '" ' +
                   'preserveAspectRatio="xMidYMid meet" ' +
                   'href="' + primitive.DataUrl + '"/>';
        }

        return '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Primitives to a Standalone SVG Overlay
    // ------------------------------------------------------------
    // The viewBox is the paper in millimetres, so every primitive coordinate is used
    // verbatim and the browser does the millimetre-to-pixel mapping in one place.
    function VghLantern__DrawingEditor__SheetChrome__ToSvgMarkup(primitives, pageWidthMm, pageHeightMm, cssClassName) {
        var style  =  VghLantern__DrawingEditor__SheetChrome__Style();
        var body   =  '';
        var i;

        for (i = 0; i < primitives.length; i++) {
            body  +=  VghLantern__SheetChrome__PrimitiveToSvg(primitives[i], style);
        }

        return '<svg xmlns="http://www.w3.org/2000/svg" ' +
               'class="' + (cssClassName || '') + '" ' +
               'viewBox="0 0 ' + pageWidthMm + ' ' + pageHeightMm + '" ' +
               'preserveAspectRatio="none" focusable="false" aria-hidden="true">' +
               body + '</svg>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | PDF Renderer
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert a Hex Colour to an RGB Triplet
    // ------------------------------------------------------------
    // Converted here rather than handed to jsPDF as a string, so a malformed config
    // value cannot silently paint something black in an issued drawing.
    function VghLantern__SheetChrome__Rgb(hexColour) {
        var value  =  String(hexColour || '').trim();
        if (!/^#?[0-9a-fA-F]{6}$/.test(value)) value  =  SANITY_INK_COLOUR;

        value  =  value.replace('#', '');

        return {
            R : parseInt(value.substring(0, 2), 16),
            G : parseInt(value.substring(2, 4), 16),
            B : parseInt(value.substring(4, 6), 16)
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw One Primitive Into a jsPDF Document
    // ------------------------------------------------------------
    function VghLantern__SheetChrome__PrimitiveToPdf(doc, primitive) {
        var stroke, fill;

        if (primitive.Kind === KIND_RECT) {
            if (primitive.FillColour) {
                fill  =  VghLantern__SheetChrome__Rgb(primitive.FillColour);
                doc.setFillColor(fill.R, fill.G, fill.B);
            }
            if (primitive.StrokeColour) {
                stroke  =  VghLantern__SheetChrome__Rgb(primitive.StrokeColour);
                doc.setDrawColor(stroke.R, stroke.G, stroke.B);
                doc.setLineWidth(primitive.StrokeMm);
            }

            doc.rect(primitive.X, primitive.Y, primitive.WidthMm, primitive.HeightMm,
                     primitive.FillColour ? (primitive.StrokeColour ? 'FD' : 'F') : 'S');
            return;
        }

        if (primitive.Kind === KIND_LINE) {
            stroke  =  VghLantern__SheetChrome__Rgb(primitive.StrokeColour);
            doc.setDrawColor(stroke.R, stroke.G, stroke.B);
            doc.setLineWidth(primitive.StrokeMm);
            doc.line(primitive.X1, primitive.Y1, primitive.X2, primitive.Y2);
            return;
        }

        if (primitive.Kind === KIND_TEXT) {
            var ink  =  VghLantern__SheetChrome__Rgb(primitive.Colour);
            doc.setFont('helvetica', primitive.Weight);
            doc.setFontSize(primitive.FontMm / MM_PER_POINT);
            doc.setTextColor(ink.R, ink.G, ink.B);
            doc.text(primitive.Text, primitive.X, primitive.BaselineY, {
                align     : primitive.Align,
                baseline  : 'alphabetic',
                charSpace : primitive.TrackingMm
            });
            return;
        }

        if (primitive.Kind === KIND_IMAGE) {
            doc.addImage(primitive.DataUrl, 'PNG', primitive.X, primitive.Y, primitive.WidthMm, primitive.HeightMm);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Primitives Into a jsPDF Document
    // ------------------------------------------------------------
    // Walked in build order, which is the order the SVG overlay stacks them in, so
    // anything that overlaps overlaps the same way on both surfaces.
    function VghLantern__DrawingEditor__SheetChrome__DrawToPdf(doc, primitives) {
        var i;
        for (i = 0; i < primitives.length; i++) {
            try {
                VghLantern__SheetChrome__PrimitiveToPdf(doc, primitives[i]);
            } catch (drawError) {
                console.warn('[VghLantern__DrawingEditor__SheetChrome] Primitive could not be drawn:', primitives[i], drawError);
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__SheetChrome__Build          : VghLantern__DrawingEditor__SheetChrome__Build,
        VghLantern__DrawingEditor__SheetChrome__BuildForSheet  : VghLantern__DrawingEditor__SheetChrome__BuildForSheet,
        VghLantern__DrawingEditor__SheetChrome__CachedLogo     : VghLantern__DrawingEditor__SheetChrome__CachedLogo,
        VghLantern__DrawingEditor__SheetChrome__ToSvgMarkup    : VghLantern__DrawingEditor__SheetChrome__ToSvgMarkup,
        VghLantern__DrawingEditor__SheetChrome__DrawToPdf      : VghLantern__DrawingEditor__SheetChrome__DrawToPdf,
        VghLantern__DrawingEditor__SheetChrome__LoadLogo       : VghLantern__DrawingEditor__SheetChrome__LoadLogo,
        VghLantern__DrawingEditor__SheetChrome__Style          : VghLantern__DrawingEditor__SheetChrome__Style,
        VghLantern__DrawingEditor__SheetChrome__MeasureTextMm  : VghLantern__DrawingEditor__SheetChrome__MeasureTextMm,
        VghLantern__DrawingEditor__SheetChrome__FitText        : VghLantern__DrawingEditor__SheetChrome__FitText
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetChrome  =  VghLantern__DrawingEditor__SheetChrome;
