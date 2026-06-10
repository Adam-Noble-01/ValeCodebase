// =============================================================================
// VALEVISION3D - WALK MODE UI CONTROLS
// =============================================================================
//
// FILE       : Na__UiFeature__WalkModeControls.js
// NAMESPACE  : Na__UiFeature
// MODULE     : WalkModeControls
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Walk mode system initialisation and toggle orchestration
// CREATED    : 24-Feb-2026
//
// DESCRIPTION:
// - Initialises the walk mode physics engine and door proximity system.
// - Stores controls, renderer, and device type in module-level state so
//   callers only supply these references once at initialisation time.
// - Provides a single ToggleWalkMode function that activates/deactivates
//   walk mode and fires optional caller-supplied UI callbacks, allowing the
//   test environment (and any future caller) to update its own UI indicators
//   without this module needing any knowledge of them.
// - Routes mode transitions through Na__Navmode__ModeTransition for smooth
//   spatial continuity when switching between orbit and walk.
//
// INTEGRATION:
// - Call Na__UiFeature__InitializeWalkModeSystem() after scene, camera,
//   renderer, and orbit controls are ready.
// - Call Na__UiFeature__ToggleWalkMode() to switch between orbit and walk.
//   Pass onActivate / onDeactivate callbacks for caller-side UI reactions.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 24-Feb-2026 - Version 1.0.0
// - Extracted walk mode init and toggle logic from index.html (lines 487-529)
//   and TestEnv__PrototypeTestingSandbox__Main__.js (lines 339-420).
// - Added onActivate / onDeactivate callback support for caller UI hooks.
//
// 09-Jun-2026 - Version 1.1.0
// - Routed activate/deactivate through Na__Navmode__ModeTransition for smooth
//   camera handoff (orbit position preserved when returning from walk).
// - Added FOV compensation: passes camera ref + walk FOV to ModeTransition so
//   the capsule is nudged forward to counteract the apparent zoom-out from the
//   wider walk FOV compared to the orbit lens.
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Imports
// -----------------------------------------------------------------------------

    // MODULE IMPORTS | Walk Mode System Logic
    // ------------------------------------------------------------
    import {
        Na__WalkMode__Initialize,
        Na__WalkMode__IsActive,
        Na__WalkMode__GetConfig
    } from './Na__Navmode__WalkMode__SystemLogic.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Mode Transition Logic
    // ------------------------------------------------------------
    import {
        Na__ModeTransition__OrbitToWalk,
        Na__ModeTransition__WalkToOrbit
    } from './Na__Navmode__ModeTransition.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Walk Mode Desktop Controls
    // ------------------------------------------------------------
    import { Na__WalkModeDesktop__Activate, Na__WalkModeDesktop__Deactivate } from './Na__Navmode__WalkMode__DesktopControls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Walk Mode Touch Screen Controls
    // ------------------------------------------------------------
    import { Na__WalkModeTouch__Activate, Na__WalkModeTouch__Deactivate } from './Na__Navmode__WalkMode__TouchScreenControls.js';
    // ------------------------------------------------------------

    // MODULE IMPORTS | Door Proximity System
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

    // MODULE VARIABLES | Walk Mode Runtime References
    // ------------------------------------------------------------
    let Na__UiFeature__WalkMode__Camera        = null;   // <-- Camera instance (for transition module)
    let Na__UiFeature__WalkMode__Controls      = null;   // <-- Orbit controls instance
    let Na__UiFeature__WalkMode__Renderer      = null;   // <-- Renderer instance
    let Na__UiFeature__WalkMode__UseTouch      = false;  // <-- Device uses touch controls
    let Na__UiFeature__WalkMode__FovCompScale  = 0;      // <-- FOV compensation scale (0 = disabled)
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | System Initialisation
// -----------------------------------------------------------------------------

    // FUNCTION | Initialize Walk Mode System
    // ------------------------------------------------------------
    function Na__UiFeature__InitializeWalkModeSystem(scene, camera, renderer, controls, walkConfig, useTouchControls, fovCompensationConfig) {
        Na__WalkMode__Initialize(scene, camera, renderer.domElement, walkConfig);  // <-- Init physics engine
        Na__DoorProximity__Initialize(
            walkConfig.Navmode__WalkMode__DoorProximityThresholdMm || 3000        // <-- Door proximity threshold (mm)
        );

        Na__UiFeature__WalkMode__Camera   = camera;             // <-- Store camera ref (for transition module)
        Na__UiFeature__WalkMode__Controls = controls;          // <-- Store orbit controls ref
        Na__UiFeature__WalkMode__Renderer = renderer;          // <-- Store renderer ref
        Na__UiFeature__WalkMode__UseTouch = useTouchControls;  // <-- Store device type flag

        if (fovCompensationConfig && fovCompensationConfig.Navmode__FovCompensation__Enabled) {
            Na__UiFeature__WalkMode__FovCompScale = Number.isFinite(fovCompensationConfig.Navmode__FovCompensation__Scale)
                ? fovCompensationConfig.Navmode__FovCompensation__Scale
                : 0.65;
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Walk Mode Toggle
// -----------------------------------------------------------------------------

    // FUNCTION | Toggle Walk Mode On/Off
    // ------------------------------------------------------------
    function Na__UiFeature__ToggleWalkMode(onActivate, onDeactivate) {
        if (Na__WalkMode__IsActive()) {
            // DEACTIVATE WALK MODE
            if (Na__UiFeature__WalkMode__UseTouch) {
                Na__WalkModeTouch__Deactivate();                               // <-- Remove touch input listeners
            } else {
                Na__WalkModeDesktop__Deactivate();                             // <-- Remove keyboard/mouse listeners
            }
            Na__DoorProximity__SetEnabled(false);                              // <-- Disable door proximity triggers

            Na__ModeTransition__WalkToOrbit(                                   // <-- Reposition orbit camera near walk position
                Na__UiFeature__WalkMode__Camera,
                Na__UiFeature__WalkMode__Controls
            );

            Na__RenderLoop__StopActiveRender('walk-mode');
            Na__RenderLoop__RequestRender();

            if (onDeactivate) onDeactivate();                                  // <-- Fire caller UI callback
        } else {
            // ACTIVATE WALK MODE
            const walkConfig = Na__WalkMode__GetConfig();                      // <-- Read walk config for entry params
            const activated = Na__ModeTransition__OrbitToWalk(                 // <-- Smooth orbit-to-walk transition
                Na__UiFeature__WalkMode__Controls,
                walkConfig.horizontalFovDeg > 0 ? 30 : undefined,             // <-- Clamp pitch to 30deg to avoid floor-stare
                1000,                                                          // <-- Fixed safety nudge 1000mm after ground-snap
                Na__UiFeature__WalkMode__Camera,                               // <-- Camera ref (orbit FOV read before activation)
                walkConfig.horizontalFovDeg,                                   // <-- Walk FOV (target FOV for compensation calc)
                Na__UiFeature__WalkMode__FovCompScale                          // <-- FOV compensation scale (0 = disabled)
            );

            if (activated) {
                if (Na__UiFeature__WalkMode__UseTouch) {
                    Na__WalkModeTouch__Activate(Na__UiFeature__WalkMode__Renderer.domElement, walkConfig); // <-- Touch input
                } else {
                    Na__WalkModeDesktop__Activate(Na__UiFeature__WalkMode__Renderer.domElement, walkConfig); // <-- Keyboard/mouse input
                }
                Na__DoorProximity__SetEnabled(true);                           // <-- Enable door proximity triggers
                Na__RenderLoop__RequestActiveRender('walk-mode');

                if (onActivate) onActivate();                                  // <-- Fire caller UI callback
            }
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | Walk Mode Controls API
    // ------------------------------------------------------------
    export {
        Na__UiFeature__InitializeWalkModeSystem,
        Na__UiFeature__ToggleWalkMode
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
