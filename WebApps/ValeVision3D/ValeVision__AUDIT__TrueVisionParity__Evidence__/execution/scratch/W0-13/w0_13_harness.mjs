// =============================================================================
// W0-13 scratch - behaviour harness for the loading-sequence transport wiring
// =============================================================================
//
// Runs ValeVision's REAL Na__AppFlow__LoadingSequence.js (the candidate, the
// live file or the pre-image) under Node, at its browser URL, with the REAL
// transport facade (Na__CloudflareIntegration__ApiClient__.js), ProjectLoader,
// R2SaveProjectJson, ResilientLoad and LoadWatchdog. Every other module the
// sequence imports (three.js, render pipeline, model loader, materials ...) is
// a generated universal stub; string constants the stubs export are read from
// the real files. The browser (window, document, events, canvas) and the
// network (master index, build manifest, the local Flask server, the editor
// worker, R2's CDN) are fakes, configured per scenario.
//
// Each scenario runs in its own Node process. Read-only on the app: it writes
// only its module hooks to the OS temp folder.
//
// Usage:
//   node w0_13_harness.mjs [--target candidate|live]     run every scenario and check it
//   (internal) node w0_13_harness.mjs --child <scenario> --variant new|pre --target candidate|live
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { register } from 'node:module';


// -----------------------------------------------------------------------------
// REGION | Paths and Constants
// -----------------------------------------------------------------------------

    const HERE        = dirname(fileURLToPath(import.meta.url));
    const APP_ROOT    = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
    const WCP_ROOT    = 'D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia';
    const SRC         = '02__Src__AppModules/';
    const LSEQ_REL    = SRC + '01__AppCore/Na__AppFlow__LoadingSequence.js';
    const CFAPI_REL   = SRC + '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';
    const LOADER_REL  = SRC + '03__AppUtils/Na__AppUtils__ProjectLoader.js';
    const REAL_RELS   = [
        LSEQ_REL,
        CFAPI_REL,
        LOADER_REL,
        SRC + '03__AppUtils/Na__AppUtils__R2SaveProjectJson__.js',
        SRC + '03__AppUtils/Na__AppUtils__ResilientLoad__.js',
        SRC + '01__AppCore/Na__AppCore__LoadWatchdog__.js',
        SRC + '10__NavigationAndCameras/Na__NavigationModes__State.js'      // <-- A leaf: its resolved flags show what the sequence read
    ];
    const VARIANT_FILES = {
        candidate : join(HERE, 'candidate__Na__AppFlow__LoadingSequence.js'),
        live      : join(APP_ROOT, LSEQ_REL),
        pre       : join(HERE, 'preimage', 'Na__AppFlow__LoadingSequence.js.bak')
    };

    const FLASK_ORIGIN = 'http://localhost:8000';
    const FLASK_BASE   = FLASK_ORIGIN + '/ValeVision3D/';
    const PAGES_ORIGIN = 'https://adam-noble-01.github.io';
    const PAGES_BASE   = PAGES_ORIGIN + '/ValeCodebase/WebApps/ValeVision3D/';
    const CDN          = 'https://cdn.noble-architecture.com';
    const CDN_PROJECTS = CDN + '/VaApps/Projects';
    const INDEX_URL    = CDN + '/VaApps/Index/Na__MasterIndex__ProjectLocations__.json';
    const INDEX_GH     = PAGES_ORIGIN + '/ValeCodebase/WebApps/Whitecardopedia/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json';
    const MANIFEST_URL = CDN + '/VaApps/Index/Na__BuildVersion__Manifest__.json';
    const GH_PROJECTS  = PAGES_ORIGIN + '/ValeCodebase/WebApps/Whitecardopedia/Projects';
    const WORKER_BASE  = 'https://editor-worker.test/api/editor';
    const API_KEY      = 'test-editor-key';
    const DOOUS        = '2026/3047__Doous';

    const APP_CONFIG   = JSON.parse(readFileSync(join(APP_ROOT, SRC, '02__AppData/Na__AppConfig__Main.json'), 'utf8'));
    const INDEX_TEXT   = readFileSync(join(WCP_ROOT, '02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json'), 'utf8');
    const DOOUS_DOC    = JSON.parse(readFileSync(join(WCP_ROOT, 'Projects/2026/3047__Doous/project.json'), 'utf8'));
    const OWNED_KEYS   = APP_CONFIG.ProjectData__EditorOwnedKeys.ProjectData__EditorOwnedKeys__Keys;

    const clone = (value) => JSON.parse(JSON.stringify(value));
    const same  = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Fixtures: the Disk Copy Behind R2
