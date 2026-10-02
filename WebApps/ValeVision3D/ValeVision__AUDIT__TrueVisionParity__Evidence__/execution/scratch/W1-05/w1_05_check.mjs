// =============================================================================
// VALEVISION3D - W1-05 NODE CHECK - THE DRAWINGS SAVE (ProjectData 1.6.0 over the facade)
// =============================================================================
//
// Scratch check for package W1-05 (never shipped). Loads the REAL modules at their browser URLs -
// Na__DrawView__ProjectData__ (the candidate, or the live file with --live), the presentation scene data,
// the ProjectLoader, the transport facade (Na__CfApi, Na__LocalMirror), the north data module and the
// ValeVision 41 section scene data (its three.js SystemLogic stubbed) - over a stubbed fetch that plays
// the editor Worker (1.5.0 and 1.6.0), the CDN, the master index and the local server; and, in the last
// section, the REAL WebApps/Whitecardopedia/server.py through Flask's test client on a TEMPORARY copy of
// 2026/3047__Doous. Nothing is written outside the OS temp folder; the real Doous files are hashed before
// and after.
//
// USAGE:  node w1_05_check.mjs [--live]
//
// =============================================================================

import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { register } from 'node:module';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';


// -----------------------------------------------------------------------------
// REGION | Paths, Hosts and Fixtures
// -----------------------------------------------------------------------------

    const LIVE         = process.argv.includes('--live');
    const HERE         = dirname(fileURLToPath(import.meta.url));
    const APP_ROOT     = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
    const SRC_ROOT     = join(APP_ROOT, '02__Src__AppModules');
    const WCP_ROOT     = resolve(APP_ROOT, '..', 'Whitecardopedia');
    const INDEX_FILE   = join(WCP_ROOT, '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json');
    const DOOUS_DIR    = join(WCP_ROOT, 'Projects', '2026', '3047__Doous');
    const CONFIG_FILE  = join(SRC_ROOT, '02__AppData', 'Na__AppConfig__Main.json');
    const SCRATCH      = mkdtempSync(join(tmpdir(), 'na-w1-05-check-'));

    const PD_REL       = '02__Src__AppModules/40__System__DrawingViewCore/Na__DrawView__ProjectData__.js';
    const NORTH_REL    = '02__Src__AppModules/46__System__NorthDirection/Na__North__ProjectJson__Data__.js';
    const SECT_REL     = '02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__SceneData.js';
    const SYSLOGIC_REL = '02__Src__AppModules/41__System__CrossSectionView/Na__CrossSectionView__SystemLogic.js';
    const CFAPI_REL    = '02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js';
    const PRES_REL     = '02__Src__AppModules/21__System__PresentationMode/Na__PresentationMode__ProjectJson__SceneData.js';

    const SOURCE = {                                                             // <-- W1_05_*_FILE: a mutant from w1_05_mutants.py
        [PD_REL]    : process.env.W1_05_PD_FILE    || (LIVE ? join(APP_ROOT, PD_REL)    : join(HERE, 'candidate__Na__DrawView__ProjectData__.js')),
        [NORTH_REL] : process.env.W1_05_NORTH_FILE || (LIVE ? join(APP_ROOT, NORTH_REL) : join(HERE, 'candidate__Na__North__ProjectJson__Data__.js')),
        [SECT_REL]  : process.env.W1_05_SECT_FILE  || (LIVE ? join(APP_ROOT, SECT_REL)  : join(HERE, 'candidate__Na__CrossSectionView__SceneData.js'))
    };

    const FLASK_ORIGIN = 'http://localhost:8000';
    const FLASK_BASE   = FLASK_ORIGIN + '/ValeVision3D/';
    const PAGES_ORIGIN = 'https://adam-noble-01.github.io';
    const PAGES_BASE   = PAGES_ORIGIN + '/ValeCodebase/WebApps/ValeVision3D/';
    const CDN_PROJECTS = 'https://cdn.noble-architecture.com/VaApps/Projects';
    const INDEX_URLS   = [
        'https://cdn.noble-architecture.com/VaApps/Index/Na__MasterIndex__ProjectLocations__.json',
        PAGES_ORIGIN + '/ValeCodebase/WebApps/Whitecardopedia/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json'
    ];
    const WORKER_BASE  = 'https://editor-worker.test/api/editor';
    const API_KEY      = 'test-editor-key';
    const DOOUS        = '2026/3047__Doous';
    const DOOUS_PREFIX = 'VaApps/Projects/2026/3047__Doous/';
    const SAVED_ISO    = 'LayoutEditor__DrawingsData__SavedIso';
    const LAYOUT_MODE  = 'LayoutEditor__DrawingsData__LayoutModeEnabled';

    const INDEX_TEXT   = readFileSync(INDEX_FILE, 'utf8');
    const DOOUS_DOC    = JSON.parse(readFileSync(join(DOOUS_DIR, 'project.json'), 'utf8'));
    const OWNED_KEYS   = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')).ProjectData__EditorOwnedKeys.ProjectData__EditorOwnedKeys__Keys;
    const REAL_HASHES  = { project : Sha1File(join(DOOUS_DIR, 'project.json')), notes : Sha1File(join(DOOUS_DIR, 'ValeVision__DrawingNotes__.json')) };

    // THE THREE.JS SECTION ENGINE, STUBBED | the 41 scene data module needs four names from it
    const SYSLOGIC_STUB = [
        'let enabled = true;',
        'export function Na__CrossSection__IsFeatureEnabled() { return enabled; }',
        'export function Na__CrossSection__SetFeatureEnabled(on) { enabled = !!on; }',
        'export function Na__CrossSection__SerializeSections() { return { gizmosVisible : true, sliceDepthM : null, fillColor : "#ffffff", lineColor : "#000000", lineWidthPx : 2, sections : [] }; }',
        'export function Na__CrossSection__ApplySerializedSections() { return true; }'
    ].join('\n');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Checks and Helpers
