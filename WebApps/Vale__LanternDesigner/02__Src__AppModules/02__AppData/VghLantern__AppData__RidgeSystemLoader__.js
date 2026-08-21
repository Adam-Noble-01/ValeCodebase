/* =============================================================================
   VGHLANTERN - RIDGE SYSTEM LOADER
   =============================================================================

   FILE       : VghLantern__AppData__RidgeSystemLoader__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - RidgeSystemLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load the Vale ridge system and prepare its sections and its block
   CREATED    : 12-Aug-2026

   DESCRIPTION:
   - Owns VghLantern__RidgeSystem__Index__.json, the six ridge profile assets it
     points at, and the octagonal ridge block component that terminates them.
   - Hands the render pipeline a ready-to-extrude description of the ridge a
     given lantern is specified with, in the shape the glaze bar and base frame
     loaders already answer in, so the mesh builders read alike.
   - Fetches an asset once, stitches its Top Plan into closed faces once, and
     caches both. The capping alone is 1.1 MB and its section is 188 segments;
     the block is 9.5 MB of mesh.

   WHY THIS IS SEPARATE FROM THE HIP SYSTEM LOADER:
   - A ridge and a hip are separate operations. A future roof form may carry one
     without the other - a gable has ridge and no hips, and a pyramid has hips
     and no ridge - and neither loader should have to be told about a roof it is
     not building. The two share exactly one thing, the timber depth table, and
     that lives in its own module for precisely that reason.

   WHY THE INDEX IS HAND AUTHORED:
   - A folder scan cannot know which asset is the capping and which is the block
     it seats on, which two parts drop out on a leaded only ridge, or where the
     hinge sits on a section that has to re-slope with the roof pitch.

   ============================================================================= */

// =============================================================================
// REGION | Ridge System Loader Module
// =============================================================================

