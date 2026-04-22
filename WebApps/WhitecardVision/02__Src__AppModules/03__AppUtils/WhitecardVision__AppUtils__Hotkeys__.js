/* =============================================================================
 WHITECARDVISION - HOTKEY HANDLER
=============================================================================
 FILE       : WhitecardVision__AppUtils__Hotkeys__.js
 NAMESPACE  : Wv
 MODULE     : AppUtils - Hotkeys
 PURPOSE    : Global keydown registry for app-wide keyboard shortcuts.
============================================================================= */

// =============================================================================
// REGION | Hotkeys Module
// =============================================================================

(function () {
    'use strict';

    const Wv__Hotkeys__Registry = [];


    // FUNCTION | Register a hotkey combo + handler
    // ------------------------------------------------------------
    function Wv__Hotkeys__Register(comboString, handlerFunction, hotkeyDescription) {                                            //<-- combo eg "Ctrl+S", "Ctrl+Shift+E"
        Wv__Hotkeys__Registry.push({
            combo       : comboString.toLowerCase(),
            handler     : handlerFunction,
            description : hotkeyDescription || ''
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalise a KeyboardEvent to "ctrl+shift+k"
    // ------------------------------------------------------------
    function Wv__Hotkeys__ComboFromEvent(keyboardEvent) {
        const tokens = [];
        if (keyboardEvent.ctrlKey  || keyboardEvent.metaKey) tokens.push('ctrl');
        if (keyboardEvent.altKey)                            tokens.push('alt');
        if (keyboardEvent.shiftKey)                          tokens.push('shift');
        const keyToken = (keyboardEvent.key || '').toLowerCase();
        if (keyToken && !['control','shift','alt','meta'].includes(keyToken)) tokens.push(keyToken);
        return tokens.join('+');
    }
    // ------------------------------------------------------------


    // FUNCTION | Install the global keydown listener once
    // ------------------------------------------------------------
    function Wv__Hotkeys__Install() {
        document.addEventListener('keydown', (keyboardEvent) => {
            const comboToken = Wv__Hotkeys__ComboFromEvent(keyboardEvent);
            if (!comboToken) return;
            for (const entry of Wv__Hotkeys__Registry) {
                if (entry.combo === comboToken) {
                    keyboardEvent.preventDefault();
                    try { entry.handler(keyboardEvent); }
                    catch (handlerError) { console.error('[Hotkey handler error]', handlerError); }
                    return;
                }
            }
        });
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__AppUtils__Hotkeys = {
        Wv__Hotkeys__Register,
        Wv__Hotkeys__Install
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
