/* =============================================================================
   PAINTERLYNPR - EXPORT | ASSET FACTORY
   =============================================================================

   FILE       : PainterlyNPR__AssetFactory__Run__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : Export - AssetFactory - Run
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : The rendering environment factory: each library asset drawn alone in
                the catalogue environment, as its proxy (PXY) and as pen and wash
                (RND), with its three.js model (MOD) and its measured bounds,
                written into its own folder in the library
   CREATED    : 30-Oct-2026 (v0.6.0)

   DESCRIPTION:
   - Adam, 30-Oct-2026: "Create a rendering enviroment factory for capturing
     consitent asset thumbnails in both rendered and proxy from".
   - Consistent by construction: the stage (16) holds the asset alone as
     authored on a disc of ground; the style is the app's starting state with a
     fixed seed, the default sun and a sky left as paper; the camera is a fixed
     three-quarter view fitted to the asset's bounding sphere. Whatever the sheet
     held, the same asset gives the same pictures.
   - It draws in the app, on the sheet, so its work is seen; the drawing on the
     sheet - state, scene and work mode - is put back exactly when it is done.
   - It writes only through the local server (POST /api/assets/<Id>/<Slot>),
     into the asset's own folder; DAT gains only its Geometry bounds and its
     Factory record.

   ============================================================================= */

import FactoryConfig from './Na__AssetFactory__Config.json' with { type: 'json' };
import { PainterlyNPR__ConfigAccess__Section } from '../03__AppUtils/PainterlyNPR__AppUtils__ConfigAccess__.mjs';
import {
    PainterlyNPR__AppCore__DefaultState,
    PainterlyNPR__AppCore__State  as  State,
} from '../01__AppCore/PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__DEG             as  DEG,
    PainterlyNPR__Engine__ENGINE_VERSION  as  ENGINE_VERSION,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__ScenePackage__Upload,
    PainterlyNPR__ScenePackage__Use,
    PainterlyNPR__ScenePackage__Scene  as  Scene,
} from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import { PainterlyNPR__AssetLibrary__BuildStage } from '../16__Scene__AssetLibrary/PainterlyNPR__AssetLibrary__Placement__.mjs';
import {
    PainterlyNPR__RenderGraph__NextFrame,
    PainterlyNPR__RenderGraph__Request,
    PainterlyNPR__RenderGraph__RunAll,
    PainterlyNPR__RenderGraph__Graph     as  Graph,
    PainterlyNPR__RenderGraph__Versions  as  Versions,
} from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import {
    PainterlyNPR__GpuResources__CreateTarget,
    PainterlyNPR__GpuResources__DisposeTarget,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import { PainterlyNPR__GeometryBuffers__Preview } from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Pass__.mjs';
import { PainterlyNPR__Interface__Status } from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__PassViewer__Present } from '../81__Hud__PassViewer/PainterlyNPR__PassViewer__Views__.mjs';
import { PainterlyNPR__AssetFactory__Glb } from './PainterlyNPR__AssetFactory__Glb__.mjs';

// =============================================================================
// REGION | Asset Factory - Run
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Config
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | The Config - Na__AssetFactory__Config.json
    // ------------------------------------------------------------
    // Each section a copy, every key read below checked as it is taken.
    const STYLE     =  PainterlyNPR__ConfigAccess__Section(FactoryConfig, 'PainterlyNPR__AssetFactory__Config', 'Style', ['Seed', 'Sun', 'Sky']);
    const CAMERA    =  PainterlyNPR__ConfigAccess__Section(FactoryConfig, 'PainterlyNPR__AssetFactory__Config', 'Camera', ['Yaw', 'Pitch', 'FovY', 'Fill', 'HalfHeight', 'Ceiling']);
    const PICTURES  =  PainterlyNPR__ConfigAccess__Section(FactoryConfig, 'PainterlyNPR__AssetFactory__Config', 'Pictures', ['SizePx', 'Type', 'Quality', 'Api']);
    // ------------------------------------------------------------


    // MODULE STATE | One Run at a Time
    // ------------------------------------------------------------
    const Factory  =  { Running: false };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pictures and Uploads
