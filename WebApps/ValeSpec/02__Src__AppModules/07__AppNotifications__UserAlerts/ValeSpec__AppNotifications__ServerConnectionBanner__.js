/* =============================================================================
   VALESPEC - APP NOTIFICATIONS | SERVER CONNECTION STATUS BANNER
   =============================================================================

   FILE       : ValeSpec__AppNotifications__ServerConnectionBanner__.js
   NAMESPACE  : ValeSpec
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
   - Depends on ValeSpec__AppNotifications__ServerConnectionMonitor__.js
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
    var ValeSpec__ServerStatusBanner__IsInitialized         = false;
    var ValeSpec__ServerStatusBanner__Element               = null;
    var ValeSpec__ServerStatusBanner__Unsubscribe           = null;
    var ValeSpec__ServerStatusBanner__LastStatus            = 'unknown';
    var ValeSpec__ServerStatusBanner__ReconnectHideTimeoutId = null;
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clear Pending Reconnect Hide Timer
    // ------------------------------------------------------------
    function ValeSpec__ServerStatusBanner__ClearReconnectTimer() {
        if (!ValeSpec__ServerStatusBanner__ReconnectHideTimeoutId) return;
        window.clearTimeout(ValeSpec__ServerStatusBanner__ReconnectHideTimeoutId);
        ValeSpec__ServerStatusBanner__ReconnectHideTimeoutId = null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Apply Monitor Snapshot To Banner Display
    // ------------------------------------------------------------
    function ValeSpec__ServerStatusBanner__ApplyStatusSnapshot(statusSnapshot) {
        if (!ValeSpec__ServerStatusBanner__Element) return;

        var currentStatus        = String((statusSnapshot && statusSnapshot.status) || 'unknown');
        var shouldShowLostWarning = statusSnapshot
            && statusSnapshot.status === 'lost'
            && statusSnapshot.hasEverBeenStable === true;

        if (shouldShowLostWarning) {
            ValeSpec__ServerStatusBanner__ClearReconnectTimer();
            ValeSpec__ServerStatusBanner__Element.textContent = 'Server connection lost - changes are not being saved to the project file.';
            ValeSpec__ServerStatusBanner__Element.classList.remove('na-server-status-banner--reconnected');
            ValeSpec__ServerStatusBanner__Element.classList.add('na-server-status-banner--visible');
            ValeSpec__ServerStatusBanner__LastStatus = currentStatus;
            return;
        }

        var hasReconnected = ValeSpec__ServerStatusBanner__LastStatus === 'lost' && currentStatus === 'stable';

        if (hasReconnected) {
            ValeSpec__ServerStatusBanner__ClearReconnectTimer();
            ValeSpec__ServerStatusBanner__Element.textContent = 'Server connection restored - changes are being saved again.';
            ValeSpec__ServerStatusBanner__Element.classList.add('na-server-status-banner--visible', 'na-server-status-banner--reconnected');
            ValeSpec__ServerStatusBanner__ReconnectHideTimeoutId = window.setTimeout(function() {
                if (!ValeSpec__ServerStatusBanner__Element) return;
                ValeSpec__ServerStatusBanner__Element.textContent = '';
                ValeSpec__ServerStatusBanner__Element.classList.remove('na-server-status-banner--visible', 'na-server-status-banner--reconnected');
            }, 5000);                                                               // <-- Auto-hide restored message after 5 seconds
            ValeSpec__ServerStatusBanner__LastStatus = currentStatus;
            return;
        }

        ValeSpec__ServerStatusBanner__Element.textContent = '';
        ValeSpec__ServerStatusBanner__Element.classList.remove('na-server-status-banner--visible', 'na-server-status-banner--reconnected');
        ValeSpec__ServerStatusBanner__LastStatus = currentStatus;
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Top-Centre Server Status Banner
    // ------------------------------------------------------------
    function ValeSpec__ServerStatusBanner__Initialize() {
        if (ValeSpec__ServerStatusBanner__IsInitialized) return;
        ValeSpec__ServerStatusBanner__IsInitialized = true;

        var Monitor = window.ValeSpec__AppNotifications__ServerConnectionMonitor;
        if (!Monitor) {
            console.warn('[ValeSpec__ServerStatusBanner] Monitor module not found - banner disabled.');
            return;
        }

        ValeSpec__ServerStatusBanner__Element = document.getElementById('vsServerStatusBanner');
        if (!ValeSpec__ServerStatusBanner__Element) {
            ValeSpec__ServerStatusBanner__Element = document.createElement('div');
            ValeSpec__ServerStatusBanner__Element.id = 'vsServerStatusBanner';
            ValeSpec__ServerStatusBanner__Element.className = 'na-server-status-banner';
            ValeSpec__ServerStatusBanner__Element.setAttribute('role', 'status');
            ValeSpec__ServerStatusBanner__Element.setAttribute('aria-live', 'polite');
            document.body.appendChild(ValeSpec__ServerStatusBanner__Element);
        }

        ValeSpec__ServerStatusBanner__Unsubscribe = Monitor.ValeSpec__ServerConnection__SubscribeStatusChange(function(statusSnapshot) {
            ValeSpec__ServerStatusBanner__ApplyStatusSnapshot(statusSnapshot);
        });
    }
    // ------------------------------------------------------------


    // MODULE EXPORT | Expose Public API On Window
    // ------------------------------------------------------------
    window.ValeSpec__AppNotifications__ServerConnectionBanner = {
        ValeSpec__ServerStatusBanner__Initialize : ValeSpec__ServerStatusBanner__Initialize
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
