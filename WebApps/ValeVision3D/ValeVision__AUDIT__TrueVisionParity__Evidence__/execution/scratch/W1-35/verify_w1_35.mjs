// =============================================================================
// W1-35 HARNESS - the toolbar slimmed to TrueVision's 1.17.0 / 1.19.0, and the config cleanup
// =============================================================================
//
// usage: node verify_w1_35.mjs [--root <VV app root>] [--toolbar <candidate toolbar file>]
//                              [--config <candidate AppConfig file>] [--pre-config <pre-image AppConfig>]
//
// A  static: the toolbar's imports, code, listeners and the Mount tail against TrueVision's file at b2aa9151
// B  running: this app's toolbar AND TrueVision's toolbar (git show at the pin) mounted in a fake DOM over
//    stand-ins; this app's strip must be TrueVision's strip with TrueVision's not-yet-here controls taken out
// C  the AppConfig: MarginToggle keys gone, the MarginNotes block TrueVision's, nothing else moved
// D  the kept paths, read from the live tree: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z through the real KeyMap and
//    the shipped key file, the zoom keys, the right-click Zoom to fit, Show notes margin, undo's re-announce
// E  the header records (PURPOSE, DESCRIPTION, INTEGRATION, PORT NOTE, log)
// F  a grep of 02__Src__AppModules for MarginToggle and the five buttons' names
//
// Reads only (the live tree, TrueVision with git show at the pin); writes stand-in trees to the OS temp
// folder and deletes them. Exit 0 = every check passed.
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const opt  = (n) => { const i = argv.indexOf(n); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null; };
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = opt('--root') || 'D:\\10_CoreLib__ValeCodebase\\WebApps\\ValeVision3D';
const LE   = '02__Src__AppModules/51__System__LayoutEditor/';
const P = {
    toolbar     : LE + '40__Ui__Panels/Na__LayoutEditor__Toolbar__.js',
    config      : LE + '03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    hotkeys     : LE + '03__Core__Config/Na__Hotkeys__DrawingTabs__.json',
    keymap      : LE + '03__Core__Config/Na__LayoutEditor__ConfigState__KeyMap__.js',
    keyboard    : LE + '30__System__SheetTools/Na__LayoutEditor__SheetTools__Keyboard__.js',
    ctxmenu     : LE + '30__System__SheetTools/Na__LayoutEditor__SheetTools__ContextMenu__.js',
    controls    : LE + '10__Core__SheetSurface/Na__LayoutEditor__Controls__Pc__.js',
    marginPanel : LE + '50__Feature__Specification/Na__LayoutEditor__Panel__MarginNotes__.js',
    history     : LE + '07__Core__SheetData/Na__LayoutEditor__History__.js',
    sheets      : LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__Sheets__.js',
    modelState  : LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__State__.js'
};
const TOOLBAR_FILE    = opt('--toolbar') || join(ROOT, P.toolbar);
const CONFIG_FILE     = opt('--config') || join(ROOT, P.config);
const PRE_CONFIG_FILE = opt('--pre-config') || join(HERE, 'preimage', 'Na__LayoutEditor__AppConfig__.json');
const TV_REPO = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const PIN     = 'b2aa9151';

const lf     = (s) => s.replace(/\r\n/g, '\n');
const readVv = (rel) => lf(readFileSync(join(ROOT, rel), 'utf8'));
const readTv = (rel) => execFileSync('git', [ '-C', TV_REPO, 'show', PIN + ':na-apps/30__TrueVision__CoreAppCode/' + rel ], { encoding : 'utf8', maxBuffer : 64 << 20 });

let passed = 0, failed = 0;
const failures = [];
function check(name, ok, detail) {
    if (ok) { passed++; console.log('  PASS  ' + name); return; }
    failed++; failures.push(name);
    console.log('  FAIL  ' + name + (detail !== undefined ? '\n        ' + JSON.stringify(detail).slice(0, 600) : ''));
}
function section(title) { console.log('\n' + title); }

// Strip comments from JavaScript (strings kept; the toolbar has no regex literal holding // or /*)
function stripJs(code) {
    let out = '', i = 0;
    while (i < code.length) {
        const c = code[i], d = code[i + 1];
        if (c === '/' && d === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
        if (c === '/' && d === '*') { const end = code.indexOf('*/', i + 2); i = end < 0 ? code.length : end + 2; continue; }
        if (c === '\'' || c === '"' || c === '`') {
            let j = i + 1;
            while (j < code.length && code[j] !== c) { if (code[j] === '\\') j++; j++; }
            out += code.slice(i, j + 1); i = j + 1; continue;
        }
        out += c; i++;
    }
    return out;
}
const importsOf = (code) => [ ...stripJs(code).matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*'([^']+)'\s*;/g) ]
    .map((m) => ({ path : m[2], names : m[1].split(',').map((s) => s.trim()).filter(Boolean) }));
const exportsOf = (code) => { const m = stripJs(code).match(/export\s*\{([\s\S]*?)\}\s*;/); return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : []; };
function fnBody(code, name) {
    const at = code.indexOf('function ' + name + '(');
    if (at < 0) return null;
    let i = code.indexOf('{', at), depth = 0;
    for (; i < code.length; i++) { if (code[i] === '{') depth++; else if (code[i] === '}' && --depth === 0) break; }
    return code.slice(code.indexOf('{', at), i + 1);
}
const between = (text, a, b) => { const i = text.indexOf(a); if (i < 0) return null; const j = text.indexOf(b, i + a.length); return j < 0 ? null : text.slice(i, j); };

const vvToolbar = lf(readFileSync(TOOLBAR_FILE, 'utf8'));
const tvToolbar = readTv(P.toolbar);
const vvCode    = stripJs(vvToolbar);
const tvCode    = stripJs(tvToolbar);

