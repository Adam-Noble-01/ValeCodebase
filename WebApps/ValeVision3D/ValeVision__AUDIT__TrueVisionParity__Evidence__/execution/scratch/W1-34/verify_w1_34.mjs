// =============================================================================
// W1-34 scratch harness - tab strip 2.0.0 and its Drawings menu, through the loader
// =============================================================================
//
// node verify_w1_34.mjs <ValeVision app root>
//
// A  The TabStrip is TrueVision 2.0.0 at the pin once exactly the listed seams
//    are undone (tabstrip_seams.json, written by build_tabstrip.py); it imports
//    the loader and nothing else; its label fallbacks are the config's values.
// B  The stylesheets: Boot's Tab Strip region is TrueVision's; the dead --spec
//    rule is gone from Styles__Specification.
// C  The strip running: the REAL loader, loading screen, drawing-code leaf and
//    tab strip in a fake page, with stand-ins for the drawings block, the
//    authoring gate and the editor's modules; one copy per case under the OS
//    temp folder.
// D  The mode controller, the loader and the Dev menu, read statically.
// TrueVision is read only with git show at the pin. Writes nothing outside the
// OS temp folder.
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2];
if (!ROOT || !existsSync(ROOT)) { console.log('usage: node verify_w1_34.mjs <ValeVision app root>'); process.exit(2); }
const TV_REPO = 'D:\\11_RefLib__StudioRepository__RemoteSystem\\NaWeb';
const TV_PIN  = 'b2aa9151';
const TV_APP  = 'na-apps/30__TrueVision__CoreAppCode/';
const LE = '02__Src__AppModules/51__System__LayoutEditor';
const P = {
    loader    : LE + '/01__Core__Loader/Na__LayoutEditor__Loader__.js',
    screen    : LE + '/01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js',
    leaf      : LE + '/07__Core__SheetData/Na__LayoutEditor__DrawingCode__.js',
    tabs      : LE + '/05__Core__ModeController/Na__LayoutEditor__TabStrip__.js',
    mode      : LE + '/05__Core__ModeController/Na__LayoutEditor__ModeController__.js',
    model     : LE + '/07__Core__SheetData/Na__LayoutEditor__SheetModel__.js',
    spec      : LE + '/50__Feature__Specification/Na__LayoutEditor__SpecData__.js',
    config    : LE + '/03__Core__Config/Na__LayoutEditor__ConfigState__.js',
    vp3d      : LE + '/20__System__Viewports/Na__LayoutEditor__Viewport3d__.js',
    pdf       : LE + '/60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js',
    dev       : LE + '/70__DevTools__DevMenu/Na__LayoutEditor__DevMenu__Controls__.js',
    appConfig : LE + '/03__Core__Config/Na__LayoutEditor__AppConfig__.json',
    boot      : LE + '/01__Core__Loader/Na__LayoutEditor__Styles__Boot__.css',
    main      : LE + '/10__Core__SheetSurface/Na__LayoutEditor__Styles__Main__.css',
    specCss   : LE + '/50__Feature__Specification/Na__LayoutEditor__Styles__Specification__.css',
    drawData  : '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js',
    devGate   : '02__Src__AppModules/03__AppUtils/Na__AppUtils__DevGate__.js'
};
const readVv  = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const readPre = (rel) => readFileSync(join(HERE, 'preimage', ...rel.split('/')), 'utf8').replace(/\r\n/g, '\n');
const readTv  = (rel) => execFileSync('git', [ '-C', TV_REPO, 'show', TV_PIN + ':' + TV_APP + rel ], { encoding : 'utf8', maxBuffer : 64 * 1024 * 1024 });
const sha1    = (text) => createHash('sha1').update(Buffer.from(text, 'utf8')).digest('hex');

let passes = 0, failures = 0;
const check = (name, ok, detail) => {
    if (ok) passes++; else failures++;
    let line = (ok ? '  PASS  ' : '  FAIL  ') + name;
    if (!ok && detail !== undefined) { let s; try { s = JSON.stringify(detail); } catch (e) { s = String(detail); } line += '  -> ' + (s && s.length > 700 ? s.slice(0, 700) + '...' : s); }
    console.log(line);
};
const section = (title) => console.log('\n' + title);
const sleep   = (ms) => new Promise((done) => setTimeout(done, ms));
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');
const stripJs  = (js) => js.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
const fold     = (s) => s.replace(/\s+/g, ' ').trim();
const firstDiff = (a, b) => { const x = a.split('\n'), y = b.split('\n'); const i = x.findIndex((l, k) => l !== y[k]); return i < 0 ? { lengths : [ x.length, y.length ] } : { line : i + 1, here : x[i], tv : y[i] }; };
const replaceOnce = (text, from, to, label, misses) => {
    const n = text.split(from).length - 1;
    if (n !== 1) { misses.push(label + ' found ' + n + ' times'); return text; }
    return text.replace(from, () => to);
};

const CONFIG = JSON.parse(readVv(P.appConfig));
const LABELS = CONFIG.LayoutEditor__Labels__Config;
const label  = (key) => LABELS['LayoutEditor__Labels__' + key];

