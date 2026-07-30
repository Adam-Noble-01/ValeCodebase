/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - VENTILATION
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__Ventilation__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - Ventilation
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the opening vent selection, count and operation controls
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Ventilation accordion section.
   - The section is one expandable group because most lanterns are fixed light; an
     unvented lantern shows a single row.
   - Vent count feeds the specification takeoff and the warning system, which flags
     a count that cannot be fitted into the available panes.
   - Operation types are config-driven so adding an actuator range is a JSON edit.

   ============================================================================= */

// =============================================================================
// REGION | Ventilation Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__Ventilation = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Ventilation Block Name
    // ------------------------------------------------------------
    const VENT_BLOCK  =  'Lantern__Ventilation__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Ventilation Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__Ventilation__Build() {
        return [
            {
                Key      : 'ventilationEnabled',
                Type     : 'expandable',
                Label    : 'Opening Vents',
                Block    : VENT_BLOCK,
                Field    : 'Lantern__Ventilation__Config__Enabled',
                Children : [
                    {
                        Key           : 'ventComponentId',
                        Type          : 'select',
                        Label         : 'Vent Type',
                        Block         : VENT_BLOCK,
                        Field         : 'Lantern__Ventilation__Config__VentComponentId',
                        OptionsSource : 'components:vent'
                    },
                    {
                        Key       : 'ventCount',
                        Type      : 'slider',
                        Label     : 'Number of Vents',
                        Block     : VENT_BLOCK,
                        Field     : 'Lantern__Ventilation__Config__VentCount',
                        BoundsKey : 'VentCount',
                        Unit      : 'off'
                    },
                    {
                        Key           : 'ventOperationType',
                        Type          : 'select',
                        Label         : 'Operation',
                        Block         : VENT_BLOCK,
                        Field         : 'Lantern__Ventilation__Config__OperationType',
                        OptionsSource : 'ventOperationTypes'
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
        VghLantern__Section__Ventilation__Build : VghLantern__Section__Ventilation__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__Ventilation  =  VghLantern__LanternEditor__Section__Ventilation;
