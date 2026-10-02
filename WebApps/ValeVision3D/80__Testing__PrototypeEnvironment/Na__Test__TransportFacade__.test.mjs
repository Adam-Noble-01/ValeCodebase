// =============================================================================
// VALEVISION3D - TEST - TRANSPORT FACADE
// =============================================================================
//
// FILE       : Na__Test__TransportFacade__.test.mjs
// NAMESPACE  : Na__Test
// MODULE     : Transport Facade Test
// AUTHOR     : Adam Noble - Noble Architecture
// PURPOSE    : Prove the transport facade answers every name TrueVision's modules import, with
//              ValeVision's keys, URLs and routes, on every Worker and every host, and never throws
// CREATED    : 01-Oct-2026
//
// DESCRIPTION:
// - THE MODULES AS A BROWSER LOADS THEM. The two facade modules -
//   80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js and
//   03__AppUtils/Na__AppUtils__LocalProjectMirror__.js - load with the
//   ProjectLoader and the Worker-config module they import through Node module
//   hooks that serve them at the URLs a browser loads them from:
//   http://localhost:8000/ValeVision3D/... (the Flask server) and
//   https://adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D/...
//   (GitHub Pages). So import.meta.url - and every repository URL built from
//   it - is the real one. Every case loads a fresh copy of the modules.
// - fetch IS A STUB: the master index (Whitecardopedia's local copy, read only),
//   the local server's editor config, an in-memory editor Worker (1.6.0 with
//   its route list, 1.5.0 with none, or unreachable), an in-memory R2 behind
//   the CDN and an in-memory local server. Every request is logged and checked:
//   the R2 key, the route, the body, the headers.
// - THE LOCAL SERVER FOR REAL. One section drives
//   WebApps/Whitecardopedia/server.py itself through Flask's test client in a
//   child Python process, against a temporary copy of 2026/3047__Doous and a
//   temporary backup root: a drawings save reaches server.py and the
//   repository copy of project.json, guarded by the drawings fingerprint. No
//   server is started, no port is used, no real project or backup is written
//   (the section proves the real project's files are byte-for-byte unchanged).
//   It is skipped, and says so, when Python cannot run it.
// - Writes only to the OS temp folder.
//
// USAGE:
//     node 80__Testing__PrototypeEnvironment/Na__Test__TransportFacade__.test.mjs
//
//   Exit 0 = every check passed. Exit 1 = at least one did not.
//
// -----------------------------------------------------------------------------
//
// PORT NOTE:
// - Authored in   : ValeVision3D first (v2.71.1); no TrueVision twin - TrueVision's own tests stub its
//                   client by name, and these checks pin those names to ValeVision's keys and routes
// - Parity        : ValeVision-only (written with the transport facade, W0-12; the parity plan's WP-S12-05)
// - Back-port     : none.
//
// -----------------------------------------------------------------------------
//
// DEVELOPMENT LOG:
// 01-Oct-2026 - Version 1.0.1 (v2.71.1)
// - The facade PORT NOTE check accepts the release the wave's Parity
//   Scribe writes where the placeholder stood: each module's Ported on
//   line must name the ValeVision release, as the placeholder or as
//   v2.x.y. It had asked for the placeholder itself, which the scribe's
//   own pass must leave nowhere (W0-99).
//
// 01-Oct-2026 - Version 1.0.0 (v2.71.1)
// - Written with the transport facade: the interface, keys and URLs on both
//   hosts, the routes on every Worker, the queue, the save fallbacks, the
//   local mirror, and a drawings save through the real local server.
//
// =============================================================================

import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { register } from 'node:module';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';


