// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - PROJECT MERGE HANDLER
// =============================================================================
//
// FILE       : src/handlers/CloudflareHandler__ProjectMerge__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Cloudflare Worker - Project Merge Handler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read project.json fresh, and merge the editor's own top-level
//              keys into it on the server, so no editor save carries the
//              whole document
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - GET /api/editor/projects/{folderId}/project answers project.json exactly
//   as R2 holds it, with Cache-Control: no-store; 404 { missing: true } when
//   R2 has none.
// - POST /api/editor/projects/{folderId}/merge-keys
//     { set: { Key: value }, remove: [ Key ], drawingsBase?: 'iso:<stamp>' | 'none', bumpBuild?: false }
//   reads project.json, sets and removes the named top-level keys, writes it
//   back (no-cache, max-age=0, 4-space JSON like the save route) and answers
//   { success, drawings: { savedIso } } with the block's stamp as written.
// - ONLY THE EDITOR'S KEYS. Every key in set and remove must be on
//   ProjectData__EditorOwnedKeys (CloudflareHelper__PathGuards__.js reads the
//   list from ValeVision's app config); remove may also name the legacy
//   valeVision_Camera__DefaultPosition. A pipeline key (projectCode, images,
//   valeVision_ModelUrls, ...) or any unlisted key - even one sharing a prefix
//   with listed keys - is refused and nothing is written.
// - NOTHING TO MERGE INTO IS A 409. Without a project.json on R2 the answer is
//   409 { missing: true }: the editor falls back to its whole-document save,
//   the route that creates a project and upserts the index.
// - THE DRAWINGS BASE (optional). drawingsBase names the drawings block the
//   window loaded: 'iso:' + LayoutEditor__DrawingsData__SavedIso, or 'none'
//   when that block had no stamp (or there was no block). When R2's block now
//   says otherwise the answer is 409 { conflict: true, drawings: { savedIso } }
//   and nothing is written. A merge without drawingsBase is not judged:
//   ValeVision's save guard sends it only once its R2 judging is switched on.
// - A MERGE NEVER LOSES ANOTHER WRITE. The write is conditional on the etag
//   that was read; when project.json changed in between (a sync, another
//   window) the merge is made again on the new document - up to three times,
//   then 503 { retry: true } with nothing written. If R2 refuses the condition
//   while the etag has not moved, the write is made without it.
// - NO BUILD-MANIFEST BUMP unless bumpBuild is true: project.json is already
//   served no-cache, max-age=0, and a bump makes every client re-fetch every
//   GLB. The master index is not touched (the save route keeps that job).
//
// R2 KEY PATHS:
//   project.json   : VaApps/Projects/{folderId}/project.json
//   build manifest : VaApps/Index/Na__BuildVersion__Manifest__.json (bumpBuild: true only)
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0
// - Initial implementation for worker 1.6.0: the project GET and merge-keys.
//
// =============================================================================

// @delegate: ../CloudflareHelper__Cors__.js
// @delegate: ../CloudflareHelper__BuildManifest__.js
// @delegate: ../CloudflareHelper__PathGuards__.js

import { na_build_cors_headers } from '../CloudflareHelper__Cors__.js';
import { na_format_build_date, na_write_build_manifest } from '../CloudflareHelper__BuildManifest__.js';
import {
    na_project_r2_key,
    na_check_merge_keys,
    na_editor_key_guard
} from '../CloudflareHelper__PathGuards__.js';

