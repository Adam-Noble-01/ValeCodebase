// W2-27 scratch acceptance harness (not shipped).
// 1. Export and import lists of the five VV modules equal TrueVision's (pin copies in scratch/W2-27/tv).
// 2. Importing all five fresh with no browser does nothing (no window: nothing read, nothing sent).
// 3. Importing them under a browser stand-in: State reads no storage until asked, adds no listener and sends no event;
//    Setup asks for its config from its own URL (the VV file), resolves, hands the defaults to State, and its labels
//    read the VV config's words; with the config missing it still resolves and the built-in words stand, printing
//    the [ValeVision3D LayoutEditor] prefix.
// 4. Boolean (VV file over VV's vendored clipper2-js) gives exactly TrueVision's answers on the shapes of its own
//    test (three walls round a stair, a frame, a cut across, circles).
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const HERE   = dirname(fileURLToPath(import.meta.url));
const VVROOT = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const REL    = '02__Src__AppModules/51__System__LayoutEditor/37__System__VectorTools';
const SRC    = { vv : resolve(VVROOT, REL), tv : resolve(HERE, 'tv', REL) };
const CLIP   = { vv : resolve(VVROOT, '04__Lib__ThirdParty__VersionLocked/03__Vendor__Clipper2Js__v0.9.0/fesm2020/clipper2-js.mjs'),
                 tv : resolve(HERE, 'tv', 'clipper2-js.mjs') };
const NAMES  = [ 'State', 'Setup', 'Geometry', 'Offset', 'Boolean', 'Curves' ].map((n) => 'Na__LayoutEditor__VectorTools__' + n + '__');

let passed = 0, failed = 0;
function check(name, ok, detail) {
    if (ok) { passed++; console.log('  ok    ' + name); return; }
    failed++; console.error('  FAIL  ' + name + (detail !== undefined ? '  -> ' + JSON.stringify(detail).slice(0, 400) : ''));
}

// Copy one app's folder to a fresh temp dir as .mjs (siblings and the Clipper2 path rewritten; no code touched)
function stage(app, tag) {
    const dir = mkdtempSync(join(tmpdir(), 'na-w2-27-' + app + '-' + tag + '-'));
    NAMES.forEach((name) => {
        let s = readFileSync(resolve(SRC[app], name + '.js'), 'utf8')
            .replace(/(from\s+'\.\/Na__LayoutEditor__VectorTools__[A-Za-z]+__)\.js'/g, "$1.mjs'")
            .replace(/from\s+'\.\.\/\.\.\/\.\.\/04__Lib__ThirdParty__VersionLocked\/03__Vendor__Clipper2Js__v0\.9\.0\/fesm2020\/clipper2-js\.mjs'/,
                     "from '" + pathToFileURL(CLIP[app]).href + "'");
        writeFileSync(join(dir, name + '.mjs'), s, 'utf8');
    });
    return dir;
}
const load = (dir, name) => import(pathToFileURL(join(dir, name + '.mjs')).href);
function importsOf(text) {
    return [...text.matchAll(/^\s*import\s*\{([^}]*)\}\s*from\s*'([^']+)'/gm)].map((m) => m[1].split(',').map((x) => x.trim()).filter(Boolean).sort().join(',') + ' <- ' + m[2].split('/').pop());
}

// ---- 1. exports and imports
console.log('\n1. Export and import lists against TrueVision');
const plain = { vv : stage('vv', 'plain'), tv : stage('tv', 'plain') };
for (const name of NAMES.slice(0, 5)) {
    const a = Object.keys(await load(plain.vv, name)).sort();
    const b = Object.keys(await load(plain.tv, name)).sort();
    check(name + ': ' + a.length + ' exports, identical to TrueVision', JSON.stringify(a) === JSON.stringify(b), { vv : a, tv : b });
    const ia = importsOf(readFileSync(resolve(SRC.vv, name + '.js'), 'utf8'));
    const ib = importsOf(readFileSync(resolve(SRC.tv, name + '.js'), 'utf8'));
    check(name + ': imports identical (' + (ia.join(' | ') || 'none') + ')', JSON.stringify(ia) === JSON.stringify(ib), { vv : ia, tv : ib });
}
const cfgVv = JSON.parse(readFileSync(resolve(SRC.vv, 'Na__LayoutEditor__VectorTools__Config__.json'), 'utf8'));
const cfgTv = JSON.parse(readFileSync(resolve(SRC.tv, 'Na__LayoutEditor__VectorTools__Config__.json'), 'utf8'));
const cfgVvLess = JSON.parse(JSON.stringify(cfgVv)); delete cfgVvLess.LayoutEditor__VectorTools__Meta.Meta__PortedFrom;
check('config: identical to TrueVision but for Meta__PortedFrom', JSON.stringify(cfgVvLess) === JSON.stringify(cfgTv));

// ---- 2. no browser: importing does nothing (plain imports above ran with no window, no fetch call possible)
console.log('\n2. Imports with no browser');
check('no window existed while the five loaded (Setup skips its fetch)', typeof globalThis.window === 'undefined');

