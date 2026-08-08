/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | CAMERA RIG
   =============================================================================

   FILE       : NaAudio__Env3d__CameraRig__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - CameraRig
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Attach a perspective camera and orbit controls, and fly between views
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Attaches a camera and OrbitControls to a scene surface, sets the default
     framing from config, and provides the preset views and the fly-to-module
     focus move.
   - Navigation refinement is called out in the design manifest as an open
     challenge for professional use. The stance taken here: the mouse does the
     free look, and every named position in the space is reachable by a single
     keystroke, so a producer who has learned the space never has to hunt with the
     mouse. Hotkey binding lives in the HUD; this module supplies the moves.

   ---------------------------------------------------------------------------

   WHY THE FOCUS MOVE IS TWEENED AND NOT SNAPPED

   Snapping the camera to a module is disorienting in a space whose entire premise
   is spatial memory. If the view teleports, the user loses the relationship
   between where they were and where they now are, and the method-of-loci recall
   the manifest is built on stops working.

   The tween is short - under a second - and eased at both ends, which is long
   enough to read as travel and short enough not to feel like a cutscene. It is
   interruptible: any pointer input on the controls cancels it immediately, because
   a camera that ignores the mouse for half a second feels broken.

   ============================================================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { Env3dNumber, Env3dBool, Env3dSection }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import { NaAudio__MusicalMaths__Clamp }          from '../03__AppUtils/NaAudio__AppUtils__MusicalMaths__.mjs';
import { NaAudio__Env3d__SceneManager__AddUpdateHook } from './NaAudio__Env3d__SceneManager__.mjs';
import {
    NaAudio__Event,
    NaAudio__EventBus__Publish
} from '../01__AppCore/NaAudio__AppCore__EventBus__.mjs';

