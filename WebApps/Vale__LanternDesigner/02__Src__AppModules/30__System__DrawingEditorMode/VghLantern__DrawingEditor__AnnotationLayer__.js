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
   - Returns the list only. SheetPdfLayout measures the band it needs and SheetChrome
     paints it onto both the screen sheet and the PDF from one description.
   - Enforces the configured maximum note count so a long note list can never push
     the titleblock off the sheet.

   -----------------------------------------------------------------------------

   WHY THIS MODULE NO LONGER EMITS MARKUP:
   It used to also build an HTML notes block, which only Preview and Send used, while
   the sheet and the export drew a different one from SheetChrome with its own columns,
   leading and numbering. One list, painted once, by the module that paints everything
   else on the sheet.

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

    // MODULE CONSTANTS | Project Data Keys
    // ------------------------------------------------------------
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
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__DrawingEditor__AnnotationLayer__CollectNotes  : VghLantern__DrawingEditor__AnnotationLayer__CollectNotes
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__DrawingEditor__AnnotationLayer  =  VghLantern__DrawingEditor__AnnotationLayer;
