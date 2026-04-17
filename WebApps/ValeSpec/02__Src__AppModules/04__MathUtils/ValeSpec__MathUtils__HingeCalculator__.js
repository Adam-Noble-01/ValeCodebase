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
   - Single doors use 1000mm standard-vs-wide thresholds
   - Double doors use 1800mm standard-vs-wide thresholds
   - Returns { count, hanging } for each leaf
   - Calculates hinge vertical positions

   ============================================================================= */

// =============================================================================
// REGION | Hinge Calculator Module
// =============================================================================

const ValeSpec__MathUtils__HingeCalculator = (function() {

    // MODULE CONSTANTS | Threshold Values
    // ------------------------------------------------------------
    const WIDE_SINGLE_THRESHOLD      =  1000;                               // <-- Single width at/above requires Double Top
    const WIDE_DOUBLE_THRESHOLD      =  1800;                               // <-- Double overall width at/above requires Double Top
    const TALL_DOOR_THRESHOLD        =  2200;                               // <-- Height threshold for 4-hinge standard
    // ------------------------------------------------------------


    // FUNCTION | Calculate Hinges Per Leaf
    // ------------------------------------------------------------
    function ValeSpec__HingeCalculator__CalculateHingesPerLeaf(doorType, width_mm, height_mm) {
        var safeDoorType  =  (doorType || '').toLowerCase();
        var isSingleDoor  =  safeDoorType.indexOf('single') !== -1;

        var wideThreshold     =  isSingleDoor ? WIDE_SINGLE_THRESHOLD     : WIDE_DOUBLE_THRESHOLD;

        if (width_mm >= wideThreshold) {
            return { count: 4, hanging: 'Double Top', condition: 'DOUBLE_TOP_4_HINGES' }; // <-- Wide door rule (leaf basis)
        }

        if (height_mm >= TALL_DOOR_THRESHOLD && width_mm < wideThreshold) {
            return { count: 4, hanging: 'Standard', condition: 'TALL_STANDARD_4_HINGES' }; // <-- Tall but not wide
        }

        if (height_mm < TALL_DOOR_THRESHOLD && width_mm < wideThreshold) {
            return { count: 3, hanging: 'Standard', condition: 'STANDARD_3_HINGES' };      // <-- Standard 3-hinge condition
        }

        return { count: 4, hanging: 'Standard', condition: 'SUBJECT_TO_REVIEW' };          // <-- Fallback review condition
    }
    // ------------------------------------------------------------


    // FUNCTION | Calculate Hinge Positions
    // ------------------------------------------------------------
    function ValeSpec__HingeCalculator__CalculateHingePositions(height_mm, hingeCount) {
        var positions = [];
        if (hingeCount < 2) return positions;

        var topY = height_mm - 201;
        var bottomY = 251;
        
        positions.push(topY);
        
        var remainingHinges = hingeCount - 2;
        if (remainingHinges > 0) {
            var spacing = (topY - bottomY) / (remainingHinges + 1);
            for (var i = 1; i <= remainingHinges; i++) {
                positions.push(topY - (spacing * i));
            }
        }
        
        positions.push(bottomY);
        
        return positions;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__HingeCalculator__CalculateHingesPerLeaf  : ValeSpec__HingeCalculator__CalculateHingesPerLeaf,
        ValeSpec__HingeCalculator__CalculateHingePositions : ValeSpec__HingeCalculator__CalculateHingePositions
    };

})();

// endregion ===================================================================

window.ValeSpec__MathUtils__HingeCalculator  =  ValeSpec__MathUtils__HingeCalculator;