// -----------------------------------------------------------------------------
// A | THE TAB STRIP, READ
// -----------------------------------------------------------------------------
section('A. TabStrip: TrueVision 2.0.0 whole, the listed seams and nothing else');
const SEAMS  = JSON.parse(readFileSync(join(HERE, 'tabstrip_seams.json'), 'utf8'));
const tvTabs = readTv(P.tabs);
check('TrueVision\'s TabStrip at the pin is the file the seam table was built from', sha1(tvTabs) === SEAMS.tv_sha1);
check('the TabStrip is LF, as git show returns TrueVision\'s', !readFileSync(join(ROOT, P.tabs), 'latin1').includes('\r'));
const vvTabs = readFileSync(join(ROOT, P.tabs), 'utf8');
{
    const misses = [];
    let undone = vvTabs;
    [ ...SEAMS.body_seams ].reverse().forEach((s, i) => { undone = replaceOnce(undone, s.vv, s.tv, 'body seam ' + (SEAMS.body_seams.length - i), misses); });
    undone = replaceOnce(undone, SEAMS.import_seam.vv, SEAMS.import_seam.tv, 'import seam', misses);
    [ ...SEAMS.header_seams ].reverse().forEach((s, i) => { undone = replaceOnce(undone, s.vv, s.tv, 'header seam ' + (SEAMS.header_seams.length - i), misses); });
    SEAMS.rename.forEach((r) => { undone = undone.replace(new RegExp('(?<![A-Za-z0-9_])' + r.vv + '(?![A-Za-z0-9_])', 'g'), r.tv); });
    check('every seam of the table is in the file exactly once (' + SEAMS.header_seams.length + ' header, 1 import, ' + SEAMS.body_seams.length + ' body)', misses.length === 0, misses);
    check('TabStrip = TrueVision 2.0.0 at the pin once the seams are undone and the ' + SEAMS.rename.length + ' facade names read back as TrueVision\'s', undone === tvTabs, firstDiff(undone, tvTabs));
}
const tabsCode = stripJs(vvTabs);
const staticImports = [ ...tabsCode.matchAll(/^\s*import\s[\s\S]*?\sfrom\s+'([^']+)'\s*;/gm) ].map((m) => m[1]);
check('the strip\'s only import is the loader facade (no editor module on the start-up path)', staticImports.length === 1 && staticImports[0] === '../01__Core__Loader/Na__LayoutEditor__Loader__.js' && !/\bimport\s*\(/.test(tabsCode), staticImports);
check('no TrueVision editor name is left in the strip\'s code', !/Na__Le(?:Cfg|Model|Mode|Spec)__\w+/.test(tabsCode.split('// REGION | Module Imports')[1] || tabsCode), (tabsCode.match(/Na__Le(?:Cfg|Model|Mode|Spec)__\w+/g) || []).slice(0, 8));
const exportsOf = (code) => { const m = code.match(/export\s*\{([\s\S]*?)\}\s*;/); return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : []; };
check('the strip exports TrueVision\'s three: Initialize, Render and CloseMenu', JSON.stringify(exportsOf(tabsCode).sort()) === JSON.stringify([ 'Na__LeTabs__CloseMenu', 'Na__LeTabs__Initialize', 'Na__LeTabs__Render' ]), exportsOf(tabsCode));
const loaderExports = new Set(exportsOf(stripJs(readVv(P.loader))));
const importedNames = (tabsCode.match(/import\s*\{([\s\S]*?)\}\s*from/) || [ '', '' ])[1].split(',').map((s) => s.trim()).filter(Boolean);
check('every name the strip imports is a loader export (' + importedNames.length + ' names)', importedNames.length === 28 && importedNames.every((n) => loaderExports.has(n)), importedNames.filter((n) => !loaderExports.has(n)));
{
    const pairs = [ ...tabsCode.matchAll(/Na__LeLoad__(?:GetLabel|FormatLabel)\('([A-Za-z]+)',\s*'([^']*)'/g) ].map((m) => ({ key : m[1], fallback : m[2], config : label(m[1]) }));
    const wrong = pairs.filter((p) => p.config !== p.fallback);
    check('every label fallback in the strip equals the config\'s value, so no tab renames itself as the editor loads (' + pairs.length + ' uses, ' + new Set(pairs.map((p) => p.key)).size + ' keys)', pairs.length >= 18 && wrong.length === 0, wrong);
}
{
    const tvLabels = JSON.parse(readTv(P.appConfig)).LayoutEditor__Labels__Config;
    const four = [ 'SpecificationTab', 'TabsPreviousTitle', 'TabsNextTitle', 'NoSheets' ];
    check('AppConfig: SpecificationTab, TabsPreviousTitle, TabsNextTitle and NoSheets read TrueVision\'s words', four.every((k) => label(k) === tvLabels['LayoutEditor__Labels__' + k]), four.map((k) => [ k, label(k) ]));
    check('AppConfig: every label the strip reads is TrueVision\'s value too', [ 'ModelTab', 'DrawingsTab', 'DrawingsTabTitle', 'DrawingsTabOpenTitle', 'RegisterTab', 'RegisterTabTitle', 'StatementsTab', 'StatementsTabTitle', 'SitePlanTabTitle', 'AddSheetTab', 'AddSheetTitle', 'SpecificationTabTitle', 'SpecificationTabUnsynced', 'TabLabelFormat', 'TabStripNote' ].every((k) => label(k) === tvLabels['LayoutEditor__Labels__' + k]));
    const devFallback = (stripJs(readVv(P.dev)).match(/GetLabel\('NoSheets',\s*'([^']*)'\)/) || [])[1];
    check('the Dev menu\'s NoSheets fallback is the config\'s value', devFallback === label('NoSheets'), devFallback);
}

// -----------------------------------------------------------------------------
// B | THE STYLESHEETS
// -----------------------------------------------------------------------------
section('B. Stylesheets: Boot\'s Tab Strip region is TrueVision\'s; the dead --spec rule is gone');
const regionOf = (css, title) => {
    const lines = css.split('\n');
    const at = lines.findIndex((l) => l.includes('REGION  |  ' + title));
    if (at < 1) return null;
    const end = lines.findIndex((l, i) => i > at && l.includes('endregion'));
    return lines.slice(at - 1, end + 1).join('\n');
};
const tvStrip = regionOf(readTv(P.main), 'Tab Strip');
const vvStrip = regionOf(readVv(P.boot), 'Tab Strip');
check('Boot\'s Tab Strip region is TrueVision\'s Styles__Main "Tab Strip" region, byte for byte (comments included, ' + (tvStrip || '').split('\n').length + ' lines)', !!tvStrip && vvStrip === tvStrip, vvStrip && tvStrip ? firstDiff(vvStrip, tvStrip) : 'region missing');
const bootCode = stripCss(readVv(P.boot));
const RETIRED = [ '.na-le-tabs__tab--add', '.na-le-tabs__renaming', '.na-le-tabs__renaming-code', '.na-le-tabs__rename' ];
check('Boot carries none of the + tab and rename rules', RETIRED.every((s) => !new RegExp(s.replace(/[.]/g, '\\.') + '(?![\\w-])').test(bootCode)));
const MENU_RULES = [ '.na-le-tabs__tab--menu-open {', '.na-le-tabs__caret {', '.na-le-tabs__tab--menu-open .na-le-tabs__caret {', '.na-le-tabs__menu {', '.na-le-tabs__menu[hidden] {', '.na-le-tabs__menu-row {', '.na-le-tabs__menu-row:hover,\n.na-le-tabs__menu-row:focus-visible {', '.na-le-tabs__menu-row--open {', '.na-le-tabs__menu-row--add {', '.na-le-tabs__menu-divider {' ];
check('Boot carries TrueVision\'s ten Drawings-menu rules', MENU_RULES.every((s) => readVv(P.boot).includes('\n' + s + '\n')), MENU_RULES.filter((s) => !readVv(P.boot).includes('\n' + s + '\n')));
const specCode = stripCss(readVv(P.specCss));
check('Styles__Specification has no .na-le-tabs__tab--spec rule (the strip names the tab --specification)', !/\.na-le-tabs__tab--spec(?![\w-])/.test(specCode));
check('Styles__Specification keeps the unsynced dot rule', specCode.includes('.na-le-tabs__tab--unsynced::after {'));
check('Styles__Specification differs from its pre-image by the dead rule and a header line only',
    fold(specCode) === fold(stripCss(readPre(P.specCss)).replace(/\.na-le-tabs__tab--spec \{\s*margin-left\s*:\s*8px;\s*\}/, '')));
check('Boot differs from its pre-image in the Tab Strip region (and comments) only',
    fold(stripCss(readVv(P.boot).replace(vvStrip, ''))) === fold(stripCss(readPre(P.boot).replace(regionOf(readPre(P.boot), 'Tab Strip'), ''))));

// -----------------------------------------------------------------------------
// C | THE STRIP RUNNING (real loader, screen, leaf and strip)
// -----------------------------------------------------------------------------
section('C. The strip running through the real loader, before and after the editor loads');

let DOC = null;
class El {
    constructor(tag) {
        this.tagName = String(tag).toUpperCase(); this.children = []; this.parent = null; this.attrs = {}; this.cls = new Set();
        this.listeners = {}; this.id = ''; this.own = ''; this.hidden = false; this.title = ''; this.disabled = false; this.draggable = false;
        this.style = { setProperty(k, v) { this[k] = v; } };
        this.scrollLeft = 0; this.scrollTop = 0; this.scrollWidth = 0; this.clientWidth = 0; this.clientHeight = 0; this.offsetTop = 0; this.rect = null;
    }
    get className() { return [ ...this.cls ].join(' '); }
    set className(v) { this.cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
    get classList() {
        const el = this;
        return {
            add      : (...n) => n.forEach((x) => el.cls.add(x)),
            remove   : (...n) => n.forEach((x) => el.cls.delete(x)),
            toggle   : (n, f) => { const on = f === undefined ? !el.cls.has(n) : !!f; if (on) el.cls.add(n); else el.cls.delete(n); return on; },
            contains : (n) => el.cls.has(n)
        };
    }
    get textContent() { return this.own + this.children.map((c) => c.textContent).join(''); }
    set textContent(v) { this.children.forEach((c) => { c.parent = null; }); this.children = []; this.own = String(v); }
    get offsetWidth() { return 240; }
    set innerHTML(v) {
        this.children.forEach((c) => { c.parent = null; }); this.children = []; this.own = '';
        const re = /<(\w+)([^>]*)>([^<]*)<\/\1>/g;
        let m;
        while ((m = re.exec(String(v))) !== null) {
            const el = new El(m[1]);
            const attrs = m[2];
            const cls = attrs.match(/class="([^"]*)"/); if (cls) el.className = cls[1];
            const type = attrs.match(/type="([^"]*)"/); if (type) el.type = type[1];
            if (/\shidden(\s|$)/.test(attrs)) el.hidden = true;
            el.own = m[3];
            this.appendChild(el);
        }
    }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
    removeChild(n) { this.children = this.children.filter((c) => c !== n); n.parent = null; return n; }
    appendChild(n) { if (n.parent) n.parent.removeChild(n); n.parent = this; this.children.push(n); if (this.onAppend) this.onAppend(n); return n; }
    append(...n) { n.forEach((x) => this.appendChild(x)); }
    insertBefore(n, ref) { if (!ref) return this.appendChild(n); if (n.parent) n.parent.removeChild(n); this.children.splice(this.children.indexOf(ref), 0, n); n.parent = this; return n; }
    get parentNode() { return this.parent; }
    get firstChild() { return this.children[0] || null; }
    get nextSibling() { if (!this.parent) return null; const a = this.parent.children; return a[a.indexOf(this) + 1] || null; }
    get childElementCount() { return this.children.length; }
    get isConnected() { let at = this; while (at.parent) at = at.parent; return !!DOC && at === DOC.documentElement; }
    contains(n) { for (let at = n; at; at = at.parent) if (at === this) return true; return false; }
    querySelectorAll(sel) { const want = sel.startsWith('.') ? sel.slice(1) : null; const out = []; const walk = (el) => { for (const c of el.children) { if (want && c.cls.has(want)) out.push(c); walk(c); } }; walk(this); return out; }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
    removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); }
    dispatch(t, extra) {
        const event = Object.assign({ type : t, target : this, defaultPrevented : false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; } }, extra || {});
        (this.listeners[t] || []).slice().forEach((fn) => fn(event));
        return event;
    }
    fire(t) { return this.dispatch(t); }
    click() { return this.dispatch('click'); }
    focus() { DOC.activeElement = this; }
    getBoundingClientRect() { return this.rect || { left : 0, right : 100, top : 0, bottom : 0, width : 100, height : 0 }; }
}
function NewPage(options) {
    const html = new El('html'), head = new El('head'), body = new El('body');
    html.appendChild(head); html.appendChild(body);
    head.onAppend = (n) => { if (n.tagName === 'LINK') setTimeout(() => n.dispatch('load'), 0); };
    const header = new El('header'); header.className = 'app-header'; body.appendChild(header);
    const docListeners = {};
    const byId = (el, id) => { if (el.id === id) return el; for (const c of el.children) { const h = byId(c, id); if (h) return h; } return null; };
    DOC = {
        documentElement : html, head, body, activeElement : body, listeners : docListeners,
        createElement    : (t) => new El(t),
        getElementById   : (id) => byId(html, id),
        querySelector    : (sel) => {
            const m = sel.match(/^link\[data-na-le-stylesheet="(.*)"\]$/);
            if (m) return head.children.find((c) => c.getAttribute('data-na-le-stylesheet') === m[1]) || null;
            return html.querySelector(sel);
        },
        querySelectorAll : (sel) => html.querySelectorAll(sel),
        addEventListener    : (t, fn) => { (docListeners[t] = docListeners[t] || []).push(fn); },
        removeEventListener : (t, fn) => { docListeners[t] = (docListeners[t] || []).filter((f) => f !== fn); }
    };
    globalThis.document = DOC;
    const win = new EventTarget();
    win.innerWidth = (options && options.width) || 1280;
    win.innerHeight = 800;
    win.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 4);
    win.cancelAnimationFrame  = (id) => clearTimeout(id);
    win.setTimeout            = (fn, ms) => setTimeout(fn, ms);
    win.clearTimeout          = (id) => clearTimeout(id);
    win.location              = { hostname : 'localhost', reload() {} };
    globalThis.window = win;
    return { html, head, body, header, win };
}
// A press or a key arriving at the document's capture listeners, as the browser sends them first
function DocEvent(type, target, extra) {
    const event = Object.assign({ type, target, defaultPrevented : false, stopped : false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; } }, extra || {});
    (DOC.listeners[type] || []).slice().forEach((fn) => fn(event));
    return event;
}

