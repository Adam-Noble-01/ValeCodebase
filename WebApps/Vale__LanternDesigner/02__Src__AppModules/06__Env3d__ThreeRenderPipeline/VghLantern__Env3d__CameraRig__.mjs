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

   ============================================================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
    VghLantern__Env3d__ConfigAccess__Section,
    VghLantern__Env3d__ConfigAccess__Value,
    VghLantern__Env3d__ConfigAccess__MmToWorld,
    VghLantern__Env3d__ConfigAccess__PointToWorld
} from './VghLantern__Env3d__ConfigAccess__.mjs';

import { VghLantern__Env3d__SceneManager__Invalidate } from './VghLantern__Env3d__SceneManager__.mjs';

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
    function VghLantern__Env3d__CameraRig__DistanceForRadius(radiusWorld, camera) {
        const fovDegrees  =  camera ? camera.fov : Number(VghLantern__Env3d__ConfigAccess__Value('Camera', 'FieldOfViewDegrees', 38));
        const padding     =  Number(VghLantern__Env3d__ConfigAccess__Value('Camera', 'FitPaddingFactor', 1.35)) || 1.35;
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

    // FUNCTION | Attach Camera and Orbit Controls to a Surface
    // ------------------------------------------------------------
    export function VghLantern__Env3d__CameraRig__Attach(surface) {
        if (!surface) return null;

        const config    =  VghLantern__Env3d__ConfigAccess__Section('Camera');
        const widthPx   =  Math.max(1, surface.HostElement.clientWidth);
        const heightPx  =  Math.max(1, surface.HostElement.clientHeight);

        const camera  =  new THREE.PerspectiveCamera(
            Number(config.FieldOfViewDegrees) || 38,
            widthPx / heightPx,
            VghLantern__Env3d__ConfigAccess__MmToWorld(Number(config.NearPlaneMm) || 50),
            VghLantern__Env3d__ConfigAccess__MmToWorld(Number(config.FarPlaneMm)  || 60000)
        );
        camera.name  =  'VghLantern__Env3d__Camera';

        const controls  =  new OrbitControls(camera, surface.Renderer.domElement);
        controls.enableDamping   =  true;
        controls.dampingFactor   =  Number(config.DampingFactor) || 0.08;
        controls.enablePan       =  config.EnablePan !== false;
        controls.minDistance     =  VghLantern__Env3d__ConfigAccess__MmToWorld(Number(config.MinDistanceMm) || 400);
        controls.maxDistance     =  VghLantern__Env3d__ConfigAccess__MmToWorld(Number(config.MaxDistanceMm) || 40000);
        controls.maxPolarAngle   =  (Number(config.MaxPolarAngleDegrees) || 88) * DEG_TO_RAD;

        surface.Camera    =  camera;
        surface.Controls  =  controls;

        // Damped controls need a frame after the last input, so the draw loop asks
        // the controls each frame whether they are still settling.
        surface.OnBeforeDraw  =  function(activeSurface) {
            const changed  =  activeSurface.Controls ? activeSurface.Controls.update() : false;
            if (changed) VghLantern__Env3d__SceneManager__Invalidate(activeSurface);
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
    export function VghLantern__Env3d__CameraRig__ApplyPreset(surface, presetKey, bounds) {
        if (!surface || !surface.Camera) return;

        const framing      =  VghLantern__Env3d__CameraRig__FramingFromBounds(bounds);
        const targetWorld  =  VghLantern__Env3d__ConfigAccess__PointToWorld(framing.CentreMm);
        const radiusWorld  =  VghLantern__Env3d__ConfigAccess__MmToWorld(framing.RadiusMm);
        const distance     =  VghLantern__Env3d__CameraRig__DistanceForRadius(radiusWorld, surface.Camera);
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
