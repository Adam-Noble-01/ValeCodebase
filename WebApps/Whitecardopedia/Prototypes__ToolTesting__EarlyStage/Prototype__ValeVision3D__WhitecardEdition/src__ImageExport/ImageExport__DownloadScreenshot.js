// -----------------------------------------------------------------------------
// REGION | Image Export System - Screenshot Download Functionality
// -----------------------------------------------------------------------------

// #Region ------------------------------------------------
// CONFIGURATION | Screenshot export settings and constants
// --------------------------------------------------------

const SCREENSHOT_ENABLED                = true;                                    // <-- Toggle to enable/disable screenshot feature
const SCREENSHOT_QUALITY_MULTIPLIER     = 2.5;                                     // <-- Image quality multiplier (1.0 = 100%, 1.5 = 150% size increase)
const SCREENSHOT_FILENAME_PREFIX        = "ValeVision3D_Screenshot";               // <-- Base filename prefix for downloaded images
const SCREENSHOT_INCLUDE_TIMESTAMP      = true;                                    // <-- Add timestamp to filename for unique naming

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// HELPER FUNCTIONS | Utility functions for screenshot export
// --------------------------------------------------------

// HELPER FUNCTION | Generate Screenshot Filename
// ------------------------------------------------------------
function generateScreenshotFilename() {
    let filename = SCREENSHOT_FILENAME_PREFIX;                                      // <-- Start with base prefix
    
    if (SCREENSHOT_INCLUDE_TIMESTAMP) {
        const timestamp = new Date().toISOString()                                 // <-- Get ISO timestamp
            .replace(/:/g, '-')                                                     // <-- Replace colons with hyphens
            .replace(/\..+/, '');                                                   // <-- Remove milliseconds
        filename += `_${timestamp}`;                                                // <-- Append timestamp
    }
    
    filename += '.png';                                                             // <-- Add PNG extension
    return filename;                                                                // <-- Return complete filename
}
// ------------------------------------------------------------


// HELPER FUNCTION | Calculate Screenshot Dimensions
// ------------------------------------------------------------
function calculateScreenshotDimensions(canvas) {
    const baseWidth   = canvas.width;                                               // <-- Get current canvas width
    const baseHeight  = canvas.height;                                              // <-- Get current canvas height
    
    const scaledWidth  = Math.round(baseWidth * SCREENSHOT_QUALITY_MULTIPLIER);     // <-- Apply quality multiplier to width
    const scaledHeight = Math.round(baseHeight * SCREENSHOT_QUALITY_MULTIPLIER);   // <-- Apply quality multiplier to height
    
    return {                                                                         // <-- Return dimensions object
        width: scaledWidth,
        height: scaledHeight
    };
}
// ------------------------------------------------------------


// HELPER FUNCTION | Trigger Browser Download
// ------------------------------------------------------------
function triggerDownload(dataUrl, filename) {
    const link = document.createElement('a');                                       // <-- Create temporary anchor element
    link.href = dataUrl;                                                            // <-- Set data URL as href
    link.download = filename;                                                       // <-- Set download filename
    document.body.appendChild(link);                                                // <-- Append to DOM temporarily
    link.click();                                                                   // <-- Trigger click to download
    document.body.removeChild(link);                                                // <-- Remove from DOM
}
// ------------------------------------------------------------


// HELPER FUNCTION | Update Button State
// ------------------------------------------------------------
function updateButtonState(buttonElement, isEnabled) {
    if (!buttonElement) return;                                                     // <-- Exit if button doesn't exist
    
    if (isEnabled) {
        buttonElement.disabled = false;                                             // <-- Enable button
        buttonElement.classList.remove('disabled');                                 // <-- Remove disabled class
        buttonElement.style.opacity = '1';                                          // <-- Restore full opacity
    } else {
        buttonElement.disabled = true;                                              // <-- Disable button
        buttonElement.classList.add('disabled');                                    // <-- Add disabled class
        buttonElement.style.opacity = '0.6';                                        // <-- Reduce opacity for visual feedback
    }
}
// ------------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// SCREENSHOT EXPORT | Main screenshot capture and download functionality
// --------------------------------------------------------