const EVENTS = { sheets : 'na-layouteditor-sheets-changed', mode : 'na-layouteditor-mode-changed', spec : 'na-layouteditor-spec-changed' };
const STANDINS = {
    [P.drawData] : `const W = globalThis.__W;
        export const Na__DrawData__CHANGED_EVENT = 'na-layouteditor-drawingsdata-changed';
        export function Na__DrawData__GetSheetsArray() { return W.Block.Sheets; }
        export function Na__DrawData__GetLayoutModeEnabled() { return W.Block.LayoutMode === true; }
        export function Na__DrawData__SetLayoutModeEnabled(on) { W.Block.LayoutMode = on === true; return W.Block.LayoutMode; }
        export function Na__DrawData__Save() { return Promise.resolve(true); }`,
    [P.devGate] : 'export function Na__DevGate__IsAuthoringEnabled() { return globalThis.__W.Editable; }',
    [P.mode] : `const W = globalThis.__W; W.Loaded.push('mode');
        const Na__LeMode__CHANGED_EVENT = '${EVENTS.mode}';
        const Na__LeMode__VIEW_SHEET = 'sheet', Na__LeMode__VIEW_SPEC = 'spec', Na__LeMode__VIEW_REGISTER = 'register', Na__LeMode__VIEW_STATEMENT = 'statement';
        const announce = () => window.dispatchEvent(new CustomEvent(Na__LeMode__CHANGED_EVENT, { detail : { isActive : W.Active, view : W.View } }));
        function Na__LeMode__Initialize() { return Promise.resolve(true); }
        function Na__LeMode__Ready() { return Promise.resolve(true); }
        function Na__LeMode__IsAvailable() { return W.Block.LayoutMode === true && W.Block.Sheets.length > 0; }
        function Na__LeMode__IsEditable() { return W.Editable; }
        function Na__LeMode__IsActive() { return W.Active; }
        function Na__LeMode__GetView() { return W.View; }
        function Na__LeMode__Enter(sheetId) {
            const menu = document.getElementById('naLayoutEditorDrawingsMenu');
            W.Calls.push([ 'Enter', sheetId, { menuHidden : !menu || menu.hidden === true } ]);
            if (!Na__LeMode__IsAvailable()) return false;
            W.Active = true; W.View = 'sheet'; W.ActiveId = sheetId || W.Sorted()[0].Sheet__Id;
            document.body.classList.add('na-layout-editor--active'); announce(); return true;
        }
        function Na__LeMode__OpenSpecification() { W.Calls.push([ 'OpenSpecification' ]); if (!W.Active) { W.Active = true; W.ActiveId = W.Sorted()[0].Sheet__Id; } W.View = 'spec'; document.body.classList.add('na-layout-editor--active'); announce(); return true; }
        function Na__LeMode__OpenRegister() { W.Calls.push([ 'OpenRegister' ]); return false; }
        function Na__LeMode__OpenStatements() { W.Calls.push([ 'OpenStatements' ]); return false; }
        function Na__LeMode__Leave() { W.Calls.push([ 'Leave' ]); if (!W.Active) return false; W.Active = false; W.View = 'sheet'; W.ActiveId = null; document.body.classList.remove('na-layout-editor--active'); announce(); return true; }
        function Na__LeMode__SetLayoutMode(on) { W.Block.LayoutMode = on === true; if (!on && W.Active) Na__LeMode__Leave(); return W.Block.LayoutMode; }
        function Na__LeMode__WaitForFirstDrawing() { return Promise.resolve(true); }
        export { Na__LeMode__CHANGED_EVENT, Na__LeMode__VIEW_SHEET, Na__LeMode__VIEW_SPEC, Na__LeMode__VIEW_REGISTER, Na__LeMode__VIEW_STATEMENT, Na__LeMode__Initialize, Na__LeMode__Ready,
                 Na__LeMode__IsAvailable, Na__LeMode__IsEditable, Na__LeMode__IsActive, Na__LeMode__GetView, Na__LeMode__Enter, Na__LeMode__OpenSpecification, Na__LeMode__OpenRegister,
                 Na__LeMode__OpenStatements, Na__LeMode__Leave, Na__LeMode__SetLayoutMode, Na__LeMode__WaitForFirstDrawing };`,
    [P.model] : `const W = globalThis.__W; W.Loaded.push('model');
        export const Na__LeModel__CHANGED_EVENT = '${EVENTS.sheets}';
        const announce = (reason) => window.dispatchEvent(new CustomEvent(Na__LeModel__CHANGED_EVENT, { detail : { reason } }));
        export function Na__LeModel__GetSheets() { return W.Sorted(); }
        export function Na__LeModel__GetActiveSheet() { return W.Active ? (W.Block.Sheets.find((s) => s.Sheet__Id === W.ActiveId) || null) : null; }
        export function Na__LeModel__GetSheetById(id) { return W.Block.Sheets.find((s) => s.Sheet__Id === id) || null; }
        export function Na__LeModel__IsDirty() { return false; }
        export function Na__LeModel__CreateSheet() {
            const n = W.Block.Sheets.length + 1;
            const sheet = { Sheet__Id : 'S' + n, Sheet__Name : 'New Drawing', Sheet__Order : n, Sheet__PaperSize : 'A3', Sheet__Fields : {}, Sheet__Viewports : [] };
            W.Calls.push([ 'CreateSheet', sheet.Sheet__Id ]); W.Block.Sheets.push(sheet); announce('sheets'); return sheet;
        }
        export function Na__LeModel__ReorderSheet(id, index) {
            W.Calls.push([ 'ReorderSheet', id, index ]);
            const list = W.Sorted().filter((s) => s.Sheet__Id !== id);
            list.splice(index, 0, W.Block.Sheets.find((s) => s.Sheet__Id === id));
            list.forEach((s, i) => { s.Sheet__Order = i + 1; });
            announce('reorder'); return true;
        }
        export function Na__LeModel__UpdateSheet() { return null; }
        export function Na__LeModel__DuplicateSheet() { return null; }
        export function Na__LeModel__DeleteSheet() { return false; }
        export function Na__LeModel__Save() { return Promise.resolve(true); }`,
    [P.spec]   : `const W = globalThis.__W; W.Loaded.push('spec'); export const Na__LeSpec__CHANGED_EVENT = '${EVENTS.spec}'; export function Na__LeSpec__IsDirty() { return W.SpecDirty === true; }`,
    [P.config] : `const W = globalThis.__W; W.Loaded.push('config');
        const L = W.Labels;
        export function Na__LeCfg__IsEnabled() { return true; }
        export function Na__LeCfg__GetLabel(k, f) { const v = L['LayoutEditor__Labels__' + k]; return typeof v === 'string' ? v : f; }
        export function Na__LeCfg__FormatLabel(k, f, t) { let s = Na__LeCfg__GetLabel(k, f); Object.keys(t || {}).forEach((x) => { s = s.split('{' + x + '}').join(String(t[x])); }); return s; }`,
    [P.vp3d] : `globalThis.__W.Loaded.push('vp3d'); export function Na__LeVp3d__RestampForScene() { return 0; }`,
    [P.pdf]  : `globalThis.__W.Loaded.push('pdf'); export function Na__LePdf__ExportSheet() { return null; }`,
    [P.dev]  : 'export function Na__LayoutEditor__DevMenu__Initialize() { return true; }'
};
const EDITOR_PARTS = [ 'mode', 'model', 'spec', 'config', 'vp3d', 'pdf' ];

