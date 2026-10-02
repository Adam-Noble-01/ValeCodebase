// =============================================================================
// VALEVISION3D - APP UTILS - R2 ASSET UPLOAD
// =============================================================================
//
// FILE       : Na__AppUtils__R2AssetUpload__.js
// NAMESPACE  : Na__AppUtils
// MODULE     : R2AssetUpload
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Two-phase R2-first upload for binary project assets (thumbnails, baked linework, snapshots)
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - The sibling of Na__AppUtils__R2SaveProjectJson__ for files rather than
//   the project document. Phase 1 writes the asset to R2 through the
//   whitecardopedia-editor-api worker's asset route (JSON body, base64 data);
//   Phase 2 mirrors it to the local project folder through Flask (multipart).
//   Phase 1 must succeed; Phase 2 failure is a red toast, not a throw.
// - Paths are RELATIVE to the project folder and limited by the worker to
//   PresentationMode/Thumbnails and LayoutEditor/{Linework,Snapshots}. The
//   same guard runs here first so a bad path fails before any request.
// - Reads of these assets go through Na__AppUtils__ResolveAssetUrl so the R2
//   to GH Pages fallback applies; a missing asset on GH simply triggers the
//   on-device fallback in the systems that use it.
//
// INTEGRATION:
// - Na__PresentationMode__Thumbnail__Renderer.js (drawing thumbnails),
//   Na__ProjectedLinework__ (baked linework, Phase 4) and the Layout Editor
//   (3D snapshots, Phase 5) call Na__AppUtils__R2AssetUpload.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : none (ValeVision original)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2)
// - Parity        : new
// - Divergences   : TrueVision uploads thumbnails through Na__CloudflareIntegration__ApiClient__.
// - Back-port     : candidate.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 2.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities and the Shared Worker Config
    // ------------------------------------------------------------
    import {
        Na__AppUtils__NormalizeProjectFolderId,
        Na__AppUtils__ResolveAssetUrl
    } from './Na__AppUtils__ProjectLoader.js';
    import { Na__AppUtils__R2FetchWorkerConfig } from './Na__AppUtils__R2SaveProjectJson__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Allowed Asset Paths (mirrors the worker guard)
    // ------------------------------------------------------------
    const Na__R2Asset__PATH_GUARD = /^(PresentationMode\/Thumbnails|LayoutEditor\/(Linework|Snapshots))\/[A-Za-z0-9_.-]+\.(webp|png|json)$/;
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Content Types by Extension
    // ------------------------------------------------------------
    const Na__R2Asset__CONTENT_TYPES = Object.freeze({
        webp : 'image/webp',
        png  : 'image/png',
        json : 'application/json'
    });
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Payload Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Turn Whatever the Caller Has Into a Blob
    // ------------------------------------------------------------
    // A Blob passes through; a string is UTF-8 text; anything else is
    // serialised as JSON.
    // ------------------------------------------------------------
    function Na__R2Asset__ToBlob(payload, contentType) {
        if (payload instanceof Blob) return payload;
        if (typeof payload === 'string') return new Blob([payload], { type: contentType });
        return new Blob([JSON.stringify(payload)], { type: contentType });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Base64-Encode a Blob (Data URL Minus Its Prefix)
    // ------------------------------------------------------------
    function Na__R2Asset__BlobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(reader.error || new Error('Could not read asset blob'));
            reader.onload  = () => {
                const dataUrl = String(reader.result || '');
                resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));               // <-- Strip "data:...;base64,"
            };
            reader.readAsDataURL(blob);
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Content Type From the Path Extension
    // ------------------------------------------------------------
    function Na__R2Asset__ContentTypeFor(relativePath) {
        const ext = relativePath.slice(relativePath.lastIndexOf('.') + 1).toLowerCase();
        return Na__R2Asset__CONTENT_TYPES[ext] || 'application/octet-stream';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Upload Phases
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Phase 1 - Write the Asset to R2 Through the Worker (SSOT)
    // ------------------------------------------------------------
    async function na_asset_phase1_write_to_r2(workerConfig, folderId, relativePath, contentType, base64Data) {
        const encodedFolderId = encodeURIComponent(folderId);                    // <-- '2026/3047__Doous' -> '2026%2F3047__Doous'
        const response = await fetch(`${workerConfig.workerApiBaseUrl}/projects/${encodedFolderId}/assets`, {
            method  : 'POST',
            headers : {
                'Content-Type'     : 'application/json',
                'X-Editor-Api-Key' : workerConfig.apiKey
            },
            body    : JSON.stringify({
                path        : relativePath,
                contentType : contentType,
                encoding    : 'base64',
                data        : base64Data
            })
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `Worker responded ${response.status}`);
        }
        return await response.json();                                            // <-- { ok, path, publicUrl }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Phase 2 - Mirror to the Local Project Folder Through Flask
    // ------------------------------------------------------------
    async function na_asset_phase2_mirror_to_local(projectCode, relativePath, blob) {
        const formData = new FormData();
        formData.append('path', relativePath);
        formData.append('file', blob, relativePath.slice(relativePath.lastIndexOf('/') + 1));

        const response = await fetch(`${window.location.origin}/api/projects/${projectCode}/assets`, {
            method : 'POST',
            body   : formData
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `Flask responded ${response.status}`);
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | R2-First Two-Phase Asset Upload
    // ------------------------------------------------------------
    // payload      - Blob, string, or a JSON-serialisable object
    // projectCode  - as Na__AppUtils__GetProjectCodeFromUrl returns it
    // relativePath - e.g. 'PresentationMode/Thumbnails/Scene_010.webp'
    // Returns { r2Success, localSuccess, relativePath, publicUrl }.
    // Throws only on a Phase 1 (R2) failure or a rejected path.
    // ------------------------------------------------------------
    async function Na__AppUtils__R2AssetUpload(payload, projectCode, relativePath, showToast) {
        const toast = (typeof showToast === 'function') ? showToast : () => {};

        if (typeof relativePath !== 'string' || !Na__R2Asset__PATH_GUARD.test(relativePath)) {
            throw new Error(`Asset path not allowed: ${relativePath}`);
        }

        const folderId = Na__AppUtils__NormalizeProjectFolderId(projectCode);
        if (!folderId) throw new Error(`Could not resolve folderId for projectCode: ${projectCode}`);

        const workerConfig = await Na__AppUtils__R2FetchWorkerConfig();
        if (!workerConfig) {
            throw new Error('Worker config unavailable - check Flask is running and Token__CloudflareAPI.env has EDITOR_WORKER_URL and EDITOR_API_KEY.');
        }

        const contentType = Na__R2Asset__ContentTypeFor(relativePath);
        const blob        = Na__R2Asset__ToBlob(payload, contentType);
        const base64Data  = await Na__R2Asset__BlobToBase64(blob);

        // PHASE 1 | R2 WRITE (SSOT - must succeed before Phase 2)
        const result = await na_asset_phase1_write_to_r2(workerConfig, folderId, relativePath, contentType, base64Data);
        toast('Asset saved to R2', false);

        // PHASE 2 | LOCAL MIRROR (best effort)
        let localSuccess = true;
        try {
            await na_asset_phase2_mirror_to_local(projectCode, relativePath, blob);
        } catch (mirrorError) {
            localSuccess = false;
            console.warn('[R2AssetUpload] Local mirror failed after R2 write:', mirrorError.message);
            toast('Local asset mirror failed - restart Flask to resync', true);
        }

        const resolved = Na__AppUtils__ResolveAssetUrl(folderId, relativePath);
        return {
            r2Success    : true,
            localSuccess : localSuccess,
            relativePath : relativePath,
            publicUrl    : (result && result.publicUrl) || (resolved && resolved.primary) || null
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Relative Path One the Upload Route Accepts?
    // ------------------------------------------------------------
    function Na__AppUtils__R2AssetPathAllowed(relativePath) {
        return typeof relativePath === 'string' && Na__R2Asset__PATH_GUARD.test(relativePath);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | R2 Asset Upload API
    // ------------------------------------------------------------
    export {
        Na__AppUtils__R2AssetUpload,
        Na__AppUtils__R2AssetPathAllowed
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
