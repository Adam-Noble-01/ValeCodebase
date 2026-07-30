/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - FORM AND SIZE
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__FormAndSize__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - FormAndSize
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the roof form, overall size and quantity controls
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Form and Size accordion section.
   - Roof form drives which members the SkeletonSolver produces, so it sits first.
   - Width is the long plan axis, depth the short one; both are structural extents
     measured to the outside of the kerb, matching the dimensions the plan view
     puts under the click-to-type editor.
   - Pure data. No DOM, no lantern mutation, no config duplication.

   ============================================================================= */

// =============================================================================
// REGION | Form and Size Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__FormAndSize = (function() {

// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Form and Size Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__FormAndSize__Build() {
        return [
            {
                Key           : 'roofForm',
                Type          : 'select',
                Label         : 'Roof Form',
                Block         : 'Lantern__Form__Config',
                Field         : 'Lantern__Form__Config__RoofForm',
                OptionsSource : 'roofForms',
                AllowEmpty    : false,
                Hint          : 'Determines which structural members the solver generates.'
            },
            {
                Key       : 'widthMm',
                Type      : 'slider',
                Label     : 'Width',
                Block     : 'Lantern__Dimensions__Config',
                Field     : 'Lantern__Dimensions__Config__WidthMm',
                BoundsKey : 'WidthMm',
                Unit      : 'mm',
                Hint      : 'Long plan axis, measured over the kerb.'
            },
            {
                Key       : 'depthMm',
                Type      : 'slider',
                Label     : 'Depth',
                Block     : 'Lantern__Dimensions__Config',
                Field     : 'Lantern__Dimensions__Config__DepthMm',
                BoundsKey : 'DepthMm',
                Unit      : 'mm',
                Hint      : 'Short plan axis, measured over the kerb.'
            },
            {
                Key       : 'eavesProjectionMm',
                Type      : 'slider',
                Label     : 'Eaves Projection',
                Block     : 'Lantern__Dimensions__Config',
                Field     : 'Lantern__Dimensions__Config__EavesProjectionMm',
                BoundsKey : 'EavesProjectionMm',
                Unit      : 'mm',
                Hint      : 'Overhang of the eaves beyond the kerb face.'
            },
            {
                Key       : 'quantity',
                Type      : 'slider',
                Label     : 'Quantity',
                Block     : 'Lantern__Identity__Config',
                Field     : 'Lantern__Identity__Config__Quantity',
                BoundsKey : 'Quantity',
                Unit      : 'off',
                Hint      : 'Number of identical lanterns; multiplies the specification takeoff.'
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
        VghLantern__Section__FormAndSize__Build : VghLantern__Section__FormAndSize__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__FormAndSize  =  VghLantern__LanternEditor__Section__FormAndSize;
