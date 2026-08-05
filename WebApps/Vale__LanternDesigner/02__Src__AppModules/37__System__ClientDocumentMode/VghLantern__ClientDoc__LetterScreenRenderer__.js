/* =============================================================================
   VGHLANTERN - CLIENT DOC | LETTER SCREEN RENDERER
   =============================================================================

   FILE       : VghLantern__ClientDoc__LetterScreenRenderer__.js
   NAMESPACE  : VghLantern
   MODULE     : System - ClientDocumentMode - LetterScreenRenderer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build print-faithful welcome letter markup for screen surfaces
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Renders the resolved letter VghLantern__ClientDoc__LetterModel builds, in the
     same order and with the same content the PDF painter will write.
   - Two consumers: the live preview column in the Client Doc tab, and the welcome
     letter page in Preview and Send. Both get the identical body.
   - Emits markup only. It decides nothing about what the letter says.

   ============================================================================= */

// =============================================================================
// REGION | Client Document Letter Screen Renderer Module
// =============================================================================

const VghLantern__ClientDoc__LetterScreenRenderer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_ROOT          =  'VghLantern__Letter__Document';
    const CSS_LETTERHEAD    =  'VghLantern__Letter__Letterhead';
    const CSS_LOGO          =  'VghLantern__Letter__Logo';
    const CSS_COMPANY       =  'VghLantern__Letter__CompanyDetails';
    const CSS_COMPANY_BLOCK =  'VghLantern__Letter__CompanyBlock';
    const CSS_COMPANY_NAME  =  'VghLantern__Letter__CompanyName';
    const CSS_ADDRESS_ROW   =  'VghLantern__Letter__AddressRow';
    const CSS_META          =  'VghLantern__Letter__Meta';
    const CSS_DATE          =  'VghLantern__Letter__Date';
    const CSS_REFERENCE     =  'VghLantern__Letter__Reference';
    const CSS_RECIPIENT     =  'VghLantern__Letter__RecipientAddress';
    const CSS_SALUTATION  =  'VghLantern__Letter__Salutation';
    const CSS_SUBJECT     =  'VghLantern__Letter__Subject';
    const CSS_PARAGRAPH   =  'VghLantern__Letter__Paragraph';
    const CSS_HEADING_2   =  'VghLantern__Letter__Heading2';
    const CSS_HEADING_3   =  'VghLantern__Letter__Heading3';
    const CSS_DIVIDER     =  'VghLantern__Letter__Divider';
    const CSS_SIGNOFF     =  'VghLantern__Letter__SignOff';
    const CSS_SIGN_SPACE  =  'VghLantern__Letter__SignatureSpace';
    const CSS_SIGN_NAME   =  'VghLantern__Letter__SignName';
    const CSS_SIGN_ROLE   =  'VghLantern__Letter__SignRole';
    const CSS_EMPTY       =  'VghLantern__Letter__Empty';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__LetterScreen__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render One Block's Inline Runs
    // ------------------------------------------------------------
    // Escaped first, wrapped afterwards, so a letter someone typed can never inject
    // markup through the emphasis path.
    function VghLantern__LetterScreen__BuildRuns(runs) {
        var html  =  '';
        var i, text;

        for (i = 0; i < runs.length; i++) {
            text  =  VghLantern__LetterScreen__Escape(runs[i].Text);

            if (runs[i].IsBold)        html  +=  '<strong>' + text + '</strong>';
            else if (runs[i].IsItalic) html  +=  '<em>' + text + '</em>';
            else                       html  +=  text;
        }

        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render One Parsed Block
    // ------------------------------------------------------------
    // The four kinds the letter's markdown subset produces. An unknown kind falls
    // through to a paragraph rather than disappearing from the letter.
    function VghLantern__LetterScreen__BuildBlock(block) {
        var Parser  =  window.VghLantern__ClientDoc__MarkdownParser;
        var kinds   =  Parser ? Parser.VghLantern__ClientDoc__MarkdownParser__Kinds() : {};

        if (block.Kind === kinds.Divider) {
            return '<hr class="' + CSS_DIVIDER + '">';
        }
        if (block.Kind === kinds.Heading2) {
            return '<h3 class="' + CSS_HEADING_2 + '">' + VghLantern__LetterScreen__BuildRuns(block.Runs) + '</h3>';
        }
        if (block.Kind === kinds.Heading3) {
            return '<h4 class="' + CSS_HEADING_3 + '">' + VghLantern__LetterScreen__BuildRuns(block.Runs) + '</h4>';
        }

        return '<p class="' + CSS_PARAGRAPH + '">' + VghLantern__LetterScreen__BuildRuns(block.Runs) + '</p>';
    }
    // ------------------------------------------------------------


    // SUB HELPER FUNCTION | Wrap a List of Lines as One Stacked Block
    // ------------------------------------------------------------
    function VghLantern__LetterScreen__BuildLineBlock(className, lines, firstLineClass) {
        if (!lines.length) return '';

        var html  =  '<div class="' + className + '">';
        var i;

        for (i = 0; i < lines.length; i++) {
            html  +=  (i === 0 && firstLineClass)
                ? '<span class="' + firstLineClass + '">' + VghLantern__LetterScreen__Escape(lines[i]) + '</span>'
                : '<span>' + VghLantern__LetterScreen__Escape(lines[i]) + '</span>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build Vale's Own Details Opposite the Logo
    // ------------------------------------------------------------
    // Right-aligned across from the logo, one element per line, with the contact
    // details set as their own group beneath the postal address. A run-on address
    // under the logo read as a caption on the image rather than as stationery.
    function VghLantern__LetterScreen__BuildCompanyDetails(letter) {
        if (!letter.ShowCompanyDetails) return '';

        var address  =  [letter.CompanyName, letter.CompanyAddressLine1,
                         letter.CompanyTownCity, letter.CompanyPostCode]
            .filter(function(part) { return !!part; });
        var contact  =  [letter.CompanyPhone, letter.CompanyWebsite]
            .filter(function(part) { return !!part; });

        var html  =  VghLantern__LetterScreen__BuildLineBlock(CSS_COMPANY_BLOCK, address, CSS_COMPANY_NAME) +
                     VghLantern__LetterScreen__BuildLineBlock(CSS_COMPANY_BLOCK, contact, '');

        return html ? '<div class="' + CSS_COMPANY + '">' + html + '</div>' : '';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Letterhead Strip
    // ------------------------------------------------------------
    // Logo left, sender's own details right. This is the top band of the stationery
    // and carries nothing about this particular letter - the date and the reference
    // belong to the letter, so they sit in the address row below with the recipient.
    function VghLantern__LetterScreen__BuildLetterhead(letter) {
        if (!letter.ShowLetterhead) return '';

        var logoHtml  =  (letter.ShowLogo && letter.LogoAssetPath)
            ? '<img class="' + CSS_LOGO + '" src="' + VghLantern__LetterScreen__Escape(letter.LogoAssetPath) +
              '" style="width:' + letter.LogoWidthMm + 'mm" alt="Vale Garden Houses">'
            : '';

        return '<header class="' + CSS_LETTERHEAD + '">' + logoHtml +
               VghLantern__LetterScreen__BuildCompanyDetails(letter) + '</header>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Recipient and Reference Row
    // ------------------------------------------------------------
    // Who the letter is going to on the left, when it was issued and what it refers
    // to on the right, both hanging off one top edge. That is where a reader looks
    // for each of them, and it is the arrangement the PDF painter writes.
    function VghLantern__LetterScreen__BuildAddressRow(letter) {
        var recipient  =  [letter.ClientName, letter.ClientAddressLine1, letter.ClientAddressStreet,
                           letter.ClientAddressTownCity, letter.ClientAddressPostCode]
            .filter(function(part) { return !!part; });

        var metaHtml  =  '';
        if (letter.IssueDate) {
            metaHtml  +=  '<span class="' + CSS_DATE + '">' +
                          VghLantern__LetterScreen__Escape(letter.IssueDate) + '</span>';
        }
        if (letter.ReferenceLine) {
            metaHtml  +=  '<span class="' + CSS_REFERENCE + '">' +
                          VghLantern__LetterScreen__Escape(letter.ReferenceLine) + '</span>';
        }

        if (!recipient.length && !metaHtml) return '';

        return '<div class="' + CSS_ADDRESS_ROW + '">' +
               VghLantern__LetterScreen__BuildLineBlock(CSS_RECIPIENT, recipient, '') +
               (metaHtml ? '<div class="' + CSS_META + '">' + metaHtml + '</div>' : '') +
               '</div>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Welcome Letter Body
    // ------------------------------------------------------------
    // Takes the resolved letter rather than building one, so a caller that already
    // built it for its own issue reporting does not do the work twice.
    function VghLantern__ClientDoc__LetterScreenRenderer__BuildHtml(letter) {
        if (!letter) {
            return '<p class="' + CSS_EMPTY + '">No welcome letter available.</p>';
        }

        var html  =  '<div class="' + CSS_ROOT + '">' +
                     VghLantern__LetterScreen__BuildLetterhead(letter) +
                     VghLantern__LetterScreen__BuildAddressRow(letter);

        if (letter.Salutation) {
            html  +=  '<p class="' + CSS_SALUTATION + '">' +
                      VghLantern__LetterScreen__Escape(letter.Salutation) + '</p>';
        }
        if (letter.Subject) {
            html  +=  '<p class="' + CSS_SUBJECT + '">' +
                      VghLantern__LetterScreen__Escape(letter.Subject) + '</p>';
        }

        var i;
        for (i = 0; i < letter.Blocks.length; i++) {
            html  +=  VghLantern__LetterScreen__BuildBlock(letter.Blocks[i]);
        }

        if (!letter.Blocks.length) {
            html  +=  '<p class="' + CSS_EMPTY + '">This letter has no content yet.</p>';
        }

        html  +=  '<div class="' + CSS_SIGNOFF + '">' +
                  '<p>' + VghLantern__LetterScreen__Escape(letter.SignOffPhrase) + '</p>' +
                  '<div class="' + CSS_SIGN_SPACE + '"></div>' +
                  '<p class="' + CSS_SIGN_NAME + '">' +
                  VghLantern__LetterScreen__Escape(letter.SignOffName) + '</p>';

        if (letter.SignOffRole) {
            html  +=  '<p class="' + CSS_SIGN_ROLE + '">' +
                      VghLantern__LetterScreen__Escape(letter.SignOffRole) + '</p>';
        }

        return html + '</div></div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Welcome Letter Body for the Current Project
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__LetterScreenRenderer__BuildFromState() {
        var LetterModel  =  window.VghLantern__ClientDoc__LetterModel;
        if (!LetterModel) return '';

        return VghLantern__ClientDoc__LetterScreenRenderer__BuildHtml(
            LetterModel.VghLantern__ClientDoc__LetterModel__BuildFromState()
        );
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ClientDoc__LetterScreenRenderer__BuildHtml      : VghLantern__ClientDoc__LetterScreenRenderer__BuildHtml,
        VghLantern__ClientDoc__LetterScreenRenderer__BuildFromState : VghLantern__ClientDoc__LetterScreenRenderer__BuildFromState
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__ClientDoc__LetterScreenRenderer  =  VghLantern__ClientDoc__LetterScreenRenderer;
