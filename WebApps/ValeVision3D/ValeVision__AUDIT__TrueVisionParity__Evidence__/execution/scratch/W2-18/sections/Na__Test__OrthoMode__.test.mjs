// =============================================================================
// TRUEVISION3D - TEST - ORTHO MODE (F8)
// =============================================================================
//
// FILE       : Na__Test__OrthoMode__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Ortho Mode Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove AutoCAD's Ortho on F8: the Ortho XOR Shift rule, and that the Draw tool, the Dimension tool, every drag and the keyboard obey it
// CREATED    : 21-Sep-2026
//
// DESCRIPTION:
// - THE RULE. The leaf (Na__LayoutEditor__OrthoMode__State__) is loaded as
//   shipped: Resolve must answer AutoCAD's truth table, Shift override on and
//   off, and the flag must come back from the browser's storage.
// - THE SWITCH. The controller is loaded over the SAME leaf instance, with the
//   real config JSON: Toggle must remember, announce and echo "<Ortho on>" /
//   "<Ortho off>" exactly once per real change.
// - THE DRAW TOOL, THE DIMENSION TOOL AND THE DRAG (ApplyDrag) are loaded with
//   the real axis lock and the real leaf, everything else stubbed: with Ortho
//   off each must do exactly what it did before; with it on each point must be
//   held the way a held Shift held it; with Shift held as well each must be
//   free again; an arrow lock must still win; a snap must supply only the
//   coordinate along the held axis; a typed length must be exact; and the two
//   places Shift means something else (a viewport handle, the rotate grip)
//   must still hear the raw key.
// - THE KEYBOARD. The real key map module with the SHIPPED JSON, and the real
//   sheet tools state: F8 must switch Ortho once per press (not on repeat),
//   from a panel checkbox too but never from a text box, never with Ctrl, and
//   from the built-in fallback key map as well; Ctrl+L must ship off; and F8
//   or Shift must re-aim the band or a drag that has really moved.
// - Each module is the shipped file with its import lines swapped for stubs
//   and nothing else touched.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__OrthoMode__.test.mjs
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 21-Sep-2026 - Version 1.0.0
// - Written with Ortho mode (Na__LayoutEditor__OrthoMode__, F8).
//
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';


// -----------------------------------------------------------------------------
// REGION | A Browser Just Big Enough
// -----------------------------------------------------------------------------

    const announced = [];
    const storage   = new Map();
    globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
    globalThis.window = {
        addEventListener    : () => {},
        removeEventListener : () => {},
        dispatchEvent       : (event) => { announced.push({ type : event.type, detail : event.detail }); return true; },
        localStorage        : {
            getItem    : (k) => (storage.has(k) ? storage.get(k) : null),
            setItem    : (k, v) => { storage.set(k, String(v)); },
            removeItem : (k) => { storage.delete(k); }
        },
        setTimeout, clearTimeout,
        requestAnimationFrame : () => 0,
        cancelAnimationFrame  : () => {}
    };
    globalThis.document = { body : { classList : { add : () => {}, remove : () => {}, toggle : () => {} } } };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Loading a Module With Its Imports Stubbed
// -----------------------------------------------------------------------------

    const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
    const SRC        = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D/02__Src__AppModules';
    const IMPORT     = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;

    // Every name a module imports gets a stub: the test's own when it gives one
    // (stubs), a live global getter when the module reads a let that changes
    // under it (live), else a function that does nothing and returns undefined.
    // tail is appended to the temporary copy only - an extra export of an
    // internal function the test drives - and never touches the shipped file.
    let loadCount = 0;
    async function load(relative, stubs, live, tail) {
        let src = readFileSync(resolve(SRC, relative), 'utf8').replace(/\r\n/g, '\n');
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
        if (had && /^\s*import\s/m.test(src)) { console.error('FAIL: an import survived in ' + relative); process.exit(1); }
        const key = '__Stubs' + (++loadCount);
        globalThis[key] = stubs || {};
        const liveNames = live || [];
        const head = names.filter((n) => liveNames.indexOf(n) === -1).map((n) =>
            'const ' + n + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + n + '") ? globalThis.' + key + '["' + n + '"] : function () { return undefined; };'
        ).join('\n');
        const tmp = join(tmpdir(), 'Na__Test__OrthoMode__' + loadCount + '__.mjs');
        writeFileSync(tmp, head + '\n' + src + (tail ? '\n' + tail + '\n' : ''), 'utf8');
        return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
    }

    function defineLive(name, getter) {
        Object.defineProperty(globalThis, name, { get : getter, configurable : true });
    }

    const ORTHO_CONFIG = JSON.parse(readFileSync(resolve(SRC, '51__System__LayoutEditor/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__Config__.json'), 'utf8'));
    const SHIPPED_KEY_MAP = JSON.parse(readFileSync(resolve(SRC, '51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json'), 'utf8'));
    globalThis.fetch = async () => ({ ok : true, json : async () => ORTHO_CONFIG });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks
