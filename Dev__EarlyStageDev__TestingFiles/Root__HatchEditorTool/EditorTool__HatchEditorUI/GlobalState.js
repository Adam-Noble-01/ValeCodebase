// =============================================================================
// VALE DESIGN SUITE - GLOBAL STATE MANAGEMENT
// =============================================================================
//
// FILE       : GlobalState.js
// NAMESPACE  : HatchEditor
// MODULE     : GlobalState
// AUTHOR     : Generated for Vale Design Suite
// PURPOSE    : Centralized state management for Hatch Editor Tool
// CREATED    : 2025
//
// DESCRIPTION:
// - Manages all global application state in one place
// - Provides getters and setters for state access
// - Ensures consistent state management across modules
// - Must be loaded before all other JavaScript files
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Global State Definition
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Application State Container
    // ------------------------------------------------------------
    const GlobalState = {
        // Canvas Related State
        canvas              : null,                                  // <-- Main canvas element
        ctx                 : null,                                  // <-- Canvas 2D context
        
        // Data State
        currentPattern      : null,                                  // <-- Currently loaded pattern data
        dxfData             : null,                                  // <-- Loaded DXF file data
        sliderValues        : {},                                    // <-- Current slider values
        
        // UI State
        livePreviewEnabled  : true,                                  // <-- Live preview toggle state
        previewTimeout      : null,                                  // <-- Debounce timeout for preview
        isNavigationReady   : false,                                 // <-- Flag to track navigation system readiness
        
        // Configuration Constants
        CANVAS_PADDING      : 50,                                    // <-- Canvas padding in pixels
        PREVIEW_DELAY       : 300,                                   // <-- Preview debounce delay in ms
        GRID_SIZE           : 50                                     // <-- Grid line spacing
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | State Access Functions
// -----------------------------------------------------------------------------

    // FUNCTION | Get State Value
    // ------------------------------------------------------------
    function getState(key) {
        return GlobalState[key];                                     // <-- Return state value
    }
    // ------------------------------------------------------------

    // FUNCTION | Set State Value
    // ------------------------------------------------------------
    function setState(key, value) {
        GlobalState[key] = value;                                    // <-- Set state value
        return value;                                               // <-- Return the set value
    }
    // ------------------------------------------------------------

    // FUNCTION | Update Multiple State Values
    // ------------------------------------------------------------
    function updateState(updates) {
        Object.entries(updates).forEach(([key, value]) => {         // <-- Iterate through updates
            GlobalState[key] = value;                               // <-- Apply each update
        });
    }
    // ------------------------------------------------------------

    // FUNCTION | Get All State
    // ------------------------------------------------------------
    function getAllState() {
        return { ...GlobalState };                                   // <-- Return copy of state
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Convenience Getters for Common State
// -----------------------------------------------------------------------------

    // FUNCTION | Get Canvas and Context
    // ------------------------------------------------------------
    function getCanvas() {
        return GlobalState.canvas;                                   // <-- Return canvas element
    }
    // ------------------------------------------------------------

    // FUNCTION | Get Canvas Context
    // ------------------------------------------------------------
    function getContext() {
        return GlobalState.ctx;                                      // <-- Return canvas context
    }
    // ------------------------------------------------------------

    // FUNCTION | Get Current Pattern
    // ------------------------------------------------------------
    function getCurrentPattern() {
        return GlobalState.currentPattern;                           // <-- Return current pattern
    }
    // ------------------------------------------------------------

    // FUNCTION | Get DXF Data
    // ------------------------------------------------------------
    function getDXFData() {
        return GlobalState.dxfData;                                  // <-- Return DXF data
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// -----------------------------------------------------------------------------
// REGION | Global Function Exports
// -----------------------------------------------------------------------------

    // Export all state management functions to window object
    window.GlobalState = GlobalState;                                         // <-- Export state object
    window.getState = getState;                                              // <-- Export state getter
    window.setState = setState;                                              // <-- Export state setter
    window.updateState = updateState;                                        // <-- Export bulk updater
    window.getAllState = getAllState;                                        // <-- Export state getter
    window.getCanvas = getCanvas;                                            // <-- Export canvas getter
    window.getContext = getContext;                                          // <-- Export context getter
    window.getCurrentPattern = getCurrentPattern;                            // <-- Export pattern getter
    window.getDXFData = getDXFData;                                          // <-- Export DXF data getter

// endregion ------------------------------------------------------------------- 