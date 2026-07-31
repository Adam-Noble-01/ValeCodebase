/* =============================================================================
   VGHLANTERN - DRAWING EDITOR | ANNOTATION LAYER
   =============================================================================

   FILE       : VghLantern__DrawingEditor__AnnotationLayer__.js
   NAMESPACE  : VghLantern
   MODULE     : System - DrawingEditor - AnnotationLayer
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Build the notes block that sits alongside the views on a sheet
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Composes the sheet notes list from two sources: the standing general notes held
     in config, and any project-specific notes recorded on the project file.
   - Emits markup only; placement on the sheet is the SheetManager's business.
   - Enforces the configured maximum note count so a long note list can never push
     the titleblock off the sheet.

   -----------------------------------------------------------------------------

   WHY GENERAL NOTES LIVE IN CONFIG:
   "Do not scale from this drawing" belongs on every sheet Vale issues, and retyping
   it per project is how it ends up missing from the one drawing that gets disputed.
   Config holds the standing notes; the project file holds only what is specific.

   ============================================================================= */

// =============================================================================
// REGION | Drawing Annotation Layer Module
// =============================================================================

const VghLantern__DrawingEditor__AnnotationLayer = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | CSS Class Names and Project Keys
    // ------------------------------------------------------------
    const CSS_BLOCK       =  'VghLantern__Sheet__Notes';
    const CSS_TITLE       =  'VghLantern__Sheet__NotesTitle';
    const CSS_LIST        =  'VghLantern__Sheet__NotesList';
    const CSS_ITEM        =  'VghLantern__Sheet__NotesItem';
    const CSS_ITEM_PROJ   =  'VghLantern__Sheet__NotesItem--project';

    const GLOBALS_BLOCK   =  'VghLantern__ProjectFile__GlobalSettings';
    const NOTES_FIELD     =  'VghLantern__ProjectFile__GlobalSettings__JobNotes';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get the Annotations Config Block
    // ------------------------------------------------------------
    function VghLantern__AnnotationLayer__Config() {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        if (!ConfigLoader) return {};

        var drawingCfg  =  ConfigLoader.VghLantern__ConfigLoader__GetSection('DrawingEditor') || {};
        return drawingCfg['VghLantern__DrawingEditor__Config__Annotations'] || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Escape Text for Safe Markup Insertion
    // ------------------------------------------------------------
    function VghLantern__AnnotationLayer__Escape(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Note Collection
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Split Project Job Notes Into Individual Lines
    // ------------------------------------------------------------
    // Job notes are stored as a single free-text field, so each non-blank line
    // becomes one numbered note on the sheet.
    function VghLantern__AnnotationLayer__ProjectNoteLines(project) {
        var globals  =  (project && project[GLOBALS_BLOCK]) || {};
        var raw      =  globals[NOTES_FIELD] || '';
        if (raw === '') return [];

        var lines   =  String(raw).split(/\r?\n/);
        var result  =  [];
        var i, trimmed;

        for (i = 0; i < lines.length; i++) {
            trimmed  =  lines[i].trim();
            if (trimmed !== '') result.push(trimmed);
        }

        return result;
    }
    // ------------------------------------------------------------


    // FUNCTION | Collect Every Note to Print on the Sheet
    // ------------------------------------------------------------
    // General notes lead, project notes follow, and the list is truncated to the
    // configured maximum so the notes block cannot overrun its space.
    function VghLantern__DrawingEditor__AnnotationLayer__CollectNotes(project) {
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var config    =  VghLantern__AnnotationLayer__Config();
        var general   =  Array.isArray(config.GeneralNotes) ? config.GeneralNotes : [];
        var projected =  VghLantern__AnnotationLayer__ProjectNoteLines(project);
        var maxNotes  =  ConfigLoader.VghLantern__ConfigLoader__RequireNumber(
            config, 'MaxNotes', 'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__Annotations'
        );

        var notes  =  [];
        var i;

        for (i = 0; i < general.length; i++)   notes.push({ Text: general[i],   IsProjectNote: false });
        for (i = 0; i < projected.length; i++) notes.push({ Text: projected[i], IsProjectNote: true  });

        return notes.slice(0, maxNotes);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Markup
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Notes Block Markup
    // ------------------------------------------------------------
    // Returns an empty string when annotations are switched off or there is nothing
    // to print, so the caller can insert the result unconditionally.
    function VghLantern__DrawingEditor__AnnotationLayer__BuildMarkup(project) {
        var config  =  VghLantern__AnnotationLayer__Config();
        var ConfigLoader  =  window.VghLantern__AppCore__ConfigLoader;
        var ANNOTATIONS_LABEL  =  'Na__DrawingEditor__Config.json -> VghLantern__DrawingEditor__Config__Annotations';
        if (!ConfigLoader.VghLantern__ConfigLoader__RequireBoolean(config, 'Enabled', ANNOTATIONS_LABEL)) return '';

        var notes  =  VghLantern__DrawingEditor__AnnotationLayer__CollectNotes(project);
        if (!notes.length) return '';

        var title  =  ConfigLoader.VghLantern__ConfigLoader__RequireString(config, 'NotesBlockTitle', ANNOTATIONS_LABEL);
        var html   =  '<aside class="' + CSS_BLOCK + '">' +
                      '<h4 class="' + CSS_TITLE + '">' + VghLantern__AnnotationLayer__Escape(title) + '</h4>' +
                      '<ol class="' + CSS_LIST + '">';

        var i, itemClass;
        for (i = 0; i < notes.length; i++) {
            itemClass  =  CSS_ITEM + (notes[i].IsProjectNote ? ' ' + CSS_ITEM_PROJ : '');
            html  +=  '<li class="' + itemClass + '">' + VghLantern__AnnotationLayer__Escape(notes[i].Text) + '</li>';
        }

        return html + '</ol></aside>';
    }
    // ------------------------------------------------------------


    // FUNCTION | Render the Notes Block Into a Host Element
    // ------------------------------------------------------------
    function VghLantern__DrawingEditor__AnnotationLayer__Render(hostElement, project) {
        if (!hostElement) return;
        hostElement.innerHTML  =  VghLantern__DrawingEditor__AnnotationLayer__BuildMarkup(project);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__AnnotationLayer__Render        : VghLantern__DrawingEditor__AnnotationLayer__Render,
        VghLantern__DrawingEditor__AnnotationLayer__BuildMarkup   : VghLantern__DrawingEditor__AnnotationLayer__BuildMarkup,
        VghLantern__DrawingEditor__AnnotationLayer__CollectNotes  : VghLantern__DrawingEditor__AnnotationLayer__CollectNotes
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__AnnotationLayer  =  VghLantern__DrawingEditor__AnnotationLayer;
