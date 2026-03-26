import workersSeedData from '../03__AppData/Na__AppData__Workers__Seed.json' with { type: 'json' };
import { Na__Analytics__DestroyCharts, Na__Analytics__RenderAnalytics } from '../11__Feature__Analytics/Na__Feature__Analytics__Render.js';
import { Na__Header__RenderShell } from '../12__Feature__HeaderAndTabs/Na__Feature__HeaderAndTabs__Render.js';
import { Na__Timecard__DestroyTimecardSystem, Na__Timecard__RenderTimecardSystem } from '../12__Feature__TimecardSystem/Na__Feature__TimecardSystem__EventHandlers__.js';
import { Na__Schedule__DestroyScheduleBoard, Na__Schedule__RenderScheduleBoard } from '../10__Feature__ScheduleBoard/Na__Feature__ScheduleBoard__Render.js';
import { Na__AppCore__GetState, Na__AppCore__InitializeStateStore, Na__AppCore__RedoWorkersChange, Na__AppCore__SetState, Na__AppCore__SetWorkers, Na__AppCore__SubscribeStateChange, Na__AppCore__UndoWorkersChange } from './Na__AppCore__StateStore.js';
import { Na__AppCore__SetupHotkeysHandler } from './Na__AppCore__HotkeysHandler.js';
import { Na__System__IsRunningOnLocalhost } from '../70__System__DevTools/Na__System__DevTools__LocalhostGuard.js';
import { Na__Persistence__LoadWorkersAsync, Na__Persistence__SaveWorkersAsync } from '../70__System__DevTools/Na__System__PersistenceApi.js';

// -----------------------------------------------------------------------------
// REGION | ValePlanner Application Controller
// -----------------------------------------------------------------------------

 // MODULE VARIABLES | Root and Timer Handles
 // ------------------------------------------------------------
 let Na__AppCore__RootElement = null;
 let Na__AppCore__ClockIntervalId = null;
let Na__AppCore__WorkersSaveTimeoutId = null;
let Na__AppCore__PendingWorkersSavePayload = null;
let Na__AppCore__LastObservedWorkersRef = null;
 // ------------------------------------------------------------


 // FUNCTION | Initialize ValePlanner App
 // ------------------------------------------------------------
export async function Na__AppCore__InitializeValePlannerApp(rootElement) {
     Na__AppCore__RootElement = rootElement;

     const nowValue = new Date();
     const currentTimeMins = (nowValue.getHours() * 60) + nowValue.getMinutes();
    const seededWorkers = structuredClone(workersSeedData.workers);
    const persistedWorkers = await Na__Persistence__LoadWorkersAsync();
    const initialWorkers = Array.isArray(persistedWorkers) ? persistedWorkers : seededWorkers;

     Na__AppCore__InitializeStateStore({
        workers: structuredClone(initialWorkers),
        defaultWorkers: structuredClone(initialWorkers),
         mainTab: 'schedule',
         viewMode: 'week',
         currentDate: '2024-10-24',
         selectedShiftId: null,
         draftShift: null,
         pendingDrag: null,
         dragOffsetMins: 0,
         currentTimeMins
     });
    Na__AppCore__LastObservedWorkersRef = Na__AppCore__GetState()?.workers || null;

    Na__AppCore__SubscribeStateChange((nextState) => {
        if (nextState?.workers && nextState.workers !== Na__AppCore__LastObservedWorkersRef) {
            Na__AppCore__LastObservedWorkersRef = nextState.workers;
            Na__AppCore__QueueWorkersPersistenceSave(nextState.workers);
        }
         Na__AppCore__RenderApp();
     });

     Na__AppCore__SetupGlobalEvents();
     Na__AppCore__RenderApp();
     Na__AppCore__StartClockTicker();
 }
 // ------------------------------------------------------------


 // SUB FUNCTION | Render Entire App
 // ------------------------------------------------------------
 function Na__AppCore__RenderApp() {
     const currentState = Na__AppCore__GetState();
     if (!Na__AppCore__RootElement || !currentState) return;

     Na__Header__RenderShell(currentState, Na__AppCore__RootElement);
     const panelElement = Na__AppCore__RootElement.querySelector('#naAppFeaturePanel');
     if (!panelElement) return;

     Na__AppCore__BindHeaderEvents();

    if (currentState.mainTab === 'schedule') {
        Na__Analytics__DestroyCharts();
        Na__Timecard__DestroyTimecardSystem();
         Na__Schedule__RenderScheduleBoard({
             state: currentState,
             panelElement,
             setState: Na__AppCore__SetState,
            setWorkers: Na__AppCore__ApplyWorkers,
            getState: Na__AppCore__GetState
         });
    } else if (currentState.mainTab === 'analytics') {
         Na__Schedule__DestroyScheduleBoard();
        Na__Timecard__DestroyTimecardSystem();
         Na__Analytics__RenderAnalytics({
             panelElement,
             worker: currentState.workers[0]
         });
    } else if (currentState.mainTab === 'timecard') {
        Na__Schedule__DestroyScheduleBoard();
        Na__Analytics__DestroyCharts();
        Na__Timecard__RenderTimecardSystem({
            panelElement
        });
     }

     if (Na__System__IsRunningOnLocalhost()) {
         document.title = 'ValePlanner (Localhost)';
     } else {
         document.title = 'ValePlanner';
     }
 }
 // ------------------------------------------------------------


 // SUB FUNCTION | Bind Header UI Events
 // ------------------------------------------------------------
 function Na__AppCore__BindHeaderEvents() {
     Na__AppCore__RootElement.querySelectorAll('[data-action="set-main-tab"]').forEach((buttonElement) => {
         buttonElement.addEventListener('click', () => {
             const nextTab = buttonElement.getAttribute('data-value');
             if (!nextTab) return;
             Na__AppCore__SetState({
                 mainTab: nextTab,
                 selectedShiftId: null,
                 draftShift: null,
                 pendingDrag: null
             });
         });
     });

     Na__AppCore__RootElement.querySelectorAll('[data-action="set-view-mode"]').forEach((buttonElement) => {
         buttonElement.addEventListener('click', () => {
             const nextMode = buttonElement.getAttribute('data-value');
             if (!nextMode) return;
             Na__AppCore__SetState({ viewMode: nextMode });
         });
     });

     Na__AppCore__RootElement.querySelectorAll('[data-action="reset-workers"]').forEach((buttonElement) => {
         buttonElement.addEventListener('click', () => {
             const stateValue = Na__AppCore__GetState();
             Na__AppCore__SetState({
                 workers: structuredClone(stateValue.defaultWorkers),
                 selectedShiftId: null,
                 draftShift: null,
                 pendingDrag: null
             });
         });
     });
 }
 // ------------------------------------------------------------


 // SUB FUNCTION | Apply Worker Updater Function
 // ------------------------------------------------------------
 function Na__AppCore__ApplyWorkers(workersUpdater) {
     const stateValue = Na__AppCore__GetState();
     const nextWorkers = workersUpdater(stateValue.workers);
     Na__AppCore__SetWorkers(nextWorkers);
 }
 // ------------------------------------------------------------

