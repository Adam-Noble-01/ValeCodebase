/* =============================================================================
   VGHLANTERN - TERMS | DOCUMENT MODEL
   =============================================================================

   FILE       : VghLantern__Terms__DocumentModel__.js
   NAMESPACE  : VghLantern
   MODULE     : System - TermsAndConditions - DocumentModel
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Assemble the numbered terms document from config, library and project
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - THE NUMBERING AUTHORITY. Every clause number printed anywhere in this
     application - the editor, the screen preview and the PDF - is assigned here and
     nowhere else. There is no second implementation to drift.
   - Assembles the document from three sources: the fixed section table in config, the
     markdown library, and the project's own critical and special terms.
   - Resolves document tokens as it goes and reports what it could not resolve, so an
     unfinished document is caught before it is issued rather than after.

   -----------------------------------------------------------------------------

   WHY THE SECTION NUMBER IS FIXED AND THE TERM NUMBER IS NOT:
   A clause number is a citation. If Payment is section 4 on one document and section
   3 on the next because Access was switched off in between, then "clause 4.08" means
   two different things to two people holding two versions of the same quotation, and
   the number is worse than useless. The section number therefore comes from config
   and never moves, including when the section is switched off - the document simply
   runs 3, 4, 6 and nobody is misled.

   The term number within a section is the opposite case: it has to renumber, because
   inserting a special term at position two and leaving the rest alone would give two
   clauses the same number. Renumbering inside a section is safe precisely because the
   section number pins it.

   WHY AN EMPTY SECTION IS NOT ALWAYS A PROBLEM:
   A project with no special terms is entirely normal, so that section hides itself.
   An empty STANDARD section is not normal - it means a markdown file is missing or
   unreadable - so it raises a warning instead. Which behaviour applies is config, per
   section, rather than a rule this module invents.

   -----------------------------------------------------------------------------

   RETURNED MODEL SHAPE:

     {
       Title, Introduction, ReviewNotice
       Sections   [ { Key, Number, Label, IsCritical, IsFromLibrary, Terms } ]
       Terms      [ { Number, Text, IsCritical } ]
       TotalTerms
       Issues     { UnresolvedTokens, FailedSections, EmptySections, IsUnreviewed }
     }

   ============================================================================= */

// =============================================================================
// REGION | Terms Document Model Module
// =============================================================================

