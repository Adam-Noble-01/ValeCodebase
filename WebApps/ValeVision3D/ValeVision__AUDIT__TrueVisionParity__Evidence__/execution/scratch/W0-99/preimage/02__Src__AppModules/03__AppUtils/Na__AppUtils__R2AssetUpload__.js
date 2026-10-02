// =============================================================================
// VALEVISION3D - APP UTILS - R2 ASSET UPLOAD
// =============================================================================
//
// FILE       : Na__AppUtils__R2AssetUpload__.js
// NAMESPACE  : Na__AppUtils
// MODULE     : App Utils - R2 Asset Upload
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Two-phase R2-first upload for binary project assets (thumbnails, baked linework, snapshots)
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - The sibling of Na__AppUtils__R2SaveProjectJson__ for files rather than
//   the project document. Phase 1 writes the asset to R2 through the
//   whitecardopedia-editor-api worker's asset route (JSON body, base64 data);
//   Phase 2 mirrors it to the local project folder through Flask (multipart).
//   Phase 1 must succeed; a Phase 2 failure is a red toast and localSuccess
//   false, never a failed upload.
// - IT NEVER THROWS. Every outcome comes back as { r2Success, localSuccess,
//   publicUrl, relUrl, error }, the shape TrueVision's twin answers with. A
//   refused path, an unknown project, no worker config or a worker refusal
//   returns r2Success false with the reason, a red toast and a console line.
//   An object is truthy, so a caller tests r2Success, never whether a result
//   came back.
// - LOCALHOST ONLY. The worker key comes from the local Flask server and
//   nowhere else, so off localhost nothing is attempted and nothing is said:
//   the result is a silent skip (skipped true, r2Success false). An authoring
//   session on the live site never toasts red over a picture it could not
//   have stored.
// - Paths are RELATIVE to the project folder and limited by the worker to
//   PresentationMode/Thumbnails and LayoutEditor/{Linework,Snapshots}. The
//   same guard runs here first so a bad path fails before any request. It
//   holds one row per asset kind, as the worker's path families do (a
//   thumbnail is webp or png); a new kind is one more row, added with the
//   worker's guard and the Flask mirror's.
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
// - Authored in   : ValeVision3D first (v2.18.0, 09-Sep-2026, port Phase 2)
// - Twin          : TrueVision3D 02__Src__AppModules/03__AppUtils/Na__AppUtils__R2AssetUpload__.js 1.0.1,
//                   ported FROM this file on 10-Sep-2026 for TrueVision3D v2.21.0: the same name
//                   and signature over TrueVision's own transport (read at b2aa9151)
// - Source version: 1.0.1 (TrueVision3D v2.32.1, 13-Sep-2026; read at b2aa9151) - the twin's failure
//                   contract and MODULE line
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W0-14}} (the contract only; the transport
//                   below stays this app's)
// - Parity        : diverged (DIV-4: identical name, signature and result shape, different transport)
// - Divergences   :
//   - Two phases: the whitecardopedia-editor-api asset route, which must succeed,
//     then a best-effort Flask mirror to the local project folder. TrueVision's
//     twin is one call to Na__CfApi__WriteProjectAsset, with no local copy, so
//     its localSuccess is always true; here it is the mirror's outcome.
//   - Off localhost nothing is attempted and the result is a silent skip
//     (skipped true, no toast; VV D24). TrueVision toasts "not configured"
//     when its client has no worker.
//   - The project folder comes from projectCode (Na__AppUtils__NormalizeProjectFolderId);
//     TrueVision ignores projectCode and takes the folder from the URL.
//   - The path guard has one row per asset kind, as the worker's path families
//     (a thumbnail is webp or png); TrueVision's one pattern lets json through
//     in all three folders.
//   - A stored asset is announced with a green "Asset saved to R2" toast and a
//     failed mirror with a red one; TrueVision has neither.
// - Back-port     : none - TrueVision has its own twin ("Back-port : no" in its
//                   PORT NOTE). The old "candidate" was settled on 10-Sep-2026.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.2 (TrueVision's upload contract, {{VVREL:W0-14}})
// - Never throws. A refused path, an unknown project, a missing worker config
//   or a worker refusal comes back as { r2Success: false, localSuccess: false,
//   publicUrl: null, relUrl: null, error } with a red toast, as TrueVision's
//   twin answers; a stored asset's result carries relUrl (it was relativePath).
//   The snapshot and linework callers already tested r2Success; the thumbnail
//   renderer does from this release.
// - Off localhost nothing is attempted and nothing is said: a silent skipped
//   result, so an unlocked session on the live site never toasts red.
// - The path guard is a row per asset kind; a thumbnail is webp or png.
// - The MODULE line is TrueVision's (App Utils - R2 Asset Upload), and the
//   mirror's console line carries the [ValeVision3D] prefix.
//
// 01-Oct-2026 - Version 1.0.1 (records hygiene, {{VVREL:W0-06}})
// - Comments only. The PORT NOTE still offered this file to TrueVision as a
//   back-port candidate three weeks after TrueVision took its name and
//   signature over its own transport; it now names that twin and how the two
//   differ.
//
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
        Na__AppUtils__IsRunningOnLocalhost,
        Na__AppUtils__NormalizeProjectFolderId,
        Na__AppUtils__ResolveAssetUrl
    } from './Na__AppUtils__ProjectLoader.js';
    import { Na__AppUtils__R2FetchWorkerConfig } from './Na__AppUtils__R2SaveProjectJson__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Allowed Asset Paths, One Row per Asset Kind (mirrors the worker's path families)
    // ------------------------------------------------------------
    // The worker refuses any other path, so asking here first means nothing is
    // encoded or sent for a write that cannot land. Linework is JSON and a
    // snapshot a picture, but the worker's family for the two Layout Editor
    // folders takes all three types, so this row does too.
    // ------------------------------------------------------------
    const Na__R2Asset__PATH_GUARDS = Object.freeze([
        Object.freeze({ kind : 'thumbnail', pattern : /^PresentationMode\/Thumbnails\/[A-Za-z0-9_.-]+\.(webp|png)$/ }),      // <-- The worker's thumbnail family
        Object.freeze({ kind : 'linework',  pattern : /^LayoutEditor\/Linework\/[A-Za-z0-9_.-]+\.(webp|png|json)$/ }),        // <-- The worker's Layout Editor asset family
        Object.freeze({ kind : 'snapshot',  pattern : /^LayoutEditor\/Snapshots\/[A-Za-z0-9_.-]+\.(webp|png|json)$/ })        // <-- The worker's Layout Editor asset family
    ]);
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Content Types by Extension
    // ------------------------------------------------------------
    const Na__R2Asset__CONTENT_TYPES = Object.freeze({
        webp : 'image/webp',
        png  : 'image/png',
        json : 'application/json'
    });
    // ------------------------------------------------------------

    // MODULE CONSTANTS | What a Skipped Upload Says (off localhost; never toasted)
    // ------------------------------------------------------------
    const Na__R2Asset__SKIPPED_MESSAGE = 'Asset not uploaded: assets are stored from localhost only.';
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
// REGION | Upload Results
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Failed Upload, in TrueVision's Shape
    // ------------------------------------------------------------
    // r2Success false and no URL, so no caller can take it for a stored asset.
    // ------------------------------------------------------------
    function Na__R2Asset__Failure(message) {
        return { r2Success : false, localSuccess : false, publicUrl : null, relUrl : null, error : message };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Refuse an Upload: Say Why, Then Hand Back the Failure
    // ------------------------------------------------------------
    function Na__R2Asset__Refuse(message, toast) {
        console.warn('[ValeVision3D]', message);
        toast(message, true);
        return Na__R2Asset__Failure(message);
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
    // showToast    - optional (message, isError)
    //
    // Returns { r2Success, localSuccess, publicUrl, relUrl, error }; off
    // localhost it also carries skipped: true. A failure never throws: it
    // comes back with r2Success false, so test that field.
    // ------------------------------------------------------------
    async function Na__AppUtils__R2AssetUpload(payload, projectCode, relativePath, showToast) {
        const toast = (typeof showToast === 'function') ? showToast : () => {};

        if (!Na__AppUtils__IsRunningOnLocalhost()) {
            return Object.assign(Na__R2Asset__Failure(Na__R2Asset__SKIPPED_MESSAGE), { skipped : true });   // <-- Silent: nothing attempted, nothing toasted (VV D24)
        }

        if (!Na__AppUtils__R2AssetPathAllowed(relativePath)) {
            return Na__R2Asset__Refuse(`Asset path refused: ${relativePath}`, toast);
        }

        const folderId = (typeof projectCode === 'string' && projectCode) ? Na__AppUtils__NormalizeProjectFolderId(projectCode) : null;
        if (!folderId) {
            return Na__R2Asset__Refuse(`Asset not uploaded: no project folder for project code ${projectCode}.`, toast);
        }

        let blob    = null;
        let written = null;
        try {
            const workerConfig = await Na__AppUtils__R2FetchWorkerConfig();
            if (!workerConfig) {
                return Na__R2Asset__Refuse('Worker config unavailable - asset not uploaded. Check Flask is running and Token__CloudflareAPI.env has EDITOR_WORKER_URL and EDITOR_API_KEY.', toast);
            }

            const contentType = Na__R2Asset__ContentTypeFor(relativePath);
            blob              = Na__R2Asset__ToBlob(payload, contentType);
            const base64Data  = await Na__R2Asset__BlobToBase64(blob);

            // PHASE 1 | R2 WRITE (SSOT - must succeed before Phase 2)
            written = await na_asset_phase1_write_to_r2(workerConfig, folderId, relativePath, contentType, base64Data);

        } catch (error) {
            const message = `Asset upload failed: ${(error && error.message) || error}`;
            console.error('[ValeVision3D]', message, error);
            toast(message, true);
            return Na__R2Asset__Failure(message);                                // <-- Never thrown: the caller tests r2Success
        }
        toast('Asset saved to R2', false);

        // PHASE 2 | LOCAL MIRROR (best effort)
        let localSuccess = true;
        try {
            await na_asset_phase2_mirror_to_local(projectCode, relativePath, blob);
        } catch (mirrorError) {
            localSuccess = false;
            console.warn('[ValeVision3D] Local asset mirror failed after the R2 write:', mirrorError.message);
            toast('Local asset mirror failed - restart Flask to resync', true);
        }

        const resolved = Na__AppUtils__ResolveAssetUrl(folderId, relativePath);
        return {
            r2Success    : true,
            localSuccess : localSuccess,
            publicUrl    : (written && written.publicUrl) || (resolved && resolved.primary) || null,
            relUrl       : relativePath,
            error        : null
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Relative Path One the Upload Route Accepts?
    // ------------------------------------------------------------
    function Na__AppUtils__R2AssetPathAllowed(relativePath) {
        return typeof relativePath === 'string' && Na__R2Asset__PATH_GUARDS.some((guard) => guard.pattern.test(relativePath));
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
