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
   - Provides ValeSpec__DoorConfigurator__RefreshFromAssembly() for external re-population

   ============================================================================= */

// =============================================================================
// REGION | Door Configurator Main Module
// =============================================================================

const ValeSpec__AssemblyEditor__DoorConfigurator__Main = (function() {

    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let ValeSpec__DoorConfigurator__ContainerEl  =  null;   // <-- Controls panel container
    let ValeSpec__DoorConfigurator__GlobalBarEl  =  null;   // <-- Global settings bar element
    let ValeSpec__DoorConfigurator__Initialised  =  false;  // <-- Prevents double-init
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Global Settings Bar
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__BuildGlobalBar() {
        var GlobalSettings  =  window.ValeSpec__AssemblyEditor__GlobalSettings;
        if (!GlobalSettings) return;

        ValeSpec__DoorConfigurator__GlobalBarEl     =  document.createElement('div');
        ValeSpec__DoorConfigurator__GlobalBarEl.id  =  'ValeSpec__AssemblyEditor__GlobalBar';
        ValeSpec__DoorConfigurator__ContainerEl.appendChild(ValeSpec__DoorConfigurator__GlobalBarEl);

        GlobalSettings.ValeSpec__GlobalSettings__Init(ValeSpec__DoorConfigurator__GlobalBarEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step Wizard via StepManager
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__BuildStepWizard() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) {
            console.error('[ValeSpec__DoorConfigurator__Main] StepManager not available.');
            return;
        }

        StepManager.ValeSpec__StepManager__Init(ValeSpec__DoorConfigurator__ContainerEl);

        var step1Body  =  StepManager.ValeSpec__StepManager__CreateStep('doorType');
        var step2Body  =  StepManager.ValeSpec__StepManager__CreateStep('dimensions');
        var step3Body  =  StepManager.ValeSpec__StepManager__CreateStep('hinges');
        var step4Body  =  StepManager.ValeSpec__StepManager__CreateStep('levers');
        var step5Body  =  StepManager.ValeSpec__StepManager__CreateStep('hooks');
        var step6Body  =  StepManager.ValeSpec__StepManager__CreateStep('misc');

        ValeSpec__DoorConfigurator__InitColumnModules(step1Body, step2Body, step3Body, step4Body, step5Body, step6Body);

        StepManager.ValeSpec__StepManager__GoToStep('doorType');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Initialise Column Sub-Modules into Step Cards
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__InitColumnModules(step1Body, step2Body, step3Body, step4Body, step5Body, step6Body) {
        var DoorTypeDims  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions;
        var HingesLevers  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers;
        var HooksMisc     =  window.ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc;

        if (DoorTypeDims) DoorTypeDims.ValeSpec__DoorTypeAndDimensions__Init(step1Body, step2Body);
        if (HingesLevers) HingesLevers.ValeSpec__HingesAndLevers__Init(step3Body, step4Body);
        if (HooksMisc)    HooksMisc.ValeSpec__HooksAndMisc__Init(step5Body, step6Body);
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Door Configurator
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__Init(container) {
        if (ValeSpec__DoorConfigurator__Initialised) return;
        ValeSpec__DoorConfigurator__ContainerEl  =  container;
        if (!ValeSpec__DoorConfigurator__ContainerEl) return;

        ValeSpec__DoorConfigurator__BuildGlobalBar();
        ValeSpec__DoorConfigurator__BuildStepWizard();

        ValeSpec__DoorConfigurator__Initialised  =  true;
        console.log('[ValeSpec__DoorConfigurator__Main] Initialised.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh All Sub-Modules from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__RefreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        var DoorTypeDims  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions;
        var HingesLevers  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndLevers;
        var HooksMisc     =  window.ValeSpec__AssemblyEditor__DoorConfigurator__HooksAndMisc;

        if (DoorTypeDims) DoorTypeDims.ValeSpec__DoorTypeAndDimensions__RefreshFromAssembly(assemblyData);
        if (HingesLevers) HingesLevers.ValeSpec__HingesAndLevers__RefreshFromAssembly(assemblyData);
        if (HooksMisc)    HooksMisc.ValeSpec__HooksAndMisc__RefreshFromAssembly(assemblyData);

        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (StepManager) StepManager.ValeSpec__StepManager__RefreshAllSummaries();
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Current Form State to Assembly
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__SaveToAssembly() {
        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return;

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__DoorConfigurator__Init                : ValeSpec__DoorConfigurator__Init,
        ValeSpec__DoorConfigurator__RefreshFromAssembly : ValeSpec__DoorConfigurator__RefreshFromAssembly,
        ValeSpec__DoorConfigurator__SaveToAssembly      : ValeSpec__DoorConfigurator__SaveToAssembly
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__Main  =  ValeSpec__AssemblyEditor__DoorConfigurator__Main;
