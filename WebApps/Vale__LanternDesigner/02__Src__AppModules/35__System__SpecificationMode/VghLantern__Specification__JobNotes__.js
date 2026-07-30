/* =============================================================================
   VGHLANTERN - SPECIFICATION | JOB NOTES
   =============================================================================

   FILE       : VghLantern__Specification__JobNotes__.js
   NAMESPACE  : VghLantern
   MODULE     : System - Specification - JobNotes
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Edit the free-text job notes carried on the project file
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Renders the job notes editor and writes edits back into the project's global
     settings block.
   - The notes are the ONLY hand-entered content on the specification document;
     everything else is derived from geometry. That distinction is deliberate.
   - Writes are debounced and flow through StateManager MarkDirty, which the AppCore
     autosave path already listens to, so notes persist without a save button.

   -----------------------------------------------------------------------------

   WHY NOTES LIVE ON THE PROJECT RATHER THAN PER LANTERN:
   Notes are instructions to the workshop about the job - access, sequencing, site
   constraints. Attaching them to a lantern would mean a two-lantern job either
   duplicates them or hides half of them. They also print on every drawing sheet,
   which only makes sense project-wide.

   ============================================================================= */

// =============================================================================
// REGION | Specification Job Notes Module
// =============================================================================

const VghLantern__Specification__JobNotes = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | DOM, CSS and Project Keys
    // ------------------------------------------------------------
    const DOM_HOST        =  'VghLantern__Specification__JobNotesContainer';
    const DOM_TEXTAREA    =  'VghLantern__Specification__JobNotesInput';

    const CSS_BLOCK       =  'VghLantern__Spec__JobNotes';
    const CSS_LABEL       =  'VghLantern__Spec__JobNotesLabel';
    const CSS_TEXTAREA    =  'VghLantern__Spec__JobNotesInput';
    const CSS_HELPER      =  'VghLantern__Spec__JobNotesHelper';
    const CSS_COUNTER     =  'VghLantern__Spec__JobNotesCounter';
    const CSS_STATIC      =  'VghLantern__Spec__JobNotesStatic';                // <-- Read-only rendering used by the printed document

    const GLOBALS_BLOCK   =  'VghLantern__ProjectFile__GlobalSettings';
    const NOTES_FIELD     =  'VghLantern__ProjectFile__GlobalSettings__JobNotes';

    const FALLBACK_MAX    =  2000;
    const FALLBACK_DEBOUNCE_MS  =  900;
    // ------------------------------------------------------------


    // MODULE VARIABLES | Pending Write State
    // ------------------------------------------------------------
    let VghLantern__JobNotes__WriteTimerId  =  null;
    let VghLantern__JobNotes__IsBound       =  false;                         // <-- Delegated input listener attaches once
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Job Notes Config Block
    // ------------------------------------------------------------
    function VghLantern__JobNotes__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var specCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('Specification') || {};
        return specCfg['VghLantern__Specification__Config__JobNotes'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__JobNotes__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read the Notes Currently on the Project
    // ------------------------------------------------------------
    function VghLantern__JobNotes__ReadNotes() {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return '';

        var project  =  StateManager.VghLantern__StateManager__GetCurrentProject();
        var globals  =  (project && project[GLOBALS_BLOCK]) || {};

        return globals[NOTES_FIELD] || '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Persistence
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Write the Notes Onto the Project and Mark It Dirty
    // ------------------------------------------------------------
    // Writes into the live project object rather than replacing it, so an in-flight
    // lantern edit elsewhere in the app cannot be clobbered by a notes save.
    function VghLantern__JobNotes__CommitNotes(noteText) {
        var StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return;

        var project  =  StateManager.VghLantern__StateManager__GetCurrentProject();
        if (!project) return;

        if (!project[GLOBALS_BLOCK]) project[GLOBALS_BLOCK]  =  {};
        if (project[GLOBALS_BLOCK][NOTES_FIELD] === noteText) return;          // <-- Nothing changed; do not dirty the project

        project[GLOBALS_BLOCK][NOTES_FIELD]  =  noteText;
        StateManager.VghLantern__StateManager__MarkDirty();                    // <-- AppCore autosave listens for this
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Queue a Debounced Notes Write
    // ------------------------------------------------------------
    function VghLantern__JobNotes__QueueCommit(noteText) {
        var debounceMs  =  VghLantern__JobNotes__Config().AutosaveDebounceMs;
        if (typeof debounceMs !== 'number') debounceMs  =  FALLBACK_DEBOUNCE_MS;

        if (VghLantern__JobNotes__WriteTimerId !== null) clearTimeout(VghLantern__JobNotes__WriteTimerId);

        VghLantern__JobNotes__WriteTimerId  =  setTimeout(function() {
            VghLantern__JobNotes__WriteTimerId  =  null;
            VghLantern__JobNotes__CommitNotes(noteText);
        }, debounceMs);
    }
    // ------------------------------------------------------------


    // FUNCTION | Flush Any Pending Notes Write Immediately
    // ------------------------------------------------------------
    // Called on mode exit and before a manual save, so leaving the mode mid-sentence
    // never loses the sentence.
    function VghLantern__Specification__JobNotes__Flush() {
        if (VghLantern__JobNotes__WriteTimerId !== null) {
            clearTimeout(VghLantern__JobNotes__WriteTimerId);
            VghLantern__JobNotes__WriteTimerId  =  null;
        }

        var textarea  =  document.getElementById(DOM_TEXTAREA);
        if (textarea) VghLantern__JobNotes__CommitNotes(textarea.value);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering and Binding
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Update the Character Counter Readout
    // ------------------------------------------------------------
    function VghLantern__JobNotes__UpdateCounter(hostElement, currentLength, maxLength) {
        var counter  =  hostElement.querySelector('.' + CSS_COUNTER);
        if (counter) counter.textContent  =  currentLength + ' / ' + maxLength;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Job Notes Editor
    // ------------------------------------------------------------
    function VghLantern__Specification__JobNotes__Render() {
        var host  =  document.getElementById(DOM_HOST);
        if (!host) return;

        var config  =  VghLantern__JobNotes__Config();
        if (config.Enabled === false) {
            host.innerHTML  =  '';
            return;
        }

        var maxChars  =  (typeof config.MaxCharacters === 'number') ? config.MaxCharacters : FALLBACK_MAX;
        var noteText  =  VghLantern__JobNotes__ReadNotes();

        host.innerHTML  =
            '<section class="' + CSS_BLOCK + '">' +
            '<label class="' + CSS_LABEL + '" for="' + DOM_TEXTAREA + '">Job Notes</label>' +
            '<textarea class="' + CSS_TEXTAREA + '" id="' + DOM_TEXTAREA + '" ' +
            'maxlength="' + maxChars + '" rows="6" ' +
            'placeholder="' + VghLantern__JobNotes__Escape(config.PlaceholderText || '') + '">' +
            VghLantern__JobNotes__Escape(noteText) + '</textarea>' +
            '<div class="' + CSS_HELPER + '">' +
            '<span>' + VghLantern__JobNotes__Escape(config.HelperText || '') + '</span>' +
            '<span class="' + CSS_COUNTER + '">' + noteText.length + ' / ' + maxChars + '</span>' +
            '</div></section>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Build the Notes as Static Read-Only Markup
    // ------------------------------------------------------------
    // The printed document needs the note text, not an editor. Reading straight from
    // the project rather than the textarea means this works whether or not the
    // Specification mode has ever been opened.
    function VghLantern__Specification__JobNotes__BuildStatic() {
        var config  =  VghLantern__JobNotes__Config();
        if (config.Enabled === false) return '';

        var noteText  =  VghLantern__JobNotes__ReadNotes();
        if (!noteText) return '';

        return '<section class="' + CSS_BLOCK + '">' +
               '<p class="' + CSS_STATIC + '">' + VghLantern__JobNotes__Escape(noteText) + '</p>' +
               '</section>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Bind the Delegated Notes Input Listener
    // ------------------------------------------------------------
    // Delegated onto the persistent container so the binding survives every
    // re-render of the textarea, and only ever attaches once.
    function VghLantern__Specification__JobNotes__Init() {
        if (VghLantern__JobNotes__IsBound) return;

        var host  =  document.getElementById(DOM_HOST);
        if (!host) return;

        host.addEventListener('input', function(e) {
            if (!e.target || e.target.id !== DOM_TEXTAREA) return;

            var config    =  VghLantern__JobNotes__Config();
            var maxChars  =  (typeof config.MaxCharacters === 'number') ? config.MaxCharacters : FALLBACK_MAX;

            VghLantern__JobNotes__UpdateCounter(host, e.target.value.length, maxChars);
            VghLantern__JobNotes__QueueCommit(e.target.value);
        });

        // Leaving the field is an explicit end of editing, so do not wait out the debounce.
        host.addEventListener('focusout', function(e) {
            if (!e.target || e.target.id !== DOM_TEXTAREA) return;
            VghLantern__Specification__JobNotes__Flush();
        });

        VghLantern__JobNotes__IsBound  =  true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Specification__JobNotes__Init        : VghLantern__Specification__JobNotes__Init,
        VghLantern__Specification__JobNotes__Render      : VghLantern__Specification__JobNotes__Render,
        VghLantern__Specification__JobNotes__BuildStatic : VghLantern__Specification__JobNotes__BuildStatic,
        VghLantern__Specification__JobNotes__Flush       : VghLantern__Specification__JobNotes__Flush
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__Specification__JobNotes  =  VghLantern__Specification__JobNotes;
