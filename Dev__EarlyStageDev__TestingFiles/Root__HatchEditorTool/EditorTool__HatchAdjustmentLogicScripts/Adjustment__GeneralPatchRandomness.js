// =============================================================================
// VALE DESIGN SUITE - GENERAL PATCH RANDOMNESS ADJUSTMENT
// =============================================================================
//
// FILE       : Adjustment__GeneralPatchRandomness.js
// NAMESPACE  : HatchEditor
// MODULE     : PatchRandomness
// AUTHOR     : Generated for Vale Design Suite
// PURPOSE    : Control randomness in patch generation and distribution
// CREATED    : 2025
//
// DESCRIPTION:
// - Controls the randomness of patch properties
// - Manages patch size, shape, and position variations
// - Provides randomization utilities for organic appearance
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Patch Randomness Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Apply Randomness to Patch Properties
    // ------------------------------------------------------------
    function applyPatchRandomness(baseValue, randomnessValue) {
        const randomness = randomnessValue / 100;                    // Normalize to 0-1
        const variation = (Math.random() - 0.5) * 2 * randomness;   // Calculate variation
        return baseValue * (1 + variation);                          // Apply variation
    }
    // ------------------------------------------------------------

    // FUNCTION | Generate Random Patch Position
    // ------------------------------------------------------------
    function generateRandomPatchPosition(x, y, areaWidth, areaHeight, randomnessValue) {
        const randomness = randomnessValue / 100;                    // Normalize to 0-1
        const offsetX = (Math.random() - 0.5) * areaWidth * randomness; // Random X offset
        const offsetY = (Math.random() - 0.5) * areaHeight * randomness; // Random Y offset
        
        return {
            x: x + offsetX,                                          // Return X position
            y: y + offsetY                                           // Return Y position
        };
    }
    // ------------------------------------------------------------

    // FUNCTION | Generate Random Patch Shape
    // ------------------------------------------------------------
    function generateRandomPatchShape(ctx, x, y, baseSize, randomnessValue) {
        const randomness = randomnessValue / 100;                    // Normalize to 0-1
        const size = applyPatchRandomness(baseSize, randomnessValue); // Apply size randomness
        const sides = 3 + Math.floor(Math.random() * 4 * randomness); // Random number of sides
        const rotation = Math.random() * Math.PI * 2;                // Random rotation
        
        ctx.save();                                                  // Save context state
        ctx.translate(x, y);                                         // Move to position
        ctx.rotate(rotation);                                        // Apply rotation
        
        // Draw irregular polygon
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {                           // Draw each side
            const angle = (i / sides) * Math.PI * 2;                // Calculate angle
            const radius = size * (0.5 + Math.random() * randomness); // Vary radius
            const px = Math.cos(angle) * radius;                     // Calculate X
            const py = Math.sin(angle) * radius;                     // Calculate Y
            
            if (i === 0) {
                ctx.moveTo(px, py);                                  // Move to start
            } else {
                ctx.lineTo(px, py);                                  // Draw to point
            }
        }
        ctx.closePath();                                             // Close shape
        
        // Fill with varying opacity
        const opacity = 0.1 + Math.random() * 0.4 * randomness;     // Random opacity
        ctx.fillStyle = `rgba(80, 80, 80, ${opacity})`;             // Set fill color
        ctx.fill();                                                  // Fill patch
        
        ctx.restore();                                               // Restore context state
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Utility Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Get Randomness Factor
    // ------------------------------------------------------------
    function getRandomnessFactor(randomnessValue) {
        return randomnessValue / 100;                                // Return 0-1 factor
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Apply Random Variation
    // ------------------------------------------------------------
    function applyRandomVariation(value, maxVariation, randomnessValue) {
        const randomness = randomnessValue / 100;                    // Normalize to 0-1
        const variation = (Math.random() - 0.5) * 2 * maxVariation * randomness; // Calculate variation
        return Math.max(0, value + variation);                       // Apply variation with minimum 0
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// Make functions globally available
window.applyPatchRandomness = applyPatchRandomness;
window.generateRandomPatchPosition = generateRandomPatchPosition;
window.generateRandomPatchShape = generateRandomPatchShape;
window.getRandomnessFactor = getRandomnessFactor;
window.applyRandomVariation = applyRandomVariation;
