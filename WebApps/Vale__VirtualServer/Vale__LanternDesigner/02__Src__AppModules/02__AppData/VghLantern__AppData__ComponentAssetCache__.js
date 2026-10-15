/* =============================================================================
   VGHLANTERN - COMPONENT ASSET CACHE
   =============================================================================

   FILE       : VghLantern__AppData__ComponentAssetCache__.js
   NAMESPACE  : VghLantern
   MODULE     : AppData - ComponentAssetCache
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : On-demand loading and session caching of heavy component assets
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - A unified component export carries its full 2D projections AND its full 3D
     mesh in one file, which runs to one to three megabytes per asset. Loading
     the whole library up front would cost tens of megabytes for a lantern that
     uses two components, so nothing is fetched until something asks for it.
   - Assets are cached for the lifetime of the page. Switching between two
     finials repeatedly costs one fetch each, ever.
   - The cache is deliberately memory only. Persisting to localStorage or
     IndexedDB would buy a faster second visit at the price of a cache-busting
     scheme to invalidate it whenever an asset is re-exported, and during
     authoring that trade is the wrong way round. A new session re-fetches.

   ---------------------------------------------------------------------------

   MEMORY BUDGET:
   The cache trims itself to a byte budget on a least-recently-used basis, so a
   long session that browses forty components does not hold all forty in memory.
   Sizes come from the index's FileSizeBytes, which is the on-disk JSON size -
   an underestimate of the parsed object, but a consistent one, and the budget
   is set with that in mind.

   ============================================================================= */

// =============================================================================
// REGION | Component Asset Cache Module
// =============================================================================

