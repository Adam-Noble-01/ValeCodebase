// =============================================================================
// VALEVISION AURA - BUILD UTIL | HANDWRITING PARITY: THE WEBASSEMBLY'S SIDE
// =============================================================================
//
// FILE       : AuraRender__BuildUtil__HandwritingParity__.mjs
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove the WebAssembly network is the toolkit's network: feed both
//              builds the pen path torch walked, compare every step's mixture,
//              window and kappa with torch's, prove the SIMD and scalar builds
//              agree to the bit, and time a phrase
// CREATED    : 30-Oct-2026
//
// DESCRIPTION:
// - READS torch's side (21__Generated__HandwritingParity/
//   HandwritingParity__Reference__.json, written by
//   AuraRender__BuildUtil__HandwritingParity__.py), both modules in
//   02__Src__AppModules/31__System__Handwriting/02__Engine__Wasm, and the model
//   (Server__Api/Api__ValeVision__AuraRender/Content__AuraHandwritingModel).
// - PASSES when every step agrees with torch within NA__PARITY__TOLERANCE (the
//   two sum in different orders, so the last bits differ) and the two builds
//   agree exactly: on the teacher-forced steps and on whole sampled phrases.
//
// USAGE:
//   node AuraRender__BuildUtil__HandwritingParity__.mjs      (or: npm run check:handwriting)
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 30-Oct-2026 - Version 1.0.0
// - Initial build (AURA 0.2.1).
//
// =============================================================================

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


// -----------------------------------------------------------------------------
// REGION | Constants
// -----------------------------------------------------------------------------

const NA__PARITY__HERE       = path.dirname(fileURLToPath(import.meta.url));
const NA__PARITY__ENGINE     = path.resolve(NA__PARITY__HERE, '..', '02__Src__AppModules', '31__System__Handwriting', '02__Engine__Wasm');
const NA__PARITY__MODEL      = path.resolve(NA__PARITY__HERE, '..', '..', 'Server__Api', 'Api__ValeVision__AuraRender', 'Content__AuraHandwritingModel');
const NA__PARITY__MANIFEST   = 'AuraRender__HandwritingModel__Epoch46__Manifest__.json';
const NA__PARITY__REFERENCE  = path.join(NA__PARITY__HERE, '21__Generated__HandwritingParity', 'HandwritingParity__Reference__.json');
const NA__PARITY__BUILDS     = { Simd: 'Na__HandwritingEngine__Network__Simd__.wasm', Scalar: 'Na__HandwritingEngine__Network__Scalar__.wasm' };
const NA__PARITY__TOLERANCE  = 1e-3;                                             // <-- Absolute (relative for sd and kappa); f32 sums in other orders differ near 1e-5

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Engine in Node
// -----------------------------------------------------------------------------

async function Na__Parity__Engine(file, manifest, weights) {
    const bytes = await readFile(path.join(NA__PARITY__ENGINE, file));
    const { instance } = await WebAssembly.instantiate(bytes, { env: { abort() { throw new Error(`${file}: abort`); } } });
    const e = instance.exports;
    if (e.Na__Network__Format() !== 1) throw new Error(`${file}: weights format ${e.Na__Network__Format()}`);
    if (e.Na__Network__WeightsFloats() !== manifest.HandwritingModel__Floats) throw new Error(`${file}: expects ${e.Na__Network__WeightsFloats()} floats`);
    new Uint8Array(e.memory.buffer, e.Na__Network__WeightsPointer(), weights.length).set(weights);
    return e;
}

function Na__Parity__TeacherForced(e, kase) {
    const u = kase.codes.length;
    new Int32Array(e.memory.buffer, e.Na__Network__TextPointer(), u).set(kase.codes);
    e.Na__Network__Reset(u);
    const mix = new Float32Array(e.memory.buffer, e.Na__Network__MixPointer(), 128);
    const phi = new Float32Array(e.memory.buffer, e.Na__Network__PhiPointer(), u);
    const kappa = new Float32Array(e.memory.buffer, e.Na__Network__KappaPointer(), 10);
    const steps = [];
    let x = [0, 0, 0];
    for (let t = 0; t < kase.steps.length; t++) {
        e.Na__Network__Advance(x[0], x[1], x[2], kase.bias);
        steps.push({ mix: Float32Array.from(mix), phi: Float32Array.from(phi), kappa: Float32Array.from(kappa) });
        x = kase.path[t];
    }
    return steps;
}

