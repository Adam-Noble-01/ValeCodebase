// =============================================================================
// VALEVISION AURA - ENGINE HOST - PAINTERLYNPR (THE CORE LIBRARY)
// =============================================================================
//
// FILE       : Na__EngineHost__PainterlyNpr__.js
// NAMESPACE  : Na__EngineHost
// MODULE     : Engine Host - PainterlyNPR
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : The one door between AURA and its core library, Adam's PainterlyNPR
//              pen and wash renderer: boot it on AURA's canvas, move its camera,
//              set its parameters, and draw stills for the sheets' viewports
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE ENGINE IS NOT AURA'S CODE. It is a pinned copy of PainterlyNPR's
//   02__Src__AppModules (04__Lib__CoreEngine__VersionLocked, reached through the
//   import map's "PainterlyNPR/" prefix in index.html). Nothing in AURA edits
//   it, and nothing of it is copied into AURA (Adam, 30-Oct-2026: "dont
//   duplicate code the npr repo remains definitive source"): a change goes
//   into PainterlyNPR, then a sync brings the new version. Only this folder
//   imports from it: this module, Na__EngineHost__Panel__ (the engine's panel
//   config, its menus and paper), Na__EngineHost__Assets__ (its Assets
//   drawer, placed assets and given materials) and Na__EngineHost__Dump__
//   (everything it holds, read only, for the parameter dump).
// - BOOT is PainterlyNPR's own AppCore Init (region Boot) without its panel,
//   graph strip and header: the same context options, programs, vertex arrays,
//   targets and first request. When the engine's Init changes, this boot is
//   read against it (the sync script says so). This seam moves into
//   PainterlyNPR as 07__System__LibraryHost once Noble Architecture's wrapper
//   needs it too (Adam, 30-Oct-2026).
// - THE ENGINE'S INTERFACE MODULES ARE STILL IN ITS GRAPH: its render graph
//   reports to them (status line, graph nodes, point overlay, view badge).
//   They are given somewhere to write: Ui.Status is AURA's status line, the
//   point layer is a detached element until the 3D Environment hands over its
//   real one (AttachPoints), and two hidden stand-ins carry the ids the view
//   badge looks up.
// - ART DIRECTION POINTS are edited with the engine's own editor (its handles,
//   rings, node of sliders and list), one set a view: a saved view's, the 3D
//   Environment's unsaved view's, or a sheet viewport's. A still draws with
//   its view's points; a viewport being edited on its sheet borrows the live
//   engine (Borrow, Release).
// - STILLS (Na__EngineHost__RenderStill) are PainterlyNPR's PNG export, kept in
//   memory: the camera swapped in, the whole graph run at a scale, the
//   compositor read back, everything put back. The engine's sheet is A3, 420
//   x 297 mm since PainterlyNPR 0.8.3 (read here from the engine, never set:
//   SheetMm), and every pen width is millimetres on it, so an orthographic
//   still with a half-height of (sheet height x scale / 2000) metres is a
//   true-scale drawing whose pen widths are true on the paper (1:50 on A3 is a
//   7.425 m half-height, the engine's own measured elevation).
// - POINTS FROM ANOTHER SHEET (RefitPoints): a drawing set placed its points
//   on the sheet the engine had then; the engine's own RefitPoints moves them
//   to stand over the same part of the drawing on today's.
// - ONE ENGINE A PAGE: its state, GPU and camera are module singletons, so the
//   3D Environment and every viewport share it, one render at a time.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.6.0 (AURA 0.4.3)
// - The engine's sheet is A3 (PainterlyNPR 0.8.3; Adam: the line work must
//   look as it would printed at scale): Na__EngineHost__RefitPoints hands the
//   engine's RefitPoints to the drawing set, through the module's namespace so
//   a pin from before the seam still loads (and leaves points as they are).
//
// 30-Oct-2026 - Version 1.5.0 (AURA 0.4.0)
// - The folder is the door: Na__EngineHost__Assets__ mounts the engine's own
//   Assets drawer, and Na__EngineHost__Panel__ reads its panel config.
// - Settings keeps Assets and Materials (when there are any) and
//   ApplySettings puts them back whole, the scene rebuilt by the engine
//   (Na__EngineHost__Assets__); Notify is exported for the folder's modules.
//
// 30-Oct-2026 - Version 1.4.0 (AURA 0.3.0)
// - Art Direction Points (region of that name): the engine's own point
//   editor (65__ArtDirection__InfluencePoints: its handles, rings and node of
//   sliders over the drawing, its list) given a real layer and list by AURA,
//   one set of points a view put in and taken out, placing a point as the
//   engine's sheet does, its keys, and the live engine lent to a sheet's
//   viewport while that viewport's points are edited (Borrow, Release).
// - RenderStill takes a view's points (request.points) and draws without
//   Show influence; the overlay sits the still out.
//
// 30-Oct-2026 - Version 1.3.0 (AURA 0.2.2)
// - WorkMode and SetWorkMode: the live view's Rendered / Proxy switch, the
//   engine's own (RenderGraph SetProxy, v0.6.0), for the 3D tab's toggle.
//
// 30-Oct-2026 - Version 1.2.0 (AURA 0.2.0)
// - Synced to PainterlyNPR v0.6.0 (e28fba5). Boot keeps the scene's vertex
//   buffer as Gpu.Buffers.Scene, as the engine's Init now does; the Assets
//   drawer Init builds is the engine app's own, not AURA's.
//
// 30-Oct-2026 - Version 1.1.0 (AURA 0.1.3)
// - AttachNavigation: the engine's navigation (PainterlyNPR v0.5.4,
//   74__Camera__Navigation) on a host element. Needs the engine synced past
//   v0.5.0: the import is from that new folder.
//
// 30-Oct-2026 - Version 1.0.0
// - Initial build against PainterlyNPR v0.5.0 (29bbcf1).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports - the Core Library (PainterlyNPR, pinned)
// -----------------------------------------------------------------------------

    import { PainterlyNPR__AppCore__State as State } from 'PainterlyNPR/01__AppCore/PainterlyNPR__AppCore__State__.mjs';
    import {
        PainterlyNPR__Engine__BASE_PX_PER_MM   as  BASE_PX_PER_MM,
        PainterlyNPR__Engine__ENGINE_VERSION   as  ENGINE_VERSION,
        PainterlyNPR__Engine__MAX_POINTS       as  MAX_POINTS,
        PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
        PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM
    } from 'PainterlyNPR/02__AppData/PainterlyNPR__AppData__Engine__.mjs';
    import { PainterlyNPR__SeededRandom__MintSeed, PainterlyNPR__SeededRandom__DeriveSeed } from 'PainterlyNPR/03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
    import { PainterlyNPR__ScenePackage__Load, PainterlyNPR__ScenePackage__Scene as Scene } from 'PainterlyNPR/10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
    import {
        PainterlyNPR__RenderGraph__Bump,
        PainterlyNPR__RenderGraph__Request,
        PainterlyNPR__RenderGraph__RunAll,
        PainterlyNPR__RenderGraph__SetProxy,
        PainterlyNPR__RenderGraph__Graph  as  Graph
    } from 'PainterlyNPR/20__System__RenderGraph/PainterlyNPR__RenderGraph__Graph__.mjs';
    import {
        PainterlyNPR__GpuResources__CreateShadowTarget,
        PainterlyNPR__GpuResources__Program,
        PainterlyNPR__GpuResources__SetScale,
        PainterlyNPR__GpuResources__Gpu  as  Gpu
    } from 'PainterlyNPR/21__System__GpuResources/PainterlyNPR__GpuResources__Core__.mjs';
    import {
        PainterlyNPR__Shaders__VS_FULLSCREEN  as  VS_FULLSCREEN,
        PainterlyNPR__Shaders__VS_LINES       as  VS_LINES,
        PainterlyNPR__Shaders__VS_RIBBON      as  VS_RIBBON,
        PainterlyNPR__Shaders__VS_SCENE       as  VS_SCENE
    } from 'PainterlyNPR/21__System__GpuResources/PainterlyNPR__GpuResources__SharedShaders__.mjs';
    import {
        PainterlyNPR__GeometryBuffers__FS_GBUFFER  as  FS_GBUFFER,
        PainterlyNPR__GeometryBuffers__FS_PREVIEW  as  FS_PREVIEW
    } from 'PainterlyNPR/22__Pass__GeometryBuffers/PainterlyNPR__GeometryBuffers__Shaders__.mjs';
    import { PainterlyNPR__LightAndShadow__FS_SHADOW as FS_SHADOW } from 'PainterlyNPR/23__Pass__LightAndShadow/PainterlyNPR__LightAndShadow__Pass__.mjs';
    import {
        PainterlyNPR__BoundaryDistance__FS_JFA_INIT  as  FS_JFA_INIT,
        PainterlyNPR__BoundaryDistance__FS_JFA_STEP  as  FS_JFA_STEP
    } from 'PainterlyNPR/24__Pass__DerivedFields/PainterlyNPR__BoundaryDistance__Pass__.mjs';
    import { PainterlyNPR__MaterialClasses__MATERIAL_CLASSES as MATERIAL_CLASSES } from 'PainterlyNPR/13__Scene__MaterialClasses/PainterlyNPR__MaterialClasses__Table__.mjs';
    import { PainterlyNPR__InkLayer__INK_FAMILIES as INK_FAMILIES } from 'PainterlyNPR/34__Stroke__InkCompositing/PainterlyNPR__InkLayer__InkFamilies__.mjs';
    import {
        PainterlyNPR__InkLayer__FS_LINES   as  FS_LINES,
        PainterlyNPR__InkLayer__FS_RIBBON  as  FS_RIBBON
    } from 'PainterlyNPR/34__Stroke__InkCompositing/PainterlyNPR__InkLayer__Pass__.mjs';
    import { PainterlyNPR__WashRegions__FS_REGIONS as FS_REGIONS } from 'PainterlyNPR/51__Wash__RegionMasks/PainterlyNPR__WashRegions__Pass__.mjs';
    import { PainterlyNPR__Watercolour__PackMaterials } from 'PainterlyNPR/52__Wash__LayerStack/PainterlyNPR__Watercolour__Pass__.mjs';
    import { PainterlyNPR__Paper__FS_PAPER as FS_PAPER } from 'PainterlyNPR/55__Paper__Model/PainterlyNPR__Paper__Pass__.mjs';
    import { PainterlyNPR__Paper__PAPER_PRESETS as PAPER_PRESETS } from 'PainterlyNPR/55__Paper__Model/PainterlyNPR__Paper__Presets__.mjs';
    import { PainterlyNPR__Compositor__FS_COMPOSITE as FS_COMPOSITE } from 'PainterlyNPR/56__Paper__Compositor/PainterlyNPR__Compositor__Pass__.mjs';
    import { PainterlyNPR__Kuwahara__Connect } from 'PainterlyNPR/57__Wash__KuwaharaFilter/PainterlyNPR__Kuwahara__Host__.mjs';
    import { PainterlyNPR__SkyClouds__Connect, PainterlyNPR__SkyClouds__WashSource } from 'PainterlyNPR/60__Atmos__SkyAndClouds/PainterlyNPR__SkyClouds__Host__.mjs';
    import {
        PainterlyNPR__ArtDirection__AnchorAt,
        PainterlyNPR__ArtDirection__MakePoint,
        PainterlyNPR__ArtDirection__INDICATED_MATERIALS  as  INDICATED_MATERIALS,
        PainterlyNPR__ArtDirection__POINT_TYPES          as  POINT_TYPES
    } from 'PainterlyNPR/65__ArtDirection__InfluencePoints/PainterlyNPR__ArtDirection__Points__.mjs';
    import * as PainterlyNPR__Points from 'PainterlyNPR/65__ArtDirection__InfluencePoints/PainterlyNPR__ArtDirection__Points__.mjs';   // <-- RefitPoints (0.8.3 on) by name at call time: a missing named import would stop the whole page on an older pin
    import {
        PainterlyNPR__Interface__DuplicatePoint,
        PainterlyNPR__Interface__PointById,
        PainterlyNPR__Interface__PointChanged,
        PainterlyNPR__Interface__RemovePoint,
        PainterlyNPR__Interface__SelectPoint,
        PainterlyNPR__Interface__SetPointValue,
        PainterlyNPR__Interface__TogglePoint
    } from 'PainterlyNPR/65__ArtDirection__InfluencePoints/PainterlyNPR__Interface__PointControls__.mjs';
    import { PainterlyNPR__Interface__RenderPointList } from 'PainterlyNPR/65__ArtDirection__InfluencePoints/PainterlyNPR__Interface__PointList__.mjs';
    import { PainterlyNPR__Interface__UpdateOverlay } from 'PainterlyNPR/65__ArtDirection__InfluencePoints/PainterlyNPR__Interface__PointOverlay__.mjs';
    import { PainterlyNPR__ArtDirection__FS_FIELD as FS_FIELD } from 'PainterlyNPR/66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__FieldShader__.mjs';
    import {
        PainterlyNPR__CameraRig__ApplyPreset,
        PainterlyNPR__CameraRig__Compute,
        PainterlyNPR__CameraRig__Orbit,
        PainterlyNPR__CameraRig__Zoom
    } from 'PainterlyNPR/70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
    import { PainterlyNPR__CameraRig__CAMERA_PRESETS as CAMERA_PRESETS } from 'PainterlyNPR/70__Camera__ViewTypes/PainterlyNPR__CameraRig__Presets__.mjs';
    import { PainterlyNPR__Navigation__Attach } from 'PainterlyNPR/74__Camera__Navigation/PainterlyNPR__Navigation__OrbitMode__.mjs';
    import {
        PainterlyNPR__Interface__Get,
        PainterlyNPR__Interface__Set,
        PainterlyNPR__Interface__Ui  as  Ui
    } from 'PainterlyNPR/80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
    import { PainterlyNPR__Interface__CONTROLS as CONTROLS } from 'PainterlyNPR/80__System__HudOverlay/PainterlyNPR__Interface__Controls__.mjs';
    import { PainterlyNPR__Interface__SheetMm } from 'PainterlyNPR/80__System__HudOverlay/PainterlyNPR__Interface__CameraControls__.mjs';
    import { PainterlyNPR__TypeIn__Wire } from 'PainterlyNPR/80__System__HudOverlay/PainterlyNPR__Interface__TypeIn__.mjs';
    import ControlsConfig from 'PainterlyNPR/80__System__HudOverlay/Na__Interface__Controls__Config.json' with { type: 'json' };
    import { PainterlyNPR__PassViewer__FS_VIEW as FS_VIEW } from 'PainterlyNPR/81__Hud__PassViewer/PainterlyNPR__PassViewer__Shader__.mjs';
    import { Na__Format__ParseReadout } from '../03__AppUtils/Na__AppUtils__Format__.js';
    import { Na__EngineHost__AssetsSettings, Na__EngineHost__AssetsFromSettings } from './Na__EngineHost__Assets__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__EngineHost__State = {
        booted     : false,
        canvas     : null,
        busy       : false,                      // <-- A still is being drawn: the live view waits
        listeners  : [],                         // <-- Told when the engine's settings change: (reason) => {}
        onPoints   : null,                       // <-- Told when the points were edited (the 3D Environment saves them)
        borrowed   : null,                       // <-- While a sheet's viewport has the live engine: what to put back
        pointsTick : 0,                          // <-- One edited-points call a frame, however many events
        listHome   : null                        // <-- Where the engine's point list lives when no sheet has borrowed it
    };

    // MODULE CONSTANTS | The Engine's Own Stylesheets for Its Point Editor, in Its Cascade Order
    // ------------------------------------------------------------
    // Reached through the import map, so they follow each engine sync.
    // ------------------------------------------------------------
    const Na__EngineHost__POINT_STYLES = [
        'PainterlyNPR/65__ArtDirection__InfluencePoints/PainterlyNPR__ArtDirection__Styles__PointHandles__.css',
        'PainterlyNPR/65__ArtDirection__InfluencePoints/PainterlyNPR__ArtDirection__Styles__PointNode__.css',
        'PainterlyNPR/65__ArtDirection__InfluencePoints/PainterlyNPR__ArtDirection__Styles__PointGroups__.css'
    ];

    // MODULE CONSTANTS | The Settings AURA Keeps (everything a render depends on, except the camera and points)
    // ------------------------------------------------------------
    const Na__EngineHost__SETTING_KEYS = ['Seed', 'Sun', 'Discipline', 'InkFamily', 'LineWeight', 'Pen', 'PenPreset', 'Wash', 'Sky',
                                          'Kuwahara', 'Indication', 'Paper', 'Composition'];
    const Na__EngineHost__ALL_INPUTS  = ['Seed', 'Sun', 'Discipline', 'Lines', 'Indication', 'ShadowLines', 'Wash', 'Sky', 'Paper',
                                          'Finish', 'Composition', 'ArtDirection', 'Kuwahara'];
    const Na__EngineHost__CONTROL_SPECS = ControlsConfig.PainterlyNPR__InterfaceControls__Config.PainterlyNPR__InterfaceControls__Config__Controls.Controls;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Boot
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Give the Engine's Interface Modules Somewhere to Write
    // ------------------------------------------------------------
    // PainterlyNPR's render graph reports to its own panel. AURA has none of that
    // panel, so the status line is AURA's, the point layer a detached element, and
    // the view badge two hidden stand-ins carrying the ids it looks up.
    // ------------------------------------------------------------
    function Na__EngineHost__Stand(canvas, statusElement) {
        Ui.Canvas = canvas;
        Ui.Points = document.createElement('div');
        Ui.Points.hidden = true;
        Ui.Status = statusElement || null;
        Ui.ActiveTab = 'Scene';
        if (!document.getElementById('PainterlyNPR__App__ViewBadge')) {
            const badge = document.createElement('div');
            badge.id = 'PainterlyNPR__App__ViewBadge';
            badge.hidden = true;
            badge.setAttribute('aria-hidden', 'true');
            const name = document.createElement('strong');
            name.id = 'PainterlyNPR__App__ViewName';
            badge.appendChild(name);
            document.body.appendChild(badge);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Boot the Engine on AURA's Canvas: { ok, error }
    // ------------------------------------------------------------
    // PainterlyNPR's AppCore Init, region Boot, without its panel: the same
    // WebGL 2 options, the same programs in the same order, the same vertex
    // arrays and targets, then the first navigation request.
    // ------------------------------------------------------------
    function Na__EngineHost__Boot(canvas, statusElement, settings) {
        if (Na__EngineHost__State.booted) return { ok: true };
        const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
        if (!gl) return { ok: false, error: 'This browser did not give the page a WebGL 2 context.' };
        if (!gl.getExtension('EXT_color_buffer_float')) return { ok: false, error: 'WebGL 2 is here, but it cannot render to floating-point targets (EXT_color_buffer_float).' };
        Gpu.Gl      = gl;
        Gpu.MaxSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
        canvas.width  = SHEET_WIDTH_MM * BASE_PX_PER_MM;
        canvas.height = SHEET_HEIGHT_MM * BASE_PX_PER_MM;
        Na__EngineHost__Stand(canvas, statusElement);

        try {
            PainterlyNPR__ScenePackage__Load();
            PainterlyNPR__Watercolour__PackMaterials();

            const P = Gpu.Programs;
            P.Shadow      = PainterlyNPR__GpuResources__Program('Shadow map', VS_SCENE, FS_SHADOW);
            P.GBuffer     = PainterlyNPR__GpuResources__Program('Truth buffers', VS_SCENE, FS_GBUFFER);
            P.Preview     = PainterlyNPR__GpuResources__Program('Navigation preview', VS_FULLSCREEN, FS_PREVIEW);
            P.Field       = PainterlyNPR__GpuResources__Program('Art direction field', VS_FULLSCREEN, FS_FIELD);
            P.Ribbon      = PainterlyNPR__GpuResources__Program('Ink ribbons', VS_RIBBON, FS_RIBBON);
            P.Lines       = PainterlyNPR__GpuResources__Program('Debug lines', VS_LINES, FS_LINES);
            P.Regions     = PainterlyNPR__GpuResources__Program('Wash regions', VS_FULLSCREEN, FS_REGIONS);
            P.JfaInit     = PainterlyNPR__GpuResources__Program('Jump flood seeds', VS_FULLSCREEN, FS_JFA_INIT);
            P.JfaStep     = PainterlyNPR__GpuResources__Program('Jump flood step', VS_FULLSCREEN, FS_JFA_STEP);
            P.Paper       = PainterlyNPR__GpuResources__Program('Paper', VS_FULLSCREEN, FS_PAPER);
            PainterlyNPR__SkyClouds__Connect(gl);                                // <-- Before the wash compiles: it takes the clouds' reading
            PainterlyNPR__Kuwahara__Connect(gl);
            P.Watercolour = PainterlyNPR__GpuResources__Program('Watercolour', VS_FULLSCREEN, PainterlyNPR__SkyClouds__WashSource());
            P.Composite   = PainterlyNPR__GpuResources__Program('Compositor', VS_FULLSCREEN, FS_COMPOSITE);
            P.View        = PainterlyNPR__GpuResources__Program('Pass viewer', VS_FULLSCREEN, FS_VIEW);

            // Vertex arrays: the scene (position, normal, ids), ribbons, debug lines, accent dabs, and an empty one for fullscreen passes
            const scene = gl.createBuffer();
            Gpu.Buffers.Scene = scene;                                             // <-- As the engine's Init since v0.6.0: a scene rebuilt with placed assets uploads into it
            gl.bindBuffer(gl.ARRAY_BUFFER, scene);
            gl.bufferData(gl.ARRAY_BUFFER, Scene.Vertices, gl.STATIC_DRAW);
            Gpu.Vaos.Scene = gl.createVertexArray();
            gl.bindVertexArray(Gpu.Vaos.Scene);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
            gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
            gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
            Gpu.Buffers.Ribbons = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Ribbons);
            Gpu.Vaos.Ribbons = gl.createVertexArray();
            gl.bindVertexArray(Gpu.Vaos.Ribbons);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 28, 0);
            gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 8);
            gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
            Gpu.Buffers.Debug = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Debug);
            Gpu.Vaos.Debug = gl.createVertexArray();
            gl.bindVertexArray(Gpu.Vaos.Debug);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
            gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);
            Gpu.Buffers.Dabs = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, Gpu.Buffers.Dabs);
            Gpu.Vaos.Dabs = gl.createVertexArray();
            gl.bindVertexArray(Gpu.Vaos.Dabs);
            gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
            gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);
            Gpu.Vaos.Empty = gl.createVertexArray();
            gl.bindVertexArray(null);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);

            Gpu.Targets.Shadow = PainterlyNPR__GpuResources__CreateShadowTarget();
            PainterlyNPR__GpuResources__SetScale(1);
            PainterlyNPR__CameraRig__ApplyPreset(State.CameraPreset);
            PainterlyNPR__CameraRig__Compute();
        } catch (error) {
            console.error('[AURA EngineHost] Boot failed:', error);
            return { ok: false, error: error.message || String(error) };
        }

        State.Points = [];                                                       // <-- No Art Direction Points to begin with (PainterlyNPR's own start)
        if (settings) Na__EngineHost__ApplySettings(settings, true);
        Na__EngineHost__State.booted = true;
        Na__EngineHost__State.canvas = canvas;
        PainterlyNPR__RenderGraph__Request('Navigate');
        return { ok: true };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Engine at a Glance
