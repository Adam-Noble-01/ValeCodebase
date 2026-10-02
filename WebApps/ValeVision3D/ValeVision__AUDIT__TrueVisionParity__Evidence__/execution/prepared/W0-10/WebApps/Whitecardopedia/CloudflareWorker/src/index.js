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
// - Validates the X-Editor-Api-Key header on every route except the health
//   check and the CORS preflight - reads included
// - Routes POST /api/editor/projects/{folderId} to the ProjectEditor handler
// - Routes POST /api/editor/projects/{folderId}/visibility to the ProjectVisibility handler
// - Routes POST /api/editor/projects/{folderId}/rename to the ProjectRename handler
// - Routes POST /api/editor/projects/{folderId}/delete to the ProjectDelete handler
// - Routes POST /api/editor/projects/{folderId}/assets to the ProjectAsset handler (binary assets)
// - Routes GET+POST /api/editor/projects/{folderId}/drawing-notes to the DrawingNotes handler
// - Routes GET /api/editor/projects/{folderId}/project and
//   POST /api/editor/projects/{folderId}/merge-keys to the ProjectMerge handler
// - Routes POST /api/editor/projects/{folderId}/files/read|write|upload|list|copy|delete
//   to the ProjectFiles handler (the guarded project-file families)
// - Checks the folderId of every /projects/ route (CloudflareHelper__PathGuards__.js);
//   a path no route matches answers a JSON 404, with or without the key
// - GET /api/editor/health returns { ok, worker, version, routes }: the route
//   list is what the ValeVision transport facade feature-detects
//
// ENVIRONMENT SECRETS (set via wrangler secret put):
// - EDITOR_API_KEY   : Shared secret matched against X-Editor-Api-Key header
// - ALLOWED_ORIGIN   : Permitted CORS origin (e.g. http://localhost:8000)
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.6.0
// - GET /api/editor/projects/{folderId}/project (project.json as R2 holds it,
//   no-store; 404 { missing: true }) and POST .../merge-keys (the editor's own
//   top-level keys merged on the server; an optional drawingsBase answers 409
//   when stale; no build-manifest bump unless bumpBuild is true), in the new
//   CloudflareHandler__ProjectMerge__.js.
// - POST .../files/read, write, upload, list, copy and delete over six guarded
//   path families (sibling documents, scene thumbnails, Layout Editor assets,
//   sheet pictures, published documents, statements), in the new
//   CloudflareHandler__ProjectFiles__.js and CloudflareHelper__PathGuards__.js.
//   No files route ever bumps the build manifest.
// - Every /projects/ route now checks its folderId (the rename handler's
//   pattern) after the key check, so "/2026/delete" can no longer reach the
//   delete handler with folderId "2026", and an unknown suffix can no longer
//   fall into the generic save route. Routes resolve before the key check, so
//   a path no route matches answers a JSON 404 with or without the key.
// - GET /api/editor/health adds version and routes ['save', 'assets',
//   'drawing-notes', 'project', 'merge-keys', 'files'].
// - An unexpected error answers a JSON 500 with the CORS headers, and a
//   malformed %-encoding in a folderId a JSON 400.
//
// 14-Sep-2026 - Version 1.5.0
// - Added GET+POST /api/editor/projects/{folderId}/drawing-notes for
//   ValeVision__DrawingNotes__.json beside project.json.
//
// 09-Sep-2026 - Version 1.4.0
// - Added POST /api/editor/projects/{folderId}/assets (binary asset upload
// - for the ValeVision drawing systems, port Phase 2).
//
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
// @delegate: ./handlers/CloudflareHandler__ProjectAsset__.js
// @delegate: ./handlers/CloudflareHandler__DrawingNotes__.js
// @delegate: ./handlers/CloudflareHandler__ProjectMerge__.js
// @delegate: ./handlers/CloudflareHandler__ProjectFiles__.js
// @delegate: ./CloudflareHelper__Cors__.js
// @delegate: ./CloudflareHelper__PathGuards__.js