// The TrueVision controls this app has not got yet, each waiting for its feature (PORT NOTE "Not here yet")
const TV_ONLY_PATHS = [
    '../37__System__VectorTools/Na__LayoutEditor__VectorTools__State__.js',
    '../37__System__VectorTools/Na__LayoutEditor__VectorTools__Setup__.js',
    '../28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js',
    '../28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Menu__.js',
    '../32__System__OrthoMode/Na__LayoutEditor__OrthoMode__.js',
    '../66__Feature__DocumentSharing/Na__LayoutEditor__Share__Button__.js',
    '../20__System__Viewports/Na__LayoutEditor__VectorQuality__.js',
    '../26__System__DraftMode/Na__LayoutEditor__DraftMode__.js',
    '../27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__.js',
    '../33__System__DrawingAxes/Na__LayoutEditor__DrawingAxes__.js',
    '../54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Insert__.js',
    '../54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Setup__.js'
];
const VV_SNAP_SEAM = '../30__System__SheetTools/Na__LayoutEditor__Snapping__.js';
const GONE_PATHS = [
    '../07__Core__SheetData/Na__LayoutEditor__History__.js',
    '../10__Core__SheetSurface/Na__LayoutEditor__Navigation__.js',
    '../10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js',
    '../07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js'
];

// -----------------------------------------------------------------------------
// A | STATIC
// -----------------------------------------------------------------------------
section('A. Static: the toolbar\'s imports, code and listeners against TrueVision\'s file at ' + PIN);
const vvImports = importsOf(vvToolbar), tvImports = importsOf(tvToolbar);
const vvPaths = vvImports.map((i) => i.path), tvPaths = tvImports.map((i) => i.path);
check('no import of History, Navigation, SheetSurface or SheetRecords (TrueVision 1.17.0 / 1.19.0)', GONE_PATHS.every((p) => !vvPaths.includes(p)), vvPaths.filter((p) => GONE_PATHS.includes(p)));
const vvModel = (vvImports.find((i) => i.path.endsWith('Na__LayoutEditor__SheetModel__.js')) || { names : [] }).names;
const tvModel = (tvImports.find((i) => i.path.endsWith('Na__LayoutEditor__SheetModel__.js')) || { names : [] }).names;
check('the SheetModel import names exactly TrueVision\'s five (UpdateMarginNotes gone)', JSON.stringify(vvModel) === JSON.stringify(tvModel) && tvModel.length === 5, { vv : vvModel, tv : tvModel });
check('every other import is one TrueVision\'s file makes, or the Snapping seam (W2-19 repoints it)',
    vvPaths.every((p) => p === VV_SNAP_SEAM || tvPaths.includes(p)), vvPaths.filter((p) => p !== VV_SNAP_SEAM && !tvPaths.includes(p)));
check('every TrueVision import missing here is a not-yet-here feature module (' + TV_ONLY_PATHS.length + ')',
    JSON.stringify(tvPaths.filter((p) => !vvPaths.includes(p)).sort()) === JSON.stringify(TV_ONLY_PATHS.slice().sort()), tvPaths.filter((p) => !vvPaths.includes(p)));
check('each shared import takes no name TrueVision\'s does not (SheetTools lacks only TOOL_AREA)',
    vvImports.filter((i) => tvPaths.includes(i.path)).every((i) => i.names.every((n) => tvImports.find((t) => t.path === i.path).names.includes(n))));
const GONE_NAMES = [ 'Na__LeHist__', 'Na__LeNav__', 'Na__LeSurface__', 'Na__LeRec__', 'UpdateMarginNotes', 'MarginToggle',
                     'data-na-toolbar="undo"', 'data-na-toolbar="redo"', 'data-na-toolbar="zoom"', 'data-na-toolbar="margin"',
                     "'undo'", "'redo'", "'fit'", "'zoom'", "'margin'", "'100%'", 'GetZoom', 'CanUndo', 'CanRedo' ];
check('the code names none of the five buttons, their state or their modules', GONE_NAMES.every((n) => !vvCode.includes(n)), GONE_NAMES.filter((n) => vvCode.includes(n)));
const listOf = (code, verb) => { const m = code.match(new RegExp('\\[([^\\]]*?)\\]\\.forEach\\(\\(name\\) => window\\.' + verb + '\\(name, Na__LeToolbar__Listeners\\)\\)')); return m ? m[1].split(',').map((s) => s.trim()) : null; };
const vvAdd = listOf(vvCode, 'addEventListener'), vvRem = listOf(vvCode, 'removeEventListener');
const tvAdd = listOf(tvCode, 'addEventListener');
const TV_ONLY_EVENTS = [ 'Na__LeDraft__CHANGED_EVENT', 'Na__LeGrid__CHANGED_EVENT' ];
check('Mount and Unmount list the same events', !!vvAdd && JSON.stringify(vvAdd) === JSON.stringify(vvRem), { vvAdd, vvRem });
check('the events are TrueVision\'s list less Draft and Grid, in TrueVision\'s order (no history, no zoom)',
    !!vvAdd && !!tvAdd && JSON.stringify(vvAdd) === JSON.stringify(tvAdd.filter((e) => !TV_ONLY_EVENTS.includes(e))), { vvAdd, tvAdd });
