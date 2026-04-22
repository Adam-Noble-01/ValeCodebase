/* =============================================================================
 WHITECARDVISION - FINAL PREVIEW CONTROLLER
=============================================================================
 FILE       : WhitecardVision__FinalPreview__Controller__.js
 NAMESPACE  : Wv
 MODULE     : System — FinalPreview — Controller
 PURPOSE    : Minimal viewer: flip canvas between last render and active
              edit output; download compiled prompt for current source.
============================================================================= */

// =============================================================================
// REGION | Final Preview Controller Module
// =============================================================================

(function () {
    'use strict';


    let Wv__FinalPreview__Controller__CurrentSource  = 'Render';                                                                 //<-- 'Render' | 'Edit'.
    let Wv__FinalPreview__Controller__CurrentImagePath = '';


    // FUNCTION | Install buttons
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__Init() {
        document.getElementById('Wv__FinalPreview__PickRenderBtn')
            .addEventListener('click', Wv__FinalPreview__Controller__ShowLatestRender);
        document.getElementById('Wv__FinalPreview__PickEditBtn')
            .addEventListener('click', Wv__FinalPreview__Controller__ShowActiveEdit);
        document.getElementById('Wv__FinalPreview__DownloadPngBtn')
            .addEventListener('click', Wv__FinalPreview__Controller__HandleDownloadPng);
        document.getElementById('Wv__FinalPreview__DownloadPromptBtn')
            .addEventListener('click', Wv__FinalPreview__Controller__HandleDownloadCompiledPrompt);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show last render
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__ShowLatestRender() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const pathValue = (projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__LastOutputPath;
        Wv__FinalPreview__Controller__CurrentSource = 'Render';
        Wv__FinalPreview__Controller__DisplayImage(pathValue);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show active edit's last output
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__ShowActiveEdit() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const activeIteration = (projectTree.Wv__Project__EditIterations || []).find(
            e => e.Wv__EditIteration__Id === projectTree.Wv__Project__ActiveEditIterationId
        );
        Wv__FinalPreview__Controller__CurrentSource = 'Edit';
        Wv__FinalPreview__Controller__DisplayImage(activeIteration ? activeIteration.Wv__EditIteration__LastOutputPath : '');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Paint canvas
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__DisplayImage(relativeImagePath) {
        const canvasElement     = document.getElementById('Wv__FinalPreview__Canvas');
        const downloadPngButton = document.getElementById('Wv__FinalPreview__DownloadPngBtn');
        Wv__FinalPreview__Controller__CurrentImagePath = relativeImagePath || '';
        if (!relativeImagePath) {
            canvasElement.innerHTML = '<span class="Wv__FinalPreview__Placeholder">Nothing to preview yet</span>';
            if (downloadPngButton) downloadPngButton.disabled = true;
            return;
        }
        canvasElement.innerHTML = `<img src="/${relativeImagePath}?_t=${Date.now()}" alt="Final Preview" />`;
        if (downloadPngButton) downloadPngButton.disabled = false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Download the previewed image (same path logic as render output download)
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__HandleDownloadPng() {
        const relativePath = Wv__FinalPreview__Controller__CurrentImagePath;
        if (!relativePath) { window.Wv__AppUtils__Toast.Wv__Toast__Show('No image to download.', 'warning'); return; }
        const anchorElement   = document.createElement('a');
        anchorElement.href    = '/' + relativePath + '?_t=' + Date.now();
        anchorElement.download = relativePath.split('/').pop();
        document.body.appendChild(anchorElement);
        anchorElement.click();
        anchorElement.remove();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dispatch compiled-prompt export to the current source
    // ------------------------------------------------------------
    async function Wv__FinalPreview__Controller__HandleDownloadCompiledPrompt() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) { window.Wv__AppUtils__Toast.Wv__Toast__Show('Load a project first.', 'warning'); return; }
        try {
            if (Wv__FinalPreview__Controller__CurrentSource === 'Edit') {
                const activeIteration = (projectTree.Wv__Project__EditIterations || []).find(
                    e => e.Wv__EditIteration__Id === projectTree.Wv__Project__ActiveEditIterationId
                );
                if (!activeIteration) { window.Wv__AppUtils__Toast.Wv__Toast__Show('No active edit iteration.', 'warning'); return; }
                await window.Wv__SharedElements__CompiledPromptExporter.Wv__SharedElements__CompiledPromptExporter__DownloadEdit(activeIteration, projectTree);
            } else {
                await window.Wv__SharedElements__CompiledPromptExporter.Wv__SharedElements__CompiledPromptExporter__DownloadRender(projectTree);
            }
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Compiled prompt downloaded.', 'success');
        } catch (exportError) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Export failed: ' + exportError.message, 'error');
        }
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__FinalPreview__Controller = { Wv__FinalPreview__Controller__Init };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