// -----------------------------------------------------------------------------
// REGION | Paths, Hosts and Fixtures
// -----------------------------------------------------------------------------

    const SCRIPT_DIR   = dirname(fileURLToPath(import.meta.url));
    const APP_ROOT     = resolve(SCRIPT_DIR, '..');
    const SRC_ROOT     = join(APP_ROOT, '02__Src__AppModules');
    const WCP_ROOT     = resolve(APP_ROOT, '..', 'Whitecardopedia');
    const INDEX_FILE   = join(WCP_ROOT, '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json');
    const DOOUS_DIR    = join(WCP_ROOT, 'Projects', '2026', '3047__Doous');
    const CONFIG_FILE  = join(SRC_ROOT, '02__AppData', 'Na__AppConfig__Main.json');
    const CFAPI_FILE   = join(SRC_ROOT, '80__CloudflareIntegration', 'Na__CloudflareIntegration__ApiClient__.js');
    const MIRROR_FILE  = join(SRC_ROOT, '03__AppUtils', 'Na__AppUtils__LocalProjectMirror__.js');
    const SPECPDF_FILE = join(SRC_ROOT, '51__System__LayoutEditor', '50__Feature__Specification', 'Na__LayoutEditor__SpecPdf__.js');
    const SCRATCH      = mkdtempSync(join(tmpdir(), 'na-transport-facade-'));

    const FLASK_ORIGIN = 'http://localhost:8000';
    const FLASK_BASE   = FLASK_ORIGIN + '/ValeVision3D/';
    const PAGES_ORIGIN = 'https://adam-noble-01.github.io';
    const PAGES_BASE   = PAGES_ORIGIN + '/ValeCodebase/WebApps/ValeVision3D/';
    const PAGES_WEBAPPS = PAGES_ORIGIN + '/ValeCodebase/WebApps';                // <-- The Sheet Images config's PagesBaseUrl
    const CDN_PROJECTS = 'https://cdn.noble-architecture.com/VaApps/Projects';
    const INDEX_URLS   = [
        'https://cdn.noble-architecture.com/VaApps/Index/Na__MasterIndex__ProjectLocations__.json',
        PAGES_ORIGIN + '/ValeCodebase/WebApps/Whitecardopedia/02__Src__AppModules/03__AppData/Na__MasterIndex__ProjectLocations__.json'
    ];
    const WORKER_BASE  = 'https://editor-worker.test/api/editor';
    const API_KEY      = 'test-editor-key';
    const DOOUS        = '2026/3047__Doous';
    const DOOUS_PREFIX = 'VaApps/Projects/2026/3047__Doous/';
    const NOTES        = 'ValeVision__DrawingNotes__.json';
    const STATEMENTS   = 'ValeVision__StatementDocs__.json';

    const INDEX_TEXT   = readFileSync(INDEX_FILE, 'utf8');
    const DOOUS_DOC    = JSON.parse(readFileSync(join(DOOUS_DIR, 'project.json'), 'utf8'));
    const OWNED_KEYS   = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')).ProjectData__EditorOwnedKeys.ProjectData__EditorOwnedKeys__Keys;

    // THE MARKERS NO VALEVISION FILE MAY CARRY (built, so this file carries none itself)
    const TV = 'True' + 'Vision';
    const NA_MARKERS = [ 'NaProject' + 'Portal', '30__' + TV + '__AppContent', '/api/' + TV.toLowerCase(), 'na-' + TV.toLowerCase() + '-api', 'na-project-' + 'portal' ];

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | TrueVision's Interface (read at HEAD b2aa9151)
// -----------------------------------------------------------------------------

    // TRUEVISION'S 33 CLIENT EXPORTS | a number is the function's parameter count, a string a constant's value
    const TV_CFAPI = {
        Na__CfApi__Initialize : 1, Na__CfApi__IsConfigured : 0, Na__CfApi__GetProjectContext : 0,
        Na__CfApi__SetLoadedProjectData : 1, Na__CfApi__GetLoadedProjectData : 0, Na__CfApi__BuildContentCdnUrl : 3,
        Na__CfApi__ReadProjectData : 0, Na__CfApi__WriteProjectData : 1, Na__CfApi__MergeAndSaveKeys : 1,
        Na__CfApi__DeleteProjectKeys : 1, Na__CfApi__WriteThumbnailWebp : 2, Na__CfApi__WriteProjectAsset : 3,
        Na__CfApi__ProjectFileLocation : 1, Na__CfApi__ReadProjectFile : 1, Na__CfApi__WriteProjectFile : 2,
        Na__CfApi__StatementFileLocation : 1, Na__CfApi__ReadStatementFile : 1, Na__CfApi__WriteStatementFile : 3,
        Na__CfApi__AdminFileLocation : 1, Na__CfApi__PlansFileLocation : 1,
        Na__CfApi__SHEET_IMAGES_DIR : '05__Layout__DrawingDocs__Images', Na__CfApi__SHEET_IMAGES_ARCHIVE : '00__Archive',
        Na__CfApi__SheetImageLocation : 2, Na__CfApi__SheetImagesPrefix : 0, Na__CfApi__ListSheetImages : 0,
        Na__CfApi__UploadSheetImage : 3, Na__CfApi__CopySheetImage : 3, Na__CfApi__DeleteSheetImage : 2,
        Na__CfApi__PublishedLocation : 1, Na__CfApi__PublishedPrefix : 1, Na__CfApi__ListPublished : 1,
        Na__CfApi__UploadPublished : 2, Na__CfApi__DeletePublished : 1
    };

    // THE 28 OF THEM TRUEVISION'S MODULES IMPORT (git grep of every importer at the pin, Index.html included)
    const TV_CFAPI_USED = [
        'Na__CfApi__AdminFileLocation', 'Na__CfApi__BuildContentCdnUrl', 'Na__CfApi__CopySheetImage', 'Na__CfApi__DeleteProjectKeys',
        'Na__CfApi__DeletePublished', 'Na__CfApi__DeleteSheetImage', 'Na__CfApi__GetLoadedProjectData', 'Na__CfApi__GetProjectContext',
        'Na__CfApi__Initialize', 'Na__CfApi__IsConfigured', 'Na__CfApi__ListPublished', 'Na__CfApi__ListSheetImages',
        'Na__CfApi__MergeAndSaveKeys', 'Na__CfApi__PlansFileLocation', 'Na__CfApi__ProjectFileLocation', 'Na__CfApi__ReadProjectData',
        'Na__CfApi__ReadProjectFile', 'Na__CfApi__ReadStatementFile', 'Na__CfApi__SHEET_IMAGES_ARCHIVE', 'Na__CfApi__SetLoadedProjectData',
        'Na__CfApi__SheetImageLocation', 'Na__CfApi__StatementFileLocation', 'Na__CfApi__UploadPublished', 'Na__CfApi__UploadSheetImage',
        'Na__CfApi__WriteProjectAsset', 'Na__CfApi__WriteProjectFile', 'Na__CfApi__WriteStatementFile', 'Na__CfApi__WriteThumbnailWebp'
    ];

    // TRUEVISION'S 8 MIRROR EXPORTS, ALL IMPORTED BY ITS MODULES
    const TV_MIRROR = {
        Na__LocalMirror__MergeKeys : 2, Na__LocalMirror__DrawingsFingerprint : 0, Na__LocalMirror__WriteSiblingFile : 2,
        Na__LocalMirror__StatementTree : 0, Na__LocalMirror__WriteStatementFile : 2, Na__LocalMirror__MakeStatementFolder : 1,
        Na__LocalMirror__MoveStatement : 2, Na__LocalMirror__DeleteStatement : 1
    };

    // VALEVISION'S ONE ADDITIVE EXPORT (K2 X2)
    const VV_ONLY = [ 'Na__CfApi__GetProjectDisplayName' ];

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

    // A SECTION RUNS INSIDE A GUARD | a facade that throws is a failing check, with its stack, not the end of the run
    async function RunSection(body) {
        try {
            await body();
        } catch (error) {
            check('the section ran to its end without throwing', false, (error && error.stack) ? error.stack.split('\n').slice(0, 4).join(' | ') : String(error));
        }
    }

    // SETTLE A CALL | its answer, or { threw } when it threw or rejected
    async function Settle(call) {
        try {
            return await call();
        } catch (error) {
            return { threw : true, error : String(error) };
        }
    }

    const clone = (value) => JSON.parse(JSON.stringify(value));
    const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
    const same  = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    // CANONICAL JSON | sorted keys, no spaces (the local server's fingerprint rule)
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
        return (block && block.LayoutEditor__DrawingsData__SavedIso) || null;
    }
    function JsonResponse(status, body) {
        return new Response(JSON.stringify(body), { status : status, headers : { 'Content-Type' : 'application/json' } });
    }
    function Sha1File(path) {
        return existsSync(path) ? createHash('sha1').update(readFileSync(path)).digest('hex') : null;
    }
    function NewBlock(name, savedIso) {
        const block = {
            LayoutEditor__DrawingsData__Version : 1,
            LayoutEditor__DrawingsData__Sheets  : [ { Sheet__Id : 'Sheet_001', Sheet__Name : name } ]
        };
        if (savedIso) block.LayoutEditor__DrawingsData__SavedIso = savedIso;
        return block;
    }

    // CONSOLE | the modules' own warnings are kept, not printed, so the run reads as a list of checks
    const consoleKept = [];
    const consoleReal = { warn : console.warn, info : console.info, error : console.error };
    console.warn  = (...parts) => { consoleKept.push([ 'warn',  parts.join(' ') ]); };
    console.info  = (...parts) => { consoleKept.push([ 'info',  parts.join(' ') ]); };
    console.error = (...parts) => { consoleKept.push([ 'error', parts.map((part) => (part && part.message) || String(part)).join(' ') ]); };

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Module Hooks: the Modules at Their Browser URLs, Fresh per Case
// -----------------------------------------------------------------------------

    const HOOKS_SOURCE = [
        "import { readFileSync } from 'node:fs';",
        "import { fileURLToPath } from 'node:url';",
        "let state = { appRootUrl : '', bases : [] };",
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
        "    if (base) return { format : 'module', source : readFileSync(fileURLToPath(state.appRootUrl + plain.slice(base.length)), 'utf8'), shortCircuit : true };",
        "    return nextLoad(url, context);",
        "}"
    ].join('\n');
    const HOOKS_FILE = join(SCRATCH, 'hooks.mjs');
    writeFileSync(HOOKS_FILE, HOOKS_SOURCE);
    register(pathToFileURL(HOOKS_FILE).href, {
        parentURL : import.meta.url,
        data      : { appRootUrl : pathToFileURL(APP_ROOT + '/').href, bases : [ FLASK_BASE, PAGES_BASE ] }
    });

    // THE PAGE | window.location as each host gives it
    function SetPage(host, search) {
        window.location = (host === 'pages')
            ? { hostname : 'adam-noble-01.github.io', port : '', search : search, origin : PAGES_ORIGIN, href : PAGES_BASE + 'index.html' + search }
            : { hostname : 'localhost', port : '8000', search : search, origin : FLASK_ORIGIN, href : FLASK_BASE + 'index.html' + search };
    }
    globalThis.window = { location : null, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } };

    let caseNumber = 0;
    async function OpenCase(host, search, world) {
        caseNumber += 1;
        SetPage(host, search);
        globalThis.fetch = MakeFetch(world);
        const base   = (host === 'pages') ? PAGES_BASE : FLASK_BASE;
        const cf     = await import(base + '02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js?case=' + caseNumber);
        const mirror = await import(base + '02__Src__AppModules/03__AppUtils/Na__AppUtils__LocalProjectMirror__.js?case=' + caseNumber);
        return { cf : cf, mirror : mirror, world : world };
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Fake Services: Index, Editor Config, Worker, R2 and CDN, Local Server
// -----------------------------------------------------------------------------

    function NewWorld(settings) {
        const world = Object.assign({
            worker           : '1.6.0',          // <-- '1.6.0', '1.5.0' or 'down'
            editorConfig     : true,
            fingerprintRoute : true,
            statementRoutes  : true,
            localHealth      : true,
            localPostStatus  : 0,                // <-- 405 or 501: the local server refuses the POST like that
            mergeBusy        : 0,                // <-- merge-keys answers 503 retry this many times first
            mergeDelayMs     : 0,                // <-- the first merge-keys answer is held this long
            localPostDelayMs : 0,                // <-- the first local project POST is held this long
            listPage         : 2,                // <-- names per files/list page (proves the cursor is followed)
            bridge           : null
        }, settings || {});
        world.r2 = new Map(); world.disk = new Map(); world.siblings = new Map();
        world.log = []; world.events = []; world.violations = []; world.unexpected = [];
        world.bumps = 0; world.seq = 0;
        return world;
    }
    function PutR2(world, key, bytes, type) { world.r2.set(key, { bytes : Buffer.from(bytes), type : type || 'application/octet-stream' }); }
    function PutR2Json(world, key, value) { PutR2(world, key, Buffer.from(JSON.stringify(value, null, 4)), 'application/json'); }
    function GetR2Json(world, key) { const one = world.r2.get(key); return one ? JSON.parse(one.bytes.toString('utf8')) : null; }
    function Requests(world, test) { return world.log.filter(test); }
    function WorkerCalls(world, suffix) { return world.log.filter((one) => one.worker && one.worker.suffix === suffix); }

    function MakeFetch(world) {
        return async function (input, init) {
            const url     = String(input instanceof URL ? input.href : input);
            const options = init || {};
            const method  = String(options.method || 'GET').toUpperCase();
            const headers = {};
            Object.entries(options.headers || {}).forEach(([ name, value ]) => { headers[name.toLowerCase()] = String(value); });
            let bodyText = null, bodyBytes = null;
            if (typeof options.body === 'string') bodyText = options.body;
            else if (options.body instanceof Blob) bodyBytes = new Uint8Array(await options.body.arrayBuffer());
            const record = { n : ++world.seq, method : method, url : url, headers : headers, bodyText : bodyText, bodyBytes : bodyBytes, cache : options.cache || null };
            world.log.push(record);
            if (world.worker === 'down' && url.startsWith(WORKER_BASE)) throw new TypeError('fetch failed');
            try {
                return await Route(world, record);
            } catch (error) {
                world.unexpected.push(method + ' ' + url + ' : ' + error.message);
                return JsonResponse(500, { error : 'test stub failed: ' + error.message });
            }
        };
    }

    async function Route(world, rec) {
        const plain = rec.url.split('?')[0];
        if (INDEX_URLS.indexOf(plain) !== -1) return new Response(INDEX_TEXT, { status : 200, headers : { 'Content-Type' : 'application/json' } });
        if (plain === FLASK_ORIGIN + '/api/editor-config') {
            return world.editorConfig ? JsonResponse(200, { workerApiBaseUrl : WORKER_BASE, apiKey : API_KEY }) : JsonResponse(503, { error : 'Editor worker config missing' });
        }
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

    // THE WORKER | 1.6.0's routes, or 1.5.0's (which would take a new route's POST as a save)
    const NEW_SUFFIXES = [ '/files/read', '/files/write', '/files/upload', '/files/list', '/files/copy', '/files/delete', '/merge-keys', '/project' ];
    const OLD_SUFFIXES = [ '/visibility', '/rename', '/delete', '/drawing-notes', '/assets' ];
    async function WorkerRoute(world, rec) {
        const url  = new URL(rec.url);
        const rest = url.pathname.slice('/api/editor/projects/'.length);
        let suffix = '';
        for (const one of NEW_SUFFIXES.concat(OLD_SUFFIXES)) {
            if (rest.length > one.length && rest.endsWith(one)) { suffix = one; break; }
        }
        const folderId = decodeURIComponent(rest.slice(0, rest.length - suffix.length));
        rec.worker = { suffix : suffix, folderId : folderId, rawFolder : rest.slice(0, rest.length - suffix.length) };
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
        if (suffix === '/merge-keys' && rec.method === 'POST') return WorkerMerge(world, rec, prefix, body);
        if (suffix === '/drawing-notes') {
            if (rec.method === 'GET') {
                const doc = GetR2Json(world, prefix + NOTES);
                return doc ? JsonResponse(200, doc) : JsonResponse(404, { missing : true });
            }
            PutR2Json(world, prefix + NOTES, body);
            world.bumps += 1;
            return JsonResponse(200, { success : true });
        }
        if (suffix === '/assets' && rec.method === 'POST') {
            if (!/^(PresentationMode\/Thumbnails|LayoutEditor\/(Linework|Snapshots))\/[A-Za-z0-9_.-]+\.(webp|png|json)$/.test(body.path || '')) return JsonResponse(400, { error : 'Asset path not allowed' });
            if (body.encoding !== 'base64' || typeof body.data !== 'string') return JsonResponse(400, { error : 'Asset body must carry base64 data' });
            PutR2(world, prefix + body.path, Buffer.from(body.data, 'base64'), body.contentType);
            world.bumps += 1;
            return JsonResponse(200, { ok : true, path : body.path });
        }
        if (suffix.startsWith('/files/')) return WorkerFiles(world, rec, prefix, body, suffix, url);
        return JsonResponse(404, { error : 'No route matched' });
    }

    async function WorkerMerge(world, rec, prefix, body) {
        world.events.push('merge-start#' + rec.n);
        if (world.mergeDelayMs && !world.mergeDelayed) { world.mergeDelayed = true; await sleep(world.mergeDelayMs); }
        try {
            if (Object.keys(body || {}).some((field) => [ 'set', 'remove', 'drawingsBase', 'bumpBuild' ].indexOf(field) === -1)) {
                return JsonResponse(400, { error : 'Unknown field(s) - merge-keys takes { set, remove, drawingsBase, bumpBuild }' });
            }
            if (world.mergeBusy > 0) { world.mergeBusy -= 1; return JsonResponse(503, { error : 'project.json kept changing', retry : true }); }
            const set = body.set || {}, remove = body.remove || [];
            const refused = [];
            Object.keys(set).forEach((key) => { if (OWNED_KEYS.indexOf(key) === -1) refused.push({ key : key, op : 'set', reason : 'not on ProjectData__EditorOwnedKeys' }); });
            remove.forEach((key) => { if (OWNED_KEYS.indexOf(key) === -1 && key !== 'valeVision_Camera__DefaultPosition') refused.push({ key : key, op : 'remove', reason : 'not on ProjectData__EditorOwnedKeys' }); });
            if (refused.length) return JsonResponse(400, { error : 'Refused key(s): ' + refused.map((one) => one.key).join(', '), refused : refused });
            const doc = GetR2Json(world, prefix + 'project.json');
            if (!doc) return JsonResponse(409, { error : 'No project.json on R2', missing : true });
            const base = SavedIso(doc) ? 'iso:' + SavedIso(doc) : 'none';
            if (body.drawingsBase !== undefined && body.drawingsBase !== null && body.drawingsBase !== base) {
                return JsonResponse(409, { error : 'The drawings on R2 are not the ones this window loaded', conflict : true, drawings : { savedIso : SavedIso(doc) } });
            }
            const merged = Object.assign({}, doc, set);
            remove.forEach((key) => { delete merged[key]; });
            PutR2Json(world, prefix + 'project.json', merged);
            if (body.bumpBuild === true) world.bumps += 1;
            return JsonResponse(200, { ok : true, success : true, drawings : { savedIso : SavedIso(merged) } });
        } finally {
            world.events.push('merge-end#' + rec.n);
        }
    }

    async function WorkerFiles(world, rec, prefix, body, suffix, url) {
        if (suffix === '/files/read') {
            const one = world.r2.get(prefix + body.path);
            if (!one) return JsonResponse(404, { error : 'Not on R2', missing : true, path : body.path });
            if (/\.json$/i.test(body.path)) return JsonResponse(200, { ok : true, path : body.path, data : JSON.parse(one.bytes.toString('utf8')) });
            if (/\.(md|html|txt)$/i.test(body.path)) return JsonResponse(200, { ok : true, path : body.path, text : one.bytes.toString('utf8') });
            return JsonResponse(200, { ok : true, path : body.path, data : one.bytes.toString('base64'), encoding : 'base64' });
        }
        if (suffix === '/files/write') {
            if (Object.keys(body).some((field) => [ 'path', 'data', 'encoding', 'contentType', 'cacheControl' ].indexOf(field) === -1)) return JsonResponse(400, { error : 'Unknown field(s)' });
            if (body.path === 'project.json') return JsonResponse(400, { error : 'project.json is not a project file' });
            let bytes;
            if (body.encoding === 'base64') bytes = Buffer.from(body.data, 'base64');
            else if (typeof body.data === 'string') bytes = Buffer.from(body.data, 'utf8');
            else bytes = Buffer.from(JSON.stringify(body.data, null, 4));
            PutR2(world, prefix + body.path, bytes, /\.json$/i.test(body.path) ? 'application/json' : 'text/plain');
            return JsonResponse(200, { ok : true, path : body.path, key : prefix + body.path, size : bytes.length });
        }
        if (suffix === '/files/upload') {
            const path = url.searchParams.get('path');
            PutR2(world, prefix + path, rec.bodyBytes || new Uint8Array(0), rec.headers['content-type']);
            return JsonResponse(200, { ok : true, path : path, key : prefix + path, size : (rec.bodyBytes || []).length });
        }
        if (suffix === '/files/list') {
            const all   = [ ...world.r2.keys() ].filter((key) => key.startsWith(prefix + body.prefix)).sort();
            const start = body.cursor ? Number(body.cursor) : 0;
            const page  = all.slice(start, start + world.listPage);
            const more  = start + world.listPage < all.length;
            return JsonResponse(200, {
                ok : true, prefix : body.prefix,
                objects : page.map((key) => ({ path : key.slice(prefix.length), size : world.r2.get(key).bytes.length, etag : 'etag-' + key.length })),
                truncated : more, cursor : more ? String(start + world.listPage) : null
            });
        }
        if (suffix === '/files/copy') {
            const one = world.r2.get(prefix + body.from);
            if (!one) return JsonResponse(404, { error : 'Not on R2', missing : true });
            world.r2.set(prefix + body.to, one);
            return JsonResponse(200, { ok : true, key : prefix + body.to });
        }
        if (suffix === '/files/delete') {
            const paths = body.paths || [ body.path ];
            paths.forEach((path) => { world.r2.delete(prefix + path); });
            return JsonResponse(200, { ok : true, deleted : paths.length });
        }
        return JsonResponse(404, { error : 'No route matched' });
    }

    // THE CDN | R2's public face: a missing key is a 404
    function CdnRoute(world, rec) {
        const url = new URL(rec.url);
        const key = 'VaApps/Projects/' + decodeURIComponent(url.pathname.slice('/VaApps/Projects/'.length));
        rec.cdn = { key : key };
        const one = world.r2.get(key);
        if (!one) return new Response('Not Found', { status : 404 });
        return new Response(one.bytes, { status : 200, headers : { 'Content-Type' : one.type } });
    }

    // THE LOCAL SERVER | WebApps/Whitecardopedia/server.py's project routes, in memory
    async function LocalRoute(world, rec) {
        const url  = new URL(rec.url);
        const path = decodeURIComponent(url.pathname);
        if (path === '/api/health') {
            return world.localHealth ? JsonResponse(200, { status : 'ok', service : 'whitecardopedia-local-dev', app : 'ValeVision3D', port : 8000 }) : new Response('<html>', { status : 404 });
        }
        if (path.startsWith('/api/valevision/statements/')) {
            rec.local = { statement : path.slice('/api/valevision/statements/'.length), query : url.search };
            if (!world.statementRoutes) return JsonResponse(404, { error : 'no such API route' });
            if (rec.method === 'GET') return JsonResponse(200, { exists : true, entries : [ { path : '01__PreApp__Statement', kind : 'folder' } ] });
            return JsonResponse(200, { success : true });
        }
        if (!path.startsWith('/api/projects/')) return JsonResponse(404, { error : 'no such API route' });

        let rest = path.slice('/api/projects/'.length);
        let sub  = '';
        const fingerprint = rest.match(/^(.*)\/drawings-fingerprint$/);
        const files       = rest.match(/^(.*)\/files\/([^/]+)$/);
        if (fingerprint) { rest = fingerprint[1]; sub = 'fingerprint'; }
        else if (files) { rest = files[1]; sub = 'files:' + files[2]; }
        rec.local = { folderId : rest, sub : sub, rawPath : url.pathname };
        const doc = world.disk.get(rest);

        if (sub === 'fingerprint') {
            if (!world.fingerprintRoute) return JsonResponse(404, { error : 'Project not found: ' + rest + '/drawings-fingerprint' });
            if (!doc) return JsonResponse(404, { error : 'Project not found: ' + rest });
            return JsonResponse(200, { status : 'ok', folderId : rest, drawings : { savedIso : SavedIso(doc), digest : Digest(doc) } });
        }
        if (sub.startsWith('files:')) {
            const name = sub.slice('files:'.length);
            if ([ NOTES, STATEMENTS ].indexOf(name) === -1) return JsonResponse(400, { error : 'Refused file name' });
            if (rec.method === 'POST') {
                world.siblings.set(rest + '::' + name, JSON.parse(rec.bodyText));
                return JsonResponse(200, { success : true, message : 'saved', projectFile : name, backup : 'C:/Backups/' + name });
            }
            const kept = world.siblings.get(rest + '::' + name);
            return kept ? JsonResponse(200, kept) : JsonResponse(404, { error : 'not found', missing : true });
        }
        if (rec.method === 'GET') {
            world.events.push('local-get#' + rec.n);
            return doc ? JsonResponse(200, doc) : JsonResponse(404, { error : 'Project not found: ' + rest });
        }
        world.events.push('local-post-start#' + rec.n);
        if (world.localPostDelayMs && !world.localPostDelayed) { world.localPostDelayed = true; await sleep(world.localPostDelayMs); }
        try {
            if (world.localPostStatus) return new Response('<html>refused</html>', { status : world.localPostStatus });
            const base = rec.headers['x-valevision-drawings-base'];
            if (base !== undefined && (base.trim() || 'none') !== (Digest(doc) || 'none')) {
                return JsonResponse(409, { error : 'The drawings on disk are not the ones this window loaded', conflict : true, drawings : { savedIso : SavedIso(doc), digest : Digest(doc) } });
            }
            const incoming = JSON.parse(rec.bodyText);
            world.disk.set(rest, incoming);
            return JsonResponse(200, { success : true, message : 'saved', drawings : { savedIso : SavedIso(incoming), digest : Digest(incoming) }, backup : 'C:/Backups/project.json' });
        } finally {
            world.events.push('local-post-end#' + rec.n);
        }
    }

    // A WORLD WITH 2026/3047__Doous ON R2 AND ON DISK
    function DoousWorld(settings) {
        const world = NewWorld(settings);
        PutR2Json(world, DOOUS_PREFIX + 'project.json', DOOUS_DOC);
        world.disk.set(DOOUS, clone(DOOUS_DOC));
        return world;
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Real Local Server, Through Flask's Test Client in a Child Process
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
        "emit({'ready': True, 'projects': projects, 'backups': backups, 'project': os.path.join(target, 'project.json'), 'notes': os.path.join(target, 'ValeVision__DrawingNotes__.json')})",
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
            const finish = (value) => {
                if (settled) return;
                settled = true;
                if (timer) clearTimeout(timer);
                resolveStart(value);
            };
            try {
                child = spawn('python', [ '-B', script, WCP_ROOT, join(SCRATCH, 'bridge') ], { stdio : [ 'pipe', 'pipe', 'pipe' ], windowsHide : true });
            } catch (error) {
                finish({ ok : false, error : (error && error.message) || 'python could not start' });
                return;
            }
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
            // CLOSE | end its input, then wait for it to leave (killed after 15 s), so its temporary files can go
            async function close() {
                try { child.stdin.end(); } catch (error) { /* already closed */ }
                const waited = await Promise.race([ exited.then(() => true), sleep(15000).then(() => false) ]);
                if (!waited) { try { child.kill(); } catch (error) { /* already gone */ } }
            }
        });
    }

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Interface
// -----------------------------------------------------------------------------

    console.log('ValeVision3D - transport facade');
    await RunSection(async () => {
        section('THE INTERFACE | TrueVision\'s names, parameters and constants');
        const { cf, mirror } = await OpenCase('flask', '?project=' + DOOUS, DoousWorld());
        const cfNames     = Object.keys(cf).sort();
        const mirrorNames = Object.keys(mirror).sort();
        const missingCf   = Object.keys(TV_CFAPI).filter((name) => !(name in cf));
        check('every one of TrueVision\'s 33 client exports is exported', missingCf.length === 0, missingCf);
        check('the client exports nothing else but the ValeVision-only display-name accessor', same(cfNames, Object.keys(TV_CFAPI).concat(VV_ONLY).sort()), cfNames);
        check('the 28 names TrueVision\'s modules import are all among them', TV_CFAPI_USED.every((name) => name in cf), TV_CFAPI_USED.filter((name) => !(name in cf)));
        const arity = Object.keys(TV_CFAPI).filter((name) => typeof TV_CFAPI[name] === 'number')
            .filter((name) => typeof cf[name] !== 'function' || cf[name].length !== TV_CFAPI[name]);
        check('each client function takes TrueVision\'s parameters (same count)', arity.length === 0, arity.map((name) => name + ' ' + (cf[name] && cf[name].length)));
        check('the two sheet-image constants keep TrueVision\'s values', cf.Na__CfApi__SHEET_IMAGES_DIR === TV_CFAPI.Na__CfApi__SHEET_IMAGES_DIR && cf.Na__CfApi__SHEET_IMAGES_ARCHIVE === TV_CFAPI.Na__CfApi__SHEET_IMAGES_ARCHIVE);
        check('the mirror exports exactly TrueVision\'s 8 names', same(mirrorNames, Object.keys(TV_MIRROR).sort()), mirrorNames);
        const mirrorArity = Object.keys(TV_MIRROR).filter((name) => typeof mirror[name] !== 'function' || mirror[name].length !== TV_MIRROR[name]);
        check('each mirror function takes TrueVision\'s parameters (same count)', mirrorArity.length === 0, mirrorArity);
        check('the display-name accessor is a function of no arguments', typeof cf.Na__CfApi__GetProjectDisplayName === 'function' && cf.Na__CfApi__GetProjectDisplayName.length === 0);
    });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Keys and URLs: the Flask Server
