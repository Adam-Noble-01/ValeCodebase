// W1-36 scratch harness (not shipped). Exercises this package's BUILT files (scratch/W1-36/out, or the live tree
// with --live) with their imports swapped for stubs, the way TrueVision's own tests load a module:
//   A. the mode controller: Page Up / Page Down turn the drawings through Enter and stop at the ends; a drawing
//      opened from the 3D view or back from the specification restarts the sheet keyboard (detach, re-read the
//      key file, attach, give the stage the keyboard); one drawing to another does not.
//   B. the PC controls: many wheel events before a frame make ONE zoom, a gesture step; detach drops a pending one.
//   C. the touchscreen controls: a pinch step is a gesture step.
//   D. acceptance 3 with this app's REAL sheet keyboard (SheetTools__Keyboard__ 1.3.0): after ticking a panel
//      checkbox, a press on the paper and then M picks Move. Run against the pre-image PC controls too, where the
//      tick box keeps the keyboard and M does nothing (the check is not vacuous).
// Usage: node harness_w1_36.mjs [--live]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIVE = process.argv.includes('--live');
const VV   = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const SRC_BUILT = LIVE ? resolve(VV, '02__Src__AppModules') : resolve(HERE, 'out', '02__Src__AppModules');
const SRC_LIVE  = resolve(VV, '02__Src__AppModules');
const PRE       = resolve(HERE, 'pre');

const IMPORT = /^[ \t]*import\s+(\{[\s\S]*?\}|[\w*\s,]+)\s+from\s+'[^']+';[ \t]*(?:\/\/[^\n]*)?$/gm;
let loadCount = 0;
async function loadFile(file, stubs) {
    let src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const names = [];
    let m;
    IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(src)) !== null) {
        const list = m[1].trim();
        if (list.charAt(0) !== '{') continue;
        list.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => names.push(s.split(/\s+as\s+/).pop()));
    }
    src = src.replace(IMPORT, '');
    if (/^\s*import\s/m.test(src)) throw new Error('an import survived in ' + file);
    const key = '__W136Stubs' + (++loadCount);
    globalThis[key] = stubs || {};
    const head = names.map((n) => 'const ' + n + ' = Object.prototype.hasOwnProperty.call(globalThis.' + key + ', "' + n + '") ? globalThis.' + key + '["' + n + '"] : function () { return undefined; };').join('\n');
    const tmp = join(tmpdir(), 'W1-36__harness__' + loadCount + '__.mjs');
    writeFileSync(tmp, head + '\n' + src, 'utf8');
    return import(pathToFileURL(tmp).href + '?v=' + Math.random().toString(36).slice(2));
}

let failures = 0, passes = 0;
function check(name, got, want) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (ok) passes++; else failures++;
    console.log((ok ? '  PASS  ' : '  FAIL  ') + name);
    if (!ok) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
}

// A browser just big enough ----------------------------------------------------
const windowListeners = [];
const frames = [];
let cancelled = 0;
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init ? init.detail : undefined; } };
globalThis.window = {
    addEventListener      : (type, fn, capture) => windowListeners.push({ type, fn, capture : !!capture }),
    removeEventListener   : (type, fn) => { const at = windowListeners.findIndex((l) => l.type === type && l.fn === fn); if (at !== -1) windowListeners.splice(at, 1); },
    dispatchEvent         : (event) => { windowListeners.filter((l) => l.type === event.type).forEach((l) => l.fn(event)); return true; },
    requestAnimationFrame : (fn) => { frames.push(fn); return frames.length; },
    cancelAnimationFrame  : () => { cancelled++; }
};
const BODY = { tagName : 'BODY', isContentEditable : false, classList : { add() {}, remove() {} }, appendChild() {} };
function el(tagName, o) {
    const opts = o || {};
    return { tagName, type : opts.type, isContentEditable : !!opts.editable, onStage : !!opts.onStage, control : !!opts.control,
             blur() { if (document.activeElement === this) document.activeElement = BODY; }, closest() { return this.control ? this : null; } };
}
const stageListeners = [];
const STAGE = {
    tagName : 'DIV', isContentEditable : false, focusCalls : 0,
    addEventListener    : (type, fn, capture) => stageListeners.push({ type, fn, capture : !!(capture === true || (capture && capture.capture)) }),
    removeEventListener : (type, fn) => { const at = stageListeners.findIndex((l) => l.type === type && l.fn === fn); if (at !== -1) stageListeners.splice(at, 1); },
    classList : { add() {}, remove() {} },
    contains(node) { return !!node && (node === STAGE || node.onStage === true); },
    focus() { this.focusCalls++; document.activeElement = STAGE; },
    closest() { return null; },
    setPointerCapture() {}, releasePointerCapture() {}
};
globalThis.document = {
    activeElement : BODY, body : BODY,
    getElementById : () => null,
    createElement  : () => ({ hidden : false, className : '', id : '', set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, querySelector : (sel) => (sel === '.na-le-stage' ? STAGE : { tagName : 'DIV' }), contains : () => false }),
    querySelectorAll : () => [],
    addEventListener : () => {}
};

