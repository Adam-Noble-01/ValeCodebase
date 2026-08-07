/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - GLAZE BARS
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__GlazeBars__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - GlazeBars
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the glaze bar division and trim depth controls
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - Emits the descriptor list for the Glaze Bars accordion section, which
     replaces the old Glazing Bars section and its bar-profile dropdown.
   - There is no longer a section to choose. A Vale glaze bar is a fixed assembly
     of a powder coated cap over an aluminium core, and both are always fitted,
     so offering them as options would be offering a choice that does not exist.
     The one real decision inside the bar is how deep the internal timber trim
     runs, and that is what this section asks.
   - The trim is chosen from picture cards rather than a dropdown, for the same
     reason finials are: three numbers in a list ask the user to picture a
     moulding, and each card instead draws the whole assembled bar - cap, core
     and that trim - so the depths are compared as the shapes they are.
   - Division is always by target spacing, which the GlazeBarLayout rounds to a
     whole number of panes.
   - There is no separate hip end control. One set-out drives the whole lantern and
     the hip end bars are wrapped from it, which is what makes them converge on the
     hip and ridge points.
   - The two finishes close the section, because a bar has two finished faces and
     they are separate decisions made by different people. The cap is outside the
     roof, seen from the garden, and is powder coated. The trim is inside the room,
     seen from the sofa, and is either bare timber or painted joinery. The core
     between them is never finished at all because it is never seen.
   - The cap does NOT follow the lantern frame finish. The frame is painted joinery
     and the outside of the roof is dressed in lead flashing, so what the frame is
     painted has no bearing on the capping above it.

   ============================================================================= */

// =============================================================================
// REGION | Glaze Bars Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__GlazeBars = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Bars Block
    // ------------------------------------------------------------
    // The stored block is still named GlazingBars while the section the user sees
    // is called Glaze Bars. Renaming a persisted key would force a migration over
    // every saved project on disk to change a name that appears nowhere but in
    // the file, so the label moved and the key did not.
    const BARS_BLOCK    =  'Lantern__GlazingBars__Config';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Glaze Bars Control Descriptors
    // ------------------------------------------------------------
    function VghLantern__Section__GlazeBars__Build() {
        return [
            {
                Key           : 'trimOptionId',
                Type          : 'cards',
                Label         : 'Glaze Bar Trim',
                Block         : BARS_BLOCK,
                Field         : 'Lantern__GlazingBars__Config__TrimOptionId',
                OptionsSource : 'glazeBarTrims',
                AllowEmpty    : false,
                Hint          : 'The internal joinery moulding. Each card shows the whole bar: cap, core and that trim.'
            },
            {
                Key         : 'targetSpacingMm',
                Type        : 'slider',
                Label       : 'Target Spacing',
                Block       : BARS_BLOCK,
                Field       : 'Lantern__GlazingBars__Config__TargetSpacingMm',
                BoundsKey   : 'TargetSpacingMm',
                Unit        : 'mm',
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
        VghLantern__Section__GlazeBars__Build : VghLantern__Section__GlazeBars__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__GlazeBars  =  VghLantern__LanternEditor__Section__GlazeBars;
