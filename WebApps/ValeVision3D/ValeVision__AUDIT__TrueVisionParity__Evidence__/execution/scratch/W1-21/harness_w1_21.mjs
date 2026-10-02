// W1-21 scratch harness: the SheetModel facade 1.35.1, the Sheets unit 1.4.0, History 1.7.0 and the loader's late
// start, proved on ValeVision's real module graph - against ValeVision before this package, a mix of the two, and
// TrueVision's own Sheets unit.
//
//   node harness_w1_21.mjs --root <app root holding W1-21's files> --old <dir with the four pre-images>
//                          --tvsheets <TrueVision's Sheets unit at the pin> --wcp <Whitecardopedia Projects dir>
//                          [--out <dir>]
//
// HOW IT RUNS. Every case runs in a process of its own (this file with --child), so each has one module graph and
// one window: the late start is about who hears an event, and two graphs in one window would hear each other's.
// Node module hooks serve the app root under a pretend address (http://w121.test/vv/), every module the file on
// disk, as shipped. A variant swaps whole files only:
//   new      the app as given (--root)
//   old      the facade, the Sheets unit, History and the loader as they were before W1-21 (--old)
//   mixed    W1-21's model with the OLD loader (its re-announcement kept): why the deletion is one change
//   tv       W1-21's files with TrueVision's own Sheets unit (--tvsheets)
//   newblock / tvblock   new / tv with a Drawing Register block in the project data
// REAL: ProjectData (TrueVision 1.6.0 over this app's facade), the facade and every model unit, SheetRecords and
// its leaves, the config units over the real AppConfig JSON, Common, ProjectRecord, History, AutoSave, the loader
// and the DrawingCode leaf. STAND-INS, only for what reaches the network, the page or the 3D model: the transport
// facade (R2 writes are counted, never sent), the local mirror, the presentation block, the project loader, the
// specification document, PanelHost, ModelToggle, the plan and elevation readers, the authoring gate, the loading
// screen, the tab strip, and the editor parts the loader imports beside the model and the config. The mode
// controller stand-in runs the real start-up pass's shape: one synchronous .then that initialises the model,
// History and AutoSave, then a .catch the loader awaits (ModeController :1088-1137).
//
// Exit 0 = every check held. Writes only to the OS temp folder and to --out.

import { register } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve, sep, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// -----------------------------------------------------------------------------
// Options
// -----------------------------------------------------------------------------
const ARGS = { child : false };
for (let i = 2; i < process.argv.length; i++) {
    const key = process.argv[i].replace(/^--/, '');
    if (key === 'child') { ARGS.child = true; continue; }
    ARGS[key] = process.argv[i + 1]; i++;
}
for (const need of [ 'root', 'old', 'tvsheets', 'wcp' ]) {
    if (!ARGS[need] || !existsSync(ARGS[need])) { console.error('missing or unreadable --' + need + ' ' + ARGS[need]); process.exit(2); }
}
const SELF = fileURLToPath(import.meta.url);
const BASE = 'http://w121.test/vv/';
const SRC  = '02__Src__AppModules/';
const LE   = SRC + '51__System__LayoutEditor/';
const DATA = LE + '07__Core__SheetData/';
const P = {
    facade   : DATA + 'Na__LayoutEditor__SheetModel__.js',
    sheets   : DATA + 'Na__LayoutEditor__SheetModel__Sheets__.js',
    history  : DATA + 'Na__LayoutEditor__History__.js',
    autosave : DATA + 'Na__LayoutEditor__AutoSave__.js',
    loader   : LE + '01__Core__Loader/Na__LayoutEditor__Loader__.js',
    drawData : SRC + '40__System__DrawingViewCore/Na__DrawView__ProjectData__.js',
    config   : LE + '03__Core__Config/Na__LayoutEditor__ConfigState__.js',
    mode     : LE + '05__Core__ModeController/Na__LayoutEditor__ModeController__.js'
};
const OLD_FILES = { facade : 'Na__LayoutEditor__SheetModel__.js', sheets : 'Na__LayoutEditor__SheetModel__Sheets__.js', history : 'Na__LayoutEditor__History__.js', loader : 'Na__LayoutEditor__Loader__.js' };


