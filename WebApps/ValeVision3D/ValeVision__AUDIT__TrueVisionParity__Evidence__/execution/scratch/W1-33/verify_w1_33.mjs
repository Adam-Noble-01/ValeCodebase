// =============================================================================
// W1-33 scratch harness - the first-open veil, the boot cover and the body class
// =============================================================================
//
// node verify_w1_33.mjs <ValeVision app root>
//
// Runs the REAL LoadingVeil, LoadingScreen and Loader (the loader with stand-ins
// for the drawings block, the authoring gate and the editor's modules) in a fake
// DOM, each case in its own copy under the OS temp folder, and reads the
// stylesheets and the mode controller statically. TrueVision is read only with
// git show at the pin. Writes nothing outside the OS temp folder.
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT   = process.argv[2];
if (!ROOT || !existsSync(ROOT)) { console.log('usage: node verify_w1_33.mjs <ValeVision app root>'); process.exit(2); }
const TV_REPO = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const TV_PIN  = 'b2aa9151';
const TV_APP  = 'na-apps/30__TrueVision__CoreAppCode/';
const LE = '02__Src__AppModules/51__System__LayoutEditor';
const P = {
    loader   : LE + '/01__Core__Loader/Na__LayoutEditor__Loader__.js',
    screen   : LE + '/01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js',
    leaf     : LE + '/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js',
    veil     : LE + '/05__Core__ModeController/Na__LayoutEditor__LoadingVeil__.js',
    mode     : LE + '/05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
    boot     : LE + '/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css',
    main     : LE + '/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css',
    overlays : '03__Style__AppStylesheets/Na__UiFeature__Styles__LoadingOverlays__.css'
};
const readVv = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const readTv = (rel) => execFileSync('git', [ '-C', TV_REPO, 'show', TV_PIN + ':' + TV_APP + rel ], { encoding : 'utf8', maxBuffer : 64 * 1024 * 1024 });
const BODY_CLASS = 'na-layout-editor--active';

let passes = 0, failures = 0;
const check = (name, ok, detail) => {
    if (ok) passes++; else failures++;
    let line = (ok ? '  PASS  ' : '  FAIL  ') + name;
    if (!ok && detail !== undefined) { let s; try { s = JSON.stringify(detail); } catch (e) { s = String(detail); } line += '  -> ' + (s.length > 600 ? s.slice(0, 600) + '...' : s); }
    console.log(line);
};
const section = (title) => console.log('\n' + title);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');
const stripJs  = (js) => js.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
const fold = (s) => s.replace(/\s+/g, ' ').trim();

// -----------------------------------------------------------------------------
// A FAKE PAGE
// -----------------------------------------------------------------------------
let LOG = [];
class El {
    constructor(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.parent = null; this.attrs = {}; this.style = {}; this.cls = new Set(); this.textContent = ''; this.listeners = {}; this.id = ''; this.onAppend = null; }
    get className() { return [ ...this.cls ].join(' '); }
    set className(v) { this.cls = new Set(String(v).split(/\s+/).filter(Boolean)); LOG.push([ 'className', this, String(v) ]); }
    get classList() {
        const el = this;
        return {
            add      : (...n) => { n.forEach((x) => el.cls.add(x)); LOG.push([ 'add', el, n ]); },
            remove   : (...n) => { n.forEach((x) => el.cls.delete(x)); LOG.push([ 'remove', el, n ]); },
            toggle   : (n, f) => { const on = f === undefined ? !el.cls.has(n) : !!f; if (on) el.cls.add(n); else el.cls.delete(n); LOG.push([ on ? 'add' : 'remove', el, [ n ] ]); return on; },
            contains : (n) => el.cls.has(n)
        };
    }
    get offsetWidth() { LOG.push([ 'reflow', this ]); return 100; }
    set innerHTML(v) { this.children.forEach((c) => { c.parent = null; }); this.children = []; this.textContent = ''; }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
    appendChild(n) { n.parent = this; this.children.push(n); if (this.onAppend) this.onAppend(n); return n; }
    append(...n) { n.forEach((x) => this.appendChild(x)); }
    contains(n) { for (let at = n; at; at = at.parent) if (at === this) return true; return false; }
    querySelector(sel) { const want = sel.startsWith('.') ? sel.slice(1) : null; const walk = (el) => { for (const c of el.children) { if (want && c.cls.has(want)) return c; const d = walk(c); if (d) return d; } return null; }; return walk(this); }
    querySelectorAll(sel) { const want = sel.startsWith('.') ? sel.slice(1) : null; const out = []; const walk = (el) => { for (const c of el.children) { if (want && c.cls.has(want)) out.push(c); walk(c); } }; walk(this); return out; }
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
    removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); }
    fire(t) { (this.listeners[t] || []).slice().forEach((fn) => fn({ type : t, target : this })); }
}
function NewPage(opts) {
    LOG = [];
    const head = new El('head'), body = new El('body');
    head.onAppend = (n) => { if (n.tagName === 'LINK') setTimeout(() => n.fire('load'), 0); };
    const byId = (el, id) => { if (el.id === id) return el; for (const c of el.children) { const h = byId(c, id); if (h) return h; } return null; };
    globalThis.document = {
        head, body,
        createElement  : (t) => new El(t),
        getElementById : (id) => byId(body, id),
        querySelector  : (sel) => {
            const m = sel.match(/^link\[data-na-le-stylesheet="(.*)"\]$/);
            if (m) return head.children.find((c) => c.getAttribute('data-na-le-stylesheet') === m[1]) || null;
            return sel.startsWith('.') ? body.querySelector(sel) : null;
        },
        querySelectorAll : (sel) => body.querySelectorAll(sel)
    };
    const win = new EventTarget();
    win.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 4);
    win.cancelAnimationFrame  = (id) => clearTimeout(id);
    win.setTimeout            = (fn, ms) => setTimeout(fn, ms);
    win.clearTimeout          = (id) => clearTimeout(id);
    win.location              = { hostname : 'localhost', reload() {} };
    globalThis.window = win;
    globalThis.CustomEvent = globalThis.CustomEvent || class extends Event { constructor(t, o) { super(t); this.detail = o && o.detail; } };
    return { head, body, win };
}

