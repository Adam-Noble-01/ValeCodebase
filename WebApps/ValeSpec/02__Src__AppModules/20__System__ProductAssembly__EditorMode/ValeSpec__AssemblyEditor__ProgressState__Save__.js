/* =============================================================================
   VALESPEC - ASSEMBLY EDITOR PROGRESS STATE SAVE
   =============================================================================

   FILE       : ValeSpec__AssemblyEditor__ProgressState__Save__.js
   NAMESPACE  : ValeSpec
   MODULE     : AssemblyEditor - ProgressState - Save
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Persist step progress state into current assembly project data
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Subscribes to StepManager state changes (active step + completed bubbles)
   - Writes progress state into Assembly__ProgressState__Config per assembly
   - Uses diff checks to avoid redundant state writes and event churn
   - Exposes suspension flag so load/hydration can apply state without loops

   ============================================================================= */

// =============================================================================
// REGION | Assembly Editor Progress State Save Module
// =============================================================================

const ValeSpec__AssemblyEditor__ProgressState__Save = (function() {

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


    // MODULE VARIABLES | Internal Save State
    // ------------------------------------------------------------
    let ValeSpec__ProgressStateSave__Initialised           =  false;
    let ValeSpec__ProgressStateSave__PersistenceSuspended  =  false;
    let ValeSpec__ProgressStateSave__WriteInFlight         =  false;
    let ValeSpec__ProgressStateSave__LastPersistSignature  =  '';
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Normalised Completed Steps Map
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateSave__BuildCompletedStepsMap(rawCompletedSteps) {
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


    // HELPER FUNCTION | Build Persisted Completed Steps Map
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateSave__BuildPersistedCompletedStepsMap(normalisedCompletedSteps) {
        var sourceCompletedSteps   =  normalisedCompletedSteps || {};
        var persistedCompletedMap  =  {};

        for (var i = 0; i < VALESPEC__ASSEMBLY__STEP_DEFS.length; i++) {
            var stepDef       =  VALESPEC__ASSEMBLY__STEP_DEFS[i];
            var stepId        =  stepDef.StepId;
            var persistedKey  =  stepDef.PersistedCompletedKey;
            persistedCompletedMap[persistedKey]  =  !!sourceCompletedSteps[stepId];
        }

        return persistedCompletedMap;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Progress State Signature
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateSave__BuildProgressSignature(progressState) {
        var activeStepId  =  progressState && progressState.ActiveStepId ? progressState.ActiveStepId : VALESPEC__ASSEMBLY__DEFAULT_ACTIVE_STEP_ID;
        var completed     =  progressState ? progressState.CompletedSteps : null;
        var parts         =  [activeStepId];

        for (var i = 0; i < VALESPEC__ASSEMBLY__STEP_DEFS.length; i++) {
            var stepId  =  VALESPEC__ASSEMBLY__STEP_DEFS[i].StepId;
            parts.push(completed && completed[stepId] ? '1' : '0');
        }

        return parts.join('|');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Normalised Progress State
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateSave__BuildNormalisedProgressState(rawProgressState) {
        var sourceState  =  rawProgressState || {};
        var activeStepId =  sourceState.ActiveStepId;

        if (typeof activeStepId !== 'string') {
            activeStepId  =  VALESPEC__ASSEMBLY__DEFAULT_ACTIVE_STEP_ID;
        }

        var isValidActiveStep  =  false;
        for (var i = 0; i < VALESPEC__ASSEMBLY__STEP_DEFS.length; i++) {
            if (VALESPEC__ASSEMBLY__STEP_DEFS[i].StepId === activeStepId) {
                isValidActiveStep  =  true;
                break;
            }
        }
        if (!isValidActiveStep) activeStepId  =  VALESPEC__ASSEMBLY__DEFAULT_ACTIVE_STEP_ID;

        return {
            ActiveStepId   : activeStepId,
            CompletedSteps : ValeSpec__ProgressStateSave__BuildCompletedStepsMap(sourceState.CompletedSteps)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Normalised Progress State from Assembly
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateSave__BuildProgressStateFromAssembly(assemblyData) {
        var progressCfg  =  assemblyData ? assemblyData['Assembly__ProgressState__Config'] : null;
        if (!progressCfg || typeof progressCfg !== 'object' || Array.isArray(progressCfg)) {
            return ValeSpec__ProgressStateSave__BuildNormalisedProgressState(null);
        }

        return ValeSpec__ProgressStateSave__BuildNormalisedProgressState({
            ActiveStepId   : progressCfg['Assembly__ProgressState__Config__ActiveStepId'],
            CompletedSteps : progressCfg['Assembly__ProgressState__Config__CompletedSteps']
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Normalised Progress State from Step Snapshot
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateSave__BuildProgressStateFromStepSnapshot(stepSnapshot) {
        if (!stepSnapshot || typeof stepSnapshot !== 'object') {
            return ValeSpec__ProgressStateSave__BuildNormalisedProgressState(null);
        }

        return ValeSpec__ProgressStateSave__BuildNormalisedProgressState({
            ActiveStepId   : stepSnapshot.ActiveStepId,
            CompletedSteps : stepSnapshot.CompletedSteps
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Persist Progress State onto Current Assembly
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateSave__PersistToCurrentAssembly(stepSnapshot) {
        if (ValeSpec__ProgressStateSave__PersistenceSuspended) return;
        if (ValeSpec__ProgressStateSave__WriteInFlight) return;

        var StateManager  =  window.ValeSpec__AppCore__StateManager;
        if (!StateManager) return;

        var assemblyData  =  StateManager.ValeSpec__StateManager__GetCurrentAssembly();
        if (!assemblyData) return;

        var nextProgressState      =  ValeSpec__ProgressStateSave__BuildProgressStateFromStepSnapshot(stepSnapshot);
        var nextProgressSignature  =  ValeSpec__ProgressStateSave__BuildProgressSignature(nextProgressState);
        var currentProgressState   =  ValeSpec__ProgressStateSave__BuildProgressStateFromAssembly(assemblyData);
        var currentSignature       =  ValeSpec__ProgressStateSave__BuildProgressSignature(currentProgressState);

        if (nextProgressSignature === currentSignature && nextProgressSignature === ValeSpec__ProgressStateSave__LastPersistSignature) return;
        if (nextProgressSignature === currentSignature) {
            ValeSpec__ProgressStateSave__LastPersistSignature  =  nextProgressSignature;
            return;
        }

        assemblyData['Assembly__ProgressState__Config']  =  {
            'Assembly__ProgressState__Config__CompletedSteps' : ValeSpec__ProgressStateSave__BuildPersistedCompletedStepsMap(nextProgressState.CompletedSteps),
            'Assembly__ProgressState__Config__ActiveStepId'   : nextProgressState.ActiveStepId
        };

        ValeSpec__ProgressStateSave__WriteInFlight  =  true;
        try {
            StateManager.ValeSpec__StateManager__UpdateCurrentAssembly(assemblyData);
            ValeSpec__ProgressStateSave__LastPersistSignature  =  nextProgressSignature;
        } finally {
            ValeSpec__ProgressStateSave__WriteInFlight  =  false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialise Progress Persistence Listener
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateSave__Init() {
        if (ValeSpec__ProgressStateSave__Initialised) return;

        var StepManager  =  window.ValeSpec__AssemblyEditor__StepManager;
        if (!StepManager || !StepManager.ValeSpec__StepManager__OnStateChanged) return;

        StepManager.ValeSpec__StepManager__OnStateChanged(function(stepSnapshot) {
            ValeSpec__ProgressStateSave__PersistToCurrentAssembly(stepSnapshot);
        });

        ValeSpec__ProgressStateSave__Initialised  =  true;
        console.log('[ValeSpec__ProgressState__Save] Initialised.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Set Persistence Suspension State
    // ------------------------------------------------------------
    function ValeSpec__ProgressStateSave__SetPersistenceSuspended(isSuspended) {
        ValeSpec__ProgressStateSave__PersistenceSuspended  =  !!isSuspended;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__ProgressStateSave__Init                   : ValeSpec__ProgressStateSave__Init,
        ValeSpec__ProgressStateSave__SetPersistenceSuspended: ValeSpec__ProgressStateSave__SetPersistenceSuspended
    };

})();

// endregion ===================================================================

window.ValeSpec__AssemblyEditor__ProgressState__Save  =  ValeSpec__AssemblyEditor__ProgressState__Save;
