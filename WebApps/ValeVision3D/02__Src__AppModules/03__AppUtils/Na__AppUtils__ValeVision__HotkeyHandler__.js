// =============================================================================
// VALEVISION3D - GLOBAL HOTKEY HANDLER
// =============================================================================
//
// FILE       : Na__AppUtils__ValeVision__HotkeyHandler__.js
// NAMESPACE  : Na__AppUtils
// MODULE     : ValeVision Hotkey Handler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Global keyboard shortcut registration and dispatch for ValeVision3D
// CREATED    : 25-Jun-2026
//
// DESCRIPTION:
// - Loads hotkey bindings from Na__ValeVision__HotkeysDictionary__.json via fetch.
// - Registers a single window keydown listener to handle all shortcuts.
// - Skips dispatch when focus is on input, textarea, or select elements.
// - Matches key, altKey, shiftKey, and ctrlKey against each binding.
// - Dispatches matched action string to the registered callback map.
// - Exposes Na__ValeVision__HotkeyHandler__Initialize(actionCallbacks) and
//   Na__ValeVision__HotkeyHandler__Destroy() for lifecycle management.
// - Called from index.html after scene initialisation is complete.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 25-Jun-2026 - Version 1.0.0
// - Initial implementation. Centralises all single-fire global hotkeys that
//   were previously scattered across individual *EventListeners.js modules.
// - Dictionary: 02__AppData/Na__ValeVision__HotkeysDictionary__.json
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Hotkey Handler - State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Handler State
    // ------------------------------------------------------------
    let Na__HotkeyHandler__Bindings        = [];    // <-- Loaded bindings from dictionary JSON
    let Na__HotkeyHandler__ActionCallbacks = {};    // <-- Map of action string to callback function
    let Na__HotkeyHandler__KeydownListener = null;  // <-- Reference for cleanup on destroy
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hotkey Handler - Matching and Dispatch
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Check if Focus is on an Interactive Input Element
    // ------------------------------------------------------------
    function Na__HotkeyHandler__IsInputFocused() {
        const tag = document.activeElement && document.activeElement.tagName.toLowerCase(); // <-- Get focused element tag
        return tag === 'input' || tag === 'textarea' || tag === 'select';                   // <-- True if typing context is active
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Match Keyboard Event Against a Single Binding
    // ------------------------------------------------------------
    function Na__HotkeyHandler__MatchesBinding(event, binding) {
        const keyMatch   = event.key         === binding.Na__Hotkey__Key;    // <-- Exact key name match
        const altMatch   = !!event.altKey    === !!binding.Na__Hotkey__AltKey;   // <-- Alt modifier match
        const ctrlMatch  = !!event.ctrlKey   === !!binding.Na__Hotkey__CtrlKey;  // <-- Ctrl modifier match
        const shiftMatch = !!event.shiftKey  === !!binding.Na__Hotkey__ShiftKey; // <-- Shift modifier match
        return keyMatch && altMatch && ctrlMatch && shiftMatch;              // <-- All four conditions must pass
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dispatch Action to Registered Callback
    // ------------------------------------------------------------
    function Na__HotkeyHandler__DispatchAction(action) {
        const callback = Na__HotkeyHandler__ActionCallbacks[action];         // <-- Look up registered callback
        if (typeof callback === 'function') {
            callback();                                                      // <-- Invoke callback if registered
        } else {
            console.warn(`[ValeVision3D] HotkeyHandler: No callback for action "${action}"`); // <-- Warn on unhandled action
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Window Keydown Event
    // ------------------------------------------------------------
    function Na__HotkeyHandler__HandleKeyDown(event) {
        if (Na__HotkeyHandler__IsInputFocused()) return;                     // <-- Skip when typing in input fields

        for (const binding of Na__HotkeyHandler__Bindings) {
            if (Na__HotkeyHandler__MatchesBinding(event, binding)) {
                event.preventDefault();                                      // <-- Prevent default browser behaviour
                Na__HotkeyHandler__DispatchAction(binding.Na__Hotkey__Action); // <-- Dispatch to registered callback
                break;                                                       // <-- Stop on first match
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Hotkey Handler - Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Initialise - Load Dictionary and Register Keydown Listener
    // ------------------------------------------------------------
    function Na__ValeVision__HotkeyHandler__Initialize(actionCallbacks) {
        Na__HotkeyHandler__ActionCallbacks = actionCallbacks || {};          // <-- Store provided action callbacks

        const dictionaryPath = '02__Src__AppModules/02__AppData/Na__ValeVision__HotkeysDictionary__.json'; // <-- Path to hotkey dictionary

        fetch(dictionaryPath)
            .then(response => {
                if (!response.ok) throw new Error(`HotkeyHandler: Failed to load dictionary (${response.status})`); // <-- Check HTTP status
                return response.json();                                      // <-- Parse JSON response
            })
            .then(data => {
                Na__HotkeyHandler__Bindings = data.Na__ValeVision__HotkeysDictionary || []; // <-- Read bindings array
                Na__HotkeyHandler__KeydownListener = Na__HotkeyHandler__HandleKeyDown;       // <-- Store listener reference
                window.addEventListener('keydown', Na__HotkeyHandler__KeydownListener);      // <-- Attach global keydown listener
                console.log(`[ValeVision3D] HotkeyHandler: ${Na__HotkeyHandler__Bindings.length} bindings loaded.`); // <-- Confirm load
            })
            .catch(err => {
                console.error('[ValeVision3D] HotkeyHandler: Could not initialise -', err); // <-- Log initialisation failure
            });
    }
    // ------------------------------------------------------------


    // FUNCTION | Destroy - Remove Listener and Reset State
    // ------------------------------------------------------------
    function Na__ValeVision__HotkeyHandler__Destroy() {
        if (Na__HotkeyHandler__KeydownListener) {
            window.removeEventListener('keydown', Na__HotkeyHandler__KeydownListener); // <-- Remove listener from window
            Na__HotkeyHandler__KeydownListener = null;                       // <-- Clear listener reference
        }
        Na__HotkeyHandler__Bindings        = [];                             // <-- Clear loaded bindings
        Na__HotkeyHandler__ActionCallbacks = {};                             // <-- Clear registered callbacks
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Hotkey Handler Public API
    // ------------------------------------------------------------
    export {
        Na__ValeVision__HotkeyHandler__Initialize,
        Na__ValeVision__HotkeyHandler__Destroy
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
