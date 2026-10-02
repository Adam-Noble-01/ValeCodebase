// =============================================================================
// W0-17 scratch - start-up order harness (real VV modules under Node)
// =============================================================================
//
// Runs ONE scenario per process (module state is per process):
//
//   node --import ./w0_17_register.mjs w0_17_startup_harness.mjs <scenario> [index.html]
//
//   drawings      localhost, a project WITH drawings, section bindings and SketchUp sections
//   nodrawings    localhost, a project with NO drawings block and no section data
//   authoringoff  localhost with ?authoring=off (the read-only web build)
//   livehost      a non-local host, no parameter (the live site)
//   race-new      the loading sequence dispatches with NO await (worst case): new order
//   race-old      the same worst case with the pre-W0-17 order (expected to MISS the data)
//
// What is real: DevGate, ProjectData, 41 SceneData + SystemLogic (three r184 via the
// import map), DrawView ConfigState and its JSON, the localhost Dev menu module, the
// main app config JSON, and the start-up block itself - extracted verbatim from the
// index.html under test and executed, not copied.
// What is simulated: the browser globals (EventTarget window, URL location, Map
// localStorage, element stubs, a disk-backed fetch) and VV's loading sequence, whose
// project-data dispatches are mirrored from 01__AppCore/Na__AppFlow__LoadingSequence.js
// :671-740 (two awaits, then config / scene data / drawings / SketchUp, in that order).
// Nothing is written anywhere except this process's stdout.
// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const APP_ROOT  = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const MOD       = (rel) => pathToFileURL(path.resolve(APP_ROOT, '02__Src__AppModules', rel)).href;
const scenario  = process.argv[2];
const indexPath = process.argv[3] || path.resolve(APP_ROOT, 'index.html');

const results = { scenario, index: indexPath, checks: [], logs: [], registrations: [], fetches: [] };
const check = (name, ok, detail) => results.checks.push({ name, ok: !!ok, detail: detail === undefined ? null : detail });


