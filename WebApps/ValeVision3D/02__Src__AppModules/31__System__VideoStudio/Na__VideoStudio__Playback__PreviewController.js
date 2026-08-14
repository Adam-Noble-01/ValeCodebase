// =============================================================================
// VALEVISION3D - VIDEO STUDIO - PLAYBACK PREVIEW CONTROLLER
// =============================================================================
//
// FILE       : Na__VideoStudio__Playback__PreviewController.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Playback Preview Controller
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Fly the live camera along a saved video path in real time so
//              the route can be judged before committing to a render
// CREATED    : 12-Aug-2026
//
// DESCRIPTION:
// - Plays a video's timeline against the wall clock, driving the live camera
//   from the same sampler the exporter uses.  What you see in preview is what
//   the exported frames will contain, modulo the export resolution.
// - Preview takes exclusive ownership of the camera while it runs, exactly as
//   Walk and Fly modes do.  The render loop routes to UpdateFrame instead of
//   the orbit navigation update, so OrbitControls never gets a chance to
//   overwrite the sampled orientation with its own lookAt.
// - Stop restores the camera and the orbit target to where they were before
//   playback began.  Pause leaves the camera where it is and re-aims the orbit
//   target ahead of it, so orbiting from a paused frame behaves sensibly.
//
// INTEGRATION:
// - Na__AppFlow__LoadingSequence.js must route its per-frame update:
//       if (Na__VideoStudio__Preview__IsPlaying()) {
//           Na__VideoStudio__Preview__UpdateFrame(deltaMs);
//       } else if (Na__WalkMode__IsActive()) { ...
// - The Dev menu drives Play / Pause / Stop / Seek and listens for the
//   na-video-studio-preview-tick and na-video-studio-preview-ended events to
//   update its scrub bar and time readout.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 12-Aug-2026 - Version 1.0.0
// - Initial implementation for the Video Studio system.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Three.js
    // ------------------------------------------------------------
    import * as THREE from 'three';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Path Sampler
    // @delegate: ./Na__VideoStudio__Camera__PathSampler.js
    // ------------------------------------------------------------
    import {
        Na__VideoStudio__PathSampler__BuildTimeline,
        Na__VideoStudio__PathSampler__SampleAtTime,
        Na__VideoStudio__Camera__ApplyCameraState,
        Na__VideoStudio__Camera__ApplyKeyframe,
        Na__VideoStudio__Camera__AnnounceFovChange
    } from './Na__VideoStudio__Camera__PathSampler.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import {
        Na__RenderLoop__RequestRender,
        Na__RenderLoop__RequestActiveRender,
        Na__RenderLoop__StopActiveRender
    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Navigation Mode Switching
    // ------------------------------------------------------------
    import {
        Na__NavToolbar__GetActiveMode,
        Na__NavToolbar__SetOrbitMode
    } from '../10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Playback Options and Scene Animations
    // @delegate: ./Na__VideoStudio__Playback__SceneAnimations.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__ProjectJson__GetPlaybackOptions } from './Na__VideoStudio__ProjectJson__VideoData.js';
    import {
        Na__VideoStudio__SceneAnimations__Begin,
        Na__VideoStudio__SceneAnimations__End
    } from './Na__VideoStudio__Playback__SceneAnimations.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Path Overlay Suppression
    // @delegate: ./Na__VideoStudio__Viewport__PathVisualizer.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__PathVisualizer__SetSuppressed } from './Na__VideoStudio__Viewport__PathVisualizer.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Waypoint Edit Undo History
    // @delegate: ./Na__VideoStudio__Edit__UndoHistory.js
    // ------------------------------------------------------------
    import { Na__VideoStudio__UndoHistory__Clear } from './Na__VideoStudio__Edit__UndoHistory.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Render Reason and Events
    // ------------------------------------------------------------
    const Na__VsPreview__RENDER_REASON = 'video-studio-preview';             // <-- Keeps the render loop ticking
    const Na__VsPreview__TICK_EVENT    = 'na-video-studio-preview-tick';     // <-- Fires each preview frame
    const Na__VsPreview__ENDED_EVENT   = 'na-video-studio-preview-ended';    // <-- Fires when playback finishes or stops
    // ------------------------------------------------------------


    // MODULE CONSTANTS | Behaviour
    // ------------------------------------------------------------
    const Na__VsPreview__MAX_FRAME_DELTA_MS = 100;   // <-- Clamp: a stalled tab must not jump the camera
    const Na__VsPreview__FALLBACK_ORBIT_DIST = 8;    // <-- Metres ahead to park the orbit target on pause
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Runtime References
    // ------------------------------------------------------------
    let Na__VsPreview__Camera   = null;    // <-- Live perspective camera
    let Na__VsPreview__Controls = null;    // <-- OrbitControls instance
    // ------------------------------------------------------------


    // MODULE VARIABLES | Playback State
    // ------------------------------------------------------------
    let Na__VsPreview__Timeline    = null;   // <-- Timeline currently loaded for playback
    let Na__VsPreview__IsPlaying   = false;  // <-- True while the render loop should drive playback
    let Na__VsPreview__IsLoaded    = false;  // <-- True once a timeline is loaded (playing or paused)
    let Na__VsPreview__CurrentMs   = 0;      // <-- Playhead position in milliseconds
    let Na__VsPreview__VideoId     = null;   // <-- Video this timeline came from
    // ------------------------------------------------------------


    // MODULE VARIABLES | Scene Animation State
    // ------------------------------------------------------------
    let Na__VsPreview__AnimationsEnabled = true;    // <-- From the active video's playback options
    let Na__VsPreview__DoorOpenSeconds   = 1.2;     // <-- Single-leaf swing time for this video
    let Na__VsPreview__DoorDistanceM     = null;    // <-- Detection distance; null follows the app config
    let Na__VsPreview__AnimationSession  = false;   // <-- True while this module holds an animation session
    // ------------------------------------------------------------


    // MODULE VARIABLES | Saved Pre-Preview Camera State
    // ------------------------------------------------------------
    let Na__VsPreview__SavedPosition   = null;   // <-- Camera position before playback
    let Na__VsPreview__SavedQuaternion = null;   // <-- Camera orientation before playback
    let Na__VsPreview__SavedFov        = null;   // <-- Camera FOV before playback
    let Na__VsPreview__SavedTarget     = null;   // <-- Orbit target before playback
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Camera State Save and Restore
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Snapshot the Live Camera Before Playback Begins
    // ------------------------------------------------------------
    function Na__VsPreview__SaveCameraState() {
        if (!Na__VsPreview__Camera || Na__VsPreview__SavedPosition) return;   // <-- Never overwrite an existing snapshot

        Na__VsPreview__SavedPosition   = Na__VsPreview__Camera.position.clone();
        Na__VsPreview__SavedQuaternion = Na__VsPreview__Camera.quaternion.clone();
        Na__VsPreview__SavedFov        = Na__VsPreview__Camera.fov;
        Na__VsPreview__SavedTarget     = Na__VsPreview__Controls
            ? Na__VsPreview__Controls.target.clone()
            : null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Restore the Camera Snapshot and Clear It
    // ------------------------------------------------------------
    function Na__VsPreview__RestoreCameraState() {
        if (!Na__VsPreview__Camera || !Na__VsPreview__SavedPosition) return;

        Na__VsPreview__Camera.position.copy(Na__VsPreview__SavedPosition);
        Na__VsPreview__Camera.quaternion.copy(Na__VsPreview__SavedQuaternion);
        Na__VsPreview__Camera.fov = Na__VsPreview__SavedFov;
        Na__VsPreview__Camera.updateProjectionMatrix();

        if (Na__VsPreview__Controls && Na__VsPreview__SavedTarget) {
            Na__VsPreview__Controls.target.copy(Na__VsPreview__SavedTarget);
            Na__VsPreview__Controls.update();
        }

        window.dispatchEvent(new CustomEvent('na-camera-fov-changed'));      // <-- Stop puts the original lens back

        Na__VsPreview__ClearCameraSnapshot();
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Discard the Camera Snapshot Without Restoring
    // ------------------------------------------------------------
    function Na__VsPreview__ClearCameraSnapshot() {
        Na__VsPreview__SavedPosition   = null;
        Na__VsPreview__SavedQuaternion = null;
        Na__VsPreview__SavedFov        = null;
        Na__VsPreview__SavedTarget     = null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Re-Aim the Orbit Target Ahead of the Current Camera
    // ------------------------------------------------------------
    // Called when playback is left parked mid-path.  Placing the target on the
    // camera's own forward axis means the next orbit drag pivots around what
    // the paused frame is looking at, rather than snapping back to whatever
    // the target was before playback started.
    // ------------------------------------------------------------
    function Na__VsPreview__ReseatOrbitTarget() {
        if (!Na__VsPreview__Controls || !Na__VsPreview__Camera) return;

        const distance = (Na__VsPreview__SavedTarget)
            ? Math.max(1, Na__VsPreview__SavedPosition.distanceTo(Na__VsPreview__SavedTarget))
            : Na__VsPreview__FALLBACK_ORBIT_DIST;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(Na__VsPreview__Camera.quaternion);

        Na__VsPreview__Controls.target
            .copy(Na__VsPreview__Camera.position)
            .addScaledVector(forward, distance);

        Na__VsPreview__Controls.update();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Event Dispatch
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Announce the Current Playhead Position
    // ------------------------------------------------------------
    function Na__VsPreview__DispatchTick() {
        window.dispatchEvent(new CustomEvent(Na__VsPreview__TICK_EVENT, {
            detail: {
                videoId    : Na__VsPreview__VideoId,
                currentMs  : Na__VsPreview__CurrentMs,
                durationMs : Na__VsPreview__Timeline ? Na__VsPreview__Timeline.totalDurationMs : 0,
                isPlaying  : Na__VsPreview__IsPlaying
            }
        }));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Announce That Playback Has Finished or Been Stopped
    // ------------------------------------------------------------
    function Na__VsPreview__DispatchEnded(reason) {
        window.dispatchEvent(new CustomEvent(Na__VsPreview__ENDED_EVENT, {
            detail: { videoId: Na__VsPreview__VideoId, reason }
        }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Playback Control
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Load a Video's Timeline for Playback
    // ------------------------------------------------------------
    // Returns the timeline, or null when the video has no usable keyframes.
    // ------------------------------------------------------------
    function Na__VsPreview__LoadTimeline(video) {
        const timeline = Na__VideoStudio__PathSampler__BuildTimeline(video);
        if (!timeline) return null;

        Na__VsPreview__Timeline = timeline;
        Na__VsPreview__VideoId  = video.VideoStudio__Video__Id;
        Na__VsPreview__IsLoaded = true;

        const playback = Na__VideoStudio__ProjectJson__GetPlaybackOptions(video);
        Na__VsPreview__AnimationsEnabled = playback.animationsEnabled;
        Na__VsPreview__DoorOpenSeconds   = playback.doorOpenSeconds;
        Na__VsPreview__DoorDistanceM     = playback.doorDistanceM;

        return timeline;
    }
    // ------------------------------------------------------------


    // FUNCTION | Start or Resume Playback of a Video
    // ------------------------------------------------------------
    // Returns an error message string when playback cannot start, else null.
    // ------------------------------------------------------------
    function Na__VideoStudio__Preview__Play(video) {
        if (!Na__VsPreview__Camera) return 'Preview is not initialised yet.';
        if (!video)                 return 'No video selected.';

        // NAVIGATION MODE | Walk and Fly drive the camera themselves, so hand
        // control back to orbit before the timeline takes over.
        if (Na__NavToolbar__GetActiveMode && Na__NavToolbar__GetActiveMode() !== 'orbit') {
            Na__NavToolbar__SetOrbitMode();
        }

        // RESUMING | Same video, already loaded and merely paused partway
        const isResume = Na__VsPreview__IsLoaded
            && Na__VsPreview__VideoId === video.VideoStudio__Video__Id
            && Na__VsPreview__CurrentMs > 0;

        if (!isResume) {
            const timeline = Na__VsPreview__LoadTimeline(video);
            if (!timeline) return 'This video has no keyframes to preview.';
            Na__VsPreview__CurrentMs = 0;
        }

        Na__VsPreview__SaveCameraState();                                    // <-- No-op when a snapshot already exists

        // ANIMATIONS | Enable proximity doors for the run, exactly as Walk and
        // Fly do, so the video previews with the doors actually opening.
        if (!Na__VsPreview__AnimationSession) {
            Na__VsPreview__AnimationSession = Na__VideoStudio__SceneAnimations__Begin(
                Na__VsPreview__AnimationsEnabled,
                {
                    doorOpenSeconds : Na__VsPreview__DoorOpenSeconds,
                    doorDistanceMm  : Number.isFinite(Na__VsPreview__DoorDistanceM)
                        ? Na__VsPreview__DoorDistanceM * 1000                // <-- Metres in the UI, millimetres in the system
                        : null
                }
            );
        }

        // OVERLAY | The path runs THROUGH the waypoints, so a marker sitting on
        // the lens would fill the frame. Hide it while the camera is flying.
        Na__VideoStudio__PathVisualizer__SetSuppressed('preview', true);

        // UNDO | Playback takes the camera over, which ends the editing
        // session the waypoint history belongs to.
        Na__VideoStudio__UndoHistory__Clear('preview started');

        Na__VsPreview__IsPlaying = true;
        Na__RenderLoop__RequestActiveRender(Na__VsPreview__RENDER_REASON);

        Na__VsPreview__DispatchTick();
        return null;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Release Everything Playback Borrowed
    // ------------------------------------------------------------
    // Closes the animation session and brings the path overlay back.  Called
    // whenever the camera stops moving, so nothing is left switched on while
    // the user is orbiting around by hand.
    // ------------------------------------------------------------
    function Na__VsPreview__ReleasePlaybackResources() {
        if (Na__VsPreview__AnimationSession) {
            Na__VideoStudio__SceneAnimations__End(true);
            Na__VsPreview__AnimationSession = false;
        }
        Na__VideoStudio__PathVisualizer__SetSuppressed('preview', false);

        // The timeline has been writing camera.fov every frame; tell the Tools
        // menu lens readout now that the camera has settled.
        Na__VideoStudio__Camera__AnnounceFovChange();
    }
    // ------------------------------------------------------------


    // FUNCTION | Pause Playback, Leaving the Camera Where It Is
    // ------------------------------------------------------------
    function Na__VideoStudio__Preview__Pause() {
        if (!Na__VsPreview__IsPlaying) return;

        Na__VsPreview__IsPlaying = false;
        Na__RenderLoop__StopActiveRender(Na__VsPreview__RENDER_REASON);
        Na__VsPreview__ReleasePlaybackResources();

        Na__VsPreview__ReseatOrbitTarget();                                  // <-- Orbiting from here now pivots sensibly
        Na__RenderLoop__RequestRender();

        Na__VsPreview__DispatchTick();
    }
    // ------------------------------------------------------------


    // FUNCTION | Stop Playback and Restore the Pre-Preview Camera
    // ------------------------------------------------------------
    function Na__VideoStudio__Preview__Stop() {
        const wasActive = Na__VsPreview__IsPlaying || Na__VsPreview__IsLoaded;

        Na__VsPreview__IsPlaying = false;
        Na__RenderLoop__StopActiveRender(Na__VsPreview__RENDER_REASON);
        Na__VsPreview__ReleasePlaybackResources();

        Na__VsPreview__RestoreCameraState();

        Na__VsPreview__CurrentMs = 0;
        Na__VsPreview__IsLoaded  = false;
        Na__VsPreview__Timeline  = null;

        Na__RenderLoop__RequestRender();

        if (wasActive) {
            Na__VsPreview__DispatchTick();
            Na__VsPreview__DispatchEnded('stopped');
        }
        Na__VsPreview__VideoId = null;
    }
    // ------------------------------------------------------------


    // FUNCTION | Move the Playhead to an Absolute Time Without Playing
    // ------------------------------------------------------------
    function Na__VideoStudio__Preview__Seek(video, timeMs) {
        if (!Na__VsPreview__Camera || !video) return;

        if (!Na__VsPreview__IsLoaded || Na__VsPreview__VideoId !== video.VideoStudio__Video__Id) {
            if (!Na__VsPreview__LoadTimeline(video)) return;                 // <-- Nothing to seek through
        }

        Na__VsPreview__SaveCameraState();                                    // <-- So Stop can still put the view back

        Na__VsPreview__CurrentMs = Math.max(0, Math.min(Na__VsPreview__Timeline.totalDurationMs, timeMs));

        const state = Na__VideoStudio__PathSampler__SampleAtTime(Na__VsPreview__Timeline, Na__VsPreview__CurrentMs);
        if (state) {
            Na__VideoStudio__Camera__ApplyCameraState(Na__VsPreview__Camera, state);
            Na__VsPreview__ReseatOrbitTarget();                              // <-- Scrubbing leaves the camera parked here
            Na__VideoStudio__Camera__AnnounceFovChange();
            Na__RenderLoop__RequestRender();
        }

        Na__VsPreview__DispatchTick();
    }
    // ------------------------------------------------------------


    // FUNCTION | Snap the Camera Directly to One Keyframe
    // ------------------------------------------------------------
    // Used by the Dev menu when a keyframe row is clicked, so the authoring
    // workflow can hop between shots without scrubbing.
    // ------------------------------------------------------------
    function Na__VideoStudio__Preview__JumpToKeyframe(keyframe) {
        if (!Na__VsPreview__Camera || !keyframe) return false;

        if (Na__NavToolbar__GetActiveMode && Na__NavToolbar__GetActiveMode() !== 'orbit') {
            Na__NavToolbar__SetOrbitMode();
        }

        const applied = Na__VideoStudio__Camera__ApplyKeyframe(Na__VsPreview__Camera, keyframe);
        if (!applied) return false;

        Na__VsPreview__ReseatOrbitTarget();
        Na__VideoStudio__Camera__AnnounceFovChange();                        // <-- Go To adopts the keyframe's lens
        Na__RenderLoop__RequestRender();
        return true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per-Frame Update
// -----------------------------------------------------------------------------

    // FUNCTION | Report Whether Preview Currently Owns the Camera
    // ------------------------------------------------------------
    // The render loop calls this to decide whether to route the frame to
    // UpdateFrame instead of the normal navigation update.
    // ------------------------------------------------------------
    function Na__VideoStudio__Preview__IsPlaying() {
        return Na__VsPreview__IsPlaying;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether the Playing Video Wants Scene Animations
    // ------------------------------------------------------------
    // The render loop reads this to decide whether to run the per-frame
    // proximity check while preview owns the camera.
    // ------------------------------------------------------------
    function Na__VideoStudio__Preview__AreAnimationsEnabled() {
        return Na__VsPreview__AnimationsEnabled;
    }
    // ------------------------------------------------------------


    // FUNCTION | Advance Playback by One Rendered Frame
    // ------------------------------------------------------------
    // Called from the render loop in place of the orbit navigation update, so
    // OrbitControls never runs its lookAt against the sampled orientation.
    // ------------------------------------------------------------
    function Na__VideoStudio__Preview__UpdateFrame(deltaMs) {
        if (!Na__VsPreview__IsPlaying || !Na__VsPreview__Timeline || !Na__VsPreview__Camera) return;

        const delta = Math.min(
            Na__VsPreview__MAX_FRAME_DELTA_MS,
            Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0)
        );

        Na__VsPreview__CurrentMs += delta;

        const durationMs = Na__VsPreview__Timeline.totalDurationMs;
        const hasEnded   = Na__VsPreview__CurrentMs >= durationMs;
        if (hasEnded) Na__VsPreview__CurrentMs = durationMs;                 // <-- Land exactly on the final frame

        const state = Na__VideoStudio__PathSampler__SampleAtTime(Na__VsPreview__Timeline, Na__VsPreview__CurrentMs);
        if (state) {
            Na__VideoStudio__Camera__ApplyCameraState(Na__VsPreview__Camera, state);
        }

        Na__VsPreview__DispatchTick();

        if (hasEnded) {
            Na__VsPreview__IsPlaying = false;
            Na__RenderLoop__StopActiveRender(Na__VsPreview__RENDER_REASON);
            Na__VsPreview__ReleasePlaybackResources();
            Na__VsPreview__ReseatOrbitTarget();                              // <-- Leave the view usable at the last shot
            Na__VsPreview__DispatchEnded('completed');
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Initialization
// -----------------------------------------------------------------------------

    // FUNCTION | Register the Camera and Controls for Preview Playback
    // ------------------------------------------------------------
    function Na__VideoStudio__Preview__Initialize(camera, controls) {
        Na__VsPreview__Camera   = camera;
        Na__VsPreview__Controls = controls;
    }
    // ------------------------------------------------------------


    // FUNCTION | Report the Current Playhead Position and Duration
    // ------------------------------------------------------------
    function Na__VideoStudio__Preview__GetState() {
        return {
            videoId    : Na__VsPreview__VideoId,
            currentMs  : Na__VsPreview__CurrentMs,
            durationMs : Na__VsPreview__Timeline ? Na__VsPreview__Timeline.totalDurationMs : 0,
            isPlaying  : Na__VsPreview__IsPlaying,
            isLoaded   : Na__VsPreview__IsLoaded
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Drop a Cached Timeline After Its Video Was Edited
    // ------------------------------------------------------------
    // Stops playback first so the camera is not left mid-path on a route that
    // no longer exists.
    // ------------------------------------------------------------
    function Na__VideoStudio__Preview__InvalidateTimeline(videoId) {
        if (!Na__VsPreview__IsLoaded) return;
        if (videoId && Na__VsPreview__VideoId !== videoId) return;

        if (Na__VsPreview__IsPlaying) {
            Na__VideoStudio__Preview__Stop();
            return;
        }

        Na__VsPreview__Timeline  = null;
        Na__VsPreview__IsLoaded  = false;
        Na__VsPreview__CurrentMs = 0;
        Na__VsPreview__ClearCameraSnapshot();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Preview Controller API
    // ------------------------------------------------------------
    export {
        Na__VsPreview__TICK_EVENT,
        Na__VsPreview__ENDED_EVENT,
        Na__VideoStudio__Preview__Initialize,
        Na__VideoStudio__Preview__Play,
        Na__VideoStudio__Preview__Pause,
        Na__VideoStudio__Preview__Stop,
        Na__VideoStudio__Preview__Seek,
        Na__VideoStudio__Preview__JumpToKeyframe,
        Na__VideoStudio__Preview__IsPlaying,
        Na__VideoStudio__Preview__AreAnimationsEnabled,
        Na__VideoStudio__Preview__UpdateFrame,
        Na__VideoStudio__Preview__GetState,
        Na__VideoStudio__Preview__InvalidateTimeline
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