// A COPY OF THE FILES A CASE NEEDS, under the OS temp folder (fresh module instances per case)
const TEMP = mkdtempSync(join(tmpdir(), 'w133-verify-'));
let caseNo = 0;
function Tree(files) {
    const dir = join(TEMP, 'case' + (++caseNo));
    Object.entries(files).forEach(([ rel, text ]) => { const full = join(dir, rel); mkdirSync(dirname(full), { recursive : true }); writeFileSync(full, text); });
    return (rel) => pathToFileURL(join(dir, rel)).href;
}

// -----------------------------------------------------------------------------
// A | THE STYLESHEETS
// -----------------------------------------------------------------------------
section('A. The stylesheets: the hiding block moved, the boot veil, TrueVision\'s veil region');
const tvMain  = readTv(P.main);
const boot    = readVv(P.boot);
const main    = readVv(P.main);
const tvBlock = tvMain.slice(tvMain.indexOf('/* While the editor is on screen'), tvMain.indexOf('body.na-le-dragging,'));
const tvComment = tvBlock.slice(0, tvBlock.indexOf('*/') + 2);
check('TrueVision\'s hiding block was found at the pin (its comment and rule)', tvBlock.includes('.controls-instructions-panel {') && tvComment.length > 400);
check('Styles__Boot carries the hiding block\'s comment verbatim', boot.includes(tvComment));
const ruleOf = (css, marker) => { const code = stripCss(css); const at = code.indexOf(marker); const open = code.indexOf('{', at); const close = code.indexOf('}', open); const start = code.lastIndexOf('}', at) + 1; return { selectors : code.slice(start, open).split(',').map(fold).filter(Boolean), body : fold(code.slice(open + 1, close)) }; };
const tvRule = ruleOf(tvBlock, 'body.na-layout-editor--active .na-dropdown-menu');
const bootRule = ruleOf(boot, 'body.na-layout-editor--active .na-dropdown-menu');
check('Styles__Boot\'s hiding rule = TrueVision\'s eight selectors, in order, plus this app\'s Video Studio timeline, with TrueVision\'s declaration',
    JSON.stringify(bootRule.selectors) === JSON.stringify(tvRule.selectors.concat([ 'body.na-layout-editor--active .na-vs-tl' ])) && bootRule.body === tvRule.body && tvRule.selectors.length === 8,
    { boot : bootRule, tv : tvRule });
check('the hiding block sits ahead of the Tab Strip region in Styles__Boot', boot.indexOf('.na-dropdown-menu,') !== -1 && boot.indexOf('.na-dropdown-menu,') < boot.indexOf('REGION  |  Tab Strip'));
check('Styles__Main keeps no body-class rule (the block left it)', !stripCss(main).includes(BODY_CLASS));
const bootVeil = ruleOf(boot, '.na-le-veil.na-le-veil--boot');
check('the boot veil: .na-le-veil.na-le-veil--boot is fixed below the strip, edge to edge, z 600, opaque white, no blur',
    JSON.stringify(bootVeil.selectors) === JSON.stringify([ '.na-le-veil.na-le-veil--boot' ])
    && bootVeil.body === fold('position : fixed; top : calc(var(--Vale_HeaderHeight) + var(--Vale_LayoutTabStripHeight)); left : 0; right : 0; bottom : 0; z-index : 600; background-color : #ffffff; backdrop-filter : none;'),
    bootVeil);
