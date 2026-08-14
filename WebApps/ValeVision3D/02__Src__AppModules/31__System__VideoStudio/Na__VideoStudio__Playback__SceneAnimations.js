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
// INTEGRATION:
// - SetConfig is called once by the Dev menu with the navmode config block.
// - Begin / End wrap preview playback and each export session.
// - IsActive gates the per-frame proximity call in the render loop.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 14-Aug-2026 - Version 1.0.0
// - Initial implementation. Doors now animate during preview and export.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Proximity Door Trigger System
    // ------------------------------------------------------------
    import {
        Na__DoorProximity__Initialize,
        Na__DoorProximity__SetEnabled
    } from '../25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Door Animation Speed Scale
    // ------------------------------------------------------------
    import {
        Na__DoorAnimation__SetSpeedScale,
        Na__DoorAnimation__GetSpeedScale,
        Na__DoorAnimation__GetBaseDurationMs
    } from '../25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Fallback Proximity Threshold
    // ------------------------------------------------------------
    const Na__VsAnim__FALLBACK_THRESHOLD_MM = 6500;   // <-- Matches the shipped Walk and Fly defaults
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
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Scene Animations Session API
    // ------------------------------------------------------------
    export {
        Na__VideoStudio__SceneAnimations__SetConfig,
        Na__VideoStudio__SceneAnimations__GetThresholdMm,
        Na__VideoStudio__SceneAnimations__Begin,
        Na__VideoStudio__SceneAnimations__End,
        Na__VideoStudio__SceneAnimations__IsActive
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
