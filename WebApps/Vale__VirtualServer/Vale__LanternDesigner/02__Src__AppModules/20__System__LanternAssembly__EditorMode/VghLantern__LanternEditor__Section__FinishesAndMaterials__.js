/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - FINISHES AND MATERIALS
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__FinishesAndMaterials__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - FinishesAndMaterials
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare exterior and joinery finish swatch controls
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - Emits the descriptor list for the Finishes and Materials accordion section,
     placed before Ventilation in the editor config.
   - EXTERIOR FINISH: the former Frame Finish, shown as colour swatch cards.
     Ridge, hips, eaves, library components and glaze bar CAPS follow this finish.
   - JOINERY PAINT FINISH: the job macro for all interior paint. Changing it
     syncs glaze bar trim, cornice and eaves trim via FinishSync.
   - ADVANCED FINISHES: expandable per-element overrides. Cap finish defaults to
     Exterior Finish; joinery consumers default to Joinery Paint Finish. Diverging
     from either macro surfaces a mixed-finish warning.

   ============================================================================= */

// =============================================================================
// REGION | Finishes and Materials Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__FinishesAndMaterials = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Blocks
    // ------------------------------------------------------------
    const FINISH_BLOCK   =  'Lantern__FinishAndGlazing__Config';
    const BARS_BLOCK     =  'Lantern__GlazingBars__Config';
    const JOINERY_BLOCK  =  'Lantern__InteriorJoinery__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Finishes and Materials Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__FinishesAndMaterials__Build() {
        return [
            {
                Key   : 'exteriorHeading',
                Type  : 'heading',
                Label : 'Exterior Finish'
            },
            {
                Key           : 'exteriorFinish',
                Type          : 'swatchCards',
                Label         : 'Exterior Finish',
                Block         : FINISH_BLOCK,
                Field         : 'Lantern__FinishAndGlazing__Config__FrameFinish',
                OptionsSource : 'finishes',
                AllowEmpty    : false,
                Hint          : 'Job macro for exterior coating. Sets ridge, hips, eaves, library components and glaze bar caps together.'
            },
            {
                Key   : 'joineryHeading',
                Type  : 'heading',
                Label : 'Joinery Finish'
            },
            {
                Key           : 'joineryPaintFinish',
                Type          : 'swatchCards',
                Label         : 'Joinery Paint Finish',
                Block         : FINISH_BLOCK,
                Field         : 'Lantern__FinishAndGlazing__Config__JoineryPaintFinish',
                OptionsSource : 'trimFinishes',
                AllowEmpty    : false,
                Hint          : 'Job macro for interior paint. Sets glaze bar trim, interior cornice and eaves trim together.'
            },
            {
                Key           : 'advancedFinishesOpen',
                Type          : 'expandable',
                Label         : 'Advanced Finishes',
                Block         : FINISH_BLOCK,
                Field         : 'Lantern__FinishAndGlazing__Config__AdvancedFinishesOpen',
                Hint          : 'Per-element control. Changing a finish away from its macro warns about mixed finishes on this job.',
                Children      : [
                    {
                        Key           : 'capFinish',
                        Type          : 'swatchCards',
                        Label         : 'Glaze Bar Cap Finish',
                        Block         : BARS_BLOCK,
                        Field         : 'Lantern__GlazingBars__Config__CapFinish',
                        OptionsSource : 'finishes',
                        AllowEmpty    : false,
                        Hint          : 'External capping only. Defaults to Exterior Finish - core and trim are not affected.'
                    },
                    {
                        Key           : 'trimFinish',
                        Type          : 'swatchCards',
                        Label         : 'Glaze Bar Trim Finish',
                        Block         : BARS_BLOCK,
                        Field         : 'Lantern__GlazingBars__Config__TrimFinish',
                        OptionsSource : 'trimFinishes',
                        AllowEmpty    : false,
                        Hint          : 'Internal glaze bar moulding. Defaults to Joinery Paint Finish.'
                    },
                    {
                        Key           : 'corniceFinish',
                        Type          : 'swatchCards',
                        Label         : 'Interior Cornice Finish',
                        Block         : JOINERY_BLOCK,
                        Field         : 'Lantern__InteriorJoinery__Config__CorniceFinish',
                        OptionsSource : 'trimFinishes',
                        AllowEmpty    : false,
                        Hint          : 'Defaults to Joinery Paint Finish.'
                    },
                    {
                        Key           : 'eavesTrimFinish',
                        Type          : 'swatchCards',
                        Label         : 'Eaves Trim Finish',
                        Block         : JOINERY_BLOCK,
                        Field         : 'Lantern__InteriorJoinery__Config__EavesTrimFinish',
                        OptionsSource : 'trimFinishes',
                        AllowEmpty    : false,
                        Hint          : 'Defaults to Joinery Paint Finish.'
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
        VghLantern__Section__FinishesAndMaterials__Build : VghLantern__Section__FinishesAndMaterials__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__FinishesAndMaterials  =  VghLantern__LanternEditor__Section__FinishesAndMaterials;
