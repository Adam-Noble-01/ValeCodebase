// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - PROJECT EDITOR HANDLER
// =============================================================================
//
// FILE       : src/handlers/CloudflareHandler__ProjectEditor__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Cloudflare Worker - Project Editor Handler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Write project.json to R2, upsert master index, bump build manifest
// CREATED    : 26-Jun-2026
//
// DESCRIPTION:
// - Writes the POSTed project.json to R2 at VaApps/Projects/{folderId}/project.json
// - Upserts the master project index: updates lastSynced + hasProjectJson_R2 only.
//   All other pipeline-managed fields (hasImages_R2, hasThumbnails_R2, hasGlb_R2,
//   imageCount, assetHome) are explicitly preserved — they are owned by the Python
//   sync pipeline and must never be overwritten from the editor save path.
// - Writes a fresh build manifest to VaApps/Index/Na__BuildVersion__Manifest__.json
//   so ProjectLoader's SW cache eviction logic triggers on the next app load.
//
// R2 KEY PATHS:
//   project.json   : VaApps/Projects/{folderId}/project.json
//   master index   : VaApps/Index/Na__MasterIndex__ProjectLocations__.json
//   build manifest : VaApps/Index/Na__BuildVersion__Manifest__.json
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 08-Jul-2026 - Version 1.2.0
// - na_write_project_json now sets cacheControl: 'no-cache, max-age=0' on the
//   R2 object (matching the build manifest/masterConfig mirror pattern) so
//   an edit is revalidated on every subsequent fetch instead of potentially
//   being served stale from the browser's HTTP cache or Cloudflare's edge.
//
// 26-Jun-2026 - Version 1.1.0
// - CORS response now uses shared CloudflareHelper__Cors__.js (DRY).
// - Fixes 127.0.0.1 dev-origin rejection on save responses.
//
// 26-Jun-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================

// @delegate: ../CloudflareHelper__Cors__.js

import { na_build_cors_headers } from '../CloudflareHelper__Cors__.js';

