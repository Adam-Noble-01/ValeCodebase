/* =============================================================================
   VGHLANTERN - CLIENT DOC | DRAWING NOTES EDITOR
   =============================================================================

   FILE       : VghLantern__ClientDoc__DrawingNotesEditor__.js
   NAMESPACE  : VghLantern
   MODULE     : System - ClientDocumentMode - DrawingNotesEditor
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Edit the drawing notes carried by each lantern in a project
   CREATED    : 06-Aug-2026

   DESCRIPTION:
   - One block list per lantern, selected by a tab strip, writing to that lantern's
     Lantern__DrawingNotes__Config block.
   - Owns the authoring of those notes and nothing else. It does not decide whether a
     lantern's notes page appears in the issued pack - that is answered by whether the
     lantern has any - and it does not number them, which is the terms document model.
   - Uses the same BlockEditor card list, the same debounce and the same dirty-marking
     path as the terms editor beside it, because a drawing note and a project term are
     the same kind of object edited in the same way.

   -----------------------------------------------------------------------------

   WHY THE NOTES LIVE ON THE LANTERN RATHER THAN ON THE CLIENT DOCUMENT BLOCK:
   Every other authored field in this mode belongs to the project, so the obvious home
   was a map on VghLantern__ProjectFile__ClientDocument keyed by lantern index. That
   map would then have to be resequenced every time a lantern was added, removed or
   reordered, and any place that missed the resequencing would attach the Kitchen notes
   to the Dining Room drawing. Holding them on the lantern means they travel with it,
   the way its sheet setup already does, and there is no index to keep in step.

   WHY THE TAB STRIP IS NOT A SECOND SELECTION:
   The tab here is a local view state, deliberately not the application's active
   lantern. Writing notes about the Kitchen drawing while the 3D viewport and the
   Lantern Editor are on the Dining Room is a normal thing to do, and switching the
   whole application under someone editing a paragraph would be an unwelcome surprise.

   ============================================================================= */

// =============================================================================
// REGION | Client Document Drawing Notes Editor Module
// =============================================================================

