/* =============================================================================
 WHITECARDVISION - TOAST UTILITY
=============================================================================
 FILE       : WhitecardVision__AppUtils__Toast__.js
 NAMESPACE  : Wv
 MODULE     : AppUtils - Toast
 PURPOSE    : Transient message strip under the header.
============================================================================= */

// =============================================================================
// REGION | Toast Module
// =============================================================================

(function () {
    'use strict';

    const WV__TOAST__DEFAULT_TIMEOUT_MS = 4200;


    // FUNCTION | Push a transient toast notification
    // ------------------------------------------------------------
    function Wv__Toast__Show(messageText, severityToken, optionalTimeoutMs) {
        const hostElement = document.getElementById('Wv__App__ToastHost');
        if (!hostElement) { console.warn('[Toast]', messageText); return; }

        const severityClass = {
            info    : 'Wv__Toast--Info',
            success : 'Wv__Toast--Success',
            warning : 'Wv__Toast--Warning',
            error   : 'Wv__Toast--Error'
        }[(severityToken || 'info').toLowerCase()] || 'Wv__Toast--Info';

        const toastElement       = document.createElement('div');
        toastElement.className   = 'Wv__Toast ' + severityClass;
        toastElement.textContent = messageText;
        hostElement.appendChild(toastElement);

        const timeoutDuration = optionalTimeoutMs || WV__TOAST__DEFAULT_TIMEOUT_MS;
        setTimeout(() => {
            toastElement.style.transition = 'opacity 220ms ease';
            toastElement.style.opacity    = '0';
            setTimeout(() => toastElement.remove(), 260);
        }, timeoutDuration);
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__AppUtils__Toast = { Wv__Toast__Show };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
