// =============================================================================
// VALEVISION AURA - HANDWRITING ENGINE - THE NETWORK (WEBASSEMBLY)
// =============================================================================
//
// FILE       : Na__HandwritingEngine__Network__.ts
// NAMESPACE  : Na__Network
// MODULE     : Handwriting Engine - Network
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Write words as pen movements in the browser: the Graves
//              handwriting network (three peephole LSTMs, a soft window that
//              reads along the words, a mixture of pen movements), sampled one
//              pen step at a time until the words are written
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - ASSEMBLYSCRIPT, built into two WebAssembly modules by
//   60__Dev__WebBuildUtils/AuraRender__BuildUtil__HandwritingWasm__.mjs:
//   Na__HandwritingEngine__Network__Simd__.wasm (four floats at a time) and
//   Na__HandwritingEngine__Network__Scalar__.wasm (a browser without SIMD).
// - THE SAME STROKES ON EVERY DEVICE: each output of a layer is summed row by
//   row in the same order in both builds (a SIMD lane is one output's own sum),
//   with no fused multiply-add and no relaxed SIMD, and the maths (musl's expf,
//   tanhf, log, cos and sin, at shrink level 0) is compiled into the module.
//   So a note's seed writes the same ink in Edge, Safari or Firefox, with SIMD
//   or without.
// - A PORT of the toolkit's models.py (X-rayLaser/pytorch-handwriting-synthesis-
//   toolkit at 899e9432, MIT; 01__Engine__PythonReference beside this folder):
//   PeepholeLSTM, SoftWindow, MixtureDensityLayer with its bias (the studio's
//   neatness), SynthesisNetwork._sample_sequence and its end-of-words test, and
//   get_mean_prediction. The random draws are this module's own (PCG32), not
//   torch's: a seed writes a different copy than the studio's Python did, of
//   the same quality.
// - THE WEIGHTS are not in the module. The worker copies the model's 32-bit
//   weights (from the AURA API, 15 MB, kept on the device) to
//   Na__Network__WeightsPointer(), laid out as the Module Constants say, in the
//   order 60__Dev__WebBuildUtils/AuraRender__BuildUtil__HandwritingWeights__.py
//   writes them.
// - UNITS are the model's own (pen offsets scaled by the training set's mean
//   and spread); the worker turns them into millimetres.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build (AURA 0.2.1): the Python engine's network rewritten for
//   WebAssembly (Adam: "Refactor the Handwriting tool from python to WASM").
//
// =============================================================================


