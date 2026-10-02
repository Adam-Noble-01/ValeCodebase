// =============================================================================
// W1-07 scratch harness - AutoSave 1.5.0 on ValeVision's real module graph, two browser windows over one project
// =============================================================================
//
//   node harness_w1_07.mjs --root <ValeVision app root> [--autosave <file>] [--old <AutoSave 1.3.1 pre-image>]
//                          [--out <results.json>]
//
// WHAT IT PROVES (package W1-07, acceptance items 2 and 3):
//   P  A draft written by this app's OLD AutoSave (1.3.1: { savedAt, sheets }, no base) is asked about once on the
//      first load with 1.5.0; nothing writes the draft while the question is open; Decide Later keeps it; Discard
//      removes it and leaves the saved sheets, writing nothing anywhere; the next load asks nothing.
//   T  Two windows on 2026/3047__Doous: A saves; B's save is refused BEFORE R2 is written (no merge-keys request,
//      the file on disk untouched, the red toast); B's draft stays; on B's reload the draft is offered (Apply Draft,
//      Discard Draft, Decide Later) and Apply then Save Sheets lands on the drawings as they now are.
//   F  The unsaved-work flag (window.Na__Pwa__HasUnsavedWork) follows the real model in both windows.
//
// HOW. Every window is a child process (this file with --child) with its own module graph, its own window and its
// own localStorage: the REAL ValeVision modules at their browser URLs - the project loader, the transport facade
// (Na__CfApi, Na__LocalMirror), the presentation scene data, the drawings data (TrueVision ProjectData 1.6.0), the
// config over the real AppConfig JSON, the sheet model facade and every unit, History, the Auto Save under test and
// the REAL Modal 1.2.0 drawn into a small fake DOM (the harness reads the dialog and clicks its buttons). Stand-ins
// only for five leaves that reach panels or the 3D model (PanelHost, ModelToggle, the plan and elevation readers)
// and the specification document. This parent process is the network: the REAL WebApps/Whitecardopedia/server.py
// through Flask's test client on a TEMPORARY copy of 2026/3047__Doous (fingerprint, guarded POST, backups - all in
// the OS temp folder), and a stand-in editor Worker 1.6.0 with its R2 store and the CDN. Nothing is written outside
// the OS temp folder; the real Doous files are hashed before and after.
//
// Exit 0 = every check held.
// =============================================================================

import { register } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { join, resolve, sep, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { fork, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const SELF = fileURLToPath(import.meta.url);
const ARGS = { child : false };
for (let i = 2; i < process.argv.length; i++) {
    const key = process.argv[i].replace(/^--/, '');
    if (key === 'child') { ARGS.child = true; continue; }
    ARGS[key] = process.argv[i + 1]; i++;
}

const FLASK_ORIGIN = 'http://localhost:8000';
const BASE         = FLASK_ORIGIN + '/ValeVision3D/';
const DOOUS        = '2026/3047__Doous';
const SRC          = '02__Src__AppModules/';
const LE           = SRC + '51__System__LayoutEditor/';
const P = {
    loader   : SRC + '03__AppUtils/Na__AppUtils__ProjectLoader.js',
    cfapi    : SRC + '80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js',
    pres     : SRC + '21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js',
    modal    : SRC + '21__System__PresentationMode/Na__PresentationMode__DevMenu__Modal__.js',
    drawData : SRC + '40__System__DrawingViewCore/Na__DrawView__ProjectData__.js',
    config   : LE + '03__Core__Config/Na__LayoutEditor__ConfigState__.js',
    model    : LE + '07__Core__SheetData/Na__LayoutEditor__SheetModel__.js',
    history  : LE + '07__Core__SheetData/Na__LayoutEditor__History__.js',
    autosave : LE + '07__Core__SheetData/Na__LayoutEditor__AutoSave__.js'
};
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));


