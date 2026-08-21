/* =============================================================================
   VGHLANTERN - INTERIOR JOINERY SYSTEM LOADER
   =============================================================================

   FILE       : VghLantern__AppData__InteriorJoinerySystemLoader__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - InteriorJoinerySystemLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load the interior joinery system and prepare its section faces
   CREATED    : 07-Aug-2026

   DESCRIPTION:
   - Owns VghLantern__InteriorJoinerySystem__Index__.json and the four asset
     files it points at: Wales cornice (49_1001), Classic cornice VG103
     (49_1002), eaves trim (49_1011) and the 12mm plywood cornice packer
     (49_1021).
   - Same pattern as the base frame and glaze bar system loaders: a fixed
     assembly with one real choice (which cornice), hand-authored index, and
     memoised fetch + section stitch so a rebuild never pays twice.
   - Section faces come from Na__Asset__Plan2D__Top - the same view the base
     frame uses. Section 0,0 is the eaves datum; +x runs inboard into the room.

   IMPORTANT:
   - The system index is HAND AUTHORED. A folder scan cannot know which asset
     fills which slot.
   - This module is the single consumer of the interior joinery system index.

   ============================================================================= */

// =============================================================================
// REGION | Interior Joinery System Loader Module
// =============================================================================

const VghLantern__AppData__InteriorJoinerySystemLoader = (function() {

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
    const SYSTEM_INDEX_KEY  =  'interiorJoinery';
    // ------------------------------------------------------------

    // HELPER FUNCTION | The Asset Registry This Loader Resolves Through
    // ------------------------------------------------------------
    // Throws rather than returning null, because a missing registry is a script
    // order fault and every symptom downstream of it is an unexplained absence.
    function VghLantern__InteriorJoinerySystemLoader__Registry() {
        var Registry  =  window.VghLantern__AppData__AssetRegistry;
        if (!Registry) {
            throw new Error('VghLantern__AppData__AssetRegistry is not loaded - check the script order in VghLantern__App__.html');
        }
        return Registry;
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Index Field Names
    // ------------------------------------------------------------
    const KEY_META   =  'VghLantern__InteriorJoinerySystem__Meta';
    const KEY_PARTS  =  'VghLantern__InteriorJoinerySystem__Parts';
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Lantern Config Location
    // ------------------------------------------------------------
    const JOINERY_BLOCK       =  'Lantern__InteriorJoinery__Config';
    const FIELD_CORNICE_ID    =  'Lantern__InteriorJoinery__Config__CorniceOptionId';
    const FIELD_HEIGHT_OFFSET =  'Lantern__InteriorJoinery__Config__CorniceHeightOffsetMm';
    const PART_CORNICE        =  'cornice';
    const PART_PACKER         =  'cornicePacker';
    const DEFAULT_CORNICE_ID  =  '49_1001';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Memoised Index and Caches
    // ------------------------------------------------------------
    let VghLantern__InteriorJoinerySystemLoader__IndexData     =  null;
    let VghLantern__InteriorJoinerySystemLoader__LoadPromise   =  null;
    let VghLantern__InteriorJoinerySystemLoader__AssetCache    =  {};
    let VghLantern__InteriorJoinerySystemLoader__AssetPromise  =  {};
    let VghLantern__InteriorJoinerySystemLoader__FaceCache     =  {};
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Index Loading
// -----------------------------------------------------------------------------

    // FUNCTION | Load the Interior Joinery System Index (memoised)
    // ------------------------------------------------------------
    function VghLantern__InteriorJoinerySystemLoader__LoadIndex() {
        if (VghLantern__InteriorJoinerySystemLoader__LoadPromise) {
            return VghLantern__InteriorJoinerySystemLoader__LoadPromise;
        }

        VghLantern__InteriorJoinerySystemLoader__LoadPromise  =  (async function() {
            try {
                await VghLantern__InteriorJoinerySystemLoader__Registry().VghLantern__AssetRegistry__Load();

                var indexUrl  =  VghLantern__InteriorJoinerySystemLoader__Registry().VghLantern__AssetRegistry__SystemIndexUrl(SYSTEM_INDEX_KEY);
                if (!indexUrl) throw new Error('the asset registry carries no "' + SYSTEM_INDEX_KEY + '" system index');

                var response  =  await fetch(indexUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                VghLantern__InteriorJoinerySystemLoader__IndexData  =  await response.json();
                console.log('[VghLantern__InteriorJoinerySystemLoader] Interior joinery system loaded ('
                    + VghLantern__InteriorJoinerySystemLoader__ListParts().length + ' parts).');

            } catch (error) {
                console.error('[VghLantern__InteriorJoinerySystemLoader] System index could not be loaded:', error.message);
                VghLantern__InteriorJoinerySystemLoader__IndexData  =  null;
            }

            return VghLantern__InteriorJoinerySystemLoader__IndexData;
        })();

        return VghLantern__InteriorJoinerySystemLoader__LoadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Part Slots the System Declares
    // ------------------------------------------------------------
    function VghLantern__InteriorJoinerySystemLoader__ListParts() {
        var index  =  VghLantern__InteriorJoinerySystemLoader__IndexData;
        return (index && Array.isArray(index[KEY_PARTS])) ? index[KEY_PARTS] : [];
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Single Part Slot by Key
    // ------------------------------------------------------------
    function VghLantern__InteriorJoinerySystemLoader__GetPart(partKey) {
        var parts  =  VghLantern__InteriorJoinerySystemLoader__ListParts();
        var i;

        for (i = 0; i < parts.length; i++) {
            if (parts[i] && parts[i].PartKey === partKey) return parts[i];
        }
        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Reference Pitch the Assets Were Exported At
    // ------------------------------------------------------------
    function VghLantern__InteriorJoinerySystemLoader__ReferencePitchDegrees() {
        var index  =  VghLantern__InteriorJoinerySystemLoader__IndexData;
        var meta   =  index ? index[KEY_META] : null;
        var value  =  meta ? Number(meta.ReferencePitchDegrees) : NaN;
        return isFinite(value) ? value : 19.88;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cornice Options
// -----------------------------------------------------------------------------

    // FUNCTION | List Selectable Cornice Options for Editor Cards
    // ------------------------------------------------------------
    function VghLantern__InteriorJoinerySystemLoader__ListCorniceOptions() {
        var cornice  =  VghLantern__InteriorJoinerySystemLoader__GetPart(PART_CORNICE);
        var options  =  (cornice && Array.isArray(cornice.Options)) ? cornice.Options : [];
        var list     =  [];
        var i, option;

        for (i = 0; i < options.length; i++) {
            option  =  options[i];
            list.push({
                Value        : option.OptionId,
                Label        : option.Label,
                ProductCode  : option.AssetId,
                Description  : option.Description || '',
                Preview2d    : option.Preview2d || null,
                IsDefault    : option.IsDefault === true
            });
        }
        return list;
    }
    // ------------------------------------------------------------


    // FUNCTION | Default Cornice Option Id
    // ------------------------------------------------------------
    function VghLantern__InteriorJoinerySystemLoader__DefaultCorniceOptionId() {
        var cornice  =  VghLantern__InteriorJoinerySystemLoader__GetPart(PART_CORNICE);
        return (cornice && cornice.DefaultOptionId) ? cornice.DefaultOptionId : DEFAULT_CORNICE_ID;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve the Cornice Option a Lantern Is Specified With
    // ------------------------------------------------------------
    // Empty string is a deliberate "No Cornice" choice - the same pattern as an
    // empty finial id. Anything else must match a known option or fall back.
    function VghLantern__InteriorJoinerySystemLoader__CorniceOptionId(lantern) {
        var block   =  lantern ? lantern[JOINERY_BLOCK] : null;
        var stored  =  (block && typeof block[FIELD_CORNICE_ID] === 'string') ? block[FIELD_CORNICE_ID] : null;
        var cornice =  VghLantern__InteriorJoinerySystemLoader__GetPart(PART_CORNICE);
        var options =  (cornice && Array.isArray(cornice.Options)) ? cornice.Options : [];
        var i;

        if (stored === '') return '';

        if (typeof stored === 'string' && stored) {
            for (i = 0; i < options.length; i++) {
                if (options[i].OptionId === stored) return stored;
            }
            console.warn('[VghLantern__InteriorJoinerySystemLoader] Unknown cornice option "'
                + stored + '" - using the default.');
        }
        return VghLantern__InteriorJoinerySystemLoader__DefaultCorniceOptionId();
    }
    // ------------------------------------------------------------


    // FUNCTION | The Height Offset a Lantern Has Moved Its Cornice By
    // ------------------------------------------------------------
    // Positive is up the upstand, negative is down, zero is the standard fixing
    // height the asset was drawn at. The packer travels with the moulding, so
    // this one number moves both. Bounds are enforced by the schema validator
    // and the slider, so anything arriving here is read as authored.
    function VghLantern__InteriorJoinerySystemLoader__CorniceHeightOffsetMm(lantern) {
        var block  =  lantern ? lantern[JOINERY_BLOCK] : null;
        return block ? (Number(block[FIELD_HEIGHT_OFFSET]) || 0) : 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve One Cornice Option Record by Id
    // ------------------------------------------------------------
    function VghLantern__InteriorJoinerySystemLoader__CorniceOption(optionId) {
        var cornice  =  VghLantern__InteriorJoinerySystemLoader__GetPart(PART_CORNICE);
        var options  =  (cornice && Array.isArray(cornice.Options)) ? cornice.Options : [];
        var i;

        for (i = 0; i < options.length; i++) {
            if (options[i].OptionId === optionId) return options[i];
        }
        return null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Synchronous Descriptions
// -----------------------------------------------------------------------------

    // FUNCTION | Describe Every Part Without Loading Geometry (synchronous)
    // ------------------------------------------------------------
    function VghLantern__InteriorJoinerySystemLoader__DescribeParts(lantern) {
        var parts      =  VghLantern__InteriorJoinerySystemLoader__ListParts();
        var described  =  [];
        var corniceId  =  VghLantern__InteriorJoinerySystemLoader__CorniceOptionId(lantern);
        var hasCornice =  corniceId !== '';
        var i, part, option;

        for (i = 0; i < parts.length; i++) {
            part  =  parts[i];
            if (!part) continue;

            if (part.PartKey === PART_CORNICE) {
                if (!hasCornice) continue;
                option  =  VghLantern__InteriorJoinerySystemLoader__CorniceOption(corniceId);
                if (!option) continue;

                described.push({
                    PartKey       : part.PartKey,
                    PartName      : option.Label || part.PartName,
                    AssetId       : option.AssetId,
                    ElementType   : option.ElementType || part.ElementType,
                    SpecMaterial  : option.SpecMaterial || part.SpecMaterial,
                    SectionMinXMm : option.SectionMinXMm,
                    SectionMaxXMm : option.SectionMaxXMm,
                    SectionMinYMm : option.SectionMinYMm,
                    SectionMaxYMm : option.SectionMaxYMm
                });
                continue;
            }

            // Packer only exists behind a cornice - No Cornice omits both.
            if (part.PartKey === PART_PACKER && !hasCornice) continue;

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

    // HELPER FUNCTION | Fetch One Asset File by Id (memoised)
    // ------------------------------------------------------------
    function VghLantern__InteriorJoinerySystemLoader__LoadAsset(assetId) {
        if (VghLantern__InteriorJoinerySystemLoader__AssetCache[assetId]) {
            return Promise.resolve(VghLantern__InteriorJoinerySystemLoader__AssetCache[assetId]);
        }
        if (VghLantern__InteriorJoinerySystemLoader__AssetPromise[assetId]) {
            return VghLantern__InteriorJoinerySystemLoader__AssetPromise[assetId];
        }

        VghLantern__InteriorJoinerySystemLoader__AssetPromise[assetId]  =  (async function() {
            try {
                var assetUrl  =  VghLantern__InteriorJoinerySystemLoader__Registry().VghLantern__AssetRegistry__Url(assetId);
                if (!assetUrl) throw new Error('the asset registry carries no entry for this id');

                var response  =  await fetch(assetUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                var data  =  await response.json();
                VghLantern__InteriorJoinerySystemLoader__AssetCache[assetId]  =  data;
                return data;

            } catch (error) {
                console.error('[VghLantern__InteriorJoinerySystemLoader] Asset '
                    + assetId + ' failed to load:', error.message);
                return null;

            } finally {
                delete VghLantern__InteriorJoinerySystemLoader__AssetPromise[assetId];
            }
        })();

        return VghLantern__InteriorJoinerySystemLoader__AssetPromise[assetId];
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stitch an Asset's Top Plan Into Closed Faces
    // ------------------------------------------------------------
    async function VghLantern__InteriorJoinerySystemLoader__FacesForAsset(assetId) {
        if (VghLantern__InteriorJoinerySystemLoader__FaceCache[assetId]) {
            return VghLantern__InteriorJoinerySystemLoader__FaceCache[assetId];
        }

        var LoopBuilder  =  window.VghLantern__Geometry__SectionLoopBuilder;
        if (!LoopBuilder) {
            console.error('[VghLantern__InteriorJoinerySystemLoader] SectionLoopBuilder is not loaded.');
            return null;
        }

        var asset  =  await VghLantern__InteriorJoinerySystemLoader__LoadAsset(assetId);
        if (!asset) return null;

        var result  =  LoopBuilder.VghLantern__SectionLoopBuilder__BuildFacesFromAsset(asset);

        if (result.Warnings && result.Warnings.length > 0) {
            console.warn('[VghLantern__InteriorJoinerySystemLoader] Section warnings for '
                + assetId + ':', result.Warnings);
        }

        VghLantern__InteriorJoinerySystemLoader__FaceCache[assetId]  =  result;
        return result;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build One Resolved Part Record
    // ------------------------------------------------------------
    async function VghLantern__InteriorJoinerySystemLoader__BuildPart(partKey, partName, assetId, meta) {
        var result  =  await VghLantern__InteriorJoinerySystemLoader__FacesForAsset(assetId);
        if (!result || !result.Faces || result.Faces.length === 0) return null;

        return {
            PartKey                   : partKey,
            PartName                  : partName,
            AssetId                   : assetId,
            ElementType               : (meta && meta.ElementType)  || '',
            SpecMaterial              : (meta && meta.SpecMaterial) || '',
            InheritsJoineryFinish     : meta ? meta.InheritsJoineryFinish === true : false,
            ReslopesTopWithRoofPitch  : meta ? meta.ReslopesTopWithRoofPitch === true : false,
            SectionAreaSqMm           : result.AreaSqMm,
            Faces                     : result.Faces
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve Every Part With Its Stitched Faces
    // ------------------------------------------------------------
    async function VghLantern__InteriorJoinerySystemLoader__ResolveParts(lantern) {
        await VghLantern__InteriorJoinerySystemLoader__LoadIndex();

        var parts      =  VghLantern__InteriorJoinerySystemLoader__ListParts();
        if (parts.length === 0) return [];

        var corniceId  =  VghLantern__InteriorJoinerySystemLoader__CorniceOptionId(lantern);
        var hasCornice =  corniceId !== '';
        var pending    =  [];
        var i, part, option;

        for (i = 0; i < parts.length; i++) {
            part  =  parts[i];
            if (!part) continue;

            if (part.PartKey === PART_CORNICE) {
                if (!hasCornice) continue;
                option  =  VghLantern__InteriorJoinerySystemLoader__CorniceOption(corniceId);
                if (!option) continue;

                pending.push(VghLantern__InteriorJoinerySystemLoader__BuildPart(
                    part.PartKey,
                    option.Label || part.PartName,
                    option.AssetId,
                    {
                        ElementType           : option.ElementType || part.ElementType,
                        SpecMaterial          : option.SpecMaterial || part.SpecMaterial,
                        InheritsJoineryFinish : part.InheritsJoineryFinish === true
                    }
                ));
                continue;
            }

            if (part.PartKey === PART_PACKER && !hasCornice) continue;

            pending.push(VghLantern__InteriorJoinerySystemLoader__BuildPart(
                part.PartKey,
                part.PartName,
                part.AssetId,
                {
                    ElementType              : part.ElementType,
                    SpecMaterial             : part.SpecMaterial,
                    InheritsJoineryFinish    : part.InheritsJoineryFinish === true,
                    ReslopesTopWithRoofPitch : part.ReslopesTopWithRoofPitch === true
                }
            ));
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
        VghLantern__InteriorJoinerySystemLoader__LoadIndex               : VghLantern__InteriorJoinerySystemLoader__LoadIndex,
        VghLantern__InteriorJoinerySystemLoader__ListParts               : VghLantern__InteriorJoinerySystemLoader__ListParts,
        VghLantern__InteriorJoinerySystemLoader__GetPart                 : VghLantern__InteriorJoinerySystemLoader__GetPart,
        VghLantern__InteriorJoinerySystemLoader__ReferencePitchDegrees   : VghLantern__InteriorJoinerySystemLoader__ReferencePitchDegrees,
        VghLantern__InteriorJoinerySystemLoader__ListCorniceOptions      : VghLantern__InteriorJoinerySystemLoader__ListCorniceOptions,
        VghLantern__InteriorJoinerySystemLoader__DefaultCorniceOptionId  : VghLantern__InteriorJoinerySystemLoader__DefaultCorniceOptionId,
        VghLantern__InteriorJoinerySystemLoader__CorniceOptionId         : VghLantern__InteriorJoinerySystemLoader__CorniceOptionId,
        VghLantern__InteriorJoinerySystemLoader__CorniceHeightOffsetMm   : VghLantern__InteriorJoinerySystemLoader__CorniceHeightOffsetMm,
        VghLantern__InteriorJoinerySystemLoader__DescribeParts           : VghLantern__InteriorJoinerySystemLoader__DescribeParts,
        VghLantern__InteriorJoinerySystemLoader__ResolveParts            : VghLantern__InteriorJoinerySystemLoader__ResolveParts
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppData__InteriorJoinerySystemLoader  =  VghLantern__AppData__InteriorJoinerySystemLoader;
