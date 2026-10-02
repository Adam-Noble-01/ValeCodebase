// =============================================================================
// W1-32 scratch harness (not shipped): the mode controller with every import stubbed
// =============================================================================
//
// usage: node verify_w1_32.mjs <ModeController__.js> [--panelhost <PanelHost__.js>]
//
// Loads the given mode controller with each imported name replaced by a
// recording stub (constants by their name, the key scope's by 'model' /
// 'sheet' / 'document'), a browser just big enough, and test-only exports
// appended for the internals that exist in that file. Runs the W1-32
// acceptance at unit level: the key scope hand-over, the documents'
// keyboard wait and start, Walk left on entry, the viewport fold, the
// document views, EnterUnder's Quiet flag, PreloadMetrics' promise, and the
// VV seams kept. Exit 0 = every check passed. Writes only to the OS temp folder.
// =============================================================================

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const FILE      = resolve(process.argv[2]);
const atHost    = process.argv.indexOf('--panelhost');
const PANELHOST = atHost !== -1 ? resolve(process.argv[atHost + 1]) : null;
const SCRATCH   = mkdtempSync(join(tmpdir(), 'w1-32-mc-'));

let failures = 0, passes = 0;
function check(name, got, want) {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (ok) passes++; else failures++;
    console.log((ok ? '  PASS  ' : '  FAIL  ') + name);
    if (!ok) console.log('        got  ' + JSON.stringify(got) + '\n        want ' + JSON.stringify(want));
}

// -----------------------------------------------------------------------------
// The module, its imports stubbed
// -----------------------------------------------------------------------------
const original = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const imported = [];
let body = original.replace(/^[ \t]*import\s*\{([\s\S]*?)\}\s*from\s*'[^']+';[^\n]*$/gm, (whole, names) => {
    names.split(',').map((name) => name.trim()).filter(Boolean).forEach((name) => imported.push(name));
    return '';
});
if (/^\s*import\s/m.test(body)) { console.error('an import survived'); process.exit(2); }
const SCOPES = { Na__KeyScope__MODEL : 'model', Na__KeyScope__SHEET : 'sheet', Na__KeyScope__DOCUMENT : 'document' };
const stubLines = imported.map((name) => /__[A-Z][A-Z0-9_]*$/.test(name)
    ? 'const ' + name + ' = ' + JSON.stringify(SCOPES[name] || name) + ';'
    : 'const ' + name + ' = (...args) => globalThis.__W132.call(' + JSON.stringify(name) + ', args);');
const has = (pattern) => pattern.test(original);
const extra = [];
const internals = [ 'Active', 'View', 'Metrics' ].concat(has(/\blet\s+Na__LeMode__Quiet\b/) ? [ 'Quiet' ] : []);
extra.push('export function __t_Internals() { return { ' + internals.map((n) => n + ' : Na__LeMode__' + n).join(', ') + ' }; }');
const fns = [ 'EnterUnder', 'SectionForKind', 'FocusPanelFor', 'FocusPanelForSelection', 'PreloadMetrics', 'KeyScope' ]
    .filter((n) => has(new RegExp('function\\s+Na__LeMode__' + n + '\\(')));
extra.push('export { ' + fns.map((n) => 'Na__LeMode__' + n + ' as __t_' + n).join(', ') + ' };');
if (has(/const\s+Na__LeMode__FOLD_GROUP\b/)) extra.push('export { Na__LeMode__FOLD_GROUP as __t_FOLD_GROUP };');
const moduleText = stubLines.join('\n') + '\n' + body + '\n' + extra.join('\n') + '\n';
const moduleFile = join(SCRATCH, 'ModeController.under-test.mjs');
writeFileSync(moduleFile, moduleText, 'utf8');
let instance = 0;
async function fresh() { return import(pathToFileURL(moduleFile).href + '?i=' + (++instance)); }

