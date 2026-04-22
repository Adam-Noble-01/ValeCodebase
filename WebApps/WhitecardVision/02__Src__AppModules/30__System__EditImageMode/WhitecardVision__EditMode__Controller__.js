/* =============================================================================
 WHITECARDVISION - EDIT MODE - CONTROLLER
=============================================================================
 FILE       : WhitecardVision__EditMode__Controller__.js
 NAMESPACE  : Wv
 MODULE     : System — Edit — Controller
 PURPOSE    : Wires every sub-panel and handles Generate Edit click.
============================================================================= */

// =============================================================================
// REGION | Edit Mode Controller Module
// =============================================================================

(function () {
    'use strict';


    // FUNCTION | Controller bootstrap
    // ------------------------------------------------------------
    function Wv__EditMode__Controller__Init() {
        window.Wv__EditMode__IterationList.Wv__EditMode__IterationList__Install();
        window.Wv__EditMode__BaseSlot.Wv__EditMode__BaseSlot__Install();
        window.Wv__EditMode__PromptPanel.Wv__EditMode__PromptPanel__Install();
        window.Wv__EditMode__OutputPanel.Wv__EditMode__OutputPanel__Install();

        Wv__EditMode__Controller__MountSharedSidebar();

        document.getElementById('Wv__Edit__Output__GenerateBtn')
            .addEventListener('click', Wv__EditMode__Controller__HandleGenerateClicked);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mount shared Templates Panel into the right sidebar
    // ------------------------------------------------------------
    function Wv__EditMode__Controller__MountSharedSidebar() {
        const sidebarHostEl = document.getElementById('Wv__Edit__Workbench__Sidebar');
        if (sidebarHostEl && window.Wv__SharedElements__TemplatesPanel) {
            window.Wv__SharedElements__TemplatesPanel.Wv__SharedElements__TemplatesPanel__Mount(sidebarHostEl, {});
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build edit-payload + POST via proxy
    // ------------------------------------------------------------
    async function Wv__EditMode__Controller__HandleGenerateClicked() {
        const projectTree        = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        const statusLineElement  = document.getElementById('Wv__Edit__Output__StatusLine');
        const generateButtonEl   = document.getElementById('Wv__Edit__Output__GenerateBtn');
        const canvasElement      = document.getElementById('Wv__Edit__Output__Canvas');
        if (!projectTree) { window.Wv__AppUtils__Toast.Wv__Toast__Show('Create or load a project first.', 'warning'); return; }

        const activeIteration = (projectTree.Wv__Project__EditIterations || []).find(
            e => e.Wv__EditIteration__Id === projectTree.Wv__Project__ActiveEditIterationId
        );
        if (!activeIteration) { window.Wv__AppUtils__Toast.Wv__Toast__Show('Create an iteration first.', 'warning'); return; }

        try { await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__SaveActiveProject(); } catch (e) {}

        generateButtonEl.disabled       = true;
        statusLineElement.textContent   = 'Building payload...';
        try {
            const geminiRequestShell    = await window.Wv__PromptConstructor__BuildFinalPayload.Wv__PromptConstructor__BuildFinalPayload__Edit(activeIteration);
            statusLineElement.textContent = 'Sending to Gemini...';
            window.Wv__SharedElements__LoadingSpinner.Wv__SharedElements__LoadingSpinner__ShowOver(canvasElement, 'Generating Edit ...');

            const generationResult      = await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__Generate(true, geminiRequestShell, activeIteration.Wv__EditIteration__Id);

            activeIteration.Wv__EditIteration__LastOutputPath = generationResult.imagePathRel;
            activeIteration.Wv__EditIteration__LastOutputThumbPath = generationResult.thumbPathRel || '';
            window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
            window.Wv__EditMode__OutputPanel.Wv__EditMode__OutputPanel__DisplayImage(generationResult.imagePathRel);
            statusLineElement.textContent = `Edit generated at ${generationResult.appliedAspectRatio || '-'}, ${generationResult.appliedImageSize || '-'} (${generationResult.modelId}).`;
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Edit complete.', 'success');
            try { await window.Wv__AppData__ProjectFileManager.Wv__ProjectFileManager__SaveActiveProject(); } catch (e) {}
        } catch (generationError) {
            statusLineElement.textContent = 'Error: ' + generationError.message;
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Edit failed: ' + generationError.message, 'error');
        } finally {
            window.Wv__SharedElements__LoadingSpinner.Wv__SharedElements__LoadingSpinner__Hide(canvasElement);
            generateButtonEl.disabled = false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Called by ModeManager when the user navigates to Editor Mode
    // ------------------------------------------------------------
    function Wv__EditMode__Controller__OnActivated() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;

        const iterationsArray = projectTree.Wv__Project__EditIterations || [];
        if (iterationsArray.length > 0) {
            projectTree.Wv__Project__ActiveEditIterationId = iterationsArray[iterationsArray.length - 1].Wv__EditIteration__Id;
        }

        window.Wv__AppCore__StateManager.Wv__StateManager__Emit('activeProjectChanged', projectTree);
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__EditMode__Controller = {
        Wv__EditMode__Controller__Init,
        Wv__EditMode__Controller__OnActivated
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
