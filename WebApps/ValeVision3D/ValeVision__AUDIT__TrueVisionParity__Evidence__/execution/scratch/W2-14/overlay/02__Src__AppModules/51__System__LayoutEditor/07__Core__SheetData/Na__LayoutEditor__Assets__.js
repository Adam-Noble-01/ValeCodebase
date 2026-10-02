// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - ASSETS
// =============================================================================
//
// FILE       : Na__LayoutEditor__Assets__.js
// NAMESPACE  : Na__LeAssets
// MODULE     : Layout Editor - Assets
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Snapshot images to and from R2, and the small image conversions around them
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - A 3D viewport snapshot rendered on localhost is uploaded to
//   LayoutEditor/Snapshots/ under the project (D36) and referenced from the
//   viewport record by path and fingerprint, so the web build shows the
//   same picture without a WebGL render. Reads go through the R2-first
//   resolver with the GH Pages fallback.
// - Everything that comes back is a data URL: the frame element and the PDF
//   exporter both consume those.
//
// INTEGRATION:
// - Used by the 3D viewport module and the PDF exporter.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, v2.21.0, port Phase 5); since ported back
//                   whole from TrueVision3D 1.0.1 (HEAD b2aa9151)
// - Source version: 1.0.1 (TrueVision3D v2.54.0, 14-Sep-2026; read at b2aa9151) - in that release's
//                   commit; its devlog entry does not name the change (module log 14-Sep-2026)
// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1
// - Parity        : adapted
// - Divergences   :
//   - Banner and console prefix read ValeVision3D.
//   - CanUpload asks Na__AppUtils__IsRunningOnLocalhost, not TrueVision's DevGate (TD01): only the
//     local Flask server hands out the worker key, so an unlocked session anywhere else would
//     render, try an upload that cannot land and toast (VV D24, DR-31 (2)). The import sits where
//     TrueVision imports Na__DevGate__IsAuthoringEnabled.
//   - Na__LeAssets__FolderId's two helpers carry TrueVision's names with ValeVision's meaning
//     (W0-11): the master-index folderId ("2026/3047__Doous"), and null rather than a guess.
//     Uploads go through Na__AppUtils__R2AssetUpload, ValeVision's twin, which resolves the same
//     folder from the project code (DIV-4).
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 14-Sep-2026 - Version 1.0.1
// - Fix: Load read from a folder named after the project code (26-Projects/PS01),
//   but every upload writes to the URL's project folder (26-Projects/PS01__MustersRoad).
//   No stored snapshot was ever found, so every 3D viewport rendered again and
//   uploaded again. Load now reads from the project folder (Na__LeAssets__FolderId).
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | App Utilities, Drawing Data and Config
    // ------------------------------------------------------------
    import {
        Na__AppUtils__GetProjectFolderFromUrl,
        Na__AppUtils__GetYearFromUrl,
        Na__AppUtils__ResolveAssetUrl
    } from '../../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    import { Na__AppUtils__R2AssetUpload } from '../../03__AppUtils/Na__AppUtils__R2AssetUpload__.js';
    import { Na__DrawData__GetProjectCode } from '../../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    import { Na__LeCfg__GetViewportSetup } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';
    // ------------------------------------------------------------

    import { Na__AppUtils__IsRunningOnLocalhost } from '../../03__AppUtils/Na__AppUtils__ProjectLoader.js';   // <-- ValeVision: the data-path gate is the hostname test (VV D24)

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Loaded Asset Cache (path -> data URL or null)
    // ------------------------------------------------------------
    const Na__LeAssets__Cache = new Map();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Conversions
