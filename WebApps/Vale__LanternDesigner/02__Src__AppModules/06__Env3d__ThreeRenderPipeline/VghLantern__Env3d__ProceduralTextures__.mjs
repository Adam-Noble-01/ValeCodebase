/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | PROCEDURAL TEXTURES
   =============================================================================

   FILE       : VghLantern__Env3d__ProceduralTextures__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - ProceduralTextures
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Generate seamless noise textures in the browser for surface bump
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - Builds tileable fractal value noise on a canvas and hands it back as a
     THREE.CanvasTexture, so a material can carry a bump map without the app
     shipping and cache-busting an image file.
   - Generated once per parameter set and cached. Two materials asking for the
     same grain share one texture and one GPU upload.

   ---------------------------------------------------------------------------

   WHY PROCEDURAL RATHER THAN AN IMAGE:
   The only thing needed here is fine irregularity - the difference between a
   surface that reads as a real moulding and one that reads as untextured CAD.
   A 256 px noise tile costs a few milliseconds to generate and nothing to
   download, and it can be re-tuned from config without anyone opening an image
   editor or re-exporting an asset.

   WHY THE NOISE IS DETERMINISTIC:
   The lattice is filled from a seeded generator rather than Math.random, so the
   same grain appears on every reload and in every exported snapshot. A texture
   that reshuffles itself each session would make two screenshots of the same
   lantern subtly different, which is exactly the kind of difference that wastes
   time in a drawing review.

   WHY IT IS SEAMLESS:
   Lattice lookups wrap with a modulo, so the right edge interpolates back into
   the left and the bottom into the top. A visible tile seam repeating every few
   hundred millimetres across a kerb would read as a defect in the moulding.

   ============================================================================= */

import * as THREE from 'three';

