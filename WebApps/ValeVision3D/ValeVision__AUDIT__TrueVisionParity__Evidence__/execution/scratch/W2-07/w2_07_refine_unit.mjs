// =============================================================================
// W2-07 scratch - unit harness for Na__RenderEffect__ProgressiveRefine__.js
// =============================================================================
//
// Runs a ProgressiveRefine variant with the REAL ValeVision supersampler
// (05__RenderPipeline/Na__RenderEffect__Supersampler__.js) and the REAL
// vendored three.js r184, under Node. The renderer and the composer are
// recording fakes; performance.now() is a controllable clock. Every variant
// runs in its own child process (fresh module state).
//
// Variants:
//   pre        ValeVision's file before W2-07 (scratch backup)
//   candidate  the W2-07 take (scratch/candidate) or --live: the live file
//   tv         TrueVision's file at the pin b2aa9151 (scratch copy)
//   nofloor    the candidate with the 1.0.3 floor removed (the pre-v2.54.0 bug)
//   frameclock the candidate with planFrame back on the caller's clock (pre-1.0.2)
//
// Usage: node w2_07_refine_unit.mjs [--live]
// Writes only to the OS temp folder.
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { register } from 'node:module';

const HERE     = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const THREE_DIR = APP_ROOT + '/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0';
const SUPERSAMPLER = APP_ROOT + '/02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__Supersampler__.js';
const REFINE_LIVE  = APP_ROOT + '/02__Src__AppModules/05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js';
const APP_CONFIG   = JSON.parse(readFileSync(APP_ROOT + '/02__Src__AppModules/02__AppData/Na__AppConfig__Main.json', 'utf8'));

function VariantSource(variant, live) {
    const candidatePath = live ? REFINE_LIVE : join(HERE, 'candidate', 'Na__RenderEffect__ProgressiveRefine__.js');
    if (variant === 'pre') return readFileSync(join(HERE, 'BACKUP__ProgressiveRefine.js.orig'), 'utf8');
    if (variant === 'tv')  return readFileSync(join(HERE, 'TV__ProgressiveRefine.js'), 'utf8');
    const candidate = readFileSync(candidatePath, 'utf8');
    if (variant === 'candidate') return candidate;
    if (variant === 'nofloor') {
        const a = 'const width  = Math.max(1, Math.floor(readBuffer.width));';
        const b = 'const height = Math.max(1, Math.floor(readBuffer.height));';
        if (!candidate.includes(a) || !candidate.includes(b)) throw new Error('nofloor mutant: anchor missing');
        return candidate.replace(a, 'const width  = readBuffer.width;').replace(b, 'const height = readBuffer.height;');
    }
    if (variant === 'frameclock') {
        const a = 'const { camera, sceneBusy } = context || {};\n                const frameNow = performance.now();';
        const src = candidate.replace(/\r\n/g, '\n');
        if (!src.includes(a)) throw new Error('frameclock mutant: anchor missing');
        return src.replace(a, 'const { camera, sceneBusy, now } = context || {};\n                const frameNow = Number.isFinite(now) ? now : performance.now();');
    }
    throw new Error('unknown variant ' + variant);
}

const HOOKS = [
    "const THREE_DIR = " + JSON.stringify(THREE_DIR) + ";",
    "export async function resolve(specifier, context, nextResolve) {",
    "    if (specifier === 'three') return { url : 'file:///' + THREE_DIR + '/build/three.module.js', shortCircuit : true };",
    "    if (specifier.startsWith('three/addons/')) return { url : 'file:///' + THREE_DIR + '/examples/jsm/' + specifier.slice('three/addons/'.length), shortCircuit : true };",
    "    return nextResolve(specifier, context);",
    "}"
].join('\n');

// -----------------------------------------------------------------------------
// Child
// -----------------------------------------------------------------------------

