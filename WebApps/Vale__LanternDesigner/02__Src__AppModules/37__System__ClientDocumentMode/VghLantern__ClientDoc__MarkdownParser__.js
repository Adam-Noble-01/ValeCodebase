/* =============================================================================
   VGHLANTERN - CLIENT DOC | MARKDOWN PARSER
   =============================================================================

   FILE       : VghLantern__ClientDoc__MarkdownParser__.js
   NAMESPACE  : VghLantern
   MODULE     : System - ClientDocumentMode - MarkdownParser
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Turn the letter's markdown into a block list both surfaces can draw
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Parses the small, fixed subset of markdown the welcome letter supports into an
     ordered list of blocks, each carrying its inline runs.
   - Parses. It renders nothing. The screen renderer turns blocks into HTML and the
     PDF painter draws the same blocks with jsPDF, so the previewed letter and the
     written letter are one parse rather than two interpretations.

   -----------------------------------------------------------------------------

   THE WHOLE GRAMMAR:

     ## Heading            a heading two
     ### Heading           a heading three
     ---                   a horizontal divider
     **bold**              a bold run
     *italic*              an italic run
     blank line            ends a paragraph

   That is all of it. There is no link syntax, no list syntax, no code syntax and no
   nesting, because everything here has to survive being drawn into a PDF by hand and
   a feature that cannot be drawn on paper has no business in a document editor.

   -----------------------------------------------------------------------------

   WHY BLOCKS CARRY RUNS RATHER THAN MARKUP:
   jsPDF sets one font style per text call, so a paragraph mixing bold and normal has
   to be drawn as consecutive measured runs whatever happens. Producing runs here
   means the PDF painter gets what it needs directly and the screen renderer wraps
   each run in a span, rather than the PDF painter having to unpick HTML.

   WHY BOLD IS MATCHED BEFORE ITALIC:
   Both use the asterisk. Scanning for the two-asterisk form first means "**bold**"
   cannot be read as an empty italic wrapping "bold", which is what a naive
   single-pass scanner does to it.

   ============================================================================= */

// =============================================================================
// REGION | Client Document Markdown Parser Module
// =============================================================================