// -----------------------------------------------------------------------------
// The stubs' answers, the call log and a browser just big enough
// -----------------------------------------------------------------------------
const SHEET_A = { Sheet__Id : 'A' }, SHEET_B = { Sheet__Id : 'B' };
const state = {};
function resetState() {
    Object.assign(state, {
        log : [], layoutMode : true, sheets : [ SHEET_A, SHEET_B ], active : null, selection : [], viewer : false,
        focusOnSelect : true, pdf : () => Promise.resolve({}), readers : [], getSheetsThrows : false, quietSeen : []
    });
}
resetState();
const answers = {
    Na__LeCfg__Ready : () => Promise.resolve(true), Na__LeEdge__Ready : () => Promise.resolve(true), Na__LeComposite__Ready : () => Promise.resolve(true),
    Na__LeGrad__Ready : () => Promise.resolve(true), Na__LeDash__Ready : () => Promise.resolve(true), Na__DrawCfg__Load : () => Promise.resolve(true),
    Na__LeDocKeys__Ready : () => Promise.resolve(true),
    Na__LeCfg__IsEnabled : () => true, Na__LeCfg__IsReadOnlyOnWeb : () => false, Na__DevGate__IsAuthoringEnabled : () => true,
    Na__LeCfg__GetLabel : (key, fallback) => fallback,
    Na__LeCfg__GetPanelSetup : () => ({ focusOnSelect : state.focusOnSelect, accordion : [ 'text', 'dimensions', 'shapes', 'leaders' ] }),
    Na__LeVw__IsViewerMode : () => state.viewer,
    Na__DrawData__GetLayoutModeEnabled : () => state.layoutMode,
    Na__LeModel__GetSheets : () => { if (state.getSheetsThrows) throw new Error('half way through opening'); return state.sheets; },
    Na__LeModel__GetSheetById : (id) => state.sheets.find((sheet) => sheet.Sheet__Id === id) || null,
    Na__LeModel__GetActiveSheet : () => state.active,
    Na__LeModel__SetActiveSheetId : (id) => { state.active = id ? state.sheets.find((sheet) => sheet.Sheet__Id === id) || null : null; },
    Na__LeModel__GetViewports : () => [],
    Na__LeModel__GetSelectionItems : () => state.selection,
    Na__LeGroup__Expand : (sheet, items) => items,
    Na__LePdf__EnsureJsPdf : () => state.pdf(),
    Na__LeSpec__EnsureLoaded : () => Promise.resolve(true),
    Na__KeyScope__Follow : (reader) => { state.readers.push(reader); return typeof reader === 'function'; },
    Na__LePanels__FocusSection : (id) => true,
    Na__LeVeil__Dismiss3d : () => { if (globalThis.__W132.module && globalThis.__W132.module.__t_Internals) state.quietSeen.push(globalThis.__W132.module.__t_Internals().Quiet); }
};
globalThis.__W132 = {
    module : null,
    call(name, args) { state.log.push({ name, args }); const answer = answers[name]; return typeof answer === 'function' ? answer(...args) : undefined; }
};
function fakeElement() {
    const element = {
        id : '', className : '', hidden : false, innerHTML : '', style : {}, title : '', textContent : '',
        classList : { set : new Set(), add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); }, contains(c) { return this.set.has(c); }, toggle() {} },
        appendChild(child) { return child; }, querySelector() { return fakeElement(); }, querySelectorAll() { return []; }, contains() { return false; },
        setAttribute() {}, blur() {}
    };
    return element;
}
const windowListeners = [], documentListeners = [], dispatched = [];
globalThis.window = {
    addEventListener : (type, fn, capture) => { windowListeners.push({ type, fn, capture : !!capture }); state.log.push({ name : 'window.addEventListener', args : [ type ] }); },
    dispatchEvent : (event) => { dispatched.push(event); return true; },
    requestAnimationFrame : () => 1
};
const pageBody = fakeElement();
globalThis.document = {
    body : pageBody, activeElement : null,
    addEventListener : (type, fn, capture) => { documentListeners.push({ type, fn, capture : !!capture }); state.log.push({ name : 'document.addEventListener', args : [ type, !!capture ] }); },
    getElementById : () => null, createElement : () => fakeElement(), querySelectorAll : () => []
};
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
const calls   = (name) => state.log.filter((entry) => entry.name === name);
const indexOf = (name) => state.log.findIndex((entry) => entry.name === name);
const settle  = () => new Promise((done) => setTimeout(done, 0));

console.log('W1-32 mode controller harness: ' + FILE);

