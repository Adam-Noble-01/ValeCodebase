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
//   it: a change goes into PainterlyNPR, then a sync brings the new version.
//   Only this module imports from it.
// - BOOT is PainterlyNPR's own AppCore Init (region Boot) without its panel,
//   graph strip and header: the same context options, programs, vertex arrays,
//   targets and first request. When the engine's Init changes, this boot is
//   read against it (the sync script says so). This seam moves into
//   PainterlyNPR as 07__System__LibraryHost once Noble Architecture's wrapper
//   needs it too (Adam, 30-Oct-2026).
// - THE ENGINE'S INTERFACE MODULES ARE STILL IN ITS GRAPH: its render graph
//   reports to them (status line, graph nodes, point overlay, view badge).
//   They are given somewhere to write: Ui.Status is AURA's status line, the
//   point layer is a detached element, and two hidden stand-ins carry the ids
//   the view badge looks up.
// - STILLS (Na__EngineHost__RenderStill) are PainterlyNPR's PNG export, kept in
//   memory: the camera swapped in, the whole graph run at a scale, the
//   compositor read back, everything put back. The engine's sheet is 300 x 200
//   mm and every pen width is millimetres on it, so an orthographic still with
//   a half-height of (200 mm x scale / 2000) metres is a true-scale drawing
//   whose pen widths are true on the paper (the engine's own 1:100 elevation
//   is a 10 m half-height).
// - ONE ENGINE A PAGE: its state, GPU and camera are module singletons, so the
//   3D Environment and every viewport share it, one render at a time.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
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
        PainterlyNPR__Engine__SHEET_HEIGHT_MM  as  SHEET_HEIGHT_MM,
        PainterlyNPR__Engine__SHEET_WIDTH_MM   as  SHEET_WIDTH_MM
    } from 'PainterlyNPR/02__AppData/PainterlyNPR__AppData__Engine__.mjs';
    import { PainterlyNPR__SeededRandom__MintSeed, PainterlyNPR__SeededRandom__DeriveSeed } from 'PainterlyNPR/03__AppUtils/PainterlyNPR__AppUtils__SeededRandom__.mjs';
    import { PainterlyNPR__ScenePackage__Load, PainterlyNPR__ScenePackage__Scene as Scene } from 'PainterlyNPR/10__Import__ScenePackage/PainterlyNPR__ScenePackage__Build__.mjs';
    import {
        PainterlyNPR__RenderGraph__Bump,
        PainterlyNPR__RenderGraph__Request,
        PainterlyNPR__RenderGraph__RunAll,
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
    import { PainterlyNPR__ArtDirection__FS_FIELD as FS_FIELD } from 'PainterlyNPR/66__ArtDirection__SmartFields/PainterlyNPR__ArtDirection__FieldShader__.mjs';
    import {
        PainterlyNPR__CameraRig__ApplyPreset,
        PainterlyNPR__CameraRig__Compute,
        PainterlyNPR__CameraRig__Orbit,
        PainterlyNPR__CameraRig__Zoom
    } from 'PainterlyNPR/70__Camera__ViewTypes/PainterlyNPR__CameraRig__Camera__.mjs';
    import { PainterlyNPR__CameraRig__CAMERA_PRESETS as CAMERA_PRESETS } from 'PainterlyNPR/70__Camera__ViewTypes/PainterlyNPR__CameraRig__Presets__.mjs';
    import {
        PainterlyNPR__Interface__Get,
        PainterlyNPR__Interface__Set,
        PainterlyNPR__Interface__Ui  as  Ui
    } from 'PainterlyNPR/80__System__HudOverlay/PainterlyNPR__Interface__Dom__.mjs';
    import { PainterlyNPR__Interface__CONTROLS as CONTROLS } from 'PainterlyNPR/80__System__HudOverlay/PainterlyNPR__Interface__Controls__.mjs';
    import ControlsConfig from 'PainterlyNPR/80__System__HudOverlay/Na__Interface__Controls__Config.json' with { type: 'json' };
    import { PainterlyNPR__PassViewer__FS_VIEW as FS_VIEW } from 'PainterlyNPR/81__Hud__PassViewer/PainterlyNPR__PassViewer__Shader__.mjs';
    import { Na__Format__ParseReadout } from '../03__AppUtils/Na__AppUtils__Format__.js';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    const Na__EngineHost__State = {
        booted     : false,
        canvas     : null,
        busy       : false,                      // <-- A still is being drawn: the live view waits
        listeners  : []                          // <-- Told when the engine's settings change: (reason) => {}
    };

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
    function Na__EngineHost__Camera() {
        return { Camera: JSON.parse(JSON.stringify(State.Camera)), Preset: State.CameraPreset };
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
// REGION | Stills for the Sheets
// -----------------------------------------------------------------------------

    // FUNCTION | Draw One Still: { camera, scale, controls } -> { canvas, widthPx, heightPx, ms }
    // ------------------------------------------------------------
    // PainterlyNPR's PNG export, kept in memory. The camera is swapped in and any
    // control overrides set, the whole graph runs at the scale (pixels per mm x
    // scale; every width is millimetres, so the drawing does not change), the
    // compositor is read back, and everything is put back as it was. The live
    // view is not redrawn here: the caller asks for that when it is shown again.
    // ------------------------------------------------------------
    function Na__EngineHost__RenderStill(request) {
        if (!Na__EngineHost__State.booted) throw new Error('The engine has not started.');
        const gl = Gpu.Gl;
        const scale = Math.max(0.25, Math.min(4, Number(request.scale) || 1));
        const started = performance.now();
        const saved = { Camera: State.Camera, Preset: State.CameraPreset, Controls: [] };
        Na__EngineHost__State.busy = true;
        Graph.Token++;                                                           // <-- A refinement in flight stops at its next pass
        let pixels = null, width = 0, height = 0, failure = null;
        try {
            State.Camera = JSON.parse(JSON.stringify(request.camera));
            State.CameraPreset = 'Custom';
            PainterlyNPR__RenderGraph__Bump('Camera');
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
        PainterlyNPR__RenderGraph__Bump('Camera');
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
        Na__EngineHost__Control,
        Na__EngineHost__SetControl,
        Na__EngineHost__Choices,
        Na__EngineHost__SetChoice,
        Na__EngineHost__NewSeed,
        Na__EngineHost__Settings,
        Na__EngineHost__ApplySettings,
        Na__EngineHost__OnChange,
        Na__EngineHost__RenderStill
    };

// endregion -------------------------------------------------------------------