// -----------------------------------------------------------------------------

    await RunSection(async () => {
        section('KEYS AND URLS | localhost:8000, ?project=2026/3047__Doous');
        const world = DoousWorld();
        const { cf } = await OpenCase('flask', '?project=' + DOOUS, world);
        check('before Initialize nothing is configured and no folder is answered', cf.Na__CfApi__IsConfigured() === false && cf.Na__CfApi__ProjectFileLocation(NOTES) === null);
        const firstInit = cf.Na__CfApi__Initialize();
        check('Initialize runs once: a second call answers the same promise', firstInit === cf.Na__CfApi__Initialize());
        const init = await firstInit;
        check('Initialize: configured, the folder from the master index, Worker 1.6.0 and its routes', init.ok && init.configured === true && init.folderId === DOOUS && init.version === '1.6.0' && init.routes.indexOf('merge-keys') !== -1 && init.routes.indexOf('files') !== -1, init);
        check('...reading the editor config from the local server and the Worker\'s /health once each',
            Requests(world, (one) => one.url === FLASK_ORIGIN + '/api/editor-config').length === 1 && Requests(world, (one) => one.url === WORKER_BASE + '/health').length === 1);
        check('IsConfigured answers synchronously, true', cf.Na__CfApi__IsConfigured() === true);

        const context = cf.Na__CfApi__GetProjectContext();
        check('GetProjectContext: folder, four-digit year, code and folderId', same(context, { projectFolder : '3047__Doous', yearCode : '2026', projectCode : '3047', folderId : DOOUS }), context);

        const notes = cf.Na__CfApi__ProjectFileLocation(NOTES);
        check('the notes file: R2 key under VaApps/Projects/2026/3047__Doous/', notes && notes.key === DOOUS_PREFIX + NOTES, notes);
        check('...its CDN URL', notes && notes.cdnUrl === CDN_PROJECTS + '/2026/3047__Doous/' + NOTES, notes);
        check('...and its repository URL on the Flask server (/Whitecardopedia/Projects/..., not the app folder)', notes && notes.repoUrl === FLASK_ORIGIN + '/Whitecardopedia/Projects/2026/3047__Doous/' + NOTES, notes);
        check('the statement index is a sibling file too', (cf.Na__CfApi__ProjectFileLocation(STATEMENTS) || {}).key === DOOUS_PREFIX + STATEMENTS);
        check('project.json, TrueVision\'s notes name and any other name are refused (null)',
            cf.Na__CfApi__ProjectFileLocation('project.json') === null && cf.Na__CfApi__ProjectFileLocation(TV + '__DrawingNotes__.json') === null && cf.Na__CfApi__ProjectFileLocation('../x.json') === null);

        const statement = cf.Na__CfApi__StatementFileLocation('01__PreApp__Statement/Doous Statement (Draft).md');
        check('a statement: key under 10__StatementDocs/ at the project root', statement && statement.key === DOOUS_PREFIX + '10__StatementDocs/01__PreApp__Statement/Doous Statement (Draft).md', statement);
        check('...its CDN URL encoded per segment', statement && statement.cdnUrl === CDN_PROJECTS + '/2026/3047__Doous/10__StatementDocs/01__PreApp__Statement/Doous%20Statement%20(Draft).md', statement);
        check('...its repository URL and its path', statement && statement.repoUrl === FLASK_ORIGIN + '/Whitecardopedia/Projects/2026/3047__Doous/10__StatementDocs/01__PreApp__Statement/Doous%20Statement%20(Draft).md' && statement.path === '01__PreApp__Statement/Doous Statement (Draft).md', statement);
        check('statements refuse "..", a sixth level and a foreign type',
            cf.Na__CfApi__StatementFileLocation('../x.md') === null && cf.Na__CfApi__StatementFileLocation('a/b/c/d/e/f.md') === null && cf.Na__CfApi__StatementFileLocation('a/x.exe') === null);

        const picture = cf.Na__CfApi__SheetImageLocation('D01', 'Kitchen__0123456789.webp');
        check('a sheet picture: key under 05__Layout__DrawingDocs__Images/<document>/', picture && picture.key === DOOUS_PREFIX + '05__Layout__DrawingDocs__Images/D01/Kitchen__0123456789.webp', picture);
        check('...CDN and repository URLs', picture && picture.cdnUrl === CDN_PROJECTS + '/2026/3047__Doous/05__Layout__DrawingDocs__Images/D01/Kitchen__0123456789.webp'
            && picture.repoUrl === FLASK_ORIGIN + '/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/D01/Kitchen__0123456789.webp', picture);
        check('...and the path under the repository root a Pages fallback is built from', picture && picture.relative === 'Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/D01/Kitchen__0123456789.webp' && picture.folder === 'D01' && picture.file === 'Kitchen__0123456789.webp', picture);
        check('sheet pictures refuse the archive folder, ".." and a name with a space',
            cf.Na__CfApi__SheetImageLocation('00__Archive', 'a.webp') === null && cf.Na__CfApi__SheetImageLocation('..', 'a.webp') === null && cf.Na__CfApi__SheetImageLocation('D01', 'a b.webp') === null);
        check('the sheet pictures key prefix', cf.Na__CfApi__SheetImagesPrefix() === DOOUS_PREFIX + '05__Layout__DrawingDocs__Images/');

        const hashed = cf.Na__CfApi__PublishedLocation('D01/Sheet__0123456789.svg');
        const fixed  = cf.Na__CfApi__PublishedLocation('index.json');
        check('a published file: key under 06__Layout__PublishedDocuments/, hashed names immutable', hashed && hashed.key === DOOUS_PREFIX + '06__Layout__PublishedDocuments/D01/Sheet__0123456789.svg' && hashed.immutable === true && hashed.path === 'D01/Sheet__0123456789.svg', hashed);
        check('...a fixed name is not immutable, and its URLs are right', fixed && fixed.immutable === false && fixed.cdnUrl === CDN_PROJECTS + '/2026/3047__Doous/06__Layout__PublishedDocuments/index.json'
            && fixed.repoUrl === FLASK_ORIGIN + '/Whitecardopedia/Projects/2026/3047__Doous/06__Layout__PublishedDocuments/index.json', fixed);
        check('the published archive never leaves the machine', cf.Na__CfApi__PublishedLocation('00__Archive__Revisions/x.json') === null && cf.Na__CfApi__PublishedLocation('a/b/c/d/e/f/g.json') === null);
        check('published prefixes: the root and one document', cf.Na__CfApi__PublishedPrefix(null) === DOOUS_PREFIX + '06__Layout__PublishedDocuments/' && cf.Na__CfApi__PublishedPrefix('D01') === DOOUS_PREFIX + '06__Layout__PublishedDocuments/D01/' && cf.Na__CfApi__PublishedPrefix('../x') === null);

        check('BuildContentCdnUrl: VaApps layout, no app-content level', cf.Na__CfApi__BuildContentCdnUrl('3047__Doous', '2026', 'PresentationMode/Thumbnails/Scene_001.webp') === CDN_PROJECTS + '/2026/3047__Doous/PresentationMode/Thumbnails/Scene_001.webp');
        check('...a two-digit year reads as 20NN', cf.Na__CfApi__BuildContentCdnUrl('3047__Doous', '26', 'x.webp') === CDN_PROJECTS + '/2026/3047__Doous/x.webp');
        check('admin and PlanVision files: ValeVision has none (null)', cf.Na__CfApi__AdminFileLocation('ProjectAdmin__ProjectConfig__.json') === null && cf.Na__CfApi__PlansFileLocation('PlanVision__ProjectData__.json') === null);

        // THE DISPLAY NAME
        check('no project data loaded: the display name is empty', cf.Na__CfApi__GetProjectDisplayName() === '');
        const loaded = clone(DOOUS_DOC);
        cf.Na__CfApi__SetLoadedProjectData(loaded);
        check('the loaded project data is registered as it was given', cf.Na__CfApi__GetLoadedProjectData() === loaded);
        check('2026/3047__Doous: its display name is "Doous"', cf.Na__CfApi__GetProjectDisplayName() === 'Doous', cf.Na__CfApi__GetProjectDisplayName());
        cf.Na__CfApi__SetLoadedProjectData({ projectName : 'Real Name', displayName : 'Shown Name', projectNameAlias : '  Alias  ' });
        check('an alias wins, trimmed (as Whitecardopedia shows it)', cf.Na__CfApi__GetProjectDisplayName() === 'Alias');
        cf.Na__CfApi__SetLoadedProjectData({ projectName : 'Real Name', displayName : 'Shown Name', projectNameAlias : '' });
        check('...then displayName', cf.Na__CfApi__GetProjectDisplayName() === 'Shown Name');
        cf.Na__CfApi__SetLoadedProjectData({ projectName : 'Real Name' });
        check('...then projectName', cf.Na__CfApi__GetProjectDisplayName() === 'Real Name');
        cf.Na__CfApi__SetLoadedProjectData('not data');
        check('anything but an object registers nothing', cf.Na__CfApi__GetLoadedProjectData() === null && cf.Na__CfApi__GetProjectDisplayName() === '');
        check('no request went anywhere but the index, the editor config and /health', world.unexpected.length === 0 && world.log.every((one) => INDEX_URLS.indexOf(one.url.split('?')[0]) !== -1 || one.url === FLASK_ORIGIN + '/api/editor-config' || one.url === WORKER_BASE + '/health'), world.log.map((one) => one.url));
    });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Saves on Worker 1.6.0: merge-keys, the Queue and the Fallbacks
