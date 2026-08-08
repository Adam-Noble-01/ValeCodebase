/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | LIGHTING RIG
   =============================================================================

   FILE       : NaAudio__Env3d__LightingRig__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - LightingRig
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Light the space flatly, with one soft contact shadow
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Builds a four part rig into the Environment group: a hemisphere term doing
     most of the work, a soft key that casts the only shadow, a cool fill from the
     opposite side, and a faint rim from behind.
   - No HDRI, deliberately. Image based lighting is what the sibling Lantern
     Designer needs, because a powder-coated aluminium extrusion has to read as
     metal. Nothing here is metal. An environment map on flat matte pigment adds
     nothing visible and costs a 25 MB download and a PMREM pass.

   ---------------------------------------------------------------------------

   ONE SHADOW CASTER, AND WHY

   Only the key light casts. Two casters produce crossed shadows, which in a flat
   composition of primitive shapes reads immediately as a rendering fault rather
   than as lighting. One soft shadow does the single job shadows have here: it
   seats a floating shape onto the floor so the eye can tell where it is standing.

   The shadow camera is a tight orthographic frustum around the working area rather
   than the whole floor. A 2048 map spread over the full 240 unit floor plane gives
   about a metre per texel and the contact shadow disappears entirely.

   ============================================================================= */

import * as THREE from 'three';

import { Env3dNumber, Env3dBool }  from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Palette                from './NaAudio__Env3d__PaletteLibrary__.mjs';
import { NaAudio__Env3d__SceneGroup }  from './NaAudio__Env3d__SceneManager__.mjs';

// =============================================================================
// REGION | Lighting Rig
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Names and Conversion
    // ------------------------------------------------------------
    const DEG_TO_RAD          =  Math.PI / 180;

    const NAME_HEMISPHERE     =  'NaAudio__Env3d__Light__Hemisphere';
    const NAME_AMBIENT        =  'NaAudio__Env3d__Light__Ambient';
    const NAME_KEY            =  'NaAudio__Env3d__Light__Key';
    const NAME_FILL           =  'NaAudio__Env3d__Light__Fill';
    const NAME_RIM            =  'NaAudio__Env3d__Light__Rim';
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Light Placement
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Position a Directional Light From Azimuth and Elevation
    // ------------------------------------------------------------
    function NaAudio__Env3d__LightingRig__Place(light, azimuthDegrees, elevationDegrees, distance) {
        const azimuth     =  azimuthDegrees   * DEG_TO_RAD;
        const elevation   =  elevationDegrees * DEG_TO_RAD;
        const horizontal  =  Math.cos(elevation) * distance;

        light.position.set(
            Math.sin(azimuth) * horizontal,
            Math.sin(elevation) * distance,
            Math.cos(azimuth) * horizontal
        );
        light.target.position.set(0, 0, 0);
        return light;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Configure the Key Light's Shadow Camera
    // ------------------------------------------------------------
    function NaAudio__Env3d__LightingRig__ConfigureShadow(keyLight) {
        const extent  =  Env3dNumber('Lighting', 'KeyShadowFrustumExtent');
        const size    =  Env3dNumber('Renderer', 'ShadowMapSize');

        keyLight.castShadow  =  true;
        keyLight.shadow.mapSize.set(size, size);
        keyLight.shadow.radius  =  Env3dNumber('Lighting', 'KeyShadowRadius');
        keyLight.shadow.bias    =  Env3dNumber('Lighting', 'KeyShadowBias');

        const shadowCamera  =  keyLight.shadow.camera;
        shadowCamera.left    =  -extent;
        shadowCamera.right   =   extent;
        shadowCamera.top     =   extent;
        shadowCamera.bottom  =  -extent;
        shadowCamera.near    =   1;
        shadowCamera.far     =   Env3dNumber('Lighting', 'KeyLightDistance') * 3;
        shadowCamera.updateProjectionMatrix();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Rig Construction
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Lighting Rig Into a Surface's Environment Group
    // ------------------------------------------------------------
    export function NaAudio__Env3d__LightingRig__Build(surface) {
        if (!surface) return null;

        const environment  =  surface.Groups[NaAudio__Env3d__SceneGroup.Environment];

        // HEMISPHERE - the bulk of the light, sky above and paper bounce below
        const hemisphere  =  new THREE.HemisphereLight(
            Palette.NaAudio__Palette__Ground('Cream'),
            Palette.NaAudio__Palette__Ground('PaperShade'),
            Env3dNumber('Lighting', 'HemisphereSkyIntensity')
        );
        hemisphere.name  =  NAME_HEMISPHERE;
        environment.add(hemisphere);

        // AMBIENT - lifts the shadow side just off black
        const ambient  =  new THREE.AmbientLight(
            Palette.NaAudio__Palette__Ground('Paper'),
            Env3dNumber('Lighting', 'AmbientIntensity')
        );
        ambient.name  =  NAME_AMBIENT;
        environment.add(ambient);

        // KEY - the only shadow caster
        const key  =  new THREE.DirectionalLight(
            Palette.NaAudio__Palette__Ground('Cream'),
            Env3dNumber('Lighting', 'KeyLightIntensity')
        );
        key.name  =  NAME_KEY;
        NaAudio__Env3d__LightingRig__Place(
            key,
            Env3dNumber('Lighting', 'KeyLightAzimuthDegrees'),
            Env3dNumber('Lighting', 'KeyLightElevationDegrees'),
            Env3dNumber('Lighting', 'KeyLightDistance')
        );
        if (Env3dBool('Renderer', 'ShadowsEnabled') && Env3dBool('Lighting', 'KeyLightCastsShadow')) {
            NaAudio__Env3d__LightingRig__ConfigureShadow(key);
        }
        environment.add(key);
        environment.add(key.target);                                          // <-- A directional light's target must be in the graph to take effect

        // FILL - cool, from the opposite side, no shadow
        const fill  =  new THREE.DirectionalLight(
            Palette.NaAudio__Palette__Pigment('SlateBlue', 'Base'),
            Env3dNumber('Lighting', 'FillLightIntensity')
        );
        fill.name  =  NAME_FILL;
        NaAudio__Env3d__LightingRig__Place(
            fill,
            Env3dNumber('Lighting', 'FillLightAzimuthDegrees'),
            Env3dNumber('Lighting', 'FillLightElevationDegrees'),
            Env3dNumber('Lighting', 'FillLightDistance')
        );
        environment.add(fill);
        environment.add(fill.target);

        // RIM - from behind, just enough to separate a shape from the backdrop
        const rim  =  new THREE.DirectionalLight(
            Palette.NaAudio__Palette__Ground('Cream'),
            Env3dNumber('Lighting', 'RimLightIntensity')
        );
        rim.name  =  NAME_RIM;
        NaAudio__Env3d__LightingRig__Place(
            rim,
            Env3dNumber('Lighting', 'RimLightAzimuthDegrees'),
            Env3dNumber('Lighting', 'RimLightElevationDegrees'),
            Env3dNumber('Lighting', 'KeyLightDistance')
        );
        environment.add(rim);
        environment.add(rim.target);

        return { Hemisphere: hemisphere, Ambient: ambient, Key: key, Fill: fill, Rim: rim };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
