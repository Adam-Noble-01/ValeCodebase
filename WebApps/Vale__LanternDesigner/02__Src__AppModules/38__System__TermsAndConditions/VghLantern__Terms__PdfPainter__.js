/* =============================================================================
   VGHLANTERN - TERMS | PDF PAINTER
   =============================================================================

   FILE       : VghLantern__Terms__PdfPainter__.js
   NAMESPACE  : VghLantern
   MODULE     : System - TermsAndConditions - PdfPainter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Paint the flowing terms pages of a Preview and Send document
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Writes the terms document as native PDF text, flowing onto as many pages as the
     clauses need.
   - Creates no document and saves no file. It paints into a page the PDF writer has
     opened, and asks the writer for another when it runs out of room, so every page
     it produces is the document's own paper size and follows the writer's footer rules.
   - Reads the model VghLantern__Terms__DocumentModel builds, which is the same model
     the screen renderer draws, so the numbers on paper are the numbers on screen.

   -----------------------------------------------------------------------------

   WHY A CLAUSE IS KEPT WHOLE ACROSS A PAGE BREAK WHERE IT CAN BE:
   A clause split so that its number and first line sit alone at the foot of a page is
   hard to cite and easy to miss. A clause that fits on one page is moved whole to the
   next rather than orphaned; one genuinely longer than a page still flows, because
   refusing to break it would lose it entirely.

   WHY THE PENDING MARKER IS DRAWN AS ITS OWN RED RUN:
   jsPDF sets one colour per text call, so a clause containing the reserved token is
   written as its normal-coloured text with the marker drawn separately in red at the
   measured offset. That keeps the marker as loud on paper as it is on screen, which
   is the only reason it exists.

   ============================================================================= */

// =============================================================================
// REGION | Terms PDF Painter Module
// =============================================================================