// -----------------------------------------------------------------------------
// REGION | Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Document, Its Drawings Block and the Merge Rules
    // ------------------------------------------------------------
    const Na__Merge__PROJECT_FILE   = 'project.json';
    const Na__Merge__DRAWINGS_BLOCK = 'LayoutEditor__DrawingsData';
    const Na__Merge__SAVED_ISO_KEY  = 'LayoutEditor__DrawingsData__SavedIso';
    const Na__Merge__BODY_FIELDS    = ['set', 'remove', 'drawingsBase', 'bumpBuild'];
    const Na__Merge__MAX_BODY_BYTES = 25 * 1024 * 1024;                     // <-- The largest project.json today is about 140 KB
    const Na__Merge__MAX_ATTEMPTS   = 3;                                    // <-- Re-merges when project.json changes mid-merge
    const Na__Merge__BASE_PATTERN   = /^(none|iso:[^\x00-\x1F]{1,64})$/;
    const Na__Merge__CACHE_CONTROL  = 'no-cache, max-age=0';                // <-- As the save route writes project.json
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build JSON Response with CORS Headers (never cached)
    // ------------------------------------------------------------
    function na_merge_json_response(data, status, requestOrigin, env) {
        return new Response(JSON.stringify(data), {
            status,
            headers : {
                'Content-Type'  : 'application/json',
                'Cache-Control' : 'no-store',
                ...na_build_cors_headers(env, requestOrigin)
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Drawings Block's SavedIso Stamp, or null
    // ------------------------------------------------------------
    function na_saved_iso_of(document) {
        const block = (document && typeof document === 'object') ? document[Na__Merge__DRAWINGS_BLOCK] : null;
        if (!block || typeof block !== 'object' || Array.isArray(block)) return null;
        const stamp = block[Na__Merge__SAVED_ISO_KEY];
        return (typeof stamp === 'string' && stamp) ? stamp : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Drawings Base a Document Holds: 'iso:<stamp>' or 'none'
    // ------------------------------------------------------------
    function na_drawings_base_of(document) {
        const stamp = na_saved_iso_of(document);
        return stamp ? `iso:${stamp}` : 'none';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read project.json: { object, text, document } | { missing } | { invalid }
    // ------------------------------------------------------------
    async function na_read_project_document(r2Bucket, key) {
        const object = await r2Bucket.get(key);
        if (!object) return { missing : true };
        const text = await object.text();
        let document;
        try {
            document = JSON.parse(text);
        } catch {
            return { invalid : true };
        }
        if (!document || typeof document !== 'object' || Array.isArray(document)) return { invalid : true };
        return { object : object, text : text, document : document };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Handlers
// -----------------------------------------------------------------------------

    // FUNCTION | Handle GET /api/editor/projects/{folderId}/project
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectMerge__HandleGetProject(request, env, folderId, requestOrigin) {
        void request;
        const key = na_project_r2_key(folderId, Na__Merge__PROJECT_FILE);
        try {
            const current = await na_read_project_document(env.R2_BUCKET, key);
            if (current.missing) {
                return na_merge_json_response({ error : `No project.json on R2 for ${folderId}`, missing : true }, 404, requestOrigin, env);
            }
            if (current.invalid) {
                return na_merge_json_response({ error : `project.json on R2 for ${folderId} is not a JSON object` }, 500, requestOrigin, env);
            }
            return new Response(current.text, {                                    // <-- The stored bytes, as R2 holds them
                status  : 200,
                headers : {
                    'Content-Type'  : 'application/json',
                    'Cache-Control' : 'no-store',
                    ...na_build_cors_headers(env, requestOrigin)
                }
            });
        } catch (error) {
            console.error('[EditorWorker] project GET error:', error);
            return na_merge_json_response({ error : `R2 read failed: ${error.message}` }, 500, requestOrigin, env);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle POST /api/editor/projects/{folderId}/merge-keys
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectMerge__HandleMergeKeys(request, env, folderId, requestOrigin) {
        // THE LIST | Fails closed when the bundled editor-owned key list is unusable
        const keyGuard = na_editor_key_guard();
        if (!keyGuard.ok) {
            return na_merge_json_response({ error : `Merge refused: ${keyGuard.error}` }, 500, requestOrigin, env);
        }

        // THE BODY
        const declared = Number(request.headers.get('Content-Length'));
        if (Number.isFinite(declared) && declared > Na__Merge__MAX_BODY_BYTES) {
            return na_merge_json_response({ error : `Request body of ${declared} bytes is over the ${Na__Merge__MAX_BODY_BYTES}-byte limit` }, 413, requestOrigin, env);
        }
        let body;
        try {
            body = await request.json();
        } catch {
            return na_merge_json_response({ error : 'Invalid JSON body — could not parse request' }, 400, requestOrigin, env);
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return na_merge_json_response({ error : 'Request body must be a JSON object' }, 400, requestOrigin, env);
        }
        const unknown = Object.keys(body).filter((name) => Na__Merge__BODY_FIELDS.indexOf(name) === -1);
        if (unknown.length > 0) {
            return na_merge_json_response({
                error : `Unknown field(s): ${unknown.join(', ')} - merge-keys takes { set, remove, drawingsBase, bumpBuild }; top-level keys go inside set`
            }, 400, requestOrigin, env);
        }

        const set = (body.set === undefined) ? {} : body.set;
        if (!set || typeof set !== 'object' || Array.isArray(set)) {
            return na_merge_json_response({ error : 'set must be an object of top-level keys and their values' }, 400, requestOrigin, env);
        }
        const remove = (body.remove === undefined) ? [] : body.remove;
        if (!Array.isArray(remove) || remove.some((name) => typeof name !== 'string')) {
            return na_merge_json_response({ error : 'remove must be a list of top-level key names' }, 400, requestOrigin, env);
        }
        const setKeys    = Object.keys(set);
        const removeKeys = Array.from(new Set(remove));
        if (setKeys.length === 0 && removeKeys.length === 0) {
            return na_merge_json_response({ error : 'Nothing to merge: set and remove are both empty' }, 400, requestOrigin, env);
        }
        const both = setKeys.filter((name) => removeKeys.indexOf(name) !== -1);
        if (both.length > 0) {
            return na_merge_json_response({ error : `A key cannot be set and removed in one merge: ${both.join(', ')}` }, 400, requestOrigin, env);
        }

        // THE KEYS | Every one must be the editor's
        const keyCheck = na_check_merge_keys(setKeys, removeKeys, keyGuard);
        if (!keyCheck.ok) {
            return na_merge_json_response({ error : keyCheck.error, refused : keyCheck.refused }, keyCheck.status || 400, requestOrigin, env);
        }

        const base = (body.drawingsBase === undefined || body.drawingsBase === null) ? null : body.drawingsBase;
        if (base !== null && (typeof base !== 'string' || !Na__Merge__BASE_PATTERN.test(base))) {
            return na_merge_json_response({ error : 'drawingsBase must be "none" or "iso:" followed by the LayoutEditor__DrawingsData__SavedIso the window loaded' }, 400, requestOrigin, env);
        }
        const bumpBuild = (body.bumpBuild === undefined) ? false : body.bumpBuild;
        if (typeof bumpBuild !== 'boolean') {
            return na_merge_json_response({ error : 'bumpBuild must be true or false' }, 400, requestOrigin, env);
        }

        // THE MERGE | Read, judge, merge, write on the etag that was read
        const key = na_project_r2_key(folderId, Na__Merge__PROJECT_FILE);
        try {
            let merged  = null;
            let removed = [];
            let stored  = null;

            for (let attempt = 1; attempt <= Na__Merge__MAX_ATTEMPTS && !stored; attempt++) {
                const current = await na_read_project_document(env.R2_BUCKET, key);
                if (current.missing) {
                    return na_merge_json_response({
                        error   : `No project.json on R2 for ${folderId} - nothing to merge into; save the whole project first`,
                        missing : true
                    }, 409, requestOrigin, env);
                }
                if (current.invalid) {
                    return na_merge_json_response({ error : `project.json on R2 for ${folderId} is not a JSON object - nothing was written` }, 500, requestOrigin, env);
                }

                if (base !== null && na_drawings_base_of(current.document) !== base) {
                    return na_merge_json_response({
                        error    : 'The drawings on R2 are not the ones this window loaded: they were saved elsewhere since. Reload to pick them up before saving.',
                        conflict : true,
                        drawings : { savedIso : na_saved_iso_of(current.document) }
                    }, 409, requestOrigin, env);
                }

                merged = { ...current.document };                                     // <-- Every other key, in its order
                for (const name of setKeys) merged[name] = set[name];
                removed = removeKeys.filter((name) => Object.prototype.hasOwnProperty.call(merged, name));
                for (const name of removed) delete merged[name];

                const text         = JSON.stringify(merged, null, 4);
                const httpMetadata = { contentType : 'application/json', cacheControl : Na__Merge__CACHE_CONTROL };
                stored = await env.R2_BUCKET.put(key, text, { httpMetadata : httpMetadata, onlyIf : { etagMatches : current.object.etag } });

                if (!stored) {
                    // REFUSED | Someone wrote project.json since it was read - unless the etag
                    // has not moved, in which case the condition itself was not honoured.
                    const now = await env.R2_BUCKET.head(key);
                    if (now && now.etag === current.object.etag) {
                        console.warn('[EditorWorker] merge-keys: the conditional write was refused with the etag unchanged - writing without the condition');
                        stored = await env.R2_BUCKET.put(key, text, { httpMetadata : httpMetadata });
                    }
                }
            }

            if (!stored) {
                return na_merge_json_response({
                    error : `project.json for ${folderId} kept changing while the keys were merged - nothing was written; save again`,
                    retry : true
                }, 503, requestOrigin, env);
            }

            // THE MANIFEST | Only when the caller asks
            let buildVersion = null;
            let buildDate    = null;
            if (bumpBuild) {
                buildVersion = Math.floor(Date.now() / 1000);
                buildDate    = na_format_build_date(buildVersion);
                await na_write_build_manifest(env.R2_BUCKET, folderId, buildVersion, buildDate);
            }

            return na_merge_json_response({
                ok           : true,
                success      : true,
                folderId     : folderId,
                drawings     : { savedIso : na_saved_iso_of(merged) },
                set          : setKeys,
                removed      : removed,
                buildBumped  : bumpBuild,
                buildVersion : buildVersion,
                buildDate    : buildDate
            }, 200, requestOrigin, env);

        } catch (error) {
            console.error('[EditorWorker] merge-keys error:', error);
            return na_merge_json_response({ error : `Merge failed: ${error.message}` }, 500, requestOrigin, env);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | ProjectMerge Handler API
    // ------------------------------------------------------------
    export {
        Na__CloudflareHandler__ProjectMerge__HandleGetProject,
        Na__CloudflareHandler__ProjectMerge__HandleMergeKeys
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
