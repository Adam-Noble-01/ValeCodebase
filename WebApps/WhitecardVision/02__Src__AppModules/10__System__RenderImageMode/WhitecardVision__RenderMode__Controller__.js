/* =============================================================================
 WHITECARDVISION - RENDER MODE - CONTROLLER
=============================================================================
 Wires every sub-panel and owns the Generate click flow.
============================================================================= */

(function () {
    'use strict';


    /* FUNCTION | Controller bootstrap */
    /* ------------------------------------------------------------ */
    function Wv__RenderMode__Controller__Init() {
        window.Wv__RenderMode__ProjectMetaPanel.Wv__RenderMode__ProjectMetaPanel__Install();
        window.Wv__RenderMode__WhitecardSlot.Wv__RenderMode__WhitecardSlot__Install();
        window.Wv__RenderMode__ReferenceImageList.Wv__RenderMode__ReferenceImageList__Install();
        window.Wv__RenderMode__OutputPanel.Wv__RenderMode__OutputPanel__Install();

        Wv__RenderMode__Controller__MountSharedSidebar();

        document.getElementById('Wv__Render__Avoid__Input').addEventListener('input', (inputEvent) => {
            const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
            if (!projectTree) return;
            projectTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__AvoidNotes = inputEvent.target.value;
            window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        });

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', (projectTree) => {
            document.getElementById('Wv__Render__Avoid__Input').value =
                projectTree ? (projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__AvoidNotes || '' : '';
        });

        document.getElementById('Wv__Render__Output__GenerateBtn')
            .addEventListener('click', Wv__RenderMode__Controller__HandleGenerateClicked);
    }
    /* ------------------------------------------------------------ */


    /* HELPER FUNCTION | Mount the shared Templates Panel into the right sidebar */
    /* ------------------------------------------------------------ */
    function Wv__RenderMode__Controller__MountSharedSidebar() {
        const sidebarHostEl = document.getElementById('Wv__Render__Workbench__Sidebar');
        if (sidebarHostEl && window.Wv__SharedElements__TemplatesPanel) {
            window.Wv__SharedElements__TemplatesPanel.Wv__SharedElements__TemplatesPanel__Mount(sidebarHostEl, {});
        }
    }


    /* HELPER FUNCTION | Build payload + call Flask proxy + persist result */
    /* ------------------------------------------------------------ */
    async function Wv__RenderMode__Controller__HandleGenerateClicked() {
        const projectTree        = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        const statusLineElement  = document.getElementById('Wv__Render__Output__StatusLine');
        const generateButtonEl   = document.getElementById('Wv__Render__Output__GenerateBtn');
        const canvasElement      = document.getElementById('Wv__Render__Output__Canvas');
        if (!projectTree) { window.Wv__AppUtils__Toast.Wv__Toast__Show('Create or load a project first.', 'warning'); return; }

        try {
            await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__SaveActiveProject();
        } catch (saveError) { window.Wv__AppUtils__Toast.Wv__Toast__Show('Pre-save failed: ' + saveError.message, 'warning'); }

        generateButtonEl.disabled        = true;
        statusLineElement.textContent    = 'Building payload...';
        try {
            const geminiRequestShell     = await window.Wv__PromptConstructor__BuildFinalPayload.Wv__PromptConstructor__BuildFinalPayload__Render(projectTree);
            statusLineElement.textContent = 'Sending to Gemini (this can take up to ~60s)...';

            window.Wv__SharedElements__LoadingSpinner.Wv__SharedElements__LoadingSpinner__ShowOver(canvasElement, 'Generating (Gemini 3 Pro)...');

            const generationResult       = await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__Generate(false, geminiRequestShell, '');
            projectTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__LastOutputPath = generationResult.imagePathRel;
            window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();

            window.Wv__RenderMode__OutputPanel.Wv__RenderMode__OutputPanel__DisplayImage(generationResult.imagePathRel);
            statusLineElement.textContent = `Rendered at ${generationResult.appliedAspectRatio || '-'}, ${generationResult.appliedImageSize || '-'} (${generationResult.modelId}).`;
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Render complete.', 'success');

            try { await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__SaveActiveProject(); } catch (e) {}
        } catch (generationError) {
            statusLineElement.textContent = 'Error: ' + generationError.message;
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Render failed: ' + generationError.message, 'error');
        } finally {
            window.Wv__SharedElements__LoadingSpinner.Wv__SharedElements__LoadingSpinner__Hide(canvasElement);
            generateButtonEl.disabled = false;
        }
    }


    window.Wv__RenderMode__Controller = { Wv__RenderMode__Controller__Init };

})();