// =============================================================================
// THE CHILD: one browser window
// =============================================================================
async function RunChild() {
    const root      = resolve(ARGS.root);
    const overrides = {};
    if (ARGS.autosave) overrides[P.autosave] = resolve(ARGS.autosave);

    const STUBS = {
        [LE + '40__Ui__Panels/Na__LayoutEditor__PanelHost__.js'] :
            'function Na__LePanels__OnControl() {} function Na__LePanels__Row() { return null; } function Na__LePanels__Input() { return null; } function Na__LePanels__Select() { return null; }\n' +
            'export { Na__LePanels__OnControl, Na__LePanels__Row, Na__LePanels__Input, Na__LePanels__Select };',
        [SRC + '26__System__ToggleModelElements/Na__UiFeature__ModelToggle__Controls.js'] :
            'function Na__ModelToggle__GetCategoryKeys() { return []; }\nexport { Na__ModelToggle__GetCategoryKeys };',
        [SRC + '42__System__FloorPlanViews/Na__FloorPlan__ProjectJson__Data__.js'] :
            'function Na__FpData__GetPlanById() { return null; }\nexport { Na__FpData__GetPlanById };',
        [SRC + '45__System__ElevationViews/Na__Elevation__ProjectJson__Data__.js'] :
            'function Na__ElevData__GetElevationById() { return null; }\nexport { Na__ElevData__GetElevationById };',
        [LE + '50__Feature__Specification/Na__LayoutEditor__SpecData__Document__.js'] :
            'function Na__LeSpec__IsDirty() { return globalThis.__SpecDirty === true; }\nexport { Na__LeSpec__IsDirty };'
    };

    const SCRATCH = mkdtempSync(join(tmpdir(), 'w1-07-window-'));
    const HOOKS = [
        "import { readFileSync } from 'node:fs';",
        'let S = null;',
        'export async function initialize(data) { S = data; }',
        'export async function resolve(specifier, context, nextResolve) {',
        "    const parent = (context.parentURL || '').split('?')[0];",
        '    if (specifier.startsWith(S.base)) return { url : specifier, shortCircuit : true };',
        "    if (parent.startsWith(S.base) && (specifier.startsWith('./') || specifier.startsWith('../'))) return { url : new URL(specifier, parent).href, shortCircuit : true };",
        "    if (parent.startsWith(S.base)) throw new Error('module outside the app reached: ' + specifier + ' from ' + parent);",
        '    return nextResolve(specifier, context);',
        '}',
        'export async function load(url, context, nextLoad) {',
        '    if (!url.startsWith(S.base)) return nextLoad(url, context);',
        "    const path = decodeURIComponent(url.slice(S.base.length).split('?')[0]);",
        "    if (Object.prototype.hasOwnProperty.call(S.stubs, path)) return { format : 'module', source : S.stubs[path], shortCircuit : true };",
        "    const file = S.overrides[path] || (S.root + path.split('/').join(S.sep));",
        "    return { format : 'module', source : readFileSync(file, 'utf8'), shortCircuit : true };",
        '}'
    ].join('\n');
    writeFileSync(join(SCRATCH, 'hooks.mjs'), HOOKS);
    register(pathToFileURL(join(SCRATCH, 'hooks.mjs')).href, { parentURL : import.meta.url,
        data : { base : BASE, root : root + sep, sep, stubs : STUBS, overrides } });

    // ---- A DOM JUST BIG ENOUGH FOR THE REAL MODAL ------------------------------------------------------------
    const W = globalThis.W107 = { dialogs : [], toasts : [], logs : [], warns : [], errors : [], fetches : [] };
    class FakeEl extends EventTarget {
        constructor(tag) { super(); this.tagName = String(tag).toUpperCase(); this.children = []; this.attributes = {}; this.className = ''; this.id = ''; this.ownText = ''; this.disabled = false; this.style = {}; this.type = ''; }
        get classList() {
            const el = this;
            const list = () => el.className.split(/\s+/).filter(Boolean);
            return {
                add(...names) { const s = new Set(list()); names.forEach((n) => s.add(n)); el.className = [ ...s ].join(' '); if (el.id === 'naPmDevModalRoot' && names.indexOf('is-open') >= 0) W.dialogs.push(ReadDialog(el)); },
                remove(...names) { el.className = list().filter((n) => names.indexOf(n) < 0).join(' '); },
                toggle(name, force) { const want = (force === undefined) ? list().indexOf(name) < 0 : !!force; if (want) this.add(name); else this.remove(name); return want; },
                contains(name) { return list().indexOf(name) >= 0; }
            };
        }
        setAttribute(k, v) { this.attributes[k] = String(v); }
        getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
        appendChild(child) { this.children.push(child); return child; }
        contains(node) { return node === this || this.children.some((c) => c.contains(node)); }
        set innerHTML(v) { this.children = []; this.ownText = ''; }
        get innerHTML() { return ''; }
        set textContent(v) { this.children = []; this.ownText = String(v); }
        get textContent() { return this.ownText + this.children.map((c) => c.textContent).join(''); }
        querySelector(selector) {
            const cls = selector.charAt(0) === '.' ? selector.slice(1) : null;
            for (const c of this.children) { if (cls && c.classList.contains(cls)) return c; const found = c.querySelector(selector); if (found) return found; }
            return null;
        }
        focus() { globalThis.document.activeElement = this; }
    }
    function ReadDialog(rootEl) {
        const card = rootEl.querySelector('.na-pm-modal__card');
        const kids = card ? card.children : [];
        const pick = (tag, cls) => kids.filter((k) => k.tagName === tag && (!cls || k.classList.contains(cls)));
        const footer = kids.find((k) => k.classList.contains('na-pm-modal__footer'));
        return {
            title    : (pick('H3')[0] || { textContent : null }).textContent,
            message  : (pick('P').find((p) => !p.classList.contains('na-pm-modal__message--footnote')) || { textContent : null }).textContent,
            details  : (pick('UL')[0] ? pick('UL')[0].children.map((li) => li.textContent) : []),
            footnote : (pick('P').find((p) => p.classList.contains('na-pm-modal__message--footnote')) || { textContent : null }).textContent,
            buttons  : footer ? footer.children.map((b) => ({ label : b.textContent, className : b.className })) : []
        };
    }
    const body = new FakeEl('body');
    globalThis.document = Object.assign(new EventTarget(), { body, visibilityState : 'visible', activeElement : null, createElement : (tag) => new FakeEl(tag), getElementById : () => null });
    function OpenDialogRoot() { return body.children.find((c) => c.id === 'naPmDevModalRoot' && c.classList.contains('is-open')) || null; }
    function ClickDialog(label) {
        const rootEl = OpenDialogRoot();
        if (!rootEl) return false;
        const footer = rootEl.querySelector('.na-pm-modal__footer');
        const button = footer && footer.children.find((b) => b.textContent === label);
        if (!button) return false;
        button.dispatchEvent(new Event('click'));
        return true;
    }

    // ---- THE WINDOW: its own localStorage, the address bar on localhost --------------------------------------
    const win = new EventTarget();
    const store = new Map();
    win.localStorage = { getItem : (k) => (store.has(k) ? store.get(k) : null), setItem : (k, v) => { store.set(k, String(v)); }, removeItem : (k) => { store.delete(k); }, key : (i) => [ ...store.keys() ][i] || null, get length() { return store.size; } };
    win.setTimeout = setTimeout; win.clearTimeout = clearTimeout;
    win.location = { hostname : 'localhost', port : '8000', protocol : 'http:', search : '?project=' + DOOUS, origin : FLASK_ORIGIN, href : BASE + 'index.html?project=' + DOOUS, pathname : '/ValeVision3D/index.html', reload() {} };
    globalThis.window = win;
    globalThis.CustomEvent = globalThis.CustomEvent || class extends Event { constructor(type, init) { super(type); this.detail = init ? init.detail : undefined; } };

    // ---- THE NETWORK: app files from disk, everything else asked of the parent -------------------------------
    let fetchSerial = 0;
    const pendingFetch = new Map();
    globalThis.fetch = async (input, init) => {
        const url = String(input && input.href ? input.href : input);
        const opts = init || {};
        if (url.startsWith(BASE)) {
            const file = join(root, ...decodeURIComponent(url.slice(BASE.length).split('?')[0]).split('/'));
            if (!existsSync(file)) return new Response('Not Found', { status : 404 });
            return new Response(readFileSync(file), { status : 200 });
        }
        const headers = {};
        const h = opts.headers || {};
        if (typeof h.forEach === 'function' && !Array.isArray(h)) h.forEach((v, k) => { headers[k.toLowerCase()] = String(v); });
        else Object.entries(h).forEach(([ k, v ]) => { headers[k.toLowerCase()] = String(v); });
        const id = ++fetchSerial;
        const body = (opts.body === undefined || opts.body === null) ? null : (typeof opts.body === 'string' ? opts.body : Buffer.from(await new Response(opts.body).arrayBuffer()).toString('utf8'));
        W.fetches.push({ method : String(opts.method || 'GET').toUpperCase(), url });
        const answer = await new Promise((done) => { pendingFetch.set(id, done); process.send({ t : 'fetch', id, method : String(opts.method || 'GET').toUpperCase(), url, headers, body }); });
        return new Response(answer.status === 204 ? null : Buffer.from(answer.body || '', 'base64'), { status : answer.status, headers : answer.headers || {} });
    };
    console.log   = (...a) => { W.logs.push(a.map(String).join(' ')); };
    console.info  = (...a) => { W.logs.push(a.map(String).join(' ')); };
    console.warn  = (...a) => { W.warns.push(a.map(String).join(' ')); };
    console.error = (...a) => { W.errors.push(a.map((x) => (x && x.stack) ? x.stack.split('\n').slice(0, 2).join(' | ') : String(x)).join(' ')); };

    // ---- THE APP ----------------------------------------------------------------------------------------------
    const M = {};
    const toast = (message, isError) => W.toasts.push({ message : String(message), isError : isError === true });
    const DRAFT_KEY = 'Na__LayoutEditor__Draft__' + DOOUS;
    function Draft() { const raw = store.get(DRAFT_KEY); return raw ? JSON.parse(raw) : null; }
    function Summary(sheets) { return (sheets || []).map((s) => ({ id : s.Sheet__Id, texts : (s.Sheet__Annotations || []).map((a) => a.Annotation__Text) })); }
    function State() {
        return {
            dirty      : M.model ? M.model.Na__LeModel__IsDirty() : null,
            sheets     : M.model ? Summary(M.model.Na__LeModel__GetSheets()) : null,
            base       : M.data ? M.data.Na__DrawData__GetBase() : null,
            savedIso   : M.data && M.data.Na__DrawData__GetBlock() ? (M.data.Na__DrawData__GetBlock().LayoutEditor__DrawingsData__SavedIso || null) : null,
            draft      : Draft() ? { hasBase : Object.prototype.hasOwnProperty.call(Draft(), 'base'), base : Draft().base, sheets : Summary(Draft().sheets), raw : store.get(DRAFT_KEY) } : null,
            storage    : Object.fromEntries(store),
            dialogs    : W.dialogs,
            dialogOpen : !!OpenDialogRoot(),
            toasts     : W.toasts,
            flag       : (typeof window.Na__Pwa__HasUnsavedWork === 'function') ? window.Na__Pwa__HasUnsavedWork() : ('absent:' + typeof window.Na__Pwa__HasUnsavedWork),
            flagIsModule : !!(M.auto && window.Na__Pwa__HasUnsavedWork === M.auto.Na__LeAuto__HasUnsavedWork),
            tvGlobals  : Object.keys(window).filter((k) => /TrueVision/.test(k)),
            draftLines : W.logs.filter((l) => /unsaved sheet draft/.test(l)),
            errors     : W.errors,
            autoExports : M.auto ? Object.keys(M.auto).sort() : null
        };
    }
    async function Settle() {                                                    // <-- Every fetch answered and every timer at 0 run
        for (let i = 0; i < 40; i++) { await sleep(15); if (pendingFetch.size === 0) { await sleep(15); if (pendingFetch.size === 0) return; } }
    }

    const COMMANDS = {
        async boot(args) {
            ((args && args.storage) ? Object.entries(args.storage) : []).forEach(([ k, v ]) => store.set(k, v));
            const imp = (rel) => import(BASE + rel);
            M.loaderUtil = await imp(P.loader);
            M.cfapi = await imp(P.cfapi);
            M.pres  = await imp(P.pres);
            M.data  = await imp(P.drawData);
            // THE PAGE START (index.html, then the loading sequence): the drawings data listens first
            M.data.Na__DrawView__ProjectData__Initialize();
            await M.loaderUtil.Na__AppUtils__InitMasterIndex();
            const ready = M.cfapi.Na__CfApi__Initialize();
            const doc = await (await fetch(FLASK_ORIGIN + '/api/projects/' + DOOUS, { cache : 'no-store' })).json();   // <-- The local server's copy (the overlay from R2 is W0-13's, not run here)
            await ready;
            M.cfapi.Na__CfApi__SetLoadedProjectData(doc);
            M.pres.Na__PresentationMode__ProjectJson__SetActiveConfig(doc.PresentationMode__SavedCameraScenes || null, DOOUS);
            window.dispatchEvent(new CustomEvent(M.data.Na__DrawData__LOADED_EVENT, { detail : { block : doc.LayoutEditor__DrawingsData || null, sceneConfig : doc.PresentationMode__SavedCameraScenes || null, projectCode : DOOUS } }));
            // THE EDITOR OPENS LATER (lazy): the mode controller's start-up pass, in its order (ModeController :1091-1093)
            M.config  = await imp(P.config);
            M.model   = await imp(P.model);
            M.history = await imp(P.history);
            M.auto    = await imp(P.autosave);
            M.modal   = await imp(P.modal);
            await M.config.Na__LeCfg__Ready();
            M.model.Na__LeModel__Initialize();
            M.history.Na__LeHist__Initialize();
            M.auto.Na__LeAuto__Initialize({ showToast : toast, editable : true });
            await Settle();
            return State();
        },
        async state() { await Settle(); return State(); },
        async edit(args) {
            const sheet = M.model.Na__LeModel__GetSheetById(args.sheetId);
            const item  = M.model.Na__LeModel__CreateAnnotation(sheet, 100, 100, { text : args.text });
            return Object.assign({ created : !!item }, State());
        },
        async setStorage(args) {                                                // <-- One browser, two windows: the parent carries the shared store between steps
            store.clear();
            Object.entries(args.storage || {}).forEach(([ k, v ]) => store.set(k, v));
            return { size : store.size };
        },
        async wait(args) { await sleep(args.ms); await Settle(); return State(); },
        async save() { const saved = await M.model.Na__LeModel__Save(toast); await Settle(); return Object.assign({ saved }, State()); },
        async click(args) { const clicked = ClickDialog(args.label); await Settle(); return Object.assign({ clicked }, State()); },
        async flush() { const flushed = M.auto.Na__LeAuto__Flush(); return { flushed }; },
        async raw() { return { model : JSON.stringify(M.model.Na__LeModel__GetSheets()), draft : Draft() ? JSON.stringify(Draft().sheets) : null }; }
    };
    process.on('message', async (message) => {
        if (message.t === 'fetch-reply') { const done = pendingFetch.get(message.id); if (done) { pendingFetch.delete(message.id); done(message); } return; }
        if (message.t === 'cmd') {
            try { const result = await COMMANDS[message.name](message.args || {}); process.send({ t : 'cmd-reply', id : message.id, ok : true, result }); }
            catch (error) { process.send({ t : 'cmd-reply', id : message.id, ok : false, error : (error && error.stack) ? error.stack.split('\n').slice(0, 6).join(' | ') : String(error) }); }
        }
        if (message.t === 'exit') { try { rmSync(SCRATCH, { recursive : true, force : true }); } catch (e) { /* temp */ } process.exit(0); }
    });
    process.send({ t : 'ready' });
}


