/* =============================================================================
   VGHLANTERN - BASE FRAME SYSTEM LOADER
   =============================================================================

   FILE       : VghLantern__AppData__BaseFrameSystemLoader__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - BaseFrameSystemLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load the three part Vale base frame system and prepare its sections
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - Owns VghLantern__BaseFrameSystem__Index__.json and the three asset files it
     points at: the Sapele head beam (46_1001), the mill aluminium eaves
     extrusion (46_1002) and the lead cover flashing (46_1003).
   - Fetches an asset once, stitches its Top Plan into closed faces once, and
     caches both. The eaves extrusion alone is 330 kB with a 99 segment section,
     so neither the fetch nor the stitch should happen twice.
   - Also the synchronous authority on the eaves datum numbers: the head beam
     width and height, the datum rise above the seating benchmark, and the
     glaze bar end treatments at the eaves. The skeleton solver and the takeoff
     both run synchronously, so those numbers are answered from the index with
     documented fallbacks that match the shipped index values.

   WHY THIS IS SEPARATE FROM THE PROFILE AND COMPONENT LOADERS:
   - Same reasoning as the glaze bar system: a fixed assembly of parts that are
     only ever used together is knowledge about this system, not about
     catalogues, so it gets its own loader rather than teaching the catalogue
     loaders which entry fills which slot.

   IMPORTANT:
   - The system index is HAND AUTHORED. A folder scan cannot know which asset
     fills which slot.
   - This module is the single consumer of the base frame system index.

   ============================================================================= */

// =============================================================================
// REGION | Base Frame System Loader Module
// =============================================================================