// =============================================================================
// REGION | Camera Rig
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Angle Conversion and Tween State
    // ------------------------------------------------------------
    const DEG_TO_RAD  =  Math.PI / 180;

    const SCRATCH_TARGET    =  new THREE.Vector3();                          // <-- Reused; a fly-to allocates nothing per frame
    const SCRATCH_POSITION  =  new THREE.Vector3();
    const SCRATCH_BOX       =  new THREE.Box3();
    const SCRATCH_SPHERE    =  new THREE.Sphere();
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Spherical Placement Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Place a Camera From Azimuth, Elevation and Distance
    // ------------------------------------------------------------
    // Azimuth is measured around the Y axis from +Z, elevation up from the ground
    // plane. Config states views in these terms because 'thirty-four degrees round
    // and twenty-two up' is something a person can picture, and a raw XYZ triple
    // is not.
    function NaAudio__Env3d__CameraRig__PositionFromOrbit(azimuthDegrees, elevationDegrees, distance, target, out) {
        const azimuth    =  azimuthDegrees   * DEG_TO_RAD;
        const elevation  =  elevationDegrees * DEG_TO_RAD;

        const horizontal  =  Math.cos(elevation) * distance;

        out.set(
            target.x + Math.sin(azimuth) * horizontal,
            target.y + Math.sin(elevation) * distance,
            target.z + Math.cos(azimuth) * horizontal
        );
        return out;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Ease In and Out of a Normalised Progress Value
    // ------------------------------------------------------------
    function NaAudio__Env3d__CameraRig__EaseInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rig Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Attach a Camera and Orbit Controls to a Surface
    // ------------------------------------------------------------
    export function NaAudio__Env3d__CameraRig__Attach(surface) {
        if (!surface) return null;

        const width   =  Math.max(surface.HostElement.clientWidth,  2);
        const height  =  Math.max(surface.HostElement.clientHeight, 2);

        const camera  =  new THREE.PerspectiveCamera(
            Env3dNumber('Camera', 'FieldOfViewDegrees'),
            width / height,
            Env3dNumber('Camera', 'NearPlane'),
            Env3dNumber('Camera', 'FarPlane')
        );

        const controls  =  new OrbitControls(camera, surface.Renderer.domElement);
        controls.enableDamping   =  true;
        controls.dampingFactor   =  Env3dNumber('Camera', 'DampingFactor');
        controls.enablePan       =  Env3dBool('Camera', 'EnablePan');
        controls.panSpeed        =  Env3dNumber('Camera', 'PanSpeed');
        controls.zoomSpeed       =  Env3dNumber('Camera', 'ZoomSpeed');
        controls.minDistance     =  Env3dNumber('Camera', 'MinDistance');
        controls.maxDistance     =  Env3dNumber('Camera', 'MaxDistance');
        controls.minPolarAngle   =  Env3dNumber('Camera', 'MinPolarAngleDegrees') * DEG_TO_RAD;
        controls.maxPolarAngle   =  Env3dNumber('Camera', 'MaxPolarAngleDegrees') * DEG_TO_RAD;
        controls.screenSpacePanning  =  false;                                // <-- Pan stays in the ground plane, so the space cannot drift underfoot

        surface.Camera    =  camera;
        surface.Controls  =  controls;

        surface.CameraTween  =  null;                                         // <-- Set by ApplyPreset and FocusObject

        NaAudio__Env3d__CameraRig__ApplyDefaultView(surface);
        NaAudio__Env3d__CameraRig__AttachTweenInterrupt(surface);
        NaAudio__Env3d__CameraRig__AttachUpdateHook(surface);

        return camera;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Cancel Any Running Tween on User Input
    // ------------------------------------------------------------
    // A camera that ignores the mouse mid-flight feels broken, so the first pointer
    // or wheel event during a tween ends it where it is.
    function NaAudio__Env3d__CameraRig__AttachTweenInterrupt(surface) {
        const cancel  =  () => { surface.CameraTween  =  null; };

        const element  =  surface.Renderer.domElement;
        element.addEventListener('pointerdown', cancel, { passive: true });
        element.addEventListener('wheel',       cancel, { passive: true });
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Drive Damping and Any Running Tween Each Frame
    // ------------------------------------------------------------
    function NaAudio__Env3d__CameraRig__AttachUpdateHook(surface) {
        NaAudio__Env3d__SceneManager__AddUpdateHook(surface, function (delta) {
            NaAudio__Env3d__CameraRig__AdvanceTween(surface, delta);
            surface.Controls.update();                                        // <-- Damping needs this every frame, tween or not
        });
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Named Views
// -----------------------------------------------------------------------------

    // FUNCTION | Apply the Configured Default View Immediately
    // ------------------------------------------------------------
    export function NaAudio__Env3d__CameraRig__ApplyDefaultView(surface) {
        const target  =  SCRATCH_TARGET.set(0, Env3dNumber('Camera', 'DefaultTargetHeight'), 0);

        NaAudio__Env3d__CameraRig__PositionFromOrbit(
            Env3dNumber('Camera', 'DefaultOrbitAzimuthDegrees'),
            Env3dNumber('Camera', 'DefaultOrbitElevationDegrees'),
            Env3dNumber('Camera', 'DefaultDistance'),
            target,
            SCRATCH_POSITION
        );

        surface.Camera.position.copy(SCRATCH_POSITION);
        surface.Controls.target.copy(target);
        surface.Controls.update();
    }
    // ------------------------------------------------------------


    // FUNCTION | Fly to a Named Preset View
    // ------------------------------------------------------------
    export function NaAudio__Env3d__CameraRig__ApplyPreset(surface, presetKey) {
        const presets  =  Env3dSection('PresetViews');
        const preset   =  presets[presetKey];

        if (!preset) {
            console.warn('[NaAudio Env3d] Unknown camera preset "' + presetKey + '". Known: ' + Object.keys(presets).join(', '));
            return;
        }

        const target  =  new THREE.Vector3(0, Env3dNumber('Camera', 'DefaultTargetHeight'), 0);
        const position  =  NaAudio__Env3d__CameraRig__PositionFromOrbit(
            preset.AzimuthDegrees, preset.ElevationDegrees, preset.Distance,
            target, new THREE.Vector3()
        );

        NaAudio__Env3d__CameraRig__StartTween(surface, position, target);
        NaAudio__EventBus__Publish(NaAudio__Event.CameraPresetApplied, { PresetKey: presetKey });
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Available Preset Keys and Labels
    // ------------------------------------------------------------
    export function NaAudio__Env3d__CameraRig__PresetList() {
        const presets  =  Env3dSection('PresetViews');
        return Object.entries(presets).map(([key, preset]) => ({ Key: key, Label: preset.Label }));
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Focus and Framing
// -----------------------------------------------------------------------------

    // FUNCTION | Fly the Camera to Frame a Single Object
    // ------------------------------------------------------------
    // Keeps the current viewing angle and only changes where the camera is looking
    // and how far away it is. Flying to a module and arriving at a different angle
    // than the one you left from is exactly the disorientation this rig is trying
    // to avoid.
    export function NaAudio__Env3d__CameraRig__FocusObject(surface, object3d, moduleId) {
        if (!surface || !object3d) return;

        SCRATCH_BOX.setFromObject(object3d);
        if (SCRATCH_BOX.isEmpty()) return;

        SCRATCH_BOX.getBoundingSphere(SCRATCH_SPHERE);

        const padding   =  Env3dNumber('Camera', 'FocusPaddingFactor');
        const distance  =  NaAudio__MusicalMaths__Clamp(
            SCRATCH_SPHERE.radius * padding,
            Env3dNumber('Camera', 'MinDistance'),
            Env3dNumber('Camera', 'MaxDistance')
        );

        const target    =  SCRATCH_SPHERE.center.clone();
        const direction =  surface.Camera.position.clone().sub(surface.Controls.target).normalize();
        const position  =  target.clone().add(direction.multiplyScalar(distance));

        NaAudio__Env3d__CameraRig__StartTween(surface, position, target);

        if (moduleId) {
            NaAudio__EventBus__Publish(NaAudio__Event.CameraFocusedModule, { ModuleId: moduleId });
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Tween
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Begin a Camera Tween
    // ------------------------------------------------------------
    function NaAudio__Env3d__CameraRig__StartTween(surface, toPosition, toTarget) {
        surface.CameraTween  =  {
            FromPosition : surface.Camera.position.clone(),
            FromTarget   : surface.Controls.target.clone(),
            ToPosition   : toPosition.clone(),
            ToTarget     : toTarget.clone(),
            Elapsed      : 0,
            Duration     : Env3dNumber('Camera', 'FocusFlightSeconds')
        };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Advance a Running Tween by One Frame
    // ------------------------------------------------------------
    function NaAudio__Env3d__CameraRig__AdvanceTween(surface, delta) {
        const tween  =  surface.CameraTween;
        if (!tween) return;

        tween.Elapsed += delta;

        const progress  =  NaAudio__MusicalMaths__Clamp(tween.Elapsed / tween.Duration, 0, 1);
        const eased     =  NaAudio__Env3d__CameraRig__EaseInOut(progress);

        surface.Camera.position.lerpVectors(tween.FromPosition, tween.ToPosition, eased);
        surface.Controls.target.lerpVectors(tween.FromTarget,   tween.ToTarget,   eased);

        if (progress >= 1) surface.CameraTween  =  null;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
