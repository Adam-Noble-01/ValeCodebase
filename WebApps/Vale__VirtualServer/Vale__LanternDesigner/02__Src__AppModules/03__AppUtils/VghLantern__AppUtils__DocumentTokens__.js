/* =============================================================================
   VGHLANTERN - DOCUMENT TOKENS
   =============================================================================

   FILE       : VghLantern__AppUtils__DocumentTokens__.js
   NAMESPACE  : VghLantern
   MODULE     : AppUtils - DocumentTokens
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Resolve {{Token}} placeholders in client-facing document text
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - One resolver for every piece of authored document text in the application: the
     welcome letter template, the letter blocks a user has edited, and the standard
     terms markdown library.
   - A token means the same thing wherever it appears, because there is one table and
     one substitution pass rather than one per consumer.
   - Reports which tokens it could not resolve, so Preview and Send can warn rather
     than let a document reach a client with a hole in it.

   -----------------------------------------------------------------------------

   WHY AN UNRESOLVED TOKEN RENDERS EMPTY RATHER THAN LITERALLY:
   Printing "{{ProjectAddress}}" on a letter to a client is worse than printing
   nothing, because nothing reads as an oversight and the raw token reads as broken
   software. The token is dropped from the text and reported to the issue handler
   instead, which is where an unfinished document should be caught.

   ============================================================================= */

// =============================================================================
// REGION | Document Tokens Module
// =============================================================================

const VghLantern__AppUtils__DocumentTokens = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Token Syntax
    // ------------------------------------------------------------
    const TOKEN_PATTERN   =  /\{\{\s*([A-Za-z0-9_\-]+)\s*\}\}/g;
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Project Data Keys
    // ------------------------------------------------------------
    const METADATA_BLOCK  =  'VghLantern__ProjectFile__Metadata';
    const LANTERNS_BLOCK  =  'VghLantern__ProjectFile__Lanterns';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Value Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Describe the Lantern Count in Words
    // ------------------------------------------------------------
    // "two roof lanterns" reads as a sentence in a letter; "2" does not. Beyond the
    // named numbers it falls back to the digits, which is what a schedule of twelve
    // lanterns wants anyway.
    function VghLantern__DocumentTokens__LanternCountPhrase(project) {
        var lanterns  =  (project && project[LANTERNS_BLOCK]) || [];
        var count     =  lanterns.length;
        var words     =  ['no', 'one', 'two', 'three', 'four', 'five', 'six',
                          'seven', 'eight', 'nine', 'ten'];

        if (count === 0) return '';
        var quantity  =  (count < words.length) ? words[count] : String(count);

        return quantity + ' roof lantern' + (count === 1 ? '' : 's');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Issue Date for a Document
    // ------------------------------------------------------------
    // Prefers the recorded issue date and falls back to today, matching what the
    // drawing titleblock does, so a letter and the drawing beside it are never
    // dated differently.
    function VghLantern__DocumentTokens__IssueDate(metadata) {
        var recorded  =  metadata['VghLantern__ProjectFile__Metadata__DateIssued'] || '';
        if (recorded !== '') return recorded;

        var DateFormatter  =  window.VghLantern__AppUtils__DateFormatter;
        if (DateFormatter && DateFormatter.VghLantern__DateFormatter__FormatShort) {
            return DateFormatter.VghLantern__DateFormatter__FormatShort(new Date());
        }

        return '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Token Value Table for a Project
    // ------------------------------------------------------------
    // Every token this application understands is named here and nowhere else.
    // Adding one is adding a row.
    function VghLantern__AppUtils__DocumentTokens__BuildTable(project) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var metadata      =  (project && project[METADATA_BLOCK]) || {};

        var companyName  =  '';
        if (ConfigLoader) {
            var writerCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('PdfWriter') || {};
            var footerCfg  =  writerCfg['VghLantern__PdfWriter__Config__Footer'] || {};
            companyName    =  footerCfg.FooterText || '';                      // <-- The company name already has one home
        }

        return {
            ProjectAddress : metadata['VghLantern__ProjectFile__Metadata__SiteAddress']  || '',
            ProjectName    : metadata['VghLantern__ProjectFile__Metadata__ProjectName']  || '',
            ProjectCode    : metadata['VghLantern__ProjectFile__Metadata__ProjectCode']  || '',
            ClientName     : metadata['VghLantern__ProjectFile__Metadata__ClientName']   || '',
            AuthorName     : metadata['VghLantern__ProjectFile__Metadata__Author']       || '',
            DocumentName   : metadata['VghLantern__ProjectFile__Metadata__DocumentName'] || '',
            RevisionCode   : metadata['VghLantern__ProjectFile__Metadata__RevisionCode'] || '',
            IssueDate      : VghLantern__DocumentTokens__IssueDate(metadata),
            LanternCount   : VghLantern__DocumentTokens__LanternCountPhrase(project),
            CompanyName    : companyName
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Substitute Every Token in a String
    // ------------------------------------------------------------
    // Returns { Text, Unresolved }. Unresolved lists the token names that had no
    // value, deduplicated, so a caller can report them once. Pass the table in rather
    // than rebuilding it per string: a terms document runs this over sixty paragraphs.
    function VghLantern__AppUtils__DocumentTokens__Resolve(text, table) {
        var source  =  String(text === undefined || text === null ? '' : text);
        var values  =  table || {};

        var unresolved  =  [];

        var resolved  =  source.replace(TOKEN_PATTERN, function(match, tokenName) {
            var value  =  values[tokenName];
            if (typeof value === 'string' && value !== '') return value;

            if (unresolved.indexOf(tokenName) === -1) unresolved.push(tokenName);
            return '';
        });

        // Substituting a token out of the middle of a sentence leaves a double space
        // and can strand a space before a full stop, which reads as a typo.
        resolved  =  resolved.replace(/[ \t]{2,}/g, ' ').replace(/ +([.,;:])/g, '$1').trim();

        return { Text : resolved, Unresolved : unresolved };
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__AppUtils__DocumentTokens__BuildTable : VghLantern__AppUtils__DocumentTokens__BuildTable,
        VghLantern__AppUtils__DocumentTokens__Resolve    : VghLantern__AppUtils__DocumentTokens__Resolve
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppUtils__DocumentTokens  =  VghLantern__AppUtils__DocumentTokens;