// -----------------------------------------------------------------------------

    // THE LOCAL SERVER'S COPY | Doous with an older drawings block and walk/fly both on
    function DiskOld() {
        const doc = clone(DOOUS_DOC);
        doc.LayoutEditor__DrawingsData = {
            LayoutEditor__DrawingsData__Version : 1,
            LayoutEditor__DrawingsData__Sheets  : [ { Sheet__Id : 'Sheet_001', Sheet__Name : 'Old sheet on disk' } ]
        };
        doc.Navmode__EnabledModes = { Navmode__EnabledModes__Walk : true, Navmode__EnabledModes__Fly : true };
        doc.CrossSection__Config  = { CrossSection__Config__Marker : 'disk-only (R2 lacks it)' };
        return doc;
    }

    // R2'S COPY | a newer drawings block, fly switched off, a changed pipeline key and a key not on the list
    function R2New() {
        const doc = clone(DOOUS_DOC);
        doc.LayoutEditor__DrawingsData = {
            LayoutEditor__DrawingsData__Version  : 1,
            LayoutEditor__DrawingsData__SavedIso : '2026-10-01T18:00:00.000Z',
            LayoutEditor__DrawingsData__Sheets   : [
                { Sheet__Id : 'Sheet_001', Sheet__Name : 'Newer sheet on R2' },
                { Sheet__Id : 'Sheet_002', Sheet__Name : 'Added on another machine' }
            ]
        };
        doc.Navmode__EnabledModes = { Navmode__EnabledModes__Walk : true, Navmode__EnabledModes__Fly : false };
        delete doc.CrossSection__Config;                                     // <-- A listed key R2 lacks: the local value stays
        doc.images = [ 'IMG99__R2__ONLY__.png' ];                           // <-- Pipeline key: never overlaid
        doc.valeVision_ModelUrls = { r2 : 'not-on-the-list' };              // <-- Not on the list: never overlaid
        doc.R2OnlyKey = 'not on the list';                                  // <-- Never copied
        return doc;
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Scenarios
// -----------------------------------------------------------------------------

    // host: 'flask' | 'pages'; token: ?project= value or null; worker: '1.5.0' | '1.6.0'
    const SCENARIOS = {
        'lh-150-r2-newer'     : { host : 'flask', token : DOOUS,  worker : '1.5.0', disk : DiskOld, r2 : R2New },
        'lh-160-r2-newer'     : { host : 'flask', token : '3047', worker : '1.6.0', disk : DiskOld, r2 : R2New, healthDelayMs : 60 },
        'lh-matched'          : { host : 'flask', token : DOOUS,  worker : '1.5.0', disk : () => clone(DOOUS_DOC), r2 : () => clone(DOOUS_DOC) },
        'lh-no-list'          : { host : 'flask', token : DOOUS,  worker : '1.5.0', disk : DiskOld, r2 : R2New, dropList : true },
        'lh-no-editor-config' : { host : 'flask', token : DOOUS,  worker : '1.5.0', disk : DiskOld, r2 : R2New, editorConfig : false },
        'lh-r2-500'           : { host : 'flask', token : DOOUS,  worker : '1.5.0', disk : DiskOld, r2 : R2New, cdnStatus : 500 },
        'lh-r2-missing'       : { host : 'flask', token : DOOUS,  worker : '1.5.0', disk : DiskOld, r2 : R2New, cdnStatus : 404 },
        'lh-r2-hangs'         : { host : 'flask', token : DOOUS,  worker : '1.5.0', disk : DiskOld, r2 : R2New, cdnHang : true, fetchTimeoutMs : 400 },
        'lh-health-hangs'     : { host : 'flask', token : DOOUS,  worker : '1.6.0', disk : DiskOld, r2 : R2New, healthHang : true, fetchTimeoutMs : 400 },
        'lh-other-project'    : { host : 'flask', token : DOOUS,  worker : '1.5.0', disk : DiskOld, r2 : () => Object.assign(R2New(), { projectCode : '9999' }) },
        'lh-fetch-fails'      : { host : 'flask', token : DOOUS,  worker : '1.5.0', disk : null,    r2 : R2New },
        'lh-no-project'       : { host : 'flask', token : null,   worker : '1.5.0', disk : DiskOld, r2 : R2New },
        'pages'               : { host : 'pages', token : DOOUS,  worker : '1.6.0', disk : DiskOld, r2 : R2New },
        'pages-no-project'    : { host : 'pages', token : null,   worker : '1.6.0', disk : DiskOld, r2 : R2New }
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Child: Stubs, Hooks, Browser and Network Fakes, the Run
// -----------------------------------------------------------------------------

    // IMPORT STATEMENTS | { names, specifier } of every named import in a module source
    function ParseImports(source) {
        const out = [];
        const pattern = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
        let match;
        while ((match = pattern.exec(source))) {
            const names = match[1].split(',').map((part) => part.trim()).filter(Boolean)
                .map((part) => part.split(/\s+as\s+/)[0].trim());
            out.push({ names : names, specifier : match[2] });
        }
        return out;
    }

    // STUB SOURCES | one module per stubbed target, exporting what the real modules import from it
    function BuildStubs(realFiles) {
        const wanted = new Map();                                             // <-- rel -> Set(names)
        Object.entries(realFiles).forEach(([ rel, file ]) => {
            ParseImports(readFileSync(file, 'utf8')).forEach(({ names, specifier }) => {
                let target;
                if (specifier.startsWith('./') || specifier.startsWith('../')) {
                    target = new URL(specifier, 'http://x/' + rel).pathname.slice(1);
                } else {
                    target = '__bare__/' + specifier;
                }
                if (realFiles[target]) return;
                if (!wanted.has(target)) wanted.set(target, new Set());
                names.forEach((name) => wanted.get(target).add(name));
            });
        });

        const factory = [
            'const __rec = (globalThis.__W013_STUB_CALLS = globalThis.__W013_STUB_CALLS || []);',
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
            "        apply(t, self, args) { __rec.push(path); return __stub(path + '()'); },",
            "        construct(t, args) { __rec.push('new ' + path); return __stub('new ' + path); },",
            '        set() { return true; },',
            '        has() { return false; },',
            '        deleteProperty() { return true; }',
            '    });',
            '}'
        ].join('\n');

        const stubs = {};
        const literals = {};
        wanted.forEach((names, rel) => {
            const diskFile = rel.startsWith('__bare__/') ? null : join(APP_ROOT, rel);
            const realText = (diskFile && existsSync(diskFile)) ? readFileSync(diskFile, 'utf8') : '';
            const lines = [ factory ];
            [ ...names ].sort().forEach((name) => {
                const literal = realText.match(new RegExp('const\\s+' + name + '\\s*=\\s*([\'"])([^\'"]*)\\1\\s*;'));
                if (literal) {
                    lines.push('export const ' + name + ' = ' + JSON.stringify(literal[2]) + ';');
                    literals[name] = literal[2];
                } else {
                    lines.push('export const ' + name + " = __stub('" + name + "');");
                }
            });
            stubs[rel] = lines.join('\n') + '\n';
        });
        return { stubs, literals };
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
        "    throw new Error('W0-13 harness: no real file and no stub for ' + rel);",
        '}'
    ].join('\n');

    // A UNIVERSAL STUB FOR THE CONTEXT OBJECTS (scene, camera, renderer, controls ...)
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
            set() { return true; },
            has() { return false; },
            deleteProperty() { return true; }
        });
    }

    async function RunChild(name, variant, target) {
        const sc       = SCENARIOS[name];
        const lseqFile = variant === 'pre' ? VARIANT_FILES.pre : (target.startsWith('file:') ? target.slice(5) : VARIANT_FILES[target]);
        const real     = {};
        REAL_RELS.forEach((rel) => { real[rel] = (rel === LSEQ_REL) ? lseqFile : join(APP_ROOT, rel); });
        const { stubs, literals } = BuildStubs(real);

        const tmp = mkdtempSync(join(tmpdir(), 'na-w013-'));
        const hooksFile = join(tmp, 'hooks.mjs');
        writeFileSync(hooksFile, HOOKS_SOURCE);
        register(pathToFileURL(hooksFile).href, { parentURL : import.meta.url, data : { bases : [ FLASK_BASE, PAGES_BASE ], real : real, stubs : stubs } });

        // ONE CLOCK | fetches and events share it, so their order can be checked
        let tick = 0;
        const fetches = [];
        const events  = [];
        const rawDetails = [];
        const logs    = [];
        let cf = null;                                                        // <-- The facade instance the sequence uses (set before the run)

        // CONSOLE | kept, not printed
        const keep = (level) => (...parts) => { logs.push({ n : ++tick, level : level, text : parts.map((p) => (p && p.stack) ? String(p.message) : (typeof p === 'string' ? p : JSON.stringify(p))).join(' ') }); };
        console.log = keep('log'); console.info = keep('info'); console.warn = keep('warn'); console.error = keep('error');

        // THE PAGE | elements, window and document
        const elements = new Map();
        function Element(id) {
            const classes = new Set();
            return {
                id : id, children : [], style : {}, textContent : '', className : '',
                classList : {
                    add : (...names) => names.forEach((n) => classes.add(n)),
                    remove : (...names) => names.forEach((n) => classes.delete(n)),
                    contains : (n) => classes.has(n),
                    toggle : (n, force) => { const on = (force === undefined) ? !classes.has(n) : !!force; if (on) classes.add(n); else classes.delete(n); return on; }
                },
                appendChild(child) { this.children.push(child); return child; },
                addEventListener() {}, removeEventListener() {}, setAttribute() {}, removeAttribute() {}
            };
        }
        const byId = (id) => { if (!elements.has(id)) elements.set(id, Element(id)); return elements.get(id); };
        [ 'loadingOverlay', 'loadingIndicator', 'statusText', 'renderCanvas' ].forEach(byId);
        byId('renderCanvas').classList.add('canvas-hidden');

        const listeners = new Map();
        const location = (sc.host === 'pages')
            ? { hostname : 'adam-noble-01.github.io', port : '', origin : PAGES_ORIGIN, search : sc.token ? '?project=' + sc.token : '', href : PAGES_BASE + 'index.html' }
            : { hostname : 'localhost', port : '8000', origin : FLASK_ORIGIN, search : sc.token ? '?project=' + sc.token : '', href : FLASK_BASE + 'index.html' };
        globalThis.window = {
            location : location, innerWidth : 1280, innerHeight : 800, devicePixelRatio : 1,
            setTimeout : (fn, ms, ...rest) => { const t = setTimeout(fn, ms, ...rest); if (t && t.unref) t.unref(); return t; },
            clearTimeout : (t) => clearTimeout(t),
            setInterval : (fn, ms, ...rest) => { const t = setInterval(fn, ms, ...rest); if (t && t.unref) t.unref(); return t; },
            clearInterval : (t) => clearInterval(t),
            requestAnimationFrame : () => 0, cancelAnimationFrame : () => {},
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
                const loaded = cf ? cf.Na__CfApi__GetLoadedProjectData() : null;
                events.push({
                    n : ++tick, type : event.type,
                    detailKeys : (event.detail && typeof event.detail === 'object') ? Object.keys(event.detail) : null,
                    detail : event.detail === undefined ? undefined : JSON.parse(JSON.stringify(event.detail === null ? null : event.detail)),
                    canvasVisible : byId('renderCanvas').classList.contains('canvas-visible'),
                    overlayHidden : byId('loadingOverlay').classList.contains('hidden'),
                    loadedSet : loaded !== null
                });
                rawDetails.push(event.detail);
                const list = (listeners.get(String(event.type)) || []).slice();
                list.forEach((one) => {
                    try { one.fn(event); } catch (error) { logs.push({ n : ++tick, level : 'listener-error', text : String(error) }); }
                    if (one.once) window.removeEventListener(event.type, one.fn);
                });
                return true;
            }
        };
        globalThis.document = {
            hidden : false, body : Element('body'),
            getElementById : (id) => byId(id),
            createElement : (tag) => Element(tag),
            addEventListener() {}, removeEventListener() {}
        };
        globalThis.requestAnimationFrame = () => 0;
        globalThis.cancelAnimationFrame = () => {};

        // THE NETWORK
        const disk = sc.disk ? sc.disk() : null;
        const r2   = sc.r2 ? sc.r2() : null;
        const json = (status, body) => new Response(JSON.stringify(body), { status : status, headers : { 'Content-Type' : 'application/json' } });
        const never = () => new Promise(() => {});
        globalThis.fetch = async (input, init) => {
            const url = String(input instanceof URL ? input.href : input);
            const options = init || {};
            const method = String(options.method || 'GET').toUpperCase();
            const headers = {};
            Object.entries(options.headers || {}).forEach(([ k, v ]) => { headers[k.toLowerCase()] = String(v); });
            fetches.push({ n : ++tick, method : method, url : url, cache : options.cache || null, apiKey : headers['x-editor-api-key'] || null });
            const plain = url.split('?')[0];
            if (plain === INDEX_URL || plain === INDEX_GH) return new Response(INDEX_TEXT, { status : 200 });
            if (plain === MANIFEST_URL) return json(200, { buildVersion : 'b42' });
            if (plain === FLASK_ORIGIN + '/api/editor-config') {
                return (sc.editorConfig === false) ? json(503, { error : 'Editor worker config missing' }) : json(200, { workerApiBaseUrl : WORKER_BASE, apiKey : API_KEY });
            }
            if (plain === WORKER_BASE + '/health') {
                if (sc.healthHang) return never();
                if (sc.healthDelayMs) await new Promise((done) => setTimeout(done, sc.healthDelayMs));   // <-- Cloudflare answers after the local server
                return (sc.worker === '1.6.0')
                    ? json(200, { ok : true, version : '1.6.0', routes : [ 'save', 'assets', 'drawing-notes', 'project', 'merge-keys', 'files' ] })
                    : json(200, { ok : true });
            }
            if (plain.startsWith(WORKER_BASE + '/projects/')) {
                if (headers['x-editor-api-key'] !== API_KEY) return json(401, { error : 'Unauthorized' });
                if (method === 'GET' && plain === WORKER_BASE + '/projects/2026/3047__Doous/project' && sc.worker === '1.6.0') {
                    return r2 ? json(200, r2) : json(404, { missing : true });
                }
                return json(400, { error : 'unexpected worker call in the harness' });
            }
            if (plain === CDN_PROJECTS + '/2026/3047__Doous/project.json') {
                if (sc.cdnHang && url.includes('?t=')) return never();
                if (sc.cdnStatus && url.includes('?t=')) return json(sc.cdnStatus, { error : 'stub' });
                return r2 ? json(200, r2) : json(404, { error : 'missing' });
            }
            if (plain === GH_PROJECTS + '/2026/3047__Doous/project.json') return disk ? json(200, disk) : json(404, {});
            if (sc.host === 'flask' && plain.startsWith(FLASK_ORIGIN + '/api/projects/')) {
                const token = decodeURIComponent(plain.slice((FLASK_ORIGIN + '/api/projects/').length));
                if ((token === DOOUS || token === '3047') && disk) return json(200, disk);
                return json(404, { error : 'Project not found' });
            }
            return json(404, { error : 'unexpected request in the harness: ' + url });
        };

        // THE MODULES | at their browser URLs (the facade and the loader first, to hold their instances)
        const base = (sc.host === 'pages') ? PAGES_BASE : FLASK_BASE;
        cf = await import(base + CFAPI_REL);
        const loader = await import(base + LOADER_REL);
        const lseq = await import(base + LSEQ_REL);

        const appConfig = clone(APP_CONFIG);
        if (sc.dropList) delete appConfig.ProjectData__EditorOwnedKeys;
        const resilience = Object.assign(clone(APP_CONFIG.LoadResilience__Config), { LoadResilience__Config__RetryBaseDelayMs : 5, LoadResilience__Config__RetryCount : 1 });
        if (sc.fetchTimeoutMs) resilience.LoadResilience__Config__FetchTimeoutMs = sc.fetchTimeoutMs;
        const toasts = [];
        const context = {
            scene : Stub('scene'), camera : Stub('camera'), renderer : Stub('renderer'), controls : Stub('controls'),
            modelRoot : Stub('modelRoot'), lineResolution : Stub('lineResolution'), updateNavigation : () => {},
            pipelineRef : { current : null }, showToast : (message) => toasts.push(String(message)),
            configs : {
                fullAppConfig : appConfig, lightingConfig : {}, groundPlane : {}, profileLines : {}, models : {},
                modelUrls : [ 'https://cdn.test/model.glb' ], materialsSystem : {}, doorAnimation : {}, cameraFollow : {},
                orbitHelperCubeDebugVisible : false, ambientOcclusion : {}, progressiveRefine : {}, sceneEnvironment : {},
                distanceCulling : {}, resilienceConfig : resilience
            }
        };

        const started = Date.now();
        let threw = null;
        try {
            await lseq.Na__AppFlow__StartLoadingSequence(context);
        } catch (error) {
            threw = (error && error.stack) ? error.stack.split('\n').slice(0, 4).join(' | ') : String(error);
        }
        const elapsedMs = Date.now() - started;
        await new Promise((done) => setTimeout(done, 50));                    // <-- Let queued microtasks and the overlay fade settle

        // IDENTITY CHECKS | made here, where the objects live
        const loaded = cf.Na__CfApi__GetLoadedProjectData();
        let memo = null;
        if (sc.token && disk) {
            try { memo = await loader.Na__AppUtils__FetchProjectJson(sc.token); } catch (error) { memo = null; }
        }
        const drawingsIndex = events.findIndex((e) => e.type === literals.Na__DrawData__LOADED_EVENT);
        const drawingsRaw = drawingsIndex >= 0 ? rawDetails[drawingsIndex] : null;
        const errorOverlay = byId('loadingOverlay').classList.contains('loading-overlay--error');

        const result = {
            scenario : name, variant : variant, target : target, threw : threw, elapsedMs : elapsedMs,
            drawingsEvent : literals.Na__DrawData__LOADED_EVENT || null,
            events : events, fetches : fetches, logs : logs, toasts : toasts, errorOverlay : errorOverlay,
            loaded : loaded,
            loadedIsMemo : !!(loaded && memo && loaded === memo),
            loadedBlockIsEventBlock : !!(loaded && drawingsRaw && loaded.LayoutEditor__DrawingsData === drawingsRaw.block),
            disk : disk, r2 : r2,
            facadeSurface : Object.keys(cf).sort()
        };
        rmSync(tmp, { recursive : true, force : true });
        process.stdout.write('RESULT:' + JSON.stringify(result) + '\n');
        process.exit(0);
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Parent: Run Every Scenario and Check It
// -----------------------------------------------------------------------------

    let passes = 0, failures = 0;
    function check(label, ok, detail) {
        if (ok) passes++; else failures++;
        let line = (ok ? '  PASS  ' : '  FAIL  ') + label;
        if (!ok && detail !== undefined) {
            let shown; try { shown = JSON.stringify(detail); } catch (e) { shown = String(detail); }
            line += '  -> ' + (shown && shown.length > 700 ? shown.slice(0, 700) + '...' : shown);
        }
        process.stdout.write(line + '\n');
    }

    function Run(name, variant, target) {
        const out = spawnSync(process.execPath, [ fileURLToPath(import.meta.url), '--child', name, '--variant', variant, '--target', target ], { encoding : 'utf8', timeout : 60000 });
        const line = (out.stdout || '').split('\n').find((l) => l.startsWith('RESULT:'));
        if (!line) {
            check(name + ' [' + variant + '] ran to its end', false, { status : out.status, signal : out.signal, stderr : (out.stderr || '').slice(0, 1500), stdout : (out.stdout || '').slice(0, 500) });
            return null;
        }
        return JSON.parse(line.slice('RESULT:'.length));
    }

    const hasLog = (r, level, text) => r.logs.some((l) => (!level || l.level === level) && l.text.includes(text));
    const ofType = (r, type) => r.events.filter((e) => e.type === type);
    const reqs   = (r, test) => r.fetches.filter(test);
    const isOverlayRead = (f) => f.url.startsWith(CDN_PROJECTS + '/') && f.url.includes('/project.json?t=');
    const isWorker      = (f) => f.url.startsWith(WORKER_BASE);
    const isEditorCfg   = (f) => f.url === FLASK_ORIGIN + '/api/editor-config';
    const PROJECT_EVENTS = [ 'na-navigation-modes-loaded', 'na-render-engine-loaded', 'na-crosssection-config-loaded', 'na-crosssection-scenedata-loaded',
                             'na-crosssection-sketchup-sections-loaded', 'na-presentation-mode-scenes-loaded' ];

    function CommonSuccess(r, label) {
        check(label + ': the sequence ran to its end without throwing', r.threw === null, r.threw);
        check(label + ': no load-error overlay', r.errorOverlay === false, r.logs.filter((l) => l.level === 'error'));
        const ready = ofType(r, 'na-app-scene-ready');
        check(label + ': na-app-scene-ready fired exactly once', ready.length === 1, ready.length);
        if (ready.length === 1) {
            check(label + ': ...after the canvas became visible (canvas-visible, overlay hidden)', ready[0].canvasVisible === true && ready[0].overlayHidden === true, ready[0]);
            check(label + ': ...with no detail (TrueVision\'s event carries none)', ready[0].detail === null || ready[0].detail === undefined, ready[0].detail);
            const drawings = ofType(r, r.drawingsEvent);
            if (drawings.length) check(label + ': ...after the drawings dispatch', ready[0].n > drawings[0].n);
        }
        check(label + ': no request outside the fakes', !r.fetches.some((f) => f.url.includes('unexpected')) && !r.logs.some((l) => l.text.includes('unexpected request in the harness')));
        check(label + ': no write of any kind (only GETs)', r.fetches.every((f) => f.method === 'GET'), r.fetches.filter((f) => f.method !== 'GET'));
    }

    function ProjectSuccess(r, label, expectBlock, expectLoadedFrom) {
        CommonSuccess(r, label);
        const drawings = ofType(r, r.drawingsEvent);
        check(label + ': the drawings block was dispatched once', drawings.length === 1, drawings.length);
        if (drawings.length !== 1) return;
        const d = drawings[0].detail;
        check(label + ': drawings detail keys are block, sceneConfig, projectCode', same(drawings[0].detailKeys, [ 'block', 'sceneConfig', 'projectCode' ]), drawings[0].detailKeys);
        check(label + ': drawings detail block is the expected one', same(d.block, expectBlock), { got : d.block, want : expectBlock });
        check(label + ': drawings detail sceneConfig is the raw presentation block of the document the session runs',
            same(d.sceneConfig, (r.loaded && r.loaded.PresentationMode__SavedCameraScenes) || null));
        check(label + ': drawings detail projectCode is the ?project= token', d.projectCode === SCENARIOS[r.scenario].token, d.projectCode);
        check(label + ': Na__CfApi__GetLoadedProjectData() is the memoised project data the session runs (same object; ' + expectLoadedFrom + ')', r.loadedIsMemo === true);
        check(label + ': ...and the drawings block it dispatched is that document\'s own block (same object)', r.loadedBlockIsEventBlock === true);
        const projectDispatches = r.events.filter((e) => PROJECT_EVENTS.includes(e.type) || e.type === r.drawingsEvent);
        check(label + ': every project dispatch happened with the merge base registered', projectDispatches.length > 0 && projectDispatches.every((e) => e.loadedSet === true),
            projectDispatches.map((e) => e.type + ':' + e.loadedSet));
        const nav = ofType(r, 'na-navigation-modes-loaded');
        const modes = (r.loaded && r.loaded.Navmode__EnabledModes) || {};
        const want = {
            Navmode__EnabledModes__Walk : !(modes.Navmode__EnabledModes__Walk === false || modes.Navmode__EnabledModes__Walk === 'false'),
            Navmode__EnabledModes__Fly  : !(modes.Navmode__EnabledModes__Fly === false || modes.Navmode__EnabledModes__Fly === 'false')
        };
        check(label + ': na-navigation-modes-loaded carries the flags of the document the session runs', nav.length === 1 && same(nav[0].detail.enabledModes, want), { got : nav.map((e) => e.detail), want : want });
    }

    function Main(argv) {
        const targetIndex = argv.indexOf('--target');
        const target = targetIndex >= 0 ? argv[targetIndex + 1] : 'candidate';
        process.stdout.write('W0-13 harness - LoadingSequence served from: ' + (target.startsWith('file:') ? target.slice(5) : VARIANT_FILES[target]) + '\n');
        process.stdout.write('owned keys (app config): ' + OWNED_KEYS.length + '\n');

        const R = {};
        Object.keys(SCENARIOS).forEach((name) => { R[name] = Run(name, 'new', target); });
        const P = { 'lh-150-r2-newer' : Run('lh-150-r2-newer', 'pre', target), 'pages' : Run('pages', 'pre', target), 'lh-no-project' : Run('lh-no-project', 'pre', target) };

        const diskOld = DiskOld(), r2New = R2New();

        // ---- localhost, worker 1.5.0, R2 newer than disk (acceptance 1 and 2) ----
        let r = R['lh-150-r2-newer'];
        if (r) {
            process.stdout.write('\nlh-150-r2-newer - localhost, worker 1.5.0, R2 holds a newer drawings block than disk\n');
            ProjectSuccess(r, 'lh-150', r2New.LayoutEditor__DrawingsData, "R2's editor-owned keys over the disk copy");
            check('lh-150: the overlay is logged and names the keys R2 changed',
                hasLog(r, 'log', 'Overlaid editor-owned keys from R2 (localhost source of truth) - R2 differed from the local copy in')
                && hasLog(r, 'log', 'LayoutEditor__DrawingsData') && hasLog(r, 'log', 'Navmode__EnabledModes'), r.logs.filter((l) => l.text.includes('Overlaid')));
            const L = r.loaded;
            check('lh-150: every listed key R2 holds now has R2\'s value', OWNED_KEYS.filter((k) => r2New[k] !== undefined).every((k) => same(L[k], r2New[k])),
                OWNED_KEYS.filter((k) => r2New[k] !== undefined && !same(L[k], r2New[k])));
            check('lh-150: a listed key R2 lacks keeps the local value (CrossSection__Config)', same(L.CrossSection__Config, diskOld.CrossSection__Config), L.CrossSection__Config);
            check('lh-150: a pipeline key is never overlaid (images stay the local copy\'s)', same(L.images, diskOld.images), L.images);
            check('lh-150: a key not on the list is never overlaid (valeVision_ModelUrls)', same(L.valeVision_ModelUrls, diskOld.valeVision_ModelUrls));
            check('lh-150: a key only R2 has is not copied (R2OnlyKey)', L.R2OnlyKey === undefined);
            check('lh-150: the identity keys stay the local copy\'s (projectCode, projectName, folderId)', L.projectCode === diskOld.projectCode && L.projectName === diskOld.projectName && L.folderId === diskOld.folderId);
            const nav = ofType(r, 'na-navigation-modes-loaded');
            check('lh-150: na-navigation-modes-loaded carries R2\'s flags (fly off) - the overlay ran before anything read the data',
                nav.length === 1 && same(nav[0].detail.enabledModes, { Navmode__EnabledModes__Walk : true, Navmode__EnabledModes__Fly : false }), nav.map((e) => e.detail));
            const scenes = ofType(r, 'na-crosssection-config-loaded');
            check('lh-150: na-crosssection-config-loaded carries the local value R2 lacks', scenes.length === 1 && same(scenes[0].detail.crossSectionConfig, diskOld.CrossSection__Config));
            const overlay = reqs(r, isOverlayRead);
            check('lh-150: R2 was read once, through the CDN (worker 1.5.0 lists no project route), fresh (?t=, no-store)', overlay.length === 1 && overlay[0].cache === 'no-store', overlay);
            check('lh-150: the worker was asked only for /health (no project route on 1.5.0, no write)', reqs(r, isWorker).length === 1 && reqs(r, isWorker)[0].url === WORKER_BASE + '/health', reqs(r, isWorker));
            check('lh-150: the editor config was read once from the local server', reqs(r, isEditorCfg).length === 1);
            const firstProjectEvent = r.events.find((e) => PROJECT_EVENTS.includes(e.type) || e.type === r.drawingsEvent);
            check('lh-150: the R2 read finished before the first project dispatch', overlay.length === 1 && firstProjectEvent && overlay[0].n < firstProjectEvent.n);
        }

        // ---- the pre-image on the same world: the harness has teeth ----
        r = P['lh-150-r2-newer'];
        if (r) {
            process.stdout.write('\npre-image on lh-150 (the same world) - shows what changed\n');
            const drawings = ofType(r, r.drawingsEvent);
            check('pre: the pre-image dispatched the disk block (the bug the overlay fixes)', drawings.length === 1 && same(drawings[0].detail.block, diskOld.LayoutEditor__DrawingsData));
            check('pre: the pre-image sent no sceneConfig', drawings.length === 1 && same(drawings[0].detailKeys, [ 'block', 'projectCode' ]), drawings[0] && drawings[0].detailKeys);
            check('pre: the pre-image dispatched no na-app-scene-ready', ofType(r, 'na-app-scene-ready').length === 0);
            check('pre: the pre-image registered no merge base', r.loaded === null);
            check('pre: the pre-image made no R2 read and asked no worker', reqs(r, isOverlayRead).length === 0 && reqs(r, isWorker).length === 0 && reqs(r, isEditorCfg).length === 0);
        }

        // ---- localhost, worker 1.6.0, bare code token ----
        r = R['lh-160-r2-newer'];
        if (r) {
            process.stdout.write('\nlh-160-r2-newer - localhost, worker 1.6.0 (project route listed), ?project=3047\n');
            ProjectSuccess(r, 'lh-160', r2New.LayoutEditor__DrawingsData, "R2's editor-owned keys over the disk copy");
            const projectReads = reqs(r, (f) => f.url === WORKER_BASE + '/projects/2026/3047__Doous/project');
            check('lh-160: R2 was read once through the worker\'s project route, with the editor key', projectReads.length === 1 && projectReads[0].apiKey === API_KEY && projectReads[0].method === 'GET', projectReads);
            check('lh-160: no CDN overlay read when the worker serves the project route', reqs(r, isOverlayRead).length === 0);
            check('lh-160: the local copy came from the local server under the token (/api/projects/3047)', reqs(r, (f) => f.url === FLASK_ORIGIN + '/api/projects/3047').length === 1);
            check('lh-160: the overlay is logged', hasLog(r, 'log', 'Overlaid editor-owned keys from R2') && hasLog(r, 'log', 'LayoutEditor__DrawingsData'));
        }

        // ---- localhost, R2 and disk identical (today's Doous) ----
        r = R['lh-matched'];
        if (r) {
            process.stdout.write('\nlh-matched - localhost, R2 and disk identical (2026/3047__Doous today)\n');
            ProjectSuccess(r, 'lh-matched', DOOUS_DOC.LayoutEditor__DrawingsData, 'the shared copy');
            check('lh-matched: the overlay is logged as matching', hasLog(r, 'log', 'Overlaid editor-owned keys from R2 (localhost source of truth) - the local copy already matched.'));
            check('lh-matched: the document the session runs equals the disk copy', same(r.loaded, DOOUS_DOC));
        }

        // ---- the non-fatal paths ----
        const nonFatal = [
            [ 'lh-no-list',          'warn', 'No ProjectData__EditorOwnedKeys list in the app config', { overlayReads : 0 } ],
            [ 'lh-no-editor-config', 'info', 'No editor worker for this project', { overlayReads : 0, worker : 0 } ],
            [ 'lh-r2-500',           'warn', 'Could not read project.json from R2', { overlayReads : 1 } ],
            [ 'lh-r2-missing',       'info', 'R2 holds no project.json for this project yet', { overlayReads : 1 } ],
            [ 'lh-r2-hangs',         'warn', 'R2 did not answer within 0.4 s', { overlayReads : 1 } ],
            [ 'lh-health-hangs',     'warn', 'R2 did not answer within 0.4 s', { overlayReads : 0 } ],
            [ 'lh-other-project',    'warn', 'is project 9999, the local copy is 3047', { overlayReads : 1 } ]
        ];
        nonFatal.forEach(([ name, level, text, expect ]) => {
            const x = R[name];
            if (!x) return;
            process.stdout.write('\n' + name + ' - the overlay gives way, the load goes on with the disk copy\n');
            ProjectSuccess(x, name, diskOld.LayoutEditor__DrawingsData, 'the disk copy as the local server gave it');
            check(name + ': says why in the console (' + level + ': "' + text + '")', hasLog(x, level, text), x.logs.filter((l) => l.level !== 'log' || l.text.includes('R2')));
            check(name + ': nothing was overlaid (the document is the disk copy)', same(x.loaded, diskOld));
            check(name + ': no overlay success line', !hasLog(x, 'log', 'Overlaid editor-owned keys'));
            if (expect.overlayReads !== undefined) check(name + ': R2 overlay reads = ' + expect.overlayReads, reqs(x, isOverlayRead).length === expect.overlayReads, reqs(x, isOverlayRead));
            if (expect.worker !== undefined) check(name + ': worker calls = ' + expect.worker, reqs(x, isWorker).length === expect.worker, reqs(x, isWorker));
        });
        if (R['lh-r2-hangs'])     check('lh-r2-hangs: the load waited about the budget, not the watchdog\'s 120 s', R['lh-r2-hangs'].elapsedMs < 5000, R['lh-r2-hangs'].elapsedMs);
        if (R['lh-health-hangs']) check('lh-health-hangs: the load waited about the budget, not the watchdog\'s 120 s', R['lh-health-hangs'].elapsedMs < 5000, R['lh-health-hangs'].elapsedMs);

        // ---- the project fetch fails ----
        r = R['lh-fetch-fails'];
        if (r) {
            process.stdout.write('\nlh-fetch-fails - the local server has no such project\n');
            check('lh-fetch-fails: the load error overlay shows', r.errorOverlay === true);
            check('lh-fetch-fails: no na-app-scene-ready (the scene never showed)', ofType(r, 'na-app-scene-ready').length === 0);
            check('lh-fetch-fails: no merge base registered', r.loaded === null);
            check('lh-fetch-fails: no drawings dispatch', ofType(r, r.drawingsEvent).length === 0);
            check('lh-fetch-fails: no R2 overlay read', reqs(r, isOverlayRead).length === 0);
        }

        // ---- no ?project= ----
        r = R['lh-no-project'];
        if (r) {
            process.stdout.write('\nlh-no-project - localhost, no ?project= (config defaults)\n');
            CommonSuccess(r, 'lh-no-project');
            check('lh-no-project: the facade is not started (no editor config, no worker)', reqs(r, isEditorCfg).length === 0 && reqs(r, isWorker).length === 0);
            check('lh-no-project: no merge base registered', r.loaded === null);
            check('lh-no-project: no drawings dispatch (ValeVision dispatches inside the project branch)', ofType(r, r.drawingsEvent).length === 0);
            const pre = P['lh-no-project'];
            if (pre) check('lh-no-project: the same requests as the pre-image', same(pre.fetches.map((f) => f.method + ' ' + f.url.replace(/\?t=\d+/, '?t=T')), r.fetches.map((f) => f.method + ' ' + f.url.replace(/\?t=\d+/, '?t=T'))));
        }

        // ---- GitHub Pages: the web path is unchanged, no worker call ----
        r = R['pages'];
        const pre = P['pages'];
        if (r && pre) {
            process.stdout.write('\npages - GitHub Pages: the live site\n');
            ProjectSuccess(r, 'pages', r2New.LayoutEditor__DrawingsData, 'the CDN copy');
            check('pages: no worker call, no editor-config request, no R2 overlay read', reqs(r, isWorker).length === 0 && reqs(r, isEditorCfg).length === 0 && reqs(r, isOverlayRead).length === 0);
            check('pages: no request to a local server', !r.fetches.some((f) => f.url.startsWith(FLASK_ORIGIN)));
            check('pages: no overlay log line of any kind', !r.logs.some((l) => l.text.includes('Overlaid') || l.text.includes('R2 did not answer') || l.text.includes('editor worker')));
            const norm = (x) => x.fetches.map((f) => f.method + ' ' + f.url.replace(/\?t=\d+/, '?t=T') + ' ' + (f.cache || ''));
            check('pages: the request list is identical to the pre-image\'s (web load path unchanged)', same(norm(pre), norm(r)), { pre : norm(pre), now : norm(r) });
            const evs = (x) => x.events.filter((e) => e.type !== 'na-app-scene-ready').map((e) => {
                const detail = (e.type === x.drawingsEvent && e.detail) ? Object.assign({}, e.detail, { sceneConfig : undefined }) : e.detail;
                return e.type + ' ' + JSON.stringify(detail);
            });
            check('pages: the same events with the same details as the pre-image, apart from sceneConfig and na-app-scene-ready', same(evs(pre), evs(r)), { pre : evs(pre), now : evs(r) });
            check('pages: the only new event is na-app-scene-ready', r.events.length === pre.events.length + 1);
        }
        r = R['pages-no-project'];
        if (r) {
            process.stdout.write('\npages-no-project - GitHub Pages, no ?project=\n');
            CommonSuccess(r, 'pages-no-project');
            check('pages-no-project: no worker call, no local server, no merge base', reqs(r, isWorker).length === 0 && !r.fetches.some((f) => f.url.startsWith(FLASK_ORIGIN)) && r.loaded === null);
        }

        // ---- the facade surface the sequence relies on ----
        const any = R['lh-150-r2-newer'];
        if (any) {
            check('facade: exports the four names the sequence imports',
                [ 'Na__CfApi__Initialize', 'Na__CfApi__IsConfigured', 'Na__CfApi__ReadProjectData', 'Na__CfApi__SetLoadedProjectData', 'Na__CfApi__GetLoadedProjectData' ].every((n) => any.facadeSurface.includes(n)));
        }

        process.stdout.write('\nRESULT: ' + (failures === 0 ? 'PASS' : 'FAIL') + ' (' + passes + ' passed, ' + failures + ' failed)\n');
        process.exit(failures === 0 ? 0 : 1);
    }

// endregion -------------------------------------------------------------------


const argv = process.argv.slice(2);
if (argv[0] === '--child') {
    const name    = argv[1];
    const variant = argv[argv.indexOf('--variant') + 1];
    const target  = argv[argv.indexOf('--target') + 1];
    RunChild(name, variant, target).catch((error) => {
        process.stdout.write('RESULT:' + JSON.stringify({ scenario : name, variant : variant, threw : 'child failed: ' + ((error && error.stack) || String(error)), events : [], fetches : [], logs : [], loaded : null }) + '\n');
        process.exit(0);
    });
} else {
    Main(argv);
}
