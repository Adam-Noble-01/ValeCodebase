// -----------------------------------------------------------------------------
// REGION | App State Store
// -----------------------------------------------------------------------------

 let Na__AppCore__StateValue = null;
 let Na__AppCore__Listeners = [];
let Na__AppCore__HistoryPastWorkers = [];
let Na__AppCore__HistoryFutureWorkers = [];
let Na__AppCore__HistoryIsApplying = false;
const Na__AppCore__HistoryMaxEntries = 100;

 // FUNCTION | Initialize State Store
 // ------------------------------------------------------------
 export function Na__AppCore__InitializeStateStore(initialState) {
     Na__AppCore__StateValue = structuredClone(initialState);
    Na__AppCore__HistoryPastWorkers = [];
    Na__AppCore__HistoryFutureWorkers = [];
    Na__AppCore__HistoryIsApplying = false;
 }
 // ------------------------------------------------------------


 // FUNCTION | Get Current State Value
 // ------------------------------------------------------------
 export function Na__AppCore__GetState() {
     return Na__AppCore__StateValue;
 }
 // ------------------------------------------------------------


 // FUNCTION | Subscribe to State Changes
 // ------------------------------------------------------------
 export function Na__AppCore__SubscribeStateChange(listenerFunction) {
     Na__AppCore__Listeners.push(listenerFunction);

     return function Na__AppCore__UnsubscribeStateChange() {
         Na__AppCore__Listeners = Na__AppCore__Listeners.filter((listenerValue) => listenerValue !== listenerFunction);
     };
 }
 // ------------------------------------------------------------


 // FUNCTION | Update State with Partial Changes
 // ------------------------------------------------------------
 export function Na__AppCore__SetState(partialState) {
    const hasWorkersUpdate = Object.prototype.hasOwnProperty.call(partialState, 'workers');
    if (hasWorkersUpdate && !Na__AppCore__HistoryIsApplying && Na__AppCore__StateValue && Na__AppCore__StateValue.workers) {
        Na__AppCore__HistoryPastWorkers.push(structuredClone(Na__AppCore__StateValue.workers));
        if (Na__AppCore__HistoryPastWorkers.length > Na__AppCore__HistoryMaxEntries) {
            Na__AppCore__HistoryPastWorkers.shift();
        }
        Na__AppCore__HistoryFutureWorkers = [];
    }

     Na__AppCore__StateValue = {
         ...Na__AppCore__StateValue,
         ...partialState
     };

     Na__AppCore__Listeners.forEach((listenerFunction) => {
         listenerFunction(Na__AppCore__StateValue);
     });
 }
 // ------------------------------------------------------------


 // FUNCTION | Set Workers Array
 // ------------------------------------------------------------
 export function Na__AppCore__SetWorkers(nextWorkers) {
     Na__AppCore__SetState({ workers: nextWorkers });
 }
 // ------------------------------------------------------------


// FUNCTION | Undo Last Workers Change
// ------------------------------------------------------------
export function Na__AppCore__UndoWorkersChange() {
    if (!Na__AppCore__StateValue || !Na__AppCore__StateValue.workers) return false;
    if (Na__AppCore__HistoryPastWorkers.length === 0) return false;

    const previousWorkers = Na__AppCore__HistoryPastWorkers.pop();
    Na__AppCore__HistoryFutureWorkers.push(structuredClone(Na__AppCore__StateValue.workers));

    Na__AppCore__HistoryIsApplying = true;
    Na__AppCore__StateValue = {
        ...Na__AppCore__StateValue,
        workers: structuredClone(previousWorkers),
        selectedShiftId: null,
        draftShift: null,
        pendingDrag: null,
        dragOffsetMins: 0
    };
    Na__AppCore__HistoryIsApplying = false;

    Na__AppCore__Listeners.forEach((listenerFunction) => {
        listenerFunction(Na__AppCore__StateValue);
    });

    return true;
}
// ------------------------------------------------------------


// FUNCTION | Redo Last Undone Workers Change
// ------------------------------------------------------------
export function Na__AppCore__RedoWorkersChange() {
    if (!Na__AppCore__StateValue || !Na__AppCore__StateValue.workers) return false;
    if (Na__AppCore__HistoryFutureWorkers.length === 0) return false;

    const nextWorkers = Na__AppCore__HistoryFutureWorkers.pop();
    Na__AppCore__HistoryPastWorkers.push(structuredClone(Na__AppCore__StateValue.workers));

    Na__AppCore__HistoryIsApplying = true;
    Na__AppCore__StateValue = {
        ...Na__AppCore__StateValue,
        workers: structuredClone(nextWorkers),
        selectedShiftId: null,
        draftShift: null,
        pendingDrag: null,
        dragOffsetMins: 0
    };
    Na__AppCore__HistoryIsApplying = false;

    Na__AppCore__Listeners.forEach((listenerFunction) => {
        listenerFunction(Na__AppCore__StateValue);
    });

    return true;
}
// ------------------------------------------------------------

// endregion ----------------------------------------------------
