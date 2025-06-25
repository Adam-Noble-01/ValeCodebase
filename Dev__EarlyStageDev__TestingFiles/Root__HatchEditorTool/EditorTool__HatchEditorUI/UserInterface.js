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

    // MODULE NOTES | State Management
    // ------------------------------------------------------------
    // This module uses the GlobalState system for all state management
    // Access state via window.getState() and window.setState()
    // Constants are also stored in GlobalState
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Initialization Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize User Interface on Page Load
    // ------------------------------------------------------------
    function initializeUI() {
        console.log('Initializing User Interface...');                    // <-- Log initialization start
        
        // Wait for navigation system to be ready
        setTimeout(() => {
            // Get canvas references from navigation system if available
            let canvas, ctx;
            if (typeof window.getCanvasElement === 'function') {
                canvas = window.getCanvasElement();                      // <-- Get canvas from navigation
                if (canvas) {
                    ctx = canvas.getContext('2d');                       // <-- Get context
                }
            } else {
                // Fallback to direct element access
                canvas = document.getElementById('hatch-canvas');        // <-- Get canvas element
                if (canvas) {
                    ctx = canvas.getContext('2d');                       // <-- Get 2D context
                }
            }
            
            if (!canvas || !ctx) {                                       // <-- Validate canvas setup
                console.error('Failed to get canvas or context');        // <-- Log error
                return;
            }
            
            // Store canvas and context in global state
            window.setState('canvas', canvas);                           // <-- Store canvas in state
            window.setState('ctx', ctx);                                 // <-- Store context in state
            
            attachUIEventListeners();                                    // <-- Attach UI-specific event listeners
            window.setState('isNavigationReady', true);                  // <-- Mark navigation as ready
            
            // Register redraw callback with navigation system
            if (typeof window.setCanvasRedrawCallback === 'function') {
                window.setCanvasRedrawCallback(renderCurrentContent);     // <-- Register rendering function
            }
            
            console.log('User Interface initialized successfully');       // <-- Log success
        }, 100);                                                          // <-- Small delay to ensure navigation is ready
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Attach UI-Specific Event Listeners Only
    // ---------------------------------------------------------------
    function attachUIEventListeners() {
        // File operation buttons
        const loadDxfBtn = document.getElementById('load-dxf-btn');        // <-- Get load DXF button
        const loadTestBtn = document.getElementById('load-test-file-btn'); // <-- Get load test button
        const fileInput = document.getElementById('file-input');           // <-- Get file input
        
        if (loadDxfBtn) {
            loadDxfBtn.addEventListener('click', window.triggerFileInput);        // <-- Add click handler
        }
        
        if (loadTestBtn) {
            loadTestBtn.addEventListener('click', window.loadDefaultTestFile);    // <-- Add click handler
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', window.handleFileSelect);        // <-- Add change handler
        }
        
        // Pattern selection
        const patternDropdown = document.getElementById('pattern-dropdown'); // <-- Get pattern dropdown
        if (patternDropdown) {
            patternDropdown.addEventListener('change', window.handlePatternSelect); // <-- Add change handler
        }
        
        // Preview controls
        const previewBtn = document.getElementById('preview-btn');         // <-- Get preview button
        const livePreviewToggle = document.getElementById('live-preview-toggle'); // <-- Get toggle
        
        if (previewBtn) {
            previewBtn.addEventListener('click', generatePreview);         // <-- Add click handler
        }
        
        if (livePreviewToggle) {
            livePreviewToggle.addEventListener('change', toggleLivePreview); // <-- Add change handler
        }
        
        console.log('UI Event listeners attached successfully');            // <-- Log success
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
            
            const pattern = await response.json();                          // Parse JSON data
            window.setState('currentPattern', pattern);                     // Store pattern in state
            createSliderControls(pattern.HatchEditor__EnabledTools);        // Create UI controls
            
            if (window.getState('livePreviewEnabled') && window.getState('dxfData')) {  // Check if preview should update
                window.schedulePreview();                                   // Schedule preview update
            }
            
            console.log('Pattern loaded successfully:', patternName); // <-- Log success
        } catch (error) {
            console.error('Error loading pattern:', error);          // Log error
            window.showError(`Failed to load pattern: ${patternName}. Make sure the local server is running.`);
        }
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Create Dynamic Slider Controls
    // ------------------------------------------------------------
    function createSliderControls(enabledTools) {
        const container = document.getElementById('sliders-container'); // Get slider container
        if (!container) return;                                     // Exit if container not found
        
        container.innerHTML = '';                                    // Clear existing sliders
        
        Object.entries(enabledTools).forEach(([key, toolName]) => { // Iterate through tools
            const sliderId = key.replace('HatchEditor__', '');      // Extract slider ID
            const sliderGroup = createSliderElement(sliderId, toolName); // Create slider element
            container.appendChild(sliderGroup);                      // Add to container
            
            // Initialize slider value
            const sliderValues = window.getState('sliderValues') || {};     // Get current slider values
            sliderValues[toolName] = 50;                                    // Default to middle value
            window.setState('sliderValues', sliderValues);                  // Store updated values
        });
        
        console.log('Slider controls created for pattern');          // <-- Log success
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
        if (!window.getState('dxfData') || !window.getState('currentPattern')) {  // Check prerequisites
            console.warn('No DXF data or pattern loaded for preview'); // <-- Log warning
            return;
        }
        
        console.log('Generating hatch preview...');                  // <-- Log preview generation
        
        // Request redraw through navigation system if available
        if (typeof window.requestRedraw === 'function') {
            window.requestRedraw();                                  // <-- Request redraw
        } else {
            renderCurrentContent();                                  // <-- Direct render
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Render Current Content on Canvas
    // ------------------------------------------------------------
    function renderCurrentContent() {
        const canvas = window.getCanvas();                                  // Get canvas from state
        const ctx = window.getContext();                                    // Get context from state
        
        if (!canvas || !ctx) {                                              // Check canvas availability
            console.warn('Canvas not available for rendering');             // <-- Log warning
            return;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);                   // <-- Clear entire canvas
        
        // Render background grid
        renderBackground(ctx);                                              // <-- Render background
        
        // Render DXF content if available
        if (window.getDXFData()) {
            renderDXFContent(ctx);                                          // <-- Render DXF data
        }
        
        // Render hatch pattern if available
        if (window.getCurrentPattern() && window.getDXFData()) {
            renderHatchPattern(ctx);                                        // <-- Render hatch pattern
        }
        
        console.log('Canvas content rendered successfully');         // <-- Log success
    }
    // ------------------------------------------------------------

    // SUB FUNCTION | Render Background Grid
    // ---------------------------------------------------------------
    function renderBackground(ctx) {
        const bounds = calculateGridBounds();                        // <-- Calculate grid bounds
        if (!bounds) return;                                         // Exit if no bounds
        
        ctx.strokeStyle = '#e0e0e0';                                 // <-- Set grid color
        ctx.lineWidth = 1;                                           // <-- Set line width
        
        const GRID_SIZE = window.getState('GRID_SIZE');              // Get grid size from state
        
        // Draw vertical grid lines
        for (let x = bounds.minX; x <= bounds.maxX; x += GRID_SIZE) {
            ctx.beginPath();                                         // <-- Start path
            ctx.moveTo(x, bounds.minY);                              // <-- Move to start
            ctx.lineTo(x, bounds.maxY);                              // <-- Line to end
            ctx.stroke();                                            // <-- Stroke line
        }
        
        // Draw horizontal grid lines
        for (let y = bounds.minY; y <= bounds.maxY; y += GRID_SIZE) {
            ctx.beginPath();                                         // <-- Start path
            ctx.moveTo(bounds.minX, y);                              // <-- Move to start
            ctx.lineTo(bounds.maxY, y);                              // <-- Line to end
            ctx.stroke();                                            // <-- Stroke line
        }
    }
    // ---------------------------------------------------------------

    // SUB FUNCTION | Render DXF Content
    // ---------------------------------------------------------------
    function renderDXFContent(ctx) {
        const dxfData = window.getDXFData();                        // Get DXF data from state
        if (!dxfData) return;                                        // Exit if no DXF data
        
        ctx.strokeStyle = '#333333';                                 // <-- Set DXF line color
        ctx.lineWidth = 2;                                           // <-- Set line width
        
        // Render boundaries
        if (dxfData.boundaries) {
            dxfData.boundaries.forEach(boundary => {                 // Iterate through boundaries
                renderPolygon(ctx, boundary.points, false);          // <-- Render boundary
            });
        }
        
        // Render holes (cutouts)
        if (dxfData.holes) {
            ctx.strokeStyle = '#ff0000';                             // <-- Set hole color to red
            dxfData.holes.forEach(hole => {                          // Iterate through holes
                renderPolygon(ctx, hole.points, false);              // <-- Render hole
            });
        }
    }
    // ---------------------------------------------------------------

    // SUB FUNCTION | Render Hatch Pattern
    // ---------------------------------------------------------------
    function renderHatchPattern(ctx) {
        const currentPattern = window.getCurrentPattern();           // Get pattern from state
        const dxfData = window.getDXFData();                        // Get DXF data from state
        
        if (!currentPattern || !dxfData) return;                     // Exit if no pattern or data
        
        ctx.strokeStyle = '#0066cc';                                 // <-- Set hatch color
        ctx.lineWidth = 1;                                           // <-- Set hatch line width
        
        // Simple hatch pattern rendering
        // In a full implementation, this would use the pattern configuration
        // and adjustment logic to generate complex hatch patterns
        
        if (dxfData.boundaries) {
            dxfData.boundaries.forEach(boundary => {                 // Iterate through boundaries
                renderSimpleHatch(ctx, boundary.points);             // <-- Render simple hatch
            });
        }
    }
    // ---------------------------------------------------------------

    // HELPER FUNCTION | Render Simple Hatch Pattern
    // ------------------------------------------------------------
    function renderSimpleHatch(ctx, points) {
        if (points.length < 3) return;                               // Exit if not enough points
        
        // Calculate bounding box
        let minX = Math.min(...points.map(p => p.x));               // <-- Get minimum X
        let maxX = Math.max(...points.map(p => p.x));               // <-- Get maximum X
        let minY = Math.min(...points.map(p => p.y));               // <-- Get minimum Y
        let maxY = Math.max(...points.map(p => p.y));               // <-- Get maximum Y
        
        // Draw diagonal hatch lines
        const spacing = 20;                                          // <-- Hatch line spacing
        for (let y = minY; y <= maxY; y += spacing) {
            ctx.beginPath();                                         // <-- Start path
            ctx.moveTo(minX, y);                                     // <-- Move to start
            ctx.lineTo(maxX, y);                                     // <-- Line to end
            ctx.stroke();                                            // <-- Stroke line
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Render Polygon
    // ------------------------------------------------------------
    function renderPolygon(ctx, points, filled = false) {
        if (points.length < 3) return;                               // Exit if not enough points
        
        ctx.beginPath();                                             // <-- Start path
        ctx.moveTo(points[0].x, points[0].y);                        // <-- Move to first point
        
        for (let i = 1; i < points.length; i++) {                   // Iterate through points
            ctx.lineTo(points[i].x, points[i].y);                    // <-- Line to next point
        }
        
        ctx.closePath();                                             // <-- Close path
        
        if (filled) {
            ctx.fill();                                              // <-- Fill polygon
        } else {
            ctx.stroke();                                            // <-- Stroke polygon
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Calculate Grid Bounds
    // ------------------------------------------------------------
    function calculateGridBounds() {
        const dxfData = window.getDXFData();                        // Get DXF data from state
        const canvas = window.getCanvas();                           // Get canvas from state
        const CANVAS_PADDING = window.getState('CANVAS_PADDING');    // Get padding from state
        
        if (!dxfData || !dxfData.bounds) {                           // Check if bounds available
            // Return default bounds if no data
            return {
                minX: -CANVAS_PADDING,
                minY: -CANVAS_PADDING,
                maxX: canvas ? canvas.width + CANVAS_PADDING : 800,
                maxY: canvas ? canvas.height + CANVAS_PADDING : 600
            };
        }
        
        return dxfData.bounds;                                       // Return actual bounds
    }
    // ------------------------------------------------------------

    // FUNCTION | Draw DXF Lines on Canvas
    // ------------------------------------------------------------
    function drawDXFLines(segments) {
        const canvas = window.getCanvas();                           // Get canvas from state
        const ctx = window.getContext();                             // Get context from state
        
        if (!canvas || !ctx || !segments) return;                    // Check prerequisites
        
        console.log('Drawing DXF lines:', segments.length, 'segments'); // <-- Log drawing
        
        // Convert line segments to DXF data format
        const dxfData = {
            boundaries: [{
                points: segments.map(seg => [                        // Convert segments to points
                    { x: seg.x1, y: seg.y1 },
                    { x: seg.x2, y: seg.y2 }
                ]).flat()
            }],
            holes: [],
            bounds: calculateBoundsFromSegments(segments)            // Calculate bounds
        };
        
        window.setState('dxfData', dxfData);                         // Store DXF data in state
        
        // Request redraw
        if (typeof window.requestRedraw === 'function') {
            window.requestRedraw();                                  // <-- Request redraw
        } else {
            renderCurrentContent();                                  // <-- Direct render
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Calculate Bounds from Line Segments
    // ------------------------------------------------------------
    function calculateBoundsFromSegments(segments) {
        if (!segments || segments.length === 0) return null;         // Exit if no segments
        
        let minX = Infinity, minY = Infinity;                        // <-- Initialize bounds
        let maxX = -Infinity, maxY = -Infinity;                      // <-- Initialize bounds
        
        segments.forEach(seg => {                                    // Iterate through segments
            minX = Math.min(minX, seg.x1, seg.x2);                   // <-- Update min X
            maxX = Math.max(maxX, seg.x1, seg.x2);                   // <-- Update max X
            minY = Math.min(minY, seg.y1, seg.y2);                   // <-- Update min Y
            maxY = Math.max(maxY, seg.y1, seg.y2);                   // <-- Update max Y
        });
        
        return { minX, minY, maxX, maxY };                           // Return bounds
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | UI State Management
// -----------------------------------------------------------------------------

    // FUNCTION | Update Slider Value
    // ------------------------------------------------------------
    function updateSliderValue(sliderId, toolName, value) {
        const sliderValues = window.getState('sliderValues') || {};  // Get current slider values
        sliderValues[toolName] = parseInt(value);                    // Store slider value
        window.setState('sliderValues', sliderValues);               // Update state
        
        // Update display
        const valueElement = document.getElementById(`${sliderId}-value`); // <-- Get value element
        if (valueElement) {
            valueElement.textContent = value;                        // <-- Update display
        }
        
        // Schedule preview if live preview is enabled
        if (window.getState('livePreviewEnabled')) {
            window.schedulePreview();                                // <-- Schedule preview
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Toggle Live Preview
    // ------------------------------------------------------------
    function toggleLivePreview(event) {
        window.setState('livePreviewEnabled', event.target.checked); // <-- Update toggle state
        console.log('Live preview:', event.target.checked ? 'enabled' : 'disabled'); // <-- Log state
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Global Function Exports
// -----------------------------------------------------------------------------

    // Export functions to global scope for integration
    window.initializeUI = initializeUI;                                      // <-- Export UI initialization
    window.loadPattern = loadPattern;                                        // <-- Export pattern loader
    window.generatePreview = generatePreview;                                // <-- Export preview generator
    window.renderCurrentContent = renderCurrentContent;                      // <-- Export render function
    window.drawDXFLines = drawDXFLines;                                      // <-- Export DXF line drawer
    window.updateSliderValue = updateSliderValue;                            // <-- Export slider updater
    window.toggleLivePreview = toggleLivePreview;                            // <-- Export preview toggle

// endregion -------------------------------------------------------------------