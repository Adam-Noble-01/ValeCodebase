/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR MAIN ORCHESTRATOR
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__Main__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - Main
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Orchestrates stepped wizard form and sub-module rendering
   CREATED    : 2026

   DESCRIPTION:
   - Renders the global settings bar and step-based wizard layout
   - Uses StepManager to create sequential collapsible step cards
   - Calls three sub-modules to render into their respective step cards
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


    // HELPER FUNCTION | Build Step Wizard via StepManager
    // ------------------------------------------------------------
    function _buildStepWizard() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) {
            console.error('[ValeSpec__DoorConfigurator__Main] StepManager not available.');
            return;
        }

        StepManager.init(_containerEl);

        var step1Body  =  StepManager.createStep('doorType');
        var step2Body  =  StepManager.createStep('dimensions');
        var step3Body  =  StepManager.createStep('hinges');
        var step4Body  =  StepManager.createStep('levers');
        var step5Body  =  StepManager.createStep('hooks');
        var step6Body  =  StepManager.createStep('misc');

        _initColumnModules(step1Body, step2Body, step3Body, step4Body, step5Body, step6Body);

        StepManager.goToStep('doorType');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Initialise Column Sub-Modules into Step Cards
    // ------------------------------------------------------------
    function _initColumnModules(step1Body, step2Body, step3Body, step4Body, step5Body, step6Body) {
        var DoorTypeDims    =  window.ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions;
        var HingesLevers    =  window.ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers;
        var HooksMisc       =  window.ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc;

        if (DoorTypeDims) DoorTypeDims.init(step1Body, step2Body);
        if (HingesLevers) HingesLevers.init(step3Body, step4Body);
        if (HooksMisc)    HooksMisc.init(step5Body, step6Body);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Door Configurator
    // ------------------------------------------------------------
    function init(container) {
        if (_initialised) return;
        _containerEl  =  container;
        if (!_containerEl) return;

        _buildGlobalBar();
        _buildStepWizard();

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

        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (StepManager) StepManager.refreshAllSummaries();
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
