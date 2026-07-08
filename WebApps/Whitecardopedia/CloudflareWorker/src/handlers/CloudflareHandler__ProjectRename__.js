// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - PROJECT RENAME HANDLER
// =============================================================================
//
// FILE       : src/handlers/CloudflareHandler__ProjectRename__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Cloudflare Worker - Project Rename Handler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Move a project's entire live R2 folder to a new folderId
// CREATED    : 07-Jul-2026
//
// DESCRIPTION:
// - Moves every object under VaApps/Projects/{oldFolderId}/ to
//   VaApps/Projects/{newFolderId}/ by streaming get() -> put() copies (the
//   documented, reliable R2 Workers binding pattern — R2Bucket.copy() is not
//   yet listed in the public Workers API reference as of this writing).
// - Rewrites the folder segment embedded in valeVision_ModelUrls (and the
//   legacy singular valeVision_ModelUrl) so ValeVision3D's GLB loader keeps
//   working — GLB filenames themselves are left untouched, only the folder
//   path they live under changes.
// - Only deletes the OLD objects once every copy AND the corrected
//   project.json write at the NEW location have succeeded — on any failure
//   the old folder is left completely intact and an error is returned.
// - Patches the master index (folderId/year/projectCode/name/lastSynced) and
//   the master-config mirror (folderId) so both R2-fetched sources agree
//   immediately (no GH push required) — see the shared
//   CloudflareHelper__MasterIndexR2__.js / CloudflareHelper__MasterConfigR2__.js.
// - Does NOT touch the local SketchUp project folder or the ValeVision Cloud
//   Sync plugin — that plugin re-derives its target folder purely from the
//   local disk folder name on every sync and is unaware of this move.
// - Rejects Windows-reserved filename characters (< > : " \ | ? *) and
//   control characters in the new folder segment. R2 object keys tolerate
//   most of these, but a Windows local mirror does not — without this check
//   a folder name containing e.g. "|" could succeed on R2 while silently
//   failing to create/move on the Flask local mirror, permanently drifting
//   the two out of step (this is an authoritative server-side re-check; the
//   editor form validates the same pattern before ever calling this route).
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
// 08-Jul-2026 - Version 1.2.0
// - The corrected project.json written to the new prefix now also sets
//   cacheControl: 'no-cache, max-age=0' (matching the editor save handler),
//   so a renamed project's data is never served stale from the browser's
//   HTTP cache or Cloudflare's edge cache at its new location.
//
// 08-Jul-2026 - Version 1.1.0
// - Tightened Na__FolderId__ValidPattern to reject Windows-reserved filename
//   characters and control characters in the folder segment, not just check
//   for a "YYYY/..." shape — closes the exact bug class where a rename with
//   e.g. a "|" character could move R2 while breaking the local mirror move.
//
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
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | R2 Prefix and Validation Pattern
    // ------------------------------------------------------------
    const Na__R2Prefix__Projects      = 'VaApps/Projects';                   // <-- R2 root prefix for per-project assets
    // "YYYY/" then one-or-more characters excluding the Windows-reserved set
    // (< > : " / \ | ? *) and control characters — see DEVELOPMENT LOG.
    const Na__FolderId__ValidPattern  = /^\d{4}\/[^<>:"/\\|?*\x00-\x1F]+$/;
    const Na__R2Delete__BatchSize     = 1000;                                // <-- R2 delete() accepts up to 1000 keys/call
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
// REGION | folderId Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Split a folderId into { year, folder }
    // ------------------------------------------------------------
    function na_split_folder_id(folderId) {
        const parts = String(folderId || '').split('/');
        if (parts.length < 2) return { year: '', folder: String(folderId || '') };
        return { year: parts[0], folder: parts.slice(1).join('/') };        // <-- Folder segment may itself contain '/'
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Rewrite Embedded Folder-Path URLs Inside project.json
    // ------------------------------------------------------------
    // Only the folder segment of each absolute CDN URL changes — GLB / image
    // filenames (which may still carry the OLD project name as a prefix) are
    // left exactly as-is. ValeVision3D classifies GLBs by their {Role}
    // filename segment, not the project-name prefix, so this is safe.
    // ------------------------------------------------------------
    function na_rewrite_project_folder_urls(projectData, oldFolderId, newFolderId) {
        const oldSegment = `/${Na__R2Prefix__Projects}/${oldFolderId}/`;
        const newSegment = `/${Na__R2Prefix__Projects}/${newFolderId}/`;
        const rewritten  = { ...projectData };

        if (Array.isArray(rewritten.valeVision_ModelUrls)) {
            rewritten.valeVision_ModelUrls = rewritten.valeVision_ModelUrls.map(url =>
                typeof url === 'string' ? url.split(oldSegment).join(newSegment) : url
            );
        }

        if (typeof rewritten.valeVision_ModelUrl === 'string') {            // <-- Legacy singular field (v1-v3 projects)
            rewritten.valeVision_ModelUrl = rewritten.valeVision_ModelUrl.split(oldSegment).join(newSegment);
        }

        rewritten.basePath = `Projects/${newFolderId}`;                     // <-- Keep the GH-fallback relative path in step

        return rewritten;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | R2 Bulk Move Helpers
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


    // HELPER FUNCTION | Stream-Copy a Single Object to a New Key
    // ------------------------------------------------------------
    // Uses get() -> put(body) rather than a native copy() — R2Object.body is
    // a ReadableStream, so this never buffers the whole file into memory.
    // ------------------------------------------------------------
    async function na_copy_object(r2Bucket, oldKey, newKey) {
        const obj = await r2Bucket.get(oldKey);
        if (!obj) return false;                                             // <-- Source vanished mid-operation
        await r2Bucket.put(newKey, obj.body, {
            httpMetadata   : obj.httpMetadata,
            customMetadata : obj.customMetadata
        });
        return true;
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

    // FUNCTION | Handle POST /api/editor/projects/{oldFolderId}/rename
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectRename__HandleRename(request, env, oldFolderId, requestOrigin) {
        // PARSE REQUEST BODY
        let body;
        try {
            body = await request.json();
        } catch {
            return na_json_cors_response(
                { error: 'Invalid JSON body — could not parse request' }, 400, requestOrigin, env
            );
        }

        const newFolderId        = body && typeof body.newFolderId === 'string' ? body.newFolderId.trim() : '';
        const updatedProjectData = body && body.updatedProjectData;

        // VALIDATE REQUEST
        if (!Na__FolderId__ValidPattern.test(newFolderId)) {
            return na_json_cors_response(
                { error: 'newFolderId must be in the form "YYYY/Code__Name" and must not contain any of the characters < > : " \\ | ? * or control characters' },
                400, requestOrigin, env
            );
        }
        if (newFolderId === oldFolderId) {
            return na_json_cors_response(
                { error: 'newFolderId is identical to the current folderId — nothing to rename' }, 400, requestOrigin, env
            );
        }
        if (!updatedProjectData || typeof updatedProjectData !== 'object' || Array.isArray(updatedProjectData)) {
            return na_json_cors_response(
                { error: 'updatedProjectData must be a JSON object' }, 400, requestOrigin, env
            );
        }

        const oldPrefix = `${Na__R2Prefix__Projects}/${oldFolderId}/`;
        const newPrefix = `${Na__R2Prefix__Projects}/${newFolderId}/`;

        try {
            // STEP 1 | Collision guard — refuse to clobber an existing folder
            const collisionCheck = await env.R2_BUCKET.list({ prefix: newPrefix, limit: 1 });
            if (collisionCheck.objects.length > 0) {
                return na_json_cors_response(
                    { error: `Target folder "${newFolderId}" already has content on R2 — refusing to overwrite` }, 409, requestOrigin, env
                );
            }

            // STEP 2 | List every object under the old prefix
            const oldKeys = await na_list_all_keys(env.R2_BUCKET, oldPrefix);
            if (oldKeys.length === 0) {
                return na_json_cors_response(
                    { error: `No objects found under "${oldFolderId}" on R2 — nothing to move` }, 404, requestOrigin, env
                );
            }

            const projectJsonKey = `${oldPrefix}project.json`;
            const assetKeys      = oldKeys.filter(k => k !== projectJsonKey); // <-- Every non-project.json object

            // STEP 3 | Stream-copy every asset (images, thumbnails, GLBs) to the new prefix
            let movedAssetCount = 0;
            for (const oldKey of assetKeys) {
                const relativePath = oldKey.slice(oldPrefix.length);        // <-- Filename (+ any sub-path) after the prefix
                const newKey       = `${newPrefix}${relativePath}`;
                const copied       = await na_copy_object(env.R2_BUCKET, oldKey, newKey);
                if (!copied) {
                    return na_json_cors_response(
                        { error: `Failed to copy "${oldKey}" — aborting before touching the old folder` }, 500, requestOrigin, env
                    );
                }
                movedAssetCount++;
            }

            // STEP 4 | Rewrite embedded absolute URLs, then write project.json to the NEW prefix
            const correctedProjectData = na_rewrite_project_folder_urls(updatedProjectData, oldFolderId, newFolderId);
            const projectJson          = JSON.stringify(correctedProjectData, null, 4);
            await env.R2_BUCKET.put(`${newPrefix}project.json`, projectJson, {
                httpMetadata: {
                    contentType  : 'application/json',
                    cacheControl : 'no-cache, max-age=0'                     // <-- Force edge/browser revalidation at the new location too
                }
            });

            // STEP 5 | Everything at the new location is confirmed written — delete the old folder
            await na_delete_all_keys(env.R2_BUCKET, oldKeys);

            // STEP 6 | Patch master index + master config to point at the new folderId
            const buildVersion = Math.floor(Date.now() / 1000);
            const buildDate    = na_format_build_date(buildVersion);
            const split        = na_split_folder_id(newFolderId);
            const folderBits   = split.folder.split('__');

            const index = await na_read_master_index(env.R2_BUCKET);
            if (index) {
                const indexPatch = na_patch_master_index_entry(index, oldFolderId, {
                    folderId    : newFolderId,
                    year        : split.year,
                    projectCode : correctedProjectData.projectCode || folderBits[0] || '',
                    name        : correctedProjectData.projectName || folderBits.slice(1).join('__'),
                    lastSynced  : buildDate
                });
                if (indexPatch.found) {
                    await na_write_master_index(env.R2_BUCKET, indexPatch.indexData);
                } else {
                    console.warn(`[EditorWorker] folderId "${oldFolderId}" not found in master index during rename.`);
                }
            }

            const config = await na_read_master_config(env.R2_BUCKET);
            if (config) {
                const configPatch = na_patch_master_config_entry(config, oldFolderId, { folderId: newFolderId });
                if (configPatch.found) {
                    await na_write_master_config(env.R2_BUCKET, configPatch.config);
                } else {
                    console.warn(`[EditorWorker] folderId "${oldFolderId}" not found in master config during rename.`);
                }
            }

            // STEP 7 | Bump build manifest (triggers SW cache eviction + fresh index/config fetch)
            await na_write_build_manifest(env.R2_BUCKET, newFolderId, buildVersion, buildDate);

            return na_json_cors_response({
                success          : true,
                message          : `Project moved from ${oldFolderId} to ${newFolderId}.`,
                oldFolderId      : oldFolderId,
                newFolderId      : newFolderId,
                movedObjectCount : movedAssetCount + 1,                     // <-- +1 for project.json itself
                buildVersion     : buildVersion,
                buildDate        : buildDate
            }, 200, requestOrigin, env);

        } catch (error) {
            console.error('[EditorWorker] Rename error:', error);
            return na_json_cors_response(
                { error: `Rename failed: ${error.message}` }, 500, requestOrigin, env
            );
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | ProjectRename Handler API
    // ------------------------------------------------------------
    export {
        Na__CloudflareHandler__ProjectRename__HandleRename
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
