// -----------------------------------------------------------------------------
// REGION | Layout Manager - Draggable Divider Functionality
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Layout State Management
    // ------------------------------------------------------------
    let isDragging                    = false;                                    // <-- Flag to track if divider is being dragged
    let startX                        = 0;                                        // <-- Starting X position of drag
    let startWidth                    = 0;                                        // <-- Starting width of control panel
    let minPanelWidth                 = 250;                                      // <-- Minimum width for control panel
    let maxPanelWidth                 = 600;                                      // <-- Maximum width for control panel
    let lastClickTime                 = 0;                                        // <-- Track last click time for double-click detection
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Control Panel Element
    // ------------------------------------------------------------
    function getControlPanel() {
        return document.getElementById('control-panel');                          // <-- Get control panel element
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Get Layout Divider Element
    // ------------------------------------------------------------
    function getLayoutDivider() {
        return document.getElementById('layout-divider');                         // <-- Get layout divider element
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Calculate Panel Width from Mouse Position
    // ------------------------------------------------------------
    function calculatePanelWidth(mouseX) {
        const containerWidth = window.innerWidth;                                 // <-- Get total window width
        const newWidth = Math.max(minPanelWidth, Math.min(maxPanelWidth, mouseX)); // <-- Constrain width within limits
        return newWidth;                                                         // <-- Return calculated width
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Control Panel Width
    // ------------------------------------------------------------
    function updateControlPanelWidth(width) {
        const controlPanel = getControlPanel();                                   // <-- Get control panel element
        if (controlPanel) {
            controlPanel.style.width = width + 'px';                             // <-- Set new width
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Add Visual Feedback for Divider
    // ------------------------------------------------------------
    function addDividerFeedback() {
        const divider = getLayoutDivider();                                       // <-- Get divider element
        if (divider) {
            divider.style.backgroundColor = 'var(--ValeDividerHoverColor)';      // <-- Change background color
            divider.style.boxShadow = '0 0 10px rgba(51, 102, 153, 0.3)';        // <-- Add glow effect
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remove Visual Feedback from Divider
    // ------------------------------------------------------------
    function removeDividerFeedback() {
        const divider = getLayoutDivider();                                       // <-- Get divider element
        if (divider) {
            divider.style.backgroundColor = '';                                   // <-- Reset background color
            divider.style.boxShadow = '';                                         // <-- Remove glow effect
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Mouse Down Event on Divider
    // ------------------------------------------------------------
    function handleMouseDown(event) {
        isDragging = true;                                                        // <-- Set dragging flag to true
        startX = event.clientX;                                                   // <-- Store starting X position
        startWidth = getControlPanel().offsetWidth;                              // <-- Store starting panel width
        
        const divider = getLayoutDivider();                                       // <-- Get divider element
        if (divider) {
            divider.classList.add('dragging');                                   // <-- Add dragging class for visual feedback
            addDividerFeedback();                                                 // <-- Add visual feedback
        }
        
        document.addEventListener('mousemove', handleMouseMove);                   // <-- Add mouse move listener
        document.addEventListener('mouseup', handleMouseUp);                      // <-- Add mouse up listener
        
        event.preventDefault();                                                   // <-- Prevent default behavior
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Mouse Move Event During Drag
    // ------------------------------------------------------------
    function handleMouseMove(event) {
        if (!isDragging) return;                                                  // <-- Exit if not dragging
        
        const deltaX = event.clientX - startX;                                   // <-- Calculate X movement delta
        const newWidth = calculatePanelWidth(startWidth + deltaX);               // <-- Calculate new panel width
        updateControlPanelWidth(newWidth);                                       // <-- Update panel width
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Mouse Up Event to End Drag
    // ------------------------------------------------------------
    function handleMouseUp(event) {
        if (!isDragging) return;                                                  // <-- Exit if not dragging
        
        isDragging = false;                                                       // <-- Set dragging flag to false
        
        const divider = getLayoutDivider();                                       // <-- Get divider element
        if (divider) {
            divider.classList.remove('dragging');                                // <-- Remove dragging class
            removeDividerFeedback();                                              // <-- Remove visual feedback
        }
        
        document.removeEventListener('mousemove', handleMouseMove);               // <-- Remove mouse move listener
        document.removeEventListener('mouseup', handleMouseUp);                   // <-- Remove mouse up listener
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Double Click Event on Divider
    // ------------------------------------------------------------
    function handleDoubleClick(event) {
        resetLayoutToDefault();                                                   // <-- Reset layout to default
        addDividerFeedback();                                                     // <-- Add brief visual feedback
        setTimeout(removeDividerFeedback, 300);                                  // <-- Remove feedback after 300ms
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Click Event for Double-Click Detection
    // ------------------------------------------------------------
    function handleClick(event) {
        const currentTime = new Date().getTime();                                 // <-- Get current time
        const timeDiff = currentTime - lastClickTime;                            // <-- Calculate time difference
        
        if (timeDiff < 300 && timeDiff > 0) {                                    // <-- Check if double-click (within 300ms)
            handleDoubleClick(event);                                            // <-- Handle double-click
            lastClickTime = 0;                                                    // <-- Reset last click time
        } else {
            lastClickTime = currentTime;                                         // <-- Store current click time
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Handle Window Resize Event
    // ------------------------------------------------------------
    function handleWindowResize() {
        const controlPanel = getControlPanel();                                   // <-- Get control panel element
        if (controlPanel && !isDragging) {
            const currentWidth = controlPanel.offsetWidth;                        // <-- Get current width
            const constrainedWidth = calculatePanelWidth(currentWidth);           // <-- Calculate constrained width
            updateControlPanelWidth(constrainedWidth);                           // <-- Update panel width if needed
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Layout Manager
    // ------------------------------------------------------------
    function initializeLayoutManager() {
        const divider = getLayoutDivider();                                       // <-- Get layout divider element
        
        if (divider) {
            divider.addEventListener('mousedown', handleMouseDown);               // <-- Add mouse down event listener
            divider.addEventListener('click', handleClick);                       // <-- Add click event listener for double-click detection
            divider.addEventListener('mouseenter', addDividerFeedback);           // <-- Add hover feedback
            divider.addEventListener('mouseleave', removeDividerFeedback);        // <-- Remove hover feedback
        }
        
        window.addEventListener('resize', handleWindowResize);                     // <-- Add window resize listener
        
        // Set initial width to 33.33% of window width
        const initialWidth = Math.max(minPanelWidth, Math.min(maxPanelWidth, window.innerWidth * 0.33)); // <-- Calculate initial width
        updateControlPanelWidth(initialWidth);                                   // <-- Set initial panel width
        
        console.log('Layout Manager initialized successfully');                   // <-- Log initialization success
    }
    // ------------------------------------------------------------


    // FUNCTION | Reset Layout to Default
    // ------------------------------------------------------------
    function resetLayoutToDefault() {
        const defaultWidth = Math.max(minPanelWidth, Math.min(maxPanelWidth, window.innerWidth * 0.33)); // <-- Calculate default width
        updateControlPanelWidth(defaultWidth);                                   // <-- Reset to default width
        console.log('Layout reset to default: ' + defaultWidth + 'px');          // <-- Log reset action
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Control Panel Width Programmatically
    // ------------------------------------------------------------
    function setControlPanelWidth(width) {
        const constrainedWidth = calculatePanelWidth(width);                     // <-- Constrain the provided width
        updateControlPanelWidth(constrainedWidth);                               // <-- Update panel width
        return constrainedWidth;                                                 // <-- Return the actual width set
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Control Panel Width
    // ------------------------------------------------------------
    function getControlPanelWidth() {
        const controlPanel = getControlPanel();                                   // <-- Get control panel element
        return controlPanel ? controlPanel.offsetWidth : 0;                      // <-- Return current width or 0
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Layout Configuration
    // ------------------------------------------------------------
    function getLayoutConfiguration() {
        return {
            controlPanelWidth: getControlPanelWidth(),                           // <-- Current control panel width
            minPanelWidth: minPanelWidth,                                        // <-- Minimum panel width
            maxPanelWidth: maxPanelWidth,                                        // <-- Maximum panel width
            isDragging: isDragging                                               // <-- Current dragging state
        };
    }
    // ------------------------------------------------------------


// endregion ---------------------------------------------------- 

// -----------------------------------------------------------------------------
// REGION | Global Function Exports
// -----------------------------------------------------------------------------

    // Export functions to global scope for integration
    window.initializeLayoutManager = initializeLayoutManager;                 // <-- Export layout manager initialization
    window.setControlPanelWidth = setControlPanelWidth;                       // <-- Export panel width setter
    window.getControlPanelWidth = getControlPanelWidth;                       // <-- Export panel width getter
    window.getLayoutConfiguration = getLayoutConfiguration;                   // <-- Export layout config getter
    window.resetLayoutToDefault = resetLayoutToDefault;                       // <-- Export layout reset function

// endregion ---------------------------------------------------- 