const VghLantern__AppData__BaseFrameSystemLoader = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | System Index Identity
    // ------------------------------------------------------------
    // A KEY rather than a path. VghLantern__AppData__AssetRegistry resolves both
    // this loader's own index and every asset it names, so no folder is written
    // down here and a library that moves needs the registry rebuilt and nothing
    // else. This module carried a LIBRARY_ROOT_PATH and an INDEX_PATH until
    // 21-Aug-2026; see the registry's header for what that cost.
    const SYSTEM_INDEX_KEY  =  'baseFrame';
    // ------------------------------------------------------------

    // HELPER FUNCTION | The Asset Registry This Loader Resolves Through
    // ------------------------------------------------------------
    // Throws rather than returning null, because a missing registry is a script
    // order fault and every symptom downstream of it is an unexplained absence.
    function VghLantern__BaseFrameSystemLoader__Registry() {
        var Registry  =  window.VghLantern__AppData__AssetRegistry;
        if (!Registry) {
            throw new Error('VghLantern__AppData__AssetRegistry is not loaded - check the script order in VghLantern__App__.html');
        }
        return Registry;
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Index Field Names
    // ------------------------------------------------------------
    const KEY_META             =  'VghLantern__BaseFrameSystem__Meta';
    const KEY_DATUM_GEOMETRY   =  'VghLantern__BaseFrameSystem__DatumGeometry';
    const KEY_EAVES_INTERFACE  =  'VghLantern__BaseFrameSystem__EavesInterface';
    const KEY_PARTS            =  'VghLantern__BaseFrameSystem__Parts';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Datum Fallbacks
    // ------------------------------------------------------------
    // Used only before the index has loaded or if it fails to load. They match
    // the shipped index values exactly, so a solve that ran early agrees with a
    // solve that ran after the index arrived.
    const FALLBACK_DATUM_GEOMETRY  =  {
        HeadBeamWidthMm            : 125,
        HeadBeamHeightMm           : 96,
        EavesDatumRiseAboveSeatMm  : 100
    };

    const FALLBACK_EAVES_INTERFACE  =  {
        GlazeBarCoreExtensionAlongPitchMm  : 42.5,
        GlazeBarCapExtensionAlongPitchMm   : 170,
        GlazeBarTrimPlumbCutInsetMm        : 18
    };
    // ------------------------------------------------------------


    // MODULE VARIABLES | Memoised Index and Caches
    // ------------------------------------------------------------
    let VghLantern__BaseFrameSystemLoader__IndexData     =  null;            // <-- Parsed system index
    let VghLantern__BaseFrameSystemLoader__LoadPromise   =  null;            // <-- In-flight index load shared by concurrent callers
    let VghLantern__BaseFrameSystemLoader__AssetCache    =  {};              // <-- AssetId -> parsed asset JSON
    let VghLantern__BaseFrameSystemLoader__AssetPromise  =  {};              // <-- AssetId -> in-flight fetch
    let VghLantern__BaseFrameSystemLoader__FaceCache     =  {};              // <-- AssetId -> stitched face result
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Index Loading
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Base Frame System Index (memoised)
    // ------------------------------------------------------------
    function VghLantern__BaseFrameSystemLoader__LoadIndex() {
        if (VghLantern__BaseFrameSystemLoader__LoadPromise) return VghLantern__BaseFrameSystemLoader__LoadPromise;

        VghLantern__BaseFrameSystemLoader__LoadPromise  =  (async function() {
            try {
                await VghLantern__BaseFrameSystemLoader__Registry().VghLantern__AssetRegistry__Load();

                var indexUrl  =  VghLantern__BaseFrameSystemLoader__Registry().VghLantern__AssetRegistry__SystemIndexUrl(SYSTEM_INDEX_KEY);
                if (!indexUrl) throw new Error('the asset registry carries no "' + SYSTEM_INDEX_KEY + '" system index');

                var response  =  await fetch(indexUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                VghLantern__BaseFrameSystemLoader__IndexData  =  await response.json();
                console.log('[VghLantern__BaseFrameSystemLoader] Base frame system loaded ('
                    + VghLantern__BaseFrameSystemLoader__ListParts().length + ' parts).');

            } catch (error) {
                console.error('[VghLantern__BaseFrameSystemLoader] System index could not be loaded:', error.message);
                VghLantern__BaseFrameSystemLoader__IndexData  =  null;
            }

            return VghLantern__BaseFrameSystemLoader__IndexData;
        })();

        return VghLantern__BaseFrameSystemLoader__LoadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Part Slots the System Declares
    // ------------------------------------------------------------
    function VghLantern__BaseFrameSystemLoader__ListParts() {
        var index  =  VghLantern__BaseFrameSystemLoader__IndexData;
        return (index && Array.isArray(index[KEY_PARTS])) ? index[KEY_PARTS] : [];
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Single Part Slot by Key
    // ------------------------------------------------------------
    function VghLantern__BaseFrameSystemLoader__GetPart(partKey) {
        var parts  =  VghLantern__BaseFrameSystemLoader__ListParts();
        var i;

        for (i = 0; i < parts.length; i++) {
            if (parts[i] && parts[i].PartKey === partKey) return parts[i];
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Synchronous Datum Answers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read a Block With Numeric Fallbacks
    // ------------------------------------------------------------
    // Every field the fallback declares is guaranteed numeric in the answer, so
    // callers never null-check individual numbers mid-solve.
    function VghLantern__BaseFrameSystemLoader__BlockWithFallback(blockKey, fallbackBlock) {
        var index   =  VghLantern__BaseFrameSystemLoader__IndexData;
        var block   =  index ? index[blockKey] : null;
        var answer  =  {};
        var key, value;

        for (key in fallbackBlock) {
            value        =  block ? Number(block[key]) : NaN;
            answer[key]  =  isFinite(value) ? value : fallbackBlock[key];
        }

        if (block) {
            for (key in block) {
                if (!(key in answer)) answer[key]  =  block[key];
            }
        }
        return answer;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Eaves Datum Construction Numbers (synchronous)
    // ------------------------------------------------------------
    // Consumed inside the synchronous skeleton solve. Returns the head beam
    // width and height and the datum rise above the seating benchmark, from the
    // index when loaded, from matching fallbacks when not.
    function VghLantern__BaseFrameSystemLoader__DatumGeometry() {
        return VghLantern__BaseFrameSystemLoader__BlockWithFallback(KEY_DATUM_GEOMETRY, FALLBACK_DATUM_GEOMETRY);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Glaze Bar End Treatments at the Eaves (synchronous)
    // ------------------------------------------------------------
    // Core and cap extensions are measured ALONG THE PITCH past the eaves datum
    // and stay constant at every pitch; the trim plumb cut inset is a horizontal
    // measure from the datum point to the vertical cut plane.
    function VghLantern__BaseFrameSystemLoader__EavesInterface() {
        return VghLantern__BaseFrameSystemLoader__BlockWithFallback(KEY_EAVES_INTERFACE, FALLBACK_EAVES_INTERFACE);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Reslope Reference Vertices From the Index
    // ------------------------------------------------------------
    // Returns null before the index loads. The geometry module treats a null as
    // "sweep the sections exactly as exported" - the re-slope needs the named
    // reference vertices and cannot guess them.
    function VghLantern__BaseFrameSystemLoader__ReslopeReference() {
        var index  =  VghLantern__BaseFrameSystemLoader__IndexData;
        var block  =  index ? index[KEY_DATUM_GEOMETRY] : null;
        return (block && block.ReslopeReference) ? block.ReslopeReference : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Describe Every Part Without Loading Geometry (synchronous)
    // ------------------------------------------------------------
    // The quantity takeoff needs a part's name, element type, specification
    // material and section extents inside a synchronous solve, and never needs
    // the outline. Returns an empty list until the index has loaded.
    function VghLantern__BaseFrameSystemLoader__DescribeParts() {
        var parts      =  VghLantern__BaseFrameSystemLoader__ListParts();
        var described  =  [];
        var i, part;

        for (i = 0; i < parts.length; i++) {
            part  =  parts[i];
            if (!part) continue;

            described.push({
                PartKey       : part.PartKey,
                PartName      : part.PartName,
                AssetId       : part.AssetId,
                ElementType   : part.ElementType,
                SpecMaterial  : part.SpecMaterial,
                SectionMinXMm : part.SectionMinXMm,
                SectionMaxXMm : part.SectionMaxXMm,
                SectionMinYMm : part.SectionMinYMm,
                SectionMaxYMm : part.SectionMaxYMm
            });
        }
        return described;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Asset Fetching and Section Preparation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch One Asset File by Id (memoised, concurrency safe)
    // ------------------------------------------------------------
    function VghLantern__BaseFrameSystemLoader__LoadAsset(assetId) {
        if (VghLantern__BaseFrameSystemLoader__AssetCache[assetId]) {
            return Promise.resolve(VghLantern__BaseFrameSystemLoader__AssetCache[assetId]);
        }
        if (VghLantern__BaseFrameSystemLoader__AssetPromise[assetId]) {
            return VghLantern__BaseFrameSystemLoader__AssetPromise[assetId];
        }

        VghLantern__BaseFrameSystemLoader__AssetPromise[assetId]  =  (async function() {
            try {
                var assetUrl  =  VghLantern__BaseFrameSystemLoader__Registry().VghLantern__AssetRegistry__Url(assetId);
                if (!assetUrl) throw new Error('the asset registry carries no entry for this id');

                var response  =  await fetch(assetUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                var data  =  await response.json();
                VghLantern__BaseFrameSystemLoader__AssetCache[assetId]  =  data;
                return data;

            } catch (error) {
                console.error('[VghLantern__BaseFrameSystemLoader] Asset ' + assetId + ' failed to load:', error.message);
                return null;

            } finally {
                delete VghLantern__BaseFrameSystemLoader__AssetPromise[assetId];
            }
        })();

        return VghLantern__BaseFrameSystemLoader__AssetPromise[assetId];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stitch an Asset's Top Plan Into Closed Faces (memoised)
    // ------------------------------------------------------------
    // The cached faces are PRISTINE, exactly as exported. Pitch transforms
    // (rotating the eaves extrusion, re-sloping the beam and flashing tops) are
    // applied by the geometry module per solve onto copies - never onto these.
    async function VghLantern__BaseFrameSystemLoader__FacesForAsset(assetId) {
        if (VghLantern__BaseFrameSystemLoader__FaceCache[assetId]) {
            return VghLantern__BaseFrameSystemLoader__FaceCache[assetId];
        }

        var LoopBuilder  =  window.VghLantern__Geometry__SectionLoopBuilder;
        if (!LoopBuilder) {
            console.error('[VghLantern__BaseFrameSystemLoader] SectionLoopBuilder is not loaded.');
            return null;
        }

        var asset  =  await VghLantern__BaseFrameSystemLoader__LoadAsset(assetId);
        if (!asset) return null;

        var result  =  LoopBuilder.VghLantern__SectionLoopBuilder__BuildFacesFromAsset(asset);

        if (result.Warnings && result.Warnings.length > 0) {
            console.warn('[VghLantern__BaseFrameSystemLoader] Section warnings for ' + assetId + ':', result.Warnings);
        }

        VghLantern__BaseFrameSystemLoader__FaceCache[assetId]  =  result;
        return result;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Part Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Resolved Part Record
    // ------------------------------------------------------------
    async function VghLantern__BaseFrameSystemLoader__BuildPart(part) {
        var result  =  await VghLantern__BaseFrameSystemLoader__FacesForAsset(part.AssetId);
        if (!result || !result.Faces || result.Faces.length === 0) return null;

        return {
            PartKey               : part.PartKey,
            PartName              : part.PartName,
            AssetId               : part.AssetId,
            ElementType           : part.ElementType  || '',
            SpecMaterial          : part.SpecMaterial || '',
            InheritsFrameFinish   : part.InheritsFrameFinish === true,
            RotatesWithRoofPitch  : part.RotatesWithRoofPitch === true,
            ReslopesWithRoofPitch : part.ReslopesWithRoofPitch === true,
            SectionAreaSqMm       : result.AreaSqMm,
            Faces                 : result.Faces
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Every Part With Its Stitched Faces
    // ------------------------------------------------------------
    // Returns one record per part, each with its pristine stitched faces. The
    // three parts resolve concurrently - they are independent fetches and the
    // eaves extrusion is by far the largest file.
    async function VghLantern__BaseFrameSystemLoader__ResolveParts() {
        await VghLantern__BaseFrameSystemLoader__LoadIndex();

        var parts    =  VghLantern__BaseFrameSystemLoader__ListParts();
        if (parts.length === 0) return [];

        var pending  =  [];
        var i;

        for (i = 0; i < parts.length; i++) {
            if (!parts[i]) continue;
            pending.push(VghLantern__BaseFrameSystemLoader__BuildPart(parts[i]));
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
        VghLantern__BaseFrameSystemLoader__LoadIndex         : VghLantern__BaseFrameSystemLoader__LoadIndex,
        VghLantern__BaseFrameSystemLoader__ListParts         : VghLantern__BaseFrameSystemLoader__ListParts,
        VghLantern__BaseFrameSystemLoader__GetPart           : VghLantern__BaseFrameSystemLoader__GetPart,
        VghLantern__BaseFrameSystemLoader__DatumGeometry     : VghLantern__BaseFrameSystemLoader__DatumGeometry,
        VghLantern__BaseFrameSystemLoader__EavesInterface    : VghLantern__BaseFrameSystemLoader__EavesInterface,
        VghLantern__BaseFrameSystemLoader__ReslopeReference  : VghLantern__BaseFrameSystemLoader__ReslopeReference,
        VghLantern__BaseFrameSystemLoader__DescribeParts     : VghLantern__BaseFrameSystemLoader__DescribeParts,
        VghLantern__BaseFrameSystemLoader__ResolveParts      : VghLantern__BaseFrameSystemLoader__ResolveParts
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppData__BaseFrameSystemLoader  =  VghLantern__AppData__BaseFrameSystemLoader;
