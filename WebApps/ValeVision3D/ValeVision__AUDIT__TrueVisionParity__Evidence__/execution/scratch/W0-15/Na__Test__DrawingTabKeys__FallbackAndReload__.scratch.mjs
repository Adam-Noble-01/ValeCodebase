// =============================================================================
// W0-15 SCRATCH COPY - TrueVision's Na__Test__DrawingTabKeys__.test.mjs (1.0.0,
// read at b2aa9151): the two sections W0-15 owes ("The Fallback Resolves Every
// Key as the Shipped File Does" and "Reading the Key File Again"). The whole
// file lands with W1-36; its focus, sheet-keyboard and press sections need
// KeyScope (W1-29), SheetTools Keyboard 1.18.0 and Controls__Pc 1.4.0.
//
// Usage: node Na__Test__DrawingTabKeys__FallbackAndReload__.scratch.mjs [<config folder>]
//   <config folder> defaults to the live VV 03__Core__Config folder; the KeyMap
//   unit and Na__Hotkeys__DrawingTabs__.json are both read from it.
// Changes from TrueVision's file: only the folder the two files are read from,
// and the sections after ReloadKeyMap are left out. The check bodies are verbatim.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const DIR = resolve(process.argv[2] || 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D\\02__Src__AppModules\\51__System__LayoutEditor\\03__Core__Config');
const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
let loadCount = 0;
async function load(file, stubs) {
    let src = readFileSync(resolve(DIR, file), 'utf8').replace(/\r\n/g, '\n');
    const names = [];
    let m;
    IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) {
        const list = m[1].trim();
        if (list.charAt(0) !== '{') continue;
        list.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
    }
    const had = /^\s*import\s/m.test(src);
    src = src.replace(IMPORT, '');
    if (had && /^\s*import\s/m.test(src)) { console.error('FAIL: an import survived in ' + file); process.exit(1); }
    const key = '__DtkStubs' + (++loadCount);
    globalThis[key] = stubs || {};
    const head = names.map((n) =>
        'const ' + n + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + n + '") ? globalThis.' + key + '["' + n + '"] : function () { return undefined; };'
    ).join('\n');
    const tmp = join(tmpdir(), 'W0-15__DrawingTabKeys__' + loadCount + '__.mjs');
    writeFileSync(tmp, head + '\n' + src, 'utf8');
    return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
}
const SHIPPED = JSON.parse(readFileSync(resolve(DIR, 'Na__Hotkeys__DrawingTabs__.json'), 'utf8'));

let failures = 0;
function check(name, got, want) {
    const passed = JSON.stringify(got) === JSON.stringify(want);
    if (!passed) failures++;
    console.log((passed ? '  PASS  ' : '  FAIL  ') + name);
    if (!passed) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
}
console.log('ValeVision3D - the drawing tabs\' keys: the fallback and the re-read (' + DIR + ')');

// REGION | The Fallback Resolves Every Key as the Shipped File Does (verbatim)
console.log('\n  The built-in key map against the shipped file');
const KeyMap = await load('Na__LayoutEditor__ConfigState__KeyMap__.js', { Na__LeCfg__PREFIX : 'LayoutEditor__' });
const list = (block) => (SHIPPED['LayoutEditor__' + block + '__Config'] || {})['LayoutEditor__' + block + '__List'] || [];
const MODS = [ 'Ctrl', 'Shift', 'Alt', 'Meta', 'Space' ];
const held = (names) => { const h = {}; MODS.forEach((n) => { h[n] = names.indexOf(n) !== -1; }); return h; };
const COMBOS = [ [], [ 'Shift' ], [ 'Ctrl' ], [ 'Ctrl', 'Shift' ], [ 'Alt' ] ];
const presses = [];
list('KeyboardBindings').forEach((b) => (b.Keys || []).forEach((k) => {
    presses.push([ k, b.Modifiers || [] ]);
    COMBOS.forEach((c) => presses.push([ k, c ]));
}));
const resolveAll = () => presses.map(([ k, c ]) => {
    const m = KeyMap.Na__LeCfg__MatchKeyBinding(k, held(c));
    return (m ? m.action + (m.coarse ? '+coarse' : '') : '-') ;
});
const buttons = [ 'Left', 'Middle', 'Right' ];
const resolvePointer = () => {
    const out = [];
    buttons.forEach((button) => COMBOS.concat([ [ 'Space' ] ]).forEach((c) => [ true, false ].forEach((emptyStage) => out.push(KeyMap.Na__LeCfg__MatchPointerBinding({ button, modifiers : held(c), emptyStage })))));
    return out;
};
const resolveRest = () => ({
    wheel     : COMBOS.map((c) => KeyMap.Na__LeCfg__MatchWheelBinding(held(c))),
    selection : COMBOS.concat([ [ 'Alt', 'Shift' ] ]).map((c) => KeyMap.Na__LeCfg__MatchSelectionModifier(held(c))),
    guards    : KeyMap.Na__LeCfg__GetGuards(),
    keyboard  : KeyMap.Na__LeCfg__GetKeyboardSetup(),
    touch     : KeyMap.Na__LeCfg__GetTouchSetup(),
    measure   : KeyMap.Na__LeCfg__GetMeasureKeys(),
    space     : KeyMap.Na__LeCfg__IsPointerModifierBound('Space')
});
KeyMap.Na__LeCfg__SetKeyMap(SHIPPED);
const shippedKeys = resolveAll(), shippedPointer = resolvePointer(), shippedRest = resolveRest();
KeyMap.Na__LeCfg__SetKeyMap(null);
const fallbackKeys = resolveAll(), fallbackPointer = resolvePointer(), fallbackRest = resolveRest();
const differing = presses.map((p, i) => (shippedKeys[i] !== fallbackKeys[i] ? p[0] + '[' + p[1].join('+') + '] shipped ' + shippedKeys[i] + ', fallback ' + fallbackKeys[i] : null)).filter(Boolean);
check('every key resolves the same through both (' + presses.length + ' presses)', differing, []);
check('M is Move in the fallback too',                         fallbackKeys[presses.findIndex((p) => p[0] === 'm' && p[1].length === 0)], 'Tool__Move');
check('the space bar arms Select in the fallback, not Deselect', (KeyMap.Na__LeCfg__MatchKeyBinding(' ', held([])) || {}).action, 'Tool__SelectToggle');
check('Ctrl+S is the editor\'s save in the fallback',          (KeyMap.Na__LeCfg__MatchKeyBinding('s', held([ 'Ctrl' ])) || {}).action, 'Edit__Save');
check('every press on the stage means the same',               fallbackPointer, shippedPointer);
check('the wheel, the selection keys, the guards, the setups and the Measurements keys match', fallbackRest, shippedRest);

