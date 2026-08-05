/* =============================================================================
   VGHLANTERN - CLIENT DOC | LETTER MODEL
   =============================================================================

   FILE       : VghLantern__ClientDoc__LetterModel__.js
   NAMESPACE  : VghLantern
   MODULE     : System - ClientDocumentMode - LetterModel
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The welcome letter as data, and the only writer of it onto a project
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Owns the letter body: reading it, materialising it from the template on first
     open, and writing edits back onto the project.
   - Resolves the letter for rendering, which both the screen renderer and the PDF
     painter consume, so the previewed letter and the written letter are one letter.
   - Marks the project dirty on every mutation. AppCore autosave listens for that, so
     the letter persists with no save button, exactly like the job notes editor.

   -----------------------------------------------------------------------------

   WHY THE BODY IS ONE MARKDOWN STRING RATHER THAN A LIST OF PARAGRAPH RECORDS:
   It was a list of records, edited as one card per paragraph. Writing a letter that
   way is writing into six little boxes rather than writing a letter: the text cannot
   be selected across a paragraph break, moving a sentence between paragraphs means
   retyping it, and the shape of the thing on screen looks nothing like the shape of
   the thing being produced. One field holding the whole body, with a small markdown
   subset for headings, dividers and emphasis, is how prose is actually written.

   Structure is not lost by this: VghLantern__ClientDoc__MarkdownParser turns the body
   back into an ordered block list, and both renderers draw from that.

   WHY THE TEMPLATE IS MATERIALISED ONTO THE PROJECT ON FIRST OPEN:
   The alternative is to keep the letter as "template plus overrides" and resolve it
   at render time. That would mean editing the template in config silently rewrites
   letters on projects already quoted, including ones already sent. A letter is an
   issued document; once a project has one it belongs to that project. Editing the
   template changes what the NEXT project starts with and nothing else.

   ============================================================================= */

// =============================================================================
// REGION | Client Document Letter Model Module
// =============================================================================