const VghLantern__AppData__RidgeSystemLoader = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | System Index Identity
    // ------------------------------------------------------------
    // A KEY rather than a path. The ridge reaches into BOTH libraries - swept
    // sections from the profile library, the octagonal block and the two end caps
    // from the component library - and used to name a root for each. It now names
    // neither: VghLantern__AppData__AssetRegistry resolves an id wherever it lives,
    // which is the whole reason a registry spans both libraries rather than one.
    const SYSTEM_INDEX_KEY  =  'ridge';
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Asset Registry This Loader Resolves Through
    // ------------------------------------------------------------
    // Throws rather than returning null, because a missing registry is a script
    // order fault and every symptom downstream of it is an unexplained absence.
    function VghLantern__RidgeSystemLoader__Registry() {
        var Registry  =  window.VghLantern__AppData__AssetRegistry;
        if (!Registry) {
            throw new Error('VghLantern__AppData__AssetRegistry is not loaded - check the script order in VghLantern__App__.html');
        }
        return Registry;
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Index Field Names
    // ------------------------------------------------------------
    const KEY_META    =  'VghLantern__RidgeSystem__Meta';
    const KEY_TYPES   =  'VghLantern__RidgeSystem__Types';
    const KEY_BLOCK   =  'VghLantern__RidgeSystem__BlockRelationship';
    const KEY_ENDCAP  =  'VghLantern__RidgeSystem__EndCapRelationship';
    const KEY_PARTS   =  'VghLantern__RidgeSystem__Parts';

    const PART_KEY_CAPPING  =  'capping';                                    // <-- The part the end cap exists to finish
    const ANCHOR_ROLE_APEX  =  'apex';                                       // <-- Takes the pyramid variant with no ridge return
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Lantern Config Location
    // ------------------------------------------------------------
    const RIDGE_BLOCK_KEY  =  'Lantern__RidgeAndHips__Config';
    const FIELD_TYPE_KEY   =  'Lantern__RidgeAndHips__Config__RidgeTypeKey';
    const FIELD_ADJUST_MM  =  'Lantern__RidgeAndHips__Config__RidgeDepthAdjustmentMm';
    const FIELD_CAP_FINISH =  'Lantern__RidgeAndHips__Config__CappingFinish';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Memoised Index and Caches
    // ------------------------------------------------------------
    let VghLantern__RidgeSystemLoader__IndexData     =  null;                // <-- Parsed system index
    let VghLantern__RidgeSystemLoader__LoadPromise   =  null;                // <-- In-flight index load shared by concurrent callers
    let VghLantern__RidgeSystemLoader__AssetCache    =  {};                  // <-- AssetId -> parsed asset JSON
    let VghLantern__RidgeSystemLoader__AssetPromise  =  {};                  // <-- AssetId -> in-flight fetch
    let VghLantern__RidgeSystemLoader__FaceCache     =  {};                  // <-- AssetId -> stitched face result
    let VghLantern__RidgeSystemLoader__PartAsset     =  {};                  // <-- AssetId -> parsed component library asset
    let VghLantern__RidgeSystemLoader__PartPromise   =  {};                  // <-- AssetId -> in-flight component fetch
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Index Loading
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Ridge System Index and the Shared Depth Table (memoised)
    // ------------------------------------------------------------
    // The depth table is awaited here rather than left to the caller, because
    // every answer this loader gives about the ridge beam depends on it and a
    // caller that forgot would get the authored 230mm at every pitch without
    // anything looking wrong.
    function VghLantern__RidgeSystemLoader__LoadIndex() {
        if (VghLantern__RidgeSystemLoader__LoadPromise) return VghLantern__RidgeSystemLoader__LoadPromise;

        VghLantern__RidgeSystemLoader__LoadPromise  =  (async function() {
            var DepthTable  =  window.VghLantern__AppData__RidgeHipDepthTable;
            if (DepthTable) await DepthTable.VghLantern__RidgeHipDepthTable__LoadTable();

            try {
                await VghLantern__RidgeSystemLoader__Registry().VghLantern__AssetRegistry__Load();

                var indexUrl  =  VghLantern__RidgeSystemLoader__Registry().VghLantern__AssetRegistry__SystemIndexUrl(SYSTEM_INDEX_KEY);
                if (!indexUrl) throw new Error('the asset registry carries no "' + SYSTEM_INDEX_KEY + '" system index');

                var response  =  await fetch(indexUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                VghLantern__RidgeSystemLoader__IndexData  =  await response.json();
                console.log('[VghLantern__RidgeSystemLoader] Ridge system loaded ('
                    + VghLantern__RidgeSystemLoader__ListParts().length + ' parts, '
                    + VghLantern__RidgeSystemLoader__ListTypes().length + ' types).');

            } catch (error) {
                console.error('[VghLantern__RidgeSystemLoader] System index could not be loaded:', error.message);
                VghLantern__RidgeSystemLoader__IndexData  =  null;
            }

            return VghLantern__RidgeSystemLoader__IndexData;
        })();

        return VghLantern__RidgeSystemLoader__LoadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | List Every Part Slot the System Declares
    // ------------------------------------------------------------
    function VghLantern__RidgeSystemLoader__ListParts() {
        var index  =  VghLantern__RidgeSystemLoader__IndexData;
        return (index && Array.isArray(index[KEY_PARTS])) ? index[KEY_PARTS] : [];
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Single Part Slot by Key
    // ------------------------------------------------------------
    function VghLantern__RidgeSystemLoader__GetPart(partKey) {
        var parts  =  VghLantern__RidgeSystemLoader__ListParts();
        var i;

        for (i = 0; i < parts.length; i++) {
            if (parts[i] && parts[i].PartKey === partKey) return parts[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Selectable Ridge Types
    // ------------------------------------------------------------
    // Shape matches what the editor's select control expects, so the type picker
    // consumes it with no adapter.
    function VghLantern__RidgeSystemLoader__ListTypes() {
        var index  =  VghLantern__RidgeSystemLoader__IndexData;
        return (index && Array.isArray(index[KEY_TYPES])) ? index[KEY_TYPES] : [];
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Ridge Types as Editor Options
    // ------------------------------------------------------------
    function VghLantern__RidgeSystemLoader__ListTypeOptions() {
        var types  =  VghLantern__RidgeSystemLoader__ListTypes();
        var list   =  [];
        var i;

        for (i = 0; i < types.length; i++) {
            list.push({
                Value      : types[i].TypeKey,
                Label      : types[i].TypeName,
                Hint       : types[i].Note || '',
                IsDefault  : types[i].IsDefault === true
            });
        }
        return list;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Ridge Type Key Used When a Lantern Names None
    // ------------------------------------------------------------
    function VghLantern__RidgeSystemLoader__DefaultTypeKey() {
        var types  =  VghLantern__RidgeSystemLoader__ListTypes();
        var i;

        for (i = 0; i < types.length; i++) {
            if (types[i].IsDefault === true) return types[i].TypeKey;
        }
        return types.length > 0 ? types[0].TypeKey : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Ridge Type a Lantern Is Specified With
    // ------------------------------------------------------------
    // A stored key that is no longer in the system falls back to the default and
    // says so, the same way an unknown glaze bar trim option does.
    function VghLantern__RidgeSystemLoader__TypeKey(lantern) {
        var block   =  lantern ? lantern[RIDGE_BLOCK_KEY] : null;
        var stored  =  (block && block[FIELD_TYPE_KEY]) || '';
        var types   =  VghLantern__RidgeSystemLoader__ListTypes();
        var i;

        for (i = 0; i < types.length; i++) {
            if (types[i].TypeKey === stored) return stored;
        }

        if (stored) {
            console.warn('[VghLantern__RidgeSystemLoader] Unknown ridge type "' + stored + '" - using the default.');
        }
        return VghLantern__RidgeSystemLoader__DefaultTypeKey();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Type Record a Lantern Is Specified With
    // ------------------------------------------------------------
    function VghLantern__RidgeSystemLoader__ResolvedType(lantern) {
        var key    =  VghLantern__RidgeSystemLoader__TypeKey(lantern);
        var types  =  VghLantern__RidgeSystemLoader__ListTypes();
        var i;

        for (i = 0; i < types.length; i++) {
            if (types[i].TypeKey === key) return types[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether This Lantern's Ridge Can Carry Finials and Cresting
    // ------------------------------------------------------------
    // Both weld to the aluminium capping, so a leaded only ridge has nothing to
    // fix them to. Answered from the index rather than from a type name test, so
    // a third ridge type would not need this function edited.
    //
    // Answers true before the index loads. A control that hid itself while its
    // own data was still in flight would flicker on every page load, and the
    // default ridge type carries a capping anyway.
    function VghLantern__RidgeSystemLoader__AllowsFinials(lantern) {
        var type  =  VghLantern__RidgeSystemLoader__ResolvedType(lantern);
        return type ? type.AllowsFinials !== false : true;
    }
    function VghLantern__RidgeSystemLoader__AllowsCresting(lantern) {
        var type  =  VghLantern__RidgeSystemLoader__ResolvedType(lantern);
        return type ? type.AllowsCresting !== false : true;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Block Relationship Numbers (synchronous)
    // ------------------------------------------------------------
    // The facet inset and the stretch split the ridge block is placed and
    // resized by. Answered from the index so the geometry module stays
    // synchronous and needs no asset fetch to reason about the junction.
    function VghLantern__RidgeSystemLoader__BlockRelationship() {
        var index  =  VghLantern__RidgeSystemLoader__IndexData;
        return (index && index[KEY_BLOCK]) ? index[KEY_BLOCK] : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The End Cap Relationship Numbers (synchronous)
    // ------------------------------------------------------------
    // The capping inset, the seating band and the two cap variants. Answered from
    // the index for the same reason the block relationship is: the geometry module
    // has to know how far to cut the capping back without fetching a 3.5 MB mesh
    // to measure it.
    function VghLantern__RidgeSystemLoader__EndCapRelationship() {
        var index  =  VghLantern__RidgeSystemLoader__IndexData;
        return (index && index[KEY_ENDCAP]) ? index[KEY_ENDCAP] : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Cap Variant an Anchor Role Takes
    // ------------------------------------------------------------
    // An apex takes the pyramid variant with no ridge return; a ridge end takes the
    // one with the capping socket. Returns null when the index declares no cap for
    // the role, which is how a variant that has not been drawn yet reports itself
    // rather than by throwing halfway through a build.
    function VghLantern__RidgeSystemLoader__EndCapVariant(anchorRole) {
        var relationship  =  VghLantern__RidgeSystemLoader__EndCapRelationship();
        if (!relationship) return null;

        var variant  =  (anchorRole === ANCHOR_ROLE_APEX) ? relationship.Apex : relationship.RidgeEnd;
        if (!variant || !variant.AssetId) return null;

        return variant;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether This Lantern's Ridge Carries End Caps
    // ------------------------------------------------------------
    // The cap finishes the aluminium capping, so a type without the capping part
    // has nothing for it to finish. Tested against the type's own part list rather
    // than against a type name, so a third ridge type would need no edit here.
    //
    // Answers true before the index loads, for the same reason AllowsFinials does:
    // the default type carries a capping, and a cap that vanished for the first
    // frame of every page load would read as a fault rather than as a load.
    function VghLantern__RidgeSystemLoader__AllowsEndCaps(lantern) {
        var type  =  VghLantern__RidgeSystemLoader__ResolvedType(lantern);
        if (!type || !Array.isArray(type.PartKeys)) return true;

        return type.PartKeys.indexOf(PART_KEY_CAPPING) !== -1;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Depth Adjustment a Lantern Has Overridden the Ridge By
    // ------------------------------------------------------------
    function VghLantern__RidgeSystemLoader__DepthAdjustmentMm(lantern) {
        var block  =  lantern ? lantern[RIDGE_BLOCK_KEY] : null;
        return block ? (Number(block[FIELD_ADJUST_MM]) || 0) : 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Finish the Aluminium Capping Is Specified In
    // ------------------------------------------------------------
    // Empty is passed straight through rather than substituted. The material
    // library answers an unknown finish with its documented neutral fallback,
    // which deliberately matches no real product, so a project that reached the
    // renderer un-normalised shows as wrong rather than as a plausible capping in
    // the wrong colour.
    function VghLantern__RidgeSystemLoader__CappingFinish(lantern) {
        var block  =  lantern ? lantern[RIDGE_BLOCK_KEY] : null;
        return block ? (block[FIELD_CAP_FINISH] || '') : '';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Asset Fetching and Section Preparation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch One Asset File by Id (memoised, concurrency safe)
    // ------------------------------------------------------------
    function VghLantern__RidgeSystemLoader__LoadAsset(assetId) {
        if (VghLantern__RidgeSystemLoader__AssetCache[assetId]) {
            return Promise.resolve(VghLantern__RidgeSystemLoader__AssetCache[assetId]);
        }
        if (VghLantern__RidgeSystemLoader__AssetPromise[assetId]) {
            return VghLantern__RidgeSystemLoader__AssetPromise[assetId];
        }

        VghLantern__RidgeSystemLoader__AssetPromise[assetId]  =  (async function() {
            try {
                var assetUrl  =  VghLantern__RidgeSystemLoader__Registry().VghLantern__AssetRegistry__Url(assetId);
                if (!assetUrl) throw new Error('the asset registry carries no entry for this id');

                var response  =  await fetch(assetUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                var data  =  await response.json();
                VghLantern__RidgeSystemLoader__AssetCache[assetId]  =  data;
                return data;

            } catch (error) {
                console.error('[VghLantern__RidgeSystemLoader] Asset ' + assetId + ' failed to load:', error.message);
                return null;

            } finally {
                delete VghLantern__RidgeSystemLoader__AssetPromise[assetId];
            }
        })();

        return VghLantern__RidgeSystemLoader__AssetPromise[assetId];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stitch an Asset's Top Plan Into Closed Faces (memoised)
    // ------------------------------------------------------------
    // The section is the same on every rebuild, so the stitch is done once per
    // asset for the life of the page. The pitch and depth transforms downstream
    // work on COPIES of what this returns, so the cached stitch stays authored.
    async function VghLantern__RidgeSystemLoader__FacesForAsset(assetId) {
        if (VghLantern__RidgeSystemLoader__FaceCache[assetId]) {
            return VghLantern__RidgeSystemLoader__FaceCache[assetId];
        }

        var LoopBuilder  =  window.VghLantern__Geometry__SectionLoopBuilder;
        if (!LoopBuilder) {
            console.error('[VghLantern__RidgeSystemLoader] SectionLoopBuilder is not loaded.');
            return null;
        }

        var asset  =  await VghLantern__RidgeSystemLoader__LoadAsset(assetId);
        if (!asset) return null;

        var result  =  LoopBuilder.VghLantern__SectionLoopBuilder__BuildFacesFromAsset(asset);

        if (result.Warnings && result.Warnings.length > 0) {
            console.warn('[VghLantern__RidgeSystemLoader] Section warnings for ' + assetId + ':', result.Warnings);
        }

        VghLantern__RidgeSystemLoader__FaceCache[assetId]  =  result;
        return result;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch One Component Library Asset (memoised, concurrency safe)
    // ------------------------------------------------------------
    // The block and both end cap variants are mesh components rather than swept
    // sections, so they come from the component library rather than the profile
    // library and are returned as raw asset documents. Turning a Na__Asset__Mesh3D
    // block into a buffer geometry is the Env3d MeshJson loader's job and encoding
    // it for SketchUp is the mesh codec's; this loader only fetches.
    //
    // Keyed by asset id and shared by every caller, so two placements of one cap,
    // the 2D renderer and the projected edges stage all cost a single fetch.
    function VghLantern__RidgeSystemLoader__LoadComponentAsset(assetId, label) {
        if (VghLantern__RidgeSystemLoader__PartAsset[assetId]) {
            return Promise.resolve(VghLantern__RidgeSystemLoader__PartAsset[assetId]);
        }
        if (VghLantern__RidgeSystemLoader__PartPromise[assetId]) {
            return VghLantern__RidgeSystemLoader__PartPromise[assetId];
        }

        VghLantern__RidgeSystemLoader__PartPromise[assetId]  =  (async function() {
            try {
                var assetUrl  =  VghLantern__RidgeSystemLoader__Registry().VghLantern__AssetRegistry__Url(assetId);
                if (!assetUrl) throw new Error('the asset registry carries no entry for this id');

                var response  =  await fetch(assetUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                VghLantern__RidgeSystemLoader__PartAsset[assetId]  =  await response.json();
                return VghLantern__RidgeSystemLoader__PartAsset[assetId];

            } catch (error) {
                console.error('[VghLantern__RidgeSystemLoader] ' + label + ' failed to load:', error.message);
                return null;

            } finally {
                delete VghLantern__RidgeSystemLoader__PartPromise[assetId];
            }
        })();

        return VghLantern__RidgeSystemLoader__PartPromise[assetId];
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Component Library Asset Already Resident (synchronous)
    // ------------------------------------------------------------
    // For the 2D renderers, which draw whatever is resident and ask for a redraw
    // when the rest lands rather than stalling a viewport behind a megabyte fetch.
    function VghLantern__RidgeSystemLoader__PeekComponentAsset(assetId) {
        return VghLantern__RidgeSystemLoader__PartAsset[assetId] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the Octagonal Ridge Block Component (memoised)
    // ------------------------------------------------------------
    function VghLantern__RidgeSystemLoader__LoadBlockAsset() {
        return (async function() {
            await VghLantern__RidgeSystemLoader__LoadIndex();

            var relationship  =  VghLantern__RidgeSystemLoader__BlockRelationship();
            if (!relationship || !relationship.BlockAssetId) {
                console.error('[VghLantern__RidgeSystemLoader] The index declares no ridge block.');
                return null;
            }

            return VghLantern__RidgeSystemLoader__LoadComponentAsset(relationship.BlockAssetId, 'Ridge block');
        })();
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the End Cap Variant for an Anchor Role (memoised)
    // ------------------------------------------------------------
    // Null when the index declares no cap for that role. The pyramid variant is a
    // separate asset from the ridge end one and is fetched only by a lantern that
    // has an apex, so a hipped roof never pays for it.
    function VghLantern__RidgeSystemLoader__LoadEndCapAsset(anchorRole) {
        return (async function() {
            await VghLantern__RidgeSystemLoader__LoadIndex();

            var variant  =  VghLantern__RidgeSystemLoader__EndCapVariant(anchorRole);
            if (!variant) {
                console.error('[VghLantern__RidgeSystemLoader] The index declares no end cap for the "'
                    + anchorRole + '" anchor role.');
                return null;
            }

            return VghLantern__RidgeSystemLoader__LoadComponentAsset(
                variant.AssetId, 'Ridge end cap ' + variant.AssetId);
        })();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Part Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Resolved Part Record
    // ------------------------------------------------------------
    // SectionAreaSqMm is taken from the stitched geometry rather than from the
    // index, so the number a takeoff multiplies by a ridge length is measured
    // from the same outline that was extruded.
    //
    // DepthStretch and PitchAdaptation are carried through untouched. They are
    // the geometry module's instructions, and this loader deliberately does not
    // read them: fetching and stitching is one job, adapting a section to a roof
    // is another.
    async function VghLantern__RidgeSystemLoader__BuildPart(part) {
        var result  =  await VghLantern__RidgeSystemLoader__FacesForAsset(part.AssetId);
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


    // FUNCTION | Describe Every Part of a Lantern's Ridge Without Loading Geometry
    // ------------------------------------------------------------
    // The synchronous counterpart to ResolveParts, answered from the index alone.
    // The quantity takeoff needs a part's name, element type, specification
    // material and section extents inside a synchronous solve, and never needs
    // the outline. Fetching six asset files, one of them 1.1 MB, to read five
    // fields already in the index would be the wrong trade.
    //
    // Returns an empty list until the index has loaded. The 3D build loads it, so
    // the takeoff for a lantern that has been drawn is always populated.
    function VghLantern__RidgeSystemLoader__DescribeParts(lantern) {
        var type  =  VghLantern__RidgeSystemLoader__ResolvedType(lantern);
        if (!type || !Array.isArray(type.PartKeys)) return [];

        var described  =  [];
        var i, part;

        for (i = 0; i < type.PartKeys.length; i++) {
            part  =  VghLantern__RidgeSystemLoader__GetPart(type.PartKeys[i]);
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


    // FUNCTION | Resolve Every Part of the Ridge a Lantern Is Specified With
    // ------------------------------------------------------------
    // Returns one record per part IN THE TYPE'S OWN ORDER, each with its stitched
    // faces ready for the geometry module to adapt. Parts resolve concurrently:
    // they are independent fetches and the capping is by far the largest file, so
    // serialising them would make every first build wait on it behind five others.
    //
    // The order matters and comes from the type rather than from the parts list,
    // because it is the order the assembly stacks in and the order a
    // specification reads best in: core, beam, blocking, flashing, then the two
    // capping parts on the type that has them.
    async function VghLantern__RidgeSystemLoader__ResolveParts(lantern) {
        await VghLantern__RidgeSystemLoader__LoadIndex();

        var type  =  VghLantern__RidgeSystemLoader__ResolvedType(lantern);
        if (!type || !Array.isArray(type.PartKeys)) return [];

        var pending  =  [];
        var i, part;

        for (i = 0; i < type.PartKeys.length; i++) {
            part  =  VghLantern__RidgeSystemLoader__GetPart(type.PartKeys[i]);
            if (!part) continue;
            pending.push(VghLantern__RidgeSystemLoader__BuildPart(part));
        }

        var resolved  =  await Promise.all(pending);
        return resolved.filter(function(entry) { return entry !== null; });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__RidgeSystemLoader__LoadIndex           : VghLantern__RidgeSystemLoader__LoadIndex,
        VghLantern__RidgeSystemLoader__ListParts           : VghLantern__RidgeSystemLoader__ListParts,
        VghLantern__RidgeSystemLoader__GetPart             : VghLantern__RidgeSystemLoader__GetPart,
        VghLantern__RidgeSystemLoader__ListTypes           : VghLantern__RidgeSystemLoader__ListTypes,
        VghLantern__RidgeSystemLoader__ListTypeOptions     : VghLantern__RidgeSystemLoader__ListTypeOptions,
        VghLantern__RidgeSystemLoader__DefaultTypeKey      : VghLantern__RidgeSystemLoader__DefaultTypeKey,
        VghLantern__RidgeSystemLoader__TypeKey             : VghLantern__RidgeSystemLoader__TypeKey,
        VghLantern__RidgeSystemLoader__ResolvedType        : VghLantern__RidgeSystemLoader__ResolvedType,
        VghLantern__RidgeSystemLoader__AllowsFinials       : VghLantern__RidgeSystemLoader__AllowsFinials,
        VghLantern__RidgeSystemLoader__AllowsCresting      : VghLantern__RidgeSystemLoader__AllowsCresting,
        VghLantern__RidgeSystemLoader__BlockRelationship   : VghLantern__RidgeSystemLoader__BlockRelationship,
        VghLantern__RidgeSystemLoader__EndCapRelationship  : VghLantern__RidgeSystemLoader__EndCapRelationship,
        VghLantern__RidgeSystemLoader__EndCapVariant       : VghLantern__RidgeSystemLoader__EndCapVariant,
        VghLantern__RidgeSystemLoader__AllowsEndCaps       : VghLantern__RidgeSystemLoader__AllowsEndCaps,
        VghLantern__RidgeSystemLoader__DepthAdjustmentMm   : VghLantern__RidgeSystemLoader__DepthAdjustmentMm,
        VghLantern__RidgeSystemLoader__CappingFinish       : VghLantern__RidgeSystemLoader__CappingFinish,
        VghLantern__RidgeSystemLoader__LoadBlockAsset      : VghLantern__RidgeSystemLoader__LoadBlockAsset,
        VghLantern__RidgeSystemLoader__LoadEndCapAsset     : VghLantern__RidgeSystemLoader__LoadEndCapAsset,
        VghLantern__RidgeSystemLoader__PeekComponentAsset  : VghLantern__RidgeSystemLoader__PeekComponentAsset,
        VghLantern__RidgeSystemLoader__DescribeParts       : VghLantern__RidgeSystemLoader__DescribeParts,
        VghLantern__RidgeSystemLoader__ResolveParts        : VghLantern__RidgeSystemLoader__ResolveParts
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppData__RidgeSystemLoader  =  VghLantern__AppData__RidgeSystemLoader;
