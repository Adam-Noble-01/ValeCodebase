/* =============================================================================
   VALESPEC - DOCUMENT PREVIEW MENU DATA HANDLER
   =============================================================================

   FILE       : ValeSpec__DocPreview__MenuDataHandler__.js
   NAMESPACE  : ValeSpec
   MODULE     : DocPreview - MenuDataHandler
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load/merge/save user menu config for Doc Preview persistence
   CREATED    : 16-Apr-2026

   DESCRIPTION:
   - Loads static user menu defaults JSON and merges per-user persisted data
   - Validates/sanitises Document Preview menu + view-state persistence fields
   - Exposes read helpers for DocumentState and PageRenderer
   - Debounces POST writes to Flask per-user user-menu-config endpoint

   ============================================================================= */

// =============================================================================
// REGION | Menu Data Handler Module
// =============================================================================

const ValeSpec__DocPreview__MenuDataHandler = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Paths and Endpoint Roots
    // ------------------------------------------------------------
    const DEFAULTS_CONFIG_PATH  =  '02__Src__AppModules/02__AppData/ValeSpec__AppData__UserMenuConfig__Defaults__.json';
    const MAIN_APP_CONFIG_PATH  =  '02__Src__AppModules/02__AppData/ValeSpec__AppConfig__Main__.json';
    const USER_MENU_API_ROOT    =  '/api/user-menu-config/';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Config Key Names
    // ------------------------------------------------------------
    const META_SECTION_KEY             =  'ValeSpec__UserMenu__Meta__Config';
    const DOC_PREVIEW_SECTION_KEY      =  'ValeSpec__UserMenu__ModeDocumentPreview__Config';
    const APP_DEFAULTS_SECTION_KEY     =  'ValeSpec__UserMenu__AppDefaults__Config';
    const META_KEY_DEFAULT_USER_SLUG   =  'ValeSpec__UserMenu__Meta__Config__DefaultUserSlug';
    const META_KEY_SCHEMA_VERSION      =  'ValeSpec__UserMenu__Meta__Config__SchemaVersion';
    const META_KEY_SAVE_DEBOUNCE_MS    =  'ValeSpec__UserMenu__Meta__Config__SaveDebounceMs';
    const PREVIEW_KEY_OVERRIDE_ENABLED =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__OverrideEnabled';
    const PREVIEW_KEY_MENU_X           =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuPositionX';
    const PREVIEW_KEY_MENU_Y           =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuPositionY';
    const PREVIEW_KEY_OPEN_DIAGRAMS    =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuSectionDiagramsOpen';
    const PREVIEW_KEY_OPEN_DOCUMENT    =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuSectionDocumentOpen';
    const PREVIEW_KEY_OPEN_ACTIONS     =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuSectionActionsOpen';
    const PREVIEW_KEY_DIAGRAM_MODE     =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__DiagramMode';
    const PREVIEW_KEY_SHOW_FULL        =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__ShowFullSchedule';
    const PREVIEW_KEY_SHOW_SUMMARY     =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__ShowSummary';
    const PREVIEW_KEY_SHOW_NOTES       =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__ShowJobNotes';
    const PREVIEW_KEY_PERSIST_POS      =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__PersistMenuPosition';
    const PREVIEW_KEY_PERSIST_SECTIONS =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__PersistMenuSectionState';
    const PREVIEW_KEY_PERSIST_VIEW     =  'ValeSpec__UserMenu__ModeDocumentPreview__Config__PersistViewState';
    const APP_DEFAULTS_KEY_OVERRIDE_ENABLED =  'ValeSpec__UserMenu__AppDefaults__Config__OverrideEnabled';
    const APP_DEFAULTS_KEY_MENU_X           =  'ValeSpec__UserMenu__AppDefaults__Config__MenuPositionX';
    const APP_DEFAULTS_KEY_MENU_Y           =  'ValeSpec__UserMenu__AppDefaults__Config__MenuPositionY';
    const APP_DEFAULTS_KEY_OPEN_DIAGRAMS    =  'ValeSpec__UserMenu__AppDefaults__Config__MenuSectionDiagramsOpen';
    const APP_DEFAULTS_KEY_OPEN_DOCUMENT    =  'ValeSpec__UserMenu__AppDefaults__Config__MenuSectionDocumentOpen';
    const APP_DEFAULTS_KEY_OPEN_ACTIONS     =  'ValeSpec__UserMenu__AppDefaults__Config__MenuSectionActionsOpen';
    const APP_DEFAULTS_KEY_DIAGRAM_MODE     =  'ValeSpec__UserMenu__AppDefaults__Config__DiagramMode';
    const APP_DEFAULTS_KEY_SHOW_FULL        =  'ValeSpec__UserMenu__AppDefaults__Config__ShowFullSchedule';
    const APP_DEFAULTS_KEY_SHOW_SUMMARY     =  'ValeSpec__UserMenu__AppDefaults__Config__ShowSummary';
    const APP_DEFAULTS_KEY_SHOW_NOTES       =  'ValeSpec__UserMenu__AppDefaults__Config__ShowJobNotes';
    const APP_DEFAULTS_KEY_PERSIST_POS      =  'ValeSpec__UserMenu__AppDefaults__Config__PersistMenuPosition';
    const APP_DEFAULTS_KEY_PERSIST_SECTIONS =  'ValeSpec__UserMenu__AppDefaults__Config__PersistMenuSectionState';
    const APP_DEFAULTS_KEY_PERSIST_VIEW     =  'ValeSpec__UserMenu__AppDefaults__Config__PersistViewState';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Variables
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Runtime Data Stores
    // ------------------------------------------------------------
    let ValeSpec__MenuDataHandler__MergedConfig            =  null;
    let ValeSpec__MenuDataHandler__LoadPromise             =  null;
    let ValeSpec__MenuDataHandler__IsLoaded                =  false;
    let ValeSpec__MenuDataHandler__ResolvedUserSlug        =  'AdamW';
    let ValeSpec__MenuDataHandler__SaveTimerHandle         =  null;
    let ValeSpec__MenuDataHandler__LastWritePromise        =  Promise.resolve();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Object and Type Utilities
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Return True for Plain Object
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__IsPlainObject(value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Deep Clone Plain JSON Object
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__Clone(value) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (error) {
            return {};
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Deep Merge Source Into Target
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__DeepMerge(targetObj, sourceObj) {
        var output  =  ValeSpec__MenuDataHandler__IsPlainObject(targetObj) ? targetObj : {};
        if (!ValeSpec__MenuDataHandler__IsPlainObject(sourceObj)) return output;

        Object.keys(sourceObj).forEach(function(key) {
            var sourceValue  =  sourceObj[key];
            if (ValeSpec__MenuDataHandler__IsPlainObject(sourceValue)) {
                var targetValue  =  ValeSpec__MenuDataHandler__IsPlainObject(output[key]) ? output[key] : {};
                output[key]  =  ValeSpec__MenuDataHandler__DeepMerge(targetValue, sourceValue);
                return;
            }
            output[key]  =  sourceValue;
        });

        return output;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalize Boolean with Fallback
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__ToBool(value, fallbackValue) {
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return !!fallbackValue;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalize Numeric Pixel Coordinate
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__ToPixelNumber(value) {
        var parsed  =  Number(value);
        if (!isFinite(parsed)) return null;
        return Math.round(parsed);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Normalize Diagram Mode Value
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__NormalizeDiagramMode(value, fallbackMode) {
        var mode  =  String(value || '').toLowerCase().trim();
        if (mode === 'small' || mode === 'large' || mode === 'none') return mode;
        return String(fallbackMode || 'small').toLowerCase().trim() || 'small';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Defaults and Validation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build Fallback Defaults Object
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__BuildFallbackDefaultsConfig() {
        var fallback  =  {};
        fallback[META_SECTION_KEY]  =  {
            'ValeSpec__UserMenu__Meta__Config__Description'      : 'Fallback metadata for user menu persistence.',
            'ValeSpec__UserMenu__Meta__Config__SchemaVersion'    : '1.0.0',
            'ValeSpec__UserMenu__Meta__Config__DefaultUserSlug'  : 'AdamW',
            'ValeSpec__UserMenu__Meta__Config__StorageMode'      : 'disk_json_flask',
            'ValeSpec__UserMenu__Meta__Config__SaveDebounceMs'   : 350
        };
        fallback['ValeSpec__UserMenu__ModeDocManagement__Config']  =  {
            'ValeSpec__UserMenu__ModeDocManagement__Config__Description' : 'Fallback placeholder.',
            'ValeSpec__UserMenu__ModeDocManagement__Config__Enabled'     : false
        };
        fallback['ValeSpec__UserMenu__ModeDocumentEditor__Config']  =  {
            'ValeSpec__UserMenu__ModeDocumentEditor__Config__Description' : 'Fallback placeholder.',
            'ValeSpec__UserMenu__ModeDocumentEditor__Config__Enabled'     : false
        };
        fallback['ValeSpec__UserMenu__ModeAssemblyEditor__Config']  =  {
            'ValeSpec__UserMenu__ModeAssemblyEditor__Config__Description' : 'Fallback placeholder.',
            'ValeSpec__UserMenu__ModeAssemblyEditor__Config__Enabled'     : false
        };
        fallback[DOC_PREVIEW_SECTION_KEY]  =  {
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__Description'             : 'Fallback Document Preview menu defaults.',
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__OverrideEnabled'         : true,
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuPositionX'           : null,
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuPositionY'           : null,
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuSectionDiagramsOpen' : true,
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuSectionDocumentOpen' : true,
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuSectionActionsOpen'  : true,
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__DiagramMode'             : 'small',
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__ShowFullSchedule'        : true,
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__ShowSummary'             : true,
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__ShowJobNotes'            : true,
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__PersistMenuPosition'     : true,
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__PersistMenuSectionState' : true,
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__PersistViewState'        : true
        };
        return fallback;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Ensure Required Config Sections Exist
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__EnsureRequiredSections(configData) {
        if (!ValeSpec__MenuDataHandler__IsPlainObject(configData[META_SECTION_KEY])) {
            configData[META_SECTION_KEY]  =  {};
        }
        if (!ValeSpec__MenuDataHandler__IsPlainObject(configData[DOC_PREVIEW_SECTION_KEY])) {
            configData[DOC_PREVIEW_SECTION_KEY]  =  {};
        }
        return configData;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Sanitize Full Merged User Menu Config
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__SanitizeMergedConfig(rawConfigData) {
        var fallbackConfig  =  ValeSpec__MenuDataHandler__BuildFallbackDefaultsConfig();
        var mergedConfig    =  ValeSpec__MenuDataHandler__DeepMerge(
            ValeSpec__MenuDataHandler__Clone(fallbackConfig),
            ValeSpec__MenuDataHandler__Clone(rawConfigData)
        );
        mergedConfig  =  ValeSpec__MenuDataHandler__EnsureRequiredSections(mergedConfig);

        var metaSection     =  mergedConfig[META_SECTION_KEY];
        var previewSection  =  mergedConfig[DOC_PREVIEW_SECTION_KEY];

        var defaultUserSlug  =  String(metaSection[META_KEY_DEFAULT_USER_SLUG] || 'AdamW').trim();
        if (!defaultUserSlug) defaultUserSlug  =  'AdamW';
        metaSection[META_KEY_DEFAULT_USER_SLUG]  =  defaultUserSlug;

        var schemaVersion  =  String(metaSection[META_KEY_SCHEMA_VERSION] || '1.0.0').trim();
        if (!schemaVersion) schemaVersion  =  '1.0.0';
        metaSection[META_KEY_SCHEMA_VERSION]  =  schemaVersion;

        var debounceMs  =  Number(metaSection[META_KEY_SAVE_DEBOUNCE_MS]);
        if (!isFinite(debounceMs) || debounceMs < 50) debounceMs  =  350;
        metaSection[META_KEY_SAVE_DEBOUNCE_MS]  =  Math.round(debounceMs);

        previewSection[PREVIEW_KEY_OVERRIDE_ENABLED]  =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_OVERRIDE_ENABLED], true);
        previewSection[PREVIEW_KEY_PERSIST_POS]       =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_PERSIST_POS], true);
        previewSection[PREVIEW_KEY_PERSIST_SECTIONS]  =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_PERSIST_SECTIONS], true);
        previewSection[PREVIEW_KEY_PERSIST_VIEW]      =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_PERSIST_VIEW], true);

        previewSection[PREVIEW_KEY_MENU_X]            =  ValeSpec__MenuDataHandler__ToPixelNumber(previewSection[PREVIEW_KEY_MENU_X]);
        previewSection[PREVIEW_KEY_MENU_Y]            =  ValeSpec__MenuDataHandler__ToPixelNumber(previewSection[PREVIEW_KEY_MENU_Y]);
        previewSection[PREVIEW_KEY_OPEN_DIAGRAMS]     =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_OPEN_DIAGRAMS], true);
        previewSection[PREVIEW_KEY_OPEN_DOCUMENT]     =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_OPEN_DOCUMENT], true);
        previewSection[PREVIEW_KEY_OPEN_ACTIONS]      =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_OPEN_ACTIONS], true);
        previewSection[PREVIEW_KEY_DIAGRAM_MODE]      =  ValeSpec__MenuDataHandler__NormalizeDiagramMode(previewSection[PREVIEW_KEY_DIAGRAM_MODE], 'small');
        previewSection[PREVIEW_KEY_SHOW_FULL]         =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_SHOW_FULL], true);
        previewSection[PREVIEW_KEY_SHOW_SUMMARY]      =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_SHOW_SUMMARY], true);
        previewSection[PREVIEW_KEY_SHOW_NOTES]        =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_SHOW_NOTES], true);

        return mergedConfig;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Internal Helpers - Load and Save Pipeline
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read Defaults JSON File
    // ------------------------------------------------------------
    async function ValeSpec__MenuDataHandler__FetchDefaultsConfig() {
        var fallbackConfig  =  ValeSpec__MenuDataHandler__BuildFallbackDefaultsConfig();
        try {
            var response  =  await fetch(DEFAULTS_CONFIG_PATH, { cache: 'no-store' });
            if (!response.ok) throw new Error('Defaults config fetch failed: ' + response.status);
            var defaultsData  =  await response.json();
            return ValeSpec__MenuDataHandler__DeepMerge(
                ValeSpec__MenuDataHandler__Clone(fallbackConfig),
                ValeSpec__MenuDataHandler__Clone(defaultsData)
            );
        } catch (error) {
            console.warn('[ValeSpec__MenuDataHandler] Defaults config unavailable, using internal fallback:', error.message);
            return fallbackConfig;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read Existing Per-User Config from API
    // ------------------------------------------------------------
    async function ValeSpec__MenuDataHandler__FetchPersistedUserConfig(userSlug) {
        var requestUrl  =  USER_MENU_API_ROOT + encodeURIComponent(userSlug);
        try {
            var response  =  await fetch(requestUrl, { cache: 'no-store' });
            if (response.status === 404) return {};
            if (!response.ok) throw new Error('User menu config fetch failed: ' + response.status);
            var payload  =  await response.json();
            if (!payload || payload.ok !== true || !ValeSpec__MenuDataHandler__IsPlainObject(payload.data)) return {};
            return payload.data;
        } catch (error) {
            console.warn('[ValeSpec__MenuDataHandler] Persisted user menu read failed, using defaults:', error.message);
            return {};
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Read Main App Config Defaults Section
    // ------------------------------------------------------------
    async function ValeSpec__MenuDataHandler__FetchMainAppDefaultsSection() {
        try {
            var response  =  await fetch(MAIN_APP_CONFIG_PATH, { cache: 'no-store' });
            if (!response.ok) throw new Error('Main app config fetch failed: ' + response.status);
            var appConfigData  =  await response.json();
            if (!ValeSpec__MenuDataHandler__IsPlainObject(appConfigData)) return {};
            var appDefaultsSection  =  appConfigData[APP_DEFAULTS_SECTION_KEY];
            if (!ValeSpec__MenuDataHandler__IsPlainObject(appDefaultsSection)) return {};
            return appDefaultsSection;
        } catch (error) {
            console.warn('[ValeSpec__MenuDataHandler] Main app defaults unavailable, using defaults JSON:', error.message);
            return {};
        }
    }
    // ------------------------------------------------------------

    // HELPER FUNCTION | Map Main App Defaults to Preview Section Patch
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__BuildPreviewPatchFromMainAppDefaults(appDefaultsSection) {
        if (!ValeSpec__MenuDataHandler__IsPlainObject(appDefaultsSection)) return {};
        return {
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__OverrideEnabled'         : appDefaultsSection[APP_DEFAULTS_KEY_OVERRIDE_ENABLED],
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuPositionX'           : appDefaultsSection[APP_DEFAULTS_KEY_MENU_X],
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuPositionY'           : appDefaultsSection[APP_DEFAULTS_KEY_MENU_Y],
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuSectionDiagramsOpen' : appDefaultsSection[APP_DEFAULTS_KEY_OPEN_DIAGRAMS],
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuSectionDocumentOpen' : appDefaultsSection[APP_DEFAULTS_KEY_OPEN_DOCUMENT],
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__MenuSectionActionsOpen'  : appDefaultsSection[APP_DEFAULTS_KEY_OPEN_ACTIONS],
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__DiagramMode'             : appDefaultsSection[APP_DEFAULTS_KEY_DIAGRAM_MODE],
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__ShowFullSchedule'        : appDefaultsSection[APP_DEFAULTS_KEY_SHOW_FULL],
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__ShowSummary'             : appDefaultsSection[APP_DEFAULTS_KEY_SHOW_SUMMARY],
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__ShowJobNotes'            : appDefaultsSection[APP_DEFAULTS_KEY_SHOW_NOTES],
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__PersistMenuPosition'     : appDefaultsSection[APP_DEFAULTS_KEY_PERSIST_POS],
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__PersistMenuSectionState' : appDefaultsSection[APP_DEFAULTS_KEY_PERSIST_SECTIONS],
            'ValeSpec__UserMenu__ModeDocumentPreview__Config__PersistViewState'        : appDefaultsSection[APP_DEFAULTS_KEY_PERSIST_VIEW]
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Post Full Merged Config to API
    // ------------------------------------------------------------
    async function ValeSpec__MenuDataHandler__PostMergedConfig() {
        if (!ValeSpec__MenuDataHandler__MergedConfig) return false;
        var requestUrl  =  USER_MENU_API_ROOT + encodeURIComponent(ValeSpec__MenuDataHandler__ResolvedUserSlug);

        try {
            var response  =  await fetch(requestUrl, {
                method  : 'POST',
                headers : {
                    'Content-Type'             : 'application/json',
                    'X-ValeSpec-UpdateSource'  : 'DocPreviewMenuDataHandler'
                },
                body    : JSON.stringify(ValeSpec__MenuDataHandler__MergedConfig)
            });
            if (!response.ok) {
                throw new Error('User menu config save failed: ' + response.status);
            }
            return true;
        } catch (error) {
            console.warn('[ValeSpec__MenuDataHandler] Persisted user menu save failed:', error.message);
            return false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Ensure Defaults + Persisted Data Are Loaded
    // ------------------------------------------------------------
    async function ValeSpec__MenuDataHandler__EnsureLoaded() {
        if (ValeSpec__MenuDataHandler__IsLoaded && ValeSpec__MenuDataHandler__MergedConfig) {
            return ValeSpec__MenuDataHandler__MergedConfig;
        }
        if (ValeSpec__MenuDataHandler__LoadPromise) return ValeSpec__MenuDataHandler__LoadPromise;

        ValeSpec__MenuDataHandler__LoadPromise  =  (async function() {
            var defaultsConfig  =  await ValeSpec__MenuDataHandler__FetchDefaultsConfig();
            defaultsConfig      =  ValeSpec__MenuDataHandler__SanitizeMergedConfig(defaultsConfig);
            var appDefaultsSection  =  await ValeSpec__MenuDataHandler__FetchMainAppDefaultsSection();
            var appDefaultsPatch    =  ValeSpec__MenuDataHandler__BuildPreviewPatchFromMainAppDefaults(appDefaultsSection);
            defaultsConfig[DOC_PREVIEW_SECTION_KEY]  =  ValeSpec__MenuDataHandler__DeepMerge(
                ValeSpec__MenuDataHandler__Clone(defaultsConfig[DOC_PREVIEW_SECTION_KEY] || {}),
                ValeSpec__MenuDataHandler__Clone(appDefaultsPatch)
            );
            defaultsConfig  =  ValeSpec__MenuDataHandler__SanitizeMergedConfig(defaultsConfig);

            var metaSection  =  defaultsConfig[META_SECTION_KEY] || {};
            ValeSpec__MenuDataHandler__ResolvedUserSlug  =  String(metaSection[META_KEY_DEFAULT_USER_SLUG] || 'AdamW').trim() || 'AdamW';

            var persistedConfig  =  await ValeSpec__MenuDataHandler__FetchPersistedUserConfig(ValeSpec__MenuDataHandler__ResolvedUserSlug);
            var mergedConfig     =  ValeSpec__MenuDataHandler__DeepMerge(
                ValeSpec__MenuDataHandler__Clone(defaultsConfig),
                ValeSpec__MenuDataHandler__Clone(persistedConfig)
            );

            ValeSpec__MenuDataHandler__MergedConfig  =  ValeSpec__MenuDataHandler__SanitizeMergedConfig(mergedConfig);
            ValeSpec__MenuDataHandler__IsLoaded      =  true;
            window.dispatchEvent(new CustomEvent('ValeSpec__UserMenuConfigLoaded', {
                detail : {
                    userSlug : ValeSpec__MenuDataHandler__ResolvedUserSlug
                }
            }));
            return ValeSpec__MenuDataHandler__MergedConfig;
        })();

        return ValeSpec__MenuDataHandler__LoadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Queue Debounced Save of Current Merged Config
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__QueueSave() {
        if (!ValeSpec__MenuDataHandler__MergedConfig) return;
        if (ValeSpec__MenuDataHandler__SaveTimerHandle) {
            clearTimeout(ValeSpec__MenuDataHandler__SaveTimerHandle);
        }

        var metaSection  =  ValeSpec__MenuDataHandler__MergedConfig[META_SECTION_KEY] || {};
        var debounceMs   =  Number(metaSection[META_KEY_SAVE_DEBOUNCE_MS]);
        if (!isFinite(debounceMs) || debounceMs < 50) debounceMs  =  350;

        ValeSpec__MenuDataHandler__SaveTimerHandle  =  setTimeout(function() {
            ValeSpec__MenuDataHandler__SaveTimerHandle  =  null;
            ValeSpec__MenuDataHandler__LastWritePromise =  ValeSpec__MenuDataHandler__PostMergedConfig();
        }, Math.round(debounceMs));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Read Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve User Slug for Persisted Menu Data
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__GetResolvedUserSlug() {
        return ValeSpec__MenuDataHandler__ResolvedUserSlug || 'AdamW';
    }
    // ------------------------------------------------------------


    // FUNCTION | Return Boolean Load State
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__IsDataLoaded() {
        return ValeSpec__MenuDataHandler__IsLoaded;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Doc Preview View-State Persistence Override
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__GetDocPreviewViewStateOverride() {
        var previewSection  =  (ValeSpec__MenuDataHandler__MergedConfig && ValeSpec__MenuDataHandler__MergedConfig[DOC_PREVIEW_SECTION_KEY]) || {};
        if (!ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_OVERRIDE_ENABLED], true)) return null;
        if (!ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_PERSIST_VIEW], true)) return null;

        return {
            diagramMode       : ValeSpec__MenuDataHandler__NormalizeDiagramMode(previewSection[PREVIEW_KEY_DIAGRAM_MODE], 'small'),
            showFullSchedule  : ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_SHOW_FULL], true),
            showSummary       : ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_SHOW_SUMMARY], true),
            showJobNotes      : ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_SHOW_NOTES], true)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Doc Preview Floating Menu Persistence Override
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__GetDocPreviewMenuStateOverride() {
        var previewSection  =  (ValeSpec__MenuDataHandler__MergedConfig && ValeSpec__MenuDataHandler__MergedConfig[DOC_PREVIEW_SECTION_KEY]) || {};
        if (!ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_OVERRIDE_ENABLED], true)) return null;

        var persistPosition  =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_PERSIST_POS], true);
        var persistSections  =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_PERSIST_SECTIONS], true);

        return {
            persistMenuPosition  : persistPosition,
            persistSectionState  : persistSections,
            menuPositionX        : persistPosition ? ValeSpec__MenuDataHandler__ToPixelNumber(previewSection[PREVIEW_KEY_MENU_X]) : null,
            menuPositionY        : persistPosition ? ValeSpec__MenuDataHandler__ToPixelNumber(previewSection[PREVIEW_KEY_MENU_Y]) : null,
            sectionDiagramsOpen  : persistSections ? ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_OPEN_DIAGRAMS], true) : true,
            sectionDocumentOpen  : persistSections ? ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_OPEN_DOCUMENT], true) : true,
            sectionActionsOpen   : persistSections ? ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_OPEN_ACTIONS], true) : true
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Persist Patch Helpers
// -----------------------------------------------------------------------------

    // FUNCTION | Persist Doc Preview View-State Patch
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__QueuePersistDocPreviewViewPatch(viewPatch) {
        if (!ValeSpec__MenuDataHandler__MergedConfig || !ValeSpec__MenuDataHandler__IsPlainObject(viewPatch)) return;
        var previewSection  =  ValeSpec__MenuDataHandler__MergedConfig[DOC_PREVIEW_SECTION_KEY];
        if (!previewSection) return;
        if (!ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_OVERRIDE_ENABLED], true)) return;
        if (!ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_PERSIST_VIEW], true)) return;

        if (Object.prototype.hasOwnProperty.call(viewPatch, 'diagramMode')) {
            previewSection[PREVIEW_KEY_DIAGRAM_MODE]  =  ValeSpec__MenuDataHandler__NormalizeDiagramMode(viewPatch.diagramMode, previewSection[PREVIEW_KEY_DIAGRAM_MODE]);
        }
        if (Object.prototype.hasOwnProperty.call(viewPatch, 'showFullSchedule')) {
            previewSection[PREVIEW_KEY_SHOW_FULL]  =  !!viewPatch.showFullSchedule;
        }
        if (Object.prototype.hasOwnProperty.call(viewPatch, 'showSummary')) {
            previewSection[PREVIEW_KEY_SHOW_SUMMARY]  =  !!viewPatch.showSummary;
        }
        if (Object.prototype.hasOwnProperty.call(viewPatch, 'showJobNotes')) {
            previewSection[PREVIEW_KEY_SHOW_NOTES]  =  !!viewPatch.showJobNotes;
        }
        ValeSpec__MenuDataHandler__QueueSave();
    }
    // ------------------------------------------------------------


    // FUNCTION | Persist Doc Preview Floating Menu Patch
    // ------------------------------------------------------------
    function ValeSpec__MenuDataHandler__QueuePersistDocPreviewMenuPatch(menuPatch) {
        if (!ValeSpec__MenuDataHandler__MergedConfig || !ValeSpec__MenuDataHandler__IsPlainObject(menuPatch)) return;
        var previewSection  =  ValeSpec__MenuDataHandler__MergedConfig[DOC_PREVIEW_SECTION_KEY];
        if (!previewSection) return;
        if (!ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_OVERRIDE_ENABLED], true)) return;

        var persistPosition  =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_PERSIST_POS], true);
        var persistSections  =  ValeSpec__MenuDataHandler__ToBool(previewSection[PREVIEW_KEY_PERSIST_SECTIONS], true);

        if (persistPosition && Object.prototype.hasOwnProperty.call(menuPatch, 'menuPositionX')) {
            previewSection[PREVIEW_KEY_MENU_X]  =  ValeSpec__MenuDataHandler__ToPixelNumber(menuPatch.menuPositionX);
        }
        if (persistPosition && Object.prototype.hasOwnProperty.call(menuPatch, 'menuPositionY')) {
            previewSection[PREVIEW_KEY_MENU_Y]  =  ValeSpec__MenuDataHandler__ToPixelNumber(menuPatch.menuPositionY);
        }
        if (persistSections && Object.prototype.hasOwnProperty.call(menuPatch, 'sectionDiagramsOpen')) {
            previewSection[PREVIEW_KEY_OPEN_DIAGRAMS]  =  !!menuPatch.sectionDiagramsOpen;
        }
        if (persistSections && Object.prototype.hasOwnProperty.call(menuPatch, 'sectionDocumentOpen')) {
            previewSection[PREVIEW_KEY_OPEN_DOCUMENT]  =  !!menuPatch.sectionDocumentOpen;
        }
        if (persistSections && Object.prototype.hasOwnProperty.call(menuPatch, 'sectionActionsOpen')) {
            previewSection[PREVIEW_KEY_OPEN_ACTIONS]  =  !!menuPatch.sectionActionsOpen;
        }
        ValeSpec__MenuDataHandler__QueueSave();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Export
