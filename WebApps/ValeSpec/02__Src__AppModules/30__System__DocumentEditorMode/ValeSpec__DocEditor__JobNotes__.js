/* =============================================================================
   VALESPEC - DOCUMENT EDITOR JOB NOTES
   =============================================================================

   FILE       : ValeSpec__DocEditor__JobNotes__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocEditor - JobNotes
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render and manage editable job notes textarea in Document Editor
   CREATED    : 2026

   DESCRIPTION:
   - Renders editable textarea into #ValeSpec__DocEditor__JobNotesContainer
   - Auto-saves to project GlobalSettings JobNotes field on change (debounced)
   - Debounce delay prevents excessive state writes during typing

   ============================================================================= */

// =============================================================================
// REGION | Job Notes Module
// =============================================================================

const ValeSpec__DocEditor__JobNotes = (function() {

    // MODULE CONSTANTS | DOM Target ID and Debounce Delay
    // ------------------------------------------------------------
    const CONTAINER_ID    =  'ValeSpec__DocEditor__JobNotesContainer';
    const DEBOUNCE_MS     =  500;                                                 // <-- Auto-save delay in milliseconds
    // ------------------------------------------------------------


    // MODULE VARIABLES | Debounce Timer Reference
    // ------------------------------------------------------------
    let _debounceTimer  =  null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Job Notes from Project State
    // ------------------------------------------------------------
    function _getJobNotes() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return '';
        var state    =  StateManager.getState();
        var project  =  state.currentProject;
        if (!project) return '';
        var globalSettings  =  project['ValeSpec__ProjectFile__GlobalSettings'] || {};
        return globalSettings['ValeSpec__ProjectFile__GlobalSettings__JobNotes'] || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Save Job Notes to Project State
    // ------------------------------------------------------------
    function _saveJobNotes(text) {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var state    =  StateManager.getState();
        var project  =  state.currentProject;
        if (!project) return;

        var globalSettings  =  project['ValeSpec__ProjectFile__GlobalSettings'] || {};
        globalSettings['ValeSpec__ProjectFile__GlobalSettings__JobNotes']  =  text;
        project['ValeSpec__ProjectFile__GlobalSettings']  =  globalSettings;

        StateManager.markDirty();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Job Notes HTML
    // ------------------------------------------------------------
    function _buildNotesHtml(notesText) {
        var escaped  =  notesText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        var html  =  '<label class="ValeSpec__DocEditor__JobNotesLabel">Job Notes</label>';
        html     +=  '<textarea class="ValeSpec__DocEditor__JobNotesTextarea" id="ValeSpec__DocEditor__NotesTextarea"';
        html     +=  ' placeholder="Enter job-specific notes, site instructions, or special requirements...">';
        html     +=  escaped;
        html     +=  '</textarea>';
        return html;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Bind Textarea Change Events with Debounce
    // ------------------------------------------------------------
    function _bindEvents() {
        var textarea  =  document.getElementById('ValeSpec__DocEditor__NotesTextarea');
        if (!textarea) return;

        textarea.addEventListener('input', function() {
            clearTimeout(_debounceTimer);
            _debounceTimer  =  setTimeout(function() {
                _saveJobNotes(textarea.value);                                    // <-- Debounced auto-save on input
            }, DEBOUNCE_MS);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Render Job Notes Textarea into DOM
    // ------------------------------------------------------------
    function render() {
        var container  =  document.getElementById(CONTAINER_ID);
        if (!container) {
            console.warn('[ValeSpec__JobNotes] Container not found: #' + CONTAINER_ID);
            return;
        }

        var notesText  =  _getJobNotes();
        container.innerHTML  =  _buildNotesHtml(notesText);
        _bindEvents();
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        render  : render
    };

})();

// endregion ===================================================================

window.ValeSpec__DocEditor__JobNotes  =  ValeSpec__DocEditor__JobNotes;
