/* =============================================================================
   VGHLANTERN - TERMS | MARKDOWN LOADER
   =============================================================================

   FILE       : VghLantern__Terms__MarkdownLoader__.js
   NAMESPACE  : VghLantern
   MODULE     : System - TermsAndConditions - MarkdownLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Read the standard terms markdown library into clause records
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Fetches each file named by a section in Na__Terms__Config.json, once per session,
     and parses it into an ordered list of clause texts.
   - Parses almost nothing on purpose. The library is edited by people writing terms,
     not by people writing markup, so the format is: one blank-line separated
     paragraph is one clause. That is the whole grammar.
   - Reports a failed load rather than returning an empty section, because a terms
     document silently missing its payment clauses is worse than one that refuses to
     issue.

   -----------------------------------------------------------------------------

   WHY THE LIBRARY IS MARKDOWN FILES RATHER THAN JSON:
   Terms are prose, and prose in JSON means escaped quotes, no line breaks and a
   single unterminated string breaking the whole application at boot. A .md file is
   opened, edited and saved by anyone, and a mistake in one file costs that one
   section rather than the app.

   WHY A FAILED FETCH IS NOT CACHED AS AN EMPTY SECTION:
   A dropped connection on first load would otherwise permanently blank a section for
   the rest of the session. A failure is recorded as a failure, and the next call
   retries it.

   ============================================================================= */

// =============================================================================
// REGION | Terms Markdown Loader Module
// =============================================================================

