// -----------------------------------------------------------------------------
// REGION | App State Store
// -----------------------------------------------------------------------------

 let Na__AppCore__StateValue = null;
 let Na__AppCore__Listeners = [];

 // FUNCTION | Initialize State Store
 // ------------------------------------------------------------
 export function Na__AppCore__InitializeStateStore(initialState) {
     Na__AppCore__StateValue = structuredClone(initialState);
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

// endregion ----------------------------------------------------