// -----------------------------------------------------------------------------

    // FUNCTION | Version, Sheet, Scene Counts and the Building's Bounds
    // ------------------------------------------------------------
    function Na__EngineHost__Version() { return ENGINE_VERSION; }

    function Na__EngineHost__SheetMm() {
        return { WidthMm: SHEET_WIDTH_MM, HeightMm: SHEET_HEIGHT_MM, PxPerMm: BASE_PX_PER_MM };
    }
    // ------------------------------------------------------------


    // FUNCTION | Points Placed on Another Sheet, Moved Onto the Engine's (copies)
    // ------------------------------------------------------------
    // fromSheetMm: [width, height] of the sheet they were placed on; null for
    // the engine's previous sheet (everything before A3). trueScale: a view
    // whose half-height comes from the sheet and a scale (an elevation, the
    // roof plan), so the world keeps its millimetres and only the centre moves;
    // otherwise the picture, and the points with it, grow with the sheet. An
    // engine without the seam leaves them as they are.
    // ------------------------------------------------------------
    function Na__EngineHost__RefitPoints(points, fromSheetMm, trueScale) {
        const refit = PainterlyNPR__Points.PainterlyNPR__ArtDirection__RefitPoints;
        if (typeof refit === 'function') return refit(points, fromSheetMm, !!trueScale);
        return JSON.parse(JSON.stringify(Array.isArray(points) ? points : []));
    }

    function Na__EngineHost__SceneCounts() {
        return Scene ? { Objects: Scene.Objects.length, Edges: Scene.Edges.length, Surfaces: Scene.Surfaces.length } : null;
    }

    // The building, not its garden: every vertex of an Architecture or Focal object
    // (walls, roofs, chimneys, windows, door, porch). Elevations and plans centre on it.
    function Na__EngineHost__BuildingBounds() {
        if (!Scene) return null;
        const ids = new Set(Scene.Objects.filter((o) => o.Role === 'Architecture' || o.Role === 'Focal').map((o) => o.Id));
        const v = Scene.Vertices;
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < v.length; i += 8) {
            if (!ids.has(Math.round(v[i + 6]))) continue;
            for (let k = 0; k < 3; k++) { if (v[i + k] < min[k]) min[k] = v[i + k]; if (v[i + k] > max[k]) max[k] = v[i + k]; }
        }
        if (!Number.isFinite(min[0])) return null;
        return { Min: min, Max: max, Centre: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2] };
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Engine Up, and Is It Drawing?
    // ------------------------------------------------------------
    function Na__EngineHost__Ready() { return Na__EngineHost__State.booted; }

    function Na__EngineHost__Busy() { return Na__EngineHost__State.busy || !!Graph.Refining; }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Camera
