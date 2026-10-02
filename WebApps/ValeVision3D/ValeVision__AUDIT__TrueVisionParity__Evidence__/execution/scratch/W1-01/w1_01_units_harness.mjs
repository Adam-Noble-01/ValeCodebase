// =============================================================================
// W1-01 scratch - unit harness for ModelToggle 1.2.3, the uninitialised
// PhaseLibrary 1.0.0 and InteractiveOverlays 1.0.0
// =============================================================================
//
// Loads the REAL modules (candidate or live) at their browser URLs through the
// same module hooks as the loop harness: ModelToggle with the real
// Invalidation; PhaseLibrary with ValeVision's REAL MultiModel behind it (its
// own imports - three.js, loaders - are generated stubs); InteractiveOverlays
// on its own. The page and window are fakes that record events.
//
// Usage: node w1_01_units_harness.mjs [--target candidate|live|pre]
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { register } from 'node:module';

const HERE     = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const SRC      = '02__Src__AppModules/';
const TOGL_REL = SRC + '26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js';
const PHAS_REL = SRC + '26__System__ToggleModelElements/Na__ModelGroup__PhaseLibrary__.js';
const IOVL_REL = SRC + '05__RenderPipeline/Na__RenderLoop__InteractiveOverlays__.js';
const INVL_REL = SRC + '05__RenderPipeline/Na__RenderLoop__Invalidation.js';
const MULT_REL = SRC + '15__ModelLoader/Na__ModelLoader__MultiModel.js';
const BASE     = 'http://localhost:8000/ValeVision3D/';

const target = process.argv.includes('--target') ? process.argv[process.argv.indexOf('--target') + 1] : 'candidate';
const pick = (rel, name) => target === 'live' ? join(APP_ROOT, rel)
                          : target === 'pre'  ? join(HERE, 'preimage', name + '.bak')
                          : (target === 'mutant' && rel === TOGL_REL && process.env.W101_TOGL) ? process.env.W101_TOGL     // <-- Planted-fault copy
                          : join(HERE, 'candidate', name);
const real = {
    [TOGL_REL] : pick(TOGL_REL, 'Na__UiFeature__ModelToggle__Controls.js'),
    [INVL_REL] : pick(INVL_REL, 'Na__RenderLoop__Invalidation.js'),
    [MULT_REL] : join(APP_ROOT, MULT_REL)
};
if (target !== 'pre') {
    real[PHAS_REL] = pick(PHAS_REL, 'Na__ModelGroup__PhaseLibrary__.js');
    real[IOVL_REL] = pick(IOVL_REL, 'Na__RenderLoop__InteractiveOverlays__.js');
}

