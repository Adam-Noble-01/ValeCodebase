/* =============================================================================
   VALESPEC - APP NOTIFICATIONS | SERVER CONNECTION MONITOR
   =============================================================================

   FILE       : ValeSpec__AppNotifications__ServerConnectionMonitor__.js
   NAMESPACE  : ValeSpec
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
    var ValeSpec__ServerConnection__DefaultHealthPath            = 'api/system/health';  // <-- Flask health route
    var ValeSpec__ServerConnection__DefaultClickHealthCooldownMs = 20000;                // <-- Cooldown between click-sourced probes in milliseconds
    var ValeSpec__ServerConnection__StatusUnknown                = 'unknown';            // <-- Initial state before first check
    var ValeSpec__ServerConnection__StatusStable                 = 'stable';             // <-- Server responding normally
    var ValeSpec__ServerConnection__StatusLost                   = 'lost';               // <-- Server unreachable after being stable
    // ------------------------------------------------------------


    // MODULE VARIABLES | Runtime Monitor State
    // ------------------------------------------------------------
    var ValeSpec__ServerConnection__HealthPath               = ValeSpec__ServerConnection__DefaultHealthPath;
    var ValeSpec__ServerConnection__ClickHealthCooldownMs    = ValeSpec__ServerConnection__DefaultClickHealthCooldownMs;
    var ValeSpec__ServerConnection__LastClickHealthProbeAtMs = 0;
    var ValeSpec__ServerConnection__IsHealthCheckInFlight    = false;
    var ValeSpec__ServerConnection__IsInitialized            = false;
    var ValeSpec__ServerConnection__Subscribers              = new Set();
    var ValeSpec__ServerConnection__StatusState = {
        status             : ValeSpec__ServerConnection__StatusUnknown,
        hasEverBeenStable  : false,
        failureStreak      : 0,
        lastSuccessIso     : '',
        lastFailureIso     : '',
        lastSignalSource   : ''
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Check If Running On Localhost
    // ------------------------------------------------------------
    function ValeSpec__ServerConnection__IsRunningOnLocalhost() {
        var hostnameValue = window.location.hostname;
        var portValue     = window.location.port;
        return hostnameValue === 'localhost'
            || hostnameValue === '127.0.0.1'
            || portValue === '8000'
            || portValue === '8001'
            || portValue === '8002'                                     // <-- ValeSpec localhost port
            || portValue === '8081';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Run Click-Sourced Health Probe With Cooldown
    // ------------------------------------------------------------
    function ValeSpec__ServerConnection__RunClickHealthProbeWithCooldown() {
        var nowTimestampMs            = Date.now();
        var elapsedSinceLastProbeMs   = nowTimestampMs - ValeSpec__ServerConnection__LastClickHealthProbeAtMs;
        if (elapsedSinceLastProbeMs < ValeSpec__ServerConnection__ClickHealthCooldownMs) {
            return;
        }

        ValeSpec__ServerConnection__LastClickHealthProbeAtMs = nowTimestampMs;
        ValeSpec__ServerConnection__RunHealthCheckAsync('ui-click');
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Execute Health Ping Against Local API
    // ------------------------------------------------------------
    function ValeSpec__ServerConnection__RunHealthCheckAsync(signalSource) {
        if (!ValeSpec__ServerConnection__IsRunningOnLocalhost()) return;
        if (ValeSpec__ServerConnection__IsHealthCheckInFlight) return;

        ValeSpec__ServerConnection__IsHealthCheckInFlight = true;

        var cacheBypassJoinChar = ValeSpec__ServerConnection__HealthPath.includes('?') ? '&' : '?';
        var healthRequestUrl    = ValeSpec__ServerConnection__HealthPath + cacheBypassJoinChar + 'vsHeartbeatTs=' + Date.now();

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
                ValeSpec__ServerConnection__ReportApiFailure(signalSource);
                return;
            }
            return responseValue.json().then(function(bodyValue) {
                if (!bodyValue || !bodyValue.ok) {
                    ValeSpec__ServerConnection__ReportApiFailure(signalSource);
                    return;
                }
                ValeSpec__ServerConnection__ReportApiSuccess(signalSource);
            });
        })
        .catch(function() {
            ValeSpec__ServerConnection__ReportApiFailure(signalSource);
        })
        .finally(function() {
            ValeSpec__ServerConnection__IsHealthCheckInFlight = false;
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Publish Updated Status To Subscribers
    // ------------------------------------------------------------
    function ValeSpec__ServerConnection__EmitStatusChange() {
        var snapshotValue = ValeSpec__ServerConnection__GetStatusSnapshot();
        ValeSpec__ServerConnection__Subscribers.forEach(function(subscriberCallback) {
            try {
                subscriberCallback(snapshotValue);
            } catch (errorValue) {
                console.warn('[ValeSpec__ServerConnection] Subscriber error:', errorValue);
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize Connection Monitor and Event Probes
    // ------------------------------------------------------------
    function ValeSpec__ServerConnection__InitializeMonitor(config) {
        if (ValeSpec__ServerConnection__IsInitialized) return;
        ValeSpec__ServerConnection__IsInitialized = true;

        config = config || {};

        if (typeof config.healthPath === 'string' && config.healthPath.trim()) {
            ValeSpec__ServerConnection__HealthPath = config.healthPath.trim();
        }
        if (isFinite(config.clickHealthCooldownMs) && config.clickHealthCooldownMs >= 2000) {
            ValeSpec__ServerConnection__ClickHealthCooldownMs = Number(config.clickHealthCooldownMs);
        } else if (isFinite(config.healthIntervalMs) && config.healthIntervalMs >= 2000) {
            ValeSpec__ServerConnection__ClickHealthCooldownMs = Number(config.healthIntervalMs);
        }

        if (!ValeSpec__ServerConnection__IsRunningOnLocalhost()) return;

        window.addEventListener('online', function() {
            ValeSpec__ServerConnection__RunHealthCheckAsync('browser-online');
        });

        window.addEventListener('offline', function() {
            ValeSpec__ServerConnection__ReportApiFailure('browser-offline');
        });

        window.addEventListener('click', function() {
            ValeSpec__ServerConnection__RunClickHealthProbeWithCooldown();
        });

        ValeSpec__ServerConnection__RunHealthCheckAsync('initial-health');
    }
    // ------------------------------------------------------------


    // FUNCTION | Subscribe To Connection Status Changes
    // ------------------------------------------------------------
    function ValeSpec__ServerConnection__SubscribeStatusChange(onStatusChange) {
        if (typeof onStatusChange !== 'function') return function() {};

        ValeSpec__ServerConnection__Subscribers.add(onStatusChange);
        onStatusChange(ValeSpec__ServerConnection__GetStatusSnapshot());               // <-- Fire immediately with current state

        return function() {
            ValeSpec__ServerConnection__Subscribers.delete(onStatusChange);
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Current Connection Status Snapshot
    // ------------------------------------------------------------
    function ValeSpec__ServerConnection__GetStatusSnapshot() {
        return {
            status            : ValeSpec__ServerConnection__StatusState.status,
            hasEverBeenStable : ValeSpec__ServerConnection__StatusState.hasEverBeenStable,
            failureStreak     : ValeSpec__ServerConnection__StatusState.failureStreak,
            lastSuccessIso    : ValeSpec__ServerConnection__StatusState.lastSuccessIso,
            lastFailureIso    : ValeSpec__ServerConnection__StatusState.lastFailureIso,
            lastSignalSource  : ValeSpec__ServerConnection__StatusState.lastSignalSource
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Report API Success Signal To Monitor
    // ------------------------------------------------------------
    function ValeSpec__ServerConnection__ReportApiSuccess(signalSource) {
        signalSource = signalSource || 'api';

        var didStatusChange       = ValeSpec__ServerConnection__StatusState.status !== ValeSpec__ServerConnection__StatusStable;
        var didStabilityFlagChange = !ValeSpec__ServerConnection__StatusState.hasEverBeenStable;
        var didFailureStreakReset  = ValeSpec__ServerConnection__StatusState.failureStreak !== 0;

        ValeSpec__ServerConnection__StatusState.status            = ValeSpec__ServerConnection__StatusStable;
        ValeSpec__ServerConnection__StatusState.hasEverBeenStable = true;
        ValeSpec__ServerConnection__StatusState.failureStreak     = 0;
        ValeSpec__ServerConnection__StatusState.lastSuccessIso    = new Date().toISOString();
        ValeSpec__ServerConnection__StatusState.lastSignalSource  = signalSource;

        if (didStatusChange || didStabilityFlagChange || didFailureStreakReset) {
            ValeSpec__ServerConnection__EmitStatusChange();
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Report API Failure Signal To Monitor
    // ------------------------------------------------------------
    function ValeSpec__ServerConnection__ReportApiFailure(signalSource) {
        signalSource = signalSource || 'api';

        ValeSpec__ServerConnection__StatusState.failureStreak    += 1;
        ValeSpec__ServerConnection__StatusState.lastFailureIso    = new Date().toISOString();
        ValeSpec__ServerConnection__StatusState.lastSignalSource  = signalSource;

        if (!ValeSpec__ServerConnection__StatusState.hasEverBeenStable) {
            return;                                                                   // <-- Suppress lost state until server has been confirmed stable at least once
        }

        var didStatusChange = ValeSpec__ServerConnection__StatusState.status !== ValeSpec__ServerConnection__StatusLost;
        ValeSpec__ServerConnection__StatusState.status = ValeSpec__ServerConnection__StatusLost;

        if (didStatusChange) {
            ValeSpec__ServerConnection__EmitStatusChange();
        }
    }
    // ------------------------------------------------------------


    // MODULE EXPORT | Expose Public API On Window
    // ------------------------------------------------------------
    window.ValeSpec__AppNotifications__ServerConnectionMonitor = {
        ValeSpec__ServerConnection__InitializeMonitor    : ValeSpec__ServerConnection__InitializeMonitor,
        ValeSpec__ServerConnection__SubscribeStatusChange : ValeSpec__ServerConnection__SubscribeStatusChange,
        ValeSpec__ServerConnection__GetStatusSnapshot    : ValeSpec__ServerConnection__GetStatusSnapshot,
        ValeSpec__ServerConnection__ReportApiSuccess     : ValeSpec__ServerConnection__ReportApiSuccess,
        ValeSpec__ServerConnection__ReportApiFailure     : ValeSpec__ServerConnection__ReportApiFailure
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();
