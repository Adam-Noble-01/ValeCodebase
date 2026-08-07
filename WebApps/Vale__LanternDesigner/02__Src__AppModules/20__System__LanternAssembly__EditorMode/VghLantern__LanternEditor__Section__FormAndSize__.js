/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - FORM AND SIZE
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__FormAndSize__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - FormAndSize
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the roof form, overall size, pitch and quantity controls
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Form and Size accordion section.
   - Roof form drives which members the SkeletonSolver produces, so it sits first.
   - Width is the long plan axis, depth the short one. Both are measured to the
     OUTSIDE face of the builders upstand, which is the face the builder sets out to, and
     they match the dimensions the plan view puts under the click-to-type editor.
     The builders upstand thickness therefore reduces the reveal, never the stated size.
   - Roof pitch follows width and depth because it is the third number that fixes
     the shape: with the plan size set, the pitch is what decides how tall the
     roof stands. It is the only thing that drives roof height.
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
                Hint      : 'Long plan axis, measured to the outside face of the builders upstand.'
            },
            {
                Key       : 'depthMm',
                Type      : 'slider',
                Label     : 'Depth',
                Block     : 'Lantern__Dimensions__Config',
                Field     : 'Lantern__Dimensions__Config__DepthMm',
                BoundsKey : 'DepthMm',
                Unit      : 'mm',
                Hint      : 'Short plan axis, measured to the outside face of the builders upstand.'
            },
            {
                Key       : 'pitchDegrees',
                Type      : 'slider',
                Label     : 'Roof Pitch',
                Block     : 'Lantern__RoofPitch__Config',
                Field     : 'Lantern__RoofPitch__Config__PitchDegrees',
                BoundsKey : 'PitchDegrees',
                Unit      : 'deg',
                Decimals  : 1,
                Hint      : 'Slope angle from horizontal; sets the height of the roof.'
            },
            // The Eaves Projection slider is RETIRED: the roof springs from the
            // eaves datum on the head beam inner face, and the overhangs at the
            // eaves are fixed by the Vale product (glaze bar cap +170mm along
            // the pitch past the datum), not by a configurable projection.
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
