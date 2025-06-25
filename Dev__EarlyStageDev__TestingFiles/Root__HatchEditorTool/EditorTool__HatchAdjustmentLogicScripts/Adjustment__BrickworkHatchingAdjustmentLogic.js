// =============================================================================
// VALE DESIGN SUITE - BRICKWORK HATCHING ADJUSTMENT LOGIC
// =============================================================================
//
// FILE       : Adjustment__BrickworkHatchingAdjustmentLogic.js
// NAMESPACE  : HatchEditor
// MODULE     : BrickworkAdjustment
// AUTHOR     : Generated for Vale Design Suite
// PURPOSE    : Brickwork-specific hatching logic and rendering
// CREATED    : 2025
//
// DESCRIPTION:
// - Implements brickwork pattern generation with organic variations
// - Handles brick length and height adjustments
// - Applies randomness to create hand-drawn appearance
// - Manages mortar joint rendering
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Brickwork Pattern Rendering
// -----------------------------------------------------------------------------

    // FUNCTION | Render Brickwork Pattern on Canvas
    // ------------------------------------------------------------
    function renderBrickworkPattern(ctx, pattern, parameters, dxfData) {
        const components = pattern.PatternComponents;                // Get pattern components
        const brick = components["Brick__Standard_MetricBrick"];     // Get brick definition
        const perpJoint = components["MortarJoint__PerpendicularJoint"]; // Get perp joint
        const bedJoint = components["MortarJoint__BedJoint"];        // Get bed joint
        
        // Extract parameters with defaults
        const brickLength = mapSliderValue(parameters["Adjustment__BrickLength"] || 50, 180, 250);
        const brickHeight = mapSliderValue(parameters["Adjustment__BrickHeight"] || 50, 50, 90);
        const randomness = (parameters["Adjustment__BrickworkRandomness"] || 50) / 100;
        const jitter = (parameters["Adjustment__GeneralLineworkJitter"] || 50) / 100;
        
        // Calculate pattern area
        const bounds = dxfData.bounds;                              // Get boundary box
        const startX = bounds.minX;                                 // Pattern start X
        const startY = bounds.minY;                                 // Pattern start Y
        const endX = bounds.maxX;                                   // Pattern end X
        const endY = bounds.maxY;                                   // Pattern end Y
        
        // Render brick courses
        let currentY = startY;                                      // Start at top
        let courseIndex = 0;                                        // Track course number
        
        while (currentY < endY) {                                   // Loop through courses
            renderBrickCourse(ctx, currentY, startX, endX, 
                            brickLength, brickHeight, 
                            courseIndex, randomness, jitter);        // Render course
            currentY += brickHeight + 10;                           // Move to next course
            courseIndex++;                                          // Increment course
        }
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Render Single Course of Bricks
    // ------------------------------------------------------------
    function renderBrickCourse(ctx, y, startX, endX, 
                              brickLength, brickHeight, 
                              courseIndex, randomness, jitter) {
        const offset = (courseIndex % 2) * (brickLength / 2);       // Stagger alternate courses
        let currentX = startX - offset;                             // Start position with offset
        
        ctx.strokeStyle = '#666666';                                // Set line color
        ctx.lineWidth = 1.5;                                        // Set line width
        
        while (currentX < endX + brickLength) {                     // Loop through bricks
            // Apply randomness to brick dimensions
            const lengthVariation = (Math.random() - 0.5) * 20 * randomness;
            const heightVariation = (Math.random() - 0.5) * 5 * randomness;
            
            const adjustedLength = brickLength + lengthVariation;   // Adjusted brick length
            const adjustedHeight = brickHeight + heightVariation;   // Adjusted brick height
            
            // Draw brick outline with jitter
            drawBrickOutline(ctx, currentX, y, 
                           adjustedLength, adjustedHeight, jitter);  // Draw brick
            
            currentX += adjustedLength + 10;                        // Move to next brick position
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Draw Individual Brick Outline
    // ------------------------------------------------------------
    function drawBrickOutline(ctx, x, y, width, height, jitter) {
        ctx.beginPath();                                            // Start new path
        
        // Apply jitter to make lines appear hand-drawn
        const points = [
            { x: x + applyJitter(0, jitter), y: y + applyJitter(0, jitter) },
            { x: x + width + applyJitter(0, jitter), y: y + applyJitter(0, jitter) },
            { x: x + width + applyJitter(0, jitter), y: y + height + applyJitter(0, jitter) },
            { x: x + applyJitter(0, jitter), y: y + height + applyJitter(0, jitter) }
        ];
        
        // Draw brick with organic lines
        ctx.moveTo(points[0].x + 50, points[0].y + 50);
        
        for (let i = 1; i < points.length; i++) {                  // Draw each side
            drawOrganicLine(ctx, 
                          points[i-1].x + 50, 
                          points[i-1].y + 50,
                          points[i].x + 50, 
                          points[i].y + 50, 
                          jitter * 2);                              // Draw with wobble
        }
        
        // Close the brick shape
        drawOrganicLine(ctx, 
                      points[3].x + 50, 
                      points[3].y + 50,
                      points[0].x + 50, 
                      points[0].y + 50, 
                      jitter * 2);                                  // Close with wobble
        
        ctx.stroke();                                               // Draw the path
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Utility Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Map Slider Value to Range
    // ------------------------------------------------------------
    function mapSliderValue(value, min, max) {
        return min + (value / 100) * (max - min);                   // Map 0-100 to min-max
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Apply Random Jitter to Value
    // ------------------------------------------------------------
    function applyJitter(value, jitterAmount) {
        return value + (Math.random() - 0.5) * 10 * jitterAmount;   // Add random offset
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Draw Organic Hand-Drawn Line
    // ------------------------------------------------------------
    function drawOrganicLine(ctx, x1, y1, x2, y2, wobble) {
        const distance = Math.sqrt((x2-x1)**2 + (y2-y1)**2);        // Calculate line length
        const steps = Math.max(3, Math.floor(distance / 20));       // Number of wobble points
        
        for (let i = 0; i <= steps; i++) {                         // Create wobble points
            const t = i / steps;                                    // Interpolation factor
            const x = x1 + (x2 - x1) * t;                          // Interpolate X
            const y = y1 + (y2 - y1) * t;                          // Interpolate Y
            
            // Add perpendicular wobble
            const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI/2; // Perpendicular angle
            const offsetX = Math.cos(angle) * (Math.random() - 0.5) * wobble;
            const offsetY = Math.sin(angle) * (Math.random() - 0.5) * wobble;
            
            if (i === 0) {
                ctx.moveTo(x + offsetX, y + offsetY);               // Move to start
            } else {
                ctx.lineTo(x + offsetX, y + offsetY);               // Draw to point
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// Make function globally available
window.renderBrickworkPattern = renderBrickworkPattern;