/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - KERB AND BASE
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__KerbAndBase__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - KerbAndBase
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the base frame and the upstand kerb controls
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Frame and Kerb accordion section, split
     into two labelled subsections: the frame first, then the kerb under it.
   - The base is two stacked parts sharing one footprint:
       FRAME  the lantern's own base frame, sitting on the kerb. Its thickness is
              the kerb thickness by definition, so only its height is a control.
       KERB   the studwork upstand built on the roof. A hollow box whose OUTER
              face is the lantern width and depth, walled at the kerb thickness,
              with the hole through it forming the reveal.
   - Both heights raise the eaves line, so every elevation dimension depends on
     this section; the SkeletonSolver reads all three numbers straight from here.

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

    // FUNCTION | Build the Frame and Kerb Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__KerbAndBase__Build() {
        return [
            {
                Key   : 'baseFrameHeading',
                Type  : 'heading',
                Label : 'Frame'
            },
            {
                Key       : 'frameHeightMm',
                Type      : 'slider',
                Label     : 'Frame Height',
                Block     : KERB_BLOCK,
                Field     : 'Lantern__KerbAndBase__Config__FrameHeightMm',
                BoundsKey : 'FrameHeightMm',
                Unit      : 'mm',
                Hint      : 'Height of the base frame sitting on the kerb. Its thickness follows the kerb.'
            },
            {
                Key           : 'eavesProfileId',
                Type          : 'select',
                Label         : 'Eaves Section',
                Block         : KERB_BLOCK,
                Field         : 'Lantern__KerbAndBase__Config__EavesProfileId',
                OptionsSource : 'profiles:eaves',
                Hint          : 'Section swept around the eaves line at the top of the frame.'
            },
            {
                Key           : 'closingProfileId',
                Type          : 'select',
                Label         : 'Closing Section',
                Block         : KERB_BLOCK,
                Field         : 'Lantern__KerbAndBase__Config__ClosingProfileId',
                OptionsSource : 'profiles:closing',
                Hint          : 'Trim closing the junction between the frame and the surrounding roof finish.'
            },

            {
                Key   : 'kerbHeading',
                Type  : 'heading',
                Label : 'Kerb'
            },
            {
                Key       : 'kerbHeightMm',
                Type      : 'slider',
                Label     : 'Kerb Height',
                Block     : KERB_BLOCK,
                Field     : 'Lantern__KerbAndBase__Config__KerbHeightMm',
                BoundsKey : 'KerbHeightMm',
                Unit      : 'mm',
                Hint      : 'Upstand from the roof structure to the underside of the frame. 150 mm is standard.'
            },
            {
                Key       : 'kerbThicknessMm',
                Type      : 'slider',
                Label     : 'Kerb Thickness',
                Block     : KERB_BLOCK,
                Field     : 'Lantern__KerbAndBase__Config__KerbThicknessMm',
                BoundsKey : 'KerbThicknessMm',
                Unit      : 'mm',
                Hint      : 'Wall thickness of the upstand. Width and depth stay measured to the outer face, so this sets the reveal.'
            },
            {
                Key           : 'kerbProfileId',
                Type          : 'select',
                Label         : 'Kerb Section',
                Block         : KERB_BLOCK,
                Field         : 'Lantern__KerbAndBase__Config__KerbProfileId',
                OptionsSource : 'profiles:kerb'
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