// ---- 3. a browser stand-in
console.log('\n3. Under a browser stand-in');
const log = { get : [], set : [], events : [], listeners : 0, fetches : [], warns : [] };
const store = new Map();
let serve = 'vv';
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
globalThis.window = {
    localStorage : { getItem : (k) => { log.get.push(k); return store.has(k) ? store.get(k) : null; }, setItem : (k, v) => { log.set.push(k); store.set(k, String(v)); } },
    dispatchEvent : (e) => { log.events.push(e.type); return true; },
    addEventListener : () => { log.listeners++; }
};
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
    log.fetches.push(String(url));
    if (serve === 'missing') return { ok : false, status : 404, json : async () => ({}) };
    return { ok : true, status : 200, json : async () => JSON.parse(readFileSync(resolve(SRC.vv, 'Na__LayoutEditor__VectorTools__Config__.json'), 'utf8')) };
};
const realWarn = console.warn;
console.warn = (...args) => { log.warns.push(args.map(String).join(' ')); };

// State alone first: importing it touches nothing
const browserDir = stage('vv', 'browser');
const S = await load(browserDir, NAMES[0]);
check('State import: no storage read, no write, no event, no listener', log.get.length === 0 && log.set.length === 0 && log.events.length === 0 && log.listeners === 0, log);
// Setup: asks once, from its own URL beside it (the VV config file name)
const C = await load(browserDir, NAMES[1]);
await C.Na__LeVecCfg__Ready();
check('Setup asked for its config once, by its own name', log.fetches.length === 1 && /Na__LayoutEditor__VectorTools__Config__\.json$/.test(log.fetches[0]), log.fetches);
check('Setup: the config\'s panel title is read', C.Na__LeVecCfg__Label('PanelTitle', 'x') === cfgVv.LayoutEditor__VectorTools__Labels.Labels__PanelTitle);
check('Setup: a behaviour number is read', C.Na__LeVecCfg__Value('Behaviour', 'MinCircleSegments', -1) === 24);
check('State took the defaults (arc mode twoPoint, sizes 100)', S.Na__LeVec__GetSetting('arcMode') === 'twoPoint' && S.Na__LeVec__GetSetting('offsetDistance') === 100);
check('loading wrote nothing and sent no event (reads only)', log.set.length === 0 && log.events.length === 0, log);
check('no warning while the config is there', log.warns.length === 0, log.warns);
// A browser whose config cannot be read: still resolves, built-in words stand, the prefix is VV's
serve = 'missing';
const missingDir = stage('vv', 'missing');
const C2 = await load(missingDir, NAMES[1]);
const got = await C2.Na__LeVecCfg__Ready();
check('config missing: Ready resolves (null) and the fallback stands', got === null && C2.Na__LeVecCfg__Label('PanelTitle', 'fallback') === 'fallback');
check('config missing: one warning, [ValeVision3D LayoutEditor] prefix', log.warns.length === 1 && log.warns[0].startsWith('[ValeVision3D LayoutEditor] Vector tools config unavailable'), log.warns);
console.warn = realWarn;
delete globalThis.window;
globalThis.fetch = realFetch;

// ---- 4. Boolean: VV over VV's Clipper2 equals TV over TV's
console.log('\n4. Boolean answers against TrueVision');
const BV = await load(plain.vv, NAMES[4]);
const BT = await load(plain.tv, NAMES[4]);
const rect = (x0, y0, x1, y1) => ({ rings : [ [ [ x0, y0 ], [ x1, y0 ], [ x1, y1 ], [ x0, y1 ] ] ] });
const circle = (cx, cy, r, n) => ({ rings : [ Array.from({ length : n }, (_, i) => [ cx + r * Math.cos(2 * Math.PI * i / n), cy + r * Math.sin(2 * Math.PI * i / n) ]) ] });
const walls = [ rect(0, 0, 100, 10), rect(90, 10, 100, 80), rect(0, 10, 10, 80) ];
const frame = [ rect(0, 0, 100, 100), rect(20, 20, 80, 80) ];
const cases = [
    [ 'Union of three walls that share edges', (B) => B.Na__LeVecBool__Union(walls) ],
    [ 'Subtract: a frame (room as a hole)', (B) => B.Na__LeVecBool__Subtract(frame[0], [ frame[1] ]) ],
    [ 'Intersect of two circles', (B) => B.Na__LeVecBool__Intersect([ circle(0, 0, 50, 48), circle(40, 0, 50, 48) ]) ],
    [ 'Divide of a cut across', (B) => B.Na__LeVecBool__Divide([ rect(0, 0, 100, 50), rect(40, -10, 60, 60) ]) ],
    [ 'OuterShell of a frame', (B) => B.Na__LeVecBool__OuterShell([ { rings : [ frame[0].rings[0], frame[1].rings[0] ] } ]) ],
    [ 'Overlaps', (B) => [ B.Na__LeVecBool__Overlaps(rect(0, 0, 10, 10), rect(5, 5, 15, 15)), B.Na__LeVecBool__Overlaps(rect(0, 0, 10, 10), rect(20, 20, 30, 30)) ] ]
];
for (const [ name, run ] of cases) {
    let a, b, err = null;
    try { a = run(BV); b = run(BT); } catch (e) { err = String(e && e.stack || e); }
    check(name + ' - identical to TrueVision', !err && JSON.stringify(a) === JSON.stringify(b), err || { vv : a, tv : b });
}
const u = BV.Na__LeVecBool__Union(walls);
check('the three walls unite into ONE piece (TV v2.150.0\'s own trap)', Array.isArray(u) && u.length === 1, u);
const f = BV.Na__LeVecBool__Subtract(frame[0], [ frame[1] ]);
check('the frame keeps its room as a hole, area 10000 - 3600', Array.isArray(f) && f.length === 1 && Math.abs(BV.Na__LeVecBool__Area(f[0]) - 6400) < 1e-6, f);

console.log('\nW2-27 acceptance: ' + passed + ' passed, ' + failed + ' failed.');
process.exit(failed ? 1 : 0);
