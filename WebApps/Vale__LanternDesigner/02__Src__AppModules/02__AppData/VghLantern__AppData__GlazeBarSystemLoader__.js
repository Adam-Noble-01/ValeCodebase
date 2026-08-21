/* =============================================================================
   VGHLANTERN - GLAZE BAR SYSTEM LOADER
   =============================================================================

   FILE       : VghLantern__AppData__GlazeBarSystemLoader__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - GlazeBarSystemLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load the three part Vale glaze bar system and prepare its sections
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - Owns VghLantern__GlazeBarSystem__Index__.json and the five asset files it
     points at, and hands the render pipeline a ready-to-extrude description of
     the bar a given lantern is specified with.
   - Fetches an asset once, stitches its Top Plan into closed faces once, and
     caches both. The cap file alone is 650 kB and its section is 205 segments,
     so neither the fetch nor the stitch should happen twice, let alone once per
     rebuild.

   WHY THIS IS SEPARATE FROM THE PROFILE AND COMPONENT LOADERS:
   - A profile is one section a user picks from a catalogue and sweeps along a
     role. A component is one object placed at a point.
   - A glaze bar is neither. It is a fixed assembly of three parts that are only
     ever used together, with exactly one choice inside it - the trim depth. A
     catalogue loader would have to be told which of its entries is a cap and
     which is a core, which is knowledge about this system rather than about
     libraries, and the ProfileIndexLoader would be carrying it for one caller.

   IMPORTANT:
   - The system index is HAND AUTHORED, unlike the component and profile
     indexes. A folder scan cannot know which asset fills which slot.
   - This module is the single consumer of the glaze bar system index.

   ============================================================================= */

// =============================================================================
// REGION | Glaze Bar System Loader Module
// =============================================================================

