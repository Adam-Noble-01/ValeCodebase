// #Region ------------------------------------------------
// CAMERA POSITION OVERLAY | Display camera position in top right corner
// --------------------------------------------------------

// Module toggle - Set to false to disable overlay
// ------------------------------------
const CAMERA_OVERLAY_ENABLED = true;                              // <-- Toggle to enable/disable overlay


// Initialize overlay if enabled
// ------------------------------------
if (CAMERA_OVERLAY_ENABLED) {
    // FUNCTION | InitializeOverlay - Creates and appends overlay to root container
    // --------------------------------------------------------
    function initializeOverlay() {
        // Wait for root container to exist
        // ------------------------------------
        const rootContainer = document.getElementById('root');
        if (!rootContainer) {
            setTimeout(initializeOverlay, 50);
            return;
        }


        // Create overlay HTML element
        // ------------------------------------
        const overlayElement = document.createElement('div');
        overlayElement.className = 'camera-position-overlay';
        overlayElement.innerHTML = `
            <div class="camera-overlay-content">
                <div class="camera-overlay-title">Camera Stats</div>
                <div class="camera-overlay-section">
                    <div class="camera-overlay-section-title">Position</div>
                    <div class="camera-overlay-data">
                        <div class="camera-overlay-row">
                            <span class="camera-overlay-label">X:</span>
                            <span class="camera-overlay-value" id="cameraPosX">0.00</span>
                        </div>
                        <div class="camera-overlay-row">
                            <span class="camera-overlay-label">Y:</span>
                            <span class="camera-overlay-value" id="cameraPosY">0.00</span>
                        </div>
                        <div class="camera-overlay-row">
                            <span class="camera-overlay-label">Z:</span>
                            <span class="camera-overlay-value" id="cameraPosZ">0.00</span>
                        </div>
                    </div>
                </div>
                <div class="camera-overlay-section">
                    <div class="camera-overlay-section-title">Rotation</div>
                    <div class="camera-overlay-data">
                        <div class="camera-overlay-row">
                            <span class="camera-overlay-label">X:</span>
                            <span class="camera-overlay-value" id="cameraRotX">0.00</span>
                        </div>
                        <div class="camera-overlay-row">
                            <span class="camera-overlay-label">Y:</span>
                            <span class="camera-overlay-value" id="cameraRotY">0.00</span>
                        </div>
                        <div class="camera-overlay-row">
                            <span class="camera-overlay-label">Z:</span>
                            <span class="camera-overlay-value" id="cameraRotZ">0.00</span>
                        </div>
                    </div>
                </div>
                <div class="camera-overlay-section">
                    <div class="camera-overlay-section-title">Lens</div>
                    <div class="camera-overlay-data">
                        <div class="camera-overlay-row">
                            <span class="camera-overlay-label">Focal Length:</span>
                            <span class="camera-overlay-value" id="cameraLensMm">0 mm</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        rootContainer.appendChild(overlayElement);
    }
    // --------------------------------------------------------


    // FUNCTION | Initialize Download JSON Button
    // --------------------------------------------------------
    function initializeDownloadJsonButton() {
        // Wait for root container to exist
        // ------------------------------------
        const rootContainer = document.getElementById('root');                          // <-- Get root container
        if (!rootContainer) {
            setTimeout(initializeDownloadJsonButton, 50);                                // <-- Retry if container not ready
            return;
        }
        
        
        // Check if button already exists
        // ------------------------------------
        if (document.getElementById('downloadCameraPositionButton')) {
            return;                                                                     // <-- Exit if button already exists
        }
        
        
        // Create download button element
        // ------------------------------------
        const downloadButton = document.createElement('button');                        // <-- Create button element
        downloadButton.id = 'downloadCameraPositionButton';                             // <-- Set button ID
        downloadButton.className = 'camera-position-download-button';                    // <-- Set CSS class
        downloadButton.innerHTML = 'Download Json File';                                 // <-- Set button text
        downloadButton.title = 'Download camera position, rotation, and lens as JSON';   // <-- Set tooltip text
        
        
        // Attach click event handler
        // ------------------------------------
        downloadButton.addEventListener('click', function(event) {
            event.preventDefault();                                                      // <-- Prevent default button behavior
            downloadCameraPosition();                                                   // <-- Trigger JSON download
        });
        
        
        // Append button to root container
        // ------------------------------------
        rootContainer.appendChild(downloadButton);                                      // <-- Add button to DOM
        
        
        console.log('=== Download JSON Button Initialized ===');                        // <-- Log button initialization
    }
    // --------------------------------------------------------


    // HELPER FUNCTION | Get Current Lens Focal Length in mm from UI Slider
    // --------------------------------------------------------
    function getCurrentLensFocalLength() {
        const sliderElement = document.getElementById('camera-lens-slider');  // <-- Get slider element
        if (sliderElement && sliderElement.value) {
            return parseFloat(sliderElement.value);                           // <-- Return slider value
        }
        return null;                                                          // <-- Return null if slider not available
    }
    // --------------------------------------------------------


    // FUNCTION | UpdateCameraPosition - Updates overlay with current camera position and rotation
    // --------------------------------------------------------
    function updateCameraPosition() {
        // Check if scene and camera exist
        // ------------------------------------
        if (typeof scene === 'undefined' || !scene.activeCamera) {
            return;
        }


        // Get camera position and rotation
        // ------------------------------------
        const camera = scene.activeCamera;
        const position = camera.position;
        const rotation = camera.rotation; // Vector3 in radians


        // Update position values
        // ------------------------------------
        const posXElement = document.getElementById('cameraPosX');
        const posYElement = document.getElementById('cameraPosY');
        const posZElement = document.getElementById('cameraPosZ');


        if (posXElement) posXElement.textContent = position.x.toFixed(2);
        if (posYElement) posYElement.textContent = position.y.toFixed(2);
        if (posZElement) posZElement.textContent = position.z.toFixed(2);


        // Update rotation values (Vector3 in radians)
        // ------------------------------------
        const rotXElement = document.getElementById('cameraRotX');
        const rotYElement = document.getElementById('cameraRotY');
        const rotZElement = document.getElementById('cameraRotZ');


        if (rotXElement) rotXElement.textContent = rotation.x.toFixed(4);
        if (rotYElement) rotYElement.textContent = rotation.y.toFixed(4);
        if (rotZElement) rotZElement.textContent = rotation.z.toFixed(4);


        // Update lens focal length value from UI slider
        // ------------------------------------
        const lensMmElement = document.getElementById('cameraLensMm');          // <-- Get lens display element
        if (lensMmElement) {
            const focalLength = getCurrentLensFocalLength();                  // <-- Get current focal length from slider
            if (focalLength !== null) {
                lensMmElement.textContent = focalLength + ' mm';              // <-- Update display with focal length
            } else {
                lensMmElement.textContent = 'N/A';                            // <-- Show N/A if slider not available
            }
        }
    }
    // --------------------------------------------------------


    // HELPER FUNCTION | Generate Camera Position Filename
    // --------------------------------------------------------
    function generateCameraPositionFilename() {
        const timestamp = new Date().toISOString()                              // <-- Get ISO timestamp
            .replace(/:/g, '-')                                                 // <-- Replace colons with hyphens
            .replace(/\..+/, '');                                               // <-- Remove milliseconds
        return `ValeVision3D_CameraPosition_${timestamp}.json`;                // <-- Return filename with timestamp
    }
    // --------------------------------------------------------


    // HELPER FUNCTION | Trigger JSON Download
    // --------------------------------------------------------
    function triggerJsonDownload(jsonContent, filename) {
        const blob = new Blob([jsonContent], { type: 'application/json' });     // <-- Create blob with JSON content
        const url = URL.createObjectURL(blob);                                   // <-- Create object URL
        const link = document.createElement('a');                                // <-- Create temporary anchor element
        link.href = url;                                                         // <-- Set object URL as href
        link.download = filename;                                                // <-- Set download filename
        document.body.appendChild(link);                                         // <-- Append to DOM temporarily
        link.click();                                                            // <-- Trigger click to download
        document.body.removeChild(link);                                         // <-- Remove from DOM
        URL.revokeObjectURL(url);                                               // <-- Revoke object URL to free memory
    }
    // --------------------------------------------------------


    // FUNCTION | Download Camera Position as JSON
    // --------------------------------------------------------
    function downloadCameraPosition() {
        // Check if scene and camera exist
        // ------------------------------------
        if (typeof scene === 'undefined' || !scene.activeCamera) {
            console.warn('Cannot download camera position: Scene or camera not available');  // <-- Log warning if unavailable
            return;
        }


        // Get camera data
        // ------------------------------------
        const camera = scene.activeCamera;                                       // <-- Get active camera
        const position = camera.position;                                       // <-- Get camera position
        const rotation = camera.rotation;                                       // <-- Get camera rotation
        const lensMm = getCurrentLensFocalLength();                            // <-- Get current lens focal length from slider


        // Format values for code-ready output
        // ------------------------------------
        const posX = parseFloat(position.x.toFixed(4));                          // <-- X position (4 decimal places)
        const posY = parseFloat(position.y.toFixed(4));                          // <-- Y position (4 decimal places)
        const posZ = parseFloat(position.z.toFixed(4));                          // <-- Z position (4 decimal places)
        const rotX = parseFloat(rotation.x.toFixed(6));                          // <-- X rotation in radians (6 decimal places)
        const rotY = parseFloat(rotation.y.toFixed(6));                          // <-- Y rotation in radians (6 decimal places)
        const rotZ = parseFloat(rotation.z.toFixed(6));                          // <-- Z rotation in radians (6 decimal places)
        const lensValue = lensMm !== null ? lensMm : 35;                         // <-- Lens focal length in mm (default to 35 if unavailable)


        // Create JSON object with both data and code-ready format
        // ------------------------------------
        const cameraData = {
            position: {                                                          // <-- Position object
                x: posX,                                                         // <-- X position
                y: posY,                                                         // <-- Y position
                z: posZ                                                          // <-- Z position
            },
            rotation: {                                                          // <-- Rotation object
                x: rotX,                                                         // <-- X rotation in radians
                y: rotY,                                                         // <-- Y rotation in radians
                z: rotZ                                                          // <-- Z rotation in radians
            },
            lensMm: lensValue,                                                   // <-- Lens focal length in mm
            codeFormat: {                                                        // <-- Code-ready format for copy-paste
                position: `new BABYLON.Vector3(${posX}, ${posY}, ${posZ})`,      // <-- Position code format
                rotation: `new BABYLON.Vector3(${rotX}, ${rotY}, ${rotZ})`,     // <-- Rotation code format
                lensMm: lensValue                                                // <-- Lens mm value
            }
        };


        // Create code-ready output string (matching Navigation__UniversalCamera.js format)
        // ------------------------------------
        const codeOutput = `// Camera View Configuration
const NAV_INITIAL_POSITION         = new BABYLON.Vector3(${posX}, ${posY}, ${posZ});     // <-- Initial camera position
const NAV_INITIAL_ROTATION         = new BABYLON.Vector3(${rotX}, ${rotY}, ${rotZ});     // <-- Initial camera rotation (Vector3 in radians: pitch, yaw, roll)
const NAV_INITIAL_LENS_MM          = ${lensValue};                                      // <-- Initial camera lens focal length (mm)
`;


        // Create combined output with JSON and code format
        // ------------------------------------
        const combinedOutput = {
            json: cameraData,                                                    // <-- JSON data object
            code: codeOutput                                                     // <-- Code-ready format
        };


        // Convert to JSON string with code output included
        // ------------------------------------
        const jsonString = JSON.stringify(combinedOutput, null, 2);             // <-- Format JSON with 2-space indentation


        // Generate filename and trigger download
        // ------------------------------------
        const filename = generateCameraPositionFilename();                       // <-- Generate filename with timestamp
        triggerJsonDownload(jsonString, filename);                              // <-- Trigger download


        // Also log code format to console for easy copy-paste
        // ------------------------------------
        console.log('=== Camera Position Code Format (Copy-Paste Ready) ===');   // <-- Log header
        console.log(codeOutput);                                                 // <-- Log code format
        console.log('Camera position downloaded:', filename);                    // <-- Log successful download
    }
    // --------------------------------------------------------


    // Register update function to render loop
    // ------------------------------------
    // Wait for scene to be initialized before registering
    // ------------------------------------
    const checkSceneAndRegister = () => {
        if (typeof scene !== 'undefined' && scene.activeCamera) {
            // Register update in render loop
            // ------------------------------------
            scene.registerBeforeRender(() => {
                updateCameraPosition();
            });


            console.log('=== Camera Position & Rotation Overlay Initialized ===');
            console.log('Overlay enabled and updating in render loop');
            console.log('======================================================');
        } else {
            // Retry after a short delay if scene not ready
            // ------------------------------------
            setTimeout(checkSceneAndRegister, 100);
        }
    };


    // Initialize overlay element
    // ------------------------------------
    // Wait for DOM to be ready before initializing
    // ------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOverlay);
    } else {
        initializeOverlay();
    }


    // Initialize download JSON button
    // ------------------------------------
    // Wait for DOM to be ready before initializing
    // ------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDownloadJsonButton);
    } else {
        initializeDownloadJsonButton();
    }


    // Start checking for scene availability
    // ------------------------------------
    // Use DOMContentLoaded or immediate check
    // ------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkSceneAndRegister);
    } else {
        checkSceneAndRegister();
    }
}

// #endregion ---------------------------------------------
