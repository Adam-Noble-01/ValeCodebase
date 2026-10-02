// =============================================================================
// VALEVISION3D - W1-12 NODE CHECK - THE DOCUMENT CODE AND PROJECTRECORD'S ROOT FACTS
// =============================================================================
//
// Scratch check for package W1-12 (never shipped). Loads the REAL modules at their browser URLs
// (http://localhost:8000/ValeVision3D/...) through module hooks - Na__DrawView__ProjectData__ and
// Na__LayoutEditor__ProjectRecord__ (the candidates, or the live files with --live), the ProjectLoader,
// the transport facade, LocalProjectMirror and the presentation scene data - over a stubbed fetch that
// plays the master index (the repository copy), the local server (the real 2026/3047__Doous project.json,
// held in memory), the editor Worker (1.5.0 and 1.6.0) and the CDN.
//
//   P  THE PAGE      - Na__Test__ProjectRecordAddress__.html's own module script, extracted from the page
//                      and run as the browser would run it (a minimal DOM, location and history)
//   A  INTERFACE     - TrueVision 1.6.0's 30 exports (read at the pin) + ValeVision's three; the save
//                      token and the save itself byte-identical to the file before W1-12
//   B  DOCUMENT CODE - every index entry, every local project.json, the three ?project= forms, an unknown
//                      token, odd values; the index is never fetched by ProjectData itself
//   C  SAVES         - the file before W1-12 and the file after it, same save, same requests (both Workers,
//                      the three ?project= forms)
//   D  PROJECTRECORD - the root facts, never the presentation block
//   M  MUTANTS       - ten planted faults, each must be caught
//
// Nothing is written outside the OS temp folder. USAGE: node w1_12_check.mjs [--live]
//
// =============================================================================

import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { register } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';


// -----------------------------------------------------------------------------
// REGION | Paths, Hosts and Fixtures
// -----------------------------------------------------------------------------

    const LIVE         = process.argv.includes('--live');
    const HERE         = dirname(fileURLToPath(import.meta.url));
    const APP_ROOT     = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
    const WCP_ROOT     = resolve(APP_ROOT, '..', 'Whitecardopedia');
    const INDEX_FILE   = join(WCP_ROOT, '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json');
    const PROJECTS_DIR = join(WCP_ROOT, 'Projects');
    const DOOUS_DIR    = join(PROJECTS_DIR, '2026', '3047__Doous');
    const CONFIG_FILE  = join(APP_ROOT, '02__Src__AppModules', '02__AppData', 'Na__AppConfig__Main.json');
    const SCRATCH      = mkdtempSync(join(tmpdir(), 'na-w1-12-check-'));
    const TV_REPO      = 'D:/11_RefLib__StudioRepository__RemoteSystem/NaWeb';
    const TV_APP       = 'na-apps/30__TrueVision__CoreAppCode/';
    const PIN          = 'b2aa9151';

    const PD_REL       = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    const PR_REL       = '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__ProjectRecord__.js';
    const CFAPI_REL    = '02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';
    const PRES_REL     = '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';
    const LOADER_REL   = '02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js';
    const PAGE_REL     = '80__Testing__PrototypeEnvironment/Na__Test__ProjectRecordAddress__.html';
    const PAGE_MOD_REL = '80__Testing__PrototypeEnvironment/Na__Test__ProjectRecordAddress__.page.mjs';   // <-- Virtual: the page's module script

    const FILES = {
        pd   : LIVE ? join(APP_ROOT, PD_REL)   : join(HERE, 'candidate__Na__DrawView__ProjectData__.js'),
        pr   : LIVE ? join(APP_ROOT, PR_REL)   : join(HERE, 'candidate__Na__LayoutEditor__ProjectRecord__.js'),
        page : LIVE ? join(APP_ROOT, PAGE_REL) : join(HERE, 'candidate__Na__Test__ProjectRecordAddress__.html'),
        pre  : join(HERE, 'preimage', 'Na__DrawView__ProjectData__.js')                                 // <-- ProjectData as W1-05 landed it
    };

    const FLASK_ORIGIN = 'http://localhost:8000';
    const FLASK_BASE   = FLASK_ORIGIN + '/ValeVision3D/';
    const PAGE_PATH    = '/ValeVision3D/' + PAGE_REL;
    const CDN_PROJECTS = 'https://cdn.noble-architecture.com/VaApps/Projects';
    const INDEX_URLS   = [
        'https://cdn.noble-architecture.com/VaApps/Index/Na__MasterIndex__ProjectLocations__.json',
        'https://adam-noble-01.github.io/ValeCodebase/WebApps/Whitecardopedia/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json',
        FLASK_ORIGIN + '/Whitecardopedia/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json'
    ];
    const WORKER_BASE  = 'https://editor-worker.test/api/editor';
    const API_KEY      = 'test-editor-key';
    const DOOUS        = '2026/3047__Doous';
    const DOOUS_PREFIX = 'VaApps/Projects/2026/3047__Doous/';
    const TOKENS       = [ DOOUS, '3047', '3047__Doous' ];
    const SAVED_ISO    = 'LayoutEditor__DrawingsData__SavedIso';

    const INDEX_TEXT   = readFileSync(INDEX_FILE, 'utf8');
    const INDEX        = JSON.parse(INDEX_TEXT);
    const DOOUS_DOC    = JSON.parse(readFileSync(join(DOOUS_DIR, 'project.json'), 'utf8'));
    const OWNED_KEYS   = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')).ProjectData__EditorOwnedKeys.ProjectData__EditorOwnedKeys__Keys;
    const REAL_HASHES  = { project : Sha1File(join(DOOUS_DIR, 'project.json')), index : Sha1File(INDEX_FILE) };

    const PAGE_HTML    = readFileSync(FILES.page, 'utf8');
    const PAGE_SCRIPT  = (PAGE_HTML.match(/<script type="module">([\s\S]*?)<\/script>/) || [])[1];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks and Helpers
