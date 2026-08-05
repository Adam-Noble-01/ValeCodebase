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

   IMPORTANT — PROJECT-WIDE PHILOSOPHY (JSON TRUMPS JS):
   - JSON config is the Single Source of Truth. Embedded JS variables, module
     constants, and inline magic numbers that mirror a config key are forbidden.
   - If a value can live in a JSON config file, it MUST live there — not in a
     JS const, not as a function default, not as a fallback after a failed read.
   - No module may hardcode a value that exists (or should exist) in config.
     Always read it from this loader / the merged config object.
   - Prefer RequireNumber / RequireString over `|| 12` style defaults. Silent
     JS fallbacks are how JSON and code drift apart undetectably.
   - To change behaviour: edit the JSON. Do not patch the JS to "also work"
     when a key is missing — fix the config instead.

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
    // Path only — the values inside this JSON are the SSOT. Do not duplicate
    // those values as JS constants elsewhere in the project.
    const CONFIG_PATH  =  '02__Src__AppModules/02__AppData/VghLantern__AppConfig__Main__.json';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Co-Located System Config Overlays
    // ------------------------------------------------------------
    // Each entry is fetched after the main config and merged over it.
    // Label is used only for console diagnostics.
    // PHILOSOPHY: system-specific tunables (stroke widths, sheet sizes, camera
    // presets, warning thresholds, etc.) belong in these JSON overlays — never
    // as module-level consts inside the renderer / editor JS files.
    const SYSTEM_CONFIG_OVERLAYS  =  [
        { Label : 'UserMenuDefaults', Path : '02__Src__AppModules/02__AppData/VghLantern__AppData__UserMenuConfig__Defaults__.json' },
        { Label : 'PbrMaterials',    Path : '02__Src__AppModules/02__AppData/Na__PbrMaterials__Config.json' },
        { Label : 'Env2d',           Path : '02__Src__AppModules/05__Env2d__SvgRenderPipeline/Na__Env2d__Config.json' },
        { Label : 'Env3d',           Path : '02__Src__AppModules/06__Env3d__ThreeRenderPipeline/Na__Env3d__Config.json' },
        { Label : 'DocManagement',   Path : '02__Src__AppModules/10__System__DocumentManagementMode/Na__DocManagement__Config.json' },
        { Label : 'LanternEditor',   Path : '02__Src__AppModules/20__System__LanternAssembly__EditorMode/Na__LanternEditor__Config.json' },
        { Label : 'EditorWarnings',  Path : '02__Src__AppModules/20__System__LanternAssembly__EditorMode/Na__LanternEditor__Warnings__.json' },
        { Label : 'DrawingEditor',   Path : '02__Src__AppModules/30__System__DrawingEditorMode/Na__DrawingEditor__Config.json' },
        { Label : 'Specification',   Path : '02__Src__AppModules/35__System__SpecificationMode/Na__Specification__Config.json' },
        { Label : 'ClientDocument',  Path : '02__Src__AppModules/37__System__ClientDocumentMode/Na__ClientDocument__Config.json' },
        { Label : 'Terms',           Path : '02__Src__AppModules/38__System__TermsAndConditions/Na__Terms__Config.json' },
        { Label : 'DocPreview',      Path : '02__Src__AppModules/40__System__DocumentPreviewMode/Na__DocPreview__Config.json' },
        { Label : 'PdfWriter',       Path : '02__Src__AppModules/45__System__PdfDocumentWriter/Na__PdfWriter__Config.json' }
    ];
    // ------------------------------------------------------------


    // MODULE VARIABLES | Parsed Config Sections
    // ------------------------------------------------------------
    // These are mirrors of the merged JSON — the only legitimate place for
    // runtime config values. Consumers must read via GetSection / Require*
    // rather than inventing local copies of the same numbers.
    let VghLantern__ConfigLoader__Application       =  null;                 // <-- App identity, version, server port
    let VghLantern__ConfigLoader__LanternDefaults   =  null;                 // <-- Default lantern dimensions and pitch
    let VghLantern__ConfigLoader__NewProjectSeed    =  null;                 // <-- Lantern every new project is created with
    let VghLantern__ConfigLoader__RoofFormOptions   =  null;                 // <-- Selectable roof forms
    let VghLantern__ConfigLoader__GlazingOptions    =  null;                 // <-- Glazing spec option lists
    let VghLantern__ConfigLoader__FinishOptions     =  null;                 // <-- Frame finish option lists, derived from PbrMaterials
    let VghLantern__ConfigLoader__PbrMaterials      =  null;                 // <-- Finish palette and surface response SSOT
    let VghLantern__ConfigLoader__Validation        =  null;                 // <-- Min / max constraint envelope
    let VghLantern__ConfigLoader__DataLibraries     =  null;                 // <-- Component and profile library paths
    let VghLantern__ConfigLoader__Env2d             =  null;                 // <-- 2D SVG environment settings
    let VghLantern__ConfigLoader__Env3d             =  null;                 // <-- 3D Three.js environment settings
    let VghLantern__ConfigLoader__LanternEditor     =  null;                 // <-- Editor layout and section settings
    let VghLantern__ConfigLoader__EditorWarnings    =  null;                 // <-- Editor manufacturing warning rule table
    let VghLantern__ConfigLoader__DrawingEditor     =  null;                 // <-- Sheet, scale and titleblock settings
    let VghLantern__ConfigLoader__Specification     =  null;                 // <-- Specification document settings
    let VghLantern__ConfigLoader__ClientDocument    =  null;                 // <-- Welcome letter template and editor settings
    let VghLantern__ConfigLoader__Terms             =  null;                 // <-- Terms sections, numbering and the drawing QR block
    let VghLantern__ConfigLoader__DocPreview        =  null;                 // <-- Preview and PDF export settings
    let VghLantern__ConfigLoader__PdfWriter         =  null;                 // <-- Page assembly and footer rules for every PDF export
    let VghLantern__ConfigLoader__MergedConfig      =  null;                 // <-- Full merged object
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Fetching
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch a JSON File Returning Null on Failure
    // ------------------------------------------------------------
    // cache: 'no-store' is mandatory - a stale browser-cached JSON is exactly
    // how config edits appear to "not work" while the disk file is correct.
    async function VghLantern__ConfigLoader__FetchJsonSafe(path, label) {
        try {
            var response  =  await fetch(path, { cache: 'no-store' });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return await response.json();
        } catch (e) {
            console.warn('[VghLantern__ConfigLoader] Optional config unavailable (' + label + '):', e.message);
            return null;
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Derive the Finish Option List from the PBR Materials Config
    // ------------------------------------------------------------
    // The finish palette moved into Na__PbrMaterials__Config.json, where each
    // entry carries its full surface response rather than only a hex colour.
    // Everything that only wants the option list - the editor dropdowns, the
    // specification schedule - still asks for the 'FinishOptions' section and is
    // served this projection, so the palette lives in exactly one file while its
    // consumers stay unaware that it moved.
    function VghLantern__ConfigLoader__DeriveFinishOptions(pbrConfig) {
        var finishes  =  (pbrConfig && pbrConfig['VghLantern__PbrMaterials__Config__Finishes']) || [];
        var defaults  =  (pbrConfig && pbrConfig['VghLantern__PbrMaterials__Config__FinishDefaults']) || {};
        var refs      =  (pbrConfig && pbrConfig['VghLantern__PbrMaterials__Config__ColourReferences']) || [];

        return {
            'VghLantern__Finish__Options__Config__Description'         : 'Derived at load time from Na__PbrMaterials__Config.json. Never edit here.',
            'VghLantern__Finish__Options__Config__AvailableFinishes'   : finishes.map(function(finish) {
                return {
                    Name         : finish.Name,
                    MatCode      : finish.MatCode,
                    HexColor     : finish.HexColor,
                    RalReference : finish.RalReference,
                    Substrate    : finish.Substrate,
                    Description  : finish.Description
                };
            }),
            'VghLantern__Finish__Options__Config__DefaultFinish'       : defaults.DefaultFinishName || '',
            'VghLantern__Finish__Options__Config__ColourReferences'    : refs
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Assign Named Section Accessors from the Merged Config
    // ------------------------------------------------------------
    function VghLantern__ConfigLoader__AssignSections(configData) {
        VghLantern__ConfigLoader__Application      =  configData['VghLantern__Application__Config']            || {};
        VghLantern__ConfigLoader__LanternDefaults  =  configData['VghLantern__Lantern__GlobalDefaults__Config'] || {};
        VghLantern__ConfigLoader__NewProjectSeed   =  configData['VghLantern__NewProject__SeedLantern__Config'] || {};
        VghLantern__ConfigLoader__RoofFormOptions  =  configData['VghLantern__RoofForm__Options__Config']       || {};
        VghLantern__ConfigLoader__GlazingOptions   =  configData['VghLantern__Glazing__Options__Config']        || {};
        VghLantern__ConfigLoader__PbrMaterials     =  configData['VghLantern__PbrMaterials__Config']            || {};
        VghLantern__ConfigLoader__FinishOptions    =  VghLantern__ConfigLoader__DeriveFinishOptions(VghLantern__ConfigLoader__PbrMaterials);
        VghLantern__ConfigLoader__Validation       =  configData['VghLantern__Validation__Config']              || {};
        VghLantern__ConfigLoader__DataLibraries    =  configData['VghLantern__DataLibraries__Config']           || {};
        VghLantern__ConfigLoader__Env2d            =  configData['VghLantern__Env2d__Config']                   || {};
        VghLantern__ConfigLoader__Env3d            =  configData['VghLantern__Env3d__Config']                   || {};
        VghLantern__ConfigLoader__LanternEditor    =  configData['VghLantern__LanternEditor__Config']           || {};
        VghLantern__ConfigLoader__EditorWarnings   =  configData['VghLantern__LanternEditor__Warnings__Config'] || {};
        VghLantern__ConfigLoader__DrawingEditor    =  configData['VghLantern__DrawingEditor__Config']           || {};
        VghLantern__ConfigLoader__Specification    =  configData['VghLantern__Specification__Config']           || {};
        VghLantern__ConfigLoader__ClientDocument   =  configData['VghLantern__ClientDocument__Config']          || {};
        VghLantern__ConfigLoader__Terms            =  configData['VghLantern__Terms__Config']                   || {};
        VghLantern__ConfigLoader__DocPreview       =  configData['VghLantern__DocPreview__Config']              || {};
        VghLantern__ConfigLoader__PdfWriter        =  configData['VghLantern__PdfWriter__Config']               || {};
    }
    // ------------------------------------------------------------


    // FUNCTION | Load Configuration from JSON Files
    // ------------------------------------------------------------
    // Loads JSON first, then overlays. After this returns, every tunable the
    // app needs should be reachable from the merged object — modules must not
    // keep a parallel set of hardcoded defaults "just in case load fails".
    async function VghLantern__ConfigLoader__LoadConfig() {
        try {
            var responseMain  =  await fetch(CONFIG_PATH, { cache: 'no-store' });
            if (!responseMain.ok) throw new Error('Config fetch failed: ' + responseMain.status);

            var configData  =  await responseMain.json();

            for (var i = 0; i < SYSTEM_CONFIG_OVERLAYS.length; i++) {
                var overlay      =  SYSTEM_CONFIG_OVERLAYS[i];
                var overlayData  =  await VghLantern__ConfigLoader__FetchJsonSafe(overlay.Path, overlay.Label);
                if (overlayData) configData  =  Object.assign({}, configData, overlayData); // <-- JSON overlay wins over main
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
// All reads go through here. Never copy a config number into a local const
// "for convenience" — that convenience is how JSON and JS go out of sync.

    // FUNCTION | Get a Specific Config Section
    // ------------------------------------------------------------
    // Returns the live JSON-backed section object. Callers must treat keys as
    // authoritative; do not replace missing keys with embedded JS defaults.
    function VghLantern__ConfigLoader__GetSection(sectionName) {
        var sections  =  {
            'Application'      : VghLantern__ConfigLoader__Application,
            'LanternDefaults'  : VghLantern__ConfigLoader__LanternDefaults,
            'NewProjectSeed'   : VghLantern__ConfigLoader__NewProjectSeed,
            'RoofFormOptions'  : VghLantern__ConfigLoader__RoofFormOptions,
            'GlazingOptions'   : VghLantern__ConfigLoader__GlazingOptions,
            'FinishOptions'    : VghLantern__ConfigLoader__FinishOptions,
            'PbrMaterials'     : VghLantern__ConfigLoader__PbrMaterials,
            'Validation'       : VghLantern__ConfigLoader__Validation,
            'DataLibraries'    : VghLantern__ConfigLoader__DataLibraries,
            'Env2d'            : VghLantern__ConfigLoader__Env2d,
            'Env3d'            : VghLantern__ConfigLoader__Env3d,
            'LanternEditor'    : VghLantern__ConfigLoader__LanternEditor,
            'EditorWarnings'   : VghLantern__ConfigLoader__EditorWarnings,
            'DrawingEditor'    : VghLantern__ConfigLoader__DrawingEditor,
            'Specification'    : VghLantern__ConfigLoader__Specification,
            'ClientDocument'   : VghLantern__ConfigLoader__ClientDocument,
            'Terms'            : VghLantern__ConfigLoader__Terms,
            'DocPreview'       : VghLantern__ConfigLoader__DocPreview,
            'PdfWriter'        : VghLantern__ConfigLoader__PdfWriter
        };
        return sections[sectionName] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Full Merged Config Object
    // ------------------------------------------------------------
    // Prefer GetSection for scoped reads. Use this when a module genuinely
    // needs cross-section keys — still never hardcode what is already here.
    function VghLantern__ConfigLoader__GetMergedConfig() {
        return VghLantern__ConfigLoader__MergedConfig;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Required Numeric Value from a Config Section
    // ------------------------------------------------------------
    // PHILOSOPHY: JSON trumps JS. No module may hardcode a fallback number
    // that mirrors a config value — that is exactly how JSON and code silently
    // drift apart. A missing or non-numeric key is a config authoring bug, not
    // something for the caller to paper over with `|| 12`. This logs loudly
    // and returns 0 — visibly wrong on screen rather than plausibly wrong and
    // undetectable. Fix the JSON; do not patch the JS.
    function VghLantern__ConfigLoader__RequireNumber(sectionObj, key, contextLabel) {
        var value  =  sectionObj ? sectionObj[key] : undefined;
        if (typeof value === 'number' && !isNaN(value)) return value;

        console.error('[VghLantern__ConfigLoader] Missing or non-numeric config key "' + key + '"' +
            (contextLabel ? ' (' + contextLabel + ')' : '') + '. Add it to the JSON config - do not hardcode a fallback in JS.');
        return 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Required String Value from a Config Section
    // ------------------------------------------------------------
    // Same contract as RequireNumber: empty / missing string keys are fixed
    // in JSON, never replaced by an embedded JS default string.
    function VghLantern__ConfigLoader__RequireString(sectionObj, key, contextLabel) {
        var value  =  sectionObj ? sectionObj[key] : undefined;
        if (typeof value === 'string' && value.length > 0) return value;

        console.error('[VghLantern__ConfigLoader] Missing or empty config key "' + key + '"' +
            (contextLabel ? ' (' + contextLabel + ')' : '') + '. Add it to the JSON config - do not hardcode a fallback in JS.');
        return '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Required Boolean Value from a Config Section
    // ------------------------------------------------------------
    // Same contract as RequireNumber/RequireString: a missing boolean key is
    // never silently treated as true/false via `!== false` or `|| false` -
    // that hides a missing JSON entry behind a plausible-looking default.
    function VghLantern__ConfigLoader__RequireBoolean(sectionObj, key, contextLabel) {
        var value  =  sectionObj ? sectionObj[key] : undefined;
        if (typeof value === 'boolean') return value;

        console.error('[VghLantern__ConfigLoader] Missing or non-boolean config key "' + key + '"' +
            (contextLabel ? ' (' + contextLabel + ')' : '') + '. Add it to the JSON config - do not hardcode a fallback in JS.');
        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Required Array Value from a Config Section
    // ------------------------------------------------------------
    // Same contract as RequireNumber/RequireString: a missing array key is
    // never silently treated as `[]` via `|| []` at the call site - that
    // hides a missing JSON entry behind a plausible-looking empty result.
    function VghLantern__ConfigLoader__RequireArray(sectionObj, key, contextLabel) {
        var value  =  sectionObj ? sectionObj[key] : undefined;
        if (Array.isArray(value)) return value;

        console.error('[VghLantern__ConfigLoader] Missing or non-array config key "' + key + '"' +
            (contextLabel ? ' (' + contextLabel + ')' : '') + '. Add it to the JSON config - do not hardcode a fallback in JS.');
        return [];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    // Consumers: LoadConfig once at boot, then GetSection / Require* for every
    // tunable. Do not export or invent parallel "default" constants in other
    // modules for values that already belong in the JSON configs.
    return {
        VghLantern__ConfigLoader__LoadConfig        : VghLantern__ConfigLoader__LoadConfig,
        VghLantern__ConfigLoader__GetSection        : VghLantern__ConfigLoader__GetSection,
        VghLantern__ConfigLoader__GetMergedConfig   : VghLantern__ConfigLoader__GetMergedConfig,
        VghLantern__ConfigLoader__RequireNumber     : VghLantern__ConfigLoader__RequireNumber,
        VghLantern__ConfigLoader__RequireString     : VghLantern__ConfigLoader__RequireString,
        VghLantern__ConfigLoader__RequireBoolean    : VghLantern__ConfigLoader__RequireBoolean,
        VghLantern__ConfigLoader__RequireArray      : VghLantern__ConfigLoader__RequireArray
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppCore__ConfigLoader  =  VghLantern__AppCore__ConfigLoader;
