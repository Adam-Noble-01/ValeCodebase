/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - ROOF PITCH
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__RoofPitch__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - RoofPitch
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the pitch drive mode and its one dependent control
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Roof Pitch accordion section.
   - Pitch is driven either by angle or by ridge rise. Both values live in the
     project file, but only the one matching the drive mode is authoritative - the
     RoofPitchCalculator derives the other. Showing both editable at once would
     invite contradictory input, so the descriptors gate on drive mode.

   -----------------------------------------------------------------------------

   WHY TWO STORED VALUES FOR ONE PROPERTY:
   Staff think in degrees when talking to clients and in rise when checking a
   lantern will clear a lintel. Storing both, with the drive mode recording which
   one the user set, means switching mode never loses the number they typed.

   ============================================================================= */

// =============================================================================
// REGION | Roof Pitch Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__RoofPitch = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Pitch Block and Drive Mode Values
    // ------------------------------------------------------------
    const PITCH_BLOCK  =  'Lantern__RoofPitch__Config';
    const FIELD_MODE   =  'Lantern__RoofPitch__Config__DriveMode';
    const MODE_RISE    =  'rise';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visibility Predicates
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Current Pitch Drive Mode
    // ------------------------------------------------------------
    function VghLantern__Section__RoofPitch__DriveMode(lantern) {
        var block  =  lantern && lantern[PITCH_BLOCK];
        return (block && block[FIELD_MODE]) || 'angle';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | True When Pitch Is Driven by Angle
    // ------------------------------------------------------------
    function VghLantern__Section__RoofPitch__IsAngleMode(lantern) {
        return VghLantern__Section__RoofPitch__DriveMode(lantern) !== MODE_RISE;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | True When Pitch Is Driven by Ridge Rise
    // ------------------------------------------------------------
    function VghLantern__Section__RoofPitch__IsRiseMode(lantern) {
        return VghLantern__Section__RoofPitch__DriveMode(lantern) === MODE_RISE;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Roof Pitch Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__RoofPitch__Build() {
        return [
            {
                Key           : 'pitchDriveMode',
                Type          : 'select',
                Label         : 'Driven By',
                Block         : PITCH_BLOCK,
                Field         : FIELD_MODE,
                OptionsSource : 'pitchDriveModes',
                AllowEmpty    : false,
                Hint          : 'The value you set; the other is derived from it.'
            },
            {
                Key         : 'pitchDegrees',
                Type        : 'slider',
                Label       : 'Pitch Angle',
                Block       : PITCH_BLOCK,
                Field       : 'Lantern__RoofPitch__Config__PitchDegrees',
                BoundsKey   : 'PitchDegrees',
                Unit        : 'deg',
                Decimals    : 1,
                VisibleWhen : VghLantern__Section__RoofPitch__IsAngleMode
            },
            {
                Key         : 'ridgeRiseMm',
                Type        : 'slider',
                Label       : 'Ridge Rise',
                Block       : PITCH_BLOCK,
                Field       : 'Lantern__RoofPitch__Config__RidgeRiseMm',
                BoundsKey   : 'RidgeRiseMm',
                Unit        : 'mm',
                VisibleWhen : VghLantern__Section__RoofPitch__IsRiseMode,
                Hint        : 'Vertical rise from eaves line to ridge line.'
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
        VghLantern__Section__RoofPitch__Build : VghLantern__Section__RoofPitch__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__RoofPitch  =  VghLantern__LanternEditor__Section__RoofPitch;
