/* =============================================================================
   PAINTERLYNPR - APP UTILS | SEEDED RANDOM
   =============================================================================

   FILE       : PainterlyNPR__AppUtils__SeededRandom__.mjs
   NAMESPACE  : PainterlyNPR
   MODULE     : AppUtils - SeededRandom
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Every stroke, wash and grain is seeded: independent streams, child
                seeds by label, hashed noise - and the one place randomness is
                unpredictable
   CREATED    : 30-Oct-2026 (v0.5.0)

   DESCRIPTION:
   - Pure functions, no imports.

   ---------------------------------------------------------------------------

   PORT NOTE:
   - Ported from : Experiment 01
                   (80__Experiments__RenderPrototypes/01__Experiment__PenAndWashMockup),
                   engine 0.4.10 - region Seeded Random
   - Ported on   : 30-Oct-2026 (v0.5.0)
   - Parity      : the application draws the sheet the experiment draws, pixel for
                   pixel
                   (60__Dev__WebBuildUtils/PainterlyNPR__Test__AppParity__Browser__.py)
   - Divergences : none in what it draws; what the experiment shared in one
                   closure is imported and exported here

   ============================================================================= */

// =============================================================================
// REGION | Seeded Random
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Seeded Random
// -----------------------------------------------------------------------------

    // FUNCTION | Create an Independent Seeded Random Stream
    // ------------------------------------------------------------
    // mulberry32, as AudioSPACE's SeededRandom: the same seed gives the same
    // sequence on every machine, so a drawing re-renders identically.
    function PainterlyNPR__SeededRandom__Create(seed) {
        const initialState  =  (seed >>> 0) || 1;
        let state           =  initialState;

        function next() {
            state  =  (state + 0x6D2B79F5) >>> 0;
            let t  =  state;
            t      =  Math.imul(t ^ (t >>> 15), t | 1);
            t     ^=  t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }

        return {
            Next     : next,
            Range    : (a, b) => a + (b - a) * next(),
            IntRange : (a, b) => a + Math.floor(next() * (b - a + 1)),
            Spread   : (m) => (next() * 2 - 1) * m,
            Chance   : (p) => next() < p,
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Derive a Child Seed From a Parent Seed and a Label
    // ------------------------------------------------------------
    // Seeds are keyed by IDENTITY ('edge:41', 'organic:13'), never by draw order,
    // so adding an edge to one window cannot reshuffle the strokes of another -
    // the manifest's "style drift" failure.
    function PainterlyNPR__SeededRandom__DeriveSeed(parentSeed, label) {
        let hash  =  (parentSeed >>> 0) ^ 0x9E3779B9;
        for (let i = 0; i < label.length; i++) {
            hash  =  Math.imul(hash ^ label.charCodeAt(i), 0x01000193) >>> 0;
        }
        return hash >>> 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Child Stream
    // ------------------------------------------------------------
    function PainterlyNPR__SeededRandom__Child(parentSeed, label) {
        return PainterlyNPR__SeededRandom__Create(PainterlyNPR__SeededRandom__DeriveSeed(parentSeed, label));
    }
    // ------------------------------------------------------------


    // FUNCTION | Hash an Integer to the Unit Interval
    // ------------------------------------------------------------
    function PainterlyNPR__SeededRandom__HashUnit(i, seed) {
        let h  =  (Math.imul(i | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0;
        h      =  Math.imul(h ^ (h >>> 13), 1274126177);
        h     ^=  h >>> 16;
        return (h >>> 0) / 4294967296;
    }
    // ------------------------------------------------------------


    // FUNCTION | Smooth 1D Value Noise - drift along a stroke, never a sine
    // ------------------------------------------------------------
    function PainterlyNPR__SeededRandom__Noise1(x, seed) {
        const i  =  Math.floor(x);
        const f  =  x - i;
        const u  =  f * f * (3 - 2 * f);
        const a  =  PainterlyNPR__SeededRandom__HashUnit(i, seed);
        const b  =  PainterlyNPR__SeededRandom__HashUnit(i + 1, seed);
        return a + (b - a) * u;
    }
    // ------------------------------------------------------------


    // FUNCTION | Smooth 2D Value Noise - where on a wall the brick patches cluster
    // ------------------------------------------------------------
    // Quintic fade, as the shaders use: no straight creases at the cell boundaries.
    function PainterlyNPR__SeededRandom__Noise2(x, y, seed) {
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = x - ix, fy = y - iy;
        const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
        const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
        const h  = (i, j) => PainterlyNPR__SeededRandom__HashUnit(i + Math.imul(j, 7919), seed);
        const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
        return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uy;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Noise Offset for a Shader, From the Seed and a Label
    // ------------------------------------------------------------
    function PainterlyNPR__SeededRandom__Offset(seed, label) {
        const r  =  PainterlyNPR__SeededRandom__Child(seed, label);
        return [r.Range(0, 320), r.Range(0, 320)];
    }
    // ------------------------------------------------------------


    // FUNCTION | Mint a Fresh Seed - the one place randomness is unpredictable
    // ------------------------------------------------------------
    function PainterlyNPR__SeededRandom__MintSeed() {
        if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
            const buffer  =  new Uint32Array(1);
            globalThis.crypto.getRandomValues(buffer);
            return buffer[0] % 100000000;
        }
        return Math.floor(Math.random() * 100000000);
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    // MODULE EXPORTS | What Other Modules Read - under their three-stage names
    // ------------------------------------------------------------
    export {
        PainterlyNPR__SeededRandom__Create,
        PainterlyNPR__SeededRandom__DeriveSeed,
        PainterlyNPR__SeededRandom__HashUnit,
        PainterlyNPR__SeededRandom__MintSeed,
        PainterlyNPR__SeededRandom__Noise1,
        PainterlyNPR__SeededRandom__Noise2,
        PainterlyNPR__SeededRandom__Offset,
    };
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------

// endregion -------------------------------------------------------------------
