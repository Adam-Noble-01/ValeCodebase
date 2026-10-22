/* =============================================================================
   VGHLANTERN - 3D MEASURE TOOL | CONFIG ACCESS
   =============================================================================

   FILE       : VghLantern__Measure3d__ConfigAccess__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Measure3d - ConfigAccess
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Single read point for the measure tool configuration block
   CREATED    : 21-Oct-2026

   DESCRIPTION:
   - Every other module in this system reads its numbers and words through here
     rather than reaching into the global state itself, mirroring
     CrossSection__ConfigAccess.
   - Values come from Na__Measure3d__Config.json, merged into the app config by
     AppCore__ConfigLoader. Never from literals in the tool's modules.

   ---------------------------------------------------------------------------

   WHY THE FALLBACK SWITCHES THE TOOL OFF:
   The cross section falls back to working defaults because a surface may be
   mounted before the config merge completes. The measure tool is only ever
   switched on by a click in a menu that is itself built from this config, so
   before the config lands there is nothing to fall back for: the feature reads
   as disabled, and every other section simply does not exist yet.

   Millimetre conversion is NOT duplicated here - it is imported from
   Env3d__ConfigAccess, because there must be exactly one definition of the
   mm-to-world scale and exactly one place the model-space axis swap happens.

   ============================================================================= */

// =============================================================================
// REGION | Measure Tool Config Access
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const CONFIG_ROOT_KEY   =  'VghLantern__Measure3d__Config';               // <-- Top level key inside the merged app config
    const SECTION_PREFIX    =  'VghLantern__Measure3d__Config__';             // <-- Every subsection shares this prefix
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback Values Used Before Config Resolves
    // ------------------------------------------------------------
    const FALLBACK_SECTIONS  =  {
        Feature : { Enabled : false, MeasureSectionCuts : false }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reads
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Merged Measure Tool Config Root
    // ------------------------------------------------------------
    function VghLantern__Measure3d__ConfigAccess__Root() {
        const StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;                                       // <-- AppCore not loaded

        const appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return null;                                          // <-- Config not resolved yet

        return appConfig[CONFIG_ROOT_KEY] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Named Config Section
    // ------------------------------------------------------------
    // A section may be an object or an array (the Tools list is an array).
    export function VghLantern__Measure3d__ConfigAccess__Section(sectionName) {
        const root  =  VghLantern__Measure3d__ConfigAccess__Root();
        const live  =  root ? root[SECTION_PREFIX + sectionName] : null;

        if (live) return live;                                                // <-- Config authority: live values win

        return FALLBACK_SECTIONS[sectionName] || {};                          // <-- Documented pre-config fallback
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Single Value From a Config Section
    // ------------------------------------------------------------
    // No caller-supplied fallback, for the same reason Env3d__ConfigAccess offers
    // none: a second literal at the call site would only be a second place for the
    // same number to drift.
    export function VghLantern__Measure3d__ConfigAccess__Value(sectionName, fieldName) {
        const section  =  VghLantern__Measure3d__ConfigAccess__Section(sectionName);
        const value    =  section ? section[fieldName] : undefined;
        if (value !== undefined && value !== null) return value;

        const fallbackSection  =  FALLBACK_SECTIONS[sectionName] || {};
        return fallbackSection[fieldName];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Say Loudly Which Key Is Missing
    // ------------------------------------------------------------
    function VghLantern__Measure3d__ConfigAccess__Complain(kind, sectionName, fieldName) {
        console.error('[VghLantern__Measure3d__ConfigAccess] Missing or non-' + kind + ' config key "' + fieldName +
            '" in section "' + sectionName + '" (Na__Measure3d__Config.json -> ' + SECTION_PREFIX + sectionName + '). ' +
            'Add it to the JSON config - do not hardcode a fallback in JS.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Required Number from a Config Section
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__ConfigAccess__RequireNumber(sectionName, fieldName) {
        const value  =  VghLantern__Measure3d__ConfigAccess__Value(sectionName, fieldName);
        if (typeof value === 'number' && !isNaN(value)) return value;

        VghLantern__Measure3d__ConfigAccess__Complain('numeric', sectionName, fieldName);
        return 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Required String from a Config Section
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__ConfigAccess__RequireString(sectionName, fieldName) {
        const value  =  VghLantern__Measure3d__ConfigAccess__Value(sectionName, fieldName);
        if (typeof value === 'string' && value.length > 0) return value;

        VghLantern__Measure3d__ConfigAccess__Complain('string', sectionName, fieldName);
        return '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Required Boolean from a Config Section
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__ConfigAccess__RequireBoolean(sectionName, fieldName) {
        const value  =  VghLantern__Measure3d__ConfigAccess__Value(sectionName, fieldName);
        if (typeof value === 'boolean') return value;

        VghLantern__Measure3d__ConfigAccess__Complain('boolean', sectionName, fieldName);
        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Required Array from a Config Section
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__ConfigAccess__RequireArray(sectionName, fieldName) {
        const value  =  VghLantern__Measure3d__ConfigAccess__Value(sectionName, fieldName);
        if (Array.isArray(value)) return value;

        VghLantern__Measure3d__ConfigAccess__Complain('array', sectionName, fieldName);
        return [];
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Required Object (a Keyed Table of Words) from a Config Section
    // ------------------------------------------------------------
    export function VghLantern__Measure3d__ConfigAccess__RequireObject(sectionName, fieldName) {
        const value  =  VghLantern__Measure3d__ConfigAccess__Value(sectionName, fieldName);
        if (value && typeof value === 'object' && !Array.isArray(value)) return value;

        VghLantern__Measure3d__ConfigAccess__Complain('object', sectionName, fieldName);
        return {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