const VghLantern__AppData__GlazeBarSystemLoader = (function() {

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
    const SYSTEM_INDEX_KEY  =  'glazeBar';
    // ------------------------------------------------------------

    // HELPER FUNCTION | The Asset Registry This Loader Resolves Through
    // ------------------------------------------------------------
    // Throws rather than returning null, because a missing registry is a script
    // order fault and every symptom downstream of it is an unexplained absence.
    function VghLantern__GlazeBarSystemLoader__Registry() {
        var Registry  =  window.VghLantern__AppData__AssetRegistry;
        if (!Registry) {
            throw new Error('VghLantern__AppData__AssetRegistry is not loaded - check the script order in VghLantern__App__.html');
        }
        return Registry;
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Index Field Names
    // ------------------------------------------------------------
    const KEY_META    =  'VghLantern__GlazeBarSystem__Meta';
    const KEY_PARTS   =  'VghLantern__GlazeBarSystem__Parts';
    const KEY_ENDCAP  =  'VghLantern__GlazeBarSystem__EndCapRelationship';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Lantern Config Location
    // ------------------------------------------------------------
    // The stored block is still named GlazingBars. The USER-facing section is
    // called Glaze Bars, but renaming a persisted key would force a migration
    // pass over every saved project on disk to change a label nobody sees in the
    // file, so the block name stays and the label moves.
    const BARS_BLOCK      =  'Lantern__GlazingBars__Config';
    const FIELD_TRIM_ID   =  'Lantern__GlazingBars__Config__TrimOptionId';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Part Slot Keys
    // ------------------------------------------------------------
    const PART_TRIM  =  'trim';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Memoised Index and Caches
    // ------------------------------------------------------------
    let VghLantern__GlazeBarSystemLoader__IndexData    =  null;              // <-- Parsed system index
    let VghLantern__GlazeBarSystemLoader__LoadPromise  =  null;              // <-- In-flight index load shared by concurrent callers
    let VghLantern__GlazeBarSystemLoader__AssetCache   =  {};                // <-- AssetId -> parsed asset JSON
    let VghLantern__GlazeBarSystemLoader__AssetPromise =  {};                // <-- AssetId -> in-flight fetch
    let VghLantern__GlazeBarSystemLoader__FaceCache    =  {};                // <-- AssetId -> stitched face result
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Index Loading
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Glaze Bar System Index (memoised)
    // ------------------------------------------------------------
    function VghLantern__GlazeBarSystemLoader__LoadIndex() {
        if (VghLantern__GlazeBarSystemLoader__LoadPromise) return VghLantern__GlazeBarSystemLoader__LoadPromise;

        VghLantern__GlazeBarSystemLoader__LoadPromise  =  (async function() {
            try {
                await VghLantern__GlazeBarSystemLoader__Registry().VghLantern__AssetRegistry__Load();

                var indexUrl  =  VghLantern__GlazeBarSystemLoader__Registry().VghLantern__AssetRegistry__SystemIndexUrl(SYSTEM_INDEX_KEY);
                if (!indexUrl) throw new Error('the asset registry carries no "' + SYSTEM_INDEX_KEY + '" system index');

                var response  =  await fetch(indexUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                VghLantern__GlazeBarSystemLoader__IndexData  =  await response.json();
                console.log('[VghLantern__GlazeBarSystemLoader] Glaze bar system loaded ('
                    + VghLantern__GlazeBarSystemLoader__ListParts().length + ' parts).');

            } catch (error) {
                console.error('[VghLantern__GlazeBarSystemLoader] System index could not be loaded:', error.message);
                VghLantern__GlazeBarSystemLoader__IndexData  =  null;
            }

            return VghLantern__GlazeBarSystemLoader__IndexData;
        })();

        return VghLantern__GlazeBarSystemLoader__LoadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Part Slots the System Declares
    // ------------------------------------------------------------
    function VghLantern__GlazeBarSystemLoader__ListParts() {
        var index  =  VghLantern__GlazeBarSystemLoader__IndexData;
        return (index && Array.isArray(index[KEY_PARTS])) ? index[KEY_PARTS] : [];
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Single Part Slot by Key
    // ------------------------------------------------------------
    function VghLantern__GlazeBarSystemLoader__GetPart(partKey) {
        var parts  =  VghLantern__GlazeBarSystemLoader__ListParts();
        var i;

        for (i = 0; i < parts.length; i++) {
            if (parts[i] && parts[i].PartKey === partKey) return parts[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Selectable Trim Depth Options
    // ------------------------------------------------------------
    // Shape matches what the editor's card control expects, so the trim picker
    // consumes it with no adapter: Value, Label, Preview2d and the meta line.
    // Returns an empty list before the index has loaded, which is the same thing
    // a component role with no assets returns and renders the same way.
    function VghLantern__GlazeBarSystemLoader__ListTrimOptions() {
        var trim     =  VghLantern__GlazeBarSystemLoader__GetPart(PART_TRIM);
        var options  =  (trim && Array.isArray(trim.Options)) ? trim.Options : [];
        var list     =  [];
        var i, option;

        for (i = 0; i < options.length; i++) {
            option  =  options[i];
            list.push({
                Value        : option.OptionId,
                Label        : option.Label,
                DepthMm      : option.DepthMm,
                ProductCode  : option.AssetId,
                Preview2d    : option.Preview2d || null,
                IsDefault    : option.IsDefault === true
            });
        }
        return list;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Trim Option Id Used When a Lantern Names None
    // ------------------------------------------------------------
    function VghLantern__GlazeBarSystemLoader__DefaultTrimOptionId() {
        var trim  =  VghLantern__GlazeBarSystemLoader__GetPart(PART_TRIM);
        return (trim && trim.DefaultOptionId) ? trim.DefaultOptionId : '';
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Trim Option a Lantern Is Specified With
    // ------------------------------------------------------------
    // A stored id that is no longer in the system falls back to the default and
    // says so. A glaze bar without a trim is not a Vale glaze bar, so this never
    // returns nothing when the system has loaded.
    function VghLantern__GlazeBarSystemLoader__TrimOptionId(lantern) {
        var block   =  lantern ? lantern[BARS_BLOCK] : null;
        var stored  =  (block && block[FIELD_TRIM_ID]) || '';
        var trim    =  VghLantern__GlazeBarSystemLoader__GetPart(PART_TRIM);
        var options =  (trim && Array.isArray(trim.Options)) ? trim.Options : [];
        var i;

        for (i = 0; i < options.length; i++) {
            if (options[i].OptionId === stored) return stored;
        }

        if (stored) {
            console.warn('[VghLantern__GlazeBarSystemLoader] Unknown trim option "' + stored + '" - using the default.');
        }
        return VghLantern__GlazeBarSystemLoader__DefaultTrimOptionId();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Asset Fetching and Section Preparation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch One Asset File by Id (memoised, concurrency safe)
    // ------------------------------------------------------------
    // The in-flight promise is cached as well as the result. Three parts resolve
    // in parallel on every rebuild, and without it a lantern opened twice in
    // quick succession would fetch the 650 kB cap file twice.
    function VghLantern__GlazeBarSystemLoader__LoadAsset(assetId) {
        if (VghLantern__GlazeBarSystemLoader__AssetCache[assetId]) {
            return Promise.resolve(VghLantern__GlazeBarSystemLoader__AssetCache[assetId]);
        }
        if (VghLantern__GlazeBarSystemLoader__AssetPromise[assetId]) {
            return VghLantern__GlazeBarSystemLoader__AssetPromise[assetId];
        }

        VghLantern__GlazeBarSystemLoader__AssetPromise[assetId]  =  (async function() {
            try {
                var assetUrl  =  VghLantern__GlazeBarSystemLoader__Registry().VghLantern__AssetRegistry__Url(assetId);
                if (!assetUrl) throw new Error('the asset registry carries no entry for this id');

                var response  =  await fetch(assetUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                var data  =  await response.json();
                VghLantern__GlazeBarSystemLoader__AssetCache[assetId]  =  data;
                return data;

            } catch (error) {
                console.error('[VghLantern__GlazeBarSystemLoader] Asset ' + assetId + ' failed to load:', error.message);
                return null;

            } finally {
                delete VghLantern__GlazeBarSystemLoader__AssetPromise[assetId];
            }
        })();

        return VghLantern__GlazeBarSystemLoader__AssetPromise[assetId];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stitch an Asset's Top Plan Into Closed Faces (memoised)
    // ------------------------------------------------------------
    // The section is the same on every rebuild, so the stitch is done once per
    // asset for the life of the page. The cap's 205 segments are the reason this
    // is cached rather than recomputed: stitching and triangulating them on every
    // slider drag would be felt.
    async function VghLantern__GlazeBarSystemLoader__FacesForAsset(assetId) {
        if (VghLantern__GlazeBarSystemLoader__FaceCache[assetId]) {
            return VghLantern__GlazeBarSystemLoader__FaceCache[assetId];
        }

        var LoopBuilder  =  window.VghLantern__Geometry__SectionLoopBuilder;
        if (!LoopBuilder) {
            console.error('[VghLantern__GlazeBarSystemLoader] SectionLoopBuilder is not loaded.');
            return null;
        }

        var asset  =  await VghLantern__GlazeBarSystemLoader__LoadAsset(assetId);
        if (!asset) return null;

        var result  =  LoopBuilder.VghLantern__SectionLoopBuilder__BuildFacesFromAsset(asset);

        if (result.Warnings && result.Warnings.length > 0) {
            console.warn('[VghLantern__GlazeBarSystemLoader] Section warnings for ' + assetId + ':', result.Warnings);
        }

        VghLantern__GlazeBarSystemLoader__FaceCache[assetId]  =  result;
        return result;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Part Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build One Resolved Part Record
    // ------------------------------------------------------------
    // SectionAreaSqMm is taken from the stitched geometry rather than from the
    // index, so the number a takeoff multiplies by a bar length is measured from
    // the same outline that was extruded. The index carries its own copy for
    // catalogue display, and if the two ever disagree the geometry is right.
    async function VghLantern__GlazeBarSystemLoader__BuildPart(partKey, partName, assetId, elementType, specMaterial) {
        var result  =  await VghLantern__GlazeBarSystemLoader__FacesForAsset(assetId);
        if (!result || !result.Faces || result.Faces.length === 0) return null;

        return {
            PartKey          : partKey,
            PartName         : partName,
            AssetId          : assetId,
            ElementType      : elementType  || '',
            SpecMaterial     : specMaterial || '',
            SectionAreaSqMm  : result.AreaSqMm,
            Faces            : result.Faces
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Widest Point Across the Assembled Bar
    // ------------------------------------------------------------
    // The 2D profile trace overlay draws a member as a band of its real width,
    // and a glaze bar no longer has a single profile to measure. Answered from
    // the index so the overlay stays synchronous and needs no asset fetch.
    // Returns 0 before the index loads, which the overlay reads as "skip".
    function VghLantern__GlazeBarSystemLoader__OverallWidthMm() {
        var index  =  VghLantern__GlazeBarSystemLoader__IndexData;
        var meta   =  index ? index[KEY_META] : null;

        return (meta && typeof meta.OverallWidthMm === 'number') ? meta.OverallWidthMm : 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | The End Cap Relationship Numbers (synchronous)
    // ------------------------------------------------------------
    // The seating height, the along-bar offset and the cap's own asset id.
    // Answered from the index so the geometry module stays synchronous and needs
    // no asset fetch to work out where the cap sits.
    function VghLantern__GlazeBarSystemLoader__EndCapRelationship() {
        var index  =  VghLantern__GlazeBarSystemLoader__IndexData;
        return (index && index[KEY_ENDCAP]) ? index[KEY_ENDCAP] : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the Decorative End Cap Component (memoised)
    // ------------------------------------------------------------
    // Returned as the raw asset document rather than as geometry: the cap is a
    // mesh component placed at a point, not a section swept along a line, and
    // turning a Na__Asset__Mesh3D block into a buffer geometry is the Env3d
    // MeshJson loader's job.
    //
    // It shares this loader's asset cache with the swept sections, which is right:
    // both are glaze bar system assets, both live for the page, and neither is
    // large enough to want the component cache's byte budget.
    function VghLantern__GlazeBarSystemLoader__LoadEndCapAsset() {
        return (async function() {
            await VghLantern__GlazeBarSystemLoader__LoadIndex();

            var relationship  =  VghLantern__GlazeBarSystemLoader__EndCapRelationship();
            if (!relationship || !relationship.AssetId) {
                console.error('[VghLantern__GlazeBarSystemLoader] The index declares no glaze bar end cap.');
                return null;
            }

            return VghLantern__GlazeBarSystemLoader__LoadAsset(relationship.AssetId);
        })();
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the End Cap Asset if It Is Already Resident (synchronous)
    // ------------------------------------------------------------
    // For a renderer that draws whatever is in hand and asks for a redraw when the
    // rest lands, rather than stalling a viewport behind a fetch.
    function VghLantern__GlazeBarSystemLoader__PeekAsset(assetId) {
        return VghLantern__GlazeBarSystemLoader__AssetCache[assetId] || null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Describe Every Part of a Lantern's Bar Without Loading Geometry
    // ------------------------------------------------------------
    // The synchronous counterpart to ResolveParts, answered from the index alone.
    // The quantity takeoff needs a part's name, element type, specification
    // material and section area, and needs them inside a synchronous solve - but
    // it never needs the outline. Fetching three asset files, the largest of them
    // 650 kB, to read five fields already in the index would be the wrong trade.
    //
    // Returns an empty list until the index has loaded. The 3D build loads it, so
    // the takeoff for a lantern that has been drawn is always populated.
    function VghLantern__GlazeBarSystemLoader__DescribeParts(lantern) {
        var parts  =  VghLantern__GlazeBarSystemLoader__ListParts();
        if (parts.length === 0) return [];

        var trimOptionId  =  VghLantern__GlazeBarSystemLoader__TrimOptionId(lantern);
        var described     =  [];
        var i, j, part, option;

        for (i = 0; i < parts.length; i++) {
            part  =  parts[i];
            if (!part) continue;

            if (part.PartKey === PART_TRIM) {
                option  =  null;
                for (j = 0; j < (part.Options || []).length; j++) {
                    if (part.Options[j].OptionId === trimOptionId) { option  =  part.Options[j]; break; }
                }
                if (!option) continue;

                described.push({
                    PartKey          : part.PartKey,
                    PartName         : part.PartName + ' - ' + option.Label,
                    AssetId          : option.AssetId,
                    ElementType      : option.ElementType,
                    SpecMaterial     : option.SpecMaterial,
                    SectionAreaSqMm  : option.SectionAreaSqMm,
                    DepthMm          : option.DepthMm
                });
                continue;
            }

            described.push({
                PartKey          : part.PartKey,
                PartName         : part.PartName,
                AssetId          : part.AssetId,
                ElementType      : part.ElementType,
                SpecMaterial     : part.SpecMaterial,
                SectionAreaSqMm  : part.SectionAreaSqMm,
                DepthMm          : null
            });
        }

        return described;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Every Part of the Bar a Lantern Is Specified With
    // ------------------------------------------------------------
    // Returns one record per part, each with its stitched faces ready to extrude.
    // The three parts resolve concurrently: they are independent fetches, and the
    // cap is by far the largest file, so serialising them would make every first
    // build wait on it twice over.
    async function VghLantern__GlazeBarSystemLoader__ResolveParts(lantern) {
        await VghLantern__GlazeBarSystemLoader__LoadIndex();

        var parts  =  VghLantern__GlazeBarSystemLoader__ListParts();
        if (parts.length === 0) return [];

        var trimOptionId  =  VghLantern__GlazeBarSystemLoader__TrimOptionId(lantern);
        var pending       =  [];
        var i, part, option, j;

        for (i = 0; i < parts.length; i++) {
            part  =  parts[i];
            if (!part) continue;

            if (part.PartKey === PART_TRIM) {
                option  =  null;
                for (j = 0; j < (part.Options || []).length; j++) {
                    if (part.Options[j].OptionId === trimOptionId) { option  =  part.Options[j]; break; }
                }
                if (!option) continue;

                pending.push(VghLantern__GlazeBarSystemLoader__BuildPart(
                    part.PartKey, part.PartName + ' - ' + option.Label,
                    option.AssetId, option.ElementType, option.SpecMaterial));
                continue;
            }

            pending.push(VghLantern__GlazeBarSystemLoader__BuildPart(
                part.PartKey, part.PartName,
                part.AssetId, part.ElementType, part.SpecMaterial));
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
        VghLantern__GlazeBarSystemLoader__LoadIndex             : VghLantern__GlazeBarSystemLoader__LoadIndex,
        VghLantern__GlazeBarSystemLoader__ListParts             : VghLantern__GlazeBarSystemLoader__ListParts,
        VghLantern__GlazeBarSystemLoader__GetPart               : VghLantern__GlazeBarSystemLoader__GetPart,
        VghLantern__GlazeBarSystemLoader__ListTrimOptions       : VghLantern__GlazeBarSystemLoader__ListTrimOptions,
        VghLantern__GlazeBarSystemLoader__DefaultTrimOptionId   : VghLantern__GlazeBarSystemLoader__DefaultTrimOptionId,
        VghLantern__GlazeBarSystemLoader__TrimOptionId          : VghLantern__GlazeBarSystemLoader__TrimOptionId,
        VghLantern__GlazeBarSystemLoader__DescribeParts         : VghLantern__GlazeBarSystemLoader__DescribeParts,
        VghLantern__GlazeBarSystemLoader__OverallWidthMm        : VghLantern__GlazeBarSystemLoader__OverallWidthMm,
        VghLantern__GlazeBarSystemLoader__EndCapRelationship    : VghLantern__GlazeBarSystemLoader__EndCapRelationship,
        VghLantern__GlazeBarSystemLoader__LoadEndCapAsset       : VghLantern__GlazeBarSystemLoader__LoadEndCapAsset,
        VghLantern__GlazeBarSystemLoader__PeekAsset             : VghLantern__GlazeBarSystemLoader__PeekAsset,
        VghLantern__GlazeBarSystemLoader__ResolveParts          : VghLantern__GlazeBarSystemLoader__ResolveParts
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppData__GlazeBarSystemLoader  =  VghLantern__AppData__GlazeBarSystemLoader;
