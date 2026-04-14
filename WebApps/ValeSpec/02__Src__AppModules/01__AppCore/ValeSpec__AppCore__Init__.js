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

        var ConfigLoader       =  window.ValeSpec__AppCore__ConfigLoader;
        var ModeManager        =  window.ValeSpec__AppCore__ModeManager;
        var StateManager       =  window.ValeSpec__AppCore__StateManager;
        var HwLoader           =  window.ValeSpec__AppData__HardwareIndexLoader;
        var ProjectFileManager =  window.ValeSpec__AppData__ProjectFileManager;

        var configData  =  await ConfigLoader.loadConfig();
        if (!configData) {
            console.error('[ValeSpec__Init] Fatal: could not load app configuration.');
            return;
        }

        var appSection    =  configData['ValeSpec__Application__Config'] || {};
        var hwIndexPath   =  appSection['ValeSpec__Application__Config__HardwareIndexPath'];
        if (hwIndexPath) {
            await HwLoader.loadIndex(hwIndexPath);
            await HwLoader.loadVectorData();
        }

        var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;
        if (RenderPipeline && RenderPipeline.ensureConfigLoaded) {
            await RenderPipeline.ensureConfigLoaded();
        }

        if (ProjectFileManager && ProjectFileManager.syncFromServer) {
            await ProjectFileManager.syncFromServer();                         // <-- Pull disk project files into localStorage cache before first render
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
    async function _onModeEntered(modeId) {
        if (modeId === 'DocumentEditor') {
            _renderDocumentEditor();
        }
        if (modeId === 'AssemblyEditor') {
            await _renderAssemblyEditor();                                     // <-- Must await: Layout.init() is async
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
    async function _renderAssemblyEditor() {
        var Layout  =  window.ValeSpec__AssemblyEditor__Layout;
        if (!Layout) return;

        await Layout.init();                                                   // <-- Await config fetch + panel build on first visit

        var StateManager      =  window.ValeSpec__AppCore__StateManager;
        var DoorConfigurator  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__Main;
        var SvgPreview        =  window.ValeSpec__AssemblyEditor__SvgPreview;

        var assembly  =  StateManager ? StateManager.getCurrentAssembly() : null;

        if (assembly) {
            if (DoorConfigurator && DoorConfigurator.refreshFromAssembly) DoorConfigurator.refreshFromAssembly(assembly);
            if (SvgPreview && SvgPreview.render) SvgPreview.render(assembly);
        } else {
            var defaultAssembly  =  {
                'Assembly__Dimensions__Config': {
                    'Assembly__Dimensions__Config__WidthMm'  : 1800,
                    'Assembly__Dimensions__Config__HeightMm' : 2100
                },
                'Assembly__DoorType__Config': {
                    'Assembly__DoorType__Config__Type': 'Outward Opening Double Doors'
                }
            };
            if (SvgPreview && SvgPreview.render) SvgPreview.render(defaultAssembly);
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


    // HELPER FUNCTION | Persist Current Project to Disk
    // ------------------------------------------------------------
    function _autosaveCurrentProject() {
        var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;
        var StateManager        =  window.ValeSpec__AppCore__StateManager;
        if (!ProjectFileManager || !StateManager) return;

        var state  =  StateManager.getState();
        if (state.currentProject) {
            ProjectFileManager.saveProject(state.currentProject);              // <-- Write full project JSON to localStorage + disk
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Project Lifecycle - Enable/Disable Nav Tabs, Auto-Save Hooks
    // ------------------------------------------------------------
    function _initProjectLifecycle() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.on('projectChanged', function(projectData) {
            _updateNavTabStates(projectData);
        });

        StateManager.on('assemblyUpdated', function() {
            _autosaveCurrentProject();                                         // <-- Persist whenever an assembly field is changed
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