// FUNCTION | Capture and Download Screenshot
// ------------------------------------------------------------
function captureAndDownloadScreenshot() {
    // Validate prerequisites
    // ------------------------------------
    if (!SCREENSHOT_ENABLED) {
        console.warn('Screenshot feature is disabled');                             // <-- Log warning if disabled
        return;
    }
    
    
    // Check if scene, engine, and camera are available
    // ------------------------------------
    if (typeof scene === 'undefined' || !scene.activeCamera) {
        console.error('Cannot capture screenshot: Scene or camera not available');  // <-- Log error if scene/camera missing
        return;
    }
    
    
    const engine = scene.getEngine();                                                // <-- Get engine from scene
    const camera = scene.activeCamera;                                               // <-- Get active camera
    const canvas = engine.getRenderingCanvas();                                      // <-- Get rendering canvas
    
    
    if (!canvas) {
        console.error('Cannot capture screenshot: Canvas not available');            // <-- Log error if canvas missing
        return;
    }
    
    
    // Get download button element for state management
    // ------------------------------------
    const downloadButton = document.getElementById('downloadScreenshotButton');     // <-- Get button element
    
    
    // Disable button during export
    // ------------------------------------
    updateButtonState(downloadButton, false);                                        // <-- Disable button to prevent multiple exports
    
    
    // Calculate screenshot dimensions
    // ------------------------------------
    const dimensions = calculateScreenshotDimensions(canvas);                        // <-- Calculate scaled dimensions
    
    
    console.log('=== Screenshot Export Started ===');                               // <-- Log export start
    console.log(`Canvas size: ${canvas.width} x ${canvas.height}`);                // <-- Log original canvas size
    console.log(`Export size: ${dimensions.width} x ${dimensions.height}`);        // <-- Log export dimensions
    console.log(`Quality multiplier: ${SCREENSHOT_QUALITY_MULTIPLIER * 100}%`);   // <-- Log quality percentage
    
    
    // Capture screenshot using Babylon.js built-in method
    // ------------------------------------
    BABYLON.Tools.CreateScreenshot(
        engine,                                                                     // <-- Babylon engine instance
        camera,                                                                     // <-- Active camera
        {                                                                           // <-- Screenshot options
            width: dimensions.width,                                                 // <-- Export width
            height: dimensions.height                                                // <-- Export height
        },
        function(dataUrl) {                                                          // <-- Callback function with image data
            // Generate filename
            // ------------------------------------
            const filename = generateScreenshotFilename();                          // <-- Generate filename with timestamp
            
            
            // Trigger download
            // ------------------------------------
            triggerDownload(dataUrl, filename);                                      // <-- Download image file
            
            
            // Re-enable button
            // ------------------------------------
            updateButtonState(downloadButton, true);                                 // <-- Re-enable button after export completes
            
            
            console.log(`Screenshot exported: ${filename}`);                        // <-- Log successful export
            console.log('=== Screenshot Export Complete ===');                       // <-- Log export completion
        }
    );
}
// ------------------------------------------------------------


// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// UI INITIALIZATION | Setup download button and event handlers
// --------------------------------------------------------

// FUNCTION | Initialize Screenshot Download Button
// ------------------------------------------------------------
function initializeScreenshotDownloadButton() {
    // Wait for root container to exist
    // ------------------------------------
    const rootContainer = document.getElementById('root');                          // <-- Get root container
    if (!rootContainer) {
        setTimeout(initializeScreenshotDownloadButton, 50);                          // <-- Retry if container not ready
        return;
    }
    
    
    // Check if button already exists
    // ------------------------------------
    if (document.getElementById('downloadScreenshotButton')) {
        return;                                                                     // <-- Exit if button already exists
    }
    
    
    // Create download button element
    // ------------------------------------
    const downloadButton = document.createElement('button');                        // <-- Create button element
    downloadButton.id = 'downloadScreenshotButton';                                 // <-- Set button ID
    downloadButton.className = 'download-screenshot-button';                        // <-- Set CSS class
    downloadButton.innerHTML = '📷 Download Image';                                 // <-- Set button text with icon
    downloadButton.title = 'Download current view as PNG image';                    // <-- Set tooltip text
    
    
    // Attach click event handler
    // ------------------------------------
    downloadButton.addEventListener('click', function(event) {
        event.preventDefault();                                                      // <-- Prevent default button behavior
        captureAndDownloadScreenshot();                                             // <-- Trigger screenshot capture
    });
    
    
    // Append button to root container
    // ------------------------------------
    rootContainer.appendChild(downloadButton);                                      // <-- Add button to DOM
    
    
    console.log('=== Screenshot Download Button Initialized ===');                 // <-- Log button initialization
}
// ------------------------------------------------------------

// #endregion ---------------------------------------------


// Initialize button when DOM is ready
// ------------------------------------
if (SCREENSHOT_ENABLED) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeScreenshotDownloadButton);  // <-- Wait for DOM if loading
    } else {
        initializeScreenshotDownloadButton();                                        // <-- Initialize immediately if DOM ready
    }
}

// endregion -------------------------------------------------------------------

