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
   - The thickness hint follows the plan size basis (20-Oct-2026). With the
     lantern set out to the internal upstand, the opening is the fixed thing,
     so a thicker upstand makes a bigger lantern; the hint says so rather than
     the usual "this sets the reveal", which would then be untrue.

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
// REGION | Hints
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Hint Under the Upstand Thickness Slider
    // ------------------------------------------------------------
    // Reference: 04__MathUtils__LanternGeometry/VghLantern__Geometry__PlanSizeBasis__.js
    function VghLantern__Section__BuildersUpstandAndBase__ThicknessHint(lantern) {
        var PlanSizeBasis  =  window.VghLantern__Geometry__PlanSizeBasis;
        var basis          =  PlanSizeBasis ? PlanSizeBasis.VghLantern__PlanSizeBasis__GoverningBasis(lantern) : '';

        if (PlanSizeBasis && basis === PlanSizeBasis.VGHLANTERN__PLANSIZE__BASIS_INTERNAL_UPSTAND) {
            return 'Wall thickness of the builders upstand. This lantern is set out to the internal upstand, '
                 + 'so the opening is held and this moves the exterior length and width.';
        }

        return 'Wall thickness of the builders upstand. Length and width stay measured to the finished exterior, so this sets the reveal.';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Frame and Builders Upstand Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__BuildersUpstandAndBase__Build(lantern) {
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
                Hint      : VghLantern__Section__BuildersUpstandAndBase__ThicknessHint(lantern)
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
