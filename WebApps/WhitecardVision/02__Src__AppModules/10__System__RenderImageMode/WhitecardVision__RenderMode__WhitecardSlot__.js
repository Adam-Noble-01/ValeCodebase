/* =============================================================================
 WHITECARDVISION - RENDER MODE - WHITECARD SLOT
=============================================================================
 Handles upload + preview + aspect snapping for the primary Whitecard image.
============================================================================= */

(function () {
    'use strict';


    /* FUNCTION | Wire the Whitecard slot DOM */
    /* ------------------------------------------------------------ */
    function Wv__RenderMode__WhitecardSlot__Install() {
        const uploadButtonEl   = document.getElementById('Wv__Render__WhitecardSlot__UploadBtn');
        const fileInputEl      = document.getElementById('Wv__Render__WhitecardSlot__FileInput');
        const promptTextareaEl = document.getElementById('Wv__Render__WhitecardSlot__PromptInput');

        uploadButtonEl.addEventListener('click', async () => {
            try {
                const selectedFileHandle = await window.Wv__AppUtils__ImageUpload.Wv__ImageUpload__PickFileViaInput(fileInputEl);
                await Wv__RenderMode__WhitecardSlot__HandleFileSelected(selectedFileHandle);
            } catch (uploadError) {
                if (uploadError.message !== 'No file selected') {
                    window.Wv__AppUtils__Toast.Wv__Toast__Show(uploadError.message, 'error');
                }
            }
        });

        promptTextareaEl.addEventListener('input', () => {
            const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
            if (!projectTree) return;
            const whitecardBlock = projectTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__Whitecard;
            whitecardBlock.Wv__Whitecard__Prompt = promptTextareaEl.value;
            window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        });

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', Wv__RenderMode__WhitecardSlot__RefreshFromState);
    }
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Read file, send to Flask, store details in project */
    /* ------------------------------------------------------------ */
    async function Wv__RenderMode__WhitecardSlot__HandleFileSelected(fileHandle) {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Create or load a project first.', 'warning');
            return;
        }

        const readResult    = await window.Wv__AppUtils__ImageUpload.Wv__ImageUpload__ReadFile(fileHandle);
        const uploadResult  = await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__UploadImage('whitecard', {
            base64Data : readResult.base64Data,
            mimeType   : readResult.mimeType,
            label      : fileHandle.name.replace(/\.[^.]+$/, '')
        });

        const whitecardBlock = projectTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__Whitecard;
        whitecardBlock.Wv__Whitecard__ImagePath           = uploadResult.imagePathRel;
        whitecardBlock.Wv__Whitecard__WidthPx             = uploadResult.aspectRatio.widthPx;
        whitecardBlock.Wv__Whitecard__HeightPx            = uploadResult.aspectRatio.heightPx;
        whitecardBlock.Wv__Whitecard__SnappedAspectRatio  = uploadResult.aspectRatio.snappedAspectRatio;
        whitecardBlock.Wv__Whitecard__SnappedDeltaPct     = uploadResult.aspectRatio.snappedDeltaPct;

        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        Wv__RenderMode__WhitecardSlot__RefreshFromState(projectTree);
        window.Wv__AppUtils__Toast.Wv__Toast__Show(
            `Whitecard uploaded (${uploadResult.aspectRatio.widthPx}x${uploadResult.aspectRatio.heightPx}, aspect ${uploadResult.aspectRatio.snappedAspectRatio}).`,
            'success'
        );
    }


    /* HELPER FUNCTION | Redraw thumbnail + meta from state */
    /* ------------------------------------------------------------ */
    function Wv__RenderMode__WhitecardSlot__RefreshFromState(projectTree) {
        const thumbElement   = document.getElementById('Wv__Render__WhitecardSlot__Thumb');
        const metaElement    = document.getElementById('Wv__Render__WhitecardSlot__Meta');
        const promptTextarea = document.getElementById('Wv__Render__WhitecardSlot__PromptInput');

        if (!projectTree) {
            thumbElement.innerHTML           = '<span class="Wv__Render__WhitecardSlot__Placeholder">No Whitecard loaded</span>';
            metaElement.textContent          = 'Aspect: -';
            metaElement.className            = 'Wv__Render__WhitecardSlot__Meta';
            promptTextarea.value             = '';
            return;
        }

        const whitecardBlock = projectTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__Whitecard || {};
        promptTextarea.value = whitecardBlock.Wv__Whitecard__Prompt || '';

        if (!whitecardBlock.Wv__Whitecard__ImagePath) {
            thumbElement.innerHTML  = '<span class="Wv__Render__WhitecardSlot__Placeholder">No Whitecard loaded</span>';
            metaElement.textContent = 'Aspect: -';
            metaElement.className   = 'Wv__Render__WhitecardSlot__Meta';
            return;
        }

        thumbElement.innerHTML = `<img src="/${whitecardBlock.Wv__Whitecard__ImagePath}?_t=${Date.now()}" alt="Whitecard" />`;
        const widthPx          = whitecardBlock.Wv__Whitecard__WidthPx || 0;
        const heightPx         = whitecardBlock.Wv__Whitecard__HeightPx || 0;
        const aspectText       = whitecardBlock.Wv__Whitecard__SnappedAspectRatio || '-';
        const deltaPercent     = whitecardBlock.Wv__Whitecard__SnappedDeltaPct    || 0;
        metaElement.textContent = `${widthPx} x ${heightPx}  |  Aspect: ${aspectText}  |  Snap delta: ${deltaPercent}%`;
        metaElement.className   = 'Wv__Render__WhitecardSlot__Meta' + (deltaPercent > 2 ? ' Wv__Render__WhitecardSlot__Meta--Mismatch' : '');
    }


    window.Wv__RenderMode__WhitecardSlot = { Wv__RenderMode__WhitecardSlot__Install };

})();