// SUB FUNCTION | Debounce Workers Save To Localhost API
// ------------------------------------------------------------
function Na__AppCore__QueueWorkersPersistenceSave(workersValue) {
    Na__AppCore__PendingWorkersSavePayload = structuredClone(workersValue);
    if (Na__AppCore__WorkersSaveTimeoutId) {
        window.clearTimeout(Na__AppCore__WorkersSaveTimeoutId);
    }

    Na__AppCore__WorkersSaveTimeoutId = window.setTimeout(async () => {
        const payloadValue = Na__AppCore__PendingWorkersSavePayload;
        Na__AppCore__WorkersSaveTimeoutId = null;
        Na__AppCore__PendingWorkersSavePayload = null;
        if (!payloadValue) return;
        const didSave = await Na__Persistence__SaveWorkersAsync(payloadValue);
        if (!didSave && Na__System__IsRunningOnLocalhost()) {
            console.warn('ValePlanner workers save request failed.');
        }
    }, 300);
}
// ------------------------------------------------------------


 // SUB FUNCTION | Setup Global Keyboard/Click Events
 // ------------------------------------------------------------
 function Na__AppCore__SetupGlobalEvents() {
    Na__AppCore__SetupHotkeysHandler({
        onUndo: () => {
            Na__AppCore__UndoWorkersChange();
        },
        onRedo: () => {
            Na__AppCore__RedoWorkersChange();
        }
    });

     window.addEventListener('keydown', (keyboardEvent) => {
         const stateValue = Na__AppCore__GetState();
         if (!stateValue) return;

         if ((keyboardEvent.key === 'Delete' || keyboardEvent.key === 'Backspace') && stateValue.selectedShiftId) {
             Na__AppCore__SetState({
                 workers: stateValue.workers.map((workerValue) => ({
                     ...workerValue,
                     shifts: workerValue.shifts.filter((shiftValue) => shiftValue.id !== stateValue.selectedShiftId)
                 })),
                 selectedShiftId: null
             });
         }
     });

     window.addEventListener('click', () => {
         const stateValue = Na__AppCore__GetState();
         if (!stateValue) return;

         if (stateValue.selectedShiftId && !stateValue.draftShift && !stateValue.pendingDrag) {
             Na__AppCore__SetState({ selectedShiftId: null });
         }
     });
 }
 // ------------------------------------------------------------


 // SUB FUNCTION | Start Current Time Ticker
 // ------------------------------------------------------------
 function Na__AppCore__StartClockTicker() {
     if (Na__AppCore__ClockIntervalId) {
         window.clearInterval(Na__AppCore__ClockIntervalId);
     }

     Na__AppCore__ClockIntervalId = window.setInterval(() => {
         const nowValue = new Date();
         Na__AppCore__SetState({
             currentTimeMins: (nowValue.getHours() * 60) + nowValue.getMinutes()
         });
     }, 60000);
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
