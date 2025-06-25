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
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Variables and State Management
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Application State Variables
    // ------------------------------------------------------------
    let canvas              = null;                                  // <-- Main canvas element
    let ctx                 = null;                                  // <-- Canvas 2D context
    let currentPattern      = null;                                  // <-- Currently loaded pattern data
    let dxfData             = null;                                  // <-- Loaded DXF file data
    let sliderValues        = {};                                    // <-- Current slider values
    let livePreviewEnabled  = true;                                  // <-- Live preview toggle state
    let previewTimeout      = null;                                  // <-- Debounce timeout for preview
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Configuration Values
    // ------------------------------------------------------------
    const CANVAS_PADDING    = 50;                                    // <-- Canvas padding in pixels
    const PREVIEW_DELAY     = 300;                                   // <-- Preview debounce delay in ms
    const MIN_CANVAS_SIZE   = 600;                                   // <-- Minimum canvas dimension
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Initialization Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize User Interface on Page Load
    // ------------------------------------------------------------
    function initializeUI() {
        canvas = document.getElementById('hatch-canvas');            // Get canvas element
        ctx = canvas.getContext('2d');                              // Get 2D context
        
        setupCanvasSize();                                           // Setup initial canvas size
        attachEventListeners();                                      // Attach all event listeners
        loadDefaultTestFile();                                       // Load default test file if available
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Setup Canvas Dimensions
    // ------------------------------------------------------------
    function setupCanvasSize() {
        const container = document.getElementById('canvas-container'); // Get container element
        const rect = container.getBoundingClientRect();             // Get container dimensions
        
        canvas.width = Math.max(rect.width - 40, MIN_CANVAS_SIZE);  // Set canvas width
        canvas.height = Math.max(rect.height - 40, MIN_CANVAS_SIZE); // Set canvas height
        
        clearCanvas();                                               // Clear canvas with background
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Attach Event Listeners to UI Elements
    // ------------------------------------------------------------
    function attachEventListeners() {
        // File operation buttons
        document.getElementById('load-dxf-btn').addEventListener('click', triggerFileInput);
        document.getElementById('load-test-file-btn').addEventListener('click', loadDefaultTestFile);
        document.getElementById('file-input').addEventListener('change', handleFileSelect);
        
        // Pattern selection
        document.getElementById('pattern-dropdown').addEventListener('change', handlePatternSelect);
        
        // Preview controls
        document.getElementById('preview-btn').addEventListener('click', generatePreview);
        document.getElementById('live-preview-toggle').addEventListener('change', toggleLivePreview);
        
        // Window resize
        window.addEventListener('resize', handleWindowResize);
    }
    // ------------------------------------------------------------

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
// REGION | Canvas Rendering and Preview Generation
// -----------------------------------------------------------------------------

    // FUNCTION | Generate Hatch Preview on Canvas
    // ------------------------------------------------------------
    function generatePreview() {
        if (!dxfData || !currentPattern) {                          // Check prerequisites
            showError('Please load a DXF file and select a pattern');
            return;
        }
        
        clearCanvas();                                               // Clear existing preview
        renderDXFOutline();                                         // Render DXF boundary
        renderHatchPattern();                                       // Render hatch pattern
        
        document.getElementById('export-btn').disabled = false;      // Enable export button
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Clear Canvas with Background Color
    // ------------------------------------------------------------
    function clearCanvas() {
        ctx.fillStyle = '#ffffff';                                   // Set fill color
        ctx.fillRect(0, 0, canvas.width, canvas.height);           // Fill entire canvas
        
        // Draw grid for reference
        ctx.strokeStyle = '#f0f0f0';                                // Set grid color
        ctx.lineWidth = 1;                                          // Set line width
        
        for (let x = 0; x < canvas.width; x += 50) {               // Draw vertical lines
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < canvas.height; y += 50) {               // Draw horizontal lines
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Render DXF Outline on Canvas
    // ------------------------------------------------------------
    function renderDXFOutline() {
        if (!dxfData || !dxfData.boundaries) return;                // Check if data exists
        
        ctx.strokeStyle = '#333333';                                 // Set outline color
        ctx.lineWidth = 2;                                          // Set line width
        
        dxfData.boundaries.forEach(boundary => {                    // Iterate through boundaries
            ctx.beginPath();
            boundary.points.forEach((point, index) => {              // Draw boundary path
                if (index === 0) {
                    ctx.moveTo(point.x + CANVAS_PADDING, point.y + CANVAS_PADDING);
                } else {
                    ctx.lineTo(point.x + CANVAS_PADDING, point.y + CANVAS_PADDING);
                }
            });
            ctx.closePath();
            ctx.stroke();
        });
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Render Hatch Pattern Inside Boundaries
    // ------------------------------------------------------------
    function renderHatchPattern() {
        if (!currentPattern || !dxfData) return;                    // Check prerequisites
        
        ctx.save();                                                  // Save context state
        
        // Create clipping path from DXF boundaries
        ctx.beginPath();
        dxfData.boundaries.forEach(boundary => {                    // Create clipping region
            boundary.points.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x + CANVAS_PADDING, point.y + CANVAS_PADDING);
                } else {
                    ctx.lineTo(point.x + CANVAS_PADDING, point.y + CANVAS_PADDING);
                }
            });
            ctx.closePath();
        });
        ctx.clip();                                                  // Apply clipping
        
        // Call pattern-specific rendering function
        if (window.renderBrickworkPattern) {                        // Check if function exists
            window.renderBrickworkPattern(ctx, currentPattern, sliderValues, dxfData);
        }
        
        ctx.restore();                                              // Restore context state
    }
    // ------------------------------------------------------------

    // FUNCTION | Draw DXF Line Segments on Canvas
    // ------------------------------------------------------------
    function drawDXFLines(segments) {
        clearCanvas();                                              // Clear canvas first
        if (!ctx || !segments || segments.length === 0) return;     // Exit if nothing to draw
        ctx.save();
        ctx.strokeStyle = '#000000';                                // Black lines
        ctx.lineWidth = 1.0;                                        // 1.00pt line
        ctx.beginPath();
        segments.forEach(seg => {
            ctx.moveTo(seg.x1, seg.y1);                             // Move to start
            ctx.lineTo(seg.x2, seg.y2);                             // Draw to end
        });
        ctx.stroke();
        ctx.restore();
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

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);