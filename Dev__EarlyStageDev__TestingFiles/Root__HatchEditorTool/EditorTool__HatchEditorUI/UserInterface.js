// =============================================================================
// VALE DESIGN SUITE - HATCH EDITOR USER INTERFACE
// =============================================================================
//
// FILE       : UserInterface.js
// NAMESPACE  : HatchEditor
// MODULE     : UserInterface
// AUTHOR     : Generated for Vale Design Suite
// PURPOSE    : Main UI controller for Hatch Editor Tool
// CREATED    : 2025
//
// DESCRIPTION:
// - Manages the user interface for the Hatch Editor Tool
// - Handles canvas rendering and hatch preview generation
// - Creates dynamic slider controls based on pattern configuration
// - Manages pattern loading and UI state updates
// - INTEGRATES WITH NAVIGATION SYSTEM for viewport management
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Variables and State Management
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Application State Variables
    // ------------------------------------------------------------
    let canvas              = null;                                  // <-- Main canvas element (reference only)
    let ctx                 = null;                                  // <-- Canvas 2D context (reference only)
    let currentPattern      = null;                                  // <-- Currently loaded pattern data
    let dxfData             = null;                                  // <-- Loaded DXF file data
    let sliderValues        = {};                                    // <-- Current slider values
    let livePreviewEnabled  = true;                                  // <-- Live preview toggle state
    let previewTimeout      = null;                                  // <-- Debounce timeout for preview
    let isNavigationReady   = false;                                 // <-- Flag to track navigation system readiness
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Configuration Values
    // ------------------------------------------------------------
    const CANVAS_PADDING    = 50;                                    // <-- Canvas padding in pixels
    const PREVIEW_DELAY     = 300;                                   // <-- Preview debounce delay in ms
    const GRID_SIZE         = 50;                                    // <-- Grid line spacing
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Initialization Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize User Interface on Page Load
    // ------------------------------------------------------------
    function initializeUI() {
        // Wait for navigation system to be ready
        if (typeof window.initializeCanvasNavigation === 'function') {
            // Navigation system will handle canvas setup
            canvas = document.getElementById('hatch-canvas');            // Get canvas reference
            ctx = canvas.getContext('2d');                              // Get context reference
            isNavigationReady = true;                                   // Mark navigation as ready
        } else {
            console.warn('Navigation system not available, falling back to basic setup');
            setupBasicCanvas();                                          // Fallback canvas setup
        }
        
        attachUIEventListeners();                                        // Attach UI-specific event listeners only
        loadDefaultTestFile();                                           // Load default test file if available
        
        // Register redraw callback with navigation system
        if (window.requestRedraw) {
            window.canvasRedrawCallback = renderCurrentContent;         // Register our rendering function
        }
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Basic Canvas Setup (Fallback Only)
    // ---------------------------------------------------------------
    function setupBasicCanvas() {
        canvas = document.getElementById('hatch-canvas');                // Get canvas element
        ctx = canvas.getContext('2d');                                  // Get 2D context
        
        const container = document.getElementById('canvas-container');   // Get container element
        const rect = container.getBoundingClientRect();                 // Get container dimensions
        
        canvas.width = Math.max(rect.width - 40, 600);                  // Set canvas width
        canvas.height = Math.max(rect.height - 40, 600);                // Set canvas height
        
        renderCurrentContent();                                          // Initial render
    }
    // ---------------------------------------------------------------

    // SUB FUNCTION | Attach UI-Specific Event Listeners Only
    // ---------------------------------------------------------------
    function attachUIEventListeners() {
        // File operation buttons
        document.getElementById('load-dxf-btn').addEventListener('click', triggerFileInput);
        document.getElementById('load-test-file-btn').addEventListener('click', loadDefaultTestFile);
        document.getElementById('file-input').addEventListener('change', handleFileSelect);
        
        // Pattern selection
        document.getElementById('pattern-dropdown').addEventListener('change', handlePatternSelect);
        
        // Preview controls
        document.getElementById('preview-btn').addEventListener('click', generatePreview);
        document.getElementById('live-preview-toggle').addEventListener('change', toggleLivePreview);
        
        // NOTE: Canvas and window events are handled by navigation system
        // NOTE: Do not add canvas mouse/wheel/resize events here
    }
    // ---------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Pattern Loading and Management
// -----------------------------------------------------------------------------

    // FUNCTION | Load Pattern from JSON File
    // ------------------------------------------------------------
    async function loadPattern(patternName) {
        if (!patternName) return;                                    // Exit if no pattern name
        
        try {
            const response = await fetch(`Patterns__HatchPatternLibrary/${patternName}.json`);
            if (!response.ok) {
                throw new Error(`Pattern file not found: ${patternName}.json`);
            }
            
            currentPattern = await response.json();                  // Parse JSON data
            createSliderControls(currentPattern.HatchEditor__EnabledTools); // Create UI controls
            
            if (livePreviewEnabled && dxfData) {                    // Check if preview should update
                schedulePreview();                                   // Schedule preview update
            }
        } catch (error) {
            console.error('Error loading pattern:', error);          // Log error
            showError(`Failed to load pattern: ${patternName}. Make sure the local server is running.`);
        }
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Create Dynamic Slider Controls
    // ------------------------------------------------------------
    function createSliderControls(enabledTools) {
        const container = document.getElementById('sliders-container'); // Get slider container
        container.innerHTML = '';                                    // Clear existing sliders
        
        Object.entries(enabledTools).forEach(([key, toolName]) => { // Iterate through tools
            const sliderId = key.replace('HatchEditor__', '');      // Extract slider ID
            const sliderGroup = createSliderElement(sliderId, toolName); // Create slider element
            container.appendChild(sliderGroup);                      // Add to container
            
            // Initialize slider value
            sliderValues[toolName] = 50;                            // Default to middle value
        });
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Create Individual Slider Element
    // ------------------------------------------------------------
    function createSliderElement(sliderId, toolName) {
        const group = document.createElement('div');                 // Create container div
        group.className = 'slider-group';                           // Set class name
        
        const label = document.createElement('div');                 // Create label div
        label.className = 'slider-label';                           // Set class name
        
        const labelText = toolName.replace('Adjustment__', '')      // Format label text
                                 .replace(/([A-Z])/g, ' $1')
                                 .trim();
        
        label.innerHTML = `
            <span>${labelText}</span>
            <span class="slider-value" id="${sliderId}-value">50</span>
        `;
        
        const slider = document.createElement('input');              // Create slider input
        slider.type = 'range';                                       // Set input type
        slider.min = '0';                                           // Set minimum value
        slider.max = '100';                                         // Set maximum value
        slider.value = '50';                                        // Set default value
        slider.id = sliderId;                                       // Set element ID
        
        slider.addEventListener('input', (e) => {                   // Add input listener
            updateSliderValue(sliderId, toolName, e.target.value);  // Update value
        });
        
        group.appendChild(label);                                    // Add label to group
        group.appendChild(slider);                                   // Add slider to group
        
        return group;                                               // Return complete element
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Canvas Rendering and Preview Generation - NAVIGATION INTEGRATED
// -----------------------------------------------------------------------------

    // FUNCTION | Generate Hatch Preview on Canvas (Main Entry Point)
    // ------------------------------------------------------------
    function generatePreview() {
        if (!dxfData || !currentPattern) {                          // Check prerequisites
            showError('Please load a DXF file and select a pattern');
            return;
        }
        
        // Update content bounds for navigation system
        if (dxfData.bounds && window.setContentBounds) {
            window.setContentBounds(                                 // Set bounds for navigation
                dxfData.bounds.minX - CANVAS_PADDING,
                dxfData.bounds.minY - CANVAS_PADDING,
                dxfData.bounds.maxX + CANVAS_PADDING,
                dxfData.bounds.maxY + CANVAS_PADDING
            );
        }
        
        // Use navigation system's redraw mechanism
        if (window.requestRedraw) {
            window.requestRedraw();                                  // Request redraw through navigation
        } else {
            renderCurrentContent();                                  // Fallback direct render
        }
        
        document.getElementById('export-btn').disabled = false;      // Enable export button
    }
    // ------------------------------------------------------------

    // FUNCTION | Render Current Content (Called by Navigation System)
    // ------------------------------------------------------------
    function renderCurrentContent() {
        if (!canvas || !ctx) return;                                // Exit if canvas not ready
        
        // Use navigation transform if available
        let transformedCtx = ctx;
        if (window.applyViewportTransform) {
            transformedCtx = window.applyViewportTransform();        // Get transformed context
            if (!transformedCtx) return;                            // Exit if transform failed
        } else {
            // Fallback: clear canvas manually
            ctx.clearRect(0, 0, canvas.width, canvas.height);       // Clear canvas
        }
        
        renderBackground(transformedCtx);                            // Render background and grid
        renderDXFContent(transformedCtx);                            // Render DXF content
        renderHatchPattern(transformedCtx);                          // Render hatch pattern
        
        // Restore context if navigation system provided transform
        if (window.restoreViewportTransform) {
            window.restoreViewportTransform();                       // Restore context state
        }
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Render Background and Grid
    // ---------------------------------------------------------------
    function renderBackground(ctx) {
        // Fill background
        ctx.fillStyle = '#ffffff';                                   // Set fill color
        ctx.fillRect(-10000, -10000, 20000, 20000);                 // Fill large area (handles zoom/pan)
        
        // Draw grid for reference
        ctx.strokeStyle = '#f0f0f0';                                // Set grid color
        ctx.lineWidth = 1;                                          // Set line width
        
        // Calculate grid bounds based on current viewport
        const gridBounds = calculateGridBounds();                    // Get visible grid area
        
        // Draw vertical grid lines
        for (let x = gridBounds.minX; x <= gridBounds.maxX; x += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, gridBounds.minY);
            ctx.lineTo(x, gridBounds.maxY);
            ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = gridBounds.minY; y <= gridBounds.maxY; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(gridBounds.minX, y);
            ctx.lineTo(gridBounds.maxX, y);
            ctx.stroke();
        }
    }
    // ---------------------------------------------------------------

    // SUB FUNCTION | Render DXF Content (Boundaries and Holes)
    // ---------------------------------------------------------------
    function renderDXFContent(ctx) {
        if (!dxfData) return;                                        // Exit if no DXF data
        
        ctx.strokeStyle = '#333333';                                 // Set outline color
        ctx.lineWidth = 2;                                          // Set line width
        
        // Render boundaries
        if (dxfData.boundaries) {
            dxfData.boundaries.forEach(boundary => {                // Iterate through boundaries
                renderPolygon(ctx, boundary.points, false);          // Render boundary polygon
            });
        }
        
        // Render holes (windows/doors)
        if (dxfData.holes) {
            ctx.strokeStyle = '#666666';                             // Different color for holes
            dxfData.holes.forEach(hole => {                         // Iterate through holes
                renderPolygon(ctx, hole.points, false);             // Render hole polygon
            });
        }
    }
    // ---------------------------------------------------------------

    // SUB FUNCTION | Render Hatch Pattern Inside Boundaries
    // ---------------------------------------------------------------
    function renderHatchPattern(ctx) {
        if (!currentPattern || !dxfData) return;                    // Check prerequisites
        
        ctx.save();                                                  // Save context state
        
        // Create clipping path from DXF boundaries
        if (dxfData.boundaries) {
            ctx.beginPath();
            dxfData.boundaries.forEach(boundary => {                // Create clipping region
                boundary.points.forEach((point, index) => {
                    if (index === 0) {
                        ctx.moveTo(point.x, point.y);               // Move to first point
                    } else {
                        ctx.lineTo(point.x, point.y);               // Line to subsequent points
                    }
                });
                ctx.closePath();
            });
            ctx.clip();                                              // Apply clipping
        }
        
        // Call pattern-specific rendering function
        if (window.renderBrickworkPattern) {                        // Check if function exists
            window.renderBrickworkPattern(ctx, currentPattern, sliderValues, dxfData);
        }
        
        ctx.restore();                                              // Restore context state
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Render Polygon Shape
    // ---------------------------------------------------------------
    function renderPolygon(ctx, points, filled = false) {
        if (!points || points.length < 2) return;                   // Exit if insufficient points
        
        ctx.beginPath();
        points.forEach((point, index) => {                          // Draw polygon path
            if (index === 0) {
                ctx.moveTo(point.x, point.y);                       // Move to first point
            } else {
                ctx.lineTo(point.x, point.y);                       // Line to subsequent points
            }
        });
        ctx.closePath();
        
        if (filled) {
            ctx.fill();                                             // Fill if requested
        } else {
            ctx.stroke();                                           // Stroke outline
        }
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Calculate Grid Bounds for Current Viewport
    // ---------------------------------------------------------------
    function calculateGridBounds() {
        // Default bounds if navigation not available
        let bounds = { minX: -500, minY: -500, maxX: 1500, maxY: 1500 };
        
        // Use viewport state if available
        if (window.getViewportState) {
            const viewport = window.getViewportState();              // Get current viewport
            const zoom = viewport.zoomLevel || 1;                    // Get zoom level
            const offsetX = viewport.viewportX || 0;                 // Get X offset
            const offsetY = viewport.viewportY || 0;                 // Get Y offset
            
            // Calculate visible world area
            const worldWidth = canvas.width / zoom;                  // World width in view
            const worldHeight = canvas.height / zoom;                // World height in view
            const worldLeft = -offsetX / zoom;                       // Left edge in world coords
            const worldTop = -offsetY / zoom;                        // Top edge in world coords
            
            bounds = {
                minX: Math.floor((worldLeft - 100) / GRID_SIZE) * GRID_SIZE,         // Snap to grid
                minY: Math.floor((worldTop - 100) / GRID_SIZE) * GRID_SIZE,          // Snap to grid
                maxX: Math.ceil((worldLeft + worldWidth + 100) / GRID_SIZE) * GRID_SIZE,  // Snap to grid
                maxY: Math.ceil((worldTop + worldHeight + 100) / GRID_SIZE) * GRID_SIZE   // Snap to grid
            };
        }
        
        return bounds;                                               // Return calculated bounds
    }
    // ---------------------------------------------------------------

    // FUNCTION | Draw DXF Line Segments on Canvas (Legacy Support)
    // ------------------------------------------------------------
    function drawDXFLines(segments) {
        if (!segments || segments.length === 0) return;             // Exit if nothing to draw
        
        // Convert line segments to boundary format for consistency
        dxfData = {
            boundaries: [],                                          // Initialize boundaries
            holes: [],                                              // Initialize holes
            bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 }   // Default bounds
        };
        
        // Simple conversion: treat all segments as individual boundaries
        // In production, this should be more sophisticated
        if (segments.length > 0) {
            const points = segments.map(seg => ({ x: seg.x1, y: seg.y1 })); // Extract start points
            dxfData.boundaries.push({ points: points });            // Add as boundary
        }
        
        generatePreview();                                           // Trigger full preview
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | UI Update and State Management Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Update Slider Value and Trigger Preview
    // ------------------------------------------------------------
    function updateSliderValue(sliderId, toolName, value) {
        sliderValues[toolName] = parseInt(value);                   // Update stored value
        document.getElementById(`${sliderId}-value`).textContent = value; // Update display
        
        if (livePreviewEnabled && dxfData && currentPattern) {      // Check preview conditions
            schedulePreview();                                       // Schedule preview update
        }
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Schedule Preview with Debouncing
    // ------------------------------------------------------------
    function schedulePreview() {
        if (previewTimeout) {                                       // Clear existing timeout
            clearTimeout(previewTimeout);
        }
        
        previewTimeout = setTimeout(() => {                         // Set new timeout
            generatePreview();                                       // Generate preview
        }, PREVIEW_DELAY);
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Toggle Live Preview Mode
    // ------------------------------------------------------------
    function toggleLivePreview(event) {
        livePreviewEnabled = event.target.checked;                  // Update state
        
        if (livePreviewEnabled && dxfData && currentPattern) {      // Check if should preview
            generatePreview();                                       // Generate immediate preview
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Show Error Message to User
    // ------------------------------------------------------------
    function showError(message) {
        const overlay = document.getElementById('canvas-overlay');   // Get overlay element
        const info = document.getElementById('canvas-info');         // Get info element
        
        info.textContent = message;                                  // Set error message
        overlay.style.display = 'block';                            // Show overlay
        
        setTimeout(() => {                                          // Auto-hide after delay
            if (info.textContent === message) {                     // Check if message unchanged
                overlay.style.display = 'none';                     // Hide overlay
            }
        }, 5000);                                                   // Show for 5 seconds
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Public API and Integration Points
// -----------------------------------------------------------------------------

    // Export functions for navigation system integration
    window.renderCurrentContent = renderCurrentContent;             // <-- Export render function
    window.generatePreview = generatePreview;                       // <-- Export preview function
    window.drawDXFLines = drawDXFLines;                             // <-- Export DXF drawing function

// endregion -------------------------------------------------------------------

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);