import { Na__CloudflareHandler__ProjectEditor__HandleSave } from './handlers/CloudflareHandler__ProjectEditor__.js';
import { Na__CloudflareHandler__ProjectVisibility__HandleToggle } from './handlers/CloudflareHandler__ProjectVisibility__.js';
import { Na__CloudflareHandler__ProjectRename__HandleRename } from './handlers/CloudflareHandler__ProjectRename__.js';
import { Na__CloudflareHandler__ProjectDelete__HandleDelete } from './handlers/CloudflareHandler__ProjectDelete__.js';
import { Na__CloudflareHandler__ProjectAsset__HandleUpload } from './handlers/CloudflareHandler__ProjectAsset__.js';
import {
    Na__CloudflareHandler__DrawingNotes__HandleGet,
    Na__CloudflareHandler__DrawingNotes__HandlePost
} from './handlers/CloudflareHandler__DrawingNotes__.js';
import {
    Na__CloudflareHandler__ProjectMerge__HandleGetProject,
    Na__CloudflareHandler__ProjectMerge__HandleMergeKeys
} from './handlers/CloudflareHandler__ProjectMerge__.js';
import {
    Na__CloudflareHandler__ProjectFiles__HandleRead,
    Na__CloudflareHandler__ProjectFiles__HandleWrite,
    Na__CloudflareHandler__ProjectFiles__HandleUpload,
    Na__CloudflareHandler__ProjectFiles__HandleList,
    Na__CloudflareHandler__ProjectFiles__HandleCopy,
    Na__CloudflareHandler__ProjectFiles__HandleDelete
} from './handlers/CloudflareHandler__ProjectFiles__.js';
import { na_build_cors_headers } from './CloudflareHelper__Cors__.js';
import { na_validate_folder_id } from './CloudflareHelper__PathGuards__.js';

