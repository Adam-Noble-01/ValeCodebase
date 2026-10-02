// =============================================================================
// W2-07 scratch - behaviour harness for the render loop's v2.58.2 guards
// =============================================================================
//
// Runs ValeVision's REAL Na__AppFlow__LoadingSequence.js with the REAL
// Na__RenderLoop__Invalidation.js and Na__RenderLoop__InteractiveOverlays__.js
// under Node at their browser URLs (W0-13's boot helpers real as well), in one
// of two refiner modes:
//   real - the REAL Na__RenderEffect__ProgressiveRefine__.js with the REAL
//          Na__RenderEffect__Supersampler__.js and the REAL vendored three.js
//          r184 (camera included); the renderer and the composer are recording
//          fakes, the composer's read buffer FRACTIONAL (2498.75 x 1406.25)
//   stub - a scripted refiner whose answers the scenario sets
// Every other import is a generated stub (W1-01's method). requestAnimationFrame
// is a cancellable queue, window.setTimeout a manual queue and performance.now()
// a controllable clock once the sequence has booted, so the harness drives REAL
// ticks deterministically.
//
// Variants: pre (the pre-images), candidate (scratch/candidate), live, mutant
// (W207_LSEQ / W207_REFINE paths). Read-only on the app; writes only its hooks
// to the OS temp folder.
//
// Usage:
//   node w2_07_loop_harness.mjs [--target candidate|live]
//   (internal) node w2_07_loop_harness.mjs --child <variant> <mode> <scenario>
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { register } from 'node:module';


