// =============================================================================
// VALEVISION3D - LAYOUT EDITOR - SNAPSHOT RENDERER
// =============================================================================
//
// FILE       : Na__LayoutEditor__SnapshotRenderer__.js
// NAMESPACE  : Na__LeSnap
// MODULE     : Layout Editor - Snapshot Renderer
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Offscreen pictures for both viewport kinds through the live pipeline, restoring everything touched
// CREATED    : 09-Sep-2026
//
// DESCRIPTION:
// - 2D underlay: the drawing's cut goes onto the section adapter, an
//   orthographic camera of the module's own is framed on the viewport's
//   model window, the composer and material presets are entered with the
//   viewport's style toggles, and the tiled renderer paints it at the
//   requested pixels per paper millimetre. Then the cut, the presets and
//   the 3D suspension are undone in reverse. A 2D underlay is always lit by
//   the default lighting, as a drawing is in the viewer.
// - 3D snapshot: the main camera is posed from the scene record (which also
//   applies the scene's layer visibility, cross section binding and lighting),
//   the material preset applies whitecard and opaque glass, the profile lines
//   pass follows the toggle, the tiled renderer paints, and the pose,
//   visibility, sections, lighting and pass are put back.
// - Renders queue one behind another: the renderer and the presets are
//   shared state and two renders in flight would trample each other.
//
// INTEGRATION:
// - Initialized from index.html with the renderer, scene, camera, controls,
//   pipeline ref and model root.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (1.0.0, 09-Sep-2026, ValeVision3D v2.21.0, port Phase 5), from the
//                   enter and exit sequences of the floor plan and elevation mode controllers
//                   (42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js and
//                   45__System__ElevationViews/Na__Elevation__ModeController__.js)
// - Twin          : TrueVision3D 02__Src__AppModules/51__System__LayoutEditor/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js,
//                   ported from this file (TrueVision3D v2.21.0). Its later hunks are replayed into this
//                   file's own sequence, never the whole file; the log below names each one
// - Source version: 1.13.0 (TrueVision3D v2.161.0, 28-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D {{VVREL:W1-23}} (TrueVision3D's render signatures, 1.7.1)
// - Parity        : diverged (DIV-1: ValeVision3D's composer route)
// - Divergences   :
//   - DIV-1. The 2D picture is drawn through the composer preset with the main camera (the preset
//     swaps the framed ortho in), and each width goes in through the system that owns it: the composer
//     preset (profile), the Cross Sections tool (section outline), Na__LineworkSettings (the model's
//     edges). TrueVision3D draws through RenderPreset__RenderFrame and sets its widths itself.
//   - A 3D render's sections are saved and put back through the Cross Sections tool
//     (41__System__CrossSectionView), not TrueVision3D's section engine serializer.
//   - The context categories carry the ValeVision__ token, entourage silhouettes included.
//   - TrueVision3D's arguments in TrueVision3D's positions (1.7.1). The design phase (modelSourceId) is
//     taken and not used - ValeVision3D has no design phases (DR-09) - and a depth fog source answers
//     null.
//   - Not here yet: TrueVision3D's design phases (1.6.0), door pose (1.7.0, 1.12.1), depth fog image
//     (1.12.0), Enhance strength and nested linework modifier rules.
//   - Console prefix [ValeVision3D LayoutEditor].
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.7.1 (TrueVision3D's render signatures, {{VVREL:W1-23}})
// - Render2d, Render3d, GetModelRoot, GetModelFingerprint and
//   GetPipelineFingerprint take TrueVision3D's arguments in TrueVision3D's
//   positions: Render2d (..., weights, modelSourceId, stillWanted, depthFog),
//   Render3d (..., weights, modelSourceId, viewWindow, stillWanted) and an
//   optional modelSourceId on the other three. stillWanted sat ninth in
//   Render2d and viewWindow eighth in Render3d, so a TrueVision3D caller
//   would have handed a 3D render its stillWanted as the view window and
//   drawn a zoomed viewport's whole picture, with no error.
// - modelSourceId is the design phase a viewport draws. ValeVision3D has no
//   design phases, every viewport's Model Source is the live model and its
//   renderId null, so it is taken and not used: every picture and every
//   fingerprint is what it was. A depth fog source answers null, no fog
//   image, rather than the picture standing in for its fog, until
//   ValeVision3D draws depth fog.
// - Every caller moved with it: the Viewport 2D units, Viewport3d and the
//   PDF exporter. No behaviour change.
//
// 28-Sep-2026 - Version 1.7.0 (per-scene lighting, ValeVision v2.71.0)
// - Render3d: the scene pose now also lights the model the scene's way
//   (PresentationMode__Scene__Lighting), and the viewer's lighting goes back
//   afterwards with the pose, the layers and the sections.
// - Render2d: the underlay is rendered in the default lighting and the
//   viewer's lighting is put back after, so a drawing never borrows the light
//   of whichever 3D scene was last on screen.
// - ValeVision only; TrueVision has no per-scene lighting.
//
// 18-Sep-2026 - Version 1.6.0
// - stillWanted. Render2d and Render3d take an optional last argument, a
//   function asked when the render's turn in the queue comes; false answers
//   null without rendering. Renders are queued one behind another, so a sheet
//   left while its viewports were still waiting used to hold up the sheet
//   arrived at; the viewport cache answers false for a sheet that is parked.
//   A caller that passes nothing - the PDF, a bake, a forced render - is always
//   rendered, as before.
// - The model fingerprint (what keys a 3D snapshot) takes each category's
//   content stamp as well as its name and triangle count (ModelHash). A
//   re-export that moves something without changing a count now re-keys the
//   snapshots, as it does the linework and the base images (the pipeline
//   fingerprint, 1.1.0 of the model stage). An unstamped model keys as before.
// - Ported from TrueVision3D 1.9.0 and 1.10.0 (v2.64.0, v2.64.1), less their
//   design phase lines.
//
// 14-Sep-2026 - Version 1.5.0
// - Render3d takes a view window: the part of the scene camera's picture a
//   zoomed or slid 3D viewport's frame shows (Na__LayoutEditor__Viewport3d__),
//   handed to the tiled renderer as viewWindow. Null renders the whole picture
//   as before.
// - Ported from TrueVision3D 1.8.0 (v2.50.0).
//
// 13-Sep-2026 - Version 1.4.0
// - Render Composites weights, ported from TrueVision3D: the profile edge, the
//   section outline and the model's own edges draw at the viewport's widths for
//   one render and are put back. Each width goes in through the system that owns
//   it - the composer preset, the Cross Sections tool, Na__LineworkSettings -
//   where TrueVision sets its Sobel quad and line materials directly (DIV-1).
//
// 11-Sep-2026 - Version 1.3.1
// - Entourage silhouettes (ValeVision__SceneEntourageSilhouette, tag 61) are context too: Context Layer off takes them out with the rest.
//
// 10-Sep-2026 - Version 1.3.0
// - Context Layer off takes the existing building and its surroundings out of the picture; the visibility is put back afterwards.
//
// 10-Sep-2026 - Version 1.2.0
// - The Enhance Whitecard pass runs on the render canvas when the viewport style asks for it.
//
// 10-Sep-2026 - Version 1.1.0
// - Session-cached model fingerprints (no model walk per refresh); the profile lines pass state is restored after a 2D render.
//
// 09-Sep-2026 - Version 1.0.0
// - Initial implementation for port Phase 5.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Enhance Whitecard Pass
    // ------------------------------------------------------------
    import { Na__LeEnhance__Apply } from './Na__LayoutEditor__Enhance__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Three, Units, Render Loop
    // ------------------------------------------------------------
    import * as THREE from 'three';
    import { Na__Math__ConvertMmToUnits, Na__Math__ConvertUnitsToMm } from '../../04__MathUtils/Na__Math__Units.js';
    import { Na__RenderLoop__RequestRender } from '../../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Drawing View Core (presets, section adapter, transitions)
    // ------------------------------------------------------------
    import {
        Na__DrawView__SectionAdapter__UpsertHorizontalPlane,
        Na__DrawView__SectionAdapter__UpsertVerticalPlane,
        Na__DrawView__SectionAdapter__SetActivePlane,
        Na__DrawView__SectionAdapter__RemovePlane,
        Na__DrawView__SectionAdapter__SuspendLiveTool,
        Na__DrawView__SectionAdapter__Release,
        Na__DrawView__SectionAdapter__ReapplyClipping
    } from '../../40__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js';
    import {
        Na__DrawView__RenderPreset__Enter,
        Na__DrawView__RenderPreset__Exit,
        Na__DrawView__RenderPreset__GetExportOverrides
    } from '../../40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js';
    import {
        Na__DrawView__MaterialPreset__Enter,
        Na__DrawView__MaterialPreset__Exit
    } from '../../40__System__DrawingViewCore/Na__DrawView__MaterialPreset__.js';
    import {
        Na__DrawView__Transitions__SuspendThreeD,
        Na__DrawView__Transitions__ResumeThreeD,
        Na__DrawView__Transitions__IsSuspended
    } from '../../40__System__DrawingViewCore/Na__DrawView__Transitions__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Plan and Elevation Records and Camera Setups
    // ------------------------------------------------------------
    import { Na__FpCfg__GetCameraSetup } from '../../42__System__FloorPlanViews/Na__FloorPlan__ConfigState__.js';
    import { Na__FpData__GetCutHeightMm, Na__FpData__GetViewDepthMm, Na__FpData__GetSavedView } from '../../42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js';
    import { Na__ElevCfg__GetCameraSetup } from '../../45__System__ElevationViews/Na__Elevation__ConfigState__.js';
    import {
        Na__ElevData__GetAxes,
        Na__ElevData__IsSection,
        Na__ElevData__GetPlaneDistanceMm,
        Na__ElevData__GetViewDepthMm,
        Na__ElevData__GetSavedView
    } from '../../45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Pose, Visibility, Sections, Tiled Renderer
    // ------------------------------------------------------------
    import { Na__PresentationMode__Camera__ApplySceneCameraState } from '../../21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js';
    import { Na__ModelToggle__CaptureVisibilityMap, Na__ModelToggle__ApplySceneLayerVisibility, Na__ModelToggle__SetCategoryVisibility } from '../../26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js';
    import { Na__CrossSection__SerializeSections, Na__CrossSection__ApplySerializedSections } from '../../41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js';
    import { Na__StaticExport__RenderToCanvas } from '../../30__System__ImageExport/Na__ImageExport__StaticExport__TiledRenderer.js';
    import { Na__PlView__KIND_PLAN, Na__PlView__Hash } from '../../50__System__ProjectedLinework/Na__ProjectedLinework__ViewDefinition__.js';
    import { Na__PlStage__Describe } from '../../50__System__ProjectedLinework/Na__ProjectedLinework__ModelStage__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | The Line Widths a Composite Weight Sets
    // ------------------------------------------------------------
    // The composer preset takes the profile width on Enter; these carry the
    // section outline and the model's own edges.
    // ------------------------------------------------------------
    import { Na__CrossSection__GetAppearance, Na__CrossSection__SetLineWidth } from '../../41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js';
    import { Na__LineworkSettings__SetLineworkBaseOverride } from '../../05__RenderPipeline/Na__RenderEffect__LineworkSettings__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Per-Scene Lighting (a 3D picture in its scene's light, a 2D one in the default)
    // ------------------------------------------------------------
    // @delegate: ../../06__Scene__LightingEffects/Na__Scene__PerSceneLighting__.js
    // ------------------------------------------------------------
    import {
        Na__SceneLighting__GetLive,
        Na__SceneLighting__Apply,
        Na__SceneLighting__ApplyDefaults
    } from '../../06__Scene__LightingEffects/Na__Scene__PerSceneLighting__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Cut Plane Id
    // ------------------------------------------------------------
    const Na__LeSnap__CUT_ID = 'na-layouteditor-snapshot';
    // ------------------------------------------------------------

    // MODULE VARIABLES | Render Context and Queue
    // ------------------------------------------------------------
    let Na__LeSnap__Renderer    = null;
    let Na__LeSnap__Scene       = null;
    let Na__LeSnap__Camera      = null;
    let Na__LeSnap__Controls    = null;
    let Na__LeSnap__PipelineRef = null;
    let Na__LeSnap__ModelRoot   = null;
    let Na__LeSnap__Ortho       = null;
    const Na__LeSnap__QUEUE_EVENT = 'na-layouteditor-snapshot-queue';
    let Na__LeSnap__Chain       = Promise.resolve();
    let Na__LeSnap__Outstanding = 0;       // <-- Renders queued but not yet finished; the only honest measure of "still drawing"
    let Na__LeSnap__ModelFp     = null;    // <-- Visibility-free model fingerprint, cached until the model or its toggles change
    let Na__LeSnap__PipelineFp  = null;    // <-- The projection pipeline's own fingerprint, cached the same way
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Queue a Render Behind Any Other
    // ------------------------------------------------------------
    // COUNTED IN AND OUT, so anything watching can tell a sheet that is still
    // drawing from one that has finished. The count is the only honest answer
    // to that question: a duration is a guess, and a viewport served from cache
    // never enters the queue at all, which is exactly the case a loading screen
    // must not sit through. Settled with then/then rather than finally so a
    // rejected render still counts itself out.
    function Na__LeSnap__Enqueue(task) {
        Na__LeSnap__Outstanding += 1;
        Na__LeSnap__AnnounceQueue();
        const run = Na__LeSnap__Chain.then(task);
        Na__LeSnap__Chain = run.catch(() => {});
        const settle = () => { Na__LeSnap__Outstanding = Math.max(0, Na__LeSnap__Outstanding - 1); Na__LeSnap__AnnounceQueue(); };
        run.then(settle, settle);
        return run;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Say How Deep the Queue Is
    // ------------------------------------------------------------
    function Na__LeSnap__AnnounceQueue() {
        window.dispatchEvent(new CustomEvent(Na__LeSnap__QUEUE_EVENT, { detail : { outstanding : Na__LeSnap__Outstanding } }));
    }
    // ------------------------------------------------------------


    // FUNCTION | How Many Renders Are Queued or Running
    // ------------------------------------------------------------
    function Na__LeSnap__GetOutstanding() { return Na__LeSnap__Outstanding; }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Live Pipeline State
    // ------------------------------------------------------------
    function Na__LeSnap__Pipeline() {
        return Na__LeSnap__PipelineRef ? Na__LeSnap__PipelineRef.current : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Module's Own Orthographic Camera, Framed on a Window
    // ------------------------------------------------------------
    // window: { CentreX, CentreY, WidthMm, HeightMm } in drawing millimetres
    // ------------------------------------------------------------
    function Na__LeSnap__FrameOrtho(definition, windowMm) {
        if (!Na__LeSnap__Ortho) {
            Na__LeSnap__Ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1000);
            Na__LeSnap__Ortho.name = 'Na__LayoutEditor__SnapshotCamera';
        }
        const camera = Na__LeSnap__Ortho;
        const halfW  = Na__Math__ConvertMmToUnits(windowMm.WidthMm  / 2);
        const halfH  = Na__Math__ConvertMmToUnits(windowMm.HeightMm / 2);
        camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH;
        camera.zoom = 1;

        if (definition.Kind === Na__PlView__KIND_PLAN) {
            const setup = Na__FpCfg__GetCameraSetup();
            const eyeX  = Na__Math__ConvertMmToUnits(windowMm.CentreX);
            const eyeZ  = Na__Math__ConvertMmToUnits(windowMm.CentreY);           // <-- Drawing y down is world Z
            const eyeY  = Na__Math__ConvertMmToUnits(Na__FpData__GetCutHeightMm(definition.Record)) + setup.heightAboveCutUnits;
            camera.near = setup.nearUnits; camera.far = setup.farUnits;
            camera.position.set(eyeX, eyeY, eyeZ);
            camera.up.set(0, 0, -1);
            camera.lookAt(eyeX, eyeY - 1, eyeZ);
        } else {
            const setup  = Na__ElevCfg__GetCameraSetup();
            const axes   = Na__ElevData__GetAxes(definition.Record);
            const runU   = Na__Math__ConvertMmToUnits(windowMm.CentreX);
            const height = Na__Math__ConvertMmToUnits(-windowMm.CentreY);          // <-- Drawing y down is minus height
            const planeU = Na__Math__ConvertMmToUnits(Na__ElevData__GetPlaneDistanceMm(definition.Record));
            const eyeD   = planeU + setup.standOffUnits;
            camera.near = setup.nearUnits; camera.far = setup.farUnits;
            camera.position.set((axes.rightX * runU) + (axes.normalX * eyeD), height, (axes.rightZ * runU) + (axes.normalZ * eyeD));
            camera.up.set(0, 1, 0);
            camera.lookAt((axes.rightX * runU) + (axes.normalX * planeU), height, (axes.rightZ * runU) + (axes.normalZ * planeU));
        }
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        return camera;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put the Drawing's Cut on the Section Adapter
    // ------------------------------------------------------------
    function Na__LeSnap__ApplyCut(definition) {
        const record = definition.Record;
        if (definition.Kind === Na__PlView__KIND_PLAN) {
            Na__DrawView__SectionAdapter__UpsertHorizontalPlane(Na__LeSnap__CUT_ID, Na__FpData__GetCutHeightMm(record), Na__FpData__GetViewDepthMm(record));
            Na__DrawView__SectionAdapter__SetActivePlane(Na__LeSnap__CUT_ID);
            return true;
        }
        if (!Na__ElevData__IsSection(record)) return false;
        const axes = Na__ElevData__GetAxes(record);
        Na__DrawView__SectionAdapter__UpsertVerticalPlane(Na__LeSnap__CUT_ID, axes.normalX, axes.normalZ, Na__ElevData__GetPlaneDistanceMm(record), Na__ElevData__GetViewDepthMm(record));
        Na__DrawView__SectionAdapter__SetActivePlane(Na__LeSnap__CUT_ID);
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Register the Render Context
    // ------------------------------------------------------------
    function Na__LeSnap__Initialize(context) {
        if (!context || !context.renderer || !context.scene || !context.camera) return false;
        Na__LeSnap__Renderer    = context.renderer;
        Na__LeSnap__Scene       = context.scene;
        Na__LeSnap__Camera      = context.camera;
        Na__LeSnap__Controls    = context.controls || null;
        Na__LeSnap__PipelineRef = context.pipelineRef || null;
        Na__LeSnap__ModelRoot   = context.modelRoot || null;
        Na__LeSnap__ResetFingerprints();
        window.addEventListener('na-model-visibility-changed', Na__LeSnap__ResetFingerprints);   // <-- Toggles change what a drawing shows
        return true;
    }
    function Na__LeSnap__IsReady() { return !!Na__LeSnap__Renderer; }
    // ------------------------------------------------------------


    // FUNCTION | The Model Root a Viewport Is Drawn From
    // ------------------------------------------------------------
    // modelSourceId is TrueVision3D's design phase (a viewport's Model Source
    // renderId; null is the live model). ValeVision3D has no design phases
    // (DR-09), so every viewport is drawn from the live model root.
    // ------------------------------------------------------------
    function Na__LeSnap__GetModelRoot(modelSourceId) { return Na__LeSnap__ModelRoot; }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Visibility-Free Model Fingerprint of a Described Model
    // ------------------------------------------------------------
    // Names, triangle counts and - where the loader stamped them - what the
    // GLBs under each category held. Counts alone cannot see a thing that
    // moved. The stamp is appended only where there is one, so a model loaded
    // without stamps keeps the key it always had.
    // ------------------------------------------------------------
    function Na__LeSnap__ModelHash(described) {
        return Na__PlView__Hash(JSON.stringify(described.Categories.map((c) => (c.stamp ? [ c.name, c.tris, c.stamp ] : [ c.name, c.tris ]))));
    }
    // ------------------------------------------------------------


    // FUNCTION | Model Fingerprints, Computed Once and Held Until the Model Changes
    // ------------------------------------------------------------
    // Describing the model walks every mesh, so the viewports must not ask
    // for it on every refresh. The model one ignores category visibility
    // (a snapshot re-reads the scene's own layer map); the pipeline one is
    // exactly what the projection cache keys use.
    //
    // modelSourceId (optional) is TrueVision3D's design phase. ValeVision3D
    // has no design phases (DR-09): both answer for the live model whatever
    // it says, so every key is the one it always was.
    // ------------------------------------------------------------
    function Na__LeSnap__GetModelFingerprint(modelSourceId) {
        if (Na__LeSnap__ModelFp === null) {
            const described = Na__PlStage__Describe(Na__LeSnap__ModelRoot);
            Na__LeSnap__ModelFp = Na__LeSnap__ModelHash(described);
        }
        return Na__LeSnap__ModelFp;
    }
    function Na__LeSnap__GetPipelineFingerprint(modelSourceId) {
        if (Na__LeSnap__PipelineFp === null) Na__LeSnap__PipelineFp = Na__PlStage__Describe(Na__LeSnap__ModelRoot).Fingerprint;
        return Na__LeSnap__PipelineFp;
    }
    function Na__LeSnap__ResetFingerprints() {
        Na__LeSnap__ModelFp    = null;
        Na__LeSnap__PipelineFp = null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Where a Drawing's Content Is, in Drawing Millimetres
    // ------------------------------------------------------------
    // The author's saved framing when there is one, else the model's centre.
    // ------------------------------------------------------------
    function Na__LeSnap__DrawingCentreMm(definition) {
        const record = definition.Record;
        const box    = Na__LeSnap__ModelRoot ? new THREE.Box3().setFromObject(Na__LeSnap__ModelRoot) : null;
        const centre = (box && !box.isEmpty()) ? box.getCenter(new THREE.Vector3()) : null;
        if (definition.Kind === Na__PlView__KIND_PLAN) {
            const saved = Na__FpData__GetSavedView(record);
            if (saved.targetXMm !== null && saved.targetZMm !== null) return { x : saved.targetXMm, y : saved.targetZMm };
            return centre ? { x : Na__Math__ConvertUnitsToMm(centre.x), y : Na__Math__ConvertUnitsToMm(centre.z) } : { x : 0, y : 0 };
        }
        const saved = Na__ElevData__GetSavedView(record);
        if (saved.runMm !== null && saved.heightMm !== null) return { x : saved.runMm, y : -saved.heightMm };
        if (!centre) return { x : 0, y : 0 };
        const axes = Na__ElevData__GetAxes(record);
        const run  = (centre.x * axes.rightX) + (centre.z * axes.rightZ);
        return { x : Na__Math__ConvertUnitsToMm(run), y : -Na__Math__ConvertUnitsToMm(centre.y) };
    }
    // ------------------------------------------------------------


    // MODULE CONSTANTS | The Model Categories a Drawing Calls Context
    // ------------------------------------------------------------
    // Everything that is not the design itself: what the proposal stands in
    // and against. The proposal, its doors and the interior dressing are
    // never touched.
    // ------------------------------------------------------------
    const Na__LeSnap__CONTEXT_CATEGORIES = [
        'ValeVision__MainBuildingModel__Existing',
        'ValeVision__SiteBoundaries',
        'ValeVision__LandscapeEnvironment',
        'ValeVision__Vegetation',
        'ValeVision__SiteVegetation2D',
        'ValeVision__SceneEntourage2D',
        'ValeVision__SceneEntourageSilhouette',
        'ValeVision__SceneContextual'
    ];
    // ------------------------------------------------------------


    // HELPER FUNCTION | Take Out of the Picture Whatever This Viewport Hides
    // ------------------------------------------------------------
    // Two rules, one capture. Context Layer off removes the whole surrounding
    // set in one gesture; the Model Layers panel removes named categories one
    // at a time. They compose - a viewport can drop the context AND the
    // proposal's furniture - and the single captured map puts all of it back.
    //
    // Returns the visibility map to restore afterwards, or null when the
    // viewport hides nothing and the scene was never touched.
    // ------------------------------------------------------------
    function Na__LeSnap__HideForViewport(styles, modelLayers) {
        const wantsContext = !!styles && styles.contextLayer === false;
        const hidden       = modelLayers ? Object.keys(modelLayers).filter((key) => modelLayers[key] === false) : [];
        if (!wantsContext && hidden.length === 0) return null;

        // SILENT, BOTH OF THEM. Every hide here is put back before the render
        // returns, so announcing it would only make the linework pipeline
        // re-evaluate and the fingerprints reset in the middle of the render
        // that caused it.
        const saved = Na__ModelToggle__CaptureVisibilityMap();
        if (wantsContext) Na__LeSnap__CONTEXT_CATEGORIES.forEach((key) => Na__ModelToggle__SetCategoryVisibility(key, false, true));
        hidden.forEach((key) => Na__ModelToggle__SetCategoryVisibility(key, false, true));
        return saved;
    }
    // ------------------------------------------------------------


    // FUNCTION | Render a 2D Drawing Window Offscreen
    // ------------------------------------------------------------
    // Returns { dataUrl, widthPx, heightPx } (png), or null.
    //
    // weights is { profilePx, sectionPx, modelEdgePx } from the viewport's Render
    // Composites, or null for the configured widths. All three are screen-space
    // widths - the profile pass's sampling width, the cut outline's line material
    // and the model's own edge materials - so they are set for the length of this
    // one render and put back afterwards. Each goes in through the system that
    // owns it, so ValeVision's export line-width compensation still applies on top.
    //
    // modelSourceId is TrueVision3D's design phase (a viewport's Model Source
    // renderId). It is taken in TrueVision3D's position and not used:
    // ValeVision3D has no design phases (DR-09), so the live model is drawn and
    // every caller hands null.
    //
    // stillWanted: optional. Asked when this render's turn in the queue comes;
    // false answers null and nothing is drawn (a viewport whose sheet has been
    // left meanwhile). The PDF and the forced renders never pass it.
    //
    // depthFog: optional, TrueVision3D's depth fog source, which asks for the
    // viewport's fog image instead of its picture. ValeVision3D draws no depth
    // fog yet, so a fog source answers null - no fog image - and nothing is
    // queued: the picture must never stand in for its fog. Left out, this is
    // the picture, as always.
    // ------------------------------------------------------------
    function Na__LeSnap__Render2d(definition, windowMm, styles, widthPx, heightPx, modelLayers, antiAliasSamples, weights, modelSourceId, stillWanted, depthFog) {
        if (!Na__LeSnap__IsReady() || !definition) return Promise.resolve(null);
        // guard removed                               // <-- A fog image is asked for, and none can be drawn here yet
        return Na__LeSnap__Enqueue(async () => {
            if (typeof stillWanted === 'function' && !stillWanted()) return null;  // <-- Nobody is waiting for it any more (its sheet was left meanwhile): the queue moves on. The PDF and the forced renders never pass it
            const wasSuspended = Na__DrawView__Transitions__IsSuspended();
            const pipeline     = Na__LeSnap__Pipeline();
            const pass         = pipeline && pipeline.profileLinesPassRef ? pipeline.profileLinesPassRef : null;
            const passWasOn    = pass ? pass.enabled : null;                       // <-- The preset's exit forces it on; the 3D toggle owns it
            let cutApplied = false;
            const wantProfile = !!weights && Number.isFinite(weights.profilePx)   && weights.profilePx   > 0;
            const wantSection = !!weights && Number.isFinite(weights.sectionPx)   && weights.sectionPx   > 0;
            const wantEdges   = !!weights && Number.isFinite(weights.modelEdgePx) && weights.modelEdgePx > 0;
            let   sectionWas  = null;
            let   edgesSet    = false;
            let contextSaved = null;                                               // <-- Visibility to put back when the context was hidden
            const lightingWas = Na__SceneLighting__GetLive();                      // <-- The light a 3D scene may have left on; put back after
            try {
                // A DRAWING IS ALWAYS LIT BY THE DEFAULT, as it is in the viewer,
                // where every flight into a drawing eases the lights back to it.
                // Without this the underlay would be shaded by whichever scene the
                // viewer last stood in, and two renders of one drawing could differ.
                Na__SceneLighting__ApplyDefaults({ requestRender : false });
                Na__DrawView__SectionAdapter__SuspendLiveTool();
                // THE OUTLINE WIDTH GOES IN BEFORE THE CUT IS BUILT, so the cut's
                // outline is drawn at this viewport's width, and comes back out
                // after the live tool is handed back (see the finally).
                if (wantSection) {
                    sectionWas = Na__CrossSection__GetAppearance().lineWidthPx;
                    Na__CrossSection__SetLineWidth(weights.sectionPx);
                }
                cutApplied = Na__LeSnap__ApplyCut(definition);
                const camera = Na__LeSnap__FrameOrtho(definition, windowMm);
                if (!wasSuspended) Na__DrawView__Transitions__SuspendThreeD();     // <-- Distance culling off for the picture
                Na__DrawView__RenderPreset__Enter({ camera : camera, styles : styles || {}, edgeWidthPx : wantProfile ? weights.profilePx : null });
                if (wantEdges) {
                    Na__LineworkSettings__SetLineworkBaseOverride(weights.modelEdgePx);   // <-- The tiled renderer's export scale multiplies it, so it survives the tile setup
                    edgesSet = true;
                }
                Na__DrawView__MaterialPreset__Enter(styles || {});
                contextSaved = Na__LeSnap__HideForViewport(styles, modelLayers);
                Na__DrawView__SectionAdapter__ReapplyClipping();
                const result = await Na__StaticExport__RenderToCanvas({
                    renderer : Na__LeSnap__Renderer, scene : Na__LeSnap__Scene, camera : Na__LeSnap__Camera,
                    getRenderPipelineState : () => Na__LeSnap__Pipeline(),
                    elevationOverrides     : Na__DrawView__RenderPreset__GetExportOverrides(),
                    antiAliasSamples       : antiAliasSamples,                                                            // <-- Each tile drawn N times on sub-pixel jitter and averaged
                    targetWidth : Math.max(16, Math.round(widthPx)), targetHeight : Math.max(16, Math.round(heightPx))
                });
                if (styles && styles.enhanceWhitecard === true) await Na__LeEnhance__Apply(result.canvas);   // <-- Levels and sharpen: the whitecard greys go to paper white
                return { dataUrl : result.canvas.toDataURL('image/png'), widthPx : result.width, heightPx : result.height };
            } catch (renderError) {
                console.warn('[ValeVision3D LayoutEditor] 2D underlay render failed:', renderError);
                return null;
            } finally {
                if (edgesSet) Na__LineworkSettings__SetLineworkBaseOverride(null);                   // <-- Every edge material back to its own base width
                if (contextSaved) Na__ModelToggle__ApplySceneLayerVisibility(contextSaved);
                Na__DrawView__MaterialPreset__Exit();
                Na__DrawView__RenderPreset__Exit();
                if (pass && passWasOn !== null) pass.enabled = passWasOn;
                if (cutApplied) Na__DrawView__SectionAdapter__RemovePlane(Na__LeSnap__CUT_ID);
                Na__DrawView__SectionAdapter__Release();
                if (sectionWas !== null) Na__CrossSection__SetLineWidth(sectionWas);                  // <-- After the release, so the author's sections end at their own width
                if (!wasSuspended) Na__DrawView__Transitions__ResumeThreeD();
                if (lightingWas) Na__SceneLighting__Apply(lightingWas, { requestRender : false });   // <-- The light the viewport had before this picture
                Na__RenderLoop__RequestRender();
            }
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Render a Saved Scene Offscreen With the Viewport's Styles
    // ------------------------------------------------------------
    // Returns { canvas, widthPx, heightPx }, or null. The caller converts.
    //
    // weights is { modelEdgePx } or null. The model's own edges are the one
    // composite width a scene render has: its profile outline is the composer's
    // own distance-scaled effect, and the Section Outline weight belongs to a 2D
    // drawing's cut.
    //
    // modelSourceId: as Render2d - TrueVision3D's design phase, taken in its
    // position (before the view window) and not used.
    //
    // viewWindow: null for the camera's whole picture, or { u0, v0, u1, v1 } -
    // the part of it a zoomed or slid 3D viewport's frame shows, as fractions
    // of the picture that may run past 0..1 (Na__LayoutEditor__Viewport3d__).
    // widthPx and heightPx are then the window's pixels, and the tiled renderer
    // draws that window of the scene's own camera.
    //
    // stillWanted: as Render2d.
    // ------------------------------------------------------------
    function Na__LeSnap__Render3d(sceneRecord, styles, widthPx, heightPx, modelLayers, antiAliasSamples, weights, modelSourceId, viewWindow, stillWanted) {
        if (!Na__LeSnap__IsReady() || !sceneRecord) return Promise.resolve(null);
        return Na__LeSnap__Enqueue(async () => {
            if (typeof stillWanted === 'function' && !stillWanted()) return null;  // <-- As Render2d: a render nobody is waiting for is skipped
            const camera   = Na__LeSnap__Camera;
            const controls = Na__LeSnap__Controls;
            const pipeline = Na__LeSnap__Pipeline();
            const pass     = pipeline && pipeline.profileLinesPassRef ? pipeline.profileLinesPassRef : null;
            const saved = {
                position   : camera.position.clone(),
                quaternion : camera.quaternion.clone(),
                fov        : camera.fov,
                zoom       : camera.zoom,
                target     : controls ? controls.target.clone() : null,
                visibility : Na__ModelToggle__CaptureVisibilityMap(),
                sections   : Na__CrossSection__SerializeSections(),
                lighting   : Na__SceneLighting__GetLive(),                     // <-- The pose below lights the model the scene's way; this puts the viewer's back
                passOn     : pass ? pass.enabled : null
            };
            let edgesSet = false;
            try {
                Na__PresentationMode__Camera__ApplySceneCameraState(camera, controls, sceneRecord);
                Na__DrawView__MaterialPreset__Enter(styles || {});
                Na__LeSnap__HideForViewport(styles, modelLayers);                                   // <-- The saved map above already puts it back
                if (pass) pass.enabled = !(styles && styles.profileLinework === false);
                if (weights && Number.isFinite(weights.modelEdgePx) && weights.modelEdgePx > 0) {
                    Na__LineworkSettings__SetLineworkBaseOverride(weights.modelEdgePx);
                    edgesSet = true;
                }
                const result = await Na__StaticExport__RenderToCanvas({
                    renderer : Na__LeSnap__Renderer, scene : Na__LeSnap__Scene, camera : camera,
                    getRenderPipelineState : () => Na__LeSnap__Pipeline(),
                    antiAliasSamples       : antiAliasSamples,                                                            // <-- Each tile drawn N times on sub-pixel jitter and averaged
                    viewWindow             : viewWindow || null,                                                          // <-- What a zoomed or slid viewport's frame shows of the picture; null is all of it
                    targetWidth : Math.max(16, Math.round(widthPx)), targetHeight : Math.max(16, Math.round(heightPx))
                });
                if (styles && styles.enhanceWhitecard === true) await Na__LeEnhance__Apply(result.canvas);
                return { canvas : result.canvas, widthPx : result.width, heightPx : result.height };
            } catch (renderError) {
                console.warn('[ValeVision3D LayoutEditor] 3D snapshot render failed:', renderError);
                return null;
            } finally {
                if (edgesSet) Na__LineworkSettings__SetLineworkBaseOverride(null);
                Na__DrawView__MaterialPreset__Exit();
                if (pass && saved.passOn !== null) pass.enabled = saved.passOn;
                camera.position.copy(saved.position);
                camera.quaternion.copy(saved.quaternion);
                camera.fov  = saved.fov;
                camera.zoom = saved.zoom;
                camera.updateProjectionMatrix();
                if (controls && saved.target) { controls.target.copy(saved.target); controls.update(); }
                Na__ModelToggle__ApplySceneLayerVisibility(saved.visibility);
                Na__CrossSection__ApplySerializedSections(saved.sections);
                if (saved.lighting) Na__SceneLighting__Apply(saved.lighting, { requestRender : false });
                Na__RenderLoop__RequestRender();
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Layout Editor Snapshot Renderer API
    // ------------------------------------------------------------
    export {
        Na__LeSnap__QUEUE_EVENT,
        Na__LeSnap__GetOutstanding,
        Na__LeSnap__Initialize,
        Na__LeSnap__IsReady,
        Na__LeSnap__GetModelRoot,
        Na__LeSnap__GetModelFingerprint,
        Na__LeSnap__GetPipelineFingerprint,
        Na__LeSnap__ResetFingerprints,
        Na__LeSnap__DrawingCentreMm,
        Na__LeSnap__Render2d,
        Na__LeSnap__Render3d
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
