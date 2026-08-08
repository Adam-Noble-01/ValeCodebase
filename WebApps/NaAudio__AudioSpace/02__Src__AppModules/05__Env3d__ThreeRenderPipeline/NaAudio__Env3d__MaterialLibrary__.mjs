/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | MATERIAL LIBRARY
   =============================================================================

   FILE       : NaAudio__Env3d__MaterialLibrary__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - MaterialLibrary
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Own every material in the scene and keep all of them matte
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Single owner of every THREE material. Nothing else in the application calls a
     material constructor.
   - Enforces the anti-gloss rule from Na__Palette__Config.json in code, not just
     in prose: metalness is clamped to zero and roughness to a configured floor on
     every material this module hands out. A specular highlight is the one thing
     that would break the flat-pigment look, and a comment asking people not to do
     it is not a mechanism.

   ---------------------------------------------------------------------------

   SHARED VERSUS OWNED

   Materials from this library are SHARED. Many meshes point at the same instance,
   so a scene of two hundred sequencer steps holds a handful of materials rather
   than two hundred. Every shared material is stamped userData.NaAudio__Shared so
   the scene teardown knows not to dispose it when clearing a group.

   Where a mesh genuinely needs its own material - a step that pulses its emissive
   independently of its neighbours - it asks for an OWNED clone through
   NaAudio__Materials__OwnedBody. Those are disposed with their mesh. Getting this
   backwards leaks in one direction and produces black meshes in the other.

   ============================================================================= */

import * as THREE from 'three';

import { Env3dNumber, Env3dBool }        from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';
import * as Palette                      from './NaAudio__Env3d__PaletteLibrary__.mjs';

