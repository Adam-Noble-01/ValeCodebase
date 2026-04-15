/* =============================================================================
   VALESPEC - ASSEMBLY EDITOR PROGRESS STATE LOAD
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__ProgressState__Load__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - ProgressState - Load
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Hydrate step progress state from assembly project data
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Reads persisted Assembly__ProgressState__Config from selected assembly
   - Normalises values and applies completion/active state to StepManager
   - Coordinates with ProgressState Save module to avoid hydration loops

   ============================================================================= */

// =============================================================================
// REGION | Assembly Editor Progress State Load Module
// =============================================================================

const ValeSpec__AssemblyEditor__ProgressState__Load = (function() {

    // MODULE CONSTANTS | Supported Steps and Persisted Keys
    // ------------------------------------------------------------
    const VALESPEC__ASSEMBLY__DEFAULT_ACTIVE_STEP_ID  =  'doorType';
    const VALESPEC__ASSEMBLY__STEP_DEFS  =  [
        { StepId: 'doorType',   PersistedCompletedKey: 'Assembly__ProgressState__Config__CompletedSteps__DoorType'   },
        { StepId: 'dimensions', PersistedCompletedKey: 'Assembly__ProgressState__Config__CompletedSteps__Dimensions' },
        { StepId: 'finish',     PersistedCompletedKey: 'Assembly__ProgressState__Config__CompletedSteps__Finish'     },
        { StepId: 'handles',    PersistedCompletedKey: 'Assembly__ProgressState__Config__CompletedSteps__Handles'    },
        { StepId: 'hinges',     PersistedCompletedKey: 'Assembly__ProgressState__Config__CompletedSteps__Hinges'     },
        { StepId: 'hooks',      PersistedCompletedKey: 'Assembly__ProgressState__Config__CompletedSteps__Hooks'      },
        { StepId: 'misc',       PersistedCompletedKey: 'Assembly__ProgressState__Config__CompletedSteps__Misc'       }
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | Initialisation State
    // ------------------------------------------------------------
    let ValeSpec__ProgressStateLoad__Initialised  =  false;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Validate Step Id
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateLoad__IsStepId(stepId) {
        for (var i = 0; i < VALESPEC__ASSEMBLY__STEP_DEFS.length; i++) {
            if (VALESPEC__ASSEMBLY__STEP_DEFS[i].StepId === stepId) return true;
        }
        return false;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Normalised Completed Steps Map
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateLoad__BuildCompletedStepsMap(rawCompletedSteps) {
        var sourceCompletedSteps  =  rawCompletedSteps;
        if (!sourceCompletedSteps || typeof sourceCompletedSteps !== 'object' || Array.isArray(sourceCompletedSteps)) {
            sourceCompletedSteps  =  {};
        }

        var normalisedCompletedSteps  =  {};
        for (var i = 0; i < VALESPEC__ASSEMBLY__STEP_DEFS.length; i++) {
            var stepDef       =  VALESPEC__ASSEMBLY__STEP_DEFS[i];
            var stepId        =  stepDef.StepId;
            var persistedKey  =  stepDef.PersistedCompletedKey;
            var resolvedValue =  false;

            if (Object.prototype.hasOwnProperty.call(sourceCompletedSteps, persistedKey)) {
                resolvedValue  =  !!sourceCompletedSteps[persistedKey];
            } else if (Object.prototype.hasOwnProperty.call(sourceCompletedSteps, stepId)) {
                resolvedValue  =  !!sourceCompletedSteps[stepId]; // <-- Backward compatibility with legacy key style
            }

            normalisedCompletedSteps[stepId]  =  resolvedValue;
        }

        return normalisedCompletedSteps;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Normalised Progress State
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateLoad__BuildNormalisedProgressState(rawProgressStateCfg) {
        var sourceCfg  =  rawProgressStateCfg;
        if (!sourceCfg || typeof sourceCfg !== 'object' || Array.isArray(sourceCfg)) {
            sourceCfg  =  {};
        }

        var activeStepId  =  sourceCfg['Assembly__ProgressState__Config__ActiveStepId'];
        if (typeof activeStepId !== 'string' || !ValeSpec__ProgressStateLoad__IsStepId(activeStepId)) {
            activeStepId  =  VALESPEC__ASSEMBLY__DEFAULT_ACTIVE_STEP_ID;
        }

        return {
            ActiveStepId        : activeStepId,
            CompletedSteps      : ValeSpec__ProgressStateLoad__BuildCompletedStepsMap(sourceCfg['Assembly__ProgressState__Config__CompletedSteps']),
            NextProgressedSteps : {}
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Progress State from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateLoad__BuildProgressStateFromAssembly(assemblyData) {
        var progressCfg  =  assemblyData ? assemblyData['Assembly__ProgressState__Config'] : null;
        return ValeSpec__ProgressStateLoad__BuildNormalisedProgressState(progressCfg);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Progress State to StepManager
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateLoad__ApplyToStepManager(progressState) {
        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager) return;

        if (StepManager.ValeSpec__StepManager__ApplyProgressState) {
            StepManager.ValeSpec__StepManager__ApplyProgressState(progressState);
            return;
        }

        var completedSteps  =  progressState && progressState.CompletedSteps ? progressState.CompletedSteps : {};
        for (var i = 0; i < VALESPEC__ASSEMBLY__STEP_DEFS.length; i++) {
            var stepId  =  VALESPEC__ASSEMBLY__STEP_DEFS[i].StepId;
            if (StepManager.ValeSpec__StepManager__MarkCompleted) {
                StepManager.ValeSpec__StepManager__MarkCompleted(stepId, !!completedSteps[stepId]);
            }
        }
        if (StepManager.ValeSpec__StepManager__GoToStep) {
            StepManager.ValeSpec__StepManager__GoToStep(progressState.ActiveStepId || VALESPEC__ASSEMBLY__DEFAULT_ACTIVE_STEP_ID);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply Progress State from Assembly Data
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateLoad__ApplyFromAssembly(assemblyData) {
        var progressState  =  ValeSpec__ProgressStateLoad__BuildProgressStateFromAssembly(assemblyData);
        var SaveModule     =  window.ValeSpec__AssemblyEditor__ProgressState__Save;

        if (SaveModule && SaveModule.ValeSpec__ProgressStateSave__SetPersistenceSuspended) {
            SaveModule.ValeSpec__ProgressStateSave__SetPersistenceSuspended(true);
        }

        try {
            ValeSpec__ProgressStateLoad__ApplyToStepManager(progressState);
        } finally {
            if (SaveModule && SaveModule.ValeSpec__ProgressStateSave__SetPersistenceSuspended) {
                SaveModule.ValeSpec__ProgressStateSave__SetPersistenceSuspended(false);
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Progress State Loader
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateLoad__Init() {
        if (ValeSpec__ProgressStateLoad__Initialised) return;
        ValeSpec__ProgressStateLoad__Initialised  =  true;
        console.log('[ValeSpec__ProgressState__Load] Initialised.');
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__ProgressStateLoad__Init             : ValeSpec__ProgressStateLoad__Init,
        ValeSpec__ProgressStateLoad__ApplyFromAssembly: ValeSpec__ProgressStateLoad__ApplyFromAssembly
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__ProgressState__Load  =  ValeSpec__AssemblyEditor__ProgressState__Load;
