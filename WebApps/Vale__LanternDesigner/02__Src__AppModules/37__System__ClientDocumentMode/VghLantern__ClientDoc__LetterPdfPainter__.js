/* =============================================================================
   VGHLANTERN - CLIENT DOC | LETTER PDF PAINTER
   =============================================================================

   FILE       : VghLantern__ClientDoc__LetterPdfPainter__.js
   NAMESPACE  : VghLantern
   MODULE     : System - ClientDocumentMode - LetterPdfPainter
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Paint the welcome letter page of a Preview and Send document
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Writes the letterhead, salutation, subject, body paragraphs and sign-off as
     native PDF text, flowing onto a second page if the letter is long.
   - Creates no document and saves no file. It paints into a page the PDF writer has
     opened, and asks the writer for another when it runs out of room.
   - Reads the resolved letter VghLantern__ClientDoc__LetterModel builds, which is the
     same object the screen renderer draws.

   -----------------------------------------------------------------------------

   WHY THE LOGO IS FETCHED THROUGH THE SHEET CHROME CACHE:
   The drawing sheet already loads the Vale logo once per session and holds it as a
   data URL. Reusing that cache means the letter and the drawing embed the identical
   image, and a document containing both carries it once rather than twice.

   ============================================================================= */

// =============================================================================
// REGION | Client Document Letter PDF Painter Module
// =============================================================================

