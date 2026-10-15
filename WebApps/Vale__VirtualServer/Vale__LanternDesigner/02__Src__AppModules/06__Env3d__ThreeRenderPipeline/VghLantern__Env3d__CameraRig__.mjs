/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | CAMERA RIG
   =============================================================================

   FILE       : VghLantern__Env3d__CameraRig__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - CameraRig
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Perspective camera, orbit controls and preset view framing
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Attaches a perspective camera and OrbitControls to a scene surface.
   - Frames the model from the solved skeleton bounds rather than from arbitrary
     numbers, so a 900 mm lantern and a 4 m lantern both fill the viewport the
     same way.
   - Provides the four preset views the drawing sheet needs: isometric, front
     elevation, side elevation and plan.
   - Feeds the on-demand draw loop: controls changes invalidate the surface, so
     the camera never keeps the GPU busy once movement settles.

   ---------------------------------------------------------------------------

   FRAMING MODEL:
   Orbit target is the centre of the model bounds. Distance is derived from the
   bounding sphere radius and the camera field of view, multiplied by the config
   FitPaddingFactor. That gives a consistent visual margin at any lantern size.

   ---------------------------------------------------------------------------

   BELOW GROUND ORBIT:
   Every surface is clamped just above the horizon by default, because a drawing
   sheet viewport or the editor's working panel photographed from underneath is
   never what was wanted. The full-screen 3D View opts out by mounting with
   AllowBelowGroundOrbit, which is the one surface whose job is inspection: the
   underside of a lantern is where the glazing bar soffits, the ridge block and
   the builders upstand reveal actually read. That surface also drops the ground
   grid while the eye is under it, since from below the grid draws straight
   across the thing the view was moved to see.

   ============================================================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
    VghLantern__Env3d__ConfigAccess__Section,
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__PointToWorld,
    VghLantern__Env3d__ConfigAccess__RequireNumber,
    VghLantern__Env3d__ConfigAccess__RequireBoolean
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import {
    VghLantern__Env3d__SceneManager__Invalidate,
    VghLantern__Env3d__SceneManager__SetGroundGridSuppressed,
    VghLantern__Env3d__GroundGridSuppressReason
} from './VghLantern__Env3d__SceneManager__.mjs';