// -----------------------------------------------------------------------------
// 1 | Initialise: the key scope hand-over, the documents' keyboard
// -----------------------------------------------------------------------------
console.log('\n  1. Initialise');
let M = await fresh(); globalThis.__W132.module = M;
const ready = await M.Na__LeMode__Initialize({ showToast : null, appConfig : null });
check('Initialize resolves true', ready, true);
check('the key scope is handed one reader, a function', [ state.readers.length, typeof state.readers[0] ], [ 1, 'function' ]);
check('handed over before anything is waited on', [ indexOf('Na__KeyScope__Follow') !== -1, indexOf('Na__KeyScope__Follow') < indexOf('Na__LeCfg__Ready') ], [ true, true ]);
check('the documents\' key map is waited on with the other configs (once)', calls('Na__LeDocKeys__Ready').length, 1);
check('the documents\' keyboard is started once, after the model, before the editor\'s own Ctrl+S',
    [ calls('Na__LeDocKeys__Initialize').length, indexOf('Na__LeModel__Initialize') < indexOf('Na__LeDocKeys__Initialize'),
      indexOf('Na__LeDocKeys__Initialize') < state.log.findIndex((e) => e.name === 'document.addEventListener' && e.args[0] === 'keydown') ], [ 1, true, true ]);
const reader = state.readers[0];
check('the reader: the editor shut is the 3D model\'s', typeof reader === 'function' ? reader() : null, 'model');
check('the scene-broadcast listeners are still registered (VV 1.15.1)',
    [ 'na-presentation-mode-scenes-loaded', 'na-presentation-mode-scenes-cleared' ].map((type) => windowListeners.some((l) => l.type === type)), [ true, true ]);

// -----------------------------------------------------------------------------
// 2 | Enter, the specification, back, and Leave
// -----------------------------------------------------------------------------
console.log('\n  2. Enter, the specification, back to the sheet, Leave');
state.log.length = 0;
check('Enter(null) opens the first sheet', M.Na__LeMode__Enter(null), true);
check('Walk and Fly are asked to leave: SuspendThreeD({ returnToOrbit : true }), once', calls('Na__DrawView__Transitions__SuspendThreeD').map((c) => c.args), [ [ { returnToOrbit : true } ] ]);
check('the reader on a drawing tab: the sheet\'s', typeof reader === 'function' ? reader() : null, 'sheet');
check('the PDF metrics are asked for once on the first entry', calls('Na__LePdf__EnsureJsPdf').length, 1);
check('OpenSpecification() shows the page over the sheet', M.Na__LeMode__OpenSpecification(), true);
check('the reader on the specification: the documents\'', typeof reader === 'function' ? reader() : null, 'document');
check('the view is the specification', M.Na__LeMode__GetView(), 'spec');
state.log.length = 0;
check('Enter(the same sheet) from the specification', M.Na__LeMode__Enter('A'), true);
check('it comes back to the sheet: the page hidden, the sheet\'s input attached, the reader the sheet\'s',
    [ calls('Na__LeSpecEd__Hide').length, calls('Na__LePc__Attach').length, M.Na__LeMode__GetView(), typeof reader === 'function' ? reader() : null ], [ 1, 1, 'sheet', 'sheet' ]);
check('no second Walk exit while the editor stays open', calls('Na__DrawView__Transitions__SuspendThreeD').length, 0);
state.log.length = 0;
check('Leave() gives the 3D view back', M.Na__LeMode__Leave(), true);
check('the reader once the editor is shut: the 3D model\'s again', typeof reader === 'function' ? reader() : null, 'model');
check('Leave announces once, after the return veil', [ calls('Na__LeVeil__ReturnTo3d').length, dispatched.length > 0 ], [ 1, true ]);

