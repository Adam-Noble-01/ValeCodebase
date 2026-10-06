// =============================================================================
// VALEVISION3D - NAVIGATION MODES - PROGRAMMATIC MODE SWITCHER
// =============================================================================
//
// FILE       : Na__NavigationModes__Switcher.js
// NAMESPACE  : Na__NavigationModes
// MODULE     : Navigation Modes - Programmatic Mode Switcher
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : One shared way to read, change and restore the navigation mode
//              (orbit, walk, fly) from outside the navigation toolbar, while
//              leaving the camera exactly where the caller put it
// CREATED    : 11-Sep-2026
//
// DESCRIPTION:
// - Saved Presentation Mode scenes and Video Studio keyframes each remember
//   the navigation mode they were framed in. Arriving at one has to switch
//   the app into that mode, and leaving walk or fly has to hand the camera
//   back without moving it. This module is the one place that knows how.
// - Every switch goes through the toolbar's public Set*Mode functions, which
//   drive index.html's mutual exclusivity wrappers, so a programmatic switch
//   brings up the mode's desktop or touch controls, door proximity, the render
//   loop and the button highlight exactly as a click would.
// - Entering walk or fly moves the camera on purpose: the FOV compensation
//   nudge, walk's 1 m safety nudge and 30 degree entry pitch clamp, and the
//   mode's own lens. Those suit a view inherited from orbit, not a saved shot,
//   so EnterModeAtPose puts the pose back once the mode is live and re-seats
//   the mode on it (SyncFromCamera in each mode's SystemLogic).
// - Leaving walk or fly normally re-places the orbit camera beside the old
//   orbit target. ReleaseToOrbit keeps the live view instead and aims the
//   orbit target straight ahead of it, because OrbitControls re-aims the
//   camera at its target on every update.
// - The active mode is read from the walk and fly systems themselves, never
//   from the toolbar highlight, so it cannot drift from what owns the camera.
// - A mode the model has switched off (Navmode__EnabledModes) resolves to
//   orbit, as does any value that is not a mode name.
//
// INTEGRATION:
// - Consumed by Na__PresentationMode__Camera__SceneTransition.js (arrival
//   mode), the Presentation Scenes editor (capture and the per-scene switch),
//   and the Video Studio preview controller and keyframe context menu.
// - Needs no registration: index.html initialises the toolbar before any
//   scene or keyframe can be visited. Called earlier, a switch does nothing
//   and reports false.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/10__NavigationAndCameras/Na__NavigationModes__Switcher.js
// - Source version: TrueVision 1.0.0 (27-Aug-2026)
// - Ported on     : 11-Sep-2026 for ValeVision3D v2.21.17
// - Parity        : adapted
// - Divergences   :
//   - No RegisterModeSwitcher: ValeVision's toolbar module already exposes the index.html wrappers.
//   - The active mode comes from Na__WalkMode__IsActive and Na__FlyMode__IsActive, not a registered getter.
//   - Adds the pose-preserving ReleaseToOrbit and EnterModeAtPose, the look-ahead target helper, and
//     mode name normalisation for the Video Studio's capitalised 'Orbit' | 'Walk' | 'Fly' labels.
// - Back-port     : TrueVision enters walk and fly on arrival without undoing the entry nudges;
//                   EnterModeAtPose is the fix if that ever shows.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 11-Sep-2026 - Version 1.0.0
// - Initial implementation for per-scene and per-keyframe navigation modes.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Enabled Mode Flags (per-model Navmode__EnabledModes)
    // ------------------------------------------------------------
    import {
        Na__NavigationModes__IsWalkEnabled,
        Na__NavigationModes__IsFlyEnabled
    } from './Na__NavigationModes__State.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Walk and Fly Systems (who owns the camera, and re-seating)
    // ------------------------------------------------------------
    import {
        Na__WalkMode__IsActive,
        Na__WalkMode__SyncFromCamera
    } from './Na__Navmode__WalkMode__SystemLogic.js';
    import {
        Na__FlyMode__IsActive,
        Na__FlyMode__SyncFromCamera
    } from './Na__Navmode__FlyMode__SystemLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Toolbar Mode Switching (routes through index.html's wrappers)
    // @delegate: ./Na__UiFeature__NavigationToolbar__Controls.js
    // ------------------------------------------------------------
    import {
        Na__NavToolbar__SetOrbitMode,
        Na__NavToolbar__SetWalkMode,
        Na__NavToolbar__SetFlyMode
    } from './Na__UiFeature__NavigationToolbar__Controls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import { Na__RenderLoop__RequestRender } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Recognised Navigation Modes
    // ------------------------------------------------------------
    const Na__NavModeSwitch__VALID_MODES = ['orbit', 'walk', 'fly'];         // <-- Anything else is rejected
    const Na__NavModeSwitch__MODE_LABELS = {                                 // <-- Display form, and the Video Studio's stored form
        orbit : 'Orbit',
        walk  : 'Walk',
        fly   : 'Fly'
    };
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Look-Ahead Target and Events
    // ------------------------------------------------------------
    const Na__NavModeSwitch__LOOK_AHEAD_UNITS = 5;                           // <-- Orbit target placed 5 m along a free-look view's own axis
    const Na__NavModeSwitch__FOV_EVENT        = 'na-camera-fov-changed';     // <-- Lens readouts listen for this
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mode Names and Availability
// -----------------------------------------------------------------------------

    // FUNCTION | Normalise a Stored Mode Value to 'orbit' | 'walk' | 'fly'
    // ------------------------------------------------------------
    // Accepts the Video Studio's capitalised labels ('Fly'), the Presentation
    // scene's lower-case values ('fly') and stray whitespace. Returns null for
    // anything that is not a mode name, such as the old 'Inserted' marker on
    // waypoints added along a path.
    // ------------------------------------------------------------
    function Na__NavigationModes__NormaliseMode(value) {
        if (typeof value !== 'string') return null;
        const mode = value.trim().toLowerCase();
        return Na__NavModeSwitch__VALID_MODES.includes(mode) ? mode : null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is a Mode Available on This Model?
    // ------------------------------------------------------------
    function Na__NavigationModes__IsModeAvailable(mode) {
        const normalised = Na__NavigationModes__NormaliseMode(mode);
        if (normalised === 'walk') return Na__NavigationModes__IsWalkEnabled();   // <-- Gated by project.json
        if (normalised === 'fly')  return Na__NavigationModes__IsFlyEnabled();    // <-- Gated by project.json
        return normalised === 'orbit';                                       // <-- Orbit always; a non-mode never
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Stored Value to the Mode It Should Be Viewed In
    // ------------------------------------------------------------
    // Absent, unknown or switched-off modes resolve to orbit, never to "keep
    // whatever the viewer is already in". Keeping the live mode strands the
    // viewer: one walk scene and every undeclared scene after it stays in walk
    // (TrueVision found this the hard way on 31-Aug-2026).
    // ------------------------------------------------------------
    function Na__NavigationModes__ResolveMode(value) {
        const mode = Na__NavigationModes__NormaliseMode(value);
        if (!mode || !Na__NavigationModes__IsModeAvailable(mode)) return 'orbit';
        return mode;
    }
    // ------------------------------------------------------------


    // FUNCTION | Is This a Free-Look Mode (Walk or Fly)?
    // ------------------------------------------------------------
    function Na__NavigationModes__IsFreeLookMode(mode) {
        const normalised = Na__NavigationModes__NormaliseMode(mode);
        return normalised === 'walk' || normalised === 'fly';
    }
    // ------------------------------------------------------------


    // FUNCTION | Display Label for a Mode ('Orbit' | 'Walk' | 'Fly')
    // ------------------------------------------------------------
    // Also the form the Video Studio stores on its keyframes. Anything that
    // is not a mode name reads as Orbit, matching ResolveMode.
    // ------------------------------------------------------------
    function Na__NavigationModes__GetModeLabel(mode) {
        return Na__NavModeSwitch__MODE_LABELS[Na__NavigationModes__NormaliseMode(mode) || 'orbit'];
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Mode That Actually Owns the Camera
    // ------------------------------------------------------------
    function Na__NavigationModes__GetActiveMode() {
        if (Na__WalkMode__IsActive()) return 'walk';
        if (Na__FlyMode__IsActive())  return 'fly';
        return 'orbit';
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Camera Pose Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Snapshot the Camera Pose
    // ------------------------------------------------------------
    function Na__NavModeSwitch__CapturePose(camera) {
        return {
            position   : camera.position.clone(),
            quaternion : camera.quaternion.clone(),
            fov        : camera.fov
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Put a Pose Snapshot Back on the Camera
    // ------------------------------------------------------------
    function Na__NavModeSwitch__ApplyPose(camera, pose) {
        camera.position.copy(pose.position);
        camera.quaternion.copy(pose.quaternion);

        if (Number.isFinite(pose.fov) && camera.fov !== pose.fov) {
            camera.fov = pose.fov;                                           // <-- The saved lens wins over the mode's own
            camera.updateProjectionMatrix();
        }

        camera.updateMatrixWorld(true);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Tell the Lens Readouts and the Renderer the Camera Settled
    // ------------------------------------------------------------
    function Na__NavModeSwitch__AnnounceSettled() {
        window.dispatchEvent(new CustomEvent(Na__NavModeSwitch__FOV_EVENT));
        Na__RenderLoop__RequestRender();
    }
    // ------------------------------------------------------------


    // FUNCTION | Place a Point Along a View's Own Forward Axis
    // ------------------------------------------------------------
    // OrbitControls.update() re-aims the camera at controls.target every time
    // it runs. For a walk or fly view the leftover target has nothing to do
    // with where the camera looks, so update() would swing the view round to
    // face it. A target on the camera's own forward axis makes update() settle
    // on the orientation already there, and leaves orbit framed sensibly for
    // whenever the viewer returns to it.
    //
    // outTarget is written and returned. distanceUnits defaults to 5 m.
    // ------------------------------------------------------------
    function Na__NavigationModes__PlaceLookAheadTarget(position, quaternion, outTarget, distanceUnits) {
        const distance = (Number.isFinite(distanceUnits) && distanceUnits > 0)
            ? distanceUnits
            : Na__NavModeSwitch__LOOK_AHEAD_UNITS;

        return outTarget
            .set(0, 0, -1)                                                   // <-- Camera forward in local space
            .applyQuaternion(quaternion)
            .multiplyScalar(distance)
            .add(position);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Mode Switching
// -----------------------------------------------------------------------------

    // FUNCTION | Re-Seat Whichever Free-Look Mode Is Active on the Current Pose
    // ------------------------------------------------------------
    // For a caller that has just written a pose onto the camera while walk or
    // fly stays on. Returns false in orbit, where the camera pose is already
    // the whole truth.
    // ------------------------------------------------------------
    function Na__NavigationModes__ResyncActiveMode() {
        if (Na__WalkMode__IsActive()) return Na__WalkMode__SyncFromCamera();
        if (Na__FlyMode__IsActive())  return Na__FlyMode__SyncFromCamera();
        return false;
    }
    // ------------------------------------------------------------


    // FUNCTION | Hand the Camera Back to Orbit Without Moving the View
    // ------------------------------------------------------------
    // Walk and fly own the camera while they are active, so nothing else can
    // move it until they let go. Letting go normally jumps the view to an
    // orbit vantage point; this keeps the live view, lens included, and aims
    // orbit straight ahead of it, so an animation or a snap starts from
    // exactly what was on screen.
    //
    // options.targetDistanceUnits : how far ahead the orbit target goes (5 m)
    //
    // Returns true when walk or fly was actually let go.
    // ------------------------------------------------------------
    function Na__NavigationModes__ReleaseToOrbit(camera, controls, options) {
        if (Na__NavigationModes__GetActiveMode() === 'orbit') return false;  // <-- Already free

        const pose = camera ? Na__NavModeSwitch__CapturePose(camera) : null;

        Na__NavToolbar__SetOrbitMode();                                      // <-- Exits walk or fly through the toolbar wrappers
        if (Na__NavigationModes__GetActiveMode() !== 'orbit') return false;  // <-- Toolbar not wired yet: nothing let go

        if (!pose) return true;

        Na__NavModeSwitch__ApplyPose(camera, pose);                          // <-- Undo the exit's vantage jump and lens restore
        if (controls && controls.target) {
            Na__NavigationModes__PlaceLookAheadTarget(
                pose.position, pose.quaternion, controls.target,
                options && options.targetDistanceUnits
            );
            controls.update();                                               // <-- Settles on the orientation already there
        }

        Na__NavModeSwitch__AnnounceSettled();
        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Enter Walk or Fly Exactly Where the Camera Is Now
    // ------------------------------------------------------------
    // The caller has already placed the camera: a scene arrival, a keyframe
    // jump, a restore. Switching through the toolbar gives the mode its
    // controls, door proximity, render loop and highlight; the pose is then
    // put back over the entry nudges and the mode's own lens, and the mode is
    // re-seated on it. The saved lens wins over the walk or fly default,
    // because what was framed is what should be seen.
    //
    // Orbit needs no entry, so asking for it, or for a mode the model has
    // switched off, changes nothing and returns false. Asking for the mode
    // already active re-seats it on the current pose instead of toggling it
    // off, which is what the toolbar button would do.
    //
    // Returns true when the camera ends up in the requested free-look mode.
    // ------------------------------------------------------------
    function Na__NavigationModes__EnterModeAtPose(mode, camera, controls) {
        const targetMode = Na__NavigationModes__ResolveMode(mode);
        if (targetMode === 'orbit' || !camera) return false;

        // ALREADY THERE | Just take the new pose
        if (Na__NavigationModes__GetActiveMode() === targetMode) {
            const resynced = Na__NavigationModes__ResyncActiveMode();
            Na__NavModeSwitch__AnnounceSettled();
            return resynced;
        }

        const pose = Na__NavModeSwitch__CapturePose(camera);

        // THE OTHER FREE-LOOK MODE | Let go in place first, so the new mode
        // starts from this pose and not from the vantage point that leaving
        // the old one would jump to.
        Na__NavigationModes__ReleaseToOrbit(camera, controls);

        if (targetMode === 'walk') {
            Na__NavToolbar__SetWalkMode();
        } else {
            Na__NavToolbar__SetFlyMode();
        }

        if (Na__NavigationModes__GetActiveMode() !== targetMode) return false;   // <-- Not initialised, or the mode refused

        Na__NavModeSwitch__ApplyPose(camera, pose);                          // <-- Undo the entry nudges and the mode's own lens
        Na__NavigationModes__ResyncActiveMode();                             // <-- Walk takes capsule and look from here, fly its look

        Na__NavModeSwitch__AnnounceSettled();
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Programmatic Mode Switcher API
    // ------------------------------------------------------------
    export {
        Na__NavigationModes__NormaliseMode,
        Na__NavigationModes__IsModeAvailable,
        Na__NavigationModes__ResolveMode,
        Na__NavigationModes__IsFreeLookMode,
        Na__NavigationModes__GetModeLabel,
        Na__NavigationModes__GetActiveMode,
        Na__NavigationModes__PlaceLookAheadTarget,
        Na__NavigationModes__ResyncActiveMode,
        Na__NavigationModes__ReleaseToOrbit,
        Na__NavigationModes__EnterModeAtPose
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
