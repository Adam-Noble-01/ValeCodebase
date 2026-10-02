// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - PROJECT FILES HANDLER
// =============================================================================
//
// FILE       : src/handlers/CloudflareHandler__ProjectFiles__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Cloudflare Worker - Project Files Handler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read, write, upload, list, copy and delete the files ValeVision
//              keeps beside a project's project.json, inside guarded families
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - SIX ROUTES, ONE FAMILY TABLE. POST /api/editor/projects/{folderId}/files/
//   read | write | upload | list | copy | delete. Every path is relative to
//   VaApps/Projects/{folderId}/ and is checked against the families in
//   CloudflareHelper__PathGuards__.js before R2 is touched; an operation the
//   path's family does not allow is refused with a 400.
// - read   { path } -> { ok, data | text, encoding?, contentType, lastModified,
//          size, etag }. A .json file comes back parsed as data, a text type as
//          text, anything else as base64 data with encoding 'base64'. 404
//          { missing: true } when R2 has no such file - an answer, not a
//          failure. Files over 10 MB are read from the CDN, not through here.
// - write  { path, data, encoding?: 'base64' } -> { ok, key, size, etag, ... }.
//          data is a JSON object or array (a .json path only), a string, or
//          base64 bytes with encoding 'base64'. A .json file must hold a JSON
//          object or array. 25 MB at most.
// - upload ?path=<relative path>, the raw bytes as the body, Content-Length
//          required -> { ok, key, size, etag, ... }. Published pictures,
//          vectors and PDFs stream straight into R2 (up to 95 MB; Cloudflare
//          refuses a request body over 100 MB); everything else is read whole
//          first so it can be checked (25 MB).
// - list   { prefix, cursor?, limit? } -> { ok, objects: [{ path, size, etag,
//          uploaded }], truncated, cursor }. prefix is a family folder;
//          paths come back relative to the project folder, and only paths
//          the family could hold are reported.
// - copy   { from, to } -> { ok, key }, both in ONE family that allows copy;
//          a sheet picture keeps its name (its name is its content). 404
//          { missing: true } when from is not on R2.
// - delete { path } or { paths: [...] } (at most 1,000) -> { ok, deleted }.
//          Managed sheet-picture names, or files inside ONE published
//          document folder; every other family refuses deletes.
// - The stored Content-Type and Cache-Control come from the family and the
//   extension. A contentType or cacheControl the caller sends is advisory and
//   is not used; every answer names what was stored.
// - NO FILES ROUTE BUMPS THE BUILD MANIFEST: a project file carries its own
//   cache policy, and a bump makes every client re-fetch every GLB.
// - Raw uploads and copies follow the mechanics of TrueVision3D's worker
//   (its /r2/upload streams the request body into R2, its /r2/copy stays
//   inside the bucket), read as a reference only: its generic,
//   unauthenticated /r2/* routes and its keys are not copied. These routes
//   sit behind X-Editor-Api-Key like every other project route (index.js).
//
// R2 KEY PATHS:
//   project files : VaApps/Projects/{folderId}/{path}
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.0
// - Initial implementation for worker 1.6.0: read, write, upload, list, copy
//   and delete over the six guarded families.
//
// =============================================================================

// @delegate: ../CloudflareHelper__Cors__.js
// @delegate: ../CloudflareHelper__PathGuards__.js

import { na_build_cors_headers } from '../CloudflareHelper__Cors__.js';
import {
    na_project_r2_prefix,
    na_project_r2_key,
    na_resolve_project_file,
    na_resolve_list_prefix,
    na_family_allows,
    na_check_sheet_picture
} from '../CloudflareHelper__PathGuards__.js';

