// =============================================================================
// VALEVISION3D - FLY MODE UI CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__FlyModeControls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : FlyModeControls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Fly mode system initialisation and toggle orchestration
// CREATED    : 09-Jun-2026
//
// DESCRIPTION:
// - Initialises the fly mode camera engine and re-uses the existing door
//   proximity system so doors automatically open as the user flies past them
//   (matching walk mode behaviour).
// - Stores controls, renderer, and device type in module-level state so
//   callers only supply these references once at initialisation time.
// - Provides a single ToggleFlyMode function that activates / deactivates
//   fly mode and fires optional caller-supplied UI callbacks so the index
//   shell can update its own status indicators without this module knowing
//   anything about them.
// - Ported from TrueVision3D (25-May-2026).
//
// INTEGRATION:
// - Call Na__UiFeature__InitializeFlyModeSystem() after scene, camera,
//   renderer, and orbit controls are ready.
// - Call Na__UiFeature__ToggleFlyMode() to switch between orbit and fly.
//   Pass onActivate / onDeactivate callbacks for caller-side UI reactions.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Ported from   : TrueVision3D 02__Src__AppModules/10__NavigationAndCameras/Na__UiFeature__FlyModeControls.js
//                   (its 1.0.0 of 25-May-2026, as this file's 1.0.0 on 09-Jun-2026); TrueVision's later work
//                   comes back hunk by hunk
// - Source version: 1.0.1 (TrueVision3D v2.112.0, 21-Sep-2026; read at b2aa9151) - its render-loop release,
//                   the one hunk the 1.1.1 entry names
// - Ported on     : 02-Oct-2026 for ValeVision3D {{VVREL:W1-36}}
// - Parity        : adapted (hunk replay; this app's own 1.1.0 stays)
// - Divergences   :
//   - FOV compensation (this app's 1.1.0): Initialize takes a seventh argument, fovCompensationConfig,
//     and the orbit-to-fly transition is handed the camera, the fly FOV and the compensation scale, so
//     the fly config is read before the transition rather than after it succeeds.
//   - The header is this app's: CREATED is its port date, DESCRIPTION names the port, and the log keeps
//     this app's versions. Banner reads ValeVision3D. (No console output in this file.)
// - Back-port     : the FOV compensation could be offered to TrueVision through the TrueVision lane
//                   (DR-36); not done here.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 02-Oct-2026 - Version 1.1.1 ({{VVREL:W1-36}})
// - Leaving Fly now stops the 'fly-mode' active render it asked for on the
//   way in. Nothing ever stopped it, so after one flight the render loop kept
//   drawing every frame for the rest of the session, idle or not; the Walk
//   controls already let theirs go. From TrueVision3D 1.0.1 (v2.112.0).
// - The log runs newest first, as the logs of files ported from TrueVision
//   do.
//
// 09-Jun-2026 - Version 1.1.0
// - Added FOV compensation: passes camera ref + fly FOV to ModeTransition so
//   the camera is nudged forward before activation to counteract the apparent
//   zoom-out from the wider fly FOV compared to the orbit lens.
//
// 09-Jun-2026 - Version 1.0.0
// - Ported from TrueVision3D Na__UiFeature__FlyModeControls.js.
// - Re-headered for ValeVision3D namespace.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Fly Mode System Logic
    // ------------------------------------------------------------
    import {
        Na__FlyMode__Initialize,
        Na__FlyMode__IsActive,
        Na__FlyMode__GetConfig
    } from './Na__Navmode__FlyMode__SystemLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Mode Transition Logic
    // ------------------------------------------------------------
    import {
        Na__ModeTransition__OrbitToFly,
        Na__ModeTransition__FlyToOrbit
    } from './Na__Navmode__ModeTransition.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fly Mode Desktop Controls
    // ------------------------------------------------------------
    import { Na__FlyModeDesktop__Activate, Na__FlyModeDesktop__Deactivate } from './Na__Navmode__FlyMode__DesktopControls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Fly Mode Touch Screen Controls
    // ------------------------------------------------------------
    import { Na__FlyModeTouch__Activate, Na__FlyModeTouch__Deactivate } from './Na__Navmode__FlyMode__TouchScreenControls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Door Proximity System (Shared With Walk Mode)
    // ------------------------------------------------------------
    import {
        Na__DoorProximity__Initialize,
        Na__DoorProximity__SetEnabled
    } from '../25__System__3dObject__InteractionSystem/3dObjectInteraction__Animation__WalkMode__ProximityToOpenDoors__.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Render Loop Invalidation
    // ------------------------------------------------------------
    import {
        Na__RenderLoop__RequestActiveRender,
        Na__RenderLoop__StopActiveRender,
        Na__RenderLoop__RequestRender
    } from '../05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Fly Mode Runtime References
    // ------------------------------------------------------------
    let Na__UiFeature__FlyMode__Camera                 = null;   // <-- Camera instance (for transition module)
    let Na__UiFeature__FlyMode__Controls               = null;   // <-- Orbit controls instance
    let Na__UiFeature__FlyMode__Renderer               = null;   // <-- Renderer instance
    let Na__UiFeature__FlyMode__UseTouch               = false;  // <-- Device uses touch controls
    let Na__UiFeature__FlyMode__DoorProximityEnabled   = true;   // <-- Allow proximity door opening
    let Na__UiFeature__FlyMode__FovCompScale           = 0;      // <-- FOV compensation scale (0 = disabled)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | System Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Fly Mode System
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeFlyModeSystem(scene, camera, renderer, controls, flyConfig, useTouchControls, fovCompensationConfig) {
        Na__FlyMode__Initialize(scene, camera, renderer.domElement, flyConfig);  // <-- Init fly camera engine

        // Door proximity is a shared system: it will already be initialised by
        // walk mode in most boot flows, but calling Initialize again is a no-op
        // beyond updating the threshold so the fly-mode proximity distance is
        // honoured whenever fly mode owns the camera.
        if (flyConfig && Number.isFinite(flyConfig.Navmode__FlyMode__DoorProximityThresholdMm)) {
            Na__DoorProximity__Initialize(flyConfig.Navmode__FlyMode__DoorProximityThresholdMm);
        }

        Na__UiFeature__FlyMode__Camera   = camera;                               // <-- Store camera ref (for transition module)
        Na__UiFeature__FlyMode__Controls = controls;                             // <-- Store orbit controls ref
        Na__UiFeature__FlyMode__Renderer = renderer;                             // <-- Store renderer ref
        Na__UiFeature__FlyMode__UseTouch = useTouchControls;                     // <-- Store device type flag

        if (flyConfig && typeof flyConfig.Navmode__FlyMode__DoorProximityEnabled === 'boolean') {
            Na__UiFeature__FlyMode__DoorProximityEnabled = flyConfig.Navmode__FlyMode__DoorProximityEnabled;
        }

        if (fovCompensationConfig && fovCompensationConfig.Navmode__FovCompensation__Enabled) {
            Na__UiFeature__FlyMode__FovCompScale = Number.isFinite(fovCompensationConfig.Navmode__FovCompensation__Scale)
                ? fovCompensationConfig.Navmode__FovCompensation__Scale
                : 0.65;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fly Mode Toggle
// -----------------------------------------------------------------------------

    // FUNCTION | Toggle Fly Mode On/Off
    // ------------------------------------------------------------
    function Na__UiFeature__ToggleFlyMode(onActivate, onDeactivate) {
        if (Na__FlyMode__IsActive()) {
            // DEACTIVATE FLY MODE
            if (Na__UiFeature__FlyMode__UseTouch) {
                Na__FlyModeTouch__Deactivate();                                  // <-- Remove touch input listeners
            } else {
                Na__FlyModeDesktop__Deactivate();                                // <-- Remove keyboard/mouse listeners
            }
            Na__DoorProximity__SetEnabled(false);                                // <-- Disable door proximity triggers

            Na__ModeTransition__FlyToOrbit(                                      // <-- Reposition orbit camera near fly position
                Na__UiFeature__FlyMode__Camera,
                Na__UiFeature__FlyMode__Controls
            );

            Na__RenderLoop__StopActiveRender('fly-mode');                        // <-- Let go of the continuous frames asked for on the way in
            Na__RenderLoop__RequestRender();                                     // <-- Redraw once after returning to orbit mode
            if (onDeactivate) onDeactivate();                                    // <-- Fire caller UI callback
        } else {
            // ACTIVATE FLY MODE
            const flyConfig = Na__FlyMode__GetConfig();                          // <-- Read fly config for FOV compensation
            const activated = Na__ModeTransition__OrbitToFly(
                Na__UiFeature__FlyMode__Controls,
                Na__UiFeature__FlyMode__Camera,                                  // <-- Camera ref (orbit FOV read before activation)
                flyConfig.horizontalFovDeg,                                      // <-- Fly FOV (target FOV for compensation calc)
                Na__UiFeature__FlyMode__FovCompScale                             // <-- FOV compensation scale (0 = disabled)
            );
            if (activated) {
                if (Na__UiFeature__FlyMode__UseTouch) {
                    Na__FlyModeTouch__Activate(Na__UiFeature__FlyMode__Renderer.domElement, flyConfig);
                } else {
                    Na__FlyModeDesktop__Activate(Na__UiFeature__FlyMode__Renderer.domElement, flyConfig);
                }

                if (Na__UiFeature__FlyMode__DoorProximityEnabled) {
                    Na__DoorProximity__SetEnabled(true);                         // <-- Enable door proximity triggers
                }

                Na__RenderLoop__RequestActiveRender('fly-mode');                 // <-- Fly mode requires continuous frames while active
                if (onActivate) onActivate();                                    // <-- Fire caller UI callback
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Fly Mode Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeFlyModeSystem,
        Na__UiFeature__ToggleFlyMode
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
