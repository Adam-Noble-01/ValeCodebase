/* =============================================================================
   VGHLANTERN - HIP SYSTEM LOADER
   =============================================================================

   FILE       : VghLantern__AppData__HipSystemLoader__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - HipSystemLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load the Vale hip system and prepare its sections
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - Owns VghLantern__HipSystem__Index__.json and the four hip profile assets it
     points at, and hands the render pipeline a ready-to-extrude description of
     the hip a given lantern is specified with.
   - Deliberately the mirror of the ridge system loader in shape, so a reader who
     has understood one has understood both, and neither depends on the other.

   THE TWO HIP TYPES:
       hipBeam       the standard: core, beam, blocking and flashing, built
       glazeBarHip   small lanterns with no jack rafters transition to a glaze
                     bar hip. The profiles and their build logic are not
                     authored yet, so the type is offered, recorded on the
                     project, and drawn as a hip beam with a warning until they
                     are. Offering it now is what lets a specification carry the
                     intent before the geometry exists.

   THE SECTION FRAME:
   - The hip sections are authored in the plane NORMAL to the hip line, with
     section 0,0 on the hip construction triangle - the line from the eaves datum
     corner up to the ridge end point. That is the same relationship the glaze
     bar sections have to their own datum polylines, which is why the hip needs
     no special case in the extruder.

   ============================================================================= */

// =============================================================================
// REGION | Hip System Loader Module
// =============================================================================

