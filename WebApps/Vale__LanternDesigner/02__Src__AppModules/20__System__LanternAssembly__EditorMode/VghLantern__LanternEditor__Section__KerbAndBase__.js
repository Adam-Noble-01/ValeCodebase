/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - KERB AND BASE
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__KerbAndBase__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - KerbAndBase
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the upstand kerb height and the three base section choices
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Kerb and Base accordion section.
   - Kerb height is the upstand between the structural opening and the eaves line;
     it sets the base plane the SkeletonSolver builds the roof off, so it affects
     every elevation dimension.
   - Kerb, eaves and closing sections are all traced from the profile library and
     filtered by their own roles.

   ============================================================================= */

// =============================================================================
// REGION | Kerb and Base Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__KerbAndBase = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Kerb Block Name
    // ------------------------------------------------------------
    const KERB_BLOCK  =  'Lantern__KerbAndBase__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Kerb and Base Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__KerbAndBase__Build() {
        return [
            {
                Key       : 'kerbHeightMm',
                Type      : 'slider',
                Label     : 'Kerb Height',
                Block     : KERB_BLOCK,
                Field     : 'Lantern__KerbAndBase__Config__KerbHeightMm',
                BoundsKey : 'KerbHeightMm',
                Unit      : 'mm',
                Hint      : 'Upstand from the structural opening to the eaves line.'
            },
            {
                Key           : 'kerbProfileId',
                Type          : 'select',
                Label         : 'Kerb Section',
                Block         : KERB_BLOCK,
                Field         : 'Lantern__KerbAndBase__Config__KerbProfileId',
                OptionsSource : 'profiles:kerb'
            },
            {
                Key           : 'eavesProfileId',
                Type          : 'select',
                Label         : 'Eaves Section',
                Block         : KERB_BLOCK,
                Field         : 'Lantern__KerbAndBase__Config__EavesProfileId',
                OptionsSource : 'profiles:eaves'
            },
            {
                Key           : 'closingProfileId',
                Type          : 'select',
                Label         : 'Closing Section',
                Block         : KERB_BLOCK,
                Field         : 'Lantern__KerbAndBase__Config__ClosingProfileId',
                OptionsSource : 'profiles:closing',
                Hint          : 'Trim closing the junction between kerb and eaves.'
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
        VghLantern__Section__KerbAndBase__Build : VghLantern__Section__KerbAndBase__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__KerbAndBase  =  VghLantern__LanternEditor__Section__KerbAndBase;