// -----------------------------------------------------------------------------

    let failures = 0;
    let passes   = 0;
    function check(name, passed, detail) {
        if (passed) passes++; else failures++;
        let text = (passed ? '  PASS  ' : '  FAIL  ') + name;
        if (!passed && detail !== undefined) {
            let shown;
            try { shown = JSON.stringify(detail); } catch (error) { shown = String(detail); }
            text += '  -> ' + (shown && shown.length > 900 ? shown.slice(0, 900) + '...' : shown);
        }
        console.log(text);
    }
    function section(title) { console.log('\n' + title); }
    async function RunSection(body) {
        try { await body(); }
        catch (error) { check('the section ran to its end without throwing', false, (error && error.stack) ? error.stack.split('\n').slice(0, 5).join(' | ') : String(error)); }
    }

    const clone = (value) => JSON.parse(JSON.stringify(value));
    const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
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

    // CONSOLE | the modules' own lines are kept, not printed
    const consoleKept = [];
    const consoleReal = { log : console.log, warn : console.warn, info : console.info, error : console.error };
    console.warn  = (...parts) => { consoleKept.push([ 'warn',  parts.map(String).join(' ') ]); };
    console.info  = (...parts) => { consoleKept.push([ 'info',  parts.map(String).join(' ') ]); };
    console.error = (...parts) => { consoleKept.push([ 'error', parts.map((part) => (part && part.message) || String(part)).join(' ') ]); };
    const logLine = console.log;
    console.log = (...parts) => {
        const text = parts.map(String).join(' ');
        if (text.startsWith('[ValeVision3D]') || text.startsWith('[CrossSection]') || text.startsWith('[R2Save]') || text.startsWith('[ResilientLoad]') || text.startsWith('[ProjectLoader]')) { consoleKept.push([ 'log', text ]); return; }
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
    Object.entries(SOURCE).forEach(([ rel, file ]) => { OVERRIDES.all[rel] = { file : file }; });
    OVERRIDES.all[SYSLOGIC_REL] = { source : SYSLOGIC_STUB };
    function SaveOverrides() { writeFileSync(OVERRIDES_FILE, JSON.stringify(OVERRIDES, null, 1)); }
    SaveOverrides();

    register(pathToFileURL(HOOKS_FILE).href, {
        parentURL : import.meta.url,
        data      : { appRootUrl : pathToFileURL(APP_ROOT + '/').href, bases : [ FLASK_BASE, PAGES_BASE ], overridesFile : OVERRIDES_FILE }
    });

    // THE PAGE | a fresh window per case, so no case hears another's events
    function NewWindow(host) {
        const win = new EventTarget();
        win.location = (host === 'pages')
            ? { hostname : 'adam-noble-01.github.io', port : '', search : '?project=' + DOOUS, origin : PAGES_ORIGIN, href : PAGES_BASE + 'index.html?project=' + DOOUS }
            : { hostname : 'localhost', port : '8000', search : '?project=' + DOOUS, origin : FLASK_ORIGIN, href : FLASK_BASE + 'index.html?project=' + DOOUS };
        win.setTimeout = setTimeout; win.clearTimeout = clearTimeout;
        return win;
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Fake Services: Index, Editor Config, Worker, R2 and CDN, Local Server
// -----------------------------------------------------------------------------

    function NewWorld(settings) {
        const world = Object.assign({ worker : '1.6.0', fingerprintRoute : true, bridge : null }, settings || {});
        world.r2 = new Map(); world.disk = new Map();
        world.log = []; world.violations = []; world.unexpected = [];
        world.bumps = 0; world.seq = 0;
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
            const url     = String(input instanceof URL ? input.href : input);
            const options = init || {};
            const method  = String(options.method || 'GET').toUpperCase();
            const headers = {};
            Object.entries(options.headers || {}).forEach(([ name, value ]) => { headers[name.toLowerCase()] = String(value); });
            const record = { n : ++world.seq, method : method, url : url, headers : headers, bodyText : (typeof options.body === 'string') ? options.body : null, bodyBytes : null };
            world.log.push(record);
            try { return await Route(world, record); }
            catch (error) { world.unexpected.push(method + ' ' + url + ' : ' + error.message); return JsonResponse(500, { error : 'test stub failed: ' + error.message }); }
        };
    }

    async function Route(world, rec) {
        const plain = rec.url.split('?')[0];
        if (INDEX_URLS.indexOf(plain) !== -1) return new Response(INDEX_TEXT, { status : 200, headers : { 'Content-Type' : 'application/json' } });
        if (plain === FLASK_ORIGIN + '/api/editor-config') return JsonResponse(200, { workerApiBaseUrl : WORKER_BASE, apiKey : API_KEY });
        if (plain === WORKER_BASE + '/health') {
            return (world.worker === '1.6.0')
                ? JsonResponse(200, { ok : true, worker : 'whitecardopedia-editor-api', version : '1.6.0', routes : [ 'save', 'assets', 'drawing-notes', 'project', 'merge-keys', 'files' ] })
                : JsonResponse(200, { ok : true, worker : 'whitecardopedia-editor-api' });
        }
        if (plain.startsWith(WORKER_BASE + '/projects/')) return WorkerRoute(world, rec);
        if (plain.startsWith(CDN_PROJECTS + '/')) return CdnRoute(world, rec);
        if (rec.url.startsWith(FLASK_ORIGIN + '/')) return world.bridge ? world.bridge.forward(rec) : LocalRoute(world, rec);
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
            if (Object.keys(body || {}).some((field) => [ 'set', 'remove', 'drawingsBase', 'bumpBuild' ].indexOf(field) === -1)) return JsonResponse(400, { error : 'Unknown field(s)' });
            const set = body.set || {}, remove = body.remove || [];
            const refused = Object.keys(set).filter((key) => OWNED_KEYS.indexOf(key) === -1).map((key) => ({ key : key, op : 'set' }));
            if (refused.length) return JsonResponse(400, { error : 'Refused key(s): ' + refused.map((one) => one.key).join(', '), refused : refused });
            const doc = GetR2Json(world, prefix + 'project.json');
            if (!doc) return JsonResponse(409, { error : 'No project.json on R2', missing : true });
            const base = SavedIso(doc) ? 'iso:' + SavedIso(doc) : 'none';
            if (body.drawingsBase !== undefined && body.drawingsBase !== null && body.drawingsBase !== base) {
                return JsonResponse(409, { error : 'The drawings on R2 are not the ones this window loaded: they were saved elsewhere since. Reload to pick them up before saving.', conflict : true, drawings : { savedIso : SavedIso(doc) } });
            }
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
        if (!path.startsWith('/api/projects/')) return JsonResponse(404, { error : 'no such API route' });
        let rest = path.slice('/api/projects/'.length);
        let sub  = '';
        const fingerprint = rest.match(/^(.*)\/drawings-fingerprint$/);
        if (fingerprint) { rest = fingerprint[1]; sub = 'fingerprint'; }
        rec.local = { folderId : rest, sub : sub };
        const doc = world.disk.get(rest);
        if (sub === 'fingerprint') {
            if (!world.fingerprintRoute) return JsonResponse(404, { error : 'Project not found: ' + rest + '/drawings-fingerprint' });
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

    // WHICH REQUEST IS WHICH
    const isFingerprint = (r) => r.url.startsWith(FLASK_ORIGIN + '/api/projects/') && r.url.split('?')[0].endsWith('/drawings-fingerprint');
    const isMergeKeys   = (r) => r.worker && r.worker.suffix === '/merge-keys';
    const isWorkerSave  = (r) => r.worker && r.worker.suffix === '' && r.method === 'POST';
    const isLocalPost   = (r) => r.method === 'POST' && r.url.startsWith(FLASK_ORIGIN + '/api/projects/');
    const isLocalGet    = (r) => r.method === 'GET' && r.url.startsWith(FLASK_ORIGIN + '/api/projects/') && !isFingerprint(r);
    const isWorker      = (r) => r.url.startsWith(WORKER_BASE + '/projects/');
    const isFlask       = (r) => r.url.startsWith(FLASK_ORIGIN + '/');

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | One Case: the Facade Started, the Drawings Loaded
// -----------------------------------------------------------------------------

    let caseNumber = 0;
    async function OpenCase(host, world, options) {
        const opts = options || {};
        caseNumber += 1;
        const kase = String(caseNumber);
        if (opts.variantSource) { OVERRIDES.cases[kase] = { [PD_REL] : { source : opts.variantSource } }; SaveOverrides(); }
        globalThis.window = NewWindow(host);
        globalThis.fetch  = MakeFetch(world);
        const base  = (host === 'pages') ? PAGES_BASE : FLASK_BASE;
        const q     = '?case=' + kase;
        const cf    = await import(base + CFAPI_REL + q);
        const pres  = await import(base + PRES_REL + q);
        const data  = await import(base + PD_REL + q);
        const ready = await cf.Na__CfApi__Initialize();
        cf.Na__CfApi__SetLoadedProjectData(clone(world.disk.get(DOOUS) || DOOUS_DOC));
        data.Na__DrawView__ProjectData__Initialize();
        const toasts = [];
        const toast  = (message, isError) => toasts.push({ message : String(message), isError : isError === true });
        const events = [];
        window.addEventListener(data.Na__DrawData__CHANGED_EVENT, (event) => events.push(event.detail && event.detail.reason));
        return { cf, pres, data, world, base, q, ready, toasts, toast, events };
    }
    function DispatchDrawings(c, block, sceneConfig) {
        window.dispatchEvent(new CustomEvent(c.data.Na__DrawData__LOADED_EVENT, { detail : { block : block, projectCode : DOOUS, sceneConfig : sceneConfig || null } }));
    }
    function DoousBlock() { return clone(DOOUS_DOC.LayoutEditor__DrawingsData); }
    function DoousScenes() { return clone(DOOUS_DOC.PresentationMode__SavedCameraScenes); }

// endregion -------------------------------------------------------------------


console.log('W1-05 node check - ' + (LIVE ? 'LIVE files' : 'candidates') + ' (' + SCRATCH + ')');


// -----------------------------------------------------------------------------
// REGION | A. The Interface
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('A. THE INTERFACE | TrueVision 1.6.0\'s names plus ValeVision\'s two');
    const world = DoousWorld();
    const c = await OpenCase('flask', world);
    const tvNames = [ 'Na__DrawData__BLOCK_KEY', 'Na__DrawData__FLOOR_PLANS_KEY', 'Na__DrawData__ELEVATIONS_KEY', 'Na__DrawData__SHEETS_KEY',
        'Na__DrawData__SAVED_ISO_KEY', 'Na__DrawData__SCENE_PLAN_ID_KEY', 'Na__DrawData__SCENE_ELEVATION_ID_KEY', 'Na__DrawData__LOADED_EVENT',
        'Na__DrawData__CHANGED_EVENT', 'Na__DrawView__ProjectData__Initialize', 'Na__DrawData__RegisterSectionBlockProvider',
        'Na__DrawData__RegisterPayloadGuard', 'Na__DrawData__RegisterSaveStep', 'Na__DrawData__GetBlock', 'Na__DrawData__Load',
        'Na__DrawData__GetProjectCode', 'Na__DrawData__IsLoaded', 'Na__DrawData__GetBase', 'Na__DrawData__WhenBaseKnown',
        'Na__DrawData__GetFloorPlansArray', 'Na__DrawData__GetElevationsArray', 'Na__DrawData__GetSheetsArray',
        'Na__DrawData__GetClientDimensionsEnabled', 'Na__DrawData__SetClientDimensionsEnabled', 'Na__DrawData__GetCommonFields',
        'Na__DrawData__SetCommonField', 'Na__DrawData__IsFloorPlanScene', 'Na__DrawData__IsElevationScene', 'Na__DrawData__IsDrawingScene',
        'Na__DrawData__Save' ];
    const vvOnly  = [ 'Na__DrawData__GetLayoutModeEnabled', 'Na__DrawData__SetLayoutModeEnabled' ];
    const names   = Object.keys(c.data).sort();
    check('every one of TrueVision 1.6.0\'s 30 exports is exported', tvNames.every((name) => name in c.data), tvNames.filter((name) => !(name in c.data)));
    check('the two ValeVision-only exports are kept (DR-25, K2 X2)', vvOnly.every((name) => name in c.data));
    check('nothing else is exported', names.length === tvNames.length + vvOnly.length, names.filter((name) => tvNames.concat(vvOnly).indexOf(name) === -1));
    check('SAVED_ISO_KEY is LayoutEditor__DrawingsData__SavedIso', c.data.Na__DrawData__SAVED_ISO_KEY === SAVED_ISO);
    check('Save takes (showToast, report, registerKeys)', c.data.Na__DrawData__Save.length === 3);
    check('IsLoaded is false before a project\'s block arrives', c.data.Na__DrawData__IsLoaded() === false);
    check('the facade is configured on localhost with the master-index folder', c.ready && c.ready.configured === true && c.ready.folderId === DOOUS, c.ready);
    const source = readFileSync(SOURCE[PD_REL], 'utf8');
    check('the module imports only TrueVision\'s seven names (the vm-stubbed DraftGuard test resolves them all)',
        same([ ...source.matchAll(/^\s*import\s*\{([^}]*)\}\s*from/gm) ].map((m) => m[1].split(',').map((n) => n.trim()).filter(Boolean)).flat().sort(),
             [ 'Na__AppUtils__GetProjectCodeFromUrl', 'Na__AppUtils__IsRunningOnLocalhost', 'Na__CfApi__IsConfigured', 'Na__CfApi__MergeAndSaveKeys',
               'Na__LocalMirror__DrawingsFingerprint', 'Na__LocalMirror__MergeKeys', 'Na__PresentationMode__ProjectJson__GetActiveConfig' ]));
    check('R2 judging is OFF in the shipped file (DR-30)', /const Na__DrawData__R2_JUDGING = false;/.test(source));
});