// =============================================================================
// THE CHILD: one case, one variant, one module graph
// =============================================================================
async function RunChild() {
    const VARIANT = ARGS.variant;
    const overrides = {};
    const old = (key) => { overrides[P[key]] = join(ARGS.old, OLD_FILES[key]); };
    if (VARIANT === 'old') [ 'facade', 'sheets', 'history', 'loader' ].forEach(old);
    if (VARIANT === 'mixed') old('loader');
    if (VARIANT === 'tv' || VARIANT === 'tvblock') overrides[P.sheets] = ARGS.tvsheets;
    for (const file of Object.values(overrides)) if (!existsSync(file)) { console.error('override missing: ' + file); process.exit(2); }

    // THE WORLD the stand-ins answer from
    const EVENTS = [];
    const W = globalThis.W121 = {
        project     : { projectCode : '3047', clientDrawingName : 'Mr J. Doous', siteAddress : '1 Example Lane, Hamford' },
        active      : { PresentationMode__SavedCameraScenes__Scenes : [] },
        digest      : 'sha1:0001',
        localResult : 'ok',
        r2          : [],
        local       : [],
        toasts      : [],
        errors      : [],
        warns       : [],
        mark(label) { EVENTS.push({ type : 'mark', label }); }
    };
    if (VARIANT === 'newblock' || VARIANT === 'tvblock') {
        W.project.LayoutEditor__DrawingRegister = { DrawingRegister__Numbering : {
            DrawingRegister__Numbering__Prefix : 'D', DrawingRegister__Numbering__Start : 1, DrawingRegister__Numbering__Digits : 2, DrawingRegister__Numbering__Overrides : {} } };
    }

    const STUBS = {
        [SRC + '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js'] : [
            'const W = globalThis.W121;',
            'function Na__CfApi__IsConfigured() { return true; }',
            'async function Na__CfApi__MergeAndSaveKeys(keys, options) { W.r2.push({ keys : JSON.parse(JSON.stringify(keys)), options : options || null }); return { ok : true }; }',
            'function Na__CfApi__GetLoadedProjectData() { return W.project; }',
            'function Na__CfApi__SetLoadedProjectData(data) { W.project = data; }',
            'export { Na__CfApi__IsConfigured, Na__CfApi__MergeAndSaveKeys, Na__CfApi__GetLoadedProjectData, Na__CfApi__SetLoadedProjectData };'
        ].join('\n'),
        [SRC + '03__AppUtils/Na__AppUtils__LocalProjectMirror__.js'] : [
            'const W = globalThis.W121;',
            'async function Na__LocalMirror__DrawingsFingerprint() { return { ok : true, drawings : { digest : W.digest, savedIso : null } }; }',
            'async function Na__LocalMirror__MergeKeys(keys) {',
            '    W.local.push(JSON.parse(JSON.stringify(keys)));',
            '    if (W.localResult === "skipped") return { ok : false, skipped : true };',
            '    if (W.localResult === "failed")  return { ok : false, error : "the disk is full" };',
            '    return { ok : true, drawings : { digest : W.digest } };',
            '}',
            'export { Na__LocalMirror__DrawingsFingerprint, Na__LocalMirror__MergeKeys };'
        ].join('\n'),
        [SRC + '03__AppUtils/Na__AppUtils__ProjectLoader.js'] : [
            'function Na__AppUtils__GetProjectCodeFromUrl() { return "2026/3047__Doous"; }',
            'function Na__AppUtils__IsRunningOnLocalhost() { return true; }',
            'async function Na__AppUtils__InitMasterIndex() { return null; }',
            'function Na__AppUtils__GetYearFromUrl() { return "2026"; }',
            'function Na__AppUtils__GetProjectFolderFromUrl() { return "3047__Doous"; }',
            'export { Na__AppUtils__GetProjectCodeFromUrl, Na__AppUtils__IsRunningOnLocalhost, Na__AppUtils__InitMasterIndex, Na__AppUtils__GetYearFromUrl, Na__AppUtils__GetProjectFolderFromUrl };'
        ].join('\n'),
        [SRC + '21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js'] : [
            'function Na__PresentationMode__ProjectJson__GetActiveConfig() { return globalThis.W121.active; }',
            'export { Na__PresentationMode__ProjectJson__GetActiveConfig };'
        ].join('\n'),
        [LE + '50__Feature__Specification/Na__LayoutEditor__SpecData__Document__.js'] : [
            'function Na__LeSpec__IsDirty() { return false; }',
            'export { Na__LeSpec__IsDirty };'
        ].join('\n'),
        [LE + '40__Ui__Panels/Na__LayoutEditor__PanelHost__.js'] : [
            'function Na__LePanels__OnControl() {} function Na__LePanels__Row() { return null; }',
            'function Na__LePanels__Input() { return null; } function Na__LePanels__Select() { return null; }',
            'function Na__LePanels__GetContext() { return { showToast : (m) => globalThis.W121.toasts.push([ m, false ]) }; }',
            'export { Na__LePanels__OnControl, Na__LePanels__Row, Na__LePanels__Input, Na__LePanels__Select, Na__LePanels__GetContext };'
        ].join('\n'),
        [SRC + '26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js'] : [
            'function Na__ModelToggle__GetCategoryKeys() { return []; }',
            'export { Na__ModelToggle__GetCategoryKeys };'
        ].join('\n'),
        [SRC + '42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js'] : [
            'function Na__FpData__GetPlanById() { return null; }',
            'export { Na__FpData__GetPlanById };'
        ].join('\n'),
        [SRC + '45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js'] : [
            'function Na__ElevData__GetElevationById() { return null; }',
            'export { Na__ElevData__GetElevationById };'
        ].join('\n'),
        [SRC + '03__AppUtils/Na__AppUtils__DevGate__.js'] : [
            'function Na__DevGate__IsAuthoringEnabled() { return true; }',
            'export { Na__DevGate__IsAuthoringEnabled };'
        ].join('\n'),
        [LE + '01__Core__Loader/Na__LayoutEditor__LoadingScreen__.js'] : [
            'function Na__LeLoadScreen__Show() {} function Na__LeLoadScreen__SetStatus() {} function Na__LeLoadScreen__Hide() {}',
            'function Na__LeLoadScreen__ShowError() {} function Na__LeLoadScreen__IsShown() { return false; }',
            'export { Na__LeLoadScreen__Show, Na__LeLoadScreen__SetStatus, Na__LeLoadScreen__Hide, Na__LeLoadScreen__ShowError, Na__LeLoadScreen__IsShown };'
        ].join('\n'),
        [LE + '05__Core__ModeController/Na__LayoutEditor__TabStrip__.js'] : [
            'function Na__LeTabs__Initialize() { return true; }',
            'export { Na__LeTabs__Initialize };'
        ].join('\n'),
        [LE + '50__Feature__Specification/Na__LayoutEditor__SpecData__.js'] : [
            "const Na__LeSpec__CHANGED_EVENT = 'na-layouteditor-spec-changed';",
            'function Na__LeSpec__IsDirty() { return false; }',
            'export { Na__LeSpec__CHANGED_EVENT, Na__LeSpec__IsDirty };'
        ].join('\n'),
        [LE + '20__System__Viewports/Na__LayoutEditor__Viewport3d__.js'] : [
            'function Na__LeVp3d__RestampForScene() { return 0; }',
            'export { Na__LeVp3d__RestampForScene };'
        ].join('\n'),
        [LE + '60__Feature__PdfExport/Na__LayoutEditor__PdfExporter__.js'] : [
            'function Na__LePdf__Export() { return null; }',
            'export { Na__LePdf__Export };'
        ].join('\n'),
        // THE MODE CONTROLLER'S START-UP PASS, in the real one's shape: the model, History and AutoSave in one
        // synchronous .then after the config is in, then a .catch the loader awaits.
        [P.mode] : [
            "import { Na__LeCfg__Ready, Na__LeCfg__IsEnabled } from '../03__Core__Config/Na__LayoutEditor__ConfigState__.js';",
            "import { Na__LeModel__Initialize, Na__LeModel__CHANGED_EVENT } from '../07__Core__SheetData/Na__LayoutEditor__SheetModel__.js';",
            "import { Na__LeHist__Initialize } from '../07__Core__SheetData/Na__LayoutEditor__History__.js';",
            "import { Na__LeAuto__Initialize } from '../07__Core__SheetData/Na__LayoutEditor__AutoSave__.js';",
            'const W = globalThis.W121;',
            "const Na__LeMode__CHANGED_EVENT = 'na-layouteditor-mode-changed';",
            "const Na__LeMode__VIEW_SHEET = 'sheet', Na__LeMode__VIEW_SPEC = 'spec', Na__LeMode__VIEW_REGISTER = 'register', Na__LeMode__VIEW_STATEMENT = 'statement';",
            'let Na__LeMode__ReadyOnce = null, Na__LeMode__Active = false;',
            'function Na__LeMode__Initialize(context) {',
            '    if (!context) return Promise.resolve(false);',
            '    Na__LeMode__ReadyOnce = Promise.all([ Na__LeCfg__Ready() ]).then(() => {',
            '        if (!Na__LeCfg__IsEnabled()) return false;',
            "        W.mark('pass-start');",
            '        Na__LeModel__Initialize();',
            '        Na__LeHist__Initialize();',
            '        Na__LeAuto__Initialize({ showToast : context.showToast || null, editable : true });',
            '        window.addEventListener(Na__LeModel__CHANGED_EVENT, () => {});',
            "        W.mark('pass-end');",
            '        return true;',
            "    }).catch((error) => { console.error('stand-in mode controller failed', error); return false; });",
            "    Na__LeMode__ReadyOnce.then(() => W.mark('mode-ready'));                 // <-- Registered before the loader's await: marks the moment the loader carries on",
            '    return Na__LeMode__ReadyOnce;',
            '}',
            'function Na__LeMode__Ready() { return Na__LeMode__ReadyOnce || Promise.resolve(false); }',
            'function Na__LeMode__IsAvailable() { return true; }',
            'function Na__LeMode__IsEditable() { return true; }',
            'function Na__LeMode__IsActive() { return Na__LeMode__Active; }',
            'function Na__LeMode__GetView() { return Na__LeMode__VIEW_SHEET; }',
            'function Na__LeMode__Enter() { Na__LeMode__Active = true; return true; }',
            'function Na__LeMode__Leave() { const was = Na__LeMode__Active; Na__LeMode__Active = false; return was; }',
            'function Na__LeMode__OpenSpecification() { return true; }',
            'function Na__LeMode__SetLayoutMode(on) { return on === true; }',
            'export { Na__LeMode__CHANGED_EVENT, Na__LeMode__VIEW_SHEET, Na__LeMode__VIEW_SPEC, Na__LeMode__VIEW_REGISTER, Na__LeMode__VIEW_STATEMENT,',
            '         Na__LeMode__Initialize, Na__LeMode__Ready, Na__LeMode__IsAvailable, Na__LeMode__IsEditable, Na__LeMode__IsActive, Na__LeMode__GetView,',
            '         Na__LeMode__Enter, Na__LeMode__Leave, Na__LeMode__OpenSpecification, Na__LeMode__SetLayoutMode };'
        ].join('\n')
    };

    const SCRATCH = mkdtempSync(join(tmpdir(), 'w1-21-harness-'));
    const HOOKS = [
        "import { readFileSync } from 'node:fs';",
        'let S = null;',
        'export async function initialize(data) { S = data; }',
        'export async function resolve(specifier, context, nextResolve) {',
        "    const parent = (context.parentURL || '').split('?')[0];",
        '    if (specifier.startsWith(S.base)) return { url : specifier, shortCircuit : true };',
        "    if (parent.startsWith(S.base) && (specifier.startsWith('./') || specifier.startsWith('../'))) return { url : new URL(specifier, parent).href, shortCircuit : true };",
        '    return nextResolve(specifier, context);',
        '}',
        'export async function load(url, context, nextLoad) {',
        '    if (!url.startsWith(S.base)) return nextLoad(url, context);',
        "    const path = url.slice(S.base.length).split('?')[0];",
        "    if (Object.prototype.hasOwnProperty.call(S.stubs, path)) return { format : 'module', source : S.stubs[path], shortCircuit : true };",
        "    const file = S.overrides[path] || (S.root + path.split('/').join(S.sep));",
        "    return { format : 'module', source : readFileSync(file, 'utf8'), shortCircuit : true };",
        '}'
    ].join('\n');
    writeFileSync(join(SCRATCH, 'hooks.mjs'), HOOKS);
    register(pathToFileURL(join(SCRATCH, 'hooks.mjs')).href, { parentURL : import.meta.url,
        data : { base : BASE, root : resolve(ARGS.root) + sep, sep, stubs : STUBS, overrides } });

    // A BROWSER JUST BIG ENOUGH: a real EventTarget for a window, every dispatch kept in order
    const win = new EventTarget();
    const dispatch = EventTarget.prototype.dispatchEvent;
    win.dispatchEvent = function (event) {
        const d = event.detail || {};
        EVENTS.push({ type : event.type, reason : d.reason, sheetId : d.sheetId, restore : d.restore || null, undoDepth : d.undoDepth });
        return dispatch.call(win, event);
    };
    const store = new Map();
    win.localStorage = { getItem : (k) => (store.has(k) ? store.get(k) : null), setItem : (k, v) => { store.set(k, String(v)); }, removeItem : (k) => { store.delete(k); } };
    win.setTimeout = setTimeout; win.clearTimeout = clearTimeout;
    win.location = { search : '?project=2026/3047__Doous', hostname : 'localhost', href : 'http://localhost:8000/ValeVision3D/index.html?project=2026/3047__Doous', reload() {} };
    globalThis.window = win;
    const element = (tag) => {
        const el = new EventTarget();
        el.tagName = String(tag).toUpperCase(); el.attributes = {}; el.style = {}; el.children = [];
        el.setAttribute = (k, v) => { el.attributes[k] = String(v); };
        el.getAttribute = (k) => (k in el.attributes ? el.attributes[k] : null);
        el.appendChild = (child) => { el.children.push(child); if (child.tagName === 'LINK') setTimeout(() => child.dispatchEvent(new Event('load')), 0); return child; };
        el.classList = { toggle() {}, add() {}, remove() {}, contains() { return false; } };
        return el;
    };
    const head = element('head'), body = element('body');
    globalThis.document = Object.assign(new EventTarget(), {
        head, body, visibilityState : 'visible',
        createElement : element,
        getElementById : () => null,
        querySelector : (selector) => {
            const m = selector.match(/^link\[data-na-le-stylesheet="(.*)"\]$/);
            return m ? (head.children.find((c) => c.getAttribute('data-na-le-stylesheet') === m[1]) || null) : null;
        }
    });
    globalThis.fetch = async (input) => {
        const url = String(input && input.href ? input.href : input);
        if (!url.startsWith(BASE)) return { ok : false, status : 404, json : async () => null, text : async () => '' };
        const file = join(resolve(ARGS.root), ...url.slice(BASE.length).split('?')[0].split('/'));
        if (!existsSync(file)) return { ok : false, status : 404, json : async () => null, text : async () => '' };
        const text = readFileSync(file, 'utf8');
        return { ok : true, status : 200, json : async () => JSON.parse(text), text : async () => text };
    };
    console.error = (...a) => { W.errors.push(a.map((x) => (x && x.stack) ? x.stack.split('\n')[0] : String(x)).join(' ')); };
    console.warn  = (...a) => { W.warns.push(a.map(String).join(' ')); };
    const log = console.log.bind(console);
    console.log = () => {};

    // HELPERS
    const tick  = () => new Promise((r) => setTimeout(r, 0));
    const ticks = async (n) => { for (let i = 0; i < n; i++) await tick(); };
    const wait  = (ms) => new Promise((r) => setTimeout(r, ms));
    const clone = (v) => JSON.parse(JSON.stringify(v));
    const mark  = (label) => W.mark(label);
    const at    = (label) => EVENTS.findIndex((e) => e.type === 'mark' && e.label === label);
    const model = (from, to) => EVENTS.slice(from || 0, to === undefined ? EVENTS.length : to).filter((e) => e.type === 'na-layouteditor-sheets-changed');
    const lastDepth = (sheetId) => {
        for (let i = EVENTS.length - 1; i >= 0; i--) {
            const e = EVENTS[i];
            if (e.type === 'na-layouteditor-history-changed' && e.sheetId === sheetId) return e.undoDepth;
        }
        return 0;
    };
    const imp = (rel) => import(BASE + rel);

    const BLOCK = {
        LayoutEditor__DrawingsData__Version : 1,
        LayoutEditor__DrawingsData__LayoutModeEnabled : true,
        LayoutEditor__DrawingsData__FloorPlans : [],
        LayoutEditor__DrawingsData__Elevations : [],
        LayoutEditor__DrawingsData__Sheets : [
            { Sheet__Id : 'Sheet_001', Sheet__Name : 'Plans',      Sheet__Order : 1, Sheet__PaperSize : 'A3', Sheet__Fields : {} },
            { Sheet__Id : 'Sheet_002', Sheet__Name : 'Elevations', Sheet__Order : 2, Sheet__PaperSize : 'A3', Sheet__Fields : { Sheet__Fields__DrawingNumber : 'A-101' } },
            { Sheet__Id : 'Sheet_003', Sheet__Name : 'Sections',   Sheet__Order : 5, Sheet__PaperSize : 'A3', Sheet__Fields : { Sheet__Fields__DrawingNumber : '' } },
            { Sheet__Id : 'Sheet_004', Sheet__Name : 'Details',    Sheet__PaperSize : 'A3' }
        ]
    };
    // A PACK WHOSE COMMON FIELDS ARE ALREADY SET: the seed then writes nothing, so a dirty flag can only come
    // from the draft restore (the cases that judge the restore use it)
    const BLOCK_SEEDED = Object.assign(JSON.parse(JSON.stringify(BLOCK)), {
        LayoutEditor__DrawingsData__CommonClient : 'Mr J. Doous', LayoutEditor__DrawingsData__CommonSiteAddress : '1 Example Lane, Hamford' });
    const CONTEXT = { renderer : {}, scene : {}, camera : {}, controls : {}, pipelineRef : {}, modelRoot : {},
                      appConfig : { LayoutEditor__Config : { LayoutEditor__Config__ReadOnlyOnWeb : true } },
                      showToast : (message, isError) => W.toasts.push([ message, isError === true ]) };

    // THE PAGE START: the drawings data listens, the loading sequence hands the block over (no editor yet)
    const DD = await imp(P.drawData);
    DD.Na__DrawView__ProjectData__Initialize();
    const pageLoad = (block) => window.dispatchEvent(new CustomEvent(DD.Na__DrawData__LOADED_EVENT, { detail : { block : clone(block || BLOCK), projectCode : '2026/3047__Doous', sceneConfig : W.active } }));

    // THE EDITOR OPENED THROUGH THE REAL LOADER (its Run: import, stylesheets, the mode controller, CheckNames)
    async function openThroughLoader() {
        const L = await imp(P.loader);
        L.Na__LeLoad__Initialize(CONTEXT);
        await ticks(2);
        mark('loader-require');
        const editor = await L.Na__LeLoad__Require({ quiet : true });
        mark('loader-done');
        await ticks(6);
        return { L, editor };
    }
    // THE EDITOR OPENED DIRECTLY (the same pass, no loader)
    async function openDirect() {
        const MC = await imp(P.mode);
        mark('loader-require');
        await MC.Na__LeMode__Initialize(CONTEXT);
        mark('loader-done');
        await ticks(6);
    }
    const draftKey = 'Na__LayoutEditor__Draft__2026/3047__Doous';
    const closeGuard = () => { const ev = new Event('beforeunload', { cancelable : true }); window.dispatchEvent(ev); return ev.defaultPrevented; };

    const CASES = {

        // ---------------------------------------------------------------------
        // FIRST OPEN through the loader, then a second drawings load
        // ---------------------------------------------------------------------
        async firstopen() {
            pageLoad();
            await ticks(4);
            const preLoader = await imp(P.loader);
            preLoader.Na__LeLoad__Initialize(CONTEXT);
            const pre = preLoader.Na__LeLoad__GetSheets().map((s) => ({ id : s.Sheet__Id, number : preLoader.Na__LeLoad__GetDrawingNumber(s), code : preLoader.Na__LeLoad__GetShortCode(s), tab : preLoader.Na__LeLoad__GetTabLabel(s) }));
            const errorsBefore = W.errors.length;
            const { L } = await openThroughLoader();
            await wait(30);
            const seededFields = model(at('loader-require')).filter((e) => e.reason === 'fields').length;   // <-- Read now: the second load below seeds again
            const seededCommon = DD.Na__DrawData__GetCommonFields();
            const M = await imp(P.facade);
            const H = await imp(P.history);
            const startAt = at('loader-require'), passEnd = at('pass-end'), readyAt = at('mode-ready');
            const loads = EVENTS.map((e, i) => ({ e, i })).filter((x) => x.i > startAt && x.e.type === 'na-layouteditor-sheets-changed' && x.e.reason === 'loaded');
            const histHeard = EVENTS.slice(startAt).some((e) => e.type === 'na-layouteditor-history-changed' && e.sheetId === null);
            const post = L.Na__LeLoad__GetSheets().map((s) => ({ id : s.Sheet__Id, number : L.Na__LeLoad__GetDrawingNumber(s), code : L.Na__LeLoad__GetShortCode(s), tab : L.Na__LeLoad__GetTabLabel(s) }));
            const byModel = M.Na__LeModel__GetSheets().map((s) => ({ id : s.Sheet__Id,
                number : typeof M.Na__LeModel__GetDrawingNumber === 'function' ? M.Na__LeModel__GetDrawingNumber(s) : null,
                code : M.Na__LeModel__GetShortCode(s), tab : M.Na__LeModel__GetTabLabel(s) }));
            // THE BASELINE: open a sheet, edit a field, undo it
            M.Na__LeModel__SetActiveSheetId('Sheet_001');
            const sheet = M.Na__LeModel__GetActiveSheet();
            const titleBefore = JSON.stringify((sheet.Sheet__Fields || {}).Sheet__Fields__Title === undefined ? null : sheet.Sheet__Fields.Sheet__Fields__Title);
            M.Na__LeModel__SetField(sheet, 'Title', 'Ground Floor Plan');
            const canUndo = H.Na__LeHist__CanUndo();
            H.Na__LeHist__Undo();
            const titleAfter = JSON.stringify((M.Na__LeModel__GetActiveSheet().Sheet__Fields || {}).Sheet__Fields__Title === undefined ? null : M.Na__LeModel__GetActiveSheet().Sheet__Fields.Sheet__Fields__Title);
            // A SECOND DRAWINGS LOAD in the same page
            const before2 = EVENTS.length;
            pageLoad();
            await ticks(8);
            const heard2 = model(before2).filter((e) => e.reason === 'loaded').length;
            return {
                loadsDuringOpen : loads.length,
                loadsBeforeModeReady : loads.filter((x) => x.i < readyAt).length,
                firstLoadAfterPass : loads.length ? loads[0].i > passEnd : null,
                historyHeardLoad : histHeard,
                fieldsAnnounced : seededFields,
                common : seededCommon,
                checkNamesErrors : W.errors.slice(errorsBefore).filter((t) => /Layout Editor loader/.test(t)),
                errors : W.errors.slice(errorsBefore),
                baseline : { canUndo, restored : titleBefore === titleAfter, titleBefore, titleAfter },
                secondLoadHeard : heard2,
                labels : { pre, post, model : byModel }
            };
        },

        // ---------------------------------------------------------------------
        // A DRAFT waiting at the first open (the late start must keep it dirty)
        // ---------------------------------------------------------------------
        async draftfirst() {
            pageLoad(BLOCK_SEEDED);
            await ticks(4);
            const draft = clone(BLOCK.LayoutEditor__DrawingsData__Sheets);
            draft[0].Sheet__Name = 'Plans (unsaved draft)';
            window.localStorage.setItem(draftKey, JSON.stringify({ savedAt : Date.now(), sheets : draft }));
            await openThroughLoader();
            await wait(30);
            const M = await imp(P.facade);
            return { dirty : M.Na__LeModel__IsDirty(), closeGuard : closeGuard(), restoredName : M.Na__LeModel__GetSheetById('Sheet_001').Sheet__Name,
                     loads : model(at('loader-require')).filter((e) => e.reason === 'loaded').length, toasts : W.toasts.map((t) => t[0]) };
        },

        // ---------------------------------------------------------------------
        // A DRAFT put back by a SECOND drawings load (the double hearing cleared the dirty flag)
        // ---------------------------------------------------------------------
        async draftsecond() {
            pageLoad(BLOCK_SEEDED);
            await ticks(4);
            await openThroughLoader();
            await wait(30);
            const M = await imp(P.facade);
            const draft = clone(M.Na__LeModel__GetSheets());                      // <-- As AutoSave writes a draft: the normalised sheets
            draft.find((s) => s.Sheet__Id === 'Sheet_001').Sheet__Name = 'Plans (unsaved draft)';
            window.localStorage.setItem(draftKey, JSON.stringify({ savedAt : Date.now(), sheets : draft }));
            const before = EVENTS.length;
            pageLoad(BLOCK_SEEDED);
            await ticks(8);
            await wait(30);
            return { dirty : M.Na__LeModel__IsDirty(), closeGuard : closeGuard(), restoredName : M.Na__LeModel__GetSheetById('Sheet_001').Sheet__Name,
                     loads : model(before).filter((e) => e.reason === 'loaded').length };
        },

        // ---------------------------------------------------------------------
        // GetSheets between announcements (the normaliser replaces Sheet__Groups on every pass)
        // ---------------------------------------------------------------------
        async normalise() {
            pageLoad(); await ticks(4); await openDirect();
            const M = await imp(P.facade);
            M.Na__LeModel__SetActiveSheetId('Sheet_001');
            const s = M.Na__LeModel__GetActiveSheet();
            const g0 = s.Sheet__Groups;
            M.Na__LeModel__GetSheets(); M.Na__LeModel__GetSheets(); M.Na__LeModel__GetSheetById('Sheet_002');
            for (let i = 0; i < 8; i++) M.Na__LeModel__GetActiveSheet();
            const quiet = (s.Sheet__Groups === g0);
            M.Na__LeModel__SetField(s, 'Title', 'X');
            M.Na__LeModel__GetSheets();
            const fresh = (s.Sheet__Groups !== g0);
            return { untouchedBetweenAnnouncements : quiet, renormalisedAfterAnnouncement : fresh };
        },

        // ---------------------------------------------------------------------
        // RenumberSheets: create, duplicate, delete and reorder
        // ---------------------------------------------------------------------
        async renumber() {
            pageLoad(); await ticks(4); await openDirect();
            const M = await imp(P.facade);
            const snap = () => M.Na__LeModel__GetSheets().map((s) => ({ id : s.Sheet__Id, order : s.Sheet__Order,
                stored : (s.Sheet__Fields && 'Sheet__Fields__DrawingNumber' in s.Sheet__Fields) ? s.Sheet__Fields.Sheet__Fields__DrawingNumber : '<none>',
                tab : M.Na__LeModel__GetTabLabel(s) }));
            const full = () => clone(M.Na__LeModel__GetSheets());
            const steps = [];
            steps.push({ op : 'load', sheets : snap(), json : full() });
            M.Na__LeModel__ReorderSheet('Sheet_003', 0);           steps.push({ op : 'reorder Sheet_003 to the front', sheets : snap(), json : full() });
            M.Na__LeModel__DeleteSheet('Sheet_001');               steps.push({ op : 'delete Sheet_001', sheets : snap(), json : full() });
            M.Na__LeModel__CreateSheet({ name : 'Site Sections' }); steps.push({ op : 'create', sheets : snap(), json : full() });
            M.Na__LeModel__DuplicateSheet('Sheet_002');            steps.push({ op : 'duplicate Sheet_002', sheets : snap(), json : full() });
            return { steps, errors : W.errors };
        },

        // ---------------------------------------------------------------------
        // THE NOTES MARGIN: records, patch keys, region functions, silence, undo
        // ---------------------------------------------------------------------
        async margin() {
            const out = { local : {}, oldKeys : {}, ops : [], silent : null, twoStep : null, errors : [] };
            pageLoad(); await ticks(4); await openDirect();
            const M = await imp(P.facade);
            const H = await imp(P.history);
            // EVERY EXISTING LOCAL MARGIN RECORD, normalised by the model
            for (const dir of readdirSync(ARGS.wcp)) {
                const file = join(ARGS.wcp, dir, 'project.json');
                if (!existsSync(file)) continue;
                const project = JSON.parse(readFileSync(file, 'utf8'));
                const block = project.LayoutEditor__DrawingsData;
                if (!block || !Array.isArray(block.LayoutEditor__DrawingsData__Sheets) || !block.LayoutEditor__DrawingsData__Sheets.length) continue;
                pageLoad(block); await ticks(6);
                M.Na__LeModel__GetSheets().forEach((s) => { out.local[dir + '/' + s.Sheet__Id] = s.Sheet__MarginNotes === undefined ? '<none>' : clone(s.Sheet__MarginNotes); });
                // THE KEYS THIS APP ALREADY HAD, applied to every sheet, record by record
                M.Na__LeModel__GetSheets().forEach((s) => {
                    const seq = [];
                    [ { enabled : true }, { widthMm : 85 }, { heading : 'Notes' }, { heading : '' }, { textSizeMm : 2.5 }, { includeGeneral : false }, { groupHeadings : true }, { enabled : false } ].forEach((patch) => {
                        M.Na__LeModel__UpdateMarginNotes(s, patch);
                        seq.push(clone(s.Sheet__MarginNotes));
                    });
                    out.oldKeys[dir + '/' + s.Sheet__Id] = seq;
                });
            }
            // BACK TO THE FIXTURE, a sheet opened afresh (its History baseline taken on 'active')
            pageLoad(); await ticks(6);
            M.Na__LeModel__SetActiveSheetId(null);
            M.Na__LeModel__SetActiveSheetId('Sheet_001');
            const sheet = () => M.Na__LeModel__GetActiveSheet();
            const notes = () => JSON.stringify(sheet().Sheet__MarginNotes === undefined ? null : sheet().Sheet__MarginNotes);
            const OPS = [
                [ 'enabled',          () => M.Na__LeModel__UpdateMarginNotes(sheet(), { enabled : true }) ],
                [ 'widthMm',          () => M.Na__LeModel__UpdateMarginNotes(sheet(), { widthMm : 88 }) ],
                [ 'heading',          () => M.Na__LeModel__UpdateMarginNotes(sheet(), { heading : 'Specification Notes' }) ],
                [ 'textSizeMm',       () => M.Na__LeModel__UpdateMarginNotes(sheet(), { textSizeMm : 2.6 }) ],   // <-- Not 2.2: the normaliser reads 2.2 mm as the old default and puts the configured size back
                [ 'includeGeneral',   () => M.Na__LeModel__UpdateMarginNotes(sheet(), { includeGeneral : false }) ],
                [ 'groupHeadings',    () => M.Na__LeModel__UpdateMarginNotes(sheet(), { groupHeadings : true }) ],
                [ 'regionsOn',        () => M.Na__LeModel__UpdateMarginNotes(sheet(), { regionsOn : true }) ],
                [ 'leaderlessOn',     () => M.Na__LeModel__UpdateMarginNotes(sheet(), { leaderlessOn : true }) ],
                [ 'leaderlessGroup',  () => M.Na__LeModel__UpdateMarginNotes(sheet(), { leaderlessGroup : { id : 'SpecGroup_002', on : true } }) ],
                [ 'leaderlessGroup 2',() => M.Na__LeModel__UpdateMarginNotes(sheet(), { leaderlessGroup : { id : 'SpecGroup_003', on : true } }) ],
                [ 'leaderlessMove',   () => M.Na__LeModel__UpdateMarginNotes(sheet(), { leaderlessMove : { id : 'SpecGroup_003', index : 0 } }) ],
                [ 'AddNoteRegion',    () => M.Na__LeModel__AddNoteRegion(sheet(), { X : 20, Y : 20, WidthMm : 80, HeightMm : 60 }) ],
                [ 'UpdateNoteRegion', () => M.Na__LeModel__UpdateNoteRegion(sheet(), 'Region_001', { title : 'Structure' }) ],
                [ 'UpdateNoteRegion group', () => M.Na__LeModel__UpdateNoteRegion(sheet(), 'Region_001', { group : { id : 'SpecGroup_002', on : true } }) ],
                [ 'DeleteNoteRegion', () => M.Na__LeModel__DeleteNoteRegion(sheet(), 'Region_001') ]
            ];
            for (const [ name, run ] of OPS) {
                const before = notes(), depth0 = lastDepth('Sheet_001'), e0 = EVENTS.length;
                let supported = true;
                try { run(); } catch (error) { supported = false; }
                const after = notes();
                const margins = model(e0).filter((e) => e.reason === 'margin').length;
                const others  = model(e0).filter((e) => e.reason !== 'margin').map((e) => e.reason);
                const depth1 = lastDepth('Sheet_001');
                let undone = null, redone = null;
                if (supported && depth1 === depth0 + 1) {
                    H.Na__LeHist__Undo(); undone = notes();
                    H.Na__LeHist__Redo(); redone = notes();
                }
                out.ops.push({ name, supported, changed : before !== after, margins, others, depthDelta : depth1 - depth0,
                               undoRestored : undone === null ? null : undone === before, redoReapplied : redone === null ? null : redone === after });
            }
            // SILENT region and margin updates
            try {
                M.Na__LeModel__AddNoteRegion(sheet(), { X : 30, Y : 30, WidthMm : 70, HeightMm : 50 });
                const e0 = EVENTS.length;
                const regionId = sheet().Sheet__MarginNotes.Regions[sheet().Sheet__MarginNotes.Regions.length - 1].Region__Id;
                M.Na__LeModel__UpdateNoteRegion(sheet(), regionId, { frameMm : { X : 31 } }, true);
                M.Na__LeModel__UpdateMarginNotes(sheet(), { widthMm : 91 }, true);
                out.silent = { events : model(e0).length, dirty : M.Na__LeModel__IsDirty(), moved : sheet().Sheet__MarginNotes.Regions.slice(-1)[0].Region__FrameMm.X, width : sheet().Sheet__MarginNotes.WidthMm };
            } catch (error) { out.silent = { unsupported : String(error && error.message) }; }
            // TWO STEPS: a margin change, then a text edit - two undo steps
            pageLoad(); await ticks(6);
            M.Na__LeModel__SetActiveSheetId(null);
            M.Na__LeModel__SetActiveSheetId('Sheet_001');
            M.Na__LeModel__UpdateMarginNotes(sheet(), { enabled : true, widthMm : 70 });
            const textSheet = sheet();
            M.Na__LeModel__CreateAnnotation(textSheet, 40, 40, { text : 'Ground floor' });
            const state = () => ({ width : sheet().Sheet__MarginNotes ? sheet().Sheet__MarginNotes.WidthMm : null, texts : (sheet().Sheet__Annotations || []).length });
            const s0 = state();
            H.Na__LeHist__Undo(); const s1 = state();
            H.Na__LeHist__Undo(); const s2 = state();
            out.twoStep = { start : s0, afterFirstUndo : s1, afterSecondUndo : s2 };
            out.errors = W.errors;
            return out;
        },

        // ---------------------------------------------------------------------
        // UNDOING A VECTOR DELETE WRITES NOTHING TO R2 (and a structural undo does)
        // ---------------------------------------------------------------------
        async undowrite() {
            pageLoad(); await ticks(4); await openDirect();
            const M = await imp(P.facade);
            const H = await imp(P.history);
            M.Na__LeModel__SetActiveSheetId('Sheet_001');
            const sheet = () => M.Na__LeModel__GetActiveSheet();
            const counts = {};
            const shape = M.Na__LeModel__CreateShape(sheet(), [ [ 10, 10 ], [ 60, 10 ], [ 60, 40 ] ], { closed : true });
            await wait(2200); counts.afterCreate = W.r2.length;
            M.Na__LeModel__DeleteShape(sheet(), shape.Shape__Id);
            await wait(2200); counts.afterDelete = W.r2.length;
            H.Na__LeHist__Undo();
            await wait(2200); counts.afterUndoOfDelete = W.r2.length;
            counts.shapeBack = (sheet().Sheet__Shapes || []).some((s) => s.Shape__Id === shape.Shape__Id);
            M.Na__LeModel__UpdateSheet(sheet(), { name : 'Plans Renamed' });
            await wait(2200); counts.afterRename = W.r2.length;
            H.Na__LeHist__Undo();
            await wait(2200); counts.afterUndoOfRename = W.r2.length;
            counts.restore = EVENTS.filter((e) => e.type === 'na-layouteditor-sheets-changed' && e.restore).map((e) => e.restore.stepReason);
            return counts;
        },

        // ---------------------------------------------------------------------
        // SAVE SHEETS says where the sheets went
        // ---------------------------------------------------------------------
        async save() {
            pageLoad(); await ticks(4); await openDirect();
            const M = await imp(P.facade);
            const out = {};
            for (const result of [ 'ok', 'skipped', 'failed' ]) {
                W.localResult = result;
                const toasts = [];
                const saved = await M.Na__LeModel__Save((message, isError) => toasts.push([ message, isError === true ]));
                out[result] = { saved, toasts, dirty : M.Na__LeModel__IsDirty() };
            }
            out.r2 = W.r2.length;
            return out;
        },

        // ---------------------------------------------------------------------
        // A FLOOR AREA CHANGE IS A STEP; THE REGISTER'S REWRITE OF KEPT STEPS
        // ---------------------------------------------------------------------
        async areas() {
            pageLoad(); await ticks(4); await openDirect();
            const M = await imp(P.facade);
            const H = await imp(P.history);
            M.Na__LeModel__SetActiveSheetId('Sheet_001');
            const sheet = () => M.Na__LeModel__GetActiveSheet();
            const out = {};
            if (typeof M.Na__LeModel__AddAreaGroup === 'function') {
                const d0 = lastDepth('Sheet_001'), e0 = EVENTS.length;
                M.Na__LeModel__AddAreaGroup(sheet(), 'Ground Floor');
                out.areas = { events : model(e0).filter((e) => e.reason === 'areas').length, depthDelta : lastDepth('Sheet_001') - d0, groups : clone(sheet().Sheet__AreaGroups || []) };
                H.Na__LeHist__Undo();
                out.areas.afterUndo = clone(sheet().Sheet__AreaGroups || []);
            } else {
                out.areas = { unsupported : true };
            }
            // REGISTER-UPDATED: a typed number, then the register writes another and says so; undo keeps the register's
            M.Na__LeModel__SetField(sheet(), 'DrawingNumber', 'D05');
            sheet().Sheet__Fields.Sheet__Fields__DrawingNumber = 'D09';            // <-- what a register transaction writes
            if (typeof M.Na__LeModel__NotifyRegister === 'function') M.Na__LeModel__NotifyRegister();
            else window.dispatchEvent(new CustomEvent('na-layouteditor-sheets-changed', { detail : { reason : 'register-updated', sheetId : 'Sheet_001', itemId : null } }));
            H.Na__LeHist__Undo();
            out.register = { afterUndo : (sheet().Sheet__Fields || {}).Sheet__Fields__DrawingNumber === undefined ? '<none>' : sheet().Sheet__Fields.Sheet__Fields__DrawingNumber };
            out.errors = W.errors;
            return out;
        }
    };

    if (!CASES[ARGS.case]) { log('RESULT ' + JSON.stringify({ error : 'no case ' + ARGS.case })); process.exit(0); }
    let result;
    try { result = await CASES[ARGS.case](); }
    catch (error) { result = { error : String(error && error.stack || error).split('\n').slice(0, 6).join(' | '), errors : W.errors }; }
    log('RESULT ' + JSON.stringify(result));
    process.exit(0);
}