// -----------------------------------------------------------------------------
// REGION | Worker Identity and Routes
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | What the Health Check Reports
    // ------------------------------------------------------------
    // routes names the capabilities a client may call. The ValeVision transport
    // facade calls project, merge-keys and files only when this list names
    // them: on a worker deployed before 1.6.0 those paths would fall into the
    // generic save or delete route.
    // ------------------------------------------------------------
    const Na__EditorWorker__NAME    = 'whitecardopedia-editor-api';
    const Na__EditorWorker__VERSION = '1.6.0';
    const Na__EditorWorker__ROUTES  = Object.freeze(['save', 'assets', 'drawing-notes', 'project', 'merge-keys', 'files']);
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Project Routes, Most Specific Suffix First
    // ------------------------------------------------------------
    // Everything after /api/editor/projects/ is "{folderId}{suffix}". A route
    // matches on method and suffix and takes the rest as its folderId, which
    // must then pass the folderId check (a 400 if it does not: "/2026/delete"
    // is refused, never read as a delete of folderId "2026"). The files
    // suffixes come before "/delete" so ".../files/delete" is never a project
    // delete. The generic save route is tried last, and only when the whole
    // rest decodes to "YYYY/Folder" - any other path is a 404.
    // ------------------------------------------------------------
    const Na__Route__PROJECTS_PREFIX = '/api/editor/projects/';
    const Na__Route__PROJECT_ROUTES  = Object.freeze([
        { method : 'POST', suffix : '/files/read',    handler : Na__CloudflareHandler__ProjectFiles__HandleRead },
        { method : 'POST', suffix : '/files/write',   handler : Na__CloudflareHandler__ProjectFiles__HandleWrite },
        { method : 'POST', suffix : '/files/upload',  handler : Na__CloudflareHandler__ProjectFiles__HandleUpload },
        { method : 'POST', suffix : '/files/list',    handler : Na__CloudflareHandler__ProjectFiles__HandleList },
        { method : 'POST', suffix : '/files/copy',    handler : Na__CloudflareHandler__ProjectFiles__HandleCopy },
        { method : 'POST', suffix : '/files/delete',  handler : Na__CloudflareHandler__ProjectFiles__HandleDelete },
        { method : 'POST', suffix : '/merge-keys',    handler : Na__CloudflareHandler__ProjectMerge__HandleMergeKeys },
        { method : 'GET',  suffix : '/project',       handler : Na__CloudflareHandler__ProjectMerge__HandleGetProject },
        { method : 'POST', suffix : '/visibility',    handler : Na__CloudflareHandler__ProjectVisibility__HandleToggle },
        { method : 'POST', suffix : '/rename',        handler : Na__CloudflareHandler__ProjectRename__HandleRename },
        { method : 'POST', suffix : '/delete',        handler : Na__CloudflareHandler__ProjectDelete__HandleDelete },
        { method : 'GET',  suffix : '/drawing-notes', handler : Na__CloudflareHandler__DrawingNotes__HandleGet },
        { method : 'POST', suffix : '/drawing-notes', handler : Na__CloudflareHandler__DrawingNotes__HandlePost },
        { method : 'POST', suffix : '/assets',        handler : Na__CloudflareHandler__ProjectAsset__HandleUpload }
    ]);
    const Na__Route__SAVE = Object.freeze({ method : 'POST', suffix : '', handler : Na__CloudflareHandler__ProjectEditor__HandleSave });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


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
// REGION | Route Resolution
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Decode a %-Encoded folderId (null when malformed)
    // ------------------------------------------------------------
    // Clients send the folderId either whole-encoded ('2026%2F3047__Doous') or
    // per segment ('2025/FN-62104__Fenner%20Scheme-01'); both decode the same.
    // ------------------------------------------------------------
    function na_decode_folder_id(rawFolderId) {
        try {
            return decodeURIComponent(rawFolderId);                          // <-- Decode: '2026%2F63592__Name' → '2026/63592__Name'
        } catch {
            return null;                                                     // <-- A stray '%' is a 400, never an uncaught error
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Find the Route for a Method and Path (no key check yet)
    // ------------------------------------------------------------
    // Returns { route, rawFolderId } or null when no route has that shape.
    // Resolving before the key check is what lets an unknown path answer a
    // JSON 404 with or without the key.
    // ------------------------------------------------------------
    function na_resolve_route(method, pathname) {
        if (!pathname.startsWith(Na__Route__PROJECTS_PREFIX)) return null;
        const rest = pathname.slice(Na__Route__PROJECTS_PREFIX.length);

        for (const route of Na__Route__PROJECT_ROUTES) {
            if (route.method === method && rest.length > route.suffix.length && rest.endsWith(route.suffix)) {
                return { route : route, rawFolderId : rest.slice(0, rest.length - route.suffix.length) };
            }
        }

        // ROUTE | POST /api/editor/projects/{folderId} - only when the whole rest is "YYYY/Folder"
        if (method === Na__Route__SAVE.method && rest.length > 0) {
            const decoded = na_decode_folder_id(rest);
            if ((decoded === null ? rest : decoded).split('/').length === 2) {
                return { route : Na__Route__SAVE, rawFolderId : rest };
            }
        }
        return null;
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
            const requestOrigin = request.headers.get('Origin') || '';

            try {
                const url    = new URL(request.url);
                const method = request.method.toUpperCase();

                // HANDLE CORS PREFLIGHT
                if (method === 'OPTIONS') {
                    return na_cors_preflight_response(env, requestOrigin);
                }

                // HANDLE HEALTH CHECK (unauthenticated read)
                if (method === 'GET' && url.pathname === '/api/editor/health') {
                    return na_cors_json_response(
                        JSON.stringify({
                            ok      : true,
                            worker  : Na__EditorWorker__NAME,
                            version : Na__EditorWorker__VERSION,
                            routes  : Na__EditorWorker__ROUTES
                        }),
                        200, env, requestOrigin
                    );
                }

                // FIND THE ROUTE | A path no route matches is a JSON 404, key or no key
                const resolved = na_resolve_route(method, url.pathname);
                if (!resolved) {
                    return na_cors_json_response(
                        JSON.stringify({ error: `No route matched: ${method} ${url.pathname}` }),
                        404, env, requestOrigin
                    );
                }

                // AUTHENTICATE EVERY PROJECT ROUTE (reads included)
                if (!na_validate_api_key(request, env)) {
                    return na_cors_json_response(
                        JSON.stringify({ error: 'Unauthorized — invalid or missing X-Editor-Api-Key' }),
                        401, env, requestOrigin
                    );
                }

                // CHECK THE folderId | The rename handler's pattern, on every /projects/ route
                const folderId = na_decode_folder_id(resolved.rawFolderId);
                if (folderId === null) {
                    return na_cors_json_response(
                        JSON.stringify({ error: 'folderId is not valid %-encoding' }),
                        400, env, requestOrigin
                    );
                }
                const folderCheck = na_validate_folder_id(folderId);
                if (!folderCheck.ok) {
                    return na_cors_json_response(
                        JSON.stringify({ error: folderCheck.error, folderId: folderId }),
                        400, env, requestOrigin
                    );
                }

                return await resolved.route.handler(request, env, folderId, requestOrigin);

            } catch (error) {
                console.error('[EditorWorker] Unhandled error:', error);
                return na_cors_json_response(
                    JSON.stringify({ error: `Worker error: ${error && error.message ? error.message : String(error)}` }),
                    500, env, requestOrigin
                );
            }
        }
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
