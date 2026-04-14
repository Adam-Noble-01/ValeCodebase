/* =============================================================================
   VALESPEC - CONFIG LOADER
   =============================================================================

   FILE       : ValeSpec__AppCore__ConfigLoader__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppCore - ConfigLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Fetch and parse the main application configuration JSON
   CREATED    : 2026

   DESCRIPTION:
   - Fetches ValeSpec__AppConfig__Main__.json via fetch()
   - Destructures sections into named config constants
   - Stores parsed config in StateManager
   - Matches ValeVision3D Na__AppConfig__Loader.js pattern

   ============================================================================= */

// =============================================================================
// REGION | Config Loader Module
// =============================================================================

const ValeSpec__AppCore__ConfigLoader = (function() {

    // MODULE CONSTANTS | Config File Path
    // ------------------------------------------------------------
    const CONFIG_PATH  =  '02__Src__AppModules/02__AppData/ValeSpec__AppConfig__Main__.json';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Parsed Config Sections
    // ------------------------------------------------------------
    let ValeSpec__Config__Application          =  null;
    let ValeSpec__Config__IronmongeryDefaults  =  null;
    let ValeSpec__Config__DoorTypeOptions      =  null;
    let ValeSpec__Config__LeverTypeOptions     =  null;
    let ValeSpec__Config__HingeProjection      =  null;
    let ValeSpec__Config__CabinHookOptions     =  null;
    let ValeSpec__Config__Validation           =  null;
    // ------------------------------------------------------------


    // FUNCTION | Load Configuration from JSON File
    // ------------------------------------------------------------
    async function loadConfig() {
        try {
            var response  =  await fetch(CONFIG_PATH);
            if (!response.ok) throw new Error('Config fetch failed: ' + response.status);

            var configData  =  await response.json();

            ValeSpec__Config__Application          =  configData['ValeSpec__Application__Config']             || {};
            ValeSpec__Config__IronmongeryDefaults   =  configData['ValeSpec__Ironmongery__GlobalDefaults__Config'] || {};
            ValeSpec__Config__DoorTypeOptions       =  configData['ValeSpec__DoorType__Options__Config']      || {};
            ValeSpec__Config__LeverTypeOptions      =  configData['ValeSpec__LeverType__Options__Config']     || {};
            ValeSpec__Config__HingeProjection       =  configData['ValeSpec__HingeProjection__Options__Config'] || {};
            ValeSpec__Config__CabinHookOptions      =  configData['ValeSpec__CabinHook__Options__Config']     || {};
            ValeSpec__Config__Validation            =  configData['ValeSpec__Validation__Config']             || {};

            if (window.ValeSpec__AppCore__StateManager) {
                window.ValeSpec__AppCore__StateManager.setAppConfig(configData);
            }

            console.log('[ValeSpec__ConfigLoader] Configuration loaded successfully. App v' +
                (ValeSpec__Config__Application['ValeSpec__Application__Config__AppVersion'] || '?.?.?'));

            return configData;

        } catch (e) {
            console.error('[ValeSpec__ConfigLoader] Failed to load configuration:', e);
            return null;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Specific Config Section
    // ------------------------------------------------------------
    function getSection(sectionName) {
        var sections  =  {
            'Application'          : ValeSpec__Config__Application,
            'IronmongeryDefaults'  : ValeSpec__Config__IronmongeryDefaults,
            'DoorTypeOptions'      : ValeSpec__Config__DoorTypeOptions,
            'LeverTypeOptions'     : ValeSpec__Config__LeverTypeOptions,
            'HingeProjection'      : ValeSpec__Config__HingeProjection,
            'CabinHookOptions'     : ValeSpec__Config__CabinHookOptions,
            'Validation'           : ValeSpec__Config__Validation
        };
        return sections[sectionName] || null;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        loadConfig  : loadConfig,
        getSection  : getSection
    };

})();

// endregion ===================================================================

window.ValeSpec__AppCore__ConfigLoader  =  ValeSpec__AppCore__ConfigLoader;
