/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | SHEET PDF EXPORTER
   =============================================================================

   FILE       : VghLantern__DrawingEditor__SheetPdfExporter__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - SheetPdfExporter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Bake the composed drawing sheet to a true-size, true-scale PDF
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Writes the sheet the Drawing Editor is showing as a single-page PDF at the exact
     paper size selected in the toolbar, so the file prints at 100 percent and every
     dimension measures correctly under a scale rule.
   - Takes its rectangles from SheetPdfLayout and its content from SheetManager's
     DescribeSheet contract. It reaches into no other module's DOM.
   - Orthographic views are rasterised because jsPDF cannot place vector SVG. The
     titleblock, the notes and all frame chrome are drawn natively, so that text
     stays selectable and searchable in the issued drawing.

   -----------------------------------------------------------------------------

   HOW SCALE CORRECTNESS IS GUARANTEED:
   Three things have to agree, and this module forces all three:
     1. The PDF page is created at the sheet's real millimetre size, so the PDF
        MediaBox is a true A3 (or A4, A2, A1) and no printer scaling is implied.
     2. Each view's viewBox is REWRITTEN to span exactly (body rectangle x scale
        denominator) model millimetres before rasterising. The drawn view therefore
        fills its frame at precisely 1:N regardless of how the browser laid the
        preview out.
     3. The raster is placed into that same body rectangle, so no fitting, letter-
        boxing or aspect correction happens between the maths and the paper.

   WHY THE VIEWBOX IS REWRITTEN RATHER THAN TRUSTED:
   The on-screen surface is fitted to a CSS box whose height is affected by the notes
   block and by pixel rounding. Trusting that viewBox would carry a fraction of a
   percent of screen error into a printed drawing that a joiner will measure.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Sheet PDF Exporter Module
// =============================================================================

