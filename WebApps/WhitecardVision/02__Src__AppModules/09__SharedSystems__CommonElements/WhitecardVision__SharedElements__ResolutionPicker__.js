/* =============================================================================
 WHITECARDVISION - SHARED ELEMENT - RESOLUTION PICKER
=============================================================================
 3-button pill [ 1K | 2K | 4K ] that writes back into a caller-provided
 setter. Aspect ratio is NOT exposed - it always inherits from the
 whitecard / base image elsewhere in the app.
============================================================================= */

(function () {
    'use strict';


    const WV__RESOLUTION_OPTIONS = ['1K', '2K', '4K'];


    /* FUNCTION | Mount a picker into an arbitrary host element */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__ResolutionPicker__Mount(hostElement, options) {
        if (!hostElement) return;
        const getValueFn = options.getValue || (() => '2K');
        const setValueFn = options.setValue || (() => {});
        const modeLabel  = options.modeLabel || 'Output Resolution';

        hostElement.classList.add('Wv__ResolutionPicker');
        hostElement.innerHTML = `
            <span class="Wv__ResolutionPicker__Label">${modeLabel.replace(/</g, '&lt;')}</span>
            <div class="Wv__ResolutionPicker__Group" role="group" aria-label="${modeLabel.replace(/"/g, '&quot;')}"></div>
        `;

        const buttonGroupEl = hostElement.querySelector('.Wv__ResolutionPicker__Group');
        for (const resolutionToken of WV__RESOLUTION_OPTIONS) {
            const buttonElement     = document.createElement('button');
            buttonElement.type      = 'button';
            buttonElement.className = 'Wv__ResolutionPicker__Button';
            buttonElement.textContent = resolutionToken;
            buttonElement.dataset.wvResolution = resolutionToken;
            buttonElement.addEventListener('click', () => {
                setValueFn(resolutionToken);
                Wv__SharedElements__ResolutionPicker__PaintActive(hostElement, resolutionToken);
            });
            buttonGroupEl.appendChild(buttonElement);
        }

        Wv__SharedElements__ResolutionPicker__PaintActive(hostElement, getValueFn() || '2K');

        return {
            refresh : () => Wv__SharedElements__ResolutionPicker__PaintActive(hostElement, getValueFn() || '2K')
        };
    }
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Highlight the active option */
    /* ------------------------------------------------------------ */
    function Wv__SharedElements__ResolutionPicker__PaintActive(hostElement, activeResolutionToken) {
        const buttonList = hostElement.querySelectorAll('.Wv__ResolutionPicker__Button');
        buttonList.forEach(btn => {
            if (btn.dataset.wvResolution === activeResolutionToken) {
                btn.classList.add('Wv__ResolutionPicker__Button--Active');
            } else {
                btn.classList.remove('Wv__ResolutionPicker__Button--Active');
            }
        });
    }
    /* ------------------------------------------------------------ */


    window.Wv__SharedElements__ResolutionPicker = {
        Wv__SharedElements__ResolutionPicker__Mount,
        WV__RESOLUTION_OPTIONS
    };

})();