// -----------------------------------------------------------------------------
// REGION | Paths and Constants
// -----------------------------------------------------------------------------

    const HERE      = dirname(fileURLToPath(import.meta.url));
    const APP_ROOT  = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
    const WCP_ROOT  = 'D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia';
    const THREE_DIR = APP_ROOT + '/04__Lib__ThirdParty__VersionLocked/01__Vendor__ThreeJs__v0.184.0';
    const SRC       = '02__Src__AppModules/';
    const LSEQ_REL  = SRC + '01__AppCore/Na__AppFlow__LoadingSequence.js';
    const INVL_REL  = SRC + '05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    const IOVL_REL  = SRC + '05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js';
    const REFN_REL  = SRC + '05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js';
    const SUPS_REL  = SRC + '05__RenderPipeline/Na__RenderEffect__Supersampler__.js';
    const BOOT_RELS = [
        SRC + '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js',
        SRC + '03__AppUtils/Na__AppUtils__ProjectLoader.js',
        SRC + '03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js',
        SRC + '03__AppUtils/Na__AppUtils__ResilientLoad__.js',
        SRC + '01__AppCore/Na__AppCore__LoadWatchdog__.js',
        SRC + '10__NavigationAndCameras/Na__NavigationModes__State.js'
    ];
    const VARIANT_FILES = {
        pre       : { [LSEQ_REL] : join(HERE, 'BACKUP__LoadingSequence.js.orig'),
                      [REFN_REL] : join(HERE, 'BACKUP__ProgressiveRefine.js.orig') },
        candidate : { [LSEQ_REL] : join(HERE, 'candidate', 'Na__AppFlow__LoadingSequence.js'),
                      [REFN_REL] : join(HERE, 'candidate', 'Na__RenderEffect__ProgressiveRefine__.js') },
        live      : { [LSEQ_REL] : join(APP_ROOT, LSEQ_REL),
                      [REFN_REL] : join(APP_ROOT, REFN_REL) },
        mutant    : { [LSEQ_REL] : process.env.W207_LSEQ || join(HERE, 'candidate', 'Na__AppFlow__LoadingSequence.js'),
                      [REFN_REL] : process.env.W207_REFINE || join(HERE, 'candidate', 'Na__RenderEffect__ProgressiveRefine__.js') }
    };

    // CONTROLLABLE STUBS | rel -> { exported name -> JS expression }
    const OVERRIDES_COMMON = {
        [SRC + '40__System__DrawingViewCore/Na__DrawView__ActiveView__.js'] : {
            Na__DrawView__GetCamera : '() => globalThis.__W207.drawingCamera' },
        [SRC + '40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js'] : {
            Na__DrawView__RenderPreset__RenderFrame : "() => { globalThis.__W207.count('preset.RenderFrame'); return true; }" },
        [SRC + '31__System__VideoStudio/Na__VideoStudio__Playback__PreviewController.js'] : {
            Na__VideoStudio__Preview__IsPlaying            : '() => false',
            Na__VideoStudio__Preview__AreAnimationsEnabled : '() => false',
            Na__VideoStudio__Preview__UpdateFrame          : '() => {}' },
        [SRC + '10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js'] : {
            Na__WalkMode__IsActive : '() => false', Na__WalkMode__Update : '() => {}',
            Na__WalkMode__GetCapsulePosition : '() => null', Na__WalkMode__SetCollisionMeshes : '() => {}' },
        [SRC + '10__NavigationAndCameras/Na__Navmode__FlyMode__SystemLogic.js'] : {
            Na__FlyMode__IsActive : '() => false', Na__FlyMode__Update : '() => {}', Na__FlyMode__GetCameraPosition : '() => null' },
        [SRC + '25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js'] : {
            Na__DoorAnimation__HasActiveAnimations : '() => false', Na__DoorAnimation__Update : '() => {}' },
        [SRC + '11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js'] : {
            Na__VerticalCorrection__ApplyFrame : "() => { if (globalThis.__W207.throwInFrame) { globalThis.__W207.throwInFrame = false; throw new Error('W2-07 planted frame fault'); } }" },
        [SRC + '05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js'] : {
            Na__RenderPipeline__PureEngine__SetupComposer : '() => globalThis.__W207.pipeline()' },
        [SRC + '05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js'] : {
            Na__RenderPipeline__MaxEngine__SetupComposer : '() => globalThis.__W207.pipeline()' }
    };
    const OVERRIDES_STUB_REFINER = {
        [REFN_REL] : {
            Na__ProgressiveRefine__Create : '() => globalThis.__W207.stubRefiner()', Na__ProgressiveRefine__SetActive : '() => {}' }
    };

    const FLASK_ORIGIN = 'http://localhost:8000';
    const FLASK_BASE   = FLASK_ORIGIN + '/ValeVision3D/';
    const CDN          = 'https://cdn.noble-architecture.com';
    const INDEX_URL    = CDN + '/VaApps/Index/Na__MasterIndex__ProjectLocations__.json';
    const MANIFEST_URL = CDN + '/VaApps/Index/Na__BuildVersion__Manifest__.json';
    const APP_CONFIG   = JSON.parse(readFileSync(join(APP_ROOT, SRC, '02__AppData/Na__AppConfig__Main.json'), 'utf8'));
    const INDEX_TEXT   = readFileSync(join(WCP_ROOT, '02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json'), 'utf8');
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const IsRealThree = (specifier) => specifier === 'three' || specifier.startsWith('three/addons/postprocessing/');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Child: Stubs, Hooks, Fakes
// -----------------------------------------------------------------------------

    function ParseImports(source) {
        const out = [];
        const pattern = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
        let match;
        while ((match = pattern.exec(source))) {
            const names = match[1].split(',').map((part) => part.replace(/\/\/.*$/gm, '').trim()).filter(Boolean)
                .map((part) => part.split(/\s+as\s+/)[0].trim());
            out.push({ names : names, specifier : match[2] });
        }
        return out;
    }

    function BuildStubs(realFiles, overrides) {
        const wanted = new Map();
        Object.entries(realFiles).forEach(([ rel, file ]) => {
            ParseImports(readFileSync(file, 'utf8')).forEach(({ names, specifier }) => {
                if (IsRealThree(specifier)) return;
                const target = (specifier.startsWith('./') || specifier.startsWith('../'))
                    ? new URL(specifier, 'http://x/' + rel).pathname.slice(1)
                    : '__bare__/' + specifier;
                if (realFiles[target]) return;
                if (!wanted.has(target)) wanted.set(target, new Set());
                names.forEach((name) => wanted.get(target).add(name));
            });
        });
        const factory = [
            'function __stub(path) {',
            '    const target = function () {};',
            '    return new Proxy(target, {',
            "        get(t, prop) {",
            "            if (prop === 'then') return undefined;",
            "            if (prop === Symbol.toPrimitive) return (hint) => (hint === 'number' ? 1 : '[stub ' + path + ']');",
            '            if (prop === Symbol.iterator) return function* () {};',
            "            if (typeof prop === 'symbol') return undefined;",
            "            if (prop === 'toJSON') return () => '[stub ' + path + ']';",
            "            return __stub(path + '.' + String(prop));",
            '        },',
            "        apply() { return __stub(path + '()'); },",
            "        construct() { return __stub('new ' + path); },",
            '        set() { return true; }, has() { return false; }, deleteProperty() { return true; }',
            '    });',
            '}'
        ].join('\n');
        const stubs = {};
        wanted.forEach((names, rel) => {
            const diskFile = rel.startsWith('__bare__/') ? null : join(APP_ROOT, rel);
            const realText = (diskFile && existsSync(diskFile)) ? readFileSync(diskFile, 'utf8') : '';
            const custom   = overrides[rel] || {};
            const lines    = [ factory ];
            [ ...names ].sort().forEach((name) => {
                if (custom[name]) { lines.push('export const ' + name + ' = ' + custom[name] + ';'); return; }
                const literal = realText.match(new RegExp('const\\s+' + name + '\\s*=\\s*([\'"])([^\'"]*)\\1\\s*;'));
                if (literal) lines.push('export const ' + name + ' = ' + JSON.stringify(literal[2]) + ';');
                else lines.push('export const ' + name + " = __stub('" + name + "');");
            });
            Object.keys(custom).forEach((name) => { if (!names.has(name)) throw new Error('override ' + name + ' is not imported from ' + rel); });
            stubs[rel] = lines.join('\n') + '\n';
        });
        Object.keys(overrides).forEach((rel) => { if (!stubs[rel]) throw new Error('override module not imported: ' + rel); });
        return stubs;
    }

    const HOOKS_SOURCE = [
        "import { readFileSync } from 'node:fs';",
        'let S = null;',
        'export async function initialize(data) { S = data; }',
        'function baseOf(url) { return S.bases.find((base) => url.startsWith(base)) || null; }',
        'export async function resolve(specifier, context, nextResolve) {',
        "    if (specifier === 'three') return { url : 'file:///' + S.threeDir + '/build/three.module.js', shortCircuit : true };",
        "    if (specifier.startsWith('three/addons/postprocessing/')) return { url : 'file:///' + S.threeDir + '/examples/jsm/' + specifier.slice('three/addons/'.length), shortCircuit : true };",
        "    const parent = context.parentURL || '';",
        '    const parentBase = baseOf(parent);',
        '    if (parentBase) {',
        '        let target;',
        "        if (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) target = new URL(specifier, parent).href;",
        "        else if (/^https?:/.test(specifier)) target = specifier;",
        "        else target = parentBase + '__bare__/' + encodeURIComponent(specifier);",
        '        return { url : target, shortCircuit : true };',
        '    }',
        '    if (baseOf(specifier)) return { url : specifier, shortCircuit : true };',
        '    return nextResolve(specifier, context);',
        '}',
        'export async function load(url, context, nextLoad) {',
        '    const base = baseOf(url);',
        '    if (!base) return nextLoad(url, context);',
        "    const rel = decodeURIComponent(url.slice(base.length).split('?')[0]);",
        "    if (S.real[rel]) return { format : 'module', source : readFileSync(S.real[rel], 'utf8'), shortCircuit : true };",
        "    if (S.stubs[rel]) return { format : 'module', source : S.stubs[rel], shortCircuit : true };",
        "    throw new Error('W2-07 harness: no real file and no stub for ' + rel);",
        '}'
    ].join('\n');

    function Stub(path) {
        const target = function () {};
        return new Proxy(target, {
            get(t, prop) {
                if (prop === 'then') return undefined;
                if (prop === Symbol.toPrimitive) return (hint) => (hint === 'number' ? 1 : '[stub ' + path + ']');
                if (prop === Symbol.iterator) return function* () {};
                if (typeof prop === 'symbol') return undefined;
                if (prop === 'toJSON') return () => '[stub ' + path + ']';
                return Stub(path + '.' + String(prop));
            },
            apply() { return Stub(path + '()'); },
            construct() { return Stub('new ' + path); },
            set() { return true; }, has() { return false; }, deleteProperty() { return true; }
        });
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Child: Boot and the Scenarios
// -----------------------------------------------------------------------------

    async function RunChild(variant, mode, scenario) {
        const real = {};
        BOOT_RELS.forEach((rel) => { real[rel] = join(APP_ROOT, rel); });
        real[INVL_REL] = join(APP_ROOT, INVL_REL);
        real[IOVL_REL] = join(APP_ROOT, IOVL_REL);
        real[LSEQ_REL] = VARIANT_FILES[variant][LSEQ_REL];
        const overrides = Object.assign({}, OVERRIDES_COMMON);
        if (mode === 'real') {
            real[REFN_REL] = VARIANT_FILES[variant][REFN_REL];
            real[SUPS_REL] = join(APP_ROOT, SUPS_REL);
        } else {
            Object.assign(overrides, OVERRIDES_STUB_REFINER);
        }
        const stubs = BuildStubs(real, overrides);
        const tmp = mkdtempSync(join(tmpdir(), 'na-w207-loop-'));
        const hooksFile = join(tmp, 'hooks.mjs');
        writeFileSync(hooksFile, HOOKS_SOURCE);
        register(pathToFileURL(hooksFile).href, { parentURL : import.meta.url, data : { bases : [ FLASK_BASE ], real, stubs, threeDir : THREE_DIR } });

        const THREE = await import('three');

        // THE HARNESS STATE THE STUBS READ AND WRITE
        const H = globalThis.__W207 = {
            drawingCamera : null, throwInFrame : false, throwOnRenderAt : 0, counts : {},
            composerRenders : 0, clock : 0, rafQueue : new Map(), rafId : 0, lastTick : null,
            timers : new Map(), timerId : 0, manualTimers : false, frames : [],
            stub : { planMode : 'normal', status : null, pending : null, resets : 0, suspends : 0 },
            count(what) { this.counts[what] = (this.counts[what] || 0) + 1; },
            pipeline() {
                return {
                    composer : H.composer,
                    renderProfileNormals() {}, fxaaPassRef : H.fxaa,
                    setProfileLinesSize() {}, setFxaaSize() {}
                };
            },
            stubRefiner() {
                const s = H.stub;
                return {
                    planFrame() { return s.planMode; },
                    getPendingWork() { return Object.assign({}, s.pending || { wanted : false, delayMs : 0 }); },
                    getStatus() { return Object.assign({}, s.status || { enabled : true, converged : false, samplesDone : 0, sampleCount : 16, fps : 60 }); },
                    suspend() { s.suspends++; }, reset() { s.resets++; }, release() {},
                    noteNormalFrame() {}, presentAgain() { return false; }, renderChunk() { return false; }
                };
            }
        };
        H.fxaa = { enabled : true };
        H.composer = {
            readBuffer : { width : 2498.75, height : 1406.25, texture : { name : 'composer.readBuffer' } },
            renderToScreen : true, setSize() {},
            render() {
                H.composerRenders++;
                if (H.throwOnRenderAt && H.composerRenders === H.throwOnRenderAt) throw new Error('W2-07 planted render fault');
            }
        };
        const R = H.renderer = {
            shadowMap : { autoUpdate : true }, autoClear : true, _target : null, domElement : null,
            presents : 0, accumulates : 0,
            getRenderTarget() { return this._target; }, setRenderTarget(t) { this._target = t || null; },
            getClearAlpha() { return 1; }, getClearColor(c) { if (c && c.set) c.set(0xffffff); return c; },
            setClearColor() {}, clear() {}, setSize() {}, getPixelRatio() { return 1.25; },
            render(mesh) {
                const name = mesh && mesh.material ? mesh.material.name : '';
                if (name === 'Na__Supersampler__Present' && this._target === null) this.presents++;
                else if (name === 'Na__Supersampler__Accumulate') this.accumulates++;
                else H.count('renderer.render:' + (name || 'scene'));
            }
        };

        // CONSOLE | kept, not printed
        const logs = [];
        const keep = (level) => (...parts) => { logs.push({ level, text : parts.map((p) => (p && p.stack) ? String(p.message) : (typeof p === 'string' ? p : JSON.stringify(p))).join(' ') }); };
        console.log = keep('log'); console.info = keep('info'); console.warn = keep('warn'); console.error = keep('error');

        // THE PAGE
        const elements = new Map();
        function Element(id) {
            const classes = new Set();
            return {
                id : id, children : [], style : {}, textContent : '', className : '',
                classList : {
                    add : (...n) => n.forEach((x) => classes.add(x)), remove : (...n) => n.forEach((x) => classes.delete(x)),
                    contains : (x) => classes.has(x),
                    toggle : (x, force) => { const on = (force === undefined) ? !classes.has(x) : !!force; if (on) classes.add(x); else classes.delete(x); return on; }
                },
                appendChild(child) { this.children.push(child); return child; },
                addEventListener() {}, removeEventListener() {}, setAttribute() {}, removeAttribute() {}
            };
        }
        const byId = (id) => { if (!elements.has(id)) elements.set(id, Element(id)); return elements.get(id); };
        [ 'loadingOverlay', 'loadingIndicator', 'statusText', 'renderCanvas' ].forEach(byId);
        const listeners = new Map();
        const raf = (cb) => { const id = ++H.rafId; H.rafQueue.set(id, cb); H.lastTick = cb; return id; };
        const caf = (id) => { H.rafQueue.delete(id); };
        const realSetTimeout = (fn, ms, ...rest) => { const t = setTimeout(fn, ms, ...rest); if (t && t.unref) t.unref(); return t; };
        globalThis.window = {
            location : { hostname : 'localhost', port : '8000', origin : FLASK_ORIGIN, search : '', href : FLASK_BASE + 'index.html' },
            innerWidth : 1280, innerHeight : 800, devicePixelRatio : 1.25,
            setTimeout : (fn, ms, ...rest) => {
                if (!H.manualTimers) return realSetTimeout(fn, ms, ...rest);
                const id = 'T' + (++H.timerId);
                H.timers.set(id, { fn : () => fn(...rest), due : H.clock + (Number(ms) || 0) });
                return id;
            },
            clearTimeout : (t) => { if (typeof t === 'string') H.timers.delete(t); else clearTimeout(t); },
            setInterval : (fn, ms, ...rest) => { const t = setInterval(fn, ms, ...rest); if (t && t.unref) t.unref(); return t; },
            clearInterval : (t) => clearInterval(t),
            requestAnimationFrame : raf, cancelAnimationFrame : caf,
            addEventListener(type, fn, opts) {
                const key = String(type);
                if (!listeners.has(key)) listeners.set(key, []);
                listeners.get(key).push({ fn : fn, once : !!(opts && opts.once) });
            },
            removeEventListener(type, fn) {
                const key = String(type);
                if (listeners.has(key)) listeners.set(key, listeners.get(key).filter((one) => one.fn !== fn));
            },
            dispatchEvent(event) {
                (listeners.get(String(event.type)) || []).slice().forEach((one) => {
                    one.fn(event);
                    if (one.once) window.removeEventListener(event.type, one.fn);
                });
                return true;
            }
        };
        globalThis.document = {
            hidden : false, body : Element('body'),
            getElementById : (id) => byId(id), createElement : (tag) => Element(tag),
            addEventListener() {}, removeEventListener() {}
        };
        globalThis.requestAnimationFrame = raf;
        globalThis.cancelAnimationFrame = caf;
        if (typeof globalThis.CustomEvent !== 'function') {
            globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
        }

        // THE NETWORK | no project: the master index and the build manifest only
        const json = (status, body) => new Response(JSON.stringify(body), { status : status, headers : { 'Content-Type' : 'application/json' } });
        globalThis.fetch = async (input) => {
            const url = String(input instanceof URL ? input.href : input);
            const plain = url.split('?')[0];
            if (plain === INDEX_URL) return new Response(INDEX_TEXT, { status : 200 });
            if (plain === MANIFEST_URL) return json(200, { buildVersion : 'b42' });
            return json(404, { error : 'not in the harness: ' + url });
        };

        // SCRIPTED REFINER SET-UPS (stub mode)
        if (scenario === 'watchdog') {
            H.stub.planMode = 'normal';
            H.stub.status   = { enabled : true, converged : false, samplesDone : 6, sampleCount : 16, fps : 60 };
            H.stub.pending  = { wanted : true, delayMs : 0 };                // <-- TrueVision's reported stall: "6 of 16, wanted, delay 0"
        } else if (scenario === 'stranded') {
            H.stub.status   = { enabled : true, converged : false, samplesDone : 5, sampleCount : 16, fps : 60 };
            H.stub.pending  = { wanted : false, delayMs : 0 };
        } else if (scenario === 'resting') {
            H.stub.status   = { enabled : true, converged : false, samplesDone : 0, sampleCount : 16, fps : 60 };
            H.stub.pending  = { wanted : false, delayMs : 0 };
        }

        // BOOT
        const invl = await import(FLASK_BASE + INVL_REL);
        if (scenario === 'hold_before_boot') invl.Na__RenderLoop__Pause('LayoutEditor');   // <-- a sheet opened while the models load
        const lseq = await import(FLASK_BASE + LSEQ_REL);
        const refineModule = (mode === 'real') ? await import(FLASK_BASE + REFN_REL) : null;
        const resilience = Object.assign(clone(APP_CONFIG.LoadResilience__Config || {}), { LoadResilience__Config__RetryBaseDelayMs : 5, LoadResilience__Config__RetryCount : 1 });
        const camera = new THREE.PerspectiveCamera(50, 1280 / 800, 0.1, 1000);
        camera.position.set(4, 1.6, 9); camera.lookAt(0, 1, 0); camera.updateProjectionMatrix();
        const context = {
            scene : Stub('scene'), camera, renderer : R, controls : Stub('controls'),
            modelRoot : Stub('modelRoot'), lineResolution : Stub('lineResolution'),
            updateNavigation : () => {},
            pipelineRef : { current : null }, showToast : () => {},
            configs : {
                fullAppConfig : clone(APP_CONFIG), lightingConfig : {}, groundPlane : {}, profileLines : {}, models : {},
                modelUrls : [ 'https://cdn.test/model.glb' ], materialsSystem : {}, doorAnimation : {}, cameraFollow : {},
                orbitHelperCubeDebugVisible : false, ambientOcclusion : {},
                progressiveRefine : clone(APP_CONFIG.RenderEffect__ProgressiveRefine),
                sceneEnvironment : {}, distanceCulling : {}, resilienceConfig : resilience
            }
        };
        let bootError = null;
        try { await lseq.Na__AppFlow__StartLoadingSequence(context); }
        catch (error) { bootError = String(error && error.stack ? error.stack.split('\n').slice(0, 3).join(' | ') : error); }
        await new Promise((done) => setTimeout(done, 30));

        // FROM HERE THE HARNESS OWNS TIME
        H.clock = Math.ceil(performance.now()) + 1000;
        const realPerformance = globalThis.performance;
        Object.defineProperty(globalThis, 'performance', { value : { now : () => H.clock, timeOrigin : realPerformance.timeOrigin }, configurable : true, writable : true });
        H.manualTimers = true;
        const bootLogs = logs.length;

        function RunRaf() {
            const first = H.rafQueue.keys().next();
            if (first.done) return false;
            const cb = H.rafQueue.get(first.value);
            H.rafQueue.delete(first.value);
            let threw = null;
            try { cb(H.clock); } catch (error) { threw = String(error && error.message || error); }
            H.frames.push({ at : H.clock, threw });
            return true;
        }
        function FireTimers() {
            for (;;) {
                let next = null;
                H.timers.forEach((t, id) => { if (t.due <= H.clock && (!next || t.due < next[1].due)) next = [ id, t ]; });
                if (!next) return;
                H.timers.delete(next[0]);
                next[1].fn();
            }
        }
        function Pump(ms, stepMs = 16) {
            const end = H.clock + ms;
            while (H.clock < end) { H.clock += stepMs; FireTimers(); RunRaf(); }
        }
        const status = () => (refineModule ? refineModule.Na__ProgressiveRefine__GetActive().getStatus() : null);
        const pending = () => (refineModule ? refineModule.Na__ProgressiveRefine__GetActive().getPendingWork() : null);
        const snap = (label) => ({
            label, clock : H.clock, composerRenders : H.composerRenders, presents : R.presents, accumulates : R.accumulates,
            status : status(), pending : pending(), rafQueued : H.rafQueue.size, timers : H.timers.size,
            framesRun : H.frames.length, thrownFrames : H.frames.filter((f) => f.threw).length,
            resets : H.stub.resets, suspends : H.stub.suspends
        });
        const out = { variant, mode, scenario, bootError, steps : [] };
        const push = (label) => { const s = snap(label); out.steps.push(s); return s; };

        // ---------------------------------------------------------------------
        // SCENARIOS
        // ---------------------------------------------------------------------
        if (!bootError) {
            if (scenario === 'converge') {
                push('booted');
                Pump(1500);
                push('after 1.5 s');
            }

            else if (scenario === 'throw_mid_burst') {
                H.throwOnRenderAt = 12;                                          // <-- the 3rd sample of the second chunk (render #1 is the first ordinary frame)
                push('booted');
                Pump(400);
                push('after the throw');
                Pump(1500);
                push('after 1.9 s');
            }

            else if (scenario === 'hold_mid_burst') {
                push('booted');
                let guard = 0;
                while ((status().samplesDone !== 8) && guard++ < 200) { H.clock += 16; FireTimers(); RunRaf(); }
                push('first chunk done');
                invl.Na__RenderLoop__Pause('LayoutEditor');
                push('held');
                window.dispatchEvent(new CustomEvent('na-request-render'));       // <-- a render request while held
                if (H.lastTick) { try { H.lastTick(H.clock); } catch (e) { out.strayThrew = String(e.message); } } // <-- a stray frame while held
                Pump(3000);
                push('after 3 s held');
                invl.Na__RenderLoop__Resume('LayoutEditor');
                push('resumed');
                H.clock += 16; FireTimers(); RunRaf();
                push('first frame after the resume');
                Pump(1500);
                push('1.5 s after the resume');
            }

            else if (scenario === 'hold_before_boot') {
                push('booted (held since before the loop existed)');
                Pump(3000);
                push('after 3 s held');
                invl.Na__RenderLoop__Resume('LayoutEditor');
                push('resumed');
                H.clock += 16; FireTimers(); RunRaf();
                push('first frame after the resume');
                Pump(1500);
                push('1.5 s after the resume');
            }

            else if (scenario === 'watchdog') {
                push('booted');
                H.stub.resets = 0;
                Pump(3300, 16.7);
                push('after 3.3 s stuck at 6 of 16');
            }

            else if (scenario === 'stranded' || scenario === 'resting') {
                push('booted');
                H.stub.resets = 0;
                H.clock += 16; RunRaf();
                push('one ordinary frame');
                H.clock += 999; FireTimers();
                push('999 ms later');
                H.clock += 1; FireTimers();
                push('1000 ms later');
            }

            else if (scenario === 'thrown_ordinary') {
                push('booted');
                H.throwInFrame = true;
                H.clock += 16; RunRaf();
                push('the thrown frame');
                window.dispatchEvent(new CustomEvent('na-request-render'));
                H.clock += 16; RunRaf();
                push('the next requested frame');
            }

            else if (scenario === 'hidden') {
                push('booted');
                document.hidden = true;                                          // <-- the tab goes away with the first frame already queued
                H.stub.status  = { enabled : true, converged : false, samplesDone : 5, sampleCount : 16, fps : 60 };
                H.stub.pending = { wanted : true, delayMs : 0 };
                H.clock += 16; RunRaf();
                push('a frame while hidden');
            }
        }

        out.logs = logs.slice(bootLogs).filter((l) => l.level === 'warn' || l.level === 'error').slice(0, 20);
        out.frames = H.frames.slice(0, 400);
        rmSync(tmp, { recursive : true, force : true });
        process.stdout.write('RESULT:' + JSON.stringify(out) + '\n');
        process.exit(0);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Parent: Run the Variants and Check Them
// -----------------------------------------------------------------------------

    let passed = 0, failed = 0;
    const failures = [];
    function check(label, ok, detail) {
        if (ok) { passed++; console.log('  PASS  ' + label); }
        else    { failed++; failures.push(label); console.log('  FAIL  ' + label + (detail ? '  -- ' + detail : '')); }
    }

    function Run(variant, mode, scenario, env) {
        const r = spawnSync(process.execPath, [ fileURLToPath(import.meta.url), '--child', variant, mode, scenario ],
                            { encoding : 'utf8', maxBuffer : 64 * 1024 * 1024, env : Object.assign({}, process.env, env || {}) });
        const line = (r.stdout || '').split('\n').find((l) => l.startsWith('RESULT:'));
        if (!line) { console.log(r.stdout); console.log(r.stderr); throw new Error('child ' + variant + '/' + scenario + ' produced no result'); }
        return JSON.parse(line.slice(7));
    }
    const step = (r, prefix) => r.steps.find((s) => s.label.startsWith(prefix));
    const warnings = (r, pattern) => r.logs.filter((l) => l.level === 'warn' && pattern.test(l.text));
    const errors   = (r, pattern) => r.logs.filter((l) => l.level === 'error' && pattern.test(l.text));

    // Each check returns true when the variant behaves as W2-07 requires.
    const CHECKS = {
        converge(r) {
            const end = step(r, 'after 1.5 s');
            return [
                [ 'the loading sequence booted and scheduled its first frame', r.bootError === null && step(r, 'booted').rafQueued === 1, r.bootError ],
                [ 'a fractional composer buffer (2498.75 x 1406.25) converges 16/16 in two chunks through the real loop',
                  end.status.converged && end.status.samplesDone === 16 && end.presents === 2 && end.accumulates === 16, JSON.stringify(end) ],
                [ 'once converged the loop idles: no frame queued, no timer armed', end.rafQueued === 0 && end.timers === 0, JSON.stringify(end) ],
                [ 'no warning or error printed', r.logs.length === 0, JSON.stringify(r.logs) ]
            ];
        },
        throw_mid_burst(r) {
            const t = step(r, 'after the throw'), end = step(r, 'after 1.9 s');
            return [
                [ 'a frame that throws mid-burst does not escape the tick', t.thrownFrames === 0, JSON.stringify(r.frames.filter((f) => f.threw)) ],
                [ 'it is reported once: "[ValeVision3D] Render frame failed; the loop carries on:"',
                  errors(r, /^\[ValeVision3D\] Render frame failed; the loop carries on: W2-07 planted render fault/).length === 1, JSON.stringify(r.logs) ],
                [ 'the loop carries on: the burst resumes and converges 16/16', end.status.converged && end.status.samplesDone === 16 && end.accumulates === 16, JSON.stringify(end) ],
                [ 'and then idles (nothing queued, no timer)', end.rafQueued === 0 && end.timers === 0, JSON.stringify(end) ]
            ];
        },
        hold_mid_burst(r) {
            const held = step(r, 'held'), after = step(r, 'after 3 s held'), first = step(r, 'first frame after the resume'), end = step(r, '1.5 s after the resume');
            return [
                [ 'held mid-burst (8/16): the refiner stands down at once (total discarded, asks for nothing)',
                  held.status.samplesDone === 0 && held.pending.wanted === false, JSON.stringify(held) ],
                [ 'with the sheet open and the engine held, nothing paints for 3 s - no frame, no refinement sample, no present (a render request and a stray frame included)',
                  after.composerRenders === held.composerRenders && after.presents === held.presents && after.accumulates === held.accumulates, JSON.stringify({ held, after }) ],
                [ '...and nothing is left queued or armed while held', after.rafQueued === 0 && after.timers === 0, JSON.stringify(after) ],
                [ 'the resume paints one frame', first.composerRenders === after.composerRenders + 1, JSON.stringify({ after, first }) ],
                [ 'and the refinement runs again to 16/16 after the debounce', end.status.converged && end.presents === after.presents + 2, JSON.stringify(end) ]
            ];
        },
        hold_before_boot(r) {
            const booted = step(r, 'booted'), after = step(r, 'after 3 s held'), first = step(r, 'first frame after the resume'), end = step(r, '1.5 s after the resume');
            return [
                [ 'a hold taken before the loop\'s listeners existed (a sheet opened while the models load): nothing paints for 3 s - no 3D frame over the sheet, no refinement',
                  after.composerRenders === 0 && after.presents === 0 && after.accumulates === 0, JSON.stringify(after) ],
                [ '...the refiner stays stood down and nothing is queued or armed', after.status.samplesDone === 0 && after.pending.wanted === false && after.rafQueued === 0 && after.timers === 0, JSON.stringify(after) ],
                [ 'the resume paints one frame', first.composerRenders === 1, JSON.stringify(first) ],
                [ 'and the refinement then runs to 16/16', end.status.converged && end.presents === 2, JSON.stringify(end) ]
            ];
        },
        watchdog(r) {
            const end = step(r, 'after 3.3 s stuck');
            const warn = warnings(r, /^\[ValeVision3D\] Progressive refinement stalled at 6 of 16; restarting the run\./);
            return [
                [ 'a refinement stuck at 6 of 16 for 2.5 s is reported once with its diagnostic ("[ValeVision3D] Progressive refinement stalled at 6 of 16; restarting the run.")',
                  warn.length === 1 && /"wanted":true/.test(warn[0].text) && /"readBuffer":"2498.75x1406.25"/.test(warn[0].text) && /"held":false/.test(warn[0].text), JSON.stringify(r.logs) ],
                [ '...and restarted (reset once) while the loop keeps running', end.resets === 1 && end.rafQueued === 1, JSON.stringify(end) ]
            ];
        },
        stranded(r) {
            const one = step(r, 'one ordinary frame'), b = step(r, '999 ms later'), c = step(r, '1000 ms later');
            return [
                [ 'a part-finished burst (5/16) left with nothing asked for arms one recovery wake-up and no frame', one.timers === 1 && one.rafQueued === 0, JSON.stringify(one) ],
                [ 'the wake-up does not fire before 1 s', b.resets === 0 && b.rafQueued === 0, JSON.stringify(b) ],
                [ 'at 1 s it restarts the run (reset) and asks for a frame', c.resets === 1 && c.rafQueued === 1, JSON.stringify(c) ]
            ];
        },
        resting(r) {
            const one = step(r, 'one ordinary frame'), c = step(r, '1000 ms later');
            return [
                [ 'a resting refiner (0 samples, nothing wanted) arms nothing: the loop cannot wake itself', one.timers === 0 && one.rafQueued === 0 && c.resets === 0 && c.rafQueued === 0, JSON.stringify({ one, c }) ]
            ];
        },
        thrown_ordinary(r) {
            const t = step(r, 'the thrown frame'), n = step(r, 'the next requested frame');
            return [
                [ 'an ordinary frame that throws does not escape the tick, and is reported', t.thrownFrames === 0 && errors(r, /Render frame failed; the loop carries on: W2-07 planted frame fault/).length === 1, JSON.stringify({ t, logs : r.logs }) ],
                [ 'the next request still paints', n.composerRenders === t.composerRenders + 1, JSON.stringify({ t, n }) ]
            ];
        },
        hidden(r) {
            const h = step(r, 'a frame while hidden');
            return [
                [ 'a frame while the tab is hidden arms nothing, even with a burst wanted (visibilitychange re-arms)', h.framesRun === 1 && h.thrownFrames === 0 && h.rafQueued === 0 && h.timers === 0, JSON.stringify(h) ]
            ];
        }
    };
    const SCENARIOS = [
        [ 'real', 'converge' ], [ 'real', 'throw_mid_burst' ], [ 'real', 'hold_mid_burst' ], [ 'real', 'hold_before_boot' ],
        [ 'stub', 'watchdog' ], [ 'stub', 'stranded' ], [ 'stub', 'resting' ], [ 'stub', 'thrown_ordinary' ], [ 'stub', 'hidden' ]
    ];

    function Evaluate(r) { return CHECKS[r.scenario](r).map(([ label, ok, detail ]) => ({ label, ok : !!ok, detail })); }

    function Main(argv) {
        const target = argv.includes('--target') ? argv[argv.indexOf('--target') + 1] : 'candidate';
        if (argv.includes('--mutant-run')) {
            // used by w2_07_mutants.py: run every scenario on the mutant and print the failing checks
            const bad = [];
            SCENARIOS.forEach(([ mode, scenario ]) => {
                const r = Run('mutant', mode, scenario);
                if (r.bootError) { bad.push(scenario + ': boot error ' + r.bootError); return; }
                Evaluate(r).forEach((c) => { if (!c.ok) bad.push(scenario + ': ' + c.label); });
            });
            process.stdout.write('MUTANT:' + JSON.stringify(bad) + '\n');
            process.exit(0);
        }
        console.log('W2-07 loop harness - ' + target + ' against the pre-images (real LoadingSequence ticks)');
        const contrast = {};
        SCENARIOS.forEach(([ mode, scenario ]) => {
            const neu = Run(target, mode, scenario);
            const pre = Run('pre', mode, scenario);
            console.log('\n  [' + mode + '] ' + scenario);
            check(target + ' booted', neu.bootError === null, neu.bootError);
            Evaluate(neu).forEach((c) => check(c.label, c.ok, c.detail));
            const preResults = pre.bootError ? [ { ok : false, label : 'boot' } ] : Evaluate(pre);
            contrast[scenario] = preResults.filter((c) => !c.ok).map((c) => c.label);
        });
        console.log('\n  CONTRAST - checks the pre-image (LoadingSequence 1.7.2 + ProgressiveRefine 1.0.1) does NOT meet:');
        Object.entries(contrast).forEach(([ scenario, labels ]) => {
            console.log('    ' + scenario + ': ' + (labels.length ? labels.length + ' - ' + labels.join(' | ') : 'none (unchanged behaviour)'));
        });
        // The contrast must show what W2-07 fixes, and nothing it should not change
        check('contrast: the pre-image fails the thrown-frame checks (the guard is new)', contrast.throw_mid_burst.length > 0 && contrast.thrown_ordinary.length > 0);
        check('contrast: the pre-image paints over a sheet held before the loop existed (the IsPaused gate is new)', contrast.hold_before_boot.length > 0);
        check('contrast: the pre-image is silent on a stall and never recovers a stranded burst (watchdog and recovery are new)', contrast.watchdog.length > 0 && contrast.stranded.length > 0);
        check('contrast: unchanged where ValeVision already behaved - convergence, a hold through the events, a resting refiner, a hidden tab',
              contrast.converge.length === 0 && contrast.hold_mid_burst.length === 0 && contrast.resting.length === 0 && contrast.hidden.length === 0,
              JSON.stringify({ converge : contrast.converge, hold_mid_burst : contrast.hold_mid_burst, resting : contrast.resting, hidden : contrast.hidden }));
        console.log('\n' + passed + ' passed, ' + failed + ' failed');
        process.exit(failed === 0 ? 0 : 1);
    }

    if (process.argv.includes('--child')) {
        const i = process.argv.indexOf('--child');
        await RunChild(process.argv[i + 1], process.argv[i + 2], process.argv[i + 3]);
    } else {
        Main(process.argv.slice(2));
    }

// endregion -------------------------------------------------------------------