// =============================================================================
// REGION | Procedural Textures Module
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Module State
// -----------------------------------------------------------------------------

    // MODULE VARIABLES | Texture Cache Keyed by Parameter Set
    // ------------------------------------------------------------
    let VghLantern__Env3d__ProceduralTextures__Cache  =  {};
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Noise Generation
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Seeded Pseudo-Random Generator (mulberry32)
    // ------------------------------------------------------------
    // Small, fast and stable. Returns a function yielding 0..1.
    function VghLantern__Env3d__ProceduralTextures__Rng(seed) {
        let state  =  seed >>> 0;

        return function() {
            state  =  (state + 0x6D2B79F5) >>> 0;
            let t  =  Math.imul(state ^ (state >>> 15), 1 | state);
            t      =  (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Smoothstep Interpolation Weight
    // ------------------------------------------------------------
    // Linear interpolation between lattice points leaves visible creases along
    // the lattice lines; smoothstep gives the zero first derivative at each
    // point that makes the field read as continuous.
    function VghLantern__Env3d__ProceduralTextures__Smooth(t) {
        return t * t * (3 - 2 * t);
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Sample One Octave of Tileable Value Noise
    // ------------------------------------------------------------
    function VghLantern__Env3d__ProceduralTextures__SampleOctave(lattice, latticeSize, u, v) {
        const x   =  u * latticeSize;
        const y   =  v * latticeSize;
        const x0  =  Math.floor(x);
        const y0  =  Math.floor(y);

        // The modulo is what makes the tile seamless: the last column and row
        // interpolate back into the first.
        const xa  =  ((x0 % latticeSize) + latticeSize) % latticeSize;
        const ya  =  ((y0 % latticeSize) + latticeSize) % latticeSize;
        const xb  =  (xa + 1) % latticeSize;
        const yb  =  (ya + 1) % latticeSize;

        const tx  =  VghLantern__Env3d__ProceduralTextures__Smooth(x - x0);
        const ty  =  VghLantern__Env3d__ProceduralTextures__Smooth(y - y0);

        const topLeft      =  lattice[ya * latticeSize + xa];
        const topRight     =  lattice[ya * latticeSize + xb];
        const bottomLeft   =  lattice[yb * latticeSize + xa];
        const bottomRight  =  lattice[yb * latticeSize + xb];

        const top     =  topLeft    + (topRight    - topLeft)    * tx;
        const bottom  =  bottomLeft + (bottomRight - bottomLeft) * tx;
        return top + (bottom - top) * ty;
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Seamless Fractal Noise Canvas Texture
    // ------------------------------------------------------------
    // options:
    //   PixelSize      canvas edge in pixels
    //   BaseLattice    cells across the first octave; higher is finer grain
    //   Octaves        how many doublings are summed
    //   Persistence    amplitude falloff per octave; lower is smoother
    //   Contrast       pushes the field away from mid grey
    //   Seed           any integer; same seed gives the same grain forever
    export function VghLantern__Env3d__ProceduralTextures__Noise(options) {
        const settings  =  Object.assign({
            PixelSize   : 256,
            BaseLattice : 8,
            Octaves     : 4,
            Persistence : 0.5,
            Contrast    : 1.0,
            Seed        : 1
        }, options || {});

        const cacheKey  =  'noise|' + [settings.PixelSize, settings.BaseLattice, settings.Octaves,
                                       settings.Persistence, settings.Contrast, settings.Seed].join('|');

        if (VghLantern__Env3d__ProceduralTextures__Cache[cacheKey]) {
            return VghLantern__Env3d__ProceduralTextures__Cache[cacheKey];
        }

        const random  =  VghLantern__Env3d__ProceduralTextures__Rng(settings.Seed);

        // Pre-fill one lattice per octave, each twice as dense as the last.
        const octaves  =  [];
        let   lattice  =  settings.BaseLattice;
        let   amplitude    =  1;
        let   totalAmplitude  =  0;

        for (let o = 0; o < settings.Octaves; o++) {
            const values  =  new Float32Array(lattice * lattice);
            for (let i = 0; i < values.length; i++) values[i]  =  random();

            octaves.push({ Values : values, Size : lattice, Amplitude : amplitude });
            totalAmplitude  +=  amplitude;
            amplitude       *=  settings.Persistence;
            lattice         *=  2;
        }

        const size    =  settings.PixelSize;
        const canvas  =  document.createElement('canvas');
        canvas.width  =  size;
        canvas.height =  size;

        const context   =  canvas.getContext('2d');
        const imageData =  context.createImageData(size, size);
        const pixels    =  imageData.data;

        for (let py = 0; py < size; py++) {
            for (let px = 0; px < size; px++) {
                const u  =  px / size;
                const v  =  py / size;

                let sum  =  0;
                for (let o = 0; o < octaves.length; o++) {
                    sum  +=  octaves[o].Amplitude * VghLantern__Env3d__ProceduralTextures__SampleOctave(
                        octaves[o].Values, octaves[o].Size, u, v);
                }
                let value  =  sum / totalAmplitude;

                // Contrast about mid grey, then clamp - a bump map only carries
                // meaning between 0 and 1.
                value  =  0.5 + (value - 0.5) * settings.Contrast;
                value  =  Math.max(0, Math.min(1, value));

                const byte    =  Math.round(value * 255);
                const offset  =  (py * size + px) * 4;
                pixels[offset]      =  byte;
                pixels[offset + 1]  =  byte;
                pixels[offset + 2]  =  byte;
                pixels[offset + 3]  =  255;
            }
        }

        context.putImageData(imageData, 0, 0);

        const texture  =  new THREE.CanvasTexture(canvas);
        texture.wrapS  =  THREE.RepeatWrapping;
        texture.wrapT  =  THREE.RepeatWrapping;
        texture.name   =  'VghLantern__Env3d__Texture__Noise';

        // A bump map carries height, not colour, so it must stay linear - tagging
        // it sRGB would put a gamma curve through the height field.
        texture.colorSpace  =  THREE.NoColorSpace;

        VghLantern__Env3d__ProceduralTextures__Cache[cacheKey]  =  texture;
        return texture;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Cache Lifecycle
// -----------------------------------------------------------------------------

    // FUNCTION | Dispose Every Generated Texture
    // ------------------------------------------------------------
    // Full teardown only, in step with MaterialLibrary__DisposeAll - the
    // materials holding these textures outlive any single model group.
    export function VghLantern__Env3d__ProceduralTextures__DisposeAll() {
        const keys  =  Object.keys(VghLantern__Env3d__ProceduralTextures__Cache);

        for (let i = 0; i < keys.length; i++) {
            const texture  =  VghLantern__Env3d__ProceduralTextures__Cache[keys[i]];
            if (texture && typeof texture.dispose === 'function') texture.dispose();
        }
        VghLantern__Env3d__ProceduralTextures__Cache  =  {};
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
