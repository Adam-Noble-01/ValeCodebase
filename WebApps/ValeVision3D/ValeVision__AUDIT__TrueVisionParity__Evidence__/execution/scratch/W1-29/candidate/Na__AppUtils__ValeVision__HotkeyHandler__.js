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
// - Loads hotkey bindings from Na__Hotkeys__3dModelTab__.json via fetch.
// - Registers a single window keydown listener to handle all shortcuts.
// - Acts only while the 3D Model tab has the keyboard: the model key scope
//   of Na__AppUtils__KeyScope__, which follows the Layout Editor's mode
//   controller. A drawing tab and a document tab each have a keyboard of
//   their own, so their keys never reach the hidden 3D view.
// - Skips dispatch when focus is on input, textarea, or select elements,
//   or anything contenteditable (Na__KeyScope__IsTypingTarget).
// - Matches key, altKey, shiftKey, and ctrlKey against each binding.
// - Dispatches matched action string to the registered callback map. A
//   binding whose action has no callback - the dictionary's drawing-markup
//   rows, which document keys for the help panel - is passed over, and the
//   key is left to the page.
// - Exposes Na__ValeVision__HotkeyHandler__Initialize(actionCallbacks) and
//   Na__ValeVision__HotkeyHandler__Destroy() for lifecycle management.
// - Called from index.html after scene initialisation is complete.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 25-Jun-2026)
// - Twin          : TrueVision3D 02__Src__AppModules/10__NavigationAndCameras/Na__Hotkeys__Manager.js,
//                   whose array-driven dispatch (2.0.0, 16-Sep-2026) was taken from this file.
//                   Its 2.1.0 key-scope guard and contenteditable typing test are replayed here
//                   as hunks, over Na__AppUtils__KeyScope__ (ported whole beside this file)
// - Source version: 2.1.0 (TrueVision3D v2.110.0, 21-Sep-2026; read at b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-29}}
// - Parity        : diverged (ValeVision keeps its own handler, DR-33; only TrueVision's
//                   guard is replayed)
// - Divergences   :
//   - ValeVision's own module: its file name, namespace and Initialize / Destroy API, the
//     dictionary it fetches itself (TrueVision's Manager is handed its config), the root
//     key Na__ValeVision__HotkeysDictionary and the ValeVision__ actions. TrueVision's
//     key-label propagation (ApplyUiLabels, GetKeyLabel) is not taken: ValeVision's help
//     panel builds its rows from the same file.
//   - A binding whose action has no callback is passed over before the key is taken: the
//     dictionary carries ten ValeVision__DrawingMarkup__Contextual rows that document
//     drawing-markup keys for the help panel. TrueVision keeps its reference rows outside
//     the dispatch array.
//   - Console prefix [ValeVision3D].
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.2 (key scope, {{VVREL:W1-29}})
// - THE 3D MODEL TAB'S KEYS ARE THE 3D MODEL TAB'S. The listener sat on the
//   window for the whole session and never asked which tab was up, so R, B,
//   T, Y, V, 1-9 and Page Up / Page Down went on answering under the Layout
//   Editor: T on a drawing picked the Text tool AND put the hidden model into
//   Walk mode, R reset a camera nobody could see as it picked the Rectangle,
//   and V toggled the scene carousel behind the sheet. It now acts only in the
//   model key scope (Na__AppUtils__KeyScope__, ported whole from
//   TrueVision3D), as TrueVision3D's Na__Hotkeys__Manager 2.1.0 does. The
//   scope follows the Layout Editor's mode controller once the controller
//   hands its reader over; until then it is the 3D model's, so the 3D Model
//   tab's keys work exactly as before.
// - The typing guard missed contenteditable, so a key was taken from any
//   editable region - a plan annotation label being edited on the 3D Model
//   tab among them. It now uses Na__KeyScope__IsTypingTarget, the same test
//   with that case added.
// - A binding with no callback is passed over before the key is taken. The
//   dictionary's ten ValeVision__DrawingMarkup__Contextual rows document the
//   drawing-markup keys for the help panel, and D, O, Delete and Escape were
//   swallowed on every press with a "No callback" warning.
//
// 01-Oct-2026 - Version 1.0.1 (hotkey file names, v2.71.1)
// - The dictionary takes TrueVision's per-tab file name,
//   02__AppData/Na__Hotkeys__3dModelTab__.json, so only the fetch
//   path changes. Its content is untouched: the root key stays
//   Na__ValeVision__HotkeysDictionary and every action keeps its
//   ValeVision__ name.
//
// 25-Jun-2026 - Version 1.0.0
// - Initial implementation. Centralises all single-fire global hotkeys that
//   were previously scattered across individual *EventListeners.js modules.
// - Dictionary: 02__AppData/Na__Hotkeys__3dModelTab__.json
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Which Keyboard Is Live, and Whether the Focus Takes Typing
    // ------------------------------------------------------------
    // @delegate: ./Na__AppUtils__KeyScope__.js
    // ------------------------------------------------------------
    import { Na__KeyScope__MODEL, Na__KeyScope__Is, Na__KeyScope__IsTypingTarget } from './Na__AppUtils__KeyScope__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


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
    // A text box, a text area, a list - or anything contenteditable, which the
    // old tag test missed, so a key was taken from any editable region.
    // ------------------------------------------------------------
    function Na__HotkeyHandler__IsInputFocused() {
        return Na__KeyScope__IsTypingTarget(document.activeElement);          // <-- True if typing context is active
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Match Keyboard Event Against a Single Binding
    // ------------------------------------------------------------
    function Na__HotkeyHandler__MatchesBinding(event, binding) {
        const bindingKey = binding.Na__Hotkey__Key || '';
        const eventKey   = event.key || '';
        const keyMatch   = (bindingKey.length === 1 && eventKey.length === 1)
            ? eventKey.toLowerCase() === bindingKey.toLowerCase()            // <-- Letter keys: match F/f regardless of Shift/Caps
            : eventKey === bindingKey;                                       // <-- Named keys: exact match (Backspace, PageUp, …)
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
        if (!Na__KeyScope__Is(Na__KeyScope__MODEL)) return;                  // <-- A drawing or a document tab has the keyboard: its keys are its own
        if (Na__HotkeyHandler__IsInputFocused()) return;                     // <-- Skip when typing in input fields

        for (const binding of Na__HotkeyHandler__Bindings) {
            if (Na__HotkeyHandler__MatchesBinding(event, binding)) {
                if (typeof Na__HotkeyHandler__ActionCallbacks[binding.Na__Hotkey__Action] !== 'function') continue; // <-- A documentation row (no callback): not a shortcut, the key stays the page's
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

        const dictionaryPath = '02__Src__AppModules/02__AppData/Na__Hotkeys__3dModelTab__.json'; // <-- Path to hotkey dictionary

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