// -----------------------------------------------------------------------------

    let failures = 0;
    let passes   = 0;
    let quietChecks = false;                                                     // <-- Mutant runs count their own failures
    let mutantFailures = 0;
    function check(name, passed, detail) {
        if (quietChecks) { if (!passed) mutantFailures++; return passed; }
        if (passed) passes++; else failures++;
        let text = (passed ? '  PASS  ' : '  FAIL  ') + name;
        if (!passed && detail !== undefined) {
            let shown;
            try { shown = JSON.stringify(detail); } catch (error) { shown = String(detail); }
            text += '  -> ' + (shown && shown.length > 900 ? shown.slice(0, 900) + '...' : shown);
        }
        logLine(text);
        return passed;
    }
    function section(title) { if (!quietChecks) logLine('\n' + title); }
    async function RunSection(body) {
        try { await body(); }
        catch (error) { check('the section ran to its end without throwing', false, (error && error.stack) ? error.stack.split('\n').slice(0, 5).join(' | ') : String(error)); }
    }

    const clone = (value) => JSON.parse(JSON.stringify(value));
    const tick  = () => new Promise((done) => setTimeout(done, 0));
    const same  = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    function Canon(value) {
        if (Array.isArray(value)) return '[' + value.map(Canon).join(',') + ']';
        if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + Canon(value[key])).join(',') + '}';
        return JSON.stringify(value);
    }
    function Digest(doc) {
        const block = doc && doc.LayoutEditor__DrawingsData;
        return block ? 'sha1:' + createHash('sha1').update(Canon(block)).digest('hex') : null;
    }
    function SavedIso(doc) {
        const block = doc && doc.LayoutEditor__DrawingsData;
        return (block && block[SAVED_ISO]) || null;
    }
    function JsonResponse(status, body) {
        return new Response(JSON.stringify(body), { status : status, headers : { 'Content-Type' : 'application/json' } });
    }
    function Sha1File(path) {
        return existsSync(path) ? createHash('sha1').update(readFileSync(path)).digest('hex') : null;
    }
    function TvText(rel) {
        return execFileSync('git', [ '-C', TV_REPO, 'show', PIN + ':' + TV_APP + rel ], { maxBuffer : 64 * 1024 * 1024 }).toString('utf8');
    }
    function ExportNames(text) {
        const block = (text.match(/export\s*\{([\s\S]*?)\};/) || [])[1] || '';
        return block.replace(/\/\/[^\n]*/g, '').split(',').map((name) => name.trim()).filter(Boolean).sort();
    }
    function FunctionText(text, name) {
        const start = text.indexOf('    function ' + name + '(') >= 0 ? text.indexOf('    function ' + name + '(') : text.indexOf('    async function ' + name + '(');
        if (start < 0) return null;
        const end = text.indexOf('\n    }\n', start);
        return text.slice(start, end + 7);
    }

    // CONSOLE | the modules' own lines are kept, not printed
    const consoleKept = [];
    const pageLines   = [];
    console.warn  = (...parts) => { consoleKept.push([ 'warn',  parts.map(String).join(' ') ]); };
    console.info  = (...parts) => { consoleKept.push([ 'info',  parts.map(String).join(' ') ]); };
    console.error = (...parts) => { consoleKept.push([ 'error', parts.map((part) => (part && part.message) || String(part)).join(' ') ]); };
    const logLine = console.log;
    console.log = (...parts) => {
        const text = parts.map(String).join(' ');
        if (/^\[(PASS|FAIL)\] |^HARNESS: /.test(text)) { pageLines.push(text); return; }
        if (text.startsWith('[')) { consoleKept.push([ 'log', text ]); return; }
        logLine(...parts);
    };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Hooks: the Modules at Their Browser URLs, Fresh per Case