// GENERATED STUBS for every other import of the real files (three.js, loaders ...)
function ParseImports(source) {
    const out = [];
    const named = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = named.exec(source))) out.push({ names : m[1].split(',').map((p) => p.replace(/\/\/.*$/gm, '').trim()).filter(Boolean).map((p) => p.split(/\s+as\s+/)[0].trim()), specifier : m[2], star : false });
    const star = /import\s*\*\s*as\s+(\w+)\s*from\s*['"]([^'"]+)['"]/g;
    while ((m = star.exec(source))) out.push({ names : [], specifier : m[2], star : true });
    return out;
}
const wanted = new Map();
Object.entries(real).forEach(([ rel, file ]) => {
    ParseImports(readFileSync(file, 'utf8')).forEach(({ names, specifier }) => {
        const tgt = (specifier.startsWith('./') || specifier.startsWith('../')) ? new URL(specifier, 'http://x/' + rel).pathname.slice(1) : '__bare__/' + specifier;
        if (real[tgt]) return;
        if (!wanted.has(tgt)) wanted.set(tgt, new Set());
        names.forEach((n) => wanted.get(tgt).add(n));
    });
});
const FACTORY = "function __stub(p){const t=function(){};return new Proxy(t,{get(x,k){if(k==='then')return undefined;if(typeof k==='symbol')return undefined;return __stub(p+'.'+String(k));},apply(){return __stub(p+'()');},construct(){return __stub('new '+p);},set(){return true;}});}";
const stubs = {};
wanted.forEach((names, rel) => {
    const lines = [ FACTORY ];
    [ ...names ].forEach((n) => lines.push('export const ' + n + " = __stub('" + n + "');"));
    lines.push("export default __stub('default');");
    if (rel === '__bare__/three') lines.push("export const Group = class { constructor() { this.children = []; this.userData = {}; } };");
    stubs[rel] = lines.join('\n') + '\n';
});
const HOOKS = [
    "import { readFileSync } from 'node:fs';", 'let S = null;', 'export async function initialize(d) { S = d; }',
    'export async function resolve(spec, ctx, next) {',
    "    const parent = ctx.parentURL || '';",
    '    if (parent.startsWith(S.base)) {',
    "        if (spec.startsWith('./') || spec.startsWith('../')) return { url : new URL(spec, parent).href, shortCircuit : true };",
    "        return { url : S.base + '__bare__/' + encodeURIComponent(spec), shortCircuit : true };",
    '    }',
    '    if (spec.startsWith(S.base)) return { url : spec, shortCircuit : true };',
    '    return next(spec, ctx);',
    '}',
    'export async function load(url, ctx, next) {',
    '    if (!url.startsWith(S.base)) return next(url, ctx);',
    "    const rel = decodeURIComponent(url.slice(S.base.length).split('?')[0]);",
    "    if (S.real[rel]) return { format : 'module', source : readFileSync(S.real[rel], 'utf8'), shortCircuit : true };",
    "    if (S.stubs[rel]) return { format : 'module', source : S.stubs[rel], shortCircuit : true };",
    "    throw new Error('no file and no stub for ' + rel);",
    '}'
].join('\n');
const tmp = mkdtempSync(join(tmpdir(), 'na-w101u-'));
writeFileSync(join(tmp, 'hooks.mjs'), HOOKS);
register(pathToFileURL(join(tmp, 'hooks.mjs')).href, { parentURL : import.meta.url, data : { base : BASE, real, stubs } });

// THE PAGE AND WINDOW
const events = [];
const listeners = new Map();
globalThis.window = {
    dispatchEvent(e) { events.push({ type : e.type, detail : e.detail }); (listeners.get(e.type) || []).forEach((fn) => fn(e)); return true; },
    addEventListener(t, fn) { if (!listeners.has(t)) listeners.set(t, []); listeners.get(t).push(fn); },
    removeEventListener() {}
};
if (typeof globalThis.CustomEvent !== 'function') globalThis.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i ? i.detail : undefined; } };
function El(tag) {
    const classes = new Set(); const handlers = {};
    let html = '';
    return { tag, children : [], style : {}, dataset : {}, textContent : '',
        set innerHTML(v) { html = String(v); this.children = []; }, get innerHTML() { return html; },     // <-- As the DOM does: the old buttons go
        set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c)); }, get className() { return [ ...classes ].join(' '); },
        classList : { add : (c) => classes.add(c), remove : (c) => classes.delete(c), contains : (c) => classes.has(c),
                      toggle : (c, f) => { const on = f === undefined ? !classes.has(c) : !!f; if (on) classes.add(c); else classes.delete(c); return on; } },
        appendChild(c) { this.children.push(c); return c; },
        addEventListener(t, fn) { handlers[t] = fn; }, click() { if (handlers.click) handlers.click(); } };
}
let page = { naModelToggleList : El('div'), naModelTogglePanel : El('div'), naModelToggleButton : El('button') };
globalThis.document = { getElementById : (id) => page[id] || null, createElement : (t) => El(t) };
const quiet = []; console.log = (...a) => quiet.push(a.join(' ')); console.warn = (...a) => quiet.push(a.join(' '));
const out = (s) => process.stdout.write(s + '\n');

let passed = 0, failed = 0;
function check(label, ok, detail) { if (ok) { passed++; out('  PASS  ' + label); } else { failed++; out('  FAIL  ' + label + (detail ? '  -- ' + detail : '')); } }
const group = (name) => ({ name, visible : true, userData : {} });
const takeEvents = () => events.splice(0, events.length);
const ACTIVE = 'na-model-toggle__button--active';

out('W1-01 unit harness - ' + target);

