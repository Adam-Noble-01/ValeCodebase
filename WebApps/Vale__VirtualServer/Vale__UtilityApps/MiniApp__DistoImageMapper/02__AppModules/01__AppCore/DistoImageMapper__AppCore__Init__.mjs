/* =============================================================================
   DISTO IMAGE MAPPER - APP CORE | INIT
   =============================================================================

   FILE       : DistoImageMapper__AppCore__Init__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : AppCore - Init
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Boots the app and joins its parts: a chosen folder becomes a survey,
                the survey becomes the 3D atlas, and each control reaches its part
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - The parts never call each other for UI. They share the hovered and selected
     point through State, and this module carries everything else.
   - The 3D view mounts on the first survey, so the first screen costs nothing.
   - window.DistoImageMapper__App holds LoadFiles(files) and LoadEntries(entries), which
     open File objects as if a folder had been chosen, for testing with no picker.

   ============================================================================= */

import * as THREE from 'three';

import { DistoImageMapper__Config__Load, DistoImageMapper__Config__Section } from './DistoImageMapper__AppCore__Config__.mjs';
import {
    DistoImageMapper__State,
    DistoImageMapper__State__FocusIndex,
    DistoImageMapper__State__LoadPrefs,
    DistoImageMapper__State__On,
    DistoImageMapper__State__SetHovered,
    DistoImageMapper__State__SetSelected
} from './DistoImageMapper__AppCore__State__.mjs';
import { DistoImageMapper__Format__Fixed } from './DistoImageMapper__AppCore__Format__.mjs';
import { DistoImageMapper__UserConfig__Load } from './DistoImageMapper__AppCore__UserConfig__.mjs';

import { DistoImageMapper__Intake__FolderReader__GroupIntoSessions } from '../03__DataIntake/DistoImageMapper__Intake__FolderReader__.mjs';
import { DistoImageMapper__Intake__SurveyBuilder__Build } from '../03__DataIntake/DistoImageMapper__Intake__SurveyBuilder__.mjs';

import { DistoImageMapper__Coords__ModelToWorld } from '../04__Env3d/DistoImageMapper__Env3d__Coordinates__.mjs';
import {
    DistoImageMapper__Env3d__SceneManager__Canvas,
    DistoImageMapper__Env3d__SceneManager__Invalidate,
    DistoImageMapper__Env3d__SceneManager__Mount,
    DistoImageMapper__Env3d__SceneManager__SaveImage
} from '../04__Env3d/DistoImageMapper__Env3d__SceneManager__.mjs';
import {
    DistoImageMapper__Env3d__CameraRig__FlyTo3dView,
    DistoImageMapper__Env3d__CameraRig__FlyToElevation,
    DistoImageMapper__Env3d__CameraRig__FlyToFace,
    DistoImageMapper__Env3d__CameraRig__FlyToTripod,
    DistoImageMapper__Env3d__CameraRig__FlyToPlan,
    DistoImageMapper__Env3d__CameraRig__FlyToPoint,
    DistoImageMapper__Env3d__CameraRig__IsAtTripod,
    DistoImageMapper__Env3d__CameraRig__JumpTo3dView,
    DistoImageMapper__Env3d__CameraRig__Mount,
    DistoImageMapper__Env3d__CameraRig__OnUserMove,
    DistoImageMapper__Env3d__CameraRig__SetContentBoxes,
    DistoImageMapper__Env3d__CameraRig__ZoomTripod
} from '../04__Env3d/DistoImageMapper__Env3d__CameraRig__.mjs';
import {
    DistoImageMapper__Env3d__AlignmentSheets__Box,
    DistoImageMapper__Env3d__AlignmentSheets__Build,
    DistoImageMapper__Env3d__AlignmentSheets__SetClip,
    DistoImageMapper__Env3d__AlignmentSheets__SetKept,
    DistoImageMapper__Env3d__AlignmentSheets__SetOffsets,
    DistoImageMapper__Env3d__AlignmentSheets__SetVisible
} from '../04__Env3d/DistoImageMapper__Env3d__AlignmentSheets__.mjs';
import {
    DistoImageMapper__Env3d__SurveyLines__Build,
    DistoImageMapper__Env3d__SurveyLines__SetClip,
    DistoImageMapper__Env3d__SurveyLines__SetHighlight,
    DistoImageMapper__Env3d__SurveyLines__SetKept,
    DistoImageMapper__Env3d__SurveyLines__SetVisible,
    DistoImageMapper__Env3d__SurveyLines__UpdateProjectors
} from '../04__Env3d/DistoImageMapper__Env3d__SurveyLines__.mjs';
import {
    DistoImageMapper__Env3d__PhotoCards__Arrangements,
    DistoImageMapper__Env3d__PhotoCards__Build,
    DistoImageMapper__Env3d__PhotoCards__LoadPhotos,
    DistoImageMapper__Env3d__PhotoCards__Mount,
    DistoImageMapper__Env3d__PhotoCards__PickAt,
    DistoImageMapper__Env3d__PhotoCards__ScreenRect,
    DistoImageMapper__Env3d__PhotoCards__SetArrangement,
    DistoImageMapper__Env3d__PhotoCards__SetFocus,
    DistoImageMapper__Env3d__PhotoCards__SetKept,
    DistoImageMapper__Env3d__PhotoCards__SetSizing,
    DistoImageMapper__Env3d__PhotoCards__SetVisible
} from '../04__Env3d/DistoImageMapper__Env3d__PhotoCards__.mjs';
import {
    DistoImageMapper__Env3d__ClipBox__ActingMode,
    DistoImageMapper__Env3d__ClipBox__Begin,
    DistoImageMapper__Env3d__ClipBox__Corners,
    DistoImageMapper__Env3d__ClipBox__Face,
    DistoImageMapper__Env3d__ClipBox__Fit,
    DistoImageMapper__Env3d__ClipBox__IsKept,
    DistoImageMapper__Env3d__ClipBox__Mount,
    DistoImageMapper__Env3d__ClipBox__OnChange,
    DistoImageMapper__Env3d__ClipBox__SetShown,
    DistoImageMapper__Env3d__ClipBox__SquareTo,
    DistoImageMapper__Env3d__ClipBox__State,
    DistoImageMapper__Env3d__ClipBox__ViewClip
} from '../04__Env3d/DistoImageMapper__Env3d__ClipBox__.mjs';

