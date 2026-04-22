/* =============================================================================
 WHITECARDVISION - RENDER MODE - OUTPUT PANEL
=============================================================================
 FILE       : WhitecardVision__RenderMode__OutputPanel__.js
 NAMESPACE  : Wv
 MODULE     : System — Render — OutputPanel
 PURPOSE    : Render output canvas, resolution picker, download, send to editor.
============================================================================= */

// =============================================================================
// REGION | Render Mode Output Panel Module
// =============================================================================

(function () {
    'use strict';


    // FUNCTION | Install Regenerate / Send To Editor / Download bindings
    // ------------------------------------------------------------
    function Wv__RenderMode__OutputPanel__Install() {
        document.getElementById('Wv__Render__Output__RegenerateBtn')
            .addEventListener('click', () => {
                document.getElementById('Wv__Render__Output__GenerateBtn').click();
            });

        document.getElementById('Wv__Render__Output__SendToEditorBtn')
            .addEventListener('click', Wv__RenderMode__OutputPanel__HandleSendToEditor);

        document.getElementById('Wv__Render__Output__DownloadBtn')
            .addEventListener('click', Wv__RenderMode__OutputPanel__HandleDownload);

        document.getElementById('Wv__Render__Output__DownloadPromptBtn')
            .addEventListener('click', Wv__RenderMode__OutputPanel__HandleDownloadCompiledPrompt);

        Wv__RenderMode__OutputPanel__MountResolutionPicker();

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', Wv__RenderMode__OutputPanel__RefreshFromState);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Mount the resolution picker against the render group
    // ------------------------------------------------------------
    function Wv__RenderMode__OutputPanel__MountResolutionPicker() {
        const pickerHostEl = document.getElementById('Wv__Render__Output__ResolutionPicker');
        if (!pickerHostEl || !window.Wv__SharedElements__ResolutionPicker) return;

        window.Wv__SharedElements__ResolutionPicker.Wv__SharedElements__ResolutionPicker__Mount(pickerHostEl, {
            modeLabel : 'Render Size',
            getValue  : () => {
                const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
                if (!projectTree) return '2K';
                return (projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__ImageSize || '2K';
            },
            setValue  : (newToken) => {
                const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
                if (!projectTree) return;
                projectTree.Wv__Project__RenderGroup = projectTree.Wv__Project__RenderGroup || {};
                projectTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__ImageSize = newToken;
                window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
            }
        });

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', () => {
            window.Wv__SharedElements__ResolutionPicker.Wv__SharedElements__ResolutionPicker__Mount(pickerHostEl, {
                modeLabel : 'Render Size',
                getValue  : () => {
                    const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
                    return projectTree ? ((projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__ImageSize || '2K') : '2K';
                },
                setValue  : (newToken) => {
                    const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
                    if (!projectTree) return;
                    projectTree.Wv__Project__RenderGroup = projectTree.Wv__Project__RenderGroup || {};
                    projectTree.Wv__Project__RenderGroup.Wv__Project__RenderGroup__ImageSize = newToken;
                    window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
                }
            });
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Dump the exact Gemini payload as a markdown file
    // ------------------------------------------------------------
    async function Wv__RenderMode__OutputPanel__HandleDownloadCompiledPrompt() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) { window.Wv__AppUtils__Toast.Wv__Toast__Show('Create or load a project first.', 'warning'); return; }
        try {
            await window.Wv__SharedElements__CompiledPromptExporter.Wv__SharedElements__CompiledPromptExporter__DownloadRender(projectTree);
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Compiled prompt downloaded.', 'success');
        } catch (exportError) {
            window.Wv__AppUtils__Toast.Wv__Toast__Show('Export failed: ' + exportError.message, 'error');
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Display a rendered image path
    // ------------------------------------------------------------
    function Wv__RenderMode__OutputPanel__DisplayImage(relativeImagePath) {
        const canvasElement = document.getElementById('Wv__Render__Output__Canvas');
        if (!relativeImagePath) {
            canvasElement.innerHTML = '<span class="Wv__Render__Output__Placeholder">No output yet</span>';
            return;
        }
        canvasElement.innerHTML = `<img src="/${relativeImagePath}?_t=${Date.now()}" alt="Rendered output" />`;
        document.getElementById('Wv__Render__Output__RegenerateBtn').disabled   = false;
        document.getElementById('Wv__Render__Output__SendToEditorBtn').disabled = false;
        document.getElementById('Wv__Render__Output__DownloadBtn').disabled     = false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sync from active project
    // ------------------------------------------------------------
    function Wv__RenderMode__OutputPanel__RefreshFromState(projectTree) {
        const lastOutputPath = projectTree
            ? (projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__LastOutputPath
            : '';
        Wv__RenderMode__OutputPanel__DisplayImage(lastOutputPath);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Push the current render into a new Edit iteration
    // ------------------------------------------------------------
    async function Wv__RenderMode__OutputPanel__HandleSendToEditor() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const renderGroupBlock = projectTree.Wv__Project__RenderGroup || {};
        const latestRenderPath = renderGroupBlock.Wv__Project__RenderGroup__LastOutputPath;
        if (!latestRenderPath) { window.Wv__AppUtils__Toast.Wv__Toast__Show('No render to send.', 'warning'); return; }

        const newIterationEntry = window.Wv__AppData__ProjectSchemaValidator.Wv__ProjectSchemaValidator__BuildBlankEditIteration(
            (projectTree.Wv__Project__EditIterations || []).length
        );
        newIterationEntry.Wv__EditIteration__BaseImagePath = latestRenderPath;
        const whitecardBlock = renderGroupBlock.Wv__Project__RenderGroup__Whitecard || {};
        newIterationEntry.Wv__EditIteration__BaseWidthPx        = whitecardBlock.Wv__Whitecard__WidthPx || 0;
        newIterationEntry.Wv__EditIteration__BaseHeightPx       = whitecardBlock.Wv__Whitecard__HeightPx || 0;
        newIterationEntry.Wv__EditIteration__SnappedAspectRatio = whitecardBlock.Wv__Whitecard__SnappedAspectRatio || '';
        newIterationEntry.Wv__EditIteration__SnappedDeltaPct    = whitecardBlock.Wv__Whitecard__SnappedDeltaPct || 0;
        projectTree.Wv__Project__EditIterations.push(newIterationEntry);
        projectTree.Wv__Project__ActiveEditIterationId = newIterationEntry.Wv__EditIteration__Id;
        window.Wv__AppCore__StateManager.Wv__StateManager__MarkProjectDirty();
        window.Wv__AppCore__StateManager.Wv__StateManager__Emit('activeProjectChanged', projectTree);

        window.Wv__AppCore__ModeManager.Wv__ModeManager__SwitchToMode('Editor');
        window.Wv__AppUtils__Toast.Wv__Toast__Show('Sent render to Editor Mode.', 'success');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Download the last render as PNG
    // ------------------------------------------------------------
    async function Wv__RenderMode__OutputPanel__HandleDownload() {
        const projectTree    = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const relativePath   = (projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__LastOutputPath;
        if (!relativePath) return;

        const anchorElement  = document.createElement('a');
        anchorElement.href   = '/' + relativePath + '?_t=' + Date.now();
        anchorElement.download = relativePath.split('/').pop();
        document.body.appendChild(anchorElement);
        anchorElement.click();
        anchorElement.remove();
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__RenderMode__OutputPanel = {
        Wv__RenderMode__OutputPanel__Install,
        Wv__RenderMode__OutputPanel__DisplayImage
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================

