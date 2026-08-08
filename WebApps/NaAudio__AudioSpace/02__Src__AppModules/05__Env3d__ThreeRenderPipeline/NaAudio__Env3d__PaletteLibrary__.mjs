/* =============================================================================
   NAAUDIO - 3D ENVIRONMENT | PALETTE LIBRARY
   =============================================================================

   FILE       : NaAudio__Env3d__PaletteLibrary__.mjs
   NAMESPACE  : NaAudio
   MODULE     : Env3d - PaletteLibrary
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Turn the palette config into THREE.Color objects, once
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - Reads Na__Palette__Config.json and caches a THREE.Color per named colour.
   - Every colour in the 3D environment comes from here. No module constructs a
     THREE.Color from a hex literal, and none of them knows what 'millennial pink'
     actually is - they ask for a pigment by role.
   - The role indirection is the point. A drum voice, a signal type and a module
     state each name a pigment through a lookup table in config, so the mapping
     from meaning to colour can be re-tuned by editing JSON without touching a
     single render module.

   ---------------------------------------------------------------------------

   COLOUR MANAGEMENT

   Three.js runs colour-managed by default from r152. Hexes in the palette config
   are authored in sRGB, the way they would be picked in a paint program, so they
   are set through THREE.Color.setStyle which applies the sRGB to linear-working
   conversion. Handing the same hex to the constructor as a number would treat it
   as already-linear and every pigment would come out visibly washed out and pale.

   ---------------------------------------------------------------------------

   DESATURATION

   A locked module desaturates rather than simply dimming, because dimming alone
   reads as 'in shadow' and the user needs it to read as 'switched off'. The mix
   is toward the perceptual luminance of the colour itself - a Rec. 709 weighted
   grey - not toward a flat mid grey, so a locked terracotta stays a dark warm
   thing rather than turning into concrete.

   ============================================================================= */

import * as THREE from 'three';

import {
    NaAudio__ConfigAccess__Section
} from '../03__AppUtils/NaAudio__AppUtils__ConfigAccess__.mjs';

