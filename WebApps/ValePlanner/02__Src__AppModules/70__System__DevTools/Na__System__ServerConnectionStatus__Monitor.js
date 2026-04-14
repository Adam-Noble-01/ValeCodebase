import { Na__System__IsRunningOnLocalhost } from './Na__System__DevTools__LocalhostGuard.js';

// -----------------------------------------------------------------------------
// REGION | Server Connection Status Monitor
// -----------------------------------------------------------------------------

 // MODULE CONSTANTS | Health Route and Status Tokens
 // ------------------------------------------------------------
 const Na__ServerConnection__DefaultHealthPath = 'api/system/health';
 const Na__ServerConnection__DefaultHealthIntervalMs = 6000;
 const Na__ServerConnection__StatusUnknown = 'unknown';
 const Na__ServerConnection__StatusStable = 'stable';
 const Na__ServerConnection__StatusLost = 'lost';
 // ------------------------------------------------------------


 // MODULE VARIABLES | Runtime Monitor State
 // ------------------------------------------------------------
 let Na__ServerConnection__HealthPath = Na__ServerConnection__DefaultHealthPath;
 let Na__ServerConnection__HealthIntervalMs = Na__ServerConnection__DefaultHealthIntervalMs;
 let Na__ServerConnection__HealthIntervalId = null;
 let Na__ServerConnection__IsInitialized = false;
 const Na__ServerConnection__Subscribers = new Set();
 const Na__ServerConnection__StatusState = {
     status: Na__ServerConnection__StatusUnknown,
     hasEverBeenStable: false,
     failureStreak: 0,
     lastSuccessIso: '',
     lastFailureIso: '',
     lastSignalSource: ''
 };
 // ------------------------------------------------------------


 // FUNCTION | Initialize Connection Monitor and Heartbeat Loop
 // ------------------------------------------------------------
 export function Na__ServerConnection__InitializeMonitor(config = {}) {
     if (Na__ServerConnection__IsInitialized) return;
     Na__ServerConnection__IsInitialized = true;

     if (typeof config.healthPath === 'string' && config.healthPath.trim()) {
         Na__ServerConnection__HealthPath = config.healthPath.trim();
     }
     if (Number.isFinite(config.healthIntervalMs) && config.healthIntervalMs >= 2000) {
         Na__ServerConnection__HealthIntervalMs = Number(config.healthIntervalMs);
     }

     if (!Na__System__IsRunningOnLocalhost()) return;

     window.addEventListener('online', () => {
         void Na__ServerConnection__RunHealthCheckAsync('browser-online');
     });

     window.addEventListener('offline', () => {
         Na__ServerConnection__ReportApiFailure('browser-offline');
     });

     void Na__ServerConnection__RunHealthCheckAsync('initial-health');

     Na__ServerConnection__HealthIntervalId = window.setInterval(() => {
         void Na__ServerConnection__RunHealthCheckAsync('heartbeat');
     }, Na__ServerConnection__HealthIntervalMs);
 }
 // ------------------------------------------------------------


 // FUNCTION | Subscribe To Connection Status Changes
 // ------------------------------------------------------------
 export function Na__ServerConnection__SubscribeStatusChange(onStatusChange) {
     if (typeof onStatusChange !== 'function') {
         return () => {};
     }

     Na__ServerConnection__Subscribers.add(onStatusChange);
     onStatusChange(Na__ServerConnection__GetStatusSnapshot());

     return () => {
         Na__ServerConnection__Subscribers.delete(onStatusChange);
     };
 }
 // ------------------------------------------------------------


 // FUNCTION | Get Current Connection Status Snapshot
 // ------------------------------------------------------------
 export function Na__ServerConnection__GetStatusSnapshot() {
     return {
         status: Na__ServerConnection__StatusState.status,
         hasEverBeenStable: Na__ServerConnection__StatusState.hasEverBeenStable,
         failureStreak: Na__ServerConnection__StatusState.failureStreak,
         lastSuccessIso: Na__ServerConnection__StatusState.lastSuccessIso,
         lastFailureIso: Na__ServerConnection__StatusState.lastFailureIso,
         lastSignalSource: Na__ServerConnection__StatusState.lastSignalSource
     };
 }
 // ------------------------------------------------------------


 // FUNCTION | Report API Success Signal To Monitor
 // ------------------------------------------------------------
 export function Na__ServerConnection__ReportApiSuccess(signalSource = 'api') {
     const didStatusChange = Na__ServerConnection__StatusState.status !== Na__ServerConnection__StatusStable;
     const didStabilityFlagChange = !Na__ServerConnection__StatusState.hasEverBeenStable;
     const didFailureStreakReset = Na__ServerConnection__StatusState.failureStreak !== 0;

     Na__ServerConnection__StatusState.status = Na__ServerConnection__StatusStable;
     Na__ServerConnection__StatusState.hasEverBeenStable = true;
     Na__ServerConnection__StatusState.failureStreak = 0;
     Na__ServerConnection__StatusState.lastSuccessIso = new Date().toISOString();
     Na__ServerConnection__StatusState.lastSignalSource = signalSource;

     if (didStatusChange || didStabilityFlagChange || didFailureStreakReset) {
         Na__ServerConnection__EmitStatusChange();
     }
 }
 // ------------------------------------------------------------


 // FUNCTION | Report API Failure Signal To Monitor
 // ------------------------------------------------------------
 export function Na__ServerConnection__ReportApiFailure(signalSource = 'api') {
     Na__ServerConnection__StatusState.failureStreak += 1;
     Na__ServerConnection__StatusState.lastFailureIso = new Date().toISOString();
     Na__ServerConnection__StatusState.lastSignalSource = signalSource;

     if (!Na__ServerConnection__StatusState.hasEverBeenStable) {
         return;
     }

     const didStatusChange = Na__ServerConnection__StatusState.status !== Na__ServerConnection__StatusLost;
     Na__ServerConnection__StatusState.status = Na__ServerConnection__StatusLost;

     if (didStatusChange) {
         Na__ServerConnection__EmitStatusChange();
     }
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Execute Health Ping Against Local API
 // ------------------------------------------------------------
 async function Na__ServerConnection__RunHealthCheckAsync(signalSource) {
     if (!Na__System__IsRunningOnLocalhost()) return;

     try {
        const cacheBypassJoinChar = Na__ServerConnection__HealthPath.includes('?') ? '&' : '?';
        const healthRequestUrl = `${Na__ServerConnection__HealthPath}${cacheBypassJoinChar}naHeartbeatTs=${Date.now()}`;
        const responseValue = await fetch(healthRequestUrl, {
             method: 'GET',
            headers: {
                Accept: 'application/json',
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache'
            },
             cache: 'no-store'
         });

         if (!responseValue.ok) {
             Na__ServerConnection__ReportApiFailure(signalSource);
             return;
         }

         const bodyValue = await responseValue.json();
         if (!bodyValue?.ok) {
             Na__ServerConnection__ReportApiFailure(signalSource);
             return;
         }

         Na__ServerConnection__ReportApiSuccess(signalSource);
     } catch (errorValue) {
         Na__ServerConnection__ReportApiFailure(signalSource);
     }
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Publish Updated Status To Subscribers
 // ------------------------------------------------------------
 function Na__ServerConnection__EmitStatusChange() {
     const snapshotValue = Na__ServerConnection__GetStatusSnapshot();
     Na__ServerConnection__Subscribers.forEach((subscriberCallback) => {
         try {
             subscriberCallback(snapshotValue);
         } catch (errorValue) {
             console.warn('ValePlanner server status subscriber failed:', errorValue);
         }
     });
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
