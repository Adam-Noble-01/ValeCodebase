// =============================================================================
// VALEVISION3D - PRESENTATION MODE - CAMERA SCENE TRANSITION
// =============================================================================
//
// FILE       : Na__PresentationMode__Camera__SceneTransition.js
// NAMESPACE  : Na__PresentationMode
// MODULE     : PresentationMode - Camera Scene Transition
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Capture, build, apply and animate the camera between saved
//              Presentation Mode scenes using the existing project.json format
// CREATED    : 11-Jun-2026
//
// DESCRIPTION:
// - Reuses the existing Na__UiFeature__ApplyCameraConfig format and unit
//   conversion helpers (mm ÷ 1000) to stay in sync with all other camera
//   systems.
// - CaptureCurrentSceneState reads the live camera/controls into a scene-
//   compatible JSON structure (integer mm positions, 4dp rotation/FOV).
// - ApplySceneCameraState performs an instant snap to the saved values —
//   identical approach to Reset View. Its orbit-target snap is optional
//   (options.applyOrbitTarget) so single-scene SketchUp boot framing can keep
//   an externally-resolved orbit target instead of the scene's camera.target.
// - AnimateToScene interpolates position (lerp), orbit target (lerp), FOV
//   (lerp) and orientation (quaternion slerp) per-frame using requestAnima-
//   tionFrame, driven by Na__RenderLoop__RequestActiveRender so the render
//   loop is active only while transitioning.
// - Easing functions: linear, easeInOutQuad, easeInOutCubic (default).
// - Any new AnimateToScene call cancels an in-flight transition before
//   starting the new one.
// - FOV is the authoritative runtime projection value; LensMm in scene data
//   is metadata only and is not applied to the camera.
//
// INTEGRATION:
// - Imported by Na__PresentationMode__UI__SceneCarousel.js (clicks, play).
// - Camera and controls references are passed in at call time from index.html
//   (same pattern as Na__UiFeature__ApplyCameraConfig and Reset View).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Jun-2026 - Version 1.0.0
// - Initial implementation for Presentation Mode system.
//
// 01-Jul-2026 - Version 1.1.0
// - ApplySceneCameraState and AnimateToScene now call
//   Na__ModelToggle__ApplySceneLayerVisibility with the scene's
//   PresentationMode__Scene__ModelLayerVisibility, so tag-driven model part
//   toggles (Existing Building / Design Proposal / Site Boundaries /
//   Landscape) switch automatically per tour scene. Applied instantly (not
//   animated) at the start of a transition.
//
// 09-Jul-2026 - Version 1.2.0
// - ApplySceneCameraState gains an optional options.applyOrbitTarget flag
//   (default true, all existing callers unaffected). When false, camera
//   position/rotation/FOV still snap but controls.target is left as-is;
//   controls.update() still runs to resync internal state against the new
//   camera position. Enables Na__AppFlow__LoadingSequence to keep the
//   OrbitHelperCube-resolved orbit target for single/zero-scene projects.
//
// 10-Jul-2026 - Version 1.3.0
// - Reverted a short-lived AnimateToScene options.applyOrbitTarget flag. That
//   approach (leave controls.target on the cube during scene switches) framed
//   the CUBE instead of the shot, because OrbitControls.update() runs
//   camera.lookAt(target) every frame — so the camera aimed at the cube and
//   the SketchUp look direction was discarded. Scene switches now ALWAYS
//   animate to the scene's own camera.target (exact SketchUp framing); the
//   cube only becomes the orbit pivot on the first rotation afterwards, via
//   Na__Navmode__OrbitPivot__InteractionSwap.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Unit Conversion Helpers
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits, Na__Math__ConvertUnitsToMm } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import {
        Na__RenderLoop__RequestActiveRender,
        Na__RenderLoop__StopActiveRender,
        Na__RenderLoop__RequestRender
    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Model Toggle Controls (Per-Scene Layer Visibility)
    // @delegate: ../26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js
    // ------------------------------------------------------------
    import { Na__ModelToggle__ApplySceneLayerVisibility } from '../26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Render Active Reason Tag
    // ------------------------------------------------------------
    const Na__PresentationMode__RENDER_REASON    = 'presentation-transition';  // <-- Reason tag for active render loop
    const Na__PresentationMode__DEFAULT_DURATION = 1800;                       // <-- Default transition duration ms
    const Na__PresentationMode__DEFAULT_EASING   = 'easeInOutCubic';          // <-- Default easing function name
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | In-Flight Transition State
    // ------------------------------------------------------------
    let Na__PresentationMode__TransitionId        = 0;      // <-- Incremented per transition; used to cancel stale ones
    let Na__PresentationMode__IsTransitioning     = false;  // <-- Guards against overlapping transitions
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Easing Functions
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Linear Easing
    // ------------------------------------------------------------
    function Na__PresentationMode__Camera__EaseLinear(t) {
        return t; // <-- No easing, constant velocity
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Ease In-Out Quadratic
    // ------------------------------------------------------------
    function Na__PresentationMode__Camera__EaseInOutQuad(t) {
        return t < 0.5
            ? 2 * t * t                                     // <-- Ease in (accelerate)
            : 1 - Math.pow(-2 * t + 2, 2) / 2;             // <-- Ease out (decelerate)
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Ease In-Out Cubic
    // ------------------------------------------------------------
    function Na__PresentationMode__Camera__EaseInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t                                 // <-- Ease in (accelerate)
            : 1 - Math.pow(-2 * t + 2, 3) / 2;             // <-- Ease out (decelerate)
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Resolve Easing Function by Name String
    // ------------------------------------------------------------
    function Na__PresentationMode__Camera__ResolveEasing(easingName) {
        switch (easingName) {
            case 'linear':          return Na__PresentationMode__Camera__EaseLinear;
            case 'easeInOutQuad':   return Na__PresentationMode__Camera__EaseInOutQuad;
            case 'easeInOutCubic':
            default:                return Na__PresentationMode__Camera__EaseInOutCubic; // <-- Default fallback
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene State Capture and Build
// -----------------------------------------------------------------------------

    // FUNCTION | Capture Current Camera State as a Scene-Compatible Object
    // ------------------------------------------------------------
    // Returns an object matching the PresentationMode__Scene__CameraPosition
    // and PresentationMode__Scene__OrbitHelperCubePosition JSON format so it
    // can be written directly into project.json by the scene editor.
    // ------------------------------------------------------------
    function Na__PresentationMode__Camera__CaptureCurrentSceneState(camera, controls) {
        if (!camera) return null;

        const posX = Math.round(Na__Math__ConvertUnitsToMm(camera.position.x));  // <-- Convert to integer mm
        const posY = Math.round(Na__Math__ConvertUnitsToMm(camera.position.y));
        const posZ = Math.round(Na__Math__ConvertUnitsToMm(camera.position.z));

        const rotX = parseFloat(camera.rotation.x.toFixed(4));                   // <-- 4dp radians
        const rotY = parseFloat(camera.rotation.y.toFixed(4));
        const rotZ = parseFloat(camera.rotation.z.toFixed(4));

        const fov  = parseFloat(camera.fov.toFixed(4));                          // <-- 4dp degrees

        const targetX = controls ? Math.round(Na__Math__ConvertUnitsToMm(controls.target.x)) : 0;
        const targetY = controls ? Math.round(Na__Math__ConvertUnitsToMm(controls.target.y)) : 0;
        const targetZ = controls ? Math.round(Na__Math__ConvertUnitsToMm(controls.target.z)) : 0;

        return {
            Camera__DefaultPos      : {
                Camera__DefaultPos__PosX : posX,
                Camera__DefaultPos__PosY : posY,
                Camera__DefaultPos__PosZ : posZ
            },
            Camera__DefaultRotation : {
                Camera__DefaultRotation__RotX : rotX,
                Camera__DefaultRotation__RotY : rotY,
                Camera__DefaultRotation__RotZ : rotZ
            },
            Camera__DefaultMisc     : {
                Camera__DefaultMisc__Fov : fov
            }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build Full Scene Camera JSON Blocks (for project.json insertion)
    // ------------------------------------------------------------
    // Returns { cameraPosition: {...}, orbitHelperCubePosition: {...} }
    // matching the PresentationMode scene schema exactly.
    // ------------------------------------------------------------
    function Na__PresentationMode__Camera__BuildSceneCameraJson(camera, controls) {
        const cameraPosition = Na__PresentationMode__Camera__CaptureCurrentSceneState(camera, controls);
        if (!cameraPosition) return null;

        const targetX = controls ? Math.round(Na__Math__ConvertUnitsToMm(controls.target.x)) : 0;
        const targetY = controls ? Math.round(Na__Math__ConvertUnitsToMm(controls.target.y)) : 0;
        const targetZ = controls ? Math.round(Na__Math__ConvertUnitsToMm(controls.target.z)) : 0;

        const orbitHelperCubePosition = {
            OrbitHelperCube__Position__Description : 'Scene orbit target position. Values are integer millimetres; convert to 3D units in code.',
            OrbitHelperCube__Position__PosX        : targetX,
            OrbitHelperCube__Position__PosY        : targetY,
            OrbitHelperCube__Position__PosZ        : targetZ
        };

        return { cameraPosition, orbitHelperCubePosition };  // <-- Two-block return ready for scene JSON
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene State Application (Instant)
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Extract Runtime Camera Values from Scene CameraPosition Block
    // ------------------------------------------------------------
    function Na__PresentationMode__Camera__ParseSceneToRuntimeValues(scene) {
        const cam    = scene.PresentationMode__Scene__CameraPosition;
        const orbit  = scene.PresentationMode__Scene__OrbitHelperCubePosition;

        if (!cam) return null;

        const pos = cam.Camera__DefaultPos        || {};
        const rot = cam.Camera__DefaultRotation   || {};
        const misc = cam.Camera__DefaultMisc      || {};

        return {
            position : {
                x : Na__Math__ConvertMmToUnits(pos.Camera__DefaultPos__PosX  || 0),
                y : Na__Math__ConvertMmToUnits(pos.Camera__DefaultPos__PosY  || 0),
                z : Na__Math__ConvertMmToUnits(pos.Camera__DefaultPos__PosZ  || 0)
            },
            rotation : {
                x : Number.isFinite(rot.Camera__DefaultRotation__RotX) ? rot.Camera__DefaultRotation__RotX : 0,
                y : Number.isFinite(rot.Camera__DefaultRotation__RotY) ? rot.Camera__DefaultRotation__RotY : 0,
                z : Number.isFinite(rot.Camera__DefaultRotation__RotZ) ? rot.Camera__DefaultRotation__RotZ : 0
            },
            fov : Number.isFinite(misc.Camera__DefaultMisc__Fov) ? misc.Camera__DefaultMisc__Fov : null,
            target : orbit ? {
                x : Na__Math__ConvertMmToUnits(orbit.OrbitHelperCube__Position__PosX || 0),
                y : Na__Math__ConvertMmToUnits(orbit.OrbitHelperCube__Position__PosY || 0),
                z : Na__Math__ConvertMmToUnits(orbit.OrbitHelperCube__Position__PosZ || 0)
            } : null
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Instantly Apply Scene Camera State (no animation)
    // ------------------------------------------------------------
    // Snaps position, rotation, FOV AND the scene's own camera.target, so the
    // view frames the exact SketchUp shot (OrbitControls runs lookAt(target)
    // every update, so the target must be the shot's look-at point for the
    // framing to be correct). Re-pivoting the orbit onto the OrbitHelperCube is
    // handled on the first rotation afterwards by Na__Navmode__OrbitPivot__
    // InteractionSwap — the caller arms it after this returns.
    //
    // options.applyOrbitTarget {boolean} - default true; leaving it true is
    // correct for all current callers. (Retained for the rare caller that wants
    // to snap pose only and keep the live controls.target as-is.)
    // ------------------------------------------------------------
    function Na__PresentationMode__Camera__ApplySceneCameraState(camera, controls, scene, options = {}) {
        if (!camera || !scene) return;

        const applyOrbitTarget = options.applyOrbitTarget !== false;         // <-- Default true; all existing call sites unaffected

        const values = Na__PresentationMode__Camera__ParseSceneToRuntimeValues(scene);
        if (!values) return;

        camera.position.set(values.position.x, values.position.y, values.position.z);  // <-- Snap position
        camera.rotation.set(values.rotation.x, values.rotation.y, values.rotation.z);  // <-- Snap rotation

        if (values.fov !== null) {
            camera.fov = values.fov;
            camera.updateProjectionMatrix();                                             // <-- Rebuild projection after FOV change
        }

        if (controls) {
            if (applyOrbitTarget && values.target) {
                controls.target.set(values.target.x, values.target.y, values.target.z);  // <-- Snap orbit target
            }
            controls.update();                                                           // <-- Resync controls against new camera position either way
        }

        Na__ModelToggle__ApplySceneLayerVisibility(scene.PresentationMode__Scene__ModelLayerVisibility);  // <-- Sync tag-driven model toggles (no-op before groups load)

        Na__PresentationMode__Camera__DispatchSceneActivated(scene);                     // <-- Per-scene bindings (e.g. cross sections) follow the scene

        Na__RenderLoop__RequestRender();                                                 // <-- Single frame redraw
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Announce That a Saved Scene Is Being Applied
    // ------------------------------------------------------------
    // Fired by BOTH the instant snap and the animated transition (the
    // animated path never routes through the snap except on parse failure,
    // so each activation dispatches exactly once). Listeners restore
    // per-scene state — e.g. the cross-section system's scene bindings —
    // without this module importing them.
    // ------------------------------------------------------------
    function Na__PresentationMode__Camera__DispatchSceneActivated(scene) {
        window.dispatchEvent(new CustomEvent('na-pm-scene-activated', {
            detail: {
                sceneName : scene.PresentationMode__Scene__Name || null,
                sceneId   : scene.PresentationMode__Scene__Id   || null
            }
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scene Camera Animation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Cancel Any Currently Running Transition
    // ------------------------------------------------------------
    function Na__PresentationMode__Camera__CancelCurrentTransition() {
        Na__PresentationMode__TransitionId++;                                // <-- Invalidates any running rAF loop
        if (Na__PresentationMode__IsTransitioning) {
            Na__RenderLoop__StopActiveRender(Na__PresentationMode__RENDER_REASON);
            Na__PresentationMode__IsTransitioning = false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Animate Camera to a Saved Scene
    // ------------------------------------------------------------
    // Interpolates camera position, orientation (quaternion slerp), FOV and
    // orbit target from the current live values to the saved scene values.
    // durationMs and easing are taken from the scene's JSON fields unless
    // overridden explicitly via the options object.
    //
    // options {object}:
    //   durationMs {number}  - override transition duration
    //   easing     {string}  - override easing function name
    //   onComplete {function}- callback invoked when transition finishes
    // ------------------------------------------------------------
    // The scene's own orbit target is always animated to (exact SketchUp
    // framing at rest). Re-pivoting the orbit onto the OrbitHelperCube is
    // handled separately, on the first rotation after the transition, by
    // Na__Navmode__OrbitPivot__InteractionSwap — NOT by suppressing the target
    // here (suppressing it would leave OrbitControls' per-frame lookAt aimed at
    // the previous target and mis-frame the shot).
    // ------------------------------------------------------------
    function Na__PresentationMode__Camera__AnimateToScene(camera, controls, scene, options) {
        if (!camera || !scene) return;

        const values = Na__PresentationMode__Camera__ParseSceneToRuntimeValues(scene);
        if (!values) {
            Na__PresentationMode__Camera__ApplySceneCameraState(camera, controls, scene); // <-- Instant fallback if parse fails
            return;
        }

        // RESOLVE TRANSITION PARAMETERS
        const opts        = options || {};
        const rawDuration = opts.durationMs
            ?? scene.PresentationMode__Scene__TransitionTimeToNextSceneMs
            ?? Na__PresentationMode__DEFAULT_DURATION;
        const durationMs  = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : Na__PresentationMode__DEFAULT_DURATION;
        const easingName  = opts.easing ?? scene.PresentationMode__Scene__TransitionEasing ?? Na__PresentationMode__DEFAULT_EASING;
        const easeFn      = Na__PresentationMode__Camera__ResolveEasing(easingName);
        const onComplete  = typeof opts.onComplete === 'function' ? opts.onComplete : null;

        // CANCEL ANY IN-FLIGHT TRANSITION FIRST
        Na__PresentationMode__Camera__CancelCurrentTransition();
        const myTransitionId = Na__PresentationMode__TransitionId;            // <-- Snapshot id for this transition

        // SYNC TAG-DRIVEN MODEL TOGGLES IMMEDIATELY (not animated — an instant cut reads better than a mid-flight pop-out)
        Na__ModelToggle__ApplySceneLayerVisibility(scene.PresentationMode__Scene__ModelLayerVisibility);

        // PER-SCENE BINDINGS | Cross sections etc. swap instantly, like model toggles
        Na__PresentationMode__Camera__DispatchSceneActivated(scene);

        // CAPTURE START STATE FROM LIVE CAMERA
        const startPos     = camera.position.clone();
        const startTarget  = controls ? controls.target.clone() : new THREE.Vector3();
        const startFov     = camera.fov;

        // BUILD START QUATERNION from current rotation for slerp
        const startQuat    = new THREE.Quaternion().setFromEuler(camera.rotation);

        // BUILD END QUATERNION from target rotation
        const endRotation  = new THREE.Euler(values.rotation.x, values.rotation.y, values.rotation.z, camera.rotation.order);
        const endQuat      = new THREE.Quaternion().setFromEuler(endRotation);

        const endPos       = new THREE.Vector3(values.position.x, values.position.y, values.position.z);
        const endTarget    = values.target ? new THREE.Vector3(values.target.x, values.target.y, values.target.z) : startTarget.clone();
        const endFov       = values.fov !== null ? values.fov : startFov;

        const tempQuat     = new THREE.Quaternion();                          // <-- Reused scratch quaternion

        // BEGIN ACTIVE RENDERING
        Na__PresentationMode__IsTransitioning = true;
        Na__RenderLoop__RequestActiveRender(Na__PresentationMode__RENDER_REASON);

        const startTime    = performance.now();

        // PER-FRAME INTERPOLATION LOOP
        function Na__PresentationMode__Camera__AnimationTick() {
            if (Na__PresentationMode__TransitionId !== myTransitionId) return; // <-- Cancelled — exit silently

            const elapsed  = performance.now() - startTime;
            const rawT     = Math.min(elapsed / durationMs, 1);               // <-- Clamp 0–1
            const t        = easeFn(rawT);                                    // <-- Apply easing

            // INTERPOLATE POSITION
            camera.position.lerpVectors(startPos, endPos, t);

            // INTERPOLATE QUATERNION (slerp for smooth rotation)
            tempQuat.slerpQuaternions(startQuat, endQuat, t);
            camera.setRotationFromQuaternion(tempQuat);                       // <-- Apply slerped rotation

            // INTERPOLATE FOV
            const interpFov = startFov + (endFov - startFov) * t;
            camera.fov = interpFov;
            camera.updateProjectionMatrix();                                  // <-- Rebuild projection each frame

            // INTERPOLATE ORBIT TARGET
            if (controls) {
                controls.target.lerpVectors(startTarget, endTarget, t);
                controls.update();
            }

            if (rawT < 1) {
                requestAnimationFrame(Na__PresentationMode__Camera__AnimationTick); // <-- Continue loop
            } else {
                // SNAP TO EXACT END VALUES to avoid float drift
                camera.position.copy(endPos);
                camera.setRotationFromQuaternion(endQuat);
                camera.fov = endFov;
                camera.updateProjectionMatrix();

                if (controls) {
                    controls.target.copy(endTarget);
                    controls.update();
                }

                Na__RenderLoop__StopActiveRender(Na__PresentationMode__RENDER_REASON); // <-- Stop continuous rendering
                Na__PresentationMode__IsTransitioning = false;
                Na__RenderLoop__RequestRender();                              // <-- One final clean frame

                if (onComplete) onComplete();                                 // <-- Notify caller
            }
        }

        requestAnimationFrame(Na__PresentationMode__Camera__AnimationTick);  // <-- Kick off animation
    }
    // ------------------------------------------------------------


    // FUNCTION | Check Whether a Transition Is Currently Running
    // ------------------------------------------------------------
    function Na__PresentationMode__Camera__IsTransitioning() {
        return Na__PresentationMode__IsTransitioning; // <-- Public read-only state check
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Camera Scene Transition API
    // ------------------------------------------------------------
    export {
        Na__PresentationMode__Camera__CaptureCurrentSceneState,
        Na__PresentationMode__Camera__BuildSceneCameraJson,
        Na__PresentationMode__Camera__ApplySceneCameraState,
        Na__PresentationMode__Camera__AnimateToScene,
        Na__PresentationMode__Camera__CancelCurrentTransition,
        Na__PresentationMode__Camera__IsTransitioning
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
