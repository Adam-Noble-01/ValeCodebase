/* =============================================================================
   VALESPEC - LOCKING CALCULATOR
   =============================================================================

   FILE       : ValeSpec__MathUtils__LockingCalculator__.js
   NAMESPACE  : ValeSpec
   MODULE     : MathUtils - LockingCalculator
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Calculate locking points, type, top bolt, and extensions
   CREATED    : 2026

   DESCRIPTION:
   - Determines multi-point locking configuration based on door type and height
   - Double doors: 5-point locking, no top bolt
   - Single doors: 3-point locking, top bolt required above 2400mm
   - Extensions: 'Extended' if height exceeds 2200mm

   ============================================================================= */

// =============================================================================
// REGION | Locking Calculator Module
// =============================================================================

const ValeSpec__MathUtils__LockingCalculator = (function() {

    // MODULE CONSTANTS | Threshold Values
    // ------------------------------------------------------------
    const EXTENSION_HEIGHT_THRESHOLD  =  2200;                              // <-- Height threshold for extended lock rods
    const TOP_BOLT_HEIGHT_THRESHOLD   =  2400;                              // <-- Height threshold for top bolt on singles
    // ------------------------------------------------------------


    // HELPER FUNCTION | Determine Extension Type
    // ------------------------------------------------------------
    function _getExtensionType(height_mm) {
        if (height_mm > EXTENSION_HEIGHT_THRESHOLD) {
            return 'Extended';                                              // <-- Taller doors need extended rods
        }
        return 'Standard';                                                  // <-- Standard rod length sufficient
    }
    // ------------------------------------------------------------


    // FUNCTION | Calculate Locking Configuration
    // ------------------------------------------------------------
    function calculateLocking(doorType, height_mm) {
        var extensions  =  _getExtensionType(height_mm);

        if (doorType && doorType.indexOf('Double') !== -1) {
            return {
                points       : 5,                                           // <-- 5-point for double doors
                type         : 'Multi-Point',
                needsTopBolt : false,                                       // <-- Double doors have slave leaf bolt
                extensions   : extensions
            };
        }

        if (doorType && doorType.indexOf('Single') !== -1) {
            return {
                points       : 3,                                           // <-- 3-point for single doors
                type         : 'Multi-Point',
                needsTopBolt : (height_mm > TOP_BOLT_HEIGHT_THRESHOLD),     // <-- Top bolt for very tall singles
                extensions   : extensions
            };
        }

        return {
            points       : 3,                                               // <-- Default fallback
            type         : 'Multi-Point',
            needsTopBolt : false,
            extensions   : extensions
        };
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        calculateLocking  : calculateLocking
    };

})();

// endregion ===================================================================

window.ValeSpec__MathUtils__LockingCalculator  =  ValeSpec__MathUtils__LockingCalculator;