const VghLantern__AppData__HipSystemLoader = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Index Source Paths
    // ------------------------------------------------------------
    const LIBRARY_ROOT_PATH  =  '06__Data__LanternProfileLibrary/48_2000__HipElements__Profiles/';
    const INDEX_PATH         =  LIBRARY_ROOT_PATH + 'VghLantern__HipSystem__Index__.json';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Index Field Names
    // ------------------------------------------------------------
    const KEY_META    =  'VghLantern__HipSystem__Meta';
    const KEY_TYPES   =  'VghLantern__HipSystem__Types';
    const KEY_ANGLE   =  'VghLantern__HipSystem__SectionAngle';
    const KEY_ENDS    =  'VghLantern__HipSystem__EndTreatments';
    const KEY_PARTS   =  'VghLantern__HipSystem__Parts';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Lantern Config Location
    // ------------------------------------------------------------
    const RIDGE_BLOCK_KEY  =  'Lantern__RidgeAndHips__Config';
    const FIELD_TYPE_KEY   =  'Lantern__RidgeAndHips__Config__HipTypeKey';
    const FIELD_ADJUST_MM  =  'Lantern__RidgeAndHips__Config__HipDepthAdjustmentMm';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Build Fallback
    // ------------------------------------------------------------
    // The type key the system falls back to when the specified type has no
    // geometry yet. Named rather than assumed, so adding a third type does not
    // silently inherit the hip beam as its stand-in.
    const BUILDABLE_FALLBACK_TYPE  =  'hipBeam';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Memoised Index and Caches
    // ------------------------------------------------------------
    let VghLantern__HipSystemLoader__IndexData     =  null;                  // <-- Parsed system index
    let VghLantern__HipSystemLoader__LoadPromise   =  null;                  // <-- In-flight index load shared by concurrent callers
    let VghLantern__HipSystemLoader__AssetCache    =  {};                    // <-- AssetId -> parsed asset JSON
    let VghLantern__HipSystemLoader__AssetPromise  =  {};                    // <-- AssetId -> in-flight fetch
    let VghLantern__HipSystemLoader__FaceCache     =  {};                    // <-- AssetId -> stitched face result
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Index Loading
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Hip System Index and the Shared Depth Table (memoised)
    // ------------------------------------------------------------
    function VghLantern__HipSystemLoader__LoadIndex() {
        if (VghLantern__HipSystemLoader__LoadPromise) return VghLantern__HipSystemLoader__LoadPromise;

        VghLantern__HipSystemLoader__LoadPromise  =  (async function() {
            var DepthTable  =  window.VghLantern__AppData__RidgeHipDepthTable;
            if (DepthTable) await DepthTable.VghLantern__RidgeHipDepthTable__LoadTable();

            try {
                var response  =  await fetch(INDEX_PATH, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                VghLantern__HipSystemLoader__IndexData  =  await response.json();
                console.log('[VghLantern__HipSystemLoader] Hip system loaded ('
                    + VghLantern__HipSystemLoader__ListParts().length + ' parts, '
                    + VghLantern__HipSystemLoader__ListTypes().length + ' types).');

            } catch (error) {
                console.error('[VghLantern__HipSystemLoader] System index could not be loaded:', error.message);
                VghLantern__HipSystemLoader__IndexData  =  null;
            }

            return VghLantern__HipSystemLoader__IndexData;
        })();

        return VghLantern__HipSystemLoader__LoadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | List Every Part Slot the System Declares
    // ------------------------------------------------------------
    function VghLantern__HipSystemLoader__ListParts() {
        var index  =  VghLantern__HipSystemLoader__IndexData;
        return (index && Array.isArray(index[KEY_PARTS])) ? index[KEY_PARTS] : [];
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Single Part Slot by Key
    // ------------------------------------------------------------
    function VghLantern__HipSystemLoader__GetPart(partKey) {
        var parts  =  VghLantern__HipSystemLoader__ListParts();
        var i;

        for (i = 0; i < parts.length; i++) {
            if (parts[i] && parts[i].PartKey === partKey) return parts[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Selectable Hip Types
    // ------------------------------------------------------------
    function VghLantern__HipSystemLoader__ListTypes() {
        var index  =  VghLantern__HipSystemLoader__IndexData;
        return (index && Array.isArray(index[KEY_TYPES])) ? index[KEY_TYPES] : [];
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Hip Types as Editor Options
    // ------------------------------------------------------------
    // A type with no geometry yet is offered rather than hidden, and its hint
    // says so. Hiding it would mean a specification could not record that a
    // glaze bar hip was intended, which is the whole reason to list it early.
    function VghLantern__HipSystemLoader__ListTypeOptions() {
        var types  =  VghLantern__HipSystemLoader__ListTypes();
        var list   =  [];
        var i;

        for (i = 0; i < types.length; i++) {
            list.push({
                Value      : types[i].TypeKey,
                Label      : types[i].TypeName,
                Hint       : types[i].IsBuilt === false
                                ? (types[i].NotBuiltMessage || types[i].Note || '')
                                : (types[i].Note || ''),
                IsBuilt    : types[i].IsBuilt !== false,
                IsDefault  : types[i].IsDefault === true
            });
        }
        return list;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Hip Type Key Used When a Lantern Names None
    // ------------------------------------------------------------
    function VghLantern__HipSystemLoader__DefaultTypeKey() {
        var types  =  VghLantern__HipSystemLoader__ListTypes();
        var i;

        for (i = 0; i < types.length; i++) {
            if (types[i].IsDefault === true) return types[i].TypeKey;
        }
        return types.length > 0 ? types[0].TypeKey : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Hip Type a Lantern Is Specified With
    // ------------------------------------------------------------
    function VghLantern__HipSystemLoader__TypeKey(lantern) {
        var block   =  lantern ? lantern[RIDGE_BLOCK_KEY] : null;
        var stored  =  (block && block[FIELD_TYPE_KEY]) || '';
        var types   =  VghLantern__HipSystemLoader__ListTypes();
        var i;

        for (i = 0; i < types.length; i++) {
            if (types[i].TypeKey === stored) return stored;
        }

        if (stored) {
            console.warn('[VghLantern__HipSystemLoader] Unknown hip type "' + stored + '" - using the default.');
        }
        return VghLantern__HipSystemLoader__DefaultTypeKey();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Type Record a Lantern Is Specified With
    // ------------------------------------------------------------
    function VghLantern__HipSystemLoader__ResolvedType(lantern) {
        var key    =  VghLantern__HipSystemLoader__TypeKey(lantern);
        var types  =  VghLantern__HipSystemLoader__ListTypes();
        var i;

        for (i = 0; i < types.length; i++) {
            if (types[i].TypeKey === key) return types[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Type Actually Built, and Whether That Is What Was Asked For
    // ------------------------------------------------------------
    // A type declared IsBuilt false is drawn as the buildable fallback. The
    // substitution is REPORTED rather than silent: the caller pushes it into the
    // build summary as a warning, so the viewport and the specification both say
    // that what is on screen is not yet what was specified.
    function VghLantern__HipSystemLoader__BuildType(lantern) {
        var requested  =  VghLantern__HipSystemLoader__ResolvedType(lantern);
        if (!requested) return { Requested : null, Built : null, WasSubstituted : false, Message : '' };

        if (requested.IsBuilt !== false) {
            return { Requested : requested, Built : requested, WasSubstituted : false, Message : '' };
        }

        var types  =  VghLantern__HipSystemLoader__ListTypes();
        var i, fallback  =  null;

        for (i = 0; i < types.length; i++) {
            if (types[i].TypeKey === BUILDABLE_FALLBACK_TYPE) { fallback  =  types[i]; break; }
        }

        return {
            Requested      : requested,
            Built          : fallback,
            WasSubstituted : true,
            Message        : requested.NotBuiltMessage || (requested.TypeName + ' is not built yet.')
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Hip Section Angle Reference (synchronous)
    // ------------------------------------------------------------
    // The authored angle and the roof pitch it was authored at. The geometry
    // module turns the pair into a delta rather than trusting either number on
    // its own, which is what keeps the CAD standard intact at 22.5 degrees.
    function VghLantern__HipSystemLoader__SectionAngleReference() {
        var index  =  VghLantern__HipSystemLoader__IndexData;
        return (index && index[KEY_ANGLE]) ? index[KEY_ANGLE] : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The End Treatment Numbers (synchronous)
    // ------------------------------------------------------------
    function VghLantern__HipSystemLoader__EndTreatments() {
        var index  =  VghLantern__HipSystemLoader__IndexData;
        return (index && index[KEY_ENDS]) ? index[KEY_ENDS] : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Depth Adjustment a Lantern Has Overridden the Hip By
    // ------------------------------------------------------------
    function VghLantern__HipSystemLoader__DepthAdjustmentMm(lantern) {
        var block  =  lantern ? lantern[RIDGE_BLOCK_KEY] : null;
        return block ? (Number(block[FIELD_ADJUST_MM]) || 0) : 0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Asset Fetching and Section Preparation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch One Asset File by Id (memoised, concurrency safe)
    // ------------------------------------------------------------
    function VghLantern__HipSystemLoader__LoadAsset(assetId, jsonUrl) {
        if (VghLantern__HipSystemLoader__AssetCache[assetId]) {
            return Promise.resolve(VghLantern__HipSystemLoader__AssetCache[assetId]);
        }
        if (VghLantern__HipSystemLoader__AssetPromise[assetId]) {
            return VghLantern__HipSystemLoader__AssetPromise[assetId];
        }

        VghLantern__HipSystemLoader__AssetPromise[assetId]  =  (async function() {
            try {
                var response  =  await fetch(LIBRARY_ROOT_PATH + jsonUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                var data  =  await response.json();
                VghLantern__HipSystemLoader__AssetCache[assetId]  =  data;
                return data;

            } catch (error) {
                console.error('[VghLantern__HipSystemLoader] Asset ' + assetId + ' failed to load:', error.message);
                return null;

            } finally {
                delete VghLantern__HipSystemLoader__AssetPromise[assetId];
            }
        })();

        return VghLantern__HipSystemLoader__AssetPromise[assetId];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stitch an Asset's Top Plan Into Closed Faces (memoised)
    // ------------------------------------------------------------
    async function VghLantern__HipSystemLoader__FacesForAsset(assetId, jsonUrl) {
        if (VghLantern__HipSystemLoader__FaceCache[assetId]) {
            return VghLantern__HipSystemLoader__FaceCache[assetId];
        }

        var LoopBuilder  =  window.VghLantern__Geometry__SectionLoopBuilder;
        if (!LoopBuilder) {
            console.error('[VghLantern__HipSystemLoader] SectionLoopBuilder is not loaded.');
            return null;
        }

        var asset  =  await VghLantern__HipSystemLoader__LoadAsset(assetId, jsonUrl);
        if (!asset) return null;

        var result  =  LoopBuilder.VghLantern__SectionLoopBuilder__BuildFacesFromAsset(asset);

        if (result.Warnings && result.Warnings.length > 0) {
            console.warn('[VghLantern__HipSystemLoader] Section warnings for ' + assetId + ':', result.Warnings);
        }

        VghLantern__HipSystemLoader__FaceCache[assetId]  =  result;
        return result;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Part Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Resolved Part Record
    // ------------------------------------------------------------
    async function VghLantern__HipSystemLoader__BuildPart(part) {
        var result  =  await VghLantern__HipSystemLoader__FacesForAsset(part.AssetId, part.JsonUrl);
        if (!result || !result.Faces || result.Faces.length === 0) return null;

        return {
            PartKey          : part.PartKey,
            PartName         : part.PartName,
            AssetId          : part.AssetId,
            ElementType      : part.ElementType  || '',
            ElementRole      : part.ElementRole  || '',
            SpecMaterial     : part.SpecMaterial || '',
            FinishPalette    : part.FinishPalette || '',
            FinishSource     : part.FinishSource  || '',
            SectionAreaSqMm  : result.AreaSqMm,
            DepthStretch     : part.DepthStretch    || null,
            PitchAdaptation  : part.PitchAdaptation || null,
            Faces            : result.Faces
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Describe Every Part of a Lantern's Hip Without Loading Geometry
    // ------------------------------------------------------------
    function VghLantern__HipSystemLoader__DescribeParts(lantern) {
        var build  =  VghLantern__HipSystemLoader__BuildType(lantern);
        var type   =  build.Built;
        if (!type || !Array.isArray(type.PartKeys)) return [];

        var described  =  [];
        var i, part;

        for (i = 0; i < type.PartKeys.length; i++) {
            part  =  VghLantern__HipSystemLoader__GetPart(type.PartKeys[i]);
            if (!part) continue;

            described.push({
                PartKey          : part.PartKey,
                PartName         : part.PartName,
                AssetId          : part.AssetId,
                ElementType      : part.ElementType,
                ElementRole      : part.ElementRole,
                SpecMaterial     : part.SpecMaterial,
                SectionMinXMm    : part.SectionMinXMm,
                SectionMaxXMm    : part.SectionMaxXMm,
                SectionMinYMm    : part.SectionMinYMm,
                SectionMaxYMm    : part.SectionMaxYMm,
                StretchesWithTimberDepth : part.StretchesWithTimberDepth === true
            });
        }

        return described;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Every Part of the Hip a Lantern Is Specified With
    // ------------------------------------------------------------
    // Returns { Parts, BuildType }. The build type travels with the parts because
    // a caller needs to know whether a substitution happened at the same moment
    // it learns what to draw, and asking twice invites the two answers to drift.
    async function VghLantern__HipSystemLoader__ResolveParts(lantern) {
        await VghLantern__HipSystemLoader__LoadIndex();

        var build  =  VghLantern__HipSystemLoader__BuildType(lantern);
        var type   =  build.Built;
        if (!type || !Array.isArray(type.PartKeys)) return { Parts : [], BuildType : build };

        var pending  =  [];
        var i, part;

        for (i = 0; i < type.PartKeys.length; i++) {
            part  =  VghLantern__HipSystemLoader__GetPart(type.PartKeys[i]);
            if (!part) continue;
            pending.push(VghLantern__HipSystemLoader__BuildPart(part));
        }

        var resolved  =  await Promise.all(pending);
        return {
            Parts     : resolved.filter(function(entry) { return entry !== null; }),
            BuildType : build
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__HipSystemLoader__LoadIndex              : VghLantern__HipSystemLoader__LoadIndex,
        VghLantern__HipSystemLoader__ListParts              : VghLantern__HipSystemLoader__ListParts,
        VghLantern__HipSystemLoader__GetPart                : VghLantern__HipSystemLoader__GetPart,
        VghLantern__HipSystemLoader__ListTypes              : VghLantern__HipSystemLoader__ListTypes,
        VghLantern__HipSystemLoader__ListTypeOptions        : VghLantern__HipSystemLoader__ListTypeOptions,
        VghLantern__HipSystemLoader__DefaultTypeKey         : VghLantern__HipSystemLoader__DefaultTypeKey,
        VghLantern__HipSystemLoader__TypeKey                : VghLantern__HipSystemLoader__TypeKey,
        VghLantern__HipSystemLoader__ResolvedType           : VghLantern__HipSystemLoader__ResolvedType,
        VghLantern__HipSystemLoader__BuildType              : VghLantern__HipSystemLoader__BuildType,
        VghLantern__HipSystemLoader__SectionAngleReference  : VghLantern__HipSystemLoader__SectionAngleReference,
        VghLantern__HipSystemLoader__EndTreatments          : VghLantern__HipSystemLoader__EndTreatments,
        VghLantern__HipSystemLoader__DepthAdjustmentMm      : VghLantern__HipSystemLoader__DepthAdjustmentMm,
        VghLantern__HipSystemLoader__DescribeParts          : VghLantern__HipSystemLoader__DescribeParts,
        VghLantern__HipSystemLoader__ResolveParts           : VghLantern__HipSystemLoader__ResolveParts
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppData__HipSystemLoader  =  VghLantern__AppData__HipSystemLoader;