// =============================================================================
// THE PARENT: the network, the real local server, the scenarios
// =============================================================================
async function RunParent() {
    const APP_ROOT = resolve(ARGS.root);
    const WCP_ROOT = resolve(APP_ROOT, '..', 'Whitecardopedia');
    const DOOUS_DIR = join(WCP_ROOT, 'Projects', '2026', '3047__Doous');
    const INDEX_FILE = join(WCP_ROOT, '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json');
    const CONFIG_FILE = join(APP_ROOT, '02__Src__AppModules', '02__AppData', 'Na__AppConfig__Main.json');
    const SCRATCH = mkdtempSync(join(tmpdir(), 'w1-07-harness-'));
    const PAGES_ORIGIN = 'https://adam-noble-01.github.io';
    const CDN_PROJECTS = 'https://cdn.noble-architecture.com/VaApps/Projects';
    const INDEX_URLS = [
        'https://cdn.noble-architecture.com/VaApps/Index/Na__MasterIndex__ProjectLocations__.json',
        PAGES_ORIGIN + '/ValeCodebase/WebApps/Whitecardopedia/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json'
    ];
    const WORKER_BASE = 'https://editor-worker.test/api/editor';
    const API_KEY = 'test-editor-key';
    const DOOUS_PREFIX = 'VaApps/Projects/' + DOOUS + '/';
    const INDEX_TEXT = readFileSync(INDEX_FILE, 'utf8');
    const DOOUS_DOC = JSON.parse(readFileSync(join(DOOUS_DIR, 'project.json'), 'utf8'));
    const OWNED_KEYS = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')).ProjectData__EditorOwnedKeys.ProjectData__EditorOwnedKeys__Keys;
    const Sha1File = (path) => existsSync(path) ? createHash('sha1').update(readFileSync(path)).digest('hex') : null;
    const REAL = { project : Sha1File(join(DOOUS_DIR, 'project.json')), notes : Sha1File(join(DOOUS_DIR, 'ValeVision__DrawingNotes__.json')) };
    const RESULTS = [];
    let failures = 0;
    function check(name, passed, detail) {
        if (!passed) failures++;
        RESULTS.push({ name, passed : !!passed, detail : passed ? undefined : detail });
        let text = (passed ? '  PASS  ' : '  FAIL  ') + name;
        if (!passed && detail !== undefined) { let s; try { s = JSON.stringify(detail); } catch (e) { s = String(detail); } text += '  -> ' + (s.length > 1200 ? s.slice(0, 1200) + '...' : s); }
        console.log(text);
    }
    const section = (title) => console.log('\n' + title);

    // ---- THE REAL LOCAL SERVER (server.py through Flask's test client; Projects and backups in the temp folder)
    const BRIDGE = [
        'import sys',
        'sys.dont_write_bytecode = True',
        'import os, json, base64, shutil, contextlib',
        'WCP = sys.argv[1]',
        'TMP = sys.argv[2]',
        "BUNDLED = os.path.join(WCP, 'src', 'ThirdParty__VersionLockedDependencies', 'SERVER__FlaskServerDepencies')",
        'if os.path.isdir(BUNDLED):',
        '    sys.path.insert(0, BUNDLED)',
        'sys.path.insert(0, WCP)',
        'with contextlib.redirect_stdout(sys.stderr):',
        '    import server as srv',
        '    import Server__ValeVisionShared__Lib__ as lib',
        "projects = os.path.join(TMP, 'Projects')",
        "backups = os.path.join(TMP, 'Backups')",
        "target = os.path.join(projects, '2026', '3047__Doous')",
        'os.makedirs(target, exist_ok=True)',
        'os.makedirs(backups, exist_ok=True)',
        "source = os.path.join(WCP, 'Projects', '2026', '3047__Doous')",
        "for name in ('project.json', 'ValeVision__DrawingNotes__.json'):",
        '    if os.path.isfile(os.path.join(source, name)):',
        '        shutil.copyfile(os.path.join(source, name), os.path.join(target, name))',
        'lib.PROJECTS_ROOT = projects',
        'lib.PROJECT_BACKUP_ROOT = backups',
        'client = srv.app.test_client()',
        'def emit(message):',
        "    sys.stdout.write('@@BRIDGE@@ ' + json.dumps(message) + chr(10))",
        '    sys.stdout.flush()',
        "emit({'ready': True, 'projects': projects, 'backups': backups, 'project': os.path.join(target, 'project.json')})",
        'for line in sys.stdin:',
        '    line = line.strip()',
        '    if not line:',
        '        continue',
        '    request = json.loads(line)',
        '    try:',
        "        data = base64.b64decode(request['body']) if request.get('body') is not None else None",
        '        with contextlib.redirect_stdout(sys.stderr):',
        "            response = client.open(request['path'], method=request['method'], headers=request.get('headers') or {}, data=data)",
        "        emit({'id': request['id'], 'status': response.status_code, 'headers': dict(response.headers), 'body': base64.b64encode(response.get_data()).decode('ascii')})",
        '    except Exception as error:',
        "        emit({'id': request['id'], 'status': 599, 'headers': {}, 'body': base64.b64encode(str(error).encode('utf-8')).decode('ascii')})"
    ].join('\n') + '\n';
    function StartBridge(tag) {
        return new Promise((done) => {
            const dir = join(SCRATCH, 'bridge-' + tag);
            const script = join(SCRATCH, 'bridge.py');
            writeFileSync(script, BRIDGE);
            const child = spawn('python', [ '-B', script, WCP_ROOT, dir ], { stdio : [ 'pipe', 'pipe', 'pipe' ], windowsHide : true });
            const pending = new Map();
            let next = 0, buffer = '', stderr = '', settled = false;
            const finish = (value) => { if (!settled) { settled = true; done(value); } };
            const timer = setTimeout(() => finish({ ok : false, error : 'python did not answer: ' + stderr.slice(-600) }), 120000);
            child.on('error', (e) => finish({ ok : false, error : e.message }));
            child.stderr.on('data', (d) => { stderr += d.toString(); });
            child.on('exit', (code) => { finish({ ok : false, error : 'python exited ' + code + ': ' + stderr.slice(-600) }); pending.forEach((f) => f({ status : 599, headers : {}, body : '' })); pending.clear(); });
            child.stdout.on('data', (d) => {
                buffer += d.toString();
                let cut;
                while ((cut = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, cut).trim(); buffer = buffer.slice(cut + 1);
                    if (!line.startsWith('@@BRIDGE@@ ')) continue;
                    const message = JSON.parse(line.slice('@@BRIDGE@@ '.length));
                    if (message.ready) { clearTimeout(timer); finish({ ok : true, info : message, ask, close }); continue; }
                    const f = pending.get(message.id); if (f) { pending.delete(message.id); f(message); }
                }
            });
            function ask(method, path, headers, bodyText) {
                return new Promise((f) => { const id = ++next; pending.set(id, f); child.stdin.write(JSON.stringify({ id, method, path, headers, body : bodyText === null ? null : Buffer.from(bodyText, 'utf8').toString('base64') }) + '\n'); });
            }
            async function close() { try { child.stdin.end(); } catch (e) { /* closed */ } await Promise.race([ new Promise((f) => child.on('exit', f)), sleep(15000) ]); try { child.kill(); } catch (e) { /* gone */ } }
        });
    }

    // ---- THE WORLD: R2 (the stand-in Worker's store), the request log ----------------------------------------
    function NewWorld(bridge) { const w = { bridge, r2 : new Map(), log : [], unexpected : [] }; PutR2(w, DOOUS_PREFIX + 'project.json', DOOUS_DOC); return w; }
    function PutR2(w, key, value) { w.r2.set(key, Buffer.from(JSON.stringify(value, null, 4))); }
    function GetR2(w, key) { const b = w.r2.get(key); return b ? JSON.parse(b.toString('utf8')) : null; }
    const Json = (status, body) => ({ status, headers : { 'Content-Type' : 'application/json' }, body : Buffer.from(JSON.stringify(body)).toString('base64') });
    async function Route(w, rec, windowName) {
        const plain = rec.url.split('?')[0];
        const entry = { window : windowName, method : rec.method, url : rec.url, base : rec.headers['x-valevision-drawings-base'] };
        w.log.push(entry);
        if (INDEX_URLS.indexOf(plain) !== -1) return { status : 200, headers : { 'Content-Type' : 'application/json' }, body : Buffer.from(INDEX_TEXT).toString('base64') };
        if (plain === FLASK_ORIGIN + '/api/editor-config') return Json(200, { workerApiBaseUrl : WORKER_BASE, apiKey : API_KEY });   // <-- Never the real server's: no real key leaves it
        if (plain === WORKER_BASE + '/health') return Json(200, { ok : true, worker : 'whitecardopedia-editor-api', version : '1.6.0', routes : [ 'save', 'assets', 'drawing-notes', 'project', 'merge-keys', 'files' ] });
        if (plain.startsWith(WORKER_BASE + '/projects/')) {
            entry.kind = 'worker';
            const rest = new URL(rec.url).pathname.slice('/api/editor/projects/'.length);
            const suffix = [ '/merge-keys', '/project' ].find((s) => rest.endsWith(s)) || '';
            const folderId = decodeURIComponent(rest.slice(0, rest.length - suffix.length));
            entry.suffix = suffix;
            if (rec.headers['x-editor-api-key'] !== API_KEY) return Json(401, { error : 'Unauthorized' });
            const key = 'VaApps/Projects/' + folderId + '/project.json';
            const body = rec.body ? JSON.parse(rec.body) : null;
            if (suffix === '/project' && rec.method === 'GET') { const doc = GetR2(w, key); return doc ? Json(200, doc) : Json(404, { error : 'No project.json on R2', missing : true }); }
            if (suffix === '/merge-keys' && rec.method === 'POST') {
                const set = body.set || {}, remove = body.remove || [];
                const refused = Object.keys(set).filter((k) => OWNED_KEYS.indexOf(k) === -1);
                if (refused.length) return Json(400, { error : 'Refused key(s): ' + refused.join(', ') });
                const doc = GetR2(w, key);
                if (!doc) return Json(409, { error : 'No project.json on R2', missing : true });
                entry.drawingsBase = body.drawingsBase;
                const merged = Object.assign({}, doc, set); remove.forEach((k) => { delete merged[k]; });
                PutR2(w, key, merged);
                entry.r2Write = true;
                return Json(200, { success : true });
            }
            if (suffix === '' && rec.method === 'POST') { PutR2(w, key, body); entry.r2Write = true; return Json(200, { success : true }); }
            return Json(404, { error : 'No route matched' });
        }
        if (plain.startsWith(CDN_PROJECTS + '/')) {
            const k = 'VaApps/Projects/' + decodeURIComponent(new URL(rec.url).pathname.slice('/VaApps/Projects/'.length));
            const b = w.r2.get(k);
            return b ? { status : 200, headers : { 'Content-Type' : 'application/json' }, body : b.toString('base64') } : { status : 404, headers : {}, body : '' };
        }
        if (rec.url.startsWith(FLASK_ORIGIN + '/')) {
            entry.kind = 'local';
            const url = new URL(rec.url);
            const answer = await w.bridge.ask(rec.method, url.pathname + url.search, rec.headers, rec.body);
            entry.status = answer.status;
            if (rec.method === 'POST' && url.pathname.startsWith('/api/projects/')) entry.localWrite = answer.status === 200;
            const headers = {};
            Object.entries(answer.headers || {}).forEach(([ k, v ]) => { if (k.toLowerCase() !== 'content-length') headers[k] = v; });
            return { status : answer.status, headers, body : answer.body || '' };
        }
        w.unexpected.push(rec.method + ' ' + rec.url);
        return Json(404, { error : 'unexpected request in the harness' });
    }

    // ---- A WINDOW (a child process) --------------------------------------------------------------------------
    async function OpenWindow(w, name, autosaveFile) {
        const args = [ '--child', '--root', APP_ROOT ];
        if (autosaveFile) args.push('--autosave', autosaveFile);
        const child = fork(SELF, args, { stdio : [ 'ignore', 'inherit', 'inherit', 'ipc' ] });
        const replies = new Map();
        let serial = 0;
        await new Promise((ready) => {
            child.on('message', async (m) => {
                if (m.t === 'ready') { ready(); return; }
                if (m.t === 'fetch') { const answer = await Route(w, m, name); child.send(Object.assign({ t : 'fetch-reply', id : m.id }, answer)); return; }
                if (m.t === 'cmd-reply') { const f = replies.get(m.id); if (f) { replies.delete(m.id); f(m); } }
            });
        });
        async function cmd(nameOfCmd, cmdArgs) {
            const m = await new Promise((f) => { const id = ++serial; replies.set(id, f); child.send({ t : 'cmd', id, name : nameOfCmd, args : cmdArgs || {} }); });
            if (!m.ok) throw new Error(name + ' ' + nameOfCmd + ' failed: ' + m.error);
            if (m.result && Array.isArray(m.result.errors)) WINDOW_ERRORS.set(name, m.result.errors);   // <-- Each window's console.error lines, cumulative
            return m.result;
        }
        function close() { child.send({ t : 'exit' }); return new Promise((f) => child.on('exit', f)); }
        return { cmd, close, name };
    }
    const WINDOW_ERRORS = new Map();
    const EVIDENCE = {};
    const AFTER_DRAFT = 900;                                                    // <-- The config's DraftDebounceMs is 600: wait past it
    const merges = (w) => w.log.filter((e) => e.kind === 'worker' && e.r2Write).length;
    const localWrites = (w) => w.log.filter((e) => e.localWrite).length;
    const texts = (state, id) => { const s = (state.sheets || []).find((x) => x.id === id); return s ? s.texts : null; };
    const projectOnDisk = (bridge) => JSON.parse(readFileSync(bridge.info.project, 'utf8'));
    const diskTexts = (bridge) => (projectOnDisk(bridge).LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__Sheets.find((s) => s.Sheet__Id === 'Sheet_001').Sheet__Annotations || []).map((a) => a.Annotation__Text);
    const r2Texts = (w) => (GetR2(w, DOOUS_PREFIX + 'project.json').LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__Sheets.find((s) => s.Sheet__Id === 'Sheet_001').Sheet__Annotations || []).map((a) => a.Annotation__Text);
    const AUTOSAVE_NEW = ARGS.autosave ? resolve(ARGS.autosave) : null;
    const AUTOSAVE_OLD = ARGS.old ? resolve(ARGS.old) : null;
    const QUESTION = 'Unsaved sheet changes from this browser';

    console.log('W1-07 harness - AutoSave ' + (AUTOSAVE_NEW ? AUTOSAVE_NEW : 'as on disk under ' + APP_ROOT));

    // =========================================================================
    // P. A DRAFT WRITTEN BY THIS APP'S OLD AUTO SAVE (1.3.1, no base)
    // =========================================================================
    if (AUTOSAVE_OLD) {
        section('P. A PRE-UPGRADE DRAFT | written by ValeVision\'s AutoSave 1.3.1, then a load with 1.5.0');
        const bridge = await StartBridge('P');
        if (!bridge.ok) { check('the real local server could be driven', false, bridge.error); }
        else {
            const w = NewWorld(bridge);
            const fileBefore = Sha1File(bridge.info.project);
            const O = await OpenWindow(w, 'old', AUTOSAVE_OLD);
            let s = await O.cmd('boot');
            check('the old app (AutoSave 1.3.1) opens Doous clean: one sheet, no draft, no question', s.dirty === false && s.sheets.length === 1 && s.draft === null && s.dialogs.length === 0, s);
            await O.cmd('edit', { sheetId : 'Sheet_001', text : 'Unsaved note from the old app' });
            s = await O.cmd('wait', { ms : AFTER_DRAFT });
            check('the old app writes its draft as it always did: { savedAt, sheets }, no base', !!s.draft && s.draft.hasBase === false && JSON.stringify(texts({ sheets : s.draft.sheets }, 'Sheet_001')) === JSON.stringify([ 'Unsaved note from the old app' ]), s.draft);
            const oldStorage = s.storage;
            const oldDraftRaw = s.draft.raw;
            await O.close();

            const N1 = await OpenWindow(w, 'new-1', AUTOSAVE_NEW);
            s = await N1.cmd('boot', { storage : oldStorage });
            check('1.5.0 asks about the pre-upgrade draft on the first load - exactly once', s.dialogs.length === 1 && s.dialogOpen === true && s.dialogs[0].title === QUESTION, s.dialogs);
            const d = s.dialogs[0] || { buttons : [], details : [] };
            EVIDENCE.preUpgradeQuestion = d;
            check('the question offers Decide Later, Discard Draft and Apply Draft (the real Modal 1.2.0, in that order)', JSON.stringify(d.buttons.map((b) => b.label)) === JSON.stringify([ 'Decide Later', 'Discard Draft', 'Apply Draft' ]), d.buttons);
            check('Apply Draft and Discard Draft are both marked destructive (red)', d.buttons.length === 3 && /--danger/.test(d.buttons[1].className) && /--danger/.test(d.buttons[2].className) && !/--danger/.test(d.buttons[0].className), d.buttons);
            check('its details say the draft did not say what it grew from', d.details.length === 3 && /^Draft written: .*, 1 sheet$/.test(d.details[0]) && /^Drawings as saved: no saved stamp yet, 1 sheet$/.test(d.details[1]) && /the draft grew from a copy that did not say$/.test(d.details[2]), d.details);
            check('the footnote says Decide Later keeps it until an edit replaces it', /^Decide Later leaves the draft/.test(d.footnote || ''), d.footnote);
            check('nothing touched the sheets while asking: the saved sheet, not dirty', s.dirty === false && JSON.stringify(texts(s, 'Sheet_001')) === '[]', s);
            await N1.cmd('edit', { sheetId : 'Sheet_001', text : 'Typed while the question is open' });
            s = await N1.cmd('wait', { ms : AFTER_DRAFT });
            check('nothing writes the draft while the question is open (an edit, then past the draft debounce)', s.draft && s.draft.raw === oldDraftRaw, s.draft);
            s = await N1.cmd('click', { label : 'Decide Later' });
            check('Decide Later: the draft is left where it was, the "not applied" toast', s.clicked && s.dialogOpen === false && s.draft && s.draft.raw === oldDraftRaw && s.toasts.length === 1 && /^The draft was not applied/.test(s.toasts[0].message) && s.toasts[0].isError === false, s);
            const keptStorage = s.storage;
            await N1.close();

            const logBefore = w.log.length;
            const N2 = await OpenWindow(w, 'new-2', AUTOSAVE_NEW);
            s = await N2.cmd('boot', { storage : keptStorage });
            check('the next load asks again (the draft was left aside), once', s.dialogs.length === 1 && s.dialogOpen === true, s.dialogs.length);
            s = await N2.cmd('click', { label : 'Discard Draft' });
            check('Discard Draft: the draft is removed from this browser', s.clicked && s.draft === null && s.storage['Na__LayoutEditor__Draft__' + DOOUS] === undefined, s.storage);
            check('...the saved sheets stay: no unsaved note, the model clean', s.dirty === false && JSON.stringify(texts(s, 'Sheet_001')) === '[]', s);
            check('...the "discarded" toast, not an error', s.toasts.length === 1 && /^The draft was discarded/.test(s.toasts[0].message) && s.toasts[0].isError === false, s.toasts);
            check('...and nothing was written anywhere: no R2 write, no local POST', w.log.slice(logBefore).every((e) => !e.r2Write && !(e.method === 'POST')), w.log.slice(logBefore).filter((e) => e.method === 'POST'));
            const clearedStorage = s.storage;
            await N2.close();

            const N3 = await OpenWindow(w, 'new-3', AUTOSAVE_NEW);
            s = await N3.cmd('boot', { storage : clearedStorage });
            check('the load after Discard asks nothing (asked about once)', s.dialogs.length === 0 && s.draft === null && s.dirty === false, s.dialogs);
            await N3.close();
            check('the temporary project file was never written in P', Sha1File(bridge.info.project) === fileBefore);
            check('no request left the harness unexpectedly (P)', w.unexpected.length === 0, w.unexpected);
            await bridge.close();
        }
    }

    // =========================================================================
    // T. TWO WINDOWS ON 2026/3047__Doous
    // =========================================================================
    section('T. TWO WINDOWS | A saves, B\'s save is refused before R2, B\'s draft is offered on reload');
    const bridge = await StartBridge('T');
    if (!bridge.ok) { check('the real local server could be driven', false, bridge.error); }
    else {
        const w = NewWorld(bridge);
        const A = await OpenWindow(w, 'A', AUTOSAVE_NEW);
        const B = await OpenWindow(w, 'B', AUTOSAVE_NEW);
        let a = await A.cmd('boot');
        let b = await B.cmd('boot');
        const F0 = a.base;
        check('both windows load Doous and learn the same base: server.py\'s fingerprint of the file', typeof F0 === 'string' && /^sha1:[0-9a-f]{40}$/.test(F0) && b.base === F0, { a : a.base, b : b.base });
        check('neither asks anything, neither is dirty; the flag answers false in both', a.dialogs.length === 0 && b.dialogs.length === 0 && a.dirty === false && b.dirty === false && a.flag === false && b.flag === false, { a, b });
        check('the flag is published as window.Na__Pwa__HasUnsavedWork, the module\'s own function, and no TrueVision-named global', a.flagIsModule === true && a.tvGlobals.length === 0, a);
        check('AutoSave exports TrueVision 1.5.0\'s six names', JSON.stringify(a.autoExports) === JSON.stringify([ 'Na__LeAuto__DiscardSavedDraft', 'Na__LeAuto__Flush', 'Na__LeAuto__HasUnsavedWork', 'Na__LeAuto__Initialize', 'Na__LeAuto__Resume', 'Na__LeAuto__Suspend' ]), a.autoExports);

        await A.cmd('edit', { sheetId : 'Sheet_001', text : 'Window A note' });
        a = await A.cmd('wait', { ms : AFTER_DRAFT });
        check('A: the edit makes A dirty, its draft says it grew from the base loaded, the flag answers true', a.dirty === true && a.draft && a.draft.base === F0 && a.flag === true, a);
        const mergesBeforeA = merges(w);
        a = await A.cmd('save');
        const F1 = a.base;
        check('A: Save Sheets lands - one R2 write (merge-keys), then server.py\'s guarded POST, one green toast', a.saved === true && merges(w) === mergesBeforeA + 1 && localWrites(w) === 1 && a.toasts.length === 1 && a.toasts[0].message === 'Sheets saved to R2 and locally.' && a.toasts[0].isError === false, { saved : a.saved, toasts : a.toasts, log : w.log.filter((e) => e.method === 'POST') });
        check('A: the local write carried the base A loaded (X-ValeVision-Drawings-Base)', w.log.filter((e) => e.localWrite).every((e) => e.base === F0), w.log.filter((e) => e.localWrite));
        check('A: the file and R2 now hold A\'s note; A\'s base is the file\'s new fingerprint; A\'s draft is cleared', JSON.stringify(diskTexts(bridge)) === '["Window A note"]' && JSON.stringify(r2Texts(w)) === '["Window A note"]' && /^sha1:/.test(F1) && F1 !== F0 && a.draft === null && a.dirty === false && a.flag === false, { disk : diskTexts(bridge), r2 : r2Texts(w), F1, draft : a.draft });

        await B.cmd('edit', { sheetId : 'Sheet_001', text : 'Window B note' });
        b = await B.cmd('wait', { ms : AFTER_DRAFT });
        check('B: its edit is in its own draft, grown from the base B loaded (before A\'s save)', b.dirty === true && b.draft && b.draft.base === F0 && JSON.stringify(texts({ sheets : b.draft.sheets }, 'Sheet_001')) === '["Window B note"]', b.draft);
        const fileBeforeB = Sha1File(bridge.info.project);
        const mergesBeforeB = merges(w), logBeforeB = w.log.length;
        b = await B.cmd('save');
        const bRequests = w.log.slice(logBeforeB);
        check('B: Save Sheets is refused BEFORE R2 is written - no merge-keys request, no R2 write of any kind', b.saved === false && merges(w) === mergesBeforeB && bRequests.every((e) => e.kind !== 'worker'), bRequests);
        check('B: the refusal came from server.py\'s fingerprint (asked, then nothing posted)', bRequests.some((e) => /\/drawings-fingerprint$/.test(e.url.split('?')[0])) && bRequests.every((e) => e.method !== 'POST'), bRequests);
        check('B: the file on disk is untouched (A\'s note, A\'s bytes)', Sha1File(bridge.info.project) === fileBeforeB && JSON.stringify(diskTexts(bridge)) === '["Window A note"]');
        check('B: one red toast with TrueVision v2.146.0\'s words', b.toasts.length === 1 && b.toasts[0].isError === true && /^Not saved: the project's drawings on disk are not the ones this window loaded/.test(b.toasts[0].message) && /offered as a draft/.test(b.toasts[0].message), b.toasts);
        check('B: still dirty, its draft still there, the flag still holds an update reload', b.dirty === true && b.draft && b.draft.base === F0 && b.flag === true, b);
        const bStorage = b.storage;
        await B.close();
        await A.close();

        // B RELOADS: the same refused draft (B's browser as B left it), one reload per answer. Decide Later and
        // Discard Draft first, while the file is still A's; Apply Draft last, followed by Save Sheets.
        const reload = async (name, storage) => { const win = await OpenWindow(w, name, AUTOSAVE_NEW); const st = await win.cmd('boot', { storage : storage || bStorage }); return { win, st }; };
        const fileAfterA = Sha1File(bridge.info.project);
        let r = await reload('B-reload-1');
        let d = r.st.dialogs[0] || { buttons : [], details : [] };
        EVIDENCE.twoWindowQuestion = d;
        EVIDENCE.bRefusalToast = b.toasts;
        EVIDENCE.bases = { F0, F1 };
        check('B reloads: the drawings are A\'s, the base is the file\'s new fingerprint, and B\'s draft is offered - once', r.st.base === F1 && JSON.stringify(texts(r.st, 'Sheet_001')) === '["Window A note"]' && r.st.dialogs.length === 1 && r.st.dialogOpen && d.title === QUESTION, r.st);
        check('the question names both bases and the saved stamp A wrote', d.details.length === 3 && d.details[2] === 'Base: ' + F1 + ' now; the draft grew from ' + F0 && /^Drawings as saved: \d\d:\d\d on \d\d\/\d\d\/\d{4}, 1 sheet$/.test(d.details[1]) && /, 1 sheet$/.test(d.details[0]), d.details);
        check('nothing touched B\'s sheets while asking (not dirty, A\'s note only)', r.st.dirty === false, r.st);
        let st = await r.win.cmd('click', { label : 'Decide Later' });
        check('Decide Later: the draft is left for the next load, the drawings as saved (A\'s), not dirty', st.clicked && st.draft && st.draft.base === F0 && JSON.stringify(texts(st, 'Sheet_001')) === '["Window A note"]' && st.dirty === false && st.toasts.length === 1 && /^The draft was not applied/.test(st.toasts[0].message), st);
        const asideStorage = st.storage;
        await r.win.close();

        r = await reload('B-reload-2', asideStorage);
        check('the next reload asks again, once', r.st.dialogs.length === 1 && r.st.dialogOpen, r.st.dialogs.length);
        st = await r.win.cmd('click', { label : 'Discard Draft' });
        check('Discard Draft: the draft is gone, the drawings stay as saved (A\'s), not dirty', st.clicked && st.draft === null && JSON.stringify(texts(st, 'Sheet_001')) === '["Window A note"]' && st.dirty === false && st.toasts.length === 1 && /^The draft was discarded/.test(st.toasts[0].message), st);
        const discardedStorage = st.storage;
        await r.win.close();
        r = await reload('B-reload-2b', discardedStorage);
        check('...and the reload after Discard asks nothing', r.st.dialogs.length === 0 && r.st.draft === null && r.st.dirty === false, r.st.dialogs);
        await r.win.close();
        check('Decide Later and Discard Draft wrote nothing: the file is still A\'s', Sha1File(bridge.info.project) === fileAfterA);

        r = await reload('B-reload-3');
        check('a reload with the refused draft again (B\'s browser as B left it) asks again', r.st.dialogs.length === 1 && r.st.dialogOpen, r.st.dialogs.length);
        st = await r.win.cmd('click', { label : 'Apply Draft' });
        check('Apply Draft: B\'s draft is put back over the saved drawings, dirty, the "applied" toast and console line', st.clicked && JSON.stringify(texts(st, 'Sheet_001')) === '["Window B note"]' && st.dirty === true && st.toasts.length === 1 && /^The draft was applied over the saved drawings/.test(st.toasts[0].message) && st.draftLines.some((l) => /^\[ValeVision3D\] Layout Editor: unsaved sheet draft applied over the saved drawings\.$/.test(l)), st);
        check('...and the draft stays until a save clears it', st.draft && st.draft.base === F0, st.draft);
        const mergesBeforeApply = merges(w);
        st = await r.win.cmd('save');
        check('...Save Sheets then lands (the window\'s base is the file as it now is): R2 and disk hold B\'s note, the draft is cleared', st.saved === true && merges(w) === mergesBeforeApply + 1 && JSON.stringify(diskTexts(bridge)) === '["Window B note"]' && JSON.stringify(r2Texts(w)) === '["Window B note"]' && st.draft === null && st.dirty === false, { saved : st.saved, toasts : st.toasts, disk : diskTexts(bridge), r2 : r2Texts(w), draft : st.draft });
        const savedStorage = st.storage;
        await r.win.close();
        r = await reload('B-reload-4', savedStorage);
        check('the reload after that save asks nothing and shows B\'s note, clean', r.st.dialogs.length === 0 && r.st.draft === null && r.st.dirty === false && JSON.stringify(texts(r.st, 'Sheet_001')) === '["Window B note"]', r.st);
        await r.win.close();
        const errors = [ ...WINDOW_ERRORS.entries() ].filter(([ , list ]) => list.length);
        check('no window logged a console error', errors.length === 0, errors);
        check('no request left the harness unexpectedly (T)', w.unexpected.length === 0, w.unexpected);
        check('every R2 write sat under VaApps/Projects/2026/3047__Doous/', w.log.filter((e) => e.r2Write).every((e) => decodeURIComponent(e.url).indexOf('/projects/' + DOOUS + '/') >= 0), w.log.filter((e) => e.r2Write).map((e) => e.url));
        await bridge.close();
    }

    // =========================================================================
    // T2. ONE BROWSER, TWO WINDOWS: one localStorage, the edits interleaved
    // =========================================================================
    // Two windows of one browser share the origin's localStorage, so both write the ONE draft key. The parent
    // carries the store from window to window between steps (each step runs to rest first), as the browser does.
    // B edits after A, so the draft in the store is B's when A saves: A's save must leave B's draft alone, B's save
    // must be refused, and B's reload must offer B's draft.
    section('T2. ONE BROWSER, TWO WINDOWS | one localStorage; A edits, B edits, A saves, B is refused, B reloads');
    const bridge2 = await StartBridge('T2');
    if (!bridge2.ok) { check('the real local server could be driven (T2)', false, bridge2.error); }
    else {
        const w = NewWorld(bridge2);
        let shared = {};
        const step = async (win, name, args) => { await win.cmd('setStorage', { storage : shared }); const st = await win.cmd(name, args); if (st && st.storage) shared = st.storage; return st; };
        const A = await OpenWindow(w, 'A2', AUTOSAVE_NEW);
        const B = await OpenWindow(w, 'B2', AUTOSAVE_NEW);
        let a = await A.cmd('boot', { storage : shared }); shared = a.storage;
        let b = await B.cmd('boot', { storage : shared }); shared = b.storage;
        const F0 = a.base;
        await step(A, 'edit', { sheetId : 'Sheet_001', text : 'Window A note' });
        a = await step(A, 'wait', { ms : AFTER_DRAFT });
        check('A\'s edit puts A\'s draft in the shared store', a.draft && JSON.stringify(texts({ sheets : a.draft.sheets }, 'Sheet_001')) === '["Window A note"]');
        await step(B, 'edit', { sheetId : 'Sheet_001', text : 'Window B note' });
        b = await step(B, 'wait', { ms : AFTER_DRAFT });
        check('B\'s edit replaces it with B\'s draft (one key per project, one browser)', b.draft && b.draft.base === F0 && JSON.stringify(texts({ sheets : b.draft.sheets }, 'Sheet_001')) === '["Window B note"]', b.draft);
        a = await step(A, 'save');
        check('A saves: R2 and disk take A\'s note', a.saved === true && JSON.stringify(diskTexts(bridge2)) === '["Window A note"]' && JSON.stringify(r2Texts(w)) === '["Window A note"]', { saved : a.saved, toasts : a.toasts });
        check('...and A\'s save leaves B\'s draft in the store (it is not A\'s)', a.draft && JSON.stringify(texts({ sheets : a.draft.sheets }, 'Sheet_001')) === '["Window B note"]' && a.draft.base === F0, a.draft);
        const mergesBefore = merges(w), fileBefore = Sha1File(bridge2.info.project);
        b = await step(B, 'save');
        check('B saves: refused before R2 (no merge-keys), the file untouched, the red toast', b.saved === false && merges(w) === mergesBefore && Sha1File(bridge2.info.project) === fileBefore && b.toasts.length === 1 && b.toasts[0].isError === true, { saved : b.saved, toasts : b.toasts });
        await A.close(); await B.close();
        const R = await OpenWindow(w, 'B2-reload', AUTOSAVE_NEW);
        const r = await R.cmd('boot', { storage : shared });
        check('B reloads in the same browser: B\'s draft is offered, once; the sheets are A\'s until answered', r.dialogs.length === 1 && r.dialogOpen && JSON.stringify(texts(r, 'Sheet_001')) === '["Window A note"]' && r.dirty === false, r);
        const st = await R.cmd('click', { label : 'Apply Draft' });
        check('Apply Draft puts B\'s note back, dirty', st.clicked && JSON.stringify(texts(st, 'Sheet_001')) === '["Window B note"]' && st.dirty === true, st);
        await R.close();
        check('no request left the harness unexpectedly (T2)', w.unexpected.length === 0, w.unexpected);
        await bridge2.close();
    }
    const errorsAll = [ ...WINDOW_ERRORS.entries() ].filter(([ , list ]) => list.length);
    check('no window in any scenario logged a console error', errorsAll.length === 0, errorsAll);

    check('the real 2026/3047__Doous project.json and notes are byte-for-byte unchanged', Sha1File(join(DOOUS_DIR, 'project.json')) === REAL.project && Sha1File(join(DOOUS_DIR, 'ValeVision__DrawingNotes__.json')) === REAL.notes);
    const passed = RESULTS.filter((r) => r.passed).length;
    console.log('\n' + (failures ? 'RESULT: FAIL' : 'RESULT: PASS') + ' - ' + passed + ' passed, ' + failures + ' failed');
    if (ARGS.out) writeFileSync(ARGS.out, JSON.stringify({ autosave : AUTOSAVE_NEW, old : AUTOSAVE_OLD, results : RESULTS, evidence : EVIDENCE }, null, 1));
    try { rmSync(SCRATCH, { recursive : true, force : true }); } catch (e) { /* temp */ }
    process.exit(failures ? 1 : 0);
}

if (ARGS.child) await RunChild(); else await RunParent();
