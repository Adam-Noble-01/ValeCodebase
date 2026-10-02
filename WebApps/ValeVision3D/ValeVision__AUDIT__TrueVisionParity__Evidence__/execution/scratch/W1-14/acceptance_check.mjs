// =============================================================================
// W1-14 scratch acceptance harness (not shipped; lives in execution/scratch/W1-14)
// =============================================================================
// 1. EXPORTS: each of the six VV files exports exactly the names its TrueVision source (pin b2aa9151,
//    scratch/W1-14/tv) exports - loaded both, imports stubbed the way TrueVision's tests load modules.
// 2. INERT ON IMPORT: importing all six VV modules reads no storage, touches no DOM class, adds no
//    listener and dispatches no event (they are leaves nothing in ValeVision imports yet).
// 3. OFF WITH NO UI: Ortho, Drawing Grid show/snap and Draft report off on a browser that has never
//    switched them (empty storage) and on one whose storage throws (private mode); Shift alone still
//    holds the axis (Resolve), and a grid snap leaves a point where it is.
// 4. VECTOR QUALITY: nothing is held until a caller asks; the default level is the config's medium.
// Exit 0 = all checks pass.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const TV   = join(HERE, 'tv');
const VV   = resolve(HERE, '..', '..', '..', '..');                            // <-- the ValeVision3D app root
const LE   = '02__Src__AppModules/51__System__LayoutEditor/';
const FILES = [
    LE + '20__System__Viewports/Na__LayoutEditor__ViewportRotation__.js',
    LE + '37__System__VectorTools/Na__LayoutEditor__VectorTools__Curves__.js',
    LE + '26__System__DraftMode/Na__LayoutEditor__DraftMode__State__.js',
    LE + '27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__State__.js',
    LE + '32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js',
    LE + '20__System__Viewports/Na__LayoutEditor__VectorQuality__.js'
];

// A counting browser
const calls = { storageGet : 0, storageSet : 0, classList : 0, listen : 0, dispatch : 0 };
let storageMode = 'empty';                                                      // <-- 'empty' | 'throws'
const storage = {
    getItem    : (k) => { calls.storageGet++; if (storageMode === 'throws') throw new Error('private mode'); return null; },
    setItem    : () => { calls.storageSet++; if (storageMode === 'throws') throw new Error('private mode'); },
    removeItem : () => {}
};
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
globalThis.window = {
    addEventListener    : () => { calls.listen++; },
    removeEventListener : () => {},
    dispatchEvent       : () => { calls.dispatch++; return true; },
    localStorage        : storage,
    setTimeout, clearTimeout
};
const bodyClasses = new Set();
globalThis.document = { body : { classList : {
    add      : (c) => { calls.classList++; bodyClasses.add(c); },
    remove   : (c) => { calls.classList++; bodyClasses.delete(c); },
    toggle   : (c, on) => { calls.classList++; if (on) bodyClasses.add(c); else bodyClasses.delete(c); return !!on; },
    contains : (c) => bodyClasses.has(c)
} } };

// TrueVision's test loader: strip imports, stub the names
const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
let n = 0;
async function load(path, stubs) {
    let src = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    const names = [];
    let m;
    IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) {
        const list = m[1].trim();
        if (list.charAt(0) !== '{') continue;
        list.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
    }
    src = src.replace(IMPORT, '');
    const key = '__W114Stubs' + (++n);
    globalThis[key] = stubs || {};
    const head = names.map((x) => 'const ' + x + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + x + '") ? globalThis.' + key + '["' + x + '"] : function () { return undefined; };').join('\n');
    const tmp = join(tmpdir(), 'W1-14__acceptance__' + n + '__.mjs');
    writeFileSync(tmp, head + '\n' + src, 'utf8');
    return { mod : await import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2)), imports : names };
}

let failures = 0;
function check(name, got, want) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failures++;
    console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok ? '' : '\n        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want)));
}

const vqStubs = { Na__LeCfg__GetVectorQualitySetup : () => ({ defaultLevel : 'medium', releaseAfterMs : 1200 }) };   // <-- VV AppConfig values (W0-15)

console.log('\nW1-14 acceptance\n\n  1. Exports: VV = TrueVision (pin b2aa9151)');
for (const rel of FILES) {
    const stubs = rel.endsWith('VectorQuality__.js') ? vqStubs : {};
    const tv = await load(join(TV, rel), stubs);
    const vv = await load(join(VV, rel), stubs);
    check(rel.split('/').pop() + ': ' + Object.keys(vv.mod).length + ' exports, imports [' + vv.imports.join(', ') + ']',
        [ Object.keys(vv.mod).sort(), vv.imports ], [ Object.keys(tv.mod).sort(), tv.imports ]);
}

console.log('\n  2. Inert on import (all six VV modules, fresh)');
Object.keys(calls).forEach((k) => { calls[k] = 0; });
const VVmods = {};
for (const rel of FILES) VVmods[rel.split('/').pop()] = (await load(join(VV, rel), rel.endsWith('VectorQuality__.js') ? vqStubs : {})).mod;
check('no storage read or write, no body class, no listener, no event', calls, { storageGet : 0, storageSet : 0, classList : 0, listen : 0, dispatch : 0 });

console.log('\n  3. Off with no UI present (a browser that never switched them)');
const Ortho = VVmods['Na__LayoutEditor__OrthoMode__State__.js'];
const Grid  = VVmods['Na__LayoutEditor__DrawingGrid__State__.js'];
const Draft = VVmods['Na__LayoutEditor__DraftMode__State__.js'];
check('Ortho is off', Ortho.Na__LeOrtho__IsOn(), false);
check('so only a held Shift holds the axis, as it always has', [ Ortho.Na__LeOrtho__Resolve(false), Ortho.Na__LeOrtho__Resolve(true) ], [ false, true ]);
check('Grid Snap is off and the grid is not shown', [ Grid.Na__LeGrid__IsSnapping(), Grid.Na__LeGrid__IsShowing() ], [ false, false ]);
check('a grid snap leaves a point where it is (a new object)', (() => { const p = { x : 12.345, y : 67.891 }; const s = Grid.Na__LeGrid__SnapPoint(p); return [ s, s !== p ]; })(), [ { x : 12.345, y : 67.891 }, true ]);
check('Draft is off', Draft.Na__LeDraft__IsOn(), false);
check('reading them wrote nothing, announced nothing and drew nothing', [ calls.storageSet, calls.dispatch, calls.classList ], [ 0, 0, 0 ]);

storageMode = 'throws';
const Ortho2 = (await load(join(VV, FILES[4]), {})).mod;
const Grid2  = (await load(join(VV, FILES[3]), {})).mod;
check('private mode (storage throws): Ortho off, Grid Snap off, grid hidden', [ Ortho2.Na__LeOrtho__IsOn(), Grid2.Na__LeGrid__IsSnapping(), Grid2.Na__LeGrid__IsShowing() ], [ false, false, false ]);
storageMode = 'empty';

console.log('\n  4. Vector quality, unwired');
const VQ = VVmods['Na__LayoutEditor__VectorQuality__.js'];
check('nothing is held until a caller asks', VQ.Na__LeVectorQ__IsHeld(), false);
check('the level reads the config default, medium', VQ.Na__LeVectorQ__Get(), 'medium');
check('and reading it took no hold and sent no event', [ VQ.Na__LeVectorQ__IsHeld(), calls.dispatch ], [ false, 0 ]);

console.log('');
if (failures) { console.log(failures + ' check(s) FAILED.'); process.exit(1); }
console.log('Every check passed.');
