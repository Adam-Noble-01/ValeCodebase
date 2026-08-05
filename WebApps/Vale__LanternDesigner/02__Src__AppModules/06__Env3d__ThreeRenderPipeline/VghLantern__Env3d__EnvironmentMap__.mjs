/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | ENVIRONMENT MAP (IBL)
   =============================================================================

   FILE       : VghLantern__Env3d__EnvironmentMap__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - EnvironmentMap
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Load the shared HDR skydome and light the scene from it
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - Loads the same 1024p autumn field skydome ValeVision3D's MaxEngine uses, so
     a lantern reviewed here and the same lantern dropped into a ValeVision scene
     are lit by the same sky.
   - The HDR is converted to a pre-filtered radiance map with PMREMGenerator and
     assigned to scene.environment, which is what a metalness / roughness
     material needs in order to have anything to reflect.

   ---------------------------------------------------------------------------

   WHY THIS FIXES DARK FINISHES:
   A MeshStandardMaterial with no environment map has nothing to reflect, so all
   its brightness has to come from direct lights. A dark powder coat is mostly
   specular response - anthracite grey is a near-black diffuse with a sheen - so
   with direct lights alone it collapses to near-black and reads as a silhouette
   rather than a surface. The environment map gives that sheen something to pick
   up, which lifts the finish without washing the pale ones out.

   The materials already carry EnvMapIntensity values from the PBR config; they
   simply had no environment to apply them to until now.

   LIGHT BALANCE:
   Image based lighting supplies omnidirectional fill of its own, so the studio
   rig is dimmed rather than left at full strength once the HDR lands - otherwise
   the two stack and every surface washes out flat. The key light is kept, at
   reduced strength, because it is what gives the glazing bars their edge
   definition; the HDR alone lights evenly and reads soft.

   LOADING IS ASYNCHRONOUS AND NON-BLOCKING:
   The viewport draws immediately with the studio rig and re-renders when the
   1.5 MB HDR arrives. One decode is shared by every surface.

   ============================================================================= */

import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import {
    VghLantern__Env3d__ConfigAccess__Section,
    VghLantern__Env3d__ConfigAccess__Value
} from './VghLantern__Env3d__ConfigAccess__.mjs';
import { VghLantern__Env3d__SceneManager__Invalidate } from './VghLantern__Env3d__SceneManager__.mjs';
import { VghLantern__Env3d__MaterialLibrary__ApplyEnvironmentToGlazing } from './VghLantern__Env3d__MaterialLibrary__.mjs';