// -----------------------------------------------------------------------------
// REGION | Module Constants
// -----------------------------------------------------------------------------

    const Na__Network__FORMAT       : i32 = 1;                                  // <-- The weights' layout: Na__HandwritingModel__Graves__f32le__1
    const Na__Network__INPUT        : i32 = 3;                                  // <-- A pen step: dx, dy, and 1 when the pen lifts after it
    const Na__Network__HIDDEN       : i32 = 400;                                // <-- Each LSTM's cells
    const Na__Network__GATES        : i32 = 4 * Na__Network__HIDDEN;            // <-- Input, forget, cell and output gates, in that order
    const Na__Network__ALPHABET     : i32 = 80;                                 // <-- The model's 79 characters, and index 0 (never a character)
    const Na__Network__WINDOW_K     : i32 = 10;                                 // <-- The soft window's Gaussians
    const Na__Network__WINDOW_OUT   : i32 = 32;                                 // <-- alpha 0-9, beta 10-19, kappa 20-29, then two zero columns
    const Na__Network__MIXTURES     : i32 = 20;                                 // <-- The pen's mixture of bivariate Gaussians
    const Na__Network__MIXTURE_OUT  : i32 = 128;                                // <-- pi 0-19, mu 20-59, sd 60-99, ro 100-119, eos 120, seven zero columns
    const Na__Network__MAX_CHARS    : i32 = 640;                                // <-- More than any phrase the worker sends (a note is 600 at most)
    const Na__Network__MAX_STEPS    : i32 = 6500;                               // <-- The studio's limit for one phrase

    const Na__Network__L1_ROWS      : i32 = Na__Network__INPUT + Na__Network__ALPHABET + Na__Network__HIDDEN;                       // <-- 483: [x, window, h1]
    const Na__Network__L2_ROWS      : i32 = Na__Network__INPUT + Na__Network__HIDDEN + Na__Network__ALPHABET + Na__Network__HIDDEN; // <-- 883: [x, h1, window, h2]
    const Na__Network__L3_ROWS      : i32 = Na__Network__L2_ROWS;                                                                   // <-- 883: [x, h2, window, h3]
    const Na__Network__MIX_ROWS     : i32 = 3 * Na__Network__HIDDEN;                                                                // <-- 1200: [h1, h2, h3]

    // The weights, in floats from Na__Network__WeightsPointer(): each matrix is rows x columns, row after row
    const Na__Network__VECTORS      : i32 = 7 * Na__Network__HIDDEN;            // <-- After an LSTM's matrix: W_ci, b_i, W_cf, b_f, b_c, W_co, b_o
    const Na__Network__AT_L1        : i32 = 0;
    const Na__Network__AT_WINDOW    : i32 = Na__Network__AT_L1 + Na__Network__L1_ROWS * Na__Network__GATES + Na__Network__VECTORS;
    const Na__Network__AT_L2        : i32 = Na__Network__AT_WINDOW + Na__Network__HIDDEN * Na__Network__WINDOW_OUT + Na__Network__WINDOW_OUT;
    const Na__Network__AT_L3        : i32 = Na__Network__AT_L2 + Na__Network__L2_ROWS * Na__Network__GATES + Na__Network__VECTORS;
    const Na__Network__AT_MIXTURE   : i32 = Na__Network__AT_L3 + Na__Network__L3_ROWS * Na__Network__GATES + Na__Network__VECTORS;
    const Na__Network__WEIGHTS      : i32 = Na__Network__AT_MIXTURE + Na__Network__MIX_ROWS * Na__Network__MIXTURE_OUT + Na__Network__MIXTURE_OUT;   // <-- 3,773,360

    const Na__Network__H_BYTES      : usize = <usize>Na__Network__HIDDEN << 2;
    const Na__Network__X_BYTES      : usize = <usize>Na__Network__INPUT << 2;
    const Na__Network__W_BYTES      : usize = <usize>Na__Network__ALPHABET << 2;
    const Na__Network__TO_UNIT      : f64   = 1.0 / 4294967296.0;               // <-- A 32-bit draw to [0, 1)

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Memory
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | A Block of Floats on Its Own 64-Byte Line (the stub runtime never frees; new memory is zero)
    // ------------------------------------------------------------
    function Na__Network__Block(floats: i32): usize {
        const raw = heap.alloc((<usize>floats << 2) + 64);
        return (raw + 63) & ~(<usize>63);
    }
    // ------------------------------------------------------------

    const Na__Network__weights      : usize = Na__Network__Block(Na__Network__WEIGHTS);
    const Na__Network__text         : usize = Na__Network__Block(Na__Network__MAX_CHARS);        // <-- i32: each character's index in the model's alphabet
    const Na__Network__coverage     : usize = Na__Network__Block(Na__Network__MAX_CHARS);        // <-- i32: the steps on which each character held the window's peak
    const Na__Network__points       : usize = Na__Network__Block(Na__Network__MAX_STEPS * 3);    // <-- f32: dx, dy, pen up, per step
    const Na__Network__phi          : usize = Na__Network__Block(Na__Network__MAX_CHARS);        // <-- The window's weight on each character, this step
    const Na__Network__x            : usize = Na__Network__Block(4);                             // <-- The last pen step (the next step's input)
    const Na__Network__w            : usize = Na__Network__Block(Na__Network__ALPHABET);         // <-- The window: what the pen is reading
    const Na__Network__kappa        : usize = Na__Network__Block(16);
    const Na__Network__alpha        : usize = Na__Network__Block(16);
    const Na__Network__beta         : usize = Na__Network__Block(16);
    const Na__Network__h1           : usize = Na__Network__Block(Na__Network__HIDDEN);
    const Na__Network__c1           : usize = Na__Network__Block(Na__Network__HIDDEN);
    const Na__Network__h2           : usize = Na__Network__Block(Na__Network__HIDDEN);
    const Na__Network__c2           : usize = Na__Network__Block(Na__Network__HIDDEN);
    const Na__Network__h3           : usize = Na__Network__Block(Na__Network__HIDDEN);
    const Na__Network__c3           : usize = Na__Network__Block(Na__Network__HIDDEN);
    const Na__Network__z            : usize = Na__Network__Block(Na__Network__GATES);
    const Na__Network__in1          : usize = Na__Network__Block(Na__Network__L1_ROWS);
    const Na__Network__in2          : usize = Na__Network__Block(Na__Network__L2_ROWS);
    const Na__Network__in3          : usize = Na__Network__Block(Na__Network__L3_ROWS);
    const Na__Network__mixIn        : usize = Na__Network__Block(Na__Network__MIX_ROWS);
    const Na__Network__winOut       : usize = Na__Network__Block(Na__Network__WINDOW_OUT);
    const Na__Network__mixOut       : usize = Na__Network__Block(Na__Network__MIXTURE_OUT);
    const Na__Network__mix          : usize = Na__Network__Block(Na__Network__MIXTURE_OUT);      // <-- The mixture: pi 0-19, mu 20-59, sd 60-99, ro 100-119, eos 120

    let Na__Network__chars          : i32 = 1;                                  // <-- The phrase's length, with the two spaces the worker adds
    let Na__Network__px             : f32 = 0;                                  // <-- The pen step just drawn
    let Na__Network__py             : f32 = 0;
    let Na__Network__pe             : f32 = 0;

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Random Draws (PCG32, seeded per phrase)
// -----------------------------------------------------------------------------

    let Na__Network__rng            : u64 = 0;
    const Na__Network__RNG_STREAM   : u64 = 0xDA3E39CB94B95BDB;                 // <-- Any odd number: one stream for every phrase


    // HELPER FUNCTION | The Next 32 Random Bits
    // ------------------------------------------------------------
    function Na__Network__Next(): u32 {
        const old = Na__Network__rng;
        Na__Network__rng = old * 6364136223846793005 + Na__Network__RNG_STREAM;
        return rotr<u32>(<u32>(((old >> 18) ^ old) >> 27), <u32>(old >> 59));
    }
    // ------------------------------------------------------------


    // HELPER FUNCTION | Start the Stream From a Seed (its bits spread by SplitMix64 first)
    // ------------------------------------------------------------
    function Na__Network__Seed(seed: u32): void {
        let s: u64 = <u64>seed + 0x9E3779B97F4A7C15;
        s = (s ^ (s >> 30)) * 0xBF58476D1CE4E5B9;
        s = (s ^ (s >> 27)) * 0x94D049BB133111EB;
        s = s ^ (s >> 31);
        Na__Network__rng = 0;
        Na__Network__Next();
        Na__Network__rng += s;
        Na__Network__Next();
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Layers
// -----------------------------------------------------------------------------

    // HELPER FUNCTION | The Logistic Curve
    // ------------------------------------------------------------
    // @ts-ignore: decorator
    @inline function Na__Network__Sigmoid(v: f32): f32 {
        return <f32>1 / (<f32>1 + Mathf.exp(-v));
    }
    // ------------------------------------------------------------


    // FUNCTION | out = input . matrix (rows x cols, cols a multiple of 16), each output summed row by row
    // ------------------------------------------------------------
    // Four rows at a time down the matrix, which is read once, front to back.
    // Every output starts at zero and takes its rows in order, one product and
    // one sum at a time: the SIMD build does four outputs in each lane and the
    // scalar build one, and both arrive at the same bits.
    // ------------------------------------------------------------
    function Na__Network__MatVec(out: usize, input: usize, rows: i32, matrix: usize, cols: i32): void {
        const stride = <usize>cols << 2;
        memory.fill(out, 0, stride);
        let row = 0;
        if (ASC_FEATURE_SIMD) {
            for (; row + 4 <= rows; row += 4) {
                const v = input + (<usize>row << 2);
                const s0 = v128.load32_splat(v);
                const s1 = v128.load32_splat(v, 4);
                const s2 = v128.load32_splat(v, 8);
                const s3 = v128.load32_splat(v, 12);
                const r0 = matrix + <usize>row * stride, r1 = r0 + stride, r2 = r1 + stride, r3 = r2 + stride;
                for (let j: usize = 0; j < stride; j += 16) {
                    let a = v128.load(out + j);
                    a = f32x4.add(a, f32x4.mul(s0, v128.load(r0 + j)));
                    a = f32x4.add(a, f32x4.mul(s1, v128.load(r1 + j)));
                    a = f32x4.add(a, f32x4.mul(s2, v128.load(r2 + j)));
                    a = f32x4.add(a, f32x4.mul(s3, v128.load(r3 + j)));
                    v128.store(out + j, a);
                }
            }
            for (; row < rows; row++) {
                const s = v128.load32_splat(input + (<usize>row << 2));
                const r = matrix + <usize>row * stride;
                for (let j: usize = 0; j < stride; j += 16) {
                    v128.store(out + j, f32x4.add(v128.load(out + j), f32x4.mul(s, v128.load(r + j))));
                }
            }
        } else {
            for (; row + 4 <= rows; row += 4) {
                const v = input + (<usize>row << 2);
                const s0 = load<f32>(v), s1 = load<f32>(v, 4), s2 = load<f32>(v, 8), s3 = load<f32>(v, 12);
                const r0 = matrix + <usize>row * stride, r1 = r0 + stride, r2 = r1 + stride, r3 = r2 + stride;
                for (let j: usize = 0; j < stride; j += 4) {
                    let a = load<f32>(out + j);
                    a = a + s0 * load<f32>(r0 + j);
                    a = a + s1 * load<f32>(r1 + j);
                    a = a + s2 * load<f32>(r2 + j);
                    a = a + s3 * load<f32>(r3 + j);
                    store<f32>(out + j, a);
                }
            }
            for (; row < rows; row++) {
                const s = load<f32>(input + (<usize>row << 2));
                const r = matrix + <usize>row * stride;
                for (let j: usize = 0; j < stride; j += 4) {
                    store<f32>(out + j, load<f32>(out + j) + s * load<f32>(r + j));
                }
            }
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | One Peephole LSTM Step: h and c updated in place (the toolkit's PeepholeLSTM)
    // ------------------------------------------------------------
    function Na__Network__Lstm(at: i32, input: usize, rows: i32, h: usize, c: usize): void {
        const matrix = Na__Network__weights + (<usize>at << 2);
        const z = Na__Network__z;
        Na__Network__MatVec(z, input, rows, matrix, Na__Network__GATES);
        const v = matrix + (<usize>(rows * Na__Network__GATES) << 2);          // <-- W_ci, b_i, W_cf, b_f, b_c, W_co, b_o
        const n = Na__Network__H_BYTES;                                          // <-- One gate's (or vector's) bytes
        for (let k: usize = 0; k < n; k += 4) {
            const ct = load<f32>(c + k);
            const gi = Na__Network__Sigmoid(load<f32>(z + k) + ct * load<f32>(v + k) + load<f32>(v + n + k));
            const gf = Na__Network__Sigmoid(load<f32>(z + n + k) + ct * load<f32>(v + 2 * n + k) + load<f32>(v + 3 * n + k));
            const cn = gf * ct + gi * Mathf.tanh(load<f32>(z + 2 * n + k) + load<f32>(v + 4 * n + k));
            const go = Na__Network__Sigmoid(load<f32>(z + 3 * n + k) + cn * load<f32>(v + 5 * n + k) + load<f32>(v + 6 * n + k));
            store<f32>(c + k, cn);
            store<f32>(h + k, go * Mathf.tanh(cn));
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Soft Window: where the pen is along the words, and what it reads there (the toolkit's SoftWindow)
    // ------------------------------------------------------------
    function Na__Network__Window(): void {
        const matrix = Na__Network__weights + (<usize>Na__Network__AT_WINDOW << 2);
        const out = Na__Network__winOut;
        Na__Network__MatVec(out, Na__Network__h1, Na__Network__HIDDEN, matrix, Na__Network__WINDOW_OUT);
        const b = matrix + (<usize>(Na__Network__HIDDEN * Na__Network__WINDOW_OUT) << 2);
        for (let g = 0; g < Na__Network__WINDOW_K; g++) {
            const k = <usize>g << 2;
            store<f32>(Na__Network__alpha + k, Mathf.exp(load<f32>(out + k) + load<f32>(b + k)));
            store<f32>(Na__Network__beta + k, Mathf.exp(load<f32>(out + k, 40) + load<f32>(b + k, 40)));
            store<f32>(Na__Network__kappa + k, load<f32>(Na__Network__kappa + k) + Mathf.exp(load<f32>(out + k, 80) + load<f32>(b + k, 80)));
        }
        const chars = Na__Network__chars;
        for (let u = 0; u < chars; u++) {
            const position = <f32>u;
            let sum: f32 = 0;
            for (let g = 0; g < Na__Network__WINDOW_K; g++) {
                const k = <usize>g << 2;
                const d = load<f32>(Na__Network__kappa + k) - position;
                sum += load<f32>(Na__Network__alpha + k) * Mathf.exp(-load<f32>(Na__Network__beta + k) * (d * d));
            }
            store<f32>(Na__Network__phi + (<usize>u << 2), sum);
        }
        memory.fill(Na__Network__w, 0, Na__Network__W_BYTES);                  // <-- phi times the words' one-hot rows: each character gets its weight
        for (let u = 0; u < chars; u++) {
            const code = load<i32>(Na__Network__text + (<usize>u << 2));
            if (<u32>code >= <u32>Na__Network__ALPHABET) continue;
            const slot = Na__Network__w + (<usize>code << 2);
            store<f32>(slot, load<f32>(slot) + load<f32>(Na__Network__phi + (<usize>u << 2)));
        }
    }
    // ------------------------------------------------------------


    // FUNCTION | The Mixture: the pen's next move as weighted Gaussians, sharpened by the bias (the toolkit's MixtureDensityLayer)
    // ------------------------------------------------------------
    function Na__Network__Mixture(bias: f32): void {
        const matrix = Na__Network__weights + (<usize>Na__Network__AT_MIXTURE << 2);
        const out = Na__Network__mixOut;
        const mix = Na__Network__mix;
        Na__Network__MatVec(out, Na__Network__mixIn, Na__Network__MIX_ROWS, matrix, Na__Network__MIXTURE_OUT);
        const b = matrix + (<usize>(Na__Network__MIX_ROWS * Na__Network__MIXTURE_OUT) << 2);

        const sharpen: f32 = <f32>1 + bias;                                      // <-- pi: softmax(pi_hat x (1 + bias))
        let top = f32.NEGATIVE_INFINITY;
        for (let m = 0; m < Na__Network__MIXTURES; m++) {
            const k = <usize>m << 2;
            const v = (load<f32>(out + k) + load<f32>(b + k)) * sharpen;
            store<f32>(mix + k, v);
            if (v > top) top = v;
        }
        let total: f32 = 0;
        for (let m = 0; m < Na__Network__MIXTURES; m++) {
            const k = <usize>m << 2;
            const e = Mathf.exp(load<f32>(mix + k) - top);
            store<f32>(mix + k, e);
            total += e;
        }
        for (let m = 0; m < Na__Network__MIXTURES; m++) {
            const k = <usize>m << 2;
            store<f32>(mix + k, load<f32>(mix + k) / total);
        }
        for (let m = 20; m < 60; m++) {                                         // <-- mu: x means, then y means
            const k = <usize>m << 2;
            store<f32>(mix + k, load<f32>(out + k) + load<f32>(b + k));
        }
        for (let m = 60; m < 100; m++) {                                        // <-- sd: exp(sd_hat - bias)
            const k = <usize>m << 2;
            store<f32>(mix + k, Mathf.exp((load<f32>(out + k) + load<f32>(b + k)) - bias));
        }
        for (let m = 100; m < 120; m++) {                                       // <-- ro: tanh
            const k = <usize>m << 2;
            store<f32>(mix + k, Mathf.tanh(load<f32>(out + k) + load<f32>(b + k)));
        }
        store<f32>(mix, Na__Network__Sigmoid(load<f32>(out, 480) + load<f32>(b, 480)), 480);   // <-- eos: the pen lifts after this step
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Pen Step
// -----------------------------------------------------------------------------

    // FUNCTION | One Step of the Network From the Last Pen Step (Na__Network__x) (_sample_sequence's body)
    // ------------------------------------------------------------
    function Na__Network__Step(bias: f32): void {
        const X = Na__Network__X_BYTES, W = Na__Network__W_BYTES, H = Na__Network__H_BYTES;

        let p = Na__Network__in1;                                                // <-- [x, the last window, h1]
        memory.copy(p, Na__Network__x, X);
        memory.copy(p + X, Na__Network__w, W);
        memory.copy(p + X + W, Na__Network__h1, H);
        Na__Network__Lstm(Na__Network__AT_L1, p, Na__Network__L1_ROWS, Na__Network__h1, Na__Network__c1);
        Na__Network__Window();

        p = Na__Network__in2;                                                    // <-- [x, h1, the new window, h2]
        memory.copy(p, Na__Network__x, X);
        memory.copy(p + X, Na__Network__h1, H);
        memory.copy(p + X + H, Na__Network__w, W);
        memory.copy(p + X + H + W, Na__Network__h2, H);
        Na__Network__Lstm(Na__Network__AT_L2, p, Na__Network__L2_ROWS, Na__Network__h2, Na__Network__c2);

        p = Na__Network__in3;                                                    // <-- [x, h2, the new window, h3]
        memory.copy(p, Na__Network__x, X);
        memory.copy(p + X, Na__Network__h2, H);
        memory.copy(p + X + H, Na__Network__w, W);
        memory.copy(p + X + H + W, Na__Network__h3, H);
        Na__Network__Lstm(Na__Network__AT_L3, p, Na__Network__L3_ROWS, Na__Network__h3, Na__Network__c3);

        p = Na__Network__mixIn;                                                  // <-- [h1, h2, h3]
        memory.copy(p, Na__Network__h1, H);
        memory.copy(p + H, Na__Network__h2, H);
        memory.copy(p + 2 * H, Na__Network__h3, H);
        Na__Network__Mixture(bias);
    }
    // ------------------------------------------------------------


    // FUNCTION | Draw the Pen's Next Move From the Mixture (get_mean_prediction, stochastic)
    // ------------------------------------------------------------
    // One Gaussian by its weight, then a point from it (Box-Muller and the
    // covariance's Cholesky factor: what torch's MultivariateNormal does). The
    // pen lifts when the model's lift chance is over a half, as in the toolkit.
    // ------------------------------------------------------------
    function Na__Network__Draw(): void {
        const mix = Na__Network__mix;
        let total: f64 = 0;
        for (let m = 0; m < Na__Network__MIXTURES; m++) total += <f64>load<f32>(mix + (<usize>m << 2));
        const target = <f64>Na__Network__Next() * Na__Network__TO_UNIT * total;
        let chosen = Na__Network__MIXTURES - 1;
        let sum: f64 = 0;
        for (let m = 0; m < Na__Network__MIXTURES; m++) {
            sum += <f64>load<f32>(mix + (<usize>m << 2));
            if (target < sum) { chosen = m; break; }
        }
        const k = <usize>chosen << 2;
        const mu1 = <f64>load<f32>(mix + k, 80),  mu2 = <f64>load<f32>(mix + k, 160);
        const sd1 = <f64>load<f32>(mix + k, 240), sd2 = <f64>load<f32>(mix + k, 320);
        const ro  = <f64>load<f32>(mix + k, 400);
        const u1 = (<f64>Na__Network__Next() + 1.0) * Na__Network__TO_UNIT;     // <-- (0, 1]: never log(0)
        const u2 = <f64>Na__Network__Next() * Na__Network__TO_UNIT;
        const r = Math.sqrt(-2.0 * Math.log(u1));
        const z1 = r * Math.cos(2.0 * Math.PI * u2);
        const z2 = r * Math.sin(2.0 * Math.PI * u2);
        Na__Network__px = <f32>(mu1 + sd1 * z1);
        Na__Network__py = <f32>(mu2 + sd2 * (ro * z1 + Math.sqrt(Math.max(0.0, 1.0 - ro * ro)) * z2));
        Na__Network__pe = load<f32>(mix, 480) > <f32>0.5 ? <f32>1 : <f32>0;
    }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Module's Calls (its exports)
// -----------------------------------------------------------------------------

    // FUNCTION | Begin a Phrase of `chars` Characters (their codes already at Na__Network__TextPointer())
    // ------------------------------------------------------------
    export function Na__Network__Reset(chars: i32): void {
        Na__Network__chars = min(max(chars, 1), Na__Network__MAX_CHARS);
        const H = Na__Network__H_BYTES;
        memory.fill(Na__Network__x, 0, 16);
        memory.fill(Na__Network__w, 0, Na__Network__W_BYTES);
        memory.fill(Na__Network__kappa, 0, 64);
        memory.fill(Na__Network__h1, 0, H);
        memory.fill(Na__Network__c1, 0, H);
        memory.fill(Na__Network__h2, 0, H);
        memory.fill(Na__Network__c2, 0, H);
        memory.fill(Na__Network__h3, 0, H);
        memory.fill(Na__Network__c3, 0, H);
        memory.fill(Na__Network__coverage, 0, <usize>Na__Network__MAX_CHARS << 2);
    }
    // ------------------------------------------------------------


    // FUNCTION | One Step From a Given Pen Step (the parity check's teacher forcing; the mixture lands at Na__Network__MixPointer())
    // ------------------------------------------------------------
    export function Na__Network__Advance(dx: f32, dy: f32, up: f32, bias: f32): void {
        store<f32>(Na__Network__x, dx);
        store<f32>(Na__Network__x, dy, 4);
        store<f32>(Na__Network__x, up, 8);
        Na__Network__Step(bias);
    }
    // ------------------------------------------------------------


    // FUNCTION | Write a Phrase: the pen steps it took (at Na__Network__PointsPointer()), and how many
    // ------------------------------------------------------------
    // From a still pen, a step at a time, each step's draw fed back in, until
    // the window has passed the last character (its weight there over 0.8, or
    // its peak there and the pen lifting: the toolkit's _is_end_of_string), or
    // `steps` run out (the worker then tries again). Each step's window peak is
    // counted in Na__Network__CoveragePointer(), so the worker can tell a
    // character that was skipped.
    // ------------------------------------------------------------
    export function Na__Network__Sample(chars: i32, steps: i32, bias: f32, seed: u32): i32 {
        Na__Network__Reset(chars);
        Na__Network__Seed(seed);
        const limit = min(max(steps, 1), Na__Network__MAX_STEPS);
        const last = Na__Network__chars - 1;
        const phi = Na__Network__phi;
        for (let t = 0; t < limit; t++) {
            Na__Network__Step(bias);

            let peak = 0;
            let peakWeight = load<f32>(phi);
            for (let u = 1; u <= last; u++) {
                const v = load<f32>(phi + (<usize>u << 2));
                if (v > peakWeight) { peakWeight = v; peak = u; }                // <-- The first of equal peaks, as torch's argmax
            }
            const counted = Na__Network__coverage + (<usize>peak << 2);
            store<i32>(counted, load<i32>(counted) + 1);

            Na__Network__Draw();
            const done = load<f32>(phi + (<usize>last << 2)) > <f32>0.8 || (peak == last && Na__Network__pe > <f32>0.5);
            if (done) Na__Network__pe = 1;

            const at = Na__Network__points + (<usize>(t * 3) << 2);
            store<f32>(at, Na__Network__px);
            store<f32>(at, Na__Network__py, 4);
            store<f32>(at, Na__Network__pe, 8);
            if (done) return t + 1;

            store<f32>(Na__Network__x, Na__Network__px);
            store<f32>(Na__Network__x, Na__Network__py, 4);
            store<f32>(Na__Network__x, Na__Network__pe, 8);
        }
        return limit;
    }
    // ------------------------------------------------------------


    // FUNCTION | Where Things Are, and the Limits
    // ------------------------------------------------------------
    export function Na__Network__Format(): i32          { return Na__Network__FORMAT; }
    export function Na__Network__WeightsFloats(): i32   { return Na__Network__WEIGHTS; }
    export function Na__Network__MaxChars(): i32        { return Na__Network__MAX_CHARS; }
    export function Na__Network__MaxSteps(): i32        { return Na__Network__MAX_STEPS; }
    export function Na__Network__Alphabet(): i32        { return Na__Network__ALPHABET; }
    export function Na__Network__WeightsPointer(): usize  { return Na__Network__weights; }
    export function Na__Network__TextPointer(): usize     { return Na__Network__text; }
    export function Na__Network__PointsPointer(): usize   { return Na__Network__points; }
    export function Na__Network__CoveragePointer(): usize { return Na__Network__coverage; }
    export function Na__Network__MixPointer(): usize      { return Na__Network__mix; }
    export function Na__Network__PhiPointer(): usize      { return Na__Network__phi; }
    export function Na__Network__KappaPointer(): usize    { return Na__Network__kappa; }
    // ------------------------------------------------------------

// endregion -------------------------------------------------------------------