const VghLantern__ClientDoc__DrawingNotesEditor = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Panel Key Prefix
    // ------------------------------------------------------------
    // The panel key carries the lantern index, because BlockEditor identifies a list
    // by one string and this editor owns one list per lantern.
    const PANEL_PREFIX  =  'drawingNotes:';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | CSS Class Names
    // ------------------------------------------------------------
    const CSS_PANEL        =  'VghLantern__ClientDoc__Panel';
    const CSS_PANEL_TITLE  =  'VghLantern__ClientDoc__PanelTitle';
    const CSS_HELPER       =  'VghLantern__ClientDoc__Helper';
    const CSS_TABS         =  'VghLantern__ClientDoc__LanternTabs';
    const CSS_TAB          =  'VghLantern__ClientDoc__LanternTab';
    const CSS_TAB_ACTIVE   =  'VghLantern__ClientDoc__LanternTab--active';
    const CSS_TAB_COUNT    =  'VghLantern__ClientDoc__LanternTabCount';
    const CSS_EMPTY        =  'VghLantern__ClientDoc__EmptyState';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Data Attributes and Data Keys
    // ------------------------------------------------------------
    const ATTR_LANTERN_TAB  =  'data-vgh-drawing-notes-tab';

    const PROJECT_LANTERNS  =  'VghLantern__ProjectFile__Lanterns';
    const NOTES_BLOCK       =  'Lantern__DrawingNotes__Config';
    const NOTES_FIELD       =  'Lantern__DrawingNotes__Config__Notes';
    const IDENTITY_BLOCK    =  'Lantern__Identity__Config';
    const IDENTITY_TITLE    =  'Lantern__Identity__Config__Title';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Labels
    // ------------------------------------------------------------
    const NOTES_LABEL   =  'Na__ClientDocument__Config.json -> VghLantern__ClientDocument__Config__DrawingNotes';
    const LETTER_LABEL  =  'Na__ClientDocument__Config.json -> VghLantern__ClientDocument__Config__Letter';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Pending Write State, Identity Counter and Tab Selection
    // ------------------------------------------------------------
    let VghLantern__DrawingNotes__WriteTimerId   =  null;
    let VghLantern__DrawingNotes__PendingWrite   =  null;
    let VghLantern__DrawingNotes__IdCounter      =  0;
    let VghLantern__DrawingNotes__ActiveIndex    =  0;                         // <-- Which lantern's notes are on show, local to this panel
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config and State Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Drawing Notes Config Block
    // ------------------------------------------------------------
    function VghLantern__DrawingNotes__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var clientCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('ClientDocument') || {};
        return clientCfg['VghLantern__ClientDocument__Config__DrawingNotes'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get the Current Project
    // ------------------------------------------------------------
    function VghLantern__DrawingNotes__Project() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        return StateManager ? StateManager.VghLantern__StateManager__GetCurrentProject() : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Project's Lantern Schedule
    // ------------------------------------------------------------
    function VghLantern__DrawingNotes__Lanterns() {
        var project  =  VghLantern__DrawingNotes__Project();
        return (project && Array.isArray(project[PROJECT_LANTERNS])) ? project[PROJECT_LANTERNS] : [];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__DrawingNotes__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve a Lantern's Display Title
    // ------------------------------------------------------------
    // The same fallback the editor tab strip and the Drawing Editor selector use, so
    // an untitled lantern is called the same thing everywhere.
    function VghLantern__DrawingNotes__LanternLabel(lantern, index) {
        var identity  =  (lantern && lantern[IDENTITY_BLOCK]) || {};
        return identity[IDENTITY_TITLE] || ('Lantern ' + (index + 1));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Lantern Index Out of a Panel Key
    // ------------------------------------------------------------
    // Returns -1 for a panel this editor does not own, which is what OwnsPanel is
    // built on - one parse, rather than a prefix test and a separate parse that could
    // disagree about a malformed key.
    function VghLantern__DrawingNotes__IndexFromPanel(panelKey) {
        if (typeof panelKey !== 'string' || panelKey.indexOf(PANEL_PREFIX) !== 0) return -1;

        var index  =  parseInt(panelKey.slice(PANEL_PREFIX.length), 10);
        if (isNaN(index) || index < 0) return -1;

        return (index < VghLantern__DrawingNotes__Lanterns().length) ? index : -1;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read One Lantern's Note List, Creating It If Absent
    // ------------------------------------------------------------
    function VghLantern__DrawingNotes__ReadList(lanternIndex) {
        var lanterns  =  VghLantern__DrawingNotes__Lanterns();
        var lantern   =  lanterns[lanternIndex];
        if (!lantern) return [];

        if (!lantern[NOTES_BLOCK] || typeof lantern[NOTES_BLOCK] !== 'object') lantern[NOTES_BLOCK]  =  {};
        if (!Array.isArray(lantern[NOTES_BLOCK][NOTES_FIELD])) lantern[NOTES_BLOCK][NOTES_FIELD]  =  [];

        return lantern[NOTES_BLOCK][NOTES_FIELD];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mark the Project Dirty So Autosave Persists It
    // ------------------------------------------------------------
    function VghLantern__DrawingNotes__MarkDirty() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (StateManager) StateManager.VghLantern__StateManager__MarkDirty();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp the Tab Selection to the Current Schedule
    // ------------------------------------------------------------
    // A lantern deleted from under the panel would otherwise leave the tab pointing
    // past the end of the schedule and the list rendering empty for no visible reason.
    function VghLantern__DrawingNotes__ClampActiveIndex() {
        var count  =  VghLantern__DrawingNotes__Lanterns().length;

        if (VghLantern__DrawingNotes__ActiveIndex >= count) VghLantern__DrawingNotes__ActiveIndex  =  Math.max(0, count - 1);
        if (VghLantern__DrawingNotes__ActiveIndex < 0)      VghLantern__DrawingNotes__ActiveIndex  =  0;

        return VghLantern__DrawingNotes__ActiveIndex;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Debounced Writing
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Apply One Pending Note Text Write
    // ------------------------------------------------------------
    function VghLantern__DrawingNotes__ApplyWrite(pending) {
        if (!pending) return;

        var list  =  VghLantern__DrawingNotes__ReadList(pending.LanternIndex);
        var i;

        for (i = 0; i < list.length; i++) {
            if (list[i].Id !== pending.NoteId) continue;
            if (list[i].Text === pending.Value) return;                        // <-- Nothing changed; do not dirty the project

            list[i].Text  =  String(pending.Value);
            VghLantern__DrawingNotes__MarkDirty();
            return;
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Queue a Debounced Note Text Write
    // ------------------------------------------------------------
    // Debounce interval shared with the letter and the terms, because they are three
    // textareas in one column and a different lag on each would feel like a fault.
    function VghLantern__DrawingNotes__QueueWrite(lanternIndex, noteId, value) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var clientCfg     =  ConfigLoader.VghLantern__ConfigLoader__GetSection('ClientDocument') || {};
        var letterCfg     =  clientCfg['VghLantern__ClientDocument__Config__Letter'] || {};

        if (VghLantern__DrawingNotes__PendingWrite &&
            (VghLantern__DrawingNotes__PendingWrite.LanternIndex !== lanternIndex ||
             VghLantern__DrawingNotes__PendingWrite.NoteId       !== noteId)) {
            VghLantern__DrawingNotes__ApplyWrite(VghLantern__DrawingNotes__PendingWrite);
        }

        VghLantern__DrawingNotes__PendingWrite  =  { LanternIndex : lanternIndex, NoteId : noteId, Value : value };

        if (VghLantern__DrawingNotes__WriteTimerId !== null) {
            clearTimeout(VghLantern__DrawingNotes__WriteTimerId);
        }

        VghLantern__DrawingNotes__WriteTimerId  =  setTimeout(function() {
            VghLantern__DrawingNotes__WriteTimerId  =  null;
            var pending  =  VghLantern__DrawingNotes__PendingWrite;
            VghLantern__DrawingNotes__PendingWrite  =  null;

            VghLantern__DrawingNotes__ApplyWrite(pending);

            var Layout  =  window.VghLantern__ClientDoc__Layout;
            if (Layout && Layout.VghLantern__ClientDoc__Layout__RefreshPreview) {
                Layout.VghLantern__ClientDoc__Layout__RefreshPreview();
            }
        }, ConfigLoader.VghLantern__ConfigLoader__RequireNumber(letterCfg, 'AutosaveDebounceMs', LETTER_LABEL));
    }
    // ------------------------------------------------------------


    // FUNCTION | Flush Any Pending Note Write Immediately
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__DrawingNotesEditor__Flush() {
        if (VghLantern__DrawingNotes__WriteTimerId !== null) {
            clearTimeout(VghLantern__DrawingNotes__WriteTimerId);
            VghLantern__DrawingNotes__WriteTimerId  =  null;
        }

        if (!VghLantern__DrawingNotes__PendingWrite) return;

        var pending  =  VghLantern__DrawingNotes__PendingWrite;
        VghLantern__DrawingNotes__PendingWrite  =  null;
        VghLantern__DrawingNotes__ApplyWrite(pending);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Build the Lantern Tab Strip
    // ------------------------------------------------------------
    // Each tab carries its note count, so a pack can be checked at a glance without
    // opening every tab to find the lantern nobody wrote anything for. Hidden on a
    // single-lantern project, where it would be one tab that does nothing.
    function VghLantern__DrawingNotes__BuildTabs(lanterns, activeIndex) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__DrawingNotes__Config();
        if (lanterns.length < 2) return '';

        var singular  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'TabCountSuffixSingular', NOTES_LABEL);
        var plural    =  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'TabCountSuffixPlural',   NOTES_LABEL);

        var html  =  '<div class="' + CSS_TABS + '">';
        var i, count, tabClass;

        for (i = 0; i < lanterns.length; i++) {
            count     =  VghLantern__DrawingNotes__ReadList(i).length;
            tabClass  =  CSS_TAB + (i === activeIndex ? ' ' + CSS_TAB_ACTIVE : '');

            html  +=  '<button type="button" class="' + tabClass + '" ' + ATTR_LANTERN_TAB + '="' + i + '">' +
                      VghLantern__DrawingNotes__Escape(VghLantern__DrawingNotes__LanternLabel(lanterns[i], i)) +
                      '<span class="' + CSS_TAB_COUNT + '">' +
                      VghLantern__DrawingNotes__Escape(count + ' ' + (count === 1 ? singular : plural)) +
                      '</span></button>';
        }

        return html + '</div>';
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build One Lantern's Note Block List
    // ------------------------------------------------------------
    // Cards are labelled with the number the terms document model will print on them,
    // for the same reason the terms cards are: a note is cited against a drawing, and
    // seeing the citation on the card being typed into is what makes that real.
    function VghLantern__DrawingNotes__BuildNoteList(lanternIndex) {
        var ConfigLoader   =  window.VghLantern__AppCore__ConfigLoader;
        var BlockEditor    =  window.VghLantern__ClientDoc__BlockEditor;
        var DocumentModel  =  window.VghLantern__Terms__DocumentModel;
        var config         =  VghLantern__DrawingNotes__Config();
        if (!BlockEditor) return '';

        var sectionNumber  =  VghLantern__DrawingNotes__SectionNumber();

        var cards  =  VghLantern__DrawingNotes__ReadList(lanternIndex).map(function(entry) {
            return { Id : entry.Id, Text : entry.Text, CanReset : false };
        });

        return BlockEditor.VghLantern__ClientDoc__BlockEditor__BuildList({
            PanelKey      : PANEL_PREFIX + lanternIndex,
            ItemLabel     : 'Note',
            LabelForIndex : function(index) {
                return DocumentModel
                    ? DocumentModel.VghLantern__Terms__DocumentModel__FormatNumber(sectionNumber, index + 1)
                    : String(index + 1);
            },
            Placeholder   : ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'Placeholder', NOTES_LABEL),
            MaxCharacters : ConfigLoader.VghLantern__ConfigLoader__RequireNumber(config, 'MaxNoteCharacters', NOTES_LABEL),
            AddLabel      : ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'AddLabel', NOTES_LABEL),
            ResetLabel    : '',
            DeleteLabel   : 'Delete',
            AllowReset    : false,
            IsCritical    : false,
            EmptyMessage  : ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'EmptyMessage', NOTES_LABEL)
        }, cards);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Resolve the Section Number a Lantern's Notes Carry
    // ------------------------------------------------------------
    // Read from the drawing terms config rather than assumed, so moving the number in
    // JSON moves the labels in the editor with it.
    function VghLantern__DrawingNotes__SectionNumber() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return 1;

        var termsCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Terms') || {};
        var drawing   =  termsCfg['VghLantern__Terms__Config__DrawingTermsDocument'] || {};

        return ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            drawing, 'LanternSectionNumber',
            'Na__Terms__Config.json -> VghLantern__Terms__Config__DrawingTermsDocument');
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Whole Drawing Notes Panel
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__DrawingNotesEditor__BuildHtml() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config        =  VghLantern__DrawingNotes__Config();
        if (!VghLantern__DrawingNotes__Project()) return '';

        var lanterns     =  VghLantern__DrawingNotes__Lanterns();
        var activeIndex  =  VghLantern__DrawingNotes__ClampActiveIndex();

        var header  =  '<section class="' + CSS_PANEL + '">' +
                       '<h3 class="' + CSS_PANEL_TITLE + '">' +
                       VghLantern__DrawingNotes__Escape(
                           ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'PanelTitle', NOTES_LABEL)) +
                       '</h3>' +
                       '<p class="' + CSS_HELPER + '">' +
                       VghLantern__DrawingNotes__Escape(
                           ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'HelperText', NOTES_LABEL)) +
                       '</p>';

        if (!lanterns.length) {
            return header + '<p class="' + CSS_EMPTY + '">' +
                   VghLantern__DrawingNotes__Escape(
                       ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'NoLanternsMessage', NOTES_LABEL)) +
                   '</p></section>';
        }

        return header +
               VghLantern__DrawingNotes__BuildTabs(lanterns, activeIndex) +
               VghLantern__DrawingNotes__BuildNoteList(activeIndex) +
               '</section>';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Handling