// -----------------------------------------------------------------------------

    // FUNCTION | A Target's Centre Square as a WebP Blob, Scaled to the Picture Size
    // ------------------------------------------------------------
    async function PainterlyNPR__AssetFactory__Picture(target) {
        const gl    =  Gpu.Gl;
        const side  =  Math.min(target.Width, target.Height);
        const x0    =  Math.round((target.Width - side) / 2), y0 = Math.round((target.Height - side) / 2);
        const px    =  new Uint8Array(side * side * 4);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, target.Fbo);
        gl.readPixels(x0, y0, side, side, gl.RGBA, gl.UNSIGNED_BYTE, px);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        for (let i = 3; i < px.length; i += 4) px[i] = 255;                   // <-- Opaque paper: no pixel of a thumbnail is see-through
        const full  =  document.createElement('canvas');
        full.width = side; full.height = side;
        const image  =  full.getContext('2d').createImageData(side, side);
        for (let y = 0; y < side; y++) image.data.set(px.subarray((side - 1 - y) * side * 4, (side - y) * side * 4), y * side * 4);
        full.getContext('2d').putImageData(image, 0, 0);
        const out  =  document.createElement('canvas');
        out.width = PICTURES.SizePx; out.height = PICTURES.SizePx;
        const g  =  out.getContext('2d');
        g.imageSmoothingQuality  =  'high';
        g.drawImage(full, 0, 0, PICTURES.SizePx, PICTURES.SizePx);
        return new Promise((resolve, reject) => out.toBlob(blob => (blob ? resolve(blob) : reject(new Error('the picture did not encode'))), PICTURES.Type, PICTURES.Quality));
    }
    // ------------------------------------------------------------


    // FUNCTION | Write One File Into an Asset's Folder Through the Local Server
    // ------------------------------------------------------------
    async function PainterlyNPR__AssetFactory__Post(assetId, slot, body, type) {
        const response  =  await fetch(`${PICTURES.Api}/${encodeURIComponent(assetId)}/${slot}`, { method: 'POST', headers: { 'Content-Type': type }, body: body });
        const answer    =  await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`${slot}: ${answer.Error || response.status}`);
        return answer;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Factory
