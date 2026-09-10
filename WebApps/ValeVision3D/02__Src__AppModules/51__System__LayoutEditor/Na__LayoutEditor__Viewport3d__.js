// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - VIEWPORT 3D
// =============================================================================
//
// FILE       : Na__LayoutEditor__Viewport3d__.js
// NAMESPACE  : Na__LeVp3d
// MODULE     : Layout Editor - Viewport 3D
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : A raster snapshot of a saved scene inside a crop frame
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - The picture is rendered from the scene camera through the live pipeline
//   with the viewport's style toggles (D30) at SnapshotPixelsPerMm of its
//   paper size, and placed inside the frame at the image offset. Corner
//   drags scale the image (its paper size), edge drags crop the frame.
// - The snapshot is fingerprinted by scene, camera, styles, layer visibility
//   and model. On localhost a fresh render is uploaded to R2 and referenced
//   on the record, so the web build loads the picture instead of rendering
//   it. A picture is only re-rendered when the paper size grows well past
//   what it was rendered for.
//
// INTEGRATION:
// - The sheet surface calls Fill for every visible 3D frame; the PDF
//   exporter asks for the picture at export resolution.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : ValeVision3D 21__System__PresentationMode/Na__PresentationMode__Thumbnail__Renderer.js (capture and upload pattern)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.21.0 (port Phase 5)
// - Parity        : new
// - Divergences   : n/a
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Config, Model, Snapshots and Assets
    // ------------------------------------------------------------
    import { Na__LeCfg__GetViewportSetup, Na__LeCfg__GetLabel } from './Na__LayoutEditor__ConfigState__.js';
    import { Na__LeModel__ResolveViewportSource, Na__LeModel__UpdateViewport } from './Na__LayoutEditor__SheetModel__.js';
    import { Na__LeSnap__Render3d, Na__LeSnap__IsReady } from './Na__LayoutEditor__SnapshotRenderer__.js';
    import {
        Na__LeAssets__CanvasToBlob,
        Na__LeAssets__BlobToDataUrl,
        Na__LeAssets__ToPngDataUrl,
        Na__LeAssets__SnapshotPath,
        Na__LeAssets__CanUpload,
        Na__LeAssets__Upload,
        Na__LeAssets__Load
    } from './Na__LayoutEditor__Assets__.js';
    import { Na__PlPipe__GetModelFingerprint } from '../50__System__ProjectedLinework/Na__ProjectedLinework__Pipeline__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Debounce and Re-render Threshold
    // ------------------------------------------------------------
    const Na__LeVp3d__RENDER_DELAY_MS = 400;
    const Na__LeVp3d__GROWTH_RATIO    = 1.25;   // <-- Re-render only when the needed pixels outgrow the picture by this
    // ------------------------------------------------------------

    // MODULE VARIABLES | Per-Viewport State
    // ------------------------------------------------------------
    const Na__LeVp3d__States = new Map();
    let   Na__LeVp3d__Interacting = false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fingerprint and Sizing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Short Hash of a String
    // ------------------------------------------------------------
    function Na__LeVp3d__Hash(text) {
        let h = 5381;
        for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
        return (h >>> 0).toString(36);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Fingerprint of the Picture a Viewport Wants
    // ------------------------------------------------------------
    function Na__LeVp3d__Fingerprint(viewport, scene) {
        const parts = [
            scene.PresentationMode__Scene__Id, scene.PresentationMode__Scene__Name,
            JSON.stringify(scene.PresentationMode__Scene__CameraPosition || null),
            JSON.stringify(scene.PresentationMode__Scene__OrbitHelperCubePosition || null),
            JSON.stringify(scene.PresentationMode__Scene__ModelLayerVisibility || null),
            JSON.stringify(viewport.Viewport__Styles),
            Math.round((viewport.Viewport__ImageMm.WidthMm / viewport.Viewport__ImageMm.HeightMm) * 1000),
            Na__PlPipe__GetModelFingerprint()
        ];
        return Na__LeVp3d__Hash(parts.join('|'));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Pixel Size for a Paper Size
    // ------------------------------------------------------------
    function Na__LeVp3d__PixelSize(viewport, pixelsPerMm) {
        const setup = Na__LeCfg__GetViewportSetup();
        let w = viewport.Viewport__ImageMm.WidthMm * pixelsPerMm, h = viewport.Viewport__ImageMm.HeightMm * pixelsPerMm;
        const longest = Math.max(w, h);
        if (longest > setup.maxSnapshotPixels) { w *= setup.maxSnapshotPixels / longest; h *= setup.maxSnapshotPixels / longest; }
        return { w : Math.max(16, Math.round(w)), h : Math.max(16, Math.round(h)) };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rendering and Loading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Per-Viewport State With Its Image Element
    // ------------------------------------------------------------
    function Na__LeVp3d__State(body, viewportId) {
        let state = Na__LeVp3d__States.get(viewportId);
        if (state && state.body === body) return state;
        body.innerHTML = '';
        const img = document.createElement('img');
        img.className = 'na-le-frame__snapshot';
        img.draggable = false;
        img.alt = '';
        img.hidden = true;
        body.appendChild(img);
        const empty = document.createElement('div');
        empty.className = 'na-le-frame__empty';
        body.appendChild(empty);
        state = { body : body, img : img, empty : empty, key : null, px : null, dataUrl : null, triedAsset : null, timer : null, inFlight : false, lastArgs : null };
        Na__LeVp3d__States.set(viewportId, state);
        return state;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Render, Show, and on Localhost Upload and Reference
    // ------------------------------------------------------------
    async function Na__LeVp3d__RenderNow(state, sheet, viewport, scene, key) {
        const px = Na__LeVp3d__PixelSize(viewport, Na__LeCfg__GetViewportSetup().snapshotPixelsPerMm);
        state.inFlight = true;
        try {
            const result = await Na__LeSnap__Render3d(scene, viewport.Viewport__Styles, px.w, px.h);
            if (!result) return;
            const blob    = await Na__LeAssets__CanvasToBlob(result.canvas, 'image/webp', 0.9);
            const dataUrl = blob ? await Na__LeAssets__BlobToDataUrl(blob) : result.canvas.toDataURL('image/png');
            if (!dataUrl) return;
            state.img.src = dataUrl; state.img.hidden = false;
            state.key = key; state.px = px; state.dataUrl = dataUrl;
            if (blob && Na__LeAssets__CanUpload()) {
                const path = Na__LeAssets__SnapshotPath(sheet.Sheet__Id, viewport.Viewport__Id, key);
                const uploaded = await Na__LeAssets__Upload(blob, path, null);
                if (uploaded) Na__LeModel__UpdateViewport(sheet, viewport.Viewport__Id, { snapshotAsset : { Asset__Path : path, Asset__Fingerprint : key } }, true);
            }
        } finally {
            state.inFlight = false;
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Try the Stored Asset, Else Render (debounced)
    // ------------------------------------------------------------
    function Na__LeVp3d__Schedule(state, viewportId) {
        if (state.timer) window.clearTimeout(state.timer);
        state.timer = window.setTimeout(async () => {
            state.timer = null;
            if (Na__LeVp3d__Interacting || state.inFlight || !state.lastArgs) return;
            const { sheet, viewport } = state.lastArgs;
            const scene = Na__LeModel__ResolveViewportSource(viewport).scene;
            if (!scene) return;
            const key = Na__LeVp3d__Fingerprint(viewport, scene);
            if (state.key === key) return;
            const slot = viewport.Viewport__SnapshotAsset;
            if (slot && slot.Asset__Fingerprint === key && state.triedAsset !== key) {
                state.triedAsset = key;
                state.inFlight = true;
                const dataUrl = await Na__LeAssets__Load(slot.Asset__Path);
                state.inFlight = false;
                if (Na__LeVp3d__States.get(viewportId) !== state) return;
                if (dataUrl) {
                    state.img.src = dataUrl; state.img.hidden = false;
                    state.key = key; state.dataUrl = dataUrl; state.px = { w : Infinity, h : Infinity };
                    return;
                }
            }
            if (!Na__LeSnap__IsReady()) return;
            await Na__LeVp3d__RenderNow(state, sheet, viewport, scene, key);
        }, Na__LeVp3d__RENDER_DELAY_MS);
    }
    // ------------------------------------------------------------


    // FUNCTION | Fill (or Refresh) the Body of a 3D Frame
    // ------------------------------------------------------------
    function Na__LeVp3d__Fill(body, sheet, viewport, ppm) {
        const state = Na__LeVp3d__State(body, viewport.Viewport__Id);
        state.lastArgs = { sheet : sheet, viewport : viewport, ppm : ppm };
        const scene = Na__LeModel__ResolveViewportSource(viewport).scene;

        state.img.style.left   = (viewport.Viewport__ImageOffsetMm.X * ppm) + 'px';
        state.img.style.top    = (viewport.Viewport__ImageOffsetMm.Y * ppm) + 'px';
        state.img.style.width  = (viewport.Viewport__ImageMm.WidthMm  * ppm) + 'px';
        state.img.style.height = (viewport.Viewport__ImageMm.HeightMm * ppm) + 'px';

        if (!scene) {
            state.empty.textContent = Na__LeCfg__GetLabel('NoSceneLinked', 'No scene linked to this viewport.');
            state.empty.hidden = false; state.img.hidden = true; state.key = null;
            return;
        }
        state.empty.hidden = true;
        const key = Na__LeVp3d__Fingerprint(viewport, scene);
        if (state.key === key) {
            const wanted = Na__LeVp3d__PixelSize(viewport, Na__LeCfg__GetViewportSetup().snapshotPixelsPerMm);
            if (state.px && wanted.w > state.px.w * Na__LeVp3d__GROWTH_RATIO && Na__LeSnap__IsReady()) { state.key = null; Na__LeVp3d__Schedule(state, viewport.Viewport__Id); }
            return;
        }
        Na__LeVp3d__Schedule(state, viewport.Viewport__Id);
    }
    // ------------------------------------------------------------


    // FUNCTION | Drop a Viewport's State
    // ------------------------------------------------------------
    function Na__LeVp3d__Release(viewportId) {
        const state = Na__LeVp3d__States.get(viewportId);
        if (!state) return;
        if (state.timer) window.clearTimeout(state.timer);
        Na__LeVp3d__States.delete(viewportId);
    }
    // ------------------------------------------------------------


    // FUNCTION | Hold Renders While the Pointer Is Down
    // ------------------------------------------------------------
    function Na__LeVp3d__SetInteracting(flag) {
        Na__LeVp3d__Interacting = flag === true;
        if (Na__LeVp3d__Interacting) return;
        Na__LeVp3d__States.forEach((state, viewportId) => {
            if (state.lastArgs && state.key === null) Na__LeVp3d__Schedule(state, viewportId);
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Render and Upload One 3D Viewport Without a Frame on Screen (Dev bake)
    // ------------------------------------------------------------
    // Returns 'baked' | 'skipped' (already referenced) | 'failed'.
    // ------------------------------------------------------------
    async function Na__LeVp3d__Bake(sheet, viewport, force) {
        const scene = Na__LeModel__ResolveViewportSource(viewport).scene;
        if (!scene || !Na__LeSnap__IsReady()) return 'failed';
        const key  = Na__LeVp3d__Fingerprint(viewport, scene);
        const slot = viewport.Viewport__SnapshotAsset;
        if (!force && slot && slot.Asset__Fingerprint === key) return 'skipped';
        const state = { img : document.createElement('img'), key : null, px : null, dataUrl : null, inFlight : false };
        await Na__LeVp3d__RenderNow(state, sheet, viewport, scene, key);
        const live = Na__LeVp3d__States.get(viewport.Viewport__Id);
        if (live && state.dataUrl) { live.img.src = state.dataUrl; live.img.hidden = false; live.key = key; live.px = state.px; live.dataUrl = state.dataUrl; }
        const after = viewport.Viewport__SnapshotAsset;
        return (after && after.Asset__Fingerprint === key) ? 'baked' : 'failed';
    }
    // ------------------------------------------------------------


    // FUNCTION | The Picture for the PDF (png data URL at export resolution)
    // ------------------------------------------------------------
    async function Na__LeVp3d__RenderForExport(sheet, viewport, pixelsPerMm) {
        const scene = Na__LeModel__ResolveViewportSource(viewport).scene;
        if (!scene) return null;
        const key   = Na__LeVp3d__Fingerprint(viewport, scene);
        const state = Na__LeVp3d__States.get(viewport.Viewport__Id);
        const px    = Na__LeVp3d__PixelSize(viewport, pixelsPerMm);
        if (state && state.key === key && state.dataUrl && (!state.px || state.px.w >= px.w * 0.8)) return Na__LeAssets__ToPngDataUrl(state.dataUrl);
        const slot = viewport.Viewport__SnapshotAsset;
        if (!Na__LeSnap__IsReady() && slot && slot.Asset__Fingerprint === key) return Na__LeAssets__ToPngDataUrl(await Na__LeAssets__Load(slot.Asset__Path));
        const result = await Na__LeSnap__Render3d(scene, viewport.Viewport__Styles, px.w, px.h);
        return result ? result.canvas.toDataURL('image/png') : null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Viewport 3D API
    // ------------------------------------------------------------
    export {
        Na__LeVp3d__Fingerprint,
        Na__LeVp3d__Fill,
        Na__LeVp3d__Release,
        Na__LeVp3d__SetInteracting,
        Na__LeVp3d__RenderForExport,
        Na__LeVp3d__Bake
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