// =============================================================================
// THE DRIVER: every case in its own process, then the checks
// =============================================================================
async function RunDriver() {
    let pass = 0, fail = 0;
    const FAILS = [];
    const J = (v) => JSON.stringify(v);
    function check(label, ok, detail) {
        if (ok) { pass++; console.log('  PASS  ' + label); return; }
        fail++; FAILS.push(label);
        console.log('  FAIL  ' + label + (detail === undefined ? '' : '\n        ' + (typeof detail === 'string' ? detail : J(detail)).slice(0, 1800)));
    }
    const RESULTS = {};
    function run(caseName, variant) {
        const args = [ SELF, '--child', '--case', caseName, '--variant', variant, '--root', ARGS.root, '--old', ARGS.old, '--tvsheets', ARGS.tvsheets, '--wcp', ARGS.wcp ];
        const r = spawnSync(process.execPath, args, { encoding : 'utf8', timeout : 120000 });
        const line = (r.stdout || '').split('\n').find((l) => l.startsWith('RESULT '));
        const value = line ? JSON.parse(line.slice(7)) : { error : 'no result', stdout : (r.stdout || '').slice(0, 800), stderr : (r.stderr || '').slice(0, 1500) };
        RESULTS[caseName + '/' + variant] = value;
        if (value.error) console.log('  (case ' + caseName + '/' + variant + ' reported an error: ' + value.error + (value.stderr ? ' | ' + value.stderr : '') + ')');
        return value;
    }
    const section = (t) => console.log('\n=== ' + t);

    // -------------------------------------------------------------------------
    section('A. Acceptance 1 - the first open of a session, through the loader');
    const fo = { new : run('firstopen', 'new'), old : run('firstopen', 'old'), mixed : run('firstopen', 'mixed') };
    check('new: "loaded" is announced exactly once while the editor opens', fo.new.loadsDuringOpen === 1, fo.new);
    check('new: ...by the sheet model\'s late start, before the loader carries on (the loader announces nothing)', fo.new.loadsBeforeModeReady === 1, fo.new);
    check('new: ...after the start-up pass attached History and AutoSave (the microtask)', fo.new.firstLoadAfterPass === true, fo.new);
    check('new: History heard the load (its depths announced for no sheet)', fo.new.historyHeardLoad === true, fo.new);
    check('new: SeedCommonFields ran: the pack\'s client and site address are seeded and announced', fo.new.fieldsAnnounced >= 1 && fo.new.common.Client === 'Mr J. Doous' && fo.new.common.SiteAddress === '1 Example Lane, Hamford', { fields : fo.new.fieldsAnnounced, common : fo.new.common });
    check('new: the History baseline: a field edit on the opened sheet is one undo step and Undo restores it', fo.new.baseline.canUndo === true && fo.new.baseline.restored === true, fo.new.baseline);
    check('new: CheckNames is silent with the real sheet model (DRAWING_SITEPLAN row included)', fo.new.checkNamesErrors.length === 0 && fo.new.errors.length === 0, fo.new.errors);
    check('new: a second drawings load in the same page is heard once', fo.new.secondLoadHeard === 1, fo.new.secondLoadHeard);
    check('control old (before W1-21): announced once, but by the loader after the mode controller started (no late start)', fo.old.loadsDuringOpen === 1 && fo.old.loadsBeforeModeReady === 0, fo.old);
    check('control old: the common field seed never ran on the first open (S03b-F07)', fo.old.fieldsAnnounced === 0 && !fo.old.common.Client, { fields : fo.old.fieldsAnnounced, common : fo.old.common });
    check('control old: a second drawings load was heard twice', fo.old.secondLoadHeard === 2, fo.old.secondLoadHeard);
    check('control mixed (the new model with the old loader): "loaded" twice - why AnnounceProjectLoad goes in the same change', fo.mixed.loadsDuringOpen === 2, fo.mixed);

    section('B. Acceptance 1 - a restored draft keeps the model dirty with the close guard active');
    const df = { new : run('draftfirst', 'new'), old : run('draftfirst', 'old') };
    check('new, first open with a draft waiting: restored, dirty, the close guard asks', df.new.restoredName === 'Plans (unsaved draft)' && df.new.dirty === true && df.new.closeGuard === true, df.new);
    const ds = { new : run('draftsecond', 'new'), old : run('draftsecond', 'old') };
    check('new, a draft put back by a second drawings load: restored, dirty, the close guard asks', ds.new.restoredName === 'Plans (unsaved draft)' && ds.new.dirty === true && ds.new.closeGuard === true && ds.new.loads >= 1, ds.new);
    check('control old: the second hearing cleared the dirty flag the restore set, and the close guard stayed silent', ds.old.dirty === false && ds.old.closeGuard === false, ds.old);

    section('C. Acceptance 2 - GetSheets between announcements; RenumberSheets');
    const nz = { new : run('normalise', 'new'), old : run('normalise', 'old') };
    check('new: no renormalising between announcements (the same Sheet__Groups list after 11 reads)', nz.new.untouchedBetweenAnnouncements === true, nz.new);
    check('new: an announcement brings the sheet back to the normaliser', nz.new.renormalisedAfterAnnouncement === true, nz.new);
    check('control old: every read renormalised', nz.old.untouchedBetweenAnnouncements === false, nz.old);
    const rn = { new : run('renumber', 'new'), old : run('renumber', 'old'), tv : run('renumber', 'tv'), newblock : run('renumber', 'newblock'), tvblock : run('renumber', 'tvblock') };
    const storedOf = (step) => Object.fromEntries(step.sheets.map((s) => [ s.id, s.stored ]));
    const contiguous = (step) => step.sheets.every((s, i) => s.order === i + 1);
    const NONE = '<none>';
    const loadStored = storedOf(rn.new.steps[0]);
    let untouched = true; const drift = [];
    rn.new.steps.forEach((step) => step.sheets.forEach((s) => {
        const was = s.id in loadStored ? loadStored[s.id] : (s.id === 'Sheet_006' ? 'A-101' : NONE);   // <-- the duplicate copies Sheet_002's typed number with the sheet
        if (s.stored !== was) { untouched = false; drift.push([ step.op, s.id, s.stored, was ]); }
    }));
    check('new, no register block: create, duplicate, delete and reorder leave every stored Sheet__Fields__DrawingNumber untouched', untouched && rn.new.steps.length === 5, drift.length ? drift : rn.new.steps.map((s) => s.sheets));
    check('new, no register block: Sheet__Order stays 1..n down the tab order after every step', rn.new.steps.slice(1).every(contiguous), rn.new.steps.map((s) => s.sheets.map((x) => x.id + ':' + x.order)));
    check('new: the delete keeps the dragged tab order (TrueVision 1.20.0 fix)', J(rn.new.steps[2].sheets.map((s) => s.id)) === J([ 'Sheet_003', 'Sheet_002', 'Sheet_004' ]), rn.new.steps[2].sheets);
    check('new: an unnumbered sheet\'s tab reads the default code ("D01 - Plans"); typed numbers keep theirs; a typed empty number shows the name alone',
        J(rn.new.steps[0].sheets.map((s) => s.tab)) === J([ 'D01 - Plans', 'A-101 - Elevations', 'D04 - Details', 'Sections' ]), rn.new.steps[0].sheets.map((s) => s.tab));
    check('control old: the delete put back the array order (VV bug)', J(rn.old.steps[2].sheets.map((s) => s.id)) !== J([ 'Sheet_003', 'Sheet_002', 'Sheet_004' ]), rn.old.steps[2].sheets);
    check('control TrueVision\'s own unit, no register block: it stamps the series over typed numbers (why the seam)', rn.tv.steps[1].sheets.some((s) => s.id === 'Sheet_002' && s.stored !== 'A-101'), rn.tv.steps[1].sheets);
    const sameJson = rn.newblock.steps.length === rn.tvblock.steps.length && rn.newblock.steps.every((s, i) => J(s.json) === J(rn.tvblock.steps[i].json));
    check('with a register block: every step leaves the sheets exactly as TrueVision\'s own unit does (byte-identical)', sameJson, rn.newblock.steps.map((s, i) => [ s.op, J(s.sheets), J(rn.tvblock.steps[i] && rn.tvblock.steps[i].sheets) ]));
    check('with a register block: the register numbers the pack down the tab order (D01, D02 ...)', J(rn.newblock.steps[1].sheets.map((s) => s.stored)) === J([ 'D01', 'D02', 'D03', 'D04' ]), rn.newblock.steps[1].sheets);
    check('no case threw or logged an error (renumber)', [ 'new', 'old', 'tv', 'newblock', 'tvblock' ].every((v) => !rn[v].error && (rn[v].errors || []).length === 0), Object.fromEntries(Object.entries(rn).map(([ k, v ]) => [ k, v.error || v.errors ])));

    section('D. Acceptance 3 - the notes margin');
    const mg = { new : run('margin', 'new'), old : run('margin', 'old') };
    const localKeys = Object.keys(mg.new.local || {});
    check('every existing local sheet was read (' + localKeys.length + ' sheets, ' + localKeys.filter((k) => mg.new.local[k] !== '<none>').length + ' with a margin record)', localKeys.length >= 4, localKeys);
    check('every existing margin record normalises byte-identical (new model = this app\'s old model)', J(mg.new.local) === J(mg.old.local), { new : mg.new.local, old : mg.old.local });
    check('the margin keys this app already had give byte-identical records, on every local sheet', J(mg.new.oldKeys) === J(mg.old.oldKeys), { new : mg.new.oldKeys, old : mg.old.oldKeys });
    check('...and gain no RegionsOn, Regions, LeaderlessOn or LeaderlessGroups key', !/RegionsOn|"Regions"|LeaderlessOn|LeaderlessGroups/.test(J(mg.new.oldKeys)), mg.new.oldKeys);
    (mg.new.ops || []).forEach((op) => {
        check('new: ' + op.name + ' - one "margin" announcement, one undo step, undo and redo exact',
            op.supported && op.changed && op.margins === 1 && op.others.length === 0 && op.depthDelta === 1 && op.undoRestored === true && op.redoReapplied === true, op);
    });
    check('new: silent region and margin updates announce nothing and mark the model dirty', mg.new.silent && mg.new.silent.events === 0 && mg.new.silent.dirty === true && mg.new.silent.moved === 31 && mg.new.silent.width === 91, mg.new.silent);
    check('new: a margin change then a text edit are two undo steps (the first Ctrl+Z takes only the text)',
        mg.new.twoStep && mg.new.twoStep.afterFirstUndo.texts === mg.new.twoStep.start.texts - 1 && mg.new.twoStep.afterFirstUndo.width === 70 && mg.new.twoStep.afterSecondUndo.width !== 70, mg.new.twoStep);
    check('control old: a margin change was no step (the six keys it had announced "margin" and recorded nothing)',
        (mg.old.ops || []).slice(0, 6).every((op) => op.margins === 1 && op.depthDelta === 0), (mg.old.ops || []).slice(0, 6));
    check('control old: one Ctrl+Z took the margin change and the text edit together', mg.old.twoStep && mg.old.twoStep.afterFirstUndo.width !== 70 && mg.old.twoStep.afterFirstUndo.texts === mg.old.twoStep.start.texts - 1, mg.old.twoStep);
    check('no error logged (margin, new)', !mg.new.error && (mg.new.errors || []).length === 0, mg.new.error || mg.new.errors);

    section('E. Acceptance 3 - undoing a vector delete still writes nothing to R2');
    const uw = { new : run('undowrite', 'new') };
    check('new: drawing, deleting and undoing the delete of a vector wrote nothing to R2', uw.new.afterCreate === 0 && uw.new.afterDelete === 0 && uw.new.afterUndoOfDelete === 0 && uw.new.shapeBack === true, uw.new);
    check('new: the harness sees saves - a rename and its undo each write once (structural)', uw.new.afterRename === 1 && uw.new.afterUndoOfRename === 2, uw.new);

    section('F. The interim state closed - Save Sheets says where the sheets went');
    const sv = { new : run('save', 'new'), old : run('save', 'old') };
    check('new: R2 and the local copy -> "Sheets saved to R2 and locally."', sv.new.ok && sv.new.ok.saved === true && J(sv.new.ok.toasts) === J([ [ 'Sheets saved to R2 and locally.', false ] ]), sv.new.ok);
    check('new: no local server -> "Sheets saved to R2."', sv.new.skipped && J(sv.new.skipped.toasts) === J([ [ 'Sheets saved to R2.', false ] ]), sv.new.skipped);
    check('new: the local copy failed -> one red toast naming the cause', sv.new.failed && J(sv.new.failed.toasts) === J([ [ 'Sheets saved to R2, but the local copy was not written: the disk is full.', true ] ]), sv.new.failed);
    check('control old: a save that worked said nothing (the interim state W1-05 named)', sv.old.ok && sv.old.ok.toasts.length === 0 && sv.old.skipped.toasts.length === 0, sv.old);

    section('G. History 1.7.0 - the areas step and the register rewrite');
    const ar = { new : run('areas', 'new'), old : run('areas', 'old') };
    check('new: a floor area group added is one "areas" announcement and one undo step, and Undo removes it',
        ar.new.areas && ar.new.areas.events === 1 && ar.new.areas.depthDelta === 1 && ar.new.areas.groups.length === 1 && ar.new.areas.afterUndo.length === 0, ar.new.areas);
    check('new: after "register-updated" an undo keeps the number the register wrote (TrueVision History 1.6.0)', ar.new.register && ar.new.register.afterUndo === 'D09', ar.new.register);
    check('control old: the undo put back the number from before the register (no rewrite)', ar.old.register && ar.old.register.afterUndo !== 'D09', ar.old.register);

    section('H. The loader names a drawing as the model does, before the load and after it');
    const lb = fo.new.labels;
    check('the loader\'s pre-load answers equal the loaded model\'s, sheet by sheet (number, short code, tab label)', J(lb.pre) === J(lb.model), lb);
    check('...and its answers after the load are the same', J(lb.post) === J(lb.model), lb);
    check('the expected reading: D01 for the unnumbered first sheet, A-101 typed, D04 for the sheet with no order, the typed empty number alone',
        J(lb.model.map((s) => s.tab)) === J([ 'D01 - Plans', 'A-101 - Elevations', 'D04 - Details', 'Sections' ]), lb.model);
    const lbOld = fo.old.labels;
    check('control old: before W1-21 the loader read the stored number only, so the menu and the model disagreed once the Sheets unit is TrueVision\'s',
        J(lbOld.pre.map((s) => s.tab)) === J([ 'Plans', 'A-101 - Elevations', 'Details', 'Sections' ]), lbOld.pre);

    console.log('\n' + (fail === 0 ? 'Every check held (' + pass + ').' : fail + ' check(s) FAILED, ' + pass + ' held: ' + FAILS.join(' | ')));
    if (ARGS.out) {
        mkdirSync(ARGS.out, { recursive : true });
        writeFileSync(join(ARGS.out, 'harness_w1_21__results.json'), JSON.stringify(RESULTS, null, 1));
    }
    process.exit(fail === 0 ? 0 : 1);
}

if (ARGS.child) await RunChild(); else await RunDriver();