const TEMP = mkdtempSync(join(tmpdir(), 'w134-verify-'));
let caseNo = 0;
function Tree(files) {
    const dir = join(TEMP, 'case' + (++caseNo));
    Object.entries(files).forEach(([ rel, text ]) => { const full = join(dir, rel); mkdirSync(dirname(full), { recursive : true }); writeFileSync(full, text); });
    return (rel) => pathToFileURL(join(dir, rel)).href;
}
function Sheets() {
    return [
        { Sheet__Id : 'S1', Sheet__Name : 'Ground Floor Plan', Sheet__Order : 2, Sheet__PaperSize : 'A3', Sheet__Fields : { Sheet__Fields__DrawingNumber : '3047_D02' }, Sheet__Viewports : [ {}, {} ] },
        { Sheet__Id : 'S2', Sheet__Name : 'Site Location',     Sheet__Order : 1, Sheet__PaperSize : 'A3', Sheet__Fields : { Sheet__Fields__DrawingNumber : '3047_D01' }, Sheet__Viewports : [ {} ] },
        { Sheet__Id : 'S3', Sheet__Name : 'Elevations',        Sheet__Order : 3, Sheet__PaperSize : 'A3', Sheet__Fields : { Sheet__Fields__DrawingNumber : '3047_D03' }, Sheet__Viewports : [] }
    ];
}
async function StripCase(options) {
    const W = Object.assign({ Loaded : [], Calls : [], Active : false, View : 'sheet', ActiveId : null, Editable : true, SpecDirty : false, Labels : LABELS,
                              Block : { LayoutMode : true, Sheets : Sheets() }, LoaderText : readFileSync(join(ROOT, P.loader), 'utf8') }, options || {});
    W.Sorted = () => W.Block.Sheets.slice().sort((a, b) => a.Sheet__Order - b.Sheet__Order);
    globalThis.__W = W;
    const files = Object.assign({}, STANDINS, {
        [P.loader] : W.LoaderText,
        [P.screen] : readFileSync(join(ROOT, P.screen), 'utf8'),
        [P.leaf]   : readFileSync(join(ROOT, P.leaf), 'utf8'),
        [P.tabs]   : readFileSync(join(ROOT, P.tabs), 'utf8')
    });
    const url = Tree(files);
    const page = NewPage(options);
    const L = await import(url(P.loader));
    const errors = [];
    const real = { error : console.error, warn : console.warn, log : console.log };
    console.error = (...a) => errors.push(a.map(String).join(' '));
    console.warn  = () => {};
    console.log   = (...a) => { if (!String(a[0]).startsWith('[ValeVision3D]')) real.log(...a); };
    L.Na__LeLoad__Initialize({ appConfig : { LayoutEditor__Config : { LayoutEditor__Config__ReadOnlyOnWeb : true } }, showToast : () => {} });
    await sleep(30);
    const tabsUrl = url(P.tabs);
    return {
        W, L, page, errors, tabsUrl,
        T     : () => import(tabsUrl),
        nav   : () => DOC.getElementById('naLayoutEditorTabStrip'),
        menu  : () => DOC.getElementById('naLayoutEditorDrawingsMenu'),
        tabs  : () => { const n = DOC.getElementById('naLayoutEditorTabStrip'); return n ? n.querySelector('.na-le-tabs__scroller').children : []; },
        tab   : (cls) => { const n = DOC.getElementById('naLayoutEditorTabStrip'); return n ? n.querySelector('.na-le-tabs__tab--' + cls) : null; },
        rows  : () => { const m = DOC.getElementById('naLayoutEditorDrawingsMenu'); return m ? m.querySelectorAll('.na-le-tabs__menu-row') : []; },
        editorLoaded : () => W.Loaded.filter((p) => EDITOR_PARTS.includes(p)),
        restore : () => { console.error = real.error; console.warn = real.warn; console.log = real.log; }
    };
}
const ownTexts = (els) => els.map((e) => e.own);
const isActive = (el) => !!el && el.cls.has('na-le-tabs__tab--active');

