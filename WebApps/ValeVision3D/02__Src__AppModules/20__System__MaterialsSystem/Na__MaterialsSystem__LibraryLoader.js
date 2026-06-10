// =============================================================================
// VALEVISION3D - MATERIALS SYSTEM - LIBRARY LOADER
// =============================================================================
//
// FILE       : Na__MaterialsSystem__LibraryLoader.js
// NAMESPACE  : Na__MaterialsSystem
// MODULE     : LibraryLoader
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Fetch, cache, and index the materials library JSON
// CREATED    : 23-Feb-2026
//
// DESCRIPTION:
// - Fetches Na__AppConfig__MaterialsLibrary.json from a configurable URL
//   (PureEngine local library path — unchanged legacy behaviour).
// - Caches the raw library data in module scope (single fetch per session).
// - Flattens the nested series structure into a Map keyed by SketchUpName
//   for O(1) material lookups during the render pipeline.
// - BuildLookup supports BOTH library root keys so the same indexing logic
//   serves both render engines:
//     Na__AppConfig__MaterialsLibrary      (local file — PureEngine)
//     Na__DataLib__CoreIndex__Materials    (GitHub SSOT — MaxEngine)
// - Provides a regex-based check for indexed material name detection.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 10-Jun-2026 - Version 1.1.0
// - BuildLookup now resolves either root key (local library or DataLib SSOT)
//   and accepts a forceRebuild parameter so the cached map can be rebuilt
//   when the active render engine switches material sources.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Indexed Material Name Pattern
    // ------------------------------------------------------------
    const Na__MaterialsSystem__IndexedNameRegex = /^MAT\d{3}__/;              // <-- Matches MAT + 3 digits + __
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State (Session Cache)
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Cached Library Data
    // ------------------------------------------------------------
    let Na__MaterialsSystem__CachedLibraryData = null;                        // <-- Raw parsed JSON (null until fetched)
    let Na__MaterialsSystem__CachedLookupMap   = null;                        // <-- Flattened Map<SketchUpName, Config>
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Library Fetch and Cache
// -----------------------------------------------------------------------------

    // FUNCTION | Load Materials Library from URL
    // ------------------------------------------------------------
    // Fetches the materials library JSON. Returns cached data on
    // subsequent calls without re-fetching. Pass forceReload=true
    // to bypass the cache.
    // ------------------------------------------------------------
    async function Na__MaterialsSystem__LoadLibrary(libraryUrl, forceReload = false) {
        if (Na__MaterialsSystem__CachedLibraryData && !forceReload) {
            return Na__MaterialsSystem__CachedLibraryData;                    // <-- Return cached data
        }

        try {
            const response = await fetch(libraryUrl);                         // <-- Fetch library JSON

            if (!response.ok) {
                console.error(`[MaterialsSystem] Library fetch failed: ${response.status} ${response.statusText}`);
                return null;
            }

            Na__MaterialsSystem__CachedLibraryData = await response.json();   // <-- Parse and cache
            Na__MaterialsSystem__CachedLookupMap   = null;                    // <-- Invalidate lookup on reload

            console.log('[MaterialsSystem] Materials library loaded successfully');
            return Na__MaterialsSystem__CachedLibraryData;

        } catch (error) {
            console.error('[MaterialsSystem] Failed to load materials library:', error);
            return null;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lookup Map Builder
// -----------------------------------------------------------------------------

    // FUNCTION | Build Flat Lookup Map from Library Data
    // ------------------------------------------------------------
    // Flattens the nested series structure into a single Map keyed
    // by SketchUpName for O(1) lookups. Each value is the full
    // material config object. Skips the default material entry.
    // Accepts EITHER library root key:
    //   Na__AppConfig__MaterialsLibrary   (local file — PureEngine)
    //   Na__DataLib__CoreIndex__Materials (GitHub SSOT — MaxEngine)
    // Pass forceRebuild=true when the material source has changed
    // (e.g. on a render engine switch) to bypass the session cache.
    // ------------------------------------------------------------
    function Na__MaterialsSystem__BuildLookup(libraryData, forceRebuild = false) {
        if (Na__MaterialsSystem__CachedLookupMap && !forceRebuild) {
            return Na__MaterialsSystem__CachedLookupMap;                      // <-- Return cached map
        }

        const lookupMap = new Map();                                          // <-- SketchUpName -> MaterialConfig

        const library = libraryData
            ? (libraryData.Na__DataLib__CoreIndex__Materials || libraryData.Na__AppConfig__MaterialsLibrary)
            : null;                                                           // <-- Resolve whichever root key is present

        if (!library) {
            console.warn('[MaterialsSystem] No library data to index');
            return lookupMap;
        }

        for (const seriesKey of Object.keys(library)) {
            const series = library[seriesKey];                                // <-- e.g. MAT100__BasicSeries__

            if (typeof series !== 'object' || series === null) continue;     // <-- Skip non-object metadata entries

            for (const materialKey of Object.keys(series)) {
                const config = series[materialKey];                           // <-- Individual material config

                if (!config || typeof config !== 'object') continue;         // <-- Guard against malformed entries
                if (config.IsDefault) continue;                               // <-- Skip default fallback entry

                const sketchUpName = config.SketchUpName;                     // <-- Lookup key
                if (!sketchUpName) continue;                                  // <-- Guard against missing name

                lookupMap.set(sketchUpName, config);                          // <-- Index by SketchUpName
            }
        }

        Na__MaterialsSystem__CachedLookupMap = lookupMap;                     // <-- Cache the built map

        console.log(`[MaterialsSystem] Lookup map built: ${lookupMap.size} indexed materials`);
        return lookupMap;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Utility Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Check If Material Name Is Indexed
    // ------------------------------------------------------------
    // Returns true if the name matches the MAT{NNN}__ pattern,
    // indicating it should be looked up in the materials library.
    // ------------------------------------------------------------
    function Na__MaterialsSystem__IsIndexedName(materialName) {
        if (!materialName || typeof materialName !== 'string') return false;
        return Na__MaterialsSystem__IndexedNameRegex.test(materialName);      // <-- Test against regex
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Materials Library Loader API
    // ------------------------------------------------------------
    export {
        Na__MaterialsSystem__LoadLibrary,
        Na__MaterialsSystem__BuildLookup,
        Na__MaterialsSystem__IsIndexedName
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