// -----------------------------------------------------------------------------

    await RunSection(async () => {
        section('SAVES | Worker 1.6.0 (merge-keys and the files routes listed)');
        const world = DoousWorld();
        const { cf } = await OpenCase('flask', '?project=' + DOOUS, world);
        await cf.Na__CfApi__Initialize();
        const loaded = clone(DOOUS_DOC);
        cf.Na__CfApi__SetLoadedProjectData(loaded);

        const blockA = NewBlock('Sheet A');
        const merged = await cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : blockA });
        const mergeCalls = WorkerCalls(world, '/merge-keys');
        const mergeBody  = mergeCalls.length ? JSON.parse(mergeCalls[0].bodyText) : null;
        check('a merge goes to merge-keys with the keys in set, and lands', merged.ok === true && mergeCalls.length === 1 && same(mergeBody, { set : { LayoutEditor__DrawingsData : blockA } }), { merged, mergeBody });
        check('...the URL names the project folder, encoded per segment, with the editor key', mergeCalls.length === 1 && mergeCalls[0].worker.rawFolder === '2026/3047__Doous' && mergeCalls[0].headers['x-editor-api-key'] === API_KEY);
        check('...no top-level projectCode in the body, no drawingsBase unless asked', mergeBody && !('projectCode' in mergeBody) && !('drawingsBase' in mergeBody));
        check('...R2 holds the block, every other key as it was', same(GetR2Json(world, DOOUS_PREFIX + 'project.json').LayoutEditor__DrawingsData, blockA) && GetR2Json(world, DOOUS_PREFIX + 'project.json').projectCode === DOOUS_DOC.projectCode);
        check('...the loaded copy is kept current', same(cf.Na__CfApi__GetLoadedProjectData().LayoutEditor__DrawingsData, blockA));
        check('...no whole-document save and no build-manifest bump', WorkerCalls(world, '').length === 0 && world.bumps === 0);

        // THE QUEUE
        world.mergeDelayMs = 80;
        const blockB = NewBlock('Sheet B'), blockC = NewBlock('Sheet C');
        const results = await Promise.all([
            cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : blockB }),
            cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : blockC })
        ]);
        const order = world.events.filter((event) => event.startsWith('merge-'));
        const lastTwo = order.slice(-4).map((event) => event.split('#')[0]);
        check('MergeAndSaveKeys is queued: the second merge starts only after the first has answered', results.every((one) => one.ok) && same(lastTwo, [ 'merge-start', 'merge-end', 'merge-start', 'merge-end' ]), order);
        check('...and the later save is the one R2 keeps', same(GetR2Json(world, DOOUS_PREFIX + 'project.json').LayoutEditor__DrawingsData, blockC));

        // DELETES SHARE THE QUEUE AND THE ROUTE
        world.r2.set(DOOUS_PREFIX + 'project.json', { bytes : Buffer.from(JSON.stringify(Object.assign(GetR2Json(world, DOOUS_PREFIX + 'project.json'), { valeVision_Camera__DefaultPosition : { x : 1 } }))), type : 'application/json' });
        const deleted = await cf.Na__CfApi__DeleteProjectKeys([ 'valeVision_Camera__DefaultPosition' ]);
        const deleteBody = JSON.parse(WorkerCalls(world, '/merge-keys').slice(-1)[0].bodyText);
        check('DeleteProjectKeys: merge-keys { remove }, the legacy camera key allowed', deleted.ok === true && same(deleteBody, { remove : [ 'valeVision_Camera__DefaultPosition' ] }) && !('valeVision_Camera__DefaultPosition' in GetR2Json(world, DOOUS_PREFIX + 'project.json')), { deleted, deleteBody });

        // REFUSALS, BEFORE ANY REQUEST
        const before = world.log.length;
        const refusedSet    = await cf.Na__CfApi__MergeAndSaveKeys({ projectCode : '1', LayoutEditor__DrawingsData : blockA });
        const refusedImages = await cf.Na__CfApi__MergeAndSaveKeys({ images : [] });
        const refusedLegacy = await cf.Na__CfApi__MergeAndSaveKeys({ valeVision_Camera__DefaultPosition : { x : 2 } });
        const refusedRemove = await cf.Na__CfApi__DeleteProjectKeys([ 'valeVision_ModelUrls' ]);
        check('pipeline keys are refused on every path (set and remove), and the legacy camera key is never set',
            !refusedSet.ok && /projectCode/.test(refusedSet.error) && !refusedImages.ok && !refusedLegacy.ok && !refusedRemove.ok, [ refusedSet, refusedImages, refusedLegacy, refusedRemove ]);
        check('...and nothing was sent', world.log.length === before);
        const empty = await cf.Na__CfApi__MergeAndSaveKeys({});
        const nothing = await Settle(() => cf.Na__CfApi__MergeAndSaveKeys(undefined));
        check('an empty merge is a no-op success; an unreadable one resolves with an error (never throws)', empty.ok === true && nothing.ok === false && !nothing.threw && world.log.length === before, nothing);

        // THE R2 JUDGING (optional, VV)
        const stamped = Object.assign(GetR2Json(world, DOOUS_PREFIX + 'project.json'), { LayoutEditor__DrawingsData : NewBlock('Stamped', '2026-10-01T10:00:00.000Z') });
        PutR2Json(world, DOOUS_PREFIX + 'project.json', stamped);
        const stale = await cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : NewBlock('Stale') }, { drawingsBase : 'iso:2026-09-01T00:00:00.000Z' });
        check('a stale drawingsBase is refused by the Worker: conflict, with the stamp on R2, nothing written', stale.ok === false && stale.conflict === true && stale.drawings && stale.drawings.savedIso === '2026-10-01T10:00:00.000Z' && GetR2Json(world, DOOUS_PREFIX + 'project.json').LayoutEditor__DrawingsData.Sheet__Name === undefined
            && GetR2Json(world, DOOUS_PREFIX + 'project.json').LayoutEditor__DrawingsData.LayoutEditor__DrawingsData__Sheets[0].Sheet__Name === 'Stamped', stale);
        const fresh = await cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : NewBlock('Fresh', '2026-10-01T11:00:00.000Z') }, { drawingsBase : 'iso:2026-10-01T10:00:00.000Z' });
        check('...a current one lands and answers the new stamp', fresh.ok === true && fresh.drawings && fresh.drawings.savedIso === '2026-10-01T11:00:00.000Z', fresh);
        await cf.Na__CfApi__MergeAndSaveKeys({ CrossSection__SceneData : {} }, { drawingsBase : null });
        check('...drawingsBase null is sent as "none"', JSON.parse(WorkerCalls(world, '/merge-keys').slice(-1)[0].bodyText).drawingsBase === 'none');

        // RETRY
        world.mergeBusy = 1;
        const callsBefore = WorkerCalls(world, '/merge-keys').length;
        const retried = await cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : NewBlock('Retried') });
        check('a 503 retry from the Worker is sent again, and lands', retried.ok === true && WorkerCalls(world, '/merge-keys').length === callsBefore + 2, retried);

        // FALLBACK: A KEY THE DEPLOYED LIST DOES NOT HAVE
        const disk = world.disk.get(DOOUS);
        disk.FogPlane__Config = { Marker : 'disk' };
        const foreign = await cf.Na__CfApi__MergeAndSaveKeys({ Navmode__FovOverrides : { Walk : 60 } });
        const saveCalls = WorkerCalls(world, '');
        const savedDoc  = saveCalls.length ? JSON.parse(saveCalls.slice(-1)[0].bodyText) : null;
        check('a key the deployed Worker refuses falls back to a whole-document save', foreign.ok === true && saveCalls.length === 1 && savedDoc && same(savedDoc.Navmode__FovOverrides, { Walk : 60 }), foreign);
        check('...merged over a fresh copy from the local server (GET /api/projects/2026/3047__Doous)', savedDoc && same(savedDoc.FogPlane__Config, { Marker : 'disk' }) && Requests(world, (one) => one.method === 'GET' && one.url === FLASK_ORIGIN + '/api/projects/2026/3047__Doous').length === 1);
        check('...which keeps the pipeline keys and bumps the build manifest once', savedDoc && savedDoc.projectCode === DOOUS_DOC.projectCode && world.bumps === 1);

        // FALLBACK: NO project.json ON R2 YET
        world.r2.delete(DOOUS_PREFIX + 'project.json');
        const blockD = NewBlock('Sheet D');
        const created = await cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : blockD });
        const createdDoc = GetR2Json(world, DOOUS_PREFIX + 'project.json');
        check('merge-keys answering 409 missing falls back to the whole-document save, which creates project.json', created.ok === true && createdDoc && same(createdDoc.LayoutEditor__DrawingsData, blockD) && createdDoc.projectName === DOOUS_DOC.projectName, created);

        // READS
        const read = await cf.Na__CfApi__ReadProjectData();
        check('ReadProjectData goes through the Worker\'s project route, fresh', read.ok && !read.missing && same(read.data, createdDoc) && WorkerCalls(world, '/project').length === 1);
        world.r2.delete(DOOUS_PREFIX + 'project.json');
        const missing = await cf.Na__CfApi__ReadProjectData();
        check('...and answers missing with {} when R2 has none', missing.ok === true && missing.missing === true && same(missing.data, {}), missing);
        PutR2Json(world, DOOUS_PREFIX + 'project.json', DOOUS_DOC);
        const wrote = await cf.Na__CfApi__WriteProjectData({ projectName : 'No code' });
        check('WriteProjectData passes the Worker\'s refusal back (no projectCode)', wrote.ok === false && /projectCode/.test(wrote.error), wrote);

        // SIBLING FILES
        const bumpsAtFiles = world.bumps;
        const notesDoc = { Notes : [ { Code : 'EX01', Text : 'Existing wall' } ] };
        const wroteNotes = await cf.Na__CfApi__WriteProjectFile(NOTES, notesDoc);
        const writeCall  = WorkerCalls(world, '/files/write').slice(-1)[0];
        check('WriteProjectFile: files/write with the file name as the path, no bump', wroteNotes.ok === true && writeCall && JSON.parse(writeCall.bodyText).path === NOTES && same(GetR2Json(world, DOOUS_PREFIX + NOTES), notesDoc) && world.bumps === bumpsAtFiles, wroteNotes);
        const readNotes = await cf.Na__CfApi__ReadProjectFile(NOTES);
        check('ReadProjectFile: files/read answers the document', readNotes.ok && !readNotes.missing && same(readNotes.data, notesDoc), readNotes);
        const noIndex = await cf.Na__CfApi__ReadProjectFile(STATEMENTS);
        check('...a file R2 does not have is missing, not a failure', noIndex.ok === true && noIndex.missing === true && noIndex.data === null, noIndex);
        const refusedFile = await cf.Na__CfApi__WriteProjectFile('project.json', {});
        check('...project.json is not a sibling file', refusedFile.ok === false);

        // ASSETS
        const thumbBytes = new Uint8Array([ 82, 73, 70, 70, 1, 2, 3, 4 ]);
        const thumb = await cf.Na__CfApi__WriteThumbnailWebp('Scene_001', new Blob([ thumbBytes ], { type : 'image/webp' }));
        const upload = WorkerCalls(world, '/files/upload').slice(-1)[0];
        check('WriteThumbnailWebp: files/upload of the bytes as image/webp, relUrl answered', thumb.ok && thumb.relUrl === 'PresentationMode/Thumbnails/Scene_001.webp' && upload && new URL(upload.url).searchParams.get('path') === 'PresentationMode/Thumbnails/Scene_001.webp'
            && upload.headers['content-type'] === 'image/webp' && Buffer.from(world.r2.get(DOOUS_PREFIX + 'PresentationMode/Thumbnails/Scene_001.webp').bytes).equals(Buffer.from(thumbBytes)), thumb);
        const badThumb = await cf.Na__CfApi__WriteThumbnailWebp('../Scene', new Blob([ thumbBytes ]));
        check('...a scene id that leaves the folder is refused', badThumb.ok === false);
        const linework = await cf.Na__CfApi__WriteProjectAsset('LayoutEditor/Linework/Elevation_001__ab12.json', { Lines : [ 1, 2 ] });
        check('WriteProjectAsset (JSON): files/write, relUrl and the CDN publicUrl', linework.ok && linework.relUrl === 'LayoutEditor/Linework/Elevation_001__ab12.json' && linework.publicUrl === CDN_PROJECTS + '/2026/3047__Doous/LayoutEditor/Linework/Elevation_001__ab12.json'
            && same(GetR2Json(world, DOOUS_PREFIX + 'LayoutEditor/Linework/Elevation_001__ab12.json'), { Lines : [ 1, 2 ] }), linework);
        const snapshot = await cf.Na__CfApi__WriteProjectAsset('LayoutEditor/Snapshots/abc123.png', new Blob([ new Uint8Array([ 137, 80, 78, 71 ]) ], { type : 'image/png' }));
        check('WriteProjectAsset (Blob): files/upload', snapshot.ok && WorkerCalls(world, '/files/upload').some((one) => new URL(one.url).searchParams.get('path') === 'LayoutEditor/Snapshots/abc123.png'), snapshot);
        const badAsset = await cf.Na__CfApi__WriteProjectAsset('LayoutEditor/Other/x.json', {});
        check('...a path outside the three asset folders is refused', badAsset.ok === false && /Refused asset path/.test(badAsset.error));
        check('assets through the files routes never bump the build manifest', world.bumps === bumpsAtFiles);

        // STATEMENTS
        const md = await cf.Na__CfApi__WriteStatementFile('01__PreApp__Statement/Doous Statement.md', '# Doous\n');
        check('WriteStatementFile (text): files/write under 10__StatementDocs/, CDN link answered', md.ok && md.key === DOOUS_PREFIX + '10__StatementDocs/01__PreApp__Statement/Doous Statement.md' && md.publicUrl === CDN_PROJECTS + '/2026/3047__Doous/10__StatementDocs/01__PreApp__Statement/Doous%20Statement.md' && md.path === '01__PreApp__Statement/Doous Statement.md', md);
        const back = await cf.Na__CfApi__ReadStatementFile('01__PreApp__Statement/Doous Statement.md');
        check('ReadStatementFile: the text comes back', back.ok && back.text === '# Doous\n' && back.missing === false, back);
        const figure = await cf.Na__CfApi__WriteStatementFile('01__PreApp__Statement/Images/Site.png', new Blob([ new Uint8Array([ 1, 2 ]) ], { type : 'image/png' }));
        check('WriteStatementFile (Blob): files/upload', figure.ok && WorkerCalls(world, '/files/upload').some((one) => new URL(one.url).searchParams.get('path') === '10__StatementDocs/01__PreApp__Statement/Images/Site.png'), figure);
        const absent = await cf.Na__CfApi__ReadStatementFile('01__PreApp__Statement/None.md');
        check('...a statement R2 does not have is missing', absent.ok === true && absent.missing === true && absent.text === null, absent);

        // SHEET IMAGES
        const pic = new Blob([ new Uint8Array([ 9, 9, 9 ]) ], { type : 'image/webp' });
        const up1 = await cf.Na__CfApi__UploadSheetImage('D01', 'Kitchen__0123456789.webp', pic);
        await cf.Na__CfApi__UploadSheetImage('D01', 'Garden__abcdef0123.webp', pic);
        await cf.Na__CfApi__UploadSheetImage('D02', 'Front__1111111111.png', new Blob([ new Uint8Array([ 1 ]) ], { type : 'image/png' }));
        PutR2(world, DOOUS_PREFIX + '05__Layout__DrawingDocs__Images/D01/Deeper/x__2222222222.webp', [ 1 ], 'image/webp');
        check('UploadSheetImage: files/upload into the document folder, the R2 key answered', up1.ok && up1.key === DOOUS_PREFIX + '05__Layout__DrawingDocs__Images/D01/Kitchen__0123456789.webp', up1);
        const listCallsBefore = WorkerCalls(world, '/files/list').length;
        const listed = await cf.Na__CfApi__ListSheetImages();
        const names  = listed.objects.map((one) => one.folder + '/' + one.file).sort();
        check('ListSheetImages: every page followed, only names one folder deep, keys under the project', listed.ok && same(names, [ 'D01/Garden__abcdef0123.webp', 'D01/Kitchen__0123456789.webp', 'D02/Front__1111111111.png' ])
            && listed.objects.every((one) => one.key === DOOUS_PREFIX + '05__Layout__DrawingDocs__Images/' + one.folder + '/' + one.file) && WorkerCalls(world, '/files/list').length - listCallsBefore === 2, listed);
        const copied = await cf.Na__CfApi__CopySheetImage('D01', 'D03', 'Kitchen__0123456789.webp');
        const copyBody = JSON.parse(WorkerCalls(world, '/files/copy').slice(-1)[0].bodyText);
        check('CopySheetImage: files/copy inside the family, the new key answered', copied.ok && copied.key === DOOUS_PREFIX + '05__Layout__DrawingDocs__Images/D03/Kitchen__0123456789.webp'
            && same(copyBody, { from : '05__Layout__DrawingDocs__Images/D01/Kitchen__0123456789.webp', to : '05__Layout__DrawingDocs__Images/D03/Kitchen__0123456789.webp' }), { copied, copyBody });
        const notThere = await cf.Na__CfApi__CopySheetImage('D09', 'D03', 'None__0000000000.webp');
        check('...a picture not on R2 is missing', notThere.ok === false && notThere.missing === true, notThere);
        const gone = await cf.Na__CfApi__DeleteSheetImage('D03', 'Kitchen__0123456789.webp');
        check('DeleteSheetImage: files/delete of that one path', gone.ok && same(JSON.parse(WorkerCalls(world, '/files/delete').slice(-1)[0].bodyText), { path : '05__Layout__DrawingDocs__Images/D03/Kitchen__0123456789.webp' }) && !world.r2.has(DOOUS_PREFIX + '05__Layout__DrawingDocs__Images/D03/Kitchen__0123456789.webp'), gone);
        const sentBefore = world.log.length;
        const archive = await cf.Na__CfApi__UploadSheetImage('00__Archive', 'x__0123456789.webp', pic);
        const emptyPic = await cf.Na__CfApi__UploadSheetImage('D01', 'x__0123456789.webp', new Blob([]));
        check('the archive folder and an empty picture are refused before anything is sent', archive.ok === false && emptyPic.ok === false && world.log.length === sentBefore);

        // PUBLISHED
        const svg = await cf.Na__CfApi__UploadPublished('D01/Sheet__0123456789.svg', new Blob([ '<svg/>' ], { type : 'text/plain' }));
        const svgCall = WorkerCalls(world, '/files/upload').slice(-1)[0];
        check('UploadPublished: files/upload under 06__Layout__PublishedDocuments/ with the type its name calls for', svg.ok && svg.key === DOOUS_PREFIX + '06__Layout__PublishedDocuments/D01/Sheet__0123456789.svg' && svgCall.headers['content-type'] === 'image/svg+xml', svg);
        await cf.Na__CfApi__UploadPublished('index.json', new Blob([ '{}' ]));
        const docList  = await cf.Na__CfApi__ListPublished('D01');
        const rootList = await cf.Na__CfApi__ListPublished(null);
        check('ListPublished: paths relative to the published root, for one document or all', docList.ok && same(docList.objects.map((one) => one.path), [ 'D01/Sheet__0123456789.svg' ])
            && rootList.ok && same(rootList.objects.map((one) => one.path).sort(), [ 'D01/Sheet__0123456789.svg', 'index.json' ]) && docList.objects[0].key === DOOUS_PREFIX + '06__Layout__PublishedDocuments/D01/Sheet__0123456789.svg', { docList, rootList });
        const unpublished = await cf.Na__CfApi__DeletePublished('D01/Sheet__0123456789.svg');
        check('DeletePublished: files/delete of that one path', unpublished.ok && same(JSON.parse(WorkerCalls(world, '/files/delete').slice(-1)[0].bodyText), { path : '06__Layout__PublishedDocuments/D01/Sheet__0123456789.svg' }));
        const archived = await cf.Na__CfApi__UploadPublished('00__Archive__Revisions/x.json', new Blob([ '{}' ]));
        check('...the archive is refused', archived.ok === false);

        check('every Worker call named 2026/3047__Doous and carried the editor key', world.log.filter((one) => one.worker).every((one) => one.worker.folderId === DOOUS && one.headers['x-editor-api-key'] === API_KEY));
        check('every R2 key written sits under VaApps/Projects/2026/3047__Doous/', [ ...world.r2.keys() ].every((key) => key.startsWith(DOOUS_PREFIX)), [ ...world.r2.keys() ]);
        check('no new-route call ever carried a top-level projectCode', world.log.filter((one) => one.worker && NEW_SUFFIXES.indexOf(one.worker.suffix) !== -1 && one.bodyText).every((one) => !('projectCode' in JSON.parse(one.bodyText))));
        check('no unexpected request', world.unexpected.length === 0, world.unexpected);
    });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Saves and Reads on Worker 1.5.0 (no route list) and Without a Worker
