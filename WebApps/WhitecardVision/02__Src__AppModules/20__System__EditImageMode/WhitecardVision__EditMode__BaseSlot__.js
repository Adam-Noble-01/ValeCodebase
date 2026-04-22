/* =============================================================================
 WHITECARDVISION - EDIT MODE - BASE IMAGE SLOT
============================================================================= */

(function () {
    'use strict';


    /* FUNCTION | Wire the base image slot */
    /* ------------------------------------------------------------ */
    function Wv__EditMode__BaseSlot__Install() {
        const uploadButtonEl = document.getElementById('Wv__Edit__BaseSlot__UploadBtn');
        const fileInputEl    = document.getElementById('Wv__Edit__BaseSlot__FileInput');

        uploadButtonEl.addEventListener('click', async () => {
            try {
                const fileHandle = await window.Wv__AppUtils__ImageUpload.Wv__ImageUpload__PickFileViaInput(fileInputEl);
                await Wv__EditMode__BaseSlot__HandleFileSelected(fileHandle);
            } catch (selectionError) {
                if (selectionError.message !== 'No file selected')
                    window.Wv__AppUtils__Toast.Wv__Toast__Show(selectionError.message, 'error');
            }
        });

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', Wv__EditMode__BaseSlot__RefreshFromState);
    }
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Upload file and bind to active iteration */
    /* ------------------------------------------------------------ */
    async function Wv__EditMode__BaseSlot__HandleFileSelected(fileHandle) {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) { window.Wv__AppUtils__Toast.Wv__Toast__Show('Create or load a project first.', 'warning'); return; }
        const activeIteration = Wv__EditMode__BaseSlot__ResolveOrCreateActiveIteration(projectTree);

        const readResult    = await window.Wv__AppUtils__ImageUpload.Wv__ImageUpload__ReadFile(fileHandle);
        const uploadResult  = await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__UploadImage('edit', {
            base64Data  : readResult.base64Data,
            mimeType    : readResult.mimeType,
            label       : fileHandle.name.replace(/\.[^.]+$/, ''),
            iterationId : activeIteration.Wv__EditIteration__Id
        });

        activeIteration.Wv__EditIteration__BaseImagePath        = uploadResult.imagePathRel;
        activeIteration.Wv__EditIteration__BaseWidthPx          = uploadResult.aspectRatio.widthPx;
        activeIteration.Wv__EditIteration__BaseHeightPx         = uploadResult.aspectRatio.heightPx;
        activeIteration.Wv__EditIteration__SnappedAspectRatio   = uploadResult.aspectRatio.snappedAspectRatio;
        activeIteration.Wv__EditIteration__SnappedDeltaPct      = uploadResult.aspectRatio.snappedDeltaPct;
        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        Wv__EditMode__BaseSlot__RefreshFromState(projectTree);
    }


    /* HELPER FUNCTION | Get or create active iteration */
    /* ------------------------------------------------------------ */
    function Wv__EditMode__BaseSlot__ResolveOrCreateActiveIteration(projectTree) {
        let activeIteration = (projectTree.Wv__Project__EditIterations || []).find(
            entry => entry.Wv__EditIteration__Id === projectTree.Wv__Project__ActiveEditIterationId
        );
        if (!activeIteration) {
            activeIteration = window.Wv__AppData__ProjectSchemaValidator.Wv__ProjectSchemaValidator__BuildBlankEditIteration(
                (projectTree.Wv__Project__EditIterations || []).length
            );
            projectTree.Wv__Project__EditIterations.push(activeIteration);
            projectTree.Wv__Project__ActiveEditIterationId = activeIteration.Wv__EditIteration__Id;
        }
        return activeIteration;
    }


    /* HELPER FUNCTION | Draw thumbnail + aspect meta */
    /* ------------------------------------------------------------ */
    function Wv__EditMode__BaseSlot__RefreshFromState(projectTree) {
        const thumbElement = document.getElementById('Wv__Edit__BaseSlot__Thumb');
        const metaElement  = document.getElementById('Wv__Edit__BaseSlot__Meta');
        if (!projectTree) { thumbElement.innerHTML = '<span class="Wv__Edit__BaseSlot__Placeholder">No base image</span>'; metaElement.textContent = 'Aspect: -'; return; }
        const activeIteration = (projectTree.Wv__Project__EditIterations || []).find(
            e => e.Wv__EditIteration__Id === projectTree.Wv__Project__ActiveEditIterationId
        );
        if (!activeIteration || !activeIteration.Wv__EditIteration__BaseImagePath) {
            thumbElement.innerHTML = '<span class="Wv__Edit__BaseSlot__Placeholder">No base image</span>';
            metaElement.textContent = 'Aspect: -';
            return;
        }
        thumbElement.innerHTML = `<img src="/${activeIteration.Wv__EditIteration__BaseImagePath}?_t=${Date.now()}" />`;
        metaElement.textContent =
            `${activeIteration.Wv__EditIteration__BaseWidthPx || '?'} x ${activeIteration.Wv__EditIteration__BaseHeightPx || '?'}  |  Aspect: ${activeIteration.Wv__EditIteration__SnappedAspectRatio || '-'}`;
    }


    window.Wv__EditMode__BaseSlot = { Wv__EditMode__BaseSlot__Install };

})();
