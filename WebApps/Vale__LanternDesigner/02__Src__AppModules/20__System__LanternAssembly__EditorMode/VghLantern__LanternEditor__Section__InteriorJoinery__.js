/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - INTERIOR JOINERY
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__InteriorJoinery__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - InteriorJoinery
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the interior cornice and joinery assembly controls
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - Emits the descriptor list for the Interior Joinery accordion section.
   - The one real choice is which cornice moulding runs around the upstand
     interior - Wales (default), Classic VG103, or No Cornice. Cards show the
     section outline from the system index; No Cornice mirrors the No Finials
     empty-card pattern and omits cornice plus packer from the 3D assembly.
   - Eaves trim is always fitted; the plywood packer only fits with a cornice.
     Neither is a menu control.
   - The height offset slider slides the cornice and its packer together up or
     down the upstand against the standard fixing height. It is here because a
     deep moulding on a shallow upstand fouls the frame, and the fitter's answer
     on site is to move the cornice rather than change it. No Cornice hides the
     slider - there is nothing to move.

   ============================================================================= */

// =============================================================================
// REGION | Interior Joinery Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__InteriorJoinery = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Joinery Block
    // ------------------------------------------------------------
    const JOINERY_BLOCK      =  'Lantern__InteriorJoinery__Config';
    const FIELD_CORNICE_ID   =  'Lantern__InteriorJoinery__Config__CorniceOptionId';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visibility Predicates
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | True When a Cornice Is Actually Fitted
    // ------------------------------------------------------------
    // Empty is the deliberate No Cornice choice, the same as an empty finial id.
    // An unset field is a project that predates the card and gets the default
    // cornice, so it counts as fitted.
    function VghLantern__Section__InteriorJoinery__HasCornice(lantern) {
        var block   =  lantern && lantern[JOINERY_BLOCK];
        var stored  =  block ? block[FIELD_CORNICE_ID] : null;

        if (stored === '') return false;
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Interior Joinery Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__InteriorJoinery__Build() {
        return [
            {
                Key              : 'corniceOptionId',
                Type             : 'cards',
                Label            : 'Interior Cornice',
                Block            : JOINERY_BLOCK,
                Field            : FIELD_CORNICE_ID,
                OptionsSource    : 'interiorCornices',
                AllowEmpty       : true,
                EmptyOptionLabel : 'No Cornice'
            },
            {
                Key         : 'corniceHeightOffsetMm',
                Type        : 'slider',
                Label       : 'Cornice Height Offset',
                Block       : JOINERY_BLOCK,
                Field       : 'Lantern__InteriorJoinery__Config__CorniceHeightOffsetMm',
                BoundsKey   : 'CorniceHeightOffsetMm',
                Unit        : 'mm',
                Hint        : 'Moves the cornice and its plywood packer up or down the upstand. Zero is the standard fixing height; positive raises the moulding to clear a clash below the eaves.',
                VisibleWhen : VghLantern__Section__InteriorJoinery__HasCornice
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
        VghLantern__Section__InteriorJoinery__Build : VghLantern__Section__InteriorJoinery__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__InteriorJoinery  =  VghLantern__LanternEditor__Section__InteriorJoinery;
