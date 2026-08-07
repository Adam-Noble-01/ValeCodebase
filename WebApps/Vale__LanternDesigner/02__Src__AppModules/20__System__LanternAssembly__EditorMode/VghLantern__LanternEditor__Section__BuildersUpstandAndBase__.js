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
     section. Exterior finish moved to Finishes and Materials (v0.2.7); this
     section now owns only the builders upstand size controls. The Vale head
     beam is a fixed product section and carries no size control.
   - SCOPE: Vale builds and supplies the lantern, including the base frame.
     The builders prepare the upstand on site; the app shows that upstand for
     context and dimensioning, but it is not Vale manufactured scope.

   ============================================================================= */

// =============================================================================
// REGION | Builders Upstand and Base Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__BuildersUpstandAndBase = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Upstand Block Name
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
