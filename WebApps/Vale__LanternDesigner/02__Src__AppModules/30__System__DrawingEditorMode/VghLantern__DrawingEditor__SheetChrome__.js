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
    const ORDINAL_SUFFIX_PATTERN  =  /^(\d{1,2})(st|nd|rd|th)(.*)$/i;         // <-- Splits "07th Aug 2026" into day / suffix / tail for the titleblock date
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Primitive Kinds
    // ------------------------------------------------------------
    const KIND_RECT   =  'Rect';
    const KIND_LINE   =  'Line';
    const KIND_TEXT   =  'Text';
    const KIND_IMAGE  =  'Image';
    const KIND_QR     =  'Qr';                                                // <-- A module matrix, expanded to rectangles by each renderer
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
    // SheetStyle is the sole owner. These values used to fall back to a duplicate set
    // under PdfExport, which meant a colour could be changed in the obvious place and
    // silently overridden from the other one.
    function VghLantern__DrawingEditor__SheetChrome__Style() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var style  =  VghLantern__SheetChrome__Block('SheetStyle');
        var LABEL  =  'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__SheetStyle';

        return {
            FontFamily   : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'FontFamily', LABEL),
            PaperColour  : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'PaperColour', LABEL),
            InkColour    : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'InkColour', LABEL),
            FrameColour  : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'FrameLineColour', LABEL),
            MutedColour  : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'MutedTextColour', LABEL),

            FrameStrokeMm : VghLantern__SheetChrome__Number(style, 'FrameStrokeMm'),
            TitleStrokeMm : VghLantern__SheetChrome__Number(style, 'TitleStrokeMm'),
            CellPaddingMm : VghLantern__SheetChrome__Number(style, 'CellPaddingMm'),

            FrameLabelWeight        : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'FrameLabelWeight', LABEL),
            FrameLabelTrackingMm    : VghLantern__SheetChrome__Number(style, 'FrameLabelTrackingMm'),
            FrameLabelUppercase     : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(style, 'FrameLabelUppercase', LABEL),
            ScaleLabelWeight        : ConfigLoader.VghLantern__ConfigLoader__RequireString(style, 'ScaleLabelWeight', LABEL),


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

        // A view with no true scale (a perspective 3D view, say) still gets the same
        // right-hand slot filled - with a static note rather than a quoted ratio - so
        // the reader is told the omission was deliberate, not a rendering fault.
        var scaleText   =  ((slot.ShowScale !== false) && scaleLabel) ? scaleLabel : (slot.ScaleNoteLabel || '');
        var showScale   =  !!scaleText;
        var scaleWidth  =  showScale
            ? VghLantern__DrawingEditor__SheetChrome__MeasureTextMm(scaleText, fontMm, style.ScaleLabelWeight, 0)
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
            Text       : scaleText,
            FontMm     : fontMm,
            Weight     : style.ScaleLabelWeight,
            Colour     : style.MutedColour,
            Align      : 'right'
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Terms Callout Chrome
// -----------------------------------------------------------------------------
//
// This block replaced the sheet's numbered notes list. Those notes were three
// standing sentences about millimetres and figured dimensions, which are now clauses
// in the project's own terms document rather than a summary printed beside the views.
// What sits here instead is the instruction to go and read that document, and the
// code that takes the reader to it.

    // HELPER FUNCTION | Get the Drawing QR Block From the Terms Config
    // ------------------------------------------------------------
    // Owned by the terms system, not the Drawing Editor, because the address it
    // encodes has to have exactly one home when the hosted terms page replaces the
    // placeholder.
    function VghLantern__SheetChrome__TermsBlock() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var termsCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Terms') || {};
        return termsCfg['VghLantern__Terms__Config__DrawingQrBlock'] || {};
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Push a QR Symbol as a Module Matrix
    // ------------------------------------------------------------
    // The matrix travels on the primitive rather than being expanded here, so each
    // renderer emits it in its own idiom and the symbol is vector on both surfaces.
    function VghLantern__SheetChrome__PushQr(list, x, y, sizeMm, encoded, darkColour, lightColour) {
        if (!encoded || !encoded.Modules) return;

        list.push({
            Kind        : KIND_QR,
            X           : x,
            Y           : y,
            SizeMm      : sizeMm,
            ModuleCount : encoded.Size,
            Modules     : encoded.Modules,
            DarkColour  : darkColour,
            LightColour : lightColour
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Solve the Terms Cell and the QR Square Inside It
    // ------------------------------------------------------------
    // Mirrors SolveLogo at the other end of the strip: an absolute width taken off the
    // right, with the field cells dividing what is left between them. Returned even
    // when there is no code to draw, so the field strip always ends at the same x.
    //
    // The QR is square and exactly as tall as the strip allows, so its printed size
    // needs no dimension of its own - change the titleblock height and the code
    // follows it.
    function VghLantern__SheetChrome__SolveTermsCell(titleRect, project, lantern, lanternIndex) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var QrEncoder     =  window.VghLantern__AppUtils__QrEncoder;
        var QrLink        =  window.VghLantern__Terms__QrLink;

        var config  =  VghLantern__SheetChrome__TermsBlock();
        var LABEL   =  'Na__Terms__Config.json -> VghLantern__Terms__Config__DrawingQrBlock';

        var solved  =  { CellWidthMm : 0, Qr : null, Config : config };

        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(config, 'Enabled', LABEL)) return solved;

        solved.CellWidthMm  =  VghLantern__SheetChrome__Number(config, 'CellWidthMm', 'DrawingQrBlock');
        if (!solved.CellWidthMm) return solved;

        // The lantern is named in the code so a scanned sheet lands on that sheet's
        // own notes. Every sheet in a multi-lantern pack therefore carries a slightly
        // different code, which is the point - one code for four drawings tells the
        // reader nothing about the drawing in front of them.
        var url      =  QrLink ? QrLink.VghLantern__Terms__QrLink__BuildUrl(project, lantern, lanternIndex) : '';
        var encoded  =  (url && QrEncoder) ? QrEncoder.VghLantern__AppUtils__QrEncoder__Encode(url) : null;
        if (!encoded) return solved;                                           // <-- Cell without a code beats a code that scans to nothing

        var padMm     =  VghLantern__SheetChrome__Number(config, 'QrPaddingMm', 'DrawingQrBlock');
        var sizeMm    =  Math.max(0, titleRect.HeightMm - (padMm * 2));

        solved.Qr  =  {
            X        : titleRect.X + titleRect.WidthMm - padMm - sizeMm,
            Y        : titleRect.Y + padMm,
            SizeMm   : sizeMm,
            Encoded  : encoded
        };

        return solved;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Wrap Text to a Maximum Paper Width
    // ------------------------------------------------------------
    // Greedy wrap measured against the same document the truncation test uses, so the
    // body breaks in the same place on screen as it does on paper.
    function VghLantern__SheetChrome__WrapText(text, fontMm, weight, maxWidthMm, maxLines) {
        var words    =  String(text || '').split(/\s+/).filter(function(word) { return word !== ''; });
        var lines    =  [];
        var current  =  '';
        var i, candidate;

        for (i = 0; i < words.length; i++) {
            candidate  =  (current === '') ? words[i] : (current + ' ' + words[i]);

            if (VghLantern__DrawingEditor__SheetChrome__MeasureTextMm(candidate, fontMm, weight, 0) <= maxWidthMm) {
                current  =  candidate;
                continue;
            }

            if (current !== '') lines.push(current);
            current  =  words[i];

            // The last line the cell can hold takes whatever is left, truncated, so
            // the copy ends in an ellipsis rather than silently losing its tail.
            if (lines.length === maxLines - 1) {
                current  =  words.slice(i).join(' ');
                break;
            }
        }

        if (current !== '' && lines.length < maxLines) {
            lines.push(VghLantern__DrawingEditor__SheetChrome__FitText(current, fontMm, weight, 0, maxWidthMm));
        }

        return lines;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Terms Cell Contents
    // ------------------------------------------------------------
    // A bold instruction over lighter supporting copy, with the code at the cell's
    // right-hand end. This inverts the caption-over-value rhythm of the other
    // titleblock cells on purpose: those caption a value the reader is looking for,
    // whereas this one is telling them to go and read something, so the instruction
    // leads and the detail follows it.
    function VghLantern__SheetChrome__BuildTermsCell(list, titleRect, terms, style) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!terms.CellWidthMm) return;

        var config  =  terms.Config;
        var LABEL   =  'Na__Terms__Config.json -> VghLantern__Terms__Config__DrawingQrBlock';

        var cellX     =  titleRect.X + titleRect.WidthMm - terms.CellWidthMm;
        var padHMm    =  VghLantern__SheetChrome__Number(config, 'CellPaddingHMm', 'DrawingQrBlock');
        var padVMm    =  VghLantern__SheetChrome__Number(config, 'CellPaddingVMm', 'DrawingQrBlock');
        var headingMm =  VghLantern__SheetChrome__Number(config, 'HeadingFontSizeMm', 'DrawingQrBlock');
        var bodyMm    =  VghLantern__SheetChrome__Number(config, 'BodyFontSizeMm', 'DrawingQrBlock');
        var spacing   =  VghLantern__SheetChrome__Number(config, 'BodyLineSpacing', 'DrawingQrBlock');
        var maxLines  =  VghLantern__SheetChrome__Number(config, 'BodyMaxLines', 'DrawingQrBlock');

        var qrRoomMm  =  terms.Qr ? (terms.Qr.SizeMm + padHMm) : 0;
        var textX     =  cellX + padHMm;
        var textRoom  =  Math.max(1, terms.CellWidthMm - (padHMm * 2) - qrRoomMm);

        // The same rule that divides every other pair of cells in the strip.
        VghLantern__SheetChrome__PushLine(list, cellX, titleRect.Y, cellX, titleRect.Y + titleRect.HeightMm,
                                          style.FrameColour, style.FrameStrokeMm);

        var cursorY  =  titleRect.Y + padVMm;

        VghLantern__SheetChrome__PushText(list, {
            X         : textX,
            BaselineY : VghLantern__SheetChrome__BaselineFromTop(cursorY, headingMm),
            Text      : VghLantern__DrawingEditor__SheetChrome__FitText(
                            ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'HeadingText', LABEL),
                            headingMm, 'bold', 0, textRoom),
            FontMm    : headingMm,
            Weight    : 'bold',
            Colour    : style.InkColour,
            Align     : 'left'
        });

        cursorY  +=  headingMm * spacing;

        var bodyLineMm  =  bodyMm * spacing;
        var bodyLines   =  VghLantern__SheetChrome__WrapText(
            ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'BodyText', LABEL),
            bodyMm, 'normal', textRoom, maxLines
        );

        // A paragraph shorter than BodyMaxLines is nudged down by half of whatever
        // room it leaves at the bottom, so it centres between the underside of the
        // heading and the cell's bottom padding rather than sitting jammed against
        // the heading with all the slack left dangling below it. A paragraph that
        // already fills every allowed line gets no nudge - cursorY is already
        // exactly where the heading's own line-height put it, never tighter than
        // before.
        var spaceBottomY    =  titleRect.Y + titleRect.HeightMm - padVMm;
        var bodyBlockMm     =  bodyLines.length * bodyLineMm;
        var centeringGapMm  =  Math.max(0, (spaceBottomY - cursorY - bodyBlockMm) / 2);
        cursorY  +=  centeringGapMm;

        var i, lineTrackingMm, lineWidthMm;

        for (i = 0; i < bodyLines.length; i++) {
            // A line that would run past the strip is dropped rather than overflowing
            // it, which on a titleblock would read as a printing fault.
            if (cursorY + bodyLineMm > titleRect.Y + titleRect.HeightMm - padVMm) break;

            // Every wrapped line but the paragraph's last is stretched to the full
            // text width by adding letter-spacing, the same TrackingMm both renderers
            // already add after every glyph - so the block reads as a justified
            // column with a flush right edge instead of word-wrap's ragged one. The
            // last line is left at its natural spacing: stretching two or three words
            // across the same width as a full line above it would read as a fault,
            // not as justified type.
            lineTrackingMm  =  0;
            if (i < bodyLines.length - 1 && bodyLines[i].length > 0) {
                lineWidthMm     =  VghLantern__DrawingEditor__SheetChrome__MeasureTextMm(bodyLines[i], bodyMm, 'normal', 0);
                lineTrackingMm  =  Math.max(0, (textRoom - lineWidthMm) / bodyLines[i].length);
            }

            VghLantern__SheetChrome__PushText(list, {
                X          : textX,
                BaselineY  : VghLantern__SheetChrome__BaselineFromTop(cursorY, bodyMm),
                Text       : bodyLines[i],
                FontMm     : bodyMm,
                Weight     : 'normal',
                Colour     : style.MutedColour,
                Align      : 'left',
                TrackingMm : lineTrackingMm
            });

            cursorY  +=  bodyLineMm;
        }

        if (!terms.Qr) return;

        VghLantern__SheetChrome__PushQr(
            list, terms.Qr.X, terms.Qr.Y, terms.Qr.SizeMm, terms.Qr.Encoded,
            ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'QrDarkColour',  LABEL),
            ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'QrLightColour', LABEL)
        );
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


    // SUB HELPER FUNCTION | Resolve a Row's Raw Value, With Any Field-Specific Composition
    // ------------------------------------------------------------
    // Only the Scale row does anything beyond a straight field lookup: the paper size
    // is not a row of its own (there is nowhere in the strip that reads as "Paper" on
    // its own terms), it is quoted alongside the ratio it applies to, taken from this
    // sheet's own solved layout rather than the live SheetManager selection so a baked
    // pack page never quotes the paper the editor happens to be showing.
    function VghLantern__SheetChrome__ResolveRowValue(rowKey, rawValue, layout) {
        if (rowKey === 'scale' && rawValue && layout && layout.Page && layout.Page.Label) {
            return rawValue + ' @ ' + layout.Page.Label;
        }
        return rawValue;
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Push a Date Value With Its Ordinal Suffix Set Small and Raised
    // ------------------------------------------------------------
    // "07th Aug 2026" is pushed as three runs - "07", "th", " Aug 2026" - so the suffix
    // can print smaller and raised, the way a typeset ordinal reads, rather than as a
    // full-size "th" sitting on the same baseline as the day number. Falls back to a
    // single run for any value that does not open with a day ordinal, which is what
    // keeps this safe to call for a blank or otherwise-shaped date.
    function VghLantern__SheetChrome__PushDateValue(list, x, baselineY, text, fonts, style, titleCfg) {
        var match  =  ORDINAL_SUFFIX_PATTERN.exec(text);
        if (!match) {
            VghLantern__SheetChrome__PushText(list, {
                X: x, BaselineY: baselineY, Text: text, FontMm: fonts.TitleValueMm,
                Weight: style.TitleValueWeight, Colour: style.InkColour, Align: 'left'
            });
            return;
        }

        var dayText       =  match[1];
        var suffixText    =  match[2];
        var tailText      =  match[3];
        var suffixScale   =  VghLantern__SheetChrome__Number(titleCfg, 'DateOrdinalSuffixScale', 'TitleBlock');
        var suffixFontMm  =  fonts.TitleValueMm * suffixScale;
        var raiseMm       =  (fonts.TitleValueMm - suffixFontMm) * CAP_HEIGHT_RATIO;      // <-- Lines the suffix's top up with the day number's cap height
        var cursorX       =  x;

        VghLantern__SheetChrome__PushText(list, {
            X: cursorX, BaselineY: baselineY, Text: dayText, FontMm: fonts.TitleValueMm,
            Weight: style.TitleValueWeight, Colour: style.InkColour, Align: 'left'
        });
        cursorX  +=  VghLantern__DrawingEditor__SheetChrome__MeasureTextMm(dayText, fonts.TitleValueMm, style.TitleValueWeight, 0);

        VghLantern__SheetChrome__PushText(list, {
            X: cursorX, BaselineY: baselineY - raiseMm, Text: suffixText, FontMm: suffixFontMm,
            Weight: style.TitleValueWeight, Colour: style.InkColour, Align: 'left'
        });
        cursorX  +=  VghLantern__DrawingEditor__SheetChrome__MeasureTextMm(suffixText, suffixFontMm, style.TitleValueWeight, 0);

        VghLantern__SheetChrome__PushText(list, {
            X: cursorX, BaselineY: baselineY, Text: tailText, FontMm: fonts.TitleValueMm,
            Weight: style.TitleValueWeight, Colour: style.InkColour, Align: 'left'
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Single Row Titleblock Strip
    // ------------------------------------------------------------
    // Three parts across one strip: the logo cell at an absolute width on the left,
    // the terms cell at an absolute width on the right, and the field cells dividing
    // whatever is left between them by relative share. Row WidthMm values are those
    // shares, not absolute widths, so adding a row rebalances the strip rather than
    // overflowing it - and the two fixed cells keep their printed size on every paper.
    function VghLantern__SheetChrome__BuildTitleBlock(list, layout, fields, fonts, style, logoAsset, project, lantern, lanternIndex) {
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

        var padHMm       =  VghLantern__SheetChrome__Number(titleCfg, 'FieldPaddingHMm', 'TitleBlock');
        var padTopMm     =  VghLantern__SheetChrome__Number(titleCfg, 'FieldPaddingTopMm', 'TitleBlock');
        var padBottomMm  =  VghLantern__SheetChrome__Number(titleCfg, 'FieldPaddingBottomMm', 'TitleBlock');
        var labelTopMm   =  VghLantern__SheetChrome__Number(titleCfg, 'FieldLabelOffsetTopMm', 'TitleBlock');

        // The value sits centred in the cell below the label band, which is what the
        // titleblock reads as: a small caption over a strong value. Solved before the
        // terms cell is drawn so that cell can sit on the identical two baselines.
        var valueBandY   =  rect.Y + padTopMm;
        var valueBandH   =  Math.max(0, rect.HeightMm - padTopMm - padBottomMm);
        var valueBaseY   =  VghLantern__SheetChrome__BaselineCentred(valueBandY, valueBandH, fonts.TitleValueMm);
        var labelBaseY   =  VghLantern__SheetChrome__BaselineFromTop(rect.Y + labelTopMm, fonts.TitleLabelMm);

        var terms  =  VghLantern__SheetChrome__SolveTermsCell(rect, project, lantern, lanternIndex);
        VghLantern__SheetChrome__BuildTermsCell(list, rect, terms, style);

        if (!rows.length) return;

        var fieldsX      =  rect.X + logo.CellWidthMm;
        var fieldsWidth  =  Math.max(1, rect.WidthMm - logo.CellWidthMm - terms.CellWidthMm);

        var totalShare  =  0;
        var i, share;
        for (i = 0; i < rows.length; i++) {
            totalShare  +=  (typeof rows[i].WidthMm === 'number' && rows[i].WidthMm > 0) ? rows[i].WidthMm : 1;
        }
        if (totalShare <= 0) return;

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
                VghLantern__SheetChrome__ResolveRowValue(rows[i].Key, String(fields[rows[i].Key] || ''), layout),
                fonts.TitleValueMm, style.TitleValueWeight, 0, textRoom
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

            // The date carries its ordinal suffix as a small raised run; every other
            // field prints as the one plain run it has always been.
            if (rows[i].Key === 'issueDate') {
                VghLantern__SheetChrome__PushDateValue(list, cursorX + padHMm, valueBaseY, valueText, fonts, style, titleCfg);
            } else {
                VghLantern__SheetChrome__PushText(list, {
                    X         : cursorX + padHMm,
                    BaselineY : valueBaseY,
                    Text      : valueText,
                    FontMm    : fonts.TitleValueMm,
                    Weight    : style.TitleValueWeight,
                    Colour    : style.InkColour,
                    Align     : 'left'
                });
            }

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
    // context is { ScaleLabel, Project, Lantern, LanternIndex, Fields, LogoAsset }.
    // Nothing here reads the DOM or the exporter, so the same call serves both
    // surfaces.
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

        VghLantern__SheetChrome__BuildTitleBlock(list, layout, ctx.Fields || {}, fonts, style,
                                                 ctx.LogoAsset || null, ctx.Project || null,
                                                 ctx.Lantern || null, ctx.LanternIndex);

        return list;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build Chrome Primitives for a Project's Sheet
    // ------------------------------------------------------------
    // The one call both the Drawing Editor and the PDF exporter make. Resolving the
    // titleblock fields here rather than in each caller is what stops a sheet and its
    // export quoting different values.
    // Deliberately synchronous - hand it the logo from LoadLogo or CachedLogo.
    //
    // sheet is a sheet descriptor: { Project, Lantern, LanternIndex, ScaleLabel }.
    // It is the descriptor rather than loose arguments because everything the chrome
    // needs to know about which drawing this is now travels together, and because a
    // BAKED sheet must not be captioned from live module state. ScaleLabel is read off
    // the descriptor for exactly that reason: a pack painting four sheets in a row
    // would otherwise stamp all four with whatever scale the editor was last left on.
    function VghLantern__DrawingEditor__SheetChrome__BuildForSheet(layout, sheet, logoAsset) {
        var TitleBlock    =  window.VghLantern__DrawingEditor__TitleBlockRenderer;
        var ScaleManager  =  window.VghLantern__DrawingEditor__ScaleManager;

        var descriptor  =  sheet || {};
        var project     =  descriptor.Project || null;
        var lantern     =  descriptor.Lantern || null;

        var scaleLabel  =  (typeof descriptor.ScaleLabel === 'string' && descriptor.ScaleLabel !== '')
            ? descriptor.ScaleLabel
            : (ScaleManager ? ScaleManager.VghLantern__DrawingEditor__ScaleManager__FormatLabel() : '');

        return VghLantern__DrawingEditor__SheetChrome__Build(layout, {
            ScaleLabel   : scaleLabel,
            Project      : project,                                            // <-- The terms callout encodes this project's code
            Lantern      : lantern,                                            // <-- ...and this lantern's place in its schedule
            LanternIndex : descriptor.LanternIndex,
            Fields       : TitleBlock
                ? TitleBlock.VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields(project, lantern)
                : {},
            LogoAsset    : logoAsset || null
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


    // SUB HELPER FUNCTION | Merge a QR Primitive's Dark Modules Into Row Runs
    // ------------------------------------------------------------
    // Shared by both renderers so the SVG and the PDF emit the identical rectangles.
    // Delegated to the encoder, which owns the matrix and therefore owns what a run
    // through it means.
    function VghLantern__SheetChrome__QrRuns(primitive) {
        var QrEncoder  =  window.VghLantern__AppUtils__QrEncoder;
        if (!QrEncoder) return [];

        return QrEncoder.VghLantern__AppUtils__QrEncoder__MergeRuns({
            Size    : primitive.ModuleCount,
            Modules : primitive.Modules
        });
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

        if (primitive.Kind === KIND_QR) {
            var runs      =  VghLantern__SheetChrome__QrRuns(primitive);
            var moduleMm  =  primitive.SizeMm / primitive.ModuleCount;
            var body      =  '<rect x="' + primitive.X + '" y="' + primitive.Y + '" ' +
                             'width="' + primitive.SizeMm + '" height="' + primitive.SizeMm + '" ' +
                             'fill="' + primitive.LightColour + '"/>';
            var r;

            for (r = 0; r < runs.length; r++) {
                body  +=  '<rect x="' + (primitive.X + (runs[r].Col * moduleMm)) + '" ' +
                          'y="' + (primitive.Y + (runs[r].Row * moduleMm)) + '" ' +
                          'width="' + (runs[r].Length * moduleMm) + '" height="' + moduleMm + '" ' +
                          'fill="' + primitive.DarkColour + '"/>';
            }

            // shape-rendering crispEdges stops the browser antialiasing the module
            // edges into grey, which is what a phone camera reads as a soft module.
            return '<g shape-rendering="crispEdges">' + body + '</g>';
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
            return;
        }

        if (primitive.Kind === KIND_QR) {
            // Drawn as filled rectangles rather than placed as a raster, so the symbol
            // is vector in the file and stays sharp at any print size or zoom.
            var moduleMm  =  primitive.SizeMm / primitive.ModuleCount;
            var runs      =  VghLantern__SheetChrome__QrRuns(primitive);
            var light     =  VghLantern__SheetChrome__Rgb(primitive.LightColour);
            var dark      =  VghLantern__SheetChrome__Rgb(primitive.DarkColour);
            var r;

            doc.setFillColor(light.R, light.G, light.B);
            doc.rect(primitive.X, primitive.Y, primitive.SizeMm, primitive.SizeMm, 'F');

            doc.setFillColor(dark.R, dark.G, dark.B);
            for (r = 0; r < runs.length; r++) {
                doc.rect(primitive.X + (runs[r].Col * moduleMm),
                         primitive.Y + (runs[r].Row * moduleMm),
                         runs[r].Length * moduleMm, moduleMm, 'F');
            }
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
        VghLantern__DrawingEditor__SheetChrome__BuildForSheet  : VghLantern__DrawingEditor__SheetChrome__BuildForSheet,
        VghLantern__DrawingEditor__SheetChrome__ToSvgMarkup    : VghLantern__DrawingEditor__SheetChrome__ToSvgMarkup,
        VghLantern__DrawingEditor__SheetChrome__DrawToPdf      : VghLantern__DrawingEditor__SheetChrome__DrawToPdf,
        VghLantern__DrawingEditor__SheetChrome__LoadLogo       : VghLantern__DrawingEditor__SheetChrome__LoadLogo,
        VghLantern__DrawingEditor__SheetChrome__CachedLogo     : VghLantern__DrawingEditor__SheetChrome__CachedLogo
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetChrome  =  VghLantern__DrawingEditor__SheetChrome;