const VghLantern__AppData__ComponentAssetCache = (function() {

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Cache Budget
    // ------------------------------------------------------------
    const DEFAULT_BUDGET_BYTES  =  48 * 1024 * 1024;                         // <-- Roughly a dozen typical assets
    const MIN_RETAINED_ENTRIES  =  2;                                        // <-- Never evict below this, or a single huge asset thrashes
    // ------------------------------------------------------------


    // MODULE VARIABLES | Cache Stores
    // ------------------------------------------------------------
    let VghLantern__ComponentAssetCache__Entries    =  new Map();            // <-- assetId -> { Data, Bytes, LastUsedAt }
    let VghLantern__ComponentAssetCache__Pending    =  new Map();            // <-- assetId -> in-flight Promise
    let VghLantern__ComponentAssetCache__UseCounter =  0;                    // <-- Monotonic clock for LRU ordering
    let VghLantern__ComponentAssetCache__Budget     =  DEFAULT_BUDGET_BYTES;
    let VghLantern__ComponentAssetCache__Stats      =  { Hits: 0, Misses: 0, Evictions: 0, BytesFetched: 0 };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Budget Management
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Total Bytes Currently Held
    // ------------------------------------------------------------
    function VghLantern__ComponentAssetCache__HeldBytes() {
        var total  =  0;
        VghLantern__ComponentAssetCache__Entries.forEach(function(entry) { total += entry.Bytes; });
        return total;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Evict Least Recently Used Entries Down to Budget
    // ------------------------------------------------------------
    // Guarded by MIN_RETAINED_ENTRIES so the currently placed component and the
    // one the user just switched away from both survive, which is what makes
    // toggling back and forth free.
    function VghLantern__ComponentAssetCache__TrimToBudget() {
        if (VghLantern__ComponentAssetCache__HeldBytes() <= VghLantern__ComponentAssetCache__Budget) return;

        var ordered  =  Array.from(VghLantern__ComponentAssetCache__Entries.entries())
            .sort(function(a, b) { return a[1].LastUsedAt - b[1].LastUsedAt; });

        for (var i = 0; i < ordered.length; i++) {
            if (VghLantern__ComponentAssetCache__Entries.size <= MIN_RETAINED_ENTRIES) break;
            if (VghLantern__ComponentAssetCache__HeldBytes() <= VghLantern__ComponentAssetCache__Budget) break;

            VghLantern__ComponentAssetCache__Entries.delete(ordered[i][0]);
            VghLantern__ComponentAssetCache__Stats.Evictions++;
            console.log('[VghLantern__ComponentAssetCache] Evicted "' + ordered[i][0] + '" to stay within budget.');
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Set the Cache Byte Budget
    // ------------------------------------------------------------
    function VghLantern__ComponentAssetCache__SetBudgetBytes(byteCount) {
        if (typeof byteCount !== 'number' || byteCount <= 0) return;
        VghLantern__ComponentAssetCache__Budget  =  byteCount;
        VghLantern__ComponentAssetCache__TrimToBudget();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Asset Loading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Record a Freshly Fetched Asset
    // ------------------------------------------------------------
    function VghLantern__ComponentAssetCache__Store(assetId, assetData, byteHint) {
        VghLantern__ComponentAssetCache__UseCounter++;

        VghLantern__ComponentAssetCache__Entries.set(assetId, {
            Data       : assetData,
            Bytes      : (typeof byteHint === 'number' && byteHint > 0) ? byteHint : 512 * 1024,
            LastUsedAt : VghLantern__ComponentAssetCache__UseCounter
        });

        VghLantern__ComponentAssetCache__TrimToBudget();
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Cached Asset Without Fetching
    // ------------------------------------------------------------
    // Lets a synchronous renderer take the fast path when the asset happens to
    // be resident, and fall back to its placeholder when it is not, rather than
    // forcing every caller to become async.
    function VghLantern__ComponentAssetCache__Peek(assetId) {
        var entry  =  VghLantern__ComponentAssetCache__Entries.get(assetId);
        if (!entry) return null;

        VghLantern__ComponentAssetCache__UseCounter++;
        entry.LastUsedAt  =  VghLantern__ComponentAssetCache__UseCounter;
        return entry.Data;
    }
    // ------------------------------------------------------------


    // FUNCTION | Load an Asset by Id, Fetching Only if Not Already Held
    // ------------------------------------------------------------
    // fetchUrl is supplied by the caller (the index loader knows how to resolve
    // a JsonUrl); this module owns caching and nothing else.
    function VghLantern__ComponentAssetCache__Load(assetId, fetchUrl, byteHint) {
        if (!assetId || !fetchUrl) return Promise.resolve(null);

        var cached  =  VghLantern__ComponentAssetCache__Peek(assetId);
        if (cached) {
            VghLantern__ComponentAssetCache__Stats.Hits++;
            return Promise.resolve(cached);
        }

        var pending  =  VghLantern__ComponentAssetCache__Pending.get(assetId);
        if (pending) return pending;                                         // <-- 2D and 3D asking at once share one fetch

        VghLantern__ComponentAssetCache__Stats.Misses++;

        var loadPromise  =  (async function() {
            try {
                var startedAt  =  (window.performance && performance.now) ? performance.now() : 0;

                // no-store, not the HTTP cache: during authoring an asset is
                // re-exported from SketchUp and must be picked up on the next
                // session without anyone having to hard-refresh.
                var response  =  await fetch(fetchUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                var assetData  =  await response.json();
                var elapsedMs  =  (window.performance && performance.now) ? Math.round(performance.now() - startedAt) : 0;

                VghLantern__ComponentAssetCache__Stats.BytesFetched  +=  (byteHint || 0);
                VghLantern__ComponentAssetCache__Store(assetId, assetData, byteHint);

                console.log('[VghLantern__ComponentAssetCache] Loaded "' + assetId + '" ('
                    + Math.round((byteHint || 0) / 1024) + ' kB) in ' + elapsedMs + ' ms.');

                return assetData;
            } catch (error) {
                console.error('[VghLantern__ComponentAssetCache] Failed to load "' + assetId + '":', error.message);
                return null;
            } finally {
                VghLantern__ComponentAssetCache__Pending.delete(assetId);
            }
        })();

        VghLantern__ComponentAssetCache__Pending.set(assetId, loadPromise);
        return loadPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether an Asset Is Resident or Currently Loading
    // ------------------------------------------------------------
    function VghLantern__ComponentAssetCache__IsReady(assetId) {
        return VghLantern__ComponentAssetCache__Entries.has(assetId);
    }

    function VghLantern__ComponentAssetCache__IsLoading(assetId) {
        return VghLantern__ComponentAssetCache__Pending.has(assetId);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cache Lifecycle and Diagnostics
// -----------------------------------------------------------------------------

    // FUNCTION | Drop a Single Asset from the Cache
    // ------------------------------------------------------------
    function VghLantern__ComponentAssetCache__Invalidate(assetId) {
        VghLantern__ComponentAssetCache__Entries.delete(assetId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Clear Every Cached Asset
    // ------------------------------------------------------------
    // Called when the component library is rebuilt during authoring, so a
    // freshly exported asset is picked up without a page reload.
    function VghLantern__ComponentAssetCache__ClearAll() {
        VghLantern__ComponentAssetCache__Entries.clear();
        VghLantern__ComponentAssetCache__Pending.clear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Cache Occupancy and Hit Rate
    // ------------------------------------------------------------
    function VghLantern__ComponentAssetCache__GetStats() {
        return {
            EntryCount   : VghLantern__ComponentAssetCache__Entries.size,
            HeldBytes    : VghLantern__ComponentAssetCache__HeldBytes(),
            BudgetBytes  : VghLantern__ComponentAssetCache__Budget,
            Hits         : VghLantern__ComponentAssetCache__Stats.Hits,
            Misses       : VghLantern__ComponentAssetCache__Stats.Misses,
            Evictions    : VghLantern__ComponentAssetCache__Stats.Evictions,
            BytesFetched : VghLantern__ComponentAssetCache__Stats.BytesFetched,
            ResidentIds  : Array.from(VghLantern__ComponentAssetCache__Entries.keys())
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
        VghLantern__ComponentAssetCache__Load            : VghLantern__ComponentAssetCache__Load,
        VghLantern__ComponentAssetCache__Peek            : VghLantern__ComponentAssetCache__Peek,
        VghLantern__ComponentAssetCache__IsReady         : VghLantern__ComponentAssetCache__IsReady,
        VghLantern__ComponentAssetCache__IsLoading       : VghLantern__ComponentAssetCache__IsLoading,
        VghLantern__ComponentAssetCache__Invalidate      : VghLantern__ComponentAssetCache__Invalidate,
        VghLantern__ComponentAssetCache__ClearAll        : VghLantern__ComponentAssetCache__ClearAll,
        VghLantern__ComponentAssetCache__SetBudgetBytes  : VghLantern__ComponentAssetCache__SetBudgetBytes,
        VghLantern__ComponentAssetCache__GetStats        : VghLantern__ComponentAssetCache__GetStats
    };

// endregion -------------------------------------------------------------------

})();

// endregion ===================================================================

window.VghLantern__AppData__ComponentAssetCache  =  VghLantern__AppData__ComponentAssetCache;
