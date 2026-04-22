/* =============================================================================
 WHITECARDVISION - CONFIG LOADER
=============================================================================
 FILE       : WhitecardVision__AppCore__ConfigLoader__.js
 NAMESPACE  : Wv
 MODULE     : AppCore - ConfigLoader
 PURPOSE    : Fetch the main AppConfig JSON + each per-System config JSON
              and publish them to the StateManager before any System module
              initialises. ZERO hardcoded API values.
============================================================================= */

// =============================================================================
// REGION | Config Loader Module
// =============================================================================

(function () {
    'use strict';

    const WV__CONFIG__MAIN_PATH = '02__Src__AppModules/02__AppData/WhitecardVision__AppData__Config__Main__.json';


    // FUNCTION | Fetch a JSON file relative to the app root
    // ------------------------------------------------------------
    async function Wv__ConfigLoader__FetchJson(relativePath) {
        const response = await fetch(relativePath + '?_t=' + Date.now());
        if (!response.ok) { throw new Error('Failed to load ' + relativePath + ': HTTP ' + response.status); }
        return await response.json();
    }
    // ------------------------------------------------------------


    // FUNCTION | Load AppConfig + every system config referenced within it
    // ------------------------------------------------------------
    async function Wv__ConfigLoader__LoadAllConfigs() {
        const appConfigObject = await Wv__ConfigLoader__FetchJson(WV__CONFIG__MAIN_PATH);
        window.Wv__AppCore__StateManager.Wv__StateManager__SetAppConfig(appConfigObject);

        const registeredModeList = (appConfigObject.Wv__AppConfig__Modes || {}).Wv__AppConfig__Modes__Registered || [];
        for (const modeDescriptor of registeredModeList) {
            if (!modeDescriptor.configRelPath) continue;
            try {
                const systemConfigObject = await Wv__ConfigLoader__FetchJson(modeDescriptor.configRelPath);
                window.Wv__AppCore__StateManager.Wv__StateManager__SetSystemConfig(modeDescriptor.modeId, systemConfigObject);
            } catch (systemConfigError) {
                console.warn('[ConfigLoader] Skipping system config for', modeDescriptor.modeId, systemConfigError.message);
            }
        }

        return appConfigObject;
    }
    // ------------------------------------------------------------


    // FUNCTION | Poll /api/system/health and push into state
    // ------------------------------------------------------------
    async function Wv__ConfigLoader__RefreshServerHealth() {
        try {
            const appConfigObject = window.Wv__AppCore__StateManager.Wv__StateManager__GetAppConfig();
            const healthEndpoint  = (appConfigObject.Wv__AppConfig__Server || {}).Wv__AppConfig__Server__HealthEndpoint || '/api/system/health';
            const healthResponse  = await fetch(healthEndpoint + '?_t=' + Date.now());
            const healthPayload   = await healthResponse.json();
            if (healthPayload && healthPayload.ok) {
                window.Wv__AppCore__StateManager.Wv__StateManager__SetServerHealth(healthPayload.data);
                return healthPayload.data;
            }
        } catch (healthError) {
            console.warn('[ConfigLoader] health check failed:', healthError.message);
        }
        window.Wv__AppCore__StateManager.Wv__StateManager__SetServerHealth(null);
        return null;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    window.Wv__AppCore__ConfigLoader = {
        Wv__ConfigLoader__LoadAllConfigs,
        Wv__ConfigLoader__RefreshServerHealth
    };
    // ------------------------------------------------------------

})();

// endregion ===================================================================