function Na__Parity__Sampled(e, kase, seed) {
    const u = kase.codes.length;
    new Int32Array(e.memory.buffer, e.Na__Network__TextPointer(), u).set(kase.codes);
    const start = performance.now();
    const n = e.Na__Network__Sample(u, Math.min(6500, Math.max(1200, u * 110)), kase.bias, seed);
    const ms = performance.now() - start;
    return { n, ms, points: Float32Array.from(new Float32Array(e.memory.buffer, e.Na__Network__PointsPointer(), n * 3)),
             coverage: Int32Array.from(new Int32Array(e.memory.buffer, e.Na__Network__CoveragePointer(), u)) };
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Checks
// -----------------------------------------------------------------------------

function Na__Parity__AgainstTorch(reference, steps) {
    const worst = { pi: 0, mu: 0, sd: 0, ro: 0, eos: 0, phi: 0, kappa: 0 };
    const at = { pi: 0, mu: 0, sd: 0, ro: 0, eos: 0, phi: 0, kappa: 0 };
    const note = (key, value, t) => { if (value > worst[key]) { worst[key] = value; at[key] = t; } };
    reference.steps.forEach((r, t) => {
        const g = steps[t];
        for (let k = 0; k < 20; k++) note('pi', Math.abs(r.pi[k] - g.mix[k]), t);
        for (let k = 0; k < 40; k++) note('mu', Math.abs(r.mu[k] - g.mix[20 + k]), t);
        for (let k = 0; k < 40; k++) note('sd', Math.abs(r.sd[k] - g.mix[60 + k]) / Math.max(1e-6, Math.abs(r.sd[k])), t);
        for (let k = 0; k < 20; k++) note('ro', Math.abs(r.ro[k] - g.mix[100 + k]), t);
        note('eos', Math.abs(r.eos - g.mix[120]), t);
        r.phi.forEach((v, u) => note('phi', Math.abs(v - g.phi[u]), t));
        r.kappa.forEach((v, k) => note('kappa', Math.abs(v - g.kappa[k]) / Math.max(1, Math.abs(v)), t));   // <-- Relative: kappa is a running position along the words (0 to ~25)
    });
    return { worst, at, ok: Object.values(worst).every((v) => v < NA__PARITY__TOLERANCE) };
}

function Na__Parity__SameBits(a, b) {
    const x = new Uint32Array(a.buffer, a.byteOffset, a.length), y = new Uint32Array(b.buffer, b.byteOffset, b.length);
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
    return true;
}

async function Na__Parity__Main() {
    const manifest = JSON.parse(await readFile(path.join(NA__PARITY__MODEL, NA__PARITY__MANIFEST), 'utf8'));
    const weights = await readFile(path.join(NA__PARITY__MODEL, manifest.HandwritingModel__File));
    const sha = createHash('sha256').update(weights).digest('hex');
    if (sha !== manifest.HandwritingModel__Sha256) throw new Error('the weights file does not match its manifest: rebuild it');
    const reference = JSON.parse(await readFile(NA__PARITY__REFERENCE, 'utf8'));
    const engines = {};
    for (const [key, file] of Object.entries(NA__PARITY__BUILDS)) engines[key] = await Na__Parity__Engine(file, manifest, weights);

    let pass = true;
    for (const kase of reference.cases) {
        console.log(`\n"${kase.words}" (bias ${kase.bias}, ${kase.steps.length} steps along torch's path)`);
        const forced = {};
        for (const [key, e] of Object.entries(engines)) {
            forced[key] = Na__Parity__TeacherForced(e, kase);
            const { worst, at, ok } = Na__Parity__AgainstTorch(kase, forced[key]);
            pass = pass && ok;
            console.log(`  ${key.padEnd(6)} vs torch: ${ok ? 'PASS' : 'FAIL'}  ` +
                Object.entries(worst).map(([k, v]) => `${k} ${v.toExponential(1)}@${at[k]}`).join('  '));
        }
        const sameForced = forced.Simd.every((s, t) => Na__Parity__SameBits(s.mix, forced.Scalar[t].mix) && Na__Parity__SameBits(s.phi, forced.Scalar[t].phi));
        pass = pass && sameForced;
        console.log(`  SIMD and scalar, every step: ${sameForced ? 'the same bits' : 'DIFFERENT'}`);

        for (const seed of [42, 1234567]) {
            const simd = Na__Parity__Sampled(engines.Simd, kase, seed);
            const scalar = Na__Parity__Sampled(engines.Scalar, kase, seed);
            const same = simd.n === scalar.n && Na__Parity__SameBits(simd.points, scalar.points);
            const again = Na__Parity__Sampled(engines.Simd, kase, seed);
            const repeat = again.n === simd.n && Na__Parity__SameBits(again.points, simd.points);
            pass = pass && same && repeat;
            const lifts = Array.from({ length: simd.n }, (_, i) => simd.points[i * 3 + 2]).filter((v) => v > 0.5).length;
            console.log(`  seed ${String(seed).padEnd(8)} ${simd.n} steps, ${lifts} pen lifts; SIMD ${(simd.ms / simd.n).toFixed(3)} ms/step, ` +
                `scalar ${(scalar.ms / scalar.n).toFixed(3)} ms/step; builds ${same ? 'identical' : 'DIFFERENT'}; repeat ${repeat ? 'identical' : 'DIFFERENT'}`);
        }
    }
    console.log(`\n${pass ? 'PASS' : 'FAIL'}: the WebAssembly network ${pass ? 'is' : 'is NOT'} the toolkit's network`);
    process.exit(pass ? 0 : 1);
}

Na__Parity__Main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});

// endregion -------------------------------------------------------------------
