/* =============================================================================
   VGHLANTERN - CLIENT DOC | TERMS EDITOR
   =============================================================================

   FILE       : VghLantern__ClientDoc__TermsEditor__.js
   NAMESPACE  : VghLantern
   MODULE     : System - ClientDocumentMode - TermsEditor
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Edit a project's critical and special terms, and switch standard sections
   CREATED    : 04-Aug-2026

   DESCRIPTION:
   - Two block lists, critical and special, plus the on/off switches for the standard
     library sections.
   - Owns the project's own terms. It does not own the standard terms, which are the
     markdown library, and it does not own numbering, which is the terms document
     model. It labels each card with the number that model assigns.
   - Section switches write to the project through the terms model, which is the same
     call the Preview and Send toolbar makes, so the two surfaces cannot disagree.

   -----------------------------------------------------------------------------

   WHY THE CARDS ARE LABELLED WITH THEIR LIVE CLAUSE NUMBER:
   The point of the numbering rule is that a clause is citable. Showing 2.03 on the
   card the user is typing into is what makes that visible: add a term above it and
   the label becomes 2.04 while they watch, and the standard sections below visibly
   do not move.

   ============================================================================= */

// =============================================================================
// REGION | Client Document Terms Editor Module
// =============================================================================

const VghLantern__ClientDoc__TermsEditor = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Panel Keys
    // ------------------------------------------------------------
    const PANEL_CRITICAL  =  'criticalTerms';
    const PANEL_SPECIAL   =  'specialTerms';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_PANEL         =  'VghLantern__ClientDoc__Panel';
    const CSS_PANEL_TITLE   =  'VghLantern__ClientDoc__PanelTitle';
    const CSS_PANEL_CRIT    =  'VghLantern__ClientDoc__Panel--critical';
    const CSS_HELPER        =  'VghLantern__ClientDoc__Helper';
    const CSS_TOGGLE_LIST   =  'VghLantern__ClientDoc__SectionToggles';
    const CSS_TOGGLE        =  'VghLantern__ClientDoc__SectionToggle';
    const CSS_TOGGLE_NUM    =  'VghLantern__ClientDoc__SectionNumber';
    const CSS_TOGGLE_LABEL  =  'VghLantern__ClientDoc__SectionLabel';
    const CSS_TOGGLE_COUNT  =  'VghLantern__ClientDoc__SectionCount';
    const CSS_TOGGLE_FAIL   =  'VghLantern__ClientDoc__SectionToggle--failed';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Data Attributes and Project Keys
    // ------------------------------------------------------------
    const ATTR_SECTION_KEY  =  'data-vgh-terms-section';

    const CLIENT_DOC_BLOCK  =  'VghLantern__ProjectFile__ClientDocument';
    const FIELD_CRITICAL    =  'VghLantern__ProjectFile__ClientDocument__CriticalTerms';
    const FIELD_SPECIAL     =  'VghLantern__ProjectFile__ClientDocument__SpecialTerms';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Label
    // ------------------------------------------------------------
    const TERMS_LABEL  =  'Na__ClientDocument__Config.json -> VghLantern__ClientDocument__Config__ProjectTerms';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Pending Write State and Identity Counter
    // ------------------------------------------------------------
    let VghLantern__TermsEditor__WriteTimerId  =  null;
    let VghLantern__TermsEditor__PendingWrite  =  null;
    let VghLantern__TermsEditor__IdCounter     =  0;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and State Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Project Terms Config Block
    // ------------------------------------------------------------
    function VghLantern__TermsEditor__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var clientCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('ClientDocument') || {};
        return clientCfg['VghLantern__ClientDocument__Config__ProjectTerms'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Current Project
    // ------------------------------------------------------------
    function VghLantern__TermsEditor__Project() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        return StateManager ? StateManager.VghLantern__StateManager__GetCurrentProject() : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__TermsEditor__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the Project Field a Panel Edits
    // ------------------------------------------------------------
    function VghLantern__TermsEditor__FieldFor(panelKey) {
        return (panelKey === PANEL_CRITICAL) ? FIELD_CRITICAL : FIELD_SPECIAL;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Panel's Term List, Creating It If Absent
    // ------------------------------------------------------------
    function VghLantern__TermsEditor__ReadList(project, panelKey) {
        if (!project) return [];
        if (!project[CLIENT_DOC_BLOCK]) project[CLIENT_DOC_BLOCK]  =  {};

        var field  =  VghLantern__TermsEditor__FieldFor(panelKey);
        if (!Array.isArray(project[CLIENT_DOC_BLOCK][field])) {
            project[CLIENT_DOC_BLOCK][field]  =  [];
        }

        return project[CLIENT_DOC_BLOCK][field];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mark the Project Dirty So Autosave Persists It
    // ------------------------------------------------------------
    function VghLantern__TermsEditor__MarkDirty() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (StateManager) StateManager.VghLantern__StateManager__MarkDirty();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Debounced Writing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Apply One Pending Term Text Write
    // ------------------------------------------------------------
    function VghLantern__TermsEditor__ApplyWrite(pending) {
        if (!pending) return;

        var list  =  VghLantern__TermsEditor__ReadList(VghLantern__TermsEditor__Project(), pending.PanelKey);
        var i;

        for (i = 0; i < list.length; i++) {
            if (list[i].Id !== pending.TermId) continue;
            if (list[i].Text === pending.Value) return;                        // <-- Nothing changed; do not dirty the project

            list[i].Text  =  String(pending.Value);
            VghLantern__TermsEditor__MarkDirty();
            return;
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Queue a Debounced Term Text Write
    // ------------------------------------------------------------
    function VghLantern__TermsEditor__QueueWrite(panelKey, termId, value) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var LetterConfig  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('ClientDocument') || {};
        var letterCfg     =  LetterConfig['VghLantern__ClientDocument__Config__Letter'] || {};

        if (VghLantern__TermsEditor__PendingWrite &&
            (VghLantern__TermsEditor__PendingWrite.PanelKey !== panelKey ||
             VghLantern__TermsEditor__PendingWrite.TermId   !== termId)) {
            VghLantern__TermsEditor__ApplyWrite(VghLantern__TermsEditor__PendingWrite);
        }

        VghLantern__TermsEditor__PendingWrite  =  { PanelKey : panelKey, TermId : termId, Value : value };

        if (VghLantern__TermsEditor__WriteTimerId !== null) {
            clearTimeout(VghLantern__TermsEditor__WriteTimerId);
        }

        VghLantern__TermsEditor__WriteTimerId  =  setTimeout(function() {
            VghLantern__TermsEditor__WriteTimerId  =  null;
            var pending  =  VghLantern__TermsEditor__PendingWrite;
            VghLantern__TermsEditor__PendingWrite  =  null;

            VghLantern__TermsEditor__ApplyWrite(pending);

            var Layout  =  window.VghLantern__ClientDoc__Layout;
            if (Layout && Layout.VghLantern__ClientDoc__Layout__RefreshPreview) {
                Layout.VghLantern__ClientDoc__Layout__RefreshPreview();
            }
        }, ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            letterCfg, 'AutosaveDebounceMs',
            'Na__ClientDocument__Config.json -> VghLantern__ClientDocument__Config__Letter'));
    }
    // ------------------------------------------------------------


    // FUNCTION | Flush Any Pending Term Write Immediately
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__TermsEditor__Flush() {
        if (VghLantern__TermsEditor__WriteTimerId !== null) {
            clearTimeout(VghLantern__TermsEditor__WriteTimerId);
            VghLantern__TermsEditor__WriteTimerId  =  null;
        }

        if (!VghLantern__TermsEditor__PendingWrite) return;

        var pending  =  VghLantern__TermsEditor__PendingWrite;
        VghLantern__TermsEditor__PendingWrite  =  null;
        VghLantern__TermsEditor__ApplyWrite(pending);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Resolve the Section Number a Panel's Terms Carry
    // ------------------------------------------------------------
    // Read from the terms config section table rather than assumed, so moving a
    // section's number in JSON moves the labels in the editor with it.
    function VghLantern__TermsEditor__SectionNumberFor(panelKey) {
        var DocumentModel  =  window.VghLantern__Terms__DocumentModel;
        if (!DocumentModel) return 0;

        var wanted    =  (panelKey === PANEL_CRITICAL) ? 'critical' : 'special';
        var sections  =  DocumentModel.VghLantern__Terms__DocumentModel__ListSections();
        var i;

        for (i = 0; i < sections.length; i++) {
            if (sections[i].Key === wanted) return sections[i].Number;
        }

        return 0;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Term Block List
    // ------------------------------------------------------------
    function VghLantern__TermsEditor__BuildTermList(panelKey, isCritical) {
        var ConfigLoader   =  window.VghLantern__AppCore__ConfigLoader;
        var BlockEditor    =  window.VghLantern__ClientDoc__BlockEditor;
        var DocumentModel  =  window.VghLantern__Terms__DocumentModel;
        var config         =  VghLantern__TermsEditor__Config();
        if (!BlockEditor) return '';

        var list   =  VghLantern__TermsEditor__ReadList(VghLantern__TermsEditor__Project(), panelKey);
        var number =  VghLantern__TermsEditor__SectionNumberFor(panelKey);

        var cards  =  list.map(function(entry) {
            return { Id : entry.Id, Text : entry.Text, CanReset : false };
        });

        return BlockEditor.VghLantern__ClientDoc__BlockEditor__BuildList({
            PanelKey      : panelKey,
            ItemLabel     : 'Term',
            LabelForIndex : function(index) {
                return DocumentModel
                    ? DocumentModel.VghLantern__Terms__DocumentModel__FormatNumber(number, index + 1)
                    : String(index + 1);
            },
            Placeholder   : ConfigLoader.VghLantern__ConfigLoader__RequireString(
                config, isCritical ? 'CriticalPlaceholder' : 'SpecialPlaceholder', TERMS_LABEL),
            MaxCharacters : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(config, 'MaxTermCharacters', TERMS_LABEL),
            AddLabel      : ConfigLoader.VghLantern__ConfigLoader__RequireString(
                config, isCritical ? 'AddCriticalLabel' : 'AddSpecialLabel', TERMS_LABEL),
            ResetLabel    : '',
            DeleteLabel   : 'Delete',
            AllowReset    : false,
            IsCritical    : isCritical,
            EmptyMessage  : isCritical ? 'No critical terms on this project.' : 'No special terms on this project.'
        }, cards);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build the Standard Section Switch List
    // ------------------------------------------------------------
    // Counts come from the loaded library so a switch reads "9 terms" rather than
    // being a switch for something the user cannot see. A section whose file failed
    // to load says so on its row rather than reading as an empty section.
    function VghLantern__TermsEditor__BuildSectionToggles() {
        var ConfigLoader   =  window.VghLantern__AppCore__ConfigLoader;
        var DocumentModel  =  window.VghLantern__Terms__DocumentModel;
        var Loader         =  window.VghLantern__Terms__MarkdownLoader;
        var project        =  VghLantern__TermsEditor__Project();
        if (!DocumentModel) return '';

        var sections  =  DocumentModel.VghLantern__Terms__DocumentModel__ListSections();
        var html      =  '<div class="' + CSS_TOGGLE_LIST + '">';
        var i, section, isEnabled, didFail, count, rowClass, countLabel;

        for (i = 0; i < sections.length; i++) {
            section  =  sections[i];
            if (section.Source !== 'library') continue;                        // <-- Project terms are switched by having terms, not by a checkbox

            isEnabled  =  DocumentModel.VghLantern__Terms__DocumentModel__IsSectionEnabled(project, section.Key);
            didFail    =  Loader ? Loader.VghLantern__Terms__MarkdownLoader__DidFileFail(section.SourceFile) : true;
            count      =  Loader ? Loader.VghLantern__Terms__MarkdownLoader__ClausesFor(section.SourceFile).length : 0;

            rowClass    =  CSS_TOGGLE + (didFail ? ' ' + CSS_TOGGLE_FAIL : '');
            countLabel  =  didFail ? 'file not found' : (count + (count === 1 ? ' term' : ' terms'));

            html  +=  '<label class="' + rowClass + '">' +
                      '<input type="checkbox" ' + ATTR_SECTION_KEY + '="' +
                      VghLantern__TermsEditor__Escape(section.Key) + '"' + (isEnabled ? ' checked' : '') + '>' +
                      '<span class="' + CSS_TOGGLE_NUM + '">' + VghLantern__TermsEditor__Escape(section.Number) + '</span>' +
                      '<span class="' + CSS_TOGGLE_LABEL + '">' + VghLantern__TermsEditor__Escape(section.Label) + '</span>' +
                      '<span class="' + CSS_TOGGLE_COUNT + '">' + VghLantern__TermsEditor__Escape(countLabel) + '</span>' +
                      '</label>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Whole Terms Editing Panel
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__TermsEditor__BuildHtml() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__TermsEditor__Config();
        if (!VghLantern__TermsEditor__Project()) return '';

        // HELPER | One titled panel with its helper line and body
        function panel(titleKey, helperKey, bodyHtml, extraClass) {
            return '<section class="' + CSS_PANEL + (extraClass ? ' ' + extraClass : '') + '">' +
                   '<h3 class="' + CSS_PANEL_TITLE + '">' +
                   VghLantern__TermsEditor__Escape(
                       ConfigLoader.VghLantern__ConfigLoader__RequireString(config, titleKey, TERMS_LABEL)) +
                   '</h3>' +
                   '<p class="' + CSS_HELPER + '">' +
                   VghLantern__TermsEditor__Escape(
                       ConfigLoader.VghLantern__ConfigLoader__RequireString(config, helperKey, TERMS_LABEL)) +
                   '</p>' + bodyHtml + '</section>';
        }

        return panel('CriticalTitle', 'CriticalHelperText',
                     VghLantern__TermsEditor__BuildTermList(PANEL_CRITICAL, true), CSS_PANEL_CRIT) +
               panel('SpecialTitle', 'SpecialHelperText',
                     VghLantern__TermsEditor__BuildTermList(PANEL_SPECIAL, false), '') +
               panel('StandardTitle', 'StandardHelperText',
                     VghLantern__TermsEditor__BuildSectionToggles(), '');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Handling
// -----------------------------------------------------------------------------

    // FUNCTION | Report Whether a Panel Key Belongs to This Editor
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__TermsEditor__OwnsPanel(panelKey) {
        return panelKey === PANEL_CRITICAL || panelKey === PANEL_SPECIAL;
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle a Text Input Event From a Terms Panel
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__TermsEditor__HandleInput(target) {
        var BlockEditor  =  window.VghLantern__ClientDoc__BlockEditor;
        if (!target || !BlockEditor) return false;

        var panelKey  =  target.getAttribute
            ? target.getAttribute(BlockEditor.VghLantern__ClientDoc__BlockEditor__PanelAttribute)
            : null;
        if (!VghLantern__ClientDoc__TermsEditor__OwnsPanel(panelKey)) return false;

        var termId  =  target.getAttribute(BlockEditor.VghLantern__ClientDoc__BlockEditor__BlockIdAttribute);
        if (!termId) return false;

        BlockEditor.VghLantern__ClientDoc__BlockEditor__AutoGrow(target);
        VghLantern__TermsEditor__QueueWrite(panelKey, termId, target.value);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle a Button Action From a Terms Panel
    // ------------------------------------------------------------
    // Returns true when the panel needs a full redraw, which every structural change
    // does because the cards below the change all renumber.
    function VghLantern__ClientDoc__TermsEditor__HandleAction(panelKey, action, termId) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var project       =  VghLantern__TermsEditor__Project();
        if (!project || !VghLantern__ClientDoc__TermsEditor__OwnsPanel(panelKey)) return false;

        VghLantern__ClientDoc__TermsEditor__Flush();

        var list  =  VghLantern__TermsEditor__ReadList(project, panelKey);
        var i;

        if (action === 'add') {
            var maxTerms  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
                VghLantern__TermsEditor__Config(), 'MaxTermsPerSection', TERMS_LABEL);
            if (list.length >= maxTerms) return false;

            VghLantern__TermsEditor__IdCounter++;
            list.push({
                Id   : 'trm_' + Date.now().toString(36) + '_' + VghLantern__TermsEditor__IdCounter,
                Text : ''
            });
            VghLantern__TermsEditor__MarkDirty();
            return true;
        }

        if (action === 'delete') {
            for (i = 0; i < list.length; i++) {
                if (list[i].Id !== termId) continue;
                list.splice(i, 1);
                VghLantern__TermsEditor__MarkDirty();
                return true;
            }
        }

        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle a Card Reorder Within a Terms Panel
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__TermsEditor__HandleReorder(panelKey, termId, targetIndex) {
        var project  =  VghLantern__TermsEditor__Project();
        if (!project || !VghLantern__ClientDoc__TermsEditor__OwnsPanel(panelKey)) return false;

        VghLantern__ClientDoc__TermsEditor__Flush();

        var list   =  VghLantern__TermsEditor__ReadList(project, panelKey);
        var index  =  -1;
        var i;

        for (i = 0; i < list.length; i++) {
            if (list[i].Id === termId) { index  =  i; break; }
        }
        if (index < 0) return false;

        var bounded  =  Math.max(0, Math.min(list.length - 1, targetIndex));
        if (bounded === index) return false;

        list.splice(bounded, 0, list.splice(index, 1)[0]);
        VghLantern__TermsEditor__MarkDirty();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle a Standard Section Switch
    // ------------------------------------------------------------
    // Routed through the terms model rather than written here, so this and the
    // Preview and Send toolbar are the same write.
    function VghLantern__ClientDoc__TermsEditor__HandleSectionToggle(target) {
        var DocumentModel  =  window.VghLantern__Terms__DocumentModel;
        var project        =  VghLantern__TermsEditor__Project();
        if (!DocumentModel || !project || !target || !target.getAttribute) return false;

        var sectionKey  =  target.getAttribute(ATTR_SECTION_KEY);
        if (!sectionKey) return false;

        DocumentModel.VghLantern__Terms__DocumentModel__SetSectionEnabled(project, sectionKey, !!target.checked);
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ClientDoc__TermsEditor__PanelCritical        : PANEL_CRITICAL,
        VghLantern__ClientDoc__TermsEditor__PanelSpecial         : PANEL_SPECIAL,
        VghLantern__ClientDoc__TermsEditor__SectionKeyAttribute  : ATTR_SECTION_KEY,

        VghLantern__ClientDoc__TermsEditor__BuildHtml            : VghLantern__ClientDoc__TermsEditor__BuildHtml,
        VghLantern__ClientDoc__TermsEditor__OwnsPanel            : VghLantern__ClientDoc__TermsEditor__OwnsPanel,
        VghLantern__ClientDoc__TermsEditor__HandleInput          : VghLantern__ClientDoc__TermsEditor__HandleInput,
        VghLantern__ClientDoc__TermsEditor__HandleAction         : VghLantern__ClientDoc__TermsEditor__HandleAction,
        VghLantern__ClientDoc__TermsEditor__HandleReorder        : VghLantern__ClientDoc__TermsEditor__HandleReorder,
        VghLantern__ClientDoc__TermsEditor__HandleSectionToggle  : VghLantern__ClientDoc__TermsEditor__HandleSectionToggle,
        VghLantern__ClientDoc__TermsEditor__Flush                : VghLantern__ClientDoc__TermsEditor__Flush
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__ClientDoc__TermsEditor  =  VghLantern__ClientDoc__TermsEditor;
