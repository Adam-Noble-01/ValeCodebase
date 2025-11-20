// =============================================================================
// VALEVISION3D - NAVIGATION CONTROLS INSTRUCTIONS PANEL
// =============================================================================
//
// FILE       : Navigation__ControlsInstructionsPanel.js
// NAMESPACE  : ValeVision3D
// MODULE     : Navigation Controls Instructions Panel
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Display collapsible navigation controls instructions panel
// CREATED    : 2025
//
// DESCRIPTION:
// - Displays clear navigation controls instructions for users
// - Collapsible panel with toggle arrow (default: open)
// - Positioned in top-right area below header
// - Simple, boomer-proof step-by-step instructions
// - Covers mouse and keyboard navigation controls
//
// =============================================================================


// #Region ------------------------------------------------
// CONFIGURATION | Panel settings and constants
// --------------------------------------------------------

// Panel Display Settings
// ------------------------------------
const CONTROLS_PANEL_DEFAULT_OPEN      = true;                               // <-- Panel starts open by default

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// PANEL CREATION | Build and inject controls instructions panel
// --------------------------------------------------------

// FUNCTION | CreateControlsInstructionsPanel - Creates and injects HTML for controls panel
// --------------------------------------------------------
function createControlsInstructionsPanel() {
    // Create panel container
    // ------------------------------------
    const panelContainer = document.createElement('div');
    panelContainer.id = 'controlsInstructionsPanel';
    panelContainer.className = 'controls-instructions-panel';
    
    // Determine initial state (open or collapsed)
    // ------------------------------------
    const isOpen = CONTROLS_PANEL_DEFAULT_OPEN;
    if (!isOpen) {
        panelContainer.classList.add('collapsed');
    }
    
    // Build panel HTML structure
    // ------------------------------------
    panelContainer.innerHTML = `
        <div class="controls-panel-header" id="controlsPanelHeader">
            <h4 class="controls-panel-title">Navigation Controls</h4>
            <div class="controls-panel-toggle" id="controlsPanelToggle">
                <span class="toggle-arrow">${isOpen ? '▼' : '▶'}</span>
            </div>
        </div>
        
        <div class="controls-panel-content" id="controlsPanelContent">
            <!-- Mouse Controls Section -->
            <div class="controls-section">
                <h5 class="controls-section-title">🖱️ Mouse Controls</h5>
                <div class="controls-list">
                    <div class="control-item">
                        <span class="control-key">Left Click + Drag</span>
                        <span class="control-separator">:</span>
                        <span class="control-description">Look around (rotate view)</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">Right Click + Drag</span>
                        <span class="control-separator">:</span>
                        <span class="control-description">Pan view (move sideways/up/down)</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">Both Buttons + Drag</span>
                        <span class="control-separator">:</span>
                        <span class="control-description">Fast pan (2.5x speed)</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">Mouse Wheel</span>
                        <span class="control-separator">:</span>
                        <span class="control-description">Zoom in / Zoom out</span>
                    </div>
                </div>
            </div>
            
            <!-- Keyboard Movement Section -->
            <div class="controls-section">
                <h5 class="controls-section-title">⌨️ Keyboard Movement</h5>
                <div class="controls-list">
                    <div class="control-item">
                        <span class="control-key">W</span>
                        <span class="control-separator">:</span>
                        <span class="control-description">Move forward</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">S</span>
                        <span class="control-separator">:</span>
                        <span class="control-description">Move backward</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">A</span>
                        <span class="control-separator">:</span>
                        <span class="control-description">Move left</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">D</span>
                        <span class="control-separator">:</span>
                        <span class="control-description">Move right</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">Q</span>
                        <span class="control-separator">:</span>
                        <span class="control-description">Move down</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">E</span>
                        <span class="control-separator">:</span>
                        <span class="control-description">Move up</span>
                    </div>
                    <div class="control-item">
                        <span class="control-key">Arrow Keys</span>
                        <span class="control-separator">:</span>
                        <span class="control-description">Alternative to WASD</span>
                    </div>
                </div>
            </div>
            
            <!-- Speed Boost Section -->
            <div class="controls-section">
                <h5 class="controls-section-title">⚡ Speed Boost</h5>
                <div class="controls-list">
                    <div class="control-item">
                        <span class="control-key">Hold Shift</span>
                        <span class="control-separator">:</span>
                        <span class="control-description">Move 3x faster</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Inject panel into page
    // ------------------------------------
    document.body.appendChild(panelContainer);
    
    // Setup toggle functionality
    // ------------------------------------
    setupPanelToggle();
    
    // Set initial positions for right-side panels
    // ------------------------------------
    updateRightSidePanelPositions(!isOpen);
    
    console.log('Controls Instructions Panel created');
}
// --------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// TOGGLE FUNCTIONALITY | Handle panel collapse/expand
// --------------------------------------------------------

// FUNCTION | SetupPanelToggle - Attach click handler to toggle panel visibility
// --------------------------------------------------------
function setupPanelToggle() {
    const panelContainer = document.getElementById('controlsInstructionsPanel');
    const panelHeader = document.getElementById('controlsPanelHeader');
    const panelContent = document.getElementById('controlsPanelContent');
    const toggleButton = document.getElementById('controlsPanelToggle');
    const toggleArrow = toggleButton.querySelector('.toggle-arrow');
    
    // Add click handler to header (entire header is clickable)
    // ------------------------------------
    panelHeader.addEventListener('click', () => {
        const isCollapsed = panelContainer.classList.toggle('collapsed');
        
        // Update arrow direction
        // ------------------------------------
        if (isCollapsed) {
            toggleArrow.textContent = '▶';                               // <-- Collapsed state (arrow right)
        } else {
            toggleArrow.textContent = '▼';                               // <-- Open state (arrow down)
        }
        
        // Update right-side panel positions
        // ------------------------------------
        updateRightSidePanelPositions(isCollapsed);
        
        console.log(`Controls panel ${isCollapsed ? 'collapsed' : 'expanded'}`);
    });
    
    // Add hover effect to header
    // ------------------------------------
    panelHeader.style.cursor = 'pointer';
}
// --------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// DYNAMIC POSITIONING | Adjust right-side panel positions based on collapse state
// --------------------------------------------------------

// FUNCTION | UpdateRightSidePanelPositions - Dynamically adjust right-side panel positions
// --------------------------------------------------------
function updateRightSidePanelPositions(isCollapsed) {
    const downloadButton = document.querySelector('.download-screenshot-button');
    const lensPanel = document.querySelector('.camera-lens-adjustment-overlay');
    const headerHeight = 'var(--Vale_HeaderHeight)';
    
    if (isCollapsed) {
        // Collapsed: Move panels up closer to header
        // ------------------------------------
        if (downloadButton) {
            downloadButton.style.top = `calc(${headerHeight} + 100px)`;  // <-- Position near top when collapsed
        }
        if (lensPanel) {
            lensPanel.style.top = `calc(${headerHeight} + 160px)`;       // <-- Position below download button
        }
    } else {
        // Expanded: Move panels down below Navigation Controls
        // ------------------------------------
        if (downloadButton) {
            downloadButton.style.top = `calc(${headerHeight} + 700px)`;  // <-- Position below expanded panel
        }
        if (lensPanel) {
            lensPanel.style.top = `calc(${headerHeight} + 760px)`;       // <-- Position below download button
        }
    }
}
// --------------------------------------------------------

// #endregion ---------------------------------------------


// #Region ------------------------------------------------
// INITIALIZATION | Auto-create panel on page load
// --------------------------------------------------------

// Create panel when DOM is ready
// ------------------------------------
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createControlsInstructionsPanel);
} else {
    createControlsInstructionsPanel();
}

// #endregion ---------------------------------------------

