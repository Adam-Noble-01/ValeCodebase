// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - SHARED MASTER INDEX R2 HELPER
// =============================================================================
//
// FILE       : src/CloudflareHelper__MasterIndexR2__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Shared Master Index R2 Helper
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read / patch / write the master project index shared by the
//              Visibility and Rename editor handlers
// CREATED    : 07-Jul-2026
//
// DESCRIPTION:
// - Single shared home for master-index R2 access so the Visibility and
//   Rename handlers never duplicate read/parse/write logic (DRY).
// - Generalises the in-place patch pattern already used by
//   CloudflareHandler__ProjectEditor__.js's na_upsert_master_index, allowing
//   callers to patch an arbitrary set of fields on a single entry (matched
//   by folderId) while every other field — and every other project's entry
//   — is preserved untouched.
// - CloudflareHandler__ProjectEditor__.js keeps its own local copy of this
//   logic deliberately (see its header) so the existing, already-working
//   save path is never touched by this refactor.
//
// R2 KEY PATH:
//   master index : VaApps/Index/Na__MasterIndex__ProjectLocations__.json
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Jul-2026 - Version 1.0.0
// - Initial implementation — extracted for the Visibility + Rename handlers.
//
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | R2 Key Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | R2 Object Key Path
    // ------------------------------------------------------------
    const Na__R2Key__IndexPath = 'VaApps/Index/Na__MasterIndex__ProjectLocations__.json'; // <-- Master project index
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Master Index Read / Patch / Write
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Master Index from R2
    // ------------------------------------------------------------
    async function na_read_master_index(r2Bucket) {
        const indexObj = await r2Bucket.get(Na__R2Key__IndexPath);
        if (!indexObj) return null;                                         // <-- Index not found — caller decides fallback

        try {
            const indexData = JSON.parse(await indexObj.text());
            return Array.isArray(indexData.projects) ? indexData : null;    // <-- Reject malformed shape
        } catch (parseError) {
            console.error('[EditorWorker] Master index parse error:', parseError);
            return null;                                                    // <-- Never propagate corrupted data
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Write the Master Index to R2
    // ------------------------------------------------------------
    async function na_write_master_index(r2Bucket, indexData) {
        await r2Bucket.put(
            Na__R2Key__IndexPath,
            JSON.stringify(indexData, null, 4),
            { httpMetadata: { contentType: 'application/json' } }
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Patch a Single Project Entry's Fields by folderId (In-Place)
    // ------------------------------------------------------------
    // Returns { indexData, found }. Only the matching entry's own fields are
    // mutated (spread-merge); every other entry and field is left untouched —
    // pipeline-managed flags (hasImages_R2, hasGlb_R2, imageCount, assetHome,
    // etc.) survive unless explicitly included in patchFields.
    // ------------------------------------------------------------
    function na_patch_master_index_entry(indexData, folderId, patchFields) {
        if (!indexData || !Array.isArray(indexData.projects)) {
            return { indexData, found: false };                             // <-- Nothing to patch against
        }

        const entryIdx = indexData.projects.findIndex(e => e && e.folderId === folderId);
        if (entryIdx === -1) {
            return { indexData, found: false };                             // <-- Project not yet indexed
        }

        indexData.projects[entryIdx] = {
            ...indexData.projects[entryIdx],                                // <-- Preserve all existing fields first
            ...patchFields                                                  // <-- Apply only the requested changes
        };

        return { indexData, found: true };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Shared Master Index R2 Helper API
    // ------------------------------------------------------------
    export {
        na_read_master_index,
        na_write_master_index,
        na_patch_master_index_entry
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
