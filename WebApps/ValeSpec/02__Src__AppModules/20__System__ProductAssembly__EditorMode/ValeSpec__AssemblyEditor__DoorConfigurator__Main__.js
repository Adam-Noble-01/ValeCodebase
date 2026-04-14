/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR MAIN ORCHESTRATOR
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__Main__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - Main
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Orchestrates 7-column configurator form and sub-module rendering
   CREATED    : 2026

   DESCRIPTION:
   - Renders the overall configurator form layout into controls panel
   - Calls three sub-modules for their respective column sections
   - Coordinates saving changes back to assembly via StateManager
   - Provides refreshFromAssembly() for external re-population

   ============================================================================= */

// =============================================================================
// REGION | Door Configurator Main Module
// =============================================================================

const ValeSpec__AssemblyEditor__DoorConfigurator__Main = (function() {

    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let _containerEl   =  null;                                             // <-- Controls panel container
    let _globalBarEl   =  null;                                             // <-- Global settings bar element
    let _gridEl        =  null;                                             // <-- 7-column grid element
    let _initialised   =  false;                                            // <-- Prevents double-init
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Global Settings Bar
    // ------------------------------------------------------------
    function _buildGlobalBar() {
        var GlobalSettings  =  window.ValeSpec__AssemblyEditor__GlobalSettings;
        if (!GlobalSettings) return;

        _globalBarEl  =  document.createElement('div');
        _globalBarEl.id  =  'ValeSpec__AssemblyEditor__GlobalBar';
        _containerEl.appendChild(_globalBarEl);

        GlobalSettings.init(_globalBarEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build 7-Column Grid
    // ------------------------------------------------------------
    function _buildGrid() {
        _gridEl  =  document.createElement('div');
        _gridEl.className  =  'ValeSpec__AssemblyEditor__ConfigGrid';
        _gridEl.id         =  'ValeSpec__AssemblyEditor__ConfigGrid';
        _containerEl.appendChild(_gridEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Initialise Column Sub-Modules
    // ------------------------------------------------------------
    function _initColumnModules() {
        var DoorTypeDims    =  window.ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions;
        var HingesLevers    =  window.ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers;
        var HooksMisc       =  window.ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc;

        if (DoorTypeDims) DoorTypeDims.init(_gridEl);                       // <-- Columns 1-3
        if (HingesLevers) HingesLevers.init(_gridEl);                       // <-- Columns 4-5
        if (HooksMisc)    HooksMisc.init(_gridEl);                          // <-- Columns 6-7
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Door Configurator
    // ------------------------------------------------------------
    function init(container) {
        if (_initialised) return;
        _containerEl  =  container;
        if (!_containerEl) return;

        _buildGlobalBar();
        _buildGrid();
        _initColumnModules();

        _initialised  =  true;
        console.log('[ValeSpec__DoorConfigurator__Main] Initialised.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh All Sub-Modules from Assembly Data
    // ------------------------------------------------------------
    function refreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var DoorTypeDims  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions;
        var HingesLevers  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers;
        var HooksMisc     =  window.ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc;

        if (DoorTypeDims) DoorTypeDims.refreshFromAssembly(assemblyData);
        if (HingesLevers) HingesLevers.refreshFromAssembly(assemblyData);
        if (HooksMisc)    HooksMisc.refreshFromAssembly(assemblyData);
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Current Form State to Assembly
    // ------------------------------------------------------------
    function saveToAssembly() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        var assembly  =  StateManager.getCurrentAssembly();
        if (!assembly) return;

        StateManager.updateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        init                 : init,
        refreshFromAssembly  : refreshFromAssembly,
        saveToAssembly       : saveToAssembly
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__Main  =  ValeSpec__AssemblyEditor__DoorConfigurator__Main;
