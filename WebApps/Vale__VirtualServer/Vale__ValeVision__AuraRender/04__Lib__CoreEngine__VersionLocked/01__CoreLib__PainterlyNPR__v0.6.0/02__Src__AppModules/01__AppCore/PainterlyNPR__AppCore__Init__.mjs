/* =============================================================================
   PAINTERLYNPR - APP CORE | INIT
   =============================================================================

   FILE       : PainterlyNPR__AppCore__Init__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : AppCore - Init
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Start PainterlyNPR: a WebGL 2 context on the sheet's canvas, every
                program compiled, the scene's vertex arrays, the targets, the
                interface wired, and the first drawing requested
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - The application's one entry module: the page loads it and nothing else
     imports it.
   - Starts itself once the document is parsed, as Experiment 01 did.
   - A context that cannot render to float targets shows the fallback card and
     stops; a failure while building shows its message there.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Boot
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : the scene is built and held by PainterlyNPR__ScenePackage__Load
                   (10); the panel is built from Na__Interface__Panel__Config.json
                   (80) before the interface is wired; the header's version is
                   written from the main config; v0.6.0 keeps the scene's vertex
                   buffer as Gpu.Buffers.Scene (a rebuilt scene uploads into it)
                   and builds the Assets drawer (82); otherwise none

   ============================================================================= */

