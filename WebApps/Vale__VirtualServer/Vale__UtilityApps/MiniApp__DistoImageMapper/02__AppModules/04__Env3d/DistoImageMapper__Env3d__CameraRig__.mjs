/* =============================================================================
   DISTO IMAGE MAPPER - 3D ENVIRONMENT | CAMERA RIG
   =============================================================================

   FILE       : DistoImageMapper__Env3d__CameraRig__.mjs
   NAMESPACE  : DistoImageMapper
   MODULE     : Env3d - CameraRig
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Perspective and parallel cameras, orbit controls, the four views
                and the flights between them
   CREATED    : 05-Nov-2026

   DESCRIPTION:
   - 3D View: looks into the corner the two sheets make. Plan and Elevation: true
     parallel views, in which the survey line lies exactly on its drawing, which is
     the alignment seen with the eye.
   - Tripod: stands where the DISTO stood and turns on the spot, as the
     Pointfinder did. The wheel closes the lens rather than moving the eye.
   - A flight is one state: aim point, two angles, the height of the view at the aim
     point, and the lens. The eye follows from those, so nothing can swing through
     the model on the way.

   ---------------------------------------------------------------------------

   INTO A PARALLEL VIEW WITHOUT A JUMP:
   Flights always use the perspective camera. Going to a parallel view it closes the
   lens to NarrowFieldOfViewDegrees while backing away at the same rate: a dolly
   zoom, so the picture at the aim point keeps its size. At that lens perspective
   has all but gone, so the swap to the orthographic camera at the end cannot be
   seen. Leaving a parallel view runs the same thing the other way.

   ============================================================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { DistoImageMapper__Config__Section } from '../01__AppCore/DistoImageMapper__AppCore__Config__.mjs';
import { DistoImageMapper__Coords__MmToWorld } from './DistoImageMapper__Env3d__Coordinates__.mjs';
import {
    DistoImageMapper__Env3d__SceneManager__AddFrameTask,
    DistoImageMapper__Env3d__SceneManager__Canvas,
    DistoImageMapper__Env3d__SceneManager__Invalidate,
    DistoImageMapper__Env3d__SceneManager__OnResize,
    DistoImageMapper__Env3d__SceneManager__SetCamera,
    DistoImageMapper__Env3d__SceneManager__ViewportSize
} from './DistoImageMapper__Env3d__SceneManager__.mjs';

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Geometry Guards
    // ------------------------------------------------------------
    const DEG_TO_RAD       =  Math.PI / 180;
    const PLAN_PHI         =  1e-5;                                          // <-- Straight down, with the azimuth still defined so north stays up
    const ELEVATION_PHI    =  Math.PI / 2;
    const LOOK_UP_GUARD    =  0.999;
    const FIT_PASSES       =  4;                                             // <-- Enough for the fit's picture to stop moving
    // ------------------------------------------------------------


    // MODULE VARIABLES | Cameras and Controls
    // ------------------------------------------------------------
    let Perspective      =  null;
    let Parallel         =  null;
    let Active           =  null;
    let Controls         =  null;
    let Flight           =  null;
    let InTripodView =  false;
    let InBelowView      =  false;                                           // <-- Under a clipping box, looking up at its Bottom
    let OnUserMove       =  null;

    const ContentBoxes   =  { All : new THREE.Box3(), Plan : new THREE.Box3(), Elevation : new THREE.Box3() };
    const SceneCentre    =  new THREE.Vector3();
    let   SceneRadius    =  20;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Reading and Writing the View State
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Viewport's Aspect Ratio
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__Aspect() {
        const size  =  DistoImageMapper__Env3d__SceneManager__ViewportSize();
        return size.Width / size.Height;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Current View as a Flight State
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__ReadState() {
        const camera     =  DistoImageMapper__Config__Section('Camera');
        const target     =  Controls.target.clone();
        const spherical  =  new THREE.Spherical().setFromVector3(Active.position.clone().sub(target));
        const isParallel =  Active === Parallel;
        const lens       =  isParallel ? camera.NarrowFieldOfViewDegrees : Perspective.fov;
        const viewHeight =  isParallel
            ? (Parallel.top - Parallel.bottom) / Parallel.zoom
            : 2 * spherical.radius * Math.tan(lens * DEG_TO_RAD / 2);

        return { Target : target, Theta : spherical.theta, Phi : spherical.phi, ViewHeight : viewHeight, Lens : lens };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put the Perspective Camera in a Flight State
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__ApplyState(state) {
        const radius  =  state.ViewHeight / (2 * Math.tan(state.Lens * DEG_TO_RAD / 2));

        Perspective.fov     =  state.Lens;
        Perspective.aspect  =  DistoImageMapper__Env3d__CameraRig__Aspect();
        Perspective.position.setFromSpherical(new THREE.Spherical(radius, state.Phi, state.Theta)).add(state.Target);
        Perspective.lookAt(state.Target);
        Perspective.updateProjectionMatrix();
        Controls.target.copy(state.Target);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Make a Camera the Live One
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__SetActive(camera) {
        Active           =  camera;
        Controls.object  =  camera;
        DistoImageMapper__Env3d__SceneManager__SetCamera(camera);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Hand the View Over to the Orthographic Camera
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__EnterParallel(state) {
        const halfHeight  =  state.ViewHeight / 2;
        const aspect      =  DistoImageMapper__Env3d__CameraRig__Aspect();

        Parallel.top     =  halfHeight;
        Parallel.bottom  =  -halfHeight;
        Parallel.right   =  halfHeight * aspect;
        Parallel.left    =  -halfHeight * aspect;
        Parallel.zoom    =  1;
        Parallel.position.setFromSpherical(new THREE.Spherical(SceneRadius * 4 + 40, state.Phi, state.Theta)).add(state.Target);
        Parallel.lookAt(state.Target);
        Parallel.updateProjectionMatrix();

        DistoImageMapper__Env3d__CameraRig__SetActive(Parallel);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Keep the Depth Range Tight Around the Scene
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__UpdateClipping() {
        if (Active === Parallel) {
            const reach  =  Parallel.position.distanceTo(Controls.target) + SceneRadius * 4 + 60;
            if (Parallel.far !== reach) {
                Parallel.near  =  0.1;
                Parallel.far   =  reach;
                Parallel.updateProjectionMatrix();
            }
            return;
        }

        const distance  =  Perspective.position.distanceTo(SceneCentre);
        const near      =  Math.max(0.02, (distance - SceneRadius * 1.8) * 0.5);
        const far       =  distance + SceneRadius * 3 + 20;
        if (Perspective.near !== near || Perspective.far !== far) {
            Perspective.near  =  near;
            Perspective.far   =  far;
            Perspective.updateProjectionMatrix();
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Flights
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Ease In and Out
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__Ease(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Stop Any Orbit Inertia Left Over
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__FlushInertia() {
        Controls.enableDamping  =  false;
        Controls.update();
        Controls.enableDamping  =  true;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Set the Controls for Standing at the Tripod or Not
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__ConfigureControls() {
        const camera  =  DistoImageMapper__Config__Section('Camera');

        Controls.enablePan     =  !InTripodView;
        Controls.enableZoom    =  !InTripodView;
        Controls.zoomToCursor  =  !InTripodView;
        Controls.minDistance   =  InTripodView ? 0 : DistoImageMapper__Coords__MmToWorld(camera.MinimumDistanceMm);
        Controls.maxDistance   =  InTripodView ? Infinity : SceneRadius * 14 + 40;
        Controls.rotateSpeed   =  InTripodView ? -Perspective.fov / 360 : 1;  // <-- Negative and in step with the lens: the picture stays under the pointer
        Controls.maxPolarAngle =  InTripodView || InBelowView ? Math.PI : ELEVATION_PHI;   // <-- Level at the lowest: from under the plan its drawing reads mirrored
    }
    // ------------------------------------------------------------


    // FUNCTION | Start a Flight
    // ------------------------------------------------------------
    // goal: { Target, Theta, Phi, ViewHeight, Lens, IsParallel, IsTripod }
    function DistoImageMapper__Env3d__CameraRig__StartFlight(goal) {
        const camera  =  DistoImageMapper__Config__Section('Camera');

        DistoImageMapper__Env3d__CameraRig__FlushInertia();
        const from  =  DistoImageMapper__Env3d__CameraRig__ReadState();

        if (Active === Parallel) {                                           // <-- Same picture, on the camera flights use
            DistoImageMapper__Env3d__CameraRig__ApplyState(from);
            DistoImageMapper__Env3d__CameraRig__SetActive(Perspective);
        }

        let thetaGoal  =  goal.Theta;                                        // <-- The short way round
        while (thetaGoal - from.Theta >  Math.PI) thetaGoal -= Math.PI * 2;
        while (thetaGoal - from.Theta < -Math.PI) thetaGoal += Math.PI * 2;

        Flight  =  {
            From       :  from,
            Goal       :  { ...goal, Theta : thetaGoal, Lens : goal.IsParallel ? camera.NarrowFieldOfViewDegrees : goal.Lens },
            ElapsedMs  :  0,
            DurationMs :  camera.FlightMs
        };

        Controls.enabled  =  false;
        InTripodView  =  false;
        InBelowView       =  false;
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Advance the Flight
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__StepFlight(elapsedMs) {
        Flight.ElapsedMs += elapsedMs;

        const t     =  Math.min(Flight.ElapsedMs / Flight.DurationMs, 1);
        const eased =  DistoImageMapper__Env3d__CameraRig__Ease(t);
        const from  =  Flight.From;
        const goal  =  Flight.Goal;

        DistoImageMapper__Env3d__CameraRig__ApplyState({
            Target     :  from.Target.clone().lerp(goal.Target, eased),
            Theta      :  from.Theta + (goal.Theta - from.Theta) * eased,
            Phi        :  from.Phi + (goal.Phi - from.Phi) * eased,
            ViewHeight :  Math.exp(Math.log(from.ViewHeight) + (Math.log(goal.ViewHeight) - Math.log(from.ViewHeight)) * eased),
            Lens       :  from.Lens + (goal.Lens - from.Lens) * eased
        });

        if (t < 1) return;

        InTripodView  =  Boolean(goal.IsTripod);
        InBelowView       =  Boolean(goal.IsBelow);
        if (goal.IsParallel) DistoImageMapper__Env3d__CameraRig__EnterParallel(goal);

        Flight            =  null;
        Controls.enabled  =  true;
        DistoImageMapper__Env3d__CameraRig__ConfigureControls();
        Controls.update();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Framing
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Aim Point and View Height That Fit a Box From Two Angles
    // ------------------------------------------------------------
    // Parallel: the box's span across the view. Perspective: near corners loom, so the
    // eye settles over a few passes, centring the box's picture and then backing off
    // until the picture just fits. lensDegrees is null for a parallel view.
    function DistoImageMapper__Env3d__CameraRig__Fit(box, theta, phi, padding, lensDegrees) {
        const toEye   =  new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
        const worldUp =  Math.abs(toEye.y) <= LOOK_UP_GUARD ? new THREE.Vector3(0, 1, 0)
            : toEye.y > 0 ? new THREE.Vector3(-Math.sin(theta), 0, -Math.cos(theta))   // <-- Straight down: the screen's up as the controls turn it (north at theta 0)
            : new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));                  // <-- Straight up, from under a clipping box
        const right   =  new THREE.Vector3().crossVectors(worldUp, toEye).normalize();
        const up      =  new THREE.Vector3().crossVectors(toEye, right).normalize();
        const aspect  =  DistoImageMapper__Env3d__CameraRig__Aspect();

        const corners  =  [];                                                // <-- A box, or the points to frame (a clipping box's turned corners)
        if (Array.isArray(box)) {
            box.forEach(corner => corners.push(corner.clone()));
        } else {
            for (let i = 0; i < 8; i++) {
                corners.push(new THREE.Vector3(
                    i & 1 ? box.max.x : box.min.x,
                    i & 2 ? box.max.y : box.min.y,
                    i & 4 ? box.max.z : box.min.z
                ));
            }
        }

        const target    =  Array.isArray(box)
            ? corners.reduce((sum, corner) => sum.add(corner), new THREE.Vector3()).divideScalar(Math.max(corners.length, 1))
            : box.getCenter(new THREE.Vector3());
        const offset    =  new THREE.Vector3();
        let   minRight  =  Infinity, maxRight = -Infinity;
        let   minUp     =  Infinity, maxUp    = -Infinity;

        for (const corner of corners) {
            offset.copy(corner).sub(target);
            minRight  =  Math.min(minRight, offset.dot(right));
            maxRight  =  Math.max(maxRight, offset.dot(right));
            minUp     =  Math.min(minUp, offset.dot(up));
            maxUp     =  Math.max(maxUp, offset.dot(up));
        }
        target.addScaledVector(right, (minRight + maxRight) / 2).addScaledVector(up, (minUp + maxUp) / 2);

        if (lensDegrees === null) {
            const viewHeight  =  Math.max(maxUp - minUp, (maxRight - minRight) / aspect) * padding;
            return { Target : target, ViewHeight : Math.max(viewHeight, 0.5) };
        }

        const tanVertical    =  Math.tan(lensDegrees * DEG_TO_RAD / 2);
        const tanHorizontal  =  tanVertical * aspect;

        let distance  =  0;                                                  // <-- Far enough that every corner starts in front of the eye
        for (const corner of corners) {
            offset.copy(corner).sub(target);
            distance  =  Math.max(distance,
                offset.dot(toEye) + Math.abs(offset.dot(right)) / tanHorizontal,
                offset.dot(toEye) + Math.abs(offset.dot(up)) / tanVertical);
        }

        for (let pass = 0; pass < FIT_PASSES; pass++) {
            const eye  =  target.clone().addScaledVector(toEye, distance);
            let minX   =  Infinity, maxX = -Infinity;
            let minY   =  Infinity, maxY = -Infinity;

            for (const corner of corners) {
                offset.copy(corner).sub(eye);
                const depth  =  -offset.dot(toEye);
                minX  =  Math.min(minX, offset.dot(right) / depth);
                maxX  =  Math.max(maxX, offset.dot(right) / depth);
                minY  =  Math.min(minY, offset.dot(up) / depth);
                maxY  =  Math.max(maxY, offset.dot(up) / depth);
            }

            target.addScaledVector(right, (minX + maxX) / 2 * distance).addScaledVector(up, (minY + maxY) / 2 * distance);
            distance *= Math.max((maxX - minX) / 2 / tanHorizontal, (maxY - minY) / 2 / tanVertical);
        }

        return { Target : target, ViewHeight : Math.max(2 * distance * tanVertical * padding, 0.5) };
    }
    // ------------------------------------------------------------


    // FUNCTION | Tell the Rig What the Scene Holds
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__SetContentBoxes(allBox, planBox, elevationBox) {
        ContentBoxes.All.copy(allBox);
        ContentBoxes.Plan.copy(planBox);
        ContentBoxes.Elevation.copy(elevationBox);

        allBox.getCenter(SceneCentre);
        SceneRadius  =  Math.max(allBox.getSize(new THREE.Vector3()).length() / 2, 1);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The 3D View as a Flight Goal
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__GoalFor3dView(isParallel) {
        const camera  =  DistoImageMapper__Config__Section('Camera');
        const theta   =  camera.AzimuthDegrees * DEG_TO_RAD;
        const phi     =  (90 - camera.ElevationDegrees) * DEG_TO_RAD;
        const lens    =  camera.FieldOfViewDegrees;
        const fit     =  DistoImageMapper__Env3d__CameraRig__Fit(ContentBoxes.All, theta, phi, camera.FitPadding, isParallel ? null : lens);

        return { ...fit, Theta : theta, Phi : phi, Lens : lens, IsParallel : isParallel, IsTripod : false };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | A Straight-On Sheet View as a Flight Goal
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__GoalForSheet(box, phi) {
        const camera  =  DistoImageMapper__Config__Section('Camera');
        const fit     =  DistoImageMapper__Env3d__CameraRig__Fit(box, 0, phi, camera.FitPaddingSheet, null);

        return { ...fit, Theta : 0, Phi : phi, Lens : camera.FieldOfViewDegrees, IsParallel : true, IsTripod : false };
    }
    // ------------------------------------------------------------


    // FUNCTION | Fly to the 3D View
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__FlyTo3dView(isParallel) {
        DistoImageMapper__Env3d__CameraRig__StartFlight(DistoImageMapper__Env3d__CameraRig__GoalFor3dView(isParallel));
    }
    // ------------------------------------------------------------


    // FUNCTION | Fly Straight Down Onto the Plan
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__FlyToPlan() {
        DistoImageMapper__Env3d__CameraRig__StartFlight(DistoImageMapper__Env3d__CameraRig__GoalForSheet(ContentBoxes.Plan, PLAN_PHI));
    }
    // ------------------------------------------------------------


    // FUNCTION | Fly Straight On to the Elevation
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__FlyToElevation() {
        DistoImageMapper__Env3d__CameraRig__StartFlight(DistoImageMapper__Env3d__CameraRig__GoalForSheet(ContentBoxes.Elevation, ELEVATION_PHI));
    }
    // ------------------------------------------------------------


    // FUNCTION | Fly Straight On to a Face of the Clipping Box, From Outside
    // ------------------------------------------------------------
    // cornersWorld: the points to frame (the box's eight corners). toEyeWorld: the
    // face's outward normal. Straight down or up, azimuth turns the view so the box's
    // Front stays at the foot of the screen; from below, the controls may pass level.
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__FlyToFace(cornersWorld, toEyeWorld, azimuth) {
        const camera      =  DistoImageMapper__Config__Section('Camera');
        const toEye       =  toEyeWorld.clone().normalize();
        const isVertical  =  Math.abs(toEye.y) > LOOK_UP_GUARD;
        const theta       =  isVertical ? azimuth : Math.atan2(toEye.x, toEye.z);
        const phi         =  isVertical ? (toEye.y > 0 ? PLAN_PHI : Math.PI - PLAN_PHI) : Math.acos(THREE.MathUtils.clamp(toEye.y, -1, 1));
        const fit         =  DistoImageMapper__Env3d__CameraRig__Fit(cornersWorld, theta, phi, camera.FitPaddingSheet, null);
        DistoImageMapper__Env3d__CameraRig__StartFlight({
            ...fit, Theta : theta, Phi : phi, Lens : camera.FieldOfViewDegrees, IsParallel : true, IsTripod : false, IsBelow : toEye.y < -LOOK_UP_GUARD
        });
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Lens That Takes In Two Half Angles
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__LensFor(halfAcrossDegrees, halfUpDegrees) {
        const camera    =  DistoImageMapper__Config__Section('Camera');
        const tanAcross =  Math.tan(Math.min(halfAcrossDegrees, 80) * DEG_TO_RAD) / DistoImageMapper__Env3d__CameraRig__Aspect();
        const tanUp     =  Math.tan(Math.min(halfUpDegrees, 80) * DEG_TO_RAD);
        const lens      =  2 * Math.atan(Math.max(tanAcross, tanUp)) / DEG_TO_RAD;
        return THREE.MathUtils.clamp(lens, camera.TripodMinimumDegrees, camera.TripodFieldOfViewDegrees);
    }
    // ------------------------------------------------------------


    // FUNCTION | Fly to the Tripod and Look at What It Measured
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__FlyToTripod(tripodWorld, lookAtWorld, halfAcrossDegrees, halfUpDegrees) {
        const camera  =  DistoImageMapper__Config__Section('Camera');
        const radius  =  DistoImageMapper__Coords__MmToWorld(camera.TripodOrbitRadiusMm);
        const look    =  lookAtWorld.clone().sub(tripodWorld).normalize();

        const toEye   =  new THREE.Spherical().setFromVector3(look.clone().negate());
        const lens    =  DistoImageMapper__Env3d__CameraRig__LensFor(halfAcrossDegrees, halfUpDegrees);

        DistoImageMapper__Env3d__CameraRig__StartFlight({
            Target       :  tripodWorld.clone().addScaledVector(look, radius),
            Theta        :  toEye.theta,
            Phi          :  toEye.phi,
            ViewHeight   :  2 * radius * Math.tan(lens * DEG_TO_RAD / 2),
            Lens         :  lens,
            IsParallel   :  false,
            IsTripod :  true
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Fly to a Point, Keeping the Direction of View
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__FlyToPoint(pointWorld, tripodWorld) {
        const camera  =  DistoImageMapper__Config__Section('Camera');

        if (InTripodView && tripodWorld) {                           // <-- At the tripod, turn to it rather than leave
            const lensBefore  =  Perspective.fov;
            DistoImageMapper__Env3d__CameraRig__FlyToTripod(tripodWorld, pointWorld, 0, 0);
            Flight.Goal.Lens        =  lensBefore;
            Flight.Goal.ViewHeight  =  2 * DistoImageMapper__Coords__MmToWorld(camera.TripodOrbitRadiusMm) * Math.tan(lensBefore * DEG_TO_RAD / 2);
            return;
        }

        const state       =  DistoImageMapper__Env3d__CameraRig__ReadState();
        const isParallel  =  Active === Parallel;
        DistoImageMapper__Env3d__CameraRig__StartFlight({
            Target       :  pointWorld.clone(),
            Theta        :  state.Theta,
            Phi          :  state.Phi,
            ViewHeight   :  Math.min(state.ViewHeight, DistoImageMapper__Coords__MmToWorld(camera.PointViewHeightMm)),
            Lens         :  isParallel ? camera.FieldOfViewDegrees : state.Lens,
            IsParallel   :  isParallel,
            IsTripod :  false
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Jump Straight to the 3D View (First Sight of a New Survey)
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__JumpTo3dView(isParallel) {
        const goal  =  DistoImageMapper__Env3d__CameraRig__GoalFor3dView(isParallel);

        Flight            =  null;
        InTripodView  =  false;
        InBelowView       =  false;
        Controls.enabled  =  true;

        DistoImageMapper__Env3d__CameraRig__SetActive(Perspective);
        DistoImageMapper__Env3d__CameraRig__ApplyState({ ...goal, Lens : isParallel ? DistoImageMapper__Config__Section('Camera').NarrowFieldOfViewDegrees : goal.Lens });
        if (isParallel) DistoImageMapper__Env3d__CameraRig__EnterParallel(goal);

        DistoImageMapper__Env3d__CameraRig__ConfigureControls();
        Controls.update();
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Lens at the Tripod
// -----------------------------------------------------------------------------

    // FUNCTION | Close or Open the Lens While Standing at the Tripod
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__ZoomTripod(factor) {
        if (!InTripodView) return;

        const camera     =  DistoImageMapper__Config__Section('Camera');
        Perspective.fov  =  THREE.MathUtils.clamp(Perspective.fov * factor, camera.TripodMinimumDegrees, camera.TripodMaximumDegrees);
        Perspective.updateProjectionMatrix();

        DistoImageMapper__Env3d__CameraRig__ConfigureControls();
        DistoImageMapper__Env3d__SceneManager__Invalidate();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | The Wheel at the Tripod
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__HandleWheel(event) {
        if (!InTripodView) return;
        event.preventDefault();
        DistoImageMapper__Env3d__CameraRig__ZoomTripod(event.deltaY > 0 ? 1.1 : 1 / 1.1);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mounting and Frame Task
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Follow the Viewport Size
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__HandleResize(width, height) {
        const aspect  =  width / height;

        Perspective.aspect  =  aspect;
        Perspective.updateProjectionMatrix();

        Parallel.left   =  Parallel.bottom * aspect;
        Parallel.right  =  Parallel.top * aspect;
        Parallel.updateProjectionMatrix();
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Each Frame: Move the Camera
    // ------------------------------------------------------------
    function DistoImageMapper__Env3d__CameraRig__FrameTask(elapsedMs) {
        let moving  =  false;

        if (Flight) {
            DistoImageMapper__Env3d__CameraRig__StepFlight(elapsedMs);
            moving  =  true;
        } else {
            moving  =  Controls.update();                                    // <-- Damping keeps this true until the orbit has settled
        }

        DistoImageMapper__Env3d__CameraRig__UpdateClipping();
        Active.updateMatrixWorld();
        return moving;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create the Cameras and Controls
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__Mount() {
        const camera  =  DistoImageMapper__Config__Section('Camera');
        const canvas  =  DistoImageMapper__Env3d__SceneManager__Canvas();
        const aspect  =  DistoImageMapper__Env3d__CameraRig__Aspect();

        Perspective  =  new THREE.PerspectiveCamera(camera.FieldOfViewDegrees, aspect, 0.05, 2000);
        Parallel     =  new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 2000);
        Active       =  Perspective;

        Controls  =  new OrbitControls(Perspective, canvas);
        Controls.enableDamping  =  true;
        Controls.dampingFactor  =  camera.DampingFactor;
        Controls.zoomToCursor   =  true;
        Controls.addEventListener('change', DistoImageMapper__Env3d__SceneManager__Invalidate);
        Controls.addEventListener('start', () => { if (OnUserMove) OnUserMove(); });

        canvas.addEventListener('wheel', DistoImageMapper__Env3d__CameraRig__HandleWheel, { passive : false });

        DistoImageMapper__Env3d__SceneManager__SetCamera(Perspective);
        DistoImageMapper__Env3d__SceneManager__OnResize(DistoImageMapper__Env3d__CameraRig__HandleResize);
        DistoImageMapper__Env3d__SceneManager__AddFrameTask(DistoImageMapper__Env3d__CameraRig__FrameTask);
    }
    // ------------------------------------------------------------


    // FUNCTION | Be Told When the User Takes the Camera
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__OnUserMove(callback) {
        OnUserMove  =  callback;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Access
// -----------------------------------------------------------------------------

    // FUNCTION | The Camera in Use
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__ActiveCamera() {
        return Active;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is the Eye at the Tripod
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__IsAtTripod() {
        return InTripodView;
    }
    // ------------------------------------------------------------


    // FUNCTION | Screen Pixels per Metre at a Depth From the Eye
    // ------------------------------------------------------------
    export function DistoImageMapper__Env3d__CameraRig__PixelsPerMetre(depth) {
        const height  =  DistoImageMapper__Env3d__SceneManager__ViewportSize().Height;
        if (Active === Parallel) return height / ((Parallel.top - Parallel.bottom) / Parallel.zoom);
        return height / (2 * Math.max(depth, 0.001) * Math.tan(Perspective.fov * DEG_TO_RAD / 2));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