// -----------------------------------------------------------------------------

    // FUNCTION | The Camera Presets AURA Offers: [{ Key, Label, Mode }]
    // ------------------------------------------------------------
    function Na__EngineHost__Presets(keys) {
        return (keys || Object.keys(CAMERA_PRESETS)).filter((k) => CAMERA_PRESETS[k]).map((k) => ({ Key: k, Label: CAMERA_PRESETS[k].Label || k, Mode: CAMERA_PRESETS[k].Mode }));
    }

    function Na__EngineHost__PresetCamera(key) {
        const p = CAMERA_PRESETS[key];
        if (!p) return null;
        return { Mode: p.Mode, Yaw: p.Yaw, Pitch: p.Pitch, Distance: p.Distance, Target: p.Target.slice(), FovY: p.FovY, HalfHeight: p.HalfHeight, Ceiling: p.Ceiling };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Live Camera, a Copy (and the preset it came from, or "Custom")
    // ------------------------------------------------------------
    // The 3D Environment's, even while a sheet's viewport has borrowed the
    // engine: "the 3D Environment's view now" means its camera, not the lent one.
    // ------------------------------------------------------------
    function Na__EngineHost__Camera() {
        const b = Na__EngineHost__State.borrowed;
        return { Camera: JSON.parse(JSON.stringify(b ? b.Camera : State.Camera)), Preset: b ? b.Preset : State.CameraPreset };
    }
    // ------------------------------------------------------------


    // FUNCTION | Move the Live Camera: a preset, a saved camera, an orbit, a zoom
    // ------------------------------------------------------------
    // Each is what PainterlyNPR's own panel does: set the camera, bump Camera,
    // ask for the navigation preview; the drawing refines once it is still.
    // ------------------------------------------------------------
    function Na__EngineHost__ApplyPreset(key) {
        if (!CAMERA_PRESETS[key]) return;
        PainterlyNPR__CameraRig__ApplyPreset(key);
        PainterlyNPR__RenderGraph__Bump('Camera');
        PainterlyNPR__RenderGraph__Request('Navigate');
    }

    function Na__EngineHost__SetCamera(camera, preset) {
        State.Camera = JSON.parse(JSON.stringify(camera));
        State.CameraPreset = preset || 'Custom';
        PainterlyNPR__RenderGraph__Bump('Camera');
        PainterlyNPR__RenderGraph__Request('Navigate');
    }

    function Na__EngineHost__Orbit(dx, dy) {
        PainterlyNPR__CameraRig__Orbit(dx, dy);
        PainterlyNPR__RenderGraph__Bump('Camera');
        PainterlyNPR__RenderGraph__Request('Navigate');
    }

    function Na__EngineHost__Zoom(delta) {
        PainterlyNPR__CameraRig__Zoom(delta);
        PainterlyNPR__RenderGraph__Bump('Camera');
        PainterlyNPR__RenderGraph__Request('Navigate');
    }

    function Na__EngineHost__Redraw() {
        PainterlyNPR__RenderGraph__Request('Navigate');                          // <-- The preview at once, refined when still
    }
    // ------------------------------------------------------------


    // FUNCTION | Navigate the Live Camera by Hand: { Detach, Home }
    // ------------------------------------------------------------
    // The engine's own navigation (PainterlyNPR 74__Camera__Navigation, ValeVision
    // 3D's orbit mode): drags, the wheel, fingers and keys on the element, each
    // move a camera bump and the navigation preview. options as the engine's
    // Attach: Active, OnMove, OnSettle, OnReset and the rest.
    // ------------------------------------------------------------
    function Na__EngineHost__AttachNavigation(element, options) {
        return PainterlyNPR__Navigation__Attach(element, options);
    }
    // ------------------------------------------------------------


    // FUNCTION | The Live View's Work Mode: 'Rendered' or 'Proxy'
    // ------------------------------------------------------------
    // The engine's own switch (PainterlyNPR v0.6.0, Graph.Proxy): Proxy keeps the
    // quick navigation preview and never refines into pen and wash, so the
    // scene can be worked on without the renderer kicking in; Rendered draws
    // the pen and wash when the camera rests. Only the live view: a sheet's
    // still runs the whole graph whatever the mode.
    // ------------------------------------------------------------
    function Na__EngineHost__WorkMode() {
        return Graph.Proxy ? 'Proxy' : 'Rendered';
    }

    function Na__EngineHost__SetWorkMode(mode) {
        const proxy = mode === 'Proxy';
        if (proxy !== !!Graph.Proxy) PainterlyNPR__RenderGraph__SetProxy(proxy);
        return Na__EngineHost__WorkMode();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Parameters
// -----------------------------------------------------------------------------

    // FUNCTION | One of the Engine's Range Controls: label, range, value and readout
    // ------------------------------------------------------------
    // overrides: AURA's own label and range where the engine keeps them in its
    // panel rather than its controls config (the discipline slider).
    // ------------------------------------------------------------
    function Na__EngineHost__Control(key, overrides) {
        const spec = CONTROLS[key], raw = Na__EngineHost__CONTROL_SPECS[key];
        if (!spec || !raw) return null;
        const o = overrides || {};
        return {
            Key     : key,
            Label   : o.Label || raw.Label || key,
            Min     : o.Min !== undefined ? o.Min : raw.Min,
            Max     : o.Max !== undefined ? o.Max : raw.Max,
            Step    : o.Step !== undefined ? o.Step : raw.Step,
            Value   : PainterlyNPR__Interface__Get(spec.Path),
            Readout : (v) => spec.Format(v),
            Parse   : (text) => (typeof spec.Format.Parse === 'function' ? spec.Format.Parse(text) : Na__Format__ParseReadout(raw.Format, text))   // <-- The engine's own once synced (v0.5.2+)
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Set a Range Control, as PainterlyNPR's panel does
    // ------------------------------------------------------------
    function Na__EngineHost__SetControl(key, value) {
        const spec = CONTROLS[key];
        if (!spec || !Number.isFinite(value)) return;
        PainterlyNPR__Interface__Set(spec.Path, value);
        if (spec.Path[0] === 'Pen') State.PenPreset = 'Custom';
        PainterlyNPR__RenderGraph__Bump(...spec.Bump);
        PainterlyNPR__RenderGraph__Request(spec.Bump.includes('Sun') ? 'Navigate' : 'Refine');
        Na__EngineHost__Notify('control');
    }
    // ------------------------------------------------------------


    // FUNCTION | The Two Choices: Ink and Paper ([{ value, label }], current)
    // ------------------------------------------------------------
    function Na__EngineHost__Choices(key) {
        if (key === 'InkFamily') return { Label: 'Ink', Value: State.InkFamily, Options: Object.keys(INK_FAMILIES).map((k) => ({ value: k, label: INK_FAMILIES[k].Label || k })) };
        if (key === 'PaperPreset') return { Label: 'Paper', Value: State.Paper.Preset, Options: Object.keys(PAPER_PRESETS).map((k) => ({ value: k, label: PAPER_PRESETS[k].Label || k })) };
        return null;
    }

    function Na__EngineHost__SetChoice(key, value) {
        if (key === 'InkFamily' && INK_FAMILIES[value]) {
            State.InkFamily = value;
            State.PenPreset = 'Custom';
            PainterlyNPR__RenderGraph__Bump('Finish');
        } else if (key === 'PaperPreset' && PAPER_PRESETS[value]) {
            State.Paper.Preset = value;
            PainterlyNPR__RenderGraph__Bump('Paper');
        } else return;
        PainterlyNPR__RenderGraph__Request('Refine');
        Na__EngineHost__Notify('choice');
    }
    // ------------------------------------------------------------


    // FUNCTION | A New Seed: a new hand, the same building
    // ------------------------------------------------------------
    function Na__EngineHost__NewSeed() {
        State.Seed = PainterlyNPR__SeededRandom__MintSeed();
        for (const p of State.Points) p.Seed = PainterlyNPR__SeededRandom__DeriveSeed(State.Seed, 'point:' + p.Id) % 997;
        PainterlyNPR__RenderGraph__Bump('Seed', 'ArtDirection');
        PainterlyNPR__RenderGraph__Request('Refine');
        Na__EngineHost__Notify('seed');
        return State.Seed;
    }
    // ------------------------------------------------------------


    // FUNCTION | The Settings AURA Saves With a Drawing Set, and Putting Them Back
    // ------------------------------------------------------------
    function Na__EngineHost__Settings() {
        const out = {};
        Na__EngineHost__SETTING_KEYS.forEach((k) => { if (State[k] !== undefined) out[k] = JSON.parse(JSON.stringify(State[k])); });
        Na__EngineHost__AssetsSettings(out);                                     // <-- The placed assets and given materials, when there are any (Na__EngineHost__Assets__)
        return out;
    }

    // Only keys the engine already has are taken, and objects are merged key by
    // key, so a set saved by an older engine loads into a newer one.
    function Na__EngineHost__ApplySettings(settings, quiet) {
        if (!settings || typeof settings !== 'object') return;
        Na__EngineHost__SETTING_KEYS.forEach((k) => {
            if (settings[k] === undefined || State[k] === undefined) return;
            if (State[k] && typeof State[k] === 'object' && !Array.isArray(State[k])) {
                Object.keys(State[k]).forEach((sub) => { if (settings[k][sub] !== undefined && typeof settings[k][sub] === typeof State[k][sub]) State[k][sub] = settings[k][sub]; });
            } else if (typeof settings[k] === typeof State[k]) {
                State[k] = settings[k];
            }
        });
        if (settings.Paper && settings.Paper.Whiteness === undefined && typeof State.Paper.Whiteness === 'number') State.Paper.Whiteness = 0;   // <-- A set saved before Page whiteness (engine v0.8.5) is on its sheet's own tone
        Na__EngineHost__AssetsFromSettings(settings);                             // <-- Whole, a missing one meaning none; the scene rebuilt when they changed
        PainterlyNPR__RenderGraph__Bump(...Na__EngineHost__ALL_INPUTS);
        if (!quiet) {
            PainterlyNPR__RenderGraph__Request('Refine');
            Na__EngineHost__Notify('settings');
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Hear When the Settings Change (the drawing set saves them; viewports redraw)
    // ------------------------------------------------------------
    function Na__EngineHost__OnChange(fn) {
        if (typeof fn === 'function') Na__EngineHost__State.listeners.push(fn);
    }

    function Na__EngineHost__Notify(reason) {
        Na__EngineHost__State.listeners.forEach((fn) => { try { fn(reason); } catch (error) { console.error(error); } });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Art Direction Points
// -----------------------------------------------------------------------------

    // FUNCTION | The Point Types in the Engine's Order ([{ Key, Label, Glyph }]), and How Many a View Holds
    // ------------------------------------------------------------
    function Na__EngineHost__PointTypes() {
        return Object.entries(POINT_TYPES).sort((a, b) => (a[1].Code || 0) - (b[1].Code || 0))
            .map(([key, type]) => ({ Key: key, Label: type.Label || key, Glyph: type.Glyph || '' }));
    }

    function Na__EngineHost__MaxPoints() { return MAX_POINTS; }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Engine Points From Saved Ones
    // ------------------------------------------------------------
    // Only types the engine knows, each made by the engine's own MakePoint, so a
    // set saved by an older engine gains any new value at its default. A point
    // keeps its seed (manifest section 10: stored with the point) and takes a
    // fresh id: an id only tells the points of one view apart.
    // ------------------------------------------------------------
    function Na__EngineHost__MakePoints(points) {
        return (Array.isArray(points) ? points : [])
            .filter((p) => p && POINT_TYPES[p.Type] && Array.isArray(p.PaperMm) && p.PaperMm.length === 2)
            .map((p) => {
                const options = JSON.parse(JSON.stringify(p));
                delete options.Id;
                return PainterlyNPR__ArtDirection__MakePoint(p.Type, Number(p.PaperMm[0]) || 0, Number(p.PaperMm[1]) || 0, options);
            });
    }
    // ------------------------------------------------------------


    // FUNCTION | The Live Points as Plain Data (what a view keeps), and Their Signature
    // ------------------------------------------------------------
    // The signature leaves out the ids, and an object-anchored point's place on
    // the paper (the engine re-places it whenever the camera moves), so it
    // changes only when a point is edited.
    // ------------------------------------------------------------
    function Na__EngineHost__Points() {
        return JSON.parse(JSON.stringify(State.Points || []));
    }

    // The 3D Environment's points, even while a sheet's viewport has borrowed the engine
    function Na__EngineHost__EnvironmentPoints() {
        const b = Na__EngineHost__State.borrowed;
        return JSON.parse(JSON.stringify((b ? b.Points : State.Points) || []));
    }

    function Na__EngineHost__PointsSignature() {
        return JSON.stringify((State.Points || []).map((p) => {
            const copy = Object.assign({}, p);
            delete copy.Id;
            if (copy.Anchor === 'Object' && copy.World) delete copy.PaperMm;
            return copy;
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Put a View's Points in the Engine (none selected, nothing armed)
    // ------------------------------------------------------------
    function Na__EngineHost__SetPoints(points, quiet) {
        State.Points = Na__EngineHost__MakePoints(points);
        Ui.SelectedPointId = null;
        Ui.Placing = null;
        PainterlyNPR__RenderGraph__Bump('ArtDirection');
        Na__EngineHost__RefreshPoints();
        if (!quiet) PainterlyNPR__RenderGraph__Request('Refine');
    }
    // ------------------------------------------------------------


    // FUNCTION | Give the Engine's Point Editor Its Places, and Show or Hide It
    // ------------------------------------------------------------
    // PainterlyNPR's editor draws its handles, rings and the selected point's
    // node of sliders into Ui.Points, measuring the drawing from Ui.Canvas (only
    // ever measured: the engine draws through its WebGL context), and its list
    // into #PainterlyNPR__App__PointList, one a page (Na__EngineHost__PointList),
    // which lives in listHome until a sheet borrows it. It shows the handles
    // while its own Art direction tab is open (Ui.ActiveTab), so AURA sets that
    // tab while its Art direction points section is open. A point's readouts can
    // be typed into, as in the engine's own panel. The editor's own stylesheets
    // are linked once, from the pinned engine.
    // ------------------------------------------------------------
    function Na__EngineHost__AttachPoints(layer, element, listHome) {
        if (layer) Ui.Points = layer;
        if (element) Ui.Canvas = element;
        if (listHome) {
            Na__EngineHost__State.listHome = listHome;
            listHome.appendChild(Na__EngineHost__PointList());
        }
        Na__EngineHost__LinkPointStyles();
        PainterlyNPR__TypeIn__Wire();                                           // <-- Once: a readout clicked, or Entered, becomes a box to type in
        Na__EngineHost__RefreshPoints();
    }

    // The engine's point list: one element a page, moved to wherever points are edited
    function Na__EngineHost__PointList() {
        let list = document.getElementById('PainterlyNPR__App__PointList');
        if (!list) {
            list = document.createElement('div');
            list.id = 'PainterlyNPR__App__PointList';
            list.className = 'PainterlyNPR__PointList';
        }
        return list;
    }

    // HELPER FUNCTION | Link the Engine's Point Editor Stylesheets (once)
    function Na__EngineHost__LinkPointStyles() {
        if (document.querySelector('link[data-engine-styles]') || typeof import.meta.resolve !== 'function') return;
        Na__EngineHost__POINT_STYLES.forEach((specifier) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = import.meta.resolve(specifier);
            link.dataset.engineStyles = 'points';
            document.head.appendChild(link);
        });
    }

    function Na__EngineHost__ShowPoints(show) {
        Ui.ActiveTab = show ? 'ArtDirection' : 'Scene';
        if (!show) Ui.Placing = null;
        Na__EngineHost__RefreshPoints();
    }

    // The list and the handles drawn again: a new view, a resize, a section opened
    function Na__EngineHost__RefreshPoints() {
        if (!Na__EngineHost__State.booted) return;
        if (document.getElementById('PainterlyNPR__App__PointList')) PainterlyNPR__Interface__RenderPointList();
        Na__EngineHost__RedrawPointOverlay();
    }

    // The handles alone (the drawing under them moved or was resized)
    function Na__EngineHost__RedrawPointOverlay() {
        if (Na__EngineHost__State.booted && Ui.Points && Ui.Canvas) PainterlyNPR__Interface__UpdateOverlay();
    }

    // Show influence: the compositor tints what each point reaches (never on a sheet)
    function Na__EngineHost__ShowInfluence(on) {
        if (on !== undefined) {
            State.ShowInfluence = !!on;
            PainterlyNPR__RenderGraph__Bump('Overlay');
            Na__EngineHost__RefreshPoints();
            PainterlyNPR__RenderGraph__Request('Refine');
        }
        return !!State.ShowInfluence;
    }
    // ------------------------------------------------------------


    // FUNCTION | Arm a Point Type: the next press on the drawing places it (null disarms)
    // ------------------------------------------------------------
    function Na__EngineHost__ArmPoint(type) {
        Ui.Placing = type && POINT_TYPES[type] ? type : null;
        return Ui.Placing;
    }

    function Na__EngineHost__ArmedPoint() { return Ui.Placing || null; }
    // ------------------------------------------------------------


    // FUNCTION | Place the Armed Point Where a Press Fell: { point: { Number, Label } }, { full: true } or null
    // ------------------------------------------------------------
    // As PainterlyNPR's own sheet places one (its Wire): dropped on an object it
    // anchors there and follows it as the camera moves; a Fade stays on the
    // paper; Line control acts on that object alone; Indication dropped on
    // brick, tile or paving takes all of that material within its reach. The
    // point just placed is the one being edited: its sliders hang beside it.
    // ------------------------------------------------------------
    function Na__EngineHost__PlacePoint(event) {
        const type = Ui.Placing;
        if (!type) return null;
        Ui.Placing = null;
        if (State.Points.length >= MAX_POINTS) return { full: true };
        const [x, y] = PainterlyNPR__Interface__SheetMm(event);
        const point = PainterlyNPR__ArtDirection__MakePoint(type, x, y, { Anchor: type === 'Fade' ? 'Paper' : 'Object', Target: type === 'LineControl' ? 'Object' : 'Area' });
        PainterlyNPR__ArtDirection__AnchorAt(point, x, y);
        const material = MATERIAL_CLASSES[point.MaterialId];
        if (point.ObjectId < 0) { point.Anchor = 'Paper'; point.Target = 'Area'; }
        else if (type === 'Indication' && material && INDICATED_MATERIALS.includes(material.Key)) point.Target = 'Material';   // <-- Dropped on brick: all the brick it reaches
        State.Points.push(point);
        PainterlyNPR__Interface__SelectPoint(point.Id, true);
        PainterlyNPR__Interface__PointChanged();
        Na__EngineHost__PointsEdited();
        return { point: { Number: State.Points.indexOf(point) + 1, Label: POINT_TYPES[type].Label } };
    }
    // ------------------------------------------------------------


    // FUNCTION | The Selected Point's Keys, as the Engine's Sheet Has Them: true when one was taken
    // ------------------------------------------------------------
    // Delete removes it (its neighbour is selected next), Ctrl+D duplicates it,
    // [ and ] size it (Shift: 10 mm), H switches it off and on, Escape lets it
    // go. Nothing while no point is selected or one is being placed.
    // ------------------------------------------------------------
    function Na__EngineHost__PointKey(e) {
        const point = PainterlyNPR__Interface__PointById(Ui.SelectedPointId);
        if (!point || Ui.Placing) return false;
        const key = (e.key || '').toLowerCase();
        if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey) PainterlyNPR__Interface__RemovePoint(point.Id);
        else if (key === 'd' && (e.ctrlKey || e.metaKey) && !e.altKey) PainterlyNPR__Interface__DuplicatePoint(point.Id);
        else if (['[', ']', '{', '}'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
            const step = (e.shiftKey ? 10 : 2) * (e.key === '[' || e.key === '{' ? -1 : 1);
            PainterlyNPR__Interface__SetPointValue(point, 'RadiusMm', Math.min(140, Math.max(10, point.RadiusMm + step)), null);
        }
        else if (key === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey) PainterlyNPR__Interface__TogglePoint(point.Id);
        else if (e.key === 'Escape') PainterlyNPR__Interface__SelectPoint(null);
        else return false;
        Na__EngineHost__PointsEdited();
        return true;
    }

    function Na__EngineHost__SelectedPoint() { return Ui.SelectedPointId; }

    function Na__EngineHost__DeselectPoint() {
        if (Ui.SelectedPointId === null) return false;
        PainterlyNPR__Interface__SelectPoint(null);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Hear When the Points Were Edited, and Say So
    // ------------------------------------------------------------
    // The engine's editor changes State.Points itself (a drag, a slider, a
    // remove). Whoever holds the points now - the 3D Environment, or the
    // sheet's viewport that borrowed the engine - is told once a frame at most,
    // and compares the signature to decide whether there is anything to save.
    // ------------------------------------------------------------
    function Na__EngineHost__OnPointsEdited(fn) {
        Na__EngineHost__State.onPoints = typeof fn === 'function' ? fn : null;
    }

    function Na__EngineHost__PointsEdited() {
        const S = Na__EngineHost__State;
        if (S.pointsTick) return;
        S.pointsTick = requestAnimationFrame(() => {
            S.pointsTick = 0;
            const fn = S.borrowed ? S.borrowed.OnEdited : S.onPoints;
            if (fn) { try { fn(); } catch (error) { console.error('[AURA EngineHost] Keeping the points failed:', error); } }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Lend the Live Engine to a Sheet's Viewport While Its Points Are Edited
    // ------------------------------------------------------------
    // One engine a page. While a viewport's points are edited on its sheet, the
    // live drawing becomes that viewport's: its camera and points in the
    // engine, the editor's handles over its picture (layer), measured from a
    // stand-in laid over the picture (element). The engine refines it as it
    // would the 3D Environment, so a point dropped on the sheet anchors to what
    // lies under it, and the refined drawing can stand in as the viewport's
    // picture while it is edited. Always in pen and wash (never Proxy).
    // Release puts the 3D Environment back as it was.
    // options: { camera, points, layer, element, onEdited, onRelease }
    // ------------------------------------------------------------
    function Na__EngineHost__Borrow(options) {
        Na__EngineHost__Release();
        const S = Na__EngineHost__State;
        S.borrowed = {
            Camera: State.Camera, Preset: State.CameraPreset, Points: State.Points, Selected: Ui.SelectedPointId,
            Layer: Ui.Points, Element: Ui.Canvas, ActiveTab: Ui.ActiveTab, Influence: !!State.ShowInfluence, Proxy: !!Graph.Proxy,
            OnEdited: options.onEdited || null, OnRelease: options.onRelease || null
        };
        if (Graph.Proxy) PainterlyNPR__RenderGraph__SetProxy(false);
        State.Camera = JSON.parse(JSON.stringify(options.camera));
        State.CameraPreset = 'Custom';
        State.Points = Na__EngineHost__MakePoints(options.points);
        State.ShowInfluence = false;
        Ui.SelectedPointId = null;
        Ui.Placing = null;
        Ui.Points = options.layer;
        Ui.Canvas = options.element;
        Ui.ActiveTab = 'ArtDirection';
        PainterlyNPR__RenderGraph__Bump('Camera', 'ArtDirection', 'Overlay');
        Na__EngineHost__RefreshPoints();
        PainterlyNPR__RenderGraph__Request('Refine');
    }

    // The borrowed viewport's camera changed (a pan, a new scale or side)
    function Na__EngineHost__BorrowCamera(camera) {
        if (!Na__EngineHost__State.borrowed || !camera) return;
        State.Camera = JSON.parse(JSON.stringify(camera));
        PainterlyNPR__RenderGraph__Bump('Camera');
        PainterlyNPR__RenderGraph__Request('Refine');
    }

    function Na__EngineHost__Borrowed() { return !!Na__EngineHost__State.borrowed; }

    // The live engine's canvas: its refined drawing is the borrowed viewport's preview
    function Na__EngineHost__LiveCanvas() { return Na__EngineHost__State.canvas; }

    function Na__EngineHost__Release() {
        const S = Na__EngineHost__State;
        const b = S.borrowed;
        if (!b) return;
        if (S.pointsTick) {                                                     // <-- An edit not yet told: the viewport hears it before it lets go
            cancelAnimationFrame(S.pointsTick);
            S.pointsTick = 0;
            if (b.OnEdited) { try { b.OnEdited(); } catch (error) { console.error(error); } }
        }
        S.borrowed = null;
        Graph.Token++;                                                           // <-- The viewport's refinement stops at its next pass
        State.Camera = b.Camera;
        State.CameraPreset = b.Preset;
        State.Points = b.Points;
        State.ShowInfluence = b.Influence;
        Ui.Points = b.Layer;
        Ui.Canvas = b.Element;
        Ui.ActiveTab = b.ActiveTab;
        Ui.Placing = null;
        Ui.SelectedPointId = PainterlyNPR__Interface__PointById(b.Selected) ? b.Selected : null;
        if (b.Proxy) PainterlyNPR__RenderGraph__SetProxy(true);
        PainterlyNPR__RenderGraph__Bump('Camera', 'ArtDirection', 'Overlay');
        if (b.OnRelease) { try { b.OnRelease(); } catch (error) { console.error(error); } }
        const list = Na__EngineHost__PointList();
        if (S.listHome && list.parentElement !== S.listHome) S.listHome.appendChild(list);   // <-- The list goes home with the points
        Na__EngineHost__RefreshPoints();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Stills for the Sheets
// -----------------------------------------------------------------------------

    // FUNCTION | Draw One Still: { camera, scale, controls, points } -> { canvas, widthPx, heightPx, ms }
    // ------------------------------------------------------------
    // PainterlyNPR's PNG export, kept in memory. The camera is swapped in and any
    // control overrides set, the whole graph runs at the scale (pixels per mm x
    // scale; every width is millimetres, so the drawing does not change), the
    // compositor is read back, and everything is put back as it was. The live
    // view is not redrawn here: the caller asks for that when it is shown again.
    // points: the view's own Art Direction Points (copies: an object-anchored
    // point is re-placed for this camera, the view's own data never). Show
    // influence never reaches a sheet, and the point overlay sits the still out.
    // ------------------------------------------------------------
    function Na__EngineHost__RenderStill(request) {
        if (!Na__EngineHost__State.booted) throw new Error('The engine has not started.');
        const gl = Gpu.Gl;
        const scale = Math.max(0.25, Math.min(4, Number(request.scale) || 1));
        const started = performance.now();
        const saved = { Camera: State.Camera, Preset: State.CameraPreset, Controls: [], Points: State.Points, Selected: Ui.SelectedPointId,
                        ActiveTab: Ui.ActiveTab, Influence: !!State.ShowInfluence };
        Na__EngineHost__State.busy = true;
        Graph.Token++;                                                           // <-- A refinement in flight stops at its next pass
        let pixels = null, width = 0, height = 0, failure = null;
        try {
            State.Camera = JSON.parse(JSON.stringify(request.camera));
            State.CameraPreset = 'Custom';
            PainterlyNPR__RenderGraph__Bump('Camera');
            if (Array.isArray(request.points)) State.Points = Na__EngineHost__MakePoints(request.points);
            Ui.SelectedPointId = null;
            Ui.ActiveTab = 'Scene';                                              // <-- The overlay hides itself: the still's points are not the live ones
            State.ShowInfluence = false;
            PainterlyNPR__RenderGraph__Bump('ArtDirection', 'Overlay');
            Object.entries(request.controls || {}).forEach(([key, value]) => {
                const spec = CONTROLS[key];
                if (!spec) return;
                saved.Controls.push({ spec, value: PainterlyNPR__Interface__Get(spec.Path) });
                PainterlyNPR__Interface__Set(spec.Path, value);
                PainterlyNPR__RenderGraph__Bump(...spec.Bump);
            });
            if (scale !== Gpu.Scale) {
                PainterlyNPR__GpuResources__SetScale(scale);
                PainterlyNPR__RenderGraph__Bump('Size');
            }
            PainterlyNPR__RenderGraph__RunAll();
            const target = Gpu.Targets.Composite;
            width = target.Width;
            height = target.Height;
            pixels = new Uint8Array(width * height * 4);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, target.Fbo);
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        } catch (error) {
            failure = error;
        }
        // Put everything back, whatever happened
        saved.Controls.reverse().forEach(({ spec, value }) => { PainterlyNPR__Interface__Set(spec.Path, value); PainterlyNPR__RenderGraph__Bump(...spec.Bump); });
        State.Camera = saved.Camera;
        State.CameraPreset = saved.Preset;
        State.Points = saved.Points;
        State.ShowInfluence = saved.Influence;
        Ui.SelectedPointId = saved.Selected;
        Ui.ActiveTab = saved.ActiveTab;
        PainterlyNPR__RenderGraph__Bump('Camera', 'ArtDirection', 'Overlay');
        if (Gpu.Scale !== 1) {
            try { PainterlyNPR__GpuResources__SetScale(1); } catch (error) { console.error(error); }
            PainterlyNPR__RenderGraph__Bump('Size');
        }
        Na__EngineHost__State.busy = false;
        if (failure) throw failure;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const image = ctx.createImageData(width, height);
        for (let y = 0; y < height; y++) image.data.set(pixels.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
        ctx.putImageData(image, 0, 0);
        return { canvas, widthPx: width, heightPx: height, ms: performance.now() - started };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__EngineHost__Boot,
        Na__EngineHost__Version,
        Na__EngineHost__SheetMm,
        Na__EngineHost__RefitPoints,
        Na__EngineHost__SceneCounts,
        Na__EngineHost__BuildingBounds,
        Na__EngineHost__Ready,
        Na__EngineHost__Busy,
        Na__EngineHost__Presets,
        Na__EngineHost__PresetCamera,
        Na__EngineHost__Camera,
        Na__EngineHost__ApplyPreset,
        Na__EngineHost__SetCamera,
        Na__EngineHost__Orbit,
        Na__EngineHost__Zoom,
        Na__EngineHost__Redraw,
        Na__EngineHost__AttachNavigation,
        Na__EngineHost__WorkMode,
        Na__EngineHost__SetWorkMode,
        Na__EngineHost__Control,
        Na__EngineHost__SetControl,
        Na__EngineHost__Choices,
        Na__EngineHost__SetChoice,
        Na__EngineHost__NewSeed,
        Na__EngineHost__Settings,
        Na__EngineHost__ApplySettings,
        Na__EngineHost__OnChange,
        Na__EngineHost__Notify,
        Na__EngineHost__PointTypes,
        Na__EngineHost__MaxPoints,
        Na__EngineHost__Points,
        Na__EngineHost__EnvironmentPoints,
        Na__EngineHost__PointsSignature,
        Na__EngineHost__SetPoints,
        Na__EngineHost__AttachPoints,
        Na__EngineHost__PointList,
        Na__EngineHost__ShowPoints,
        Na__EngineHost__RefreshPoints,
        Na__EngineHost__RedrawPointOverlay,
        Na__EngineHost__ShowInfluence,
        Na__EngineHost__ArmPoint,
        Na__EngineHost__ArmedPoint,
        Na__EngineHost__PlacePoint,
        Na__EngineHost__PointKey,
        Na__EngineHost__SelectedPoint,
        Na__EngineHost__DeselectPoint,
        Na__EngineHost__OnPointsEdited,
        Na__EngineHost__PointsEdited,
        Na__EngineHost__Borrow,
        Na__EngineHost__BorrowCamera,
        Na__EngineHost__Borrowed,
        Na__EngineHost__LiveCanvas,
        Na__EngineHost__Release,
        Na__EngineHost__RenderStill
    };

// endregion -------------------------------------------------------------------
