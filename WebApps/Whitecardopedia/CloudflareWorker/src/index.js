// =============================================================================
// WHITECARDOPEDIA - EDITOR API WORKER
// =============================================================================
//
// FILE       : src/index.js
// NAMESPACE  : WhitecardopediaEditorApi
// MODULE     : Cloudflare Worker Entry Point
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Route and authenticate requests for the Whitecardopedia project editor API
// CREATED    : 26-Jun-2026
//
// DESCRIPTION:
// - Handles CORS preflight for cross-origin requests from the localhost dev server
// - Validates the X-Editor-Api-Key header on all non-OPTIONS write requests
// - Routes POST /api/editor/projects/{folderId} to the ProjectEditor handler
// - Routes POST /api/editor/projects/{folderId}/visibility to the ProjectVisibility handler
// - Routes POST /api/editor/projects/{folderId}/rename to the ProjectRename handler
// - Routes POST /api/editor/projects/{folderId}/delete to the ProjectDelete handler
// - GET /api/editor/health returns a simple health-check response
//
// ENVIRONMENT SECRETS (set via wrangler secret put):
// - EDITOR_API_KEY   : Shared secret matched against X-Editor-Api-Key header
// - ALLOWED_ORIGIN   : Permitted CORS origin (e.g. http://localhost:8000)
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 08-Jul-2026 - Version 1.3.0
// - Added POST /api/editor/projects/{folderId}/delete (permanent R2 + index +
//   config removal, with a re-list verification step in the response).
//
// 07-Jul-2026 - Version 1.2.0
// - Added POST /api/editor/projects/{folderId}/visibility (gallery enabled toggle).
// - Added POST /api/editor/projects/{folderId}/rename (live R2 folder move).
// - Routes matched before the generic save route so the longer paths win.
//
// 26-Jun-2026 - Version 1.1.0
// - CORS logic extracted to shared CloudflareHelper__Cors__.js (DRY).
// - Now permits localhost AND 127.0.0.1 on any port (fixes dev CORS rejection).
//
// 26-Jun-2026 - Version 1.0.0
// - Initial implementation.
//
// =============================================================================

// @delegate: ./handlers/CloudflareHandler__ProjectEditor__.js
// @delegate: ./handlers/CloudflareHandler__ProjectVisibility__.js
// @delegate: ./handlers/CloudflareHandler__ProjectRename__.js
// @delegate: ./handlers/CloudflareHandler__ProjectDelete__.js
// @delegate: ./CloudflareHelper__Cors__.js

import { Na__CloudflareHandler__ProjectEditor__HandleSave } from './handlers/CloudflareHandler__ProjectEditor__.js';
import { Na__CloudflareHandler__ProjectVisibility__HandleToggle } from './handlers/CloudflareHandler__ProjectVisibility__.js';
import { Na__CloudflareHandler__ProjectRename__HandleRename } from './handlers/CloudflareHandler__ProjectRename__.js';
import { Na__CloudflareHandler__ProjectDelete__HandleDelete } from './handlers/CloudflareHandler__ProjectDelete__.js';
import { na_build_cors_headers } from './CloudflareHelper__Cors__.js';

