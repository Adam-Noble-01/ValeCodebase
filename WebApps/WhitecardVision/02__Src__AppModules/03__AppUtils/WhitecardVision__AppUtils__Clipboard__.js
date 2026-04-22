/* =============================================================================
 WHITECARDVISION - CLIPBOARD / CARET UTILITY
=============================================================================
 Tracks the most recently focused prompt textarea/input so that clicking a
 template tile can inject text exactly where the user last had focus.
============================================================================= */

(function () {
    'use strict';

    let Wv__Clipboard__LastFocusedField = null;


    /* FUNCTION | Start tracking which prompt field last had focus */
    /* ------------------------------------------------------------ */
    function Wv__Clipboard__InstallFocusTracker() {
        document.addEventListener('focusin', (focusEvent) => {
            const eventTarget = focusEvent.target;
            if (!eventTarget) return;
            if (eventTarget.tagName === 'TEXTAREA' || (eventTarget.tagName === 'INPUT' && eventTarget.type === 'text')) {
                Wv__Clipboard__LastFocusedField = eventTarget;
            }
        });
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Get the last focused field (or null) */
    /* ------------------------------------------------------------ */
    function Wv__Clipboard__GetLastFocusedField() { return Wv__Clipboard__LastFocusedField; }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Copy a string to the clipboard and insert at caret */
    /* ------------------------------------------------------------ */
    async function Wv__Clipboard__CopyAndInsertAtCursor(textToInsert) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(textToInsert);
            }
        } catch (clipboardError) {
            console.warn('[Wv__Clipboard] clipboard write failed:', clipboardError);
        }

        const targetField = Wv__Clipboard__LastFocusedField;
        if (!targetField) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Template copied to clipboard. Click a prompt field to insert.', 'info');
            return;
        }

        const selectionStart  = (targetField.selectionStart ?? targetField.value.length);
        const selectionEnd    = (targetField.selectionEnd   ?? targetField.value.length);
        const previousValue   = targetField.value;
        targetField.value     = previousValue.slice(0, selectionStart) + textToInsert + previousValue.slice(selectionEnd);
        const newCaretPos     = selectionStart + textToInsert.length;
        targetField.focus();
        targetField.setSelectionRange(newCaretPos, newCaretPos);
        targetField.dispatchEvent(new Event('input', { bubbles: true }));
    }
    /* ------------------------------------------------------------ */


    window.Wv__AppUtils__Clipboard = {
        Wv__Clipboard__InstallFocusTracker,
        Wv__Clipboard__GetLastFocusedField,
        Wv__Clipboard__CopyAndInsertAtCursor
    };

})();
