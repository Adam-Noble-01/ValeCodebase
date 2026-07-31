/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - BUILDERS UPSTAND AND BASE
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__BuildersUpstandAndBase__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - BuildersUpstandAndBase
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the Vale base frame and the site-built builders upstand controls
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Frame and Builders Upstand accordion
     section, split into two labelled subsections: the Vale frame first, then
     the builders upstand under it.
   - SCOPE: Vale builds and supplies the lantern, including the base frame.
     The builders prepare the upstand on site; the app shows that upstand for
     context and dimensioning, but it is not Vale manufactured scope.
   - The base is two stacked parts sharing one footprint:
       FRAME              Vale's own base frame, sitting on the upstand. Its
                          thickness follows the upstand wall by definition, so
                          only its height is a control.
       BUILDERS UPSTAND   Site-built studwork upstand on the roof. A hollow box
                          whose OUTER face is the lantern width and depth,
                          walled at the upstand thickness, with the hole through
                          it forming the reveal.
   - Both heights raise the eaves line, so every elevation dimension depends on
     this section; the SkeletonSolver reads all three numbers straight from here.

   ============================================================================= */

// =============================================================================
// REGION | Builders Upstand and Base Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__BuildersUpstandAndBase = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Builders Upstand and Base Block Name
    // ------------------------------------------------------------
    const UPSTAND_BLOCK  =  'Lantern__BuildersUpstandAndBase__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Frame and Builders Upstand Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__BuildersUpstandAndBase__Build() {
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
                Block     : UPSTAND_BLOCK,
                Field     : 'Lantern__BuildersUpstandAndBase__Config__FrameHeightMm',
                BoundsKey : 'FrameHeightMm',
                Unit      : 'mm',
                Hint      : 'Height of the Vale base frame sitting on the builders upstand. Its thickness follows the upstand wall.'
            },
            {
                Key           : 'eavesProfileId',
                Type          : 'select',
                Label         : 'Eaves Section',
                Block         : UPSTAND_BLOCK,
                Field         : 'Lantern__BuildersUpstandAndBase__Config__EavesProfileId',
                OptionsSource : 'profiles:eaves',
                Hint          : 'Decorative cornice / eaves section at the slope foot. Reserved for future cornice profiles.'
            },

            {
                Key   : 'buildersUpstandHeading',
                Type  : 'heading',
                Label : 'Builders Upstand'
            },
            {
                Key       : 'upstandHeightMm',
                Type      : 'slider',
                Label     : 'Upstand Height',
                Block     : UPSTAND_BLOCK,
                Field     : 'Lantern__BuildersUpstandAndBase__Config__UpstandHeightMm',
                BoundsKey : 'UpstandHeightMm',
                Unit      : 'mm',
                Hint      : 'Site-built upstand from the roof structure to the underside of the Vale frame. 150 mm is standard. Not Vale manufacture.'
            },
            {
                Key       : 'upstandThicknessMm',
                Type      : 'slider',
                Label     : 'Upstand Thickness',
                Block     : UPSTAND_BLOCK,
                Field     : 'Lantern__BuildersUpstandAndBase__Config__UpstandThicknessMm',
                BoundsKey : 'UpstandThicknessMm',
                Unit      : 'mm',
                Hint      : 'Wall thickness of the builders upstand. Width and depth stay measured to the outer face, so this sets the reveal.'
            },
            {
                Key           : 'upstandProfileId',
                Type          : 'select',
                Label         : 'Upstand Section',
                Block         : UPSTAND_BLOCK,
                Field         : 'Lantern__BuildersUpstandAndBase__Config__UpstandProfileId',
                OptionsSource : 'profiles:buildersUpstand'
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
        VghLantern__Section__BuildersUpstandAndBase__Build : VghLantern__Section__BuildersUpstandAndBase__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__BuildersUpstandAndBase  =  VghLantern__LanternEditor__Section__BuildersUpstandAndBase;