// -----------------------------------------------------------------------------

    const OVERRIDES_FILE = join(SCRATCH, 'overrides.json');
    const HOOKS_SOURCE = [
        "import { readFileSync, existsSync } from 'node:fs';",
        "import { fileURLToPath } from 'node:url';",
        "let state = { appRootUrl : '', bases : [], overridesFile : '' };",
        "export async function initialize(data) { state = data; }",
        "function baseOf(url) { return state.bases.find((base) => url.startsWith(base)) || null; }",
        "function caseOf(url) { try { return new URL(url).searchParams.get('case'); } catch (error) { return null; } }",
        "export async function resolve(specifier, context, nextResolve) {",
        "    const parent = context.parentURL || '';",
        "    let target = null;",
        "    if (specifier.startsWith('http://') || specifier.startsWith('https://')) target = specifier;",
        "    else if (baseOf(parent) && (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/'))) target = new URL(specifier, parent).href;",
        "    if (target && baseOf(target)) {",
        "        const url = new URL(target);",
        "        const parentCase = caseOf(parent);",
        "        if (parentCase && !url.searchParams.has('case')) url.searchParams.set('case', parentCase);",
        "        return { url : url.href, shortCircuit : true };",
        "    }",
        "    return nextResolve(specifier, context);",
        "}",
        "export async function load(url, context, nextLoad) {",
        "    const plain = url.split('?')[0];",
        "    const base = baseOf(plain);",
        "    if (!base) return nextLoad(url, context);",
        "    const rel = decodeURIComponent(plain.slice(base.length));",
        "    let file = fileURLToPath(state.appRootUrl + rel);",
        "    let source = null;",
        "    if (state.overridesFile && existsSync(state.overridesFile)) {",
        "        const o = JSON.parse(readFileSync(state.overridesFile, 'utf8'));",
        "        const kase = caseOf(url);",
        "        const entry = (kase && o.cases && o.cases[kase] && o.cases[kase][rel]) || (o.all && o.all[rel]) || null;",
        "        if (entry && entry.file) file = entry.file;",
        "        if (entry && typeof entry.source === 'string') source = entry.source;",
        "    }",
        "    return { format : 'module', source : (source !== null) ? source : readFileSync(file, 'utf8'), shortCircuit : true };",
        "}"
    ].join('\n');
    const HOOKS_FILE = join(SCRATCH, 'hooks.mjs');
    writeFileSync(HOOKS_FILE, HOOKS_SOURCE);

    const OVERRIDES = { all : {}, cases : {} };
    OVERRIDES.all[PD_REL]       = { file : FILES.pd };
    OVERRIDES.all[PR_REL]       = { file : FILES.pr };
    OVERRIDES.all[PAGE_MOD_REL] = { source : PAGE_SCRIPT || 'throw new Error("no module script in the page");' };
    function SaveOverrides() { writeFileSync(OVERRIDES_FILE, JSON.stringify(OVERRIDES, null, 1)); }
    SaveOverrides();

    register(pathToFileURL(HOOKS_FILE).href, {
        parentURL : import.meta.url,
        data      : { appRootUrl : pathToFileURL(APP_ROOT + '/').href, bases : [ FLASK_BASE ], overridesFile : OVERRIDES_FILE }
    });

    // THE PAGE | a fresh window, location, history and document per case
    function NewDocument() {
        const make = (id) => ({ id : id || '', className : '', innerHTML : '', textContent : '', children : [], appendChild(child) { this.children.push(child); return child; } });
        const byId = {};
        return { getElementById : (id) => byId[id] || (byId[id] = make(id)), createElement : () => make(), byId };
    }
    function NewPage(search) {
        const win = new EventTarget();
        win.location = { protocol : 'http:', hostname : 'localhost', port : '8000', origin : FLASK_ORIGIN, pathname : PAGE_PATH, search : search || '',
                         get href() { return FLASK_ORIGIN + this.pathname + this.search; } };
        win.setTimeout = setTimeout; win.clearTimeout = clearTimeout;
        globalThis.window   = win;
        globalThis.location = win.location;
        globalThis.history  = { replaceState : (state, title, url) => { const next = new URL(url, win.location.href); win.location.pathname = next.pathname; win.location.search = next.search; } };
        globalThis.document = NewDocument();
        return win;
    }
    let caseNumber = 0;
    function NextCase(overridesForCase) {
        caseNumber += 1;
        const kase = String(caseNumber);
        if (overridesForCase) { OVERRIDES.cases[kase] = overridesForCase; SaveOverrides(); }
        return { kase, q : '?case=' + kase };
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Fake Services: Index, Editor Config, Worker, R2 and CDN, Local Server
// -----------------------------------------------------------------------------

    function NewWorld(settings) {
        const world = Object.assign({ worker : '1.6.0' }, settings || {});
        world.r2 = new Map(); world.disk = new Map();
        world.log = []; world.unexpected = []; world.violations = [];
        world.bumps = 0; world.seq = 0; world.indexRequests = 0;
        return world;
    }
    function PutR2Json(world, key, value) { world.r2.set(key, { bytes : Buffer.from(JSON.stringify(value, null, 4)), type : 'application/json' }); }
    function GetR2Json(world, key) { const one = world.r2.get(key); return one ? JSON.parse(one.bytes.toString('utf8')) : null; }
    function DoousWorld(settings) {
        const world = NewWorld(settings);
        PutR2Json(world, DOOUS_PREFIX + 'project.json', DOOUS_DOC);
        world.disk.set(DOOUS, clone(DOOUS_DOC));
        return world;
    }

    function MakeFetch(world) {
        return async function (input, init) {
            const url     = new URL(String(input instanceof URL ? input.href : input), globalThis.window.location.href).href;
            const options = init || {};
            const method  = String(options.method || 'GET').toUpperCase();
            const headers = {};
            Object.entries(options.headers || {}).forEach(([ name, value ]) => { headers[name.toLowerCase()] = String(value); });
            const record = { n : ++world.seq, method : method, url : url, headers : headers, bodyText : (typeof options.body === 'string') ? options.body : null };
            world.log.push(record);
            try { return await Route(world, record); }
            catch (error) { world.unexpected.push(method + ' ' + url + ' : ' + error.message); return JsonResponse(500, { error : 'test stub failed: ' + error.message }); }
        };
    }

    async function Route(world, rec) {
        const plain = rec.url.split('?')[0];
        if (INDEX_URLS.indexOf(plain) !== -1) { world.indexRequests += 1; return new Response(INDEX_TEXT, { status : 200, headers : { 'Content-Type' : 'application/json' } }); }
        if (plain === FLASK_ORIGIN + '/api/editor-config') return JsonResponse(200, { workerApiBaseUrl : WORKER_BASE, apiKey : API_KEY });
        if (plain === WORKER_BASE + '/health') {
            return (world.worker === '1.6.0')
                ? JsonResponse(200, { ok : true, worker : 'whitecardopedia-editor-api', version : '1.6.0', routes : [ 'save', 'assets', 'drawing-notes', 'project', 'merge-keys', 'files' ] })
                : JsonResponse(200, { ok : true, worker : 'whitecardopedia-editor-api' });
        }
        if (plain.startsWith(WORKER_BASE + '/projects/')) return WorkerRoute(world, rec);
        if (plain.startsWith(CDN_PROJECTS + '/')) return CdnRoute(world, rec);
        if (rec.url.startsWith(FLASK_ORIGIN + '/')) return LocalRoute(world, rec);
        world.unexpected.push(rec.method + ' ' + rec.url);
        return JsonResponse(404, { error : 'unexpected request in the test' });
    }

    const NEW_SUFFIXES = [ '/files/read', '/files/write', '/files/upload', '/files/list', '/files/copy', '/files/delete', '/merge-keys', '/project' ];
    const OLD_SUFFIXES = [ '/visibility', '/rename', '/delete', '/drawing-notes', '/assets' ];
    async function WorkerRoute(world, rec) {
        const url  = new URL(rec.url);
        const rest = url.pathname.slice('/api/editor/projects/'.length);
        let suffix = '';
        for (const one of NEW_SUFFIXES.concat(OLD_SUFFIXES)) { if (rest.length > one.length && rest.endsWith(one)) { suffix = one; break; } }
        const folderId = decodeURIComponent(rest.slice(0, rest.length - suffix.length));
        rec.worker = { suffix : suffix, folderId : folderId };
        if (rec.headers['x-editor-api-key'] !== API_KEY) return JsonResponse(401, { error : 'Unauthorized' });
        if (world.worker === '1.5.0' && NEW_SUFFIXES.indexOf(suffix) !== -1) {
            world.violations.push(rec.method + ' ' + suffix + ' sent to a 1.5.0 worker');
            return JsonResponse(400, { error : 'Missing required field: projectCode' });
        }
        const prefix = 'VaApps/Projects/' + folderId + '/';
        const body   = rec.bodyText ? JSON.parse(rec.bodyText) : null;
        if (suffix === '' && rec.method === 'POST') {
            if (!body || !body.projectCode) return JsonResponse(400, { error : 'Missing required field: projectCode' });
            PutR2Json(world, prefix + 'project.json', body);
            world.bumps += 1;
            return JsonResponse(200, { success : true, message : 'Project ' + folderId + ' saved to R2.' });
        }
        if (suffix === '/project' && rec.method === 'GET') {
            const doc = GetR2Json(world, prefix + 'project.json');
            return doc ? JsonResponse(200, doc) : JsonResponse(404, { error : 'No project.json on R2', missing : true });
        }
        if (suffix === '/merge-keys' && rec.method === 'POST') {
            const set = body.set || {}, remove = body.remove || [];
            const refused = Object.keys(set).filter((key) => OWNED_KEYS.indexOf(key) === -1);
            if (refused.length) return JsonResponse(400, { error : 'Refused key(s): ' + refused.join(', '), refused : refused.map((key) => ({ key, op : 'set' })) });
            const doc = GetR2Json(world, prefix + 'project.json');
            if (!doc) return JsonResponse(409, { error : 'No project.json on R2', missing : true });
            const merged = Object.assign({}, doc, set);
            remove.forEach((key) => { delete merged[key]; });
            PutR2Json(world, prefix + 'project.json', merged);
            return JsonResponse(200, { success : true, drawings : { savedIso : SavedIso(merged) } });
        }
        return JsonResponse(404, { error : 'No route matched' });
    }

    function CdnRoute(world, rec) {
        const url = new URL(rec.url);
        const key = 'VaApps/Projects/' + decodeURIComponent(url.pathname.slice('/VaApps/Projects/'.length));
        const one = world.r2.get(key);
        if (!one) return new Response('Not Found', { status : 404 });
        return new Response(one.bytes, { status : 200, headers : { 'Content-Type' : one.type } });
    }

    async function LocalRoute(world, rec) {
        const url  = new URL(rec.url);
        const path = decodeURIComponent(url.pathname);
        if (path === '/api/health') return JsonResponse(200, { status : 'ok', service : 'whitecardopedia-local-dev', app : 'ValeVision3D', port : 8000 });
        if (!path.startsWith('/api/projects/')) { world.unexpected.push(rec.method + ' ' + rec.url); return JsonResponse(404, { error : 'no such route in the test' }); }
        let rest = path.slice('/api/projects/'.length);
        let sub  = '';
        const fingerprint = rest.match(/^(.*)\/drawings-fingerprint$/);
        if (fingerprint) { rest = fingerprint[1]; sub = 'fingerprint'; }
        rec.local = { folderId : rest, sub : sub };
        const doc = world.disk.get(rest);
        if (sub === 'fingerprint') {
            if (!doc) return JsonResponse(404, { error : 'Project not found: ' + rest });
            return JsonResponse(200, { status : 'ok', folderId : rest, drawings : { savedIso : SavedIso(doc), digest : Digest(doc) } });
        }
        if (rec.method === 'GET') return doc ? JsonResponse(200, doc) : JsonResponse(404, { error : 'Project not found: ' + rest });
        const base = rec.headers['x-valevision-drawings-base'];
        if (base !== undefined && (base.trim() || 'none') !== (Digest(doc) || 'none')) {
            return JsonResponse(409, { error : 'The drawings on disk are not the ones this window loaded', conflict : true, drawings : { savedIso : SavedIso(doc), digest : Digest(doc) } });
        }
        const incoming = JSON.parse(rec.bodyText);
        world.disk.set(rest, incoming);
        return JsonResponse(200, { success : true, message : 'saved', drawings : { savedIso : SavedIso(incoming), digest : Digest(incoming) }, backup : 'C:/Backups/project.json' });
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Runners: the Page, and the Modules Directly
// -----------------------------------------------------------------------------

    async function RunPage(overridesForCase) {
        const { q } = NextCase(overridesForCase);
        const world = DoousWorld();
        NewPage('');
        globalThis.fetch = MakeFetch(world);
        pageLines.length = 0;
        await import(FLASK_BASE + PAGE_MOD_REL + q);
        return { result : globalThis.window.__TEST_RESULT || null, world, lines : pageLines.slice(), doc : globalThis.document };
    }

    async function OpenModules(search, world, overridesForCase) {
        const { q } = NextCase(overridesForCase);
        NewPage(search);
        globalThis.fetch = MakeFetch(world);
        const loader = await import(FLASK_BASE + LOADER_REL + q);
        const cf     = await import(FLASK_BASE + CFAPI_REL + q);
        const pres   = await import(FLASK_BASE + PRES_REL + q);
        const data   = await import(FLASK_BASE + PD_REL + q);
        const record = await import(FLASK_BASE + PR_REL + q);
        return { loader, cf, pres, data, record, world, q };
    }
    function SetSearch(search) { globalThis.window.location.search = search; }

    // B-a, as a function: ProjectData never fetches the index itself (also run against the mutants)
    async function CheckNoEarlyIndexFetch(overridesForCase) {
        const world = DoousWorld();
        const c = await OpenModules('?project=' + DOOUS, world, overridesForCase);
        const before = c.data.Na__DrawData__GetDocumentCode();
        await tick();
        const noData = check('before the index has settled and with no project data: null', before === null, before);
        const noFetch = check('...and ProjectData started no index fetch of its own', world.indexRequests === 0, world.indexRequests);
        c.cf.Na__CfApi__SetLoadedProjectData(clone(DOOUS_DOC));
        const loaded = c.data.Na__DrawData__GetDocumentCode();
        const withData = check('with project data registered (the loading sequence registers it after the index): 3047', loaded === '3047', loaded);
        check('...still no index fetch', world.indexRequests === 0, world.indexRequests);
        c.cf.Na__CfApi__SetLoadedProjectData(null);
        await c.loader.Na__AppUtils__InitMasterIndex();                         // <-- The loading sequence's own load
        const first = c.data.Na__DrawData__GetDocumentCode();
        await tick();
        const later = c.data.Na__DrawData__GetDocumentCode();
        check('once the index has settled, no data: the first call is null or 3047, then 3047', (first === null || first === '3047') && later === '3047', { first, later });
        check('exactly one index request in all - the loading sequence\'s memoised load', world.indexRequests === 1, world.indexRequests);
        return noData && noFetch && withData;
    }

// endregion -------------------------------------------------------------------


logLine('W1-12 node check - ' + (LIVE ? 'LIVE files' : 'candidates') + ' (' + SCRATCH + ')');


// -----------------------------------------------------------------------------
// REGION | P. The Page
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('P. THE PAGE | Na__Test__ProjectRecordAddress__.html\'s own module script, run as the browser runs it');
    check('the page has one module script', typeof PAGE_SCRIPT === 'string' && PAGE_SCRIPT.length > 1000);
    const run = await RunPage();
    const r   = run.result;
    check('the page ran and published window.__TEST_RESULT', !!r && Array.isArray(r.cases), r);
    if (r) {
        r.cases.forEach((one) => check('page case: ' + one.name, one.ok, one.rows.filter((row) => !row.ok)));
        check('the page reports no failed case (' + r.pass + ' of ' + r.cases.length + ')', r.fail === 0 && r.cases.length >= 14, { pass : r.pass, fail : r.fail });
    }
    check('its summary line reads ALL n CASES PASS', run.doc.byId.out && run.doc.byId.out.children.some((el) => el.id === 'summary' && /^ALL \d+ CASES PASS$/.test(el.textContent)));
    check('it logs HARNESS: ALL PASS', run.lines.includes('HARNESS: ALL PASS'), run.lines.filter((line) => line.startsWith('HARNESS')));
    check('it asked the local server for 2026/3047__Doous with GETs only, and nothing else unexpected',
        run.world.log.every((rec) => rec.method === 'GET') && run.world.unexpected.length === 0 && run.world.log.some((rec) => rec.url === FLASK_ORIGIN + '/api/projects/' + DOOUS), run.world.log.map((rec) => rec.method + ' ' + rec.url));
    check('it leaves the page address as it was opened (no ?project=)', globalThis.window.location.search === '', globalThis.window.location.search);
    check('the page carries no Noble Architecture content (no NA project codes, addresses or paths)',
        !/PS01|RB05|Musters|West Beacon|na-project-portal|\/na-apps\/|NaProjectPortal|ProjectAdmin__|PlanVision__ProjectData/.test(PAGE_HTML));
    check('the page leaves the service worker and the caches alone', !/serviceWorker|caches\.(keys|delete)/.test(PAGE_SCRIPT));
});