// -----------------------------------------------------------------------------
// 3 | The viewport fold (SectionForKind, FocusPanelFor, FocusPanelForSelection)
// -----------------------------------------------------------------------------
console.log('\n  3. The viewport fold');
M.Na__LeMode__Enter('A');
const focusAfter = (selection) => {
    state.selection = selection; state.log.length = 0;
    const result = M.__t_FocusPanelForSelection ? M.__t_FocusPanelForSelection() : 'missing';
    return [ result, calls('Na__LePanels__FocusSection').map((c) => c.args[0]) ];
};
check('a viewport selected: FocusSection(null) - the whole group folds', focusAfter([ { kind : 'viewport', id : 'v1' } ]), [ true, [ null ] ]);
check('two viewports: the same', focusAfter([ { kind : 'viewport', id : 'v1' }, { kind : 'viewport', id : 'v2' } ]), [ true, [ null ] ]);
check('a text selected: Text opens, the rest fold', focusAfter([ { kind : 'annotation', id : 't1' } ]), [ true, [ 'text' ] ]);
check('a vector selected: Vectors (shapes)', focusAfter([ { kind : 'shape', id : 's1' } ]), [ true, [ 'shapes' ] ]);
check('a group of notes: Text (the group is opened up first)', focusAfter([ { kind : 'group', id : 'g1' }, { kind : 'annotation', id : 't1' } ]), [ true, [ 'text' ] ]);
check('nothing selected: the folds are left alone', focusAfter([]), [ false, [] ]);
check('a mixed selection: no one panel, the folds are left alone', focusAfter([ { kind : 'annotation', id : 't1' }, { kind : 'viewport', id : 'v1' } ]), [ false, [] ]);
state.log.length = 0;
check('the eyedropper picking from a viewport folds the group too', [ M.__t_FocusPanelFor ? M.__t_FocusPanelFor('viewport') : 'missing', calls('Na__LePanels__FocusSection').map((c) => c.args[0]) ], [ true, [ null ] ]);
state.log.length = 0;
check('an unknown kind says nothing', [ M.__t_FocusPanelFor ? M.__t_FocusPanelFor('register-row') : 'missing', calls('Na__LePanels__FocusSection').length ], [ false, 0 ]);
check('SectionForKind: viewport is FOLD_GROUP (an empty string, not null); a group is null',
    M.__t_SectionForKind ? [ M.__t_SectionForKind('viewport', []), M.__t_FOLD_GROUP, M.__t_SectionForKind('group', []), M.__t_SectionForKind('leader', []) ] : 'missing', [ '', '', null, 'leaders' ]);
state.focusOnSelect = false;
check('with FocusSectionOnSelect off nothing folds', focusAfter([ { kind : 'viewport', id : 'v1' } ]), [ false, [] ]);
state.focusOnSelect = true;

// The real panel host's FocusSection, run on what the mode controller hands it.
if (PANELHOST) {
    const host = readFileSync(PANELHOST, 'utf8').replace(/\r\n/g, '\n');
    const at   = host.indexOf('function Na__LePanels__FocusSection(');
    let depth = 0, end = -1;
    for (let index = host.indexOf('{', at); index < host.length; index++) { if (host[index] === '{') depth++; else if (host[index] === '}') { depth--; if (depth === 0) { end = index + 1; break; } } }
    const folded = {};
    const runFocus = new Function('Na__LeCfg__GetPanelSetup', 'Na__LePanels__SetFolded', 'Na__LePanels__Sections', host.slice(at, end) + '\nreturn Na__LePanels__FocusSection;')(
        () => ({ accordion : [ 'text', 'dimensions', 'shapes', 'leaders' ] }),
        (id, value) => { const changed = folded[id] !== value; folded[id] = value; return changed; },
        new Map());
    [ 'text', 'dimensions', 'shapes', 'leaders' ].forEach((id) => { folded[id] = false; });   // <-- all four standing open over a drawing
    state.selection = [ { kind : 'viewport', id : 'v1' } ];
    state.log.length = 0;
    M.__t_FocusPanelForSelection && M.__t_FocusPanelForSelection();
    calls('Na__LePanels__FocusSection').forEach((c) => runFocus(c.args[0]));
    check('with the real panel host: selecting a viewport folds Text, Dimensions, Vectors and Leaders', folded, { text : true, dimensions : true, shapes : true, leaders : true });
    state.selection = [ { kind : 'annotation', id : 't1' } ];
    state.log.length = 0;
    M.__t_FocusPanelForSelection && M.__t_FocusPanelForSelection();
    calls('Na__LePanels__FocusSection').forEach((c) => runFocus(c.args[0]));
    check('and selecting a text then opens Text alone', folded, { text : false, dimensions : true, shapes : true, leaders : true });
    state.selection = [];
    state.log.length = 0;
    M.__t_FocusPanelForSelection && M.__t_FocusPanelForSelection();
    calls('Na__LePanels__FocusSection').forEach((c) => runFocus(c.args[0]));
    check('and clearing the selection leaves the folds as they were', folded, { text : false, dimensions : true, shapes : true, leaders : true });
}

