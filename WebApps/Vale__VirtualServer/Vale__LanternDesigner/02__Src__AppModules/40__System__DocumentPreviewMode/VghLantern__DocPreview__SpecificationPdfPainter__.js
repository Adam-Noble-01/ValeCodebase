/* =============================================================================
   VGHLANTERN - DOCUMENT PREVIEW | SPECIFICATION PDF PAINTER
   =============================================================================

   FILE       : VghLantern__DocPreview__SpecificationPdfPainter__.js
   NAMESPACE  : VghLantern
   MODULE     : DocPreview - SpecificationPdfPainter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Paint the flowing specification pages of a Preview and Send document
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Writes the document title, warnings, lantern schedule, per-lantern takeoff and
     job notes as native PDF text and tables, flowing onto as many pages as the
     content needs.
   - Creates no document and saves no file. It paints into a page the PDF writer has
     opened, and asks the writer for another page when it runs out of room, so every
     page it produces is the specification's own paper size and follows the writer's
     footer rules.
   - Column descriptors come from the Specification config, the same block the
     on-screen tables read, so a column added there appears here without a second edit.

   -----------------------------------------------------------------------------

   WHY MILLIMETRES THROUGHOUT:
   The document is created in millimetres and DocumentState reports page geometry in
   millimetres, so no unit conversion happens anywhere in this file except where a
   type size is quoted in points, which is how a font size is written to a PDF.

   WHY THE CURSOR ASKS THE WRITER FOR A PAGE:
   Adding a page directly would give this painter a page of whatever size jsPDF last
   used and no entry in the footer pass. Going through the context means a
   specification that overflows in the middle of a mixed-size document still gets its
   own paper size and its own footer.

   ============================================================================= */

// =============================================================================
// REGION | Specification PDF Painter Module
// =============================================================================

