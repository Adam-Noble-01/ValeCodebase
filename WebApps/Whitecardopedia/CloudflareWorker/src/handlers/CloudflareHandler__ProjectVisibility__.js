// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - PROJECT VISIBILITY HANDLER
// =============================================================================
//
// FILE       : src/handlers/CloudflareHandler__ProjectVisibility__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Cloudflare Worker - Project Visibility Handler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Toggle a project's gallery-visibility (enabled) flag live on R2
// CREATED    : 07-Jul-2026
//
// DESCRIPTION:
// - Patches the `enabled` flag on the matching master-config project entry
//   AND the matching master-index project entry so both R2-fetched sources
//   agree immediately (no GH push required).
// - Bumps the shared build manifest so ProjectLoader's cache logic notices
//   the change on the next app load.
// - Never touches project.json — visibility is a masterConfig/index concern,
//   not a project.json field.
//
// R2 KEY PATHS:
//   master config  : VaApps/Index/Na__AppData__MasterConfig__Main.json
//   master index   : VaApps/Index/Na__MasterIndex__ProjectLocations__.json
//   build manifest : VaApps/Index/Na__BuildVersion__Manifest__.json
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 07-Jul-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================

// @delegate: ../CloudflareHelper__Cors__.js
// @delegate: ../CloudflareHelper__MasterConfigR2__.js
// @delegate: ../CloudflareHelper__MasterIndexR2__.js
// @delegate: ../CloudflareHelper__BuildManifest__.js

import { na_build_cors_headers } from '../CloudflareHelper__Cors__.js';
import { na_read_master_config, na_write_master_config, na_patch_master_config_entry } from '../CloudflareHelper__MasterConfigR2__.js';
import { na_read_master_index, na_write_master_index, na_patch_master_index_entry } from '../CloudflareHelper__MasterIndexR2__.js';
import { na_format_build_date, na_write_build_manifest } from '../CloudflareHelper__BuildManifest__.js';

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
// REGION | Main Handler
// -----------------------------------------------------------------------------

    // FUNCTION | Handle POST /api/editor/projects/{folderId}/visibility
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectVisibility__HandleToggle(request, env, folderId, requestOrigin) {
        // PARSE REQUEST BODY
        let body;
        try {
            body = await request.json();
        } catch {
            return na_json_cors_response(
                { error: 'Invalid JSON body — could not parse request' }, 400, requestOrigin, env
            );
        }

        if (!body || typeof body.enabled !== 'boolean') {
            return na_json_cors_response(
                { error: 'Missing or invalid required field: enabled (boolean)' }, 400, requestOrigin, env
            );
        }

        const enabled      = body.enabled;
        const buildVersion = Math.floor(Date.now() / 1000);                  // <-- Unix timestamp (seconds)
        const buildDate    = na_format_build_date(buildVersion);

        try {
            // STEP 1 | Patch masterConfig entry (gallery membership SSOT)
            const config = await na_read_master_config(env.R2_BUCKET);
            if (!config) {
                return na_json_cors_response(
                    { error: 'Master config not found in R2 — cannot toggle visibility' }, 500, requestOrigin, env
                );
            }
            const configPatch = na_patch_master_config_entry(config, folderId, { enabled });
            if (!configPatch.found) {
                return na_json_cors_response(
                    { error: `folderId "${folderId}" not found in master config` }, 404, requestOrigin, env
                );
            }
            await na_write_master_config(env.R2_BUCKET, configPatch.config);

            // STEP 2 | Patch master index entry (kept in step with masterConfig)
            const index = await na_read_master_index(env.R2_BUCKET);
            if (index) {
                const indexPatch = na_patch_master_index_entry(index, folderId, { enabled, lastSynced: buildDate });
                if (indexPatch.found) {
                    await na_write_master_index(env.R2_BUCKET, indexPatch.indexData);
                }
            }

            // STEP 3 | Bump build manifest (triggers SW cache eviction on next app load)
            await na_write_build_manifest(env.R2_BUCKET, folderId, buildVersion, buildDate);

            return na_json_cors_response({
                success      : true,
                message      : `Project ${folderId} visibility set to ${enabled}.`,
                enabled      : enabled,
                buildVersion : buildVersion,
                buildDate    : buildDate
            }, 200, requestOrigin, env);

        } catch (error) {
            console.error('[EditorWorker] Visibility toggle error:', error);
            return na_json_cors_response(
                { error: `Visibility toggle failed: ${error.message}` }, 500, requestOrigin, env
            );
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | ProjectVisibility Handler API
    // ------------------------------------------------------------
    export {
        Na__CloudflareHandler__ProjectVisibility__HandleToggle
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
