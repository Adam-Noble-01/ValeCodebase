// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - PROJECT DELETE HANDLER
// =============================================================================
//
// FILE       : src/handlers/CloudflareHandler__ProjectDelete__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Cloudflare Worker - Project Delete Handler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Permanently delete a project's live R2/CDN data and every
//              trace of it from the master index and master config
// CREATED    : 08-Jul-2026
//
// DESCRIPTION:
// - Deletes every object under VaApps/Projects/{folderId}/ (images,
//   thumbnails, GLBs, project.json) — chunked delete() calls, 1000 keys/call.
// - Removes the project's entry entirely from the master index and the
//   master-config mirror (na_remove_master_index_entry /
//   na_remove_master_config_entry) — a full removal, not a disable, so the
//   project stops appearing anywhere (gallery, editor picker) immediately.
// - Bumps the shared build manifest so ProjectLoader's cache logic notices
//   the change on the next app load.
// - VERIFIES the delete by re-listing the prefix after deletion and
//   reporting whether it is now empty (r2Verified / remainingObjectCount) —
//   this is the "R2 is checked" half of the two-sided confirmation the
//   editor form shows; the Flask local-delete endpoint provides the other
//   half ("local is checked").
// - This is deliberately independent of CloudflareHandler__ProjectRename__.js
//   (small list/delete helpers are duplicated rather than shared) so each
//   handler stays self-contained and safe to reason about in isolation.
//
// R2 KEY PATHS:
//   project assets : VaApps/Projects/{folderId}/*
//   master index   : VaApps/Index/Na__MasterIndex__ProjectLocations__.json
//   master config  : VaApps/Index/Na__AppData__MasterConfig__Main.json
//   build manifest : VaApps/Index/Na__BuildVersion__Manifest__.json
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 08-Jul-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================

// @delegate: ../CloudflareHelper__Cors__.js
// @delegate: ../CloudflareHelper__MasterConfigR2__.js
// @delegate: ../CloudflareHelper__MasterIndexR2__.js
// @delegate: ../CloudflareHelper__BuildManifest__.js

import { na_build_cors_headers } from '../CloudflareHelper__Cors__.js';
import { na_read_master_config, na_write_master_config, na_remove_master_config_entry } from '../CloudflareHelper__MasterConfigR2__.js';
import { na_read_master_index, na_write_master_index, na_remove_master_index_entry } from '../CloudflareHelper__MasterIndexR2__.js';
import { na_format_build_date, na_write_build_manifest } from '../CloudflareHelper__BuildManifest__.js';

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | R2 Prefix and Batch Size
    // ------------------------------------------------------------
    const Na__R2Prefix__Projects  = 'VaApps/Projects';                       // <-- R2 root prefix for per-project assets
    const Na__R2Delete__BatchSize = 1000;                                    // <-- R2 delete() accepts up to 1000 keys/call
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | CORS Response Helper
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build JSON Response with CORS Headers
    // ------------------------------------------------------------
    function na_json_cors_response(data, status, requestOrigin, env) {
        return new Response(JSON.stringify(data), {
            status,
            headers : {
                'Content-Type' : 'application/json',
                ...na_build_cors_headers(env, requestOrigin)                  // <-- Shared CORS allow-listing (DRY)
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | R2 Bulk Delete Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | List Every Object Key Under a Prefix (Paginated)
    // ------------------------------------------------------------
    async function na_list_all_keys(r2Bucket, prefix) {
        const keys = [];
        let cursor;
        do {
            const listed = await r2Bucket.list({ prefix, cursor });
            for (const obj of listed.objects) keys.push(obj.key);
            cursor = listed.truncated ? listed.cursor : undefined;
        } while (cursor);
        return keys;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Delete Every Key in a List (Chunked to 1000/call)
    // ------------------------------------------------------------
    async function na_delete_all_keys(r2Bucket, keys) {
        for (let i = 0; i < keys.length; i += Na__R2Delete__BatchSize) {
            await r2Bucket.delete(keys.slice(i, i + Na__R2Delete__BatchSize));
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Handler
// -----------------------------------------------------------------------------

    // FUNCTION | Handle POST /api/editor/projects/{folderId}/delete
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectDelete__HandleDelete(request, env, folderId, requestOrigin) {
        const prefix = `${Na__R2Prefix__Projects}/${folderId}/`;

        try {
            // STEP 1 | List every object under the prefix
            const keys = await na_list_all_keys(env.R2_BUCKET, prefix);

            // STEP 2 | Delete them all (chunked) — idempotent if already empty
            if (keys.length > 0) {
                await na_delete_all_keys(env.R2_BUCKET, keys);
            }

            // STEP 3 | Remove the project entirely from the master index
            let indexRemoved = false;
            const index = await na_read_master_index(env.R2_BUCKET);
            if (index) {
                const indexResult = na_remove_master_index_entry(index, folderId);
                indexRemoved = indexResult.removed;
                if (indexResult.removed) {
                    await na_write_master_index(env.R2_BUCKET, indexResult.indexData);
                }
            }

            // STEP 4 | Remove the project entirely from the master config
            let configRemoved = false;
            const config = await na_read_master_config(env.R2_BUCKET);
            if (config) {
                const configResult = na_remove_master_config_entry(config, folderId);
                configRemoved = configResult.removed;
                if (configResult.removed) {
                    await na_write_master_config(env.R2_BUCKET, configResult.config);
                }
            }

            // STEP 5 | Bump build manifest (triggers SW cache eviction + fresh index/config fetch)
            const buildVersion = Math.floor(Date.now() / 1000);
            const buildDate    = na_format_build_date(buildVersion);
            await na_write_build_manifest(env.R2_BUCKET, folderId, buildVersion, buildDate);

            // STEP 6 | VERIFY — re-list the prefix; it must now be empty
            const verifyList           = await env.R2_BUCKET.list({ prefix, limit: 1 });
            const remainingObjectCount = verifyList.objects.length;
            const r2Verified           = remainingObjectCount === 0;

            return na_json_cors_response({
                success              : true,
                folderId             : folderId,
                deletedObjectCount   : keys.length,
                indexEntryRemoved    : indexRemoved,
                configEntryRemoved   : configRemoved,
                r2Verified           : r2Verified,
                remainingObjectCount : remainingObjectCount,
                buildVersion         : buildVersion,
                buildDate            : buildDate
            }, 200, requestOrigin, env);

        } catch (error) {
            console.error('[EditorWorker] Delete error:', error);
            return na_json_cors_response(
                { error: `Delete failed: ${error.message}` }, 500, requestOrigin, env
            );
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | ProjectDelete Handler API
    // ------------------------------------------------------------
    export {
        Na__CloudflareHandler__ProjectDelete__HandleDelete
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
