// =============================================================================
// VALEVISION3D - W1-06 NODE CHECK - DRAFT CORE AND THE SHARED DEV-ROW SHELL
// =============================================================================
//
// Scratch check for package W1-06 (never shipped). Every scenario builds a FRESH temporary app tree in the
// OS temp folder holding this package's files (the candidates, or the live files with --live), the REAL
// landed Na__DrawView__ProjectData__ (W1-05) where a scenario needs it, and small stubs for the transport
// facade, the ProjectLoader helpers, the presentation scene data, the 42 / 45 data modules, ValeVision's 41
// section scene data and the Layout Editor loader. A minimal fake DOM stands in for the browser.
//
//   A  RowAccordion: ValeVision's own caller pattern run against the OLD file and the port - identical
//      states; then TrueVision's change guard, open listeners, RequestOpenId, lead / trail.
//   B  Modal 1.2.0: details list, footnote, green commit button, the alt answer, the keyboard, the typed
//      gate, progress; a legacy call builds the same DOM as the old 1.0.0 file.
//   C  DevRowShell over the real ProjectData (2026/3047__Doous's block): head, chips, actions, danger zone,
//      Advanced, usage, WhereSaved, the Update and Delete dialogs.
//   D  DraftGuard with the real ProjectData save: the payload guard keeps a changed draft out of another
//      save (R2 and the local copy), SaveActive writes it, ConfirmLeave through the accordion and the modal,
//      revert in place, a project load ends the draft.
//   E  RenameDrawing on the loader route: the stamper prepared BEFORE anything is written, the order of the
//      binding / re-stamp / save, failure revert, StageFloorPlan / StageElevation and their undo.
//   F  The three stylesheets: the DrawView sheet equals TrueVision's rules, the modal rules equal
//      TrueVision's region, the CSS index order.
//   G  The ported Na__Test__DrawingDrafts__ in a temporary tree, with and without the Doous file, and four
//      planted faults it must catch.
//
// Nothing is written outside the OS temp folder. The real Doous project.json is only read (and copied
// into the temporary tree for G).
//
// USAGE:  node w1_06_check.mjs [--live]
//
// =============================================================================

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';