// -----------------------------------------------------------------------------

    // FUNCTION | Render One Asset on the Stage, and Write Its Pictures, Model and Record
    // ------------------------------------------------------------
    async function PainterlyNPR__AssetFactory__RenderOne(asset) {
        const stage  =  PainterlyNPR__AssetLibrary__BuildStage(asset);
        PainterlyNPR__ScenePackage__Use(stage.Package);
        PainterlyNPR__ScenePackage__Upload();
        const b       =  stage.Bounds;
        const centre  =  [0, 1, 2].map(k => Math.round((b.Min[k] + b.Max[k]) * 500) / 1000);
        const across  =  Math.hypot(b.Size[0], b.Size[2]);
        const half    =  Math.max(b.Size[1], across * 0.85) / 2;                // <-- The picture is square: the taller of its height and its spread (as seen turned) fills it
        const camera  =  { Mode: 'Perspective', Yaw: CAMERA.Yaw, Pitch: CAMERA.Pitch, Distance: Math.round((half / Math.tan(CAMERA.FovY / 2 * DEG) / CAMERA.Fill + across / 2) * 1000) / 1000, Target: centre, FovY: CAMERA.FovY, HalfHeight: CAMERA.HalfHeight, Ceiling: CAMERA.Ceiling };
        State.Camera        =  Object.assign({}, camera);
        State.CameraPreset  =  'Custom';
        for (const key of Object.keys(Versions)) if (key !== 'Size') Versions[key]++;
        PainterlyNPR__RenderGraph__RunAll();
        PainterlyNPR__PassViewer__Present();                                   // <-- Seen on the sheet as it is made
        const rendered  =  await PainterlyNPR__AssetFactory__Picture(Gpu.Targets.Composite);
        const temp      =  PainterlyNPR__GpuResources__CreateTarget('Asset factory proxy', Gpu.Width, Gpu.Height, ['RGBA8'], false);
        PainterlyNPR__GeometryBuffers__Preview(temp);
        const proxy     =  await PainterlyNPR__AssetFactory__Picture(temp);
        PainterlyNPR__GpuResources__DisposeTarget(temp);
        const model     =  PainterlyNPR__AssetFactory__Glb(stage, asset);
        await PainterlyNPR__AssetFactory__Post(asset.AssetId, 'RND', rendered, PICTURES.Type);
        await PainterlyNPR__AssetFactory__Post(asset.AssetId, 'PXY', proxy, PICTURES.Type);
        await PainterlyNPR__AssetFactory__Post(asset.AssetId, 'MOD', model, 'model/gltf-binary');
        const now  =  new Date();
        const record  =  {
            Sections : {
                Geometry : { Bounds: b },
                Factory  : { Status: 'Rendered', RenderedOn: now.toISOString().slice(0, 19), EngineVersion: ENGINE_VERSION, StageVersion: stage.StageVersion, Camera: camera, ThumbnailPx: PICTURES.SizePx },
            },
            Present  : ['RND', 'PXY', 'MOD'],
        };
        await PainterlyNPR__AssetFactory__Post(asset.AssetId, 'DAT', JSON.stringify(record), 'application/json');
    }
    // ------------------------------------------------------------


    // FUNCTION | Run the Factory Over Some Assets - then put the drawing back
    // ------------------------------------------------------------
    // progress(i, n, asset) is called before each. While it runs the graph is
    // held in the Proxy work mode, so a stray request only previews and never
    // starts a refinement against the stage. Returns { Done, Failed, Message }.
    async function PainterlyNPR__AssetFactory__Run(assets, progress) {
        if (Factory.Running) return { Done: 0, Failed: [], Message: 'The factory is already running.' };
        try {
            const probe  =  await fetch(PICTURES.Api, { cache: 'no-store' });
            if (!probe.ok) throw new Error(String(probe.status));
        } catch (error) {
            return { Done: 0, Failed: [], Message: 'The factory writes through the local server, and this one has no /api/assets: start the app with Start__PainterlyNPR__Localhost__8060__.bat (restart it if it was running before v0.6.0).' };
        }
        Factory.Running  =  true;
        const saved  =  { State: Object.assign({}, State), Scene: Scene, Proxy: Graph.Proxy };   // <-- The drawing's own objects, kept by reference: the factory only ever replaces keys with new ones, never edits these
        Graph.Proxy  =  true;
        Graph.Token++;
        await PainterlyNPR__RenderGraph__NextFrame();
        const fresh  =  PainterlyNPR__AppCore__DefaultState();
        for (const key of Object.keys(fresh)) State[key] = fresh[key];
        State.Seed    =  STYLE.Seed;
        Object.assign(State.Sun, STYLE.Sun);
        Object.assign(State.Sky, STYLE.Sky);
        State.Points  =  [];
        State.Assets  =  [];
        const failed  =  [];
        let done  =  0;
        try {
            for (const [i, asset] of assets.entries()) {
                if (progress) progress(i, assets.length, asset);
                PainterlyNPR__Interface__Status(`Asset factory - ${asset.AssetId} ${asset.Identity.DisplayName} (${i + 1} of ${assets.length}) …`);
                try { await PainterlyNPR__AssetFactory__RenderOne(asset); done++; }
                catch (error) { failed.push(`${asset.AssetId} (${error.message})`); console.error('[PainterlyNPR AssetFactory]', asset.AssetId, error); }
                await PainterlyNPR__RenderGraph__NextFrame();
            }
        } finally {
            for (const key of Object.keys(State)) if (!(key in saved.State)) delete State[key];
            for (const key of Object.keys(saved.State)) State[key] = saved.State[key];
            PainterlyNPR__ScenePackage__Use(saved.Scene);
            PainterlyNPR__ScenePackage__Upload();
            Graph.Proxy  =  saved.Proxy;
            for (const key of Object.keys(Versions)) if (key !== 'Size') Versions[key]++;
            Factory.Running  =  false;
            PainterlyNPR__RenderGraph__Request('Navigate');
        }
        const message  =  `Asset factory: ${done} of ${assets.length} rendered and written` + (failed.length ? `; failed - ${failed.join('; ')}` : '.');
        PainterlyNPR__Interface__Status(message);
        return { Done: done, Failed: failed, Message: message };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__AssetFactory__Run,
        Factory  as  PainterlyNPR__AssetFactory__Factory,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