const bootFold = ruleOf(boot, 'body.na-layout-editor--active .na-le-veil--boot');
check('the boot veil folds at once with the body class: top = the strip height (as the host)', bootFold.body === fold('top : var(--Vale_LayoutTabStripHeight);'), bootFold);
const tvOverlays = readTv(P.overlays).split('\n');
const vvOverlays = readVv(P.overlays).split('\n');
const tvAt = tvOverlays.indexOf(' * REGION | Layout Editor Loading Veils') - 1;
const vvAt = vvOverlays.indexOf(' * REGION | Layout Editor Loading Veils') - 1;
const tvRegion = tvOverlays.slice(tvAt, tvOverlays.indexOf('/* endregion ------------------------------------------------------------------- */', tvAt) + 1);
const vvRegion = vvAt < 0 ? [] : vvOverlays.slice(vvAt, vvOverlays.indexOf('/* endregion ------------------------------------------------------------------- */', vvAt) + 1);
check('LoadingOverlays: the "Layout Editor Loading Veils" region is TrueVision\'s, line for line, comments included (' + tvRegion.length + ' lines)', vvRegion.length > 50 && vvRegion.join('\n') === tvRegion.join('\n'));
check('LoadingOverlays: the old "Return-to-Model Veil" region is gone', !vvOverlays.some((l) => l.includes('Return-to-Model Veil')));
check('LoadingOverlays: this app\'s Load Error State, --opaque and __status--error rules are kept',
    [ 'REGION | Load Error State', '.na-layout-loading-overlay--opaque', '.na-layout-loading-overlay__status--error', '.loading-overlay--error .loading-spinner' ].every((s) => vvOverlays.join('\n').includes(s)));

