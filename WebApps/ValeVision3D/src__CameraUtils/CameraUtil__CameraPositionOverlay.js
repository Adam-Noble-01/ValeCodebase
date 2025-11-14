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
            </div>
        `;
        rootContainer.appendChild(overlayElement);
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
