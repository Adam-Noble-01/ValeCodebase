// =============================================================================
// VALE DESIGN SUITE - UI HELPER FUNCTIONS
// =============================================================================
//
// FILE       : UIHelpers.js
// NAMESPACE  : HatchEditor
// MODULE     : UIHelpers
// AUTHOR     : Generated for Vale Design Suite
// PURPOSE    : Common UI helper functions for Hatch Editor Tool
// CREATED    : 2025
//
// DESCRIPTION:
// - Provides common UI utility functions
// - Handles error/success messaging
// - Manages canvas overlay states
// - Provides file info updates
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | UI Messaging Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Display Error Message
    // ------------------------------------------------------------
    function showError(message) {
        console.error('Error:', message);                            // <-- Log error to console
        alert('Error: ' + message);                                  // <-- Show error to user
        // TODO: Replace with toast notification system
    }
    // ------------------------------------------------------------

    // FUNCTION | Display Success Message
    // ------------------------------------------------------------
    function showSuccess(message) {
        console.log('Success:', message);                            // <-- Log success to console
        // TODO: Add toast notification for success messages
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | File Information Display
// -----------------------------------------------------------------------------

    // FUNCTION | Update File Information Display
    // ------------------------------------------------------------
    function updateFileInfo(filename) {
        const fileNameElement = document.getElementById('loaded-file-name'); // <-- Get filename element
        const canvasInfoElement = document.getElementById('canvas-info');     // <-- Get canvas info element
        
        if (fileNameElement) {
            fileNameElement.textContent = filename;                  // <-- Update filename display
        }
        
        if (canvasInfoElement) {
            canvasInfoElement.textContent = filename;                // <-- Update canvas info
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Canvas Overlay Management
// -----------------------------------------------------------------------------

    // FUNCTION | Hide Canvas Overlay
    // ------------------------------------------------------------
    function hideCanvasOverlay() {
        const overlay = document.getElementById('canvas-overlay');    // <-- Get overlay element
        if (overlay) {
            overlay.style.display = 'none';                          // <-- Hide overlay
        }
    }
    // ------------------------------------------------------------

    // FUNCTION | Show Canvas Overlay with Message
    // ------------------------------------------------------------
    function showCanvasOverlay(message) {
        const overlay = document.getElementById('canvas-overlay');    // <-- Get overlay element
        const canvasInfo = document.getElementById('canvas-info');    // <-- Get canvas info element
        
        if (overlay && canvasInfo) {
            canvasInfo.textContent = message;                        // <-- Set overlay message
            overlay.style.display = 'flex';                          // <-- Show overlay
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Preview Scheduling
// -----------------------------------------------------------------------------

    // FUNCTION | Schedule Preview with Debounce
    // ------------------------------------------------------------
    function schedulePreview() {
        const currentTimeout = window.getState('previewTimeout');     // <-- Get current timeout
        const previewDelay = window.getState('PREVIEW_DELAY');       // <-- Get preview delay
        
        if (currentTimeout) {                                        // <-- Clear existing timeout
            clearTimeout(currentTimeout);
        }
        
        const newTimeout = setTimeout(() => {                        // <-- Schedule new preview
            if (typeof window.generatePreview === 'function') {
                window.generatePreview();                            // <-- Generate preview
            }
        }, previewDelay);
        
        window.setState('previewTimeout', newTimeout);               // <-- Store new timeout
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Global Function Exports
// -----------------------------------------------------------------------------

    // Export all UI helper functions to window object
    window.showError = showError;                                             // <-- Export error display
    window.showSuccess = showSuccess;                                         // <-- Export success display
    window.updateFileInfo = updateFileInfo;                                   // <-- Export file info updater
    window.hideCanvasOverlay = hideCanvasOverlay;                            // <-- Export overlay hide
    window.showCanvasOverlay = showCanvasOverlay;                            // <-- Export overlay show
    window.schedulePreview = schedulePreview;                                 // <-- Export preview scheduler

// endregion ------------------------------------------------------------------- 