// -----------------------------------------------------------------------------

    await RunSection(async () => {
        section('AN OLDER WORKER | 1.5.0 lists no routes: only save, assets and drawing-notes are called');
        const world = DoousWorld({ worker : '1.5.0' });
        const { cf } = await OpenCase('flask', '?project=' + DOOUS, world);
        const init = await cf.Na__CfApi__Initialize();
        check('Initialize: configured, with the three routes every Worker has', init.configured === true && same(init.routes, [ 'save', 'assets', 'drawing-notes' ]) && init.version === null, init);
        const loaded = clone(DOOUS_DOC);
        loaded.FogPlane__Config = { Marker : 'loaded' };
        cf.Na__CfApi__SetLoadedProjectData(loaded);
        world.disk.get(DOOUS).FogPlane__Config = { Marker : 'disk' };

        const blockE = NewBlock('Sheet E');
        const saved = await cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : blockE });
        const saveCall = WorkerCalls(world, '').slice(-1)[0];
        const doc = saveCall ? JSON.parse(saveCall.bodyText) : null;
        check('MergeAndSaveKeys falls back to the whole-document save', saved.ok === true && WorkerCalls(world, '').length === 1 && doc && same(doc.LayoutEditor__DrawingsData, blockE), saved);
        check('...on a FRESH copy from the local server, not the copy the window loaded', doc && same(doc.FogPlane__Config, { Marker : 'disk' }) && Requests(world, (one) => one.method === 'GET' && one.url === FLASK_ORIGIN + '/api/projects/2026/3047__Doous' && one.cache === 'no-store').length === 1, doc && doc.FogPlane__Config);
        check('...the local copy read before the Worker was written', (() => { const get = Requests(world, (one) => one.url === FLASK_ORIGIN + '/api/projects/2026/3047__Doous')[0]; return get && saveCall && get.n < saveCall.n; })());
        check('...and the loaded copy becomes what was written', same(cf.Na__CfApi__GetLoadedProjectData(), doc));
        const removed = await cf.Na__CfApi__DeleteProjectKeys([ 'valeVision_Camera__DefaultPosition' ]);
        check('DeleteProjectKeys falls back the same way', removed.ok === true && !('valeVision_Camera__DefaultPosition' in JSON.parse(WorkerCalls(world, '').slice(-1)[0].bodyText)));

        const read = await cf.Na__CfApi__ReadProjectData();
        const cdnCall = Requests(world, (one) => one.cdn && one.cdn.key === DOOUS_PREFIX + 'project.json').slice(-1)[0];
        check('ReadProjectData reads the CDN copy, fresh (?t= and no-store)', read.ok && cdnCall && /\?t=\d+$/.test(cdnCall.url) && cdnCall.cache === 'no-store', read);
        PutR2Json(world, DOOUS_PREFIX + NOTES, { Notes : [] });
        const notes = await cf.Na__CfApi__ReadProjectFile(NOTES);
        check('ReadProjectFile (notes) goes through drawing-notes', notes.ok && same(notes.data, { Notes : [] }) && WorkerCalls(world, '/drawing-notes').length === 1, notes);
        const index = await cf.Na__CfApi__ReadProjectFile(STATEMENTS);
        check('ReadProjectFile (statement index) reads the CDN', index.ok && index.missing === true && Requests(world, (one) => one.cdn && one.cdn.key === DOOUS_PREFIX + STATEMENTS).length === 1, index);
        const bumpsBefore = world.bumps;
        const wroteNotes = await cf.Na__CfApi__WriteProjectFile(NOTES, { Notes : [ 1 ] });
        check('WriteProjectFile (notes) goes through drawing-notes (which bumps, as it always has)', wroteNotes.ok && same(GetR2Json(world, DOOUS_PREFIX + NOTES), { Notes : [ 1 ] }) && world.bumps === bumpsBefore + 1);
        const sentBefore = world.log.length;
        const wroteIndex = await cf.Na__CfApi__WriteProjectFile(STATEMENTS, { Docs : [] });
        check('...the statement index cannot be written: refused, naming Worker 1.6.0, nothing sent', wroteIndex.ok === false && /1\.6\.0/.test(wroteIndex.error) && world.log.length === sentBefore, wroteIndex);

        const thumbBytes = new Uint8Array([ 1, 2, 3, 250 ]);
        const thumb = await cf.Na__CfApi__WriteThumbnailWebp('Scene_002', new Blob([ thumbBytes ], { type : 'image/webp' }));
        const asset = WorkerCalls(world, '/assets').slice(-1)[0];
        const assetBody = asset ? JSON.parse(asset.bodyText) : {};
        check('WriteThumbnailWebp goes through /assets as base64, its bytes intact', thumb.ok && thumb.relUrl === 'PresentationMode/Thumbnails/Scene_002.webp' && assetBody.path === 'PresentationMode/Thumbnails/Scene_002.webp' && assetBody.encoding === 'base64'
            && assetBody.contentType === 'image/webp' && Buffer.from(assetBody.data, 'base64').equals(Buffer.from(thumbBytes)), assetBody);
        const json = await cf.Na__CfApi__WriteProjectAsset('LayoutEditor/Linework/E__1.json', { A : 'é' });
        check('WriteProjectAsset (JSON) goes through /assets as UTF-8 base64', json.ok && same(GetR2Json(world, DOOUS_PREFIX + 'LayoutEditor/Linework/E__1.json'), { A : 'é' }), json);

        const sent = world.log.length;
        const refusals = [
            await cf.Na__CfApi__UploadSheetImage('D01', 'K__0123456789.webp', new Blob([ new Uint8Array([ 1 ]) ])),
            await cf.Na__CfApi__ListSheetImages(),
            await cf.Na__CfApi__UploadPublished('index.json', new Blob([ '{}' ])),
            await cf.Na__CfApi__WriteStatementFile('01__X/a.md', 'text')
        ];
        check('sheet pictures, published files and statements are refused, naming Worker 1.6.0, with nothing sent', refusals.every((one) => one.ok === false && /1\.6\.0/.test(one.error)) && world.log.length === sent, refusals);
        check('no route the Worker did not list was ever called', world.violations.length === 0, world.violations);
        check('no unexpected request', world.unexpected.length === 0, world.unexpected);
    });

    await RunSection(async () => {
        section('NO WORKER | the Worker unreachable, or no editor config');
        const down = DoousWorld({ worker : 'down' });
        const { cf } = await OpenCase('flask', '?project=' + DOOUS, down);
        const init = await cf.Na__CfApi__Initialize();
        check('an unreachable Worker: still configured, with only the three routes every Worker has', init.configured === true && same(init.routes, [ 'save', 'assets', 'drawing-notes' ]), init);
        cf.Na__CfApi__SetLoadedProjectData(clone(DOOUS_DOC));
        const failed = await cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : NewBlock('X') });
        check('...a save resolves "Worker unreachable" and never throws', failed.ok === false && /unreachable/i.test(failed.error), failed);

        const noConfig = DoousWorld({ editorConfig : false });
        const second = await OpenCase('flask', '?project=' + DOOUS, noConfig);
        const init2 = await second.cf.Na__CfApi__Initialize();
        check('no editor config from the local server: not configured, the Worker never asked', init2.configured === false && second.cf.Na__CfApi__IsConfigured() === false && Requests(noConfig, (one) => one.url.startsWith(WORKER_BASE)).length === 0, init2);
        const refused = await second.cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : NewBlock('X') });
        check('...a save answers "Worker not configured" and names the env file', refused.ok === false && /Worker not configured/.test(refused.error) && /Token__CloudflareAPI\.env/.test(refused.error), refused);
    });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Live Site: GitHub Pages, No Flask, No Key
