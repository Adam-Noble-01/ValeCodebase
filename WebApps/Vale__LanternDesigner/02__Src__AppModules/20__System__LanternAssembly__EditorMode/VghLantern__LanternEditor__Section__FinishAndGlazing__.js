/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - FINISH AND GLAZING
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__FinishAndGlazing__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - FinishAndGlazing
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the frame finish and glazing specification controls
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Finish and Glazing accordion section.
   - Finish drives both environments: the 2D renderers fill members with the
     finish HexColor and the 3D MaterialLibrary tints its frame material from the
     same config entry, so the two views never disagree on colour.
   - FrameColourRef offers the config-listed RAL and BS references that sit
     alongside the named finish; it is carried onto the specification schedule.
   - Glazing spec and tint are specification-only: they change the takeoff text
     and the glazing material tint, never the solved geometry.

   ============================================================================= */

// =============================================================================
// REGION | Finish and Glazing Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__FinishAndGlazing = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Finish Block Name
    // ------------------------------------------------------------
    const FINISH_BLOCK  =  'Lantern__FinishAndGlazing__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Finish and Glazing Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__FinishAndGlazing__Build() {
        return [
            {
                Key           : 'frameFinish',
                Type          : 'select',
                Label         : 'Frame Finish',
                Block         : FINISH_BLOCK,
                Field         : 'Lantern__FinishAndGlazing__Config__FrameFinish',
                OptionsSource : 'finishes',
                Hint          : 'Tints both the 2D preview and the 3D model.'
            },
            {
                Key           : 'frameColourRef',
                Type          : 'select',
                Label         : 'Colour Reference',
                Block         : FINISH_BLOCK,
                Field         : 'Lantern__FinishAndGlazing__Config__FrameColourRef',
                OptionsSource : 'colourReferences',
                Hint          : 'Optional RAL or BS reference carried onto the schedule.'
            },
            {
                Key           : 'glazingSpec',
                Type          : 'select',
                Label         : 'Glazing Specification',
                Block         : FINISH_BLOCK,
                Field         : 'Lantern__FinishAndGlazing__Config__GlazingSpec',
                OptionsSource : 'glazingSpecs'
            },
            {
                Key           : 'glazingTint',
                Type          : 'select',
                Label         : 'Glazing Tint',
                Block         : FINISH_BLOCK,
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
        VghLantern__Section__FinishAndGlazing__Build : VghLantern__Section__FinishAndGlazing__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__FinishAndGlazing  =  VghLantern__LanternEditor__Section__FinishAndGlazing;
