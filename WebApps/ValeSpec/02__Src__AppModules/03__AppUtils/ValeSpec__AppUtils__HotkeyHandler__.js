/* =============================================================================
   VALESPEC - HOTKEY HANDLER UTILITY
   =============================================================================

   FILE       : ValeSpec__AppUtils__HotkeyHandler__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppUtils - HotkeyHandler
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Global keyboard shortcut registration and dispatch
   CREATED    : 17-Apr-2026

   DESCRIPTION:
   - Loads hotkey bindings from ValeSpec__AppData__Hotkeys__Main__.json via fetch
   - Registers a single window keydown listener to handle all shortcuts
   - Skips dispatch when focus is on input, textarea, or select elements
   - Exposes initHotkeys(actionCallbacks) and destroyHotkeys() for lifecycle
   - Mirrored from Whitecardopedia system

   ============================================================================= */

// =============================================================================
// REGION | Hotkey Handler Module
// =============================================================================

const ValeSpec__AppUtils__HotkeyHandler = (function() {

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
        var tag = document.activeElement && document.activeElement.tagName.toLowerCase();  // <-- Get focused element tag
        return tag === 'input' || tag === 'textarea' || tag === 'select';    // <-- True if any text input is focused
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Match Keyboard Event Against a Binding
    // ------------------------------------------------------------
    function matchesBinding(event, binding) {
        var keyMatch      = event.key         === binding.key;             // <-- Check key name match
        var altMatch      = !!event.altKey    === !!binding.altKey;        // <-- Check Alt modifier match
        var ctrlMatch     = !!event.ctrlKey   === !!binding.ctrlKey;       // <-- Check Ctrl modifier match
        var shiftMatch    = !!event.shiftKey  === !!binding.shiftKey;      // <-- Check Shift modifier match
        return keyMatch && altMatch && ctrlMatch && shiftMatch;            // <-- All conditions must pass
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dispatch Hotkey Action to Registered Callback
    // ------------------------------------------------------------
    function dispatchHotkeyAction(action) {
        var callback = _actionCallbacks[action];                           // <-- Look up registered callback
        if (typeof callback === 'function') {
            callback();                                                      // <-- Invoke callback if registered
        } else {
            console.warn('[ValeSpec__HotkeyHandler] No callback registered for action "' + action + '"');  // <-- Warn on unhandled action
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Window Keydown Event
    // ------------------------------------------------------------
    function handleKeyDown(event) {
        if (isInputFocused()) return;                                        // <-- Skip when typing in input fields

        for (var i = 0; i < _hotkeyBindings.length; i++) {
            var binding = _hotkeyBindings[i];
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

        var dataPath = '02__Src__AppModules/02__AppData/ValeSpec__AppData__Hotkeys__Main__.json';  // <-- Path to hotkey bindings data file

        fetch(dataPath)
            .then(function(response) {
                if (!response.ok) throw new Error('[ValeSpec__HotkeyHandler] Failed to load bindings (' + response.status + ')');  // <-- Check HTTP response
                return response.json();                                      // <-- Parse JSON response
            })
            .then(function(data) {
                var bindings = data['ValeSpec__AppData__Hotkeys__Main'];
                _hotkeyBindings = Array.isArray(bindings) ? bindings : [];   // <-- Store loaded bindings
                _keydownListener = handleKeyDown;                            // <-- Store listener reference for cleanup
                window.addEventListener('keydown', _keydownListener);        // <-- Attach global keydown listener
                console.log('[ValeSpec__HotkeyHandler] Initialised with ' + _hotkeyBindings.length + ' bindings.');
            })
            .catch(function(err) {
                console.error('[ValeSpec__HotkeyHandler] Could not initialise -', err); // <-- Log initialisation failure
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


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__HotkeyHandler__Init    : initHotkeys,
        ValeSpec__HotkeyHandler__Destroy : destroyHotkeys
    };

// endregion -------------------------------------------------------------------

})();

// =============================================================================
// REGION | Module Export
// =============================================================================

window.ValeSpec__AppUtils__HotkeyHandler  =  ValeSpec__AppUtils__HotkeyHandler;

// endregion ===================================================================
