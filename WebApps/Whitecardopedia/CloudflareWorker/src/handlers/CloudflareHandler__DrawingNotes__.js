// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER - DRAWING NOTES HANDLER
// =============================================================================
//
// FILE       : src/handlers/CloudflareHandler__DrawingNotes__.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Cloudflare Worker - Drawing Notes Handler
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Read and write ValeVision__DrawingNotes__.json on R2 beside project.json
// CREATED    : 14-Sep-2026
//
// DESCRIPTION:
// - GET  /api/editor/projects/{folderId}/drawing-notes
//   Reads VaApps/Projects/{folderId}/ValeVision__DrawingNotes__.json.
//   Missing object: 404 { missing: true }.
// - POST /api/editor/projects/{folderId}/drawing-notes
//   Writes the whole JSON with cacheControl no-cache, then bumps the build
//   manifest so live clients revalidate.
//
// R2 KEY PATHS:
//   notes          : VaApps/Projects/{folderId}/ValeVision__DrawingNotes__.json
//   build manifest : VaApps/Index/Na__BuildVersion__Manifest__.json
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 14-Sep-2026 - Version 1.0.0
// - Initial implementation for ValeVision3D Layout Editor drawing notes.
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

    // MODULE CONSTANTS | Allowlisted Filename
    // ------------------------------------------------------------
    const Na__Notes__FILE_NAME = 'ValeVision__DrawingNotes__.json';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build JSON Response with CORS Headers
    // ------------------------------------------------------------
    function na_notes_json_response(data, status, requestOrigin, env) {
        return new Response(JSON.stringify(data), {
            status,
            headers : {
                'Content-Type' : 'application/json',
                ...na_build_cors_headers(env, requestOrigin)
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | R2 Key for the Drawing-Notes File
    // ------------------------------------------------------------
    function na_notes_r2_key(folderId) {
        return `VaApps/Projects/${folderId}/${Na__Notes__FILE_NAME}`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Handlers
// -----------------------------------------------------------------------------

    // FUNCTION | Handle GET /api/editor/projects/{folderId}/drawing-notes
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__DrawingNotes__HandleGet(request, env, folderId, requestOrigin) {
        void request;
        try {
            const object = await env.R2_BUCKET.get(na_notes_r2_key(folderId));
            if (!object) {
                return na_notes_json_response({ missing : true }, 404, requestOrigin, env);
            }
            const text = await object.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                return na_notes_json_response({ error : 'Drawing notes file is not valid JSON' }, 500, requestOrigin, env);
            }
            return na_notes_json_response(data, 200, requestOrigin, env);
        } catch (error) {
            console.error('[EditorWorker] Drawing-notes GET error:', error);
            return na_notes_json_response({ error : `R2 read failed: ${error.message}` }, 500, requestOrigin, env);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle POST /api/editor/projects/{folderId}/drawing-notes
    // ------------------------------------------------------------
    async function Na__CloudflareHandler__DrawingNotes__HandlePost(request, env, folderId, requestOrigin) {
        let notesData;
        try {
            notesData = await request.json();
        } catch {
            return na_notes_json_response({ error : 'Invalid JSON body — could not parse request' }, 400, requestOrigin, env);
        }

        if (!notesData || typeof notesData !== 'object' || Array.isArray(notesData)) {
            return na_notes_json_response({ error : 'Drawing notes must be a JSON object' }, 400, requestOrigin, env);
        }

        const notesJson    = JSON.stringify(notesData, null, 4);
        const buildVersion = Math.floor(Date.now() / 1000);
        const buildDate    = na_format_build_date(buildVersion);

        try {
            await env.R2_BUCKET.put(na_notes_r2_key(folderId), notesJson, {
                httpMetadata : {
                    contentType  : 'application/json',
                    cacheControl : 'no-cache, max-age=0'
                }
            });
            await na_write_build_manifest(env.R2_BUCKET, folderId, buildVersion, buildDate);
            return na_notes_json_response({
                success      : true,
                message      : `Drawing notes for ${folderId} saved to R2.`,
                buildVersion : buildVersion,
                buildDate    : buildDate
            }, 200, requestOrigin, env);
        } catch (error) {
            console.error('[EditorWorker] Drawing-notes POST error:', error);
            return na_notes_json_response({ error : `R2 write failed: ${error.message}` }, 500, requestOrigin, env);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Drawing Notes Handler API
    // ------------------------------------------------------------
    export {
        Na__CloudflareHandler__DrawingNotes__HandleGet,
        Na__CloudflareHandler__DrawingNotes__HandlePost
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