// =============================================================================
// REGION | Palette Library
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module Constants and State
// -----------------------------------------------------------------------------

    // MODULE CONSTANTS | Luminance Weights and Section Names
    // ------------------------------------------------------------
    const LUMA_RED    =  0.2126;                                             // <-- Rec. 709 luminance weights
    const LUMA_GREEN  =  0.7152;
    const LUMA_BLUE   =  0.0722;

    const SECTION_GROUND        =  'Ground';
    const SECTION_INK           =  'Ink';
    const SECTION_PIGMENTS      =  'Pigments';
    const SECTION_VOICE_ROLES   =  'VoiceRoles';
    const SECTION_SIGNAL_TYPES  =  'SignalTypes';
    const SECTION_MODULE_STATES =  'ModuleStates';
    const SECTION_STAGE_PROPS   =  'StageProps';

    const FALLBACK_PIGMENT_KEY  =  'Bone';                                   // <-- Named in config as the 'default' role too
    // ------------------------------------------------------------


    // MODULE VARIABLES | Colour Cache
    // ------------------------------------------------------------
    const COLOUR_CACHE  =  new Map();                                        // <-- 'Pigment:Base' style key -> THREE.Color
    let   isPrimed      =  false;
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Colour Construction
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Build a Colour-Managed THREE.Color From an sRGB Hex
    // ------------------------------------------------------------
    function NaAudio__Palette__ColourFromHex(hex) {
        const colour  =  new THREE.Color();
        colour.setStyle(hex, THREE.SRGBColorSpace);                           // <-- sRGB in, working space out
        return colour;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Cache and Return a Colour
    // ------------------------------------------------------------
    function NaAudio__Palette__Cached(cacheKey, hex) {
        let colour  =  COLOUR_CACHE.get(cacheKey);
        if (colour) return colour;

        colour  =  NaAudio__Palette__ColourFromHex(hex);
        COLOUR_CACHE.set(cacheKey, colour);
        return colour;
    }
    // ------------------------------------------------------------


    // FUNCTION | Prime the Cache From Config
    // ------------------------------------------------------------
    // Called once by the 3D bootstrap after config resolution. Priming up front
    // rather than lazily means a mistyped hex in the palette config is a thrown
    // error at boot, not a black shape discovered later.
    export function NaAudio__Palette__Prime() {
        if (isPrimed) return;

        const ground    =  NaAudio__ConfigAccess__Section('palette', SECTION_GROUND);
        const ink       =  NaAudio__ConfigAccess__Section('palette', SECTION_INK);
        const pigments  =  NaAudio__ConfigAccess__Section('palette', SECTION_PIGMENTS);

        for (const [key, value] of Object.entries(ground)) {
            if (typeof value === 'string' && value.startsWith('#')) NaAudio__Palette__Cached('Ground:' + key, value);
        }

        for (const [key, value] of Object.entries(ink)) {
            if (typeof value === 'string' && value.startsWith('#')) NaAudio__Palette__Cached('Ink:' + key, value);
        }

        for (const [key, value] of Object.entries(pigments)) {
            if (!value || typeof value !== 'object') continue;                 // <-- Skips the PigmentNote string
            NaAudio__Palette__Cached('Pigment:' + key + ':Base', value.Base);
            NaAudio__Palette__Cached('Pigment:' + key + ':Deep', value.Deep);
        }

        isPrimed  =  true;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Named Colour Reads
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Fail With a Message Naming the Available Keys
    // ------------------------------------------------------------
    function NaAudio__Palette__FailUnknown(what, key, available) {
        throw new Error('[NaAudio Palette] Unknown ' + what + ' "' + key + '". Available: ' + available.join(', ') + '. Add it to Na__Palette__Config.json rather than using a hex literal.');
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Ground Colour
    // ------------------------------------------------------------
    export function NaAudio__Palette__Ground(key) {
        NaAudio__Palette__Prime();
        const colour  =  COLOUR_CACHE.get('Ground:' + key);
        if (!colour) {
            const section  =  NaAudio__ConfigAccess__Section('palette', SECTION_GROUND);
            NaAudio__Palette__FailUnknown('ground colour', key, Object.keys(section));
        }
        return colour;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read an Ink Colour
    // ------------------------------------------------------------
    export function NaAudio__Palette__Ink(key) {
        NaAudio__Palette__Prime();
        const colour  =  COLOUR_CACHE.get('Ink:' + key);
        if (!colour) {
            const section  =  NaAudio__ConfigAccess__Section('palette', SECTION_INK);
            NaAudio__Palette__FailUnknown('ink colour', key, Object.keys(section));
        }
        return colour;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Pigment, Base or Deep
    // ------------------------------------------------------------
    export function NaAudio__Palette__Pigment(pigmentKey, tone) {
        NaAudio__Palette__Prime();
        const wanted  =  (tone === 'Deep') ? 'Deep' : 'Base';
        const colour  =  COLOUR_CACHE.get('Pigment:' + pigmentKey + ':' + wanted);

        if (!colour) {
            const section    =  NaAudio__ConfigAccess__Section('palette', SECTION_PIGMENTS);
            const available  =  Object.keys(section).filter((key) => typeof section[key] === 'object');
            NaAudio__Palette__FailUnknown('pigment', pigmentKey, available);
        }
        return colour;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Human Label for a Pigment
    // ------------------------------------------------------------
    export function NaAudio__Palette__PigmentLabel(pigmentKey) {
        const section  =  NaAudio__ConfigAccess__Section('palette', SECTION_PIGMENTS);
        const entry    =  section[pigmentKey];
        return (entry && entry.Label) ? entry.Label : pigmentKey;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Role Lookups
// -----------------------------------------------------------------------------

    // FUNCTION | Pigment Key for a Voice Role
    // ------------------------------------------------------------
    // An unmapped role falls back to the configured 'default' rather than throwing.
    // A sample library can legitimately carry a role nobody has assigned a colour
    // to yet, and refusing to draw it would be a worse outcome than drawing it bone.
    export function NaAudio__Palette__PigmentKeyForVoiceRole(voiceRole) {
        const roles  =  NaAudio__ConfigAccess__Section('palette', SECTION_VOICE_ROLES);
        return roles[voiceRole] || roles.default || FALLBACK_PIGMENT_KEY;
    }
    // ------------------------------------------------------------


    // FUNCTION | Colour for a Voice Role
    // ------------------------------------------------------------
    export function NaAudio__Palette__VoiceRoleColour(voiceRole, tone) {
        return NaAudio__Palette__Pigment(NaAudio__Palette__PigmentKeyForVoiceRole(voiceRole), tone);
    }
    // ------------------------------------------------------------


    // FUNCTION | Colour for a Patch Cable Signal Type
    // ------------------------------------------------------------
    export function NaAudio__Palette__SignalTypeColour(signalType, tone) {
        const types       =  NaAudio__ConfigAccess__Section('palette', SECTION_SIGNAL_TYPES);
        const pigmentKey  =  types[signalType] || types.audio || FALLBACK_PIGMENT_KEY;

        if (pigmentKey === 'Ink')      return NaAudio__Palette__Ink('Ink');    // <-- Trigger cables are ink, not a pigment
        if (pigmentKey === 'InkSoft')  return NaAudio__Palette__Ink('InkSoft');
        return NaAudio__Palette__Pigment(pigmentKey, tone);
    }
    // ------------------------------------------------------------


    // FUNCTION | Resolve a Colour Named as Either an Ink or a Pigment
    // ------------------------------------------------------------
    // Some config fields legitimately accept either family. A module cage is the case
    // this was written for: it is InkGhost while working, Ink while selected, and
    // SlateBlue - a pigment - while locked, because a locked module needs to read as a
    // different KIND of state rather than merely a darker one.
    //
    // Tries ink first, then pigment, and only then fails. Failing lists both families,
    // because 'unknown ink colour SlateBlue' is a genuinely misleading message when
    // SlateBlue is right there in the pigment table.
    export function NaAudio__Palette__Resolve(colourName, tone) {
        NaAudio__Palette__Prime();

        const ink  =  COLOUR_CACHE.get('Ink:' + colourName);
        if (ink) return ink;

        const wanted   =  (tone === 'Deep') ? 'Deep' : 'Base';
        const pigment  =  COLOUR_CACHE.get('Pigment:' + colourName + ':' + wanted);
        if (pigment) return pigment;

        const inkSection      =  NaAudio__ConfigAccess__Section('palette', SECTION_INK);
        const pigmentSection  =  NaAudio__ConfigAccess__Section('palette', SECTION_PIGMENTS);
        const available       =  Object.keys(inkSection)
                                       .concat(Object.keys(pigmentSection).filter((key) => typeof pigmentSection[key] === 'object'));

        NaAudio__Palette__FailUnknown('ink or pigment colour', colourName, available);
    }
    // ------------------------------------------------------------


    // FUNCTION | Read a Module State Presentation Block
    // ------------------------------------------------------------
    // Returns the raw config block - cage opacity, body opacity, desaturation
    // amount - so the module shell can drive its own transition. Resolving the
    // colours here as well would push shell layout decisions into the palette.
    export function NaAudio__Palette__ModuleState(stateName) {
        const states  =  NaAudio__ConfigAccess__Section('palette', SECTION_MODULE_STATES);
        const state   =  states[stateName];

        if (!state || typeof state !== 'object') {
            const available  =  Object.keys(states).filter((key) => typeof states[key] === 'object');
            NaAudio__Palette__FailUnknown('module state', stateName, available);
        }
        return state;
    }
    // ------------------------------------------------------------


    // FUNCTION | Read the Backdrop Shape Declarations
    // ------------------------------------------------------------
    export function NaAudio__Palette__BackdropShapes() {
        const props  =  NaAudio__ConfigAccess__Section('palette', SECTION_STAGE_PROPS);
        return props.BackdropShapes || [];
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Colour Operations
// -----------------------------------------------------------------------------

    // FUNCTION | Desaturate a Colour Toward Its Own Luminance
    // ------------------------------------------------------------
    // amount 0 returns the colour unchanged, 1 returns its weighted grey. Writes
    // into an optional target so the per-frame lock transition allocates nothing.
    export function NaAudio__Palette__Desaturate(colour, amount, target) {
        const out  =  target || new THREE.Color();
        out.copy(colour);

        if (amount <= 0) return out;

        const luma  =  out.r * LUMA_RED + out.g * LUMA_GREEN + out.b * LUMA_BLUE;
        out.r  =  out.r + (luma - out.r) * amount;
        out.g  =  out.g + (luma - out.g) * amount;
        out.b  =  out.b + (luma - out.b) * amount;
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Mix Two Colours
    // ------------------------------------------------------------
    export function NaAudio__Palette__Mix(fromColour, toColour, amount, target) {
        const out  =  target || new THREE.Color();
        out.copy(fromColour).lerp(toColour, amount);
        return out;
    }
    // ------------------------------------------------------------


    // FUNCTION | Lift a Colour Toward White For a Trigger Flash
    // ------------------------------------------------------------
    // Used only by the emissive pulse on a triggering step. Deliberately a lift
    // toward the cream paper colour rather than toward pure white, so a flash still
    // belongs to the palette instead of punching a hole in it.
    export function NaAudio__Palette__Flash(colour, amount, target) {
        return NaAudio__Palette__Mix(colour, NaAudio__Palette__Ground('Cream'), amount, target);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