// -----------------------------------------------------------------------------
// REGION | R2 Key Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | R2 Object Key Paths
    // ------------------------------------------------------------
    const Na__R2Key__IndexPath    = 'VaApps/Index/Na__MasterIndex__ProjectLocations__.json'; // <-- Master project index
    const Na__R2Key__ManifestPath = 'VaApps/Index/Na__BuildVersion__Manifest__.json';         // <-- Build version manifest
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Date Formatting Helper
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Format Unix Timestamp as DD-MMM-YYYY at HH:MM
    // ------------------------------------------------------------
    function na_format_build_date(unixTimestamp) {
        const d       = new Date(unixTimestamp * 1000);
        const day     = String(d.getUTCDate()).padStart(2, '0');
        const months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const month   = months[d.getUTCMonth()];
        const year    = d.getUTCFullYear();
        const hh      = String(d.getUTCHours()).padStart(2, '0');
        const mm      = String(d.getUTCMinutes()).padStart(2, '0');
        return `${day}-${month}-${year} at ${hh}:${mm}`;                    // <-- e.g. "26-Jun-2026 at 14:30"
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | R2 Write Operations
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Write project.json to R2
    // ------------------------------------------------------------
    async function na_write_project_json(r2Bucket, folderId, projectJson) {
        const r2Key = `VaApps/Projects/${folderId}/project.json`;
        await r2Bucket.put(r2Key, projectJson, {
            httpMetadata : {
                contentType  : 'application/json',                           // <-- Ensure correct MIME on CDN reads
                cacheControl : 'no-cache, max-age=0'                         // <-- Force edge/browser revalidation so an edit is visible immediately
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Upsert Master Index (Preserve Pipeline-Managed Fields)
    // ------------------------------------------------------------
    // Only updates: lastSynced, hasProjectJson_R2
    // Preserves:    hasImages_R2, hasThumbnails_R2, hasGlb_R2, imageCount, assetHome,
    //               enabled, year, projectCode, name, folderId
    //               (all other fields owned by the Python sync pipeline)
    // ------------------------------------------------------------
    async function na_upsert_master_index(r2Bucket, folderId, buildDate) {
        const indexObj = await r2Bucket.get(Na__R2Key__IndexPath);
        if (!indexObj) {
            console.warn('[EditorWorker] Master index not found in R2 — skipping upsert.');
            return;                                                           // <-- Nothing to upsert against
        }

        let indexData;
        try {
            const indexText = await indexObj.text();
            indexData       = JSON.parse(indexText);
        } catch (parseError) {
            console.error('[EditorWorker] Master index parse error — skipping upsert:', parseError);
            return;                                                           // <-- Do not overwrite with corrupted data
        }

        if (!Array.isArray(indexData)) {
            console.warn('[EditorWorker] Master index is not an array — skipping upsert.');
            return;
        }

        // FIND THE MATCHING ENTRY BY FULL FOLDER ID
        const entryIdx = indexData.findIndex(e => e && e.folderId === folderId);
        if (entryIdx === -1) {
            console.warn(`[EditorWorker] folderId "${folderId}" not found in master index — skipping upsert.`);
            return;                                                           // <-- Project not yet indexed; pipeline must run first
        }

        // MERGE ONLY EDITOR-SAFE FIELDS (spread preserves all pipeline fields)
        indexData[entryIdx] = {
            ...indexData[entryIdx],                                           // <-- Preserve ALL existing fields first
            hasProjectJson_R2 : true,                                         // <-- Confirm project.json now lives on R2
            lastSynced        : buildDate                                     // <-- Update last-synced timestamp
        };

        await r2Bucket.put(
            Na__R2Key__IndexPath,
            JSON.stringify(indexData, null, 4),
            { httpMetadata: { contentType: 'application/json' } }
        );
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Write Build Version Manifest
    // ------------------------------------------------------------
    // The manifest schema matches na_write_build_manifest() in the Python pipeline
    // so ProjectLoader's na_check_and_clear_on_build_change() triggers correctly.
    // ------------------------------------------------------------
    async function na_write_build_manifest(r2Bucket, folderId, buildVersion, buildDate) {
        const manifest = {
            buildVersion : buildVersion,                                      // <-- Unix timestamp integer
            buildDate    : buildDate,                                         // <-- "DD-MMM-YYYY at HH:MM"
            lastProject  : folderId                                           // <-- Last project that triggered a save
        };
        await r2Bucket.put(
            Na__R2Key__ManifestPath,
            JSON.stringify(manifest, null, 4),
            { httpMetadata: { contentType: 'application/json' } }
        );
    }
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
// REGION | Main Handler
// -----------------------------------------------------------------------------

    // FUNCTION | Handle POST /api/editor/projects/{folderId}
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectEditor__HandleSave(request, env, folderId, requestOrigin) {
        // PARSE REQUEST BODY
        let projectData;
        try {
            projectData = await request.json();
        } catch {
            return na_json_cors_response(
                { error: 'Invalid JSON body — could not parse request' }, 400, requestOrigin, env
            );
        }

        if (!projectData || typeof projectData !== 'object' || Array.isArray(projectData)) {
            return na_json_cors_response(
                { error: 'Project data must be a JSON object' }, 400, requestOrigin, env
            );
        }

        // VALIDATE MINIMUM REQUIRED FIELDS
        if (!projectData.projectCode) {
            return na_json_cors_response(
                { error: 'Missing required field: projectCode' }, 400, requestOrigin, env
            );
        }

        const projectJson  = JSON.stringify(projectData, null, 4);           // <-- Consistent 4-space indentation
        const buildVersion = Math.floor(Date.now() / 1000);                  // <-- Unix timestamp (seconds)
        const buildDate    = na_format_build_date(buildVersion);

        try {
            // STEP 1 | Write project.json to R2 (primary SSOT write)
            await na_write_project_json(env.R2_BUCKET, folderId, projectJson);

            // STEP 2 | Upsert master index (preserve pipeline-managed fields)
            await na_upsert_master_index(env.R2_BUCKET, folderId, buildDate);

            // STEP 3 | Bump build manifest (triggers SW cache eviction on next app load)
            await na_write_build_manifest(env.R2_BUCKET, folderId, buildVersion, buildDate);

            return na_json_cors_response({
                success      : true,
                message      : `Project ${folderId} saved to R2.`,
                buildVersion : buildVersion,
                buildDate    : buildDate
            }, 200, requestOrigin, env);

        } catch (error) {
            console.error('[EditorWorker] R2 write error:', error);
            return na_json_cors_response(
                { error: `R2 write failed: ${error.message}` }, 500, requestOrigin, env
            );
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | ProjectEditor Handler API
    // ------------------------------------------------------------
    export {
        Na__CloudflareHandler__ProjectEditor__HandleSave
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