// -----------------------------------------------------------------------------

    // BOOT | Begin Async Config Load
    // ------------------------------------------------------------
    ValeSpec__MenuDataHandler__EnsureLoaded();
    // ------------------------------------------------------------


    // PUBLIC API
    // ------------------------------------------------------------
    return {
        ValeSpec__MenuDataHandler__EnsureLoaded                    : ValeSpec__MenuDataHandler__EnsureLoaded,
        ValeSpec__MenuDataHandler__IsDataLoaded                    : ValeSpec__MenuDataHandler__IsDataLoaded,
        ValeSpec__MenuDataHandler__GetResolvedUserSlug             : ValeSpec__MenuDataHandler__GetResolvedUserSlug,
        ValeSpec__MenuDataHandler__GetDocPreviewViewStateOverride  : ValeSpec__MenuDataHandler__GetDocPreviewViewStateOverride,
        ValeSpec__MenuDataHandler__GetDocPreviewMenuStateOverride  : ValeSpec__MenuDataHandler__GetDocPreviewMenuStateOverride,
        ValeSpec__MenuDataHandler__QueuePersistDocPreviewViewPatch : ValeSpec__MenuDataHandler__QueuePersistDocPreviewViewPatch,
        ValeSpec__MenuDataHandler__QueuePersistDocPreviewMenuPatch : ValeSpec__MenuDataHandler__QueuePersistDocPreviewMenuPatch
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.ValeSpec__DocPreview__MenuDataHandler  =  ValeSpec__DocPreview__MenuDataHandler;