// -----------------------------------------------------------------------------

    // FUNCTION | Canvas to Blob (webp where the browser can, else png)
    // ------------------------------------------------------------
    function Na__LeAssets__CanvasToBlob(canvas, mimeType, quality) {
        return new Promise((resolve) => {
            try { canvas.toBlob((blob) => resolve(blob || null), mimeType || 'image/webp', quality === undefined ? 0.9 : quality); }
            catch (e) { resolve(null); }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Blob to Data URL
    // ------------------------------------------------------------
    function Na__LeAssets__BlobToDataUrl(blob) {
        return new Promise((resolve) => {
            if (!blob) { resolve(null); return; }
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Any Image Data URL to a PNG Data URL (for jsPDF)
    // ------------------------------------------------------------
    function Na__LeAssets__ToPngDataUrl(dataUrl) {
        return new Promise((resolve) => {
            if (!dataUrl) { resolve(null); return; }
            if (/^data:image\/(png|jpeg)/i.test(dataUrl)) { resolve(dataUrl); return; }
            const image = new Image();
            image.onload = () => {
                try {
                    const canvas  = document.createElement('canvas');
                    canvas.width  = image.naturalWidth;
                    canvas.height = image.naturalHeight;
                    canvas.getContext('2d').drawImage(image, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch (e) { resolve(null); }
            };
            image.onerror = () => resolve(null);
            image.src = dataUrl;
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Paths and Transfer
// -----------------------------------------------------------------------------

    // FUNCTION | The R2 Key of a Viewport Snapshot
    // ------------------------------------------------------------
    function Na__LeAssets__SnapshotPath(sheetId, viewportId, fingerprint) {
        const clean  = (v) => String(v).replace(/[^A-Za-z0-9_.-]/g, '_');
        const folder = Na__LeCfg__GetViewportSetup().assetFolder.replace(/\/+$/, '');
        return folder + '/' + clean(sheetId) + '__' + clean(viewportId) + '__' + clean(fingerprint) + '.webp';
    }
    // ------------------------------------------------------------


    // FUNCTION | Can This Session Write Assets
    // ------------------------------------------------------------
    function Na__LeAssets__CanUpload() {
        return Na__AppUtils__IsRunningOnLocalhost() && !!Na__DrawData__GetProjectCode();
    }
    // ------------------------------------------------------------


    // FUNCTION | Upload a Blob Under the Project (localhost only)
    // ------------------------------------------------------------
    async function Na__LeAssets__Upload(blob, relativePath, showToast) {
        if (!blob || !Na__LeAssets__CanUpload()) return null;
        try {
            const result = await Na__AppUtils__R2AssetUpload(blob, Na__DrawData__GetProjectCode(), relativePath, showToast);
            const dataUrl = await Na__LeAssets__BlobToDataUrl(blob);
            if (dataUrl) Na__LeAssets__Cache.set(relativePath, dataUrl);
            return result;
        } catch (uploadError) {
            console.warn('[ValeVision3D LayoutEditor] Snapshot upload failed:', uploadError);
            return null;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Folder Assets Are Read From ("26/PS01__MustersRoad", or null)
    // ------------------------------------------------------------
    // The URL's year and project folder: the folder every upload writes to, as
    // Na__CfApi__WriteProjectAsset takes it from the URL too. The project code
    // is not a folder - PS01's assets live in PS01__MustersRoad. Null without
    // a project folder in the URL, where nothing can have been uploaded.
    // ------------------------------------------------------------
    function Na__LeAssets__FolderId() {
        const projectFolder = Na__AppUtils__GetProjectFolderFromUrl();
        return projectFolder ? Na__AppUtils__GetYearFromUrl() + '/' + projectFolder : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fetch One URL as a Data URL
    // ------------------------------------------------------------
    async function Na__LeAssets__FetchDataUrl(url) {
        const response = await fetch(url, { cache : 'default' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return Na__LeAssets__BlobToDataUrl(await response.blob());
    }
    // ------------------------------------------------------------


    // FUNCTION | Load a Project Asset as a Data URL (R2 first, GH Pages fallback)
    // ------------------------------------------------------------
    async function Na__LeAssets__Load(relativePath) {
        if (!relativePath) return null;
        if (Na__LeAssets__Cache.has(relativePath)) return Na__LeAssets__Cache.get(relativePath);
        const folderId = Na__LeAssets__FolderId();                                  // <-- Where the upload put it, never a folder named after the code
        if (!folderId) return null;
        const urls = Na__AppUtils__ResolveAssetUrl(folderId, relativePath);
        let dataUrl = null;
        try { dataUrl = await Na__LeAssets__FetchDataUrl(urls.primary); }
        catch (primaryError) {
            if (urls.fallback && urls.fallback !== urls.primary) {
                try { dataUrl = await Na__LeAssets__FetchDataUrl(urls.fallback); } catch (fallbackError) { dataUrl = null; }
            }
        }
        Na__LeAssets__Cache.set(relativePath, dataUrl);
        return dataUrl;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remember a Rendered Picture Under Its Path Without a Round Trip
    // ------------------------------------------------------------
    function Na__LeAssets__Remember(relativePath, dataUrl) {
        if (relativePath && dataUrl) Na__LeAssets__Cache.set(relativePath, dataUrl);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Assets API
    // ------------------------------------------------------------
    export {
        Na__LeAssets__CanvasToBlob,
        Na__LeAssets__BlobToDataUrl,
        Na__LeAssets__ToPngDataUrl,
        Na__LeAssets__SnapshotPath,
        Na__LeAssets__CanUpload,
        Na__LeAssets__Upload,
        Na__LeAssets__Load,
        Na__LeAssets__Remember
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