// -----------------------------------------------------------------------------

    await RunSection(async () => {
        section('THE LIVE SITE | adam-noble-01.github.io/ValeCodebase/WebApps/ValeVision3D, ?project=2026/3047__Doous');
        const world = DoousWorld();
        PutR2Json(world, DOOUS_PREFIX + NOTES, { Notes : [ 'live' ] });
        PutR2(world, DOOUS_PREFIX + '10__StatementDocs/01__PreApp__Statement/Doous.md', Buffer.from('# Live'), 'text/markdown');
        const { cf, mirror } = await OpenCase('pages', '?project=' + DOOUS, world);
        const init = await cf.Na__CfApi__Initialize();
        check('Initialize: not configured, though the project folder is known', init.configured === false && init.folderId === DOOUS && cf.Na__CfApi__IsConfigured() === false, init);
        check('...the editor config and the Worker are never asked', Requests(world, (one) => one.url.indexOf('/api/editor-config') !== -1 || one.url.startsWith(WORKER_BASE)).length === 0);

        const notes = cf.Na__CfApi__ProjectFileLocation(NOTES);
        check('repository URLs on the GitHub Pages sub-path', notes.repoUrl === PAGES_ORIGIN + '/ValeCodebase/WebApps/Whitecardopedia/Projects/2026/3047__Doous/' + NOTES, notes.repoUrl);
        const picture = cf.Na__CfApi__SheetImageLocation('D01', 'Kitchen__0123456789.webp');
        check('...and a sheet picture\'s Pages fallback (PagesBaseUrl + "/" + relative) is its repository URL', PAGES_WEBAPPS + '/' + picture.relative === picture.repoUrl && picture.repoUrl === PAGES_ORIGIN + '/ValeCodebase/WebApps/Whitecardopedia/Projects/2026/3047__Doous/05__Layout__DrawingDocs__Images/D01/Kitchen__0123456789.webp', picture);

        const read = await cf.Na__CfApi__ReadProjectData();
        check('ReadProjectData works through the CDN', read.ok && read.data.projectName === DOOUS_DOC.projectName, read.ok);
        const readNotes = await cf.Na__CfApi__ReadProjectFile(NOTES);
        check('ReadProjectFile works through the CDN', readNotes.ok && same(readNotes.data, { Notes : [ 'live' ] }), readNotes);
        const statement = await cf.Na__CfApi__ReadStatementFile('01__PreApp__Statement/Doous.md');
        check('ReadStatementFile works through the CDN', statement.ok && statement.text === '# Live', statement);
        check('...no request reached a local server (no Flask on the live site)', Requests(world, (one) => one.url.indexOf('/api/') !== -1).length === 0, world.log.map((one) => one.url));

        const writes = [
            await cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : NewBlock('Live') }),
            await cf.Na__CfApi__DeleteProjectKeys([ 'Camera__DefaultPosition' ]),
            await cf.Na__CfApi__WriteProjectFile(NOTES, { Notes : [] }),
            await cf.Na__CfApi__WriteThumbnailWebp('Scene_001', new Blob([ new Uint8Array([ 1 ]) ])),
            await cf.Na__CfApi__UploadSheetImage('D01', 'K__0123456789.webp', new Blob([ new Uint8Array([ 1 ]) ])),
            await cf.Na__CfApi__UploadPublished('index.json', new Blob([ '{}' ])),
            await cf.Na__CfApi__WriteStatementFile('01__X/a.md', 'x')
        ];
        check('every write answers "Worker not configured"', writes.every((one) => one.ok === false && /Worker not configured/.test(one.error)), writes);
        const local = [
            await mirror.Na__LocalMirror__MergeKeys({ LayoutEditor__DrawingsData : {} }, { drawingsBase : null }),
            await mirror.Na__LocalMirror__WriteSiblingFile(NOTES, { Notes : [] }),
            await mirror.Na__LocalMirror__StatementTree(),
            await mirror.Na__LocalMirror__WriteStatementFile('01__X/a.md', 'x')
        ];
        const fingerprint = await mirror.Na__LocalMirror__DrawingsFingerprint();
        check('the local mirror reports skipped for everything', local.every((one) => one.skipped === true && one.ok === false) && fingerprint.skipped === true && fingerprint.ok === false, local);
        check('...and still nothing reached a local server or the Worker', Requests(world, (one) => one.url.indexOf('/api/') !== -1 || one.url.startsWith(WORKER_BASE)).length === 0);
        check('no unexpected request', world.unexpected.length === 0, world.unexpected);
    });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Project Identity: the Master Index Only