// -----------------------------------------------------------------------------
// REGION | B. A Save: Merge-Keys, Then the Guarded Local Copy, Guard and Steps
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('B. A SAVE WITH A REPORT | merge-keys to R2, then the guarded local copy; the payload guard; the save steps');
    const world = DoousWorld({ worker : '1.6.0' });
    const c = await OpenCase('flask', world);
    c.pres.Na__PresentationMode__ProjectJson__SetActiveConfig(DoousScenes(), DOOUS);
    DispatchDrawings(c, DoousBlock(), DoousScenes());
    check('IsLoaded is true once the block is adopted, before the base is known', c.data.Na__DrawData__IsLoaded() === true && c.data.Na__DrawData__GetBase() === undefined);
    const base = await c.data.Na__DrawData__WhenBaseKnown();
    check('the base is the local server\'s fingerprint of the block on disk', base === Digest(world.disk.get(DOOUS)) && /^sha1:/.test(base), base);
    check('the load was announced once', same(c.events, [ 'loaded' ]), c.events);

    c.data.Na__DrawData__SetLayoutModeEnabled(true);
    const live = c.data.Na__DrawData__GetBlock();
    const sheetsBefore = clone(live.LayoutEditor__DrawingsData__Sheets);

    // THE PAYLOAD GUARD | changes the copy about to be written, never the live block
    let guardSaw = null;
    c.data.Na__DrawData__RegisterPayloadGuard((payload) => {
        guardSaw = { stamped : typeof payload.LayoutEditor__DrawingsData[SAVED_ISO] === 'string', isLive : payload.LayoutEditor__DrawingsData === live };
        payload.LayoutEditor__DrawingsData.Test__GuardMark = 'guarded';
        if (payload.LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__Sheets[0]) payload.LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__Sheets[0].Sheet__Name = 'AS LAST UPDATED';
    });

    // THE SAVE STEPS | before, payload, after, in registration order; a throwing one is noted
    const order = [];
    let payloadSaw = null, afterSaw = null;
    c.data.Na__DrawData__RegisterSaveStep({ id : 'stepOne',
        before  : (ctx) => { order.push('one.before'); ctx.state.one = 'kept'; if (ctx.block !== null) order.push('one.before:block-too-early'); },
        payload : (ctx) => { order.push('one.payload'); payloadSaw = { guardMark : ctx.block.Test__GuardMark, stamped : typeof ctx.block[SAVED_ISO] === 'string', state : ctx.state.one }; ctx.block.Test__StepMark = 'pointed'; },
        after   : (ctx) => { order.push('one.after'); afterSaw = { localOk : !!(ctx.local && ctx.local.ok), state : ctx.state.one }; } });
    c.data.Na__DrawData__RegisterSaveStep({ id : 'stepTwo',
        before  : () => { order.push('two.before'); },
        payload : () => { order.push('two.payload'); throw new Error('planted failure'); },
        after   : async () => { await sleep(1); order.push('two.after'); } });
    check('a step without an id is refused', c.data.Na__DrawData__RegisterSaveStep({ before : () => {} }) === false);

    const report = {};
    const saved  = await c.data.Na__DrawData__Save(c.toast, report);
    const r2doc  = GetR2Json(world, DOOUS_PREFIX + 'project.json');
    const disk   = world.disk.get(DOOUS);
    const merges = world.log.filter(isMergeKeys);
    const posts  = world.log.filter(isLocalPost);
    const stamp  = r2doc && r2doc.LayoutEditor__DrawingsData && r2doc.LayoutEditor__DrawingsData[SAVED_ISO];

    check('the save returns true', saved === true);
    check('with a report the drawings save toasts nothing itself (the caller says where it landed: one toast)', c.toasts.length === 0, c.toasts);
    check('report.cloudSaved and report.local (ok, with the file\'s new fingerprint) are filled', report.cloudSaved === true && report.local && report.local.ok === true && report.local.drawings && /^sha1:/.test(report.local.drawings.digest), report);
    check('the throwing step is a note on report.steps, marked as an error', Array.isArray(report.steps) && report.steps.length === 1 && report.steps[0].error === true && /stepTwo: planted failure/.test(report.steps[0].message), report.steps);
    check('the steps ran before / payload / after, each phase in registration order', same(order, [ 'one.before', 'two.before', 'one.payload', 'two.payload', 'one.after', 'two.after' ]), order);
    check('the payload phase got the stamped, guarded copy and the state the before phase left', payloadSaw && payloadSaw.guardMark === 'guarded' && payloadSaw.stamped && payloadSaw.state === 'kept', payloadSaw);
    check('the after phase saw the local copy\'s result', afterSaw && afterSaw.localOk === true && afterSaw.state === 'kept', afterSaw);
    check('the guard was handed a stamped COPY, not the live block', guardSaw && guardSaw.stamped === true && guardSaw.isLive === false, guardSaw);
    check('R2 was written through merge-keys exactly once, with the drawings and the presentation block', merges.length === 1 && same(Object.keys(JSON.parse(merges[0].bodyText).set).sort(), [ 'LayoutEditor__DrawingsData', 'PresentationMode__SavedCameraScenes' ]), merges.map((m) => Object.keys(JSON.parse(m.bodyText).set)));
    check('R2 judging is off: merge-keys carries no drawingsBase (DR-30)', merges.length === 1 && !('drawingsBase' in JSON.parse(merges[0].bodyText)));
    check('no whole-document save and no build-manifest bump on Worker 1.6.0', world.log.filter(isWorkerSave).length === 0 && world.bumps === 0);
    check('the block on R2 is stamped LayoutEditor__DrawingsData__SavedIso', typeof stamp === 'string' && !Number.isNaN(Date.parse(stamp)), stamp);
    check('LayoutModeEnabled survives the save (R2 and disk)', r2doc.LayoutEditor__DrawingsData[LAYOUT_MODE] === true && disk.LayoutEditor__DrawingsData[LAYOUT_MODE] === true);
    check('R2 and the disk got exactly the same drawings block (guard and step edits included)', same(Canon(r2doc.LayoutEditor__DrawingsData), Canon(disk.LayoutEditor__DrawingsData)) && r2doc.LayoutEditor__DrawingsData.Test__GuardMark === 'guarded' && r2doc.LayoutEditor__DrawingsData.Test__StepMark === 'pointed');
    check('the live block kept its own records (no guard or step mark, sheets as they were) and now carries the stamp',
        live.Test__GuardMark === undefined && live.Test__StepMark === undefined && same(live.LayoutEditor__DrawingsData__Sheets, sheetsBefore) && live[SAVED_ISO] === stamp);
    check('the local write carried the base it was built on (X-ValeVision-Drawings-Base)', posts.length === 1 && posts[0].headers['x-valevision-drawings-base'] === base, posts.map((p) => p.headers));
    const fpPre  = world.log.filter(isFingerprint).map((r) => r.n);
    const order2 = { lastFingerprint : Math.max(...fpPre), merge : merges[0] && merges[0].n, localGet : (world.log.filter(isLocalGet).pop() || {}).n, localPost : posts[0] && posts[0].n };
    check('order: the pre-save fingerprint, then R2 (merge-keys), then the fresh local read, then the local write', order2.lastFingerprint < order2.merge && order2.merge < order2.localGet && order2.localGet < order2.localPost, order2);
    check('the base is now the file\'s new fingerprint', c.data.Na__DrawData__GetBase() === report.local.drawings.digest && report.local.drawings.digest === Digest(disk));
    check('every other key of project.json is untouched on R2 and on disk', Object.keys(DOOUS_DOC).every((key) => key === 'LayoutEditor__DrawingsData' || key === 'PresentationMode__SavedCameraScenes' || same(r2doc[key], DOOUS_DOC[key]) && same(disk[key], DOOUS_DOC[key])));
    check('one "saved" announcement after the "loaded" one', same(c.events, [ 'loaded', 'saved' ]), c.events);
    check('every R2 key written sits under VaApps/Projects/2026/3047__Doous/', [ ...world.r2.keys() ].every((key) => key.startsWith(DOOUS_PREFIX)));
    check('no unexpected request, no new route sent to an old Worker', world.unexpected.length === 0 && world.violations.length === 0, world.unexpected.concat(world.violations));

    // NO REPORT | a step's failure is shown once, red; a clean save shows nothing
    const quiet = await OpenCase('flask', DoousWorld({ worker : '1.6.0' }));
    DispatchDrawings(quiet, DoousBlock(), DoousScenes());
    await quiet.data.Na__DrawData__WhenBaseKnown();
    check('without a report a clean save shows no toast', (await quiet.data.Na__DrawData__Save(quiet.toast)) === true && quiet.toasts.length === 0, quiet.toasts);
    quiet.data.Na__DrawData__RegisterSaveStep({ id : 'broken', before : () => { throw new Error('nope'); } });
    const quietSaved = await quiet.data.Na__DrawData__Save(quiet.toast);
    check('without a report a failing step is shown once, as an error, and the save still lands', quietSaved === true && quiet.toasts.length === 1 && quiet.toasts[0].isError && /broken: nope/.test(quiet.toasts[0].message), quiet.toasts);
});