{   // C1 THE STRIP FROM THE 3D VIEW, BEFORE THE EDITOR EXISTS
    const c = await StripCase();
    const nav = c.nav();
    check('offered: the loader imports the strip, which builds itself under the header', !!nav && nav.parent === c.page.body && c.page.body.children.indexOf(nav) === c.page.body.children.indexOf(c.page.header) + 1);
    check('offered: shown - the height published (36px) and the body class on', nav && nav.hidden === false && c.page.html.style['--Vale_LayoutTabStripHeight'] === '36px' && c.page.body.cls.has('na-layout-tabs--visible'));
    check('from the 3D view the strip reads 3D Model | Drawings | Specification (no Register or Statements in this build)', JSON.stringify(ownTexts(c.tabs())) === JSON.stringify([ '3D Model', 'Drawings', 'Specification' ]), ownTexts(c.tabs()));
    check('3D Model is the open tab; Drawings and Specification are not', isActive(c.tab('model')) && !isActive(c.tab('drawings')) && !isActive(c.tab('specification')));
    check('all tabs at the same weight: every tab is a plain na-le-tabs__tab, the open one alone marked', c.tabs().every((t) => [ ...t.cls ].filter((k) => k !== 'na-le-tabs__tab--active' && k !== 'na-le-tabs__tab').length === 1));
    check('the Drawings tab carries the caret and is a menu button', c.tab('drawings').children.length === 1 && c.tab('drawings').children[0].cls.has('na-le-tabs__caret') && c.tab('drawings').children[0].own === '\u25be'
        && c.tab('drawings').getAttribute('aria-haspopup') === 'menu' && c.tab('drawings').getAttribute('aria-expanded') === 'false' && c.tab('drawings').getAttribute('aria-controls') === 'naLayoutEditorDrawingsMenu');
    check('the Specification tab is --specification (not --spec), with its hover text', c.tab('specification').cls.has('na-le-tabs__tab--specification') && !c.tab('specification').cls.has('na-le-tabs__tab--spec') && c.tab('specification').title === label('SpecificationTabTitle'));
    check('hovers and arrows read TrueVision\'s words', c.tab('drawings').title === 'The drawings of this project. Press to choose one'
        && nav.querySelector('.na-le-tabs__arrow--prev').title === 'The tab before this one' && nav.querySelector('.na-le-tabs__arrow--next').title === 'The tab after this one' && nav.getAttribute('aria-label') === 'Project documents');
    check('a cold load: no editor module fetched, only the strip', c.editorLoaded().length === 0, c.W.Loaded);

    // C2 THE DRAWINGS MENU
    c.tab('drawings').click();
    const menu = c.menu();
    check('Drawings opens the menu on the body, shown, the tab marked open', !!menu && menu.parent === c.page.body && menu.hidden === false && c.tab('drawings').cls.has('na-le-tabs__tab--menu-open') && c.tab('drawings').getAttribute('aria-expanded') === 'true');
    check('the menu lists every sheet as "D0n - Name" in order, then a rule and + New sheet (editable)',
        JSON.stringify(ownTexts(c.rows())) === JSON.stringify([ 'D01 - Site Location', 'D02 - Ground Floor Plan', 'D03 - Elevations', '+ New sheet' ]) && menu.querySelectorAll('.na-le-tabs__menu-divider').length === 1,
        ownTexts(c.rows()));
    check('each drawing row carries its whole number on its hover', c.rows().slice(0, 3).map((r) => r.title).join('|') === '3047_D01|3047_D02|3047_D03', c.rows().map((r) => r.title));
    check('nothing is open, so the first row has the focus', DOC.activeElement === c.rows()[0]);
    check('the menu is placed under the strip and inside the window', menu.style.top === '0px' && menu.style.left === '8px' && /px$/.test(menu.style.maxHeight), menu.style);
    check('still no editor module: the menu is drawn from the raw block', c.editorLoaded().length === 0);

    // C3 KEYS
    DocEvent('keydown', DOC.activeElement, { key : 'ArrowDown' });
    const afterDown = c.rows().indexOf(DOC.activeElement);
    DocEvent('keydown', DOC.activeElement, { key : 'End' });
    const afterEnd = c.rows().indexOf(DOC.activeElement);
    DocEvent('keydown', DOC.activeElement, { key : 'Home' });
    const afterHome = c.rows().indexOf(DOC.activeElement);
    const up = DocEvent('keydown', DOC.activeElement, { key : 'ArrowUp' });
    const afterUp = c.rows().indexOf(DOC.activeElement);
    check('Down, End, Home and Up walk the rows (stopped before the sheet\'s keyboard)', afterDown === 1 && afterEnd === 3 && afterHome === 0 && afterUp === 0 && up.defaultPrevented && up.stopped, [ afterDown, afterEnd, afterHome, afterUp ]);
    const esc = DocEvent('keydown', DOC.activeElement, { key : 'Escape' });
    check('Escape shuts the menu and gives the focus back to the Drawings tab', menu.hidden === true && DOC.activeElement === c.tab('drawings') && c.tab('drawings').getAttribute('aria-expanded') === 'false' && esc.defaultPrevented);

    // C4 AN OUTSIDE PRESS
    c.tab('drawings').click();
    DocEvent('pointerdown', c.page.header);
    check('a press outside shuts the menu', c.menu().hidden === true && !c.tab('drawings').cls.has('na-le-tabs__tab--menu-open'));
    c.tab('drawings').click();
    DocEvent('pointerdown', c.tab('drawings'));
    const stillOpen = c.menu().hidden === false;
    c.tab('drawings').click();
    check('a press on the Drawings tab itself is left to its click, which shuts it', stillOpen && c.menu().hidden === true);

    // C5 DRAG A ROW TO A NEW PLACE (cold: the drop loads the editor first)
    c.tab('drawings').click();
    const rows = c.rows();
    check('editable: the drawing rows can be dragged; + New sheet cannot', rows.slice(0, 3).every((r) => r.draggable === true) && rows[3].draggable !== true);
    rows[0].dispatch('dragstart', { dataTransfer : {} });
    const over = rows[2].dispatch('dragover');
    const self = rows[0].dispatch('dragover');
    rows[2].dispatch('drop');
    await sleep(60);
    const reorder = c.W.Calls.find((k) => k[0] === 'ReorderSheet');
    check('a drop on another row reorders through the loader: the dragged drawing to the row\'s place', over.defaultPrevented && !self.defaultPrevented && !!reorder && reorder[1] === 'S2' && reorder[2] === 2, c.W.Calls);
    check('the menu stays open through the rebuild, its rows in the new order', c.menu().hidden === false && JSON.stringify(ownTexts(c.rows()).slice(0, 3)) === JSON.stringify([ 'D02 - Ground Floor Plan', 'D03 - Elevations', 'D01 - Site Location' ]), ownTexts(c.rows()));
    check('the loader checked its name copies against the editor\'s: nothing reported', c.errors.length === 0, c.errors);

    // C6 PICK A ROW (the editor is loaded now)
    const pick = c.rows().find((r) => r.getAttribute('data-na-sheet-id') === 'S1');
    pick.click();
    const enter = c.W.Calls.filter((k) => k[0] === 'Enter').pop();
    check('a row shuts the menu first, then opens its drawing', !!enter && enter[1] === 'S1' && enter[2].menuHidden === true, c.W.Calls);
    await sleep(5);
    check('Drawings is the open tab, its hover naming the open drawing', isActive(c.tab('drawings')) && !isActive(c.tab('model')) && c.tab('drawings').title === '3047_D02 is open. Press to choose another drawing', c.tab('drawings').title);

    // C7 REOPEN WITH A DRAWING OPEN
    c.tab('drawings').click();
    const open = c.rows().find((r) => r.cls.has('na-le-tabs__menu-row--open'));
    check('reopened: the open drawing\'s row is marked (bold), current and focused', !!open && open.getAttribute('data-na-sheet-id') === 'S1' && open.getAttribute('aria-current') === 'true' && DOC.activeElement === open);
    check('pressing Drawings with a drawing open only opens the menu: no new Enter', c.W.Calls.filter((k) => k[0] === 'Enter').length === 1);

    // C8 ANY DOCUMENT CHANGE SHUTS IT
    c.tab('specification').click();
    await sleep(5);
    check('a press on Specification shuts the menu (any document change), and opens the specification', c.menu().hidden === true && c.W.Calls.some((k) => k[0] === 'OpenSpecification') && isActive(c.tab('specification')) && !isActive(c.tab('drawings')));
    c.tab('drawings').click();
    c.tab('model').click();
    await sleep(5);
    check('3D Model while the menu is open: the menu shuts, the editor is left, 3D Model is the open tab', c.menu().hidden === true && c.W.Calls.some((k) => k[0] === 'Leave') && isActive(c.tab('model')));

    // C9 CloseMenu
    const T = await c.T();
    c.tab('drawings').click();
    const closed = T.Na__LeTabs__CloseMenu(false);
    check('Na__LeTabs__CloseMenu is exported and shuts the menu (true), then answers false', closed === true && c.menu().hidden === true && T.Na__LeTabs__CloseMenu(false) === false);

    // C10 LAYOUT MODE OFF: no strip
    c.L.Na__LeLoad__SetLayoutMode(false);
    await sleep(5);
    check('Layout Mode off: the strip hides (height 0, body class off)', c.nav().hidden === true && c.page.html.style['--Vale_LayoutTabStripHeight'] === '0px' && !c.page.body.cls.has('na-layout-tabs--visible'));
    c.L.Na__LeLoad__SetLayoutMode(true);
    await sleep(5);
    check('Layout Mode back on: the strip is back', c.nav().hidden === false && c.page.body.cls.has('na-layout-tabs--visible'));
    c.restore();
}

