/* =============================================================================
   VGHLANTERN - COMPONENT INDEX LOADER
   =============================================================================

   FILE       : VghLantern__AppData__ComponentIndexLoader__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - ComponentIndexLoader
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load the discrete-component library index and individual assets
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Loads VghLantern__ComponentDataIndex__.json - the generated catalogue of
     discrete lantern components (finials, finial bases, cresting, vents).
   - Fetch order: the server API route first (served no-store so the index stays
     live while authoring), then the static file as a fallback.
   - Memoises the parsed index and builds an AssetId lookup Map.
   - Fetches individual asset JSON on demand and caches each one.
   - Publishes the parsed index into StateManager, emitting 'componentIndexLoaded'.

   IMPORTANT:
   - The index is GENERATED OUTPUT built by 60__Dev__WebBuildUtils. Never edit it
     by hand and never hardcode component data that belongs in it.
   - This module is the single consumer of the component index. Other modules read
     it through this API rather than fetching the JSON themselves.
   - Asset bodies are NOT cached here. Fetching and session caching belong to
     VghLantern__AppData__ComponentAssetCache__.js, because a unified asset
     export is one to three megabytes and needs a real memory budget rather than
     an object that only ever grows.

   ---------------------------------------------------------------------------

   TWO SCHEMAS LIVE SIDE BY SIDE:

   Na__Asset__UnifiedComponentSchema (SketchUp Component Editor, Export tab):
   - Na__Asset__Elevation2D__Front / __Right : drawing linework as Na__Geometry__Paths
   - Na__Asset__Plan2D__Top                  : the same, seen from above
   - Na__Asset__Mesh3D                       : vertices, faces, per-vertex normals, edges
   - Na__Asset__ObjectHierarchy3D            : nested group and component transforms

   The earlier hand-authored format:
   - Na__Asset__Profile2D                    : a single closed outline of points
   - Na__Asset__Glb3D__Url                   : an external GLB for the 3D view

   Both are supported. Every geometry accessor below prefers the unified blocks
   and falls back to the profile, so a library part way through re-export keeps
   rendering rather than blanking out.

   THE ORIGIN IS THE INSERTION POINT:
   Every asset is authored about the origin point group captured in SketchUp, so
   local 0,0,0 is the seating point. Placing a component means putting its local
   origin on the anchor - in 2D and in 3D, with no per-asset offset table. An
   asset may extend below its origin (a spigot buried in the ridge); the index
   records that as DepthBelowOriginMm.

   ============================================================================= */

// =============================================================================
// REGION | Component Index Loader Module
// =============================================================================