// -----------------------------------------------------------------------------
// REGION | A. The Interface
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('A. THE INTERFACE | TrueVision 1.6.0\'s exports (read at the pin) plus ValeVision\'s three; the save path untouched');
    const tvPd    = TvText(PD_REL);
    const tvPr    = TvText(PR_REL);
    const pdText  = readFileSync(FILES.pd, 'utf8');
    const preText = readFileSync(FILES.pre, 'utf8');
    const prText  = readFileSync(FILES.pr, 'utf8');
    const c = await OpenModules('?project=' + DOOUS, DoousWorld());
    const tvNames = ExportNames(tvPd);
    const vvOnly  = [ 'Na__DrawData__GetDocumentCode', 'Na__DrawData__GetLayoutModeEnabled', 'Na__DrawData__SetLayoutModeEnabled' ];
    const names   = Object.keys(c.data).sort();
    check('TrueVision 1.6.0 exports 30 names at the pin', tvNames.length === 30, tvNames.length);
    check('every one of them is exported', tvNames.every((name) => name in c.data), tvNames.filter((name) => !(name in c.data)));
    check('ValeVision\'s three are exported (DR-25 x2, DR-11)', vvOnly.every((name) => name in c.data));
    check('nothing else is exported (33 = 30 + 3)', same(names, tvNames.concat(vvOnly).sort()), names.filter((name) => tvNames.concat(vvOnly).indexOf(name) === -1));
    check('the export block lists the names in the file\'s own order with GetDocumentCode after the Layout Mode pair',
        /Na__DrawData__SetLayoutModeEnabled,[^\n]*\n\s*Na__DrawData__GetDocumentCode,/.test(pdText));
    check('GetProjectCode (the save token) is TrueVision\'s text, unchanged', FunctionText(pdText, 'Na__DrawData__GetProjectCode') === FunctionText(tvPd, 'Na__DrawData__GetProjectCode') && FunctionText(pdText, 'Na__DrawData__GetProjectCode') !== null);
    [ 'Na__DrawData__Save', 'Na__DrawData__Load', 'Na__DrawData__LearnBase', 'Na__DrawData__CheckBase', 'Na__DrawView__ProjectData__Initialize', 'Na__DrawData__R2SaveOptions' ].forEach((name) => {
        check(name + ' is byte-identical to the file before W1-12', FunctionText(pdText, name) !== null && FunctionText(pdText, name) === FunctionText(preText, name));
    });
    const importsOf = (text) => [ ...text.matchAll(/^\s*import\s*\{([^}]*)\}\s*from\s*'([^']+)'/gm) ].map((m) => ({ names : m[1].split(',').map((n) => n.trim()).filter(Boolean).sort(), from : m[2] }));
    const preImports = importsOf(preText);
    const newImports = importsOf(pdText);
    check('TrueVision\'s four import statements are unchanged and come first', same(newImports.slice(0, preImports.length), preImports));
    check('the added imports are the document code\'s four names, from the facade and the ProjectLoader',
        same(newImports.slice(preImports.length), [ { names : [ 'Na__CfApi__GetLoadedProjectData' ], from : '../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js' },
                                                   { names : [ 'Na__AppUtils__GetProjectFolderFromUrl', 'Na__AppUtils__GetYearFromUrl', 'Na__AppUtils__InitMasterIndex' ], from : '../03__AppUtils/Na__AppUtils__ProjectLoader.js' } ]),
        newImports.slice(preImports.length));
    check('R2 judging is still OFF (DR-30)', /const Na__DrawData__R2_JUDGING = false;/.test(pdText));
    check('ProjectRecord exports TrueVision\'s three names', same(Object.keys(c.record).sort(), ExportNames(tvPr)), Object.keys(c.record));
    check('ProjectRecord imports one name, the facade\'s GetLoadedProjectData (no presentation module, no TrueVision admin locations)',
        same(importsOf(prText), [ { names : [ 'Na__CfApi__GetLoadedProjectData' ], from : '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js' } ]), importsOf(prText));
    check('Na__LeRecord__ComposeClientName is TrueVision\'s text', FunctionText(prText.replace(/\r\n/g, '\n'), 'Na__LeRecord__ComposeClientName') === FunctionText(tvPr, 'Na__LeRecord__ComposeClientName'));
    check('ProjectRecord keeps its own file line ending (CRLF throughout)', LIVE ? (prText.split('\n').length - 1 === (prText.match(/\r\n/g) || []).length) : true);
});


