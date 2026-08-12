/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - RIDGE AND HIPS
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__RidgeAndHips__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - RidgeAndHips
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the ridge and hip type choices, depth overrides and cresting
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Ridge and Hips accordion section.
   - There is no longer a section to choose for either. A Vale ridge is a fixed
     stack of up to six parts and a hip is a fixed stack of four, so offering a
     profile dropdown was offering a choice that does not exist. What the user
     actually decides is the TYPE - which assembly gets built - and how deep the
     two timber beams run.
   - The beam depths come from the roof pitch by way of a standards table, so the
     sliders here are OVERRIDES against that standard rather than the depths
     themselves. Zero means the Vale standard for the pitch, which is what nearly
     every lantern wants.
   - A Pyramid roof has no ridge, so the ridge controls hide for that form rather
     than storing a type that would never be drawn. The hips and the block are
     still built: a pyramid apex is a four hip junction.
   - Cresting stays an expandable group, and closes off entirely on a leaded only
     ridge because cresting is welded to the aluminium capping that type does not
     have.

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


    // HELPER FUNCTION | True When This Ridge Can Carry Cresting
    // ------------------------------------------------------------
    // Cresting is welded to the aluminium ridge capping, so a leaded only ridge
    // has nothing to fix it to. The answer comes from the ridge system index
    // rather than a type name test here, so a third ridge type would not need
    // this file edited.
    //
    // A pyramid has no ridge at all, which the first test already covers.
    function VghLantern__Section__RidgeAndHips__AllowsCresting(lantern) {
        if (!VghLantern__Section__RidgeAndHips__HasRidge(lantern)) return false;

        var RidgeSystem  =  window.VghLantern__AppData__RidgeSystemLoader;
        if (!RidgeSystem) return true;                                        // <-- Before the index loads, do not hide a control that is usually there

        return RidgeSystem.VghLantern__RidgeSystemLoader__AllowsCresting(lantern);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | True When This Ridge Has an Aluminium Capping to Finish
    // ------------------------------------------------------------
    function VghLantern__Section__RidgeAndHips__HasCapping(lantern) {
        if (!VghLantern__Section__RidgeAndHips__HasRidge(lantern)) return false;

        var RidgeSystem  =  window.VghLantern__AppData__RidgeSystemLoader;
        if (!RidgeSystem) return true;

        var type  =  RidgeSystem.VghLantern__RidgeSystemLoader__ResolvedType(lantern);
        if (!type || !Array.isArray(type.PartKeys)) return true;

        return type.PartKeys.indexOf('capping') !== -1;
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
                Key           : 'ridgeTypeKey',
                Type          : 'select',
                Label         : 'Ridge Type',
                Block         : RIDGE_BLOCK,
                Field         : 'Lantern__RidgeAndHips__Config__RidgeTypeKey',
                OptionsSource : 'ridgeTypes',
                AllowEmpty    : false,
                Hint          : 'A leaded only ridge drops the aluminium capping, and with it finials and cresting.',
                VisibleWhen   : VghLantern__Section__RidgeAndHips__HasRidge
            },
            {
                Key           : 'cappingFinish',
                Type          : 'select',
                Label         : 'Ridge Capping Finish',
                Block         : RIDGE_BLOCK,
                Field         : 'Lantern__RidgeAndHips__Config__CappingFinish',
                OptionsSource : 'capFinishes',
                Hint          : 'Follows the exterior finish when left empty.',
                VisibleWhen   : VghLantern__Section__RidgeAndHips__HasCapping
            },
            {
                Key           : 'hipTypeKey',
                Type          : 'select',
                Label         : 'Hip Type',
                Block         : RIDGE_BLOCK,
                Field         : 'Lantern__RidgeAndHips__Config__HipTypeKey',
                OptionsSource : 'hipTypes',
                AllowEmpty    : false,
                Hint          : 'Glaze bar hips are recorded but not yet drawn; the lantern shows hip beams until they are.'
            },
            {
                Key         : 'ridgeDepthAdjustmentMm',
                Type        : 'slider',
                Label       : 'Ridge Beam Depth',
                Block       : RIDGE_BLOCK,
                Field       : 'Lantern__RidgeAndHips__Config__RidgeDepthAdjustmentMm',
                BoundsKey   : 'RidgeDepthAdjustmentMm',
                Unit        : 'mm',
                Hint        : 'Adjustment against the Vale standard depth for this pitch. Zero is the standard.',
                VisibleWhen : VghLantern__Section__RidgeAndHips__HasRidge
            },
            {
                Key       : 'hipDepthAdjustmentMm',
                Type      : 'slider',
                Label     : 'Hip Beam Depth',
                Block     : RIDGE_BLOCK,
                Field     : 'Lantern__RidgeAndHips__Config__HipDepthAdjustmentMm',
                BoundsKey : 'HipDepthAdjustmentMm',
                Unit      : 'mm',
                Hint      : 'Adjustment against the Vale standard depth for this pitch. The standard pairs hip to ridge so both plumb cuts finish level on the ridge block.'
            },
            {
                Key         : 'crestingEnabled',
                Type        : 'expandable',
                Label       : 'Ridge Cresting',
                Block       : RIDGE_BLOCK,
                Field       : 'Lantern__RidgeAndHips__Config__CrestingEnabled',
                VisibleWhen : VghLantern__Section__RidgeAndHips__AllowsCresting,
                Children    : [
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
