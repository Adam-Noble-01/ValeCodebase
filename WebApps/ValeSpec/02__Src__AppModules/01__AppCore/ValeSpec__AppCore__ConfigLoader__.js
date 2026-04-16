/* =============================================================================
   VALESPEC - CONFIG LOADER
   =============================================================================

   FILE       : ValeSpec__AppCore__ConfigLoader__.js
   NAMESPACE  : ValeSpec
   MODULE     : AppCore - ConfigLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Fetch and parse the main application configuration JSON
   CREATED    : 15-Apr-2026

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
    const CONFIG_PATH              =  '02__Src__AppModules/02__AppData/ValeSpec__AppConfig__Main__.json';
    const DOC_PREVIEW_CONFIG_PATH  =  '02__Src__AppModules/40__System__DocumentPreviewMode/Na__DocPreview__Config.json';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Parsed Config Sections
    // ------------------------------------------------------------
    let ValeSpec__ConfigLoader__Application          =  null;
    let ValeSpec__ConfigLoader__IronmongeryDefaults  =  null;
    let ValeSpec__ConfigLoader__DoorTypeOptions      =  null;
    let ValeSpec__ConfigLoader__LeverTypeOptions     =  null;
    let ValeSpec__ConfigLoader__HingeProjection      =  null;
    let ValeSpec__ConfigLoader__CabinHookOptions     =  null;
    let ValeSpec__ConfigLoader__Validation           =  null;
    // ------------------------------------------------------------


    // FUNCTION | Load Configuration from JSON File
    // ------------------------------------------------------------
    async function ValeSpec__ConfigLoader__LoadConfig() {
        try {
            var responseMain  =  await fetch(CONFIG_PATH);
            if (!responseMain.ok) throw new Error('Config fetch failed: ' + responseMain.status);

            var configDataMain  =  await responseMain.json();
            var configDataDocPreview  =  {};

            try {
                var responseDocPreview  =  await fetch(DOC_PREVIEW_CONFIG_PATH);
                if (!responseDocPreview.ok) {
                    throw new Error('DocPreview config fetch failed: ' + responseDocPreview.status);
                }
                configDataDocPreview  =  await responseDocPreview.json();
            } catch (docPreviewError) {
                console.warn('[ValeSpec__ConfigLoader] DocPreview config unavailable, using app-config defaults only:', docPreviewError.message);
            }

            var configData  =  Object.assign({}, configDataMain, configDataDocPreview);

            ValeSpec__ConfigLoader__Application          =  configData['ValeSpec__Application__Config']                || {};
            ValeSpec__ConfigLoader__IronmongeryDefaults  =  configData['ValeSpec__Ironmongery__GlobalDefaults__Config'] || {};
            ValeSpec__ConfigLoader__DoorTypeOptions      =  configData['ValeSpec__DoorType__Options__Config']           || {};
            ValeSpec__ConfigLoader__LeverTypeOptions     =  configData['ValeSpec__LeverType__Options__Config']          || {};
            ValeSpec__ConfigLoader__HingeProjection      =  configData['ValeSpec__HingeProjection__Options__Config']    || {};
            ValeSpec__ConfigLoader__CabinHookOptions     =  configData['ValeSpec__CabinHook__Options__Config']          || {};
            ValeSpec__ConfigLoader__Validation           =  configData['ValeSpec__Validation__Config']                  || {};

            if (window.ValeSpec__AppCore__StateManager) {
                window.ValeSpec__AppCore__StateManager.ValeSpec__StateManager__SetAppConfig(configData);
            }

            console.log('[ValeSpec__ConfigLoader] Configuration loaded successfully. App v' +
                (ValeSpec__ConfigLoader__Application['ValeSpec__Application__Config__AppVersion'] || '?.?.?'));

            return configData;

        } catch (e) {
            console.error('[ValeSpec__ConfigLoader] Failed to load configuration:', e);
            return null;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Specific Config Section
    // ------------------------------------------------------------
    function ValeSpec__ConfigLoader__GetSection(sectionName) {
        var sections  =  {
            'Application'          : ValeSpec__ConfigLoader__Application,
            'IronmongeryDefaults'  : ValeSpec__ConfigLoader__IronmongeryDefaults,
            'DoorTypeOptions'      : ValeSpec__ConfigLoader__DoorTypeOptions,
            'LeverTypeOptions'     : ValeSpec__ConfigLoader__LeverTypeOptions,
            'HingeProjection'      : ValeSpec__ConfigLoader__HingeProjection,
            'CabinHookOptions'     : ValeSpec__ConfigLoader__CabinHookOptions,
            'Validation'           : ValeSpec__ConfigLoader__Validation
        };
        return sections[sectionName] || null;
    }
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__ConfigLoader__LoadConfig   : ValeSpec__ConfigLoader__LoadConfig,
        ValeSpec__ConfigLoader__GetSection   : ValeSpec__ConfigLoader__GetSection
    };

})();

// endregion ===================================================================

window.ValeSpec__AppCore__ConfigLoader  =  ValeSpec__AppCore__ConfigLoader;