// -----------------------------------------------------------------------------
// REGION | B. The Document Code
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('B. THE DOCUMENT CODE | the loaded project.json, then the master index, never the folder; ProjectData never fetches the index');
    await CheckNoEarlyIndexFetch();

    const world = DoousWorld();
    const c = await OpenModules('?project=' + DOOUS, world);
    await c.loader.Na__AppUtils__InitMasterIndex();
    c.data.Na__DrawData__GetDocumentCode();                                      // <-- First ask: the map arrives next tick
    await tick();

    // Every master-index entry, opened by its folderId and by its code, with no project data
    const entries = INDEX.projects.filter((entry) => entry && entry.folderId && entry.projectCode);
    const wrong = [];
    entries.forEach((entry) => {
        SetSearch('?project=' + entry.folderId);
        const got = c.data.Na__DrawData__GetDocumentCode();
        if (got !== String(entry.projectCode)) wrong.push({ token : entry.folderId, got, want : entry.projectCode });
        if (c.data.Na__DrawData__GetProjectCode() !== entry.folderId) wrong.push({ token : entry.folderId, saveToken : c.data.Na__DrawData__GetProjectCode() });
    });
    check('all ' + entries.length + ' master-index entries opened as ?project=<folderId>, no data: the entry\'s projectCode; the save token stays the folderId', wrong.length === 0, wrong.slice(0, 5));
    const prefixed = entries.filter((entry) => String(entry.folderId.split('/')[1] || '').split('__')[0] !== String(entry.projectCode));
    check('...including the ' + prefixed.length + ' whose folder name carries a prefix (AN-61960__... reads 61960)', prefixed.length > 0 && prefixed.every((entry) => { SetSearch('?project=' + entry.folderId); return c.data.Na__DrawData__GetDocumentCode() === String(entry.projectCode); }));
    const byCode = [];
    entries.forEach((entry) => {
        SetSearch('?project=' + entry.projectCode);
        const got = c.data.Na__DrawData__GetDocumentCode();
        if (got !== String(entry.projectCode)) byCode.push({ token : entry.projectCode, got });
    });
    check('every entry opened as ?project=<code>: that code back (a scheme sibling resolves to the newest year, as the loader does)', byCode.length === 0, byCode.slice(0, 5));

    // Every local project.json, loaded
    const files = [];
    for (const year of readdirSync(PROJECTS_DIR)) {
        const yearDir = join(PROJECTS_DIR, year);
        if (!statSync(yearDir).isDirectory()) continue;
        for (const folder of readdirSync(yearDir)) {
            const file = join(yearDir, folder, 'project.json');
            if (existsSync(file)) files.push({ folderId : year + '/' + folder, doc : JSON.parse(readFileSync(file, 'utf8')) });
        }
    }
    const offenders = [];
    files.forEach((one) => {
        SetSearch('?project=' + one.folderId);
        c.cf.Na__CfApi__SetLoadedProjectData(one.doc);
        const got = c.data.Na__DrawData__GetDocumentCode();
        if (got !== String(one.doc.projectCode).trim() || /\//.test(got || '')) offenders.push({ folderId : one.folderId, got, projectCode : one.doc.projectCode });
    });
    check('all ' + files.length + ' local project.json files, loaded: their own projectCode, never a folder path', files.length >= 150 && offenders.length === 0, offenders.slice(0, 5));

    // The three ways Doous is opened
    TOKENS.forEach((token) => {
        SetSearch('?project=' + token);
        c.cf.Na__CfApi__SetLoadedProjectData(clone(DOOUS_DOC));
        const withData = c.data.Na__DrawData__GetDocumentCode();
        c.cf.Na__CfApi__SetLoadedProjectData(null);
        const fromIndex = c.data.Na__DrawData__GetDocumentCode();
        check('?project=' + token + ': 3047 from project.json and 3047 from the index; GetProjectCode is the token itself',
            withData === '3047' && fromIndex === '3047' && c.data.Na__DrawData__GetProjectCode() === token, { withData, fromIndex, save : c.data.Na__DrawData__GetProjectCode() });
    });

    // Odd values never throw and never leak the folder
    SetSearch('?project=' + DOOUS);
    const odd = [ [], 'a string', { projectCode : {} }, { projectCode : null }, { projectCode : NaN }, { projectCode : '   ' }, { projectCode : Infinity } ];
    const oddAnswers = odd.map((value) => { c.cf.Na__CfApi__SetLoadedProjectData(value); try { return c.data.Na__DrawData__GetDocumentCode(); } catch (error) { return 'THREW ' + error.message; } });
    check('odd project data (an array, a string, a code that is an object, null, NaN, blank, Infinity): the index answers 3047, nothing throws', oddAnswers.every((answer) => answer === '3047'), oddAnswers);
    c.cf.Na__CfApi__SetLoadedProjectData(null);
    SetSearch('?project=2099/0000__NoSuchProject');
    check('a token nothing knows, no data: null', c.data.Na__DrawData__GetDocumentCode() === null);
    SetSearch('');
    check('no ?project= at all: null (as GetProjectCode answers null)', c.data.Na__DrawData__GetDocumentCode() === null && c.data.Na__DrawData__GetProjectCode() === null);

    // TrueVision's own address form, before the index: the ask starts the same memoised load early (documented edge)
    const w2 = DoousWorld();
    const c2 = await OpenModules('?project-folder=3047__Doous&year=2026', w2);
    const early = c2.data.Na__DrawData__GetDocumentCode();
    await tick(); await tick();
    const after = c2.data.Na__DrawData__GetDocumentCode();
    const again = await c2.loader.Na__AppUtils__InitMasterIndex();
    check('TrueVision\'s ?project-folder=&year= form before any load: the ask starts the loader\'s one memoised load (1 request, shared), then 3047',
        early === null && after === '3047' && w2.indexRequests === 1 && again instanceof Map, { early, after, requests : w2.indexRequests });
});