// -----------------------------------------------------------------------------
// REGION | C. The Drawings on Disk Moved On: Refused Before R2
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('C. A DISK BLOCK CHANGED SINCE LOAD | the save is refused before R2 with the v2.146 words');
    const world = DoousWorld({ worker : '1.6.0' });
    const c = await OpenCase('flask', world);
    DispatchDrawings(c, DoousBlock(), DoousScenes());
    await c.data.Na__DrawData__WhenBaseKnown();
    const other = clone(world.disk.get(DOOUS));
    other.LayoutEditor__DrawingsData[SAVED_ISO] = '2026-10-01T10:49:00.000Z';
    other.LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__Sheets.push({ Sheet__Id : 'Sheet_999', Sheet__Name : 'Saved by another window' });
    world.disk.set(DOOUS, other);
    const r2Before = world.r2.get(DOOUS_PREFIX + 'project.json').bytes.toString('utf8');
    const diskBefore = JSON.stringify(other);
    const report = {};
    const saved  = await c.data.Na__DrawData__Save(c.toast, report);
    check('the save returns false', saved === false);
    check('one red toast, TrueVision v2.146.0\'s words', c.toasts.length === 1 && c.toasts[0].isError
        && /^Not saved: the project's drawings on disk are not the ones this window loaded - they were saved elsewhere at \d\d:\d\d on \d\d\/\d\d since\. Reload to pick them up; this window's unsaved changes will be offered as a draft\.$/.test(c.toasts[0].message), c.toasts);
    check('report.conflict is true', report.conflict === true);
    check('R2 was not touched: no Worker request at all', world.log.filter(isWorker).length === 0 && world.r2.get(DOOUS_PREFIX + 'project.json').bytes.toString('utf8') === r2Before);
    check('the disk was not touched: no local write', world.log.filter(isLocalPost).length === 0 && JSON.stringify(world.disk.get(DOOUS)) === diskBefore);
    check('no "saved" announcement', same(c.events, [ 'loaded' ]), c.events);
});


