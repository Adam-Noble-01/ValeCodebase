/* =============================================================================
 WHITECARDVISION - RENDER MODE - REFERENCE IMAGE LIST
=============================================================================
 FILE       : WhitecardVision__RenderMode__ReferenceImageList__.js
 NAMESPACE  : Wv
 MODULE     : System — Render — ReferenceImageList
 PURPOSE    : Material + Style reference tiles; combined cap from Render config.
============================================================================= */

// =============================================================================
// REGION | Render Mode Reference Image List Module
// =============================================================================

(function () {
    'use strict';


    // FUNCTION | Install handlers on both reference lists
    // ------------------------------------------------------------
    function Wv__RenderMode__ReferenceImageList__Install() {
        document.getElementById('Wv__Render__RefList__Material__AddBtn')
            .addEventListener('click', () => Wv__RenderMode__ReferenceImageList__AddBlankReference('material'));
        document.getElementById('Wv__Render__RefList__Style__AddBtn')
            .addEventListener('click', () => Wv__RenderMode__ReferenceImageList__AddBlankReference('style'));

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', Wv__RenderMode__ReferenceImageList__RerenderBothLists);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Add a blank reference tile to the relevant list
    // ------------------------------------------------------------
    function Wv__RenderMode__ReferenceImageList__AddBlankReference(referenceTypeToken) {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) { window.Wv__AppUtils__Toast.Wv__Toast__Show('Create or load a project first.', 'warning'); return; }

        if (Wv__RenderMode__ReferenceImageList__CombinedCount(projectTree) >= Wv__RenderMode__ReferenceImageList__MaxCombined()) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Reference slot cap reached (10 combined).', 'warning');
            return;
        }
        const blankEntry = window.Wv__AppData__ProjectSchemaValidator.Wv__ProjectSchemaValidator__BuildBlankReference(referenceTypeToken);
        const listKey    = referenceTypeToken === 'material'
            ? 'Wv__Project__RenderGroup__MaterialReferences'
            : 'Wv__Project__RenderGroup__StyleReferences';
        projectTree.Wv__Project__RenderGroup[listKey].push(blankEntry);
        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        Wv__RenderMode__ReferenceImageList__RerenderBothLists(projectTree);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Max combined references from config
    // ------------------------------------------------------------
    function Wv__RenderMode__ReferenceImageList__MaxCombined() {
        const renderConfig   = window.Wv__AppCore__StateManager.Wv__StateManager__GetSystemConfig('Render') || {};
        return (renderConfig.Wv__RenderMode__Config__Limits || {}).Wv__RenderMode__Config__Limits__MaxReferenceImagesCombined || 10;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Count references across both lists
    // ------------------------------------------------------------
    function Wv__RenderMode__ReferenceImageList__CombinedCount(projectTree) {
        const renderGroup = projectTree.Wv__Project__RenderGroup;
        return (renderGroup.Wv__Project__RenderGroup__MaterialReferences || []).length
             + (renderGroup.Wv__Project__RenderGroup__StyleReferences    || []).length;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Redraw both lists from scratch
    // ------------------------------------------------------------
    function Wv__RenderMode__ReferenceImageList__RerenderBothLists(projectTree) {
        const materialContainerEl = document.getElementById('Wv__Render__RefList__Material');
        const styleContainerEl    = document.getElementById('Wv__Render__RefList__Style');
        const counterLabelEl      = document.getElementById('Wv__Render__RefList__Counter');
        materialContainerEl.innerHTML = '';
        styleContainerEl.innerHTML    = '';

        if (!projectTree) { counterLabelEl.textContent = '0 of 10 reference slots used (Material + Style combined).'; return; }

        const renderGroup        = projectTree.Wv__Project__RenderGroup;
        const materialReferences = renderGroup.Wv__Project__RenderGroup__MaterialReferences || [];
        const styleReferences    = renderGroup.Wv__Project__RenderGroup__StyleReferences    || [];

        materialReferences.forEach((refEntry, tileIndex) => {
            materialContainerEl.appendChild(Wv__RenderMode__ReferenceImageList__BuildTile(refEntry, 'material', tileIndex));
        });
        styleReferences.forEach((refEntry, tileIndex) => {
            styleContainerEl.appendChild(Wv__RenderMode__ReferenceImageList__BuildTile(refEntry, 'style', tileIndex));
        });

        counterLabelEl.textContent = `${materialReferences.length + styleReferences.length} of ${Wv__RenderMode__ReferenceImageList__MaxCombined()} reference slots used (Material + Style combined).`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Construct a single reference tile
    // ------------------------------------------------------------
    function Wv__RenderMode__ReferenceImageList__BuildTile(refEntry, referenceTypeToken, tileIndex) {
        const tileElement       = document.createElement('div');
        tileElement.className   = 'Wv__Render__RefTile';
        tileElement.setAttribute('data-wv-refid', refEntry.Wv__Reference__Id);
        tileElement.setAttribute('data-wv-reftype', referenceTypeToken);

        const hiddenFileInputEl = document.createElement('input');
        hiddenFileInputEl.type  = 'file';
        hiddenFileInputEl.accept = 'image/png,image/jpeg';
        hiddenFileInputEl.hidden = true;
        tileElement.appendChild(hiddenFileInputEl);

        const thumbElement      = document.createElement('div');
        thumbElement.className  = 'Wv__Render__RefTile__Thumb';
        const thumbPathValue    = refEntry.Wv__Reference__ThumbPath || refEntry.Wv__Reference__ImagePath || '';
        thumbElement.innerHTML  = thumbPathValue
            ? `<img src="/${thumbPathValue}?_t=${Date.now()}" />`
            : Wv__RenderMode__ReferenceImageList__UploadCueHtml(referenceTypeToken);

        const Wv__RefTile__TriggerPicker = async () => {
            try {
                const fileHandle = await window.Wv__AppUtils__ImageUpload.Wv__ImageUpload__PickFileViaInput(hiddenFileInputEl);
                await Wv__RenderMode__ReferenceImageList__UploadAndBind(fileHandle, refEntry, referenceTypeToken, tileIndex);
            } catch (uploadError) {
                if (uploadError.message !== 'No file selected')
                    window.Wv__AppUtils__Toast.Wv__Toast__Show(uploadError.message, 'error');
            }
        };

        thumbElement.addEventListener('click', Wv__RefTile__TriggerPicker);

        thumbElement.addEventListener('dragover', (dragEvent) => {
            dragEvent.preventDefault();
            thumbElement.classList.add('Wv__Render__RefTile__Thumb--DragOver');
        });
        thumbElement.addEventListener('dragleave', () => {
            thumbElement.classList.remove('Wv__Render__RefTile__Thumb--DragOver');
        });
        thumbElement.addEventListener('drop', async (dropEvent) => {
            dropEvent.preventDefault();
            thumbElement.classList.remove('Wv__Render__RefTile__Thumb--DragOver');
            const droppedFile = dropEvent.dataTransfer && dropEvent.dataTransfer.files[0];
            if (!droppedFile) return;
            try {
                await Wv__RenderMode__ReferenceImageList__UploadAndBind(droppedFile, refEntry, referenceTypeToken, tileIndex);
            } catch (uploadError) {
                window.Wv__AppUtils__Toast.Wv__Toast__Show(uploadError.message, 'error');
            }
        });

        tileElement.appendChild(thumbElement);

        const headerElement     = document.createElement('div');
        headerElement.className = 'Wv__Render__RefTile__Header';
        headerElement.innerHTML = `<span>${referenceTypeToken.toUpperCase()} #${tileIndex + 1}</span>`;
        const removeButtonEl    = document.createElement('button');
        removeButtonEl.className = 'Wv__Render__RefTile__RemoveBtn';
        removeButtonEl.type      = 'button';
        removeButtonEl.title     = 'Remove reference';
        removeButtonEl.textContent = 'x';
        removeButtonEl.addEventListener('click', () => {
            const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
            if (!projectTree) return;
            const listKey = referenceTypeToken === 'material'
                ? 'Wv__Project__RenderGroup__MaterialReferences'
                : 'Wv__Project__RenderGroup__StyleReferences';
            projectTree.Wv__Project__RenderGroup[listKey] =
                projectTree.Wv__Project__RenderGroup[listKey].filter(ref => ref.Wv__Reference__Id !== refEntry.Wv__Reference__Id);
            window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
            Wv__RenderMode__ReferenceImageList__RerenderBothLists(projectTree);
        });
        headerElement.appendChild(removeButtonEl);
        tileElement.appendChild(headerElement);

        const labelInputEl       = document.createElement('input');
        labelInputEl.type        = 'text';
        labelInputEl.className   = 'Wv__Ui__Input Wv__Render__RefTile__LabelInput';
        labelInputEl.placeholder = 'Label (e.g. "Bluestone paving")';
        labelInputEl.value       = refEntry.Wv__Reference__Label || '';
        labelInputEl.addEventListener('input', () => {
            refEntry.Wv__Reference__Label = labelInputEl.value;
            window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        });
        tileElement.appendChild(labelInputEl);

        const promptTextareaEl   = document.createElement('textarea');
        promptTextareaEl.className   = 'Wv__Ui__Textarea Wv__Render__RefTile__PromptInput';
        promptTextareaEl.setAttribute('data-wv-notebook-ref', 'ref-tile');                  //<-- registers textarea with NotebookOverlay
        promptTextareaEl.placeholder = referenceTypeToken === 'material'
            ? 'Describe the material: textures, finish, local colour...'
            : 'Describe the style: lighting, colour grade, mood, lens...';
        promptTextareaEl.value       = refEntry.Wv__Reference__Prompt || '';
        promptTextareaEl.addEventListener('input', () => {
            refEntry.Wv__Reference__Prompt = promptTextareaEl.value;
            window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        });
        tileElement.appendChild(promptTextareaEl);

        return tileElement;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Return the upload cue pictogram HTML string
    // ------------------------------------------------------------
    function Wv__RenderMode__ReferenceImageList__UploadCueHtml(referenceTypeToken) {
        const labelText = referenceTypeToken === 'material'
            ? 'Click or drop<br>material image'
            : 'Click or drop<br>style reference';
        return `<div class="Wv__Render__UploadCue">
            <svg class="Wv__Render__UploadCue__Icon" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
                <path d="M16 3l0 6M13 6l3-3 3 3"/>
            </svg>
            <span class="Wv__Render__UploadCue__Label">${labelText}</span>
        </div>`;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Upload the file, bind image path into state
    // ------------------------------------------------------------
    async function Wv__RenderMode__ReferenceImageList__UploadAndBind(fileHandle, refEntry, referenceTypeToken, tileIndex) {
        const readResult   = await window.Wv__AppUtils__ImageUpload.Wv__ImageUpload__ReadFile(fileHandle);
        const derivedLabel = refEntry.Wv__Reference__Label || fileHandle.name.replace(/\.[^.]+$/, '');
        const uploadResult = await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__UploadImage(referenceTypeToken, {
            base64Data : readResult.base64Data,
            mimeType   : readResult.mimeType,
            label      : derivedLabel,
            slotIndex  : tileIndex + 1
        });
        refEntry.Wv__Reference__ImagePath = uploadResult.imagePathRel;
        refEntry.Wv__Reference__ThumbPath = uploadResult.thumbPathRel || '';
        refEntry.Wv__Reference__Label     = derivedLabel;
        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        Wv__RenderMode__ReferenceImageList__RerenderBothLists(window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject());
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__RenderMode__ReferenceImageList = { Wv__RenderMode__ReferenceImageList__Install };
    // ------------------------------------------------------------

})();

// endregion ===================================================================

