/* =============================================================================
   VGHLANTERN - CONFIG LOADER
   =============================================================================

   FILE       : VghLantern__AppCore__ConfigLoader__.js
   NAMESPACE  : VghLantern
   MODULE     : AppCore - ConfigLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Fetch, merge and expose the application configuration
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Fetches VghLantern__AppConfig__Main__.json (the SSOT) via fetch().
   - Then fetches each co-located system config and merges it over the top, so a
     system's own settings live beside its modules while the app still sees one
     flat config object. A missing overlay is a warning, never a hard failure.
   - Destructures sections into named config accessors.
   - Stores the merged config in StateManager, emitting 'appConfigLoaded'.

   IMPORTANT:
   - No module may hardcode a value that exists in config. Read it from here.

   ============================================================================= */

// =============================================================================
// REGION | Config Loader Module
// =============================================================================

const VghLantern__AppCore__ConfigLoader = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Main Config File Path
    // ------------------------------------------------------------
    const CONFIG_PATH  =  '02__Src__AppModules/02__AppData/VghLantern__AppConfig__Main__.json';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Co-Located System Config Overlays
    // ------------------------------------------------------------
    // Each entry is fetched after the main config and merged over it.
    // Label is used only for console diagnostics.
    const SYSTEM_CONFIG_OVERLAYS  =  [
        { Label : 'Env2d',           Path : '02__Src__AppModules/05__Env2d__SvgRenderPipeline/Na__Env2d__Config.json' },
        { Label : 'Env3d',           Path : '02__Src__AppModules/06__Env3d__ThreeRenderPipeline/Na__Env3d__Config.json' },
        { Label : 'DocManagement',   Path : '02__Src__AppModules/10__System__DocumentManagementMode/Na__DocManagement__Config.json' },
        { Label : 'LanternEditor',   Path : '02__Src__AppModules/20__System__LanternAssembly__EditorMode/Na__LanternEditor__Config.json' },
        { Label : 'EditorWarnings',  Path : '02__Src__AppModules/20__System__LanternAssembly__EditorMode/Na__LanternEditor__Warnings__.json' },
        { Label : 'DrawingEditor',   Path : '02__Src__AppModules/30__System__DrawingEditorMode/Na__DrawingEditor__Config.json' },
        { Label : 'Specification',   Path : '02__Src__AppModules/35__System__SpecificationMode/Na__Specification__Config.json' },
        { Label : 'DocPreview',      Path : '02__Src__AppModules/40__System__DocumentPreviewMode/Na__DocPreview__Config.json' }
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | Parsed Config Sections
    // ------------------------------------------------------------
    let VghLantern__ConfigLoader__Application       =  null;                 // <-- App identity, version, server port
    let VghLantern__ConfigLoader__LanternDefaults   =  null;                 // <-- Default lantern dimensions and pitch
    let VghLantern__ConfigLoader__RoofFormOptions   =  null;                 // <-- Selectable roof forms
    let VghLantern__ConfigLoader__GlazingOptions    =  null;                 // <-- Glazing spec option lists
    let VghLantern__ConfigLoader__FinishOptions     =  null;                 // <-- Frame finish option lists
    let VghLantern__ConfigLoader__Validation        =  null;                 // <-- Min / max constraint envelope
    let VghLantern__ConfigLoader__DataLibraries     =  null;                 // <-- Component and profile library paths
    let VghLantern__ConfigLoader__Env2d             =  null;                 // <-- 2D SVG environment settings
    let VghLantern__ConfigLoader__Env3d             =  null;                 // <-- 3D Three.js environment settings
    let VghLantern__ConfigLoader__LanternEditor     =  null;                 // <-- Editor layout and section settings
    let VghLantern__ConfigLoader__EditorWarnings    =  null;                 // <-- Editor manufacturing warning rule table
    let VghLantern__ConfigLoader__DrawingEditor     =  null;                 // <-- Sheet, scale and titleblock settings
    let VghLantern__ConfigLoader__Specification     =  null;                 // <-- Specification document settings
    let VghLantern__ConfigLoader__DocPreview        =  null;                 // <-- Preview and PDF export settings
    let VghLantern__ConfigLoader__MergedConfig      =  null;                 // <-- Full merged object
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Fetching
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch a JSON File Returning Null on Failure
    // ------------------------------------------------------------
    async function VghLantern__ConfigLoader__FetchJsonSafe(path, label) {
        try {
            var response  =  await fetch(path);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return await response.json();
        } catch (e) {
            console.warn('[VghLantern__ConfigLoader] Optional config unavailable (' + label + '):', e.message);
            return null;
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Assign Named Section Accessors from the Merged Config
    // ------------------------------------------------------------
    function VghLantern__ConfigLoader__AssignSections(configData) {
        VghLantern__ConfigLoader__Application      =  configData['VghLantern__Application__Config']            || {};
        VghLantern__ConfigLoader__LanternDefaults  =  configData['VghLantern__Lantern__GlobalDefaults__Config'] || {};
        VghLantern__ConfigLoader__RoofFormOptions  =  configData['VghLantern__RoofForm__Options__Config']       || {};
        VghLantern__ConfigLoader__GlazingOptions   =  configData['VghLantern__Glazing__Options__Config']        || {};
        VghLantern__ConfigLoader__FinishOptions    =  configData['VghLantern__Finish__Options__Config']         || {};
        VghLantern__ConfigLoader__Validation       =  configData['VghLantern__Validation__Config']              || {};
        VghLantern__ConfigLoader__DataLibraries    =  configData['VghLantern__DataLibraries__Config']           || {};
        VghLantern__ConfigLoader__Env2d            =  configData['VghLantern__Env2d__Config']                   || {};
        VghLantern__ConfigLoader__Env3d            =  configData['VghLantern__Env3d__Config']                   || {};
        VghLantern__ConfigLoader__LanternEditor    =  configData['VghLantern__LanternEditor__Config']           || {};
        VghLantern__ConfigLoader__EditorWarnings   =  configData['VghLantern__LanternEditor__Warnings__Config'] || {};
        VghLantern__ConfigLoader__DrawingEditor    =  configData['VghLantern__DrawingEditor__Config']           || {};
        VghLantern__ConfigLoader__Specification    =  configData['VghLantern__Specification__Config']           || {};
        VghLantern__ConfigLoader__DocPreview       =  configData['VghLantern__DocPreview__Config']              || {};
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Configuration from JSON Files
    // ------------------------------------------------------------
    async function VghLantern__ConfigLoader__LoadConfig() {
        try {
            var responseMain  =  await fetch(CONFIG_PATH);
            if (!responseMain.ok) throw new Error('Config fetch failed: ' + responseMain.status);

            var configData  =  await responseMain.json();

            for (var i = 0; i < SYSTEM_CONFIG_OVERLAYS.length; i++) {
                var overlay      =  SYSTEM_CONFIG_OVERLAYS[i];
                var overlayData  =  await VghLantern__ConfigLoader__FetchJsonSafe(overlay.Path, overlay.Label);
                if (overlayData) configData  =  Object.assign({}, configData, overlayData);
            }

            VghLantern__ConfigLoader__AssignSections(configData);
            VghLantern__ConfigLoader__MergedConfig  =  configData;

            if (window.VghLantern__AppCore__StateManager) {
                window.VghLantern__AppCore__StateManager.VghLantern__StateManager__SetAppConfig(configData);
            }

            console.log('[VghLantern__ConfigLoader] Configuration loaded successfully. App v' +
                (VghLantern__ConfigLoader__Application['VghLantern__Application__Config__AppVersion'] || '?.?.?'));

            return configData;

        } catch (e) {
            console.error('[VghLantern__ConfigLoader] Failed to load configuration:', e);
            return null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Access
// -----------------------------------------------------------------------------

    // FUNCTION | Get a Specific Config Section
    // ------------------------------------------------------------
    function VghLantern__ConfigLoader__GetSection(sectionName) {
        var sections  =  {
            'Application'      : VghLantern__ConfigLoader__Application,
            'LanternDefaults'  : VghLantern__ConfigLoader__LanternDefaults,
            'RoofFormOptions'  : VghLantern__ConfigLoader__RoofFormOptions,
            'GlazingOptions'   : VghLantern__ConfigLoader__GlazingOptions,
            'FinishOptions'    : VghLantern__ConfigLoader__FinishOptions,
            'Validation'       : VghLantern__ConfigLoader__Validation,
            'DataLibraries'    : VghLantern__ConfigLoader__DataLibraries,
            'Env2d'            : VghLantern__ConfigLoader__Env2d,
            'Env3d'            : VghLantern__ConfigLoader__Env3d,
            'LanternEditor'    : VghLantern__ConfigLoader__LanternEditor,
            'EditorWarnings'   : VghLantern__ConfigLoader__EditorWarnings,
            'DrawingEditor'    : VghLantern__ConfigLoader__DrawingEditor,
            'Specification'    : VghLantern__ConfigLoader__Specification,
            'DocPreview'       : VghLantern__ConfigLoader__DocPreview
        };
        return sections[sectionName] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Full Merged Config Object
    // ------------------------------------------------------------
    function VghLantern__ConfigLoader__GetMergedConfig() {
        return VghLantern__ConfigLoader__MergedConfig;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ConfigLoader__LoadConfig        : VghLantern__ConfigLoader__LoadConfig,
        VghLantern__ConfigLoader__GetSection        : VghLantern__ConfigLoader__GetSection,
        VghLantern__ConfigLoader__GetMergedConfig   : VghLantern__ConfigLoader__GetMergedConfig
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppCore__ConfigLoader  =  VghLantern__AppCore__ConfigLoader;
