/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - GLAZING BARS
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__GlazingBars__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - GlazingBars
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the bar profile, division mode and division controls
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Glazing Bars accordion section.
   - Division is either a fixed bar count along the long eaves, or a target spacing
     the GlazeBarLayout rounds to a whole number of panes. Only the controls
     belonging to the active mode are shown.
   - There is no separate hip end control. One set-out drives the whole lantern and
     the hip end bars are wrapped from it, which is what makes them converge on the
     hip and ridge points.
   - The bar profile option list comes from the profile library filtered to the
     glazingBar role, so a newly authored section appears here with no code change.

   ============================================================================= */

// =============================================================================
// REGION | Glazing Bars Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__GlazingBars = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Bars Block and Division Mode Values
    // ------------------------------------------------------------
    const BARS_BLOCK    =  'Lantern__GlazingBars__Config';
    const FIELD_MODE    =  'Lantern__GlazingBars__Config__DivisionMode';
    const MODE_SPACING  =  'spacing';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Visibility Predicates
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Current Division Mode
    // ------------------------------------------------------------
    function VghLantern__Section__GlazingBars__DivisionMode(lantern) {
        var block  =  lantern && lantern[BARS_BLOCK];
        return (block && block[FIELD_MODE]) || 'count';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | True When Division Is by Explicit Bar Count
    // ------------------------------------------------------------
    function VghLantern__Section__GlazingBars__IsCountMode(lantern) {
        return VghLantern__Section__GlazingBars__DivisionMode(lantern) !== MODE_SPACING;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | True When Division Is by Target Spacing
    // ------------------------------------------------------------
    function VghLantern__Section__GlazingBars__IsSpacingMode(lantern) {
        return VghLantern__Section__GlazingBars__DivisionMode(lantern) === MODE_SPACING;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Glazing Bars Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__GlazingBars__Build() {
        return [
            {
                Key           : 'barProfileId',
                Type          : 'select',
                Label         : 'Bar Section',
                Block         : BARS_BLOCK,
                Field         : 'Lantern__GlazingBars__Config__BarProfileId',
                OptionsSource : 'profiles:glazingBar',
                Hint          : 'Traced along every rafter and transom in both views.'
            },
            {
                Key           : 'divisionMode',
                Type          : 'select',
                Label         : 'Divide By',
                Block         : BARS_BLOCK,
                Field         : FIELD_MODE,
                OptionsSource : 'divisionModes',
                AllowEmpty    : false
            },
            {
                Key         : 'barCountLongSlope',
                Type        : 'slider',
                Label       : 'Bars - Long Slopes',
                Block       : BARS_BLOCK,
                Field       : 'Lantern__GlazingBars__Config__BarCountLongSlope',
                BoundsKey   : 'BarCountLongSlope',
                Unit        : 'off',
                VisibleWhen : VghLantern__Section__GlazingBars__IsCountMode,
                Hint        : 'Sets out the whole lantern - the hip ends wrap from the same spacing.'
            },
            {
                Key         : 'targetSpacingMm',
                Type        : 'slider',
                Label       : 'Target Spacing',
                Block       : BARS_BLOCK,
                Field       : 'Lantern__GlazingBars__Config__TargetSpacingMm',
                BoundsKey   : 'TargetSpacingMm',
                Unit        : 'mm',
                VisibleWhen : VghLantern__Section__GlazingBars__IsSpacingMode,
                Hint        : 'Rounded to whole panes, so actual spacing will differ slightly.'
            },
            {
                Key   : 'horizontalTransomEnabled',
                Type  : 'toggle',
                Label : 'Horizontal Transom',
                Block : BARS_BLOCK,
                Field : 'Lantern__GlazingBars__Config__HorizontalTransomEnabled',
                Hint  : 'Adds a mid-height bar across each slope.'
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
        VghLantern__Section__GlazingBars__Build : VghLantern__Section__GlazingBars__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__GlazingBars  =  VghLantern__LanternEditor__Section__GlazingBars;