const tail = (code) => between(code, '            root.appendChild(scopeHint);\n', '        // RASTER');
check('the end of the tool group and the start of Raster are TrueVision\'s lines exactly (one separator, then Raster)',
    tail(vvToolbar) !== null && tail(vvToolbar) === tail(tvToolbar), { vv : tail(vvToolbar), tv : tail(tvToolbar) });
{
    const lines = (code) => (fnBody(code, 'Na__LeToolbar__Sync') || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const tvSet = new Set(lines(tvToolbar));
    const own = lines(vvToolbar).filter((l) => !tvSet.has(l));
    const allowed = [
        "if (snap) { snap.classList.toggle('na-le-toolbar__btn--active', Na__LeOsnap__IsEnabled()); snap.setAttribute('aria-pressed', String(Na__LeOsnap__IsEnabled())); }",
        "if (name) name.textContent = sheet ? Na__LeModel__GetTabLabel(sheet) : '';   // <-- What the tab reads: the short code, then the short name"
    ];
    check('every line of Sync is TrueVision\'s but the plain Snap line (W2-19) and the name comment (no register yet)', own.every((l) => allowed.includes(l)), own.filter((l) => !allowed.includes(l)));
}
check('the exports are unchanged: Mount, Unmount, Save', JSON.stringify(exportsOf(vvToolbar)) === JSON.stringify([ 'Na__LeToolbar__Mount', 'Na__LeToolbar__Unmount', 'Na__LeToolbar__Save' ]), exportsOf(vvToolbar));
check('the Select and Move fallbacks keep this app\'s words (no auto-Move wording, DR-40 item 7)',
    vvCode.includes("'Select (V or space): click to pick, drag from bare paper to box-select. Double-click a group, a vector or a dimension to edit inside it. Press M to move things.'")
    && vvCode.includes("'Move tool (M): drag to move whatever is under the pointer. With the Select tool a drag moves nothing, so nothing is shifted by accident; Escape puts every tool down.'")
    && !/picks the Move tool up|comes up by itself/.test(vvCode));

// -----------------------------------------------------------------------------
// B | RUNNING
// -----------------------------------------------------------------------------
section('B. Running: this app\'s toolbar and TrueVision\'s, mounted over stand-ins in a fake DOM');

class El {
    constructor(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.parent = null; this.attrs = {}; this.cls = new Set(); this.listeners = {}; this.own = ''; this.hidden = false; this.disabled = false; this.title = ''; this.value = ''; this.type = ''; }
    get className() { return [ ...this.cls ].join(' '); }
    set className(v) { this.cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
    get classList() { const el = this; return { add : (...n) => n.forEach((x) => el.cls.add(x)), remove : (...n) => n.forEach((x) => el.cls.delete(x)), toggle : (n, f) => { const on = f === undefined ? !el.cls.has(n) : !!f; if (on) el.cls.add(n); else el.cls.delete(n); return on; }, contains : (n) => el.cls.has(n) }; }
    get textContent() { return this.own + this.children.map((c) => c.textContent).join(''); }
    set textContent(v) { this.children.forEach((c) => { c.parent = null; }); this.children = []; this.own = String(v); }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
    appendChild(n) { if (n.parent) n.parent.removeChild(n); n.parent = this; this.children.push(n); return n; }
    removeChild(n) { this.children = this.children.filter((c) => c !== n); n.parent = null; return n; }
    get parentNode() { return this.parent; }
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
    removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); }
    dispatch(t, extra) { const e = Object.assign({ type : t, target : this, preventDefault() {}, stopPropagation() {} }, extra || {}); (this.listeners[t] || []).slice().forEach((fn) => fn(e)); return e; }
    blur() {}
    matches(sel) {
        let m;
        if ((m = sel.match(/^\[([\w-]+)="([^"]*)"\]$/))) return this.getAttribute(m[1]) === m[2];
        if ((m = sel.match(/^\[([\w-]+)\]$/))) return this.getAttribute(m[1]) !== null;
        if ((m = sel.match(/^\.([\w-]+)$/))) return this.cls.has(m[1]);
        throw new Error('selector not supported by the harness: ' + sel);
    }
    querySelectorAll(sel) { const out = []; const walk = (el) => { for (const c of el.children) { if (c.matches(sel)) out.push(c); walk(c); } }; walk(this); return out; }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

const EV = { tools : 'na-layouteditor-tool-changed', model : 'na-layouteditor-sheets-changed', osnap : 'na-layouteditor-osnap-changed', raster : 'na-layouteditor-raster-changed',
             drop : 'na-layouteditor-eyedropper-changed', scope : 'na-layouteditor-scope-changed', spec : 'na-layouteditor-spec-changed',
             hist : 'na-layouteditor-history-changed', zoom : 'na-layouteditor-zoom-changed',
             draft : 'tv-only-draft', grid : 'tv-only-grid', ortho : 'tv-only-ortho', axes : 'tv-only-axes', vq : 'tv-only-vector-quality' };
const W_ = 'const W = globalThis.__W; const rec = (...a) => W.Calls.push(a);';
const STANDINS = {
    '03__Core__Config/Na__LayoutEditor__ConfigState__.js' : W_ + `
        export function Na__LeCfg__GetLabel(k, f) { const v = W.Labels['LayoutEditor__Labels__' + k]; return typeof v === 'string' ? v : f; }
        export function Na__LeCfg__FormatLabel(k, f, t) { let s = Na__LeCfg__GetLabel(k, f); Object.keys(t || {}).forEach((x) => { s = s.split('{' + x + '}').join(String(t[x])); }); return s; }`,
    '07__Core__SheetData/Na__LayoutEditor__SheetModel__.js' : W_ + `
        export const Na__LeModel__CHANGED_EVENT = '${EV.model}';
        export function Na__LeModel__GetActiveSheet() { return W.Sheet; }
        export function Na__LeModel__GetTabLabel(s) { return s ? s.Code + ' - ' + s.Sheet__Name : ''; }
        export function Na__LeModel__IsDirty() { return W.Dirty === true; }
        export function Na__LeModel__Save() { rec('Save'); return Promise.resolve(true); }
        export function Na__LeModel__UpdateMarginNotes(s, p) { rec('UpdateMarginNotes', p); return true; }`,
    '07__Core__SheetData/Na__LayoutEditor__SheetRecords__.js' : W_ + `export function Na__LeRec__MarginNotes() { return { Enabled : W.Margin === true }; }`,
    '07__Core__SheetData/Na__LayoutEditor__History__.js' : W_ + `
        export const Na__LeHist__CHANGED_EVENT = '${EV.hist}';
        export function Na__LeHist__CanUndo() { return true; } export function Na__LeHist__CanRedo() { return false; }
        export function Na__LeHist__Undo() { rec('Undo'); } export function Na__LeHist__Redo() { rec('Redo'); }`,
    '10__Core__SheetSurface/Na__LayoutEditor__Navigation__.js' : W_ + `export function Na__LeNav__Fit() { rec('Fit'); } export function Na__LeNav__ZoomTo(z) { rec('ZoomTo', z); }`,
    '10__Core__SheetSurface/Na__LayoutEditor__SheetSurface__.js' : W_ + `export const Na__LeSurface__ZOOM_EVENT = '${EV.zoom}'; export function Na__LeSurface__GetZoom() { return 1.62; }`,
    '50__Feature__Specification/Na__LayoutEditor__SpecData__.js' : W_ + `
        export const Na__LeSpec__CHANGED_EVENT = '${EV.spec}';
        export function Na__LeSpec__IsDirty() { return false; }
        export function Na__LeSpec__GetState() { return { dirty : false, canSync : false, conflict : false }; }
        export function Na__LeSpec__Sync() { rec('SpecSync'); return Promise.resolve(true); }`,
    '30__System__SheetTools/Na__LayoutEditor__SheetTools__.js' : W_ + `
        export const Na__LeTools__TOOL_SELECT = 'select', Na__LeTools__TOOL_MOVE = 'move', Na__LeTools__TOOL_TEXT = 'text', Na__LeTools__TOOL_DIMENSION = 'dimension',
                     Na__LeTools__TOOL_DRAW = 'draw', Na__LeTools__TOOL_RECT = 'rectangle', Na__LeTools__TOOL_AREA = 'area', Na__LeTools__TOOL_EYEDROP = 'eyedropper',
                     Na__LeTools__TOOL_LEADER = 'leader', Na__LeTools__CHANGED_EVENT = '${EV.tools}';
        export function Na__LeTools__SetTool(t) { rec('SetTool', t); W.Tool = t; }
        export function Na__LeTools__GetTool() { return W.Tool; }
        export function Na__LeTools__ArmEyedropper() { rec('ArmEyedropper'); }
        export function Na__LeTools__ArmPalette() { rec('ArmPalette'); }`,
    '30__System__SheetTools/Na__LayoutEditor__Eyedropper__.js' : `export const Na__LeDrop__CHANGED_EVENT = '${EV.drop}'; export function Na__LeDrop__GetHint() { return 'hint'; }`,
    '30__System__SheetTools/Na__LayoutEditor__EditScope__.js' : `export const Na__LeScope__CHANGED_EVENT = '${EV.scope}';
        export function Na__LeScope__Get() { return null; } export function Na__LeScope__GetVectorId() { return null; } export function Na__LeScope__GetDimensionId() { return null; }`,
    '30__System__SheetTools/Na__LayoutEditor__Snapping__.js' : W_ + `export const Na__LeOsnap__CHANGED_EVENT = '${EV.osnap}';
        export function Na__LeOsnap__IsEnabled() { return W.Snap === true; } export function Na__LeOsnap__Toggle() { rec('SnapToggle'); W.Snap = !W.Snap; }`,
    '60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js' : W_ + `export function Na__LePdf__ExportSheet(s) { rec('Pdf', s && s.Sheet__Id); return Promise.resolve(true); }`,
    '20__System__Viewports/Na__LayoutEditor__RasterQuality__.js' : W_ + `export const Na__LeRaster__LEVELS = [ 'low', 'medium', 'high' ], Na__LeRaster__CHANGED_EVENT = '${EV.raster}';
        export function Na__LeRaster__Get() { return W.Raster; } export function Na__LeRaster__Set(v) { rec('RasterSet', v); W.Raster = v; }`,
    // TrueVision's not-yet-here features, for TrueVision's own file only
    '37__System__VectorTools/Na__LayoutEditor__VectorTools__State__.js' : `export const Na__LeVec__TOOL_CIRCLE = 'circle', Na__LeVec__TOOL_ARC = 'arc';`,
    '37__System__VectorTools/Na__LayoutEditor__VectorTools__Setup__.js' : `export function Na__LeVecCfg__Label(k, f) { return f; }`,
    '28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__.js' : W_ + `export const Na__LeOsnap__CHANGED_EVENT = '${EV.osnap}';
        export function Na__LeOsnap__IsEnabled() { return W.Snap === true; } export function Na__LeOsnap__Toggle() { W.Snap = !W.Snap; } export function Na__LeOsnap__Label(k, f) { return f; }`,
    '28__System__ObjectSnap/Na__LayoutEditor__ObjectSnap__Menu__.js' : `export function Na__LeOsnap__ToggleMenu() {} export function Na__LeOsnap__CloseMenu() {}`,
    '32__System__OrthoMode/Na__LayoutEditor__OrthoMode__.js' : `export const Na__LeOrtho__CHANGED_EVENT = '${EV.ortho}'; export function Na__LeOrtho__IsOn() { return false; } export function Na__LeOrtho__Toggle() {} export function Na__LeOrtho__Label(k, f) { return f; }`,
    '66__Feature__DocumentSharing/Na__LayoutEditor__Share__Button__.js' : `export function Na__LeShareUi__Open() {}`,
    '20__System__Viewports/Na__LayoutEditor__VectorQuality__.js' : `export const Na__LeVectorQ__LEVELS = [ 'low', 'medium', 'high' ], Na__LeVectorQ__CHANGED_EVENT = '${EV.vq}'; export function Na__LeVectorQ__Get() { return 'medium'; } export function Na__LeVectorQ__Set() {}`,
    '26__System__DraftMode/Na__LayoutEditor__DraftMode__.js' : `export const Na__LeDraft__CHANGED_EVENT = '${EV.draft}'; export function Na__LeDraft__IsOn() { return false; } export function Na__LeDraft__Toggle() {} export function Na__LeDraft__Label(k, f) { return f; }`,
    '27__System__DrawingGrid/Na__LayoutEditor__DrawingGrid__.js' : `export const Na__LeGrid__CHANGED_EVENT = '${EV.grid}'; export function Na__LeGrid__IsShowing() { return false; } export function Na__LeGrid__IsSnapping() { return false; }
        export function Na__LeGrid__ToggleShow() {} export function Na__LeGrid__ToggleSnap() {} export function Na__LeGrid__Label(k, f) { return f; }`,
    '33__System__DrawingAxes/Na__LayoutEditor__DrawingAxes__.js' : `export const Na__LeAxes__CHANGED_EVENT = '${EV.axes}'; export function Na__LeAxes__IsOn() { return false; } export function Na__LeAxes__Toggle() {} export function Na__LeAxes__Label(k, f) { return f; }`,
    '54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Insert__.js' : `export function Na__LeImgIns__Pick() {}`,
    '54__Feature__SheetImages/Na__LayoutEditor__SheetImages__Setup__.js' : `export function Na__LeImgCfg__Label(k, f) { return f; }`
};

const vvLabels = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')).LayoutEditor__Labels__Config;
const tvConfig = JSON.parse(readTv(P.config));
const TEMP = mkdtempSync(join(tmpdir(), 'w135-verify-'));
let caseNo = 0;

const win = new EventTarget();
const registered = new Map();
const addL = win.addEventListener.bind(win), remL = win.removeEventListener.bind(win);
win.addEventListener    = (t, fn, o) => { if (!registered.has(t)) registered.set(t, new Set()); registered.get(t).add(fn); addL(t, fn, o); };
win.removeEventListener = (t, fn, o) => { if (registered.has(t)) registered.get(t).delete(fn); remL(t, fn, o); };
globalThis.window   = win;
globalThis.document = { createElement : (t) => new El(t) };
const live = () => [ ...registered.entries() ].filter(([ , s ]) => s.size > 0).map(([ t ]) => t).sort();

async function LoadToolbar(text, labels) {
    const W = { Calls : [], Labels : labels, Sheet : null, Dirty : false, Snap : false, Tool : 'select', Raster : 'medium', Margin : false };
    globalThis.__W = W;
    const dir = join(TEMP, 'case' + (++caseNo), '51__System__LayoutEditor');
    for (const [ rel, body ] of Object.entries(STANDINS)) { const f = join(dir, rel); mkdirSync(dirname(f), { recursive : true }); writeFileSync(f, body); }
    const file = join(dir, '40__Ui__Panels', 'Na__LayoutEditor__Toolbar__.js');
    mkdirSync(dirname(file), { recursive : true }); writeFileSync(file, text);
    const mod = await import(pathToFileURL(file).href);
    return { W, mod };
}
function Describe(root) {
    const out = [];
    const one = (c) => {
        if (c.cls.has('na-le-toolbar__split')) { c.children.forEach(one); return; }
        if (c.cls.has('na-le-toolbar__gap')) out.push('|');
        else if (c.cls.has('na-le-toolbar__name')) out.push('name');
        else if (c.getAttribute('data-na-tool') !== null) out.push('tool:' + c.getAttribute('data-na-tool'));
        else if (c.getAttribute('data-na-toolbar') !== null) out.push(c.getAttribute('data-na-toolbar'));
        else if (c.cls.has('na-le-toolbar__label')) out.push('label:' + c.textContent);
        else if (c.cls.has('na-le-toolbar__note')) out.push('note');
        else out.push('?' + c.tagName + '.' + c.className);
    };
    root.children.forEach(one);
    return out;
}
const TV_ONLY_ITEMS = new Set([ 'tool:circle', 'tool:arc', 'tool:area', 'image', 'snap-menu', 'draft', 'grid', 'grid-snap', 'ortho', 'axes', 'label:Vector', 'vector', 'share' ]);
const doubled = (seq) => seq.some((s, i) => s === '|' && (i === 0 || i === seq.length - 1 || seq[i + 1] === '|'));

const vv = await LoadToolbar(vvToolbar, vvLabels);
const editHost = new El('div'), readHost = new El('div');
check('Mount (editable) returns true', vv.mod.Na__LeToolbar__Mount(editHost, { editable : true, showToast : () => {} }) === true);
const vvEdit = Describe(editHost.children[0]);
const EXPECT_EDIT = [ 'name', '|', 'tool:select', 'tool:move', 'tool:text', 'tool:leader', 'tool:dimension', 'tool:draw', 'tool:rectangle', 'tool:eyedropper',
                      'snap', 'dropper-hint', 'scope-hint', '|', 'label:Raster', 'raster', '|', 'save', 'pdf' ];
check('the editable strip: name | Select ... Eyedropper, Snap, the two hints | Raster | Save Sheets, Download PDF', JSON.stringify(vvEdit) === JSON.stringify(EXPECT_EDIT), vvEdit);
check('no doubled, leading or trailing separator on the editable strip', !doubled(vvEdit), vvEdit);
const EVENTS7 = [ EV.tools, EV.model, EV.osnap, EV.raster, EV.drop, EV.scope, EV.spec ].sort();
check('the toolbar listens for exactly 7 events, none of them the history or the zoom event', JSON.stringify(live()) === JSON.stringify(EVENTS7), live());
{
    const root = editHost.children[0];
    vv.W.Sheet = { Sheet__Id : 'S1', Sheet__Name : 'Ground Floor Plan', Code : 'D02' }; vv.W.Dirty = true;
    win.dispatchEvent(new CustomEvent(EV.model, { detail : { reason : 'sheet-updated', restore : { direction : 'undo' } } }));   // <-- what an undo announces (AnnounceRestore)
    const save = root.querySelector('[data-na-toolbar="save"]');
    check('a model change (an undo re-announcing its sheet) re-syncs the strip: name and Save\'s attention',
        root.querySelector('.na-le-toolbar__name').textContent === 'D02 - Ground Floor Plan' && save.cls.has('na-le-toolbar__btn--attention'));
    vv.W.Snap = true; win.dispatchEvent(new CustomEvent(EV.osnap));
    const snap = root.querySelector('[data-na-toolbar="snap"]');
    check('Snap still lights on its event', snap.cls.has('na-le-toolbar__btn--active') && snap.getAttribute('aria-pressed') === 'true');
    root.querySelector('[data-na-toolbar="tool-move"]').dispatch('click');
    root.querySelector('[data-na-toolbar="tool-eyedropper"]').dispatch('click', { shiftKey : true });
    root.querySelector('[data-na-toolbar="tool-eyedropper"]').dispatch('click', { shiftKey : false });
    snap.dispatch('click');
    const settle = () => new Promise((r) => setTimeout(r, 20));   // <-- Save and PDF hold the busy flag until their promise settles
    save.dispatch('click'); await settle();
    root.querySelector('[data-na-toolbar="pdf"]').dispatch('click'); await settle();
    const raster = root.querySelector('[data-na-toolbar="raster"]'); raster.value = 'high'; raster.dispatch('change');
    await settle();
    const calls = vv.W.Calls.map((c) => c.join(':'));
    check('the buttons still act: Move, Shift+Eyedropper (palette), Eyedropper, Snap, Save, PDF, Raster', JSON.stringify(calls) === JSON.stringify([ 'SetTool:move', 'ArmPalette', 'ArmEyedropper', 'SnapToggle', 'Save', 'Pdf:S1', 'RasterSet:high' ]), calls);
    check('nothing acted on undo, redo, fit, zoom or the notes margin', !calls.some((c) => /^(Undo|Redo|Fit|ZoomTo|UpdateMarginNotes)/.test(c)), calls);
}
check('Mount (read-only) returns true', vv.mod.Na__LeToolbar__Mount(readHost, { editable : false }) === true);
const vvRead = Describe(readHost.children[0]);
check('the editable strip was unmounted first (one strip at a time)', editHost.children.length === 0);
check('the read-only strip: name | Raster | read-only note, Download PDF', JSON.stringify(vvRead) === JSON.stringify([ 'name', '|', 'label:Raster', 'raster', '|', 'note', 'pdf' ]), vvRead);
check('no doubled, leading or trailing separator on the read-only strip', !doubled(vvRead), vvRead);
vv.mod.Na__LeToolbar__Unmount();
check('Unmount takes every listener off and the strip out', live().length === 0 && readHost.children.length === 0, live());

const tv = await LoadToolbar(tvToolbar, tvConfig.LayoutEditor__Labels__Config);
const tvEditHost = new El('div'), tvReadHost = new El('div');
tv.mod.Na__LeToolbar__Mount(tvEditHost, { editable : true });
const tvEdit = Describe(tvEditHost.children[0]);
tv.mod.Na__LeToolbar__Mount(tvReadHost, { editable : false });
const tvRead = Describe(tvReadHost.children[0]);
tv.mod.Na__LeToolbar__Unmount();
const tvEditHere = tvEdit.filter((s) => !TV_ONLY_ITEMS.has(s)), tvReadHere = tvRead.filter((s) => !TV_ONLY_ITEMS.has(s));
check('the editable strip is TrueVision\'s 1.24.0 strip with its not-yet-here controls taken out (separators where TrueVision puts them)',
    JSON.stringify(vvEdit) === JSON.stringify(tvEditHere), { vv : vvEdit, tv : tvEdit });
check('the read-only strip is TrueVision\'s read-only strip with Vector and Share taken out', JSON.stringify(vvRead) === JSON.stringify(tvReadHere), { vv : vvRead, tv : tvRead });
check('TrueVision\'s own strips carry no Undo, Redo, Fit, 100% or Notes either', ![ ...tvEdit, ...tvRead ].some((s) => [ 'undo', 'redo', 'fit', 'zoom', 'margin' ].includes(s)));

// -----------------------------------------------------------------------------
// C | THE APPCONFIG
// -----------------------------------------------------------------------------
section('C. The AppConfig: the Notes toggle\'s labels gone, the Margin Notes block TrueVision\'s');
function strictParse(text) {
    const dup = [];
    const walk = (src) => { const stack = []; const re = /"((?:[^"\\]|\\.)*)"\s*:|[{}\[\]]/g; let m; while ((m = re.exec(src)) !== null) { const t = m[0]; if (t === '{') stack.push(new Set()); else if (t === '[') stack.push(null); else if (t === '}' || t === ']') stack.pop(); else { const top = stack[stack.length - 1]; if (top) { if (top.has(m[1])) dup.push(m[1]); top.add(m[1]); } } } };
    walk(text.replace(/"(?:[^"\\]|\\.)*"(?!\s*:)/g, '""'));
    return { value : JSON.parse(text), dup };
}
const cfgRaw = readFileSync(CONFIG_FILE);
const cfgText = cfgRaw.toString('utf8');
const cfg = strictParse(cfgText);
check('the config parses, with no duplicate key', cfg.dup.length === 0, cfg.dup);
check('the config keeps its LF line endings', !cfgText.includes('\r'));
check('no key or value anywhere in the config names MarginToggle', !cfgText.includes('MarginToggle'));
const vvMargin = cfg.value.LayoutEditor__MarginNotes__Config, tvMargin = tvConfig.LayoutEditor__MarginNotes__Config;
check('LayoutEditor__MarginNotes__Description is TrueVision\'s ("Switched on per sheet with Show notes margin in the Margin Notes panel")',
    vvMargin.LayoutEditor__MarginNotes__Description === tvMargin.LayoutEditor__MarginNotes__Description && /Show notes margin in the Margin Notes panel/.test(vvMargin.LayoutEditor__MarginNotes__Description) && !/Notes button/.test(vvMargin.LayoutEditor__MarginNotes__Description));
check('the whole MarginNotes block equals TrueVision\'s (34 keys)', JSON.stringify(vvMargin) === JSON.stringify(tvMargin) && Object.keys(vvMargin).length === 34, Object.keys(vvMargin).length);
const L = cfg.value.LayoutEditor__Labels__Config, TL = tvConfig.LayoutEditor__Labels__Config;
check('the Undo, Redo and MenuZoomFit labels stay (the right-click menu and the specification bar read them) and equal TrueVision\'s',
    [ 'Undo', 'Redo', 'MenuZoomFit', 'MarginShow' ].every((k) => typeof L['LayoutEditor__Labels__' + k] === 'string' && L['LayoutEditor__Labels__' + k] === TL['LayoutEditor__Labels__' + k]));
check('ToolSelectTitle and ToolMoveTitle keep this app\'s words (withheld for the auto-Move gesture)',
    L.LayoutEditor__Labels__ToolSelectTitle !== TL.LayoutEditor__Labels__ToolSelectTitle && L.LayoutEditor__Labels__ToolMoveTitle !== TL.LayoutEditor__Labels__ToolMoveTitle
    && !/picks the Move tool up|comes up by itself/.test(L.LayoutEditor__Labels__ToolSelectTitle + L.LayoutEditor__Labels__ToolMoveTitle));
if (existsSync(PRE_CONFIG_FILE)) {
    const pre = readFileSync(PRE_CONFIG_FILE, 'utf8').split('\n'), now = cfgText.split('\n');
    const removed = pre.filter((l) => !now.includes(l)), added = now.filter((l) => !pre.includes(l));
    check('against its pre-image: two lines out (MarginToggle, MarginToggleTitle), the Description line replaced, nothing else',
        removed.length === 3 && added.length === 1 && removed.filter((l) => /"LayoutEditor__Labels__MarginToggle(Title)?":/.test(l)).length === 2
        && removed.some((l) => l.includes('"LayoutEditor__MarginNotes__Description"')) && added[0].includes('"LayoutEditor__MarginNotes__Description"')
        && pre.length - now.length === 2, { removed : removed.map((l) => l.slice(0, 80)), added : added.map((l) => l.slice(0, 80)) });
    const tvLine = readTv(P.config).split('\n').find((l) => l.includes('"LayoutEditor__MarginNotes__Description"'));
    check('the Description line is TrueVision\'s line byte for byte', added.length === 1 && added[0] === tvLine);
}

// -----------------------------------------------------------------------------
// D | THE KEPT PATHS
// -----------------------------------------------------------------------------
section('D. The kept paths (live tree): keys, the right-click menu, Show notes margin, undo\'s re-announce');
{
    const KM = await import(pathToFileURL(join(ROOT, P.keymap)).href);
    const hot = JSON.parse(readFileSync(join(ROOT, P.hotkeys), 'utf8'));
    KM.Na__LeCfg__SetKeyMap(hot);
    const act = (k, held) => { const m = KM.Na__LeCfg__MatchKeyBinding(k, held); return m ? m.action : null; };
    check('Ctrl+Z is Edit__Undo, Ctrl+Y and Ctrl+Shift+Z are Edit__Redo (the shipped key file, the real KeyMap)',
        act('z', { Ctrl : true }) === 'Edit__Undo' && act('y', { Ctrl : true }) === 'Edit__Redo' && act('Z', { Ctrl : true, Shift : true }) === 'Edit__Redo',
        [ act('z', { Ctrl : true }), act('y', { Ctrl : true }), act('Z', { Ctrl : true, Shift : true }) ]);
    const list = hot.LayoutEditor__KeyboardBindings__Config.LayoutEditor__KeyboardBindings__List;
    const row = (id) => list.find((r) => r.Id === id);
    check('Nav__ZoomFit (F) and Nav__ZoomActualSize (1) are in the key file, shipped switched off exactly as TrueVision\'s',
        !!row('Nav__ZoomFit') && !!row('Nav__ZoomActualSize') && row('Nav__ZoomFit').Enabled === false && row('Nav__ZoomActualSize').Enabled === false
        && JSON.stringify([ row('Nav__ZoomFit'), row('Nav__ZoomActualSize') ]) === JSON.stringify((() => { const t = JSON.parse(readTv(P.hotkeys)).LayoutEditor__KeyboardBindings__Config.LayoutEditor__KeyboardBindings__List; return [ t.find((r) => r.Id === 'Nav__ZoomFit'), t.find((r) => r.Id === 'Nav__ZoomActualSize') ]; })()));
    const on = JSON.parse(JSON.stringify(hot));
    on.LayoutEditor__KeyboardBindings__Config.LayoutEditor__KeyboardBindings__List.forEach((r) => { if (r.Id === 'Nav__ZoomFit' || r.Id === 'Nav__ZoomActualSize') r.Enabled = true; });
    KM.Na__LeCfg__SetKeyMap(on);
    check('switched on, F is Nav__ZoomFit and 1 is Nav__ZoomActualSize', act('f', {}) === 'Nav__ZoomFit' && act('1', {}) === 'Nav__ZoomActualSize', [ act('f', {}), act('1', {}) ]);
    KM.Na__LeCfg__SetKeyMap(null);
    const controls = stripJs(readVv(P.controls));
    check('Controls__Pc: Nav__ZoomFit runs Na__LeNav__Fit() and Nav__ZoomActualSize runs Na__LeNav__ZoomTo(1)',
        /case\s+'Nav__ZoomFit'\s*:\s*Na__LeNav__Fit\(\)\s*;/.test(controls) && /case\s+'Nav__ZoomActualSize'\s*:\s*Na__LeNav__ZoomTo\(1\)\s*;/.test(controls));
    const kb = stripJs(readVv(P.keyboard));
    check('the sheet keyboard: Edit__Undo runs Na__LeHist__Undo() and Edit__Redo runs Na__LeHist__Redo()',
        /case 'Edit__Undo':[\s\S]{0,600}?Na__LeHist__Undo\(\)/.test(kb) && /case 'Edit__Redo':[\s\S]{0,600}?Na__LeHist__Redo\(\)/.test(kb)
        && /import\s*\{[^}]*Na__LeHist__Undo[^}]*\}\s*from\s*'\.\.\/07__Core__SheetData\/Na__LayoutEditor__History__\.js'/.test(kb));
    const menu = stripJs(readVv(P.ctxmenu));
    check('the right-click menu: a read-only sheet offers Zoom to fit',
        /if\s*\(!Na__LeTools__Editable\)\s*return\s*\[\s*\{\s*label\s*:\s*label\('MenuZoomFit',\s*'Zoom to fit'\),\s*onSelect\s*:\s*\(\)\s*=>\s*Na__LeNav__Fit\(\)\s*\}\s*\];/.test(menu));
    const bare = between(menu, 'if (!found) {', 'if (found.kind');
    check('the right-click menu: bare paper in an editable sheet offers Zoom to fit, and Undo and Redo after it',
        !!bare && /label\('MenuZoomFit',\s*'Zoom to fit'\),\s*onSelect\s*:\s*\(\)\s*=>\s*Na__LeNav__Fit\(\)/.test(bare) && /\.concat\(history\)/.test(bare)
        && /const history = \[\s*\{\s*label\s*:\s*label\('Undo', 'Undo'\)[\s\S]*?Na__LeHist__Undo\(\)[\s\S]*?label\('Redo', 'Redo'\)[\s\S]*?Na__LeHist__Redo\(\)/.test(menu));
    const panel = stripJs(readVv(P.marginPanel));
    check('the Margin Notes panel: Show notes margin (margin-enabled) switches the sheet\'s margin through UpdateMarginNotes',
        /Na__LePanels__Row\(L\('MarginShow', 'Show notes margin'\), Na__LePanels__Input\('checkbox', 'margin-enabled'\)/.test(panel)
        && /on\('change', 'margin-enabled',\s*\(e, el\) => apply\(\{ enabled : el\.checked \}\)\)/.test(panel)
        && /const apply = \(patch\) => \{[^}]*Na__LeModel__UpdateMarginNotes\(sheet, patch\)/.test(panel));
    const hist = stripJs(readVv(P.history)), sheets = stripJs(readVv(P.sheets)), state = stripJs(readVv(P.modelState));
    check('an undo re-announces its sheet: History -> AnnounceRestore -> Touch -> the model CHANGED_EVENT the toolbar listens for',
        /Na__LeModel__AnnounceRestore\(sheet, restore\)/.test(hist)
        && /function Na__LeModel__AnnounceRestore\([^)]*\)\s*\{[\s\S]*?Na__LeModel__Touch\('sheet-updated'/.test(sheets)
        && /function Na__LeModel__Touch\([\s\S]*?Na__LeModel__Dispatch\(reason, sheetId, itemId, restore\)/.test(state)
        && /window\.dispatchEvent\(new CustomEvent\(Na__LeModel__CHANGED_EVENT/.test(state));
}

// -----------------------------------------------------------------------------
// E | THE HEADER
// -----------------------------------------------------------------------------
section('E. The header: TrueVision\'s PURPOSE, DESCRIPTION and INTEGRATION; the PORT NOTE and the log');
{
    const line = (t, p) => t.split('\n').find((l) => l.startsWith(p));
    check('banner reads VALEVISION3D - LAYOUT EDITOR - TOOLBAR', vvToolbar.split('\n')[1] === '// VALEVISION3D - LAYOUT EDITOR - TOOLBAR');
    check('PURPOSE is TrueVision\'s line', line(vvToolbar, '// PURPOSE') === line(tvToolbar, '// PURPOSE'), line(vvToolbar, '// PURPOSE'));
    check('DESCRIPTION is TrueVision\'s block', between(vvToolbar, '// DESCRIPTION:', '// INTEGRATION:') === between(tvToolbar, '// DESCRIPTION:', '// INTEGRATION:'));
    check('INTEGRATION is TrueVision\'s block', between(vvToolbar, '// INTEGRATION:', '// ----') === between(tvToolbar, '// INTEGRATION:', '// ----'));
    const note = between(vvToolbar, '// PORT NOTE:', '// DEVELOPMENT LOG:') || '';
    check('PORT NOTE: no bullet still says Undo, Redo, Fit, 100% or Notes are on the strip', !/still on the strip/.test(note) && !/W1-35 takes/.test(note));
    check('PORT NOTE: Source version names 1.17.0, 1.19.0 and TrueVision3D v2.124.0; Ported on carries {{VVREL:W1-35}}',
        /Source version:[\s\S]*1\.17\.0[\s\S]*1\.19\.0[\s\S]*v2\.124\.0[\s\S]*read at b2aa9151/.test(note) && /Ported on\s*:[\s\S]*\{\{VVREL:W1-35\}\}/.test(note));
    check('PORT NOTE: the Select and Move hover texts are a listed divergence (DR-40 item 7)', /Select and Move hover texts[\s\S]*DR-40 item 7/.test(note));
    const log = vvToolbar.split('// DEVELOPMENT LOG:')[1] || '';
    const entries = [ ...log.matchAll(/^\/\/ (\d\d-\w\w\w-\d{4}) - Version (\d+\.\d+\.\d+)/gm) ].map((m) => m[2]);
    check('the log opens with 1.9.4 for {{VVREL:W1-35}}, a patch step over 1.9.3', /^\n\/\/ 02-Oct-2026 - Version 1\.9\.4 \([^)]*\{\{VVREL:W1-35\}\}\)/.test(log) && entries[0] === '1.9.4' && entries[1] === '1.9.3', entries.slice(0, 3));
    const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
    check('the log reads newest first with no version twice', entries.every((v, i) => i === 0 || cmp(entries[i - 1], v) > 0), entries);
}

// -----------------------------------------------------------------------------
// F | GREP OF 02__Src__AppModules
// -----------------------------------------------------------------------------
section('F. A grep of 02__Src__AppModules (VVM)');
{
    const hits = [], toolbarNames = [];
    const walk = (dir) => {
        for (const name of readdirSync(dir)) {
            if (name === 'node_modules' || name.startsWith('.')) continue;
            const full = join(dir, name), st = statSync(full);
            if (st.isDirectory()) walk(full);
            else if (/\.(js|mjs|cjs|json|css|html)$/.test(name)) {
                const text = readFileSync(full, 'utf8');
                if (text.includes('MarginToggle')) hits.push(full);
                if (/data-na-toolbar="(undo|redo|fit|zoom|margin)"/.test(text)) toolbarNames.push(full);
            }
        }
    };
    walk(join(ROOT, '02__Src__AppModules'));
    // A candidate file checked from outside the tree counts in place of the live one
    const fix = (list, pattern) => { const liveToolbar = join(ROOT, P.toolbar), liveConfig = join(ROOT, P.config); let l = list.filter((f) => f !== liveToolbar && f !== liveConfig);
        if (pattern.test(vvToolbar)) l.push(TOOLBAR_FILE); if (pattern.test(cfgText)) l.push(CONFIG_FILE); return l; };
    const mt = fix(hits, /MarginToggle/), tn = fix(toolbarNames, /data-na-toolbar="(undo|redo|fit|zoom|margin)"/);
    check('grep of VVM for MarginToggle finds nothing', mt.length === 0, mt);
    check('nothing in VVM asks for a toolbar undo, redo, fit, zoom or margin button', tn.length === 0, tn);
}

rmSync(TEMP, { recursive : true, force : true });
console.log('\n' + (failed === 0 ? 'PASS' : 'FAIL') + ' - ' + passed + ' passed, ' + failed + ' failed' + (failed ? ': ' + failures.join(' | ') : ''));
process.exit(failed === 0 ? 0 : 1);
