/* =============================================================================
   VALESPEC - APPLICATION INITIALIZER
   =============================================================================

   FILE       : ValeSpec__AppCore__Init__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppCore - Init
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Boot sequence for ValeSpec application
   CREATED    : 2026

   DESCRIPTION:
   - Executes the application startup sequence
   - Loads app configuration JSON
   - Loads hardware data index
   - Initializes navigation bar event listeners
   - Subscribes to mode changes to trigger system render lifecycle
   - Switches to Document Management as the default mode
   - This file must be loaded LAST in the script order

   ============================================================================= */

// =============================================================================
// REGION | Application Boot Sequence
// =============================================================================

(function() {

    // FUNCTION | Initialize Application
    // ------------------------------------------------------------
    async function _initApp() {
        console.log('[ValeSpec__Init] Starting ValeSpec application...');

        var ConfigLoader   =  window.ValeSpec__AppCore__ConfigLoader;
        var ModeManager    =  window.ValeSpec__AppCore__ModeManager;
        var StateManager   =  window.ValeSpec__AppCore__StateManager;
        var HwLoader       =  window.ValeSpec__AppData__HardwareIndexLoader;

        var configData  =  await ConfigLoader.loadConfig();
        if (!configData) {
            console.error('[ValeSpec__Init] Fatal: could not load app configuration.');
            return;
        }

        var appSection    =  configData['ValeSpec__Application__Config'] || {};
        var hwIndexPath   =  appSection['ValeSpec__Application__Config__HardwareIndexPath'];
        if (hwIndexPath) {
            await HwLoader.loadIndex(hwIndexPath);
        }

        var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;
        if (RenderPipeline && RenderPipeline.ensureConfigLoaded) {
            await RenderPipeline.ensureConfigLoaded();
        }

        _initNavigationBar();
        _initModeLifecycle();
        _initProjectLifecycle();

        ModeManager.switchToMode(ModeManager.MODE_DOC_MANAGEMENT, false);

        console.log('[ValeSpec__Init] Application ready.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Navigation Bar Event Listeners
    // ------------------------------------------------------------
    function _initNavigationBar() {
        var ModeManager  =  window.ValeSpec__AppCore__ModeManager;

        var tabs  =  document.querySelectorAll('.ValeSpec__App__NavTab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', function(e) {
                var tab  =  e.currentTarget;
                if (tab.classList.contains('ValeSpec__App__NavTab--disabled')) return;
                var mode  =  tab.dataset.mode;
                if (mode) ModeManager.switchToMode(mode);
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Mode Lifecycle Hooks
    // ------------------------------------------------------------
    function _initModeLifecycle() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.on('modeChanged', function(modeId) {
            _onModeEntered(modeId);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Mode Entry - Trigger System Renders
    // ------------------------------------------------------------
    function _onModeEntered(modeId) {
        if (modeId === 'DocumentEditor') {
            _renderDocumentEditor();
        }
        if (modeId === 'AssemblyEditor') {
            _renderAssemblyEditor();
        }
        if (modeId === 'DocumentPreview') {
            _renderDocumentPreview();
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Document Editor Mode
    // ------------------------------------------------------------
    function _renderDocumentEditor() {
        var DocHeader       =  window.ValeSpec__DocEditor__DocumentHeader;
        var SectionManager  =  window.ValeSpec__DocEditor__SectionManager;
        var JobNotes        =  window.ValeSpec__DocEditor__JobNotes;

        if (DocHeader)       DocHeader.render();
        if (SectionManager)  SectionManager.render();
        if (JobNotes)        JobNotes.render();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Assembly Editor Mode
    // ------------------------------------------------------------
    function _renderAssemblyEditor() {
        var Layout  =  window.ValeSpec__AssemblyEditor__Layout;
        if (!Layout) return;

        if (Layout.init) Layout.init();

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;
        var assembly  =  StateManager.getCurrentAssembly();
        if (assembly) {
            var DoorConfigurator  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__Main;
            var SvgPreview        =  window.ValeSpec__AssemblyEditor__SvgPreview;
            if (DoorConfigurator && DoorConfigurator.refreshFromAssembly) DoorConfigurator.refreshFromAssembly(assembly);
            if (SvgPreview && SvgPreview.render) SvgPreview.render(assembly);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Document Preview Mode
    // ------------------------------------------------------------
    function _renderDocumentPreview() {
        var PageRenderer  =  window.ValeSpec__DocPreview__PageRenderer;
        if (PageRenderer && PageRenderer.render) PageRenderer.render();
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Project Lifecycle - Enable/Disable Nav Tabs
    // ------------------------------------------------------------
    function _initProjectLifecycle() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.on('projectChanged', function(projectData) {
            _updateNavTabStates(projectData);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Enable or Disable Navigation Tabs Based on Project State
    // ------------------------------------------------------------
    function _updateNavTabStates(projectData) {
        var hasProject  =  !!projectData;
        var tabs        =  document.querySelectorAll('.ValeSpec__App__NavTab');

        for (var i = 0; i < tabs.length; i++) {
            var tab   =  tabs[i];
            var mode  =  tab.dataset.mode;

            if (mode === 'DocManagement') continue;

            if (hasProject) {
                tab.classList.remove('ValeSpec__App__NavTab--disabled');
            } else {
                tab.classList.add('ValeSpec__App__NavTab--disabled');
            }
        }
    }
    // ------------------------------------------------------------


    // BOOT | Run Init When DOM is Ready
    // ------------------------------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initApp);
    } else {
        _initApp();
    }
    // ------------------------------------------------------------

})();

// endregion ===================================================================