const VghLantern__ClientDoc__LetterModel = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Project Data Keys
    // ------------------------------------------------------------
    const CLIENT_DOC_BLOCK          =  'VghLantern__ProjectFile__ClientDocument';
    const FIELD_BODY                =  'VghLantern__ProjectFile__ClientDocument__LetterBody';
    const FIELD_SALUTATION          =  'VghLantern__ProjectFile__ClientDocument__LetterSalutation';
    const FIELD_SIGNOFF_NAME        =  'VghLantern__ProjectFile__ClientDocument__SignOffName';
    const FIELD_SIGNOFF_ROLE        =  'VghLantern__ProjectFile__ClientDocument__SignOffRole';
    const FIELD_CLIENT_ADDR_LINE1   =  'VghLantern__ProjectFile__ClientDocument__ClientAddressLine1';
    const FIELD_CLIENT_ADDR_STREET  =  'VghLantern__ProjectFile__ClientDocument__ClientAddressStreet';
    const FIELD_CLIENT_ADDR_TOWN    =  'VghLantern__ProjectFile__ClientDocument__ClientAddressTownCity';
    const FIELD_CLIENT_ADDR_POST    =  'VghLantern__ProjectFile__ClientDocument__ClientAddressPostCode';

    // Maps the short field names the editor and the resolver use onto the project
    // keys above, so ReadField/SetField and the materialisation seed share one table
    // rather than each growing its own chain of ternaries as fields are added.
    const FIELD_KEY_MAP  =  {
        salutation            : FIELD_SALUTATION,
        signOffName           : FIELD_SIGNOFF_NAME,
        signOffRole           : FIELD_SIGNOFF_ROLE,
        clientAddressLine1    : FIELD_CLIENT_ADDR_LINE1,
        clientAddressStreet   : FIELD_CLIENT_ADDR_STREET,
        clientAddressTownCity : FIELD_CLIENT_ADDR_TOWN,
        clientAddressPostCode : FIELD_CLIENT_ADDR_POST
    };
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Label
    // ------------------------------------------------------------
    const LETTER_LABEL  =  'Na__ClientDocument__Config.json -> VghLantern__ClientDocument__Config__Letter';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get a Named Client Document Config Block
    // ------------------------------------------------------------
    function VghLantern__LetterModel__Block(blockName) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var clientCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('ClientDocument') || {};
        return clientCfg['VghLantern__ClientDocument__Config__' + blockName] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | List the Template Paragraphs
    // ------------------------------------------------------------
    function VghLantern__LetterModel__Template() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        return ConfigLoader.VghLantern__ConfigLoader__RequireArray(
            VghLantern__LetterModel__Block('Letter'), 'LetterTemplate', LETTER_LABEL);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project Block Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Client Document Block, Creating It If Absent
    // ------------------------------------------------------------
    function VghLantern__LetterModel__EnsureBlock(project) {
        if (!project) return null;
        if (!project[CLIENT_DOC_BLOCK]) project[CLIENT_DOC_BLOCK]  =  {};
        if (typeof project[CLIENT_DOC_BLOCK][FIELD_BODY] !== 'string') {
            project[CLIENT_DOC_BLOCK][FIELD_BODY]  =  '';
        }
        return project[CLIENT_DOC_BLOCK];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mark the Project Dirty So Autosave Persists It
    // ------------------------------------------------------------
    function VghLantern__LetterModel__MarkDirty() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (StateManager) StateManager.VghLantern__StateManager__MarkDirty();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Report Whether a Field Is Blank or Still a Placeholder
    // ------------------------------------------------------------
    // The seeded defaults are literal {{Token}} strings, so a field holding one has
    // not actually been filled in. Issue reporting has to treat the two the same or
    // seeding a placeholder would silently switch off the warning that field feeds.
    function VghLantern__LetterModel__IsPlaceholderOrEmpty(value) {
        var text  =  String(value === undefined || value === null ? '' : value).trim();
        return text === '' || /^\{\{.*\}\}$/.test(text);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Materialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Template Body as One Markdown String
    // ------------------------------------------------------------
    // Template paragraphs joined by a blank line, which is the paragraph break the
    // markdown parser reads. Exposed so the editor can offer a reset to it.
    function VghLantern__ClientDoc__LetterModel__TemplateBody() {
        var template  =  VghLantern__LetterModel__Template();
        var parts     =  [];
        var i;

        for (i = 0; i < template.length; i++) {
            if (template[i].Text) parts.push(String(template[i].Text));
        }

        return parts.join('\n\n');
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Key For Each Field's Seed Value
    // ------------------------------------------------------------
    // The salutation, the sign-off and the client address all start from a config
    // default the first time a project opens here, for the same reason: an empty
    // field on a client-facing letter reads as unfinished rather than as a choice.
    // The sign-off and client address defaults are literal tokens - {{UserName}},
    // {{ClientAddress__Line01}} and so on - printed exactly as written because they
    // are never passed through VghLantern__AppUtils__DocumentTokens. They exist so
    // the letterhead is laid out and formatted correctly today; a future system that
    // knows the signed-in user and the client's postal address replaces them.
    const FIELD_DEFAULT_CONFIG_KEY_MAP  =  {
        salutation            : 'DefaultSalutation',
        signOffName           : 'DefaultSignOffName',
        signOffRole           : 'DefaultSignOffRole',
        clientAddressLine1    : 'DefaultClientAddressLine1',
        clientAddressStreet   : 'DefaultClientAddressStreet',
        clientAddressTownCity : 'DefaultClientAddressTownCity',
        clientAddressPostCode : 'DefaultClientAddressPostCode'
    };
    // ------------------------------------------------------------


    // FUNCTION | Write the Template Onto a Project That Has No Letter Yet
    // ------------------------------------------------------------
    // Runs once per project, the first time the Client Doc tab opens it. Returns true
    // when it wrote something, so the caller knows the project changed.
    function VghLantern__ClientDoc__LetterModel__EnsureMaterialised(project) {
        var block  =  VghLantern__LetterModel__EnsureBlock(project);
        if (!block) return false;
        if (block[FIELD_BODY] !== '') return false;                            // <-- This project already has its own letter

        block[FIELD_BODY]  =  VghLantern__ClientDoc__LetterModel__TemplateBody();

        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var letterCfg     =  VghLantern__LetterModel__Block('Letter');
        var fieldName, projectKey;

        for (fieldName in FIELD_DEFAULT_CONFIG_KEY_MAP) {
            projectKey  =  FIELD_KEY_MAP[fieldName];
            if (typeof block[projectKey] === 'string' && block[projectKey] !== '') continue;

            block[projectKey]  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(
                letterCfg, FIELD_DEFAULT_CONFIG_KEY_MAP[fieldName], LETTER_LABEL);
        }

        VghLantern__LetterModel__MarkDirty();
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Body
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Letter Body as Markdown
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__LetterModel__ReadBody(project) {
        var block  =  (project && project[CLIENT_DOC_BLOCK]) || {};
        return (typeof block[FIELD_BODY] === 'string') ? block[FIELD_BODY] : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Write the Letter Body
    // ------------------------------------------------------------
    // Capped at the configured length. The cap is enforced here as well as on the
    // textarea because a paste can exceed a maxlength attribute in some browsers.
    function VghLantern__ClientDoc__LetterModel__SetBody(project, markdownText) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var block  =  VghLantern__LetterModel__EnsureBlock(project);
        if (!block) return false;

        var maxChars  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            VghLantern__LetterModel__Block('Letter'), 'MaxBodyCharacters', LETTER_LABEL);

        var next  =  String(markdownText === undefined || markdownText === null ? '' : markdownText);
        if (next.length > maxChars) next  =  next.slice(0, maxChars);

        if (block[FIELD_BODY] === next) return false;                          // <-- Nothing changed; do not dirty the project

        block[FIELD_BODY]  =  next;
        VghLantern__LetterModel__MarkDirty();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Restore the Body to the Current Template
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__LetterModel__ResetBody(project) {
        return VghLantern__ClientDoc__LetterModel__SetBody(
            project, VghLantern__ClientDoc__LetterModel__TemplateBody());
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Body Differs From the Template
    // ------------------------------------------------------------
    // Drives whether the editor offers the reset control at all.
    function VghLantern__ClientDoc__LetterModel__IsBodyEdited(project) {
        return VghLantern__ClientDoc__LetterModel__ReadBody(project) !==
               VghLantern__ClientDoc__LetterModel__TemplateBody();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Named Letter Fields
// -----------------------------------------------------------------------------

    // FUNCTION | Read a Named Letter Field
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__LetterModel__ReadField(project, fieldName) {
        var block  =  (project && project[CLIENT_DOC_BLOCK]) || {};
        var key    =  FIELD_KEY_MAP[fieldName] || FIELD_SIGNOFF_ROLE;

        return (typeof block[key] === 'string') ? block[key] : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Named Letter Field
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__LetterModel__SetField(project, fieldName, value) {
        var block  =  VghLantern__LetterModel__EnsureBlock(project);
        if (!block) return false;

        var key  =  FIELD_KEY_MAP[fieldName] || FIELD_SIGNOFF_ROLE;

        if (block[key] === value) return false;

        block[key]  =  String(value);
        VghLantern__LetterModel__MarkDirty();
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Whole Letter for Rendering
    // ------------------------------------------------------------
    // The one call both the screen renderer and the PDF painter make. Tokens are
    // resolved here, once, and what could not be resolved travels with the result so
    // Preview and Send can warn about an incomplete letter.
    function VghLantern__ClientDoc__LetterModel__BuildResolved(project) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var Tokens        =  window.VghLantern__AppUtils__DocumentTokens;
        if (!ConfigLoader || !project) return null;

        var letterCfg   =  VghLantern__LetterModel__Block('Letter');
        var tokenTable  =  Tokens ? Tokens.VghLantern__AppUtils__DocumentTokens__BuildTable(project) : {};
        var unresolved  =  [];

        // HELPER | Resolve one string and collect whatever it could not fill in
        function resolve(text) {
            if (!Tokens) return String(text || '');

            var result  =  Tokens.VghLantern__AppUtils__DocumentTokens__Resolve(text, tokenTable);
            result.Unresolved.forEach(function(name) {
                if (unresolved.indexOf(name) === -1) unresolved.push(name);
            });
            return result.Text;
        }

        // HELPER | Read a named field, falling back to its configured default
        // A project materialised before a field existed has nothing stored against
        // it, so without this the block that field feeds would silently vanish from
        // an older letter while appearing on every new one.
        function fieldOrDefault(fieldName) {
            var stored  =  VghLantern__ClientDoc__LetterModel__ReadField(project, fieldName);
            if (stored !== '') return stored;

            return ConfigLoader.VghLantern__ConfigLoader__RequireString(
                letterCfg, FIELD_DEFAULT_CONFIG_KEY_MAP[fieldName], LETTER_LABEL);
        }

        // Tokens are resolved on the raw body BEFORE it is parsed, so a token sitting
        // inside a bold run resolves like any other text rather than breaking the run
        // apart. Parsing then produces the blocks both renderers draw.
        var Parser  =  window.VghLantern__ClientDoc__MarkdownParser;
        var body    =  resolve(VghLantern__ClientDoc__LetterModel__ReadBody(project));
        var blocks  =  Parser ? Parser.VghLantern__ClientDoc__MarkdownParser__Parse(body) : [];

        return {
            ShowLetterhead : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(letterCfg, 'ShowLetterhead',   LETTER_LABEL),
            ShowLogo       : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(letterCfg, 'ShowValeLogo',     LETTER_LABEL),
            LogoAssetPath  : letterCfg.LogoAssetPath || '',
            LogoWidthMm    : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(letterCfg, 'LogoWidthMm',       LETTER_LABEL),

            // The sender's own details, printed beside the logo. Fixed company data,
            // not project data, so it comes straight from config rather than through
            // the token resolver.
            ShowCompanyDetails   : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(letterCfg, 'ShowCompanyDetails', LETTER_LABEL),
            CompanyName          : ConfigLoader.VghLantern__ConfigLoader__RequireString(letterCfg, 'CompanyLetterheadName',         LETTER_LABEL),
            CompanyAddressLine1  : ConfigLoader.VghLantern__ConfigLoader__RequireString(letterCfg, 'CompanyLetterheadAddressLine1', LETTER_LABEL),
            CompanyTownCity      : ConfigLoader.VghLantern__ConfigLoader__RequireString(letterCfg, 'CompanyLetterheadTownCity',     LETTER_LABEL),
            CompanyPostCode      : ConfigLoader.VghLantern__ConfigLoader__RequireString(letterCfg, 'CompanyLetterheadPostCode',     LETTER_LABEL),
            CompanyWebsite       : ConfigLoader.VghLantern__ConfigLoader__RequireString(letterCfg, 'CompanyLetterheadWebsite',      LETTER_LABEL),
            CompanyPhone         : ConfigLoader.VghLantern__ConfigLoader__RequireString(letterCfg, 'CompanyLetterheadPhone',        LETTER_LABEL),

            IssueDate      : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(letterCfg, 'ShowIssueDate', LETTER_LABEL)
                             ? (tokenTable.IssueDate || '') : '',
            ReferenceLine  : ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(letterCfg, 'ShowProjectReferenceLine', LETTER_LABEL)
                             ? resolve(ConfigLoader.VghLantern__ConfigLoader__RequireString(letterCfg, 'ProjectReferenceFormat', LETTER_LABEL))
                             : '',
            Subject        : resolve(ConfigLoader.VghLantern__ConfigLoader__RequireString(letterCfg, 'SubjectLineFormat', LETTER_LABEL)),

            // The recipient block above the salutation. The client's name is a real
            // resolved token; the four address lines are raw, unresolved placeholders
            // exactly like the sign-off fields below, until a client address data
            // source exists on the project record.
            ClientName            : tokenTable.ClientName || '',
            ClientAddressLine1    : fieldOrDefault('clientAddressLine1'),
            ClientAddressStreet   : fieldOrDefault('clientAddressStreet'),
            ClientAddressTownCity : fieldOrDefault('clientAddressTownCity'),
            ClientAddressPostCode : fieldOrDefault('clientAddressPostCode'),

            Salutation     : resolve(fieldOrDefault('salutation')),
            Blocks         : blocks,

            SignOffPhrase  : ConfigLoader.VghLantern__ConfigLoader__RequireString(letterCfg, 'DefaultSignOffPhrase', LETTER_LABEL),
            SignOffName    : fieldOrDefault('signOffName'),
            SignOffRole    : fieldOrDefault('signOffRole'),

            Issues         : {
                UnresolvedTokens : unresolved,
                IsEmpty          : body.trim() === '',

                // A name that is still the {{UserName}} placeholder is not a
                // signature, so Preview and Send must keep warning about it just as
                // it did when the field was left blank.
                IsUnsigned       : VghLantern__LetterModel__IsPlaceholderOrEmpty(
                                       VghLantern__ClientDoc__LetterModel__ReadField(project, 'signOffName'))
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Letter for the Currently Open Project
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__LetterModel__BuildFromState() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;

        return VghLantern__ClientDoc__LetterModel__BuildResolved(
            StateManager.VghLantern__StateManager__GetCurrentProject()
        );
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ClientDoc__LetterModel__EnsureMaterialised : VghLantern__ClientDoc__LetterModel__EnsureMaterialised,
        VghLantern__ClientDoc__LetterModel__TemplateBody       : VghLantern__ClientDoc__LetterModel__TemplateBody,
        VghLantern__ClientDoc__LetterModel__ReadBody           : VghLantern__ClientDoc__LetterModel__ReadBody,
        VghLantern__ClientDoc__LetterModel__SetBody            : VghLantern__ClientDoc__LetterModel__SetBody,
        VghLantern__ClientDoc__LetterModel__ResetBody          : VghLantern__ClientDoc__LetterModel__ResetBody,
        VghLantern__ClientDoc__LetterModel__IsBodyEdited       : VghLantern__ClientDoc__LetterModel__IsBodyEdited,
        VghLantern__ClientDoc__LetterModel__ReadField          : VghLantern__ClientDoc__LetterModel__ReadField,
        VghLantern__ClientDoc__LetterModel__SetField           : VghLantern__ClientDoc__LetterModel__SetField,
        VghLantern__ClientDoc__LetterModel__BuildResolved      : VghLantern__ClientDoc__LetterModel__BuildResolved,
        VghLantern__ClientDoc__LetterModel__BuildFromState     : VghLantern__ClientDoc__LetterModel__BuildFromState
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__ClientDoc__LetterModel  =  VghLantern__ClientDoc__LetterModel;