// -----------------------------------------------------------------------------
// REGION | Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Body Sizes, Read Size and Batch Limits
    // ------------------------------------------------------------
    const Na__Files__MAX_READ_BYTES   = 10 * 1024 * 1024;                   // <-- A read answers as JSON through the worker's memory
    const Na__Files__MAX_WRITE_BODY   = 36 * 1024 * 1024;                   // <-- 25 MB as base64 is about 34 MB, plus the JSON around it
    const Na__Files__MAX_SMALL_BODY   = 256 * 1024;                         // <-- read, list, copy and delete bodies carry paths only
    const Na__Files__MAX_DELETE_PATHS = 1000;                               // <-- R2 delete() takes up to 1,000 keys per call
    const Na__Files__MAX_LIST_LIMIT   = 1000;                               // <-- R2 list() answers up to 1,000 keys per page
    const Na__Files__MAX_CURSOR_CHARS = 4096;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build JSON Response with CORS Headers (never cached)
    // ------------------------------------------------------------
    function na_files_json_response(data, status, requestOrigin, env) {
        return new Response(JSON.stringify(data), {
            status,
            headers : {
                'Content-Type'  : 'application/json',
                'Cache-Control' : 'no-store',                                // <-- An API answer is never a cached copy
                ...na_build_cors_headers(env, requestOrigin)
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Refusal { status, error } as a Response
    // ------------------------------------------------------------
    function na_files_refusal(refusal, requestOrigin, env) {
        return na_files_json_response({ error : refusal.error }, refusal.status || 400, requestOrigin, env);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An Operation the Path's Family Does Not Allow
    // ------------------------------------------------------------
    function na_files_op_refused(guard, operation, requestOrigin, env) {
        return na_files_json_response({
            error : `files/${operation} is not allowed for "${guard.path}" (${guard.family}, ${guard.label}, allows ${guard.ops.join(', ')})`
        }, 400, requestOrigin, env);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Content-Length a Request Declares (null when absent, NaN when malformed)
    // ------------------------------------------------------------
    function na_declared_length(request) {
        const raw = request.headers.get('Content-Length');
        if (raw === null || raw === '') return null;
        const length = Number(raw);
        return (Number.isInteger(length) && length >= 0) ? length : NaN;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse a JSON Request Body With Only the Named Fields
    // ------------------------------------------------------------
    // Returns { ok: true, body } or a refusal { ok: false, status, error }.
    // An unknown field is refused rather than ignored, so a caller that sends
    // the wrong shape hears about it.
    // ------------------------------------------------------------
    async function na_read_json_body(request, fields, maxBytes) {
        const declared = na_declared_length(request);
        if (declared !== null && !Number.isNaN(declared) && declared > maxBytes) {
            return { ok : false, status : 413, error : `Request body of ${declared} bytes is over the ${maxBytes}-byte limit for this route` };
        }
        let body;
        try {
            body = await request.json();
        } catch {
            return { ok : false, status : 400, error : 'Invalid JSON body — could not parse request' };
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return { ok : false, status : 400, error : 'Request body must be a JSON object' };
        }
        const unknown = Object.keys(body).filter((name) => fields.indexOf(name) === -1);
        if (unknown.length > 0) {
            return { ok : false, status : 400, error : `Unknown field(s): ${unknown.join(', ')} (this route takes ${fields.join(', ')})` };
        }
        return { ok : true, body : body };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refuse Advisory Fields That Are Not Strings
    // ------------------------------------------------------------
    function na_check_advisory_fields(body, fields) {
        for (const name of fields) {
            if (body[name] !== undefined && body[name] !== null && typeof body[name] !== 'string') {
                return { ok : false, status : 400, error : `${name} must be a string when given` };
            }
        }
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Decode Base64 Into Bytes (null when it is not base64)
    // ------------------------------------------------------------
    function na_decode_base64(data) {
        let binary;
        try {
            binary = atob(data);
        } catch {
            return null;
        }
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Encode Bytes as Base64 (chunked: no huge argument lists)
    // ------------------------------------------------------------
    function na_encode_base64(bytes) {
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What Is Wrong With the Bytes of a .json File, or null
    // ------------------------------------------------------------
    function na_check_json_bytes(bytes) {
        let value;
        try {
            value = JSON.parse(new TextDecoder('utf-8', { fatal : true }).decode(bytes));
        } catch {
            return 'A .json file must hold valid UTF-8 JSON';
        }
        return (value !== null && typeof value === 'object') ? null : 'A .json file must hold a JSON object or array';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | An R2 Upload Time as an ISO String
    // ------------------------------------------------------------
    function na_iso(value) {
        if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
        return (typeof value === 'string') ? value : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | How a Read Answers: Parsed JSON, Text or Base64
    // ------------------------------------------------------------
    function na_read_kind(guard, contentType) {
        const type = String(contentType || '').toLowerCase();
        if (guard.isJson || type.indexOf('json') !== -1) return 'json';
        if (guard.isText || type.indexOf('text/') === 0 || type.indexOf('svg') !== -1 || type.indexOf('xml') !== -1) return 'text';
        return 'binary';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | What Was Stored, for Every Answer
    // ------------------------------------------------------------
    function na_stored_answer(guard, key, size, stored) {
        return {
            ok           : true,
            path         : guard.path,
            key          : key,
            size         : size,
            etag         : stored && stored.etag ? stored.etag : null,
            contentType  : guard.contentType,
            cacheControl : guard.cacheControl
        };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Handlers
// -----------------------------------------------------------------------------

    // FUNCTION | Handle POST /api/editor/projects/{folderId}/files/read
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectFiles__HandleRead(request, env, folderId, requestOrigin) {
        const parsed = await na_read_json_body(request, ['path'], Na__Files__MAX_SMALL_BODY);
        if (!parsed.ok) return na_files_refusal(parsed, requestOrigin, env);

        const guard = na_resolve_project_file(parsed.body.path);
        if (!guard.ok) return na_files_refusal(guard, requestOrigin, env);
        if (!na_family_allows(guard, 'read')) return na_files_op_refused(guard, 'read', requestOrigin, env);

        const key = na_project_r2_key(folderId, guard.path);
        try {
            const object = await env.R2_BUCKET.get(key);
            if (!object) {
                return na_files_json_response({ error : `Not on R2: ${guard.path}`, missing : true, path : guard.path }, 404, requestOrigin, env);
            }
            if (object.size > Na__Files__MAX_READ_BYTES) {
                return na_files_json_response({
                    error : `${guard.path} is ${object.size} bytes - read it from the CDN, not through the worker`,
                    path  : guard.path,
                    size  : object.size
                }, 413, requestOrigin, env);
            }

            const contentType = (object.httpMetadata && object.httpMetadata.contentType) || guard.contentType;
            const answer = {
                ok           : true,
                path         : guard.path,
                key          : key,
                contentType  : contentType,
                size         : object.size,
                etag         : object.etag || null,
                lastModified : na_iso(object.uploaded)
            };

            const kind = na_read_kind(guard, contentType);
            if (kind === 'json') {
                const text = await object.text();
                try {
                    answer.data = JSON.parse(text);
                } catch {
                    return na_files_json_response({ error : `${guard.path} on R2 is not valid JSON`, path : guard.path }, 500, requestOrigin, env);
                }
            } else if (kind === 'text') {
                answer.text = await object.text();
            } else {
                answer.data     = na_encode_base64(new Uint8Array(await object.arrayBuffer()));
                answer.encoding = 'base64';
            }
            return na_files_json_response(answer, 200, requestOrigin, env);

        } catch (error) {
            console.error('[EditorWorker] files/read error:', error);
            return na_files_json_response({ error : `R2 read failed: ${error.message}` }, 500, requestOrigin, env);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle POST /api/editor/projects/{folderId}/files/write
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectFiles__HandleWrite(request, env, folderId, requestOrigin) {
        const parsed = await na_read_json_body(request, ['path', 'data', 'encoding', 'contentType', 'cacheControl'], Na__Files__MAX_WRITE_BODY);
        if (!parsed.ok) return na_files_refusal(parsed, requestOrigin, env);
        const body = parsed.body;

        const guard = na_resolve_project_file(body.path);
        if (!guard.ok) return na_files_refusal(guard, requestOrigin, env);
        if (!na_family_allows(guard, 'write')) return na_files_op_refused(guard, 'write', requestOrigin, env);
        if (guard.family === 'F-IMG' && !guard.managed) {
            return na_files_json_response({ error : `"${guard.path}" is not a managed sheet-picture name (<name>__<first ten hex digits of its SHA-256>.webp, .jpg or .png)` }, 400, requestOrigin, env);
        }

        const advisory = na_check_advisory_fields(body, ['contentType', 'cacheControl']);
        if (advisory) return na_files_refusal(advisory, requestOrigin, env);
        if (body.encoding !== undefined && body.encoding !== null && body.encoding !== 'base64') {
            return na_files_json_response({ error : 'encoding must be "base64" when given' }, 400, requestOrigin, env);
        }
        if (body.data === undefined) {
            return na_files_json_response({ error : 'data is required' }, 400, requestOrigin, env);
        }

        // THE BYTES | base64, a string, or a JSON object or array
        let bytes;
        if (body.encoding === 'base64') {
            if (typeof body.data !== 'string') {
                return na_files_json_response({ error : 'With encoding "base64", data must be a base64 string' }, 400, requestOrigin, env);
            }
            bytes = na_decode_base64(body.data);
            if (!bytes) return na_files_json_response({ error : 'data is not valid base64' }, 400, requestOrigin, env);
            if (bytes.length === 0) return na_files_json_response({ error : 'Nothing to write: the data is empty' }, 400, requestOrigin, env);
        } else if (typeof body.data === 'string') {
            bytes = new TextEncoder().encode(body.data);
        } else if (body.data !== null && typeof body.data === 'object') {
            if (!guard.isJson) {
                return na_files_json_response({ error : `A JSON object or array can only be written to a .json path, not "${guard.path}"` }, 400, requestOrigin, env);
            }
            bytes = new TextEncoder().encode(JSON.stringify(body.data, null, 4));
        } else {
            return na_files_json_response({ error : 'data must be a string, a JSON object or array, or base64 text with encoding "base64"' }, 400, requestOrigin, env);
        }

        if (bytes.length > guard.maxBytes) {
            return na_files_json_response({ error : `${bytes.length} bytes is over the ${guard.maxBytes}-byte limit for ${guard.family}` }, 413, requestOrigin, env);
        }
        if (guard.isJson) {
            const jsonProblem = na_check_json_bytes(bytes);
            if (jsonProblem) return na_files_json_response({ error : jsonProblem }, 400, requestOrigin, env);
        }
        const picture = await na_check_sheet_picture(guard, bytes);
        if (!picture.ok) return na_files_refusal(picture, requestOrigin, env);

        const key = na_project_r2_key(folderId, guard.path);
        try {
            const stored = await env.R2_BUCKET.put(key, bytes, {
                httpMetadata : { contentType : guard.contentType, cacheControl : guard.cacheControl }
            });
            return na_files_json_response(na_stored_answer(guard, key, bytes.length, stored), 200, requestOrigin, env);
        } catch (error) {
            console.error('[EditorWorker] files/write error:', error);
            return na_files_json_response({ error : `R2 write failed: ${error.message}` }, 500, requestOrigin, env);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle POST /api/editor/projects/{folderId}/files/upload?path=
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectFiles__HandleUpload(request, env, folderId, requestOrigin) {
        const url   = new URL(request.url);
        const path  = url.searchParams.get('path');
        const guard = na_resolve_project_file(path === null ? '' : path);
        if (!guard.ok) return na_files_refusal(guard, requestOrigin, env);
        if (!na_family_allows(guard, 'upload')) return na_files_op_refused(guard, 'upload', requestOrigin, env);
        if (guard.family === 'F-IMG' && !guard.managed) {
            return na_files_json_response({ error : `"${guard.path}" is not a managed sheet-picture name (<name>__<first ten hex digits of its SHA-256>.webp, .jpg or .png)` }, 400, requestOrigin, env);
        }

        // THE LENGTH | Known before a byte is read (R2 needs it to stream)
        const declared = na_declared_length(request);
        if (declared === null) {
            return na_files_json_response({ error : 'Content-Length is required for an upload' }, 411, requestOrigin, env);
        }
        if (Number.isNaN(declared)) {
            return na_files_json_response({ error : 'Content-Length is not a whole number of bytes' }, 400, requestOrigin, env);
        }
        if (declared === 0 || !request.body) {
            return na_files_json_response({ error : 'No bytes in the request' }, 400, requestOrigin, env);
        }
        const limit = guard.streamed ? guard.maxStreamBytes : guard.maxBytes;
        if (declared > limit) {
            return na_files_json_response({ error : `${declared} bytes is over the ${limit}-byte limit for ${guard.family} uploads` }, 413, requestOrigin, env);
        }

        const key          = na_project_r2_key(folderId, guard.path);
        const httpMetadata = { contentType : guard.contentType, cacheControl : guard.cacheControl };
        try {
            // STREAMED | Published pictures, vectors and PDFs go straight into R2
            if (guard.streamed) {
                const stored = await env.R2_BUCKET.put(key, request.body, { httpMetadata : httpMetadata });
                return na_files_json_response(na_stored_answer(guard, key, stored && typeof stored.size === 'number' ? stored.size : declared, stored), 200, requestOrigin, env);
            }

            // READ WHOLE | Everything else is checked before it is stored
            const bytes = new Uint8Array(await request.arrayBuffer());
            if (bytes.length === 0) return na_files_json_response({ error : 'No bytes in the request' }, 400, requestOrigin, env);
            if (bytes.length > guard.maxBytes) {
                return na_files_json_response({ error : `${bytes.length} bytes is over the ${guard.maxBytes}-byte limit for ${guard.family}` }, 413, requestOrigin, env);
            }
            if (guard.isJson) {
                const jsonProblem = na_check_json_bytes(bytes);
                if (jsonProblem) return na_files_json_response({ error : jsonProblem }, 400, requestOrigin, env);
            }
            const picture = await na_check_sheet_picture(guard, bytes);
            if (!picture.ok) return na_files_refusal(picture, requestOrigin, env);

            const stored = await env.R2_BUCKET.put(key, bytes, { httpMetadata : httpMetadata });
            return na_files_json_response(na_stored_answer(guard, key, bytes.length, stored), 200, requestOrigin, env);

        } catch (error) {
            console.error('[EditorWorker] files/upload error:', error);
            return na_files_json_response({ error : `R2 upload failed: ${error.message}` }, 500, requestOrigin, env);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle POST /api/editor/projects/{folderId}/files/list
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectFiles__HandleList(request, env, folderId, requestOrigin) {
        const parsed = await na_read_json_body(request, ['prefix', 'cursor', 'limit'], Na__Files__MAX_SMALL_BODY);
        if (!parsed.ok) return na_files_refusal(parsed, requestOrigin, env);
        const body = parsed.body;

        const listGuard = na_resolve_list_prefix(body.prefix);
        if (!listGuard.ok) return na_files_refusal(listGuard, requestOrigin, env);

        const limit = (body.limit === undefined || body.limit === null) ? Na__Files__MAX_LIST_LIMIT : body.limit;
        if (!Number.isInteger(limit) || limit < 1 || limit > Na__Files__MAX_LIST_LIMIT) {
            return na_files_json_response({ error : `limit must be a whole number from 1 to ${Na__Files__MAX_LIST_LIMIT}` }, 400, requestOrigin, env);
        }
        const cursor = (body.cursor === undefined || body.cursor === null || body.cursor === '') ? undefined : body.cursor;
        if (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > Na__Files__MAX_CURSOR_CHARS)) {
            return na_files_json_response({ error : 'cursor must be the string a previous list answered with' }, 400, requestOrigin, env);
        }

        const projectPrefix = na_project_r2_prefix(folderId);
        try {
            const options = { prefix : projectPrefix + listGuard.prefix, limit : limit };
            if (cursor !== undefined) options.cursor = cursor;
            const listed = await env.R2_BUCKET.list(options);

            const objects = [];
            for (const object of (listed && Array.isArray(listed.objects)) ? listed.objects : []) {
                const path  = String(object.key || '').slice(projectPrefix.length);
                const guard = na_resolve_project_file(path);
                if (!guard.ok || guard.family !== listGuard.family) continue;      // <-- Only what this family could have stored
                objects.push({ path : path, size : object.size, etag : object.etag || null, uploaded : na_iso(object.uploaded) });
            }

            return na_files_json_response({
                ok        : true,
                prefix    : listGuard.prefix,
                objects   : objects,
                truncated : !!(listed && listed.truncated),
                cursor    : (listed && listed.truncated && listed.cursor) ? listed.cursor : null
            }, 200, requestOrigin, env);

        } catch (error) {
            console.error('[EditorWorker] files/list error:', error);
            return na_files_json_response({ error : `R2 list failed: ${error.message}` }, 500, requestOrigin, env);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle POST /api/editor/projects/{folderId}/files/copy
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectFiles__HandleCopy(request, env, folderId, requestOrigin) {
        const parsed = await na_read_json_body(request, ['from', 'to', 'cacheControl'], Na__Files__MAX_SMALL_BODY);
        if (!parsed.ok) return na_files_refusal(parsed, requestOrigin, env);
        const body = parsed.body;

        const advisory = na_check_advisory_fields(body, ['cacheControl']);
        if (advisory) return na_files_refusal(advisory, requestOrigin, env);

        const from = na_resolve_project_file(body.from);
        if (!from.ok) return na_files_refusal(from, requestOrigin, env);
        const to = na_resolve_project_file(body.to);
        if (!to.ok) return na_files_refusal(to, requestOrigin, env);

        if (from.family !== to.family) {
            return na_files_json_response({
                error : `A copy stays inside one family: "${from.path}" is ${from.family} (${from.label}), "${to.path}" is ${to.family} (${to.label})`
            }, 400, requestOrigin, env);
        }
        if (!na_family_allows(from, 'copy')) return na_files_op_refused(from, 'copy', requestOrigin, env);
        if (from.path === to.path) {
            return na_files_json_response({ error : 'from and to name the same file' }, 400, requestOrigin, env);
        }
        if (from.family === 'F-IMG') {
            if (!from.managed || !to.managed) {
                return na_files_json_response({ error : 'Only managed sheet-picture names (<name>__<first ten hex digits of its SHA-256>.webp, .jpg or .png) may be copied' }, 400, requestOrigin, env);
            }
            if (from.segments[2] !== to.segments[2]) {
                return na_files_json_response({ error : 'A sheet picture keeps its name when it is copied: its name is its content' }, 400, requestOrigin, env);
            }
        }

        const fromKey = na_project_r2_key(folderId, from.path);
        const toKey   = na_project_r2_key(folderId, to.path);
        try {
            const source = await env.R2_BUCKET.get(fromKey);
            if (!source) {
                return na_files_json_response({ error : `Not on R2: ${from.path}`, missing : true, path : from.path }, 404, requestOrigin, env);
            }
            const stored = await env.R2_BUCKET.put(toKey, source.body, {
                httpMetadata   : { contentType : to.contentType, cacheControl : to.cacheControl },
                customMetadata : source.customMetadata || {}
            });
            const answer = na_stored_answer(to, toKey, stored && typeof stored.size === 'number' ? stored.size : source.size, stored);
            answer.from  = from.path;
            answer.to    = to.path;
            return na_files_json_response(answer, 200, requestOrigin, env);

        } catch (error) {
            console.error('[EditorWorker] files/copy error:', error);
            return na_files_json_response({ error : `R2 copy failed: ${error.message}` }, 500, requestOrigin, env);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle POST /api/editor/projects/{folderId}/files/delete
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectFiles__HandleDelete(request, env, folderId, requestOrigin) {
        const parsed = await na_read_json_body(request, ['path', 'paths'], Na__Files__MAX_SMALL_BODY);
        if (!parsed.ok) return na_files_refusal(parsed, requestOrigin, env);
        const body = parsed.body;

        // ONE PATH OR A LIST OF THEM
        if ((body.path === undefined) === (body.paths === undefined)) {
            return na_files_json_response({ error : 'Send either path or paths, not both and not neither' }, 400, requestOrigin, env);
        }
        const requested = (body.path !== undefined) ? [body.path] : body.paths;
        if (!Array.isArray(requested) || requested.length === 0 || requested.length > Na__Files__MAX_DELETE_PATHS) {
            return na_files_json_response({ error : `paths must be a list of 1 to ${Na__Files__MAX_DELETE_PATHS} paths` }, 400, requestOrigin, env);
        }

        const guards = [];
        for (const path of Array.from(new Set(requested))) {
            const guard = na_resolve_project_file(path);
            if (!guard.ok) return na_files_refusal(guard, requestOrigin, env);
            guards.push(guard);
        }

        // ONE FAMILY, AND ONE THAT ALLOWS DELETES
        const families = Array.from(new Set(guards.map((guard) => guard.family)));
        if (families.length > 1) {
            return na_files_json_response({ error : `One delete takes paths from one family, not ${families.join(' and ')}` }, 400, requestOrigin, env);
        }
        if (!na_family_allows(guards[0], 'delete')) return na_files_op_refused(guards[0], 'delete', requestOrigin, env);

        // F-IMG | Managed names only - anything else in the folder is somebody's own
        if (families[0] === 'F-IMG') {
            const unmanaged = guards.filter((guard) => !guard.managed).map((guard) => guard.path);
            if (unmanaged.length > 0) {
                return na_files_json_response({ error : `Only managed sheet-picture names may be deleted, not: ${unmanaged.join(', ')}` }, 400, requestOrigin, env);
            }
        }

        // F-PUB | Every path inside ONE document folder - a publish never sweeps the root
        if (families[0] === 'F-PUB') {
            const outside = guards.filter((guard) => !guard.documentFolder).map((guard) => guard.path);
            if (outside.length > 0) {
                return na_files_json_response({ error : `A published delete stays inside one document folder; these are not in one: ${outside.join(', ')}` }, 400, requestOrigin, env);
            }
            const folders = Array.from(new Set(guards.map((guard) => guard.documentFolder)));
            if (folders.length > 1) {
                return na_files_json_response({ error : `A published delete stays inside ONE document folder, not ${folders.join(', ')}` }, 400, requestOrigin, env);
            }
        }

        const keys = guards.map((guard) => na_project_r2_key(folderId, guard.path));
        try {
            await env.R2_BUCKET.delete(keys);
            return na_files_json_response({ ok : true, deleted : keys.length, paths : guards.map((guard) => guard.path) }, 200, requestOrigin, env);
        } catch (error) {
            console.error('[EditorWorker] files/delete error:', error);
            return na_files_json_response({ error : `R2 delete failed: ${error.message}` }, 500, requestOrigin, env);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | ProjectFiles Handler API
    // ------------------------------------------------------------
    export {
        Na__CloudflareHandler__ProjectFiles__HandleRead,
        Na__CloudflareHandler__ProjectFiles__HandleWrite,
        Na__CloudflareHandler__ProjectFiles__HandleUpload,
        Na__CloudflareHandler__ProjectFiles__HandleList,
        Na__CloudflareHandler__ProjectFiles__HandleCopy,
        Na__CloudflareHandler__ProjectFiles__HandleDelete
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