const VghLantern__Terms__DocumentModel = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Section Source Kinds
    // ------------------------------------------------------------
    const SOURCE_LIBRARY           =  'library';
    const SOURCE_PROJECT_CRITICAL  =  'project:critical';
    const SOURCE_PROJECT_SPECIAL   =  'project:special';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Empty Section Behaviours
    // ------------------------------------------------------------
    const EMPTY_BEHAVIOUR_HIDE  =  'hide';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Project Data Keys
    // ------------------------------------------------------------
    const CLIENT_DOC_BLOCK    =  'VghLantern__ProjectFile__ClientDocument';
    const FIELD_CRITICAL      =  'VghLantern__ProjectFile__ClientDocument__CriticalTerms';
    const FIELD_SPECIAL       =  'VghLantern__ProjectFile__ClientDocument__SpecialTerms';
    const FIELD_TOGGLES       =  'VghLantern__ProjectFile__ClientDocument__SectionToggles';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Labels
    // ------------------------------------------------------------
    const DOCUMENT_LABEL   =  'Na__Terms__Config.json -> VghLantern__Terms__Config__Document';
    const NUMBERING_LABEL  =  'Na__Terms__Config.json -> VghLantern__Terms__Config__Numbering';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get a Named Terms Config Block
    // ------------------------------------------------------------
    function VghLantern__TermsModel__Block(blockName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var termsCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Terms') || {};
        return termsCfg['VghLantern__Terms__Config__' + blockName] || {};
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Configured Sections in Document Order
    // ------------------------------------------------------------
    // Exposed because the editor and the Preview and Send toolbar both build their
    // toggle lists from it, and neither should hold its own copy of the section table.
    function VghLantern__Terms__DocumentModel__ListSections() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return [];

        var termsCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Terms') || {};
        return ConfigLoader.VghLantern__ConfigLoader__RequireArray(
            termsCfg, 'VghLantern__Terms__Config__Sections', 'Na__Terms__Config.json');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Section Toggle State
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Project's Section Toggle Overrides
    // ------------------------------------------------------------
    function VghLantern__TermsModel__ToggleOverrides(project) {
        var block  =  (project && project[CLIENT_DOC_BLOCK]) || {};
        var map    =  block[FIELD_TOGGLES];
        return (map && typeof map === 'object') ? map : {};
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether a Section Is Switched On for a Project
    // ------------------------------------------------------------
    // The project file holds only explicit overrides, so a section added to config
    // later arrives at its configured default on a project that predates it rather
    // than silently switched off.
    function VghLantern__Terms__DocumentModel__IsSectionEnabled(project, sectionKey) {
        var sections  =  VghLantern__Terms__DocumentModel__ListSections();
        var overrides =  VghLantern__TermsModel__ToggleOverrides(project);
        var i;

        for (i = 0; i < sections.length; i++) {
            if (sections[i].Key !== sectionKey) continue;
            if (typeof overrides[sectionKey] === 'boolean') return overrides[sectionKey];
            return sections[i].DefaultEnabled !== false;
        }

        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Switch a Section On or Off for a Project
    // ------------------------------------------------------------
    // Written onto the live project object and marked dirty, so the AppCore autosave
    // path persists it. Both the Client Doc editor and the Preview and Send toolbar
    // call this, which is what stops the two surfaces holding different answers.
    function VghLantern__Terms__DocumentModel__SetSectionEnabled(project, sectionKey, isEnabled) {
        if (!project) return false;

        if (!project[CLIENT_DOC_BLOCK]) project[CLIENT_DOC_BLOCK]  =  {};
        if (!project[CLIENT_DOC_BLOCK][FIELD_TOGGLES] ||
            typeof project[CLIENT_DOC_BLOCK][FIELD_TOGGLES] !== 'object') {
            project[CLIENT_DOC_BLOCK][FIELD_TOGGLES]  =  {};
        }

        var toggles  =  project[CLIENT_DOC_BLOCK][FIELD_TOGGLES];
        if (toggles[sectionKey] === !!isEnabled) return false;                 // <-- Nothing changed; do not dirty the project

        toggles[sectionKey]  =  !!isEnabled;

        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (StateManager) StateManager.VghLantern__StateManager__MarkDirty();

        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Clause Sourcing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Project Term List as Plain Strings
    // ------------------------------------------------------------
    function VghLantern__TermsModel__ProjectTermTexts(project, fieldKey) {
        var block  =  (project && project[CLIENT_DOC_BLOCK]) || {};
        var list   =  block[fieldKey];
        if (!Array.isArray(list)) return [];

        var texts  =  [];
        var i, text;

        for (i = 0; i < list.length; i++) {
            text  =  (list[i] && typeof list[i].Text === 'string') ? list[i].Text.trim() : '';
            if (text !== '') texts.push(text);                                 // <-- A blank card the user has not typed into yet is not a clause
        }

        return texts;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Collect the Raw Clause Texts for One Section
    // ------------------------------------------------------------
    function VghLantern__TermsModel__SourceTexts(section, project) {
        var Loader  =  window.VghLantern__Terms__MarkdownLoader;

        if (section.Source === SOURCE_PROJECT_CRITICAL) {
            return VghLantern__TermsModel__ProjectTermTexts(project, FIELD_CRITICAL);
        }
        if (section.Source === SOURCE_PROJECT_SPECIAL) {
            return VghLantern__TermsModel__ProjectTermTexts(project, FIELD_SPECIAL);
        }
        if (section.Source === SOURCE_LIBRARY && Loader) {
            return Loader.VghLantern__Terms__MarkdownLoader__ClausesFor(section.SourceFile);
        }

        return [];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Numbering
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Pad a Number to a Configured Width
    // ------------------------------------------------------------
    function VghLantern__TermsModel__Pad(value, width) {
        var text  =  String(value);
        while (text.length < width) text  =  '0' + text;
        return text;
    }
    // ------------------------------------------------------------


    // FUNCTION | Format One Clause Number
    // ------------------------------------------------------------
    // The single formatter. The editor labels its cards with this, both renderers
    // print it, and nothing else composes a clause number from its parts.
    function VghLantern__Terms__DocumentModel__FormatNumber(sectionNumber, termNumber) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var numberingCfg  =  VghLantern__TermsModel__Block('Numbering');

        var pattern     =  ConfigLoader.VghLantern__ConfigLoader__RequireString(numberingCfg, 'NumberFormat',          NUMBERING_LABEL);
        var termPad     =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(numberingCfg, 'TermNumberPadding',     NUMBERING_LABEL);
        var sectionPad  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(numberingCfg, 'SectionNumberPadding',  NUMBERING_LABEL);

        return pattern
            .replace('{section}', VghLantern__TermsModel__Pad(sectionNumber, sectionPad))
            .replace('{term}',    VghLantern__TermsModel__Pad(termNumber,    termPad));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Full Numbered Terms Document for a Project
    // ------------------------------------------------------------
    // The one call every surface makes. Returns null only when there is no project,
    // which the caller reports; an otherwise empty document is returned as an empty
    // document with its issues attached, because "everything is switched off" is a
    // state the user chose and should see rather than a failure.
    function VghLantern__Terms__DocumentModel__Build(project) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var Tokens        =  window.VghLantern__AppUtils__DocumentTokens;
        var Loader        =  window.VghLantern__Terms__MarkdownLoader;
        if (!ConfigLoader || !project) return null;

        var documentCfg  =  VghLantern__TermsModel__Block('Document');
        var sections     =  VghLantern__Terms__DocumentModel__ListSections();
        var tokenTable   =  Tokens ? Tokens.VghLantern__AppUtils__DocumentTokens__BuildTable(project) : {};

        var builtSections  =  [];
        var flatTerms      =  [];
        var issues  =  {
            UnresolvedTokens : [],
            FailedSections   : [],
            EmptySections    : [],
            IsUnreviewed     : false
        };

        var s, i, section, texts, sectionTerms, resolved, number, term;

        for (s = 0; s < sections.length; s++) {
            section  =  sections[s];
            if (!VghLantern__Terms__DocumentModel__IsSectionEnabled(project, section.Key)) continue;

            // A library section whose file would not load is reported as a failure
            // rather than as an empty section, because the two need different fixes.
            if (section.Source === SOURCE_LIBRARY && Loader &&
                Loader.VghLantern__Terms__MarkdownLoader__DidFileFail(section.SourceFile)) {
                issues.FailedSections.push(section.Label || section.Key);
                continue;
            }

            texts         =  VghLantern__TermsModel__SourceTexts(section, project);
            sectionTerms  =  [];

            for (i = 0; i < texts.length; i++) {
                resolved  =  Tokens
                    ? Tokens.VghLantern__AppUtils__DocumentTokens__Resolve(texts[i], tokenTable)
                    : { Text : texts[i], Unresolved : [] };

                number  =  VghLantern__Terms__DocumentModel__FormatNumber(section.Number, i + 1);

                term  =  {
                    Number     : number,
                    Text       : resolved.Text,
                    IsCritical : section.IsCritical === true
                };

                sectionTerms.push(term);
                flatTerms.push(term);

                resolved.Unresolved.forEach(function(tokenName) {
                    if (issues.UnresolvedTokens.indexOf(tokenName) === -1) issues.UnresolvedTokens.push(tokenName);
                });
            }

            if (!sectionTerms.length) {
                if (section.EmptyBehaviour !== EMPTY_BEHAVIOUR_HIDE) {
                    issues.EmptySections.push(section.Label || section.Key);
                }
                continue;                                                      // <-- An empty section prints no heading either way
            }

            builtSections.push({
                Key           : section.Key,
                Number        : section.Number,
                Label         : section.Label || section.Key,
                IsCritical    : section.IsCritical === true,
                IsFromLibrary : section.Source === SOURCE_LIBRARY,
                Terms         : sectionTerms
            });
        }

        var introduction  =  Tokens
            ? Tokens.VghLantern__AppUtils__DocumentTokens__Resolve(
                  ConfigLoader.VghLantern__ConfigLoader__RequireString(documentCfg, 'IntroductionText', DOCUMENT_LABEL),
                  tokenTable).Text
            : '';

        // The closing notice that the terms have not been through legal review. One
        // statement at the end of the document rather than a marker on every clause:
        // forty-four red markers made the terms unreadable and buried the point they
        // were making. Switching ReviewNoticeEnabled off removes both the notice and
        // the Preview and Send warning that goes with it.
        var reviewNotice  =  null;
        if (ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(documentCfg, 'ReviewNoticeEnabled', DOCUMENT_LABEL)) {
            reviewNotice  =  {
                Heading : ConfigLoader.VghLantern__ConfigLoader__RequireString(documentCfg, 'ReviewNoticeHeading', DOCUMENT_LABEL),
                Text    : ConfigLoader.VghLantern__ConfigLoader__RequireString(documentCfg, 'ReviewNoticeText',    DOCUMENT_LABEL)
            };
            issues.IsUnreviewed  =  true;
        }

        return {
            Title        : ConfigLoader.VghLantern__ConfigLoader__RequireString(documentCfg, 'DocumentTitle', DOCUMENT_LABEL),
            Introduction : introduction,
            ReviewNotice : reviewNotice,
            Sections     : builtSections,
            Terms        : flatTerms,
            TotalTerms   : flatTerms.length,
            Issues       : issues
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Model for the Currently Open Project
    // ------------------------------------------------------------
    function VghLantern__Terms__DocumentModel__BuildFromState() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;

        return VghLantern__Terms__DocumentModel__Build(
            StateManager.VghLantern__StateManager__GetCurrentProject()
        );
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Terms__DocumentModel__Build              : VghLantern__Terms__DocumentModel__Build,
        VghLantern__Terms__DocumentModel__BuildFromState     : VghLantern__Terms__DocumentModel__BuildFromState,
        VghLantern__Terms__DocumentModel__ListSections       : VghLantern__Terms__DocumentModel__ListSections,
        VghLantern__Terms__DocumentModel__IsSectionEnabled   : VghLantern__Terms__DocumentModel__IsSectionEnabled,
        VghLantern__Terms__DocumentModel__SetSectionEnabled  : VghLantern__Terms__DocumentModel__SetSectionEnabled,
        VghLantern__Terms__DocumentModel__FormatNumber       : VghLantern__Terms__DocumentModel__FormatNumber
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Terms__DocumentModel  =  VghLantern__Terms__DocumentModel;
