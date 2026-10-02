// =============================================================================
// SCRATCH (W1-04) - IS TRUEVISION'S ReturnToOrbit THE SAME EXIT AS VALEVISION'S SetOrbitMode?
// =============================================================================
//
// The plan listed "Na__NavToolbar__SetOrbitMode is the exit" as a ValeVision seam for
// Na__DrawView__Transitions__ReturnToOrbit. This harness checks, on ValeVision's own code,
// that TrueVision's ReturnToOrbit body (now in ValeVision's ported file) makes exactly the
// calls ValeVision's Orbit exit makes:
//
//   PATH A - Na__NavToolbar__SetOrbitMode() from ValeVision's REAL toolbar module, wired
//            (as index.html wires it) to index.html's REAL walk / fly wrappers, whose source
//            is cut out of index.html itself.
//   PATH B - Na__DrawView__Transitions__ReturnToOrbit() from ValeVision's REAL ported
//            Transitions module, its imports bound to the same recorders and to the REAL
//            toolbar's SetActiveMode.
//
// Both paths reach one pair of recording ToggleWalkMode / ToggleFlyMode stand-ins (the
// real ones need a renderer and a camera). For Walk, Fly and neither active, the recorded
// call sequence, the final modes, the toolbar's active mode and the events it dispatched
// must be identical. Reads ValeVision's files; writes only to the OS temp folder.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const VV  = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const SRC = VV + '/02__Src__AppModules';

// A browser just big enough: no toolbar DOM (getElementById -> null), events recorded.
const events = [];
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
globalThis.window   = { dispatchEvent : (e) => { events.push(e.type + ':' + JSON.stringify(e.detail)); return true; }, addEventListener : () => {} };
globalThis.document = { getElementById : () => null, body : { classList : { add() {}, remove() {}, toggle() {} } } };

// The shared world both paths act on
const W = globalThis.__W = { walk : false, fly : false, calls : [] };
globalThis.__ToggleWalk = (onA, onD) => { W.calls.push('ToggleWalkMode(' + (onA ? 'fn' : 'null') + ',' + (onD ? 'fn' : 'null') + ')'); if (W.walk) { W.walk = false; if (onD) onD(); } else { W.walk = true; if (onA) onA(); } };
globalThis.__ToggleFly  = (onA, onD) => { W.calls.push('ToggleFlyMode('  + (onA ? 'fn' : 'null') + ',' + (onD ? 'fn' : 'null') + ')'); if (W.fly)  { W.fly  = false; if (onD) onD(); } else { W.fly  = true; if (onA) onA(); } };

