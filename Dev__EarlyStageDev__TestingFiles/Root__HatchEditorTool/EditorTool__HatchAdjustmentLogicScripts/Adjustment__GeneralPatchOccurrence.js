// =============================================================================
// VALE DESIGN SUITE - GENERAL PATCH OCCURRENCE ADJUSTMENT
// =============================================================================
//
// FILE       : Adjustment__GeneralPatchOccurrence.js
// NAMESPACE  : HatchEditor
// MODULE     : PatchOccurrence
// AUTHOR     : Generated for Vale Design Suite
// PURPOSE    : Manage patch occurrence and distribution in patterns
// CREATED    : 2025
//
// DESCRIPTION:
// - Controls how often patches/irregularities appear in patterns
// - Manages patch distribution and frequency
// - Provides patch generation utilities
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Patch Occurrence Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Calculate Patch Probability
    // ------------------------------------------------------------
    function calculatePatchProbability(occurrenceValue) {
        return (occurrenceValue / 100) * 0.3;                       // Map 0-100 to 0-0.3 probability
    }
    // ------------------------------------------------------------

    // FUNCTION | Should Create Patch at Position
    // ------------------------------------------------------------
    function shouldCreatePatch(x, y, occurrenceValue) {
        const probability = calculatePatchProbability(occurrenceValue); // Get probability
        return Math.random() < probability;                          // Return true if random < probability
    }
    // ------------------------------------------------------------

    // FUNCTION | Generate Patch at Position
    // ------------------------------------------------------------
    function generatePatch(ctx, x, y, size, randomness) {
        const patchSize = size * (0.8 + Math.random() * 0.4);       // Vary patch size
        const angle = Math.random() * Math.PI * 2;                   // Random rotation
        
        ctx.save();                                                  // Save context state
        ctx.translate(x, y);                                         // Move to position
        ctx.rotate(angle);                                           // Apply rotation
        
        // Draw irregular patch shape
        ctx.beginPath();
        const sides = 4 + Math.floor(Math.random() * 3);            // 4-6 sides
        for (let i = 0; i < sides; i++) {                           // Draw each side
            const angle = (i / sides) * Math.PI * 2;                // Calculate angle
            const radius = patchSize * (0.7 + Math.random() * 0.6); // Vary radius
            const px = Math.cos(angle) * radius;                     // Calculate X
            const py = Math.sin(angle) * radius;                     // Calculate Y
            
            if (i === 0) {
                ctx.moveTo(px, py);                                  // Move to start
            } else {
                ctx.lineTo(px, py);                                  // Draw to point
            }
        }
        ctx.closePath();                                             // Close shape
        
        // Fill with semi-transparent color
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';                 // Set fill color
        ctx.fill();                                                  // Fill patch
        
        ctx.restore();                                               // Restore context state
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Utility Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get Patch Size from Parameters
    // ------------------------------------------------------------
    function getPatchSize(baseSize, randomness) {
        return baseSize * (0.5 + Math.random() * randomness);        // Vary patch size
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// Make functions globally available
window.calculatePatchProbability = calculatePatchProbability;
window.shouldCreatePatch = shouldCreatePatch;
window.generatePatch = generatePatch;
window.getPatchSize = getPatchSize;
