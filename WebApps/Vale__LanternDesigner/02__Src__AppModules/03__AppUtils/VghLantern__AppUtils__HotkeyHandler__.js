/* =============================================================================
   VGHLANTERN - HOTKEY HANDLER UTILITY
   =============================================================================

   FILE       : VghLantern__AppUtils__HotkeyHandler__.js
   NAMESPACE  : VghLantern
   MODULE     : AppUtils - HotkeyHandler
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Global keyboard shortcut registration and dispatch
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Loads hotkey bindings from VghLantern__AppData__Hotkeys__Main__.json via fetch
   - Registers a single window keydown listener to handle all shortcuts
   - Skips dispatch when focus is on input, textarea, or select elements
   - Exposes Init(actionCallbacks) and Destroy() for lifecycle control

   ============================================================================= */

// =============================================================================
// REGION | Hotkey Handler Module
// =============================================================================

const VghLantern__AppUtils__HotkeyHandler = (function() {

// -----------------------------------------------------------------------------
// REGION | Hotkey Handler - Initialisation and Dispatch
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Bindings Data File Path
    // ------------------------------------------------------------
    const HOTKEY_DATA_PATH  =  '02__Src__AppModules/02__AppData/VghLantern__AppData__Hotkeys__Main__.json';
    const HOTKEY_DATA_KEY   =  'VghLantern__AppData__Hotkeys__Main';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Handler State
    // ------------------------------------------------------------
    let _hotkeyBindings   =  [];                                             // <-- Loaded bindings from JSON data file
    let _actionCallbacks  =  {};                                             // <-- Map of action name to callback function
    let _keydownListener  =  null;                                           // <-- Reference to active keydown listener for cleanup
    // ------------------------------------------------------------


    // HELPER FUNCTION | Check if Focus is on an Interactive Input Element
    // ------------------------------------------------------------
    function VghLantern__HotkeyHandler__IsInputFocused() {
        var tag  =  document.activeElement && document.activeElement.tagName.toLowerCase();  // <-- Get focused element tag
        return tag === 'input' || tag === 'textarea' || tag === 'select';     // <-- True if any text input is focused
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Match Keyboard Event Against a Binding
    // ------------------------------------------------------------
    function VghLantern__HotkeyHandler__MatchesBinding(event, binding) {
        var keyMatch    =  event.key        === binding.key;                 // <-- Check key name match
        var altMatch    =  !!event.altKey   === !!binding.altKey;            // <-- Check Alt modifier match
        var ctrlMatch   =  !!event.ctrlKey  === !!binding.ctrlKey;           // <-- Check Ctrl modifier match
        var shiftMatch  =  !!event.shiftKey === !!binding.shiftKey;          // <-- Check Shift modifier match
        return keyMatch && altMatch && ctrlMatch && shiftMatch;              // <-- All conditions must pass
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dispatch Hotkey Action to Registered Callback
    // ------------------------------------------------------------
    function VghLantern__HotkeyHandler__DispatchAction(action) {
        var callback  =  _actionCallbacks[action];                           // <-- Look up registered callback
        if (typeof callback === 'function') {
            callback();                                                      // <-- Invoke callback if registered
        } else {
            console.warn('[VghLantern__HotkeyHandler] No callback registered for action "' + action + '"');
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Window Keydown Event
    // ------------------------------------------------------------
    function VghLantern__HotkeyHandler__HandleKeyDown(event) {
        if (VghLantern__HotkeyHandler__IsInputFocused()) return;             // <-- Skip when typing in input fields

        for (var i = 0; i < _hotkeyBindings.length; i++) {
            var binding  =  _hotkeyBindings[i];
            if (VghLantern__HotkeyHandler__MatchesBinding(event, binding)) {
                event.preventDefault();                                      // <-- Prevent default browser behaviour
                VghLantern__HotkeyHandler__DispatchAction(binding.action);    // <-- Dispatch to registered callback
                break;                                                       // <-- Stop after first match
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Hotkeys - Load Bindings and Register Listener
    // ------------------------------------------------------------
    function VghLantern__HotkeyHandler__Init(actionCallbacks) {
        _actionCallbacks  =  actionCallbacks || {};                          // <-- Store provided action callbacks

        fetch(HOTKEY_DATA_PATH)
            .then(function(response) {
                if (!response.ok) throw new Error('[VghLantern__HotkeyHandler] Failed to load bindings (' + response.status + ')');
                return response.json();
            })
            .then(function(data) {
                var bindings     =  data[HOTKEY_DATA_KEY];
                _hotkeyBindings  =  Array.isArray(bindings) ? bindings : [];  // <-- Store loaded bindings
                _keydownListener =  VghLantern__HotkeyHandler__HandleKeyDown; // <-- Store listener reference for cleanup
                window.addEventListener('keydown', _keydownListener);         // <-- Attach global keydown listener
                console.log('[VghLantern__HotkeyHandler] Initialised with ' + _hotkeyBindings.length + ' bindings.');
            })
            .catch(function(err) {
                console.error('[VghLantern__HotkeyHandler] Could not initialise -', err);
            });
    }
    // ------------------------------------------------------------


    // FUNCTION | Destroy Hotkeys - Remove Listener and Reset State
    // ------------------------------------------------------------
    function VghLantern__HotkeyHandler__Destroy() {
        if (_keydownListener) {
            window.removeEventListener('keydown', _keydownListener);          // <-- Remove listener from window
            _keydownListener  =  null;
        }
        _hotkeyBindings   =  [];
        _actionCallbacks  =  {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__HotkeyHandler__Init    : VghLantern__HotkeyHandler__Init,
        VghLantern__HotkeyHandler__Destroy : VghLantern__HotkeyHandler__Destroy
    };

// endregion -------------------------------------------------------------------

})();

// =============================================================================
// REGION | Module Export
// =============================================================================

window.VghLantern__AppUtils__HotkeyHandler  =  VghLantern__AppUtils__HotkeyHandler;

// endregion ===================================================================