// -----------------------------------------------------------------------------
// REGION | C. Saves: the File Before W1-12 and After It, Same Requests
// -----------------------------------------------------------------------------

    async function SaveRun(variantFile, token, worker) {
        const world = DoousWorld({ worker });
        const c = await OpenModules('?project=' + token, world, { [PD_REL] : { file : variantFile } });
        const toasts = [];
        const toast  = (message, isError) => toasts.push({ message : String(message), isError : isError === true });
        const ready  = await c.cf.Na__CfApi__Initialize();
        c.cf.Na__CfApi__SetLoadedProjectData(clone(DOOUS_DOC));
        c.pres.Na__PresentationMode__ProjectJson__SetActiveConfig(clone(DOOUS_DOC.PresentationMode__SavedCameraScenes), token);
        c.data.Na__DrawView__ProjectData__Initialize();
        globalThis.window.dispatchEvent(new CustomEvent(c.data.Na__DrawData__LOADED_EVENT, { detail : {
            block : clone(DOOUS_DOC.LayoutEditor__DrawingsData), projectCode : token, sceneConfig : clone(DOOUS_DOC.PresentationMode__SavedCameraScenes) } }));
        await c.data.Na__DrawData__WhenBaseKnown();
        const docCode = (typeof c.data.Na__DrawData__GetDocumentCode === 'function') ? c.data.Na__DrawData__GetDocumentCode() : '(none)';
        const report = {};
        const saved  = await c.data.Na__DrawData__Save(toast, report);
        const scrub  = (text) => (text === null) ? null : text.replace(/"LayoutEditor__DrawingsData__SavedIso":\s*"[^"]*"/g, '"LayoutEditor__DrawingsData__SavedIso":"<stamp>"');
        const requests = world.log.map((rec) => ({ method : rec.method, url : rec.url, headers : Object.keys(rec.headers).sort().map((name) => name + ': ' + rec.headers[name]), body : scrub(rec.bodyText) }));
        return { ready, saved, report, toasts, requests, docCode, r2Keys : [ ...world.r2.keys() ].sort(), world,
                 r2Doc : GetR2Json(world, DOOUS_PREFIX + 'project.json'), disk : world.disk.get(DOOUS) };
    }