// =============================================================================
// REGION | Environment Map Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Angle Conversion
    // ------------------------------------------------------------
    const DEG_TO_RAD  =  Math.PI / 180;                                      // <-- Config states the sky rotation in degrees
    // ------------------------------------------------------------


    // MODULE VARIABLES | Shared HDR Source and Per-Renderer Radiance Maps
    // ------------------------------------------------------------
    // THE SPLIT MATTERS. The decoded equirectangular HDR is a CPU-side image and
    // is genuinely shareable, so it downloads and decodes exactly once.
    //
    // The pre-filtered radiance map is not. PMREMGenerator is constructed around
    // one WebGLRenderer and hands back a render target living in that renderer's
    // GL context. Every 3D surface in this app builds its own WebGLRenderer, so
    // handing one surface's radiance map to another gives that surface a texture
    // its context cannot resolve - it renders as though there were no
    // environment at all, while its studio rig has already been dimmed on the
    // assumption that there is one. That is exactly why the drawing sheet and
    // the 3D tab came out darker than the configurator viewport, which happened
    // to be the surface that generated the map.
    //
    // So: one source, one radiance map per renderer, keyed weakly so a disposed
    // renderer takes its map with it.
    let VghLantern__Env3d__EnvironmentMap__SourcePromise  =  null;
    let VghLantern__Env3d__EnvironmentMap__PerRenderer    =  new WeakMap();
    let VghLantern__Env3d__EnvironmentMap__Failed         =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Config Reading
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Read the Environment Config Block
    // ------------------------------------------------------------
    function VghLantern__Env3d__EnvironmentMap__Config() {
        return VghLantern__Env3d__ConfigAccess__Section('Environment') || {};
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Read a Numeric Environment Setting with a Stated Default
    // ------------------------------------------------------------
    // Unlike the Require* helpers this does not log a config gap, because every
    // value here is genuinely optional: the environment is an enhancement over
    // the studio rig, not a requirement of it.
    function VghLantern__Env3d__EnvironmentMap__Number(fieldName, fallbackValue) {
        const value  =  VghLantern__Env3d__ConfigAccess__Value('Environment', fieldName);
        return (typeof value === 'number' && isFinite(value)) ? value : fallbackValue;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether the Environment Map Is Enabled in Config
    // ------------------------------------------------------------
    export function VghLantern__Env3d__EnvironmentMap__IsEnabled() {
        return VghLantern__Env3d__EnvironmentMap__Config().Enabled === true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | HDR Loading
// -----------------------------------------------------------------------------

    // SUB FUNCTION | Download and Decode the Equirectangular HDR Once
    // ------------------------------------------------------------
    // CPU side and context free, so every renderer filters from this one source
    // and the 1.5 MB download happens exactly once per session.
    function VghLantern__Env3d__EnvironmentMap__LoadSource() {
        if (VghLantern__Env3d__EnvironmentMap__SourcePromise) {
            return VghLantern__Env3d__EnvironmentMap__SourcePromise;
        }

        const hdriUrl  =  VghLantern__Env3d__EnvironmentMap__Config().HdriUrl;
        if (!hdriUrl) {
            console.warn('[VghLantern Env3d] Environment enabled but no HdriUrl in Na__Env3d__Config.json -> VghLantern__Env3d__Config__Environment.');
            VghLantern__Env3d__EnvironmentMap__Failed  =  true;
            return Promise.resolve(null);
        }

        VghLantern__Env3d__EnvironmentMap__SourcePromise  =  (async function() {
            try {
                const hdrTexture    =  await new RGBELoader().loadAsync(hdriUrl);
                hdrTexture.mapping  =  THREE.EquirectangularReflectionMapping;
                console.log('[VghLantern Env3d] HDR environment source decoded:', hdriUrl);
                return hdrTexture;

            } catch (error) {
                // A missing sky is a downgrade, not a failure: the studio rig
                // still lights the model, so this warns and carries on.
                console.warn('[VghLantern Env3d] HDR environment failed to load - falling back to studio lighting only:', error);
                VghLantern__Env3d__EnvironmentMap__Failed  =  true;
                return null;
            }
        })();

        return VghLantern__Env3d__EnvironmentMap__SourcePromise;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Get This Renderer's Own Pre-Filtered Radiance Map
    // ------------------------------------------------------------
    // Filtering is cheap next to the download - it is a handful of GPU passes on
    // an already resident image - so every surface paying for its own is the
    // right trade against every surface after the first rendering unlit.
    async function VghLantern__Env3d__EnvironmentMap__LoadForRenderer(renderer) {
        if (!renderer) return null;
        if (VghLantern__Env3d__EnvironmentMap__Failed) return null;

        const existing  =  VghLantern__Env3d__EnvironmentMap__PerRenderer.get(renderer);
        if (existing) return existing;

        const source  =  await VghLantern__Env3d__EnvironmentMap__LoadSource();
        if (!source) return null;

        // Re-check after the await: a concurrent mount on the same renderer may
        // have filtered it while this call was waiting on the download.
        const raced  =  VghLantern__Env3d__EnvironmentMap__PerRenderer.get(renderer);
        if (raced) return raced;

        let pmremGenerator  =  null;
        try {
            pmremGenerator  =  new THREE.PMREMGenerator(renderer);
            const target    =  pmremGenerator.fromEquirectangular(source);

            VghLantern__Env3d__EnvironmentMap__PerRenderer.set(renderer, target.texture);
            return target.texture;

        } catch (error) {
            console.warn('[VghLantern Env3d] Radiance map could not be filtered for this surface - it falls back to studio lighting:', error);
            return null;

        } finally {
            if (pmremGenerator) pmremGenerator.dispose();
        }
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Surface Application
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Studio Rig Light Names and Their Dim Dials
    // ------------------------------------------------------------
    // Every light in the rig gets its own factor, so the balance between sky and
    // direct light is tunable from config without touching this file.
    const LIGHT_DIM_FIELDS  =  {
        'VghLantern__Env3d__Light__Key'          : { Field : 'KeyDimWhenEnvironmentActive',         Default : 0.55 },
        'VghLantern__Env3d__Light__Fill'         : { Field : 'FillDimWhenEnvironmentActive',        Default : 0.15 },
        'VghLantern__Env3d__Light__GroundBounce' : { Field : 'GroundBounceDimWhenEnvironmentActive', Default : 0.12 },
        'VghLantern__Env3d__Light__Ambient'      : { Field : 'AmbientDimWhenEnvironmentActive',     Default : 0.18 }
    };
    // ------------------------------------------------------------


    // HELPER FUNCTION | Scale the Studio Rig Back Once the HDR Is Lighting
    // ------------------------------------------------------------
    // Applied only once per light, guarded by a flag on the light itself, so a
    // second application after a rig rebuild cannot dim the same light twice.
    function VghLantern__Env3d__EnvironmentMap__BalanceStudioRig(surface) {
        if (!surface || !surface.Groups || !surface.Groups.helpers) return;

        surface.Groups.helpers.traverse(function(node) {
            if (!node.isLight) return;
            if (node.userData.VghLantern__EnvironmentBalanced === true) return;

            // Matched by name, falling back to the ambient dial for any light
            // added to the rig later - an unnamed extra is fill by nature.
            const dial   =  LIGHT_DIM_FIELDS[node.name]
                         || LIGHT_DIM_FIELDS['VghLantern__Env3d__Light__Ambient'];
            const factor =  VghLantern__Env3d__EnvironmentMap__Number(dial.Field, dial.Default);

            node.intensity  *=  factor;
            node.userData.VghLantern__EnvironmentBalanced  =  true;
        });
    }
    // ------------------------------------------------------------


    // FUNCTION | Apply the Environment Map to a Surface
    // ------------------------------------------------------------
    // Fire and forget. Returns a promise for callers that want to await it, but
    // the viewport is drawable throughout and simply re-renders when the sky
    // arrives.
    export function VghLantern__Env3d__EnvironmentMap__Apply(surface) {
        if (!surface || !surface.Scene || !surface.Renderer) return Promise.resolve(null);
        if (!VghLantern__Env3d__EnvironmentMap__IsEnabled()) return Promise.resolve(null);

        // Recorded on the surface so anything that captures a frame - the drawing
        // sheet snapshot in particular - can wait for the sky rather than
        // photographing a half-lit scene. See EnvironmentMap__Ready below.
        surface.EnvironmentPromise  =  VghLantern__Env3d__EnvironmentMap__ApplyInternal(surface);
        return surface.EnvironmentPromise;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | The Awaited Body of Apply
    // ------------------------------------------------------------
    async function VghLantern__Env3d__EnvironmentMap__ApplyInternal(surface) {
        const envTexture  =  await VghLantern__Env3d__EnvironmentMap__LoadForRenderer(surface.Renderer);
        if (!envTexture) return null;
        if (surface.IsDestroyed) return null;

        const config     =  VghLantern__Env3d__EnvironmentMap__Config();
        const intensity  =  VghLantern__Env3d__EnvironmentMap__Number('Intensity', 0.55);

        surface.Scene.environment  =  envTexture;

        // environmentIntensity is the primary brightness dial: it scales the
        // sky's contribution to every surface in the scene at once.
        if ('environmentIntensity' in surface.Scene) {
            surface.Scene.environmentIntensity  =  intensity;
        }

        // Rotating the sky moves where the bright sun patch falls, without
        // disturbing the studio rig that supplies the directional modelling.
        const rotationDegrees  =  VghLantern__Env3d__EnvironmentMap__Number('RotationDegrees', 0);
        if (rotationDegrees !== 0 && surface.Scene.environmentRotation) {
            surface.Scene.environmentRotation.set(0, rotationDegrees * DEG_TO_RAD, 0);
        }

        if (config.UseAsBackground === true) {
            surface.Scene.background  =  envTexture;

            if ('backgroundIntensity' in surface.Scene) {
                surface.Scene.backgroundIntensity   =  VghLantern__Env3d__EnvironmentMap__Number('BackgroundIntensity', 0.9);
            }
            if ('backgroundBlurriness' in surface.Scene) {
                surface.Scene.backgroundBlurriness  =  VghLantern__Env3d__EnvironmentMap__Number('BackgroundBlurriness', 0.35);
            }
            if (rotationDegrees !== 0 && surface.Scene.backgroundRotation) {
                surface.Scene.backgroundRotation.set(0, rotationDegrees * DEG_TO_RAD, 0);
            }
        }

        // Glass inherits scene.environment rather than holding its own map. It
        // has to: the glazing material is shared across every surface, and each
        // surface now has a radiance map belonging to its own GL context, so a
        // single material cannot carry the right one for all of them.
        //
        // Inheriting means the scene intensity multiplies through, which would
        // otherwise drag the glass reflection down whenever the frame is dimmed.
        // Dividing it back out here keeps the config value meaning what it says:
        // the effective reflection strength of the glass, independent of the
        // frame dial.
        VghLantern__Env3d__MaterialLibrary__ApplyEnvironmentToGlazing(intensity);

        VghLantern__Env3d__EnvironmentMap__BalanceStudioRig(surface);
        VghLantern__Env3d__SceneManager__Invalidate(surface);
        return envTexture;
    }
    // ------------------------------------------------------------


    // FUNCTION | Wait Until This Surface Is Fully Lit
    // ------------------------------------------------------------
    // Every 3D surface in the app - the editor viewport, the 3D tab and the
    // offscreen surface the drawing sheet photographs - mounts through the same
    // pipeline and so gets the same sky. But the sky arrives asynchronously,
    // and a surface that is captured to a PNG only ever draws once. Without this
    // wait the drawing sheet caches a frame lit by the studio rig alone, at full
    // strength and with nothing to reflect, which is why the sheet's 3D view
    // came out markedly darker than the live viewport showing the same lantern.
    //
    // After the first load the radiance map is cached, so this resolves in a
    // microtask and costs nothing.
    export function VghLantern__Env3d__EnvironmentMap__Ready(surface) {
        if (!surface || !surface.EnvironmentPromise) return Promise.resolve(null);
        return surface.EnvironmentPromise;
    }
    // ------------------------------------------------------------


    // FUNCTION | Remove the Environment Map From a Surface
    // ------------------------------------------------------------
    // The shared texture is deliberately NOT disposed here - another surface may
    // still be lit by it. Disposal belongs to a full teardown.
    export function VghLantern__Env3d__EnvironmentMap__Clear(surface) {
        if (!surface || !surface.Scene) return;

        surface.Scene.environment  =  null;
        if (VghLantern__Env3d__EnvironmentMap__Config().UseAsBackground === true) {
            surface.Scene.background  =  null;
        }
        VghLantern__Env3d__SceneManager__Invalidate(surface);
    }
    // ------------------------------------------------------------


    // FUNCTION | Dispose the Shared Radiance Map
    // ------------------------------------------------------------
    // Full teardown only. Clearing model groups or closing one viewport must not
    // reach this, or the next surface pays the decode again.
    export function VghLantern__Env3d__EnvironmentMap__DisposeShared() {
        // The per-renderer radiance maps are held weakly and freed with their
        // renderer, so there is nothing to walk here. Dropping the source and
        // the failure latch is enough to force a clean reload next time.
        VghLantern__Env3d__EnvironmentMap__SourcePromise  =  null;
        VghLantern__Env3d__EnvironmentMap__PerRenderer    =  new WeakMap();
        VghLantern__Env3d__EnvironmentMap__Failed         =  false;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
