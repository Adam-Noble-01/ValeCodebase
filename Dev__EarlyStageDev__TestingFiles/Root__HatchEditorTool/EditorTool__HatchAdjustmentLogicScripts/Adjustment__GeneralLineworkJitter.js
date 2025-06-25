// =============================================================================
// VALE DESIGN SUITE - GENERAL LINEWORK JITTER ADJUSTMENT
// =============================================================================
//
// FILE       : Adjustment__GeneralLineworkJitter.js
// NAMESPACE  : HatchEditor
// MODULE     : LineworkJitter
// AUTHOR     : Generated for Vale Design Suite
// PURPOSE    : General linework jitter and organic line generation
// CREATED    : 2025
//
// DESCRIPTION:
// - Provides organic line drawing functions
// - Applies jitter to create hand-drawn appearance
// - Manages line smoothness and variation
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Linework Jitter Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Apply Jitter to Line Coordinates
    // ------------------------------------------------------------
    function applyLineworkJitter(x, y, jitterAmount) {
        const jitterX = (Math.random() - 0.5) * jitterAmount;       // Random X offset
        const jitterY = (Math.random() - 0.5) * jitterAmount;       // Random Y offset
        return { x: x + jitterX, y: y + jitterY };                  // Return jittered coordinates
    }
    // ------------------------------------------------------------

    // FUNCTION | Draw Organic Line with Jitter
    // ------------------------------------------------------------
    function drawOrganicLine(ctx, x1, y1, x2, y2, jitterAmount) {
        const distance = Math.sqrt((x2-x1)**2 + (y2-y1)**2);        // Calculate line length
        const steps = Math.max(3, Math.floor(distance / 15));       // Number of jitter points
        
        ctx.beginPath();                                            // Start new path
        
        for (let i = 0; i <= steps; i++) {                         // Create jitter points
            const t = i / steps;                                    // Interpolation factor
            const x = x1 + (x2 - x1) * t;                          // Interpolate X
            const y = y1 + (y2 - y1) * t;                          // Interpolate Y
            
            // Apply jitter
            const jittered = applyLineworkJitter(x, y, jitterAmount); // Apply jitter
            
            if (i === 0) {
                ctx.moveTo(jittered.x, jittered.y);                 // Move to start
            } else {
                ctx.lineTo(jittered.x, jittered.y);                 // Draw to point
            }
        }
        
        ctx.stroke();                                               // Draw the path
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Utility Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Calculate Jitter Amount from Slider
    // ------------------------------------------------------------
    function getJitterAmount(sliderValue) {
        return (sliderValue / 100) * 8;                             // Map 0-100 to 0-8 pixels
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// Make functions globally available
window.applyLineworkJitter = applyLineworkJitter;
window.drawOrganicLine = drawOrganicLine;
window.getJitterAmount = getJitterAmount;
