// =============================================================================
// VALEVISION AURA - HANDWRITING ENGINE - THE NEURAL PEN (ONE PHRASE AT A TIME)
// =============================================================================
//
// FILE       : Na__HandwritingEngine__Neural__.js
// NAMESPACE  : Na__Neural
// MODULE     : Handwriting Engine - Neural Pen
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Write one phrase with the WebAssembly network: its characters
//              in, the pen's path out, tried again when the pen stalls, and
//              turned into strokes one letter-height high
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - THE STUDIO'S neural_strokes (engine.py, Vale Handwriting Studio revision
//   2026-10-02.2), with the network in WebAssembly (Na__HandwritingEngine__
//   Network__.ts) instead of torch:
//     the phrase and two spaces, as the model's character codes;
//     up to four tries, each with a new seed and a looser pen (the neatness
//     times 0.78 each time, never under 0.2: the studio's "lower pen
//     confidence", which shakes a stalled pen loose);
//     a try counts when the pen finished before the step limit and every
//     letter and digit held the window's peak for at least two steps (a
//     skipped or stalled letter fails it; this is not a spelling check);
//     the path summed from its steps, its overall tilt taken out (at most 0.18),
//     moved to start at x 0, and set to the letter height (below);
//     cut into strokes where the pen lifts.
// - ONE LETTER SIZE ON EVERY LINE (1.2.0, Adam's call, 30-Oct-2026): the studio
//   scaled each phrase so its own ink was 1 high, so a line with a g, a y or a
//   slip came out smaller than one without (measured over 148 phrases: lines
//   without descenders drawn 45% larger). Now every phrase takes the model's
//   own scale, Na__Neural__LETTER units to a letter height (a typical phrase's
//   full height, so notes keep their size), and the middle of its densest band
//   of ink (the 60% of its points closest together: the small letters) sits
//   Na__Neural__MIDDLE down the line, so the small letters share one height
//   and one line from phrase to phrase. Capitals stand about 0 to 0.79,
//   descenders reach about 1.12.
// - EVERY NUMBER ABOVE IS A SETTING (1.1.0): Write takes the note's writing
//   style (Na__Neural__DEFAULTS are the studio's values), so the Advanced
//   writing style can set the tries, the retry neatness and its floor, the
//   letter check, the step limits and the tilt taken out.
// - ONE CHANGE FROM THE STUDIO: its ink ended every phrase with a stray dot
//   (the pen setting down in the padding spaces as the model stopped, the
//   last path of each phrase in its demo-ink.json). That last one- or
//   two-point stroke is dropped here.
// - The last 128 phrases are kept, so writing a note again costs nothing.
// - Pure arithmetic over the module's exports: runs in the engine's worker
//   and in Node (the parity and proof scripts).
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.2.0
// - One letter size on every line (AURA 0.4.9): the model's own scale and the
//   densest band's middle, not each phrase's own ink height.
//
// 30-Oct-2026 - Version 1.1.0
// - The tries, retry neatness, lowest neatness, letter check, step limits and
//   tilt are settings (AURA 0.3.2: the Advanced writing style).
//
// 30-Oct-2026 - Version 1.0.0
// - Ported from the studio's engine.py (AURA 0.2.1).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__Neural__DEFAULTS       = {                                       // <-- The studio's values; the writing style overrides any of them
        Tries         : 4,                                                      // <-- Tries before the phrase is given up
        RetryNeatness : 0.78,                                                   // <-- Each retry's neatness: the note's x this^try ...
        MinNeatness   : 0.2,                                                    // <-- ... and never below this
        LetterCheck   : 2,                                                      // <-- Steps a letter or digit must hold the window's peak
        StepsPerChar  : 110,                                                    // <-- The step limit: characters x this ...
        MinSteps      : 1200,                                                   // <-- ... at least this ...
        MaxSteps      : 6500,                                                   // <-- ... at most this (and the network's own limit)
        Tilt          : 0.18                                                    // <-- The most overall tilt taken out of a phrase
    };
    const Na__Neural__REVISION       = 2;                                       // <-- Carried in every joined-up request: 2 is one letter size on every line
    const Na__Neural__LETTER         = 470;                                     // <-- Model units to a letter height: the median full height of 148 written phrases
    const Na__Neural__MIDDLE         = 0.48;                                    // <-- Where the densest band's middle sits, in letter heights down the line (the same phrases)
    const Na__Neural__BAND           = 0.6;                                     // <-- The densest band: this share of a phrase's points, closest together
    const Na__Neural__RETRY_SEED     = 104729;                                  // <-- Each retry's seed: seed + try x this, modulo 2^32
    const Na__Neural__STOP_DOT       = 2;                                       // <-- A last stroke this short is the pen setting down as it stopped
    const Na__Neural__KEEP           = 128;                                     // <-- Phrases remembered (the studio's lru_cache)
    const Na__Neural__STALLED        = 'The pen did not finish these words. Try Write a new copy, fewer words on a line, or a more careful hand.';
    const Na__Neural__INVALID        = 'The pen drew something unusable here. Try Write a new copy.';

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Neural Pen
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Tilt of a Path: the least-squares slope of y on x (numpy's polyfit, degree 1)
    // ------------------------------------------------------------
    function Na__Neural__Slope(xs, ys, n) {
        let mx = 0, my = 0;
        for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
        mx /= n; my /= n;
        let sxy = 0, sxx = 0;
        for (let i = 0; i < n; i++) { const dx = xs[i] - mx; sxy += dx * (ys[i] - my); sxx += dx * dx; }
        return sxx > 0 ? sxy / sxx : 0;
    }
    // ------------------------------------------------------------


    // FUNCTION | A Neural Pen Over a Loaded Network: { Write(text, seed, neatness, settings) -> { strokes, width, attempt } }
    // ------------------------------------------------------------
    // network: the WebAssembly module's exports, its weights already copied in.
    // manifest: the model's manifest (its charset, and the mean and spread its
    // pen steps were scaled by in training). settings: any of
    // Na__Neural__DEFAULTS' keys (the rest keep the studio's values).
    // ------------------------------------------------------------
    function Na__Neural__Create(network, manifest) {
        const charset = String(manifest.HandwritingModel__Charset || '');
        const mu = manifest.HandwritingModel__Mu, sd = manifest.HandwritingModel__Std;
        const maxChars = network.Na__Network__MaxChars(), maxSteps = network.Na__Network__MaxSteps();
        const kept = new Map();

        function Write(text, seed, neatness, settings) {
            const s = Object.assign({}, Na__Neural__DEFAULTS, settings || {});
            const key = [seed >>> 0, neatness, s.Tries, s.RetryNeatness, s.MinNeatness, s.LetterCheck, s.StepsPerChar, s.MinSteps, s.MaxSteps, s.Tilt, text].join('|');
            if (kept.has(key)) {
                const hit = kept.get(key);
                kept.delete(key);
                kept.set(key, hit);                                              // <-- Most recently used last
                return hit;
            }
            const words = text + '  ';                                           // <-- The studio's two spaces: room for the window to pass the last letter
            if (words.length > maxChars) throw new Error('These words are too long for one line of the pen.');
            const codes = Int32Array.from(words, (ch) => charset.indexOf(ch) + 1);
            const chars = codes.length;
            const limit = Math.max(1, Math.min(maxSteps, s.MaxSteps, Math.max(s.MinSteps, chars * s.StepsPerChar)));
            new Int32Array(network.memory.buffer, network.Na__Network__TextPointer(), chars).set(codes);

            let steps = 0, attempt = 0, complete = false;
            for (attempt = 0; attempt < s.Tries; attempt++) {
                const bias = Math.max(s.MinNeatness, neatness * Math.pow(s.RetryNeatness, attempt));
                steps = network.Na__Network__Sample(chars, limit, bias, ((seed >>> 0) + attempt * Na__Neural__RETRY_SEED) % 4294967296);
                const peaks = new Int32Array(network.memory.buffer, network.Na__Network__CoveragePointer(), chars);
                complete = steps < limit;
                for (let i = 0; complete && i < text.length; i++) {
                    if (/[A-Za-z0-9]/.test(text[i]) && peaks[i] < s.LetterCheck) complete = false;
                }
                if (complete) break;
            }
            if (!complete) throw new Error(Na__Neural__STALLED);

            // The path: summed from its steps, in the training data's units
            const raw = new Float32Array(network.memory.buffer, network.Na__Network__PointsPointer(), steps * 3);
            const xs = new Float64Array(steps), ys = new Float64Array(steps), lifts = new Uint8Array(steps);
            let x = 0, y = 0;
            for (let i = 0; i < steps; i++) {
                x += raw[i * 3] * sd[0] + mu[0];
                y += raw[i * 3 + 1] * sd[1] + mu[1];
                if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(Na__Neural__INVALID);
                xs[i] = x; ys[i] = y;
                lifts[i] = raw[i * 3 + 2] * sd[2] + mu[2] > 0.5 ? 1 : 0;
            }

            // Not the touch-down where the pen stopped: the studio's ink ended every phrase with a stray dot, the
            // pen set down in the two padding spaces as the window ran out (one or two points, in 342 of 347 phrases
            // measured; a written full stop always comes earlier). Drop that last stroke before levelling and scaling.
            let previousLift = steps - 2;
            while (previousLift >= 0 && !lifts[previousLift]) previousLift--;
            if (previousLift >= 0 && steps - 1 - previousLift <= Na__Neural__STOP_DOT) steps = previousLift + 1;

            // Level it (the studio: "remove gross baseline inclination while preserving local movement")
            let minX = Infinity, maxX = -Infinity;
            for (let i = 0; i < steps; i++) { minX = Math.min(minX, xs[i]); maxX = Math.max(maxX, xs[i]); }
            if (maxX - minX > 0 && s.Tilt > 0) {
                const tilt = Math.min(s.Tilt, Math.max(-s.Tilt, Na__Neural__Slope(xs, ys, steps)));
                for (let i = 0; i < steps; i++) ys[i] -= (xs[i] - xs[0]) * tilt;
            }

            // One letter size on every line: the model's own scale, the densest band's middle at one height
            const sorted = Float64Array.from(ys.subarray(0, steps)).sort();
            const span = Math.max(0, Math.min(steps - 1, Math.floor(Na__Neural__BAND * steps)));
            let band = Infinity, middle = sorted[steps >> 1];
            for (let i = 0; i + span < steps; i++) {
                if (sorted[i + span] - sorted[i] < band) { band = sorted[i + span] - sorted[i]; middle = (sorted[i + span] + sorted[i]) / 2; }
            }
            const scale = Na__Neural__LETTER;
            const strokes = [];
            let current = [], width = 0;
            for (let i = 0; i < steps; i++) {
                const px = (xs[i] - minX) / scale, py = (ys[i] - middle) / scale + Na__Neural__MIDDLE;
                width = Math.max(width, px);
                current.push([px, py, 0.5]);
                if (lifts[i]) { strokes.push(current); current = []; }
            }
            if (current.length) strokes.push(current);

            const result = { strokes, width, attempt };
            kept.set(key, result);
            if (kept.size > Na__Neural__KEEP) kept.delete(kept.keys().next().value);
            return result;
        }

        return { Write, Charset: charset };
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Exports
// -----------------------------------------------------------------------------

    export {
        Na__Neural__REVISION,
        Na__Neural__DEFAULTS,
        Na__Neural__Create
    };

// endregion -------------------------------------------------------------------