// -----------------------------------------------------------------------------
// REGION | D. Worker 1.5.0 (deployed today): the Whole-Document Save
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('D. WORKER 1.5.0 | the facade\'s whole-document save over the fresh local copy, then the local copy');
    const world = DoousWorld({ worker : '1.5.0' });
    const c = await OpenCase('flask', world);
    DispatchDrawings(c, DoousBlock(), DoousScenes());
    await c.data.Na__DrawData__WhenBaseKnown();
    const report = {};
    const saved  = await c.data.Na__DrawData__Save(c.toast, report);
    const r2doc  = GetR2Json(world, DOOUS_PREFIX + 'project.json');
    const save   = world.log.filter(isWorkerSave);
    const post   = world.log.filter(isLocalPost);
    check('saved, with the local copy written', saved === true && report.local && report.local.ok === true, report.local);
    check('R2 got the whole document through the existing save route, once, before the local write', save.length === 1 && post.length === 1 && save[0].n < post[0].n);
    check('no 1.6.0 route was sent to the 1.5.0 Worker', world.violations.length === 0, world.violations);
    check('R2\'s document is the full project with the stamped block', r2doc && r2doc.projectCode === DOOUS_DOC.projectCode && typeof r2doc.LayoutEditor__DrawingsData[SAVED_ISO] === 'string');
    check('the disk got the same block', same(Canon(r2doc.LayoutEditor__DrawingsData), Canon(world.disk.get(DOOUS).LayoutEditor__DrawingsData)));
});