const VghLantern__DocPreview__SpecificationPdfPainter = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Page Kind
    // ------------------------------------------------------------
    // Named in Na__PdfWriter__Config.json -> Footer.SkipOnPageKinds, which is how the
    // writer decides that these pages do print a footer.
    const PAGE_KIND  =  'specification';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Unit Conversion
    // ------------------------------------------------------------
    // A physical constant, not a design value: one point in millimetres.
    const PT_TO_MM  =  0.352778;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Labels
    // ------------------------------------------------------------
    const PDF_LABEL    =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Pdf';
    const TABLE_LABEL  =  'Na__Specification__Config.json -> VghLantern__Specification__Config__Tables';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Empty Cutting List Wording
    // ------------------------------------------------------------
    // Stated here rather than in config because the screen renderer states its own
    // copy of the same sentence inline, and two config keys for one line of text on one
    // page would be more machinery than the line is worth.
    const EMPTY_CUTTING_LIST_TEXT  =  'This lantern has no cut pieces to schedule.';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Glazing Schedule Line Estimate
    // ------------------------------------------------------------
    // The glazing page is laid out before anything is drawn, so a wrapped line count
    // has to be estimated rather than measured. A generous average Helvetica advance,
    // as a fraction of type size, over-counts lines rather than under-counting them:
    // an over-count leaves a little air, an under-count would overprint the plan.
    const GLAZING_AVERAGE_ADVANCE  =  0.6;
    const GLAZING_CAP_HEIGHT       =  0.717;                                   // <-- Helvetica's cap height as a share of type size, to centre a line in a row
    const GLAZING_TOTAL_RULE_MM    =  0.35;                                    // <-- The rule over a totals row, as the preview's print table draws it
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Document Preview PDF Config Block
    // ------------------------------------------------------------
    function VghLantern__SpecPainter__PdfConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var docCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DocPreview') || {};
        return docCfg['VghLantern__DocPreview__Config__Pdf'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Specification Table Config Block
    // ------------------------------------------------------------
    function VghLantern__SpecPainter__TableConfig() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var specCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Specification') || {};
        return specCfg['VghLantern__Specification__Config__Tables'] || {};
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Resolve Every Config Value the Painter Uses, Once
    // ------------------------------------------------------------
    // Resolved up front rather than per row. The strict Require readers log on a
    // missing key, and a table with two hundred rows used to produce two hundred
    // identical console errors for one absent JSON entry.
    function VghLantern__SpecPainter__ResolveStyle() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var pdfCfg    =  VghLantern__SpecPainter__PdfConfig();
        var tableCfg  =  VghLantern__SpecPainter__TableConfig();

        return {
            TitlePt            : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'TitleFontSizePt',      PDF_LABEL),
            HeadingPt          : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'HeadingFontSizePt',    PDF_LABEL),
            BodyPt             : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'BodyFontSizePt',       PDF_LABEL),

            LineSpacing        : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'LineSpacing',          PDF_LABEL),
            CellPaddingMm      : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'TableCellPaddingMm',   PDF_LABEL),
            SectionGapMm       : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'SectionGapMm',         PDF_LABEL),
            FooterReserveMm    : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg, 'FooterReserveMm',      PDF_LABEL),

            HeaderBackground   : ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'TableHeaderBackground', PDF_LABEL),
            HeaderTextColour   : ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'TableHeaderTextColour', PDF_LABEL),
            AltRowBackground   : ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'TableAltRowBackground', PDF_LABEL),
            HeadingColour      : ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'HeadingColour',         PDF_LABEL),
            BodyColour         : ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'BodyTextColour',        PDF_LABEL),
            UserWarningColour  : ConfigLoader.VghLantern__ConfigLoader__RequireString(pdfCfg, 'UserWarningColour',     PDF_LABEL),

            Columns : {
                Schedule        : ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'ScheduleColumns',        TABLE_LABEL),
                Component       : ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'ComponentColumns',       TABLE_LABEL),
                Linear          : ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'LinearColumns',          TABLE_LABEL),
                AggregateLinear : ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'AggregateLinearColumns', TABLE_LABEL),
                CuttingList     : ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'CuttingListColumns',     TABLE_LABEL),
                Area            : ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'AreaColumns',            TABLE_LABEL)
            }
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Page Cursor
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert a Point Size to a Line Height in Millimetres
    // ------------------------------------------------------------
    function VghLantern__SpecPainter__LineHeightMm(fontSizePt, style) {
        return fontSizePt * PT_TO_MM * style.LineSpacing;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create a Page Cursor for Flowing Content
    // ------------------------------------------------------------
    // Every writer below takes this cursor, so page breaks are handled in one place
    // rather than repeated per table.
    function VghLantern__SpecPainter__CreateCursor(doc, pageContext, page, style) {
        return {
            Doc         : doc,
            Context     : pageContext,
            Style       : style,
            X           : page.MarginMm,
            Y           : page.MarginMm,
            MarginMm    : page.MarginMm,
            WidthMm     : page.BodyWidthMm,
            BottomLimit : page.HeightMm - page.MarginMm - style.FooterReserveMm
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Break to a New Page When the Next Block Will Not Fit
    // ------------------------------------------------------------
    // The page comes from the writer, so it is created at this document's own
    // specification page size and is registered for the footer pass.
    function VghLantern__SpecPainter__EnsureSpace(cursor, requiredMm) {
        if (cursor.Y + requiredMm <= cursor.BottomLimit) return false;

        cursor.Context.AddOverflowPage();
        cursor.Y  =  cursor.MarginMm;
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Text Blocks
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Write a Heading
    // ------------------------------------------------------------
    // colourOverride is used only for the staff-authored Document Warnings heading,
    // so it prints red instead of the default brand navy.
    function VghLantern__SpecPainter__WriteHeading(cursor, text, fontSizePt, colourOverride) {
        var style       =  cursor.Style;
        var lineHeight  =  VghLantern__SpecPainter__LineHeightMm(fontSizePt, style);

        VghLantern__SpecPainter__EnsureSpace(cursor, lineHeight * 2);

        cursor.Doc.setFontSize(fontSizePt);
        cursor.Doc.setTextColor(colourOverride || style.HeadingColour);
        cursor.Doc.text(String(text), cursor.X, cursor.Y + lineHeight * 0.8);

        cursor.Y  +=  lineHeight * 1.4;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write Wrapped Body Text
    // ------------------------------------------------------------
    function VghLantern__SpecPainter__WriteParagraph(cursor, text, fontSizePt, colourOverride) {
        if (!text) return;

        var style       =  cursor.Style;
        var lineHeight  =  VghLantern__SpecPainter__LineHeightMm(fontSizePt, style);
        var lines       =  cursor.Doc.splitTextToSize(String(text), cursor.WidthMm);
        var i;

        cursor.Doc.setFontSize(fontSizePt);
        cursor.Doc.setTextColor(colourOverride || style.BodyColour);

        for (i = 0; i < lines.length; i++) {
            VghLantern__SpecPainter__EnsureSpace(cursor, lineHeight);
            cursor.Doc.text(lines[i], cursor.X, cursor.Y + lineHeight * 0.8);
            cursor.Y  +=  lineHeight;
        }

        cursor.Y  +=  lineHeight * 0.4;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write a Bulleted List of Warnings
    // ------------------------------------------------------------
    function VghLantern__SpecPainter__WriteWarningList(cursor, heading, warnings, colourOverride) {
        if (!warnings || !warnings.length) return;

        var style  =  cursor.Style;
        var i;

        VghLantern__SpecPainter__WriteHeading(cursor, heading, style.HeadingPt, colourOverride);
        for (i = 0; i < warnings.length; i++) {
            VghLantern__SpecPainter__WriteParagraph(cursor, '- ' + warnings[i], style.BodyPt, colourOverride);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Tables
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Write a Table from Column Descriptors and Rows
    // ------------------------------------------------------------
    // Columns come from the Specification config, so the PDF and the on-screen tables
    // cannot drift apart. Numeric columns are right-aligned by their config Align.
    function VghLantern__SpecPainter__WriteTable(cursor, columns, rows) {
        if (!columns || !columns.length || !rows || !rows.length) return;

        var style       =  cursor.Style;
        var lineHeight  =  VghLantern__SpecPainter__LineHeightMm(style.BodyPt, style);
        var rowHeight   =  lineHeight + (style.CellPaddingMm * 2) - 0.6;
        var columnWidth =  cursor.WidthMm / columns.length;

        // HELPER | Place one cell's text, honouring its configured alignment
        function writeCell(text, columnIndex, isRightAligned) {
            var cellX  =  cursor.X + (columnIndex * columnWidth);

            if (isRightAligned) {
                cursor.Doc.text(String(text), cellX + columnWidth - style.CellPaddingMm,
                                cursor.Y + rowHeight - style.CellPaddingMm, { align: 'right' });
                return;
            }
            cursor.Doc.text(String(text), cellX + style.CellPaddingMm,
                            cursor.Y + rowHeight - style.CellPaddingMm);
        }

        // HELPER | Draw the header band, repeated after every page break
        function drawHeader() {
            VghLantern__SpecPainter__EnsureSpace(cursor, rowHeight * 2);

            cursor.Doc.setFillColor(style.HeaderBackground);
            cursor.Doc.rect(cursor.X, cursor.Y, cursor.WidthMm, rowHeight, 'F');

            cursor.Doc.setFontSize(style.BodyPt);
            cursor.Doc.setTextColor(style.HeaderTextColour);

            var c;
            for (c = 0; c < columns.length; c++) {
                writeCell(columns[c].Label || columns[c].Key, c, columns[c].Align === 'right');
            }

            cursor.Y  +=  rowHeight;
        }

        drawHeader();

        var r, c, value;
        for (r = 0; r < rows.length; r++) {
            if (VghLantern__SpecPainter__EnsureSpace(cursor, rowHeight)) drawHeader(); // <-- A split table still reads as a table

            if (r % 2 === 1) {
                cursor.Doc.setFillColor(style.AltRowBackground);
                cursor.Doc.rect(cursor.X, cursor.Y, cursor.WidthMm, rowHeight, 'F');
            }

            cursor.Doc.setFontSize(style.BodyPt);
            cursor.Doc.setTextColor(style.BodyColour);

            for (c = 0; c < columns.length; c++) {
                value  =  rows[r][columns[c].Key];
                writeCell((value === undefined || value === null) ? '' : value, c, columns[c].Align === 'right');
            }

            cursor.Y  +=  rowHeight;
        }

        cursor.Y  +=  style.SectionGapMm;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write Every Table for One Lantern
    // ------------------------------------------------------------
    // isOwnPage suppresses the lantern heading, because on a page of its own the
    // masthead already names the lantern.
    function VghLantern__SpecPainter__WriteLanternTakeoff(cursor, entry, viewState, isOwnPage) {
        var style  =  cursor.Style;

        if (!isOwnPage) VghLantern__SpecPainter__WriteHeading(cursor, entry.Title, style.HeadingPt);

        if (viewState.ShowComponentSchedule) {
            VghLantern__SpecPainter__WriteTable(cursor, style.Columns.Component, entry.Takeoff.Components);
        }

        if (viewState.ShowTakeoffSchedule) {
            VghLantern__SpecPainter__WriteTable(cursor, style.Columns.Linear, entry.Takeoff.Linear);
            if (VghLantern__SpecPainter__ShowsAreas()) {
                VghLantern__SpecPainter__WriteTable(cursor, style.Columns.Area, entry.Takeoff.Areas);
            }
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Whether the Specification Still Prints Glazing Areas
    // ------------------------------------------------------------
    // The same answer the preview takes: the Specification's own section switch, so
    // the gross areas leave the tab, the preview and the file together (off since
    // v0.10.0, when each roof glazing unit took on its own area and the total glass).
    function VghLantern__SpecPainter__ShowsAreas() {
        var DocumentModel  =  window.VghLantern__Specification__DocumentModel;
        if (!DocumentModel) return false;
        return DocumentModel.VghLantern__Specification__DocumentModel__ListSections().some(function(section) {
            return section.Renderer === 'areas';
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Masthead's Second Line
    // ------------------------------------------------------------
    function VghLantern__SpecPainter__MetaLine(model) {
        return [model.Meta.ProjectCode, model.Meta.ProjectName, model.Meta.ClientName]
            .filter(function(part) { return !!part; }).join('  |  ');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write the Document Masthead
    // ------------------------------------------------------------
    // Mirrors PrintDocumentRenderer's masthead so the printed page and the previewed
    // page open with the same two lines.
    function VghLantern__SpecPainter__WriteMasthead(cursor, model, titleSuffix) {
        var style  =  cursor.Style;

        VghLantern__SpecPainter__WriteHeading(cursor,
            model.Meta.DocumentTitle + (titleSuffix ? ('  -  ' + titleSuffix) : ''), style.TitlePt);

        VghLantern__SpecPainter__WriteParagraph(cursor, VghLantern__SpecPainter__MetaLine(model), style.BodyPt);
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Find One Lantern's Entry in a Built Model
    // ------------------------------------------------------------
    // Matched on LanternIndex rather than array position: the model omits any lantern
    // the solver rejected, so position would pair the wrong takeoff with the drawing
    // it is printed behind.
    function VghLantern__SpecPainter__FindLantern(model, lanternIndex) {
        var i;
        for (i = 0; i < model.Lanterns.length; i++) {
            if (model.Lanterns[i].LanternIndex === lanternIndex) return model.Lanterns[i];
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Glazing Schedule
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Estimate How Many Lines a Text Wraps To
    // ------------------------------------------------------------
    function VghLantern__SpecPainter__EstimateLines(text, fontSizePt, widthMm) {
        if (!text) return 0;
        var runMm  =  String(text).length * fontSizePt * PT_TO_MM * GLAZING_AVERAGE_ADVANCE;
        return Math.max(1, Math.ceil(runMm / Math.max(1, widthMm)));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Frame One Lantern's Glazing Schedule Is Laid Out In
    // ------------------------------------------------------------
    // Shared with the preview (PrintDocumentRenderer), which lays its pages out in this
    // same frame, so the file and the preview break at the same rows. The masthead and
    // the note are sized from this painter's own type, which is how this file writes
    // them; the preview sets both smaller, so they always fit the space kept here.
    // Returns { UsableHeightMm, MastheadMm, NoteMm, MastheadSuffix }.
    function VghLantern__DocPreview__SpecificationPdfPainter__GlazingPageFrame(page, model, entry, schedule) {
        var Renderer  =  window.VghLantern__Specification__GlazingScheduleRenderer;
        var style     =  VghLantern__SpecPainter__ResolveStyle();
        var text      =  Renderer.VghLantern__Specification__GlazingScheduleRenderer__PageText(schedule);
        var titleMm   =  VghLantern__SpecPainter__LineHeightMm(style.TitlePt, style);
        var bodyMm    =  VghLantern__SpecPainter__LineHeightMm(style.BodyPt, style);
        var noteText  =  text.Message || text.Note;
        var metaLines =  Math.max(1, VghLantern__SpecPainter__EstimateLines(VghLantern__SpecPainter__MetaLine(model), style.BodyPt, page.BodyWidthMm));
        var noteLines =  VghLantern__SpecPainter__EstimateLines(noteText, style.BodyPt, page.BodyWidthMm);

        // The advances WriteHeading and WriteParagraph make: a heading moves on 1.4
        // lines, a paragraph its lines plus 0.4 of one.
        return {
            UsableHeightMm : page.HeightMm - (page.MarginMm * 2) - style.FooterReserveMm,
            MastheadMm     : (titleMm * 1.4) + (bodyMm * (metaLines + 0.4)),
            NoteMm         : noteLines ? bodyMm * (noteLines + 0.4) : 0,
            MastheadSuffix : entry.Title + '  -  ' + text.TitleSuffix
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write a Cell's Lines From a Top Edge, Honouring Its Alignment
    // ------------------------------------------------------------
    function VghLantern__SpecPainter__WriteCellLines(doc, lines, cellX, column, topMm, lineMm, padMm) {
        var k, baseline;
        for (k = 0; k < lines.length; k++) {
            baseline  =  topMm + (lineMm * k) + (lineMm * 0.8);
            if (column.Align === 'right') {
                doc.text(String(lines[k]), cellX + column.WidthMm - padMm, baseline, { align: 'right' });
            } else {
                doc.text(String(lines[k]), cellX + padMm, baseline);
            }
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write the Panel Table Rows One Page Holds
    // ------------------------------------------------------------
    // The header band, then each panel row at the fixed height the layout gave it:
    // the cut drawing drawn natively into its column by the schedule's own renderer,
    // and in every text column the column's name faint at the top with the value,
    // larger, centred in the row's height and any second line smaller and lighter
    // beneath it, as the preview's cells are. Alternate rows are shaded as the other
    // tables in the pack are.
    function VghLantern__SpecPainter__WriteGlazingTable(cursor, schedule, rowIndices, columns, metrics, Renderer, withTotal) {
        var doc       =  cursor.Doc;
        var style     =  cursor.Style;
        var lineMm    =  VghLantern__SpecPainter__LineHeightMm(style.BodyPt, style);
        var valuePt   =  metrics.ValueFontMm / PT_TO_MM;
        var valueMm   =  metrics.ValueFontMm * metrics.CellLineRatio;
        var subPt     =  metrics.SecondaryFontMm / PT_TO_MM;
        var subMm     =  metrics.SecondaryFontMm * metrics.CellLineRatio;
        var labelPt   =  metrics.LabelFontMm / PT_TO_MM;
        var labelMm   =  metrics.LabelFontMm * 1.2;
        var padMm     =  metrics.CellPaddingMm;
        var y         =  cursor.Y;
        var i, c, x, column, lines, row, cellLines, main, sub, widthMm, blockTop;

        // HEADER | Each label wrapped to its column, centred in the band's height.
        doc.setFillColor(style.HeaderBackground);
        doc.rect(cursor.X, y, cursor.WidthMm, metrics.HeaderHeightMm, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(style.BodyPt);
        doc.setTextColor(style.HeaderTextColour);

        x  =  cursor.X;
        for (c = 0; c < columns.length; c++) {
            column  =  columns[c];
            lines   =  doc.splitTextToSize(String(column.Label), Math.max(1, column.WidthMm - (padMm * 2))).slice(0, 2);
            VghLantern__SpecPainter__WriteCellLines(doc, lines, x, column,
                y + ((metrics.HeaderHeightMm - (lines.length * lineMm)) / 2), lineMm, padMm);
            x  +=  column.WidthMm;
        }
        y  +=  metrics.HeaderHeightMm;

        // ROWS | A row never splits: the layout only gave this page the rows it holds.
        for (i = 0; i < rowIndices.length; i++) {
            row  =  schedule.Rows[rowIndices[i]];
            if (!row) continue;

            if (i % 2 === 1) {
                doc.setFillColor(style.AltRowBackground);
                doc.rect(cursor.X, y, cursor.WidthMm, metrics.RowHeightMm, 'F');
            }

            x  =  cursor.X;
            for (c = 0; c < columns.length; c++) {
                column  =  columns[c];

                if (column.Key === 'Drawing') {
                    Renderer.VghLantern__Specification__GlazingScheduleRenderer__DrawToPdf(doc, row.Drawing, x, y + metrics.RowPaddingMm);
                    x  +=  column.WidthMm;
                    continue;
                }

                cellLines  =  Renderer.VghLantern__Specification__GlazingScheduleRenderer__CellLines(column.Key, row, schedule);
                widthMm    =  Math.max(1, column.WidthMm - (padMm * 2));

                // THE LABEL | The column's name, faint, in the top of the cell.
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(labelPt);
                doc.setTextColor(metrics.LabelColour);
                VghLantern__SpecPainter__WriteCellLines(doc, doc.splitTextToSize(String(column.Label), widthMm).slice(0, 2),
                    x, column, y + padMm, labelMm, padMm);

                // THE VALUE | Measured first, so the value and its second line sit
                // centred in the row's height together.
                doc.setFont('helvetica', column.Key === 'Code' ? 'bold' : 'normal');
                doc.setFontSize(valuePt);
                main  =  doc.splitTextToSize(String(cellLines[0] === undefined ? '' : cellLines[0]), widthMm);
                sub   =  [];
                if (cellLines.length > 1 && cellLines[1]) {
                    doc.setFontSize(subPt);
                    sub  =  doc.splitTextToSize(String(cellLines[1]), widthMm);
                }
                blockTop  =  y + ((metrics.RowHeightMm - ((main.length * valueMm) + (sub.length * subMm))) / 2);

                doc.setFontSize(valuePt);
                doc.setTextColor(style.BodyColour);
                VghLantern__SpecPainter__WriteCellLines(doc, main, x, column, blockTop, valueMm, padMm);

                if (sub.length) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(subPt);
                    doc.setTextColor(metrics.SecondaryColour);
                    VghLantern__SpecPainter__WriteCellLines(doc, sub, x, column, blockTop + (main.length * valueMm), subMm, padMm);
                }

                x  +=  column.WidthMm;
            }

            y  +=  metrics.RowHeightMm;
        }

        // THE TOTAL | The total glass closes the table: a brand rule above it, as the
        // preview's totals row has, and the label set against the figure under the
        // Area column, both bold.
        if (withTotal) {
            var at        =  Renderer.VghLantern__Specification__GlazingScheduleRenderer__TotalColumn(columns);
            var baseline  =  y + (metrics.TotalRowHeightMm / 2) + ((metrics.ValueFontMm * GLAZING_CAP_HEIGHT) / 2);
            var areaX     =  cursor.X;

            doc.setDrawColor(style.HeaderBackground);
            doc.setLineWidth(GLAZING_TOTAL_RULE_MM);
            doc.line(cursor.X, y, cursor.X + cursor.WidthMm, y);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(valuePt);
            doc.setTextColor(style.BodyColour);

            if (at > 0) {
                for (c = 0; c < at; c++) areaX  +=  columns[c].WidthMm;
                doc.text(String(schedule.TotalLabel), areaX - padMm, baseline, { align: 'right' });
                doc.text(String(schedule.TotalAreaText), areaX + columns[at].WidthMm - padMm, baseline, { align: 'right' });
            } else {
                doc.text(String(schedule.TotalLabel) + '  ' + String(schedule.TotalAreaText), cursor.X + padMm, baseline);
            }
            y  +=  metrics.TotalRowHeightMm;
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(style.BodyPt);
        cursor.Y  =  y;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write One Laid-Out Block of a Glazing Page
    // ------------------------------------------------------------
    // The cursor is put at the block's own top first, so every block lands exactly
    // where the layout placed it whatever the block before it advanced by.
    function VghLantern__SpecPainter__WriteGlazingBlock(cursor, block, sheet) {
        var Renderer  =  sheet.Renderer;
        var style     =  cursor.Style;
        var doc       =  cursor.Doc;

        cursor.Y  =  cursor.MarginMm + block.TopMm;

        if (block.Kind === Renderer.VGHLANTERN__GLAZINGRENDERER__BLOCK_MASTHEAD) {
            VghLantern__SpecPainter__WriteMasthead(cursor, sheet.Model, sheet.Frame.MastheadSuffix);
            return;
        }

        if (block.Kind === Renderer.VGHLANTERN__GLAZINGRENDERER__BLOCK_NOTE) {
            VghLantern__SpecPainter__WriteParagraph(cursor, sheet.Text.Note, style.BodyPt);
            return;
        }

        if (block.Kind === Renderer.VGHLANTERN__GLAZINGRENDERER__BLOCK_MESSAGE) {
            VghLantern__SpecPainter__WriteParagraph(cursor, sheet.Text.Message, style.BodyPt);
            return;
        }

        if (block.Kind === Renderer.VGHLANTERN__GLAZINGRENDERER__BLOCK_PLAN) {
            var plan  =  sheet.Schedule.Plan;
            Renderer.VghLantern__Specification__GlazingScheduleRenderer__DrawToPdf(
                doc, plan, cursor.X + ((cursor.WidthMm - plan.WidthMm) / 2), cursor.Y);

            // The caption sits in the band under the plan the layout reserved for it.
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(sheet.Metrics.CaptionFontMm / PT_TO_MM);
            doc.setTextColor(sheet.Metrics.SecondaryColour);
            doc.text(sheet.Text.Caption, cursor.X + (cursor.WidthMm / 2),
                     cursor.Y + plan.HeightMm + sheet.Metrics.CaptionGapMm + (sheet.Metrics.CaptionFontMm * 0.95),
                     { align: 'center' });
            return;
        }

        if (block.Kind === Renderer.VGHLANTERN__GLAZINGRENDERER__BLOCK_TABLE) {
            VghLantern__SpecPainter__WriteGlazingTable(cursor, sheet.Schedule, block.RowIndices, sheet.Columns, sheet.Metrics, Renderer, !!block.HasTotal);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Paint the Project Summary Onto an Already-Opened PDF Page
    // ------------------------------------------------------------
    // What the whole job amounts to: the schedule, the totals and the job notes. Flows
    // onto further pages through the writer's page context as it fills up.
    function VghLantern__DocPreview__SpecificationPdfPainter__PaintProjectSummary(doc, pageContext, page, model, viewState) {
        if (!doc || !page || !model) return false;

        var style   =  VghLantern__SpecPainter__ResolveStyle();
        var cursor  =  VghLantern__SpecPainter__CreateCursor(doc, pageContext, page, style);

        VghLantern__SpecPainter__WriteMasthead(cursor, model, '');

        // Staff-authored warnings lead and print red: they are free text a person
        // wrote about this job, not a rule the application evaluated. They sit on the
        // summary rather than being repeated per lantern because each one already
        // names the lantern it came from.
        VghLantern__SpecPainter__WriteWarningList(cursor, 'Document Warnings', model.UserWarnings, style.UserWarningColour);
        VghLantern__SpecPainter__WriteWarningList(cursor, 'Warnings',          model.Warnings,     null);

        VghLantern__SpecPainter__WriteHeading(cursor, 'Lantern Schedule', style.HeadingPt);
        VghLantern__SpecPainter__WriteTable(cursor, style.Columns.Schedule, model.ScheduleRows);

        if (model.Aggregate && viewState.ShowTakeoffSchedule) {
            // Aggregate rows carry project totals, not per-lantern figures, so they
            // print through their own column set. Borrowing the per-lantern columns
            // here would head a column "Lantern Total" and leave it blank down the page.
            VghLantern__SpecPainter__WriteHeading(cursor, 'Project Totals', style.HeadingPt);
            VghLantern__SpecPainter__WriteTable(cursor, style.Columns.AggregateLinear, model.Aggregate.Linear);
            VghLantern__SpecPainter__WriteTable(cursor, style.Columns.Component,       model.Aggregate.Components);
        }

        if (viewState.ShowJobNotes && model.JobNotes) {
            VghLantern__SpecPainter__WriteHeading(cursor, 'Job Notes', style.HeadingPt);
            VghLantern__SpecPainter__WriteParagraph(cursor, model.JobNotes, style.BodyPt);
        }

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Paint One Lantern's Specification Onto an Already-Opened PDF Page
    // ------------------------------------------------------------
    function VghLantern__DocPreview__SpecificationPdfPainter__PaintLantern(doc, pageContext, page, model, viewState, lanternIndex) {
        if (!doc || !page || !model) return false;

        var entry  =  VghLantern__SpecPainter__FindLantern(model, lanternIndex);
        if (!entry) return false;

        var style   =  VghLantern__SpecPainter__ResolveStyle();
        var cursor  =  VghLantern__SpecPainter__CreateCursor(doc, pageContext, page, style);

        VghLantern__SpecPainter__WriteMasthead(cursor, model, entry.Title);
        VghLantern__SpecPainter__WriteLanternTakeoff(cursor, entry, viewState, true);

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Paint One Lantern's Cutting List Onto an Already-Opened PDF Page
    // ------------------------------------------------------------
    // Its own page, closing that lantern's set, because it is the sheet a workshop sets
    // a saw from rather than a schedule the client reads.
    function VghLantern__DocPreview__SpecificationPdfPainter__PaintLanternCuttingList(doc, pageContext, page, model, lanternIndex) {
        if (!doc || !page || !model) return false;

        var entry  =  VghLantern__SpecPainter__FindLantern(model, lanternIndex);
        if (!entry || !entry.Takeoff) return false;

        var style   =  VghLantern__SpecPainter__ResolveStyle();
        var cursor  =  VghLantern__SpecPainter__CreateCursor(doc, pageContext, page, style);

        VghLantern__SpecPainter__WriteMasthead(cursor, model, entry.Title + '  -  Cutting List');

        // A lantern with nothing to cut still gets its page, saying so. The preview
        // emits one page per plan entry and stamps "Page 2 of 7" from that count, so a
        // page dropped here and not there would renumber the whole pack against the
        // preview the user just approved.
        if (Array.isArray(entry.Takeoff.CuttingList) && entry.Takeoff.CuttingList.length) {
            VghLantern__SpecPainter__WriteTable(cursor, style.Columns.CuttingList, entry.Takeoff.CuttingList);
        } else {
            VghLantern__SpecPainter__WriteParagraph(cursor, EMPTY_CUTTING_LIST_TEXT, style.BodyPt);
        }

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Paint One Lantern's Glazing Schedule Onto an Already-Opened PDF Page
    // ------------------------------------------------------------
    // The glazing department's sheet, closing that lantern's set: page by page as
    // GlazingScheduleRenderer.LayoutPages laid it out, which is the layout the preview
    // drew, so the file breaks where the preview showed it breaking. This is the
    // pack's failsafe build: the schedule is cut and drawn here unless the preview or
    // the Specification tab already built it for an unchanged lantern.
    function VghLantern__DocPreview__SpecificationPdfPainter__PaintLanternGlazingSchedule(doc, pageContext, page, model, lanternIndex) {
        var Schedule  =  window.VghLantern__Specification__GlazingSchedule;
        var Renderer  =  window.VghLantern__Specification__GlazingScheduleRenderer;
        if (!doc || !page || !model || !Schedule || !Renderer) return false;

        var entry  =  VghLantern__SpecPainter__FindLantern(model, lanternIndex);
        if (!entry) return false;

        var style     =  VghLantern__SpecPainter__ResolveStyle();
        var cursor    =  VghLantern__SpecPainter__CreateCursor(doc, pageContext, page, style);
        var schedule  =  Schedule.VghLantern__Specification__GlazingSchedule__ForLanternIndex(lanternIndex);
        var frame     =  VghLantern__DocPreview__SpecificationPdfPainter__GlazingPageFrame(page, model, entry, schedule);
        var sheet     =  {
            Renderer : Renderer,
            Model    : model,
            Schedule : schedule,
            Frame    : frame,
            Text     : Renderer.VghLantern__Specification__GlazingScheduleRenderer__PageText(schedule),
            Metrics  : Renderer.VghLantern__Specification__GlazingScheduleRenderer__PageMetrics(),
            Columns  : Renderer.VghLantern__Specification__GlazingScheduleRenderer__ResolveColumns(page.BodyWidthMm)
        };
        var layout  =  Renderer.VghLantern__Specification__GlazingScheduleRenderer__LayoutPages(schedule, frame);
        var p, b;

        for (p = 0; p < layout.length; p++) {
            if (p > 0) pageContext.AddOverflowPage();
            for (b = 0; b < layout[p].Blocks.length; b++) {
                VghLantern__SpecPainter__WriteGlazingBlock(cursor, layout[p].Blocks[b], sheet);
            }
        }

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Page Descriptor for the Project Summary
    // ------------------------------------------------------------
    // One descriptor covers the whole summary however long it runs; the painter asks
    // the writer for further pages as it fills them.
    function VghLantern__DocPreview__SpecificationPdfPainter__BuildProjectSummaryPage(page, model, viewState) {
        if (!page || !model) return null;

        return {
            Kind     : PAGE_KIND,
            WidthMm  : page.WidthMm,
            HeightMm : page.HeightMm,
            Paint    : function(doc, pageContext) {
                return VghLantern__DocPreview__SpecificationPdfPainter__PaintProjectSummary(doc, pageContext, page, model, viewState);
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Page Descriptor for One Lantern's Specification
    // ------------------------------------------------------------
    // Returns null for a lantern the model does not hold, which drops the page rather
    // than printing a masthead over nothing. A lantern the solver rejected is already
    // reported by the issue banner, so the pack does not need to say so twice.
    function VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternPage(page, model, viewState, lanternIndex) {
        if (!page || !model) return null;
        if (!VghLantern__SpecPainter__FindLantern(model, lanternIndex)) return null;

        return {
            Kind     : PAGE_KIND,
            WidthMm  : page.WidthMm,
            HeightMm : page.HeightMm,
            Paint    : function(doc, pageContext) {
                return VghLantern__DocPreview__SpecificationPdfPainter__PaintLantern(doc, pageContext, page, model, viewState, lanternIndex);
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Page Descriptor for One Lantern's Cutting List
    // ------------------------------------------------------------
    // Returns null only for a lantern the model does not hold - one the solver rejected,
    // already reported by the issue banner. A lantern that HAS no cuts still gets its
    // page: see PaintLanternCuttingList for why an empty one is printed rather than
    // dropped.
    function VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternCuttingListPage(page, model, lanternIndex) {
        if (!page || !model) return null;

        var entry  =  VghLantern__SpecPainter__FindLantern(model, lanternIndex);
        if (!entry || !entry.Takeoff) return null;

        return {
            Kind     : PAGE_KIND,
            WidthMm  : page.WidthMm,
            HeightMm : page.HeightMm,
            Paint    : function(doc, pageContext) {
                return VghLantern__DocPreview__SpecificationPdfPainter__PaintLanternCuttingList(doc, pageContext, page, model, lanternIndex);
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Page Descriptor for One Lantern's Glazing Schedule
    // ------------------------------------------------------------
    // Returns null only for a lantern the model does not hold, as the cutting list
    // does. A lantern with no glazing panels still gets its page, saying so, for the
    // same page-count reason. Nothing is cut or drawn until the writer paints it.
    function VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternGlazingSchedulePage(page, model, lanternIndex) {
        if (!page || !model) return null;
        if (!VghLantern__SpecPainter__FindLantern(model, lanternIndex)) return null;

        return {
            Kind     : PAGE_KIND,
            WidthMm  : page.WidthMm,
            HeightMm : page.HeightMm,
            Paint    : function(doc, pageContext) {
                return VghLantern__DocPreview__SpecificationPdfPainter__PaintLanternGlazingSchedule(doc, pageContext, page, model, lanternIndex);
            }
        };
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DocPreview__SpecificationPdfPainter__PageKind               : PAGE_KIND,
        VghLantern__DocPreview__SpecificationPdfPainter__PaintProjectSummary    : VghLantern__DocPreview__SpecificationPdfPainter__PaintProjectSummary,
        VghLantern__DocPreview__SpecificationPdfPainter__PaintLantern           : VghLantern__DocPreview__SpecificationPdfPainter__PaintLantern,
        VghLantern__DocPreview__SpecificationPdfPainter__PaintLanternCuttingList: VghLantern__DocPreview__SpecificationPdfPainter__PaintLanternCuttingList,
        VghLantern__DocPreview__SpecificationPdfPainter__PaintLanternGlazingSchedule :
            VghLantern__DocPreview__SpecificationPdfPainter__PaintLanternGlazingSchedule,
        VghLantern__DocPreview__SpecificationPdfPainter__GlazingPageFrame       : VghLantern__DocPreview__SpecificationPdfPainter__GlazingPageFrame,
        VghLantern__DocPreview__SpecificationPdfPainter__BuildProjectSummaryPage: VghLantern__DocPreview__SpecificationPdfPainter__BuildProjectSummaryPage,
        VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternPage       : VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternPage,
        VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternCuttingListPage :
            VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternCuttingListPage,
        VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternGlazingSchedulePage :
            VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternGlazingSchedulePage
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__SpecificationPdfPainter  =  VghLantern__DocPreview__SpecificationPdfPainter;