await RunSection(async () => {
    section('C. SAVES | ProjectData before W1-12 and after it: the same save sends the same requests to the same places');
    for (const worker of [ '1.6.0', '1.5.0' ]) {
        for (const token of TOKENS) {
            const before = await SaveRun(FILES.pre, token, worker);
            const after  = await SaveRun(FILES.pd,  token, worker);
            const label  = 'Worker ' + worker + ', ?project=' + token;
            check(label + ': both saves land, with the local copy, and toast nothing (a report was passed)',
                before.saved === true && after.saved === true && after.report.cloudSaved === true && after.report.local && after.report.local.ok === true && after.toasts.length === 0 && before.toasts.length === 0,
                { before : [ before.saved, before.toasts ], after : [ after.saved, after.toasts, after.report.local ] });
            check(label + ': identical requests, in the same order (' + after.requests.length + '; the saved stamp blanked)', same(before.requests, after.requests),
                before.requests.map((r, i) => same(r, after.requests[i]) ? null : { i, before : r.method + ' ' + r.url, after : after.requests[i] && (after.requests[i].method + ' ' + after.requests[i].url) }).filter(Boolean).slice(0, 4));
            check(label + ': every R2 key under VaApps/Projects/2026/3047__Doous/, every local call to /api/projects/2026/3047__Doous',
                after.r2Keys.every((key) => key.startsWith(DOOUS_PREFIX)) && after.world.log.filter((rec) => rec.url.startsWith(FLASK_ORIGIN + '/api/projects/')).every((rec) => rec.url.startsWith(FLASK_ORIGIN + '/api/projects/2026/3047__Doous')),
                { r2 : after.r2Keys, local : after.world.log.filter((rec) => rec.url.startsWith(FLASK_ORIGIN + '/api/projects/')).map((rec) => rec.url) });
            check(label + ': R2 and the disk get the same drawings block as before W1-12 (stamp aside)',
                same(Canon(Object.assign({}, before.r2Doc.LayoutEditor__DrawingsData, { [SAVED_ISO] : 0 })), Canon(Object.assign({}, after.r2Doc.LayoutEditor__DrawingsData, { [SAVED_ISO] : 0 })))
                && same(Canon(Object.assign({}, before.disk.LayoutEditor__DrawingsData, { [SAVED_ISO] : 0 })), Canon(Object.assign({}, after.disk.LayoutEditor__DrawingsData, { [SAVED_ISO] : 0 }))));
            check(label + ': no unexpected request, no 1.6.0 route to an old Worker', after.world.unexpected.length === 0 && after.world.violations.length === 0, after.world.unexpected.concat(after.world.violations));
            check(label + ': after W1-12 the same window answers the document code 3047', after.docCode === '3047' && before.docCode === '(none)', { before : before.docCode, after : after.docCode });
        }
    }
});


// -----------------------------------------------------------------------------
// REGION | D. ProjectRecord
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('D. PROJECTRECORD | the root of the loaded project data, never the presentation block');
    const c = await OpenModules('?project=' + DOOUS, DoousWorld());
    const decoys = { siteAddress : 'DECOY', clientDrawingName : 'DECOY' };
    const fetchWith = async (data, presentation) => {
        c.cf.Na__CfApi__SetLoadedProjectData(data);
        c.pres.Na__PresentationMode__ProjectJson__SetActiveConfig(presentation, DOOUS);
        const promise = c.record.Na__LeRecord__Fetch();
        return { isPromise : promise instanceof Promise, value : await promise };
    };
    const root = clone(DOOUS_DOC);
    root.siteAddress = ' 1 Test Lane, Testville, TE1 1ST '; root.clientDrawingName = { salutation : 'Mrs', initial : 'A', surname : 'Doous' };
    const one = await fetchWith(root, Object.assign(clone(DOOUS_DOC.PresentationMode__SavedCameraScenes), decoys));
    check('root keys: trimmed address, composed client ("Mrs A. Doous"); a promise', one.isPromise && same(one.value, { Client : 'Mrs A. Doous', SiteAddress : '1 Test Lane, Testville, TE1 1ST' }), one);
    const composed = clone(DOOUS_DOC); composed.clientDrawingName = { composed : '  Mr and Mrs Doous ', surname : 'ignored' };
    check('a stored composition wins', same((await fetchWith(composed, null)).value, { Client : 'Mr and Mrs Doous', SiteAddress : '' }));
    check('only the presentation block carries them: empty (the 1.0.0 fault)', same((await fetchWith(clone(DOOUS_DOC), Object.assign({}, decoys))).value, { Client : '', SiteAddress : '' }));
    check('no project data: empty, and still a promise', (await fetchWith(null, decoys)).isPromise && same((await fetchWith(null, decoys)).value, { Client : '', SiteAddress : '' }));
    check('project data that is an array: empty, nothing thrown', same((await fetchWith([ 1, 2 ], null)).value, { Client : '', SiteAddress : '' }));
    const nonString = clone(DOOUS_DOC); nonString.siteAddress = 42; nonString.clientDrawingName = 7;
    check('non-string values: empty', same((await fetchWith(nonString, null)).value, { Client : '', SiteAddress : '' }));
    check('Reset answers true (nothing cached)', c.record.Na__LeRecord__Reset() === true);
    check('ComposeClientName: "Mr P." + surname with or without the full stop', c.record.Na__LeRecord__ComposeClientName({ salutation : 'Mr', initial : 'P.', surname : 'Doous' }) === 'Mr P. Doous'
        && c.record.Na__LeRecord__ComposeClientName({ salutation : 'Mr', initial : 'P', surname : 'Doous' }) === 'Mr P. Doous');
});


// -----------------------------------------------------------------------------
// REGION | E. The Seed: SheetModel__Common__ Fills the Pack's Common Fields From the Root Facts
// -----------------------------------------------------------------------------

    const COMMON_REL = '02__Src__AppModules/51__System__LayoutEditor/07__Core__SheetData/Na__LayoutEditor__SheetModel__Common__.js';

