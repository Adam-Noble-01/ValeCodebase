// W4-06 acceptance harness (scratch): the ported Statement Data and Data__Transport, loaded at the
// URL a browser loads them from (http://localhost:8000/ValeVision3D/...), driving the REAL
// WebApps/Whitecardopedia/server.py and its statements blueprint through Flask's test client in a
// child Python process (e2e_bridge.py), on a throwaway copy of 2026/3047__Doous in the OS temp folder.
// No server is started, no port is used, no network is reached: the Worker and the CDN are stubs
// that record every request (the Worker lists no routes, like the deployed 1.5.0, and refuses every
// write; the CDN has nothing). The real project folder is hashed before and after.
//
// Usage: node e2e_statement_flask.mjs     (exit 0 = every check passed)

import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync, statSync, utimesSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { register } from 'node:module';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const HERE      = dirname(fileURLToPath(import.meta.url));
const APP_ROOT  = 'D:/10_CoreLib__ValeCodebase/WebApps/ValeVision3D';
const WCP_ROOT  = resolve(APP_ROOT, '..', 'Whitecardopedia');
const SRC       = APP_ROOT + '/02__Src__AppModules';
const INDEX_FILE = join(WCP_ROOT, '02__Src__AppModules', '03__AppData', 'Na__MasterIndex__ProjectLocations__.json');
const REAL_DOOUS = join(WCP_ROOT, 'Projects', '2026', '3047__Doous');
const LE_CONFIG = join(SRC, '51__System__LayoutEditor', '03__Core__Config', 'Na__LayoutEditor__AppConfig__.json');
const SCRATCH   = mkdtempSync(join(tmpdir(), 'na-w406-e2e-'));

const FLASK_ORIGIN = 'http://localhost:8000';
const FLASK_BASE   = FLASK_ORIGIN + '/ValeVision3D/';
const WORKER_BASE  = 'http://worker.invalid/api/editor';
const FEATURE      = FLASK_BASE + '02__Src__AppModules/51__System__LayoutEditor/52__Feature__StatementWriter/';

let failures = 0, passes = 0;
function check(name, ok, detail) {
    if (ok) { passes++; console.log('PASS ' + name); }
    else { failures++; console.log('FAIL ' + name + (detail !== undefined ? '  :: ' + JSON.stringify(detail) : '')); }
}
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// ---------------------------------------------------------------- the real project, hashed
function hashTree(dir) {
    const out = {};
    if (!existsSync(dir)) return out;
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) Object.assign(out, Object.fromEntries(Object.entries(hashTree(full)).map(([k, v]) => [name + '/' + k, v])));
        else out[name] = createHash('sha1').update(readFileSync(full)).digest('hex') + ':' + st.mtimeMs;
    }
    return out;
}
const realBefore = hashTree(REAL_DOOUS);

// ---------------------------------------------------------------- module hooks (browser URLs)
const HOOKS = [
    "import { readFileSync } from 'node:fs';",
    "import { fileURLToPath } from 'node:url';",
    "let state = { appRootUrl : '', base : '' };",
    "export async function initialize(data) { state = data; }",
    "export async function resolve(specifier, context, nextResolve) {",
    "    const parent = context.parentURL || '';",
    "    let target = null;",
    "    if (specifier.startsWith('http://')) target = specifier;",
    "    else if (parent.startsWith(state.base) && (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/'))) target = new URL(specifier, parent).href;",
    "    if (target && target.startsWith(state.base)) return { url : target, shortCircuit : true };",
    "    return nextResolve(specifier, context);",
    "}",
    "export async function load(url, context, nextLoad) {",
    "    const plain = url.split('?')[0];",
    "    if (plain.startsWith(state.base)) return { format : 'module', source : readFileSync(fileURLToPath(state.appRootUrl + plain.slice(state.base.length)), 'utf8'), shortCircuit : true };",
    "    return nextLoad(url, context);",
    "}"
].join('\n');
writeFileSync(join(SCRATCH, 'hooks.mjs'), HOOKS);
register(pathToFileURL(join(SCRATCH, 'hooks.mjs')).href, { parentURL : import.meta.url, data : { appRootUrl : pathToFileURL(APP_ROOT + '/').href, base : FLASK_BASE } });

