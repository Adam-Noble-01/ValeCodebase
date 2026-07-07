// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - SHARED MASTER CONFIG R2 HELPER
// =============================================================================
//
// FILE       : src/CloudflareHelper__MasterConfigR2__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Shared Master Config R2 Helper
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read / patch / write the master-config R2 mirror shared by the
//              Visibility and Rename editor handlers
// CREATED    : 07-Jul-2026
//
// DESCRIPTION:
// - Single shared home for master-config R2 mirror access so the Visibility
//   and Rename handlers never duplicate read/parse/write logic (DRY).
// - The master config mirror at VaApps/Index/Na__AppData__MasterConfig__Main.json
//   is fetched R2-first by the web app (Na__AppData__ProjectLoader.js) — this
//   helper keeps that mirror live without requiring a GH push.
// - Only ever patches the single `projects[]` entry matching a given folderId;
//   every other field in the master config is preserved untouched.
//
// R2 KEY PATH:
//   master config : VaApps/Index/Na__AppData__MasterConfig__Main.json
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
    const Na__R2Key__MasterConfigPath = 'VaApps/Index/Na__AppData__MasterConfig__Main.json'; // <-- Master config mirror
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Master Config Read / Patch / Write
// -----------------------------------------------------------------------------

    // FUNCTION | Read the Master Config Mirror from R2
    // ------------------------------------------------------------
    async function na_read_master_config(r2Bucket) {
        const configObj = await r2Bucket.get(Na__R2Key__MasterConfigPath);
        if (!configObj) return null;                                        // <-- Mirror not found — caller decides fallback

        try {
            return JSON.parse(await configObj.text());
        } catch (parseError) {
            console.error('[EditorWorker] Master config parse error:', parseError);
            return null;                                                    // <-- Never propagate corrupted data
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Write the Master Config Mirror to R2
    // ------------------------------------------------------------
    async function na_write_master_config(r2Bucket, config) {
        await r2Bucket.put(
            Na__R2Key__MasterConfigPath,
            JSON.stringify(config, null, 4),
            { httpMetadata: { contentType: 'application/json' } }
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Patch a Single Project Entry's Fields by folderId (In-Place)
    // ------------------------------------------------------------
    // Returns { config, found }. Only the matching entry's own fields are
    // mutated (spread-merge); array position and every other project entry
    // are left completely untouched.
    // ------------------------------------------------------------
    function na_patch_master_config_entry(config, folderId, patchFields) {
        if (!config || !Array.isArray(config.projects)) {
            return { config, found: false };                                // <-- Nothing to patch against
        }

        const entryIdx = config.projects.findIndex(p => p && p.folderId === folderId);
        if (entryIdx === -1) {
            return { config, found: false };                                // <-- Project not in master config
        }

        config.projects[entryIdx] = {
            ...config.projects[entryIdx],                                   // <-- Preserve all existing fields first
            ...patchFields                                                  // <-- Apply only the requested changes
        };

        return { config, found: true };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Shared Master Config R2 Helper API
    // ------------------------------------------------------------
    export {
        na_read_master_config,
        na_write_master_config,
        na_patch_master_config_entry
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