// A. The mode controller ---------------------------------------------------------
console.log('\n  A. The mode controller: Page Up / Page Down, and the sheet keyboard started afresh');
const calls = [];
const SHEETS = [ { Sheet__Id : 'S1' }, { Sheet__Id : 'S2' }, { Sheet__Id : 'S3' } ];
let active = null;
const record = (name) => () => { calls.push(name); };
const Mode = await loadFile(resolve(SRC_BUILT, '51__System__LayoutEditor/05__Core__ModeController/Na__LayoutEditor__ModeController__.js'), {
    Na__LeCfg__IsEnabled            : () => true,
    Na__LeCfg__ReloadKeyMap         : () => { calls.push('reload-keys'); return Promise.resolve(true); },
    Na__LeModel__GetSheets          : () => SHEETS,
    Na__LeModel__GetSheetById       : (id) => SHEETS.find((s) => s.Sheet__Id === id) || null,
    Na__LeModel__GetActiveSheet     : () => (active ? SHEETS.find((s) => s.Sheet__Id === active) : null),
    Na__LeModel__SetActiveSheetId   : (id) => { active = id; },
    Na__LeModel__GetViewports       : () => [],
    Na__DrawData__GetLayoutModeEnabled : () => true,
    Na__LeVw__IsViewerMode          : () => false,
    Na__DevGate__IsAuthoringEnabled : () => true,
    Na__LePc__STEP_SHEET_EVENT      : 'na-layouteditor-step-sheet',
    Na__LePc__Attach                : record('pc-attach'),
    Na__LePc__Detach                : record('pc-detach'),
    Na__LePc__TakeKeyboard          : record('take-keyboard'),
    Na__LeTouch__Attach             : record('touch-attach'),
    Na__LeTouch__Detach             : record('touch-detach'),
    Na__LeTools__Attach             : record('tools-attach'),
    Na__LeTools__Detach             : record('tools-detach'),
    Na__LeMarginGrip__Attach        : record('grip-attach'),
    Na__LeMarginGrip__Detach        : record('grip-detach'),
    Na__LeText__Commit              : record('text-commit'),
    Na__LeSurface__SetSheet         : (sheet) => { calls.push('surface:' + (sheet ? sheet.Sheet__Id : 'none')); },
    Na__LePdf__EnsureJsPdf          : () => Promise.resolve()
});
await Mode.Na__LeMode__Initialize({ appConfig : null, showToast : null });
const stepListeners = windowListeners.filter((l) => l.type === 'na-layouteditor-step-sheet');
check('the mode controller listens for the PC controls\' STEP_SHEET_EVENT once', stepListeners.length, 1);
const step = (direction) => { calls.length = 0; window.dispatchEvent(new CustomEvent('na-layouteditor-step-sheet', { detail : { direction } })); return [ active, calls.filter((c) => c.startsWith('surface:') || c === 'text-commit') ]; };
check('Page Down on the 3D Model tab (no drawing open) opens nothing', step(1), [ null, [] ]);
calls.length = 0;
Mode.Na__LeMode__Enter('S1');
const SEQUENCE = [ 'grip-detach', 'tools-detach', 'touch-detach', 'pc-detach', 'reload-keys', 'pc-attach', 'touch-attach', 'tools-attach', 'grip-attach', 'take-keyboard' ];
const keyboardCalls = () => calls.filter((c) => SEQUENCE.indexOf(c) !== -1);
check('a drawing opened from the 3D view: every listener off, the key file re-read, every listener on, then the stage takes the keyboard', keyboardCalls(), SEQUENCE);
check('Page Down turns to the next drawing, through Enter (text on the paper committed first)', step(1), [ 'S2', [ 'text-commit', 'surface:S2' ] ]);
check('one drawing to another keeps its keyboard as it is (no restart)', keyboardCalls(), []);
check('Page Down again: the third', step(1), [ 'S3', [ 'text-commit', 'surface:S3' ] ]);
check('Page Down at the last drawing stops there (an end, not a loop)', step(1), [ 'S3', [] ]);
check('Page Up turns back', step(-1), [ 'S2', [ 'text-commit', 'surface:S2' ] ]);
calls.length = 0;
Mode.Na__LeMode__OpenSpecification();
check('the specification over the sheet: its keyboard stands down', [ Mode.Na__LeMode__GetView(), keyboardCalls() ], [ 'spec', [ 'grip-detach', 'tools-detach', 'touch-detach', 'pc-detach' ] ]);
check('Page Down under the specification turns nothing', step(1), [ 'S2', [] ]);
calls.length = 0;
Mode.Na__LeMode__Enter('S2');
check('back from the specification: the drawing tabs\' keyboard started afresh, the stage takes the keyboard', [ Mode.Na__LeMode__GetView(), keyboardCalls() ], [ 'sheet', SEQUENCE ]);
calls.length = 0;
Mode.Na__LeMode__Leave();
check('leaving for the 3D view lets every listener go', keyboardCalls(), [ 'grip-detach', 'tools-detach', 'touch-detach', 'pc-detach' ]);
check('and Page Down on the 3D Model tab is the mode controller\'s no more', step(1), [ null, [] ]);

