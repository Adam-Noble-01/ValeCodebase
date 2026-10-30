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
//     up to four tries, each with a new seed and a calmer pen (bias x 0.78);
//     a try counts when the pen finished before the step limit and every
//     letter and digit held the window's peak for at least two steps (a
//     skipped or stalled letter fails it; this is not a spelling check);
//     the path summed from its steps, its overall tilt taken out (at most 0.18),
//     moved to start at 0, 0 and scaled so the phrase is 1 high;
//     cut into strokes where the pen lifts.
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
// 30-Oct-2026 - Version 1.0.0
// - Ported from the studio's engine.py (AURA 0.2.1).
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__Neural__TRIES          = 4;                                       // <-- The studio's four attempts
    const Na__Neural__RETRY_SEED     = 104729;                                  // <-- Each retry's seed: seed + try x this, modulo 2^32
    const Na__Neural__RETRY_CALM     = 0.78;                                    // <-- Each retry's bias: neatness x 0.78^try ...
    const Na__Neural__MIN_BIAS       = 0.2;                                     // <-- ... and never below 0.2
    const Na__Neural__MIN_PEAKS      = 2;                                       // <-- Steps a letter or digit must hold the window's peak
    const Na__Neural__SLOPE_LIMIT    = 0.18;                                    // <-- The most tilt taken out of a phrase
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


    // FUNCTION | A Neural Pen Over a Loaded Network: { Write(text, seed, neatness) -> { strokes, width, attempt } }
    // ------------------------------------------------------------
    // network: the WebAssembly module's exports, its weights already copied in.
    // manifest: the model's manifest (its charset, and the mean and spread its
    // pen steps were scaled by in training).
    // ------------------------------------------------------------
    function Na__Neural__Create(network, manifest) {
        const charset = String(manifest.HandwritingModel__Charset || '');
        const mu = manifest.HandwritingModel__Mu, sd = manifest.HandwritingModel__Std;
        const maxChars = network.Na__Network__MaxChars(), maxSteps = network.Na__Network__MaxSteps();
        const kept = new Map();

        function Write(text, seed, neatness) {
            const key = `${seed >>> 0}|${neatness}|${text}`;
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
            const limit = Math.min(maxSteps, Math.max(1200, chars * 110));
            new Int32Array(network.memory.buffer, network.Na__Network__TextPointer(), chars).set(codes);

            let steps = 0, attempt = 0, complete = false;
            for (attempt = 0; attempt < Na__Neural__TRIES; attempt++) {
                const bias = Math.max(Na__Neural__MIN_BIAS, neatness * Math.pow(Na__Neural__RETRY_CALM, attempt));
                steps = network.Na__Network__Sample(chars, limit, bias, ((seed >>> 0) + attempt * Na__Neural__RETRY_SEED) % 4294967296);
                const peaks = new Int32Array(network.memory.buffer, network.Na__Network__CoveragePointer(), chars);
                complete = steps < limit;
                for (let i = 0; complete && i < text.length; i++) {
                    if (/[A-Za-z0-9]/.test(text[i]) && peaks[i] < Na__Neural__MIN_PEAKS) complete = false;
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

            // Level it (the studio: "remove gross baseline inclination while preserving local movement"), then 1 high
            let minX = Infinity, maxX = -Infinity;
            for (let i = 0; i < steps; i++) { minX = Math.min(minX, xs[i]); maxX = Math.max(maxX, xs[i]); }
            if (maxX - minX > 0) {
                const tilt = Math.min(Na__Neural__SLOPE_LIMIT, Math.max(-Na__Neural__SLOPE_LIMIT, Na__Neural__Slope(xs, ys, steps)));
                for (let i = 0; i < steps; i++) ys[i] -= (xs[i] - xs[0]) * tilt;
            }
            let minY = Infinity, maxY = -Infinity;
            for (let i = 0; i < steps; i++) { minY = Math.min(minY, ys[i]); maxY = Math.max(maxY, ys[i]); }
            const scale = Math.max(maxY - minY, 1);
            const strokes = [];
            let current = [], width = 0;
            for (let i = 0; i < steps; i++) {
                const px = (xs[i] - minX) / scale, py = (ys[i] - minY) / scale;
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
        Na__Neural__Create
    };

// endregion -------------------------------------------------------------------
