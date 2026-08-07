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
    const JOINERY_BLOCK  =  'Lantern__InteriorJoinery__Config';
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
                Field            : 'Lantern__InteriorJoinery__Config__CorniceOptionId',
                OptionsSource    : 'interiorCornices',
                AllowEmpty       : true,
                EmptyOptionLabel : 'No Cornice'
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