// B. The PC controls: one zoom a frame -------------------------------------------
console.log('\n  B. The PC controls: one wheel zoom a frame, a gesture step');
const zooms = [];
const Pc = await loadFile(resolve(SRC_BUILT, '51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js'), {
    Na__LeCfg__GetGuards           : () => ({ wheelIgnoreSelector : null, pointerIgnoreSelector : null, paperSelector : '.na-le-paper', contextMenuKeepSelector : null }),
    Na__LeCfg__MatchWheelBinding   : () => 'Nav__ZoomAtCursor',
    Na__LeCfg__GetNavigationSetup  : () => ({ zoomWheelStep : 0.001 }),
    Na__LeCfg__GetKeyboardSetup    : () => ({ ignoreWhenTyping : true, panStepPx : 40, panCoarseStepPx : 200, zoomKeyStep : 1.25 }),
    Na__LeSurface__GetElements     : () => ({ stage : STAGE }),
    Na__LeSurface__GetZoom         : () => 2,
    Na__LeNav__ZoomAbout           : (z, x, y, gesture) => { zooms.push([ Math.round(z * 1e6) / 1e6, x, y, gesture ]); },
    Na__LeVpZoom__OnWheel          : () => false
});
stageListeners.length = 0; frames.length = 0;
Pc.Na__LePc__Attach();
const wheel = stageListeners.find((l) => l.type === 'wheel');
const wheelEvent = (dy, x, y) => ({ deltaY : dy, deltaMode : 0, clientX : x, clientY : y, target : STAGE, ctrlKey : false, shiftKey : false, altKey : false, metaKey : false, prevented : false, preventDefault() { this.prevented = true; } });
const events = [ wheelEvent(10, 100, 100), wheelEvent(10, 110, 105), wheelEvent(10, 120, 110), wheelEvent(10, 130, 115), wheelEvent(10, 140, 120) ];
events.forEach((e) => wheel.fn(e));
check('five wheel events before a frame: one frame asked for, no zoom yet, every event taken from the page', [ frames.length, zooms.length, events.every((e) => e.prevented) ], [ 1, 0, true ]);
frames.shift()();
check('the frame applies ONE zoom: the steps multiplied, about the latest pointer, as a gesture step', zooms, [ [ Math.round(2 * Math.exp(-50 * 0.001) * 1e6) / 1e6, 140, 120, true ] ]);
wheel.fn(wheelEvent(10, 50, 50));
const cancelledBefore = cancelled;
Pc.Na__LePc__Detach();
check('Detach drops a step still waiting for its frame', [ cancelled - cancelledBefore, frames.length ], [ 1, 1 ]);
frames.length = 0;

