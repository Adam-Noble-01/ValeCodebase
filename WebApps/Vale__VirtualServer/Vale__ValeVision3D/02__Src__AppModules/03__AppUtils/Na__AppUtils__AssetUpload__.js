// =============================================================================
// VALEVISION3D - APP UTILS - ASSET UPLOAD
// =============================================================================
//
// FILE       : Na__AppUtils__AssetUpload__.js
// NAMESPACE  : Na__AppUtils
// MODULE     : App Utils - Asset Upload
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Store a binary project asset (scene thumbnail, baked linework, viewport
//              snapshot) on the ValeVision 3D server
// CREATED    : 06-Oct-2026
//
// DESCRIPTION:
// - ONE UPLOAD to POST api/projects/<id>/assets (multipart: path, file). The
//   server puts a scene thumbnail in the project's public
//   Content__AnimationScenes__Thumbnails folder, and Layout Editor linework and
//   snapshots in its UserData__UserGeneratedContent__Drawings folder.
// - Paths are RELATIVE to the project, in the app's own families:
//   PresentationMode/Thumbnails and LayoutEditor/{Linework,Snapshots}. The same
//   guard runs here first, so a bad path fails before any request.
// - IT NEVER THROWS. Every outcome is { ok, publicUrl, relUrl, error }; a
//   refusal (a bad path, no project, not signed in at the authoring level)
//   comes back ok false with the reason, a red toast and a console line.
// - Reads of these assets go through Na__AppUtils__ResolveAssetUrl.
//
// INTEGRATION:
// - Na__PresentationMode__Thumbnail__Renderer.js (scene thumbnails),
//   Na__ProjectedLinework__Persistence__ (baked linework) and the Layout Editor
//   (3D snapshots) call Na__AppUtils__AssetUpload.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 06-Oct-2026 - Version 1.0.0
// - Replaces Na__AppUtils__R2AssetUpload__.js 1.0.1 (the Worker's base64 write to R2,
//   then a Flask mirror, from localhost only) with one upload to the server.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | The API and the Asset URL Resolver
    // ------------------------------------------------------------
    import {
        Na__AppUtils__ApiUrl,
        Na__AppUtils__InitProjectLocation,
        Na__AppUtils__ResolveAssetUrl
    } from './Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Allowed Asset Paths, One Row per Asset Kind (the server's ASSET_PATH_GUARD)
    // ------------------------------------------------------------
    const Na__Asset__PATH_GUARDS = Object.freeze([
        Object.freeze({ kind : 'thumbnail', pattern : /^PresentationMode\/Thumbnails\/[A-Za-z0-9_.-]+\.(webp|png)$/ }),
        Object.freeze({ kind : 'linework',  pattern : /^LayoutEditor\/Linework\/[A-Za-z0-9_.-]+\.(webp|png|json)$/ }),
        Object.freeze({ kind : 'snapshot',  pattern : /^LayoutEditor\/Snapshots\/[A-Za-z0-9_.-]+\.(webp|png|json)$/ })
    ]);
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Content Types by Extension
    // ------------------------------------------------------------
    const Na__Asset__CONTENT_TYPES = Object.freeze({
        webp : 'image/webp',
        png  : 'image/png',
        json : 'application/json'
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Turn Whatever the Caller Has Into a Blob
    // ------------------------------------------------------------
    function Na__Asset__ToBlob(payload, contentType) {
        if (payload instanceof Blob) return payload;
        if (typeof payload === 'string') return new Blob([payload], { type: contentType });
        return new Blob([JSON.stringify(payload)], { type: contentType });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Content Type From the Path Extension
    // ------------------------------------------------------------
    function Na__Asset__ContentTypeFor(relativePath) {
        const ext = relativePath.slice(relativePath.lastIndexOf('.') + 1).toLowerCase();
        return Na__Asset__CONTENT_TYPES[ext] || 'application/octet-stream';
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | A Failed Upload: Say Why, Then Hand Back the Result
    // ------------------------------------------------------------
    function Na__Asset__Refuse(message, toast) {
        console.warn('[ValeVision3D]', message);
        toast(message, true);
        return { ok : false, publicUrl : null, relUrl : null, error : message };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Upload One Asset to the Server
    // ------------------------------------------------------------
    // payload      - Blob, string, or a JSON-serialisable object
    // projectCode  - as Na__AppUtils__GetProjectCodeFromUrl returns it
    // relativePath - e.g. 'PresentationMode/Thumbnails/Scene_010.webp'
    // showToast    - optional (message, isError)
    // Returns { ok, publicUrl, relUrl, error }; never throws.
    // ------------------------------------------------------------
    async function Na__AppUtils__AssetUpload(payload, projectCode, relativePath, showToast) {
        const toast = (typeof showToast === 'function') ? showToast : () => {};

        if (!Na__AppUtils__AssetPathAllowed(relativePath)) {
            return Na__Asset__Refuse(`Asset path refused: ${relativePath}`, toast);
        }
        const location = await Na__AppUtils__InitProjectLocation();
        const projectId = (location && location.folder) || (typeof projectCode === 'string' ? projectCode.split('/').pop() : '');
        if (!projectId) {
            return Na__Asset__Refuse(`Asset not uploaded: no project for code ${projectCode}.`, toast);
        }

        try {
            const form = new FormData();
            form.append('path', relativePath);
            form.append('file', Na__Asset__ToBlob(payload, Na__Asset__ContentTypeFor(relativePath)), relativePath.split('/').pop());
            const response = await fetch(Na__AppUtils__ApiUrl(`projects/${encodeURIComponent(projectId)}/assets`), {
                method      : 'POST',
                credentials : 'same-origin',
                body        : form
            });
            const answer = await response.json().catch(() => ({}));
            if (!response.ok) {
                const reason = response.status === 401 ? 'sign in to save assets' : (answer.error || `HTTP ${response.status}`);
                return Na__Asset__Refuse(`Asset upload failed: ${reason}`, toast);
            }
        } catch (error) {
            return Na__Asset__Refuse(`Asset upload failed: ${(error && error.message) || error}`, toast);
        }

        toast('Asset saved', false);
        const resolved = Na__AppUtils__ResolveAssetUrl(projectId, relativePath);
        return { ok : true, publicUrl : resolved.primary, relUrl : relativePath, error : null };
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Relative Path One the Upload Route Accepts?
    // ------------------------------------------------------------
    function Na__AppUtils__AssetPathAllowed(relativePath) {
        return typeof relativePath === 'string' && Na__Asset__PATH_GUARDS.some((guard) => guard.pattern.test(relativePath));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Asset Upload API
    // ------------------------------------------------------------
    export {
        Na__AppUtils__AssetUpload,
        Na__AppUtils__AssetPathAllowed
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