{   // C11 THE SPECIFICATION PRESSED COLD FROM THE 3D VIEW
    const c = await StripCase();
    c.tab('specification').click();
    const classAtPress = DOC.body.cls.has('na-layout-editor--active');
    await sleep(60);
    check('Specification from the 3D view, cold: the bar folds at the press (the loader\'s early class) and the page opens', classAtPress && c.W.Calls.some((k) => k[0] === 'OpenSpecification') && isActive(c.tab('specification')));
    check('...and nothing asks for a drawing (no Enter of the loader\'s own)', !c.W.Calls.some((k) => k[0] === 'Enter'));
    c.restore();
}

{   // C12 + NEW SHEET ON A COLD EDITOR
    const c = await StripCase();
    c.tab('drawings').click();
    c.rows()[3].click();
    check('+ New sheet shuts the menu first', c.menu().hidden === true);
    await sleep(80);
    const made = c.W.Calls.find((k) => k[0] === 'CreateSheet');
    const entered = c.W.Calls.find((k) => k[0] === 'Enter');
    check('+ New sheet on a cold editor: the editor loads, one sheet is made, then opened', !!made && !!entered && entered[1] === made[1] && c.W.Calls.indexOf(made) < c.W.Calls.indexOf(entered) && c.W.Calls.filter((k) => k[0] === 'CreateSheet').length === 1, c.W.Calls);
    c.restore();
}