// -----------------------------------------------------------------------------
// B | THE LOADING VEIL (real module; stand-ins for its four imports)
// -----------------------------------------------------------------------------
section('B. LoadingVeil: TrueVision 1.1.0 whole, FirstOpen\'s immediate option, the fade out unchanged');
const veilText = readVv(P.veil);
const tvVeil   = readTv(P.veil);
// THE SEAMS, UNDONE: what is left must be TrueVision's file exactly
let undone = veilText
    .replace('// VALEVISION3D - LAYOUT EDITOR - LOADING VEILS', '// TRUEVISION3D - LAYOUT EDITOR - LOADING VEILS')
    .replace(/\/\/ PORT NOTE:\n[\s\S]*?(?=\/\/\n\/\/ -{77})/, '// PORT NOTE:\n// - Ported from   : n/a - authored in TrueVision3D\n// - Back-port     : PENDING to ValeVision3D.\n')
    .replace("const showTimer = options.immediate === true ? 0 : setTimeout(", "const showTimer = setTimeout(")
    .replace(/\n\n        \/\/ THE LOADER'S COVER IS ALREADY UP[\s\S]*?\n        }\n/, '\n')
    .replace("[ValeVision3D LayoutEditor]", "[TrueVision3D LayoutEditor]")
    .replace("Na__LeVeil__Dismiss3d,\n        Na__LeVeil__DrawingSettled                                               // <-- This app only: the mode controller's WaitForFirstDrawing waits on it (PORT NOTE)\n", "Na__LeVeil__Dismiss3d\n");
check('LoadingVeil = TrueVision 1.1.0 at the pin once the five listed seams are undone (banner, PORT NOTE, immediate, console prefix, DrawingSettled export)', undone === tvVeil,
    (() => { const a = undone.split('\n'), b = tvVeil.split('\n'); const i = a.findIndex((l, k) => l !== b[k]); return { line : i + 1, here : a[i], tv : b[i] }; })());
check('LoadingVeil is LF, as git show returns it', !readFileSync(join(ROOT, P.veil), 'latin1').includes('\r'));
const VEIL_STUBS = {
    [LE + '/03__Core__Config/Na__LayoutEditor__ConfigState__.js']                        : 'export function Na__LeCfg__GetLabel(k, f) { const l = globalThis.__labels || {}; return Object.prototype.hasOwnProperty.call(l, k) ? l[k] : f; }',
    [LE + '/25__System__RenderStyles/Na__LayoutEditor__SnapshotRenderer__.js']           : 'export function Na__LeSnap__GetOutstanding() { return globalThis.__outstanding || 0; }',
    ['02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__UI__SceneCarousel.js']      : 'export function Na__PresentationMode__UI__GoToSceneAtIndex(i) { (globalThis.__goto = globalThis.__goto || []).push(i); }',
    ['02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__Camera__SceneTransition.js'] : 'export function Na__PresentationMode__Camera__IsTransitioning() { return false; }'
};
const realSetTimeout = setTimeout;
async function VeilCase() {
    const url = Tree(Object.assign({ [P.veil] : readFileSync(join(ROOT, P.veil), 'utf8') }, VEIL_STUBS));
    NewPage();
    const timers = [];
    globalThis.setTimeout = (fn, ms) => { timers.push(ms); return realSetTimeout(fn, ms); };
    const veil = await import(url(P.veil));
    return { veil, timers, restore : () => { globalThis.setTimeout = realSetTimeout; } };
}
{
    const exp = Object.keys(await import(Tree(Object.assign({ [P.veil] : readFileSync(join(ROOT, P.veil), 'utf8') }, VEIL_STUBS))(P.veil))).sort();
    check('LoadingVeil exports TrueVision\'s three and this app\'s DrawingSettled', JSON.stringify(exp) === JSON.stringify([ 'Na__LeVeil__Dismiss3d', 'Na__LeVeil__DrawingSettled', 'Na__LeVeil__FirstOpen', 'Na__LeVeil__ReturnTo3d' ]), exp);
}
{   // IMMEDIATE: up whole before FirstOpen returns, no 550ms timer, no layout read between the classes
    const c = await VeilCase();
    const host = document.createElement('div');
    const before = LOG.length;
    const pending = new Promise(() => {});
    const result = c.veil.Na__LeVeil__FirstOpen(host, { specification : pending, textMetrics : null, viewportCount : 2, immediate : true });
    const root = host.children[0];
    const events = LOG.slice(before).filter((e) => e[1] === root && (e[0] === 'add' || e[0] === 'reflow'));
    check('immediate: the veil is mounted in the host and at full opacity (--visible and --shown) when FirstOpen returns',
        !!root && root.cls.has('na-le-veil') && root.cls.has('na-le-veil--visible') && root.cls.has('na-le-veil--shown') && !root.cls.has('na-le-veil--over-model'), root && root.className);
    check('immediate: both classes go on together, with no layout read between them (one frame: the fade in is skipped)',
        events.length === 1 && events[0][0] === 'add' && events[0][2].join() === 'na-le-veil--visible,na-le-veil--shown', events.map((e) => e[0] + ':' + (e[2] || []).join()));
    check('immediate: no 550ms timer is armed (the cap still is)', !c.timers.includes(550) && c.timers.includes(25000), c.timers);
    check('immediate: the headline is TrueVision\'s and the status names the first job with its real count',
        root.querySelector('.na-le-veil__text').textContent === 'Your Drawings Are Loading' && root.querySelector('.na-le-veil__status').textContent === 'Drawing the Views  -  0 of 2',
        [ root.querySelector('.na-le-veil__text').textContent, root.querySelector('.na-le-veil__status').textContent ]);
    check('once per session: a second FirstOpen answers false and builds nothing', (await c.veil.Na__LeVeil__FirstOpen(host, { viewportCount : 1, immediate : true })) === false && host.children.length === 1);
    c.restore();
    void result;
}
{   // NOT IMMEDIATE: TrueVision's rule - nothing for 550ms, then Show with the reflow between the classes
    const c = await VeilCase();
    const host = document.createElement('div');
    c.veil.Na__LeVeil__FirstOpen(host, { specification : new Promise(() => {}), viewportCount : 1 });
    const root = host.children[0];
    check('without immediate: nothing shows when FirstOpen returns, and the 550ms timer is armed (TrueVision\'s rule)', !root.cls.has('na-le-veil--visible') && c.timers.includes(550), { cls : root.className, timers : c.timers });
    const before = LOG.length;
    await sleep(620);
    const events = LOG.slice(before).filter((e) => e[1] === root && (e[0] === 'add' || e[0] === 'reflow')).map((e) => e[0] + ':' + (e[2] || []).join());
    check('without immediate: after 550ms the veil shows the way TrueVision\'s does - display, a layout read, then opacity (the fade in runs)',
        root.cls.has('na-le-veil--visible') && root.cls.has('na-le-veil--shown') && events.join('|') === 'add:na-le-veil--visible|reflow:|add:na-le-veil--shown', events);
    c.restore();
}
{   // THE FADE OUT STAYS TRUEVISION'S: held 500ms from shown, then opacity, then display 320ms later
    const c = await VeilCase();
    const host = document.createElement('div');
    const done = c.veil.Na__LeVeil__FirstOpen(host, { viewportCount : 0, immediate : true });
    const root = host.children[0];
    await done;
    await sleep(420);
    const held = root.cls.has('na-le-veil--shown');
    await sleep(200);
    const fading = !root.cls.has('na-le-veil--shown') && root.cls.has('na-le-veil--visible');
    await sleep(380);
    const gone = !root.cls.has('na-le-veil--visible');
    check('the fade out is TrueVision\'s: held for the minimum 500ms, then opacity off, then display off 320ms later', held && fading && gone, { held, fading, gone });
    check('DrawingSettled (this app\'s export) resolves at once for a sheet with nothing to draw', (await c.veil.Na__LeVeil__DrawingSettled(0)) === true);
    c.restore();
}

// -----------------------------------------------------------------------------
// C | THE LOADING SCREEN (real module, no imports)
// -----------------------------------------------------------------------------
section('C. LoadingScreen: the veil\'s look while loading, IsShown, the error state unchanged');
async function ScreenCase() { const url = Tree({ [P.screen] : readFileSync(join(ROOT, P.screen), 'utf8') }); NewPage(); return import(url(P.screen)); }
{
    const S = await ScreenCase();
    check('IsShown is exported and false before anything is shown', typeof S.Na__LeLoadScreen__IsShown === 'function' && S.Na__LeLoadScreen__IsShown() === false);
    const before = LOG.length;
    S.Na__LeLoadScreen__Show();
    const root = document.getElementById('naLayoutEditorLoading');
    const adds = LOG.slice(before).filter((e) => e[1] === root && (e[0] === 'add' || e[0] === 'reflow')).map((e) => e[0] + ':' + (e[2] || []).join());
    check('Show: the loading state wears the veil - na-le-veil na-le-veil--boot, up whole at once (--visible and --shown together)',
        !!root && [ 'na-le-veil', 'na-le-veil--boot', 'na-le-veil--visible', 'na-le-veil--shown' ].every((c) => root.cls.has(c)) && !root.cls.has('loading-overlay') && adds.join('|') === 'add:na-le-veil--visible,na-le-veil--shown',
        { cls : root && root.className, adds });
    check('Show: the app\'s spinner, TrueVision\'s headline and an empty status line, in the veil\'s classes',
        root.children.map((c) => c.className).join('|') === 'loading-spinner|na-le-veil__text|na-le-veil__status' && root.children[1].textContent === 'Your Drawings Are Loading' && root.children[2].textContent === '',
        root.children.map((c) => c.className + '=' + c.textContent));
    check('IsShown is true while the loading state is up', S.Na__LeLoadScreen__IsShown() === true);
    S.Na__LeLoadScreen__SetStatus('Fetching the Drawing Tools');
    check('SetStatus writes the veil\'s status line', root.querySelector('.na-le-veil__status').textContent === 'Fetching the Drawing Tools');
    const firstChildren = root.children.slice();
    S.Na__LeLoadScreen__Show();
    check('a second Show keeps the screen as it is (no rebuild)', root.children.length === 3 && root.children.every((c, i) => c === firstChildren[i]));
    S.Na__LeLoadScreen__Hide();
    check('Hide: still shown during the two frames before the fade (IsShown true)', S.Na__LeLoadScreen__IsShown() === true);
    await sleep(30);
    check('Hide: fading after two frames - opacity off, IsShown false, display still on', !root.cls.has('na-le-veil--shown') && root.cls.has('na-le-veil--visible') && S.Na__LeLoadScreen__IsShown() === false && root.style.display !== 'none');
    S.Na__LeLoadScreen__Show();
    check('Show during the fade brings it back whole', S.Na__LeLoadScreen__IsShown() === true && root.cls.has('na-le-veil--shown'));
    await sleep(400);
    check('...and the cancelled fade never takes it down', S.Na__LeLoadScreen__IsShown() === true && root.style.display !== 'none');
    S.Na__LeLoadScreen__Hide();
    await sleep(380);
    check('Hide: gone after the veil\'s 320ms fade (display none, --visible off)', root.style.display === 'none' && !root.cls.has('na-le-veil--visible') && S.Na__LeLoadScreen__IsShown() === false);
    S.Na__LeLoadScreen__ShowError('a module failed');
    check('ShowError: the start-up screen\'s full-screen error look (loading-overlay na-le-loading loading-overlay--error), shown at once',
        [ 'loading-overlay', 'na-le-loading', 'loading-overlay--error' ].every((c) => root.cls.has(c)) && !root.cls.has('na-le-veil') && root.style.display === '', root.className);
    check('ShowError: IsShown is false for the error state', S.Na__LeLoadScreen__IsShown() === false);
    check('ShowError: message, reason, Reload Page and Back to 3D Model, as before',
        root.querySelector('.loading-error-message').textContent === 'The Layout Editor could not load.' && root.querySelector('.na-le-loading__detail').textContent === 'a module failed'
        && root.querySelectorAll('.loading-error-retry-btn').map((b) => b.textContent).join('|') === 'Reload Page|Back to 3D Model');
    root.querySelector('.na-le-loading__button--secondary').fire('click');
    check('Back to 3D Model: the start-up screen\'s fade (hidden) at once', root.cls.has('hidden'));
    await sleep(560);
    check('Back to 3D Model: gone after the 500ms fade', root.style.display === 'none');
    S.Na__LeLoadScreen__Show();
    check('after the error, a new Show is the veil look again, whole', [ 'na-le-veil', 'na-le-veil--boot', 'na-le-veil--shown' ].every((c) => root.cls.has(c)) && !root.cls.has('loading-overlay--error') && !root.cls.has('hidden'), root.className);
}

// -----------------------------------------------------------------------------
// D | THE LOADER (real loader, screen and leaf; stand-ins for the rest)
// -----------------------------------------------------------------------------
section('D. Loader: the body class at the press, the hand-over after the action, every path that opens nothing');
const MODE_STUB = `
import { Na__LeLoadScreen__IsShown } from '../01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js';
const W = globalThis.__W; W.Loaded.push('mode');
if (W.FailEvaluate) throw new Error('planted: the mode controller failed to load');
const Na__LeMode__CHANGED_EVENT = 'na-layouteditor-mode-changed';
const Na__LeMode__VIEW_SHEET = 'sheet', Na__LeMode__VIEW_SPEC = 'spec', Na__LeMode__VIEW_REGISTER = 'register', Na__LeMode__VIEW_STATEMENT = 'statement';
function Na__LeMode__Initialize(ctx) { return Promise.resolve(W.InitResult); }
function Na__LeMode__Ready() { return Promise.resolve(true); }
function Na__LeMode__IsAvailable() { return W.Block.LayoutMode === true && W.Block.Sheets.length > 0; }
function Na__LeMode__IsEditable() { return true; }
function Na__LeMode__IsActive() { return W.Active; }
function Na__LeMode__GetView() { return W.View; }
function Open(view, result) {
    W.Seen.push({ view, shown : Na__LeLoadScreen__IsShown(), classOn : document.body.classList.contains('${BODY_CLASS}') });
    if (result === false || !Na__LeMode__IsAvailable()) return false;
    document.body.classList.add('${BODY_CLASS}'); W.Active = true; W.View = view; return true;
}
function Na__LeMode__Enter(sheetId) { return Open('sheet', W.EnterResult); }
function Na__LeMode__OpenSpecification() { return Open('spec', W.SpecResult); }
function Na__LeMode__Leave() { const was = W.Active; W.Active = false; document.body.classList.remove('${BODY_CLASS}'); return was; }
function Na__LeMode__SetLayoutMode(on) { W.Block.LayoutMode = on === true; return W.Block.LayoutMode; }
function Na__LeMode__WaitForFirstDrawing() { W.Waits++; return Promise.resolve(true); }
export { Na__LeMode__CHANGED_EVENT, Na__LeMode__VIEW_SHEET, Na__LeMode__VIEW_SPEC, Na__LeMode__VIEW_REGISTER, Na__LeMode__VIEW_STATEMENT, Na__LeMode__Initialize, Na__LeMode__Ready,
         Na__LeMode__IsAvailable, Na__LeMode__IsEditable, Na__LeMode__IsActive, Na__LeMode__GetView, Na__LeMode__Enter, Na__LeMode__OpenSpecification, Na__LeMode__Leave, Na__LeMode__SetLayoutMode, Na__LeMode__WaitForFirstDrawing };`;
const LOADER_STUBS = {
    '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js' : `const W = globalThis.__W;
        export const Na__DrawData__CHANGED_EVENT = 'na-layouteditor-drawingsdata-changed';
        export function Na__DrawData__GetSheetsArray() { return W.Block.Sheets; }
        export function Na__DrawData__GetLayoutModeEnabled() { return W.Block.LayoutMode === true; }
        export function Na__DrawData__SetLayoutModeEnabled(on) { W.Block.LayoutMode = on === true; return W.Block.LayoutMode; }
        export function Na__DrawData__Save() { return Promise.resolve(true); }`,
    '02__Src__AppModules/03__AppUtils/Na__AppUtils__DevGate__.js' : 'export function Na__DevGate__IsAuthoringEnabled() { return true; }',
    [P.mode] : MODE_STUB,
    [LE + '/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js'] : `const W = globalThis.__W;
        export const Na__LeModel__CHANGED_EVENT = 'na-layouteditor-sheets-changed';
        export function Na__LeModel__GetSheets() { return W.Block.Sheets; }
        export function Na__LeModel__GetActiveSheet() { return null; }
        export function Na__LeModel__GetSheetById(id) { return W.Block.Sheets.find((s) => s.Sheet__Id === id) || null; }
        export function Na__LeModel__IsDirty() { return false; }
        export function Na__LeModel__CreateSheet() { const s = { Sheet__Id : 'S' + (W.Block.Sheets.length + 1) }; W.Block.Sheets.push(s); return s; }`,
    [LE + '/50__Feature__Specification/Na__LayoutEditor__SpecData__.js'] : `export const Na__LeSpec__CHANGED_EVENT = 'na-layouteditor-spec-changed'; export function Na__LeSpec__IsDirty() { return false; }`,
    [LE + '/03__Core__Config/Na__LayoutEditor__ConfigState__.js'] : `const W = globalThis.__W;
        export function Na__LeCfg__IsEnabled() { return W.ConfigEnabled; }
        export function Na__LeCfg__GetLabel(k, f) { return f; }
        export function Na__LeCfg__FormatLabel(k, f) { return f; }`,
    [LE + '/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js'] : 'export function Na__LeVp3d__RestampForScene() { return 0; }',
    [LE + '/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js'] : 'export function Na__LePdf__Noop() { return null; }',
    [LE + '/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js'] : 'export function Na__LeTabs__Initialize() { globalThis.__W.TabsUp = true; }',
    [LE + '/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js'] : 'export function Na__LayoutEditor__DevMenu__Initialize() {}'
};
async function LoaderCase(options) {
    const W = Object.assign({ Loaded : [], Seen : [], Waits : 0, Toasts : [], Active : false, View : 'sheet', InitResult : true, ConfigEnabled : true,
                              EnterResult : true, SpecResult : true, FailEvaluate : false, Block : { LayoutMode : true, Sheets : [ { Sheet__Id : 'S1', Sheet__Viewports : [ {}, {} ] } ] } }, options || {});
    globalThis.__W = W;
    const files = Object.assign({}, LOADER_STUBS, {
        [P.loader] : readFileSync(join(ROOT, P.loader), 'utf8'),
        [P.screen] : readFileSync(join(ROOT, P.screen), 'utf8'),
        [P.leaf]   : readFileSync(join(ROOT, P.leaf), 'utf8')
    });
    const url = Tree(files);
    const page = NewPage();
    const L = await import(url(P.loader));
    const S = await import(url(P.screen));
    const errors = [];
    const realError = console.error, realWarn = console.warn, realLog = console.log;
    console.error = (...a) => errors.push(a.map(String).join(' '));
    console.warn  = () => {};
    console.log   = (...a) => { if (!String(a[0]).startsWith('[ValeVision3D]')) realLog(...a); };
    L.Na__LeLoad__Initialize({ appConfig : {}, showToast : (m, e) => W.Toasts.push([ m, e ]) });
    await sleep(5);
    return { W, L, S, page, errors, restore : () => { console.error = realError; console.warn = realWarn; console.log = realLog; } };
}
const classOn = () => document.body.classList.contains(BODY_CLASS);
const screenRoot = () => document.getElementById('naLayoutEditorLoading');
{   // D1 THE COLD FIRST PRESS OF A DRAWING TAB
    const c = await LoaderCase();
    const pressing = c.L.Na__LeLoad__Enter('S1');
    const atClick = { classOn : classOn(), shown : c.S.Na__LeLoadScreen__IsShown(), boot : !!screenRoot() && screenRoot().cls.has('na-le-veil--boot'), modeLoaded : c.W.Loaded.includes('mode') };
    check('cold press: the body class goes on AT THE CLICK, before anything of the editor is evaluated, with the boot cover up', atClick.classOn && atClick.shown && atClick.boot && !atClick.modeLoaded, atClick);
    check('cold press: the cover says "Fetching the Drawing Tools" at the click', screenRoot().querySelector('.na-le-veil__status').textContent === 'Fetching the Drawing Tools');
    const entered = await pressing;
    check('cold press: the drawing opens', entered === true && c.W.Active === true);
    check('cold press: when Enter ran, the boot cover was still up - so FirstOpen is told immediate - and the class was already on', c.W.Seen.length === 1 && c.W.Seen[0].shown === true && c.W.Seen[0].classOn === true, c.W.Seen);
    check('cold press: the last pre-load line was "Reading the Drawing Settings" (no drawing line of the loader\'s own)', screenRoot().querySelector('.na-le-veil__status').textContent === 'Reading the Drawing Settings');
    check('cold press: the loader asked for no drawing wait (the first-open veil owns the drawing)', c.W.Waits === 0);
    check('cold press: the class stays on once the editor is open', classOn());
    await sleep(30);
    check('cold press: the cover is dropped after the action - fading two frames later', c.S.Na__LeLoadScreen__IsShown() === false && !screenRoot().cls.has('na-le-veil--shown'));
    await sleep(380);
    check('cold press: the cover is gone after its fade', screenRoot().style.display === 'none');
    check('cold press: CheckNames was silent, the two view rows included', c.errors.length === 0, c.errors);
    // D9 THE WARM PATH
    const shownBefore = c.S.Na__LeLoadScreen__IsShown();
    await c.L.Na__LeLoad__Enter('S1');
    check('warm press: no cover, and Enter sees none (FirstOpen keeps TrueVision\'s 550ms rule)', shownBefore === false && c.W.Seen[1] && c.W.Seen[1].shown === false && screenRoot().style.display === 'none', c.W.Seen);
    c.restore();
}
{   // D2 A LOAD THAT FAILS
    const c = await LoaderCase({ FailEvaluate : true });
    const pressing = c.L.Na__LeLoad__Enter('S1');
    const atClick = classOn();
    const entered = await pressing;
    const root = screenRoot();
    check('load fails: the class went on at the click and is taken off again (the header comes back down)', atClick === true && classOn() === false && entered === false);
    check('load fails: the full-screen error state (loading-overlay--error), not the veil look', root.cls.has('loading-overlay--error') && root.cls.has('loading-overlay') && !root.cls.has('na-le-veil--boot'), root.className);
    root.querySelector('.na-le-loading__button--secondary').fire('click');
    await sleep(560);
    check('load fails: Back to 3D Model returns with no body class and the screen gone', classOn() === false && root.style.display === 'none');
    c.restore();
}
{   // D3 THE EDITOR'S CONFIG HAS IT OFF
    const c = await LoaderCase({ InitResult : false, ConfigEnabled : false });
    const pressing = c.L.Na__LeLoad__Enter('S1');
    const atClick = classOn();
    const entered = await pressing;
    await sleep(380);
    check('editor off in its config: class on at the click, off again; nothing opens; the reader is told; the cover goes',
        atClick && !classOn() && entered === false && c.W.Toasts.some((t) => /switched off/.test(t[0])) && screenRoot().style.display === 'none', { atClick, entered, toasts : c.W.Toasts });
    c.restore();
}
{   // D4 ENTER SAYS NO (Layout Mode switched off during the load)
    const c = await LoaderCase({ EnterResult : false });
    const pressing = c.L.Na__LeLoad__Enter('S1');
    const atClick = classOn();
    const entered = await pressing;
    await sleep(380);
    check('Enter says no: class on at the click, off again after the action; the cover goes', atClick && !classOn() && entered === false && screenRoot().style.display === 'none', { atClick, entered });
    c.restore();
}
{   // D5 / D10 THE SPECIFICATION PRESSED COLD
    const c = await LoaderCase();
    const pressing = c.L.Na__LeLoad__OpenSpecification();
    const atClick = classOn();
    await pressing;
    check('Specification pressed cold: the class goes on at the click and stays (a document tab enters too); no drawing wait', atClick && classOn() && c.W.Waits === 0);
    c.restore();
    const n = await LoaderCase({ SpecResult : false });
    const p2 = n.L.Na__LeLoad__OpenSpecification();
    const at2 = classOn();
    await p2;
    check('Specification that opens nothing: the class comes off again', at2 && !classOn());
    n.restore();
}
{   // D6 NOT OFFERED: Layout Mode off, so nothing will open
    const c = await LoaderCase({ Block : { LayoutMode : false, Sheets : [ { Sheet__Id : 'S1' } ] } });
    const pressing = c.L.Na__LeLoad__OpenSpecification();
    const atClick = classOn();
    await pressing;
    check('Layout Mode off: a press never puts the class on', !atClick && !classOn());
    c.restore();
}
{   // D7 A QUIET LOAD, AND D8 A PRESS THAT DOES NOT ENTER
    const c = await LoaderCase();
    const quiet = c.L.Na__LeLoad__Require({ quiet : true });
    const qClass = classOn(), qScreen = !!screenRoot();
    await quiet;
    check('a quiet load (the re-stamp): no class and no screen', !qClass && !qScreen && !classOn());
    c.restore();
    const d = await LoaderCase();
    const making = d.L.Na__LeLoad__CreateSheet({});
    const dClass = classOn(), dShown = d.S.Na__LeLoadScreen__IsShown();
    await making;
    check('a press that opens nothing by itself (a Dev action, + New sheet): the cover shows, the class does not', !dClass && dShown && !classOn());
    d.restore();
}

// -----------------------------------------------------------------------------
// E | THE MODE CONTROLLER (static: TrueVision's call site, the seam, the wait rule)
// -----------------------------------------------------------------------------
section('E. ModeController: FirstOpen at TrueVision\'s call site with immediate, WaitForFirstDrawing off the sheet view');
const mode = readVv(P.mode);
const tvMode = readTv(P.mode);
check('imports TrueVision\'s LoadingVeil line plus DrawingSettled', mode.includes("import { Na__LeVeil__FirstOpen, Na__LeVeil__ReturnTo3d, Na__LeVeil__Dismiss3d, Na__LeVeil__DrawingSettled } from './Na__LayoutEditor__LoadingVeil__.js';"));
check('imports Na__LeLoadScreen__IsShown from the loader\'s LoadingScreen leaf', /import \{ Na__LeLoadScreen__IsShown \} from '\.\.\/01__Core__Loader\/Na__LayoutEditor__LoadingScreen__\.js';/.test(mode));
const callOf = (text) => { const code = stripJs(text); const at = code.indexOf('if (!Na__LeVw__IsViewerMode() && !Na__LeMode__Quiet) void Na__LeVeil__FirstOpen('); return at < 0 ? null : fold(code.slice(at, code.indexOf('});', at) + 3)); };
const tvCall = callOf(tvMode), vvCall = callOf(mode);
check('the FirstOpen call is TrueVision\'s (not a viewer, not Quiet; spec, fonts, the model\'s viewport count) plus immediate : Na__LeLoadScreen__IsShown()',
    !!tvCall && vvCall === tvCall.replace('.length });', '.length, immediate : Na__LeLoadScreen__IsShown() });'), { vv : vvCall, tv : tvCall });
const seq = (text) => { const code = stripJs(text); const a = code.indexOf('const metricsLoad = Na__LeMode__PreloadMetrics();'); const b = code.indexOf('void Na__LeVeil__FirstOpen(', a); const c = code.indexOf('Na__LeModel__SetActiveSheetId(sheet.Sheet__Id);', b); return a > 0 && b > a && c > b && fold(code.slice(a, b)).length < 160; };
check('at TrueVision\'s place in Enter: straight after the metrics promise, before the sheet is made active', seq(mode) && seq(tvMode));
const waitBody = (() => { const code = stripJs(mode); const at = code.indexOf('function Na__LeMode__WaitForFirstDrawing('); return fold(code.slice(at, code.indexOf('}', code.indexOf('return Na__LeVeil__DrawingSettled', at)) + 1)); })();
check('WaitForFirstDrawing answers at once when not active OR off the sheet view, otherwise waits on DrawingSettled',
    waitBody.includes('if (!Na__LeMode__Active || Na__LeMode__View !== Na__LeMode__VIEW_SHEET) return Promise.resolve(true);') && waitBody.includes('return Na__LeVeil__DrawingSettled(count, onProgress);'), waitBody);
check('the mode controller still exports WaitForFirstDrawing (this app\'s seam)', /export \{[\s\S]*Na__LeMode__WaitForFirstDrawing[\s\S]*\};/.test(stripJs(mode)));

try { rmSync(TEMP, { recursive : true, force : true }); } catch (error) { /* the OS cleans its temp folder */ }
console.log(failures === 0 ? '\n  PASS - every check passed (' + passes + ').' : '\n  FAIL - ' + failures + ' check(s) failed, ' + passes + ' passed.');
process.exit(failures === 0 ? 0 : 1);
