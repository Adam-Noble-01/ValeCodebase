// W3-01 scratch check: the live State 1.8.0 and ToolState 1.7.0 load in Node, their exports are a
// superset of VV's previous 1.1.0 files (backup/), and the tools the toolbar and keys arm still arm.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';
register('./importmap_hooks.mjs', import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const VV   = resolve(HERE, '../../../..');
const ST   = resolve(VV, '02__Src__AppModules/51__System__LayoutEditor/30__System__SheetTools');

let pass = 0, fail = 0;
const check = (ok, label) => { if (ok) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } };

// ---- minimal browser stand-ins (nothing here paints) ----
const events = [];
class Ev { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
const elStub = () => ({ style : {}, classList : { add(){}, remove(){}, toggle(){}, contains(){ return false; } }, appendChild(c){ return c; }, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){}, addEventListener(){}, removeEventListener(){}, querySelector(){ return null; }, querySelectorAll(){ return []; }, getBoundingClientRect(){ return { left:0, top:0, width:0, height:0, right:0, bottom:0 }; }, children : [], childNodes : [], textContent : '', innerHTML : '', dataset : {} });
globalThis.CustomEvent = globalThis.CustomEvent || Ev;
globalThis.window = { dispatchEvent : (e) => { events.push(e); return true; }, addEventListener(){}, removeEventListener(){}, localStorage : { getItem : () => null, setItem(){}, removeItem(){} }, location : { hostname : 'localhost', search : '', href : 'http://localhost/' }, setTimeout, clearTimeout, requestAnimationFrame : (f) => setTimeout(f, 0), devicePixelRatio : 1, innerWidth : 1200, innerHeight : 800, getComputedStyle : () => ({ getPropertyValue : () => '' }) };
globalThis.document = { createElement : elStub, createElementNS : elStub, getElementById : () => null, querySelector : () => null, querySelectorAll : () => [], addEventListener(){}, removeEventListener(){}, body : elStub(), head : elStub(), documentElement : elStub(), fonts : { ready : Promise.resolve() } };
globalThis.requestAnimationFrame = globalThis.window.requestAnimationFrame;

// ---- exports: superset of the previous VV files ----
const exportNames = (text) => { const m = text.match(/export\s*\{([\s\S]*?)\}/); return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : []; };
for (const name of [ 'Na__LayoutEditor__SheetTools__State__.js', 'Na__LayoutEditor__SheetTools__ToolState__.js' ]) {
    const before = exportNames(readFileSync(resolve(HERE, 'backup', name), 'utf8'));
    const after  = exportNames(readFileSync(resolve(ST, name), 'utf8'));
    const lost   = before.filter((n) => after.indexOf(n) === -1);
    check(lost.length === 0, name + ': every previous export kept (' + before.length + ' -> ' + after.length + ')' + (lost.length ? ' LOST ' + lost.join(', ') : ''));
}

// ---- load the live modules ----
let S, T;
try {
    S = await import(pathToFileURL(resolve(ST, 'Na__LayoutEditor__SheetTools__State__.js')).href);
    T = await import(pathToFileURL(resolve(ST, 'Na__LayoutEditor__SheetTools__ToolState__.js')).href);
    check(true, 'State and ToolState (with their whole import closure) evaluate in Node');
} catch (err) {
    check(false, 'State and ToolState evaluate: ' + (err && err.stack || err));
    console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(1);
}

// ---- State 1.8.0 content ----
check(S.Na__LeTools__TOOLS.indexOf('note-region') !== -1 && S.Na__LeTools__TOOLS.indexOf('area') !== -1, 'TOOLS carries TOOL_AREA and TOOL_REGION');
check([ 'select', 'move', 'text', 'dimension', 'draw', 'rectangle', 'eyedropper', 'leader' ].every((t) => S.Na__LeTools__TOOLS.indexOf(t) !== -1), 'TOOLS still carries every tool the toolbar and keys arm');
check(S.Na__LeTools__SHEET_CHORDS.indexOf('Edit__Cut') !== -1 && S.Na__LeTools__SHEET_CHORDS.indexOf('View__AxesToggle') !== -1, 'SHEET_CHORDS carries Edit__Cut and F6-F9');
S.Na__LeTools__WriteMoveRetype({ x : 1 }); check(S.Na__LeTools__MoveRetype && S.Na__LeTools__MoveRetype.x === 1, 'MoveRetype writes and reads live');
S.Na__LeTools__WriteLastPress({ time : 1 }); check(S.Na__LeTools__LastPress && S.Na__LeTools__LastPress.time === 1, 'LastPress writes and reads live');

// ---- ToolState 1.7.0: defaults read the config, as before ----
const dim = T.Na__LeTools__GetDimensionDefaults();
check(dim.atScale === true, 'new dimensions measure at scale (config DefaultAtScale true, was hard-coded true)');
check(dim.roundUp === false && dim.linePt === null && dim.dashOn === false, 'new dimensions: roundUp off, sheet line weight, solid line');
const shp = T.Na__LeTools__GetShapeDefaults();
check(shp.atScale === true, 'new vectors draw at scale (config DefaultAtScale true, was hard-coded true)');
check(shp.hatchOn === false && shp.hatch && shp.hatch.Hatch__PatternKey === '', 'new vectors: hatch off by default');

// ---- the tools still arm (editable sheet, no stage, no open container) ----
check(T.Na__LeTools__SetTool('text') === 'select', 'read-only: SetTool keeps Select');
S.Na__LeTools__WriteEditable(true);
for (const tool of [ 'move', 'text', 'dimension', 'draw', 'rectangle', 'leader', 'select' ]) {
    events.length = 0;
    const got = T.Na__LeTools__SetTool(tool);
    const ev  = events.find((e) => e.type === S.Na__LeTools__CHANGED_EVENT);
    check(got === tool && T.Na__LeTools__GetTool() === tool && T.Na__LeTools__Tool === tool && ev && ev.detail.tool === tool && ev.detail.auto === false, 'SetTool(' + tool + ') arms it and announces it (auto false)');
}
check(T.Na__LeTools__SetTool('no-such-tool') === 'select', 'an unknown tool still falls back to Select');
T.Na__LeTools__SetTool('move');
check(T.Na__LeTools__IsMoveAuto() === false && T.Na__LeTools__PutDownMove() === false && T.Na__LeTools__GetTool() === 'move', 'a deliberate Move is not automatic and is not put down');
T.Na__LeTools__SetTool('select');
check(T.Na__LeTools__ArmEyedropper() === 'eyedropper', 'ArmEyedropper (B) still arms the eyedropper');
T.Na__LeTools__SetTool('select');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