async function RunChild(variant, live) {
    const tmp = mkdtempSync(join(tmpdir(), 'na-w207-unit-'));
    writeFileSync(join(tmp, 'hooks.mjs'), HOOKS);
    register(pathToFileURL(join(tmp, 'hooks.mjs')).href, import.meta.url);
    writeFileSync(join(tmp, 'Na__RenderEffect__ProgressiveRefine__.js'), VariantSource(variant, live));
    copyFileSync(SUPERSAMPLER, join(tmp, 'Na__RenderEffect__Supersampler__.js'));

    let clock = 10000;
    Object.defineProperty(globalThis, 'performance', { value : { now : () => clock }, configurable : true, writable : true });
    const warnings = [];
    console.warn = (...parts) => warnings.push(parts.map(String).join(' '));

    const THREE  = await import('three');
    const Refine = await import(pathToFileURL(join(tmp, 'Na__RenderEffect__ProgressiveRefine__.js')).href);
    const config = APP_CONFIG.RenderEffect__ProgressiveRefine;

    function MakeWorld(width, height) {
        const accumTargets = new Set();
        const R = {
            shadowMap : { autoUpdate : true }, autoClear : true, _target : null,
            presents : 0, accumulates : 0, clears : 0,
            getRenderTarget() { return this._target; },
            setRenderTarget(t) { this._target = t || null; },
            getClearAlpha() { return 1; },
            getClearColor(c) { if (c && c.set) c.set(0xffffff); return c; },
            setClearColor() {},
            clear() { this.clears++; },
            render(mesh) {
                const name = mesh && mesh.material ? mesh.material.name : '';
                if (name === 'Na__Supersampler__Present' && this._target === null) this.presents++;
                if (name === 'Na__Supersampler__Accumulate') { this.accumulates++; accumTargets.add(this._target); }
            },
            getPixelRatio() { return 1.25; }
        };
        const C = { readBuffer : { width, height, texture : { name : 'composer.readBuffer' } }, renderToScreen : true, renders : 0,
                    render() { this.renders++; } };
        const F = { enabled : true };
        const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000);
        camera.position.set(4, 1.6, 9); camera.lookAt(0, 1, 0); camera.updateProjectionMatrix();
        const refiner = Refine.Na__ProgressiveRefine__Create({ renderer : R, config });
        return { R, C, F, camera, refiner, accumTargets };
    }

    // Drive frames the way the loop does: plan, then refine / present / ordinary.
    function Converge(world, opts) {
        const { R, C, F, camera, refiner } = world;
        const chunks = [];
        let normals = 0, frames = 0;
        const frameMs = opts.frameMs || 0;
        // 1. the first frame of a session takes the camera snapshot
        refiner.planFrame({ camera, sceneBusy : false });
        // 2. warm-up frames while "moving": feed the frame-time average
        for (let i = 0; i < (opts.warmFrames || 0); i++) {
            clock += frameMs;
            refiner.noteNormalFrame(clock, frameMs);
        }
        refiner.reset();                                                  // <-- the last move: the debounce starts here
        // 3. settle and refine
        while (frames < 60) {
            frames++;
            const pending = refiner.getPendingWork();
            clock += pending.wanted ? Math.max(pending.delayMs, 1) : (frameMs || 16);
            const mode = refiner.planFrame({ camera, sceneBusy : false });
            if (mode === Refine.Na__Refine__FRAME_REFINE) {
                const before = refiner.getStatus().samplesDone;
                const drew = refiner.renderChunk({ camera, composer : C, fxaaPass : F, drawChain : () => C.render(), drawOverlay : null, onSample : null });
                const after = refiner.getStatus().samplesDone;
                chunks.push({ drew, from : before, to : after });
                clock += opts.chunkMs || 0;
            } else if (mode === Refine.Na__Refine__FRAME_PRESENT) {
                break;
            } else {
                normals++;
                refiner.noteNormalFrame(clock, frameMs || 16);
            }
            if (refiner.getStatus().converged) break;
        }
        const status = refiner.getStatus();
        return { chunks, normals, frames, samplesDone : status.samplesDone, sampleCount : status.sampleCount,
                 converged : status.converged, presents : R.presents, accumulates : R.accumulates,
                 accumTargets : world.accumTargets.size,
                 targetSize : [ ...world.accumTargets ].map((t) => t ? (t.width + 'x' + t.height) : 'null'),
                 pendingAfter : refiner.getPendingWork(), fxaaRestored : F.enabled === true,
                 renderToScreenRestored : C.renderToScreen === true, shadowRestored : R.shadowMap.autoUpdate === true };
    }

    const out = { variant, exports : Object.keys(Refine).sort(), scenarios : {} };
    out.scenarios.S1_fractional_cold = Converge(MakeWorld(2498.75, 1406.25), {});
    out.scenarios.S2_integer_cold    = Converge(MakeWorld(1600, 900), {});
    out.scenarios.S3_viewport_cold   = Converge(MakeWorld(1600, 843.2), {});
    out.scenarios.S4_fractional_fast = Converge(MakeWorld(2498.75, 1406.25), { warmFrames : 40, frameMs : 10, chunkMs : 80 });
    out.scenarios.S5_fractional_60fps = Converge(MakeWorld(2498.75, 1406.25), { warmFrames : 40, frameMs : 16.6, chunkMs : 100 });

    // S7 | ONE CLOCK: the frame clock lags the wall clock (a chunk ended after the vsync tick)
    {
        const w = MakeWorld(1600, 900);
        w.refiner.planFrame({ camera : w.camera, sceneBusy : false });    // snapshot
        const resetAt = clock;
        w.refiner.reset();                                                // stamped with wall clock
        clock += 100;                                                     // the debounce (90 ms) is served on the wall clock
        const pending = w.refiner.getPendingWork();
        const mode = w.refiner.planFrame({ camera : w.camera, sceneBusy : false, now : resetAt - 160 });   // frame began 160 ms before the reset
        out.scenarios.S7_one_clock = { mode, pending };
    }

    out.warnings = warnings;
    rmSync(tmp, { recursive : true, force : true });
    process.stdout.write('RESULT:' + JSON.stringify(out) + '\n');
}

// -----------------------------------------------------------------------------
// Parent
// -----------------------------------------------------------------------------

