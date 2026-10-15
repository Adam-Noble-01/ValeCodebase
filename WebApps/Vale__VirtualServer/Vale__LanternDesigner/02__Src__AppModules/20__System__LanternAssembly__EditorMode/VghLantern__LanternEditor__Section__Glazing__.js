/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - GLAZING
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__Glazing__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - Glazing
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the glazing specification and tint controls
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - Emits the descriptor list for the Glazing accordion section, which replaces
     the old Finish and Glazing section.
   - The finishes left. A section that asked what the whole lantern is coated in
     was asking one question on behalf of three elements that are specified
     separately - the frame, the glaze bar cap outside the roof and the glaze bar
     trim inside the room - and none of them are chosen while thinking about
     glass. Each finish now sits at the end of the section that owns the element
     it finishes, so the answer is given where the question is asked.
   - What remains is the glass itself, which is genuinely one decision for the
     whole lantern: every pane in a lantern is the same unit.
   - Both controls are specification-only. They change the takeoff text and the
     glazing material tint, never the solved geometry.

   -----------------------------------------------------------------------------

   THE STORED BLOCK IS STILL NAMED FinishAndGlazing:
   Renaming a persisted key would force a migration pass over every saved project
   on disk to change a name that appears nowhere but in the file. The label moved
   and the key did not, exactly as GlazingBars did when Glaze Bars was renamed.

   ============================================================================= */

// =============================================================================
// REGION | Glazing Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__Glazing = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Glazing Block Name
    // ------------------------------------------------------------
    const GLAZING_BLOCK  =  'Lantern__FinishAndGlazing__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Glazing Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__Glazing__Build() {
        return [
            {
                Key           : 'glazingSpec',
                Type          : 'select',
                Label         : 'Glazing Specification',
                Block         : GLAZING_BLOCK,
                Field         : 'Lantern__FinishAndGlazing__Config__GlazingSpec',
                OptionsSource : 'glazingSpecs',
                Hint          : 'The sealed unit build up. Carried onto the specification schedule.'
            },
            {
                Key           : 'glazingTint',
                Type          : 'select',
                Label         : 'Glazing Tint',
                Block         : GLAZING_BLOCK,
                Field         : 'Lantern__FinishAndGlazing__Config__GlazingTint',
                OptionsSource : 'glazingTints'
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
        VghLantern__Section__Glazing__Build : VghLantern__Section__Glazing__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__Glazing  =  VghLantern__LanternEditor__Section__Glazing;
