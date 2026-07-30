/* =============================================================================
   VGHLANTERN - APP NOTIFICATIONS | SERVER CONNECTION MONITOR
   =============================================================================

   FILE       : VghLantern__AppNotifications__ServerConnectionMonitor__.js
   NAMESPACE  : VghLantern
   MODULE     : AppNotifications - ServerConnectionMonitor
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Polls the local Flask server health endpoint and publishes
                connection status changes to subscribers
   CREATED    : 15-Apr-2026

   DESCRIPTION:
   - Probes api/system/health on initial load, browser-online events, and UI clicks (20s cooldown)
   - Maintains a state machine: unknown → stable → lost
   - Suppresses 'lost' state until server has been confirmed stable at least once
   - Exposes a subscriber pattern so UI modules can react to status changes
   - Also responds to browser online/offline events
   - Adapted from ValePlanner Na__System__ServerConnectionStatus__Monitor.js

   =============================================================================

   DEVELOPMENT LOG:
   16-Apr-2026 - Version 1.1.0
   - Replaced periodic setInterval heartbeat (6s) with click-based probing (20s cooldown)
   - Added IsHealthCheckInFlight guard to prevent overlapping health requests
   - Updated ReportApiFailure to suppress lost state until first stable confirmation

   15-Apr-2026 - Version 1.0.0
   - Initial port from ValePlanner connection monitor

   ============================================================================= */

