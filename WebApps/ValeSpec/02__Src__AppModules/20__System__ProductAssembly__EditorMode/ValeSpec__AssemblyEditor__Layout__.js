/* =============================================================================
   VALESPEC - ASSEMBLY EDITOR LAYOUT
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__Layout__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - Layout
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Renders two-panel editor layout and orchestrates sub-modules
   CREATED    : 2026

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
    let _configData       =  null;                                          // <-- Parsed config JSON
    let _containerEl      =  null;                                          // <-- Root container element
    let _previewPanelEl   =  null;                                          // <-- Left preview panel
    let _controlsPanelEl  =  null;                                          // <-- Right controls panel
    let _initialised      =  false;                                         // <-- Prevents double-init
    // ------------------------------------------------------------


    // HELPER FUNCTION | Load Layout Configuration
    // ------------------------------------------------------------
    async function _loadConfig() {
        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) throw new Error('Config fetch failed: ' + response.status);
            _configData  =  await response.json();
            return _configData;
        } catch (e) {
            console.error('[ValeSpec__AssemblyEditor__Layout] Config load failed:', e);
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Panel DOM Structure
    // ------------------------------------------------------------
    function _buildPanels() {
        _containerEl.innerHTML  =  '';

        var layoutCfg       =  (_configData && _configData['AssemblyEditor__Layout__Config']) || {};
        var previewPct      =  (layoutCfg['PreviewPanelWidthPct']  || 55) + '%';
        var controlsPct     =  (layoutCfg['ControlsPanelWidthPct'] || 45) + '%';
        var minPreviewPx    =  (layoutCfg['MinPreviewWidthPx']     || 400) + 'px';

        _previewPanelEl  =  document.createElement('div');
        _previewPanelEl.className  =  'ValeSpec__AssemblyEditor__PreviewPanel';
        _previewPanelEl.id         =  'ValeSpec__AssemblyEditor__PreviewPanel';
        _previewPanelEl.style.flex        =  '0 0 ' + previewPct;
        _previewPanelEl.style.minWidth    =  minPreviewPx;

        _controlsPanelEl  =  document.createElement('div');
        _controlsPanelEl.className  =  'ValeSpec__AssemblyEditor__ControlsPanel';
        _controlsPanelEl.id         =  'ValeSpec__AssemblyEditor__ControlsPanel';
        _controlsPanelEl.style.flex       =  '1 1 ' + controlsPct;

        _containerEl.classList.add('ValeSpec__AssemblyEditor__Container');
        _containerEl.appendChild(_previewPanelEl);
        _containerEl.appendChild(_controlsPanelEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Initialise Sub-Modules
    // ------------------------------------------------------------
    function _initSubModules() {
        var SvgPreview        =  window.ValeSpec__AssemblyEditor__SvgPreview;
        var DoorConfigurator  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__Main;

        if (SvgPreview && _previewPanelEl) {
            SvgPreview.init(_previewPanelEl);
        }

        if (DoorConfigurator && _controlsPanelEl) {
            DoorConfigurator.init(_controlsPanelEl);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Assembly Selected Event
    // ------------------------------------------------------------
    function _onAssemblySelected(index) {
        if (index < 0) return;                                              // <-- No assembly selected

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        var assemblyData  =  StateManager.getCurrentAssembly();
        if (!assemblyData) return;

        var DoorConfigurator  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__Main;
        if (DoorConfigurator) {
            DoorConfigurator.refreshFromAssembly(assemblyData);
        }

        var SvgPreview  =  window.ValeSpec__AssemblyEditor__SvgPreview;
        if (SvgPreview) {
            SvgPreview.render(assemblyData);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Layout
    // ------------------------------------------------------------
    async function init() {
        if (_initialised) return;

        _containerEl  =  document.getElementById('ValeSpec__AssemblyEditor__Container');
        if (!_containerEl) {
            console.error('[ValeSpec__AssemblyEditor__Layout] Container not found.');
            return;
        }

        await _loadConfig();
        _buildPanels();
        _initSubModules();

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (StateManager) {
            StateManager.on('assemblySelected', _onAssemblySelected);
        }

        _initialised  =  true;
        console.log('[ValeSpec__AssemblyEditor__Layout] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        init  : init
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__Layout  =  ValeSpec__AssemblyEditor__Layout;