const IMPORT_RE = /^[ \t]*import\s+(?:\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
async function load(file, stubs, tag) {
    let src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    src = src.replace(IMPORT_RE, '');
    if (/^\s*import\s/m.test(src)) throw new Error('an import survived in ' + file);
    const tmp = join(tmpdir(), 'W1-04__equivalence__' + tag + '.mjs');
    writeFileSync(tmp, stubs + '\n' + src, 'utf8');
    return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
}

// ValeVision's REAL toolbar
const Toolbar = await load(SRC + '/10__NavigationAndCameras/Na__UiFeature__NavigationToolbar__Controls.js',
    'function Na__CameraStartState__ResetView() {}', 'Toolbar');
globalThis.__Toolbar = Toolbar;

// index.html's REAL walk / fly wrappers, cut out of index.html
const page  = readFileSync(VV + '/index.html', 'utf8').replace(/\r\n/g, '\n');
const start = page.indexOf('    function Na__UiFeature__WalkMode__ToggleFn(hint) {');
const end   = page.indexOf('    // ------------------------------------------------------------', page.indexOf('    function Na__UiFeature__FlyMode__ToggleFn(hint) {'));
if (start < 0 || end < 0) throw new Error('wrappers not found in index.html');
const wrapperSrc = [
    'const Na__WalkMode__IsActive = () => globalThis.__W.walk;',
    'const Na__FlyMode__IsActive  = () => globalThis.__W.fly;',
    'const Na__UiFeature__ToggleWalkMode = (...a) => globalThis.__ToggleWalk(...a);',
    'const Na__UiFeature__ToggleFlyMode  = (...a) => globalThis.__ToggleFly(...a);',
    'const Na__NavToolbar__SetActiveMode = (m) => globalThis.__Toolbar.Na__NavToolbar__SetActiveMode(m);',
    page.slice(start, end),
    'export { Na__UiFeature__WalkMode__ToggleFn, Na__UiFeature__FlyMode__ToggleFn };'
].join('\n');
const wrapTmp = join(tmpdir(), 'W1-04__equivalence__Wrappers.mjs');
writeFileSync(wrapTmp, wrapperSrc, 'utf8');
const Wrappers = await import(pathToFileURL(wrapTmp).href + '?v=' + Math.random().toString(36).slice(2));

// Wire the toolbar as index.html does
Toolbar.Na__UiFeature__InitializeNavigationToolbar({
    walkEnabled : true, flyEnabled : true,
    toggleWalk  : Wrappers.Na__UiFeature__WalkMode__ToggleFn,
    toggleFly   : Wrappers.Na__UiFeature__FlyMode__ToggleFn,
    openHelp    : () => {}
});

// ValeVision's REAL ported Transitions
const Transitions = await load(SRC + '/40__System__DrawingViewCore/Na__DrawView__Transitions__.js', [
    'function Na__DistanceCulling__SetEnabled() {}',
    'function Na__DistanceCulling__IsEnabled() { return false; }',
    'const Na__WalkMode__IsActive = () => globalThis.__W.walk;',
    'const Na__FlyMode__IsActive  = () => globalThis.__W.fly;',
    'const Na__NavToolbar__SetActiveMode = (m) => globalThis.__Toolbar.Na__NavToolbar__SetActiveMode(m);',
    'const Na__UiFeature__ToggleWalkMode = (...a) => globalThis.__ToggleWalk(...a);',
    'const Na__UiFeature__ToggleFlyMode  = (...a) => globalThis.__ToggleFly(...a);',
    'function Na__PresentationMode__Camera__AnimateToScene() {}',
    'function Na__PresentationMode__Camera__CancelCurrentTransition() {}',
    'function Na__PresentationMode__UI__AddSceneNavigationRouter() {}'
].join('\n'), 'Transitions');

function run(path, state) {
    Toolbar.Na__NavToolbar__SetActiveMode(state.walk ? 'walk' : state.fly ? 'fly' : 'orbit');
    Object.assign(W, { walk : !!state.walk, fly : !!state.fly, calls : [] });
    events.length = 0;
    if (path === 'A') Toolbar.Na__NavToolbar__SetOrbitMode();
    else              Transitions.Na__DrawView__Transitions__ReturnToOrbit();
    return { calls : W.calls.slice(), walk : W.walk, fly : W.fly, toolbar : Toolbar.Na__NavToolbar__GetActiveMode(), events : events.slice() };
}

let failures = 0;
for (const [label, state] of [ [ 'walking', { walk : true } ], [ 'flying', { fly : true } ], [ 'in orbit', {} ] ]) {
    const a = run('A', state);
    const b = run('B', state);
    const same = JSON.stringify(a) === JSON.stringify(b);
    if (!same) failures++;
    console.log((same ? '  PASS  ' : '  FAIL  ') + label + ': SetOrbitMode and ReturnToOrbit make the same calls');
    console.log('        A ' + JSON.stringify(a));
    if (!same) console.log('        B ' + JSON.stringify(b));
}
const suspend = (() => { Object.assign(W, { walk : true, fly : false, calls : [] }); Toolbar.Na__NavToolbar__SetActiveMode('walk'); Transitions.Na__DrawView__Transitions__SuspendThreeD({ returnToOrbit : true }); const r = { walk : W.walk, toolbar : Toolbar.Na__NavToolbar__GetActiveMode() }; Transitions.Na__DrawView__Transitions__ResumeThreeD(); return r; })();
const okSuspend = suspend.walk === false && suspend.toolbar === 'orbit';
if (!okSuspend) failures++;
console.log((okSuspend ? '  PASS  ' : '  FAIL  ') + 'SuspendThreeD({ returnToOrbit : true }) through the real toolbar: ' + JSON.stringify(suspend));
const bare = (() => { Object.assign(W, { walk : true, fly : false, calls : [] }); Toolbar.Na__NavToolbar__SetActiveMode('walk'); Transitions.Na__DrawView__Transitions__SuspendThreeD(); const r = { walk : W.walk, toolbar : Toolbar.Na__NavToolbar__GetActiveMode(), calls : W.calls.slice() }; Transitions.Na__DrawView__Transitions__ResumeThreeD(); return r; })();
const okBare = bare.walk === true && bare.toolbar === 'walk' && bare.calls.length === 0;
if (!okBare) failures++;
console.log((okBare ? '  PASS  ' : '  FAIL  ') + 'bare SuspendThreeD() (a picture render) keeps Walk and the toolbar: ' + JSON.stringify(bare));

console.log(failures ? '\n  ' + failures + ' check(s) FAILED' : '\n  Every check passed.');
process.exit(failures ? 1 : 0);
