/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - RIDGE AND HIPS
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__RidgeAndHips__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - RidgeAndHips
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the ridge and hip section choices plus optional cresting
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Ridge and Hips accordion section.
   - Ridge and hip profiles are swept along their skeleton members by both render
     environments; the option lists are filtered from the profile library by role.
   - Cresting is an expandable group: the component select only appears once
     cresting is switched on, keeping the closed state to a single row.
   - A Pyramid roof has no ridge, so the ridge select hides for that form rather
     than storing a profile that would never be drawn.

   ============================================================================= */

// =============================================================================
// REGION | Ridge and Hips Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__RidgeAndHips = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Ridge Block and Related Form Values
    // ------------------------------------------------------------
    const RIDGE_BLOCK      =  'Lantern__RidgeAndHips__Config';
    const FORM_BLOCK       =  'Lantern__Form__Config';
    const FIELD_ROOF_FORM  =  'Lantern__Form__Config__RoofForm';
    const FORM_PYRAMID     =  'Pyramid';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visibility Predicates
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | True When the Roof Form Actually Has a Ridge
    // ------------------------------------------------------------
    function VghLantern__Section__RidgeAndHips__HasRidge(lantern) {
        var block  =  lantern && lantern[FORM_BLOCK];
        var form   =  (block && block[FIELD_ROOF_FORM]) || '';
        return form !== FORM_PYRAMID;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Ridge and Hips Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__RidgeAndHips__Build() {
        return [
            {
                Key           : 'ridgeProfileId',
                Type          : 'select',
                Label         : 'Ridge Section',
                Block         : RIDGE_BLOCK,
                Field         : 'Lantern__RidgeAndHips__Config__RidgeProfileId',
                OptionsSource : 'profiles:ridge',
                VisibleWhen   : VghLantern__Section__RidgeAndHips__HasRidge
            },
            {
                Key           : 'hipProfileId',
                Type          : 'select',
                Label         : 'Hip Section',
                Block         : RIDGE_BLOCK,
                Field         : 'Lantern__RidgeAndHips__Config__HipProfileId',
                OptionsSource : 'profiles:hip',
                Hint          : 'Also used for vergeboards on gable forms.'
            },
            {
                Key      : 'crestingEnabled',
                Type     : 'expandable',
                Label    : 'Ridge Cresting',
                Block    : RIDGE_BLOCK,
                Field    : 'Lantern__RidgeAndHips__Config__CrestingEnabled',
                Children : [
                    {
                        Key           : 'crestingComponentId',
                        Type          : 'select',
                        Label         : 'Cresting Pattern',
                        Block         : RIDGE_BLOCK,
                        Field         : 'Lantern__RidgeAndHips__Config__CrestingComponentId',
                        OptionsSource : 'components:cresting'
                    }
                ]
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
        VghLantern__Section__RidgeAndHips__Build : VghLantern__Section__RidgeAndHips__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__RidgeAndHips  =  VghLantern__LanternEditor__Section__RidgeAndHips;
