/* =============================================================================
   VGHLANTERN - DOCUMENT PREVIEW | PDF EXPORTER
   =============================================================================

   FILE       : VghLantern__DocPreview__PdfExporter__.js
   NAMESPACE  : VghLantern
   MODULE     : DocPreview - PdfExporter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Write the previewed document out as a PDF via version-locked jsPDF
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Exports the same document the preview shows: page order comes from DocPreview
     config (specification first, drawing sheet last by default), filtered by the
     same view toggles.
   - Drawing views are rasterised, because jsPDF cannot place vector SVG. Everything
     else - titleblock, notes, schedules - is drawn natively so the text stays
     selectable and the file stays small.
   - Tables are driven by the same column config the Specification mode uses, so a
     column added there appears here without a second edit.

   -----------------------------------------------------------------------------

   WHY MILLIMETRES THROUGHOUT:
   The jsPDF document is created in mm and DocumentState reports page geometry in mm,
   so no unit conversion happens anywhere in this file. Every number below is a paper
   millimetre.

   ============================================================================= */

// =============================================================================
// REGION | Document Preview PDF Exporter Module
// =============================================================================

const VghLantern__DocPreview__PdfExporter = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Layout Constants Not Sourced From Config
    // ------------------------------------------------------------
    const PT_TO_MM              =  0.352778;                                   // <-- Points to millimetres, a unit conversion constant

    const LINE_SPACING          =  1.35;                                       // <-- Multiplier applied to font size for row height
    const TABLE_CELL_PADDING_MM =  1.2;
    const SECTION_GAP_MM        =  4;
    const FRAME_STROKE_MM       =  0.25;
    const FOOTER_RESERVE_MM     =  8;                                          // <-- Space kept clear at the foot of every page

    const COLOR_ERROR_RED       =  [211, 47, 47];                              // <-- Matches --VghLantern_ErrorRed (#d32f2f), for staff-authored Document Warnings
    // ------------------------------------------------------------


    // MODULE VARIABLES | Export Guard
    // ------------------------------------------------------------
    // A second click while the first export is still rasterising would produce two
    // files from one intent, so exports are serialised.
    let VghLantern__PdfExporter__IsExporting  =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the DocPreview Config Block
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('DocPreview') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the PDF Config Sub-Block
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__PdfConfig() {
        return VghLantern__PdfExporter__Config()['VghLantern__DocPreview__Config__Pdf'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Specification Config Block
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__SpecConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('Specification') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Drawing Editor Config Block
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__DrawingConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};
        return ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert a Point Size to a Line Height in Millimetres
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__LineHeightMm(fontSizePt) {
        return fontSizePt * PT_TO_MM * LINE_SPACING;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report a Failure to the User
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__ReportFailure(message) {
        var Toast  =  window.VghLantern__AppNotifications__Toast;
        if (Toast) {
            Toast.VghLantern__Toast__Show(message, 'error');
            return;
        }
        console.error('[VghLantern__DocPreview__PdfExporter] ' + message);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | SVG Rasterisation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Load an SVG String Into an Image Element
    // ------------------------------------------------------------
    // A blob URL is used rather than a data URI because serialised SVG routinely
    // exceeds the URL length some browsers accept for data URIs.
    function VghLantern__PdfExporter__LoadSvgImage(svgMarkup) {
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


    // SUB FUNCTION | Rasterise SVG Markup to a JPEG Data URL
    // ------------------------------------------------------------
    // The canvas is filled white first: JPEG has no alpha channel, so an unfilled
    // canvas rasterises transparent pixels to black.
    async function VghLantern__PdfExporter__RasteriseSvg(svgMarkup, targetWidthMm, targetHeightMm) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pdfCfg   =  VghLantern__PdfExporter__PdfConfig();
        var PDF_LABEL =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Pdf';
        var pxPerMm  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'RasterPixelsPerMm', PDF_LABEL);
        var quality  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'JpegQuality', PDF_LABEL);

        var image   =  await VghLantern__PdfExporter__LoadSvgImage(svgMarkup);
        var canvas  =  document.createElement('canvas');

        canvas.width   =  Math.max(1, Math.round(targetWidthMm  * pxPerMm));
        canvas.height  =  Math.max(1, Math.round(targetHeightMm * pxPerMm));

        var ctx  =  canvas.getContext('2d');
        ctx.fillStyle  =  '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/jpeg', quality);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Drawing Page
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Compute the Paper Rectangle for One Grid Slot
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__SlotRect(slot, gridConfig, bodyRect) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var GRID_LABEL    =  'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__ViewGrid';
        var columns  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridConfig, 'Columns',  GRID_LABEL);
        var rows     =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridConfig, 'Rows',     GRID_LABEL);
        var gutter   =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(gridConfig, 'GutterMm', GRID_LABEL);

        var cellW  =  (bodyRect.WidthMm  - (gutter * (columns - 1))) / columns;
        var cellH  =  (bodyRect.HeightMm - (gutter * (rows    - 1))) / rows;

        var colStart  =  (Number(slot.ColumnStart) || 1) - 1;
        var rowStart  =  (Number(slot.RowStart)    || 1) - 1;
        var colSpan   =  Number(slot.ColumnSpan) || 1;
        var rowSpan   =  Number(slot.RowSpan)    || 1;

        return {
            X       : bodyRect.X + (colStart * (cellW + gutter)),
            Y       : bodyRect.Y + (rowStart * (cellH + gutter)),
            WidthMm : (cellW * colSpan) + (gutter * (colSpan - 1)),
            HeightMm: (cellH * rowSpan) + (gutter * (rowSpan - 1))
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw One View Into Its Slot
    // ------------------------------------------------------------
    async function VghLantern__PdfExporter__DrawViewSlot(doc, slot, rect, sheet, bodyFontPt) {
        var labelHeight  =  VghLantern__PdfExporter__LineHeightMm(bodyFontPt) + 1;

        doc.setLineWidth(FRAME_STROKE_MM);
        doc.setDrawColor(120, 120, 120);
        doc.rect(rect.X, rect.Y, rect.WidthMm, rect.HeightMm);

        doc.setFontSize(bodyFontPt);
        doc.setTextColor(23, 43, 58);
        doc.text(String(slot.Label || slot.Key), rect.X + TABLE_CELL_PADDING_MM,
                 rect.Y + labelHeight - 1.2);

        if (slot.ShowScale !== false && sheet.ScaleLabel) {
            doc.text(String(sheet.ScaleLabel), rect.X + rect.WidthMm - TABLE_CELL_PADDING_MM,
                     rect.Y + labelHeight - 1.2, { align: 'right' });
        }

        var imageY  =  rect.Y + labelHeight;
        var imageH  =  rect.HeightMm - labelHeight;

        if (slot.Source === 'env3d') {
            var snapshot  =  sheet.ViewSnapshots ? sheet.ViewSnapshots[slot.Key] : null;
            if (snapshot) doc.addImage(snapshot, 'PNG', rect.X, imageY, rect.WidthMm, imageH);
            return;
        }

        var markup  =  sheet.ViewSvgMarkup ? sheet.ViewSvgMarkup[slot.Key] : null;
        if (!markup) return;

        try {
            var jpeg  =  await VghLantern__PdfExporter__RasteriseSvg(markup, rect.WidthMm, imageH);
            doc.addImage(jpeg, 'JPEG', rect.X, imageY, rect.WidthMm, imageH);
        } catch (rasterError) {
            console.warn('[VghLantern__DocPreview__PdfExporter] View "' + slot.Key + '" could not be rasterised:', rasterError);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Draw the Titleblock Field Strip
    // ------------------------------------------------------------
    // Compact strip along the foot of the sheet. Height comes from Drawing Editor
    // TitleBlockHeightMm so the preview host and the PDF strip stay aligned.
    function VghLantern__PdfExporter__DrawTitleBlock(doc, sheet, bodyRect, bodyFontPt) {
        var TitleBlock  =  window.VghLantern__DrawingEditor__TitleBlockRenderer;
        if (!TitleBlock) return 0;

        var drawCfg   =  VghLantern__PdfExporter__DrawingConfig();
        var titleCfg  =  drawCfg['VghLantern__DrawingEditor__Config__TitleBlock'] || {};
        var sheetCfg  =  drawCfg['VghLantern__DrawingEditor__Config__Sheet'] || {};
        var rows      =  Array.isArray(titleCfg.Rows) ? titleCfg.Rows : [];
        if (!rows.length) return 0;

        var fields  =  TitleBlock.VghLantern__DrawingEditor__TitleBlockRenderer__ResolveFields(sheet.Project, sheet.Lantern);
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var lineHeight  =  VghLantern__PdfExporter__LineHeightMm(bodyFontPt);
        var stripHeight =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            sheetCfg, 'TitleBlockHeightMm', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__Sheet');
        var stripY      =  bodyRect.Y + bodyRect.HeightMm - stripHeight;
        var columnWidth =  bodyRect.WidthMm / rows.length;

        doc.setLineWidth(FRAME_STROKE_MM);
        doc.setDrawColor(23, 43, 58);
        doc.rect(bodyRect.X, stripY, bodyRect.WidthMm, stripHeight);

        var i, cellX, row;
        for (i = 0; i < rows.length; i++) {
            row    =  rows[i];
            cellX  =  bodyRect.X + (i * columnWidth);

            if (i > 0) doc.line(cellX, stripY, cellX, stripY + stripHeight);

            doc.setFontSize(bodyFontPt * 0.75);
            doc.setTextColor(110, 110, 110);
            doc.text(String(row.Label || row.Key), cellX + TABLE_CELL_PADDING_MM, stripY + lineHeight * 0.85);

            doc.setFontSize(bodyFontPt);
            doc.setTextColor(23, 43, 58);
            doc.text(String(fields[row.Key] || ''), cellX + TABLE_CELL_PADDING_MM, stripY + stripHeight - 1.4);
        }

        return stripHeight + SECTION_GAP_MM;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Drawing Page
    // ------------------------------------------------------------
    async function VghLantern__PdfExporter__RenderDrawingPage(doc, page, sheet) {
        var ConfigLoader   =  window.VghLantern__AppCore__ConfigLoader;
        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var pdfCfg         =  VghLantern__PdfExporter__PdfConfig();
        var bodyFontPt     =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            pdfCfg, 'BodyFontSizePt', 'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Pdf');

        var enabled  =  DocumentState.VghLantern__DocPreview__DocumentState__ListEnabledSlotKeys();
        var drawCfg  =  VghLantern__PdfExporter__DrawingConfig();
        var slots    =  (drawCfg['VghLantern__DrawingEditor__Config__ViewSlots'] || [])
                            .filter(function(slot) { return enabled.indexOf(slot.Key) !== -1; });

        var bodyRect  =  {
            X        : page.MarginMm,
            Y        : page.MarginMm,
            WidthMm  : page.BodyWidthMm,
            HeightMm : page.BodyHeightMm - FOOTER_RESERVE_MM
        };

        var titleBlockHeight  =  VghLantern__PdfExporter__DrawTitleBlock(doc, sheet, bodyRect, bodyFontPt);
        bodyRect.HeightMm    -=  titleBlockHeight;

        var gridConfig  =  drawCfg['VghLantern__DrawingEditor__Config__ViewGrid'] || {};
        var i, rect;

        for (i = 0; i < slots.length; i++) {
            rect  =  VghLantern__PdfExporter__SlotRect(slots[i], gridConfig, bodyRect);
            await VghLantern__PdfExporter__DrawViewSlot(doc, slots[i], rect, sheet, bodyFontPt);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Specification Pages
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Create a Page Cursor for Flowing Content
    // ------------------------------------------------------------
    // Every specification writer takes this cursor, so page breaks are handled in one
    // place rather than repeated per table.
    function VghLantern__PdfExporter__CreateCursor(doc, page) {
        return {
            Doc        : doc,
            Page       : page,
            X          : page.MarginMm,
            Y          : page.MarginMm,
            WidthMm    : page.BodyWidthMm,
            BottomLimit: page.HeightMm - page.MarginMm - FOOTER_RESERVE_MM,
            PageCount  : 1
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Break to a New Page When the Next Block Will Not Fit
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__EnsureSpace(cursor, requiredMm) {
        if (cursor.Y + requiredMm <= cursor.BottomLimit) return;

        cursor.Doc.addPage([cursor.Page.WidthMm, cursor.Page.HeightMm],
                           cursor.Page.Orientation);
        cursor.Y  =  cursor.Page.MarginMm;
        cursor.PageCount++;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write a Heading
    // ------------------------------------------------------------
    // colorRgb is an optional [r, g, b] override, used only for the staff-authored
    // Document Warnings heading so it prints red instead of the default navy.
    function VghLantern__PdfExporter__WriteHeading(cursor, text, fontSizePt, colorRgb) {
        var lineHeight  =  VghLantern__PdfExporter__LineHeightMm(fontSizePt);
        VghLantern__PdfExporter__EnsureSpace(cursor, lineHeight * 2);

        var color  =  colorRgb || [23, 43, 58];
        cursor.Doc.setFontSize(fontSizePt);
        cursor.Doc.setTextColor(color[0], color[1], color[2]);
        cursor.Doc.text(String(text), cursor.X, cursor.Y + lineHeight * 0.8);

        cursor.Y  +=  lineHeight * 1.4;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write Wrapped Body Text
    // ------------------------------------------------------------
    // colorRgb is an optional [r, g, b] override, used only for the staff-authored
    // Document Warnings paragraphs so they print red instead of the default body colour.
    function VghLantern__PdfExporter__WriteParagraph(cursor, text, fontSizePt, colorRgb) {
        if (!text) return;

        var lineHeight  =  VghLantern__PdfExporter__LineHeightMm(fontSizePt);
        var lines       =  cursor.Doc.splitTextToSize(String(text), cursor.WidthMm);
        var color       =  colorRgb || [30, 30, 30];
        var i;

        cursor.Doc.setFontSize(fontSizePt);
        cursor.Doc.setTextColor(color[0], color[1], color[2]);

        for (i = 0; i < lines.length; i++) {
            VghLantern__PdfExporter__EnsureSpace(cursor, lineHeight);
            cursor.Doc.text(lines[i], cursor.X, cursor.Y + lineHeight * 0.8);
            cursor.Y  +=  lineHeight;
        }

        cursor.Y  +=  lineHeight * 0.4;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write a Table from Column Descriptors and Rows
    // ------------------------------------------------------------
    // Columns come from the Specification config, so the PDF and the on-screen tables
    // cannot drift apart. Numeric columns are right-aligned by their config Align.
    function VghLantern__PdfExporter__WriteTable(cursor, columns, rows, fontSizePt) {
        if (!columns.length || !rows.length) return;

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var PDF_LABEL   =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Pdf';
        var pdfCfg      =  VghLantern__PdfExporter__PdfConfig();
        var lineHeight  =  VghLantern__PdfExporter__LineHeightMm(fontSizePt);
        var rowHeight   =  lineHeight + (TABLE_CELL_PADDING_MM * 2) - 0.6;
        var columnWidth =  cursor.WidthMm / columns.length;

        // HELPER | Draw the header band, repeated after every page break
        function drawHeader() {
            VghLantern__PdfExporter__EnsureSpace(cursor, rowHeight * 2);

            cursor.Doc.setFillColor(ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'TableHeaderBackground', PDF_LABEL));
            cursor.Doc.rect(cursor.X, cursor.Y, cursor.WidthMm, rowHeight, 'F');

            cursor.Doc.setFontSize(fontSizePt);
            cursor.Doc.setTextColor(ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'TableHeaderTextColour', PDF_LABEL));

            var c, cellX;
            for (c = 0; c < columns.length; c++) {
                cellX  =  cursor.X + (c * columnWidth);
                if (columns[c].Align === 'right') {
                    cursor.Doc.text(String(columns[c].Label || columns[c].Key),
                                    cellX + columnWidth - TABLE_CELL_PADDING_MM,
                                    cursor.Y + rowHeight - TABLE_CELL_PADDING_MM, { align: 'right' });
                } else {
                    cursor.Doc.text(String(columns[c].Label || columns[c].Key),
                                    cellX + TABLE_CELL_PADDING_MM,
                                    cursor.Y + rowHeight - TABLE_CELL_PADDING_MM);
                }
            }

            cursor.Y  +=  rowHeight;
        }

        drawHeader();

        var r, c, cellX, value, startPage;
        for (r = 0; r < rows.length; r++) {
            startPage  =  cursor.PageCount;
            VghLantern__PdfExporter__EnsureSpace(cursor, rowHeight);
            if (cursor.PageCount !== startPage) drawHeader();               // <-- A split table still reads as a table

            if (r % 2 === 1) {
                cursor.Doc.setFillColor(ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'TableAltRowBackground', PDF_LABEL));
                cursor.Doc.rect(cursor.X, cursor.Y, cursor.WidthMm, rowHeight, 'F');
            }

            cursor.Doc.setFontSize(fontSizePt);
            cursor.Doc.setTextColor(30, 30, 30);

            for (c = 0; c < columns.length; c++) {
                cellX  =  cursor.X + (c * columnWidth);
                value  =  rows[r][columns[c].Key];
                value  =  (value === undefined || value === null) ? '' : String(value);

                if (columns[c].Align === 'right') {
                    cursor.Doc.text(value, cellX + columnWidth - TABLE_CELL_PADDING_MM,
                                    cursor.Y + rowHeight - TABLE_CELL_PADDING_MM, { align: 'right' });
                } else {
                    cursor.Doc.text(value, cellX + TABLE_CELL_PADDING_MM,
                                    cursor.Y + rowHeight - TABLE_CELL_PADDING_MM);
                }
            }

            cursor.Y  +=  rowHeight;
        }

        cursor.Y  +=  SECTION_GAP_MM;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write Every Table for One Lantern
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__WriteLanternTakeoff(cursor, entry, viewState, fonts) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var tableCfg      =  VghLantern__PdfExporter__SpecConfig()['VghLantern__Specification__Config__Tables'] || {};
        var TABLE_LABEL   =  'Na__Specification__Config.json -> VghLantern__Specification__Config__Tables';

        VghLantern__PdfExporter__WriteHeading(cursor, entry.Title, fonts.HeadingPt);

        if (viewState.ShowComponentSchedule) {
            VghLantern__PdfExporter__WriteTable(cursor, ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'ComponentColumns', TABLE_LABEL), entry.Takeoff.Components, fonts.BodyPt);
        }

        if (viewState.ShowTakeoffSchedule) {
            VghLantern__PdfExporter__WriteTable(cursor, ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'LinearColumns', TABLE_LABEL), entry.Takeoff.Linear, fonts.BodyPt);
            VghLantern__PdfExporter__WriteTable(cursor, ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'AreaColumns',   TABLE_LABEL), entry.Takeoff.Areas,  fonts.BodyPt);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Specification Pages
    // ------------------------------------------------------------
    function VghLantern__PdfExporter__RenderSpecificationPages(doc, page, model, viewState) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pdfCfg    =  VghLantern__PdfExporter__PdfConfig();
        var tableCfg  =  VghLantern__PdfExporter__SpecConfig()['VghLantern__Specification__Config__Tables'] || {};
        var PDF_LABEL   =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Pdf';
        var TABLE_LABEL =  'Na__Specification__Config.json -> VghLantern__Specification__Config__Tables';
        var fonts     =  {
            TitlePt   : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'TitleFontSizePt',   PDF_LABEL),
            HeadingPt : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'HeadingFontSizePt', PDF_LABEL),
            BodyPt    : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'BodyFontSizePt',    PDF_LABEL)
        };

        var cursor  =  VghLantern__PdfExporter__CreateCursor(doc, page);
        var i;

        VghLantern__PdfExporter__WriteHeading(cursor, model.Meta.DocumentTitle, fonts.TitlePt);
        VghLantern__PdfExporter__WriteParagraph(cursor,
            [model.Meta.ProjectCode, model.Meta.ProjectName, model.Meta.ClientName]
                .filter(function(part) { return !!part; }).join('  |  '),
            fonts.BodyPt);

        if (model.UserWarnings.length) {
            VghLantern__PdfExporter__WriteHeading(cursor, 'Document Warnings', fonts.HeadingPt, COLOR_ERROR_RED);
            for (i = 0; i < model.UserWarnings.length; i++) {
                VghLantern__PdfExporter__WriteParagraph(cursor, '- ' + model.UserWarnings[i], fonts.BodyPt, COLOR_ERROR_RED);
            }
        }

        if (model.Warnings.length) {
            VghLantern__PdfExporter__WriteHeading(cursor, 'Warnings', fonts.HeadingPt);
            for (i = 0; i < model.Warnings.length; i++) {
                VghLantern__PdfExporter__WriteParagraph(cursor, '- ' + model.Warnings[i], fonts.BodyPt);
            }
        }

        VghLantern__PdfExporter__WriteHeading(cursor, 'Lantern Schedule', fonts.HeadingPt);
        VghLantern__PdfExporter__WriteTable(cursor, ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'ScheduleColumns', TABLE_LABEL), model.ScheduleRows, fonts.BodyPt);

        for (i = 0; i < model.Lanterns.length; i++) {
            VghLantern__PdfExporter__WriteLanternTakeoff(cursor, model.Lanterns[i], viewState, fonts);
        }

        if (model.Aggregate && viewState.ShowTakeoffSchedule) {
            VghLantern__PdfExporter__WriteHeading(cursor, 'Project Totals', fonts.HeadingPt);
            VghLantern__PdfExporter__WriteTable(cursor, ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'LinearColumns',    TABLE_LABEL), model.Aggregate.Linear, fonts.BodyPt);
            VghLantern__PdfExporter__WriteTable(cursor, ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'ComponentColumns', TABLE_LABEL), model.Aggregate.Components, fonts.BodyPt);
        }

        if (viewState.ShowJobNotes && model.JobNotes) {
            VghLantern__PdfExporter__WriteHeading(cursor, 'Job Notes', fonts.HeadingPt);
            VghLantern__PdfExporter__WriteParagraph(cursor, model.JobNotes, fonts.BodyPt);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Footer
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Stamp the Footer Onto Every Page
    // ------------------------------------------------------------
    // Run last, because the total page count is not known until all content is laid
    // out and "Page 2 of 5" needs the 5.
    function VghLantern__PdfExporter__StampFooters(doc) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pdfCfg  =  VghLantern__PdfExporter__PdfConfig();
        var PDF_LABEL  =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Pdf';
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(pdfCfg, 'ShowPageNumbers', PDF_LABEL)) return;

        var pattern    =  ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'PageNumberFormat', PDF_LABEL);
        var fontSizePt =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'BodyFontSizePt', PDF_LABEL) * 0.85;
        var total      =  doc.internal.getNumberOfPages();
        var p, size, label;

        for (p = 1; p <= total; p++) {
            doc.setPage(p);
            size  =  doc.internal.pageSize;

            doc.setFontSize(fontSizePt);
            doc.setTextColor(120, 120, 120);

            if (pdfCfg.FooterText) {
                doc.text(String(pdfCfg.FooterText), 12, size.getHeight() - 6);
            }

            label  =  pattern.replace('{page}', String(p)).replace('{total}', String(total));
            doc.text(label, size.getWidth() - 12, size.getHeight() - 6, { align: 'right' });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Export the Previewed Document as a PDF
    // ------------------------------------------------------------
    async function VghLantern__DocPreview__PdfExporter__Export() {
        if (VghLantern__PdfExporter__IsExporting) return false;

        var JsPdf  =  (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
        if (!JsPdf) {
            VghLantern__PdfExporter__ReportFailure('PDF export failed - the jsPDF library did not load.');
            return false;
        }

        var DocumentState  =  window.VghLantern__DocPreview__DocumentState;
        var IssueHandler   =  window.VghLantern__DocPreview__DocIssueHandler;
        var Metadata       =  window.VghLantern__DocPreview__PdfMetadataResolver;
        if (!DocumentState || !Metadata) return false;

        if (IssueHandler) {
            var issues  =  IssueHandler.VghLantern__DocPreview__DocIssueHandler__Collect();
            if (IssueHandler.VghLantern__DocPreview__DocIssueHandler__IsExportBlocked(issues)) {
                VghLantern__PdfExporter__ReportFailure('Resolve the errors listed above before exporting.');
                return false;
            }
        }

        VghLantern__PdfExporter__IsExporting  =  true;

        try {
            var viewState   =  DocumentState.VghLantern__DocPreview__DocumentState__GetViewState();
            var pageKinds   =  DocumentState.VghLantern__DocPreview__DocumentState__ListPageKinds();
            if (!pageKinds.length) {
                VghLantern__PdfExporter__ReportFailure('Every content section is switched off - nothing to export.');
                return false;
            }

            var drawingPage  =  DocumentState.VghLantern__DocPreview__DocumentState__DescribePage(
                                    DocumentState.VghLantern__DocPreview__DocumentState__DrawingOrientation()
                                );
            var specPage     =  DocumentState.VghLantern__DocPreview__DocumentState__DescribePage(null);
            var firstKind    =  pageKinds[0];
            var firstPage    =  (firstKind === 'drawing') ? drawingPage : specPage;

            var doc  =  new JsPdf({
                unit        : 'mm',
                orientation : firstPage.Orientation,
                format      : [firstPage.WidthMm, firstPage.HeightMm],
                compress    : true
            });

            var SheetManager  =  window.VghLantern__DrawingEditor__SheetManager;
            var SpecModel     =  window.VghLantern__Specification__DocumentModel;
            var sheet         =  null;
            var model         =  null;
            var i, kind, pageGeometry;

            for (i = 0; i < pageKinds.length; i++) {
                kind  =  pageKinds[i];

                if (i > 0) {
                    pageGeometry  =  (kind === 'drawing') ? drawingPage : specPage;
                    doc.addPage([pageGeometry.WidthMm, pageGeometry.HeightMm], pageGeometry.Orientation);
                }

                if (kind === 'drawing') {
                    sheet  =  SheetManager
                        ? SheetManager.VghLantern__DrawingEditor__SheetManager__DescribeSheet()
                        : { ViewSvgMarkup: {}, ViewSnapshots: {}, ScaleLabel: '' };
                    await VghLantern__PdfExporter__RenderDrawingPage(doc, drawingPage, sheet);
                } else if (kind === 'specification') {
                    model  =  SpecModel ? SpecModel.VghLantern__Specification__DocumentModel__BuildFromState() : null;
                    if (model) VghLantern__PdfExporter__RenderSpecificationPages(doc, specPage, model, viewState);
                }
            }

            VghLantern__PdfExporter__StampFooters(doc);

            var properties  =  Metadata.VghLantern__DocPreview__PdfMetadataResolver__ResolveProperties();
            doc.setProperties(properties);
            doc.save(Metadata.VghLantern__DocPreview__PdfMetadataResolver__ResolveFilename() + '.pdf');

            return true;
        } catch (exportError) {
            console.error('[VghLantern__DocPreview__PdfExporter] Export failed:', exportError);
            VghLantern__PdfExporter__ReportFailure('PDF export failed - see the console for details.');
            return false;
        } finally {
            VghLantern__PdfExporter__IsExporting  =  false;
        }
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DocPreview__PdfExporter__Export : VghLantern__DocPreview__PdfExporter__Export
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__PdfExporter  =  VghLantern__DocPreview__PdfExporter;