// =============================================================================
// REGION | 3D Camera Rig Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Framing Guards and Angle Conversion
    // ------------------------------------------------------------
    const DEG_TO_RAD          =  Math.PI / 180;                              // <-- Config states angles in degrees
    const MIN_FRAME_RADIUS_MM =  200;                                        // <-- Stops a degenerate model collapsing the camera
    const DEFAULT_TARGET_MM   =  { x: 0, y: 0, z: 600 };                     // <-- Sensible aim point with no model loaded
    const GROUND_WORLD_Y      =  0;                                          // <-- The grid helper sits at the scene origin and model +Z up maps to world +Y, so the ground plane is y = 0
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Bounds and Framing Maths
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Derive Model Centre and Radius From Skeleton Bounds
    // ------------------------------------------------------------
    function VghLantern__Env3d__CameraRig__FramingFromBounds(bounds) {
        if (!bounds) {
            return { CentreMm : DEFAULT_TARGET_MM, RadiusMm : MIN_FRAME_RADIUS_MM * 4 };
        }

        const centreMm  =  {
            x : (bounds.MinX + bounds.MaxX) / 2,
            y : (bounds.MinY + bounds.MaxY) / 2,
            z : (bounds.MinZ + bounds.MaxZ) / 2
        };

        const spanX  =  Math.abs(bounds.MaxX - bounds.MinX);
        const spanY  =  Math.abs(bounds.MaxY - bounds.MinY);
        const spanZ  =  Math.abs(bounds.MaxZ - bounds.MinZ);
        const radius =  Math.sqrt(spanX * spanX + spanY * spanY + spanZ * spanZ) / 2;

        return { CentreMm : centreMm, RadiusMm : Math.max(radius, MIN_FRAME_RADIUS_MM) };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Camera Distance Needed to Fit a Radius
    // ------------------------------------------------------------
    // paddingOverride lets the snapshot exporter frame tighter than the live view
    // without disturbing the interactive camera config.
    function VghLantern__Env3d__CameraRig__DistanceForRadius(radiusWorld, camera, paddingOverride) {
        const fovDegrees  =  camera ? camera.fov : VghLantern__Env3d__ConfigAccess__RequireNumber('Camera', 'FieldOfViewDegrees');
        const padding     =  (typeof paddingOverride === 'number' && paddingOverride > 0)
            ? paddingOverride
            : VghLantern__Env3d__ConfigAccess__RequireNumber('Camera', 'FitPaddingFactor');
        const halfFovRad  =  (fovDegrees * DEG_TO_RAD) / 2;

        // Correct for narrow viewports, where horizontal field is the binding constraint.
        const aspect       =  (camera && camera.aspect > 0) ? camera.aspect : 1;
        const aspectFactor =  aspect < 1 ? (1 / aspect) : 1;

        return (radiusWorld / Math.sin(halfFovRad)) * padding * aspectFactor;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Convert Orbit Angles to a Unit Direction Vector
    // ------------------------------------------------------------
    function VghLantern__Env3d__CameraRig__DirectionFromAngles(azimuthDegrees, elevationDegrees) {
        const azimuthRad    =  azimuthDegrees   * DEG_TO_RAD;
        const elevationRad  =  elevationDegrees * DEG_TO_RAD;
        const horizontal    =  Math.cos(elevationRad);

        return new THREE.Vector3(
            horizontal * Math.sin(azimuthRad),                               // <-- World X
            Math.sin(elevationRad),                                          // <-- World Y is up
            horizontal * Math.cos(azimuthRad)                                // <-- World Z toward the viewer at azimuth 0
        ).normalize();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rig Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Resolve the Orbit Clamp This Surface Is Allowed
    // ------------------------------------------------------------
    // The below-ground clamp is taken through Math.max so it can only ever open the
    // orbit further than the standard one, never tighten it. A config edit that put
    // the two the wrong way round would otherwise lock the opted-in surface into a
    // narrower arc than the surfaces it is meant to be freer than.
    function VghLantern__Env3d__CameraRig__MaxPolarAngleRad(allowBelowGround) {
        const standardDegrees  =  VghLantern__Env3d__ConfigAccess__RequireNumber('Camera', 'MaxPolarAngleDegrees');
        if (!allowBelowGround) return standardDegrees * DEG_TO_RAD;

        const belowDegrees  =  VghLantern__Env3d__ConfigAccess__RequireNumber('Camera', 'BelowGroundMaxPolarAngleDegrees');
        return Math.max(standardDegrees, belowDegrees) * DEG_TO_RAD;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Drop the Ground Grid While the Eye Is Under It
    // ------------------------------------------------------------
    // Called from the draw loop rather than from the orbit events, so it holds for
    // every way the camera can move - orbit, pan, dolly, preset and reframe alike -
    // instead of only for the paths that remember to ask. The suppression call is a
    // no-op once the state has settled, so an idle surface still draws nothing.
    function VghLantern__Env3d__CameraRig__SyncGroundGridToEye(surface) {
        if (!surface.HideGroundGridBelowEye || !surface.Camera) return;      // <-- Not an opted-in surface: the clamp already keeps it above ground

        VghLantern__Env3d__SceneManager__SetGroundGridSuppressed(
            surface,
            VghLantern__Env3d__GroundGridSuppressReason.BelowGround,
            surface.Camera.position.y < GROUND_WORLD_Y
        );
    }
    // ------------------------------------------------------------


    // FUNCTION | Attach Camera and Orbit Controls to a Surface
    // ------------------------------------------------------------
    // options.AllowBelowGroundOrbit lets this surface orbit under the ground plane
    // to inspect the underside of the lantern. Omitted everywhere except the
    // full-screen 3D View, so the editor panel and the sheet viewports keep the
    // above-the-horizon clamp they are drawn with.
    export function VghLantern__Env3d__CameraRig__Attach(surface, options) {
        if (!surface) return null;

        const rigOptions        =  options || {};
        const allowBelowGround  =  rigOptions.AllowBelowGroundOrbit === true;

        const widthPx   =  Math.max(1, surface.HostElement.clientWidth);
        const heightPx  =  Math.max(1, surface.HostElement.clientHeight);

        const camera  =  new THREE.PerspectiveCamera(
            VghLantern__Env3d__ConfigAccess__RequireNumber('Camera', 'FieldOfViewDegrees'),
            widthPx / heightPx,
            VghLantern__Env3d__ConfigAccess__MmToWorld(VghLantern__Env3d__ConfigAccess__RequireNumber('Camera', 'NearPlaneMm')),
            VghLantern__Env3d__ConfigAccess__MmToWorld(VghLantern__Env3d__ConfigAccess__RequireNumber('Camera', 'FarPlaneMm'))
        );
        camera.name  =  'VghLantern__Env3d__Camera';

        const controls  =  new OrbitControls(camera, surface.Renderer.domElement);
        controls.enableDamping   =  true;
        controls.dampingFactor   =  VghLantern__Env3d__ConfigAccess__RequireNumber('Camera', 'DampingFactor');
        controls.enablePan       =  VghLantern__Env3d__ConfigAccess__RequireBoolean('Camera', 'EnablePan');
        controls.minDistance     =  VghLantern__Env3d__ConfigAccess__MmToWorld(VghLantern__Env3d__ConfigAccess__RequireNumber('Camera', 'MinDistanceMm'));
        controls.maxDistance     =  VghLantern__Env3d__ConfigAccess__MmToWorld(VghLantern__Env3d__ConfigAccess__RequireNumber('Camera', 'MaxDistanceMm'));
        controls.maxPolarAngle   =  VghLantern__Env3d__CameraRig__MaxPolarAngleRad(allowBelowGround);

        surface.Camera                 =  camera;
        surface.Controls               =  controls;
        surface.AllowBelowGroundOrbit  =  allowBelowGround;

        // Resolved once here rather than read per frame: config is in hand by mount
        // time, and this runs on every tick of every surface's draw loop.
        surface.HideGroundGridBelowEye  =  allowBelowGround &&
            VghLantern__Env3d__ConfigAccess__RequireBoolean('GroundPlane', 'HideGridWhenCameraBelow');

        // Damped controls need a frame after the last input, so the draw loop asks
        // the controls each frame whether they are still settling.
        surface.OnBeforeDraw  =  function(activeSurface) {
            const changed  =  activeSurface.Controls ? activeSurface.Controls.update() : false;
            if (changed) VghLantern__Env3d__SceneManager__Invalidate(activeSurface);
            VghLantern__Env3d__CameraRig__SyncGroundGridToEye(activeSurface);
        };

        controls.addEventListener('change', function() {
            VghLantern__Env3d__SceneManager__Invalidate(surface);
        });

        VghLantern__Env3d__CameraRig__ApplyPreset(surface, 'isometric', null);
        return camera;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | View Framing
// -----------------------------------------------------------------------------

    // FUNCTION | Frame the Camera on Solved Skeleton Bounds
    // ------------------------------------------------------------
    export function VghLantern__Env3d__CameraRig__FrameBounds(surface, bounds) {
        if (!surface || !surface.Camera) return;

        const framing      =  VghLantern__Env3d__CameraRig__FramingFromBounds(bounds);
        const targetWorld  =  VghLantern__Env3d__ConfigAccess__PointToWorld(framing.CentreMm);
        const radiusWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(framing.RadiusMm);
        const distance     =  VghLantern__Env3d__CameraRig__DistanceForRadius(radiusWorld, surface.Camera);

        const currentDir   =  new THREE.Vector3()
            .subVectors(surface.Camera.position, surface.Controls.target);

        // Preserve the user's current orbit angle if they have one, else use isometric.
        const direction  =  currentDir.lengthSq() > 0
            ? currentDir.normalize()
            : VghLantern__Env3d__CameraRig__PresetDirection('isometric');

        surface.Controls.target.set(targetWorld.x, targetWorld.y, targetWorld.z);
        surface.Camera.position.copy(surface.Controls.target).addScaledVector(direction, distance);
        surface.Camera.updateProjectionMatrix();
        surface.Controls.update();

        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Unit Direction for a Named Preset View
    // ------------------------------------------------------------
    function VghLantern__Env3d__CameraRig__PresetDirection(presetKey) {
        const presets  =  VghLantern__Env3d__ConfigAccess__Section('PresetViews');
        const preset   =  presets ? presets[presetKey] : null;

        const azimuth    =  preset ? Number(preset.AzimuthDegrees)   : 38;
        const elevation  =  preset ? Number(preset.ElevationDegrees) : 24;

        return VghLantern__Env3d__CameraRig__DirectionFromAngles(azimuth, elevation);
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply a Named Preset View, Optionally Reframing on Bounds
    // ------------------------------------------------------------
    // fitPaddingOverride is optional; the snapshot exporter passes its own tighter
    // framing factor while interactive callers omit it.
    export function VghLantern__Env3d__CameraRig__ApplyPreset(surface, presetKey, bounds, fitPaddingOverride) {
        if (!surface || !surface.Camera) return;

        const framing      =  VghLantern__Env3d__CameraRig__FramingFromBounds(bounds);
        const targetWorld  =  VghLantern__Env3d__ConfigAccess__PointToWorld(framing.CentreMm);
        const radiusWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(framing.RadiusMm);
        const distance     =  VghLantern__Env3d__CameraRig__DistanceForRadius(radiusWorld, surface.Camera, fitPaddingOverride);
        const direction    =  VghLantern__Env3d__CameraRig__PresetDirection(presetKey);

        surface.Controls.target.set(targetWorld.x, targetWorld.y, targetWorld.z);
        surface.Camera.position.copy(surface.Controls.target).addScaledVector(direction, distance);
        surface.Camera.updateProjectionMatrix();
        surface.Controls.update();

        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | List the Available Preset View Keys and Labels
    // ------------------------------------------------------------
    export function VghLantern__Env3d__CameraRig__ListPresets() {
        const presets  =  VghLantern__Env3d__ConfigAccess__Section('PresetViews');
        const keys     =  presets ? Object.keys(presets) : [];
        const list     =  [];

        for (let i = 0; i < keys.length; i++) {
            list.push({ Key : keys[i], Label : presets[keys[i]].Label || keys[i] });
        }
        return list;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
