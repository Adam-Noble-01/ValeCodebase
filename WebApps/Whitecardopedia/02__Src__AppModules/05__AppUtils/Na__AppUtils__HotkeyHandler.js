// =============================================================================
// WHITECARDOPEDIA - HOTKEY HANDLER UTILITY
// =============================================================================
//
// FILE       : Na__AppUtils__HotkeyHandler.js
// NAMESPACE  : Whitecardopedia
// MODULE     : AppUtils
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Global keyboard shortcut registration and dispatch
// CREATED    : 07-Apr-2026
//
// DESCRIPTION:
// - Loads hotkey bindings from Na__AppData__Hotkeys__Main.json via fetch
// - Registers a single window keydown listener to handle all shortcuts
// - Skips dispatch when focus is on input, textarea, or select elements
// - Exposes initHotkeys(actionCallbacks) and destroyHotkeys() for lifecycle
// - Designed to be called from a React useEffect for mount/unmount wiring
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Hotkey Handler - Initialisation and Dispatch
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Handler State
    // ------------------------------------------------------------
    let _hotkeyBindings    = [];                                             // <-- Loaded bindings from JSON data file
    let _actionCallbacks   = {};                                             // <-- Map of action name to callback function
    let _keydownListener   = null;                                           // <-- Reference to active keydown listener for cleanup
    // ------------------------------------------------------------


    // HELPER FUNCTION | Check if Focus is on an Interactive Input Element
    // ------------------------------------------------------------
    function isInputFocused() {
        const tag = document.activeElement && document.activeElement.tagName.toLowerCase();  // <-- Get focused element tag
        return tag === 'input' || tag === 'textarea' || tag === 'select';    // <-- True if any text input is focused
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Match Keyboard Event Against a Binding
    // ------------------------------------------------------------
    function matchesBinding(event, binding) {
        const keyMatch      = event.key         === binding.key;             // <-- Check key name match
        const altMatch      = !!event.altKey    === !!binding.altKey;        // <-- Check Alt modifier match
        const ctrlMatch     = !!event.ctrlKey   === !!binding.ctrlKey;       // <-- Check Ctrl modifier match
        const shiftMatch    = !!event.shiftKey  === !!binding.shiftKey;      // <-- Check Shift modifier match
        return keyMatch && altMatch && ctrlMatch && shiftMatch;              // <-- All conditions must pass
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dispatch Hotkey Action to Registered Callback
    // ------------------------------------------------------------
    function dispatchHotkeyAction(action) {
        const callback = _actionCallbacks[action];                           // <-- Look up registered callback
        if (typeof callback === 'function') {
            callback();                                                      // <-- Invoke callback if registered
        } else {
            console.warn(`HotkeyHandler: No callback registered for action "${action}"`);  // <-- Warn on unhandled action
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Window Keydown Event
    // ------------------------------------------------------------
    function handleKeyDown(event) {
        if (isInputFocused()) return;                                        // <-- Skip when typing in input fields

        for (const binding of _hotkeyBindings) {
            if (matchesBinding(event, binding)) {
                event.preventDefault();                                      // <-- Prevent default browser behaviour
                dispatchHotkeyAction(binding.action);                        // <-- Dispatch to registered callback
                break;                                                       // <-- Stop after first match
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Hotkeys - Load Bindings and Register Listener
    // ------------------------------------------------------------
    function initHotkeys(actionCallbacks) {
        _actionCallbacks = actionCallbacks || {};                            // <-- Store provided action callbacks

        const dataPath = '02__Src__AppModules/03__AppData/Na__AppData__Hotkeys__Main.json';  // <-- Path to hotkey bindings data file

        fetch(dataPath)
            .then(response => {
                if (!response.ok) throw new Error(`HotkeyHandler: Failed to load bindings (${response.status})`);  // <-- Check HTTP response
                return response.json();                                      // <-- Parse JSON response
            })
            .then(data => {
                _hotkeyBindings = data.hotkeys || [];                        // <-- Store loaded bindings
                _keydownListener = handleKeyDown;                            // <-- Store listener reference for cleanup
                window.addEventListener('keydown', _keydownListener);        // <-- Attach global keydown listener
            })
            .catch(err => {
                console.error('HotkeyHandler: Could not initialise -', err); // <-- Log initialisation failure
            });
    }
    // ------------------------------------------------------------


    // FUNCTION | Destroy Hotkeys - Remove Listener and Reset State
    // ------------------------------------------------------------
    function destroyHotkeys() {
        if (_keydownListener) {
            window.removeEventListener('keydown', _keydownListener);         // <-- Remove listener from window
            _keydownListener = null;                                         // <-- Clear listener reference
        }
        _hotkeyBindings  = [];                                               // <-- Clear loaded bindings
        _actionCallbacks = {};                                               // <-- Clear registered callbacks
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
