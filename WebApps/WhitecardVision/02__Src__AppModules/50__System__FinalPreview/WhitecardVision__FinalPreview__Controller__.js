/* =============================================================================
 WHITECARDVISION - FINAL PREVIEW CONTROLLER
=============================================================================
 FILE       : WhitecardVision__FinalPreview__Controller__.js
 NAMESPACE  : Wv
 MODULE     : System — FinalPreview — Controller
 PURPOSE    : Minimal viewer: flip canvas between last render and active
              edit output; download compiled prompt for current source.
              Auto-initialises with the newest project image on activation;
              disables its nav tab when no image files exist.
============================================================================= */

// =============================================================================
// REGION | Final Preview Controller Module
// =============================================================================

(function () {
    'use strict';


    let Wv__FinalPreview__Controller__CurrentSource    = 'Render';                                                               //<-- 'Render' | 'Edit' | 'Whitecard'.
    let Wv__FinalPreview__Controller__CurrentImagePath = '';


    // FUNCTION | Install buttons and subscribe to project change events
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__Init() {
        document.getElementById('Wv__FinalPreview__PickRenderBtn')
            .addEventListener('click', Wv__FinalPreview__Controller__ShowLatestRender);
        document.getElementById('Wv__FinalPreview__PickEditBtn')
            .addEventListener('click', Wv__FinalPreview__Controller__ShowActiveEdit);
        document.getElementById('Wv__FinalPreview__PickWhitecardBtn')
            .addEventListener('click', Wv__FinalPreview__Controller__ShowWhitecard);
        document.getElementById('Wv__FinalPreview__DownloadPngBtn')
            .addEventListener('click', Wv__FinalPreview__Controller__HandleDownloadPng);
        document.getElementById('Wv__FinalPreview__DownloadWhitecardBtn')
            .addEventListener('click', Wv__FinalPreview__Controller__HandleDownloadWhitecard);
        document.getElementById('Wv__FinalPreview__DownloadPromptBtn')
            .addEventListener('click', Wv__FinalPreview__Controller__HandleDownloadCompiledPrompt);

        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectChanged', (projectTree) => {
            Wv__FinalPreview__Controller__ResetFromState(projectTree);
            Wv__FinalPreview__Controller__UpdateNavState(projectTree);
        });
        window.Wv__AppCore__StateManager.Wv__StateManager__On('activeProjectMutated', (projectTree) => {
            Wv__FinalPreview__Controller__UpdateNavState(projectTree);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Extract YYYYMMDDTHHMMSSZ timestamp from a server image path
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__ExtractTimeToken(imagePath) {                                                         //<-- Paths contain tokens like 20260422T145730Z__render__.png.
        if (!imagePath) return '';
        const matchResult = imagePath.match(/(\d{8}T\d{6}Z)/);
        return matchResult ? matchResult[1] : '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find the newest output image path across render + all edit iterations
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__GetNewestImagePath(projectTree) {                                                     //<-- Falls back to whitecard when no generated outputs exist.
        if (!projectTree) return '';

        const candidates = [];

        const renderPath = (projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__LastOutputPath;
        if (renderPath) candidates.push(renderPath);

        (projectTree.Wv__Project__EditIterations || []).forEach((iteration) => {
            if (iteration.Wv__EditIteration__LastOutputPath) {
                candidates.push(iteration.Wv__EditIteration__LastOutputPath);
            }
        });

        if (candidates.length > 0) {
            candidates.sort((pathA, pathB) => {
                const tokenA = Wv__FinalPreview__Controller__ExtractTimeToken(pathA);
                const tokenB = Wv__FinalPreview__Controller__ExtractTimeToken(pathB);
                return tokenA > tokenB ? -1 : tokenA < tokenB ? 1 : 0;
            });
            return candidates[0];
        }

        const whitecardPath = ((projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__Whitecard || {}).Wv__Whitecard__ImagePath;
        return whitecardPath || '';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Toggle the Final Preview nav tab disabled state
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__UpdateNavState(projectTree) {
        const navTabElement = document.querySelector('[data-wv-mode="FinalPreview"]');
        if (!navTabElement) return;
        const hasImage = !!Wv__FinalPreview__Controller__GetNewestImagePath(projectTree || window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject());
        navTabElement.classList.toggle('Wv__App__NavTab--Disabled', !hasImage);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Reset canvas and buttons when active project changes
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__ResetFromState(projectTree) {
        Wv__FinalPreview__Controller__CurrentSource    = 'Render';
        Wv__FinalPreview__Controller__CurrentImagePath = '';

        const canvasElement           = document.getElementById('Wv__FinalPreview__Canvas');
        const downloadPngButton       = document.getElementById('Wv__FinalPreview__DownloadPngBtn');
        const downloadWhitecardButton = document.getElementById('Wv__FinalPreview__DownloadWhitecardBtn');

        canvasElement.innerHTML = '<span class="Wv__FinalPreview__Placeholder">Nothing to preview yet</span>';
        if (downloadPngButton) downloadPngButton.disabled = true;

        const whitecardBlock = projectTree ? ((projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__Whitecard || {}) : {};
        if (downloadWhitecardButton) downloadWhitecardButton.disabled = !whitecardBlock.Wv__Whitecard__ImagePath;
    }
    // ------------------------------------------------------------


    // FUNCTION | Called by ModeManager when the FinalPreview tab is activated
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__OnActivated() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        const newestPath  = Wv__FinalPreview__Controller__GetNewestImagePath(projectTree);
        if (!newestPath) return;

        const renderPath = (projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__LastOutputPath;
        const whitecardPath = ((projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__Whitecard || {}).Wv__Whitecard__ImagePath;

        if (newestPath === whitecardPath) {
            Wv__FinalPreview__Controller__CurrentSource = 'Whitecard';
        } else if (newestPath === renderPath) {
            Wv__FinalPreview__Controller__CurrentSource = 'Render';
        } else {
            Wv__FinalPreview__Controller__CurrentSource = 'Edit';
        }

        Wv__FinalPreview__Controller__DisplayImage(newestPath);
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


    // HELPER FUNCTION | Show original whitecard
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__ShowWhitecard() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) return;
        const whitecardBlock = (projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__Whitecard || {};
        Wv__FinalPreview__Controller__CurrentSource = 'Whitecard';
        Wv__FinalPreview__Controller__DisplayImage(whitecardBlock.Wv__Whitecard__ImagePath);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Paint canvas
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__DisplayImage(relativeImagePath) {
        const canvasElement           = document.getElementById('Wv__FinalPreview__Canvas');
        const downloadPngButton       = document.getElementById('Wv__FinalPreview__DownloadPngBtn');
        const downloadWhitecardButton = document.getElementById('Wv__FinalPreview__DownloadWhitecardBtn');

        Wv__FinalPreview__Controller__CurrentImagePath = relativeImagePath || '';

        const projectTree    = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        const whitecardBlock = projectTree ? ((projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__Whitecard || {}) : {};
        if (downloadWhitecardButton) downloadWhitecardButton.disabled = !whitecardBlock.Wv__Whitecard__ImagePath;

        if (!relativeImagePath) {
            canvasElement.innerHTML = '<span class="Wv__FinalPreview__Placeholder">Nothing to preview yet</span>';
            if (downloadPngButton) downloadPngButton.disabled = true;
            return;
        }
        canvasElement.innerHTML = `<img src="/${relativeImagePath}?_t=${Date.now()}" alt="Final Preview" />`;
        if (downloadPngButton) downloadPngButton.disabled = false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Download the previewed image
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__HandleDownloadPng() {
        const relativePath = Wv__FinalPreview__Controller__CurrentImagePath;
        if (!relativePath) { window.Wv__AppUtils__Toast.Wv__Toast__Show('No image to download.', 'warning'); return; }
        const anchorElement    = document.createElement('a');
        anchorElement.href     = '/' + relativePath + '?_t=' + Date.now();
        anchorElement.download = relativePath.split('/').pop();
        document.body.appendChild(anchorElement);
        anchorElement.click();
        anchorElement.remove();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Download the whitecard
    // ------------------------------------------------------------
    function Wv__FinalPreview__Controller__HandleDownloadWhitecard() {
        const projectTree = window.Wv__AppCore__StateManager.Wv__StateManager__GetActiveProject();
        if (!projectTree) { window.Wv__AppUtils__Toast.Wv__Toast__Show('Load a project first.', 'warning'); return; }
        const whitecardBlock = (projectTree.Wv__Project__RenderGroup || {}).Wv__Project__RenderGroup__Whitecard || {};
        const relativePath   = whitecardBlock.Wv__Whitecard__ImagePath;
        if (!relativePath) { window.Wv__AppUtils__Toast.Wv__Toast__Show('No whitecard to download.', 'warning'); return; }
        const anchorElement    = document.createElement('a');
        anchorElement.href     = '/' + relativePath + '?_t=' + Date.now();
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
    window.Wv__FinalPreview__Controller = {
        Wv__FinalPreview__Controller__Init,
        Wv__FinalPreview__Controller__OnActivated
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
