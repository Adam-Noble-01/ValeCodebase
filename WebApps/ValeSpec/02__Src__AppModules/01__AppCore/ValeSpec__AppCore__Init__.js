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
    async function ValeSpec__AppCore__InitApp() {
        console.log('[ValeSpec__Init] Starting ValeSpec application...');

        var ConfigLoader       =  window.ValeSpec__AppCore__ConfigLoader;
        var ModeManager        =  window.ValeSpec__AppCore__ModeManager;
        var StateManager       =  window.ValeSpec__AppCore__StateManager;
        var HwLoader           =  window.ValeSpec__AppData__HardwareIndexLoader;
        var ProjectFileManager =  window.ValeSpec__AppData__ProjectFileManager;

        var configData  =  await ConfigLoader.ValeSpec__ConfigLoader__LoadConfig();
        if (!configData) {
            console.error('[ValeSpec__Init] Fatal: could not load app configuration.');
            return;
        }

        var appSection   =  configData['ValeSpec__Application__Config'] || {};
        var hwIndexPath  =  appSection['ValeSpec__Application__Config__HardwareIndexPath'];
        if (hwIndexPath) {
            await HwLoader.ValeSpec__HardwareIndexLoader__LoadIndex(hwIndexPath);
            await HwLoader.ValeSpec__HardwareIndexLoader__LoadVectorData();
        }

        var RenderPipeline  =  window.ValeSpec__SvgDrawing__RenderPipeline;
        if (RenderPipeline && RenderPipeline.ValeSpec__RenderPipeline__EnsureConfigLoaded) {
            await RenderPipeline.ValeSpec__RenderPipeline__EnsureConfigLoaded();
        }

        if (ProjectFileManager && ProjectFileManager.ValeSpec__ProjectFileManager__SyncFromServer) {
            await ProjectFileManager.ValeSpec__ProjectFileManager__SyncFromServer();   // <-- Pull disk project files into localStorage cache before first render
        }

        ValeSpec__AppCore__InitNavigationBar();
        ValeSpec__AppCore__InitModeLifecycle();
        ValeSpec__AppCore__InitProjectLifecycle();

        ModeManager.ValeSpec__ModeManager__SwitchToMode(ModeManager.MODE_DOC_MANAGEMENT, false);

        console.log('[ValeSpec__Init] Application ready.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Navigation Bar Event Listeners
    // ------------------------------------------------------------
    function ValeSpec__AppCore__InitNavigationBar() {
        var ModeManager  =  window.ValeSpec__AppCore__ModeManager;

        var tabs  =  document.querySelectorAll('.ValeSpec__App__NavTab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', function(e) {
                var tab  =  e.currentTarget;
                if (tab.classList.contains('ValeSpec__App__NavTab--disabled')) return;
                var mode  =  tab.dataset.mode;
                if (mode) ModeManager.ValeSpec__ModeManager__SwitchToMode(mode);
            });
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Mode Lifecycle Hooks
    // ------------------------------------------------------------
    function ValeSpec__AppCore__InitModeLifecycle() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.ValeSpec__StateManager__On('modeChanged', function(modeId) {
            ValeSpec__AppCore__OnModeEntered(modeId);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle Mode Entry - Trigger System Renders
    // ------------------------------------------------------------
    async function ValeSpec__AppCore__OnModeEntered(modeId) {
        if (modeId === 'DocumentEditor') {
            ValeSpec__AppCore__RenderDocumentEditor();
        }
        if (modeId === 'AssemblyEditor') {
            await ValeSpec__AppCore__RenderAssemblyEditor();                        // <-- Must await: Layout.init() is async
        }
        if (modeId === 'DocumentPreview') {
            ValeSpec__AppCore__RenderDocumentPreview();
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Document Editor Mode
    // ------------------------------------------------------------
    function ValeSpec__AppCore__RenderDocumentEditor() {
        var DocHeader       =  window.ValeSpec__DocEditor__DocumentHeader;
        var SectionManager  =  window.ValeSpec__DocEditor__SectionManager;
        var JobNotes        =  window.ValeSpec__DocEditor__JobNotes;

        if (DocHeader)       DocHeader.ValeSpec__DocumentHeader__Render();
        if (SectionManager)  SectionManager.ValeSpec__SectionManager__Render();
        if (JobNotes)        JobNotes.ValeSpec__JobNotes__Render();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Assembly Editor Mode
    // ------------------------------------------------------------
    async function ValeSpec__AppCore__RenderAssemblyEditor() {
        var Layout  =  window.ValeSpec__AssemblyEditor__Layout;
        if (!Layout) return;

        await Layout.ValeSpec__Layout__Init();                                      // <-- Await config fetch + panel build on first visit

        var StateManager      =  window.ValeSpec__AppCore__StateManager;
        var DoorConfigurator  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__Main;
        var SvgPreview        =  window.ValeSpec__AssemblyEditor__SvgPreview;

        var assembly  =  StateManager ? StateManager.ValeSpec__StateManager__GetCurrentAssembly() : null;

        if (assembly) {
            if (DoorConfigurator && DoorConfigurator.ValeSpec__DoorConfigurator__RefreshFromAssembly) DoorConfigurator.ValeSpec__DoorConfigurator__RefreshFromAssembly(assembly);
            if (SvgPreview && SvgPreview.ValeSpec__SvgPreview__Render) SvgPreview.ValeSpec__SvgPreview__Render(assembly);
        } else if (SvgPreview && SvgPreview.ValeSpec__SvgPreview__Render) {
            SvgPreview.ValeSpec__SvgPreview__Render(null);
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Render Document Preview Mode
    // ------------------------------------------------------------
    function ValeSpec__AppCore__RenderDocumentPreview() {
        var PageRenderer  =  window.ValeSpec__DocPreview__PageRenderer;
        if (PageRenderer && PageRenderer.ValeSpec__PageRenderer__Render) PageRenderer.ValeSpec__PageRenderer__Render();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Persist Current Project to Disk
    // ------------------------------------------------------------
    function ValeSpec__AppCore__AutosaveCurrentProject() {
        var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;
        var StateManager        =  window.ValeSpec__AppCore__StateManager;
        if (!ProjectFileManager || !StateManager) return;

        var state  =  StateManager.ValeSpec__StateManager__GetState();
        if (state.currentProject) {
            ProjectFileManager.ValeSpec__ProjectFileManager__SaveProject(state.currentProject); // <-- Write full project JSON to localStorage + disk
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Project Lifecycle - Enable/Disable Nav Tabs, Auto-Save Hooks
    // ------------------------------------------------------------
    function ValeSpec__AppCore__InitProjectLifecycle() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        StateManager.ValeSpec__StateManager__On('projectChanged', function(projectData) {
            ValeSpec__AppCore__UpdateNavTabStates(projectData);
        });

        StateManager.ValeSpec__StateManager__On('assemblyUpdated', function() {
            ValeSpec__AppCore__AutosaveCurrentProject();                            // <-- Persist whenever an assembly field is changed
        });

        StateManager.ValeSpec__StateManager__On('globalFinishChanged', function() {
            ValeSpec__AppCore__AutosaveCurrentProject();                            // <-- Persist global finish updates that do not emit assemblyUpdated
        });

        StateManager.ValeSpec__StateManager__On('globalLeverTypeChanged', function() {
            ValeSpec__AppCore__AutosaveCurrentProject();                            // <-- Persist global lever updates that do not emit assemblyUpdated
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Enable or Disable Navigation Tabs Based on Project State
    // ------------------------------------------------------------
    function ValeSpec__AppCore__UpdateNavTabStates(projectData) {
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
        document.addEventListener('DOMContentLoaded', ValeSpec__AppCore__InitApp);
    } else {
        ValeSpec__AppCore__InitApp();
    }
    // ------------------------------------------------------------

})();

// endregion ===================================================================