// -----------------------------------------------------------------------------
// MODEL TOGGLE
// -----------------------------------------------------------------------------
const tog = await import(BASE + TOGL_REL);
const exported = Object.keys(tog).sort();
const OLD6 = [ 'Na__ModelToggle__ApplySceneLayerVisibility', 'Na__ModelToggle__CaptureVisibilityMap', 'Na__ModelToggle__GetCategories',
               'Na__ModelToggle__GetCategoryKeys', 'Na__ModelToggle__SetCategoryVisibility', 'Na__UiFeature__InitializeModelToggleControls' ];
const NEW3 = [ 'Na__ModelToggle__BorrowRegistry', 'Na__ModelToggle__RestoreRegistry', 'Na__ModelToggle__SetCategoryVisibleByKey' ];
check('ModelToggle keeps its six exports', OLD6.every((n) => exported.includes(n)), exported.join());
if (target === 'pre') {
    check('pre-image lacks the three TrueVision names (what this package adds)', NEW3.every((n) => !exported.includes(n)));
} else {
    check('ModelToggle exports exactly the six plus TrueVision\'s three names', exported.join() === [ ...OLD6, ...NEW3 ].sort().join(), exported.join());

    const live = new Map([ [ 'ValeVision__MainBuildingModel__Proposed', group('proposed') ], [ 'ValeVision__LandscapeEnvironment', group('landscape') ],
                           [ 'ValeVision__Vegetation', group('vegetation') ] ]);
    tog.Na__UiFeature__InitializeModelToggleControls(live);
    const buttons = page.naModelToggleList.children;
    const btn = (key) => buttons.find((b) => b.dataset.category === key);
    check('three categories registered and three dev buttons built', tog.Na__ModelToggle__GetCategoryKeys().length === 3 && buttons.length === 3);
    takeEvents();

    // ACCEPTANCE: a person toggling a model layer still refreshes the linework and the snapshot fingerprints
    btn('ValeVision__LandscapeEnvironment').click();
    let ev = takeEvents();
    const vis = ev.filter((e) => e.type === 'na-model-visibility-changed');
    check('a dev toggle click still dispatches na-model-visibility-changed (linework and snapshot fingerprints refresh)',
          vis.length === 1 && vis[0].detail.categoryKey === 'ValeVision__LandscapeEnvironment' && vis[0].detail.visible === false, JSON.stringify(ev));
    check('...hides the group, drops the active class and asks for a frame', live.get('ValeVision__LandscapeEnvironment').visible === false
          && !btn('ValeVision__LandscapeEnvironment').classList.contains(ACTIVE) && ev.some((e) => e.type === 'na-request-render'));
    btn('ValeVision__LandscapeEnvironment').click(); takeEvents();
    tog.Na__ModelToggle__SetCategoryVisibility('ValeVision__Vegetation', false);
    ev = takeEvents();
    check('SetCategoryVisibility (non-silent) still dispatches the event', ev.filter((e) => e.type === 'na-model-visibility-changed').length === 1);
    tog.Na__ModelToggle__SetCategoryVisibility('ValeVision__Vegetation', true, true);
    check('SetCategoryVisibility silent says nothing', takeEvents().length === 0);

    // SetCategoryVisibleByKey
    const r1 = tog.Na__ModelToggle__SetCategoryVisibleByKey('ValeVision__Vegetation', false);
    ev = takeEvents();
    check('SetCategoryVisibleByKey hides by exact key and answers true', r1 === true && live.get('ValeVision__Vegetation').visible === false);
    check('...silently: no visibility event and no frame request (a render puts it straight back)', ev.length === 0, JSON.stringify(ev));
    check('...the dev button follows', !btn('ValeVision__Vegetation').classList.contains(ACTIVE));
    check('...and the capture sees it', tog.Na__ModelToggle__CaptureVisibilityMap()['ValeVision__Vegetation'] === false);
    check('SetCategoryVisibleByKey with no flag shows (visible !== false, as TrueVision)', tog.Na__ModelToggle__SetCategoryVisibleByKey('ValeVision__Vegetation') === true
          && live.get('ValeVision__Vegetation').visible === true && btn('ValeVision__Vegetation').classList.contains(ACTIVE));
    check('SetCategoryVisibleByKey of a category not loaded answers false and changes nothing', tog.Na__ModelToggle__SetCategoryVisibleByKey('ValeVision__Nope', false) === false
          && [ ...live.values() ].every((g) => g.visible === true));
    check('SetCategoryVisibleByKey is an exact key, never a token ("Landscape" hides nothing)', tog.Na__ModelToggle__SetCategoryVisibleByKey('Landscape', false) === false
          && live.get('ValeVision__LandscapeEnvironment').visible === true);
    takeEvents();

    // BorrowRegistry / RestoreRegistry
    const phase = new Map([ [ 'ValeVision__MainBuildingModel__Existing', group('existing') ], [ 'ValeVision__LandscapeEnvironment', group('phase landscape') ] ]);
    phase.get('ValeVision__LandscapeEnvironment').visible = false;
    const before = tog.Na__ModelToggle__CaptureVisibilityMap();
    const token = tog.Na__ModelToggle__BorrowRegistry(phase);
    check('BorrowRegistry answers a token', !!token && typeof token === 'object');
    check('while borrowed the registry is the phase\'s categories', tog.Na__ModelToggle__GetCategoryKeys().join() === [ ...phase.keys() ].join());
    check('...captured from the phase groups\' own visibility', JSON.stringify(tog.Na__ModelToggle__CaptureVisibilityMap()) === JSON.stringify({ 'ValeVision__MainBuildingModel__Existing' : true, 'ValeVision__LandscapeEnvironment' : false }));
    tog.Na__ModelToggle__SetCategoryVisibleByKey('ValeVision__MainBuildingModel__Existing', false);
    tog.Na__ModelToggle__SetCategoryVisibleByKey('ValeVision__LandscapeEnvironment', true);
    check('the exact-key setter acts on the phase\'s groups', phase.get('ValeVision__MainBuildingModel__Existing').visible === false && phase.get('ValeVision__LandscapeEnvironment').visible === true);
    check('...and never on the 3D view\'s groups or dev buttons', [ ...live.values() ].every((g) => g.visible === true) && buttons.every((b) => b.classList.contains(ACTIVE)));
    tog.Na__ModelToggle__ApplySceneLayerVisibility({ 'ValeVision__LandscapeEnvironment' : false });
    check('ApplySceneLayerVisibility acts on the phase too, buttons untouched', phase.get('ValeVision__LandscapeEnvironment').visible === false && btn('ValeVision__LandscapeEnvironment').classList.contains(ACTIVE));
    takeEvents();
    const restored = tog.Na__ModelToggle__RestoreRegistry(token);
    check('RestoreRegistry hands the 3D view\'s registry back (true)', restored === true && tog.Na__ModelToggle__GetCategoryKeys().join() === [ ...live.keys() ].join());
    check('...exactly as it was before the borrow', JSON.stringify(tog.Na__ModelToggle__CaptureVisibilityMap()) === JSON.stringify(before));
    tog.Na__ModelToggle__SetCategoryVisibleByKey('ValeVision__Vegetation', false);
    check('after the restore the dev buttons follow again', !btn('ValeVision__Vegetation').classList.contains(ACTIVE));
    tog.Na__ModelToggle__SetCategoryVisibleByKey('ValeVision__Vegetation', true);
    check('RestoreRegistry(null) answers false', tog.Na__ModelToggle__RestoreRegistry(null) === false);

    // a 3D view rebuild DURING a borrow
    const token2 = tog.Na__ModelToggle__BorrowRegistry(phase);
    const rebuilt = new Map([ [ 'ValeVision__MainBuildingModel__Proposed', group('proposed v2') ] ]);
    tog.Na__UiFeature__InitializeModelToggleControls(rebuilt);
    check('a rebuild during a borrow never empties the lent map in place (a new map, not a cleared one)', token2.map.size === 3);
    check('RestoreRegistry after that rebuild answers false and keeps the rebuilt registry', tog.Na__ModelToggle__RestoreRegistry(token2) === false
          && tog.Na__ModelToggle__GetCategoryKeys().join() === 'ValeVision__MainBuildingModel__Proposed');
    tog.Na__ModelToggle__SetCategoryVisibleByKey('ValeVision__MainBuildingModel__Proposed', false);
    check('...whose dev buttons follow (the borrow flag was reset by the rebuild)', !page.naModelToggleList.children.find((b) => b.dataset.category === 'ValeVision__MainBuildingModel__Proposed').classList.contains(ACTIVE));

    // a map handed out in a borrow token is never emptied by a later rebuild (a new map, not a cleared one)
    const tokenA = tog.Na__ModelToggle__BorrowRegistry(new Map());
    const handedOut = tokenA.map;
    const sizeBefore = handedOut.size;
    check('a borrow and an immediate restore succeed (same generation)', tog.Na__ModelToggle__RestoreRegistry(tokenA) === true);
    tog.Na__UiFeature__InitializeModelToggleControls(new Map([ [ 'ValeVision__Vegetation', group('v') ], [ 'ValeVision__SiteBoundaries', group('b') ] ]));
    check('the next rebuild leaves the map a token was given untouched (BuildButtons replaces, never clears in place)', handedOut.size === sizeBefore
          && tog.Na__ModelToggle__GetCategoryKeys().length === 2, handedOut.size + ' vs ' + sizeBefore);

    // no dev UI on the page: the registry still works
    page = {};
    const bare = new Map([ [ 'ValeVision__Vegetation', group('bare vegetation') ] ]);
    tog.Na__UiFeature__InitializeModelToggleControls(bare);
    check('with no dev markup the categories still register and the exact-key setter works', tog.Na__ModelToggle__GetCategoryKeys().join() === 'ValeVision__Vegetation'
          && tog.Na__ModelToggle__SetCategoryVisibleByKey('ValeVision__Vegetation', false) === true && bare.get('ValeVision__Vegetation').visible === false);
}

