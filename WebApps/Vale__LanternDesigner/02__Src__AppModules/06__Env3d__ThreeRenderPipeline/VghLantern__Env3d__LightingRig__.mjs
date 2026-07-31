/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | LIGHTING RIG
   =============================================================================

   FILE       : VghLantern__Env3d__LightingRig__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - LightingRig
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Three-point studio lighting for whitecard lantern review
   CREATED    : 30-Jul-2026

   DESCRIPTION:
   - Builds a fixed studio rig: ambient fill, angled key, opposing fill and a
     ground bounce. Deliberately not a physical sky model.
   - The aesthetic target is the Vale whitecard look, matching ValeVision3D's
     PureEngine: even, shadowless, readable. The point is to read the profile
     shapes and bar layout, not to produce a photoreal render.
   - Lights are attached to the helpers group so clearing model groups never
     disturbs them.

   ---------------------------------------------------------------------------

   WHY DIRECTIONAL RATHER THAN POSITIONED LIGHTS:
   Directional lights are scale invariant. A lantern can be 900 mm or 4 m across
   and the lighting reads identically, with no per-model light repositioning.

   ============================================================================= */

import * as THREE from 'three';

import {
    VghLantern__Env3d__ConfigAccess__RequireNumber,
    VghLantern__Env3d__ConfigAccess__RequireString
} from './VghLantern__Env3d__ConfigAccess__.mjs';
import { VghLantern__Env3d__SceneManager__Invalidate } from './VghLantern__Env3d__SceneManager__.mjs';

// =============================================================================
// REGION | 3D Lighting Rig Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Angle Conversion and Rig Naming
    // ------------------------------------------------------------
    const DEG_TO_RAD      =  Math.PI / 180;                                  // <-- Config states angles in degrees
    const RIG_GROUP_NAME  =  'VghLantern__Env3d__LightingRig';               // <-- One group so the rig can be replaced wholesale
    const LIGHT_DISTANCE  =  10;                                             // <-- World units; direction only matters for directional lights
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Light Construction Helpers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Position a Directional Light From Azimuth and Elevation
    // ------------------------------------------------------------
    function VghLantern__Env3d__LightingRig__AimLight(light, azimuthDegrees, elevationDegrees) {
        const azimuthRad    =  (Number(azimuthDegrees)   || 0) * DEG_TO_RAD;
        const elevationRad  =  (Number(elevationDegrees) || 0) * DEG_TO_RAD;
        const horizontal    =  Math.cos(elevationRad) * LIGHT_DISTANCE;

        light.position.set(
            horizontal * Math.sin(azimuthRad),
            Math.sin(elevationRad) * LIGHT_DISTANCE,
            horizontal * Math.cos(azimuthRad)
        );
        light.target.position.set(0, 0, 0);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Build a Named Directional Light
    // ------------------------------------------------------------
    function VghLantern__Env3d__LightingRig__BuildDirectional(name, colour, intensity, azimuth, elevation) {
        const light  =  new THREE.DirectionalLight(new THREE.Color(colour || '#ffffff'), Number(intensity) || 0);
        light.name   =  name;
        VghLantern__Env3d__LightingRig__AimLight(light, azimuth, elevation);
        return light;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rig Assembly
// -----------------------------------------------------------------------------

    // FUNCTION | Attach the Studio Lighting Rig to a Surface
    // ------------------------------------------------------------
    export function VghLantern__Env3d__LightingRig__Attach(surface) {
        if (!surface) return null;

        VghLantern__Env3d__LightingRig__Detach(surface);                      // <-- Never stack two rigs

        const rig  =  new THREE.Group();
        rig.name   =  RIG_GROUP_NAME;

        // AMBIENT FILL | Lifts the shadow side so nothing reads as solid black
        const ambient  =  new THREE.AmbientLight(
            new THREE.Color(VghLantern__Env3d__ConfigAccess__RequireString('Lighting', 'AmbientColour')),
            VghLantern__Env3d__ConfigAccess__RequireNumber('Lighting', 'AmbientIntensity')
        );
        ambient.name  =  'VghLantern__Env3d__Light__Ambient';
        rig.add(ambient);

        // KEY LIGHT | Primary modelling light, high and off to one side
        const key  =  VghLantern__Env3d__LightingRig__BuildDirectional(
            'VghLantern__Env3d__Light__Key',
            VghLantern__Env3d__ConfigAccess__RequireString('Lighting', 'KeyLightColour'),
            VghLantern__Env3d__ConfigAccess__RequireNumber('Lighting', 'KeyLightIntensity'),
            VghLantern__Env3d__ConfigAccess__RequireNumber('Lighting', 'KeyLightAzimuthDegrees'),
            VghLantern__Env3d__ConfigAccess__RequireNumber('Lighting', 'KeyLightElevationDegrees')
        );
        rig.add(key);
        rig.add(key.target);

        // FILL LIGHT | Opposing and lower, keeps the far slope legible
        const fill  =  VghLantern__Env3d__LightingRig__BuildDirectional(
            'VghLantern__Env3d__Light__Fill',
            VghLantern__Env3d__ConfigAccess__RequireString('Lighting', 'FillLightColour'),
            VghLantern__Env3d__ConfigAccess__RequireNumber('Lighting', 'FillLightIntensity'),
            VghLantern__Env3d__ConfigAccess__RequireNumber('Lighting', 'FillLightAzimuthDegrees'),
            VghLantern__Env3d__ConfigAccess__RequireNumber('Lighting', 'FillLightElevationDegrees')
        );
        rig.add(fill);
        rig.add(fill.target);

        // GROUND BOUNCE | Weak uplight so soffits and eaves undersides are not dead
        const bounce  =  VghLantern__Env3d__LightingRig__BuildDirectional(
            'VghLantern__Env3d__Light__GroundBounce',
            VghLantern__Env3d__ConfigAccess__RequireString('Lighting', 'GroundBounceColour'),
            VghLantern__Env3d__ConfigAccess__RequireNumber('Lighting', 'GroundBounceIntensity'),
            0, -70
        );
        rig.add(bounce);
        rig.add(bounce.target);

        surface.Groups.helpers.add(rig);
        VghLantern__Env3d__SceneManager__Invalidate(surface);
        return rig;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove the Lighting Rig From a Surface
    // ------------------------------------------------------------
    export function VghLantern__Env3d__LightingRig__Detach(surface) {
        if (!surface || !surface.Groups || !surface.Groups.helpers) return;

        const existing  =  surface.Groups.helpers.getObjectByName(RIG_GROUP_NAME);
        if (!existing) return;

        surface.Groups.helpers.remove(existing);
        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