// -----------------------------------------------------------------------------
// REGION | E. Section Bindings: the Provider, and ValeVision's 41 Scene Data Registering Itself
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('E. SECTION BINDINGS | ride the save when present (TD06, DIV-2)');
    const world = DoousWorld({ worker : '1.6.0' });
    const c = await OpenCase('flask', world);
    DispatchDrawings(c, DoousBlock(), DoousScenes());
    await c.data.Na__DrawData__WhenBaseKnown();
    const lastSet = () => { const m = world.log.filter(isMergeKeys).pop(); return m ? JSON.parse(m.bodyText).set : null; };

    await c.data.Na__DrawData__Save(c.toast, {});
    check('no provider registered: no CrossSection__SceneData key in the save', lastSet() && !('CrossSection__SceneData' in lastSet()));

    const sect = await import(c.base + SECT_REL + c.q);
    sect.Na__SectSceneData__Initialize();
    const bindings = clone(DOOUS_DOC.CrossSection__SceneData || { CrossSection__SceneData__Description : 'test', CrossSection__SceneData__Version : 1, CrossSection__SceneData__Scenes : {} });
    await c.data.Na__DrawData__Save(c.toast, {});
    check('ValeVision\'s 41 scene data registered on Initialize: an untouched project (null block) still gains no key', lastSet() && !('CrossSection__SceneData' in lastSet()));
    window.dispatchEvent(new CustomEvent('na-crosssection-scenedata-loaded', { detail : { sceneData : bindings } }));
    const report = {};
    const saved  = await c.data.Na__DrawData__Save(c.toast, report);
    check('once its block is loaded, the drawings save carries it as the third key, as loaded', saved === true && lastSet() && same(lastSet().CrossSection__SceneData, bindings), lastSet() && Object.keys(lastSet()));
    check('the local copy carries it too', same(world.disk.get(DOOUS).CrossSection__SceneData, bindings));
    check('the bindings keep ValeVision\'s entry schema (CrossSection__SceneBinding__*), untouched by the save', Object.values(bindings.CrossSection__SceneData__Scenes || {}).every((entry) => Object.keys(entry).every((key) => key.startsWith('CrossSection__SceneBinding__'))));
    sect.Na__SectSceneData__CaptureForScene('Test Scene', 'scene_test');
    await c.data.Na__DrawData__Save(c.toast, {});
    check('a binding captured in this window rides the next save', lastSet() && lastSet().CrossSection__SceneData && lastSet().CrossSection__SceneData.CrossSection__SceneData__Scenes['Test Scene'] && lastSet().CrossSection__SceneData.CrossSection__SceneData__Scenes['Test Scene'].CrossSection__SceneBinding__SceneId === 'scene_test');

    c.data.Na__DrawData__RegisterSectionBlockProvider(() => { throw new Error('provider broke'); });
    const kept = consoleKept.length;
    const savedAnyway = await c.data.Na__DrawData__Save(c.toast, {});
    check('a provider that throws costs the bindings, never the drawings: the save lands without them, with a warning',
        savedAnyway === true && lastSet() && !('CrossSection__SceneData' in lastSet()) && consoleKept.slice(kept).some(([ kind, text ]) => kind === 'warn' && /^\[ValeVision3D\] Section bindings provider failed/.test(text)));
    c.data.Na__DrawData__RegisterSectionBlockProvider('not a function');
    await c.data.Na__DrawData__Save(c.toast, {});
    check('a non-function clears the registration', lastSet() && !('CrossSection__SceneData' in lastSet()));
});


// -----------------------------------------------------------------------------
// REGION | F. North: Save(showToast, report)
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('F. NORTH | Save(showToast, report) passes the report to the drawings save');
    const world = DoousWorld({ worker : '1.6.0' });
    const c = await OpenCase('flask', world);
    DispatchDrawings(c, DoousBlock(), DoousScenes());
    await c.data.Na__DrawData__WhenBaseKnown();
    const north = await import(c.base + NORTH_REL + c.q);
    check('Save takes (showToast, report)', north.Na__NorthData__Save.length === 2);
    const bearing = north.Na__NorthData__Set(123.4, { x : 1000, y : 0, z : 2000 });
    const report  = {};
    const saved   = await north.Na__NorthData__Save(c.toast, report);
    const r2block = GetR2Json(world, DOOUS_PREFIX + 'project.json').LayoutEditor__DrawingsData;
    check('north is saved with the drawings, R2 and disk, and the report says where', saved === true && report.local && report.local.ok === true && report.cloudSaved === true);
    check('the north record is in the drawings block on R2 and on disk', r2block.LayoutEditor__DrawingsData__North && r2block.LayoutEditor__DrawingsData__North.North__BearingDeg === bearing
        && same(world.disk.get(DOOUS).LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__North, r2block.LayoutEditor__DrawingsData__North));
    check('no toast from the save itself (the North editor says it was saved)', c.toasts.length === 0, c.toasts);
    const oneArg = await north.Na__NorthData__Save(c.toast);
    check('the one-argument call ValeVision\'s North editor makes still saves', oneArg === true);
});


// -----------------------------------------------------------------------------
// REGION | G. The Live Site: Nothing Configured, Nothing Sent
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('G. THE LIVE SITE (GitHub Pages) | not configured: refused with TrueVision\'s words, no Worker, no Flask');
    const world = DoousWorld({ worker : '1.6.0' });
    const c = await OpenCase('pages', world);
    DispatchDrawings(c, DoousBlock(), DoousScenes());
    const base = await c.data.Na__DrawData__WhenBaseKnown();
    check('the web build\'s base is the block\'s own stamp (none on Doous yet)', base === null, base);
    const saved = await c.data.Na__DrawData__Save(c.toast, {});
    check('the save is refused with one red toast', saved === false && c.toasts.length === 1 && c.toasts[0].isError && c.toasts[0].message === 'Cloudflare Worker not configured. Drawings cannot be saved.', c.toasts);
    check('no request to the Worker or to any local server', world.log.filter((r) => isWorker(r) || isFlask(r)).length === 0, world.log.filter((r) => isWorker(r) || isFlask(r)).map((r) => r.url));
});