import {
    DistoImageMapper__Ui__LandingScreen__ChooseFolder,
    DistoImageMapper__Ui__LandingScreen__Mount,
    DistoImageMapper__Ui__LandingScreen__SetVisible,
    DistoImageMapper__Ui__LandingScreen__ShowChooser,
    DistoImageMapper__Ui__LandingScreen__ShowError
} from '../05__UiPanels/DistoImageMapper__Ui__LandingScreen__.mjs';
import {
    DistoImageMapper__Ui__ControlPanel__LockArrangement,
    DistoImageMapper__Ui__ControlPanel__Mount,
    DistoImageMapper__Ui__ControlPanel__ShowSurvey
} from '../05__UiPanels/DistoImageMapper__Ui__ControlPanel__.mjs';
import { DistoImageMapper__Ui__Filmstrip__Build, DistoImageMapper__Ui__Filmstrip__Mount, DistoImageMapper__Ui__Filmstrip__SetKept } from '../05__UiPanels/DistoImageMapper__Ui__Filmstrip__.mjs';
import {
    DistoImageMapper__Ui__Lightbox__Build,
    DistoImageMapper__Ui__Lightbox__Close,
    DistoImageMapper__Ui__Lightbox__IsOpen,
    DistoImageMapper__Ui__Lightbox__Mount,
    DistoImageMapper__Ui__Lightbox__Open,
    DistoImageMapper__Ui__Lightbox__SetKept,
    DistoImageMapper__Ui__Lightbox__Step
} from '../05__UiPanels/DistoImageMapper__Ui__Lightbox__.mjs';
import {
    DistoImageMapper__Ui__MeasureTool__IsActive,
    DistoImageMapper__Ui__MeasureTool__Mount,
    DistoImageMapper__Ui__MeasureTool__Pick,
    DistoImageMapper__Ui__MeasureTool__Reset,
    DistoImageMapper__Ui__MeasureTool__SetActive
} from '../05__UiPanels/DistoImageMapper__Ui__MeasureTool__.mjs';
import {
    DistoImageMapper__Ui__ClipBoxPanel__Mount,
    DistoImageMapper__Ui__ClipBoxPanel__SetActiveFace,
    DistoImageMapper__Ui__ClipBoxPanel__SetSquaring,
    DistoImageMapper__Ui__ClipBoxPanel__Show,
    DistoImageMapper__Ui__ClipBoxPanel__ShowCount
} from '../05__UiPanels/DistoImageMapper__Ui__ClipBoxPanel__.mjs';
import { DistoImageMapper__Ui__ExportDialog__Mount, DistoImageMapper__Ui__ExportDialog__Open } from '../05__UiPanels/DistoImageMapper__Ui__ExportDialog__.mjs';
import { DistoImageMapper__Ui__PanelMenu__Mount } from '../05__UiPanels/DistoImageMapper__Ui__PanelMenu__.mjs';

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Views and Timing
    // ------------------------------------------------------------
    const VIEWS            =  { ThreeD : 'ThreeD', Plan : 'Plan', Elevation : 'Elevation', Tripod : 'Tripod', Face : 'Face' };
    const STATUS_LINGER_MS  =  1400;
    const STATUS_PROBLEM_MS =  7000;                                         // <-- Long enough to read a sentence
    const ZOOM_STEP         =  1.25;
    // ------------------------------------------------------------


    // MODULE VARIABLES | App Parts
    // ------------------------------------------------------------
    let Is3dMounted     =  false;
    let CurrentView     =  VIEWS.ThreeD;
    let CurrentFace     =  'Front';                                          // <-- The clipping box's face, while CurrentView is Face
    let KeptMask        =  null;                                             // <-- Per point: kept by the clipping box
    let IsSquaring      =  false;                                            // <-- Square to Points: waiting for two clicks
    let SquareFirst     =  -1;
    let PointerStart    =  null;
    let StatusTimer     =  null;
    let ObjectUrls      =  [];
    let LoadGeneration  =  0;

    const Ui  =  {};                                                         // <-- Elements this module drives directly
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Status Line and Tooltip
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Show a Line of Progress Over the Viewport
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__Status(message, lingerMs = 0) {
        window.clearTimeout(StatusTimer);
        Ui.Status.hidden       =  false;
        Ui.Status.textContent  =  message;
        if (lingerMs) StatusTimer  =  window.setTimeout(() => { Ui.Status.hidden  =  true; }, lingerMs);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Say Something Went Wrong, Without Losing the Open Survey
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__ReportProblem(message) {
        if (DistoImageMapper__State.Survey) {
            DistoImageMapper__AppCore__Init__Status(message, STATUS_PROBLEM_MS);
            return;
        }
        DistoImageMapper__Ui__LandingScreen__SetVisible(true);
        DistoImageMapper__Ui__LandingScreen__ShowError(message);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Tooltip Beside the Pointer
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__ShowTooltip(index, clientX, clientY) {
        if (index < 0) {
            Ui.Tooltip.hidden  =  true;
            return;
        }

        const point  =  DistoImageMapper__State.Survey.Points[index];
        const p      =  point.PositionMm;
        Ui.TooltipTitle.textContent   =  `Point ${point.Number}`;
        Ui.TooltipDetail.textContent  =  `X ${DistoImageMapper__Format__Fixed(p.X, 0)}   Y ${DistoImageMapper__Format__Fixed(p.Y, 0)}   Z ${DistoImageMapper__Format__Fixed(p.Z, 0)} mm`;
        Ui.Tooltip.hidden  =  false;

        const margin  =  14;
        const width   =  Ui.Tooltip.offsetWidth;
        const x       =  clientX + margin + width > window.innerWidth ? clientX - margin - width : clientX + margin;
        Ui.Tooltip.style.transform  =  `translate(${x}px, ${Math.max(clientY - 46, 4)}px)`;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Settings to Scene
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | What the Current View Shows of What Is Ticked
    // ------------------------------------------------------------
    // Plan and Elevation each read as a clean drawing: the other sheet would only be a
    // bar along one edge, and every drop line a dot or a stripe. The Tripod view
    // shows the photos alone, as that panorama is what it is for. Orbiting away, or
    // choosing the 3D View, brings back everything that is ticked.
    function DistoImageMapper__AppCore__Init__ShownLayers() {
        const layers       =  DistoImageMapper__State.Prefs.Layers;
        const atTripod =  CurrentView === VIEWS.Tripod;
        const onPlan       =  CurrentView === VIEWS.Plan;
        const onElevation  =  CurrentView === VIEWS.Elevation;
        const onFace       =  CurrentView === VIEWS.Face;                    // <-- A box face reads as its drawing: no sheets, no sight lines
        const isOpenView   =  !atTripod && !onPlan && !onElevation && !onFace;

        return {
            Photos             :  layers.Photos,
            Plan               :  layers.Plan && !atTripod && !onElevation && !onFace,
            Elevation          :  layers.Elevation && !atTripod && !onPlan && !onFace,
            Chain3d            :  layers.Chain3d && !atTripod,
            Sight              :  layers.Sight && !atTripod && !onFace,
            Axes               :  layers.Axes && !atTripod && !onFace,
            ProjectorPlan      :  layers.Projectors && layers.Plan && isOpenView,        // <-- A drop line needs its sheet
            ProjectorElevation :  layers.Projectors && layers.Elevation && isOpenView
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Show and Hide the Scene's Layers
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__ApplyLayers() {
        const shown  =  DistoImageMapper__AppCore__Init__ShownLayers();

        DistoImageMapper__Env3d__PhotoCards__SetVisible(shown.Photos);
        DistoImageMapper__Env3d__AlignmentSheets__SetVisible('Plan', shown.Plan);
        DistoImageMapper__Env3d__AlignmentSheets__SetVisible('Elevation', shown.Elevation);

        for (const key of ['Chain3d', 'Sight', 'Axes', 'ProjectorPlan', 'ProjectorElevation']) {
            DistoImageMapper__Env3d__SurveyLines__SetVisible(key, shown[key]);
        }

        DistoImageMapper__AppCore__Init__ApplyFocus();
    }
    // ------------------------------------------------------------


    // FUNCTION | Carry the Clipping Box Into the Scene: What It Keeps, Everywhere
    // ------------------------------------------------------------
    // isLive: a face is still being dragged, so the sheets (a canvas each, up to
    // 4096 px) wait until it is let go.
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__ApplyClip(isLive) {
        const survey  =  DistoImageMapper__State.Survey;
        if (!survey) return;
        const mask  =  survey.Points.map(point => DistoImageMapper__Env3d__ClipBox__IsKept(point.PositionMm));
        KeptMask  =  mask;
        DistoImageMapper__Env3d__PhotoCards__SetKept(mask);
        DistoImageMapper__Env3d__SurveyLines__SetKept(mask, DistoImageMapper__Env3d__ClipBox__IsKept);
        DistoImageMapper__Ui__Filmstrip__SetKept(mask);
        DistoImageMapper__Ui__Lightbox__SetKept(mask);
        if (!isLive) DistoImageMapper__Env3d__AlignmentSheets__SetKept(mask);
        if (DistoImageMapper__State.HoveredIndex >= 0 && !mask[DistoImageMapper__State.HoveredIndex]) DistoImageMapper__State__SetHovered(-1);
        if (DistoImageMapper__State.SelectedIndex >= 0 && !mask[DistoImageMapper__State.SelectedIndex]) DistoImageMapper__State__SetSelected(-1);
        DistoImageMapper__AppCore__Init__ApplyLayers();
        DistoImageMapper__AppCore__Init__ApplyViewClip();
        DistoImageMapper__Ui__ClipBoxPanel__ShowCount(mask.filter(Boolean).length, mask.length, DistoImageMapper__Env3d__ClipBox__State().Mode, DistoImageMapper__Env3d__ClipBox__ActingMode());
    }
    // ------------------------------------------------------------


    // FUNCTION | Cut the Sheets and Axes to the Box as It Moves (Clip the View to the Box)
    // ------------------------------------------------------------
    // What you see is what is kept (Adam, 06-Nov-2026). Off, or with the box keeping
    // every point, nothing is cut. The points and photos go whole, point by point, in
    // ApplyClip; the planes cut the sheets, the lines, the tripod and the axes.
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__ApplyViewClip() {
        if (!DistoImageMapper__State.Survey) return;
        const clip  =  DistoImageMapper__Env3d__ClipBox__ViewClip();
        DistoImageMapper__Env3d__AlignmentSheets__SetClip(clip);
        DistoImageMapper__Env3d__SurveyLines__SetClip(clip);
    }
    // ------------------------------------------------------------


    // FUNCTION | Arrange and Size the Photos
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__ApplyPhotos() {
        const prefs        =  DistoImageMapper__State.Prefs;
        const atTripod =  CurrentView === VIEWS.Tripod;

        DistoImageMapper__Env3d__PhotoCards__SetSizing(prefs.SizeScale, prefs.LiftPx, prefs.FieldOfViewDegrees, prefs.PhotoOpacity);
        DistoImageMapper__Env3d__PhotoCards__SetArrangement(atTripod ? DistoImageMapper__Env3d__PhotoCards__Arrangements.AsShot : prefs.Arrangement);
        DistoImageMapper__Ui__ControlPanel__LockArrangement(atTripod);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | As Shot Belongs to the Tripod View
    // ------------------------------------------------------------
    // The Tripod view always shows the photos facing the tripod. Leaving it, opening a survey or
    // opening the app goes back to the chosen arrangement: On the Point, unless Atlas was picked.
    // Picked by hand in another view, As Shot lasts until then.
    function DistoImageMapper__AppCore__Init__ForgetAsShot() {
        const prefs  =  DistoImageMapper__State.Prefs;
        if (prefs.Arrangement === DistoImageMapper__Env3d__PhotoCards__Arrangements.AsShot) {
            prefs.Arrangement  =  DistoImageMapper__Env3d__PhotoCards__Arrangements.OnPoint;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Put the Sheets on Their Planes and Tell the Camera What Is There
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__ApplySheets() {
        const prefs  =  DistoImageMapper__State.Prefs;

        DistoImageMapper__Env3d__AlignmentSheets__SetOffsets(prefs.PlanOffsetMm, prefs.ElevationOffsetMm);
        DistoImageMapper__Env3d__SurveyLines__UpdateProjectors();

        const planBox       =  DistoImageMapper__Env3d__AlignmentSheets__Box('Plan');
        const elevationBox  =  DistoImageMapper__Env3d__AlignmentSheets__Box('Elevation');
        const allBox        =  planBox.clone().union(elevationBox);
        DistoImageMapper__State.Survey.Points.forEach(point => allBox.expandByPoint(DistoImageMapper__Coords__ModelToWorld(point.PositionMm)));

        DistoImageMapper__Env3d__CameraRig__SetContentBoxes(allBox, planBox, elevationBox);
        DistoImageMapper__AppCore__Init__ApplyFocus();
    }
    // ------------------------------------------------------------


    // FUNCTION | Carry the Focused Point Into the Scene
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__ApplyFocus() {
        if (!DistoImageMapper__State.Survey) return;

        const focus  =  DistoImageMapper__State__FocusIndex();
        const shown  =  DistoImageMapper__AppCore__Init__ShownLayers();

        DistoImageMapper__Env3d__PhotoCards__SetFocus(focus, DistoImageMapper__State.HoveredIndex);
        DistoImageMapper__Env3d__SurveyLines__SetHighlight(focus, shown.Plan, shown.Elevation);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Views
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Light the Toolbar Button for the Current View
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__ShowView() {
        Ui.ViewButtons.forEach(button => button.classList.toggle('is-active', button.dataset.view === CurrentView));
        Ui.ZoomGroup.hidden  =  CurrentView !== VIEWS.Tripod;
        DistoImageMapper__Ui__ClipBoxPanel__SetActiveFace(CurrentView === VIEWS.Face ? CurrentFace : '');
        DistoImageMapper__AppCore__Init__ApplyLayers();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Tripod, and Where to Look to Take In Its Shots
    // ------------------------------------------------------------
    // Each shot's direction as two angles, measured from their mean so nothing wraps.
    // The look is the middle of their range. Shots far closer than the rest are left
    // out: a reference point at the tripod's feet should not swing the whole view.
    function DistoImageMapper__AppCore__Init__TripodAim() {
        const survey  =  DistoImageMapper__State.Survey;
        if (!survey.Station) return null;

        const camera   =  DistoImageMapper__Config__Section('Camera');
        const station  =  DistoImageMapper__Coords__ModelToWorld(survey.Station.PositionMm);
        const offsets  =  survey.Points.map(point => DistoImageMapper__Coords__ModelToWorld(point.PositionMm).sub(station));

        const lengths  =  offsets.map(offset => offset.length()).sort((a, b) => a - b);
        const nearest  =  lengths[Math.floor(lengths.length / 2)] * camera.TripodNearShare;
        const faraway  =  offsets.filter(offset => offset.length() >= nearest);
        const rays     =  (faraway.length >= 3 ? faraway : offsets).map(offset => offset.clone().normalize());

        const mean     =  rays.reduce((sum, ray) => sum.add(ray), new THREE.Vector3()).normalize();
        const meanTurn =  Math.atan2(mean.x, mean.z);
        const wrap     =  angle => Math.atan2(Math.sin(angle), Math.cos(angle));
        const turns    =  rays.map(ray => wrap(Math.atan2(ray.x, ray.z) - meanTurn));
        const rises    =  rays.map(ray => Math.asin(THREE.MathUtils.clamp(ray.y, -1, 1)));

        const turnLow  =  Math.min(...turns);
        const turnHigh =  Math.max(...turns);
        const riseLow  =  Math.min(...rises);
        const riseHigh =  Math.max(...rises);

        const turn  =  meanTurn + (turnLow + turnHigh) / 2;
        const rise  =  (riseLow + riseHigh) / 2;
        const look  =  new THREE.Vector3(Math.cos(rise) * Math.sin(turn), Math.sin(rise), Math.cos(rise) * Math.cos(turn));

        const toDegrees  =  180 / Math.PI;
        const margin     =  DistoImageMapper__State.Prefs.FieldOfViewDegrees / 2 + camera.TripodMarginDegrees;  // <-- The outermost photos show whole

        return {
            Station      :  station,
            LookAt       :  station.clone().add(look),
            HalfAcross   :  (turnHigh - turnLow) / 2 * toDegrees + margin,
            HalfUp       :  (riseHigh - riseLow) / 2 * toDegrees + margin
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Go to a View
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__GoToView(view, faceKey = CurrentFace) {
        if (!DistoImageMapper__State.Survey) return;

        const aim  =  DistoImageMapper__AppCore__Init__TripodAim();
        if (view === VIEWS.Tripod && !aim) return;

        if (CurrentView === VIEWS.Tripod && view !== VIEWS.Tripod) DistoImageMapper__AppCore__Init__ForgetAsShot();

        if (view === VIEWS.Face) CurrentFace  =  faceKey || 'Front';
        CurrentView  =  view;
        DistoImageMapper__AppCore__Init__ShowView();
        DistoImageMapper__AppCore__Init__ApplyPhotos();

        switch (view) {
            case VIEWS.Plan:       DistoImageMapper__Env3d__CameraRig__FlyToPlan(); break;
            case VIEWS.Elevation:  DistoImageMapper__Env3d__CameraRig__FlyToElevation(); break;
            case VIEWS.Tripod: DistoImageMapper__Env3d__CameraRig__FlyToTripod(aim.Station, aim.LookAt, aim.HalfAcross, aim.HalfUp); break;
            case VIEWS.Face:       DistoImageMapper__AppCore__Init__FlyToFace(CurrentFace); break;
            default:               DistoImageMapper__Env3d__CameraRig__FlyTo3dView(DistoImageMapper__State.Prefs.Parallel);
        }
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Fly Straight On to a Face of the Clipping Box, From Outside
    // ------------------------------------------------------------
    // Framed on the whole box. Straight down or up, the view turns with the box so
    // its Front stays at the foot of the screen, as on the face's drawing.
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__FlyToFace(key) {
        const face     =  DistoImageMapper__Env3d__ClipBox__Face(key);
        const corners  =  DistoImageMapper__Env3d__ClipBox__Corners().map(corner => DistoImageMapper__Coords__ModelToWorld(corner));
        const toEye    =  new THREE.Vector3(face.Out[0], face.Out[2], -face.Out[1]);   // <-- Model Z is world up
        const yaw      =  DistoImageMapper__Env3d__ClipBox__State().YawDeg * Math.PI / 180;
        DistoImageMapper__Env3d__CameraRig__FlyToFace(corners, toEye, key === 'Bottom' ? yaw + Math.PI : yaw);
    }
    // ------------------------------------------------------------


    // FUNCTION | Fly to One Point From Where the Camera Is
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__FlyToPoint(index) {
        const survey   =  DistoImageMapper__State.Survey;
        const station  =  survey.Station ? DistoImageMapper__Coords__ModelToWorld(survey.Station.PositionMm) : null;

        if (!DistoImageMapper__Env3d__CameraRig__IsAtTripod()) {
            CurrentView  =  null;
            DistoImageMapper__AppCore__Init__ShowView();
        }
        DistoImageMapper__Env3d__CameraRig__FlyToPoint(DistoImageMapper__Coords__ModelToWorld(survey.Points[index].PositionMm), station);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Pointing at Photos
// -----------------------------------------------------------------------------

    // FUNCTION | A Photo Was Clicked: Expand It, or Measure to It
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__ActivatePoint(index) {
        if (IsSquaring) {
            DistoImageMapper__AppCore__Init__PickSquarePoint(index);
            return;
        }

        if (DistoImageMapper__Ui__MeasureTool__IsActive()) {
            DistoImageMapper__Ui__MeasureTool__Pick(index);
            return;
        }

        DistoImageMapper__State__SetHovered(-1);
        Ui.Tooltip.hidden  =  true;
        DistoImageMapper__Ui__Lightbox__Open(index, DistoImageMapper__Env3d__PhotoCards__ScreenRect(index));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Square to Points: Wait for Two Photos on One Wall (pressing it again stops)
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__StartSquare() {
        if (!DistoImageMapper__State.Survey) return;
        if (IsSquaring) {
            DistoImageMapper__AppCore__Init__StopSquare('');
            return;
        }
        if (DistoImageMapper__Ui__MeasureTool__IsActive()) DistoImageMapper__AppCore__Init__ToggleMeasure();
        IsSquaring   =  true;
        SquareFirst  =  -1;
        Ui.BoxHint.textContent  =  'Square to Points: click a photo on the wall';
        Ui.BoxHint.hidden       =  false;
        DistoImageMapper__Ui__ClipBoxPanel__SetSquaring(true);
        if (!DistoImageMapper__Env3d__ClipBox__State().Shown) DistoImageMapper__Env3d__ClipBox__SetShown(true);
    }

    function DistoImageMapper__AppCore__Init__StopSquare(message) {
        if (!IsSquaring) return;
        IsSquaring   =  false;
        SquareFirst  =  -1;
        Ui.BoxHint.hidden  =  true;
        DistoImageMapper__Ui__ClipBoxPanel__SetSquaring(false);
        if (message) DistoImageMapper__AppCore__Init__Status(message, STATUS_PROBLEM_MS);
    }

    function DistoImageMapper__AppCore__Init__PickSquarePoint(index) {
        const survey  =  DistoImageMapper__State.Survey;
        if (SquareFirst < 0) {
            SquareFirst  =  index;
            Ui.BoxHint.textContent  =  `From point ${survey.Points[index].Number}: click a second photo along the same wall`;
            return;
        }
        if (index === SquareFirst) return;
        const first   =  survey.Points[SquareFirst];
        const second  =  survey.Points[index];
        const squared =  DistoImageMapper__Env3d__ClipBox__SquareTo(
            first.PositionMm, second.PositionMm, survey.Station ? survey.Station.PositionMm : null, survey.Points.map(point => point.PositionMm)
        );
        if (!squared) {
            Ui.BoxHint.textContent  =  `Points ${first.Number} and ${second.Number} are too close on plan: click one further along the wall`;
            return;
        }
        DistoImageMapper__AppCore__Init__StopSquare(`Box squared to the wall through points ${first.Number} and ${second.Number}, and fitted round every point`);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Close the Lightbox, Back to the Photo's Card
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__CloseLightbox() {
        DistoImageMapper__Ui__Lightbox__Close(DistoImageMapper__Env3d__PhotoCards__ScreenRect(DistoImageMapper__State.SelectedIndex));
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Follow the Pointer Over the Canvas
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__BindCanvas(canvas) {
        const tolerance  =  DistoImageMapper__Config__Section('Camera').ClickMoveTolerancePx;

        canvas.addEventListener('pointermove', event => {
            if (event.pointerType === 'touch' || event.buttons !== 0) return;   // <-- Orbiting, not pointing

            const index  =  DistoImageMapper__Env3d__PhotoCards__PickAt(event.clientX, event.clientY);
            DistoImageMapper__State__SetHovered(index);
            DistoImageMapper__AppCore__Init__ShowTooltip(index, event.clientX, event.clientY);
            canvas.style.cursor  =  index >= 0 ? 'pointer' : 'grab';
        });

        canvas.addEventListener('pointerleave', () => {
            DistoImageMapper__State__SetHovered(-1);
            Ui.Tooltip.hidden  =  true;
        });

        canvas.addEventListener('pointerdown', event => {
            PointerStart  =  event.button === 0 ? { X : event.clientX, Y : event.clientY } : null;
            Ui.Tooltip.hidden  =  true;
        });

        canvas.addEventListener('pointerup', event => {
            if (!PointerStart) return;
            const travelled  =  Math.hypot(event.clientX - PointerStart.X, event.clientY - PointerStart.Y);
            PointerStart     =  null;
            if (travelled > tolerance) return;                               // <-- That was an orbit, not a click

            const index  =  DistoImageMapper__Env3d__PhotoCards__PickAt(event.clientX, event.clientY);
            if (index >= 0) DistoImageMapper__AppCore__Init__ActivatePoint(index);
            else DistoImageMapper__State__SetSelected(-1);
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Opening a Survey
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Mount the 3D View the First Time It Is Needed
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__Ensure3dMounted() {
        if (Is3dMounted) return;
        Is3dMounted  =  true;

        DistoImageMapper__Env3d__SceneManager__Mount(Ui.Viewport, DistoImageMapper__Config__Section('Colours').Backdrop);
        DistoImageMapper__Env3d__CameraRig__Mount();                         // <-- Frame tasks run in this order: camera, photos, then the measure label
        DistoImageMapper__Env3d__PhotoCards__Mount();
        DistoImageMapper__Ui__MeasureTool__Mount(Ui.MeasureLabel, Ui.MeasureHint);
        DistoImageMapper__Env3d__ClipBox__Mount(Ui.Viewport);

        DistoImageMapper__Env3d__CameraRig__OnUserMove(() => {
            if (DistoImageMapper__Env3d__CameraRig__IsAtTripod()) return;   // <-- Looking round at the tripod is still that view
            CurrentView  =  null;
            DistoImageMapper__AppCore__Init__ShowView();
        });

        DistoImageMapper__AppCore__Init__BindCanvas(DistoImageMapper__Env3d__SceneManager__Canvas());
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Give Each Photo a Local URL
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__CreateImageUrls(survey) {
        ObjectUrls.forEach(url => URL.revokeObjectURL(url));
        ObjectUrls  =  [];

        for (const point of survey.Points) {
            point.ImageUrl  =  point.ImageFile ? URL.createObjectURL(point.ImageFile) : null;
            if (point.ImageUrl) ObjectUrls.push(point.ImageUrl);
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Open One Survey
    // ------------------------------------------------------------
    async function DistoImageMapper__AppCore__Init__OpenSession(session) {
        const generation  =  ++LoadGeneration;

        let survey  =  null;
        try {
            survey  =  await DistoImageMapper__Intake__SurveyBuilder__Build(session);
        } catch (error) {
            DistoImageMapper__AppCore__Init__ReportProblem(`${session.Name} could not be read: ${error.message}`);
            return;
        }
        if (generation !== LoadGeneration) return;

        DistoImageMapper__Ui__LandingScreen__SetVisible(false);
        DistoImageMapper__Ui__LandingScreen__ShowError('');
        Ui.Stage.hidden  =  false;

        try {
            DistoImageMapper__AppCore__Init__Ensure3dMounted();
        } catch (error) {
            Ui.Stage.hidden  =  true;
            DistoImageMapper__Ui__LandingScreen__SetVisible(true);
            DistoImageMapper__Ui__LandingScreen__ShowError(`This browser could not start 3D graphics: ${error.message}`);
            return;
        }

        DistoImageMapper__AppCore__Init__CreateImageUrls(survey);

        DistoImageMapper__Ui__Lightbox__Close(null);
        DistoImageMapper__State.Survey         =  survey;
        DistoImageMapper__State.HoveredIndex   =  -1;
        DistoImageMapper__State.SelectedIndex  =  -1;
        CurrentView  =  VIEWS.ThreeD;
        DistoImageMapper__AppCore__Init__ForgetAsShot();

        DistoImageMapper__Env3d__AlignmentSheets__Build(survey);
        DistoImageMapper__Env3d__SurveyLines__Build(survey);
        DistoImageMapper__Env3d__PhotoCards__Build(survey);

        DistoImageMapper__Ui__ControlPanel__ShowSurvey(survey);
        DistoImageMapper__Ui__Filmstrip__Build(survey, DistoImageMapper__AppCore__Init__ActivatePoint);
        DistoImageMapper__Ui__Lightbox__Build(survey);
        DistoImageMapper__Ui__MeasureTool__Reset(survey);
        Ui.MeasureButton.classList.remove('is-active');
        Ui.TripodButton.disabled  =  !survey.Station;

        DistoImageMapper__AppCore__Init__StopSquare('');
        DistoImageMapper__Env3d__ClipBox__Begin(survey);                     // <-- Its saved box, else square round every point: the clip reaches every layer
        DistoImageMapper__Ui__ClipBoxPanel__Show();

        DistoImageMapper__AppCore__Init__ApplySheets();
        DistoImageMapper__AppCore__Init__ApplyPhotos();
        DistoImageMapper__AppCore__Init__ShowView();

        document.title  =  `${survey.Name} |  Disto Image Mapper`;

        DistoImageMapper__Env3d__CameraRig__JumpTo3dView(DistoImageMapper__State.Prefs.Parallel);
        DistoImageMapper__Env3d__SceneManager__Invalidate();

        const total  =  survey.Points.length;
        DistoImageMapper__AppCore__Init__Status(`Loading photos: 0 of ${total}`);
        await DistoImageMapper__Env3d__PhotoCards__LoadPhotos((finished) => {
            if (generation === LoadGeneration) DistoImageMapper__AppCore__Init__Status(`Loading photos: ${finished} of ${total}`);
        });
        if (generation === LoadGeneration) DistoImageMapper__AppCore__Init__Status(`${total} photos on their points`, STATUS_LINGER_MS);
    }
    // ------------------------------------------------------------


    // FUNCTION | Handle the Surveys a Folder Gave
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__HandleSessions(sessions) {
        if (!sessions.length) {
            DistoImageMapper__AppCore__Init__ReportProblem('No DISTO survey found there. A survey folder holds 3D_, 2DG_ and 2DW_ CAD files, a CSV log and the IMG_ photos.');
            return;
        }

        if (sessions.length === 1) {
            DistoImageMapper__AppCore__Init__OpenSession(sessions[0]);
            return;
        }

        DistoImageMapper__Ui__LandingScreen__ShowChooser(sessions, DistoImageMapper__AppCore__Init__OpenSession, Boolean(DistoImageMapper__State.Survey));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Toolbar and Keyboard
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Switch Measuring On or Off From the Toolbar or a Key
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__ToggleMeasure() {
        if (!DistoImageMapper__State.Survey) return;
        DistoImageMapper__AppCore__Init__StopSquare('');
        const isActive  =  !DistoImageMapper__Ui__MeasureTool__IsActive();
        DistoImageMapper__Ui__MeasureTool__SetActive(isActive);
        Ui.MeasureButton.classList.toggle('is-active', isActive);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Save What the View Shows
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__SaveImage() {
        if (!DistoImageMapper__State.Survey) return;
        DistoImageMapper__Env3d__SceneManager__SaveImage(`DistoImageMapper__${DistoImageMapper__State.Survey.Name.replace(/\s+/g, '_')}__View.png`);
        DistoImageMapper__AppCore__Init__Status('View saved as an image', STATUS_LINGER_MS);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Toolbar's Buttons
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__BindToolbar() {
        Ui.ViewButtons.forEach(button => button.addEventListener('click', () => DistoImageMapper__AppCore__Init__GoToView(button.dataset.view)));

        document.getElementById('DistoImageMapper__Toolbar__Frame').addEventListener('click', () => DistoImageMapper__AppCore__Init__GoToView(CurrentView || VIEWS.ThreeD));
        document.getElementById('DistoImageMapper__Toolbar__SaveImage').addEventListener('click', DistoImageMapper__AppCore__Init__SaveImage);
        Ui.MeasureButton.addEventListener('click', DistoImageMapper__AppCore__Init__ToggleMeasure);

        document.getElementById('DistoImageMapper__Toolbar__ZoomIn').addEventListener('click', () => DistoImageMapper__Env3d__CameraRig__ZoomTripod(1 / ZOOM_STEP));
        document.getElementById('DistoImageMapper__Toolbar__ZoomOut').addEventListener('click', () => DistoImageMapper__Env3d__CameraRig__ZoomTripod(ZOOM_STEP));

        const helpButton  =  document.getElementById('DistoImageMapper__Toolbar__Help');
        const helpPanel   =  document.getElementById('DistoImageMapper__Help');
        helpButton.addEventListener('click', () => { helpPanel.hidden  =  !helpPanel.hidden; });
        document.getElementById('DistoImageMapper__Help__Close').addEventListener('click', () => { helpPanel.hidden  =  true; });

        DistoImageMapper__Ui__PanelMenu__Mount({                             // <-- The right-hand menu: its rows, groups, grip and the Panel button
            Stage  :  Ui.Stage,
            Panel  :  document.getElementById('DistoImageMapper__Panel'),
            Grip   :  document.getElementById('DistoImageMapper__Panel__Grip'),
            Toggle :  document.getElementById('DistoImageMapper__Toolbar__Panel')
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Keyboard
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__BindKeyboard() {
        window.addEventListener('keydown', event => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.target && event.target.matches && event.target.matches('input, select, textarea')) return;
            if (!DistoImageMapper__State.Survey) return;

            if (DistoImageMapper__Ui__Lightbox__IsOpen()) {
                if (event.key === 'Escape')     DistoImageMapper__AppCore__Init__CloseLightbox();
                if (event.key === 'ArrowLeft')  DistoImageMapper__Ui__Lightbox__Step(-1);
                if (event.key === 'ArrowRight') DistoImageMapper__Ui__Lightbox__Step(1);
                return;
            }

            switch (event.key) {
                case '1': DistoImageMapper__AppCore__Init__GoToView(VIEWS.ThreeD); break;
                case '2': DistoImageMapper__AppCore__Init__GoToView(VIEWS.Plan); break;
                case '3': DistoImageMapper__AppCore__Init__GoToView(VIEWS.Elevation); break;
                case '4': DistoImageMapper__AppCore__Init__GoToView(VIEWS.Tripod); break;
                case 'f':
                case 'F': DistoImageMapper__AppCore__Init__GoToView(CurrentView || VIEWS.ThreeD); break;
                case 'm':
                case 'M': DistoImageMapper__AppCore__Init__ToggleMeasure(); break;
                case 'b':
                case 'B': DistoImageMapper__Env3d__ClipBox__SetShown(!DistoImageMapper__Env3d__ClipBox__State().Shown); break;
                case 'Escape':
                    DistoImageMapper__AppCore__Init__StopSquare('');
                    if (DistoImageMapper__Ui__MeasureTool__IsActive()) DistoImageMapper__AppCore__Init__ToggleMeasure();
                    DistoImageMapper__State__SetSelected(-1);
                    break;
                default:
            }
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Installing the App
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Register the Service Worker
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__RegisterServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('DistoImageMapper__Pwa__ServiceWorker__.js').catch(() => {
            // <-- Plain http away from localhost: the app runs, it just cannot install
        });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Install Buttons Open the Shared Vale Install Card
    // ------------------------------------------------------------
    // Reference: /AppAssets__CommonApplicationAssets/Shared__AppInstall/ValeShared__AppInstall__.js
    // That script shows its own card a few seconds after the page opens, and holds the
    // browser's install offer. These buttons are the way back to it after Not now.
    function DistoImageMapper__AppCore__Init__BindInstall() {
        const installer  =  window.ValeAppInstall;
        if (!installer) return;                                              // <-- Shared script not served here: no buttons, and the app runs on

        const buttons  =  Array.from(document.querySelectorAll('[data-install-app]'));
        const kind     =  installer.Detect().kind;
        const canOffer =  kind !== 'installed' && kind !== 'none';

        buttons.forEach(button => {
            button.hidden  =  !canOffer;
            button.addEventListener('click', () => installer.Show());
        });

        window.addEventListener('appinstalled', () => buttons.forEach(button => { button.hidden  =  true; }));

        if (canOffer && navigator.getInstalledRelatedApps) {                 // <-- Installed already and open in a tab: nothing to offer
            navigator.getInstalledRelatedApps().then(apps => {
                if (apps.length) buttons.forEach(button => { button.hidden  =  true; });
            }).catch(() => {});
        }
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | After a Push, Reload by Itself Only When Nothing Is Lost
    // ------------------------------------------------------------
    // Reference: /AppAssets__CommonApplicationAssets/Shared__AppUpdate/ValeShared__AppUpdate__.js
    // An open survey's files were chosen by hand, so a reload would close it: the shared bar asks first instead.
    function DistoImageMapper__AppCore__Init__BindAppUpdate() {
        window.ValeAppUpdate__CanReload  =  () => !DistoImageMapper__State.Survey;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Boot
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Settings Before Anything Has Been Saved
    // ------------------------------------------------------------
    function DistoImageMapper__AppCore__Init__DefaultPrefs() {
        const cards   =  DistoImageMapper__Config__Section('Cards');
        const sheets  =  DistoImageMapper__Config__Section('Sheets');

        return {
            Arrangement        :  DistoImageMapper__Env3d__PhotoCards__Arrangements.OnPoint,
            SizeScale          :  cards.SizeScaleDefault,
            PhotoOpacity       :  cards.OpacityDefault,
            LiftPx             :  cards.LiftPx,
            FieldOfViewDegrees :  cards.FieldOfViewDegrees,
            PlanOffsetMm       :  sheets.PlanOffsetMm,
            ElevationOffsetMm  :  sheets.ElevationOffsetMm,
            Parallel           :  false,
            Layers             :  { Photos : true, Plan : true, Elevation : true, Chain3d : true, Projectors : true, Sight : true, Axes : true }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Boot the App
    // ------------------------------------------------------------
    async function DistoImageMapper__AppCore__Init__Boot() {
        Ui.Stage             =  document.getElementById('DistoImageMapper__Stage');
        Ui.Viewport          =  document.getElementById('DistoImageMapper__Viewport');
        Ui.Status            =  document.getElementById('DistoImageMapper__Status');
        Ui.Tooltip           =  document.getElementById('DistoImageMapper__Tooltip');
        Ui.TooltipTitle      =  document.getElementById('DistoImageMapper__Tooltip__Title');
        Ui.TooltipDetail     =  document.getElementById('DistoImageMapper__Tooltip__Detail');
        Ui.MeasureLabel      =  document.getElementById('DistoImageMapper__MeasureLabel');
        Ui.MeasureHint       =  document.getElementById('DistoImageMapper__MeasureHint');
        Ui.MeasureButton     =  document.getElementById('DistoImageMapper__Toolbar__Measure');
        Ui.ZoomGroup         =  document.getElementById('DistoImageMapper__Toolbar__ZoomGroup');
        Ui.ViewButtons       =  Array.from(document.querySelectorAll('[data-view]'));
        Ui.TripodButton  =  Ui.ViewButtons.find(button => button.dataset.view === VIEWS.Tripod);
        Ui.BoxHint       =  document.getElementById('DistoImageMapper__BoxHint');

        try {
            await DistoImageMapper__Config__Load();
        } catch (error) {
            document.getElementById('DistoImageMapper__Landing__Error').hidden       =  false;
            document.getElementById('DistoImageMapper__Landing__Error').textContent  =  `The app could not start: ${error.message}`;
            return;
        }

        await Promise.allSettled([                                           // <-- Paper and card text is drawn to canvases, so the fonts come before any way in
            document.fonts.load('400 40px "Open Sans"'),
            document.fonts.load('600 40px "Open Sans"')
        ]);

        DistoImageMapper__UserConfig__Load(DistoImageMapper__Config__Section('Identity').AppVersion);   // <-- The one settings file, before anything reads a setting
        DistoImageMapper__State__LoadPrefs(DistoImageMapper__AppCore__Init__DefaultPrefs());
        DistoImageMapper__AppCore__Init__ForgetAsShot();                     // <-- A browser may have saved it from an earlier visit
        DistoImageMapper__State__On('FocusChanged', DistoImageMapper__AppCore__Init__ApplyFocus);

        DistoImageMapper__Ui__LandingScreen__Mount(DistoImageMapper__AppCore__Init__HandleSessions, DistoImageMapper__AppCore__Init__ReportProblem);

        DistoImageMapper__Ui__ControlPanel__Mount({
            OnOpenAnother     :  DistoImageMapper__Ui__LandingScreen__ChooseFolder,
            OnLayersChanged   :  DistoImageMapper__AppCore__Init__ApplyLayers,
            OnPhotosChanged   :  DistoImageMapper__AppCore__Init__ApplyPhotos,
            OnSheetsChanged   :  DistoImageMapper__AppCore__Init__ApplySheets,
            OnParallelChanged :  () => { if (CurrentView === VIEWS.ThreeD) DistoImageMapper__AppCore__Init__GoToView(VIEWS.ThreeD); }
        });

        DistoImageMapper__Ui__ClipBoxPanel__Mount({
            OnViewFace :  key => DistoImageMapper__AppCore__Init__GoToView(VIEWS.Face, key),
            OnSquare   :  DistoImageMapper__AppCore__Init__StartSquare,
            OnFit      :  () => {
                if (DistoImageMapper__State.Survey) DistoImageMapper__Env3d__ClipBox__Fit(DistoImageMapper__State.Survey.Points.map(point => point.PositionMm));
            },
            OnExport   :  () => {
                if (!DistoImageMapper__State.Survey) return;
                DistoImageMapper__Ui__ExportDialog__Open({
                    Survey             :  DistoImageMapper__State.Survey,
                    Mask               :  KeptMask,
                    FieldOfViewDegrees :  DistoImageMapper__State.Prefs.FieldOfViewDegrees,
                    OnDone             :  text => DistoImageMapper__AppCore__Init__Status(`Exported ${text}`, STATUS_PROBLEM_MS)
                });
            }
        });
        DistoImageMapper__Ui__ExportDialog__Mount();
        DistoImageMapper__Env3d__ClipBox__OnChange((kind, isLive) => {
            if (!DistoImageMapper__State.Survey) return;
            if (['Geometry', 'Mode', 'Shown', 'View'].includes(kind)) DistoImageMapper__AppCore__Init__ApplyClip(isLive);   // <-- Shown and View too: in All points they decide what is kept
            if (!isLive) DistoImageMapper__Ui__ClipBoxPanel__Show();
        });

        DistoImageMapper__Ui__Filmstrip__Mount(document.getElementById('DistoImageMapper__Filmstrip'));

        DistoImageMapper__Ui__Lightbox__Mount({
            OnClose    :  DistoImageMapper__AppCore__Init__CloseLightbox,
            OnShowIn3d :  index => {
                DistoImageMapper__Ui__Lightbox__Close(null);
                DistoImageMapper__AppCore__Init__FlyToPoint(index);
            }
        });

        DistoImageMapper__AppCore__Init__BindToolbar();
        DistoImageMapper__AppCore__Init__BindKeyboard();
        DistoImageMapper__AppCore__Init__BindInstall();
        DistoImageMapper__AppCore__Init__BindAppUpdate();
        DistoImageMapper__AppCore__Init__RegisterServiceWorker();

        window.DistoImageMapper__App  =  {
            LoadEntries : (entries, rootName = '') => DistoImageMapper__AppCore__Init__HandleSessions(
                DistoImageMapper__Intake__FolderReader__GroupIntoSessions(entries, rootName)
            ),
            LoadFiles   : (files, rootName = '') => window.DistoImageMapper__App.LoadEntries(files.map(file => ({ Path : file.name, File : file })), rootName)
        };
    }
    // ------------------------------------------------------------

    DistoImageMapper__AppCore__Init__Boot();

// endregion -------------------------------------------------------------------
