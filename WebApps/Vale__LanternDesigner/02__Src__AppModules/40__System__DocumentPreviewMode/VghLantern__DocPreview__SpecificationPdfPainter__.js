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
                Schedule  : ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'ScheduleColumns',  TABLE_LABEL),
                Component : ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'ComponentColumns', TABLE_LABEL),
                Linear    : ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'LinearColumns',    TABLE_LABEL),
                Area      : ConfigLoader.VghLantern__ConfigLoader__RequireArray(tableCfg, 'AreaColumns',      TABLE_LABEL)
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
            VghLantern__SpecPainter__WriteTable(cursor, style.Columns.Area,   entry.Takeoff.Areas);
        }
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

        VghLantern__SpecPainter__WriteParagraph(cursor,
            [model.Meta.ProjectCode, model.Meta.ProjectName, model.Meta.ClientName]
                .filter(function(part) { return !!part; }).join('  |  '),
            style.BodyPt);
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
            VghLantern__SpecPainter__WriteHeading(cursor, 'Project Totals', style.HeadingPt);
            VghLantern__SpecPainter__WriteTable(cursor, style.Columns.Linear,    model.Aggregate.Linear);
            VghLantern__SpecPainter__WriteTable(cursor, style.Columns.Component, model.Aggregate.Components);
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


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DocPreview__SpecificationPdfPainter__PageKind               : PAGE_KIND,
        VghLantern__DocPreview__SpecificationPdfPainter__PaintProjectSummary    : VghLantern__DocPreview__SpecificationPdfPainter__PaintProjectSummary,
        VghLantern__DocPreview__SpecificationPdfPainter__PaintLantern           : VghLantern__DocPreview__SpecificationPdfPainter__PaintLantern,
        VghLantern__DocPreview__SpecificationPdfPainter__BuildProjectSummaryPage: VghLantern__DocPreview__SpecificationPdfPainter__BuildProjectSummaryPage,
        VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternPage       : VghLantern__DocPreview__SpecificationPdfPainter__BuildLanternPage
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DocPreview__SpecificationPdfPainter  =  VghLantern__DocPreview__SpecificationPdfPainter;