// -----------------------------------------------------------------------------

    await RunSection(async () => {
        section('PROJECT IDENTITY | the folder comes from the URL token through the master index, never from project.json');
        const bare = DoousWorld();
        const first = await OpenCase('flask', '?project=3047', bare);
        await first.cf.Na__CfApi__Initialize();
        check('?project=3047 (a bare code) resolves to 2026/3047__Doous', (first.cf.Na__CfApi__GetProjectContext().folderId === DOOUS) && first.cf.Na__CfApi__ProjectFileLocation(NOTES).key === DOOUS_PREFIX + NOTES);

        const unknown = DoousWorld();
        const second = await OpenCase('flask', '?project=2026/9999__NotInTheIndex', unknown);
        const init = await second.cf.Na__CfApi__Initialize();
        check('a token the index does not know: no folder, not configured (the Worker config is there)', init.folderId === null && init.configured === false && second.cf.Na__CfApi__IsConfigured() === false, init);
        const sentBefore = unknown.log.length;
        const refused = await second.cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : NewBlock('X') });
        const mirrored = await second.mirror.Na__LocalMirror__MergeKeys({ LayoutEditor__DrawingsData : NewBlock('X') });
        check('...every write is refused, naming the master index, and nothing is sent', refused.ok === false && /master index/.test(refused.error) && mirrored.ok === false && /master index/.test(mirrored.error) && unknown.log.length === sentBefore, { refused, mirrored });
        check('...no location is answered (never a guessed "2026/<code>")', second.cf.Na__CfApi__ProjectFileLocation(NOTES) === null && second.cf.Na__CfApi__SheetImageLocation('D01', 'a.webp') === null && second.cf.Na__CfApi__PublishedLocation('index.json') === null && second.cf.Na__CfApi__StatementFileLocation('a/b.md') === null);

        const stale = DoousWorld();
        const third = await OpenCase('flask', '?project=' + DOOUS, stale);
        await third.cf.Na__CfApi__Initialize();
        const staleDoc = clone(DOOUS_DOC);
        staleDoc.folderId = '2025/WK-3007__Weeks';                           // <-- A stale folderId in project.json, as 54 of 155 projects carry
        third.cf.Na__CfApi__SetLoadedProjectData(staleDoc);
        stale.disk.set(DOOUS, clone(staleDoc));
        await third.cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : NewBlock('Stale id') });
        await third.mirror.Na__LocalMirror__MergeKeys({ LayoutEditor__DrawingsData : NewBlock('Stale id') });
        check('a project.json carrying a stale folderId still writes to the index folder (Worker and local server)',
            stale.log.filter((one) => one.worker).every((one) => one.worker.folderId === DOOUS) && stale.log.filter((one) => one.local && one.local.folderId).every((one) => one.local.folderId === DOOUS)
            && [ ...stale.r2.keys() ].every((key) => key.startsWith(DOOUS_PREFIX)) && same(GetR2Json(stale, DOOUS_PREFIX + 'project.json').LayoutEditor__DrawingsData, NewBlock('Stale id')));

        const spaced = NewWorld();
        const fenner = '2025/FN-62104__Fenner Scheme-01';
        PutR2Json(spaced, 'VaApps/Projects/' + fenner + '/project.json', { projectCode : '62104', projectName : 'Fenner' });
        spaced.disk.set(fenner, { projectCode : '62104', projectName : 'Fenner' });
        const fourth = await OpenCase('flask', '?project=' + encodeURIComponent(fenner), spaced);
        const fennerInit = await fourth.cf.Na__CfApi__Initialize();
        check('a folder with a space resolves through the index', fennerInit.folderId === fenner && fennerInit.configured === true, fennerInit);
        const location = fourth.cf.Na__CfApi__ProjectFileLocation(NOTES);
        check('...its R2 key keeps the space; its CDN and repository URLs encode it per segment', location.key === 'VaApps/Projects/' + fenner + '/' + NOTES && location.cdnUrl === CDN_PROJECTS + '/2025/FN-62104__Fenner%20Scheme-01/' + NOTES
            && location.repoUrl === FLASK_ORIGIN + '/Whitecardopedia/Projects/2025/FN-62104__Fenner%20Scheme-01/' + NOTES, location);
        await fourth.cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : NewBlock('F') });
        await fourth.mirror.Na__LocalMirror__MergeKeys({ LayoutEditor__DrawingsData : NewBlock('F') });
        const workerCall = spaced.log.find((one) => one.worker);
        const localPost  = spaced.log.find((one) => one.local && one.method === 'POST');
        check('...the Worker and the local server are called with the folder encoded per segment', workerCall && workerCall.worker.rawFolder === '2025/FN-62104__Fenner%20Scheme-01' && localPost && localPost.local.rawPath === '/api/projects/2025/FN-62104__Fenner%20Scheme-01', [ workerCall && workerCall.url, localPost && localPost.url ]);
    });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Local Mirror (in-memory local server)
// -----------------------------------------------------------------------------

    await RunSection(async () => {
        section('THE LOCAL MIRROR | localhost:8000, the local server in memory');
        const world = DoousWorld();
        const { cf, mirror } = await OpenCase('flask', '?project=' + DOOUS, world);
        await cf.Na__CfApi__Initialize();
        const disk = world.disk.get(DOOUS);
        disk.LayoutEditor__DrawingsData = NewBlock('On disk');
        disk.FogPlane__Config = { Marker : 'disk' };

        const fingerprint = await mirror.Na__LocalMirror__DrawingsFingerprint();
        check('DrawingsFingerprint: the digest and stamp the local server reports, read fresh', fingerprint.ok && fingerprint.drawings.digest === Digest(disk) && Requests(world, (one) => one.url === FLASK_ORIGIN + '/api/projects/2026/3047__Doous/drawings-fingerprint' && one.cache === 'no-store').length === 1, fingerprint);

        const blockF = NewBlock('Sheet F');
        const merged = await mirror.Na__LocalMirror__MergeKeys({ LayoutEditor__DrawingsData : blockF }, { drawingsBase : fingerprint.drawings.digest });
        const post = Requests(world, (one) => one.method === 'POST' && one.url === FLASK_ORIGIN + '/api/projects/2026/3047__Doous').slice(-1)[0];
        const postBody = post ? JSON.parse(post.bodyText) : null;
        check('MergeKeys: a fresh GET, then the merged document POSTed to /api/projects/2026/3047__Doous', merged.ok === true && postBody && same(postBody.LayoutEditor__DrawingsData, blockF) && same(postBody.FogPlane__Config, { Marker : 'disk' }) && postBody.projectCode === DOOUS_DOC.projectCode, merged);
        check('...with the base in X-ValeVision-Drawings-Base, answering the new fingerprint and the backup', post && post.headers['x-valevision-drawings-base'] === fingerprint.drawings.digest && merged.drawings && merged.drawings.digest === Digest(postBody) && typeof merged.backup === 'string');
        const conflict = await mirror.Na__LocalMirror__MergeKeys({ LayoutEditor__DrawingsData : NewBlock('Late') }, { drawingsBase : fingerprint.drawings.digest });
        check('a base the disk has moved on from is refused: conflict, the fingerprint on disk, nothing written', conflict.ok === false && conflict.conflict === true && conflict.drawings && conflict.drawings.digest === Digest(world.disk.get(DOOUS)) && same(world.disk.get(DOOUS).LayoutEditor__DrawingsData, blockF), conflict);
        await mirror.Na__LocalMirror__MergeKeys({ CrossSection__SceneData : {} }, { drawingsBase : null });
        check('drawingsBase null is sent as "none"', Requests(world, (one) => one.method === 'POST' && one.url === FLASK_ORIGIN + '/api/projects/2026/3047__Doous').slice(-1)[0].headers['x-valevision-drawings-base'] === 'none');
        const unjudged = await mirror.Na__LocalMirror__MergeKeys({ Camera__DefaultPosition : { x : 1 } });
        check('no options: no header, not judged', unjudged.ok === true && Requests(world, (one) => one.method === 'POST' && one.url === FLASK_ORIGIN + '/api/projects/2026/3047__Doous').slice(-1)[0].headers['x-valevision-drawings-base'] === undefined);

        world.localPostDelayMs = 80;
        const both = await Promise.all([
            mirror.Na__LocalMirror__MergeKeys({ LayoutEditor__DrawingsData : NewBlock('Q1') }),
            mirror.Na__LocalMirror__MergeKeys({ LayoutEditor__DrawingsData : NewBlock('Q2') })
        ]);
        const events = world.events.filter((event) => event.startsWith('local-')).slice(-6).map((event) => event.split('#')[0]);
        check('MergeKeys is queued: the second read waits for the first write', both.every((one) => one.ok) && same(events, [ 'local-get', 'local-post-start', 'local-post-end', 'local-get', 'local-post-start', 'local-post-end' ]) && same(world.disk.get(DOOUS).LayoutEditor__DrawingsData, NewBlock('Q2')), events);

        const sibling = await mirror.Na__LocalMirror__WriteSiblingFile(NOTES, { Notes : [ 'EX01' ] });
        check('WriteSiblingFile: POST /api/projects/2026/3047__Doous/files/ValeVision__DrawingNotes__.json', sibling.ok && same(world.siblings.get(DOOUS + '::' + NOTES), { Notes : [ 'EX01' ] }) && Requests(world, (one) => one.url === FLASK_ORIGIN + '/api/projects/2026/3047__Doous/files/' + NOTES).length === 1 && typeof sibling.backup === 'string', sibling);
        const sentBefore = world.log.length;
        const refusedName = await mirror.Na__LocalMirror__WriteSiblingFile('project.json', {});
        const refusedArray = await mirror.Na__LocalMirror__WriteSiblingFile(NOTES, []);
        check('...any other name, and anything but an object, refused before anything is sent', refusedName.ok === false && refusedArray.ok === false && world.log.length === sentBefore);

        world.fingerprintRoute = false;
        const old = await mirror.Na__LocalMirror__DrawingsFingerprint();
        check('a server without the fingerprint route (its JSON 404 "Project not found") reads as unsupported', old.ok === false && old.unsupported === true, old);
        world.fingerprintRoute = true;
        world.disk.delete(DOOUS);
        const noProject = await mirror.Na__LocalMirror__DrawingsFingerprint();
        check('...as does a 404 for a missing project file (saves stay unjudged)', noProject.unsupported === true, noProject);
        world.disk.set(DOOUS, clone(DOOUS_DOC));

        world.localPostStatus = 405;
        const restart = await mirror.Na__LocalMirror__MergeKeys({ Camera__DefaultPosition : {} });
        check('a 405 from the Whitecardopedia server (its /api/health says so) asks for a restart', restart.ok === false && /restart it/.test(restart.error) && /Whitecardopedia/.test(restart.error), restart);
        world.localPostStatus = 501;
        world.localHealth = false;
        const staticServer = await mirror.Na__LocalMirror__MergeKeys({ Camera__DefaultPosition : {} });
        check('a static server (501, no /api/health) is "no local save server"', staticServer.ok === false && /no local save server/.test(staticServer.error), staticServer);
        world.localPostStatus = 0;
        world.localHealth = true;

        const tree = await mirror.Na__LocalMirror__StatementTree();
        const treeCall = Requests(world, (one) => one.local && one.local.statement === 'tree').slice(-1)[0];
        check('StatementTree: GET /api/valevision/statements/tree?project-folder=3047__Doous&year=2026', tree.ok && tree.exists === true && tree.entries.length === 1 && treeCall && treeCall.url === FLASK_ORIGIN + '/api/valevision/statements/tree?project-folder=3047__Doous&year=2026', { tree, url : treeCall && treeCall.url });
        world.statementRoutes = false;
        const noRoutes = await mirror.Na__LocalMirror__StatementTree();
        check('...a server without the statement routes says to restart it (never "no statements yet")', noRoutes.ok === false && noRoutes.needsRestart === true && /statement routes/.test(noRoutes.error), noRoutes);
        world.statementRoutes = true;
        const posts = [
            [ await mirror.Na__LocalMirror__WriteStatementFile('01__PreApp__Statement/a.md', '# A'), 'file', { path : '01__PreApp__Statement/a.md', text : '# A' } ],
            [ await mirror.Na__LocalMirror__MakeStatementFolder('02__Planning__Statement'), 'folder', { path : '02__Planning__Statement' } ],
            [ await mirror.Na__LocalMirror__MoveStatement('a.md', 'b.md'), 'move', { from : 'a.md', to : 'b.md' } ],
            [ await mirror.Na__LocalMirror__DeleteStatement('b.md'), 'delete', { path : 'b.md', confirm : 'b.md' } ]
        ];
        const statementPosts = Requests(world, (one) => one.method === 'POST' && one.local && one.local.statement);
        check('the statement writes POST /api/valevision/statements/<route>?project-folder=&year= with TrueVision\'s bodies',
            posts.every(([ result ]) => result.ok) && posts.every(([ , route, body ], index) => statementPosts[index] && statementPosts[index].local.statement === route && statementPosts[index].local.query === '?project-folder=3047__Doous&year=2026' && same(JSON.parse(statementPosts[index].bodyText), body)), statementPosts.map((one) => one.url));
        const notText = await mirror.Na__LocalMirror__WriteStatementFile('a.md', null);
        check('...a statement file that is not text is refused', notText.ok === false);
        check('no unexpected request', world.unexpected.length === 0, world.unexpected);
    });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Never Throws