// =============================================================================
// REGION | Material Library
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Anti-Gloss Floors
    // ------------------------------------------------------------
    // Hard limits, applied to every material leaving this module. See the
    // AntiGlossRule note in Na__Palette__Config.json for why these exist.
    const MAX_METALNESS    =  0.0;
    const MIN_ROUGHNESS    =  0.60;

    const SHARED_STAMP     =  'NaAudio__Shared';
    // ------------------------------------------------------------


    // MODULE VARIABLES | Shared Material Cache
    // ------------------------------------------------------------
    const SHARED_CACHE  =  new Map();                                        // <-- Cache key -> material instance
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Anti-Gloss Enforcement
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Clamp a Material Into the Matte Range and Stamp It
    // ------------------------------------------------------------
    function NaAudio__Materials__EnforceMatte(material, isShared) {
        if (material.metalness !== undefined) {
            material.metalness  =  Math.min(material.metalness, MAX_METALNESS);
        }
        if (material.roughness !== undefined) {
            material.roughness  =  Math.max(material.roughness, MIN_ROUGHNESS);
        }

        material.userData[SHARED_STAMP]  =  isShared === true;
        return material;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Look Up or Build a Shared Material
    // ------------------------------------------------------------
    function NaAudio__Materials__Shared(cacheKey, factory) {
        let material  =  SHARED_CACHE.get(cacheKey);
        if (material) return material;

        material  =  NaAudio__Materials__EnforceMatte(factory(), true);
        SHARED_CACHE.set(cacheKey, material);
        return material;
    }
    // ------------------------------------------------------------


    // FUNCTION | Whether a Material Is Library-Owned and Must Not Be Disposed
    // ------------------------------------------------------------
    export function NaAudio__Materials__IsShared(material) {
        return !!(material && material.userData && material.userData[SHARED_STAMP] === true);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Body Materials
// -----------------------------------------------------------------------------

    // FUNCTION | Shared Matte Body Material for a Pigment
    // ------------------------------------------------------------
    // The workhorse. Every solid shape in the space that does not animate its own
    // colour uses one of these.
    export function NaAudio__Materials__Body(pigmentKey, tone) {
        const toneKey  =  (tone === 'Deep') ? 'Deep' : 'Base';

        return NaAudio__Materials__Shared('body:' + pigmentKey + ':' + toneKey, () => new THREE.MeshStandardMaterial({
            color        : Palette.NaAudio__Palette__Pigment(pigmentKey, toneKey),
            roughness    : Env3dNumber('Materials', 'BodyRoughness'),
            metalness    : Env3dNumber('Materials', 'BodyMetalness'),
            flatShading  : Env3dBool('Materials', 'BodyFlatShading')
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | Owned Matte Body Material for a Pigment
    // ------------------------------------------------------------
    // For a mesh that animates its own colour or emissive - a sequencer step, a
    // bouncing sphere. Disposed with its mesh by the scene manager.
    export function NaAudio__Materials__OwnedBody(pigmentKey, tone) {
        const toneKey  =  (tone === 'Deep') ? 'Deep' : 'Base';
        const colour   =  Palette.NaAudio__Palette__Pigment(pigmentKey, toneKey);

        const material  =  new THREE.MeshStandardMaterial({
            color            : colour.clone(),
            emissive         : colour.clone().multiplyScalar(0),               // <-- Starts unlit; the pulse writes into this
            emissiveIntensity: 1.0,
            roughness        : Env3dNumber('Materials', 'BodyRoughness'),
            metalness        : Env3dNumber('Materials', 'BodyMetalness'),
            flatShading      : Env3dBool('Materials', 'BodyFlatShading')
        });

        material.userData.NaAudio__BaseColour  =  colour.clone();              // <-- The pulse and the lock fade both need the origin
        return NaAudio__Materials__EnforceMatte(material, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | Shared Body Material for a Voice Role
    // ------------------------------------------------------------
    export function NaAudio__Materials__VoiceRoleBody(voiceRole, tone) {
        return NaAudio__Materials__Body(Palette.NaAudio__Palette__PigmentKeyForVoiceRole(voiceRole), tone);
    }
    // ------------------------------------------------------------


    // FUNCTION | Owned Body Material for a Voice Role
    // ------------------------------------------------------------
    export function NaAudio__Materials__OwnedVoiceRoleBody(voiceRole, tone) {
        return NaAudio__Materials__OwnedBody(Palette.NaAudio__Palette__PigmentKeyForVoiceRole(voiceRole), tone);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Environment Materials
// -----------------------------------------------------------------------------

    // FUNCTION | The Floor Plane Material
    // ------------------------------------------------------------
    export function NaAudio__Materials__Floor() {
        return NaAudio__Materials__Shared('floor', () => new THREE.MeshStandardMaterial({
            color     : Palette.NaAudio__Palette__Ground('PaperDeep'),
            roughness : Env3dNumber('Materials', 'FloorRoughness'),
            metalness : 0.0
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | A Module Pad Material
    // ------------------------------------------------------------
    // Built from the pigment's DEEP tone, not its base. A pad in the base tone is within a
    // few percent of the floor colour and disappears entirely - which matters because the
    // pad is the module's drag handle and its click target, so an invisible pad is an
    // unusable module rather than merely a subtle one.
    export function NaAudio__Materials__Pad(pigmentKey) {
        return NaAudio__Materials__Shared('pad:' + pigmentKey, () => new THREE.MeshStandardMaterial({
            color     : Palette.NaAudio__Palette__Pigment(pigmentKey, 'Deep'),
            roughness : Env3dNumber('Materials', 'PadRoughness'),
            metalness : 0.0
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | A Backdrop Prop Material
    // ------------------------------------------------------------
    // Unlit on purpose. The backdrop shapes sit far behind the working area and
    // must not pick up the key light, or they gain a shaded edge that pulls them
    // forward and turns scenery into scene. MeshBasicMaterial also costs nothing.
    export function NaAudio__Materials__Backdrop(pigmentKey, opacity) {
        return NaAudio__Materials__Shared('backdrop:' + pigmentKey + ':' + opacity, () => new THREE.MeshBasicMaterial({
            color       : Palette.NaAudio__Palette__Pigment(pigmentKey, 'Base'),
            transparent : true,
            opacity     : opacity,
            depthWrite  : false,                                              // <-- Overlapping props must not z-fight
            side        : THREE.DoubleSide,
            fog         : true                                                // <-- Still fades into the horizon
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Translucent Enclosure Material
    // ------------------------------------------------------------
    // Used for the DelayCloud box and anything else the user is meant to see
    // through. Front faces only would show the inside of the far wall through the
    // near one, so both sides render and depth writing is off.
    export function NaAudio__Materials__Glass(pigmentKey) {
        return NaAudio__Materials__Shared('glass:' + pigmentKey, () => new THREE.MeshStandardMaterial({
            color       : Palette.NaAudio__Palette__Pigment(pigmentKey, 'Base'),
            roughness   : Env3dNumber('Materials', 'GlassRoughness'),
            metalness   : 0.0,
            transparent : true,
            opacity     : Env3dNumber('Materials', 'GlassOpacity'),
            depthWrite  : false,
            side        : THREE.DoubleSide
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Module Cage Material
    // ------------------------------------------------------------
    // Owned rather than shared: every module fades its own cage independently as it
    // locks, so a shared instance would fade all of them together.
    export function NaAudio__Materials__OwnedCage() {
        const material  =  new THREE.LineBasicMaterial({
            color       : Palette.NaAudio__Palette__Ink('InkGhost'),
            transparent : true,
            opacity     : 0.0,                                                // <-- Invisible in the working state
            depthWrite  : false
        });
        return NaAudio__Materials__EnforceMatte(material, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Flat Unlit Marker Material
    // ------------------------------------------------------------
    // For flat floor-plane marks that are LINEWORK drawn as a mesh - the sequencer's
    // start-point triangle is the case this exists for.
    //
    // Unlit on purpose. A shaded triangle lying flat on the ground picks up the key
    // light and reads as a small physical object standing there, when what is wanted is
    // a mark printed on the floor.
    //
    // The colour is resolved through NaAudio__Palette__Resolve rather than the pigment
    // table, so a marker may be named from either family. That matters: the natural
    // choice for a mark like this is 'Ink', which is not a pigment at all - asking the
    // pigment table for it throws, which is exactly what happened the first time.
    export function NaAudio__Materials__FlatMarker(colourName, opacity) {
        const alpha  =  (opacity === undefined) ? 1.0 : opacity;

        return NaAudio__Materials__Shared('flatMarker:' + colourName + ':' + alpha, () => new THREE.MeshBasicMaterial({
            color       : Palette.NaAudio__Palette__Resolve(colourName),
            transparent : alpha < 1.0,
            opacity     : alpha,
            side        : THREE.DoubleSide                                    // <-- Flat marks are seen from both sides as the camera orbits
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | An Owned Flat Floor Marker Material
    // ------------------------------------------------------------
    // The same thing, for a mark that changes its own opacity - the output post's collar
    // brightens when the post is selected.
    //
    // Not a clone of the shared one. Material.copy deep-copies userData, so a clone
    // arrives carrying the NaAudio__Shared stamp and the scene manager then refuses to
    // dispose it for the rest of the session. Building it fresh is one line and leaks
    // nothing.
    export function NaAudio__Materials__OwnedFlatMarker(colourName, opacity) {
        const alpha  =  (opacity === undefined) ? 1.0 : opacity;

        const material  =  new THREE.MeshBasicMaterial({
            color       : Palette.NaAudio__Palette__Resolve(colourName).clone(),
            transparent : true,
            opacity     : alpha,
            side        : THREE.DoubleSide
        });

        return NaAudio__Materials__EnforceMatte(material, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Thin Linework Material
    // ------------------------------------------------------------
    export function NaAudio__Materials__Line(inkKey, opacity) {
        const alpha  =  (opacity === undefined) ? 1.0 : opacity;

        return NaAudio__Materials__Shared('line:' + inkKey + ':' + alpha, () => new THREE.LineBasicMaterial({
            color       : Palette.NaAudio__Palette__Ink(inkKey),
            transparent : alpha < 1.0,
            opacity     : alpha,
            depthWrite  : false
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | The Ground Grid Material
    // ------------------------------------------------------------
    export function NaAudio__Materials__Grid(isMajor) {
        const inkKey  =  isMajor ? 'GridLineMajor' : 'GridLine';
        const opacity =  Env3dNumber('GroundStage', 'GridOpacity') * (isMajor ? 1.6 : 1.0);

        return NaAudio__Materials__Shared('grid:' + inkKey, () => new THREE.LineBasicMaterial({
            color       : Palette.NaAudio__Palette__Ground(inkKey),
            transparent : true,
            opacity     : Math.min(opacity, 1.0),
            depthWrite  : false
        }));
    }
    // ------------------------------------------------------------


    // FUNCTION | A Patch Cable Material
    // ------------------------------------------------------------
    // Owned: each cable brightens independently as signal flows down it, and lights its
    // own emissive when hovered in wiring mode.
    //
    // A lit MeshStandardMaterial rather than the LineBasicMaterial this used to be. A
    // cable is now a swept tube, and an unlit tube is a flat coloured worm - it is the
    // shading across the barrel that makes it read as round, which is the entire reason
    // for having built a tube instead of a line. Opaque for the same reason: a
    // transparent cable shows the module behind it through its own body and immediately
    // stops looking like an object.
    export function NaAudio__Materials__OwnedCable(signalType) {
        const colour  =  Palette.NaAudio__Palette__SignalTypeColour(signalType, 'Base');

        const material  =  new THREE.MeshStandardMaterial({
            color     : colour.clone(),
            emissive  : new THREE.Color(0, 0, 0),
            roughness : Env3dNumber('Materials', 'CableRoughness'),
            metalness : 0.0
        });

        material.userData.NaAudio__BaseColour  =  colour.clone();
        return NaAudio__Materials__EnforceMatte(material, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Cable Plug Material
    // ------------------------------------------------------------
    // Owned rather than shared, only so it can be disposed alongside its cable without
    // the scene manager needing to know that plugs are a special case. Two plugs share
    // one instance within a cable, which is the granularity that actually matters.
    export function NaAudio__Materials__OwnedPlug() {
        const material  =  new THREE.MeshStandardMaterial({
            color     : Palette.NaAudio__Palette__Ink('Ink').clone(),
            roughness : Env3dNumber('Materials', 'PlugRoughness'),
            metalness : 0.0
        });

        return NaAudio__Materials__EnforceMatte(material, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Module Port Material
    // ------------------------------------------------------------
    // Owned, because a port brightens on hover and dims out of wiring mode - the two
    // things a shared material cannot do per instance.
    //
    // The pigments are the palette's own muted green and terracotta rather than a signal
    // green and red. A saturated pair of indicator colours would be the only thing in the
    // space shouting, and the ports are already the only pickable objects in wiring mode
    // so they have nothing to compete with.
    export function NaAudio__Materials__OwnedPort(pigmentKey) {
        const colour  =  Palette.NaAudio__Palette__Pigment(pigmentKey, 'Deep');

        const material  =  new THREE.MeshStandardMaterial({
            color       : colour.clone(),
            emissive    : new THREE.Color(0, 0, 0),
            roughness   : Env3dNumber('Materials', 'BodyRoughness'),
            metalness   : 0.0,
            transparent : true,
            opacity     : 1.0
        });

        material.userData.NaAudio__BaseColour  =  colour.clone();
        return NaAudio__Materials__EnforceMatte(material, false);
    }
    // ------------------------------------------------------------


    // FUNCTION | A Label Sprite Material
    // ------------------------------------------------------------
    // Owned, because each label carries its own canvas texture. The texture is
    // disposed alongside the material by the scene manager.
    export function NaAudio__Materials__OwnedLabel(texture) {
        const material  =  new THREE.SpriteMaterial({
            map         : texture,
            transparent : true,
            depthWrite  : false,
            opacity     : 1.0
        });
        return NaAudio__Materials__EnforceMatte(material, false);
    }
    // ------------------------------------------------------------

    // FUNCTION | A Flat Label Material for a Mesh Rather Than a Sprite
    // ------------------------------------------------------------
    // For a legend printed flat on a deck. Owned, because it carries its own canvas
    // texture.
    //
    // NOT a SpriteMaterial, and the distinction is not cosmetic. A SpriteMaterial's
    // shader is fed sprite-only uniforms - centre and rotation among them - by the
    // sprite render path. Put one on a Mesh and those uniforms are never supplied, and
    // Three throws inside setValueV2f on the first frame the mesh is drawn. It looks
    // like a renderer fault and is entirely self-inflicted.
    export function NaAudio__Materials__OwnedFlatLabel(texture) {
        const material  =  new THREE.MeshBasicMaterial({
            map         : texture,
            transparent : true,
            depthWrite  : false,
            side        : THREE.DoubleSide
        });
        return NaAudio__Materials__EnforceMatte(material, false);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Teardown
// -----------------------------------------------------------------------------

    // FUNCTION | Dispose Every Shared Material
    // ------------------------------------------------------------
    // Only on full application teardown. Calling this while a scene is live leaves
    // every mesh pointing at a disposed material, which renders as solid black.
    export function NaAudio__Materials__DisposeShared() {
        for (const material of SHARED_CACHE.values()) {
            if (typeof material.dispose === 'function') material.dispose();
        }
        SHARED_CACHE.clear();
    }
    // ------------------------------------------------------------


    // FUNCTION | Count of Live Shared Materials
    // ------------------------------------------------------------
    // For the diagnostics readout. A count that climbs while the scene is static
    // means somewhere is asking for a shared material with a cache key built from
    // a changing value, which defeats the whole cache.
    export function NaAudio__Materials__SharedCount() {
        return SHARED_CACHE.size;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