// C. The touchscreen controls: a pinch step is a gesture step --------------------
console.log('\n  C. The touchscreen controls: a pinch step is a gesture step');
const pinchZooms = [];
const Touch = await loadFile(resolve(SRC_BUILT, '51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__TouchScreen__.js'), {
    Na__LeCfg__GetGuards       : () => ({ pointerIgnoreSelector : null, paperSelector : null }),
    Na__LeCfg__GetTouchSetup   : () => ({ pinchZoom : true, twoFingerPan : true, pinchStartSlopPx : 10, panStartSlopPx : 8, oneFingerPanOnPaper : false, oneFingerPanOnStage : true, doubleTapFit : false }),
    Na__LeSurface__GetElements : () => ({ stage : STAGE }),
    Na__LeSurface__GetZoom     : () => 1,
    Na__LeNav__ZoomAbout       : (z, x, y, gesture) => { pinchZooms.push([ z, gesture ]); },
    Na__LeNav__PanBy           : () => {}
});
stageListeners.length = 0;
Touch.Na__LeTouch__Attach();
const touch = (type, id, x, y) => stageListeners.find((l) => l.type === type).fn({ type, pointerType : 'touch', pointerId : id, clientX : x, clientY : y, target : STAGE });
touch('pointerdown', 1, 100, 100); touch('pointerdown', 2, 200, 100); touch('pointermove', 2, 300, 100);
check('two fingers spreading from 100 px to 200 px apart: zoom x2, as a gesture step', pinchZooms, [ [ 2, true ] ]);
Touch.Na__LeTouch__Detach();