// -----------------------------------------------------------------------------

    await RunSection(async () => {
        section('NEVER THROWS | every export, called with nonsense, on both hosts');
        const results = [];
        for (const host of [ 'flask', 'pages' ]) {
            const world = DoousWorld();
            const { cf, mirror } = await OpenCase(host, '?project=' + DOOUS, world);
            await cf.Na__CfApi__Initialize();
            for (const [ name, fn ] of Object.entries(cf).concat(Object.entries(mirror))) {
                if (typeof fn !== 'function' || name === 'Na__CfApi__SetLoadedProjectData') continue;
                for (const args of [ [], [ null, null, null ], [ {}, [], 5 ], [ '../..', '\u0000', undefined ] ]) {
                    try {
                        const answer = fn.apply(null, args);
                        if (answer && typeof answer.then === 'function') {
                            const settled = await answer.then((value) => ({ ok : true, value : value }), (error) => ({ ok : false, error : error }));
                            results.push([ host, name, settled.ok ]);
                        } else {
                            results.push([ host, name, true ]);
                        }
                    } catch (error) {
                        results.push([ host, name, false, String(error) ]);
                    }
                }
            }
        }
        const thrown = results.filter((one) => !one[2]);
        check('no export throws or rejects, whatever it is given (' + results.length + ' calls)', thrown.length === 0, thrown);
    });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Real Local Server: server.py Through Flask's Test Client
// -----------------------------------------------------------------------------

    await RunSection(async () => {
        section('THE REAL LOCAL SERVER | WebApps/Whitecardopedia/server.py, Flask test client, a temporary copy of 2026/3047__Doous');
        const realProject = join(DOOUS_DIR, 'project.json');
        const realNotes   = join(DOOUS_DIR, NOTES);
        const realBefore  = [ Sha1File(realProject), Sha1File(realNotes) ];
        const bridge = await StartBridge();
        if (!bridge.ok) {
            console.log('  SKIP  the real local server could not be driven: ' + bridge.error);
        } else {
            const tempProject = bridge.info.project;
            const tempNotes   = bridge.info.notes;
            const world = NewWorld({ worker : '1.5.0', bridge : bridge });
            PutR2Json(world, DOOUS_PREFIX + 'project.json', DOOUS_DOC);
            const { cf, mirror } = await OpenCase('flask', '?project=' + DOOUS, world);
            await cf.Na__CfApi__Initialize();

            const health = await fetch(FLASK_ORIGIN + '/api/health').then((response) => response.json());
            check('server.py answers /api/health as the Whitecardopedia local server', health.service === 'whitecardopedia-local-dev', health);

            const loaded = clone(DOOUS_DOC);
            loaded.projectNameAlias = 'Only In The Loaded Copy';
            cf.Na__CfApi__SetLoadedProjectData(loaded);
            const blockG = NewBlock('Real G');
            const cloud = await cf.Na__CfApi__MergeAndSaveKeys({ LayoutEditor__DrawingsData : blockG });
            const sent = WorkerCalls(world, '').slice(-1)[0];
            const sentDoc = sent ? JSON.parse(sent.bodyText) : null;
            check('Worker 1.5.0: the whole-document save is built on server.py\'s own copy of the project', cloud.ok === true && sentDoc && same(sentDoc.LayoutEditor__DrawingsData, blockG) && sentDoc.projectNameAlias === DOOUS_DOC.projectNameAlias && sentDoc.projectName === DOOUS_DOC.projectName, cloud);

            const print = await mirror.Na__LocalMirror__DrawingsFingerprint();
            check('DrawingsFingerprint: server.py fingerprints the drawings on disk', print.ok === true && /^sha1:[0-9a-f]{40}$/.test(print.drawings.digest || ''), print);

            const fileBefore = readFileSync(tempProject, 'utf8');
            const local = await mirror.Na__LocalMirror__MergeKeys({ LayoutEditor__DrawingsData : blockG }, { drawingsBase : print.drawings.digest });
            const onDisk = JSON.parse(readFileSync(tempProject, 'utf8'));
            check('a drawings save reaches server.py and the repository copy of project.json', local.ok === true && same(onDisk.LayoutEditor__DrawingsData, blockG), local);
            check('...every other key of the file kept', Object.keys(DOOUS_DOC).every((key) => key === 'LayoutEditor__DrawingsData' || same(onDisk[key], DOOUS_DOC[key])) && onDisk !== null && fileBefore !== readFileSync(tempProject, 'utf8'));
            check('...the answer carries the new fingerprint and the copy server.py kept, outside the repository', local.drawings && local.drawings.digest && local.drawings.digest !== print.drawings.digest && typeof local.backup === 'string' && existsSync(local.backup) && relative(bridge.info.backups, local.backup).indexOf('..') !== 0, local);

            const afterSave = readFileSync(tempProject);
            const stale = await mirror.Na__LocalMirror__MergeKeys({ LayoutEditor__DrawingsData : NewBlock('Too late') }, { drawingsBase : print.drawings.digest });
            check('the same base again is refused by server.py: conflict, the file untouched', stale.ok === false && stale.conflict === true && stale.drawings && stale.drawings.digest === local.drawings.digest && Buffer.compare(afterSave, readFileSync(tempProject)) === 0, stale);

            const notesDoc = { LayoutEditor__Specification__Notes : [ { Code : 'EX01', Title : 'Existing' } ] };
            const notes = await mirror.Na__LocalMirror__WriteSiblingFile(NOTES, notesDoc);
            const notesText = readFileSync(tempNotes, 'utf8');
            check('WriteSiblingFile: server.py writes the notes whole, 4-space JSON, LF and a final newline', notes.ok === true && notesText === JSON.stringify(notesDoc, null, 4) + '\n', notes);

            const repo = cf.Na__CfApi__ProjectFileLocation(NOTES).repoUrl;
            const repoAnswer = await fetch(repo, { cache : 'no-store' });
            check('the notes file\'s repository URL is served by server.py (/Whitecardopedia/Projects/...)', repoAnswer.status === 200 && repo === FLASK_ORIGIN + '/Whitecardopedia/Projects/2026/3047__Doous/' + NOTES, [ repo, repoAnswer.status ]);
            const missingAnswer = await fetch(cf.Na__CfApi__ProjectFileLocation(STATEMENTS).repoUrl, { cache : 'no-store' });
            check('...and a file that is not there is a real 404, not the app shell', missingAnswer.status === 404 && /json/.test(missingAnswer.headers.get('content-type') || ''), missingAnswer.status);

            const tree = await mirror.Na__LocalMirror__StatementTree();
            check('StatementTree against server.py resolves with a well-formed answer (ok, or why not)', tree && typeof tree.ok === 'boolean' && Array.isArray(tree.entries) && (tree.ok || typeof tree.error === 'string'), tree);
            check('no route the Worker did not list was called, and no unexpected request', world.violations.length === 0 && world.unexpected.length === 0, [ world.violations, world.unexpected ]);
            await bridge.close();
        }
        const realAfter = [ Sha1File(realProject), Sha1File(realNotes) ];
        check('the real 2026/3047__Doous project.json and notes are byte-for-byte unchanged', same(realBefore, realAfter), [ realBefore, realAfter ]);
    });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | The Seam in the Specification PDF, and Identity Markers
// -----------------------------------------------------------------------------

    // STRIP COMMENTS | (Na__Verify__Exports__'s rule: strings are kept whole)
    function StripComments(source) {
        let out = '', index = 0, quote = null;
        while (index < source.length) {
            const c = source[index], n = source[index + 1];
            if (quote) {
                out += c;
                if (c === '\\') { out += n ?? ''; index += 2; continue; }
                if (c === quote) quote = null;
                index += 1; continue;
            }
            if (c === '"' || c === "'" || c === '`') { quote = c; out += c; index += 1; continue; }
            if (c === '/' && n === '/') { while (index < source.length && source[index] !== '\n') index += 1; continue; }
            if (c === '/' && n === '*') { index += 2; while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1; index += 2; out += ' '; continue; }
            out += c; index += 1;
        }
        return out;
    }

    // WITHOUT PORT NOTES | the one block the naming rules exempt
    function WithoutPortNotes(text) {
        const lines = text.split(/\r?\n/), kept = [];
        let inside = false;
        for (const line of lines) {
            if (/^\s*(\/\/|#|\/\*|\*)\s*PORT NOTE:/.test(line)) { inside = true; continue; }
            if (inside && /^\s*(\/\/|#)\s*-{20,}\s*$/.test(line)) { inside = false; continue; }
            if (!inside) kept.push(line);
        }
        return kept.join('\n');
    }

    function Walk(dir, acc) {
        for (const entry of readdirSync(dir)) {
            if (entry === 'node_modules' || entry.startsWith('00__Archive')) continue;
            const full = join(dir, entry);
            const info = statSync(full);
            if (info.isDirectory()) Walk(full, acc);
            else if (/\.(js|mjs|css|json|html)$/i.test(entry)) acc.push(full);
        }
        return acc;
    }

    await RunSection(async () => {
        section('THE SPECIFICATION PDF AND IDENTITY');
        const specPdf = readFileSync(SPECPDF_FILE, 'utf8');
        const specCode = StripComments(specPdf);
        check('SpecPdf imports Na__CfApi__GetProjectDisplayName from the facade at TrueVision\'s path',
            /import\s*\{\s*Na__CfApi__GetProjectDisplayName\s*\}\s*from\s*'\.\.\/\.\.\/80__CloudflareIntegration\/Na__CloudflareIntegration__ApiClient__\.js'/.test(specCode)
            && existsSync(resolve(dirname(SPECPDF_FILE), '../../80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js')));
        check('...and its document facts take the project name from it', /const\s+name\s*=\s*Na__CfApi__GetProjectDisplayName\(\)\s*\|\|\s*''/.test(specCode));
        check('...and it reads no PWA global of an app', !/window\s*\.\s*TrueVision__/.test(specCode) && !/ProjectContext/.test(specCode));

        const files = Walk(SRC_ROOT, []).concat(Walk(join(APP_ROOT, '03__Style__AppStylesheets'), [])).concat([ join(APP_ROOT, 'index.html') ]);
        const reads = files.filter((file) => /window\s*\.\s*TrueVision__Pwa__ProjectContext/.test(StripComments(readFileSync(file, 'utf8'))));
        check('no ValeVision module reads the project context of TrueVision\'s PWA (' + files.length + ' files)', reads.length === 0, reads.map((file) => relative(APP_ROOT, file)));
        const marked = files.filter((file) => { const text = WithoutPortNotes(readFileSync(file, 'utf8')); return NA_MARKERS.slice(0, 3).some((marker) => text.indexOf(marker) !== -1); });
        check('no NA portal prefix, app-content folder or TrueVision API path in ValeVision\'s code (PORT NOTEs exempt)', marked.length === 0, marked.map((file) => relative(APP_ROOT, file)));

        for (const file of [ CFAPI_FILE, MIRROR_FILE ]) {
            const text = readFileSync(file, 'utf8');
            const found = NA_MARKERS.concat([ TV + '__', 'TRUE' + 'VISION3D', '[' + TV + '3D', 'window.' + TV ]).filter((marker) => text.indexOf(marker) !== -1);
            check(relative(SRC_ROOT, file).replace(/\\/g, '/') + ': no TrueVision transport, key, banner, prefix or global anywhere in it', found.length === 0, found);
            check('...banner VALEVISION3D and a PORT NOTE with TrueVision\'s source version', /^\/\/ VALEVISION3D - /m.test(text) && /PORT NOTE:/.test(text) && /Source version: 1\.[25]\.0 \(TrueVision3D v2\.\d+\.0, \d\d-[A-Z][a-z]{2}-2026;[^)]*read at HEAD b2aa9151\)/.test(text) && /Ported on\s*: \d\d-[A-Z][a-z]{2}-\d{4} for ValeVision3D (\{\{VVREL:W0-12\}\}|v2\.\d+\.\d+)/.test(text));
        }
    });

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Result
// -----------------------------------------------------------------------------

    console.warn  = consoleReal.warn;
    console.info  = consoleReal.info;
    console.error = consoleReal.error;
    try { rmSync(SCRATCH, { recursive : true, force : true }); } catch (error) { /* the OS cleans its temp folder */ }
    console.log('\n  ' + passes + ' passed, ' + failures + ' failed; the modules logged ' + consoleKept.length + ' line(s) along the way.');
    console.log(failures === 0 ? '  PASS - every check passed.' : '  FAIL - ' + failures + ' check(s) failed.');
    process.exit(failures === 0 ? 0 : 1);

// endregion -------------------------------------------------------------------
