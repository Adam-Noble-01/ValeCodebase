// =============================================================================
// VALEVISION3D - VIDEO STUDIO - SCENE ANIMATIONS SESSION
// =============================================================================
//
// FILE       : Na__VideoStudio__Playback__SceneAnimations.js
// NAMESPACE  : Na__VideoStudio
// MODULE     : VideoStudio - Scene Animations Session
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Turn proximity door triggers on for the duration of a preview
//              or an export, then put them back exactly as they were
// CREATED    : 14-Aug-2026
//
// DESCRIPTION:
// - Proximity doors are owned by the Walk and Fly mode controllers.  They call
//   Na__DoorProximity__Initialize once with a threshold, then flip
//   Na__DoorProximity__SetEnabled true on activation and false on exit.  The
//   flag starts false and nothing else ever turns it on.
// - Video Studio drives the camera from Orbit, so without this module the
//   proximity check no-ops for the whole clip and every door stays shut even
//   though the camera walks straight through the opening.
// - This module opens a session around a preview or an export: it makes sure
//   the proximity system is initialised, enables it, and guarantees it is
//   switched off again afterwards.  Sessions are reference counted so a
//   preview and an export overlapping cannot leave the flag stuck on.
//
// WHY NOT JUST CALL SetEnabled(true) AT STARTUP:
// - Leaving proximity permanently enabled would make doors swing open while
//   the user simply orbits the model, which is not how the app behaves today.
//   Scoping it to a session keeps the change contained to video playback.
//
// THRESHOLD:
// - Reuses the same DoorProximityThresholdMm the Walk and Fly modes use, so a
//   door opens at the same distance in a video as it does when you walk
//   through the model yourself.
//
// PER-KEYFRAME DOOR ANIMATION:
// - Doors only move where a keyframe is ticked for Door Animation
//   (VideoStudio__Keyframe__DoorAnimation). The tick covers that keyframe's
//   hold and the travel on to the next keyframe; everywhere else doors are
//   held shut, and one left open swings shut as the clip arrives at an
//   unticked keyframe. The video's Animations switch remains the master: off,
//   no session opens and nothing here runs.
// - A run from the top starts with every door snapped shut, so the first
//   frames never show a door closing that the path never went near.
// - Landing on a keyframe while editing shows the same state: unticked holds
//   the doors shut until the camera moves about a metre away.
//
// INTEGRATION:
// - SetConfig is called once by the Dev menu with the navmode config block.
// - Begin / End wrap preview playback and each export session.
// - IsActive gates the per-frame proximity call in the render loop.
// - SetDoorsLive runs every preview and export frame; ResetDoorsClosed at the
//   start of a run; ApplyLandingDoors on a keyframe jump; ReleaseLandingDoors
//   when the Video Studio panel closes or another path is opened.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 14-Aug-2026 - Version 1.0.0
// - Initial implementation. Doors now animate during preview and export.
//
// 11-Sep-2026 - Version 1.1.0
// - Per-keyframe door animation: SetDoorsLive, ResetDoorsClosed,
//   ApplyLandingDoors and ReleaseLandingDoors, on top of the proximity
//   system's new hold-closed state.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Proximity Door Trigger System
    // ------------------------------------------------------------
    import {
        Na__DoorProximity__Initialize,
        Na__DoorProximity__SetEnabled,
        Na__DoorProximity__SetHoldClosed,
        Na__DoorProximity__HoldClosedAt,
        Na__DoorProximity__CloseAllDoors
    } from '../25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Door Animation Speed Scale and Reset
    // ------------------------------------------------------------
    import {
        Na__DoorAnimation__SetSpeedScale,
        Na__DoorAnimation__GetSpeedScale,
        Na__DoorAnimation__GetBaseDurationMs,
        Na__DoorAnimation__SnapAllClosed
    } from '../25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Unit Conversion
    // ------------------------------------------------------------
    import { Na__Math__ConvertMmToUnits } from '../04__MathUtils/Na__Math__Units.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback Proximity Threshold
    // ------------------------------------------------------------
    const Na__VsAnim__FALLBACK_THRESHOLD_MM = 6500;   // <-- Matches the shipped Walk and Fly defaults
    // ------------------------------------------------------------

    // MODULE CONSTANTS | Landing Hold Release Distance
    // ------------------------------------------------------------
    // Moving this far across the floor from a keyframe the camera landed on
    // hands its doors back to walk and fly proximity. Far enough that looking
    // round or nudging the shot keeps the doors as the keyframe says.
    // ------------------------------------------------------------
    const Na__VsAnim__LANDING_RELEASE_MM = 1000;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Session State
    // ------------------------------------------------------------
    let Na__VsAnim__ThresholdMm    = Na__VsAnim__FALLBACK_THRESHOLD_MM;  // <-- Distance at which doors trigger
    let Na__VsAnim__SessionCount   = 0;                                  // <-- Nested sessions keep the flag honest
    let Na__VsAnim__IsActive       = false;                              // <-- True while at least one session is open
    let Na__VsAnim__RestoreSpeed   = 1.0;                                // <-- Door speed to put back when the session closes
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Public API
// -----------------------------------------------------------------------------

    // FUNCTION | Resolve the Proximity Threshold from the Navmode Config
    // ------------------------------------------------------------
    // Accepts the Navmode__Settings block; prefers the Walk threshold because a
    // video camera behaves like a walker, and falls back to Fly then a default.
    // ------------------------------------------------------------
    function Na__VideoStudio__SceneAnimations__SetConfig(navmodeSettings) {
        const walk = navmodeSettings && navmodeSettings.Navmode__WalkMode;
        const fly  = navmodeSettings && navmodeSettings.Navmode__FlyMode;

        const candidate = (walk && walk.Navmode__WalkMode__DoorProximityThresholdMm)
                       || (fly  && fly.Navmode__FlyMode__DoorProximityThresholdMm);

        if (Number.isFinite(candidate) && candidate > 0) {
            Na__VsAnim__ThresholdMm = candidate;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Convert a Door Swing Time in Seconds to a Speed Scale
    // ------------------------------------------------------------
    // The door system scales its clock, so a requested duration becomes the
    // ratio of the authored duration to the requested one. Converting against
    // the live base duration means a change to the app config carries through
    // rather than being second-guessed here.
    // ------------------------------------------------------------
    function Na__VsAnim__SecondsToSpeedScale(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0) return null;

        const baseMs = Na__DoorAnimation__GetBaseDurationMs();
        if (!Number.isFinite(baseMs) || baseMs <= 0) return null;

        return baseMs / (seconds * 1000);
    }
    // ------------------------------------------------------------


    // FUNCTION | Report the Threshold a Session Would Use Right Now
    // ------------------------------------------------------------
    // The Dev menu reads this so its distance slider can show the app config
    // value when a video has not overridden it.
    // ------------------------------------------------------------
    function Na__VideoStudio__SceneAnimations__GetThresholdMm() {
        return Na__VsAnim__ThresholdMm;
    }
    // ------------------------------------------------------------


    // FUNCTION | Open an Animation Session
    // ------------------------------------------------------------
    // Pass enabled false to open a no-op session, so callers can wrap their
    // work unconditionally and let the video's own Animations setting decide.
    //
    // options:
    //   doorOpenSeconds {number|null}  Swing time for a single-leaf door
    //   doorDistanceMm  {number|null}  Detection distance; null follows config
    //
    // Always pair with End in a finally block.
    // ------------------------------------------------------------
    function Na__VideoStudio__SceneAnimations__Begin(enabled, options = {}) {
        if (enabled === false) return false;

        const { doorOpenSeconds = null, doorDistanceMm = null } = options;

        Na__VsAnim__SessionCount++;

        if (Na__VsAnim__SessionCount === 1) {
            // DETECTION | Per-video override, else the Walk and Fly threshold.
            // Initialize is called every session because the Walk and Fly
            // controllers only ever call it when their own mode is available
            // for this project, so a model with both disabled would otherwise
            // never have been initialised at all.
            const thresholdMm = (Number.isFinite(doorDistanceMm) && doorDistanceMm > 0)
                ? doorDistanceMm
                : Na__VsAnim__ThresholdMm;

            Na__DoorProximity__Initialize(thresholdMm);
            Na__DoorProximity__SetEnabled(true);
            Na__DoorProximity__SetHoldClosed(false);                         // <-- A landing hold ends here; frames decide from now on

            // SPEED | Snapshot whatever the app was using so interactive Walk
            // and Fly get their own pace back when the session closes.
            Na__VsAnim__RestoreSpeed = Na__DoorAnimation__GetSpeedScale();

            const scale = Na__VsAnim__SecondsToSpeedScale(doorOpenSeconds);
            if (scale !== null) Na__DoorAnimation__SetSpeedScale(scale);

            Na__VsAnim__IsActive = true;
        }

        return true;
    }
    // ------------------------------------------------------------


    // FUNCTION | Close an Animation Session
    // ------------------------------------------------------------
    // Safe to call when no session is open, and safe to call twice.
    // ------------------------------------------------------------
    function Na__VideoStudio__SceneAnimations__End(wasOpened) {
        if (wasOpened === false) return;
        if (Na__VsAnim__SessionCount === 0) return;

        Na__VsAnim__SessionCount--;

        if (Na__VsAnim__SessionCount === 0) {
            Na__DoorProximity__SetEnabled(false);                        // <-- Back to orbit behaviour
            Na__DoorProximity__SetHoldClosed(false);                     // <-- The last frame's keyframe no longer decides
            Na__DoorAnimation__SetSpeedScale(Na__VsAnim__RestoreSpeed);   // <-- Interactive pace restored

            // A video with its own detection distance rewrote the shared
            // threshold, so put the app config value back or the next Walk or
            // Fly session would silently inherit this video's setting.
            Na__DoorProximity__Initialize(Na__VsAnim__ThresholdMm);

            Na__VsAnim__IsActive = false;
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | Report Whether an Animation Session Is Open
    // ------------------------------------------------------------
    function Na__VideoStudio__SceneAnimations__IsActive() {
        return Na__VsAnim__IsActive;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Per-Keyframe Door Animation
// -----------------------------------------------------------------------------

    // FUNCTION | Let Doors Open, or Hold Them Shut, for the Frame Being Drawn
    // ------------------------------------------------------------
    // Called every preview and export frame with the Door Animation tick of
    // the keyframe the clip is passing through: its hold and the travel on to
    // the next keyframe. Unticked, open doors swing shut and none open however
    // close the camera comes. No-op outside a session, where walk and fly own
    // the doors.
    // ------------------------------------------------------------
    function Na__VideoStudio__SceneAnimations__SetDoorsLive(live) {
        if (!Na__VsAnim__IsActive) return;
        Na__DoorProximity__SetHoldClosed(live !== true);
    }
    // ------------------------------------------------------------


    // FUNCTION | Start a Clip With Every Door Shut
    // ------------------------------------------------------------
    // For a run from the top: whatever editing left open is closed at once,
    // not animated, so the first frames never show a door swinging shut that
    // the path never went near. No-op outside a session, so a video with its
    // Animations switched off keeps its doors exactly as they are.
    // ------------------------------------------------------------
    function Na__VideoStudio__SceneAnimations__ResetDoorsClosed() {
        if (!Na__VsAnim__IsActive) return;
        Na__DoorAnimation__SnapAllClosed();
    }
    // ------------------------------------------------------------


    // FUNCTION | Make the Doors Match a Keyframe the Camera Has Landed On
    // ------------------------------------------------------------
    // Editing rather than playback: Go To, a tile double click, a live menu
    // preview. live false: open doors swing shut, and walk or fly proximity
    // cannot open them again until the camera moves about a metre across the
    // floor from the keyframe. live true: any such hold is let go, so walk and
    // fly open the doors round the keyframe as they always do, as the clip
    // will. Ignored while a session runs, because playback decides per frame.
    // ------------------------------------------------------------
    function Na__VideoStudio__SceneAnimations__ApplyLandingDoors(live, anchorPositionUnits) {
        if (Na__VsAnim__IsActive) return;

        if (live === true) {
            Na__DoorProximity__SetHoldClosed(false);
            return;
        }

        Na__DoorProximity__HoldClosedAt(anchorPositionUnits, Na__Math__ConvertMmToUnits(Na__VsAnim__LANDING_RELEASE_MM));
        Na__DoorProximity__CloseAllDoors();                                  // <-- Animated; works in orbit too
    }
    // ------------------------------------------------------------


    // FUNCTION | Hand the Doors Back When Editing Stops
    // ------------------------------------------------------------
    // Called when the Video Studio panel closes or another path is opened, so
    // a hold left by the last keyframe landed on never outlives the edit.
    // ------------------------------------------------------------
    function Na__VideoStudio__SceneAnimations__ReleaseLandingDoors() {
        if (Na__VsAnim__IsActive) return;
        Na__DoorProximity__SetHoldClosed(false);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Scene Animations Session API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__SceneAnimations__SetConfig,
        Na__VideoStudio__SceneAnimations__GetThresholdMm,
        Na__VideoStudio__SceneAnimations__Begin,
        Na__VideoStudio__SceneAnimations__End,
        Na__VideoStudio__SceneAnimations__IsActive,
        Na__VideoStudio__SceneAnimations__SetDoorsLive,
        Na__VideoStudio__SceneAnimations__ResetDoorsClosed,
        Na__VideoStudio__SceneAnimations__ApplyLandingDoors,
        Na__VideoStudio__SceneAnimations__ReleaseLandingDoors
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
