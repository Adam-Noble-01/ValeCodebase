/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - FINIALS
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__Finials__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - Finials
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the finial selection and placement controls
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Finials accordion section.
   - The whole section is one expandable group: finials off collapses to a single
     row, which is the common case on contemporary lanterns.
   - Component option lists come from the component library filtered by role, so
     the same asset drives the 2D elevation linework and the 3D mesh placement.
   - The finial itself is chosen from picture cards rather than a dropdown.
     Choosing a finial is a visual decision, and a list of product names asks the
     user to hold a shape in their head that the app already knows: each card
     draws the component's own exported front elevation. The cards cost nothing
     to show because the outline is baked into the component index, and the
     megabyte-scale asset file is fetched only once a card is chosen.
   - Apex placement only applies to forms that converge on a point, so that toggle
     hides on a ridged roof rather than storing a flag with no effect.

   ============================================================================= */

// =============================================================================
// REGION | Finials Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__Finials = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Finials Block and Related Form Values
    // ------------------------------------------------------------
    const FINIALS_BLOCK    =  'Lantern__Finials__Config';
    const FORM_BLOCK       =  'Lantern__Form__Config';
    const FIELD_ROOF_FORM  =  'Lantern__Form__Config__RoofForm';
    const FORM_PYRAMID     =  'Pyramid';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visibility Predicates
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Current Roof Form
    // ------------------------------------------------------------
    function VghLantern__Section__Finials__RoofForm(lantern) {
        var block  =  lantern && lantern[FORM_BLOCK];
        return (block && block[FIELD_ROOF_FORM]) || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | True When the Form Has Ridge Ends to Sit Finials On
    // ------------------------------------------------------------
    function VghLantern__Section__Finials__HasRidgeEnds(lantern) {
        return VghLantern__Section__Finials__RoofForm(lantern) !== FORM_PYRAMID;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | True When the Form Converges on a Single Apex
    // ------------------------------------------------------------
    function VghLantern__Section__Finials__HasApex(lantern) {
        return VghLantern__Section__Finials__RoofForm(lantern) === FORM_PYRAMID;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Finials Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__Finials__Build() {
        return [
            {
                Key      : 'finialsEnabled',
                Type     : 'expandable',
                Label    : 'Fit Finials',
                Block    : FINIALS_BLOCK,
                Field    : 'Lantern__Finials__Config__Enabled',
                Children : [
                    {
                        Key           : 'finialComponentId',
                        Type          : 'cards',
                        Label         : 'Finial',
                        Block         : FINIALS_BLOCK,
                        Field         : 'Lantern__Finials__Config__FinialComponentId',
                        OptionsSource : 'components:finial',
                        Hint          : 'Each card is the component\'s real front elevation. Geometry loads on selection.'
                    },
                    {
                        Key           : 'finialBaseComponentId',
                        Type          : 'select',
                        Label         : 'Finial Base',
                        Block         : FINIALS_BLOCK,
                        Field         : 'Lantern__Finials__Config__FinialBaseComponentId',
                        OptionsSource : 'components:finialBase',
                        Hint          : 'Optional collar between the ridge and the finial.'
                    },
                    {
                        Key         : 'placeAtRidgeEnds',
                        Type        : 'toggle',
                        Label       : 'Place at Ridge Ends',
                        Block       : FINIALS_BLOCK,
                        Field       : 'Lantern__Finials__Config__PlaceAtRidgeEnds',
                        VisibleWhen : VghLantern__Section__Finials__HasRidgeEnds
                    },
                    {
                        Key         : 'placeAtApex',
                        Type        : 'toggle',
                        Label       : 'Place at Apex',
                        Block       : FINIALS_BLOCK,
                        Field       : 'Lantern__Finials__Config__PlaceAtApex',
                        VisibleWhen : VghLantern__Section__Finials__HasApex
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
        VghLantern__Section__Finials__Build : VghLantern__Section__Finials__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__Finials  =  VghLantern__LanternEditor__Section__Finials;