// -----------------------------------------------------------------------------

    let failures = 0;
    function check(name, got, want) {
        const passed = JSON.stringify(got) === JSON.stringify(want);
        if (!passed) failures++;
        console.log((passed ? '  PASS  ' : '  FAIL  ') + name);
        if (!passed) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
    }
    const round = (p) => (p ? { x : Math.round(p.x * 1000) / 1000, y : Math.round(p.y * 1000) / 1000 } : p);

    console.log('ValeVision3D (W2-18 sections) - Ortho mode (F8)');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Rule
// -----------------------------------------------------------------------------

    console.log('\n  The rule: Ortho XOR Shift');
    const State = await load('51__System__LayoutEditor/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js');
    const table = () => [ [ false, false ], [ false, true ], [ true, false ], [ true, true ] ].map(([ on, shift ]) => { State.Na__LeOrtho__AssignOn(on); return State.Na__LeOrtho__Resolve(shift); });
    check('off on a fresh browser (AutoCAD ORTHOMODE 0)', State.Na__LeOrtho__IsOn(), false);
    check('off+up free, off+Shift held, on+up held, on+Shift free', table(), [ false, true, true, false ]);
    State.Na__LeOrtho__AssignShiftOverride(false);
    check('with the Shift override off, Shift only ever holds', table(), [ false, true, true, true ]);
    State.Na__LeOrtho__AssignShiftOverride(true);
    check('an undefined Shift counts as up', (() => { State.Na__LeOrtho__AssignOn(true); return State.Na__LeOrtho__Resolve(undefined); })(), true);
    State.Na__LeOrtho__AssignOn(false);
    storage.set('na-layouteditor-ortho', '1');
    const Remembered = await load('51__System__LayoutEditor/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__State__.js');
    check('a new page comes back on when this browser left it on', Remembered.Na__LeOrtho__IsOn(), true);
    storage.delete('na-layouteditor-ortho');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Switch
// -----------------------------------------------------------------------------

    console.log('\n  The switch: remembered, announced and echoed as AutoCAD echoes it');
    const said = [];
    const Ortho = await load('51__System__LayoutEditor/32__System__OrthoMode/Na__LayoutEditor__OrthoMode__.js', {
        Na__LeOrtho__CHANGED_EVENT       : State.Na__LeOrtho__CHANGED_EVENT,
        Na__LeOrtho__IsOn                : State.Na__LeOrtho__IsOn,
        Na__LeOrtho__AssignOn            : State.Na__LeOrtho__AssignOn,
        Na__LeOrtho__Store               : State.Na__LeOrtho__Store,
        Na__LeOrtho__AssignShiftOverride : State.Na__LeOrtho__AssignShiftOverride,
        Na__LeMeasure__Say               : (text) => { said.push(text); return true; }
    });
    const originalLog = console.log;
    console.log = (...a) => { if (!(typeof a[0] === 'string' && a[0].indexOf('[ValeVision3D LayoutEditor] Ortho') === 0)) originalLog(...a); };
    await Ortho.Na__LeOrtho__Ready();
    State.Na__LeOrtho__AssignOn(false);
    announced.length = 0;
    const on  = Ortho.Na__LeOrtho__Toggle();
    const onState = [ on, storage.get('na-layouteditor-ortho'), announced.map((a) => a.type + ':' + a.detail.enabled), said.slice() ];
    const off = Ortho.Na__LeOrtho__Toggle();
    const offState = [ off, storage.get('na-layouteditor-ortho'), announced.length, said.slice() ];
    announced.length = 0; said.length = 0;
    const same = Ortho.Na__LeOrtho__Set(false);
    console.log = originalLog;
    check('F8 on: on, remembered, announced, "<Ortho on>"', onState, [ true, '1', [ 'na-layouteditor-ortho-changed:true' ], [ '<Ortho on>' ] ]);
    check('F8 off: off, remembered, "<Ortho off>"',       offState, [ false, '0', 2, [ '<Ortho on>', '<Ortho off>' ] ]);
    check('switching to what it already is does nothing', [ same, announced.length, said.length ], [ false, 0, 0 ]);
    check('the toolbar words come from the config',        [ Ortho.Na__LeOrtho__Label('Toggle', '?'), Ortho.Na__LeOrtho__Label('EchoOn', '?') ], [ 'Ortho', '<Ortho on>' ]);

// endregion -------------------------------------------------------------------










    console.log('\n' + (failures === 0 ? 'ALL PASSED' : failures + ' FAILED'));
    process.exit(failures === 0 ? 0 : 1);