// ---------------------------------------------------------------- the page
const store = new Map();
const listeners = new Map();
const events = [];
globalThis.window = {
    location : { hostname : 'localhost', port : '8000', search : '?project=2026/3047__Doous', origin : FLASK_ORIGIN, href : FLASK_BASE + 'index.html?project=2026/3047__Doous', pathname : '/ValeVision3D/index.html' },
    localStorage : {
        getItem : (k) => (store.has(k) ? store.get(k) : null),
        setItem : (k, v) => { store.set(k, String(v)); },
        removeItem : (k) => { store.delete(k); }
    },
    setTimeout : (...a) => setTimeout(...a), clearTimeout : (t) => clearTimeout(t),
    setInterval : (...a) => setInterval(...a), clearInterval : (t) => clearInterval(t),
    addEventListener : (type, fn) => { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    removeEventListener : () => {},
    dispatchEvent : (event) => { events.push(event.detail && event.detail.reason); (listeners.get(event.type) || []).forEach((fn) => fn(event)); return true; }
};
globalThis.document = { visibilityState : 'visible', getElementById : () => null, querySelector : () => null, addEventListener : () => {} };

// ---------------------------------------------------------------- the bridge to server.py
const requests = [], violations = [];
function startBridge() {
    return new Promise((ready, fail) => {
        const child = spawn('python', [ '-B', join(HERE, 'e2e_bridge.py'), WCP_ROOT, join(SCRATCH, 'bridge') ], { stdio : [ 'pipe', 'pipe', 'pipe' ], windowsHide : true });
        const pending = new Map();
        let next = 0, buffer = '', stderr = '';
        child.stderr.on('data', (d) => { stderr += d.toString(); });
        child.on('exit', (code) => { if (!pending.size) return; fail(new Error('bridge exited ' + code + ' ' + stderr.slice(-800))); });
        child.stdout.on('data', (d) => {
            buffer += d.toString();
            let cut;
            while ((cut = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, cut).trim(); buffer = buffer.slice(cut + 1);
                if (!line.startsWith('@@BRIDGE@@ ')) continue;
                const msg = JSON.parse(line.slice(11));
                if (msg.ready) { ready({ info : msg, ask, close : () => { child.stdin.end(); return new Promise((done) => child.on('exit', done)); } }); continue; }
                const done = pending.get(msg.id); if (done) { pending.delete(msg.id); done(msg); }
            }
        });
        setTimeout(() => fail(new Error('bridge did not start: ' + stderr.slice(-800))), 120000).unref();
        function ask(method, path, headers, body) {
            return new Promise((done) => {
                const id = ++next; pending.set(id, done);
                child.stdin.write(JSON.stringify({ id, method, path, headers, body : body ? Buffer.from(body).toString('base64') : null }) + '\n');
            });
        }
    });
}
const bridge = await startBridge();
const TMP_PROJECT = bridge.info.project;
const TMP_STATEMENTS = join(TMP_PROJECT, '10__StatementDocs');

const INDEX_TEXT = readFileSync(INDEX_FILE, 'utf8');
const json = (status, body) => new Response(JSON.stringify(body), { status, headers : { 'Content-Type' : 'application/json' } });
globalThis.fetch = async function (input, init) {
    const url = String(input instanceof URL ? input.href : input);
    const opts = init || {};
    const method = String(opts.method || 'GET').toUpperCase();
    const headers = {};
    Object.entries(opts.headers || {}).forEach(([k, v]) => { headers[k] = String(v); });
    const body = (typeof opts.body === 'string') ? Buffer.from(opts.body, 'utf8') : null;
    requests.push(method + ' ' + url);
    const plain = url.split('?')[0];
    if (plain.endsWith('/Na__MasterIndex__ProjectLocations__.json')) return new Response(INDEX_TEXT, { status : 200, headers : { 'Content-Type' : 'application/json' } });
    if (plain === FLASK_ORIGIN + '/api/editor-config') return json(200, { workerApiBaseUrl : WORKER_BASE, apiKey : 'fake-key-w406' });
    if (plain === WORKER_BASE + '/health') return json(200, { ok : true, worker : 'whitecardopedia-editor-api' });   // <-- 1.5.0: lists no routes
    if (plain.startsWith(WORKER_BASE)) { if (method !== 'GET') violations.push('worker write ' + method + ' ' + url); return json(method === 'GET' ? 404 : 403, { error : 'blocked by the test' }); }
    if (url.startsWith('https://cdn.noble-architecture.com/')) { if (method !== 'GET') violations.push('cdn write ' + url); return new Response('<Error>NoSuchKey</Error>', { status : 404 }); }
    if (url.startsWith(FLASK_ORIGIN + '/')) {
        const u = new URL(url);
        const answer = await bridge.ask(method, u.pathname + u.search, headers, body);
        const h = {};
        Object.entries(answer.headers || {}).forEach(([k, v]) => { if (k.toLowerCase() !== 'content-length') h[k] = v; });
        return new Response(answer.status === 304 ? null : Buffer.from(answer.body || '', 'base64'), { status : answer.status, headers : h });
    }
    violations.push('unexpected ' + method + ' ' + url);
    throw new TypeError('fetch failed (blocked by the test)');
};

// ---------------------------------------------------------------- load the app's modules
const loader = await import(FLASK_BASE + '02__Src__AppModules/03__AppUtils/Na__AppUtils__ProjectLoader.js');
const cf     = await import(FLASK_BASE + '02__Src__AppModules/80__CloudflareIntegration/Na__CloudflareIntegration__ApiClient__.js');
const cfg    = await import(FLASK_BASE + '02__Src__AppModules/51__System__LayoutEditor/03__Core__Config/Na__LayoutEditor__ConfigState__.js');
const io     = await import(FEATURE + '01__Core__Data/Na__LayoutEditor__Statement__Data__Transport__.js');
const data   = await import(FEATURE + '01__Core__Data/Na__LayoutEditor__Statement__Data__.js');

await cf.Na__CfApi__Initialize();
const projectDoc = JSON.parse(readFileSync(join(TMP_PROJECT, 'project.json'), 'utf8'));
cf.Na__CfApi__SetLoadedProjectData(projectDoc);
if (typeof cfg.Na__LeCfg__SetAppConfig === 'function') cfg.Na__LeCfg__SetAppConfig(JSON.parse(readFileSync(LE_CONFIG, 'utf8')));
check('the app config is the real Layout Editor config (FilePattern carries _T{tranche}, phases empty)',
    cfg.Na__LeCfg__GetStatementSetup().filePattern.includes('_T{tranche}') && cfg.Na__LeCfg__GetDrawingRegisterSetup().phases.length === 0,
    cfg.Na__LeCfg__GetStatementSetup().filePattern);
check('the page resolves to 2026/3047__Doous (folder 3047__Doous)', loader.Na__AppUtils__GetProjectFolderFromUrl() === '3047__Doous' && loader.Na__AppUtils__GetYearFromUrl() === '2026');
check('the facade is configured on the (fake) Worker, as on Adam\'s localhost', cf.Na__CfApi__IsConfigured() === true);

// the bridge serves the throwaway copy through /Whitecardopedia/Projects/...
const marker = await fetch(FLASK_ORIGIN + '/Whitecardopedia/Projects/2026/3047__Doous/W4-06__ThrowawayMarker__.txt');
check('server.py\'s /Whitecardopedia/<path> route serves the throwaway copy', marker.status === 200 && (await marker.text()) === 'throwaway copy\n');

// ---------------------------------------------------------------- 1. load, name, create
const toasts = [];
data.Na__LeStmt__Initialize({ editable : true, showToast : (m, e) => toasts.push((e ? 'ERR ' : '') + m) });
await data.Na__LeStmt__EnsureLoaded();
let state = data.Na__LeStmt__GetState();
check('a project with no statements loads as new, with no server note', state.status === 'new' && !state.serverNote, state);

const naming = data.Na__LeStmt__NameFor('Design Statement');
check('NameFor: folder 01__DesignStatement', naming.folder === '01__DesignStatement', naming);
check('NameFor: file 3047_S01__Doous__DesignStatement__.md (document code, no phase, no "/")', naming.file === '3047_S01__Doous__DesignStatement__.md', naming);
check('NameFor: no T01-T04 and no slash anywhere', !/_T0[1-4]_/.test(naming.file) && !naming.file.includes('/') && !naming.folder.includes('/'), naming);

const record = await data.Na__LeStmt__Create('Design Statement');
check('Create returns the record', !!record && record.Doc__File === '3047_S01__Doous__DesignStatement__.md' && record.Doc__Folder === '01__DesignStatement', record);
const mdPath = join(TMP_STATEMENTS, '01__DesignStatement', '3047_S01__Doous__DesignStatement__.md');
check('the markdown file is on disk in 10__StatementDocs/01__DesignStatement/', existsSync(mdPath));
check('the pictures folder was made beside it', existsSync(join(TMP_STATEMENTS, '01__DesignStatement', '02_StatementDocs__Content__Images')));
const starter = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : '';
check('the starter is Vale\'s: the title, "Vale Garden Houses", no NA logo, no Noble Architecture', starter.startsWith('## Design Statement\n') && starter.includes('Vale Garden Houses') && !/noble/i.test(starter), starter.slice(0, 200));
const indexPath = join(TMP_PROJECT, 'ValeVision__StatementDocs__.json');
let index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : null;
check('the index ValeVision__StatementDocs__.json is written beside project.json', !!index && index.Statement__Documents.length === 1);
check('the index records the document code (3047), not the folder id', index && index.Statement__Project === '3047', index && index.Statement__Project);
check('the index description names ValeVision', index && /^ValeVision Statement Writer/.test(index.Statement__Description));

// ---------------------------------------------------------------- 2. rename (title only, then files)
check('Rename (title only) succeeds', await data.Na__LeStmt__Rename(record.Doc__Id, 'Design and Heritage Statement', false) === true);
index = JSON.parse(readFileSync(indexPath, 'utf8'));
check('the title-only rename keeps the folder and the file', index.Statement__Documents[0].Doc__Title === 'Design and Heritage Statement' && index.Statement__Documents[0].Doc__File === '3047_S01__Doous__DesignStatement__.md' && existsSync(mdPath));
check('Rename with moveFiles succeeds', await data.Na__LeStmt__Rename(record.Doc__Id, 'Heritage Statement', true) === true, toasts);
index = JSON.parse(readFileSync(indexPath, 'utf8'));
// TrueVision's Rename(moveFiles) names the file afresh from the index, which already holds this
// statement as S01, so the moved file takes the NEXT S-number (S02) while Doc__Number stays S01.
// That is TrueVision's behaviour at b2aa9151, ported as is; the Manager only ever renames the title.
const movedName = '3047_S02__Doous__HeritageStatement__.md';
const renamed = join(TMP_STATEMENTS, '01__DesignStatement', movedName);
check('the file is moved on disk to ' + movedName + ' (TrueVision\'s numbering) and the old name is gone', existsSync(renamed) && !existsSync(mdPath), readdirSync(join(TMP_STATEMENTS, '01__DesignStatement')));
check('the index follows the rename; the moved name has the document code, no phase and no "/"', index.Statement__Documents[0].Doc__File === movedName && index.Statement__Documents[0].Doc__Title === 'Heritage Statement' && !/_T0[1-4]_|\//.test(movedName), index.Statement__Documents[0]);
check('TrueVision quirk recorded: Doc__Number stays S01 after the move', index.Statement__Documents[0].Doc__Number === 'S01');

// ---------------------------------------------------------------- 3. save and read back
const written = '## Heritage Statement\n\nThe orangery sits on the garden side.\n\n### 1.0 |  Introduction\n\nWritten by the W4-06 harness.\n';
data.Na__LeStmt__SetText(written);
const saved = await data.Na__LeStmt__SaveLocal({ quiet : false });
check('SaveLocal writes the statement (lockstep looked first)', saved === true, toasts);
check('the file on disk holds exactly what was saved (LF kept)', existsSync(renamed) && readFileSync(renamed, 'utf8') === written);
check('the state is clean after the save', data.Na__LeStmt__GetState().dirty === false);
const reopened = await data.Na__LeStmt__Open(record.Doc__Id);
check('Open reads it back from the project folder', reopened === written && data.Na__LeStmt__GetState().textStatus === 'ready', data.Na__LeStmt__GetState());
const direct = await io.Na__LeStmtIo__ReadStatement(data.Na__LeStmt__GetOpen());
check('ReadStatement answers the repository copy with its Last-Modified', direct.ok && direct.source === 'repository' && direct.text === written && /^\d{4}-\d{2}-\d{2}T/.test(direct.modifiedIso || ''), { source : direct.source, modifiedIso : direct.modifiedIso });
const mtimeIso = new Date(Math.floor(statSync(renamed).mtimeMs / 1000) * 1000).toISOString();
check('modifiedIso is the file\'s own modified time (to the second)', direct.modifiedIso && new Date(direct.modifiedIso).toISOString() === mtimeIso, { modifiedIso : direct.modifiedIso, mtimeIso });

// a fresh session reads the same back (a second copy of the modules)
const data2 = await import(FEATURE + '01__Core__Data/Na__LayoutEditor__Statement__Data__.js?session=2');
data2.Na__LeStmt__Initialize({ editable : false });
await data2.Na__LeStmt__EnsureLoaded();
const s2 = data2.Na__LeStmt__GetState();
check('a fresh session loads the index from the project folder', s2.status === 'ready' && s2.source === 'repository', { status : s2.status, source : s2.source, error : s2.error });
const all2 = (await import(FEATURE + '01__Core__Data/Na__LayoutEditor__Statement__Data__.js?session=2')).Na__LeStmt__GetState();
void all2;

// ---------------------------------------------------------------- 4. a missing statement reads as missing
const ghost = { Doc__Id : 99, Doc__Folder : '09__NotThere', Doc__File : '3047_S09__Doous__NotThere__.md' };
const missing = await io.Na__LeStmtIo__ReadStatement(ghost);
check('a missing statement reads as missing (ok, text null), never as a page', missing.ok === true && missing.missing === true && missing.text === null, missing);
const missingLocal = await io.Na__LeStmtIo__ReadStatementLocal(ghost);
check('ReadStatementLocal: missing too', missingLocal.ok === true && missingLocal.missing === true && missingLocal.text === null, missingLocal);
const rawMissing = await fetch(FLASK_ORIGIN + '/Whitecardopedia/Projects/2026/3047__Doous/10__StatementDocs/09__NotThere/3047_S09__Doous__NotThere__.md');
const rawText = await rawMissing.text();
check('the repository URL of a missing statement is a 404 (JSON), not index.html', rawMissing.status === 404 && !/<html/i.test(rawText), { status : rawMissing.status, body : rawText.slice(0, 120) });
const blueprintMissing = await fetch(FLASK_ORIGIN + '/api/valevision/statements/file?project-folder=3047__Doous&year=2026&path=' + encodeURIComponent('09__NotThere/3047_S09__Doous__NotThere__.md'));
check('the blueprint GET also answers 404 { missing } (W0-19)', blueprintMissing.status === 404 && (await blueprintMissing.json()).missing === true);

// ---------------------------------------------------------------- 5. an outside edit is seen by the lockstep watch
const outside = written + '\nAdded in Typora, behind the app\'s back.\n';
writeFileSync(renamed, outside);
const later = new Date(Date.now() + 5000);
utimesSync(renamed, later, later);
const verdict = await data.Na__LeStmt__CheckFile();
const conflict = data.Na__LeStmt__GetConflict();
check('CheckFile sees the outside edit and asks (a lockstep question opens)', verdict !== null && !!conflict && conflict.kind === 'file', { verdict, conflict });
check('the question carries the file\'s Last-Modified time', !!conflict && conflict.fileIso === new Date(Math.floor(later.getTime() / 1000) * 1000).toISOString(), conflict && conflict.fileIso);
check('nothing was written over the outside edit', readFileSync(renamed, 'utf8') === outside);
check('ResolveConflict("file") takes the markdown', await data.Na__LeStmt__ResolveConflict('file') === true && data.Na__LeStmt__GetText() === outside);
check('the copy not kept is put aside under the ValeVision key', [ ...store.keys() ].some((k) => k.startsWith('Na__ValeVision__StatementDiscarded__3047__Doous__')), [ ...store.keys() ]);
check('no browser key carries the TrueVision token', ![ ...store.keys() ].some((k) => k.includes('TrueVision')));

// ---------------------------------------------------------------- 6. the cloud copies are placeholders
const cloudIndex = await io.Na__LeStmtIo__WriteIndexCloud({ any : 1 });
const cloudText  = await io.Na__LeStmtIo__WriteStatementCloud(data.Na__LeStmt__GetOpen(), 'x');
check('WriteIndexCloud writes nothing and says so (TODO(OVH-MIGRATION))', cloudIndex.ok === false && /OVH migration/.test(cloudIndex.error), cloudIndex);
check('WriteStatementCloud writes nothing and says so', cloudText.ok === false && /OVH migration/.test(cloudText.error), cloudText);
const published = await data.Na__LeStmt__MarkPublished(record.Doc__Id, { url : null, images : [] });
check('MarkPublished still stamps the local index; the cloud index answers not written (toast)', published === true && toasts.some((t) => /could not be written to the cloud: the cloud copy waits/.test(t)), toasts);

// ---------------------------------------------------------------- 7. delete (quarantined by the blueprint)
check('Delete with files takes the entry and the folder', await data.Na__LeStmt__Delete(record.Doc__Id, { files : true }) === true && !existsSync(join(TMP_STATEMENTS, '01__DesignStatement')));
index = JSON.parse(readFileSync(indexPath, 'utf8'));
check('the index is empty again', index.Statement__Documents.length === 0);

// ---------------------------------------------------------------- the boundaries
check('no write ever reached the Worker or the CDN, and no other host was asked', violations.length === 0, violations);
check('no request went to an /r2/ route, a NaProjectPortal key or a truevision route', !requests.some((r) => /\/r2\/|NaProjectPortal|truevision/i.test(r)), requests.filter((r) => /\/r2\/|NaProjectPortal|truevision/i.test(r)));
await bridge.close();
const realAfter = hashTree(REAL_DOOUS);
check('the real 2026/3047__Doous is byte-for-byte (and mtime) unchanged, and has no 10__StatementDocs', JSON.stringify(realBefore) === JSON.stringify(realAfter) && !existsSync(join(REAL_DOOUS, '10__StatementDocs')));

console.log('\nrequests made: ' + requests.length + ' (' + requests.filter((r) => r.includes('/api/valevision/statements/')).length + ' to the statements blueprint)');
console.log(`${passes} passed, ${failures} failed`);
try { rmSync(SCRATCH, { recursive : true, force : true }); } catch (error) { /* temp */ }
process.exit(failures ? 1 : 0);
