import { Na__ServerConnection__SubscribeStatusChange } from './Na__System__ServerConnectionStatus__Monitor.js';

// -----------------------------------------------------------------------------
// REGION | Server Connection Status Banner UI
// -----------------------------------------------------------------------------

 // MODULE VARIABLES | Banner State and Subscriptions
 // ------------------------------------------------------------
 let Na__ServerStatusBanner__IsInitialized = false;
 let Na__ServerStatusBanner__Element = null;
 let Na__ServerStatusBanner__Unsubscribe = null;
 let Na__ServerStatusBanner__LastStatus = 'unknown';
 let Na__ServerStatusBanner__ReconnectHideTimeoutId = null;
 // ------------------------------------------------------------


 // FUNCTION | Initialize Top-Center Server Status Banner
 // ------------------------------------------------------------
 export function Na__ServerStatusBanner__Initialize() {
     if (Na__ServerStatusBanner__IsInitialized) return;
     Na__ServerStatusBanner__IsInitialized = true;

     Na__ServerStatusBanner__Element = document.getElementById('naServerStatusBanner');
     if (!Na__ServerStatusBanner__Element) {
         Na__ServerStatusBanner__Element = document.createElement('div');
         Na__ServerStatusBanner__Element.id = 'naServerStatusBanner';
         Na__ServerStatusBanner__Element.className = 'na-server-status-banner';
         Na__ServerStatusBanner__Element.setAttribute('role', 'status');
         Na__ServerStatusBanner__Element.setAttribute('aria-live', 'polite');
         document.body.appendChild(Na__ServerStatusBanner__Element);
     }

     Na__ServerStatusBanner__Unsubscribe = Na__ServerConnection__SubscribeStatusChange((statusSnapshot) => {
         Na__ServerStatusBanner__ApplyStatusSnapshot(statusSnapshot);
     });
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Apply Monitor Snapshot To Banner Display
 // ------------------------------------------------------------
 function Na__ServerStatusBanner__ApplyStatusSnapshot(statusSnapshot) {
     if (!Na__ServerStatusBanner__Element) return;

     const currentStatus = String(statusSnapshot?.status || 'unknown');
     const shouldShowLostWarning = statusSnapshot?.status === 'lost' && statusSnapshot?.hasEverBeenStable === true;
     if (shouldShowLostWarning) {
         Na__ServerStatusBanner__ClearReconnectTimer();
         Na__ServerStatusBanner__Element.textContent = 'Server connection lost - changes are not being saved to the data file.';
         Na__ServerStatusBanner__Element.classList.remove('na-server-status-banner--reconnected');
         Na__ServerStatusBanner__Element.classList.add('na-server-status-banner--visible');
         Na__ServerStatusBanner__LastStatus = currentStatus;
         return;
     }

     const hasReconnected = Na__ServerStatusBanner__LastStatus === 'lost' && currentStatus === 'stable';
     if (hasReconnected) {
         Na__ServerStatusBanner__ClearReconnectTimer();
         Na__ServerStatusBanner__Element.textContent = 'Server connection restored - changes are being saved again.';
         Na__ServerStatusBanner__Element.classList.add('na-server-status-banner--visible', 'na-server-status-banner--reconnected');
         Na__ServerStatusBanner__ReconnectHideTimeoutId = window.setTimeout(() => {
             if (!Na__ServerStatusBanner__Element) return;
             Na__ServerStatusBanner__Element.textContent = '';
             Na__ServerStatusBanner__Element.classList.remove('na-server-status-banner--visible', 'na-server-status-banner--reconnected');
         }, 5000);
         Na__ServerStatusBanner__LastStatus = currentStatus;
         return;
     }

     Na__ServerStatusBanner__Element.textContent = '';
     Na__ServerStatusBanner__Element.classList.remove('na-server-status-banner--visible', 'na-server-status-banner--reconnected');
     Na__ServerStatusBanner__LastStatus = currentStatus;
 }
 // ------------------------------------------------------------


 // HELPER FUNCTION | Clear Pending Reconnect Hide Timer
 // ------------------------------------------------------------
 function Na__ServerStatusBanner__ClearReconnectTimer() {
     if (!Na__ServerStatusBanner__ReconnectHideTimeoutId) return;
     window.clearTimeout(Na__ServerStatusBanner__ReconnectHideTimeoutId);
     Na__ServerStatusBanner__ReconnectHideTimeoutId = null;
 }
 // ------------------------------------------------------------

// endregion ----------------------------------------------------
