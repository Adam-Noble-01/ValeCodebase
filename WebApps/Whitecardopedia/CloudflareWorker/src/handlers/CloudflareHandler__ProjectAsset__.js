// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - PROJECT ASSET HANDLER
// =============================================================================
//
// FILE       : src/handlers/CloudflareHandler__ProjectAsset__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Cloudflare Worker - Project Asset Handler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Write one binary project asset (thumbnail, baked linework, snapshot) to R2
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - Receives a JSON body { path, contentType, encoding: 'base64', data } and
//   writes the decoded bytes to VaApps/Projects/{folderId}/{path}.
// - The path is guarded to the three asset folders ValeVision writes:
//   PresentationMode/Thumbnails, LayoutEditor/Linework and
//   LayoutEditor/Snapshots, with a single file name and a webp, png or json
//   extension. Anything else is a 400 before R2 is touched.
// - Bumps the build manifest afterwards, exactly as a project.json save does,
//   so live clients pick up a replaced thumbnail on their next load.
//   Fingerprinted linework and snapshot names never collide, so a bump is
//   only ever needed for the replaceable thumbnails, but it is cheap.
//
// R2 KEY PATHS:
//   asset          : VaApps/Projects/{folderId}/{path}
//   build manifest : VaApps/Index/Na__BuildVersion__Manifest__.json
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for the ValeVision drawing systems (port Phase 2).
//
// =============================================================================

// @delegate: ../CloudflareHelper__Cors__.js
// @delegate: ./CloudflareHandler__ProjectEditor__.js

import { na_build_cors_headers } from '../CloudflareHelper__Cors__.js';
import {
    na_write_build_manifest,
    na_format_build_date
} from './CloudflareHandler__ProjectEditor__.js';

// -----------------------------------------------------------------------------
// REGION | Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Path Guard and Size Ceiling
    // ------------------------------------------------------------
    const Na__Asset__PATH_GUARD    = /^(PresentationMode\/Thumbnails|LayoutEditor\/(Linework|Snapshots))\/[A-Za-z0-9_.-]+\.(webp|png|json)$/;
    const Na__Asset__MAX_BYTES     = 25 * 1024 * 1024;                          // <-- 25 MB decoded ceiling
    const Na__Asset__CONTENT_TYPES = {
        webp : 'image/webp',
        png  : 'image/png',
        json : 'application/json'
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build JSON Response with CORS Headers
    // ------------------------------------------------------------
    function na_asset_json_response(data, status, requestOrigin, env) {
        return new Response(JSON.stringify(data), {
            status,
            headers : {
                'Content-Type' : 'application/json',
                ...na_build_cors_headers(env, requestOrigin)
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Decode a Base64 String Into Bytes
    // ------------------------------------------------------------
    function na_decode_base64(data) {
        const binary = atob(data);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Content Type From the Path Extension
    // ------------------------------------------------------------
    function na_content_type_for(path) {
        const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
        return Na__Asset__CONTENT_TYPES[ext] || 'application/octet-stream';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Handler
// -----------------------------------------------------------------------------

    // FUNCTION | Handle POST /api/editor/projects/{folderId}/assets
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__ProjectAsset__HandleUpload(request, env, folderId, requestOrigin) {
        let body;
        try {
            body = await request.json();
        } catch {
            return na_asset_json_response({ error: 'Invalid JSON body — could not parse request' }, 400, requestOrigin, env);
        }

        const path = body && typeof body.path === 'string' ? body.path : '';
        if (!Na__Asset__PATH_GUARD.test(path)) {
            return na_asset_json_response({ error: `Asset path not allowed: ${path}` }, 400, requestOrigin, env);
        }
        if (!body.data || typeof body.data !== 'string' || (body.encoding && body.encoding !== 'base64')) {
            return na_asset_json_response({ error: 'Asset body must carry base64 data' }, 400, requestOrigin, env);
        }

        let bytes;
        try {
            bytes = na_decode_base64(body.data);
        } catch {
            return na_asset_json_response({ error: 'Asset data is not valid base64' }, 400, requestOrigin, env);
        }
        if (bytes.length === 0 || bytes.length > Na__Asset__MAX_BYTES) {
            return na_asset_json_response({ error: `Asset size out of range (${bytes.length} bytes)` }, 400, requestOrigin, env);
        }

        const contentType  = (typeof body.contentType === 'string' && body.contentType) ? body.contentType : na_content_type_for(path);
        const r2Key        = `VaApps/Projects/${folderId}/${path}`;
        const buildVersion = Math.floor(Date.now() / 1000);
        const buildDate    = na_format_build_date(buildVersion);

        try {
            await env.R2_BUCKET.put(r2Key, bytes, {
                httpMetadata : {
                    contentType  : contentType,
                    cacheControl : 'no-cache, max-age=0'                         // <-- A replaced thumbnail must show on the next load
                }
            });

            await na_write_build_manifest(env.R2_BUCKET, folderId, buildVersion, buildDate); // <-- Same eviction trigger as a project save

            const publicBase = env.R2_PUBLIC_BASE_URL || '';
            return na_asset_json_response({
                ok           : true,
                path         : path,
                publicUrl    : publicBase ? `${publicBase.replace(/\/$/, '')}/${folderId}/${path}` : null,
                bytes        : bytes.length,
                buildVersion : buildVersion
            }, 200, requestOrigin, env);

        } catch (error) {
            console.error('[EditorWorker] R2 asset write error:', error);
            return na_asset_json_response({ error: `R2 asset write failed: ${error.message}` }, 500, requestOrigin, env);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | ProjectAsset Handler API
    // ------------------------------------------------------------
    export {
        Na__CloudflareHandler__ProjectAsset__HandleUpload
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
