// W0-15 scratch: acceptance item 2 replayed in node against ValeVision's REAL
// sheet keyboard (SheetTools__Keyboard__ as it is in the live tree) and the
// given KeyMap unit, with the key file BLOCKED (built-in fallback) and then
// with the shipped key file. Imports are swapped for stubs the way
// TrueVision's Na__Test__DrawingTabKeys__ does (an unnamed stub is a function
// returning undefined). Also replays the mode controller's Ctrl+S test
// (OnSaveKey keys on MatchKeyBinding(...).action === 'Edit__Save').
//
// Usage: node sheet_keyboard_sim.mjs <folder holding the KeyMap unit and the key file>
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const CFG = resolve(process.argv[2]);
const SRC = 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D\\02__Src__AppModules\\51__System__LayoutEditor';
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
    if (/^\s*import\s/m.test(src)) throw new Error('an import survived in ' + path);
    const key = '__SimStubs' + (++n);
    globalThis[key] = stubs || {};
    const head = names.map((x) => 'const ' + x + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + x + '") ? globalThis.' + key + '["' + x + '"] : function () { return undefined; };').join('\n');
    const tmp = join(tmpdir(), 'W0-15__SheetKeySim__' + n + '__.mjs');
    writeFileSync(tmp, head + '\n' + src, 'utf8');
    return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
}

const KeyMap = await load(resolve(CFG, 'Na__LayoutEditor__ConfigState__KeyMap__.js'), { Na__LeCfg__PREFIX : 'LayoutEditor__' });
const SHIPPED = JSON.parse(readFileSync(resolve(CFG, 'Na__Hotkeys__DrawingTabs__.json'), 'utf8'));
const State = await load(resolve(SRC, '30__System__SheetTools', 'Na__LayoutEditor__SheetTools__State__.js'));
const rec = { tools : [], other : [] };
globalThis.document = { activeElement : { tagName : 'BODY' } };
const Keys = await load(resolve(SRC, '30__System__SheetTools', 'Na__LayoutEditor__SheetTools__Keyboard__.js'), {
    Na__LeCfg__GetKeyboardSetup    : KeyMap.Na__LeCfg__GetKeyboardSetup,
    Na__LeCfg__MatchKeyBinding     : KeyMap.Na__LeCfg__MatchKeyBinding,
    Na__LeCfg__GetLabel            : (k, f) => f,
    Na__LeModel__GetActiveSheet    : () => ({ Sheet__Id : 'Sheet_Sim' }),
    Na__LeModel__GetSelectionItems : () => [],
    Na__LeModel__SetSelection      : () => { rec.other.push('SetSelection'); },
    Na__LeTools__TOOL_SELECT       : State.Na__LeTools__TOOL_SELECT,
    Na__LeTools__TOOL_MOVE         : State.Na__LeTools__TOOL_MOVE,
    Na__LeTools__TOOL_TEXT         : State.Na__LeTools__TOOL_TEXT,
    Na__LeTools__TOOL_DIMENSION    : State.Na__LeTools__TOOL_DIMENSION,
    Na__LeTools__TOOL_DRAW         : State.Na__LeTools__TOOL_DRAW,
    Na__LeTools__TOOL_RECT         : State.Na__LeTools__TOOL_RECT,
    Na__LeTools__TOOL_LEADER       : State.Na__LeTools__TOOL_LEADER,
    Na__LeTools__SHEET_CHORDS      : State.Na__LeTools__SHEET_CHORDS,
    Na__LeTools__NON_TEXT_INPUTS   : State.Na__LeTools__NON_TEXT_INPUTS,
    Na__LeTools__Editable          : true,
    Na__LeTools__SetTool           : (tool) => { rec.tools.push(tool); return tool; },
    Na__LeTools__ArmEyedropper     : () => { rec.other.push('ArmEyedropper'); },
    Na__LeTools__ArmPalette        : () => { rec.other.push('ArmPalette'); },
    Na__LeOsnap__Toggle            : () => { rec.other.push('OsnapToggle'); },
    Na__LeHist__Undo               : () => { rec.other.push('Undo'); return true; },
    Na__LeHist__Redo               : () => { rec.other.push('Redo'); return true; },
    Na__LeClip__RunKeyAction       : (a) => { rec.other.push('Clip:' + a); return true; },
    Na__LeTools__AxisKey           : () => false
});