const VghLantern__ClientDoc__MarkdownParser = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Block Kinds
    // ------------------------------------------------------------
    const KIND_PARAGRAPH  =  'paragraph';
    const KIND_HEADING_2  =  'heading2';
    const KIND_HEADING_3  =  'heading3';
    const KIND_DIVIDER    =  'divider';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Grammar
    // ------------------------------------------------------------
    // A divider is three or more dashes alone on a line. Three or more rather than
    // exactly three because that is what every markdown editor a user has ever met
    // accepts, and a line of dashes is unambiguous whatever its length.
    const PATTERN_PARAGRAPH_BREAK  =  /\r?\n\s*\r?\n/;
    const PATTERN_DIVIDER          =  /^-{3,}$/;
    const PATTERN_HEADING_2        =  /^##\s+(.*)$/;
    const PATTERN_HEADING_3        =  /^###\s+(.*)$/;
    const PATTERN_INLINE           =  /(\*\*)(.+?)\1|(\*)([^*]+?)\3/g;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Inline Runs
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Split One Line of Text Into Styled Runs
    // ------------------------------------------------------------
    // Returns [{ Text, IsBold, IsItalic }]. Text with no emphasis in it comes back as
    // a single run, which is the common case and costs one push.
    function VghLantern__MarkdownParser__ParseRuns(text) {
        var source  =  String(text === undefined || text === null ? '' : text);
        var runs    =  [];
        var cursor  =  0;
        var match;

        PATTERN_INLINE.lastIndex  =  0;

        while ((match = PATTERN_INLINE.exec(source)) !== null) {
            if (match.index > cursor) {
                runs.push({ Text : source.slice(cursor, match.index), IsBold : false, IsItalic : false });
            }

            // Group 2 is the bold body, group 4 the italic body. Only one is ever set,
            // because the alternation matched one branch or the other.
            if (match[2] !== undefined) {
                runs.push({ Text : match[2], IsBold : true,  IsItalic : false });
            } else {
                runs.push({ Text : match[4], IsBold : false, IsItalic : true  });
            }

            cursor  =  match.index + match[0].length;
        }

        if (cursor < source.length) {
            runs.push({ Text : source.slice(cursor), IsBold : false, IsItalic : false });
        }

        // An empty paragraph still needs one run, so the renderers do not have to
        // guard against a block with nothing in it.
        if (!runs.length) runs.push({ Text : '', IsBold : false, IsItalic : false });

        return runs;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Parse Letter Markdown Into an Ordered Block List
    // ------------------------------------------------------------
    // Returns [{ Kind, Runs, PlainText }]. PlainText is the block with its emphasis
    // markers stripped, which is what a caller wants when it needs to measure or
    // token-resolve the block without walking the runs.
    function VghLantern__ClientDoc__MarkdownParser__Parse(markdownText) {
        var source      =  String(markdownText === undefined || markdownText === null ? '' : markdownText);
        var paragraphs  =  source.split(PATTERN_PARAGRAPH_BREAK);
        var blocks      =  [];
        var p, lines, i, line, kind, body, joined;

        // HELPER | Push one block, deriving its plain text from its runs
        function pushBlock(blockKind, text) {
            var runs  =  (blockKind === KIND_DIVIDER) ? [] : VghLantern__MarkdownParser__ParseRuns(text);
            var plain =  runs.map(function(run) { return run.Text; }).join('');

            blocks.push({ Kind : blockKind, Runs : runs, PlainText : plain });
        }

        for (p = 0; p < paragraphs.length; p++) {
            lines  =  paragraphs[p].split(/\r?\n/);

            // A heading or a divider is a line in its own right even when it sits in
            // the same paragraph as the text under it, which is how people actually
            // type them - heading, newline, sentence, with no blank line between.
            var pending  =  [];

            // HELPER | Flush whatever plain lines have accumulated as one paragraph
            function flushPending() {
                if (!pending.length) return;
                joined  =  pending.join(' ').replace(/\s{2,}/g, ' ').trim();
                if (joined !== '') pushBlock(KIND_PARAGRAPH, joined);
                pending  =  [];
            }

            for (i = 0; i < lines.length; i++) {
                line  =  lines[i].trim();
                if (line === '') continue;

                if (PATTERN_DIVIDER.test(line)) {
                    flushPending();
                    pushBlock(KIND_DIVIDER, '');
                    continue;
                }

                // Three hashes before two, or "### x" matches the two-hash pattern
                // and renders a heading two whose text starts with a hash.
                kind  =  null;
                body  =  null;

                var headingThree  =  PATTERN_HEADING_3.exec(line);
                if (headingThree) {
                    kind  =  KIND_HEADING_3;
                    body  =  headingThree[1];
                } else {
                    var headingTwo  =  PATTERN_HEADING_2.exec(line);
                    if (headingTwo) {
                        kind  =  KIND_HEADING_2;
                        body  =  headingTwo[1];
                    }
                }

                if (kind) {
                    flushPending();
                    pushBlock(kind, body);
                    continue;
                }

                pending.push(line);
            }

            flushPending();
        }

        return blocks;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report the Block Kind Constants
    // ------------------------------------------------------------
    // Published so the renderers switch on shared constants rather than on their own
    // copies of four strings.
    function VghLantern__ClientDoc__MarkdownParser__Kinds() {
        return {
            Paragraph : KIND_PARAGRAPH,
            Heading2  : KIND_HEADING_2,
            Heading3  : KIND_HEADING_3,
            Divider   : KIND_DIVIDER
        };
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ClientDoc__MarkdownParser__Parse : VghLantern__ClientDoc__MarkdownParser__Parse,
        VghLantern__ClientDoc__MarkdownParser__Kinds : VghLantern__ClientDoc__MarkdownParser__Kinds
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__ClientDoc__MarkdownParser  =  VghLantern__ClientDoc__MarkdownParser;
