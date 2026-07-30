/* =============================================================================
   VGHLANTERN - APP NOTIFICATIONS | SERVER CONNECTION STATUS BANNER
   =============================================================================

   FILE       : VghLantern__AppNotifications__ServerConnectionBanner__.js
   NAMESPACE  : VghLantern
   MODULE     : AppNotifications - ServerConnectionBanner
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Fixed top-centre banner that displays when the local Flask
                server connection is lost or restored
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Subscribes to the ServerConnectionMonitor status change events
   - Injects and manages a fixed top-centre DOM banner element
   - Shows a red warning when status transitions to 'lost'
   - Shows a green confirmation when status recovers to 'stable', then
     auto-hides the banner after 5 seconds
   - Depends on VghLantern__AppNotifications__ServerConnectionMonitor__.js
     being loaded first
   - Adapted from ValePlanner Na__System__ServerConnectionStatus__Banner.js

   =============================================================================

   DEVELOPMENT LOG:
   15-Apr-2026 - Version 1.0.0
   - Initial port from ValePlanner connection status banner

   ============================================================================= */

(function() {

// -----------------------------------------------------------------------------
// REGION | Server Connection Status Banner UI
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Banner State and References
    // ------------------------------------------------------------
    var VghLantern__ServerStatusBanner__IsInitialized         = false;
    var VghLantern__ServerStatusBanner__Element               = null;
    var VghLantern__ServerStatusBanner__Unsubscribe           = null;
    var VghLantern__ServerStatusBanner__LastStatus            = 'unknown';
    var VghLantern__ServerStatusBanner__ReconnectHideTimeoutId = null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clear Pending Reconnect Hide Timer
    // ------------------------------------------------------------
    function VghLantern__ServerStatusBanner__ClearReconnectTimer() {
        if (!VghLantern__ServerStatusBanner__ReconnectHideTimeoutId) return;
        window.clearTimeout(VghLantern__ServerStatusBanner__ReconnectHideTimeoutId);
        VghLantern__ServerStatusBanner__ReconnectHideTimeoutId = null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Monitor Snapshot To Banner Display
    // ------------------------------------------------------------
    function VghLantern__ServerStatusBanner__ApplyStatusSnapshot(statusSnapshot) {
        if (!VghLantern__ServerStatusBanner__Element) return;

        var currentStatus        = String((statusSnapshot && statusSnapshot.status) || 'unknown');
        var shouldShowLostWarning = statusSnapshot
            && statusSnapshot.status === 'lost'
            && statusSnapshot.hasEverBeenStable === true;

        if (shouldShowLostWarning) {
            VghLantern__ServerStatusBanner__ClearReconnectTimer();
            VghLantern__ServerStatusBanner__Element.textContent = 'Server connection lost - changes are not being saved to the project file.';
            VghLantern__ServerStatusBanner__Element.classList.remove('na-server-status-banner--reconnected');
            VghLantern__ServerStatusBanner__Element.classList.add('na-server-status-banner--visible');
            VghLantern__ServerStatusBanner__LastStatus = currentStatus;
            return;
        }

        var hasReconnected = VghLantern__ServerStatusBanner__LastStatus === 'lost' && currentStatus === 'stable';

        if (hasReconnected) {
            VghLantern__ServerStatusBanner__ClearReconnectTimer();
            VghLantern__ServerStatusBanner__Element.textContent = 'Server connection restored - changes are being saved again.';
            VghLantern__ServerStatusBanner__Element.classList.add('na-server-status-banner--visible', 'na-server-status-banner--reconnected');
            VghLantern__ServerStatusBanner__ReconnectHideTimeoutId = window.setTimeout(function() {
                if (!VghLantern__ServerStatusBanner__Element) return;
                VghLantern__ServerStatusBanner__Element.textContent = '';
                VghLantern__ServerStatusBanner__Element.classList.remove('na-server-status-banner--visible', 'na-server-status-banner--reconnected');
            }, 5000);                                                               // <-- Auto-hide restored message after 5 seconds
            VghLantern__ServerStatusBanner__LastStatus = currentStatus;
            return;
        }

        VghLantern__ServerStatusBanner__Element.textContent = '';
        VghLantern__ServerStatusBanner__Element.classList.remove('na-server-status-banner--visible', 'na-server-status-banner--reconnected');
        VghLantern__ServerStatusBanner__LastStatus = currentStatus;
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Top-Centre Server Status Banner
    // ------------------------------------------------------------
    function VghLantern__ServerStatusBanner__Initialize() {
        if (VghLantern__ServerStatusBanner__IsInitialized) return;
        VghLantern__ServerStatusBanner__IsInitialized = true;

        var Monitor = window.VghLantern__AppNotifications__ServerConnectionMonitor;
        if (!Monitor) {
            console.warn('[VghLantern__ServerStatusBanner] Monitor module not found - banner disabled.');
            return;
        }

        VghLantern__ServerStatusBanner__Element = document.getElementById('vsServerStatusBanner');
        if (!VghLantern__ServerStatusBanner__Element) {
            VghLantern__ServerStatusBanner__Element = document.createElement('div');
            VghLantern__ServerStatusBanner__Element.id = 'vsServerStatusBanner';
            VghLantern__ServerStatusBanner__Element.className = 'na-server-status-banner';
            VghLantern__ServerStatusBanner__Element.setAttribute('role', 'status');
            VghLantern__ServerStatusBanner__Element.setAttribute('aria-live', 'polite');
            document.body.appendChild(VghLantern__ServerStatusBanner__Element);
        }

        VghLantern__ServerStatusBanner__Unsubscribe = Monitor.VghLantern__ServerConnection__SubscribeStatusChange(function(statusSnapshot) {
            VghLantern__ServerStatusBanner__ApplyStatusSnapshot(statusSnapshot);
        });
    }
    // ------------------------------------------------------------


    // MODULE EXPORT | Expose Public API On Window
    // ------------------------------------------------------------
    window.VghLantern__AppNotifications__ServerConnectionBanner = {
        VghLantern__ServerStatusBanner__Initialize : VghLantern__ServerStatusBanner__Initialize
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
