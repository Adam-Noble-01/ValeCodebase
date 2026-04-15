/* =============================================================================
   VALESPEC - HINGE CALCULATOR
   =============================================================================

   FILE       : ValeSpec__MathUtils__HingeCalculator__.js
   NAMESPACE  : ValeSpec
   MODULE     : MathUtils - HingeCalculator
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Calculate hinge count and hanging type per door leaf
   CREATED    : 2026

   DESCRIPTION:
   - Determines hinge count and hanging arrangement based on door type,
     width, and height dimensions
   - Single doors use a 940mm width threshold
   - Double/multi-leaf doors use a 1800mm width threshold
   - Returns { count, hanging } for each leaf

   ============================================================================= */

// =============================================================================
// REGION | Hinge Calculator Module
// =============================================================================

const ValeSpec__MathUtils__HingeCalculator = (function() {

    // MODULE CONSTANTS | Threshold Values
    // ------------------------------------------------------------
    const SINGLE_WIDTH_THRESHOLD  =  940;                                   // <-- Width threshold for single doors
    const MULTI_WIDTH_THRESHOLD   =  1800;                                  // <-- Width threshold for multi-leaf doors
    const WIDE_LEAF_THRESHOLD     =  950;                                   // <-- Leaf width for Double Top hanging
    const TALL_DOOR_THRESHOLD     =  2200;                                  // <-- Height threshold for extra hinge
    // ------------------------------------------------------------


    // FUNCTION | Calculate Hinges Per Leaf
    // ------------------------------------------------------------
    function ValeSpec__HingeCalculator__CalculateHingesPerLeaf(doorType, width_mm, height_mm) {
        var widthThreshold  =  MULTI_WIDTH_THRESHOLD;                       // <-- Default to multi-leaf

        if (doorType && doorType.indexOf('Single') !== -1) {
            widthThreshold  =  SINGLE_WIDTH_THRESHOLD;                      // <-- Use single door threshold
        }

        if (width_mm > WIDE_LEAF_THRESHOLD) {
            return { count: 4, hanging: 'Double Top' };                     // <-- Wide leaf needs 4 hinges
        }

        if (height_mm < TALL_DOOR_THRESHOLD && width_mm < widthThreshold) {
            return { count: 3, hanging: 'Standard' };                       // <-- Standard 3-hinge arrangement
        }

        if (height_mm >= TALL_DOOR_THRESHOLD && width_mm < widthThreshold) {
            return { count: 4, hanging: 'Standard' };                       // <-- Tall door needs 4 hinges
        }

        return { count: 3, hanging: 'Standard' };                          // <-- Default fallback
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__HingeCalculator__CalculateHingesPerLeaf  : ValeSpec__HingeCalculator__CalculateHingesPerLeaf
    };

})();

// endregion ===================================================================

window.ValeSpec__MathUtils__HingeCalculator  =  ValeSpec__MathUtils__HingeCalculator;