{   // C13 THE LABELS DO NOT CHANGE WHEN THE EDITOR FINISHES LOADING
    const c = await StripCase();
    const snapshot = () => {
        const nav = c.nav();
        c.tab('drawings').click();
        const out = { tabs : c.tabs().map((t) => [ t.own, t.title, t.className ]), arrows : [ nav.querySelector('.na-le-tabs__arrow--prev').title, nav.querySelector('.na-le-tabs__arrow--next').title ],
                      rows : c.rows().map((r) => [ r.own, r.title ]), menuLabel : c.menu().getAttribute('aria-label') };
        c.tab('drawings').click();
        return out;
    };
    const before = snapshot();
    await c.L.Na__LeLoad__Require({ quiet : true });
    await sleep(20);
    const T = await c.T();
    T.Na__LeTabs__Render();
    const after = snapshot();
    check('the editor loaded (quietly) and the strip was redrawn from it', c.editorLoaded().length === EDITOR_PARTS.length);
    check('tab labels, hovers, arrow titles and menu rows read the same before and after the load', JSON.stringify(before) === JSON.stringify(after), { before, after });
    c.restore();
}

{   // C14 375 PX: THE ARROWS, AND NEXT FROM 3D MODEL OPENS A DRAWING WITHOUT THE MENU
    const c = await StripCase({ width : 375 });
    const scroller = c.nav().querySelector('.na-le-tabs__scroller');
    scroller.scrollWidth = 420; scroller.clientWidth = 300;
    window.dispatchEvent(new Event('resize'));
    const prev = c.nav().querySelector('.na-le-tabs__arrow--prev'), next = c.nav().querySelector('.na-le-tabs__arrow--next');
    check('at 375 px the end arrows appear (prev disabled on 3D Model, next enabled)', prev.hidden === false && next.hidden === false && prev.disabled === true && next.disabled === false);
    next.click();
    await sleep(80);
    const enter = c.W.Calls.find((k) => k[0] === 'Enter');
    check('next from 3D Model opens a drawing (the first) without the menu', !!enter && enter[1] === null && (!c.menu() || c.menu().hidden === true) && isActive(c.tab('drawings')), c.W.Calls);
    c.restore();
}

