// =============================================================================
// VALEVISION3D - FLOOR PLAN VIEWS - MODE CONTROLLER
// =============================================================================
//
// FILE       : Na__FloorPlan__ModeController__.js
// NAMESPACE  : Na__FloorPlanMode
// MODULE     : Floor Plan Views - Mode Controller
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Orchestrate entering, switching and leaving 2D floor plan mode
// CREATED    : 31-Aug-2026
//
// DESCRIPTION:
// - The single place the cut, the orthographic camera, the render presets,
//   the locked navigation and the annotation layer are switched on and off
//   together. Every other floor plan module is a leaf that knows nothing
//   about the others.
// - ENTERING from 3D applies the cut FIRST, so the cap geometry is built while
//   the viewer is still stationary rather than hitching at the end of the
//   flight, and so the building is already sliced as the camera rises over it.
//   The perspective camera then eases up to a top-down pose framed to roughly
//   match the plan, and only at the end does the projection swap to
//   orthographic - which is the one moment the two projections differ. That
//   swap is the composer preset taking the RenderPass camera; the material
//   preset applies the plan's style toggles at the same moment.
// - SWITCHING between two plans is an instant flip, by design. The plans are
//   drawing pages; animating between two top-down parallel views reads as
//   jarring rather than pleasant, so the config ships that transition at 0ms.
// - LEAVING reverses it: annotations go first so the text is gone before the
//   view moves, then the presets come off and the projection swaps back at the
//   top-down pose, then the perspective camera eases down to the target scene.
// - Annotation undo history and the editing shortcuts are bound and unbound
//   with the markup itself, so neither can ever outlive the plan it belongs to.
// - The render loop asks the DRAWING VIEW BROKER for a camera each frame. A
//   non-null answer means a 2D drawing owns the view and the composer preset
//   renders the frame; this controller registers the adapter that answers it
//   while a plan is on screen.
//
// INTEGRATION:
// - Initialized once from index.html with the camera, controls, canvas and
//   model root.
// - Na__FloorPlan__DevMenu__Editor__ drives Preview / Annotate.
// - The scene carousel routes a floor plan scene here instead of animating
//   the perspective camera to it.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ModeController__.js
// - Source version: 1.1.0 (07-Sep-2026)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.18.0 (port Phase 2)
// - Parity        : adapted
// - Divergences   :
//   - Cut through Na__DrawView__SectionAdapter__ (D07) instead of Na__SectionCut__Engine__.
//   - Composer and material presets enter when the ortho camera takes over and exit before the flight down (D12, D33).
//   - Suspending 3D, the flight and the router registration delegated to Na__DrawView__Transitions__.
//   - Elevation scenes recognised through Na__DrawView__ProjectData__ rather than the elevation data module.
//   - Floor plan records read from the drawings block; the presentation block only supplies scene links.
// - Back-port     : none pending.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.2.1
// - Holds the live Cross Sections tool through the section adapter on entry
//   and releases it on exit (port Phase 3), so a plan and an elevation hand
//   the viewport over without the author's sections rebuilding in between.
//
// 09-Sep-2026 - Version 1.2.0
// - Ported to ValeVision3D: section adapter, composer and material presets,
//   shared transitions, live style application.
//
// 07-Sep-2026 - Version 1.1.0
// - Plan mode now registers itself with the drawing view broker rather than
//   being the only 2D drawing the markup layers know about, and drives the
//   shared 2D navigation instead of its own copy. Entering releases any
//   elevation first, because there is one annotation layer for both.
//
// 31-Aug-2026 - Version 1.0.0
// - Initial implementation for the Floor Plan Builder.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Render Loop and Math Utilities
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    import {
        Na__Math__ConvertMmToUnits,
        Na__Math__ConvertUnitsToMm
    } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Drawing View Core (broker, cut, presets, transitions, data)
    // ------------------------------------------------------------
    // @delegate: ../42__System__DrawingViewCore/
    // ------------------------------------------------------------
    import {
        Na__DrawView__KIND_PLAN,
        Na__DrawView__SetActiveView,
        Na__DrawView__ClearActiveView,
        Na__DrawView__ReleaseOtherKind
    } from '../42__System__DrawingViewCore/Na__DrawView__ActiveView__.js';
    import {
        Na__DrawView__SectionAdapter__UpsertHorizontalPlane,
        Na__DrawView__SectionAdapter__SetActivePlane,
        Na__DrawView__SectionAdapter__RemovePlane,
        Na__DrawView__SectionAdapter__SuspendLiveTool,
        Na__DrawView__SectionAdapter__Release,
        Na__DrawView__SectionAdapter__ReapplyClipping
    } from '../42__System__DrawingViewCore/Na__DrawView__SectionAdapter__.js';
    import {
        Na__DrawView__ComposerPreset__Enter,
        Na__DrawView__ComposerPreset__Exit,
        Na__DrawView__ComposerPreset__ApplyStyles
    } from '../42__System__DrawingViewCore/Na__DrawView__ComposerPreset__.js';
    import {
        Na__DrawView__MaterialPreset__Enter,
        Na__DrawView__MaterialPreset__Exit,
        Na__DrawView__MaterialPreset__ApplyStyles
    } from '../42__System__DrawingViewCore/Na__DrawView__MaterialPreset__.js';
    import {
        Na__DrawView__Transitions__SuspendThreeD,
        Na__DrawView__Transitions__ResumeThreeD,
        Na__DrawView__Transitions__FlyTo,
        Na__DrawView__Transitions__RegisterRouter
    } from '../42__System__DrawingViewCore/Na__DrawView__Transitions__.js';
    import {
        Na__DrawNav__Attach,
        Na__DrawNav__Detach
    } from '../42__System__DrawingViewCore/Na__DrawView__Navigation__.js';
    import {
        Na__DrawMarkup__Mount,
        Na__DrawMarkup__Unmount,
        Na__DrawMarkup__SyncLayerBox
    } from '../42__System__DrawingViewCore/Na__DrawView__MarkupMount__.js';
    import { Na__DrawData__IsElevationScene } from '../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Floor Plan Camera, Data, Config and Framing
    // ------------------------------------------------------------
    // @delegate: ./Na__FloorPlan__OrthoCamera__.js
    // @delegate: ./Na__FloorPlan__ProjectJson__Data__.js
    // @delegate: ./Na__FloorPlan__Framing__.js
    // ------------------------------------------------------------
    import {
        Na__FpCam__EnsureCamera,
        Na__FpCam__GetCamera,
        Na__FpCam__PositionForCut,
        Na__FpCam__FrameToBounds,
        Na__FpCam__HandleResize,
        Na__FpCam__SetPanTargetMm,
        Na__FpCam__GetPanTargetMm,
        Na__FpCam__SetZoom,
        Na__FpCam__GetZoom,
        Na__FpCam__PanByUnits,
        Na__FpCam__ZoomByFactor,
        Na__FpCam__GetUnitsPerPixel
    } from './Na__FloorPlan__OrthoCamera__.js';
    import {
        Na__FpData__GetCutHeightMm,
        Na__FpData__GetViewDepthMm,
        Na__FpData__GetSavedView,
        Na__FpData__SetSavedView,
        Na__FpData__GetAnnotations,
        Na__FpData__GetStyles,
        Na__FpData__GetClientDimensionsEnabled,
        Na__FpData__GetPlanForScene,
        Na__FpData__IsFloorPlanScene
    } from './Na__FloorPlan__ProjectJson__Data__.js';
    import {
        Na__FpCfg__Load,
        Na__FpCfg__IsEnabled,
        Na__FpCfg__GetTransitionSetup,
        Na__FpCfg__GetNavigationSetup
    } from './Na__FloorPlan__ConfigState__.js';
    import {
        Na__FpFrame__MeasureModel,
        Na__FpFrame__GetBounds,
        Na__FpFrame__BuildTopDownScene
    } from './Na__FloorPlan__Framing__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Markup Data (config loads, per-plan dimension array)
    // ------------------------------------------------------------
    import { Na__PlanAnno__Load } from '../44__System__PlanAnnotations/Na__PlanAnnotations__Data__.js';
    import { Na__PlanDim__Load } from '../45__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js';
    import { Na__PlanDim__GetPlanDimensions } from '../45__System__PlanDimensions/Na__PlanDimensions__Data__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Mode States
    // ------------------------------------------------------------
    const Na__FpMode__STATE_IDLE       = 'idle';         // <-- Ordinary 3D
    const Na__FpMode__STATE_ENTERING   = 'entering';     // <-- Perspective camera flying up
    const Na__FpMode__STATE_PLAN       = 'plan';         // <-- Orthographic plan owns the view
    const Na__FpMode__STATE_LEAVING    = 'leaving';      // <-- Perspective camera flying back down
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Section Cut Plane Id Prefix
    // ------------------------------------------------------------
    const Na__FpMode__CUT_ID_PREFIX = 'FloorPlanCut__';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Broadcast Event Name
    // ------------------------------------------------------------
    const Na__FpMode__CHANGED_EVENT = 'na-floorplan-mode-changed';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | App Context (set once at init)
    // ------------------------------------------------------------
    let Na__FpMode__PerspCamera = null;
    let Na__FpMode__Canvas      = null;
    let Na__FpMode__ModelRoot   = null;
    let Na__FpMode__Initialized = false;
    // ------------------------------------------------------------

    // MODULE VARIABLES | Active Plan and Mode State
    // ------------------------------------------------------------
    let Na__FpMode__State       = Na__FpMode__STATE_IDLE;
    let Na__FpMode__ActivePlan  = null;   // <-- Live floor plan record being displayed
    let Na__FpMode__EditMode    = false;  // <-- Annotation authoring enabled (developer only)
    let Na__FpMode__OnChanged   = null;   // <-- Host callback for unsaved-change tracking
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Broadcast the Current Mode to Interested UI
    // ------------------------------------------------------------
    function Na__FpMode__DispatchChanged() {
        window.dispatchEvent(new CustomEvent(Na__FpMode__CHANGED_EVENT, {
            detail : {
                state  : Na__FpMode__State,
                planId : Na__FpMode__ActivePlan ? Na__FpMode__ActivePlan.FloorPlan__Id : null,
                isPlan : Na__FpMode__State === Na__FpMode__STATE_PLAN
            }
        }));
        if (typeof Na__FpMode__OnChanged === 'function') Na__FpMode__OnChanged();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Viewport Size of the Render Canvas
    // ------------------------------------------------------------
    function Na__FpMode__GetViewportSize() {
        if (!Na__FpMode__Canvas) return { width: window.innerWidth, height: window.innerHeight };
        return {
            width  : Na__FpMode__Canvas.clientWidth  || window.innerWidth,
            height : Na__FpMode__Canvas.clientHeight || window.innerHeight
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Section Cut Plane Id for a Floor Plan
    // ------------------------------------------------------------
    function Na__FpMode__CutIdFor(plan) {
        return Na__FpMode__CUT_ID_PREFIX + plan.FloorPlan__Id;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cut, Camera and Preset Application
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Apply a Plan's Section Cut
    // ------------------------------------------------------------
    // Done before any camera movement so the cap geometry is built while the
    // viewer is stationary, rather than hitching at the end of the flight.
    // ------------------------------------------------------------
    function Na__FpMode__ApplyCut(plan) {
        const cutId  = Na__FpMode__CutIdFor(plan);
        const cutMm  = Na__FpData__GetCutHeightMm(plan);
        const depth  = Na__FpData__GetViewDepthMm(plan);

        Na__DrawView__SectionAdapter__UpsertHorizontalPlane(cutId, cutMm, depth);
        Na__DrawView__SectionAdapter__SetActivePlane(cutId);
        return cutId;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Place and Frame the Orthographic Camera for a Plan
    // ------------------------------------------------------------
    function Na__FpMode__ApplyPlanCamera(plan) {
        const size   = Na__FpMode__GetViewportSize();
        const bounds = Na__FpFrame__GetBounds(Na__FpMode__ModelRoot);
        const cutMm  = Na__FpData__GetCutHeightMm(plan);
        const saved  = Na__FpData__GetSavedView(plan);
        const frame  = Na__FpFrame__MeasureModel(Na__FpMode__ModelRoot, Na__FpMode__PerspCamera);

        Na__FpCam__EnsureCamera(size.width, size.height);
        if (bounds) Na__FpCam__FrameToBounds(bounds, size.width, size.height);

        // Centre on the model unless the author already framed this plan.
        Na__FpCam__PositionForCut(
            cutMm,
            frame ? frame.centreXMm : 0,
            frame ? frame.centreZMm : 0
        );

        if (saved.zoom !== null) Na__FpCam__SetZoom(saved.zoom);
        if (saved.targetXMm !== null && saved.targetZMm !== null) {
            Na__FpCam__SetPanTargetMm(saved.targetXMm, saved.targetZMm);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put the Composer and Materials Into Drawing Mode for a Plan
    // ------------------------------------------------------------
    // The composer takes the ortho camera; the materials follow the plan's
    // style toggles; then the cut's clip planes are re-assigned to whatever
    // materials are now on the meshes.
    // ------------------------------------------------------------
    function Na__FpMode__EnterPresets(plan) {
        const styles = Na__FpData__GetStyles(plan);
        Na__DrawView__ComposerPreset__Enter({ camera : Na__FpCam__GetCamera(), styles : styles });
        Na__DrawView__MaterialPreset__Enter(styles);
        Na__DrawView__SectionAdapter__ReapplyClipping();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Take the Presets Off Again
    // ------------------------------------------------------------
    function Na__FpMode__ExitPresets() {
        Na__DrawView__MaterialPreset__Exit();
        Na__DrawView__ComposerPreset__Exit();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hand the Viewport to This Plan
    // ------------------------------------------------------------
    // The adapter is what the shared markup layers and the shared navigation
    // steer through, and it is the ONLY place the plan's own axis mapping is
    // written down:
    //
    //     drawing axis 1 -> world X          screen right
    //     drawing axis 2 -> world Z          screen down
    //     the third      -> the cut height   fixed
    //
    // Registered BEFORE anything mounts, because the layers project on their
    // very first sync and a missing adapter reads to them as "no drawing yet".
    // ------------------------------------------------------------
    function Na__FpMode__RegisterDrawingView(plan) {
        const cutHeightUnits = Na__Math__ConvertMmToUnits(Na__FpData__GetCutHeightMm(plan));

        Na__DrawView__SetActiveView({
            kind             : Na__DrawView__KIND_PLAN,
            getCamera        : Na__FpCam__GetCamera,
            getUnitsPerPixel : Na__FpCam__GetUnitsPerPixel,

            // Called when an elevation takes the viewport. Leaving without a
            // flight, because the incoming drawing is about to fly the camera
            // itself and two transitions would fight over it.
            onRelease : () => Na__FloorPlanMode__ExitPlan(null),

            planeMmToWorldUnits : (axis1Mm, axis2Mm) => ({
                x : Na__Math__ConvertMmToUnits(axis1Mm),
                y : cutHeightUnits,
                z : Na__Math__ConvertMmToUnits(axis2Mm)
            }),

            // Under a parallel projection one pixel is a fixed number of scene
            // units everywhere, so a canvas offset from the centre converts to
            // a world offset from the camera without a ray solve.
            screenOffsetToPlaneMm : (offsetXPx, offsetYPx, unitsPerPixel) => {
                const camera = Na__FpCam__GetCamera();
                if (!camera) return null;
                return {
                    posXMm : Na__Math__ConvertUnitsToMm(camera.position.x + (offsetXPx * unitsPerPixel)),
                    posZMm : Na__Math__ConvertUnitsToMm(camera.position.z + (offsetYPx * unitsPerPixel))
                };
            },

            panByPlaneUnits : (du, dv) => Na__FpCam__PanByUnits(du, dv),
            zoomByFactor    : Na__FpCam__ZoomByFactor
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Raise the Markup Stack Over This Plan
    // ------------------------------------------------------------
    // ONE array reference is shared by the layer, the history stack and the
    // floor plan record that gets saved. Resolved once here so all three can
    // never end up bound to different copies.
    // ------------------------------------------------------------
    function Na__FpMode__MountAnnotations(plan) {
        Na__DrawMarkup__Mount({
            canvas        : Na__FpMode__Canvas,
            modelRoot     : Na__FpMode__ModelRoot,
            annotations   : Na__FpData__GetAnnotations(plan),
            dimensions    : Na__PlanDim__GetPlanDimensions(plan),
            editMode      : Na__FpMode__EditMode,
            clientAllowed : Na__FpData__GetClientDimensionsEnabled(),
            planeHeightMm : Na__FpData__GetCutHeightMm(plan),
            onChanged     : () => {
                if (typeof Na__FpMode__OnChanged === 'function') Na__FpMode__OnChanged();
            },
            onAnnotateDone : () => Na__FloorPlanMode__SetEditMode(false)
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Take the Markup Stack Down
    // ------------------------------------------------------------
    function Na__FpMode__UnmountAnnotations() {
        Na__DrawMarkup__Unmount();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remember How the Author Left a Plan Framed
    // ------------------------------------------------------------
    function Na__FpMode__StoreFraming(plan) {
        if (!plan || !Na__FpCam__GetCamera()) return;
        const pan = Na__FpCam__GetPanTargetMm();
        Na__FpData__SetSavedView(plan, Na__FpCam__GetZoom(), pan.targetXMm, pan.targetZMm);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Everything That Happens the Moment the Ortho Camera Takes Over
    // ------------------------------------------------------------
    // Shared by the flight arrival and the instant flip. Order matters: the
    // camera is framed, the broker registered, the presets applied, then 3D
    // stood down, then navigation and markup mounted.
    // ------------------------------------------------------------
    function Na__FpMode__TakeViewport(plan) {
        Na__FpMode__ApplyPlanCamera(plan);
        Na__FpMode__RegisterDrawingView(plan);                                   // <-- Before the layers mount and project
        Na__FpMode__EnterPresets(plan);                                          // <-- Composer draws the ortho camera from here
        Na__DrawView__Transitions__SuspendThreeD();                              // <-- Orbit must let go of the canvas first
        Na__FpMode__State = Na__FpMode__STATE_PLAN;                              // <-- Render loop now takes the ortho camera
        Na__DrawNav__Attach(
            Na__FpMode__Canvas,
            Na__FpCfg__GetNavigationSetup(),
            () => Na__FpMode__StoreFraming(Na__FpMode__ActivePlan)               // <-- Every pan and zoom is remembered as it happens
        );
        Na__FpMode__MountAnnotations(plan);
        Na__RenderLoop__RequestRender();
        Na__FpMode__DispatchChanged();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Mode Transitions
// -----------------------------------------------------------------------------

    // FUNCTION | Enter Plan Mode, or Flip to a Different Plan
    // ------------------------------------------------------------
    // Flipping between two plans skips the flight entirely: the cut, camera,
    // presets and annotations are swapped in one frame, which is what makes
    // the plans behave like drawing pages rather than camera moves.
    // ------------------------------------------------------------
    function Na__FloorPlanMode__EnterPlan(plan) {
        if (!Na__FpMode__Initialized || !plan) return false;
        if (!Na__FpCfg__IsEnabled()) return false;

        Na__DrawView__SectionAdapter__SuspendLiveTool();                         // <-- Hold the tool before any plane comes or goes
        Na__DrawView__ReleaseOtherKind(Na__DrawView__KIND_PLAN);                 // <-- An elevation cannot stay mounted underneath a plan

        const alreadyInPlan = (Na__FpMode__State === Na__FpMode__STATE_PLAN);

        // Leaving one plan for another: keep how the author framed this one.
        if (alreadyInPlan && Na__FpMode__ActivePlan && Na__FpMode__ActivePlan !== plan) {
            Na__FpMode__StoreFraming(Na__FpMode__ActivePlan);
            Na__DrawView__SectionAdapter__RemovePlane(Na__FpMode__CutIdFor(Na__FpMode__ActivePlan));
        }

        Na__FpMode__UnmountAnnotations();                                        // <-- Text goes before anything moves
        Na__FpMode__ApplyCut(plan);
        Na__FpMode__ActivePlan = plan;

        // FLIP | Already in plan mode: no flight, straight to the new page
        if (alreadyInPlan) {
            Na__FpMode__ExitPresets();                                           // <-- The new page applies its own styles
            Na__DrawNav__Detach();
            Na__FpMode__TakeViewport(plan);
            return true;
        }

        // FLIGHT | Coming from 3D: ease up, then swap the projection
        Na__FpMode__State = Na__FpMode__STATE_ENTERING;
        Na__FpMode__DispatchChanged();

        const trans      = Na__FpCfg__GetTransitionSetup();
        const durationMs = trans.intoPlanMs;
        const pose       = Na__FpFrame__BuildTopDownScene(
            plan,
            Na__FpFrame__MeasureModel(Na__FpMode__ModelRoot, Na__FpMode__PerspCamera),
            Na__FpMode__PerspCamera.fov, durationMs, trans.easing
        );

        Na__DrawView__Transitions__FlyTo(pose, durationMs, () => {
            if (Na__FpMode__State !== Na__FpMode__STATE_ENTERING || Na__FpMode__ActivePlan !== plan) return; // <-- Cancelled mid-flight
            Na__FpMode__TakeViewport(plan);
        });
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Leave Plan Mode and Return to a 3D Scene
    // ------------------------------------------------------------
    // targetScene is an ordinary presentation scene to fly down to. Passing
    // null leaves the perspective camera at the top-down pose, which is what
    // a plain "exit preview" wants.
    // ------------------------------------------------------------
    function Na__FloorPlanMode__ExitPlan(targetScene) {
        if (!Na__FpMode__Initialized) return false;
        if (Na__FpMode__State === Na__FpMode__STATE_IDLE) return false;

        const plan = Na__FpMode__ActivePlan;

        // TEXT FIRST | Removed outright before the camera starts moving, so no
        // label ever slides across the screen with the view.
        Na__FpMode__StoreFraming(plan);
        Na__FpMode__UnmountAnnotations();
        Na__DrawView__ClearActiveView();                                         // <-- 3D owns the viewport again
        Na__DrawNav__Detach();
        Na__FpMode__ExitPresets();                                               // <-- Perspective camera back on the composer
        Na__DrawView__Transitions__ResumeThreeD();                               // <-- Orbit and culling come back before the flight down

        // PROJECTION | Back to perspective at the pose the plan was seen from
        Na__FpMode__State = Na__FpMode__STATE_LEAVING;
        if (plan) {
            const pose = Na__FpFrame__BuildTopDownScene(
                plan,
                Na__FpFrame__MeasureModel(Na__FpMode__ModelRoot, Na__FpMode__PerspCamera),
                Na__FpMode__PerspCamera.fov, 0, Na__FpCfg__GetTransitionSetup().easing
            );
            const camPos = pose.PresentationMode__Scene__CameraPosition.Camera__DefaultPos;
            Na__FpMode__PerspCamera.position.set(
                Na__Math__ConvertMmToUnits(camPos.Camera__DefaultPos__PosX),
                Na__Math__ConvertMmToUnits(camPos.Camera__DefaultPos__PosY),
                Na__Math__ConvertMmToUnits(camPos.Camera__DefaultPos__PosZ)
            );
            Na__FpMode__PerspCamera.rotation.set(-Math.PI / 2, 0, 0);
            Na__FpMode__PerspCamera.updateProjectionMatrix();
        }

        // CUT | Cleared so the model is whole again in 3D; the adapter hands
        // the live tool's own sections back.
        if (plan) Na__DrawView__SectionAdapter__RemovePlane(Na__FpMode__CutIdFor(plan));
        Na__DrawView__SectionAdapter__Release();

        const finish = () => {
            Na__FpMode__State      = Na__FpMode__STATE_IDLE;
            Na__FpMode__ActivePlan = null;
            Na__RenderLoop__RequestRender();
            Na__FpMode__DispatchChanged();
        };

        if (!targetScene) {
            finish();
            return true;
        }

        Na__DrawView__Transitions__FlyTo(targetScene, Na__FpCfg__GetTransitionSetup().outOfPlanMs, finish);
        Na__FpMode__DispatchChanged();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Turn Annotation Authoring On or Off
    // ------------------------------------------------------------
    // Remounts the layer, because whether a node is interactive is decided
    // when the node is built.
    // ------------------------------------------------------------
    function Na__FloorPlanMode__SetEditMode(enabled) {
        Na__FpMode__EditMode = (enabled === true);

        if (Na__FpMode__State === Na__FpMode__STATE_PLAN && Na__FpMode__ActivePlan) {
            Na__FpMode__MountAnnotations(Na__FpMode__ActivePlan);                // <-- Mount unmounts the previous stack first
            Na__RenderLoop__RequestRender();
        }
        Na__FpMode__DispatchChanged();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Apply a Plan's Style Toggles While It Is on Screen
    // ------------------------------------------------------------
    // Called by the Dev menu when a toggle changes on the active plan, so the
    // drawing updates without leaving and re-entering.
    // ------------------------------------------------------------
    function Na__FloorPlanMode__ApplyStyles(plan) {
        if (Na__FpMode__State !== Na__FpMode__STATE_PLAN || !plan || plan !== Na__FpMode__ActivePlan) return false;
        const styles = Na__FpData__GetStyles(plan);
        Na__DrawView__ComposerPreset__ApplyStyles(styles);
        Na__DrawView__MaterialPreset__ApplyStyles(styles);
        Na__DrawView__SectionAdapter__ReapplyClipping();                          // <-- Fresh substitutes need the cut planes again
        Na__RenderLoop__RequestRender();
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Carousel Scene Routing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Route One Carousel Scene Selection
    // ------------------------------------------------------------
    // Returns true when this system has taken over the navigation:
    //   - A floor plan scene always enters (or flips to) plan mode.
    //   - An ordinary 3D scene selected WHILE in plan mode leaves plan mode
    //     and flies down to it, so the text and the cut are cleared properly
    //     instead of being stranded over a moving perspective view.
    //   - An ordinary scene selected from 3D is not ours; the carousel handles
    //     it exactly as it always has.
    // ------------------------------------------------------------
    function Na__FpMode__RouteSceneSelection(scene) {
        if (!Na__FpMode__Initialized || !scene) return false;

        if (Na__FpData__IsFloorPlanScene(scene)) {
            const plan = Na__FpData__GetPlanForScene(null, scene);              // <-- Live drawings block
            if (!plan) return false;                                             // <-- Dangling link: fall back to the normal path
            return Na__FloorPlanMode__EnterPlan(plan);
        }

        // AN ELEVATION SCENE IS NOT OURS TO FLY TO. Claiming it here would
        // animate the perspective camera to the elevation's pose and then
        // stop, because the elevation router would never be offered the
        // scene at all. Declining lets that router take it; the handover
        // itself is done through the view broker when it enters.
        if (Na__DrawData__IsElevationScene(scene)) return false;

        if (Na__FpMode__State !== Na__FpMode__STATE_IDLE) {
            return Na__FloorPlanMode__ExitPlan(scene);                           // <-- Leave plan mode and fly to the 3D scene
        }
        return false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Render Loop Integration
// -----------------------------------------------------------------------------

    // FUNCTION | Handle a Viewport Resize
    // ------------------------------------------------------------
    // The camera's frustum aspect is corrected whether or not the plan is on
    // screen, so switching to it after a resize does not open at the wrong
    // shape. The markup only moves when the plan is the drawing being shown.
    // ------------------------------------------------------------
    function Na__FloorPlanMode__HandleResize(width, height) {
        Na__FpCam__HandleResize(width, height);
        if (Na__FpMode__State !== Na__FpMode__STATE_PLAN) return;
        Na__DrawMarkup__SyncLayerBox();                                          // <-- Canvas box moved; the layers must follow it
    }
    // ------------------------------------------------------------


    // FUNCTION | Point the Controller at a Different Model Root
    // ------------------------------------------------------------
    function Na__FloorPlanMode__SetModelRoot(modelRoot) {
        Na__FpMode__ModelRoot = modelRoot || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - State Queries and Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Record How the Plan on Screen Is Currently Framed
    // ------------------------------------------------------------
    // Navigation already records this as it settles, so this is the belt to
    // that braces: the Dev menu calls it immediately before saving and before
    // capturing a thumbnail, so what is written is provably what is on screen.
    // ------------------------------------------------------------
    function Na__FloorPlanMode__StoreActiveFraming() {
        if (Na__FpMode__State !== Na__FpMode__STATE_PLAN || !Na__FpMode__ActivePlan) return false;
        Na__FpMode__StoreFraming(Na__FpMode__ActivePlan);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Plan Mode Currently Displaying a Plan?
    // ------------------------------------------------------------
    function Na__FloorPlanMode__IsActive() {
        return Na__FpMode__State === Na__FpMode__STATE_PLAN;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Plan Mode Active or Mid-Transition?
    // ------------------------------------------------------------
    function Na__FloorPlanMode__IsEngaged() {
        return Na__FpMode__State !== Na__FpMode__STATE_IDLE;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Floor Plan Currently Displayed (null When None)
    // ------------------------------------------------------------
    function Na__FloorPlanMode__GetActivePlan() {
        return Na__FpMode__ActivePlan;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Annotation Authoring On?
    // ------------------------------------------------------------
    function Na__FloorPlanMode__IsEditMode() {
        return Na__FpMode__EditMode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize the Floor Plan Mode Controller
    // ------------------------------------------------------------
    // context: { camera, canvas, modelRoot, onChanged }
    // Resolves false when the feature is switched off in config, so callers
    // can skip mounting the Dev menu section entirely. The perspective camera
    // and controls used for flights come from Na__DrawView__Transitions__.
    // ------------------------------------------------------------
    async function Na__FloorPlanMode__Initialize(context) {
        if (!context || !context.camera || !context.canvas) {
            console.warn('[ValeVision3D] Floor plan mode init skipped - missing camera or canvas.');
            return false;
        }

        Na__FpMode__PerspCamera = context.camera;
        Na__FpMode__Canvas      = context.canvas;
        Na__FpMode__ModelRoot   = context.modelRoot || null;
        Na__FpMode__OnChanged   = (typeof context.onChanged === 'function') ? context.onChanged : null;

        const [planEnabled] = await Promise.all([
            Na__FpCfg__Load(),
            Na__PlanAnno__Load(),
            Na__PlanDim__Load()                                                  // <-- Also configures the dimension snap grid
        ]);

        Na__FpMode__Initialized = true;

        // From here a floor plan scene card switches into 2D rather than
        // flying the perspective camera to a pose it cannot read correctly.
        Na__DrawView__Transitions__RegisterRouter(Na__FpMode__RouteSceneSelection);

        return planEnabled === true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Floor Plan Mode Controller API
    // ------------------------------------------------------------
    export {
        Na__FpMode__CHANGED_EVENT,
        Na__FloorPlanMode__Initialize,
        Na__FloorPlanMode__EnterPlan,
        Na__FloorPlanMode__ExitPlan,
        Na__FloorPlanMode__SetEditMode,
        Na__FloorPlanMode__IsEditMode,
        Na__FloorPlanMode__ApplyStyles,
        Na__FloorPlanMode__StoreActiveFraming,
        Na__FloorPlanMode__HandleResize,
        Na__FloorPlanMode__SetModelRoot,
        Na__FloorPlanMode__IsActive,
        Na__FloorPlanMode__IsEngaged,
        Na__FloorPlanMode__GetActivePlan
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
