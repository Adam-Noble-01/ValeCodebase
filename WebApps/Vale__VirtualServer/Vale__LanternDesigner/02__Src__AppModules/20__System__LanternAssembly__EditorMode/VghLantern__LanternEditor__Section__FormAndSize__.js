/* =============================================================================
   VGHLANTERN - LANTERN EDITOR | SECTION - FORM AND SIZE
   =============================================================================

   FILE       : VghLantern__LanternEditor__Section__FormAndSize__.js
   NAMESPACE  : VghLantern
   MODULE     : System - LanternEditor - Section - FormAndSize
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Declare the roof form, set out, overall size and pitch controls
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Emits the descriptor list for the Form and Size accordion section.
   - Roof form drives which members the SkeletonSolver produces, so it sits first,
     in a group of its own that starts closed and shows the chosen form on its
     header (20-Oct-2026, Adam: "Put roof form in a nested collapsed by default
     section"; its hint went with it). It is set once and rarely revisited.
   - Quantity is retired (20-Oct-2026): a further identical lantern is a
     Duplicate, so each has its own name and number for the cut sheets and its
     parts can be tracked, rather than one lantern "times x".
   - Length is the long plan axis, width the short one (20-Oct-2026: the same words
     the Creation Wizard always used; before that the editor said Width and Depth).
     The stored keys did not move: Length writes WidthMm and Width writes DepthMm.
   - SET OUT TO (20-Oct-2026): three section diagram cards in one row say where the
     length and width are measured to - the finished exterior of the builders
     upstand (the standard, including the builder's roof covering), the eaves
     datum, or the internal upstand. The chosen card is ticked and the others
     fade. Picking the eaves datum or the internal upstand greys Length and Width
     out (they still show the exterior the lantern is ordered as, now worked out)
     and puts that basis's own Length and Width under them. Switching never moves
     the lantern; the geometry and the rules live in
     VghLantern__Geometry__PlanSizeBasis.
   - Why so few words: Adam saw the first build (a figure with a caption, an
     Advanced Lantern Sizes switch nesting two cards, a hint under every slider)
     and asked for "all 3 diagrams inline" with the nesting and "all the text"
     gone. The cards' pictures carry the meaning; the longer explanation is each
     card's tooltip.
   - Roof pitch follows the sizes because it is the third number that fixes the
     shape: with the plan size set, the pitch is what decides how tall the roof
     stands. It is the only thing that drives roof height.
   - Pure data. No DOM, no lantern mutation, no config duplication.

   ============================================================================= */

// =============================================================================
// REGION | Form and Size Section Module
// =============================================================================

