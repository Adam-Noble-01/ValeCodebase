/* =============================================================================
 WHITECARDVISION - EDIT MODE - OUTPUT PANEL
=============================================================================
 FILE       : WhitecardVision__EditMode__OutputPanel__.js
 NAMESPACE  : Wv
 MODULE     : System — Edit — OutputPanel
 PURPOSE    : Edit output canvas, resolution picker, download, compiled export.
============================================================================= */

// =============================================================================
// REGION | Edit Mode Output Panel Module
// =============================================================================

(function () {
    'use strict';


    // FUNCTION | Install download + compiled-prompt + resolution picker
    // ------------------------------------------------------------
    function Wv__EditMode__OutputPanel__Install() {
        document.getElementById('Wv__Edit__Output__DownloadBtn')
            .addEventListener('click', Wv__EditMode__OutputPanel__HandleDownload);
        document.getElementById('Wv__Edit__Output__DownloadPromptBtn')
            .addEventListener('click', Wv__EditMode__OutputPanel__HandleDownloadCompiledPrompt);

        Wv__EditMode__OutputPanel__MountResolutionPicker();

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', Wv__EditMode__OutputPanel__RefreshFromState);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve the currently-active iteration
    // ------------------------------------------------------------
    function Wv__EditMode__OutputPanel__GetActiveIteration() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return null;
        return (projectTree.Wv__Project__EditIterations || []).find(
            e => e.Wv__EditIteration__Id === projectTree.Wv__Project__ActiveEditIterationId
        ) || null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mount the resolution picker against the active iteration
    // ------------------------------------------------------------
    function Wv__EditMode__OutputPanel__MountResolutionPicker() {
        const pickerHostEl = document.getElementById('Wv__Edit__Output__ResolutionPicker');
        if (!pickerHostEl || !window.Wv__SharedElements__ResolutionPicker) return;

        const mountBindingsObject = {
            modeLabel : 'Edit Size',
            getValue  : () => {
                const iterationObj = Wv__EditMode__OutputPanel__GetActiveIteration();
                return (iterationObj && iterationObj.Wv__EditIteration__ImageSize) || '2K';
            },
            setValue  : (newToken) => {
                const iterationObj = Wv__EditMode__OutputPanel__GetActiveIteration();
                if (!iterationObj) return;
                iterationObj.Wv__EditIteration__ImageSize = newToken;
                window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
            }
        };

        window.Wv__SharedElements__ResolutionPicker.Wv__SharedElements__ResolutionPicker__Mount(pickerHostEl, mountBindingsObject);
        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', () => {
            window.Wv__SharedElements__ResolutionPicker.Wv__SharedElements__ResolutionPicker__Mount(pickerHostEl, mountBindingsObject);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dump the Gemini edit payload as a markdown file
    // ------------------------------------------------------------
    async function Wv__EditMode__OutputPanel__HandleDownloadCompiledPrompt() {
        const projectTree  = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        const iterationObj = Wv__EditMode__OutputPanel__GetActiveIteration();
        if (!iterationObj) { window.Wv__AppUtils__Toast.Wv__Toast__Show('Create or select an iteration first.', 'warning'); return; }
        try {
            await window.Wv__SharedElements__CompiledPromptExporter.Wv__SharedElements__CompiledPromptExporter__DownloadEdit(iterationObj, projectTree);
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Compiled edit prompt downloaded.', 'success');
        } catch (exportError) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Export failed: ' + exportError.message, 'error');
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw an output image on the canvas
    // ------------------------------------------------------------
    function Wv__EditMode__OutputPanel__DisplayImage(relativeImagePath) {
        const canvasElement = document.getElementById('Wv__Edit__Output__Canvas');
        if (!relativeImagePath) {
            canvasElement.innerHTML = '<span class="Wv__Edit__Output__Placeholder">No edit yet</span>';
            return;
        }
        canvasElement.innerHTML = `<img src="/${relativeImagePath}?_t=${Date.now()}" alt="Edit output" />`;
        document.getElementById('Wv__Edit__Output__DownloadBtn').disabled = false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sync canvas from active iteration's last output
    // ------------------------------------------------------------
    function Wv__EditMode__OutputPanel__RefreshFromState(projectTree) {
        if (!projectTree) { Wv__EditMode__OutputPanel__DisplayImage(''); return; }
        const activeIteration = (projectTree.Wv__Project__EditIterations || []).find(
            e => e.Wv__EditIteration__Id === projectTree.Wv__Project__ActiveEditIterationId
        );
        Wv__EditMode__OutputPanel__DisplayImage(activeIteration ? activeIteration.Wv__EditIteration__LastOutputPath : '');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Download the active iteration's last output
    // ------------------------------------------------------------
    function Wv__EditMode__OutputPanel__HandleDownload() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const activeIteration = (projectTree.Wv__Project__EditIterations || []).find(
            e => e.Wv__EditIteration__Id === projectTree.Wv__Project__ActiveEditIterationId
        );
        if (!activeIteration || !activeIteration.Wv__EditIteration__LastOutputPath) return;
        const anchorElement    = document.createElement('a');
        anchorElement.href     = '/' + activeIteration.Wv__EditIteration__LastOutputPath + '?_t=' + Date.now();
        anchorElement.download = activeIteration.Wv__EditIteration__LastOutputPath.split('/').pop();
        document.body.appendChild(anchorElement); anchorElement.click(); anchorElement.remove();
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__EditMode__OutputPanel = {
        Wv__EditMode__OutputPanel__Install,
        Wv__EditMode__OutputPanel__DisplayImage
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