// -----------------------------------------------------------------------------
// REGION | H. R2 Judging Switched On (a variant of the file, never shipped)
// -----------------------------------------------------------------------------

await RunSection(async () => {
    section('H. R2 JUDGING ON (the flag flipped in a test copy only) | drawingsBase sent; a moved R2 refuses');
    const shipped = readFileSync(SOURCE[PD_REL], 'utf8');
    const flipped = shipped.replace('const Na__DrawData__R2_JUDGING = false;', 'const Na__DrawData__R2_JUDGING = true;');
    check('the test copy differs from the shipped file by the flag alone', flipped !== shipped && flipped.replace('R2_JUDGING = true;', 'R2_JUDGING = false;') === shipped);

    // H1 | R2 holds the block this window loaded (stamp X): judged and merged
    const stampX = '2026-10-01T09:00:00.000Z';
    const docX = clone(DOOUS_DOC); docX.LayoutEditor__DrawingsData[SAVED_ISO] = stampX;
    const w1 = NewWorld({ worker : '1.6.0' }); PutR2Json(w1, DOOUS_PREFIX + 'project.json', docX); w1.disk.set(DOOUS, clone(docX));
    const c1 = await OpenCase('flask', w1, { variantSource : flipped });
    DispatchDrawings(c1, clone(docX.LayoutEditor__DrawingsData), DoousScenes());
    await c1.data.Na__DrawData__WhenBaseKnown();
    const saved1 = await c1.data.Na__DrawData__Save(c1.toast, {});
    const m1 = w1.log.filter(isMergeKeys);
    check('the save sends drawingsBase iso:<the stamp it loaded> and lands', saved1 === true && m1.length === 1 && JSON.parse(m1[0].bodyText).drawingsBase === 'iso:' + stampX);
    const stamp1  = GetR2Json(w1, DOOUS_PREFIX + 'project.json').LayoutEditor__DrawingsData[SAVED_ISO];
    await sleep(5);                                                              // <-- The next stamp is a later millisecond
    const saved1b = await c1.data.Na__DrawData__Save(c1.toast, {});
    const m1b = w1.log.filter(isMergeKeys);
    check('the next save is built on the stamp the last one wrote, and lands', saved1b === true && stamp1 !== stampX && m1b.length === 2 && JSON.parse(m1b[1].bodyText).drawingsBase === 'iso:' + stamp1, { stamp1, sent : m1b[1] && JSON.parse(m1b[1].bodyText).drawingsBase });

    // H2 | another window saved to R2 since (stamp Y): refused, nothing written anywhere
    const w2 = NewWorld({ worker : '1.6.0' });
    const docY = clone(docX); docY.LayoutEditor__DrawingsData[SAVED_ISO] = '2026-10-01T09:30:00.000Z';
    PutR2Json(w2, DOOUS_PREFIX + 'project.json', docY); w2.disk.set(DOOUS, clone(docX));
    const c2 = await OpenCase('flask', w2, { variantSource : flipped });
    DispatchDrawings(c2, clone(docX.LayoutEditor__DrawingsData), DoousScenes());
    await c2.data.Na__DrawData__WhenBaseKnown();
    const r2Before = w2.r2.get(DOOUS_PREFIX + 'project.json').bytes.toString('utf8');
    const report2 = {};
    const saved2 = await c2.data.Na__DrawData__Save(c2.toast, report2);
    check('refused: false, report.conflict, one red toast naming R2', saved2 === false && report2.conflict === true && c2.toasts.length === 1 && c2.toasts[0].isError && /^Drawings save failed: The drawings on R2 are not the ones this window loaded/.test(c2.toasts[0].message), { report2, toasts : c2.toasts });
    check('R2 untouched and no local write', w2.r2.get(DOOUS_PREFIX + 'project.json').bytes.toString('utf8') === r2Before && w2.log.filter(isLocalPost).length === 0);

    // H3 | a block that never had a stamp: 'none'
    const w3 = DoousWorld({ worker : '1.6.0' });
    const c3 = await OpenCase('flask', w3, { variantSource : flipped });
    DispatchDrawings(c3, DoousBlock(), DoousScenes());
    await c3.data.Na__DrawData__WhenBaseKnown();
    await c3.data.Na__DrawData__Save(c3.toast, {});
    const m3 = w3.log.filter(isMergeKeys);
    check('a block that never had a stamp is sent as drawingsBase none', m3.length === 1 && JSON.parse(m3[0].bodyText).drawingsBase === 'none');
});


