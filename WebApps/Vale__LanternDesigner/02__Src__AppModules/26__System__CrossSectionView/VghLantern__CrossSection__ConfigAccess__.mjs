/* =============================================================================
   VGHLANTERN - CROSS SECTION VIEW | CONFIG ACCESS
   =============================================================================

   FILE       : VghLantern__CrossSection__ConfigAccess__.mjs
   NAMESPACE  : VghLantern
   MODULE     : CrossSection - ConfigAccess
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Single read point for the cross section configuration block
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - Every other module in this system reads its numbers through here rather than
     reaching into the global state itself, mirroring Env3d__ConfigAccess.
   - Values come from Na__CrossSection__Config.json, merged into the app config by
     AppCore__ConfigLoader. Never from hardcoded literals in the geometry modules.
   - Falls back to a documented default only while the config is still resolving,
     which is the sole case where a 3D surface may be mounted before the merge
     completes.

   ---------------------------------------------------------------------------

   WHY THIS IS NOT Env3d__ConfigAccess:
   That module is bound to the VghLantern__Env3d__Config root and its own
   fallbacks. This system carries its own JSON file so the whole feature is one
   folder, which is the point of keeping it a separate system rather than another
   block inside the 3D environment.

   Millimetre conversion is NOT duplicated here - it is imported from
   Env3d__ConfigAccess, because there must be exactly one definition of the
   mm-to-world scale and exactly one place the model-space axis swap happens.

   ============================================================================= */

// =============================================================================
// REGION | Cross Section Config Access
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const CONFIG_ROOT_KEY   =  'VghLantern__CrossSection__Config';            // <-- Top level key inside the merged app config
    const SECTION_PREFIX    =  'VghLantern__CrossSection__Config__';          // <-- Every subsection shares this prefix
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback Values Used Before Config Resolves
    // ------------------------------------------------------------
    const FALLBACK_SECTIONS  =  {
        Feature    : { Enabled : true, HideGroundGridWhenCut : true },
        Appearance : { FillColour : '#f0f0f0', LineColour : '#323232', LineWidthPx : 2.0, FillInsetMm : 1.2, LineInsetMm : 0.4 },
        Tuning     : { WeldToleranceMm : 0.25, MinLoopAreaMm2 : 20, MaxCrossingSegments : 250000 }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reads
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Merged Cross Section Config Root
    // ------------------------------------------------------------
    function VghLantern__CrossSection__ConfigAccess__Root() {
        const StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;                                       // <-- AppCore not loaded

        const appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return null;                                          // <-- Config not resolved yet

        return appConfig[CONFIG_ROOT_KEY] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Named Config Section
    // ------------------------------------------------------------
    export function VghLantern__CrossSection__ConfigAccess__Section(sectionName) {
        const root  =  VghLantern__CrossSection__ConfigAccess__Root();
        const live  =  root ? root[SECTION_PREFIX + sectionName] : null;

        if (live) return live;                                                // <-- Config authority: live values win

        return FALLBACK_SECTIONS[sectionName] || {};                          // <-- Documented pre-config fallback
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Single Value From a Config Section
    // ------------------------------------------------------------
    // No caller-supplied fallback, for the same reason Env3d__ConfigAccess offers
    // none: Section() already resolves to live JSON or to the documented fallback
    // above, so a second literal at the call site would only be a second place for
    // the same number to drift.
    export function VghLantern__CrossSection__ConfigAccess__Value(sectionName, fieldName) {
        const section  =  VghLantern__CrossSection__ConfigAccess__Section(sectionName);
        const value    =  section ? section[fieldName] : undefined;
        if (value !== undefined && value !== null) return value;

        const fallbackSection  =  FALLBACK_SECTIONS[sectionName] || {};
        return fallbackSection[fieldName];
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Required Number from a Config Section
    // ------------------------------------------------------------
    export function VghLantern__CrossSection__ConfigAccess__RequireNumber(sectionName, fieldName) {
        const value  =  VghLantern__CrossSection__ConfigAccess__Value(sectionName, fieldName);
        if (typeof value === 'number' && !isNaN(value)) return value;

        console.error('[VghLantern__CrossSection__ConfigAccess] Missing or non-numeric config key "' + fieldName +
            '" in section "' + sectionName + '" (Na__CrossSection__Config.json -> ' + SECTION_PREFIX + sectionName + '). ' +
            'Add it to the JSON config - do not hardcode a fallback in JS.');
        return 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Required String from a Config Section
    // ------------------------------------------------------------
    export function VghLantern__CrossSection__ConfigAccess__RequireString(sectionName, fieldName) {
        const value  =  VghLantern__CrossSection__ConfigAccess__Value(sectionName, fieldName);
        if (typeof value === 'string' && value.length > 0) return value;

        console.error('[VghLantern__CrossSection__ConfigAccess] Missing or non-string config key "' + fieldName +
            '" in section "' + sectionName + '" (Na__CrossSection__Config.json -> ' + SECTION_PREFIX + sectionName + '). ' +
            'Add it to the JSON config - do not hardcode a fallback in JS.');
        return '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Required Boolean from a Config Section
    // ------------------------------------------------------------
    export function VghLantern__CrossSection__ConfigAccess__RequireBoolean(sectionName, fieldName) {
        const value  =  VghLantern__CrossSection__ConfigAccess__Value(sectionName, fieldName);
        if (typeof value === 'boolean') return value;

        console.error('[VghLantern__CrossSection__ConfigAccess] Missing or non-boolean config key "' + fieldName +
            '" in section "' + sectionName + '" (Na__CrossSection__Config.json -> ' + SECTION_PREFIX + sectionName + '). ' +
            'Add it to the JSON config - do not hardcode a fallback in JS.');
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