// -----------------------------------------------------------------------------
// PHASE LIBRARY (never initialised)
// -----------------------------------------------------------------------------
if (target !== 'pre') {
    const lib = await import(BASE + PHAS_REL);
    const names = Object.keys(lib).sort();
    const MODELSOURCE = [ 'GetGroups', 'HasGroup', 'GetLabel', 'GetDefaultId', 'IsLive', 'GetStatus', 'GetMessage', 'GetCategoryKeys', 'Ensure', 'SetCacheLimit' ];
    const SNAPSHOT    = [ 'CHANGED_EVENT', 'IsLive', 'GetReadyEntry', 'Pin', 'Unpin' ];
    check('PhaseLibrary links against ValeVision\'s MultiModel and exports TrueVision\'s 23 names', names.length === 23, names.length + ' ' + names.join());
    check('...every name Model Source imports', MODELSOURCE.every((n) => names.includes('Na__PhaseLib__' + n)));
    check('...every name the snapshot renderer imports', SNAPSHOT.every((n) => names.includes('Na__PhaseLib__' + n)));
    takeEvents();
    check('uninitialised: IsLive(undefined) is true (DR-09 (a))', lib.Na__PhaseLib__IsLive(undefined) === true && lib.Na__PhaseLib__IsLive(null) === true);
    check('uninitialised: no groups, no default, no live id, nothing to choose', lib.Na__PhaseLib__GetGroups().length === 0 && lib.Na__PhaseLib__GetDefaultId() === null
          && lib.Na__PhaseLib__GetLiveId() === null && lib.Na__PhaseLib__HasGroup('Scheme-01') === false);
    check('uninitialised: a named phase is never live and has no ready entry', lib.Na__PhaseLib__IsLive('Scheme-01') === false && lib.Na__PhaseLib__GetReadyEntry('Scheme-01') === null
          && lib.Na__PhaseLib__Pin('Scheme-01') === null);
    check('uninitialised: GetStatus of no id is "loading" (read only for a phase with a renderId)', lib.Na__PhaseLib__GetStatus(undefined) === 'loading');
    check('uninitialised: GetStatus of a named phase is "unloaded"', lib.Na__PhaseLib__GetStatus('Scheme-01') === 'unloaded');
    check('uninitialised: GetCategoryKeys of a named phase is empty, of the live model empty too', lib.Na__PhaseLib__GetCategoryKeys('Scheme-01').length === 0 && lib.Na__PhaseLib__GetCategoryKeys(undefined).length === 0);
    const ensured = await Promise.race([ lib.Na__PhaseLib__Ensure('Scheme-01'), new Promise((r) => setTimeout(() => r('timeout'), 200)) ]);
    check('uninitialised: Ensure of a named phase resolves false at once', ensured === false, String(ensured));
    const ensuredLive = await Promise.race([ lib.Na__PhaseLib__Ensure(null), new Promise((r) => setTimeout(() => r('timeout'), 200)) ]);
    check('uninitialised: Ensure(null) waits for a live model nobody reports (documented: callers use Na__LeSource__WaitFor)', ensuredLive === 'timeout', String(ensuredLive));
    check('uninitialised: nothing was dispatched by the reads (only SetGroups/SetLive/loads announce)', takeEvents().filter((e) => e.type === lib.Na__PhaseLib__CHANGED_EVENT).length === 0);
    check('SetCacheLimit refuses nonsense and takes a limit', lib.Na__PhaseLib__SetCacheLimit(0) === false && lib.Na__PhaseLib__SetCacheLimit(3) === true);
    // If ValeVision ever registered groups (it does not): the library reads ValeVision's loader through the real MultiModel
    lib.Na__PhaseLib__SetGroups([ { groupId : 'Existing', label : 'Existing building', modelUrls : [] },
                                  { groupId : 'Scheme-01', label : 'Scheme 01', modelUrls : [ 'https://cdn.test/26__ValeVision__MainBuildingModel__Proposed__MeshModel__.glb' ] } ], 1);
    check('(not done in ValeVision) SetGroups registers, the default skips "existing"', lib.Na__PhaseLib__GetDefaultId() === 'Scheme-01' && lib.Na__PhaseLib__GetGroups().length === 2);
    check('(not done in ValeVision) GetCategoryKeys of a phase is read by ValeVision\'s real MultiModel classifier', Array.isArray(lib.Na__PhaseLib__GetCategoryKeys('Existing')));
}

