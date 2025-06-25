// =============================================================================
// VALE DESIGN SUITE - FILE HANDLERS AND SCHEDULERS
// =============================================================================
//
// FILE       : FileHandlersAndSchedulers.js
// NAMESPACE  : HatchEditor
// MODULE     : FileHandlers
// AUTHOR     : Generated for Vale Design Suite
// PURPOSE    : Handle file operations and scheduling for Hatch Editor
// CREATED    : 2025
//
// DESCRIPTION:
// - Manages DXF file loading and parsing
// - Handles test file loading
// - Manages file validation and error handling
// - Provides scheduling utilities for async operations
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Configuration Values
    // ------------------------------------------------------------
    const PREVIEW_DELAY = 300;                                      // <-- Preview debounce delay in ms
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | File Loading Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Trigger File Input Dialog
    // ------------------------------------------------------------
    function triggerFileInput() {
        const fileInput = document.getElementById('file-input');     // Get file input element
        fileInput.click();                                          // Trigger click event
    }
    // ------------------------------------------------------------

    // FUNCTION | Handle File Selection from Input
    // ------------------------------------------------------------
    async function handleFileSelect(event) {
        const file = event.target.files[0];                         // Get selected file
        if (!file) return;                                          // Exit if no file
        
        if (!file.name.toLowerCase().endsWith('.dxf')) {            // Validate file extension
            showError('Please select a DXF file');
            return;
        }
        
        try {
            const content = await readFileContent(file);             // Read file content
            // dxfData = parseDXFContent(content);                  // <-- Old logic (commented out)
            const segments = window.DXFParser.parseDXFLines(content); // <-- Parse DXF lines
            drawDXFLines(segments);                                 // <-- Draw on canvas
            updateFileInfo(file.name);                               // Update UI with filename
            hideCanvasOverlay();                                     // Hide overlay
            
            if (currentPattern && livePreviewEnabled) {              // Check preview conditions
                schedulePreview();                                   // Schedule preview
            }
        } catch (error) {
            console.error('Error loading file:', error);             // Log error
            showError('Failed to load DXF file');                   // Show error to user
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Load Default Test Wall File
    // ------------------------------------------------------------
    async function loadDefaultTestFile() {
        console.log('Loading test wall data...');                   // Log action
        
        // Create test wall boundary data
        const testWallData = {
            boundaries: [{
                points: [
                    { x: 0, y: 0 },
                    { x: 1200, y: 0 },
                    { x: 1200, y: 2400 },
                    { x: 0, y: 2400 }
                ]
            }],
            holes: [
                // Window 1
                {
                    points: [
                        { x: 200, y: 800 },
                        { x: 500, y: 800 },
                        { x: 500, y: 1600 },
                        { x: 200, y: 1600 }
                    ]
                },
                // Window 2
                {
                    points: [
                        { x: 700, y: 800 },
                        { x: 1000, y: 800 },
                        { x: 1000, y: 1600 },
                        { x: 700, y: 1600 }
                    ]
                }
            ],
            bounds: { minX: 0, minY: 0, maxX: 1200, maxY: 2400 }
        };
        
        // Scale down for canvas display
        const scale = 0.3;                                          // Scale factor
        testWallData.boundaries = testWallData.boundaries.map(boundary => ({
            points: boundary.points.map(p => ({
                x: p.x * scale,
                y: p.y * scale
            }))
        }));
        testWallData.holes = testWallData.holes.map(hole => ({
            points: hole.points.map(p => ({
                x: p.x * scale,
                y: p.y * scale
            }))
        }));
        testWallData.bounds = {
            minX: testWallData.bounds.minX * scale,
            minY: testWallData.bounds.minY * scale,
            maxX: testWallData.bounds.maxX * scale,
            maxY: testWallData.bounds.maxY * scale
        };
        
        dxfData = testWallData;                                     // Set global data
        updateFileInfo('Test Wall (Generated)');                    // Update UI
        hideCanvasOverlay();                                        // Hide overlay
        
        if (currentPattern && livePreviewEnabled) {                 // Check preview conditions
            schedulePreview();                                      // Schedule preview
        }
        
        // Show server instructions
        console.info(`
=== SERVER INSTRUCTIONS ===
To load actual DXF files and patterns, run the local server:
python local_server.py
Then open: http://localhost:8000/index.html
        `);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | File Parsing Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Parse DXF File Content
    // ------------------------------------------------------------
    function parseDXFContent(content) {
        const data = {
            boundaries: [],                                          // <-- Boundary polygons
            holes: [],                                              // <-- Window/door cutouts
            bounds: null                                            // <-- Overall bounding box
        };
        
        // Simple DXF parsing - extract polylines and boundaries
        const lines = content.split('\n');                          // Split into lines
        let inEntities = false;                                      // Track section state
        let currentPolyline = null;                                  // Current polyline being parsed
        
        for (let i = 0; i < lines.length; i++) {                   // Iterate through lines
            const line = lines[i].trim();
            
            if (line === 'ENTITIES') {                              // Found entities section
                inEntities = true;
                continue;
            }
            
            if (line === 'ENDSEC' && inEntities) {                  // End of entities
                break;
            }
            
            if (inEntities && line === 'POLYLINE') {                // Found polyline
                currentPolyline = { points: [] };                   // Initialize new polyline
            }
            
            // Extract vertex coordinates (simplified)
            if (currentPolyline && line === '10') {                 // X coordinate marker
                const x = parseFloat(lines[i + 1]);                 // Parse X value
                if (lines[i + 2].trim() === '20') {                // Y coordinate marker
                    const y = parseFloat(lines[i + 3]);             // Parse Y value
                    currentPolyline.points.push({ x, y });          // Add point
                }
            }
            
            if (currentPolyline && line === 'SEQEND') {            // End of polyline
                if (currentPolyline.points.length > 2) {            // Valid polygon
                    data.boundaries.push(currentPolyline);           // Add to boundaries
                }
                currentPolyline = null;                             // Reset current polyline
            }
        }
        
        // Calculate bounds
        data.bounds = calculateBounds(data.boundaries);              // Get bounding box
        
        return data;                                                // Return parsed data
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Calculate Bounding Box
    // ------------------------------------------------------------
    function calculateBounds(boundaries) {
        let minX = Infinity, minY = Infinity;                       // Initialize min values
        let maxX = -Infinity, maxY = -Infinity;                     // Initialize max values
        
        boundaries.forEach(boundary => {                            // Iterate boundaries
            boundary.points.forEach(point => {                      // Check each point
                minX = Math.min(minX, point.x);                     // Update min X
                minY = Math.min(minY, point.y);                     // Update min Y
                maxX = Math.max(maxX, point.x);                     // Update max X
                maxY = Math.max(maxY, point.y);                     // Update max Y
            });
        });
        
        return { minX, minY, maxX, maxY };                         // Return bounds object
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | File Reading Utilities
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read File Content as Text
    // ------------------------------------------------------------
    function readFileContent(file) {
        return new Promise((resolve, reject) => {                   // Return promise
            const reader = new FileReader();                        // Create file reader
            
            reader.onload = (e) => {                               // Success handler
                resolve(e.target.result);                           // Resolve with content
            };
            
            reader.onerror = (e) => {                              // Error handler
                reject(new Error('Failed to read file'));           // Reject with error
            };
            
            reader.readAsText(file);                               // Read as text
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | UI Update Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Update File Information Display
    // ------------------------------------------------------------
    function updateFileInfo(filename) {
        const fileNameElement = document.getElementById('loaded-file-name');
        fileNameElement.textContent = `Loaded: ${filename}`;        // Update filename display
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Hide Canvas Overlay
    // ------------------------------------------------------------
    function hideCanvasOverlay() {
        const overlay = document.getElementById('canvas-overlay');   // Get overlay element
        overlay.style.display = 'none';                             // Hide overlay
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Global Function Exports
// -----------------------------------------------------------------------------

    // Export functions to global scope for integration
    window.triggerFileInput = triggerFileInput;                              // <-- Export file input trigger
    window.handleFileSelect = handleFileSelect;                              // <-- Export file selection handler
    window.loadDefaultTestFile = loadDefaultTestFile;                        // <-- Export test file loader
    window.parseDXFContent = parseDXFContent;                                // <-- Export DXF parser
    window.readFileContent = readFileContent;                                // <-- Export file reader
    window.schedulePreview = schedulePreview;                                // <-- Export preview scheduler

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Scheduling Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Schedule Preview with Debounce
    // ------------------------------------------------------------
    function schedulePreview() {
        if (previewTimeout) {                                        // <-- Clear existing timeout
            clearTimeout(previewTimeout);
        }
        
        previewTimeout = setTimeout(() => {                          // <-- Schedule new preview
            if (typeof generatePreview === 'function') {
                generatePreview();                                   // <-- Generate preview
            }
        }, PREVIEW_DELAY);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------