// -----------------------------------------------------------------------------
// Console capture
// -----------------------------------------------------------------------------
const realLog = console.log;
const fmt = (a) => a.map((x) => (x && x.stack) ? x.stack : (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ');
console.log   = (...a) => results.logs.push(['log',   fmt(a)]);
console.info  = (...a) => results.logs.push(['info',  fmt(a)]);
console.warn  = (...a) => results.logs.push(['warn',  fmt(a)]);
console.error = (...a) => results.logs.push(['error', fmt(a)]);
const logCount = (re) => results.logs.filter(([, t]) => re.test(t)).length;
process.on('uncaughtException', (error) => results.logs.push(['error', 'UNCAUGHT (listener) ' + (error && error.stack ? error.stack : String(error))]));
const flushTicks = () => new Promise((r) => setTimeout(r, 0));             // <-- Node reports a throwing EventTarget listener on a later tick


// -----------------------------------------------------------------------------
// Browser globals
// -----------------------------------------------------------------------------
let phase = 'module-import';
const winTarget = new EventTarget();
globalThis.window = globalThis;
globalThis.addEventListener    = (type, fn, opts) => { results.registrations.push({ type, phase }); return winTarget.addEventListener(type, fn, opts); };
globalThis.removeEventListener = (type, fn, opts) => winTarget.removeEventListener(type, fn, opts);
globalThis.dispatchEvent       = (event) => winTarget.dispatchEvent(event);

const SEARCH = {
    'drawings'     : '?project=2026/3047__Doous',
    'nodrawings'   : '?project=2026/3047__Doous',
    'authoringoff' : '?project=2026/3047__Doous&authoring=off',
    'livehost'     : '?project=2026/3047__Doous',
    'race-new'     : '?project=2026/3047__Doous',
    'race-old'     : '?project=2026/3047__Doous'
};
if (!(scenario in SEARCH)) { realLog('unknown scenario ' + scenario); process.exit(2); }
const ORIGIN = scenario === 'livehost' ? 'https://valevision.example.org' : 'http://localhost:8000';
Object.defineProperty(globalThis, 'location', { value: new URL(ORIGIN + '/ValeVision3D/index.html' + SEARCH[scenario]), configurable: true, writable: true });

const store = new Map();
const storage = {
    getItem    : (k) => (store.has(k) ? store.get(k) : null),
    setItem    : (k, v) => { store.set(k, String(v)); },
    removeItem : (k) => { store.delete(k); },
    clear      : () => store.clear(),
    key        : (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; }
};
Object.defineProperty(globalThis, 'localStorage',   { value: storage, configurable: true, writable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 }, configurable: true, writable: true });

function makeElement(id, tag = 'div') {
    const classes = new Set();
    const el = {
        id, tagName: String(tag).toUpperCase(), style: {}, children: [], parentNode: null, dataset: {}, attributes: {},
        textContent: '', innerHTML: '', offsetWidth: 0, offsetHeight: 0,
        classList: {
            add: (...c) => c.forEach((x) => classes.add(x)), remove: (...c) => c.forEach((x) => classes.delete(x)),
            contains: (c) => classes.has(c), toggle: (c, f) => { const on = f === undefined ? !classes.has(c) : !!f; if (on) classes.add(c); else classes.delete(c); return on; }
        },
        appendChild(child) { if (child.parentNode) child.parentNode.children = child.parentNode.children.filter((c) => c !== child); child.parentNode = el; el.children.push(child); return child; },
        removeChild(child) { el.children = el.children.filter((c) => c !== child); child.parentNode = null; return child; },
        insertBefore(child) { return el.appendChild(child); },
        remove() { if (el.parentNode) el.parentNode.removeChild(el); },
        querySelector: () => null, querySelectorAll: () => [], closest: () => null,
        addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
        setAttribute(k, v) { el.attributes[k] = String(v); }, getAttribute(k) { return el.attributes[k] ?? null; }, removeAttribute(k) { delete el.attributes[k]; },
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }),
        width: 0, height: 0,
        getContext: () => make2dContext()                                   // <-- Canvas stub for gizmo grip textures (never rasterised under Node)
    };
    return el;
}
function make2dContext() {
    const gradient = { addColorStop() {} };
    const noop = () => {};
    return new Proxy({ createLinearGradient: () => gradient, createRadialGradient: () => gradient, createPattern: () => null,
                       measureText: () => ({ width: 0 }), getImageData: () => ({ data: new Uint8ClampedArray(4) }) },
                     { get: (t, k) => (k in t ? t[k] : noop), set: () => true });
}
const elements = new Map();
const addEl = (id) => { const el = makeElement(id); elements.set(id, el); return el; };
const devMenuContainer = addEl('naDevToolsMenuContainer');
devMenuContainer.style.display = 'none';                                     // <-- index.html:737 style="display:none;"
const headerSlot   = addEl('naHeaderDevToolsSlot');
addEl('naDevMenuResizeHandle');
const docTarget = new EventTarget();
globalThis.document = {
    getElementById   : (id) => elements.get(id) || null,
    createElement    : (tag) => makeElement(null, tag),
    createElementNS  : (ns, tag) => makeElement(null, tag),
    querySelector    : () => null,
    querySelectorAll : () => [],
    addEventListener : (t, f, o) => docTarget.addEventListener(t, f, o),
    removeEventListener : (t, f, o) => docTarget.removeEventListener(t, f, o),
    dispatchEvent    : (e) => docTarget.dispatchEvent(e),
    body : makeElement('body', 'body'), head : makeElement('head', 'head'), documentElement : makeElement('html', 'html'),
    readyState : 'complete', visibilityState : 'visible', hidden : false
};
globalThis.innerWidth = 1920;
globalThis.innerHeight = 1080;
globalThis.devicePixelRatio = 1;
globalThis.requestAnimationFrame = () => 0;                                  // <-- Never calls back: no render loop under Node
globalThis.cancelAnimationFrame  = () => {};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
globalThis.getComputedStyle = () => ({ display: 'block', getPropertyValue: () => '' });

