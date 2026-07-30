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

   ASSET SCHEMA (unified with the SketchUp ProfilePathTracer exporter):
   - Na__Asset__Metadata    : id, name, category, description, revision
   - Na__Asset__Profile2D   : closed outline points for gallery + elevation linework
   - Na__Asset__Mesh3D      : optional inline mesh for light components
   - Na__Asset__Glb3D__Url  : optional GLB reference for heavier meshes
   - Na__Asset__Has2dProfile / Na__Asset__Has3d : UI gating flags

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
    let VghLantern__ComponentIndexLoader__AssetCache    =  {};              // <-- AssetId -> fully parsed asset JSON
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
    // Role is one of: finial | finialBase | cresting | vent.
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

    // HELPER FUNCTION | Resolve an Index Entry Url Against the Library Root
    // ------------------------------------------------------------
    function VghLantern__ComponentIndexLoader__ResolveUrl(relativeUrl) {
        if (!relativeUrl) return null;
        if (/^(https?:)?\/\//.test(relativeUrl) || relativeUrl.charAt(0) === '/') return relativeUrl;
        return LIBRARY_ROOT_PATH + relativeUrl;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load a Single Component Asset JSON by Asset Id
    // ------------------------------------------------------------
    async function VghLantern__ComponentIndexLoader__LoadAsset(assetId) {
        if (!assetId) return null;
        if (VghLantern__ComponentIndexLoader__AssetCache[assetId]) return VghLantern__ComponentIndexLoader__AssetCache[assetId];

        await VghLantern__ComponentIndexLoader__LoadIndex();

        var entry  =  VghLantern__ComponentIndexLoader__GetEntry(assetId);
        if (!entry) {
            console.warn('[VghLantern__ComponentIndexLoader] Unknown component asset id:', assetId);
            return null;
        }

        var assetUrl  =  VghLantern__ComponentIndexLoader__ResolveUrl(entry.JsonUrl);
        if (!assetUrl) {
            console.warn('[VghLantern__ComponentIndexLoader] Index entry has no JsonUrl:', assetId);
            return null;
        }

        try {
            var response  =  await fetch(assetUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            var assetData  =  await response.json();
            VghLantern__ComponentIndexLoader__AssetCache[assetId]  =  assetData;
            return assetData;
        } catch (e) {
            console.error('[VghLantern__ComponentIndexLoader] Failed to load component asset ' + assetId + ':', e.message);
            return null;
        }
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


    // FUNCTION | Get the 2D Elevation Outline Points for an Asset
    // ------------------------------------------------------------
    // Returns the Na__Asset__Profile2D outline in mm, or null when the component
    // is 3D only. The 2D finial renderer falls back to a placeholder on null.
    async function VghLantern__ComponentIndexLoader__GetOutlinePoints(assetId) {
        var assetData  =  await VghLantern__ComponentIndexLoader__LoadAsset(assetId);
        if (!assetData) return null;

        var profile2d  =  assetData['Na__Asset__Profile2D'];
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
        VghLantern__ComponentIndexLoader__GetPreviewUrl          : VghLantern__ComponentIndexLoader__GetPreviewUrl,
        VghLantern__ComponentIndexLoader__GetGlbUrl              : VghLantern__ComponentIndexLoader__GetGlbUrl,
        VghLantern__ComponentIndexLoader__GetOutlinePoints       : VghLantern__ComponentIndexLoader__GetOutlinePoints
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppData__ComponentIndexLoader  =  VghLantern__AppData__ComponentIndexLoader;