// -----------------------------------------------------------------------------
// 4 | The document views: names, refusing entry points, EnterUnder's Quiet flag
// -----------------------------------------------------------------------------
console.log('\n  4. The document views');
check('VIEW_REGISTER and VIEW_STATEMENT are TrueVision\'s names', [ M.Na__LeMode__VIEW_REGISTER, M.Na__LeMode__VIEW_STATEMENT ], [ 'register', 'statement' ]);
const warned = []; const keepWarn = console.warn; console.warn = (...args) => warned.push(String(args[0]));
state.log.length = 0;
const viewBefore       = M.Na__LeMode__GetView();
const dispatchedBefore = dispatched.length;
const refused = [ typeof M.Na__LeMode__OpenRegister === 'function' ? M.Na__LeMode__OpenRegister({ view : 'read' }) : 'missing', typeof M.Na__LeMode__OpenStatements === 'function' ? M.Na__LeMode__OpenStatements() : 'missing' ];
console.warn = keepWarn;
check('OpenRegister and OpenStatements refuse: false, nothing opened, changed or announced', [ refused, M.Na__LeMode__GetView() === viewBefore, calls('Na__LeModel__SetActiveSheetId').length, dispatched.length === dispatchedBefore ], [ [ false, false ], true, 0, true ]);
check('each says so once, under this app\'s prefix', warned.map((line) => line.startsWith('[ValeVision3D] ')), [ true, true ]);
M.Na__LeMode__Leave();
if (M.__t_EnterUnder) {
    state.quietSeen.length = 0;
    const opened = M.__t_EnterUnder();
    check('EnterUnder from the 3D view opens the first sheet with Quiet set, and clears it after', [ opened, state.quietSeen, M.__t_Internals().Quiet, M.Na__LeMode__IsActive() ], [ true, [ true ], false, true ]);
    state.log.length = 0;
    check('EnterUnder with the editor already open does nothing more', [ M.__t_EnterUnder(), calls('Na__LeVeil__Dismiss3d').length ], [ true, 0 ]);
    M.Na__LeMode__Leave();
    state.getSheetsThrows = true;
    let threw = false;
    try { M.__t_EnterUnder(); } catch (error) { threw = true; }
    state.getSheetsThrows = false;
    check('a way in that fails half way still clears Quiet', [ threw, M.__t_Internals().Quiet ], [ true, false ]);
    state.quietSeen.length = 0;
    M.Na__LeMode__Enter(null);
    check('an ordinary Enter is never quiet', state.quietSeen, [ false ]);
    M.Na__LeMode__Leave();
} else check('EnterUnder exists', false, true);

// -----------------------------------------------------------------------------
// 5 | PreloadMetrics returns its promise
// -----------------------------------------------------------------------------
console.log('\n  5. PreloadMetrics');
M = await fresh(); globalThis.__W132.module = M;
if (M.__t_PreloadMetrics) {
    state.pdf = () => Promise.reject(new Error('jsPDF failed'));
    const first  = M.__t_PreloadMetrics();
    const second = M.__t_PreloadMetrics();
    check('the first call returns the promise, a second the null of "already asked"', [ !!first && typeof first.then === 'function', second ], [ true, null ]);
    let rejected = false;
    await first.catch(() => { rejected = true; });
    await settle();
    state.pdf = () => Promise.resolve({});
    const third = M.__t_PreloadMetrics();
    check('a failed load never rejects to its waiter, and the next call asks again', [ rejected, !!third && typeof third.then === 'function' ], [ false, true ]);
}

// -----------------------------------------------------------------------------
// 6 | The seams kept
// -----------------------------------------------------------------------------
console.log('\n  6. The VV seams');
M = await fresh(); globalThis.__W132.module = M;
resetState();
await M.Na__LeMode__Initialize({ showToast : null, appConfig : null });
state.layoutMode = false;
check('Layout Mode off: Enter refuses (IsAvailable, DR-25)', M.Na__LeMode__Enter(null), false);
state.layoutMode = true;
check('the VV-only exports are still there', [ 'Na__LeMode__WaitForFirstDrawing', 'Na__LeMode__IsAvailable', 'Na__LeMode__IsLayoutModeOn', 'Na__LeMode__SetLayoutMode' ].map((name) => typeof M[name]), [ 'function', 'function', 'function', 'function' ]);
check('WaitForFirstDrawing answers at once with the editor shut', await M.Na__LeMode__WaitForFirstDrawing(), true);

console.log('\n  ' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
