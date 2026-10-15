/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - WARNINGS AND COMMENTS
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__WarningsAndComments__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - WarningsAndComments
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the user-authored document warning and internal notes controls
   CREATED    : 31-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Warnings and Comments accordion section.
   - Document Warning is free text the user writes to flag something the
     automatic WarningSystem cannot know about (e.g. a site access constraint).
     It is stored in Lantern__Notes__Config__DocumentWarning and is picked up by
     the Specification document model, which prints it in red - see
     VghLantern__DocumentModel__CollectUserWarnings.
   - Internal Comments is staff-only coordination text. It is stored alongside
     the warning in the same block but is never read by any document renderer,
     so it can carry anything from a supplier query to a delivery note.
   - Both fields share the block; only DocumentWarning ever reaches a document.

   ============================================================================= */

// =============================================================================
// REGION | Warnings and Comments Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__WarningsAndComments = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Notes Block Name
    // ------------------------------------------------------------
    const NOTES_BLOCK  =  'Lantern__Notes__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Warnings and Comments Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__WarningsAndComments__Build() {
        return [
            {
                Key       : 'documentWarning',
                Type      : 'textarea',
                Label     : 'Warning (appears on documents)',
                Block     : NOTES_BLOCK,
                Field     : 'Lantern__Notes__Config__DocumentWarning',
                MaxLength : 500,
                Rows      : 3,
                Hint      : 'Printed in red on the Specification document. Use for anything the automatic checks cannot catch, such as a site access or delivery constraint.'
            },
            {
                Key       : 'internalComments',
                Type      : 'textarea',
                Label     : 'General Comments (internal only)',
                Block     : NOTES_BLOCK,
                Field     : 'Lantern__Notes__Config__InternalComments',
                MaxLength : 1000,
                Rows      : 4,
                Hint      : 'Staff coordination notes only. Never printed on the specification or any other document.'
            }
        ];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__Section__WarningsAndComments__Build : VghLantern__Section__WarningsAndComments__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__WarningsAndComments  =  VghLantern__LanternEditor__Section__WarningsAndComments;
