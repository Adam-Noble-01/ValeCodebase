/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | CONFIG ACCESS
   =============================================================================

   FILE       : VghLantern__Env3d__ConfigAccess__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - ConfigAccess
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Single read point for the 3D environment configuration block
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Every other Env3d module reads its numbers through this module rather than
     reaching into the global state itself.
   - Honours the app config authority rule: values come from
     Na__Env3d__Config.json (merged into the app config by AppCore__ConfigLoader),
     never from hardcoded literals in the render modules.
   - Falls back to a documented default only when the config has not loaded yet,
     which is the sole case where the 3D panel may be mounted before config
     resolution completes.

   ---------------------------------------------------------------------------

   WHY THIS EXISTS AS A MODULE:
   The 3D stack is ESM while AppCore is classic script, so config arrives via the
   window-scoped StateManager. Centralising that bridge here keeps the awkward
   crossing in exactly one file.

   ============================================================================= */

// =============================================================================
// REGION | 3D Environment Config Access
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Config Section Keys
    // ------------------------------------------------------------
    const CONFIG_ROOT_KEY   =  'VghLantern__Env3d__Config';                  // <-- Top level key inside the merged app config
    const SECTION_PREFIX    =  'VghLantern__Env3d__Config__';                // <-- Every subsection shares this prefix
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Fallback Values Used Before Config Resolves
    // ------------------------------------------------------------
    const FALLBACK_SECTIONS  =  {
        Meta          : { WorldUnitsPerMillimetre : 0.001 },
        Renderer      : { Antialias : true, MaxPixelRatio : 2, ClearColorFallback : '#dfe3e6', PreserveDrawingBuffer : true, OnDemandRendering : true },
        Camera        : { FieldOfViewDegrees : 38, NearPlaneMm : 50, FarPlaneMm : 60000, FitPaddingFactor : 1.35 },
        Lighting      : { AmbientIntensity : 0.62, KeyLightIntensity : 1.05, FillLightIntensity : 0.38 },
        Materials     : { FrameColourFallback : '#f2efe9', GlazingColour : '#a8c8d8', GlazingOpacity : 0.22 },
        MeshBuilders  : { SkeletonMode : 'profileSweep', FallbackBarWidthMm : 40, FallbackBarDepthMm : 55 },
        Snapshot      : { DefaultWidthPx : 2000, DefaultHeightPx : 1400, SupersampleFactor : 2 }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reads
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Merged 3D Config Root
    // ------------------------------------------------------------
    function VghLantern__Env3d__ConfigAccess__Root() {
        const StateManager  =  window.VghLantern__AppCore__StateManager;
        if (!StateManager) return null;                                      // <-- AppCore not loaded

        const appConfig  =  StateManager.VghLantern__StateManager__GetAppConfig();
        if (!appConfig) return null;                                         // <-- Config not resolved yet

        return appConfig[CONFIG_ROOT_KEY] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Named Config Section
    // ------------------------------------------------------------
    export function VghLantern__Env3d__ConfigAccess__Section(sectionName) {
        const root  =  VghLantern__Env3d__ConfigAccess__Root();
        const live  =  root ? root[SECTION_PREFIX + sectionName] : null;

        if (live) return live;                                               // <-- Config authority: live values win

        return FALLBACK_SECTIONS[sectionName] || {};                         // <-- Documented pre-config fallback
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Single Value With an Explicit Default
    // ------------------------------------------------------------
    export function VghLantern__Env3d__ConfigAccess__Value(sectionName, fieldName, fallbackValue) {
        const section  =  VghLantern__Env3d__ConfigAccess__Section(sectionName);
        const value    =  section ? section[fieldName] : undefined;

        return (value === undefined || value === null) ? fallbackValue : value;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Live Config Has Resolved
    // ------------------------------------------------------------
    export function VghLantern__Env3d__ConfigAccess__IsResolved() {
        return !!VghLantern__Env3d__ConfigAccess__Root();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Unit Conversion Bridge
// -----------------------------------------------------------------------------

    // FUNCTION | Convert Millimetres to Three.js World Units
    // ------------------------------------------------------------
    // Delegates to the app-wide UnitConverter so there is exactly one definition
    // of the mm-to-world scale, and only falls back if AppUtils is absent.
    export function VghLantern__Env3d__ConfigAccess__MmToWorld(millimetres) {
        const UnitConverter  =  window.VghLantern__AppUtils__UnitConverter;
        if (UnitConverter) {
            return UnitConverter.VghLantern__UnitConverter__MmToWorld(millimetres);
        }

        const scale  =  VghLantern__Env3d__ConfigAccess__Value('Meta', 'WorldUnitsPerMillimetre', 0.001);
        return (Number(millimetres) || 0) * scale;
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert a Millimetre Point to a World Space Triple
    // ------------------------------------------------------------
    // Model space is +Z up; Three.js convention is +Y up, so the axes swap here.
    // This is the ONLY place that swap happens in the 3D environment.
    export function VghLantern__Env3d__ConfigAccess__PointToWorld(pointMm) {
        if (!pointMm) return { x: 0, y: 0, z: 0 };

        return {
            x :  VghLantern__Env3d__ConfigAccess__MmToWorld(pointMm.x),      // <-- Model +X stays as world +X
            y :  VghLantern__Env3d__ConfigAccess__MmToWorld(pointMm.z),      // <-- Model +Z up becomes world +Y up
            z : -VghLantern__Env3d__ConfigAccess__MmToWorld(pointMm.y)       // <-- Model +Y depth becomes world -Z to stay right handed
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