globalThis.fetch = async (input) => {
    const url = (typeof input === 'string') ? input : (input instanceof URL ? input.href : input.url);
    let file = null;
    if (url.startsWith('file:')) file = fileURLToPath(url);
    else {
        const u = new URL(url, globalThis.location.href);
        if (u.pathname.startsWith('/ValeVision3D/')) file = path.resolve(APP_ROOT, decodeURIComponent(u.pathname.slice('/ValeVision3D/'.length)));
    }
    results.fetches.push({ url: url.replace(/^file:\/\/\/D:\/10_CoreLib__ValeCodebase\/WebApps\/ValeVision3D\//, 'VV/'), phase });
    if (file && existsSync(file)) return new Response(readFileSync(file), { status: 200, headers: { 'content-type': file.endsWith('.json') ? 'application/json' : 'text/plain' } });
    return new Response('not found', { status: 404 });
};


// -----------------------------------------------------------------------------
// The real modules
// -----------------------------------------------------------------------------
const THREE       = await import('three');
const DevGate     = await import(MOD('03__AppUtils/Na__AppUtils__DevGate__.js'));
const ProjectData = await import(MOD('40__System__DrawingViewCore/Na__DrawView__ProjectData__.js'));
const SceneData   = await import(MOD('41__System__CrossSectionView/Na__CrossSectionView__SceneData.js'));
const SectLogic   = await import(MOD('41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js'));
const DrawCfg     = await import(MOD('40__System__DrawingViewCore/Na__DrawView__ConfigState__.js'));
const DevMenu     = await import(MOD('70__System__DevTools/Na__UiFeature__DevMenu__LocalhostOnly.js'));
const appConfig   = JSON.parse(readFileSync(path.resolve(APP_ROOT, '02__Src__AppModules/02__AppData/Na__AppConfig__Main.json'), 'utf8'));


// -----------------------------------------------------------------------------
// Project fixtures (VV schema)
// -----------------------------------------------------------------------------
function projectWithDrawings() {
    return {
        CrossSection__Config : { CrossSection__Enabled : true },
        CrossSection__SceneData : {
            CrossSection__SceneData__Version : 1,
            CrossSection__SceneData__Scenes  : {
                'Scene A' : {
                    CrossSection__SceneBinding__SceneId       : 'scene-a',
                    CrossSection__SceneBinding__GizmosVisible : true,
                    CrossSection__SceneBinding__SliceDepthM   : null,
                    CrossSection__SceneBinding__Sections      : [
                        { CrossSection__Section__Name : 'Plan Cut 1200', CrossSection__Section__Mode : 'PLAN',
                          CrossSection__Section__NormalXyz : [0, -1, 0], CrossSection__Section__PositionMm : 1200,
                          CrossSection__Section__Enabled : true, CrossSection__Section__GizmoVisible : true }
                    ]
                },
                'Scene Empty' : {
                    CrossSection__SceneBinding__SceneId  : 'scene-empty',
                    CrossSection__SceneBinding__Sections : []
                }
            }
        },
        LayoutEditor__DrawingsData : {
            LayoutEditor__DrawingsData__FloorPlans : [ { FloorPlan__Id : 'fp-1', FloorPlan__Name : 'Ground Floor' }, { FloorPlan__Id : 'fp-2', FloorPlan__Name : 'First Floor' } ],
            LayoutEditor__DrawingsData__Elevations : [ { Elevation__Id : 'el-1', Elevation__Name : 'Front Elevation' } ],
            LayoutEditor__DrawingsData__Sheets     : [ { Sheet__Id : 'sh-1', Sheet__Name : 'Drawing 1' } ]
        },
        'ValeVison3D__SketchUpCameraData' : {
            scenes : [ { scene_name : 'Scene S', section_planes : [ { name : 'SU Section', normal : { x : 1, y : 0, z : 0 }, position_mm : 2500 } ] } ]
        }
    };
}
const projectWithoutDrawings = () => ({ images : [] });


// -----------------------------------------------------------------------------
// VV loading sequence, project-data part (LoadingSequence.js :671-740)
// -----------------------------------------------------------------------------
let sequenceMarks = {};
function dispatchProjectData(projectData) {
    sequenceMarks.unlockOnWindowAtFirstDispatch = (typeof window.Na__DevGate__Unlock === 'function' && typeof window.Na__DevGate__Lock === 'function');
    if (projectData.CrossSection__Config) {
        window.dispatchEvent(new CustomEvent('na-crosssection-config-loaded', { detail: { crossSectionConfig: projectData.CrossSection__Config } }));
    }
    if (projectData.CrossSection__SceneData) {
        window.dispatchEvent(new CustomEvent('na-crosssection-scenedata-loaded', { detail: { sceneData: projectData.CrossSection__SceneData } }));
    }
    window.dispatchEvent(new CustomEvent(ProjectData.Na__DrawData__LOADED_EVENT, {
        detail: { block: projectData.LayoutEditor__DrawingsData || null, projectCode: '2026/3047__Doous' }
    }));
    if (projectData['ValeVison3D__SketchUpCameraData']) {
        window.dispatchEvent(new CustomEvent('na-crosssection-sketchup-sections-loaded', { detail: { sketchUpCameraData: projectData['ValeVison3D__SketchUpCameraData'] } }));
    }
}
function startLoadingSequence(projectData, { synchronous = false } = {}) {
    phase = 'loading-sequence';
    if (synchronous) { dispatchProjectData(projectData); return Promise.resolve(); }
    return (async () => {
        await Promise.resolve();                                     // <-- await Na__AppUtils__InitMasterIndex()
        await new Promise((r) => setTimeout(r, 5));                  // <-- await Na__AppUtils__FetchProjectJson(...)
        dispatchProjectData(projectData);
    })();
}


// -----------------------------------------------------------------------------
// The start-up block, extracted from the index.html under test
// -----------------------------------------------------------------------------
const html  = readFileSync(indexPath, 'utf8').replace(/\r\n/g, '\n');
const start = html.indexOf('    // RESOLVE THE AUTHORING GATE (must precede every dev surface)\n');
const seq   = html.indexOf('    // INITIALIZE LOADING SEQUENCE\n    // ------------------------------------------------------------\n    Na__AppFlow__StartLoadingSequence({');
const blockCode = (start >= 0 && seq > start) ? html.slice(start, seq) : null;

function runNewStartupBlock() {
    phase = 'startup-block';
    const run = new Function('Na__DevGate__Initialize', 'Na__DrawView__ProjectData__Initialize', 'Na__SectSceneData__Initialize',
                             'Na__DrawCfg__SetAppConfig', 'Na__DrawCfg__Load', 'Na__AppConfig__Data', blockCode);
    run(DevGate.Na__DevGate__Initialize, ProjectData.Na__DrawView__ProjectData__Initialize, SceneData.Na__SectSceneData__Initialize,
        DrawCfg.Na__DrawCfg__SetAppConfig, DrawCfg.Na__DrawCfg__Load, appConfig);
}

// Later index.html start-up that touches these systems (after StartLoadingSequence, synchronous):
//   :2034 Na__UiFeature__InitializeLocalhostDevMenu()
//   :2195 Na__UiFeature__InitializeCrossSectionControls(...) -> Na__CrossSection__Initialize, Na__SectSceneData__Initialize (idempotent),
//         and its 'na-crosssection-config-loaded' listener -> Na__CrossSection__ApplyProjectConfig
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.01, 1000);
const modelRoot = new THREE.Group();
modelRoot.add(new THREE.Mesh(new THREE.BoxGeometry(10, 6, 8), new THREE.MeshStandardMaterial()));
scene.add(modelRoot);
const rendererStub = { localClippingEnabled: false, domElement: makeElement('canvas', 'canvas'), getSize: (v) => (v ? v.set(1920, 1080) : { x: 1920, y: 1080 }), getPixelRatio: () => 1 };
const controlsStub = { enabled: true, addEventListener() {}, removeEventListener() {}, target: new THREE.Vector3() };
function runLaterSyncInit() {
    phase = 'after-loading-sequence-sync';
    DevMenu.Na__UiFeature__InitializeLocalhostDevMenu();
    SectLogic.Na__CrossSection__Initialize(scene, camera, rendererStub, controlsStub, { current: null }, modelRoot);
    SceneData.Na__SectSceneData__Initialize();
    window.addEventListener('na-crosssection-config-loaded', (event) => {
        const config = event.detail && event.detail.crossSectionConfig;
        if (config) SectLogic.Na__CrossSection__ApplyProjectConfig(config);
    });
}
function runOldOrderLateCalls() {                                    // <-- pre-W0-17 index.html :2156 (41 controls) .. :2207-2209 .. :2261
    phase = 'old-order-late-calls';
    SectLogic.Na__CrossSection__Initialize(scene, camera, rendererStub, controlsStub, { current: null }, modelRoot);
    SceneData.Na__SectSceneData__Initialize();
    DrawCfg.Na__DrawCfg__SetAppConfig(appConfig);
    DrawCfg.Na__DrawCfg__Load();
    ProjectData.Na__DrawView__ProjectData__Initialize();
    DevGate.Na__DevGate__Initialize();
}

const sceneActivate = async (sceneName, sceneId, extra = {}) => {
    window.dispatchEvent(new CustomEvent('na-pm-scene-activated', { detail: { sceneName, sceneId, ...extra } }));
    await flushTicks();
};
const liveSections = () => SectLogic.Na__CrossSection__SerializeSections().sections;


// -----------------------------------------------------------------------------
// Scenarios
// -----------------------------------------------------------------------------
try {
    if (scenario === 'race-old') {
        phase = 'race-old';
        await startLoadingSequence(projectWithDrawings(), { synchronous: true });     // <-- worst case: dispatch before any listener
        runOldOrderLateCalls();
        const plans = ProjectData.Na__DrawData__GetFloorPlansArray().length;
        check('OLD order, dispatch with no await: drawings listener MISSES the block (the latent race TV fixed)', plans === 0, { floorPlans: plans });
        check('OLD order, dispatch with no await: section bindings MISSED', SceneData.Na__SectSceneData__GetProjectBlock() === null, null);
    } else {
        check('start-up block found in index.html directly above INITIALIZE LOADING SEQUENCE', blockCode !== null, { blockLines: blockCode ? blockCode.split('\n').length - 1 : 0 });
        runNewStartupBlock();
        const regs = (type) => results.registrations.filter((r) => r.type === type).map((r) => r.phase);
        check('window listeners armed by the start-up block (before the loading sequence)',
            ['na-layouteditor-drawingsdata-loaded', 'na-crosssection-scenedata-loaded', 'na-crosssection-sketchup-sections-loaded', 'na-pm-scene-activated']
                .every((t) => regs(t).length === 1 && regs(t)[0] === 'startup-block'),
            Object.fromEntries(['na-layouteditor-drawingsdata-loaded', 'na-crosssection-scenedata-loaded', 'na-crosssection-sketchup-sections-loaded', 'na-pm-scene-activated'].map((t) => [t, regs(t)])));
        check('DrawCfg config fetch started inside the start-up block (not awaited)',
            results.fetches.some((f) => /Na__DrawView__AppConfig__\.json$/.test(f.url) && f.phase === 'startup-block'),
            results.fetches.filter((f) => /Na__DrawView__AppConfig__/.test(f.url)));
        check('console switches exposed on window by the start-up block',
            typeof window.Na__DevGate__Unlock === 'function' && typeof window.Na__DevGate__Lock === 'function', null);

        const fixtures = { 'drawings': projectWithDrawings(), 'nodrawings': projectWithoutDrawings(), 'authoringoff': projectWithDrawings(),
                           'livehost': projectWithDrawings(), 'race-new': projectWithDrawings() };
        const loading = startLoadingSequence(fixtures[scenario], { synchronous: scenario === 'race-new' });
        runLaterSyncInit();
        await loading;
        await new Promise((r) => setTimeout(r, 20));                 // <-- let the DrawCfg fetch settle
        phase = 'after-load';

        check('Na__DevGate__Unlock / Lock already on window when the loading sequence first dispatched', sequenceMarks.unlockOnWindowAtFirstDispatch === true, null);
        const loadResult = await DrawCfg.Na__DrawCfg__Load();
        check('Na__DrawCfg__Load() resolved true (system JSON read; same promise the LE ready chain waits on)', loadResult === true, { loadResult });
        check('second Na__SectSceneData__Initialize (the 41 controls call) is a no-op: one listener per event',
            results.registrations.filter((r) => r.type === 'na-crosssection-scenedata-loaded').length === 1, null);
        check('no console.error during start-up and load', logCount(/./) >= 0 && results.logs.filter(([k]) => k === 'error').length === 0,
            results.logs.filter(([k]) => k === 'error'));

        if (scenario === 'drawings' || scenario === 'race-new') {
            const p = ProjectData.Na__DrawData__GetFloorPlansArray().length;
            const e = ProjectData.Na__DrawData__GetElevationsArray().length;
            const s = ProjectData.Na__DrawData__GetSheetsArray().length;
            check('project WITH drawings: block adopted (2 plans, 1 elevation, 1 sheet) - what the Dev menus list', p === 2 && e === 1 && s === 1, { p, e, s });
            check('drawings data logged once', logCount(/Drawings data loaded: 2 plan\(s\), 1 elevation\(s\), 1 sheet\(s\)/) === 1, null);
            check('section bindings block adopted once', SceneData.Na__SectSceneData__GetProjectBlock() !== null && logCount(/Scene data block loaded \(2 scene binding/) === 1, null);
        }
        if (scenario === 'drawings') {
            check('SketchUp sections enabled the cross-section feature', SectLogic.Na__CrossSection__IsFeatureEnabled() === true, null);
            await sceneActivate('Scene A', 'scene-a');
            const a = liveSections();
            check('scene change to a bound scene restores its saved cut', a.length === 1 && a[0].positionMm === 1200 && a[0].mode === 'PLAN' && a[0].name === 'Plan Cut 1200', a);
            await sceneActivate('Scene B', 'scene-b');
            check('scene change to an unbound scene clears every cut', liveSections().length === 0, liveSections());
            await sceneActivate('Scene S', 'scene-s');
            const s2 = liveSections();
            check('scene change to a SketchUp-sectioned scene applies the SketchUp plane', s2.length === 1 && s2[0].positionMm === 2500, s2);
            await sceneActivate('Scene A', 'scene-a', { isDrawingApproach: true });
            const s3 = liveSections();
            check('a drawing approach scene is left to the drawing (no restore)', s3.length === 1 && s3[0].positionMm === 2500, s3);
            await sceneActivate('Scene A', 'scene-a');
            check('back to the bound scene restores it again', liveSections().length === 1 && liveSections()[0].positionMm === 1200, liveSections());
        }
        if (scenario === 'nodrawings') {
            const p = ProjectData.Na__DrawData__GetFloorPlansArray().length;
            const e = ProjectData.Na__DrawData__GetElevationsArray().length;
            const s = ProjectData.Na__DrawData__GetSheetsArray().length;
            check('project WITHOUT drawings opens: empty skeleton (0 / 0 / 0)', p === 0 && e === 0 && s === 0, { p, e, s });
            check('drawings data logged once with zero counts', logCount(/Drawings data loaded: 0 plan\(s\), 0 elevation\(s\), 0 sheet\(s\)/) === 1, null);
            check('no section block (nothing dispatched, nothing invented)', SceneData.Na__SectSceneData__GetProjectBlock() === null, null);
            await sceneActivate('Scene A', 'scene-a');
            check('scene change with the feature off leaves sections alone', liveSections().length === 0, null);
        }
        const authoring = DevGate.Na__DevGate__IsAuthoringEnabled();
        if (scenario === 'drawings' || scenario === 'nodrawings' || scenario === 'race-new') {
            check('localhost: authoring open, Dev menu revealed and mounted in the header slot',
                authoring === true && devMenuContainer.style.display === '' && devMenuContainer.parentNode === headerSlot,
                { authoring, display: devMenuContainer.style.display, mounted: devMenuContainer.parentNode === headerSlot });
        }
        if (scenario === 'authoringoff') {
            check('?authoring=off on localhost: authoring LOCKED, Dev menu stays hidden and unmounted',
                authoring === false && devMenuContainer.style.display === 'none' && devMenuContainer.parentNode !== headerSlot,
                { authoring, display: devMenuContainer.style.display, mounted: devMenuContainer.parentNode === headerSlot });
            check('?authoring=off remembered on this device (ValeVision3D__AuthoringUnlocked = false)', storage.getItem('ValeVision3D__AuthoringUnlocked') === 'false', storage.getItem('ValeVision3D__AuthoringUnlocked'));
            check('the gate was resolved in the start-up block (its URL log line came first)',
                results.logs.findIndex(([, t]) => /Authoring locked by URL parameter/.test(t)) > -1 &&
                results.logs.findIndex(([, t]) => /Authoring locked by URL parameter/.test(t)) < results.logs.findIndex(([, t]) => /Drawings data loaded/.test(t)), null);
        }
        if (scenario === 'livehost') {
            check('live host, no parameter: authoring closed, Dev menu hidden', authoring === false && devMenuContainer.style.display === 'none', { authoring, display: devMenuContainer.style.display });
        }
    }
} catch (error) {
    check('scenario ran without throwing', false, error && error.stack ? error.stack : String(error));
}

await flushTicks();
const failed = results.checks.filter((c) => !c.ok);
realLog(JSON.stringify({ scenario, pass: failed.length === 0, checks: results.checks, errors: results.logs.filter(([k]) => k === 'error'), warnings: results.logs.filter(([k]) => k === 'warn').length,
    logs: process.env.W0_17_DEBUG ? results.logs : undefined }, null, 1));
process.exit(failed.length === 0 ? 0 : 1);
