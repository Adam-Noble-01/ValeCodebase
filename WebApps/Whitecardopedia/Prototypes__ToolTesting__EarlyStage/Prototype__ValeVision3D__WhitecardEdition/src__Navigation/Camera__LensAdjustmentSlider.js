// -----------------------------------------------------------------------------
// CAMERA LENS ADJUSTMENT | Focal Length Slider Control (18-65mm Equivalent)
// -----------------------------------------------------------------------------
//
// FILE       : Camera__LensAdjustmentSlider.js
// NAMESPACE  : Global
// MODULE     : Camera Lens Adjustment
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : UI slider control for adjusting camera focal length (18-65mm equivalent)
// CREATED    : 2025
//
// DESCRIPTION:
// - Provides a UI slider to adjust camera focal length from 18mm (wide) to 65mm (telephoto)
// - Uses Babylon.js built-in setFocalLength() method when available
// - Falls back to manual FOV calculation if methods not available
// - Detects current camera FOV and converts to focal length for default value
// - Updates camera in real-time as slider is adjusted
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 2025 - Version 1.0.0
// - Initial Implementation
// - Focal length adjustment slider (18-65mm range)
// - Automatic default value detection from current camera FOV
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Configuration and Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Focal Length Range and Sensor Settings
    // ------------------------------------------------------------
    const LENS_MIN_FOCAL_LENGTH_MM     =   18;                                      // <-- Minimum focal length (wide angle)
    const LENS_MAX_FOCAL_LENGTH_MM     =   65;                                      // <-- Maximum focal length (telephoto)
    const LENS_SENSOR_HEIGHT_MM        =   24;                                      // <-- Full-frame sensor height (35mm equivalent)
    const LENS_OVERLAY_ENABLED         =   true;                                    // <-- Toggle to enable/disable lens adjustment overlay
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helper Functions - Focal Length Calculations
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Convert FOV (radians) to Focal Length (mm)
    // ------------------------------------------------------------
    function fovToFocalLength(fovRadians) {
        const sensorHeightHalf = LENS_SENSOR_HEIGHT_MM / 2;                         // <-- Half sensor height
        const focalLength = sensorHeightHalf / Math.tan(fovRadians / 2);            // <-- Calculate focal length from FOV
        return Math.max(LENS_MIN_FOCAL_LENGTH_MM, Math.min(LENS_MAX_FOCAL_LENGTH_MM, focalLength));  // <-- Clamp to valid range
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert Focal Length (mm) to FOV (radians)
    // ------------------------------------------------------------
    function focalLengthToFov(focalLengthMm) {
        const sensorHeightHalf = LENS_SENSOR_HEIGHT_MM / 2;                         // <-- Half sensor height
        const fovRadians = 2 * Math.atan(sensorHeightHalf / focalLengthMm);         // <-- Calculate FOV from focal length
        return fovRadians;                                                          // <-- Return FOV in radians
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Current Camera Focal Length
    // ------------------------------------------------------------
    function getCurrentCameraFocalLength(camera) {
        if (!camera) return null;                                                    // <-- Exit if camera not available
        
        // Try Babylon.js built-in method first
        // ------------------------------------
        if (typeof camera.getFocalLength === 'function') {
            try {
                const focalLength = camera.getFocalLength();                         // <-- Get focal length using built-in method
                return Math.max(LENS_MIN_FOCAL_LENGTH_MM, Math.min(LENS_MAX_FOCAL_LENGTH_MM, focalLength));  // <-- Clamp to valid range
            } catch (e) {
                console.warn('getFocalLength() method failed, using FOV calculation:', e);  // <-- Log warning if method fails
            }
        }
        
        // Fallback: Calculate from FOV
        // ------------------------------------
        if (camera.fov !== undefined) {
            return fovToFocalLength(camera.fov);                                    // <-- Convert FOV to focal length
        }
        
        return null;                                                                 // <-- Return null if unable to determine
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Set Camera Focal Length
    // ------------------------------------------------------------
    function setCameraFocalLength(camera, focalLengthMm) {
        if (!camera) return;                                                         // <-- Exit if camera not available
        
        // Clamp focal length to valid range
        // ------------------------------------
        const clampedFocalLength = Math.max(LENS_MIN_FOCAL_LENGTH_MM, Math.min(LENS_MAX_FOCAL_LENGTH_MM, focalLengthMm));  // <-- Clamp value
        
        // Try Babylon.js built-in method first
        // ------------------------------------
        if (typeof camera.setFocalLength === 'function') {
            try {
                camera.setFocalLength(clampedFocalLength);                          // <-- Set focal length using built-in method
                return;                                                              // <-- Exit if successful
            } catch (e) {
                console.warn('setFocalLength() method failed, using FOV calculation:', e);  // <-- Log warning if method fails
            }
        }
        
        // Fallback: Calculate FOV and set manually
        // ------------------------------------
        const fovRadians = focalLengthToFov(clampedFocalLength);                    // <-- Convert focal length to FOV
        camera.fov = fovRadians;                                                     // <-- Set camera FOV directly
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | UI Creation and Management
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Lens Adjustment Overlay
    // ------------------------------------------------------------
    function initializeLensAdjustmentOverlay() {
        // Wait for root container to exist
        // ------------------------------------
        const rootContainer = document.getElementById('root');
        if (!rootContainer) {
            setTimeout(initializeLensAdjustmentOverlay, 50);                         // <-- Retry if root not ready
            return;
        }
        
        
        // Check if overlay already exists
        // ------------------------------------
        if (document.getElementById('camera-lens-adjustment-overlay')) {
            return;                                                                 // <-- Exit if overlay already exists
        }
        
        
        // Create overlay HTML element
        // ------------------------------------
        const overlayElement = document.createElement('div');
        overlayElement.id = 'camera-lens-adjustment-overlay';
        overlayElement.className = 'camera-lens-adjustment-overlay';
        overlayElement.innerHTML = `
            <div class="camera-lens-adjustment-content">
                <div class="camera-lens-adjustment-title">Camera Lens</div>
                <div class="camera-lens-adjustment-section">
                    <div class="camera-lens-adjustment-controls">
                        <label for="camera-lens-slider" class="camera-lens-label">Focal Length:</label>
                        <div class="camera-lens-slider-container">
                            <input 
                                type="range" 
                                id="camera-lens-slider" 
                                class="camera-lens-slider"
                                min="${LENS_MIN_FOCAL_LENGTH_MM}" 
                                max="${LENS_MAX_FOCAL_LENGTH_MM}" 
                                value="35"
                                step="1"
                            />
                            <span class="camera-lens-value" id="camera-lens-value">35 mm</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        rootContainer.appendChild(overlayElement);
        
        
        // Get slider and value display elements
        // ------------------------------------
        const slider = document.getElementById('camera-lens-slider');
        const valueDisplay = document.getElementById('camera-lens-value');
        
        
        // Initialize slider with current camera focal length
        // ------------------------------------
        const updateSliderFromCamera = () => {
            if (typeof scene === 'undefined' || !scene.activeCamera) {
                setTimeout(updateSliderFromCamera, 100);                             // <-- Retry if camera not ready
                return;
            }
            
            const currentFocalLength = getCurrentCameraFocalLength(scene.activeCamera);  // <-- Get current focal length
            if (currentFocalLength !== null) {
                slider.value = Math.round(currentFocalLength);                       // <-- Set slider to current value
                valueDisplay.textContent = Math.round(currentFocalLength) + ' mm';   // <-- Update display
            }
        };
        updateSliderFromCamera();
        
        
        // Add event listener for slider changes
        // ------------------------------------
        slider.addEventListener('input', (event) => {
            const focalLength = parseFloat(event.target.value);                      // <-- Get slider value
            valueDisplay.textContent = Math.round(focalLength) + ' mm';              // <-- Update display
            
            // Apply focal length to camera
            // ------------------------------------
            if (typeof scene !== 'undefined' && scene.activeCamera) {
                setCameraFocalLength(scene.activeCamera, focalLength);               // <-- Update camera focal length
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Check Scene and Initialize
    // ------------------------------------------------------------
    function checkSceneAndInitialize() {
        if (typeof scene !== 'undefined') {
            initializeLensAdjustmentOverlay();                                      // <-- Initialize overlay when scene ready
            console.log('=== Camera Lens Adjustment Overlay Initialized ===');
            console.log('Focal length range: ' + LENS_MIN_FOCAL_LENGTH_MM + 'mm - ' + LENS_MAX_FOCAL_LENGTH_MM + 'mm');
            console.log('==================================================');
        } else {
            setTimeout(checkSceneAndInitialize, 100);                               // <-- Retry if scene not ready
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Initialization
// -----------------------------------------------------------------------------

    // Initialize lens adjustment overlay if enabled
    // ------------------------------------
    if (LENS_OVERLAY_ENABLED) {
        // Wait for DOM to be ready before initializing
        // ------------------------------------
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkSceneAndInitialize);  // <-- Initialize on DOM ready
        } else {
            checkSceneAndInitialize();                                               // <-- Initialize immediately if DOM ready
        }
    }

// endregion -------------------------------------------------------------------