let passed = 0, failed = 0;
function check(label, ok, detail) {
    if (ok) { passed++; console.log('  PASS  ' + label); }
    else    { failed++; console.log('  FAIL  ' + label + (detail ? '  -- ' + detail : '')); }
}
function Run(variant, live) {
    const args = [ fileURLToPath(import.meta.url), '--child', variant ];
    if (live) args.push('--live');
    const r = spawnSync(process.execPath, args, { encoding : 'utf8', maxBuffer : 64 * 1024 * 1024 });
    const line = (r.stdout || '').split('\n').find((l) => l.startsWith('RESULT:'));
    if (!line) { console.log(r.stdout); console.log(r.stderr); throw new Error('child ' + variant + ' produced no result'); }
    return JSON.parse(line.slice(7));
}

function Main(live) {
    const target = live ? 'live' : 'candidate';
    const pre = Run('pre', live), cand = Run('candidate', live), tv = Run('tv', live);
    const nofloor = Run('nofloor', live), frameclock = Run('frameclock', live);
    console.log('W2-07 refiner unit harness - ' + target + ' (real Supersampler, real three.js r184)');

    const twoChunks = (s) => s.converged && s.samplesDone === 16 && s.chunks.length === 2
        && s.chunks[0].from === 0 && s.chunks[0].to === 8 && s.chunks[1].from === 8 && s.chunks[1].to === 16;
    [ [ 'S1_fractional_cold', '2498x1406' ], [ 'S2_integer_cold', '1600x900' ], [ 'S3_viewport_cold', '1600x843' ],
      [ 'S4_fractional_fast', '2498x1406' ] ].forEach(([ id, size ]) => {
        const s = cand.scenarios[id];
        check(id + ': converges 16/16 in two chunks (0->8, 8->16)', twoChunks(s), JSON.stringify(s.chunks));
        check(id + ': one accumulation buffer, floored to ' + size + ', never rebuilt', s.accumTargets === 1 && s.targetSize[0] === size, JSON.stringify(s.targetSize));
        check(id + ': 16 samples accumulated, a present after each chunk (2)', s.accumulates === 16 && s.presents === 2, s.accumulates + ' / ' + s.presents);
        check(id + ': FXAA, renderToScreen and shadow auto-update handed back', s.fxaaRestored && s.renderToScreenRestored && s.shadowRestored);
        check(id + ': nothing more is asked for once converged', s.pendingAfter.wanted === false);
    });
    {
        const s = cand.scenarios.S5_fractional_60fps;
        const steps = s.chunks.map((c) => c.to);
        check('S5_fractional_60fps: converges 16/16 on one buffer; every chunk stops ON the milestones 8 and 16',
              s.converged && s.accumTargets === 1 && steps.includes(8) && steps[steps.length - 1] === 16, JSON.stringify(s.chunks));
    }
    check('S7 one clock: the candidate refines on the wall clock whatever frame time the caller passes',
          cand.scenarios.S7_one_clock.mode === 'refine', JSON.stringify(cand.scenarios.S7_one_clock));
    check('S7 contrast: the frame-clock mutant answers "still settling" while getPendingWork says "come back now" (the stall)',
          frameclock.scenarios.S7_one_clock.mode === 'normal' && frameclock.scenarios.S7_one_clock.pending.wanted === true
          && frameclock.scenarios.S7_one_clock.pending.delayMs === 0, JSON.stringify(frameclock.scenarios.S7_one_clock));
    check('S7 contrast: ValeVision\'s pre-W2-07 copy (1.0.1 + floor) is on the frame clock too',
          pre.scenarios.S7_one_clock.mode === 'normal', JSON.stringify(pre.scenarios.S7_one_clock));

    // The floor bites: without it a fractional buffer never converges
    {
        const s = nofloor.scenarios.S1_fractional_cold;
        check('contrast: with the floor removed a fractional buffer is rebuilt every chunk and never converges',
              !s.converged && s.accumTargets > 2 && s.chunks.every((c) => c.to <= 8), JSON.stringify({ chunks : s.chunks.length, targets : s.accumTargets, done : s.samplesDone }));
        check('contrast: ...while an integer buffer still converges without it', nofloor.scenarios.S2_integer_cold.converged === true);
    }

    // TrueVision's own file behaves identically to the take in every scenario
    Object.keys(cand.scenarios).forEach((id) => {
        check('parity: TrueVision 1.0.3 at the pin and the take behave identically in ' + id,
              JSON.stringify(tv.scenarios[id]) === JSON.stringify(cand.scenarios[id]));
    });
    check('exports unchanged by the take (7 names, same as before)', JSON.stringify(cand.exports) === JSON.stringify(pre.exports) && cand.exports.length === 7, cand.exports.join(', '));
    check('no warning printed by the take', cand.warnings.length === 0, cand.warnings.join(' | '));

    console.log('\n' + passed + ' passed, ' + failed + ' failed');
    process.exit(failed === 0 ? 0 : 1);
}

if (process.argv.includes('--child')) {
    await RunChild(process.argv[process.argv.indexOf('--child') + 1], process.argv.includes('--live'));
} else {
    Main(process.argv.includes('--live'));
}