// -----------------------------------------------------------------------------
// REGION | CORS Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build JSON Response with CORS Headers
    // ------------------------------------------------------------
    function na_cors_json_response(body, status, env, requestOrigin) {
        return new Response(body, {
            status,
            headers : {
                'Content-Type' : 'application/json',
                ...na_build_cors_headers(env, requestOrigin)
            }
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Build Empty Response with CORS Headers (preflight)
    // ------------------------------------------------------------
    function na_cors_preflight_response(env, requestOrigin) {
        return new Response(null, {
            status  : 204,
            headers : na_build_cors_headers(env, requestOrigin)
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Authentication
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Validate X-Editor-Api-Key Header
    // ------------------------------------------------------------
    function na_validate_api_key(request, env) {
        const provided = request.headers.get('X-Editor-Api-Key'); // <-- Key sent by the browser
        if (!provided || !env.EDITOR_API_KEY) return false;       // <-- Reject if either is missing
        return provided === env.EDITOR_API_KEY;                   // <-- Constant-time string compare (Workers runtime)
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Worker Entry Point
// -----------------------------------------------------------------------------

    // FUNCTION | Main Fetch Handler
    // ------------------------------------------------------------
    export default {
        async fetch(request, env) {
            const url           = new URL(request.url);
            const method        = request.method.toUpperCase();
            const requestOrigin = request.headers.get('Origin') || '';

            // HANDLE CORS PREFLIGHT
            if (method === 'OPTIONS') {
                return na_cors_preflight_response(env, requestOrigin);
            }

            // HANDLE HEALTH CHECK (unauthenticated read)
            if (method === 'GET' && url.pathname === '/api/editor/health') {
                return na_cors_json_response(
                    JSON.stringify({ ok: true, worker: 'whitecardopedia-editor-api' }),
                    200, env, requestOrigin
                );
            }

            // AUTHENTICATE ALL WRITE REQUESTS
            if (!na_validate_api_key(request, env)) {
                return na_cors_json_response(
                    JSON.stringify({ error: 'Unauthorized — invalid or missing X-Editor-Api-Key' }),
                    401, env, requestOrigin
                );
            }

            // ROUTE | POST /api/editor/projects/{folderId}/visibility
            // Matched BEFORE the generic save route below so the longer,
            // more specific "/visibility" suffix always wins.
            const visibilityMatch = url.pathname.match(/^\/api\/editor\/projects\/(.+)\/visibility$/);

            if (method === 'POST' && visibilityMatch) {
                const folderId = decodeURIComponent(visibilityMatch[1]);     // <-- Decode: '2026%2F63592__Name' → '2026/63592__Name'
                return Na__CloudflareHandler__ProjectVisibility__HandleToggle(request, env, folderId, requestOrigin);
            }

            // ROUTE | POST /api/editor/projects/{folderId}/rename
            // Matched BEFORE the generic save route below so the longer,
            // more specific "/rename" suffix always wins. {folderId} here is
            // the OLD (current) folderId; the new one travels in the body.
            const renameMatch = url.pathname.match(/^\/api\/editor\/projects\/(.+)\/rename$/);

            if (method === 'POST' && renameMatch) {
                const folderId = decodeURIComponent(renameMatch[1]);         // <-- Decode: '2026%2F63592__Name' → '2026/63592__Name'
                return Na__CloudflareHandler__ProjectRename__HandleRename(request, env, folderId, requestOrigin);
            }

            // ROUTE | POST /api/editor/projects/{folderId}/delete
            // Matched BEFORE the generic save route below so the longer,
            // more specific "/delete" suffix always wins.
            const deleteMatch = url.pathname.match(/^\/api\/editor\/projects\/(.+)\/delete$/);

            if (method === 'POST' && deleteMatch) {
                const folderId = decodeURIComponent(deleteMatch[1]);         // <-- Decode: '2026%2F63592__Name' → '2026/63592__Name'
                return Na__CloudflareHandler__ProjectDelete__HandleDelete(request, env, folderId, requestOrigin);
            }

            // ROUTE | POST /api/editor/projects/{folderId}
            // folderId may contain '/' (e.g. '2026/63592__Bressard-Kayode') so the
            // pattern captures everything after '/projects/' using a greedy match.
            const saveMatch = url.pathname.match(/^\/api\/editor\/projects\/(.+)$/);

            if (method === 'POST' && saveMatch) {
                const folderId = decodeURIComponent(saveMatch[1]);           // <-- Decode: '2026%2F63592__Name' → '2026/63592__Name'
                return Na__CloudflareHandler__ProjectEditor__HandleSave(request, env, folderId, requestOrigin);
            }

            // NO MATCHING ROUTE
            return na_cors_json_response(
                JSON.stringify({ error: `No route matched: ${method} ${url.pathname}` }),
                404, env, requestOrigin
            );
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