const VghLantern__LanternEditor__Section__FormAndSize = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Dimensions Block
    // ------------------------------------------------------------
    const DIMS_BLOCK  =  'Lantern__Dimensions__Config';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Plan Size Basis Values
    // ------------------------------------------------------------
    // The stored values VghLantern__Geometry__PlanSizeBasis defines, written out
    // here only because the visibility rules below compare against them.
    const BASIS_EXTERNAL_UPSTAND  =  'externalUpstand';
    const BASIS_EAVES_DATUM       =  'eavesDatum';
    const BASIS_INTERNAL_UPSTAND  =  'internalUpstand';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Plan Size Basis Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Plan Size Basis Geometry Module, if Loaded
    // ------------------------------------------------------------
    function VghLantern__Section__FormAndSize__PlanSizeBasis() {
        return window.VghLantern__Geometry__PlanSizeBasis || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Basis Governing This Lantern's Size
    // ------------------------------------------------------------
    // The exterior before the geometry module loads, which is what every lantern
    // was before the choice existed.
    function VghLantern__Section__FormAndSize__Basis(lantern) {
        var PlanSizeBasis  =  VghLantern__Section__FormAndSize__PlanSizeBasis();
        return PlanSizeBasis ? PlanSizeBasis.VghLantern__PlanSizeBasis__GoverningBasis(lantern) : BASIS_EXTERNAL_UPSTAND;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | True When the Eaves Datum or Internal Upstand Governs
    // ------------------------------------------------------------
    // The ReadOnlyWhen rule of the two exterior sliders.
    function VghLantern__Section__FormAndSize__IsAdvanced(lantern) {
        return VghLantern__Section__FormAndSize__Basis(lantern) !== BASIS_EXTERNAL_UPSTAND;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Slider Bounds Shift for a Basis
    // ------------------------------------------------------------
    // Asked of the geometry module, which owns the insets, so the eaves datum and
    // internal upstand sliders run over exactly the sizes whose exterior the
    // exterior sliders would accept.
    function VghLantern__Section__FormAndSize__BoundsOffset(lantern, basisKey) {
        var PlanSizeBasis  =  VghLantern__Section__FormAndSize__PlanSizeBasis();
        return PlanSizeBasis ? PlanSizeBasis.VghLantern__PlanSizeBasis__BoundsOffsetMm(lantern, basisKey) : 0;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Visibility Rules for the Two Pairs of Governing Sliders
    // ------------------------------------------------------------
    function VghLantern__Section__FormAndSize__IsEavesDatum(lantern) {
        return VghLantern__Section__FormAndSize__Basis(lantern) === BASIS_EAVES_DATUM;
    }

    function VghLantern__Section__FormAndSize__IsInternalUpstand(lantern) {
        return VghLantern__Section__FormAndSize__Basis(lantern) === BASIS_INTERNAL_UPSTAND;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | True for a Lantern Saved With a Quantity Above 1
    // ------------------------------------------------------------
    // The retired Quantity slider's VisibleWhen. Read, never written.
    function VghLantern__Section__FormAndSize__HasLegacyQuantity(lantern) {
        var identity  =  lantern ? lantern['Lantern__Identity__Config'] : null;
        return !!identity && Number(identity['Lantern__Identity__Config__Quantity']) > 1;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Descriptor Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Form and Size Control Descriptors
    // ------------------------------------------------------------
    // Takes the lantern because the governing sliders' bounds depend on it (the
    // internal upstand's on the upstand thickness). The panel rebuilds its
    // descriptors on every render, so they never go stale against a basis switch,
    // which is itself a rebuild.
    //
    // THE AXIS TRAP: each "Length" slider writes a ...WidthMm key and each "Width"
    // slider a ...DepthMm key, the schema's long and short axes.
    function VghLantern__Section__FormAndSize__Build(lantern) {
        return [
            {
                Key         : 'roofFormGroup',
                Type        : 'collapsible',
                Label       : 'Roof Form',
                SummaryFrom : 'roofForm',
                Children    : [
                    {
                        Key           : 'roofForm',
                        Type          : 'select',
                        Label         : 'Roof Form',
                        Block         : 'Lantern__Form__Config',
                        Field         : 'Lantern__Form__Config__RoofForm',
                        OptionsSource : 'roofForms',
                        AllowEmpty    : false
                    }
                ]
            },
            {
                Key           : 'sizeBasis',
                Type          : 'cards',
                Label         : 'Set Out To',
                Block         : DIMS_BLOCK,
                Field         : 'Lantern__Dimensions__Config__SizeBasis',
                OptionsSource : 'planSizeBases',
                CardLayout    : 'diagram',
                SelectedTick  : true,
                AllowEmpty    : false
            },
            {
                Key          : 'widthMm',
                Type         : 'slider',
                Label        : 'Length',
                Block        : DIMS_BLOCK,
                Field        : 'Lantern__Dimensions__Config__WidthMm',
                BoundsKey    : 'WidthMm',
                Unit         : 'mm',
                ReadOnlyWhen : VghLantern__Section__FormAndSize__IsAdvanced
            },
            {
                Key          : 'depthMm',
                Type         : 'slider',
                Label        : 'Width',
                Block        : DIMS_BLOCK,
                Field        : 'Lantern__Dimensions__Config__DepthMm',
                BoundsKey    : 'DepthMm',
                Unit         : 'mm',
                ReadOnlyWhen : VghLantern__Section__FormAndSize__IsAdvanced
            },
            {
                Key            : 'eavesDatumWidthMm',
                Type           : 'slider',
                Label          : 'Eaves Datum Length',
                Block          : DIMS_BLOCK,
                Field          : 'Lantern__Dimensions__Config__EavesDatumWidthMm',
                BoundsKey      : 'WidthMm',
                BoundsOffsetMm : VghLantern__Section__FormAndSize__BoundsOffset(lantern, BASIS_EAVES_DATUM),
                Unit           : 'mm',
                VisibleWhen    : VghLantern__Section__FormAndSize__IsEavesDatum
            },
            {
                Key            : 'eavesDatumDepthMm',
                Type           : 'slider',
                Label          : 'Eaves Datum Width',
                Block          : DIMS_BLOCK,
                Field          : 'Lantern__Dimensions__Config__EavesDatumDepthMm',
                BoundsKey      : 'DepthMm',
                BoundsOffsetMm : VghLantern__Section__FormAndSize__BoundsOffset(lantern, BASIS_EAVES_DATUM),
                Unit           : 'mm',
                VisibleWhen    : VghLantern__Section__FormAndSize__IsEavesDatum
            },
            {
                Key            : 'internalUpstandWidthMm',
                Type           : 'slider',
                Label          : 'Internal Upstand Length',
                Block          : DIMS_BLOCK,
                Field          : 'Lantern__Dimensions__Config__InternalUpstandWidthMm',
                BoundsKey      : 'WidthMm',
                BoundsOffsetMm : VghLantern__Section__FormAndSize__BoundsOffset(lantern, BASIS_INTERNAL_UPSTAND),
                Unit           : 'mm',
                VisibleWhen    : VghLantern__Section__FormAndSize__IsInternalUpstand
            },
            {
                Key            : 'internalUpstandDepthMm',
                Type           : 'slider',
                Label          : 'Internal Upstand Width',
                Block          : DIMS_BLOCK,
                Field          : 'Lantern__Dimensions__Config__InternalUpstandDepthMm',
                BoundsKey      : 'DepthMm',
                BoundsOffsetMm : VghLantern__Section__FormAndSize__BoundsOffset(lantern, BASIS_INTERNAL_UPSTAND),
                Unit           : 'mm',
                VisibleWhen    : VghLantern__Section__FormAndSize__IsInternalUpstand
            },
            {
                Key       : 'pitchDegrees',
                Type      : 'slider',
                Label     : 'Roof Pitch',
                Block     : 'Lantern__RoofPitch__Config',
                Field     : 'Lantern__RoofPitch__Config__PitchDegrees',
                BoundsKey : 'PitchDegrees',
                Unit      : 'deg',
                Decimals  : 1
            },
            // The Eaves Projection slider is RETIRED: the roof springs from the
            // eaves datum on the head beam inner face, and the overhangs at the
            // eaves are fixed by the Vale product (glaze bar cap +170mm along
            // the pitch past the datum), not by a configurable projection.
            //
            // The Quantity slider is RETIRED too (20-Oct-2026): a second identical
            // lantern is a Duplicate (the tab's right click menu, or the button
            // beside + Lantern), so each one has its own name, number and drawing
            // and its parts can be tracked. It shows only on a lantern saved with a
            // Quantity above 1, so that one can be set back to 1; the takeoff
            // still multiplies by it until it is, so no saved total moves.
            {
                Key         : 'quantity',
                Type        : 'slider',
                Label       : 'Quantity',
                Block       : 'Lantern__Identity__Config',
                Field       : 'Lantern__Identity__Config__Quantity',
                BoundsKey   : 'Quantity',
                Unit        : 'off',
                Hint        : 'Retired: set to 1 and use Duplicate for each further lantern.',
                VisibleWhen : VghLantern__Section__FormAndSize__HasLegacyQuantity
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
        VghLantern__Section__FormAndSize__Build : VghLantern__Section__FormAndSize__Build
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__LanternEditor__Section__FormAndSize  =  VghLantern__LanternEditor__Section__FormAndSize;
