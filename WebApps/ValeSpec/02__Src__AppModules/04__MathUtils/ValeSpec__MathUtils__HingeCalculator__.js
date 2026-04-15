/* =============================================================================
   VALESPEC - HINGE CALCULATOR
   =============================================================================

   FILE       : ValeSpec__MathUtils__HingeCalculator__.js
   NAMESPACE  : ValeSpec
   MODULE     : MathUtils - HingeCalculator
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Calculate hinge count and hanging type per door leaf
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Determines hinge count and hanging arrangement based on door type,
     width, and height dimensions
   - Single doors use 949mm/950mm standard-vs-wide thresholds
   - Double doors use 1899mm/1900mm standard-vs-wide thresholds
   - Returns { count, hanging } for each leaf

   ============================================================================= */

// =============================================================================
// REGION | Hinge Calculator Module
// =============================================================================

const ValeSpec__MathUtils__HingeCalculator = (function() {

    // MODULE CONSTANTS | Threshold Values
    // ------------------------------------------------------------
    const SINGLE_WIDTH_MAX_STANDARD  =  949;                                // <-- Max single width for standard (3/4 hinge) rules
    const DOUBLE_WIDTH_MAX_STANDARD  =  1899;                               // <-- Max double-set width for standard (3/4 hinge) rules
    const WIDE_SINGLE_THRESHOLD      =  950;                                // <-- Single width at/above requires Double Top
    const WIDE_DOUBLE_THRESHOLD      =  1900;                               // <-- Double overall width at/above requires Double Top
    const TALL_DOOR_THRESHOLD        =  2250;                               // <-- Height threshold for 4-hinge standard
    // ------------------------------------------------------------


    // FUNCTION | Calculate Hinges Per Leaf
    // ------------------------------------------------------------
    function ValeSpec__HingeCalculator__CalculateHingesPerLeaf(doorType, width_mm, height_mm) {
        var safeDoorType  =  (doorType || '').toLowerCase();
        var isSingleDoor  =  safeDoorType.indexOf('single') !== -1;

        var widthStandardMax  =  isSingleDoor ? SINGLE_WIDTH_MAX_STANDARD : DOUBLE_WIDTH_MAX_STANDARD;
        var wideThreshold     =  isSingleDoor ? WIDE_SINGLE_THRESHOLD     : WIDE_DOUBLE_THRESHOLD;

        if (width_mm >= wideThreshold) {
            return { count: 4, hanging: 'Double Top', condition: 'DOUBLE_TOP_4_HINGES' }; // <-- Wide door rule (leaf basis)
        }

        if (height_mm > TALL_DOOR_THRESHOLD && width_mm <= widthStandardMax) {
            return { count: 4, hanging: 'Standard', condition: 'TALL_STANDARD_4_HINGES' }; // <-- Tall but not wide
        }

        if (height_mm <= TALL_DOOR_THRESHOLD && width_mm <= widthStandardMax) {
            return { count: 3, hanging: 'Standard', condition: 'STANDARD_3_HINGES' };      // <-- Standard 3-hinge condition
        }

        return { count: 4, hanging: 'Standard', condition: 'SUBJECT_TO_REVIEW' };          // <-- Fallback review condition
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
