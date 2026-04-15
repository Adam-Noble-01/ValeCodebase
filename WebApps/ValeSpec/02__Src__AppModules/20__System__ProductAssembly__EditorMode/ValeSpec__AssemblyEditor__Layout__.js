/* =============================================================================
   VALESPEC - ASSEMBLY EDITOR LAYOUT
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__Layout__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - Layout
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Renders two-panel editor layout and orchestrates sub-modules
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Renders preview panel (left) and controls panel (right)
   - Fetches layout proportions from Na__AssemblyEditor__Config.json
   - Initialises SvgPreview and DoorConfigurator sub-modules
   - Subscribes to StateManager 'assemblySelected' event
   - Target container: #ValeSpec__AssemblyEditor__Container

   ============================================================================= */

// =============================================================================
// REGION | Assembly Editor Layout Module
// =============================================================================

const ValeSpec__AssemblyEditor__Layout = (function() {

    // MODULE CONSTANTS | Config File Path
    // ------------------------------------------------------------
    const CONFIG_PATH  =  '02__Src__AppModules/20__System__ProductAssembly__EditorMode/Na__AssemblyEditor__Config.json';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Layout State
    // ------------------------------------------------------------
    let ValeSpec__Layout__ConfigData       =  null;   // <-- Parsed config JSON
    let ValeSpec__Layout__ContainerEl      =  null;   // <-- Root container element
    let ValeSpec__Layout__PreviewPanelEl   =  null;   // <-- Left preview panel
    let ValeSpec__Layout__ControlsPanelEl  =  null;   // <-- Right controls panel
    let ValeSpec__Layout__Initialised      =  false;  // <-- Prevents double-init
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load Layout Configuration
    // ------------------------------------------------------------
    async function ValeSpec__Layout__LoadConfig() {
        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) throw new Error('Config fetch failed: ' + response.status);
            ValeSpec__Layout__ConfigData  =  await response.json();
            return ValeSpec__Layout__ConfigData;
        } catch (e) {
            console.error('[ValeSpec__AssemblyEditor__Layout] Config load failed:', e);
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Panel DOM Structure
    // ------------------------------------------------------------
    function ValeSpec__Layout__BuildPanels() {
        ValeSpec__Layout__ContainerEl.innerHTML  =  '';

        var layoutCfg    =  (ValeSpec__Layout__ConfigData && ValeSpec__Layout__ConfigData['AssemblyEditor__Layout__Config']) || {};
        var previewPctValue   =  layoutCfg['AssemblyEditor__Layout__Config__PreviewPanelWidthPct'];
        if (previewPctValue == null) previewPctValue = layoutCfg['PreviewPanelWidthPct'];                 // <-- Backward compatibility with legacy config keys

        var controlsPctValue  =  layoutCfg['AssemblyEditor__Layout__Config__ControlsPanelWidthPct'];
        if (controlsPctValue == null) controlsPctValue = layoutCfg['ControlsPanelWidthPct'];              // <-- Backward compatibility with legacy config keys

        var minPreviewPxValue =  layoutCfg['AssemblyEditor__Layout__Config__MinPreviewWidthPx'];
        if (minPreviewPxValue == null) minPreviewPxValue = layoutCfg['MinPreviewWidthPx'];                // <-- Backward compatibility with legacy config keys

        var previewPct   =  ((previewPctValue != null ? previewPctValue : 60) + '%');
        var controlsPct  =  ((controlsPctValue != null ? controlsPctValue : 40) + '%');
        var minPreviewPx =  ((minPreviewPxValue != null ? minPreviewPxValue : 480) + 'px');

        ValeSpec__Layout__PreviewPanelEl  =  document.createElement('div');
        ValeSpec__Layout__PreviewPanelEl.className  =  'ValeSpec__AssemblyEditor__PreviewPanel';
        ValeSpec__Layout__PreviewPanelEl.id         =  'ValeSpec__AssemblyEditor__PreviewPanel';
        ValeSpec__Layout__PreviewPanelEl.style.flex      =  '0 0 ' + previewPct;
        ValeSpec__Layout__PreviewPanelEl.style.minWidth  =  minPreviewPx;

        ValeSpec__Layout__ControlsPanelEl  =  document.createElement('div');
        ValeSpec__Layout__ControlsPanelEl.className  =  'ValeSpec__AssemblyEditor__ControlsPanel';
        ValeSpec__Layout__ControlsPanelEl.id         =  'ValeSpec__AssemblyEditor__ControlsPanel';
        ValeSpec__Layout__ControlsPanelEl.style.flex     =  '1 1 ' + controlsPct;

        ValeSpec__Layout__ContainerEl.classList.add('ValeSpec__AssemblyEditor__Container');
        ValeSpec__Layout__ContainerEl.appendChild(ValeSpec__Layout__PreviewPanelEl);
        ValeSpec__Layout__ContainerEl.appendChild(ValeSpec__Layout__ControlsPanelEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Initialise Sub-Modules
    // ------------------------------------------------------------
    function ValeSpec__Layout__InitSubModules() {
        var SvgPreview        =  window.ValeSpec__AssemblyEditor__SvgPreview;
        var DoorConfigurator  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__Main;

        if (SvgPreview && ValeSpec__Layout__PreviewPanelEl) {
            SvgPreview.ValeSpec__SvgPreview__Init(ValeSpec__Layout__PreviewPanelEl);
        }

        if (DoorConfigurator && ValeSpec__Layout__ControlsPanelEl) {
            DoorConfigurator.ValeSpec__DoorConfigurator__Init(ValeSpec__Layout__ControlsPanelEl);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Assembly Selected Event
    // ------------------------------------------------------------
    function ValeSpec__Layout__OnAssemblySelected(index) {
        if (index < 0) return;                                              // <-- No assembly selected

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        var assemblyData  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assemblyData) return;

        var DoorConfigurator  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__Main;
        if (DoorConfigurator) {
            DoorConfigurator.ValeSpec__DoorConfigurator__RefreshFromAssembly(assemblyData);
        }

        var SvgPreview  =  window.ValeSpec__AssemblyEditor__SvgPreview;
        if (SvgPreview) {
            SvgPreview.ValeSpec__SvgPreview__Render(assemblyData);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Assembly Updated Event
    // ------------------------------------------------------------
    function ValeSpec__Layout__OnAssemblyUpdated(assemblyData) {
        var data  =  assemblyData;
        if (!data) {
            var StateManager  =  window.ValeSpec__AppCore__StateManager;
            if (!StateManager) return;
            data  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        }
        if (!data) return;

        var DoorConfigurator  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__Main;
        if (!DoorConfigurator) return;

        if (DoorConfigurator.ValeSpec__DoorConfigurator__SyncFromAssemblyUpdate) {
            DoorConfigurator.ValeSpec__DoorConfigurator__SyncFromAssemblyUpdate(data);
            return;
        }

        if (DoorConfigurator.ValeSpec__DoorConfigurator__RefreshFromAssembly) {
            DoorConfigurator.ValeSpec__DoorConfigurator__RefreshFromAssembly(data);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Trigger Render on Mode Entry
    // ------------------------------------------------------------
    function ValeSpec__Layout__TriggerRender() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        var assemblyData  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();

        var SvgPreview  =  window.ValeSpec__AssemblyEditor__SvgPreview;
        if (SvgPreview && SvgPreview.ValeSpec__SvgPreview__Render) {
            SvgPreview.ValeSpec__SvgPreview__Render(assemblyData || null);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Layout
    // ------------------------------------------------------------
    async function ValeSpec__Layout__Init() {
        ValeSpec__Layout__ContainerEl  =  document.getElementById('ValeSpec__AssemblyEditor__Container');
        if (!ValeSpec__Layout__ContainerEl) {
            console.error('[ValeSpec__AssemblyEditor__Layout] Container not found.');
            return;
        }

        if (!ValeSpec__Layout__Initialised) {
            await ValeSpec__Layout__LoadConfig();
            ValeSpec__Layout__BuildPanels();
            ValeSpec__Layout__InitSubModules();

            var StateManager  =  window.ValeSpec__AppCore__StateManager;
            if (StateManager) {
                StateManager.ValeSpec__StateManager__On('assemblySelected', ValeSpec__Layout__OnAssemblySelected);
                StateManager.ValeSpec__StateManager__On('assemblyUpdated', ValeSpec__Layout__OnAssemblyUpdated);
            }

            ValeSpec__Layout__Initialised  =  true;
            console.log('[ValeSpec__AssemblyEditor__Layout] Initialised.');
        }

        ValeSpec__Layout__TriggerRender();
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__Layout__Init  : ValeSpec__Layout__Init
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__Layout  =  ValeSpec__AssemblyEditor__Layout;
