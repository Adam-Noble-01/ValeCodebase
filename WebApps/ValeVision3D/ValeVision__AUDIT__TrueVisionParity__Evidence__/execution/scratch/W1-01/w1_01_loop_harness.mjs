// =============================================================================
// W1-01 scratch - behaviour harness for the render loop's interactive overlay
// frame and Na__RenderLoop__IsPaused
// =============================================================================
//
// Runs ValeVision's REAL Na__AppFlow__LoadingSequence.js, the REAL
// Na__RenderLoop__Invalidation.js and the REAL
// Na__RenderLoop__InteractiveOverlays__.js under Node at their browser URLs
// (with W0-13's real boot helpers: the facade, ProjectLoader, R2SaveProjectJson,
// ResilientLoad, LoadWatchdog, NavigationModes State). Every other import is a
// generated stub; the modules that decide which branch a frame takes are
// controllable stubs (the drawing camera, Video Studio's preview, walk, fly,
// doors, the refiner, vertical correction, the composer). The composer's
// render() and the drawing preset's RenderFrame() record what a registered
// test overlay's .visible is AT THE MOMENT the frame is drawn.
//
// The requestAnimationFrame callback the loop schedules is captured, so the
// harness drives REAL ticks: a live 3D frame, a 2D drawing frame, a Video
// Studio preview frame, a held frame (Layout Editor hold) and a frame that
// throws after BeginFrame. It runs the pre-image (LoadingSequence 1.7.1 +
// Invalidation 1.1.0) and the W1-01 candidate (or the live files) in separate
// Node processes and compares them.
//
// Read-only on the app: writes only its module hooks to the OS temp folder.
//
// Usage:
//   node w1_01_loop_harness.mjs [--target candidate|live]
//   (internal) node w1_01_loop_harness.mjs --child pre|candidate|live
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
    const SRC       = '02__Src__AppModules/';
    const LSEQ_REL  = SRC + '01__AppCore/Na__AppFlow__LoadingSequence.js';
    const INVL_REL  = SRC + '05__RenderPipeline/Na__RenderLoop__Invalidation.js';
    const IOVL_REL  = SRC + '05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js';
    const BOOT_RELS = [
        SRC + '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js',
        SRC + '03__AppUtils/Na__AppUtils__ProjectLoader.js',
        SRC + '03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js',
        SRC + '03__AppUtils/Na__AppUtils__ResilientLoad__.js',
        SRC + '01__AppCore/Na__AppCore__LoadWatchdog__.js',
        SRC + '10__NavigationAndCameras/Na__NavigationModes__State.js'
    ];
    const VARIANTS = {
        pre       : { [LSEQ_REL] : join(HERE, 'preimage', 'Na__AppFlow__LoadingSequence.js.bak'),
                      [INVL_REL] : join(HERE, 'preimage', 'Na__RenderLoop__Invalidation.js.bak'),
                      [IOVL_REL] : join(HERE, 'candidate', 'Na__RenderLoop__InteractiveOverlays__.js') },    // <-- Imported only by the harness (contrast)
        candidate : { [LSEQ_REL] : join(HERE, 'candidate', 'Na__AppFlow__LoadingSequence.js'),
                      [INVL_REL] : join(HERE, 'candidate', 'Na__RenderLoop__Invalidation.js'),
                      [IOVL_REL] : join(HERE, 'candidate', 'Na__RenderLoop__InteractiveOverlays__.js') },
        live      : { [LSEQ_REL] : join(APP_ROOT, LSEQ_REL),
                      [INVL_REL] : join(APP_ROOT, INVL_REL),
                      [IOVL_REL] : join(APP_ROOT, IOVL_REL) },
        mutant    : { [LSEQ_REL] : process.env.W101_LSEQ || join(HERE, 'candidate', 'Na__AppFlow__LoadingSequence.js'),          // <-- Planted-fault copies (w1_01_mutants.py)
                      [INVL_REL] : process.env.W101_INVL || join(HERE, 'candidate', 'Na__RenderLoop__Invalidation.js'),
                      [IOVL_REL] : join(HERE, 'candidate', 'Na__RenderLoop__InteractiveOverlays__.js') }
    };

    // CONTROLLABLE STUBS | rel -> { exported name -> JS expression }
    const OVERRIDES = {
        [SRC + '40__System__DrawingViewCore/Na__DrawView__ActiveView__.js'] : {
            Na__DrawView__GetCamera : '() => globalThis.__W101.drawingCamera' },
        [SRC + '40__System__DrawingViewCore/Na__DrawView__RenderPreset__.js'] : {
            Na__DrawView__RenderPreset__RenderFrame : "() => { globalThis.__W101.note('preset.RenderFrame'); return true; }" },
        [SRC + '31__System__VideoStudio/Na__VideoStudio__Playback__PreviewController.js'] : {
            Na__VideoStudio__Preview__IsPlaying            : '() => globalThis.__W101.videoPlaying === true',
            Na__VideoStudio__Preview__AreAnimationsEnabled : '() => false',
            Na__VideoStudio__Preview__UpdateFrame          : "() => { globalThis.__W101.note('video.UpdateFrame'); }" },
        [SRC + '10__NavigationAndCameras/Na__Navmode__WalkMode__SystemLogic.js'] : {
            Na__WalkMode__IsActive : '() => false', Na__WalkMode__Update : '() => {}',
            Na__WalkMode__GetCapsulePosition : '() => null', Na__WalkMode__SetCollisionMeshes : '() => {}' },
        [SRC + '10__NavigationAndCameras/Na__Navmode__FlyMode__SystemLogic.js'] : {
            Na__FlyMode__IsActive : '() => false', Na__FlyMode__Update : '() => {}', Na__FlyMode__GetCameraPosition : '() => null' },
        [SRC + '25__System__3dObject__InteractionSystem/3dObjectIInteraction__Animation__ClickToOpenDoors__.js'] : {
            Na__DoorAnimation__HasActiveAnimations : '() => false',
            Na__DoorAnimation__Update              : "() => { globalThis.__W101.note('doors.Update'); }" },
        [SRC + '11__CameraUtils/Na__UiFeature__Camera__VerticalCorrection__EffectLogic.js'] : {
            Na__VerticalCorrection__ApplyFrame : "() => { globalThis.__W101.note('vertical.ApplyFrame'); if (globalThis.__W101.throwInFrame) throw new Error('W1-01 planted frame fault'); }" },
        [SRC + '05__RenderPipeline/01__Engine__PureEngine/Na__RenderPipeline__PureEngine__Setup.js'] : {
            Na__RenderPipeline__PureEngine__SetupComposer : '() => globalThis.__W101.pipeline()' },
        [SRC + '05__RenderPipeline/02__Engine__MaxEngine/Na__RenderPipeline__MaxEngine__Setup.js'] : {
            Na__RenderPipeline__MaxEngine__SetupComposer : '() => globalThis.__W101.pipeline()' },
        [SRC + '05__RenderPipeline/Na__RenderEffect__ProgressiveRefine__.js'] : {
            Na__ProgressiveRefine__Create : '() => globalThis.__W101.refiner()', Na__ProgressiveRefine__SetActive : '() => {}' }
    };

    const FLASK_ORIGIN = 'http://localhost:8000';
    const FLASK_BASE   = FLASK_ORIGIN + '/ValeVision3D/';
    const CDN          = 'https://cdn.noble-architecture.com';
    const INDEX_URL    = CDN + '/VaApps/Index/Na__MasterIndex__ProjectLocations__.json';
    const MANIFEST_URL = CDN + '/VaApps/Index/Na__BuildVersion__Manifest__.json';
    const APP_CONFIG   = JSON.parse(readFileSync(join(APP_ROOT, SRC, '02__AppData/Na__AppConfig__Main.json'), 'utf8'));
    const INDEX_TEXT   = readFileSync(join(WCP_ROOT, '02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json'), 'utf8');
    const clone = (value) => JSON.parse(JSON.stringify(value));

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Child: Stubs, Hooks, Fakes, the Ticks
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

    function BuildStubs(realFiles) {
        const wanted = new Map();
        Object.entries(realFiles).forEach(([ rel, file ]) => {
            ParseImports(readFileSync(file, 'utf8')).forEach(({ names, specifier }) => {
                const target = (specifier.startsWith('./') || specifier.startsWith('../'))
                    ? new URL(specifier, 'http://x/' + rel).pathname.slice(1)
                    : '__bare__/' + specifier;
                if (realFiles[target]) return;
                if (!wanted.has(target)) wanted.set(target, new Set());
                names.forEach((name) => wanted.get(target).add(name));
            });
        });
        const factory = [
            'function __note(path) { const h = globalThis.__W101; if (h && h.log) h.log.push({ what : path, overlayVisible : h.group ? h.group.visible : null }); }',
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
            "        apply(t, self, args) { __note(path); return __stub(path + '()'); },",
            "        construct(t, args) { __note('new ' + path); return __stub('new ' + path); },",
            '        set() { return true; },',
            '        has() { return false; },',
            '        deleteProperty() { return true; }',
            '    });',
            '}'
        ].join('\n');
        const stubs = {};
        wanted.forEach((names, rel) => {
            const diskFile = rel.startsWith('__bare__/') ? null : join(APP_ROOT, rel);
            const realText = (diskFile && existsSync(diskFile)) ? readFileSync(diskFile, 'utf8') : '';
            const custom   = OVERRIDES[rel] || {};
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
        Object.keys(OVERRIDES).forEach((rel) => { if (!stubs[rel]) throw new Error('override module not imported: ' + rel); });
        return stubs;
    }

    const HOOKS_SOURCE = [
        "import { readFileSync } from 'node:fs';",
        'let S = null;',
        'export async function initialize(data) { S = data; }',
        'function baseOf(url) { return S.bases.find((base) => url.startsWith(base)) || null; }',
        'export async function resolve(specifier, context, nextResolve) {',
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
        "    throw new Error('W1-01 harness: no real file and no stub for ' + rel);",
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

    async function RunChild(variant) {
        const real = {};
        BOOT_RELS.forEach((rel) => { real[rel] = join(APP_ROOT, rel); });
        Object.assign(real, VARIANTS[variant]);
        const stubs = BuildStubs(real);
        const tmp = mkdtempSync(join(tmpdir(), 'na-w101-'));
        const hooksFile = join(tmp, 'hooks.mjs');
        writeFileSync(hooksFile, HOOKS_SOURCE);
        register(pathToFileURL(hooksFile).href, { parentURL : import.meta.url, data : { bases : [ FLASK_BASE ], real : real, stubs : stubs } });

        // THE HARNESS STATE THE STUBS READ AND WRITE
        const H = globalThis.__W101 = {
            drawingCamera : null, videoPlaying : false, throwInFrame : false, group : null, log : null, raf : [],
            note(what) { if (this.log) this.log.push({ what : what, overlayVisible : this.group ? this.group.visible : null }); },
            pipeline() {
                return {
                    composer : { render() { H.note('composer.render'); }, setSize() {} },
                    renderProfileNormals() { H.note('profileNormals'); }
                };
            },
            refiner() {
                return {
                    planFrame() { return 'w101-ordinary-frame'; },
                    getPendingWork() { return { wanted : false, delayMs : 0 }; },
                    getStatus() { return { enabled : false, converged : true, samplesDone : 0 }; },
                    suspend() { H.note('refiner.suspend'); }, reset() {}, release() {},
                    noteNormalFrame() {}, presentAgain() { return false; }, renderChunk() { return false; }
                };
            }
        };

        // CONSOLE | kept, not printed
        const logs = [];
        const keep = (level) => (...parts) => { logs.push(level + ': ' + parts.map((p) => (p && p.stack) ? String(p.message) : (typeof p === 'string' ? p : JSON.stringify(p))).join(' ')); };
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
        const raf = (cb) => { H.raf.push(cb); return H.raf.length; };
        globalThis.window = {
            location : { hostname : 'localhost', port : '8000', origin : FLASK_ORIGIN, search : '', href : FLASK_BASE + 'index.html' },
            innerWidth : 1280, innerHeight : 800, devicePixelRatio : 1,
            setTimeout : (fn, ms, ...rest) => { const t = setTimeout(fn, ms, ...rest); if (t && t.unref) t.unref(); return t; },
            clearTimeout : (t) => clearTimeout(t),
            setInterval : (fn, ms, ...rest) => { const t = setInterval(fn, ms, ...rest); if (t && t.unref) t.unref(); return t; },
            clearInterval : (t) => clearInterval(t),
            requestAnimationFrame : raf, cancelAnimationFrame : () => {},
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
        globalThis.cancelAnimationFrame = () => {};
        if (typeof globalThis.CustomEvent !== 'function') {
            globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
        }

        // THE NETWORK | no project: the master index and the build manifest only
        const json = (status, body) => new Response(JSON.stringify(body), { status : status, headers : { 'Content-Type' : 'application/json' } });
        const fetches = [];
        globalThis.fetch = async (input) => {
            const url = String(input instanceof URL ? input.href : input);
            fetches.push(url);
            const plain = url.split('?')[0];
            if (plain === INDEX_URL) return new Response(INDEX_TEXT, { status : 200 });
            if (plain === MANIFEST_URL) return json(200, { buildVersion : 'b42' });
            return json(404, { error : 'not in the harness: ' + url });
        };

        // BOOT
        const invl = await import(FLASK_BASE + INVL_REL);
        const iovl = await import(FLASK_BASE + IOVL_REL);
        const lseq = await import(FLASK_BASE + LSEQ_REL);
        const resilience = Object.assign(clone(APP_CONFIG.LoadResilience__Config || {}), { LoadResilience__Config__RetryBaseDelayMs : 5, LoadResilience__Config__RetryCount : 1 });
        const context = {
            scene : Stub('scene'), camera : Stub('camera'), renderer : Stub('renderer'), controls : Stub('controls'),
            modelRoot : Stub('modelRoot'), lineResolution : Stub('lineResolution'),
            updateNavigation : () => { H.note('orbit.Update'); },
            pipelineRef : { current : null }, showToast : () => {},
            configs : {
                fullAppConfig : clone(APP_CONFIG), lightingConfig : {}, groundPlane : {}, profileLines : {}, models : {},
                modelUrls : [ 'https://cdn.test/model.glb' ], materialsSystem : {}, doorAnimation : {}, cameraFollow : {},
                orbitHelperCubeDebugVisible : false, ambientOcclusion : {}, progressiveRefine : {}, sceneEnvironment : {},
                distanceCulling : {}, resilienceConfig : resilience
            }
        };
        let bootError = null;
        try { await lseq.Na__AppFlow__StartLoadingSequence(context); }
        catch (error) { bootError = String(error && error.stack ? error.stack.split('\n').slice(0, 3).join(' | ') : error); }
        await new Promise((done) => setTimeout(done, 30));

        const ticks = new Set(H.raf);
        const tick  = H.raf.length ? H.raf[H.raf.length - 1] : null;
        const out   = { variant, bootError, rafCallbacks : ticks.size, hasIsPaused : typeof invl.Na__RenderLoop__IsPaused === 'function', steps : [] };

        function Frame(label, setup) {
            H.drawingCamera = setup.drawing ? { isOrthographicCamera : true } : null;
            H.videoPlaying  = !!setup.video;
            H.throwInFrame  = !!setup.throws;
            H.log = [];
            let threw = null;
            try { tick(performance.now()); } catch (error) { threw = String(error && error.message || error); }
            const step = { label, kind : 'frame', setup, threw, log : H.log, groupVisibleAfter : H.group ? H.group.visible : null };
            H.log = null;
            out.steps.push(step);
            return step;
        }
        function Note(label, data) { out.steps.push(Object.assign({ label, kind : 'note' }, data)); }

        if (tick) {
            // A | NOTHING REGISTERED: the call sequence of every kind of frame (compared across variants)
            Frame('A1 nothing registered: live 3D frame', {});
            Frame('A2 nothing registered: 2D drawing frame', { drawing : true });
            Frame('A3 nothing registered: Video Studio preview frame', { video : true });
            invl.Na__RenderLoop__Pause('LayoutEditor');
            Frame('A4 nothing registered: held frame (Layout Editor hold)', {});
            invl.Na__RenderLoop__Resume('LayoutEditor');
            Frame('A5 nothing registered: live 3D frame after the hold', {});
            Frame('A6 nothing registered: a frame that throws after the 3D work began', { throws : true });
            Frame('A7 nothing registered: live 3D frame after the throw', {});

            // B | ONE REGISTERED, WANTED TEST GROUP
            const group = { name : 'W101 test overlay', visible : true, userData : {} };
            H.group = group;
            const registered = iovl.Na__InteractiveOverlays__Register(group);
            Note('B0 registered', { registered, visibleAfterRegister : group.visible });
            iovl.Na__InteractiveOverlays__SetWanted(group, true);
            Note('B1 wanted, between frames', { visible : group.visible, isWanted : iovl.Na__InteractiveOverlays__IsWanted(group) });
            Frame('B2 wanted: live 3D frame', {});
            Frame('B3 wanted: 2D drawing frame', { drawing : true });
            Frame('B4 wanted: Video Studio preview frame', { video : true });
            // an export, a thumbnail or a sheet render: the same composer, drawn BETWEEN frames
            H.log = []; context.pipelineRef.current.composer.render(); const between = H.log; H.log = null;
            Note('B5 wanted: an export rendered between frames', { log : between });
            invl.Na__RenderLoop__Pause('LayoutEditor');
            Frame('B6 wanted: held frame (Layout Editor hold)', {});
            H.log = []; context.pipelineRef.current.composer.render(); const heldRender = H.log; H.log = null;
            Note('B7 wanted: a sheet render while the editor holds the loop', { log : heldRender });
            invl.Na__RenderLoop__Resume('LayoutEditor');
            Frame('B8 wanted: live 3D frame after the hold', {});
            Frame('B9 wanted: a frame that throws after BeginFrame', { throws : true });
            Frame('B10 wanted: live 3D frame after the throw', {});
            iovl.Na__InteractiveOverlays__SetWanted(group, false);
            Frame('B11 not wanted: live 3D frame', {});
            iovl.Na__InteractiveOverlays__SetWanted(group, true);
            const removed = iovl.Na__InteractiveOverlays__Unregister(group);
            group.userData.naOverlayWanted = true;
            Note('B12 unregistered', { removed, visible : group.visible });
            Frame('B13 unregistered: live 3D frame', {});
            H.group = null;

            // C | IsPaused AGAINST THE LOOP'S OWN HOLD SET (candidate and live only)
            if (out.hasIsPaused) {
                const seen = [];
                window.addEventListener('na-pause-render-loop', () => seen.push({ event : 'pause', isPaused : invl.Na__RenderLoop__IsPaused() }));
                window.addEventListener('na-resume-render-loop', () => seen.push({ event : 'resume', isPaused : invl.Na__RenderLoop__IsPaused() }));
                const ops = [
                    [ 'Pause', 'LayoutEditor' ], [ 'Pause', 'Export' ], [ 'Resume', 'LayoutEditor' ], [ 'Resume', 'Export' ],
                    [ 'Pause' ], [ 'Resume', undefined ], [ 'Pause', null ], [ 'Resume', '' ], [ 'Pause', '' ], [ 'Resume', null ],
                    [ 'Pause', 0 ], [ 'Resume', false ], [ 'Resume', 'never-paused' ], [ 'Pause', 'a' ], [ 'Pause', 'a' ], [ 'Resume', 'a' ]
                ];
                const rows = [];
                ops.forEach((op) => {
                    if (op.length === 1) invl['Na__RenderLoop__' + op[0]]();
                    else invl['Na__RenderLoop__' + op[0]](op[1]);
                    const isPaused = invl.Na__RenderLoop__IsPaused();
                    H.log = []; tick(performance.now()); const painted = H.log.some((e) => e.what === 'composer.render'); H.log = null;
                    rows.push({ op : op[0] + '(' + (op.length === 1 ? '' : JSON.stringify(op[1] === undefined ? 'undefined' : op[1])) + ')', isPaused, painted });
                });
                Note('C1 IsPaused against the loop', { rows, seen });
            }
        }
        out.logs = logs.filter((l) => /W1-01|InteractiveOverlays|error/i.test(l)).slice(0, 20);
        rmSync(tmp, { recursive : true, force : true });
        process.stdout.write('RESULT:' + JSON.stringify(out) + '\n');
        process.exit(0);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Parent: Run the Variants and Check Them
// -----------------------------------------------------------------------------

    let passed = 0, failed = 0;
    function check(label, ok, detail) {
        if (ok) { passed++; console.log('  PASS  ' + label); }
        else    { failed++; console.log('  FAIL  ' + label + (detail ? '  -- ' + detail : '')); }
    }

    function Run(variant) {
        const r = spawnSync(process.execPath, [ fileURLToPath(import.meta.url), '--child', variant ], { encoding : 'utf8', maxBuffer : 64 * 1024 * 1024 });
        const line = (r.stdout || '').split('\n').find((l) => l.startsWith('RESULT:'));
        if (!line) { console.log(r.stdout); console.log(r.stderr); throw new Error('child ' + variant + ' produced no result'); }
        return JSON.parse(line.slice(7));
    }

    const step  = (r, prefix) => r.steps.find((s) => s.label.startsWith(prefix));
    const seq   = (s) => s.log.map((e) => e.what).join(' > ');
    const saw   = (s, what) => s.log.filter((e) => e.what === what).map((e) => e.overlayVisible);
    const allAre = (list, value) => list.length > 0 && list.every((v) => v === value);

    function Main(argv) {
        const target = argv.includes('--target') ? argv[argv.indexOf('--target') + 1] : 'candidate';
        const pre = Run('pre');
        const neu = Run(target);
        console.log('W1-01 loop harness - pre-image against ' + target);

        [ pre, neu ].forEach((r) => {
            check(r.variant + ': the loading sequence booted without throwing', r.bootError === null, r.bootError);
            check(r.variant + ': the render loop scheduled its tick (one RAF callback)', r.rafCallbacks === 1, String(r.rafCallbacks));
        });

        // A | nothing registered: identical frames
        [ 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7' ].forEach((id) => {
            const a = step(pre, id), b = step(neu, id);
            check(id + ' identical call sequence, pre-image vs ' + target + ' (' + a.label.slice(3) + ')', seq(a) === seq(b), '\n      pre: ' + seq(a) + '\n      new: ' + seq(b));
            check(id + ' identical outcome (thrown or not)', a.threw === b.threw, a.threw + ' / ' + b.threw);
        });
        check('A1 a live 3D frame drew through the composer', saw(step(neu, 'A1'), 'composer.render').length === 1);
        check('A2 a drawing frame drew through the drawing preset, not the composer', saw(step(neu, 'A2'), 'preset.RenderFrame').length === 1 && saw(step(neu, 'A2'), 'composer.render').length === 0);
        check('A3 a Video Studio frame advanced the preview and drew through the composer', saw(step(neu, 'A3'), 'video.UpdateFrame').length === 1 && saw(step(neu, 'A3'), 'composer.render').length === 1);
        check('A4 a held frame drew nothing', step(neu, 'A4').log.length === 0, seq(step(neu, 'A4')));
        check('A6 a frame that throws still propagates its error, as before (W2-07 owns the guard)', step(neu, 'A6').threw === 'W1-01 planted frame fault', step(neu, 'A6').threw);

        // B | registered: only the live 3D frame shows it
        const b0 = step(neu, 'B0'), b1 = step(neu, 'B1');
        check('B0 registering hides the group at once', b0.registered === true && b0.visibleAfterRegister === false);
        check('B1 wanted between frames is still invisible (wanted is not visible)', b1.visible === false && b1.isWanted === true);
        const b2 = step(neu, 'B2');
        check('B2 visible in every draw of the live 3D frame', allAre(saw(b2, 'composer.render'), true) && allAre(saw(b2, 'profileNormals'), true), JSON.stringify(b2.log));
        check('B2 ...and invisible again once the frame has ended', b2.groupVisibleAfter === false);
        const b3 = step(neu, 'B3');
        check('B3 invisible on a 2D drawing frame', allAre(saw(b3, 'preset.RenderFrame'), false) && b3.groupVisibleAfter === false, JSON.stringify(b3.log));
        const b4 = step(neu, 'B4');
        check('B4 invisible in a Video Studio preview frame (DR-32)', allAre(saw(b4, 'composer.render'), false) && b4.groupVisibleAfter === false, JSON.stringify(b4.log));
        check('B5 invisible to an export (or a thumbnail) rendered between frames', allAre(step(neu, 'B5').log.map((e) => e.overlayVisible), false));
        check('B6 a held frame draws nothing and leaves it invisible', step(neu, 'B6').log.length === 0 && step(neu, 'B6').groupVisibleAfter === false);
        check('B7 invisible to a sheet render while the Layout Editor holds the loop', allAre(step(neu, 'B7').log.map((e) => e.overlayVisible), false));
        check('B8 visible again in the first live 3D frame after the hold', allAre(saw(step(neu, 'B8'), 'composer.render'), true) && step(neu, 'B8').groupVisibleAfter === false);
        const b9 = step(neu, 'B9');
        check('B9 a frame that throws after BeginFrame still ends it: invisible afterwards', b9.threw === 'W1-01 planted frame fault' && b9.groupVisibleAfter === false, JSON.stringify(b9));
        check('B10 the next live 3D frame shows it again', allAre(saw(step(neu, 'B10'), 'composer.render'), true) && step(neu, 'B10').groupVisibleAfter === false);
        check('B11 not wanted: invisible even in a live 3D frame', allAre(saw(step(neu, 'B11'), 'composer.render'), false));
        check('B12 unregistering hands it back invisible', step(neu, 'B12').removed === true && step(neu, 'B12').visible === false);
        check('B13 unregistered: a live 3D frame no longer shows it', allAre(saw(step(neu, 'B13'), 'composer.render'), false) && step(neu, 'B13').groupVisibleAfter === false);

        // contrast: the pre-image never begins an overlay frame
        check('contrast: in the pre-image a registered, wanted group never shows (nothing begins a frame)', allAre(saw(step(pre, 'B2'), 'composer.render'), false));

        // C | IsPaused
        check('pre-image Invalidation has no IsPaused (the name this package adds)', pre.hasIsPaused === false);
        check(target + ' Invalidation exports IsPaused', neu.hasIsPaused === true);
        const c1 = step(neu, 'C1');
        if (c1) {
            c1.rows.forEach((row) => check('C1 ' + row.op + ': IsPaused ' + row.isPaused + ' and the loop ' + (row.painted ? 'painted' : 'held'), row.isPaused === !row.painted));
            const pauses  = c1.seen.filter((s) => s.event === 'pause');
            const resumes = c1.seen.filter((s) => s.event === 'resume');
            check('C1 IsPaused already reads true inside every pause listener (mirrored before the dispatch)', pauses.length === 8 && pauses.every((s) => s.isPaused === true), JSON.stringify(pauses));
            check('C1 IsPaused already reads the new count inside every resume listener', resumes.length === 8 &&
                  resumes.map((s) => s.isPaused).join() === [ true, false, false, false, false, false, false, false ].join(), JSON.stringify(resumes));
        }
        console.log('\n' + passed + ' passed, ' + failed + ' failed');
        process.exit(failed === 0 ? 0 : 1);
    }

    if (process.argv.includes('--child')) {
        await RunChild(process.argv[process.argv.indexOf('--child') + 1]);
    } else {
        Main(process.argv.slice(2));
    }

// endregion -------------------------------------------------------------------
