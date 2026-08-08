/* =============================================================================
   NAAUDIO - APP UTILS | SEEDED RANDOM
   =============================================================================

   FILE       : NaAudio__AppUtils__SeededRandom__.mjs
   NAMESPACE  : NaAudio
   MODULE     : AppUtils - SeededRandom
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Deterministic pseudo-random streams for recallable patches
   CREATED    : 08-Aug-2026

   DESCRIPTION:
   - A small, fast, well-distributed PRNG. Same seed, same sequence, on every
     machine and every browser, forever.
   - Two entirely separate reasons this exists, and both matter:

       1. PATCH RECALL. The design manifest specifies that the ChaosEngine routes
          its modulation matrix semi-randomly and that 'each patch is fully
          recallable via a unique seed number for consistent reproduction'. That
          is only true if the random source is reproducible. Math.random() cannot
          do this - a patch built on it is gone the moment the page reloads.

       2. A STABLE COMPOSITION. The backdrop shapes, the sphere start positions in
          the DelayCloud, the scatter of anything decorative - all seeded. A space
          that reshuffles its scenery on refresh stops being a place the user can
          learn their way around, and spatial memory is the premise of the whole
          application.

   ---------------------------------------------------------------------------

   ALGORITHM: mulberry32. Thirty-two bit state, one multiply, two shifts, passes
   the usual small-PRNG test suites and is short enough to read. It is not
   cryptographic and must never be used for anything that needs to be secret.

   ============================================================================= */

// =============================================================================
// REGION | Seeded Random Streams
// =============================================================================

// -----------------------------------------------------------------------------
// REGION | Stream Factory
// -----------------------------------------------------------------------------

    // FUNCTION | Create an Independent Seeded Random Stream
    // ------------------------------------------------------------
    // Returns an object rather than a bare function so a caller can ask for a
    // range, an integer or a pick without writing the same arithmetic again, and
    // so a stream can be rewound to replay a patch exactly.
    export function NaAudio__SeededRandom__Create(seed) {
        const initialState  =  (seed >>> 0) || 1;                             // <-- Seed 0 degenerates; 1 is the documented substitute
        let state           =  initialState;

        // SUB HELPER FUNCTION | Advance the State and Return 0 to 1
        // ------------------------------------------------------------
        function next() {
            state  =  (state + 0x6D2B79F5) >>> 0;
            let t  =  state;
            t      =  Math.imul(t ^ (t >>> 15), t | 1);
            t     ^=  t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
        // ------------------------------------------------------------

        return {
            Seed          : initialState,

            // Unit interval, 0 inclusive to 1 exclusive
            Next          : next,

            // Range, floating point
            Range         : (minimum, maximum) => minimum + (maximum - minimum) * next(),

            // Range, integer, both ends inclusive
            IntRange      : (minimum, maximum) => minimum + Math.floor(next() * (maximum - minimum + 1)),

            // Symmetric spread about zero, e.g. Spread(0.2) gives -0.2 to +0.2
            Spread        : (magnitude) => (next() * 2 - 1) * magnitude,

            // Coin flip weighted toward true by probability
            Chance        : (probability) => next() < probability,

            // One element of an array
            Pick          : (array) => array[Math.floor(next() * array.length)],

            // Rewind to the seed so a sequence can be replayed exactly
            Reset         : () => { state = initialState; }
        };
    }
    // ------------------------------------------------------------


    // FUNCTION | Derive a Child Seed From a Parent Seed and a Label
    // ------------------------------------------------------------
    // Lets one patch seed produce several independent but reproducible streams -
    // one for the oscillator routing, one for the envelope scatter, one for the
    // visual jitter - without any of them stepping on the others' sequence.
    //
    // A single shared stream would couple them: adding one extra draw in the
    // oscillator routing would silently change every envelope in the patch, and
    // 'the seed still recalls it' would quietly stop being true.
    export function NaAudio__SeededRandom__DeriveSeed(parentSeed, label) {
        let hash  =  (parentSeed >>> 0) ^ 0x9E3779B9;

        for (let i = 0; i < label.length; i++) {
            hash  =  Math.imul(hash ^ label.charCodeAt(i), 0x01000193) >>> 0;  // <-- FNV-style mix, cheap and adequate
        }
        return hash >>> 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | Create a Child Stream From a Parent Seed and a Label
    // ------------------------------------------------------------
    export function NaAudio__SeededRandom__CreateChild(parentSeed, label) {
        return NaAudio__SeededRandom__Create(NaAudio__SeededRandom__DeriveSeed(parentSeed, label));
    }
    // ------------------------------------------------------------


    // FUNCTION | Mint a Fresh Seed For a New Patch
    // ------------------------------------------------------------
    // The ONE place a genuinely unpredictable number is wanted: minting the seed
    // that will then be saved and reused forever. Everything downstream of it is
    // deterministic.
    export function NaAudio__SeededRandom__MintSeed() {
        if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
            const buffer  =  new Uint32Array(1);
            globalThis.crypto.getRandomValues(buffer);
            return buffer[0] >>> 0;
        }
        return (Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0;                 // <-- Non-secure contexts only
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