// REGION | Reading the Key File Again (verbatim)
console.log('\n  Reading the drawing tabs\' key file again');
const withKey = (key, action) => {
    const map = JSON.parse(JSON.stringify(SHIPPED));
    map.LayoutEditor__KeyboardBindings__Config.LayoutEditor__KeyboardBindings__List.push({ Id : 'Test__' + key, Action : action, Enabled : true, Keys : [ key ], Modifiers : [], ModifierMatch : 'Exact' });
    return map;
};
let reads = 0;
let answer = null;
globalThis.fetch = async () => { reads++; return answer(); };
const actionOf = (key) => (KeyMap.Na__LeCfg__MatchKeyBinding(key, held([])) || {}).action || null;
const warn = console.warn; console.warn = () => {};
KeyMap.Na__LeCfg__SetKeyMap(null);
answer = () => ({ ok : true, json : async () => withKey('q', 'Tool__Move') });
check('a read that lands replaces the map',                    [ await KeyMap.Na__LeCfg__ReloadKeyMap(), actionOf('q') ], [ true, 'Tool__Move' ]);
answer = () => { throw new Error('offline'); };
check('a read that fails keeps the map in force',              [ await KeyMap.Na__LeCfg__ReloadKeyMap(), actionOf('q'), actionOf('m') ], [ false, 'Tool__Move', 'Tool__Move' ]);
answer = () => ({ ok : true, json : async () => { throw new SyntaxError('half written'); } });
check('a file caught half written keeps it too',               [ await KeyMap.Na__LeCfg__ReloadKeyMap(), actionOf('q') ], [ false, 'Tool__Move' ]);
answer = () => ({ ok : false, status : 404 });
check('so does a file that is not there',                      [ await KeyMap.Na__LeCfg__ReloadKeyMap(), actionOf('q') ], [ false, 'Tool__Move' ]);
answer = () => ({ ok : true, json : async () => SHIPPED });
const before = reads;
const one = KeyMap.Na__LeCfg__ReloadKeyMap(), two = KeyMap.Na__LeCfg__ReloadKeyMap();
check('two calls at once share one read',                      [ one === two, await one, reads - before ], [ true, true, 1 ]);
KeyMap.Na__LeCfg__SetKeyMap(withKey('w', 'Tool__Move'));
const handedReads = reads;
check('a map handed in is never replaced by the file',         [ await KeyMap.Na__LeCfg__ReloadKeyMap(), reads - handedReads, actionOf('w') ], [ false, 0, 'Tool__Move' ]);
KeyMap.Na__LeCfg__SetKeyMap(null);
check('handed back (null), the file is read again',            [ await KeyMap.Na__LeCfg__ReloadKeyMap(), actionOf('w') ], [ true, null ]);
console.warn = warn;

console.log('\n' + (failures === 0 ? '  Every check passed.' : '  ' + failures + ' FAILED'));
process.exit(failures === 0 ? 0 : 1);