{   // C15 A READ-ONLY SESSION
    const c = await StripCase({ Editable : false });
    c.tab('drawings').click();
    check('not editable: no + New sheet row and no rule; the rows cannot be dragged', c.rows().length === 3 && c.menu().querySelectorAll('.na-le-tabs__menu-divider').length === 0 && c.rows().every((r) => r.draggable !== true), ownTexts(c.rows()));
    c.restore();
}

{   // C16 A RENAME WHILE THE MENU IS OPEN (before the load: the drawings block changes)
    const c = await StripCase();
    c.tab('drawings').click();
    c.W.Block.Sheets[0].Sheet__Name = 'Ground Floor';
    window.dispatchEvent(new CustomEvent('na-layouteditor-drawingsdata-changed'));
    await sleep(5);
    check('a rebuild while the menu is open keeps it open and refreshes its rows', c.menu().hidden === false && ownTexts(c.rows()).includes('D02 - Ground Floor'), ownTexts(c.rows()));
    c.restore();
}

{   // C17 NO SHEETS, OR LAYOUT MODE OFF: THE STRIP IS NEVER FETCHED
    const a = await StripCase({ Block : { LayoutMode : true, Sheets : [] } });
    check('a project with no sheets: no strip at all', !a.nav());
    a.restore();
    const b = await StripCase({ Block : { LayoutMode : false, Sheets : Sheets() } });
    check('Layout Mode off: no strip at all', !b.nav());
    b.restore();
}

{   // C18 WHEN THE REGISTER AND THE STATEMENTS LAND (the feature map flipped, a planted copy of the loader)
    const flipped = readFileSync(join(ROOT, P.loader), 'utf8')
        .replace(/(\[Na__LeLoad__VIEW_REGISTER\]\s*:\s*)false/, '$1true')
        .replace(/(\[Na__LeLoad__VIEW_STATEMENT\]\s*:\s*)false/, '$1true');
    const c = await StripCase({ LoaderText : flipped });
    check('with both features present the strip reads TrueVision\'s five tabs, in its order', JSON.stringify(ownTexts(c.tabs())) === JSON.stringify([ '3D Model', 'Drawings', 'Specification', 'Document Register', 'Design Statements' ]), ownTexts(c.tabs()));
    check('...the two document tabs with TrueVision\'s hovers and classes', c.tab('register').title === label('RegisterTabTitle') && c.tab('statement').title === label('StatementsTabTitle'));
    c.restore();
}

// -----------------------------------------------------------------------------
// D | THE MODE CONTROLLER, THE LOADER AND THE DEV MENU, READ
// -----------------------------------------------------------------------------
section('D. ModeController (OpenSpecification through EnterUnder), Loader (header only), Dev menu (one fallback)');
const fnBody = (code, name) => { const at = code.indexOf('function ' + name + '('); if (at < 0) return null; let depth = 0, i = code.indexOf('{', at); const start = i; for (; i < code.length; i++) { if (code[i] === '{') depth++; else if (code[i] === '}') { depth--; if (depth === 0) break; } } return code.slice(start, i + 1); };
const mode = readVv(P.mode), tvMode = readTv(P.mode);
const vvOpen = fold(fnBody(stripJs(mode), 'Na__LeMode__OpenSpecification') || '');
const tvOpen = fold((fnBody(stripJs(tvMode), 'Na__LeMode__OpenSpecification') || '').replace('Na__LeRegEd__Hide();', '').replace('Na__LeStmtPage__Hide();', ''));
check('OpenSpecification is TrueVision\'s body (through EnterUnder) without the register and statements hides', vvOpen.length > 100 && vvOpen === tvOpen, { vv : vvOpen.slice(0, 200), tv : tvOpen.slice(0, 200) });
const tvComment = tvMode.slice(tvMode.indexOf('    // FUNCTION | Show the Project Specification Tab'), tvMode.indexOf('    function Na__LeMode__OpenSpecification('));
check('TrueVision\'s comment stands over it', tvComment.length > 200 && mode.includes(tvComment + '    function Na__LeMode__OpenSpecification('));
check('EnterUnder is still TrueVision\'s', fold(fnBody(stripJs(mode), 'Na__LeMode__EnterUnder')) === fold(fnBody(stripJs(tvMode), 'Na__LeMode__EnterUnder')));
check('the mode controller logs 1.18.3 for this package, newest first', /\/\/ DEVELOPMENT LOG:\n\/\/ 02-Oct-2026 - Version 1\.18\.3 \(the specification under its own tab, \{\{VVREL:W1-34\}\}\)/.test(mode));
check('the mode controller\'s code differs from its pre-image in OpenSpecification\'s guard line only',
    fold(stripJs(mode)).replace('if (!Na__LeMode__EnterUnder()) return false;', '#') === fold(stripJs(readPre(P.mode))).replace('if (!Na__LeMode__Active && !Na__LeMode__Enter(null)) return false;', '#'));
check('the loader\'s code is unchanged (header and log only)', fold(stripJs(readVv(P.loader))) === fold(stripJs(readPre(P.loader))));
check('the loader logs 1.1.3 for this package', /\/\/ 02-Oct-2026 - Version 1\.1\.3 \(TrueVision's tab strip 2\.0\.0, \{\{VVREL:W1-34\}\}\)/.test(readVv(P.loader)));
check('the Dev menu\'s code differs from its pre-image in the NoSheets fallback only',
    fold(stripJs(readVv(P.dev))).replace(label('NoSheets'), '#') === fold(stripJs(readPre(P.dev))).replace('No sheets yet. New Sheet makes the first one and opens it.', '#'));

try { rmSync(TEMP, { recursive : true, force : true }); } catch (error) { /* the OS cleans its temp folder */ }
console.log(failures === 0 ? '\n  PASS - every check passed (' + passes + ').' : '\n  FAIL - ' + failures + ' check(s) failed, ' + passes + ' passed.');
process.exit(failures === 0 ? 0 : 1);