const VghLantern__ClientDoc__LetterPdfPainter = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Page Kind
    // ------------------------------------------------------------
    // Named in Na__PdfWriter__Config.json -> Footer.SkipOnPageKinds, which is how the
    // writer decides that this page does print a footer.
    const PAGE_KIND  =  'welcomeLetter';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Unit Conversion
    // ------------------------------------------------------------
    // A physical constant, not a design value: one point in millimetres.
    const PT_TO_MM  =  0.352778;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Labels
    // ------------------------------------------------------------
    const STYLE_LABEL  =  'Na__ClientDocument__Config.json -> VghLantern__ClientDocument__Config__LetterStyle';
    const PDF_LABEL    =  'Na__DocPreview__Config.json -> VghLantern__DocPreview__Config__Pdf';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Resolve Every Style Value the Painter Uses, Once
    // ------------------------------------------------------------
    function VghLantern__LetterPdf__ResolveStyle() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var clientCfg     =  ConfigLoader.VghLantern__ConfigLoader__GetSection('ClientDocument') || {};
        var styleCfg      =  clientCfg['VghLantern__ClientDocument__Config__LetterStyle'] || {};

        var docPreviewCfg =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DocPreview') || {};
        var pdfCfg        =  docPreviewCfg['VghLantern__DocPreview__Config__Pdf'] || {};

        return {
            SubjectPt        : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'SubjectFontSizePt',  STYLE_LABEL),
            BodyPt           : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'BodyFontSizePt',     STYLE_LABEL),
            MetaPt           : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'MetaFontSizePt',     STYLE_LABEL),
            Heading2Pt       : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'Heading2FontSizePt', STYLE_LABEL),
            Heading3Pt       : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'Heading3FontSizePt', STYLE_LABEL),
            LineSpacing      : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'LineSpacing',        STYLE_LABEL),

            DividerGapMm     : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'DividerGapMm',       STYLE_LABEL),
            DividerStrokeMm  : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'DividerStrokeMm',    STYLE_LABEL),

            LetterheadGapMm  : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'LetterheadGapMm',    STYLE_LABEL),
            SalutationGapMm  : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'SalutationGapMm',    STYLE_LABEL),
            SubjectGapMm     : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'SubjectGapMm',       STYLE_LABEL),
            ParagraphGapMm   : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'ParagraphGapMm',     STYLE_LABEL),
            SignOffGapMm     : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'SignOffGapMm',       STYLE_LABEL),
            SignatureSpaceMm : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(styleCfg, 'SignatureSpaceMm',   STYLE_LABEL),

            HeadingColour    : ConfigLoader.VghLantern__ConfigLoader__RequireString(styleCfg, 'HeadingColour',      STYLE_LABEL),
            BodyColour       : ConfigLoader.VghLantern__ConfigLoader__RequireString(styleCfg, 'BodyTextColour',     STYLE_LABEL),
            MetaColour       : ConfigLoader.VghLantern__ConfigLoader__RequireString(styleCfg, 'MetaTextColour',     STYLE_LABEL),

            FooterReserveMm  : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(pdfCfg,   'FooterReserveMm',    PDF_LABEL)
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Page Cursor
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert a Point Size to a Line Height in Millimetres
    // ------------------------------------------------------------
    function VghLantern__LetterPdf__LineHeightMm(fontSizePt, style) {
        return fontSizePt * PT_TO_MM * style.LineSpacing;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Create a Page Cursor for Flowing Content
    // ------------------------------------------------------------
    function VghLantern__LetterPdf__CreateCursor(doc, pageContext, page, style) {
        return {
            Doc         : doc,
            Context     : pageContext,
            Style       : style,
            X           : page.MarginMm,
            Y           : page.MarginMm,
            MarginMm    : page.MarginMm,
            WidthMm     : page.BodyWidthMm,
            RightEdgeMm : page.WidthMm - page.MarginMm,
            BottomLimit : page.HeightMm - page.MarginMm - style.FooterReserveMm
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Break to a New Page When the Next Block Will Not Fit
    // ------------------------------------------------------------
    function VghLantern__LetterPdf__EnsureSpace(cursor, requiredMm) {
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

    // SUB FUNCTION | Write One Wrapped Plain Text Block
    // ------------------------------------------------------------
    // For the parts of the letter that are single strings in one style: the
    // salutation, the subject and the sign-off. The body goes through
    // WriteRunBlock instead, because it carries mixed emphasis.
    function VghLantern__LetterPdf__WriteTextBlock(cursor, text, fontSizePt, colour, isBold, trailingGapMm) {
        if (!text) return;

        var style       =  cursor.Style;
        var lineHeight  =  VghLantern__LetterPdf__LineHeightMm(fontSizePt, style);

        cursor.Doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        cursor.Doc.setFontSize(fontSizePt);
        cursor.Doc.setTextColor(colour || style.BodyColour);

        var lines  =  cursor.Doc.splitTextToSize(String(text), cursor.WidthMm);
        var i;

        // A paragraph that fits on one page is moved whole rather than orphaned with
        // a single line stranded at the foot of the page.
        var blockHeight  =  lines.length * lineHeight;
        var pageHeight   =  cursor.BottomLimit - cursor.MarginMm;
        VghLantern__LetterPdf__EnsureSpace(cursor, (blockHeight <= pageHeight) ? blockHeight : lineHeight);

        for (i = 0; i < lines.length; i++) {
            VghLantern__LetterPdf__EnsureSpace(cursor, lineHeight);
            cursor.Doc.text(lines[i], cursor.X, cursor.Y + lineHeight * 0.8);
            cursor.Y  +=  lineHeight;
        }

        cursor.Doc.setFont('helvetica', 'normal');
        cursor.Y  +=  (typeof trailingGapMm === 'number') ? trailingGapMm : 0;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Wrap Styled Runs Into Lines That Fit a Column
    // ------------------------------------------------------------
    // splitTextToSize cannot help here: it takes one string in one style, and a
    // paragraph mixing bold and normal has to be measured run by run because jsPDF
    // measures in whatever font is currently set. Words are therefore measured one at
    // a time in their own run's style and packed into lines by hand.
    //
    // Returns [[{ Text, IsBold, IsItalic, WidthMm }]] - a list of lines, each a list
    // of the run fragments that sit on it.
    function VghLantern__LetterPdf__WrapRuns(doc, runs, fontSizePt, widthMm) {
        var lines    =  [];
        var current  =  [];
        var usedMm   =  0;
        var r, words, w, word, style, widthOfWord, widthOfSpace, needsSpace;

        doc.setFontSize(fontSizePt);

        // HELPER | Select the jsPDF font style for one run
        function applyRunStyle(run) {
            if (run.IsBold && run.IsItalic) return 'bolditalic';
            if (run.IsBold)                 return 'bold';
            if (run.IsItalic)               return 'italic';
            return 'normal';
        }

        for (r = 0; r < runs.length; r++) {
            style  =  applyRunStyle(runs[r]);
            doc.setFont('helvetica', style);

            widthOfSpace  =  doc.getTextWidth(' ');
            words         =  String(runs[r].Text).split(/(\s+)/).filter(function(part) { return part !== ''; });

            for (w = 0; w < words.length; w++) {
                word  =  words[w];

                // Whitespace between words is carried as its own fragment so a run
                // boundary in the middle of a sentence does not lose its space.
                if (/^\s+$/.test(word)) {
                    if (current.length) current.push({ Text : ' ', IsBold : runs[r].IsBold, IsItalic : runs[r].IsItalic, WidthMm : widthOfSpace });
                    usedMm  +=  current.length ? widthOfSpace : 0;
                    continue;
                }

                widthOfWord  =  doc.getTextWidth(word);
                needsSpace   =  false;

                if (usedMm + widthOfWord > widthMm && current.length) {
                    // Drop a trailing space fragment rather than starting the next
                    // line with the space that separated the two words.
                    while (current.length && current[current.length - 1].Text === ' ') {
                        usedMm  -=  current[current.length - 1].WidthMm;
                        current.pop();
                    }
                    lines.push(current);
                    current  =  [];
                    usedMm   =  0;
                }

                current.push({ Text : word, IsBold : runs[r].IsBold, IsItalic : runs[r].IsItalic, WidthMm : widthOfWord });
                usedMm  +=  widthOfWord;
            }
        }

        if (current.length) lines.push(current);

        doc.setFont('helvetica', 'normal');
        return lines;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write a Block of Styled Runs
    // ------------------------------------------------------------
    // Each fragment is drawn at the x its predecessors ended at, so a bold word sits
    // exactly where it would if the line were one string.
    function VghLantern__LetterPdf__WriteRunBlock(cursor, runs, fontSizePt, colour, forceBold, trailingGapMm) {
        var style       =  cursor.Style;
        var lineHeight  =  VghLantern__LetterPdf__LineHeightMm(fontSizePt, style);
        var lines       =  VghLantern__LetterPdf__WrapRuns(cursor.Doc, runs, fontSizePt, cursor.WidthMm);
        var i, f, cursorX, fragment, fontStyle;

        if (!lines.length) {
            cursor.Y  +=  (typeof trailingGapMm === 'number') ? trailingGapMm : 0;
            return;
        }

        // A block that fits on one page is moved whole rather than orphaned with a
        // single line stranded at the foot of the page.
        var blockHeight  =  lines.length * lineHeight;
        var pageHeight   =  cursor.BottomLimit - cursor.MarginMm;
        VghLantern__LetterPdf__EnsureSpace(cursor, (blockHeight <= pageHeight) ? blockHeight : lineHeight);

        cursor.Doc.setFontSize(fontSizePt);
        cursor.Doc.setTextColor(colour || style.BodyColour);

        for (i = 0; i < lines.length; i++) {
            VghLantern__LetterPdf__EnsureSpace(cursor, lineHeight);
            cursorX  =  cursor.X;

            for (f = 0; f < lines[i].length; f++) {
                fragment   =  lines[i][f];
                fontStyle  =  (forceBold || fragment.IsBold)
                    ? (fragment.IsItalic ? 'bolditalic' : 'bold')
                    : (fragment.IsItalic ? 'italic' : 'normal');

                cursor.Doc.setFont('helvetica', fontStyle);
                cursor.Doc.text(fragment.Text, cursorX, cursor.Y + lineHeight * 0.8);
                cursorX  +=  fragment.WidthMm;
            }

            cursor.Y  +=  lineHeight;
        }

        cursor.Doc.setFont('helvetica', 'normal');
        cursor.Y  +=  (typeof trailingGapMm === 'number') ? trailingGapMm : 0;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write One Parsed Letter Block
    // ------------------------------------------------------------
    // The same four kinds the screen renderer draws, from the same parse.
    function VghLantern__LetterPdf__WriteBlock(cursor, block) {
        var Parser  =  window.VghLantern__ClientDoc__MarkdownParser;
        var kinds   =  Parser ? Parser.VghLantern__ClientDoc__MarkdownParser__Kinds() : {};
        var style   =  cursor.Style;

        if (block.Kind === kinds.Divider) {
            var ruleY  =  cursor.Y + style.DividerGapMm;
            VghLantern__LetterPdf__EnsureSpace(cursor, style.DividerGapMm * 2);

            cursor.Doc.setDrawColor(style.MetaColour);
            cursor.Doc.setLineWidth(style.DividerStrokeMm);
            cursor.Doc.line(cursor.X, ruleY, cursor.X + cursor.WidthMm, ruleY);

            cursor.Y  =  ruleY + style.DividerGapMm;
            return;
        }

        if (block.Kind === kinds.Heading2) {
            VghLantern__LetterPdf__WriteRunBlock(cursor, block.Runs, style.Heading2Pt, style.HeadingColour, true, style.ParagraphGapMm);
            return;
        }
        if (block.Kind === kinds.Heading3) {
            VghLantern__LetterPdf__WriteRunBlock(cursor, block.Runs, style.Heading3Pt, style.HeadingColour, true, style.ParagraphGapMm);
            return;
        }

        VghLantern__LetterPdf__WriteRunBlock(cursor, block.Runs, style.BodyPt, style.BodyColour, false, style.ParagraphGapMm);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write the Letterhead Strip
    // ------------------------------------------------------------
    // The logo sits left and the date and reference sit right-aligned against the
    // margin, which is the same arrangement the screen renderer produces. Vale's own
    // return address and contact details print under the logo, left-aligned.
    function VghLantern__LetterPdf__WriteLetterhead(cursor, letter, logoAsset) {
        if (!letter.ShowLetterhead) return;

        var style       =  cursor.Style;
        var lineHeight  =  VghLantern__LetterPdf__LineHeightMm(style.MetaPt, style);
        var blockTopY   =  cursor.Y;
        var logoHeight  =  0;

        if (letter.ShowLogo && logoAsset && logoAsset.DataUrl && logoAsset.WidthPx) {
            logoHeight  =  letter.LogoWidthMm * (logoAsset.HeightPx / logoAsset.WidthPx);
            cursor.Doc.addImage(logoAsset.DataUrl, 'PNG', cursor.X, blockTopY, letter.LogoWidthMm, logoHeight);
        }

        cursor.Doc.setFont('helvetica', 'normal');
        cursor.Doc.setFontSize(style.MetaPt);
        cursor.Doc.setTextColor(style.MetaColour);

        var companyBottomY  =  blockTopY + logoHeight;
        if (letter.ShowCompanyDetails) {
            var addressLine  =  [letter.CompanyAddressLine1, letter.CompanyTownCity, letter.CompanyPostCode]
                .filter(function(part) { return !!part; }).join(', ');
            var contactLine  =  [letter.CompanyWebsite, letter.CompanyPhone]
                .filter(function(part) { return !!part; }).join('  ·  ');
            var companyLines =  [addressLine, contactLine].filter(function(part) { return !!part; });

            var companyY  =  blockTopY + logoHeight + (logoHeight ? 1.5 : 0) + lineHeight * 0.8;
            var i;
            for (i = 0; i < companyLines.length; i++) {
                cursor.Doc.text(companyLines[i], cursor.X, companyY);
                companyY  +=  lineHeight;
            }
            if (companyLines.length) companyBottomY  =  companyY - lineHeight + (lineHeight - lineHeight * 0.8);
        }

        cursor.Doc.setFontSize(style.MetaPt);
        cursor.Doc.setTextColor(style.MetaColour);

        var metaY  =  blockTopY + lineHeight * 0.8;
        if (letter.IssueDate) {
            cursor.Doc.text(String(letter.IssueDate), cursor.RightEdgeMm, metaY, { align : 'right' });
            metaY  +=  lineHeight;
        }
        if (letter.ReferenceLine) {
            cursor.Doc.text(String(letter.ReferenceLine), cursor.RightEdgeMm, metaY, { align : 'right' });
            metaY  +=  lineHeight;
        }

        cursor.Y  =  Math.max(companyBottomY, metaY) + style.LetterheadGapMm;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write the Recipient Address Block
    // ------------------------------------------------------------
    // Sits above the salutation. The client's name is a real resolved value; the
    // address lines are raw, unresolved placeholders until a project carries a real
    // client address - see VghLantern__ClientDoc__LetterModel.
    function VghLantern__LetterPdf__WriteRecipientAddress(cursor, letter) {
        var lines  =  [letter.ClientName, letter.ClientAddressLine1, letter.ClientAddressStreet,
                       letter.ClientAddressTownCity, letter.ClientAddressPostCode]
            .filter(function(part) { return !!part; });
        if (!lines.length) return;

        var style       =  cursor.Style;
        var lineHeight  =  VghLantern__LetterPdf__LineHeightMm(style.BodyPt, style);

        cursor.Doc.setFont('helvetica', 'normal');
        cursor.Doc.setFontSize(style.BodyPt);
        cursor.Doc.setTextColor(style.BodyColour);

        VghLantern__LetterPdf__EnsureSpace(cursor, lineHeight * lines.length);

        var i;
        for (i = 0; i < lines.length; i++) {
            cursor.Doc.text(lines[i], cursor.X, cursor.Y + lineHeight * 0.8);
            cursor.Y  +=  lineHeight;
        }

        cursor.Y  +=  style.SalutationGapMm;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Write the Sign Off Block
    // ------------------------------------------------------------
    // The blank space between the phrase and the name is deliberate: a printed letter
    // is signed by hand there.
    function VghLantern__LetterPdf__WriteSignOff(cursor, letter) {
        var style       =  cursor.Style;
        var lineHeight  =  VghLantern__LetterPdf__LineHeightMm(style.BodyPt, style);
        var blockHeight =  (lineHeight * 3) + style.SignatureSpaceMm;

        cursor.Y  +=  style.SignOffGapMm;
        VghLantern__LetterPdf__EnsureSpace(cursor, blockHeight);

        VghLantern__LetterPdf__WriteTextBlock(cursor, letter.SignOffPhrase, style.BodyPt, style.BodyColour, false, style.SignatureSpaceMm);
        VghLantern__LetterPdf__WriteTextBlock(cursor, letter.SignOffName,   style.BodyPt, style.HeadingColour, true, 0);
        VghLantern__LetterPdf__WriteTextBlock(cursor, letter.SignOffRole,   style.MetaPt, style.MetaColour,   false, 0);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Paint the Welcome Letter Onto an Already-Opened PDF Page
    // ------------------------------------------------------------
    async function VghLantern__ClientDoc__LetterPdfPainter__Paint(doc, pageContext, page, letter) {
        var SheetChrome  =  window.VghLantern__DrawingEditor__SheetChrome;
        if (!doc || !page || !letter) return false;

        var style   =  VghLantern__LetterPdf__ResolveStyle();
        var cursor  =  VghLantern__LetterPdf__CreateCursor(doc, pageContext, page, style);

        var logoAsset  =  null;
        if (letter.ShowLetterhead && letter.ShowLogo && SheetChrome) {
            logoAsset  =  await SheetChrome.VghLantern__DrawingEditor__SheetChrome__LoadLogo();
        }

        VghLantern__LetterPdf__WriteLetterhead(cursor, letter, logoAsset);
        VghLantern__LetterPdf__WriteRecipientAddress(cursor, letter);
        VghLantern__LetterPdf__WriteTextBlock(cursor, letter.Salutation, style.BodyPt,    style.BodyColour,    false, style.SalutationGapMm);
        VghLantern__LetterPdf__WriteTextBlock(cursor, letter.Subject,    style.SubjectPt, style.HeadingColour, true,  style.SubjectGapMm);

        var i;
        for (i = 0; i < letter.Blocks.length; i++) {
            VghLantern__LetterPdf__WriteBlock(cursor, letter.Blocks[i]);
        }

        VghLantern__LetterPdf__WriteSignOff(cursor, letter);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Page Descriptor for the Welcome Letter
    // ------------------------------------------------------------
    // Returns null when the letter has no paragraphs, which the caller reports as a
    // warning rather than exporting a page carrying only a letterhead and a signature.
    function VghLantern__ClientDoc__LetterPdfPainter__BuildPage(page, letter) {
        if (!page || !letter || !letter.Blocks.length) return null;

        return {
            Kind     : PAGE_KIND,
            WidthMm  : page.WidthMm,
            HeightMm : page.HeightMm,
            Paint    : function(doc, pageContext) {
                return VghLantern__ClientDoc__LetterPdfPainter__Paint(doc, pageContext, page, letter);
            }
        };
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ClientDoc__LetterPdfPainter__PageKind   : PAGE_KIND,
        VghLantern__ClientDoc__LetterPdfPainter__Paint      : VghLantern__ClientDoc__LetterPdfPainter__Paint,
        VghLantern__ClientDoc__LetterPdfPainter__BuildPage  : VghLantern__ClientDoc__LetterPdfPainter__BuildPage
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__ClientDoc__LetterPdfPainter  =  VghLantern__ClientDoc__LetterPdfPainter;