// -----------------------------------------------------------------------------
// REGION | Paths
// -----------------------------------------------------------------------------

    const LIVE       = process.argv.includes('--live');
    const HERE       = dirname(fileURLToPath(import.meta.url));
    const APP        = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
    const CAND       = join(HERE, 'candidates');
    const TVDIR      = join(HERE, 'tv');
    const PREIMAGE   = join(HERE, 'preimage');
    const DOOUS_FILE = 'D:/10_CoreLib__ValeCodebase/WebApps/Whitecardopedia/Projects/2026/3047__Doous/project.json';
    const SCRATCH    = mkdtempSync(join(tmpdir(), 'na-w1-06-check-'));

    const REL = {
        maths    : '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DraftMaths__.js',
        usage    : '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DrawingUsage__.js',
        shell    : '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DevRowShell__.js',
        guard    : '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__DraftGuard__.js',
        fold     : '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RowAccordion__.js',
        rename   : '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__RenameDrawing__.js',
        dvcss    : '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css',
        modal    : '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js',
        carousel : '03__Style__AppStylesheets/Na__PresentationMode__Styles__SceneCarousel__.css',
        index    : '03__Style__AppStylesheets/Na__CoreUi__Styles__Index__.css',
        test     : '80__Testing__PrototypeEnvironment/Na__Test__DrawingDrafts__.test.mjs',
        data     : '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js',
        scenes   : '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js',
        loaderU  : '02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js',
        mirror   : '02__Src__AppModules/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js',
        cfapi    : '02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js',
        fpdata   : '02__Src__AppModules/42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js',
        elevdata : '02__Src__AppModules/45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js',
        sect     : '02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__SceneData.js',
        leload   : '02__Src__AppModules/51__System__LayoutEditor/01__Core__Loader/Na__LayoutEditor__Loader__.js',
        autoname : '02__Src__AppModules/45__System__ElevationViews/Na__Elevation__AutoNameText__.js'
    };

    // The files under test: candidates, or the live files once landed
    const OURS = (rel) => LIVE ? join(APP, rel) : join(CAND, rel);
    // The pre-port ValeVision files (A, B compare against them): the live file before landing, the saved pre-image after
    const OLD  = (rel) => LIVE ? join(PREIMAGE, rel) : join(APP, rel);
    const OLD_SHA1 = {
        [REL.fold]  : '5ca7f3a63a4a99a25754246b742fd8adb86b5dac',
        [REL.modal] : 'e8b7ff1d1327f2c6c1dc3d6b99a28902e04d179e',
        [REL.carousel] : '370a28cf39b949287e07d5562c6bbbb5cf6a7acc',
        [REL.index] : 'c074af21d992a27c005debcfe6115ff358d3a48a'
    };

    const DOOUS = JSON.parse(readFileSync(DOOUS_FILE, 'utf8'));
    const DOOUS_SHA1 = Sha1(readFileSync(DOOUS_FILE));

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks and Console
// -----------------------------------------------------------------------------

    let failures = 0;
    let passes   = 0;
    const realLog = console.log.bind(console);
    function check(name, passed, detail) {
        if (passed) passes++; else failures++;
        let text = (passed ? '  PASS  ' : '  FAIL  ') + name;
        if (!passed && detail !== undefined) {
            let shown;
            try { shown = JSON.stringify(detail); } catch (error) { shown = String(detail); }
            text += '  -> ' + (shown && shown.length > 700 ? shown.slice(0, 700) + '...' : shown);
        }
        realLog(text);
    }
    function section(title) { realLog('\n' + title); }
    async function RunSection(title, body) {
        section(title);
        try { await body(); }
        catch (error) { check('the section ran to its end without throwing', false, (error && error.stack) ? error.stack.split('\n').slice(0, 6).join(' | ') : String(error)); }
    }
    function Sha1(bytes) { return createHash('sha1').update(bytes).digest('hex'); }
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const tick  = (ms) => new Promise((done) => setTimeout(done, ms || 0));

    // The modules' own console lines are kept for the checks, not printed
    const kept = [];
    for (const level of [ 'log', 'warn', 'info', 'error' ]) {
        const real = console[level].bind(console);
        console[level] = (...parts) => {
            const text = parts.map((part) => (part && part.message) ? part.message : String(part)).join(' ');
            if (/^\[(ValeVision3D|TrueVision3D)/.test(text)) { kept.push([ level, text ]); return; }
            real(...parts);
        };
    }
    function KeptSince(mark) { return kept.slice(mark); }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | A Minimal DOM
// -----------------------------------------------------------------------------

    class FakeText {
        constructor(text) { this.nodeType = 3; this._text = String(text); this.parentNode = null; }
        get textContent() { return this._text; }
        set textContent(value) { this._text = String(value); }
        get isConnected() { return IsConnected(this); }
        Walk() { return null; }
        All(fn, out) { return out || []; }
    }

    class FakeElement extends EventTarget {
        constructor(tag) {
            super();
            this.nodeType = 1; this.tagName = String(tag).toUpperCase(); this.childNodes = []; this.parentNode = null;
            this.attributes = {}; this.style = {}; this._text = ''; this._html = ''; this._className = '';
            this.disabled = false; this.hidden = false; this.title = ''; this.type = ''; this.value = ''; this.id = '';
            this.onclick = null;
        }
        get className() { return this._className; }
        set className(value) { this._className = String(value); }
        get classList() {
            const el = this;
            const list = () => el._className.split(/\s+/).filter(Boolean);
            return {
                add      : (...names) => { const set = new Set(list()); names.forEach((n) => set.add(n)); el._className = [ ...set ].join(' '); },
                remove   : (...names) => { el._className = list().filter((n) => !names.includes(n)).join(' '); },
                toggle   : (name, force) => { const has = list().includes(name); const want = (force === undefined) ? !has : !!force;
                                              if (want && !has) el.classList.add(name); if (!want && has) el.classList.remove(name); return want; },
                contains : (name) => list().includes(name)
            };
        }
        get children() { return this.childNodes.filter((node) => node.nodeType === 1); }
        get firstChild() { return this.childNodes[0] || null; }
        appendChild(child) { if (child.parentNode) child.parentNode.removeChild(child); child.parentNode = this; this.childNodes.push(child); return child; }
        removeChild(child) { const at = this.childNodes.indexOf(child); if (at !== -1) this.childNodes.splice(at, 1); child.parentNode = null; return child; }
        remove() { if (this.parentNode) this.parentNode.removeChild(this); }
        get textContent() { return this._text + this.childNodes.map((node) => node.textContent).join(''); }
        set textContent(value) { this.childNodes.forEach((node) => { node.parentNode = null; }); this.childNodes = []; this._text = String(value); this._html = ''; }
        get innerHTML() { return this._html; }
        set innerHTML(value) {
            this.childNodes.forEach((node) => { node.parentNode = null; });
            this.childNodes = []; this._html = String(value);
            this._text = String(value).replace(/<[^>]*>/g, '').replace(/&#9662;/g, '\u25BE');
        }
        setAttribute(key, value) { this.attributes[key] = String(value); }
        getAttribute(key) { return Object.prototype.hasOwnProperty.call(this.attributes, key) ? this.attributes[key] : null; }
        get isConnected() { return IsConnected(this); }
        Walk(fn) { for (const child of this.children) { if (fn(child)) return child; const found = child.Walk(fn); if (found) return found; } return null; }
        All(fn, out) { const list = out || []; for (const child of this.children) { if (fn(child)) list.push(child); child.All(fn, list); } return list; }
        querySelector(selector) { return this.Walk(Matcher(selector)); }
        querySelectorAll(selector) { return this.All(Matcher(selector)); }
        contains(node) { let at = node; while (at) { if (at === this) return true; at = at.parentNode; } return false; }
        focus() { globalThis.document.activeElement = this; }
        click() { if (this.disabled) return false; this.dispatchEvent(new Event('click')); if (typeof this.onclick === 'function') this.onclick(); return true; }
        scrollIntoView() { this.scrolledIntoView = (this.scrolledIntoView || 0) + 1; }
    }
    function Matcher(selector) {
        if (selector.startsWith('.')) { const name = selector.slice(1); return (el) => el.classList.contains(name); }
        if (selector.startsWith('#')) { const id = selector.slice(1); return (el) => el.id === id; }
        return (el) => el.tagName === selector.toUpperCase();
    }
    function IsConnected(node) { let at = node; while (at) { if (at === globalThis.document.body) return true; at = at.parentNode; } return false; }
    class FakeDocument extends EventTarget {
        constructor() { super(); this.body = new FakeElement('body'); this.activeElement = null; }
        createElement(tag) { return new FakeElement(tag); }
        createTextNode(text) { return new FakeText(text); }
    }
    function Key(key) { const event = new Event('keydown', { cancelable : true }); Object.defineProperty(event, 'key', { value : key }); return event; }
    function Dump(el) {
        if (!el || el.nodeType !== 1) return el ? { text : el.textContent } : null;
        return { tag : el.tagName, cls : el.className, text : el._text, disabled : el.disabled, hidden : el.hidden, kids : el.childNodes.map(Dump) };
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Temporary App Trees and the Page
// -----------------------------------------------------------------------------

    let treeCount = 0;
    function MakeTree(files) {
        const root = join(SCRATCH, 'tree-' + (++treeCount));
        mkdirSync(root, { recursive : true });
        writeFileSync(join(root, 'package.json'), '{ "type" : "module" }\n');
        for (const [ rel, spec ] of Object.entries(files)) {
            const path = join(root, rel);
            mkdirSync(dirname(path), { recursive : true });
            if (spec.file) copyFileSync(spec.file, path);
            else writeFileSync(path, spec.source);
        }
        return root;
    }
    function Import(root, rel) { return import(pathToFileURL(join(root, rel)).href); }

    function NewPage() {
        const doc = new FakeDocument();
        const win = new EventTarget();
        win.location = { hostname : 'localhost', port : '8000', search : '?project=2026/3047__Doous', origin : 'http://localhost:8000',
                         href : 'http://localhost:8000/ValeVision3D/index.html?project=2026/3047__Doous' };
        win.setTimeout = setTimeout; win.clearTimeout = clearTimeout;
        globalThis.document = doc;
        globalThis.window   = win;
        globalThis.Element  = FakeElement;
        globalThis.__w106   = { cloud : [], local : [], events : [], broadcasts : 0, sceneConfig : null };
        return { doc, win, w : globalThis.__w106 };
    }

    // STUBS | only what the modules under test import from these neighbours
    const STUB = {
        scenes : [
            'export function Na__PresentationMode__ProjectJson__GetActiveConfig() { return globalThis.__w106.sceneConfig || null; }',
            'export function Na__PresentationMode__ProjectJson__BroadcastScenesChanged() { globalThis.__w106.broadcasts += 1; }'
        ].join('\n'),
        loaderU : [
            "export function Na__AppUtils__GetProjectCodeFromUrl() { return '2026/3047__Doous'; }",
            'export function Na__AppUtils__IsRunningOnLocalhost() { return false; }'
        ].join('\n'),
        cfapi : [
            'export function Na__CfApi__IsConfigured() { return true; }',
            'export async function Na__CfApi__MergeAndSaveKeys(partial, options) {',
            '    const w = globalThis.__w106; w.cloud.push({ partial : JSON.parse(JSON.stringify(partial)), options : options || null });',
            '    return w.cloudAnswer || { ok : true };',
            '}'
        ].join('\n'),
        mirror : [
            'export async function Na__LocalMirror__MergeKeys(keys, options) {',
            "    const w = globalThis.__w106; w.local.push({ keys : JSON.parse(JSON.stringify(keys)), options : options || null });",
            "    return { ok : true, skipped : false, drawings : { digest : 'sha1:test' } };",
            '}',
            'export async function Na__LocalMirror__DrawingsFingerprint() { return { ok : false, skipped : true }; }'
        ].join('\n'),
        renameData : [
            "export const Na__DrawData__SCENE_PLAN_ID_KEY = 'PresentationMode__Scene__FloorPlanId';",
            "export const Na__DrawData__SCENE_ELEVATION_ID_KEY = 'PresentationMode__Scene__ElevationId';",
            'export function Na__DrawData__IsFloorPlanScene(scene) { return Boolean(scene && scene[Na__DrawData__SCENE_PLAN_ID_KEY]); }',
            'export function Na__DrawData__IsElevationScene(scene) { return Boolean(scene && scene[Na__DrawData__SCENE_ELEVATION_ID_KEY]); }',
            'export async function Na__DrawData__Save(showToast) {',
            "    const w = globalThis.__w106; w.events.push([ 'save', w.probe ? w.probe() : null ]);",
            '    await new Promise((done) => setTimeout(done, 2));',
            '    if (w.saveAnswer === false) { if (typeof showToast === "function") showToast("Drawings save failed: test", true); return false; }',
            '    return true;',
            '}'
        ].join('\n'),
        fpdata : [
            'export function Na__FpData__GetPlanById(block, id) { return (globalThis.__w106.plans || []).find((p) => p.FloorPlan__Id === id) || null; }',
            'export function Na__FpData__FindSceneForPlan(config, plan) { return ((config && config.scenes) || []).find((s) => s.PresentationMode__Scene__FloorPlanId === plan.FloorPlan__Id) || null; }'
        ].join('\n'),
        elevdata : [
            'export function Na__ElevData__GetElevationById(block, id) { return (globalThis.__w106.elevations || []).find((e) => e.Elevation__Id === id) || null; }',
            'export function Na__ElevData__FindSceneFor(config, elevation) { return ((config && config.scenes) || []).find((s) => s.PresentationMode__Scene__ElevationId === elevation.Elevation__Id) || null; }'
        ].join('\n'),
        sect : [
            'export function Na__SectSceneData__RenameSceneKey(from, to, sceneId) {',
            "    const w = globalThis.__w106; w.events.push([ 'binding', from, to, sceneId, w.probe ? w.probe() : null ]);",
            '    return w.bindingAnswer !== false;',
            '}'
        ].join('\n'),
        leload : [
            'export async function Na__LeLoad__PrepareRestamp(sceneId) {',
            "    const w = globalThis.__w106; w.events.push([ 'prepare:start', sceneId, w.probe ? w.probe() : null ]);",
            '    await new Promise((done) => setTimeout(done, 5));',
            "    w.events.push([ 'prepare:end', sceneId, w.probe ? w.probe() : null ]);",
            '    return true;',
            '}',
            'export function Na__LeLoad__RestampForScene(sceneId) {',
            "    const w = globalThis.__w106; w.events.push([ 'restamp', sceneId, w.probe ? w.probe() : null ]);",
            '    return (w.restampCount === undefined) ? 2 : w.restampCount;',
            '}'
        ].join('\n')
    };

    function EditorTree(extra) {
        return MakeTree(Object.assign({
            [REL.data]   : { file : join(APP, REL.data) },                   // <-- The REAL ProjectData W1-05 landed
            [REL.maths]  : { file : OURS(REL.maths) },
            [REL.usage]  : { file : OURS(REL.usage) },
            [REL.shell]  : { file : OURS(REL.shell) },
            [REL.guard]  : { file : OURS(REL.guard) },
            [REL.fold]   : { file : OURS(REL.fold) },
            [REL.modal]  : { file : OURS(REL.modal) },
            [REL.scenes] : { source : STUB.scenes },
            [REL.loaderU]: { source : STUB.loaderU },
            [REL.cfapi]  : { source : STUB.cfapi },
            [REL.mirror] : { source : STUB.mirror }
        }, extra || {}));
    }

    function ExportNames(rel) {
        const source = readFileSync(OURS(rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');
        const block = source.match(/export\s*\{([\s\S]*?)\}/);
        return block ? block[1].split(',').map((part) => part.trim()).filter(Boolean).map((part) => { const as = part.split(/\s+as\s+/); return (as[1] || as[0]).trim(); }) : [];
    }
    function TvExportNames(rel) {
        const source = readFileSync(join(TVDIR, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');
        const block = source.match(/export\s*\{([\s\S]*?)\}/);
        return block ? block[1].split(',').map((part) => part.trim()).filter(Boolean).map((part) => { const as = part.split(/\s+as\s+/); return (as[1] || as[0]).trim(); }) : [];
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | A - Row Accordion
// -----------------------------------------------------------------------------

    // ValeVision's own caller pattern (Floor Plans and Elevations editors 1.2.0): Wrap each row card, put the
    // scene link row into the returned body, move the slot with SetOpenId, CloseIfOpen on delete, rebuild.
    async function VvCallerScript(fold) {
        const states = [];
        const panels = { plans : globalThis.document.createElement('div'), elevations : globalThis.document.createElement('div') };
        globalThis.document.body.appendChild(panels.plans);
        globalThis.document.body.appendChild(panels.elevations);
        const handles = {};
        const build = (panel, ids) => {
            panel.textContent = '';
            ids.forEach((id) => {
                const card = globalThis.document.createElement('div');
                card.className = 'na-fp-dev__row';
                card.appendChild(globalThis.document.createElement('input'));
                card.appendChild(globalThis.document.createElement('button'));
                panel.appendChild(card);
                const handle = fold.Na__DrawFold__Wrap(card, { id : id, title : 'Row ' + id });
                handle.body.appendChild(globalThis.document.createElement('div'));     // <-- The scene link row goes into the body
                handles[id === undefined ? 'unkeyed' : id] = handle;
            });
        };
        const snap = (label) => {
            const open = Object.entries(handles).filter(([ , h ]) => h.root.isConnected && h.root.classList.contains('na-draw-dev__fold--open')).map(([ id ]) => id).sort();
            const aria = Object.entries(handles).filter(([ , h ]) => h.root.isConnected).map(([ id, h ]) => id + '=' + h.head.getAttribute('aria-expanded')).sort();
            states.push({ label, open, aria, openId : fold.Na__DrawFold__GetOpenId() });
        };
        build(panels.plans, [ 'FloorPlan_001', 'FloorPlan_002' ]);
        build(panels.elevations, [ 'Elevation_001', 'Elevation_002', undefined ]);
        snap('built, nothing open');
        fold.Na__DrawFold__SetOpenId('Elevation_001');                              snap('SetOpenId elevation');
        fold.Na__DrawFold__SetOpenId('FloorPlan_002');                              snap('SetOpenId plan folds the elevation');
        handles.Elevation_002.head.click();                                          snap('header click opens at once');
        handles.Elevation_002.head.click();                                          snap('second click folds');
        states.push({ label : 'CloseIfOpen on a folded row', value : fold.Na__DrawFold__CloseIfOpen('Elevation_002') });
        fold.Na__DrawFold__SetOpenId('FloorPlan_001');
        states.push({ label : 'CloseIfOpen on the open row', value : fold.Na__DrawFold__CloseIfOpen('FloorPlan_001') });  snap('after CloseIfOpen');
        fold.Na__DrawFold__SetOpenId('FloorPlan_002');
        build(panels.plans, [ 'FloorPlan_001', 'FloorPlan_002' ]);                   snap('rebuild keeps the open slot');
        fold.Na__DrawFold__SetOpenId(undefined);                                     snap('undefined folds the lot');
        states.push({ label : 'IsOpen', value : [ fold.Na__DrawFold__IsOpen(null), fold.Na__DrawFold__IsOpen(undefined), fold.Na__DrawFold__IsOpen('FloorPlan_002') ] });
        states.push({ label : 'scrolled', value : handles.FloorPlan_002.head.scrolledIntoView || 0 });
        return states;
    }

    async function SectionA() {
        const oldBytes = readFileSync(OLD(REL.fold));
        check('the OLD accordion read is ValeVision\'s pre-port file (sha1 ' + OLD_SHA1[REL.fold].slice(0, 8) + ')', Sha1(oldBytes) === OLD_SHA1[REL.fold], Sha1(oldBytes));

        NewPage();
        const oldFold = await Import(MakeTree({ [REL.fold] : { file : OLD(REL.fold) } }), REL.fold);
        const before  = await VvCallerScript(oldFold);
        NewPage();
        const newFold = await Import(MakeTree({ [REL.fold] : { file : OURS(REL.fold) } }), REL.fold);
        const after   = await VvCallerScript(newFold);
        check('ValeVision\'s caller pattern gives the same states on the old file and the port (' + after.length + ' steps)',
              JSON.stringify(before) === JSON.stringify(after), { before, after });
        check('...and the states are the right ones: one open row across both panels, the unkeyed row always open',
              JSON.stringify(after[1].open) === JSON.stringify([ 'Elevation_001', 'unkeyed' ])
              && JSON.stringify(after[2].open) === JSON.stringify([ 'FloorPlan_002', 'unkeyed' ])
              && JSON.stringify(after[3].open) === JSON.stringify([ 'Elevation_002', 'unkeyed' ])
              && JSON.stringify(after[4].open) === JSON.stringify([ 'unkeyed' ]), after.slice(0, 5));

        // TRUEVISION'S ADDITIONS | on the port only
        NewPage();
        const fold = await Import(MakeTree({ [REL.fold] : { file : OURS(REL.fold) } }), REL.fold);
        const card = globalThis.document.createElement('div');
        card.appendChild(globalThis.document.createElement('input'));
        globalThis.document.body.appendChild(card);
        const lead = globalThis.document.createElement('span'); lead.className = 'lead';
        const trail = globalThis.document.createElement('span'); trail.className = 'trail';
        const h = fold.Na__DrawFold__Wrap(card, { id : 'Elevation_009', title : 'East Elevation', lead, trail });
        check('Wrap hands back root, head, body and the name element', h.root === card && !!h.head && !!h.body && !!h.name && h.name.textContent === 'East Elevation');
        check('the header reads arrow, lead, name, trail', h.head.children.map((c) => c.className).join('|') === 'na-draw-dev__fold-arrow|lead|na-draw-dev__fold-name|trail', h.head.children.map((c) => c.className));
        check('the card\'s own children moved into the body', h.body.children.length === 1 && h.body.children[0].tagName === 'INPUT');

        const heard = [];
        fold.Na__DrawFold__OnOpenChanged((openId, previousId) => heard.push([ openId, previousId ]));
        fold.Na__DrawFold__SetOpenId('Elevation_009');
        fold.Na__DrawFold__SetOpenId('Elevation_009');
        fold.Na__DrawFold__SetOpenId(null);
        check('open listeners hear each move once, with the previous id, and not a non-move', JSON.stringify(heard) === JSON.stringify([ [ 'Elevation_009', null ], [ null, 'Elevation_009' ] ]), heard);

        let answer = false;
        const asked = [];
        fold.Na__DrawFold__SetChangeGuard(async (nextId, currentId) => { asked.push([ nextId, currentId ]); return answer; });
        h.head.click();
        await tick(1);
        check('a guard that says no keeps the slot where it was', fold.Na__DrawFold__GetOpenId() === null && JSON.stringify(asked) === JSON.stringify([ [ 'Elevation_009', null ] ]), { open : fold.Na__DrawFold__GetOpenId(), asked });
        answer = true;
        h.head.click();
        await tick(1);
        check('a guard that says yes lets it move', fold.Na__DrawFold__GetOpenId() === 'Elevation_009');

        let release = null;
        fold.Na__DrawFold__SetChangeGuard(() => new Promise((done) => { release = done; }));
        const first  = fold.Na__DrawFold__RequestOpenId(null);
        const second = await fold.Na__DrawFold__RequestOpenId('Elevation_010');
        release(true);
        const firstAnswer = await first;
        check('a second request while one waits is dropped; the first one lands', second === false && firstAnswer === true && fold.Na__DrawFold__GetOpenId() === null);

        const mark = kept.length;
        fold.Na__DrawFold__SetChangeGuard(async () => { throw new Error('planted'); });
        const thrown = await fold.Na__DrawFold__RequestOpenId('Elevation_009');
        const warned = KeptSince(mark).filter(([ level, text ]) => level === 'warn' && text.startsWith('[ValeVision3D] Drawing row change guard failed'));
        check('a guard that throws keeps the row, and says so with this app\'s console prefix', thrown === false && fold.Na__DrawFold__GetOpenId() === null && warned.length === 1, KeptSince(mark));
        fold.Na__DrawFold__SetChangeGuard('not a function');
        check('a non-function clears the guard (the click moves the slot at once again)', (h.head.click(), fold.Na__DrawFold__GetOpenId() === 'Elevation_009'));

        const tvNames = TvExportNames(REL.fold);
        check('the export list is TrueVision\'s 8 names', JSON.stringify(ExportNames(REL.fold)) === JSON.stringify(tvNames) && tvNames.length === 8, ExportNames(REL.fold));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | B - Modal 1.2.0
// -----------------------------------------------------------------------------

    function ModalParts() {
        const root = globalThis.document.body.querySelector('#naPmDevModalRoot');
        const card = root ? root.querySelector('.na-pm-modal__card') : null;
        const buttons = card ? card.querySelectorAll('.na-pm-modal__btn') : [];
        return { root, card, buttons, open : !!(root && root.classList.contains('is-open')) };
    }

    async function SectionB() {
        NewPage();
        const modal = await Import(MakeTree({ [REL.modal] : { file : OURS(REL.modal) } }), REL.modal);

        // 1.1.0 | details, footnote, isCommit
        let pending = modal.Na__PresentationMode__DevMenu__Confirm({
            title : 'Update "East Elevation"?', message : 'This keeps the elevation.',
            details : [ 'Plane moved 300 mm', '', 'Turned: model bearing 180 to 270 deg', 7 ], footnote : '2 viewports on D02 - Elevations are drawn from this elevation.',
            confirmLabel : 'Update', isCommit : true
        });
        let parts = ModalParts();
        const list = parts.card.querySelector('.na-pm-modal__details');
        const footnote = parts.card.querySelector('.na-pm-modal__message--footnote');
        const confirm = parts.card.querySelector('.na-pm-modal__btn--confirm');
        check('the dialog is open, titled, with its message', parts.open && parts.card.querySelector('h3').textContent === 'Update "East Elevation"?');
        check('details: a list under the message, one line each, blanks and non-strings left out',
              !!list && list.tagName === 'UL' && list.children.map((li) => li.textContent).join('|') === 'Plane moved 300 mm|Turned: model bearing 180 to 270 deg', list ? list.children.map((li) => li.textContent) : null);
        check('footnote: a second paragraph with the footnote class', !!footnote && footnote.tagName === 'P' && footnote.classList.contains('na-pm-modal__message') && footnote.textContent.startsWith('2 viewports'));
        check('isCommit: the confirm button is the green commit one', confirm.classList.contains('na-pm-modal__btn--commit') && !confirm.classList.contains('na-pm-modal__btn--danger'));
        check('order: title, message, details, footnote, footer', parts.card.children.map((c) => c.tagName + (c.className ? '.' + c.className.split(' ').pop() : '')).join(' ') === 'H3.na-pm-modal__title P.na-pm-modal__message UL.na-pm-modal__details P.na-pm-modal__message--footnote DIV.na-pm-modal__footer',
              parts.card.children.map((c) => c.tagName + '.' + c.className));
        check('focus starts on Cancel', globalThis.document.activeElement && globalThis.document.activeElement.classList.contains('na-pm-modal__btn--cancel'));
        confirm.click();
        check('Confirm answers true, closes and empties the card', (await pending) === true && !ModalParts().open && ModalParts().card.childNodes.length === 0);

        // A destructive confirm is red even when it is a commit
        pending = modal.Na__PresentationMode__DevMenu__Confirm({ title : 'Update?', isCommit : true, isDestructive : true });
        parts = ModalParts();
        const red = parts.card.querySelector('.na-pm-modal__btn--confirm');
        check('isDestructive wins over isCommit: red, not green', red.classList.contains('na-pm-modal__btn--danger') && !red.classList.contains('na-pm-modal__btn--commit'));
        globalThis.document.dispatchEvent(Key('Escape'));
        check('Escape answers false', (await pending) === false);

        // 1.2.0 | altLabel
        pending = modal.Na__PresentationMode__DevMenu__Confirm({ title : 'Apply the draft?', confirmLabel : 'Apply', cancelLabel : 'Later', altLabel : 'Discard', altIsDestructive : true });
        parts = ModalParts();
        const footer = parts.card.querySelector('.na-pm-modal__footer');
        check('altLabel: three buttons - Cancel, the alternative, Confirm', footer.children.map((b) => b.textContent).join('|') === 'Later|Discard|Apply', footer.children.map((b) => b.textContent));
        check('altIsDestructive: the alternative is red', footer.children[1].classList.contains('na-pm-modal__btn--danger'));
        footer.children[1].click();
        check('the alternative answers \'alt\'', (await pending) === 'alt');
        pending = modal.Na__PresentationMode__DevMenu__Confirm({ title : 'Apply the draft?', altLabel : 'Discard' });
        globalThis.document.dispatchEvent(Key('Enter'));
        check('Enter is still Confirm with a third button', (await pending) === true);

        // A plain dialog answers true or false only
        pending = modal.Na__PresentationMode__DevMenu__Confirm({ title : 'Plain' });
        check('a plain dialog has two buttons', ModalParts().card.querySelector('.na-pm-modal__footer').children.length === 2);
        modal.Na__PresentationMode__DevMenu__Confirm({ title : 'Second' }).then(() => {});
        check('a second dialog closes the first, which answers false (never alt)', (await pending) === false);
        globalThis.document.dispatchEvent(Key('Escape'));

        // Typed gate and progress, unchanged
        pending = modal.Na__PresentationMode__DevMenu__ConfirmTyped({ title : 'Clear?', requiredWord : 'CLEAR' });
        parts = ModalParts();
        const input = parts.card.querySelector('.na-pm-modal__input');
        const gated = parts.card.querySelector('.na-pm-modal__btn--confirm');
        check('typed gate starts locked', gated.disabled === true);
        input.value = 'clear'; input.dispatchEvent(new Event('input'));
        check('a near miss stays locked', gated.disabled === true);
        input.value = 'CLEAR'; input.dispatchEvent(new Event('input'));
        gated.click();
        check('the exact word unlocks it, and Confirm answers true', (await pending) === true);
        const progress = modal.Na__PresentationMode__DevMenu__OpenProgress({ title : 'Re-render', initialStatus : 'Starting...' });
        progress.Update(1, 4, 'Scene 2');
        check('progress: bar and count move', ModalParts().card.querySelector('.na-pm-modal__bar-fill').style.width === '25%' && ModalParts().card.querySelector('.na-pm-modal__count').textContent === '2 of 4');
        progress.Finish('Done.', { hadProblems : true });
        check('progress: Finish turns Stop into Close and keeps a run with problems on screen', ModalParts().open && ModalParts().card.querySelector('.na-pm-modal__btn--cancel').textContent === 'Close');
        progress.Close();
        check('progress: Close shuts it', !ModalParts().open);

        // LEGACY CALLS | ValeVision's Presentation Scenes callers build exactly what 1.0.0 built
        const legacy = [
            { title : 'Overwrite?', message : 'Replace the camera.', confirmLabel : 'Overwrite', cancelLabel : 'Cancel', isDestructive : true },
            { title : 'Re-render all?', message : 'Every thumbnail.' }
        ];
        const domOf = async (file) => {
            NewPage();
            const m = await Import(MakeTree({ [REL.modal] : { file } }), REL.modal);
            const out = [];
            for (const opts of legacy) {
                const p = m.Na__PresentationMode__DevMenu__Confirm(opts);
                out.push(Dump(ModalParts().card));
                ModalParts().card.querySelector('.na-pm-modal__btn--cancel').click();
                out.push(await p);
            }
            return out;
        };
        const oldBytes = readFileSync(OLD(REL.modal));
        check('the OLD modal read is ValeVision\'s 1.0.0 file (sha1 ' + OLD_SHA1[REL.modal].slice(0, 8) + ')', Sha1(oldBytes) === OLD_SHA1[REL.modal], Sha1(oldBytes));
        const oldDom = await domOf(OLD(REL.modal));
        const newDom = await domOf(OURS(REL.modal));
        check('a call ValeVision makes today builds the same dialog as 1.0.0 and answers the same', JSON.stringify(oldDom) === JSON.stringify(newDom), { oldDom, newDom });

        check('the export list is TrueVision\'s 3 names', JSON.stringify(ExportNames(REL.modal)) === JSON.stringify(TvExportNames(REL.modal)) && ExportNames(REL.modal).length === 3, ExportNames(REL.modal));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | C - Dev Row Shell over the real ProjectData
// -----------------------------------------------------------------------------

    async function SectionC() {
        const page = NewPage();
        const tree = EditorTree();
        const data  = await Import(tree, REL.data);
        const shell = await Import(tree, REL.shell);
        page.w.sceneConfig = clone(DOOUS.PresentationMode__SavedCameraScenes || {});
        data.Na__DrawData__Load(clone(DOOUS.LayoutEditor__DrawingsData), '2026/3047__Doous', page.w.sceneConfig);

        let added = 0;
        const head = shell.Na__DrawShell__BuildPanelHead({ title : 'Elevations', addTitle : 'Add an elevation', onAdd : () => { added++; } });
        const plus = head.querySelector('.na-pm-dev__square-btn');
        plus.click();
        check('panel head: the title and a square + that adds', head.classList.contains('na-pm-dev__panel-head') && head.classList.contains('na-draw-dev__panel-head') && plus.textContent === '+' && added === 1 && plus.getAttribute('aria-label') === 'Add an elevation');
        const off = shell.Na__DrawShell__BuildPanelHead({ title : 'Cross Sections', addDisabled : true });
        check('panel head: the + can be off', off.querySelector('.na-pm-dev__square-btn').disabled === true);

        const chips = shell.Na__DrawShell__BuildHeaderChips();
        chips.set({ kind : 'SECTION', isActive : true, isDirty : true });
        const shown = chips.element.children.filter((c) => !c.hidden).map((c) => c.textContent);
        chips.set({});
        check('header chips: SECTION / ON SCREEN / NOT UPDATED shown on demand, all hidden by default',
              JSON.stringify(shown) === JSON.stringify([ 'SECTION', 'ON SCREEN', 'NOT UPDATED' ]) && chips.element.children.every((c) => c.hidden), shown);
        check('header chips: NOT UPDATED carries the dirty class', chips.element.children[2].classList.contains('na-draw-dev__chip--dirty'));

        const calls = [];
        const actions = shell.Na__DrawShell__BuildCommitActions({ isActive : false, drawingWord : 'elevation', onUpdate : () => calls.push('update'), onRevert : () => calls.push('revert') });
        const [ preview, annotate, update, revert ] = actions.element.children;
        check('actions: Preview, Annotate, then the green Update and Revert, in a grid', actions.element.classList.contains('na-draw-dev__actions')
              && preview.textContent === 'Preview' && annotate.textContent === 'Annotate' && update.textContent === 'Update' && revert.textContent === 'Revert'
              && update.classList.contains('na-draw-dev__btn--commit'));
        check('actions: nothing to keep - Update and Revert off, Annotate off until it is on screen', update.disabled && revert.disabled && annotate.disabled);
        actions.refresh({ isDirty : true });
        check('actions: a change turns Update and Revert on', !update.disabled && !revert.disabled && /Asks first; writes R2 and the local copy/.test(update.title));
        update.click(); revert.click();
        actions.refresh({ isDirty : true, isBusy : true });
        check('actions: busy reads Updating... and holds both buttons', update.disabled && revert.disabled && update.textContent === 'Updating...' && JSON.stringify(calls) === JSON.stringify([ 'update', 'revert' ]));

        const zone = shell.Na__DrawShell__BuildDangerZone({ label : 'Delete Elevation' });
        check('danger zone: a rule, then Delete alone and red', zone.children[0].tagName === 'HR' && zone.children[0].classList.contains('na-pm-dev__rule')
              && zone.children[1].children.length === 1 && zone.children[1].children[0].classList.contains('na-pm-dev__btn--danger'));

        const first = shell.Na__DrawShell__BuildAdvanced('Elevation_002', 'Advanced');
        first.element.children[0].click();
        const rebuilt = shell.Na__DrawShell__BuildAdvanced('Elevation_002', 'Advanced');
        const other = shell.Na__DrawShell__BuildAdvanced('Elevation_003', 'Advanced');
        check('Advanced: opened once, it stays open across a rebuild - for that drawing only',
              rebuilt.body.classList.contains('is-open') && rebuilt.element.children[0].getAttribute('aria-expanded') === 'true' && !other.body.classList.contains('is-open'));

        const usage = shell.Na__DrawShell__UsageFor('Elevation_002', 'Scene_008');
        check('UsageFor reads the loaded project\'s sheets: Doous\'s elevation is drawn by one viewport on "Elevations Test"',
              usage.viewports === 1 && usage.sheets.length === 1 && usage.sheets[0].label === 'Elevations Test' && usage.sheets[0].count === 1, usage);
        check('UsageFor: a drawing nothing uses reads as nothing', shell.Na__DrawShell__UsageFor('Elevation_999', null).viewports === 0);

        const where = [
            shell.Na__DrawShell__WhereSaved({ local : { ok : true } }),
            shell.Na__DrawShell__WhereSaved({ local : { ok : false, skipped : true } }),
            shell.Na__DrawShell__WhereSaved({}),
            shell.Na__DrawShell__WhereSaved({ local : { ok : false, error : 'Local server unavailable' } })
        ];
        check('WhereSaved: R2 and the local file / R2 / R2 / R2 but NOT the local file, as an error',
              where[0].text === 'Saved to R2 and the local project file.' && !where[0].isError && where[1].text === 'Saved to R2.' && where[2].text === 'Saved to R2.'
              && where[3].isError && where[3].text === 'Saved to R2, but the local project file was NOT written: Local server unavailable.', where);

        let pending = shell.Na__DrawShell__ConfirmUpdate({ word : 'elevation', name : 'TEST ELEVATION', changes : [ 'Plane moved 300 mm' ], usage, movesDrawing : true, willCapture : false });
        let parts = ModalParts();
        let confirm = parts.card.querySelector('.na-pm-modal__btn--confirm');
        check('Update dialog: the changes, then the thumbnail line, as a list', parts.card.querySelector('.na-pm-modal__details').children.map((li) => li.textContent).join('|')
              === 'Plane moved 300 mm|Thumbnail: left as it is. Preview the elevation first if its card should change.');
        check('Update dialog: the footnote names the sheet and warns that it will be redrawn', /^1 viewport on Elevations Test is drawn from this elevation\. They will be redrawn/.test(parts.card.querySelector('.na-pm-modal__message--footnote').textContent));
        check('Update dialog: red when it moves a drawing sheets draw from', confirm.classList.contains('na-pm-modal__btn--danger') && !confirm.classList.contains('na-pm-modal__btn--commit'));
        confirm.click();
        check('Update dialog: Update answers true', (await pending) === true);

        pending = shell.Na__DrawShell__ConfirmUpdate({ word : 'elevation', name : 'TEST ELEVATION', changes : [], usage, movesDrawing : false, willCapture : true });
        parts = ModalParts();
        confirm = parts.card.querySelector('.na-pm-modal__btn--confirm');
        check('Update dialog: green (the commit button) when nothing that positions it changed, and the capture line',
              confirm.classList.contains('na-pm-modal__btn--commit') && !confirm.classList.contains('na-pm-modal__btn--danger')
              && /stay lined up\.$/.test(parts.card.querySelector('.na-pm-modal__message--footnote').textContent)
              && parts.card.querySelector('.na-pm-modal__details').children[0].textContent === 'Framing and thumbnail: recaptured from the preview on screen.');
        parts.card.querySelector('.na-pm-modal__btn--cancel').click();
        check('Update dialog: Cancel answers false', (await pending) === false);

        pending = shell.Na__DrawShell__ConfirmDelete({ word : 'elevation', name : 'TEST ELEVATION', usage });
        parts = ModalParts();
        confirm = parts.card.querySelector('.na-pm-modal__btn--confirm');
        check('Delete dialog: red "Delete Elevation", the viewports that will have nothing left to draw',
              confirm.textContent === 'Delete Elevation' && confirm.classList.contains('na-pm-modal__btn--danger')
              && /Each of those viewports will have nothing left to draw\.$/.test(parts.card.querySelector('.na-pm-modal__message--footnote').textContent));
        confirm.click();
        check('Delete dialog: Delete answers true', (await pending) === true);

        check('the export list is TrueVision\'s 12 names', JSON.stringify(ExportNames(REL.shell)) === JSON.stringify(TvExportNames(REL.shell)) && ExportNames(REL.shell).length === 12, ExportNames(REL.shell));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | D - Draft Guard with the real drawings save
// -----------------------------------------------------------------------------

    function ElevationsOf(doc) { return doc.LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__Elevations; }

    async function SectionD() {
        const page = NewPage();
        const tree  = EditorTree();
        const data  = await Import(tree, REL.data);
        const fold  = await Import(tree, REL.fold);
        const guard = await Import(tree, REL.guard);                       // <-- Registers the payload guard and the change guard as it loads
        const announced = [];
        page.win.addEventListener(guard.Na__DrawDraft__CHANGED_EVENT, (event) => announced.push(event.detail.reason + ':' + (event.detail.id || '')));
        check('the draft event is TrueVision\'s name', guard.Na__DrawDraft__CHANGED_EVENT === 'na-drawview-draft-changed');

        // The project: Doous's block, with a second elevation so "every other drawing" means something
        const block = clone(DOOUS.LayoutEditor__DrawingsData);
        const second = clone(block.LayoutEditor__DrawingsData__Elevations[0]);
        second.Elevation__Id = 'Elevation_003'; second.Elevation__Name = 'Second Elevation'; second.Elevation__SceneId = null;
        block.LayoutEditor__DrawingsData__Elevations.push(second);
        page.w.sceneConfig = clone(DOOUS.PresentationMode__SavedCameraScenes || {});
        fold.Na__DrawFold__SetOpenId('Elevation_002');                      // <-- A row left open by the last project...
        data.Na__DrawData__Load(block, '2026/3047__Doous', page.w.sceneConfig);
        check('a project load folds the accordion (no draft of the last project survives)', fold.Na__DrawFold__GetOpenId() === null && guard.Na__DrawDraft__GetActive() === null);

        // An owner registered while a row is already open gets its draft at once
        fold.Na__DrawFold__SetOpenId('Elevation_002');
        check('with no owner, opening a row begins nothing', guard.Na__DrawDraft__GetActive() === null);
        const reverted = [];
        const owner = {
            word : 'elevation', idKey : 'Elevation__Id', nameKey : 'Elevation__Name',
            arrayPath : [ 'LayoutEditor__DrawingsData', 'LayoutEditor__DrawingsData__Elevations' ],
            viewKeys : [ 'Elevation__CameraZoom', 'Elevation__CameraTargetMm' ],
            find : (id) => data.Na__DrawData__GetElevationsArray().find((e) => e.Elevation__Id === id) || null,
            describe : (before, record, keys) => keys.map((key) => key === 'Elevation__PlaneOriginMm'
                ? 'Plane moved ' + (record.Elevation__PlaneOriginMm.PosX - before.Elevation__PlaneOriginMm.PosX) + ' mm' : key),
            afterRevert : (record, touched) => reverted.push(touched.slice())
        };
        check('RegisterOwner takes an owner with find', guard.Na__DrawDraft__RegisterOwner('elevation', owner) === true && guard.Na__DrawDraft__RegisterOwner('x', {}) === false);
        const live = data.Na__DrawData__GetElevationsArray()[0];
        const active = guard.Na__DrawDraft__GetActive();
        check('...and the row already open becomes the draft', !!active && active.id === 'Elevation_002' && active.record === live && guard.Na__DrawDraft__IsActive('elevation', 'Elevation_002'));
        check('an opened draft is clean', guard.Na__DrawDraft__IsDirty() === false && guard.Na__DrawDraft__ActiveName() === 'TEST ELEVATION');

        // Looking is not editing
        live.Elevation__CameraZoom = (live.Elevation__CameraZoom || 1) + 3;
        check('a zoom written by the preview is not a change', guard.Na__DrawDraft__IsDirty() === false);

        // A stray nudge, then SOMEBODY ELSE saves (Save Sheets, north, the register...)
        const savedX = live.Elevation__PlaneOriginMm.PosX;
        live.Elevation__PlaneOriginMm = { PosX : savedX + 900, PosZ : live.Elevation__PlaneOriginMm.PosZ };
        check('a moved plane is a change, in the owner\'s words', guard.Na__DrawDraft__IsDirty() === true
              && JSON.stringify(guard.Na__DrawDraft__ChangedKeys()) === JSON.stringify([ 'Elevation__PlaneOriginMm' ])
              && JSON.stringify(guard.Na__DrawDraft__Describe()) === JSON.stringify([ 'Plane moved 900 mm' ])
              && guard.Na__DrawDraft__GetBaseline().Elevation__PlaneOriginMm.PosX === savedX);
        const mark = kept.length;
        const report = {};
        const ok = await data.Na__DrawData__Save(null, report);
        const cloud = page.w.cloud[page.w.cloud.length - 1];
        const local = page.w.local[page.w.local.length - 1];
        const cloudElev = ElevationsOf(cloud.partial);
        check('another panel\'s save lands', ok === true && report.cloudSaved === true && !!report.local && report.local.ok === true);
        check('R2 gets the plane where it was last updated', cloudElev[0].Elevation__PlaneOriginMm.PosX === savedX, cloudElev[0].Elevation__PlaneOriginMm);
        check('...and so does the local copy', ElevationsOf(local.keys)[0].Elevation__PlaneOriginMm.PosX === savedX);
        check('the other elevation and the sheets go out untouched', JSON.stringify(cloudElev[1]) === JSON.stringify(Object.assign(clone(second)))
              && JSON.stringify(cloud.partial.LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__Sheets) === JSON.stringify(block.LayoutEditor__DrawingsData__Sheets));
        check('the live record still holds the draft, and it is still dirty', live.Elevation__PlaneOriginMm.PosX === savedX + 900 && guard.Na__DrawDraft__IsDirty() === true);
        check('the save says so in the console, with this app\'s prefix', KeptSince(mark).some(([ level, text ]) => level === 'log'
              && text === '[ValeVision3D] "TEST ELEVATION" has changes that have not been updated - this save wrote it as it was last updated.'), KeptSince(mark));

        // Its own Update
        const before = page.w.cloud.length;
        const kept1 = await guard.Na__DrawDraft__SaveActive(null, {});
        const own = ElevationsOf(page.w.cloud[before].partial)[0];
        check('SaveActive writes the draft as it stands (the guard stands aside)', kept1 === true && own.Elevation__PlaneOriginMm.PosX === savedX + 900);
        check('...and the draft is kept: clean, its baseline the new position', guard.Na__DrawDraft__IsDirty() === false && guard.Na__DrawDraft__GetBaseline().Elevation__PlaneOriginMm.PosX === savedX + 900);
        const mark2 = kept.length;
        await guard.Na__DrawDraft__SaveBlock(null, {});
        check('a clean draft is not swapped: the next save writes it as it is, with no console line',
              ElevationsOf(page.w.cloud[page.w.cloud.length - 1].partial)[0].Elevation__PlaneOriginMm.PosX === savedX + 900
              && !KeptSince(mark2).some(([ , text ]) => /has changes that have not been updated/.test(text)));

        // A failed Update leaves it changed
        live.Elevation__PlaneOriginMm = { PosX : savedX + 1000, PosZ : live.Elevation__PlaneOriginMm.PosZ };
        page.w.cloudAnswer = { ok : false, error : 'planted' };
        const failed = await guard.Na__DrawDraft__SaveActive(null, {});
        page.w.cloudAnswer = null;
        check('a failed Update returns false and leaves the draft changed', failed === false && guard.Na__DrawDraft__IsDirty() === true);

        // Leaving a changed row asks - through the accordion and the modal
        const rows = {};
        for (const id of [ 'Elevation_002', 'Elevation_003' ]) {
            const card = globalThis.document.createElement('div');
            globalThis.document.body.appendChild(card);
            rows[id] = fold.Na__DrawFold__Wrap(card, { id, title : id });
        }
        const held = live;
        const heldArray = live.Elevation__Annotations;
        rows.Elevation_003.head.click();
        await tick(1);
        let parts = ModalParts();
        check('a header click on another row asks first', parts.open && parts.card.querySelector('h3').textContent === 'Discard the changes to "TEST ELEVATION"?'
              && parts.card.querySelector('.na-pm-modal__details').children[0].textContent === 'Plane moved 100 mm');
        const keepBtn = parts.card.querySelector('.na-pm-modal__btn--cancel');
        const discardBtn = parts.card.querySelector('.na-pm-modal__btn--confirm');
        check('...with Keep Editing and a red Discard Changes', keepBtn.textContent === 'Keep Editing' && discardBtn.textContent === 'Discard Changes' && discardBtn.classList.contains('na-pm-modal__btn--danger'));
        keepBtn.click();
        await tick(1);
        check('Keep Editing: the row stays open and the change stays', fold.Na__DrawFold__GetOpenId() === 'Elevation_002' && guard.Na__DrawDraft__IsDirty() === true);
        rows.Elevation_003.head.click();
        await tick(1);
        ModalParts().card.querySelector('.na-pm-modal__btn--confirm').click();
        await tick(5);
        check('Discard Changes: the record is put back in the SAME object, its arrays the same arrays', held === data.Na__DrawData__GetElevationsArray()[0]
              && held.Elevation__PlaneOriginMm.PosX === savedX + 900 && held.Elevation__Annotations === heldArray);
        check('...the owner re-derives what it touched', JSON.stringify(reverted) === JSON.stringify([ [ 'Elevation__PlaneOriginMm' ] ]), reverted);
        check('...then the slot moves and the next row is the draft', fold.Na__DrawFold__GetOpenId() === 'Elevation_003' && guard.Na__DrawDraft__GetActive().id === 'Elevation_003');
        check('ConfirmLeave with nothing changed answers true without asking', (await guard.Na__DrawDraft__ConfirmLeave()) === true && !ModalParts().open);

        // A new project ends it
        data.Na__DrawData__Load(clone(DOOUS.LayoutEditor__DrawingsData), '2026/3047__Doous', page.w.sceneConfig);
        check('a project load ends the draft and folds the rows', guard.Na__DrawDraft__GetActive() === null && fold.Na__DrawFold__GetOpenId() === null);
        check('the announcements: begin, commit, revert, end, begin, end', JSON.stringify(announced) === JSON.stringify(
            [ 'begin:Elevation_002', 'commit:Elevation_002', 'revert:Elevation_002', 'end:Elevation_002', 'begin:Elevation_003', 'end:Elevation_003' ]), announced);

        check('the export list is TrueVision\'s 15 names', JSON.stringify(ExportNames(REL.guard)) === JSON.stringify(TvExportNames(REL.guard)) && ExportNames(REL.guard).length === 15, ExportNames(REL.guard));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | E - Rename Drawing on the loader route
// -----------------------------------------------------------------------------

    async function SectionE() {
        const page = NewPage();
        const tree = MakeTree({
            [REL.rename]   : { file : OURS(REL.rename) },
            [REL.data]     : { source : STUB.renameData },
            [REL.scenes]   : { source : STUB.scenes },
            [REL.fpdata]   : { source : STUB.fpdata },
            [REL.elevdata] : { source : STUB.elevdata },
            [REL.sect]     : { source : STUB.sect },
            [REL.leload]   : { source : STUB.leload }
        });
        const rename = await Import(tree, REL.rename);
        const w = page.w;
        const elev  = { Elevation__Id : 'Elevation_002', Elevation__Name : 'TEST ELEVATION' };
        const plan  = { FloorPlan__Id : 'FloorPlan_001', FloorPlan__Name : 'Ground Floor' };
        const lone  = { Elevation__Id : 'Elevation_007', Elevation__Name : 'No Card' };
        const eScene = { PresentationMode__Scene__Id : 'Scene_008', PresentationMode__Scene__Name : 'TEST ELEVATION', PresentationMode__Scene__ElevationId : 'Elevation_002' };
        const pScene = { PresentationMode__Scene__Id : 'Scene_011', PresentationMode__Scene__Name : 'Ground Floor', PresentationMode__Scene__FloorPlanId : 'FloorPlan_001' };
        w.sceneConfig = { scenes : [ eScene, pScene ] };
        w.elevations = [ elev, lone ]; w.plans = [ plan ];
        let watch = null;
        w.probe = () => watch ? { record : watch.record[watch.key], scene : watch.scene ? watch.scene.PresentationMode__Scene__Name : null } : null;
        const toasts = [];
        const toast = (message, isError) => toasts.push([ message, isError === true ]);

        // Apply
        watch = { record : elev, key : 'Elevation__Name', scene : eScene };
        w.events = [];
        const renamed = await rename.Na__DrawRename__RenameElevation(elev, 'North Elevation', toast);
        const order = w.events.map((e) => e[0]);
        check('a rename prepares the stamper first, then binding, re-stamp and one save', renamed === true
              && JSON.stringify(order) === JSON.stringify([ 'prepare:start', 'prepare:end', 'binding', 'restamp', 'save' ]), w.events);
        check('...nothing is written while the stamper loads', JSON.stringify(w.events[0][2]) === JSON.stringify({ record : 'TEST ELEVATION', scene : 'TEST ELEVATION' })
              && JSON.stringify(w.events[1][2]) === JSON.stringify({ record : 'TEST ELEVATION', scene : 'TEST ELEVATION' }));
        check('...the binding moves with the OLD name in hand, the re-stamp sees the NEW one', w.events[2][1] === 'TEST ELEVATION' && w.events[2][2] === 'North Elevation' && w.events[2][3] === 'Scene_008'
              && JSON.stringify(w.events[3][2]) === JSON.stringify({ record : 'North Elevation', scene : 'North Elevation' }));
        check('...the card is broadcast and the confirmation names every holder', w.broadcasts === 1
              && JSON.stringify(toasts[toasts.length - 1]) === JSON.stringify([ 'Renamed to "North Elevation", saved to R2 with its scene card, 2 sheet viewports and its section binding.', false ]), toasts);

        // A failed save puts everything back
        w.events = []; w.saveAnswer = false;
        const failed = await rename.Na__DrawRename__RenameElevation(elev, 'South Elevation', toast);
        w.saveAnswer = undefined;
        check('a failed save reverts every holder', failed === false && elev.Elevation__Name === 'North Elevation' && eScene.PresentationMode__Scene__Name === 'North Elevation'
              && JSON.stringify(w.events.map((e) => e[0])) === JSON.stringify([ 'prepare:start', 'prepare:end', 'binding', 'restamp', 'save', 'binding', 'restamp' ])
              && w.events[5][1] === 'South Elevation' && w.events[5][2] === 'North Elevation', w.events);
        check('...and says so', toasts.slice(-2).map((t) => t[0]).join(' / ') === 'Drawings save failed: test / Rename failed. "North Elevation" is unchanged.', toasts.slice(-2));

        // No card: nothing to prepare or re-stamp
        watch = { record : lone, key : 'Elevation__Name', scene : null };
        w.events = [];
        await rename.Na__DrawRename__RenameElevation(lone, 'Lone Elevation', toast);
        check('a drawing with no card loads nothing and re-stamps nothing', JSON.stringify(w.events.map((e) => e[0])) === JSON.stringify([ 'save' ])
              && toasts[toasts.length - 1][0] === 'Renamed to "Lone Elevation" and saved to R2.', w.events);

        // Busy
        w.events = [];
        watch = { record : plan, key : 'FloorPlan__Name', scene : pScene };
        const firstRename = rename.Na__DrawRename__RenameFloorPlan(plan, 'Ground Floor Plan', toast);
        const busy = await rename.Na__DrawRename__RenameFloorPlan(plan, 'Other', toast);
        await firstRename;
        check('one rename at a time', busy === false && toasts.some((t) => t[0] === 'A rename is still saving. Try again in a moment.' && t[1] === true) && plan.FloorPlan__Name === 'Ground Floor Plan');

        // STAGE | the Update flow: the record already carries the new name, nothing is saved here
        elev.Elevation__Name = 'East Elevation';
        watch = { record : elev, key : 'Elevation__Name', scene : eScene };
        w.events = [];
        const staged = await rename.Na__DrawRename__StageElevation(elev);
        check('StageElevation: the stamper first, then the card, the binding (old name in hand) and the re-stamp - and no save',
              JSON.stringify(w.events.map((e) => e[0])) === JSON.stringify([ 'prepare:start', 'prepare:end', 'binding', 'restamp' ])
              && JSON.stringify(w.events[1][2]) === JSON.stringify({ record : 'East Elevation', scene : 'North Elevation' })
              && w.events[2][1] === 'North Elevation' && w.events[2][2] === 'East Elevation'
              && JSON.stringify(w.events[3][2]) === JSON.stringify({ record : 'East Elevation', scene : 'East Elevation' }), w.events);
        check('StageElevation: says what it did', staged.renamed === true && staged.restamped === 2 && staged.movedBinding === true && typeof staged.undo === 'function');
        w.events = [];
        staged.undo();
        check('...and its undo puts the card and binding back and re-stamps', eScene.PresentationMode__Scene__Name === 'North Elevation'
              && JSON.stringify(w.events.map((e) => e[0])) === JSON.stringify([ 'binding', 'restamp' ]) && w.events[0][1] === 'East Elevation' && w.events[0][2] === 'North Elevation', w.events);

        plan.FloorPlan__Name = 'Ground Floor GA';
        watch = { record : plan, key : 'FloorPlan__Name', scene : pScene };
        w.events = [];
        w.restampCount = 0; w.bindingAnswer = false;
        const stagedPlan = await rename.Na__DrawRename__StageFloorPlan(plan);
        w.restampCount = undefined; w.bindingAnswer = undefined;
        check('StageFloorPlan: finds the plan\'s card, renames it; counts what moved', stagedPlan.renamed === true && pScene.PresentationMode__Scene__Name === 'Ground Floor GA'
              && stagedPlan.restamped === 0 && stagedPlan.movedBinding === false);
        w.events = [];
        stagedPlan.undo();
        check('...its undo leaves alone what did not move', pScene.PresentationMode__Scene__Name === 'Ground Floor Plan' && w.events.length === 0, w.events);

        w.events = [];
        const same = await rename.Na__DrawRename__StageElevation(Object.assign(elev, { Elevation__Name : 'North Elevation' }));
        const blank = await rename.Na__DrawRename__StageElevation(Object.assign({}, elev, { Elevation__Name : '  ' }));
        const noCard = await rename.Na__DrawRename__StageElevation(lone);
        const nothing = await rename.Na__DrawRename__StageElevation(null);
        check('nothing to stage (same name, blank name, no card, no record) loads and changes nothing',
              [ same, blank, noCard, nothing ].every((r) => r.renamed === false && r.restamped === 0 && r.movedBinding === false) && w.events.length === 0, w.events);

        const tvNames = TvExportNames(REL.rename);
        check('the export list is TrueVision 1.1.0\'s 8 names', JSON.stringify(ExportNames(REL.rename)) === JSON.stringify(tvNames) && tvNames.length === 8, ExportNames(REL.rename));
        const code = readFileSync(OURS(REL.rename), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');
        check('no Viewport3d import, no TrueVision 41 path, no dynamic import: the loader route only',
              !/Viewport3d__\.js/.test(code) && !/SectionCutEngine/.test(code) && !/import\(/.test(code)
              && /from '\.\.\/51__System__LayoutEditor\/01__Core__Loader\/Na__LayoutEditor__Loader__\.js'/.test(code)
              && /from '\.\.\/41__System__CrossSectionView\/Na__CrossSectionView__SceneData\.js'/.test(code));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | F - The Stylesheets
// -----------------------------------------------------------------------------

    function CssRules(text) {
        const code = text.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
        const rules = [];
        let depth = 0, start = 0, selector = '';
        for (let i = 0; i < code.length; i++) {
            const ch = code[i];
            if (ch === '{') { if (depth === 0) { selector = code.slice(start, i).trim().replace(/\s+/g, ' '); start = i + 1; } depth++; }
            else if (ch === '}') {
                depth--;
                if (depth === 0) {
                    const body = code.slice(start, i).split(';').map((d) => d.trim().replace(/\s*:\s*/, ':').replace(/\s+/g, ' ')).filter(Boolean).join(';');
                    rules.push(selector + ' {' + body + '}');
                    start = i + 1;
                }
            }
        }
        return rules;
    }
    function Region(text, title) {
        const norm = text.replace(/\r\n/g, '\n');
        const at = norm.indexOf('REGION | ' + title);
        const end = norm.indexOf('/* endregion', at);
        return norm.slice(at, end);
    }
    function Imports(text) {
        return Array.from(text.replace(/\/\*[\s\S]*?\*\//g, ' ').matchAll(/@import\s+url\(\s*'([^']+)'\s*\)/g)).map((m) => m[1]);
    }

    async function SectionF() {
        const dv = readFileSync(OURS(REL.dvcss), 'utf8');
        const dvTv = readFileSync(join(TVDIR, REL.dvcss), 'utf8');
        check('DrawView Dev sheet: every rule is TrueVision\'s, in TrueVision\'s order (' + CssRules(dvTv).length + ' rules)', JSON.stringify(CssRules(dv)) === JSON.stringify(CssRules(dvTv)));
        check('...with the Drawing Panel Shell: the green commit button and the disabled-button override', CssRules(dv).includes('.na-draw-dev__btn--commit {border-color:#2e7d4f;color:#ffffff;background:#2e7d4f;font-weight:600}')
              && CssRules(dv).includes('.na-pm-dev__btn:disabled {opacity:0.45;cursor:not-allowed}'));
        check('...and the banner is this app\'s stylesheet form', /^\/\* REGION  \|  ValeVision3D - Drawing View Core Dev Menu Styles/m.test(dv) && !/TrueVision3D - Drawing View Core/.test(dv));

        const car = readFileSync(OURS(REL.carousel), 'utf8');
        const carTv = readFileSync(join(TVDIR, REL.carousel), 'utf8');
        const carOld = readFileSync(OLD(REL.carousel));
        check('the OLD SceneCarousel sheet read is ValeVision\'s pre-port file', Sha1(carOld) === OLD_SHA1[REL.carousel], Sha1(carOld));
        const modalHere = CssRules(Region(car, 'Dev Menu Modal'));
        const modalTv = CssRules(Region(carTv, 'Dev Menu Modal'));
        check('SceneCarousel: the Dev menu modal region\'s rules equal TrueVision\'s (' + modalTv.length + ' rules)', JSON.stringify(modalHere) === JSON.stringify(modalTv),
              { onlyHere : modalHere.filter((r) => !modalTv.includes(r)), onlyTv : modalTv.filter((r) => !modalHere.includes(r)) });
        const oldRules = CssRules(carOld.toString('utf8'));
        const newRules = CssRules(car);
        const addedRules = newRules.filter((r) => !oldRules.includes(r));
        check('SceneCarousel: exactly five rules added - details, its list spacing, footnote, commit, commit hover - nothing else touched',
              addedRules.length === 5 && JSON.stringify(newRules.filter((r) => !addedRules.includes(r))) === JSON.stringify(oldRules), addedRules.map((r) => r.split(' {')[0]));
        const carBytes = readFileSync(OURS(REL.carousel));
        check('SceneCarousel: CRLF throughout, as before', carBytes.includes(Buffer.from('\r\n')) && !/[^\r]\n/.test(carBytes.toString('latin1')));

        const idx = readFileSync(OURS(REL.index), 'utf8');
        const idxOld = readFileSync(OLD(REL.index));
        const idxTv = readFileSync(join(TVDIR, REL.index), 'utf8');
        check('the OLD CSS index read is ValeVision\'s pre-port file', Sha1(idxOld) === OLD_SHA1[REL.index], Sha1(idxOld));
        const here = Imports(idx), before = Imports(idxOld.toString('utf8')), tv = Imports(idxTv);
        const dvPath = '../02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__Styles__DevMenu__.css';
        check('CSS index: the same imports, one moved', here.length === before.length && JSON.stringify([ ...here ].sort()) === JSON.stringify([ ...before ].sort())
              && JSON.stringify(here.filter((p) => p !== dvPath)) === JSON.stringify(before.filter((p) => p !== dvPath)));
        check('CSS index: the DrawView Dev sheet now comes after Plan Dimensions and before Projected Linework',
              here.indexOf(dvPath) === here.indexOf('../02__Src__AppModules/44__System__PlanDimensions/Na__PlanDimensions__Styles__.css') + 1
              && here.indexOf(dvPath) + 1 === here.indexOf('../02__Src__AppModules/50__System__ProjectedLinework/Na__ProjectedLinework__Styles__Main__.css'));
        const drawing = (p) => /\/(4[0-9]|50)__System__/.test(p);
        const tvOrder = tv.filter(drawing).filter((p) => here.includes(p));
        const vvOrder = here.filter(drawing);
        check('CSS index: the drawing sheets this app has run in TrueVision\'s relative order (' + vvOrder.length + ')', JSON.stringify(vvOrder) === JSON.stringify(tvOrder), { vvOrder, tvOrder });
        check('CSS index: before this package it did not (the DrawView sheet was first)', JSON.stringify(before.filter(drawing)) !== JSON.stringify(tvOrder));
        const idxBytes = readFileSync(OURS(REL.index));
        check('CSS index: CRLF throughout, as before', idxBytes.includes(Buffer.from('\r\n')) && !/[^\r]\n/.test(idxBytes.toString('latin1')));
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | G - The Ported Test
// -----------------------------------------------------------------------------

    function RunPortedTest(label, options) {
        const root = join(SCRATCH, 'ported-' + label);
        const app  = join(root, 'WebApps', 'ValeVision3D');
        const put  = (rel, from, transform) => {
            const path = join(app, rel);
            mkdirSync(dirname(path), { recursive : true });
            const text = readFileSync(from, 'utf8');
            writeFileSync(path, transform ? transform(text) : text);
        };
        put(REL.maths, OURS(REL.maths), options.mathsMutant);
        put(REL.usage, OURS(REL.usage), options.usageMutant);
        put(REL.autoname, options.autoNameFile);
        put(REL.test, OURS(REL.test));
        if (options.withDoous) {
            const doous = join(root, 'WebApps', 'Whitecardopedia', 'Projects', '2026', '3047__Doous', 'project.json');
            mkdirSync(dirname(doous), { recursive : true });
            copyFileSync(DOOUS_FILE, doous);
        }
        const run = spawnSync(process.execPath, [ join(app, REL.test) ], { encoding : 'utf8', cwd : app });
        const out = (run.stdout || '') + (run.stderr || '');
        return { code : run.status, out, passes : (out.match(/^  PASS  /mg) || []).length, fails : (out.match(/^  FAIL  /mg) || []).length };
    }

    async function SectionG() {
        const liveAutoName = join(APP, REL.autoname);
        const standIn = existsSync(liveAutoName) ? liveAutoName : join(TVDIR, REL.autoname);
        realLog('  (AutoNameText: ' + (existsSync(liveAutoName) ? 'the live ValeVision file, W1-10 has landed it' : 'TrueVision\'s file at b2aa9151 standing in for W1-10\'s verbatim port') + ')');

        const disk = RunPortedTest('disk', { withDoous : true, autoNameFile : standIn });
        check('with Doous on disk: every check passes (' + disk.passes + ')', disk.code === 0 && disk.fails === 0 && disk.passes > 40 && /fixture : 2026\/3047__Doous project data on disk/.test(disk.out) && /ALL CHECKS PASSED/.test(disk.out), disk.out.slice(-1500));
        check('...titled for this app', /^ValeVision3D - drawing drafts, drawing usage, elevation auto names$/m.test(disk.out));
        check('...the usage check counted Doous\'s one viewport', /PASS  "TEST ELEVATION" is drawn by 1 viewport\(s\)/.test(disk.out));
        const built = RunPortedTest('built', { withDoous : false, autoNameFile : standIn });
        check('without it: TrueVision\'s hand-built fixture stands in, every check passes (' + built.passes + ')', built.code === 0 && built.fails === 0 && built.passes === disk.passes && /built by hand \(2026\/3047__Doous file not found\)/.test(built.out), built.out.slice(-1500));
        check('...and it read nothing of TrueVision\'s project portal', !/PS01 project data on disk/.test(built.out + disk.out));

        const mutants = [
            [ 'restore replaces arrays instead of refilling them', { mathsMutant : (t) => t.replace(/record\[key\]\.length = 0;[^\n]*\n\s*before\[key\]\.forEach\(\(entry\) => record\[key\]\.push\(entry\)\);/, 'record[key] = before[key];') } ],
            [ 'view keys are compared after all', { mathsMutant : (t) => t.replace('if (ignore.has(key)) return;', '') } ],
            [ 'a 3D viewport counts as a use', { usageMutant : (t) => t.replace('viewport[Na__DrawUsage__VIEW_KIND] !== Na__DrawUsage__KIND_2D', 'false') } ],
            [ 'the sheet label loses its short code', { usageMutant : (t) => t.replace("if (code && name) return code + ' - ' + name;", 'if (code && name) return name;') } ]
        ];
        mutants.forEach(([ name, change ], index) => {
            const options = Object.assign({ withDoous : true, autoNameFile : standIn }, change);
            const probeText = (change.mathsMutant ? change.mathsMutant(readFileSync(OURS(REL.maths), 'utf8')) !== readFileSync(OURS(REL.maths), 'utf8') : true)
                           && (change.usageMutant ? change.usageMutant(readFileSync(OURS(REL.usage), 'utf8')) !== readFileSync(OURS(REL.usage), 'utf8') : true);
            const run = RunPortedTest('mutant-' + (index + 1), options);
            check('planted fault caught: ' + name, probeText && run.code === 1 && run.fails > 0, { planted : probeText, code : run.code, fails : run.fails });
        });
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Run
// -----------------------------------------------------------------------------

    realLog('W1-06 check - ' + (LIVE ? 'the LIVE files' : 'the candidates') + '; ProjectData = the live W1-05 file; temp ' + SCRATCH);
    await RunSection('A. Row accordion', SectionA);
    await RunSection('B. Modal 1.2.0', SectionB);
    await RunSection('C. Dev row shell (real ProjectData, Doous\'s block)', SectionC);
    await RunSection('D. Draft guard and the real drawings save', SectionD);
    await RunSection('E. Rename drawing on the loader route', SectionE);
    await RunSection('F. Stylesheets', SectionF);
    await RunSection('G. The ported test (and planted faults)', SectionG);

    check('the real Doous project.json was not changed', Sha1(readFileSync(DOOUS_FILE)) === DOOUS_SHA1);
    const leftover = kept.filter(([ , text ]) => text.startsWith('[TrueVision3D'));
    check('no module printed a [TrueVision3D console prefix', leftover.length === 0, leftover);

    try { rmSync(SCRATCH, { recursive : true, force : true }); } catch (error) { /* Windows may hold a file a moment */ }
    realLog('\n' + (failures === 0 ? 'ALL ' + passes + ' CHECKS PASSED' : failures + ' CHECK(S) FAILED, ' + passes + ' passed'));
    process.exit(failures === 0 ? 0 : 1);

// endregion -------------------------------------------------------------------