import { PainterlyNPR__AppCore__State as State } from './PainterlyNPR__AppCore__State__.mjs';
import {
    PainterlyNPR__Engine__BASE_PX_PER_MM   as  BASE_PX_PER_MM,
    PainterlyNPR__Engine__ENGINE_VERSION   as  ENGINE_VERSION,
    PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
    PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM,
} from '../02__AppData/PainterlyNPR__AppData__Engine__.mjs';
import {
    PainterlyNPR__ScenePackage__Load,
    PainterlyNPR__ScenePackage__Scene  as  Scene,
} from '../10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
import { PainterlyNPR__RenderGraph__Request } from '../20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
import {
    PainterlyNPR__GpuResources__CreateShadowTarget,
    PainterlyNPR__GpuResources__Program,
    PainterlyNPR__GpuResources__SetScale,
    PainterlyNPR__GpuResources__Gpu  as  Gpu,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
import {
    PainterlyNPR__Shaders__VS_FULLSCREEN  as  VS_FULLSCREEN,
    PainterlyNPR__Shaders__VS_LINES       as  VS_LINES,
    PainterlyNPR__Shaders__VS_RIBBON      as  VS_RIBBON,
    PainterlyNPR__Shaders__VS_SCENE       as  VS_SCENE,
} from '../21__System__GpuResources/PainterlyNPR__GpuResources__SharedShaders__.mjs';
import {
    PainterlyNPR__GeometryBuffers__FS_GBUFFER  as  FS_GBUFFER,
    PainterlyNPR__GeometryBuffers__FS_PREVIEW  as  FS_PREVIEW,
} from '../22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Shaders__.mjs';
import { PainterlyNPR__LightAndShadow__FS_SHADOW as FS_SHADOW } from '../23__Pass__LightAndShadow/PainterlyNPR__LightAndShadow__Pass__.mjs';
import {
    PainterlyNPR__BoundaryDistance__FS_JFA_INIT  as  FS_JFA_INIT,
    PainterlyNPR__BoundaryDistance__FS_JFA_STEP  as  FS_JFA_STEP,
} from '../24__Pass__DerivedFields/PainterlyNPR__BoundaryDistance__Pass__.mjs';
import {
    PainterlyNPR__InkLayer__FS_LINES   as  FS_LINES,
    PainterlyNPR__InkLayer__FS_RIBBON  as  FS_RIBBON,
} from '../34__Stroke__InkCompositing/PainterlyNPR__InkLayer__Pass__.mjs';
import { PainterlyNPR__WashRegions__FS_REGIONS as FS_REGIONS } from '../51__Wash__RegionMasks/PainterlyNPR__WashRegions__Pass__.mjs';
import { PainterlyNPR__Watercolour__PackMaterials } from '../52__Wash__LayerStack/PainterlyNPR__Watercolour__Pass__.mjs';
import { PainterlyNPR__Paper__FS_PAPER as FS_PAPER } from '../55__Paper__Model/PainterlyNPR__Paper__Pass__.mjs';
import { PainterlyNPR__Compositor__FS_COMPOSITE as FS_COMPOSITE } from '../56__Paper__Compositor/PainterlyNPR__Compositor__Pass__.mjs';
import { PainterlyNPR__Kuwahara__Connect } from '../57__Wash__KuwaharaFilter/PainterlyNPR__Kuwahara__Host__.mjs';
import {
    PainterlyNPR__SkyClouds__Connect,
    PainterlyNPR__SkyClouds__WashSource,
} from '../60__Atmos__SkyAndClouds/PainterlyNPR__SkyClouds__Host__.mjs';
import { PainterlyNPR__ArtDirection__FS_FIELD as FS_FIELD } from '../66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__FieldShader__.mjs';
import {
    PainterlyNPR__CameraRig__ApplyPreset,
    PainterlyNPR__CameraRig__Compute,
} from '../70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
import { PainterlyNPR__Interface__SyncControls } from '../80__System__HudOverlay/PainterlyNPR__Interface__Controls__.mjs';
import {
    PainterlyNPR__Interface__Status,
    PainterlyNPR__Interface__Query  as  $,
} from '../80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
import { PainterlyNPR__Interface__BuildPanel } from '../80__System__HudOverlay/PainterlyNPR__Interface__Panel__.mjs';
import { PainterlyNPR__Interface__Wire } from '../80__System__HudOverlay/PainterlyNPR__Interface__Wire__.mjs';
import { PainterlyNPR__Interface__BuildGraph } from '../81__Hud__PassViewer/PainterlyNPR__Interface__GraphStrip__.mjs';
import { PainterlyNPR__Interface__BuildAssetDrawer } from '../82__Hud__AssetCatalogue/PainterlyNPR__Interface__AssetDrawer__.mjs';
import { PainterlyNPR__PassViewer__FS_VIEW as FS_VIEW } from '../81__Hud__PassViewer/PainterlyNPR__PassViewer__Shader__.mjs';

// =============================================================================
// REGION | Init
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Boot
// -----------------------------------------------------------------------------

    // FUNCTION | Start - context, programs, buffers, targets, default points, first render
    // ------------------------------------------------------------
    function PainterlyNPR__Boot__Start() {
        const canvas  =  document.getElementById('PainterlyNPR__App__Canvas');
        const gl      =  canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
        const fallback  =  document.getElementById('PainterlyNPR__App__Fallback');
        if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
            fallback.hidden  =  false;
            fallback.querySelector('[data-detail]').textContent  =  !gl ? 'This browser did not give the page a WebGL 2 context.' : 'WebGL 2 is here, but it cannot render to floating-point targets (EXT_color_buffer_float).';
            return;
        }
        Gpu.Gl       =  gl;
        Gpu.MaxSize  =  Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
        canvas.width   =  SHEET_WIDTH_MM * BASE_PX_PER_MM;
        canvas.height  =  SHEET_HEIGHT_MM * BASE_PX_PER_MM;

        try {
            PainterlyNPR__ScenePackage__Load();
            PainterlyNPR__Watercolour__PackMaterials();

            const P  =  Gpu.Programs;
            P.Shadow       =  PainterlyNPR__GpuResources__Program('Shadow map', VS_SCENE, FS_SHADOW);
            P.GBuffer      =  PainterlyNPR__GpuResources__Program('Truth buffers', VS_SCENE, FS_GBUFFER);
            P.Preview      =  PainterlyNPR__GpuResources__Program('Navigation preview', VS_FULLSCREEN, FS_PREVIEW);
            P.Field        =  PainterlyNPR__GpuResources__Program('Art direction field', VS_FULLSCREEN, FS_FIELD);
            P.Ribbon       =  PainterlyNPR__GpuResources__Program('Ink ribbons', VS_RIBBON, FS_RIBBON);
            P.Lines        =  PainterlyNPR__GpuResources__Program('Debug lines', VS_LINES, FS_LINES);
            P.Regions      =  PainterlyNPR__GpuResources__Program('Wash regions', VS_FULLSCREEN, FS_REGIONS);
            P.JfaInit      =  PainterlyNPR__GpuResources__Program('Jump flood seeds', VS_FULLSCREEN, FS_JFA_INIT);
            P.JfaStep      =  PainterlyNPR__GpuResources__Program('Jump flood step', VS_FULLSCREEN, FS_JFA_STEP);
            P.Paper        =  PainterlyNPR__GpuResources__Program('Paper', VS_FULLSCREEN, FS_PAPER);
            PainterlyNPR__SkyClouds__Connect(gl);                                // <-- Before the wash compiles: it takes the clouds' reading
            PainterlyNPR__Kuwahara__Connect(gl);                                 // <-- The Kuwahara module, if the page could load it
            P.Watercolour  =  PainterlyNPR__GpuResources__Program('Watercolour', VS_FULLSCREEN, PainterlyNPR__SkyClouds__WashSource());
            P.Composite    =  PainterlyNPR__GpuResources__Program('Compositor', VS_FULLSCREEN, FS_COMPOSITE);
            P.View         =  PainterlyNPR__GpuResources__Program('Pass viewer', VS_FULLSCREEN, FS_VIEW);

            // Vertex arrays: the scene (position, normal, ids), ribbons, debug lines, accent dabs, and an empty one for fullscreen passes
            const scene  =  gl.createBuffer();
            Gpu.Buffers.Scene  =  scene;                                     // <-- Kept: a scene rebuilt with placed assets uploads into it (v0.6.0)
            gl.bindBuffer(gl.ARRAY_BUFFER, scene);
            gl.bufferData(gl.ARRAY_BUFFER, Scene.Vertices, gl.STATIC_DRAW);
            Gpu.Vaos.Scene  =  gl.createVertexArray();
            gl.bindVertexArray(Gpu.Vaos.Scene);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
            gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
            gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
            Gpu.Buffers.Ribbons  =  gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Ribbons);
            Gpu.Vaos.Ribbons  =  gl.createVertexArray();
            gl.bindVertexArray(Gpu.Vaos.Ribbons);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 28, 0);
            gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 8);
            gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
            Gpu.Buffers.Debug  =  gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Debug);
            Gpu.Vaos.Debug  =  gl.createVertexArray();
            gl.bindVertexArray(Gpu.Vaos.Debug);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
            gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);
            Gpu.Buffers.Dabs  =  gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Dabs);
            Gpu.Vaos.Dabs  =  gl.createVertexArray();
            gl.bindVertexArray(Gpu.Vaos.Dabs);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
            gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);
            Gpu.Vaos.Empty  =  gl.createVertexArray();
            gl.bindVertexArray(null);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);

            Gpu.Targets.Shadow  =  PainterlyNPR__GpuResources__CreateShadowTarget();
            PainterlyNPR__GpuResources__SetScale(1);
            PainterlyNPR__CameraRig__ApplyPreset(State.CameraPreset);
            PainterlyNPR__CameraRig__Compute();
        } catch (error) {
            fallback.hidden  =  false;
            fallback.querySelector('[data-detail]').textContent  =  error.message;
            console.error(error);
            return;
        }

        PainterlyNPR__Interface__BuildPanel($('.PainterlyNPR__Panel'));               // <-- The panel, from Na__Interface__Panel__Config.json, before anything wires it
        PainterlyNPR__Interface__Wire();
        $('#PainterlyNPR__App__Version').textContent  =  'v' + ENGINE_VERSION;       // <-- The meta strip's version, from the main config
        PainterlyNPR__Interface__BuildGraph();
        PainterlyNPR__Interface__BuildAssetDrawer();                              // <-- The Assets drawer left of the sheet (82), closed until pulled out
        $('#PainterlyNPR__App__SceneCounts').textContent  =  `${Scene.Objects.length} objects, ${Scene.Edges.length} edges, ${Scene.Surfaces.length} surfaces`;

        // No Art Direction Points to begin with: the drawing starts as the scene and
        // the style make it, a blank slate for the art director (Adam's call)
        State.Points  =  [];

        PainterlyNPR__Interface__SyncControls();
        PainterlyNPR__Interface__Status('Building the first drawing …');
        PainterlyNPR__RenderGraph__Request('Navigate');
    }
    // ------------------------------------------------------------


    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', PainterlyNPR__Boot__Start);
    else PainterlyNPR__Boot__Start();

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
