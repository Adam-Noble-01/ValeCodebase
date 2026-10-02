// =============================================================================
// VALEVISION3D - APP FLOW - LOADING SEQUENCE
// =============================================================================
//
// FILE       : Na__AppFlow__LoadingSequence.js
// NAMESPACE  : Na__AppFlow
// MODULE     : LoadingSequence
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Main scene loading sequence, render loop, and resize handler
// CREATED    : 24-Feb-2026
//
// DESCRIPTION:
// - Initialises scene lighting and the render pipeline composer.
// - Resolves model URLs from the URL query parameter or config defaults.
// - On localhost, overlays the editor-owned keys (the app config's
//   ProjectData__EditorOwnedKeys) from R2 onto the local server's copy of
//   project.json, and registers the project data it runs with the transport
//   facade (Na__CfApi) before anything is dispatched.
// - Loads the OrbitHelperCube GLB and sets the orbit target from its centre.
// - Re-applies any saved camera / orbit target values from project.json.
// - Boot camera pose (position/rotation/FOV) AND the resting orbit target
//   always come from the launch scene when one exists, so the initial view
//   frames the exact SketchUp shot. The OrbitHelperCube becomes the orbit
//   PIVOT only on the first rotation afterwards, via the interaction swap
//   (Na__Navmode__OrbitPivot__InteractionSwap) — for SketchUp Cloud Sync
//   scenes. Explicit, human-authored PresentationMode scenes keep their own
//   deliberately placed orbit target (see ShouldUseSceneOrbitTarget).
// - Loads all scene models via the multi-model loader.
// - Runs the PBR materials second-pass if the materials system is enabled.
// - Reveals the scene and dispatches na-app-scene-ready (once per load) when
//   the models are on screen.
// - Initialises door animations and walk-mode collision meshes.
// - Starts the RAF render loop (including walk mode, door proximity updates).
// - Switches the interactive overlays (authoring aids such as the drawing
//   planes) on for the live 3D frame only - never on a 2D drawing, never in
//   a Video Studio preview - and off again as every frame ends.
// - Ends every frame by arming what comes next, whatever the frame did: a
//   frame that throws is reported and the loop carries on; a held engine (a
//   Layout Editor sheet) paints nothing and asks for nothing; a progressive
//   refinement that stops getting anywhere for 2.5 s restarts itself and
//   says what it found, and a part-finished one left with nothing
//   scheduled is picked up again a second later.
// - Attaches the window resize handler.
//
// Context Object (Na__AppFlow__StartLoadingSequence argument):
// - scene, camera, renderer, controls, modelRoot, lineResolution, showToast
// - updateNavigation  : orbit controls update function from nav bundle
// - pipelineRef       : { current: null } mutable ref - module writes pipeline state here
// - configs           : lightingConfig, groundPlane, profileLines, models,
//                       modelUrls, materialsSystem, doorAnimation,
//                       orbitHelperCubeDebugVisible
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/01__AppCore/Na__AppFlow__LoadingSequence.js - hunks only: the
//                   localhost R2 overlay of the editor-owned keys and the transport facade's merge base (TrueVision3D
//                   v2.7.1), sceneConfig in the drawings dispatch (v2.21.0), na-app-scene-ready (v2.8.0), the
//                   interactive overlay frame - BeginFrame on the 3D path, EndFrame in the tick's finally (v2.82.0)
//                   - and the render loop's guards: the engine-hold stand-down, the thrown-frame guard,
//                   ArmNextFrame with the stranded-burst recovery, the 2.5 s refinement watchdog and no
//                   timestamp passed to planFrame (v2.58.2); the rest of the file is ValeVision's own
// - Source version: 1.3.1 (TrueVision3D v2.161.0, 28-Sep-2026; read at HEAD b2aa9151)
// - Ported on     : 01-Oct-2026 for ValeVision3D v2.71.1; the interactive overlay frame 01-Oct-2026 for
//                   ValeVision3D v2.71.2; the render loop's guards 02-Oct-2026 for ValeVision3D {{VVREL:W2-07}}
// - Parity        : diverged (two independent lines since 24-Feb-2026, TrueVision 1.3.1 and ValeVision 1.7.x: never
//                   taken whole; TrueVision's hunks are replayed into ValeVision's sequence)
// - Divergences   :
//   - ValeVision's own sequence: dual render engine, resilient loads and the load watchdog, the SketchUp launch
//     scene and orbit pivot swap, cross-section, Video Studio and fog-plane wiring, the 2D drawing branch of the
//     render loop. Not taken from TrueVision: model groups and the design-phase library (1.3.0; DR-09 - the
//     library is at TrueVision's path but this sequence never initialises it), the legacy project fetch, the
//     PWA project-name refinement, its fog effect, and its per-project cull distance and FOV overrides.
//   - The interactive overlay frame begins only while Video Studio's preview is not playing (DR-32), so
//     authoring overlays stay out of the preview as they stay out of every export; TrueVision has no Video
//     Studio.
//   - The engine hold is ValeVision's (K2 E2): the pause and resume events feed this sequence's own hold
//     set, ScheduleFrame refuses while it holds a reason, and the pause listener cancels a pending frame and
//     the refinement wake-up. TrueVision's stand-down at the top of RenderFrame asks that set as well as
//     Na__RenderLoop__IsPaused (whose mirror also holds a pause taken before these listeners existed), and
//     remembers the frame, because ValeVision's resume paints one frame only when one was asked for
//     meanwhile; TrueVision's Resume always asks for one. The tick no longer checks the hold itself:
//     TrueVision's shape, every tick ending in ArmNextFrame. The watchdog's held flag reports either hold.
//   - The transport facade is ValeVision's (DIV-4): Na__CfApi__Initialize is async and is started here, with the
//     app config, once the master index has settled; TrueVision's Index.html starts it with its Worker URL.
//   - The overlay list is the app config's ProjectData__EditorOwnedKeys - the one list the sync tools and the
//     Worker's merge-keys guard read too - not a constant in this file; it overlays the local server's copy, waits
//     at most the fetch timeout, is skipped when the list is absent or R2's copy names another projectCode, and
//     names the keys R2 changed.
//   - The merge base is registered only when a project is open, before the first project dispatch.
//   - Dispatch order and keys stay ValeVision's: the drawings block goes before the scenes, { block, projectCode }
//     plus TrueVision's sceneConfig; the section bindings keep { sceneData } and are sent only when present (DIV-2).
// - Back-port     : the bounded overlay wait (TrueVision's overlay read has no time limit) and the two editor-owned
//                   keys its overlay list lacks (CrossSection__SceneData, LayoutEditor__DrawingRegister) - offered
//                   with the TrueVision lane (DR-36), not done here.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.7.3 (the progressive-render loop guards, {{VVREL:W2-07}})
// - The rest of TrueVision v2.58.2's render-loop fix (its EnsureBuffer floor
//   came across at ValeVision3D v2.54.0). Every tick now ends in
//   Na__RenderLoop__ArmNextFrame, from a finally: a frame that throws is
//   reported ("Render frame failed; the loop carries on") instead of
//   taking the loop down, and no early return can abandon a refinement
//   burst. A part-finished burst left with nothing scheduled restarts after
//   1 s, and Na__RenderLoop__WatchRefineProgress restarts a burst whose
//   sample count has not moved for 2.5 s and logs what it found (count,
//   what the refiner asked for, frame rate, composer buffer size, pixel
//   ratios, active reasons, hold, visibility).
// - The engine hold stands the refiner down at the top of RenderFrame
//   (Na__RenderLoop__IsPaused or this sequence's own hold set): a held
//   engine paints nothing and asks for nothing - a hold taken before the
//   loop's listeners existed included - and the resume paints one frame.
//   The tick's own hold check moved there.
// - planFrame is passed no timestamp: the refiner reads performance.now()
//   itself (ProgressiveRefine 1.0.2).
//
// 01-Oct-2026 - Version 1.7.2 (interactive overlay frame, v2.71.2)
// - The render loop brackets the live 3D frame for the interactive overlays
//   (Na__RenderLoop__InteractiveOverlays__, TrueVision v2.82.0): BeginFrame
//   straight after the 2D drawing branch unless Video Studio's preview is
//   playing, and EndFrame in a finally round RenderFrame, so every frame
//   ends it, a thrown one included. With nothing registered both calls touch
//   nothing and every frame draws exactly as before.
//
// 01-Oct-2026 - Version 1.7.1 (TrueVision transport wiring, v2.71.1)
// - Starts the transport facade (Na__CfApi__Initialize, with the app config)
//   once the master index has settled.
// - On localhost, overlays the app config's ProjectData__EditorOwnedKeys from
//   R2 onto the local server's copy of project.json before anything reads it
//   (TrueVision's Na__DevSavedKeys overlay, v2.7.1): R2 is the source of
//   truth for the keys the editor writes. Waits at most the fetch timeout,
//   refuses an R2 copy that names another project, is never fatal, and logs
//   which keys R2 changed.
// - Registers the project data the session runs with
//   Na__CfApi__SetLoadedProjectData before the first project dispatch.
// - na-layouteditor-drawingsdata-loaded also carries sceneConfig (the raw
//   presentation block), as TrueVision's does (v2.21.0).
// - Dispatches na-app-scene-ready at the end of ShowScene, once the canvas is
//   visible (TrueVision v2.8.0).
// - DEVELOPMENT LOG re-ordered newest first, TrueVision's direction (the
//   text of every entry is unchanged).
//
// 28-Sep-2026 - Per-scene lighting (v2.71.0)
// - The lighting setup also receives the app config's Scene__PerSceneLighting
//   block, and hands both lights to Na__Scene__PerSceneLighting__.
//
// 09-Sep-2026 - Projected linework overlay sync (port Phase 4)
// - The drawing branch registers the linework overlay to the drawing camera every frame.
//
// 09-Sep-2026 - Elevation resize hook (port Phase 3)
// - Resize also corrects the elevation ortho camera and its markup layers.
//
// 09-Sep-2026 - Version 1.7.0 (port Phase 2)
// - Dispatches na-layouteditor-drawingsdata-loaded with the project's
// - LayoutEditor__DrawingsData block (null when absent).
// - Render loop: a 2D drawing branch ahead of the 3D work, rendered by the
// - drawing composer preset; resize hands off to the floor plan controller.
//
// 10-Jul-2026 - Version 1.5.3
// - Corrected orbit-pivot handling. The resting view must frame the exact
//   SketchUp shot, which means controls.target MUST hold the scene's own
//   camera.target at rest (OrbitControls runs camera.lookAt(target) every
//   frame, so leaving the cube as the target aimed the camera AT the cube and
//   discarded the SketchUp look direction — the mis-framing seen on
//   2026/63853__Bia). The OrbitHelperCube is now applied as the orbit PIVOT
//   only on the first rotation after a scene is framed, via the new
//   Na__Navmode__OrbitPivot__InteractionSwap module (Init + SetPivot + Arm
//   here at boot; carousel card/prev/next arm it too). SketchUp-derived scenes
//   arm the swap; explicit authored scenes keep their own target as the pivot.
//   Supersedes the short-lived applyOrbitTarget-gating approach.
//
// 09-Jul-2026 - Version 1.5.2
// - Single/zero-scene orbit pivot fix: boot camera apply now passes
//   applyOrbitTarget: Na__SketchUp__AnimationScene__ShouldUseSceneOrbitTarget(...)
//   into ApplySceneCameraState. Projects with fewer than 2 SketchUp scenes (and
//   no explicit PresentationMode scenes) no longer have their OrbitHelperCube /
//   saved OrbitHelperCube__Position target silently overridden by the single
//   scene's camera.target — camera position/rotation/FOV still apply as before.
//   Carousel-eligible projects (>=2 scenes, or explicit scenes) are unaffected.
//
// 01-Jul-2026 - Version 1.5.1
// - Boot camera apply now also re-applies the launch scene's
//   PresentationMode__Scene__ModelLayerVisibility (via
//   Na__ModelToggle__ApplySceneLayerVisibility) right after
//   InitializeModelToggleControls, since the toggle state map does not exist
//   yet at the earlier ApplySceneCameraState call.
//
// 25-Jun-2026 - Version 1.5.0
// - Master index: calls Na__AppUtils__InitMasterIndex early in the sequence and
//   awaits it before FetchProjectJson so year/folderId resolution is ready.
// - SketchUp auto-animation: when project.json has ValeVison3D__SketchUpCameraData
//   but no explicit PresentationMode__SavedCameraScenes, delegates to
//   Na__SketchUp__AnimationScene__TryBuildScenesFromSketchUp (DataBridge) to
//   build scenes and dispatch na-presentation-mode-scenes-loaded.
//
// 16-Jun-2026 - Version 1.4.1
// - Camera-follow billboards: collection now scans ALL loaded categories for
//   billboard nodes instead of restricting to a SiteVegetation2D category
//   token. The baked GLB node extras (type === "CameraFollowBillboard") are the
//   true source of truth, so billboards animate regardless of which category
//   GLB file the exporter bundled them into (e.g. when range 9 falls back into
//   the LandscapeEnvironment file).
//
// 11-Jun-2026 - Version 1.4.0
// - Presentation Mode: reads PresentationMode__SavedCameraScenes from project.json
//   and dispatches 'na-presentation-mode-scenes-loaded' with sceneConfig + projectCode
//   when the section is present, enabled, and contains at least one valid scene.
//   Projects without this section are unaffected.
//
// 11-Jun-2026 - Version 1.3.0
// - PWA stability fix: imports Na__ResilientLoad__ and Na__LoadWatchdog__ modules.
// - Watchdog started at beginning of sequence; cleared inside ShowScene.
// - Na__UiFeature__ShowLoadError added: transitions overlay to error state with
//   Retry button on any load failure (orbit cube, project JSON, all models).
// - project.json failure with ?project= now calls ShowLoadError (stops sequence)
//   instead of silently falling back to the Clough default model.
// - Model load catch block replaced with ShowLoadError call.
// - Orbit cube and all GLB loads pass resilienceConfig through to bounded helpers.
// - LoadAllModels receives a status+progress wrapper so watchdog stall clock resets
//   on each file.
//
// 10-Jun-2026 - Version 1.2.1
// - Door animation init now uses token-based category collection (TrueVision
//   parity): matches CategoryNameTokens against loaded Map keys and resolves
//   mesh/linework roots from children via userData.Na__ModelType. The previous
//   includes('MeshModel') key check could never match v4 category keys and is
//   removed. Multiple door categories (e.g. per-storey) all register.
//
// 10-Jun-2026 - Version 1.2.0
// - Dual render engine support: PureEngine (default, unchanged) vs MaxEngine
//   (PBR + SSAO, per-model opt-in via project.json RenderEngine__Config).
// - Engine-aware composer builder with live runtime switching
//   (na-render-engine-switch event) and engine-aware materials application
//   (PureEngine local library vs MaxEngine DataLib SSOT from GitHub).
// - RenderFrame gains optional MaxEngine calls: updateAoUniforms,
//   monitorAoFrame, renderDepthPrePass, and distance culling update.
// - Door animation init order unchanged (materials swap -> door registry scan)
//   so doors work identically under both engines.
//
// 09-Jun-2026 - Version 1.1.0
// - Added Fly Mode branch to RenderFrame (Na__FlyMode__Update + door proximity).
// - Reads Navmode__EnabledModes from project.json and forwards to
//   Na__NavigationModes__State for dynamic Tools menu and hotkey gating.
//   (21-Aug-2026: now forwarded unconditionally — an absent block means every
//    mode stays enabled, so the event must still fire to reveal the UI.)
//
// 24-Feb-2026 - Version 1.0.0
// - Extracted from index.html inline script block (lines 604-849).
// - Na__UiFeature__UpdateStatus and Na__UiFeature__ShowScene moved to private
//   module functions; both now use document.getElementById directly.
// - Na__AppFlow__StartLoadingSequence refactored to accept a context object
//   instead of closing over index.html scope variables.
// - Na__RenderPipeline__State written back to context.pipelineRef.current
//   so the ImageExportControls lazy getter in index.html can read it.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js GLTF Loader
    // ------------------------------------------------------------
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Pipeline Engines (PureEngine = default, MaxEngine = opt-in PBR)
    // ------------------------------------------------------------
    import { Na__RenderPipeline__PureEngine__SetupComposer } from '../05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js';
    import { Na__RenderPipeline__MaxEngine__SetupComposer } from '../05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Model Loader
    // ------------------------------------------------------------
    import {
        Na__ModelLoader__LoadAllModels,
        Na__ModelLoader__SeparateOrbitCubeUrl,
        Na__ModelLoader__LoadOrbitHelperCube
    } from '../15__ModelLoader/Na__ModelLoader__MultiModel.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Scene Lighting and Environment
    // ------------------------------------------------------------
    import {
        Na__Scene__SetupDefaultSceneLighting,
        Na__Scene__ApplyEnvironmentMap
    } from '../06__Scene__LightingEffects/Na__Scene__DefaultSceneLighting.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Engine State (PureEngine / MaxEngine selection)
    // ------------------------------------------------------------
    import {
        Na__RenderEngine__PURE,
        Na__RenderEngine__MAX,
        Na__RenderEngine__SetConfiguredEngine,
        Na__RenderEngine__SetActiveEngine,
        Na__RenderEngine__GetConfiguredEngine,
        Na__RenderEngine__GetActiveEngine
    } from '../05__RenderPipeline/Na__RenderEngine__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | DataLib Loader (SSOT materials data — MaxEngine only)
    // ------------------------------------------------------------
    import {
        Na__DataLib__LoadAll,
        Na__DataLib__GetMaterials
    } from './AppCore__DataLib__Loader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Distance Culling (MaxEngine only, config-gated)
    // ------------------------------------------------------------
    import {
        Na__DistanceCulling__Initialize,
        Na__DistanceCulling__RegisterModelGroups,
        Na__DistanceCulling__Update,
        Na__DistanceCulling__SetEnabled
    } from '../05__RenderPipeline/Na__RenderEffect__DistanceCulling__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Math Utils
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Camera Controls
    // ------------------------------------------------------------
    import { Na__UiFeature__ApplyCameraConfig } from '../11__CameraUtils/Na__UiFeature__CameraPosition__Controls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Materials System
    // ------------------------------------------------------------
    import { Na__MaterialsSystem__BuildLookup } from '../20__System__MaterialsSystem/Na__MaterialsSystem__LibraryLoader.js';
    import {
        Na__MaterialsSystem__ApplyMaterials,
        Na__MaterialsSystem__ApplyWhitecardToIndexedMaterials,
        Na__MaterialsSystem__ApplyExemptTextureBrightness,
        Na__MaterialsSystem__RestoreOriginalMaterials,
        Na__MaterialsSystem__ApplyMirrorEnvironmentOverrides,
        Na__MaterialsSystem__ApplyGlassEnvironmentOverrides
    } from '../20__System__MaterialsSystem/Na__MaterialsSystem__MaterialSwap.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Model Toggle Controls
    // ------------------------------------------------------------
    import {
        Na__UiFeature__InitializeModelToggleControls,
        Na__ModelToggle__ApplySceneLayerVisibility
    } from '../26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Door Animation System
    // ------------------------------------------------------------
    import {
        Na__DoorAnimation__Initialize,
        Na__DoorAnimation__Update,
        Na__DoorAnimation__HasActiveAnimations
    } from '../25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Camera Follow Billboard System
    // ------------------------------------------------------------
    import {
        Na__CameraFollow__Initialize,
        Na__CameraFollow__Update
    } from '../25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__CameraFollowBillboards__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Walk Mode System
    // ------------------------------------------------------------
    import {
        Na__WalkMode__IsActive,
        Na__WalkMode__Update,
        Na__WalkMode__SetCollisionMeshes,
        Na__WalkMode__GetCapsulePosition
    } from '../10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fly Mode System
    // ------------------------------------------------------------
    import {
        Na__FlyMode__IsActive,
        Na__FlyMode__Update,
        Na__FlyMode__GetCameraPosition
    } from '../10__NavigationAndCameras/Na__Navmode__FlyMode__SystemLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Door Proximity System
    // ------------------------------------------------------------
    import { Na__DoorProximity__Update } from '../25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Video Studio Preview Playback
    // @delegate: ../31__System__VideoStudio/Na__VideoStudio__Playback__PreviewController.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__Preview__IsPlaying,
        Na__VideoStudio__Preview__AreAnimationsEnabled,
        Na__VideoStudio__Preview__UpdateFrame
    } from '../31__System__VideoStudio/Na__VideoStudio__Playback__PreviewController.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Navigation Modes State
    // ------------------------------------------------------------
    import {
        Na__NavigationModes__SetEnabledModes,
        Na__NavigationModes__GetEnabledModes
    } from '../10__NavigationAndCameras/Na__NavigationModes__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Presentation Mode Scene Data (per-project saved camera scenes)
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__ProjectJson__HasValidSavedScenes,
        Na__PresentationMode__ProjectJson__GetSavedCameraScenes,
        Na__PresentationMode__ProjectJson__SetActiveImageList
    } from '../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Presentation Mode Camera Scene Transition (instant scene apply)
    // @delegate: ../21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js
    // ------------------------------------------------------------
    import {
        Na__PresentationMode__Camera__ApplySceneCameraState
    } from '../21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Camera Project Start State (Reset View canonical state)
    // ------------------------------------------------------------
    import { Na__CameraStartState__CaptureStartState } from '../10__NavigationAndCameras/Na__Camera__ProjectStartState.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Orbit Pivot Interaction Swap (cube pivot kicks in on first rotation)
    // @delegate: ../10__NavigationAndCameras/Na__Navmode__OrbitPivot__InteractionSwap.js
    // ------------------------------------------------------------
    import {
        Na__OrbitPivot__Init,
        Na__OrbitPivot__SetPivot,
        Na__OrbitPivot__Arm,
        Na__OrbitPivot__Disarm
    } from '../10__NavigationAndCameras/Na__Navmode__OrbitPivot__InteractionSwap.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Vertical Perspective Correction
    // ------------------------------------------------------------
    import { Na__VerticalCorrection__ApplyFrame } from '../11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Project Loader Utilities
    // ------------------------------------------------------------
    import {
        Na__AppUtils__IsRunningOnLocalhost,
        Na__AppUtils__GetProjectCodeFromUrl,
        Na__AppUtils__FetchProjectJson,
        Na__AppUtils__ExtractModelUrls,
        Na__AppUtils__InitFromConfig,
        Na__AppUtils__InitMasterIndex,
        Na__AppUtils__InitBuildManifest,
        Na__AppUtils__ResolveAssetUrl
    } from '../03__AppUtils/Na__AppUtils__ProjectLoader.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Cloudflare R2 API Client (source-of-truth project data)
    // @delegate: ../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js
    // ------------------------------------------------------------
    import {
        Na__CfApi__Initialize,
        Na__CfApi__IsConfigured,
        Na__CfApi__ReadProjectData,
        Na__CfApi__SetLoadedProjectData
    } from '../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | SketchUp To ValeVision Animation Scene Bridge
    // @delegate: ../69__System__SketchUpToValeVision__Utilities/Na__SketchUp__AnimationScene__DataBridge__.js
    // ------------------------------------------------------------
    import {
        Na__SketchUp__AnimationScene__TryBuildScenesFromSketchUp,
        Na__SketchUp__AnimationScene__ResolveDefaultLaunchScene,
        Na__SketchUp__AnimationScene__ShouldUseSceneOrbitTarget
    } from '../69__System__SketchUpToValeVision__Utilities/Na__SketchUp__AnimationScene__DataBridge__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Resilient Load Helpers (timeouts, retries, concurrency)
    // @delegate: ../03__AppUtils/Na__AppUtils__ResilientLoad__.js
    // ------------------------------------------------------------
    import {
        Na__ResilientLoad__FetchWithTimeout,
        Na__ResilientLoad__GltfLoadWithTimeout,
        Na__ResilientLoad__RunWithConcurrencyCap
    } from '../03__AppUtils/Na__AppUtils__ResilientLoad__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Load Watchdog (stall detection + visibilitychange recovery)
    // @delegate: ./Na__AppCore__LoadWatchdog__.js
    // ------------------------------------------------------------
    import {
        Na__LoadWatchdog__Start,
        Na__LoadWatchdog__Clear,
        Na__LoadWatchdog__NotifyProgress,
        Na__LoadWatchdog__SetIsLoadingFlag
    } from './Na__AppCore__LoadWatchdog__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import {
        NA__REQUEST_RENDER_EVENT,
        NA__REQUEST_ACTIVE_RENDER_EVENT,
        NA__STOP_ACTIVE_RENDER_EVENT,
        NA__PAUSE_RENDER_LOOP_EVENT,
        NA__RESUME_RENDER_LOOP_EVENT,
        Na__RenderLoop__IsPaused
    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Interactive Overlays (authoring aids drawn in the live 3D frame and nowhere else)
    // ------------------------------------------------------------
    // @delegate: ../05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js
    // ------------------------------------------------------------
    import {
        Na__InteractiveOverlays__BeginFrame,
        Na__InteractiveOverlays__EndFrame
    } from '../05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Progressive Refinement (Idle-Time Supersampling)
    // @delegate: ../05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js
    // ------------------------------------------------------------
    import {
        Na__ProgressiveRefine__Create,
        Na__ProgressiveRefine__SetActive,
        Na__Refine__FRAME_REFINE,
        Na__Refine__FRAME_PRESENT
    } from '../05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Cross Section Overlay Renderer (After-Composer Pass)
    // ------------------------------------------------------------
    import { Na__SectionClipping__GetOverlayRenderer } from '../05__RenderPipeline/Na__RenderEffect__SectionClipping__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Drawing View Core, Floor Plans and Elevations (2D drawings own the frame while active)
    // @delegate: ../40__System__DrawingViewCore/
    // @delegate: ../42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js
    // @delegate: ../45__System__ElevationViews/Na__Elevation__ModeController__.js
    // ------------------------------------------------------------
    import { Na__DrawView__GetCamera } from '../40__System__DrawingViewCore/Na__DrawView__ActiveView__.js';
    import { Na__DrawView__RenderPreset__RenderFrame } from '../40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js';
    import { Na__DrawMarkup__SyncFrame } from '../40__System__DrawingViewCore/Na__DrawView__MarkupMount__.js';
    import { Na__DrawData__LOADED_EVENT } from '../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    import { Na__FloorPlanMode__HandleResize } from '../42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js';
    import { Na__ElevationMode__HandleResize } from '../45__System__ElevationViews/Na__Elevation__ModeController__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Projected Linework Overlay (registered to the drawing camera per frame)
    // @delegate: ../50__System__ProjectedLinework/Na__ProjectedLinework__SvgOverlay__.js
    // ------------------------------------------------------------
    import { Na__PlOverlay__SyncFrame } from '../50__System__ProjectedLinework/Na__ProjectedLinework__SvgOverlay__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fog Plane System
    // @delegate: ../29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js
    // ------------------------------------------------------------
    import {
        Na__FogPlaneSystem__Initialize,
        Na__FogPlaneSystem__UpdatePerFrame,
        Na__FogPlaneSystem__GetFogPass
    } from '../29__System__FogPlaneSystem/Na__FogPlaneSystem__SystemLogic.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Private UI Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Update Status Display
    // ------------------------------------------------------------
    function Na__UiFeature__UpdateStatus(message, isError = false) {
        const statusText      = document.getElementById('statusText');       // <-- Debug status element
        const loadingIndicator = document.getElementById('loadingIndicator'); // <-- Loading overlay text

        if (statusText) statusText.textContent = message;
        if (!loadingIndicator) return;
        loadingIndicator.textContent = message;

        if (isError) {
            loadingIndicator.style.color = '#d32f2f';                        // <-- Error color
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show Scene When Ready
    // ------------------------------------------------------------
    function Na__UiFeature__ShowScene() {
        const statusText       = document.getElementById('statusText');      // <-- Debug status element
        const loadingOverlay   = document.getElementById('loadingOverlay');  // <-- Loading overlay container
        const canvas           = document.getElementById('renderCanvas');    // <-- Render canvas
        const loadingIndicator = document.getElementById('loadingIndicator'); // <-- Loading overlay text

        Na__LoadWatchdog__Clear();                                           // <-- Dismiss watchdog on success

        if (statusText) statusText.textContent = 'Complete - ValeVision3D Ready';

        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }

        if (canvas) {
            canvas.classList.remove('canvas-hidden');
            canvas.classList.add('canvas-visible');
        }

        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }

        window.dispatchEvent(new CustomEvent('na-app-scene-ready'));         // <-- Model is loaded and visible; post-load UI may appear
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Show Load Error State with Retry Button
    // ------------------------------------------------------------
    function Na__UiFeature__ShowLoadError(message) {
        const loadingOverlay   = document.getElementById('loadingOverlay');  // <-- Loading overlay container
        const loadingIndicator = document.getElementById('loadingIndicator'); // <-- Loading indicator element
        const statusText       = document.getElementById('statusText');       // <-- Debug status element

        Na__LoadWatchdog__Clear();                                            // <-- Stop watchdog — error path owns the state now

        if (statusText) statusText.textContent = `Error: ${message}`;

        if (loadingIndicator) loadingIndicator.style.display = 'none';       // <-- Hide progress text

        if (!loadingOverlay) return;

        loadingOverlay.classList.add('loading-overlay--error');              // <-- Switch overlay to error mode (hides spinner)

        // BUILD ERROR UI | Icon + message + retry button
        const errorIcon     = document.createElement('div');
        errorIcon.className = 'loading-error-icon';
        errorIcon.textContent = '⚠';                                        // <-- Warning symbol

        const errorMsg      = document.createElement('p');
        errorMsg.className  = 'loading-error-message';
        errorMsg.textContent = message || 'An error occurred. Please retry.'; // <-- Caller-supplied message

        const retryBtn      = document.createElement('button');
        retryBtn.className  = 'loading-error-retry-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', () => window.location.reload());  // <-- Reload on click

        loadingOverlay.appendChild(errorIcon);                               // <-- Append icon
        loadingOverlay.appendChild(errorMsg);                                // <-- Append message
        loadingOverlay.appendChild(retryBtn);                                // <-- Append retry button
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Editor-Owned Keys Overlay (localhost)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | One JSON Value as Text, Its Object Keys Sorted
    // ------------------------------------------------------------
    // Two copies of one block written by different savers can list the same
    // keys in a different order; only a real difference is reported.
    // ------------------------------------------------------------
    function Na__AppFlow__CanonicalJson(value) {
        return JSON.stringify(value, (key, inner) => {
            if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return inner;
            return Object.keys(inner).sort().reduce((sorted, name) => {
                sorted[name] = inner[name];
                return sorted;
            }, {});
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Overlay the Editor-Owned Keys From R2 (localhost source of truth)
    // ------------------------------------------------------------
    // TrueVision's Na__DevSavedKeys overlay (v2.7.1) with ValeVision's list.
    // The editor writes R2 first, so the local server's copy of project.json
    // can fall behind it (a failed local mirror, a save from another
    // machine). Each key of the app config's ProjectData__EditorOwnedKeys
    // list that R2 holds replaces the local value IN PLACE, so every reader
    // of this load's copy sees it; a listed key R2 lacks keeps the local
    // value, and every other key (models, images, the project's identity)
    // stays the local copy's, so a partial R2 copy can never break model
    // loading. Never fatal and never longer than timeoutMs: a missing list,
    // no editor worker, a failed, missing or slow read all leave the local
    // copy as it is, saying why in the console. Resolves to the names of the
    // keys whose value R2 changed.
    // ------------------------------------------------------------
    async function Na__AppFlow__OverlayEditorOwnedKeys(projectData, appConfig, transportReady, timeoutMs) {
        const listBlock = (appConfig && appConfig.ProjectData__EditorOwnedKeys) || null;
        const ownedKeys = (listBlock && Array.isArray(listBlock.ProjectData__EditorOwnedKeys__Keys))
            ? listBlock.ProjectData__EditorOwnedKeys__Keys.filter((key) => typeof key === 'string' && key.length > 0)
            : [];
        if (!projectData || typeof projectData !== 'object') return [];
        if (ownedKeys.length === 0) {
            console.warn('[ValeVision3D] No ProjectData__EditorOwnedKeys list in the app config - project.json is used as the local server gave it.');
            return [];
        }

        // READ R2'S COPY | the worker's project route or the CDN copy, fresh (the facade decides), raced against the budget
        const budgetMs    = (Number.isFinite(timeoutMs) && timeoutMs > 0) ? timeoutMs : 15000;
        let   budgetTimer = null;
        const budget      = new Promise((done) => {
            budgetTimer = setTimeout(() => done({ ok : false, timedOut : true }), budgetMs);
        });
        const r2Read      = (async () => {
            await transportReady;                                            // <-- The worker config and its route list
            if (!Na__CfApi__IsConfigured()) return { ok : false, notConfigured : true };
            return Na__CfApi__ReadProjectData();
        })();

        let r2Result = null;
        try {
            r2Result = await Promise.race([ r2Read, budget ]);
        } catch (error) {
            r2Result = { ok : false, error : (error && error.message) || String(error) };
        } finally {
            clearTimeout(budgetTimer);
        }

        if (!r2Result || r2Result.timedOut) {
            console.warn(`[ValeVision3D] R2 did not answer within ${Math.round(budgetMs / 100) / 10} s - project.json is used as the local server gave it.`);
            return [];
        }
        if (r2Result.notConfigured) {
            console.info('[ValeVision3D] No editor worker for this project - project.json is used as the local server gave it.');
            return [];
        }
        if (!r2Result.ok) {
            console.warn(`[ValeVision3D] Could not read project.json from R2 (${r2Result.error || 'no answer'}) - it is used as the local server gave it.`);
            return [];
        }
        if (r2Result.missing || !r2Result.data || typeof r2Result.data !== 'object') {
            console.info('[ValeVision3D] R2 holds no project.json for this project yet - it is used as the local server gave it.');
            return [];
        }

        // SAME PROJECT? | never graft another project's keys (both copies carry the project's own code)
        const r2Data      = r2Result.data;
        const localCode   = projectData.projectCode;
        const r2Code      = r2Data.projectCode;
        if (localCode !== undefined && localCode !== null && r2Code !== undefined && r2Code !== null && String(localCode) !== String(r2Code)) {
            console.warn(`[ValeVision3D] R2's project.json is project ${r2Code}, the local copy is ${localCode} - project.json is used as the local server gave it.`);
            return [];
        }

        // OVERLAY | each listed key R2 holds takes R2's value (TrueVision's rule)
        const changedKeys = [];
        ownedKeys.forEach((key) => {
            if (r2Data[key] === undefined) return;                           // <-- A key R2 lacks keeps the local value
            if (Na__AppFlow__CanonicalJson(r2Data[key]) !== Na__AppFlow__CanonicalJson(projectData[key])) changedKeys.push(key);
            projectData[key] = r2Data[key];                                  // <-- Overlay the R2 value
        });
        console.log('[ValeVision3D] Overlaid editor-owned keys from R2 (localhost source of truth) - '
            + (changedKeys.length ? `R2 differed from the local copy in ${changedKeys.join(', ')}.` : 'the local copy already matched.'));
        return changedKeys;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Main Loading Sequence
// -----------------------------------------------------------------------------

    // FUNCTION | Main Loading Sequence
    // ------------------------------------------------------------
    async function Na__AppFlow__StartLoadingSequence(context) {

        // DESTRUCTURE CONTEXT | Scene Instances
        // ---------------------------------------------------------------
        const {
            scene      : Na__Scene__Main,
            camera     : Na__Camera__Main,
            renderer   : Na__Renderer__Main,
            controls   : Na__Controls__Orbit,
            modelRoot  : Na__ModelGroup__Root,
            lineResolution   : Na__LineResolution__Screen,
            updateNavigation : Na__Navmode__UpdateNavigation,
            pipelineRef,
            showToast        : Na__ShowToast__Callback,
            configs
        } = context;
        // ---------------------------------------------------------------

        // DESTRUCTURE CONTEXT | Config Values
        // ---------------------------------------------------------------
        const {
            fullAppConfig               : Na__FullAppConfig,
            lightingConfig              : Na__Config__LightingConfig,
            groundPlane                 : Na__Config__GroundPlane,
            profileLines                : Na__Config__ProfileLines,
            models                      : Na__Config__Models,
            modelUrls                   : Na__ModelDefaults__ModelUrls,
            materialsSystem             : Na__Config__MaterialsSystem,
            doorAnimation               : Na__Config__DoorAnimation,
            cameraFollow                : Na__Config__CameraFollow,
            orbitHelperCubeDebugVisible : Na__OrbitHelperCube__Debug__Visible,
            ambientOcclusion            : Na__Config__AmbientOcclusion,
            progressiveRefine           : Na__Config__ProgressiveRefine,
            sceneEnvironment            : Na__Config__SceneEnvironment,
            distanceCulling             : Na__Config__DistanceCulling,
            resilienceConfig            : Na__Config__Resilience
        } = configs;

        Na__AppUtils__InitFromConfig(Na__FullAppConfig);                      // <-- Seed R2 + GH base URLs from appConfig SSOT
        Na__AppUtils__InitMasterIndex();                                      // <-- Begin master index load (R2-first, GH fallback; memoised, awaited at fetch)
        Na__AppUtils__InitBuildManifest();                                    // <-- Begin build-version manifest load (cache-bust token; memoised, awaited at fetch)

        // FALLBACK TOAST LISTENER | R2 -> GH Pages fallback notification
        // ---------------------------------------------------------------
        window.addEventListener('na-asset-fallback-toast', (evt) => {
            if (Na__ShowToast__Callback) {
                Na__ShowToast__Callback(evt.detail && evt.detail.message || 'Using static assets — live assets unavailable.');
            }
        }, { once: true });                                                    // <-- Fire once per session to avoid repeated toasts
        // ---------------------------------------------------------------

        // START LOAD WATCHDOG (total budget timer + visibilitychange stall recovery)
        // @delegate: ./Na__AppCore__LoadWatchdog__.js
        const Na__Watchdog__BudgetMs        = (Na__Config__Resilience && Na__Config__Resilience.LoadResilience__Config__WatchdogBudgetMs)       || 120000; // <-- Total load budget (ms)
        const Na__Watchdog__StallThresholdMs = (Na__Config__Resilience && Na__Config__Resilience.LoadResilience__Config__WatchdogStallThresholdMs) || 30000; // <-- Stall threshold (ms)
        Na__LoadWatchdog__Start(Na__UiFeature__ShowLoadError, Na__Watchdog__BudgetMs, Na__Watchdog__StallThresholdMs); // <-- Arms budget + attaches visibilitychange handler
        Na__LoadWatchdog__SetIsLoadingFlag(true);                             // <-- Expose flag for SW controllerchange bridge

        Na__UiFeature__UpdateStatus('Creating scene...');
        Na__Scene__SetupDefaultSceneLighting(
            Na__Scene__Main,
            Na__Config__LightingConfig,
            Na__Config__GroundPlane,
            (Na__FullAppConfig && Na__FullAppConfig.Scene__PerSceneLighting) || null  // <-- Per-scene lighting switch, flight blend and slider ranges
        );

        // RENDER PIPELINE | Engine-Aware Composer Builder
        // ---------------------------------------------------------------
        // PureEngine (default) is built immediately. If project.json selects
        // MaxEngine the pipeline is rebuilt before models load, and the user
        // can switch live at runtime via the na-render-engine-switch event.
        // ---------------------------------------------------------------
        let Na__RenderPipeline__State = null;                                // <-- Active pipeline state (mutable: engine switching)
        let Na__RenderComposer__Main  = null;                                // <-- Active composer (mutable: engine switching)

        // SUB FUNCTION | Build (or Rebuild) the Render Pipeline for an Engine
        // ---------------------------------------------------------------
        function Na__RenderEngine__BuildPipeline(engineName) {
            const previousState = Na__RenderPipeline__State;                 // <-- Held for best-effort disposal

            const newState = (engineName === Na__RenderEngine__MAX)
                ? Na__RenderPipeline__MaxEngine__SetupComposer(Na__Renderer__Main, Na__Scene__Main, Na__Camera__Main, Na__Config__ProfileLines, null, Na__Controls__Orbit.target, Na__Config__AmbientOcclusion)
                : Na__RenderPipeline__PureEngine__SetupComposer(Na__Renderer__Main, Na__Scene__Main, Na__Camera__Main, Na__Config__ProfileLines, null, Na__Controls__Orbit.target);

            Na__RenderPipeline__State = newState;                            // <-- Swap module references to the new engine
            Na__RenderComposer__Main  = newState.composer;
            pipelineRef.current       = newState;                            // <-- ImageExport / ElevationView / dev controls follow the ref

            const Na__FogPlane__ExistingPass = Na__FogPlaneSystem__GetFogPass();   // <-- Fog pass instance survives engine switches
            if (Na__FogPlane__ExistingPass && newState.insertFogPass) {
                newState.insertFogPass(Na__FogPlane__ExistingPass);          // <-- Rebinds tDepth to the new engine's depth texture
            }

            if (newState.invalidateProfileLinesCache) {
                newState.invalidateProfileLinesCache();                      // <-- New profile lines instance must rescan the scene
            }

            // DISPOSE PREVIOUS COMPOSER (best-effort GPU memory cleanup; passes are not shared except fog)
            if (previousState && previousState !== newState) {
                if (previousState.composer && typeof previousState.composer.dispose === 'function') {
                    previousState.composer.dispose();
                }
                if (previousState.profileNormalTarget && typeof previousState.profileNormalTarget.dispose === 'function') {
                    previousState.profileNormalTarget.dispose();
                }
                if (previousState.profileColorTarget && typeof previousState.profileColorTarget.dispose === 'function') {
                    previousState.profileColorTarget.dispose();
                }
            }

            Na__RenderEngine__SetActiveEngine(engineName);                   // <-- Record active engine in shared state
            console.log(`[ValeVision3D] Render pipeline built: ${engineName}`);
        }
        // ---------------------------------------------------------------

        Na__RenderEngine__BuildPipeline(Na__RenderEngine__PURE);             // <-- PureEngine is ALWAYS the startup default

        let modelUrls = [...Na__ModelDefaults__ModelUrls];                   // <-- Start with config defaults
        let Na__Saved__ProjectCameraConfig = null;                           // <-- Hoisted for post-OrbitCube re-apply
        let Na__Saved__ProjectOrbitTarget  = null;                           // <-- Hoisted for post-OrbitCube re-apply
        let Na__Saved__ProjectData         = null;                           // <-- Hoisted for post-OrbitCube scene-first camera apply

        // RESOLVE PROJECT-SPECIFIC MODEL URLS
        const projectCode = Na__AppUtils__GetProjectCodeFromUrl();
        if (projectCode) {
            try {
                Na__UiFeature__UpdateStatus('Loading project data...');
                Na__LoadWatchdog__NotifyProgress();                           // <-- Reset stall clock on meaningful step
                await Na__AppUtils__InitMasterIndex();                        // <-- Ensure index maps are ready for year/asset-home resolution
                const Na__Transport__Ready = Na__CfApi__Initialize(Na__FullAppConfig); // <-- Start the transport facade (memoised; the editor worker is asked on localhost only)
                const projectData = await Na__AppUtils__FetchProjectJson(projectCode, Na__Config__Resilience); // <-- Resilient + memoised

                // OVERLAY THE EDITOR-OWNED KEYS FROM R2 (localhost only; R2 is the source of truth)
                // The editor writes R2 first, so this machine's copy can be
                // behind it. Each listed key R2 holds replaces the local value
                // on this object before anything below reads it; the models,
                // images and identity stay the local copy's.
                // @delegate: ../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js
                if (Na__AppUtils__IsRunningOnLocalhost()) {
                    const Na__Overlay__TimeoutMs = (Na__Config__Resilience && Na__Config__Resilience.LoadResilience__Config__FetchTimeoutMs) || 15000; // <-- One fetch's budget
                    await Na__AppFlow__OverlayEditorOwnedKeys(projectData, Na__FullAppConfig, Na__Transport__Ready, Na__Overlay__TimeoutMs);
                    Na__LoadWatchdog__NotifyProgress();                       // <-- Reset stall clock after the R2 read
                }

                // REGISTER THE PROJECT DATA THIS SESSION RUNS (the facade's merge base)
                // Before the first project dispatch below, so every listener
                // and every later save sees the document the app is running.
                Na__CfApi__SetLoadedProjectData(projectData);

                // STORE PROJECT DATA AND CAMERA CONFIG (supports both key formats)
                Na__Saved__ProjectData         = projectData;                // <-- Hoisted for ResolveDefaultLaunchScene after orbit cube loads
                Na__Saved__ProjectCameraConfig = projectData.Camera__DefaultPosition
                    || projectData.valeVision_Camera__DefaultPosition
                    || null;
                Na__Saved__ProjectOrbitTarget  = projectData.OrbitHelperCube__Position || null;

                // REGISTER LIVE IMAGE LIST FOR THUMBNAIL RESOLUTION
                // Cloud Sync re-dates every image on each run and purges the
                // previous edition, so scene ThumbnailUrl strings baked into
                // project.json go stale. The scene data layer uses this array
                // to re-point them at the current files instead of 404ing.
                Na__PresentationMode__ProjectJson__SetActiveImageList(projectData.images); // <-- Current date-stamped source PNGs

                // APPLY PER-PROJECT NAVIGATION MODE ENABLE FLAGS
                // Walk and Fly are enabled by default; a project only loses one
                // by storing an explicit false.  The setter therefore runs even
                // when the block is absent, and the event carries the RESOLVED
                // flags (not the raw block) so every listener sees real booleans.
                Na__NavigationModes__SetEnabledModes(projectData.Navmode__EnabledModes);
                window.dispatchEvent(new CustomEvent('na-navigation-modes-loaded', {
                    detail: { enabledModes: Na__NavigationModes__GetEnabledModes() }
                }));

                // APPLY PER-PROJECT RENDER ENGINE SELECTION (PureEngine when key absent)
                if (projectData.RenderEngine__Config) {
                    Na__RenderEngine__SetConfiguredEngine(projectData.RenderEngine__Config.RenderEngine__Active);
                    window.dispatchEvent(new CustomEvent('na-render-engine-loaded', {
                        detail: { renderEngineConfig: projectData.RenderEngine__Config }
                    }));
                }

                // APPLY PER-PROJECT CROSS SECTION TOOL CONFIG (feature hidden when key absent)
                if (projectData.CrossSection__Config) {
                    window.dispatchEvent(new CustomEvent('na-crosssection-config-loaded', {
                        detail: { crossSectionConfig: projectData.CrossSection__Config }
                    }));
                }

                // LOAD PER-SCENE CROSS SECTION BINDINGS (separate block; survives cloud re-syncs)
                if (projectData.CrossSection__SceneData) {
                    window.dispatchEvent(new CustomEvent('na-crosssection-scenedata-loaded', {
                        detail: { sceneData: projectData.CrossSection__SceneData }
                    }));
                }

                // LOAD DRAWINGS DATA (floor plans, elevations, sheets; absent block = empty skeleton)
                // sceneConfig is the raw presentation block, as TrueVision sends it:
                // the migration source for drawings saved inside it before
                // TrueVision v2.21.0 (none in ValeVision; harmless here).
                // @delegate: ../40__System__DrawingViewCore/Na__DrawView__ProjectData__.js
                window.dispatchEvent(new CustomEvent(Na__DrawData__LOADED_EVENT, {
                    detail: {
                        block       : projectData.LayoutEditor__DrawingsData || null,
                        sceneConfig : projectData.PresentationMode__SavedCameraScenes || null,
                        projectCode : projectCode
                    }
                }));

                // LOAD SKETCHUP-NATIVE SECTION PLANES (per-scene, captured by the cloud sync plugin)
                // Key spelling "ValeVison3D" (one 'i') is the established plugin/web convention.
                if (projectData['ValeVison3D__SketchUpCameraData']) {
                    window.dispatchEvent(new CustomEvent('na-crosssection-sketchup-sections-loaded', {
                        detail: { sketchUpCameraData: projectData['ValeVison3D__SketchUpCameraData'] }
                    }));
                }

                // DETECT PER-PROJECT PRESENTATION MODE SAVED SCENES
                // skipCameraApply: true — carousel registers UI state without
                // jumping the camera; boot camera is applied once below after
                // the orbit cube resolves (see ResolveDefaultLaunchScene path).
                if (Na__PresentationMode__ProjectJson__HasValidSavedScenes(projectData)) {
                    window.dispatchEvent(new CustomEvent('na-presentation-mode-scenes-loaded', {
                        detail: {
                            sceneConfig     : Na__PresentationMode__ProjectJson__GetSavedCameraScenes(projectData),
                            projectCode     : projectCode,
                            skipCameraApply : true                           // <-- Defer camera apply to post-orbit-cube block below
                        }
                    }));
                } else {
                    // AUTO-BUILD SCENES FROM SKETCHUP CAMERA DATA (if present, no explicit scenes)
                    // @delegate: ../69__System__SketchUpToValeVision__Utilities/Na__SketchUp__AnimationScene__DataBridge__.js
                    Na__SketchUp__AnimationScene__TryBuildScenesFromSketchUp(projectData, projectCode); // <-- Fills gap when no manual scenes defined
                }

                // APPLY PER-PROJECT ORBIT MAX DISTANCE OVERRIDE
                // Single value overrides BOTH PC and iPad equally; iPad bonus does NOT stack on top.
                const Na__Saved__ProjectOrbitMaxDistanceMm = projectData.Navmode__OrbitMaxDistanceMm;
                if (Number.isFinite(Na__Saved__ProjectOrbitMaxDistanceMm) && Na__Saved__ProjectOrbitMaxDistanceMm > 0) {
                    Na__Controls__Orbit.maxDistance = Na__Math__ConvertMmToUnits(Na__Saved__ProjectOrbitMaxDistanceMm);
                    console.log(`[ValeVision3D] Project orbit max distance override applied: ${Na__Saved__ProjectOrbitMaxDistanceMm} mm`);
                }

                // EXTRACT MODEL URLS FROM PROJECT DATA
                const projectUrls = Na__AppUtils__ExtractModelUrls(projectData);
                if (projectUrls.length > 0) {
                    modelUrls = projectUrls;                                 // <-- Override defaults with project URLs
                }
            } catch (error) {
                // ?project= was present but fetch failed — surface error instead of silently falling back.
                // The user asked for a specific project; loading Clough defaults masks the failure.
                console.error('[ValeVision3D] Project data load failed', error);
                Na__UiFeature__ShowLoadError(`Project failed to load — ${error.message}`);
                return;                                                       // <-- Halt sequence; overlay shows error + Retry
            }
        }

        // REBUILD PIPELINE FOR CONFIGURED ENGINE (PureEngine already built above)
        if (Na__RenderEngine__GetConfiguredEngine() === Na__RenderEngine__MAX) {
            Na__RenderEngine__BuildPipeline(Na__RenderEngine__MAX);
        }

        // LOADED MODEL GROUPS | Hoisted to function scope so the engine-switch
        // materials helpers below can re-process groups after initial load.
        let Na__LoadedModelGroups = null;                                    // <-- Map of category -> THREE.Group

        // SCENE ENVIRONMENT | Lazy HDR + PMREM loader for MaxEngine reflections
        // ---------------------------------------------------------------
        let Na__Scene__EnvironmentTexture   = null;                          // <-- PMREM env texture (null when disabled / failed)
        let Na__Scene__EnvironmentAttempted = false;                         // <-- Single load attempt per session

        // SUB HELPER FUNCTION | Ensure the Environment Texture Is Loaded (MaxEngine)
        // ---------------------------------------------------------------
        async function Na__MaxEngine__EnsureEnvironmentTexture() {
            if (Na__Scene__EnvironmentAttempted) return Na__Scene__EnvironmentTexture;
            Na__Scene__EnvironmentAttempted = true;
            Na__Scene__EnvironmentTexture = await Na__Scene__ApplyEnvironmentMap(Na__Scene__Main, Na__Renderer__Main, Na__Config__SceneEnvironment);
            return Na__Scene__EnvironmentTexture;
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Apply Engine-Appropriate Materials to Loaded Model Groups
        // ---------------------------------------------------------------
        // MaxEngine : restore loaded originals (indexed names back), then
        //             DataLib SSOT (GitHub) PBR swap + AO exclusions + glass /
        //             mirror environment overrides. Falls back gracefully if
        //             the DataLib fetch fails.
        // PureEngine: restores loaded originals then whitecards ALL indexed
        //             MAT###__ materials — PureEngine must show NO face
        //             colours or opacity (classic whitecard appearance).
        //             MAT000E__ exempt textures then get an emissive lift so
        //             fake-detail maps sit near whitecard luminance. Transparent
        //             MAT000E__ glazing is the one exemption from the opaque
        //             whitecard rule: it keeps the SketchUp Opacity slider
        //             carried through the GLB and is skipped by the lift pass.
        // Door animations are unaffected in both directions: the door registry
        // holds Object3D references and transforms, never material references.
        // ---------------------------------------------------------------
        async function Na__RenderEngine__ApplyEngineMaterials(engineName) {
            if (!Na__LoadedModelGroups) return;

            const Na__BaseMeshMaterialConfig = (Na__Config__Models && Na__Config__Models.baseMesh)
                ? Na__Config__Models.baseMesh.material
                : null;                                                      // <-- Whitecard params shared with the model loader

            if (engineName === Na__RenderEngine__MAX) {
                try {
                    await Na__DataLib__LoadAll();                            // <-- SSOT fetch (cached after first call)
                } catch (dataLibError) {
                    console.error('[ValeVision3D] DataLib load failed — MaxEngine materials unavailable, keeping current materials:', dataLibError);
                    return;
                }

                const Na__DataLibMaterialsData = Na__DataLib__GetMaterials();
                const Na__MaterialsLookupMap   = Na__MaterialsSystem__BuildLookup(Na__DataLibMaterialsData, true);  // <-- Force rebuild from SSOT source
                if (Na__MaterialsLookupMap.size === 0) {
                    window.dispatchEvent(new CustomEvent('na-show-toast', {
                        detail: { message: 'DataLib materials index is empty — MaxEngine PBR materials unavailable.', isError: true }
                    }));
                    return;
                }

                const Na__EnvTexture = await Na__MaxEngine__EnsureEnvironmentTexture();   // <-- Null when env disabled (glass stays transparent, no reflections)

                for (const [, group] of Na__LoadedModelGroups) {
                    Na__MaterialsSystem__RestoreOriginalMaterials(group);    // <-- Indexed names back (PureEngine may have whitecarded them)
                    await Na__MaterialsSystem__ApplyMaterials(group, Na__MaterialsLookupMap, Na__Config__MaterialsSystem);

                    if (Na__EnvTexture && Na__Config__SceneEnvironment) {
                        if (Na__Config__SceneEnvironment.Scene__Environment__MirrorOnly === true) {
                            Na__MaterialsSystem__ApplyMirrorEnvironmentOverrides(group, Na__EnvTexture, {
                                targetMaterialName : Na__Config__SceneEnvironment.Scene__Environment__MirrorMaterialName,
                                envMapIntensity    : Na__Config__SceneEnvironment.Scene__Environment__MirrorEnvMapIntensity,
                                brightnessBoost    : Na__Config__SceneEnvironment.Scene__Environment__MirrorBrightnessBoost,
                                roughnessOverride  : Na__Config__SceneEnvironment.Scene__Environment__MirrorRoughnessOverride
                            });
                        }
                        if (Na__Config__SceneEnvironment.Scene__Environment__GlassEnabled === true) {
                            Na__MaterialsSystem__ApplyGlassEnvironmentOverrides(group, Na__EnvTexture, {
                                targetMaterialName  : Na__Config__SceneEnvironment.Scene__Environment__GlassMaterialName,
                                envMapIntensity     : Na__Config__SceneEnvironment.Scene__Environment__GlassEnvMapIntensity,
                                brightnessMultiplier: Na__Config__SceneEnvironment.Scene__Environment__GlassBrightnessMultiplier,
                                roughnessOverride   : Na__Config__SceneEnvironment.Scene__Environment__GlassRoughnessOverride,
                                opacityOverride     : Na__Config__SceneEnvironment.Scene__Environment__GlassOpacityOverride
                            });
                        }
                    }
                }

                // DISTANCE CULLING | MaxEngine-only optional feature (config-gated, off by default)
                Na__DistanceCulling__Initialize(Na__Config__DistanceCulling);
                Na__DistanceCulling__RegisterModelGroups(Na__LoadedModelGroups);
            } else {
                for (const [, group] of Na__LoadedModelGroups) {
                    Na__MaterialsSystem__RestoreOriginalMaterials(group);    // <-- Back to loaded originals (also clears AO layer-1 tags)
                    Na__MaterialsSystem__ApplyWhitecardToIndexedMaterials(group, Na__BaseMeshMaterialConfig);  // <-- PureEngine: no face colours / opacity
                    Na__MaterialsSystem__ApplyExemptTextureBrightness(group, Na__BaseMeshMaterialConfig);     // <-- PureEngine: MAT000E__ near whitecard key
                }

                Na__DistanceCulling__SetEnabled(false);                      // <-- MaxEngine-only feature; restores any culled items
            }
        }
        // ---------------------------------------------------------------

        // SEPARATE ORBIT HELPER CUBE URL FROM MODEL URLS
        const { orbitCubeUrl, filteredUrls } = Na__ModelLoader__SeparateOrbitCubeUrl(modelUrls);
        modelUrls = filteredUrls;                                            // <-- Use filtered URLs (without orbit cube) for model loading
        if (!orbitCubeUrl) {
            console.warn('[ValeVision3D] OrbitHelperCube URL not found in model list. Orbit target will use saved project target if available.');
        }

        // LOAD ORBIT HELPER CUBE IF PRESENT
        let Na__OrbitHelperCube__Mesh = null;                                // <-- Store orbit cube mesh reference
        let Na__OrbitHelperCube__CenterPosition = null;                      // <-- Store orbit cube center for target precedence
        if (orbitCubeUrl) {
            try {
                Na__UiFeature__UpdateStatus('Loading orbit helper cube...');
                Na__LoadWatchdog__NotifyProgress();                          // <-- Reset stall clock
                const loader = new GLTFLoader();
                const orbitCubeResult = await Na__ModelLoader__LoadOrbitHelperCube(orbitCubeUrl, loader, Na__Config__Resilience); // <-- Resilient load

                if (orbitCubeResult && orbitCubeResult.mesh && orbitCubeResult.centerPosition) {
                    Na__OrbitHelperCube__Mesh = orbitCubeResult.mesh;        // <-- Store mesh reference
                    Na__OrbitHelperCube__CenterPosition = orbitCubeResult.centerPosition.clone(); // <-- Store center position
                    Na__OrbitHelperCube__Mesh.name = 'OrbitHelperCube';      // <-- Name for debugging
                    Na__OrbitHelperCube__Mesh.visible = Na__OrbitHelperCube__Debug__Visible;  // <-- Hide unless debug enabled

                    Na__Scene__Main.add(Na__OrbitHelperCube__Mesh);          // <-- Add to scene
                    console.log('[ValeVision3D] OrbitHelperCube loaded. Center resolved:', orbitCubeResult.centerPosition);
                } else {
                    console.warn('[ValeVision3D] OrbitHelperCube loaded but center position could not be resolved.');
                }
            } catch (error) {
                console.warn('[ValeVision3D] OrbitHelperCube could not be loaded. Orbit will use saved project target if available.', error);
            }
        }

        // RESOLVE FINAL ORBIT TARGET (STRICT PRECEDENCE)
        // 1) Saved project OrbitHelperCube__Position (preserves user's panned view exactly as saved)
        // 2) Loaded OrbitHelperCube GLB center (fallback when no saved position exists)
        // 3) Keep current controls target (no Dev__DefaultCube fallback)
        let Na__FinalOrbitTargetApplied = false;
        if (Na__Saved__ProjectOrbitTarget) {
            Na__Controls__Orbit.target.set(
                Na__Math__ConvertMmToUnits(Na__Saved__ProjectOrbitTarget.OrbitHelperCube__Position__PosX),  // <-- Saved orbit X
                Na__Math__ConvertMmToUnits(Na__Saved__ProjectOrbitTarget.OrbitHelperCube__Position__PosY),  // <-- Saved orbit Y
                Na__Math__ConvertMmToUnits(Na__Saved__ProjectOrbitTarget.OrbitHelperCube__Position__PosZ)   // <-- Saved orbit Z
            );
            Na__FinalOrbitTargetApplied = true;
        } else if (Na__OrbitHelperCube__CenterPosition && Na__OrbitHelperCube__CenterPosition.isVector3) {
            Na__Controls__Orbit.target.copy(Na__OrbitHelperCube__CenterPosition);
            Na__FinalOrbitTargetApplied = true;
        } else {
            console.warn('[ValeVision3D] No saved orbit target and no OrbitHelperCube center resolved. Keeping current controls.target.');
        }

        // REGISTER THE ORBIT PIVOT (cube / saved target) FOR THE INTERACTION SWAP.
        // controls.target currently holds the resolved cube / saved orbit pivot (above).
        // The launch scene apply below then overwrites controls.target with the SCENE's
        // own look-at point so the resting view frames the exact SketchUp shot. This
        // pivot is handed back to OrbitControls only on the first rotation afterwards
        // (see Na__Navmode__OrbitPivot__InteractionSwap) so dragging orbits around the
        // cube, not around that shot's look-at point.
        Na__OrbitPivot__Init(Na__Controls__Orbit);                           // <-- Attach the one-time interaction listeners
        Na__OrbitPivot__SetPivot(Na__FinalOrbitTargetApplied ? Na__Controls__Orbit.target.clone() : null); // <-- Cube / saved pivot (null => no swap)

        // SCENE-FIRST CAMERA APPLY — SketchUp or explicit scenes override Camera__DefaultPosition.
        // ApplySceneCameraState always sets position, rotation, FOV AND the scene's own
        // camera.target, so the resting view is framed exactly as the SketchUp shot
        // (OrbitControls' per-frame lookAt(target) would otherwise aim the camera at
        // whatever target was left in place — which is why leaving the cube as the target
        // here mis-framed the shot). The cube becomes the orbit PIVOT on the first
        // rotation instead, via the interaction swap armed below — but only for
        // SketchUp-derived scenes. Explicit, human-authored PresentationMode scenes keep
        // their deliberately placed orbit target as the pivot (ShouldUseSceneOrbitTarget).
        // @delegate: ../69__System__SketchUpToValeVision__Utilities/Na__SketchUp__AnimationScene__DataBridge__.js
        const Na__LaunchScene = Na__SketchUp__AnimationScene__ResolveDefaultLaunchScene(Na__Saved__ProjectData);
        const Na__LaunchScene__UseSceneOrbitTarget = Na__SketchUp__AnimationScene__ShouldUseSceneOrbitTarget(Na__Saved__ProjectData);

        if (Na__LaunchScene?.scene) {
            Na__PresentationMode__Camera__ApplySceneCameraState(
                Na__Camera__Main,                                            // <-- Snap to SketchUp / explicit first-scene position
                Na__Controls__Orbit,                                         // <-- Frames the scene's own camera.target (exact SketchUp view)
                Na__LaunchScene.scene
            );

            // ARM THE CUBE PIVOT SWAP — SketchUp-derived launch scenes re-pivot to the
            // cube on the first rotation; explicit authored scenes keep their own target.
            if (Na__LaunchScene__UseSceneOrbitTarget) {
                Na__OrbitPivot__Disarm();                                    // <-- Author placed this target on purpose; keep it as the pivot
            } else {
                Na__OrbitPivot__Arm();                                       // <-- Cube kicks in as the pivot on first rotation
            }

            // CAPTURE CANONICAL RESET STATE (scene-sourced; null config means ResetView restores snapshot only)
            // @delegate: ../10__NavigationAndCameras/Na__Camera__ProjectStartState.js
            Na__CameraStartState__CaptureStartState(
                Na__Camera__Main,                                            // <-- Camera at first-scene position
                Na__Controls__Orbit,                                         // <-- Controls framed to the scene's own look-at point
                null                                                         // <-- No Camera__DefaultPosition re-apply on Reset View
            );
        } else {
            // LEGACY CAMERA__DEFAULTPOSITION PATH (no scene data in this project)
            if (Na__Saved__ProjectCameraConfig) {
                const Na__CameraConfigWithoutLegacyTarget = { ...Na__Saved__ProjectCameraConfig };
                if (Na__CameraConfigWithoutLegacyTarget.Camera__DefaultTarget) {
                    delete Na__CameraConfigWithoutLegacyTarget.Camera__DefaultTarget;
                }
                Na__UiFeature__ApplyCameraConfig(
                    Na__Camera__Main,                                        // <-- Re-apply saved camera position + FOV
                    Na__Controls__Orbit,                                     // <-- Re-apply with correct orbit target
                    Na__CameraConfigWithoutLegacyTarget
                );
            }
            if (Na__FinalOrbitTargetApplied || Na__Saved__ProjectCameraConfig) {
                Na__Controls__Orbit.update();                                // <-- Finalize controls with restored state
            }
            // CAPTURE CANONICAL RESET STATE (camera + orbit target from Camera__DefaultPosition)
            // @delegate: ../10__NavigationAndCameras/Na__Camera__ProjectStartState.js
            Na__CameraStartState__CaptureStartState(
                Na__Camera__Main,                                            // <-- Camera in its project start state
                Na__Controls__Orbit,                                         // <-- Controls with resolved orbit target
                Na__Saved__ProjectCameraConfig                               // <-- Raw project.json camera block (null when absent)
            );
        }

        // LOAD ALL MODELS VIA MULTI-MODEL LOADER
        try {
            if (modelUrls.length > 0) {
                Na__LoadWatchdog__NotifyProgress();                          // <-- Reset stall clock before model loop
                Na__LoadedModelGroups = await Na__ModelLoader__LoadAllModels(
                    modelUrls,                                               // <-- Array of CDN URLs (orbit cube already filtered out)
                    Na__ModelGroup__Root,                                    // <-- Scene root group
                    Na__Config__Models,                                      // <-- Material configs (baseMesh + linework)
                    Na__LineResolution__Screen,                              // <-- Screen resolution for line width
                    (msg) => { Na__UiFeature__UpdateStatus(msg); Na__LoadWatchdog__NotifyProgress(); }, // <-- Status + stall reset
                    Na__Config__Resilience                                   // <-- Resilience config (timeouts, retries, cap)
                );
            }

            // APPLY MATERIALS | Engine-aware second pass (selective override)
            // PureEngine -> unchanged local-library swap; MaxEngine -> DataLib SSOT PBR swap.
            // Runs BEFORE door animation init so the door registry scans final node state.
            await Na__RenderEngine__ApplyEngineMaterials(Na__RenderEngine__GetActiveEngine());

            Na__UiFeature__ShowScene();                                      // <-- Reveal scene after all models loaded

            // INITIALIZE MODEL TOGGLE CONTROLS (dynamic per-category buttons)
            Na__UiFeature__InitializeModelToggleControls(Na__LoadedModelGroups);  // <-- Build toggle buttons from loaded groups

            // RE-APPLY LAUNCH SCENE'S TAG-DRIVEN VISIBILITY (state map didn't exist yet when boot camera applied above)
            if (Na__LaunchScene?.scene?.PresentationMode__Scene__ModelLayerVisibility) {
                Na__ModelToggle__ApplySceneLayerVisibility(Na__LaunchScene.scene.PresentationMode__Scene__ModelLayerVisibility);
            }

            // INITIALIZE DOOR ANIMATION (if enabled in config)
            // Token-based collection (TrueVision parity): door categories are matched
            // by name tokens against the loaded Map keys (covers both flat keys like
            // 'ValeVision__MainBuildingModel__ProposedDoors' AND storey keys like
            // 'Storey__GroundFloor__ProposedDoors'). Mesh/linework roots are resolved
            // from group children via userData.Na__ModelType — category keys never
            // contain 'MeshModel'/'LineworkModel' (those live on child root names).
            if (Na__Config__DoorAnimation['3dObject__Interaction__DoorAnimation__Enabled'] !== false) {

                // SUB HELPER FUNCTION | Resolve Door Category Name Tokens from Config
                // ---------------------------------------------------------------
                const Na__ResolveDoorCategoryNameTokens = (doorAnimationConfig) => {
                    const defaultTokens    = ['ProposedDoors', 'ExistingDoors'];     // <-- Fallback when config omits tokens
                    const configuredTokens = doorAnimationConfig
                        && doorAnimationConfig['3dObject__Interaction__DoorAnimation__CategoryNameTokens'];

                    const normalizedTokens = Array.isArray(configuredTokens)
                        ? configuredTokens
                            .filter((token) => typeof token === 'string')
                            .map((token) => token.trim())
                            .filter((token) => token.length > 0)
                        : [];

                    return normalizedTokens.length > 0 ? normalizedTokens : defaultTokens;
                };
                // ---------------------------------------------------------------

                // SUB HELPER FUNCTION | Collect Door Mesh + Linework Groups by Token
                // ---------------------------------------------------------------
                const Na__CollectDoorModelGroups = (loadedModelGroups) => {
                    const doorMeshGroups     = [];                           // <-- Mesh roots across all door categories
                    const doorLineworkGroups = [];                           // <-- Linework roots across all door categories
                    const doorCategoryTokens = Na__ResolveDoorCategoryNameTokens(Na__Config__DoorAnimation);

                    loadedModelGroups.forEach((categoryGroup, categoryKey) => {
                        const hasDoorCategoryToken = doorCategoryTokens.some((token) => categoryKey.includes(token));
                        if (!hasDoorCategoryToken) return;                   // <-- Not a door category

                        const children = categoryGroup.children || [];
                        for (const child of children) {
                            const modelType = child.userData && child.userData.Na__ModelType;
                            if (modelType === 'mesh')     doorMeshGroups.push(child);      // <-- Tagged mesh root
                            if (modelType === 'linework') doorLineworkGroups.push(child);  // <-- Tagged linework root
                        }
                    });

                    return { doorMeshGroups, doorLineworkGroups };
                };
                // ---------------------------------------------------------------

                const { doorMeshGroups, doorLineworkGroups } = Na__CollectDoorModelGroups(Na__LoadedModelGroups);

                if (doorMeshGroups.length > 0 || doorLineworkGroups.length > 0) {
                    Na__DoorAnimation__Initialize(
                        Na__Scene__Main,                                     // <-- Scene reference
                        Na__Camera__Main,                                    // <-- Camera reference
                        Na__Renderer__Main.domElement,                       // <-- Canvas DOM element
                        doorMeshGroups,                                      // <-- Mesh model groups (array)
                        doorLineworkGroups,                                  // <-- Linework model groups (array)
                        Na__Config__DoorAnimation                            // <-- Door animation config
                    );
                    console.log(`[ValeVision3D] Door animation initialized (${doorMeshGroups.length} mesh group(s), ${doorLineworkGroups.length} linework group(s))`);
                } else {
                    console.log('[ValeVision3D] Door animation enabled but no door model groups found');
                }
            }

            // INITIALIZE CAMERA-FOLLOW BILLBOARDS (if enabled in config)
            if (Na__Config__CameraFollow['3dObject__Interaction__CameraFollow__Enabled'] !== false) {

                // COLLECT ALL CATEGORY MESH/LINEWORK ROOTS - extras flag is the source of truth
                // ------------------------------------------------------------
                // Billboards are identified by the baked GLB node extras
                // (type === "CameraFollowBillboard"), NOT by which category GLB file
                // they were bundled into. We therefore scan every loaded category so
                // the behaviour is robust to tag-segmentation differences at export.
                const Na__CollectCameraFollowModelGroups = (loadedModelGroups) => {
                    const cameraFollowMeshGroups     = [];                       // <-- All mesh roots across categories
                    const cameraFollowLineworkGroups = [];                       // <-- All linework roots across categories

                    loadedModelGroups.forEach((categoryGroup) => {
                        const children = categoryGroup.children || [];           // <-- Category child roots
                        for (const child of children) {
                            const modelType = child.userData && child.userData.Na__ModelType;
                            if (modelType === 'mesh')     cameraFollowMeshGroups.push(child);     // <-- Mesh root
                            if (modelType === 'linework') cameraFollowLineworkGroups.push(child); // <-- Linework root
                        }
                    });

                    return { cameraFollowMeshGroups, cameraFollowLineworkGroups };
                };

                const { cameraFollowMeshGroups, cameraFollowLineworkGroups } = Na__CollectCameraFollowModelGroups(Na__LoadedModelGroups);

                if (cameraFollowMeshGroups.length > 0 || cameraFollowLineworkGroups.length > 0) {
                    const Na__CameraFollow__Count = Na__CameraFollow__Initialize(
                        cameraFollowMeshGroups,
                        cameraFollowLineworkGroups,
                        Na__Config__CameraFollow,
                        Na__Camera__Main
                    );
                    console.log(`[ValeVision3D] Camera-follow scan complete (${cameraFollowMeshGroups.length} mesh root(s), ${cameraFollowLineworkGroups.length} linework root(s)); ${Na__CameraFollow__Count || 0} billboard(s) registered`);
                } else {
                    console.log('[ValeVision3D] Camera-follow enabled but no model roots found to scan');
                }
            }

            // SET WALK MODE COLLISION MESHES (from loaded model root)
            Na__WalkMode__SetCollisionMeshes(Na__ModelGroup__Root);

        } catch (error) {
            console.error('[ValeVision3D] Model load error:', error);
            Na__UiFeature__ShowLoadError(`Model load failed — ${error.message}`); // <-- Show overlay error with Retry button
        }

        // INVALIDATE PROFILE LINES CACHE (scene objects changed after model load)
        if (Na__RenderPipeline__State.invalidateProfileLinesCache) {
            Na__RenderPipeline__State.invalidateProfileLinesCache();
        }

        // INITIALIZE FOG PLANE SYSTEM (async: loads config, restores saved planes, creates shader pass)
        try {
            await Na__FogPlaneSystem__Initialize({
                scene      : Na__Scene__Main,
                camera     : Na__Camera__Main,
                renderer   : Na__Renderer__Main,
                controls   : Na__Controls__Orbit,
                modelRoot  : Na__ModelGroup__Root,
                showToast  : Na__ShowToast__Callback || null
            });

            const Na__FogPlane__Pass = Na__FogPlaneSystem__GetFogPass();
            if (Na__FogPlane__Pass && Na__RenderPipeline__State.insertFogPass) {
                Na__RenderPipeline__State.insertFogPass(Na__FogPlane__Pass);
            }
        } catch (fogError) {
            console.error('[ValeVision3D] Fog plane system init error:', fogError);
        }

        // RENDER LOOP | Invalidation-Based Rendering
        let Na__RenderLoop__PrevTimestamp = performance.now();               // <-- Previous frame timestamp for delta
        let Na__RenderLoop__FrameHandle = null;                              // <-- Active RAF handle (or null when idle)
        const Na__RenderLoop__ActiveReasons = new Set();                     // <-- Reasons that require continuous frames
        const Na__RenderLoop__PauseReasons  = new Set();                     // <-- Holders of the engine (Layout Editor); no frame paints while any remain
        let   Na__RenderLoop__PendingWhilePaused = false;                    // <-- A request arrived during a hold; one frame paints on resume

        // PROGRESSIVE REFINEMENT | Idle-time supersampling of the 3D viewport.
        // @delegate: ../05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js
        // ---------------------------------------------------------------
        // Costs nothing while the camera moves: the frames below are exactly
        // the frames this loop drew before it existed. Once the camera has
        // held still for the debounce the loop keeps going instead of idling,
        // drawing the same frame again with sub-pixel jitter and averaging,
        // until the viewport holds a full 16-sample image. Anything that
        // changes what the frame should look like resets it.
        // ---------------------------------------------------------------
        const Na__RenderLoop__Refiner = Na__ProgressiveRefine__Create({
            renderer : Na__Renderer__Main,
            config   : Na__Config__ProgressiveRefine
        });
        Na__ProgressiveRefine__SetActive(Na__RenderLoop__Refiner);            // <-- The Visual Effects panel polls it from here
        let Na__RenderLoop__RefineWakeHandle = null;                         // <-- Pending debounce timer (settle wake-up)

        // CONSTANT | How Long to Leave a Stranded Refinement Before Restarting It
        // ---------------------------------------------------------------
        // Comfortably longer than the settle debounce, because this is a safety
        // net and not a schedule: it must never race the ordinary wake-up and
        // steal a burst that was about to carry on by itself.
        // ---------------------------------------------------------------
        const Na__RenderLoop__STRANDED_RECOVERY_MS = 1000;
        // ---------------------------------------------------------------

        // STATE | Watching a Refinement Actually Get Somewhere
        // ---------------------------------------------------------------
        // Comfortably longer than a chunk. The budget is 100ms and a cold first
        // chunk on a heavy model measured 260ms, so a count that has not moved
        // for two and a half seconds is stuck rather than busy.
        // ---------------------------------------------------------------
        const Na__RenderLoop__NO_PROGRESS_MS   = 2500;
        let   Na__RenderLoop__RefineSeenSamples = 0;                         // <-- Sample count at the last look
        let   Na__RenderLoop__RefineSeenAt      = 0;                         // <-- When it was last seen to change (0: not watching)
        // ---------------------------------------------------------------

        // SUB FUNCTION | Cancel a Pending Refinement Wake-Up
        // ---------------------------------------------------------------
        function Na__RenderLoop__CancelRefineWake() {
            if (Na__RenderLoop__RefineWakeHandle === null) return;
            window.clearTimeout(Na__RenderLoop__RefineWakeHandle);
            Na__RenderLoop__RefineWakeHandle = null;
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Abandon Any Part-Finished Refinement
        // ---------------------------------------------------------------
        // Called for every reason a frame is asked for. A render request is by
        // definition "the picture should be different now", which is exactly
        // when an average of the old picture must be thrown away.
        // ---------------------------------------------------------------
        function Na__RenderLoop__ResetRefinement() {
            Na__RenderLoop__CancelRefineWake();
            Na__RenderLoop__Refiner.reset();
        }
        // ---------------------------------------------------------------

        function Na__RenderLoop__ScheduleFrame() {
            if (Na__RenderLoop__PauseReasons.size > 0) { Na__RenderLoop__PendingWhilePaused = true; return; }  // <-- Held: remember, do not paint
            if (Na__RenderLoop__FrameHandle !== null) return;
            Na__RenderLoop__FrameHandle = requestAnimationFrame(Na__RenderLoop__Tick);
        }

        function Na__RenderLoop__RequestRenderOnce() {
            if (document.hidden) return;
            Na__RenderLoop__ResetRefinement();                                // <-- The scene changed; the running average is stale
            Na__RenderLoop__ScheduleFrame();
        }

        function Na__RenderLoop__EnableActiveRendering(reason = 'general') {
            Na__RenderLoop__ActiveReasons.add(reason);
            Na__RenderLoop__RequestRenderOnce();
        }

        function Na__RenderLoop__DisableActiveRendering(reason = 'general') {
            Na__RenderLoop__ActiveReasons.delete(reason);
            Na__RenderLoop__RequestRenderOnce();
        }

        const NA__ORBIT_TRAILING_FRAMES = 3;                                   // <-- Extra frames after orbit 'end' to let controls.update() settle
        let Na__RenderLoop__OrbitTrailingFrames = 0;
        let Na__RenderLoop__ActiveCamera       = Na__Camera__Main;              // <-- Tracks which camera the render pipeline is using
        let Na__RenderLoop__ElevationActive    = false;                          // <-- True when ortho elevation camera is active
        let Na__RenderLoop__2dProfileNormals   = null;                           // <-- 2D profile lines render function (set via event)

        // AO PERFORMANCE MONITOR | Startup delay before FPS sampling begins (MaxEngine)
        const Na__AoPerformanceMonitorStartupDelayMs = (Na__Config__AmbientOcclusion && Number.isFinite(Na__Config__AmbientOcclusion.RenderEffect__AmbientOcclusion__PerformanceMonitorStartupDelayMs))
            ? Na__Config__AmbientOcclusion.RenderEffect__AmbientOcclusion__PerformanceMonitorStartupDelayMs
            : 3000;
        let Na__RenderLoop__CanMonitorAoPerformance = false;                     // <-- Suppresses FPS sampling during load spikes
        window.setTimeout(() => {
            Na__RenderLoop__CanMonitorAoPerformance = true;
        }, Math.max(0, Na__AoPerformanceMonitorStartupDelayMs));

        window.addEventListener('na-elevation-camera-changed', (event) => {
            if (event.detail && event.detail.camera) {
                Na__RenderLoop__ActiveCamera = event.detail.camera;             // <-- Swap active camera for effects
            }
            Na__RenderLoop__ElevationActive = !!(event.detail && event.detail.isOrtho); // <-- Track elevation mode
            if (event.detail && event.detail.render2dProfileNormals) {
                Na__RenderLoop__2dProfileNormals = event.detail.render2dProfileNormals; // <-- Store 2D profile lines renderer
            }
        });

        // SUB FUNCTION | Run the Effect Chain Once Through the Camera's Projection
        // ---------------------------------------------------------------
        // Everything in here reads camera.projectionMatrix, which is exactly
        // why it is one function: a refinement sample nudges that projection
        // and needs every one of these to repeat through the nudged matrix.
        // Jitter only the scene render, as three's own SSAARenderPass does,
        // and the walls smooth out while every profile line stays as stepped
        // as it was. The lines are the drawing.
        // ---------------------------------------------------------------
        function Na__RenderLoop__DrawEffectChain() {
            // MAXENGINE EXTRAS | No-ops under PureEngine (keys absent from its pipeline state)
            if (Na__RenderPipeline__State.updateAoUniforms) {
                Na__RenderPipeline__State.updateAoUniforms(Na__RenderLoop__ActiveCamera);  // <-- Sync SSAO camera matrices
            }
            if (Na__RenderPipeline__State.renderDepthPrePass) {
                Na__RenderPipeline__State.renderDepthPrePass();              // <-- Depth capture for SSAO/fog (no-op when profile lines share depth)
            }

            if (Na__RenderLoop__ElevationActive && Na__RenderLoop__2dProfileNormals) {
                Na__RenderLoop__2dProfileNormals(Na__RenderLoop__ActiveCamera); // <-- 2D profile lines with ortho camera
            } else {
                Na__RenderPipeline__State.renderProfileNormals();             // <-- 3D profile lines with persp camera
            }
            Na__RenderComposer__Main.render();                               // <-- Render with post-processing
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Draw the Cross Section Overlay Onto the Finished Frame
        // ---------------------------------------------------------------
        // Drawn AFTER post-processing so fog, SSAO and Sobel never touch the
        // caps, outlines or gizmos. It draws onto the already-composited
        // colour buffer with autoClear off, so it goes equally well on top of
        // a composer frame or a presented average - and a refinement present
        // overwrites the whole canvas, so it has to go back on after each one.
        // ---------------------------------------------------------------
        function Na__RenderLoop__DrawSectionOverlay() {
            const Na__Section__DrawOverlay = Na__SectionClipping__GetOverlayRenderer();
            if (Na__Section__DrawOverlay) {
                Na__Section__DrawOverlay(Na__RenderLoop__ActiveCamera);
            }
        }
        // ---------------------------------------------------------------

        function Na__RenderLoop__RenderFrame(deltaMs) {
            // ENGINE HELD | The third stand-down point (TrueVision v2.58.2). A
            // Layout Editor sheet has taken a hold, and a held engine paints
            // NOTHING: a sheet that owns the screen is never drawn over, by the
            // frame or by the refiner. This loop's own hold set, fed by the
            // pause and resume events, already keeps frames from being
            // scheduled; Na__RenderLoop__IsPaused is asked as well because its
            // mirror holds a pause taken before these listeners existed - a
            // sheet opened while the models were still loading. suspend()
            // rather than reset(), because a held engine must ask for no frames
            // of its own until the holder lets go. The frame is remembered, so
            // the resume paints one the moment the last hold clears.
            if (Na__RenderLoop__IsPaused() || Na__RenderLoop__PauseReasons.size > 0) {
                Na__RenderLoop__PendingWhilePaused = true;                   // <-- The resume paints one frame
                Na__RenderLoop__Refiner.suspend();
                return false;                                                // <-- Idle until the last hold lifts
            }

            // 2D DRAWING MODE | A floor plan or elevation owns the viewport.
            // Checked FIRST so none of the 3D per-frame work runs: walk/fly
            // physics, orbit updates, door proximity, billboards, fog uniforms
            // and distance culling are meaningless on a drawing. The composer
            // preset renders the frame (2D normals pre-pass, composer, section
            // overlay) through the ortho camera; the markup layers reproject.
            // @delegate: ../40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js
            const Na__Drawing__Camera = Na__DrawView__GetCamera();
            if (Na__Drawing__Camera) {
                Na__RenderLoop__Refiner.suspend();                           // <-- A sheet owns the screen; this pass is the 3D viewport only
                if (!Na__DrawView__RenderPreset__RenderFrame()) {
                    Na__Renderer__Main.render(Na__Scene__Main, Na__Drawing__Camera); // <-- Preset not up yet: plain render
                }
                Na__DrawMarkup__SyncFrame();                                 // <-- Reproject the markup onto the new view
                Na__PlOverlay__SyncFrame();                                  // <-- Register the projected linework overlay (port Phase 4)
                return Na__RenderLoop__ActiveReasons.size > 0;               // <-- Only pan/zoom keeps frames coming
            }

            // INTERACTIVE 3D FRAME | The only frame an authoring overlay is drawn in.
            // The drawing planes sit in the main scene, and the main scene is also
            // rendered by a sheet's 3D viewport, a thumbnail, a still and a video
            // export. They are invisible by default and switched on HERE - past the
            // hold and past the 2D drawing, so neither can ever show one - and
            // switched off again in the tick's finally. A render path nobody has
            // written yet therefore cannot print a plane.
            // NOT IN A VIDEO STUDIO PREVIEW. The preview is the video being made,
            // drawn through this same frame, and authoring aids stay out of it as
            // they stay out of the video export.
            if (!Na__VideoStudio__Preview__IsPlaying()) {
                Na__InteractiveOverlays__BeginFrame();
            }

            if (Na__VideoStudio__Preview__IsPlaying()) {
                Na__VideoStudio__Preview__UpdateFrame(deltaMs);              // <-- Video Studio timeline owns the camera this frame
                if (Na__VideoStudio__Preview__AreAnimationsEnabled()) {
                    Na__DoorProximity__Update(Na__Camera__Main.position);    // <-- Proximity door triggers along the path
                }
            } else if (Na__WalkMode__IsActive()) {
                Na__WalkMode__Update(deltaMs);                               // <-- Update walk mode physics and camera
                Na__DoorProximity__Update(Na__WalkMode__GetCapsulePosition()); // <-- Proximity door triggers (walk capsule position)
            } else if (Na__FlyMode__IsActive()) {
                Na__FlyMode__Update(deltaMs);                                // <-- Update fly mode camera movement
                Na__DoorProximity__Update(Na__FlyMode__GetCameraPosition()); // <-- Proximity door triggers (fly camera position)
            } else {
                Na__Navmode__UpdateNavigation();                             // <-- Update orbit controls
            }

            Na__VerticalCorrection__ApplyFrame();                            // <-- Apply vertical perspective correction (no-ops when disabled)

            Na__DoorAnimation__Update(deltaMs);                              // <-- Update door animations

            Na__CameraFollow__Update(Na__RenderLoop__ActiveCamera);          // <-- Rotate camera-follow billboards

            Na__FogPlaneSystem__UpdatePerFrame(Na__RenderLoop__ActiveCamera, Na__Controls__Orbit); // <-- Fog shader uniforms + camera constraint

            Na__DistanceCulling__Update(Na__Camera__Main.position);          // <-- MaxEngine distance culling (internal no-op when disabled)

            if (Na__RenderComposer__Main && Na__RenderPipeline__State) {
                // PROGRESSIVE REFINEMENT | What kind of frame is this?
                // ---------------------------------------------------------
                // sceneBusy is everything that changes the picture WITHOUT
                // moving the camera, which the stillness test cannot see. The
                // legacy 2D elevation camera is in there deliberately: this
                // pass is the 3D viewport only, and the drawing views run
                // through their own composer preset. A render hold is not
                // tested here: it stands the refiner down at the top of this
                // function, before any of the per-frame work, so by the time
                // control reaches this line the engine is known not to be held.
                // ---------------------------------------------------------
                const Na__Refine__SceneBusy = Na__VideoStudio__Preview__IsPlaying()
                    || Na__DoorAnimation__HasActiveAnimations()
                    || Na__RenderLoop__OrbitTrailingFrames > 0
                    || Na__RenderLoop__ElevationActive;

                // NO TIMESTAMP IS PASSED, deliberately. The only one this loop
                // has is the animation frame's, which is when the frame BEGAN,
                // and the refiner measures everything else with performance.now().
                // Handing it the frame clock put its settle test on a different
                // clock from its own wake-up scheduler, which is what jammed the
                // refinement part-way. It reads the one clock itself now.
                const Na__Refine__FrameMode = Na__RenderLoop__Refiner.planFrame({
                    camera    : Na__RenderLoop__ActiveCamera,
                    sceneBusy : Na__Refine__SceneBusy
                });

                let Na__Refine__DidDraw = false;
                if (Na__Refine__FrameMode === Na__Refine__FRAME_PRESENT) {
                    // CONVERGED | Nothing left to draw and the loop cannot idle
                    // (walk and fly hold it open to poll the keyboard). The
                    // finished average is copied back out rather than the frame
                    // skipping: the drawing buffer is not preserved, so a frame
                    // that draws nothing composites an empty one and flashes.
                    Na__Refine__DidDraw = Na__RenderLoop__Refiner.presentAgain(Na__RenderLoop__DrawSectionOverlay);

                } else if (Na__Refine__FrameMode === Na__Refine__FRAME_REFINE) {
                    // AO GETS THE FULL KERNEL HERE, ROTATED PER SAMPLE.
                    // The burst already pays for sixteen SSAO passes - the effect
                    // runs inside drawChain like everything else in the chain - so
                    // the only question is whether those sixteen say anything
                    // different to each other. SSAO's kernel rotation is hashed
                    // from the fullscreen quad's UV, which the jitter does not
                    // move, so without onSample they were sixteen identical
                    // estimates and the noise survived into the parked image.
                    // MaxEngine only: PureEngine builds no AO, so the hooks are
                    // absent there and the refiner's own guard skips them.
                    try {
                        Na__Refine__DidDraw = Na__RenderLoop__Refiner.renderChunk({
                            camera      : Na__RenderLoop__ActiveCamera,
                            composer    : Na__RenderComposer__Main,
                            fxaaPass    : Na__RenderPipeline__State.fxaaPassRef || null,
                            drawChain   : Na__RenderLoop__DrawEffectChain,
                            drawOverlay : Na__RenderLoop__DrawSectionOverlay,
                            onSample    : Na__RenderPipeline__State.setAoRefineSample || null
                        });
                    } finally {
                        if (Na__RenderPipeline__State.setAoFullQuality) {
                            Na__RenderPipeline__State.setAoFullQuality(); // <-- Rotation put back; the exporters borrow this same pass
                        }
                    }
                }

                // ORDINARY FRAME | Exactly the frame this loop always drew, and
                // the fallback for a refinement that could not draw - a frame
                // MUST put something on the canvas or the viewport flashes.
                // The AO performance monitor samples here and ONLY here: a
                // refinement chunk is several frames' work in one and would
                // read to it as a catastrophic frame rate.
                if (!Na__Refine__DidDraw) {
                    if (Na__RenderPipeline__State.monitorAoFrame && Na__RenderLoop__CanMonitorAoPerformance) {
                        Na__RenderPipeline__State.monitorAoFrame(deltaMs);   // <-- FPS-based AO auto-disable sampling
                    }
                    Na__RenderLoop__Refiner.noteNormalFrame(Na__RenderLoop__PrevTimestamp, deltaMs); // <-- Frame rate readout + chunk sizing

                    // AO ON A MOVING FRAME | BORROWED, AND PUT BACK IN THE SAME FRAME.
                    // A reduced kernel is right here and nowhere else: this is the
                    // image nobody studies, and the burst that follows the camera
                    // stopping restores it and then some. The restore is not
                    // optional and not deferrable - the still exporter, the video
                    // exporter and the Layout Editor all borrow this composer
                    // BETWEEN frames and render through it without asking for a
                    // quality, so a budget left lowered here would quietly ship a
                    // half-sampled export. Same borrow-and-return discipline the
                    // refiner uses for FXAA and renderToScreen, for the same reason.
                    // MaxEngine only; PureEngine has no AO and no hooks.
                    if (Na__RenderPipeline__State.setAoLiveQuality) {
                        Na__RenderPipeline__State.setAoLiveQuality();
                        try {
                            Na__RenderLoop__DrawEffectChain();
                        } finally {
                            Na__RenderPipeline__State.setAoFullQuality();
                        }
                    } else {
                        Na__RenderLoop__DrawEffectChain();
                    }
                    Na__RenderLoop__DrawSectionOverlay();
                }
            }

            if (Na__RenderLoop__OrbitTrailingFrames > 0) {
                Na__RenderLoop__OrbitTrailingFrames--;
                return true;                                                 // <-- Keep rendering for trailing settle frames
            }

            return Na__WalkMode__IsActive()
                || Na__FlyMode__IsActive()
                || Na__DoorAnimation__HasActiveAnimations()
                || Na__RenderLoop__ActiveReasons.size > 0;
        }

        // SUB FUNCTION | Notice a Refinement That Has Stopped Getting Anywhere
        // ---------------------------------------------------------------
        // The stranded-burst check below only runs when the refiner asks for
        // NOTHING, and the clock-mismatch stall did the opposite: it asked for
        // another frame every time and then refused to use it. A part-finished
        // total that has not grown for this long is wrong whichever way it got
        // there, so this watches the count rather than the answer. Restarting
        // the run is always safe - the worst case is sixteen samples drawn
        // twice - and the warning means a stall of this shape can never be
        // silent again.
        // ---------------------------------------------------------------
        function Na__RenderLoop__WatchRefineProgress() {
            const status = Na__RenderLoop__Refiner.getStatus();

            if (!status.enabled || status.converged || !(status.samplesDone > 0)) {
                Na__RenderLoop__RefineSeenSamples = status.samplesDone;       // <-- Nothing in flight; keep the marker honest
                Na__RenderLoop__RefineSeenAt      = 0;
                return;
            }

            const now = performance.now();

            if (status.samplesDone !== Na__RenderLoop__RefineSeenSamples) {   // <-- It moved; the run is healthy
                Na__RenderLoop__RefineSeenSamples = status.samplesDone;
                Na__RenderLoop__RefineSeenAt      = now;
                return;
            }

            if (Na__RenderLoop__RefineSeenAt === 0) {                         // <-- First sighting at this count
                Na__RenderLoop__RefineSeenAt = now;
                return;
            }

            if ((now - Na__RenderLoop__RefineSeenAt) < Na__RenderLoop__NO_PROGRESS_MS) return;

            // THE ROOT CAUSE IS STILL OPEN, so this says everything needed to
            // close it: how far it got, what the refiner was asking for while
            // it sat there, and whether the loop was being held open by
            // something. A stall that reports itself is a stall that gets fixed.
            const pending = Na__RenderLoop__Refiner.getPendingWork();
            console.warn('[ValeVision3D] Progressive refinement stalled at '
                + status.samplesDone + ' of ' + status.sampleCount + '; restarting the run.',
                { wanted    : pending.wanted,
                  delayMs   : pending.delayMs,
                  fps       : Math.round(status.fps),
                  readBuffer : (Na__RenderComposer__Main && Na__RenderComposer__Main.readBuffer)
                      ? Na__RenderComposer__Main.readBuffer.width + 'x' + Na__RenderComposer__Main.readBuffer.height
                      : null,                                                 // <-- A fractional size here is the buffer-rebuild stall
                  pixelRatio : Na__Renderer__Main.getPixelRatio(),
                  dpr        : window.devicePixelRatio,
                  activeReasons : Array.from(Na__RenderLoop__ActiveReasons),
                  trailing  : Na__RenderLoop__OrbitTrailingFrames,
                  held      : Na__RenderLoop__IsPaused() || Na__RenderLoop__PauseReasons.size > 0,
                  hidden    : document.hidden });
            Na__RenderLoop__RefineSeenSamples = 0;
            Na__RenderLoop__RefineSeenAt      = 0;
            Na__RenderLoop__Refiner.reset();                                  // <-- Fresh run; RequestRenderOnce would recurse through here
            Na__RenderLoop__ScheduleFrame();
        }
        // ---------------------------------------------------------------

        // SUB FUNCTION | Arm Whatever Comes After This Frame
        // ---------------------------------------------------------------
        // EVERY tick ends here, on every path, which is the whole point of it
        // being its own function. A burst of refinement only stays alive
        // because the tick that ends a chunk asks for the next one, so a tick
        // that returns early - or throws - abandons the burst with no frame
        // pending and no wake-up armed, and nothing ever comes back for it.
        // That is what left the Visual Effects readout frozen part-way through
        // a run, "6 of 16" for ever on a machine fast enough to fit six samples
        // into the first chunk. Arming is now unconditional.
        // ---------------------------------------------------------------
        function Na__RenderLoop__ArmNextFrame(keepRendering) {
            if (document.hidden) return;                                     // <-- visibilitychange re-arms on the way back

            Na__RenderLoop__WatchRefineProgress();                           // <-- Runs on every path, moving or idle

            if (keepRendering) {
                Na__RenderLoop__ScheduleFrame();                             // <-- Something is still moving
                return;
            }

            // SETTLE | The loop is free to idle. Before it does, ask whether the
            // viewport still owes itself samples. delayMs is what is left of the
            // debounce, so the engine sits genuinely idle through it - a run of
            // small nudges never starts and abandons a burst - and then wakes to
            // draw the next chunk. Once converged this asks for nothing and the
            // loop stops exactly as it always did, with the canvas holding the
            // refined image and the GPU switched off.
            const Na__Refine__Pending = Na__RenderLoop__Refiner.getPendingWork();

            if (Na__Refine__Pending.wanted) {
                if (Na__Refine__Pending.delayMs <= 0) {
                    Na__RenderLoop__ScheduleFrame();                         // <-- Mid-burst: straight back for the next chunk
                    return;
                }
                Na__RenderLoop__RefineWakeHandle = window.setTimeout(() => {
                    Na__RenderLoop__RefineWakeHandle = null;
                    Na__RenderLoop__ScheduleFrame();                         // <-- Debounce served; begin refining
                }, Na__Refine__Pending.delayMs);
                return;
            }

            // STRANDED BURST | Nothing was armed, yet a part-finished total is
            // on the canvas. Every legitimate stand-down - a 2D sheet, an engine
            // hold, the tab going away, a camera nudge - throws the total away
            // as it stands down, so a count between one and fifteen with nothing
            // scheduled is a state the refiner should never be able to reach.
            // It costs one wake-up to make it recoverable instead of permanent,
            // and because a resting app always reads zero or converged, this can
            // never turn into a loop that wakes itself for ever.
            const Na__Refine__Status = Na__RenderLoop__Refiner.getStatus();
            if (!Na__Refine__Status.enabled) return;
            if (Na__Refine__Status.converged) return;

            Na__RenderLoop__RefineWakeHandle = window.setTimeout(() => {
                Na__RenderLoop__RefineWakeHandle = null;
                Na__RenderLoop__RequestRenderOnce();                          // <-- Start the run again rather than leave it half done
            }, Na__RenderLoop__STRANDED_RECOVERY_MS);
        }
        // ---------------------------------------------------------------

        function Na__RenderLoop__Tick(timestamp) {
            Na__RenderLoop__FrameHandle = null;
            Na__RenderLoop__CancelRefineWake();                              // <-- A frame is running; any pending wake-up is spent

            const now     = timestamp || performance.now();                  // <-- Current timestamp
            const deltaMs = now - Na__RenderLoop__PrevTimestamp;             // <-- Time since last frame
            Na__RenderLoop__PrevTimestamp = now;                             // <-- Update previous timestamp

            // A THROWN FRAME MUST NOT STOP THE LOOP. Without this, one bad frame
            // - a pass with no buffer, a model swapped mid-render - takes the
            // whole render loop with it: the tick unwinds before it can ask for
            // another, and the viewport freezes until something else happens to
            // request a redraw. The error is still reported, once per frame.
            let keepRendering = false;
            try {
                keepRendering = Na__RenderLoop__RenderFrame(deltaMs);
            } catch (error) {
                console.error('[ValeVision3D] Render frame failed; the loop carries on:', error);
            } finally {
                Na__InteractiveOverlays__EndFrame();                         // <-- Every path, thrown frames included: no overlay outlives its frame
                Na__RenderLoop__ArmNextFrame(keepRendering);
            }
        }

        window.addEventListener(NA__REQUEST_RENDER_EVENT, Na__RenderLoop__RequestRenderOnce);
        window.addEventListener(NA__REQUEST_ACTIVE_RENDER_EVENT, (event) => {
            Na__RenderLoop__EnableActiveRendering(event.detail && event.detail.reason ? event.detail.reason : 'general');
        });
        window.addEventListener(NA__STOP_ACTIVE_RENDER_EVENT, (event) => {
            Na__RenderLoop__DisableActiveRendering(event.detail && event.detail.reason ? event.detail.reason : 'general');
        });
        // ENGINE PAUSE | A 2D sheet owns the screen (port Phase 5): nothing paints until every holder resumes
        window.addEventListener(NA__PAUSE_RENDER_LOOP_EVENT, (event) => {
            Na__RenderLoop__PauseReasons.add(event.detail && event.detail.reason ? event.detail.reason : 'general');
            Na__RenderLoop__CancelRefineWake();
            Na__RenderLoop__Refiner.suspend();                                // <-- A holder owns the engine; ask for nothing until it lets go
            if (Na__RenderLoop__FrameHandle !== null) { cancelAnimationFrame(Na__RenderLoop__FrameHandle); Na__RenderLoop__FrameHandle = null; Na__RenderLoop__PendingWhilePaused = true; }
        });
        window.addEventListener(NA__RESUME_RENDER_LOOP_EVENT, (event) => {
            Na__RenderLoop__PauseReasons.delete(event.detail && event.detail.reason ? event.detail.reason : 'general');
            if (Na__RenderLoop__PauseReasons.size > 0) return;
            const pending = Na__RenderLoop__PendingWhilePaused || Na__RenderLoop__ActiveReasons.size > 0;
            Na__RenderLoop__PendingWhilePaused = false;
            Na__RenderLoop__PrevTimestamp = performance.now();                // <-- No giant delta for walk, fly or door physics
            if (pending) Na__RenderLoop__RequestRenderOnce();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                Na__RenderLoop__CancelRefineWake();
                Na__RenderLoop__Refiner.suspend();                            // <-- No wake-up timer firing into a backgrounded tab
                return;
            }
            Na__RenderLoop__RequestRenderOnce();
        });

        Na__Controls__Orbit.addEventListener('start', () => {
            Na__RenderLoop__OrbitTrailingFrames = 0;                          // <-- Cancel any pending trail; user is actively interacting
            Na__RenderLoop__EnableActiveRendering('orbit');
        });
        Na__Controls__Orbit.addEventListener('end', () => {
            Na__RenderLoop__DisableActiveRendering('orbit');
            Na__RenderLoop__OrbitTrailingFrames = NA__ORBIT_TRAILING_FRAMES;  // <-- Render a few more frames to let controls.update() settle
            Na__RenderLoop__RequestRenderOnce();
        });
        Na__Controls__Orbit.addEventListener('change', Na__RenderLoop__RequestRenderOnce);

        // RENDER ENGINE SWITCH | Live PureEngine <-> MaxEngine swap (UI dispatched)
        // ---------------------------------------------------------------
        // Rebuilds the composer for the requested engine and re-applies the
        // engine-appropriate materials. Door animations, walk collision meshes,
        // and the door registry are untouched: they reference Object3D nodes,
        // which both the swap and the restore leave fully intact.
        // ---------------------------------------------------------------
        let Na__RenderEngine__SwitchInProgress = false;                      // <-- Re-entrancy guard for rapid toggling

        window.addEventListener('na-render-engine-switch', async (event) => {
            const requestedEngine = (event.detail && event.detail.engine === Na__RenderEngine__MAX)
                ? Na__RenderEngine__MAX
                : Na__RenderEngine__PURE;

            if (requestedEngine === Na__RenderEngine__GetActiveEngine()) return;   // <-- Already active
            if (Na__RenderEngine__SwitchInProgress) return;                        // <-- Ignore re-entrant requests mid-switch

            Na__RenderEngine__SwitchInProgress = true;
            try {
                Na__RenderLoop__Refiner.release();                           // <-- The old composer's buffers are going; start the next burst clean
                Na__RenderEngine__BuildPipeline(requestedEngine);            // <-- Rebuild composer chain for the new engine
                await Na__RenderEngine__ApplyEngineMaterials(requestedEngine); // <-- Swap / restore materials to match
            } catch (switchError) {
                console.error('[ValeVision3D] Render engine switch failed:', switchError);
            } finally {
                Na__RenderEngine__SwitchInProgress = false;
            }

            Na__RenderLoop__RequestRenderOnce();                             // <-- Redraw with the new engine
            window.dispatchEvent(new CustomEvent('na-render-engine-changed', {
                detail: { engine: Na__RenderEngine__GetActiveEngine() }
            }));
        });
        // ---------------------------------------------------------------

        Na__RenderLoop__RequestRenderOnce();

        // RESIZE HANDLER
        window.addEventListener('resize', () => {
            const width  = window.innerWidth;
            const height = window.innerHeight;

            Na__Camera__Main.aspect = width / height;
            Na__Camera__Main.updateProjectionMatrix();
            Na__Renderer__Main.setSize(width, height);
            if (Na__RenderComposer__Main && Na__RenderPipeline__State) {
                Na__RenderComposer__Main.setSize(width, height);
                Na__RenderPipeline__State.setProfileLinesSize(width, height);
                Na__RenderPipeline__State.setFxaaSize(width, height);        // <-- Update FXAA resolution uniform
                if (Na__RenderPipeline__State.setDepthPrePassSize) {
                    Na__RenderPipeline__State.setDepthPrePassSize(width, height);  // <-- MaxEngine: resize depth pre-pass RT
                }
                if (Na__RenderPipeline__State.setAoSize) {
                    Na__RenderPipeline__State.setAoSize(width, height);      // <-- MaxEngine: update SSAO resolution uniforms
                }
            }

            Na__LineResolution__Screen.set(width, height);
            Na__FloorPlanMode__HandleResize(width, height);                  // <-- Ortho frustum aspect + markup reprojection (port Phase 2)
            Na__ElevationMode__HandleResize(width, height);                  // <-- Same for the elevation camera (port Phase 3)
            Na__RenderLoop__RequestRenderOnce();
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | App Flow API
    // ------------------------------------------------------------
    export {
        Na__AppFlow__StartLoadingSequence
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
