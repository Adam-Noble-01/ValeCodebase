/* =============================================================================
   VGHLANTERN - CLIENT DOC | LETTER EDITOR
   =============================================================================

   FILE       : VghLantern__ClientDoc__LetterEditor__.js
   NAMESPACE  : VghLantern
   MODULE     : System - ClientDocumentMode - LetterEditor
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The welcome letter editing panel
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Renders the salutation field, the paragraph block list and the sign-off fields,
     and applies every edit through VghLantern__ClientDoc__LetterModel.
   - Holds no letter state of its own. Anything the user types is written onto the
     project through the model, and the panel is redrawn from the project.
   - Writes are debounced; leaving a field flushes immediately, so stepping away
     mid-sentence never loses the sentence.

   ============================================================================= */

// =============================================================================
// REGION | Client Document Letter Editor Module
// =============================================================================

const VghLantern__ClientDoc__LetterEditor = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Panel Key and CSS Class Names
    // ------------------------------------------------------------
    const PANEL_KEY       =  'letter';

    const CSS_PANEL       =  'VghLantern__ClientDoc__Panel';
    const CSS_PANEL_TITLE =  'VghLantern__ClientDoc__PanelTitle';
    const CSS_FIELD_ROW   =  'VghLantern__ClientDoc__FieldRow';
    const CSS_FIELD       =  'VghLantern__ClientDoc__Field';
    const CSS_FIELD_LABEL =  'VghLantern__ClientDoc__FieldLabel';
    const CSS_FIELD_INPUT =  'VghLantern__ClientDoc__FieldInput';
    const CSS_HELPER      =  'VghLantern__ClientDoc__Helper';
    const CSS_FILL_LINK   =  'VghLantern__ClientDoc__FillLink';
    const CSS_BODY_INPUT  =  'VghLantern__ClientDoc__BodyInput';
    const CSS_LEGEND      =  'VghLantern__ClientDoc__Legend';
    const CSS_LEGEND_ITEM =  'VghLantern__ClientDoc__LegendItem';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Field Names and Data Attributes
    // ------------------------------------------------------------
    const ATTR_FIELD      =  'data-vgh-letter-field';
    const ATTR_ACTION     =  'data-vgh-letter-action';

    const FIELD_SALUTATION            =  'salutation';
    const FIELD_SIGNOFF_NAME          =  'signOffName';
    const FIELD_SIGNOFF_ROLE          =  'signOffRole';
    const FIELD_CLIENT_ADDR_LINE1     =  'clientAddressLine1';
    const FIELD_CLIENT_ADDR_STREET    =  'clientAddressStreet';
    const FIELD_CLIENT_ADDR_TOWN      =  'clientAddressTownCity';
    const FIELD_CLIENT_ADDR_POST      =  'clientAddressPostCode';
    const FIELD_BODY                  =  'body';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Label
    // ------------------------------------------------------------
    const LETTER_LABEL  =  'Na__ClientDocument__Config.json -> VghLantern__ClientDocument__Config__Letter';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Pending Write State
    // ------------------------------------------------------------
    let VghLantern__LetterEditor__WriteTimerId  =  null;
    let VghLantern__LetterEditor__PendingWrite  =  null;                       // <-- { Kind, Key, Value } awaiting the debounce
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and State Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Letter Config Block
    // ------------------------------------------------------------
    function VghLantern__LetterEditor__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var clientCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('ClientDocument') || {};
        return clientCfg['VghLantern__ClientDocument__Config__Letter'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Current Project
    // ------------------------------------------------------------
    function VghLantern__LetterEditor__Project() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        return StateManager ? StateManager.VghLantern__StateManager__GetCurrentProject() : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__LetterEditor__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Debounced Writing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Apply One Pending Write to the Project
    // ------------------------------------------------------------
    function VghLantern__LetterEditor__ApplyWrite(pending) {
        var LetterModel  =  window.VghLantern__ClientDoc__LetterModel;
        var project      =  VghLantern__LetterEditor__Project();
        if (!LetterModel || !project || !pending) return;

        if (pending.Key === FIELD_BODY) {
            LetterModel.VghLantern__ClientDoc__LetterModel__SetBody(project, pending.Value);
            return;
        }

        LetterModel.VghLantern__ClientDoc__LetterModel__SetField(project, pending.Key, pending.Value);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Queue a Debounced Write
    // ------------------------------------------------------------
    // Only one write is ever pending. Typing into a second field flushes the first
    // rather than discarding it, because the two edits are both real.
    function VghLantern__LetterEditor__QueueWrite(kind, key, value) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;

        if (VghLantern__LetterEditor__PendingWrite &&
            (VghLantern__LetterEditor__PendingWrite.Kind !== kind ||
             VghLantern__LetterEditor__PendingWrite.Key  !== key)) {
            VghLantern__LetterEditor__ApplyWrite(VghLantern__LetterEditor__PendingWrite);
        }

        VghLantern__LetterEditor__PendingWrite  =  { Kind : kind, Key : key, Value : value };

        if (VghLantern__LetterEditor__WriteTimerId !== null) {
            clearTimeout(VghLantern__LetterEditor__WriteTimerId);
        }

        VghLantern__LetterEditor__WriteTimerId  =  setTimeout(function() {
            VghLantern__LetterEditor__WriteTimerId  =  null;
            var pending  =  VghLantern__LetterEditor__PendingWrite;
            VghLantern__LetterEditor__PendingWrite  =  null;

            VghLantern__LetterEditor__ApplyWrite(pending);

            var Layout  =  window.VghLantern__ClientDoc__Layout;
            if (Layout && Layout.VghLantern__ClientDoc__Layout__RefreshPreview) {
                Layout.VghLantern__ClientDoc__Layout__RefreshPreview();         // <-- Preview follows the text, not every keystroke
            }
        }, ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            VghLantern__LetterEditor__Config(), 'AutosaveDebounceMs', LETTER_LABEL));
    }
    // ------------------------------------------------------------


    // FUNCTION | Flush Any Pending Write Immediately
    // ------------------------------------------------------------
    // Called on field exit and on mode exit, so leaving the tab mid-sentence keeps
    // the sentence.
    function VghLantern__ClientDoc__LetterEditor__Flush() {
        if (VghLantern__LetterEditor__WriteTimerId !== null) {
            clearTimeout(VghLantern__LetterEditor__WriteTimerId);
            VghLantern__LetterEditor__WriteTimerId  =  null;
        }

        if (!VghLantern__LetterEditor__PendingWrite) return;

        var pending  =  VghLantern__LetterEditor__PendingWrite;
        VghLantern__LetterEditor__PendingWrite  =  null;
        VghLantern__LetterEditor__ApplyWrite(pending);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build a Single Line Text Field
    // ------------------------------------------------------------
    function VghLantern__LetterEditor__BuildField(fieldName, label, value, placeholder, extraHtml) {
        return '<label class="' + CSS_FIELD + '">' +
               '<span class="' + CSS_FIELD_LABEL + '">' + VghLantern__LetterEditor__Escape(label) + '</span>' +
               '<input type="text" class="' + CSS_FIELD_INPUT + '" ' +
               ATTR_FIELD + '="' + fieldName + '" ' +
               'value="' + VghLantern__LetterEditor__Escape(value) + '" ' +
               'placeholder="' + VghLantern__LetterEditor__Escape(placeholder || '') + '">' +
               (extraHtml || '') +
               '</label>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Client Address Block
    // ------------------------------------------------------------
    // The recipient block the letterhead prints above the salutation. Each field
    // seeds from config as a literal {{ClientAddress__...}} token - see LetterModel -
    // so the block is laid out and formatted correctly before a project carries a
    // real client address.
    function VghLantern__LetterEditor__BuildClientAddress(project) {
        var LetterModel  =  window.VghLantern__ClientDoc__LetterModel;

        return '<div class="' + CSS_FIELD_ROW + '">' +
               VghLantern__LetterEditor__BuildField(FIELD_CLIENT_ADDR_LINE1, 'Address Line 1',
                   LetterModel.VghLantern__ClientDoc__LetterModel__ReadField(project, FIELD_CLIENT_ADDR_LINE1), 'Address line 1') +
               VghLantern__LetterEditor__BuildField(FIELD_CLIENT_ADDR_STREET, 'Street Name',
                   LetterModel.VghLantern__ClientDoc__LetterModel__ReadField(project, FIELD_CLIENT_ADDR_STREET), 'Street name') +
               '</div>' +
               '<div class="' + CSS_FIELD_ROW + '">' +
               VghLantern__LetterEditor__BuildField(FIELD_CLIENT_ADDR_TOWN, 'Town / City',
                   LetterModel.VghLantern__ClientDoc__LetterModel__ReadField(project, FIELD_CLIENT_ADDR_TOWN), 'Town or city') +
               VghLantern__LetterEditor__BuildField(FIELD_CLIENT_ADDR_POST, 'Postcode',
                   LetterModel.VghLantern__ClientDoc__LetterModel__ReadField(project, FIELD_CLIENT_ADDR_POST), 'Postcode') +
               '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Sign-Off Block
    // ------------------------------------------------------------
    // The project author is offered as a one-click fill rather than pre-filled,
    // because whoever set the project up is not always whoever signs the letter.
    function VghLantern__LetterEditor__BuildSignOff(project) {
        var LetterModel  =  window.VghLantern__ClientDoc__LetterModel;
        var metadata     =  (project && project['VghLantern__ProjectFile__Metadata']) || {};
        var author       =  metadata['VghLantern__ProjectFile__Metadata__Author'] || '';

        var name  =  LetterModel.VghLantern__ClientDoc__LetterModel__ReadField(project, FIELD_SIGNOFF_NAME);
        var role  =  LetterModel.VghLantern__ClientDoc__LetterModel__ReadField(project, FIELD_SIGNOFF_ROLE);

        var fillLink  =  (author !== '' && name === '')
            ? '<button type="button" class="' + CSS_FILL_LINK + '" ' + ATTR_ACTION + '="fillAuthor">' +
              'Use ' + VghLantern__LetterEditor__Escape(author) + '</button>'
            : '';

        return '<div class="' + CSS_FIELD_ROW + '">' +
               VghLantern__LetterEditor__BuildField(FIELD_SIGNOFF_NAME, 'Signed by', name, 'Name', fillLink) +
               VghLantern__LetterEditor__BuildField(FIELD_SIGNOFF_ROLE, 'Role', role, 'Role or title') +
               '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Markdown Formatting Legend
    // ------------------------------------------------------------
    // The whole grammar, stated where it is used. Four lines under the box beats a
    // help panel nobody opens, and this is short enough to be read once and remembered.
    function VghLantern__LetterEditor__BuildLegend() {
        var items  =  [
            ['## ',       'Heading'],
            ['### ',      'Sub-heading'],
            ['---',       'Divider'],
            ['**bold**',  'Bold'],
            ['*italic*',  'Italic'],
            ['blank line','New paragraph']
        ];

        var html  =  '<div class="' + CSS_LEGEND + '">';
        var i;

        for (i = 0; i < items.length; i++) {
            html  +=  '<span class="' + CSS_LEGEND_ITEM + '">' +
                      '<code>' + VghLantern__LetterEditor__Escape(items[i][0]) + '</code>' +
                      VghLantern__LetterEditor__Escape(items[i][1]) + '</span>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Letter Editing Panel
    // ------------------------------------------------------------
    // One field for the whole body rather than a card per paragraph. A letter is
    // prose, and prose is written in one box: text can be selected across a paragraph
    // break, a sentence can be moved between paragraphs by dragging it, and the shape
    // of the thing on screen matches the shape of the thing being produced.
    function VghLantern__ClientDoc__LetterEditor__BuildHtml() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var LetterModel   =  window.VghLantern__ClientDoc__LetterModel;
        var project       =  VghLantern__LetterEditor__Project();
        if (!LetterModel || !project) return '';

        var config  =  VghLantern__LetterEditor__Config();

        var resetHtml  =  LetterModel.VghLantern__ClientDoc__LetterModel__IsBodyEdited(project)
            ? '<button type="button" class="' + CSS_FILL_LINK + '" ' + ATTR_ACTION + '="resetBody">' +
              VghLantern__LetterEditor__Escape(
                  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'ResetBodyLabel', LETTER_LABEL)) +
              '</button>'
            : '';

        return '<section class="' + CSS_PANEL + '">' +
               '<h3 class="' + CSS_PANEL_TITLE + '">' +
               VghLantern__LetterEditor__Escape(
                   ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'LetterTitle', LETTER_LABEL)) +
               '</h3>' +

               VghLantern__LetterEditor__BuildField(
                   FIELD_SALUTATION, 'Salutation',
                   LetterModel.VghLantern__ClientDoc__LetterModel__ReadField(project, FIELD_SALUTATION),
                   'Dear ...') +

               '<span class="' + CSS_FIELD_LABEL + '">Client Address</span>' +
               VghLantern__LetterEditor__BuildClientAddress(project) +

               '<label class="' + CSS_FIELD + '">' +
               '<span class="' + CSS_FIELD_LABEL + '">Letter</span>' +
               '<textarea class="' + CSS_BODY_INPUT + '" ' + ATTR_FIELD + '="' + FIELD_BODY + '" ' +
               'maxlength="' + ConfigLoader.VghLantern__ConfigLoader__RequireNumber(config, 'MaxBodyCharacters', LETTER_LABEL) + '" ' +
               'placeholder="' + VghLantern__LetterEditor__Escape(
                   ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'BodyPlaceholder', LETTER_LABEL)) + '" ' +
               'spellcheck="true">' +
               VghLantern__LetterEditor__Escape(
                   LetterModel.VghLantern__ClientDoc__LetterModel__ReadBody(project)) +
               '</textarea>' +
               resetHtml +
               '</label>' +

               VghLantern__LetterEditor__BuildLegend() +
               VghLantern__LetterEditor__BuildSignOff(project) +
               '<p class="' + CSS_HELPER + '">The subject line, date and reference are composed from the project record.</p>' +
               '</section>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Handling
// -----------------------------------------------------------------------------

    // FUNCTION | Handle a Text Input Event From the Letter Panel
    // ------------------------------------------------------------
    // Returns true when the event belonged to this panel, so the layout's delegated
    // listener knows whether to stop.
    function VghLantern__ClientDoc__LetterEditor__HandleInput(target) {
        if (!target || !target.getAttribute) return false;

        var fieldName  =  target.getAttribute(ATTR_FIELD);
        if (!fieldName) return false;

        VghLantern__LetterEditor__QueueWrite('field', fieldName, target.value);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle a Button Action From the Letter Panel
    // ------------------------------------------------------------
    // Returns true when the panel needs a full redraw.
    function VghLantern__ClientDoc__LetterEditor__HandleAction(action) {
        var LetterModel  =  window.VghLantern__ClientDoc__LetterModel;
        var project      =  VghLantern__LetterEditor__Project();
        if (!LetterModel || !project) return false;

        VghLantern__ClientDoc__LetterEditor__Flush();                          // <-- Must not race a pending text write

        if (action === 'resetBody') {
            return LetterModel.VghLantern__ClientDoc__LetterModel__ResetBody(project);
        }
        if (action === 'fillAuthor') {
            var metadata  =  project['VghLantern__ProjectFile__Metadata'] || {};
            return LetterModel.VghLantern__ClientDoc__LetterModel__SetField(
                project, FIELD_SIGNOFF_NAME, metadata['VghLantern__ProjectFile__Metadata__Author'] || '');
        }

        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ClientDoc__LetterEditor__PanelKey       : PANEL_KEY,
        VghLantern__ClientDoc__LetterEditor__ActionAttribute: ATTR_ACTION,
        VghLantern__ClientDoc__LetterEditor__BodyInputClass : CSS_BODY_INPUT,

        VghLantern__ClientDoc__LetterEditor__BuildHtml      : VghLantern__ClientDoc__LetterEditor__BuildHtml,
        VghLantern__ClientDoc__LetterEditor__HandleInput    : VghLantern__ClientDoc__LetterEditor__HandleInput,
        VghLantern__ClientDoc__LetterEditor__HandleAction   : VghLantern__ClientDoc__LetterEditor__HandleAction,
        VghLantern__ClientDoc__LetterEditor__Flush          : VghLantern__ClientDoc__LetterEditor__Flush
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__ClientDoc__LetterEditor  =  VghLantern__ClientDoc__LetterEditor;
