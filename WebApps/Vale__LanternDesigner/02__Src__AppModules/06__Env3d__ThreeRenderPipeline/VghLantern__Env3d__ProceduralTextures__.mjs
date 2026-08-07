/* =============================================================================
   VGHLANTERN - 3D ENVIRONMENT | PROCEDURAL TEXTURES
   =============================================================================

   FILE       : VghLantern__Env3d__ProceduralTextures__.mjs
   NAMESPACE  : VghLantern
   MODULE     : Env3d - ProceduralTextures
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Generate seamless surface textures in the browser, no image files
   CREATED    : 05-Aug-2026

   DESCRIPTION:
   - Builds tileable fields on a canvas and hands them back as THREE.CanvasTexture,
     so a material can carry bump, roughness, metalness and colour maps without the
     app shipping and cache-busting an image file.
   - Generated once per parameter set and cached. Two materials asking for the
     same grain share one texture and one GPU upload.

   WHAT IS IN HERE:
       Noise           isotropic fractal value noise, for the GRP kerb bump
       BrushedGrain    anisotropic die lines, for the bare mill aluminium core
       WoodGrain       ribbon figure as a colour ramp, for interlocked hardwoods
       PatinatedLead   the full multi-map surface of newly oiled milled lead

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


    // SUB FUNCTION | Pre-Fill One Lattice per Octave, Each Twice as Dense
    // ------------------------------------------------------------
    // Separated from the canvas loop below because a texture that needs several
    // independent fields - a broad undulation AND a fine tooth AND a mid-scale
    // mottle - has to build every stack up front and then sample them together
    // per pixel. Drawing each field to its own canvas and combining afterwards
    // would lose the per-pixel correlation that makes the maps agree.
    function VghLantern__Env3d__ProceduralTextures__BuildStack(random, baseLattice, octaveCount, persistence) {
        const octaves  =  [];
        let   lattice        =  baseLattice;
        let   amplitude      =  1;
        let   totalAmplitude =  0;

        for (let o = 0; o < octaveCount; o++) {
            const values  =  new Float32Array(lattice * lattice);
            for (let i = 0; i < values.length; i++) values[i]  =  random();

            octaves.push({ Values : values, Size : lattice, Amplitude : amplitude });
            totalAmplitude  +=  amplitude;
            amplitude       *=  persistence;
            lattice         *=  2;
        }

        return { Octaves : octaves, TotalAmplitude : totalAmplitude };
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Sample a Whole Octave Stack at One Point
    // ------------------------------------------------------------
    function VghLantern__Env3d__ProceduralTextures__SampleStack(stack, u, v) {
        let sum  =  0;

        for (let o = 0; o < stack.Octaves.length; o++) {
            sum  +=  stack.Octaves[o].Amplitude * VghLantern__Env3d__ProceduralTextures__SampleOctave(
                stack.Octaves[o].Values, stack.Octaves[o].Size, u, v);
        }
        return sum / stack.TotalAmplitude;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Sample a Wrapping One-Dimensional Band Across U
    // ------------------------------------------------------------
    // One independent value per band, interpolated with wrapping so the left and
    // right edges of the tile meet. This is how a field is made to vary in one
    // direction only: it takes no v argument at all, so whatever it produces is
    // constant down the length of the texture by construction rather than by a
    // stretched lattice, which would not wrap.
    function VghLantern__Env3d__ProceduralTextures__SampleBand(values, count, u) {
        const position  =  u * count;
        const index     =  Math.floor(position);
        const t         =  VghLantern__Env3d__ProceduralTextures__Smooth(position - index);

        const a  =  values[((index % count) + count) % count];
        const b  =  values[((((index + 1) % count) + count) % count)];
        return a + (b - a) * t;
    }
    // ------------------------------------------------------------


    // SUB FUNCTION | Fill One Wrapping Band Array
    // ------------------------------------------------------------
    function VghLantern__Env3d__ProceduralTextures__FillBand(random, count) {
        const size    =  Math.max(2, Math.round(count));
        const values  =  new Float32Array(size);
        for (let i = 0; i < size; i++) values[i]  =  random();
        return values;
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Parse a Six Digit Hex Colour to Byte Components
    // ------------------------------------------------------------
    // Byte space rather than THREE.Color because these values are written
    // straight into an ImageData buffer, which is sRGB bytes. Routing them
    // through a linear Color and back would put two gamma conversions through a
    // number that was already in the space the canvas wants.
    function VghLantern__Env3d__ProceduralTextures__HexBytes(hex, fallback) {
        const text  =  String(hex || '').trim().replace(/^#/, '');
        if (!/^[0-9a-fA-F]{6}$/.test(text)) return fallback;

        return {
            R : parseInt(text.slice(0, 2), 16),
            G : parseInt(text.slice(2, 4), 16),
            B : parseInt(text.slice(4, 6), 16)
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Clamp a Unit Value and Convert to a Byte
    // ------------------------------------------------------------
    function VghLantern__Env3d__ProceduralTextures__UnitByte(value) {
        if (value <= 0) return 0;
        if (value >= 1) return 255;
        return Math.round(value * 255);
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

        const stack  =  VghLantern__Env3d__ProceduralTextures__BuildStack(
            random, settings.BaseLattice, settings.Octaves, settings.Persistence);

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

                let value  =  VghLantern__Env3d__ProceduralTextures__SampleStack(stack, u, v);

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
// REGION | Brushed Metal Grain
// -----------------------------------------------------------------------------

    // FUNCTION | Build a Seamless Anisotropic Brushed Metal Grain
    // ------------------------------------------------------------
    // Extruded aluminium is not a uniform surface. It leaves the die against
    // hardened steel and carries fine parallel lines down its length, and those
    // die lines are the whole reason a bare extrusion reads as metal rather than
    // as grey plastic: they smear the reflection in one direction only, so the
    // highlight stretches along the bar as the camera moves.
    //
    // The isotropic Noise above cannot express that - a fractal field has no
    // direction. This builds a grain that varies sharply ACROSS the texture and
    // barely at all ALONG it, which is exactly what a roughness map needs to
    // carry to produce a stretched anisotropic highlight in a standard PBR
    // shader, without needing a true anisotropy term the material model here
    // does not have.
    //
    // options:
    //   PixelSize      canvas edge in pixels
    //   LineDensity    independent lines across the width; higher is finer
    //   LineContrast   how far the lines swing away from mid grey
    //   Wander         how much a line drifts along its own length; 0 is
    //                  perfectly straight, which reads as machined rather than
    //                  drawn
    //   WanderLattice  cells along the length governing that drift
    //   Seed           any integer; same seed gives the same grain forever
    export function VghLantern__Env3d__ProceduralTextures__BrushedGrain(options) {
        const settings  =  Object.assign({
            PixelSize     : 512,
            LineDensity   : 256,
            LineContrast  : 0.55,
            Wander        : 0.15,
            WanderLattice : 8,
            Seed          : 1
        }, options || {});

        const cacheKey  =  'brushed|' + [settings.PixelSize, settings.LineDensity, settings.LineContrast,
                                         settings.Wander, settings.WanderLattice, settings.Seed].join('|');

        if (VghLantern__Env3d__ProceduralTextures__Cache[cacheKey]) {
            return VghLantern__Env3d__ProceduralTextures__Cache[cacheKey];
        }

        const random  =  VghLantern__Env3d__ProceduralTextures__Rng(settings.Seed);
        const size    =  settings.PixelSize;

        // One independent value per line across the width. Sampled with wrapping
        // interpolation so the left and right edges meet without a visible seam.
        const lineCount  =  Math.max(2, Math.round(settings.LineDensity));
        const lineValue  =  new Float32Array(lineCount);
        for (let i = 0; i < lineCount; i++) lineValue[i]  =  random();

        // A second, much coarser field along the length. This is what stops the
        // lines reading as a printed barcode: a real drawn line fades and
        // strengthens over its run rather than holding one value forever.
        const wanderSize  =  Math.max(2, Math.round(settings.WanderLattice));
        const wander      =  new Float32Array(wanderSize * wanderSize);
        for (let i = 0; i < wander.length; i++) wander[i]  =  random();

        const canvas   =  document.createElement('canvas');
        canvas.width   =  size;
        canvas.height  =  size;

        const context   =  canvas.getContext('2d');
        const imageData =  context.createImageData(size, size);
        const pixels    =  imageData.data;

        for (let py = 0; py < size; py++) {
            const v  =  py / size;

            for (let px = 0; px < size; px++) {
                const u  =  px / size;

                // ACROSS the grain: sharp, high frequency, wrapping.
                const linePos   =  u * lineCount;
                const lineIndex =  Math.floor(linePos);
                const lineFrac  =  VghLantern__Env3d__ProceduralTextures__Smooth(linePos - lineIndex);
                const lineA     =  lineValue[((lineIndex % lineCount) + lineCount) % lineCount];
                const lineB     =  lineValue[((lineIndex + 1) % lineCount + lineCount) % lineCount];
                const across    =  lineA + (lineB - lineA) * lineFrac;

                // ALONG the grain: slow, low frequency, also wrapping.
                const along  =  VghLantern__Env3d__ProceduralTextures__SampleOctave(wander, wanderSize, u, v);

                let value  =  0.5 + (across - 0.5) * settings.LineContrast
                                 + (along  - 0.5) * settings.Wander;
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
        texture.name   =  'VghLantern__Env3d__Texture__BrushedGrain';

        // Roughness and height are both linear quantities, never colour.
        texture.colorSpace  =  THREE.NoColorSpace;

        VghLantern__Env3d__ProceduralTextures__Cache[cacheKey]  =  texture;
        return texture;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Patination Oiled Lead
// -----------------------------------------------------------------------------

    // FUNCTION | Build the Three Correlated Maps of Newly Oiled Milled Lead
    // ------------------------------------------------------------
    // WHAT IS ACTUALLY BEING DRAWN:
    // Milled lead is fixed, dressed down over the substrate by hand, and then
    // wiped over with patination oil the same day - the oil is what stops the
    // sheet blooming into the chalky white carbonate everyone recognises as
    // neglected leadwork. Newly oiled lead therefore does NOT look like a
    // uniform grey metal. It looks like a dark, faintly wet metal carrying broad
    // smeary strokes where the cloth went, because the oil is applied by hand
    // and never lands evenly.
    //
    // Those strokes are the single recognisable signature of the material, and
    // they are the thing a flat colour cannot express at any roughness value.
    //
    // WHY ONE FUNCTION AND NOT THREE:
    // The wipe changes four things at once, and they all change TOGETHER:
    //     where the oil is thick   darker, warmer, glossier, more metallic
    //     where the oil is thin    lighter, cooler, duller, more oxide
    // If colour, roughness, metalness and the oil sheen were generated as four
    // independent noise fields, the eye would read four unrelated grains laid
    // over each other and the surface would look like dirty plastic. Sampling
    // every field once per pixel and deriving all four outputs from that one
    // sample is what makes the result read as a single physical event - a cloth
    // dragged over metal - rather than as stacked texture.
    //
    // WHAT COMES BACK:
    //     Albedo    sRGB colour, oiled tone through to dry oxide tone
    //     Surface   linear, packed:  R height   G roughness   B metalness
    //     OilFilm   linear, packed:  R clearcoat strength   G clearcoat roughness
    //
    // The channel packing is not an optimisation for its own sake: THREE reads
    // bumpMap from red, roughnessMap from green and metalnessMap from blue, so
    // one texture legitimately serves all three and the correlation above is
    // guaranteed by construction rather than by three textures being kept in
    // step. Two canvases and two GPU uploads carry five maps.
    //
    // The OilFilm map is a separate canvas because clearcoat reads red and
    // clearcoat roughness reads green, which are already spoken for above.
    //
    // ORIENTATION:
    // The flashing mesh carries UVs in world units with U running around the
    // section profile and V running along the length of the flashing. A
    // leadworker wipes ALONG a run, so the strokes are built to vary across U
    // and hold along V - the same topology as the brushed grain above, for the
    // same reason.
    //
    // options: see the LeadFlashing block in Na__PbrMaterials__Config.json,
    // which is where every one of these is set and explained in context.
    export function VghLantern__Env3d__ProceduralTextures__PatinatedLead(options) {
        const settings  =  Object.assign({
            PixelSize            : 512,
            RepeatU              : 4.0,
            RepeatV              : 1.6,
            Anisotropy           : 16,

            OilStrokeCount       : 11,
            OilDragCount         : 43,
            OilDragWeight        : 0.26,
            OilMeanderLattice    : 5,
            OilMeanderOctaves    : 2,
            OilMeanderWeight     : 0.22,
            OilContrast          : 1.30,
            OilBias              : 0.12,

            BloomLattice         : 12,
            BloomOctaves         : 4,
            BloomPersistence     : 0.55,

            DressLattice         : 3,
            DressOctaves         : 2,
            DressPersistence     : 0.60,

            ToothLattice         : 48,
            ToothOctaves         : 2,
            ToothPersistence     : 0.50,

            OiledHex             : '#43464c',
            OxideHex             : '#767c85',
            MottleStrength       : 0.09,
            ToothTint            : 0.035,

            RoughnessOiled       : 0.34,
            RoughnessDry         : 0.72,
            RoughnessMottle      : 0.10,

            MetalnessOiled       : 0.78,
            MetalnessDry         : 0.42,

            DressRelief          : 0.80,
            ToothRelief          : 0.22,
            WipeRelief           : 0.14,

            CoatOiled            : 0.55,
            CoatDry              : 0.06,
            CoatRoughnessOiled   : 0.24,
            CoatRoughnessDry     : 0.68,

            Seed                 : 1
        }, options || {});

        const cacheKey  =  'lead|' + [
            settings.PixelSize, settings.RepeatU, settings.RepeatV, settings.Anisotropy,
            settings.OilStrokeCount, settings.OilDragCount, settings.OilDragWeight,
            settings.OilMeanderLattice, settings.OilMeanderOctaves, settings.OilMeanderWeight,
            settings.OilContrast, settings.OilBias,
            settings.BloomLattice, settings.BloomOctaves, settings.BloomPersistence,
            settings.DressLattice, settings.DressOctaves, settings.DressPersistence,
            settings.ToothLattice, settings.ToothOctaves, settings.ToothPersistence,
            settings.OiledHex, settings.OxideHex, settings.MottleStrength, settings.ToothTint,
            settings.RoughnessOiled, settings.RoughnessDry, settings.RoughnessMottle,
            settings.MetalnessOiled, settings.MetalnessDry,
            settings.DressRelief, settings.ToothRelief, settings.WipeRelief,
            settings.CoatOiled, settings.CoatDry,
            settings.CoatRoughnessOiled, settings.CoatRoughnessDry,
            settings.Seed
        ].join('|');

        // Cached as three separate entries under one derived key rather than as a
        // bundle object, so DisposeAll keeps working without knowing that some
        // cache entries arrive in threes.
        const albedoKey   =  cacheKey + '|albedo';
        const surfaceKey  =  cacheKey + '|surface';
        const oilKey      =  cacheKey + '|oilfilm';

        if (VghLantern__Env3d__ProceduralTextures__Cache[albedoKey]
         && VghLantern__Env3d__ProceduralTextures__Cache[surfaceKey]
         && VghLantern__Env3d__ProceduralTextures__Cache[oilKey]) {
            return {
                Albedo  : VghLantern__Env3d__ProceduralTextures__Cache[albedoKey],
                Surface : VghLantern__Env3d__ProceduralTextures__Cache[surfaceKey],
                OilFilm : VghLantern__Env3d__ProceduralTextures__Cache[oilKey]
            };
        }

        const random  =  VghLantern__Env3d__ProceduralTextures__Rng(settings.Seed);

        // THE WIPE - three parts, all wrapping.
        //   strokes   broad bands, the passes of the cloth itself
        //   drag      finer bands within a stroke, the weave and the drag marks
        //   meander   a slow two dimensional field so a stroke fades and
        //             strengthens over its run instead of being a constant ribbon
        const strokeCount  =  Math.max(2, Math.round(settings.OilStrokeCount));
        const dragCount    =  Math.max(2, Math.round(settings.OilDragCount));
        const strokeBand   =  VghLantern__Env3d__ProceduralTextures__FillBand(random, strokeCount);
        const dragBand     =  VghLantern__Env3d__ProceduralTextures__FillBand(random, dragCount);
        const meander      =  VghLantern__Env3d__ProceduralTextures__BuildStack(
            random, settings.OilMeanderLattice, settings.OilMeanderOctaves, 0.5);

        // THE SHEET ITSELF - three isotropic fields at three scales.
        //   dress     broad undulation of lead worked down over a substrate
        //   bloom     mid scale oxide mottle, the variation in the sheet
        //   tooth     micro surface, too fine to read as shape but not as sheen
        const dress  =  VghLantern__Env3d__ProceduralTextures__BuildStack(
            random, settings.DressLattice, settings.DressOctaves, settings.DressPersistence);
        const bloom  =  VghLantern__Env3d__ProceduralTextures__BuildStack(
            random, settings.BloomLattice, settings.BloomOctaves, settings.BloomPersistence);
        const tooth  =  VghLantern__Env3d__ProceduralTextures__BuildStack(
            random, settings.ToothLattice, settings.ToothOctaves, settings.ToothPersistence);

        const oiled  =  VghLantern__Env3d__ProceduralTextures__HexBytes(settings.OiledHex, { R : 0x43, G : 0x46, B : 0x4c });
        const oxide  =  VghLantern__Env3d__ProceduralTextures__HexBytes(settings.OxideHex, { R : 0x76, G : 0x7c, B : 0x85 });

        const size  =  settings.PixelSize;

        const albedoCanvas   =  document.createElement('canvas');
        const surfaceCanvas  =  document.createElement('canvas');
        const oilCanvas      =  document.createElement('canvas');
        albedoCanvas.width   =  size;  albedoCanvas.height   =  size;
        surfaceCanvas.width  =  size;  surfaceCanvas.height  =  size;
        oilCanvas.width      =  size;  oilCanvas.height      =  size;

        const albedoContext   =  albedoCanvas.getContext('2d');
        const surfaceContext  =  surfaceCanvas.getContext('2d');
        const oilContext      =  oilCanvas.getContext('2d');

        const albedoData   =  albedoContext.createImageData(size, size);
        const surfaceData  =  surfaceContext.createImageData(size, size);
        const oilData      =  oilContext.createImageData(size, size);

        const albedoPixels   =  albedoData.data;
        const surfacePixels  =  surfaceData.data;
        const oilPixels      =  oilData.data;

        // The strokes vary across U only, so their contribution is identical for
        // every row. Computing it once per column instead of once per pixel takes
        // the two band lookups out of the inner loop entirely.
        const strokeAcross  =  new Float32Array(size);
        let   strokeMean    =  0;

        for (let px = 0; px < size; px++) {
            const u  =  px / size;
            strokeAcross[px]  =
                  VghLantern__Env3d__ProceduralTextures__SampleBand(strokeBand, strokeCount, u)
                + (VghLantern__Env3d__ProceduralTextures__SampleBand(dragBand, dragCount, u) - 0.5) * settings.OilDragWeight;
            strokeMean  +=  strokeAcross[px];
        }

        // CENTRE THE STROKES ON 0.5 BEFORE ANYTHING READS THEM.
        // There are only a handful of broad strokes across a tile - eleven by
        // default - so the average of that handful is a long way from 0.5 on most
        // seeds, and the whole material inherits the offset: change the seed and
        // the flashing silently comes out wetter or drier than the one before it.
        // Removing the offset here is what lets OilBias mean what its config note
        // says it means rather than meaning it on one seed in ten.
        strokeMean  /=  size;
        for (let px = 0; px < size; px++) strokeAcross[px]  +=  (0.5 - strokeMean);

        for (let py = 0; py < size; py++) {
            const v  =  py / size;

            for (let px = 0; px < size; px++) {
                const u       =  px / size;
                const offset  =  (py * size + px) * 4;

                // ONE SAMPLE OF EACH FIELD - everything below is derived from these.
                const meanderValue  =  VghLantern__Env3d__ProceduralTextures__SampleStack(meander, u, v);
                const dressValue    =  VghLantern__Env3d__ProceduralTextures__SampleStack(dress,   u, v);
                const bloomValue    =  VghLantern__Env3d__ProceduralTextures__SampleStack(bloom,   u, v);
                const toothValue    =  VghLantern__Env3d__ProceduralTextures__SampleStack(tooth,   u, v);

                // OIL THICKNESS - 0 is dry oxide, 1 is a thick freshly wiped film.
                let oil  =  strokeAcross[px] + (meanderValue - 0.5) * settings.OilMeanderWeight;
                oil      =  0.5 + (oil - 0.5) * settings.OilContrast + settings.OilBias;
                oil      =  oil <= 0 ? 0 : (oil >= 1 ? 1 : oil);

                // ALBEDO - the oiled tone against the dry oxide tone, then the
                // sheet's own mottle lifted through both. On a partly metallic
                // surface this value tints the reflection as well as the diffuse,
                // which is why it is allowed to carry real colour rather than
                // being a grey ramp: lead reflects slightly blue where it is dry
                // and slightly warm where the oil has wetted it.
                const lift  =  (bloomValue - 0.5) * settings.MottleStrength
                            +  (toothValue - 0.5) * settings.ToothTint;

                albedoPixels[offset]      =  VghLantern__Env3d__ProceduralTextures__UnitByte(
                    ((oxide.R + (oiled.R - oxide.R) * oil) / 255) + lift);
                albedoPixels[offset + 1]  =  VghLantern__Env3d__ProceduralTextures__UnitByte(
                    ((oxide.G + (oiled.G - oxide.G) * oil) / 255) + lift);
                albedoPixels[offset + 2]  =  VghLantern__Env3d__ProceduralTextures__UnitByte(
                    ((oxide.B + (oiled.B - oxide.B) * oil) / 255) + lift);
                albedoPixels[offset + 3]  =  255;

                // SURFACE - R height, G roughness, B metalness.
                //
                // Height is dominated by the dressing undulation because that is
                // the only relief on a flashing large enough to catch light; the
                // wipe contributes barely at all, since a cloth leaves a film
                // rather than a dent.
                const height  =  0.5
                              +  (dressValue - 0.5) * settings.DressRelief
                              +  (toothValue - 0.5) * settings.ToothRelief
                              +  (oil        - 0.5) * settings.WipeRelief;

                // Oil fills the micro roughness of the oxide, so a thick film
                // reads glossier AND more metallic - it is wetting the metal, not
                // covering it. Dry oxide scatters and loses the metallic return.
                const roughness  =  settings.RoughnessDry
                                 +  (settings.RoughnessOiled - settings.RoughnessDry) * oil
                                 +  (bloomValue - 0.5) * settings.RoughnessMottle;

                const metalness  =  settings.MetalnessDry
                                 +  (settings.MetalnessOiled - settings.MetalnessDry) * oil;

                surfacePixels[offset]      =  VghLantern__Env3d__ProceduralTextures__UnitByte(height);
                surfacePixels[offset + 1]  =  VghLantern__Env3d__ProceduralTextures__UnitByte(roughness);
                surfacePixels[offset + 2]  =  VghLantern__Env3d__ProceduralTextures__UnitByte(metalness);
                surfacePixels[offset + 3]  =  255;

                // OIL FILM - R clearcoat strength, G clearcoat roughness.
                //
                // The film is a genuine second layer over the metal, so it is
                // modelled as one rather than folded into the base roughness. It
                // is what gives newly oiled lead its faintly wet look: a soft
                // specular sheen that sits ON the surface and survives even where
                // the metal beneath has gone dull.
                const coat       =  settings.CoatDry + (settings.CoatOiled - settings.CoatDry) * oil;
                const coatRough  =  settings.CoatRoughnessDry
                                 +  (settings.CoatRoughnessOiled - settings.CoatRoughnessDry) * oil;

                oilPixels[offset]      =  VghLantern__Env3d__ProceduralTextures__UnitByte(coat);
                oilPixels[offset + 1]  =  VghLantern__Env3d__ProceduralTextures__UnitByte(coatRough);
                oilPixels[offset + 2]  =  0;
                oilPixels[offset + 3]  =  255;
            }
        }

        albedoContext.putImageData(albedoData, 0, 0);
        surfaceContext.putImageData(surfaceData, 0, 0);
        oilContext.putImageData(oilData, 0, 0);

        const albedo   =  new THREE.CanvasTexture(albedoCanvas);
        const surface  =  new THREE.CanvasTexture(surfaceCanvas);
        const oilFilm  =  new THREE.CanvasTexture(oilCanvas);

        const prepared  =  [albedo, surface, oilFilm];
        for (let i = 0; i < prepared.length; i++) {
            prepared[i].wrapS  =  THREE.RepeatWrapping;
            prepared[i].wrapT  =  THREE.RepeatWrapping;
            prepared[i].repeat.set(settings.RepeatU, settings.RepeatV);

            // ANISOTROPIC FILTERING - not a refinement, a requirement here.
            // A flashing is a long thin band and it is nearly always seen at a
            // grazing angle, which compresses it hard in one screen direction
            // while leaving it long in the other. With the default anisotropy of
            // 1 the GPU has to pick a single mip level for both directions at
            // once, so it picks for the compressed one and the whole band comes
            // back blurred - the detail is in the texture, it just never survives
            // the sample. This is the difference between a lead flashing and a
            // grey smear, and no amount of tuning the fields below substitutes
            // for it. THREE clamps the value to whatever the hardware supports,
            // so asking for 16 is safe on a device that cannot deliver it.
            prepared[i].anisotropy  =  settings.Anisotropy;
        }

        albedo.name   =  'VghLantern__Env3d__Texture__LeadAlbedo';
        surface.name  =  'VghLantern__Env3d__Texture__LeadSurface';
        oilFilm.name  =  'VghLantern__Env3d__Texture__LeadOilFilm';

        // Colour is colour and must carry the sRGB transfer function; height,
        // roughness, metalness and the coat terms are all linear quantities and
        // would be bent out of shape by one.
        albedo.colorSpace   =  THREE.SRGBColorSpace;
        surface.colorSpace  =  THREE.NoColorSpace;
        oilFilm.colorSpace  =  THREE.NoColorSpace;

        VghLantern__Env3d__ProceduralTextures__Cache[albedoKey]   =  albedo;
        VghLantern__Env3d__ProceduralTextures__Cache[surfaceKey]  =  surface;
        VghLantern__Env3d__ProceduralTextures__Cache[oilKey]      =  oilFilm;

        return { Albedo : albedo, Surface : surface, OilFilm : oilFilm };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Wood Ribbon Grain
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | Parse a #RRGGBB Hex Colour into 0..1 Components
    // ------------------------------------------------------------
    function VghLantern__Env3d__ProceduralTextures__ParseHex(hexString) {
        const clean  =  String(hexString || '#808080').replace('#', '');
        const value  =  parseInt(clean, 16);
        return {
            r : ((value >> 16) & 255) / 255,
            g : ((value >> 8)  & 255) / 255,
            b : (value & 255) / 255
        };
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Linear Interpolate Between Two Parsed Colours
    // ------------------------------------------------------------
    function VghLantern__Env3d__ProceduralTextures__LerpColour(colourA, colourB, t) {
        return {
            r : colourA.r + (colourB.r - colourA.r) * t,
            g : colourA.g + (colourB.g - colourA.g) * t,
            b : colourA.b + (colourB.b - colourA.b) * t
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Build a Seamless Ribbon-Figured Wood Grain Colour Texture
    // ------------------------------------------------------------
    // Interlocked-grain hardwoods like Sapele show their figure as a COLOUR
    // shift, not a sheen shift: the grain reverses direction in bands, so
    // raking light catches alternating bands as noticeably darker and lighter
    // than the base tone. This is the diffuse counterpart to BrushedGrain
    // above - the identical directional construction, one independent value
    // per band across the width plus a slow wander along the length - but it
    // paints a tri-tone colour ramp (dark figure, base tone, light figure)
    // rather than a greyscale roughness field, because colour is what actually
    // sells the effect on timber; a roughness-only version reads as a plain
    // tinted surface with faint sheen banding, not as wood.
    //
    // options:
    //   PixelSize        canvas edge in pixels
    //   LineDensity      independent figure bands across the width
    //   LineContrast     how far a band swings toward the dark/light figure
    //   Wander           how much the figure fades and strengthens along its run
    //   WanderLattice    cells along the length governing that drift
    //   BaseColorHex     the timber's mid tone
    //   DarkColorHex     the figure's dark band
    //   LightColorHex    the figure's light, chatoyant band
    //   Seed             any integer; same seed gives the same figure forever
    export function VghLantern__Env3d__ProceduralTextures__WoodGrain(options) {
        const settings  =  Object.assign({
            PixelSize     : 512,
            LineDensity   : 48,
            LineContrast  : 0.5,
            Wander        : 0.35,
            WanderLattice : 6,
            BaseColorHex  : '#8A4A34',
            DarkColorHex  : '#5C2E1E',
            LightColorHex : '#B06B4A',
            Seed          : 1
        }, options || {});

        const cacheKey  =  'wood|' + [settings.PixelSize, settings.LineDensity, settings.LineContrast,
                                      settings.Wander, settings.WanderLattice, settings.BaseColorHex,
                                      settings.DarkColorHex, settings.LightColorHex, settings.Seed].join('|');

        if (VghLantern__Env3d__ProceduralTextures__Cache[cacheKey]) {
            return VghLantern__Env3d__ProceduralTextures__Cache[cacheKey];
        }

        const random  =  VghLantern__Env3d__ProceduralTextures__Rng(settings.Seed);
        const size    =  settings.PixelSize;

        // One independent figure value per band across the width, sampled with
        // wrapping interpolation so left and right edges meet with no seam -
        // the same construction BrushedGrain uses for its die lines.
        const lineCount  =  Math.max(2, Math.round(settings.LineDensity));
        const lineValue  =  new Float32Array(lineCount);
        for (let i = 0; i < lineCount; i++) lineValue[i]  =  random();

        // A coarser field along the length, which is what stops a band reading
        // as a flat painted stripe: a real ribbon figure fades in and
        // strengthens over its run as the interlocked grain twists.
        const wanderSize  =  Math.max(2, Math.round(settings.WanderLattice));
        const wander      =  new Float32Array(wanderSize * wanderSize);
        for (let i = 0; i < wander.length; i++) wander[i]  =  random();

        const baseColour   =  VghLantern__Env3d__ProceduralTextures__ParseHex(settings.BaseColorHex);
        const darkColour   =  VghLantern__Env3d__ProceduralTextures__ParseHex(settings.DarkColorHex);
        const lightColour  =  VghLantern__Env3d__ProceduralTextures__ParseHex(settings.LightColorHex);

        const canvas   =  document.createElement('canvas');
        canvas.width   =  size;
        canvas.height  =  size;

        const context   =  canvas.getContext('2d');
        const imageData =  context.createImageData(size, size);
        const pixels    =  imageData.data;

        for (let py = 0; py < size; py++) {
            const v  =  py / size;

            for (let px = 0; px < size; px++) {
                const u  =  px / size;

                // ACROSS the grain: sharp, high frequency, wrapping.
                const linePos   =  u * lineCount;
                const lineIndex =  Math.floor(linePos);
                const lineFrac  =  VghLantern__Env3d__ProceduralTextures__Smooth(linePos - lineIndex);
                const lineA     =  lineValue[((lineIndex % lineCount) + lineCount) % lineCount];
                const lineB     =  lineValue[((lineIndex + 1) % lineCount + lineCount) % lineCount];
                const across    =  lineA + (lineB - lineA) * lineFrac;

                // ALONG the grain: slow, low frequency, also wrapping.
                const along  =  VghLantern__Env3d__ProceduralTextures__SampleOctave(wander, wanderSize, u, v);

                // Signed figure strength: negative toward the dark band, positive
                // toward the light band, damped by the along-length field so a
                // band fades in and out over its run rather than holding one
                // tone for the whole tile.
                let figure  =  (across - 0.5) * 2 * settings.LineContrast;
                figure  *=  0.4 + (along * settings.Wander * 2);
                figure   =  Math.max(-1, Math.min(1, figure));

                const colour  =  figure < 0
                    ? VghLantern__Env3d__ProceduralTextures__LerpColour(baseColour, darkColour,  -figure)
                    : VghLantern__Env3d__ProceduralTextures__LerpColour(baseColour, lightColour,  figure);

                const offset  =  (py * size + px) * 4;
                pixels[offset]      =  Math.round(colour.r * 255);
                pixels[offset + 1]  =  Math.round(colour.g * 255);
                pixels[offset + 2]  =  Math.round(colour.b * 255);
                pixels[offset + 3]  =  255;
            }
        }

        context.putImageData(imageData, 0, 0);

        const texture  =  new THREE.CanvasTexture(canvas);
        texture.wrapS  =  THREE.RepeatWrapping;
        texture.wrapT  =  THREE.RepeatWrapping;
        texture.name   =  'VghLantern__Env3d__Texture__WoodGrain';

        // This texture IS colour, unlike every other map in this module: those
        // carry a scalar quantity (height, roughness) and must stay linear, but
        // this one is a diffuse albedo map and must carry the sRGB colour space
        // or the renderer's colour management decodes it as if it were already
        // linear and the timber renders washed out and pale.
        texture.colorSpace  =  THREE.SRGBColorSpace;

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
