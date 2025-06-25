// =============================================================================
// VALE DESIGN SUITE - EVENT HANDLERS
// =============================================================================
//
// FILE       : EventHandlers.js
// NAMESPACE  : HatchEditor
// MODULE     : EventHandlers
// AUTHOR     : Generated for Vale Design Suite
// PURPOSE    : Event handling for Hatch Editor Tool
// CREATED    : 2025
//
// DESCRIPTION:
// - Manages all event handlers for the Hatch Editor interface
// - Handles pattern selection events
// - Manages export functionality
// - Provides event delegation utilities
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Pattern Selection Event Handlers
// -----------------------------------------------------------------------------

    // FUNCTION | Handle Pattern Selection Change
    // ------------------------------------------------------------
    function handlePatternSelect(event) {
        const patternName = event.target.value;                     // Get selected pattern
        
        if (!patternName) {                                         // No pattern selected
            currentPattern = null;                                   // Clear current pattern
            document.getElementById('sliders-container').innerHTML = ''; // Clear sliders
            return;
        }
        
        loadPattern(patternName);                                   // Load selected pattern
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Export Event Handlers
// -----------------------------------------------------------------------------

    // FUNCTION | Handle Export to SketchUp
    // ------------------------------------------------------------
    function handleExportToSketchUp() {
        if (!dxfData || !currentPattern) {                         // Check prerequisites
            showError('No hatch data to export');
            return;
        }
        
        const exportData = {
            pattern: currentPattern,                                // Include pattern data
            boundaries: dxfData,                                    // Include boundary data
            parameters: sliderValues,                               // Include parameter values
            timestamp: new Date().toISOString()                     // Add timestamp
        };
        
        // In production, this would send data to SketchUp Ruby API
        console.log('Export data:', exportData);                    // Log for debugging
        
        // For testing, download as JSON
        downloadJSON(exportData, 'hatch_export.json');              // Download file
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Download Data as JSON File
    // ------------------------------------------------------------
    function downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {   // Create blob
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);                      // Create download URL
        const link = document.createElement('a');                   // Create link element
        link.href = url;                                            // Set download URL
        link.download = filename;                                   // Set filename
        link.click();                                               // Trigger download
        
        URL.revokeObjectURL(url);                                   // Clean up URL
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Event Listener Setup
// -----------------------------------------------------------------------------

    // FUNCTION | Setup Export Button Handler
    // ------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        const exportBtn = document.getElementById('export-btn');     // Get export button
        if (exportBtn) {
            exportBtn.addEventListener('click', handleExportToSketchUp); // Add click handler
        }
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------