const VghLantern__DrawingEditor__SheetPdfExporter = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Unit Conversion and Drawing Defaults
    // ------------------------------------------------------------
    const MM_PER_POINT           =  0.352778;                                 // <-- One point in millimetres
    const CELL_PADDING_MM        =  1.2;                                      // <-- Text inset inside a boxed cell
    const FALLBACK_RASTER_PPMM   =  12;                                       // <-- About 305 dpi, crisp for linework
    const FALLBACK_FRAME_STROKE  =  0.25;
    const FALLBACK_TITLE_STROKE  =  0.25;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Print Colour Fallbacks
    // ------------------------------------------------------------
    const FALLBACK_INK_COLOUR    =  '#172b3a';                                // <-- Vale primary, used for text and titleblock rules
    const FALLBACK_FRAME_COLOUR  =  '#b8c0c6';                                // <-- Frame hairlines
    const FALLBACK_MUTED_COLOUR  =  '#6c757d';                                // <-- Labels and secondary captions
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Filename and Failure Messages
    // ------------------------------------------------------------
    const FALLBACK_FILENAME_PATTERN  =  'VghLantern__{projectCode}__{drawingNumber}__{sheetSize}';
    const MESSAGE_NO_LIBRARY         =  'PDF export failed - the jsPDF library did not load.';
    const MESSAGE_NO_SHEET           =  'Open a lantern in the Drawing Editor before exporting a PDF.';
    const MESSAGE_FAILED             =  'PDF export failed - see the browser console for details.';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Export Guard and Logo Cache
    // ------------------------------------------------------------
    // A second click while the first export is still rasterising would produce two
    // files from one intent, so exports are serialised. The logo is fetched once per
    // session because every export embeds the same image.
    let VghLantern__SheetPdfExporter__IsExporting  =  false;
    let VghLantern__SheetPdfExporter__LogoAsset    =  null;                   // <-- { DataUrl, WidthPx, HeightPx } once resolved
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access and Small Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get a Named Drawing Editor Config Block
    // ------------------------------------------------------------
    function VghLantern__SheetPdfExporter__Block(blockName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var drawingCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
        return drawingCfg['VghLantern__DrawingEditor__Config__' + blockName] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert a Millimetre Type Size to Points for jsPDF
    // ------------------------------------------------------------
    function VghLantern__SheetPdfExporter__MmToPt(millimetres) {
        return millimetres / MM_PER_POINT;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert a Hex Colour to an RGB Triplet
    // ------------------------------------------------------------
    // jsPDF accepts hex strings, but converting here keeps a malformed config value
    // from silently painting something black in an issued drawing.
    function VghLantern__SheetPdfExporter__Rgb(hexColour, fallbackHex) {
        var value  =  String(hexColour || '').trim();
        if (!/^#?[0-9a-fA-F]{6}$/.test(value)) value  =  fallbackHex;

        value  =  value.replace('#', '');

        return {
            R : parseInt(value.substring(0, 2), 16),
            G : parseInt(value.substring(2, 4), 16),
            B : parseInt(value.substring(4, 6), 16)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply a Text Colour and Size to the Document
    // ------------------------------------------------------------
    function VghLantern__SheetPdfExporter__SetText(doc, fontSizeMm, colour) {
        doc.setFontSize(VghLantern__SheetPdfExporter__MmToPt(fontSizeMm));
        doc.setTextColor(colour.R, colour.G, colour.B);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report a Failure to the User
    // ------------------------------------------------------------
    function VghLantern__SheetPdfExporter__ReportFailure(message) {
        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast && Toast.VghLantern__Toast__Show) {
            Toast.VghLantern__Toast__Show(message, 'error');
            return;
        }
        console.error('[VghLantern__DrawingEditor__SheetPdfExporter] ' + message);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report a Success to the User
    // ------------------------------------------------------------
    function VghLantern__SheetPdfExporter__ReportSuccess(message) {
        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast && Toast.VghLantern__Toast__Show) Toast.VghLantern__Toast__Show(message, 'success');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | View Rasterisation at True Scale
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Load an SVG String Into an Image Element
    // ------------------------------------------------------------
    // A blob URL rather than a data URI, because serialised drawing SVG routinely
    // exceeds the data URI length some browsers accept.
    function VghLantern__SheetPdfExporter__LoadSvgImage(svgMarkup) {
        return new Promise(function(resolve, reject) {
            var blob     =  new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
            var blobUrl  =  URL.createObjectURL(blob);
            var image    =  new Image();

            image.onload   =  function() { URL.revokeObjectURL(blobUrl); resolve(image); };
            image.onerror  =  function() { URL.revokeObjectURL(blobUrl); reject(new Error('SVG could not be decoded.')); };
            image.src      =  blobUrl;
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Rewrite a View's ViewBox to Span Exactly One Scale Window
    // ------------------------------------------------------------
    // This is the step that makes the printed drawing measurable. The window is
    // (body millimetres x denominator) of model space, centred on the view's own
    // projected extents, so the frame contains exactly what 1:N can hold.
    function VghLantern__SheetPdfExporter__ScaleSvgToFrame(svgMarkup, viewKey, bodyRect, denominator, skeleton, pixelsPerMm) {
        var CoordHelpers  =  window.VghLantern__Env2d__CoordHelpers;

        var parsed  =  new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
        var svgEl   =  parsed.documentElement;
        if (!svgEl || svgEl.getElementsByTagName('parsererror').length) return null;

        var spanXMm  =  bodyRect.WidthMm  * denominator;
        var spanYMm  =  bodyRect.HeightMm * denominator;

        var centreX  =  0;
        var centreY  =  0;
        var extents  =  (CoordHelpers && skeleton)
            ? CoordHelpers.VghLantern__Env2d__CoordHelpers__ExtentsOfSkeleton(skeleton, viewKey)
            : null;

        if (extents) {
            centreX  =  (extents.MinX + extents.MaxX) / 2;
            centreY  =  (extents.MinY + extents.MaxY) / 2;
        }

        svgEl.setAttribute('viewBox',
            (centreX - (spanXMm / 2)) + ' ' + (centreY - (spanYMm / 2)) + ' ' + spanXMm + ' ' + spanYMm);

        // Intrinsic pixel size drives the rasteriser; the aspect already matches the
        // target rectangle exactly, so nothing is letterboxed away.
        svgEl.setAttribute('width',  Math.max(1, Math.round(bodyRect.WidthMm  * pixelsPerMm)) + 'px');
        svgEl.setAttribute('height', Math.max(1, Math.round(bodyRect.HeightMm * pixelsPerMm)) + 'px');
        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        return new XMLSerializer().serializeToString(svgEl);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Rasterise Scaled SVG Markup to a PNG Data URL
    // ------------------------------------------------------------
    // PNG rather than JPEG: a drawing is thin dark lines on white, which JPEG blurs
    // into grey haloes and PNG compresses better than it would a photograph.
    async function VghLantern__SheetPdfExporter__RasteriseSvg(svgMarkup, bodyRect, pixelsPerMm) {
        var image   =  await VghLantern__SheetPdfExporter__LoadSvgImage(svgMarkup);
        var canvas  =  document.createElement('canvas');

        canvas.width   =  Math.max(1, Math.round(bodyRect.WidthMm  * pixelsPerMm));
        canvas.height  =  Math.max(1, Math.round(bodyRect.HeightMm * pixelsPerMm));

        var context  =  canvas.getContext('2d');
        context.fillStyle  =  '#ffffff';                                      // <-- Paper, and PNG alpha would otherwise print grey
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/png');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Frame Drawing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Draw the Chrome and Caption of One Frame
    // ------------------------------------------------------------
    function VghLantern__SheetPdfExporter__DrawFrameChrome(doc, placement, sheet, layout, palette, strokes) {
        var frame  =  placement.Frame;
        var label  =  placement.Label;
        var slot   =  placement.Slot;

        doc.setLineWidth(strokes.FrameMm);
        doc.setDrawColor(palette.Frame.R, palette.Frame.G, palette.Frame.B);
        doc.rect(frame.X, frame.Y, frame.WidthMm, frame.HeightMm);
        doc.line(label.X, label.Y + label.HeightMm, label.X + label.WidthMm, label.Y + label.HeightMm);

        var baseline  =  label.Y + label.HeightMm - CELL_PADDING_MM;

        VghLantern__SheetPdfExporter__SetText(doc, layout.Fonts.FrameLabelMm, palette.Ink);
        doc.text(String(slot.Label || slot.Key).toUpperCase(), label.X + CELL_PADDING_MM, baseline);

        if (slot.ShowScale !== false && sheet.ScaleLabel) {
            VghLantern__SheetPdfExporter__SetText(doc, layout.Fonts.FrameLabelMm, palette.Muted);
            doc.text(String(sheet.ScaleLabel), label.X + label.WidthMm - CELL_PADDING_MM, baseline, { align: 'right' });
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Place One View Into Its Body Rectangle
    // ------------------------------------------------------------
    // A slot that cannot produce an image leaves an empty frame rather than aborting
    // the export: an issued sheet missing one view is recoverable, a missing file is
    // not.
    async function VghLantern__SheetPdfExporter__DrawView(doc, placement, sheet, skeleton, pixelsPerMm) {
        var slot  =  placement.Slot;
        var body  =  placement.Body;

        if (slot.Source === 'env3d') {
            var snapshot  =  sheet.ViewSnapshots ? sheet.ViewSnapshots[slot.Key] : null;
            if (snapshot) doc.addImage(snapshot, 'PNG', body.X, body.Y, body.WidthMm, body.HeightMm);
            return;
        }

        var markup  =  sheet.ViewSvgMarkup ? sheet.ViewSvgMarkup[slot.Key] : null;
        if (!markup) return;

        try {
            var scaled  =  VghLantern__SheetPdfExporter__ScaleSvgToFrame(
                markup, slot.ViewKey || slot.Key, body, sheet.ScaleDenominator, skeleton, pixelsPerMm
            );
            if (!scaled) return;

            var png  =  await VghLantern__SheetPdfExporter__RasteriseSvg(scaled, body, pixelsPerMm);
            doc.addImage(png, 'PNG', body.X, body.Y, body.WidthMm, body.HeightMm);
        } catch (rasterError) {
            console.warn('[VghLantern__DrawingEditor__SheetPdfExporter] View "' + slot.Key + '" could not be rasterised:', rasterError);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Notes Block
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Draw the Numbered Notes Block
    // ------------------------------------------------------------
    // Filled column by column so the numbering reads down then across, matching the
    // CSS column flow of the on-screen block.
    function VghLantern__SheetPdfExporter__DrawNotes(doc, layout, notes, palette) {
        var rect  =  layout.Notes;
        if (!rect || !notes.length) return;

        var notesCfg      =  VghLantern__SheetPdfExporter__Block('Annotations');
        var headingScale  =  (typeof notesCfg.HeadingScale === 'number') ? notesCfg.HeadingScale : 1.05;
        var padTopMm      =  (typeof rect.PaddingTopMm === 'number') ? rect.PaddingTopMm : 0;
        var originY       =  rect.Y + padTopMm;

        VghLantern__SheetPdfExporter__SetText(doc, layout.Fonts.NoteMm * headingScale, palette.Ink);
        doc.text(String(rect.Title).toUpperCase(), rect.X, originY + layout.Fonts.NoteMm * headingScale);

        var columnWidth  =  (rect.WidthMm - (rect.ColumnGapMm * (rect.Columns - 1))) / rect.Columns;
        var i, columnIndex, rowIndex, textX, textY, wrapped;

        VghLantern__SheetPdfExporter__SetText(doc, layout.Fonts.NoteMm, palette.Ink);

        for (i = 0; i < notes.length; i++) {
            columnIndex  =  Math.floor(i / rect.Rows);
            rowIndex     =  i % rect.Rows;

            textX  =  rect.X + (columnIndex * (columnWidth + rect.ColumnGapMm));
            textY  =  originY + rect.HeadingMm + (rowIndex * rect.LineHeightMm) + layout.Fonts.NoteMm;

            wrapped  =  doc.splitTextToSize((i + 1) + '. ' + String(notes[i].Text || ''), columnWidth);
            if (wrapped.length) doc.text(wrapped[0], textX, textY);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Titleblock Strip
// -----------------------------------------------------------------------------

    // SUB HELPER FUNCTION | Load the Vale Logo Once Per Session
    // ------------------------------------------------------------
    // Resolves to null on any failure so a missing asset costs the logo, not the
    // export.
    function VghLantern__SheetPdfExporter__LoadLogo(logoPath) {
        if (VghLantern__SheetPdfExporter__LogoAsset !== null) {
            return Promise.resolve(VghLantern__SheetPdfExporter__LogoAsset);
        }

        return new Promise(function(resolve) {
            var image  =  new Image();

            image.onload  =  function() {
                var canvas     =  document.createElement('canvas');
                canvas.width   =  image.naturalWidth;
                canvas.height  =  image.naturalHeight;
                canvas.getContext('2d').drawImage(image, 0, 0);

                try {
                    VghLantern__SheetPdfExporter__LogoAsset  =  {
                        DataUrl  : canvas.toDataURL('image/png'),
                        WidthPx  : image.naturalWidth,
                        HeightPx : image.naturalHeight
                    };
                } catch (taintError) {
                    VghLantern__SheetPdfExporter__LogoAsset  =  false;         // <-- Canvas tainted; never retry
                }
                resolve(VghLantern__SheetPdfExporter__LogoAsset);
            };

            image.onerror  =  function() {
                VghLantern__SheetPdfExporter__LogoAsset  =  false;
                resolve(false);
            };

            image.src  =  logoPath;
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw the Logo Cell and Return Its Width
    // ------------------------------------------------------------
    function VghLantern__SheetPdfExporter__DrawLogoCell(doc, rect, titleCfg, logoAsset) {
        var cellWidthMm  =  (typeof titleCfg.LogoCellWidthMm === 'number')
            ? titleCfg.LogoCellWidthMm
            : ((typeof titleCfg.LogoWidthMm === 'number') ? titleCfg.LogoWidthMm * 1.5 : 0);

        if (!cellWidthMm || !logoAsset || titleCfg.ShowValeLogo === false) return cellWidthMm || 0;

        var padVMm        =  (typeof titleCfg.LogoPaddingVMm === 'number') ? titleCfg.LogoPaddingVMm : 1.8;
        var maxHeightMm   =  (typeof titleCfg.LogoMaxHeightMm === 'number') ? titleCfg.LogoMaxHeightMm : 5.5;
        var logoWidthMm   =  (typeof titleCfg.LogoWidthMm === 'number') ? titleCfg.LogoWidthMm : cellWidthMm * 0.8;
        var aspect        =  logoAsset.HeightPx / logoAsset.WidthPx;
        var logoHeightMm  =  logoWidthMm * aspect;

        // Cap to the configured max height and the padded strip, matching screen CSS.
        var availableMm   =  Math.min(maxHeightMm, rect.HeightMm - (padVMm * 2));
        if (logoHeightMm > availableMm && availableMm > 0) {
            logoHeightMm  =  availableMm;
            logoWidthMm   =  logoHeightMm / aspect;
        }

        doc.addImage(
            logoAsset.DataUrl, 'PNG',
            rect.X + ((cellWidthMm - logoWidthMm) / 2),
            rect.Y + ((rect.HeightMm - logoHeightMm) / 2),
            logoWidthMm, logoHeightMm
        );

        return cellWidthMm;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw the Single Row Titleblock Strip
    // ------------------------------------------------------------
    // Field widths in config are relative shares, matching the flex layout of the
    // on-screen strip, so the two read identically without a second width table.
    async function VghLantern__SheetPdfExporter__DrawTitleBlock(doc, layout, sheet, palette, strokes) {
        var TitleBlock  =  window.VghLantern__DrawingEditor__TitleBlockRenderer;
        if (!TitleBlock) return;

        var rect      =  layout.TitleBlock;
        var titleCfg  =  VghLantern__SheetPdfExporter__Block('TitleBlock');
        var rows      =  Array.isArray(titleCfg.Rows) ? titleCfg.Rows : [];
        var fields    =  TitleBlock.VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields(sheet.Project, sheet.Lantern);

        doc.setLineWidth(strokes.TitleMm);
        doc.setDrawColor(palette.Ink.R, palette.Ink.G, palette.Ink.B);
        doc.rect(rect.X, rect.Y, rect.WidthMm, rect.HeightMm);

        var logoAsset  =  titleCfg.LogoAssetPath
            ? await VghLantern__SheetPdfExporter__LoadLogo(titleCfg.LogoAssetPath)
            : null;

        var logoWidthMm  =  VghLantern__SheetPdfExporter__DrawLogoCell(doc, rect, titleCfg, logoAsset || null);
        if (!rows.length) return;

        var fieldsX      =  rect.X + logoWidthMm;
        var fieldsWidth  =  rect.WidthMm - logoWidthMm;
        var padHMm       =  (typeof titleCfg.FieldPaddingHMm === 'number') ? titleCfg.FieldPaddingHMm : CELL_PADDING_MM;
        var padBottomMm  =  (typeof titleCfg.FieldPaddingBottomMm === 'number') ? titleCfg.FieldPaddingBottomMm : CELL_PADDING_MM;
        var labelTopMm   =  (typeof titleCfg.FieldLabelOffsetTopMm === 'number') ? titleCfg.FieldLabelOffsetTopMm : 0.5;
        var labelFontMm  =  layout.Fonts.TitleLabelMm;
        var valueFontMm  =  layout.Fonts.TitleValueMm;

        var totalShare  =  0;
        var i;
        for (i = 0; i < rows.length; i++) {
            totalShare  +=  (typeof rows[i].WidthMm === 'number' && rows[i].WidthMm > 0) ? rows[i].WidthMm : 1;
        }
        if (totalShare <= 0) return;

        var cursorX  =  fieldsX;
        var share, cellWidth, valueBaseline;

        // Value sits vertically centred in the cell below the absolute label band,
        // matching the on-screen flex titleblock (not bottom-pinned).
        valueBaseline  =  rect.Y + (rect.HeightMm / 2) + (valueFontMm * 0.35);

        for (i = 0; i < rows.length; i++) {
            share      =  (typeof rows[i].WidthMm === 'number' && rows[i].WidthMm > 0) ? rows[i].WidthMm : 1;
            cellWidth  =  (share / totalShare) * fieldsWidth;

            doc.setLineWidth(strokes.FrameMm);
            doc.line(cursorX, rect.Y, cursorX, rect.Y + rect.HeightMm);

            VghLantern__SheetPdfExporter__SetText(doc, labelFontMm, palette.Muted);
            doc.text(String(rows[i].Label || rows[i].Key).toUpperCase(),
                     cursorX + padHMm,
                     rect.Y + labelTopMm + labelFontMm);

            VghLantern__SheetPdfExporter__SetText(doc, valueFontMm, palette.Ink);
            doc.text(String(fields[rows[i].Key] || ''),
                     cursorX + padHMm,
                     Math.min(valueBaseline, rect.Y + rect.HeightMm - padBottomMm));

            cursorX  +=  cellWidth;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Metadata and Filename
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Export Filename From the Configured Pattern
    // ------------------------------------------------------------
    function VghLantern__SheetPdfExporter__ResolveFilename(sheet, layout) {
        var TitleBlock  =  window.VghLantern__DrawingEditor__TitleBlockRenderer;
        var pdfCfg      =  VghLantern__SheetPdfExporter__Block('PdfExport');
        var pattern     =  pdfCfg.FilenamePattern || FALLBACK_FILENAME_PATTERN;

        var fields  =  TitleBlock
            ? TitleBlock.VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields(sheet.Project, sheet.Lantern)
            : {};

        var tokens  =  {
            projectCode   : fields.projectCode   || '',
            projectName   : fields.projectName   || '',
            drawingNumber : fields.drawingNumber || '',
            lanternTitle  : fields.lanternTitle  || '',
            revision      : fields.revision      || '',
            sheetSize     : layout.Page.SizeKey  || '',
            scale         : String(sheet.ScaleDenominator || '')
        };

        var resolved  =  pattern.replace(/\{(\w+)\}/g, function(match, tokenName) {
            return String(tokens[tokenName] === undefined ? '' : tokens[tokenName])
                .trim().replace(/[^A-Za-z0-9_\-]+/g, '-').replace(/-{2,}/g, '-').replace(/^[-_]+|[-_]+$/g, '');
        });

        resolved  =  resolved.replace(/_{3,}/g, '__').replace(/-{2,}/g, '-');
        if (!/[A-Za-z0-9]/.test(resolved)) resolved  =  'VghLantern__DrawingSheet';

        return resolved + '.pdf';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Stamp the Document Properties
    // ------------------------------------------------------------
    // The page size and the drawn scale are written into the file metadata as well
    // as into the page geometry, so anyone checking why a print measured short can
    // read the intended paper and scale straight out of the document properties.
    function VghLantern__SheetPdfExporter__ApplyMetadata(doc, sheet, layout) {
        var TitleBlock  =  window.VghLantern__DrawingEditor__TitleBlockRenderer;
        var pdfCfg      =  VghLantern__SheetPdfExporter__Block('PdfExport');

        var fields  =  TitleBlock
            ? TitleBlock.VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields(sheet.Project, sheet.Lantern)
            : {};

        var sheetLabel  =  (layout.Page.Label || layout.Page.SizeKey || '') + ' ' + layout.Page.Orientation;
        var sizeLabel   =  layout.Page.WidthMm + 'mm x ' + layout.Page.HeightMm + 'mm';

        var titleParts  =  [];
        if (fields.projectCode)   titleParts.push(fields.projectCode);
        if (fields.drawingNumber) titleParts.push(fields.drawingNumber);
        titleParts.push('Roof Lantern Drawing');

        var keywords  =  [
            'roof lantern', 'Vale Garden Houses',
            sheetLabel.trim(), sizeLabel, sheet.ScaleLabel || ''
        ].filter(function(part) { return !!part; });

        doc.setProperties({
            Title    : titleParts.join(' - '),
            Subject  : 'Drawn at ' + (sheet.ScaleLabel || 'the sheet scale') + ' on ' + sheetLabel.trim() +
                       ' (' + sizeLabel + '). Print at 100 percent with no page scaling for a true scale drawing.',
            Author   : pdfCfg.Author  || 'Vale Garden Houses Limited',
            Creator  : pdfCfg.Creator || 'Vale Lantern Designer',
            Keywords : keywords.join(', ')
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Export the Composed Sheet as a True Size PDF
    // ------------------------------------------------------------
    async function VghLantern__DrawingEditor__SheetPdfExporter__Export() {
        if (VghLantern__SheetPdfExporter__IsExporting) return false;

        var JsPdf  =  (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
        if (!JsPdf) {
            VghLantern__SheetPdfExporter__ReportFailure(MESSAGE_NO_LIBRARY);
            return false;
        }

        var SheetManager     =  window.VghLantern__DrawingEditor__SheetManager;
        var SheetPdfLayout   =  window.VghLantern__DrawingEditor__SheetPdfLayout;
        var AnnotationLayer  =  window.VghLantern__DrawingEditor__AnnotationLayer;
        var StateManager     =  window.VghLantern__AppCore__StateManager;
        if (!SheetManager || !SheetPdfLayout) return false;

        VghLantern__SheetPdfExporter__IsExporting  =  true;

        try {
            var sheet  =  SheetManager.VghLantern__DrawingEditor__SheetManager__DescribeSheet();
            if (!sheet || !sheet.SheetSize || !sheet.IsComposed) {
                VghLantern__SheetPdfExporter__ReportFailure(MESSAGE_NO_SHEET);
                return false;
            }

            var notes   =  AnnotationLayer
                ? AnnotationLayer.VghLantern__DrawingEditor__AnnotationLayer__CollectNotes(sheet.Project)
                : [];
            var layout  =  SheetPdfLayout.VghLantern__DrawingEditor__SheetPdfLayout__Solve(sheet.SheetSize, notes.length);
            if (!layout) {
                VghLantern__SheetPdfExporter__ReportFailure(MESSAGE_NO_SHEET);
                return false;
            }

            var pdfCfg       =  VghLantern__SheetPdfExporter__Block('PdfExport');
            var pixelsPerMm  =  (typeof pdfCfg.RasterPixelsPerMm === 'number' && pdfCfg.RasterPixelsPerMm > 0)
                ? pdfCfg.RasterPixelsPerMm
                : FALLBACK_RASTER_PPMM;

            var palette  =  {
                Ink    : VghLantern__SheetPdfExporter__Rgb(pdfCfg.InkColour,        FALLBACK_INK_COLOUR),
                Frame  : VghLantern__SheetPdfExporter__Rgb(pdfCfg.FrameLineColour,  FALLBACK_FRAME_COLOUR),
                Muted  : VghLantern__SheetPdfExporter__Rgb(pdfCfg.MutedTextColour,  FALLBACK_MUTED_COLOUR)
            };
            var strokes  =  {
                FrameMm : (typeof pdfCfg.FrameStrokeMm === 'number') ? pdfCfg.FrameStrokeMm : FALLBACK_FRAME_STROKE,
                TitleMm : (typeof pdfCfg.TitleStrokeMm === 'number') ? pdfCfg.TitleStrokeMm : FALLBACK_TITLE_STROKE
            };

            // The page is created at the sheet's real millimetre size. Passing the
            // orientation that already matches the format stops jsPDF swapping the
            // axes back on us, which would silently produce a rotated MediaBox.
            var isLandscape  =  layout.Page.WidthMm >= layout.Page.HeightMm;
            var doc  =  new JsPdf({
                unit        : 'mm',
                orientation : isLandscape ? 'landscape' : 'portrait',
                format      : [layout.Page.WidthMm, layout.Page.HeightMm],
                compress    : true
            });

            var skeleton  =  StateManager ? StateManager.VghLantern__StateManager__GetSolvedSkeleton() : null;
            var i;

            // Two passes, and the order matters. A view is an opaque raster that
            // fills its body rectangle to the millimetre, so chrome drawn first is
            // painted over along every edge it shares with the image. Views go down
            // first and every rule is drawn on top of them.
            for (i = 0; i < layout.Slots.length; i++) {
                await VghLantern__SheetPdfExporter__DrawView(doc, layout.Slots[i], sheet, skeleton, pixelsPerMm);
            }
            for (i = 0; i < layout.Slots.length; i++) {
                VghLantern__SheetPdfExporter__DrawFrameChrome(doc, layout.Slots[i], sheet, layout, palette, strokes);
            }

            VghLantern__SheetPdfExporter__DrawNotes(doc, layout, notes, palette);
            await VghLantern__SheetPdfExporter__DrawTitleBlock(doc, layout, sheet, palette, strokes);

            VghLantern__SheetPdfExporter__ApplyMetadata(doc, sheet, layout);
            doc.save(VghLantern__SheetPdfExporter__ResolveFilename(sheet, layout));

            VghLantern__SheetPdfExporter__ReportSuccess(
                'Drawing exported at ' + (layout.Page.Label || layout.Page.SizeKey) + ' ' + (sheet.ScaleLabel || '')
            );
            return true;

        } catch (exportError) {
            console.error('[VghLantern__DrawingEditor__SheetPdfExporter] Export failed:', exportError);
            VghLantern__SheetPdfExporter__ReportFailure(MESSAGE_FAILED);
            return false;

        } finally {
            VghLantern__SheetPdfExporter__IsExporting  =  false;
        }
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__SheetPdfExporter__Export : VghLantern__DrawingEditor__SheetPdfExporter__Export
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__SheetPdfExporter  =  VghLantern__DrawingEditor__SheetPdfExporter;