// D. Acceptance 3 with this app's real sheet keyboard ----------------------------
console.log('\n  D. A ticked panel checkbox, a press on the paper, then M (this app\'s real sheet keyboard 1.3.0)');
const KeyMap = await loadFile(resolve(SRC_LIVE, '51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js'), { Na__LeCfg__PREFIX : 'LayoutEditor__' });
KeyMap.Na__LeCfg__SetKeyMap(JSON.parse(readFileSync(resolve(SRC_LIVE, '51__System__LayoutEditor/03__Core__Config/Na__Hotkeys__DrawingTabs__.json'), 'utf8')));
const Scope = await loadFile(resolve(SRC_LIVE, '03__AppUtils/Na__AppUtils__KeyScope__.js'));
const ToolsState = await loadFile(resolve(SRC_LIVE, '51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__State__.js'));
const tools = [];
const Keys = await loadFile(resolve(SRC_LIVE, '51__System__LayoutEditor/30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js'), {
    Na__LeCfg__GetKeyboardSetup : KeyMap.Na__LeCfg__GetKeyboardSetup,
    Na__LeCfg__MatchKeyBinding  : KeyMap.Na__LeCfg__MatchKeyBinding,
    Na__LeCfg__GetLabel         : (k, f) => f,
    Na__LeModel__GetActiveSheet : () => ({ Sheet__Id : 'S1' }),
    Na__LeModel__GetSelectionItems : () => [],
    Na__LeTools__TOOL_SELECT    : ToolsState.Na__LeTools__TOOL_SELECT,
    Na__LeTools__TOOL_MOVE      : ToolsState.Na__LeTools__TOOL_MOVE,
    Na__LeTools__TOOL_TEXT      : ToolsState.Na__LeTools__TOOL_TEXT,
    Na__LeTools__TOOL_DIMENSION : ToolsState.Na__LeTools__TOOL_DIMENSION,
    Na__LeTools__TOOL_DRAW      : ToolsState.Na__LeTools__TOOL_DRAW,
    Na__LeTools__TOOL_RECT      : ToolsState.Na__LeTools__TOOL_RECT,
    Na__LeTools__TOOL_LEADER    : ToolsState.Na__LeTools__TOOL_LEADER,
    Na__LeTools__SHEET_CHORDS   : ToolsState.Na__LeTools__SHEET_CHORDS,
    Na__LeTools__NON_TEXT_INPUTS : ToolsState.Na__LeTools__NON_TEXT_INPUTS,
    Na__LeTools__Stage          : STAGE,
    Na__LeTools__Editable       : true,
    Na__LeTools__Tool           : ToolsState.Na__LeTools__TOOL_SELECT,
    Na__LeTools__SetTool        : (tool) => { tools.push(tool); return tool; }
});
const pcStubs = {
    Na__LeCfg__GetGuards               : KeyMap.Na__LeCfg__GetGuards,
    Na__LeCfg__GetKeyboardSetup        : KeyMap.Na__LeCfg__GetKeyboardSetup,
    Na__LeCfg__MatchPointerBinding     : KeyMap.Na__LeCfg__MatchPointerBinding,
    Na__LeCfg__MatchWheelBinding       : KeyMap.Na__LeCfg__MatchWheelBinding,
    Na__LeCfg__MatchKeyBinding         : KeyMap.Na__LeCfg__MatchKeyBinding,
    Na__LeCfg__IsPointerModifierBound  : KeyMap.Na__LeCfg__IsPointerModifierBound,
    Na__LeCfg__GetNavigationSetup      : () => ({ zoomWheelStep : 0.001 }),
    Na__LeSurface__GetElements         : () => ({ stage : STAGE }),
    Na__LeSurface__GetZoom             : () => 1,
    Na__KeyScope__ControlKeepsKey      : Scope.Na__KeyScope__ControlKeepsKey
};
const tickThenPaperThenM = async (pcFile) => {
    const PcUnderTest = await loadFile(pcFile, pcStubs);
    stageListeners.length = 0; tools.length = 0;
    PcUnderTest.Na__LePc__Attach();
    const tick = el('INPUT', { type : 'checkbox' });
    document.activeElement = tick;                                               // <-- The panel checkbox was just ticked
    const press = { target : el('DIV', { onStage : true }), button : 0, pointerType : 'mouse', preventDefault() {} };
    stageListeners.filter((l) => l.type === 'pointerdown' && l.capture).forEach((l) => l.fn(press));   // <-- A press on the paper (capture phase, before the tools)
    const event = { key : 'm', code : 'KeyM', target : document.activeElement, ctrlKey : false, shiftKey : false, altKey : false, metaKey : false, repeat : false, prevented : false, preventDefault() { this.prevented = true; } };
    Keys.Na__LeTools__OnKey(event);                                              // <-- M arrives where the focus now is
    PcUnderTest.Na__LePc__Detach();
    return [ document.activeElement === STAGE ? 'stage' : 'checkbox', tools.slice() ];
};
check('built PC controls 1.4.0: the press takes the keyboard from the checkbox and M picks Move',
    await tickThenPaperThenM(resolve(SRC_BUILT, '51__System__LayoutEditor/10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js')), [ 'stage', [ ToolsState.Na__LeTools__TOOL_MOVE ] ]);
check('pre-image PC controls 1.1.0 (the bug): the checkbox keeps the keyboard and M does nothing',
    await tickThenPaperThenM(resolve(PRE, 'Na__LayoutEditor__Controls__Pc__.js')), [ 'checkbox', [] ]);

