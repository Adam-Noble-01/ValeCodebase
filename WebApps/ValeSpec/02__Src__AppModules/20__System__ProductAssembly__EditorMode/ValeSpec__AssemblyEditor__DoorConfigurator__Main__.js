/* =============================================================================
   VALESPEC - DOOR CONFIGURATOR MAIN ORCHESTRATOR
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__DoorConfigurator__Main__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - DoorConfigurator - Main
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Orchestrates stepped wizard form and sub-module rendering
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Renders the global settings bar and step-based wizard layout
   - Uses StepManager to create sequential collapsible step cards
   - Calls step sub-modules to render into their respective step cards
   - Coordinates saving changes back to assembly via StateManager
   - Provides ValeSpec__DoorConfigurator__RefreshFromAssembly() for external re-population

   ============================================================================= */

// =============================================================================
// REGION | Door Configurator Main Module
// =============================================================================

const ValeSpec__AssemblyEditor__DoorConfigurator__Main = (function() {

    // MODULE CONSTANTS | Save Button Gating Requirements
    // ------------------------------------------------------------
    const SAVE_BUTTON_REQUIRED_NEXT_STEPS  =  ['doorType', 'dimensions', 'finish', 'handles', 'hinges', 'hooks'];
    // ------------------------------------------------------------


    // MODULE VARIABLES | DOM References
    // ------------------------------------------------------------
    let ValeSpec__DoorConfigurator__ContainerEl             =  null;   // <-- Controls panel container
    let ValeSpec__DoorConfigurator__SaveAssemblyBtnEl       =  null;   // <-- Final save button inside Misc step footer
    let ValeSpec__DoorConfigurator__SaveButtonBindingDone   =  false;  // <-- Prevent duplicate StepManager listener registration
    let ValeSpec__DoorConfigurator__Initialised             =  false;  // <-- Prevents double-init
    // ------------------------------------------------------------


    // HELPER FUNCTION | Check if Save Button Should Be Visible
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__CanShowSaveAssemblyButton() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return false;
        if (StepManager.ValeSpec__StepManager__GetActiveStepId() !== 'misc') return false;
        return StepManager.ValeSpec__StepManager__HasProgressedStepsViaNext(SAVE_BUTTON_REQUIRED_NEXT_STEPS);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Update Save Button Visibility
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__UpdateSaveAssemblyButtonVisibility() {
        if (!ValeSpec__DoorConfigurator__SaveAssemblyBtnEl) return;
        var canShow  =  ValeSpec__DoorConfigurator__CanShowSaveAssemblyButton();
        ValeSpec__DoorConfigurator__SaveAssemblyBtnEl.style.display  =  canShow ? 'inline-flex' : 'none';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Handle Save Button Click
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__OnSaveAssemblyClick() {
        ValeSpec__DoorConfigurator__SaveToAssembly().finally(function() {
            var ModeManager  =  window.ValeSpec__AppCore__ModeManager;
            if (ModeManager) {
                ModeManager.ValeSpec__ModeManager__SwitchToMode(ModeManager.MODE_DOC_EDITOR);
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Flush Hooks and Misc Controls Before Save
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__FlushFinalStepsToAssembly() {
        var CabinHooks     =  window.ValeSpec__AssemblyEditor__DoorConfigurator__CabinHooks;
        var Miscellaneous  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__Miscellaneous;
        if (CabinHooks && CabinHooks.ValeSpec__CabinHooks__FlushToAssembly) CabinHooks.ValeSpec__CabinHooks__FlushToAssembly();
        if (Miscellaneous && Miscellaneous.ValeSpec__Miscellaneous__FlushToAssembly) Miscellaneous.ValeSpec__Miscellaneous__FlushToAssembly();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Save Assembly Button in Misc Footer
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__BuildSaveAssemblyButton(miscStepBodyEl) {
        if (!miscStepBodyEl) return;
        var footerEl  =  miscStepBodyEl.querySelector('.ValeSpec__AssemblyEditor__StepCard__Footer');
        if (!footerEl) return;

        ValeSpec__DoorConfigurator__SaveAssemblyBtnEl  =  document.createElement('button');
        ValeSpec__DoorConfigurator__SaveAssemblyBtnEl.className    =  'ValeSpec__AssemblyEditor__StepCard__SaveBtn';
        ValeSpec__DoorConfigurator__SaveAssemblyBtnEl.textContent  =  'Save Assembly';
        ValeSpec__DoorConfigurator__SaveAssemblyBtnEl.style.display  =  'none';
        ValeSpec__DoorConfigurator__SaveAssemblyBtnEl.addEventListener('click', ValeSpec__DoorConfigurator__OnSaveAssemblyClick);

        footerEl.appendChild(ValeSpec__DoorConfigurator__SaveAssemblyBtnEl);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Subscribe to StepManager State Changes for Save Button
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__BindSaveButtonStateListener() {
        if (ValeSpec__DoorConfigurator__SaveButtonBindingDone) return;
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager || !StepManager.ValeSpec__StepManager__OnStateChanged) return;

        StepManager.ValeSpec__StepManager__OnStateChanged(function() {
            ValeSpec__DoorConfigurator__UpdateSaveAssemblyButtonVisibility();
        });

        ValeSpec__DoorConfigurator__SaveButtonBindingDone  =  true;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Step Wizard via StepManager
    // ------------------------------------------------------------
    async function ValeSpec__DoorConfigurator__BuildStepWizard() {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) {
            console.error('[ValeSpec__DoorConfigurator__Main] StepManager not available.');
            return;
        }

        StepManager.ValeSpec__StepManager__Init(ValeSpec__DoorConfigurator__ContainerEl);

        var step1Body  =  StepManager.ValeSpec__StepManager__CreateStep('doorType');
        var step2Body  =  StepManager.ValeSpec__StepManager__CreateStep('dimensions');
        var step3Body  =  StepManager.ValeSpec__StepManager__CreateStep('finish');
        var step4Body  =  StepManager.ValeSpec__StepManager__CreateStep('handles');
        var step5Body  =  StepManager.ValeSpec__StepManager__CreateStep('hinges');
        var step6Body  =  StepManager.ValeSpec__StepManager__CreateStep('hooks');
        var step7Body  =  StepManager.ValeSpec__StepManager__CreateStep('misc');

        await ValeSpec__DoorConfigurator__InitColumnModules(step1Body, step2Body, step3Body, step4Body, step5Body, step6Body, step7Body);
        ValeSpec__DoorConfigurator__BuildSaveAssemblyButton(step7Body);
        ValeSpec__DoorConfigurator__BindSaveButtonStateListener();

        StepManager.ValeSpec__StepManager__GoToStep('doorType');
        ValeSpec__DoorConfigurator__UpdateSaveAssemblyButtonVisibility();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Initialise Column Sub-Modules into Step Cards
    // ------------------------------------------------------------
    async function ValeSpec__DoorConfigurator__InitColumnModules(step1Body, step2Body, step3Body, step4Body, step5Body, step6Body, step7Body) {
        var DoorTypeDims  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions;
        var GlobalSettings =  window.ValeSpec__AssemblyEditor__GlobalSettings;
        var HingesHandles  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndHandles;
        var CabinHooks    =  window.ValeSpec__AssemblyEditor__DoorConfigurator__CabinHooks;
        var Miscellaneous =  window.ValeSpec__AssemblyEditor__DoorConfigurator__Miscellaneous;

        var initTasks  =  [];
        if (DoorTypeDims) initTasks.push(Promise.resolve(DoorTypeDims.ValeSpec__DoorTypeAndDimensions__Init(step1Body, step2Body)));
        if (GlobalSettings) initTasks.push(Promise.resolve(GlobalSettings.ValeSpec__GlobalSettings__Init(step3Body)));
        if (HingesHandles) initTasks.push(Promise.resolve(HingesHandles.ValeSpec__HingesAndHandles__Init(step5Body, step4Body)));
        if (CabinHooks) initTasks.push(Promise.resolve(CabinHooks.ValeSpec__CabinHooks__Init(step6Body)));
        if (Miscellaneous) initTasks.push(Promise.resolve(Miscellaneous.ValeSpec__Miscellaneous__Init(step7Body)));

        await Promise.all(initTasks);                                                           // <-- Ensure controls exist before any refresh call hydrates values
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Door Configurator
    // ------------------------------------------------------------
    async function ValeSpec__DoorConfigurator__Init(container) {
        if (ValeSpec__DoorConfigurator__Initialised) return;
        ValeSpec__DoorConfigurator__ContainerEl  =  container;
        if (!ValeSpec__DoorConfigurator__ContainerEl) return;

        await ValeSpec__DoorConfigurator__BuildStepWizard();

        ValeSpec__DoorConfigurator__Initialised  =  true;
        console.log('[ValeSpec__DoorConfigurator__Main] Initialised.');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Assembly Data to Door Configurator Sub-Modules
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__ApplyAssemblyDataToSubModules(assemblyData) {
        if (!assemblyData) return;

        var DoorTypeDims  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__DoorTypeAndDimensions;
        var HingesHandles  =  window.ValeSpec__AssemblyEditor__DoorConfigurator__HingesAndHandles;
        var CabinHooks    =  window.ValeSpec__AssemblyEditor__DoorConfigurator__CabinHooks;
        var Miscellaneous =  window.ValeSpec__AssemblyEditor__DoorConfigurator__Miscellaneous;

        if (DoorTypeDims) DoorTypeDims.ValeSpec__DoorTypeAndDimensions__RefreshFromAssembly(assemblyData);
        if (HingesHandles) HingesHandles.ValeSpec__HingesAndHandles__RefreshFromAssembly(assemblyData);
        if (CabinHooks) CabinHooks.ValeSpec__CabinHooks__RefreshFromAssembly(assemblyData);
        if (Miscellaneous) Miscellaneous.ValeSpec__Miscellaneous__RefreshFromAssembly(assemblyData);
    }
    // ------------------------------------------------------------


    // FUNCTION | Refresh All Sub-Modules from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__RefreshFromAssembly(assemblyData) {
        if (!assemblyData) return;

        ValeSpec__DoorConfigurator__ApplyAssemblyDataToSubModules(assemblyData);

        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (StepManager) {
            if (StepManager.ValeSpec__StepManager__ResetNextProgressTracking) {
                StepManager.ValeSpec__StepManager__ResetNextProgressTracking();
            }
            StepManager.ValeSpec__StepManager__RefreshAllSummaries();
        }

        ValeSpec__DoorConfigurator__UpdateSaveAssemblyButtonVisibility();
    }
    // ------------------------------------------------------------


    // FUNCTION | Sync Sub-Modules from Assembly Update Event
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__SyncFromAssemblyUpdate(assemblyData) {
        if (!assemblyData) return;

        ValeSpec__DoorConfigurator__ApplyAssemblyDataToSubModules(assemblyData);

        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (StepManager) {
            StepManager.ValeSpec__StepManager__RefreshAllSummaries();
        }

        ValeSpec__DoorConfigurator__UpdateSaveAssemblyButtonVisibility();
    }
    // ------------------------------------------------------------


    // FUNCTION | Save Current Form State to Assembly
    // ------------------------------------------------------------
    function ValeSpec__DoorConfigurator__SaveToAssembly() {
        ValeSpec__DoorConfigurator__FlushFinalStepsToAssembly();

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return Promise.resolve(false);

        var assembly  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assembly) return Promise.resolve(false);

        StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assembly);

        var ProjectFileManager  =  window.ValeSpec__AppData__ProjectFileManager;
        var state  =  StateManager.ValeSpec__StateManager__GetState ? StateManager.ValeSpec__StateManager__GetState() : null;
        var currentProject  =  state ? state.currentProject : null;
        if (ProjectFileManager && currentProject && ProjectFileManager.ValeSpec__ProjectFileManager__SaveProject) {
            return Promise.resolve(ProjectFileManager.ValeSpec__ProjectFileManager__SaveProject(currentProject))
                .then(function(saveResult) {
                    if (saveResult === false) {
                        console.warn('[ValeSpec__DoorConfigurator__Main] SaveProject reported failure.');
                        return false;
                    }
                    if (saveResult && typeof saveResult === 'object' && saveResult.ok === false) {
                        console.warn('[ValeSpec__DoorConfigurator__Main] SaveProject server write failed:', saveResult.error || 'Unknown error');
                        return false;
                    }
                    return true;
                })
                .catch(function(err) {
                    console.error('[ValeSpec__DoorConfigurator__Main] SaveProject threw error:', err);
                    return false;
                });
        }

        return Promise.resolve(true);
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__DoorConfigurator__Init                : ValeSpec__DoorConfigurator__Init,
        ValeSpec__DoorConfigurator__RefreshFromAssembly : ValeSpec__DoorConfigurator__RefreshFromAssembly,
        ValeSpec__DoorConfigurator__SyncFromAssemblyUpdate : ValeSpec__DoorConfigurator__SyncFromAssemblyUpdate,
        ValeSpec__DoorConfigurator__SaveToAssembly      : ValeSpec__DoorConfigurator__SaveToAssembly
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__DoorConfigurator__Main  =  ValeSpec__AssemblyEditor__DoorConfigurator__Main;
