// -----------------------------------------------------------------------------
// REGION | App Hotkeys Handler
// -----------------------------------------------------------------------------

 // MODULE VARIABLES | Hotkeys Listener Reference
 // ------------------------------------------------------------
 let Na__AppCore__HotkeysListener = null;
 // ------------------------------------------------------------


 // FUNCTION | Setup Global Hotkeys
 // ------------------------------------------------------------
 export function Na__AppCore__SetupHotkeysHandler(config) {
    const { onUndo, onRedo } = config;
    Na__AppCore__TeardownHotkeysHandler();

    Na__AppCore__HotkeysListener = function Na__AppCore__HandleHotkeys(keyboardEvent) {
        const targetElement = keyboardEvent.target;
        const isTypingInInput =
            targetElement instanceof HTMLElement &&
            (
                targetElement.tagName === 'INPUT' ||
                targetElement.tagName === 'TEXTAREA' ||
                targetElement.tagName === 'SELECT' ||
                targetElement.isContentEditable
            );
        if (isTypingInInput) return;

        const isControlPressed = keyboardEvent.ctrlKey || keyboardEvent.metaKey;
        if (!isControlPressed) return;

        const keyValue = keyboardEvent.key.toLowerCase();
        const isUndoShortcut = keyValue === 'z' && !keyboardEvent.shiftKey;
        const isRedoShortcut = keyValue === 'y' || (keyValue === 'z' && keyboardEvent.shiftKey);

        if (isUndoShortcut) {
            keyboardEvent.preventDefault();
            keyboardEvent.stopPropagation();
            if (onUndo) onUndo();
            return;
        }

        if (isRedoShortcut) {
            keyboardEvent.preventDefault();
            keyboardEvent.stopPropagation();
            if (onRedo) onRedo();
        }
    };

    window.addEventListener('keydown', Na__AppCore__HotkeysListener);
 }
 // ------------------------------------------------------------


 // FUNCTION | Teardown Global Hotkeys
 // ------------------------------------------------------------
 export function Na__AppCore__TeardownHotkeysHandler() {
    if (!Na__AppCore__HotkeysListener) return;

    window.removeEventListener('keydown', Na__AppCore__HotkeysListener);
    Na__AppCore__HotkeysListener = null;
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
