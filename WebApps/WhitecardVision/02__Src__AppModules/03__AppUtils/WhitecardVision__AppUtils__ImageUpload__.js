/* =============================================================================
 WHITECARDVISION - IMAGE UPLOAD + PREVIEW UTILITY
=============================================================================
 PURPOSE : Convert a File (from an <input type=file>) into
           { base64Data, mimeType, widthPx, heightPx, objectUrl } so the
           render slots and edit slots can preview + upload consistently.
============================================================================= */

(function () {
    'use strict';


    /* FUNCTION | Read a File into a base64 data URL + natural dimensions */
    /* ------------------------------------------------------------ */
    function Wv__ImageUpload__ReadFile(fileHandle) {
        return new Promise((resolve, reject) => {
            if (!fileHandle) { reject(new Error('No file provided')); return; }
            if (!fileHandle.type || !fileHandle.type.startsWith('image/')) {
                reject(new Error('Selected file is not an image')); return;
            }

            const fileReader  = new FileReader();
            fileReader.onerror = () => reject(fileReader.error || new Error('FileReader failed'));
            fileReader.onload  = () => {
                const dataUrl    = String(fileReader.result || '');
                const base64Body = dataUrl.includes(',') ? dataUrl.split(',', 2)[1] : dataUrl;

                const probeImage = new Image();
                probeImage.onerror = () => reject(new Error('Image could not be decoded'));
                probeImage.onload  = () => resolve({
                    base64Data  : base64Body,
                    dataUrl     : dataUrl,
                    mimeType    : fileHandle.type || 'image/png',
                    fileName    : fileHandle.name || 'upload',
                    widthPx     : probeImage.naturalWidth,
                    heightPx    : probeImage.naturalHeight,
                    objectUrl   : dataUrl
                });
                probeImage.src = dataUrl;
            };
            fileReader.readAsDataURL(fileHandle);
        });
    }
    /* ------------------------------------------------------------ */


    /* FUNCTION | Open the native file picker and resolve the chosen file */
    /* ------------------------------------------------------------ */
    function Wv__ImageUpload__PickFileViaInput(hiddenInputElement) {
        return new Promise((resolve, reject) => {
            if (!hiddenInputElement) { reject(new Error('Missing file input element')); return; }
            const onChange = () => {
                hiddenInputElement.removeEventListener('change', onChange);
                const chosenFile = hiddenInputElement.files && hiddenInputElement.files[0];
                if (!chosenFile) { reject(new Error('No file selected')); return; }
                hiddenInputElement.value = '';
                resolve(chosenFile);
            };
            hiddenInputElement.addEventListener('change', onChange);
            hiddenInputElement.click();
        });
    }
    /* ------------------------------------------------------------ */


    window.Wv__AppUtils__ImageUpload = {
        Wv__ImageUpload__ReadFile,
        Wv__ImageUpload__PickFileViaInput
    };

})();