function press(key, o) {
    const opts = o || {};
    rec.tools = []; rec.other = [];
    const ev = { key, code : '', target : { tagName : 'BODY', isContentEditable : false }, ctrlKey : !!opts.ctrl, shiftKey : !!opts.shift, altKey : !!opts.alt, metaKey : false, repeat : false,
                 prevented : false, preventDefault() { this.prevented = true; } };
    Keys.Na__LeTools__OnKey(ev);
    return { tools : rec.tools.slice(), other : rec.other.slice(), prevented : ev.prevented };
}
const T = State;
let failures = 0;
function check(name, got, want) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failures++;
    console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok ? '' : '\n        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want)));
}
const saveAction = () => (KeyMap.Na__LeCfg__MatchKeyBinding('s', { Ctrl : true, Shift : false, Alt : false, Meta : false, Space : false }) || {}).action || null;

for (const mode of [ 'BLOCKED (404: the built-in fallback)', 'the shipped key file' ]) {
    KeyMap.Na__LeCfg__SetKeyMap(mode.indexOf('BLOCKED') === 0 ? null : SHIPPED);
    console.log('\n  Key file ' + mode);
    check('M arms Move',                                   press('m').tools, [ T.Na__LeTools__TOOL_MOVE ]);
    check('space arms Select and is taken from the browser', [ press(' ').tools, press(' ').prevented ], [ [ T.Na__LeTools__TOOL_SELECT ], true ]);
    check('Ctrl+S resolves to the editor save (mode controller OnSaveKey)', saveAction(), 'Edit__Save');
    check('T still selects Text (no When context is passed)', press('t').tools, [ T.Na__LeTools__TOOL_TEXT ]);
    check('V selects Select, D Dimension, L Draw, R Rectangle, E Leader', [ press('v').tools, press('d').tools, press('l').tools, press('r').tools, press('e').tools ],
          [ [ T.Na__LeTools__TOOL_SELECT ], [ T.Na__LeTools__TOOL_DIMENSION ], [ T.Na__LeTools__TOOL_DRAW ], [ T.Na__LeTools__TOOL_RECT ], [ T.Na__LeTools__TOOL_LEADER ] ]);
    const quiet = [ [ 't', { shift : true } ], [ 'c' ], [ 'a' ], [ 'k' ], [ 'F6' ], [ 'F7' ], [ 'F8' ], [ 'F9' ], [ 'j' ], [ 'u' ], [ 'f' ], [ 'x', { ctrl : true } ], [ 'PageUp' ], [ 'PageDown' ] ];
    const results = quiet.map(([ k, o ]) => { const r = press(k, o); return k + (o && o.shift ? '+Shift' : '') + (o && o.ctrl ? '+Ctrl' : '') + ': ' + (r.tools.length || r.other.length || r.prevented ? 'ACTED ' + JSON.stringify(r) : 'nothing'); });
    check('Shift+T, C, A, K, F6-F9, J, U, F, Ctrl+X, Page Up/Down do nothing on the sheet (unknown actions are ignored)', results.filter((s) => !/: nothing$/.test(s)), []);
    check('Escape still cancels back to Select, B arms the eyedropper, Ctrl+Z undoes', [ press('Escape').tools, press('b').other, press('z', { ctrl : true }).other ],
          [ [ T.Na__LeTools__TOOL_SELECT ], [ 'ArmEyedropper' ], [ 'Undo' ] ]);
}
console.log('\n' + (failures ? '  ' + failures + ' FAILED' : '  Every check passed.'));
process.exit(failures ? 1 : 0);