// -----------------------------------------------------------------------------
// REGION | I. The Real Local Server (server.py) on a Temporary Copy of 2026/3047__Doous
// -----------------------------------------------------------------------------

    const BRIDGE_SOURCE = [
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

    function StartBridge() {
        return new Promise((resolveStart) => {
            const script = join(SCRATCH, 'bridge.py');
            writeFileSync(script, BRIDGE_SOURCE);
            let child;
            const pending = new Map();
            let next = 0, buffer = '', stderr = '', settled = false, timer = null, exitDone = null;
            const exited = new Promise((done) => { exitDone = done; });
            const finish = (value) => { if (settled) return; settled = true; if (timer) clearTimeout(timer); resolveStart(value); };
            try { child = spawn('python', [ '-B', script, WCP_ROOT, join(SCRATCH, 'bridge') ], { stdio : [ 'pipe', 'pipe', 'pipe' ], windowsHide : true }); }
            catch (error) { finish({ ok : false, error : (error && error.message) || 'python could not start' }); return; }
            timer = setTimeout(() => finish({ ok : false, error : 'python did not answer within 120 s: ' + stderr.slice(-600) }), 120000);
            child.on('error', (error) => finish({ ok : false, error : (error && error.message) || 'python could not start' }));
            child.stderr.on('data', (data) => { stderr += data.toString(); });
            child.on('exit', (code) => {
                exitDone(code);
                finish({ ok : false, error : 'python exited with ' + code + ': ' + stderr.slice(-600) });
                pending.forEach((done) => done({ status : 599, headers : {}, body : Buffer.from('bridge exited').toString('base64') }));
                pending.clear();
            });
            child.stdout.on('data', (data) => {
                buffer += data.toString();
                let cut;
                while ((cut = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, cut).trim();
                    buffer = buffer.slice(cut + 1);
                    if (!line.startsWith('@@BRIDGE@@ ')) continue;
                    const message = JSON.parse(line.slice('@@BRIDGE@@ '.length));
                    if (message.ready) { finish({ ok : true, info : message, forward : forward, close : close }); continue; }
                    const done = pending.get(message.id);
                    if (done) { pending.delete(message.id); done(message); }
                }
            });
            function ask(method, path, headers, bodyBytes) {
                return new Promise((done) => {
                    const id = ++next;
                    pending.set(id, done);
                    child.stdin.write(JSON.stringify({ id : id, method : method, path : path, headers : headers, body : bodyBytes ? Buffer.from(bodyBytes).toString('base64') : null }) + '\n');
                });
            }
            async function forward(rec) {
                const url     = new URL(rec.url);
                const body    = (rec.bodyText !== null) ? Buffer.from(rec.bodyText, 'utf8') : rec.bodyBytes;
                const answer  = await ask(rec.method, url.pathname + url.search, rec.headers, body);
                const headers = {};
                Object.entries(answer.headers || {}).forEach(([ name, value ]) => { if (name.toLowerCase() !== 'content-length') headers[name] = value; });
                rec.local = { real : true, path : url.pathname, status : answer.status };
                return new Response(Buffer.from(answer.body || '', 'base64'), { status : answer.status, headers : headers });
            }
            async function close() {
                try { child.stdin.end(); } catch (error) { /* closed */ }
                const waited = await Promise.race([ exited.then(() => true), sleep(15000).then(() => false) ]);
                if (!waited) { try { child.kill(); } catch (error) { /* gone */ } }
            }
        });
    }

await RunSection(async () => {
    section('I. THE REAL LOCAL SERVER | WebApps/Whitecardopedia/server.py through Flask\'s test client, on a TEMPORARY copy of 2026/3047__Doous');
    const bridge = await StartBridge();
    if (!bridge.ok) { console.log('  SKIP  the real local server could not be driven: ' + bridge.error); return; }
    try {
        const tempProject = bridge.info.project;
        const world = NewWorld({ worker : '1.6.0', bridge : bridge });
        PutR2Json(world, DOOUS_PREFIX + 'project.json', DOOUS_DOC);
        world.disk.set(DOOUS, clone(DOOUS_DOC));                                   // <-- Only the facade's merge base; the real disk is the temp copy
        const c = await OpenCase('flask', world);
        DispatchDrawings(c, DoousBlock(), DoousScenes());
        const base = await c.data.Na__DrawData__WhenBaseKnown();
        check('the base is server.py\'s fingerprint of the temporary copy', typeof base === 'string' && /^sha1:[0-9a-f]{40}$/.test(base), base);
        c.data.Na__DrawData__SetLayoutModeEnabled(true);
        const report = {};
        const saved  = await c.data.Na__DrawData__Save(c.toast, report);
        const onDisk = JSON.parse(readFileSync(tempProject, 'utf8'));
        const stamp  = onDisk.LayoutEditor__DrawingsData && onDisk.LayoutEditor__DrawingsData[SAVED_ISO];
        check('the save lands: R2 by merge-keys, then server.py\'s guarded POST', saved === true && report.cloudSaved === true && report.local && report.local.ok === true, report.local);
        check('the temporary project.json carries the stamped block with LayoutModeEnabled', typeof stamp === 'string' && onDisk.LayoutEditor__DrawingsData[LAYOUT_MODE] === true && stamp === GetR2Json(world, DOOUS_PREFIX + 'project.json').LayoutEditor__DrawingsData[SAVED_ISO]);
        const outsideRepo = (path) => { const rel = relative('D:/10_CoreLib__ValeCodebase', path); return rel.startsWith('..') || /^[A-Za-z]:/.test(rel); };   // <-- Another drive is outside too
        check('server.py kept a backup of the copy it overwrote, outside the repository', typeof report.local.backup === 'string' && existsSync(report.local.backup) && relative(bridge.info.backups, report.local.backup).indexOf('..') !== 0 && outsideRepo(report.local.backup), report.local.backup);
        check('the base is the new fingerprint server.py answered', c.data.Na__DrawData__GetBase() === report.local.drawings.digest && report.local.drawings.digest !== base);
        check('every other key of the temporary project.json is as it was', Object.keys(DOOUS_DOC).every((key) => key === 'LayoutEditor__DrawingsData' || same(onDisk[key], DOOUS_DOC[key])));

        // ANOTHER WINDOW SAVES TO DISK | this window's next save is refused before R2
        const changed = JSON.parse(readFileSync(tempProject, 'utf8'));
        changed.LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__Sheets.push({ Sheet__Id : 'Sheet_998', Sheet__Name : 'Another window' });
        writeFileSync(tempProject, JSON.stringify(changed, null, 4));
        const fileBefore = readFileSync(tempProject, 'utf8');
        const mergesBefore = world.log.filter(isMergeKeys).length;
        const report2 = {};
        const saved2 = await c.data.Na__DrawData__Save(c.toast, report2);
        check('refused before R2 with the v2.146 words', saved2 === false && report2.conflict === true && world.log.filter(isMergeKeys).length === mergesBefore && c.toasts.length === 1 && /^Not saved: the project's drawings on disk are not the ones this window loaded/.test(c.toasts[0].message), { report2, toasts : c.toasts });
        check('the temporary file is as the other window left it', readFileSync(tempProject, 'utf8') === fileBefore);
    } finally {
        await bridge.close();
    }
    check('the real 2026/3047__Doous project.json and notes are byte-for-byte unchanged', Sha1File(join(DOOUS_DIR, 'project.json')) === REAL_HASHES.project && Sha1File(join(DOOUS_DIR, 'ValeVision__DrawingNotes__.json')) === REAL_HASHES.notes);
});


// -----------------------------------------------------------------------------
// REGION | Result
// -----------------------------------------------------------------------------

console.log('\n' + (failures === 0 ? 'RESULT: PASS' : 'RESULT: FAIL') + ' - ' + passes + ' passed, ' + failures + ' failed');
const warnings = consoleKept.filter(([ kind ]) => kind !== 'log');
if (process.argv.includes('--verbose') || failures) warnings.forEach(([ kind, text ]) => logLine('    [' + kind + '] ' + text.slice(0, 300)));
try { rmSync(SCRATCH, { recursive : true, force : true }); } catch (error) { /* temp */ }
process.exit(failures === 0 ? 0 : 1);