const VghLantern__Terms__MarkdownLoader = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Parse Grammar
    // ------------------------------------------------------------
    // Three rules and no more. Anything else in a file is body text.
    const LINE_PREFIX_HEADING     =  '#';                                     // <-- File title, informational only
    const LINE_PREFIX_EDITOR_NOTE =  '>';                                     // <-- Never printed
    const PARAGRAPH_SEPARATOR     =  /\r?\n\s*\r?\n/;                         // <-- One blank line separates two clauses
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Label
    // ------------------------------------------------------------
    const DOCUMENT_LABEL  =  'Na__Terms__Config.json -> VghLantern__Terms__Config__Document';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Per-File Cache and In-Flight Guard
    // ------------------------------------------------------------
    // Keyed by source file name. A cache entry is { Clauses, DidFail }. The promise
    // map stops four sections requesting the same file four times on first render.
    let VghLantern__MarkdownLoader__Cache        =  {};
    let VghLantern__MarkdownLoader__InFlight     =  {};
    let VghLantern__MarkdownLoader__IsLoadedOnce =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get a Named Terms Config Block
    // ------------------------------------------------------------
    function VghLantern__MarkdownLoader__Block(blockName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var termsCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Terms') || {};
        return termsCfg['VghLantern__Terms__Config__' + blockName] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Library Folder Path
    // ------------------------------------------------------------
    function VghLantern__MarkdownLoader__BasePath() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireString(
            VghLantern__MarkdownLoader__Block('Document'), 'LibraryBasePath', DOCUMENT_LABEL);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Parsing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Parse One Markdown File Into Clause Texts
    // ------------------------------------------------------------
    // A paragraph is dropped if, once its editor-note and heading lines are removed,
    // there is nothing left. That is what lets a file open with a long chevron block
    // and still parse to exactly its clauses.
    function VghLantern__MarkdownLoader__Parse(markdownText) {
        var paragraphs  =  String(markdownText || '').split(PARAGRAPH_SEPARATOR);
        var clauses     =  [];
        var i, j, lines, kept, trimmed, body;

        for (i = 0; i < paragraphs.length; i++) {
            lines  =  paragraphs[i].split(/\r?\n/);
            kept   =  [];

            for (j = 0; j < lines.length; j++) {
                trimmed  =  lines[j].trim();
                if (trimmed === '') continue;
                if (trimmed.charAt(0) === LINE_PREFIX_HEADING) continue;
                if (trimmed.charAt(0) === LINE_PREFIX_EDITOR_NOTE) continue;
                kept.push(trimmed);
            }

            if (!kept.length) continue;

            // A clause wrapped over several lines in the file is one clause on the
            // page, so the line breaks the author used for readability are joined out.
            body  =  kept.join(' ').replace(/\s{2,}/g, ' ').trim();
            if (body !== '') clauses.push(body);
        }

        return clauses;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loading
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Fetch and Cache One Library File
    // ------------------------------------------------------------
    async function VghLantern__MarkdownLoader__LoadFile(sourceFile) {
        if (VghLantern__MarkdownLoader__Cache[sourceFile]) {
            return VghLantern__MarkdownLoader__Cache[sourceFile];
        }
        if (VghLantern__MarkdownLoader__InFlight[sourceFile]) {
            return VghLantern__MarkdownLoader__InFlight[sourceFile];
        }

        var path  =  VghLantern__MarkdownLoader__BasePath() + sourceFile;

        VghLantern__MarkdownLoader__InFlight[sourceFile]  =  (async function() {
            try {
                var response  =  await fetch(path, { cache: 'no-store' });      // <-- An edited terms file must reach the page on the next refresh
                if (!response.ok) throw new Error('HTTP ' + response.status);

                var entry  =  { Clauses : VghLantern__MarkdownLoader__Parse(await response.text()), DidFail : false };
                VghLantern__MarkdownLoader__Cache[sourceFile]  =  entry;
                return entry;

            } catch (loadError) {
                console.error('[VghLantern__Terms__MarkdownLoader] Could not read terms library file "' +
                    sourceFile + '" from ' + path + ':', loadError.message);
                return { Clauses : [], DidFail : true };                       // <-- Not cached, so the next call retries
            } finally {
                delete VghLantern__MarkdownLoader__InFlight[sourceFile];
            }
        })();

        return VghLantern__MarkdownLoader__InFlight[sourceFile];
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Every Library File Named by Either Section Table
    // ------------------------------------------------------------
    // Called once when the Client Doc tab or Preview and Send first needs the terms.
    // Resolves when every file has settled, successfully or not.
    //
    // Both tables are walked - the business terms of engagement and the general
    // drawing terms - because a document pack needs both and one fetch pass is
    // cheaper than two round trips at two different moments. Adding a section to
    // either table is enough to have its file fetched; there is no second list of
    // filenames to remember to update.
    async function VghLantern__Terms__MarkdownLoader__EnsureLoaded() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return false;

        var termsCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Terms') || {};
        var sections  =  ConfigLoader.VghLantern__ConfigLoader__RequireArray(
                             termsCfg, 'VghLantern__Terms__Config__Sections', 'Na__Terms__Config.json')
                         .concat(ConfigLoader.VghLantern__ConfigLoader__RequireArray(
                             termsCfg, 'VghLantern__Terms__Config__DrawingTermsSections', 'Na__Terms__Config.json'));

        var pending  =  [];
        var i;

        for (i = 0; i < sections.length; i++) {
            if (sections[i].Source !== 'library' || !sections[i].SourceFile) continue;
            pending.push(VghLantern__MarkdownLoader__LoadFile(sections[i].SourceFile));
        }

        await Promise.all(pending);
        VghLantern__MarkdownLoader__IsLoadedOnce  =  true;
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Cached Clauses for One Library File
    // ------------------------------------------------------------
    // Synchronous, because the document model and both renderers are synchronous.
    // Returns [] before EnsureLoaded has resolved, which is why every entry point
    // awaits that first.
    function VghLantern__Terms__MarkdownLoader__ClausesFor(sourceFile) {
        var entry  =  VghLantern__MarkdownLoader__Cache[sourceFile];
        return (entry && !entry.DidFail) ? entry.Clauses.slice() : [];
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether a Named File Failed to Load
    // ------------------------------------------------------------
    function VghLantern__Terms__MarkdownLoader__DidFileFail(sourceFile) {
        var entry  =  VghLantern__MarkdownLoader__Cache[sourceFile];
        return !entry || !!entry.DidFail;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Library Has Been Loaded At Least Once
    // ------------------------------------------------------------
    function VghLantern__Terms__MarkdownLoader__IsLoaded() {
        return VghLantern__MarkdownLoader__IsLoadedOnce;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Terms__MarkdownLoader__EnsureLoaded : VghLantern__Terms__MarkdownLoader__EnsureLoaded,
        VghLantern__Terms__MarkdownLoader__ClausesFor   : VghLantern__Terms__MarkdownLoader__ClausesFor,
        VghLantern__Terms__MarkdownLoader__DidFileFail  : VghLantern__Terms__MarkdownLoader__DidFileFail,
        VghLantern__Terms__MarkdownLoader__IsLoaded     : VghLantern__Terms__MarkdownLoader__IsLoaded
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Terms__MarkdownLoader  =  VghLantern__Terms__MarkdownLoader;
