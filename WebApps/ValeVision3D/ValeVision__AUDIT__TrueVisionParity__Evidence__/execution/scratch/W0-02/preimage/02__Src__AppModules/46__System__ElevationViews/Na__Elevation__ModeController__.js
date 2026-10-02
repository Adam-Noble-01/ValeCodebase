// =============================================================================
// VALEVISION3D - ELEVATION VIEWS - MODE CONTROLLER
// =============================================================================
//
// FILE       : Na__Elevation__ModeController__.js
// NAMESPACE  : Na__ElevationMode
// MODULE     : Elevation Views - Mode Controller
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Orchestrate entering, switching and leaving 2D elevation mode
// CREATED    : 07-Sep-2026
//
// DESCRIPTION:
// - The elevation counterpart of Na__FloorPlan__ModeController__, and
//   deliberately its mirror image: the same flight in, the same instant flip
//   between pages, the same markup stack, the same presets. A drawing set
//   that mixes plans and elevations has to feel like ONE set of drawings, and
//   that only happens if the two are built the same way.
//
// - ENTERING from 3D applies the cut FIRST when the drawing is a section, so
//   the cap geometry is built while the viewer is still stationary rather than
//   hitching at the end of the flight. The perspective camera then eases round
//   to a head-on pose, and only at the end does the projection swap to
//   orthographic - the composer preset taking the RenderPass camera, the
//   material preset applying the record's style toggles.
// - SWITCHING between two elevations is an instant flip, by design, exactly as
//   between two plans. They are drawing pages.
// - LEAVING reverses it: markup goes first so nothing slides across the screen
//   with the view, the presets come off, the projection swaps back and the
//   perspective camera eases to the target 3D scene.
//
// - ELEVATION AND SECTION ARE THE SAME DRAWING WITH THE CUT ON OR OFF. Nothing
//   else differs - not the camera, not the framing, not the markup - so
//   switching between them is one call to the section adapter rather than a
//   second code path. A plain elevation parks the live Cross Sections tool
//   without registering a plane, so the building is drawn whole.
//
// - The render loop asks the DRAWING VIEW BROKER for a camera each frame. A
//   non-null answer means a 2D drawing owns the view and the composer preset
//   renders the frame; this controller registers the adapter that answers it
//   while an elevation is on screen.
//
// INTEGRATION:
// - Initialized once from index.html with the camera, canvas and model root.
// - Na__Elevation__DevMenu__Editor__ drives Preview / Annotate / styles.
// - The scene carousel routes an elevation scene here instead of animating the
//   perspective camera to it.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ModeController__.js
// - Source version: 1.0.0 (07-Sep-2026)
// - Ported on     : 09-Sep-2026 for ValeVision3D v2.19.0 (port Phase 3)
// - Parity        : adapted
// - Divergences   :
//   - Cut through Na__DrawView__SectionAdapter__ (D07); a plain elevation parks the live tool.
//   - Composer and material presets enter when the ortho camera takes over and exit before the flight (D12, D33).
//   - Suspending 3D, the flight and the router registration delegated to Na__DrawView__Transitions__.
//   - Floor plan scenes recognised through Na__DrawView__ProjectData__; the client grant read from the drawings block.
//   - Records read from the drawings block; live style application added.
// - Back-port     : none pending.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 09-Sep-2026 - Version 1.1.1
// - ApplyStyles announces the mode change so the projected linework overlay
//   follows the toggles (port Phase 4).
//
// 09-Sep-2026 - Version 1.1.0
// - Ported to ValeVision3D: section adapter, composer and material presets,
//   shared transitions, live style application.
//
// 07-Sep-2026 - Version 1.0.0
// - Initial implementation for the Elevation Drawings build.
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
        Na__DrawView__KIND_ELEVATION,
        Na__DrawView__SetActiveView,
        Na__DrawView__ClearActiveView,
        Na__DrawView__ReleaseOtherKind
    } from '../42__System__DrawingViewCore/Na__DrawView__ActiveView__.js';
    import {
        Na__DrawView__SectionAdapter__UpsertVerticalPlane,
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
    import {
        Na__DrawData__IsFloorPlanScene,
        Na__DrawData__GetClientDimensionsEnabled
    } from '../42__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Elevation Camera, Data, Config, Framing and Gizmo
    // ------------------------------------------------------------
    // @delegate: ./Na__Elevation__OrthoCamera__.js
    // @delegate: ./Na__Elevation__ProjectJson__Data__.js
    // @delegate: ./Na__Elevation__Framing__.js
    // ------------------------------------------------------------
    import {
        Na__ElevCam__EnsureCamera,
        Na__ElevCam__GetCamera,
        Na__ElevCam__SetAxes,
        Na__ElevCam__PositionForPlane,
        Na__ElevCam__FrameToBounds,
        Na__ElevCam__MeasureCentreMm,
        Na__ElevCam__HandleResize,
        Na__ElevCam__PanByPlaneUnits,
        Na__ElevCam__SetPanTargetMm,
        Na__ElevCam__GetPanTargetMm,
        Na__ElevCam__ZoomByFactor,
        Na__ElevCam__SetZoom,
        Na__ElevCam__GetZoom,
        Na__ElevCam__GetUnitsPerPixel
    } from './Na__Elevation__OrthoCamera__.js';
    import {
        Na__ElevData__GetAxes,
        Na__ElevData__GetPlaneDistanceMm,
        Na__ElevData__GetViewDepthMm,
        Na__ElevData__IsSection,
        Na__ElevData__GetSavedView,
        Na__ElevData__SetSavedView,
        Na__ElevData__GetAnnotations,
        Na__ElevData__GetDimensions,
        Na__ElevData__GetStyles,
        Na__ElevData__GetElevationForScene,
        Na__ElevData__IsElevationScene
    } from './Na__Elevation__ProjectJson__Data__.js';
    import {
        Na__ElevCfg__Load,
        Na__ElevCfg__IsEnabled,
        Na__ElevCfg__GetTransitionSetup,
        Na__ElevCfg__GetNavigationSetup
    } from './Na__Elevation__ConfigState__.js';
    import {
        Na__ElevFrame__MeasureModel,
        Na__ElevFrame__GetBounds,
        Na__ElevFrame__BuildApproachScene
    } from './Na__Elevation__Framing__.js';
    import { Na__ElevGizmo__Hide } from './Na__Elevation__PlaneGizmo__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Markup Config Loading
    // ------------------------------------------------------------
    // Only the one-time config fetches: everything per-frame goes through the
    // markup mount, which owns the layers.
    // @delegate: ../44__System__PlanAnnotations/
    // @delegate: ../45__System__PlanDimensions/
    // ------------------------------------------------------------
    import { Na__PlanAnno__Load } from '../44__System__PlanAnnotations/Na__PlanAnnotations__Data__.js';
    import { Na__PlanDim__Load } from '../45__System__PlanDimensions/Na__PlanDimensions__ConfigState__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Mode States
    // ------------------------------------------------------------
    const Na__ElevMode__STATE_IDLE      = 'idle';        // <-- Ordinary 3D
    const Na__ElevMode__STATE_ENTERING  = 'entering';    // <-- Perspective camera swinging round
    const Na__ElevMode__STATE_DRAWING   = 'drawing';     // <-- Orthographic elevation owns the view
    const Na__ElevMode__STATE_LEAVING   = 'leaving';     // <-- Perspective camera flying back
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Section Cut Plane Id Prefix
    // ------------------------------------------------------------
    const Na__ElevMode__CUT_ID_PREFIX = 'ElevationCut__';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Broadcast Event Name
    // ------------------------------------------------------------
    const Na__ElevMode__CHANGED_EVENT = 'na-elevation-mode-changed';
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Drawing Extent Padding
    // ------------------------------------------------------------
    // How far past the model a dimension may still be placed, in millimetres.
    // Generous, because setting-out dimensions are routinely drawn well clear
    // of the building - but finite, so a stray click in empty sky is rejected
    // rather than stored as a 400 m figure.
    // ------------------------------------------------------------
    const Na__ElevMode__EXTENT_PAD_MM = 20000;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | App Context (set once at init)
    // ------------------------------------------------------------
    let Na__ElevMode__PerspCamera = null;
    let Na__ElevMode__Canvas      = null;
    let Na__ElevMode__ModelRoot   = null;
    let Na__ElevMode__Initialized = false;
    // ------------------------------------------------------------

    // MODULE VARIABLES | Active Elevation and Mode State
    // ------------------------------------------------------------
    let Na__ElevMode__State     = Na__ElevMode__STATE_IDLE;
    let Na__ElevMode__Active    = null;   // <-- Live elevation record being displayed
    let Na__ElevMode__EditMode  = false;  // <-- Markup authoring enabled (developer only)
    let Na__ElevMode__OnChanged = null;   // <-- Host callback for unsaved-change tracking
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Broadcast the Current Mode to Interested UI
    // ------------------------------------------------------------
    function Na__ElevMode__Dispatch() {
        window.dispatchEvent(new CustomEvent(Na__ElevMode__CHANGED_EVENT, {
            detail : {
                state       : Na__ElevMode__State,
                elevationId : Na__ElevMode__Active ? Na__ElevMode__Active.Elevation__Id : null,
                isDrawing   : Na__ElevMode__State === Na__ElevMode__STATE_DRAWING
            }
        }));
        if (typeof Na__ElevMode__OnChanged === 'function') Na__ElevMode__OnChanged();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Viewport Size of the Render Canvas
    // ------------------------------------------------------------
    function Na__ElevMode__GetViewportSize() {
        if (!Na__ElevMode__Canvas) return { width: window.innerWidth, height: window.innerHeight };
        return {
            width  : Na__ElevMode__Canvas.clientWidth  || window.innerWidth,
            height : Na__ElevMode__Canvas.clientHeight || window.innerHeight
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Section Cut Plane Id for an Elevation
    // ------------------------------------------------------------
    function Na__ElevMode__CutIdFor(elevation) {
        return Na__ElevMode__CUT_ID_PREFIX + elevation.Elevation__Id;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Measure the Model as This Elevation Sees It
    // ------------------------------------------------------------
    function Na__ElevMode__Measure(elevation) {
        return Na__ElevFrame__MeasureModel(Na__ElevMode__ModelRoot, Na__ElevMode__PerspCamera, elevation);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cut, Camera and Preset Application
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Apply or Clear an Elevation's Section Cut
    // ------------------------------------------------------------
    // A plain elevation shows the building whole, so there is no plane at all.
    // The live Cross Sections tool is still parked, otherwise a section the
    // author had bound to a 3D scene would sit in the middle of the drawing.
    // ------------------------------------------------------------
    function Na__ElevMode__ApplyCut(elevation) {
        const cutId = Na__ElevMode__CutIdFor(elevation);

        if (!Na__ElevData__IsSection(elevation)) {
            Na__DrawView__SectionAdapter__RemovePlane(cutId);
            Na__DrawView__SectionAdapter__SuspendLiveTool();                     // <-- Whole building, no live sections either
            return null;
        }

        const axes = Na__ElevData__GetAxes(elevation);
        Na__DrawView__SectionAdapter__UpsertVerticalPlane(
            cutId,
            axes.normalX, axes.normalZ,
            Na__ElevData__GetPlaneDistanceMm(elevation),
            Na__ElevData__GetViewDepthMm(elevation)
        );
        Na__DrawView__SectionAdapter__SetActivePlane(cutId);
        return cutId;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Place and Frame the Orthographic Camera
    // ------------------------------------------------------------
    function Na__ElevMode__ApplyCamera(elevation) {
        const size   = Na__ElevMode__GetViewportSize();
        const bounds = Na__ElevFrame__GetBounds(Na__ElevMode__ModelRoot);
        const saved  = Na__ElevData__GetSavedView(elevation);

        Na__ElevCam__EnsureCamera(size.width, size.height);
        Na__ElevCam__SetAxes(Na__ElevData__GetAxes(elevation));                  // <-- Basis first: framing and position both read it
        if (bounds) Na__ElevCam__FrameToBounds(bounds, size.width, size.height);

        // Centre on the model unless the author already framed this elevation.
        const centre = bounds ? Na__ElevCam__MeasureCentreMm(bounds) : null;
        Na__ElevCam__PositionForPlane(
            Na__ElevData__GetPlaneDistanceMm(elevation),
            centre ? centre.runMm    : 0,
            centre ? centre.heightMm : 0
        );

        if (saved.zoom !== null) Na__ElevCam__SetZoom(saved.zoom);
        if (saved.runMm !== null && saved.heightMm !== null) {
            Na__ElevCam__SetPanTargetMm(saved.runMm, saved.heightMm);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put the Composer and Materials Into Drawing Mode
    // ------------------------------------------------------------
    function Na__ElevMode__EnterPresets(elevation) {
        const styles = Na__ElevData__GetStyles(elevation);
        Na__DrawView__ComposerPreset__Enter({ camera : Na__ElevCam__GetCamera(), styles : styles });
        Na__DrawView__MaterialPreset__Enter(styles);
        Na__DrawView__SectionAdapter__ReapplyClipping();                          // <-- Substitutes need the cut planes too
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Take the Presets Off Again
    // ------------------------------------------------------------
    function Na__ElevMode__ExitPresets() {
        Na__DrawView__MaterialPreset__Exit();
        Na__DrawView__ComposerPreset__Exit();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hand the Viewport to This Elevation
    // ------------------------------------------------------------
    // The adapter is what the shared markup layers and the shared navigation
    // steer through, and it is the ONLY place the elevation's axis mapping is
    // written down:
    //
    //     drawing axis 1 -> horizontal run along the elevation   screen right
    //     drawing axis 2 -> world height                         screen UP
    //     the third      -> the plane's distance along the view  fixed
    //
    // Axis 2 runs UP the sheet here where a plan's runs down, which is why the
    // screen offset is subtracted rather than added: a height stored as a
    // height is worth the one sign flip.
    //
    // The basis is captured per elevation rather than read live, so spinning
    // an elevation to a new azimuth installs a new adapter instead of quietly
    // rotating an old one underneath markup that was placed against the old
    // direction.
    // ------------------------------------------------------------
    function Na__ElevMode__RegisterDrawingView(elevation) {
        const axes   = Na__ElevData__GetAxes(elevation);
        const planeU = Na__Math__ConvertMmToUnits(Na__ElevData__GetPlaneDistanceMm(elevation));

        Na__DrawView__SetActiveView({
            kind             : Na__DrawView__KIND_ELEVATION,
            getCamera        : Na__ElevCam__GetCamera,
            getUnitsPerPixel : Na__ElevCam__GetUnitsPerPixel,

            // Called when a floor plan takes the viewport. Leaving without a
            // flight, because the incoming drawing is about to fly the camera
            // itself and two transitions would fight over it.
            onRelease : () => Na__ElevationMode__ExitElevation(null),

            planeMmToWorldUnits : (runMm, heightMm) => {
                const runU = Na__Math__ConvertMmToUnits(runMm);
                return {
                    x : (axes.rightX * runU) + (axes.normalX * planeU),
                    y : Na__Math__ConvertMmToUnits(heightMm),
                    z : (axes.rightZ * runU) + (axes.normalZ * planeU)
                };
            },

            // Under a parallel projection one pixel is a fixed number of scene
            // units everywhere, so a canvas offset from the centre converts to
            // a position on the drawing without a ray solve.
            screenOffsetToPlaneMm : (offsetXPx, offsetYPx, unitsPerPixel) => {
                const camera = Na__ElevCam__GetCamera();
                if (!camera) return null;

                const camRun = (camera.position.x * axes.rightX) + (camera.position.z * axes.rightZ);
                return {
                    posXMm : Na__Math__ConvertUnitsToMm(camRun + (offsetXPx * unitsPerPixel)),
                    posZMm : Na__Math__ConvertUnitsToMm(camera.position.y - (offsetYPx * unitsPerPixel))
                };
            },

            panByPlaneUnits : (du, dv) => Na__ElevCam__PanByPlaneUnits(du, dv),
            zoomByFactor    : Na__ElevCam__ZoomByFactor
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Work Out How Far a Pick May Sensibly Land
    // ------------------------------------------------------------
    // In the DRAWING's axes, not the world's - which is the whole reason the
    // dimension grid needs to be told rather than left to derive it from the
    // model footprint. Null when nothing is loaded, which the grid treats as
    // "no opinion" and accepts every pick.
    // ------------------------------------------------------------
    function Na__ElevMode__BuildExtentMm(elevation) {
        const measured = Na__ElevMode__Measure(elevation);
        if (!measured) return null;

        const halfSpan = measured.spanMm / 2;
        const halfTall = measured.heightMm / 2;
        const centreY  = measured.centreYMm;
        const pad      = Na__ElevMode__EXTENT_PAD_MM;

        return {
            minXMm : Math.round(measured.centreRunMm - halfSpan - pad),
            maxXMm : Math.round(measured.centreRunMm + halfSpan + pad),
            minZMm : Math.round(centreY - halfTall - pad),
            maxZMm : Math.round(centreY + halfTall + pad)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Raise the Markup Stack Over This Elevation
    // ------------------------------------------------------------
    // ONE array reference is shared by the layer, the history stack and the
    // elevation record that gets saved, so all three can never end up bound to
    // different copies. The client measuring grant is the SAME per-project
    // switch the floor plans read.
    // ------------------------------------------------------------
    function Na__ElevMode__MountMarkup(elevation) {
        Na__DrawMarkup__Mount({
            canvas        : Na__ElevMode__Canvas,
            modelRoot     : Na__ElevMode__ModelRoot,
            annotations   : Na__ElevData__GetAnnotations(elevation),
            dimensions    : Na__ElevData__GetDimensions(elevation),
            editMode      : Na__ElevMode__EditMode,
            clientAllowed : Na__DrawData__GetClientDimensionsEnabled(),
            planeHeightMm : 0,                                                   // <-- A vertical plane has no height; the extent is what matters
            planeExtentMm : Na__ElevMode__BuildExtentMm(elevation),
            onChanged     : () => {
                if (typeof Na__ElevMode__OnChanged === 'function') Na__ElevMode__OnChanged();
            },
            onAnnotateDone : () => Na__ElevationMode__SetEditMode(false)
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Remember How the Author Left an Elevation Framed
    // ------------------------------------------------------------
    function Na__ElevMode__StoreFraming(elevation) {
        if (!elevation || !Na__ElevCam__GetCamera()) return;
        const pan = Na__ElevCam__GetPanTargetMm();
        Na__ElevData__SetSavedView(elevation, Na__ElevCam__GetZoom(), pan.runMm, pan.heightMm);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Everything That Happens the Moment the Ortho Camera Takes Over
    // ------------------------------------------------------------
    // Shared by the flight arrival and the instant flip. Order matters: the
    // camera is framed, the broker registered, the presets applied, then 3D
    // stood down, then navigation and markup mounted.
    // ------------------------------------------------------------
    function Na__ElevMode__TakeViewport(elevation) {
        Na__ElevMode__ApplyCamera(elevation);
        Na__ElevMode__RegisterDrawingView(elevation);                            // <-- Before the layers mount and project
        Na__ElevMode__EnterPresets(elevation);                                   // <-- Composer draws the ortho camera from here
        Na__DrawView__Transitions__SuspendThreeD();                              // <-- Orbit must let go of the canvas first
        Na__ElevMode__State = Na__ElevMode__STATE_DRAWING;                       // <-- Render loop now takes the ortho camera
        Na__DrawNav__Attach(
            Na__ElevMode__Canvas,
            Na__ElevCfg__GetNavigationSetup(),
            () => Na__ElevMode__StoreFraming(Na__ElevMode__Active)               // <-- Every pan and zoom is remembered as it happens
        );
        Na__ElevMode__MountMarkup(elevation);
        Na__RenderLoop__RequestRender();
        Na__ElevMode__Dispatch();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - Mode Transitions
// -----------------------------------------------------------------------------

    // FUNCTION | Enter Elevation Mode, or Flip to a Different Elevation
    // ------------------------------------------------------------
    // Flipping between two elevations skips the flight entirely: the cut,
    // camera, presets and markup are swapped in one frame, which is what makes
    // them behave like drawing pages rather than camera moves.
    // ------------------------------------------------------------
    function Na__ElevationMode__EnterElevation(elevation) {
        if (!Na__ElevMode__Initialized || !elevation) return false;
        if (!Na__ElevCfg__IsEnabled()) return false;

        Na__DrawView__SectionAdapter__SuspendLiveTool();                         // <-- Hold the tool before any plane comes or goes
        Na__DrawView__ReleaseOtherKind(Na__DrawView__KIND_ELEVATION);            // <-- A plan cannot stay mounted underneath an elevation
        Na__ElevGizmo__Hide();                                                   // <-- The setup marker must never appear on the drawing

        const alreadyDrawing = (Na__ElevMode__State === Na__ElevMode__STATE_DRAWING);

        // Leaving one elevation for another: keep how the author framed this one.
        if (alreadyDrawing && Na__ElevMode__Active && Na__ElevMode__Active !== elevation) {
            Na__ElevMode__StoreFraming(Na__ElevMode__Active);
            Na__DrawView__SectionAdapter__RemovePlane(Na__ElevMode__CutIdFor(Na__ElevMode__Active));
        }

        Na__DrawMarkup__Unmount();                                               // <-- Text goes before anything moves
        Na__ElevMode__ApplyCut(elevation);
        Na__ElevMode__Active = elevation;

        // FLIP | Already drawing: no flight, straight to the new page
        if (alreadyDrawing) {
            Na__ElevMode__ExitPresets();                                         // <-- The new page applies its own styles
            Na__DrawNav__Detach();
            Na__ElevMode__TakeViewport(elevation);
            return true;
        }

        // FLIGHT | Coming from 3D: swing round head on, then swap projection
        Na__ElevMode__State = Na__ElevMode__STATE_ENTERING;
        Na__ElevMode__Dispatch();

        const trans      = Na__ElevCfg__GetTransitionSetup();
        const durationMs = trans.intoMs;
        const pose       = Na__ElevFrame__BuildApproachScene(
            elevation,
            Na__ElevMode__Measure(elevation),
            Na__ElevMode__PerspCamera.fov, durationMs, trans.easing
        );

        Na__DrawView__Transitions__FlyTo(pose, durationMs, () => {
            if (Na__ElevMode__State !== Na__ElevMode__STATE_ENTERING || Na__ElevMode__Active !== elevation) return; // <-- Cancelled mid-flight
            Na__ElevMode__TakeViewport(elevation);
        });
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Leave Elevation Mode and Return to a 3D Scene
    // ------------------------------------------------------------
    // targetScene is an ordinary presentation scene to fly to. Passing null
    // leaves the perspective camera at the head-on pose, which is what a plain
    // "exit preview" wants.
    // ------------------------------------------------------------
    function Na__ElevationMode__ExitElevation(targetScene) {
        if (!Na__ElevMode__Initialized) return false;
        if (Na__ElevMode__State === Na__ElevMode__STATE_IDLE) return false;

        const elevation = Na__ElevMode__Active;

        // TEXT FIRST | Removed outright before the camera starts moving, so no
        // label ever slides across the screen with the view.
        Na__ElevMode__StoreFraming(elevation);
        Na__DrawMarkup__Unmount();
        Na__DrawView__ClearActiveView();                                         // <-- 3D owns the viewport again
        Na__DrawNav__Detach();
        Na__ElevMode__ExitPresets();                                             // <-- Perspective camera back on the composer
        Na__DrawView__Transitions__ResumeThreeD();                               // <-- Orbit and culling come back before the flight

        // PROJECTION | Back to perspective at the pose the drawing was seen from
        Na__ElevMode__State = Na__ElevMode__STATE_LEAVING;
        if (elevation) {
            const pose = Na__ElevFrame__BuildApproachScene(
                elevation,
                Na__ElevMode__Measure(elevation),
                Na__ElevMode__PerspCamera.fov, 0, Na__ElevCfg__GetTransitionSetup().easing
            );
            const camPos = pose.PresentationMode__Scene__CameraPosition.Camera__DefaultPos;
            const camRot = pose.PresentationMode__Scene__CameraPosition.Camera__DefaultRotation;
            Na__ElevMode__PerspCamera.position.set(
                Na__Math__ConvertMmToUnits(camPos.Camera__DefaultPos__PosX),
                Na__Math__ConvertMmToUnits(camPos.Camera__DefaultPos__PosY),
                Na__Math__ConvertMmToUnits(camPos.Camera__DefaultPos__PosZ)
            );
            Na__ElevMode__PerspCamera.rotation.set(
                camRot.Camera__DefaultRotation__RotX,
                camRot.Camera__DefaultRotation__RotY,
                camRot.Camera__DefaultRotation__RotZ
            );
            Na__ElevMode__PerspCamera.updateProjectionMatrix();
        }

        // CUT | Cleared so the model is whole again in 3D; the adapter hands
        // the live tool's own sections back.
        if (elevation) Na__DrawView__SectionAdapter__RemovePlane(Na__ElevMode__CutIdFor(elevation));
        Na__DrawView__SectionAdapter__Release();

        const finish = () => {
            Na__ElevMode__State  = Na__ElevMode__STATE_IDLE;
            Na__ElevMode__Active = null;
            Na__RenderLoop__RequestRender();
            Na__ElevMode__Dispatch();
        };

        if (!targetScene) {
            finish();
            return true;
        }

        Na__DrawView__Transitions__FlyTo(targetScene, Na__ElevCfg__GetTransitionSetup().outOfMs, finish);
        Na__ElevMode__Dispatch();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Turn Markup Authoring On or Off
    // ------------------------------------------------------------
    // Remounts the stack, because whether a node is interactive is decided
    // when the node is built.
    // ------------------------------------------------------------
    function Na__ElevationMode__SetEditMode(enabled) {
        Na__ElevMode__EditMode = (enabled === true);

        if (Na__ElevMode__State === Na__ElevMode__STATE_DRAWING && Na__ElevMode__Active) {
            Na__ElevMode__MountMarkup(Na__ElevMode__Active);                     // <-- Mount unmounts the previous stack first
            Na__RenderLoop__RequestRender();
        }
        Na__ElevMode__Dispatch();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Apply the Cut and Camera After a Live Edit
    // ------------------------------------------------------------
    // The Dev menu's sliders and the gizmo grip change the plane while the
    // drawing is on screen. Everything derived from the plane - the clip, the
    // camera, the drawing axes the markup projects through - has to move
    // together or a dimension would report a figure against a plane that is
    // no longer there.
    // ------------------------------------------------------------
    function Na__ElevationMode__RefreshActive() {
        if (Na__ElevMode__State !== Na__ElevMode__STATE_DRAWING || !Na__ElevMode__Active) return false;

        const elevation = Na__ElevMode__Active;
        Na__ElevMode__StoreFraming(elevation);                                   // <-- Keep the framing across the rebuild
        Na__ElevMode__ApplyCut(elevation);
        Na__DrawView__SectionAdapter__ReapplyClipping();                          // <-- A rebuilt plane set on the current materials
        Na__ElevMode__ApplyCamera(elevation);
        Na__ElevMode__RegisterDrawingView(elevation);
        Na__ElevMode__MountMarkup(elevation);
        Na__RenderLoop__RequestRender();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Re-Apply an Elevation's Style Toggles While It Is on Screen
    // ------------------------------------------------------------
    function Na__ElevationMode__ApplyStyles(elevation) {
        if (Na__ElevMode__State !== Na__ElevMode__STATE_DRAWING || !elevation || elevation !== Na__ElevMode__Active) return false;
        const styles = Na__ElevData__GetStyles(elevation);
        Na__DrawView__ComposerPreset__ApplyStyles(styles);
        Na__DrawView__MaterialPreset__ApplyStyles(styles);
        Na__DrawView__SectionAdapter__ReapplyClipping();                          // <-- Fresh substitutes need the cut planes again
        Na__RenderLoop__RequestRender();
        Na__ElevMode__Dispatch();                                                // <-- The projected linework re-reads the toggles
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
    //   - An elevation scene always enters (or flips to) elevation mode.
    //   - An ordinary 3D scene selected WHILE drawing leaves elevation mode
    //     and flies to it, so the markup and the cut are cleared properly
    //     instead of being stranded over a moving perspective view.
    //   - A FLOOR PLAN scene is declined outright even while drawing, because
    //     claiming it would fly the camera to a pose the plan system is about
    //     to override anyway. The handover is done through the view broker.
    //   - An ordinary scene selected from 3D is not ours; the carousel handles
    //     it exactly as it always has.
    // ------------------------------------------------------------
    function Na__ElevMode__RouteSceneSelection(scene) {
        if (!Na__ElevMode__Initialized || !scene) return false;

        if (Na__ElevData__IsElevationScene(scene)) {
            const elevation = Na__ElevData__GetElevationForScene(null, scene);   // <-- Live drawings block
            if (!elevation) return false;                                        // <-- Dangling link: fall back to the normal path
            return Na__ElevationMode__EnterElevation(elevation);
        }

        if (Na__DrawData__IsFloorPlanScene(scene)) return false;

        if (Na__ElevMode__State !== Na__ElevMode__STATE_IDLE) {
            return Na__ElevationMode__ExitElevation(scene);                      // <-- Leave and fly to the 3D scene
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
    // The camera's frustum aspect is corrected whether or not the elevation is
    // on screen, so switching to it after a resize does not open at the wrong
    // shape. The markup only moves when the elevation is the drawing shown.
    // ------------------------------------------------------------
    function Na__ElevationMode__HandleResize(width, height) {
        Na__ElevCam__HandleResize(width, height);
        if (Na__ElevMode__State !== Na__ElevMode__STATE_DRAWING) return;
        Na__DrawMarkup__SyncLayerBox();                                          // <-- Canvas box moved; the layers must follow it
    }
    // ------------------------------------------------------------


    // FUNCTION | Point the Controller at a Different Model Root
    // ------------------------------------------------------------
    function Na__ElevationMode__SetModelRoot(modelRoot) {
        Na__ElevMode__ModelRoot = modelRoot || null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API - State Queries and Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Record How the Elevation on Screen Is Currently Framed
    // ------------------------------------------------------------
    function Na__ElevationMode__StoreActiveFraming() {
        if (Na__ElevMode__State !== Na__ElevMode__STATE_DRAWING || !Na__ElevMode__Active) return false;
        Na__ElevMode__StoreFraming(Na__ElevMode__Active);
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Elevation Mode Currently Displaying a Drawing?
    // ------------------------------------------------------------
    function Na__ElevationMode__IsActive() {
        return Na__ElevMode__State === Na__ElevMode__STATE_DRAWING;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Elevation Mode Active or Mid-Transition?
    // ------------------------------------------------------------
    function Na__ElevationMode__IsEngaged() {
        return Na__ElevMode__State !== Na__ElevMode__STATE_IDLE;
    }
    // ------------------------------------------------------------


    // FUNCTION | Get the Elevation Currently Displayed (null When None)
    // ------------------------------------------------------------
    function Na__ElevationMode__GetActiveElevation() {
        return Na__ElevMode__Active;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is Markup Authoring On?
    // ------------------------------------------------------------
    function Na__ElevationMode__IsEditMode() {
        return Na__ElevMode__EditMode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Initialize the Elevation Mode Controller
    // ------------------------------------------------------------
    // context: { camera, canvas, modelRoot, onChanged }
    // Resolves false when the feature is switched off in config, so callers
    // can skip mounting the Dev menu section entirely. The controls used for
    // flights come from Na__DrawView__Transitions__.
    // ------------------------------------------------------------
    async function Na__ElevationMode__Initialize(context) {
        if (!context || !context.camera || !context.canvas) {
            console.warn('[ValeVision3D] Elevation mode init skipped - missing camera or canvas.');
            return false;
        }

        Na__ElevMode__PerspCamera = context.camera;
        Na__ElevMode__Canvas      = context.canvas;
        Na__ElevMode__ModelRoot   = context.modelRoot || null;
        Na__ElevMode__OnChanged   = (typeof context.onChanged === 'function') ? context.onChanged : null;

        const [elevationEnabled] = await Promise.all([
            Na__ElevCfg__Load(),
            Na__PlanAnno__Load(),
            Na__PlanDim__Load()                                                  // <-- Also configures the dimension snap grid
        ]);

        Na__ElevMode__Initialized = true;

        // From here an elevation scene card switches into 2D rather than
        // flying the perspective camera to a pose it cannot read correctly.
        Na__DrawView__Transitions__RegisterRouter(Na__ElevMode__RouteSceneSelection);

        return elevationEnabled === true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Elevation Mode Controller API
    // ------------------------------------------------------------
    export {
        Na__ElevMode__CHANGED_EVENT,
        Na__ElevationMode__Initialize,
        Na__ElevationMode__EnterElevation,
        Na__ElevationMode__ExitElevation,
        Na__ElevationMode__SetEditMode,
        Na__ElevationMode__IsEditMode,
        Na__ElevationMode__StoreActiveFraming,
        Na__ElevationMode__RefreshActive,
        Na__ElevationMode__ApplyStyles,
        Na__ElevationMode__HandleResize,
        Na__ElevationMode__SetModelRoot,
        Na__ElevationMode__IsActive,
        Na__ElevationMode__IsEngaged,
        Na__ElevationMode__GetActiveElevation
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