// -----------------------------------------------------------------------------

    // FUNCTION | Report Whether a Panel Key Belongs to This Editor
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__DrawingNotesEditor__OwnsPanel(panelKey) {
        return VghLantern__DrawingNotes__IndexFromPanel(panelKey) >= 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle a Text Input Event From a Notes Panel
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__DrawingNotesEditor__HandleInput(target) {
        var BlockEditor  =  window.VghLantern__ClientDoc__BlockEditor;
        if (!target || !BlockEditor) return false;

        var panelKey  =  target.getAttribute
            ? target.getAttribute(BlockEditor.VghLantern__ClientDoc__BlockEditor__PanelAttribute)
            : null;

        var lanternIndex  =  VghLantern__DrawingNotes__IndexFromPanel(panelKey);
        if (lanternIndex < 0) return false;

        var noteId  =  target.getAttribute(BlockEditor.VghLantern__ClientDoc__BlockEditor__BlockIdAttribute);
        if (!noteId) return false;

        BlockEditor.VghLantern__ClientDoc__BlockEditor__AutoGrow(target);
        VghLantern__DrawingNotes__QueueWrite(lanternIndex, noteId, target.value);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle a Button Action From a Notes Panel
    // ------------------------------------------------------------
    // Returns true when the panel needs a full redraw, which every structural change
    // does because the cards below the change all renumber.
    function VghLantern__ClientDoc__DrawingNotesEditor__HandleAction(panelKey, action, noteId) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var lanternIndex  =  VghLantern__DrawingNotes__IndexFromPanel(panelKey);
        if (lanternIndex < 0) return false;

        VghLantern__ClientDoc__DrawingNotesEditor__Flush();

        var list  =  VghLantern__DrawingNotes__ReadList(lanternIndex);
        var i;

        if (action === 'add') {
            var maxNotes  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
                VghLantern__DrawingNotes__Config(), 'MaxNotesPerLantern', NOTES_LABEL);
            if (list.length >= maxNotes) return false;

            VghLantern__DrawingNotes__IdCounter++;
            list.push({
                Id   : 'dnt_' + Date.now().toString(36) + '_' + VghLantern__DrawingNotes__IdCounter,
                Text : ''
            });
            VghLantern__DrawingNotes__MarkDirty();
            return true;
        }

        if (action === 'delete') {
            for (i = 0; i < list.length; i++) {
                if (list[i].Id !== noteId) continue;
                list.splice(i, 1);
                VghLantern__DrawingNotes__MarkDirty();
                return true;
            }
        }

        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle a Card Reorder Within a Notes Panel
    // ------------------------------------------------------------
    function VghLantern__ClientDoc__DrawingNotesEditor__HandleReorder(panelKey, noteId, targetIndex) {
        var lanternIndex  =  VghLantern__DrawingNotes__IndexFromPanel(panelKey);
        if (lanternIndex < 0) return false;

        VghLantern__ClientDoc__DrawingNotesEditor__Flush();

        var list   =  VghLantern__DrawingNotes__ReadList(lanternIndex);
        var index  =  -1;
        var i;

        for (i = 0; i < list.length; i++) {
            if (list[i].Id === noteId) { index  =  i; break; }
        }
        if (index < 0) return false;

        var bounded  =  Math.max(0, Math.min(list.length - 1, targetIndex));
        if (bounded === index) return false;

        list.splice(bounded, 0, list.splice(index, 1)[0]);
        VghLantern__DrawingNotes__MarkDirty();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle a Lantern Tab Click
    // ------------------------------------------------------------
    // Returns true when the tab changed, which the layout answers with a redraw. The
    // pending write is flushed first: a part-typed note must not be lost because
    // someone clicked across to check another lantern.
    function VghLantern__ClientDoc__DrawingNotesEditor__HandleTabClick(target) {
        if (!target || !target.getAttribute) return false;

        var raw  =  target.getAttribute(ATTR_LANTERN_TAB);
        if (raw === null) return false;

        var index  =  parseInt(raw, 10);
        if (isNaN(index) || index === VghLantern__DrawingNotes__ActiveIndex) return false;
        if (index < 0 || index >= VghLantern__DrawingNotes__Lanterns().length) return false;

        VghLantern__ClientDoc__DrawingNotesEditor__Flush();
        VghLantern__DrawingNotes__ActiveIndex  =  index;
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report the Attribute Marking a Lantern Tab
    // ------------------------------------------------------------
    // Exposed so the layout's delegated listener can find a tab without holding its
    // own copy of the attribute name.
    function VghLantern__ClientDoc__DrawingNotesEditor__TabAttribute() {
        return ATTR_LANTERN_TAB;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ClientDoc__DrawingNotesEditor__BuildHtml      : VghLantern__ClientDoc__DrawingNotesEditor__BuildHtml,
        VghLantern__ClientDoc__DrawingNotesEditor__OwnsPanel      : VghLantern__ClientDoc__DrawingNotesEditor__OwnsPanel,
        VghLantern__ClientDoc__DrawingNotesEditor__HandleInput    : VghLantern__ClientDoc__DrawingNotesEditor__HandleInput,
        VghLantern__ClientDoc__DrawingNotesEditor__HandleAction   : VghLantern__ClientDoc__DrawingNotesEditor__HandleAction,
        VghLantern__ClientDoc__DrawingNotesEditor__HandleReorder  : VghLantern__ClientDoc__DrawingNotesEditor__HandleReorder,
        VghLantern__ClientDoc__DrawingNotesEditor__HandleTabClick : VghLantern__ClientDoc__DrawingNotesEditor__HandleTabClick,
        VghLantern__ClientDoc__DrawingNotesEditor__TabAttribute   : VghLantern__ClientDoc__DrawingNotesEditor__TabAttribute,
        VghLantern__ClientDoc__DrawingNotesEditor__Flush          : VghLantern__ClientDoc__DrawingNotesEditor__Flush
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__ClientDoc__DrawingNotesEditor  =  VghLantern__ClientDoc__DrawingNotesEditor;