// E. Acceptance 4: the 3D keys under a drawing tab and on the 3D Model tab -------
console.log('\n  E. R, B, T, Y, V, 1-9, Page Up and Page Down: nothing in the 3D view under a drawing; as today on the 3D tab');
const ScopeE = await loadFile(resolve(SRC_LIVE, '03__AppUtils/Na__AppUtils__KeyScope__.js'));
const dictionary = JSON.parse(readFileSync(resolve(SRC_LIVE, '02__AppData/Na__Hotkeys__3dModelTab__.json'), 'utf8'));
globalThis.fetch = async () => ({ ok : true, status : 200, json : async () => dictionary });
const Hot = await loadFile(resolve(SRC_LIVE, '03__AppUtils/Na__AppUtils__ValeVision__HotkeyHandler__.js'), {
    Na__KeyScope__MODEL           : ScopeE.Na__KeyScope__MODEL,
    Na__KeyScope__Is              : ScopeE.Na__KeyScope__Is,
    Na__KeyScope__IsTypingTarget  : ScopeE.Na__KeyScope__IsTypingTarget
});
const ran3d = [];
const cb = (name) => () => ran3d.push(name);
const callbacks = {
    ValeVision__NavMode__ResetView : cb('reset'), ValeVision__NavMode__SetOrbitMode : cb('orbit'), ValeVision__NavMode__SetWalkMode : cb('walk'),
    ValeVision__NavMode__SetFlyMode : cb('fly'), ValeVision__PresentationMode__ToggleViewsPanel : cb('carousel'),
    ValeVision__PresentationMode__NextScene : cb('next'), ValeVision__PresentationMode__PrevScene : cb('previous')
};
for (let index = 1; index <= 9; index++) callbacks['ValeVision__PresentationMode__GoToScene' + index] = cb('scene' + index);
const beforeHot = windowListeners.length;
Hot.Na__ValeVision__HotkeyHandler__Initialize(callbacks);
await new Promise((r) => setTimeout(r, 20));
const hot = windowListeners.slice(beforeHot).find((l) => l.type === 'keydown');
let scopeNow = ScopeE.Na__KeyScope__MODEL;
ScopeE.Na__KeyScope__Follow(() => scopeNow);
const KEYS3D = [ 'r', 'b', 't', 'y', 'v', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'PageUp', 'PageDown' ];
const press3d = (scope) => KEYS3D.map((k) => { scopeNow = scope; ran3d.length = 0; document.activeElement = BODY; const e = { key : k, target : BODY, ctrlKey : false, shiftKey : false, altKey : false, metaKey : false, prevented : false, preventDefault() { this.prevented = true; } }; hot.fn(e); return ran3d.slice().concat(e.prevented ? [ 'taken' ] : []).join('+') || '-'; });
check('with a drawing open (sheet scope) none of them reaches the 3D view or is taken', press3d(ScopeE.Na__KeyScope__SHEET).filter((r) => r !== '-'), []);
// The 3D key file binds Page Up to the NEXT scene and Page Down to the previous one - this app's binding since
// 25-Jun-2026 and TrueVision's at the pin alike (its presentation_next_scene row) - so "as today" is that.
check('on the 3D Model tab they work as today (Page Up the next scene, Page Down the previous, as both apps bind them)', press3d(ScopeE.Na__KeyScope__MODEL),
    [ 'reset+taken', 'orbit+taken', 'walk+taken', 'fly+taken', 'carousel+taken', 'scene1+taken', 'scene2+taken', 'scene3+taken', 'scene4+taken', 'scene5+taken', 'scene6+taken', 'scene7+taken', 'scene8+taken', 'scene9+taken', 'next+taken', 'previous+taken' ]);

console.log('\n  ' + passes + ' passed, ' + failures + ' failed' + (LIVE ? ' (live tree)' : ' (built files)'));
process.exit(failures ? 1 : 0);