await RunSection(async () => {
    section('E. THE SEED | the real Na__LayoutEditor__SheetModel__Common__ seeds the pack from the root facts, never from the presentation block');
    const decoys = { siteAddress : 'DECOY presentation address', clientDrawingName : 'DECOY presentation client' };

    // E1 | root facts, nothing typed on any sheet: the record IS the answer
    const c1 = await OpenModules('?project=' + DOOUS, DoousWorld());
    const common1 = await import(FLASK_BASE + COMMON_REL + c1.q);
    const root = clone(DOOUS_DOC);
    root.siteAddress = '1 Test Lane, Testville, TE1 1ST'; root.clientDrawingName = { salutation : 'Mr', initial : 'J', surname : 'Doous' };
    c1.cf.Na__CfApi__SetLoadedProjectData(root);
    c1.pres.Na__PresentationMode__ProjectJson__SetActiveConfig(Object.assign(clone(DOOUS_DOC.PresentationMode__SavedCameraScenes), decoys), DOOUS);
    common1.Na__LeCommon__Reset();
    const changed1 = await common1.Na__LeCommon__Seed([ { Sheet__Order : 1, Sheet__Fields : {} } ]);
    check('a project.json with root siteAddress and clientDrawingName seeds the Common fields (Seed reports a change)',
        changed1 === true && same(c1.data.Na__DrawData__GetCommonFields(), { Client : 'Mr J. Doous', SiteAddress : '1 Test Lane, Testville, TE1 1ST' }), c1.data.Na__DrawData__GetCommonFields());
    check('...and a sheet on Common prints them', common1.Na__LeCommon__Value({ Sheet__Fields : {} }, 'SiteAddress') === '1 Test Lane, Testville, TE1 1ST' && common1.Na__LeCommon__Value({ Sheet__Fields : {} }, 'Client') === 'Mr J. Doous');

    // E2 | only the presentation block carries them: nothing is seeded
    const c2 = await OpenModules('?project=' + DOOUS, DoousWorld());
    const common2 = await import(FLASK_BASE + COMMON_REL + c2.q);
    c2.cf.Na__CfApi__SetLoadedProjectData(clone(DOOUS_DOC));
    c2.pres.Na__PresentationMode__ProjectJson__SetActiveConfig(Object.assign(clone(DOOUS_DOC.PresentationMode__SavedCameraScenes), decoys), DOOUS);
    common2.Na__LeCommon__Reset();
    const changed2 = await common2.Na__LeCommon__Seed([ { Sheet__Order : 1, Sheet__Fields : {} } ]);
    check('the presentation block is not read for these facts: nothing seeded, no offer made', changed2 === false
        && same(c2.data.Na__DrawData__GetCommonFields(), { Client : '', SiteAddress : '' }) && same(common2.Na__LeCommon__RecordOffer(), { Client : '', SiteAddress : '' }), c2.data.Na__DrawData__GetCommonFields());

    // E3 | the sheets already agree on values: they win, and the record is offered beside them (unchanged behaviour)
    const c3 = await OpenModules('?project=' + DOOUS, DoousWorld());
    const common3 = await import(FLASK_BASE + COMMON_REL + c3.q);
    c3.cf.Na__CfApi__SetLoadedProjectData(root);
    common3.Na__LeCommon__Reset();
    await common3.Na__LeCommon__Seed([ { Sheet__Order : 1, Sheet__Fields : { Sheet__Fields__SiteAddress : 'As issued, 1 Old Road', Sheet__Fields__Client : 'Mr J. Doous' } } ]);
    check('a pack that already prints an address keeps it; the record\'s differing address is offered, the same client is not',
        same(c3.data.Na__DrawData__GetCommonFields(), { Client : 'Mr J. Doous', SiteAddress : 'As issued, 1 Old Road' })
        && same(common3.Na__LeCommon__RecordOffer(), { Client : '', SiteAddress : '1 Test Lane, Testville, TE1 1ST' }), { fields : c3.data.Na__DrawData__GetCommonFields(), offer : common3.Na__LeCommon__RecordOffer() });
});


// -----------------------------------------------------------------------------
// REGION | M. Mutants: Planted Faults, Each Caught
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('M. MUTANTS | ten planted faults in copies held for this run only; each must be caught');
    const pdText = readFileSync(FILES.pd, 'utf8');
    const prText = readFileSync(FILES.pr, 'utf8');
    const swap = (text, from, to, label) => {
        if (text.split(from).length !== 2) throw new Error('mutant anchor not found once: ' + label);
        return text.replace(from, to);
    };
    const RETURN_LINE = '        return own || Na__DrawData__IndexedCode() || null;';
    const mutants = [
        [ 'pd', 'document code = the save token (the folderId leaks)', (t) => swap(t, RETURN_LINE, '        return Na__DrawData__GetProjectCode();', 'm1') ],
        [ 'pd', 'the index ignored', (t) => swap(t, RETURN_LINE, '        return own || null;', 'm2') ],
        [ 'pd', 'the loaded project.json ignored', (t) => swap(t, RETURN_LINE, '        return Na__DrawData__IndexedCode() || null;', 'm3') ],
        [ 'pd', 'the folder name\'s code part instead of the index entry\'s', (t) => swap(t, "        return entry ? Na__DrawData__CodeText(entry.projectCode) : '';", "        return String(folder).split('__')[0];", 'm4') ],
        [ 'pd', 'no trim', (t) => swap(t, "        return (typeof value === 'string') ? value.trim() : '';", "        return (typeof value === 'string') ? value : '';", 'm5') ],
        [ 'pd', 'the index asked before it has settled', (t) => swap(t, "        if (!year || !folder) return '';",
              "        if (!Na__DrawData__IndexAsked) { Na__DrawData__IndexAsked = true; Promise.resolve(Na__AppUtils__InitMasterIndex()).then((m) => { Na__DrawData__IndexByFolderId = (m instanceof Map) ? m : null; }); }\n        if (!year || !folder) return '';", 'm6') ],
        [ 'pd', 'a numeric code not read', (t) => swap(t, "        if (typeof value === 'number' && Number.isFinite(value)) return String(value);\n", '', 'm7') ],
        [ 'pr', 'reads the presentation block again (ProjectRecord 1.0.0)', (t) => swap(t, "    import { Na__CfApi__GetLoadedProjectData } from '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';",
              "    import { Na__PresentationMode__ProjectJson__GetActiveConfig as Na__CfApi__GetLoadedProjectData } from '../../21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';", 'r1') ],
        [ 'pr', 'the address not trimmed', (t) => swap(t, 'project.siteAddress.trim()', 'project.siteAddress', 'r2') ],
        [ 'pr', 'the client not composed', (t) => swap(t, 'Na__LeRecord__ComposeClientName(project.clientDrawingName)', "String(project.clientDrawingName || '')", 'r3') ]
    ];
    for (const [ which, name, mutate ] of mutants) {
        const source  = mutate(which === 'pd' ? pdText : prText);
        const overrides = { [which === 'pd' ? PD_REL : PR_REL] : { source } };
        quietChecks = true; mutantFailures = 0;
        let pageFailed = 0;
        try {
            const run = await RunPage(overrides);
            pageFailed = run.result ? run.result.fail : 99;
            await CheckNoEarlyIndexFetch(overrides);
        } catch (error) { pageFailed += 1; }
        quietChecks = false;
        const caught = pageFailed + mutantFailures;
        check('mutant caught - ' + name + ' (page cases failed: ' + pageFailed + ', direct checks failed: ' + mutantFailures + ')', caught > 0);
    }
});


// -----------------------------------------------------------------------------
// REGION | Summary
// -----------------------------------------------------------------------------

check('the real 2026/3047__Doous project.json and the master index are byte-for-byte unchanged',
    Sha1File(join(DOOUS_DIR, 'project.json')) === REAL_HASHES.project && Sha1File(INDEX_FILE) === REAL_HASHES.index);
const errors = consoleKept.filter(([ kind ]) => kind === 'error');
check('no console error from the modules', errors.length === 0, errors.slice(0, 3));

logLine('\n' + (failures === 0 ? 'ALL ' + passes + ' CHECKS PASS' : failures + ' OF ' + (passes + failures) + ' CHECKS FAILED') + ' (' + (LIVE ? 'live files' : 'candidates') + ')');
process.exitCode = failures === 0 ? 0 : 1;