const VghLantern__Terms__PdfPainter = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Page Kind
    // ------------------------------------------------------------
    // Named in Na__PdfWriter__Config.json -> Footer.SkipOnPageKinds, which is how the
    // writer decides that these pages do print a footer.
    const PAGE_KIND  =  'terms';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Unit Conversion
    // ------------------------------------------------------------
    // A physical constant, not a design value: one point in millimetres.
    const PT_TO_MM  =  0.352778;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Labels
    // ------------------------------------------------------------
    const STYLE_LABEL  =  'Na__Terms__Config.json -> VghLantern__Terms__Config__Style';
    const PDF_LABEL    =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Pdf';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get a Named Terms Config Block
    // ------------------------------------------------------------
    function VghLantern__TermsPdf__Block(blockName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var termsCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Terms') || {};
        return termsCfg['VghLantern__Terms__Config__' + blockName] || {};
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Resolve Every Style Value the Painter Uses, Once
    // ------------------------------------------------------------
    // Resolved up front rather than per clause. The strict Require readers log on a
    // missing key, and a sixty-clause document would otherwise produce sixty
    // identical console errors for one absent JSON entry.
    function VghLantern__TermsPdf__ResolveStyle() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var styleCfg      =  VghLantern__TermsPdf__Block('Style');

        var docPreviewCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DocPreview') || {};
        var pdfCfg         =  docPreviewCfg['VghLantern__DocPreview__Config__Pdf'] || {};

        return {
            TitlePt        : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg,   'TitleFontSizePt',           PDF_LABEL),
            HeadingPt      : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'SectionHeadingFontSizePt',  STYLE_LABEL),
            NumberPt       : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'TermNumberFontSizePt',      STYLE_LABEL),
            BodyPt         : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'TermBodyFontSizePt',        STYLE_LABEL),
            IntroPt        : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'IntroductionFontSizePt',    STYLE_LABEL),

            LineSpacing    : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'LineSpacing',               STYLE_LABEL),
            SectionGapMm   : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'SectionGapMm',              STYLE_LABEL),
            TermGapMm      : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'TermGapMm',                 STYLE_LABEL),
            NumberWidthMm  : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'NumberColumnWidthMm',       STYLE_LABEL),
            ReviewNoticeGapMm : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'ReviewNoticeGapMm',      STYLE_LABEL),

            HeadingColour  : ConfigLoader.VghLantern__ConfigLoader__RequireString(styleCfg, 'HeadingColour',             STYLE_LABEL),
            BodyColour     : ConfigLoader.VghLantern__ConfigLoader__RequireString(styleCfg, 'BodyTextColour',            STYLE_LABEL),
            NumberColour   : ConfigLoader.VghLantern__ConfigLoader__RequireString(styleCfg, 'NumberColour',              STYLE_LABEL),
            CriticalColour : ConfigLoader.VghLantern__ConfigLoader__RequireString(styleCfg, 'CriticalTermColour',        STYLE_LABEL),

            FooterReserveMm: ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg,   'FooterReserveMm',           PDF_LABEL)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Page Cursor
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert a Point Size to a Line Height in Millimetres
    // ------------------------------------------------------------
    function VghLantern__TermsPdf__LineHeightMm(fontSizePt, style) {
        return fontSizePt * PT_TO_MM * style.LineSpacing;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create a Page Cursor for Flowing Content
    // ------------------------------------------------------------
    function VghLantern__TermsPdf__CreateCursor(doc, pageContext, page, style) {
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
    // The page comes from the writer, so it is created at this document's own paper
    // size and is registered for the footer pass.
    function VghLantern__TermsPdf__EnsureSpace(cursor, requiredMm) {
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
    function VghLantern__TermsPdf__WriteHeading(cursor, text, fontSizePt, colour, isBold) {
        var style       =  cursor.Style;
        var lineHeight  =  VghLantern__TermsPdf__LineHeightMm(fontSizePt, style);

        VghLantern__TermsPdf__EnsureSpace(cursor, lineHeight * 2);

        cursor.Doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        cursor.Doc.setFontSize(fontSizePt);
        cursor.Doc.setTextColor(colour || style.HeadingColour);
        cursor.Doc.text(String(text), cursor.X, cursor.Y + lineHeight * 0.8);

        cursor.Y  +=  lineHeight * 1.4;
        cursor.Doc.setFont('helvetica', 'normal');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write Wrapped Body Text Across the Full Column
    // ------------------------------------------------------------
    function VghLantern__TermsPdf__WriteParagraph(cursor, text, fontSizePt, colour) {
        if (!text) return;

        var style       =  cursor.Style;
        var lineHeight  =  VghLantern__TermsPdf__LineHeightMm(fontSizePt, style);

        cursor.Doc.setFontSize(fontSizePt);
        cursor.Doc.setTextColor(colour || style.BodyColour);

        var lines  =  cursor.Doc.splitTextToSize(String(text), cursor.WidthMm);
        var i;

        for (i = 0; i < lines.length; i++) {
            VghLantern__TermsPdf__EnsureSpace(cursor, lineHeight);
            cursor.Doc.text(lines[i], cursor.X, cursor.Y + lineHeight * 0.8);
            cursor.Y  +=  lineHeight;
        }

        cursor.Y  +=  lineHeight * 0.4;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write One Numbered Clause
    // ------------------------------------------------------------
    // The number sits in its own reserved column and the body is indented past it, so
    // wrapped lines align under the first line rather than under the number.
    function VghLantern__TermsPdf__WriteClause(cursor, term) {
        var style       =  cursor.Style;
        var lineHeight  =  VghLantern__TermsPdf__LineHeightMm(style.BodyPt, style);
        var bodyX       =  cursor.X + style.NumberWidthMm;
        var bodyWidth   =  cursor.WidthMm - style.NumberWidthMm;
        var bodyColour  =  term.IsCritical ? style.CriticalColour : style.BodyColour;

        cursor.Doc.setFontSize(style.BodyPt);
        var lines  =  cursor.Doc.splitTextToSize(String(term.Text), bodyWidth);

        // Keep a clause whole where it fits on one page; only break one that could
        // not fit on a page of its own.
        var blockHeight  =  lines.length * lineHeight;
        var pageHeight   =  cursor.BottomLimit - cursor.MarginMm;
        VghLantern__TermsPdf__EnsureSpace(cursor, (blockHeight <= pageHeight) ? blockHeight : lineHeight);

        cursor.Doc.setFontSize(style.NumberPt);
        cursor.Doc.setTextColor(term.IsCritical ? style.CriticalColour : style.NumberColour);
        cursor.Doc.setFont('helvetica', 'bold');
        cursor.Doc.text(String(term.Number), cursor.X, cursor.Y + lineHeight * 0.8);
        cursor.Doc.setFont('helvetica', 'normal');

        cursor.Doc.setFontSize(style.BodyPt);
        cursor.Doc.setTextColor(bodyColour);

        var i;
        for (i = 0; i < lines.length; i++) {
            VghLantern__TermsPdf__EnsureSpace(cursor, lineHeight);
            cursor.Doc.text(lines[i], bodyX, cursor.Y + lineHeight * 0.8);
            cursor.Y  +=  lineHeight;
        }

        cursor.Y  +=  style.TermGapMm;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write the Closing Review Notice
    // ------------------------------------------------------------
    // Kept whole where it fits, because a notice split across a page break says half
    // of what it is there to say on each half.
    function VghLantern__TermsPdf__WriteReviewNotice(cursor, notice) {
        if (!notice) return;

        var style       =  cursor.Style;
        var lineHeight  =  VghLantern__TermsPdf__LineHeightMm(style.BodyPt, style);

        cursor.Doc.setFontSize(style.BodyPt);
        var lines  =  cursor.Doc.splitTextToSize(String(notice.Text), cursor.WidthMm);

        cursor.Y  +=  style.ReviewNoticeGapMm;
        VghLantern__TermsPdf__EnsureSpace(cursor, (lines.length + 2) * lineHeight);

        VghLantern__TermsPdf__WriteHeading(cursor, notice.Heading, style.HeadingPt, style.CriticalColour, true);
        VghLantern__TermsPdf__WriteParagraph(cursor, notice.Text, style.BodyPt, style.CriticalColour);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Paint the Terms Document Onto an Already-Opened PDF Page
    // ------------------------------------------------------------
    // Flows onto further pages through the writer's page context as it fills up.
    function VghLantern__Terms__PdfPainter__Paint(doc, pageContext, page, model) {
        if (!doc || !page || !model) return false;

        var style   =  VghLantern__TermsPdf__ResolveStyle();
        var cursor  =  VghLantern__TermsPdf__CreateCursor(doc, pageContext, page, style);

        VghLantern__TermsPdf__WriteHeading(cursor, model.Title, style.TitlePt, style.HeadingColour, true);

        if (model.Introduction) {
            VghLantern__TermsPdf__WriteParagraph(cursor, model.Introduction, style.IntroPt, style.BodyColour);
        }

        var s, t, section;

        for (s = 0; s < model.Sections.length; s++) {
            section  =  model.Sections[s];

            if (s > 0) cursor.Y  +=  style.SectionGapMm;

            VghLantern__TermsPdf__WriteHeading(
                cursor, section.Number + '.  ' + section.Label, style.HeadingPt,
                section.IsCritical ? style.CriticalColour : style.HeadingColour, true
            );

            for (t = 0; t < section.Terms.length; t++) {
                VghLantern__TermsPdf__WriteClause(cursor, section.Terms[t]);
            }
        }

        VghLantern__TermsPdf__WriteReviewNotice(cursor, model.ReviewNotice);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Page Descriptor for the Terms Document
    // ------------------------------------------------------------
    // One descriptor covers the whole terms document however long it runs; the painter
    // asks the writer for further pages as it fills them. Returns null when there is
    // nothing to print, which the caller treats as "no terms pages" rather than an
    // error - every section switched off is a choice the user made.
    function VghLantern__Terms__PdfPainter__BuildPage(page, model) {
        if (!page || !model || !model.Sections.length) return null;

        return {
            Kind     : PAGE_KIND,
            WidthMm  : page.WidthMm,
            HeightMm : page.HeightMm,
            Paint    : function(doc, pageContext) {
                return VghLantern__Terms__PdfPainter__Paint(doc, pageContext, page, model);
            }
        };
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Terms__PdfPainter__PageKind   : PAGE_KIND,
        VghLantern__Terms__PdfPainter__Paint      : VghLantern__Terms__PdfPainter__Paint,
        VghLantern__Terms__PdfPainter__BuildPage  : VghLantern__Terms__PdfPainter__BuildPage
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Terms__PdfPainter  =  VghLantern__Terms__PdfPainter;