const VghLantern__AppData__ComponentIndexLoader = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Index Source Paths
    // ------------------------------------------------------------
    const API_INDEX_PATH     =  '/api/component-index';                                              // <-- Preferred: live, no-store
    const STATIC_INDEX_PATH  =  '05__Data__LanternComponentLibrary/VghLantern__ComponentDataIndex__.json'; // <-- Fallback: direct file
    const LIBRARY_ROOT_PATH  =  '05__Data__LanternComponentLibrary/';                                // <-- Base for relative asset URLs
    // ------------------------------------------------------------


    // MODULE VARIABLES | Memoised Index and Asset Caches
    // ------------------------------------------------------------
    let VghLantern__ComponentIndexLoader__IndexData     =  null;             // <-- Parsed index document
    let VghLantern__ComponentIndexLoader__EntryMap      =  null;             // <-- Map<AssetId, indexEntry>
    let VghLantern__ComponentIndexLoader__LoadPromise   =  null;             // <-- In-flight load, so concurrent callers share one fetch
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Unified Asset Block Keys
    // ------------------------------------------------------------
    const BLOCK_ELEVATION_FRONT  =  'Na__Asset__Elevation2D__Front';
    const BLOCK_ELEVATION_RIGHT  =  'Na__Asset__Elevation2D__Right';
    const BLOCK_PLAN_TOP         =  'Na__Asset__Plan2D__Top';
    const BLOCK_MESH_3D          =  'Na__Asset__Mesh3D';
    const BLOCK_PROFILE_2D       =  'Na__Asset__Profile2D';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Index Fetching
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fetch the Index from the Server API Route
    // ------------------------------------------------------------
    async function VghLantern__ComponentIndexLoader__FetchFromApi() {
        var response  =  await fetch(API_INDEX_PATH, { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var payload  =  await response.json();
        if (!payload || !payload.ok) throw new Error((payload && payload.error) || 'API returned not-ok');
        return payload.data;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch the Index Directly from the Static File
    // ------------------------------------------------------------
    async function VghLantern__ComponentIndexLoader__FetchFromStaticFile() {
        var response  =  await fetch(STATIC_INDEX_PATH, { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build the AssetId Lookup Map
    // ------------------------------------------------------------
    function VghLantern__ComponentIndexLoader__BuildEntryMap(indexData) {
        var entryMap  =  new Map();
        var assets    =  (indexData && indexData['VghLantern__ComponentDataIndex__Assets']) || [];
        for (var i = 0; i < assets.length; i++) {
            var entry  =  assets[i];
            if (entry && entry.AssetId) entryMap.set(entry.AssetId, entry);
        }
        return entryMap;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load the Component Index (memoised)
    // ------------------------------------------------------------
    function VghLantern__ComponentIndexLoader__LoadIndex() {
        if (VghLantern__ComponentIndexLoader__LoadPromise) return VghLantern__ComponentIndexLoader__LoadPromise;

        VghLantern__ComponentIndexLoader__LoadPromise  =  (async function() {
            var indexData  =  null;

            try {
                indexData  =  await VghLantern__ComponentIndexLoader__FetchFromApi();
            } catch (apiError) {
                console.warn('[VghLantern__ComponentIndexLoader] API route unavailable, falling back to static file:', apiError.message);
                try {
                    indexData  =  await VghLantern__ComponentIndexLoader__FetchFromStaticFile();
                } catch (fileError) {
                    console.error('[VghLantern__ComponentIndexLoader] Component index could not be loaded:', fileError.message);
                    indexData  =  null;
                }
            }

            VghLantern__ComponentIndexLoader__IndexData  =  indexData;
            VghLantern__ComponentIndexLoader__EntryMap   =  VghLantern__ComponentIndexLoader__BuildEntryMap(indexData);

            if (window.VghLantern__AppCore__StateManager) {
                window.VghLantern__AppCore__StateManager.VghLantern__StateManager__SetComponentIndex(indexData);
            }

            if (indexData) {
                console.log('[VghLantern__ComponentIndexLoader] Loaded ' + VghLantern__ComponentIndexLoader__EntryMap.size + ' component asset(s).');
            }

            return indexData;
        })();

        return VghLantern__ComponentIndexLoader__LoadPromise;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Index Queries
// -----------------------------------------------------------------------------

    // FUNCTION | Get the Parsed Index Document
    // ------------------------------------------------------------
    function VghLantern__ComponentIndexLoader__GetIndex() {
        return VghLantern__ComponentIndexLoader__IndexData;
    }
    // ------------------------------------------------------------


    // FUNCTION | List All Component Categories
    // ------------------------------------------------------------
    function VghLantern__ComponentIndexLoader__ListCategories() {
        if (!VghLantern__ComponentIndexLoader__IndexData) return [];
        return VghLantern__ComponentIndexLoader__IndexData['VghLantern__ComponentDataIndex__Categories'] || [];
    }
    // ------------------------------------------------------------


    // FUNCTION | List All Component Index Entries
    // ------------------------------------------------------------
    function VghLantern__ComponentIndexLoader__ListEntries() {
        if (!VghLantern__ComponentIndexLoader__IndexData) return [];
        return VghLantern__ComponentIndexLoader__IndexData['VghLantern__ComponentDataIndex__Assets'] || [];
    }
    // ------------------------------------------------------------


    // FUNCTION | List Component Index Entries Within a Category
    // ------------------------------------------------------------
    function VghLantern__ComponentIndexLoader__ListEntriesByCategory(categoryId) {
        var allEntries  =  VghLantern__ComponentIndexLoader__ListEntries();
        return allEntries.filter(function(entry) { return entry && entry.CategoryId === categoryId; });
    }
    // ------------------------------------------------------------


    // FUNCTION | List Component Index Entries Suitable for a Placement Role
    // ------------------------------------------------------------
    // Role is one of: finial | cresting | vent.
    // Entries declare their applicable roles the same way profiles do, so the
    // editor filters option lists without hardcoding a category-to-role table.
    function VghLantern__ComponentIndexLoader__ListEntriesForRole(roleKey) {
        var allEntries  =  VghLantern__ComponentIndexLoader__ListEntries();
        return allEntries.filter(function(entry) {
            if (!entry || !Array.isArray(entry.ApplicableRoles)) return false;
            return entry.ApplicableRoles.indexOf(roleKey) !== -1;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Get a Single Index Entry by Asset Id
    // ------------------------------------------------------------
    function VghLantern__ComponentIndexLoader__GetEntry(assetId) {
        if (!VghLantern__ComponentIndexLoader__EntryMap) return null;
        return VghLantern__ComponentIndexLoader__EntryMap.get(assetId) || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Individual Asset Loading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve an Index Entry Url
    // ------------------------------------------------------------
    // THE REGISTRY ANSWERS FIRST. This catalogue is generated from the same walk
    // the registry is, so the two normally agree - but only one of them is the
    // place a path is written down, and when they disagree it is because this one
    // was built before a file moved. An absolute or protocol relative url is
    // passed straight through: it is pointing outside the library on purpose.
    //
    // assetId is optional so the preview and GLB url helpers, which resolve a
    // SIBLING file rather than the asset itself, still reach the library root.
    function VghLantern__ComponentIndexLoader__ResolveUrl(relativeUrl, assetId) {
        if (assetId) {
            var Registry  =  window.VghLantern__AppData__AssetRegistry;
            var fromRegistry  =  Registry ? Registry.VghLantern__AssetRegistry__Url(assetId) : '';
            if (fromRegistry) return fromRegistry;
        }

        if (!relativeUrl) return null;
        if (/^(https?:)?\/\//.test(relativeUrl) || relativeUrl.charAt(0) === '/') return relativeUrl;
        return LIBRARY_ROOT_PATH + relativeUrl;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load a Single Component Asset JSON by Asset Id
    // ------------------------------------------------------------
    // Delegates the fetch and the session cache to ComponentAssetCache. This
    // module only resolves which URL an id means and how big it is going to be.
    async function VghLantern__ComponentIndexLoader__LoadAsset(assetId) {
        if (!assetId) return null;

        var AssetCache  =  window.VghLantern__AppData__ComponentAssetCache;
        if (!AssetCache) {
            console.error('[VghLantern__ComponentIndexLoader] ComponentAssetCache is not loaded - asset bodies cannot be fetched.');
            return null;
        }

        var cached  =  AssetCache.VghLantern__ComponentAssetCache__Peek(assetId);
        if (cached) return cached;

        await VghLantern__ComponentIndexLoader__LoadIndex();

        var entry  =  VghLantern__ComponentIndexLoader__GetEntry(assetId);
        if (!entry) {
            console.warn('[VghLantern__ComponentIndexLoader] Unknown component asset id:', assetId);
            return null;
        }

        var assetUrl  =  VghLantern__ComponentIndexLoader__ResolveUrl(entry.JsonUrl, assetId);
        if (!assetUrl) {
            console.warn('[VghLantern__ComponentIndexLoader] Nothing resolves an asset url for:', assetId);
            return null;
        }

        return await AssetCache.VghLantern__ComponentAssetCache__Load(assetId, assetUrl, entry.FileSizeBytes);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read an Already-Resident Asset Without Fetching
    // ------------------------------------------------------------
    // A synchronous renderer uses this to take the fast path when the asset is
    // resident and draw its placeholder when it is not, instead of forcing the
    // whole 2D pipeline to become async.
    function VghLantern__ComponentIndexLoader__PeekAsset(assetId) {
        var AssetCache  =  window.VghLantern__AppData__ComponentAssetCache;
        if (!AssetCache || !assetId) return null;
        return AssetCache.VghLantern__ComponentAssetCache__Peek(assetId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Resolved Preview Image Url for an Asset
    // ------------------------------------------------------------
    function VghLantern__ComponentIndexLoader__GetPreviewUrl(assetId) {
        var entry  =  VghLantern__ComponentIndexLoader__GetEntry(assetId);
        if (!entry) return null;
        return VghLantern__ComponentIndexLoader__ResolveUrl(entry.PreviewUrl);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Resolved GLB Url for an Asset
    // ------------------------------------------------------------
    function VghLantern__ComponentIndexLoader__GetGlbUrl(assetId) {
        var entry  =  VghLantern__ComponentIndexLoader__GetEntry(assetId);
        if (!entry) return null;
        return VghLantern__ComponentIndexLoader__ResolveUrl(entry.Glb3dUrl);
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Baked Thumbnail Outline for an Asset
    // ------------------------------------------------------------
    // Synchronous and free: the build utility flattens each asset's front
    // elevation into one compact SVG path and stores it in the index, so a
    // gallery of cards draws every component in the role without fetching a
    // single megabyte-scale asset file.
    function VghLantern__ComponentIndexLoader__GetPreview2d(assetId) {
        var entry  =  VghLantern__ComponentIndexLoader__GetEntry(assetId);
        if (!entry || !entry.Preview2d) return null;
        return entry.Preview2d;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get Placement Metrics for an Asset
    // ------------------------------------------------------------
    // Read straight from the index, so a renderer can size and seat a component
    // before its geometry has arrived.
    function VghLantern__ComponentIndexLoader__GetPlacementMetrics(assetId) {
        var entry  =  VghLantern__ComponentIndexLoader__GetEntry(assetId);
        if (!entry) return null;

        return {
            OverallHeightMm     : entry.OverallHeightMm,
            HeightAboveOriginMm : entry.HeightAboveOriginMm,
            DepthBelowOriginMm  : entry.DepthBelowOriginMm,
            WidthMm             : entry.WidthMm,
            PlanDiameterMm      : entry.PlanDiameterMm
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Geometry Block Accessors
// -----------------------------------------------------------------------------

    // FUNCTION | Get a 2D View Block for an Asset
    // ------------------------------------------------------------
    // viewKey is 'front' | 'right' | 'plan'. Returns the block carrying
    // Na__Geometry__Paths and Na__Geometry__BoundingBox, or null when the asset
    // predates the unified schema.
    async function VghLantern__ComponentIndexLoader__GetViewBlock(assetId, viewKey) {
        var assetData  =  await VghLantern__ComponentIndexLoader__LoadAsset(assetId);
        if (!assetData) return null;

        var blockKey  =  BLOCK_ELEVATION_FRONT;
        if (viewKey === 'right') blockKey  =  BLOCK_ELEVATION_RIGHT;
        if (viewKey === 'plan')  blockKey  =  BLOCK_PLAN_TOP;

        var block  =  assetData[blockKey];
        if (block && Array.isArray(block['Na__Geometry__Paths'])) return block;

        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the 3D Mesh Block for an Asset
    // ------------------------------------------------------------
    async function VghLantern__ComponentIndexLoader__GetMesh3d(assetId) {
        var assetData  =  await VghLantern__ComponentIndexLoader__LoadAsset(assetId);
        if (!assetData) return null;

        var mesh  =  assetData[BLOCK_MESH_3D];
        if (mesh && Array.isArray(mesh['Na__Geometry__Vertices'])) return mesh;

        return null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the 2D Elevation Outline Points for an Asset
    // ------------------------------------------------------------
    // The legacy Na__Asset__Profile2D outline in mm, kept for assets that have
    // not been re-exported yet. Unified assets return null here and are drawn
    // from their elevation paths instead.
    async function VghLantern__ComponentIndexLoader__GetOutlinePoints(assetId) {
        var assetData  =  await VghLantern__ComponentIndexLoader__LoadAsset(assetId);
        if (!assetData) return null;

        var profile2d  =  assetData[BLOCK_PROFILE_2D];
        if (!profile2d || !Array.isArray(profile2d['Na__Asset__Profile2D__Points'])) return null;

        return profile2d['Na__Asset__Profile2D__Points'];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // PUBLIC API
    // ------------------------------------------------------------
    return {
        VghLantern__ComponentIndexLoader__LoadIndex              : VghLantern__ComponentIndexLoader__LoadIndex,
        VghLantern__ComponentIndexLoader__GetIndex               : VghLantern__ComponentIndexLoader__GetIndex,
        VghLantern__ComponentIndexLoader__ListCategories         : VghLantern__ComponentIndexLoader__ListCategories,
        VghLantern__ComponentIndexLoader__ListEntries            : VghLantern__ComponentIndexLoader__ListEntries,
        VghLantern__ComponentIndexLoader__ListEntriesByCategory  : VghLantern__ComponentIndexLoader__ListEntriesByCategory,
        VghLantern__ComponentIndexLoader__ListEntriesForRole     : VghLantern__ComponentIndexLoader__ListEntriesForRole,
        VghLantern__ComponentIndexLoader__GetEntry               : VghLantern__ComponentIndexLoader__GetEntry,
        VghLantern__ComponentIndexLoader__LoadAsset              : VghLantern__ComponentIndexLoader__LoadAsset,
        VghLantern__ComponentIndexLoader__PeekAsset              : VghLantern__ComponentIndexLoader__PeekAsset,
        VghLantern__ComponentIndexLoader__GetPreviewUrl          : VghLantern__ComponentIndexLoader__GetPreviewUrl,
        VghLantern__ComponentIndexLoader__GetGlbUrl              : VghLantern__ComponentIndexLoader__GetGlbUrl,
        VghLantern__ComponentIndexLoader__GetPreview2d           : VghLantern__ComponentIndexLoader__GetPreview2d,
        VghLantern__ComponentIndexLoader__GetPlacementMetrics    : VghLantern__ComponentIndexLoader__GetPlacementMetrics,
        VghLantern__ComponentIndexLoader__GetViewBlock           : VghLantern__ComponentIndexLoader__GetViewBlock,
        VghLantern__ComponentIndexLoader__GetMesh3d              : VghLantern__ComponentIndexLoader__GetMesh3d,
        VghLantern__ComponentIndexLoader__GetOutlinePoints       : VghLantern__ComponentIndexLoader__GetOutlinePoints
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppData__ComponentIndexLoader  =  VghLantern__AppData__ComponentIndexLoader;
