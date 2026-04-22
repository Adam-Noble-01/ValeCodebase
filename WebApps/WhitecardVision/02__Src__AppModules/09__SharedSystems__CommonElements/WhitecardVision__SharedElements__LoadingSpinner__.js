/* =============================================================================
 WHITECARDVISION - SHARED ELEMENT - LOADING SPINNER
=============================================================================
 Drop an absolute-positioned overlay (dual-ring + status + elapsed counter)
 over any host element while a long-running operation is in flight.
============================================================================= */

(function () {
    'use strict';


    const Wv__SharedElements__LoadingSpinner__Registry = new WeakMap();                                                         //<-- host element -> { overlayEl, tickHandle, startedAtMs }.


    /* FUNCTION | Show the spinner over a given host element */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__LoadingSpinner__ShowOver(hostElement, labelText) {
        if (!hostElement) return;
        Wv__SharedElements__LoadingSpinner__Hide(hostElement);                                                                  //<-- Defensive: never stack two overlays.

        const overlayElement        = document.createElement('div');
        overlayElement.className    = 'Wv__LoadingSpinner__Overlay';
        overlayElement.innerHTML    = `
            <div class="Wv__LoadingSpinner__Ring">
                <span></span><span></span><span></span><span></span>
            </div>
            <div class="Wv__LoadingSpinner__Label">${(labelText || 'Working...').replace(/</g, '&lt;')}</div>
            <div class="Wv__LoadingSpinner__Elapsed" data-wv-elapsed>0.0s</div>
        `;

        const previousPositionValue = window.getComputedStyle(hostElement).position;
        if (previousPositionValue === 'static') hostElement.style.position = 'relative';

        hostElement.appendChild(overlayElement);

        const startedAtMs           = performance.now();
        const elapsedReadoutEl      = overlayElement.querySelector('[data-wv-elapsed]');
        const tickHandle            = window.setInterval(() => {
            const elapsedSeconds    = (performance.now() - startedAtMs) / 1000;
            elapsedReadoutEl.textContent = elapsedSeconds.toFixed(1) + 's';
        }, 100);

        Wv__SharedElements__LoadingSpinner__Registry.set(hostElement, {
            overlayEl   : overlayElement,
            tickHandle  : tickHandle,
            startedAtMs : startedAtMs
        });
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Hide the spinner for a given host element */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__LoadingSpinner__Hide(hostElement) {
        if (!hostElement) return;
        const registryEntry = Wv__SharedElements__LoadingSpinner__Registry.get(hostElement);
        if (!registryEntry) return;
        window.clearInterval(registryEntry.tickHandle);
        if (registryEntry.overlayEl && registryEntry.overlayEl.parentElement) {
            registryEntry.overlayEl.parentElement.removeChild(registryEntry.overlayEl);
        }
        Wv__SharedElements__LoadingSpinner__Registry.delete(hostElement);
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Update the label text while still running */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__LoadingSpinner__UpdateLabel(hostElement, newLabelText) {
        const registryEntry = Wv__SharedElements__LoadingSpinner__Registry.get(hostElement);
        if (!registryEntry || !registryEntry.overlayEl) return;
        const labelElement = registryEntry.overlayEl.querySelector('.Wv__LoadingSpinner__Label');
        if (labelElement) labelElement.textContent = newLabelText || '';
    }
    /* ------------------------------------------------------------ */


    window.Wv__SharedElements__LoadingSpinner = {
        Wv__SharedElements__LoadingSpinner__ShowOver,
        Wv__SharedElements__LoadingSpinner__Hide,
        Wv__SharedElements__LoadingSpinner__UpdateLabel
    };

})();