(function() {

// -----------------------------------------------------------------------------
// REGION | Server Connection Status Monitor
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Health Route and Status Tokens
    // ------------------------------------------------------------
    var VghLantern__ServerConnection__DefaultHealthPath            = 'api/system/health';  // <-- Flask health route
    var VghLantern__ServerConnection__DefaultClickHealthCooldownMs = 20000;                // <-- Cooldown between click-sourced probes in milliseconds
    var VghLantern__ServerConnection__StatusUnknown                = 'unknown';            // <-- Initial state before first check
    var VghLantern__ServerConnection__StatusStable                 = 'stable';             // <-- Server responding normally
    var VghLantern__ServerConnection__StatusLost                   = 'lost';               // <-- Server unreachable after being stable
    // ------------------------------------------------------------


    // MODULE VARIABLES | Runtime Monitor State
    // ------------------------------------------------------------
    var VghLantern__ServerConnection__HealthPath               = VghLantern__ServerConnection__DefaultHealthPath;
    var VghLantern__ServerConnection__ClickHealthCooldownMs    = VghLantern__ServerConnection__DefaultClickHealthCooldownMs;
    var VghLantern__ServerConnection__LastClickHealthProbeAtMs = 0;
    var VghLantern__ServerConnection__IsHealthCheckInFlight    = false;
    var VghLantern__ServerConnection__IsInitialized            = false;
    var VghLantern__ServerConnection__Subscribers              = new Set();
    var VghLantern__ServerConnection__StatusState = {
        status             : VghLantern__ServerConnection__StatusUnknown,
        hasEverBeenStable  : false,
        failureStreak      : 0,
        lastSuccessIso     : '',
        lastFailureIso     : '',
        lastSignalSource   : ''
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Check If Running On Localhost
    // ------------------------------------------------------------
    function VghLantern__ServerConnection__IsRunningOnLocalhost() {
        var hostnameValue = window.location.hostname;
        var portValue     = window.location.port;
        return hostnameValue === 'localhost'
            || hostnameValue === '127.0.0.1'
            || portValue === '8000'
            || portValue === '8001'
            || portValue === '8006'                                     // <-- VghLantern localhost port
            || portValue === '8081';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Run Click-Sourced Health Probe With Cooldown
    // ------------------------------------------------------------
    function VghLantern__ServerConnection__RunClickHealthProbeWithCooldown() {
        var nowTimestampMs            = Date.now();
        var elapsedSinceLastProbeMs   = nowTimestampMs - VghLantern__ServerConnection__LastClickHealthProbeAtMs;
        if (elapsedSinceLastProbeMs < VghLantern__ServerConnection__ClickHealthCooldownMs) {
            return;
        }

        VghLantern__ServerConnection__LastClickHealthProbeAtMs = nowTimestampMs;
        VghLantern__ServerConnection__RunHealthCheckAsync('ui-click');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Execute Health Ping Against Local API
    // ------------------------------------------------------------
    function VghLantern__ServerConnection__RunHealthCheckAsync(signalSource) {
        if (!VghLantern__ServerConnection__IsRunningOnLocalhost()) return;
        if (VghLantern__ServerConnection__IsHealthCheckInFlight) return;

        VghLantern__ServerConnection__IsHealthCheckInFlight = true;

        var cacheBypassJoinChar = VghLantern__ServerConnection__HealthPath.includes('?') ? '&' : '?';
        var healthRequestUrl    = VghLantern__ServerConnection__HealthPath + cacheBypassJoinChar + 'vsHeartbeatTs=' + Date.now();

        fetch(healthRequestUrl, {
            method  : 'GET',
            headers : {
                'Accept'          : 'application/json',
                'Cache-Control'   : 'no-cache',
                'Pragma'          : 'no-cache'
            },
            cache   : 'no-store'
        })
        .then(function(responseValue) {
            if (!responseValue.ok) {
                VghLantern__ServerConnection__ReportApiFailure(signalSource);
                return;
            }
            return responseValue.json().then(function(bodyValue) {
                if (!bodyValue || !bodyValue.ok) {
                    VghLantern__ServerConnection__ReportApiFailure(signalSource);
                    return;
                }
                VghLantern__ServerConnection__ReportApiSuccess(signalSource);
            });
        })
        .catch(function() {
            VghLantern__ServerConnection__ReportApiFailure(signalSource);
        })
        .finally(function() {
            VghLantern__ServerConnection__IsHealthCheckInFlight = false;
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Publish Updated Status To Subscribers
    // ------------------------------------------------------------
    function VghLantern__ServerConnection__EmitStatusChange() {
        var snapshotValue = VghLantern__ServerConnection__GetStatusSnapshot();
        VghLantern__ServerConnection__Subscribers.forEach(function(subscriberCallback) {
            try {
                subscriberCallback(snapshotValue);
            } catch (errorValue) {
                console.warn('[VghLantern__ServerConnection] Subscriber error:', errorValue);
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Connection Monitor and Event Probes
    // ------------------------------------------------------------
    function VghLantern__ServerConnection__InitializeMonitor(config) {
        if (VghLantern__ServerConnection__IsInitialized) return;
        VghLantern__ServerConnection__IsInitialized = true;

        config = config || {};

        if (typeof config.healthPath === 'string' && config.healthPath.trim()) {
            VghLantern__ServerConnection__HealthPath = config.healthPath.trim();
        }
        if (isFinite(config.clickHealthCooldownMs) && config.clickHealthCooldownMs >= 2000) {
            VghLantern__ServerConnection__ClickHealthCooldownMs = Number(config.clickHealthCooldownMs);
        } else if (isFinite(config.healthIntervalMs) && config.healthIntervalMs >= 2000) {
            VghLantern__ServerConnection__ClickHealthCooldownMs = Number(config.healthIntervalMs);
        }

        if (!VghLantern__ServerConnection__IsRunningOnLocalhost()) return;

        window.addEventListener('online', function() {
            VghLantern__ServerConnection__RunHealthCheckAsync('browser-online');
        });

        window.addEventListener('offline', function() {
            VghLantern__ServerConnection__ReportApiFailure('browser-offline');
        });

        window.addEventListener('click', function() {
            VghLantern__ServerConnection__RunClickHealthProbeWithCooldown();
        });

        VghLantern__ServerConnection__RunHealthCheckAsync('initial-health');
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe To Connection Status Changes
    // ------------------------------------------------------------
    function VghLantern__ServerConnection__SubscribeStatusChange(onStatusChange) {
        if (typeof onStatusChange !== 'function') return function() {};

        VghLantern__ServerConnection__Subscribers.add(onStatusChange);
        onStatusChange(VghLantern__ServerConnection__GetStatusSnapshot());               // <-- Fire immediately with current state

        return function() {
            VghLantern__ServerConnection__Subscribers.delete(onStatusChange);
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Connection Status Snapshot
    // ------------------------------------------------------------
    function VghLantern__ServerConnection__GetStatusSnapshot() {
        return {
            status            : VghLantern__ServerConnection__StatusState.status,
            hasEverBeenStable : VghLantern__ServerConnection__StatusState.hasEverBeenStable,
            failureStreak     : VghLantern__ServerConnection__StatusState.failureStreak,
            lastSuccessIso    : VghLantern__ServerConnection__StatusState.lastSuccessIso,
            lastFailureIso    : VghLantern__ServerConnection__StatusState.lastFailureIso,
            lastSignalSource  : VghLantern__ServerConnection__StatusState.lastSignalSource
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Report API Success Signal To Monitor
    // ------------------------------------------------------------
    function VghLantern__ServerConnection__ReportApiSuccess(signalSource) {
        signalSource = signalSource || 'api';

        var didStatusChange       = VghLantern__ServerConnection__StatusState.status !== VghLantern__ServerConnection__StatusStable;
        var didStabilityFlagChange = !VghLantern__ServerConnection__StatusState.hasEverBeenStable;
        var didFailureStreakReset  = VghLantern__ServerConnection__StatusState.failureStreak !== 0;

        VghLantern__ServerConnection__StatusState.status            = VghLantern__ServerConnection__StatusStable;
        VghLantern__ServerConnection__StatusState.hasEverBeenStable = true;
        VghLantern__ServerConnection__StatusState.failureStreak     = 0;
        VghLantern__ServerConnection__StatusState.lastSuccessIso    = new Date().toISOString();
        VghLantern__ServerConnection__StatusState.lastSignalSource  = signalSource;

        if (didStatusChange || didStabilityFlagChange || didFailureStreakReset) {
            VghLantern__ServerConnection__EmitStatusChange();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Report API Failure Signal To Monitor
    // ------------------------------------------------------------
    function VghLantern__ServerConnection__ReportApiFailure(signalSource) {
        signalSource = signalSource || 'api';

        VghLantern__ServerConnection__StatusState.failureStreak    += 1;
        VghLantern__ServerConnection__StatusState.lastFailureIso    = new Date().toISOString();
        VghLantern__ServerConnection__StatusState.lastSignalSource  = signalSource;

        if (!VghLantern__ServerConnection__StatusState.hasEverBeenStable) {
            return;                                                                   // <-- Suppress lost state until server has been confirmed stable at least once
        }

        var didStatusChange = VghLantern__ServerConnection__StatusState.status !== VghLantern__ServerConnection__StatusLost;
        VghLantern__ServerConnection__StatusState.status = VghLantern__ServerConnection__StatusLost;

        if (didStatusChange) {
            VghLantern__ServerConnection__EmitStatusChange();
        }
    }
    // ------------------------------------------------------------


    // MODULE EXPORT | Expose Public API On Window
    // ------------------------------------------------------------
    window.VghLantern__AppNotifications__ServerConnectionMonitor = {
        VghLantern__ServerConnection__InitializeMonitor    : VghLantern__ServerConnection__InitializeMonitor,
        VghLantern__ServerConnection__SubscribeStatusChange : VghLantern__ServerConnection__SubscribeStatusChange,
        VghLantern__ServerConnection__GetStatusSnapshot    : VghLantern__ServerConnection__GetStatusSnapshot,
        VghLantern__ServerConnection__ReportApiSuccess     : VghLantern__ServerConnection__ReportApiSuccess,
        VghLantern__ServerConnection__ReportApiFailure     : VghLantern__ServerConnection__ReportApiFailure
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