// -----------------------------------------------------------------------------
// INTERACTIVE OVERLAYS (the module on its own)
// -----------------------------------------------------------------------------
if (target !== 'pre') {
    const ov = await import(BASE + IOVL_REL);
    check('InteractiveOverlays exports TrueVision\'s six names', Object.keys(ov).sort().join() === [ 'Na__InteractiveOverlays__BeginFrame', 'Na__InteractiveOverlays__EndFrame',
          'Na__InteractiveOverlays__IsWanted', 'Na__InteractiveOverlays__Register', 'Na__InteractiveOverlays__SetWanted', 'Na__InteractiveOverlays__Unregister' ].join());
    ov.Na__InteractiveOverlays__BeginFrame(); ov.Na__InteractiveOverlays__EndFrame();
    check('Begin and End with nothing registered touch nothing and do not throw', true);
    check('Register / SetWanted / Unregister refuse a missing object', ov.Na__InteractiveOverlays__Register(null) === false && ov.Na__InteractiveOverlays__SetWanted(null, true) === false
          && ov.Na__InteractiveOverlays__Unregister(null) === false && ov.Na__InteractiveOverlays__IsWanted(null) === false);
    const g = group('overlay'); g.userData.naOverlayWanted = true;
    ov.Na__InteractiveOverlays__Register(g);
    check('a group registered already wanted is still invisible outside a frame', g.visible === false && ov.Na__InteractiveOverlays__IsWanted(g) === true);
    ov.Na__InteractiveOverlays__BeginFrame();
    check('...visible inside a frame', g.visible === true);
    ov.Na__InteractiveOverlays__SetWanted(g, false);
    check('SetWanted(false) inside a frame hides it at once', g.visible === false);
    ov.Na__InteractiveOverlays__SetWanted(g, true);
    check('SetWanted(true) inside a frame shows it at once', g.visible === true);
    ov.Na__InteractiveOverlays__EndFrame();
    check('EndFrame hides it', g.visible === false);
    const late = group('late');
    ov.Na__InteractiveOverlays__BeginFrame();
    ov.Na__InteractiveOverlays__Register(late);
    check('registered during a frame and not wanted: invisible', late.visible === false);
    ov.Na__InteractiveOverlays__EndFrame();
}

rmSync(tmp, { recursive : true, force : true });
out('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
